/*! Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
(() => {
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ICONS = {
  grip:  '<svg viewBox="0 0 24 24"><circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/></svg>',
  edit:  '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>',
  plus:  '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
};

let PUB = window.PUB;      // what visitors see
let ADMIN = null;          // full data while logged in
let CSRF = null;
let editing = false;
const PER_COL = 5;

/* ======================================================================
   ICONS & BOARD
   ====================================================================== */
/* Saved pictures are stored as "photos/…", "uploads/…" and "icons/…" and live in web/hub/media/home (before 1.29.3: next to this page). Only the address shown changes. */
const media = u => /^(photos|uploads|icons)\//.test(u || '') ? '../hub/media/home/' + u : u;
function hostOf(u){ try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } }

function iconHTML(l){
  const ic = l.icon || {};
  if (ic.type === 'emoji' && ic.value) return `<span>${esc(ic.value)}</span>`;
  if (ic.type === 'image' && ic.value) return `<img class="own" src="${esc(media(ic.value))}" alt="">`;
  const host = hostOf(l.url);
  if (!host) return `<span class="letter">${esc((l.name || '?')[0].toUpperCase())}</span>`;
  return `<img src="${esc(ICON_SOURCES[0](host))}" alt="" data-host="${esc(host)}" data-step="0" data-letter="${esc((l.name || host || '?')[0].toUpperCase())}">`;
}
/* "Automatic" icons are loaded by the visitor's browser. If one service has nothing, try the next, then show the first letter. */
const ICON_SOURCES = [
  h => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(h)}&sz=64`,
  h => `https://icons.duckduckgo.com/ip3/${encodeURIComponent(h)}.ico`,
  h => `https://${h}/favicon.ico`,
];
function wireIconFallbacks(root){
  $$('img[data-letter]', root).forEach(img => {
    const next = () => {
      const step = +img.dataset.step + 1;
      if (step < ICON_SOURCES.length){ img.dataset.step = step; img.src = ICON_SOURCES[step](img.dataset.host); return; }
      if (img.parentNode) img.replaceWith(Object.assign(document.createElement('span'), { className:'letter', textContent:img.dataset.letter }));
    };
    img.addEventListener('error', next);
    img.addEventListener('load', () => { if (img.naturalWidth < 2) next(); });   // some services answer with an empty image
  });
}

function columns(){ return (editing && ADMIN ? ADMIN : PUB).columns; }

function renderBoard(){
  const cols = columns();
  const board = $('#board');
  const counts = cols.map(c => c.length);
  board.classList.toggle('single', !editing && (counts[0] === 0 || counts[1] === 0));
  board.classList.toggle('none', !editing && counts[0] + counts[1] === 0);

  $$('.col', board).forEach((ul, ci) => {
    ul.innerHTML = cols[ci].map(l => editing
      ? `<li class="lk" data-id="${esc(l.id)}">
           <span class="grip">${ICONS.grip}</span>
           <span class="ic">${iconHTML(l)}</span>
           <span class="nm">${esc(l.name)}</span>
           <span class="lk-tools">
             <button type="button" data-act="edit" aria-label="Edit ${esc(l.name)}">${ICONS.edit}</button>
             <button type="button" data-act="del" aria-label="Delete ${esc(l.name)}">${ICONS.trash}</button>
           </span>
         </li>`
      : `<li><a class="lk" href="${esc(l.url)}" rel="noopener">
           <span class="ic">${iconHTML(l)}</span>
           <span class="nm">${esc(l.name)}</span>
         </a></li>`
    ).join('');
    if (editing && cols[ci].length < PER_COL){
      ul.insertAdjacentHTML('beforeend', `<li class="add-li"><button type="button" class="add-slot" data-add="${ci}">${ICONS.plus} Add link</button></li>`);
    }
  });
  wireIconFallbacks(board);
}

const DEFAULT_FAVICON = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='26' fill='%23111827'/><circle cx='50' cy='50' r='20' fill='%23A8D8FF'/></svg>";
let lastIcon = PUB.icon;
function setFavicon(icon){
  // Replace the <link> element: some browsers ignore a changed href on the old one.
  const old = $('#favicon');
  const link = document.createElement('link');
  link.id = 'favicon'; link.rel = 'icon'; link.sizes = 'any';
  const ext = (icon.split('.').pop() || '').toLowerCase();
  link.type = icon ? ({ ico:'image/x-icon', png:'image/png', jpg:'image/jpeg', gif:'image/gif', webp:'image/webp' }[ext] || '') : (window.LOGO_FAVICON ? '' : 'image/svg+xml');
  link.href = icon ? media(icon) + '?v=' + Date.now() : (window.LOGO_FAVICON || DEFAULT_FAVICON);
  old.replaceWith(link);
}
function applyPanel(p){
  const r = document.documentElement.style;
  r.setProperty('--panel-a', p.opacity);
  r.setProperty('--panel-blur', p.blur + 'px');
}
function applyPageMeta(src){
  document.title = src.title || 'Home';
  if (src.icon !== lastIcon){ setFavicon(src.icon); lastIcon = src.icon; }
  document.documentElement.style.setProperty('--dim', src.bg.dim);
  applyPanel(src.panel);
}

/* ======================================================================
   BACKGROUND
   Photos live on your own server (photos/), so they load fast.
   The next background is preloaded, so the refresh button is instant.
   ====================================================================== */
/* Held upright, a phone shows only the middle slice of a landscape photo, so it gets the phone-shaped copy ("name-p.jpg", about half
   the bytes, same picture). Landscape screens and photos without a copy use the full photo. Turning the phone swaps the file. */
const portraitMQ = matchMedia('(max-aspect-ratio: 3/4)');
const bgSrc = item => media(item.p && portraitMQ.matches ? item.url.replace(/\.(jpe?g|png|webp)$/i, '-p.jpg') : item.url);
portraitMQ.addEventListener?.('change', () => document.querySelectorAll('#bg > img[data-p]').forEach(n => { n.src = bgSrc({ url:n.dataset.u, p:1 }); }));

