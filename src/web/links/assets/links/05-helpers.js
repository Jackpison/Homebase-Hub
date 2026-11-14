/* ---------- helpers ---------- */
// (1.67.1) The icons (ICONS) are parsed once and copied after that: in edit mode every row has several, and parsing each one
// again made turning edit mode on take about a quarter of a second with 600 links.
let ICON_SET = null;
const iconSet = () => ICON_SET || (ICON_SET = new Set(Object.values(ICONS)));
const ICON_TPL = new Map();
function iconNodes(s) {
  let tp = ICON_TPL.get(s);
  if (!tp) { tp = document.createElement('template'); tp.innerHTML = s; ICON_TPL.set(s, tp); }
  return tp.content.cloneNode(true);
}
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') { if (iconSet().has(v)) el.append(iconNodes(v)); else el.innerHTML = v; }
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
}
function safeUrl(u) {
  u = String(u || '').trim();
  if (!u) return '#';
  if (/^(https?:|mailto:|\/|\.\/|#|icons\/)/i.test(u)) return u;
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return '#';
  return 'https://' + u;
}
// Saved icons are stored as "icons/…" and live in web/hub/media/links (before 1.29.3: next to this page). Only the address shown changes.
const mediaUrl = u => /^icons\//i.test(u) ? '../hub/media/links/' + u : u;
function host(u) { try { return new URL(safeUrl(u), location.href).hostname; } catch { return ''; } }
const uid = () => Math.random().toString(36).slice(2, 9);
const isWeb = u => /^https?:/i.test(u || '');
const isHex = HUB.isHex;
// Full name on hover, only for names cut off with "..."
const tip = document.body.appendChild(document.createElement('div'));
tip.className = 'tip'; tip.setAttribute('aria-hidden', 'true');   // repeats the link's own name, which screen readers already read
let tipFor = null, tipTimer = 0;
function hideTip() {
  clearTimeout(tipTimer); tip.classList.remove('show');
  if (tipFor && tipFor.dataset.tt != null) { tipFor.title = tipFor.dataset.tt; delete tipFor.dataset.tt; }
  tipFor = null;
}
document.addEventListener('mouseover', e => {
  const tg = /** @type {Element} */ (e.target), el = /** @type {HTMLAnchorElement | null} */ (tg.closest && tg.closest('#grid a.main, #grid .cat-head h2, #tabs a.tab'));
  if (el === tipFor) return;
  hideTip();
  if (!el || document.body.classList.contains('dragging')) return;
  const txt = el.matches('a.main') ? el.querySelector('.t') : el.matches('a.tab') ? el.querySelector('span') : el;
  if (!txt || txt.scrollWidth <= txt.clientWidth + 1) return; // fits: nothing to show
  tipFor = el;
  if (el.title) { el.dataset.tt = el.title; el.removeAttribute('title'); } // no second, native tooltip
  tipTimer = setTimeout(() => {
    tip.textContent = txt.textContent;
    if (el.matches('a.main')) tip.append(h('small', {}, host(el.href).replace(/^www\./, '')));
    const r = txt.getBoundingClientRect();
    tip.style.left = '0px'; tip.style.top = '0px'; tip.classList.add('show');
    const w = tip.offsetWidth, ht = tip.offsetHeight;
    const left = Math.max(12, Math.min(r.left - 10, innerWidth - w - 12));
    const top = r.bottom + 6 + ht > innerHeight - 8 ? r.top - ht - 6 : r.bottom + 6;
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  }, 220);
});
document.addEventListener('mouseout', e => { if (tipFor && !tipFor.contains(e.relatedTarget)) hideTip(); });
addEventListener('scroll', hideTip, { passive: true });
document.addEventListener('pointerdown', hideTip);

const toast = (msg, bad, sticky) => { if (window.HUB) HUB.toast(msg, bad, sticky); };   // the site's one message box (shell.js)
// (1.61.9) after a delete: the message offers Undo for 7 seconds, which puts it back where it was and saves again
const undoable = (msg, undo) => { if (window.HUB) HUB.undo(msg, undo); };
const RIBBON = '<path d="M3 0h14a2 2 0 0 1 2 2v19.2a.6.6 0 0 1-.95.49L10 16.5l-8.05 5.19A.6.6 0 0 1 1 21.2V2a2 2 0 0 1 2-2z"/>';
const ribbon = outline => h('span', { 'aria-hidden': 'true', html:
  `<svg viewBox="0 0 20 22" ${outline ? 'fill="none" stroke="currentColor" stroke-width="2"' : 'fill="currentColor"'}>${RIBBON}</svg>` }).firstChild;
const ICONS = {
  up: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 10l4-4 4 4"/></svg>',
  down: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 6l4 4 4-4"/></svg>',
  left: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M10 4L6 8l4 4"/></svg>',
  right: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 4l4 4-4 4"/></svg>',
  edit: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10.5 2.5l3 3L6 13H3v-3z"/></svg>',
  del: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
  lock: '<svg class="lock" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M12 2.4c2.3 2 5 3 8.1 3v6.2c0 4.8-3.2 8.5-8.1 10.4-4.9-1.9-8.1-5.6-8.1-10.4V5.4c3.1 0 5.8-1 8.1-3z" fill="#4a9bff"/><path d="M12 2.4c2.3 2 5 3 8.1 3v6.2c0 4.8-3.2 8.5-8.1 10.4z" fill="#1c6fe8" opacity=".35"/><path d="M8.3 12.2l2.6 2.7 4.9-5.4" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',   // a private tab: a blue shield with a check (1.79.3)
  safe: '<svg class="lock" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M12 2.4c2.3 2 5 3 8.1 3v6.2c0 4.8-3.2 8.5-8.1 10.4-4.9-1.9-8.1-5.6-8.1-10.4V5.4c3.1 0 5.8-1 8.1-3z" fill="#2fc983"/><path d="M12 2.4c2.3 2 5 3 8.1 3v6.2c0 4.8-3.2 8.5-8.1 10.4z" fill="#13935a" opacity=".35"/><path d="M8.3 12.2l2.6 2.7 4.9-5.4" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',   // an encrypted tab: the same shield, green (1.79.3)
  lgrip: '<svg viewBox="0 0 9 14" fill="currentColor"><circle cx="2" cy="2" r="1.3"/><circle cx="7" cy="2" r="1.3"/><circle cx="2" cy="7" r="1.3"/><circle cx="7" cy="7" r="1.3"/><circle cx="2" cy="12" r="1.3"/><circle cx="7" cy="12" r="1.3"/></svg>',
  grip: '<svg viewBox="0 0 12 16" fill="currentColor"><circle cx="3.5" cy="3" r="1.4"/><circle cx="8.5" cy="3" r="1.4"/><circle cx="3.5" cy="8" r="1.4"/><circle cx="8.5" cy="8" r="1.4"/><circle cx="3.5" cy="13" r="1.4"/><circle cx="8.5" cy="13" r="1.4"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>',
};
const ib = (icon, label, fn, cls, disabled) => h('button', { class: 'ib ' + (cls || ''), type: 'button', title: cls === 'del' ? label + ' (hold)' : label, 'aria-label': label, html: ICONS[icon], onclick: fn, disabled, 'data-hold': cls === 'del' ? '' : null });   // (1.65.0) a delete button is held, not clicked
const move = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return false; [arr[i], arr[j]] = [arr[j], arr[i]]; return true; };
const curTab = () => S.data.tabs.find(t => t.id === S.tab) || S.data.tabs[0] || { id: '', title: '', categories: [] };
const allCats = () => S.data.tabs.flatMap(t => t.categories);
const allLinks = () => allCats().flatMap(c => c.links).filter(l => !l.divider);
const linkCount = c => c.links.filter(l => !l.divider).length;

// Column helpers: each category stores col (0..3); order inside a column = order in the array
function colHeights(t) {
  const hgt = Array(COLS).fill(0);
  t.categories.forEach(c => { if (c.col != null) hgt[c.col] += c.links.length + 3; });
  return hgt;
}
const shortestCol = t => { const hg = colHeights(t); return hg.indexOf(Math.min(...hg)); };
function placeInCol(t, cat, col, beforeId) {
  const cats = t.categories;
  const from = cats.indexOf(cat); if (from >= 0) cats.splice(from, 1);
  cat.col = col;
  let at = beforeId ? cats.findIndex(c => c.id === beforeId) : -1;
  if (at < 0) { at = cats.length; for (let i = cats.length - 1; i >= 0; i--) if (cats[i].col === col) { at = i + 1; break; } }
  cats.splice(at, 0, cat);
}
function moveWithinCol(t, cat, d) {
  const same = t.categories.filter(c => c.col === cat.col);
  const i = same.indexOf(cat), j = i + d;
  if (j < 0 || j >= same.length) return false;
  const cats = t.categories, a = cats.indexOf(cat), b = cats.indexOf(same[j]);
  [cats[a], cats[b]] = [cats[b], cats[a]];
  return true;
}

function normalize(d, allowEmpty) {
  d = d && typeof d === 'object' ? d : {};
  // settings must be a plain object (older saves could store an empty list, which silently drops anything set on it)
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  const settings = isObj(d.settings) ? d.settings : {};
  for (const k of ['dark', 'light', 'sizes']) if (k in settings && !isObj(settings[k])) delete settings[k];
  if (!Array.isArray(d.tabs)) d = { tabs: [{ id: 'main', title: 'Bookmarks', categories: Array.isArray(d.categories) ? d.categories : [] }] };
  d = { settings, tabs: d.tabs };
  d.tabs.forEach(t => {
    t.id ||= uid(); t.title ||= 'Untitled';
    t.categories = Array.isArray(t.categories) ? t.categories : [];
    t.categories.forEach(c => {
      c.id ||= uid(); c.links = Array.isArray(c.links) ? c.links : [];
      if (c.col != null) c.col = Math.min(COLS - 1, Math.max(0, parseInt(c.col, 10) || 0));
    });
    // give old categories a column, balancing column heights
    t.categories.forEach(c => { if (c.col == null) c.col = shortestCol(t); });
  });
  if (!d.tabs.length && !allowEmpty) d.tabs.push({ id: uid(), title: 'Bookmarks', categories: [] });
  return d;
}

