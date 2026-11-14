/*! Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
/* (1.64.6, 1.64.8) A web host's firewall can answer a request with its own page (a plain "403 Forbidden", or a CAPTCHA) before Homebase Hub sees it.
   Our own answers from api.php are always JSON (or a file), never a web page. So when api.php answers with a web page, the host spoke, not the site:
   say so, keep the change in the browser, hand the page a "could not reach the server" answer (nothing is logged out or lost), and PAUSE sending for a
   minute. Some hosts count every request a blocked visitor makes (one host blacklists the address after 101), so piling on makes it worse. */
(function () {
  var f = window.fetch, said = 0, pausedUntil = 0; if (!f || f._ixHost) return;
  var API = /\/api\.php(\?|$)/, held = function () { return new Response('', { status: 503, statusText: 'Blocked by the host' }); };
  window.fetch = function (input) {
    var url = '', own = false;
    try { url = new URL(typeof input === 'string' ? input : (input && input.url) || '', location.href); own = url.origin === location.origin && API.test(url.pathname + url.search); } catch (e) { /* not a plain address */ }
    if (own && Date.now() < pausedUntil) return Promise.resolve(held());
    return f.apply(this, arguments).then(function (r) {
      try {
        if (own && (r.status === 403 || r.status === 200 || r.status === 429 || r.status === 503) && /html/i.test(r.headers.get('content-type') || '') && !/json/i.test(r.headers.get('content-type') || '')) {
          pausedUntil = Date.now() + 60000;
          if (Date.now() - said > 20000 && window.HUB && HUB.toast) { said = Date.now(); HUB.toast('Your web host\'s firewall answered instead of the site (a block or a CAPTCHA). It did not come from Homebase Hub, and you are still logged in. Your change is kept in this browser. Open this site in a new tab, solve the CAPTCHA if it asks, then reload. Sending is paused for a minute so it does not make the block worse.', true, true); }
          return held();
        }
      } catch (e) { /* leave the answer as it is */ }
      return r;
    });
  };
  window.fetch._ixHost = true;
})();
/* Hub shell. Loaded first in the <head> of every page:
 *   <script src="../hub/core/assets/shell.js?v=1.79.5" data-app="links"></script>
 * It draws the shared bar (top, side or dock), keeps ONE theme across pages, handles the one login,
 * the unified search and the Edit menu.  window.HUB is the small API pages use.
 * Settings, Security, Telegram, Health (with Server Check) and Backup live in shell-admin.js, loaded the first time you open them
 * (section 10); it uses this file's state and helpers through window.__ixShell.
 *
 *   1. before the page paints: look, nav style, theme, colors, font, text sizes
 *   2. small helpers (fetch with retry, api, toast)
 *   3. page contract: the pencil menu built from what each page marks
 *   4. the bar          5. small popup menus      6. theme
 *   7. search (+ 7b. logo as tab icon)            8. dialogs
 *   9. login           10. loader for shell-admin.js
 *  12. clicks on the bar and dialogs              13. start, and the bridge for shell-admin.js */
