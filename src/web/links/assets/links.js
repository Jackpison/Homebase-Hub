/*! Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
(() => {
const API = 'api.php';
const MAX_TABS = 6, COLS = 4;
const DEFAULT_COLORS = { dark: { bg: '#1a1a1a', accent: '#d9a85b' }, light: { bg: '#f4f4f5', accent: '#a5701c' } };
// ribbon and the 4 column colors follow the accent until they're set on their own
// [key, label, min, max, default] in px
const SIZE_KEYS = [['tab', 'Tabs', 14, 32, 20], ['cat', 'Categories', 11, 22, 14], ['link', 'Links', 12, 22, 15]];
function sizesFor(s) {
  const out = {}, old = parseInt(s && s.fontSize, 10); // "fontSize" came from version 5/6
  const legacy = old >= 12 && old <= 20 ? { tab: Math.round(old * 1.35), cat: Math.round(old * .93), link: old } : null;
  for (const [k, , min, max, def] of SIZE_KEYS) {
    const v = parseInt(s && s.sizes && s.sizes[k], 10);
    out[k] = v >= min && v <= max ? v : legacy ? Math.min(max, Math.max(min, legacy[k])) : def;
  }
  return out;
}
const COLOR_KEYS = [['bg', 'Background'], ['accent', 'Accent (Buttons)'], ['ribbon', 'Tab Ribbon'],
  ['c0', 'Column 1'], ['c1', 'Column 2'], ['c2', 'Column 3'], ['c3', 'Column 4']];
const S = { data: { tabs: [], settings: {} }, auth: false, setup: false, locked: false, rev: '', editing: false, q: '', tab: null };
const $ = s => document.querySelector(s);
const root = document.documentElement;

/* ---------- helpers ---------- */
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
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
const isHex = v => /^#[0-9a-f]{6}$/i.test(v || '');
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
  const el = e.target.closest && e.target.closest('#grid a.main, #grid .cat-head h2, #tabs a.tab');
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

let toastT;
function toast(msg, bad, sticky) {
  const t = $('#toast'); t.textContent = msg; t.className = 'toast show' + (bad ? ' bad' : '');
  clearTimeout(toastT); if (!sticky) toastT = setTimeout(() => t.className = 'toast', bad ? 4500 : 1900);
}
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
  lock: '<svg class="lock" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="#C98F00" stroke-width="2.4" stroke-linecap="round"/><rect x="4.5" y="10.5" width="15" height="10.5" rx="3" fill="#F7B500"/><rect x="4.5" y="10.5" width="15" height="3.2" rx="1.6" fill="#FFD25A" opacity=".55"/><circle cx="12" cy="15.2" r="1.7" fill="#5A3B00"/><rect x="11.2" y="15.9" width="1.6" height="3" rx=".8" fill="#5A3B00"/></svg>',   // a private tab
  safe: '<svg class="lock" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="#13935A" stroke-width="2.4" stroke-linecap="round"/><rect x="4.5" y="10.5" width="15" height="10.5" rx="3" fill="#25C07D"/><rect x="4.5" y="10.5" width="15" height="3.2" rx="1.6" fill="#6EE0AC" opacity=".5"/><path d="M8.9 15.9l2.3 2.3 4-4.4" fill="none" stroke="#073D26" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',   // an encrypted tab
  lgrip: '<svg viewBox="0 0 9 14" fill="currentColor"><circle cx="2" cy="2" r="1.3"/><circle cx="7" cy="2" r="1.3"/><circle cx="2" cy="7" r="1.3"/><circle cx="7" cy="7" r="1.3"/><circle cx="2" cy="12" r="1.3"/><circle cx="7" cy="12" r="1.3"/></svg>',
  grip: '<svg viewBox="0 0 12 16" fill="currentColor"><circle cx="3.5" cy="3" r="1.4"/><circle cx="8.5" cy="3" r="1.4"/><circle cx="3.5" cy="8" r="1.4"/><circle cx="8.5" cy="8" r="1.4"/><circle cx="3.5" cy="13" r="1.4"/><circle cx="8.5" cy="13" r="1.4"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>',
};
const ib = (icon, label, fn, cls, disabled) => h('button', { class: 'ib ' + (cls || ''), type: 'button', title: label, 'aria-label': label, html: ICONS[icon], onclick: fn, disabled });
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

