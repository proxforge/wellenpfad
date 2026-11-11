'use strict';
/* Quiz-Karte: Fragt eine amtliche Frage ab, mischt die Antworten, zeigt
   Lernfeedback (richtige Antwort, Leitner-Fach) und liefert das Ergebnis. */
const QUIZ = (() => {
  const { el, btn, overlay } = UI;
  const SEC_LABEL = { B: 'Basisfrage', I: 'Binnen', S: 'See', G: 'Segeln' };
  const BOX_LABEL = ['neu/falsch', 'Fach 1', 'Fach 2', 'Fach 3', 'Fach 4', 'Fach 5 ★'];
  const FAST_MS = 15000;

  const pickOne = a => a[Math.floor(Math.random() * a.length)];
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
    const pic = REAL.reactionImage(ok);
    if (pic) return el('div.react.with-img' + (ok ? '.good' : '.bad'), null,
      el('img.react-img', { src: pic, alt: ok ? 'Richtig' : 'Falsch' }),
      el('div.react-line', null, el('img.pt', { src: SPRITES.portrait(id), alt: '' }), el('div', null, el('b', null, HEROES[id].name), el('span', null, line))));
    return el('div.react' + (ok ? '.good' : '.bad'), null,
      el('img.pt', { src: SPRITES.portrait(id), alt: '' }),
      el('div', null, el('b', null, HEROES[id].name), el('span', null, line)));
  }
  let lastStreak = 0;

  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function imgs(q) {
    if (!q.img) return null;
    const n = q.img.length;
    return el('div.quiz-img', null, q.img.map(src => el('img', {
      src, alt: 'Abbildung zur Frage', loading: 'eager',
      /* Kleine Original-Grafiken (z. B. 12×7 px Schallzeichen) ganzzahlig und scharf vergrößern */
      onload: e => {
        const im = e.target, box = im.parentElement;
        const maxW = Math.min(box && box.clientWidth ? box.clientWidth : 320, 560) / n - 12;
        const f = Math.max(1, Math.min(4, Math.floor(maxW / im.naturalWidth), Math.floor(240 / im.naturalHeight)));
        if (f > 1) { im.style.width = (im.naturalWidth * f) + 'px'; im.style.imageRendering = 'pixelated'; }
      },
      onclick: () => { const m = overlay(el('div.zoom', { onclick: () => m.close() }, el('img', { src, alt: '' }), el('small', null, 'Tippen zum Schließen')), { dismiss: true, cls: 'zoom-modal' }); }
    })));
  }

  /* opts: {q?, prefer?, context?, joker?:bool, feedback?:true} → Promise<{ok, fast, q}> */
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
      const fb = el('div.quiz-fb');
      const card = el('div.quiz-card', null,
        el('div.quiz-head', null,
          el('span.tag.sec-' + q.s, null, `${SEC_LABEL[q.s]} ${q.n}`),
          el('span.tag.box', null, rec.c + rec.w ? BOX_LABEL[rec.b] : 'neu'),
          opts.context ? el('span.ctx', null, opts.context) : null),
        S.settings.speed && opts.timer !== false ? el('div.quiz-timer', null, timerBar) : null,
        el('div.quiz-q', null, q.q),
        imgs(q),
        el('div.quiz-answers', null, ansBtns),
        el('div.quiz-foot', null, jokerBtn, el('span.streak', null, S.stats.streak >= 2 ? `🔥 Lernserie ${S.stats.streak}` : '')),
        fb);
      card.style.fontSize = (S.settings.textSize || 1) + 'em';
      const m = overlay(card, { cls: 'quiz-modal', top: true });
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
        ansBtns.forEach((b, i) => { b.disabled = true; if (order[i] === 0) b.classList.add('right'); });
        if (!ok) ansBtns[k].classList.add('wrong');
        AUDIO.sfx(ok ? 'correct' : 'wrong');
        const boxTxt = ok ? `Fach ${res.before} → ${res.after}` : 'zurück in Fach 0';
        const cont = btn(ok ? 'Weiter ▸' : 'Verstanden ▸', finish, ok ? 'gold' : 'gold');
        fb.replaceChildren(
          el('div.fb-title.' + (ok ? 'ok' : 'bad'), null, ok ? (fast ? '✔ Richtig – blitzschnell!' : '✔ Richtig!') : '✘ Leider falsch'),
          !ok ? el('div.fb-correct', null, el('small', null, 'Richtige Antwort:'), el('div', null, q.a[0])) : null,
          reaction(ok),
          el('div.fb-meta', null, boxTxt), cont);
        fb.classList.add('show');
        cont.focus({ preventScroll: true });
        fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        let auto = null;
        if (ok && opts.autoClose !== false) auto = setTimeout(finish, 1900);
        function finish() { clearTimeout(auto); if (m._closed) return; m._closed = true; m.close(); resolve({ ok, fast, q, ms }); }
      }
    });
  }
  return { ask, shuffle, imgs, SEC_LABEL, BOX_LABEL };
})();
