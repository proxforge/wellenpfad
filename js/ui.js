'use strict';
/* Kleine DOM-Helfer: Elemente bauen, Panel/Overlay, Dialoge, Toasts. */
const UI = (() => {
  const nativeRC = Element.prototype.replaceChildren;
  Element.prototype.replaceChildren = function (...kids) { return nativeRC.apply(this, kids.filter(k => k !== null && k !== undefined && k !== false)); };
  function el(tag, attrs, ...kids) {
    const [t, ...cls] = tag.split('.');
    const e = document.createElement(t || 'div');
    if (cls.length) e.className = cls.join(' ');
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k === 'class') e.className += ' ' + v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k)));
    return e;
  }
  const $ = s => document.querySelector(s);
  function btn(label, fn, cls = '', attrs = {}) {
    return el('button.btn' + (cls ? '.' + cls.split(' ').join('.') : ''), Object.assign({ onclick: e => { AUDIO.sfx('select'); fn(e); } }, attrs), label);
  }
  function panel(...kids) {
    const p = $('#panel'); p.replaceChildren(...kids.flat()); p.scrollTop = 0;
    const g = $('.hud-gold'); if (g && SAVE.s) g.textContent = `${SAVE.s.gold} G`;
    return p;
  }
  function overlay(node, opts = {}) {
    const o = $('#overlay');
    const box = el('div.modal' + (opts.cls ? '.' + opts.cls : ''), null, node);
    const wrap = el('div.modal-wrap' + (opts.top ? '.top' : ''), { onclick: e => { if (e.target === wrap && opts.dismiss) close(); } }, box);
    function close() { wrap.remove(); if (opts.onclose) opts.onclose(); }
    o.append(wrap);
    return { close, box, wrap };
  }
  function toast(msg, ms = 2200) {
    const t = el('div.toast', null, msg);
    $('#toasts').append(t);
    setTimeout(() => t.classList.add('out'), ms);
    setTimeout(() => t.remove(), ms + 500);
  }
  /* Dialogfolge im Erzählstil: [[Sprecher, Text], ...] */
  function dialog(lines) {
    return new Promise(res => {
      let i = 0;
      const nameEl = el('div.dlg-name'), textEl = el('div.dlg-text'), pic = el('img.dlg-pic', { alt: '' });
      const box = el('div.dlg', { onclick: next }, pic, el('div.dlg-body', null, nameEl, textEl), el('div.dlg-more', null, '▼'));
      const m = overlay(box, { cls: 'dlg-modal', top: false });
      function show() {
        const [who, txt] = lines[i];
        const hid = Object.keys(HEROES).find(k => HEROES[k].orig === who || HEROES[k].name === who);
        nameEl.textContent = hid ? HEROES[hid].name : who;
        if (hid) { pic.src = SPRITES.portrait(hid); pic.style.display = ''; } else pic.style.display = 'none';
        textEl.textContent = '';
        let k = 0; clearInterval(box._t);
        box._t = setInterval(() => { textEl.textContent = txt.slice(0, ++k); if (k >= txt.length) clearInterval(box._t); }, 16);
        box._full = () => { clearInterval(box._t); textEl.textContent = txt; };
      }
      function next() {
        if (textEl.textContent.length < lines[i][1].length) { box._full(); return; }
        AUDIO.sfx('select');
        i++; if (i >= lines.length) { m.close(); res(); } else show();
      }
      show();
    });
  }
  function confirm(msg, yes = 'Ja', no = 'Abbrechen') {
    return new Promise(res => {
      const m = overlay(el('div.confirm', null, el('p', null, msg),
        el('div.row', null, btn(no, () => { m.close(); res(false); }, 'ghost'), btn(yes, () => { m.close(); res(true); }, 'gold'))));
    });
  }
  function bar(v, max, cls) {
    const pct = Math.max(0, Math.min(100, max ? v / max * 100 : 0));
    return el('div.bar.' + cls, null, el('i', { style: { width: pct + '%' } }));
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));
  function floatText(x, y, txt, cls) {
    const e = el('div.float.' + (cls || ''), { style: { left: (x / GFX.W * 100) + '%', top: (y / GFX.H * 100) + '%' } }, txt);
    $('#fx-layer').append(e);
    setTimeout(() => e.remove(), 1300);
  }
  function banner(txt, cls = '') {
    const e = el('div.banner.' + cls, null, txt);
    $('#fx-layer').append(e);
    setTimeout(() => e.remove(), 1600);
  }
  function shake(ms = 250) {
    const s = $('#stage'); s.classList.remove('shake'); void s.offsetWidth; s.classList.add('shake');
    setTimeout(() => s.classList.remove('shake'), ms);
  }
  /* ---------- Bausteine für eine Oberfläche ohne Scrollen ---------- */

  /* Bildschirm: Kopfzeile (optional mit Zurück) + Inhalt, der den Platz füllt */
  function view(title, opts, ...body) {
    opts = opts || {};
    const head = el('div.view-head', null,
      opts.back ? el('button.back', { 'aria-label': 'Zurück', onclick: () => { AUDIO.sfx('back'); opts.back(); } }, '◂') : null,
      el('h2', null, title),
      opts.right ? el('div.view-right', null, opts.right) : null);
    return el('div.view' + (opts.cls ? '.' + opts.cls : ''), null, head, opts.sub ? el('p.view-sub', null, opts.sub) : null, el('div.view-body', null, body));
  }

  /* Blättern statt Scrollen: verteilt Elemente auf Seiten, die genau in den
     verfügbaren Platz passen (auch bei Größenänderung). Wischen blättert. */
  function pager(items, opts = {}) {
    const cols = opts.cols || 1;
    const body = el('div.pg-body', { style: { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` } }, items);
    const info = el('span.pg-info');
    const prev = el('button.pg-btn', { 'aria-label': 'Vorherige Seite', onclick: () => go(page - 1) }, '◀');
    const next = el('button.pg-btn', { 'aria-label': 'Nächste Seite', onclick: () => go(page + 1) }, '▶');
    const ctl = el('div.pg-ctl', null, prev, info, next);
    const root = el('div.pager' + (opts.cls ? '.' + opts.cls : ''), null, body, ctl);
    let page = opts.page || 0, pageOf = [], pages = 1;
    function layout() {
      if (!root.isConnected) return;
      items.forEach(it => { it.style.display = ''; });
      ctl.style.display = '';
      const H = body.clientHeight;
      if (!H) return;
      const boxes = items.map(it => [it.offsetTop, it.offsetTop + it.offsetHeight]);
      // passt alles auf eine Seite? Dann ohne Blätter-Leiste
      const totalH = boxes.length ? boxes[boxes.length - 1][1] - boxes[0][0] : 0;
      if (totalH <= H + ctl.offsetHeight + 2) { ctl.style.display = 'none'; pageOf = items.map(() => 0); pages = 1; page = 0; return show(); }
      pageOf = []; let p = 0, top = boxes.length ? boxes[0][0] : 0;
      for (let i = 0; i < items.length; i++) {
        if (boxes[i][1] - top > H + 1 && i > 0 && pageOf.some(x => x === p)) {
          p++;
          let j = i; while (j > 0 && boxes[j - 1][0] === boxes[i][0]) j--; // Zeile nicht zerteilen
          for (let k = j; k < i; k++) pageOf[k] = p;
          top = boxes[j][0];
        }
        pageOf[i] = p;
      }
      pages = p + 1; page = Math.min(page, pages - 1);
      show();
    }
    function show() {
      items.forEach((it, i) => { it.style.display = pageOf[i] === page ? '' : 'none'; });
      info.textContent = `${page + 1} / ${pages}`;
      prev.disabled = page === 0; next.disabled = page >= pages - 1;
      if (opts.onpage) opts.onpage(page);
    }
    function go(p) { if (p < 0 || p >= pages) return; page = p; AUDIO.sfx('select'); show(); }
    let sx = null;
    body.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
    body.addEventListener('touchend', e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) go(page + (dx < 0 ? 1 : -1)); sx = null; }, { passive: true });
    const ro = new ResizeObserver(() => layout());
    ro.observe(body);
    requestAnimationFrame(layout);
    root.relayout = layout;
    root.showItem = i => { if (pageOf[i] !== undefined && pageOf[i] !== page) { page = pageOf[i]; show(); } };
    return root;
  }

  /* Reiter: flache Untergliederung ohne verschachtelte Menüs */
  function tabs(defs, active, onchange) {
    const bar = el('div.tabs', { role: 'tablist' });
    const body = el('div.tab-body');
    function select(id) {
      active = id;
      bar.replaceChildren(...defs.map(d => el('button.tab' + (d.id === id ? '.on' : ''), { role: 'tab', 'aria-selected': d.id === id ? 'true' : 'false', onclick: () => { AUDIO.sfx('select'); select(d.id); } }, d.label)));
      body.replaceChildren(defs.find(d => d.id === id).render());
      if (onchange) onchange(id);
    }
    select(active || defs[0].id);
    return el('div.tabbed', null, bar, body);
  }

  /* Text verkleinern, bis der Inhalt ohne Scrollen in den Behälter passt */
  function fitText(box, min = 0.62) {
    if (!box || !box.isConnected) return;
    let s = 1;
    box.style.fontSize = '';
    const base = parseFloat(getComputedStyle(box).fontSize);
    while (box.scrollHeight > box.clientHeight + 1 && s > min) {
      s -= 0.04;
      box.style.fontSize = (base * s) + 'px';
    }
    return box.scrollHeight <= box.clientHeight + 1;
  }

  return { el, $, btn, panel, overlay, toast, dialog, confirm, bar, wait, floatText, banner, shake, view, pager, tabs, fitText };
})();