/* ---------- theme & look ---------- */
const mode = () => root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
function lum(hex) {
  const n = parseInt(hex.slice(1), 16), ch = [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
  return .2126 * ch[0] + .7152 * ch[1] + .0722 * ch[2];
}
// The accent a page really shows: with the shared look on, it is the site accent from Settings.
function siteAccent(m) {
  if (!root.hasAttribute('data-ix-look')) return DEFAULT_COLORS[m].accent;
  if (m === 'light') return '#a5701c';
  const v = getComputedStyle(root).getPropertyValue('--ix-accent').trim();
  return isHex(v) ? v : DEFAULT_COLORS[m].accent;
}
const COL_KEYS = ['ribbon', 'c0', 'c1', 'c2', 'c3'];
function colorsFor(m, s = S.data.settings) {
  const c = { ...DEFAULT_COLORS[m] }, o = (s && s[m]) || {};
  if (isHex(o.bg)) c.bg = o.bg;
  c.accent = isHex(o.accent) ? o.accent : siteAccent(m);
  for (const k of COL_KEYS) c[k] = isHex(o[k]) ? o[k] : k === 'ribbon' && m === 'light' && root.hasAttribute('data-ix-look') ? '#c99400' : c.accent;
  return c;
}
// Only what the owner set (plus background and accent) is written as a variable; the rest follows the accent through the style sheet.
function lookVars(m, s) {
  const c = colorsFor(m, s), o = (s && s[m]) || {}, v = { bg: c.bg, accent: c.accent };
  for (const k of COL_KEYS) if (isHex(o[k])) v[k] = o[k];
  return v;
}
function setThemeBtn() {
  const tb = $('#themeBtn'), m = mode();
  tb.innerHTML = m === 'dark' ? ICONS.sun : ICONS.moon;
  tb.title = m === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  tb.setAttribute('aria-label', tb.title);
}
function applyLook(s = S.data.settings) {
  const m = mode(), c = colorsFor(m, s);
  const lv = lookVars(m, s);
  for (const [k] of COLOR_KEYS) { if (k in lv) root.style.setProperty('--' + k, lv[k]); else root.style.removeProperty('--' + k); }
  const z = sizesFor(s); for (const k in z) root.style.setProperty('--fs-' + k, z[k] + 'px');
  root.style.setProperty('--on-accent', lum(c.accent) > .4 ? '#1a1a1a' : '#ffffff');
  document.title = (s && s.title) || 'Bookmarks';
  // the tab icon is the site logo (set by the bar); Links does not change it
  setThemeBtn();
  try {
    localStorage.setItem('bm-look', JSON.stringify({ dark: lookVars('dark', s), light: lookVars('light', s),
      title: (s && s.title) || '', sizes: sizesFor(s) }));
  } catch {}
}
$('#themeBtn').onclick = () => {
  const next = mode() === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  try { localStorage.setItem('bm-theme', next); } catch {}
  applyLook();
};

/* ---------- API ---------- */
const HF=(u,o)=>window.HUB?HUB.fetch(u,o):fetch(u,o);   // the site's fetch: longer timeout and a quiet retry on slow hosts
/* ---------- encrypted tabs ----------
   An encrypted tab is stored as "enc1:" + base64(iv + AES-256-GCM ciphertext) of its categories (links, notes, icons), made here in the
   browser. The key is random; the server only keeps it wrapped with a key made from your encryption passphrase (PBKDF2-SHA256, 600,000 rounds),
   so the server, its earlier versions and backup files cannot read the tab. The open key lives in this page's memory, and (so a reload
   doesn't ask again) in this browser's IndexedDB under a device key that can't be read out; logging out or Lock deletes it. */
const V = window.HubVault, CAN_ENC = V.ok();   // the shared encryption (shell.js, section 14)
const KEEPK = 'links-keep';   // "keep unlocked on this device": on unless turned off in the unlock box
const keepOn = () => { try { return localStorage.getItem(KEEPK) !== '0'; } catch { return true; } };
const setKeep = on => { try { on ? localStorage.removeItem(KEEPK) : localStorage.setItem(KEEPK, '0'); } catch {} };
let KEY = null;
const b64 = V.b64;
const vault = () => (S.data.settings && S.data.settings.vault && S.data.settings.vault.wrap) ? S.data.settings.vault : null;
const wrapKey = (raw, pass) => V.wrap(raw, pass, true);
const unwrapKey = V.unwrap;   // the raw key, or null when the password (or the recovery key) doesn't fit
const useKey = raw => V.useKey(raw);
const seal = text => V.seal(KEY, text);
const unseal = s => V.unseal(KEY, s);
// "Keep unlocked on this device": the same IndexedDB Info uses (its own record), deleted when you log out or press Lock.
const devSave = raw => V.devSave('links', raw);
const devLoad = () => V.devLoad('links');
const devClear = () => V.devForget('links');
// What the server sent: tabs with "enc" become locked tabs (marked at once, so the page can draw; their text is opened afterwards).
function markEnc() {
  for (const t of S.data.tabs) {
    if (typeof t.enc !== 'string') continue;
    t.encrypted = true; t._blob = t.enc; delete t.enc; t.private = true; t.categories = []; t.locked = true; t.bad = false;
  }
  return !!(S.auth && S.data.tabs.some(t => t.encrypted));
}
// The key this browser kept (IndexedDB can be slow on its first open), then the text of every encrypted tab.
async function openKept() {
  if (!KEY && CAN_ENC && vault()) { const raw = await devLoad(); if (raw) { try { KEY = await useKey(raw); } catch {} raw.fill(0); } }
  if (KEY) await decryptAll();
}
// Identical icons (many links from one site) are stored once inside the encrypted text; each link points at its copy as "#i:N".
// Tabs saved before 1.29 (version 1, icons written out in full) still open, and are rewritten the next time they change.
function packPlain(categories) {
  const table = [], seen = new Map(), cats = JSON.parse(JSON.stringify(categories));
  for (const c of cats) for (const l of c.links || []) {
    if (l && typeof l.icon === 'string' && l.icon.startsWith('data:') && l.icon.length > 120) {
      let n = seen.get(l.icon); if (n === undefined) { n = table.length; table.push(l.icon); seen.set(l.icon, n); }
      l.icon = '#i:' + n;
    }
  }
  return JSON.stringify(table.length ? { v: 2, categories: cats, icons: table } : { v: 1, categories: cats });
}
function unpackPlain(j) {
  if (Array.isArray(j.icons)) for (const c of j.categories) for (const l of c.links || []) {
    const m = l && typeof l.icon === 'string' && /^#i:(\d+)$/.exec(l.icon);
    if (m) l.icon = typeof j.icons[+m[1]] === 'string' ? j.icons[+m[1]] : '';
  }
  return j.categories;
}
async function decryptAll() {
  let bad = 0;
  for (const t of S.data.tabs) {
    if (!t.encrypted || !(t.locked || t.bad)) continue;
    try {
      const j = JSON.parse(await unseal(t._blob));
      if (!j || !Array.isArray(j.categories)) throw new Error('shape');
      t.categories = unpackPlain(j); normalize({ tabs: [t] }, true);
      t._plain = packPlain(t.categories);
      t.locked = false; t.bad = false;
    } catch { t.categories = []; t.locked = true; t.bad = true; bad++; }
  }
  if (bad) { KEY = null; devClear(); }   // a kept key that no longer fits is dropped
}
async function lockNow() {
  await saving;   // anything still being saved goes out first
  KEY = null; devClear();
  for (const t of S.data.tabs) if (t.encrypted && !t.locked) { t.categories = []; t.locked = true; t._plain = ''; }
  render(); toast('Encrypted tabs are locked');
}
// Just logged in: the password was typed, so the key is opened right away and kept for this browser (the page reloads next).
async function unlockAfterLogin(pw) {
  if (!pw || !CAN_ENC || !keepOn()) return;
  try {
    const j = await api('get'), v = j.data && j.data.settings && j.data.settings.vault;
    if (!v || !v.login) return;
    const raw = await unwrapKey(v, pw); if (raw) { await devSave(raw); raw.fill(0); }
  } catch {}
}
// Icons of an encrypted tab travel inside its encrypted text (a file in icons/ is named after the site and readable by the server).
let embeddedAny = false;   // icons were swapped for embedded copies: the page must redraw (the old files are deleted by the server)
async function embedIcons(t) {
  const MIME = { png: 'image/png', ico: 'image/x-icon', gif: 'image/gif', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml' };
  for (const c of t.categories) for (const l of c.links) {
    const m = typeof l.icon === 'string' && /^icons\/[A-Za-z0-9._\/-]+\.(png|ico|gif|jpe?g|webp|svg)(\?.*)?$/i.exec(l.icon);
    if (!m) continue;
    try {
      const r = await fetch(mediaUrl(l.icon), { credentials: 'same-origin' }); if (!r.ok) continue;
      const bin = new Uint8Array(await r.arrayBuffer()); if (!bin.length || bin.length > 500 * 1024) continue;
      l.icon = 'data:' + MIME[m[1].toLowerCase()] + ';base64,' + b64(bin); embeddedAny = true;
    } catch {}
  }
}
// The data to send: encrypted tabs go as their encrypted text (a locked one as it came, never re-encrypted from nothing).
async function buildSnapshot() {
  const settings = JSON.parse(JSON.stringify(S.data.settings || {})); delete settings.vault;   // the key only changes through its own request
  const tabs = [];
  for (const t of S.data.tabs) {
    const { locked, bad, encrypted, _blob, _plain, categories, ...meta } = t;
    if (!encrypted) { tabs.push(JSON.parse(JSON.stringify({ ...meta, categories }))); continue; }
    const out = JSON.parse(JSON.stringify(meta)); out.private = true; out.categories = [];
    if (locked || bad) out.enc = _blob;
    else {
      await embedIcons(t);
      const plain = packPlain(t.categories);
      if (plain !== t._plain || !t._blob) { t._blob = await seal(plain); t._plain = plain; }
      out.enc = t._blob;
    }
    tabs.push(out);
  }
  return { settings, tabs };
}
// Opens the encrypted tabs with the encryption passphrase (set in Settings › Security › Encryption: that is the only place keys are made).
// Resolves true when the key is open.
function ensureKey() {
  if (KEY) return Promise.resolve(true);
  if (!CAN_ENC) { toast('Encryption needs a secure (https) connection.', true); return Promise.resolve(false); }
  const v = vault();
  if (!v) { toast('Set an encryption passphrase first: Settings › Security › Encryption.', true); return Promise.resolve(false); }
  return new Promise(resolve => {
    const dlg = $('#keyDlg'); let done = false, legacy = !!v.login;   // legacy: still locked with the website password (set a passphrase to move it)
    $('#keyTitle').textContent = 'Unlock Encrypted Tabs';
    $('#keyText').textContent = legacy ? 'These tabs are still locked with your website password. Set an encryption passphrase in Settings › Security › Encryption to move them onto it.'
      : 'Type your encryption passphrase to open the encrypted tabs in this browser.';
    $('#keyPwLbl').textContent = legacy ? 'Website Password' : 'Passphrase or Recovery Key';
    $('#keyPw').autocomplete = legacy ? 'current-password' : 'off';
    $('#keyGo').textContent = 'Unlock';
    $('#keyOldBox').hidden = !legacy; $('#keyOldBox').open = false;
    $('#keyPw').value = ''; $('#keyOld').value = ''; $('#keyErr').textContent = ''; $('#keyKeep').checked = keepOn();
    dlg.addEventListener('close', () => { if (!done) resolve(false); }, { once: true });
    $('#keyGo').onclick = async e => {
      e.preventDefault();
      const pw = $('#keyPw').value, old = legacy ? $('#keyOld').value : '', err = $('#keyErr'), btn = $('#keyGo');
      if (!pw) { err.textContent = legacy ? 'Type your website password.' : 'Type your encryption passphrase.'; return; }
      btn.disabled = true; err.textContent = 'Unlocking…';
      try {
        const raw = await unwrapKey(v, old || pw);
        if (!raw) { err.textContent = old ? "That earlier password doesn't open them." : legacy ? "That password doesn't open them. If you changed your password while these tabs were locked, open \"I changed my password\"." : "That passphrase isn't right."; btn.disabled = false; return; }
        if (old) {   // older site-password lock: moved to the current password
          const nv = await wrapKey(raw, pw), j = await api('save_vault', { vault: nv, prev: v.wrap, pw });
          S.data.settings.vault = j.vault; S.rev = j.rev;
        }
        KEY = await useKey(raw); setKeep($('#keyKeep').checked);
        if ($('#keyKeep').checked) await devSave(raw); else devClear();
        raw.fill(0);
        await decryptAll();
        done = true; dlg.close(); render(); resolve(!!KEY);
      } catch (e2) {
        err.textContent = e2.message || 'That did not work.';
        if (e2.status === 409) await load();
      }
      btn.disabled = false;
    };
    dlg.showModal(); $('#keyPw').focus();
  });
}
async function api(action, body) {
  const opt = body === undefined ? {} : {
    method: 'POST', body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'bookmarks' }
  };
  const r = await HF(`${API}?action=${action}&t=${Date.now()}`, { credentials: 'same-origin', ...opt });
  let j = {}; try { j = await r.json(); } catch {}
  if (!r.ok) { const e = new Error(j.error || `Request failed (${r.status})`); e.status = r.status; e.data = j; throw e; }
  return j;
}
function pickTab() {
  const want = decodeURIComponent(location.hash.slice(1));
  S.tab = S.data.tabs.some(t => t.id === want) ? want : (S.data.tabs[0] || {}).id;
}
// Show the last public view instantly while the server answers (never used for logged-in data).
function paintFromCache() {
  try {
    const c = JSON.parse(localStorage.getItem('bm-cache') || 'null');
    if (!c || !Array.isArray(c.tabs)) return;
    S.data = normalize(c, true); pickTab(); render();
  } catch {}
}
async function load() {
  let j;
  try {
    const early = window.__bmGet ? await window.__bmGet : null; window.__bmGet = null;   // used once: later reloads ask the server again
    j = early && early.r.ok && early.j && early.j.data ? early.j : await api('get');
  }
  catch (e) {
    if (S.data.tabs.length) { toast('Could not reach the server: ' + e.message, true); return; }
    $('#grid').innerHTML = '';
    $('#grid').append(h('div', { class: 'loading' }, 'Could not load bookmarks: ' + e.message + '. Check that api.php is uploaded and PHP is enabled.'));
    return;
  }
  S.auth = !!j.auth; S.setup = !!j.setup; S.locked = !!j.locked; S.rev = j.rev || '';
  S.data = normalize(j.data, !S.auth);
  S.visits = S.auth && j.visits && typeof j.visits === 'object' ? j.visits : {};   // visit counts: only you get them
  const enc = markEnc(), mine = S.data;
  try {
    if (!S.auth && !S.locked) localStorage.setItem('bm-cache', JSON.stringify(j.data));
    else localStorage.removeItem('bm-cache');
  } catch {}
  pickTab(); applyLook();
  if (enc && KEY) await decryptAll();   // the key is already in memory: quick
  S.opening = enc && !KEY && CAN_ENC && !!vault();   // a kept key may open the tabs: draw the page first and unlock in the background
  render();
  if (S.opening) {
    try { await openKept(); } catch {}
    if (S.data === mine) { S.opening = false; render(); }
  }
}

// Saving: changes made while a save is running are sent together right after it.
let saving = Promise.resolve(), inFlight = false, again = false, pendingMsg = null;
function persist(msg = 'Saved') {
  if (msg) pendingMsg = msg;
  render();
  if (inFlight) { again = true; return saving; }
  inFlight = true;
  saving = (async () => {
    do {
      again = false;
      const m = pendingMsg;
      pendingMsg = null;
      try {
        const snapshot = await buildSnapshot(), redraw = embeddedAny; embeddedAny = false;
        const j = await api('save', { rev: S.rev, data: snapshot });
        S.rev = j.rev; if (m) toast(m);
        if (redraw) render();
        const map = j.iconMap || {};
        if (Object.keys(map).length) { allLinks().forEach(l => { if (map[l.icon]) l.icon = map[l.icon]; }); render(); }
      } catch (e) {
        again = false;
        if (e.status === 401) endSession('Session ended. Log in again to keep editing.', true);
        else toast(e.message, true);
      }
    } while (again);
    inFlight = false;
  })();
  return saving;
}
addEventListener('beforeunload', e => { if (inFlight) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- icons ---------- */
const DATA_ICON = /^data:image\/(png|jpeg|gif|webp|x-icon|svg\+xml);base64,[A-Za-z0-9+\/=]+$/;
const isFallbackIcon = v => /^https:\/\/www\.google\.com\/s2\/favicons/.test(v || '');
// Links Settings > Icons from Google (1.51, off at first): only then does the browser ask Google's favicon service for an icon.
// Off, a link without an icon saved on your server shows its first letter, and Google never learns which sites are in your Links.
const webIcons = () => !!(S.data && S.data.settings && S.data.settings.webIcons);
function iconSrc(l, noWeb) {
  if (l.icon && (webIcons() || !isFallbackIcon(l.icon))) return DATA_ICON.test(l.icon) ? l.icon : mediaUrl(safeUrl(l.icon));
  if (l.noIcon || noWeb || !webIcons()) return '';   // noWeb: in an encrypted tab the browser doesn't ask a favicon service about your sites
  const d = isWeb(l.url) ? host(l.url) : '';
  return d ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=64` : '';
}
function linkIcon(l, noWeb) {
  const src = iconSrc(l, noWeb);
  const fb = (l.title || '?').trim().charAt(0).toUpperCase();
  const box = h('span', { class: 'ico' + (src ? ' has' : ''), 'aria-hidden': 'true' });
  if (src) {
    const img = h('img', { src, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });
    img.onerror = () => { img.remove(); box.classList.remove('has'); box.textContent = fb; };
    box.append(img);
  } else box.textContent = fb;
  return box;
}
// If this server can't reach the site (some hosts block outgoing requests), save the favicon web service's address instead,
// so the icon still shows and is kept. Settings > Health > Server Check explains what the host allows.
const fetchIcon = url => api('icon', { url: safeUrl(url) }).then(j => j.icon).catch(e => {
  if (e.status === 401 || e.status === 400) throw e;                                  // not logged in / not a fetchable address
  if (e.status === 404 && !(e.data && e.data.fallback)) throw e;                      // the server could reach the site and really found no icon
  if (!webIcons()) throw e;                                                          // Icons from Google is off: no service address
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host(url))}&sz=64`;   // timeout, blocked or failing host: the service address still shows an icon
});

let bulkRunning = false, iconStop = false;
const iconTargets = (mode, auto) => allLinks().filter(l => isWeb(l.url) && (mode === 'all' || !l.icon || isFallbackIcon(l.icon)) && !(auto && (l.noIcon || isFallbackIcon(l.icon))));
// Fetches icons for the links picked by mode ("missing" or "all"). ui(done, total) reports progress. Returns the counts, or null if one run is already going.
async function fetchIcons(mode, auto, ui) {
  if (bulkRunning) return null;
  const todo = iconTargets(mode, auto), n = { total: todo.length, saved: 0, service: 0, none: 0, reason: '' };
  if (!todo.length) return n;
  bulkRunning = true; iconStop = false; $('#iconsBtn').disabled = true;
  let done = 0;
  const byHost = {}, queue = [...todo];
  const worker = async () => {
    while (queue.length && S.auth && !iconStop) {
      const l = queue.shift(), hs = host(l.url);
      byHost[hs] ||= fetchIcon(l.url).then(icon => ({ icon }), err => ({ err }));
      const r = await byHost[hs];
      await new Promise(go => setTimeout(go, 150));
      if (r.err && r.err.status === 401) { S.auth = false; break; }
      if (r.icon) { l.icon = r.icon; delete l.noIcon; isFallbackIcon(r.icon) ? n.service++ : n.saved++; }
      else { if (!n.reason && r.err) n.reason = r.err.message || ''; if (!l.icon) l.noIcon = true; n.none++; }
      done++;
      if (ui) ui(done, todo.length); else if (!auto) toast(`Fetching icons: ${done} of ${todo.length}`, false, true);
      if (done % 20 === 0 && !drag) persist(null);
    }
  };
  await Promise.all([worker(), worker()]);   // two at a time, with a short pause, so slow hosts are not overloaded
  bulkRunning = false; $('#iconsBtn').disabled = false;
  if (!S.auth) { endSession('Session ended. Log in again to fetch icons.', true); return n; }
  persist(auto ? null : 'Icons saved');
  return n;
}
const fetchMissingIcons = auto => fetchIcons('missing', auto);   // runs by itself when you start editing, without a dialog

/* "Fetch icons" dialog: choose which links, watch the progress, read what happened */
function iconSummary(n) {
  if (!n.total) return 'Nothing to fetch: every link already has an icon.';
  const parts = [];
  if (n.saved) parts.push(`${n.saved} saved from the sites`);
  if (n.service) parts.push(`${n.service} using the favicon service`);
  if (n.none) parts.push(`${n.none} with no icon found`);
  let t = parts.join(', ') + '.';
  if (n.service && !n.saved) t += ' Your host could not reach those sites, so the favicon service address was saved instead. See Settings > Health > Server Check.';
  else if (n.none && n.reason) t += ' ' + n.reason;
  return t;
}
function openIconDlg() {
  const c1 = iconTargets('missing').length, c2 = iconTargets('all').length;
  $('#iconCnt1').textContent = `${c1} link${c1 === 1 ? '' : 's'}`; $('#iconCnt2').textContent = `${c2} link${c2 === 1 ? '' : 's'}`;
  $('#iconProg').hidden = true; $('#iconStat').textContent = ''; $('#iconGo').disabled = false;
  $('#iconDlg').showModal();
}
$('#iconGo').onclick = async e => {
  e.preventDefault();
  if (bulkRunning) return;
  const mode = document.querySelector('input[name=iconMode]:checked').value;
  $('#iconGo').disabled = true; $('#iconProg').hidden = false; $('#iconBar').style.width = '0%'; $('#iconStat').textContent = 'Starting…';
  const n = await fetchIcons(mode, false, (d, t) => { $('#iconBar').style.width = Math.round(d / t * 100) + '%'; $('#iconStat').textContent = `Fetching icons: ${d} of ${t}`; });
  $('#iconGo').disabled = false;
  if (!n) return;
  $('#iconBar').style.width = '100%'; $('#iconStat').textContent = iconSummary(n);
  render();
};
$('#iconDlg').addEventListener('close', () => { iconStop = true; });

/* ---------- Import Bookmarks: links-import.js is loaded the first time the menu item is used ---------- */
let importer = null;
// What the importer may use. It changes Links only through save(), which keeps an earlier version first (so Backup & Restore >
// Earlier Versions can undo the import) and sends the page's revision, so a change made in another window is never overwritten.
const BM = {
  tabs: () => S.data.tabs, maxTabs: MAX_TABS, uid, toast, shortestCol, host,
  size: async () => JSON.stringify(await buildSnapshot()).length,
  async save(apply, undo, msg) {
    await saving;
    apply(); render();
    try { const j = await api('save', { rev: S.rev, data: await buildSnapshot(), keep: true }); S.rev = j.rev; render(); return true; }
    catch (e) { undo(); render(); if (e.status === 401) endSession('Session ended. Log in again to keep editing.', true); throw e; }
  },
  showTab(id) { S.tab = id; location.hash = encodeURIComponent(id); render(); },
};
function openImport() {
  if (!S.auth) return toast('Log in to import bookmarks.', true);
  importer ||= new Promise((ok, no) => {
    const s = document.createElement('script');
    s.src = 'assets/links-import.js?v=1.53.6';
    s.onload = () => window.LinksImport ? ok(window.LinksImport) : no(new Error('The importer did not start.'));
    s.onerror = () => no(new Error('Could not load the importer. Check your connection and try again.'));
    document.head.append(s);
  });
  importer.then(m => m.open(BM), e => { importer = null; toast(e.message, true); });
}
$('#importBmBtn').onclick = openImport;

/* ---------- render ---------- */
function visibleCols() { return innerWidth >= 1100 ? 4 : innerWidth >= 700 ? 2 : 1; }

function renderTabs() {
  const wrap = $('#tabs'); wrap.innerHTML = '';
  const tabs = S.data.tabs, cur = curTab();
  tabs.forEach((t, ti) => {
    const active = t === cur && !S.q;
    wrap.append(h('a', { class: 'tab' + (active ? ' active' : ''), href: '#' + encodeURIComponent(t.id), 'data-tab': t.id, role: 'tab', style: isHex(t.ribbon) ? `--tab-ribbon:${t.ribbon}` : null, 'aria-selected': active ? 'true' : 'false',
      onclick: () => { if (S.q) { $('#q').value = ''; S.q = ''; } } }, ribbon(), h('span', {}, t.title),
      t.private ? h('span', { 'aria-label': t.encrypted ? 'encrypted' : 'private', title: t.encrypted ? 'Encrypted tab: encrypted with your passphrase' : 'Private tab: only shown when you are logged in', html: t.encrypted ? ICONS.safe : ICONS.lock }) : null));
    if (t === cur && S.editing) wrap.append(h('div', { class: 'tab-ctrl' },
      tabs.length > 1 ? ib('left', 'Move tab left', () => move(tabs, ti, -1) && persist('Moved')) : null,
      tabs.length > 1 ? ib('right', 'Move tab right', () => move(tabs, ti, 1) && persist('Moved')) : null,
      ib('edit', 'Edit tab name and color', () => editTab(t)),
      tabs.length > 1 ? ib('del', 'Delete tab', () => {
        const n = t.categories.reduce((a, c) => a + linkCount(c), 0);
        if (confirm(`Delete the "${t.title}" tab with ${t.categories.length} categories and ${n} links?`)) {
          tabs.splice(ti, 1); S.tab = tabs[Math.max(0, ti - 1)].id; history.replaceState(null, '', '#' + S.tab); persist('Tab deleted');
        }
      }, 'del') : null));
  });
  if (S.editing && tabs.length < MAX_TABS) wrap.append(h('button', { class: 'tab add', type: 'button', onclick: addTab }, ribbon(true), 'New tab'));
  const act = wrap.querySelector('.tab.active');
  if (act && wrap.scrollWidth > wrap.clientWidth) act.scrollIntoView({ block: 'nearest', inline: 'center' });
}
function addTab() {
  if (S.data.tabs.length >= MAX_TABS) return toast(`You can have up to ${MAX_TABS} tabs`, true);
  editTab(null);
}
let tabCtx = null;
function setTabColorFields(v) {
  $('#tColorText').value = v || '';
  $('#tColor').value = v || colorsFor(mode()).ribbon;
}
function editTab(t) {
  tabCtx = t;
  $('#tabDlgTitle').textContent = t ? 'Edit Tab' : 'New tab';
  $('#tabSave').textContent = t ? 'Save tab' : 'Add Tab';
  $('#tName').value = t ? t.title : '';
  setTabColorFields(t && isHex(t.ribbon) ? t.ribbon : '');
  $('#tPrivate').checked = !!(t && t.private);
  const stuck = !!(t && t.encrypted && (t.locked || t.bad));   // a locked tab can only be turned back to plain text after unlocking it
  const noKey = !vault() && !(t && t.encrypted);   // keys are made in Settings › Security › Encryption
  $('#tEnc').checked = !!(t && t.encrypted); $('#tEnc').disabled = !CAN_ENC || stuck || noKey;
  $('#tPrivate').disabled = $('#tEnc').checked;
  $('#tEncHint').textContent = !CAN_ENC ? 'Needs a secure (https) connection.' : noKey ? 'Set an encryption passphrase first: Settings › Security › Encryption.' : stuck ? 'Unlock this tab first to change this.'
    : 'Locked in this browser with your encryption passphrase before it is saved: the server, its earlier versions and backups only hold scrambled text. The tab name stays readable.';
  $('#tabErr').textContent = '';
  $('#tabDlg').showModal(); $('#tName').select();
}
$('#tColor').addEventListener('input', () => { $('#tColorText').value = $('#tColor').value; });
$('#tColorText').addEventListener('input', () => { let v = $('#tColorText').value.trim(); if (v && v[0] !== '#') v = '#' + v; if (isHex(v)) $('#tColor').value = v; });
$('#tColorDefault').onclick = () => setTabColorFields('');
$('#tEnc').addEventListener('change', () => { if ($('#tEnc').checked) $('#tPrivate').checked = true; $('#tPrivate').disabled = $('#tEnc').checked; });
$('#tabSave').onclick = async e => {
  e.preventDefault();
  const name = $('#tName').value.trim(); if (!name) return;
  let c = $('#tColorText').value.trim(); if (c && c[0] !== '#') c = '#' + c;
  if (c && !isHex(c)) { $('#tabErr').textContent = 'Use a color like #d9a85b, or Use default.'; return; }
  const wantEnc = $('#tEnc').checked, wasEnc = !!(tabCtx && tabCtx.encrypted);
  if (wantEnc && !wasEnc && !(await ensureKey())) { $('#tabErr').textContent = 'Encryption was not turned on.'; return; }
  if (!wantEnc && wasEnc && !confirm('Store this tab as readable text again? Its links will no longer be encrypted on the server.')) return;
  let t = tabCtx;
  if (!t) {
    if (S.data.tabs.length >= MAX_TABS) { $('#tabErr').textContent = `You can have up to ${MAX_TABS} tabs.`; return; }
    t = { id: uid(), title: name, categories: [] };
    S.data.tabs.push(t); S.tab = t.id; history.replaceState(null, '', '#' + t.id);
  }
  t.title = name;
  if (c) t.ribbon = c.toLowerCase(); else delete t.ribbon;
  if (wantEnc) { t.encrypted = true; t.private = true; if (!wasEnc) { t._blob = ''; t._plain = ''; t.locked = false; t.bad = false; } }
  else {
    if (wasEnc) { delete t.encrypted; delete t._blob; delete t._plain; delete t.locked; delete t.bad; }
    if ($('#tPrivate').checked) t.private = true; else delete t.private;
  }
  $('#tabDlg').close();
  persist(tabCtx ? 'Tab saved' : 'Tab added');
};
async function addCategory(col) {
  const t = curTab();
  const n = await askName(`Add category to ${t.title}`, '', 'Add category'); if (!n) return;
  t.categories.push({ id: uid(), title: n, links: [], col: col == null ? shortestCol(t) : col });
  persist('Category added');
}

function renderCategory(t, cat, q, multi) {
  const ci = t.categories.indexOf(cat);
  let items = cat.links.map((l, i) => ({ l, i }));
  if (q) items = items.filter(({ l }) => !l.divider && ((l.title || '').toLowerCase().includes(q) || (l.url || '').toLowerCase().includes(q)
    || (l.extra || []).some(x => (x.title || '').toLowerCase().includes(q))));
  if (q && !items.length) return null;
  const count = linkCount(cat);
  const same = t.categories.filter(c => c.col === cat.col), pos = same.indexOf(cat);

  const head = h('div', { class: 'cat-head' },
    h('span', { class: 'grip', html: ICONS.grip, 'aria-hidden': 'true' }),
    h('h2', {}, q && multi ? h('span', { class: 'from' }, t.title + ' / ') : null, cat.title),
    h('span', { class: 'count' }, String(count)),
    h('div', { class: 'ctrl' },
      ib('left', 'Move to column on the left', () => { placeInCol(t, cat, cat.col - 1); persist('Moved'); }, '', cat.col === 0),
      ib('right', 'Move to column on the right', () => { placeInCol(t, cat, cat.col + 1); persist('Moved'); }, '', cat.col === COLS - 1),
      ib('up', 'Move up', () => moveWithinCol(t, cat, -1) && persist('Moved'), '', pos === 0),
      ib('down', 'Move Down', () => moveWithinCol(t, cat, 1) && persist('Moved'), '', pos === same.length - 1),
      ib('edit', 'Rename category', async () => { const n = await askName('Rename category', cat.title, 'Save category'); if (n) { cat.title = n; persist('Category renamed'); } }),
      ib('del', 'Delete category', () => {
        if (confirm(`Delete "${cat.title}" and its ${count} links?`)) { t.categories.splice(ci, 1); persist('Category deleted'); }
      }, 'del')));

  const ul = h('ul', { class: 'links', 'data-cat': cat.id });
  const dragHandle = () => h('span', { class: 'lgrip', html: ICONS.lgrip, 'aria-hidden': 'true' });
  for (const { l, i } of items) {
    if (drag && drag.started && drag.kind === 'link' && l === drag.link) continue; // in the user's hand
    let li;
    if (l.divider) {
      ul.append(li = h('li', { class: 'divider-row', 'data-i': i }, dragHandle(), h('div', { class: 'divider', role: 'separator' }),
        h('div', { class: 'ctrl' },
          ib('up', 'Move divider up', () => move(cat.links, i, -1) && persist('Moved')),
          ib('down', 'Move divider down', () => move(cat.links, i, 1) && persist('Moved')),
          ib('del', 'Remove divider', () => { cat.links.splice(i, 1); persist('Divider removed'); }, 'del'))));
      li.addEventListener('pointerdown', e => startLinkDrag(e, t, cat, l, li));
      continue;
    }
    ul.append(li = h('li', { class: 'row', 'data-i': i }, dragHandle(),
      h('a', { class: 'main', href: safeUrl(l.url), target: '_blank', rel: 'noopener noreferrer', title: l.url, 'data-u': t.encrypted ? null : l.url },
        linkIcon(l, t.encrypted), h('span', { class: 't' }, l.title), t.encrypted ? null : visitBadge(l.url)),
      (l.extra || []).map(x => h('a', { class: 'extra', href: safeUrl(x.url), target: '_blank', rel: 'noopener noreferrer', title: x.url, 'data-u': t.encrypted ? null : x.url }, x.title)),
      h('div', { class: 'ctrl' },
        ib('up', 'Move up', () => move(cat.links, i, -1) && persist('Moved')),
        ib('down', 'Move Down', () => move(cat.links, i, 1) && persist('Moved')),
        ib('edit', 'Edit link', () => openLink(cat, i)),
        ib('del', 'Delete link', () => { if (confirm(`Delete "${l.title}"?`)) { cat.links.splice(i, 1); persist('Link deleted'); } }, 'del'))));
    li.addEventListener('pointerdown', e => startLinkDrag(e, t, cat, l, li));
  }
  if (!cat.links.length) ul.append(h('li', { class: 'empty-cat' }, S.editing ? 'No links yet. Add one below.' : 'No links yet.'));

  const sec = h('section', { class: 'cat', 'data-id': cat.id, style: `--cat:var(--c${cat.col})` }, head, ul,
    q ? null : h('div', { class: 'cat-add' },
      h('button', { class: 'btn', type: 'button', onclick: () => openLink(cat, -1) }, 'Add link'),
      h('button', { class: 'btn', type: 'button', onclick: () => { cat.links.push({ divider: true }); persist('Divider added'); } }, 'Add divider')));
  head.addEventListener('pointerdown', e => startDrag(e, t, cat, sec));
  return sec;
}

/* ---------- visit counts (1.53) ----------
   Every click on a link counts on your server (also a visitor's, once per browser per link every 30 minutes); only you see
   the numbers. Links Settings > Show Visit Counts (on at first) only hides them. Links in encrypted tabs are never counted. */
const showVisits = () => S.auth && (S.data.settings || {}).visitCounts !== false;
const fmtVisits = n => n >= 10000 ? Math.round(n / 1000) + 'k' : n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n);
function visitBadge(url) {
  const n = (S.visits || {})[url] | 0;
  if (!showVisits() || !n) return null;
  return h('span', { class: 'vc', title: `Opened ${n} time${n === 1 ? '' : 's'}`, 'aria-label': `${n} visit${n === 1 ? '' : 's'}` }, fmtVisits(n));
}
function countVisit(a) {
  const url = a.dataset.u; if (!url || S.editing) return;
  // a plain request (the link opens in a new tab, so this page stays): Firefox leaves the login cookie off keep-alive requests,
  // and the site's own fetch would retry, which counts as a second click
  fetch(`${API}?action=visit`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'bookmarks' }, body: JSON.stringify({ url }) })
    .then(r => r.json()).then(j => {
      if (!j || !j.counted || !S.auth || !j.count) return;
      S.visits[url] = j.count;
      document.querySelectorAll('a.main[data-u]').forEach(m => { if (m.dataset.u !== url) return; const old = m.querySelector('.vc'), b = visitBadge(url); if (old) old.remove(); if (b) m.append(b); });
    }).catch(() => {});
}
document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('.links a[data-u]'); if (a) countVisit(a); });
document.addEventListener('auxclick', e => { if (e.button !== 1) return; const a = e.target.closest && e.target.closest('.links a[data-u]'); if (a) countVisit(a); });   // the middle button opens a new tab

