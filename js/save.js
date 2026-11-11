'use strict';
/* Spielstände (3 Slots, localStorage), Lernkartei (Leitner-System) und Statistik. */
const SAVE = (() => {
  const KEY = 'wellenpfad.slot';
  const SECTION_NAMES = { B: 'Basisfragen', I: 'Binnen (spezifisch)', S: 'See (spezifisch)', G: 'Segeln Binnen' };
  const MODES = {
    binnen: { n: 'SBF Binnen', secs: ['B', 'I'], exam: { B: 7, I: 23 } },
    see: { n: 'SBF See', secs: ['B', 'S'], exam: { B: 7, S: 23 } },
    beide: { n: 'Binnen + See', secs: ['B', 'I', 'S'], exam: null }
  };
  const QMAP = {};
  for (const q of window.QUESTIONS) QMAP[q.id] = q;

  let state = null, slot = 1;

  function today() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  function fresh(mode, segeln) {
    const heroes = {};
    for (const id of HERO_ORDER) heroes[id] = { lv: 1, xp: 0, hp: null, sp: null, joined: id === 'ryn' || id === 'elarion' };
    return {
      v: 1, created: Date.now(), saved: Date.now(), mode, segeln: !!segeln,
      gold: 120, items: { trank: 4, aether: 1, kompass: 2, ring: 1 }, up: { blade: 0, hull: 0, sail: 0, chart: 0 },
      heroes, party: ['ryn', 'elarion'], node: 0, unlocked: 0, wins: {}, bosses: {}, examPassed: false, ended: false,
      seenStory: {},
      q: {},
      stats: { answered: 0, correct: 0, streak: 0, bestStreak: 0, battles: 0, won: 0, fled: 0, lost: 0, kills: 0, goldEarned: 0, play: 0, days: {}, exams: [] },
      settings: { music: true, sfx: true, speed: true, defendQ: true, textSize: 1, realMode: false }
    };
  }

  function slotInfo(n) {
    try {
      const raw = localStorage.getItem(KEY + n);
      if (!raw) return null;
      const s = JSON.parse(raw);
      return { mode: s.mode, gold: s.gold, node: s.node, saved: s.saved, answered: s.stats.answered, correct: s.stats.correct, lv: Math.max(...s.party.map(id => s.heroes[id].lv)), party: s.party };
    } catch (e) { return null; }
  }
  function load(n) {
    let raw = null;
    try { raw = localStorage.getItem(KEY + n); } catch (e) { raw = null; }
    if (!raw) return false;
    state = migrate(JSON.parse(raw)); slot = n; applyNames(); return true;
  }
  function migrate(s) {
    const f = fresh(s.mode || 'binnen', s.segeln);
    for (const k of Object.keys(f)) if (s[k] === undefined) s[k] = f[k];
    s.stats = Object.assign(f.stats, s.stats);
    s.settings = Object.assign(f.settings, s.settings);
    for (const id of HERO_ORDER) if (!s.heroes[id]) s.heroes[id] = f.heroes[id];
    delete s.sprites; // frühere Bild-Uploads werden nicht mehr verwendet
    return s;
  }
  function create(n, mode, segeln) { state = fresh(mode, segeln); slot = n; applyNames(); persist(); }
  /* Vom Spieler vergebene Heldennamen (nur im eigenen Spielstand gespeichert) */
  function applyNames() {
    if (state) REAL.load(slot);
    for (const id of HERO_ORDER) {
      HEROES[id].name = (state && state.names && state.names[id]) || HEROES[id].orig;
      const look = state && state.looks && state.looks[id];
      SPRITES.setCustom(id, look ? SPRITES.build(look, HEROES[id].weapons[0]) : null);
    }
  }
  /* Aussehen aus dem Charakter-Editor (null = Standard-Sprite) */
  function setLook(id, look) {
    state.looks = state.looks || {};
    if (look) state.looks[id] = Object.assign({}, look); else delete state.looks[id];
    applyNames(); persist();
  }
  function rename(id, name) {
    state.names = state.names || {};
    const n = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 24);
    if (n && n !== HEROES[id].orig) state.names[id] = n; else delete state.names[id];
    applyNames(); persist();
  }
  let pending = null;
  function persist() {
    if (!state) return;
    state.saved = Date.now();
    try { localStorage.setItem(KEY + slot, JSON.stringify(state)); } catch (e) { console.warn('Speichern fehlgeschlagen', e); }
  }
  function soon() { clearTimeout(pending); pending = setTimeout(persist, 400); }
  function remove(n) { REAL.removeSlot(n); try { localStorage.removeItem(KEY + n); } catch (e) { /* Speicher nicht verfügbar */ } }
  function exportJSON() { return JSON.stringify(state, null, 1); }
  function importJSON(txt, n) {
    const s = JSON.parse(txt);
    if (!s || !s.heroes || !s.stats) throw new Error('Keine gültige Spielstand-Datei');
    state = migrate(s); slot = n; applyNames(); persist();
  }

  /* ---------- Fragen-Pool & Leitner ---------- */
  function pool() {
    const secs = MODES[state.mode].secs.slice();
    if (state.segeln) secs.push('G');
    return window.QUESTIONS.filter(q => secs.includes(q.s));
  }
  function rec(id) { return state.q[id] || { b: 0, c: 0, w: 0, l: 0 }; }
  const recent = [];
  /* Gewichtete Auswahl: falsch beantwortete & neue Fragen bevorzugt,
     gut gelernte (hohes Fach) selten. Region kann Binnen/See-Fragen bevorzugen. */
  function pick(prefer) {
    const P = pool();
    const now = Date.now();
    let total = 0; const ws = [];
    const unseenCount = P.filter(q => !state.q[q.id]).length;
    const weakCount = P.filter(q => state.q[q.id] && state.q[q.id].b <= 1).length;
    for (const q of P) {
      if (recent.includes(q.id)) { ws.push(0); continue; }
      const r = state.q[q.id];
      let w;
      if (!r) w = weakCount > 25 ? 0.6 : 2.2; // nicht zu viele neue gleichzeitig
      else {
        w = [7, 4.5, 2.6, 1.3, 0.6, 0.25][r.b];
        const hrs = (now - r.l) / 3.6e6;
        w *= Math.min(3, 0.4 + hrs / ([0.05, 0.3, 4, 24, 72, 168][r.b]));
      }
      if (prefer && q.s === prefer) w *= 1.6;
      ws.push(w); total += w;
    }
    if (total <= 0) { recent.length = 0; return P[Math.floor(Math.random() * P.length)]; }
    let x = Math.random() * total;
    for (let i = 0; i < P.length; i++) { x -= ws[i]; if (x <= 0) { remember(P[i].id); return P[i]; } }
    remember(P[P.length - 1].id);
    void unseenCount;
    return P[P.length - 1];
  }
  function remember(id) { recent.push(id); if (recent.length > Math.min(40, Math.floor(pool().length / 3))) recent.shift(); }

  function answer(id, ok) {
    const r = rec(id);
    const before = r.b;
    if (ok) { r.c++; r.b = Math.min(5, r.b + 1); } else { r.w++; r.b = 0; }
    r.l = Date.now();
    state.q[id] = r;
    const st = state.stats;
    st.answered++;
    if (ok) { st.correct++; st.streak++; st.bestStreak = Math.max(st.bestStreak, st.streak); } else st.streak = 0;
    const d = today();
    st.days[d] = st.days[d] || { a: 0, c: 0 };
    st.days[d].a++; if (ok) st.days[d].c++;
    soon();
    return { before, after: r.b };
  }

  function mastery() {
    const P = pool();
    const boxes = [0, 0, 0, 0, 0, 0]; let unseen = 0;
    const bySec = {};
    for (const q of P) {
      const r = state.q[q.id];
      bySec[q.s] = bySec[q.s] || { total: 0, seen: 0, learned: 0, c: 0, w: 0 };
      const S = bySec[q.s]; S.total++;
      if (!r) { unseen++; continue; }
      boxes[r.b]++; S.seen++; if (r.b >= 3) S.learned++; S.c += r.c; S.w += r.w;
    }
    return { total: P.length, unseen, boxes, bySec, learned: boxes[3] + boxes[4] + boxes[5] };
  }

  return {
    get s() { return state; }, get slot() { return slot; }, MODES, SECTION_NAMES, QMAP,
    slotInfo, load, create, rename, setLook, applyNames, persist, soon, remove, exportJSON, importJSON, pool, pick, answer, rec, mastery, today
  };
})();
