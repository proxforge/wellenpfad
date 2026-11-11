'use strict';
/* Wellenpfad – Hauptmodul: Szenen-Loop, Bildschirme, Karte, Häfen, Lernen, Statistik. */
const SCENE = { mode: 'title', env: { time: 'dusk', shore: 'reeds', water: 'river' }, scroll: 0, shipX: 200, travel: null, mapSel: null };

const GAME = (() => {
  const { el, btn, panel, overlay, toast, dialog, confirm, bar, wait, view, pager, tabs } = UI;
  const $ = s => document.querySelector(s);
  const S = () => SAVE.s;
  let current = null; // aktueller Bildschirm (für Navigation)

  /* ======================= Render-Loop ======================= */
  let last = performance.now(), playAcc = 0;
  function frame(now) {
    const t = now / 1000, dt = Math.min(0.05, (now - last) / 1000); last = now;
    try {
      if (REAL.on() && SCENE.mode !== 'battle') { /* Realmodus: keine Pixelgrafik */ }
      else if (SCENE.mode === 'battle') BATTLE.render(t, dt);
      else if (SCENE.mode === 'map') drawMap(t, dt);
      else drawWorld(t, dt);
    } catch (e) { console.error(e); }
    if (SAVE.s) { playAcc += dt; if (playAcc > 5) { SAVE.s.stats.play += playAcc; playAcc = 0; } }
    requestAnimationFrame(frame);
  }

  const shipCv = document.createElement('canvas'); shipCv.width = 256; shipCv.height = 160;
  const shipG = shipCv.getContext('2d');
  const SLOT_DX = [[-102, 15], [-79, 23], [-57, 13], [-34, 21]];
  function drawWorld(t, dt) {
    const env = SCENE.env, g = GFX.cx.main, gl = GFX.cx.glow;
    const moving = SCENE.mode === 'sail' || SCENE.mode === 'title';
    SCENE.scroll += dt * (moving ? 16 : 0);
    g.clearRect(0, 0, 256, 160);
    GFX.drawBackground(env, t, SCENE.scroll);
    GFX.drawWater(g, env, t, SCENE.scroll);
    GFX.drawGlowBase(gl, env, t);
    const ox = SCENE.mode === 'harbor' ? 236 : SCENE.mode === 'title' ? 196 : 214, oy = 86;
    const bob = Math.sin(t * 1.6) * (SCENE.mode === 'harbor' ? 0.6 : 1.4);
    shipG.clearRect(0, 0, 256, 160);
    GFX.drawShipBack(shipG, ox, oy + bob, t, env, SAVE.s ? SAVE.s.up : null);
    const party = SAVE.s ? SAVE.s.party : ['ryn', 'elarion', 'ignaz', 'varg'];
    party.forEach((id, i) => {
      const [dx, dy] = SLOT_DX[i];
      const s = SPRITES.hero(id);
      const hx = ox + dx, hy = oy + dy + bob;
      GFX.ell(shipG, hx, hy, 7, 2, 'rgba(40,20,10,0.35)');
      shipG.drawImage(s, Math.round(hx - 8), Math.round(hy - 24 + (Math.floor(t * 1.5 + i) % 2)));
    });
    GFX.drawShipFront(shipG, ox, oy + bob, t, SAVE.s ? SAVE.s.up : null);
    g.drawImage(shipCv, 0, 0);
    const wl = Math.round(oy + 42 + bob);
    for (let r = 0; r < 26; r++) {
      g.globalAlpha = 0.28 * (1 - r / 26);
      g.drawImage(shipCv, 0, wl - r, 256, 1, Math.round(Math.sin(t * 3 + r * 0.7) * 1.5), wl + r, 256, 1);
    }
    g.globalAlpha = 1;
    if (moving) for (let i = 0; i < 8; i++) {
      const p = ((t * 0.7 + i / 8) % 1);
      GFX.rect(g, ox + 2 + p * 60, wl - 2 + i % 3, 6 - p * 5, 1, `rgba(255,255,255,${0.6 * (1 - p)})`);
    }
    GFX.drawLantern(gl, ox, oy + bob, t);
    GFX.drawFg(GFX.cx.fg, env, t, SCENE.scroll, SCENE.mode);
  }

  /* ======================= Weltkarte ======================= */
  function mapPos() {
    if (SCENE.travel) {
      const tr = SCENE.travel, p = Math.min(1, (performance.now() - tr.t0) / tr.dur);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      return [tr.a.x + (tr.b.x - tr.a.x) * e, tr.a.y + (tr.b.y - tr.a.y) * e];
    }
    const n = NODES[S().node]; return [n.x, n.y];
  }
  function drawMap(t) {
    const g = GFX.cx.main, gl = GFX.cx.glow, bg = GFX.cx.bg, { rect, ell, poly, line, hash, mix } = GFX;
    rect(bg, 0, 0, 256, 160, '#2d4a33');
    GFX.cx.fg.clearRect(0, 0, 256, 160); gl.clearRect(0, 0, 256, 160);
    rect(g, 0, 0, 256, 160, '#4f7a46');
    for (let i = 0; i < 90; i++) ell(g, hash(i) * 256, hash(i + 1) * 160, 6 + hash(i + 2) * 10, 3 + hash(i + 3) * 5, i % 3 ? '#5a8650' : '#456c3e');
    // Meer
    poly(g, [[150, 160], [196, 112], [222, 104], [256, 60], [256, 160]], '#2c6390');
    poly(g, [[168, 160], [204, 120], [228, 112], [256, 74], [256, 160]], '#24557f');
    for (let i = 0; i < 24; i++) { const x = 196 + hash(i + 40) * 60, y = 110 + hash(i + 41) * 50; if (y > 160 - (x - 150) * 0.2) continue; rect(g, x + Math.sin(t + i) * 2, y, 3, 1, 'rgba(200,230,255,0.5)'); }
    poly(g, [[150, 160], [196, 112], [222, 104], [256, 60], [256, 64], [224, 108], [198, 116], [156, 160]], '#d8c890');
    // Berge
    for (let i = 0; i < 9; i++) {
      const x = 8 + i * 17 + hash(i) * 8, y = 14 + hash(i + 5) * 10, s = 9 + hash(i + 9) * 6;
      if (x > 150) continue;
      poly(g, [[x - s, y + s], [x, y - s * 0.4], [x + s, y + s]], '#6b6a62');
      poly(g, [[x - s * 0.3, y + s * 0.1], [x, y - s * 0.4], [x + s * 0.3, y + s * 0.1]], '#f2f2ea');
    }
    // Wälder
    for (let i = 0; i < 60; i++) { const x = hash(i + 100) * 200, y = 60 + hash(i + 101) * 100; if (x + y * 0.4 > 210) continue; ell(g, x, y, 3, 3, '#2f5a32'); ell(g, x - 1, y - 1, 1.5, 1.5, '#4a7a46'); }
    // Fluss
    const pts = NODES.map(n => [n.x, n.y]);
    pts.unshift([0, 18]);
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], len = Math.hypot(x1 - x0, y1 - y0);
      for (let k = 0; k <= len; k += 1) {
        const x = x0 + (x1 - x0) * k / len, y = y0 + (y1 - y0) * k / len, w = 2.5 + i * 0.6;
        ell(g, x, y, w + 1, w + 1, '#c9bb84');
      }
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], len = Math.hypot(x1 - x0, y1 - y0);
      for (let k = 0; k <= len; k += 1) {
        const x = x0 + (x1 - x0) * k / len, y = y0 + (y1 - y0) * k / len, w = 2.5 + i * 0.6;
        ell(g, x, y, w, w, '#3a7bb0');
        if (hash(k + i * 50 + Math.floor(t * 3)) > 0.93) rect(g, x, y, 2, 1, '#bfe4ff');
      }
    }
    // Knoten
    NODES.forEach((n, i) => {
      const open = i <= S().unlocked;
      const done = n.kind === 'boss' ? S().bosses[n.boss] : n.kind === 'water' ? (S().wins[n.id] || 0) >= n.need : true;
      const col = !open ? '#555a5a' : n.kind === 'harbor' ? '#e8c04a' : n.kind === 'boss' ? '#d8402a' : '#7ad0ff';
      ell(g, n.x, n.y, 6, 6, '#1b1622'); ell(g, n.x, n.y, 5, 5, col);
      if (n.kind === 'harbor') { rect(g, n.x, n.y - 3, 1, 6, '#1b1622'); rect(g, n.x - 2, n.y - 2, 5, 1, '#1b1622'); line(g, n.x - 3, n.y + 1, n.x, n.y + 3, '#1b1622'); line(g, n.x + 3, n.y + 1, n.x, n.y + 3, '#1b1622'); }
      if (n.kind === 'boss') { ell(g, n.x, n.y - 1, 2.5, 2.5, '#f2ece0'); rect(g, n.x - 1, n.y - 1, 1, 1, '#1b1622'); rect(g, n.x + 1, n.y - 1, 1, 1, '#1b1622'); rect(g, n.x - 1, n.y + 2, 3, 1, '#f2ece0'); }
      if (n.kind === 'water') { line(g, n.x - 3, n.y, n.x - 1, n.y - 2, '#1b1622'); line(g, n.x - 1, n.y - 2, n.x + 1, n.y, '#1b1622'); line(g, n.x + 1, n.y, n.x + 3, n.y - 2, '#1b1622'); }
      if (open && done && n.kind !== 'harbor') rect(g, n.x + 3, n.y - 6, 3, 3, '#7aff8a');
      if (!open) for (let k = 0; k < 4; k++) ell(g, n.x - 6 + k * 4 + Math.sin(t + k + i) * 1.5, n.y - 2 + (k % 2) * 3, 5, 3, 'rgba(230,236,240,0.75)');
      if (open && i === SCENE.mapSel) ell(gl, n.x, n.y, 10 + Math.sin(t * 5) * 2, 10 + Math.sin(t * 5) * 2, 'rgba(255,230,140,0.7)');
      else if (open) ell(gl, n.x, n.y, 7, 7, 'rgba(255,240,180,0.25)');
    });
    // Schiff
    const [sx, sy] = mapPos(); const b = Math.sin(t * 3);
    poly(g, [[sx - 6, sy + 1 + b], [sx + 6, sy + 1 + b], [sx + 4, sy + 4 + b], [sx - 4, sy + 4 + b]], '#6b4428');
    rect(g, sx, sy - 9 + b, 1, 10, '#3a2618');
    poly(g, [[sx + 1, sy - 8 + b], [sx + 6, sy - 2 + b], [sx + 1, sy - 1 + b]], '#f2ead2');
    rect(g, sx, sy - 11 + b, 3, 2, '#b8332e');
    ell(gl, sx, sy, 8, 5, 'rgba(255,220,140,0.3)');
    // Kompassrose
    const cx0 = 22, cy0 = 136;
    ell(g, cx0, cy0, 12, 12, 'rgba(240,230,200,0.85)'); ell(g, cx0, cy0, 10, 10, '#d8c8a0');
    poly(g, [[cx0, cy0 - 10], [cx0 + 2, cy0], [cx0 - 2, cy0]], '#b8332e'); poly(g, [[cx0, cy0 + 10], [cx0 + 2, cy0], [cx0 - 2, cy0]], '#1b1622');
    // Pergamentrand
    g.fillStyle = 'rgba(40,24,10,0.35)'; g.fillRect(0, 0, 256, 2); g.fillRect(0, 158, 256, 2); g.fillRect(0, 0, 2, 160); g.fillRect(254, 0, 2, 160);
    void mix;
  }
  function mapLabels() {
    const box = $('#map-labels'); box.replaceChildren();
    if (SCENE.mode !== 'map' || REAL.on()) return;
    NODES.forEach((n, i) => {
      const open = i <= S().unlocked;
      box.append(el('div.mlabel' + (open ? '' : '.locked') + (i === S().node ? '.here' : ''), {
        style: { left: (n.x / 256 * 100) + '%', top: ((n.y + (n.y > 120 ? -16 : 7)) / 160 * 100) + '%' },
        onclick: () => selectNode(i)
      }, open ? n.n : '???'));
    });
  }

  /* ======================= HUD & Navigation ======================= */
  function hud(title) {
    const h = $('#hud');
    if (!SAVE.s) { h.replaceChildren(); return; }
    h.replaceChildren(el('div.hud-loc', null, REAL.on() ? '' : title || ''), el('div.hud-gold', null, `${S().gold} G`));
    REAL.stage(title);
  }
  /* Feste Navigationsleiste: jeder Bereich ist mit einem Tipp erreichbar */
  const NAV = [['place', '⚓', 'Ort'], ['map', '🗺️', 'Karte'], ['crew', '👥', 'Crew'], ['bag', '🎒', 'Taschen'], ['learn', '📚', 'Lernen'], ['stats', '📊', 'Statistik'], ['opts', '⚙️', 'Optionen']];
  function setNav(active) {
    const n = $('#nav');
    if (active === false) { n.hidden = true; return; }
    n.hidden = false;
    n.replaceChildren(...NAV.map(([k, i, label]) => el('button' + (k === active ? '.on' : ''), { 'aria-current': k === active ? 'page' : null, onclick: () => { AUDIO.sfx('select'); go(k); } }, el('span', null, i), el('small', null, label))));
  }
  function show(navKey, node) { setNav(navKey); panel(node); }
  function go(screen, arg) {
    current = screen;
    $('#map-labels').replaceChildren();
    if (screen === 'place') return enterNode(S().node, true);
    const f = { title: showTitle, map: showMap, node: showNode, crew: showCrew, bag: showBag, learn: showLearn, stats: showStats, opts: showOptions }[screen];
    f(arg);
  }
  const cols2 = () => ($('#panel').clientWidth > 620 ? 2 : 1);

  /* ======================= Titel ======================= */
  function showTitle() {
    current = 'title';
    SCENE.mode = 'title'; SCENE.env = { time: 'dusk', shore: 'reeds', water: 'river' };
    $('#hud').replaceChildren();
    REAL.stage(null);
    AUDIO.music('title');
    const slots = [1, 2, 3].map(n => {
      const info = SAVE.slotInfo(n);
      return el('div.slot', null,
        btn(info ? el('span.slot-in', null, el('b', null, `Spielstand ${n}`), el('small', null, `${SAVE.MODES[info.mode].n} · ${NODES[info.node].n} · Stufe ${info.lv} · ${Math.round(info.correct / Math.max(1, info.answered) * 100)} % richtig`))
          : el('span.slot-in', null, el('b', null, `Spielstand ${n}`), el('small', null, 'Leer – neues Abenteuer beginnen')),
        () => info ? (SAVE.load(n), enterGame()) : newGame(n), 'slot-btn'),
        info ? btn('🗑', async () => { if (await confirm(`Spielstand ${n} wirklich löschen?`, 'Löschen')) { SAVE.remove(n); showTitle(); } }, 'ghost small del', { 'aria-label': `Spielstand ${n} löschen` }) : null);
    });
    show(false, el('div.view.title', null,
      el('h1', null, 'Wellenpfad'),
      el('p.tagline', null, 'Lerne die amtlichen Prüfungsfragen zum Sportbootführerschein als Rollenspiel-Abenteuer.'),
      el('div.slots', null, slots),
      el('div.row', null, btn('❓ Anleitung', help, 'ghost'), btn('📥 Importieren', () => importSave(), 'ghost')),
      el('p.fine', null, `${window.QUESTIONS.length} amtliche Fragen (ELWIS, Stand 01.08.2023)`)));
  }
  function help() {
    const slides = [
      ['⚔️ Lernen durch Kämpfen', 'Jeder Angriff wird erst ausgeführt, wenn du eine amtliche Prüfungsfrage richtig beantwortest. Falsch heißt daneben – und du siehst sofort die richtige Antwort.'],
      ['🗂️ Lernkartei', 'Jede Frage wandert bei richtiger Antwort ein Fach weiter (0–5), bei falscher zurück auf 0. Schwache Fragen kommen öfter dran.'],
      ['🛡️ Schilde & BREAK', 'Gegner haben Schilde und versteckte Schwächen. Triffst du eine Schwäche, sinkt der Schild. Bei 0 setzt der Gegner aus und nimmt fast doppelten Schaden.'],
      ['✨ Boost & Bonus', 'Jede Runde gibt +1 BP (max. 5). Bis zu 3 BP verstärken einen Angriff. Antworten unter 15 Sekunden geben +20 % Schaden, Lernserien bis +40 %.'],
      ['🛑 Abwehrfragen', 'Lädt ein Gegner einen Gewaltangriff auf, halbiert eine richtige Antwort den Schaden.'],
      ['⚓ Häfen', 'Gasthaus (Heilung), Händler, Werft (Upgrades), Taverne (neue Gefährten) und Prüfungsamt mit Prüfungssimulation: 30 Fragen, ab 24 richtigen bestanden.'],
      ['🧭 Bedienung', 'Unten wechselst du jederzeit zwischen Ort, Karte, Crew, Taschen, Lernen, Statistik und Optionen. Längere Listen blätterst du mit ◀ ▶ oder per Wischen.'],
      ['🏁 Ziel', 'Erreiche die Leuchtturmklippe, bestehe die Prüfungssimulation und besiege den Leviathan der Mündung.']];
    const m = overlay(el('div.help', null,
      el('h2', null, 'So funktioniert Wellenpfad'),
      pager(slides.map(([t, d]) => el('div.help-slide', null, el('h3', null, t), el('p', null, d)))),
      btn('Alles klar!', () => m.close(), 'gold wide')), { dismiss: true, cls: 'help-modal' });
  }
  function newGame(slot) {
    let mode = 'binnen', segeln = false;
    const opts = el('div.modes');
    const render = () => opts.replaceChildren(...Object.entries(SAVE.MODES).map(([k, m]) => {
      const cnt = window.QUESTIONS.filter(q => m.secs.includes(q.s)).length;
      return el('button.mode' + (k === mode ? '.on' : ''), { onclick: () => { mode = k; AUDIO.sfx('select'); render(); } }, el('b', null, m.n), el('small', null, `${cnt} Fragen`));
    }));
    render();
    show(false, view('Neues Abenteuer', { back: showTitle, sub: `Spielstand ${slot} – welchen Führerschein lernst du?` },
      opts,
      el('label.check', null, el('input', { type: 'checkbox', id: 'new-segeln', onchange: e => { segeln = e.target.checked; } }), ' Zusatz „Segeln Binnen“ (+47 Fragen)'),
      btn('Ablegen! ⚓', async () => {
        SAVE.create(slot, mode, segeln);
        S().seenStory.intro = true;
        await dialog(STORY.intro);
        enterNode(0, true);
      }, 'gold wide')));
  }
  function enterGame() { enterNode(S().node, true); }

  async function importSave() {
    const inp = el('input', { type: 'file', accept: '.json,application/json' });
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      const txt = await f.text();
      const slot = [1, 2, 3].find(n => !SAVE.slotInfo(n)) || 3;
      try { SAVE.importJSON(txt, slot); toast(`Importiert in Spielstand ${slot}`); enterGame(); } catch (e) { toast('Import fehlgeschlagen: ' + e.message); }
    };
    inp.click();
  }

  /* ======================= Karte ======================= */
  function showMap() {
    current = 'map';
    SCENE.mode = 'map'; SCENE.mapSel = S().node;
    hud('Weltkarte');
    AUDIO.music('sail');
    mapLabels();
    renderMapPanel();
  }
  function renderMapPanel() {
    const sel = SCENE.mapSel, n = NODES[sel];
    const nodes = NODES.map((x, i) => {
      const open = i <= S().unlocked;
      const icon = x.kind === 'harbor' ? '⚓' : x.kind === 'boss' ? '☠️' : '🌊';
      const prog = x.kind === 'water' ? `${Math.min(S().wins[x.id] || 0, x.need)}/${x.need}` : x.kind === 'boss' && S().bosses[x.boss] ? '✔' : '';
      return el('button.node' + (i === sel ? '.on' : '') + (open ? '' : '.locked') + (i === S().node ? '.here' : ''), { onclick: () => selectNode(i), disabled: !open },
        el('span', null, icon), el('b', null, open ? x.n : 'Unerforscht'), prog ? el('small', null, prog) : null);
    });
    const lvTxt = n.kind === 'water' ? `Gegnerstufe ${n.lv[0]}–${n.lv[1]}` : n.kind === 'boss' ? `Boss · Stufe ${n.lv}` : 'Hafen';
    show('map', view('🗺️ Weltkarte', { right: `${S().gold} G` },
      el('div.mapinfo', null,
        el('div.mi-text', null, el('b', null, n.n), el('small', null, ' · ' + lvTxt), el('p', null, n.d)),
        sel === S().node ? btn('▸ Anlegen', () => enterNode(sel), 'gold') : btn('⛵ Kurs setzen', () => travel(sel), 'gold')),
      pager(nodes, { cols: 3, cls: 'nodes' })));
  }
  function selectNode(i) {
    if (i > S().unlocked || SCENE.travel) return;
    AUDIO.sfx('select');
    SCENE.mapSel = i; renderMapPanel(); mapLabels();
  }
  async function travel(i) {
    if (SCENE.travel) return;
    $('#map-labels').replaceChildren();
    SCENE.travel = { a: NODES[S().node], b: NODES[i], t0: performance.now(), dur: 400 + Math.abs(i - S().node) * 450 };
    show('map', el('div.view.travel', null, el('p', null, `Kurs auf ${NODES[i].n} …`)));
    await wait(SCENE.travel.dur + 100);
    SCENE.travel = null;
    S().node = i; SAVE.persist();
    enterNode(i);
  }
  function tapMap(x, y) {
    let best = -1, bd = 14;
    NODES.forEach((n, i) => { const d = Math.hypot(n.x - x, n.y - y); if (d < bd) { bd = d; best = i; } });
    if (best >= 0) selectNode(best);
  }

  /* ======================= Orte ======================= */
  function enterNode(i, fromLoad) {
    const n = NODES[i];
    $('#map-labels').replaceChildren();
    S().node = i;
    SCENE.env = Object.assign({}, n.env);
    if (n.kind === 'harbor') { SCENE.mode = 'harbor'; S().unlocked = Math.max(S().unlocked, i + 1); AUDIO.music('harbor'); }
    else { SCENE.mode = 'sail'; AUDIO.music('sail'); }
    hud(n.n);
    SAVE.persist();
    showNode();
    if (!fromLoad && n.kind === 'harbor' && !S().seenStory['visit_' + n.id]) { S().seenStory['visit_' + n.id] = true; toast(`⚓ ${n.n} – Fortschritt gespeichert`); }
  }
  function showNode() {
    current = 'node';
    const n = NODES[S().node];
    SCENE.mode = n.kind === 'harbor' ? 'harbor' : 'sail';
    SCENE.env = Object.assign({}, n.env);
    hud(n.n);
    if (n.kind === 'harbor') return harbor(n);
    if (n.kind === 'water') return water(n);
    return bossNode(n);
  }

  function partyStrip() {
    return el('div.pstrip', null, S().party.map(id => {
      const st = BATTLE.heroStats(id), h = S().heroes[id];
      const hp = h.hp === null ? st.hp : h.hp, sp = h.sp === null ? st.sp : h.sp;
      return el('div.pmini' + (hp <= 0 ? '.ko' : ''), { title: `${HEROES[id].name}: LP ${hp}/${st.hp}, FP ${sp}/${st.sp}` }, el('img.pt', { src: SPRITES.portrait(id), alt: '' }),
        el('div', null, el('small', null, `${HEROES[id].name.split(' ')[0]} ${h.lv}`), bar(hp, st.hp, 'hp'), bar(sp, st.sp, 'sp')));
    }));
  }
  const tile = (icon, label, sub, fn, cls = '', attrs) => btn(el('span.tl', null, el('span.tl-i', null, icon), el('span.tl-t', null, el('b', null, label), sub ? el('small', null, sub) : null)), fn, 'tile-btn ' + cls, attrs);

  /* ---------- Hafen ---------- */
  function harbor(n) {
    const recruits = (RECRUITS[n.id] || []).filter(r => !S().heroes[r.id].joined && (!r.after || S().bosses[NODES.find(x => x.id === r.after).boss]));
    show('place', view(`⚓ ${n.n}`, { right: `${S().gold} G`, sub: n.d },
      partyStrip(),
      pager([
        tile('🛏️', 'Gasthaus', `Heilung · ${innCost()} G`, inn),
        tile('🛒', 'Händler', 'Tränke & Werkzeug', shop),
        tile('⚒️', 'Werft', 'Schiff & Waffen', wharf),
        tile('🍺', 'Taverne' + (recruits.length ? ' ❗' : ''), recruits.length ? 'Jemand wartet!' : 'Crew', () => tavern(n, recruits)),
        tile('📜', 'Prüfungsamt', S().examPassed ? 'Bestanden ✔' : 'Simulation', examOffice),
        tile('⛵', 'Ablegen', 'Zur Weltkarte', () => go('map'), 'gold')
      ], { cols: 2, cls: 'menu' })));
  }
  function innCost() { const p = S().party; return Math.round(6 * p.reduce((a, id) => a + S().heroes[id].lv, 0) / p.length + 4); }
  function inn() {
    const c = innCost();
    if (S().gold < c) return toast('Nicht genug Gold.');
    S().gold -= c;
    for (const id of HERO_ORDER) { S().heroes[id].hp = null; S().heroes[id].sp = null; }
    AUDIO.sfx('heal'); toast('Die Crew ist erholt. LP & FP vollständig.');
    SAVE.persist(); showNode();
  }
  function shop(page = 0) {
    current = 'shop';
    const rows = Object.entries(ITEMS).map(([k, it]) => el('div.shoprow', null,
      el('span.si', null, it.i), el('div.sd', null, el('b', null, it.n, el('small.muted', null, ` · ${S().items[k] || 0} im Besitz`)), el('small', null, it.d)),
      btn(`${it.price} G`, () => { if (S().gold < it.price) return toast('Nicht genug Gold.'); S().gold -= it.price; S().items[k] = (S().items[k] || 0) + 1; AUDIO.sfx('coin'); SAVE.soon(); hud(NODES[S().node].n); shop(lastPage); }, 'small', { disabled: S().gold < it.price })));
    let lastPage = page;
    show('place', view('🛒 Händler', { back: showNode, right: `${S().gold} G` }, pager(rows, { cols: cols2(), page, onpage: p => { lastPage = p; } })));
  }
  function wharf() {
    current = 'wharf';
    const rows = Object.entries(UPGRADES).map(([k, u]) => {
      const lv = S().up[k], max = lv >= u.max, cost = u.cost(lv);
      return el('div.shoprow', null, el('span.si', null, u.i),
        el('div.sd', null, el('b', null, `${u.n} `, el('small', null, `Stufe ${lv}/${u.max}`)), el('small', null, u.d)),
        max ? el('b.muted', null, 'MAX') : btn(`${cost} G`, () => { if (S().gold < cost) return toast('Nicht genug Gold.'); S().gold -= cost; S().up[k]++; AUDIO.sfx('level'); SAVE.persist(); hud(NODES[S().node].n); wharf(); }, 'small', { disabled: S().gold < cost }));
    });
    const flags = ['#b8332e', '#2c5aa0', '#2f8a4a', '#d8a02a', '#7a3aa0', '#1b1622'];
    rows.push(el('div.flags', null, el('small', null, 'Flagge:'), flags.map(f => el('button.flag' + (S().up.flag === f ? '.on' : ''), { style: { background: f }, 'aria-label': 'Flaggenfarbe', onclick: () => { S().up.flag = f; SAVE.soon(); wharf(); } }))));
    show('place', view('⚒️ Werft', { back: showNode, right: `${S().gold} G` }, pager(rows, { cols: cols2() })));
  }
  async function tavern(n, recruits) {
    for (const r of recruits) {
      await dialog(STORY[r.id]);
      S().heroes[r.id].joined = true;
      if (S().party.length < 4) S().party.push(r.id);
      AUDIO.sfx('level'); toast(`${HEROES[r.id].name} hat sich der Crew angeschlossen!`);
      SAVE.persist();
    }
    go('crew');
  }

  /* ---------- Gewässer ---------- */
  function water(n) {
    const wins = S().wins[n.id] || 0;
    show('place', view(`🌊 ${n.n}`, { right: `${S().gold} G`, sub: n.d },
      partyStrip(),
      el('div.progress', null, el('span', null, `Patrouillen ${Math.min(wins, n.need)}/${n.need}`, el('small.muted', null, wins >= n.need ? ' · Gebiet gesichert, der Weg ist frei' : ` · ${n.need} Siege öffnen den Weg`)), bar(Math.min(wins, n.need), n.need, 'xp')),
      pager([
        tile('⚔️', 'Patrouille fahren', `Gegnerstufe ${n.lv[0]}–${n.lv[1]}`, () => fight(n), 'gold'),
        tile('🗺️', 'Weitersegeln', 'Zur Weltkarte', () => go('map'))
      ], { cols: 2, cls: 'menu' })));
  }
  function regionPrefer(n) { return S().mode === 'beide' ? (n.env.water === 'sea' ? 'S' : 'I') : null; }
  async function fight(n) {
    if (!S().party.some(id => { const h = S().heroes[id]; return h.hp === null || h.hp > 0; })) return toast('Deine Crew ist kampfunfähig – heile sie zuerst!');
    const cnt = Math.random() < 0.25 ? 1 : Math.random() < 0.6 ? 2 : 3;
    const enemies = [];
    for (let i = 0; i < cnt; i++) enemies.push({ key: n.mons[Math.floor(Math.random() * n.mons.length)], lv: n.lv[0] + Math.floor(Math.random() * (n.lv[1] - n.lv[0] + 1)) });
    setNav(false);
    const r = await BATTLE.start({ enemies, env: n.env, node: n.id, prefer: regionPrefer(n) });
    afterBattle(n, r);
  }
  async function afterBattle(n, r) {
    if (r.result === 'win') {
      S().wins[n.id] = (S().wins[n.id] || 0) + 1;
      if (n.kind === 'water' && S().wins[n.id] >= n.need && S().unlocked <= NODES.indexOf(n)) {
        S().unlocked = NODES.indexOf(n) + 1; toast(`Neuer Ort entdeckt: ${NODES[S().unlocked].n}!`);
      }
      if (n.kind === 'boss') {
        S().bosses[n.boss] = true;
        S().unlocked = Math.max(S().unlocked, Math.min(NODES.length - 1, NODES.indexOf(n) + 1));
        SAVE.persist();
        if (n.boss === 'leviathan') { S().ended = true; SAVE.persist(); await dialog(STORY.ending); return go('stats'); }
        await dialog([['Erzähler', `${MONSTERS[n.boss].n} ist besiegt! Der Weg nach ${NODES[NODES.indexOf(n) + 1].n} ist frei.`]]);
      }
      SAVE.persist();
      enterNode(S().node);
    } else if (r.result === 'lose') {
      const lost = Math.floor(S().gold * 0.25); S().gold -= lost;
      let h = S().node; while (h > 0 && NODES[h].kind !== 'harbor') h--;
      for (const id of HERO_ORDER) { const st = BATTLE.heroStats(id); S().heroes[id].hp = Math.round(st.hp * 0.5); S().heroes[id].sp = Math.round(st.sp * 0.5); }
      SAVE.persist();
      await dialog([['Erzähler', `Die Wasserschutzpolizei schleppt die Wellenpfad zurück nach ${NODES[h].n}. Bergungskosten: ${lost} G.`], ['Elarion', 'Kopf hoch. Jede falsche Antwort ist eine, die wir beim nächsten Mal wissen.']]);
      enterNode(h);
    } else enterNode(S().node);
  }

  /* ---------- Boss ---------- */
  function bossNode(n) {
    const done = S().bosses[n.boss];
    const locked = n.needExam && !S().examPassed;
    const note = locked ? '🔒 Erst nach bestandener Prüfungssimulation (Lernen → Prüfung).' : done ? '✔ Besiegt – erneut herausfordern ist möglich.' : `${MONSTERS[n.boss].n} · Stufe ${n.lv}`;
    show('place', view(`☠️ ${n.n}`, { right: `${S().gold} G`, sub: n.d },
      partyStrip(),
      el('p.bossnote' + (locked ? '.warn' : done ? '.ok' : ''), null, note),
      pager([
        tile('⚔️', 'Herausfordern', 'Bosskampf – keine Flucht', async () => {
          if (locked) return toast('Bestehe zuerst die Prüfungssimulation!');
          await dialog(STORY[n.boss]);
          setNav(false);
          const r = await BATTLE.start({ enemies: [{ key: n.boss, lv: n.lv }], env: n.env, node: n.id, boss: true, prefer: regionPrefer(n) });
          afterBattle(n, r);
        }, 'gold', { disabled: locked }),
        tile('🗺️', 'Zur Karte', 'Lieber noch trainieren', () => go('map'))
      ], { cols: 2, cls: 'menu' })));
  }

  /* ======================= Crew ======================= */
  function showCrew(page = 0) {
    current = 'crew';
    hud('Crew');
    const joined = HERO_ORDER.filter(id => S().heroes[id].joined);
    let lastPage = page;
    const cards = joined.map(id => {
      const d = HEROES[id], h = S().heroes[id], st = BATTLE.heroStats(id), inP = S().party.includes(id);
      const hp = h.hp === null ? st.hp : h.hp;
      const lv = h.lv;
      return el('div.crew-card' + (inP ? '.in' : ''), null,
        el('div.cc-pic', null,
          REAL.on() ? el('img.crew-photo', { src: REAL.avatar(id), alt: '' }) : el('img.full', { src: SPRITES.full(id, 3), alt: '' }),
          el('small.cc-badge' + (inP ? '.on' : ''), null, inP ? 'aktiv' : 'Reserve')),
        el('div.cc-info', null,
          el('div.cc-name', null, el('b', null, d.name), el('small', null, ` ${d.title} · Stufe ${lv}`)),
          el('small.cc-bio', null, d.bio),
          el('small.cc-stats', null, `LP ${hp}/${st.hp} · FP ${st.sp} · ANG ${st.atk} · MAG ${st.mag} · ABW ${st.def} · TMP ${st.spd}`),
          el('div.xp', null, bar(h.xp, BATTLE.xpNeed(lv), 'xp')),
          el('div.cc-skills', null, d.weapons.map(w => el('span.chip', null, TYPES[w].i + ' ' + TYPES[w].n)),
            d.skills.map(s => el('span.chip' + (lv >= s.lv ? '' : '.locked'), { title: `${s.sp} FP · ${s.d}${lv >= s.lv ? '' : ` (ab Stufe ${s.lv})`}` }, (lv >= s.lv ? '' : '🔒 ') + s.n))),
          el('div.cc-btns', null,
            btn('✏️ Name', () => renameHero(id, lastPage), 'small ghost'),
            REAL.on() ? btn('📷 Foto', () => go('opts', 'real'), 'small ghost') : btn('🎨 Aussehen', () => lookEditor(id, null, 'kopf', lastPage), 'small ghost'),
            btn(inP ? '− Reserve' : '+ Aktiv', () => {
              if (inP) { if (S().party.length <= 1) return toast('Mindestens ein Held muss an Bord sein.'); S().party = S().party.filter(x => x !== id); }
              else { if (S().party.length >= 4) return toast('Maximal 4 Helden in der aktiven Gruppe.'); S().party.push(id); }
              SAVE.soon(); showCrew(lastPage);
            }, inP ? 'small ghost' : 'small'))));
    });
    const missing = HERO_ORDER.length - joined.length;
    show('crew', view('👥 Crew', { right: `aktiv ${S().party.length}/4`, sub: missing ? `Noch ${missing} Gefährten warten in Häfen entlang des Stroms.` : 'Reserve erhält 50 % EP.' },
      pager(cards, { cols: cols2(), page, onpage: p => { lastPage = p; } })));
  }
  function renameHero(id, page) {
    const inp = el('input.search', { id: 'hero-name', type: 'text', maxlength: 24, value: HEROES[id].name, autocomplete: 'off', 'aria-label': 'Name' });
    const save = () => { SAVE.rename(id, inp.value); m.close(); toast(`Name gespeichert: ${HEROES[id].name}`); showCrew(page); };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
    const m = overlay(el('div.pick', null, el('h3', null, `Neuer Name für ${HEROES[id].title}`),
      el('p.small.muted', null, `Standard: ${HEROES[id].orig}`), inp,
      el('div.row', null, btn('Standard', () => { inp.value = HEROES[id].orig; save(); }, 'ghost'), btn('Speichern', save, 'gold'))), { dismiss: true });
    setTimeout(() => inp.focus(), 50);
  }
  /* ---------- Charakter-Editor ---------- */
  function lookEditor(id, look, tab = 'kopf', crewPage = 0) {
    current = 'editor';
    hud('Charakter-Editor');
    const P = SPRITES.PARTS, C = SPRITES.COLORS;
    look = look || Object.assign({}, (S().looks && S().looks[id]) || SPRITES.DEFAULT_LOOKS[id]);
    const wtype = HEROES[id].weapons[0];
    const preview = () => {
      const c = SPRITES.build(look, wtype), big = document.createElement('canvas');
      big.width = 16 * 6; big.height = 24 * 6;
      const g = big.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, big.width, big.height);
      return big.toDataURL();
    };
    const img = el('img.editor-preview', { src: preview(), alt: 'Vorschau' });
    const redraw = () => { img.src = preview(); };
    const stepper = (label, key, names) => {
      const val = el('b.ed-val', null, names[look[key]]);
      const step = d => { look[key] = (look[key] + d + names.length) % names.length; val.textContent = names[look[key]]; redraw(); AUDIO.sfx('select'); };
      return el('div.ed-row', null, el('span.ed-label', null, label),
        el('button.ed-arrow', { 'aria-label': label + ' zurück', onclick: () => step(-1) }, '◀'), val,
        el('button.ed-arrow', { 'aria-label': label + ' weiter', onclick: () => step(1) }, '▶'));
    };
    const swatches = (label, key, list) => {
      const row = el('div.swatches');
      const draw = () => row.replaceChildren(...list.map((c, i) => el('button.sw' + (look[key] === i ? '.on' : ''), { style: { background: c }, 'aria-label': `${label} ${i + 1}`, onclick: () => { look[key] = i; draw(); redraw(); } })));
      draw();
      return el('div.ed-colors', null, el('span.ed-label', null, label), row);
    };
    let curTab = tab;
    const random = () => {
      const r = n => Math.floor(Math.random() * n);
      lookEditor(id, { hair: r(P.hair.length), hairCol: r(C.hair.length), skin: r(C.skin.length), face: r(P.face.length), top: r(P.top.length), topCol: r(C.cloth.length), build: r(P.build.length), pants: r(P.pants.length), pantsCol: r(C.cloth.length), feet: r(P.feet.length), feetCol: r(C.cloth.length) }, curTab, crewPage);
    };
    show('crew', view(`🎨 ${HEROES[id].name}`, { back: () => showCrew(crewPage), right: `${TYPES[wtype].i} ${TYPES[wtype].n}` },
      el('div.editor2', null,
        el('div.ed-stage', null, img),
        tabs([
          { id: 'kopf', label: 'Kopf', render: () => el('div.ed-controls', null, stepper('Frisur', 'hair', P.hair), swatches('Haare', 'hairCol', C.hair), stepper('Gesicht', 'face', P.face), swatches('Haut', 'skin', C.skin)) },
          { id: 'koerper', label: 'Körper', render: () => el('div.ed-controls', null, stepper('Oberteil', 'top', P.top), swatches('Farbe', 'topCol', C.cloth), stepper('Körperbau', 'build', P.build)) },
          { id: 'hose', label: 'Hose', render: () => el('div.ed-controls', null, stepper('Hose', 'pants', P.pants), swatches('Farbe', 'pantsCol', C.cloth)) },
          { id: 'fuesse', label: 'Füße', render: () => el('div.ed-controls', null, stepper('Füße', 'feet', P.feet), swatches('Farbe', 'feetCol', C.cloth)) }
        ], tab, t => { curTab = t; })),
      el('div.row.ed-actions', null,
        btn('🎲 Zufall', random, 'ghost small'),
        btn('↺ Standard', () => { SAVE.setLook(id, null); toast('Standard-Aussehen wiederhergestellt.'); showCrew(crewPage); }, 'ghost small'),
        btn('✔ Speichern', () => { SAVE.setLook(id, look); AUDIO.sfx('level'); toast('Aussehen gespeichert.'); showCrew(crewPage); }, 'gold small'))));
  }

  /* ======================= Taschen ======================= */
  function showBag() {
    current = 'bag';
    hud('Taschen');
    const usable = ['trank', 'grosstrank', 'aether', 'ring', 'proviant'];
    const rows = Object.entries(S().items).filter(([, n]) => n > 0).map(([k, n]) => {
      const it = ITEMS[k];
      return el('div.shoprow', null, el('span.si', null, it.i), el('div.sd', null, el('b', null, `${it.n} ×${n}`), el('small', null, it.d)),
        usable.includes(k) ? btn('Benutzen', () => useField(k), 'small') : el('small.muted', null, 'im Kampf'));
    });
    show('bag', view('🎒 Taschen', { right: `${S().gold} G` }, partyStrip(),
      rows.length ? pager(rows, { cols: cols2() }) : el('p.muted', null, 'Die Taschen sind leer. Händler gibt es in jedem Hafen.')));
  }
  function useField(k) {
    const it = ITEMS[k];
    const apply = id => {
      const st = BATTLE.heroStats(id), h = S().heroes[id];
      const hp = h.hp === null ? st.hp : h.hp, sp = h.sp === null ? st.sp : h.sp;
      if (it.use === 'heal') h.hp = Math.min(st.hp, hp + it.val);
      if (it.use === 'healall') h.hp = Math.min(st.hp, hp + it.val);
      if (it.use === 'sp') h.sp = Math.min(st.sp, sp + it.val);
      if (it.use === 'revive') { if (hp > 0) return false; h.hp = Math.round(st.hp / 2); }
      return true;
    };
    if (it.use === 'healall') { S().party.forEach(apply); S().items[k]--; AUDIO.sfx('heal'); SAVE.soon(); return showBag(); }
    const m = overlay(el('div.pick', null, el('h3', null, `${it.i} ${it.n} – für wen?`),
      S().party.map(id => btn(HEROES[id].name, () => { if (apply(id) === false) return toast('Nicht kampfunfähig.'); S().items[k]--; AUDIO.sfx('heal'); SAVE.soon(); m.close(); showBag(); })),
      btn('Abbrechen', () => m.close(), 'ghost')), { dismiss: true });
  }

  /* ======================= Lernen ======================= */
  function showLearn() {
    current = 'learn';
    hud('Lernen');
    const M = SAVE.mastery();
    const weak = SAVE.pool().filter(q => { const r = S().q[q.id]; return r && r.w > 0 && r.b <= 1; });
    show('learn', view('📚 Lernen', { right: `${M.learned}/${M.total} sicher`, sub: `${SAVE.MODES[S().mode].n}${S().segeln ? ' + Segeln' : ''} · „sicher“ = Fach 3 oder höher` },
      pager([
        tile('⚡', 'Schnelltraining', '10 Fragen · 3 G pro richtige', () => training(null, 10)),
        tile('🎯', 'Problemfragen', `${weak.length} mit Fehlern`, () => weak.length ? training(QUIZ.shuffle(weak.slice()).slice(0, 15), 15) : toast('Keine Problemfragen – stark!'), '', { disabled: !weak.length }),
        tile('🆕', 'Neue Fragen', `${M.unseen} ungesehen`, () => {
          const un = SAVE.pool().filter(q => !S().q[q.id]); if (!un.length) return toast('Alle Fragen gesehen!');
          training(QUIZ.shuffle(un).slice(0, 10), 10);
        }),
        tile('📜', 'Prüfung', S().examPassed ? 'Bestanden ✔' : '30 Fragen · ab 24', examOffice, 'gold'),
        tile('🔎', 'Fragenkatalog', 'Alle Fragen & Lösungen', () => catalog())
      ], { cols: 2, cls: 'menu' })));
  }
  async function training(list, n) {
    let ok = 0;
    const total = list ? Math.min(n, list.length) : n;
    for (let i = 0; i < total; i++) {
      show('learn', view('Training', { sub: `Frage ${i + 1} von ${total} · ${ok} richtig` }));
      const r = await QUIZ.ask({ q: list ? list[i] : null, context: `Training ${i + 1}/${total}`, autoClose: true });
      if (r.ok) { ok++; S().gold += 3; }
    }
    SAVE.persist();
    show('learn', view('Training beendet', { back: () => go('learn') },
      el('div.result', null, el('div.big', null, `${Math.round(ok / total * 100)} %`), el('p', null, `${ok} von ${total} richtig · +${ok * 3} G`),
        btn('Nochmal', () => training(list ? QUIZ.shuffle(list.slice()) : null, n), 'gold wide'))));
  }

  function catalog(filter = { s: 'all', q: '', only: 'all' }, page = 0) {
    current = 'catalog';
    hud('Fragenkatalog');
    const P = SAVE.pool();
    const secs = [...new Set(P.map(q => q.s))];
    const listBox = el('div.catbox');
    let lastPage = page;
    const renderList = (pg = 0) => {
      const term = filter.q.trim().toLowerCase();
      const items = P.filter(q => (filter.s === 'all' || q.s === filter.s)
        && (!term || (q.q + ' ' + q.a[0]).toLowerCase().includes(term) || String(q.n) === term)
        && (filter.only === 'all' || (filter.only === 'weak' ? (S().q[q.id] && S().q[q.id].b <= 1 && S().q[q.id].w > 0) : filter.only === 'new' ? !S().q[q.id] : S().q[q.id] && S().q[q.id].b >= 3)));
      const rows = items.map(q => {
        const r = S().q[q.id];
        return el('button.qrow', { onclick: () => QUIZ.detail(q, { onpractice: () => catalog(filter, lastPage) }) },
          el('span.qr-tags', null, el('span.tag.sec-' + q.s, null, `${QUIZ.SEC_LABEL[q.s]} ${q.n}`), r ? el('span.tag.box.b' + r.b, null, `F${r.b}`) : null, q.img ? el('span.tag', null, '🖼') : null),
          el('span.qr-text', null, q.q));
      });
      listBox.replaceChildren(el('small.muted.count', null, `${items.length} Fragen`), rows.length ? pager(rows, { cols: cols2(), page: pg, onpage: p => { lastPage = p; } }) : el('p.muted', null, 'Keine Treffer.'));
    };
    let tmr;
    const search = el('input.search', { type: 'search', id: 'cat-search', placeholder: 'Suchen …', 'aria-label': 'Fragen durchsuchen', value: filter.q, oninput: e => { filter.q = e.target.value; clearTimeout(tmr); tmr = setTimeout(() => renderList(0), 200); } });
    const sel = el('select', { id: 'cat-sec', 'aria-label': 'Bereich', onchange: e => { filter.s = e.target.value; renderList(0); } }, el('option', { value: 'all' }, 'Alle Bereiche'), secs.map(s => el('option', { value: s, selected: filter.s === s }, SAVE.SECTION_NAMES[s])));
    const only = el('select', { id: 'cat-only', 'aria-label': 'Filter', onchange: e => { filter.only = e.target.value; renderList(0); } }, [['all', 'Alle'], ['weak', 'Problemfragen'], ['new', 'Ungesehen'], ['good', 'Sicher']].map(([v, l]) => el('option', { value: v, selected: filter.only === v }, l)));
    show('learn', view('🔎 Fragenkatalog', { back: () => go('learn') }, el('div.filters', null, search, sel, only), listBox));
    renderList(page);
  }

  /* ---------- Prüfungssimulation ---------- */
  async function examOffice() {
    let kind = S().mode;
    if (kind === 'beide') {
      kind = await new Promise(res => {
        const m = overlay(el('div.pick', null, el('h3', null, 'Welche Prüfung?'), btn('SBF Binnen (7 Basis + 23 Binnen)', () => { m.close(); res('binnen'); }), btn('SBF See (7 Basis + 23 See)', () => { m.close(); res('see'); }), btn('Abbrechen', () => { m.close(); res(null); }, 'ghost')));
      });
      if (!kind) return;
    }
    const ok = await confirm(`Prüfungssimulation ${SAVE.MODES[kind].n}: 30 Fragen (7 Basis + 23 spezifische). Auswertung erst am Ende, bestanden ab 24 richtigen.`, 'Prüfung starten');
    if (!ok) return;
    const comp = SAVE.MODES[kind].exam, qs = [];
    for (const [sec, cnt] of Object.entries(comp)) qs.push(...QUIZ.shuffle(window.QUESTIONS.filter(q => q.s === sec)).slice(0, cnt));
    const answers = [];
    for (let i = 0; i < qs.length; i++) {
      const choice = await QUIZ.exam(qs[i], i, qs.length);
      if (choice === null) return go(current === 'learn' ? 'learn' : 'place');
      answers.push(choice);
    }
    const right = answers.filter(a => a.ok).length, pass = right >= 24;
    answers.forEach(a => SAVE.answer(a.q.id, a.ok));
    S().stats.exams.push({ d: Date.now(), kind, right, total: qs.length, pass });
    let reward = 0;
    if (pass && !S().examPassed) { S().examPassed = true; reward = 300; S().gold += reward; }
    SAVE.persist();
    AUDIO.sfx(pass ? 'win' : 'wrong');
    examResult(answers, right, pass, reward);
  }
  function examResult(answers, right, pass, reward) {
    current = 'exam';
    const rows = answers.map((a, i) => el('button.qrow.' + (a.ok ? 'ok' : 'bad'), { onclick: () => QUIZ.detail(a.q, { yours: a.text }) },
      el('span.qr-tags', null, el('span.tag' + (a.ok ? '.good' : '.bad'), null, `${a.ok ? '✔' : '✘'} ${i + 1}`)), el('span.qr-text', null, a.q.q)));
    show('learn', view(pass ? '🎉 Bestanden!' : '❌ Nicht bestanden', { back: () => go('learn'), right: `${right}/30`, sub: `Mindestens 24 richtige nötig${reward ? ` · +${reward} G · Leuchtturmklippe freigegeben` : ''} · Antippen zeigt die Lösung` },
      pager(rows, { cols: cols2() })));
  }

  /* ======================= Statistik ======================= */
  function showStats(tab) {
    current = 'stats';
    hud('Statistik');
    const st = S().stats, M = SAVE.mastery();
    const pct = Math.round(st.correct / Math.max(1, st.answered) * 100);
    const overview = () => {
      const tiles = [['Antworten', st.answered], ['Trefferquote', pct + ' %'], ['Beste Serie', st.bestStreak], ['Sicher', `${M.learned}/${M.total}`], ['Siege', `${st.won}/${st.battles}`], ['Monster', st.kills], ['Gold verdient', st.goldEarned], ['Spielzeit', Math.round(st.play / 60) + ' min']];
      const maxBox = Math.max(1, M.unseen, ...M.boxes);
      return el('div.stats-ov', null,
        el('div.tiles', null, tiles.map(([k, v]) => el('div.tile', null, el('b', null, v), el('small', null, k)))),
        el('div.boxes', { title: 'Fach 0 = zuletzt falsch · Fach 5 = mehrfach richtig' }, [['neu', M.unseen, 'bx-n'], ...M.boxes.map((v, i) => [`F${i}`, v, 'bx-' + i])].map(([k, v, c]) =>
          el('div.bx', null, el('div.bxbar', null, el('i.' + c, { style: { height: (v / maxBox * 100) + '%' } })), el('b', null, v), el('small', null, k)))));
    };
    const progress = () => {
      const days = [];
      for (let i = 13; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5); const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); days.push([d, st.days[k] || { a: 0, c: 0 }]); }
      const maxDay = Math.max(1, ...days.map(([, v]) => v.a));
      return el('div.stats-pr', null,
        el('div.secs', null, Object.entries(M.bySec).map(([s, v]) => el('div.secrow', null,
          el('div.sechead', null, el('b', null, SAVE.SECTION_NAMES[s]), el('small', null, `${v.learned}/${v.total} sicher · ${Math.round(v.c / Math.max(1, v.c + v.w) * 100)} %`)),
          el('div.stack', null, el('i.learned', { style: { width: (v.learned / v.total * 100) + '%' } }), el('i.seen', { style: { width: ((v.seen - v.learned) / v.total * 100) + '%' } }))))),
        el('small.muted', null, 'Aktivität der letzten 14 Tage (grün = richtig)'),
        el('div.days', null, days.map(([d, v]) => el('div.day', { title: `${d.toLocaleDateString('de-DE')}: ${v.a} Antworten, ${v.c} richtig` },
          el('div.dbar', null, el('i.da', { style: { height: (v.a / maxDay * 100) + '%' } }, el('i.dc', { style: { height: (v.c / Math.max(1, v.a) * 100) + '%' } }))),
          el('small', null, d.toLocaleDateString('de-DE', { weekday: 'narrow' }))))));
    };
    const exams = () => st.exams.length
      ? pager(st.exams.slice().reverse().map(e => el('div.exrow' + (e.pass ? '.ok' : '.bad'), null,
          el('span', null, new Date(e.d).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })), el('span', null, SAVE.MODES[e.kind].n), el('b', null, `${e.right}/${e.total} ${e.pass ? '✔' : '✘'}`))))
      : el('p.muted', null, 'Noch keine Prüfung abgelegt. Unter „Lernen“ findest du die Prüfungssimulation.');
    const worst = () => {
      const w = Object.entries(S().q).filter(([, r]) => r.w > 0).sort((a, b) => (b[1].w - b[1].c * 0.5) - (a[1].w - a[1].c * 0.5)).slice(0, 10);
      if (!w.length) return el('p.muted', null, 'Noch keine Fehler – weiter so!');
      return el('div.worstbox', null,
        btn('🎯 Diese 10 Fragen üben', () => training(w.map(([id]) => SAVE.QMAP[id]), w.length), 'gold wide'),
        pager(w.map(([id, r]) => { const q = SAVE.QMAP[id]; return el('button.qrow', { onclick: () => QUIZ.detail(q) }, el('span.qr-tags', null, el('span.tag.bad', null, `${r.w}✘ ${r.c}✔`)), el('span.qr-text', null, q.q)); }), { cols: cols2() }));
    };
    show('stats', view('📊 Statistik', { right: `${pct} % richtig` },
      tabs([{ id: 'ov', label: 'Überblick', render: overview }, { id: 'pr', label: 'Fortschritt', render: progress }, { id: 'ex', label: 'Prüfungen', render: exams }, { id: 'wo', label: 'Problemfragen', render: worst }], tab)));
  }

  /* ======================= Optionen ======================= */
  function showOptions(tab) {
    current = 'opts';
    hud('Optionen');
    const st = S().settings;
    const tog = (k, label, sub, fn) => el('label.opt', null, el('input', { type: 'checkbox', id: 'opt-' + k, checked: st[k], onchange: e => { st[k] = e.target.checked; fn && fn(st[k]); SAVE.soon(); } }), el('span', null, label, sub ? el('small', null, sub) : null));
    const general = () => pager([
      tog('music', 'Musik', null, v => AUDIO.setMusic(v)),
      tog('sfx', 'Soundeffekte', null, v => AUDIO.setSfx(v)),
      tog('speed', 'Tempo-Bonus', '+20 % Schaden bei Antwort unter 15 s'),
      tog('defendQ', 'Abwehrfragen', 'Richtige Antwort halbiert Gewaltangriffe'),
      el('label.opt', null, el('input', { type: 'checkbox', id: 'opt-segeln', checked: S().segeln, onchange: e => { S().segeln = e.target.checked; SAVE.soon(); } }), el('span', null, 'Segelfragen', el('small', null, '47 Zusatzfragen „Segeln Binnen“'))),
      el('label.opt', null, el('span', null, 'Lernmodus'), el('select', { id: 'opt-mode', onchange: e => { S().mode = e.target.value; SAVE.soon(); } }, Object.entries(SAVE.MODES).map(([k, m]) => el('option', { value: k, selected: S().mode === k }, m.n)))),
      el('label.opt', null, el('span', null, 'Textgröße Fragen'), el('select', { id: 'opt-text', onchange: e => { st.textSize = +e.target.value; SAVE.soon(); } }, [[0.9, 'Klein'], [1, 'Normal'], [1.12, 'Groß'], [1.25, 'Sehr groß']].map(([v, l]) => el('option', { value: v, selected: st.textSize === v }, l))))
    ], { cols: cols2() });
    const saveTab = () => pager([
      tile('💾', 'Jetzt speichern', `Spielstand ${SAVE.slot} · speichert auch automatisch`, () => { SAVE.persist(); toast('Gespeichert.'); }),
      tile('📤', 'Exportieren', 'In die Zwischenablage kopieren', exportSave),
      tile('📥', 'Importieren', 'Spielstand-Datei laden', () => importSave()),
      tile('🏠', 'Titelbildschirm', 'Spielstand wechseln', () => { SAVE.persist(); go('title'); }),
      el('p.fine', null, 'Fragen & Abbildungen: amtliche Fragenkataloge (BMDV, ELWIS, Stand 01.08.2023). Für die echte Prüfung den aktuellen Katalog prüfen.')
    ], { cols: cols2(), cls: 'menu' });
    show('opts', view('⚙️ Optionen', null,
      tabs([
        { id: 'gen', label: 'Allgemein', render: general },
        { id: 'real', label: 'Realmodus', render: () => REAL.realTab(() => showOptions('real')) },
        { id: 'react', label: 'Reaktionen', render: () => REAL.reactTab(() => showOptions('react')) },
        { id: 'save', label: 'Spielstand', render: saveTab }
      ], tab)));
  }
  function exportSave() {
    const json = SAVE.exportJSON();
    const fallback = () => {
      const txt = el('textarea.export', { readonly: true, id: 'export-json', 'aria-label': 'Spielstand' }, json);
      const m = overlay(el('div.pick', null, el('h3', null, 'Spielstand exportieren'),
        el('p.small.muted', null, 'Text markieren, kopieren und als .json-Datei speichern.'), txt,
        btn('Schließen', () => m.close(), 'ghost')), { dismiss: true });
      txt.select();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(json).then(() => toast('Spielstand kopiert – als .json-Datei speichern.'), fallback);
    else fallback();
  }

  /* ======================= Start ======================= */
  function boot() {
    GFX.init();
    const stage = $('#stage');
    stage.addEventListener('click', e => {
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width * GFX.W, y = (e.clientY - r.top) / r.height * GFX.H;
      if (SCENE.mode === 'battle') BATTLE.tapStage(x, y);
      else if (SCENE.mode === 'map') tapMap(x, y);
    });
    // Antippen schaltet den Ton im Browser frei; laufende Musik wird dabei nicht neu gestartet
    const unlock = () => { AUDIO.ensure(); if (SAVE.s) { AUDIO.setMusic(SAVE.s.settings.music); AUDIO.setSfx(SAVE.s.settings.sfx); } };
    window.addEventListener('pointerdown', unlock, { once: false, passive: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden && SAVE.s) SAVE.persist(); });
    requestAnimationFrame(frame);
    go('title');
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
  }
  return { boot, go, enterNode, refresh: () => { if (BATTLE.active || SCENE.travel) return; if (current === 'crew') showCrew(); else if (current === 'node') showNode(); } };
})();

window.addEventListener('DOMContentLoaded', GAME.boot);
