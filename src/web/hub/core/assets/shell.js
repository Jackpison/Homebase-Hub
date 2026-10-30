/*! Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
/* Hub shell. Loaded first in the <head> of every page:
 *   <script src="../hub/core/assets/shell.js?v=1.60.0" data-app="links"></script>
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
  /* every page of the site: [id, default name, address, icon]. Names, order and hidden tabs come from Settings > General > Tabs. */
  var PAGE_DEF = [
    ['home', 'Home', ROOT, 'M3 11l9-7 9 7M5 10v10h14V10'],
    ['links', 'Links', ROOT + 'web/links/', 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'],
    ['info', 'Info', ROOT + 'web/info/', 'M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM9 8h6M9 12h6M9 16h4'],
    ['cards', 'Cards', ROOT + 'web/cards/', 'M3 6h18v13H3zM3 10h18M7 15h4'],
    ['tasks', 'Tasks', ROOT + 'web/tasks/', 'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4M8.5 15.5l2.2 2.2 4.8-4.8'],
    ['files', 'Files', ROOT + 'web/files/', 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'],
    ['tools', 'Tools', ROOT + 'web/tools/', 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.4-3.4a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z']
  ];
  var ICON = {
    sun: 'M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41',
    moon: 'M20.99 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.78 9.79z',
    gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
    key: 'M8 11a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM11 12l9-9M16 7l3 3',
    out: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
    lock: 'M5 11h14v10H5zM8 11V8a4 4 0 0 1 8 0v3',
    menu: 'M4 7h16M4 12h16M4 17h16',
    site: 'M3 11l9-7 9 7M5 10v10h14V10',
    palette: 'M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a4 4 0 0 0 4-4c0-4.5-4-8-9-8z',
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
    box: 'M12 4v11M7 10l5 5 5-5M5 20h14',
    tool: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.4-3.4a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z',
    up: 'M12 19V5M6 11l6-6 6 6',
    bookmark: 'M6 3h12v18l-6-4-6 4z',
    pulse: 'M3 12h4l3-8 4 16 3-8h4',
    bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
    copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
    down: 'M12 5v14M6 13l6 6 6-6',
    eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    eyeoff: 'M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6',
    bank: 'M3 10l9-6 9 6M5 10v8M10 10v8M14 10v8M19 10v8M3 21h18',
    pages: 'M4 5h7v7H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 14h7v5H4z',
    edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
    check: 'M5 12l5 5L20 7',
    search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
    image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.5h.01',
    filter: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
    plus: 'M12 5v14M5 12h14',
    type: 'M5 6V4h14v2M12 4v16M9 20h6',
    cols: 'M4 5h4v14H4zM10 5h4v14h-4zM16 5h4v14h-4z',
    file: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
    card: 'M3 6h18v13H3zM3 10h18M7 15h4',
    back: 'M15 6l-6 6 6 6',
    grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z'
  };
  /* the theme button shows what it switches to: a sun in dark mode, a moon in light mode; its tooltip says the same */
  function themeIcon() { return svg(themeNow() === 'light' ? ICON.moon : ICON.sun); }
  var svg = function (d) { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>'; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var ls = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
             set: function (k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} } };
  var H = document.documentElement;
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
  function pages() { return pageList().filter(function (p) { return !p[4] || p[0] === APP; }); }
  var reduced = function () { return matchMedia('(prefers-reduced-motion: reduce)').matches; };

  /* ---------- 1. before the page paints: look, nav style and theme from the last visit ---------- */
  var S = {};
  try { S = JSON.parse(ls.get('hub-state') || '{}') || {}; } catch (e) { S = {}; }
  function themeNow() {
    var t = ls.get('hub-theme') || S.theme || 'dark';
    if (t === 'auto') t = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    return t === 'light' ? 'light' : 'dark';
  }
  /* Every page remembers its theme under its own key; write them all so each page's own early script agrees. */
  function syncThemeKeys(t) {
    ls.set('bm-theme', t); ls.set('info3-theme', t); ls.set('theme4', t);
  }
  function applyAttrs() {
    H.setAttribute('data-ix-app', APP);
    H.setAttribute('data-ix-nav', S.nav || 'top');
    if (S.look !== false) H.setAttribute('data-ix-look', ''); else H.removeAttribute('data-ix-look');
    if (APP !== 'home' || S.homeBar === true) H.setAttribute('data-ix-bar', ''); else H.removeAttribute('data-ix-bar');
    var acc = (S.accentPg && S.accentPg[APP]) || S.accent || '#ffc21a';   // a page can have an accent of its own (Settings > Appearance > Colors)
    H.style.setProperty('--ix-accent', acc);
    H.style.setProperty('--ix-ink', inkFor(acc));
  }
  /* The text on an accent-colored button: black or white, whichever reads better on that accent (a dark blue accent gets white text). */
  function inkFor(hex) {
    var m = /^#([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return '#000';
    var c = [0, 2, 4].map(function (i) { var v = parseInt(m[1].substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    var l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    return (l + 0.05) / 0.05 >= 1.05 / (l + 0.05) ? '#000' : '#fff';   // contrast with black against contrast with white
  }
  /* Custom colors (Settings > Appearance > Colors): which CSS variable each portion of the site sets, per page.
     Written as one <style> so every page gets them before it paints. They only apply while "Same look on every page" is on. */
  var COLOR_KEYS = [['bg', 'Page Background'], ['box', 'Boxes and Cards'], ['panel', 'Menus and Dialogs'], ['line', 'Borders'], ['text', 'Text'], ['mute', 'Secondary Text'],
                    ['bar', 'Bar Background'], ['barText', 'Bar Tabs and Icons']];
  var COLOR_DEFAULT = {
    dark: { bg: '#000000', box: '#0e0e0e', panel: '#161616', line: '#262626', text: '#f2f2f2', mute: '#a0a0a0', bar: '#000000', barText: '#a0a0a0' },
    light: { bg: '#f6f5f1', box: '#ffffff', panel: '#ffffff', line: '#e2dfd6', text: '#141414', mute: '#5f5b54', bar: '#f6f5f1', barText: '#5f5b54' }
  };
  var COLOR_VARS = {
    bg:    { all: ['--ix-bg'], links: ['--bg'], info: ['--bg'], cards: ['--bg'], tasks: ['--bg'], files: ['--bg'], tools: ['--bg', '--sidebar'] },
    box:   { all: ['--ix-s1'], links: ['--raise'], info: ['--box'], cards: ['--panel'], tasks: ['--box'], files: ['--box'], tools: ['--card'], home: ['--s-bg2'] },
    panel: { all: ['--ix-s2'], links: ['--panel'], info: ['--panel'], tasks: ['--panel'], files: ['--panel'], tools: ['--card-2'], home: ['--s-bg'] },
    line:  { all: ['--ix-line', '--ix-line2'], links: ['--line', '--line2'], info: ['--line', '--border'], cards: ['--line', '--border2'], tasks: ['--line'], files: ['--line'], tools: ['--line', '--line-2'], home: ['--s-line'] },
    text:  { all: ['--ix-tx'], links: ['--text'], info: ['--fg'], cards: ['--fg'], tasks: ['--fg'], files: ['--fg'], tools: ['--text'], home: ['--s-ink'] },
    mute:  { all: ['--ix-mu', '--ix-mu2'], links: ['--muted'], info: ['--mute'], cards: ['--mute'], tasks: ['--mute'], files: ['--mute'], tools: ['--muted'], home: ['--s-mute'] },
    bar:   { all: ['--ix-barbg'] },        // the menu bar (top bar, sidebar or dock) on every page
    barText: { all: ['--ix-bartx'] }
  };
  var PG_APPS = [['links', 'Links'], ['info', 'Info'], ['cards', 'Cards'], ['tasks', 'Tasks'], ['files', 'Files'], ['tools', 'Tools']];
  function colorsCss(c, look) {
    if (!c || look === false) return '';
    var css = '';
    ['dark', 'light'].forEach(function (m) {
      var set = c[m] || {}, byScope = {};
      COLOR_KEYS.forEach(function (k) {
        var v = set[k[0]]; if (!/^#[0-9a-f]{6}$/i.test(v || '')) return;
        Object.keys(COLOR_VARS[k[0]]).forEach(function (scope) {
          (byScope[scope] = byScope[scope] || []).push.apply(byScope[scope], COLOR_VARS[k[0]][scope].map(function (n) { return n + ':' + v + '!important'; }));
        });
      });
      Object.keys(byScope).forEach(function (scope) {
        var sel = 'html[data-theme="' + m + '"]' + (scope === 'all' ? '' : '[data-ix-app="' + scope + '"][data-ix-app][data-ix-app]');
        css += sel + '{' + byScope[scope].join(';') + '}\n';
      });
    });
    /* a background set for one page wins over the general one (written last, with more weight) */
    var pg = c.pg || {};
    PG_APPS.forEach(function (a) {
      ['dark', 'light'].forEach(function (m) {
        var v = pg[a[0]] && pg[a[0]][m]; if (!/^#[0-9a-f]{6}$/i.test(v || '')) return;
        css += 'html[data-theme="' + m + '"][data-ix-app="' + a[0] + '"][data-ix-app][data-ix-app][data-ix-app]{' + COLOR_VARS.bg[a[0]].map(function (n) { return n + ':' + v + '!important'; }).join(';') + '}\n';
      });
    });
    return css;
  }
  function applyColors(st) {
    st = st || S;
    var el = document.getElementById('ix-colors');
    if (!el) { el = document.createElement('style'); el.id = 'ix-colors'; document.head.appendChild(el); }
    var css = colorsCss(st.colors, st.look);
    if (el.textContent !== css) el.textContent = css;
  }
  /* Site-wide font (Settings > Appearance). One <style> overrides the font of every page, but leaves code and keyboard keys alone. */
  var FONTS = [['default', 'Each page\'s own font', ''],
    ['trebuchet', 'Trebuchet MS', '"Trebuchet MS","Lucida Grande","Lucida Sans Unicode","Lucida Sans",Tahoma,system-ui,sans-serif'],
    ['system', 'System Default', 'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif'],
    ['verdana', 'Verdana', 'Verdana,Geneva,Tahoma,sans-serif'],
    ['tahoma', 'Tahoma', 'Tahoma,Verdana,Geneva,sans-serif'],
    ['segoe', 'Segoe UI', '"Segoe UI",system-ui,-apple-system,Roboto,sans-serif'],
    ['arial', 'Arial / Helvetica', 'Arial,"Helvetica Neue",Helvetica,sans-serif'],
    ['georgia', 'Georgia (Serif)', 'Georgia,"Times New Roman",Times,serif'],
    ['palatino', 'Palatino (Serif)', '"Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif'],
    ['mono', 'Monospace', 'ui-monospace,Consolas,"SF Mono",Menlo,"Courier New",monospace'],
    ['custom', 'Other Font…', '']];
  function fontStack(st) {
    var k = st && st.font;
    if (k === 'custom') { var n = String(st.fontCustom || '').replace(/[^\w \-]/g, '').trim(); return n ? '"' + n + '",system-ui,sans-serif' : ''; }
    for (var i = 0; i < FONTS.length; i++) if (FONTS[i][0] === k) return FONTS[i][2];
    return '';
  }
  function applyFont(st) {
    st = st || S;
    var el = document.getElementById('ix-fontcss'), f = fontStack(st);
    if (!f) { if (el) el.textContent = ''; H.removeAttribute('data-ix-font'); return; }
    if (!el) { el = document.createElement('style'); el.id = 'ix-fontcss'; document.head.appendChild(el); }
    H.setAttribute('data-ix-font', '');
    el.textContent = 'html[data-ix-font] body,html[data-ix-font] body *:not(code):not(pre):not(kbd):not(samp):not(#jsonText):not(svg):not(svg *){font-family:' + f + '!important}';
  }
  /* Text sizes per page (Info, Cards): the page's own CSS reads --ix-s-<key>; Links keeps its own sizes inside its data. */
  var SIZE_SPEC = {
    info: [['tab', 'Tabs', 14, 34, 20], ['head', 'Box Titles', 14, 36, 20], ['text', 'Box Text', 12, 30, 16]],
    cards: [['title', 'Page Title', 22, 60, 40], ['box', 'Summary Boxes', 16, 44, 24], ['text', 'Table Text', 12, 26, 16]]
  };
  function applySizes(st, only) {
    var spec = SIZE_SPEC[APP]; if (!spec) return;
    var z = ((st || S).sizes || {})[APP] || {};
    if (only) z = only;
    spec.forEach(function (k) { var v = +z[k[0]]; if (v >= k[2] && v <= k[3]) H.style.setProperty('--ix-s-' + k[0], v + 'px'); else H.style.removeProperty('--ix-s-' + k[0]); });
  }
  syncThemeKeys(themeNow());
  H.setAttribute('data-theme', themeNow());
  applyAttrs();
  applyColors();
  applyFont();
  applySizes();

  /* ---------- 2. small helpers ---------- */
  /* fetch that does not give up on a slow host: a generous timeout, and a quiet retry after a short pause when the connection
     fails or a gateway times out (GET: also on 502/503/504/524; other methods: only when nothing reached the server). */
  function hubFetch(url, opts, o) {
    o = o || {}; opts = opts || {};
    var tries = o.retries == null ? 2 : o.retries, timeout = o.timeout || 30000, method = (opts.method || 'GET').toUpperCase();
    /* changes on this site carry the login's security token, so the server can tell them from requests made by other websites */
    var base = Object.assign({}, opts);
    if (method !== 'GET' && method !== 'HEAD' && S.csrf && sameSite(url)) {
      if (typeof Headers !== 'undefined' && base.headers instanceof Headers) { base.headers = new Headers(base.headers); if (!base.headers.has('X-Hub-CSRF')) base.headers.set('X-Hub-CSRF', S.csrf); }
      else { base.headers = Object.assign({}, base.headers); if (!base.headers['X-Hub-CSRF']) base.headers['X-Hub-CSRF'] = S.csrf; }
    }
    function once(n) {
      var ctl = window.AbortController ? new AbortController() : null, timer = ctl && setTimeout(function () { ctl.abort(); }, timeout);
      var init = Object.assign({}, base); if (ctl && !init.signal) init.signal = ctl.signal;
      return fetch(url, init).then(function (r) {
        if (timer) clearTimeout(timer);
        var gw = r.status === 502 || r.status === 504 || r.status === 524, again = (method === 'GET' ? gw || r.status === 503 : r.status === 503);
        if (again && n < tries) return new Promise(function (go) { setTimeout(go, 500 * (n + 1)); }).then(function () { return once(n + 1); });
        return r;
      }, function (err) {
        if (timer) clearTimeout(timer);
        var timedOut = err && err.name === 'AbortError';
        if (n < tries && (method === 'GET' || !timedOut)) return new Promise(function (go) { setTimeout(go, 500 * (n + 1)); }).then(function () { return once(n + 1); });
        throw err;
      });
    }
    return once(0);
  }
  function sameSite(u) { try { return new URL(u, location.href).origin === location.origin; } catch (e) { return false; } }
  /* only web addresses become links; anything like javascript: turns into a harmless "#" */
  function safeHref(u) { u = String(u || '').trim(); if (/^(https?:|mailto:|\/|\.\/|#)/i.test(u)) return u; return /^[a-z][a-z0-9+.-]*:/i.test(u) ? '#' : (u ? 'https://' + u : '#'); }
  function api(action, body, method, wait) {   // wait: {timeout: ms} for the few jobs that take a while (hubFetch gives up after 30 s otherwise)
    var o = { method: method || (body ? 'POST' : 'GET'), headers: {}, credentials: 'same-origin', cache: 'no-store' };
    if (body) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body); }
    if (S.csrf) o.headers['X-Hub-CSRF'] = S.csrf;
    return hubFetch(CORE + 'api.php?action=' + action, o, wait).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { j._status = r.status; return j; });
    });
  }
  var toastT;
  /* The one message box of every page (1.59: Home and Links use it too). bad: a problem (red, stays longer); sticky: stays until the next message. */
  function toast(msg, bad, sticky) {
    var t = document.getElementById('ix-toast');
    if (!t) { t = document.createElement('div'); t.id = 'ix-toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); }
    // a page's open modal <dialog> is drawn above everything: the message goes inside it so it can be seen
    var host = [].slice.call(document.querySelectorAll('dialog[open]')).pop() || document.body;
    if (t.parentNode !== host) host.appendChild(t);
    t.textContent = msg; t.classList.toggle('bad', !!bad); t.classList.add('on'); clearTimeout(toastT);
    if (!sticky) toastT = setTimeout(function () { t.classList.remove('on'); }, bad ? 6000 : 3200);
  }
  function remember(st) {
    var keep = {}; ['siteName', 'logo', 'nav', 'theme', 'accent', 'accentPg', 'look', 'homeBar', 'editBar', 'colors', 'font', 'fontCustom', 'sizes', 'pages', 'backupEvery', 'backupLast', 'tz'].forEach(function (k) { if (k in st) keep[k] = st[k]; });
    keep.adm = !!st.admin;   // only a hint so the bar draws the right icons straight away; the server decides what is allowed
    ls.set('hub-state', JSON.stringify(keep));
  }
  var isAdmin = function () { return S.admin === undefined ? !!S.adm : !!S.admin; };
  function whenBody(fn) {
    if (document.body) return fn();
    var mo = new MutationObserver(function () { if (document.body) { mo.disconnect(); fn(); } });
    mo.observe(H, { childList: true });
  }

  /* ---------- 3. page contract: the pencil menu is built from what each page marks ----------
     A page marks its own controls with data-hub="toggle | item | done | logout | hide" (see shell.css and README),
     so adding an option to a page never means touching this file. */
  var HAS_EDIT = APP !== 'settings';   // Settings has nothing to edit: no pencil there (1.53.5)
  /* options a page has no buttons for (Tools is a separate app): [label, icon, action] */
  var EXTRA = { tools: [{ label: 'Tools Settings', icon: ICON.gear, run: function () { location.hash = '#/settings'; } }] }[APP] || [];
  var q1 = function (kind) { return document.querySelector('[data-hub="' + kind + '"]'); };
  function hubItems() {
    return [].slice.call(document.querySelectorAll('[data-hub="item"]')).map(function (el, i) {
      return { el: el, label: el.getAttribute('data-hub-label') || el.textContent.trim(), group: el.getAttribute('data-hub-group') || '', order: +(el.getAttribute('data-hub-order') || 0), i: i,
               icon: ICON[el.getAttribute('data-hub-icon')] || '', sep: el.hasAttribute('data-hub-sep'), main: el.hasAttribute('data-hub-main') };
    }).sort(function (a, b) { return a.order - b.order || a.i - b.i; });
  }
  /* Menu entries for the page's items. Items sharing a data-hub-group fold into one entry ("Edit...", "Export...") that opens a short list. */
  function itemEntries(anchor, t, mainOnly) {
    var out = [], groups = {};
    hubItems().filter(function (it) { return !mainOnly || it.main; }).forEach(function (it) {
      var run = function () { if (t && !editing()) startEdit(it.label); else it.el.click(); };
      if (it.sep && !mainOnly) out.push({ sep: true });   // the two-item pencil menu has no lines
      if (!it.group) { out.push({ label: it.label, icon: it.icon, run: run }); return; }
      var g = groups[it.group];
      if (!g) {
        g = groups[it.group] = { label: it.group + '…', icon: it.icon, sub: [], run: function () { popMenu(anchor, [{ label: 'Back', icon: ICON.back, run: function () { backToMenu(anchor); } }, { sep: true }].concat(g.sub), { corner: anchor.getAttribute('data-ix') === 'corner' }); } };
        out.push(g);
      }
      g.sub.push({ label: it.label, icon: it.icon, run: run });
    });
    return out;
  }
  function backToMenu(anchor) { if (anchor.getAttribute('data-ix') === 'corner') cornerMenu(anchor); else editMenu(anchor); }
  var editing = function () { return !!(document.body && document.body.classList.contains('editing')); };
  function afterLogin(thenLabel) {   // logged-in pages load differently, so reload, then continue where the click left off
    try { sessionStorage.setItem('hub-after', 'edit'); if (thenLabel) sessionStorage.setItem('hub-then', thenLabel); } catch (x) {}
    location.reload();
  }
  /* Cards and Tasks have no edit mode of their own: there, editing only shows the edit bar */
  var ownEdit = function () { return !q1('toggle') && hubItems().some(function (it) { return !it.main; }); };
  var canEdit = function () { return !!q1('toggle') || ownEdit(); };
  function doneEdit() { var d = q1('done'); if (d) d.click(); else document.body.classList.remove('editing'); }
  function startEdit(thenLabel) {
    if (S.admin === undefined) return whenKnown(function () { if (S.admin !== undefined) startEdit(thenLabel); });
    var t = q1('toggle'); if (!canEdit()) return;
    if (!S.admin) { login().then(function () { afterLogin(thenLabel); }, function () {}); return; }
    if (!editing()) { if (t) t.click(); else document.body.classList.add('editing'); }
    if (thenLabel) setTimeout(function () { runItem(thenLabel); }, 450);
  }
  function runItem(label) { hubItems().some(function (it) { if (it.label === label) { it.el.click(); return true; } }); }
  /* The pencil menu: Edit This Page and the page's own Settings (data-hub-main). Everything else is on the edit bar (3b). */
  function editMenu(anchor) {
    var items = [], t = q1('toggle');
    if (canEdit()) items.push(editing()
      ? { label: 'Done Editing', icon: ICON.check, accent: true, run: doneEdit }
      : { label: 'Edit This Page', icon: ICON.edit, run: function () { startEdit(); } });
    itemEntries(anchor, t, true).forEach(function (x) { items.push(x); });
    EXTRA.forEach(function (x) { items.push(x); });
    if (!items.length) { toast('There is nothing to edit on this page.'); return; }
    popMenu(anchor, items);
  }


  /* ---------- 3b. the edit bar (1.53.5): while a page is being edited, its tools sit in one pill at the bottom, the same on
     every page (Home's look). The page's own items in order, its Settings last, then Done. A page's old bar is marked
     data-hub-ebar and hidden (html[data-ix-ebar] in shell.css); its data-hub-hint is said once per visit when editing starts.
     Each page's Settings chooses Icons Only or Icons and Text: a select marked data-ix-editbar, saved with that dialog's
     data-ix-save button into the site setting editBar ({links: 'text'}; icons is the default). Phones always show icons. */
  H.setAttribute('data-ix-ebar', '');
  var editBarMode = function () { return S.editBar && S.editBar[APP] === 'text' ? 'text' : 'icons'; };
  var ebarKey = '', ebarEnts = [], ebarWas = false;
  function barEntries() {
    var all = hubItems(), out = [], groups = {};
    all.filter(function (it) { return !it.main; }).concat(all.filter(function (it) { return it.main; })).forEach(function (it) {
      var run = function () { it.el.click(); };
      if (!it.group) { out.push({ label: it.label, icon: it.icon, run: run }); return; }
      var g = groups[it.group];
      if (!g) { g = groups[it.group] = { label: it.group, icon: it.icon, sub: [] }; g.run = function (btn) { popMenu(btn, g.sub); }; out.push(g); }
      g.sub.push({ label: it.label, icon: it.icon, run: run });
    });
    return out;
  }
  function drawEditBar() {
    var el = document.getElementById('ix-ebar'), on = editing() && HAS_EDIT;
    if (on && !ebarWas) {   // editing just started: the page's hint, once per visit
      var hn = document.querySelector('[data-hub-hint]'), hk = 'hub-hint-' + APP;
      try { if (hn && !sessionStorage.getItem(hk)) { sessionStorage.setItem(hk, '1'); toast(hn.getAttribute('data-hub-hint')); } } catch (e) {}
    }
    ebarWas = on;
    if (!on) { if (el) el.hidden = true; var tp = document.getElementById('ix-ebtip'); if (tp) tp.remove(); return; }
    if (!el) {
      el = document.createElement('div'); el.id = 'ix-ebar'; el.setAttribute('role', 'toolbar'); el.setAttribute('aria-label', 'Edit Tools');
      el.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        if (b.hasAttribute('data-ix-done')) { closePop(); return doneEdit(); }
        var it = ebarEnts[+b.getAttribute('data-i')]; if (it) it.run(b);
      });
      var tip = function (e) {   // the name above a button (Icons Only; with text, only where the text is hidden)
        var t = document.getElementById('ix-ebtip'), bt = e.type === 'mouseout' || e.type === 'focusout' ? null : e.target.closest('.ix-eb');
        var lb = bt && bt.querySelector('.ix-ebl');
        if (!bt || (lb && lb.offsetWidth)) { if (t) t.remove(); return; }
        if (!t) { t = document.createElement('div'); t.id = 'ix-ebtip'; t.setAttribute('aria-hidden', 'true'); document.body.appendChild(t); }
        t.textContent = bt.getAttribute('data-tip');
        var r = bt.getBoundingClientRect();
        t.style.top = (r.top - t.offsetHeight - 10) + 'px';
        t.style.left = Math.max(8, Math.min(innerWidth - t.offsetWidth - 8, r.left + r.width / 2 - t.offsetWidth / 2)) + 'px';
      };
      ['mouseover', 'mouseout', 'focusin', 'focusout'].forEach(function (k) { el.addEventListener(k, tip); });
      document.body.appendChild(el);
    }
    ebarEnts = barEntries();
    var mode = editBarMode(), key = mode + '|' + ebarEnts.map(function (x) { return x.label; }).join('|');
    if (key !== ebarKey) {
      ebarKey = key; el.className = mode === 'text' ? 'ix-ebar-text' : '';
      el.innerHTML = ebarEnts.map(function (x, i) {
        return '<button type="button" class="ix-eb" data-i="' + i + '" aria-label="' + esc(x.label) + '" data-tip="' + esc(x.label) + '">' + svg(x.icon || ICON.edit) +
          '<span class="ix-ebl">' + esc(x.label) + '</span></button>';
      }).join('') + (ebarEnts.length ? '<span class="ix-ebsep" aria-hidden="true"></span>' : '') +
        '<button type="button" class="ix-eb ix-ebdone" data-ix-done aria-label="Done" data-tip="Done">' + svg(ICON.check) + '</button>';
    }
    el.hidden = false;
  }
  /* the Edit Bar choice in the page's Settings: shown when the dialog opens, saved with its Save button */
  function editBarPick() { [].forEach.call(document.querySelectorAll('[data-ix-editbar]'), function (s) { s.value = editBarMode(); }); }
  function watchEditBarPick() {
    [].forEach.call(document.querySelectorAll('[data-ix-editbar]'), function (s) {
      var d = s.closest('dialog'); if (!d || d._ixEb) return; d._ixEb = true;
      new MutationObserver(function () { if (d.open) editBarPick(); }).observe(d, { attributes: true, attributeFilter: ['open'] });
    });
    editBarPick();
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-ix-save]'), d = b && b.closest('dialog'), sel = d && d.querySelector('[data-ix-editbar]');
    if (!sel || !S.admin || sel.value === editBarMode()) return;
    var eb = {}; Object.keys(S.editBar || {}).forEach(function (k) { eb[k] = S.editBar[k]; });
    if (sel.value === 'text') eb[APP] = 'text'; else delete eb[APP];
    api('settings', { settings: { editBar: eb } }).then(function (j) {
      if (!j.ok || !j.state) { toast(j.error || 'The Edit Bar choice could not be saved.'); return; }
      S.editBar = j.state.editBar; remember(S); ebarKey = ''; drawEditBar();
    }).catch(function () { toast('The Edit Bar choice could not be saved.'); });
  }, true);

  /* ---------- (1.61) buttons instead of a dropdown ----------
     <select data-ix-seg> with 2 or 3 options becomes one row of buttons (role radiogroup). The select stays, hidden, and is the
     truth: a click sets it and fires "change"; code that sets select.value is followed on the next change or when the window opens. */
  function segBuild(sel) {
    if (sel._ixSeg || sel.options.length > 3) return; sel._ixSeg = true;
    var g = document.createElement('div'); g.className = 'ix-sgc'; g.setAttribute('role', 'radiogroup');
    var lab = sel.id && document.querySelector('label[for="' + sel.id + '"]'); if (lab) { if (!lab.id) lab.id = sel.id + '-l'; g.setAttribute('aria-labelledby', lab.id); } else if (sel.getAttribute('aria-label')) g.setAttribute('aria-label', sel.getAttribute('aria-label'));
    [].forEach.call(sel.options, function (o) {
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.v = o.value; b.textContent = o.textContent;
      b.addEventListener('click', function () { if (sel.value === o.value) return; sel.value = o.value; sel.dispatchEvent(new Event('change', { bubbles: true })); paint(); });
      g.appendChild(b);
    });
    function paint() { [].forEach.call(g.children, function (b) { var on = b.dataset.v === sel.value; b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; }); }
    g.addEventListener('keydown', function (e) {
      var k = e.key, d = k === 'ArrowRight' || k === 'ArrowDown' ? 1 : k === 'ArrowLeft' || k === 'ArrowUp' ? -1 : 0; if (!d) return;
      e.preventDefault(); var bs = [].slice.call(g.children), i = bs.indexOf(document.activeElement); if (i < 0) i = bs.findIndex(function (b) { return b.dataset.v === sel.value; });
      var n = bs[(i + d + bs.length) % bs.length]; n.focus(); n.click();
    });
    sel.classList.add('ix-sgc-h'); sel.setAttribute('aria-hidden', 'true'); sel.tabIndex = -1; sel.parentNode.insertBefore(g, sel.nextSibling);
    sel._ixSegPaint = paint; sel.addEventListener('change', paint); paint();
    var d = sel.closest('dialog'); if (d) new MutationObserver(function () { if (d.open) paint(); }).observe(d, { attributes: true, attributeFilter: ['open'] });
    var pv = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');   // setting .value from a page's code repaints too
    Object.defineProperty(sel, 'value', { configurable: true, get: function () { return pv.get.call(sel); }, set: function (v) { pv.set.call(sel, v); paint(); } });
  }
  function segAll() { [].forEach.call(document.querySelectorAll('select[data-ix-seg],select[data-ix-editbar]'), segBuild); }
  whenBody(function () { segAll(); new MutationObserver(segAll).observe(document.body, { childList: true, subtree: true }); });

  /* ---------- (1.61) one Settings window for every page ----------
     dialog.ix-sdlg: title + close X on top, a scrolling body, the buttons in a footer. The X does what Cancel does. */
  function sdlgBuild(d) {
    if (d._ixS) return; d._ixS = true;
    if (d.querySelector('.dh,.ix-sh')) return;
    var c = d.querySelector(':scope>form') || d, kids = [].slice.call(c.children);
    var t = kids.filter(function (k) { return /^H[23]$/.test(k.tagName); })[0];
    var foot = kids.slice().reverse().filter(function (k) { return k.matches('.act,.actions'); })[0];
    if (!t || !foot) return;
    var h = document.createElement('div'); h.className = 'ix-sh';
    var x = document.createElement('button'); x.type = 'button'; x.className = 'ix-sx'; x.setAttribute('aria-label', 'Close');
    x.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    x.addEventListener('click', function () {
      var cb = foot.querySelector('[data-close],[value=cancel],[data-r=cancel],[id$=cancel],[id$=Cancel]');
      if (cb) cb.click(); else d.close();
    });
    c.insertBefore(h, t); h.appendChild(t); h.appendChild(x);
    var b = document.createElement('div'); b.className = 'ix-sb';
    kids.forEach(function (k) { if (k !== t && k !== foot) b.appendChild(k); });
    c.insertBefore(b, foot); foot.classList.add('ix-sf');
    d.setAttribute('aria-labelledby', t.id || (t.id = (d.id || 'sd') + '-t'));
  }
  whenBody(function () { [].forEach.call(document.querySelectorAll('dialog.ix-sdlg'), sdlgBuild); });

  /* ---------- 4. the bar: three styles, each with its own layout ----------
     top:  logo, pages, search box, theme, pencil, Backup, gear. It slides away while you scroll down (4b).
     side: an 80 px rail: logo, search, pages, then theme, pencil, Backup, gear. Phones: a floating button (or a swipe
           from the left edge) opens the same things as a panel.
     dock: one floating pill: pages, search, pencil, Backup, gear. Phones: the pill holds the pages, a round button
           beside it opens a sheet with the rest.
     Every style ends with Backup (red while a backup is due) and the gear, which opens the Settings page. */
  var lastBar = '';
  var NAV = function () { var n = H.getAttribute('data-ix-nav'); return n === 'side' || n === 'dock' ? n : 'top'; };
  var phone = function () { return matchMedia('(max-width:760px)').matches; };
  function iconBtn(k, label, icon, cls, id) {
    return '<button type="button" class="ix-ib' + (cls ? ' ' + cls : '') + '"' + (id ? ' id="' + id + '"' : '') + ' data-ix="' + k + '" aria-label="' + label + '" title="' + label + '">' + icon + '</button>';
  }
  function themeLabel() { var n = themeNow() === 'light' ? 'Dark' : 'Light'; return 'Switch to ' + n + ' Mode'; }
  /* Logged in: Backup (green, red with a dot while a backup is due) and the gear that opens Settings. Logged out: the key. */
  function acctButtons(adm) {
    if (!adm) return iconBtn('login', 'Log In', svg(ICON.key), 'ix-key');
    var due = backupDue();
    return '<button type="button" class="ix-ib ix-bk' + (due ? ' due' : '') + '" data-ix="backup" aria-label="' + (due ? 'Backup (a backup is due)' : 'Backup') + '" title="' +
      (due ? 'A backup is due: open Backup' : 'Backup and Import') + '">' + svg(ICON.box) + '</button>' + iconBtn('account', 'Settings', svg(ICON.gear));
  }
  function pageLinks() {
    return '<div class="ix-links">' + pages().map(function (p) {
      return '<a href="' + p[2] + '" data-page="' + p[0] + '"' + (p[0] === APP ? ' aria-current="page"' : '') + ' title="' + esc(p[1]) + '">' + svg(p[3]) + '<span>' + esc(p[1]) + '</span></a>';
    }).join('') + '</div>';
  }
  function drawBar() {
    var bar = document.getElementById('ix-bar');
    cornerButton();
    if (!H.hasAttribute('data-ix-bar')) { if (bar) bar.remove(); lastBar = ''; return; }
    if (!document.body) return whenBody(drawBar);
    var adm = isAdmin(), nav = NAV();
    var mark = '<img class="ix-logo" src="' + esc(S.logo ? ROOT + S.logo : CORE + 'assets/brand/logo-192.png') + '" alt="">';   // your logo, or Homebase Hub's own
    var brand = '<a class="ix-brand" href="' + ROOT + '" aria-label="' + esc(S.siteName || 'Homebase Hub') + '">' + mark + '<span class="ix-bname">' + esc(S.siteName || 'Homebase Hub') + '</span></a>';
    var theme = iconBtn('theme', themeLabel(), themeIcon());
    var edit = HAS_EDIT ? iconBtn('edit', 'Edit', svg(ICON.edit), '', 'ix-editb') : '';
    var me = acctButtons(adm), links = pageLinks();
    var html;
    if (nav === 'side') {
      html = brand + iconBtn('search', 'Search (press /)', svg(ICON.search), 'ix-sbtn') + links +
        '<div class="ix-tools">' + theme + edit + me + '</div>' +
        '<button type="button" class="ix-fab" data-ix="menu" aria-label="Pages and Menu" title="Pages and Menu">' + svg(ICON.menu) + '</button>';
    } else if (nav === 'dock') {
      html = '<div class="ix-pill">' + links + '<span class="ix-div" aria-hidden="true"></span><div class="ix-tools">' +
        iconBtn('search', 'Search (press /)', svg(ICON.search), 'ix-sbtn') + edit + me + '</div></div>' +
        '<button type="button" class="ix-fab" data-ix="sheet" aria-label="Search and Menu" title="Search and Menu">' + svg(ICON.search) + '</button>';
    } else {
      html = '<button type="button" class="ix-ib ix-menu" data-ix="menu" aria-label="Pages" title="Pages">' + svg(ICON.menu) + '</button>' + brand + links +
        '<div class="ix-search" id="ix-sbox">' + svg(ICON.search) + '<input type="search" id="ix-q" placeholder="Search" autocomplete="off" spellcheck="false" aria-label="Search the Whole Site">' +
          '<button type="button" class="ix-fbtn" data-ix="filters" aria-label="Search Options" title="Search Options">' + svg(ICON.filter) + '</button><kbd>/</kbd></div>' +
        '<div class="ix-tools">' + iconBtn('search', 'Search', svg(ICON.search), 'ix-sbtn') + theme + edit + me + '</div>';
    }
    if (html === lastBar && bar) return;
    lastBar = html;
    if (!bar) { bar = document.createElement('div'); bar.id = 'ix-bar'; bar.setAttribute('role', 'navigation'); bar.setAttribute('aria-label', 'Site'); document.body.prepend(bar); }
    var q = document.getElementById('ix-q'), qv = q ? q.value : '', had = q && document.activeElement === q;
    bar.innerHTML = html;
    if (qv && (q = document.getElementById('ix-q'))) { q.value = qv; if (had) q.focus(); }
    bindInlineSearch();
    markEditing();
  }
  /* Start page with the bar switched off: its corner shows reload and ONE gear button instead of Edit.
     Logged out it opens the login; logged in it lists editing, the other sections and Settings. */
  function cornerButton() {
    var c = APP === 'home' && document.querySelector('.corner'), b = c && c.querySelector('[data-ix="corner"]');
    if (!c || H.hasAttribute('data-ix-bar')) { if (b) b.remove(); return; }
    if (b) return;
    b = document.createElement('button'); b.type = 'button'; b.className = 'chip round'; b.setAttribute('data-ix', 'corner');
    b.setAttribute('aria-label', 'Menu'); b.title = 'Menu'; b.innerHTML = svg(ICON.gear);
    c.appendChild(b);
  }
  function cornerMenu(b) {
    if (S.admin === undefined) return whenKnown(function () { if (S.admin !== undefined) cornerMenu(b); });
    if (!S.admin) { login().then(function () { location.reload(); }, function () {}); return; }
    var t = q1('toggle'), items = [];
    if (canEdit()) items.push(editing() ? { label: 'Done Editing', icon: ICON.check, accent: true, run: doneEdit } : { label: 'Edit This Page', icon: ICON.edit, run: function () { startEdit(); } });
    itemEntries(b, t, true).forEach(function (x) { items.push(x); });
    items.push({ sep: true });
    pages().filter(function (p) { return p[0] !== APP; }).forEach(function (p) { items.push({ label: p[1], icon: p[3], run: function () { location.href = p[2]; } }); });
    items.push({ sep: true }, { label: 'Settings', icon: ICON.gear, run: function () { settings(); } }, { label: 'Log Out', icon: ICON.out, danger: true, run: logout });
    popMenu(b, items, { corner: true });
  }
  function markEditing() { var b = document.getElementById('ix-editb'); if (b) b.classList.toggle('on', editing()); drawEditBar(); }
  /* The Backup icon is green, and red while a backup is due (Backup > Remind me every). Clicking it turns it green again
     for a day; exporting a full backup starts the countdown over. */
  function backupDue() {
    var every = +S.backupEvery || 0, last = +S.backupLast || 0;
    if (!S.admin && !S.adm || every <= 0) return false;
    if (last && (Date.now() / 1000 - last) / 86400 < every) return false;
    var ack = +(ls.get('hub-bk-ack') || 0);
    return !(ack && Date.now() - ack < 86400000 && ack / 1000 > last);
  }
  function backupSeen() { if (backupDue()) { ls.set('hub-bk-ack', String(Date.now())); lastBar = ''; drawBar(); } }
  /* ...and one quiet message per visit while it is due */
  function backupReminder() {
    if (!S.admin || !backupDue()) return;   // same rule as the red icon: not after it was clicked today
    var days = Math.floor((Date.now() / 1000 - (S.backupLast || 0)) / 86400);
    if (S.backupLast && days < S.backupEvery) return;
    try { if (sessionStorage.getItem('hub-bk-told')) return; sessionStorage.setItem('hub-bk-told', '1'); } catch (e) {}
    toast(S.backupLast ? 'Backup reminder: your last backup was ' + days + ' days ago. Use the Backup icon.' : 'Backup reminder: no backup yet. Use the Backup icon.');
  }
  /* A panel that slides in (the page list on phones, and the whole sidebar on phones) or a sheet from the bottom (the dock on phones).
     Both are drawn fresh each time they open, so they always show the current login, theme and backup state. */
  function panelFoot(adm) {
    return (HAS_EDIT ? '<button type="button" class="ix-pbtn" data-ix="edit">' + svg(ICON.edit) + '<span>Edit</span></button>' : '') +
      '<button type="button" class="ix-pbtn" data-ix="theme">' + themeIcon() + '<span>' + (themeNow() === 'light' ? 'Dark' : 'Light') + '</span></button>' + acctButtons(adm);
  }
  function openPanel(id, open, build, from) {   // from: the button that opened it (Safari does not focus a clicked button)
    var d = document.getElementById(id);
    if (!open) {
      if (d && d.classList.contains('open')) { d.classList.remove('open'); if (d._from && d._from.focus && document.contains(d._from)) d._from.focus(); }
      return;
    }
    if (!d) { d = document.createElement('div'); d.id = id; document.body.appendChild(d); }
    d._from = from || document.activeElement;
    d.innerHTML = build(isAdmin());
    d.classList.add('open');
    var f = d.querySelector('[aria-current="page"]') || d.querySelector('button,a'); if (f) setTimeout(function () { f.focus(); }, 30);
  }
  function drawer(open, from) {
    openPanel('ix-drawer', open, function (adm) {
      return '<div class="ix-scrim" data-ix="close"></div><nav aria-label="Pages"><a class="ix-brand" href="' + ROOT + '"><img class="ix-logo" src="' +
        esc(S.logo ? ROOT + S.logo : CORE + 'assets/brand/logo-192.png') + '" alt=""><span>' + esc(S.siteName || 'Homebase Hub') + '</span></a>' +
        '<button type="button" class="ix-psearch" data-ix="search">' + svg(ICON.search) + '<span>Search</span></button>' +
        pages().map(function (p) { return '<a href="' + p[2] + '"' + (p[0] === APP ? ' aria-current="page"' : '') + '>' + svg(p[3]) + esc(p[1]) + '</a>'; }).join('') +
        '<div class="ix-pfoot">' + panelFoot(adm) + '</div></nav>';
    }, from);
  }
  function sheet(open, from) {
    openPanel('ix-sheet', open, function (adm) {
      var due = backupDue();
      var tile = function (k, icon, label, cls) { return '<button type="button" class="ix-stile' + (cls ? ' ' + cls : '') + '" data-ix="' + k + '">' + icon + '<span>' + label + '</span></button>'; };
      return '<div class="ix-scrim" data-ix="close"></div><div class="ix-shp" role="dialog" aria-modal="true" aria-label="Search and Menu"><span class="ix-grab" aria-hidden="true"></span>' +
        '<button type="button" class="ix-psearch" data-ix="search">' + svg(ICON.search) + '<span>Search everything</span></button><div class="ix-tiles6">' +
        (HAS_EDIT ? tile('edit', svg(ICON.edit), editing() ? 'Editing' : 'Edit') : '') +
        tile('theme', themeIcon(), themeNow() === 'light' ? 'Dark Mode' : 'Light Mode') +
        (adm ? tile('backup', svg(ICON.box), due ? 'Backup Due' : 'Backup', due ? 'due' : '') + tile('account', svg(ICON.gear), 'Settings') + tile('logout', svg(ICON.out), 'Log Out', 'danger')
             : tile('login', svg(ICON.key), 'Log In')) + '</div></div>';
    }, from);
  }
  function closePanels() { drawer(false); sheet(false); }
  /* Sidebar style on a phone: a swipe from the left edge opens the panel */
  var swipe = null;
  document.addEventListener('touchstart', function (e) {
    var t = e.touches[0]; swipe = null;
    if (t && t.clientX < 18 && NAV() === 'side' && phone() && H.hasAttribute('data-ix-bar')) swipe = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    var t = e.touches[0]; if (!swipe || !t) return;
    if (t.clientX - swipe.x > 50 && Math.abs(t.clientY - swipe.y) < 40) { swipe = null; drawer(true); }
  }, { passive: true });

  /* ---------- 4b. the top bar hides while you scroll down and comes back on any scroll up ----------
     It stays while the search box has focus, a menu is open, or the mouse is at the top edge. The dock gets smaller while you scroll.
     Pages that scroll inside a box count too (the listener catches every scroll), but small boxes (a list in a dialog) do not. */
  var scrollT = 0;
  function holdBar() {
    var bar = document.getElementById('ix-bar');
    var a = document.activeElement;   // typing in the search box keeps it; a button that was just tapped does not
    return !!(popEl || (bar && a && bar.contains(a) && a.tagName === 'INPUT') || (sres && !sres.hidden) || document.querySelector('#ix-drawer.open,#ix-sheet.open,#ix-spot.open'));
  }
  function barHidden(on) {
    if (on && holdBar()) on = false;
    if (H.classList.contains('ix-hide') !== on) H.classList.toggle('ix-hide', on);
  }
  document.addEventListener('scroll', function (e) {
    if (!H.hasAttribute('data-ix-bar')) return;
    var t = e.target, el = (t === document || t === H || t === document.body) ? null : t;
    if (el && (el.nodeType !== 1 || el.clientHeight < innerHeight * 0.5 || el.closest('#ix-bar,#ix-pop,#ix-drawer,#ix-sheet,#ix-spot,.ix-panel,#ix-dlg,dialog'))) return;
    var box = el || window, y = el ? el.scrollTop : (window.scrollY || 0), prev = box.__ixY == null ? y : box.__ixY;
    box.__ixY = y;
    H.classList.add('ix-scrolling'); clearTimeout(scrollT); scrollT = setTimeout(function () { H.classList.remove('ix-scrolling'); }, 240);
    if (NAV() !== 'top') return;
    if (y < 8) barHidden(false);
    else if (y - prev > 6 && y > 60) barHidden(true);
    else if (y - prev < -4) barHidden(false);
  }, { capture: true, passive: true });
  document.addEventListener('focusin', function (e) { var bar = document.getElementById('ix-bar'); if (bar && bar.contains(e.target)) barHidden(false); });
  document.addEventListener('mousemove', function (e) { if (e.clientY < 10 && H.classList.contains('ix-hide')) barHidden(false); }, { passive: true });

  /* ---------- 5. small popup menu (Edit) ---------- */
  var popEl = null, popAnchor = null;
  function closePop() { if (popEl) { popEl.remove(); popEl = null; } popAnchor = null; }
  function popMenu(anchor, items, opts) {
    var again = popAnchor === anchor; closePop(); if (again) return;
    popAnchor = anchor;
    popEl = document.createElement('div'); popEl.id = 'ix-pop'; popEl.setAttribute('role', 'menu');
    popEl.innerHTML = items.map(function (it, i) {
      return it.sep ? '<hr>' : '<button type="button" role="menuitem" data-i="' + i + '"' + (it.danger ? ' class="danger"' : it.accent ? ' class="accent"' : '') + '>' +
        (it.icon ? svg(it.icon) : '<span class="ix-gap"></span>') + '<span class="ix-pl">' + esc(it.label) + '</span>' +
        (it.note ? '<small' + (it.warn ? ' class="warn"' : '') + '>' + esc(it.note) + '</small>' : '') + '</button>';
    }).join('');
    document.body.appendChild(popEl);
    var r = anchor.getBoundingClientRect(), w = popEl.offsetWidth, h = popEl.offsetHeight;
    // the rail's menus open beside it; everything else opens below its button, or above it when the button sits low on the screen
    var sideMode = !(opts && opts.corner) && NAV() === 'side' && !phone() && !!anchor.closest('#ix-bar');
    var top = r.top > innerHeight / 2 ? r.top - h - 8 : r.bottom + 8;
    if (sideMode) top = Math.min(r.top, innerHeight - h - 8);
    var left = sideMode ? anchor.closest('#ix-bar').getBoundingClientRect().right + 8 : r.right - w;
    popEl.style.top = Math.max(8, Math.min(top, innerHeight - h - 8)) + 'px';
    popEl.style.left = Math.max(8, Math.min(left, innerWidth - w - 8)) + 'px';
    popEl.onclick = function (e) {
      var b = e.target.closest('button[data-i]'); if (!b) return;
      var it = items[+b.dataset.i]; closePop();
      if (it && it.run) { if (!/…$/.test(it.label) && it.label !== 'Back') closePanels(); it.run(); }
    };
    var f = popEl.querySelector('button'); if (f) f.focus();
  }
  document.addEventListener('mousedown', function (e) { if (popEl && !popEl.contains(e.target) && !(popAnchor && popAnchor.contains(e.target))) closePop(); }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePop(); });
  window.addEventListener('resize', closePop);

  /* ---------- 6. theme: one switch for every page, with a smooth cross-fade ---------- */
  /* preview = show the theme without remembering it (Settings previews; closing Settings puts your own theme back) */
  function applyTheme(t, preview) {
    if (!preview) { ls.set('hub-theme', t); syncThemeKeys(t); }
    H.setAttribute('data-theme', t);
    document.dispatchEvent(new CustomEvent('hub:theme', { detail: t }));   // pages that recolour themselves listen to this
    var m = document.querySelector('meta[name="theme-color"]'); if (m && APP !== 'tools') m.setAttribute('content', t === 'light' ? '#f6f5f1' : '#000000');
    drawBar();
  }
  function setTheme(t) {
    if (t !== 'light') t = 'dark';
    if (H.getAttribute('data-theme') === t && ls.get('hub-theme') === t) return;
    if (reduced()) return applyTheme(t);
    if (document.startViewTransition) {
      H.classList.add('ix-vt');
      var vt = document.startViewTransition(function () { applyTheme(t); });
      var done = function () { H.classList.remove('ix-vt'); };
      vt.finished.then(done, done);
    } else {
      H.classList.add('ix-fade'); applyTheme(t);
      setTimeout(function () { H.classList.remove('ix-fade'); }, 450);
    }
  }
  function resolveTheme(t) { return t === 'auto' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : (t === 'light' ? 'light' : 'dark'); }
  function previewTheme(t) { t = resolveTheme(t); if (H.getAttribute('data-theme') !== t) applyTheme(t, true); }
  /* this browser's own theme: what it last chose, else the site default */
  function myTheme() { var t = ls.get('hub-theme'); return t === 'light' || t === 'dark' ? t : resolveTheme(S.theme); }
  function restoreTheme() { var t = myTheme(); if (H.getAttribute('data-theme') !== t) applyTheme(t, true); }
  function storeTheme(t) { t = resolveTheme(t); ls.set('hub-theme', t); syncThemeKeys(t); }
  // another tab changed the theme
  window.addEventListener('storage', function (e) { if (e.key === 'hub-theme' && e.newValue && e.newValue !== H.getAttribute('data-theme')) applyTheme(e.newValue === 'light' ? 'light' : 'dark'); });

  /* ---------- 7. one search for the whole site (Links, Info, Tools; Cards keeps its own) ----------
     Filters (scope, one tab, which fields, whole words) are remembered in this browser.
     Typing "links: text", "info: text" or "tools: text" is a shortcut for the scope. */
  var SX = { at: 0, p: null, links: [], info: [], linkTabs: [], infoTabs: [] };
  var SF = { scope: 'all', tab: '' };   // where to look; names, web addresses and note text are always searched
  try { var sf0 = JSON.parse(ls.get('hub-sfilter') || '{}') || {}; ['scope', 'tab'].forEach(function (k) { if (k in sf0) SF[k] = sf0[k]; }); } catch (e) {}
  var saveSF = function () { ls.set('hub-sfilter', JSON.stringify(SF)); };
  var SF_DEFAULT = function () { return SF.scope === 'all' && !SF.tab; };

  function plainNote(t) {
    return String(t || '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[#*_`>~|]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function loadSearchData() {
    if (SX.p && Date.now() - SX.at < 60000) return SX.p;
    SX.at = Date.now();
    var get = function (url) { return hubFetch(url, { credentials: 'same-origin', cache: 'no-store' }, { timeout: 20000 }).then(function (r) { return r.json(); }).catch(function () { return null; }); };
    SX.p = Promise.all([get(ROOT + 'web/links/api.php?action=get'), get(ROOT + 'web/info/api.php'), S.admin ? get(ROOT + 'web/tasks/api.php') : null]).then(function (r) {
      var L = r[0], I = r[1], K = r[2];
      SX.links = []; SX.linkTabs = []; SX.info = []; SX.infoTabs = []; SX.tasks = [];
      if (K && K.auth) (K.tasks || []).forEach(function (t) {   // Tasks are private: only searched while you are logged in
        SX.tasks.push({ id: t.id, name: String(t.name || ''), cat: String(t.cat || ''), pay: String(t.pay || ''), notes: plainNote(t.notes), due: t.due, status: t.status,
          price: t.price, cur: t.cur || (K.settings && K.settings.currency) || '' });
      });
      ((L && L.data && L.data.tabs) || []).forEach(function (t) {
        SX.linkTabs.push({ id: t.id, name: t.title || 'Tab' });
        (t.categories || []).forEach(function (c) {
          (c.links || []).forEach(function (l) {
            if (!l || l.divider || !l.url) return;
            SX.links.push({ title: String(l.title || l.url), url: String(l.url), icon: String(l.icon || ''), where: (t.title || '') + (c.title ? ' › ' + c.title : ''), tab: t.id });
          });
        });
      });
      if (I && !I.closed) (I.tabs || []).forEach(function (t) {
        SX.infoTabs.push({ id: t.id, name: t.name || 'Tab' });
        SX.info.push({ title: String(t.name || 'Tab'), text: '', body: '', tab: t.id, color: t.color || '' });
        (t.boxes || []).forEach(function (b) {
          if (/^enc1:/.test(b.title || '') || /^enc1:/.test(b.notes || '')) return;   // encrypted: only the tab name is searchable
          SX.info.push({ title: String(t.name || 'Tab'), text: String(b.title || ''), body: plainNote(b.notes), tab: t.id, color: t.color || '' });
        });
      });
    });
    return SX.p;
  }
  function snip(text, q) {
    var i = text.toLowerCase().indexOf(q); if (i < 0) return esc(text.slice(0, 90));
    var a = Math.max(0, i - 30), z = Math.min(text.length, i + q.length + 60);
    return (a ? '…' : '') + esc(text.slice(a, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length, z)) + (z < text.length ? '…' : '');
  }
  function parseQuery(raw) {
    var scope = SF.scope, m = /^(links|info|tasks|tools)\s*:\s*/i.exec(raw);
    if (m) { scope = m[1].toLowerCase(); raw = raw.slice(m[0].length); }
    return { q: raw.trim(), scope: scope };
  }
  function searchResults(p) {
    var q = p.q.toLowerCase(), scope = p.scope;
    var rank = function (s) {
      s = String(s || '').toLowerCase();
      var i = s.indexOf(q); return i < 0 ? 9 : i === 0 ? 0 : /[\s./:-]/.test(s.charAt(i - 1)) ? 1 : 2;
    };
    var links = [], info = [], seen = {}, tabFilter = SF.tab ? SF.tab.split(':') : null;
    if (scope === 'all' || scope === 'links') SX.links.forEach(function (l, i) {
      if (tabFilter && !(tabFilter[0] === 'links' && tabFilter[1] === l.tab)) return;
      var r = Math.min(rank(l.title), rank(l.url) + 1, rank(l.where) + 2);
      if (r < 9) links.push({ r: r, i: i, v: l });
    });
    if (scope === 'all' || scope === 'info') SX.info.forEach(function (x, i) {
      if (tabFilter && !(tabFilter[0] === 'info' && tabFilter[1] === x.tab)) return;
      var r = Math.min(rank(x.title), x.text ? rank(x.text) + 1 : 9, x.body ? rank(x.body) + 2 : 9);
      if (r >= 9) return;
      var key = x.tab + '|' + x.text; if (seen[key]) return; seen[key] = 1;
      info.push({ r: r, i: i, v: x });
    });
    var tasks = [];
    if ((scope === 'all' || scope === 'tasks') && !tabFilter) (SX.tasks || []).forEach(function (t, i) {
      var r = Math.min(rank(t.name), rank(t.cat) + 1, rank(t.pay) + 2, t.notes ? rank(t.notes) + 2 : 9);
      if (r < 9) tasks.push({ r: r + (t.status === 'done' ? 3 : 0), i: i, v: t });
    });
    var cmp = function (a, b) { return a.r - b.r || a.i - b.i; };
    links.sort(cmp); info.sort(cmp); tasks.sort(cmp);
    return { links: links.slice(0, 8).map(function (x) { return x.v; }), info: info.slice(0, 8).map(function (x) { return x.v; }), tasks: tasks.slice(0, 8).map(function (x) { return x.v; }) };
  }
  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } }
  var infoHref = function (x, q) { return ROOT + 'web/info/#hub-info=' + encodeURIComponent(x.tab) + '&q=' + encodeURIComponent(q); };

  function filtersHtml() {
    var chip = function (v, l) { return '<button type="button" data-sf="scope" data-v="' + v + '" aria-pressed="' + (SF.scope === v) + '">' + l + '</button>'; };
    var tabs = '';
    if (SF.scope !== 'tools' && SF.scope !== 'tasks') {
      var opts = '<option value="">Any Tab</option>';
      if (SF.scope !== 'info' && SX.linkTabs.length) opts += '<optgroup label="Links">' + SX.linkTabs.map(function (t) { return '<option value="links:' + esc(t.id) + '"' + (SF.tab === 'links:' + t.id ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('') + '</optgroup>';
      if (SF.scope !== 'links' && SX.infoTabs.length) opts += '<optgroup label="Info">' + SX.infoTabs.map(function (t) { return '<option value="info:' + esc(t.id) + '"' + (SF.tab === 'info:' + t.id ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('') + '</optgroup>';
      tabs = '<label class="ix-fl">Only in Tab<select data-sf="tab">' + opts + '</select></label>';
    }
    // where to look, and (Links and Info) one tab only; names, web addresses and note text are always searched
    return '<div class="ix-fs"><div class="ix-chips" role="group" aria-label="Search in">' + chip('all', 'Everything') + chip('links', 'Links') + chip('info', 'Info') + (S.admin ? chip('tasks', 'Tasks') : '') + chip('tools', 'Tools') +
      (SF_DEFAULT() ? '' : '<button type="button" class="ix-reset ix-more" data-sf="reset">Reset</button>') + '</div>' +
      (tabs ? '<div class="ix-fx">' + tabs + '</div>' : '') + '</div>';
  }
  function resultsHtml(p) {
    var r = searchResults(p), n = 0, h = '', q = p.q, ql = q.toLowerCase();
    var row = function (href, ext, lead, title, sub) {
      return '<a class="ix-r" role="option" id="ix-r' + (n++) + '" href="' + esc(href) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + lead + '<span class="ix-rt"><b>' + title + '</b><span>' + sub + '</span></span></a>';
    };
    if (r.links.length) h += '<div class="ix-rh">Links</div>' + r.links.map(function (l) {
      var ic = /^icons\//.test(l.icon) ? ROOT + 'web/hub/media/links/' + l.icon : /^https?:/.test(l.icon) ? l.icon : '';
      return row(safeHref(l.url), true, ic ? '<img src="' + esc(ic) + '" alt="" loading="lazy">' : '<i class="ix-d"></i>', snip(l.title, ql), esc(host(l.url)) + ' · ' + esc(l.where));
    }).join('');
    if (r.info.length) h += '<div class="ix-rh">Info</div>' + r.info.map(function (x) {
      var sub = x.text ? esc(x.text) + (x.body && x.body.toLowerCase().indexOf(ql) >= 0 ? ' — ' + snip(x.body, ql) : '') : (x.body ? snip(x.body, ql) : 'Tab');
      return row(infoHref(x, q), false, '<i class="ix-d" style="' + (/^#[0-9a-f]{3,8}$/i.test(x.color || '') ? 'background:' + x.color : '') + '"></i>', snip(x.title, ql), sub);
    }).join('');
    if (r.tasks.length) h += '<div class="ix-rh">Tasks</div>' + r.tasks.map(function (t) {
      var d = ''; try { d = new Date(t.due + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) {}
      var pr = ''; if (t.price != null) { try { pr = new Intl.NumberFormat(t.cur === 'INR' ? 'en-IN' : undefined, t.cur ? { style: 'currency', currency: t.cur, maximumFractionDigits: 2, minimumFractionDigits: 0 } : {}).format(t.price); } catch (e) { pr = String(t.price); } }
      var sub = [t.status === 'done' ? 'Done' : t.status === 'paused' ? 'Paused' : 'Due ' + d, t.cat, pr].filter(Boolean).map(esc).join(' · ');
      return row(ROOT + 'web/tasks/#task=' + encodeURIComponent(t.id), false, '<i class="ix-d"></i>', snip(t.name, ql), sub + (t.notes && t.notes.toLowerCase().indexOf(ql) >= 0 ? ' — ' + snip(t.notes, ql) : ''));
    }).join('');
    if (p.scope === 'all' || p.scope === 'tools') h += '<div class="ix-rh">Tools</div>' + row(ROOT + 'web/tools/#/search/' + encodeURIComponent(q), false, '<i class="ix-d"></i>', 'Search Tools for “' + esc(q) + '”', 'Image, PDF and Utility Tools');
    if (!n) h += '<div class="ix-none">No matches. Try “Everything” or fewer options.</div>';
    return h;
  }

  /* One results list for both the bar's box and the full-screen search. */
  function makeSearch(input, panel, onPick) {
    var idx = -1, t = 0, token = 0, forceOpen = false;
    function items() { return panel.querySelectorAll('.ix-r'); }
    function mark(i) { var it = items(); if (!it.length) return; idx = (i + it.length) % it.length; it.forEach(function (e, k) { e.setAttribute('aria-selected', String(k === idx)); }); it[idx].scrollIntoView({ block: 'nearest' }); }
    function show() {
      var p = parseQuery(input.value), my = ++token;
      if (!p.q && !forceOpen) { panel.hidden = true; panel.innerHTML = ''; return; }
      loadSearchData().then(function () {
        if (my !== token) return;
        panel.innerHTML = filtersHtml() + (p.q ? resultsHtml(p) : '<div class="ix-none">Type to search links, notes and tools.</div>');
        panel.hidden = false; idx = -1; if (p.q) mark(0);
        if (panel.id === 'ix-sres') placePanel(input, panel);
      });
    }
    panel._toggle = function () {   // the options button: open the filters even before anything is typed
      if (!panel.hidden && forceOpen) { forceOpen = false; if (!input.value.trim()) panel.hidden = true; return; }
      forceOpen = true; input.focus(); show();
    };
    input.addEventListener('focus', function () { loadSearchData(); if (input.value.trim()) show(); });
    input.addEventListener('input', function () { clearTimeout(t); t = setTimeout(show, 60); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); mark(idx + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); mark(idx - 1); }
      else if (e.key === 'Enter') { var it = items()[idx]; if (it) { e.preventDefault(); it.click(); } }
      else if (e.key === 'Escape') { if (input.value) { input.value = ''; show(); } else { forceOpen = false; panel.hidden = true; input.blur(); onPick && onPick(true); } }
    });
    panel.addEventListener('mousedown', function (e) { if (!e.target.closest('select,input,label')) e.preventDefault(); });
    panel.addEventListener('change', function (e) { var f = e.target.getAttribute && e.target.getAttribute('data-sf'); if (!f) return; if (f === 'tab') { SF.tab = e.target.value; saveSF(); show(); } });
    panel.addEventListener('click', function (e) {
      var s = e.target.closest('[data-sf]');
      if (s && s.tagName === 'BUTTON') {
        var f = s.getAttribute('data-sf');
        if (f === 'scope') { SF.scope = s.getAttribute('data-v'); if (SF.tab && SF.scope !== 'all' && SF.tab.split(':')[0] !== SF.scope) SF.tab = ''; }
        else if (f === 'reset') SF = { scope: 'all', tab: '' };
        saveSF(); forceOpen = true; show(); input.focus(); return;
      }
      var a = e.target.closest('a.ix-r'); if (!a) return;
      panel.hidden = true; forceOpen = false; onPick && onPick();
      if (a.href.indexOf('#hub-info=') >= 0 && a.href.split('#')[0] === location.href.split('#')[0]) {   // already on that page: no reload
        e.preventDefault(); location.hash = a.href.split('#')[1]; window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    });
  }
  function placePanel(input, panel) {
    var r = input.getBoundingClientRect(), w = Math.min(Math.max(r.width, 420), innerWidth - 16);
    panel.style.top = (r.bottom + 8) + 'px';
    panel.style.left = Math.max(8, Math.min(r.left, innerWidth - 8 - w)) + 'px';
    panel.style.width = w + 'px';
  }
  var sres;
  function bindInlineSearch() {
    var q = document.getElementById('ix-q'); if (!q) return;
    if (!sres) { sres = document.createElement('div'); sres.id = 'ix-sres'; sres.className = 'ix-panel'; sres.setAttribute('role', 'listbox'); sres.hidden = true; document.body.appendChild(sres); }
    makeSearch(q, sres);
    document.addEventListener('mousedown', function (e) { if (sres && !sres.hidden && !sres.contains(e.target) && !e.target.closest('#ix-sbox')) sres.hidden = true; });
  }
  /* full-screen search: the dock, phones, and the "/" shortcut when the bar has no search box */
  var spot;
  function openSpot() {
    if (!spot) {
      spot = document.createElement('div'); spot.id = 'ix-spot';
      spot.innerHTML = '<div class="ix-scrim" data-ix="spotx"></div><div class="ix-spotbox"><div class="ix-search">' + svg(ICON.search) +
        '<input type="search" id="ix-sq" placeholder="Search" autocomplete="off" spellcheck="false" aria-label="Search the Whole Site"><button type="button" class="ix-fbtn" data-ix="filters" aria-label="Search Options">' + svg(ICON.filter) + '</button></div>' +
        '<div class="ix-panel inline" id="ix-spres" role="listbox" hidden></div></div>';
      document.body.appendChild(spot);
      makeSearch(spot.querySelector('#ix-sq'), spot.querySelector('#ix-spres'), function () { spot.classList.remove('open'); });
    }
    spot.classList.add('open');
    var i = spot.querySelector('#ix-sq'); i.focus(); i.select();
  }
  function toggleFilters(btn) {
    var box = btn.closest('#ix-spot') ? spot.querySelector('#ix-spres') : sres;
    if (box && box._toggle) box._toggle();
  }
  function focusSearch() {
    var q = document.getElementById('ix-q');
    barHidden(false);
    if (q && q.offsetParent !== null) { q.focus(); q.select(); } else openSpot();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && spot && spot.classList.contains('open')) { spot.classList.remove('open'); return; }
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '') || (document.activeElement && document.activeElement.isContentEditable) || document.querySelector('dialog[open]') || (dlg && dlg.classList.contains('open'));
    if (typing || APP === 'cards' && e.key === '/') return;
    if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); e.stopPropagation(); focusSearch(); }
  }, true);

  /* ---------- 7a. keyboard shortcuts (1.61) ----------
     ? shows them. G then a letter goes to a page (G H Home, G L Links ...); E starts editing the page. Search keeps / and Ctrl+K.
     They never fire while you type in a field or while a window is open, and never with Ctrl, Alt or Cmd held. */
  var GOKEY = { home: 'h', links: 'l', info: 'i', cards: 'c', tasks: 't', files: 'f', tools: 'o' };
  var PAGEKEYS = {
    home: [['E', 'Edit this page']], links: [['1 to 9', 'Open that tab'], ['/', 'Search the bookmarks']], tasks: [['N', 'New task'], ['F', 'Search tasks'], ['C', 'Switch between List and Calendar']],
    files: [['/', 'Search your files']], cards: [['/', 'Search the cards']]
  };
  var chordT = 0;
  function goKeys() {
    var l = pages().filter(function (p) { return GOKEY[p[0]]; }).map(function (p) { return [GOKEY[p[0]], p[1], p[2]]; });
    if (S.admin) l.push(['s', 'Settings', ROOT + 'web/settings/']);
    return l;
  }
  function chordEnd() { clearTimeout(chordT); chordT = 0; var h = document.getElementById('ix-chord'); if (h) h.remove(); }
  function showKeys() {
    var go = goKeys(), row = function (k, t) { return '<div class="ix-krow"><span>' + esc(t) + '</span><span class="ix-kk">' + k + '</span></div>'; };
    var kbd = function (a) { return a.split(' ').map(function (x) { return x === 'then' ? ' then ' : '<kbd>' + esc(x) + '</kbd>'; }).join(''); };
    openDlg('<div class="ix-ico">' + svg(ICON.key) + '</div><h2>Keyboard Shortcuts</h2>' +
      '<div class="ix-keys"><h3>Anywhere</h3>' + row(kbd('/') + ' or ' + kbd('Ctrl K'), 'Search the site') + row(kbd('?'), 'Show this list') + row(kbd('Esc'), 'Close a window') +
      (S.admin ? row(kbd('E'), 'Edit this page (the pencil)') : '') +
      '<h3>Go to a Page</h3>' + go.map(function (g) { return row(kbd('G') + ' then ' + kbd(g[0].toUpperCase()), g[1]); }).join('') +
      (PAGEKEYS[APP] ? '<h3>On This Page</h3>' + PAGEKEYS[APP].filter(function (k) { return APP !== 'home' || S.admin; }).map(function (k) { return row(kbd(k[0]), k[1]); }).join('') : '') + '</div>' +
      '<div class="ix-acts"><button type="button" class="ix-btn pri" id="ix-kclose" autofocus>Close</button></div>');
    var c = document.getElementById('ix-kclose'); if (c) c.onclick = function () { closeDlg(); };
  }
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented || e.isComposing) return;
    var ae = document.activeElement || {};
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName || '') || ae.isContentEditable || document.querySelector('dialog[open]') || (dlg && dlg.classList.contains('open'))) { if (chordT) chordEnd(); return; }
    var k = e.key;
    if (chordT) {   // G was pressed a moment ago: this key says where
      var t = goKeys().filter(function (g) { return g[0] === String(k).toLowerCase(); })[0];
      chordEnd();
      if (t) { e.preventDefault(); e.stopPropagation(); location.href = t[2]; } else if (k === 'Escape') e.stopPropagation();
      return;
    }
    if (k === '?') { e.preventDefault(); e.stopPropagation(); showKeys(); return; }
    if (k === 'g' || k === 'G') {
      e.preventDefault(); e.stopPropagation(); chordEnd(); chordT = setTimeout(chordEnd, 1600);
      var el = document.createElement('div'); el.id = 'ix-chord'; el.setAttribute('role', 'status');
      el.innerHTML = 'Go to: ' + goKeys().map(function (g) { return '<kbd>' + esc(g[0].toUpperCase()) + '</kbd> ' + esc(g[1]); }).join(' · ');
      document.body.appendChild(el); return;
    }
    if ((k === 'e' || k === 'E') && APP !== 'home' && S.admin) { var tg = document.querySelector('[data-hub=toggle]'); if (tg) { e.preventDefault(); e.stopPropagation(); tg.click(); } }
  }, true);

  /* ---------- 7b. the site logo is the tab icon of every page ----------
     Pages set their own icons while loading; this puts the logo from Settings > General (or Homebase Hub's own) back, whenever one changes it. */
  function applyFavicon() {
    if (!document.head) return;
    var href = S.logo ? ROOT + S.logo : CORE + 'assets/brand/favicon-64.png';
    // a page without a tab icon of its own (an iPhone icon alone does not count) gets one, so the browser never shows a blank globe
    if (!document.head.querySelector('link[rel~="icon"]')) { var l = document.createElement('link'); l.rel = 'icon'; document.head.appendChild(l); }
    var links = document.head.querySelectorAll('link[rel~="icon"],link[rel="apple-touch-icon"]');
    [].forEach.call(links, function (l) {
      if (l.getAttribute('href') === href) return;
      l.setAttribute('href', href); l.removeAttribute('type'); l.removeAttribute('sizes');
    });
  }
  function watchFavicon() {
    applyFavicon();
    new MutationObserver(applyFavicon).observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
  }

  /* ---------- 8. dialogs ---------- */
  var dlg;
  function openDlg(html, wide) {
    if (window.__ixShell) window.__ixShell.beforeClose = null;   // a new dialog starts without the previous one's close guard
    if (!dlg) {
      dlg = document.createElement('div'); dlg.id = 'ix-dlg'; dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true');
      document.body.appendChild(dlg);
      dlg.addEventListener('mousedown', function (e) { if (e.target === dlg) closeDlg(); });
    }
    if (dlg._shut) { clearTimeout(dlg._shut); dlg._shut = 0; }   // a dialog closing right now is replaced, never wiped later
    dlg.classList.remove('closing');
    dlg.innerHTML = '<div class="ix-box' + (wide ? ' wide' : '') + '">' + html + '</div>';
    dlg.classList.add('open');
    var f = dlg.querySelector('[autofocus]') || dlg.querySelector('input,button'); if (f) setTimeout(function () { f.focus(); }, 30);
    return dlg;
  }
  function closeDlg(force) {
    var K = window.__ixShell;   // Settings can hold the close while it has unsaved changes (shell-admin.js)
    if (!force && K && K.beforeClose && K.beforeClose() === false) return;
    if (K) K.beforeClose = null;
    if (dlg && dlg.classList.contains('open') && !dlg._shut) {   // fades out, then empties
      dlg.classList.add('closing');
      dlg._shut = setTimeout(function () { dlg._shut = 0; dlg.classList.remove('open', 'closing'); dlg.innerHTML = ''; }, matchMedia('(prefers-reduced-motion:reduce)').matches ? 0 : 150);
    }
    if (loginWait) { loginWait.reject(); loginWait = null; }
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && dlg && dlg.classList.contains('open')) { e.stopPropagation(); closeDlg(); } }, true);
  var $ = function (s) { return dlg.querySelector(s); };

  /* ---------- 9. login ---------- */
  var loginWait = null;
  function login(reason) {
    if (S.admin) return Promise.resolve();
    if (S.admin === undefined) return refresh().then(function () { return S.admin ? undefined : S.admin === undefined ? loginBox(reason) : login(reason); });   // not known yet: ask the server first
    return loginBox(reason);
  }
  function loginBox(reason) {
    return new Promise(function (res, rej) {
      if (loginWait) loginWait.reject();
      loginWait = { resolve: res, reject: rej };
      if (S.setup) return setupForm();
      /* 1.53.8: the site's logo and name, a password that can be shown, one wide Log In button. Trust This Browser starts off. */
      openDlg('<div class="ix-lhead"><img class="ix-llogo" alt="" src="' + esc(S.logo ? ROOT + S.logo : CORE + 'assets/brand/logo-192.png') + '">' +
        '<h2>Log In to ' + esc(S.siteName || 'Homebase Hub') + '</h2><p>' + esc(reason || 'Your website password opens editing and your private pages.') + '</p></div>' +
        '<form id="ix-lf"><label for="ix-pw">Password</label><div class="ix-pwrap"><input type="password" id="ix-pw" autocomplete="current-password" autofocus>' +
          '<button type="button" class="ix-eye" id="ix-eye" aria-label="Show Password" aria-pressed="false" title="Show Password">' + svg(ICON.eye) + '</button></div>' +
        '<div id="ix-2s" hidden><label for="ix-code">Code from Your Authenticator App</label><input type="text" id="ix-code" inputmode="numeric" autocomplete="one-time-code" placeholder="123456 or a recovery code">' +
          '<label class="ix-chk"><input type="checkbox" id="ix-ltrust"> Trust this browser for 30 days (no code here next time)</label></div>' +
        '<p class="ix-err" id="ix-le" role="alert"></p><button class="ix-btn pri ix-wide" id="ix-lg">Log In</button>' +
        (S.passkeys && window.PublicKeyCredential && window.isSecureContext ? '<button type="button" class="ix-btn ix-wide" id="ix-pk">' + svg(ICON.key) + ' Log In with a Passkey</button>' : '') +
        '<button type="button" class="ix-btn ix-quiet" data-ix="close">Cancel</button></form>');
      dlg.querySelector('.ix-box').classList.add('ix-login');
      $('#ix-eye').onclick = function () {
        var on = $('#ix-pw').type === 'password';
        $('#ix-pw').type = on ? 'text' : 'password'; this.innerHTML = svg(on ? ICON.eyeoff : ICON.eye);
        this.setAttribute('aria-pressed', String(on)); this.setAttribute('aria-label', on ? 'Hide Password' : 'Show Password'); this.title = this.getAttribute('aria-label');
        $('#ix-pw').focus();
      };
      if ($('#ix-pk')) $('#ix-pk').onclick = function () {
        var pb = this; pb.disabled = true; $('#ix-le').textContent = '';
        passkeyLogin().then(function (j) {
          pb.disabled = false;
          if (j && j.ok) return loggedIn();
          $('#ix-le').textContent = (j && j.error) || 'The passkey was not accepted.';
        }).catch(function (x) { pb.disabled = false; $('#ix-le').textContent = x && x.name === 'NotAllowedError' ? 'The passkey was not used: it was cancelled or timed out.' : (x && x.message) || 'The passkey could not be used.'; });
      };
      $('#ix-lf').onsubmit = function (e) {
        e.preventDefault();
        var b = $('#ix-lg'); b.disabled = true; $('#ix-le').textContent = '';
        var pw = $('#ix-pw').value, twoStep = !$('#ix-2s').hidden;
        api('login', { password: pw, code: $('#ix-code').value, trust: twoStep && $('#ix-ltrust').checked }).then(function (j) {
          b.disabled = false;
          if (j.ok) return loggedIn(pw);
          if (j.approval) return approvalWait(j.approval, pw, twoStep && $('#ix-ltrust').checked, j.recovery);
          if (j.setup) { S.setup = true; return setupForm(); }
          if (j.need2fa) { $('#ix-2s').hidden = false; $('#ix-code').focus(); }
          $('#ix-le').textContent = j.error || 'Could not log in.';
        }).catch(function () { b.disabled = false; $('#ix-le').textContent = "Can't reach the server."; });
      };
    });
  }
  /* Passkeys (1.61): the browser asks for a fingerprint, face, PIN or security key; the server checks the signature (lib/passkey.php). */
  function bufB64u(buf) { var u = new Uint8Array(buf), t = ''; for (var i = 0; i < u.length; i++) t += String.fromCharCode(u[i]); return btoa(t).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function b64uBuf(x) { x = x.replace(/-/g, '+').replace(/_/g, '/'); while (x.length % 4) x += '='; var t = atob(x), u = new Uint8Array(t.length); for (var i = 0; i < t.length; i++) u[i] = t.charCodeAt(i); return u.buffer; }
  function passkeyLogin() {
    return api('pk_login_begin', {}).then(function (j) {
      if (!j.ok) throw new Error(j.error || 'No passkey is set up on this site.');
      var o = j.publicKey;
      return navigator.credentials.get({ publicKey: { challenge: b64uBuf(o.challenge), rpId: o.rpId, timeout: o.timeout, userVerification: o.userVerification,
        allowCredentials: o.allowCredentials.map(function (c) { return { type: 'public-key', id: b64uBuf(c.id) }; }) } });
    }).then(function (c) {
      if (!c) throw new Error('No passkey was chosen.');
      return api('pk_login_finish', { id: c.id, response: { clientDataJSON: bufB64u(c.response.clientDataJSON), authenticatorData: bufB64u(c.response.authenticatorData), signature: bufB64u(c.response.signature) } });
    });
  }
  /* "www.example.com" -> "Example", "shop.example.co.uk" -> "Example", an IP address -> "Homebase Hub" */
  function guessName(host) {
    if (!host || /^[\d.:]+$/.test(host) || host.indexOf('.') < 0) return host ? host.charAt(0).toUpperCase() + host.slice(1) : 'Homebase Hub';
    var l = host.split('.'), n = l.length >= 3 && l[l.length - 2].length <= 3 ? l[l.length - 3] : l[l.length - 2];
    return n.charAt(0).toUpperCase() + n.slice(1);
  }
  function setupForm() {
    var nm = S.siteName && S.siteName !== 'My Site' ? S.siteName : guessName(S.host || '');
    openDlg('<div class="ix-ico">' + svg(ICON.key) + '</div><h2>Welcome!</h2>' +
      '<p>Let\'s set up your site. Open this file in your hosting file manager, copy the code inside, and paste it below. This proves the site is yours:</p>' +
      '<p><code>' + esc(S.setupFile || 'site-data/core/SETUP-CODE.php') + '</code></p>' +
      '<form id="ix-sf"><label for="ix-sc">Setup Code</label><input type="text" id="ix-sc" autocomplete="off" autocapitalize="characters" placeholder="ABCD-1234" autofocus>' +
      '<label for="ix-sn">Site Name</label><input type="text" id="ix-sn" maxlength="30" value="' + esc(nm) + '">' +
      '<label for="ix-p1">New Password (at least 8 characters)</label><input type="password" id="ix-p1" autocomplete="new-password">' +
      '<label for="ix-p2">Type It Again</label><input type="password" id="ix-p2" autocomplete="new-password">' +
      '<p class="ix-err" id="ix-se"></p><div class="ix-acts"><button type="button" class="ix-btn" data-ix="close">Later</button><button class="ix-btn pri">Create My Site</button></div></form>' +
      '<p class="ix-note">One password unlocks editing on every page. You can open this box any time from the key icon.</p>');
    $('#ix-sf').onsubmit = function (e) {
      e.preventDefault();
      if ($('#ix-p1').value !== $('#ix-p2').value) { $('#ix-se').textContent = "The two passwords don't match."; return; }
      var tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (x) {}
      // a new site starts with this browser's time zone and the theme that follows the device
      api('setup', { code: $('#ix-sc').value, password: $('#ix-p1').value, siteName: $('#ix-sn').value, tz: tz, theme: 'auto' }).then(function (j) {
        if (j.ok) { S.setup = false; return loggedIn().then(function () { location.reload(); }); }
        $('#ix-se').textContent = j.error || 'Could not save.';
      });
    };
  }
  /* The password was right; the login waits for Approve in Telegram (or a two-step recovery code, when two-step is on).
     Settings > Security turns this on. */
  function approvalWait(id, pw, trust, rc) {
    var left = 300, timer = null, stopped = false;
    openDlg('<div class="ix-ico">' + svg(ICON.lock) + '</div><h2>Approve in Telegram</h2>' +
      '<p>Your bot sent a message. Tap <b>Approve</b> there and this page logs in by itself.</p>' +
      '<div class="ix-apw"><span class="ix-spin" aria-hidden="true"></span><span id="ix-apt" aria-live="polite">Waiting… 5:00</span></div>' +
      '<label class="ix-chk"><input type="checkbox" id="ix-trust"' + (trust === true ? ' checked' : '') + '> Trust this browser for 30 days (no code or tap here next time)</label>' +
      (rc ? '<details class="ix-apc"><summary>No phone? Use a recovery code instead</summary>' +
        '<form id="ix-apf"><label for="ix-apcode">One of your two-step recovery codes</label>' +
        '<input type="text" id="ix-apcode" autocomplete="one-time-code" spellcheck="false" placeholder="ABCDE-FGHJK"><button class="ix-btn" id="ix-apgo">Use Code</button></form></details>' : '') +
      '<p class="ix-err" id="ix-ape"></p><div class="ix-acts"><button type="button" class="ix-btn" data-ix="close">Cancel</button></div>');
    var apf = $('#ix-apf');
    var stop = function () { stopped = true; clearTimeout(timer); };
    var done = function (j) {
      if (j.ok) { stop(); return loggedIn(pw); }
      if (j.wait) return;
      stop(); $('#ix-ape').textContent = j.error || 'The login did not go through.';
      $('#ix-apt').textContent = j.denied ? 'Denied in Telegram.' : 'Ended.';
    };
    var tick = function () {
      if (stopped || !$('#ix-apt')) return stop();
      api('login_wait', { id: id, trust: $('#ix-trust').checked }).then(function (j) {
        if (stopped) return;
        if (j.left != null) left = j.left;
        $('#ix-apt').textContent = 'Waiting… ' + Math.floor(left / 60) + ':' + ('0' + left % 60).slice(-2);
        done(j); if (!stopped) timer = setTimeout(tick, 2500);
      }, function () { if (!stopped) timer = setTimeout(tick, 4000); });
    };
    timer = setTimeout(tick, 1500);
    if (apf) apf.onsubmit = function (e) {
      e.preventDefault();
      api('login_code', { id: id, code: $('#ix-apcode').value, trust: $('#ix-trust').checked }).then(function (j) { if (j.ok) done(j); else $('#ix-ape').textContent = j.error || 'That code did not work.'; });
    };
    var K = window.__ixShell; if (K) K.beforeClose = function () { stop(); return true; };
  }
  /* pw: the password just typed. The login promise hands it to the page that asked (Info uses it to open its encrypted
     tabs right away, as they use the same password); it is never stored. */
  function loggedIn(pw) {
    var w = loginWait; loginWait = null;
    return refresh().then(function () {
      closeDlg();
      if (w) w.resolve(pw);
      document.dispatchEvent(new CustomEvent('hub:login'));
    });
  }
  function logout() {
    api('logout', {}).finally(function () {
      // private copies some pages keep in this browser
      ls.set('family4', null); ls.set('cards3', null); ls.set('notes4', null);
      try { sessionStorage.clear(); } catch (e) {}
      window.HubVault.devDropAll();   // the "keep unlocked on this device" keys of Links and Info
      location.reload();
    });
  }

  /* The pages' own Edit buttons (and "Log in" buttons inside pages): logged out, they open the one login first. */
  document.addEventListener('click', function (e) {
    if (S.admin || !e.target.closest) return;
    var btn = e.target.closest('[data-hub="toggle"]');
    if (!btn) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (S.admin === undefined) { refresh().then(function () { if (S.admin) btn.click(); else login().then(function () { afterLogin(); }, function () {}); }); return; }   // state not loaded yet
    login().then(function () { afterLogin(); }, function () {});
  }, true);
  /* The pages' own Log out buttons end the one login everywhere. */
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('[data-hub="logout"]')) return;
    e.preventDefault(); e.stopImmediatePropagation(); logout();
  }, true);
  function afterLoad() {
    var a = null, then = null;
    try { a = sessionStorage.getItem('hub-after'); then = sessionStorage.getItem('hub-then'); sessionStorage.removeItem('hub-after'); sessionStorage.removeItem('hub-then'); } catch (e) {}
    if (a === 'edit') waitFor(function () { var b = q1('toggle'); return (b ? !b.disabled : ownEdit()) && document.readyState === 'complete'; },
      function () { setTimeout(function () { var t = q1('toggle'); if (!editing()) { if (t) t.click(); else document.body.classList.add('editing'); } if (then) setTimeout(function () { runItem(then); }, 450); }, 250); });
    if (/[#&]hub=settings/.test(location.hash) && S.admin) { history.replaceState(null, '', location.pathname + location.search); settings(); }
  }
  function waitFor(test, go) { var n = 0, t = setInterval(function () { if (test()) { clearInterval(t); go(); } else if (++n > 60) clearInterval(t); }, 100); }

  /* Links from other pages: …/info/#hub-info=<tab>&q=<text> opens that tab with the text highlighted; …#hub-edit starts editing. */
  function openFromHash() {
    var h = location.hash;
    var mi = /hub-info=([^&]+)&q=([^&]*)/.exec(h);
    if (mi && APP === 'info') {
      var id = decodeURIComponent(mi[1]), q = decodeURIComponent(mi[2]);
      history.replaceState(null, '', location.pathname + location.search);
      waitFor(function () { try { return typeof showTab === 'function' && typeof TABS !== 'undefined' && TABS.length > 0; } catch (e) { return false; } }, function () {
        try {
          if (TABS.some(function (t) { return t.id === id; })) {
            if (q && typeof setHighlight === 'function') setHighlight(q);
            showTab(id);
            setTimeout(function () { var m = document.querySelector('.box mark'); if (m) m.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }); }, 120);
          }
        } catch (e) {}
      });
      return;
    }
    if (/hub-edit/.test(h)) {
      history.replaceState(null, '', location.pathname + location.search);
      waitFor(function () { return S.admin !== undefined && document.readyState === 'complete'; }, function () { startEdit(); });
    }
  }

  /* ---------- 10. Settings, Backup and Text sizes: loaded on first use from shell-admin.js ---------- */
  function when(t) { try { return new Date(t * 1000).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: S.tz || 'Asia/Kolkata' }); } catch (e) { return new Date(t * 1000).toLocaleString(); } }
  var adminP = null;
  function adminJs() {
    if (window.__ixShell.impl) return Promise.resolve(window.__ixShell.impl);
    return adminP || (adminP = new Promise(function (ok, fail) {
      var ver = ((me && /\?v=[^&#]+/.exec(me.src)) || [''])[0], waiting = 1, bad = false;
      var done = function () { if (bad) return; if (--waiting === 0) window.__ixShell.impl ? ok(window.__ixShell.impl) : fail(); };
      var oops = function () { if (bad) return; bad = true; adminP = null; toast("Couldn't load Settings. Check your connection."); fail(); };
      // the Settings styles are a file of their own (the Settings page links it itself); other pages get it only now
      if (!document.querySelector('link[data-ix-settings-css]')) {
        var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = ASSETS + 'shell-settings.css' + ver; l.setAttribute('data-ix-settings-css', '');
        waiting++; l.onload = done; l.onerror = oops; document.head.appendChild(l);
      }
      var s = document.createElement('script');
      s.src = ASSETS + 'shell-admin.js' + ver;
      s.onload = done; s.onerror = oops;
      document.head.appendChild(s);
    }));
  }
/* Settings is a page of its own (web/settings/). From any other page these just go there; on that page they switch section. */
  function settings(sec) {
    if (S.admin === undefined) return whenKnown(function () { if (S.admin !== undefined) settings(sec); else login().then(function () { settings(sec); }, function () {}); });
    if (!S.admin) return login().then(function () { settings(sec); }, function () {});
    if (APP === 'settings') return adminJs().then(function (m) { m.settings(sec); }, function () {});
    location.href = ROOT + 'web/settings/' + (sec ? '#' + sec : '');
  }
  function openBackup() { settings('backup'); }
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-hub-action="sizes"]')) adminJs().then(function (m) { m.textSizes(); }, function () {}); });
  /* Settings previews a draft: the bar and colors are drawn from it for a moment, then the saved state is put back. */
  function previewWith(st) { var keep = S; S = st; applyAttrs(); applyColors(); applyFont(); lastBar = ''; drawBar(); S = keep; }
  /* ---------- 12. clicks on the bar and dialogs ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-ix]'); if (!b) return;
    var k = b.dataset.ix, inPanel = !!b.closest('#ix-drawer,#ix-sheet');
    if (k === 'close') { closeDlg(); closePanels(); return; }
    if (k === 'spotx') { if (spot) spot.classList.remove('open'); return; }
    if (k === 'menu') return drawer(true, b);
    if (k === 'sheet') return sheet(true, b);
    if (k === 'theme') { if (inPanel) closePanels(); return setTheme(themeNow() === 'light' ? 'dark' : 'light'); }
    if (k === 'login') return login().then(function () { location.reload(); }, function () {});
    if (k === 'logout') return logout();
    if (k === 'search') { closePanels(); return openSpot(); }
    if (k === 'filters') return toggleFilters(b);
    if (k === 'backup') { closePanels(); backupSeen(); return openBackup(); }
    if (k === 'corner') return cornerMenu(b);
    if (k === 'edit') return whenKnown(function () { if (!S.admin && canEdit()) { closePanels(); return startEdit(); } editMenu(b); });
    if (k === 'account') { closePanels(); return settings(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !popEl) closePanels(); });


  /* what shell-admin.js may use (it holds this same S object, so it always sees the current state) */
  window.__ixShell = { S: S, esc: esc, toast: toast, api: api, ICON: ICON, dollar: $, svg: svg, drawBar: drawBar, redraw: function () { lastBar = ''; drawBar(); },
    remember: remember, applySizes: applySizes, APP: APP, openDlg: openDlg, closeDlg: closeDlg, login: login, ROOT: ROOT, applyFont: applyFont,
    applyColors: applyColors, applyAttrs: applyAttrs, PG_APPS: PG_APPS, CORE: CORE, ASSETS: ASSETS, COLOR_DEFAULT: COLOR_DEFAULT, setTheme: setTheme, pageList: pageList,
    applyFavicon: applyFavicon, SIZE_SPEC: SIZE_SPEC, PAGE_DEF: PAGE_DEF, FONTS: FONTS, COLOR_KEYS: COLOR_KEYS, when: when, previewWith: previewWith,
    previewTheme: previewTheme, restoreTheme: restoreTheme, storeTheme: storeTheme, resolveTheme: resolveTheme };

  /* ---------- 13. start ---------- */
  /* One request at a time: a second caller gets the answer already on its way. */
  var refreshing = null;
  function refresh() {
    if (refreshing) return refreshing;
    refreshing = refreshNow().then(function () { refreshing = null; });
    return refreshing;
  }
  /* Runs fn once the server has said whether you are logged in. Right after a page opens (above all one the browser prepared
     in the background) that answer may still be on its way; deciding before it came showed the login box to someone already
     logged in (1.53.6). */
  function whenKnown(fn) { if (S.admin !== undefined) fn(); else refresh().then(fn); }
  function refreshNow() {
    return api('state').then(function (st) {
      if (!st || !('admin' in st)) return;
      var changed = st.nav !== S.nav || st.look !== S.look || st.accent !== S.accent || st.homeBar !== S.homeBar || st.font !== S.font || st.fontCustom !== S.fontCustom || JSON.stringify(st.colors) !== JSON.stringify(S.colors);
      // the site theme was changed in Settings (on any device) since this browser last looked: follow it
      var seen = ls.get('hub-theme-site');
      if (st.theme && seen !== st.theme) { if (seen) applyTheme(resolveTheme(st.theme)); ls.set('hub-theme-site', st.theme); }
      Object.keys(S).forEach(function (k) { delete S[k]; }); Object.assign(S, st); remember(st);
      if (changed) applyAttrs();
      applyColors(); applyFont(); applySizes();
      drawBar(); applyFavicon(); ebarKey = ''; drawEditBar(); editBarPick();
    }).catch(function () {});
  }
  /* (1.61) Share from your phone: one small service worker (web/hub/share-sw.js) takes what the phone's Share button sends to this
     site (when it is added to the home screen). It is set up for you only, once you are logged in, and only on a secure address. */
  function shareWorker() {
    if (!S.admin || !('serviceWorker' in navigator) || !window.isSecureContext) return;
    navigator.serviceWorker.register(ROOT + 'web/hub/share-sw.js', { scope: ROOT + 'web/hub/' }).catch(function () {});
  }
  function start() {
    drawBar(); watchFavicon(); watchEditBarPick();
    var go = function () { refresh().then(function () { afterLoad(); openFromHash(); backupReminder(); shareWorker(); }); };
    if (document.prerendering) document.addEventListener('prerenderingchange', go, { once: true }); else go();   // a page prepared in the background waits until you open it
    window.addEventListener('hashchange', openFromHash);
    // the Edit icon lights up while the page is in edit mode
    new MutationObserver(markEditing).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    if (document.prerendering) document.addEventListener('prerenderingchange', function () { drawBar(); }, { once: true });
    else if (window.requestIdleCallback) requestIdleCallback(prefetchPages, { timeout: 1500 }); else setTimeout(prefetchPages, 600);
  }
  /* Next page ready before you click: the other pages are prepared in the background (prerendered), so a click is an instant swap.
     The start page is only prefetched, because it counts background views. Chrome and Edge do this; other browsers just load normally. */
  function prefetchPages() {
    var cn = navigator.connection, thin = !!(cn && (cn.saveData || /(^|-)2g$/.test(cn.effectiveType || '')));   // not on data saver or a slow connection
    if ((S.admin || S.adm) && !thin && !document.querySelector('link[data-ix-admin]')) {
      var ver = ((me && /\?v=[^&#]+/.exec(me.src)) || [''])[0];
      [['script', 'shell-admin.js'], ['style', 'shell-settings.css']].forEach(function (f) {
        var pl = document.createElement('link'); pl.rel = 'prefetch'; pl.as = f[0]; pl.setAttribute('data-ix-admin', ''); pl.href = ASSETS + f[1] + ver; document.head.appendChild(pl);
      });
    }
    // Pre-loading the other pages is done by the browser from web/hub/core/assets/speculation-rules.json, which every page names in a
    // Speculation-Rules response header (an inline rule set would be refused by the pages' security policy).
  }
  /* ---------- 15. swipe gestures on a phone (1.59) ----------
     - swipe left or right: the next or previous page, in the order of the bar (Home, Links, Info, Cards, Tasks; Tools and
       Settings are left out: their own screens use sideways moves). 1.59.1: a swipe no longer changes Links' or Info's tabs;
     - Home: pull down from the top for the next background.
     Never while editing, in a window or menu, in a text field, on something that scrolls sideways, or with two fingers. */
  var SWIPE_APPS = ['home', 'links', 'info', 'cards', 'tasks', 'files'];
  function swipePages() { return pages().filter(function (p) { return SWIPE_APPS.indexOf(p[0]) >= 0 && (!p[4] || p[0] === APP); }); }
  function swipePage(dir) {
    var list = swipePages(), at = list.findIndex(function (p) { return p[0] === APP; }), to = list[at + dir];
    if (at < 0 || !to) return false;
    location.href = to[2]; return true;
  }
  function swipeBlocked(t) {
    if (editing() || document.querySelector('dialog[open], #ix-dlg.open, #ix-pop, #ix-drawer.open, #ix-sheet.open, .wpanel:not([hidden])')) return true;
    if (!t || !t.closest || t.closest('input, textarea, select, [contenteditable], #ix-bar, #ix-ebar, [data-no-swipe], .grip, .lgrip')) return true;
    for (var e = t; e && e !== document.body; e = e.parentElement) {   // something here scrolls sideways itself (a wide table, a strip of chips)
      var cs = getComputedStyle(e);
      if (e.scrollWidth > e.clientWidth + 4 && /(auto|scroll)/.test(cs.overflowX)) return true;
    }
    return false;
  }
  function swipes() {
    if (!matchMedia('(pointer: coarse)').matches || SWIPE_APPS.indexOf(APP) < 0) return;
    var x0 = 0, y0 = 0, t0 = 0, top0 = false, off = true;
    if (APP === 'home') H.style.overscrollBehaviorY = 'none';   // Home's pull-down is ours (the browser's own pull-to-reload would reload instead)
    document.addEventListener('touchstart', function (e) {
      off = e.touches.length !== 1 || swipeBlocked(e.target);
      if (off) return;
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); top0 = (window.scrollY || 0) <= 0;
    }, { passive: true });
    document.addEventListener('touchmove', function (e) { if (e.touches.length !== 1) off = true; }, { passive: true });
    document.addEventListener('touchend', function (e) {
      if (off || !e.changedTouches.length) return;
      off = true;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0, dt = Date.now() - t0;
      if (dt > 700 || (window.getSelection && String(window.getSelection()).length)) return;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) {
        var dir = dx < 0 ? 1 : -1;   // a finger moving left brings the next one
        swipePage(dir);
      } else if (APP === 'home' && top0 && dy > 90 && dy > Math.abs(dx) * 2) {
        var nb = document.getElementById('nextBg'); if (nb && nb.offsetParent !== null) nb.click();
      }
    }, { passive: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', swipes); else swipes();
  window.__hubSwipe = { page: swipePage, pages: function () { return swipePages().map(function (p) { return p[0]; }); }, blocked: swipeBlocked };   // for the tests

  whenBody(function () { drawBar(); });                 // the bar is there on the very first paint
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  /* (1.61) Export Bookmarks: the standard bookmark file every browser imports (Chrome, Edge, Firefox, Safari). Made here in the
     browser from tabs [{title, categories: [{title, links: [{title, url}]}]}], so nothing extra leaves the server. Only web addresses
     (http, https, ftp) and mail links are written. Each tab becomes a folder, each category a folder inside it. */
  function bookmarksHtml(tabs, title) {
    var e = function (v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
    var ok = function (u) { return /^(https?|ftp):\/\/|^mailto:/i.test(String(u || '').trim()); };
    var now = Math.floor(Date.now() / 1000), o = ['<!DOCTYPE NETSCAPE-Bookmark-file-1>', '<!-- This is an automatically generated file. It will be read and overwritten. DO NOT EDIT! -->',
      '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">', '<TITLE>' + e(title || 'Bookmarks') + '</TITLE>', '<H1>' + e(title || 'Bookmarks') + '</H1>', '<DL><p>'];
    (tabs || []).forEach(function (t) {
      o.push('    <DT><H3 ADD_DATE="' + now + '">' + e(t.title || t.name || 'Tab') + '</H3>', '    <DL><p>');
      (t.categories || []).forEach(function (c) {
        o.push('        <DT><H3 ADD_DATE="' + now + '">' + e(c.title || c.name || 'Links') + '</H3>', '        <DL><p>');
        (c.links || []).forEach(function (l) { if (l && !l.divider && ok(l.url)) o.push('            <DT><A HREF="' + e(String(l.url).trim()) + '" ADD_DATE="' + now + '">' + e(l.title || l.url) + '</A>'); });
        o.push('        </DL><p>');
      });
      o.push('    </DL><p>');
    });
    o.push('</DL><p>');
    return o.join('\n') + '\n';
  }

  window.HUB = {
    app: APP, state: function () { return S; }, login: login, logout: logout, settings: settings, toast: toast, theme: themeNow, setTheme: setTheme,
    isAdmin: function () { return !!S.admin; }, ready: function () { return refresh(); }, fetch: hubFetch,
    bufB64u: bufB64u, b64uBuf: b64uBuf, bookmarksHtml: bookmarksHtml,   // (1.61) for the passkey screens of Settings
    api: api,   // (1.60) the core API with the security token, for pages without their own (Tools' presets)
    mountSettings: function (host, hash) { return adminJs().then(function (m) { m.mount(host, hash); }); },   // the Settings page hands its element to the admin part
    tz: function () { return S.tz || 'Asia/Kolkata'; }   // the site's time zone (Settings > General)
  };
})();

/* ---------- 14. HubVault: the encryption of encrypted tabs, shared by Links, Info and Settings (1.53.2) ----------
   One copy of what those three pages each carried before. Nothing here talks to the server.
   - A tab key is 32 random bytes. The server keeps it only "wrapped": AES-256-GCM with a key made from your password or
     passphrase (PBKDF2-SHA256, 600,000 rounds, 16-byte salt). Stored as {v: 1, salt, iter, wrap: base64(iv + ciphertext)},
     with "login": true when the website password wraps it, and "rec": the same key wrapped with the recovery code.
   - Text of an encrypted tab is "enc1:" + base64(12-byte iv + AES-256-GCM ciphertext).
   - "Keep unlocked on this device": the tab key is kept in this browser's IndexedDB ("hub-vault", store "k"), encrypted with a
     device key that cannot be read out of the browser. Each page keeps its own record (Links "links", Info "dev").
   The format must never change without a way to open the old one: tests/fixtures/vault-vectors.json was made by the code
   before this file, and pages_test P49 opens it with this one. */
(function () {
  'use strict';
  var ENC = 'enc1:', ITER = 600000;
  var te = new TextEncoder(), td = new TextDecoder();
  var ok = function () { return !!(window.isSecureContext && window.crypto && crypto.subtle); };
  var b64 = function (u) { var s = ''; for (var i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); };
  var ub64 = function (s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  var rnd = function (n) { return crypto.getRandomValues(new Uint8Array(n)); };
  var isEnc = function (s) { return typeof s === 'string' && s.indexOf(ENC) === 0; };
  /* the key made from a password or passphrase */
  function kek(pass, salt, iter) {
    return crypto.subtle.importKey('raw', te.encode(pass), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    });
  }
  /* wraps a raw tab key with a password; login: true when it is the website password */
  function wrap(raw, pass, login) {
    var salt = rnd(16), iv = rnd(12);
    return kek(pass, salt, ITER).then(function (k) { return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, raw); }).then(function (ct) {
      ct = new Uint8Array(ct); var w = new Uint8Array(12 + ct.length); w.set(iv); w.set(ct, 12);
      var v = { v: 1, salt: b64(salt), iter: ITER, wrap: b64(w) }; if (login) v.login = true; return v;
    });
  }
  /* the raw key from one wrap, or null when the password does not fit (or the wrap is damaged) */
  function unwrapOne(x, pass) {
    return Promise.resolve().then(function () {
      var w = ub64(x.wrap);
      return kek(pass, ub64(x.salt), x.iter).then(function (k) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: w.subarray(0, 12) }, k, w.subarray(12)); });
    }).then(function (r) { return new Uint8Array(r); }, function () { return null; });
  }
  var normRec = function (s) { return String(s).replace(/[\s-]/g, '').toUpperCase(); };   // a recovery code may be typed with dashes, spaces or small letters
  /* the raw key from the password, else from the recovery code; null when neither fits */
  function unwrap(v, pass) {
    return unwrapOne(v, pass).then(function (raw) { return raw || (v && v.rec ? unwrapOne(v.rec, normRec(pass)) : null); });
  }
  /* the tab key, usable but never readable again; decryptOnly for pages that only open text */
  function useKey(raw, decryptOnly) { return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, decryptOnly ? ['decrypt'] : ['encrypt', 'decrypt']); }
  function seal(key, text) {
    var iv = rnd(12);
    return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, te.encode(text)).then(function (ct) {
      ct = new Uint8Array(ct); var w = new Uint8Array(12 + ct.length); w.set(iv); w.set(ct, 12);
      return ENC + b64(w);
    });
  }
  /* one layer: the text inside "enc1:...". Rejects when the key does not fit. */
  function unseal(key, s) {
    return Promise.resolve().then(function () {
      var w = ub64(s.slice(ENC.length));
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: w.subarray(0, 12) }, key, w.subarray(12));
    }).then(function (r) { return td.decode(r); });
  }
  /* text that may have been encrypted more than once (it happened when a tab lost its encrypted mark): up to 5 layers */
  function openDeep(key, s) {
    var n = 0;
    var step = function (x) {
      if (!isEnc(x)) return Promise.resolve(x);
      if (++n > 5) return Promise.reject(new Error('too many layers'));
      return unseal(key, x).then(step);
    };
    return step(s);
  }
  /* "keep unlocked on this device" */
  function devDb() {
    return new Promise(function (res, rej) { var q = indexedDB.open('hub-vault', 1);
      q.onupgradeneeded = function () { q.result.createObjectStore('k'); }; q.onsuccess = function () { res(q.result); }; q.onerror = function () { rej(q.error); }; q.onblocked = function () { rej(0); }; });
  }
  function devOp(mode, fn) {
    return devDb().then(function (db) {
      return new Promise(function (res, rej) { var t = db.transaction('k', mode), q = fn(t.objectStore('k'));
        t.oncomplete = function () { res(q && q.result); }; t.onerror = t.onabort = function () { rej(t.error); }; })
        .then(function (r) { db.close(); return r; }, function (e) { db.close(); throw e; });   // closed at once, so a log out elsewhere can delete it
    });
  }
  function devSave(name, raw) {
    return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']).then(function (dk) {
      var iv = rnd(12);
      return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, dk, raw).then(function (ct) { return devOp('readwrite', function (st) { return st.put({ dk: dk, iv: iv, ct: new Uint8Array(ct) }, name); }); });
    }).then(function () {}, function () {});
  }
  function devLoad(name) {
    return devOp('readonly', function (st) { return st.get(name); }).then(function (r) {
      if (!r || !r.dk) return null;
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: r.iv }, r.dk, r.ct).then(function (x) { return new Uint8Array(x); });
    }).catch(function () { return null; });
  }
  function devForget(name) { return devOp('readwrite', function (st) { return st.delete(name); }).catch(function () {}); }
  function devDropAll() { try { indexedDB.deleteDatabase('hub-vault'); } catch (e) {} }
  window.HubVault = { ENC: ENC, ok: ok, b64: b64, ub64: ub64, rnd: rnd, isEnc: isEnc, kek: kek, wrap: wrap, unwrapOne: unwrapOne, unwrap: unwrap, normRec: normRec,
    useKey: useKey, seal: seal, unseal: unseal, openDeep: openDeep, devSave: devSave, devLoad: devLoad, devForget: devForget, devDropAll: devDropAll };
})();