function render() {
  if (drag && drag.started && !drag.allowRender) return; // redraw after the drop instead
  hideTip();
  renderTabs();
  const n = visibleCols();
  document.body.classList.toggle('editing', S.editing);
  document.body.classList.toggle('is-locked', S.locked);
  document.body.classList.toggle('searching', !!S.q);
  document.body.classList.toggle('can-drag', n === COLS && !S.q);
  $('#editBtn').classList.toggle('on', S.editing);
  const grid = $('#grid'); grid.innerHTML = '';
  if (S.locked || !S.data.tabs.length) {
    grid.append(h('div', { class: 'locked' },
      S.locked ? 'This page is private. Log in to see the bookmarks.' : 'There is nothing to show here yet.',
      S.auth ? null : h('button', { class: 'btn primary', type: 'button', onclick: () => $('#editBtn').click() }, S.setup ? 'Create password' : 'Log in')));
    return;
  }
  const q = S.q.toLowerCase(), cur = curTab(), multi = S.data.tabs.length > 1;
  const tabsShown = q ? S.data.tabs : [cur];
  if (!q && S.opening && cur.encrypted && (cur.locked || cur.bad)) { grid.append(h('div', { class: 'skel', role: 'status', 'aria-label': 'Loading' }, h('i'), h('i'), h('i'))); return; }   // the kept key is being opened
  if (!q && cur.encrypted && (cur.locked || cur.bad)) {   // an encrypted tab nobody has opened yet in this browser
    const what = vault() && vault().login ? 'website password' : 'encryption passphrase';
    grid.append(h('div', { class: 'gate' }, h('span', { class: 'lk', html: ICONS.safe }), h('h3', {}, 'Encrypted Tab'),
      h('p', {}, cur.bad ? `This tab couldn't be opened with the key this browser kept. Unlock it with your ${what}.` : `This tab is encrypted. Unlock it with your ${what} to view and edit it.`),
      h('button', { class: 'pill', type: 'button', onclick: () => ensureKey() }, 'Unlock')));
    return;
  }
  if (!q && cur.encrypted && !cur.locked) grid.append(h('div', { class: 'encbar' }, h('span', { class: 'lk', html: ICONS.safe }),
    h('span', {}, `Encrypted tab, unlocked on this device until you ${keepOn() ? '' : 'reload, '}log out or lock it.`), h('button', { type: 'button', onclick: lockNow }, 'Lock Now')));

  const board = h('div', { class: 'board', style: `--cols:${n}` });
  const cols = Array.from({ length: n }, (_, i) => h('div', { class: 'col', 'data-col': i }));
  // On narrower screens, data columns fold together: 2 visible -> (0,2) and (1,3); 1 visible -> all in order
  let shown = 0;
  for (let c = 0; c < COLS; c++) {
    const target = cols[n === COLS ? c : n === 2 ? c % 2 : 0];
    for (const t of tabsShown) for (const cat of t.categories.filter(x => x.col === c)) {
      if (drag && drag.started && drag.kind === 'cat' && cat === drag.cat) continue; // it's in the user's hand
      const sec = renderCategory(t, cat, q, multi);
      if (sec) { target.append(sec); shown++; }
    }
  }
  if (n === COLS) cols.forEach((col, i) => col.append(h('button', { class: 'col-add', type: 'button', onclick: () => addCategory(i) }, 'Add category')));
  else cols[0].append(h('button', { class: 'col-add', type: 'button', onclick: () => addCategory(null) }, 'Add category'));
  board.append(...cols);

  if (q && !shown) grid.append(h('div', { class: 'nores' }, `Nothing matches "${S.q}". Press Esc to clear the search.`));
  if (!q && !cur.categories.length) grid.append(h('div', { class: 'nores' },
    S.editing ? 'This tab has no categories yet. Add one to any column below.' : 'This tab is empty. Click Edit to add categories and links.'));
  grid.append(board);
}
let lastCols = visibleCols();
addEventListener('resize', () => { const n = visibleCols(); if (n !== lastCols && !drag) { lastCols = n; render(); } });

