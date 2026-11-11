'use strict';
/* Quiz-Karte: Fragt eine amtliche Frage ab, mischt die Antworten, zeigt
   Lernfeedback (richtige Antwort, Leitner-Fach) und liefert das Ergebnis.
   Die Karte füllt den Bildschirm und passt Text und Bild so an, dass nie
   gescrollt werden muss. */
const QUIZ = (() => {
  const { el, btn, overlay, fitText } = UI;
  const SEC_LABEL = { B: 'Basisfrage', I: 'Binnen', S: 'See', G: 'Segeln' };
  const BOX_LABEL = ['neu/falsch', 'Fach 1', 'Fach 2', 'Fach 3', 'Fach 4', 'Fach 5 ★'];
  const FAST_MS = 15000;

  const pickOne = a => a[Math.floor(Math.random() * a.length)];
  let lastStreak = 0;
  /* Wer aus der aktiven Gruppe reagiert – und was er sagt */
  function reaction(ok) {
    const S = SAVE.s; if (!S) return null;
    const party = S.party.filter(id => S.heroes[id] && S.heroes[id].joined);
    const streak = S.stats.streak;
    let id, line;
    if (!ok) {
      if (party.includes('ryn')) {
        id = 'ryn';
        line = lastStreak >= 5 ? REACTIONS.scoldStreak.replace('{n}', lastStreak) : pickOne(REACTIONS.scold);
      } else {
        id = pickOne(party.filter(x => REACTIONS.comfort[x])); if (!id) return null;
        line = pickOne(REACTIONS.comfort[id]);
      }
    } else {
      const fans = party.filter(x => x !== 'ryn' && REACTIONS.praise[x]);
      if (!fans.length) return null;
      id = pickOne(fans);
      line = streak >= 5 && streak % 5 === 0 ? REACTIONS.praiseStreak.replace('{n}', streak) : pickOne(REACTIONS.praise[id]);
    }
    // eigene Texte des Spielers (gemischt oder ausschließlich)
    const own = S.lines && (ok ? S.lines.pos : S.lines.neg);
    if (own && own.length && (S.lines.mode === 'only' || Math.random() < 0.5)) {
      line = pickOne(own).replace(/\{name\}/g, HEROES[id].name).replace(/\{n\}/g, ok ? streak : lastStreak);
    }
    return {
      pic: REAL.reactionImage(ok),
      node: el('div.react' + (ok ? '.good' : '.bad'), null,
        el('img.pt', { src: SPRITES.portrait(id), alt: '' }),
        el('div', null, el('b', null, HEROES[id].name), el('span', null, line)))
    };
  }

  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function zoom(src) {
    const m = overlay(el('div.zoom', { onclick: () => m.close() }, el('img', { src, alt: '' }), el('small', null, 'Tippen zum Schließen')), { dismiss: true, cls: 'zoom-modal' });
  }
  /* Bildbereich: füllt den freien Platz, Bilder skalieren mit (kleine Grafiken scharf) */
  function media(srcs, opts = {}) {
    if (!srcs || !srcs.length) return null;
    return el('div.quiz-media' + (opts.react ? '.react-media' : ''), null, srcs.map(src => el('div.qm-cell', null, el('img', {
      src, alt: opts.react ? 'Reaktionsbild' : 'Abbildung zur Frage',
      onload: e => { if (e.target.naturalWidth < 240) e.target.style.imageRendering = 'pixelated'; },
      onclick: () => zoom(src)
    }))));
  }
  /* für Kompatibilität (z. B. kleine Ansichten) */
  function imgs(q) { return q.img ? media(q.img) : null; }

  /* Karte anpassen, sobald sie sichtbar ist und bei jeder Größenänderung:
     erst Schrift bis zu einer gut lesbaren Mindestgröße verkleinern; reicht das
     nicht (sehr lange Fragen auf kleinen Handys), werden die Antworten geblättert. */
  const MIN_SCALE = 0.8;
  function autoFit(card) {
    const run = () => {
      const fits = fitText(card, MIN_SCALE);
      if (card._pager) { card._pager.relayout(); return; } // Seiten nach jeder Schriftänderung neu aufteilen
      if (fits) return;
      const ans = card.querySelector('.quiz-answers');
      if (!ans) return;
      const items = [...ans.children];
      card._pager = UI.pager(items, { cls: 'ans-pager' });
      ans.replaceChildren(card._pager);
      ans.classList.add('paged');
      card.classList.add('paged');
      requestAnimationFrame(run);
    };
    card._fit = run;
    requestAnimationFrame(run);
    const ro = new ResizeObserver(run); ro.observe(card);
    return () => ro.disconnect();
  }

  /* opts: {q?, prefer?, context?, joker?, autoClose?, timer?} → Promise<{ok, fast, q, ms}> */
  function ask(opts = {}) {
    return new Promise(resolve => {
      const S = SAVE.s;
      const q = opts.q || SAVE.pick(opts.prefer);
      const order = shuffle([0, 1, 2, 3]);
      const rec = SAVE.rec(q.id);
      const start = performance.now();
      let done = false;
      const timerBar = el('i');
      const ansBtns = order.map((oi, k) => el('button.ans', { onclick: () => choose(k) }, el('b', null, 'ABCD'[k]), el('span', null, q.a[oi])));
      const jokerCount = S.items.kompass || 0;
      const jokerBtn = opts.joker !== false && jokerCount > 0 ? btn(`🧭 Joker (${jokerCount})`, useJoker, 'small ghost') : null;
      const mediaBox = media(q.img);
      const foot = el('div.quiz-foot', null, jokerBtn, el('span.streak', null, S.stats.streak >= 2 ? `🔥 Serie ${S.stats.streak}` : ''));
      const card = el('div.quiz-card', null,
        el('div.quiz-head', null,
          el('span.tag.sec-' + q.s, null, `${SEC_LABEL[q.s]} ${q.n}`),
          el('span.tag.box', null, rec.c + rec.w ? BOX_LABEL[rec.b] : 'neu'),
          opts.context ? el('span.ctx', null, opts.context) : null),
        S.settings.speed && opts.timer !== false ? el('div.quiz-timer', null, timerBar) : null,
        el('div.quiz-q', null, q.q),
        mediaBox,
        el('div.quiz-answers', null, ansBtns),
        foot);
      card.style.setProperty('--qs', S.settings.textSize || 1);
      const m = overlay(card, { cls: 'quiz-modal', top: true });
      const stopFit = autoFit(card);
      let raf;
      if (S.settings.speed && opts.timer !== false) {
        const tick = () => {
          const p = Math.max(0, 1 - (performance.now() - start) / FAST_MS);
          timerBar.style.width = (p * 100) + '%';
          if (p > 0 && !done) raf = requestAnimationFrame(tick);
        };
        tick();
      }
      function useJoker() {
        if (!S.items.kompass) return;
        S.items.kompass--;
        const wrongs = shuffle([0, 1, 2, 3].filter(k => order[k] !== 0)).slice(0, 2);
        for (const k of wrongs) { ansBtns[k].disabled = true; ansBtns[k].classList.add('gone'); }
        jokerBtn.remove();
        SAVE.soon();
      }
      function choose(k) {
        if (done) return; done = true; cancelAnimationFrame(raf);
        const ms = performance.now() - start;
        const ok = order[k] === 0;
        const fast = ok && S.settings.speed && ms < FAST_MS;
        lastStreak = S.stats.streak;
        const res = SAVE.answer(q.id, ok);
        const rightIdx = order.indexOf(0);
        ansBtns.forEach((b, i) => { b.disabled = true; if (i === rightIdx) b.classList.add('right'); });
        if (!ok) ansBtns[k].classList.add('wrong');
        if (card._pager) card._pager.showItem(rightIdx); // geblätterte Antworten: richtige Lösung zeigen
        AUDIO.sfx(ok ? 'correct' : 'wrong');
        const r = reaction(ok);
        // Reaktionsbild (Realmodus) ersetzt den Bildbereich, damit nichts gescrollt werden muss
        if (r && r.pic) {
          const rm = media([r.pic], { react: true });
          if (mediaBox) mediaBox.replaceWith(rm); else card.insertBefore(rm, card.querySelector('.quiz-answers'));
        }
        const cont = btn(ok ? 'Weiter ▸' : 'Verstanden ▸', finish, 'gold');
        foot.replaceWith(el('div.quiz-fb', null,
          el('div.fb-top', null,
            el('div.fb-title.' + (ok ? 'ok' : 'bad'), null, ok ? (fast ? '✔ Richtig – schnell!' : '✔ Richtig!') : `✘ Falsch – richtig ist ${'ABCD'[rightIdx]}`,
              el('small', null, ok ? ` · Fach ${res.before} → ${res.after}` : ' · zurück in Fach 0')),
            cont),
          r ? r.node : null));
        requestAnimationFrame(() => { card._fit(); if (card._pager) card._pager.showItem(rightIdx); });
        cont.focus({ preventScroll: true });
        let auto = null;
        if (ok && opts.autoClose !== false) auto = setTimeout(finish, 1900);
        function finish() { clearTimeout(auto); if (m._closed) return; m._closed = true; stopFit(); m.close(); resolve({ ok, fast, q, ms }); }
      }
    });
  }

  /* Prüfungsfrage: gleiche Karte, aber ohne Rückmeldung bis zum Ende */
  function exam(q, i, total) {
    return new Promise(res => {
      const order = shuffle([0, 1, 2, 3]);
      let sel = -1;
      const next = btn(i + 1 < total ? 'Weiter ▸' : 'Abgeben ▸', () => done({ q, ok: order[sel] === 0, text: q.a[order[sel]] }), 'gold', { disabled: true });
      const btns = order.map((oi, k) => el('button.ans', { onclick: () => { sel = k; btns.forEach((b, j) => b.classList.toggle('sel', j === k)); next.disabled = false; AUDIO.sfx('select'); } }, el('b', null, 'ABCD'[k]), el('span', null, q.a[oi])));
      const card = el('div.quiz-card.exam-card', null,
        el('div.quiz-head', null, el('b.ctx-left', null, `Prüfung · Frage ${i + 1}/${total}`),
          btn('Abbrechen', async () => { if (await UI.confirm('Prüfung abbrechen? Der Fortschritt dieser Prüfung geht verloren.', 'Abbrechen', 'Weiter prüfen')) done(null); }, 'small ghost')),
        UI.bar(i, total, 'xp'),
        el('div.quiz-q', null, q.q),
        media(q.img),
        el('div.quiz-answers', null, btns),
        el('div.quiz-foot.right', null, next));
      card.style.setProperty('--qs', (SAVE.s && SAVE.s.settings.textSize) || 1);
      const m = overlay(card, { cls: 'quiz-modal', top: true });
      const stopFit = autoFit(card);
      function done(v) { stopFit(); m.close(); res(v); }
    });
  }

  /* Detailansicht einer Frage (Katalog, Auswertung, Problemfragen) */
  function detail(q, opts = {}) {
    const r = SAVE.rec(q.id);
    const card = el('div.quiz-card.detail-card', null,
      el('div.quiz-head', null,
        el('span.tag.sec-' + q.s, null, `${SEC_LABEL[q.s]} ${q.n}`),
        el('span.tag.box', null, r.c + r.w ? `${BOX_LABEL[r.b]} · ${r.c}✔ ${r.w}✘` : 'noch nicht beantwortet')),
      el('div.quiz-q', null, q.q),
      media(q.img),
      el('div.quiz-answers', null, q.a.map((a, i) => el('div.ans.static' + (i === 0 ? '.right' : opts.yours === a ? '.wrong' : ''), null,
        el('b', null, i === 0 ? '✔' : opts.yours === a ? '✘' : '·'), el('span', null, a)))),
      el('div.quiz-foot.right', null,
        btn('Üben', async () => { m.close(); await ask({ q, context: 'Einzelfrage', autoClose: false }); if (opts.onpractice) opts.onpractice(); }, 'ghost'),
        btn('Schließen', () => m.close(), 'gold')));
    card.style.setProperty('--qs', (SAVE.s && SAVE.s.settings.textSize) || 1);
    const m = overlay(card, { cls: 'quiz-modal', top: true });
    const stopFit = autoFit(card);
    const close = m.close; m.close = () => { stopFit(); close(); };
    return m;
  }

  return { ask, exam, detail, shuffle, imgs, SEC_LABEL, BOX_LABEL };
})();
