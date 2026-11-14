/*! Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
/* Hub shell, admin part: Settings, Security, Telegram, Health (with Server Check) and Backup.
 * Only you need these screens, so they load on first use (shell.js fetches this file when you open Settings or Backup,
 * and prefetches it quietly while you are logged in). Visitors never download it.
 * It shares shell.js's state and helpers through window.__ixShell (K below); nothing here runs until called. */
/* Map of this file (search for the names; line numbers would go stale). One closure, in this order:
 *   frame      SECTIONS, PANES, mount(), go(), pane(), tabify(), cardify(), the draft and "Save Settings" (saveSettings)
 *   search     SEARCH: add a line here for every new setting
 *   General    helpCards (shown in Features), pGeneral, textSizes
 *   Appearance pLook, barHtml, accentHtml, pColors, PRESETS / PRESET_GROUPS (data), pThemes, pGlass
 *   Bar        pBar (bar settings and tabs, the second half of Look), tabEditor
 *   Telegram   pRemind                    Health      pCheck (Server Check: checkInto, then pFiles)
 *   Menu       decorateNav, paintHead, stepBar
 *   Changelog mdInline, mdBlocks, clParse, pChangelog (a tab of Updates)
 *   Updates    pUpdate, ghCard, ghWire, drawUpdate, pFiles (shown in Health > Server Check)
 *   building blocks (used by every pane)  ecCard, ecField, ecChip, tabHead, tile, checkRow, spinRow
 *   Security   pSecurity, VK (devices), PP (password and encryption flows)
 *   Backup     NAMES, pBackup           Health  pHealth
 * Panes share state through the closure, so they are not separate files: splitting them needs a module loader and a real browser test of every
 * Settings section first (tests/browser/pages_test.py opens all of them). */