const BG = {
  el: $('#bg'),
  token: 0,
  timer: 0,
  nextUp: null,          // { item, node } preloaded and ready

  credit(text, link){
    const a = $('#creditText');
    a.textContent = text || '';
    if (link) a.href = link; else a.removeAttribute('href');
  },
  busy(on){ $('#nextBg').classList.toggle('spin', on); },

  load(item){
    return new Promise((res, rej) => {
      // a video with a still picture: the picture shows at once, and stays where the video can't play (AV1 on an older browser, data saver, Reduce Motion)
      if (item.type === 'video' && item.poster){
        const v = document.createElement('video');
        const still = () => { const img = new Image(); img.alt = ''; img.onload = () => res(img); img.onerror = () => rej(new Error('load')); img.src = media(item.poster); };
        if (navigator.connection?.saveData || REDUCED || (/\.mp4$/i.test(item.url) && !v.canPlayType('video/mp4; codecs="av01.0.08M.08"'))) return still();
        Object.assign(v, { muted:true, loop:true, autoplay:true, playsInline:true, preload:'auto', poster:media(item.poster) });
        v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
        v.onerror = () => { v.remove(); const cur = this.el.lastElementChild; if (cur === v) this.show({ ...item, type:'image', url:item.poster }, { count:false }); };
        const pre = new Image(); pre.onload = pre.onerror = () => res(v); pre.src = v.poster;   // ready as soon as its still picture is
        v.src = media(item.url);
        return;
      }
      if (item.type === 'video'){
        const v = document.createElement('video');
        Object.assign(v, { muted:true, loop:true, autoplay:true, playsInline:true, preload:'auto' });
        v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
        const t = setTimeout(() => rej(new Error('timeout')), 20000);
        v.oncanplay = () => { clearTimeout(t); v.oncanplay = null; res(v); };
        v.onerror = () => { clearTimeout(t); rej(new Error('load')); };
        v.src = media(item.url);
        return;
      }
      const img = new Image();
      img.alt = ''; img.decoding = 'async';
      if (item.p){ img.dataset.u = item.url; img.dataset.p = '1'; }
      const t = setTimeout(() => rej(new Error('timeout')), 20000);
      img.onload = () => { clearTimeout(t); (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(() => res(img)); };
      img.onerror = () => { clearTimeout(t); rej(new Error('load')); };
      img.src = bgSrc(item);
    });
  },

  swap(node, item){
    const old = [...this.el.children];
    if (node.tagName === 'IMG' && motionOn()) node.classList.add('kb');
    this.el.appendChild(node);
    if (node.tagName === 'VIDEO') node.play().catch(() => {});
    requestAnimationFrame(() => requestAnimationFrame(() => {
      node.classList.add('on');
      old.forEach(n => n.classList.remove('on'));
      setTimeout(() => old.forEach(n => n.remove()), 1800);
    }));
    this.credit(item.credit, item.link);
    remember(item.url);
  },

  /** Pick a random item: uploads by chance, then videos by chance, otherwise a photo (source first, then photo).
      Backgrounds this browser showed lately are skipped; when all of a kind were shown, the one shown longest ago comes back. */
  pick(exclude = []){
    const seen = seenTags(), last = lastBg(); if (last) seen.push(bgTag(last));
    const fresh = list => {
      const pool = list.filter(i => !exclude.includes(i.url)); const l = pool.length ? pool : list;
      const f = l.filter(i => !seen.includes(bgTag(i.url)));
      if (f.length) return f;
      const rank = i => seen.lastIndexOf(bgTag(i.url)), oldest = Math.min(...l.map(rank));
      return l.filter(i => rank(i) === oldest);
    };
    const saveData = navigator.connection?.saveData;
    const all = PUB.bg.photos || [];
    const videos = saveData ? [] : all.filter(i => i.type === 'video');
    const images = all.filter(i => i.type !== 'video');
    const ups = (PUB.uploads || []).filter(u => !(saveData && u.type === 'video'));

    if (PUB.bg.theme && PUB.bg.theme !== 'online'){   // a theme (Starter or your own): its backgrounds take turns
      const mine = (PUB.bg.own || []).filter(i => !(saveData && i.type === 'video' && !i.poster));
      return mine.length ? pick(fresh(mine)) : null;
    }
    if (ups.length && (Math.random() < PUB.bg.uploadChance || (!images.length && !videos.length))) return pick(fresh(ups));
    if (videos.length && (Math.random() < PUB.bg.videoChance || !images.length)) return pick(fresh(videos));
    if (images.length){
      const bySrc = {};
      fresh(images).forEach(i => (bySrc[i.src] ||= []).push(i));
      return pick(bySrc[pick(Object.keys(bySrc))]);
    }
    return ups.length ? pick(fresh(ups)) : null;
  },

  async show(item, { count = true } = {}){
    if (!item) return false;
    const my = ++this.token;
    let node;
    if (this.nextUp && this.nextUp.item.url === item.url){ node = this.nextUp.node; this.nextUp = null; }
    else {
      this.busy(true);
      try { node = await this.load(item); }
      catch { this.busy(false); return false; }
    }
    if (my !== this.token) return false;
    this.busy(false);
    this.swap(node, item);
    if (count) this.seen(item);
    this.preloadNext(item);
    return true;
  },

  /** Tell the server this photo was shown. After a few views it's replaced with a new one. */
  seen(item){
    if (!item.url.startsWith('photos/')) return;
    fetch('api.php?action=seen', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ url:item.url }), keepalive:true, credentials:'same-origin' })
      .then(r => r.json()).then(r => {
        if (!r.removed) return;
        PUB.bg.photos = (PUB.bg.photos || []).filter(p => p.url !== item.url);
        if (this.nextUp?.item.url === item.url) this.nextUp = null;
        setTimeout(() => this.refill(false), 3000);   // fetch a replacement in the background
      }).catch(() => {});
  },

  preloadNext(current){
    if (navigator.connection?.saveData){ this.nextUp = null; return; }   // data saver: the next photo is fetched only when asked for
    const item = this.pick([current.url]);
    if (!item || item.url === current.url || item.type === 'video'){ this.nextUp = null; return; }
    const want = item.url;
    this.nextUp = null;
    const go = () => this.load(item).then(node => { if (this.el.lastElementChild?.src !== want) this.nextUp = { item, node }; }).catch(() => {});
    ('requestIdleCallback' in window) ? requestIdleCallback(go, { timeout:3000 }) : setTimeout(go, 1500);
  },

  async next(){
    const item = this.nextUp?.item || this.pick();
    if (await this.show(item)) return;
    // that one failed: try a couple of others
    for (let i = 0; i < 3; i++) if (await this.show(this.pick([item?.url]))) return;
  },

  /** Ask the server to download more photos in the background. Visitors never wait for this. */
  refillRunning: false,
  async refill(showIfEmpty){
    if (this.refillRunning) return;
    this.refillRunning = true;
    try {
      const r = await fetch('api.php?action=refill', { credentials:'same-origin' }).then(r => r.json());
      if (r.added?.length){
        PUB.bg.photos = [...(PUB.bg.photos || []), ...r.added];
        if (showIfEmpty && !this.el.children.length) this.show(r.added[0]);
      }
    } catch {}
    this.refillRunning = false;
  },

  start(){
    const force = new URLSearchParams(location.search).get('bg');
    let first = PUB.first;
    if (force === 'upload' && PUB.uploads.length) first = pick(PUB.uploads);
    else if (force && (PUB.bg.photos || []).some(p => p.src === force)) first = pick(PUB.bg.photos.filter(p => p.src === force));
    if (first) this.show(first);
    if (PUB.bg.refill) setTimeout(() => this.refill(!first), first ? 4000 : 0);
    this.schedule();
  },

  schedule(){
    clearInterval(this.timer);
    const min = PUB.bg.rotate | 0;
    if (min > 0) this.timer = setInterval(() => { if (!document.hidden) this.next(); }, min * 60000);
  },
};
// videos pause while the tab is hidden, so they don't use battery in the background
document.addEventListener('visibilitychange', () => document.querySelectorAll('#bg video').forEach(v => { if (document.hidden) v.pause(); else v.play().catch(() => {}); }));
function motionOn(){ return (editing && ADMIN ? ADMIN.bg.motion : PUB.bg.motion) && !REDUCED; }
const BG_REMEMBER = 30;   // the same as BG_REMEMBER in lib.php
/** A short tag for a background's address (FNV-1a, 32 bits, hex); bg_tag() in lib.php gives the same. */
function bgTag(url){ let h = 0x811c9dc5; for (const b of new TextEncoder().encode(url)) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); }
function seenTags(){ const m = document.cookie.match(/(?:^|; )hl_seen=([^;]*)/); return m ? m[1].split('.').filter(t => /^[0-9a-f]{1,8}$/.test(t)).slice(-BG_REMEMBER) : []; }
function remember(url){
  const t = bgTag(url), s = seenTags().filter(x => x !== t); s.push(t);
  document.cookie = 'hl_seen=' + s.slice(-BG_REMEMBER).join('.') + ';path=/;max-age=2592000;samesite=lax';
  document.cookie = 'hl_last=' + encodeURIComponent(url) + ';path=/;max-age=2592000;samesite=lax';
}
function lastBg(){ const m = document.cookie.match(/(?:^|; )hl_last=([^;]*)/); return m ? decodeURIComponent(m[1]) : ''; }

/* ======================================================================
   TOAST
   ====================================================================== */
function toast(msg, err = false){
  const t = $('#toast');
  // An open settings sheet is a modal <dialog>, drawn above everything else: the message has to sit inside it to be seen.
  const open = [...document.querySelectorAll('dialog[open]')].pop() || document.body;
  if (t.parentNode !== open) open.appendChild(t);
  t.textContent = msg; t.classList.toggle('err', err); t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), err ? 6000 : 2800);
}

/* ======================================================================
   API
   ====================================================================== */
