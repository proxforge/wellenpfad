'use strict';
/* Rundenbasiertes Partykampfsystem auf dem Wasser:
   Schilde & Schwächen (Break), Boost-Punkte (BP) – und jede Attacke
   gelingt nur, wenn die Prüfungsfrage richtig beantwortet wird. */
const BATTLE = (() => {
  const { el, btn, wait, floatText, banner, shake } = UI;
  const SHIP = { ox: 252, oy: 86 };
  const H_SLOTS = [[150, 101], [173, 109], [195, 99], [218, 107]];
  const E_SLOTS = { 1: [[62, 140]], 2: [[50, 110], [84, 142]], 3: [[48, 102], [86, 122], [44, 148]] };
  const MON_H = { aal: 62, hecht: 40, krebs: 40, nixe: 66, krake: 62, golem: 66, rochen: 42, qualle: 60, welskoenig: 52, hydra: 82, leviathan: 92 };
  const MAGIC = ['feuer', 'eis', 'blitz', 'licht', 'wind'];
  let B = null;

  /* ---------- Werte ---------- */
  function heroStats(id) {
    const d = HEROES[id], h = SAVE.s.heroes[id], up = SAVE.s.up, st = {};
    for (const k of Object.keys(d.base)) st[k] = Math.round(d.base[k] + d.grow[k] * (h.lv - 1));
    st.atk = Math.round(st.atk * (1 + 0.08 * up.blade));
    st.mag = Math.round(st.mag * (1 + 0.08 * up.blade));
    st.spd = Math.round(st.spd * (1 + 0.06 * up.sail));
    return st;
  }
  const xpNeed = lv => Math.round(28 * Math.pow(lv, 1.65));
  function grantXP(id, xp) {
    const h = SAVE.s.heroes[id]; let ups = 0;
    h.xp += xp;
    while (h.xp >= xpNeed(h.lv) && h.lv < 60) { h.xp -= xpNeed(h.lv); h.lv++; ups++; }
    return ups;
  }

  function makeEnemy(key, lv, slot) {
    const d = MONSTERS[key];
    const hp = Math.round(d.hp * (1 + 0.25 * (lv - 1)));
    const buf = document.createElement('canvas'); buf.width = 160; buf.height = 140;
    const fl = document.createElement('canvas'); fl.width = 160; fl.height = 140;
    return {
      side: 'e', key, d, name: d.n, lv, maxhp: hp, hp,
      atk: d.atk * (1 + 0.11 * (lv - 1)), def: d.def * (1 + 0.1 * (lv - 1)), spd: d.spd + lv * 0.4,
      shield: d.sh + (lv > 10 ? 1 : 0), maxShield: d.sh + (lv > 10 ? 1 : 0), weak: d.weak.slice(), revealed: {},
      broken: 0, charge: 0, turns: 0, x: slot[0], y: slot[1], buf, fl, flash: 0, dead: false, deadT: 0, lunge: 0, boss: !!d.boss
    };
  }
  function makeHero(id, i) {
    const st = heroStats(id), h = SAVE.s.heroes[id];
    if (h.hp === null || h.hp > st.hp) h.hp = st.hp;
    if (h.sp === null || h.sp > st.sp) h.sp = st.sp;
    return {
      side: 'h', id, d: HEROES[id], name: HEROES[id].name, st, maxhp: st.hp, hp: h.hp, maxsp: st.sp, sp: h.sp,
      bp: 1 + (SAVE.s.up.sail >= 3 ? 1 : 0), boost: 0, boosted: false, defending: false, buffs: {}, ko: h.hp <= 0,
      x: H_SLOTS[i][0], y: H_SLOTS[i][1], lunge: 0, flash: 0, sprite: SPRITES.hero(id)
    };
  }

  /* ---------- Start ---------- */
  function start(opts) {
    return new Promise(resolve => {
      const n = opts.enemies.length;
      B = {
        env: Object.assign({}, opts.env), node: opts.node, boss: !!opts.boss, round: 0,
        heroes: SAVE.s.party.map((id, i) => makeHero(id, i)),
        enemies: opts.enemies.map((e, i) => makeEnemy(e.key, e.lv, E_SLOTS[Math.min(3, n)][i])),
        fx: [], order: [], active: null, resolve, over: false, prefer: opts.prefer, t: 0, log: []
      };
      for (const h of B.heroes) if (h.ko) h.hp = 0;
      SCENE.mode = 'battle';
      AUDIO.music(B.boss ? 'boss' : 'battle');
      AUDIO.sfx('splash');
      document.getElementById('stage').classList.add('battle');
      buildTags();
      loop();
    });
  }

  function alive(list) { return list.filter(u => !(u.ko || u.dead)); }

  async function loop() {
    renderPanel(null);
    banner(B.boss ? '⚠ Bossgegner!' : 'Flussmonster tauchen auf!', B.boss ? 'boss' : '');
    await wait(1100);
    while (!B.over) {
      B.round++;
      B.order = [...alive(B.heroes), ...alive(B.enemies)]
        .map(u => ({ u, s: (u.side === 'h' ? u.st.spd : u.spd) * (0.85 + Math.random() * 0.3) }))
        .sort((a, b) => b.s - a.s).map(o => o.u);
      for (const u of B.order) {
        if (B.over) break;
        if (u.ko || u.dead) continue;
        B.active = u; renderOrder();
        if (u.side === 'h') await heroTurn(u);
        else await enemyTurn(u);
        if (checkEnd()) break;
      }
      if (B.over) break;
      endRound();
    }
  }

  function endRound() {
    for (const h of B.heroes) {
      if (!h.ko && !h.boosted) h.bp = Math.min(5, h.bp + 1);
      h.boosted = false;
      for (const k of Object.keys(h.buffs)) { if (--h.buffs[k].t <= 0) delete h.buffs[k]; }
    }
    for (const e of B.enemies) {
      if (e.broken > 0) { e.broken--; if (e.broken === 0 && !e.dead) { e.shield = e.maxShield; floatText(e.x, e.y - 30, 'Schild erneuert', 'info'); } }
    }
    updateTags(); renderPanel(null);
  }

  function checkEnd() {
    if (B.over) return true;
    if (!alive(B.enemies).length) { finish('win'); return true; }
    if (!alive(B.heroes).length) { finish('lose'); return true; }
    return false;
  }

  /* ---------- Heldenzug ---------- */
  function heroTurn(h) {
    h.defending = false; h.boost = 0;
    return new Promise(res => { B.turnDone = res; renderPanel(h); });
  }
  function endTurn() { const r = B.turnDone; B.turnDone = null; syncSave(); renderPanel(null); if (r) r(); }

  function renderPanel(h) {
    const party = el('div.b-party', null, B.heroes.map(x => {
      const card = el('div.b-hero' + (x === h ? '.active' : '') + (x.ko ? '.ko' : ''), null,
        el('img.pt', { src: SPRITES.portrait(x.id), alt: '' }),
        el('div.b-info', null,
          el('div.b-name', null, x.d.name.split(' ')[0], x.defending ? ' 🛡' : '', x.buffs.atk ? ' ⬆' : '', x.buffs.def ? ' ⛨' : ''),
          el('div.b-num', null, `LP ${x.hp}/${x.maxhp}`), UI.bar(x.hp, x.maxhp, 'hp'),
          el('div.b-num', null, `FP ${x.sp}/${x.maxsp}`), UI.bar(x.sp, x.maxsp, 'sp'),
          el('div.bp', null, [0, 1, 2, 3, 4].map(i => el('span' + (i < x.bp ? '.on' : '') + (x === h && i >= x.bp - x.boost && i < x.bp ? '.use' : ''))))));
      return card;
    }));
    let cmd;
    if (!h) cmd = el('div.b-cmd.wait', null, B.active && B.active.side === 'e' ? `${B.active.name} handelt …` : '…');
    else cmd = commandMenu(h);
    UI.panel(el('div.battle-ui', null, party, cmd));
  }

  function boostCtl(h) {
    return el('div.boost', null,
      el('span', null, 'Boost'),
      btn('−', () => { if (h.boost > 0) { h.boost--; renderPanel(h); } }, 'small ghost'),
      el('b', null, h.boost),
      btn('+', () => { if (h.boost < Math.min(3, h.bp)) { h.boost++; AUDIO.sfx('boost'); renderPanel(h); } }, 'small ghost'));
  }

  function commandMenu(h, sub) {
    const head = el('div.cmd-head', null, el('b', null, h.d.name), ' ist am Zug', boostCtl(h));
    let body;
    if (!sub) {
      body = el('div.cmd-grid', null,
        btn('⚔ Angriff', () => h.d.weapons.length > 1 ? setSub('weapon') : chooseTarget(h, { kind: 'attack', type: h.d.weapons[0] })),
        btn('✦ Fähigkeiten', () => setSub('skill')),
        btn('🎒 Gegenstand', () => setSub('item')),
        btn('🛡 Verteidigen', () => { h.defending = true; h.boost = 0; floatText(h.x, h.y - 26, 'Verteidigt', 'info'); endTurn(); }),
        btn('🏃 Flucht', () => tryFlee(h), 'ghost'));
    } else if (sub === 'weapon') {
      body = el('div.cmd-list', null, h.d.weapons.map(w => btn(`${TYPES[w].i} ${TYPES[w].n}`, () => chooseTarget(h, { kind: 'attack', type: w }))), btn('◂ Zurück', () => setSub(null), 'ghost'));
    } else if (sub === 'skill') {
      const lv = SAVE.s.heroes[h.id].lv;
      body = el('div.cmd-list', null, h.d.skills.map(s => {
        const locked = lv < s.lv;
        const b = btn(el('span.sk', null, el('span', null, `${s.type ? TYPES[s.type].i + ' ' : ''}${s.n}`), el('small', null, locked ? `ab Stufe ${s.lv}` : `${s.sp} FP · ${s.d}`)),
          () => chooseTarget(h, Object.assign({}, s, { kind: 'skill', sk: s.kind })), '', { disabled: locked || h.sp < s.sp || (s.target === 'dead' && !B.heroes.some(x => x.ko)) });
        return b;
      }), btn('◂ Zurück', () => setSub(null), 'ghost'));
    } else if (sub === 'item') {
      const its = Object.entries(SAVE.s.items).filter(([k, n]) => n > 0 && ITEMS[k].use !== 'joker');
      body = el('div.cmd-list', null, its.length ? its.map(([k, n]) => btn(el('span.sk', null, el('span', null, `${ITEMS[k].i} ${ITEMS[k].n} ×${n}`), el('small', null, ITEMS[k].d)),
        () => chooseTarget(h, { kind: 'item', item: k, target: ITEMS[k].target }))) : el('p.muted', null, 'Keine Gegenstände.'), btn('◂ Zurück', () => setSub(null), 'ghost'));
    }
    function setSub(s) { const c = document.querySelector('.b-cmd'); if (c) c.replaceWith(commandMenu(h, s)); }
    return el('div.b-cmd', null, head, body);
  }

  function chooseTarget(h, act) {
    const tgt = act.kind === 'attack' ? 'one' : act.target;
    const go = targets => runAction(h, act, targets);
    if (tgt === 'all' || tgt === 'random') return go(alive(B.enemies));
    if (tgt === 'party') return go(alive(B.heroes));
    if (tgt === 'self') return go([h]);
    if (tgt === 'none') return go(alive(B.enemies));
    let list;
    if (tgt === 'one' || tgt === 'enemy') list = alive(B.enemies);
    else if (tgt === 'ally') list = alive(B.heroes);
    else if (tgt === 'dead') list = B.heroes.filter(x => x.ko);
    if (!list.length) { UI.toast('Kein gültiges Ziel.'); return; }
    if (list.length === 1) return go(list);
    B.picking = t => { B.picking = null; go([t]); };
    const box = el('div.b-cmd', null, el('div.cmd-head', null, 'Ziel wählen', el('small.muted', null, ' (oder auf den Gegner tippen)')),
      el('div.cmd-list', null, list.map(t => btn(t.side === 'e' ? `${t.name}${t.broken ? ' (BREAK)' : ''}` : `${t.d.name} – LP ${t.hp}/${t.maxhp}`, () => B.picking && B.picking(t))),
        btn('◂ Zurück', () => { B.picking = null; renderPanel(h); }, 'ghost')));
    document.querySelector('.b-cmd').replaceWith(box);
  }

  function tapStage(x, y) {
    if (!B || !B.picking) return;
    let best = null, bd = 1e9;
    for (const e of alive(B.enemies)) {
      const hgt = MON_H[e.key] || 50;
      if (x > e.x - 45 && x < e.x + 45 && y > e.y - hgt - 10 && y < e.y + 8) {
        const d = Math.abs(x - e.x) + Math.abs(y - (e.y - hgt / 2)); if (d < bd) { bd = d; best = e; }
      }
    }
    if (best) B.picking(best);
  }

  async function tryFlee(h) {
    if (B.boss) { UI.toast('Vor einem Boss gibt es kein Entkommen!'); return; }
    renderPanel(null);
    const ok = Math.random() < 0.5 + SAVE.s.up.sail * 0.1;
    if (ok) { banner('Entkommen!'); await wait(800); finish('flee'); B.turnDone && B.turnDone(); }
    else { banner('Flucht gescheitert!'); await wait(700); endTurn(); }
  }

  /* ---------- Aktionen ---------- */
  async function runAction(h, act, targets) {
    renderPanel(null);
    const boost = h.boost;
    if (boost) { h.bp -= boost; h.boosted = true; }
    if (act.kind === 'item') { await useItem(h, act.item, targets); return endTurn(); }
    const name = act.kind === 'attack' ? `Angriff (${TYPES[act.type].n})` : act.n;
    const res = await QUIZ.ask({ prefer: B.prefer, context: `${h.d.name.split(' ')[0]} · ${name}${boost ? ` · Boost ${boost}` : ''}` });
    if (B.over) return;
    if (act.kind === 'skill') { h.sp -= act.sp; if (!res.ok) h.sp += Math.ceil(act.sp / 2); }
    if (!res.ok) {
      h.lunge = 1; await wait(250);
      floatText(h.x - 20, h.y - 30, 'Daneben!', 'miss'); AUDIO.sfx('miss');
      await wait(500); return endTurn();
    }
    const bonus = (1 + Math.min(0.4, SAVE.s.stats.streak * 0.04)) * (res.fast ? 1.2 : 1);
    if (res.fast) floatText(h.x, h.y - 34, 'Schnell! +20 %', 'info');
    if (act.kind === 'attack') {
      await damage(h, targets, { type: act.type, pow: 1, hits: 1 + boost, bonus });
    } else if (act.kind === 'skill') {
      const mul = [1, 1.6, 2.2, 2.8][boost];
      if (!act.sk) await damage(h, targets, { type: act.type, pow: act.pow * mul, hits: act.hits || 1, bonus, random: act.target === 'random', pierce: act.pierce });
      else await support(h, act, targets, mul, boost);
    }
    endTurn();
  }

  async function damage(h, targets, o) {
    h.lunge = 1; await wait(180);
    const magic = MAGIC.includes(o.type);
    const stat = magic ? h.st.mag : h.st.atk;
    const atkBuff = h.buffs.atk ? 1.3 : 1;
    const hitsTotal = o.random ? o.hits : o.hits;
    for (let i = 0; i < hitsTotal; i++) {
      const list = o.random ? [alive(B.enemies)[Math.floor(Math.random() * alive(B.enemies).length)]].filter(Boolean) : targets.filter(t => !t.dead);
      if (!list.length) break;
      for (const e of list) {
        effect(o.type, h, e);
        await wait(magic ? 260 : 150);
        let dmg = stat * o.pow * 2.2 * atkBuff * o.bonus * (0.92 + Math.random() * 0.16) - (o.pierce ? 0 : e.def);
        let weak = false;
        if (e.weak.includes(o.type)) {
          weak = true; dmg *= 1.5;
          if (!e.revealed[o.type]) { e.revealed[o.type] = true; }
          if (!e.broken) {
            e.shield--;
            if (e.shield <= 0) { e.shield = 0; e.broken = 2; e.charge = 0; breakFx(e); }
          }
        }
        if (e.broken) dmg *= 1.8;
        dmg = Math.max(1, Math.round(dmg));
        e.hp = Math.max(0, e.hp - dmg); e.flash = 1;
        AUDIO.sfx(weak ? 'weak' : 'hit');
        floatText(e.x + (Math.random() * 16 - 8), e.y - (MON_H[e.key] || 50) * 0.6, dmg, weak ? 'weak' : 'dmg');
        if (e.hp <= 0 && !e.dead) { e.dead = true; e.deadT = 1; SAVE.s.stats.kills++; AUDIO.sfx('splash'); }
        updateTags();
      }
      await wait(o.hits > 1 ? 120 : 200);
    }
    await wait(250);
  }

  async function support(h, act, targets, mul, boost) {
    h.lunge = 0.5;
    const kind = act.sk;
    if (kind === 'heal') {
      for (const t of targets) {
        const amt = Math.round(h.st.mag * act.pow * 2.4 * mul * (1 + Math.min(0.4, SAVE.s.stats.streak * 0.04)));
        t.hp = Math.min(t.maxhp, t.hp + amt); fxHeal(t); floatText(t.x, t.y - 28, '+' + amt, 'heal');
      }
      AUDIO.sfx('heal');
    } else if (kind === 'revive') {
      for (const t of targets) { t.ko = false; t.hp = Math.round(t.maxhp * 0.5); fxHeal(t); floatText(t.x, t.y - 28, 'Wiederbelebt', 'heal'); }
      AUDIO.sfx('heal');
    } else if (kind === 'buff') {
      for (const t of targets) { t.buffs[act.stat] = { t: 3 + boost }; fxHeal(t, '#ffd27a'); }
      floatText(h.x, h.y - 30, act.stat === 'atk' ? 'Angriff ↑' : 'Abwehr ↑', 'info'); AUDIO.sfx('magic');
    } else if (kind === 'bp') {
      h.bp = Math.min(5, h.bp + 2 + boost); h.boosted = false; floatText(h.x, h.y - 30, `+${2 + boost} BP`, 'info'); AUDIO.sfx('boost');
    } else if (kind === 'scan') {
      for (const e of targets) for (const w of e.weak) e.revealed[w] = true;
      floatText(targets[0].x, targets[0].y - 40, 'Schwächen enthüllt', 'info'); AUDIO.sfx('magic'); updateTags();
    }
    await wait(700);
  }

  async function useItem(h, key, targets) {
    const it = ITEMS[key];
    SAVE.s.items[key]--;
    h.lunge = 0.5;
    floatText(h.x, h.y - 32, it.i + ' ' + it.n, 'info');
    await wait(300);
    if (it.use === 'heal') { for (const t of targets) { t.hp = Math.min(t.maxhp, t.hp + it.val); fxHeal(t); floatText(t.x, t.y - 26, '+' + it.val, 'heal'); } AUDIO.sfx('heal'); }
    if (it.use === 'healall') { for (const t of alive(B.heroes)) { t.hp = Math.min(t.maxhp, t.hp + it.val); fxHeal(t); floatText(t.x, t.y - 26, '+' + it.val, 'heal'); } AUDIO.sfx('heal'); }
    if (it.use === 'sp') { for (const t of targets) { t.sp = Math.min(t.maxsp, t.sp + it.val); fxHeal(t, '#7ab8ff'); floatText(t.x, t.y - 26, '+' + it.val + ' FP', 'info'); } AUDIO.sfx('heal'); }
    if (it.use === 'revive') { for (const t of targets) { t.ko = false; t.hp = Math.round(t.maxhp / 2); fxHeal(t); } AUDIO.sfx('heal'); }
    if (it.use === 'dmgall') await damage(h, alive(B.enemies), { type: 'feuer', pow: it.val / (h.st.mag * 2.2), hits: 1, bonus: 1, pierce: true });
    if (it.use === 'shield') for (const e of targets) {
      if (!e.broken) { e.shield = Math.max(0, e.shield - it.val); if (e.shield === 0) { e.broken = 2; e.charge = 0; breakFx(e); } }
      updateTags();
    }
    await wait(500);
  }

  /* ---------- Gegnerzug ---------- */
  async function enemyTurn(e) {
    renderPanel(null);
    if (e.broken) { floatText(e.x, e.y - 40, 'Betäubt', 'info'); await wait(500); return; }
    e.turns++;
    const targets = alive(B.heroes);
    if (!targets.length) return;
    // Bosse und magische Gegner laden Flächenangriffe auf
    if (e.charge === 1) {
      e.charge = 0;
      banner(`${e.name}: Gewaltangriff!`, 'boss');
      await wait(700);
      let factor = 1;
      if (SAVE.s.settings.defendQ) {
        const r = await QUIZ.ask({ prefer: B.prefer, context: 'Abwehrfrage – richtig halbiert den Schaden!' });
        if (B.over) return;
        if (r.ok) { factor = 0.5; floatText(200, 60, 'Abgewehrt!', 'heal'); }
      }
      e.lunge = 1; AUDIO.sfx('enemy'); shake(400);
      await wait(250);
      for (const h of alive(B.heroes)) hitHero(e, h, 1.5 * factor);
      await wait(700); return;
    }
    if ((e.boss && e.turns % 3 === 0) || (e.d.magic && Math.random() < 0.22)) {
      e.charge = 1; floatText(e.x, e.y - (MON_H[e.key] || 50) - 4, '⚠ lädt auf …', 'warn'); updateTags(); AUDIO.sfx('magic');
      await wait(800); return;
    }
    const t = targets[Math.floor(Math.random() * targets.length)];
    e.lunge = 1; AUDIO.sfx('enemy');
    await wait(220);
    hitHero(e, t, 1);
    await wait(600);
  }

  function hitHero(e, h, mul) {
    let dmg = e.atk * 1.9 * mul * (0.9 + Math.random() * 0.2) - h.st.def * 0.6 * (h.buffs.def ? 1.4 : 1);
    if (h.defending) dmg *= 0.5;
    dmg *= 1 - 0.07 * SAVE.s.up.hull;
    dmg = Math.max(1, Math.round(dmg));
    h.hp = Math.max(0, h.hp - dmg); h.flash = 1;
    B.fx.push({ k: 'burst', t0: B.t, dur: 0.4, x: h.x, y: h.y - 12, col: '#ff6a5a' });
    floatText(h.x, h.y - 30, dmg, 'hurt'); shake(180);
    if (h.hp <= 0) { h.ko = true; h.bp = 0; floatText(h.x, h.y - 40, 'K.O.', 'miss'); }
    syncSave();
  }

  function syncSave() {
    for (const h of B.heroes) { SAVE.s.heroes[h.id].hp = h.hp; SAVE.s.heroes[h.id].sp = h.sp; }
  }

  /* ---------- Kampfende ---------- */
  async function finish(result) {
    if (B.over) return; B.over = true;
    if (B.picking) B.picking = null;
    syncSave();
    const S = SAVE.s, st = S.stats;
    st.battles++;
    document.getElementById('enemy-tags').replaceChildren();
    document.getElementById('turn-order').replaceChildren();
    let summary = null;
    if (result === 'win') {
      st.won++;
      AUDIO.music(null); AUDIO.sfx('win');
      const bonus = 1 + 0.1 * S.up.chart;
      let xp = 0, gold = 0;
      for (const e of B.enemies) { xp += e.d.xp * (1 + 0.3 * (e.lv - 1)); gold += e.d.gold * (1 + 0.15 * (e.lv - 1)); }
      xp = Math.round(xp * bonus); gold = Math.round(gold * bonus * (0.9 + Math.random() * 0.2));
      S.gold += gold; st.goldEarned += gold;
      const lvls = [];
      for (const id of HERO_ORDER) {
        if (!S.heroes[id].joined) continue;
        const inParty = S.party.includes(id);
        const ups = grantXP(id, inParty ? xp : Math.round(xp / 2));
        if (ups) lvls.push([id, S.heroes[id].lv]);
      }
      const drops = [];
      const pool = ['trank', 'trank', 'aether', 'kompass', 'netz', 'fackel', 'ring', 'grosstrank'];
      if (Math.random() < (B.boss ? 1 : 0.35)) { const k = pool[Math.floor(Math.random() * pool.length)]; S.items[k] = (S.items[k] || 0) + 1; drops.push(k); }
      if (B.boss) { S.items.ring = (S.items.ring || 0) + 1; drops.push('ring'); }
      banner('Sieg!', 'win');
      if (lvls.length) setTimeout(() => AUDIO.sfx('level'), 900);
      summary = { xp, gold, lvls, drops };
    } else if (result === 'lose') {
      st.lost++;
      banner('Niederlage …', 'boss');
    } else st.fled++;
    SAVE.persist();
    await wait(1300);
    document.getElementById('stage').classList.remove('battle');
    const r = B.resolve; const env = B.env;
    if (summary) await showSummary(summary);
    B = null;
    r({ result, env });
  }

  function showSummary(s) {
    return new Promise(res => {
      const S = SAVE.s;
      UI.panel(el('div.result', null,
        el('h2', null, '⚓ Sieg!'),
        el('div.res-row', null, el('span', null, 'Erfahrung'), el('b', null, `+${s.xp} EP`)),
        el('div.res-row', null, el('span', null, 'Gold'), el('b.gold', null, `+${s.gold} G`)),
        s.drops.length ? el('div.res-row', null, el('span', null, 'Beute'), el('b', null, s.drops.map(k => ITEMS[k].i + ' ' + ITEMS[k].n).join(', '))) : null,
        s.lvls.map(([id, lv]) => el('div.res-lv', null, el('img.pt', { src: SPRITES.portrait(id), alt: '' }), `${HEROES[id].name} erreicht Stufe ${lv}!`,
          HEROES[id].skills.filter(k => k.lv === lv).map(k => el('small', null, ` Neue Fähigkeit: ${k.n}`)))),
        el('div.res-row.muted', null, el('span', null, 'Lernquote gesamt'), el('b', null, `${Math.round(S.stats.correct / Math.max(1, S.stats.answered) * 100)} %`)),
        btn('Weiter ▸', () => res(), 'gold wide')));
    });
  }

  /* ---------- Effekte ---------- */
  function effect(type, h, e) {
    const tx = e.x, ty = e.y - (MON_H[e.key] || 50) * 0.5, t0 = B.t;
    const c = { schwert: '#ffffff', klinge: '#dff6ff', faust: '#ffd27a', bogen: '#f2e2b0', schuss: '#ffe07a', feuer: '#ff7a1a', eis: '#9ff0ff', blitz: '#fff27a', licht: '#ffffff', wind: '#b8ffd8' }[type];
    if (type === 'bogen' || type === 'schuss') B.fx.push({ k: 'proj', t0, dur: type === 'schuss' ? 0.12 : 0.25, x0: h.x - 10, y0: h.y - 14, x1: tx, y1: ty, col: c });
    if (type === 'schwert' || type === 'klinge') B.fx.push({ k: 'slash', t0, dur: 0.25, x: tx, y: ty, col: c, dir: Math.random() < 0.5 ? 1 : -1 });
    if (type === 'faust' || type === 'schuss' || type === 'bogen') B.fx.push({ k: 'burst', t0: t0 + (type === 'faust' ? 0 : 0.15), dur: 0.3, x: tx, y: ty, col: c });
    if (type === 'feuer') B.fx.push({ k: 'fire', t0, dur: 0.6, x: tx, y: ty + 10 });
    if (type === 'eis') B.fx.push({ k: 'ice', t0, dur: 0.5, x: tx, y: ty });
    if (type === 'blitz') { B.fx.push({ k: 'bolt', t0, dur: 0.35, x: tx, y: ty }); GFX.flash(); }
    if (type === 'licht') B.fx.push({ k: 'beam', t0, dur: 0.5, x: tx, y: ty });
    if (type === 'wind') B.fx.push({ k: 'wind', t0, dur: 0.5, x: tx, y: ty });
  }
  function breakFx(e) {
    B.fx.push({ k: 'shards', t0: B.t, dur: 0.9, x: e.x, y: e.y - (MON_H[e.key] || 50) * 0.5 });
    AUDIO.sfx('break'); shake(350);
    banner('BREAK!', 'break');
  }
  function fxHeal(t, col = '#9affb0') { B.fx.push({ k: 'heal', t0: B.t, dur: 0.8, x: t.x, y: t.y, col }); }

  function drawFx(g, gl, t) {
    const { ell, line, rect } = GFX;
    B.fx = B.fx.filter(f => t - f.t0 < f.dur + 0.05);
    for (const f of B.fx) {
      const p = (t - f.t0) / f.dur;
      if (p < 0) continue;
      switch (f.k) {
        case 'slash': {
          const L = 22 * Math.min(1, p * 2.2), a = 1 - p;
          for (let i = -1; i <= 1; i++) line(g, f.x - 10 * f.dir + i * 3, f.y - 12, f.x - 10 * f.dir + i * 3 + 20 * f.dir * L / 22, f.y - 12 + L, `rgba(255,255,255,${a})`);
          line(gl, f.x - 10 * f.dir, f.y - 12, f.x + 10 * f.dir, f.y + 10, `rgba(200,240,255,${a})`, 3);
          break;
        }
        case 'proj': {
          const q = Math.min(1, p), x = f.x0 + (f.x1 - f.x0) * q, y = f.y0 + (f.y1 - f.y0) * q - Math.sin(q * Math.PI) * 8;
          if (p <= 1) { line(g, x, y, x + 6, y - 1, f.col, 1); ell(gl, x, y, 3, 2, 'rgba(255,230,150,0.8)'); }
          break;
        }
        case 'burst': for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, r = p * 16; rect(g, f.x + Math.cos(a) * r, f.y + Math.sin(a) * r, 2, 2, f.col); ell(gl, f.x, f.y, 8 * (1 - p), 8 * (1 - p), 'rgba(255,220,160,0.6)'); } break;
        case 'fire': for (let i = 0; i < 18; i++) {
          const h = GFX.hash(i), x = f.x - 14 + h * 28 + Math.sin(t * 9 + i) * 2, y = f.y - p * (20 + h * 30) - i % 4 * 3;
          const c = p < 0.4 ? '#fff27a' : p < 0.7 ? '#ff9a2a' : '#c8321a';
          rect(g, x, y, 2 + (i % 2), 3, c); ell(gl, x, y, 4, 4, 'rgba(255,140,40,0.6)');
        } break;
        case 'ice': for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, r = 4 + p * 14; line(g, f.x + Math.cos(a) * 3, f.y + Math.sin(a) * 3, f.x + Math.cos(a) * r, f.y + Math.sin(a) * r, '#d8fbff'); ell(gl, f.x, f.y, 12, 12, `rgba(160,240,255,${0.6 * (1 - p)})`); } break;
        case 'bolt': { let x = f.x + 6, y = 0; while (y < f.y) { const nx = f.x + (GFX.hash(y + Math.floor(t * 30)) - 0.5) * 14, ny = y + 8; line(g, x, y, nx, ny, '#ffffff', 2); line(gl, x, y, nx, ny, 'rgba(255,240,120,0.9)', 5); x = nx; y = ny; } break; }
        case 'beam': rect(gl, f.x - 6 * (1 - p), 0, 12 * (1 - p), f.y + 10, 'rgba(255,255,230,0.8)'); rect(g, f.x - 2, 0, 4 * (1 - p), f.y + 10, '#ffffff'); break;
        case 'wind': for (let i = 0; i < 3; i++) { const a = t * 12 + i * 2.1, r = 8 + i * 5; line(g, f.x + Math.cos(a) * r, f.y + Math.sin(a) * r * 0.6, f.x + Math.cos(a + 0.8) * r, f.y + Math.sin(a + 0.8) * r * 0.6, '#d8ffe8', 2); } break;
        case 'heal': for (let i = 0; i < 8; i++) { const x = f.x - 8 + GFX.hash(i) * 16, y = f.y - 4 - p * 30 - GFX.hash(i + 3) * 10; rect(g, x, y, 1, 3, f.col); rect(g, x - 1, y + 1, 3, 1, f.col); ell(gl, x, y, 3, 3, 'rgba(160,255,180,0.5)'); } break;
        case 'shards': for (let i = 0; i < 22; i++) {
          const a = GFX.hash(i) * Math.PI * 2, v = 20 + GFX.hash(i + 9) * 40;
          rect(g, f.x + Math.cos(a) * v * p, f.y + Math.sin(a) * v * p + 40 * p * p, 2, 2, i % 3 ? '#9fd8ff' : '#ffffff');
        } ell(gl, f.x, f.y, 26 * (1 - p), 26 * (1 - p), 'rgba(160,220,255,0.7)'); break;
      }
    }
  }

  /* ---------- Gegner-Infos (DOM über der Szene) ---------- */
  function buildTags() {
    const box = document.getElementById('enemy-tags'); box.replaceChildren();
    for (const e of B.enemies) {
      e.tag = el('div.etag', { style: { left: (e.x / GFX.W * 100) + '%', top: ((e.y - (MON_H[e.key] || 50) - 6) / GFX.H * 100) + '%' } });
      box.append(e.tag);
    }
    updateTags(); renderOrder();
  }
  function updateTags() {
    if (!B) return;
    for (const e of B.enemies) {
      if (!e.tag) continue;
      if (e.dead) { e.tag.style.opacity = 0; continue; }
      e.tag.replaceChildren(
        REAL.on() ? el('div.et-icon', null, REAL.MON_ICON[e.key] || '🌊') : null,
        el('div.et-name', null, e.name, el('small', null, ` Lv${e.lv}`)),
        el('div.et-row', null,
          el('span.shield' + (e.broken ? '.broken' : ''), null, e.broken ? 'BREAK' : '🛡' + e.shield),
          el('span.weak', null, e.weak.map(w => el('i' + (e.revealed[w] ? '' : '.unk'), { title: TYPES[w].n }, e.revealed[w] ? TYPES[w].i : '?')))),
        UI.bar(e.hp, e.maxhp, 'ehp'), e.charge ? el('div.et-warn', null, '⚠ lädt auf') : null);
    }
  }
  function renderOrder() {
    const box = document.getElementById('turn-order'); if (!B) return;
    box.replaceChildren(...B.order.filter(u => !(u.ko || u.dead)).slice(0, 8).map(u => el('div.to' + (u === B.active ? '.cur' : '') + (u.side === 'e' ? '.foe' : ''), null,
      u.side === 'h' ? el('img', { src: SPRITES.portrait(u.id), alt: '' }) : el('span', null, u.name[0]))));
  }

  /* ---------- Zeichnen ---------- */
  const shipCv = document.createElement('canvas'); shipCv.width = 256; shipCv.height = 160;
  const shipG = shipCv.getContext('2d'); shipG.imageSmoothingEnabled = false;
  function render(t, dt) {
    if (!B) return;
    B.t = t;
    if (REAL.on()) { // Realmodus: keine Pixel-Szene, nur Foto-Bühne
      B.fx = [];
      for (const h of B.heroes) h.flash = Math.max(0, h.flash - dt * 3);
      if (t - (B.rt || 0) > 0.15) { B.rt = t; REAL.battle(B); }
      return;
    }
    const g = GFX.cx.main, gl = GFX.cx.glow, env = B.env;
    g.clearRect(0, 0, 256, 160);
    GFX.drawBackground(env, t, t * 4);
    GFX.drawWater(g, env, t, t * 4);
    GFX.drawGlowBase(gl, env, t);
    // Gegner (hinten nach vorne)
    const ens = B.enemies.slice().sort((a, b) => a.y - b.y);
    for (const e of ens) drawEnemy(g, gl, e, t, dt);
    // Schiff + Helden
    shipG.clearRect(0, 0, 256, 160);
    const bob = Math.sin(t * 1.6) * 1.2;
    GFX.drawShipBack(shipG, SHIP.ox, SHIP.oy + bob, t, env, SAVE.s.up);
    for (const h of B.heroes.slice().sort((a, b) => a.y - b.y)) drawHero(shipG, gl, h, t, dt, bob);
    GFX.drawShipFront(shipG, SHIP.ox, SHIP.oy + bob, t, SAVE.s.up);
    g.drawImage(shipCv, 0, 0);
    const wl = Math.round(SHIP.oy + 42 + bob);
    for (let r = 0; r < 26; r++) {
      g.globalAlpha = 0.28 * (1 - r / 26);
      g.drawImage(shipCv, 0, wl - r, 256, 1, Math.round(Math.sin(t * 3 + r * 0.7) * 1.5), wl + r, 256, 1);
    }
    g.globalAlpha = 1;
    GFX.drawLantern(gl, SHIP.ox, SHIP.oy + bob, t);
    drawFx(g, gl, t);
    GFX.drawFg(GFX.cx.fg, env, t, t * 4, 'battle');
  }

  function drawHero(g, gl, h, t, dt, bob) {
    h.lunge = Math.max(0, h.lunge - dt * 2.2);
    h.flash = Math.max(0, h.flash - dt * 3);
    const lx = -Math.sin(Math.min(1, 1 - h.lunge) * Math.PI) * 16 * (h.lunge > 0 ? 1 : 0);
    const x = Math.round(h.x - 8 + lx), y = Math.round(h.y - 24 + bob + (Math.floor(t * 2 + h.x) % 2 && !h.ko ? 1 : 0));
    if (h.ko) {
      g.save(); g.translate(h.x, h.y + bob - 4); g.rotate(-Math.PI / 2); g.globalAlpha = 0.75; g.drawImage(GFX.tinted(h.sprite, '#3a3a50'), -12, -8); g.restore(); g.globalAlpha = 1;
      return;
    }
    if (B.active === h) {
      GFX.ell(gl, h.x, h.y + bob, 10, 3, 'rgba(255,220,120,0.8)');
      GFX.poly(g, [[h.x - 3, y - 7 + Math.sin(t * 6) * 1.5], [h.x + 3, y - 7 + Math.sin(t * 6) * 1.5], [h.x, y - 3 + Math.sin(t * 6) * 1.5]], '#ffd84a');
    }
    GFX.ell(g, h.x, h.y + bob, 7, 2, 'rgba(40,20,10,0.35)');
    g.drawImage(h.sprite, x, y);
    if (h.flash > 0) { g.globalAlpha = h.flash; g.drawImage(GFX.tinted(h.sprite, '#ff5040'), x, y); g.globalAlpha = 1; }
    if (h.defending) GFX.ell(gl, h.x, h.y - 12 + bob, 11, 14, 'rgba(120,180,255,0.35)');
    if (h.id === 'ignaz' && !h.ko) GFX.ell(gl, x + 1, y + 14, 3, 3, 'rgba(255,140,40,0.8)');
    if (h.bp >= 5) GFX.ell(gl, h.x, h.y - 12 + bob, 9, 13, 'rgba(255,230,140,0.18)');
  }

  function drawEnemy(g, gl, e, t, dt) {
    e.flash = Math.max(0, e.flash - dt * 4);
    e.lunge = Math.max(0, e.lunge - dt * 2.2);
    if (e.dead) { e.deadT = Math.max(0, e.deadT - dt * 0.9); if (e.deadT <= 0) return; }
    const draw = SPRITES.MON_DRAW[e.d.draw];
    const tt = e.broken ? t * 0.3 : t + e.x;
    GFX.buffered(sg => draw(sg, tt), e.buf);
    const lx = Math.sin(Math.min(1, 1 - e.lunge) * Math.PI) * 16 * (e.lunge > 0 ? 1 : 0);
    const sink = e.dead ? (1 - e.deadT) * 50 : 0;
    const ox = Math.round(e.x - 80 + lx), oy = Math.round(e.y - 120);
    const visH = Math.max(0, 121 - sink);
    g.globalAlpha = e.dead ? e.deadT : 1;
    g.drawImage(e.buf, 0, 0, 160, visH, ox, oy + sink, 160, visH);
    if (e.flash > 0) {
      const fg = e.fl.getContext('2d');
      fg.globalCompositeOperation = 'source-over'; fg.clearRect(0, 0, 160, 140); fg.drawImage(e.buf, 0, 0);
      fg.globalCompositeOperation = 'source-in'; fg.fillStyle = '#ffffff'; fg.fillRect(0, 0, 160, 140);
      g.globalAlpha = e.flash; g.drawImage(e.fl, 0, 0, 160, visH, ox, oy + sink, 160, visH);
    }
    for (let r = 0; r < 30; r++) {
      g.globalAlpha = 0.25 * (1 - r / 30) * (e.dead ? e.deadT : 1);
      g.drawImage(e.buf, 0, 120 - r - sink, 160, 1, ox + Math.round(Math.sin(t * 3 + r * 0.8) * 1.5), e.y + r, 160, 1);
    }
    g.globalAlpha = 1;
    const rp = (t * 0.8 + e.x) % 1;
    GFX.ell(g, e.x, e.y + 1, 18 + rp * 14, 2 + rp, `rgba(255,255,255,${0.3 * (1 - rp)})`);
    if (e.broken && !e.dead) {
      for (let i = 0; i < 3; i++) { const a = t * 4 + i * 2.1; GFX.rect(g, e.x + Math.cos(a) * 12, e.y - (MON_H[e.key] || 50) - 2 + Math.sin(a) * 3, 2, 2, '#ffe27a'); }
    }
    if (e.charge) GFX.ell(gl, e.x, e.y - (MON_H[e.key] || 50) * 0.5, 22 + Math.sin(t * 10) * 3, 22, 'rgba(255,60,60,0.35)');
    if (B.picking && !e.dead) GFX.ell(gl, e.x, e.y - (MON_H[e.key] || 50) * 0.5, 20, 24, `rgba(255,230,140,${0.25 + 0.15 * Math.sin(t * 6)})`);
  }

  return { start, render, heroStats, xpNeed, grantXP, tapStage, get active() { return !!B; } };
})();
