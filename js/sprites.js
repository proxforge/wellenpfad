'use strict';
/* Pixel-Sprites der Helden (handgezeichnet, Blickrichtung links) und
   prozedural gezeichnete Flussmonster. Alle Figuren sind Originalentwürfe. */
const SPRITES = (() => {
  const OUT = '#1b1622';
  const HERO_MAPS = {
    ryn: [
      '................',
      '......kkkkk.....',
      '.....khhhhhkk...',
      '....khhhhhhhhk..',
      '...khhhhhhhhHk..',
      '...khhhhhhHHHk..',
      '...kshhssSHHHk..',
      '...ksesssSHHk...',
      '...kssssssSk....',
      '....kSsssSk.....',
      '.....kkSSkxxk...',
      '....kttttkxxXk..',
      '...kcctttccxXk..',
      '..kscctttccCXk..',
      '..ksccctcccCXk..',
      '.kwkkgggggkCXXk.',
      'kwk.kcccccCkXXk.',
      'kw..kpppkpPkXk..',
      'w...kpppkpPkXk..',
      '....kpppkpPkk...',
      '....kbbbkbbk....',
      '...kbbbbkbbbk...',
      '...kkkkkkkkkk...',
      '................'],
    ignaz: [
      '................',
      '.....k.kk.k.....',
      '....khkhhkhk....',
      '...krrrrrrrrk...',
      '...krrrrrrrrRk..',
      '...khhhhhhhhHk..',
      '...kshssshhHHk..',
      '...ksesssshHk...',
      '...kssssssSk....',
      '....kSsssSk.....',
      '.....kSSSk......',
      '...kcsssssck....',
      '..kccsSsssCck...',
      '.kssccsssSCCk...',
      'kFfsccsssSCck...',
      'kffkkgggggkk....',
      '.kk.kpppppPk....',
      '....kpppkpPk....',
      '....kpppkpPk....',
      '....ksskkSsk....',
      '....kbbbkbbk....',
      '...kbbbbkbbbk...',
      '...kkkkkkkkkk...',
      '................'],
    varg: [
      '..........WW....',
      '......kkkkkW....',
      '.....khhhhhkW...',
      '....khhhhhhhkW..',
      '...khhhhhhhhHk..',
      '...khhhhhhhHHk..',
      '...kshsssshHHHk.',
      '...ksexsssHHHHk.',
      '...ksssssSkHHk..',
      '....kSsssSk.Hk..',
      '....kkSSSkk.....',
      '...kccgccccck...',
      '..kcccgcccccCk..',
      '.kscccgccccCCk..',
      '.ksccccgcccCCk..',
      '.kskkgggggkCk...',
      '..k.kcccccCk....',
      '....kpppkpPk....',
      '....kpppkpPk....',
      '....kpppkpPk....',
      '....kbbbkbbk....',
      '...kbbbbkbbbk...',
      '...kkkkkkkkkk...',
      '................'],
    kurogane: [
      '................',
      '......kkkkk.....',
      '.....khhhhhk....',
      '....khhhhhhhk...',
      '...khhhhhhhhHk..',
      '...kshhhhhHHHk..',
      '...kssssshHHHk..',
      '...kggggssHHk...',
      '...ksssssSHk....',
      '...kcccsSccck...',
      '..kccccSSccCck..',
      '..kccttttcccCk..',
      '.kcccttttcccCk..',
      'kcccccttcccCCk..',
      'kcwccctccccCCk..',
      'kcwkgggggggkCk..',
      '.kw.kcccccccCk..',
      '.w..kccckcccCk..',
      'w..kccckpkcCCk..',
      'w..kcckpppkcCk..',
      '...kckbbbkbkCk..',
      '...kkbbbbkbbk...',
      '....kkkkkkkkk...',
      '................'],
    dorian: [
      '................',
      '......kkkkk.....',
      '.....khhhhhkk...',
      '....khhhhhhhhk..',
      '...khhhhhhhhhHk.',
      '..khhhhhhhhHHHk.',
      '..khshhsshHHHk..',
      '...ksesssshHk...',
      '...kssssssSk....',
      '....kSsssSk.....',
      '....kcSSSck.....',
      '...kcckkkcck....',
      '..kccckkkcccCk..',
      '.kscccktkcccCk..',
      'WWWsccktkcccCk..',
      'kWkkgggggggkCk..',
      '....kccckcccCk..',
      '...kccckpkccCk..',
      '...kcckpppkcCCk.',
      '..kcckkpppkkcCk.',
      '..kckkbbbkbkcCk.',
      '...kkbbbbkbbk...',
      '....kkkkkkkkk...',
      '................'],
    kael: [
      '................',
      '......kkkkk.....',
      '.....khhhhhk....',
      '....khhhhhhhk...',
      '...khhhhhhhhHk..',
      '...khhhhhhhHHk..',
      '..khhsshhhHHHk..',
      '...ksesxssHHk...',
      '...kssssssSk....',
      '....kSsssSk.....',
      '...kffSSSffk....',
      '..kffcckccffk...',
      '..kcccckccccCk..',
      '.ksccckkkcccCk..',
      '.ksccckkkcccCk..',
      '.kWkgggggggkCk..',
      'wwWkkcccccCkk...',
      '....kpppkpPk....',
      '....kpppkpPk....',
      '....kpppkpPk....',
      '....kbbbkbbk....',
      '...kbbbbkbbbk...',
      '...kkkkkkkkkk...',
      '................'],
    elarion: [
      '................',
      '......kkkkk.....',
      '.....khhhhhk....',
      '....khhhhhhhk...',
      '...khhhhhhhhHk..',
      '...khhhhhhhHHk..',
      '...kshssssHHHk..',
      '...ksesssksHHk..',
      '...ksssssSkHHk..',
      '....kSsssk.HHk..',
      '...wkcSSckkHHk..',
      '..w.kccgcck.Hk..',
      '.w.kcccgcccCk...',
      '.wkscccgcccCk...',
      '.ksscccgccCCk...',
      '.w.kgggggggk....',
      '.w..kcccccCk....',
      '..w.kpppkpPk....',
      '...wkpppkpPk....',
      '....kpppkpPk....',
      '....kbbbkbbk....',
      '...kbbbbkbbbk...',
      '...kkkkkkkkkk...',
      '................']
  };
  const HERO_PALS = {
    ryn: { h: '#2b2a33', H: '#16151c', s: '#f1c9a5', S: '#d39a7c', e: '#2a1e2a', c: '#6e5034', C: '#4d3622', t: '#ece6da', g: '#8a6a3a', p: '#d9d2c3', P: '#b5ad9c', b: '#2e2622', w: '#dfe8ef', W: '#7d8a99', x: '#3f5a46', X: '#2c4033' },
    ignaz: { h: '#1e1a1e', H: '#0e0c10', r: '#c8322b', R: '#8a1f1c', s: '#d9a173', S: '#b07a52', e: '#20141a', c: '#a32a26', C: '#6f1a18', g: '#e0b43c', p: '#2f5a9a', P: '#21406f', b: '#3a2a1e', F: '#ffe066', f: '#ff7a1a' },
    varg: { h: '#d7d9de', H: '#9aa0aa', s: '#e8c09a', S: '#c08e6e', e: '#d8b13a', x: '#9a3a3a', c: '#3b3330', C: '#262120', g: '#7a5a3a', p: '#4a3f37', P: '#342c26', b: '#241c18', W: '#9aa3ad' },
    kurogane: { h: '#8e8c90', H: '#5f5d62', s: '#e2b48e', S: '#b78464', g: '#14141a', c: '#9b1f2a', C: '#62131b', t: '#22202a', p: '#22202a', b: '#1a1416', w: '#e4ecf2' },
    dorian: { h: '#eeeef2', H: '#b9bcc8', s: '#f0caa6', S: '#c99a7a', e: '#3a6ab0', c: '#c42532', C: '#7d1520', t: '#2a1c22', g: '#c9c9d4', p: '#1f1a20', b: '#141014', W: '#cfd6de' },
    kael: { h: '#6a4a32', H: '#47301f', s: '#efc6a2', S: '#c9977a', e: '#3a5a8a', x: '#b44a4a', f: '#f2f0ea', c: '#1d1c22', C: '#0f0e13', g: '#7c6a5a', p: '#2a2830', P: '#1a1920', b: '#1a1418', w: '#d5e0ea', W: '#5b6676' },
    elarion: { h: '#f1d27a', H: '#c9a24a', s: '#f5d7b8', S: '#d6ae90', e: '#2f6a4a', k: OUT, c: '#3f8a4a', C: '#2a5f33', g: '#8a5a32', p: '#6e5a3e', P: '#4e3f2b', b: '#4a3322', w: '#b98a4a' }
  };
  const heroCache = {};
  const custom = {};
  /* Vom Spieler hochgeladenes Bild (16×24-Canvas) ersetzt das Standard-Sprite */
  function setCustom(id, cv) {
    if (cv) custom[id] = cv; else delete custom[id];
    delete heroCache[id]; delete portraitCache[id];
  }
  function hero(id) {
    if (custom[id]) return custom[id];
    if (heroCache[id]) return heroCache[id];
    const pal = Object.assign({ k: OUT }, HERO_PALS[id]);
    return (heroCache[id] = GFX.sprite(HERO_MAPS[id], pal));
  }
  const portraitCache = {};
  /* Porträt (Kopfausschnitt, vergrößert) als Data-URL für die UI */
  function portrait(id) {
    if (typeof REAL !== 'undefined' && REAL.on()) return REAL.avatar(id);
    if (portraitCache[id]) return portraitCache[id];
    const s = hero(id);
    const c = document.createElement('canvas'); c.width = 48; c.height = 48;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(s, 1, 0, 14, 13, 3, 4, 42, 39);
    return (portraitCache[id] = c.toDataURL());
  }
  function full(id, scale = 3) {
    if (typeof REAL !== 'undefined' && REAL.on()) return REAL.avatar(id);
    const s = hero(id);
    const c = document.createElement('canvas'); c.width = 16 * scale; c.height = 24 * scale;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(s, 0, 0, 16 * scale, 24 * scale);
    return c.toDataURL();
  }

  /* ---------- Monster (prozedural, Blickrichtung rechts) ----------
     Zeichenursprung: (80,120) = Wasserlinie Mitte. */
  const { ell, poly, line, rect, mix } = GFX;
  function serpent(g, t, o) {
    const n = o.seg || 18, sc = o.scale || 1;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const x = 80 + (u - 0.6) * 70 * sc + Math.sin(t * 2 + u * 4) * 3;
      const y = 120 - Math.sin(u * Math.PI * 0.95) * 48 * sc - u * 10 * sc + Math.sin(t * 2.4 + u * 6) * 2;
      pts.push([x, y]);
    }
    for (let i = 0; i < pts.length; i++) {
      const r = (o.r || 6) * sc * (0.6 + 0.5 * Math.sin(i / n * Math.PI));
      ell(g, pts[i][0], pts[i][1], r, r, Math.floor(i / 3) % 2 ? o.body : o.body2 || o.body);
      ell(g, pts[i][0] - r * 0.2, pts[i][1] + r * 0.45, r * 0.6, r * 0.35, o.belly);
    }
    if (o.fin) for (let i = 3; i < n - 2; i += 3) poly(g, [[pts[i][0] - 3, pts[i][1] - 5 * sc], [pts[i][0] + 2, pts[i][1] - 11 * sc], [pts[i][0] + 4, pts[i][1] - 5 * sc]], o.fin);
    const h = pts[n];
    const hr = (o.head || 9) * sc;
    ell(g, h[0], h[1], hr * 1.2, hr * 0.8, o.body2 || o.body);
    const jaw = 2 + Math.abs(Math.sin(t * 3)) * 3 * sc;
    poly(g, [[h[0], h[1]], [h[0] + hr * 1.9, h[1] - 1], [h[0] + hr * 1.7, h[1] + 2]], o.body);
    poly(g, [[h[0], h[1] + 2], [h[0] + hr * 1.6, h[1] + 2 + jaw], [h[0], h[1] + hr * 0.7]], o.belly);
    rect(g, h[0] + hr * 0.7, h[1] + 1, hr, 1, '#2a0a10');
    for (let i = 0; i < 4; i++) rect(g, h[0] + hr * 0.5 + i * hr * 0.3, h[1] + 2, 1, 2, '#f4f0e0');
    ell(g, h[0] + hr * 0.4, h[1] - hr * 0.35, Math.max(1, sc), Math.max(1, sc), o.eye || '#ff3b3b');
    if (o.crown) poly(g, [[h[0] - 5, h[1] - hr * 0.7], [h[0] - 4, h[1] - hr - 5], [h[0] - 1, h[1] - hr * 0.9], [h[0] + 1, h[1] - hr - 6], [h[0] + 3, h[1] - hr * 0.9], [h[0] + 5, h[1] - hr - 5], [h[0] + 6, h[1] - hr * 0.7]], '#e8c04a');
    return h;
  }

  const MON_DRAW = {
    aal(g, t) { serpent(g, t, { body: '#5f7d3a', body2: '#4c6a2c', belly: '#c9c47a', r: 5, head: 7, fin: '#8aa04a' }); },
    hecht(g, t) {
      const y = 96 + Math.sin(t * 2) * 6, a = Math.sin(t * 2) * 0.15;
      ell(g, 78, y, 26, 9, '#56794a');
      ell(g, 80, y + 3, 22, 5, '#d8d3a0');
      for (let i = 0; i < 6; i++) ell(g, 66 + i * 6, y - 3, 2, 3, '#8fb06a');
      poly(g, [[104, y - 3], [118, y - 1 + a * 10], [104, y + 4]], '#56794a');
      poly(g, [[104, y + 1], [116, y + 5], [103, y + 5]], '#c9c48a');
      for (let i = 0; i < 4; i++) rect(g, 107 + i * 3, y + 1, 1, 2, '#fff');
      ell(g, 98, y - 3, 2, 2, '#ffde3a'); rect(g, 98, y - 3, 1, 1, '#000');
      poly(g, [[52, y], [38, y - 10 + Math.sin(t * 6) * 3], [42, y], [38, y + 10 - Math.sin(t * 6) * 3]], '#3e5a34');
      poly(g, [[70, y - 8], [78, y - 16], [86, y - 8]], '#3e5a34');
    },
    krebs(g, t) {
      const y = 104, c = Math.sin(t * 4) * 2;
      for (let i = 0; i < 4; i++) { line(g, 64 + i * 8, y + 6, 58 + i * 8, y + 16, '#8a2a1a', 2); line(g, 70 + i * 8, y + 6, 76 + i * 8, y + 16, '#8a2a1a', 2); }
      ell(g, 80, y, 22, 13, '#c8452a'); ell(g, 78, y - 4, 16, 7, '#e0683a');
      for (let i = 0; i < 5; i++) ell(g, 68 + i * 6, y - 6, 1, 1, '#ffb27a');
      line(g, 96, y - 2, 106, y - 10 + c, '#c8452a', 3);
      ell(g, 110, y - 14 + c, 8, 6, '#d24a2a'); poly(g, [[110, y - 16 + c], [122, y - 22 + c * 2], [118, y - 13 + c]], '#e8784a');
      line(g, 94, y + 4, 104, y + 8, '#c8452a', 3); ell(g, 108, y + 8, 6, 4, '#d24a2a');
      line(g, 86, y - 10, 88, y - 18, '#8a2a1a'); line(g, 92, y - 10, 95, y - 18, '#8a2a1a');
      ell(g, 88, y - 19, 2, 2, '#111'); ell(g, 95, y - 19, 2, 2, '#111');
    },
    nixe(g, t) {
      const y = 70 + Math.sin(t * 1.5) * 3;
      for (let i = 0; i < 7; i++) line(g, 74 - i * 2, y - 12, 50 - i * 3 + Math.sin(t * 2 + i) * 5, y + 20 + i * 4, i % 2 ? '#3fa0c8' : '#5fd0e8', 2);
      poly(g, [[70, y + 10], [92, y + 10], [100, 120], [62, 120]], '#3a8ab0');
      poly(g, [[72, y + 10], [90, y + 10], [92, y + 26], [70, y + 26]], '#7ad8ec');
      ell(g, 81, y, 9, 10, '#bfeaf4');
      ell(g, 77, y - 6, 11, 6, '#5fd0e8');
      ell(g, 85, y - 1, 1, 1, '#ffffff'); ell(g, 79, y - 1, 1, 1, '#ffffff');
      line(g, 92, y + 14, 106, y + 4 + Math.sin(t * 3) * 4, '#9fe4f2', 2);
      ell(g, 108, y + 2 + Math.sin(t * 3) * 4, 3, 3, '#e8ffff');
    },
    krake(g, t) {
      for (let k = 0; k < 6; k++) {
        let px = 68 + k * 5, py = 96;
        for (let i = 0; i < 9; i++) {
          const nx = px + Math.sin(t * 2.5 + k + i * 0.6) * 3 + (k - 2.5) * 1.6, ny = py + 3;
          ell(g, nx, ny, 3.5 - i * 0.3, 3, k % 2 ? '#7a4a6a' : '#6a3a5a'); px = nx; py = ny;
        }
      }
      ell(g, 80, 78, 20, 22, '#7a4a6a'); ell(g, 76, 70, 12, 12, '#8a5a7a');
      for (let i = 0; i < 6; i++) ell(g, 70 + hash(i) * 22, 64 + hash(i + 3) * 26, 1.5, 1.5, '#5a2a4a');
      ell(g, 92, 86, 4, 3, '#f2e27a'); rect(g, 92, 85, 2, 3, '#1a0a10');
      ell(g, 98, 88, 3, 2, '#f2e27a');
    },
    wels(g, t, o = {}) {
      const s = o.scale || 1, y = 104;
      ell(g, 70, y + 6, 40 * s, 14 * s, o.c2 || '#3e3326');
      ell(g, 82, y - 2, 30 * s, 16 * s, o.c1 || '#4f4232');
      ell(g, 86, y + 6, 24 * s, 7 * s, '#9a8a6a');
      const m = Math.abs(Math.sin(t * 1.6)) * 4 * s;
      poly(g, [[86, y + 3], [112 * s - 30 * (s - 1) + 0, y + 1 - m], [112, y + 5 + m]], '#2a1010');
      for (let i = 0; i < 2; i++) {
        let px = 104, py = y + 2 + i * 2;
        for (let k = 0; k < 14; k++) { const nx = px + 1.6 * s, ny = py + Math.sin(t * 2 + k * 0.5 + i) * 1.2 + (i ? 0.8 : -0.4); rect(g, nx, ny, 1, 1, '#c8b47a'); px = nx; py = ny; }
      }
      ell(g, 98, y - 8, 2 * s, 2 * s, '#e8e04a'); rect(g, 98, y - 8, 1, 1, '#000');
      for (let i = 0; i < 5; i++) ell(g, 60 + i * 9, y - 12 + Math.sin(i) * 2, 1.5, 1, '#6a5a42');
      if (o.crown) poly(g, [[74, y - 16], [74, y - 26], [79, y - 20], [83, y - 30], [87, y - 20], [92, y - 26], [92, y - 16]], '#e8c04a');
    },
    golem(g, t) {
      const b = Math.sin(t * 1.4) * 2;
      rect(g, 64, 76 + b, 34, 44, '#6a4f34');
      for (let i = 0; i < 5; i++) rect(g, 64, 80 + i * 8 + b, 34, 1, '#4a3622');
      ell(g, 64, 84 + b, 3, 4, '#8a6a48'); ell(g, 98, 100 + b, 3, 4, '#8a6a48');
      rect(g, 68, 58 + b, 26, 20, '#7a5a3c'); ell(g, 81, 58 + b, 13, 4, '#5a8a3a');
      ell(g, 87, 67 + b, 3, 2, '#7affd8');
      line(g, 98, 84 + b, 116, 72 + b + Math.sin(t * 3) * 4, '#6a4f34', 5);
      line(g, 64, 86 + b, 52, 104 + b, '#6a4f34', 5);
      for (let i = 0; i < 6; i++) ell(g, 66 + hash(i) * 30, 76 + hash(i + 2) * 40 + b, 2, 1, '#4f8a3a');
    },
    rochen(g, t) {
      const y = 90 + Math.sin(t * 2) * 5, w = Math.sin(t * 4) * 6;
      poly(g, [[48, y - w], [80, y - 10], [110, y], [80, y + 10], [48, y + w]], '#3a5a7a');
      poly(g, [[60, y - w * 0.5], [80, y - 6], [100, y], [80, y + 6]], '#5a86a8');
      line(g, 48, y, 20, y + 6 + Math.sin(t * 3) * 4, '#2a405a', 2);
      ell(g, 98, y - 3, 1.5, 1.5, '#ffe24a'); ell(g, 98, y + 3, 1.5, 1.5, '#ffe24a');
      for (let i = 0; i < 3; i++) ell(g, 70 + i * 8, y, 1, 1, '#8ad0ff');
    },
    qualle(g, t) {
      for (let k = 0; k < 3; k++) {
        const ox = 62 + k * 18, oy = 70 + k * 10 + Math.sin(t * 2 + k) * 5;
        for (let i = 0; i < 5; i++) line(g, ox - 6 + i * 3, oy + 4, ox - 6 + i * 3 + Math.sin(t * 3 + i + k) * 3, oy + 22, '#e8a0e0');
        ell(g, ox, oy, 10, 8, '#d070c8'); ell(g, ox, oy + 2, 8, 4, '#f0b0f0'); ell(g, ox - 3, oy - 3, 2, 2, '#fff');
      }
    },
    hydra(g, t) {
      ell(g, 80, 116, 34, 10, '#2f4a3a');
      for (let k = 0; k < 3; k++) {
        const bx = 64 + k * 16, hgt = 50 + (k === 1 ? 14 : 0);
        let px = bx, py = 116;
        for (let i = 0; i < 12; i++) {
          const u = i / 11;
          const nx = bx + Math.sin(t * 2 + k * 2 + u * 3) * 8 * u + u * 12;
          const ny = 116 - u * hgt;
          ell(g, nx, ny, 6 - u * 2, 5, i % 2 ? '#3f6a4a' : '#35593f'); px = nx; py = ny;
        }
        ell(g, px + 4, py, 9, 6, '#4a7a52');
        poly(g, [[px + 6, py], [px + 20, py - 2], [px + 18, py + 4]], '#4a7a52');
        poly(g, [[px + 6, py + 2], [px + 18, py + 5 + Math.abs(Math.sin(t * 3 + k)) * 3], [px + 6, py + 5]], '#2a1010');
        ell(g, px + 6, py - 3, 1.5, 1.5, '#ff4a2a');
        poly(g, [[px - 2, py - 4], [px - 8, py - 12], [px + 2, py - 6]], '#7aa05a');
      }
    },
    leviathan(g, t) { serpent(g, t, { body: '#1f3f6a', body2: '#173257', belly: '#7ab0c8', r: 7, head: 11, scale: 1.25, fin: '#3ad0e0', eye: '#7affff', seg: 22 }); },
    welskoenig(g, t) { MON_DRAW.wels(g, t, { crown: true, c1: '#3f3a4a', c2: '#2f2a3a' }); }
  };
  function hash(n) { return GFX.hash(n); }

  /* ---------- Charakter-Baukasten (Editor) ----------
     Setzt eine 16×24-Figur (Blick nach links) aus Einzelteilen zusammen und
     zieht danach automatisch einen dunklen Umriss. */
  const PARTS = {
    hair: ['Kurz', 'Seitenscheitel', 'Stachelig', 'Lang', 'Zopf', 'Glatze', 'Stirnband', 'Hut', 'Lockig', 'Dutt'],
    face: ['Freundlich', 'Ernst', 'Narbe', 'Dunkle Brille', 'Bart', 'Augenklappe', 'Sommersprossen'],
    top: ['Hemd', 'Offene Jacke', 'Rüstung', 'Langer Mantel', 'Weste', 'Tunika', 'Hoher Kragen', 'Pullover'],
    build: ['Schmal', 'Normal', 'Kräftig'],
    pants: ['Lange Hose', 'Kurze Hose', 'Pluderhose', 'Kilt'],
    feet: ['Stiefel', 'Schuhe', 'Sandalen', 'Barfuß']
  };
  const COLORS = {
    skin: ['#f5d7b8', '#f1c9a5', '#e2b48e', '#d9a173', '#b9784f', '#8a5a3c', '#5e3b26'],
    hair: ['#1e1a22', '#3a2a22', '#6a4a32', '#a8743a', '#e3c06a', '#b8432e', '#d7d9de', '#f4f2ee', '#3a5ab0', '#3f8a5a', '#d070a8'],
    cloth: ['#c42532', '#7a1f2e', '#d8742a', '#c9a24a', '#3f8a4a', '#5d6a2e', '#2a8a8a', '#2f5a9a', '#1f2a4a', '#6a3a8a', '#6e5034', '#2a2630', '#7d8590', '#e8e4dc']
  };
  function shade(hex, f = 0.68) {
    const n = parseInt(hex.slice(1), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(v * f));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  }
  const lighten = hex => { const n = parseInt(hex.slice(1), 16); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.min(255, Math.round(v + (255 - v) * 0.35)).toString(16).padStart(2, '0')).join(''); };

  function build(L, wtype) {
    const G = Array.from({ length: 24 }, () => Array(16).fill(null));
    const set = (x, y, c) => { if (x >= 0 && x < 16 && y >= 0 && y < 24 && c) G[y][x] = c; };
    const box = (x0, y0, x1, y1, c, sh) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, sh && x === x1 ? sh : c); };
    const sk = COLORS.skin[L.skin] || COLORS.skin[1], skS = shade(sk, 0.82);
    const hc = COLORS.hair[L.hairCol] || COLORS.hair[0], hcS = shade(hc);
    const tc = COLORS.cloth[L.topCol] || COLORS.cloth[0], tcS = shade(tc);
    const pc = COLORS.cloth[L.pantsCol] || COLORS.cloth[10], pcS = shade(pc);
    const fc = COLORS.cloth[L.feetCol] || COLORS.cloth[11], fcS = shade(fc);
    const B = [{ x0: 5, x1: 10 }, { x0: 4, x1: 10 }, { x0: 3, x1: 11 }][L.build] || { x0: 4, x1: 10 };

    // 1) Haare hinten
    if (L.hair === 3) box(9, 4, 12, 13, hc, hcS);
    if (L.hair === 4) { box(12, 5, 13, 7, hc, hcS); box(12, 8, 12, 11, hcS); }
    if (L.hair === 9) box(10, 1, 12, 3, hc, hcS);

    // 2) Beine / Hose
    const legL = [5, 7], legR = [8, 10];
    if (L.pants === 0) { box(legL[0], 16, legL[1], 20, pc); box(legR[0], 16, legR[1], 20, pcS); }
    if (L.pants === 1) { box(legL[0], 16, legL[1], 17, pc); box(legR[0], 16, legR[1], 17, pcS); box(legL[0] + 1, 18, legL[1], 20, sk); box(legR[0], 18, legR[1] - 1, 20, skS); }
    if (L.pants === 2) { box(4, 16, 7, 19, pc); box(8, 16, 11, 19, pcS); box(5, 20, 7, 20, pc); box(8, 20, 10, 20, pcS); }
    if (L.pants === 3) { box(B.x0, 16, B.x1, 17, pc, pcS); box(B.x0 - 1, 18, B.x1 + 1, 18, pc, pcS); box(legL[0] + 1, 19, legL[1], 20, sk); box(legR[0], 19, legR[1] - 1, 20, skS); }

    // 3) Füße
    if (L.feet === 0) { box(4, 18, 7, 21, fc); box(8, 18, 11, 21, fcS); set(4, 18, null); set(4, 19, null); set(8, 18, fcS); }
    if (L.feet === 1) { box(4, 21, 7, 21, fc); box(8, 21, 11, 21, fcS); }
    if (L.feet === 2) { box(4, 21, 7, 21, sk); box(8, 21, 11, 21, skS); set(5, 20, fc); set(9, 20, fcS); set(5, 21, fc); set(9, 21, fcS); }
    if (L.feet === 3) { box(4, 21, 7, 21, sk); box(8, 21, 11, 21, skS); }

    // 4) Oberkörper + Arme
    const bare = L.top === 4;
    box(6, 10, 8, 10, sk);
    if (L.top === 3) { box(B.x0, 16, B.x0 + 1, 19, tc); box(B.x1 - 1, 16, B.x1 + 1, 19, tcS); }
    if (L.top === 5) box(B.x0, 16, B.x1, 17, tc, tcS);
    box(B.x0, 11, B.x1, 15, bare ? sk : tc, bare ? skS : tcS);
    if (L.top === 0) { set(6, 11, sk); set(7, 11, sk); }
    if (L.top === 1) { box(6, 11, 7, 15, '#ece6da'); }
    if (L.top === 2) { box(B.x0, 11, B.x1, 11, lighten(tc)); box(B.x0 + 1, 13, B.x1 - 1, 13, tcS); }
    if (L.top === 3) { box(6, 11, 6, 15, tcS); }
    if (bare) { box(B.x0, 11, B.x0 + 1, 15, tc); box(B.x1 - 1, 11, B.x1, 15, tcS); }
    if (L.top === 6) { box(5, 9, 10, 10, tc, tcS); }
    if (L.top === 7) { box(B.x0, 11, B.x1, 11, tcS); box(B.x0, 15, B.x1, 15, tcS); }
    const sleeve = bare ? sk : tc;
    box(B.x0 - 1, 11, B.x0 - 1, 14, sleeve); set(B.x0 - 1, 15, sk);
    box(B.x1 + 1, 11, B.x1 + 1, 14, bare ? skS : tcS); set(B.x1 + 1, 15, skS);
    if (L.top !== 5 && L.top !== 7) { box(B.x0, 15, B.x1, 15, '#4a3322'); set(6, 15, '#d6a84a'); }
    if (L.top === 5) { box(B.x0, 14, B.x1, 14, '#4a3322'); set(6, 14, '#d6a84a'); }

    // 5) Kopf
    box(5, 3, 9, 3, sk); box(4, 4, 9, 8, sk); box(10, 4, 10, 8, skS); box(5, 9, 9, 9, sk);
    set(4, 4, null); set(3, 6, sk);

    // 6) Gesicht
    const eye = '#2a1e2a';
    if (L.face !== 3 && L.face !== 5) set(5, 6, eye);
    if (L.face === 0 || L.face === 6) set(5, 8, skS);
    if (L.face === 1) { set(6, 6, skS); set(5, 5, hcS); set(6, 5, hcS); set(5, 8, shade(sk, 0.7)); }
    if (L.face === 2) { set(6, 5, '#a8423a'); set(7, 6, '#a8423a'); set(8, 7, '#a8423a'); set(5, 8, skS); }
    if (L.face === 3) { box(4, 6, 7, 6, '#121218'); set(3, 6, '#121218'); set(8, 5, '#121218'); }
    if (L.face === 4) { box(4, 8, 9, 9, hc, hcS); set(5, 8, hcS); }
    if (L.face === 5) { set(5, 6, '#121218'); set(6, 6, '#121218'); box(6, 5, 10, 5, '#121218'); }
    if (L.face === 6) { set(6, 7, '#c8785a'); set(8, 7, '#c8785a'); set(7, 6, '#c8785a'); }

    // 7) Haare vorne
    const h = (x0, y0, x1, y1) => box(x0, y0, x1, y1, hc, hcS);
    switch (L.hair) {
      case 0: h(5, 2, 10, 2); h(4, 3, 11, 3); h(8, 4, 11, 4); set(4, 4, hc); h(10, 5, 11, 6); break;
      case 1: h(5, 2, 10, 2); h(4, 3, 11, 3); h(4, 4, 11, 4); h(5, 5, 6, 5); h(10, 5, 11, 7); break;
      case 2: [5, 7, 9, 11].forEach(x => set(x, 1, hc)); h(4, 2, 11, 2); h(3, 3, 12, 3); h(3, 4, 5, 4); h(8, 4, 12, 4); h(10, 5, 12, 7); set(3, 5, hc); break;
      case 3: h(5, 2, 10, 2); h(4, 3, 11, 3); h(4, 4, 11, 4); set(4, 5, hc); h(10, 4, 11, 9); break;
      case 4: h(5, 2, 10, 2); h(4, 3, 11, 3); h(8, 4, 11, 4); set(4, 4, hc); h(10, 5, 11, 6); break;
      case 5: set(8, 3, lighten(sk)); break;
      case 6: { const bc = COLORS.cloth[L.feetCol === L.topCol ? 0 : L.topCol] || tc; box(5, 2, 10, 2, bc); box(4, 3, 11, 3, bc, shade(bc)); h(8, 4, 11, 4); h(10, 5, 11, 7); set(12, 3, bc); set(12, 4, shade(bc)); break; }
      case 7: { const hat = shade(tc, 0.55); box(5, 0, 10, 2, hat); box(2, 3, 13, 3, hat); set(5, 2, '#d6a84a'); h(9, 4, 11, 4); h(10, 5, 11, 6); break; }
      case 8: h(6, 1, 9, 1); h(4, 2, 11, 2); h(3, 3, 12, 3); h(3, 4, 4, 5); h(8, 4, 12, 4); h(10, 5, 12, 8); [4, 6, 9, 11].forEach(x => set(x, 3, hcS)); break;
      case 9: h(5, 2, 10, 2); h(4, 3, 11, 3); h(8, 4, 11, 4); set(4, 4, hc); h(10, 5, 11, 5); break;
    }

    // 8) Waffe passend zur Heldenklasse
    const hx = B.x0 - 1, steel = '#dfe8ef', steelS = '#7d8a99', wood = '#8a5a32';
    if (wtype === 'klinge') { set(hx - 1, 16, steelS); set(hx - 1, 17, steel); set(hx - 2, 18, steel); set(hx - 2, 19, steel); }
    if (wtype === 'schwert') { set(hx, 16, '#5a3a24'); for (let i = 0; i < 6; i++) set(hx - 1 - Math.floor(i / 2), 17 + i, i % 2 ? steelS : steel); }
    if (wtype === 'bogen') { for (let y = 10; y <= 20; y++) set(hx - 1 - (y > 12 && y < 18 ? 1 : 0), y, wood); for (let y = 11; y <= 19; y++) set(hx, y, '#e8e4dc'); }
    if (wtype === 'faust') { set(hx, 15, '#ffb02a'); set(hx - 1, 15, '#ffe066'); set(hx - 1, 14, '#ff7a1a'); }
    if (wtype === 'schuss') { set(hx - 1, 15, '#2a2630'); set(hx - 2, 15, '#2a2630'); set(hx - 3, 15, steelS); set(hx - 1, 16, '#2a2630'); }

    // Umriss
    const c = document.createElement('canvas'); c.width = 16; c.height = 24;
    const g = c.getContext('2d');
    for (let y = 0; y < 24; y++) for (let x = 0; x < 16; x++) {
      let col = G[y][x];
      if (!col) {
        const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => G[y + dy] && G[y + dy][x + dx]);
        if (n) col = OUT;
      }
      if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
    }
    return c;
  }
  /* Startwerte im Editor: angelehnt an das jeweilige Standard-Sprite */
  const DEFAULT_LOOKS = {
    ryn: { hair: 1, hairCol: 0, skin: 1, face: 1, top: 1, topCol: 10, build: 0, pants: 0, pantsCol: 13, feet: 0, feetCol: 11 },
    elarion: { hair: 3, hairCol: 4, skin: 0, face: 0, top: 5, topCol: 4, build: 0, pants: 0, pantsCol: 10, feet: 0, feetCol: 10 },
    ignaz: { hair: 6, hairCol: 0, skin: 3, face: 0, top: 4, topCol: 0, build: 1, pants: 1, pantsCol: 7, feet: 2, feetCol: 10 },
    varg: { hair: 3, hairCol: 6, skin: 2, face: 2, top: 2, topCol: 11, build: 1, pants: 0, pantsCol: 10, feet: 0, feetCol: 11 },
    kael: { hair: 1, hairCol: 2, skin: 1, face: 2, top: 1, topCol: 11, build: 1, pants: 0, pantsCol: 11, feet: 0, feetCol: 11 },
    kurogane: { hair: 0, hairCol: 6, skin: 2, face: 3, top: 6, topCol: 1, build: 2, pants: 0, pantsCol: 11, feet: 0, feetCol: 11 },
    dorian: { hair: 2, hairCol: 7, skin: 0, face: 0, top: 3, topCol: 0, build: 1, pants: 0, pantsCol: 11, feet: 0, feetCol: 11 }
  };

  return { hero, portrait, full, setCustom, build, PARTS, COLORS, DEFAULT_LOOKS, MON_DRAW, HERO_MAPS };
})();