async function api(action, body, form = false){
  const o = { method: body !== undefined ? 'POST' : 'GET', credentials:'same-origin', headers:{} };
  if (CSRF) o.headers['X-CSRF-Token'] = CSRF;
  if (body !== undefined){
    if (form) o.body = body;
    else { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body); }
  }
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), form ? 120000 : 45000);
  o.signal = ctl.signal;
  let r;
  try { r = await (window.HUB ? HUB.fetch('api.php?action=' + action, o) : fetch('api.php?action=' + action, o)); }
  catch { throw new Error('Couldn\'t reach your server. Check your connection and try again.'); }
  finally { clearTimeout(timer); }
  let j; try { j = await r.json(); } catch { j = { error:`The server sent an unexpected reply (${r.status}). Check that PHP is enabled.` }; }
  if (!r.ok || j.error){
    if (r.status === 401 && editing){ exitEdit(true); }
    throw Object.assign(new Error(j.error || 'Request failed'), { status:r.status, data:j });
  }
  return j;
}
async function withBusy(btn, fn){
  btn?.classList.add('busy');
  try { return await fn(); } finally { btn?.classList.remove('busy'); }
}

/* ======================================================================
   SHEETS (dialogs)
   ====================================================================== */
function openSheet(id){ const d = $('#' + id); if (!d.open) d.showModal(); return d; }
function closeSheet(id){ const d = $('#' + id); if (d.open) d.close(); }
document.addEventListener('click', e => {
  const c = e.target.closest('[data-close]'); if (c) c.closest('dialog').close();
  const o = e.target.closest('[data-open]'); if (o) openSheetFor(o.dataset.open);
});
$$('dialog.sheet').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));

function confirmBox(title, text, yes = 'Delete'){
  return new Promise(res => {
    const d = $('#confirmSheet');
    $('#confirmTitle').textContent = title; $('#confirmText').textContent = text; $('#confirmYes').textContent = yes;
    d.returnValue = '';
    d.addEventListener('close', () => res(d.returnValue === 'yes'), { once:true });
    d.showModal();
  });
}

function seg(el, value){
  $$('button', el).forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === String(value))));
}
$$('.seg').forEach(el => el.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  seg(el, b.dataset.v); el.dispatchEvent(new CustomEvent('change', { detail:b.dataset.v }));
}));

/* ======================================================================
   AUTH / EDIT MODE
   ====================================================================== */
let editOpening = false;
/* One login for the whole site: if you are not logged in, the site's Welcome box opens (same password, same two-step code). */
$('#editBtn').addEventListener('click', async () => {
  if (editOpening) return;
  editOpening = true;
  const btn = $('#editBtn');
  btn.classList.add('busy'); btn.textContent = 'Opening…';
  try {
    let s = await api('state');
    if (!s.admin){
      if (!window.HUB) throw new Error('The site login is not available. Reload the page.');
      btn.classList.remove('busy'); btn.textContent = 'Edit';
      await HUB.login();
      s = await api('state');
    }
    CSRF = s.csrf; await enterEdit();
  } catch (e){ if (e && e.message) toast(e.message, true); }
  finally { editOpening = false; btn.classList.remove('busy'); btn.textContent = 'Edit'; }
});

async function enterEdit(){
  try {
    ADMIN = await api('admin_data');
    editing = true;
    document.body.classList.add('editing');
    $('#toolbar').hidden = false;
    renderBoard();
  } catch (e){ toast(e.message, true); }
}
function exitEdit(loggedOut = false){
  editing = false;
  document.body.classList.remove('editing');
  $('#toolbar').hidden = true;
  $$('dialog[open]').forEach(d => d.close());
  if (loggedOut){ CSRF = null; ADMIN = null; toast('You were logged out. Log in again to keep editing.', true); }
  renderBoard();
}
$('#doneBtn').addEventListener('click', () => exitEdit());
$('#logoutBtn').addEventListener('click', async () => {
  try { await api('logout', {}); } catch {}
  CSRF = null; ADMIN = null; exitEdit(); toast('Logged out');
});

/** Save the whole site and refresh local copies. */
async function saveAll(msg = 'Saved'){
  const r = await api('save', stripAdmin(ADMIN));
  ADMIN = r.site; PUB = { ...r.public, first:null };
  renderBoard(); applyPageMeta(ADMIN);
  if (msg) toast(msg);
  return r;
}
function stripAdmin(a){
  const { uploadsAdmin, sourceInfo, keyInfo, poolStats, limits, starterInfo, ...rest } = a;
  return rest;
}

/* ======================================================================
   BOARD INTERACTIONS (edit mode)
   ====================================================================== */
function findLink(id){
  for (let c = 0; c < 2; c++){
    const i = ADMIN.columns[c].findIndex(l => l.id === id);
    if (i > -1) return { c, i, link:ADMIN.columns[c][i] };
  }
  return null;
}

$('#board').addEventListener('click', async e => {
  if (!editing) return;
  const add = e.target.closest('[data-add]');
  if (add) return openLinkSheet(null, +add.dataset.add);
  const li = e.target.closest('.lk[data-id]');
  if (!li || li.dataset.justDragged) return;
  const act = e.target.closest('[data-act]')?.dataset.act;
  const f = findLink(li.dataset.id);
  if (!f) return;
  if (act === 'del'){
    if (!(await confirmBox('Delete link?', `“${f.link.name}” will be removed from your page.`))) return;
    ADMIN.columns[f.c].splice(f.i, 1);
    try { await saveAll('Link deleted'); } catch (err){ toast(err.message, true); }
    return;
  }
  openLinkSheet(f.link.id);
});

/* --- pointer-based drag and drop (mouse + touch) --- */
let drag = null;
$('#board').addEventListener('pointerdown', e => {
  if (!editing || e.button > 0) return;
  const li = e.target.closest('.lk[data-id]');
  if (!li || e.target.closest('.lk-tools')) return;
  drag = { li, startX:e.clientX, startY:e.clientY, active:false, pid:e.pointerId };
});
addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.pid) return;
  if (!drag.active){
    if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 6) return;
    startDrag(e);
  }
  moveDrag(e);
});
addEventListener('pointerup', e => { if (drag && e.pointerId === drag.pid) endDrag(); });
addEventListener('pointercancel', () => { if (drag) endDrag(true); });

function startDrag(e){
  const li = drag.li, r = li.getBoundingClientRect();
  drag.active = true;
  drag.dx = e.clientX - r.left; drag.dy = e.clientY - r.top;
  drag.fromCol = li.parentElement;
  drag.ph = document.createElement('li');
  drag.ph.className = 'drop-ph';
  drag.ph.style.height = r.height + 'px';
  li.after(drag.ph);
  li.classList.add('drag-ghost');
  Object.assign(li.style, { width:r.width + 'px', left:r.left + 'px', top:r.top + 'px' });
  document.body.appendChild(li);
  try { li.setPointerCapture?.(drag.pid); } catch {}
}
function moveDrag(e){
  const li = drag.li;
  li.style.left = (e.clientX - drag.dx) + 'px';
  li.style.top  = (e.clientY - drag.dy) + 'px';

  // which column is the pointer over? (closest by x if between)
  const cols = $$('#board .col');
  let col = cols.find(c => { const r = c.getBoundingClientRect(); return e.clientX >= r.left - 12 && e.clientX <= r.right + 12; });
  if (!col){
    col = cols.reduce((best, c) => {
      const r = c.getBoundingClientRect(), d = Math.abs(e.clientX - (r.left + r.right) / 2);
      return !best || d < best.d ? { c, d } : best;
    }, null).c;
  }
  // on phones columns stack vertically: choose by y
  if (getComputedStyle($('#board')).gridTemplateColumns.split(' ').length === 1){
    col = cols.find(c => { const r = c.getBoundingClientRect(); return e.clientY <= r.bottom + 10; }) || cols[cols.length - 1];
  }

  const items = $$(':scope > .lk[data-id]', col);
  const count = items.length + (drag.ph.parentElement === col ? 0 : 0);
  if (col !== drag.ph.parentElement && count >= PER_COL){
    if (!col.classList.contains('full-warn')){ col.classList.add('full-warn'); setTimeout(() => col.classList.remove('full-warn'), 350); }
    return;
  }
  const before = items.find(it => { const r = it.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; });
  if (before) col.insertBefore(drag.ph, before);
  else {
    const addLi = $(':scope > .add-li', col);
    addLi ? col.insertBefore(drag.ph, addLi) : col.appendChild(drag.ph);
  }
}
async function endDrag(cancel = false){
  const d = drag; drag = null;
  if (!d.active) return;
  const li = d.li;
  li.classList.remove('drag-ghost'); li.removeAttribute('style');
  d.ph.replaceWith(li);
  li.dataset.justDragged = '1'; setTimeout(() => delete li.dataset.justDragged, 50);
  if (cancel){ renderBoard(); return; }

  // Read the new order from the DOM
  const byId = {};
  ADMIN.columns.flat().forEach(l => byId[l.id] = l);
  const next = $$('#board .col').map(c => $$(':scope > .lk[data-id]', c).map(x => byId[x.dataset.id]).filter(Boolean));
  if (JSON.stringify(next.map(c => c.map(l => l.id))) === JSON.stringify(ADMIN.columns.map(c => c.map(l => l.id)))) return;
  ADMIN.columns = next;
  renderBoard();
  try { await saveAll('Order saved'); } catch (err){ toast(err.message, true); }
}

