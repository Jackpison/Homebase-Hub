/*! Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
// @ts-check
(() => {
'use strict';

/** @type {(s: string, r?: ParentNode) => any} */   // (any: the page knows which element each id is)
const $  = (s, r = document) => r.querySelector(s);
/** @type {(s: string, r?: ParentNode) => any[]} */
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc=HUB.esc;   // the shell's HTML escaper (shell.js, loaded first)
const pick = a => a[Math.floor(Math.random() * a.length)];
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
let PUB = /** @type {any} */ (window).PUB;      // what visitors see
let ADMIN = null;          // full data while logged in
let CSRF = null;
let editing = false;
/* Saved pictures are stored as "photos/…", "uploads/…" and "icons/…" and live in web/hub/media/home (before 1.29.3: next to this page). Only the address shown changes. */
const media = u => /^(photos|uploads|icons)\//.test(u || '') ? '../hub/media/home/' + u : u;

const DEFAULT_FAVICON = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='26' fill='%23111827'/><circle cx='50' cy='50' r='20' fill='%23A8D8FF'/></svg>";
let lastIcon = PUB.icon;
function setFavicon(icon){
  // Replace the <link> element: some browsers ignore a changed href on the old one.
  const old = $('#favicon');
  const link = document.createElement('link');
  link.id = 'favicon'; link.rel = 'icon'; link.sizes = 'any';
  const ext = (icon.split('.').pop() || '').toLowerCase();
  link.type = icon ? ({ ico:'image/x-icon', png:'image/png', jpg:'image/jpeg', gif:'image/gif', webp:'image/webp' }[ext] || '') : (/** @type {any} */ (window).LOGO_FAVICON ? '' : 'image/svg+xml');
  link.href = icon ? media(icon) + '?v=' + Date.now() : (/** @type {any} */ (window).LOGO_FAVICON || DEFAULT_FAVICON);
  old.replaceWith(link);
}
function applyPageMeta(src){
  document.title = src.title || 'Home';
  if (src.icon !== lastIcon){ setFavicon(src.icon); lastIcon = src.icon; }
  document.documentElement.style.setProperty('--dim', src.bg.dim);
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
portraitMQ.addEventListener?.('change', () => document.querySelectorAll('#bg > img[data-p]').forEach((/** @type {HTMLImageElement} */ n) => { n.src = bgSrc({ url:n.dataset.u, p:1 }); }));

/* ---------- animated designs (1.74.0) ----------
   A design is drawn live in the browser (designs/<id>.js, with its small .css, loaded only when it is on screen). Computers only for the heavy
   ones; Reduce Motion keeps to the designs that can stand still; a phone gets a lower pixel ratio. */
const isPhone = () => matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 700;
const designOk = i => i.type !== 'design' || !((i.design.desktop && isPhone()) || (i.design.gpu === 'webgpu' && !(/** @type {any} */ (navigator).gpu)) || (REDUCED && !i.design.still));
const DESIGNS = {
  files: {},   // id -> the promise of its files
  need(id){
    return this.files[id] ||= new Promise((res, rej) => {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = `designs/${id}.css?v=${PUB.bg.dv || 0}`; css.onerror = () => {}; document.head.appendChild(css);
      const js = document.createElement('script'); js.src = `designs/${id}.js?v=${PUB.bg.dv || 0}`;
      js.onload = () => (/** @type {any} */ (window).HubDesigns?.[id] ? res(true) : rej(new Error('design')));
      js.onerror = () => { delete this.files[id]; rej(new Error('design')); };
      document.head.appendChild(js);
    });
  },
  async load(item){
    const d = item.design; await this.need(d.id);
    const node = /** @type {any} */ (document.createElement('div')); node.className = 'design'; node.setAttribute('aria-hidden', 'true');
    const props = { ...d.props }; if (d.dpr) props.dpr = isPhone() ? 1.5 : 2;
    node._start = () => {
      try {
        node._run = /** @type {any} */ (window).HubDesigns[d.id].start(node, props);
        if (REDUCED && d.still) setTimeout(() => node._run?.update({ paused:true }), 1500);   // one still picture
      } catch { node.remove(); }
    };
    node._stop = () => { try { node._run?.destroy(); } catch {} node._run = null; };
    return node;
  },
};

const BG = {
  el: $('#bg'),
  token: 0,
  timer: 0,
  nextUp: null,          // { item, node } preloaded and ready
  preloading: null,      // { item, promise } the next one, still on its way
  stepping: false,       // the refresh button is working: another press does not start over
  cur: '',               // the address on screen

  credit(text, link){
    const a = $('#creditText');
    a.textContent = text || '';
    if (link) a.href = link; else a.removeAttribute('href');
  },
  busy(on){ $('#nextBg').classList.toggle('spin', on); },
  /* the refresh button reacts at once: the picture on screen dims a little while the next one arrives */
  wait(on){ this.busy(on); this.el.classList.toggle('wait', on); },

  load(item, wait = 20000){
    if (item.type === 'design') return DESIGNS.load(item);
    return new Promise((res, rej) => {
      // a video with a still picture: the picture shows at once, and stays where the video can't play (AV1 on an older browser, data saver, Reduce Motion)
      if (item.type === 'video' && item.poster){
        const v = document.createElement('video');
        const still = () => { const img = new Image(); img.alt = ''; img.onload = () => res(img); img.onerror = () => rej(new Error('load')); img.src = media(item.poster); };
        if (/** @type {any} */ (navigator).connection?.saveData || REDUCED || (/\.mp4$/i.test(item.url) && !v.canPlayType('video/mp4; codecs="av01.0.08M.08"'))) return still();
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
        const t = setTimeout(() => rej(new Error('timeout')), wait);
        v.oncanplay = () => { clearTimeout(t); v.oncanplay = null; res(v); };
        v.onerror = () => { clearTimeout(t); rej(new Error('load')); };
        v.src = media(item.url);
        return;
      }
      const img = new Image();
      img.alt = ''; img.decoding = 'async';
      if (item.p){ img.dataset.u = item.url; img.dataset.p = '1'; }
      const t = setTimeout(() => rej(new Error('timeout')), wait);
      img.onload = () => { clearTimeout(t); (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(() => res(img)); };
      img.onerror = () => { clearTimeout(t); rej(new Error('load')); };
      img.src = bgSrc(item);
    });
  },

  swap(node, item){
    const old = [...this.el.children];
    if (node.tagName === 'IMG' && motionOn()) node.classList.add('kb');
    this.el.appendChild(node);
    if (node._start) node._start();
    if (node.tagName === 'VIDEO') node.play().catch(() => {});
    requestAnimationFrame(() => requestAnimationFrame(() => {
      node.classList.add('on');
      old.forEach(n => n.classList.remove('on'));
      setTimeout(() => old.forEach(n => { n.remove(); if (n._stop) n._stop(); }), 1800);
    }));
    this.credit(item.credit, item.link);
    this.cur = item.url;
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
    const saveData = /** @type {any} */ (navigator).connection?.saveData;
    const all = PUB.bg.photos || [];
    const videos = saveData ? [] : all.filter(i => i.type === 'video');
    const images = all.filter(i => i.type !== 'video');
    const ups = (PUB.uploads || []).filter(u => !(saveData && u.type === 'video'));

    if (PUB.bg.theme === 'mix'){   // (1.74.1) Mix Everything: your own backgrounds, the designs and the online photos take turns, each kind in turn
      const mine = (PUB.bg.own || []).filter(i => !(saveData && i.type === 'video' && !i.poster) && designOk(i));
      const kinds = [mine, images, videos].filter(l => l.length);
      return kinds.length ? pick(fresh(pick(kinds))) : null;
    }
    if (PUB.bg.theme && PUB.bg.theme !== 'online'){   // a theme (Starter or your own): its backgrounds take turns
      const mine = (PUB.bg.own || []).filter(i => !(saveData && i.type === 'video' && !i.poster) && designOk(i));
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

  async show(item, { count = true, wait = 20000 } = {}){
    if (!item) return false;
    const my = ++this.token;
    let node;
    if (this.nextUp && this.nextUp.item.url === item.url){ node = this.nextUp.node; this.nextUp = null; }
    else {
      if (!this.stepping) this.busy(true);
      try { node = await this.load(item, wait); }
      catch { if (!this.stepping) this.busy(false); return false; }
    }
    if (my !== this.token) return false;
    if (!this.stepping) this.busy(false);
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

  /* The next background is fetched soon after one appears (a video: its still picture first), so the refresh button
     usually swaps at once. */
  preloadNext(current){
    this.nextUp = null; this.preloading = null;
    if (/** @type {any} */ (navigator).connection?.saveData) return;   // data saver: the next photo is fetched only when asked for
    const item = this.pick([current.url]);
    if (!item || item.url === current.url) return;
    // (1.71.0) on a phone a next background that is a video is fetched only when asked for (a whole video on mobile data), and a
    // photo waits 3 seconds after the page is ready, so it never slows down the start
    const phone = matchMedia('(pointer: coarse)').matches;
    if (phone && item.type === 'video') return;
    const go = () => {
      if (this.cur !== current.url) return;   // something else is on screen by now
      const p = this.load(item);
      this.preloading = { item, promise:p };
      p.then(node => { if (this.preloading?.promise !== p) return; this.preloading = null; if (this.cur !== item.url) this.nextUp = { item, node }; })
       .catch(() => { if (this.preloading?.promise === p) this.preloading = null; });
    };
    // (1.67.1) once the page has finished loading and the browser is idle, so the next photo never competes with the first one
    const idle = () => setTimeout(() => (window.requestIdleCallback ? requestIdleCallback(go, { timeout: 4000 }) : go()), phone ? 3000 : 600);
    if (document.readyState === 'complete') idle(); else addEventListener('load', idle, { once: true });
  },

  /* The refresh button (and the timer): the ready one at once; the one on its way if it arrives within 6 seconds; otherwise
     two other backgrounds, 6 seconds each. Pressing again while it works does nothing (it never starts over). */
  async next(){
    if (this.stepping) return;
    this.stepping = true; this.wait(true);
    try {
      if (this.nextUp){ const { item } = this.nextUp; if (await this.show(item)) return; }
      if (this.preloading){
        const { item, promise } = this.preloading;
        const node = await Promise.race([promise, new Promise(r => setTimeout(() => r(null), 6000))]).catch(() => null);
        if (node && node.isConnected === false){
          this.token++; this.nextUp = null; this.preloading = null;
          this.swap(node, item); this.seen(item); this.preloadNext(item);
          return;
        }
      }
      const tried = [this.cur];
      for (let i = 0; i < 2; i++){   // at most 6 + 2 x 6 = 18 seconds before the button is free again
        const item = this.pick(tried); if (!item) break; tried.push(item.url);
        if (await this.show(item, { wait:6000 })) return;
      }
    } finally { this.stepping = false; this.wait(false); }
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
    if (first && !designOk(first)) first = this.pick();   // (1.74.0) the server chose a design this device cannot run (a computers-only one on a phone)
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
document.addEventListener('visibilitychange', () => document.querySelectorAll('#bg video').forEach((/** @type {HTMLVideoElement} */ v) => { if (document.hidden) v.pause(); else v.play().catch(() => {}); }));
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
function toast(msg, err = false){ if (window.HUB) HUB.toast(msg, err); }   // the site's one message box (shell.js)

/* ======================================================================
   API
   ====================================================================== */
async function api(action, body, form = false, keepalive = false){
  /** @type {any} */
  const o = { method: body !== undefined ? 'POST' : 'GET', credentials:'same-origin', headers:{}, keepalive };
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
  const c = /** @type {Element} */ (e.target).closest('[data-close]'); if (c) c.closest('dialog').close();
  const o = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('[data-open]')); if (o) openSheetFor(o.dataset.open);
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
    if (JSON.stringify(ADMIN.widgets) !== JSON.stringify(WCFG)) setWidgets(ADMIN.widgets);   // just logged in: the widgets appear
  } catch (e){ toast(e.message, true); }
}
function exitEdit(loggedOut = false){
  editing = false;
  document.body.classList.remove('editing');
  $('#toolbar').hidden = true;
  $$('dialog[open]').forEach(d => d.close());
  if (loggedOut){ CSRF = null; ADMIN = null; setWidgets(null); toast('You were logged out. Log in again to keep editing.', true); }
}
$('#doneBtn').addEventListener('click', () => exitEdit());

/** Save the whole site and refresh local copies. */
async function saveAll(msg = 'Saved'){
  const r = await api('save', stripAdmin(ADMIN));
  ADMIN = r.site; PUB = { ...r.public, first:null };
  applyPageMeta(ADMIN);
  if (JSON.stringify(ADMIN.widgets) !== JSON.stringify(WCFG)) setWidgets(ADMIN.widgets);
  if (msg) toast(msg);
  return r;
}
function stripAdmin(a){
  const { uploadsAdmin, sourceInfo, keyInfo, poolStats, limits, starterInfo, ...rest } = a;
  return rest;
}

/* ======================================================================
   SETTINGS SHEET
   ====================================================================== */
let settingsDraft = null;
function openSheetFor(id){
  if (id === 'settingsSheet') return openSettings();
  if (id === 'widgetsSheet') return openWidgets();
  if (id === 'bgSheet') return openBg();
  openSheet(id);
}
function openSettings(){
  settingsDraft = { title:ADMIN.title, icon:ADMIN.icon };   // (1.68.4) the glass is set in Settings > Appearance > Glass
  $('#sTitle').value = settingsDraft.title;
  $('#sHomeBar').checked = homeBarOn();
  $('#sPrivate').checked = !!ADMIN.private;
  openSheet('settingsSheet');
}
/* Show the Bar on the Home Page: the site-wide setting (Settings > Appearance), shown here too */
const homeBarOn = () => !!(window.HUB && HUB.state && HUB.state().homeBar);
async function saveHomeBar(on){
  if (!window.HUB) throw new Error('Reload the page and try again.');
  const r = await HUB.fetch('../hub/core/api.php?action=settings', { method:'POST', credentials:'same-origin', headers:{ 'Content-Type':'application/json', ...(CSRF ? { 'X-Hub-CSRF':CSRF } : {}) }, body:JSON.stringify({ settings:{ homeBar:on } }) });
  let j = {}; try { j = await r.json(); } catch {}
  if (!r.ok || !j.ok) throw new Error(j.error || 'Could not save the bar setting. Reload the page and try again.');
}
/* Widgets: their own window (the edit pill's Widgets button) */
let widgetsDraft = null;
function openWidgets(){
  widgetsDraft = structuredClone(ADMIN.widgets);
  const w = widgetsDraft;
  $('#wShow').checked = w.show;
  seg($('#wStyle'), w.style);
  $('#wClock').checked = w.clock;
  $('#wCdName').value = w.countdown.name; $('#wCdDate').value = w.countdown.date;
  drawWidgetList();
  fillNotePicker();
  drawZones();
  $('#wTown').value = w.weather.town; seg($('#wUnit'), w.weather.unit);
  openSheet('widgetsSheet');
}
/* Settings > Widgets: tick the ones to show, and move them up or down (the dock and the cards follow this order) */
function drawWidgetList(){
  const l = widgetsDraft.list;
  $('#wList').innerHTML = l.map((w, i) => `<div class="g-row wl-row">
      <label class="wl-on"><input type="checkbox" class="switch" data-wl="${w.id}"${w.on ? ' checked' : ''}><span>${esc(W_META[w.id].name)}</span></label>
      <span class="wl-mv"><button type="button" class="btn small" data-wmove="${i}" data-by="-1" aria-label="Move ${esc(W_META[w.id].name)} Up"${i ? '' : ' disabled'}>↑</button><button type="button" class="btn small" data-wmove="${i}" data-by="1" aria-label="Move ${esc(W_META[w.id].name)} Down"${i < l.length - 1 ? '' : ' disabled'}>↓</button></span>
    </div>`).join('');
}
$('#wList').addEventListener('change', e => { const c = e.target.closest('[data-wl]'); if (c) widgetsDraft.list.find(w => w.id === c.dataset.wl).on = c.checked; });
$('#wList').addEventListener('click', e => {
  const b = e.target.closest('[data-wmove]'); if (!b) return;
  const l = widgetsDraft.list, i = +b.dataset.wmove, j = i + +b.dataset.by;
  [l[i], l[j]] = [l[j], l[i]]; drawWidgetList();
  $(`[data-wmove="${j}"][data-by="${b.dataset.by}"]`)?.focus() || $(`[data-wmove="${j}"]`)?.focus();
});
$('#wStyle').addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (!b) return; widgetsDraft.style = b.dataset.v; seg($('#wStyle'), b.dataset.v); });
/* World Clock: three rows of name and time zone; the browser offers its list of time zones */
function drawZones(){
  const z = widgetsDraft.zones;
  $('#wZones').innerHTML = [0, 1, 2].map(i => `<div class="inline"><input type="text" list="tzList" data-zt="${i}" value="${esc(z[i]?.tz || '')}" placeholder="${['Europe/London', 'America/New_York', 'Asia/Tokyo'][i]}" aria-label="Place ${i + 1} Time Zone" autocomplete="off" spellcheck="false"><input type="text" data-zn="${i}" value="${esc(z[i]?.name || '')}" maxlength="30" placeholder="Name (optional)" aria-label="Place ${i + 1} Name"></div>`).join('');
  const dl = $('#tzList');
  if (!dl.options.length && Intl.supportedValuesOf) dl.innerHTML = Intl.supportedValuesOf('timeZone').map(t => `<option value="${esc(t)}">`).join('');
}
const tzOk = tz => { try { new Intl.DateTimeFormat('en', { timeZone:tz }); return /\//.test(tz) || tz === 'UTC'; } catch { return false; } };
/* the Pinned Note list: the boxes of your Info tabs (an encrypted tab's boxes can't be read here, so they are left out) */
async function fillNotePicker(){
  const sel = $('#wNote'), cur = widgetsDraft.note, val = cur.box ? cur.tab + '|' + cur.box : '';
  sel.innerHTML = '<option value="">None</option>' + (val ? `<option value="${esc(val)}">Loading…</option>` : '');
  sel.value = val;
  try {
    const info = await siteJSON('../info/api.php');
    const groups = (info.tabs || []).filter(t => !t.enc && (t.boxes || []).length).map(t => `<optgroup label="${esc(t.name)}">${t.boxes.map(b => `<option value="${esc(t.id + '|' + b.id)}">${esc(b.title)}</option>`).join('')}</optgroup>`).join('');
    sel.innerHTML = '<option value="">None</option>' + groups;
    sel.value = [...sel.options].some(o => o.value === val) ? val : '';
  } catch { sel.innerHTML = '<option value="">None</option>' + (val ? `<option value="${esc(val)}">The note you chose</option>` : ''); sel.value = val; }
}
$('#saveSettings').addEventListener('click', e => withBusy(e.currentTarget, async () => {
  const prev = { title:ADMIN.title, icon:ADMIN.icon, private:ADMIN.private };
  ADMIN.title = $('#sTitle').value.trim() || 'Home';
  ADMIN.private = $('#sPrivate').checked;
  ADMIN.icon = '';   // no separate start page icon any more: the site logo is used
  const bar = $('#sHomeBar').checked, barChanged = bar !== homeBarOn();
  try {
    if (!barChanged) closeSheet('settingsSheet');   // (1.64.4) the window closes at once; the server catches up. If it refuses, it opens again below
    await saveAll(barChanged ? '' : 'Settings saved');
    if (barChanged){ await saveHomeBar(bar); toast('Settings saved'); setTimeout(() => location.reload(), 600); return; }   // the bar comes or goes with a reload
    closeSheet('settingsSheet');
  } catch (err){ Object.assign(ADMIN, prev); toast(err.message, true); openSheet('settingsSheet'); }
}));
$('#saveWidgets').addEventListener('click', e => withBusy(e.currentTarget, async () => {
  const prev = ADMIN.widgets;
  const w = widgetsDraft, [tab, box] = ($('#wNote').value || '|').split('|');
  const zones = [0, 1, 2].map(i => ({ tz:$(`[data-zt="${i}"]`).value.trim(), name:$(`[data-zn="${i}"]`).value.trim() })).filter(z => z.tz);
  const badZone = zones.find(z => !tzOk(z.tz));
  if (badZone){ toast(`“${badZone.tz}” is not a time zone. Pick one from the list, like Europe/London.`, true); $(`[data-zt]`)?.focus(); return; }
  w.show = $('#wShow').checked;
  w.zones = zones;
  w.weather = { town:$('#wTown').value.trim(), unit:$('#wUnit [aria-checked="true"]')?.dataset.v === 'f' ? 'f' : 'c' };
  w.clock = $('#wClock').checked;
  w.countdown = { name:$('#wCdName').value.trim(), date:$('#wCdDate').value };
  w.note = { tab:tab || '', box:box || '' };
  ADMIN.widgets = w;
  try {
    await saveAll('Widgets saved');
    closeSheet('widgetsSheet');
  } catch (err){ ADMIN.widgets = prev; toast(err.message, true); }
}));

/* ======================================================================
   BACKGROUND SHEET
   ====================================================================== */
let bgDraft = null;
/* The Background sheet's tabs: Main, Animated, Sources, Uploads. The sheet opens on the tab you used last. */
let bgTab = 'main';
function showBgTab(/** @type {string} */ id, /** @type {boolean} */ focus){
  bgTab = id;
  document.querySelectorAll('#bgSheet [data-bgt]').forEach(el => { const b = /** @type {HTMLElement} */ (el), on = b.dataset.bgt === id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
  document.querySelectorAll('#bgSheet .bgp').forEach(el => { /** @type {HTMLElement} */ (el).hidden = el.id !== 'bgp-' + id; });
  const sb = document.querySelector('#bgSheet .sb'); if (sb) sb.scrollTop = 0;
}
$('#bgSheet .bgtabs').addEventListener('click', e => { const b = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('[data-bgt]')); if (b) showBgTab(b.dataset.bgt || 'main', false); });
$('#bgSheet .bgtabs').addEventListener('keydown', e => {
  const ids = [...document.querySelectorAll('#bgSheet [data-bgt]')].map(b => /** @type {HTMLElement} */ (b).dataset.bgt || ''), i = ids.indexOf(bgTab);
  const k = /** @type {KeyboardEvent} */ (e).key;
  const to = k === 'ArrowRight' ? (i + 1) % ids.length : k === 'ArrowLeft' ? (i + ids.length - 1) % ids.length : k === 'Home' ? 0 : k === 'End' ? ids.length - 1 : -1;
  if (to < 0) return; e.preventDefault(); showBgTab(ids[to], true);
});
function openBg(){
  bgDraft = structuredClone(ADMIN.bg); showBgTab(bgTab, false);
  bgDraft.custom = bgDraft.custom || [];
  customDirty = false;
  renderDesigns(); renderThemes(); renderSources(); renderKeys(); renderCustom();
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
  const dids = Object.keys(ADMIN.designsInfo || {});
  const mixCard = card('mix', 'Mix Everything', 'A bit of everything, in turn', [...st.slice(0, 2).map(thumb), ...dids.slice(0, 3).map(id => `<span class="dz-chip" style="--dzg:${esc(dzGrad(id))}"></span>`)],
    on === 'mix' ? '' : '<button type="button" class="btn small primary" data-t="use-mix">Use</button>');
  const dcard = dids.length ? card('designs', 'Animated Designs', dids.filter(id => dzDraft(id).on).length + ' of ' + dids.length + ' designs, drawn live', dids.slice(0, 5).map(id => `<span class="dz-chip" style="--dzg:${esc(dzGrad(id))}"></span>`),
      on === 'designs' ? '' : '<button type="button" class="btn small primary" data-t="use-designs">Use</button>') : '';
  $('#themeRows').innerHTML = mixCard + dcard + (off
      ? `<div class="theme off"><div class="theme-b"><b>Starter</b><small>Removed. It comes with the app, so you can bring it back.</small><div class="theme-acts"><button type="button" class="btn small" data-t="back">Bring Back Starter</button></div></div></div>`
      : card('starter', 'Starter', esc(what || 'Comes with the app') + (st[0]?.type === 'video' ? ' · ' + esc(st[0].credit) + ' first' : ''), st.map(thumb),
          (on === 'starter' ? '' : '<button type="button" class="btn small primary" data-t="use-starter">Use</button>') + '<button type="button" class="btn small danger" data-t="remove">Remove</button>'))
    + card('online', 'Online Photos', 'The photo sources below. New photos arrive by themselves.', '<span class="theme-ph">Picsum · Bing · Wikimedia · Wallhaven</span>',
        on === 'online' ? '' : '<button type="button" class="btn small primary" data-t="use-online">Use</button>')
    + (bgDraft.themes || []).map(t => {
        const ups = (ADMIN.uploadsAdmin || []).filter(u => t.items.includes(u.url));
        const th = ups.length ? ups.map(u => u.type === 'video' ? `<video src="${esc(media(u.url))}#t=0.5" muted preload="metadata"></video>` : `<img src="${esc(media(u.url))}" alt="" loading="lazy">`) : '<span class="theme-ph">No backgrounds yet</span>';
        const id = 't:' + t.id;
        const dn = t.items.filter(u => u.startsWith('design:') && dzInfo()[u.slice(7)]).length;
        return card(id, esc(t.name), (ups.length + dn) + ((ups.length + dn) === 1 ? ' background' : ' backgrounds') + ' · your own', dn && !ups.length ? t.items.filter(u => u.startsWith('design:') && dzInfo()[u.slice(7)]).map(u => `<span class="dz-chip" style="--dzg:${esc(dzGrad(u.slice(7)))}"></span>`) : th,
          (on === id || !(ups.length + dn) ? '' : `<button type="button" class="btn small primary" data-t="use" data-id="${t.id}">Use</button>`)
          + `<button type="button" class="btn small" data-t="edit" data-id="${t.id}">Edit</button><button type="button" class="btn small" data-t="export" data-id="${t.id}"${ups.length ? '' : ' disabled'}>Export</button>`);
      }).join('')
    + ((bgDraft.themes || []).length < 8 ? `<div class="theme new"><div class="theme-mos"><span class="theme-ph">+</span></div><div class="theme-b"><b>New Theme</b><small>Make one from your uploads, or import a theme file.</small>
        <div class="theme-acts"><button type="button" class="btn small" data-t="new">Make a Theme</button><button type="button" class="btn small" data-t="import">Import</button></div></div></div>` : '');
}
$('#themeRows').addEventListener('click', e => {
  const b = e.target.closest('[data-t]'); if (!b) return;
  const t = b.dataset.t;
  if (t === 'use-starter') bgDraft.theme = 'starter';
  else if (t === 'use-designs') bgDraft.theme = 'designs';
  else if (t === 'use-mix') bgDraft.theme = 'mix';
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

/* ---------- Animated Designs (1.74.0): the list in Background, Preview, and each design's options ---------- */
const dzInfo = () => ADMIN.designsInfo || {};
const dzDraft = id => { if (!bgDraft.designs || Array.isArray(bgDraft.designs)) bgDraft.designs = {}; return (bgDraft.designs[id] ||= { on:true, opts:{} }); };   // an empty list arrives from PHP as [], which cannot carry named entries
const dzProps = id => ({ ...dzInfo()[id].defaults, ...dzDraft(id).opts });
const dzColors = id => {
  const p = dzProps(id), out = [];
  dzInfo()[id].options.forEach(o => { if (o.type === 'color') out.push(p[o.k]); else if (o.type === 'colors') out.push(...(p[o.k] || [])); });
  ['horizonColor', 'waveColor', 'color', 'color1', 'color2', 'color3'].forEach(k => { if (typeof p[k] === 'string' && !out.includes(p[k])) out.push(p[k]); });
  return out.filter(c => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 3);
};
const dzGrad = id => { const c = dzColors(id); while (c.length < 2) c.push('#14141c'); return `linear-gradient(135deg,#0b0b12 0%,${c[0]} 50%,${c[1]} 100%)`; };
function dzItem(id){
  const d = dzInfo()[id];
  return { url:'design:' + id, type:'design', credit:'From React Bits', link:d.link, src:'design', design:{ id, props:dzProps(id), desktop:d.desktop, gpu:d.gpu, still:d.still, dpr:d.dpr } };
}
function dzShow(id){ BG.nextUp = null; BG.preloading = null; BG.show(dzItem(id), { count:false }); }
function renderDesigns(){
  const ids = Object.keys(dzInfo());
  $('#designRows').innerHTML = ids.map(id => {
    const d = dzInfo()[id], here = designOk({ type:'design', design:d }), st = dzDraft(id);
    return `<div class="dz${here ? '' : ' nope'}" data-id="${id}"><span class="dz-sw" aria-hidden="true" style="--dzg:${esc(dzGrad(id))}"></span>
      <div class="dz-b"><b>${esc(d.name)}${d.desktop ? ' <span class="pill soft">Computers Only</span>' : ''}${BG.cur === 'design:' + id ? ' <span class="pill">On Screen</span>' : ''}</b><small>${esc(d.about)}${here ? '' : ' Not available on this device.'}</small></div>
      <div class="dz-a"><label class="dz-on"><input type="checkbox" class="switch" data-z="on"${st.on ? ' checked' : ''} aria-label="Include ${esc(d.name)} in Animated Designs"></label>
      <button type="button" class="btn small" data-z="preview"${here ? '' : ' disabled'}>Preview</button><button type="button" class="btn small" data-z="opts">Options</button></div></div>`;
  }).join('');
}
let dzEdit = '', dzTimer = 0;
function drawDesignOpts(){
  const id = dzEdit, d = dzInfo()[id], p = dzProps(id);
  $('#designTitle').textContent = d.name;
  $('#designOpts').innerHTML = d.options.map(o => {
    if (o.type === 'color') return `<label class="field"><span>${esc(o.label)}</span><input type="color" data-o="${o.k}" value="${esc(p[o.k])}"></label>`;
    if (o.type === 'colors'){
      const l = p[o.k] || [];
      return `<div class="field"><span>${esc(o.label)}</span><div class="dz-cols">${l.map((c, i) => `<input type="color" data-o="${o.k}" data-i="${i}" value="${esc(c)}" aria-label="${esc(o.label)} ${i + 1}">`).join('')}
        ${l.length < o.max ? `<button type="button" class="btn small" data-oa="${o.k}">Add Color</button>` : ''}${l.length > 1 ? `<button type="button" class="btn small" data-or="${o.k}">Remove Last</button>` : ''}</div></div>`;
    }
    if (o.type === 'range') return `<label class="field"><span>${esc(o.label)} <b data-v="${o.k}">${+p[o.k]}</b></span><input type="range" data-o="${o.k}" min="${o.min}" max="${o.max}" step="${o.step}" value="${+p[o.k]}"></label>`;
    return `<div class="field"><span>${esc(o.label)}</span><div class="seg" role="radiogroup" aria-label="${esc(o.label)}">${o.choices.map(c => `<button type="button" role="radio" data-oc="${o.k}" data-v="${esc(c)}" aria-checked="${p[o.k] === c}">${esc(c[0].toUpperCase() + c.slice(1))}</button>`).join('')}</div></div>`;
  }).join('');
}
function dzSet(k, v){
  const st = dzDraft(dzEdit); st.opts = { ...st.opts, [k]:v };
  renderDesigns(); renderThemes();
  clearTimeout(dzTimer); dzTimer = setTimeout(() => dzShow(dzEdit), 350);   // the background follows your change
}
$('#designRows').addEventListener('click', e => {
  const b = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('button[data-z]')); if (!b) return;
  const id = /** @type {HTMLElement} */ (b.closest('[data-id]')).dataset.id;
  if (b.dataset.z === 'preview') dzShow(id);
  else if (b.dataset.z === 'opts'){ dzEdit = id; drawDesignOpts(); openSheet('designSheet'); }
});
$('#designRows').addEventListener('change', e => {
  const c = /** @type {HTMLInputElement | null} */ (/** @type {Element} */ (e.target).closest('input[data-z="on"]')); if (!c) return;
  dzDraft(/** @type {HTMLElement} */ (c.closest('[data-id]')).dataset.id).on = c.checked; renderThemes();
});
$('#designOpts').addEventListener('input', e => {
  const t = /** @type {HTMLInputElement} */ (e.target), k = t.dataset.o; if (!k) return;
  const o = dzInfo()[dzEdit].options.find(x => x.k === k);
  if (o.type === 'range'){ const q = $('[data-v="' + k + '"]'); if (q) q.textContent = t.value; dzSet(k, +t.value); }
  else if (o.type === 'color') dzSet(k, t.value);
  else if (o.type === 'colors'){ const l = [...dzProps(dzEdit)[k]]; l[+t.dataset.i] = t.value; dzSet(k, l); }
});
$('#designOpts').addEventListener('click', e => {
  const b = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('button')); if (!b) return;
  if (b.dataset.oc){ dzSet(b.dataset.oc, b.dataset.v); drawDesignOpts(); }
  else if (b.dataset.oa){ const l = [...dzProps(dzEdit)[b.dataset.oa]]; l.push(l[l.length - 1]); dzSet(b.dataset.oa, l); drawDesignOpts(); }
  else if (b.dataset.or){ const l = [...dzProps(dzEdit)[b.dataset.or]]; l.pop(); dzSet(b.dataset.or, l); drawDesignOpts(); }
});
$('#designReset').addEventListener('click', () => { dzDraft(dzEdit).opts = {}; drawDesignOpts(); renderDesigns(); renderThemes(); dzShow(dzEdit); });
$('#designForm').addEventListener('submit', () => closeSheet('designSheet'));

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
  const designs = Object.keys(dzInfo()).map(id => `<label class="thumb dzp${themeEdit.items.includes('design:' + id) ? ' sel' : ''}"><span class="dz-sw" aria-hidden="true" style="--dzg:${esc(dzGrad(id))}"></span><span class="badge">${esc(dzInfo()[id].name)}</span>
      <input type="checkbox" data-u="design:${id}"${themeEdit.items.includes('design:' + id) ? ' checked' : ''} aria-label="Use ${esc(dzInfo()[id].name)}"></label>`).join('');
  $('#tPick').innerHTML = ups.map(u => `<label class="thumb${themeEdit.items.includes(u.url) ? ' sel' : ''}">
      ${u.type === 'video' ? `<video src="${esc(media(u.url))}#t=0.5" muted preload="metadata"></video><span class="badge">Video</span>` : `<img src="${esc(media(u.url))}" alt="" loading="lazy">`}
      <input type="checkbox" data-u="${esc(u.url)}"${themeEdit.items.includes(u.url) ? ' checked' : ''} aria-label="Use this background"></label>`).join('') + designs;
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
    else if (on) status = `<div class="src-status ${st.error && !st.count ? 'bad' : ''}">${Number(st.count) || 0} of ${Number(st.target) || 0} ${s.video ? 'videos' : 'photos'} saved${st.error ? ` <span class="src-err">Last problem: ${esc(st.error)}</span>` : ''}</div>`;
    return `<div class="g-row stack src-row">
      <div class="src-head">
        <span class="g-label">${esc(s.name)}<small>${esc(s.about)}</small></span>
        <span class="src-tools">
          <button type="button" class="btn small ghost" data-preview="${esc(k)}">Preview</button>
          <input type="checkbox" class="switch" data-src="${esc(k)}" ${on ? 'checked' : ''} aria-label="Use ${esc(s.name)}">
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
      ? `<div class="src-status ${st.error && !st.count ? 'bad' : ''}">${Number(st.count) || 0} of ${Number(st.target) || 0} ${c.type === 'video' ? 'videos' : 'photos'} saved${st.error ? ` <span class="src-err">Last problem: ${esc(st.error)}</span>` : ''}</div>`
      : `<div class="src-status">Save to start downloading.</div>`;
    return `<div class="g-row stack src-row">
      <div class="src-head">
        <span class="g-label">${esc(c.name)}<small>${c.kind === 'image' ? 'Image address' : 'JSON API'} on ${esc(host)}${c.type === 'video' ? ', videos' : ''}</small></span>
        <span class="src-tools">
          <button type="button" class="btn small ghost" data-cedit="${Number(i)}">Edit</button>
          <button type="button" class="btn small ghost" data-preview="${esc(k)}">Preview</button>
          <input type="checkbox" class="switch" data-src="${esc(k)}" ${on ? 'checked' : ''} aria-label="Use ${esc(c.name)}">
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
  const btn = $(`[data-preview="${esc(k)}"]`); if (btn) btn.textContent = 'Preview';
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
   CLOCK AND WIDGETS (1.51)
   The clock is for everyone. The widgets appear only while you are logged in, and read their data from this site only:
   Tasks, Info, Tools and the Scratch Pad. Nothing here contacts another site.
   Settings > Widgets chooses the style: Glass Dock (chips under the clock, a dock that opens each widget)
   or Glance and Expand (small widgets along the bottom; click one to open it).
   ====================================================================== */
const svgI = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const W_META = {
  today:     { name:'Today',          short:'Today',     icon:'<path d="M4 6h16v15H4zM4 10h16M8 3v4M16 3v4M8.5 15.5l2.2 2.2 4.8-4.8"/>' },
  countdown: { name:'Countdown',      short:'Countdown', icon:'<path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9"/>' },
  note:      { name:'Pinned Note',    short:'Note',      icon:'<path d="M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 16h5"/>' },
  tools:     { name:'Recent Tools',   short:'Tools',     icon:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.4-3.4a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>' },
  calendar:  { name:'Month Calendar', short:'Calendar',  icon:'<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>' },
  pad:       { name:'Scratch Pad',    short:'Pad',       icon:'<path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4"/>' },
  quote:     { name:'Quote of the Day', short:'Quote',    icon:'<path d="M7 7h4v4c0 3-2 5-4 6M14 7h4v4c0 3-2 5-4 6"/>' },
  worldclock:{ name:'World Clock',    short:'World',     icon:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>' },
  // (1.72.0) four more: money due this month, the links you opened last, your newest files, and how the site is doing
  bills:     { name:'Upcoming Bills', short:'Bills',     icon:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>' },
  recent:    { name:'Recent Links',   short:'Links',     icon:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>' },
  files:     { name:'Recent Files',   short:'Files',     icon:'<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>' },
  status:    { name:'Server Status',  short:'Status',    icon:'<path d="M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01"/>' },
  weather:   { name:'Weather',        short:'Weather',   icon:'<path d="M8 3v1.5M3.5 8H2M4.8 4.8l1 1M12 6.5A4 4 0 0 0 5 9"/><path d="M8 20h9a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6 1.6A2.8 2.8 0 0 0 8 20z"/>' },
};
let WCFG = PUB.widgets || null;   // null: a visitor, or logged out
const WD = { tasks:null, tasksErr:'', set:{}, info:null, infoErr:'', tools:null, pad:null, padErr:'', weather:null, weatherErr:'', events:[], recent:null, files:null, status:null, statusErr:'' };
let wOpen = '', calMonth = '';

/* dates: Tasks uses the site's time zone (Settings > General), so "today" here is the same day as on the Tasks page */
const pad2 = n => String(n).padStart(2, '0');
const SITE_TZ = () => (window.HUB && HUB.tz && HUB.tz()) || 'Asia/Kolkata';
function siteToday(){
  try {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone:SITE_TZ(), year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date());
    const g = t => p.find(x => x.type === t).value;
    return g('year') + '-' + g('month') + '-' + g('day');
  } catch { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
}
/** @type {(s: string) => Date} */
const dParse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const dStr = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
const dDiff = (a, b) => Math.round((+dParse(a) - +dParse(b)) / 86400000);   // days from b to a
const dLong = s => dParse(s).toLocaleDateString(undefined, { weekday:'long', day:'numeric', month:'long' });
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);

/* ---------- the clock ---------- */
let clockT = 0;
function renderClock(){
  clearTimeout(clockT);
  const on = !!(WCFG ? WCFG.clock : PUB.clock);
  $('#clock').hidden = !on;
  if (!on) return;
  const now = new Date(), h = now.getHours();
  $('#greet').textContent = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 22 ? 'Good evening' : 'Good night';
  $('#time').textContent = now.toLocaleTimeString([], { hour:'numeric', minute:'2-digit' });
  $('#date').textContent = now.toLocaleDateString([], { weekday:'long', day:'numeric', month:'long' });
  clockT = setTimeout(() => (WCFG ? renderWidgets(true) : renderClock()), 60500 - now.getSeconds() * 1000 - now.getMilliseconds());
}

/* ---------- reading this site's data ---------- */
async function siteJSON(url, body, opts = {}){
  /** @type {any} */
  const o = { method: body ? 'POST' : 'GET', credentials:'same-origin', headers:{}, ...opts };
  if (body){ o.headers['Content-Type'] = 'application/json'; if (CSRF) o.headers['X-Hub-CSRF'] = CSRF; o.body = JSON.stringify(body); }
  let r;
  try { r = await (window.HUB ? HUB.fetch(url, o) : fetch(url, o)); }
  catch { throw new Error('Couldn\'t reach your server. Check your connection and try again.'); }
  let j; try { j = await r.json(); } catch { j = { error:`The server sent an unexpected reply (${r.status}).` }; }
  if (!r.ok || j.error) throw Object.assign(new Error(j.error || 'Request failed'), { status:r.status });
  return j;
}
const wOn = id => !!WCFG && WCFG.show && WCFG.list.some(w => w.id === id && w.on);
async function loadTasks(){
  try { const j = await siteJSON('../tasks/api.php'); WD.tasks = j.auth ? j.tasks : []; WD.set = j.settings || {}; WD.tasksErr = ''; }
  catch (e){ WD.tasksErr = e.message; }
  renderWidgets();
  // (1.72.0) today's events from the calendars you follow in Tasks (read-only)
  try { const s = await siteJSON('../tasks/api.php?action=subs'); const t = siteToday(), cals = Object.fromEntries((s.cals || []).map(c => [c.id, c]));
    WD.events = (s.events || []).filter(e => e.d === t).map(e => ({ ...e, cal:cals[e.c] || { name:'Calendar', color:'#4cc9f0' } })).sort((a, b) => (a.t || '').localeCompare(b.t || '')); renderWidgets(); } catch { WD.events = []; }
}
/* (1.72.0) Recent Links: the links you opened last on this device (Links keeps the list; nothing from a locked tab) */
function loadRecent(){
  try { WD.recent = (JSON.parse(localStorage.getItem('hub-recent-links') || '[]') || []).filter(x => x && /^https?:/i.test(x.u)).slice(0, 6); } catch { WD.recent = []; }
  renderWidgets();
}
/* (1.72.0) Recent Files: the names are locked, so they come from Files once it has opened them in this tab */
function loadFilesW(){
  try { WD.files = (JSON.parse(sessionStorage.getItem('hub-find-files') || '[]') || []).filter(x => x && x.t).sort((a, b) => b.t - a.t).slice(0, 5); } catch { WD.files = []; }
  renderWidgets();
}
/* (1.72.0) Server Status: the same overview as Settings › Overview (logged in only) */
async function loadStatus(){
  try { const j = window.HUB && HUB.api ? await HUB.api('overview') : null; if (!j || !j.ok) throw new Error(j && j.error || 'Couldn\'t check the site'); WD.status = j; WD.statusErr = ''; }
  catch (e){ WD.statusErr = e.message; }
  renderWidgets();
}
/* (1.72.0) Upcoming Bills: what is still to pay this month (and anything overdue), from Tasks: priced tasks only */
function billsNow(){
  const t = siteToday(), end = t.slice(0, 7) + '-31', cur = (WD.set && WD.set.currency) || '';
  const l = (WD.tasks || []).filter(x => x.status === 'active' && x.price != null && x.due <= end).sort((a, b) => a.due.localeCompare(b.due));
  const tot = {}; l.forEach(x => { const c = x.cur || cur; tot[c] = (tot[c] || 0) + x.price; });
  return { list:l, tot, over:l.filter(x => x.due < t).length };
}
function moneyW(v, c){ try { return new Intl.NumberFormat(c === 'INR' ? 'en-IN' : undefined, c ? { style:'currency', currency:c, maximumFractionDigits:2, minimumFractionDigits:0 } : { maximumFractionDigits:2 }).format(v); } catch { return String(v); } }
const dShortW = s => dParse(s).toLocaleDateString(undefined, { day:'numeric', month:'short' });
async function loadInfo(){
  try { WD.info = await siteJSON('../info/api.php'); WD.infoErr = ''; } catch (e){ WD.infoErr = e.message; }
  renderWidgets();
}
/* Tools keeps its recently used tools in this browser (the same site, so Home can read them); the names come from Tools' own list. */
async function loadTools(){
  let ids = [];
  try { ids = (JSON.parse(localStorage.getItem('tools.v3') || 'null') || {}).recent || []; } catch {}
  ids = ids.filter(x => typeof x === 'string').slice(0, 6);
  if (!ids.length){ WD.tools = []; renderWidgets(); return; }
  try {
    const list = await siteJSON('../tools/assets/tools-list.json');
    const by = Object.fromEntries((list.tools || []).map(t => [t.id, t.name]));
    WD.tools = ids.filter(id => by[id]).map(id => ({ id, name:by[id] }));
  } catch { WD.tools = []; }
  renderWidgets();
}
async function loadPad(){
  try { WD.pad = await api('pad'); WD.padErr = ''; } catch (e){ WD.padErr = e.message; }
  renderWidgets();
}
async function loadWeather(){
  try { WD.weather = await api('weather'); WD.weatherErr = ''; } catch (e){ WD.weatherErr = e.message; }
  renderWidgets();
}
function loadWidgets(){
  if (!WCFG) return;
  if (wOn('weather')) loadWeather();
  if (wOn('today') || wOn('calendar') || wOn('bills')) loadTasks();
  if (wOn('recent')) loadRecent();
  if (wOn('files')) loadFilesW();
  if (wOn('status')) loadStatus();
  if (wOn('note') && WCFG.note.box) loadInfo();
  if (wOn('tools')) loadTools();
  if (wOn('pad')) loadPad();
  // (1.72.0) a search result from the Scratch Pad: open it
  if (location.hash === '#pad' && wOn('pad')){ history.replaceState(null, '', location.pathname + location.search); if (wOpen !== 'pad') openWidget('pad'); }
}

/* ---------- what each widget says ---------- */
function dueNow(){
  const t = siteToday();
  return (WD.tasks || []).filter(x => x.status === 'active' && x.due <= t)
    .sort((a, b) => a.due.localeCompare(b.due) || (a.time || '99').localeCompare(b.time || '99') || a.name.localeCompare(b.name));
}
function pinnedBox(){
  const n = WCFG.note, tab = (WD.info?.tabs || []).find(t => t.id === n.tab);
  const box = tab?.boxes?.find(b => b.id === n.box);
  return { tab, box };
}
function countdown(){
  const c = WCFG.countdown;
  if (!c.date) return null;
  const days = dDiff(c.date, siteToday()), name = c.name || 'Countdown';
  return { name, days, when: days > 1 ? plural(days, 'day', 'days') : days === 1 ? 'Tomorrow' : days === 0 ? 'Today' : plural(-days, 'day', 'days') + ' ago',
           chip: days > 1 ? `${name} in ${days} days` : days === 1 ? `${name} is tomorrow` : days === 0 ? `${name} is today` : `${name} was ${plural(-days, 'day', 'days')} ago` };
}
/* Quote of the Day: short sayings, all long out of copyright, kept here (nothing is fetched). One a day; Another Quote shows the next. */
const QUOTES = [
  ['The journey of a thousand miles begins with a single step.', 'Lao Tzu'],
  ['Waste no more time arguing what a good man should be. Be one.', 'Marcus Aurelius'],
  ['Very little is needed to make a happy life.', 'Marcus Aurelius'],
  ['It is not that we have a short time to live, but that we waste a lot of it.', 'Seneca'],
  ['While we are postponing, life speeds by.', 'Seneca'],
  ['Begin at once to live, and count each separate day as a separate life.', 'Seneca'],
  ['Men are disturbed not by things, but by the views which they take of things.', 'Epictetus'],
  ['First say to yourself what you would be; and then do what you have to do.', 'Epictetus'],
  ['No man is free who is not master of himself.', 'Epictetus'],
  ['Well done is better than well said.', 'Benjamin Franklin'],
  ['Lost time is never found again.', 'Benjamin Franklin'],
  ['Little strokes fell great oaks.', 'Benjamin Franklin'],
  ['Write it on your heart that every day is the best day in the year.', 'Ralph Waldo Emerson'],
  ['Nothing great was ever achieved without enthusiasm.', 'Ralph Waldo Emerson'],
  ['Our life is frittered away by detail. Simplify, simplify.', 'Henry David Thoreau'],
  ['Heaven is under our feet as well as over our heads.', 'Henry David Thoreau'],
  ['It is not enough to be busy. The question is: what are we busy about?', 'Henry David Thoreau'],
  ['The best way out is always through.', 'Robert Frost'],
  ['Rest is not idleness.', 'John Lubbock'],
  ['There is nothing either good or bad, but thinking makes it so.', 'William Shakespeare'],
  ['The fault, dear Brutus, is not in our stars, but in ourselves.', 'William Shakespeare'],
  ['Hope is the thing with feathers that perches in the soul.', 'Emily Dickinson'],
  ['Forever is composed of nows.', 'Emily Dickinson'],
  ['If you shed tears when you miss the sun, you also miss the stars.', 'Rabindranath Tagore'],
  ['To know what you know and to know what you do not know, that is true knowledge.', 'Confucius'],
  ['Slow and steady wins the race.', 'Aesop'],
  ['Know thyself.', 'Inscription at Delphi'],
  ['Nothing in excess.', 'Inscription at Delphi'],
  ['Many hands make light work.', 'Proverb'],
  ['Measure twice, cut once.', 'Proverb'],
  ['Rome was not built in a day.', 'Proverb'],
];
let quoteMore = 0;
function quoteNow(){ const day = Math.floor(+dParse(siteToday()) / 86400000); return QUOTES[((day + quoteMore) % QUOTES.length + QUOTES.length) % QUOTES.length]; }
/* World Clock: the time in up to three places you choose, and how far ahead or behind you they are */
function tzOffset(tz, d){
  /** @type {any} */
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone:tz, hourCycle:'h23', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }).formatToParts(d).map(x => [x.type, x.value]));
  return Math.round((Date.UTC(+p.year, p.month - 1, +p.day, +p.hour, +p.minute) - d.getTime()) / 60000);
}
const zoneName = z => z.name || z.tz.split('/').pop().replace(/_/g, ' ');
function zoneNow(z){
  const d = new Date();
  try {
    const diff = tzOffset(z.tz, d) + d.getTimezoneOffset(), a = Math.abs(diff);
    return { name:zoneName(z), time:d.toLocaleTimeString([], { timeZone:z.tz, hour:'numeric', minute:'2-digit' }), day:d.toLocaleDateString([], { timeZone:z.tz, weekday:'short' }),
             off: diff === 0 ? 'Same time as you' : `${Math.floor(a / 60)}h${a % 60 ? ' ' + (a % 60) + 'm' : ''} ${diff > 0 ? 'ahead' : 'behind'}` };
  } catch { return { name:zoneName(z), time:'—', day:'', off:'Unknown time zone' }; }
}
const W_PIC = {
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  partly:W_META.weather.icon, cloud:'<path d="M7 19h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 2A3 3 0 0 0 7 19z"/>', fog:'<path d="M4 9h16M3 13h18M5 17h14"/>',
  rain:'<path d="M7 15h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 2A3 3 0 0 0 7 15z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
  snow:'<path d="M7 15h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 2A3 3 0 0 0 7 15z"/><path d="M8 19h.01M12 21h.01M16 19h.01"/>',
  storm:'<path d="M7 15h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 2A3 3 0 0 0 7 15z"/><path d="M13 14l-2 3.5h3L12 21"/>',
};
/** A short summary for the Glance card (and the chips). */
function summary(id){
  if (id === 'today'){
    if (WD.tasksErr) return { big:'—', small:'Couldn\'t load your tasks' };
    if (!WD.tasks) return { big:'…', small:'' };
    const l = dueNow(), over = l.filter(x => x.due < siteToday()).length, next = l.find(x => x.due === siteToday()) || l[0];
    return { big: l.length ? plural(l.length, 'task', 'tasks') : 'All clear', small: next ? 'Next: ' + next.name + (next.time ? ', ' + next.time : '') : 'Nothing due today',
             alert: over ? over + ' overdue' : '', chip: l.length ? plural(l.length - over, 'task', 'tasks') + ' today' + (over ? ' · ' + over + ' overdue' : '') : 'Nothing due today', hot: !!over };
  }
  if (id === 'countdown'){
    const c = countdown();
    return c ? { title:c.name, big:c.when, small:dLong(WCFG.countdown.date), chip:c.chip } : { big:'Not set', small:'Choose a date in Edit › Settings' };
  }
  if (id === 'note'){
    if (!WCFG.note.box) return { small:'Choose a note in Edit › Settings' };
    if (WD.infoErr) return { small:'Couldn\'t load Info' };
    if (!WD.info) return { small:'…' };
    const { tab, box } = pinnedBox();
    if (!box) return { small:'That note is gone. Choose another in Edit › Settings.' };
    if (tab.enc) return { title:'Pinned Note', small:'This note is encrypted. Open it in Info.' };
    return { title:box.title, small:box.notes.slice(0, 120) || 'Empty' };
  }
  if (id === 'tools'){
    if (!WD.tools) return { small:'…' };
    return { small: WD.tools.length ? WD.tools.map(t => t.name).join(' · ') : 'Tools you open show up here' };
  }
  if (id === 'calendar'){
    const t = siteToday();
    return { big: dParse(t).toLocaleDateString(undefined, { month:'long' }), small: dLong(t) };
  }
  if (id === 'quote'){ const q = quoteNow(); return { small:'“' + q[0] + '” ' + q[1] }; }
  if (id === 'worldclock'){
    if (!WCFG.zones.length) return { small:'Choose up to three places in Edit › Settings' };
    const z = WCFG.zones.map(zoneNow);
    return { title:z[0].name, big:z[0].time, small: z.length > 1 ? z.slice(1).map(x => x.name + ' ' + x.time).join(' · ') : [z[0].day, z[0].off].filter(Boolean).join(' · ') };
  }
  if (id === 'weather'){
    if (!WCFG.weather.town) return { small:'Type your town in Edit › Settings' };
    if (WD.weatherErr) return { small:WD.weatherErr };
    if (!WD.weather) return { small:'…' };
    const w = WD.weather;
    return { big:w.temp + '°', small:w.text + ' · ' + w.place.split(',')[0], chip:w.temp + '° ' + w.place.split(',')[0], pic:w.pic };
  }
  if (id === 'bills'){
    if (WD.tasksErr) return { small:'Couldn\'t load your tasks' };
    if (!WD.tasks) return { small:'…' };
    const b = billsNow(), sums = Object.entries(b.tot).map(([c, v]) => moneyW(v, c));
    return { big: sums[0] || 'Nothing', small: b.list.length ? plural(b.list.length, 'bill', 'bills') + ' left this month' + (sums.length > 1 ? ' · + ' + sums.slice(1).join(' · ') : '') : 'Nothing left to pay this month',
             alert: b.over ? b.over + ' overdue' : '', chip: sums[0] ? sums[0] + ' to pay' : 'No bills', hot: !!b.over };
  }
  if (id === 'recent'){
    if (!WD.recent) return { small:'…' };
    return { small: WD.recent.length ? WD.recent.slice(0, 3).map(x => x.n).join(' · ') : 'Links you open show up here' };
  }
  if (id === 'files'){
    if (!WD.files) return { small:'…' };
    return { small: WD.files.length ? WD.files.slice(0, 3).map(x => x.n).join(' · ') : 'Open Files to see your newest files here' };
  }
  if (id === 'status'){
    if (WD.statusErr) return { small:WD.statusErr };
    if (!WD.status) return { small:'…' };
    const o = WD.status, n = (o.alerts || []).length;
    return { big: n ? plural(n, 'thing', 'things') : 'All good', small: n ? o.alerts[0].text : 'Backups, updates and security look fine', alert: n ? 'Look' : '', chip: n ? plural(n, 'thing', 'things') + ' to see' : 'All good', hot: !!n };
  }
  if (id === 'pad'){
    if (WD.padErr) return { small:'Couldn\'t load the pad' };
    if (!WD.pad) return { small:'…' };
    return { small: WD.pad.text.slice(0, 120) || 'Empty. Click to write a quick note.' };
  }
  return {};
}

/* ---------- drawing ---------- */
function renderWidgets(quiet = false){
  renderClock();
  const a = /** @type {HTMLElement} */ (document.activeElement), keep = a && a.dataset && a.dataset.w && !$('#wPanel').contains(a) ? [/** @type {HTMLElement} */ (a.parentNode).id, a.dataset.w] : null;
  const list = WCFG && WCFG.show ? WCFG.list.filter(w => w.on && W_META[w.id]).map(w => w.id) : [];   // Widgets > Show Widgets off: none
  const dock = WCFG && WCFG.style === 'dock';
  if (wOpen && !list.includes(wOpen)) wOpen = '';
  document.body.classList.toggle('has-widgets', list.length > 0);
  document.body.classList.toggle('w-open', !!wOpen);
  document.body.dataset.wstyle = WCFG ? WCFG.style : '';

  // Glass Dock: chips under the clock for Today and Countdown, and a dock with every widget
  const chips = dock ? ['today', 'countdown', 'weather'].filter(id => list.includes(id)).map(id => ({ id, s:summary(id) })).filter(c => c.s.chip) : [];
  $('#wChips').hidden = !chips.length;
  $('#wChips').innerHTML = chips.map(c => `<button type="button" class="lg wchip" data-w="${c.id}" aria-controls="wPanel" aria-expanded="${wOpen === c.id}">${c.s.hot ? '<i class="dot"></i>' : ''}${c.s.pic ? svgI(W_PIC[c.s.pic] || '') : ''}${esc(c.s.chip)}</button>`).join('');
  $('#wDock').hidden = !dock || !list.length;
  $('#wDock').innerHTML = dock ? list.map(id => `<button type="button" class="wdb" data-w="${id}" aria-controls="wPanel" aria-expanded="${wOpen === id}" aria-label="${esc(W_META[id].name)}">${svgI(W_META[id].icon)}<span>${esc(W_META[id].short)}</span></button>`).join('') : '';

  // Glance and Expand: one small glass card per widget
  $('#wCards').hidden = dock || !list.length;
  $('#wCards').style.setProperty('--n', list.length <= 6 ? list.length : Math.ceil(list.length / 2));   // one row, or two even rows
  $('#wCards').innerHTML = !dock ? list.map(id => {
    const s = summary(id);
    return `<button type="button" class="lg wcard" data-w="${id}" aria-controls="wPanel" aria-expanded="${wOpen === id}">
      <span class="wc-h"><span>${esc(s.title || W_META[id].name)}</span>${s.alert ? `<em>${esc(s.alert)}</em>` : ''}</span>
      ${s.big ? `<b class="wc-big">${esc(s.big)}</b>` : ''}<span class="wc-s">${esc(s.small || '')}</span></button>`;
  }).join('') : '';
  if (!quiet || wOpen === 'worldclock') renderPanel();   // each minute: only World Clock's open panel changes (never one you type in)
  if (keep) $(`#${keep[0]} [data-w="${keep[1]}"]`)?.focus();
}

/* The open widget sits just above the dock or the cards, never on top of them, and scrolls inside when space is short.
   If it would reach the clock or the chips, they step aside while it is open (body.w-cover). */
function placePanel(){
  const p = $('#wPanel');
  if (p.hidden){ document.body.classList.remove('w-cover'); return; }
  const anchor = document.body.dataset.wstyle === 'glance' ? $('#wCards') : $('#wDock');
  if (!anchor || anchor.hidden) return;
  const top = anchor.getBoundingClientRect().top, gap = 14;
  p.style.top = 'auto';
  p.style.bottom = Math.round(innerHeight - top + gap) + 'px';
  p.style.maxHeight = Math.max(160, Math.min(560, Math.round(top - gap - 12))) + 'px';
  const pt = p.getBoundingClientRect().top;
  document.body.classList.toggle('w-cover', [$('#clock'), $('#wChips')].some(el => !el.hidden && el.getBoundingClientRect().bottom > pt - 8));
}
addEventListener('resize', () => placePanel());
function renderPanel(){
  const p = $('#wPanel');
  if (!wOpen){ if (!p.hidden){ p.hidden = true; } placePanel(); return; }
  const keep = document.activeElement && p.contains(document.activeElement) ? document.activeElement.id : '';
  if (wOpen === 'pad' && !p.hidden && $('#wPad')) return;   // never redraw the pad while you type
  p.hidden = false;
  p.dataset.shown = wOpen;
  $('#wPanelTitle').textContent = wOpen === 'note' && WD.info && pinnedBox().box && !pinnedBox().tab.enc ? pinnedBox().box.title : W_META[wOpen].name;
  $('#wBody').innerHTML = panelHTML(wOpen);
  placePanel();
  if (keep && document.getElementById(keep)) document.getElementById(keep).focus();
}

function panelHTML(id){
  const more = (href, text) => `<a class="wmore" href="${href}">${text}</a>`;
  if (id === 'today'){
    if (WD.tasksErr) return `<p class="wmsg">${esc(WD.tasksErr)}</p>`;
    if (!WD.tasks) return '<p class="wmsg">Loading…</p>';
    const t = siteToday(), l = dueNow();
    const rows = l.map(x => {
      const late = dDiff(t, x.due), when = late === 1 ? 'yesterday' : late > 1 ? late + ' days ago' : x.time;
      return `<label class="wrow${late > 0 ? ' late' : ''}"><input type="checkbox" data-done="${esc(x.id)}" data-due="${esc(x.due)}"><span class="wr-n">${esc(x.name)}</span>${when ? `<span class="wr-t">${esc(when)}</span>` : ''}</label>`;
    }).join('');
    const evs = (WD.events || []).map(e => `<div class="wrow wev" style="--ec:${esc(e.cal.color)}"><span class="wr-n">${esc(e.s)}</span><span class="wr-t">${esc(e.t || 'All day')} · ${esc(e.cal.name)}</span></div>`).join('');
    return `<div class="wlist">${rows || (evs ? '' : '<p class="wmsg">Nothing due today.</p>')}${evs ? '<p class="wmsg small">From Your Calendars</p>' + evs : ''}</div>
      <form class="wqa" id="wQaForm"><input type="text" id="wQa" maxlength="300" autocomplete="off" placeholder="+ Add a task, press Enter" aria-label="Quick Add" aria-describedby="wQaHint"></form>
      <p class="wmsg small" id="wQaHint">For example: Pay rent 5 Nov, or Netflix 649 monthly</p>${more('../tasks/', 'Open Tasks')}`;
  }
  if (id === 'countdown'){
    const c = countdown();
    if (!c) return '<p class="wmsg">Choose a name and a date in Edit › Settings › Widgets.</p>';
    const n = Math.abs(c.days);
    return `<p class="wcount"><b>${c.days > 1 || c.days < -1 ? n : esc(c.when)}</b><span>${c.days > 1 ? 'days to ' + esc(c.name) : c.days < -1 ? 'days since ' + esc(c.name) : esc(c.name)} · ${esc(dLong(WCFG.countdown.date))}</span></p>`;
  }
  if (id === 'note'){
    if (!WCFG.note.box) return '<p class="wmsg">Choose a box from Info in Edit › Settings › Widgets.</p>';
    if (WD.infoErr) return `<p class="wmsg">${esc(WD.infoErr)}</p>`;
    if (!WD.info) return '<p class="wmsg">Loading…</p>';
    const { tab, box } = pinnedBox();
    if (!box) return '<p class="wmsg">That box is no longer in Info. Choose another in Edit › Settings.</p>' + more('../info/', 'Open Info');
    if (tab.enc) return '<p class="wmsg">This box is in an encrypted tab, so it can only be read in Info.</p>' + more('../info/', 'Open Info');
    return `<p class="wnote">${esc(box.notes) || '<i>Empty</i>'}</p>${more('../info/', 'Open in Info')}`;
  }
  if (id === 'tools'){
    if (!WD.tools) return '<p class="wmsg">Loading…</p>';
    if (!WD.tools.length) return '<p class="wmsg">The tools you open in Tools show up here.</p>' + more('../tools/', 'Open Tools');
    return `<div class="wtools">${WD.tools.map(t => `<a href="../tools/#/tool/${encodeURIComponent(t.id)}">${esc(t.name)}</a>`).join('')}</div>${more('../tools/', 'Open Tools')}`;
  }
  if (id === 'calendar') return calendarHTML();
  if (id === 'quote'){
    const q = quoteNow();
    return `<figure class="wquote"><blockquote>“${esc(q[0])}”</blockquote><figcaption>${esc(q[1])}</figcaption></figure><button type="button" class="wbtn" id="wQuoteNext">Another Quote</button>`;
  }
  if (id === 'worldclock'){
    if (!WCFG.zones.length) return '<p class="wmsg">Choose up to three places in Edit › Settings › Widgets.</p>';
    return `<div class="wzones">${WCFG.zones.map(zoneNow).map(z => `<div class="wzone"><span class="wz-n">${esc(z.name)}<small>${esc([z.day, z.off].filter(Boolean).join(' · '))}</small></span><b>${esc(z.time)}</b></div>`).join('')}</div>`;
  }
  if (id === 'weather'){
    if (!WCFG.weather.town) return '<p class="wmsg">Type your town in Edit › Settings › Widgets.</p>';
    if (WD.weatherErr) return `<p class="wmsg">${esc(WD.weatherErr)}</p>`;
    if (!WD.weather) return '<p class="wmsg">Loading…</p>';
    const w = WD.weather, t = siteToday();
    const day = s => s === t ? 'Today' : dDiff(s, t) === 1 ? 'Tomorrow' : dParse(s).toLocaleDateString(undefined, { weekday:'long' });
    return `<div class="wwnow">${svgI(W_PIC[w.pic] || '')}<b>${w.temp}${esc(w.unit)}</b><span>${esc(w.text)}<small>${esc(w.place)}</small></span></div>
      <div class="wwdays">${w.days.map(d => `<div class="wwday"><span>${esc(day(d.date))}</span>${svgI(W_PIC[d.pic] || '')}<span class="ww-t">${esc(d.text)}</span><b>${d.max}°</b><span class="ww-min">${d.min}°</span></div>`).join('')}</div>
      ${w.stale ? '<p class="wmsg small">Open-Meteo can\'t be reached just now, so this is the last forecast your server got.</p>' : ''}
      <a class="wmore" href="https://open-meteo.com/" target="_blank" rel="noopener">Weather data by Open-Meteo.com</a>`;
  }
  if (id === 'bills'){
    if (WD.tasksErr) return `<p class="wmsg">${esc(WD.tasksErr)}</p>`;
    if (!WD.tasks) return '<p class="wmsg">Loading…</p>';
    const b = billsNow(), t = siteToday();
    if (!b.list.length) return '<p class="wmsg">Nothing left to pay this month. Give a task a price in Tasks and it shows here.</p>' + more('../tasks/', 'Open Tasks');
    return `<div class="wlist">${b.list.slice(0, 8).map(x => `<a class="wrow${x.due < t ? ' late' : ''}" href="../tasks/#task=${encodeURIComponent(x.id)}"><span class="wr-n">${esc(x.name)}</span><span class="wr-t">${esc(dShortW(x.due))} · ${esc(moneyW(x.price, x.cur || (WD.set && WD.set.currency) || ''))}</span></a>`).join('')}</div>
      <p class="wmsg small">Left this month: ${Object.entries(b.tot).map(([c, v]) => esc(moneyW(v, c))).join(' · ')}</p>${more('../tasks/', 'Open Tasks')}`;
  }
  if (id === 'recent'){
    if (!WD.recent) return '<p class="wmsg">Loading…</p>';
    if (!WD.recent.length) return '<p class="wmsg">The links you open in Links show up here (on this device only).</p>' + more('../links/', 'Open Links');
    return `<div class="wtools">${WD.recent.map(x => `<a href="${esc(x.u)}" target="_blank" rel="noopener">${esc(x.n)}</a>`).join('')}</div>${more('../links/', 'Open Links')}`;
  }
  if (id === 'files'){
    if (!WD.files) return '<p class="wmsg">Loading…</p>';
    if (!WD.files.length) return '<p class="wmsg">Your files are locked, so their names show here once Files has opened them in this tab.</p>' + more('../files/', 'Open Files');
    return `<div class="wlist">${WD.files.map(x => `<a class="wrow" href="../files/#q=${encodeURIComponent(x.n)}"><span class="wr-n">${esc(x.n)}</span><span class="wr-t">${esc(new Date(x.t).toLocaleDateString(undefined, { day:'numeric', month:'short' }))}</span></a>`).join('')}</div>${more('../files/', 'Open Files')}`;
  }
  if (id === 'status'){
    if (WD.statusErr) return `<p class="wmsg">${esc(WD.statusErr)}</p>`;
    if (!WD.status) return '<p class="wmsg">Checking…</p>';
    const o = WD.status, bk = o.backup || {}, up = o.update || {}, ago = s => { const d = Math.round((Date.now() / 1000 - s) / 86400); return d < 1 ? 'today' : d === 1 ? 'yesterday' : d + ' days ago'; };
    const rows = [['Last Backup', bk.last ? ago(bk.last) : 'Never', !bk.last], ['Updates', up.staged ? 'Ready to install' : up.newer ? 'Version ' + up.newer + ' is out' : 'Up to date', !!(up.staged || up.newer)],
      ['Protection', (o.protect ? o.protect.on + ' of ' + o.protect.total : '—'), !!(o.protect && o.protect.on < o.protect.total)], ['Secure Connection', o.https ? 'Yes (https)' : 'No', !o.https]];
    return `<div class="wzones">${rows.map(r => `<div class="wzone${r[2] ? ' late' : ''}"><span class="wz-n">${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join('')}</div>
      ${(o.alerts || []).slice(0, 3).map(a => `<p class="wmsg small">• ${esc(a.text)}</p>`).join('')}${more('../settings/#overview', 'Open Settings')}`;
  }
  if (id === 'pad'){
    if (WD.padErr) return `<p class="wmsg">${esc(WD.padErr)}</p>`;
    if (!WD.pad) return '<p class="wmsg">Loading…</p>';
    return `<textarea id="wPad" rows="6" maxlength="20000" aria-label="Scratch Pad" placeholder="Type anything. It saves by itself.">${esc(WD.pad.text)}</textarea><p class="wmsg small" id="wPadState" aria-live="polite">Saves by itself</p>`;
  }
  return '';
}

/* the month calendar: today, and the days that have a task (repeating tasks included) */
function stepDue(t, s){
  const n = t.repeat?.n || 1, u = t.repeat?.unit;
  const d = dParse(s);
  if (u === 'day') d.setDate(d.getDate() + n);
  else if (u === 'week') d.setDate(d.getDate() + 7 * n);
  else if (u === 'month' || u === 'year'){
    const m = d.getMonth() + (u === 'month' ? n : 12 * n), y = d.getFullYear() + Math.floor(m / 12), mm = ((m % 12) + 12) % 12;
    const last = new Date(y, mm + 1, 0).getDate();
    return y + '-' + pad2(mm + 1) + '-' + pad2(Math.min(t.day || d.getDate(), last));
  } else return '';
  return dStr(d);
}
function calendarHTML(){
  const t = siteToday(), m = calMonth || t.slice(0, 7);
  const first = dParse(m + '-01'), days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const mon = WD.set.week === 'mon', lead = (first.getDay() - (mon ? 1 : 0) + 7) % 7;
  const busy = {};
  for (const x of WD.tasks || []){
    if (x.status !== 'active') continue;
    for (let s = x.due, i = 0; s && s <= m + '-31' && i < 400; s = stepDue(x, s), i++) if (s.startsWith(m)) (busy[s] = busy[s] || []).push(x.name);
  }
  const names = mon ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  let cells = names.map(n => `<span class="wcal-h" aria-hidden="true">${n}</span>`).join('') + '<span></span>'.repeat(lead);
  for (let d = 1; d <= days; d++){
    const s = m + '-' + pad2(d), b = busy[s];
    const label = dParse(s).toLocaleDateString(undefined, { weekday:'long', day:'numeric', month:'long' }) + (b ? ': ' + b.join(', ') : '');
    cells += `<span class="wcal-d${s === t ? ' now' : ''}${b ? ' busy' : ''}" role="gridcell" aria-label="${esc(label)}"${b ? ` title="${esc(b.join(', '))}"` : ''}>${d}</span>`;
  }
  const title = first.toLocaleDateString(undefined, { month:'long', year:'numeric' });
  return `<div class="wcal-nav"><button type="button" class="wx" data-cal="-1" aria-label="Previous Month">‹</button><b>${esc(title)}</b><button type="button" class="wx" data-cal="1" aria-label="Next Month">›</button></div>
    <div class="wcal" role="grid" aria-label="${esc(title)}">${cells}</div>${WD.tasksErr ? `<p class="wmsg small">${esc(WD.tasksErr)}</p>` : ''}<a class="wmore" href="../tasks/">Open Tasks</a>`;
}

/* ---------- opening, closing and acting ---------- */
function openWidget(id){
  wOpen = wOpen === id ? '' : id;
  if (wOpen === 'calendar') calMonth = '';
  if (wOpen === 'pad' && !WD.pad) loadPad();
  if (wOpen === 'note' && !WD.info && WCFG.note.box) loadInfo();
  if (wOpen === 'tools') loadTools();   // a tool you opened since Home loaded
  renderWidgets();
  if (wOpen) ($('#wQa') || $('#wPad') || $('#wClose')).focus();
}
function closeWidget(){
  if (!wOpen) return;
  const was = wOpen; wOpen = ''; renderWidgets();
  $(`[data-w="${was}"]`)?.focus();
}
document.addEventListener('click', e => {
  const b = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('[data-w]'));
  if (b && !b.closest('#wPanel')) return openWidget(b.dataset.w);
  const c = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('[data-cal]'));
  if (c){
    const d = dParse((calMonth || siteToday().slice(0, 7)) + '-01'); d.setMonth(d.getMonth() + +c.dataset.cal);
    calMonth = dStr(d).slice(0, 7); renderPanel(); $(`[data-cal="${c.dataset.cal}"]`)?.focus();
  }
});
$('#wClose').addEventListener('click', closeWidget);
$('#wBody').addEventListener('click', e => { if (e.target.closest('#wQuoteNext')){ quoteMore++; renderWidgets(); $('#wQuoteNext')?.focus(); } });
addEventListener('keydown', e => { if (e.key === 'Escape' && wOpen && !$$('dialog[open]').length) closeWidget(); });

// Today: tick a task to mark it done (a repeating task moves to its next date), or type one into Quick Add
$('#wBody').addEventListener('change', async e => {
  const cb = e.target.closest('[data-done]'); if (!cb) return;
  cb.disabled = true;
  try {
    const r = await siteJSON('../tasks/api.php', { action:'done', id:cb.dataset.done, due:cb.dataset.due });
    const name = (WD.tasks || []).find(x => x.id === cb.dataset.done)?.name || 'Task';
    toast(String(r.result || '').startsWith('next:') ? `Done. ${name} comes back on ${dLong(r.result.slice(5))}.` : `Done: ${name}`);
  } catch (err){ toast(err.message, true); }
  loadTasks();
});
$('#wBody').addEventListener('submit', async e => {
  if (e.target.id !== 'wQaForm') return;
  e.preventDefault();
  const inp = $('#wQa'), text = inp.value.trim();
  if (!text) return;
  inp.disabled = true;
  try {
    const r = await siteJSON('../tasks/api.php', { action:'quick_add', text });
    toast(`Added: ${r.task.name}, ${r.task.due === siteToday() ? 'today' : dLong(r.task.due)}`);
    inp.value = '';
    await loadTasks();
  } catch (err){ toast(err.message, true); }
  const again = $('#wQa'); if (again){ again.disabled = false; again.focus(); }
});

// Scratch Pad: saves a moment after you stop typing, and when you leave the page
let padT = 0, padDirty = false;
async function savePad(keepalive = false){
  const el = $('#wPad'); if (!el || !padDirty) return;
  padDirty = false; clearTimeout(padT);
  const st = $('#wPadState');
  try {
    const r = await api('pad', { text:el.value }, false, keepalive);
    WD.pad = { text:el.value, saved:r.saved };
    if (st) st.textContent = 'Saved';
  } catch (err){ padDirty = true; if (st) st.textContent = 'Not saved: ' + err.message; }
}
$('#wBody').addEventListener('input', e => {
  if (e.target.id !== 'wPad') return;
  padDirty = true; $('#wPadState').textContent = 'Saving…';
  clearTimeout(padT); padT = setTimeout(savePad, 800);
});
$('#wBody').addEventListener('focusout', e => { if (e.target.id === 'wPad') savePad(); });
addEventListener('pagehide', () => savePad(true));

/* logged in or out after the page loaded (Edit, Log Out, or another tab) */
function setWidgets(cfg){
  WCFG = cfg || null;
  if (!WCFG){ Object.assign(WD, { tasks:null, tasksErr:'', set:{}, info:null, infoErr:'', tools:null, pad:null, padErr:'', weather:null, weatherErr:'' }); wOpen = ''; }
  renderWidgets();
  loadWidgets();
}

/* ======================================================================
   HOME TOUR (1.69.0): four cards in the Stepper (shell.js), each lighting up a part of the page. It opens once, on the first visit
   after the site is set up (New Site Setup leaves "hl-tour-due"), and any time from Home Settings > Take the Tour.
   ====================================================================== */
function tour(){
  if (!window.HUB || !HUB.stepper || $('#hlTour')) return;
  const box = document.createElement('div'); box.id = 'hlTour'; box.className = 'hl-tour'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Home Tour');
  document.body.append(box);
  let lit = null;
  const spot = sel => { if (lit) lit.classList.remove('hl-spot'); lit = sel ? $$(sel).find(e => e.offsetParent || e.getClientRects().length) || null : null; if (lit) lit.classList.add('hl-spot'); };
  const close = () => { spot(null); box.remove(); try { localStorage.setItem('hl-tour', '1'); localStorage.removeItem('hl-tour-due'); } catch (x) { /* nothing kept */ } };
  const card = (h, p) => '<h3 class="hl-tour-h">' + h + '</h3><p class="hl-tour-p">' + p + '</p>';
  HUB.stepper(box, { kind: 'dots', frame: true, complete: 'Start', skip: close,
    steps: [
      { title: 'Your Start Page', html: card('Your start page', 'The clock, a greeting and your photo. A new photo comes with the arrow, or set your own in Edit.'), enter: () => spot('.clock') },
      { title: 'The Bar', html: card('The bar', 'Every page is one click away: Links, Info, Cards, Tasks, Files and Tools. On Home it can stay hidden behind the corner button.'), enter: () => spot('#ix-bar, [data-ix="corner"]') },
      { title: 'Widgets', html: card('Widgets', 'Today, Countdown, Note, Calendar and more. Choose them under Edit › Widgets.'), enter: () => spot('#wChips:not([hidden]), #wDock:not([hidden]), .wcards, #editBtn') },
      { title: 'Make It Yours', html: card('Make it yours', 'Settings › Appearance changes the theme, the colours and the glass. Edit changes this page.'), enter: () => spot('#editBtn, [data-ix="account"]') }],
    done: '', onDone: close });
  box.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}
$('#sTour')?.addEventListener('click', () => { closeSheet('settingsSheet'); setTimeout(tour, 250); });
try { if (localStorage.getItem('hl-tour-due') === '1') setTimeout(tour, 1800); } catch (x) { /* no storage: no tour */ }

/* ======================================================================
   START
   ====================================================================== */
renderWidgets();
if (WCFG) api('state').then(st => { CSRF = st.csrf || CSRF; }).catch(() => {}).finally(loadWidgets);   // the pad needs the login's security token
// coming back to Home later (another tab, or the phone woke up): the tasks may have changed, and the date too
let wSeen = Date.now();
document.addEventListener('visibilitychange', () => {
  if (document.hidden || !WCFG || Date.now() - wSeen < 30000) return;
  wSeen = Date.now();
  if (wOn('weather') && (!WD.weather || WD.weather.saved < Date.now() / 1000 - 1800)) loadWeather();
  if (wOn('recent')) loadRecent(); if (wOn('files')) loadFilesW(); if (wOn('status')) loadStatus();
  if (wOn('today') || wOn('calendar') || wOn('bills')) loadTasks(); else renderWidgets();
});
// ?bg=picsum | bing | wikimedia | wallhaven | artic | unsplash | pixabay | pixabay_video | upload  forces a source (handy for testing)
BG.start();
$('#nextBg').addEventListener('click', () => BG.next());
addEventListener('keydown', e => {
  if (/** @type {Element} */ (e.target).matches('input, textarea') || $$('dialog[open]').length) return;
  if (e.key === 'e') { if (editing) exitEdit(); else $('#editBtn').click(); }
  if (e.key === 'Escape' && editing) exitEdit();
});
})();