/* ---------- drag categories between columns ---------- */
let drag = null;
function startDrag(e, t, cat, sec) {
  if (!S.editing || S.q || visibleCols() !== COLS) return;
  if (e.button !== 0 || e.target.closest('button,a,input')) return;
  e.preventDefault();
  const r = sec.getBoundingClientRect();
  drag = { kind: 'cat', t, cat, sec, dx: e.clientX - r.left, dy: e.clientY - r.top, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, started: false, w: r.width, hgt: r.height };
  addEventListener('pointermove', onDragMove);
  addEventListener('pointerup', endDrag);
  addEventListener('pointercancel', cancelDrag);
}
// Links (and dividers) drag the same way: to any category, in any tab.
// Mouse: grab the row anywhere. Touch: use the dotted handle, so the page still scrolls.
function startLinkDrag(e, t, cat, link, li) {
  if (!S.editing || S.q || drag) return;
  if (e.button !== 0 || e.target.closest('button,input,.extra')) return;
  if (e.pointerType !== 'mouse' && !e.target.closest('.lgrip')) return;
  e.preventDefault();
  const r = li.getBoundingClientRect();
  drag = { kind: 'link', t, from: cat, link, sec: li, dx: e.clientX - r.left, dy: e.clientY - r.top, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, started: false, w: r.width, hgt: r.height };
  addEventListener('pointermove', onDragMove);
  addEventListener('pointerup', endDrag);
  addEventListener('pointercancel', cancelDrag);
}
const placeAny = () => (drag.kind === 'link' ? placeLinkPlaceholder() : placePlaceholder());
function placeLinkPlaceholder() {
  const d = drag;
  let best = null, bestDist = Infinity;
  for (const c of document.querySelectorAll('.board .cat')) {
    const r = c.getBoundingClientRect();
    const dist = Math.max(0, r.left - d.x, d.x - r.right) * 3 + Math.max(0, r.top - d.y, d.y - r.bottom);
    if (dist < bestDist) { bestDist = dist; best = c; }
  }
  if (!best) return;
  const ul = best.querySelector('ul.links');
  let before = null;
  for (const row of ul.querySelectorAll(':scope > li[data-i]')) {
    const r = row.getBoundingClientRect();
    if (d.y < r.top + r.height / 2) { before = row; break; }
  }
  if (d.ph.parentElement !== ul || d.ph.nextElementSibling !== before) ul.insertBefore(d.ph, before);
}
function beginDrag() {
  const d = drag; d.started = true;
  d.ph = h(d.kind === 'link' ? 'li' : 'div', { class: 'placeholder', style: `height:${d.hgt}px` });
  d.ghost = d.sec.cloneNode(true); d.ghost.classList.add('ghost');
  Object.assign(d.ghost.style, { width: d.w + 'px' });
  d.sec.replaceWith(d.ph);
  document.body.append(d.ghost); document.body.classList.add('dragging');
  d.scroll = setInterval(autoScroll, 16);
}
function onDragMove(e) {
  const d = drag; if (!d) return;
  d.x = e.clientX; d.y = e.clientY;
  if (!d.started) { if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 6) return; beginDrag(); }
  d.ghost.style.left = (d.x - d.dx) + 'px'; d.ghost.style.top = (d.y - d.dy) + 'px';
  const under = document.elementFromPoint(d.x, d.y);
  const tabEl = under && under.closest('a.tab[data-tab]');
  setTabHover(tabEl);
  if (!tabEl) placeAny();
}
// Hovering a tab while dragging: highlight it, and open it after a short pause
function setTabHover(tabEl) {
  const d = drag;
  if (tabEl === d.hoverTab) return;
  if (d.hoverTab) d.hoverTab.classList.remove('drop-target');
  clearTimeout(d.hoverTimer);
  d.hoverTab = tabEl || null;
  if (!tabEl) return;
  tabEl.classList.add('drop-target');
  const id = tabEl.dataset.tab;
  if (id !== curTab().id) d.hoverTimer = setTimeout(() => {
    if (drag !== d) return;
    S.tab = id; history.replaceState(null, '', '#' + id);
    d.allowRender = true; render(); d.allowRender = false;
    d.hoverTab = null; // tabs were redrawn
    setTabHover(document.querySelector(`a.tab[data-tab="${CSS.escape(id)}"]`));
    placeAny();
  }, 450);
}
function placePlaceholder() {
  const d = drag, cols = [...document.querySelectorAll('.board .col')];
  let best = cols[0], bestDist = Infinity;
  for (const c of cols) {
    const r = c.getBoundingClientRect();
    const dist = d.x < r.left ? r.left - d.x : d.x > r.right ? d.x - r.right : 0;
    if (dist < bestDist) { bestDist = dist; best = c; }
  }
  const cats = [...best.querySelectorAll(':scope > .cat')];
  let before = best.querySelector(':scope > .col-add');
  for (const c of cats) { const r = c.getBoundingClientRect(); if (d.y < r.top + r.height / 2) { before = c; break; } }
  if (d.ph.nextElementSibling !== before || d.ph.parentElement !== best) best.insertBefore(d.ph, before);
}
function autoScroll() {
  const d = drag; if (!d) return;
  const edge = 70;
  let dy = 0;
  if (d.y < edge) dy = -Math.ceil((edge - d.y) / 4);
  else if (d.y > innerHeight - edge) dy = Math.ceil((d.y - innerHeight + edge) / 4);
  if (dy) { scrollBy(0, dy); if (!drag.hoverTab) placeAny(); }
}
function cleanupDrag() {
  removeEventListener('pointermove', onDragMove);
  removeEventListener('pointerup', endDrag);
  removeEventListener('pointercancel', cancelDrag);
  if (drag && drag.started) {
    clearInterval(drag.scroll); clearTimeout(drag.hoverTimer); drag.ghost.remove(); document.body.classList.remove('dragging');
    if (drag.hoverTab) drag.hoverTab.classList.remove('drop-target');
  }
}
function endDrag() {
  const d = drag; cleanupDrag(); drag = null;
  if (!d || !d.started) return;
  if (d.kind === 'link') return dropLink(d);
  const sig = t => t.categories.map(c => c.id + ':' + c.col).join();
  const before = sig(d.t);
  let target = curTab(), col, beforeId = null;
  const droppedOnTab = d.hoverTab && S.data.tabs.find(t => t.id === d.hoverTab.dataset.tab);
  if (droppedOnTab) {
    // dropped straight onto a ribbon: same column, at the bottom of that tab
    target = droppedOnTab; col = d.cat.col;
    if (target === d.t) { render(); return; }
  } else {
    col = +d.ph.parentElement.dataset.col;
    const next = d.ph.nextElementSibling;
    beforeId = next && next.classList.contains('cat') ? next.dataset.id : null;
  }
  if (target !== d.t) d.t.categories.splice(d.t.categories.indexOf(d.cat), 1);
  placeInCol(target, d.cat, col, beforeId);
  if (target !== d.t) {
    S.tab = target.id; history.replaceState(null, '', '#' + target.id);
    persist(`Moved to ${target.title}`);
  } else if (before === sig(d.t)) render();
  else persist('Moved');
}
function cancelDrag() { cleanupDrag(); drag = null; render(); }
// A drag that started on a link must not also open it
function swallowClick() {
  const f = e => { e.preventDefault(); e.stopPropagation(); };
  addEventListener('click', f, true);
  setTimeout(() => removeEventListener('click', f, true), 0);
}
function dropLink(d) {
  swallowClick();
  let target, idx;
  const onTab = d.hoverTab && S.data.tabs.find(t => t.id === d.hoverTab.dataset.tab);
  if (onTab) {
    // dropped on a ribbon: bottom of that tab's first category
    if (onTab === d.t) { render(); return; }
    target = [...onTab.categories].sort((a, b) => a.col - b.col)[0];
    if (!target) { toast(`${onTab.title} has no categories yet. Add one first.`, true); render(); return; }
    idx = target.links.length;
  } else {
    const ul = d.ph.parentElement;
    target = ul && allCats().find(c => c.id === ul.dataset.cat);
    if (!target) { render(); return; }
    let n = d.ph.nextElementSibling;
    while (n && !n.dataset.i) n = n.nextElementSibling;
    idx = n ? +n.dataset.i : target.links.length;
  }
  const from = d.from, si = from.links.indexOf(d.link);
  if (si < 0) { render(); return; }
  if (target === from) { if (idx > si) idx--; if (idx === si) { render(); return; } }
  from.links.splice(si, 1);
  target.links.splice(idx, 0, d.link);
  const tTab = S.data.tabs.find(t => t.categories.includes(target));
  if (tTab && tTab.id !== S.tab) { S.tab = tTab.id; history.replaceState(null, '', '#' + tTab.id); }
  persist(target === from ? 'Moved' : `Moved to ${target.title}`);
}
// stop the browser's own link/image dragging while editing
document.addEventListener('dragstart', e => { if (S.editing) e.preventDefault(); });