/* ======================================================================
   LINK SHEET
   ====================================================================== */
let linkDraft = null;
function openLinkSheet(id, col = 0){
  const f = id ? findLink(id) : null;
  linkDraft = f
    ? { id:f.link.id, name:f.link.name, url:f.link.url, icon:{ ...f.link.icon }, col:f.c, origCol:f.c }
    : { id:null, name:'', url:'', icon:{ type:'auto', value:'' }, col, origCol:null };

  $('#linkSheetTitle').textContent = id ? 'Edit link' : 'Add link';
  $('#lDelete').hidden = !id;
  $('#lUrl').value = linkDraft.url;
  $('#lName').value = linkDraft.name;
  $('#lEmoji').value = linkDraft.icon.type === 'emoji' ? linkDraft.icon.value : '';
  $('#linkErr').textContent = '';
  // disable a full column (unless the link is already in it)
  $$('#lCol button').forEach(b => {
    const c = +b.dataset.v;
    b.disabled = ADMIN.columns[c].length >= PER_COL && linkDraft.origCol !== c;
  });
  if ($(`#lCol button[data-v="${linkDraft.col}"]`).disabled) linkDraft.col = linkDraft.col ? 0 : 1;
  seg($('#lCol'), linkDraft.col);
  setIconType(linkDraft.icon.type);
  openSheet('linkSheet');
  (id ? $('#lName') : $('#lUrl')).focus();
}
function setIconType(t){
  linkDraft.icon.type = t;
  seg($('#lIconType'), t);
  $$('#linkSheet [data-pane]').forEach(p => p.hidden = p.dataset.pane !== t);
  refreshLinkPreview();
}
function refreshLinkPreview(){
  const l = { name:$('#lName').value, url:$('#lUrl').value.trim(), icon:{ ...linkDraft.icon } };
  if (l.icon.type === 'emoji') l.icon.value = $('#lEmoji').value.trim();
  if (l.url && !/^https?:\/\//i.test(l.url)) l.url = 'https://' + l.url;
  const box = $('#lIconPreview');
  box.innerHTML = (l.icon.type !== 'auto' && !l.icon.value) || (!l.url && l.icon.type === 'auto') ? '' : iconHTML(l);
  wireIconFallbacks(box);
}
$('#lIconType').addEventListener('change', e => setIconType(e.detail));
$('#lCol').addEventListener('change', e => linkDraft.col = +e.detail);
$('#lEmoji').addEventListener('input', refreshLinkPreview);
let previewT;
$('#lUrl').addEventListener('input', () => { clearTimeout(previewT); previewT = setTimeout(refreshLinkPreview, 400); });
$('#lName').addEventListener('input', refreshLinkPreview);

$('#lGetTitle').addEventListener('click', e => withBusy(e.currentTarget, async () => {
  $('#linkErr').textContent = '';
  try { const r = await api('get_title', { url:$('#lUrl').value }); $('#lName').value = r.title; refreshLinkPreview(); }
  catch (err){ $('#linkErr').textContent = err.message; }
}));
$('#lFetchIcon').addEventListener('click', e => withBusy(e.currentTarget, async () => {
  $('#linkErr').textContent = '';
  try { const r = await api('fetch_icon', { url:$('#lUrl').value }); linkDraft.icon = { type:'image', value:r.path }; refreshLinkPreview(); }
  catch (err){ $('#linkErr').textContent = err.message; }
}));
$('#lUploadIcon').addEventListener('click', () => $('#lIconFile').click());
$('#lIconFile').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  $('#linkErr').textContent = '';
  try {
    const fd = new FormData(); fd.append('file', f);
    const r = await api('upload_icon', fd, true);
    linkDraft.icon = { type:'image', value:r.path }; refreshLinkPreview();
  } catch (err){ $('#linkErr').textContent = err.message; }
});

$('#linkForm').addEventListener('submit', async e => {
  e.preventDefault();
  const url = $('#lUrl').value.trim();
  if (!url){ $('#linkErr').textContent = 'Enter the web address.'; return; }
  const icon = { ...linkDraft.icon };
  if (icon.type === 'emoji') icon.value = $('#lEmoji').value.trim();
  if (icon.type !== 'auto' && !icon.value){
    $('#linkErr').textContent = icon.type === 'emoji' ? 'Type an emoji, or choose Automatic.' : 'Fetch or upload an image, or choose Automatic.';
    return;
  }
  const link = { id:linkDraft.id || undefined, name:$('#lName').value.trim(), url, icon };
  const before = JSON.stringify(ADMIN.columns);

  if (linkDraft.id){
    const f = findLink(linkDraft.id);
    if (f.c === linkDraft.col) ADMIN.columns[f.c][f.i] = link;
    else { ADMIN.columns[f.c].splice(f.i, 1); ADMIN.columns[linkDraft.col].push(link); }
  } else {
    ADMIN.columns[linkDraft.col].push(link);
  }
  try {
    await withBusy(e.submitter, () => saveAll(linkDraft.id ? 'Link saved' : 'Link added'));
    closeSheet('linkSheet');
  } catch (err){
    ADMIN.columns = JSON.parse(before);
    $('#linkErr').textContent = err.message;
  }
});
$('#lDelete').addEventListener('click', async () => {
  const f = findLink(linkDraft.id); if (!f) return;
  closeSheet('linkSheet');
  if (!(await confirmBox('Delete link?', `“${f.link.name}” will be removed from your page.`))){ openSheet('linkSheet'); return; }
  ADMIN.columns[f.c].splice(f.i, 1);
  try { await saveAll('Link deleted'); } catch (err){ toast(err.message, true); }
});

/* ======================================================================
   SETTINGS SHEET
   ====================================================================== */
let settingsDraft = null;
function openSheetFor(id){
  if (id === 'settingsSheet') return openSettings();
  if (id === 'bgSheet') return openBg();
  openSheet(id);
}
function openSettings(){
  settingsDraft = { title:ADMIN.title, icon:ADMIN.icon, panel:{ ...ADMIN.panel } };
  $('#sTitle').value = settingsDraft.title;
  $('#sWelcome').value = ADMIN.welcome ?? 'Welcome Home';
  $('#pOpacity').value = Math.round(settingsDraft.panel.opacity * 100); $('#pOpVal').textContent = $('#pOpacity').value + '%';
  $('#pBlur').value = settingsDraft.panel.blur; $('#pBlurVal').textContent = settingsDraft.panel.blur + 'px';
  openSheet('settingsSheet');
}
$('#pOpacity').addEventListener('input', e => { settingsDraft.panel.opacity = e.target.value / 100; $('#pOpVal').textContent = e.target.value + '%'; applyPanel(settingsDraft.panel); });
$('#pBlur').addEventListener('input', e => { settingsDraft.panel.blur = +e.target.value; $('#pBlurVal').textContent = e.target.value + 'px'; applyPanel(settingsDraft.panel); });
$('#settingsSheet').addEventListener('close', () => { if (ADMIN) applyPanel(ADMIN.panel); });
$('#saveSettings').addEventListener('click', e => withBusy(e.currentTarget, async () => {
  const prev = { title:ADMIN.title, icon:ADMIN.icon, panel:ADMIN.panel, welcome:ADMIN.welcome };
  ADMIN.title = $('#sTitle').value.trim() || 'Home';
  ADMIN.welcome = $('#sWelcome').value.trim();
  ADMIN.icon = '';   // no separate start page icon any more: the site logo is used
  ADMIN.panel = settingsDraft.panel;
  try {
    await saveAll('Settings saved');
    closeSheet('settingsSheet');
  } catch (err){ Object.assign(ADMIN, prev); toast(err.message, true); }
}));

