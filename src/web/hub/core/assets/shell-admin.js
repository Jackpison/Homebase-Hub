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
    ['Passkeys', 'security/passkeys', 'passkey fingerprint face pin webauthn security key log in without password'], ['Two-Step Login', 'security/two-step-login', '2fa authenticator totp recovery codes'], ['Login Approval', 'security/login-approval', 'telegram approve tap'],
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
        return '<button type="button" role="tab" data-grp="' + first(g) + '" aria-selected="' + (g === cg) + '">' + esc(g) + '</button>'; }).join('') + '<i class="ix-subi"></i></div>' : '') +
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
  /* every time zone the browser knows, the saved one and this device's own first; each with its current offset from UTC */
  function tzOptions(cur) {
    var all = []; try { all = Intl.supportedValuesOf('timeZone'); } catch (e) {}
    if (!all.length) all = ['Asia/Kolkata', 'UTC', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney'];
    if (all.indexOf(cur) < 0) all.unshift(cur);
    var off = function (z) { try { return (new Intl.DateTimeFormat('en-US', { timeZone: z, timeZoneName: 'shortOffset' }).formatToParts(new Date()).filter(function (x) { return x.type === 'timeZoneName'; })[0] || {}).value || ''; } catch (e) { return ''; } };
    var opt = function (z, label) { return '<option value="' + esc(z) + '"' + (z === cur ? ' selected' : '') + '>' + esc(label || z.replace(/_/g, ' ')) + ' (' + esc(off(z).replace('GMT', 'UTC') || 'UTC') + ')</option>'; };
    var mine = ''; try { mine = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    var top = [cur].concat(mine && mine !== cur ? [mine] : []);   // the saved zone, then this device's own
    return '<optgroup label="Saved and This Device">' + top.map(function (z) { return opt(z, z === 'Asia/Kolkata' ? 'India Standard Time, IST' : ''); }).join('') + '</optgroup><optgroup label="All Time Zones">' +
      all.filter(function (z) { return top.indexOf(z) < 0; }).map(function (z) { return opt(z); }).join('') + '</optgroup>';
  }
  /* (1.70.0) Overview > Start Here: under Guided Setup, Install on Your Phone and Keyboard Shortcuts (they were in General; they are help, not settings) */
  function helpCards(p) {
    p.innerHTML = '<h3 id="ix-install">Install on Your Phone</h3><p>Opens like an app, with its own icon.</p>' +
      '<details class="ix-how"><summary>How?</summary><div class="ix-steps"><h4>iPhone or iPad</h4><p>In Safari, tap Share, then Add to Home Screen.</p>' +
      '<h4>Android</h4><p>In Chrome, open the menu (the three dots), then Install App or Add to Home Screen.</p>' +
      '<h4>Computer</h4><p>In Chrome or Edge, click the install icon at the right end of the address bar, or open the menu and choose Install.</p></div></details>' +
      '<button type="button" class="ix-btn pri" id="ix-inst" hidden>' + svg(ICON.down) + 'Install</button>' +
      '<h3 id="ix-keyh" class="ix-kbonly">Keyboard Shortcuts</h3><p class="ix-kbonly">Search, go to a page and edit from the keyboard. Press <kbd>?</kbd> on any page to see them all.</p>' +
      '<button type="button" class="ix-btn ix-kbonly" id="ix-keysb">' + svg(ICON.keyboard) + 'View Shortcuts</button>' +
      // (1.72.0) Offline Reading: one switch for this device (the copy stays in this browser only)
      '<h3 id="ix-offh">Offline Reading</h3><p>Open Home, Links, Info, Cards and Tasks without a connection, read-only. Only on this device; Log Out deletes the copy, and locked tabs stay locked.</p>' +
      '<label class="ix-tg"><span>On This Device<small id="ix-offst">' + (OFFL().can() ? 'Off' : 'Needs a secure (https) connection.') + '</small></span><input type="checkbox" id="ix-offsw"' + (OFFL().on() ? ' checked' : '') + (OFFL().can() ? '' : ' disabled') + '></label>';
    p.querySelector('#ix-keysb').onclick = function () { window.HUB.showKeys(); };
    var offSt = function () {
      var st = p.querySelector('#ix-offst'); if (!st || !OFFL().can()) return;
      if (!OFFL().on()) { st.textContent = 'Off'; return; }
      OFFL().count().then(function (n) { st.textContent = n ? 'On: ' + n + ' pages and files kept on this device.' : 'On: pages are kept as you open them.'; });
    };
    p.querySelector('#ix-offsw').onchange = function (e) {
      var on = e.target.checked; e.target.disabled = true;
      OFFL().set(on).then(function (ok) { e.target.disabled = false; if (on && !ok) { e.target.checked = false; OFFL().set(false); toast('This browser cannot keep the site for offline use.'); } else toast(on ? 'Offline Reading is on for this device.' : 'Offline Reading is off; the copy is deleted.'); offSt(); });
    };
    offSt();
    // the Install button shows only when this browser offers it (settings.js keeps the offer: beforeinstallprompt)
    var ib = p.querySelector('#ix-inst');
    var offer = function () { ib.hidden = !window.__hubInstall; };
    offer(); document.addEventListener('hub-install', offer);
    ib.onclick = function () {
      var ev = window.__hubInstall; if (!ev) return;
      window.__hubInstall = null; ib.hidden = true; ev.prompt();
      Promise.resolve(ev.userChoice).then(function (r) { if (r && r.outcome === 'accepted') toast('Installed.'); }, function () {});
    };
    cardify(p);
  }
  function pGeneral(p) {
    p.innerHTML = '<h3>Site Name</h3><p>Shown in the bar, Telegram messages and backup names.</p><input type="text" id="ix-name" maxlength="30" value="' + esc(draft.siteName) + '" aria-label="Site Name">' +
      '<h3>Site Logo</h3><p>Shown in the bar and the browser tab. PNG, JPG, WebP or GIF.</p>' +
      '<div class="ix-row"><span class="ix-logoprev" id="ix-lp">' + (S.logo ? '<img src="' + esc(ROOT + S.logo) + '" alt="">' : '<span>' + esc((S.siteName || 'M').charAt(0).toUpperCase()) + '</span>') + '</span>' +
      '<button type="button" class="ix-btn" id="ix-lu">' + svg(ICON.image) + 'Change Logo</button><button type="button" class="ix-btn" id="ix-lx"' + (S.logo ? '' : ' hidden') + '>Remove</button>' +
      '<input type="file" id="ix-lf2" accept="image/png,image/jpeg,image/webp,image/gif" hidden></div>' +
      '<h3>Time Zone</h3><p>Today, due times, backups and Telegram all follow it.</p>' +
      '<select id="ix-tz" class="ix-sel" aria-label="Time Zone">' + tzOptions(draft.tz || 'Asia/Kolkata') + '</select>';
    p.querySelector('#ix-tz').onchange = function (e) { draft.tz = e.target.value; };
    p.querySelector('#ix-name').oninput = function (e) { draft.siteName = e.target.value; };
    p.querySelector('#ix-lu').onclick = function () { p.querySelector('#ix-lf2').click(); };
    p.querySelector('#ix-lf2').onchange = function (e) {
      var f = e.target.files[0]; if (!f) return;
      smallImage(f, 192, function (data) {
        api('logo', { data: data }).then(function (j) {
          if (!j.ok) { toast(j.error || ('Could not save the logo. The server answered ' + (j._status || 'nothing') + (j._status === 413 ? ' (the image is too big for this host).' : '. Ask your host to check that web/hub/media can be written to.')), true); return; }
          S.logo = draft.logo = j.state.logo; remember(S); redraw(); applyFavicon(); subPane('general'); toast('Logo updated.');
        }, function () { toast("Can't reach the server. The logo was not changed.", true); });
      });
    };
    p.querySelector('#ix-lx').onclick = function () {
      api('logo', { remove: true }).then(function (j) { if (j.ok) { S.logo = draft.logo = ''; remember(S); redraw(); subPane('general'); toast('Logo removed.'); } });
    };
  }
  /* Appearance > Look: the theme, the font and the text sizes, then the bar (style, behaviour, tabs; they had a tab of their own before 1.78.0). Accent Color is on Colors, the glass switch on Glass. */
  function pLook(p) {
    p.innerHTML = '<h3>Theme</h3><p>The default look. The sun/moon button in the bar changes it just for you.</p>' +
      seg('theme', [['auto', 'Follow Device'], ['dark', 'Dark'], ['light', 'Light']], draft.theme) +
      '<h3>Font</h3><p>One font for every page.</p><select id="ix-font" class="ix-sel" aria-label="Font">' +
        FONTS.map(function (f) { return '<option value="' + f[0] + '"' + (draft.font === f[0] || (!draft.font && f[0] === 'default') ? ' selected' : '') + '>' + esc(f[1]) + '</option>'; }).join('') + '</select>' +
      '<input type="text" id="ix-fontc" maxlength="40" placeholder="A font installed on your device, like Calibri" value="' + esc(draft.fontCustom || '') + '" aria-label="Font Name"' + (draft.font === 'custom' ? '' : ' hidden') + '>' +
      '<h3>Text Sizes</h3><p>Make the text on Info or Cards bigger or smaller. Links has its own, in Links Settings.</p>' +
      '<div class="ix-row"><button type="button" class="ix-btn" data-ts="info">' + svg(ICON.type) + 'Info Text Sizes</button><button type="button" class="ix-btn" data-ts="cards">' + svg(ICON.type) + 'Cards Text Sizes</button></div>';
    bindSeg(p, function (k, v) { draft[k] = v; if (k === 'theme') K.previewTheme(v); });
    p.querySelector('#ix-font').onchange = function (e) { draft.font = e.target.value; p.querySelector('#ix-fontc').hidden = draft.font !== 'custom'; if (draft.font === 'custom') p.querySelector('#ix-fontc').focus(); preview(); };
    p.querySelector('#ix-fontc').oninput = function (e) { draft.fontCustom = e.target.value; preview(); };
    p.querySelectorAll('[data-ts]').forEach(function (b) { b.onclick = function () { textSizes(b.dataset.ts); }; });
    pBar(p);
  }
  /* the bar: how it looks and acts, then its tabs */
  function barHtml() {
    return '<h3>Navigation Style</h3><p>For every page.</p>' +
      '<div class="ix-navpick">' + [['top', 't', 'Top Bar'], ['side', 's', 'Sidebar'], ['dock', 'd', 'Bottom Dock']].map(function (o) { return '<button type="button" class="' + o[1] + '" data-n="' + o[0] + '" aria-pressed="' + (draft.nav === o[0]) + '"><i></i>' + o[2] + '</button>'; }).join('') + '</div>' +
      '<label class="ix-tg"><span>Show the Bar on the Home Page<small>Off keeps the home page clean; a corner button opens the menu.</small></span><input type="checkbox" id="ix-hb"' + (draft.homeBar ? ' checked' : '') + '></label>' +
      '<label class="ix-tg"><span>Hide the Bar While Scrolling<small>The top bar slides away as you scroll down and comes back as you scroll up; the dock shrinks a little. Off keeps the bar in place.</small></span><input type="checkbox" id="ix-bh"' + (draft.barHide !== false ? ' checked' : '') + '></label>' +
      '<p class="ix-note">Glass for the bar: the Glass tab.</p>';
  }
  function bindBar(p) {
    p.querySelectorAll('[data-n]').forEach(function (b) { b.onclick = function () {
      draft.nav = b.dataset.n; p.querySelectorAll('[data-n]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); preview(); }; });
    p.querySelector('#ix-hb').onchange = function (e) { draft.homeBar = e.target.checked; preview(); };
    p.querySelector('#ix-bh').onchange = function (e) { draft.barHide = e.target.checked; preview(); };
  }
  /* Accent Color (on the Colors tab since 1.70.0). (1.65.3) The picker is adapted from Uiverse.io by Cobp, "horrible-quail-18" (MIT; see web/hub/docs/THIRD-PARTY.md):
     ten squares in a row that swell around the mouse, the hex code in a bubble; a click chooses (the original copies), the arrow keys move along the row */
  var ACC_SW = ['#ffc21a', '#fb923c', '#e11d48', '#f472b6', '#a78bfa', '#8b5cf6', '#3b82f6', '#0ea5e9', '#10b981', '#84cc16'];
  function accentHtml() {
    var tickOn = function (c) { var n = parseInt(c.slice(1), 16); return ((n >> 16) * 299 + (n >> 8 & 255) * 587 + (n & 255) * 114) / 1000 > 140 ? '#111' : '#fff'; };
    return '<div class="ix-cgrp"><h4>Accent Color</h4><p>Buttons, the current page, links and highlights, on every page, in dark and light mode.</p><div class="ix-sw"><div class="ix-apk" role="group" aria-label="Accent Color">' + ACC_SW.map(function (c, i) {
        var on = draft.accent === c, first = ACC_SW.indexOf(draft.accent) < 0 ? i === 0 : on;
        return '<button type="button" data-c="' + c + '" data-hex="' + c + '" style="--c:' + c + '" aria-label="Accent color ' + c + (on ? ', chosen' : '') + '" aria-pressed="' + on + '" tabindex="' + (first ? 0 : -1) + '">' +
          '<svg class="ix-apt" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3 3 7-7" stroke="' + tickOn(c) + '"/></svg></button>'; }).join('') + '</div>' +
      '<label class="ix-swc" title="Your Own Color"><input type="color" id="ix-acc" value="' + esc(draft.accent) + '" aria-label="Your Own Color"></label><input type="text" class="ix-hex" id="ix-acch" maxlength="7" value="' + esc(draft.accent) + '" aria-label="Accent Color Hex" spellcheck="false"></div></div>';
  }
  function bindAccent(p) {
    function setAcc(c, fromText) {
      draft.accent = c.toLowerCase(); if (!fromText) p.querySelector('#ix-acch').value = draft.accent; p.querySelector('#ix-acc').value = draft.accent;
      p.querySelectorAll('.ix-apk [data-c]').forEach(function (b) { var on = b.dataset.c === draft.accent; b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.setAttribute('aria-label', 'Accent color ' + b.dataset.c + (on ? ', chosen' : '')); });
      preview();
    }
    var apk = [].slice.call(p.querySelectorAll('.ix-apk [data-c]'));   // the arrow keys move along the row (one stop for Tab)
    apk.forEach(function (b, i) {
      b.onclick = function () { setAcc(b.dataset.c); };
      b.onkeydown = function (e) {
        var d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!d) return; e.preventDefault();
        var n = apk[(i + d + apk.length) % apk.length]; apk.forEach(function (x) { x.tabIndex = -1; }); n.tabIndex = 0; n.focus(); }; });
    p.querySelector('#ix-acc').oninput = function (e) { setAcc(e.target.value); };
    p.querySelector('#ix-acch').oninput = function (e) { var h = hexOf(e.target.value); e.target.classList.toggle('bad', !h); if (h) setAcc(h, true); };
  }
  /* A color swatch with an editable hex box beside it (#1a1a1a, 1a1a1a or #fff). Typing a valid color applies it; clearing the box means "default".
     set(value) gets a #rrggbb string, or '' for default. */
  function hexOf(v) {
    v = String(v || '').trim().replace(/^#/, '');
    if (/^[0-9a-f]{3}$/i.test(v)) v = v.replace(/./g, '$&$&');
    return /^[0-9a-f]{6}$/i.test(v) ? '#' + v.toLowerCase() : '';
  }
  function bindHex(sw, tx, set, canClear) {
    sw.addEventListener('input', function () { tx.value = sw.value; tx.classList.remove('bad'); set(sw.value.toLowerCase()); });
    tx.addEventListener('input', function () {
      var h = hexOf(tx.value);
      if (h) { tx.classList.remove('bad'); sw.value = h; set(h); }
      else if (!tx.value.trim() && canClear) { tx.classList.remove('bad'); set(''); }
      else tx.classList.add('bad');
    });
    tx.addEventListener('blur', function () { var h = hexOf(tx.value); if (h) tx.value = h; });
  }
  /* "Text sizes" for Info and Cards: sliders that preview live; the sizes are saved with the site settings. app: the page whose sizes
     these are (1.70.0: Settings > Appearance > Look opens them for Info or Cards; on those pages it is the page itself). The page
     itself follows the sliders only when it is that page; the sample in the window always does. */
  function textSizes(app) {
    app = typeof app === 'string' && SIZE_SPEC[app] ? app : APP;
    var spec = SIZE_SPEC[app], here = app === APP; if (!spec) return;
    if (!S.admin) { login().then(function () { textSizes(app); }, function () {}); return; }
    var cur = ((S.sizes || {})[app]) || {}, val = {};
    spec.forEach(function (k) { var v = +cur[k[0]]; val[k[0]] = v >= k[2] && v <= k[3] ? v : k[4]; });
    // the same layout as Links' Text sizes: a labelled slider per size, then a sample that follows the sliders
    var SAMPLE = {
      info: [['tab', 'Notes'], ['head', 'Box Title'], ['text', 'Your notes, lists and links read like this.']],
      cards: [['title', 'Cards'], ['box', '₹1,24,000'], ['text', 'HDFC Regalia · Visa · due 12 Nov']]
    }[app] || [];
    openDlg('<h2 style="margin:0 0 16px">' + (here ? '' : esc(app.charAt(0).toUpperCase() + app.slice(1)) + ' ') + 'Text Sizes</h2>' +
      spec.map(function (k) {
        return '<div class="ix-tsf"><label for="ix-ts-' + k[0] + '">' + k[1] + '</label><div class="ix-tsr"><input type="range" id="ix-ts-' + k[0] + '" data-k="' + k[0] + '" min="' + k[2] + '" max="' + k[3] + '" step="1" value="' + val[k[0]] + '"><output>' + val[k[0]] + ' px</output></div></div>';
      }).join('') +
      '<div class="ix-tss ix-tss-' + app + '" aria-hidden="true">' + SAMPLE.map(function (x) { return '<div data-s="' + x[0] + '">' + esc(x[1]) + '</div>'; }).join('') + '</div>' +
      '<p class="ix-err" id="ix-tze"></p>' +
      '<div class="ix-acts"><button class="ix-btn" id="ix-tzr" style="margin-right:auto">Reset Sizes</button><button class="ix-btn" data-ix="close">Cancel</button><button class="ix-btn pri" id="ix-tzs">Save Sizes</button></div>');
    var saved = false;
    var sample = function () { D().querySelectorAll('[data-s]').forEach(function (el) { el.style.fontSize = val[el.dataset.s] + 'px'; }); };
    D().querySelectorAll('input[type=range]').forEach(function (r) {
      r.oninput = function () { val[r.dataset.k] = +r.value; r.nextElementSibling.textContent = r.value + ' px'; sample(); if (here) applySizes(null, val); };
    });
    sample();
    $('#ix-tzr').onclick = function () {
      spec.forEach(function (k) { val[k[0]] = k[4]; });
      D().querySelectorAll('input[type=range]').forEach(function (r) { r.value = val[r.dataset.k]; r.nextElementSibling.textContent = r.value + ' px'; });
      sample(); if (here) applySizes(null, {});
    };
    $('#ix-tzs').onclick = function () {
      var mine = {}; spec.forEach(function (k) { if (val[k[0]] !== k[4]) mine[k[0]] = val[k[0]]; });
      var all = JSON.parse(JSON.stringify(S.sizes || {})); if (Array.isArray(all)) all = {};
      if (Object.keys(mine).length) all[app] = mine; else delete all[app];
      var b = $('#ix-tzs'); b.disabled = true;
      api('settings', { settings: { sizes: all } }).then(function (j) {
        b.disabled = false;
        if (!j.ok) { $('#ix-tze').textContent = j.error || 'Could not save.'; return; }
        saved = true; S.sizes = j.state.sizes; remember(S); applySizes(); closeDlg(); toast('Text sizes saved.');
      }).catch(function () { b.disabled = false; $('#ix-tze').textContent = "Can't reach the server."; });
    };
    new MutationObserver(function (m, o) { if (!D().classList.contains('open') || !D().querySelector('#ix-tzs')) { o.disconnect(); if (!saved && here) applySizes(); } }).observe(D(), { attributes: true, childList: true });
  }
  /* Colors: one mode at a time (the site switches to it, so changes show live), grouped by what they paint. Empty = the built-in color. */
  var COLOR_GROUPS = [
    ['Menu Bar', 'The top bar, sidebar or dock, on every page.', [['bar', 'Background'], ['barText', 'Tabs and Icons']]],
    ['Page', 'What sits behind and around your content.', [['bg', 'Page Background'], ['box', 'Boxes and Cards'], ['panel', 'Menus and Dialogs'], ['line', 'Borders']]],
    ['Text', 'Headings, body text, and quieter labels and hints.', [['text', 'Text'], ['mute', 'Secondary Text']]]
  ];
  /* Presets: n = name, g = group, c = colors (left out = the built-in color), a = accent ('' = keep yours). */
  var PRESET_GROUPS = [['mine', 'My Presets'], ['site', 'Site Looks'], ['classic', 'Editor Classics'], ['modern', 'Modern'], ['vivid', 'Vivid'], ['neon', 'Neon'], ['soft', 'Soft'], ['pastel', 'Pastel'], ['earth', 'Earthy'], ['mono', 'Monochrome'], ['retro', 'Retro'], ['contrast', 'High Contrast'], ['spot', 'Spotlight']];
  var PRESETS = {
    dark: [
      { n: 'AMOLED', g: 'site', c: {  }, a: '' },
      { n: 'Soft Dark', g: 'site', c: { bg: '#1a1a1a', box: '#212121', panel: '#292929', line: '#363636', text: '#cdcdcd', mute: '#9a9a9a', bar: '#151515', barText: '#9a9a9a' }, a: '' },
      { n: 'Soft Warm', g: 'site', c: { bg: '#1f160d', box: '#2a1f13', panel: '#342718', line: '#463524', text: '#dccfb6', mute: '#a39478', bar: '#1a120a', barText: '#a39478' }, a: '' },
      { n: 'Midnight', g: 'site', c: { bg: '#0a0f1d', box: '#111a2d', panel: '#172238', line: '#24304a', text: '#e8edf7', mute: '#97a3bd', bar: '#0d1426', barText: '#97a3bd' }, a: '' },
      { n: 'Dracula', g: 'classic', c: { bg: '#21222c', box: '#282a36', panel: '#2f3241', line: '#44475a', text: '#f8f8f2', mute: '#a4abd6', bar: '#191a21', barText: '#a4abd6' }, a: '#bd93f9' },
      { n: 'Monokai', g: 'classic', c: { bg: '#272822', box: '#2f302a', panel: '#3e3d32', line: '#49483e', text: '#f8f8f2', mute: '#a8a48e', bar: '#1e1f1c', barText: '#a8a48e' }, a: '#a6e22e' },
      { n: 'Solarized', g: 'classic', c: { bg: '#002b36', box: '#073642', panel: '#0b3f4c', line: '#1e4d58', text: '#e4ddc8', mute: '#93a1a1', bar: '#00232c', barText: '#93a1a1' }, a: '#b58900' },
      { n: 'Gruvbox', g: 'classic', c: { bg: '#282828', box: '#32302f', panel: '#3c3836', line: '#504945', text: '#ebdbb2', mute: '#bdae93', bar: '#1d2021', barText: '#bdae93' }, a: '#fabd2f' },
      { n: 'One Dark', g: 'classic', c: { bg: '#21252b', box: '#282c34', panel: '#2c313a', line: '#3e4451', text: '#dcdfe4', mute: '#9da5b4', bar: '#1b1f24', barText: '#9da5b4' }, a: '#61afef' },
      { n: 'Nord', g: 'classic', c: { bg: '#2e3440', box: '#3b4252', panel: '#434c5e', line: '#4c566a', text: '#eceff4', mute: '#b3bccb', bar: '#272c36', barText: '#b3bccb' }, a: '#88c0d0' },
      { n: 'Material Palenight', g: 'classic', c: { bg: '#292d3e', box: '#2f3347', panel: '#34324a', line: '#444267', text: '#e0e4f2', mute: '#a6accd', bar: '#232635', barText: '#a6accd' }, a: '#c792ea' },
      { n: 'Tokyo Night', g: 'modern', c: { bg: '#1a1b26', box: '#1f2335', panel: '#24283b', line: '#2f3549', text: '#c0caf5', mute: '#9aa5ce', bar: '#16161e', barText: '#9aa5ce' }, a: '#7aa2f7' },
      { n: 'Catppuccin Mocha', g: 'modern', c: { bg: '#1e1e2e', box: '#252536', panel: '#313244', line: '#45475a', text: '#cdd6f4', mute: '#a6adc8', bar: '#181825', barText: '#a6adc8' }, a: '#cba6f7' },
      { n: 'GitHub Dark', g: 'modern', c: { bg: '#0d1117', box: '#161b22', panel: '#1c2128', line: '#30363d', text: '#e6edf3', mute: '#8d96a0', bar: '#010409', barText: '#8d96a0' }, a: '#4493f8' },
      { n: 'Rosé Pine', g: 'modern', c: { bg: '#191724', box: '#1f1d2e', panel: '#26233a', line: '#403d52', text: '#e0def4', mute: '#908caa', bar: '#16141f', barText: '#908caa' }, a: '#ebbcba' },
      { n: 'Kanagawa', g: 'modern', c: { bg: '#1f1f28', box: '#2a2a37', panel: '#363646', line: '#54546d', text: '#dcd7ba', mute: '#a6a69c', bar: '#16161d', barText: '#a6a69c' }, a: '#7e9cd8' },
      { n: 'Everforest', g: 'modern', c: { bg: '#272e33', box: '#2e383c', panel: '#374145', line: '#4f5b58', text: '#d3c6aa', mute: '#a5b0a4', bar: '#1e2326', barText: '#a5b0a4' }, a: '#a7c080' },
      { n: 'Ayu Mirage', g: 'modern', c: { bg: '#1f2430', box: '#242936', panel: '#2a3040', line: '#3a4152', text: '#cccac2', mute: '#9da3b0', bar: '#1a1f29', barText: '#9da3b0' }, a: '#ffcc66' },
      { n: 'Night Owl', g: 'modern', c: { bg: '#011627', box: '#0b2236', panel: '#102a44', line: '#1d3b53', text: '#d6deeb', mute: '#93a8bd', bar: '#010e1a', barText: '#93a8bd' }, a: '#7fdbca' },
      { n: 'Synthwave \'84', g: 'vivid', c: { bg: '#211d30', box: '#2a2139', panel: '#34294f', line: '#463465', text: '#f6f0ff', mute: '#bbb3d1', bar: '#191624', barText: '#bbb3d1' }, a: '#ff7edb' },
      { n: 'Cobalt2', g: 'vivid', c: { bg: '#15232d', box: '#193549', panel: '#1f4662', line: '#2c5b7e', text: '#ffffff', mute: '#a6c5dc', bar: '#122738', barText: '#a6c5dc' }, a: '#ffc600' },
      { n: 'Shades of Purple', g: 'vivid', c: { bg: '#1e1e3f', box: '#2d2b55', panel: '#35336a', line: '#4a4785', text: '#ffffff', mute: '#b8b5e8', bar: '#1a1a36', barText: '#b8b5e8' }, a: '#fad000' },
      { n: 'Horizon', g: 'vivid', c: { bg: '#1c1e26', box: '#232530', panel: '#2e303e', line: '#3a3d4d', text: '#e0e0e0', mute: '#a2a6c0', bar: '#16161c', barText: '#a2a6c0' }, a: '#e95678' },
      { n: 'Cyberpunk', g: 'neon', c: { bg:'#0d0221',box:'#1a0b3b',panel:'#240f4f',line:'#3d1f7a',text:'#f5f0ff',mute:'#b9a7e6',bar:'#08011a',barText:'#b9a7e6' }, a: '#00f0ff' },
      { n: 'Neon Pink', g: 'neon', c: { bg:'#14000d',box:'#200016',panel:'#2d0020',line:'#4d0a38',text:'#fff0f8',mute:'#e6a3c8',bar:'#0d0008',barText:'#e6a3c8' }, a: '#ff2d95' },
      { n: 'Electric Blue', g: 'neon', c: { bg:'#000b1a',box:'#001330',panel:'#001a40',line:'#0a3a80',text:'#eef5ff',mute:'#9dc1f2',bar:'#00060f',barText:'#9dc1f2' }, a: '#2d8cff' },
      { n: 'Matrix', g: 'neon', c: { bg:'#000a02',box:'#001a05',panel:'#002709',line:'#064d14',text:'#d9ffe3',mute:'#6fc986',bar:'#000601',barText:'#6fc986' }, a: '#00ff41' },
      { n: 'Volt', g: 'neon', c: { bg:'#0a0a0a',box:'#151515',panel:'#1e1e1e',line:'#3a3a3a',text:'#ffffff',mute:'#bdbdbd',bar:'#050505',barText:'#bdbdbd' }, a: '#faff00' },
      { n: 'Aurora', g: 'neon', c: { bg:'#02100f',box:'#06201e',panel:'#0a2c29',line:'#14504a',text:'#e8fffb',mute:'#8fd4c8',bar:'#010a09',barText:'#8fd4c8' }, a: '#2effc4' },
      { n: 'Laser Lime', g: 'neon', c: { bg:'#0a0f00',box:'#141c00',panel:'#1c2600',line:'#34450a',text:'#f6ffe0',mute:'#b8cc7a',bar:'#070b00',barText:'#b8cc7a' }, a: '#c6ff00' },
      { n: 'Sunset', g: 'vivid', c: { bg:'#1a0a0f',box:'#2a1018',panel:'#381520',line:'#5c2335',text:'#fff1ea',mute:'#e6a98f',bar:'#12060a',barText:'#e6a98f' }, a: '#ff6a3d' },
      { n: 'Ruby', g: 'vivid', c: { bg:'#150204',box:'#240508',panel:'#310a0e',line:'#5a141c',text:'#fff0f0',mute:'#e8a0a4',bar:'#0e0103',barText:'#e8a0a4' }, a: '#ff2a3d' },
      { n: 'Grape', g: 'vivid', c: { bg:'#12061f',box:'#1e0c33',panel:'#29114a',line:'#46206f',text:'#f6edff',mute:'#c3a5e8',bar:'#0c0414',barText:'#c3a5e8' }, a: '#b44cff' },
      { n: 'Tangerine', g: 'vivid', c: { bg:'#130800',box:'#221000',panel:'#2f1700',line:'#55300a',text:'#fff3e6',mute:'#e8b98a',bar:'#0c0500',barText:'#e8b98a' }, a: '#ff9100' },
      { n: 'Candy Night', g: 'vivid', c: { bg:'#160a1f',box:'#24112f',panel:'#311842',line:'#55296f',text:'#fff0fb',mute:'#e0aee6',bar:'#0f0616',barText:'#e0aee6' }, a: '#ff5ccf' },
      { n: 'Emerald', g: 'vivid', c: { bg:'#00140b',box:'#00230f',panel:'#003217',line:'#0a5a2e',text:'#e6fff0',mute:'#86d4a4',bar:'#000d07',barText:'#86d4a4' }, a: '#14e07a' },
      { n: 'Pure Contrast', g: 'contrast', c: { bg: '#000000', box: '#000000', panel: '#0a0a0a', line: '#6b6b6b', text: '#ffffff', mute: '#d0d0d0', bar: '#000000', barText: '#e6e6e6' }, a: '#ffd400' },
      { n: 'Night Contrast', g: 'contrast', c: { bg: '#000814', box: '#00101f', panel: '#001a33', line: '#4d6b8a', text: '#ffffff', mute: '#cfe0f1', bar: '#000814', barText: '#d6e6f5' }, a: '#00d1ff' },
      { n: 'Catppuccin Frappé', g: 'modern', c: { bg: '#303446', box: '#373b50', panel: '#414559', line: '#51576d', text: '#c6d0f5', mute: '#a5adce', bar: '#292c3c', barText: '#a5adce' }, a: '#ca9ee6' },
      { n: 'Rosé Pine Moon', g: 'modern', c: { bg: '#232136', box: '#2a273f', panel: '#393552', line: '#44415a', text: '#e0def4', mute: '#908caa', bar: '#1d1b2e', barText: '#908caa' }, a: '#ea9a97' },
      { n: 'Ayu Dark', g: 'modern', c: { bg: '#0b0e14', box: '#10141c', panel: '#151a23', line: '#232834', text: '#bfbdb6', mute: '#8a919c', bar: '#080a0f', barText: '#8a919c' }, a: '#e6b450' },
      { n: 'GitHub Dimmed', g: 'modern', c: { bg: '#22272e', box: '#2d333b', panel: '#373e47', line: '#444c56', text: '#adbac7', mute: '#8b98a6', bar: '#1c2128', barText: '#8b98a6' }, a: '#539bf5' },
      { n: 'Material Ocean', g: 'modern', c: { bg: '#0f111a', box: '#141722', panel: '#1a1c25', line: '#292d3e', text: '#c3cbe8', mute: '#8f93a2', bar: '#090b10', barText: '#8f93a2' }, a: '#82aaff' },
      { n: 'Poimandres', g: 'modern', c: { bg: '#1b1e28', box: '#222634', panel: '#2a2f3f', line: '#3a4157', text: '#e4f0fb', mute: '#a6accd', bar: '#171922', barText: '#a6accd' }, a: '#5de4c7' },
      { n: 'Moonlight', g: 'modern', c: { bg: '#212337', box: '#2a2d46', panel: '#32365a', line: '#444a73', text: '#c8d3f5', mute: '#9aa5ce', bar: '#1b1d2f', barText: '#9aa5ce' }, a: '#82aaff' },
      { n: 'Oxocarbon', g: 'modern', c: { bg: '#161616', box: '#1e1e1e', panel: '#262626', line: '#393939', text: '#f2f4f8', mute: '#b6b8bb', bar: '#101010', barText: '#b6b8bb' }, a: '#be95ff' },
      { n: 'Vesper', g: 'modern', c: { bg: '#101010', box: '#161616', panel: '#1c1c1c', line: '#2a2a2a', text: '#d8d8d8', mute: '#a0a0a0', bar: '#0a0a0a', barText: '#a0a0a0' }, a: '#ffc799' },
      { n: 'Darcula', g: 'classic', c: { bg: '#2b2b2b', box: '#313335', panel: '#3c3f41', line: '#4b4d4f', text: '#a9b7c6', mute: '#909ca8', bar: '#242424', barText: '#909ca8' }, a: '#cc7832' },
      { n: 'Zenburn', g: 'classic', c: { bg: '#3f3f3f', box: '#484848', panel: '#4f4f4f', line: '#5f5f5f', text: '#dcdccc', mute: '#bcbcac', bar: '#383838', barText: '#bcbcac' }, a: '#f0dfaf' },
      { n: 'Tomorrow Night', g: 'classic', c: { bg: '#1d1f21', box: '#282a2e', panel: '#303337', line: '#373b41', text: '#c5c8c6', mute: '#9a9d9c', bar: '#161718', barText: '#9a9d9c' }, a: '#81a2be' },
      { n: 'Oceanic Next', g: 'classic', c: { bg: '#1b2b34', box: '#223540', panel: '#2a3f4c', line: '#3b505c', text: '#d8dee9', mute: '#a7b2c0', bar: '#15222a', barText: '#a7b2c0' }, a: '#6699cc' },
      { n: 'Base16 Eighties', g: 'classic', c: { bg: '#2d2d2d', box: '#393939', panel: '#424242', line: '#515151', text: '#d3d0c8', mute: '#b0ada5', bar: '#232323', barText: '#b0ada5' }, a: '#6699cc' },
      { n: 'Graphite', g: 'mono', c: { bg: '#131416', box: '#1c1d1f', panel: '#242629', line: '#3a3d41', text: '#eff0f1', mute: '#b6b8b9', bar: '#0e0f10', barText: '#b6b8b9' }, a: '#7dd3fc' },
      { n: 'Smoke', g: 'mono', c: { bg: '#171717', box: '#202020', panel: '#292929', line: '#404040', text: '#f0f0f0', mute: '#b8b8b8', bar: '#121212', barText: '#b8b8b8' }, a: '#e5e5e5' },
      { n: 'Ink', g: 'mono', c: { bg: '#0c0e12', box: '#13161d', panel: '#1b1e28', line: '#2e3342', text: '#edeef3', mute: '#b2b5bd', bar: '#08090c', barText: '#b2b5bd' }, a: '#93c5fd' },
      { n: 'Espresso', g: 'earth', c: { bg: '#17110c', box: '#231913', panel: '#2e2219', line: '#4a382b', text: '#f4efeb', mute: '#c0b6af', bar: '#110c09', barText: '#c0b6af' }, a: '#e0a96d' },
      { n: 'Moss', g: 'earth', c: { bg: '#11170d', box: '#1a2213', panel: '#222e1a', line: '#38492c', text: '#eff4eb', mute: '#b6c0b0', bar: '#0c1009', barText: '#b6c0b0' }, a: '#a3c46b' },
      { n: 'Pine', g: 'earth', c: { bg: '#0b1611', box: '#11221b', panel: '#172d24', line: '#294a3c', text: '#ebf4f0', mute: '#aec1b9', bar: '#080f0c', barText: '#aec1b9' }, a: '#4fd1a0' },
      { n: 'Olive Grove', g: 'earth', c: { bg: '#15160d', box: '#1f2214', panel: '#2a2d1a', line: '#44482d', text: '#f2f4ec', mute: '#bdbfb0', bar: '#0f1009', barText: '#bdbfb0' }, a: '#c7c34f' },
      { n: 'Copper', g: 'earth', c: { bg: '#18100c', box: '#241811', panel: '#302017', line: '#4d3428', text: '#f4eeeb', mute: '#c2b4ae', bar: '#110b08', barText: '#c2b4ae' }, a: '#e07b39' },
      { n: 'Rust', g: 'earth', c: { bg: '#190e0b', box: '#251511', panel: '#311c16', line: '#4f2f27', text: '#f4edeb', mute: '#c2b1ad', bar: '#120a08', barText: '#c2b1ad' }, a: '#f0694a' },
      { n: 'Desert Night', g: 'earth', c: { bg: '#18150e', box: '#241e14', panel: '#2f281b', line: '#4b402d', text: '#f4f1eb', mute: '#c0bab0', bar: '#120f0a', barText: '#c0bab0' }, a: '#f2b84b' },
      { n: 'Deep Teal', g: 'modern', c: { bg: '#081616', box: '#0d2322', panel: '#12302f', line: '#214f4d', text: '#ebf4f4', mute: '#abc4c4', bar: '#060f0e', barText: '#abc4c4' }, a: '#2dd4bf' },
      { n: 'Lagoon', g: 'modern', c: { bg: '#081417', box: '#0c2024', panel: '#112c32', line: '#1f4951', text: '#ebf3f4', mute: '#a9c1c6', bar: '#050e0f', barText: '#a9c1c6' }, a: '#22d3ee' },
      { n: 'Abyss', g: 'modern', c: { bg: '#060f16', box: '#0a1924', panel: '#0e2331', line: '#1c3b52', text: '#ebf0f4', mute: '#a8bac7', bar: '#040a0e', barText: '#a8bac7' }, a: '#38bdf8' },
      { n: 'Indigo Night', g: 'modern', c: { bg: '#0b0a1a', box: '#110f27', panel: '#161434', line: '#272352', text: '#ecebf4', mute: '#adabc4', bar: '#080712', barText: '#adabc4' }, a: '#818cf8' },
      { n: 'Twilight', g: 'modern', c: { bg: '#110a19', box: '#1a1026', panel: '#231533', line: '#392451', text: '#efebf4', mute: '#b7acc4', bar: '#0c0712', barText: '#b7acc4' }, a: '#c084fc' },
      { n: 'Orchid', g: 'vivid', c: { bg: '#190b19', box: '#251125', panel: '#311631', line: '#4f274f', text: '#f4ebf4', mute: '#c2adc2', bar: '#120812', barText: '#c2adc2' }, a: '#e879f9' },
      { n: 'Wine', g: 'vivid', c: { bg: '#170a0d', box: '#231014', panel: '#30151b', line: '#4d262e', text: '#f4ebed', mute: '#c2adb1', bar: '#100709', barText: '#c2adb1' }, a: '#fb7185' },
      { n: 'Mulberry', g: 'vivid', c: { bg: '#180b13', box: '#24111c', panel: '#311726', line: '#4e283e', text: '#f4ebf0', mute: '#c2adb9', bar: '#11080e', barText: '#c2adb9' }, a: '#f472b6' },
      { n: 'Blueberry', g: 'vivid', c: { bg: '#080b19', box: '#0d1126', panel: '#111734', line: '#202853', text: '#ebedf4', mute: '#a9aec6', bar: '#060811', barText: '#a9aec6' }, a: '#60a5fa' },
      { n: 'Ultraviolet', g: 'vivid', c: { bg: '#1a0b2e', box: '#24113f', panel: '#2d1650', line: '#43246d', text: '#f6efff', mute: '#c9b6ea', bar: '#140824', barText: '#c9b6ea' }, a: '#ff4fd8' },   // 1.59
      { n: 'Cyber Lime', g: 'vivid', c: { bg: '#06180f', box: '#0b2318', panel: '#112f21', line: '#1d4834', text: '#ecfff4', mute: '#a3dcc0', bar: '#04120b', barText: '#a3dcc0' }, a: '#b6ff3b' },   // 1.59
      { n: 'Magma', g: 'vivid', c: { bg: '#200805', box: '#2c0e09', panel: '#39140d', line: '#552117', text: '#fff2ec', mute: '#f2bda9', bar: '#180604', barText: '#f2bda9' }, a: '#ff6a1f' },   // 1.59
      { n: 'Tropic Night', g: 'vivid', c: { bg: '#002a2b', box: '#003639', panel: '#004346', line: '#0f5e61', text: '#eafffe', mute: '#a6dcda', bar: '#001f20', barText: '#a6dcda' }, a: '#ffcc00' },   // 1.59
      { n: 'Royal Blue', g: 'vivid', c: { bg: '#0a1446', box: '#101c5b', panel: '#17256f', line: '#28388c', text: '#f0f3ff', mute: '#b8c1f2', bar: '#070f39', barText: '#b8c1f2' }, a: '#ffd23f' },   // 1.59
      { n: 'Berry Blast', g: 'vivid', c: { bg: '#2a0420', box: '#37072c', panel: '#440b37', line: '#62164f', text: '#ffeef8', mute: '#f2b4d9', bar: '#21031a', barText: '#f2b4d9' }, a: '#00e5ff' },   // 1.59
      { n: 'Jungle Neon', g: 'vivid', c: { bg: '#03200f', box: '#062c17', panel: '#0a381e', line: '#145230', text: '#ecfff2', mute: '#a5ddb9', bar: '#02190b', barText: '#a5ddb9' }, a: '#ff3d8b' },   // 1.59
      { n: 'Cobalt Flame', g: 'vivid', c: { bg: '#071a3a', box: '#0c244d', panel: '#122f60', line: '#1f4580', text: '#eef5ff', mute: '#aac4ec', bar: '#05132c', barText: '#aac4ec' }, a: '#ff7a1a' },   // 1.59
      { n: 'Terminal Green', g: 'retro', c: { bg: '#020b04', box: '#06140a', panel: '#0a1d0f', line: '#134a22', text: '#9dffb0', mute: '#5fc77a', bar: '#010603', barText: '#5fc77a' }, a: '#33ff66' },
      { n: 'Amber Terminal', g: 'retro', c: { bg: '#0d0700', box: '#1a0f00', panel: '#241500', line: '#4d3000', text: '#ffd58a', mute: '#d19a3a', bar: '#080500', barText: '#d19a3a' }, a: '#ffb000' },
      { n: 'Game Console', g: 'retro', c: { bg: '#0f380f', box: '#164a16', panel: '#1c5a1c', line: '#2d7a2d', text: '#d0f0a8', mute: '#9bc36a', bar: '#0a2a0a', barText: '#9bc36a' }, a: '#c4f06a' },
      { n: 'Vaporwave', g: 'retro', c: { bg: '#1a0b2e', box: '#251042', panel: '#301659', line: '#4a2682', text: '#ffe9ff', mute: '#d4a8f0', bar: '#12061f', barText: '#d4a8f0' }, a: '#ff71ce' },
      { n: 'Arcade', g: 'retro', c: { bg: '#0b0b1f', box: '#14143a', panel: '#1c1c52', line: '#33337a', text: '#f0f0ff', mute: '#a8a8e8', bar: '#07071a', barText: '#a8a8e8' }, a: '#05ffa1' },
      { n: 'Retro Blue', g: 'retro', c: { bg: '#1c1a52', box: '#25236b', panel: '#2e2c82', line: '#4543a8', text: '#d6d4ff', mute: '#a9a7f0', bar: '#14123c', barText: '#a9a7f0' }, a: '#9d99ff' },
      { n: 'Amber Contrast', g: 'contrast', c: { bg: '#000000', box: '#000000', panel: '#0a0a0a', line: '#8a6d00', text: '#ffffff', mute: '#ffe9a0', bar: '#000000', barText: '#ffe9a0' }, a: '#ffb000' },
      { n: 'Green Contrast', g: 'contrast', c: { bg: '#000000', box: '#000000', panel: '#0a0a0a', line: '#1f8a3a', text: '#ffffff', mute: '#b9f5c8', bar: '#000000', barText: '#b9f5c8' }, a: '#3dff7a' },
      { n: 'Dusk Pastel', g: 'pastel', c: { bg: '#1a1627', box: '#221c33', panel: '#2a233e', line: '#3e3559', text: '#eeebf4', mute: '#b4b0c0', bar: '#161221', barText: '#b4b0c0' }, a: '#b8c0ff' },
      { n: 'Cotton Night', g: 'pastel', c: { bg: '#25181f', box: '#301f28', panel: '#3b2630', line: '#563947', text: '#f3ecf0', mute: '#beb1b8', bar: '#1f141a', barText: '#beb1b8' }, a: '#ffc8dd' },
      { n: 'Mint Night', g: 'pastel', c: { bg: '#16221e', box: '#1d2d28', panel: '#243831', line: '#375249', text: '#ecf3f1', mute: '#b1beba', bar: '#121c19', barText: '#b1beba' }, a: '#b5ead7' },
      { n: 'Peach Night', g: 'pastel', c: { bg: '#261c17', box: '#31241e', panel: '#3c2d25', line: '#574238', text: '#f3eeec', mute: '#beb5b1', bar: '#201713', barText: '#beb5b1' }, a: '#ffcba4' },
      { n: 'Spotlight Ember', g: 'spot', c: { bg: '#0f0703', box: '#180c07', panel: '#22120b', line: '#3f2418', text: '#f8f3f1', mute: '#c6b2a9', bar: '#0b0502', barText: '#c6b2a9' }, a: '#ff6a3d' },
      { n: 'Spotlight Lime', g: 'spot', c: { bg: '#0b0f03', box: '#131807', panel: '#1c220b', line: '#333f18', text: '#f6f8f1', mute: '#bdc6a9', bar: '#080b02', barText: '#bdc6a9' }, a: '#b6f23a' },
      { n: 'Spotlight Sky', g: 'spot', c: { bg: '#03090f', box: '#071018', panel: '#0b1822', line: '#182d3f', text: '#f1f5f8', mute: '#a9b9c6', bar: '#02070b', barText: '#a9b9c6' }, a: '#38bdf8' },
      { n: 'Spotlight Violet', g: 'spot', c: { bg: '#07030f', box: '#0c0718', panel: '#120b22', line: '#24183f', text: '#f3f1f8', mute: '#b2a9c6', bar: '#05020b', barText: '#b2a9c6' }, a: '#a78bfa' },
      { n: 'Spotlight Pink', g: 'spot', c: { bg: '#0f030a', box: '#180712', panel: '#220b1a', line: '#3f1831', text: '#f8f1f6', mute: '#c6a9bb', bar: '#0b0207', barText: '#c6a9bb' }, a: '#f472b6' },
      { n: 'Spotlight Gold', g: 'spot', c: { bg: '#0f0b03', box: '#181307', panel: '#221c0b', line: '#3f3318', text: '#f8f6f1', mute: '#c6bda9', bar: '#0b0802', barText: '#c6bda9' }, a: '#fbbf24' }],
    light: [
      { n: 'Paper', g: 'site', c: {  }, a: '' },
      { n: 'Solarized Light', g: 'classic', c: { bg: '#fdf6e3', box: '#fffaf0', panel: '#fffaf0', line: '#e6dfc8', text: '#253f46', mute: '#56696f', bar: '#eee8d5', barText: '#4e6167' }, a: '#268bd2' },
      { n: 'Gruvbox Light', g: 'classic', c: { bg: '#fbf1c7', box: '#fdf6d8', panel: '#fffaeb', line: '#d5c4a1', text: '#3c3836', mute: '#665c54', bar: '#ebdbb2', barText: '#665c54' }, a: '#b57614' },
      { n: 'One Light', g: 'classic', c: { bg: '#f0f0f1', box: '#fafafa', panel: '#ffffff', line: '#dbdbdc', text: '#383a42', mute: '#696c77', bar: '#e5e5e6', barText: '#5a5d68' }, a: '#4078f2' },
      { n: 'Nord Snow', g: 'classic', c: { bg: '#eceff4', box: '#f8f9fb', panel: '#ffffff', line: '#d8dee9', text: '#2e3440', mute: '#4c566a', bar: '#e5e9f0', barText: '#4c566a' }, a: '#5e81ac' },
      { n: 'GitHub Light', g: 'modern', c: { bg: '#f6f8fa', box: '#ffffff', panel: '#ffffff', line: '#d0d7de', text: '#1f2328', mute: '#59636e', bar: '#ffffff', barText: '#59636e' }, a: '#0969da' },
      { n: 'Catppuccin Latte', g: 'modern', c: { bg: '#eff1f5', box: '#fafbfc', panel: '#ffffff', line: '#ccd0da', text: '#4c4f69', mute: '#62657b', bar: '#e6e9ef', barText: '#5c5f77' }, a: '#8839ef' },
      { n: 'Rosé Pine Dawn', g: 'modern', c: { bg: '#faf4ed', box: '#fffaf3', panel: '#fffaf3', line: '#dfdad9', text: '#575279', mute: '#6a6687', bar: '#f2e9e1', barText: '#615d7f' }, a: '#d7827e' },
      { n: 'Tokyo Night Day', g: 'modern', c: { bg: '#e1e2e7', box: '#eceef3', panel: '#f4f5f8', line: '#c4c8da', text: '#33395a', mute: '#525a85', bar: '#d6d9e4', barText: '#484f7a' }, a: '#2e7de9' },
      { n: 'Ayu Light', g: 'modern', c: { bg: '#f8f9fa', box: '#ffffff', panel: '#ffffff', line: '#e3e5e8', text: '#4a4f55', mute: '#62686e', bar: '#f0f1f3', barText: '#5c6268' }, a: '#fa8d3e' },
      { n: 'Everforest Light', g: 'modern', c: { bg: '#fdf6e3', box: '#fffbef', panel: '#fffbef', line: '#e6e2cc', text: '#4d5b62', mute: '#5d6b65', bar: '#f4f0d9', barText: '#56645e' }, a: '#8da101' },
      { n: 'Kanagawa Lotus', g: 'modern', c: { bg: '#f2ecbc', box: '#f8f3d4', panel: '#fbf7e0', line: '#d5cea3', text: '#43436c', mute: '#5f5f72', bar: '#e7dba0', barText: '#4d4d63' }, a: '#4d699b' },
      { n: 'Peach', g: 'soft', c: { bg: '#fdf1ec', box: '#ffffff', panel: '#ffffff', line: '#f2dcd2', text: '#3a2a24', mute: '#6f5a51', bar: '#f8e4db', barText: '#6a554c' }, a: '#f0784a' },
      { n: 'Bubblegum', g: 'vivid', c: { bg:'#fff0f7',box:'#ffffff',panel:'#ffffff',line:'#ffc9e3',text:'#3a0a24',mute:'#8a4468',bar:'#ffe0ef',barText:'#7a3a5c' }, a: '#ff2d95' },
      { n: 'Citrus', g: 'vivid', c: { bg:'#fffbe6',box:'#ffffff',panel:'#ffffff',line:'#ffe58a',text:'#2e2500',mute:'#7a6a10',bar:'#fff2b3',barText:'#6b5c0d' }, a: '#ff9100' },
      { n: 'Tropical', g: 'vivid', c: { bg:'#e8fff7',box:'#ffffff',panel:'#ffffff',line:'#a8f0d4',text:'#002e22',mute:'#2d7a62',bar:'#c9fae8',barText:'#266b55' }, a: '#00c389' },
      { n: 'Coral Reef', g: 'vivid', c: { bg:'#fff1ee',box:'#ffffff',panel:'#ffffff',line:'#ffd0c7',text:'#3a1410',mute:'#8a4a40',bar:'#ffe0da',barText:'#7a4036' }, a: '#ff4d4d' },
      { n: 'Electric Lilac', g: 'vivid', c: { bg:'#f3ecff',box:'#ffffff',panel:'#ffffff',line:'#dcc8ff',text:'#240a45',mute:'#6a4a99',bar:'#e9dcff',barText:'#5f4390' }, a: '#8a2be2' },
      { n: 'Sunny Day', g: 'vivid', c: { bg:'#fffde7',box:'#ffffff',panel:'#ffffff',line:'#fff0a0',text:'#2a2400',mute:'#756a12',bar:'#fff7c2',barText:'#665c0f' }, a: '#f5a800' },
      { n: 'Sky Pop', g: 'vivid', c: { bg:'#e6f6ff',box:'#ffffff',panel:'#ffffff',line:'#b3e0ff',text:'#00233a',mute:'#2f6a92',bar:'#d2eeff',barText:'#2a5f85' }, a: '#0091ff' },
      { n: 'Fresh Lime', g: 'vivid', c: { bg:'#f4ffe0',box:'#ffffff',panel:'#ffffff',line:'#d6f59a',text:'#1a2b00',mute:'#527a12',bar:'#e8fbbd',barText:'#496d10' }, a: '#6cc800' },
      { n: 'Sunburst', g: 'vivid', c: { bg: '#fff1bd', box: '#fff9e8', panel: '#ffffff', line: '#f0d06d', text: '#2b1d00', mute: '#5f4a00', bar: '#ffe27f', barText: '#3d2c00' }, a: '#c24a00' },   // 1.59
      { n: 'Flamingo', g: 'vivid', c: { bg: '#ffdcea', box: '#fff2f7', panel: '#ffffff', line: '#f2a9c6', text: '#3a0a1f', mute: '#7e2a4a', bar: '#ffc2da', barText: '#4f1129' }, a: '#c80f55' },   // 1.59
      { n: 'Aqua Pop', g: 'vivid', c: { bg: '#d2f6ff', box: '#effcff', panel: '#ffffff', line: '#90d9ec', text: '#002a35', mute: '#1d5a6a', bar: '#afeeff', barText: '#00384a' }, a: '#0068b8' },   // 1.59
      { n: 'Lime Soda', g: 'vivid', c: { bg: '#e3ffcc', box: '#f4ffea', panel: '#ffffff', line: '#afe383', text: '#0f2900', mute: '#375c14', bar: '#cdf7a6', barText: '#1a3d00' }, a: '#2a8a00' },   // 1.59
      { n: 'Grape Soda', g: 'vivid', c: { bg: '#eadcff', box: '#f7f1ff', panel: '#ffffff', line: '#c5a9f3', text: '#1e0a3f', mute: '#53368a', bar: '#d9c5ff', barText: '#2e1460' }, a: '#6d22e0' },   // 1.59
      { n: 'Tangerine', g: 'vivid', c: { bg: '#ffdfc7', box: '#fff3e8', panel: '#ffffff', line: '#f4b98a', text: '#331300', mute: '#723a0f', bar: '#ffcca3', barText: '#4a1d00' }, a: '#c44d00' },   // 1.59
      { n: 'Neon Day', g: 'neon', c: { bg:'#ffffff',box:'#ffffff',panel:'#ffffff',line:'#e0e0e0',text:'#10002b',mute:'#4a3a70',bar:'#f5f0ff',barText:'#4a3a70' }, a: '#e100ff' },
      { n: 'Electric Cyan', g: 'neon', c: { bg:'#effcff',box:'#ffffff',panel:'#ffffff',line:'#a8ecfa',text:'#002933',mute:'#1f6a7d',bar:'#d4f7ff',barText:'#1c5f70' }, a: '#00b8d9' },
      { n: 'High Contrast', g: 'contrast', c: { bg: '#ffffff', box: '#ffffff', panel: '#ffffff', line: '#575757', text: '#000000', mute: '#2b2b2b', bar: '#ffffff', barText: '#1a1a1a' }, a: '#0050c8' },
      { n: 'Catppuccin Frappé Light', g: 'modern', c: { bg: '#e6e9ef', box: '#f5f6f9', panel: '#ffffff', line: '#c9cdd9', text: '#4c4f69', mute: '#5c5f77', bar: '#dce0e8', barText: '#5c5f77' }, a: '#687ffd' },
      { n: 'Tomorrow Light', g: 'classic', c: { bg: '#f7f7f6', box: '#ffffff', panel: '#ffffff', line: '#dcdcda', text: '#4d4d4c', mute: '#6a6a68', bar: '#ebebe9', barText: '#62625f' }, a: '#4778b9' },
      { n: 'Newsprint', g: 'classic', c: { bg: '#f2efe8', box: '#faf8f3', panel: '#fdfcf9', line: '#d9d4c7', text: '#1f1d19', mute: '#5e594e', bar: '#e8e4d8', barText: '#575246' }, a: '#c1590a' },
      { n: 'Sepia', g: 'classic', c: { bg: '#f4ecd8', box: '#faf3e1', panel: '#fdf8ea', line: '#dccfb0', text: '#433422', mute: '#6b5a41', bar: '#ebe1c8', barText: '#625239' }, a: '#a7692c' },
      { n: 'GitHub Soft', g: 'modern', c: { bg: '#f6f8fa', box: '#ffffff', panel: '#ffffff', line: '#d8dee4', text: '#24292f', mute: '#57606a', bar: '#eaeef2', barText: '#57606a' }, a: '#1c8a3c' },
      { n: 'Ash', g: 'mono', c: { bg: '#eeeeee', box: '#ffffff', panel: '#ffffff', line: '#d6d6d6', text: '#1a1a1a', mute: '#5c5c5c', bar: '#e7e7e7', barText: '#575757' }, a: '#777777' },
      { n: 'Concrete', g: 'mono', c: { bg: '#ececeb', box: '#ffffff', panel: '#ffffff', line: '#d5d4d3', text: '#1b1a18', mute: '#5d5c5b', bar: '#e5e4e3', barText: '#585756' }, a: '#cf7106' },
      { n: 'Linen', g: 'earth', c: { bg: '#f6f3ee', box: '#ffffff', panel: '#ffffff', line: '#e2dcd2', text: '#221c11', mute: '#685f4f', bar: '#f1ece4', barText: '#625a4b' }, a: '#d4470d' },
      { n: 'Oat', g: 'earth', c: { bg: '#f3f1ec', box: '#ffffff', panel: '#ffffff', line: '#dedad1', text: '#221d11', mute: '#656052', bar: '#eeeae2', barText: '#605a4e' }, a: '#b1810b' },
      { n: 'Sage', g: 'earth', c: { bg: '#f0f3ef', box: '#ffffff', panel: '#ffffff', line: '#d6ddd5', text: '#161f14', mute: '#586156', bar: '#e7ece6', barText: '#535c51' }, a: '#5b9847' },
      { n: 'Olive Light', g: 'earth', c: { bg: '#f2f3ec', box: '#ffffff', panel: '#ffffff', line: '#dcded1', text: '#1f2211', mute: '#626553', bar: '#ecede3', barText: '#5d5f4e' }, a: '#81911a' },
      { n: 'Latte Cream', g: 'earth', c: { bg: '#f7f4f0', box: '#ffffff', panel: '#ffffff', line: '#e2dbd5', text: '#221a11', mute: '#665c51', bar: '#f1ece7', barText: '#61574d' }, a: '#a8683c' },
      { n: 'Pastel Blue', g: 'pastel', c: { bg: '#eff4f8', box: '#ffffff', panel: '#ffffff', line: '#d1dbe6', text: '#111922', mute: '#4b5c6c', bar: '#e4ecf4', barText: '#475766' }, a: '#418be1' },
      { n: 'Pastel Green', g: 'pastel', c: { bg: '#edf8f1', box: '#ffffff', panel: '#ffffff', line: '#cfe5d8', text: '#112218', mute: '#4b6c59', bar: '#e2f3e9', barText: '#476654' }, a: '#369a6d' },
      { n: 'Seafoam', g: 'pastel', c: { bg: '#edf7f6', box: '#ffffff', panel: '#ffffff', line: '#d0e4e1', text: '#11221f', mute: '#4d6b66', bar: '#e3f2f0', barText: '#486560' }, a: '#1a9a88' },
      { n: 'Ocean Light', g: 'modern', c: { bg: '#edf4f8', box: '#ffffff', panel: '#ffffff', line: '#cfdee5', text: '#111c22', mute: '#4b616c', bar: '#e2edf3', barText: '#475c66' }, a: '#0891b2' },
      { n: 'Lilac Mist', g: 'modern', c: { bg: '#f1eef6', box: '#ffffff', panel: '#ffffff', line: '#d8d2e2', text: '#171122', mute: '#584f68', bar: '#e9e4f1', barText: '#544b62' }, a: '#7d5df0' },
      { n: 'Rose Quartz', g: 'modern', c: { bg: '#f8f0f2', box: '#ffffff', panel: '#ffffff', line: '#e4d2d7', text: '#221115', mute: '#6a4e55', bar: '#f3e5e9', barText: '#644a50' }, a: '#d6487a' },
      { n: 'Retro Paper', g: 'retro', c: { bg: '#f5e6c8', box: '#fbf0da', panel: '#fdf6e6', line: '#d9c294', text: '#3b2a14', mute: '#6a5330', bar: '#ecd9b0', barText: '#5e4a2a' }, a: '#d4470d' },
      { n: 'Old Terminal Light', g: 'retro', c: { bg: '#e8f5e9', box: '#f3fbf4', panel: '#ffffff', line: '#b8dcbc', text: '#0b3d12', mute: '#2f6b3a', bar: '#d4ecd7', barText: '#2a5f34' }, a: '#1b9e3a' },
      { n: 'Blue Contrast', g: 'contrast', c: { bg: '#ffffff', box: '#ffffff', panel: '#ffffff', line: '#4a4a4a', text: '#000000', mute: '#262626', bar: '#ffffff', barText: '#111111' }, a: '#0e6fff' },
      { n: 'Warm Contrast', g: 'contrast', c: { bg: '#fffdf5', box: '#ffffff', panel: '#ffffff', line: '#5c4a00', text: '#000000', mute: '#2e2500', bar: '#fffdf5', barText: '#1a1500' }, a: '#a46b00' },
      { n: 'Spotlight Ember', g: 'spot', c: { bg: '#fceee8', box: '#ffffff', panel: '#f9e5dc', line: '#e3c3b5', text: '#22120b', mute: '#624b41', bar: '#fbe4da', barText: '#624b41' }, a: '#d9441a' },
      { n: 'Spotlight Lime', g: 'spot', c: { bg: '#f6fce8', box: '#ffffff', panel: '#f0f9dc', line: '#d5e3b5', text: '#1c220b', mute: '#586241', bar: '#f1fbda', barText: '#586241' }, a: '#4d7c0f' },
      { n: 'Spotlight Sky', g: 'spot', c: { bg: '#e8f3fc', box: '#ffffff', panel: '#dcecf9', line: '#b5cee3', text: '#0b1822', mute: '#415362', bar: '#daecfb', barText: '#415362' }, a: '#0369a1' },
      { n: 'Spotlight Violet', g: 'spot', c: { bg: '#eee8fc', box: '#ffffff', panel: '#e5dcf9', line: '#c3b5e3', text: '#120b22', mute: '#4b4162', bar: '#e4dafb', barText: '#4b4162' }, a: '#6d28d9' },
      { n: 'Spotlight Pink', g: 'spot', c: { bg: '#fce8f5', box: '#ffffff', panel: '#f9dcee', line: '#e3b5d2', text: '#220b1a', mute: '#624156', bar: '#fbdaef', barText: '#624156' }, a: '#be185d' },
      { n: 'Spotlight Gold', g: 'spot', c: { bg: '#fcf6e8', box: '#ffffff', panel: '#f9f0dc', line: '#e3d5b5', text: '#221c0b', mute: '#625841', bar: '#fbf1da', barText: '#625841' }, a: '#b45309' }]
  };
  var lsGet = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var lsSet = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var presetAccent = lsGet('ix-pacc') !== '0', presetGroup = lsGet('ix-pgroup') || 'all';   // remembered in this browser
  var colorMode = '', pgSel = 'home';
  /* the preset gallery: group chips (remembered), then the presets of that group, or all of them under headings */
  /* the looks you saved (kept with your settings, so they are in every backup) are listed with the built-in ones */
  function presetList(m) {
    return PRESETS[m].concat((S.myPresets || []).map(function (mp) { return { n: mp.n, g: 'mine', c: Array.isArray(mp[m]) ? {} : JSON.parse(JSON.stringify(mp[m] || {})), a: mp.a || '' }; }));
  }
  function saveMine(list) {
    return api('settings', { settings: { myPresets: list } }).then(function (j) {
      if (!j.ok || !j.state) throw new Error(j.error || 'Could not save.');
      S.myPresets = j.state.myPresets || []; return S.myPresets;
    });
  }
  function presetsHtml(m, set, def) {
    var list = presetList(m), acc0 = draft.accent || S.accent || '#ffc21a';
    var same = function (a, b) { var ka = Object.keys(a).filter(function (k) { return a[k]; }).sort(), kb = Object.keys(b).filter(function (k) { return b[k]; }).sort();
      return ka.join() === kb.join() && ka.every(function (k) { return String(a[k]).toLowerCase() === String(b[k]).toLowerCase(); }); };
    var isOn = function (pr) { return same(pr.c, set) && (!presetAccent || !pr.a || pr.a === draft.accent); };
    var current = list.filter(isOn)[0];
    var groups = PRESET_GROUPS.filter(function (g) { return list.some(function (pr) { return pr.g === g[0]; }); });
    // the remembered group, or All when this mode has none of it (the choice is kept for the other mode)
    var grp = presetGroup !== 'all' && groups.some(function (g) { return g[0] === presetGroup; }) ? presetGroup : 'all';
    var card = function (pr) {
      var i = list.indexOf(pr), c = Object.assign({}, def, pr.c), acc = presetAccent && pr.a ? pr.a : acc0;
      return '<button type="button" class="ix-preset" data-pre="' + i + '" data-g="' + pr.g + '" data-name="' + esc(pr.n.toLowerCase()) + '" aria-pressed="' + isOn(pr) + '" title="' + esc(pr.n) + (pr.a ? ' (accent ' + pr.a + ')' : '') + '">' +
        miniPage(c, acc) + '<span class="ix-pn">' + esc(pr.n) + '</span><small class="ix-pgl">' + esc((PRESET_GROUPS.filter(function (g) { return g[0] === pr.g; })[0] || ['', ''])[1]) + '</small></button>';
    };
    var body = groups.map(function (g) { return '<span class="ix-psep" data-g="' + g[0] + '">' + g[1] + '</span>' + list.filter(function (pr) { return pr.g === g[0]; }).map(card).join(''); }).join('');
    return '<details class="ix-acc" id="ix-presets"' + '' + '><summary><span>Presets</span><small>' + (current ? 'Now: ' + esc(current.n) : Object.keys(set).length ? 'Now: Your Own Mix' : 'Now: Built-In') + ' · ' + list.length + ' looks for ' + (m === 'dark' ? 'dark' : 'light') + ' mode</small></summary><div class="ix-accb">' +
      '<p>One click fills the whole mode; fine-tune any color in the Colors tab afterwards.</p>' +
      '<label class="ix-tg" style="margin:0 0 10px"><span>Use the Preset\'s Accent Color<small>Presets like Dracula or Nord bring their own accent. Off keeps yours.</small></span><input type="checkbox" id="ix-pacc"' + (presetAccent ? ' checked' : '') + '></label>' +
      '<div class="ix-sur" id="ix-sur" aria-live="polite"><div class="ix-surpv" id="ix-surpv"></div><div class="ix-surt"><h4>Surprise Me</h4><h3 id="ix-surn">A New Mix</h3>' +
        '<p>A colour mix made just now for ' + (m === 'dark' ? 'dark' : 'light') + ' mode, checked to be easy to read. Not one of the presets.</p>' +
        '<div class="ix-row"><button type="button" class="ix-btn pri" id="ix-sura">' + svg(ICON.sparkle) + 'Another One</button><button type="button" class="ix-btn" id="ix-suru">Use It</button><button type="button" class="ix-btn" id="ix-surs">Save to My Presets</button></div>' +
        '<div class="ix-surw" id="ix-surw" hidden><span class="ix-spin" aria-hidden="true"><i></i><i></i><i></i></span><small>Mixing…</small></div></div></div>' +
      '<div class="ix-ptools"><input type="search" id="ix-psearch" class="ix-psearch" placeholder="Search ' + list.length + ' Presets" aria-label="Search Presets" autocomplete="off" spellcheck="false"></div>' +
      '<details class="ix-more ix-mypre" id="ix-mypre"' + ((S.myPresets || []).length ? ' open' : '') + '><summary>My Presets: Save, Share, Delete</summary>' +
        '<p>Save the colors and accent you have now (both dark and light) as a preset of your own. It appears under My Presets and is kept in your backups.</p>' +
        '<div class="ix-row"><input type="text" id="ix-mpn" maxlength="30" placeholder="Name This Look" aria-label="Name for this look" style="flex:1;min-width:180px"><button type="button" class="ix-btn pri" id="ix-mps">Save Current Look</button></div>' +
        ((S.myPresets || []).length ? '<div class="ix-devs" style="margin-top:12px">' + S.myPresets.map(function (mp, i) { return '<div class="ix-dev"><span class="ix-dev-i" style="background:' + esc(mp.a || '#888') + '"></span><div class="ix-dev-b"><b>' + esc(mp.n) + '</b></div><button type="button" class="ix-btn danger" data-hold title="Hold to delete" data-mpd="' + i + '">Delete</button></div>'; }).join('') + '</div>' : '') +
        '<div class="ix-row" style="margin-top:12px"><button type="button" class="ix-btn" id="ix-mpx">' + svg(ICON.down) + 'Export My Presets</button><label class="ix-btn" for="ix-mpf">' + svg(ICON.upload) + 'Import Presets</label><input type="file" id="ix-mpf" accept=".json,application/json" hidden></div>' +
        '<p class="ix-err" id="ix-mpe"></p></details>' +
      '<div class="ix-pfilt" role="group" aria-label="Preset Groups"><button type="button" data-pg-f="all" aria-pressed="' + (grp === 'all') + '">All <small>' + list.length + '</small></button>' +
        groups.map(function (g) { var n = list.filter(function (pr) { return pr.g === g[0]; }).length; return '<button type="button" data-pg-f="' + g[0] + '" aria-pressed="' + (grp === g[0]) + '">' + g[1] + ' <small>' + n + '</small></button>'; }).join('') + '</div>' +
      '<div class="ix-pcount" id="ix-pcount" aria-live="polite"></div>' +
      '<div class="ix-presets" id="ix-pgrid" data-grp="' + grp + '">' + body + '</div><p class="ix-note ix-pnone" id="ix-pnone" hidden>No preset matches that name. Try a color or a style, like "blue", "mint" or "terminal".</p></div></details>';
  }
  function pColors(p) {
    var cur = draft.colors = draft.colors || {};
    ['dark', 'light', 'pg'].forEach(function (m) { if (!cur[m] || Array.isArray(cur[m])) cur[m] = {}; });   // PHP sends an empty set as []
    PG_APPS.forEach(function (a) { if (!cur.pg[a[0]] || Array.isArray(cur.pg[a[0]])) cur.pg[a[0]] = {}; });
    var m = colorMode || (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'); colorMode = m;
    var set = cur[m], def = COLOR_DEFAULT[m];
    var anyPg = PG_APPS.some(function (a) { return cur.pg[a[0]][m]; }) || Object.keys(draft.accentPg || {}).length > 0;
    var pgs = [['home', 'Start Page']].concat(PG_APPS);
    var own = function (id) { return !!((cur.pg[id] && cur.pg[id][m]) || (draft.accentPg || {})[id]); };
    if (!pgs.some(function (a) { return a[0] === pgSel; })) pgSel = 'home';
    var pgBg = pgSel === 'home' ? '' : cur.pg[pgSel][m], pgAc = (draft.accentPg || {})[pgSel];
    var row = function (k, label, val, shown, attrs) {
      val = /^#[0-9a-f]{6}$/i.test(String(val || '')) ? String(val) : ''; shown = /^#[0-9a-f]{6}$/i.test(String(shown || '')) ? String(shown) : '#000000';   // only a real colour code reaches the page
      return '<div class="ix-cr"><span>' + esc(label) + '</span><input type="color" ' + attrs + ' value="' + esc(shown) + '" aria-label="' + esc(label) + '">' +
        '<input type="text" class="ix-hex" maxlength="7" placeholder="' + esc(shown) + '" value="' + esc(val) + '" spellcheck="false" aria-label="' + esc(label) + ', hex code">' +
        '<button type="button" class="ix-ib ix-crx" title="Back to the Default"' + (val ? '' : ' hidden') + ' aria-label="Reset ' + esc(label) + '">↺</button></div>';
    };
    p.innerHTML = '<div class="ix-row" style="gap:10px">' + seg('cmode', [['dark', 'Dark Mode'], ['light', 'Light Mode']], m) +
      '<button type="button" class="ix-btn" id="ix-cres">Reset ' + (m === 'dark' ? 'Dark' : 'Light') + ' Mode</button></div>' +
      '<p class="ix-note" style="margin:0 0 12px">Ready-made looks live in the <b>Presets</b> tab.</p>' + accentHtml() +
      COLOR_GROUPS.map(function (g) {
        return '<div class="ix-cgrp"><h4>' + g[0] + '</h4><p>' + g[1] + '</p>' + g[2].map(function (k) {
          return row(k[0], k[1], set[k[0]], set[k[0]] || def[k[0]], 'data-k="' + k[0] + '"');
        }).join('') + '</div>';
      }).join('') +
      '<div class="ix-cgrp ix-pgc" id="ix-pgc"><h4>Different Colors per Page</h4><p>' + (anyPg ? 'The dot marks pages with colors of their own.' : 'Every page uses the colors above. Pick a page to give it its own.') + '</p>' +
        seg('pgsel', pgs.map(function (a) { return [a[0], esc(a[1]) + (own(a[0]) ? '<i class="ix-pgdot" aria-label="has its own colors"></i>' : '')]; }), pgSel) +
        '<div class="ix-pgrows">' +
          (pgSel === 'home' ? '' : row('', 'Background', pgBg, pgBg || set.bg || def.bg, 'data-pg="' + pgSel + '"')) +
          row('', 'Accent', pgAc, pgAc || draft.accent || '#ffc21a', 'data-ap="' + pgSel + '"') +
        '</div></div>' +
      '<p class="ix-note">Tab colors: the pencil on each tab.</p>';
    bindSeg(p, function (k, v) { if (k === 'cmode') { colorMode = v; K.previewTheme(v); pColors(p); } else if (k === 'pgsel') { pgSel = v; pColors(p); } });
    p.querySelectorAll('.ix-cr').forEach(function (r) {
      var sw = r.querySelector('input[type=color]'), tx = r.querySelector('.ix-hex'), x = r.querySelector('.ix-crx');
      var put = function (v) {
        if (sw.dataset.ap) { draft.accentPg = draft.accentPg || {}; if (v) draft.accentPg[sw.dataset.ap] = v; else delete draft.accentPg[sw.dataset.ap]; }
        else if (sw.dataset.pg) { if (v) cur.pg[sw.dataset.pg][m] = v; else delete cur.pg[sw.dataset.pg][m]; }
        else { if (v) set[sw.dataset.k] = v; else delete set[sw.dataset.k]; }
        x.hidden = !v; preview(); if (sw.dataset.pg || sw.dataset.ap) { var d = p.querySelector('[data-seg=pgsel] [aria-pressed=true]'); if (d) { var had = d.querySelector('.ix-pgdot'), id = sw.dataset.pg || sw.dataset.ap; if (own(id) && !had) d.insertAdjacentHTML('beforeend', '<i class="ix-pgdot" aria-label="has its own colors"></i>'); else if (!own(id) && had) had.remove(); } }
      };
      bindHex(sw, tx, put, true);
      x.onclick = function () { tx.value = ''; sw.value = tx.placeholder; put(''); };
    });
    bindAccent(p);
    p.querySelector('#ix-cres').onclick = function () { cur[m] = {}; PG_APPS.forEach(function (a) { delete cur.pg[a[0]][m]; }); preview(); pColors(p); };
  }
  /* Appearance > Presets: the whole gallery on its own tab, dark or light mode, one click fills every color */
  /* (1.65.0) a preset card's picture: a small page in its colours (the bar with its pages, two boxes with text, an accent button) */
  function miniPage(c, acc) {
    return '<span class="ix-pv" style="background:' + c.bg + ';border-color:' + c.line + '"><i style="background:' + c.bar + '"><em style="background:' + c.mute + '"></em><em style="background:' + acc + '"></em><em style="background:' + c.mute + '"></em><em style="background:' + c.mute + '"></em></i>' +
      '<b style="background:' + c.box + ';border-color:' + c.line + '"><em style="background:' + c.text + '"></em><em style="background:' + c.mute + '"></em><em style="background:' + c.mute + '"></em></b>' +
      '<b style="background:' + c.box + ';border-color:' + c.line + '"><em style="background:' + c.text + '"></em><em style="background:' + c.mute + '"></em></b><u style="background:' + acc + '"></u></span>';
  }
  /* (1.65.0) Surprise Me: a new colour mix, not one of the presets. One hue for the page, another for the accent; tried again until the
     text and the muted text are easy to read on the boxes (contrast 7 and 4.5, the rules the presets pass) and the accent stands out. */
  function hslHex(h, s, l) {
    s /= 100; l /= 100; var k = function (n) { return (n + h / 30) % 12; }, a = s * Math.min(l, 1 - l);
    var f = function (n) { return Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))))).toString(16).padStart(2, '0'); };
    return '#' + f(0) + f(8) + f(4);
  }
  function luminance(hex) { var v = [1, 3, 5].map(function (i) { var x = parseInt(hex.substr(i, 2), 16) / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; }
  function contrastOf(a, b) { var x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  var MIX_HUE = [[15, 'Ember'], [35, 'Amber'], [55, 'Gold'], [80, 'Lime'], [120, 'Moss'], [160, 'Jade'], [180, 'Teal'], [195, 'Lagoon'], [215, 'Ocean'], [235, 'Indigo'], [260, 'Violet'], [285, 'Plum'], [315, 'Orchid'], [340, 'Rose'], [361, 'Ember']];
  var MIX_MOOD = { dark: ['Dusk', 'Night', 'Haze', 'Deep', 'Midnight', 'Shadow', 'Velvet'], light: ['Morning', 'Mist', 'Paper', 'Cloud', 'Linen', 'Daylight', 'Breeze'] };
  function mixColors(mode) {
    var R = function (a, b) { return a + Math.random() * (b - a); };
    for (var tries = 0; tries < 40; tries++) {
      var h = Math.round(R(0, 360)), s = R(12, 32), ah = Math.round((h + R(120, 220)) % 360), c;
      if (mode === 'dark') c = { bg: hslHex(h, s, R(5, 9)), bar: hslHex(h, s, R(3, 6)), box: hslHex(h, s, R(10, 14)), panel: hslHex(h, s, R(13, 17)), line: hslHex(h, s * .9, R(20, 26)),
        text: hslHex(h, R(8, 20), R(87, 93)), mute: hslHex(h, R(6, 14), R(62, 70)), barText: hslHex(h, R(6, 14), R(62, 70)), accent: hslHex(ah, R(70, 90), R(60, 68)) };
      else c = { bg: hslHex(h, s, R(94, 97)), bar: hslHex(h, s, R(90, 93)), box: hslHex(h, s * .6, R(98, 100)), panel: hslHex(h, s * .6, R(97, 99)), line: hslHex(h, s * .8, R(82, 87)),
        text: hslHex(h, R(15, 30), R(10, 16)), mute: hslHex(h, R(8, 16), R(34, 40)), barText: hslHex(h, R(8, 16), R(34, 40)), accent: hslHex(ah, R(65, 85), R(38, 46)) };
      if (contrastOf(c.text, c.box) >= 7 && contrastOf(c.mute, c.box) >= 4.5 && contrastOf(c.mute, c.bg) >= 4.5 && contrastOf(c.accent, c.bg) >= 3) {
        var hn = MIX_HUE.filter(function (x) { return h < x[0]; })[0][1], md = MIX_MOOD[mode];
        return { n: hn + ' ' + md[Math.floor(Math.random() * md.length)], c: c, a: c.accent };
      }
    }
    return null;
  }
  var lastMix = { dark: null, light: null };
  /* (1.68.2) Appearance > Glass; (1.68.4) one glass for the whole site: the bar, the dock, the Home widgets and the places under Where.
     The real bar and the preview follow each move (preview); Save keeps it. */
  function pGlass(p) {
    draft.glassFx = canonGfx(draft.glassFx);
    var fx = draft.glassFx, val = function (k, d) { return typeof fx[k] === 'number' ? fx[k] : d; };
    var ua = navigator.userAgent, bends = !((/Safari/.test(ua) && !/Chrome/.test(ua)) || /Firefox/.test(ua));
    var picked = GPICKS.filter(function (k) { return gLook(canonGfx(k[2])) === gLook(fx); })[0];
    var slider = function (g) { var v = val(g[0], g[5]);
      return '<div class="ix-tsf ix-gxf"><label for="ix-gx-' + g[0] + '">' + g[1] + '<small>' + esc(g[2]) + '</small></label><div class="ix-tsr"><input type="range" id="ix-gx-' + g[0] + '" data-g="' + g[0] + '" min="' + g[3] + '" max="' + g[4] + '" step="1" value="' + v + '"><output>' + v + g[6] + '</output></div></div>'; };
    var sw = function (id, name, help, on, off) { return '<label class="ix-tg"><span>' + name + '<small>' + esc(help) + '</small></span><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + (off ? ' disabled' : '') + '></label>'; };
    var photo = ROOT + 'web/home/starter/mountains.jpg';
    p.innerHTML = '<h3>Glass</h3><p>One glass for the whole site: the top bar or the dock, the Home widgets, and the places you pick under Where.</p>' +
        sw('ix-glass2', 'Glass on the Bar', 'The top bar or the dock (not the sidebar). The Home widgets are always glass.', draft.glass) +
        '<div class="ix-gpv" aria-hidden="true"><i class="ix-gpvb"><b></b><b></b><b></b><em></em></i>' +
          '<i class="ix-gpvc">6:13</i><i class="ix-gpvw"><b>Note</b><span>Buy milk. Call the plumber on Monday.</span></i><i class="ix-gpvd"><b></b><b></b><b></b><b></b><b></b></i></div>' +
        '<p class="ix-note">The preview follows every change. ' + (bends ? 'Liquid shows on the real glass (with Only Over Photos: on the start page).' : 'This browser shows frosted glass: Liquid, Edge Width and Colour Fringe change nothing here; Chrome and Edge show them.') + '</p>' +
      '<h3>Quick Picks</h3><p>A starting point; everything below fine-tunes it. Solid is easiest to read on busy photos.</p>' + seg('gpick', GPICKS.map(function (k) { return [k[0], k[1]]; }), picked ? picked[0] : '') +
      '<h3>Fine-Tune</h3><p>Every glass on the site follows these.</p>' +
        '<div class="ix-gxt"><span>Tone<small>Auto follows the theme; Light and Dark keep one look.</small></span>' + seg('gtone', [['0', 'Auto'], ['1', 'Light'], ['2', 'Dark']], String(val('tone', 0))) + '</div>' +
        GFX.filter(function (g) { return g[7] === 'fine'; }).map(slider).join('') +
      '<h3>Liquid</h3><p>Bends what is under the edges, with a colour fringe (React Bits\' GlassSurface). Over text it mirrors the words a little, so by default it shows only over the start page\'s photo.</p>' +
        GFX.filter(function (g) { return g[7] === 'liquid'; }).map(slider).join('') +
        sw('ix-gphoto', 'Only Over Photos', 'Liquid on the start page (the photo); plain glass on pages of text.', val('photo', 1) === 1) +
      '<h3>Where</h3><p>Glass in more places, each on its own switch. These stay easy to read: they keep most of their own colour.</p>' +
        sw('ix-gwhome', 'Home Widgets', 'Today, Countdown, Note, Calendar, Quote and the open widget.', true, true) +
        GWHERE.map(function (w) { return sw('ix-g' + w[0], w[1], w[2], val(w[0], 0) === 1); }).join('') +
        '<div class="ix-acts"><button type="button" class="ix-btn" id="ix-gxr">Reset to Default</button></div>';
    p.querySelector('.ix-gpv').style.backgroundImage = 'url("' + photo + '")';   // the start page's own mountain photo
    var setFx = function (k, v) { var o = Object.assign({}, draft.glassFx); o[k] = v; draft.glassFx = canonGfx(o); };
    var markPick = function () { var pk = GPICKS.filter(function (k) { return gLook(canonGfx(k[2])) === gLook(draft.glassFx); })[0];
      p.querySelectorAll('[data-seg="gpick"] button').forEach(function (b) { b.setAttribute('aria-pressed', pk && b.dataset.v === pk[0] ? 'true' : 'false'); }); };
    p.querySelector('#ix-glass2').onchange = function (e) { draft.glass = e.target.checked; preview(); };
    p.querySelector('#ix-gphoto').onchange = function (e) { setFx('photo', e.target.checked ? 1 : 0); preview(); };
    GWHERE.forEach(function (w) { p.querySelector('#ix-g' + w[0]).onchange = function (e) { setFx(w[0], e.target.checked ? 1 : 0); preview(); }; });
    bindSeg(p, function (k, v) {
      if (k === 'gtone') { setFx('tone', +v); preview(); return; }
      if (k !== 'gpick') return;
      var pk = GPICKS.filter(function (x) { return x[0] === v; })[0], o = Object.assign({}, draft.glassFx);
      GLOOK.forEach(function (key) { delete o[key]; }); Object.assign(o, pk ? pk[2] : {});
      draft.glassFx = canonGfx(o); preview(); var y = p.closest('.ix-pane') ? p.closest('.ix-pane').scrollTop : 0; pGlass(p); if (p.closest('.ix-pane')) p.closest('.ix-pane').scrollTop = y;
    });
    p.querySelectorAll('[data-g]').forEach(function (r) {
      var g = GFX.filter(function (x) { return x[0] === r.dataset.g; })[0];
      r.oninput = function () { setFx(g[0], +r.value); r.nextElementSibling.textContent = r.value + g[6]; markPick(); preview(); };
    });
    p.querySelector('#ix-gxr').onclick = function () { draft.glassFx = {}; preview(); pGlass(p); };
  }
  function pThemes(p) {
    var cur = draft.colors = draft.colors || {};
    ['dark', 'light', 'pg'].forEach(function (k) { if (!cur[k] || Array.isArray(cur[k])) cur[k] = {}; });
    PG_APPS.forEach(function (a) { if (!cur.pg[a[0]] || Array.isArray(cur.pg[a[0]])) cur.pg[a[0]] = {}; });
    var m = colorMode || (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'); colorMode = m;
    var set = cur[m], def = COLOR_DEFAULT[m];
    var html = presetsHtml(m, set, def)
      .replace(/<details class="ix-acc" id="ix-presets"[^>]*><summary><span>Presets<\/span><small>([\s\S]*?)<\/small><\/summary><div class="ix-accb">/, '<div class="ix-flatp" id="ix-presets"><p class="ix-note ix-fh">$1</p><div class="ix-fb">')
      .replace(/<\/div><\/details>$/, '</div></div>');
    p.innerHTML = '<div class="ix-row" style="gap:10px">' + seg('cmode', [['dark', 'Dark Mode'], ['light', 'Light Mode']], m) +
      '<button type="button" class="ix-btn" id="ix-cres">Reset ' + (m === 'dark' ? 'Dark' : 'Light') + ' Mode</button></div>' + html +
      '<p class="ix-note">Fine-tune any color in the Colors tab. The accent color is in the Appearance tab.</p>';
    bindSeg(p, function (k, v) { if (k === 'cmode') { colorMode = v; K.previewTheme(v); pThemes(p); } });
    p.querySelector('#ix-pacc').onchange = function (e) { presetAccent = e.target.checked; lsSet('ix-pacc', presetAccent ? '1' : '0'); var y = p.closest('.ix-pane').scrollTop; pThemes(p); p.closest('.ix-pane').scrollTop = y; };
    /* group chips and the search box only show and hide cards that are already drawn (no redraw, so typing keeps its place) */
    var grid = p.querySelector('#ix-pgrid'), search = p.querySelector('#ix-psearch'), cards = [].slice.call(grid.querySelectorAll('.ix-preset')), seps = [].slice.call(grid.querySelectorAll('.ix-psep'));
    function applyFilter() {
      var t = search.value.trim().toLowerCase(), g = grid.dataset.grp, shown = 0;
      cards.forEach(function (c) { var hide = t ? c.dataset.name.indexOf(t) < 0 : (g !== 'all' && c.dataset.g !== g); c.hidden = hide; if (!hide) shown++; });
      seps.forEach(function (sp) { sp.hidden = !!t || g !== 'all'; });
      p.querySelector('#ix-pcount').textContent = t ? shown + ' of ' + cards.length + ' match' + (shown === 1 ? 'es' : '') : (g === 'all' ? cards.length + ' presets' : shown + ' in this group');
      p.querySelector('#ix-pnone').hidden = shown > 0;
    }
    search.oninput = applyFilter;
    p.querySelectorAll('[data-pg-f]').forEach(function (b) { b.onclick = function () {
      presetGroup = b.dataset.pgF; lsSet('ix-pgroup', presetGroup); grid.dataset.grp = presetGroup; search.value = '';
      p.querySelectorAll('[data-pg-f]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); applyFilter();
    }; });
    /* Surprise Me: Another One mixes again (the loader shows for a moment), Use It fills this mode's colours and the accent like a preset
       (Save Settings keeps them), Save to My Presets keeps the mix by its name. */
    var showMix = function (mx) {
      p.querySelector('#ix-surpv').innerHTML = miniPage(Object.assign({}, def, mx.c), mx.a);
      p.querySelector('#ix-surn').textContent = mx.n;
    };
    if (!lastMix[m]) lastMix[m] = mixColors(m);
    if (lastMix[m]) showMix(lastMix[m]);
    p.querySelector('#ix-sura').onclick = function () {
      var w = p.querySelector('#ix-surw'), bt = this; w.hidden = false; bt.disabled = true;
      setTimeout(function () { var mx = mixColors(m); if (mx) { lastMix[m] = mx; showMix(mx); } w.hidden = true; bt.disabled = false; }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450);
    };
    p.querySelector('#ix-suru').onclick = function () {
      var mx = lastMix[m]; if (!mx) return;
      cur[m] = JSON.parse(JSON.stringify(mx.c)); delete cur[m].accent; draft.accent = mx.a;
      var y = p.closest('.ix-pane').scrollTop; preview(); pThemes(p); p.closest('.ix-pane').scrollTop = y;
      toast('"' + mx.n + '" is on. Save Settings keeps it.');
    };
    p.querySelector('#ix-surs').onclick = function () {
      var mx = lastMix[m]; if (!mx) return;
      var mine = (S.myPresets || []).filter(function (x) { return x.n !== mx.n; }), c = JSON.parse(JSON.stringify(mx.c)); delete c.accent;
      var item = { n: mx.n, a: mx.a, dark: JSON.parse(JSON.stringify(cur.dark || {})), light: JSON.parse(JSON.stringify(cur.light || {})) }; item[m] = c;
      mine.push(item);
      saveMine(mine.slice(-40)).then(function () { toast('Saved as "' + mx.n + '" in My Presets.'); }, function (e) { mpe.textContent = e.message; });
    };
    applyFilter();
    p.querySelectorAll('[data-pre]').forEach(function (b) { b.onclick = function () {
      var pr = presetList(m)[+b.dataset.pre];
      cur[m] = JSON.parse(JSON.stringify(pr.c));
      if (presetAccent && pr.a) draft.accent = pr.a;   // shown in Appearance too, kept with Save Settings
      var y = p.closest('.ix-pane').scrollTop; preview(); pThemes(p); p.closest('.ix-pane').scrollTop = y;
    }; });
    p.querySelector('#ix-cres').onclick = function () { cur[m] = {}; PG_APPS.forEach(function (a) { delete cur.pg[a[0]][m]; }); preview(); pThemes(p); };
    /* My Presets */
    var mpe = p.querySelector('#ix-mpe'), keepScroll = function (fn) { var y = p.closest('.ix-pane').scrollTop; fn(); p.closest('.ix-pane').scrollTop = y; };
    var again = function () { keepScroll(function () { pThemes(p); }); var n = p.querySelector('#ix-mypre'); if (n) n.open = true; };
    p.querySelector('#ix-mps').onclick = function () {
      var name = p.querySelector('#ix-mpn').value.trim(); if (!name) { mpe.textContent = 'Give this look a name first.'; return; }
      var mine = (S.myPresets || []).filter(function (x) { return x.n !== name; });
      mine.push({ n: name, a: draft.accent || '', dark: JSON.parse(JSON.stringify(cur.dark || {})), light: JSON.parse(JSON.stringify(cur.light || {})) });
      saveMine(mine.slice(-40)).then(function () { toast('Saved as "' + name + '".'); presetGroup = 'mine'; lsSet('ix-pgroup', 'mine'); again(); }, function (e) { mpe.textContent = e.message; });
    };
    p.querySelectorAll('[data-mpd]').forEach(function (b) { b.onclick = function () {
      saveMine((S.myPresets || []).filter(function (x, i) { return i !== +b.dataset.mpd; })).then(function () { toast('Deleted.'); again(); }, function (e) { mpe.textContent = e.message; }); }; });
    p.querySelector('#ix-mpx').onclick = function () {
      if (!(S.myPresets || []).length) { mpe.textContent = 'You have no presets of your own to export yet.'; return; }
      download('my-presets-' + new Date().toISOString().slice(0, 10) + '.json', 'application/json', JSON.stringify({ type: 'site-presets', version: 1, presets: S.myPresets }, null, 2)); mpe.textContent = '';
    };
    p.querySelector('#ix-mpf').onchange = function (e) {
      var f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
      if (f.size > 400000) { mpe.textContent = 'That file is too big to be a preset file.'; return; }
      var rd = new FileReader();
      rd.onload = function () {
        var j; try { j = JSON.parse(String(rd.result)); } catch (x) { mpe.textContent = 'That is not a preset file (it could not be read).'; return; }
        var list = Array.isArray(j) ? j : j && j.presets; if (!Array.isArray(list)) { mpe.textContent = 'That is not a preset file (no presets in it).'; return; }
        var mine = (S.myPresets || []).slice(), added = 0, hex = /^#[0-9a-f]{6}$/i;
        list.forEach(function (x) {
          if (!x || typeof x.n !== 'string' || !x.n.trim()) return;
          var e2 = { n: x.n.trim().slice(0, 30), a: hex.test(x.a || '') ? x.a : '', dark: {}, light: {} };
          ['dark', 'light'].forEach(function (md) { Object.keys(x[md] || {}).forEach(function (k) { if (COLOR_KEYS.some(function (c) { return c[0] === k; }) && hex.test(x[md][k])) e2[md][k] = x[md][k]; }); });
          mine = mine.filter(function (y) { return y.n !== e2.n; }); mine.push(e2); added++;
        });
        if (!added) { mpe.textContent = 'No usable presets were found in that file.'; return; }
        saveMine(mine.slice(-40)).then(function () { toast('Imported ' + added + (added === 1 ? ' preset.' : ' presets.')); presetGroup = 'mine'; lsSet('ix-pgroup', 'mine'); again(); }, function (e3) { mpe.textContent = e3.message; });
      };
      rd.readAsText(f);
    };
  }
  function pBar(p) {
    p.insertAdjacentHTML('beforeend', barHtml() + '<h3>Tabs</h3><p>Drag a tab to move it (or Alt + Up and Down on its name), rename it, or switch it off to hide it. Home is your logo and site name in the bar.</p>' +
      '<div class="ix-tabp" id="ix-tabp" aria-hidden="true"></div><div class="ix-tabl" id="ix-tabl"></div><div class="ix-row"><button type="button" class="ix-btn" id="ix-tabreset">Reset Names and Order</button></div>');
    bindBar(p);
    tabEditor(p.querySelector('#ix-tabl'), p.querySelector('#ix-tabp'));
    p.querySelector('#ix-tabreset').onclick = function () { draft.pages = []; tabEditor(p.querySelector('#ix-tabl'), p.querySelector('#ix-tabp')); preview(); markDirty(true); };
  }
  /* Settings > Appearance > Bar, the Tabs part (1.67.2; General > Tabs before 1.70.0, on Look since 1.78.0): one row per page with its colour tile (as in the bar), its name and a switch; drag a row to move it.
     A strip above shows the bar as it will look. Home is not listed: the logo and site name lead there (the dock shows it first). */
  var GRIP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01"/></svg>';
  function tabEditor(box, strip) {
    var all = pageList(draft).map(function (q) { var d = PAGE_DEF.filter(function (x) { return x[0] === q[0]; })[0];
      return { id: q[0], name: q[1] === d[1] ? '' : q[1], hide: q[4], def: d[1], icon: d[3] }; });
    var home = all.filter(function (x) { return x.id === 'home'; })[0], list = all.filter(function (x) { return x.id !== 'home'; });
    // every change marks the window as changed at once: a drag ends without a click, so Save Settings stayed grey until another click (1.67.2)
    var keep = function () { draft.pages = (home ? [home] : []).concat(list).map(function (x) { return { id: x.id, name: x.name, hide: x.hide }; }); preview(); markDirty(true); drawStrip(); };
    var tile = function (x) { return '<span class="ix-pgt" style="--c:' + K.pageColor(x.id) + '" aria-hidden="true">' + (K.pageTile(x.id) || svg(x.icon)) + '</span>'; };
    var dragFrom = -1;
    function drawStrip() {
      if (!strip) return;
      strip.innerHTML = list.filter(function (x) { return !x.hide; }).map(function (x) { return '<span class="ix-tabc">' + tile(x) + '<b>' + esc(x.name || x.def) + '</b></span>'; }).join('');
    }
    function draw() {
      box.innerHTML = list.map(function (x, i) {
        return '<div class="ix-pgr' + (x.hide ? ' off' : '') + '" draggable="true" data-i="' + i + '"><span class="ix-pgg" title="Drag to move">' + GRIP + '</span>' + tile(x) +
          '<input type="text" maxlength="20" value="' + esc(x.name) + '" placeholder="' + esc(x.def) + '" aria-label="Name of the ' + esc(x.def) + ' tab (Alt + Up or Down moves it)" data-k="name">' +
          '<span class="ix-pgh">' + (x.hide ? 'Hidden' : '') + '</span>' +
          '<label class="ix-pgs" title="Show This Tab"><input type="checkbox" class="ix-sw" data-k="show" aria-label="Show the ' + esc(x.def) + ' tab"' + (x.hide ? '' : ' checked') + '></label></div>';
      }).join('');
      drawStrip();
    }
    function move(i, j) { if (j < 0 || j >= list.length || i === j) return false; var x = list.splice(i, 1)[0]; list.splice(j, 0, x); draw(); keep(); return true; }
    box.oninput = function (e) { var r = e.target.closest('.ix-pgr'); if (r && e.target.dataset.k === 'name') { list[+r.dataset.i].name = e.target.value.trim(); keep(); } };
    box.onchange = function (e) {
      var r = e.target.closest('.ix-pgr'); if (!r || e.target.dataset.k !== 'show') return;
      var x = list[+r.dataset.i];
      if (!e.target.checked && list.filter(function (y) { return !y.hide; }).length === 1) { e.target.checked = true; toast('Keep at least one tab.'); return; }
      x.hide = !e.target.checked; r.classList.toggle('off', x.hide); r.querySelector('.ix-pgh').textContent = x.hide ? 'Hidden' : ''; keep();
    };
    // from the keyboard: Alt + Up or Down on a tab's name moves it one place, and the name keeps the focus
    box.onkeydown = function (e) {
      if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
      var r = e.target.closest('.ix-pgr'); if (!r) return;
      var i = +r.dataset.i, j = i + (e.key === 'ArrowUp' ? -1 : 1);
      e.preventDefault(); if (move(i, j)) { var n = box.querySelector('.ix-pgr[data-i="' + j + '"] input[data-k=name]'); if (n) n.focus(); }
    };
    box.ondragstart = function (e) { var r = e.target.closest && e.target.closest('.ix-pgr'); if (!r || e.target.tagName === 'INPUT') return; dragFrom = +r.dataset.i; r.classList.add('drag'); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', r.dataset.i); } catch (er) {} };
    box.ondragover = function (e) {
      if (dragFrom < 0) return; e.preventDefault();
      var r = e.target.closest('.ix-pgr'); box.querySelectorAll('.over').forEach(function (x) { if (x !== r) x.classList.remove('over'); }); if (r && +r.dataset.i !== dragFrom) r.classList.add('over');
    };
    box.ondrop = function (e) { var r = e.target.closest('.ix-pgr'); if (dragFrom >= 0 && r) { e.preventDefault(); move(dragFrom, +r.dataset.i); } dragFrom = -1; };
    box.ondragend = function () { dragFrom = -1; box.querySelectorAll('.drag,.over').forEach(function (x) { x.classList.remove('drag'); x.classList.remove('over'); }); };
    draw();
  }
  /* Settings > Telegram: task and backup reminders through your own Telegram bot. Saved straight away (not with Save settings). */
  function pRemind(p) {
    p.innerHTML = spinRow();
    var hourLabel = function (h) { return (h % 12 || 12) + ':00 ' + (h < 12 ? 'AM' : 'PM'); };
    var BK_TXT = { 1: 'Every Day', 3: 'Every 3 Days', 7: 'Every Week', 14: 'Every 2 Weeks', 30: 'Every Month' };
    /* "Right Now": what is actually happening, in plain sentences: is the schedule running, what comes next, what went out last, what went wrong. */
    function live(n, ready) {
      var now = n.now || Math.floor(Date.now() / 1000), rows = [];
      var line = function (state, text) { rows.push(checkRow(state === 'ok' ? '' : state === 'off' ? 'off' : 'warn', state === 'ok' ? '✓' : state === 'off' ? '–' : '!', '', text)); };
      if (!ready) line('bad', '<b>Not connected yet.</b> Open the <b>Setup</b> tab and follow the 2 steps.');
      else {
        var cronAge = n.cronLast ? now - n.cronLast : -1;
        if (cronAge >= 0 && cronAge < 1800) line('ok', '<b>Schedule is running.</b> Last check ' + esc(ago(n.cronLast)) + '.');
        else if (cronAge >= 0) line('bad', '<b>Schedule has stopped.</b> It last ran ' + esc(ago(n.cronLast)) + '. Check the cron job in your hosting panel (Setup tab).');
        else line('bad', '<b>No schedule yet.</b> Messages only go out while one of your pages is open. Add the cron job (Setup tab).');
        if (n.on && n.tasks) {
          var d = new Date(); var next = new Date(d.getFullYear(), d.getMonth(), d.getDate(), n.hour, 0, 0); if (next <= d) next.setDate(next.getDate() + 1);
          line('ok', '<b>Daily message</b> at ' + hourLabel(n.hour) + ' (' + esc(n.tz) + ') · next ' + (next.getDate() === d.getDate() ? 'today' : 'tomorrow') + '.');
        } else line('off', n.on ? 'Daily message is off.' : '<b>Messages are paused.</b> Turn them on in the Messages tab.');
        line(n.lastSent ? 'ok' : 'off', n.lastSent ? 'Last message sent ' + esc(ago(n.lastSent)) + '.' : 'Nothing sent yet.');
        if (n.bkEvery) line(n.bkError ? 'bad' : n.bkLast ? 'ok' : 'off', n.bkError ? '<b>Last backup to Telegram failed:</b> ' + esc(n.bkError) : n.bkLast ? 'Last backup file sent ' + esc(ago(n.bkLast)) + (n.encReady ? ', encrypted.' : ', <b>not encrypted</b> (set a passphrase in Security › Encryption).') : 'The first backup file goes out at the next daily hour.');
        if (n.hook) { var hi = n.hookInfo || {}; line(hi.error ? 'bad' : 'ok', hi.error ? '<b>Instant replies have a problem:</b> ' + esc(hi.error) + (hi.errorAt ? ' (' + esc(ago(hi.errorAt)) + ')' : '') : 'Instant replies are working' + (hi.pending ? ' · ' + hi.pending + ' waiting' : '') + '.'); }
        if (n.lastError) line('bad', '<b>Last problem:</b> ' + esc(n.lastError));
        else line('ok', 'No problems reported.');
      }
      return '<div class="ix-sect">Right Now</div><div class="ix-checks">' + rows.join('') + '</div>';
    }
    var tested = false;   // (1.77.1) a test message was sent in this visit: step 4 then says so and points to what comes next
    function draw(n, chats, msg, err) {
      var ready = n.hasToken && n.chat;
      if (msg) toast(msg);   // the message is also shown on the Status tab, but you may be on another tab when it arrives
      if (!ready && !TABSEL.telegram) TABSEL.telegram = 'setup';   // nothing works until the bot is connected, so start there
      var acc = function (k, title, sum, body) { return '<details class="ix-acc" data-tg="' + k + '"><summary><span>' + title + '</span><small>' + sum + '</small></summary><div class="ix-accb">' + body + '</div></details>'; };
      var sent = [n.tasks && 'digest', n.timed && 'due now', n.backup && 'backup reminder', n.login && 'login alerts'].filter(Boolean);
      var bkTxt = BK_TXT[n.bkEvery] || 'Off';
      var now = n.now || Math.floor(Date.now() / 1000), running = n.cronLast && now - n.cronLast < 1800;
      var toggle = function (k, title, hint, on, dis) { return '<label class="ix-tg"><span>' + title + '<small>' + hint + '</small></span><input type="checkbox" data-k="' + k + '"' + (on ? ' checked' : '') + (dis ? ' disabled' : '') + '></label>'; };
      var hero = '<div class="ix-hero"><span class="ix-hero-i ' + (ready ? (running ? 'good' : 'warn') : 'warn') + '">' + svg(ICON.send) + '</span><div class="ix-hero-t"><div class="ix-hero-h">' +
        (ready ? 'Connected to ' + esc(n.chatName || n.chat) : n.hasToken ? 'One More Step: Connect Your Chat' : 'Connect Your Telegram Bot') + '</div><p>' +
        (ready ? (running ? 'Your bot is working and the schedule is running.' : 'Your bot is connected, but the schedule needs a look (see Right Now below).') : 'Reminders, login alerts and backups, sent to your phone by your own bot. It takes about two minutes.') + '</p>' +
        (ready ? '' : '<div class="ix-row" style="margin-top:12px"><button type="button" class="ix-btn pri" data-go="bot">' + (n.hasToken ? 'Continue Setup' : 'Start Setup') + '</button></div>') + '</div></div>';
      var tiles = '<div class="ix-tiles">' +
        tile('bot', ICON.gear, 'Setup', ready ? 'Connected' : n.hasToken ? 'No Chat Yet' : 'Not Set Up', ready ? 'good' : 'warn', ready ? 'Bot and schedule are ready.' : 'Make a bot, connect your chat, add the schedule.') +
        tile('bk', ICON.box, 'Backups', n.bkEvery ? bkTxt : 'Off', n.bkEvery ? (n.encReady ? 'good' : 'warn') : '', n.bkEvery ? (n.encReady ? 'Encrypted backup files.' : 'Not encrypted: set a passphrase in Security.') : 'Get a full backup file sent to your chat.') +
        tile('msg', ICON.bell, 'Messages', !ready ? 'Off' : n.on ? (sent.length ? sent.length + ' Kinds On' : 'Nothing Picked') : 'Off', ready && n.on ? 'good' : '', n.on && ready ? 'Daily message at ' + hourLabel(n.hour) + '.' : 'Choose what you want to hear about.') +
        tile('two', ICON.pulse, 'Instant Replies', n.hook ? 'On' : 'Off', n.hook ? 'good' : '', n.hook ? 'The bot answers within a second.' : 'The bot answers within a few minutes.') + '</div>';
      p.innerHTML = hero + (msg ? '<p class="' + (err ? 'ix-err' : 'ix-note') + '">' + esc(msg) + '</p>' : '') + tiles + live(n, ready) +

        acc('bot', 'Setup', ready ? 'Connected to ' + esc(n.chatName || n.chat) + '. The schedule (a cron job) is what sends messages on time.' : 'Two short steps: create a bot, then connect your chat and send a test.',
          (function () {
            var d1 = !!n.hasToken, d3 = !!n.chat, d4 = ready && !!n.on;
            var pill = function (done, open) { return '<span class="ix-pill ' + (done ? 'good' : open ? 'warn' : '') + '">' + (done ? 'Done' : open ? 'Next' : 'Waiting') + '</span>'; };
            // (1.78.1) one box, two rows: each row has its number, what to do and its state on the left, the fields and buttons on the right
            var row = function (num, done, title, state, desc, body) {
              return '<div class="ix-srow' + (done ? ' done' : '') + '"><div class="ix-srow-h"><span class="ix-srow-n">' + (done ? '✓' : num) + '</span><div><div class="ix-srow-t">' + title + state + '</div><div class="ix-srow-d">' + desc + '</div></div></div><div class="ix-srow-b">' + body + '</div></div>';
            };
            return ecCard('', ICON.gear, 'Set Up Your Bot', 'Two short steps: create a bot, then connect your chat and send a test.',
              row(1, d1, 'Create Your Bot', pill(d1, !d1), d1 ? 'Token saved (' + esc(n.tokenHint || 'hidden') + '). Paste a new one to replace it.' :
                'In Telegram, open <b>@BotFather</b>, send <code>/newbot</code> and answer its questions. It gives you a <b>token</b>, a long line of letters and numbers. Paste it here.',
                '<div class="ix-fact ix-fbot"><div class="ix-fd ix-fdw"><label for="nt-tok">Bot Token</label><input type="password" id="nt-tok" autocomplete="off" spellcheck="false" placeholder="' + esc(n.tokenHint || '123456789:AAE…') + '"></div>' +
                  '<button type="button" class="ix-btn pri" id="nt-st">' + (d1 ? 'Replace Token' : 'Save Token') + '</button>' + (d1 ? '<button type="button" data-hold class="ix-btn" id="nt-rm">Remove</button>' : '') + '</div>' +
                  '<p class="ix-note">It stays on your server and is only used to talk to Telegram.</p>') +
              row(2, d3, 'Connect and Test', pill(d3, d1), d3 ? 'Connected to <b>' + esc(n.chatName || n.chat) + '</b>. Send a test any time.' :
                'Open your new bot in Telegram, send it <code>/start</code>, then press <b>Find My Chat</b>.',
                '<div class="ix-row"><button type="button" class="ix-btn' + (n.hasToken && !d3 ? ' pri' : '') + '" id="nt-find"' + (n.hasToken ? '' : ' disabled') + '>Find My Chat</button>' +
                  '<button type="button" class="ix-btn' + (d3 && !tested ? ' pri' : '') + '" id="nt-test"' + (ready ? '' : ' disabled') + '>' + (tested ? 'Send Another Test' : 'Send Test') + '</button>' +
                  (tested && d4 ? '<button type="button" class="ix-btn pri" data-go="msg">Choose What to Hear About</button>' : '') + '</div>' +
                  (chats && chats.length > 1 ? '<div class="ix-row" style="margin-top:10px">' + chats.map(function (c) { return '<button type="button" class="ix-btn" data-chat="' + esc(c.id) + '" data-name="' + esc(c.name) + '">Use ' + esc(c.name || c.id) + '</button>'; }).join('') + '</div>' : '') +
                  (tested && d4 ? '<p class="ix-note"><span class="ix-ok">✓</span> <b>Test message sent.</b> It should be in Telegram now.</p>' : d3 ? '<p class="ix-note">You get a message from your bot within a second. Then open the <b>Messages</b> tab to choose what you want to hear about.</p>' : ''))) +
              '<div class="ix-rcl">' + rowCard({ ic: ICON.clock, title: 'Keep It on Schedule', desc: 'Messages go out on time only if your host runs a small job every 10 minutes (a cron job).',
                act: '<button type="button" class="ix-btn" id="nt-schb" aria-expanded="false">Show the Command</button>', hide: true, id: 'nt-sch',
                body: '<p>In your hosting panel (cPanel › Cron Jobs), add this to run <b>every 10 minutes</b>:</p>' +
                linkField({ id: 'nt-cmd', value: n.cronCmd, prefix: 'Cron', readonly: true, label: 'Cron job command', cls: 'ix-uf-gap' }) +   // (1.69.1) the link field
                '<p>If your host only accepts a web address, use this one instead and keep it private:</p>' +
                // the key in the address shows as dots; Copy gives the whole line
                linkField({ id: 'nt-url', value: n.cronUrl, show: String(n.cronUrl).replace(/([?&]key=)[^&]+/, '$1•••••'), prefix: 'curl', readonly: true,
                  copyText: 'curl -s "' + n.cronUrl + '"', label: 'Cron job web address', cls: 'ix-uf-gap' }) }) + '</div>'
          })()) +

        acc('msg', 'Messages', !ready ? 'Finish Setup first, then choose what you want to hear about.' : n.on ? 'A daily message at ' + hourLabel(n.hour) + ', plus the alerts you pick below.' : 'Daily messages are off.',
          tabHead(ICON.bell, 'Messages', 'Choose what your bot tells you, and when.') +
          ecCard(n.on && ready ? 'good' : '', ICON.bell, 'Messages', 'The main switch. Messages go to the chat connected in Setup.', toggle('on', 'Messages On', ready ? 'Turn everything below on or off at once.' : 'Set up the bot and chat first.', n.on, !ready)) +
          ecCard('', ICON.check, 'Tasks', 'Reminders about the tasks in your Tasks page.',
            toggle('tasks', 'Daily Digest', 'Overdue tasks, tasks due today, and tasks inside their "Remind Me" window.', n.tasks) +
            toggle('timed', 'Due Now', 'Tasks with a time get a message when that time passes.', n.timed)) +
          ecCard('', ICON.shield, 'Site Alerts', 'News about the site itself.',
            toggle('backup', 'Backup Reminder', 'Once a day while a backup is due.', n.backup) +
            toggle('login', 'Login Alerts', 'Straight away: logins, paused logins, password and two-step changes, restores.', n.login)) +
          ecCard('', ICON.clock, 'Delivery Time', 'When the daily message goes out.',
            '<div class="ix-row"><select id="nt-hour" style="width:auto">' + Array.apply(null, Array(24)).map(function (x, h) { return '<option value="' + h + '"' + (n.hour === h ? ' selected' : '') + '>' + hourLabel(h) + '</option>'; }).join('') + '</select>' +
            '<span class="ix-note" style="margin:0">' + esc(String(n.tz).replace(/_/g, ' ')) + ' time</span><button type="button" class="ix-btn" id="nt-now"' + (ready ? '' : ' disabled') + '>Send Now</button></div>' +
            '<p class="ix-note">Last checked: ' + (n.lastRun ? when(n.lastRun) : 'never') + '. Last message: ' + (n.lastSent ? when(n.lastSent) : 'none yet') + '.' + (n.lastError ? ' <span class="ix-err">Last problem: ' + esc(n.lastError) + '</span>' : '') + '</p>') +
          ecCard('', ICON.send, 'Send Today\'s Tasks', 'The daily list, sent to your chat right now.', '<div class="ix-row"><button type="button" class="ix-btn pri" id="nt-today"' + (ready ? '' : ' disabled') + '>Send Today\'s Tasks Now</button></div>')) +

        acc('two', 'Instant Replies', (n.hook ? 'On: the bot answers your commands within a second.' : 'Off: the bot answers within a few minutes.') + ' It understands 8 commands.',
          '<div class="ix-rcl">' + rowCard({ ic: ICON.pulse, color: n.hook ? '#22c55e' : '', title: 'Instant Replies', desc: (n.hook ? 'On: the bot answers within a second.' : 'Off: the bot answers within a few minutes.') +
              (n.hook && n.hookInfo && n.hookInfo.error ? ' <span class="ix-err">Telegram reports: ' + esc(n.hookInfo.error) + '</span>' : ''),
            act: '<input type="checkbox" class="ix-sw" id="nt-hook" aria-label="Instant Replies"' + (n.hook ? ' checked' : '') + (n.hasToken ? '' : ' disabled') + '>',
            body: '<p class="ix-note ix-hknote" style="margin:0">With it on, <b>Approve in Telegram</b> logs you in within a second (needs https). With it off everything still works, a few minutes slower.</p>' +
              '<details class="ix-how"><summary>Behind Cloudflare?</summary><p>If replies stop, add a WAF rule that skips <code>/web/hub/core/telegram.php</code>.</p></details>' }) + '</div>' +
          '<div class="ix-sect">Commands</div><p class="ix-note" style="margin-top:0">Send any of these to your bot, or click one to copy it. Only your own chat is answered.</p>' +
          '<div class="ix-cmdg">' + [['/today', 'Overdue and today, with Done buttons'], ['/week', 'The next 7 days'], ['/next', 'The next 10 tasks'], ['/add Netflix 649 monthly 5 Nov', 'A new task'],
            ['/done Netflix', 'Mark one done'], ['/snooze Netflix 2h', 'Pause its reminders'], ['/backup', 'A backup file now'], ['/status', 'A quick health check']].map(function (c) {
            return '<button type="button" class="ix-cmdc" data-cmd="' + esc(c[0]) + '" aria-label="Copy ' + esc(c[0]) + '"><code>' + esc(c[0]) + '</code><span>' + esc(c[1]) + '</span><em aria-hidden="true">Copy</em></button>'; }).join('') + '</div>');
      p.querySelectorAll('[data-go]').forEach(function (x) { x.onclick = function () { if (x.dataset.go === 'bk') { go('backup'); return; } var d = p.querySelector('details[data-tg="' + x.dataset.go + '"]'); d.open = true; d.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }; });
      // click a command to copy it (the older copy command is the fallback where the browser has no clipboard here)
      p.querySelectorAll('[data-cmd]').forEach(function (b) { b.onclick = function () {
        var t = b.dataset.cmd, em = b.querySelector('em');
        var ok = function () { b.classList.add('ok'); em.textContent = 'Copied'; toast('Copied ' + t); clearTimeout(b.__t); b.__t = setTimeout(function () { b.classList.remove('ok'); em.textContent = 'Copy'; }, 1600); };
        var fail = function () { if (K.legacyCopy(t)) ok(); else toast('Could not copy. Select the command and press Ctrl+C.', true); };
        try { (navigator.clipboard && window.isSecureContext ? navigator.clipboard.writeText(t) : Promise.reject()).then(ok, fail); } catch (x) { fail(); }
      }; });
      var call = function (action, body, btn, wait) {
        if (btn) btn.disabled = true;
        return api(action, body || {}, null, wait).then(function (j) {
          if (btn) btn.disabled = false;
          if (!j || !j.ok) { draw(j && j.cronCmd ? j : n, chats, (j && j.error) || 'Something went wrong.', true); return null; }
          return j;
        }, function () {   // no answer in time (a slow host, or the connection dropped): free the button, and say the action may still have worked
          if (btn) btn.disabled = false;
          draw(n, chats, 'The site did not answer in time. A backup can still arrive in Telegram: look there before you try again.', true); return null;
        });
      };
      var tok = p.querySelector('#nt-tok');
      p.querySelector('#nt-st').onclick = function () {
        if (!tok.value.trim()) { tok.focus(); return; }
        call('notify_save', { token: tok.value.trim() }, this).then(function (j) { if (j) draw(j, null, 'Token saved. Now send /start to your bot and click Find My Chat.'); });
      };
      var rm = p.querySelector('#nt-rm');
      if (rm) rm.onclick = function () {
        call('notify_save', { clearToken: true }, rm).then(function (j) { if (j) draw(j, null, 'Bot removed. Reminders are off.'); });
      };
      p.querySelector('#nt-find').onclick = function () {
        call('notify_find', {}, this).then(function (j) {
          if (!j) return;
          var c = j.chats || [];
          draw(j, c, !c.length ? 'No messages found. Open your bot in Telegram, send /start, then try again.' : c.length === 1 ? 'Found your chat. Click Send Test.' : 'Several chats wrote to the bot. Pick yours.', !c.length);
        });
      };
      p.querySelectorAll('[data-chat]').forEach(function (b) { b.onclick = function () {
        call('notify_save', { chat: b.dataset.chat }, b).then(function (j) { if (j) { j.chatName = j.chatName || b.dataset.name; call('notify_test', { chatName: b.dataset.name }).then(function (k) { draw(k || j, null, k ? 'Chat saved and a test message sent.' : ''); }); } });
      }; });
      var sb = p.querySelector('#nt-schb'); if (sb) sb.onclick = function () { var x = p.querySelector('#nt-sch .ix-rc-x'); x.hidden = !x.hidden; sb.setAttribute('aria-expanded', x.hidden ? 'false' : 'true'); sb.textContent = x.hidden ? 'Show the Command' : 'Hide'; };
      p.querySelector('#nt-test').onclick = function () { call('notify_test', {}, this).then(function (j) { if (j) { tested = true; draw(j, null, 'Test message sent. Check Telegram.'); } }); };
      p.querySelector('#nt-now').onclick = function () { call('notify_run', {}, this).then(function (j) { if (j) draw(j, null, j.note || 'Done.', !j.ok); }); };
      p.querySelectorAll('[data-k]').forEach(function (c) { c.onchange = function () {
        var o = {}; o[c.dataset.k] = c.checked;
        call('notify_save', o).then(function (j) { if (j) { n = j; draw(j, null); toast(c.dataset.k === 'on' ? (j.on ? 'Reminders on.' : 'Reminders off.') : 'Saved.'); } });
      }; });
      p.querySelector('#nt-hook').onchange = function (e) {
        var c = e.target; c.disabled = true;
        api('tg_hook', { on: c.checked }).then(function (j) { c.disabled = false; if (!j.ok) { c.checked = !c.checked; toast(j.error || 'Telegram refused.'); return; } draw(j, null, j.hook ? 'Instant replies are on. Send /help to your bot to try it.' : 'Instant replies are off; the site checks every few minutes.'); });
      };
      p.querySelector('#nt-today').onclick = function () {
        var b = this; b.textContent = 'Sending…';
        call('notify_today', {}, b, { timeout: 30000 }).then(function (j) { b.textContent = 'Send Today\'s Tasks Now'; if (j) toast('Sent. Check Telegram.'); });
      };
      p.querySelector('#nt-hour').onchange = function (e) { call('notify_save', { hour: +e.target.value }).then(function (j) { if (j) { n = j; draw(j, null); toast('Daily messages at ' + hourLabel(j.hour) + '.'); } }); };
    }
    api('notify').then(function (n) { if (!n || !n.ok) { p.innerHTML = '<p class="ix-err">' + esc((n && n.error) || 'Could not load.') + '</p>'; return; } draw(n); });
  }
  /* Health > Server Check: why icons or titles can't be fetched, folder permissions, then PHP, limits and extensions; (1.70.0) below them
     Files That Do Not Belong (pFiles, the Files tab of Updates before). */
  function pCheck(p) {
    p.innerHTML = '<div class="ix-scbox"></div><h3 class="ix-h3" id="ix-fnb">Files That Do Not Belong</h3><p>Your server\'s files compared with this version\'s list: extra, changed by hand or missing.</p><div class="ix-fls"></div>';
    checkInto(p.querySelector('.ix-scbox')); pFiles(p.querySelector('.ix-fls'));
  }
  function checkInto(p) {
    p.innerHTML = '<p>What your hosting allows: outside connections, folder writes and PHP features.</p><div class="ix-row"><span class="ix-spin" aria-hidden="true"><i></i><i></i><i></i></span><span>Running…</span></div>';
    Promise.all([api('diag'), api('health')]).then(function (r) {
      var j = r[0], h = r[1] || {};
      if (!j.ok) { p.innerHTML = '<p class="ix-err">' + esc(j.error || 'Could not run the check.') + '</p>'; return; }
      var bad = j.checks.filter(function (c) { return !c.ok; }).length;
      p.innerHTML = '<div class="ix-hcards">' +
          hCard('Checks', bad ? bad + ' to Look At' : 'All Passed', bad ? 'of ' + j.checks.length + ' checks, marked ! below' : j.checks.length + ' checks: your hosting allows everything', bad ? 'warn' : 'good') +
          (h.ok ? hCard('PHP', esc(h.php), esc(h.server), '') + hCard('Memory per Request', String(h.limits.memory) === '-1' ? 'No Limit' : esc(h.limits.memory), 'Time limit ' + (h.limits.time ? h.limits.time + ' s' : 'none'), '') +
            hCard('Largest Upload', esc(h.limits.upload), esc(h.limits.post) + ' per request', '') : '') +
        '</div>' +
        '<h3>Connections and Folders</h3><div class="ix-checks">' + j.checks.map(function (c) {
          return checkRow(c.ok ? '' : 'warn', c.ok ? '✓' : '!', esc(c.name), esc(c.note)); }).join('') + '</div>' +
        (h.ok ? '<h3>PHP Extensions</h3><div class="ix-exts">' + Object.keys(h.ext).map(function (e) { return '<span class="' + (h.ext[e] ? 'on' : 'off') + '">' + (h.ext[e] ? '✓ ' : '✗ ') + esc(e) + '</span>'; }).join('') + '</div>' +
          '<p class="ix-note">Time zone ' + esc(String(h.tz || '').replace(/_/g, ' ')) + '.</p>' : '') +
        '<div class="ix-row" style="margin-top:12px"><button type="button" class="ix-btn" id="ix-rc2">Run Again</button></div>';
      p.querySelector('#ix-rc2').onclick = function () { checkInto(p); };
    });
  }
  /* ---------- Overview: where things stand ---------- */
  function decorateNav() {
    if (!OV || !PAGE) return;
    var pill = function (id, txt, cls) { var e = PAGE.querySelector('[data-pill="' + id + '"]'); if (e) { e.textContent = txt || ''; e.className = 'ix-sp ' + (cls || ''); } };
    var pr = OV.protect, tg = OV.telegram, bk = OV.backup, up = OV.update, fl = OV.files, now = Date.now() / 1000, run = tg.cronLast && now - tg.cronLast < 1800;
    pill('security', pr.on + ' of ' + pr.total, pr.on >= pr.total ? 'good' : 'warn');
    pill('telegram', !tg.ready ? 'Set up' : run ? 'Running' : 'Check', !tg.ready ? '' : run ? 'good' : 'warn');
    var late = bk.every > 0 && (!bk.last || (now - bk.last) / 86400 >= bk.every);
    pill('backup', bk.last ? ago(bk.last).replace(' ago', '') : 'Never', late ? 'warn' : bk.last ? 'good' : '');
    var n = fl ? fl.extra + fl.changed : 0;
    pill('updates', up.staged ? 'Ready' : up.newer ? 'New Version' : n ? n + ' to check' : 'Up to date', up.staged || up.newer || n ? 'warn' : 'good');
    pill('look', S.theme === 'auto' ? 'Auto' : S.theme === 'light' ? 'Light' : 'Dark', '');
    pill('health', OV.https ? 'OK' : 'No HTTPS', OV.https ? 'good' : 'warn');
    var sv = PAGE.querySelector('[data-sver]'); if (sv) sv.textContent = ' · v' + OV.version;    paintHead();
  }
  /* (1.74.3) the status on the right of the section header: the same words and colour as the pill in the left panel; Security adds a bar
     and, when the next step is HTTPS (which is set up with the host, in Health), a button to it */
  function paintHead() {
    var h = PAGE && PAGE.querySelector('#ix-phs'), box = h && h.closest('.ix-ph'); if (!h || !OV) return;
    var sec = box.dataset.sec, pill = PAGE.querySelector('[data-pill="' + sec + '"]'), txt = pill ? pill.textContent : '', cls = pill && /good|warn/.test(pill.className) ? (/good/.test(pill.className) ? 'good' : 'warn') : '';
    if (sec === 'look' || !txt) { h.hidden = true; h.innerHTML = ''; return; }
    var pr = OV.protect, bar = sec === 'security' ? '<span class="ix-phb"><i style="width:' + Math.round(100 * (pr.on + 1) / (pr.total + 1)) + '%"></i></span>' : '';
    var nx = sec === 'security' && pr.next && pr.next.key === 'https' ? '<button type="button" class="ix-btn pri" data-phgo="health">Fix Next: HTTPS</button>' : '';
    h.innerHTML = '<span class="ix-phc ' + cls + '">' + esc(txt) + '</span>' + bar + nx; h.hidden = false;
    var b = h.querySelector('[data-phgo]'); if (b) b.onclick = function () { go(b.dataset.phgo); };
  }
  /* (1.66.0) One step bar for every step-by-step screen: thin bars with the step names under them. Done steps fill with the accent, the
     current one is bright, the ones to come are dim, a skipped one is dashed. o.keys: a data-open key per step (Guided Setup) or o.show (the
     step whose card shows); o.locked: the bar only shows where you are (Updates, Two-Step Login). Phones show
     only "2 of 4 · Name" under the bars. */
  function stepBar(names, at, o) {
    o = o || {};
    return '<div class="ix-sbar' + (o.locked ? ' locked' : '') + '" role="list" aria-label="Steps">' + names.map(function (n, i) {
      var st = (o.done && o.done[i] ? ' done' : '') + (o.skip && o.skip[i] ? ' skip' : '') + (i === at ? ' now' : '');
      var lab = 'Step ' + (i + 1) + ' of ' + names.length + ', ' + n + (i === at ? ', current' : o.done && o.done[i] ? ', done' : '');
      var attr = o.keys ? ' data-open="' + o.keys[i] + '"' : o.show ? ' data-stp="' + i + '"' : '';
      return o.locked ? '<span role="listitem" class="ix-sbi' + st + '" aria-label="' + esc(lab) + '"' + (i === at ? ' aria-current="step"' : '') + '><i></i><b>' + esc(n) + '</b></span>'
        : '<button type="button" role="listitem" class="ix-sbi' + st + '"' + attr + ' aria-label="' + esc(lab) + '"' + (i === at ? ' aria-current="step"' : '') + '><i></i><b>' + esc(n) + '</b></button>';
    }).join('') + '</div><div class="ix-sbph">' + (at + 1) + ' of ' + names.length + ' · ' + esc(names[Math.max(0, at)] || '') + '</div>';
  }


  /* ---------- Changelog: web/hub/docs/CHANGELOG.md, read through the API (the docs folder is closed to browsers) ---------- */
  var CL = null;             // the parsed file (kept while Settings is open)
  function mdInline(src) {                // everything is escaped first; only code, bold, italic and web links are turned back into markup
    return String(src).split(/(`[^`]+`)/).map(function (part) {
      if (part.charAt(0) === '`' && part.length > 2 && part.charAt(part.length - 1) === '`') return '<code>' + esc(part.slice(1, -1)) + '</code>';
      var t = esc(part);
      t = t.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*\w])\*([^*\s][^*]*)\*(?![\w*])/g, '$1<i>$2</i>');
      return t.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    }).join('');
  }
  function mdBlocks(md) {
    var L = String(md).replace(/\r/g, '').split('\n'), out = [], i = 0, stack = [];
    var closeTo = function (n) { while (stack.length > n) out.push('</li></' + stack.pop() + '>'); };
    while (i < L.length) {
      var ln = L[i], m;
      if (/^```/.test(ln)) {                                           // a code block
        closeTo(0); var code = []; i++;
        while (i < L.length && !/^```/.test(L[i])) code.push(L[i++]);
        i++; out.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>'); continue;
      }
      if ((m = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(ln))) {               // a list item; two spaces of indent = one level deeper
        var lvl = Math.floor(m[1].length / 2) + 1, tag = /\d/.test(m[2]) ? 'ol' : 'ul';
        if (lvl > stack.length) { while (stack.length < lvl) { out.push('<' + tag + '>'); stack.push(tag); } out.push('<li>' + mdInline(m[3])); }
        else { closeTo(lvl); out.push('</li><li>' + mdInline(m[3])); }
        i++; continue;
      }
      if (stack.length && /^\s{2,}\S/.test(ln)) { out.push('<br>' + mdInline(ln.trim())); i++; continue; }   // a wrapped list line
      closeTo(0);
      if (!ln.trim()) { i++; continue; }
      if ((m = /^(#{1,6})\s+(.*)$/.exec(ln))) { var h = Math.min(6, Math.max(4, m[1].length + 1)); out.push('<h' + h + '>' + mdInline(m[2]) + '</h' + h + '>'); i++; continue; }
      if (/^-{3,}\s*$/.test(ln)) { i++; continue; }
      if (/^\|/.test(ln)) {                                            // a table
        var rows = []; while (i < L.length && /^\|/.test(L[i])) rows.push(L[i++]);
        var cells = function (r) { return r.replace(/^\||\|\s*$/g, '').split('|').map(function (c) { return c.trim(); }); };
        var head = cells(rows[0]), bodyRows = rows.slice(/^\|[\s:|-]+\|?\s*$/.test(rows[1] || '') ? 2 : 1);
        out.push('<div class="ix-tblw"><table><thead><tr>' + head.map(function (c) { return '<th>' + mdInline(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          bodyRows.map(function (r) { return '<tr>' + cells(r).map(function (c) { return '<td>' + mdInline(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>'); continue;
      }
      if (/^>\s?/.test(ln)) { var q = []; while (i < L.length && /^>\s?/.test(L[i])) q.push(L[i++].replace(/^>\s?/, '')); out.push('<blockquote>' + mdInline(q.join(' ')) + '</blockquote>'); continue; }
      var para = [ln]; i++;
      while (i < L.length && L[i].trim() && !/^(#{1,6}\s|```|\||>|\s*([-*]|\d+\.)\s)/.test(L[i])) para.push(L[i++]);
      out.push('<p>' + mdInline(para.join(' ')) + '</p>');
    }
    closeTo(0); return out.join('');
  }
  function clParse(md) {
    var secs = [], cur = null, fence = false;
    String(md).replace(/\r/g, '').split('\n').forEach(function (ln) {
      if (/^```/.test(ln)) fence = !fence;
      var m = !fence && /^## (.+)$/.exec(ln);
      if (m) { cur = { title: m[1].trim(), lines: [] }; secs.push(cur); } else if (cur) cur.lines.push(ln);
    });
    var map = {}, entries = [], notes = [];
    secs.forEach(function (x) {
      var body = x.lines.join('\n').replace(/\n-{3,}\s*$/, '').replace(/^\s+|\s+$/g, '');
      if (x.title === 'Version Map') {
        body.split('\n').forEach(function (r) { var c = /^\|\s*([^|]+?)\s*\|\s*(.+?)\s*\|\s*$/.exec(r); if (c && c[1] !== 'Version' && !/^-+$/.test(c[1])) map[c[1]] = c[2]; });
        x.mapRows = body.split('\n').filter(function (r) { return /^\|/.test(r); }).slice(2).map(function (r) { var c = /^\|\s*([^|]+?)\s*\|\s*(.+?)\s*\|\s*$/.exec(r); return c ? [c[1], c[2]] : null; }).filter(Boolean);
        CL.mapRows = x.mapRows;
      } else if (/^\d/.test(x.title)) {
        var d = /^(\S+?)(?:\s*\((\d{4}-\d{2}-\d{2})\))?(?::\s*(.*))?$/.exec(x.title) || [x.title, x.title];
        var firstWord = x.title.split(/\s|:/)[0];
        entries.push({ ver: firstWord, title: x.title, date: d[2] || '', label: d[3] || '', body: body });
      } else notes.push({ title: x.title, body: body });
    });
    entries.forEach(function (e) { e.summary = map[e.ver] || map[e.title] || ''; });
    return { entries: entries, notes: notes };
  }
  function clLoad() {
    if (CL && CL.entries) return Promise.resolve(CL);
    return api('changelog').then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || 'Could not load the changelog.');
      CL = { version: j.version, time: j.time, mapRows: [] };
      var r = clParse(j.md); CL.entries = r.entries; CL.notes = r.notes;
      return CL;
    });
  }
  function clFail(p) { return function (e) { p.innerHTML = '<div class="ix-empty"><span class="ix-empty-i">' + svg(ICON.warn) + '</span><b>Could Not Load the Changelog</b><p>' + esc(e && e.message || 'Can\'t reach the server.') + '</p></div>'; }; }
  // (1.76.0) tags for a version, from its ### headings: New, Fixes, or the heading itself (Settings, Files, Security…)
  var CLTAGS = ['New', 'Fixes', 'Settings', 'Files', 'Security'];
  function clTags(e) {
    var seen = [], out = [];
    String(e.body).split('\n').forEach(function (ln) {
      var m = /^### (.+)$/.exec(ln); if (!m) return;
      var t = m[1].trim(); if (/^(added|new)\b/i.test(t)) t = 'New'; else if (/^fix/i.test(t)) t = 'Fixes';
      if (seen.indexOf(t) < 0) { seen.push(t); out.push(t); }
    });
    return out;
  }
  function clDay(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return ''; return +m[3] + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[2] - 1]; }
  function pChangelog(p) {
    p.innerHTML = spinRow('Reading the changelog…');
    clLoad().then(function (cl) {
      var cur = cl.version, shown = cl.entries, now = shown.filter(function (x) { return x.ver === cur; })[0] || shown[0];
      var groups = [], gi = {};
      shown.forEach(function (e, i) {
        var k = e.ver.split('.').slice(0, 2).join('.'); if (!(k in gi)) { gi[k] = groups.length; groups.push({ k: k, rows: [] }); }
        groups[gi[k]].rows.push(i);
      });
      var curKey = now ? now.ver.split('.').slice(0, 2).join('.') : '';
      var row = function (e, i) {
        return '<details class="ix-cl' + (e.ver === cur ? ' cur' : '') + '" data-i="' + i + '"><summary><span class="ix-cl-l"><span class="ix-cl-v">' + esc(e.ver) + '</span>' +
          (e.date ? '<span class="ix-cl-date">' + esc(clDay(e.date)) + '</span>' : '') + '</span><span class="ix-cl-m"><span class="ix-cl-d">' + mdInline(e.summary || e.label || '') + '</span><span class="ix-cl-tags">' +
          (e.ver === cur ? '<span class="ix-sd ix-sd-live">Installed</span>' : '') +
          clTags(e).slice(0, 3).map(function (t) { return '<span class="ix-cl-tag">' + esc(t) + '</span>'; }).join('') + '</span></span></summary><div class="ix-cl-b ix-md"></div></details>';
      };
      p.innerHTML = (now ? '<div class="ix-hero ix-clhero"><span class="ix-hero-i good">' + svg(ICON.log) + '</span><div class="ix-hero-t"><div class="ix-hero-h">You Have Version ' + esc(cur) + '</div>' +
          '<p>' + mdInline(now.summary || now.label || 'Read what is in this version.') + '</p></div><button type="button" class="ix-btn pri" id="ix-clnow">Read the Notes</button></div>' : '') +
        '<div class="ix-cl-bar"><div class="ix-cl-search">' + svg(ICON.search) + '<input type="search" id="ix-clq" placeholder="Search the Changelog" aria-label="Search the Changelog" autocomplete="off" spellcheck="false"></div>' +
          '<button type="button" class="ix-btn" id="ix-clall">Expand All</button><button type="button" class="ix-btn" id="ix-clnone">Collapse All</button></div>' +
        '<div class="ix-clchips" role="group" aria-label="Filter by kind"><button type="button" class="ix-fchip on" data-t="">All</button>' +
          CLTAGS.map(function (t) { return '<button type="button" class="ix-fchip" data-t="' + t + '">' + t + '</button>'; }).join('') + '</div>' +
        '<div class="ix-pcount" id="ix-clcount" aria-live="polite"></div>' +
        '<div id="ix-cll">' + groups.map(function (g) {
          var first = shown[g.rows[0]];
          return '<details class="ix-cg" data-k="' + g.k + '"' + (g.k === curKey ? ' open' : '') + '><summary><span class="ix-cg-v">' + esc(g.k) + '</span><span class="ix-cg-n">' + g.rows.length + (g.rows.length === 1 ? ' version' : ' versions') +
            (first.date ? ' · ' + esc(clDay(first.date)) + ' ' + first.date.slice(0, 4) : '') + '</span></summary><div class="ix-cg-b">' + g.rows.map(function (i) { return row(shown[i], i); }).join('') + '</div></details>';
        }).join('') + '</div>' +
        '<p class="ix-note ix-pnone" id="ix-clnone2" hidden>Nothing in the changelog matches that. Try a shorter word.</p>';
      var rows = [].slice.call(p.querySelectorAll('details.ix-cl')), grps = [].slice.call(p.querySelectorAll('details.ix-cg')), kind = '';
      var fill = function (d) { var b = d.querySelector('.ix-cl-b'); if (!b.dataset.done) { b.innerHTML = mdBlocks(shown[+d.dataset.i].body); b.dataset.done = '1'; } };
      rows.forEach(function (d) { d.addEventListener('toggle', function () { if (d.open) fill(d); }); });
      var q = p.querySelector('#ix-clq');
      var filter = function () {
        var t = q.value.trim().toLowerCase(), n = 0, narrowed = !!(t || kind);
        rows.forEach(function (d) {
          var e = shown[+d.dataset.i], tags = clTags(e), hit = (!t || (e.title + ' ' + e.summary + ' ' + e.body).toLowerCase().indexOf(t) >= 0) && (!kind || tags.indexOf(kind) >= 0);
          d.hidden = !hit; if (hit) n++;
          if (t && hit && n <= 6) { d.open = true; fill(d); }
        });
        grps.forEach(function (g) { var any = [].some.call(g.querySelectorAll('details.ix-cl'), function (d) { return !d.hidden; }); g.hidden = !any; if (narrowed && any) g.open = true; });
        p.querySelector('#ix-clcount').textContent = narrowed ? n + ' of ' + rows.length + ' versions match' : '';
        p.querySelector('#ix-clnone2').hidden = n > 0;
      };
      q.oninput = filter;
      [].forEach.call(p.querySelectorAll('.ix-fchip'), function (c) { c.onclick = function () { kind = c.dataset.t; [].forEach.call(p.querySelectorAll('.ix-fchip'), function (x) { x.classList.toggle('on', x === c); }); filter(); }; });
      p.querySelector('#ix-clall').onclick = function () { grps.forEach(function (g) { if (!g.hidden) g.open = true; }); rows.forEach(function (d) { if (!d.hidden) { d.open = true; fill(d); } }); };
      p.querySelector('#ix-clnone').onclick = function () { rows.forEach(function (d) { d.open = false; }); grps.forEach(function (g) { g.open = false; }); };
      var reveal = function (want) {
        var hit = rows.filter(function (d) { return shown[+d.dataset.i].ver === want; })[0] || rows.filter(function (d) { return shown[+d.dataset.i].ver.indexOf(want) === 0; })[0];
        if (!hit) return; hit.closest('details.ix-cg').open = true; hit.open = true; fill(hit);
        setTimeout(function () { hit.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60);
      };
      var nb = p.querySelector('#ix-clnow'); if (nb) nb.onclick = function () { reveal(now.ver); };
    }).catch(clFail(p));
  }

  /* ---------- Features (1.76.0): a showcase of what the site offers, page by page (the same words as the website's feature pages).
     It holds no settings: each page keeps its own (Files Settings in Files, Home Settings in Home, and so on). ---------- */
  var FEATS = [
    { id: "home", name: "Home", c: "#3b82f6", ic: ICON.home, url: "web/home/",
      lead: "Your own start page: a clock, your day in frosted-glass widgets, and background photos that change. Show it with the bar, or without it.",
      hl: [["Widgets, just for you", "Today's tasks with Quick Add, a countdown, a note from Info, recent tools, a calendar, a scratch pad, a quote, world clocks and the weather. Visitors see only the clock."],
        ["Photos with credit", "Each photo keeps its credit in the corner."],
        ["Phone-sized copies", "Large photos get a smaller copy for phones, so the page opens quickly."],
        ["With or without the bar", "Show the start page full screen, or keep the bar. It is a setting in Settings, Appearance, Look."],
        ["Search from anywhere", "Press / or Ctrl+K on any page to search Links, Info, Tasks and Tools at once."],
        ["Animated designs", "Sixteen backgrounds drawn live, from React Bits: light, galaxies, waves and more. Choose which take turns and change their colours. The heaviest are for computers only."],
        ["Glass your way", "Home Settings sets the glass: Light, Dark or Solid, how see-through, and how much it blurs."],
        ["Pull for a new photo", "On a phone, pull down from the top for the next background."]] },
    { id: "links", name: "Links", c: "#22c55e", ic: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7', url: "web/links/",
      lead: "Bookmarks in tabs and categories, with icons saved on your server. Bring yours from any browser in a minute.",
      hl: [["Import with a preview", "Pick the file, see how many links and which folders become which categories, then choose a new tab or an existing one. Links you already have are not added twice."],
        ["Easy to undo", "A copy of Links is kept just before an import, in Settings, Backup and Restore, Earlier Versions."],
        ["Colours and sizes", "Each tab can have its own column colours and text sizes."],
        ["Encrypted tabs", "Tabs can be encrypted with your passphrase. The keys are made in your browser."],
        ["See which links you open most", "Each link shows how often it was opened, at the end of its row. Only you see the numbers; links in encrypted tabs are never counted."],
        ["One bar while you edit", "Press the pencil, choose Edit This Page, and Colors, Fetch Icons, Import Bookmarks and Links Settings sit in one bar at the bottom."]] },
    { id: "info", name: "Info", c: "#a855f7", ic: ICON.log, url: "web/info/",
      lead: "Notes in tabs. Each tab holds 1 to 12 boxes, or is written as one document with an outline.",
      hl: [["Boxes you can size and arrange", "Each tab holds 1 to 12 boxes. Resize them and put them where you want."],
        ["Cards or a document", "Arrange boxes as cards, or write the tab as one document with an outline."],
        ["Export as PDF or text", "Export one tab, or all of them."],
        ["Found by search", "Search covers the text of your notes, not only their titles."],
        ["Undo after a delete", "Delete a box or a tab by mistake and a message offers Undo for 7 seconds. It comes back with its text, also in a locked tab."],
        ["Settings in one window", "Info Settings holds privacy, text sizes and how the edit bar looks."]] },
    { id: "cards", name: "Cards", c: "#ec4899", ic: 'M3 6h18v12H3zM3 10h18', url: "web/cards/",
      lead: "Your cards in a table you can search and filter, with the yearly charges added up.",
      hl: [["One searchable table", "Search your cards, and filter by bank, network, type and holder."],
        ["Yearly charges added up", "See what your cards cost you in a year."],
        ["Export to Excel", "Take a copy whenever you need one."],
        ["Sent only after login", "Card data is not sent to a browser until you are logged in."],
        ["Holders and Banks", "One window to rename or add the people your cards belong to, and one for every bank: its name, the link it opens, and how many cards."]] },
    { id: "tasks", name: "Tasks", c: "#f59e0b", ic: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9', url: "web/tasks/",
      lead: "Add a task in plain words, set it to repeat, and let Telegram nudge you with Done, Skip and Snooze.",
      hl: [["Add in plain words", "Type a name, a price and how often, like Netflix 649 monthly 5 Nov, and the task fills itself in."],
        ["Calendar and analytics", "See your tasks on a calendar, and how they add up in Analytics."],
        ["Done, Skip or Snooze on Telegram", "Handle a reminder from the message itself: snooze for 1 hour, 3 hours or until tomorrow."],
        ["Year in Review", "A PDF that looks back over your year of bills, renewals and chores."],
        ["Calendar Link", "Turn it on in Tasks Settings for a secret link, and your tasks show up in Google Calendar, Apple Calendar or Outlook. A new link ends the old one."],
        ["Tasks Settings", "Your currency, when a task counts as due soon, what the page opens on, and how dates look."]] },
    { id: "files", name: "Files", c: "#0ea5e9", ic: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', url: "web/files/",
      lead: "Keep documents, photos and anything else on your own server, in folders you name. Each file is locked in your browser before it is sent, so the server only ever holds scrambled data.",
      hl: [["Suggested for You", "Your newest files sit above the list as cards, so what you were just working on is one click away.", 1], ["Point and act", "Share, Download and Star appear when you point at a row, and the list says who can see each file.", 1], ["Folders, search and preview", "Make folders, search by name, and open a picture, a PDF or a text file without downloading it. A folder downloads as one zip."],
        ["Locked before it leaves your browser", "Every file has its own key, and the name is locked too. Your passphrase unlocks them; the server never gets it."],
        ["Share links you control", "Make a link for one file and choose when it ends. The key sits after the # in the address, so it is never sent to your server. Switch share links off to end them all."],
        ["Starred and Recent", "Star the files you reach for, and see the newest ones under Recent."],
        ["Share from your phone", "In the installed app on Android, share a photo or a file to Homebase Hub and save it to Files, or open it in Tools."],
        ["Files Settings", "The storage limit, share links on or off, and how long the Trash keeps things."]] },
    { id: "tools", name: "Tools", c: "#14b8a6", ic: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.6-.6-.6-2.6z', url: "web/tools/",
      lead: "Resize and convert images, merge and sign PDFs, work out loans and savings, make invoices, scan QR codes and more. Search, star your favourites and get on with your day.",
      hl: [["Heavy engines load on demand", "OCR, background removal and PDF encryption load only when a tool needs them."],
        ["Favourites and your own order", "Star favourites, drag tools to reorder them or move them between sections, and hide the ones you never use."],
        ["Side menu or tabs", "Show the sections as a side menu, or as tabs on top. Phones always get tabs."],
        ["Search them all", "Find a tool by name or by what it does."],
        ["Calculators and documents", "Loans, savings, deposits, percentages, dates, units and amounts in words; invoices as PDF, text compare, Markdown and spreadsheets."],
        ["Saved presets", "Keep a signature, a watermark, a QR style, image sizes or your business details on your server, while logged in. They are in your backups too."]] }
  ];
  // (1.77.3) where each page keeps its settings: buttons on the page's Features tab that open them
  var REL = { home: [['Look', 'look'], ['Colors', 'colors'], ['Glass', 'glass']],
    links: [['Back Up Links', 'backup/overview'], ['Export Bookmarks', 'backup/export'], ['Import Bookmarks', 'backup/restore']],
    info: [['Back Up Info', 'backup/overview'], ['Lock Tabs', 'security/encryption']],
    cards: [['Back Up Cards', 'backup/overview'], ['Lock Cards', 'security/encryption']],
    tasks: [['Telegram Messages', 'telegram/messages'], ['Instant Replies', 'telegram/instant-replies']],
    files: [['Encryption', 'security/encryption'], ['Back Up Files', 'backup/overview']],
    tools: [] };
  FEATS.forEach(function (f) { f.rel = REL[f.id] || []; });
  FEATS.forEach(function (f) { PANES['ft-' + f.id] = function (p) { pFeature(p, f); }; PANE_FN.set('ft-' + f.id, PANES['ft-' + f.id]); });   // (the tabs themselves are listed in SECTIONS)
  /* (1.79.0) Turn Off What You Don't Use: a switch for each page that can go. Off is for real: the page and what it runs stop, and Telegram's settings hide. Your data stays. */
  var OFFS = [['telegram', 'Telegram', 'The bot, reminders, Telegram backups and login approval stop. The Telegram settings hide.'], ['tasks', 'Tasks', 'The page and its reminders stop.'], ['cards', 'Cards', 'The page stops.'],
    ['files', 'Files', 'The page and its share links stop.'], ['tools', 'Tools', 'The page stops.']];
  function applyOff() { var off = S.off || [], b = PAGE && PAGE.querySelector('[data-sec=telegram]'); if (b) b.hidden = off.indexOf('telegram') >= 0; }
  function offCard() {
    var off = S.off || [];
    return ecCard('', ICON.gear, 'Turn Off What You Do Not Use', 'Off is for real, not only hidden: the page stops answering and what it runs in the background stops. Your data stays, and turning it on again brings everything back.',
      '<div class="ix-offl">' + OFFS.map(function (o) {
        return '<label class="ix-tg"><span>' + o[1] + '<small>' + o[2] + '</small></span><input type="checkbox" data-off="' + o[0] + '"' + (off.indexOf(o[0]) < 0 ? ' checked' : '') + ' aria-label="' + o[1] + ' is on"></label>';
      }).join('') + '</div><p class="ix-err" id="ix-offe"></p>');
  }
  function bindOff(p) {
    p.querySelectorAll('[data-off]').forEach(function (c) {
      c.onchange = function () {
        var off = [].slice.call(p.querySelectorAll('[data-off]')).filter(function (x) { return !x.checked; }).map(function (x) { return x.dataset.off; }), er = p.querySelector('#ix-offe');
        er.textContent = '';
        api('features_off', { off: off }).then(function (j) {
          if (!j.ok) { c.checked = !c.checked; er.textContent = j.error || 'Could not save.'; return; }
          S.off = j.state.off || []; remember(S); applyOff(); redraw();
          toast((c.checked ? '' : 'Turned off: ') + (OFFS.filter(function (o) { return o[0] === c.dataset.off; })[0] || [0, ''])[1] + (c.checked ? ' is on again.' : '.'));
        }, function () { c.checked = !c.checked; er.textContent = "Can't reach the server. Nothing was changed."; });
      };
    });
  }
  function pFeatures(p) {
    p.innerHTML = offCard() + '<div class="ix-rcl">' + FEATS.map(function (f) {
      return rowCard({ ic: f.ic, color: f.c, title: esc(f.name) + (f.hl.some(function (h) { return h[2]; }) ? ' <span class="ix-cl-tag">New</span>' : ''), desc: esc(f.lead),
        act: '<a class="ix-btn" href="' + K.ROOT + f.url + '">Open</a><button type="button" class="ix-btn" data-ft="' + f.id + '">See More</button>' });
    }).join('') + '</div>';
    p.querySelectorAll('[data-ft]').forEach(function (b) { b.onclick = function () { subPane('ft-' + b.dataset.ft); }; });
    bindOff(p);
    // (1.77.2) the notes that used to be a tab of What's New (how updating works and a few things worth knowing), as the same row cards
    var nb = document.createElement('div'); p.appendChild(nb);
    clLoad().then(function (cl) {
      if (!cl.notes.length) return;
      nb.innerHTML = '<div class="ix-sect">Good to Know</div><div class="ix-rcl">' + cl.notes.map(function (x, i) {
        return rowCard({ ic: ICON.info, title: esc(x.title), act: '<button type="button" class="ix-btn" data-note="' + i + '" aria-expanded="false">Read</button>', body: '<div class="ix-md">' + mdBlocks(x.body) + '</div>', hide: true });
      }).join('') + '</div>';
      nb.querySelectorAll('[data-note]').forEach(function (b) { b.onclick = function () {
        var x = b.closest('.ix-rc').querySelector('.ix-rc-x'), open = x.hidden; x.hidden = !open; b.textContent = open ? 'Hide' : 'Read'; b.setAttribute('aria-expanded', open ? 'true' : 'false'); }; });
    }).catch(function () {});
    // (1.77.2) Install on Your Phone, Keyboard Shortcuts and Offline Reading moved here from Start Here: they are help about the site, not setup
    var hb = document.createElement('div'); hb.className = 'ix-help'; p.appendChild(hb); helpCards(hb);
  }
  function pFeature(p, f) {
    p.innerHTML = '<div class="ix-fhero" style="--fc:' + f.c + '"><span class="ix-fhero-i" style="background:' + f.c + '">' + svg(f.ic) + '</span><div class="ix-fhero-t"><div class="ix-fhero-h">' + esc(f.name) + '</div><p>' + esc(f.lead) + '</p></div>' +
      '<a class="ix-btn pri" href="' + K.ROOT + f.url + '">Open ' + esc(f.name) + '</a></div>' +
      '<div class="ix-fhl">' + f.hl.map(function (h, i) { return '<div class="ix-fhl-c" style="--fc:' + f.c + '"><span class="ix-fhl-n">' + (i + 1) + '</span><div><b>' + esc(h[0]) + (h[2] ? ' <span class="ix-cl-tag">New</span>' : '') + '</b><p>' + esc(h[1]) + '</p></div></div>'; }).join('') + '</div>';
    if (f.rel.length) {
      var rb = document.createElement('div'); rb.className = 'ix-frel';
      rb.innerHTML = '<h3>Related Settings</h3><p>Where ' + esc(f.name) + ' keeps its settings.</p><div class="ix-row">' + f.rel.map(function (r) { return '<button type="button" class="ix-btn" data-rel="' + r[1] + '">' + esc(r[0]) + '</button>'; }).join('') + '</div>';
      p.appendChild(rb);
      rb.querySelectorAll('[data-rel]').forEach(function (b) { b.onclick = function () { go(b.dataset.rel); }; });
    }
  }
  /* ---------- Updates ---------- */
  function rnd16() { var a = new Uint8Array(8); crypto.getRandomValues(a); return [].map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function pUpdate(p) {
    p.innerHTML = '<p class="ix-ld">Looking at what this server allows…</p>';
    api('update_status').then(function (st) {
      if (!st.ok) { p.innerHTML = '<p class="ix-err">' + esc(st.error || 'Could not load.') + '</p>'; return; }
      drawUpdate(p, st, null);
    }, function () { p.innerHTML = '<p class="ix-err">Can\'t reach the server.</p>'; });
  }

  function ghCard(st) {
    var g = st.gh || {}, l = g.latest, h = '';
    if (!g.curl) h += '<div class="ix-status"><span>!</span><span>This server\'s PHP has no curl, so it cannot reach GitHub. You can still update by uploading a zip below.</span></div>';
    if (g.newer && l) {
      h += '<div class="ix-status"><span class="ix-ok">✓</span><span><b>Version ' + esc(l.version) + ' Is Available.</b> ' + (l.published ? '<small>Published ' + esc(l.published.slice(0, 10)) + '.</small> ' : '') + esc(l.notes || '') + '</span></div>' +
        (g.phpOk ? '<div class="ix-row"><button type="button" class="ix-btn pri" id="ix-ghi">Download and Check Version ' + esc(l.version) + '</button></div>' +
          '<p class="ix-note">Nothing on your site changes yet. The download is checked against the SHA-256 GitHub lists, then goes through the same checks as an uploaded zip. You review the changes and type your website password to apply it.</p>'
          : '<div class="ix-status"><span>!</span><span>Version ' + esc(l.version) + ' needs PHP ' + esc(l.minPhp) + ' or newer; this server has ' + esc(st.php) + '.</span></div>');
    } else if (l) h += '<p>You have the newest version (<b>' + esc(st.version) + '</b>).</p>';
    else if (!g.err) h += '<p>Press Check Now to look for a newer version.</p>';
    if (g.err) h += '<p class="ix-err">Couldn\'t check: ' + esc(g.err) + '</p>';
    h += '<p class="ix-err" id="ix-ghe"></p><div class="ix-row"><button type="button" class="ix-btn" id="ix-ghc"' + (g.curl ? '' : ' disabled') + '>Check Now</button><span class="ix-mu">' + (g.at ? 'Last checked ' + esc(ago(g.at)) : 'Not checked yet') + '</span></div>' +
      '<label class="ix-tg"><span>Check GitHub Once a Day<small>The site asks GitHub whether a new version is out.</small></span><input type="checkbox" id="ix-gha"' + (g.auto ? ' checked' : '') + '></label>' +
      '<p class="ix-note">Off: GitHub is asked only when you press Check Now. Nothing ever installs by itself.</p>';
    return '<section class="ix-card"><div class="ix-cardh"><h3>Update From GitHub</h3><span class="ix-mu">Installed: <b>' + esc(st.version) + '</b>' + (/^[\w.-]+\/[\w.-]+$/.test(g.repo || '') ? ' · <a href="https://github.com/' + esc(g.repo) + '" target="_blank" rel="noopener">Project on GitHub</a>' : '') + '</span></div>' + h + '</section>';
  }
  function ghWire(p, st) {
    var e = function (m) { var x = p.querySelector('#ix-ghe'); if (x) x.textContent = m || ''; };
    var c = p.querySelector('#ix-ghc'), a = p.querySelector('#ix-gha'), i = p.querySelector('#ix-ghi');
    if (c) c.onclick = function () { c.disabled = true; c.textContent = 'Checking…'; api('gh_check', {}).then(function (j) { if (j && j.repo) st.gh = j; drawUpdate(p, st, null); }, function () { c.disabled = false; c.textContent = 'Check Now'; e('Can\'t reach the server.'); }); };
    if (a) a.onchange = function () { api('gh_auto', { on: a.checked }).then(function (j) { if (j && j.repo) st.gh = j; }); };
    if (i) i.onclick = function () {
      i.disabled = true; i.textContent = 'Downloading and Checking…'; e('');
      api('gh_install', {}).then(function (j) {
        if (!j.ok) { i.disabled = false; i.textContent = 'Download and Check Version ' + st.gh.latest.version; e(j.error || 'The download did not work.'); return; }
        drawUpdate(p, st, j);
      }, function () { i.disabled = false; i.textContent = 'Download and Check Version ' + st.gh.latest.version; e('Lost the connection while downloading. Nothing was changed.'); });
    };
    if (st.gh && st.gh.auto && st.gh.due && st.gh.curl && !st.ghTried) { st.ghTried = true; api('gh_check', { auto: true }).then(function (j) { if (j && j.repo) { st.gh = j; drawUpdate(p, st, null); } }); }
  }
  function drawUpdate(p, st, chk) {
    var staged = (chk && chk.staged) || st.staged, plan = (chk && chk.plan) || st.plan, last = st.last, prev = st.previous;
    var problems = [];
    if (!st.canInflate) problems.push('This server cannot unpack zip files (PHP\'s zlib is missing). Ask your host to turn it on.');
    if (st.unwritable && st.unwritable.length) problems.push('The site is not allowed to change files in <code>' + st.unwritable.map(esc).join('</code>, <code>') + '</code>. Ask your host to allow it, or update with the File Manager.');
    if (!st.hasManifest) problems.push('This copy of the site has no file list yet, so it cannot tell which files are its own. Update once with the File Manager; after that the site can update itself.');
    var steps = ['Upload the Zip', 'Check it', 'Review the Changes', 'Apply'], at = staged ? 3 : 1;
    var stepsHtml = stepBar(steps, at - 1, { locked: true, done: steps.map(function (t, i) { return i + 1 < at; }) });   // (1.66.0) the shared step bar
    var changes = function (k, label) { var l = (plan && plan[k]) || []; return '<div class="ix-chg ' + k + '"><b>' + l.length + '</b><small>' + label + '</small></div>'; };
    var review = '';
    if (staged) {
      var rows = []; [['updated', 'Updated'], ['new', 'New'], ['removed', 'Removed']].forEach(function (k) { ((plan && plan[k[0]]) || []).slice(0, 60).forEach(function (f) { rows.push('<div class="ix-chr ' + k[0] + '"><span>' + k[1] + '</span><code>' + esc(f) + '</code></div>'); }); });
      review = '<div class="ix-zipcard"><div><b>' + esc(staged.name) + '</b> <span class="ix-mu">· ' + size(staged.size) + ' · version ' + esc(staged.version) + '</span>' +
          '<div class="ix-fp">Fingerprint (SHA-256): <code>' + esc(staged.sha256) + '</code></div></div><button type="button" class="ix-btn" id="ix-uchg">Choose Another</button></div>' +
        (chk && chk.checks ? '<h4>Checked before anything changes</h4><div class="ix-checks">' + chk.checks.map(function (k) { return '<div><span class="' + (k.ok ? 'ix-ok' : 'ix-bad') + '">' + (k.ok ? '✓' : '✗') + '</span><span><b>' + esc(k.title) + '</b> <small>' + esc(k.note) + '</small></span></div>'; }).join('') + '</div>'
          : '<p class="ix-note">This update passed every check when you uploaded it.</p>') +
        (chk && chk.relation === 'same' ? '<p class="ix-note"><b>This is the same version you have.</b> Applying it repairs your files.</p>' : '') +
        ((chk && chk.notes) || st.notes ? '<h4>What Is in This Update</h4><div class="ix-md ix-newbody">' + mdBlocks((chk && chk.notes) || st.notes) + '</div>' : '') +
        '<h4>What Will Change</h4><div class="ix-chgs">' + changes('updated', 'files updated') + changes('new', 'new files') + changes('removed', 'old files removed') + '<div class="ix-chg zero"><b>0</b><small>of your data touched</small></div></div>' +
        (rows.length ? '<details class="ix-more"><summary>Show the Files</summary><div class="ix-chl">' + rows.join('') + '</div></details>' : '') +
        '<p class="ix-note">Never touched: <b>site-data</b> (all your data), <b>web/hub/media</b> (your pictures and logo), <b>web/hub/core/config.php</b> and the Tools settings made from your settings.' + (chk && chk.noOldList ? ' This copy had no file list, so no old files can be removed this time.' : '') + '</p>' +
        '<div class="ix-apl"><label for="ix-upw">Website Password</label><div class="ix-row"><input type="password" id="ix-upw" autocomplete="current-password" placeholder="Needed to change the site\'s code" style="max-width:340px"><button type="button" class="ix-btn pri" id="ix-uap">Apply Update</button><button type="button" class="ix-btn" id="ix-ucn">Cancel</button></div></div>' +
        '<label class="ix-tg"><span>Go Back by Itself<small>Returns to the old version if the site stops answering.</small></span><input type="checkbox" id="ix-uauto"' + (st.autoUndo ? ' checked' : '') + '></label>' +
        '<p class="ix-err" id="ix-ue"></p>';
    } else {
      review = '<label class="ix-dropz" id="ix-udz"><input type="file" id="ix-ufile" accept=".zip,application/zip"><b>Drop the Update Zip Here</b><span>or click to choose it</span></label>' +
        '<p class="ix-note">Only use a zip from a source you trust: it replaces the site\'s own code. After the check you see its fingerprint (SHA-256), which you can compare with the one you were given.</p><div class="ix-upm" id="ix-upm"></div>';
    }
    p.innerHTML =
      (staged ? '' : ghCard(st)) +
      '<section class="ix-card"><div class="ix-cardh"><h3>Update the Site</h3><span class="ix-mu">Installed: <b>' + esc(st.version) + '</b>' + (last ? ' · ' + (last.how === 'back' ? 'went back to ' : 'updated to ') + esc(last.version) + ' ' + esc(ago(last.at)) : '') + '</span></div>' +
        problems.map(function (m) { return '<div class="ix-status"><span>!</span><span>' + m + '</span></div>'; }).join('') + stepsHtml + review + '</section>' +
      '<section class="ix-card"><div class="ix-cardh"><h3>Go Back</h3></div>' + (prev
        ? '<p>Version <b>' + esc(prev.version) + '</b> was saved ' + esc(ago(prev.at)) + ' (' + size(prev.bytes) + '). Going back does not change your data.</p><div class="ix-apl"><label for="ix-bpw">Website Password</label><div class="ix-row"><input type="password" id="ix-bpw" autocomplete="current-password" style="max-width:340px"><button type="button" data-hold class="ix-btn" id="ix-ubk">Go Back to ' + esc(prev.version) + '</button></div></div><p class="ix-err" id="ix-be"></p>'
        : '<p>Nothing is saved yet. The first update saves the version you have now, so you can come back to it in one click.</p>') + '</section>';
    if (!staged) ghWire(p, st);
    var dz = p.querySelector('#ix-udz');
    if (dz) {
      var up = function (file) {
        var box = p.querySelector('#ix-upm'), piece = st.chunk || 1048576, n = Math.max(1, Math.ceil(file.size / piece)), id = rnd16(), i = 0;
        box.className = 'ix-upm';
        if (!/\.zip$/i.test(file.name)) { box.className = 'ix-err ix-upm'; box.textContent = 'Choose the site update zip (a file ending in .zip).'; return; }
        (function next() {
          if (i >= n) { box.textContent = 'Checking the update…'; return api('update_check', { name: file.name }).then(function (j) { if (!j.ok) { box.className = 'ix-err ix-upm'; box.textContent = j.error || 'The check failed.'; return; } drawUpdate(p, st, j); }); }
          box.textContent = 'Uploading… ' + Math.round(100 * i / n) + '%';
          return fetch(CORE + 'api.php?action=update_chunk&id=' + id + '&i=' + i + '&n=' + n, { method: 'POST', credentials: 'same-origin', headers: { 'X-Hub-CSRF': S.csrf, 'Content-Type': 'application/octet-stream' }, body: file.slice(i * piece, (i + 1) * piece) })
            .then(function (r) { return r.json(); }).then(function (j) { if (!j.ok) throw new Error(j.error || 'The upload failed.'); i++; return next(); });
        })().catch(function (e) { box.className = 'ix-err ix-upm'; box.textContent = e.message || 'The upload failed.'; });
      };
      p.querySelector('#ix-ufile').onchange = function (e) { if (e.target.files[0]) up(e.target.files[0]); };
      ['dragenter', 'dragover'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('over'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('over'); }); });
      dz.addEventListener('drop', function (e) { if (e.dataTransfer.files[0]) up(e.dataTransfer.files[0]); });
    }
    var cancel = function () { api('update_cancel', {}).then(function () { pUpdate(p); }); };
    var ch = p.querySelector('#ix-uchg'); if (ch) ch.onclick = cancel;
    var cn = p.querySelector('#ix-ucn'); if (cn) cn.onclick = cancel;
    var au = p.querySelector('#ix-uauto'); if (au) au.onchange = function () { api('update_autoundo', { on: au.checked }); };
    var run = function (btn, back, pwEl, errEl, label) {
      var pw = pwEl.value; if (!pw) { errEl.className = 'ix-err'; errEl.textContent = 'Type your website password first.'; return; }
      btn.disabled = true; errEl.className = 'ix-note'; errEl.textContent = label + ' This takes a few seconds. Keep this page open.';
      api('update_apply', { password: pw, back: back }).then(function (j) {
        if (j.ok) { errEl.className = 'ix-note ix-ok'; errEl.textContent = '✓ Now on version ' + j.version + (j.selfCheck === 'ok' ? '. The site looked at itself afterwards and answered.' : '.') + (j.removed && j.removed.length ? ' ' + j.removed.length + ' old file' + (j.removed.length > 1 ? 's were' : ' was') + ' removed.' : '') + ' Reloading…'; try { sessionStorage.removeItem('ix-ov'); } catch (e) {} setTimeout(function () { location.reload(); }, 2500); return; }
        btn.disabled = false; errEl.className = 'ix-err'; errEl.textContent = j.error || 'The update did not go through.';
      }, function () { btn.disabled = false; errEl.className = 'ix-err'; errEl.textContent = 'Lost the connection while updating. Wait a minute, reload, and look at the version shown in Overview.'; });
    };
    var ap = p.querySelector('#ix-uap'); if (ap) ap.onclick = function () { run(ap, false, p.querySelector('#ix-upw'), p.querySelector('#ix-ue'), 'Applying the update…'); };
    var bk = p.querySelector('#ix-ubk'); if (bk) bk.onclick = function () { run(bk, true, p.querySelector('#ix-bpw'), p.querySelector('#ix-be'), 'Going back…'); };
  }
  function pFiles(p) {
    p.innerHTML = '<p class="ix-ld">Comparing your server with this version\'s file list…</p>';
    api('files_scan').then(function (j) {
      if (!j.ok) { p.innerHTML = '<p class="ix-err">' + esc(j.error || 'Could not check.') + '</p>'; return; }
      if (j.noList) { p.innerHTML = '<div class="ix-status"><span>!</span><span><b>This copy of the site has no file list yet.</b> Update once with the File Manager (or with the Update tab on a site that has one); after that this tab can show you which files do not belong.</span></div>'; return; }
      var ex = j.extra || [], stat = function (n, label, cls) { return '<div class="ix-chg ' + cls + '"><b>' + n + '</b><small>' + label + '</small></div>'; };
      var list = ex.map(function (e, i) {
        return '<label class="ix-fr"><input type="checkbox" data-i="' + i + '" checked><span class="ix-frp"><code>' + esc(e.path) + '</code><small>' + esc(e.why) + '</small></span><span class="ix-pill ' + (e.tone || '') + '">' + esc(e.tag) + '</span><span class="ix-mu ix-frs">' + size(e.size) + '</span></label>'; }).join('');
      p.innerHTML =
        '<div class="ix-chgs">' + stat(j.matched, 'files match version ' + esc(j.version), 'new') + stat(j.changed.length, 'changed by hand', j.changed.length ? 'updated' : 'zero') + stat(j.missing.length, 'missing', j.missing.length ? 'removed' : 'zero') + stat(ex.length, 'not part of this version', ex.length ? 'updated' : 'zero') + '</div>' +
        (ex.length ? '<section class="ix-card"><div class="ix-cardh"><h3>Files That Do Not Belong</h3><span class="ix-mu"><a href="#" id="ix-fall">Select All</a> · <a href="#" id="ix-fnone">None</a></span></div>' +
          '<p>These are not part of any version of the site. You see the list first and nothing goes until you confirm with your password.</p><div class="ix-frl">' + list + '</div>' +
          '<div class="ix-apl"><label for="ix-fpw">Website Password</label><div class="ix-row"><input type="password" id="ix-fpw" autocomplete="current-password" style="max-width:340px"><button type="button" data-hold class="ix-btn danger" id="ix-fdel">Delete Selected</button></div></div><p class="ix-err" id="ix-fe"></p></section>'
          : '<div class="ix-status"><span class="ix-ok">✓</span><span><b>Nothing on your server is out of place.</b> Every file there belongs to version ' + esc(j.version) + '.</span></div>') +
        (j.changed.length ? '<section class="ix-card"><div class="ix-cardh"><h3>Changed by Hand</h3></div><p>These files differ from what version ' + esc(j.version) + ' ships. If you did not change them yourself, apply the same version again from the Update tab to put them back.</p><div class="ix-frl">' + j.changed.map(function (c) { return '<div class="ix-fr"><span class="ix-frp"><code>' + esc(c.path) + '</code></span><span class="ix-mu ix-frs">' + size(c.size) + '</span></div>'; }).join('') + '</div></section>' : '') +
        (j.missing.length ? '<section class="ix-card"><div class="ix-cardh"><h3>Missing</h3></div><p>These belong to this version but are not on your server. Apply the same version again from the Update tab to bring them back.</p><div class="ix-frl">' + j.missing.map(function (m) { return '<div class="ix-fr"><span class="ix-frp"><code>' + esc(m) + '</code></span></div>'; }).join('') + '</div></section>' : '') +
        (j.other && j.other.length ? '<p class="ix-note">Other items in your site folder (not part of this site, never listed for deletion or touched): ' + j.other.map(function (o) { return '<code>' + esc(o) + '</code>'; }).join(' ') + '</p>' : '') +
        '<p class="ix-note">Never listed or touched: <b>site-data</b>, <b>web/hub/media</b> (your pictures and logo), <b>web/hub/core/config.php</b>. Checked just now in ' + j.ms + ' ms. <a href="#" id="ix-fagain">Check Again</a></p>';
      var again = p.querySelector('#ix-fagain'); if (again) again.onclick = function (e) { e.preventDefault(); pFiles(p); };
      var all = p.querySelector('#ix-fall'); if (all) { all.onclick = function (e) { e.preventDefault(); p.querySelectorAll('.ix-fr input').forEach(function (c) { c.checked = true; }); }; p.querySelector('#ix-fnone').onclick = function (e) { e.preventDefault(); p.querySelectorAll('.ix-fr input').forEach(function (c) { c.checked = false; }); }; }
      var del = p.querySelector('#ix-fdel');
      if (del) del.onclick = function () {
        var er = p.querySelector('#ix-fe'), pick = [].map.call(p.querySelectorAll('.ix-fr input:checked'), function (c) { return ex[+c.dataset.i].path; });
        if (!pick.length) { er.className = 'ix-err'; er.textContent = 'Tick at least one file.'; return; }
        var pw = p.querySelector('#ix-fpw').value; if (!pw) { er.className = 'ix-err'; er.textContent = 'Type your website password.'; return; }
        del.disabled = true; er.className = 'ix-note'; er.textContent = 'Deleting…';
        api('files_delete', { paths: pick, password: pw }).then(function (r) {
          if (!r.ok) { del.disabled = false; del.dataset.armed = ''; del.textContent = 'Delete Selected'; er.className = 'ix-err'; er.textContent = r.error || 'Nothing was deleted.'; return; }
          toast(r.deleted.length + ' file' + (r.deleted.length === 1 ? '' : 's') + ' deleted.' + (r.skipped.length ? ' ' + r.skipped.length + ' could not be.' : '')); pFiles(p);
        }, function () { del.disabled = false; er.className = 'ix-err'; er.textContent = 'Lost the connection. Nothing was deleted.'; });
      };
    }, function () { p.innerHTML = '<p class="ix-err">Can\'t reach the server.</p>'; });
  }

  function saveSettings() {
    var b = $('#ix-save'); if (b.disabled) return; b.disabled = true; b.textContent = 'Saving…';
    var fail = function (msg) { b.disabled = false; b.textContent = 'Save Settings'; $('#ix-sferr').textContent = msg; };
    var send = { siteName: draft.siteName, nav: draft.nav, theme: draft.theme, accent: draft.accent, accentPg: canonAccents(draft.accentPg), look: draft.look, homeBar: draft.homeBar, glass: draft.glass === true, glassFx: canonGfx(draft.glassFx), barHide: draft.barHide !== false, font: draft.font, fontCustom: draft.fontCustom, colors: draft.colors, tools: draft.tools, backupEvery: draft.backupEvery, pages: draft.pages || [], tz: draft.tz || 'Asia/Kolkata' };
    api('settings', { settings: send }).then(function (j) {
      if (!j.ok || !j.state) {
        return fail(j._status === 401 ? 'You were logged out. Log in again, then save.' : j._status === 403 ? 'Security check failed. Reload the page, then save again.' : (j.error || 'Could not save (server answered ' + (j._status || 'nothing') + ').'));
      }
      b.textContent = 'Save Settings'; $('#ix-sferr').textContent = '';
      if (j.state.theme !== S.theme) K.storeTheme(j.state.theme);   // a newly saved theme becomes this browser's theme too (shown on close)
      try { localStorage.setItem('hub-theme-site', j.state.theme); } catch (e) {}
      Object.assign(S, j.state); remember(S); applyAttrs(); applyColors(); applyFont(); applySizes(); redraw();
      draft = JSON.parse(JSON.stringify(S));
      if (curSub) pane(curSub);   // the open section edits the new draft from here on
      var dr = document.getElementById('ix-drawer'); if (dr) dr.remove();   // the phone menu is drawn again with the new tab names
      toast('Settings saved for every page.');
    }, function () { fail("Couldn't reach the server, so nothing was saved. Check your connection and save again."); });
  }

  /* --- Security ---
     One place for everything a password guards. An overview says what your one password protects; each part folds
     open below it. Info's encrypted tabs and backup encryption are managed here too (change, switch, remove), so the
     same password can do it all. The open/closed state of each part is kept while it redraws. */
  var secRefresh = null;
  /* Card, field and chip builders shared by Encryption, Telegram setup and Backup, so they look like one family. */
  function ecCard(cls, icon, title, desc, bodyHtml, pill) {
    return '<section class="ix-ec ' + cls + '"><div class="ix-ec-h">' + (icon ? '<span class="ix-ec-i">' + svg(icon) + '</span>' : '') + '<div><div class="ix-ec-t">' + title + (pill || '') + '</div>' + (desc ? '<div class="ix-ec-d">' + desc + '</div>' : '') + '</div></div>' + (bodyHtml ? '<div class="ix-ec-b">' + bodyHtml + '</div>' : '') + '</section>';
  }
  /* (1.77.2) one row card for every list of things (Features, Good to Know, ...): an icon tile, a title and a line, and what you can do on the right. */
  function rowCard(o) {
    return '<div class="ix-rc' + (o.cls ? ' ' + o.cls : '') + '"' + (o.id ? ' id="' + o.id + '"' : '') + '><span class="ix-rc-i"' + (o.color ? ' style="background:' + o.color + ';color:#fff"' : '') + '>' + svg(o.ic) + '</span><div class="ix-rc-t"><b>' + o.title + '</b>' + (o.desc ? '<small>' + o.desc + '</small>' : '') + '</div>' +
      (o.act ? '<div class="ix-rc-a">' + o.act + '</div>' : '') + (o.body ? '<div class="ix-rc-x"' + (o.hide ? ' hidden' : '') + '>' + o.body + '</div>' : '') + '</div>';
  }
  function ecField(id, label, type, auto, hint, wrapId, extra) {
    return '<div class="ix-fd"' + (wrapId ? ' id="' + wrapId + '" hidden' : '') + '><label for="' + id + '">' + label + '</label><input type="' + type + '" id="' + id + '" autocomplete="' + auto + '"' + (extra || '') + '>' + (hint ? '<small>' + hint + '</small>' : '') + '</div>';
  }
  function ecChip(k, v, good) { return '<span class="ix-chip' + (good ? ' on' : '') + '"><b>' + k + '</b>' + v + '</span>'; }
  /* More building blocks (Security, Telegram and the Changelog share them): a tab header, status tiles, check rows. */
  function tabHead(icon, title, desc) {
    return '<div class="ix-th"><span class="ix-th-i">' + svg(icon) + '</span><div><div class="ix-th-t">' + title + '</div>' + (desc ? '<p class="ix-th-d">' + desc + '</p>' : '') + '</div></div>';
  }
  function tile(go, icon, title, pill, cls, text) {
    return '<button type="button" class="ix-tile ' + (cls || '') + '" data-go="' + go + '"><span class="ix-tile-i">' + svg(icon) + '</span><span class="ix-tile-b"><span class="ix-tile-h"><b>' + title + '</b>' +
      (pill ? '<span class="ix-pill ' + (cls || '') + '">' + esc(pill) + '</span>' : '') + '</span><small>' + text + '</small></span></button>';
  }
  function checkRow(cls, mark, title, text) {
    return '<div class="ix-chkrow ' + cls + '"><span>' + mark + '</span><div>' + (title ? '<b>' + title + '</b>' : '') + (text ? (title ? '<small>' : '<div>') + text + (title ? '</small>' : '</div>') : '') + '</div></div>';
  }
  function spinRow(t) { return '<div class="ix-row"><span class="ix-spin" aria-hidden="true"><i></i><i></i><i></i></span><span>' + (t || 'Loading…') + '</span></div>'; }
  /* how strong a new password looks: length counts most, then mixing letters, digits and symbols */
  function pwScore(s) {
    var n = s.length, kinds = (/[a-z]/.test(s) ? 1 : 0) + (/[A-Z]/.test(s) ? 1 : 0) + (/\d/.test(s) ? 1 : 0) + (/[^A-Za-z0-9]/.test(s) ? 1 : 0);
    if (n < 8) return { pct: 14, cls: 'bad', label: 'Too short: use at least 8 characters' };
    var pts = (n >= 12 ? 1 : 0) + (n >= 16 ? 1 : 0) + (kinds >= 3 ? 1 : 0) + (kinds === 4 ? 1 : 0);
    return pts === 0 ? { pct: 38, cls: 'warn', label: 'Weak: add length or mix in digits and symbols' } : pts === 1 ? { pct: 58, cls: 'warn', label: 'Fair: a few more characters would help' } :
           pts === 2 ? { pct: 80, cls: 'good', label: 'Good' } : { pct: 100, cls: 'good', label: 'Strong' };
  }

  function pSecurity(p) {
    var SECS = [['pw', 'Password'], ['enc', 'Encryption'], ['pk', 'Passkeys'], ['2fa', 'Two-Step Login'],
                ['ap', 'Login Approval'], ['tr', 'Trusted Browsers'], ['dev', 'Devices']];
    p.innerHTML = '<div class="ix-hero" id="ix-sov">' + spinRow('Checking your protections…') + '</div><div class="ix-tiles" id="ix-stiles"></div><div id="ix-schk"></div>' +
      SECS.map(function (x) { return '<details class="ix-acc" data-sec="' + x[0] + '"><summary><span>' + x[1] + '</span><small data-sum="' + x[0] + '">…</small></summary><div class="ix-accb" data-body="' + x[0] + '"></div></details>'; }).join('');
    var body = function (k) { return p.querySelector('[data-body="' + k + '"]'); }, sum = function (k, t) { p.querySelector('[data-sum="' + k + '"]').textContent = t; };
    var acc = function (k) { return p.querySelector('[data-sec="' + k + '"]'); };
    var st = { vault: null, sv: null, svUse: [], pk: [], pkSecure: false, tabs: 0, bk: {}, ap: { trusted: [] } };

    // the site checks: what is good, and a warning for what is not
    p.querySelector('#ix-schk').innerHTML = '<div class="ix-sect">Site Checks</div><div class="ix-checks">' +
      (S.https ? checkRow('', '✓', 'HTTPS Is On', 'What you type travels encrypted, and encrypted tabs can work.')
               : checkRow('warn', '!', 'This Page Is Not Using HTTPS', 'Turn on SSL in your hosting panel, and "Always Use HTTPS" in Cloudflare (if you use it). Encrypted tabs need HTTPS.')) +
      checkRow('', '✓', S.dataOutside ? 'Your Data Is Outside the Site Folder' : 'Your Data Is Locked Away',
               S.dataOutside ? 'It lives in a folder you chose; copy it when you move the site.' : 'It lives in <code>site-data</code> inside the site folder, locked three ways, and travels with the site.') + '</div>';

    function overview() {
      var v = st.vault, bk = st.bk, a = st.ap;
      var have = [['HTTPS', !!S.https, 'Turn on HTTPS (see Site Checks below).'], ['Two-Step Login', !!S.twoStep, 'Turn on Two-Step Login: a stolen password alone then gets nobody in.'],
                  ['Encryption', encOn(), 'Set an encryption passphrase: encrypted tabs and backup files stay private even if someone copies the server.'],
                  ['Recovery Key', !!st.rec, 'Create a recovery key (Encryption): without it a forgotten passphrase means lost encrypted tabs.'],
                  ['Telegram Approval', !!a.on, 'Approve new logins in Telegram: you see every login and can refuse it.']];
      var on = have.filter(function (x) { return x[1]; }).length, todo = have.filter(function (x) { return !x[1]; })[0], total = have.length + 1, count = on + 1, pct = Math.round(count / total * 100);
      p.querySelector('#ix-sov').innerHTML =
        '<div class="ix-ring ' + (todo ? '' : 'ok') + '" style="--p:' + pct + '"><b>' + count + '</b><small>of ' + total + '</small></div>' +
        '<div class="ix-hero-t"><div class="ix-hero-h">' + (todo ? (count / total < 0.5 ? 'Your Site Needs More Protection' : 'A Good Start, With Room to Grow') : 'Everything Recommended Is On') + '</div>' +
          '<p>' + (todo ? '<b>Next best step:</b> ' + esc(todo[2]) : 'Your website password and every extra protection are on. Nothing to do here.') + '</p>' +
          '</div>';   // (1.74.2) the row of status chips is gone: the cards below say the same

      var trN = (a.trusted || []).length;
      p.querySelector('#ix-stiles').innerHTML =
        tile('pw', ICON.key, 'Password', 'Set', 'good', 'One password for every page.') +
        tile('enc', ICON.lock, 'Encryption', encLabel(), encOn() ? 'good' : 'warn', encOn() ? 'Info: ' + (v ? st.tabs + ' locked' : 'none') + ' · Links: ' + (st.lenc ? st.lenc + ' locked' : 'none') + ' · Backups: ' + (bk.set ? 'locked' : 'not locked') + '.' : 'Lock private tabs and backups with one passphrase.') +
        (encOn() ? tile('enc', ICON.shield, 'Recovery Key', st.rec ? 'Created' : 'Not Created', st.rec ? 'good' : 'warn', st.rec ? 'A spare way in if you ever forget the passphrase.' : 'Create one, so a forgotten passphrase does not mean lost tabs.') : '') +
        tile('2fa', ICON.device, 'Two-Step Login', S.twoStep ? 'On' : 'Off', S.twoStep ? 'good' : 'warn', S.twoStep ? S.recoveryLeft + ' recovery ' + (S.recoveryLeft === 1 ? 'code' : 'codes') + ' left.' : 'A 6-digit code from your phone on top of the password.') +
        tile('pk', ICON.device, 'Passkeys', st.pk.length ? st.pk.length + (st.pk.length === 1 ? ' Passkey' : ' Passkeys') : 'None', st.pk.length ? 'good' : '', st.pk.length ? 'Log in with your fingerprint, face or PIN.' : (st.pkSecure ? 'Log in with your fingerprint, face or PIN.' : 'Needs HTTPS.')) +   // (1.61.6) it had a tab but no card
        tile('ap', ICON.send, 'Login Approval', a.on ? 'On' : 'Off', a.on ? 'good' : '', a.on ? 'Every new browser waits for your tap in Telegram.' : (a.telegram ? 'Approve new logins with one tap in Telegram.' : 'Needs the Telegram bot to be set up first.')) +
        tile('tr', ICON.desktop, 'Trusted Browsers', trN ? trN + (trN === 1 ? ' Browser' : ' Browsers') : 'None', '', 'Browsers that skip the code and the tap for 30 days.') +
        tile('dev', ICON.out, 'Devices', '', '', 'Log out every other device in one tap.');
      p.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { var d = acc(b.dataset.go); d.open = true; d.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }; });
      sum('pw', 'Change the one password');
      sum('enc', (encOn() ? 'Passphrase Set' : 'Not Set') + ' · Info tabs: ' + (v ? st.tabs + ' encrypted' : 'none') + ' · Links tabs: ' + (st.lenc ? st.lenc + ' encrypted' : 'none') + ' · Backups: ' + (bk.set ? 'encrypted' : 'not encrypted'));
      sum('pk', st.pk.length ? st.pk.length + (st.pk.length === 1 ? ' passkey' : ' passkeys') : 'None');
      sum('2fa', S.twoStep ? 'On · ' + S.recoveryLeft + ' recovery codes left' : 'Off');
      sum('ap', a.on ? 'On' : 'Off');
      sum('tr', trN ? trN + ' ' + (trN === 1 ? 'browser' : 'browsers') : 'None');
      sum('dev', 'Log Out Other Devices');
    }
    function load() {
      return Promise.all([
        fetch(ROOT + 'web/info/api.php', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
        api('bkkey').catch(function () { return {}; }), api('approval').catch(function () { return {}; }),
        fetch(ROOT + 'web/links/api.php?action=get', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
        api('sv_get').catch(function () { return {}; }), api('pk_list').catch(function () { return {}; })
      ]).then(function (r) {
        var info = r[0];
        st.pk = r[5] && r[5].ok ? r[5].keys : []; st.pkSecure = !!(r[5] && r[5].secure);
        st.sv = r[4] && r[4].ok && r[4].vault && r[4].vault.wrap ? r[4].vault : null; st.svUse = (r[4] && r[4].use) || [];
        st.vault = info && info.page && info.page.vault || null;
        st.info = info; st.tabs = info && info.tabs ? info.tabs.filter(function (t) { return t.enc; }).length : 0;
        st.bk = r[1] && r[1].ok ? r[1] : {}; st.ap = r[2] && r[2].ok ? r[2] : { trusted: [] };
        st.lenc = r[3] && r[3].data && r[3].data.tabs ? r[3].data.tabs.filter(function (t) { return typeof t.enc === 'string'; }).length : 0;
        st.lvault = r[3] && r[3].data && r[3].data.settings && r[3].data.settings.vault && r[3].data.settings.vault.wrap ? r[3].data.settings.vault : null;
        st.rec = !!((st.vault && st.vault.rec) || (st.lvault && st.lvault.rec) || (st.sv && st.sv.rec));
        st.recGap = st.rec && ((st.vault && !st.vault.rec) || (st.lvault && !st.lvault.rec) || (st.sv && !st.sv.rec));   // a key made before the site key existed does not cover it
        overview(); drawEnc(); drawPk(); drawAp(); drawTrusted();
      });
    }
    secRefresh = function () { overview(); };

    /* Password */
    body('pw').innerHTML = '<form id="ix-cp">' + ecCard('ix-split', ICON.key, 'Website Password', 'One password opens every page of this site. Changing it logs out your other devices, and encryption that uses it follows along. Use at least 8 characters: a few words you will remember beat a short jumble.',
        '<div class="ix-frm">' + ecField('ix-cur', 'Current Password', 'password', 'current-password') + ecField('ix-n1', 'New Password', 'password', 'new-password') + ecField('ix-n2', 'Type It Again', 'password', 'new-password') + '</div>' +
        '<div class="ix-fact"><div class="ix-meterw" id="ix-pwm"><div class="ix-meter"><i></i></div><small></small></div><button class="ix-btn pri">Change Password</button></div><p class="ix-err" id="ix-cpe"></p>') + '</form>';
    p.querySelector('#ix-n1').oninput = function () {
      var r = pwScore(this.value), m = p.querySelector('#ix-pwm'), bar = m.querySelector('i');
      m.classList.toggle('on', !!this.value); bar.style.width = this.value ? r.pct + '%' : '0'; bar.className = r.cls; m.querySelector('small').textContent = this.value ? r.label : '';
    };
    p.querySelector('#ix-cp').onsubmit = function (e) {
      e.preventDefault(); var er = p.querySelector('#ix-cpe');
      if (p.querySelector('#ix-n1').value !== p.querySelector('#ix-n2').value) { er.textContent = "The two new passwords don't match."; return; }
      var cur = p.querySelector('#ix-cur').value, nw = p.querySelector('#ix-n1').value, btn = e.target.querySelector('button.pri');
      btn.disabled = true; er.textContent = 'Changing…';
      Promise.all([rewrapVault(cur, nw), rewrapLinks(cur, nw)]).then(function (r) {
        var v = r[0], lv = r[1];
        return api('password', { current: cur, password: nw, vault: v ? v.vault : null, prev: v ? v.prev : '', linksVault: lv ? lv.vault : null, linksPrev: lv ? lv.prev : '' }).then(function (j) {
          if (!j.ok) { er.textContent = j.error; return; }
          S.csrf = j.csrf; e.target.reset(); p.querySelector('#ix-n1').oninput();
          var also = [];
          if (j.vault) also.push('Info\'s encrypted tabs');
          if (j.links) also.push('Links\' encrypted tabs');
          if (j.backup) also.push('new encrypted backups');
          er.innerHTML = '<span class="ix-ok">Password changed. Other devices are logged out.' + (also.length ? ' ' + esc(also.join(' and ')) + ' now use the new password too.' : '') +
            (j.backup ? ' Backup files made before today still open with the old one.' : '') + '</span>';
          load();
        });
      }).catch(function () { er.textContent = "Can't reach the server. Nothing was changed."; }).finally(function () { btn.disabled = false; });
    };

    /* Passkeys (1.61.0): log in with a fingerprint, face, PIN or security key. Adding or removing one needs the website password. */
    function drawPk() {
      var b = body('pk'), keys = st.pk || [], can = !!(window.PublicKeyCredential && st.pkSecure && window.isSecureContext);
      var when1 = function (t) { return t ? K.when(t) : 'never'; };
      var list = keys.length ? '<div class="ix-devs">' + keys.map(function (k) {
        return '<div class="ix-dev"><span class="ix-dev-i" aria-hidden="true">' + svg(ICON.key) + '</span><div class="ix-dev-b"><b>' + esc(k.name) + '</b><small>Added ' + esc(when1(k.at)) + ' · Last used ' + esc(when1(k.last)) + '</small></div>' +
          '<button type="button" class="ix-btn" data-pkren="' + esc(k.id) + '">Rename</button><button type="button" data-hold class="ix-btn danger" data-pkdel="' + esc(k.id) + '">Remove</button></div>'; }).join('') + '</div>'
        : '<p class="ix-note">No passkey yet. Add one below, on this device or with a security key.</p>';
      // (1.77.2) no separate header and no "No Passkeys Yet" card: your passkeys are rows, and Add a Passkey is one card under them
      // (1.78.0) one card: what a passkey is on the left, your passkeys and the way to add one on the right
      var pkDesc = 'Log in with a fingerprint, face, PIN or security key. A passkey already counts as two steps in one, so it skips the two-step code and the Telegram tap. Your password stays as the other way in. Adding or removing one needs your website password.';
      b.innerHTML = can ? ecCard('ix-split', ICON.device, 'Passkeys', pkDesc, list + '<div id="ix-pkst"></div><p class="ix-err" id="ix-pke"></p>', '<span class="ix-pill ' + (keys.length ? 'good' : '') + '">' + (keys.length ? keys.length + (keys.length === 1 ? ' Passkey' : ' Passkeys') : 'None Yet') + '</span>')
        : ecCard('ix-split warn', ICON.lock, 'Passkeys Are Not Available Here', 'Passkeys need a secure (https) connection and a browser that supports them.' + (keys.length ? ' You can still remove the ones you have: type your website password below.' : ''),
            list + (keys.length ? '<div class="ix-frm">' + ecField('ix-pkw', 'Website Password', 'password', 'current-password') + '</div><p class="ix-err" id="ix-pke"></p>' : ''));
      var err = function (t) { var e = b.querySelector('#ix-pke'); if (e) e.textContent = t; }, val = function (id) { var x = b.querySelector(id); return x ? x.value : ''; };
      /* (1.69.0) Add a Passkey is a Stepper: Name -> Your Device (the last button, #ix-pkadd, asks the device). A wrong password goes back. */
      var pkHost = b.querySelector('#ix-pkst');
      if (pkHost) stepper(pkHost, { kind: 'dots', linear: true, lastId: 'ix-pkadd', complete: 'Ask My Device',
        steps: [
          { title: 'Name', html: '<div class="ix-frm">' + ecField('ix-pkn', 'Name', 'text', 'off', '', '', ' placeholder="Like My Phone or Laptop"') + ecField('ix-pkw', 'Website Password', 'password', 'current-password') + '</div>',
            next: function (q, c) { if (!val('#ix-pkw')) { c.err('Type your website password first.'); return false; } } },
          { title: 'Your Device', html: '<p>Your browser or phone now asks which device or key to use: your fingerprint, face, PIN or a security key.</p>',
            next: function (q, c) {
              var pw = val('#ix-pkw'), nm = val('#ix-pkn').trim() || 'Passkey'; err('');
              return api('pk_register_begin', { password: pw }).then(function (j) {
                if (!j.ok) { if (j._status === 401) { var e = new Error('That isn\'t your website password.'); e.back = true; throw e; } throw new Error(j.error || 'Could not start.'); }
                var o = j.publicKey, H = window.HUB;
                return navigator.credentials.create({ publicKey: { challenge: H.b64uBuf(o.challenge), rp: o.rp, user: { id: H.b64uBuf(o.user.id), name: o.user.name, displayName: o.user.displayName }, pubKeyCredParams: o.pubKeyCredParams, timeout: o.timeout,
                  attestation: o.attestation, authenticatorSelection: o.authenticatorSelection, excludeCredentials: (o.excludeCredentials || []).map(function (x) { return { type: 'public-key', id: H.b64uBuf(x.id) }; }) } });
              }).then(function (cr) {
                if (!cr) throw new Error('No passkey was made.');
                var H = window.HUB;
                return api('pk_register_finish', { name: nm, response: { clientDataJSON: H.bufB64u(cr.response.clientDataJSON), attestationObject: H.bufB64u(cr.response.attestationObject) } });
              }).then(function (j) {
                if (!j.ok) throw new Error(j.error || 'The passkey was not saved.');
                st.pk = j.keys; toast('Passkey added.'); return true;
              }).catch(function (x) {
                var msg = x && x.name === 'NotAllowedError' ? 'No passkey was made: it was cancelled or timed out.' : x && x.name === 'InvalidStateError' ? 'This device already has a passkey here.' : (x && x.message) || 'Could not add a passkey.';
                if (x && x.back) { setTimeout(function () { c.go(1); c.err(msg); }, 0); return false; }   // after the Stepper has finished this try
                throw new Error(msg);
              });
            } }],
        done: '<div class="ix-st-fin"><span class="ix-st-big"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg></span><h3>Passkey added</h3><p>It can log in without the password now.</p></div>',
        onDone: function () { setTimeout(function () { drawPk(); overview(); }, 1200); } });
      // (1.62.1) Remove used to say nothing near the button: its messages went to the line in the box below, out of sight. Now each one also shows as a message on top.
      var say = function (t) { err(t); toast(t, true); };
      b.querySelectorAll('[data-pkdel]').forEach(function (x) { x.onclick = function () {
        var pw = val('#ix-pkw'), pwBox = b.querySelector('#ix-pkw');
        if (!pw) {
          say('Type your website password in the box below, then press Remove again.');
          if (pwBox) { pwBox.scrollIntoView({ block: 'center', behavior: 'smooth' }); pwBox.focus(); }
          return;
        }
        x.disabled = true; api('pk_delete', { id: x.dataset.pkdel, password: pw }).then(function (j) {
          if (!j.ok) { say(j._status === 401 ? 'That isn\'t your website password.' : j.error || 'Could not remove it.'); x.disabled = false; x.dataset.armed = ''; x.textContent = 'Remove'; return; }
          st.pk = j.keys; toast('Passkey removed.'); drawPk(); overview();
        });
      }; });
      b.querySelectorAll('[data-pkren]').forEach(function (x) { x.onclick = function () {
        var k = keys.filter(function (y) { return y.id === x.dataset.pkren; })[0]; if (!k) return;
        var nn = window.prompt('A new name for this passkey', k.name); if (nn == null || !nn.trim()) return;
        api('pk_rename', { id: k.id, name: nn.trim() }).then(function (j) { if (j.ok) { st.pk = j.keys; drawPk(); } else toast(j.error || 'Could not rename it.', true); });
      }; });
    }

    /* Two-step login */
    twoStep(body('2fa'));

    /* Encryption: one passphrase, a second password for secure data. It locks Info's encrypted tabs, Links' encrypted tabs and backup
       files (also the ones sent to Telegram). Set it or remove it; that is all there is to do here. */
    function encOn() { return !!(st.bk && st.bk.pp); }
    function encLabel() { return encOn() ? 'Passphrase Set' : (st.vault || st.lvault || (st.bk && st.bk.set)) ? 'Older Setting' : 'Off'; }
    function drawEnc() {
      var b = body('enc'), bk = st.bk, on = encOn();
      if (!bk.ok) { b.innerHTML = spinRow(); return; }
      var cnt = function (n, has, hint) { return has ? n + ' ' + (n === 1 ? 'tab' : 'tabs') + ' encrypted' : hint; };
      var card = ecCard, chip = ecChip;
      var fd = function (id, label, auto, hint, wrapId) { return ecField(id, label, 'password', auto, hint, wrapId); };
      var chips = '<div class="ix-chips" style="margin-top:0">' +
        chip('Info Tabs', cnt(st.tabs, !!st.vault, on ? 'none locked yet' : 'none'), !!st.vault && st.tabs > 0) +
        chip('Links Tabs', cnt(st.lenc, !!st.lvault, on ? 'none locked yet' : 'none'), !!st.lvault && st.lenc > 0) +
        chip('Files, Cards, Presets', st.sv ? (st.svUse.length ? st.svUse.join(', ') + ' locked' : 'ready') : (on ? 'ready' : 'none'), !!st.sv && st.svUse.length > 0) +
        chip('Backup Files', bk.available ? (bk.set ? 'locked' : 'not locked') : 'not available on this host', !!bk.set) + '</div>';
      var hintTabs = on ? '<p class="ix-note">To lock a tab: edit it, then choose Encrypted Tab.</p>' : '';
      var older = (!on && (st.vault || st.lvault || bk.set)) ? '<p class="ix-note">Some locked data still uses an older key. Setting the passphrase moves it all.</p>' : '';
      var html;
      if (!on) {
        html = card('ix-split intro', ICON.shield, 'Lock Your Private Tabs and Backups', 'One passphrase locks your Files, Cards and saved presets, the encrypted tabs in Info and Links, and your backup files. Only you can unlock them, even if someone copies your server.', chips) + older +
          card('ix-split', ICON.key, 'Set a Passphrase', 'Three steps: the passphrase, your website password to confirm it is you, then a recovery key in case you ever forget it.',
            '<div id="ix-encst"></div><p class="ix-err" id="ix-ee"></p>');
      } else {
        html = card('ix-split good', ICON.shield, 'Encryption Is On', 'Your locked data, tabs and backup files are protected by your passphrase.', chips + hintTabs) + older +
          card('ix-split', ICON.desktop, 'This Device', 'When you unlock with the box "Keep unlocked on this device" ticked, this browser keeps your data open until you log out, so it does not ask again. Forget the kept keys here to make it ask next time.',
            '<div class="ix-fact"><p class="ix-err" id="ix-fe"></p><button type="button" class="ix-btn" id="ix-forget">Forget Keys on This Device</button></div>') +
          card('ix-split', ICON.key, 'Change Passphrase', 'Pick a new one. Your locked data is not touched, so this takes a moment. New backups use the new passphrase; older backup files keep opening with the old one.',
            '<div class="ix-frm">' + fd('ix-ccur', 'Current Passphrase or Recovery Key', 'off') + fd('ix-cpw', 'Website Password', 'current-password') + fd('ix-cn1', 'New Passphrase', 'new-password') + fd('ix-cn2', 'Type It Again', 'new-password') + '</div>' +
            '<div class="ix-fact"><p class="ix-err" id="ix-ce"></p><button type="button" class="ix-btn pri" id="ix-cgo">Change Passphrase</button></div>') +
          '<div id="ix-rec">' + card('ix-split', ICON.box, 'Recovery Key', 'A spare way in. If you ever forget the passphrase, this code opens your Files, Cards, presets and locked tabs and lets you set a new passphrase. Keep it somewhere safe (print it, or put it in a password manager): anyone who has it can open them.',
            '<div class="ix-frm">' + fd('ix-rpp', 'Your Passphrase', 'off') + fd('ix-rpw', 'Website Password', 'current-password') + '</div>' +
            '<div class="ix-fact"><p class="ix-err" id="ix-re"></p><button type="button" class="ix-btn pri" id="ix-rmk">' + (st.rec ? 'Make a New Recovery Key' : 'Create Recovery Key') + '</button>' +
            (st.rec ? '<button type="button" data-hold class="ix-btn danger" id="ix-rdel">Remove Recovery Key</button>' : '') + '</div><div id="ix-rshow"></div>',
            '<span class="ix-pill ' + (st.rec ? 'good' : '') + '">' + (st.rec ? (st.recGap ? 'Make a New One' : 'Created') : 'Not Created') + '</span>') +
          (st.recGap ? '<p class="ix-note">Your recovery key is older than Files and Cards. Make a new one below.</p>' : '') + '</div>' +
          '<form id="ix-ef">' + card('ix-split danger', ICON.out, 'Remove Encryption', 'Locked tabs turn back into normal private tabs (still hidden from visitors) and backup files stop being locked. To use a different passphrase, change it above instead.',
            '<div class="ix-frm">' + fd('ix-ecur', 'Your Passphrase', 'off') + fd('ix-epw', 'Website Password', 'current-password') + '</div>' +
            fd('ix-eold', 'Earlier Passphrase', 'off', 'The one your existing locked tabs use now.', 'ix-eoldw') +
            '<div class="ix-fact"><p class="ix-err" id="ix-ee"></p><button type="button" data-hold class="ix-btn danger" id="ix-erm">Remove Passphrase</button></div>') + '</form>';
      }
      b.innerHTML = html;
      var er = b.querySelector('#ix-ee'), val = function (id) { var x = b.querySelector(id); return x ? x.value : ''; };
      var run = function (btn, msg, work, ok) {
        btn.disabled = true; er.textContent = msg;
        work().then(function () { er.textContent = ''; toast(ok); afterVaultChange(); })
          .catch(function (x) { er.textContent = x && x.user ? x.message : "Can't reach the server. Nothing was changed."; if (x && x.needOld) b.querySelector('#ix-eoldw').hidden = false; if (btn.dataset.armed) { btn.dataset.armed = ''; btn.textContent = 'Remove Passphrase'; } })
          .finally(function () { btn.disabled = false; });
      };
      /* (1.69.0) the first passphrase is a Stepper: Passphrase -> Confirm It's You (sets it) -> Recovery Key (made and shown at once) */
      var fg = b.querySelector('#ix-forget');   // (1.79.0) "Keep unlocked on this device" is easy to find: here it can be undone, and the unlock window offers it
      if (fg) fg.onclick = function () { if (window.HubVault) window.HubVault.devDropAll(); toast('This device will ask for your passphrase again.'); };
      if (!on) {
        var recCode = '', recFail = function (x) { return x && x.user ? x.message : "Can't reach the server. Nothing was changed."; };
        stepper(b.querySelector('#ix-encst'), { kind: 'numbers', linear: true, complete: 'Finish',
          steps: [
            { title: 'Passphrase', html: '<p>At least 8 characters. A few words you will remember work better than a short jumble.</p><div class="ix-frm">' + fd('ix-en1', 'New Passphrase', 'new-password') + fd('ix-en2', 'Type It Again', 'new-password') + '</div>' +
                '<label class="ix-chk"><input type="checkbox" id="ix-eack"> I understand a lost passphrase cannot be recovered without a recovery key</label>',
              next: function (p, c) {
                if (val('#ix-en1').length < 8) { c.err('Use at least 8 characters for the passphrase.'); return false; }
                if (val('#ix-en1') !== val('#ix-en2')) { c.err('The two passphrases are not the same.'); return false; }
                if (!b.querySelector('#ix-eack').checked) { c.err('Please confirm you understand the passphrase can\'t be recovered.'); return false; } } },
            { title: 'Confirm It\'s You', html: fd('ix-epw', 'Website Password', 'current-password', 'To confirm that it is you. This sets the passphrase.') +
                fd('ix-eold', 'Earlier Passphrase', 'off', 'The one your existing locked tabs use now.', 'ix-eoldw'),
              next: function (p, c) {
                if (!val('#ix-epw')) { c.err('Type your website password.'); return false; }
                return PP.set({ pp: val('#ix-en1'), site: val('#ix-epw'), old: val('#ix-eold') }).then(function () { toast('Passphrase set. Info tabs, Links tabs and backups use it now.'); return true; },
                  function (x) { if (x && x.needOld) b.querySelector('#ix-eoldw').hidden = false; throw new Error(recFail(x)); });
              } },
            { title: 'Recovery Key', html: '<p>A spare way in: if you ever forget the passphrase, this code opens your locked data and lets you set a new passphrase. It is shown only once. You can also make it later, in this section.</p>' +
                '<div id="ix-ercode"><div class="ix-row"><button type="button" class="ix-btn pri" id="ix-ermk">Make My Recovery Key</button></div></div>' +
                '<label class="ix-chk" id="ix-erackw" hidden><input type="checkbox" id="ix-erack"> I saved the recovery key somewhere safe</label>',
              // (1.69.0) made on a click, not on arrival: it is slow work (600,000 rounds), and some people want it later
              enter: function (p, c) {
                var mk = p.querySelector('#ix-ermk'); if (!mk || mk.__on) return; mk.__on = true;
                mk.onclick = function () {
                  mk.disabled = true; mk.textContent = 'Making it…'; c.err(''); c.block(3, true);
                  PP.makeRecovery({ pp: val('#ix-en1'), site: val('#ix-epw') }).then(function (code) {
                    recCode = code; st.rec = true;
                    p.querySelector('#ix-ercode').innerHTML = linkField({ id: 'ix-rcode', value: code, prefix: 'Key', readonly: true, copyId: 'ix-ercopy', label: 'Recovery key', cls: 'ix-uf-key', wrap: true });
                    p.querySelector('#ix-erackw').hidden = false; c.block(3, false);
                  }, function (x) { mk.disabled = false; mk.textContent = 'Make My Recovery Key'; c.err(recFail(x)); c.block(3, false); });
                };
              },
              next: function (p, c) { if (recCode && !b.querySelector('#ix-erack').checked) { c.err('Tick the box once you have saved it.'); return false; } } }],
          done: '<div class="ix-st-fin"><span class="ix-st-big"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg></span><h3>Encryption is on</h3><p>To lock a tab: edit it, then choose Encrypted Tab.</p></div>',
          onDone: function () { setTimeout(afterVaultChange, 1400); } });
      }
      var cgo = b.querySelector('#ix-cgo');
      if (cgo) cgo.onclick = function () {
        var ce = b.querySelector('#ix-ce'), cur = val('#ix-ccur'), n1 = val('#ix-cn1'), site = val('#ix-cpw');
        if (!cur) { ce.textContent = 'Type the current passphrase (or a recovery key).'; return; }
        if (n1.length < 8) { ce.textContent = 'Use at least 8 characters for the new passphrase.'; return; }
        if (n1 !== val('#ix-cn2')) { ce.textContent = 'The two new passphrases are not the same.'; return; }
        if (!site) { ce.textContent = 'Type your website password.'; return; }
        cgo.disabled = true; ce.textContent = 'Changing…';
        PP.set({ pp: n1, site: site, old: cur, change: true }).then(function () { ce.textContent = ''; toast('Passphrase changed. Info tabs, Links tabs and new backups use it now.'); afterVaultChange(); })
          .catch(function (x) { ce.textContent = x && x.user ? x.message : "Can't reach the server. Nothing was changed."; })
          .finally(function () { cgo.disabled = false; });
      };
      var rmk = b.querySelector('#ix-rmk'), rdel = b.querySelector('#ix-rdel');
      if (rmk) rmk.onclick = function () {
        var re = b.querySelector('#ix-re'), pp = val('#ix-rpp'), site = val('#ix-rpw');
        if (!pp || !site) { re.textContent = 'Type the passphrase and your website password first.'; return; }
        rmk.disabled = true; re.textContent = 'Making it…';
        PP.makeRecovery({ pp: pp, site: site }).then(function (code) {
          re.textContent = ''; st.rec = true;
          b.querySelector('#ix-rshow').innerHTML = '<div class="ix-status"><span class="ix-ok">✓</span><span><b>Your recovery key. It is shown only now.</b></span></div>' + linkField({ id: 'ix-rcode', value: code, prefix: 'Key', readonly: true, copyId: 'ix-rcopy', label: 'Recovery key', cls: 'ix-uf-key', wrap: true }) +
            '<p class="ix-note">Save it before you close this. A key made earlier no longer works.</p>';
          toast('Recovery key created.');
        }).catch(function (x) { re.textContent = x && x.user ? x.message : "Can't reach the server. Nothing was changed."; })
          .finally(function () { rmk.disabled = false; });
      };
      if (rdel) rdel.onclick = function () {
        var re = b.querySelector('#ix-re'), site = val('#ix-rpw');
        if (!site) { re.textContent = 'Type your website password first.'; return; }
        rdel.disabled = true; re.textContent = 'Removing…';
        PP.dropRecovery({ site: site }).then(function () { toast('Recovery key removed.'); afterVaultChange(); drawEnc(); })
          .catch(function (x) { re.textContent = x && x.user ? x.message : "Can't reach the server. Nothing was changed."; rdel.dataset.armed = ''; rdel.textContent = 'Remove Recovery Key'; })
          .finally(function () { rdel.disabled = false; });
      };
      var rm = b.querySelector('#ix-erm');
      if (rm) rm.onclick = function () {
        var pp = val('#ix-ecur'), site = val('#ix-epw');
        if (!pp || !site) { er.textContent = 'Type the passphrase and your website password first.'; return; }
        run(rm, 'Decrypting…', function () { return PP.remove({ pp: pp, site: site, old: val('#ix-eold') }); }, 'Passphrase removed. Encrypted tabs are normal private tabs now.');
      };
    }
    // Info open behind Settings holds the old key: it reloads so it never saves with it
    function afterVaultChange() { if (APP === 'info') setTimeout(function () { location.reload(); }, 900); else load(); }

    /* Approve logins in Telegram */
    function drawAp() {
      var b = body('ap'), a = st.ap;
      if (!a.ok) { b.innerHTML = spinRow(); return; }
      b.innerHTML = ecCard('ix-split' + (a.on ? ' good' : ''), ICON.send, 'Login Approval',
          'Even someone who knows your password cannot get in until you tap <b>Approve</b> on a message from your Telegram bot, after the password (and the two-step code). You see every login and can refuse it.',
          (a.telegram ? '' : '<div class="ix-status"><span>!</span><span><b>Set up the Telegram bot first.</b> <a href="#" id="ix-apgo">Open Settings › Telegram</a></span></div>') +
          '<form id="ix-apform"><div class="ix-fact ix-fbot">' + ecField('ix-appw', 'Website Password', 'password', 'current-password', '', '', ' placeholder="' + (a.on ? 'Needed to turn this off' : 'Needed to turn this on') + '"') +
            (a.on ? '<button class="ix-btn" data-ap="off">Turn Off</button>' : '<button class="ix-btn pri" data-ap="on"' + (a.telegram ? '' : ' disabled') + '>Turn On</button>') + '</div>' +
            '<p class="ix-err" id="ix-aperr"></p></form>',
          '<span class="ix-pill ' + (a.on ? 'good' : '') + '">' + (a.on ? 'On' : 'Off') + '</span>') +
        '<div class="ix-sect">If Something Goes Wrong</div><div class="ix-trio">' +
          '<div class="ix-mini"><b>Telegram Can\'t Be Reached</b><p>The login goes through, because the password was already right.</p></div>' +
          '<div class="ix-mini"><b>No Phone With You</b><p>' + (S.twoStep ? 'Use one of your two-step recovery codes.' : 'Turn on Two-Step Login, so a recovery code can stand in for the tap.') + '</p></div>' +
          '<div class="ix-mini"><b>Locked Out Completely</b><p>Delete <code>site-data/core/login-approval.php</code> in your hosting file manager.</p></div></div>';
      var go2 = b.querySelector('#ix-apgo'); if (go2) go2.onclick = function (e) { e.preventDefault(); go('telegram'); };
      b.querySelectorAll('[data-ap]').forEach(function (x) { x.onclick = function (e) {
        e.preventDefault(); var k = x.dataset.ap;
        api('approval_' + k, { password: b.querySelector('#ix-appw').value }).then(function (j) {
          if (!j.ok) { b.querySelector('#ix-aperr').textContent = j.error || 'That did not work.'; return; }
          toast(k === 'off' ? 'Login approval is off.' : 'Login approval is on.');
          api('approval').then(function (n) { st.ap = n; overview(); drawAp(); drawTrusted(); });
        });
      }; });
    }
    /* Trusted browsers: skip the two-step code and the Telegram question for 30 days */
    function drawTrusted() {
      var b = body('tr'), t = st.ap.trusted || [];
      b.innerHTML = tabHead(ICON.desktop, 'Trusted Browsers', 'Skip the code and the Telegram tap for 30 days on a browser you trust. Add one with "Trust this browser" when you log in.') +
        (t.length ? '<div class="ix-devs">' + t.map(function (x) {
          return '<div class="ix-dev"><span class="ix-dev-i">' + svg(ICON.desktop) + '</span><div class="ix-dev-b"><b>' + esc(x.name) + (x.me ? ' <span class="ix-pill good">This One</span>' : '') + '</b>' +
            '<small>' + esc(x.ip || 'Unknown Address') + ' · last used ' + esc(when(x.last)) + ' · trusted until ' + esc(new Date(x.until * 1000).toLocaleDateString()) + '</small></div>' +
            '<button type="button" class="ix-btn" data-untrust="' + x.i + '">Remove</button></div>'; }).join('') + '</div>' +
          '<div class="ix-row" style="margin-top:14px"><button type="button" class="ix-btn danger" data-untrust="-1">Remove All</button></div>'
          : '<div class="ix-empty"><span class="ix-empty-i">' + svg(ICON.desktop) + '</span><b>No Trusted Browsers Yet</b><p>Tick "Trust this browser" the next time you log in, and it shows up here.</p></div>');
      b.querySelectorAll('[data-untrust]').forEach(function (x) { x.onclick = function () {
        api('approval_untrust', { i: +x.dataset.untrust }).then(function (j) { if (j.ok) { toast('Removed.'); api('approval').then(function (n) { st.ap = n; overview(); drawTrusted(); }); } });
      }; });
    }

    /* Devices: who is logged in (end any login), the two log-out buttons, and the recent login history */
    function drawDevices() {
      var b = body('dev');
      b.innerHTML = tabHead(ICON.out, 'Devices and Login History', 'See where you are logged in, end any login, and look back at recent activity.') +
        '<div class="ix-sect" style="margin-top:0">Logged In Now</div><div id="ix-devl">' + spinRow() + '</div>' +
        '<div class="ix-sect">Log Out</div><div class="ix-duo">' +
          ecCard('', ICON.users, 'Log Out Other Devices', 'Ends every login except this one, on every page. Use it if you lost a phone or used a shared computer.', '<div class="ix-row"><button type="button" class="ix-btn pri" id="ix-lo">Log Out Other Devices</button></div>') +
          ecCard('danger', ICON.out, 'Log Out Here', 'Ends the login on this browser only. Other devices stay logged in.', '<div class="ix-row"><button type="button" class="ix-btn danger" data-ix="logout">Log Out Here</button></div>') + '</div>' +
        '<div class="ix-sect">Recent Activity</div><div id="ix-act">' + spinRow() + '</div>';
      b.querySelector('#ix-lo').onclick = function () { api('logoutall', {}).then(function (j) { if (j.ok) { S.csrf = j.csrf; toast('Every other device is logged out.'); drawDevices(); } else toast(j.error); }); };
      api('activity').then(function (j) {
        var dl = b.querySelector('#ix-devl'), al = b.querySelector('#ix-act'); if (!dl) return;
        if (!j || !j.ok) { dl.innerHTML = al.innerHTML = '<p class="ix-err">' + esc((j && j.error) || 'Could not load.') + '</p>'; return; }
        dl.innerHTML = j.sessions.length ? '<div class="ix-devs">' + j.sessions.map(function (x) {
          var phone = /Android|iOS/.test(x.who);
          return '<div class="ix-dev"><span class="ix-dev-i">' + svg(phone ? ICON.device : ICON.desktop) + '</span><div class="ix-dev-b"><b>' + esc(x.who || 'Unknown Browser') + (x.me ? ' <span class="ix-pill good">This Device</span>' : '') + '</b>' +
            '<small>' + esc(x.ip || 'Unknown address') + ' · logged in ' + esc(ago(x.t)) + '</small></div>' + (x.me ? '' : '<button type="button" class="ix-btn" data-rev="' + esc(x.id) + '">Log Out</button>') + '</div>'; }).join('') + '</div>'
          : '<div class="ix-empty"><b>Nothing Recorded Yet</b><p>Logins from now on are listed here. Logins made before this version are not.</p></div>';
        dl.querySelectorAll('[data-rev]').forEach(function (x) { x.onclick = function () {
          x.disabled = true; api('session_revoke', { id: x.dataset.rev }).then(function (k) { toast(k.ok ? 'That device is logged out.' : (k.error || 'Could not log it out.')); drawDevices(); }); }; });
        var rows = j.events.filter(function (e) { return LOGSEC[e.ev]; }).map(actRow);   // only the security events here; everything else is in Logs > Activity
        al.innerHTML = rows.length ? '<div class="ix-checks">' + rows.slice(0, 15).join('') + '</div>' + (rows.length > 15 ? '<div class="ix-row" style="margin-top:12px"><button type="button" class="ix-btn" id="ix-actmore">Show ' + (rows.length - 15) + ' More</button></div>' : '')
          : '<div class="ix-empty"><b>No Activity Yet</b><p>Logins, wrong passwords and security changes appear here.</p></div>';
        var more = al.querySelector('#ix-actmore'); if (more) more.onclick = function () { al.querySelector('.ix-checks').innerHTML = rows.join(''); more.remove(); };
      }).catch(function () { var dl = b.querySelector('#ix-devl'); if (dl) dl.innerHTML = b.querySelector('#ix-act').innerHTML = '<p class="ix-err">Can\'t reach the server.</p>'; });
    }
    var devAcc = acc('dev'); drawDevices();
    devAcc.addEventListener('toggle', function () { if (devAcc.open) drawDevices(); });

    load();   // (1.77.1) drawn once, when the data is there: it used to draw with empty values first, and then change
  }
  /* POST to Info's own API (encrypted tabs live there) with the site's security token. Resolves the fetch Response. */
  function infoApi(b) {
    return fetch(ROOT + 'web/info/api.php', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json', 'X-Hub-CSRF': S.csrf || '' }, body: JSON.stringify(b) });
  }
  /* Info's and Links' encrypted-tab keys: the shared encryption in shell.js (section 14, window.HubVault). Everything happens here. */
  var VK = (function () {
    var V = window.HubVault;
    return {
      unwrap: function (v, pass) {   // the raw key, or null when the password (or the recovery key) doesn't fit
        if (!V.ok()) return Promise.reject(new Error('Encrypted tabs need a secure (https) connection.'));
        return V.unwrap(v, pass);
      },
      wrap: V.wrap,
      use: function (raw) { return V.useKey(raw, true); },
      open: function (s, key) { return V.openDeep(key, s); }   // plain text from "enc1:..." (also text that was encrypted more than once)
    };
  })();
  /* Info's encrypted tabs that use the website password: their key is re-wrapped here, in the browser, with the new password
     (the server never sees the key). Resolves {vault, prev}, or null when there is nothing to re-wrap. */
  function rewrapVault(cur, nw) {
    if (!window.crypto || !crypto.subtle) return Promise.resolve(null);
    return fetch(ROOT + 'web/info/api.php', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      var v = j && j.page && j.page.vault;
      if (!v || !v.login) return null;
      return VK.unwrap(v, cur).then(function (raw) {
        if (!raw) return null;   // wrapped with another password (changed while away): unlock it once in Settings › Security
        return VK.wrap(raw, nw, true).then(function (nv) { raw.fill(0); return { vault: nv, prev: v.wrap }; });
      });
    }, function () { return null; });
  }
  /* The same for Links' encrypted tabs: their key is wrapped with the website password and follows it here, in the browser. */
  function rewrapLinks(cur, nw) {
    if (!window.crypto || !crypto.subtle) return Promise.resolve(null);
    return fetch(ROOT + 'web/links/api.php?action=get', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      var v = j && j.data && j.data.settings && j.data.settings.vault;
      if (!v || !v.login || !v.wrap) return null;
      return VK.unwrap(v, cur).then(function (raw) {
        if (!raw) return null;   // locked with another password (changed while away): open it once in Links with "I changed my password"
        return VK.wrap(raw, nw, true).then(function (nv) { raw.fill(0); return { vault: nv, prev: v.wrap }; });
      });
    }, function () { return null; });
  }
  /* The encryption passphrase. It wraps the key of Info's encrypted tabs and the key of Links' encrypted tabs here, in the browser
     (the server never sees either key), and the server makes the backup key from it. set() also moves anything still locked the
     older way (your website password, or a separate Info passphrase) onto it; remove() opens every encrypted tab and turns it back
     into a normal private tab. Both can be run again after a failure: what is already done is left as it is. */
  var PP = (function () {
    var fail = function (t, needOld) { var e = new Error(t); e.user = true; e.needOld = !!needOld; throw e; };
    var getJson = function (u) { return fetch(ROOT + 'web/' + u, { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : fail('Could not read the saved data. Nothing was changed.'); }); };
    var linksApi = function (action, b) {
      return fetch(ROOT + 'web/links/api.php?action=' + action, { method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'bookmarks', 'X-Hub-CSRF': S.csrf || '' }, body: JSON.stringify(b) });
    };
    var okOrFail = function (r, what) {
      if (r.status === 401) return fail('That isn\'t your website password.');
      if (r.status === 429) return fail('Too many wrong tries. Wait a few minutes.');
      if (r.status === 409) return fail(what + ' changed on another device. Close Settings and try again.');
      if (!r.ok) return fail('Could not save. Nothing was changed.');
      return r;
    };
    var checkSite = function (site) {
      return api('pp_check', { password: site }).then(function (j) {
        if (j.ok) return;
        if (j._status === 401) fail('That isn\'t your website password.');   // the server's own words ("Wrong password.") don't say which password
        fail(j.error || 'Could not check your website password.');
      });
    };
    var state = function () {
      return Promise.all([getJson('info/api.php'), getJson('links/api.php?action=get'), api('sv_get')]).then(function (r) {
        var ls = r[1].data && r[1].data.settings, sv = r[2] && r[2].ok && r[2].vault && r[2].vault.wrap ? r[2].vault : null;
        return { info: r[0], iv: (r[0].page && r[0].page.vault && r[0].page.vault.wrap) ? r[0].page.vault : null, links: r[1].data || {}, lv: ls && ls.vault && ls.vault.wrap ? ls.vault : null, sv: sv, use: (r[2] && r[2].use) || [] };
      });
    };
    // the site key (Files, Cards, Tools presets): the same wrap, saved through the core API with the website password
    var svSave = function (vault, prev, site) {
      return api('sv_save', { vault: vault, prev: prev, password: site }).then(function (j) {
        if (j.ok) return j;
        if (j._status === 401) fail('That isn\'t your website password.');
        if (j._status === 409) fail('The site key changed on another device. Close Settings and try again.');
        fail(j.error || 'Could not save. Nothing was changed.');
      });
    };
    var infoSave = function (vault, prev) { return infoApi({ action: 'save_vault', vault: vault, prev: prev, pw: '' }); };
    var linksSave = function (vault, prev, site) { return linksApi('save_vault', { vault: vault, prev: prev, pw: site }); };
    // the three keys in the order they are changed: site, Info, Links. Whatever moved is put back when a later one fails, so they never end up on different passphrases.
    var changeAll = function (d, o, mk) {   // mk(v, what) gives the vault to store, or null to leave it
      var undo = [];
      var one = function (v, what, save, back) {
        return Promise.resolve(mk(v, what)).then(function (nv) {
          if (!nv) return;
          return save(nv, v ? v.wrap : '').then(function () { if (v) undo.push(function () { return back(v, nv.wrap); }); });
        });
      };
      var chain = Promise.resolve();
      if (d.sv || o.makeSite) chain = chain.then(function () { return one(d.sv, 'Site', function (nv, prev) { return svSave(nv, prev, o.site); }, function (v, cur) { return svSave(v, cur, o.site); }); });
      if (d.iv || o.makeInfo) chain = chain.then(function () { return one(d.iv, 'Info', function (nv, prev) { return infoSave(nv, prev).then(function (r) { return okOrFail(r, 'Info'); }); }, infoSave); });
      if (d.lv || o.makeLinks) chain = chain.then(function () { return one(d.lv, 'Links', function (nv, prev) { return linksSave(nv, prev, o.site).then(function (r) { return okOrFail(r, 'Links'); }); }, function (v, cur) { return linksSave(v, cur, o.site); }); });
      return chain.catch(function (e) {
        var back = function () { return undo.reduceRight(function (q, f) { return q.then(f, f); }, Promise.resolve()); };
        return back().then(function () { throw e; }, function () { throw e; });
      });
    };
    // opens a key with the first secret that fits: the passphrase, the website password (older lock), or an earlier passphrase
    var openWith = function (v, o) {
      var list = [['pp', o.pp]]; if (v.login) list.push(['site', o.site]); list.push(['old', o.old]);
      var i = 0;
      var next = function () {
        while (i < list.length && !list[i][1]) i++;
        if (i >= list.length) return Promise.resolve(null);
        var item = list[i++];
        return VK.unwrap(v, item[1]).then(function (raw) { return raw ? { raw: raw, used: item[0] } : next(); });
      };
      return next();
    };
    var needOld = function (what, o) {
      if (o && o.change) return fail('That isn\'t the current passphrase or recovery key.');
      return fail((what === 'Site' ? 'Your Files, Cards and saved presets are' : what + ' tabs are') + ' locked with a different passphrase. Type it under “Earlier Passphrase” and they move to the new one.', true);
    };
    // a vault (none yet: made now) ends up wrapped with the passphrase
    var move = function (v, o, what, save) {
      if (!v) {
        var raw = crypto.getRandomValues(new Uint8Array(32));
        return Promise.all([VK.wrap(raw, o.pp, false), what === 'Site' ? crypto.subtle.digest('SHA-256', raw) : null]).then(function (w) {
          raw.fill(0); var nv = w[0];
          if (w[1]) nv.kid = Array.prototype.map.call(new Uint8Array(w[1]).subarray(0, 8), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');   // the key's id (see lib/vault.php)
          return save(nv, '');
        });
      }
      return openWith(v, o).then(function (r) {
        if (!r) return needOld(what, o);
        if (r.used === 'pp' && !v.login) { r.raw.fill(0); return null; }   // already locked with it
        return VK.wrap(r.raw, o.pp, false).then(function (nv) { r.raw.fill(0); if (v.rec) nv.rec = v.rec; return save(nv, v.wrap); });   // the recovery key opens the same key, so it stays valid
      });
    };
    function set(o) {
      return checkSite(o.site).then(state).then(function (d) {
        return changeAll(d, { site: o.site, makeSite: true, makeInfo: true, makeLinks: true }, function (v, what) {
          var save = null;
          return move(v, o, what, function (nv) { save = nv; return Promise.resolve(); }).then(function () { return save; });   // null when it already opens with this passphrase
        });
      }).then(function () { return api('pp_set', { password: o.site, passphrase: o.pp }); })
        .then(function (j) { if (!j.ok) fail(j.error || 'Could not save the passphrase.'); return j; });
    }
    // Files, Cards and saved presets are locked with the site key: Cards and presets are turned back into plain data here; Files must be deleted first
    var plainPost = function (path, body) {
      return fetch(ROOT + 'web/' + path, { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json', 'X-Hub-CSRF': S.csrf || '' }, body: JSON.stringify(body) });
    };
    // Cards: opened with the key and saved as plain data again (the server accepts that only when asked on purpose)
    var unlockCards = function (key) {
      return getJson('cards/api.php').then(function (j) {
        if (typeof j.enc !== 'string') return;
        return VK.open(j.enc, key).then(function (txt) {
          var d = JSON.parse(txt);
          if (!d || !Array.isArray(d.cards)) throw new Error('shape');
          return plainPost('cards/api.php', { cards: d.cards, people: d.people || [], notes: d.notes || '', banks: d.banks || {}, settings: d.settings || {}, unlock: true });
        }).then(function (r) { if (!r.ok) fail('Could not save your cards as plain data. Nothing was changed.'); }, function (e) { if (e && e.user) throw e; fail('Your cards could not be opened with that key, so nothing was changed.'); });
      });
    };
    // Tools presets: every locked one is opened here and saved as plain settings again
    var unlockPresets = function (key) {
      return api('presets').then(function (j) {
        if (!j.ok || !j.locked) return;
        var jobs = [], items = [];
        Object.keys(j.kinds || {}).forEach(function (k) { (j.kinds[k] || []).forEach(function (p) {
          if (!p.enc) return;
          jobs.push(VK.open(p.enc, key).then(function (txt) { var d = JSON.parse(txt); items.push({ kind: k, id: p.id, name: d.name, data: d.data }); }));
        }); });
        return Promise.all(jobs).then(function () { return api('presets', { op: 'unlock_all', items: items }); }, function () { fail('Your saved presets could not be opened with that key, so nothing was changed.'); })
          .then(function (r) { if (r && !r.ok) fail(r.error || 'Could not save your presets as plain settings. Nothing was changed.'); });
      });
    };
    var PP_UNLOCK = function (key, use) {
      var jobs = [];
      if (use.indexOf('Tools presets') >= 0) jobs.push(unlockPresets(key));
      if (use.indexOf('Cards') >= 0) jobs.push(unlockCards(key));
      return Promise.all(jobs);
    };
    var unlockSiteData = function (d, o) {
      if (!d.sv || !d.use.length) return Promise.resolve();
      if (d.use.indexOf('Files') >= 0) return fail('Files are locked with your passphrase. Download what you need and delete every file in Files first; then you can remove the passphrase.');
      return openWith(d.sv, o).then(function (r) {
        if (!r) return needOld('Site', o);
        return VK.use(r.raw).then(function (key) { r.raw.fill(0); return PP_UNLOCK(key, d.use); });
      });
    };
    function remove(o) {
      return checkSite(o.site).then(state).then(function (d) {
        var siteStep = unlockSiteData(d, o);
        var infoStep = function () { return !d.iv ? Promise.resolve() : openWith(d.iv, o).then(function (r) {
          if (!r) return needOld('Info');
          return VK.use(r.raw).then(function (key) {
            r.raw.fill(0);
            var out = {}, jobs = [];
            (d.info.tabs || []).forEach(function (t) {
              if (!t.enc) return; out[t.id] = [];
              t.boxes.forEach(function (bx, k) { jobs.push(Promise.all([VK.open(bx.title, key), VK.open(bx.notes, key)]).then(function (x) { out[t.id][k] = { title: x[0], notes: x[1], rev: bx.rev | 0 }; })); });
            });
            return Promise.all(jobs).then(function () { return out; }, function () { return fail('A box couldn\'t be decrypted, so nothing was changed.'); });
          }).then(function (tabs) { return infoApi({ action: 'remove_vault', prev: d.iv.wrap, pw: o.site, tabs: tabs }); }).then(function (r2) { return okOrFail(r2, 'Info'); });
        }); };
        return siteStep.then(infoStep).then(function () {
          if (!d.lv) return null;
          return openWith(d.lv, o).then(function (r) {
            if (!r) return needOld('Links');
            return VK.use(r.raw).then(function (key) {
              r.raw.fill(0);
              var out = {}, jobs = [];
              (d.links.tabs || []).forEach(function (t) {
                if (typeof t.enc !== 'string') return;
                jobs.push(VK.open(t.enc, key).then(function (txt) {
                  var j = JSON.parse(txt); if (!j || !Array.isArray(j.categories)) throw new Error('shape');
                  if (Array.isArray(j.icons)) j.categories.forEach(function (c) { (c.links || []).forEach(function (l) { var m = l && typeof l.icon === 'string' && /^#i:(\d+)$/.exec(l.icon); if (m) l.icon = typeof j.icons[+m[1]] === 'string' ? j.icons[+m[1]] : ''; }); });   // icons stored once inside the tab (1.29)
                  out[t.id] = { enc: t.enc, categories: j.categories };
                }));
              });
              return Promise.all(jobs).then(function () { return out; }, function () { return fail('A tab couldn\'t be decrypted, so nothing was changed.'); });
            }).then(function (tabs) { return linksApi('remove_vault', { pw: o.site, prev: d.lv.wrap, tabs: tabs }).then(function (r2) { return okOrFail(r2, 'Links'); }); });
          });
        });
      }).then(function () { return api('pp_clear', { password: o.site }); })
        .then(function (j) { if (!j.ok) fail(j.error || 'Could not remove the passphrase.'); window.HubVault.devDropAll(); return j; });
    }
    /* Recovery key: the same tab keys, wrapped a second time with a random code shown once. It opens Info and Links tabs when the
       passphrase is forgotten (type it where the passphrase goes), and can set a new passphrase. The server never sees the code. */
    var CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no 0, 1, I, O: easy to read out and type
    var newCode = function () {
      var b = crypto.getRandomValues(new Uint8Array(20)), c = '';
      for (var i = 0; i < 20; i++) c += CODE_CHARS.charAt(b[i] & 31) + (i % 4 === 3 && i < 19 ? '-' : '');
      return c;
    };
    function makeRecovery(o) {   // o = {pp, site}
      var code = newCode(), plain = code.replace(/-/g, '');
      return checkSite(o.site).then(state).then(function (d) {
        if (!d.iv && !d.lv && !d.sv) fail('Set the passphrase first.');
        var list = [['Site', d.sv], ['Info', d.iv], ['Links', d.lv]], recs = {};
        var open = function (v) {
          return VK.unwrap({ salt: v.salt, iter: v.iter, wrap: v.wrap }, o.pp).then(function (raw) { if (!raw) fail('That isn\'t the passphrase.'); return raw; });   // the passphrase only: never the recovery key itself
        };
        return Promise.all(list.map(function (x) {
          if (!x[1]) return null;
          return open(x[1]).then(function (raw) { return VK.wrap(raw, plain, false).then(function (r) { raw.fill(0); recs[x[0]] = { salt: r.salt, iter: r.iter, wrap: r.wrap }; }); });
        })).then(function () {
          return changeAll(d, { site: o.site }, function (v, what) {
            if (!v || !recs[what]) return null;
            var nv = { v: 1, salt: v.salt, iter: v.iter, wrap: v.wrap }; if (v.login) nv.login = true; nv.rec = recs[what]; return nv;
          });
        });
      }).then(function () { return code; });
    }
    function dropRecovery(o) {   // o = {site}
      return checkSite(o.site).then(state).then(function (d) {
        return changeAll(d, { site: o.site }, function (v) {
          if (!v || !v.rec) return null;
          var nv = { v: 1, salt: v.salt, iter: v.iter, wrap: v.wrap }; if (v.login) nv.login = true; return nv;
        });
      });
    }
    return { set: set, remove: remove, makeRecovery: makeRecovery, dropRecovery: dropRecovery };
  })();
  function twoStep(box) {
    var head = tabHead(ICON.device, 'Two-Step Login', 'A 6-digit code from an authenticator app, on top of your password.');
    if (S.twoStep) {
      box.innerHTML = ecCard('ix-split good', ICON.device, 'Two-Step Login', 'Logins ask for your app\'s 6-digit code (not on trusted browsers). Lost your phone? Use a recovery code. Your website password is needed to change these settings.',
          '<div class="ix-chips" style="margin:0 0 14px">' + ecChip('Recovery Codes Left', String(S.recoveryLeft), S.recoveryLeft > 2) + '</div>' + (S.recoveryLeft <= 2 ? '<p class="ix-note">Running low. Make new recovery codes and keep them somewhere safe.</p>' : '') +
          '<div class="ix-frm">' + ecField('ix-2p', 'Website Password', 'password', 'current-password') + '</div>' +
          '<div class="ix-fact"><p class="ix-err" id="ix-2e"></p><button type="button" class="ix-btn" id="ix-rc">New Recovery Codes</button><button type="button" class="ix-btn danger" id="ix-off">Turn Off</button></div>',
          '<span class="ix-pill good">On</span>') + '<div id="ix-rcs"></div>';
      box.querySelector('#ix-off').onclick = function () { api('twostep_disable', { password: box.querySelector('#ix-2p').value }).then(function (j) {
        if (!j.ok) { box.querySelector('#ix-2e').textContent = j.error; return; } S.twoStep = false; twoStep(box); toast('Two-step login is off.'); if (secRefresh) secRefresh(); }); };
      box.querySelector('#ix-rc').onclick = function () { api('recovery_new', { password: box.querySelector('#ix-2p').value }).then(function (j) {
        if (!j.ok) { box.querySelector('#ix-2e').textContent = j.error; return; } S.recoveryLeft = j.recovery.length; if (secRefresh) secRefresh(); showCodes(box.querySelector('#ix-rcs'), j.recovery); }); };
      return;
    }
    var how = function (n, t, d) { return '<div class="ix-mini"><span class="ix-num">' + n + '</span><b>' + t + '</b><p>' + d + '</p></div>'; };
    var tsBar = function (at) { return stepBar(['Get an App', 'Scan the Code', 'Type the Code', 'Save Recovery Codes'], at, { locked: true, done: [0, 1, 2, 3].map(function (i) { return i < at; }) }); };   // (1.66.0)
    box.innerHTML = ecCard('ix-split', ICON.device, 'Two-Step Login', 'A 6-digit code from an authenticator app, on top of your password. Your password alone is no longer enough: a thief would also need your phone.',
        '<div class="ix-trio" style="margin:0 0 14px">' + how(1, 'Get an App', 'Any authenticator app works: Google Authenticator, Microsoft Authenticator, Aegis, 1Password.') + how(2, 'Scan the Code', 'Point the app at the code on the next screen.') + how(3, 'Save Your Codes', 'Keep the recovery codes somewhere safe, for the day you lose your phone.') + '</div>' +
        '<div class="ix-row"><button type="button" class="ix-btn pri" id="ix-on">Set Up Two-Step Login</button></div>', '<span class="ix-pill">Off</span>');
    box.querySelector('#ix-on').onclick = function () {
      api('twostep_begin', {}).then(function (j) {
        if (!j.ok) { toast(j.error); return; }
        box.innerHTML = head + tsBar(1) + '<div class="ix-duo">' + ecCard('', ICON.device, 'Step 1: Scan the Code', 'Scan this with your authenticator app, or on your phone tap <a href="' + esc(j.uri) + '">open in app</a>. You can also type the key by hand.',
            '<div class="ix-qr" id="ix-qr"></div>' + linkField({ value: j.secret.replace(/(.{4})/g, '$1 ').trim(), copyText: j.secret, prefix: 'Key', readonly: true, label: 'Two-step key', cls: 'ix-uf-key', wrap: true })) +
          ecCard('', ICON.check, 'Step 2: Type the 6-Digit Code', 'The app now shows a code that changes every 30 seconds. Type the current one to finish.',
            '<div class="ix-fd"><label for="ix-tc">6-Digit Code</label><input type="text" id="ix-tc" inputmode="numeric" autocomplete="one-time-code" maxlength="7" style="max-width:220px"></div>' +
            '<p class="ix-err" id="ix-te2"></p><div class="ix-row"><button type="button" class="ix-btn pri" id="ix-en">Turn On</button></div>') + '</div><div id="ix-rcs"></div>';
        qr(box.querySelector('#ix-qr'), j.uri);
        box.querySelector('#ix-tc').addEventListener('focus', function () { [].forEach.call(box.querySelectorAll('.ix-sbi'), function (x, k) { x.classList.toggle('now', k === 2); x.classList.toggle('done', k < 2); }); });
        box.querySelector('#ix-en').onclick = function () {
          api('twostep_enable', { code: box.querySelector('#ix-tc').value }).then(function (k) {
            if (!k.ok) { box.querySelector('#ix-te2').textContent = k.error; return; }
            S.twoStep = true; S.recoveryLeft = k.recovery.length; if (secRefresh) secRefresh();
            box.innerHTML = head + tsBar(3) + ecCard('good', ICON.shield, 'Two-Step Login Is On', 'From now on, logins ask for the 6-digit code. Save your recovery codes below before you leave this page.', '') + '<div id="ix-rcs"></div>'; showCodes(box.querySelector('#ix-rcs'), k.recovery);
          });
        };
      });
    };
  }
  function showCodes(box, codes) {
    var d = document.createElement('div');
    d.innerHTML = ecCard('', ICON.key, 'Recovery Codes', 'Each code works once, if you don\'t have your phone. Save them somewhere safe now: they won\'t be shown again.',
      '<div class="ix-codes">' + codes.map(function (c) { return '<span class="ix-mono">' + esc(c) + '</span>'; }).join('') + '</div>' +
      '<div class="ix-row"><button type="button" class="ix-btn">' + svg(ICON.copy) + 'Copy Codes</button></div>');
    d.querySelector('button').onclick = function () { navigator.clipboard && navigator.clipboard.writeText(codes.join('\n')).then(function () { toast('Copied.'); }); };
    box.appendChild(d);
  }
  function qr(el, text) {
    var s = document.createElement('script'); s.src = ASSETS + 'vendor/qrcode.js';
    s.onload = function () { try { var q = window.qrcode(0, 'M'); q.addData(text); q.make(); el.innerHTML = q.createImgTag(5, 0); } catch (e) { el.hidden = true; } };
    s.onerror = function () { el.hidden = true; };
    document.head.appendChild(s);
  }


  /* --- Backup --- */
  var NAMES = { links: 'Links', info: 'Info', cards: 'Cards', tasks: 'Tasks', files: 'Files', home: 'Home', settings: 'Settings', telegram: 'Telegram', tools: 'Tools Presets' };
  function size(n) { return n >= 1073741824 ? (n / 1073741824).toFixed(1) + ' GB' : n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }   // (1.61.6) GB from 1 GB up
  function openBackup() { go('backup'); }
  /* "3 days ago", "2 hours ago", "just now" */
  function ago(t) {
    var d = Date.now() / 1000 - t;
    if (d < 90) return 'just now';
    if (d < 5400) return Math.round(d / 60) + ' minutes ago';
    if (d < 129600) return Math.round(d / 3600) + ' hours ago';
    var n = Math.round(d / 86400); return n === 1 ? '1 day ago' : n + ' days ago';
  }
  /* Backup: a status card, then Export (open), Import and Earlier Versions (both folded until you open them). */
  /* Export Data: the page's data is read through the API; the CSV or JSON file is made here in the browser */
  function csvCell(v) { v = String(v == null ? '' : v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function scalars(o) {
    var r = {}; Object.keys(o || {}).forEach(function (k) {
      var v = o[k];
      if (v === null || v === undefined) r[k] = '';
      else if (Array.isArray(v)) { if (v.every(function (x) { return typeof x !== 'object'; })) r[k] = v.join('; '); }
      else if (typeof v !== 'object') r[k] = typeof v === 'string' && v.length > 2000 ? '' : v;   // pictures stored inside a record are not spreadsheet material
    }); return r;
  }
  function exportRows(app, data) {
    var rows = [], locked = 0;
    if (app === 'links') (data.tabs || []).forEach(function (t) {
      if (typeof t.enc === 'string') { locked++; return; }
      (t.categories || []).forEach(function (c) { (c.links || []).forEach(function (l) { if (!l.divider) rows.push(Object.assign({ tab: t.title || '', category: c.title || c.name || '' }, scalars(l))); }); });
    });
    else if (app === 'cards') (data.cards || []).forEach(function (c) { rows.push(scalars(c)); });
    else (data.tasks || []).forEach(function (t) { var r = scalars(t); if (t.repeat) { r.repeat_every = t.repeat.n; r.repeat_unit = t.repeat.unit; } rows.push(r); });
    return { rows: rows, locked: locked };
  }
  function download(name, mime, text, bom) {
    var a = document.createElement('a'), u = URL.createObjectURL(new Blob([bom ? '\ufeff' : '', text], { type: mime }));
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
  }
  /* ---------- (1.72.0) the Import Center (Backup & Restore › Import) ----------
     importer.js reads the file here in the browser; the list shows what was found (all ticked, past calendar events not); Add hands what
     is ticked to the page it goes to (sessionStorage "hub-import", read once by HUB.importTake), which adds it with its own save and
     offers Undo. Info gets one new tab of at most 12 boxes, Links one new tab with a category per folder or tag. */
  var impP = null;
  function importer() {
    if (window.HubImport) return Promise.resolve(window.HubImport);
    return impP || (impP = new Promise(function (ok, fail) {
      var me = document.querySelector('script[src*="shell.js"]'), ver = me ? ((/\?v=[^&#]+/.exec(me.src) || [''])[0]) : '';
      var sc = document.createElement('script'); sc.src = ASSETS + 'importer.js' + ver;
      sc.onload = function () { if (window.HubImport) ok(window.HubImport); else { impP = null; fail(); } }; sc.onerror = function () { impP = null; fail(); };
      document.head.appendChild(sc);
    }));
  }
  var IMP_PAGE = { tasks: ['Tasks', 'web/tasks/', 'tasks'], info: ['Info', 'web/info/', 'notes'], links: ['Links', 'web/links/', 'links'], cards: ['Cards', 'web/cards/', 'cards'] };
  var IMP_FIELD = { bank: 'Bank', name: 'Card Name', network: 'Network', variant: 'Variant', kind: 'Credit or Debit', type: 'Fee Type', limit: 'Limit', fee: 'Annual Fee', expiry: 'Expiry', owner: 'Holder', remark: 'Remark' };
  /* notes into the boxes of one tab: a box per note when there are 12 or fewer; else a box per folder or label (the notes in it under headings) */
  function packBoxes(notes) {
    if (notes.length <= 12) return notes.map(function (n) { return { title: n.title, notes: n.notes }; });
    var groups = [], by = {};
    notes.forEach(function (n) { var g = n.group || 'Notes'; if (!by[g]) { by[g] = []; groups.push(g); } by[g].push(n); });
    groups.sort(function (a, b) { return by[b].length - by[a].length; });
    if (groups.length > 12) { var rest = [].concat.apply([], groups.slice(11).map(function (g) { return by[g]; })); groups = groups.slice(0, 11).concat(['More']); by.More = rest; }
    if (groups.length === 1) {   // one big group: share it out over 12 boxes, in order
      var per = Math.ceil(notes.length / 12); groups = []; by = {};
      for (var i = 0; i < notes.length; i += per) { var nm = 'Notes ' + (i + 1) + '–' + Math.min(notes.length, i + per); groups.push(nm); by[nm] = notes.slice(i, i + per); }
    }
    return groups.map(function (g) { return { title: g.slice(0, 80), notes: by[g].map(function (n) { return '### ' + n.title + (n.notes ? '\n\n' + n.notes : ''); }).join('\n\n---\n\n') }; });
  }
  function bindImport(p) {
    var inp = p.querySelector('#ix-imfile'), drop = p.querySelector('#ix-imdrop'), res = p.querySelector('#ix-imres'); if (!inp) return;
    var cur = null, on = [];
    var take = function (files) {
      if (!files || !files.length) return;
      res.innerHTML = spinRow('Reading ' + esc(files.length === 1 ? files[0].name : files.length + ' files') + '…');
      importer().then(function (H) { return H.read(files); }).then(function (r) { cur = r; on = r.items ? r.items.map(function (x) { return !x.past; }) : []; draw(); },
        function () { res.innerHTML = '<p class="ix-err">The importer could not load. Reload the page and try again.</p>'; });
    };
    inp.onchange = function () { var fl = [].slice.call(inp.files || []); inp.value = ''; take(fl); };   // a copy: clearing the box empties its list
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); take([].slice.call((e.dataTransfer && e.dataTransfer.files) || [])); });
    var line = function (r, x) {
      if (r.to === 'tasks') return [x.name, [x.due + (x.time ? ' ' + x.time : ''), x.repeat && x.repeat.unit !== 'none' ? 'repeats' : '', x.past ? 'already past' : ''].filter(Boolean).join(' · ')];
      if (r.to === 'info') return [x.title, (x.group && x.group !== 'Notes' ? x.group + ' · ' : '') + (x.notes || '').replace(/\s+/g, ' ').slice(0, 90)];
      if (r.to === 'links') return [x.title, x.group + ' · ' + x.url];
      return [[x.bank, x.name].filter(Boolean).join(' '), [x.network, x.owner, x.expiry].filter(Boolean).join(' · ')];
    };
    function draw() {
      var r = cur; if (!r) return;
      if (r.error) { res.innerHTML = '<p class="ix-err">' + esc(r.error) + '</p>'; return; }
      if (!r.items.length) { res.innerHTML = '<p class="ix-err">Nothing to import was found in this file.</p>'; return; }
      var pg = IMP_PAGE[r.to], shown = r.items.slice(0, 500);
      var map = r.to === 'cards' ? '<div class="ix-immap">' + window.HubImport.FIELDS.map(function (f) {
        return '<label>' + IMP_FIELD[f] + '<select data-f="' + f + '"><option value="">(none)</option>' + r.head.map(function (h) { return '<option' + (r.map[f] === h ? ' selected' : '') + '>' + esc(h) + '</option>'; }).join('') + '</select></label>'; }).join('') + '</div>' : '';
      res.innerHTML = '<div class="ix-status"><span class="ix-ok">✓</span><span><b>' + esc(r.label) + '</b>: ' + r.items.length + ' ' + pg[2] + ' found. They go to <b>' + pg[0] + '</b>' +
          (r.to === 'info' ? ', as a new tab' : r.to === 'links' ? ', as a new tab with a category per folder or tag' : '') + '. What is already there is not added twice.</span></div>' + map +
        '<div class="ix-imtools"><button type="button" class="ix-linkbtn" data-imall="1">Tick All</button><button type="button" class="ix-linkbtn" data-imall="0">Untick All</button><span class="ix-mu" id="ix-imn"></span></div>' +
        '<div class="ix-imlist">' + shown.map(function (x, i) { var l = line(r, x); return '<label class="ix-imrow"><input type="checkbox" data-i="' + i + '"' + (on[i] ? ' checked' : '') + '><span><b>' + esc(l[0] || '(no name)') + '</b><small>' + esc(l[1] || '') + '</small></span></label>'; }).join('') +
          (r.items.length > 500 ? '<p class="ix-note">The first 500 are listed; the other ' + (r.items.length - 500) + ' are added too.</p>' : '') + '</div>' +
        '<p class="ix-err" id="ix-imerr"></p><div class="ix-row"><button type="button" class="ix-btn pri" id="ix-imgo">' + svg(ICON.upload) + 'Add to ' + pg[0] + '</button></div>';
      var count = function () { var n = on.filter(Boolean).length + Math.max(0, r.items.length - 500); res.querySelector('#ix-imn').textContent = n + ' of ' + r.items.length + ' ticked'; };
      count();
      res.querySelectorAll('[data-i]').forEach(function (c) { c.onchange = function () { on[+c.dataset.i] = c.checked; count(); }; });
      res.querySelectorAll('[data-imall]').forEach(function (b) { b.onclick = function () { var v = b.dataset.imall === '1'; on = on.map(function () { return v; }); res.querySelectorAll('[data-i]').forEach(function (c) { c.checked = v; }); count(); }; });
      res.querySelectorAll('[data-f]').forEach(function (sel) { sel.onchange = function () {   // Cards: another column for this field, and the list is read again
        r.map[sel.dataset.f] = sel.value; r.items = window.HubImport.cards(r.csv, r.map); on = r.items.map(function () { return true; }); draw(); }; });
      res.querySelector('#ix-imgo').onclick = function () {
        var pick = r.items.filter(function (x, i) { return i >= 500 || on[i]; });
        if (!pick.length) { res.querySelector('#ix-imerr').textContent = 'Tick at least one.'; return; }
        var out = { to: r.to, src: r.label };
        if (r.to === 'info') { out.tab = ('From ' + r.label).slice(0, 40); out.boxes = packBoxes(pick); }
        else if (r.to === 'links') {
          var cats = [], by = {}; pick.forEach(function (l) { var g = l.group || 'Links'; if (!by[g]) { by[g] = { title: g, links: [] }; cats.push(by[g]); } by[g].links.push({ title: l.title, url: l.url }); });
          out.tab = ('From ' + r.label).slice(0, 40); out.cats = cats;
        } else out.items = pick;
        var raw = JSON.stringify(out);
        if (raw.length > 1800000) { res.querySelector('#ix-imerr').textContent = 'That is too much for one go (' + Math.round(raw.length / 1e6 * 10) / 10 + ' MB of text). Untick some and add the rest after.'; return; }
        try { sessionStorage.setItem('hub-import', raw); } catch (e) { res.querySelector('#ix-imerr').textContent = 'This browser could not hold that much. Untick some and add the rest after.'; return; }
        location.href = ROOT + pg[1] + '#hub-import';
      };
    }
  }
  function bindExport(p) {
    if (p.__xb) return; p.__xb = true;
    p.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-export]'); if (!b) return;
      var app = b.dataset.export, fmt = b.dataset.fmt, st = document.getElementById('ix-xs'); b.disabled = true; if (st) st.textContent = 'Reading your ' + app + '…';
      api('export&app=' + app).then(function (j) {
        if (!(app === 'cards' && j && j.ok && j.data && typeof j.data.enc === 'string')) return j;
        if (st) st.textContent = 'Opening your locked cards…';   // locked in the browser (1.61.0): opened here with your passphrase, never on the server
        return window.HubSite.openJson(j.data.enc).then(function (d) { j.data = d; return j; }, function (e) { return { ok: false, error: e && e.code === 'cancel' ? 'Not exported: Cards are locked and need your passphrase.' : 'Your cards could not be unlocked, so nothing was exported.' }; });
      }).then(function (j) {
        b.disabled = false;
        if (!j || !j.ok) { if (st) st.textContent = (j && j.error) || 'Could not read the data.'; return; }
        var day = new Date().toISOString().slice(0, 10), r = exportRows(app, j.data);
        if (fmt === 'html') {   // (1.61.0) the bookmark file other browsers import, made here
          var pv = document.getElementById('ix-bmpriv'), all = j.data.tabs || [], lk = all.filter(function (t) { return typeof t.enc === 'string'; }).length;
          var pick = all.filter(function (t) { return typeof t.enc !== 'string' && (pv && pv.checked || !t.private); });
          var cnt = pick.reduce(function (a, t) { return a + (t.categories || []).reduce(function (b, c) { return b + (c.links || []).filter(function (l) { return !l.divider; }).length; }, 0); }, 0);
          if (!cnt) { if (st) st.textContent = 'There is nothing to export yet' + (lk ? ' (encrypted tabs stay locked).' : '.'); return; }
          download('bookmarks-' + day + '.html', 'text/html', window.HUB.bookmarksHtml(pick, (j.data.settings && j.data.settings.title) || 'Bookmarks'));
          if (st) st.textContent = 'Saved bookmarks-' + day + '.html with ' + cnt + (cnt === 1 ? ' bookmark.' : ' bookmarks.') + (lk ? ' ' + lk + (lk === 1 ? ' encrypted tab was' : ' encrypted tabs were') + ' left out.' : ''); return;
        }
        if (fmt === 'json') { download(app + '-' + day + '.json', 'application/json', JSON.stringify(j.data, null, 2)); if (st) st.textContent = 'Saved ' + app + '-' + day + '.json.'; return; }
        var cols = []; r.rows.forEach(function (x) { Object.keys(x).forEach(function (k) { if (cols.indexOf(k) < 0) cols.push(k); }); });
        if (!r.rows.length) { if (st) st.textContent = 'There is nothing to export yet' + (r.locked ? ' (only encrypted tabs, which stay locked).' : '.'); return; }
        download(app + '-' + day + '.csv', 'text/csv', [cols.map(csvCell).join(',')].concat(r.rows.map(function (x) { return cols.map(function (k) { return csvCell(x[k]); }).join(','); })).join('\r\n'), true);
        if (st) st.textContent = 'Saved ' + app + '-' + day + '.csv with ' + r.rows.length + (r.rows.length === 1 ? ' row.' : ' rows.') + (r.locked ? ' ' + r.locked + (r.locked === 1 ? ' encrypted tab was' : ' encrypted tabs were') + ' left out.' : '');
      }, function () { b.disabled = false; if (st) st.textContent = 'Can\'t reach the server.'; });
    });
  }
  /* ---------- Cloud Backup (1.77.0): an encrypted copy sent to a WebDAV folder (Nextcloud, ownCloud, a NAS, a Storage Box) ---------- */
  function cloudCard(c, enc) {
    if (!c || !c.ok) return '';
    var every = [[1, 'Daily'], [3, 'Every 3 Days'], [7, 'Weekly']], keeps = [7, 14, 30, 60, 90];
    var status = c.error ? '<p class="ix-note"><span class="ix-err">Last problem: ' + esc(c.error) + '</span></p>'
      : c.last ? '<p class="ix-note">Last copy: ' + esc(when(c.last)) + ' · ' + esc(c.lastName) + ' (' + Math.max(1, Math.round(c.lastSize / 1024)) + ' KB).' + (c.note ? ' ' + esc(c.note) : '') + '</p>' : '<p class="ix-note">No copy sent yet.</p>';
    return '<div id="ix-cloud">' + ecCard(c.on ? 'good' : '', ICON.box, 'Cloud Backup', 'An encrypted copy of the whole site, sent to a WebDAV folder (Nextcloud, ownCloud, Synology, a Storage Box or another server). ' +
      'It is always locked with your ' + (enc.mode === 'login' ? 'website password' : 'encryption passphrase') + ', and the password for the cloud stays on your server.' +
      (c.encReady ? '' : ' <b>Set an encryption passphrase first</b> (Settings › Security): without one, nothing is sent.'),
      '<div class="ix-fdgrid">' + ecField('ix-clurl', 'WebDAV Address', 'url', 'off', 'Like https://cloud.example.com/remote.php/dav/files/you/. On your own network, http:// works too.', '', ' value="' + esc(c.url) + '" spellcheck="false" placeholder="https://"') +
        ecField('ix-cluser', 'User Name', 'text', 'off', '', '', ' value="' + esc(c.user) + '" spellcheck="false"') +
        ecField('ix-clpass', 'Password', 'password', 'new-password', c.hasPass ? 'A password is saved. Type a new one only to change it.' : 'For Nextcloud, make an app password in its security settings.', '', ' placeholder="' + (c.hasPass ? 'Saved' : '') + '"') +
        ecField('ix-cldir', 'Folder', 'text', 'off', 'Made for you inside that address.', '', ' value="' + esc(c.dir) + '" spellcheck="false"') + '</div>' +
      '<div class="ix-row"><label class="ix-lab" for="ix-clevery">Copy</label><select id="ix-clevery" aria-label="How often">' + every.map(function (e) { return '<option value="' + e[0] + '"' + (c.every === e[0] ? ' selected' : '') + '>' + e[1] + '</option>'; }).join('') + '</select>' +
        '<label class="ix-lab" for="ix-clkeep">Keep</label><select id="ix-clkeep" aria-label="How many copies to keep">' + keeps.map(function (k) { return '<option value="' + k + '"' + (c.keep === k ? ' selected' : '') + '>' + k + ' copies</option>'; }).join('') + '</select></div>' +
      '<label class="ix-tg"><span>Send Copies on a Schedule<small>One try a day. Older copies this feature made are removed after a new one arrives; nothing else in the folder is touched.</small></span><input type="checkbox" id="ix-clon"' + (c.on ? ' checked' : '') + '></label>' +
      status +
      '<div class="ix-row"><button type="button" class="ix-btn pri" id="ix-clsave">Save</button><button type="button" class="ix-btn" id="ix-cltest">Test Connection</button><button type="button" class="ix-btn" id="ix-clnow">' + svg(ICON.box) + 'Back Up Now</button></div>' +
      '<p class="ix-note" id="ix-clmsg" aria-live="polite"></p>') + '</div>';
  }
  function wireCloud(p, c) {
    var box = p.querySelector('#ix-cloud'); if (!box) return;
    var q = function (id) { return box.querySelector(id); }, msg = function (t, bad) { var m = q('#ix-clmsg'); m.textContent = t; m.className = 'ix-note' + (bad ? ' ix-err' : ''); };
    var body = function () { return { url: q('#ix-clurl').value.trim(), user: q('#ix-cluser').value.trim(), pass: q('#ix-clpass').value, dir: q('#ix-cldir').value.trim(), every: +q('#ix-clevery').value, keep: +q('#ix-clkeep').value, on: q('#ix-clon').checked }; };
    var busy = function (b, t, on) { b.disabled = on; if (on) { b.dataset.t = b.textContent; b.textContent = t; } else if (b.dataset.t) b.textContent = b.dataset.t; };
    q('#ix-clsave').onclick = function () {
      var b = this; busy(b, 'Saving…', true);
      api('cloud_save', body()).then(function (r) { busy(b, '', false); if (r.ok) { toast('Cloud Backup saved.'); pBackup(p); } else msg(r.error || 'Could not save.', true); });
    };
    q('#ix-cltest').onclick = function () {
      var b = this; busy(b, 'Testing…', true); msg('Connecting…');
      api('cloud_test', body(), 'POST', { timeout: 60000 }).then(function (r) { busy(b, '', false); msg(r.ok ? r.message : (r.error || r.message || 'It did not work.'), !r.ok); });
    };
    q('#ix-clnow').onclick = function () {
      var b = this; busy(b, 'Backing up…', true); msg('Making the copy and sending it. A big site can take a minute.');
      api('cloud_save', body()).then(function (s) {
        if (!s.ok) { busy(b, '', false); msg(s.error || 'Could not save.', true); return; }
        return api('cloud_run', {}, 'POST', { timeout: 600000 }).then(function (r) { busy(b, '', false); if (r.ok) { toast(r.message); pBackup(p); } else msg(r.error || r.message || 'It did not work.', true); });
      });
    };
  }
  function pBackup(p) {
    bindExport(p);
    p.innerHTML = '<p>Loading…</p>';
    Promise.all([api('backup_overview'), api('notify').catch(function () { return {}; }), api('bkkey').catch(function () { return {}; }), api('cloud_get').catch(function () { return {}; })]).then(function (r) {
      var j = r[0], n = r[1] || {}, enc = r[2] || {}, cl = r[3] || {};
      if (!j.ok) { p.innerHTML = '<p class="ix-err">' + esc(j.error) + '</p>'; return; }
      var parts = j.parts, last = +S.backupLast || 0, every = +S.backupEvery || 0;
      var due = every > 0 && (!last || (Date.now() / 1000 - last) / 86400 >= every);
      var tgOn = !!(n.ok && n.hasToken && n.chat);
      var newest = j.versions.length ? j.versions.reduce(function (a, v) { return v.time > a ? v.time : a; }, 0) : 0;
      p.innerHTML =
        // (1.77.3) one hero box: what a backup is, when the last one was, and the Download button. Reminder and automatic copies follow as rows.
        '<div class="ix-bkhero' + (due ? ' due' : '') + '"><span class="ix-bkhero-i">' + svg(ICON.box) + '</span><div class="ix-bkhero-t"><b>Back Up Your Site</b>' +
          '<span>' + (last ? 'Last full backup ' + esc(ago(last)) + ' (' + esc(when(last)) + ')' : 'No full backup yet') + (due ? ' · <em>A backup is due</em>' : '') + '</span>' +
          '<small>One file that brings back your pages and settings, on this server or any other.</small><small id="ix-bksum" class="ix-mu"></small></div>' +
          '<button type="button" class="ix-btn pri ix-big" id="ix-exp">' + svg(ICON.box) + 'Download Backup</button></div>' +
        '<div class="ix-status">' + (enc.set ? '<span class="ix-ok">🔒</span><span><b>Backup Files Are Locked</b> and open only with your ' + (enc.mode === 'login' ? 'website password' : 'encryption passphrase') + '. '
          : '<span>!</span><span><b>Backup files are not locked.</b> Set an encryption passphrase and every backup is locked. ') + '<a href="#" id="ix-encgo2">' + (enc.set ? 'Change' : 'Set one') + ' in Settings › Security</a></span></div>' +
        '<div class="ix-rcl">' + rowCard({ ic: ICON.clock, title: 'Remind Me to Back Up', desc: due ? 'A backup is due.' : every ? 'Not due yet.' : 'No reminders. Pick how often you want one.',
          act: '<select id="ix-every" aria-label="Remind me every">' + [0, 1, 3, 7, 14, 30].map(function (d) { return '<option value="' + d + '"' + (every === d ? ' selected' : '') + '>' + (d ? 'Every ' + d + (d > 1 ? ' Days' : ' Day') : 'Never') + '</option>'; }).join('') + '</select>' }) + '</div>' +
        // (1.70.0) moved here from Telegram > Backups
        '<div id="ix-tgbk">' + ecCard(tgOn && n.bkEvery ? 'good' : '', ICON.send, 'Send Backups to Telegram', 'The whole site as one file, sent to your Telegram chat at your daily message hour. ' +
            (enc.set ? 'Locked like the files you download.' : 'Not locked: anyone who gets into your Telegram could open it.'),
          tgOn ? seg('nbk', [[0, 'Off'], [1, 'Daily'], [3, 'Every 3 Days'], [7, 'Weekly'], [14, 'Every 2 Weeks'], [30, 'Monthly']], n.bkEvery || 0) +
            '<p class="ix-note">Last backup sent: ' + (n.bkLast ? esc(when(n.bkLast)) : 'none yet') + '.' + (n.bkError ? ' <span class="ix-err">Last problem: ' + esc(n.bkError) + '</span>' : '') + '</p>' +
            '<div class="ix-row"><button type="button" class="ix-btn" id="ix-tgbknow">' + svg(ICON.send) + 'Send Backup Now</button></div>'
            : '<p class="ix-note">Connect a Telegram bot first.</p><div class="ix-row"><button type="button" class="ix-btn pri" id="ix-tgsetup">Set Up Telegram</button></div>') + '</div>' +
        cloudCard(cl, enc) +
        '<details class="ix-more" id="ix-choose"><summary>Choose What to Include</summary>' +
          [['pages', 'Pages', 'Links, Info, Cards, Tasks, Home and Tools presets.'], ['site', 'Site', 'Your settings and Telegram.']].concat(parts.files ? [['files', 'Files', 'The files you keep on the Files page. Can be big, so it is off unless you want it.']] : []).map(function (g) {
            return '<label class="ix-tg"><span>' + g[1] + '<small>' + g[2] + '</small></span><input type="checkbox" data-grp="' + g[0] + '"></label>'; }).join('') +
          '<details class="ix-more ix-onebyone"><summary>Pick Parts One by One</summary>' +
          '<div class="ix-bkh"><b>What to Include</b><span class="ix-mu"><a href="#" id="ix-bkall">All</a> · <a href="#" id="ix-bknone">None</a></span></div>' +
          '<div class="ix-bkgrid">' + Object.keys(NAMES).map(function (k) {
            var pt = parts[k] || {}, tabs = pt.tabs && pt.tabs.length ? pt.tabs : null;
            return '<div class="ix-bkp"><label class="ix-bkl"><input type="checkbox" data-part="' + k + '" data-size="' + (+pt.size || 0) + '"' + (k === 'files' ? '' : ' checked') + '><span class="ix-bkn"><b>' + NAMES[k] + '</b><small title="' + esc(pt.summary || '') + '">' + esc(pt.summary || '') + '</small></span>' + (pt.size ? '<em>' + size(pt.size) + '</em>' : '') + '</label>' +
              (tabs ? '<button type="button" class="ix-linkbtn" data-tabsbtn="' + k + '">Choose tabs (' + tabs.length + ')</button><div class="ix-tabs" data-tabs="' + k + '" hidden>' + tabs.map(function (t) {
                return '<label><input type="checkbox" value="' + esc(t.id) + '" checked>' + esc(t.name || 'Tab') + (t.enc ? ' 🔒' : t.private ? ' (private)' : '') + '</label>'; }).join('') + '</div>' : '') + '</div>';
          }).join('') + '</div></details></details>' +
        '<p class="ix-note">Keep backup files somewhere other than this server.</p>' +
        '<details class="ix-acc"><summary><span>Restore</span><small>Bring everything back from a backup file.</small></summary><div class="ix-accb">' +
          '<div id="ix-rst"></div>' +
          '<h3 class="ix-h3" id="ix-vacc">Earlier Versions</h3><p>' + (j.versions.length ? j.versions.length + ' saved' + (newest ? ', newest ' + esc(ago(newest)) : '') : 'None yet') + '. Up to 40 per page, one every 10 minutes, kept automatically while you edit. Restoring keeps a copy first.</p>' +
          '<div class="ix-row" id="ix-vf" style="margin-bottom:6px">' + seg('vf', [['all', 'All']].concat(['links', 'info', 'cards', 'tasks', 'home'].map(function (k) {
            var c = j.versions.filter(function (v) { return v.app === k; }).length; return [k, NAMES[k] + (c ? ' ' + c : '')]; })), 'all') + '</div><div id="ix-vl"></div></div></details>' +
        '<details class="ix-acc" id="ix-xacc"><summary><span>Export</span><small>Spreadsheets, JSON, and bookmarks for other browsers</small></summary><div class="ix-accb">' +
          tabHead(ICON.file, 'Export', 'One page at a time, to open in a spreadsheet, another browser, or to keep. This is not a backup: use Back Up for that.') +
          [['links', 'Links', ICON.bookmark, 'Every bookmark with its tab, category, name and address. Encrypted tabs stay locked and are left out of the spreadsheet.'],
           ['cards', 'Cards', ICON.card, 'Every card with its details, one row each.'],
           ['tasks', 'Tasks', ICON.check, 'Every task with its due date, repeat, price and notes.']].map(function (x) {
            return ecCard('', x[2], x[1], x[3], '<div class="ix-row"><button type="button" class="ix-btn pri" data-export="' + x[0] + '" data-fmt="csv">' + svg(ICON.down) + 'Download CSV</button><button type="button" class="ix-btn" data-export="' + x[0] + '" data-fmt="json">' + svg(ICON.down) + 'Download JSON</button></div>'); }).join('') +
          ecCard('', ICON.bookmark, 'Bookmarks for Other Browsers', 'The standard bookmark file that Chrome, Edge, Firefox and Safari can import. Encrypted tabs stay locked here; to include them, unlock them and use Export Bookmarks in Links Settings.',
            '<label class="ix-tg"><span>Include Private Tabs<small>Also writes your private tabs. The file is plain text: keep it safe.</small></span><input type="checkbox" id="ix-bmpriv"></label><div class="ix-row"><button type="button" class="ix-btn pri" data-export="links" data-fmt="html">' + svg(ICON.down) + 'Download Bookmark File</button></div>') +
          '<p class="ix-note" id="ix-xs">The files hold your data as plain text. Keep them somewhere safe.</p></div></details>' +
        // (1.72.0) the Import Center: another app's export becomes tasks, notes, links or cards (importer.js reads it here in the browser)
        '<details class="ix-acc" id="ix-iacc"><summary><span>Import</span><small>From Todoist, Google Keep, Notion, a calendar, Raindrop, Pocket and more</small></summary><div class="ix-accb">' +
          tabHead(ICON.upload, 'Import', 'Bring in what you keep in another app. You see everything first; nothing is added until you press Add, and Undo takes it back.') +
          '<div class="ix-imfrom">' + [['Calendar (.ics)', 'Tasks'], ['Todoist (CSV)', 'Tasks'], ['Google Keep (Takeout)', 'Info'], ['Notion (Markdown export)', 'Info'], ['Notes (.txt, .md, .html)', 'Info'],
            ['Raindrop (CSV)', 'Links'], ['Pocket', 'Links'], ['Bookmarks (.html)', 'Links'], ['Cards (CSV)', 'Cards']].map(function (x) { return '<span><b>' + x[0] + '</b>' + svg('M5 12h14M13 6l6 6-6 6') + x[1] + '</span>'; }).join('') + '</div>' +
          '<label class="ix-drop" id="ix-imdrop"><input type="file" id="ix-imfile" multiple accept=".ics,.csv,.json,.zip,.md,.markdown,.txt,.html,.htm"><b>Choose a File</b><span>or drop it here. A .zip from Google Takeout or Notion is read as a whole.</span></label>' +
          '<div id="ix-imres" aria-live="polite"></div></div></details>' +
        '<details class="ix-acc ix-danger" id="ix-reset"><summary><span>Start Over</span><small>Erase all data and settings, like a new site</small></summary><div class="ix-accb">' +
          '<div id="ix-rsst"></div></div></details>' +
        '<p class="ix-note">Moving the site? Copy the whole folder: your data is in <code>site-data</code>.</p>';
      wireCloud(p, cl);
      bindImport(p);   // (1.72.0) the Import tab, once it is drawn
      var tgb = p.querySelector('#ix-tgbk');
      if (!tgOn) tgb.querySelector('#ix-tgsetup').onclick = function () { go('telegram/setup'); };
      else {
        bindSeg(tgb, function (k, v) {
          if (k !== 'nbk') return;
          api('notify_save', { bkEvery: +v }).then(function (r2) {
            if (!r2 || !r2.ok) { toast((r2 && r2.error) || 'Could not save.'); pBackup(p); return; }
            toast(r2.bkEvery ? 'Backups will be sent ' + ({ 1: 'every day', 3: 'every 3 days', 7: 'every week', 14: 'every 2 weeks', 30: 'every month' }[r2.bkEvery] || 'regularly') + '.' : 'Backups to Telegram are off.'); pBackup(p);
          }, function () { toast("Can't reach the server."); });
        });
        tgb.querySelector('#ix-tgbknow').onclick = function () {
          var b = this; b.disabled = true; b.lastChild.textContent = 'Sending…';
          api('notify_backup', {}, null, { timeout: 240000 }).then(function (r2) {
            b.disabled = false; b.lastChild.textContent = 'Send Backup Now';
            if (!r2 || !r2.ok) { toast((r2 && r2.error) || 'Something went wrong.'); return; }
            S.backupLast = r2.backupLast || S.backupLast; remember(S); redraw(); toast('Backup sent. Check Telegram.'); pBackup(p);
          }, function () { b.disabled = false; b.lastChild.textContent = 'Send Backup Now'; toast('The site did not answer in time. A backup can still arrive in Telegram: look there before you try again.'); });
        };
      }
      /* (1.69.0) Start Over is a Stepper: What Gets Erased -> Back Up First -> Type ERASE. The last button keeps the Erase Everything look (#ix-rsgo). */
      stepper(p.querySelector('#ix-rsst'), { kind: 'numbers', linear: true, danger: true, lastId: 'ix-rsgo', lastClass: 'ix-erase',
        lastHtml: '<span class="ix-et">Erase Everything</span><span class="ix-ei" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M24 20.188l-8.315-8.209 8.2-8.282-3.697-3.697-8.212 8.318-8.31-8.203-3.666 3.666 8.321 8.24-8.206 8.313 3.666 3.666 8.237-8.318 8.285 8.203z"/></svg></span>',
        steps: [
          { title: 'What Gets Erased', html: '<p><b>This erases:</b> every page\'s data and earlier versions (Links, Info, Cards, Tasks, Start page), your pictures, icons and logo, the site settings and colors, Telegram, the encryption passphrase and Telegram login approval.</p>' +
              '<p><b>This keeps:</b> your password and two-step login, so you can log in again. Encrypted tabs cannot be opened afterwards unless you restore a backup and set the same passphrase.</p>' },
          { title: 'Back Up First', html: '<p>Everything comes back by restoring a backup file (Restore, above). <b>Download a full backup first</b>; it uses what is chosen under Back Up.</p>' +
              '<div class="ix-row"><button type="button" class="ix-btn pri" id="ix-rsbk">' + svg(ICON.down) + 'Download a Backup</button></div>' },
          { title: 'Confirm', html: '<label class="ix-fl2">Type ERASE<input type="text" id="ix-rsc" autocomplete="off" spellcheck="false"></label>' +
              '<label class="ix-fl2">Website Password<input type="password" id="ix-rsp" autocomplete="current-password"></label><p class="ix-err" id="ix-rse"></p>',
            next: function (q, c) {
              var er = p.querySelector('#ix-rse');
              if (p.querySelector('#ix-rsc').value.trim() !== 'ERASE') { er.textContent = 'Type ERASE (in capitals) to confirm.'; return false; }
              if (!p.querySelector('#ix-rsp').value) { er.textContent = 'Type your website password.'; return false; }
              if (!confirm('Erase all data and settings now? This cannot be undone except by importing a backup file.')) return false;
              er.textContent = 'Erasing…';
              return api('reset_all', { confirm: 'ERASE', password: p.querySelector('#ix-rsp').value }).then(function (j) {
                if (!j.ok) { er.textContent = j.error || 'Nothing was erased.'; return false; }
                try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}   // this browser's copies too (theme, cached pages, kept keys)
                window.HubVault.devDropAll();
                er.textContent = '';
                setTimeout(function () { location.reload(); }, 1200);
                return true;
              }, function () { er.textContent = "Can't reach the server. Nothing was erased."; return false; });
            } }],
        done: '<div class="ix-st-fin"><span class="ix-st-big"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg></span><h3>Everything is erased</h3><p>Reloading…</p></div>' });
      p.querySelector('#ix-rsbk').onclick = function () { var x = p.querySelector('#ix-exp'); if (x) x.click(); };
      p.querySelectorAll('[data-tabsbtn]').forEach(function (b) { b.onclick = function () { var t = p.querySelector('[data-tabs="' + b.dataset.tabsbtn + '"]'); t.hidden = !t.hidden; }; });
      // tab choices follow their part's checkbox
      p.querySelectorAll('[data-part]').forEach(function (c) { c.onchange = function () { var t = p.querySelector('[data-tabs="' + c.dataset.part + '"]'), b = p.querySelector('[data-tabsbtn="' + c.dataset.part + '"]'); if (b) b.hidden = !c.checked; if (t && !c.checked) t.hidden = true; }; });
      var bkSum = function () {
        var cs = [].slice.call(p.querySelectorAll('[data-part]')), on = cs.filter(function (c) { return c.checked; }), bytes = on.reduce(function (a, c) { return a + (+c.dataset.size || 0); }, 0), el = p.querySelector('#ix-bksum');
        if (el) el.textContent = on.length + ' of ' + cs.length + ' selected' + (bytes ? ' · about ' + size(bytes) : '');
      };
      var GRP = { pages: ['links', 'info', 'cards', 'tasks', 'home', 'tools'], site: ['settings', 'telegram'], files: ['files'] };
      var syncGrp = function () { p.querySelectorAll('[data-grp]').forEach(function (g) { var cs = GRP[g.dataset.grp].map(function (k) { return p.querySelector('[data-part="' + k + '"]'); }).filter(Boolean); g.checked = cs.length > 0 && cs.every(function (c) { return c.checked; }); }); };
      p.querySelectorAll('[data-grp]').forEach(function (g) { g.onchange = function () { var on = g.checked; GRP[g.dataset.grp].forEach(function (k) { var c = p.querySelector('[data-part="' + k + '"]'); if (c) { c.checked = on; c.dispatchEvent(new Event('change')); } }); }; });
      p.querySelectorAll('[data-part]').forEach(function (c) { c.addEventListener('change', function () { bkSum(); syncGrp(); }); }); bkSum(); syncGrp();
      [['ix-bkall', true], ['ix-bknone', false]].forEach(function (x) { var a = p.querySelector('#' + x[0]); if (a) a.onclick = function (e) { e.preventDefault(); p.querySelectorAll('[data-part]').forEach(function (c) { c.checked = x[1]; c.dispatchEvent(new Event('change')); }); }; });
      p.querySelector('#ix-exp').onclick = function () {
        var q = [], extra = '';
        p.querySelectorAll('[data-part]').forEach(function (c) {
          if (!c.checked) return; q.push(c.dataset.part);
          var t = p.querySelector('[data-tabs="' + c.dataset.part + '"]');
          if (t) { var all = t.querySelectorAll('input'), on = t.querySelectorAll('input:checked');
            if (!on.length) { q.pop(); return; }
            if (on.length < all.length) extra += '&' + c.dataset.part + '_tabs=' + encodeURIComponent([].map.call(on, function (x) { return x.value; }).join(',')); }
        });
        if (!q.length) { toast('Pick at least one part.'); return; }
        // downloaded with the security token in a header (not in the address), then saved from memory
        var btn = this; btn.disabled = true;
        if (enc.set) extra += '&enc=1';   // (1.61.0) a backup is always locked once there is a passphrase
        fetch(CORE + 'api.php?action=backup&parts=' + q.join(',') + extra, { credentials: 'same-origin', headers: { 'X-Hub-CSRF': S.csrf } }).then(function (r) {
          if (!r.ok) return r.json().then(function (j) { throw new Error(j.error || 'Backup failed.'); });
          var name = (/filename="([^"]+)"/.exec(r.headers.get('Content-Disposition') || '') || [])[1] || 'backup.json';
          return r.blob().then(function (blob) {
            var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
            document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
            if (q.length >= Object.keys(NAMES).filter(function (k) { return k !== 'files'; }).length && !/_tabs=/.test(extra) && Object.keys(NAMES).every(function (k) { return k === 'files' || q.indexOf(k) >= 0; })) { S.backupLast = Date.now() / 1000; remember(S); redraw(); pBackup(p); }
            toast('Backup downloaded.');
          });
        }).catch(function (e) { toast(e.message || 'Backup failed.'); }).finally(function () { btn.disabled = false; });
      };
      p.querySelector('#ix-encgo2').onclick = function (e) { e.preventDefault(); go('security'); };
      p.querySelector('#ix-every').onchange = function (e) {
        S.backupEvery = +e.target.value;
        api('settings', { settings: { backupEvery: S.backupEvery } }).then(function () { remember(S); redraw(); toast('Reminder saved.'); pBackup(p); });
      };
      // import: click or drop a file
      /* (1.69.0) Restore is a Stepper: File -> Choose What to Restore -> Restoring (bars). importFile() fills step 2 (or asks for the
         passphrase of an encrypted backup there); the Restore button runs box.__restore. */
      var rst = stepper(p.querySelector('#ix-rst'), { kind: 'bars', linear: true, complete: 'Restore',
        steps: [
          { title: 'File', html: '<label class="ix-dropz" id="ix-dropz"><input type="file" id="ix-imp" accept=".json,.gz,application/json,application/gzip"><b>Drop a Backup File Here</b><span>or click to choose. .json, or .json.gz from Telegram. You pick what to restore next, and what is there now is kept as an earlier version first.</span></label>',
            next: function (q, c) { if (!q.querySelector('#ix-imp').files.length && !rst.__file) { c.err('Choose a backup file first.'); return false; } } },
          { title: 'Choose', html: '<div id="ix-impx"></div>', next: function (q, c) { var bx = q.querySelector('#ix-impx'); if (!bx.__restore) { c.err('Unlock the file first, or choose another one.'); return false; } return bx.__restore(); } }],
        done: '<div class="ix-st-fin"><span class="ix-st-big"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg></span><h3>Restored</h3><p>Reloading…</p></div>' });
      var dz = p.querySelector('#ix-dropz');
      var pickFile = function (f) { if (!f) return; rst.__file = f; var bx = p.querySelector('#ix-impx'); bx.__restore = null; importFile(f, bx); rst.go(2); };
      p.querySelector('#ix-imp').onchange = function (e) { pickFile(e.target.files[0]); };
      ['dragenter', 'dragover'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('over'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('over'); }); });
      dz.addEventListener('drop', function (e) { if (e.dataTransfer.files[0]) pickFile(e.dataTransfer.files[0]); });
      // earlier versions: drawn only when opened, 20 at a time
      var vl = p.querySelector('#ix-vl'), filt = 'all', shown = 20;
      function drawVersions() {
        var all = j.versions.filter(function (v) { return filt === 'all' || v.app === filt; }), list = all.slice(0, shown);
        vl.innerHTML = list.length ? list.map(function (v) {
          return '<div class="ix-ver"><span class="ix-tag">' + NAMES[v.app] + '</span><span>' + esc(ago(v.time)) + ' <small>' + esc(when(v.time)) + '</small></span><span style="color:var(--ix-mu2)">' + size(v.size) + '</span>' +
            '<button type="button" data-hold class="ix-btn" data-app="' + v.app + '" data-id="' + esc(v.id) + '">Restore</button></div>'; }).join('') +
          (all.length > shown ? '<div class="ix-row"><button type="button" class="ix-btn" id="ix-vmore">Show More (' + (all.length - shown) + ')</button></div>' : '') : '<p>No earlier versions yet.</p>';
        vl.querySelectorAll('[data-id]').forEach(function (b) { b.onclick = function () {
          api('version_restore', { app: b.dataset.app, id: b.dataset.id }).then(function (k) {
            if (!k.ok) { toast(k.error); return; } toast(NAMES[b.dataset.app] + ' restored. Reloading…'); setTimeout(function () { location.reload(); }, 900); });
        }; });
        var more = vl.querySelector('#ix-vmore'); if (more) more.onclick = function () { shown += 20; drawVersions(); };
      }
      drawVersions();
      bindSeg(p.querySelector('#ix-vf'), function (k, v) { filt = v; shown = 20; drawVersions(); });
    });
  }
  /* An encrypted backup: the passphrase is asked here and used only in this browser (PBKDF2-SHA256 -> AES-256-GCM, then gzip). */
  function b64bytes(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function decryptBackup(j, pass) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64bytes(j.salt), iterations: j.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    }).then(function (key) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64bytes(j.iv), tagLength: 128 }, key, b64bytes(j.data));
    }).then(function (gz) {
      return new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    });
  }
  function askPassphrase(j, file, box) {
    if (!window.crypto || !crypto.subtle || !window.DecompressionStream) { box.innerHTML = '<p class="ix-err">This browser can\'t open encrypted backups. Use a current Chrome, Edge, Firefox or Safari, on https.</p>'; return; }
    box.innerHTML = '<form class="ix-encask" id="ix-encf"><p style="margin-top:10px"><b>🔒 Encrypted backup</b>' + (j.site ? ' of ' + esc(j.site) : '') + (j.created ? ', ' + esc(new Date(j.created).toLocaleString()) : '') + '.</p>' +
      '<label for="ix-encp">' + (j.pw === 'login' ? 'Website Password' : 'Encryption Passphrase (or Website Password)') + '</label><div class="ix-row"><input type="password" id="ix-encp" autocomplete="' + (j.pw === 'login' ? 'current-password' : 'off') + '" style="flex:1"><button class="ix-btn pri" id="ix-encgo">Unlock</button></div>' +
      '<p class="ix-note">Used only in this browser.</p><p class="ix-err" id="ix-ence"></p></form>';
    var f = box.querySelector('#ix-encf'); box.querySelector('#ix-encp').focus();
    f.onsubmit = function (e) {
      e.preventDefault();
      var b = box.querySelector('#ix-encgo'); b.disabled = true; b.textContent = 'Unlocking…';
      decryptBackup(j, box.querySelector('#ix-encp').value).then(function (text) {
        importFile(new File([text], file.name.replace(/(\.enc)?\.json$/i, '.json'), { type: 'application/json' }), box);
      }, function () { b.disabled = false; b.textContent = 'Unlock'; box.querySelector('#ix-ence').textContent = 'That doesn\'t open this file (or the file was changed).'; });
    };
  }
  function importFile(file, box) {
    if (!file) return;
    // .json.gz (big backups sent to Telegram): unpacked in the browser first
    if (/\.gz$/i.test(file.name)) {
      if (!window.DecompressionStream) { box.innerHTML = '<p class="ix-err">This browser can\'t open .gz files. Use a current Chrome, Edge, Firefox or Safari.</p>'; return; }
      new Response(file.stream().pipeThrough(new DecompressionStream('gzip'))).blob().then(function (b) { importFile(new File([b], file.name.replace(/\.gz$/i, '')), box); },
        function () { box.innerHTML = '<p class="ix-err">This .gz file could not be unpacked.</p>'; });
      return;
    }
    var r = new FileReader();
    r.onload = function () {
      var j; try { j = JSON.parse(r.result); } catch (e) { box.innerHTML = '<p class="ix-err">This isn\'t a backup file (not valid JSON).</p>'; return; }
      if (j.format === 'site-backup-encrypted') return askPassphrase(j, file, box);
      var parts = {};
      if (j.format === 'site-backup') parts = j.parts || {};
      else if (j.format === 'bookmarks-backup') parts = { links: j };
      else if (j.tabs && j.page && j.tabs[0] && j.tabs[0].boxes) parts = { info: j };
      else if (Array.isArray(j.cards)) parts = { cards: j };
      else if (j.format === 'tasks-export' && Array.isArray(j.tasks)) parts = { tasks: j };
      var keys = Object.keys(parts).filter(function (k) { return NAMES[k]; });
      if (!keys.length) { box.innerHTML = '<p class="ix-err">This file isn\'t a site, Links, Info, Cards or Tasks backup.</p>'; return; }
      var tabbed = keys.some(function (k) { return k === 'links' || k === 'info'; });
      box.innerHTML = '<p style="margin-top:10px">Found in this file' + (j.created ? ' (' + esc(new Date(j.created).toLocaleString()) + ')' : '') + ':</p>' +
        keys.map(function (k) { return '<div class="ix-part"><label><input type="checkbox" data-r="' + k + '" checked> <b>' + NAMES[k] + '</b></label></div>'; }).join('') +
        (tabbed ? '<p>For Links and Info:</p>' + seg('mode', [['replace', 'Replace Everything'], ['merge', 'Add or Update These Tabs Only']], 'replace') : '') +
        '<p class="ix-note">What is there now is kept as an earlier version first.</p><p class="ix-err" id="ix-re"></p>';
      var mode = 'replace';
      if (tabbed) bindSeg(box, function (k, v) { mode = v; });
      // (1.69.0) run by the Restore button of the Stepper; true when it went through (then the page reloads)
      box.__restore = function () {
        var pick = {}; box.querySelectorAll('[data-r]:checked').forEach(function (c) { pick[c.dataset.r] = true; });
        box.querySelector('#ix-re').textContent = '';
        if (!Object.keys(pick).length) { box.querySelector('#ix-re').textContent = 'Pick at least one part.'; return false; }
        return api('restore', { backup: j, pick: pick, mode: mode }).then(function (k) {
          if (!k.ok) { box.querySelector('#ix-re').textContent = k.error || 'Restore failed.'; return false; }
          toast('Restored: ' + k.restored.join(', ') + '. Reloading…'); setTimeout(function () { location.reload(); }, 1100); return true;
        }, function () { box.querySelector('#ix-re').textContent = 'The file may be too large for this server.'; return false; });
      };
    };
    r.readAsText(file);
  }


  /* ---------- Health (Settings > Health): Overview, Server Check ---------- */
  /* (1.77.1) the six boxes (the Domains one became PHP in 1.78.0): a coloured tile with an icon, a status dot, the number big, and a line under it */
  var HC_ICON = { 'Version': [ICON.upload, '#14b8a6'], 'Schedule': [ICON.clock, '#3b82f6'], 'Last Backup': [ICON.box, '#f97316'], 'PHP': [ICON.server, '#a855f7'], 'Disk Used': [ICON.grid, '#0ea5e9'], 'PHP Errors': [ICON.warn, '#f43f5e'] };
  function hCard(label, val, sub, cls, go) {
    var ic = HC_ICON[label] || [ICON.pulse, '#888'];
    return '<' + (go ? 'button type="button" data-go="' + go + '"' : 'div') + ' class="ix-hc ' + (cls || '') + '"><span class="ix-hc-i" style="background:' + ic[1] + '">' + svg(ic[0]) + '</span>' +
      '<span class="ix-hc-t"><small>' + label + '</small><b>' + val + '</b><span>' + sub + '</span></span><i class="ix-hc-d" aria-hidden="true"></i></' + (go ? 'button' : 'div') + '>';
  }
  /* Settings > Health: Overview, Server Check */
  function health(sub) { go(sub || 'health'); }
  function pHealth(p) {
    p.innerHTML = '<div class="ix-row"><span class="ix-spin" aria-hidden="true"><i></i><i></i><i></i></span><span>Checking…</span></div>';
    api('health').then(function (h) {
      if (!h.ok) { p.innerHTML = '<p class="ix-err">' + esc(h.error || 'Could not load.') + '</p>'; return; }
      var cronAgo = h.cron ? (Date.now() / 1000 - h.cron) : null, cronOk = cronAgo !== null && cronAgo < 1800;
      var errLines = h.logs.reduce(function (n, l) { return n + l.lines.length; }, 0);
      var maxB = Math.max.apply(null, h.sizes.map(function (x) { return x.bytes; }).concat([1]));
      var up = h.update || {};
      var slowRows = ((h.speed || {}).rows || []).filter(function (x) { return x.ms > 150 || x.bytes > 1500000; });
      var openLogs = h.logs.filter(function (l) { return l.public === true; });
      p.innerHTML = '<div class="ix-hcards six">' +
          hCard('Version', esc(h.version), up.newer ? '<a href="' + esc(up.link || '#') + '" target="_blank" rel="noopener">' + esc(up.version) + ' is available</a>' : (h.leftovers.length ? h.leftovers.length + ' update problem' + (h.leftovers.length > 1 ? 's' : '') : 'Files match'), up.newer || h.leftovers.length ? 'warn' : 'good') +
          hCard('Schedule', cronOk ? 'Running' : h.cron ? 'Stopped' : 'Not Set Up', h.cron ? 'Last run ' + esc(ago(h.cron)) : 'Add the cron job (Settings › Telegram)', cronOk ? 'good' : 'warn', 'telegram') +
          hCard('Last Backup', h.backup.last ? esc(ago(h.backup.last)) : 'Never', (h.backup.encrypted ? '🔒 Encrypted' : 'Not Encrypted') + (h.backup.tgEvery ? ', Telegram on' : ''), !h.backup.last || (h.backup.every && (Date.now() / 1000 - h.backup.last) / 86400 >= h.backup.every) ? 'warn' : 'good', 'backup') +
          hCard('PHP', esc(h.php), esc(h.server), '', 'check') +
          hCard('Disk Used', esc(size(h.total)), 'Your pages, pictures, icons and backups', '') +   /* (1.65.2) no "free on the server": on shared hosting that is the whole disk, not what you may use */
          hCard('PHP Errors', errLines ? errLines + ' lines' : 'None', openLogs.length ? 'A log is publicly readable' : h.logs.length ? h.logs.length + ' log file' + (h.logs.length > 1 ? 's' : '') : 'No error_log files', errLines || openLogs.length ? 'warn' : 'good') +
        '</div>' +
        '<details class="ix-acc"' + (h.leftovers.length || up.newer ? ' open' : '') + '><summary><span>Updates</span><small>Version ' + esc(h.version) + (up.newer ? ', ' + esc(up.version) + ' available' : '') + '</small></summary><div class="ix-accb">' +
          (h.leftovers.length ? '<p><b>Left from an earlier update:</b></p><ul class="ix-ul">' + h.leftovers.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '<div class="ix-status"><span class="ix-ok">✓</span><span>Every page uses this version, and nothing old is left behind.</span></div>') +
          (up.newer ? '<div class="ix-status"><span>!</span><span><b>Version ' + esc(up.version) + ' is available.</b> ' + esc(up.notes || '') + (up.link ? ' <a href="' + esc(up.link) + '" target="_blank" rel="noopener">Get It</a>' : '') + '</span></div>' : '') +
          '<p>Updates come as zip files. If you publish your copy somewhere, an update address (a JSON file with <code>{"version": "1.18.0", "notes": "…", "url": "…"}</code>) lets this page tell you when a newer version is out.</p>' +
          '<form class="ix-row" id="ix-upf"><input type="text" id="ix-upurl" placeholder="https://…/version.json (optional)" value="' + esc(up.url || '') + '" style="flex:1;min-width:220px"><button class="ix-btn">Save and Check</button></form>' +
          (up.err ? '<p class="ix-err">' + esc(up.err) + '</p>' : up.at ? '<p class="ix-note">Checked ' + esc(ago(up.at)) + '.</p>' : '') + '</div></details>' +
        '<details class="ix-acc"><summary><span>Disk Use</span><small>' + esc(size(h.total)) + ' in total</small></summary><div class="ix-accb">' +
          h.sizes.map(function (x) { return '<div class="ix-hrow"><span>' + esc(x.name) + '</span><span class="ix-hbar"><i style="width:' + Math.max(1, x.bytes / maxB * 100) + '%"></i></span><b>' + esc(size(x.bytes)) + '</b><small>' + x.files + ' files</small></div>'; }).join('') + '</div></details>' +
        '<details class="ix-acc"' + (slowRows.length ? ' open' : '') + '><summary><span>Speed</span><small>' + (slowRows.length ? slowRows.length + ' slow to read' : 'Saved Data Reads Quickly') + '</small></summary><div class="ix-accb">' +
          (h.speed.rows || []).map(function (x) { return '<div class="ix-hrow"><span>' + esc(x.name) + '</span><span></span><b>' + (x.bytes ? x.ms + ' ms' : '—') + '</b><small>' + (x.bytes ? esc(size(x.bytes)) : 'no data yet') + '</small></div>'; }).join('') +
          '<div class="ix-hrow"><span>This check took</span><span></span><b>' + h.speed.request_ms + ' ms</b><small>on the server</small></div>' +
          '<div class="ix-hrow"><span>PHP Code Cache (OPcache)</span><span></span><b>' + (h.speed.opcache ? 'On' : 'Off') + '</b><small>' + (h.speed.opcache ? 'pages start faster' : 'ask your host to turn it on: it makes every page start faster') + '</small></div>' +
          '<p class="ix-note">Slow page? Fast data here means the wait is your connection or host.</p></div></details>' +
        '<details class="ix-acc"><summary><span>Backups</span><small>Last full backup ' + (h.backup.last ? esc(when(h.backup.last)) : 'never') + '</small></summary><div class="ix-accb">' +
          '<div class="ix-hrow"><span>Last Full Backup</span><span></span><b>' + (h.backup.last ? esc(when(h.backup.last)) : 'Never') + '</b><small>' + (h.backup.every ? 'reminder every ' + h.backup.every + ' days' : 'no reminder') + '</small></div>' +
          '<div class="ix-hrow"><span>Telegram Backups</span><span></span><b>' + (h.backup.telegram ? esc(when(h.backup.telegram)) : 'None Sent') + '</b><small>' + (h.backup.tgEvery ? 'every ' + h.backup.tgEvery + ' days' : 'off') + '</small></div>' +
          '<div class="ix-hrow"><span>Encryption</span><span></span><b>' + (h.backup.encrypted ? '🔒 On' : 'Off') + '</b><small>Backup › Encryption</small></div>' +
          Object.keys(h.versions).map(function (k) { var v = h.versions[k]; return '<div class="ix-hrow"><span>Earlier versions: ' + (NAMES[k] || k) + '</span><span></span><b>' + v.count + '</b><small>' + esc(size(v.bytes)) + '</small></div>'; }).join('') +
          '<div class="ix-row" style="margin-top:10px"><button type="button" class="ix-btn" id="ix-vbk">Test a Restore</button><span class="ix-note" style="margin:0">Makes a backup, opens it again and checks it, without changing anything.</span></div><div id="ix-vres"></div></div></details>' +
        '<details class="ix-acc"' + (errLines || openLogs.length ? ' open' : '') + '><summary><span>PHP Errors</span><small>' + (openLogs.length ? 'A log is publicly readable' : errLines ? 'From your host\'s error_log files, newest last' : 'No Errors Logged') + '</small></summary><div class="ix-accb">' +
          (h.logs.length ? h.logs.map(function (l) {
            return (l.public === true ? '<div class="ix-status"><span>!</span><span><b>' + esc(l.file) + ' can be opened by anyone on the internet.</b> Error logs can show file paths. Add this to the <code>.htaccess</code> in your site\'s main folder: <code>&lt;FilesMatch "^error_log(\\.[0-9]+)?$"&gt; Require all denied &lt;/FilesMatch&gt;</code></span></div>' : '') + '<div class="ix-log"><div class="ix-row" style="justify-content:space-between"><b>' + esc(l.file) + '</b><span class="ix-note" style="margin:0">' + esc(size(l.size)) + ', changed ' + esc(ago(l.at)) + '</span>' +
              (l.clear && l.size ? '<button type="button" data-hold class="ix-btn" data-clr="' + esc(l.file) + '">Clear</button>' : '') + '</div><pre>' + (l.lines.length ? esc(l.lines.join('\n')) : '(empty)') + '</pre></div>'; }).join('')
            : '<p>No error_log files were found. That is good news.</p>') + '</div></details>' +
        '<p class="ix-note">PHP version, limits and extensions, and whether your hosting can reach other websites: <button type="button" class="ix-linkbtn" style="padding:0" data-go="check">Server Check</button>.</p>';
      if (window.HUB && HUB.countUp) HUB.countUp([].filter.call(p.querySelectorAll('.ix-hcards .ix-hc b'), function (b) { return /^(Disk Used|PHP Errors)$/.test(b.parentNode.querySelector('small').textContent); }));   // (1.65.0) these numbers roll up; the version never does
      p.querySelectorAll('[data-clr]').forEach(function (b) { b.onclick = function () {
        api('health_log_clear', { file: b.dataset.clr }).then(function (j) { if (j.ok) { toast('Log cleared.'); pHealth(p); } else toast(j.error); });
      }; });
      var vb = p.querySelector('#ix-vbk');
      if (vb) vb.onclick = function () {
        var box = p.querySelector('#ix-vres'); vb.disabled = true; box.innerHTML = '<div class="ix-row"><span class="ix-spin" aria-hidden="true"><i></i><i></i><i></i></span><span>Testing…</span></div>';
        api('health_verify', {}).then(function (j) {
          vb.disabled = false;
          if (!j.ok) { box.innerHTML = '<p class="ix-err">' + esc(j.error || 'The test could not run.') + '</p>'; return; }
          box.innerHTML = '<div class="ix-status"><span class="' + (j.ok && !j.checks.some(function (c) { return !c.ok; }) ? 'ix-ok">✓' : '">!') + '</span><span><b>' + (j.checks.some(function (c) { return !c.ok; }) ? 'Something did not check out.' : 'Your backups work.') + '</b></span></div>' +
            '<ul class="ix-ul">' + j.checks.map(function (c) { return '<li>' + (c.ok ? '✓ ' : '✗ ') + esc(c.name) + (c.note ? ' <small>(' + esc(c.note) + ')</small>' : '') + '</li>'; }).join('') + '</ul>';
        }).catch(function () { vb.disabled = false; box.innerHTML = '<p class="ix-err">The test could not run.</p>'; });
      };
      p.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () {
        var g = b.dataset.go;
        go(g);
      }; });
      p.querySelector('#ix-upf').onsubmit = function (e) { e.preventDefault(); api('health_update', { url: p.querySelector('#ix-upurl').value }).then(function (j) { if (j.ok) pHealth(p); }); };
    });
  }
  /* ---------- Health > Cleanup (1.79.0): what the site has piled up, each kind with its size and its own Hold-to-Clean button ---------- */
  var CLEAN = [
    ['versions', 'Earlier Versions', ICON.clock, '#f97316', function (k) { return 'The undo history of Links, Info, Cards, Tasks and Home. The newest ' + k + ' of each page stay.'; }],
    ['photos', 'Unused Start Page Photos', ICON.image, '#0ea5e9', function () { return 'Downloaded background photos that nothing uses any more. Your own uploads are never touched.'; }],
    ['sessions', 'Old Logins', ICON.key, '#a855f7', function () { return 'Login files of browsers whose login ran out long ago. Anyone logged in now stays logged in.'; }],
    ['logs', 'Error Logs', ICON.warn, '#ef4444', function () { return 'The error_log files your host wrote inside the site folder. They are emptied, not deleted.'; }]];
  function pCleanup(p) {
    p.innerHTML = spinRow('Looking for things to clean…');
    var draw = function (j) {
      var total = 0, n = 0;
      CLEAN.forEach(function (c) { var i = j.items[c[0]] || { count: 0, bytes: 0 }; total += i.bytes; n += i.count; });
      p.innerHTML = tabHead(ICON.box, 'Cleanup', n ? size(total) + ' in ' + n + (n === 1 ? ' file' : ' files') + ' can go. Nothing you made is touched: pages, files, icons and settings stay as they are.' : 'Nothing to clean. The site is tidy.') +
        '<div class="ix-rcl">' + CLEAN.map(function (c) {
          var i = j.items[c[0]] || { count: 0, bytes: 0 };
          return rowCard({ id: 'ix-cl-' + c[0], ic: c[2], color: c[3], title: c[1], desc: c[4](j.keep) + ' <b>' + (i.count ? size(i.bytes) + ', ' + i.count + (i.count === 1 ? ' file' : ' files') : 'Nothing to clean') + '</b>',
            act: '<button type="button" class="ix-btn danger" data-hold data-cl="' + c[0] + '"' + (i.count ? '' : ' disabled') + '>' + (c[0] === 'logs' ? 'Hold to Empty' : 'Hold to Clean') + '</button>' });
        }).join('') + '</div>';
      p.querySelectorAll('[data-cl]').forEach(function (b) {
        b.onclick = function () {
          b.disabled = true;
          api('cleanup_run', { kind: b.dataset.cl }).then(function (r) {
            if (!r.ok) { toast(r.error || 'Could not clean.', true); b.disabled = false; return; }
            toast('Cleaned ' + r.count + (r.count === 1 ? ' file' : ' files') + ' (' + size(r.bytes) + ').'); draw(r);
          }, function () { toast("Can't reach the server.", true); b.disabled = false; });
        };
      });
    };
    api('cleanup').then(function (j) { if (!j || !j.ok) { p.innerHTML = '<p class="ix-err">' + esc((j && j.error) || 'Could not load.') + '</p>'; return; } draw(j); }, function () { p.innerHTML = '<p class="ix-err">Can\'t reach the server.</p>'; });
  }
  /* ---------- Logs (Settings > Logs): what the site told you, who logged in, and what went wrong ---------- */
  /* (1.78.0) what the site records, in plain words: [label, style, mark, security?]. The detail (e.x) is what was changed, never a value. */
  var LOGEV = { login: ['Logged In', '', '✓', 1], failed: ['Wrong Password', 'warn', '!', 1], locked: ['Logins Paused After Too Many Wrong Tries', 'warn', '!', 1], password: ['Password Changed', '', '✓', 1],
    logoutall: ['Other Devices Logged Out', '', '✓', 1], twostep_on: ['Two-Step Login Turned On', '', '✓', 1], twostep_off: ['Two-Step Login Turned Off', 'warn', '!', 1],
    recovery: ['New Recovery Codes Made', '', '✓', 1], restore: ['Backup Restored', 'warn', '!', 1], passkey: ['Passkey', '', '✓', 1], session_revoke: ['Device Logged Out', '', '✓', 1], approval: ['Login Approval', '', '✓', 1],
    encryption: ['Encryption', '', '✓', 1], activity_cleared: ['Activity Cleared', 'warn', '!', 1], settings: ['Settings Saved', '', '✓'], logo: ['Logo', '', '✓'], backup: ['Backup', '', '✓'], version_restore: ['Earlier Version Restored', 'warn', '!'],
    update: ['Site Updated', '', '✓'], features: ['Features', '', '✓'], cleanup: ['Cleanup', '', '✓'], update_back: ['Went Back to the Saved Version', 'warn', '!'], files_delete: ['Files Deleted', 'warn', '!'], reset: ['Site Erased', 'warn', '!'], telegram: ['Telegram', '', '✓'] };
  var LOGSEC = {}; Object.keys(LOGEV).forEach(function (k) { if (LOGEV[k][3]) LOGSEC[k] = 1; });
  var LOGKEY = { siteName: 'site name', nav: 'navigation', theme: 'theme', accent: 'accent color', accentPg: 'page accents', look: 'look', homeBar: 'bar on Home', glass: 'glass', glassFx: 'glass settings', barHide: 'hide bar', font: 'font', fontCustom: 'font', colors: 'colors', pages: 'tabs', tz: 'time zone', sizes: 'text sizes' };
  /* one line of the activity list: what happened (with what it was about), then who, from where and when */
  function actRow(e) {
    var m = LOGEV[e.ev] || [e.ev, '', '•'], x = String(e.x || ''), label = m[0];
    if (e.ev === 'failed') label = x === 'code' ? 'Wrong Two-Step Code' : x === 'passkey' ? 'Passkey Not Accepted' : 'Wrong Password';
    else if (e.ev === 'passkey') label = x === 'removed' ? 'Passkey Removed' : 'Passkey Added';
    else if (e.ev === 'settings') label += ': ' + x.split(', ').map(function (k) { return LOGKEY[k] || k; }).filter(function (k, i, a) { return a.indexOf(k) === i; }).join(', ');
    else if (x && e.ev !== 'login') label += ': ' + x;   // what it was about: the parts restored, "3 files", "passphrase set"
    return checkRow(m[1], m[2], esc(label), esc(e.who || '') + ' · ' + esc(e.ip || '') + (e.cc ? ' (' + esc(e.cc) + ')' : '') + ' · ' + esc(ago(e.t)));
  }
  var LOGDAY = function (ts) { var d = new Date(ts), t = new Date(), y = new Date(Date.now() - 864e5); return d.toDateString() === t.toDateString() ? 'Today' : d.toDateString() === y.toDateString() ? 'Yesterday' : d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }); };
  function pLogNotes(p) {
    var all = K.noteLog().slice().reverse(), only = false;
    var draw = function () {
      var list = only ? all.filter(function (n) { return n.b; }) : all, day = '';
      p.innerHTML = tabHead(ICON.bell, 'Notifications', 'Every message the site showed you on this device, newest first. The last 300 are kept here.') +
        '<div class="ix-row ix-lgbar"><div class="ix-seg" role="tablist" aria-label="Show"><button type="button" role="tab" data-f="all" aria-selected="' + !only + '">All</button><button type="button" role="tab" data-f="bad" aria-selected="' + only + '">Problems</button></div>' +
        '<span class="ix-note" style="margin:0">' + list.length + (list.length === 1 ? ' message' : ' messages') + '</span><button type="button" class="ix-btn" id="ix-lgclr"' + (all.length ? '' : ' disabled') + '>Clear</button></div>' +
        (list.length ? '<div class="ix-lg">' + list.map(function (n) {
          var d = LOGDAY(n.ts), head = d !== day ? '<div class="ix-sect">' + esc(d) + '</div>' : ''; day = d;
          return head + '<div class="ix-lgr">' + K.noteTile(n.k && ICON && K.noteKind ? n.k : n.b ? 'bad' : 'ok') + '<div class="ix-lgt"><b></b><small>' + esc(n.s || '') + ' · ' + esc(new Date(n.ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })) + '</small></div></div>'; }).join('') + '</div>'
          : '<div class="ix-empty"><b>' + (only ? 'No Problems' : 'Nothing Yet') + '</b><p>' + (only ? 'Nothing has gone wrong on this device.' : 'Messages appear here as the site shows them.') + '</p></div>');
      [].forEach.call(p.querySelectorAll('.ix-lgr .ix-lgt b'), function (b, i) { b.textContent = list[i].m; });
      p.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { only = b.dataset.f === 'bad'; draw(); }; });
      var c = p.querySelector('#ix-lgclr'); if (c) c.onclick = function () { K.noteLogClear(); all = []; draw(); };
    };
    draw();
  }
  function pLogSign(p) {
    p.innerHTML = spinRow('Reading the activity…');
    api('activity').then(function (j) {
      if (!j || !j.ok) { p.innerHTML = '<p class="ix-err">' + esc((j && j.error) || 'Could not load.') + '</p>'; return; }
      var rows = j.events.map(actRow);
      p.innerHTML = tabHead(ICON.out, 'Activity', 'What was done on your site and who logged in: backups, updates, restores, settings saved, passkeys, encryption and every login. The last 300 are kept. Who is logged in right now is under Security › Devices.') +
        '<form class="ix-row ix-lgbar" id="ix-actclr" autocomplete="off"><span class="ix-note" style="margin:0">' + j.events.length + (j.events.length === 1 ? ' line' : ' lines') + '</span>' +
        '<input type="password" id="ix-actpw" placeholder="Website Password" autocomplete="current-password" aria-label="Website Password" hidden style="max-width:240px"><button type="button" class="ix-btn" id="ix-actgo"' + (j.events.length ? '' : ' disabled') + '>Clear</button></form><p class="ix-err" id="ix-acterr"></p>' +
        (rows.length ? '<div class="ix-checks">' + rows.join('') + '</div>' : '<div class="ix-empty"><b>No Activity Yet</b><p>Logins, backups, updates and changes to settings appear here.</p></div>');
      var pw = p.querySelector('#ix-actpw'), go = p.querySelector('#ix-actgo'), er = p.querySelector('#ix-acterr');
      go.onclick = function () {   // first press asks for the password; the second clears. One line stays: that it was cleared.
        if (pw.hidden) { pw.hidden = false; pw.focus(); go.textContent = 'Clear Activity'; return; }
        if (!pw.value) { er.textContent = 'Type your website password.'; return; }
        go.disabled = true; er.textContent = '';
        api('activity_clear', { password: pw.value }).then(function (r) {
          if (!r.ok) { er.textContent = r.error || 'Could not clear.'; go.disabled = false; return; }
          toast('Activity cleared.'); pLogSign(p);
        }, function () { er.textContent = "Can't reach the server."; go.disabled = false; });
      };
      p.querySelector('#ix-actclr').onsubmit = function (e) { e.preventDefault(); go.click(); };
    }, function () { p.innerHTML = '<p class="ix-err">Can\'t reach the server.</p>'; });
  }
  function pLogErr(p) {
    p.innerHTML = spinRow('Looking for PHP error logs…');
    api('health').then(function (h) {
      if (!h || !h.ok) { p.innerHTML = '<p class="ix-err">' + esc((h && h.error) || 'Could not load.') + '</p>'; return; }
      p.innerHTML = tabHead(ICON.warn, 'PHP Errors', 'From your host\'s error_log files, newest last. Clearing them is under Health.') +
        (h.logs.length ? h.logs.map(function (l) { return '<div class="ix-log"><b>' + esc(l.file) + '</b><pre>' + esc(l.lines.slice(-40).join('\n')) + '</pre></div>'; }).join('')
          : '<div class="ix-empty"><b>No Errors Logged</b><p>Nothing has gone wrong that your server wrote down.</p></div>');
    }, function () { p.innerHTML = '<p class="ix-err">Can\'t reach the server.</p>'; });
  }
  /* (1.72.0) the site-wide search finds Settings too: [name, where it opens, more words, the section's name] */
  function searchIndex() { return SEARCH.map(function (x) { var s = sectionOf(SUB_OF[x[1].split('/')[0]] || ''); return [x[0], x[1], x[2], s ? 'Settings › ' + s[1] : 'Settings']; }); }
  K.impl = { settings: go, mount: mount, openBackup: openBackup, textSizes: textSizes, health: health, searchIndex: searchIndex };
})(window.__ixShell);