/* ---------- name dialog ---------- */
function askName(title, value, btn) {
  return new Promise(res => {
    const d = $('#nameDlg');
    $('#nameDlgTitle').textContent = title; $('#nameSave').textContent = btn || 'Save';
    $('#nameInput').value = value || '';
    let result = null;
    $('#nameSave').onclick = e => { e.preventDefault(); const v = $('#nameInput').value.trim(); if (!v) return; result = v; d.close(); };
    d.onclose = () => res(result);
    d.showModal(); $('#nameInput').select();
  });
}

/* ---------- edit mode ---------- */
function setEditing(on) { S.editing = on; render(); }
function openSetup() {   // the site's one login box (it also creates the password on a new site)
  if (window.HUB) HUB.login().then(pw => unlockAfterLogin(pw)).then(() => location.reload(), () => {});   // encrypted tabs open with the password just typed
}
$('#editBtn').onclick = () => {
  if (S.editing) return setEditing(false);
  if (S.setup && !S.auth) return openSetup();
  if (S.auth) { setEditing(true); fetchMissingIcons(true); return; }
  openSetup();   // logging in is the site's one login box
};
$('#doneBtn').onclick = () => setEditing(false);
// Leaving the owner view: hide private things at once, then load exactly what a visitor gets.
async function endSession(msg, bad, serverLogout) {
  KEY = null; devClear();   // leaving the owner view locks the encrypted tabs
  S.auth = false; S.editing = false; S.rev = '';
  ['#linkDlg', '#iconDlg', '#tabDlg', '#nameDlg', '#setDlg', '#colorDlg', '#textDlg', '#verDlg'].forEach(id => { const d = $(id); if (d.open) d.close(); });
  if (S.data.settings && S.data.settings.private) { S.locked = true; S.data.tabs = []; }
  else S.data.tabs = S.data.tabs.filter(t => !t.private);
  pickTab(); render();
  if (location.hash && !S.data.tabs.some(t => '#' + t.id === location.hash)) history.replaceState(null, '', location.pathname + location.search);
  toast(msg, bad);
  if (serverLogout) { try { await api('logout', {}); } catch {} }
  await load();
}
$('#logoutBtn').onclick = () => endSession('Logged out', false, true);
$('#iconsBtn').onclick = openIconDlg;