/* ======================================================================
   BACKGROUND SHEET
   ====================================================================== */
let bgDraft = null;
function openBg(){
  bgDraft = structuredClone(ADMIN.bg);
  bgDraft.custom = bgDraft.custom || [];
  customDirty = false;
  renderThemes(); renderSources(); renderKeys(); renderCustom();
  $('#bgQuery').value = bgDraft.query;
  $('#bgVideo').value = Math.round(bgDraft.videoChance * 100);
  $('#videoVal').textContent = $('#bgVideo').value + '%';
  $('#bgChance').value = Math.round(bgDraft.uploadChance * 100);
  $('#chanceVal').textContent = $('#bgChance').value + '%';
  $('#bgDim').value = Math.round(bgDraft.dim * 100);
  $('#dimVal').textContent = $('#bgDim').value + '%';
  $('#bgMotion').checked = bgDraft.motion;
  seg($('#bgRotate'), bgDraft.rotate);
  renderThumbs(ADMIN.uploadsAdmin || []);
  openSheet('bgSheet');
}
/* Theme cards: Starter (comes with the app; Remove hides it, Bring Back shows it again) and Online Photos (the sources below) */
function renderThemes(){
  const st = ADMIN.starterInfo || [], on = bgDraft.theme || 'online', off = !!bgDraft.starterOff;
  const thumb = i => `<img src="${esc(media(i.poster || i.url))}" alt="" loading="lazy">`;
  const vids = st.filter(i => i.type === 'video').length, pics = st.length - vids;
  const what = [vids ? vids + (vids === 1 ? ' video' : ' videos') : '', pics ? pics + (pics === 1 ? ' photo' : ' photos') : ''].filter(Boolean).join(', ');
  const mosaic = list => { const k = list.length >= 5 ? 5 : Math.min(list.length, 3); return { n:k, html:list.slice(0, k).join('') }; };   // 1, 2, 3 or 5 pictures fill the frame
  const card = (id, name, about, thumbs, acts) => { const m = Array.isArray(thumbs) ? mosaic(thumbs) : { n:0, html:thumbs };
    return `<div class="theme${on === id ? ' on' : ''}" data-theme="${id}"><div class="theme-mos" data-n="${m.n}">${m.html}</div>
    <div class="theme-b"><b>${name}${on === id ? ' <span class="pill">In Use</span>' : ''}</b><small>${about}</small><div class="theme-acts">${acts}</div></div></div>`; };
  $('#themeRows').innerHTML = (off
      ? `<div class="theme off"><div class="theme-b"><b>Starter</b><small>Removed. It comes with the app, so you can bring it back.</small><div class="theme-acts"><button type="button" class="btn small" data-t="back">Bring Back Starter</button></div></div></div>`
      : card('starter', 'Starter', esc(what || 'Comes with the app') + (st[0]?.type === 'video' ? ' · ' + esc(st[0].credit) + ' first' : ''), st.map(thumb),
          (on === 'starter' ? '' : '<button type="button" class="btn small primary" data-t="use-starter">Use</button>') + '<button type="button" class="btn small danger" data-t="remove">Remove</button>'))
    + card('online', 'Online Photos', 'The photo sources below. New photos arrive by themselves.', '<span class="theme-ph">Picsum · Bing · Wikimedia · Wallhaven</span>',
        on === 'online' ? '' : '<button type="button" class="btn small primary" data-t="use-online">Use</button>')
    + (bgDraft.themes || []).map(t => {
        const ups = (ADMIN.uploadsAdmin || []).filter(u => t.items.includes(u.url));
        const th = ups.length ? ups.map(u => u.type === 'video' ? `<video src="${esc(media(u.url))}#t=0.5" muted preload="metadata"></video>` : `<img src="${esc(media(u.url))}" alt="" loading="lazy">`) : '<span class="theme-ph">No backgrounds yet</span>';
        const id = 't:' + t.id;
        return card(id, esc(t.name), ups.length + (ups.length === 1 ? ' background' : ' backgrounds') + ' · your own', th,
          (on === id || !ups.length ? '' : `<button type="button" class="btn small primary" data-t="use" data-id="${t.id}">Use</button>`)
          + `<button type="button" class="btn small" data-t="edit" data-id="${t.id}">Edit</button><button type="button" class="btn small" data-t="export" data-id="${t.id}"${ups.length ? '' : ' disabled'}>Export</button>`);
      }).join('')
    + ((bgDraft.themes || []).length < 8 ? `<div class="theme new"><div class="theme-mos"><span class="theme-ph">+</span></div><div class="theme-b"><b>New Theme</b><small>Make one from your uploads, or import a theme file.</small>
        <div class="theme-acts"><button type="button" class="btn small" data-t="new">Make a Theme</button><button type="button" class="btn small" data-t="import">Import</button></div></div></div>` : '');
}
$('#themeRows').addEventListener('click', e => {
  const b = e.target.closest('[data-t]'); if (!b) return;
  const t = b.dataset.t;
  if (t === 'use-starter') bgDraft.theme = 'starter';
  else if (t === 'use-online') bgDraft.theme = 'online';
  else if (t === 'remove'){ bgDraft.starterOff = true; bgDraft.theme = 'online'; }
  else if (t === 'back'){ bgDraft.starterOff = false; bgDraft.theme = 'starter'; }
  else if (t === 'use') bgDraft.theme = 't:' + b.dataset.id;
  else if (t === 'new') return openTheme(null);
  else if (t === 'edit') return openTheme(b.dataset.id);
  else if (t === 'import') return $('#themeFile').click();
  else if (t === 'export') return withBusy(b, () => exportTheme(bgDraft.themes.find(x => x.id === b.dataset.id)));
  renderThemes();
});

/* Your own theme: a name and the uploads it takes turns with. Kept in bgDraft until Save Background. */
let themeEdit = null;
function openTheme(id){
  const t = id ? bgDraft.themes.find(x => x.id === id) : null;
  themeEdit = { id, name:t ? t.name : '', items:t ? [...t.items] : [] };
  $('#themeTitle').textContent = t ? 'Edit Theme' : 'New Theme';
  $('#tDelete').hidden = !t;
  $('#tName').value = themeEdit.name;
  drawThemePick();
  openSheet('themeSheet');
}
function drawThemePick(){
  const ups = ADMIN.uploadsAdmin || [];
  $('#tPick').innerHTML = ups.length ? ups.map(u => `<label class="thumb${themeEdit.items.includes(u.url) ? ' sel' : ''}">
      ${u.type === 'video' ? `<video src="${esc(media(u.url))}#t=0.5" muted preload="metadata"></video><span class="badge">Video</span>` : `<img src="${esc(media(u.url))}" alt="" loading="lazy">`}
      <input type="checkbox" data-u="${esc(u.url)}"${themeEdit.items.includes(u.url) ? ' checked' : ''} aria-label="Use this background"></label>`).join('')
    : '<p class="hint">No uploads yet. Close this, drop pictures or videos under Your Uploads, then make the theme.</p>';
  $('#tCount').textContent = themeEdit.items.length ? '(' + themeEdit.items.length + ' chosen)' : '';
}
$('#tPick').addEventListener('change', e => {
  const c = e.target.closest('[data-u]'); if (!c) return;
  themeEdit.items = c.checked ? [...themeEdit.items, c.dataset.u] : themeEdit.items.filter(u => u !== c.dataset.u);
  c.closest('.thumb').classList.toggle('sel', c.checked);
  $('#tCount').textContent = themeEdit.items.length ? '(' + themeEdit.items.length + ' chosen)' : '';
});
$('#themeForm').addEventListener('submit', e => {
  const name = $('#tName').value.trim();
  if (!name){ e.preventDefault(); $('#tName').focus(); return; }
  if (!themeEdit.items.length){ e.preventDefault(); toast('Choose at least one background.', true); return; }
  bgDraft.themes = bgDraft.themes || [];
  const t = themeEdit.id && bgDraft.themes.find(x => x.id === themeEdit.id);
  if (t) Object.assign(t, { name, items:themeEdit.items });
  else { const id = crypto.getRandomValues(new Uint32Array(1))[0].toString(16).padStart(8, '0'); bgDraft.themes.push({ id, name, items:themeEdit.items }); bgDraft.theme = 't:' + id; }
  renderThemes();
});
$('#tDelete').addEventListener('click', () => {
  bgDraft.themes = bgDraft.themes.filter(x => x.id !== themeEdit.id);
  if (bgDraft.theme === 't:' + themeEdit.id) bgDraft.theme = bgDraft.starterOff ? 'online' : 'starter';
  closeSheet('themeSheet'); renderThemes();
});