(function () {
  'use strict';
  var me = document.currentScript;
  var APP = (me && me.dataset.app) || 'page';
  /* Not inside someone else's page (clickjacking). The server sends X-Frame-Options or a CSP for this where .htaccess is honoured; this covers hosts that ignore it. Nothing on this site uses frames. */
  try { if (window.top !== window.self) { document.documentElement.style.display = 'none'; window.top.location = window.self.location; } } catch (e) { document.documentElement.style.display = 'none'; }
  var ASSETS = new URL('.', me ? me.src : location.href).href;        // .../web/hub/core/assets/
  var CORE = new URL('../', ASSETS).href;                             // .../web/hub/core/
  var ROOT = new URL('../../../', CORE).href;                            // site root
  /* every page of the site: [id, default name, address, icon]. Names, order and hidden tabs come from Settings > Appearance > Bar. */
  var PAGE_DEF = [
    ['home', 'Home', ROOT, 'M3 11l9-7 9 7M5 10v10h14V10'],
    ['links', 'Links', ROOT + 'web/links/', 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'],
    ['info', 'Info', ROOT + 'web/info/', 'M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM9 8h6M9 12h6M9 16h4'],
    ['cards', 'Cards', ROOT + 'web/cards/', 'M3 6h18v13H3zM3 10h18M7 15h4'],
    ['tasks', 'Tasks', ROOT + 'web/tasks/', 'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4M8.5 15.5l2.2 2.2 4.8-4.8'],
    ['files', 'Files', ROOT + 'web/files/', 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'],
    ['tools', 'Tools', ROOT + 'web/tools/', 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.4-3.4a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z']
  ];
  /* (1.67.0) the pages in the bar as colour tiles with white Lucide icons (lucide.dev, ISC: see web/hub/docs/THIRD-PARTY.md): [colour, the icon's SVG inside] */
  var PAGE_TILE = {
    home: ['#f5a524', '<path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/>'],
    links: ['#3b82f6', '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'],
    info: ['#a855f7', '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8"/>'],
    files: ['#0ea5e9', '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>'],
    cards: ['#22c55e', '<rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/>'],
    tools: ['#f97316', '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'],
    tasks: ['#f43f5e', '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4"/>']
  };
  var TOOL_C = { theme: '#f5a524', edit: '#3b82f6', backup: '#22c55e', due: '#ef4444', account: '#71717a', login: '#f5a524', search: '#71717a' };
  var pageColor = function (id) { return (PAGE_TILE[id] || ['#71717a'])[0]; };
  var pageIcon = function (p) { var t = PAGE_TILE[p[0]]; return '<span class="ix-pt" aria-hidden="true">' + (t ? '<svg viewBox="0 0 24 24">' + t[1] + '</svg>' : svg(p[3])) + '</span>'; };
  var ICON = {
    sun: 'M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41',
    moon: 'M20.99 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.78 9.79z',
    gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
    keyboard: 'M3 6.5h18v11H3zM6.5 10h.01M9.5 10h.01M12.5 10h.01M15.5 10h.01M17.5 10h.01M7 13.8h10',   // (1.65.1) Keyboard Shortcuts
    key: 'M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4zM16.5 7.5h.01',
    out: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
    lock: 'M7 11V7a5 5 0 0 1 10 0v4M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z',
    menu: 'M4 7h16M4 12h16M4 17h16',
    site: 'M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8',
    palette: 'M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a4 4 0 0 0 4-4c0-4.5-4-8-9-8z',
    shield: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1zM9 12l2 2 4-4',
    box: 'M12 4v11M7 10l5 5 5-5M5 20h14',
    tool: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.4-3.4a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z',
    up: 'M12 19V5M6 11l6-6 6 6',
    bookmark: 'm19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z',
    pulse: 'M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2',
    bell: 'M10.268 21a2 2 0 0 0 3.464 0M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326',
    copy: 'M10 8h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zM4 16c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2',
    down: 'M12 5v14M6 13l6 6 6-6',
    eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    eyeoff: 'M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6',
    bank: 'M3 10l9-6 9 6M5 10v8M10 10v8M14 10v8M19 10v8M3 21h18',
    pages: 'M4 5h7v7H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 14h7v5H4z',
    edit: 'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497zM15 5l4 4',
    check: 'M5 12l5 5L20 7',
    search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
    image: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21M11 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0z',
    filter: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
    plus: 'M12 5v14M5 12h14',
    type: 'M5 6V4h14v2M12 4v16M9 20h6',
    cols: 'M4 5h4v14H4zM10 5h4v14h-4zM16 5h4v14h-4z',
    file: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7zM14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8',
    user: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
    card: 'M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM2 10h20',
    back: 'M15 6l-6 6 6 6',
    grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z'
  };
  var svg = function (d) { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>'; };
  var isHex = function (v) { return /^#[0-9a-f]{6}$/i.test(v || ''); };   // a color like #d9a85b (also shared as HUB.isHex)
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var ls = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
             set: function (k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} } };
  var H = document.documentElement;
  // (1.61.9) the glide between pages (@view-transition in shell.css): when you move on very fast the browser cuts it short and
  // rejects its promises ("Transition was aborted ... Page already revealed"). Harmless: catch them so they are not page errors.
  ['pagereveal', 'pageswap'].forEach(function (ev) {
    addEventListener(ev, function (e) { var vt = e.viewTransition; if (vt) [vt.ready, vt.finished, vt.updateCallbackDone].forEach(function (p) { if (p && p.catch) p.catch(function () {}); }); });
  });
  // (1.71.0) after a swipe the new page slides in from the side it came from (shell.css: html.ix-swn / ix-swp). The old page set a note
  // ('n' next or 'p' previous, with the time) just before it left; a note older than 3 seconds is from a swipe that never arrived.
  addEventListener('pagereveal', function (e) {
    var d = ''; try { d = sessionStorage.getItem('ix-swd') || ''; sessionStorage.removeItem('ix-swd'); } catch (x) {}
    var m = /^([np]):(\d+)$/.exec(d), vt = e.viewTransition;
    if (!m || Date.now() - +m[2] > 3000 || !vt || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var c = m[1] === 'n' ? 'ix-swn' : 'ix-swp'; document.documentElement.classList.add(c);
    var off = function () { document.documentElement.classList.remove(c); };
    if (vt.finished && vt.finished.then) vt.finished.then(off, off); else off();
  });
  // The same cut-short glide can reject after this script loaded (a slow computer, or a page that was already shown). Only that one message is
  // let through quietly; every other rejection stays a page error.
  addEventListener('unhandledrejection', function (e) { var m = e.reason && e.reason.message; if (typeof m === 'string' && /^Transition was aborted|Skipped ViewTransition/.test(m)) e.preventDefault(); });
  /* The tabs as you set them: [id, name, address, icon, hidden], in your order. Pages added later appear at their default place. */
  function pageList(st) {
    st = st || S;
    var def = {}, out = [], seen = {};
    PAGE_DEF.forEach(function (d) { def[d[0]] = d; });
    (Array.isArray(st.pages) ? st.pages : []).forEach(function (x) {
      var d = x && def[x.id]; if (!d || seen[x.id]) return; seen[x.id] = 1;
      out.push([d[0], String(x.name || '').trim() || d[1], d[2], d[3], !!x.hide]);
    });
    PAGE_DEF.forEach(function (d, i) {
      if (seen[d[0]]) return;
      var at = out.length; for (var k = 0; k < out.length; k++) if (PAGE_DEF.map(function (p) { return p[0]; }).indexOf(out[k][0]) > i) { at = k; break; }
      out.splice(at, 0, [d[0], d[1], d[2], d[3], false]);
    });
    return out;
  }
  /* the tabs to show: hidden ones stay out, except the page you are on */
  function pages() { var off = S.off || []; return pageList().filter(function (p) { return off.indexOf(p[0]) < 0 && (!p[4] || p[0] === APP); }); }   // (1.79.0) a page turned off in Features leaves the bar
  var reduced = function () { return matchMedia('(prefers-reduced-motion: reduce)').matches; };