/* ---------- link dialog ---------- */
let linkCtx = null;
function showIconPreview() {
  const v = $('#lIcon').value.trim(), p = $('#lIconPrev'); p.innerHTML = '';
  if (v) { const img = h('img', { src: mediaUrl(safeUrl(v)), alt: '' }); img.onerror = () => img.remove(); p.append(img); }
}
function openLink(cat, i) {
  const l = i >= 0 ? cat.links[i] : {};
  linkCtx = { cat, i, oldHost: host(l.url || ''), oldIcon: l.icon || '' };
  $('#linkDlgTitle').textContent = i >= 0 ? 'Edit link' : `Add link to ${cat.title}`;
  $('#lTitle').value = l.title || '';
  $('#lUrl').value = l.url || '';
  $('#lIcon').value = l.icon || ''; showIconPreview();
  $('#lExtra').value = (l.extra || []).map(x => `${x.title} | ${x.url}`).join('\n');
  const sel = $('#lCat'); sel.innerHTML = '';
  S.data.tabs.forEach(t => sel.append(h('optgroup', { label: t.title },
    t.categories.map(c => h('option', { value: c.id, selected: c === cat }, c.title)))));
  $('#linkErr').textContent = '';
  titleSeq++; titleUrl = '';
  $('#lTitleFetch').disabled = false; $('#lTitleFetch').textContent = 'Get Title';
  $('#lTitle').placeholder = 'Filled in from the page title';
  $('#linkDlg').showModal(); (i >= 0 ? $('#lTitle') : $('#lUrl')).focus();
}
$('#lIcon').addEventListener('change', showIconPreview);
// Name from the address (instant guess), then the real page title from the server
const nameGuess = url => { const d = host(url).replace(/^www\./, ''); return d ? d.split('.')[0].replace(/^./, c => c.toUpperCase()) : ''; };
const fetchTitle = url => api('title', { url: safeUrl(url) }).then(j => j.title);
let titleSeq = 0, titleUrl = ''; // the box stays empty while loading, so your typing is never mixed in
function autoTitle(force) {
  const url = $('#lUrl').value.trim(), name = $('#lTitle');
  if (!url || !isWeb(safeUrl(url))) return;
  if (!force && (name.value.trim() || titleUrl === url)) return; // has a name, or already on its way
  const seq = ++titleSeq, btn = $('#lTitleFetch');
  titleUrl = url;
  name.placeholder = 'Getting the page title…'; btn.disabled = true; btn.textContent = 'Getting…';
  fetchTitle(url).then(t => {
    if (seq !== titleSeq || !$('#linkDlg').open) return;
    if (force || !name.value.trim()) { name.value = t; if (document.activeElement === name) name.select(); }
  }).catch(err => {
    if (seq !== titleSeq || !$('#linkDlg').open) return;
    if (force) $('#linkErr').textContent = err.message;
    else if (!name.value.trim()) name.value = nameGuess(url); // the site hid its title: use the domain
  }).finally(() => {
    if (seq !== titleSeq) return;
    titleUrl = ''; btn.disabled = false; btn.textContent = 'Get Title'; name.placeholder = 'Filled in from the page title';
  });
}
$('#lUrl').addEventListener('change', () => autoTitle(false));
$('#lUrl').addEventListener('paste', () => setTimeout(() => autoTitle(false)));
$('#lTitleFetch').onclick = () => { $('#linkErr').textContent = ''; autoTitle(true); };
$('#lIconFetch').onclick = async e => {
  const btn = e.currentTarget, url = $('#lUrl').value.trim();
  if (!url) { $('#linkErr').textContent = 'Enter the URL first.'; return; }
  btn.disabled = true; btn.textContent = 'Fetching…'; $('#linkErr').textContent = '';
  try { $('#lIcon').value = await fetchIcon(url); showIconPreview(); }
  catch (err) { $('#linkErr').textContent = err.message; }
  btn.disabled = false; btn.textContent = 'Fetch';
};
$('#linkSave').onclick = e => {
  e.preventDefault();
  const url = $('#lUrl').value.trim();
  if (!url) { $('#linkErr').textContent = 'Enter the URL.'; return; }
  // saved before the page title arrived: keep the quick guess now, swap in the real title when it comes
  const typed = $('#lTitle').value.trim();
  const title = typed || nameGuess(url) || url;
  const waitTitle = !typed && isWeb(safeUrl(url)); // saved before the title arrived
  const extra = [];
  for (const line of $('#lExtra').value.split('\n').map(s => s.trim()).filter(Boolean)) {
    const k = line.indexOf('|');
    if (k < 1) { $('#linkErr').textContent = `Extra link "${line}" needs the format: label | URL`; return; }
    extra.push({ title: line.slice(0, k).trim(), url: safeUrl(line.slice(k + 1)) });
  }
  const link = { title, url: safeUrl(url) };
  if (extra.length) link.extra = extra;
  let icon = $('#lIcon').value.trim();
  if (icon && icon === linkCtx.oldIcon && host(link.url) !== linkCtx.oldHost) icon = '';
  if (icon) link.icon = safeUrl(icon);

  const { cat, i } = linkCtx;
  const target = allCats().find(c => c.id === $('#lCat').value) || cat;
  if (i >= 0 && target === cat) cat.links[i] = link;
  else { if (i >= 0) cat.links.splice(i, 1); target.links.push(link); }
  $('#linkDlg').close();
  persist(i >= 0 ? 'Link saved' : 'Link added');
  titleSeq++; // the dialog is closed; any title still on its way is handled here instead
  if (waitTitle) fetchTitle(link.url).then(t => { if (link.title === title) { link.title = t; persist('Name updated from the page title'); } }).catch(() => {});
  if (!link.icon && isWeb(link.url)) {
    fetchIcon(link.url).then(ic => { link.icon = ic; persist('Icon saved'); })
      .catch(() => { link.noIcon = true; persist(null); });
  }
};