/* A theme file is a plain zip (stored, not compressed: pictures and videos are compressed already) with theme.json and the files. */
const ZIP = (() => {
  const CRC = new Uint32Array(256);
  for (let n = 0; n < 256; n++){ let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; }
  const crc = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const enc = new TextEncoder();
  function make(files){   // [[name, Uint8Array]] -> Blob
    const parts = [], cd = []; let off = 0;
    for (const [name, d] of files){
      const n = enc.encode(name), c = crc(d), h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint32(14, c, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true); h.setUint16(26, n.length, true);
      parts.push(new Uint8Array(h.buffer), n, d);
      const e = new DataView(new ArrayBuffer(46));
      e.setUint32(0, 0x02014b50, true); e.setUint16(4, 20, true); e.setUint16(6, 20, true); e.setUint16(8, 0x0800, true); e.setUint32(16, c, true); e.setUint32(20, d.length, true); e.setUint32(24, d.length, true); e.setUint16(28, n.length, true); e.setUint32(42, off, true);
      cd.push(new Uint8Array(e.buffer), n); off += 30 + n.length + d.length;
    }
    const len = cd.reduce((s, x) => s + x.length, 0), end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, len, true); end.setUint32(16, off, true);
    return new Blob([...parts, ...cd, new Uint8Array(end.buffer)], { type:'application/zip' });
  }
  function read(buf){   // a zip made by make() -> { name: Uint8Array }; null for anything else
    const v = new DataView(buf), out = {}, dec = new TextDecoder(); let p = 0;
    while (p + 30 <= buf.byteLength && v.getUint32(p, true) === 0x04034b50){
      if (v.getUint16(p + 8, true) !== 0 || (v.getUint16(p + 6, true) & 8)) return null;   // only stored entries with their sizes up front
      const size = v.getUint32(p + 18, true), nl = v.getUint16(p + 26, true), xl = v.getUint16(p + 28, true);
      const name = dec.decode(new Uint8Array(buf, p + 30, nl)), at = p + 30 + nl + xl;
      if (at + size > buf.byteLength) return null;
      out[name] = new Uint8Array(buf, at, size); p = at + size;
    }
    return Object.keys(out).length ? out : null;
  }
  return { make, read };
})();
async function exportTheme(t){
  if (!t) return;
  const ups = (ADMIN.uploadsAdmin || []).filter(u => t.items.includes(u.url));
  const files = [], items = [];
  for (const [i, u] of ups.entries()){
    const r = await fetch(media(u.url), { credentials:'same-origin' }); if (!r.ok) continue;
    const name = String(i + 1).padStart(2, '0') + '.' + u.url.split('.').pop();
    files.push([name, new Uint8Array(await r.arrayBuffer())]); items.push({ file:name, type:u.type });
  }
  files.unshift(['theme.json', new TextEncoder().encode(JSON.stringify({ format:'homebase-theme', version:1, name:t.name, items }, null, 2))]);
  const a = document.createElement('a'); a.href = URL.createObjectURL(ZIP.make(files));
  a.download = 'theme-' + (t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mine') + '.zip';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Theme exported');
}
$('#themeFile').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  const bad = () => toast('That file isn\'t a Homebase Hub theme. Choose a file made with Export.', true);
  let zip, meta;
  try { zip = ZIP.read(await f.arrayBuffer()); meta = zip && JSON.parse(new TextDecoder().decode(zip['theme.json'])); } catch { zip = null; }
  if (!zip || !meta || meta.format !== 'homebase-theme' || !Array.isArray(meta.items)) return bad();
  const MIME = { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', webp:'image/webp', gif:'image/gif', avif:'image/avif', mp4:'video/mp4', webm:'video/webm' };
  const got = [];
  $('#prog').classList.add('on');
  for (const it of meta.items.slice(0, 60)){
    const data = zip[it.file], ext = String(it.file || '').split('.').pop().toLowerCase();
    if (!data || !MIME[ext]) continue;
    try { $('#prog i').style.width = '0'; const r = await uploadOne(new File([data], it.file, { type:MIME[ext] })); if (r.uploads) renderThumbs(r.uploads); if (r.file) got.push(r.file); }
    catch (err){ toast(`${it.file}: ${err.message}`, true); }
  }
  $('#prog').classList.remove('on');
  if (!got.length) return bad();
  const id = crypto.getRandomValues(new Uint32Array(1))[0].toString(16).padStart(8, '0');
  let name = String(meta.name || 'Imported Theme').slice(0, 36), n = 1;
  const taken = new Set((bgDraft.themes || []).map(t => t.name));
  while (taken.has(n === 1 ? name : name + ' ' + n)) n++;
  bgDraft.themes = [...(bgDraft.themes || []), { id, name:n === 1 ? name : name + ' ' + n, items:got }];
  bgDraft.theme = 't:' + id;
  renderThemes();
  toast(`Imported ${got.length} background${got.length === 1 ? '' : 's'}. Press Save Background to use the theme.`);
});
function renderSources(){
  const info = ADMIN.sourceInfo, stats = ADMIN.poolStats || {};
  $('#sourceRows').innerHTML = Object.entries(info).filter(([, s]) => !s.custom).map(([k, s]) => {
    const on = !!bgDraft.sources[k];
    const st = stats[k] || { count:0, target:0, error:null };
    const missingKey = s.key && !bgDraft.keys[s.key];
    let status = '';
    if (on && missingKey) status = `<div class="src-status bad">Needs your ${esc(ADMIN.keyInfo[s.key].name)} key (below)</div>`;
    else if (on) status = `<div class="src-status ${st.error && !st.count ? 'bad' : ''}">${st.count} of ${st.target} ${s.video ? 'videos' : 'photos'} saved${st.error ? ` <span class="src-err">Last problem: ${esc(st.error)}</span>` : ''}</div>`;
    return `<div class="g-row stack src-row">
      <div class="src-head">
        <span class="g-label">${esc(s.name)}<small>${esc(s.about)}</small></span>
        <span class="src-tools">
          <button type="button" class="btn small ghost" data-preview="${k}">Preview</button>
          <input type="checkbox" class="switch" data-src="${k}" ${on ? 'checked' : ''} aria-label="Use ${esc(s.name)}">
        </span>
      </div>${status}</div>`;
  }).join('');
}
function renderCustom(){
  const stats = ADMIN.poolStats || {};
  const list = bgDraft.custom || [];
  $('#customRows').hidden = !list.length;
  $('#addCustom').hidden = list.length >= ADMIN.limits.maxCustom;
  $('#customRows').innerHTML = list.map((c, i) => {
    const k = 'c' + c.id, on = bgDraft.sources[k] !== false && !!bgDraft.sources[k];
    const st = stats[k];
    let host = ''; try { host = new URL(c.url.replace(/\{[a-z]+\}/g, 'x')).hostname; } catch {}
    const status = !on ? '' : st
      ? `<div class="src-status ${st.error && !st.count ? 'bad' : ''}">${st.count} of ${st.target} ${c.type === 'video' ? 'videos' : 'photos'} saved${st.error ? ` <span class="src-err">Last problem: ${esc(st.error)}</span>` : ''}</div>`
      : `<div class="src-status">Save to start downloading.</div>`;
    return `<div class="g-row stack src-row">
      <div class="src-head">
        <span class="g-label">${esc(c.name)}<small>${c.kind === 'image' ? 'Image address' : 'JSON API'} on ${esc(host)}${c.type === 'video' ? ', videos' : ''}</small></span>
        <span class="src-tools">
          <button type="button" class="btn small ghost" data-cedit="${i}">Edit</button>
          <button type="button" class="btn small ghost" data-preview="${k}">Preview</button>
          <input type="checkbox" class="switch" data-src="${k}" ${on ? 'checked' : ''} aria-label="Use ${esc(c.name)}">
        </span>
      </div>${status}</div>`;
  }).join('');
}
$('#customRows').addEventListener('change', e => {
  const k = e.target.dataset.src; if (!k) return;
  bgDraft.sources[k] = e.target.checked; renderCustom();
});
$('#customRows').addEventListener('click', e => {
  const ed = e.target.closest('[data-cedit]');
  if (ed) openCustom(+ed.dataset.cedit);
});
function renderKeys(){
  $('#keyRows').innerHTML = Object.entries(ADMIN.keyInfo).map(([k, info]) => `
    <div class="g-row stack">
      <span class="g-label">${esc(info.name)} key<small>${esc(info.help)} <a href="${esc(info.url)}" target="_blank" rel="noopener" class="ext">Get a Free Key</a></small></span>
      <input type="text" data-key="${k}" value="${esc(bgDraft.keys[k] || '')}" placeholder="Paste your ${esc(info.name)} key" autocomplete="off" spellcheck="false">
    </div>`).join('');
}
$('#keyRows').addEventListener('input', e => {
  const k = e.target.dataset.key; if (!k) return;
  bgDraft.keys[k] = e.target.value.trim(); renderSources();
});
$('#sourceRows').addEventListener('change', e => {
  const k = e.target.dataset.src; if (!k) return;
  bgDraft.sources[k] = e.target.checked; renderSources();
});
async function previewSource(e){
  const b = e.target.closest('[data-preview]'); if (!b) return;
  const k = b.dataset.preview, s = ADMIN.sourceInfo[k];
  if (!s || customDirty){ toast('Save your changes first, then preview.', true); return; }
  if (s.key && !bgDraft.keys[s.key]){ toast(`Add your ${ADMIN.keyInfo[s.key].name} key below, then save.`, true); return; }
  if (JSON.stringify(bgDraft.keys) !== JSON.stringify(ADMIN.bg.keys) || bgDraft.query !== ADMIN.bg.query){
    toast('Save your changes first, then preview.', true); return;
  }
  b.textContent = 'Loading…';
  await withBusy(b, async () => {
    try {
      const r = await api('photo_now', { src:k });
      ADMIN.poolStats = r.stats; renderSources(); renderCustom();
      if (!(PUB.bg.photos || []).some(p => p.url === r.photo.url)) PUB.bg.photos = [...(PUB.bg.photos || []), r.photo];
      await BG.show(r.photo, { count:false });
    } catch (err){
      if (err.data?.stats){ ADMIN.poolStats = err.data.stats; renderSources(); renderCustom(); }
      toast(err.message, true);
    }
  });
  const btn = $(`[data-preview="${k}"]`); if (btn) btn.textContent = 'Preview';
}
$('#sourceRows').addEventListener('click', previewSource);
$('#customRows').addEventListener('click', previewSource);
$('#bgQuery').addEventListener('input', e => bgDraft.query = e.target.value);
$('#bgVideo').addEventListener('input', e => { bgDraft.videoChance = e.target.value / 100; $('#videoVal').textContent = e.target.value + '%'; });
$('#bgChance').addEventListener('input', e => { bgDraft.uploadChance = e.target.value / 100; $('#chanceVal').textContent = e.target.value + '%'; });
$('#bgDim').addEventListener('input', e => { bgDraft.dim = e.target.value / 100; $('#dimVal').textContent = e.target.value + '%'; document.documentElement.style.setProperty('--dim', bgDraft.dim); });
$('#bgMotion').addEventListener('change', e => bgDraft.motion = e.target.checked);
$('#bgRotate').addEventListener('change', e => bgDraft.rotate = +e.detail);
$('#bgSheet').addEventListener('close', () => document.documentElement.style.setProperty('--dim', ADMIN ? ADMIN.bg.dim : PUB.bg.dim));

