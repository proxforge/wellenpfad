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
  return { el, $, btn, panel, overlay, toast, dialog, confirm, bar, wait, floatText, banner, shake };
})();
