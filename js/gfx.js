'use strict';
/* Wellenpfad – Pixel-Grafik-Engine im "2.5D"-Stil:
   Mehrere übereinanderliegende Low-Res-Canvas-Ebenen (Hintergrund unscharf,
   Hauptebene scharf, Glow-Ebene mit Bloom, Vordergrund unscharf). */
const GFX = (() => {
  const W = 256, H = 160, HOR = 58;
  const cv = {}, cx = {};

  function init() {
    for (const k of ['bg', 'main', 'glow', 'fg']) {
      const c = document.getElementById('c-' + k);
      c.width = W; c.height = H;
      cv[k] = c; cx[k] = c.getContext('2d');
      cx[k].imageSmoothingEnabled = false;
    }
  }

  /* ---------- Farb-Helfer ---------- */
  const hexCache = {};
  function hex(h) {
    if (hexCache[h]) return hexCache[h];
    const n = parseInt(h.slice(1), 16);
    return (hexCache[h] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
  }
  function mix(a, b, t) {
    const A = hex(a), B = hex(b);
    t = Math.max(0, Math.min(1, t));
    return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`;
  }
  function rgba(h, a) { const c = hex(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
  function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

  /* ---------- Pixel-Primitive (kantenscharf) ---------- */
  function rect(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function ell(g, x0, y0, rx, ry, col) {
    g.fillStyle = col;
    const R = Math.max(0.5, ry), r = Math.max(0.5, rx);
    const yr = Math.round(R);
    for (let y = -yr; y <= yr; y++) {
      const w = Math.round(r * Math.sqrt(Math.max(0, 1 - (y * y) / (R * R))));
      g.fillRect(Math.round(x0 - w), Math.round(y0 + y), w * 2 + 1, 1);
    }
  }
  function poly(g, pts, col) {
    g.fillStyle = col;
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    minY = Math.round(minY); maxY = Math.round(maxY);
    for (let y = minY; y <= maxY; y++) {
      const xs = [], yy = y + 0.5;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) xs.push(a[0] + (yy - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) g.fillRect(Math.round(xs[i]), y, Math.max(1, Math.round(xs[i + 1]) - Math.round(xs[i])), 1);
    }
  }
  function line(g, x0, y0, x1, y1, col, th = 1) {
    g.fillStyle = col;
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, n = 0;
    const o = Math.floor(th / 2);
    while (n++ < 2000) {
      g.fillRect(x0 - o, y0 - o, th, th);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /* ---------- Sprites aus Zeichen-Rastern ---------- */
  function sprite(rows, pal) {
    const h = rows.length, w = Math.max(...rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const p = pal[r[x]]; if (p) { g.fillStyle = p; g.fillRect(x, y, 1, 1); } } });
    return c;
  }
  const tintCache = new WeakMap();
  function tinted(img, col) {
    let m = tintCache.get(img); if (!m) { m = {}; tintCache.set(img, m); }
    if (m[col]) return m[col];
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
    return (m[col] = c);
  }
  function flipped(img) {
    if (img._flip) return img._flip;
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.translate(img.width, 0); g.scale(-1, 1); g.drawImage(img, 0, 0);
    return (img._flip = c);
  }
  /* Spiegelung im Wasser: zeilenweise mit Wellenversatz */
  function reflect(g, img, x, yWater, t, alpha = 0.35, rows) {
    const h = Math.min(img.height, rows || img.height);
    for (let r = 0; r < h; r++) {
      const off = Math.round(Math.sin(t * 3 + r * 0.7) * (0.6 + r * 0.05));
      g.globalAlpha = alpha * (1 - r / h);
      g.drawImage(img, 0, img.height - 1 - r, img.width, 1, Math.round(x + off), Math.round(yWater + r), img.width, 1);
    }
    g.globalAlpha = 1;
  }

  /* Scratch-Puffer für prozedurale Monster mit Umriss */
  const scratch = document.createElement('canvas'); scratch.width = 160; scratch.height = 140;
  const sg = scratch.getContext('2d');
  function buffered(drawFn, target) {
    sg.clearRect(0, 0, scratch.width, scratch.height);
    drawFn(sg);
    let c = target;
    if (!c) { c = document.createElement('canvas'); c.width = 160; c.height = 140; }
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    const sil = tinted2(scratch, '#120c18');
    g.drawImage(sil, -1, 0); g.drawImage(sil, 1, 0); g.drawImage(sil, 0, -1); g.drawImage(sil, 0, 1);
    g.drawImage(scratch, 0, 0);
    return c;
  }
  const sil2 = document.createElement('canvas'); sil2.width = 160; sil2.height = 140;
  const sil2g = sil2.getContext('2d');
  function tinted2(img, col) {
    sil2g.globalCompositeOperation = 'source-over';
    sil2g.clearRect(0, 0, 160, 140); sil2g.drawImage(img, 0, 0);
    sil2g.globalCompositeOperation = 'source-in'; sil2g.fillStyle = col; sil2g.fillRect(0, 0, 160, 140);
    sil2g.globalCompositeOperation = 'source-over';
    return sil2;
  }

  /* ---------- Umgebungen / Tageszeiten ---------- */
  const TIMES = {
    day:   { sky: ['#3f86d6', '#a9d8f2'], far: '#7fa6b8', mid: '#5f8a6a', water: ['#8fc3d8', '#2b6f98', '#123f66'], hi: '#e9fbff', sun: '#fff6c8', sunY: 16, light: '#fff3c0', amb: 0 },
    dusk:  { sky: ['#2a2457', '#f2995a'], far: '#7a5a78', mid: '#4b3a55', water: ['#e69a6a', '#5a3d6e', '#1e1838'], hi: '#ffd59a', sun: '#ffb070', sunY: 44, light: '#ffb070', amb: 0.12 },
    night: { sky: ['#060a1c', '#1c2c55'], far: '#1c2846', mid: '#121a30', water: ['#2a3e6a', '#0d1b38', '#050b1c'], hi: '#9fc2ff', sun: '#e8efff', sunY: 18, moon: true, light: '#9fc2ff', amb: 0.35 },
    fog:   { sky: ['#7d8f8f', '#c8d3cc'], far: '#a3b1ac', mid: '#7f908a', water: ['#b4c2bc', '#5b7473', '#2f4746'], hi: '#ffffff', sun: '#f4f7ee', sunY: 22, light: '#f4f7ee', amb: 0.05, fog: true },
    dawn:  { sky: ['#4d5aa0', '#f7c0a4'], far: '#9c8aa8', mid: '#6f6a86', water: ['#f2c3b0', '#4f6a9a', '#1d2a50'], hi: '#fff0e0', sun: '#ffe2c4', sunY: 40, light: '#ffd6b8', amb: 0.06 },
    storm: { sky: ['#11131f', '#3b4258'], far: '#2b3245', mid: '#1b2030', water: ['#4c5870', '#1b2436', '#080c16'], hi: '#c9d6ff', sun: '#c9d6ff', sunY: 14, moon: true, light: '#c9d6ff', amb: 0.4, rain: true }
  };

  let lightning = 0;
  function drawSky(g, env, t, scroll) {
    const T = TIMES[env.time];
    const bands = 14;
    for (let i = 0; i < bands; i++) {
      const y0 = Math.floor(i * HOR / bands), y1 = Math.floor((i + 1) * HOR / bands);
      rect(g, 0, y0, W, y1 - y0 + 1, mix(T.sky[0], T.sky[1], i / (bands - 1)));
    }
    if (T.moon || env.time === 'night') {
      for (let i = 0; i < 40; i++) {
        const sx = hash(i) * W, sy = hash(i + 50) * (HOR - 10);
        const tw = 0.5 + 0.5 * Math.sin(t * 2 + i);
        rect(g, sx, sy, 1, 1, rgba('#ffffff', 0.3 + tw * 0.6));
      }
    }
    const sx = 186, sy = T.sunY;
    if (T.moon) { ell(g, sx, sy, 7, 7, T.sun); ell(g, sx + 3, sy - 2, 6, 6, T.sky[0]); }
    else ell(g, sx, sy, env.time === 'dusk' || env.time === 'dawn' ? 11 : 8, env.time === 'dusk' || env.time === 'dawn' ? 11 : 8, T.sun);
    // Wolken
    const cc = env.time === 'night' || env.time === 'storm' ? '#2a3456' : env.time === 'dusk' ? '#f6b98e' : env.time === 'fog' ? '#dfe6e0' : '#ffffff';
    const cs = env.time === 'dusk' ? '#b46f74' : env.time === 'night' || env.time === 'storm' ? '#1a2240' : '#cfe3f0';
    for (let i = 0; i < 6; i++) {
      const cxp = ((hash(i + 7) * 400 - t * (3 + i) - scroll * 0.05) % 330 + 330) % 330 - 40;
      const cyp = 8 + hash(i + 3) * 26;
      const s = 0.6 + hash(i + 11) * 0.8;
      ell(g, cxp, cyp + 2, 16 * s, 3 * s, cs);
      ell(g, cxp - 6 * s, cyp, 8 * s, 4 * s, cc); ell(g, cxp + 4 * s, cyp - 2 * s, 9 * s, 5 * s, cc); ell(g, cxp + 12 * s, cyp + 1, 7 * s, 3 * s, cc);
    }
    if (T.rain && lightning > 0) { g.fillStyle = rgba('#dfe8ff', lightning * 0.5); g.fillRect(0, 0, W, HOR); }
  }

  function ridge(g, base, amp, freq, off, col, seed) {
    g.fillStyle = col;
    for (let x = 0; x < W; x++) {
      const u = (x + off) * freq;
      const h = amp * (0.55 * Math.sin(u + seed) + 0.3 * Math.sin(u * 2.3 + seed * 2) + 0.15 * Math.sin(u * 5.1 + seed * 3));
      g.fillRect(x, Math.round(base - Math.abs(h) - amp * 0.3), 1, HOR - Math.round(base - Math.abs(h) - amp * 0.3) + 1);
    }
  }

  function drawShore(g, env, t, scroll) {
    const T = TIMES[env.time];
    const shore = env.shore;
    if (shore !== 'sea') ridge(g, HOR - 6, 14, 0.018, scroll * 0.15, T.far, 1.3);
    else ridge(g, HOR - 1, 3, 0.03, scroll * 0.1, T.far, 4.1);
    const night = env.time === 'night' || env.time === 'storm' || env.time === 'dusk';
    const off = scroll * 0.4;
    if (shore === 'reeds' || shore === 'forest') {
      ridge(g, HOR - 2, 6, 0.05, off, T.mid, 2.2);
      for (let i = 0; i < 26; i++) {
        const x = ((i * 23 - off) % (W + 40) + W + 40) % (W + 40) - 20;
        const hgt = 7 + hash(i) * 9;
        const tc = shore === 'forest' ? mix(T.mid, '#0d1a14', 0.3) : mix(T.mid, '#2a3a20', 0.25);
        ell(g, x, HOR - 3 - hgt, 4 + hash(i + 3) * 3, hgt * 0.6, tc);
        rect(g, x, HOR - 4 - hgt * 0.3, 1, hgt * 0.4, mix(T.mid, '#000', 0.5));
      }
    }
    if (shore === 'town' || shore === 'harbor') {
      ridge(g, HOR - 2, 4, 0.04, off, T.mid, 0.4);
      for (let i = 0; i < 16; i++) {
        const x = ((i * 19 - off) % (W + 40) + W + 40) % (W + 40) - 20;
        const hh = 8 + hash(i) * 12, ww = 10 + hash(i + 9) * 6;
        const wall = mix(['#d8c3a0', '#b9a58b', '#e4d6bc', '#a99482'][i % 4], T.mid, 0.45 + T.amb);
        const roof = mix(['#a2483a', '#6a4a3a', '#3f5a7a', '#8a5a2a'][i % 4], T.mid, 0.35 + T.amb);
        rect(g, x, HOR - 2 - hh, ww, hh, wall);
        poly(g, [[x - 1, HOR - 2 - hh], [x + ww / 2, HOR - 8 - hh], [x + ww + 1, HOR - 2 - hh]], roof);
        if (i % 5 === 2) { rect(g, x + ww / 2 - 1, HOR - 18 - hh, 3, 10, wall); poly(g, [[x + ww / 2 - 2, HOR - 18 - hh], [x + ww / 2 + 0.5, HOR - 24 - hh], [x + ww / 2 + 3, HOR - 18 - hh]], roof); }
        for (let w = 0; w < 2; w++) rect(g, x + 2 + w * 5, HOR - hh + 2, 2, 2, night ? '#ffd27a' : mix(wall, '#000', 0.4));
      }
    }
    if (shore === 'cliffs' || shore === 'lighthouse') {
      ridge(g, HOR - 4, 16, 0.03, off, mix(T.mid, '#3a3030', 0.3), 5.5);
    }
    if (shore === 'lighthouse') {
      const lx = 70 - (scroll * 0.4) % 1;
      rect(g, lx, HOR - 40, 8, 26, '#e9e2d6'); rect(g, lx, HOR - 34, 8, 4, '#b8332e'); rect(g, lx, HOR - 24, 8, 4, '#b8332e');
      rect(g, lx - 1, HOR - 44, 10, 4, '#3a3a44'); rect(g, lx + 2, HOR - 47, 4, 3, '#ffe9a0');
    }
    if (shore === 'mill') {
      ridge(g, HOR - 2, 5, 0.05, off, T.mid, 1.1);
      const mx = ((120 - off) % (W + 60) + W + 60) % (W + 60) - 30;
      rect(g, mx, HOR - 26, 10, 24, mix('#cdb995', T.mid, 0.4));
      poly(g, [[mx - 1, HOR - 26], [mx + 5, HOR - 32], [mx + 11, HOR - 26]], mix('#7a3a2a', T.mid, 0.3));
      const a = t * 0.8;
      for (let k = 0; k < 4; k++) line(g, mx + 5, HOR - 24, mx + 5 + Math.cos(a + k * Math.PI / 2) * 13, HOR - 24 + Math.sin(a + k * Math.PI / 2) * 13, mix('#e8dcc0', T.mid, 0.4), 2);
    }
    // Uferkante
    rect(g, 0, HOR - 2, W, 2, mix(T.mid, '#000', 0.25));
  }

  function drawWater(g, env, t, scroll) {
    const T = TIMES[env.time];
    const n = H - HOR;
    for (let y = HOR; y < H; y++) {
      const d = (y - HOR) / n;
      const col = d < 0.35 ? mix(T.water[0], T.water[1], d / 0.35) : mix(T.water[1], T.water[2], (d - 0.35) / 0.65);
      rect(g, 0, y, W, 1, col);
    }
    // Glitzerlinien mit Perspektive
    for (let y = HOR + 1; y < H; y += 2) {
      const d = (y - HOR) / n;
      const cnt = 3 + Math.floor(d * 6);
      const sp = (8 + d * 40);
      for (let k = 0; k < cnt; k++) {
        const ph = hash(y * 13 + k);
        const len = 1 + Math.round(d * 7 * (0.5 + ph));
        const x = ((ph * 600 + t * sp * (env.calm ? 0.3 : 1) + scroll * (0.4 + d * 1.4) + Math.sin(t + y) * 3) % (W + 20)) - 10;
        const a = 0.25 + 0.35 * Math.sin(t * 2 + ph * 9);
        if (a > 0) rect(g, W - x, y, len, 1, rgba(T.hi, a * (0.4 + d * 0.6)));
      }
    }
    // Sonnenspiegelung
    const sx = 186;
    for (let y = HOR; y < H; y += 1) {
      const d = (y - HOR) / n;
      if (hash(y + Math.floor(t * 6)) > 0.55) {
        const w = 2 + d * 14 * hash(y * 3 + Math.floor(t * 4));
        rect(g, sx - w / 2 + Math.sin(t * 3 + y) * 2, y, w, 1, rgba(T.hi, 0.5 * (1 - d * 0.6)));
      }
    }
    // Horizont-Dunst
    g.fillStyle = rgba(T.sky[1], 0.35); g.fillRect(0, HOR, W, 2);
  }

  /* ---------- Schiff (3/4-Ansicht, Bug links) ---------- */
  function shipGeom(ox, oy) {
    return {
      deck: [[ox - 124, oy + 14], [ox - 100, oy], [ox - 6, oy], [ox, oy + 22], [ox - 104, oy + 24]],
      hull: [[ox - 124, oy + 14], [ox - 104, oy + 24], [ox, oy + 22], [ox - 4, oy + 40], [ox - 92, oy + 43]],
      mastX: ox - 48, mastY: oy + 10
    };
  }
  function drawShipBack(g, ox, oy, t, env, upgrades) {
    const S = shipGeom(ox, oy);
    const sailCol = upgrades && upgrades.sail > 0 ? ['#f1e8d2', '#f1e8d2', '#e9d7a8', '#f5efe0', '#fff8e6'][Math.min(4, upgrades.sail)] : '#efe5cd';
    const flag = upgrades && upgrades.flag || '#b8332e';
    // Mast & Segel
    rect(g, S.mastX - 1, oy - 70, 3, 82, '#4a3020');
    rect(g, S.mastX - 30, oy - 64, 62, 2, '#5a3a24');
    rect(g, S.mastX - 26, oy - 28, 54, 2, '#5a3a24');
    const b = Math.sin(t * 1.3) * 1.5;
    poly(g, [[S.mastX - 28, oy - 62], [S.mastX + 30, oy - 62], [S.mastX + 26 + b, oy - 30], [S.mastX - 24 + b, oy - 30]], sailCol);
    poly(g, [[S.mastX - 28, oy - 62], [S.mastX + 30, oy - 62], [S.mastX + 30, oy - 58], [S.mastX - 28, oy - 58]], mix(sailCol, '#8a7a5a', 0.3));
    // Wappen auf dem Segel (Anker)
    const ax = S.mastX + 1 + b / 2, ay = oy - 50;
    rect(g, ax, ay, 1, 12, '#2c4a6e'); rect(g, ax - 3, ay + 2, 7, 1, '#2c4a6e');
    line(g, ax - 5, ay + 9, ax, ay + 12, '#2c4a6e'); line(g, ax + 5, ay + 9, ax, ay + 12, '#2c4a6e');
    ell(g, ax, ay - 1, 1, 1, '#2c4a6e');
    // Vorsegel (Fock)
    poly(g, [[S.mastX - 4, oy - 66], [S.mastX - 4, oy - 6], [ox - 118, oy + 8]], mix(sailCol, '#c9b98f', 0.25));
    line(g, S.mastX - 4, oy - 66, ox - 126, oy + 10, '#3a2a1a');
    // Flagge
    const fw = Math.sin(t * 4);
    poly(g, [[S.mastX + 1, oy - 78], [S.mastX + 14, oy - 75 + fw], [S.mastX + 1, oy - 71]], flag);
    rect(g, S.mastX, oy - 80, 2, 10, '#4a3020');
    // Deck
    poly(g, S.deck, '#a7784a');
    for (let i = 1; i < 6; i++) {
      const f = i / 6;
      line(g, ox - 124 + 20 * f + 6, oy + 14 - 14 * f + 10 * f, ox - 6 + 6 * f, oy + 22 * f, '#8a5f38');
    }
    // hintere Reling
    rect(g, ox - 100, oy - 6, 94, 1, '#6a4428');
    for (let x = ox - 100; x <= ox - 6; x += 8) rect(g, x, oy - 6, 1, 6, '#6a4428');
    // Kajüte am Heck
    rect(g, ox - 28, oy - 12, 22, 14, '#7a4f2e'); rect(g, ox - 30, oy - 14, 26, 3, '#5a3620');
    rect(g, ox - 22, oy - 8, 4, 4, env && (env.time === 'night' || env.time === 'storm' || env.time === 'dusk') ? '#ffd27a' : '#2b3c52');
    rect(g, ox - 14, oy - 8, 4, 4, env && (env.time === 'night' || env.time === 'storm' || env.time === 'dusk') ? '#ffd27a' : '#2b3c52');
  }
  function drawShipFront(g, ox, oy, t, upgrades) {
    const S = shipGeom(ox, oy);
    const hullTone = upgrades && upgrades.hull > 2 ? '#3d3a44' : '#5b3a22';
    poly(g, S.hull, hullTone);
    for (let i = 1; i < 4; i++) line(g, ox - 120 + i * 4, oy + 16 + i * 6, ox - 2, oy + 22 + i * 5, mix(hullTone, '#000', 0.3));
    if (upgrades && upgrades.hull > 0) for (let i = 0; i < Math.min(5, upgrades.hull) * 2; i++) ell(g, ox - 96 + i * 9, oy + 30, 1, 1, '#c9a24a');
    // Goldkante + vordere Reling
    line(g, ox - 124, oy + 14, ox - 104, oy + 24, '#d6a84a'); line(g, ox - 104, oy + 24, ox, oy + 22, '#d6a84a');
    line(g, ox - 124, oy + 10, ox - 104, oy + 19, '#6a4428'); line(g, ox - 104, oy + 19, ox, oy + 17, '#6a4428');
    for (let x = ox - 104; x <= ox; x += 9) rect(g, x, oy + 18, 1, 5, '#6a4428');
    // Bugspriet & Galionsfigur
    line(g, ox - 124, oy + 12, ox - 136, oy + 6, '#4a3020', 2);
    ell(g, ox - 124, oy + 18, 2, 3, '#d6a84a');
    // Bugwelle
    const w = Math.sin(t * 3);
    for (let i = 0; i < 6; i++) rect(g, ox - 96 + i * 3 - w, oy + 42 + (i % 2), 4, 1, 'rgba(255,255,255,0.7)');
  }
  function drawLantern(gl, ox, oy, t) {
    const f = 0.8 + 0.2 * Math.sin(t * 9);
    ell(gl, ox - 4, oy - 18, 7 * f, 7 * f, 'rgba(255,190,90,0.35)');
    ell(gl, ox - 4, oy - 18, 3, 3, 'rgba(255,230,160,0.9)');
  }

  /* ---------- Szenen-Rendering ---------- */
  const particles = [];
  function drawFg(g, env, t, scroll, kind) {
    const T = TIMES[env.time];
    g.clearRect(0, 0, W, H);
    if (env.shore === 'reeds' || env.shore === 'forest' || env.shore === 'mill') {
      for (let i = 0; i < 9; i++) {
        const side = i < 5 ? 0 : 1;
        const x = side ? W - 4 - (i - 5) * 6 : 2 + i * 5;
        const h = 26 + hash(i) * 22;
        const sw = Math.sin(t * 1.2 + i) * 4;
        const col = mix(T.mid, '#0b1a0b', 0.55);
        line(g, x, H, x + sw, H - h, col, 2);
        ell(g, x + sw, H - h, 1.5, 5, mix('#5a3a1a', T.mid, 0.4));
      }
    }
    if (env.shore === 'harbor' || kind === 'harbor') {
      rect(g, 0, H - 12, W, 12, mix('#6b4a2e', T.mid, 0.3 + T.amb));
      for (let x = 0; x < W; x += 16) rect(g, x, H - 12, 1, 12, mix('#3a2818', T.mid, 0.2));
      for (let x = 12; x < W; x += 60) rect(g, x, H - 26, 5, 26, mix('#4a3020', T.mid, 0.3));
    }
    if (T.fog) {
      for (let i = 0; i < 4; i++) {
        const x = ((t * (6 + i * 2) + i * 90) % (W + 140)) - 140;
        ell(g, x + 60, HOR + 10 + i * 18, 80, 8, 'rgba(235,240,232,0.35)');
      }
    }
    if (T.rain) {
      g.fillStyle = 'rgba(200,215,255,0.45)';
      for (let i = 0; i < 70; i++) {
        const x = (hash(i) * W + t * 60 * (1 + hash(i + 1))) % W;
        const y = (hash(i + 2) * H + t * 220 * (1 + hash(i + 4) * 0.5)) % H;
        g.fillRect(W - x, y, 1, 4);
      }
    }
    // Schwebende Lichtpartikel (Bokeh)
    for (let i = 0; i < 7; i++) {
      const x = (hash(i + 20) * W + Math.sin(t * 0.3 + i) * 20 + scroll * 0.6) % W;
      const y = H - 20 - ((t * (4 + i) + hash(i) * H) % (H - 20));
      ell(g, x, y, 2 + (i % 3), 2 + (i % 3), rgba(T.light, 0.18));
    }
  }

  function drawGlowBase(gl, env, t) {
    const T = TIMES[env.time];
    gl.clearRect(0, 0, W, H);
    ell(gl, 186, T.sunY, 22, 22, rgba(T.sun, T.moon ? 0.25 : 0.45));
    ell(gl, 186, T.sunY, 12, 12, rgba(T.sun, 0.6));
    // Lichtstrahlen (God Rays)
    if (!T.moon) {
      gl.globalAlpha = 0.10;
      for (let i = 0; i < 5; i++) {
        const a = -2.1 + i * 0.22 + Math.sin(t * 0.2 + i) * 0.03;
        poly(gl, [[186, T.sunY], [186 + Math.cos(a) * 260, T.sunY - Math.sin(a) * 260 * -1], [186 + Math.cos(a + 0.07) * 260, T.sunY + Math.sin(a + 0.07) * 260]], T.light);
      }
      gl.globalAlpha = 1;
    }
    if (T.rain) {
      if (lightning > 0) { gl.fillStyle = rgba('#dfe8ff', lightning * 0.6); gl.fillRect(0, 0, W, H); lightning -= 0.04; }
      else if (Math.random() < 0.004) lightning = 1;
    }
    if (env.shore === 'town' || env.shore === 'harbor') {
      if (env.time === 'night' || env.time === 'dusk' || env.time === 'storm') for (let i = 0; i < 10; i++) ell(gl, hash(i + 4) * W, HOR - 6 - hash(i) * 10, 3, 3, 'rgba(255,200,110,0.5)');
    }
    if (env.shore === 'lighthouse') {
      const a = t * 1.5;
      gl.globalAlpha = 0.35;
      poly(gl, [[74, HOR - 45], [74 + Math.cos(a) * 200, HOR - 45 - 12], [74 + Math.cos(a) * 200, HOR - 45 + 12]], '#fff2b0');
      gl.globalAlpha = 1;
      ell(gl, 74, HOR - 45, 5, 5, 'rgba(255,240,170,0.9)');
    }
    // Glühwürmchen nachts / im Nebel
    if (env.time === 'night' || env.time === 'fog' || env.time === 'dusk') {
      for (let i = 0; i < 10; i++) {
        const x = (hash(i + 70) * W + Math.sin(t * 0.7 + i * 2) * 12) % W;
        const y = HOR - 10 + Math.sin(t * 0.9 + i) * 8 + hash(i + 3) * 40;
        const a = 0.4 + 0.4 * Math.sin(t * 3 + i * 5);
        ell(gl, x, y, 1, 1, rgba('#d8ff9a', Math.max(0, a)));
      }
    }
  }

  /* Hintergrund: Himmel + Ufer (wird per CSS leicht unscharf gezeichnet) */
  function drawBackground(env, t, scroll) {
    const g = cx.bg;
    drawSky(g, env, t, scroll);
    drawShore(g, env, t, scroll);
  }

  function clearMain() { cx.main.clearRect(0, 0, W, H); }

  return {
    W, H, HOR, cv, cx, init, mix, rgba, hash, rect, ell, poly, line, sprite, tinted, flipped, reflect, buffered,
    TIMES, drawBackground, drawWater, drawShipBack, drawShipFront, drawLantern, drawFg, drawGlowBase, clearMain, shipGeom,
    flash() { lightning = 1; }
  };
})();