/* ---------- settings + colors (each dialog edits a draft, previews live, reverts on cancel) ---------- */
let draft = null, draftSaved = false;
const openDraft = () => { draft = JSON.parse(JSON.stringify(S.data.settings || {})); draftSaved = false; };
function commitDraft(dlg, msg) { const keepV = S.data.settings && S.data.settings.vault; S.data.settings = draft; if (keepV) S.data.settings.vault = keepV; else delete S.data.settings.vault; draftSaved = true; dlg.close(); applyLook(); persist(msg); }
['#setDlg', '#colorDlg', '#textDlg'].forEach(id => $(id).addEventListener('close', () => { if (!draftSaved) applyLook(); }));

/* colors */
for (const m of ['dark', 'light']) {
  for (const [k, label] of COLOR_KEYS.filter(c => c[0] !== 'bg' && c[0] !== 'accent')) $('#' + m + (k[0] === 'c' ? 'Colors4' : 'Colors')).append(h('div', { class: 'crow' },
    h('span', { class: 'lbl' }, k === 'ribbon' ? 'Ribbon' : label),
    h('span', { class: 'cprev', 'data-p': `${m}.${k}` }, k === 'ribbon' ? '▮ Tab' : 'Category'),
    h('label', { class: 'swatch' }, h('input', { type: 'color', 'data-k': `${m}.${k}` }),
      h('input', { type: 'text', 'data-k': `${m}.${k}`, maxlength: 7, 'aria-label': `${m} ${label} hex` })),
    h('button', { type: 'button', class: 'crst', 'data-rst': `${m}.${k}`, title: 'Back to the default (follows the accent)', 'aria-label': `Reset ${label}` }, '↺')));
}
const colorInputs = () => [...document.querySelectorAll('#colorDlg input[data-k]')];
function fillColorInputs() {
  colorInputs().forEach(inp => { if (inp === document.activeElement && inp.type === 'text') return; const [m, k] = inp.dataset.k.split('.'); inp.value = colorsFor(m, draft)[k]; });
  document.querySelectorAll('#colorDlg [data-p]').forEach(el => { const [m, k] = el.dataset.p.split('.'); el.style.color = colorsFor(m, draft)[k]; });
  document.querySelectorAll('#colorDlg [data-rst]').forEach(b => { const [m, k] = b.dataset.rst.split('.'); b.style.visibility = draft[m] && isHex(draft[m][k]) ? 'visible' : 'hidden'; });
}
// one mode at a time: the one the page shows now first
function colorMode(m) {
  document.querySelectorAll('#colorDlg [data-cm]').forEach(b => b.setAttribute('aria-pressed', b.dataset.cm === m ? 'true' : 'false'));
  document.querySelectorAll('#colorDlg .cpanel').forEach(p => { p.hidden = p.dataset.m !== m; });
  $('#colorDlg').dataset.mode = m;
}
document.querySelectorAll('#colorDlg [data-cm]').forEach(b => b.onclick = () => colorMode(b.dataset.cm));
document.querySelectorAll('#colorDlg [data-rst]').forEach(b => b.onclick = () => { const [m, k] = b.dataset.rst.split('.'); if (draft[m]) delete draft[m][k]; fillColorInputs(); applyLook(draft); });
document.querySelectorAll('#colorDlg [data-same]').forEach(b => b.onclick = () => {
  const m = b.dataset.same, c0 = colorsFor(m, draft).c0; draft[m] ||= {};
  for (const k of ['c0', 'c1', 'c2', 'c3']) draft[m][k] = c0;
  fillColorInputs(); applyLook(draft);
});
$('#colorsBtn').onclick = () => { openDraft(); colorMode(mode()); fillColorInputs(); $('#colorDlg').showModal(); };
colorInputs().forEach(inp => inp.addEventListener('input', () => {
  let v = inp.value.trim(); if (inp.type === 'text' && v && v[0] !== '#') v = '#' + v;
  if (!isHex(v)) return;
  const [m, k] = inp.dataset.k.split('.');
  (draft[m] ||= {})[k] = v.toLowerCase();
  fillColorInputs(); // keeps the twin input and anything following the accent in step
  applyLook(draft);
}));
$('#colorReset').onclick = () => { const m = $('#colorDlg').dataset.mode || mode(); for (const k of ['ribbon', 'c0', 'c1', 'c2', 'c3']) if (draft[m]) delete draft[m][k]; fillColorInputs(); applyLook(draft); };
$('#colorSave').onclick = e => { e.preventDefault(); commitDraft($('#colorDlg'), 'Colors saved'); };