(function (K) {
  'use strict';
  if (!K || K.impl) return;
  var S = K.S, esc = K.esc, toast = K.toast, api = K.api, ICON = K.ICON, svg = K.svg, remember = K.remember, applySizes = K.applySizes, APP = K.APP, openDlg = K.openDlg, closeDlg = K.closeDlg, login = K.login, ROOT = K.ROOT, applyFont = K.applyFont, applyColors = K.applyColors, applyAttrs = K.applyAttrs, PG_APPS = K.PG_APPS, CORE = K.CORE, ASSETS = K.ASSETS, COLOR_DEFAULT = K.COLOR_DEFAULT, pageList = K.pageList, applyFavicon = K.applyFavicon, SIZE_SPEC = K.SIZE_SPEC, PAGE_DEF = K.PAGE_DEF, FONTS = K.FONTS, COLOR_KEYS = K.COLOR_KEYS, when = K.when, redraw = K.redraw, stepper = K.stepper, linkField = K.linkField;
  function D() { return document.getElementById('ix-dlg'); }
  /* element lookup: inside an open small dialog (Text Sizes) first, otherwise inside the Settings page */
  /* (1.65.1) a window that is closing (its 150 ms fade) no longer counts as open: right after the Keyboard Shortcuts window closed, a change of
     section looked inside it, found no #ix-pane and stopped, so the page kept showing the old section */
  function $(sel) { var ov = document.getElementById('ix-dlg'), h = ov && ov.classList.contains('open') && !ov.classList.contains('closing') ? ov : (PAGE || ov); return h ? h.querySelector(sel) : null; }
  /* ---------- 10. Settings ----------
     Eight sections (1.70.0); Overview, Appearance, Health and Updates hold sub-tabs along the top. General and Appearance edit a draft that
     previews live and is kept with Save Settings; Telegram, Security and Health save each change at once. */
  ICON.send = 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z';
  ICON.home = 'M3 11l9-7 9 7M5 10v10h14V10';
  ICON.server = 'M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01';
  ICON.grid = 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z';
  ICON.upload = 'M12 16V4M7 9l5-5 5 5M4 20h16';
  ICON.sparkle = 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 1.8L21.5 18.5l-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z';
  ICON.device = 'M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2';
  ICON.desktop = 'M3 4h18v12H3zM8 20h8M12 16v4';
  ICON.clock = 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2';
  ICON.log = 'M5 3h14v18H5zM9 8h6M9 12h6M9 16h4';
  ICON.info = 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5M12 8h.01';
  ICON.warn = 'M12 3l10 18H2zM12 10v5M12 18h.01';
  ICON.cmd = 'M4 17l6-6-6-6M12 19h8';
  ICON.users = 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M17 3.5a4 4 0 0 1 0 7.5M22 21a7 7 0 0 0-5-6.7';
  // [id, name, icon, what it is for (shown under the title), sub-tabs [[id, name]], menu group]
  var SECTIONS = [
    ['general', 'General', ICON.home, 'Your site\'s name, logo and time zone.', null, 'Web Setting'],
    ['look', 'Appearance', ICON.palette, 'The theme, font, bar and tabs, colors and glass.', [['look', 'Look'], ['colors', 'Colors'], ['themes', 'Presets'], ['glass', 'Glass']], 'Web Setting'],
    ['security', 'Security', ICON.shield, 'Login, passkeys and encryption.', null, 'Data Setting'],
    ['telegram', 'Telegram', ICON.send, 'Reminders, login alerts and instant replies, sent to your phone.', null, 'Data Setting'],
    ['backup', 'Backup & Restore', ICON.box, 'Download, restore or start over, and backups sent to Telegram.', null, 'Data Setting'],
    ['logs', 'Logs', ICON.log, 'What the site told you, what was done and who logged in, and what went wrong.', [['logs', 'Notifications'], ['logsign', 'Activity'], ['logerr', 'PHP Errors']], 'System Setting'],
    ['health', 'Health', ICON.pulse, 'Version, speed, errors and a check of your server.', [['health', 'Overview'], ['check', 'Server Check'], ['cleanup', 'Cleanup']], 'System Setting'],
    // (1.77.1) Updates has two tabs: Update and Changelog (one list of every version; the old Notes moved to Features)
    ['updates', 'Updates', ICON.upload, 'Update from GitHub or a zip, go back, and what changed in each version.', [['updates', 'Update'], ['changelog', 'Changelog']], 'System Setting'],
    // (1.76.0) Features: what the site does, page by page, with the settings of each part (Files' work right there)
    ['features', 'Features', ICON.grid, 'What the site offers, page by page.', [['features', 'All'], ['ft-home', 'Home'], ['ft-links', 'Links'], ['ft-info', 'Info'], ['ft-cards', 'Cards'], ['ft-tasks', 'Tasks'], ['ft-files', 'Files'], ['ft-tools', 'Tools']], 'System Setting']];
  /* (1.66.0) the left panel in the "System tiles" look: a solid colour tile with a white icon for each section (icons from Lucide,
     lucide.dev, ISC licence: see web/hub/docs/THIRD-PARTY.md). [colour, the icon's SVG inside] */
  var SEC_TILE = {
    general: ['#3b82f6', '<path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/>'],
    look: ['#a855f7', '<path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/><circle cx="13.5" cy="6.5" r=".8" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".8" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".8" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".8" fill="currentColor"/>'],
    security: ['#22c55e', '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>'],
    telegram: ['#0ea5e9', '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>'],
    backup: ['#f97316', '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="m9.5 14.5 2.5 2.5 2.5-2.5M12 11v6"/>'],
    logs: ['#64748b', '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'],
    health: ['#f43f5e', '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>'],
    features: ['#f97316', '<path d="M12 3l2.4 5.2 5.6.6-4.2 3.8 1.2 5.6L12 15.3 7 18.2l1.2-5.6L4 8.8l5.6-.6z"/>'],
    updates: ['#14b8a6', '<path d="M4.393 15.269A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.436 8.284"/><path d="M12 21v-9M8 16l4-4 4 4"/>'],
  };
  var LOGOUT_ICON = '<path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>';
  var tileSvg = function (inner) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + inner + '</svg>'; };
  /* the highlight glides to the chosen section and takes its colour */
  function navGlide() {
    var nav = PAGE && PAGE.querySelector('.ix-snav'), hl = nav && nav.querySelector('.ix-shl'), on = nav && nav.querySelector('[data-sec][aria-current="page"]');
    if (!hl) return;
    if (!on || !on.offsetParent) { hl.style.opacity = '0'; return; }
    hl.style.opacity = '1'; hl.style.top = on.offsetTop + 'px'; hl.style.height = on.offsetHeight + 'px';
    nav.style.setProperty('--hc', on.style.getPropertyValue('--c'));
  }
  var PANES = { logs: pLogNotes, logsign: pLogSign, logerr: pLogErr, general: pGeneral, look: pLook, themes: pThemes, colors: pColors, glass: pGlass, security: pSecurity, telegram: pRemind, backup: pBackup, updates: pUpdate, health: pHealth, check: pCheck, cleanup: pCleanup, changelog: pChangelog, features: pFeatures };
  var PANE_FN = new Map(Object.keys(PANES).map(function (k) { return [k, PANES[k]]; }));   // a Map never answers a built-in name like "constructor"
  var SUB_OF = Object.create(null);   // sub-tab -> its section (nav -> general, colors -> look); no built-in names (#constructor is not a section)
  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  SECTIONS.forEach(function (x) { (x[4] || [[x[0]]]).forEach(function (t) { SUB_OF[t[0]] = x[0]; }); });
  var PAGE = null;                       // the page's own element when Settings runs as a page (web/settings/)
  function P() { return PAGE || D(); }
  var OV = null;                         // what the Overview last learned: the little status labels in the menu come from it
  var TABSEL = {};                       // the tab chosen in each tabbed section (kept while it redraws)
  var TABMERGE = { security: [['Sign-In', ['password', 'passkeys', 'two-step-login', 'login-approval']], ['Data Protection', ['encryption']], ['Devices', ['trusted-browsers', 'devices']]] };   // (1.74.2) Security: eight tabs become four
  var TABBED = { security: 'Overview', telegram: 'Status', backup: 'Back Up' };   // sections whose accordions become tabs, and the name of their first tab
  var SAVED_KEYS = ['siteName', 'nav', 'theme', 'accent', 'accentPg', 'look', 'homeBar', 'glass', 'glassFx', 'barHide', 'font', 'fontCustom', 'colors', 'pages', 'tz'];
  var draft;
  /* what Save Settings would send, written the same way every time (empty color sets and their order don't count) */
  function canonColors(c) {
    c = c || {}; var out = {};
    ['dark', 'light'].forEach(function (m) { var s = c[m] || {}; Object.keys(s).sort().forEach(function (k) { if (s[k]) out[m + '.' + k] = s[k]; }); });
    var pg = c.pg || {}; Object.keys(pg).sort().forEach(function (a) { ['dark', 'light'].forEach(function (m) { if (pg[a] && pg[a][m]) out['pg.' + a + '.' + m] = pg[a][m]; }); });
    return out;
  }
  /* (1.68.2) the Glass tab: [key, name, what it does, min, max, built-in value, unit, card] (the server keeps the same ranges: hub_glass_ranges).
     (1.68.3) Bend and Colour Fringe start at 0: the bending reads from just outside the bar, where Chrome mirrors the page, so over text it
     shows upside-down copies; it is the Liquid effect (a quick pick). (1.68.4) one glass for the whole site, Home widgets included: frost up
     to 40 px and tint up to 94% (Home's old range), Rim Light and Shadow; GFLAGS are the switches and choices kept with them. */
  var GFX = [['frost', 'Frost', 'Blur behind the glass.', 0, 40, 3, ' px', 'fine'], ['tint', 'Tint', 'How much colour sits over the glass.', 0, 94, 20, '%', 'fine'],
    ['sat', 'Saturation', 'How vivid things look through the glass.', 50, 200, 100, '%', 'fine'], ['rim', 'Rim Light', 'The light edge.', 0, 100, 35, '%', 'fine'],
    ['shadow', 'Shadow', 'How much the glass floats.', 0, 80, 30, '%', 'fine'],
    ['bend', 'Liquid Bend', '0 = off.', 0, 100, 0, '', 'liquid'], ['edge', 'Edge Width', 'How far in from the rim the bending reaches.', 2, 40, 7, '%', 'liquid'],
    ['fringe', 'Colour Fringe', 'The red, green and blue split at the bent edges.', 0, 40, 0, '', 'liquid']];
  // [key, min, max, built-in]: tone 0 Auto / 1 Light / 2 Dark; solid; photo = Liquid only on the start page; where else glass shows
  var GFLAGS = [['tone', 0, 2, 0], ['solid', 0, 1, 0], ['photo', 0, 1, 1], ['wpop', 0, 1, 0], ['wdrawer', 0, 1, 0], ['wsearch', 0, 1, 0], ['wwin', 0, 1, 0]];
  var GLOOK = ['frost', 'tint', 'sat', 'bend', 'edge', 'fringe', 'solid'];   // what a Quick Pick sets (tone, rim, shadow and Where stay as they are)
  var GPICKS = [['soft', 'Soft', {}], ['clear', 'Clear', { frost: 0, tint: 10 }], ['frosted', 'Frosted', { frost: 14, tint: 35, sat: 120 }], ['solid', 'Solid', { solid: 1 }],
    ['liquid', 'Liquid', { bend: 60, fringe: 10 }], ['strong', 'Strong Liquid', { bend: 100, edge: 20, fringe: 20, tint: 5, sat: 130 }]];
  var GWHERE = [['wpop', 'Menus and Pop-ups', 'The Edit menu, search options and other small menus.'], ['wdrawer', 'Phone Page List', 'The panel that slides in on a phone.'],
    ['wsearch', 'Search Results', 'The list under the search box.'], ['wwin', 'Settings Windows', 'The Settings windows of Links, Info, Cards and Tasks.']];
  /* only the values that differ from the built-in look, whole numbers inside their range, always in the same order */
  function canonGfx(o) {
    var out = {}; o = o && typeof o === 'object' ? o : {};
    GFX.map(function (g) { return [g[0], g[3], g[4], g[5]]; }).concat(GFLAGS).forEach(function (g) {
      var v = o[g[0]]; if (typeof v === 'number' && isFinite(v)) { v = Math.max(g[1], Math.min(g[2], Math.round(v))); if (v !== g[3]) out[g[0]] = v; } });
    return out;
  }
  function gLook(o) { var r = {}; GLOOK.forEach(function (k) { if (o[k] !== undefined) r[k] = o[k]; }); return JSON.stringify(r); }
  function canonAccents(a) { var out = {}; Object.keys(a || {}).sort().forEach(function (k) { if (a[k]) out[k] = a[k]; }); return out; }
  function pick(o) {
    var r = {};
    SAVED_KEYS.forEach(function (k) { r[k] = k === 'colors' ? canonColors(o.colors) : k === 'accentPg' ? canonAccents(o.accentPg) : k === 'glassFx' ? canonGfx(o.glassFx) : k === 'barHide' ? o.barHide !== false : k === 'pages' ? (o.pages || []) : (o[k] === undefined ? null : o[k]); });
    return JSON.stringify(r);
  }
  function dirty() { return !!draft && pick(draft) !== pick(S); }
  /* the footer says when something is not saved yet */
  function markDirty(edited) {
    var f = $('#ix-sfnote'); if (!f) return;
    var d = dirty(), sf = $('#ix-sf');
    f.textContent = d ? 'You have changes that are not saved yet.' : 'No changes yet.'; f.className = d ? 'ix-dirty' : '';
    // (1.68.3) the bar shows only once something has really changed (and while it is saving), on every tab; before, the tabs kept
    // with Save Settings showed it greyed from the start ("No changes yet."), which looked like something needed saving
    var b = $('#ix-save'), x = $('#ix-discard');
    if (sf) sf.hidden = !d && !(b && b.textContent === 'Saving…'); if (b && b.textContent !== 'Saving…') b.disabled = !d; if (x) x.disabled = !d;
  }
  function mount(host, hash) {
    PAGE = host; host.classList.add('ix-pg'); host.id = 'ix-page';
    if (!S.admin) {
      window.HUB.gate(host, 'Settings', 'Log in to change your site\'s settings.');
      return;
    }
    draft = JSON.parse(JSON.stringify(S)); colorMode = '';
    var gl = null;
    host.innerHTML = '<aside class="ix-snav" aria-label="Settings Sections"><div class="ix-snh">Settings</div><div class="ix-ssearch"><input type="search" id="ix-ss" placeholder="Search Settings" aria-label="Search settings" autocomplete="off" spellcheck="false"><div class="ix-sres" id="ix-sres" hidden></div></div>' + SECTIONS.map(function (x) {
        var head = x[5] !== gl ? (gl = x[5], x[5] ? '<div class="ix-sgl">' + x[5].replace(/ Setting$/, '') + '</div>' : '') : '';
        var t = SEC_TILE[x[0]];
        return head + '<button type="button" data-sec="' + x[0] + '" style="--c:' + (t ? t[0] : '#71717a') + '"><i class="ix-sti">' + (t ? tileSvg(t[1]) : svg(x[2])) + '</i><span>' + x[1] + '</span><em class="ix-sp" data-pill="' + x[0] + '"></em></button>'; }).join('') +
        '<div class="ix-scard"><img class="ix-sclogo" alt="" src="' + esc(S.logo ? ROOT + S.logo : CORE + 'assets/brand/logo-192.png') + '"><div><b>' + esc(S.siteName || 'Homebase Hub') + '</b><small>' + esc(location.host) + '<span data-sver></span></small></div>' +
          '<button type="button" class="ix-out" data-ix="logout" aria-label="Log Out" title="Log Out">' + tileSvg(LOGOUT_ICON) + '</button></div><span class="ix-shl" aria-hidden="true"></span></aside>' +
      '<section class="ix-pane" id="ix-pane"></section>' +
      '<div class="ix-sf" id="ix-sf" hidden><span id="ix-sfnote"></span><span class="ix-err" id="ix-sferr"></span><button type="button" class="ix-btn" id="ix-discard">Discard</button><button type="button" class="ix-btn pri" id="ix-save">Save Settings</button></div>';
    host.querySelectorAll('[data-sec]').forEach(function (b) { b.onclick = function () { go(b.dataset.sec); }; });
    $('#ix-save').onclick = saveSettings;
    applyOff();
    bindSearch(host);
    $('#ix-discard').onclick = function () {   // throw the unsaved changes away and show the saved look again
      draft = JSON.parse(JSON.stringify(S)); applyAttrs(); applyColors(); applyFont(); K.restoreTheme(); redraw(); pane(curSub); markDirty();
    };
    ['input', 'change'].forEach(function (ev) { host.addEventListener(ev, function () { setTimeout(function () { markDirty(true); }, 0); }); });
    host.addEventListener('click', function () { setTimeout(function () { markDirty(false); }, 0); });
    window.addEventListener('beforeunload', function (e) { if (PAGE && dirty()) { e.preventDefault(); e.returnValue = ''; } });
    window.addEventListener('hashchange', function () { if (PAGE) go(location.hash); });
    window.addEventListener('resize', navGlide);
    var h = String(hash || location.hash || '').replace(/^#/, '');
    var narrow = window.matchMedia && window.matchMedia('(max-width: 859px)').matches;
    if (h) go(h);
    else if (narrow) host.setAttribute('data-view', 'list');
    else { var last = ''; try { last = sessionStorage.getItem('ix-sec') || ''; } catch (e) {} go(SUB_OF[last] ? last : 'general'); }
    ovGet().then(function (j) { if (j.ok) { OV = j; decorateNav(); } }).catch(function () {});
  }
  /* Opening Settings asks for the overview twice at once (the menu badges and the Overview page): one request serves both. */
  var ovP = null, ovAt = 0;
  function ovGet() { if (!ovP || Date.now() - ovAt > 3000) { ovAt = Date.now(); ovP = api('overview'); } return ovP; }
  /* Search Settings: type a word ("passphrase", "cron", "font") and jump to the place for it. "/" focuses the box. */
  var SEARCH = [
    ['Site Name', 'general', 'title brand called'], ['Site Logo', 'general', 'icon favicon image picture'], ['Time Zone', 'general', 'timezone clock hour'], ['Keyboard Shortcuts', 'features', 'keys keyboard hotkeys shortcut question mark help'], ['Install on Your Phone', 'features', 'app home screen phone install add to home screen iphone android help'],
    ['Features', 'features', 'what the site does pages home links info cards tasks files tools'],
    ['Cloud Backup', 'backup', 'webdav nextcloud owncloud synology nas storage box off site copy encrypted schedule'],
    ['Offline Reading', 'features', 'offline airplane no connection internet read without cache device app'],
    ['Navigation Style', 'look', 'top bar sidebar dock menu rail pill bottom navigation'], ['Show the Bar on the Home Page', 'look', 'home start page corner bar'], ['Hide the Bar While Scrolling', 'look', 'auto hide slide away stay put fixed scroll dock shrink bar'], ['Bar Glass', 'glass', 'glass bend frost tint fringe saturation refraction transparent'], ['Rename, Reorder or Hide Tabs', 'look', 'tabs pages names order navigation'],
    ['Font', 'look', 'typeface text trebuchet georgia'], ['Theme', 'look', 'dark light amoled follow device system'], ['Text Sizes', 'look', 'bigger smaller font size info cards zoom'], ['Accent Color', 'colors', 'gold buttons highlight'],
    ['Presets', 'themes', 'themes looks dracula nord gallery surprise my save share import export'], ['Colors', 'colors', 'background text borders menu bar page accent per page'],
    ['Website Password', 'security/password', 'change login'], ['Encryption Passphrase', 'security/encryption', 'encrypt lock private tabs backups'], ['Recovery Key', 'security/encryption', 'forgot passphrase spare'],
    ['Passkeys', 'security/passkeys', 'passkey fingerprint face pin webauthn security key log in without password'], ['Two-Step Login', 'security/two-step-login', '2fa authenticator totp recovery codes'], ['Telegram Login Approval', 'security/login-approval', 'telegram approve tap'],
    ['Trusted Browsers', 'security/trusted-browsers', 'skip code remember'], ['Devices and Login History', 'security/devices', 'log out sessions activity wrong password ip'],
    ['Telegram Bot Setup', 'telegram/setup', 'token botfather chat cron schedule connect'], ['Send Backups to Telegram', 'backup', 'telegram send backup schedule daily weekly'],
    ['Telegram Messages', 'telegram/messages', 'digest reminders alerts daily hour due'], ['Instant Replies', 'telegram/instant-replies', 'webhook commands bot'],
    ['Back Up', 'backup/overview', 'download backup file locked passphrase'], ['Restore a Backup', 'backup/restore', 'import'], ['Export', 'backup/export', 'csv json spreadsheet links cards tasks'],
    ['Earlier Versions', 'backup/restore', 'history undo'], ['Start Over', 'backup/start-over', 'erase reset'],
    ['Update the Site', 'updates', 'upload zip version install'], ['Update From GitHub', 'updates', 'github check now daily release download'], ['Files That Do Not Belong', 'check', 'extra changed missing leftover files'],
    ['Health', 'health', 'disk speed errors log'], ['Server Check', 'check', 'php memory gd curl extensions limit photos'], ['Cleanup', 'cleanup', 'clean clear delete versions photos sessions error log space disk free tidy'],
    ['Logs', 'logs', 'notifications messages history log activity'], ['Activity', 'logsign', 'sign-in history logins wrong password what was done backups updates restores changes settings saved audit'], ['PHP Errors', 'logerr', 'error log'],
    ['Changelog', 'changelog', 'changelog versions history what changed new version map'], ['Good to Know', 'features', 'notes how updating works']
  ];
  function bindSearch(host) {
    var q = host.querySelector('#ix-ss'), box = host.querySelector('#ix-sres'); if (!q) return;
    var shown = [];
    function draw() {
      var terms = q.value.toLowerCase().split(/\s+/).filter(Boolean);
      shown = terms.length ? SEARCH.filter(function (x) { var hay = (x[0] + ' ' + x[2]).toLowerCase(); return terms.every(function (t) { return hay.indexOf(t) >= 0; }); }).slice(0, 7) : [];
      box.hidden = !terms.length;
      box.innerHTML = shown.length ? shown.map(function (x, i) { return '<button type="button" data-i="' + i + '"' + (i === 0 ? ' class="on"' : '') + '><b>' + esc(x[0]) + '</b><small>' + esc(SECTIONS.filter(function (z) { return z[0] === SUB_OF[x[1].split('/')[0]]; })[0][1]) + '</small></button>'; }).join('') : terms.length ? '<p>No setting matches that. Try one word, like "password" or "font".</p>' : '';
      box.querySelectorAll('button').forEach(function (b) { b.onmousedown = function (e) { e.preventDefault(); pick(+b.dataset.i); }; });
    }
    function pick(i) { var x = shown[i]; if (!x) return; q.value = ''; draw(); q.blur(); go(x[1]); }
    q.oninput = draw;
    q.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); pick(0); } else if (e.key === 'Escape') { q.value = ''; draw(); q.blur(); } };
    q.onblur = function () { setTimeout(function () { box.hidden = true; }, 120); };
    q.onfocus = draw;
    document.addEventListener('keydown', function (e) {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || !PAGE || !document.body.contains(q)) return;
      var t = e.target && e.target.tagName; if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || (e.target && e.target.isContentEditable)) return;
      e.preventDefault(); q.focus();
    });
  }
  /* Open a section, one of its sub-tabs ('colors'), or a tab inside it ('security/encryption'). */
  function go(target) {
    target = String(target || '').replace(/^#/, ''); var parts = target.split('/'), id = parts[0] || 'general';
    if (id === 'remind') id = 'telegram';
    if (id === 'system') id = 'updates';   // the System section of 1.48 is Updates, Health and Changelog again
    if (id === 'pages' || id === 'nav') id = 'look';   // Pages (1.48.5) and the Bar tab (1.78.0) are now part of Look
    if (id === 'domains') id = 'health';   // Domains and Uptime was removed in 1.78.0
    if (id === 'setup') id = 'general';   // Start Here was removed in 1.78.0
    // (1.70.0) the moves: Updates > Files is part of Health > Server Check; Telegram > Backups is part of Backup & Restore
    if (id === 'files') id = 'check';
    if (id === 'telegram' && parts[1] === 'backups') { id = 'backup'; parts = ['backup']; }
    if (!PAGE) { location.href = K.ROOT + 'web/settings/#' + target; return; }
    if (!own(SUB_OF, id)) id = 'general';
    if (id === 'backup' && parts[1]) parts[1] = { 'back-up': 'overview', 'export-data': 'export', 'earlier-versions': 'restore' }[parts[1]] || parts[1];   // the tabs of 1.60 and before
    if (parts[1]) TABSEL[id] = parts[1];
    pane(id);
  }
  function sectionOf(id) { return SECTIONS.filter(function (x) { return x[0] === id; })[0]; }
  var curSub = '';
  function pane(id) {
    var sec = SUB_OF[id] || 'general', s = sectionOf(sec);
    var subs = s[4] || [[sec, s[1]]], sub = subs.some(function (t) { return t[0] === id; }) ? id : subs[0][0];
    var tabs = subTabs(subs, sub);
    P().querySelectorAll('[data-sec]').forEach(function (b) { if (b.dataset.sec === sec) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    navGlide();
    P().style.setProperty('--sc', (SEC_TILE[sec] || ['#71717a'])[0]);   // (1.66.1) the section's colour for the tiles on its pages
    curSub = sub; P().setAttribute('data-view', 'detail');
    try { sessionStorage.setItem('ix-sec', sub); if (location.hash !== '#' + sub) history.replaceState(null, '', '#' + sub); } catch (e) {}
    var box = $('#ix-pane'); box.scrollTop = 0; window.scrollTo(0, 0);
    // (1.74.3) one header for every section: its tile, the name, what it is for, and on the right its status (and a next step where there is one)
    box.innerHTML = '<div class="ix-ph" data-sec="' + sec + '"><button type="button" class="ix-back" aria-label="Back to All Settings">‹ Settings</button>' +
      '<div class="ix-phr"><span class="ix-pht" aria-hidden="true">' + tileSvg((SEC_TILE[sec] || ['', ''])[1]) + '</span><div class="ix-phx"><h2>' + s[1] + '</h2><p>' + s[3] + '</p></div><div class="ix-phs" id="ix-phs" hidden></div></div>' +
      tabs + '</div><div id="ix-pc" class="ix-anim"></div>';
    box.querySelector('.ix-back').onclick = function () { P().setAttribute('data-view', 'list'); try { history.replaceState(null, '', location.pathname); } catch (e) {} window.scrollTo(0, 0); };
    bindSubTabs(box, subs);
    mountPane(sub); subMark(); markDirty(); paintHead();
  }
  /* The tabs along the top of a section. A tab can hold a few tabs of its own when its third field names a group: each group is
     then one tab, and a group with more than one part gets a small row of its own below.  */
  function grpOf(t) { return t[2] || t[1]; }
  function subTabs(subs, sub) {
    var cur = subs.filter(function (t) { return t[0] === sub; })[0] || subs[0], cg = grpOf(cur), groups = [];
    subs.forEach(function (t) { var g = grpOf(t); if (groups.indexOf(g) < 0) groups.push(g); });
    var first = function (g) { return subs.filter(function (t) { return grpOf(t) === g; })[0][0]; };
    var inG = subs.filter(function (t) { return grpOf(t) === cg; });
    return (groups.length > 1 ? '<div class="ix-subt" role="tablist">' + groups.map(function (g) {
        return '<button type="button" role="tab" data-grp="' + first(g) + '"' + (/^ft-/.test(first(g)) ? ' style="--sc:' + K.pageColor(first(g).slice(3)) + '"' : '') + ' aria-selected="' + (g === cg) + '">' + esc(g) + '</button>'; }).join('') + '<i class="ix-subi"></i></div>' : '') +
      (inG.length > 1 ? '<div class="ix-seg ix-subseg" role="tablist" aria-label="' + esc(cg) + '">' + inG.map(function (t) {
        return '<button type="button" role="tab" data-sub="' + t[0] + '" aria-selected="' + (t[0] === sub) + '">' + esc(t[1]) + '</button>'; }).join('') + '</div>' : '');
  }
  function bindSubTabs(box, subs) {
    box.querySelectorAll('[data-grp]').forEach(function (b) { b.onclick = function () {
      var g = grpOf(subs.filter(function (t) { return t[0] === b.dataset.grp; })[0]), cg = grpOf(subs.filter(function (t) { return t[0] === curSub; })[0] || subs[0]);
      if (g !== cg) pane(b.dataset.grp); }; });
    box.querySelectorAll('[data-sub]').forEach(function (b) { b.onclick = function () { if (b.dataset.sub !== curSub) subPane(b.dataset.sub); }; });
  }
  /* switching a sub-tab keeps the section header and only swaps the content below it */
  function subPane(sub) {
    var box = $('#ix-pane'), pc = box.querySelector('#ix-pc');
    curSub = sub; try { sessionStorage.setItem('ix-sec', sub); history.replaceState(null, '', '#' + sub); } catch (e) {}
    box.querySelectorAll('[data-sub]').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.sub === sub ? 'true' : 'false'); });
    var n = pc.cloneNode(false); pc.replaceWith(n); box.scrollTop = 0;
    mountPane(sub); subMark(); markDirty();
  }
  function subMark() {
    var t = $('#ix-pane .ix-subt'); if (!t) return;
    var on = t.querySelector('[aria-selected="true"]'), i = t.querySelector('.ix-subi');
    if (on && i) { i.style.width = on.offsetWidth + 'px'; i.style.transform = 'translateX(' + on.offsetLeft + 'px)'; }
    if (on) t.scrollLeft = Math.max(0, on.offsetLeft - (t.clientWidth - on.offsetWidth) / 2);   // (1.74.2) on a phone the strip scrolls: the open tab is brought into view
  }
  /* The long sections (Security, Telegram, Backup) are drawn as a list of folded parts. Here each part becomes a tab and the status
     above them becomes the first tab, so only one thing is on screen at a time. The parts keep working as they were: they are only shown and hidden. */
  var tabObs = null;
  /* The plain panes (General, Tabs, Look) are written as "heading, one line, controls". Each heading with what follows it
     becomes a card, so they look like Security and Telegram. The controls are only moved, so everything keeps working. */
  var CARDIFY = { general: 1, look: 1, glass: 1 };
  var OFFL = function () { return K.offline(); };
  var CARD_ICON = { 'offline reading': ICON.down, 'install on your phone': ICON.down, 'keyboard shortcuts': ICON.keyboard, 'text sizes': ICON.type, 'site name': ICON.edit, 'site logo': ICON.image, 'time zone': ICON.clock, 'font': ICON.type, 'theme': ICON.palette, 'accent color': ICON.palette,
    'navigation style': ICON.menu, 'tabs': ICON.pages, 'glass': ICON.sparkle, 'quick picks': ICON.palette, 'fine-tune': ICON.gear, 'liquid': ICON.sparkle, 'where': ICON.grid };
  function cardify(pc) {
    if (!pc || !pc.querySelector(':scope > h3')) return;
    var groups = [], cur = null;
    [].slice.call(pc.children).forEach(function (k) {
      if (k.tagName === 'H3') { cur = { h: k, body: [] }; groups.push(cur); } else if (cur) cur.body.push(k);
    });
    groups.forEach(function (g) {
      var title = g.h.textContent, sec = document.createElement('section'); sec.className = 'ix-ec ix-auto';
      var desc = g.body.length && g.body[0].tagName === 'P' && !g.body[0].id && !g.body[0].classList.contains('ix-err') ? g.body.shift() : null;
      sec.innerHTML = '<div class="ix-ec-h"><span class="ix-ec-i">' + svg(CARD_ICON[title.toLowerCase()] || ICON.gear) + '</span><div><div class="ix-ec-t"></div><div class="ix-ec-d"></div></div></div><div class="ix-ec-b"></div>';
      sec.querySelector('.ix-ec-t').textContent = title;
      if (desc) { sec.querySelector('.ix-ec-d').innerHTML = desc.innerHTML; desc.remove(); } else sec.querySelector('.ix-ec-d').remove();   // moved into the card head, not shown twice
      var b = sec.querySelector('.ix-ec-b'); g.body.forEach(function (n) { b.appendChild(n); });
      pc.insertBefore(sec, g.h); g.h.remove();
    });
  }
  function mountPane(sub) {
    var draw = PANE_FN.get(sub); if (typeof draw !== 'function') { sub = 'general'; draw = PANE_FN.get(sub); }   // only a pane of ours runs, whatever the address says
    var pc = $('#ix-pc'); if (tabObs) { tabObs.disconnect(); tabObs = null; }
    if (TABBED[sub] || CARDIFY[sub]) { tabObs = new MutationObserver(function () { if (TABBED[sub]) tabify(pc, sub); if (CARDIFY[sub]) cardify(pc); }); tabObs.observe(pc, { childList: true }); }
    draw(pc); if (TABBED[sub]) tabify(pc, sub); if (CARDIFY[sub]) cardify(pc);
  }
  function slug(t) { return String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function tabify(pc, sub) {
    if (!pc || pc.querySelector(':scope > .ix-tabbar')) return;
    var kids = [].slice.call(pc.children), accs = kids.filter(function (k) { return k.matches && k.matches('details.ix-acc'); });
    if (accs.length < 2) return;
    var rest = kids.filter(function (k) { return accs.indexOf(k) < 0; }), tabs = [];
    if (rest.length) {
      var st = document.createElement('div'); st.className = 'ix-tpane'; st.dataset.tab = 'overview'; pc.insertBefore(st, accs[0]);
      rest.forEach(function (k) { st.appendChild(k); }); tabs.push({ id: 'overview', title: TABBED[sub] || 'Overview', els: [st] });
    }
    accs.forEach(function (a) {
      var sm = a.querySelector(':scope > summary'), t = sm && sm.querySelector('span') ? sm.querySelector('span').textContent : (sm ? sm.textContent : 'Tab'), cap = sm && sm.querySelector('small');
      a.classList.add('ix-tpane'); a.dataset.tab = slug(t); a.dataset.cap = cap ? cap.textContent : ''; tabs.push({ id: a.dataset.tab, title: t, els: [a] });
    });
    if (TABMERGE[sub]) {   // some parts share one tab: they are shown one under the other, all open
      var lead = tabs.filter(function (t) { return t.id === 'overview'; }), merged = [], used = {};
      TABMERGE[sub].forEach(function (m) {
        var els = []; tabs.forEach(function (t) { if (m[1].indexOf(t.id) >= 0) { els = els.concat(t.els); used[t.id] = 1; } });
        if (!els.length) return; var id = slug(m[0]); els.forEach(function (e) { e.dataset.tab = id; }); merged.push({ id: id, title: m[0], els: els, ids: m[1] });
      });
      tabs = lead.concat(merged, tabs.filter(function (t) { return t.id !== 'overview' && !used[t.id]; }));
    }
    var bar = document.createElement('div'); bar.className = 'ix-tabbar ix-subt'; bar.setAttribute('role', 'tablist');
    bar.innerHTML = tabs.map(function (t) { return '<button type="button" role="tab" data-tab="' + t.id + '">' + esc(t.title) + '</button>'; }).join('') + '<i class="ix-subi"></i>';
    pc.classList.add('ix-tabbed'); pc.insertBefore(bar, pc.firstChild);
    function show(id) {
      TABSEL[sub] = id;
      tabs.forEach(function (t) { var on = t.id === id; t.els.forEach(function (e) { e.classList.toggle('ix-on', on); if (e.tagName === 'DETAILS') e.open = on; }); });
      bar.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === id ? 'true' : 'false'); });
      var on = bar.querySelector('[aria-selected="true"]'), i = bar.querySelector('.ix-subi');
      if (on && i) { i.style.width = on.offsetWidth + 'px'; i.style.transform = 'translateX(' + on.offsetLeft + 'px)'; }
      if (on) bar.scrollLeft = Math.max(0, on.offsetLeft - (bar.clientWidth - on.offsetWidth) / 2);
    }
    bar.querySelectorAll('button').forEach(function (b) { b.onclick = function () { show(b.dataset.tab); }; });
    if (!pc.__tg) { pc.__tg = true; pc.addEventListener('toggle', function (e) { var d = e.target; if (d && d.matches && d.matches('details.ix-tpane') && d.open && !d.classList.contains('ix-on')) { var b = pc.querySelector('.ix-tabbar [data-tab="' + d.dataset.tab + '"]'); if (b) b.click(); } }, true); }
    var want = TABSEL[sub], hit = tabs.filter(function (t) { return t.id === want || (t.ids && t.ids.indexOf(want) >= 0); })[0];   // an old address like #security/encryption opens the tab that now holds it
    show(hit ? hit.id : tabs[0].id);
  }
  function seg(name, opts, val) {
    return '<div class="ix-seg" data-seg="' + name + '">' + opts.map(function (o) {
      return '<button type="button" data-v="' + o[0] + '" aria-pressed="' + (String(val) === String(o[0])) + '">' + o[1] + '</button>'; }).join('') + '</div>';
  }
  function bindSeg(p, cb) {
    p.querySelectorAll('[data-seg]').forEach(function (g) {
      g.querySelectorAll('button').forEach(function (b) { b.onclick = function () {
        g.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        cb(g.dataset.seg, b.dataset.v); }; });
    });
  }
  function preview() { K.previewWith(draft); }
  /* Shrinks a picked image to a small PNG so the logo stays light. */
  function smallImage(file, px, cb) {
    var r = new FileReader();
    r.onload = function () {
      var img = new Image();
      img.onload = function () {
        var k = Math.min(1, px / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        cb(c.toDataURL('image/png'));
      };
      img.onerror = function () { toast("That image can't be read."); };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  }