$('#saveBg').addEventListener('click', e => withBusy(e.currentTarget, async () => {
  const prev = ADMIN.bg;
  ADMIN.bg = bgDraft;
  const missing = [...new Set(Object.entries(ADMIN.sourceInfo).filter(([k, s]) => s.key && bgDraft.sources[k] && !bgDraft.keys[s.key]).map(([, s]) => s.name))];
  try {
    await saveAll(missing.length ? `Saved. ${missing.join(' and ')} stay off until you add a key.` : 'Background saved');
    $$('#bg > img').forEach(n => n.classList.toggle('kb', ADMIN.bg.motion && !REDUCED));
    BG.schedule();
    customDirty = false;
    if (PUB.bg.refill) BG.refill(false);   // start downloading photos for newly enabled sources
    closeSheet('bgSheet');
  } catch (err){ ADMIN.bg = prev; toast(err.message, true); }
}));

/* custom source sheet */
const PRESETS = {
  openverse: { name:'Openverse', kind:'json', type:'image', url:'https://api.openverse.org/v1/images/?q={keyword}&aspect_ratio=wide&size=large&mature=false&page_size=40&page={page}', headers:'', list:'results', image:'url', credit:'creator', link:'foreign_landing_url' },
  pexels:    { name:'Pexels', kind:'json', type:'image', url:'https://api.pexels.com/v1/search?query={keyword}&orientation=landscape&size=large&per_page=40&page={page}', headers:'Authorization: YOUR_PEXELS_KEY', list:'photos', image:'src.original', credit:'photographer', link:'url' },
  image:     { name:'Picsum (example)', kind:'image', type:'image', url:'https://picsum.photos/{width}/1440?random={random}', headers:'', list:'', image:'', credit:'', link:'' },
};
let customIdx = null, customDraft = null, customDirty = false;
function openCustom(i){
  customIdx = i;
  customDraft = i === null ? { id:null, name:'', kind:'json', type:'image', url:'', headers:'', list:'', image:'', credit:'', link:'' } : { ...bgDraft.custom[i] };
  $('#customTitle').textContent = i === null ? 'Add custom source' : 'Edit custom source';
  $('#cDelete').hidden = i === null;
  $('#customPresets').closest('.field').hidden = i !== null;
  fillCustom();
  openSheet('customSheet');
}
function fillCustom(){
  const d = customDraft;
  $('#cName').value = d.name; $('#cUrl').value = d.url; $('#cHeaders').value = d.headers;
  $('#cList').value = d.list; $('#cImage').value = d.image; $('#cCredit').value = d.credit; $('#cLink').value = d.link;
  seg($('#cKind'), d.kind); seg($('#cType'), d.type);
  $$('#customSheet [data-kind]').forEach(el => el.hidden = el.dataset.kind !== d.kind);
  $('#cTestOut').textContent = ''; $('#cTestOut').className = 'test-out'; $('#customErr').textContent = '';
}
function readCustom(){
  return { ...customDraft, name:$('#cName').value.trim(), url:$('#cUrl').value.trim(), headers:$('#cHeaders').value,
    list:$('#cList').value.trim(), image:$('#cImage').value.trim(), credit:$('#cCredit').value.trim(), link:$('#cLink').value.trim() };
}
$('#addCustom').addEventListener('click', () => openCustom(null));
$('#customPresets').addEventListener('click', e => {
  const b = e.target.closest('[data-preset]'); if (!b) return;
  customDraft = { ...customDraft, ...PRESETS[b.dataset.preset] }; fillCustom();
});
$('#cKind').addEventListener('change', e => { customDraft = readCustom(); customDraft.kind = e.detail; fillCustom(); });
$('#cType').addEventListener('change', e => { customDraft.type = e.detail; });
$('#cTest').addEventListener('click', e => withBusy(e.currentTarget, async () => {
  const out = $('#cTestOut');
  out.className = 'test-out'; out.textContent = 'Testing…';
  try { const r = await api('test_source', readCustom()); out.className = 'test-out ok'; out.textContent = r.message; }
  catch (err){ out.className = 'test-out bad'; out.textContent = err.message; }
}));
$('#customForm').addEventListener('submit', e => {
  e.preventDefault();
  const d = readCustom();
  if (!d.name){ $('#customErr').textContent = 'Give it a name.'; return; }
  if (!/^https?:\/\//i.test(d.url)){ $('#customErr').textContent = 'The address must start with https://'; return; }
  if (d.kind === 'json' && !d.image){ $('#customErr').textContent = 'Fill in where the image or video address is in the reply.'; return; }
  if (customIdx === null){
    d.id = Math.random().toString(36).slice(2, 10).replace(/[^a-z0-9]/g, 'x').padEnd(8, '0');
    bgDraft.custom.push(d);
    bgDraft.sources['c' + d.id] = true;
  } else bgDraft.custom[customIdx] = d;
  customDirty = true;
  closeSheet('customSheet');
  renderCustom();
  toast('Click “Save background” to keep it.');
});
$('#cDelete').addEventListener('click', async () => {
  closeSheet('customSheet');
  const c = bgDraft.custom[customIdx];
  if (!(await confirmBox('Delete this source?', `“${c.name}” and its saved photos are removed when you save.`))){ openSheet('customSheet'); return; }
  bgDraft.custom.splice(customIdx, 1);
  delete bgDraft.sources['c' + c.id];
  customDirty = true;
  renderCustom();
});

/* uploads */
function renderThumbs(list){
  ADMIN.uploadsAdmin = list;
  PUB.uploads = list.map(u => ({ url:u.url, type:u.type, credit:'Your upload' }));
  $('#thumbs').innerHTML = list.map(u => `
    <div class="thumb">
      ${u.type === 'video' ? `<video src="${esc(media(u.url))}#t=0.5" muted preload="metadata"></video><span class="badge">Video</span>` : `<img src="${esc(media(u.url))}" alt="" loading="lazy">`}
      <div class="acts">
        <button type="button" data-show="${esc(u.url)}" data-type="${u.type}">Show</button>
        <button type="button" class="del" data-del="${esc(u.file)}">Delete</button>
      </div>
    </div>`).join('');
}
$('#thumbs').addEventListener('click', async e => {
  const s = e.target.closest('[data-show]'), d = e.target.closest('[data-del]');
  if (s) BG.show({ url:s.dataset.show, type:s.dataset.type, credit:'Your upload' }, { count:false });
  if (d){
    if (!(await confirmBox('Delete this background?', 'The file is removed from your server.'))){ openSheet('bgSheet'); return; }
    openSheet('bgSheet');
    try { const r = await api('delete_upload', { file:d.dataset.del }); renderThumbs(r.uploads); toast('Background deleted'); }
    catch (err){ toast(err.message, true); }
  }
});
/** One POST with progress. `done` = bytes already sent before this request (for the overall bar). */
function sendForm(action, fd, done, total){
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('POST', 'api.php?action=' + action);
    x.setRequestHeader('X-CSRF-Token', CSRF);
    x.timeout = 300000;
    x.upload.onprogress = e => { if (e.lengthComputable) $('#prog i').style.width = Math.min(100, (done + e.loaded) / total * 100) + '%'; };
    x.onload = () => {
      let j; try { j = JSON.parse(x.responseText); } catch {
        j = { error: x.status === 413 ? 'The file is bigger than your host or Cloudflare accepts.' : x.status === 403 ? "Your host's firewall blocked the upload (403)." : `Upload failed (server answered ${x.status}).` };
      }
      (x.status < 300 && !j.error) ? resolve(j) : reject(new Error(j.error || 'Upload failed.'));
    };
    x.onerror = () => reject(new Error('The connection dropped during the upload. Try again.'));
    x.ontimeout = () => reject(new Error('The upload took too long. Try a smaller file or a faster connection.'));
    x.send(fd);
  });
}
const BG_OK = /^(image\/(jpeg|png|webp|gif|avif)|video\/(mp4|webm))$/;
/** Small files go in one request; bigger ones in pieces that fit the host's limit, joined on the server. */
async function uploadOne(file){
  const lim = (ADMIN && ADMIN.limits) || {}, maxMB = lim.maxUploadMB || 40, piece = lim.piece || 1572864;
  if (file.type && !BG_OK.test(file.type)) {
    throw new Error(/^video\//.test(file.type) ? 'This video type (' + file.type.replace('video/', '').toUpperCase() + ") isn't supported. Use MP4 or WebM." : 'Use JPG, PNG, WebP, GIF, AVIF, MP4 or WebM.');
  }
  if (file.size > maxMB * 1048576) throw new Error('The file is ' + (file.size / 1048576).toFixed(1) + ' MB; the most is ' + maxMB + ' MB.');
  if (file.size <= piece) { const fd = new FormData(); fd.append('file', file); return sendForm('upload', fd, 0, file.size); }
  const id = [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, '0')).join('');
  const total = Math.ceil(file.size / piece);
  let r;
  for (let i = 0; i < total; i++){
    const fd = new FormData();
    fd.append('id', id); fd.append('index', String(i)); fd.append('total', String(total)); fd.append('size', String(file.size));
    fd.append('piece', file.slice(i * piece, Math.min(file.size, (i + 1) * piece)), 'piece');
    for (let tries = 0; ; tries++){   // a dropped piece is sent again (twice at most)
      try { r = await sendForm('upload_chunk', fd, i * piece, file.size); break; }
      catch (e){ if (tries >= 2 || !/connection|too long/.test(e.message)) throw e; await new Promise(ok => setTimeout(ok, 1500)); }
    }
  }
  return r;
}
async function handleFiles(files){
  if (!files.length) return;
  $('#prog').classList.add('on');
  let ok = 0;
  for (const f of files){
    $('#prog i').style.width = '0';
    try { const r = await uploadOne(f); if (r.uploads) renderThumbs(r.uploads); ok++; }
    catch (e){ toast(`${f.name}: ${e.message}`, true); }
  }
  $('#prog').classList.remove('on');
  if (ok) toast(ok === 1 ? 'Background uploaded' : `${ok} backgrounds uploaded`);
}
const drop = $('#drop');
drop.addEventListener('click', () => $('#bgFile').click());
drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); $('#bgFile').click(); } });
$('#bgFile').addEventListener('change', e => { handleFiles([...e.target.files]); e.target.value = ''; });
['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => handleFiles([...e.dataTransfer.files]));

/* ======================================================================
   WELCOME TEXT: once per visit, in the middle; the links fade in as it slowly fades away (Settings > Page > Welcome Text)
   ====================================================================== */
function welcome(){
  const el = $('#welcome'), text = String(PUB.welcome ?? '').trim();
  if (!el || !text) return;
  try { if (sessionStorage.getItem('hl-welcomed')) return; sessionStorage.setItem('hl-welcomed', '1'); } catch (x) {}
  el.textContent = text; el.hidden = false;
  const st = $('.stage'); if (st) st.style.transition = 'none';   // hide the links at once, then let them fade in
  document.documentElement.classList.add('hl-welcome');
  if (st) { void st.offsetWidth; st.style.transition = ''; }
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
  setTimeout(() => { el.classList.add('out'); document.documentElement.classList.remove('hl-welcome'); }, 1200);
  setTimeout(() => el.remove(), 4400);   // 1.2 s on screen, then 3 s to fade away
}

/* ======================================================================
   START
   ====================================================================== */
renderBoard();
welcome();
// ?bg=picsum | bing | wikimedia | wallhaven | artic | unsplash | pixabay | pixabay_video | upload  forces a source (handy for testing)
BG.start();
$('#nextBg').addEventListener('click', () => BG.next());
addEventListener('keydown', e => {
  if (e.target.matches('input, textarea') || $$('dialog[open]').length) return;
  if (e.key === 'e' && !editing) $('#editBtn').click();
  if (e.key === 'Escape' && editing) exitEdit();
});
})();