/* ---------- 16. HubSite: the site key (1.61) ----------
   One random 32-byte key, made in this browser, that locks what the pages keep for you: Files, Cards and Tools' saved presets.
   Same scheme as the tab keys of Info and Links (section 14): the server only holds it wrapped with the encryption passphrase (and a
   second time with the recovery key), in site-data/core/site-vault.php. It never sees the key or the passphrase for this.
   - HubSite.key() gives the key (a CryptoKey that cannot be read out), asking for the passphrase once per page visit; "Keep unlocked
     on this device" keeps it in this browser's IndexedDB like the tabs do (record "site").
   - HubSite.seal(text) / open(text): "enc1:" + base64(12-byte iv + AES-256-GCM), the same text as an encrypted tab.
   - Errors carry .code: login, nopass (no passphrase yet), insecure (not https), cancel, wrongkey, server. */
(function () {
  'use strict';
  var V = window.HubVault, NAME = 'site';
  var cached = null, cachedKid = '', fromDevice = false, stat = null, asking = null;
  var K = function () { return window.__ixShell; };
  var kidOf = function (raw) { return crypto.subtle.digest('SHA-256', raw).then(function (h) { return Array.prototype.map.call(new Uint8Array(h).subarray(0, 8), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }); };
  var fail = function (code, msg) { var e = new Error(msg || code); e.code = code; return e; };
  var core = function (a, b) { return window.HUB.api(a, b); };
  var get = function (u) { return window.HUB.fetch(K().ROOT + 'web/' + u, { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }, function () { return null; }); };

  /* {vault, pp, use}: what the server holds (the wrapped key, whether a passphrase is set, what is locked with the key) */
  function status(force) {
    if (stat && !force) return stat;
    var p = stat = core('sv_get').then(function (j) {
      if (j._status === 401) throw fail('login', 'Log in first.');
      if (!j.ok) throw fail('server', j.error || 'Could not read the key.');
      return j;
    });
    p.catch(function () { if (stat === p) stat = null; });
    return p;
  }
  function useRaw(raw, keep) {
    return Promise.all([V.useKey(raw), kidOf(raw)]).then(function (r) {
      var done = keep ? V.devSave(NAME, raw) : Promise.resolve();
      return done.then(function () { raw.fill(0); cached = r[0]; cachedKid = r[1]; fromDevice = false; return r[0]; });
    });
  }
  /* is this the passphrase of the tabs (Info or Links)? Used when the site key does not exist yet, so a typo can't make a new key. */
  function checkPassphrase(pass) {
    return Promise.all([get('info/api.php'), get('links/api.php?action=get')]).then(function (r) {
      var iv = r[0] && r[0].page && r[0].page.vault && r[0].page.vault.wrap ? r[0].page.vault : null;
      var ls = r[1] && r[1].data && r[1].data.settings, lv = ls && ls.vault && ls.vault.wrap ? ls.vault : null;
      var list = [iv, lv].filter(Boolean);
      if (!list.length) return null;   // nothing to check it against: the caller asks for it twice
      return Promise.all(list.map(function (v) { return V.unwrapOne(v, pass); })).then(function (raws) {
        raws.forEach(function (x) { if (x) x.fill(0); });
        return raws.some(Boolean);
      });
    });
  }
  /* the one dialog: unlock (the key exists) or set up (it does not yet; needs the website password too) */
  function ask(st) {
    if (asking) return asking;
    var K0 = K(), setup = !st.vault;
    asking = new Promise(function (res, rej) {
      var settled = false;
      var done = function (fn, v) { if (settled) return; settled = true; asking = null; K0.beforeClose = null; fn(v); };
      K0.openDlg('<div class="ix-ico">' + K0.svg(K0.ICON.lock) + '</div><h2>' + (setup ? 'Set Up Encryption for This Data' : 'Unlock Your Data') + '</h2>' +
        '<p>' + (setup ? 'Files, Cards and your saved presets are locked in this browser with your encryption passphrase before they are saved. The server only holds scrambled data.'
                       : 'Type your encryption passphrase (or your recovery key) to open your locked data in this browser.') + '</p>' +
        '<form id="ix-skf"><label for="ix-skp">Encryption Passphrase' + (setup ? '' : ' or Recovery Key') + '</label><input type="password" id="ix-skp" autocomplete="off" autofocus>' +
        (setup ? '<label for="ix-skw">Website Password</label><input type="password" id="ix-skw" autocomplete="current-password"><p class="ix-note">To confirm that it is you.</p>' : '') +
        '<label class="ix-chk"><input type="checkbox" id="ix-skk"> Keep unlocked on this device</label>' +
        '<p class="ix-err" id="ix-ske" role="alert"></p><div class="ix-acts"><button type="button" class="ix-btn" data-ix="close">Cancel</button><button class="ix-btn pri" id="ix-skg">' + (setup ? 'Set Up' : 'Unlock') + '</button></div></form>');
      K0.beforeClose = function () { done(rej, fail('cancel', 'Cancelled.')); };
      var d = K0.dollar, err = function (t) { d('#ix-ske').textContent = t; };
      d('#ix-skf').onsubmit = function (e) {
        e.preventDefault(); err('');
        var pass = d('#ix-skp').value, keep = d('#ix-skk').checked, btn = d('#ix-skg');
        if (!pass) return err(setup ? 'Type your encryption passphrase.' : 'Type your encryption passphrase or recovery key.');
        btn.disabled = true;
        var finish = function (k) { K0.beforeClose = null; K0.closeDlg(true); done(res, k); };
        var oops = function (x) { btn.disabled = false; err(x && x.user ? x.message : "Can't reach the server. Nothing was changed."); };
        if (!setup) {
          V.unwrap(st.vault, pass).then(function (raw) {
            if (!raw) { btn.disabled = false; return err("That doesn't open it. Check the passphrase (or the recovery key)."); }
            return useRaw(raw, keep).then(finish);
          }, oops); return;
        }
        var site = d('#ix-skw').value;
        if (!site) { btn.disabled = false; return err('Type your website password.'); }
        checkPassphrase(pass).then(function (ok) {
          if (ok === false) { btn.disabled = false; return err("That isn't your encryption passphrase."); }
          var raw = V.rnd(32);
          return Promise.all([V.wrap(raw, pass, false), kidOf(raw)]).then(function (w) {
            var nv = w[0]; nv.kid = w[1];
            return core('sv_save', { vault: nv, prev: '', password: site }).then(function (j) {
              if (!j.ok) { raw.fill(0); var e2 = new Error(j._status === 401 ? "That isn't your website password." : (j.error || 'Could not save the key.')); e2.user = true; throw e2; }
              stat = null; return useRaw(raw, keep).then(finish);
            });
          });
        }).catch(oops);
      };
    });
    return asking;
  }
  function key(o) {
    o = o || {};
    if (cached) return Promise.resolve(cached);
    return status().then(function (st) {
      if (!V.ok()) throw fail('insecure', 'Encryption needs a secure (https) connection.');
      if (!st.pp) throw fail('nopass', 'Set an encryption passphrase first (Settings, Security, Encryption).');
      var dev = st.vault ? V.devLoad(NAME) : Promise.resolve(null);
      return dev.then(function (raw) {
        if (raw) {   // a remembered key that is not this vault's (the key was made again) is dropped, and the passphrase asked for
          return kidOf(raw).then(function (kid) {
            if (st.vault.kid && kid !== st.vault.kid) { raw.fill(0); return V.devForget(NAME).then(function () { if (o.ask === false) throw fail('locked', 'Locked.'); return status(true).then(ask); }); }
            return V.useKey(raw).then(function (k) { raw.fill(0); cached = k; cachedKid = kid; fromDevice = true; return k; });
          });
        }
        if (o.ask === false) throw fail('locked', 'Locked.');
        return status(true).then(ask);   // the newest wrap (it can have changed on another device since this page loaded)
      });
    });
  }
  /* an old device record that no longer fits (the key was made again): forget it and ask */
  function relock() { cached = null; cachedKid = ''; fromDevice = false; return V.devForget(NAME); }
  function withKey(fn) {
    return key().then(function (k) {
      return fn(k).catch(function (e) {
        if (!fromDevice || (e && e.code)) throw e;
        return relock().then(key).then(fn);   // the remembered key did not fit: ask once with the dialog
      });
    });
  }
  function seal(text) { return withKey(function (k) { return V.seal(k, String(text)); }); }
  function open(text) {
    return withKey(function (k) { return V.openDeep(k, text); }).catch(function (e) { if (e && e.code) throw e; throw fail('wrongkey', "That doesn't open with your key."); });
  }
  function sealJson(o) { return seal(JSON.stringify(o)); }
  function openJson(s) { return open(s).then(function (t) { return JSON.parse(t); }); }
  window.HubSite = { key: key, status: status, seal: seal, open: open, sealJson: sealJson, openJson: openJson, relock: relock, isSealed: V.isEnc,
    unlocked: function () { return !!cached; }, kid: function () { return cachedKid; }, forget: function () { cached = null; cachedKid = ''; stat = null; return V.devForget(NAME); } };
})();