/* text: separate sizes for tabs, categories and links (the font is one site-wide setting in Settings > Appearance) */
for (const [k, label, min, max] of SIZE_KEYS) $('#xSizes').append(h('div', { class: 'field' },
  h('label', { for: 'xSize-' + k }, label),
  h('div', { class: 'range' }, h('input', { type: 'range', id: 'xSize-' + k, min, max, step: 1 }), h('output', { id: 'xOut-' + k }))));
function fillTextForm() {
  const z = sizesFor(draft);
  for (const [k] of SIZE_KEYS) $('#xSize-' + k).value = z[k];
  readTextForm();
}
function readTextForm() {
  delete draft.font; delete draft.fontCustom;
  draft.sizes = {};
  for (const [k] of SIZE_KEYS) { draft.sizes[k] = +$('#xSize-' + k).value; $('#xOut-' + k).textContent = draft.sizes[k] + ' px'; }
  delete draft.fontSize;
  applyLook(draft);
}
$('#textBtn').onclick = () => { openDraft(); fillTextForm(); $('#textErr').textContent = ''; $('#textDlg').showModal(); };
$('#xSizes').addEventListener('input', readTextForm);
$('#textReset').onclick = () => { delete draft.font; delete draft.fontCustom; delete draft.sizes; delete draft.fontSize; fillTextForm(); };
$('#textSave').onclick = e => {
  e.preventDefault(); readTextForm();
  if (draft.font === 'custom' && !draft.fontCustom) { $('#textErr').textContent = 'Type a font name, or pick one from the list.'; return; }
  if (!draft.font || draft.font === 'trebuchet') delete draft.font;
  if (draft.font !== 'custom') delete draft.fontCustom;
  if (SIZE_KEYS.every(([k, , , , def]) => draft.sizes[k] === def)) delete draft.sizes;
  commitDraft($('#textDlg'), 'Text saved');
};

/* settings */
function readSettingsForm() {
  draft.title = $('#sTitle').value.trim();
  draft.private = $('#sPrivate').checked;
  draft.webIcons = $('#sWebIcons').checked;
  draft.visitCounts = $('#sVisits').checked;
  applyLook(draft);
}
// Text Sizes lives inside Settings: close it, then open the sizes
$('#sTextBtn').onclick = () => { $('#setDlg').close(); $('#textBtn').click(); };
$('#settingsBtn').onclick = () => {
  openDraft();
  $('#sTitle').value = draft.title || '';
  $('#sPrivate').checked = !!draft.private;
  $('#sWebIcons').checked = !!draft.webIcons;
  $('#sVisits').checked = draft.visitCounts !== false;
  readSettingsForm(); $('#setErr').textContent = '';
  $('#setDlg').showModal();
};
$('#sTitle').addEventListener('input', readSettingsForm);
$('#setSave').onclick = e => {
  e.preventDefault(); readSettingsForm();
  if (!draft.title) delete draft.title;
  delete draft.favicon;   // no separate Links icon any more: the site logo is used
  if (!draft.private) delete draft.private;
  if (!draft.webIcons) delete draft.webIcons;
  commitDraft($('#setDlg'), 'Settings saved');
};

/* earlier versions kept on the server */
$('#versionsBtn').onclick = async () => {
  const list = $('#verList'); list.innerHTML = ''; $('#verErr').textContent = '';
  $('#verDlg').showModal();
  list.append(h('li', {}, 'Loading…'));
  try {
    const j = await api('backups'); list.innerHTML = '';
    if (!j.backups.length) list.append(h('li', {}, 'No earlier versions yet. They appear as you edit.'));
    for (const b of j.backups) list.append(h('li', {},
      h('div', { class: 'when' }, new Date(b.time * 1000).toLocaleString(), h('small', {}, `${b.tabs} tab${b.tabs === 1 ? '' : 's'}, ${b.links} links`)),
      h('button', { class: 'btn', type: 'button', onclick: async ev => {
        if (!confirm(`Restore the version from ${new Date(b.time * 1000).toLocaleString()}? The current version is kept as a backup too.`)) return;
        ev.currentTarget.disabled = true;
        try { await api('rollback', { name: b.name }); $('#verDlg').close(); draftSaved = true; $('#setDlg').close(); await load(); toast('Earlier version restored'); }
        catch (err) { $('#verErr').textContent = err.message; ev.currentTarget.disabled = false; }
      } }, 'Restore')));
  } catch (err) { list.innerHTML = ''; $('#verErr').textContent = err.message; }
};

/* export (inside settings) */
$('#exportBtn').onclick = async e => {
  const btn = e.currentTarget; btn.disabled = true; btn.textContent = 'Preparing…';
  try {
    const r = await fetch(`${API}?action=backup&t=${Date.now()}`, { credentials: 'same-origin' });
    if (!r.ok) { let j = {}; try { j = await r.json(); } catch {} throw new Error(j.error || `Backup failed (${r.status})`); }
    const blob = await r.blob();
    const a = h('a', { href: URL.createObjectURL(blob), download: `bookmarks-backup-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a); a.click(); a.remove();
    toast('Backup downloaded');
  } catch (err) { $('#setErr').textContent = err.message; }
  btn.disabled = false; btn.textContent = 'Export Backup';
};
$('#importBtn').onclick = () => $('#importFile').click();
$('#importFile').onchange = async () => {
  const f = $('#importFile').files[0]; $('#importFile').value = '';
  if (!f) return;
  let backup;
  try { backup = JSON.parse(await f.text()); } catch { $('#setErr').textContent = 'That file is not valid JSON, so it cannot be a backup.'; return; }
  const d = backup && backup.format === 'bookmarks-backup' ? backup.data : backup;
  const tabs = d && Array.isArray(d.tabs) ? d.tabs : d && Array.isArray(d.categories) ? [{ categories: d.categories }] : null;
  if (!tabs) { $('#setErr').textContent = 'That file is not a bookmarks backup.'; return; }
  const nLinks = tabs.reduce((a, t) => a + (t.categories || []).reduce((b, c) => b + (c.links || []).filter(l => !l.divider).length, 0), 0);
  const nIcons = backup.icons ? Object.keys(backup.icons).length : 0;
  if (!confirm(`Replace everything on this site with this backup?\n\n${tabs.length} tab${tabs.length > 1 ? 's' : ''}, ${nLinks} links, ${nIcons} icons.\n\nThe current bookmarks are kept in data/backups first.`)) return;
  const btn = $('#importBtn'); btn.disabled = true; btn.textContent = 'Importing…'; $('#setErr').textContent = '';
  try {
    const j = await api('restore', { backup });
    draftSaved = true; $('#setDlg').close();
    toast(`Backup imported: ${nLinks} links, ${j.icons} icons`);
    await load(); setEditing(true);
  } catch (err) { $('#setErr').textContent = err.message; }
  btn.disabled = false; btn.textContent = 'Import Backup';
};

/* ---------- tabs via URL hash, search, keys ---------- */
window.addEventListener('hashchange', () => {
  const id = decodeURIComponent(location.hash.slice(1));
  if (S.data.tabs.some(t => t.id === id)) {
    S.tab = id; render();
    const g = $('#grid'); g.classList.remove('swap'); void g.offsetWidth; g.classList.add('swap');   // the new tab eases in (only on a real switch)
  }
});
const qi = $('#q');
qi.addEventListener('input', () => { S.q = qi.value.trim(); render(); });
qi.addEventListener('keydown', e => {
  if (e.key === 'Escape') { qi.value = ''; S.q = ''; render(); qi.blur(); }
  if (e.key === 'Enter') { const first = $('#grid a.main'); if (first) window.open(first.href, '_blank', 'noopener'); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && drag) { cancelDrag(); return; }
  if (document.querySelector('dialog[open]') || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  if (e.key === '/') { e.preventDefault(); qi.focus(); }
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= S.data.tabs.length && !e.ctrlKey && !e.metaKey && !e.altKey) location.hash = S.data.tabs[n - 1].id;
});

document.addEventListener('hub:theme', () => applyLook());   // the bar's theme switch
setThemeBtn();
paintFromCache();
load();
})();
