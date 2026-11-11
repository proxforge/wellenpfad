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

  /* ---------- Reiter „Realmodus“: Schalter + Fotos & Namen der Crew ---------- */
  function realTab(refresh) {
    const { el, btn, toast, pager } = UI;
    const joined = HERO_ORDER.filter(id => SAVE.s.heroes[id].joined);
    const toggle = el('label.opt', null,
      el('input', { type: 'checkbox', id: 'real-toggle', checked: on(), onchange: e => { SAVE.s.settings.realMode = e.target.checked; SAVE.persist(); SAVE.applyNames(); toast(e.target.checked ? 'Realmodus an – keine Pixelgrafik.' : 'Realmodus aus – Pixelgrafik aktiv.'); stage(on() ? 'Realmodus' : null); refresh(); } }),
      el('span', null, 'Realmodus aktiv', el('small', null, 'Eigene Fotos statt Pixelfiguren, ruhige Bühne statt Pixel-Szene')));
    const rows = joined.map(id => {
      const nameInp = el('input.search', { id: 'real-name-' + id, type: 'text', maxlength: 24, value: HEROES[id].name, autocomplete: 'off', 'aria-label': `Name ${HEROES[id].title}` });
      nameInp.addEventListener('change', () => { SAVE.rename(id, nameInp.value); toast(`Name gespeichert: ${HEROES[id].name}`); });
      return el('div.real-hero', null,
        el('img.real-photo', { src: avatar(id), alt: '' }),
        el('div.real-hero-info', null, nameInp,
          el('div.row', null,
            btn('📷 Foto', async () => { const [img] = await pickFile(true, false); if (!img) return; media.photos[id] = img; if (save()) toast('Foto gespeichert.'); refresh(); }, 'small'),
            media.photos[id] ? btn('Entfernen', () => { delete media.photos[id]; save(); refresh(); }, 'small ghost') : null)));
    });
    return el('div.tabcol', null, toggle, pager(rows, { cols: document.getElementById('panel').clientWidth > 620 ? 2 : 1 }));
  }

  /* ---------- Reiter „Reaktionen“: Bilder & Texte für richtig / falsch ---------- */
  const MAX_LINES = 30, MAX_LEN = 160;
  let reactKind = 'pos';
  function reactTab(refresh) {
    const { el, btn, toast } = UI;
    const L = SAVE.s.lines || { pos: [], neg: [], mode: 'mix' };
    const kind = reactKind, list = media[kind];
    const seg = el('div.seg', null, [['pos', `👍 Richtig (${media.pos.length} Bilder)`], ['neg', `👎 Falsch (${media.neg.length} Bilder)`]].map(([k, l]) => el('button' + (k === kind ? '.on' : ''), { onclick: () => { reactKind = k; refresh(); } }, l)));
    const thumbs = el('div.real-thumbs', null, list.map((src, i) => el('div.real-thumb', null, el('img', { src, alt: '' }),
      el('button.real-del', { 'aria-label': 'Bild löschen', onclick: () => { list.splice(i, 1); save(); refresh(); } }, '✕'))),
      list.length < MAX_REACT ? el('button.real-add', { 'aria-label': 'Bilder hinzufügen', onclick: async () => {
        const imgs = await pickFile(false, true);
        for (const im of imgs) if (list.length < MAX_REACT) list.push(im);
        if (imgs.length && save()) toast(`${imgs.length} Bild(er) hinzugefügt.`);
        refresh();
      } }, '+ Bild') : null);
    const area = el('textarea.lines', { id: 'lines-' + kind, placeholder: (kind === 'pos' ? 'Eigene Sprüche, eine Zeile pro Spruch, z. B.\nSuper, {name}!\n{n} richtige in Folge!' : 'Eigene Sprüche, eine Zeile pro Spruch, z. B.\nDas war nichts – lies die Lösung genau.') + '\n({name} = Sprecher, {n} = Serie)', 'aria-label': 'Eigene Sprüche, eine Zeile pro Spruch' }, (L[kind] || []).join('\n'));
    const mode = el('select', { id: 'lines-mode', 'aria-label': 'Verwendung der eigenen Sprüche' },
      el('option', { value: 'mix', selected: L.mode !== 'only' }, 'Gemischt mit Crew-Sprüchen'),
      el('option', { value: 'only', selected: L.mode === 'only' }, 'Nur eigene Sprüche'));
    const parse = ta => ta.value.split('\n').map(s => s.replace(/\s+/g, ' ').trim().slice(0, MAX_LEN)).filter(Boolean).slice(0, MAX_LINES);
    thumbs.title = `Bilder (${list.length}/${MAX_REACT}) – erscheinen im Realmodus zufällig bei ${kind === 'pos' ? 'richtigen' : 'falschen'} Antworten`;
    area.title = 'Eine Zeile pro Spruch · {name} = Sprecher, {n} = Serie';
    return el('div.tabcol.react-tab', null, seg,
      thumbs,
      area,
      el('div.row', null, mode, btn('✔ Sprüche speichern', () => {
        const cur = SAVE.s.lines || { pos: [], neg: [], mode: 'mix' };
        cur[kind] = parse(area); cur.mode = mode.value; SAVE.s.lines = cur; SAVE.persist();
        toast(`${cur[kind].length} Sprüche gespeichert.`);
      }, 'gold small')));
  }

  return { on, load, removeSlot, avatar, stage, battle, reactionImage, realTab, reactTab, MON_ICON };
})();
