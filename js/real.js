'use strict';
/* Realmodus: keine Pixelgrafik. Eigene Figuren (Foto + Name) und eigene
   Reaktionsbilder für richtige/falsche Antworten, alles lokal im Browser.
   Bilder liegen getrennt vom Spielstand (wellenpfad.media<slot>), damit
   das häufige Speichern des Spielstands schnell bleibt. */
const REAL = (() => {
  const KEY = 'wellenpfad.media';
  const MAX_REACT = 8;
  let media = { photos: {}, pos: [], neg: [] }, loadedSlot = null;

  const on = () => !!(SAVE.s && SAVE.s.settings.realMode);

  function load(slot) {
    if (loadedSlot === slot) return;
    loadedSlot = slot;
    media = { photos: {}, pos: [], neg: [] };
    try { const raw = localStorage.getItem(KEY + slot); if (raw) Object.assign(media, JSON.parse(raw)); } catch (e) { /* kein Speicher */ }
  }
  function save() {
    try { localStorage.setItem(KEY + SAVE.slot, JSON.stringify(media)); return true; }
    catch (e) { UI.toast('Speicher voll – bitte einige Bilder löschen.'); return false; }
  }
  function removeSlot(n) { try { localStorage.removeItem(KEY + n); } catch (e) { /* egal */ } if (loadedSlot === n) loadedSlot = null; }

  /* Bild laden, verkleinern und als JPEG ablegen (Fotos quadratisch zugeschnitten) */
  function processFile(file, square) {
    return new Promise((res, rej) => {
      if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) return rej(new Error('Bitte ein JPG- oder PNG-Bild wählen.'));
      const r = new FileReader();
      r.onerror = () => rej(new Error('Datei konnte nicht gelesen werden.'));
      r.onload = () => {
        const im = new Image();
        im.onerror = () => rej(new Error('Das Bild konnte nicht geöffnet werden.'));
        im.onload = () => {
          const w = im.naturalWidth, h = im.naturalHeight;
          let sx = 0, sy = 0, sw = w, sh = h, tw, th;
          if (square) { const s = Math.min(w, h); sx = (w - s) / 2; sy = (h - s) / 3; sw = sh = s; tw = th = 256; }
          else { const f = Math.min(1, 520 / Math.max(w, h)); tw = Math.round(w * f); th = Math.round(h * f); }
          const c = document.createElement('canvas'); c.width = tw; c.height = th;
          const g = c.getContext('2d');
          g.fillStyle = '#16223f'; g.fillRect(0, 0, tw, th);
          g.imageSmoothingQuality = 'high';
          g.drawImage(im, sx, sy, sw, sh, 0, 0, tw, th);
          res(c.toDataURL('image/jpeg', 0.84));
        };
        im.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }
  function pickFile(square, multiple) {
    return new Promise(res => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/png,image/jpeg,image/webp'; inp.multiple = !!multiple;
      inp.onchange = async () => {
        const out = [];
        for (const f of inp.files) { try { out.push(await processFile(f, square)); } catch (e) { UI.toast(e.message); } }
        res(out);
      };
      inp.click();
    });
  }

  /* Avatar: eigenes Foto oder Monogramm (keine Pixelgrafik) */
  const PALETTE = ['#2f5a9a', '#3f8a4a', '#c42532', '#c9a24a', '#6a3a8a', '#2a8a8a', '#d8742a'];
  function initials(id) {
    const name = HEROES[id].name.trim();
    const parts = name.split(/\s+/);
    const txt = (parts[0][0] + (parts[1] ? parts[1][0] : (parts[0][1] || ''))).toUpperCase();
    const col = PALETTE[HERO_ORDER.indexOf(id) % PALETTE.length];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${col}"/><text x="32" y="41" font-family="Georgia,serif" font-size="26" fill="#fff" text-anchor="middle">${txt.replace(/[<&>"]/g, '')}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  function avatar(id) { return media.photos[id] || initials(id); }

  /* ---------- Bühne (ersetzt die Pixel-Szene) ---------- */
  const layer = () => document.getElementById('real-layer');
  function stage(title) {
    const L = layer(); if (!L) return;
    document.getElementById('stage').classList.toggle('real', on());
    document.body.classList.toggle('real-mode', on());
    if (!on()) { L.replaceChildren(); return; }
    const { el } = UI;
    L.replaceChildren(el('div.rs-title', null, title || ''),
      el('div.rs-crew', null, SAVE.s.party.map(id => el('figure.rs-hero', null, el('img', { src: avatar(id), alt: '' }), el('figcaption', null, HEROES[id].name)))));
  }
  const MON_ICON = { aal: '🐍', hecht: '🐟', krebs: '🦀', nixe: '🧜', krake: '🐙', golem: '🪵', rochen: '🦈', qualle: '🫧', welskoenig: '🐋', hydra: '🐉', leviathan: '🐲' };
  function battle(B) {
    const L = layer(); if (!L || !on() || !B) return;
    document.getElementById('stage').classList.add('real'); document.body.classList.add('real-mode');
    const { el } = UI;
    L.replaceChildren(el('div.rb-heroes', null, B.heroes.map(h => el('figure.rb-hero' + (B.active === h ? '.active' : '') + (h.ko ? '.ko' : '') + (h.flash > 0.3 ? '.hit' : ''), null,
      el('img', { src: avatar(h.id), alt: '' }), el('figcaption', null, HEROES[h.id].name.split(' ')[0]), UI.bar(h.hp, h.maxhp, 'hp')))));
  }

  /* ---------- Reaktionsbilder ---------- */
  function reactionImage(ok) {
    if (!on()) return null;
    const list = ok ? media.pos : media.neg;
    if (!list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  /* ---------- Einrichtungs-Bildschirm ---------- */
  function setupScreen(back) {
    const { el, btn, panel, toast } = UI;
    const joined = HERO_ORDER.filter(id => SAVE.s.heroes[id].joined);
    const heroRows = joined.map(id => {
      const nameInp = el('input.search', { id: 'real-name-' + id, type: 'text', maxlength: 24, value: HEROES[id].name, autocomplete: 'off' });
      nameInp.addEventListener('change', () => { SAVE.rename(id, nameInp.value); toast(`Name gespeichert: ${HEROES[id].name}`); });
      return el('div.real-hero', null,
        el('img.real-photo', { src: avatar(id), alt: '' }),
        el('div.real-hero-info', null, el('small.muted', null, `${HEROES[id].title} · ${TYPES[HEROES[id].weapons[0]].n}`), nameInp,
          el('div.row', null,
            btn('📷 Foto wählen', async () => { const [img] = await pickFile(true, false); if (!img) return; media.photos[id] = img; if (save()) toast('Foto gespeichert.'); setupScreen(back); }, 'small'),
            media.photos[id] ? btn('Foto entfernen', () => { delete media.photos[id]; save(); setupScreen(back); }, 'small ghost') : null)));
    });
    const gallery = (key, label, hint) => el('section.real-react', null,
      el('h3', null, label, el('small', null, ` (${media[key].length}/${MAX_REACT})`)),
      el('p.small.muted', null, hint),
      el('div.real-thumbs', null, media[key].map((src, i) => el('div.real-thumb', null, el('img', { src, alt: '' }),
        el('button.real-del', { 'aria-label': 'Bild löschen', onclick: () => { media[key].splice(i, 1); save(); setupScreen(back); } }, '✕'))),
        media[key].length < MAX_REACT ? el('button.real-add', { onclick: async () => {
          const imgs = await pickFile(false, true);
          for (const im of imgs) if (media[key].length < MAX_REACT) media[key].push(im);
          if (imgs.length && save()) toast(`${imgs.length} Bild(er) hinzugefügt.`);
          setupScreen(back);
        } }, '+ Bilder') : null));
    panel(el('div.phead', null, el('h2', null, '📷 Realmodus einrichten'),
      el('p.sub', null, 'Erstelle deine Crew mit eigenen Fotos und Namen und lade Bilder hoch, die bei richtigen und falschen Antworten erscheinen. Alles bleibt nur in diesem Browser.')),
      el('label.opt', null, el('input', { type: 'checkbox', id: 'real-toggle', checked: on(), onchange: e => { SAVE.s.settings.realMode = e.target.checked; SAVE.persist(); SAVE.applyNames(); toast(e.target.checked ? 'Realmodus an – keine Pixelgrafik.' : 'Realmodus aus – Pixelgrafik aktiv.'); setupScreen(back); } }),
        el('span', null, 'Realmodus aktiv', el('small', null, 'Fotos statt Pixelfiguren, ruhige Bühne statt Pixel-Szene'))),
      el('h3', null, 'Deine Crew'), el('div.real-heroes', null, heroRows),
      joined.length < HERO_ORDER.length ? el('p.small.muted', null, `Weitere ${HERO_ORDER.length - joined.length} Crew-Plätze schalten sich im Spielverlauf frei.`) : null,
      gallery('pos', '👍 Bilder bei richtigen Antworten', 'Eins davon erscheint zufällig, wenn du richtig antwortest.'),
      gallery('neg', '👎 Bilder bei falschen Antworten', 'Eins davon erscheint zufällig, wenn du falsch antwortest.'),
      el('h3', null, '💬 Eigene Reaktionstexte'),
      UI.btn('Texte für richtige & falsche Antworten bearbeiten', () => textScreen(() => setupScreen(back)), 'wide'),
      el('p.fine', null, 'Bilder werden verkleinert (Fotos 256 × 256 Pixel, Reaktionsbilder max. 520 Pixel) und nicht in den Spielstand-Export übernommen.'),
      btn('◂ Zurück', back, 'ghost wide'));
    stage('Realmodus');
  }

  /* ---------- Eigene Reaktionstexte (gelten auch ohne Realmodus) ---------- */
  const MAX_LINES = 30, MAX_LEN = 160;
  function textScreen(back) {
    const { el, btn, panel, toast } = UI;
    const L = SAVE.s.lines || { pos: [], neg: [], mode: 'mix' };
    const area = (id, list, ph) => el('textarea.lines', { id, rows: 6, placeholder: ph }, list.join('\n'));
    const pos = area('lines-pos', L.pos, 'Super, {name}!\nGenau so steht es im Katalog.\nWeiter so – {n} richtige in Folge!');
    const neg = area('lines-neg', L.neg, 'Das war nichts – lies die Lösung genau.\nNochmal üben!');
    const mode = el('select', { id: 'lines-mode' },
      el('option', { value: 'mix', selected: L.mode !== 'only' }, 'Gemischt mit den Crew-Sprüchen'),
      el('option', { value: 'only', selected: L.mode === 'only' }, 'Nur meine eigenen Texte'));
    const parse = ta => ta.value.split('\n').map(s => s.replace(/\s+/g, ' ').trim().slice(0, MAX_LEN)).filter(Boolean).slice(0, MAX_LINES);
    panel(el('div.phead', null, el('h2', null, '💬 Eigene Reaktionstexte'),
      el('p.sub', null, 'Eine Zeile = ein Spruch. Bei richtigen Antworten spricht ein Crew-Mitglied deinen Text, bei falschen der Kapitän (oder wer gerade an Bord ist).')),
      el('p.small.muted', null, 'Platzhalter: {name} = Name des Sprechers, {n} = aktuelle bzw. gerade gerissene Serie. Bis zu 30 Zeilen mit je 160 Zeichen.'),
      el('h3', null, '👍 Bei richtigen Antworten'), pos,
      el('h3', null, '👎 Bei falschen Antworten'), neg,
      el('label.opt', null, el('span', null, 'Verwendung'), mode),
      el('div.row', null,
        btn('Abbrechen', back, 'ghost'),
        btn('✔ Speichern', () => {
          SAVE.s.lines = { pos: parse(pos), neg: parse(neg), mode: mode.value };
          SAVE.persist();
          toast(`Gespeichert: ${SAVE.s.lines.pos.length} positive, ${SAVE.s.lines.neg.length} negative Texte.`);
          back();
        }, 'gold')));
  }

  return { on, load, removeSlot, avatar, stage, battle, reactionImage, setupScreen, textScreen, MON_ICON };
})();
