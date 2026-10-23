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
(function (K) {
  'use strict';
  if (!K || K.impl) return;
  var S = K.S, esc = K.esc, toast = K.toast, api = K.api, ICON = K.ICON, svg = K.svg, drawBar = K.drawBar, remember = K.remember, applySizes = K.applySizes, APP = K.APP, openDlg = K.openDlg, closeDlg = K.closeDlg, login = K.login, ROOT = K.ROOT, applyFont = K.applyFont, applyColors = K.applyColors, applyAttrs = K.applyAttrs, PG_APPS = K.PG_APPS, CORE = K.CORE, ASSETS = K.ASSETS, COLOR_DEFAULT = K.COLOR_DEFAULT, setTheme = K.setTheme, pageList = K.pageList, applyFavicon = K.applyFavicon, SIZE_SPEC = K.SIZE_SPEC, PAGE_DEF = K.PAGE_DEF, FONTS = K.FONTS, COLOR_KEYS = K.COLOR_KEYS, when = K.when, redraw = K.redraw;
  function D() { return document.getElementById('ix-dlg'); }
  /* element lookup: inside an open small dialog (Text Sizes) first, otherwise inside the Settings page */
  function $(sel) { var ov = document.getElementById('ix-dlg'), h = ov && ov.classList.contains('open') ? ov : (PAGE || ov); return h ? h.querySelector(sel) : null; }
  /* ---------- 10. Settings ----------
     Five sections; General, Appearance and Health hold sub-tabs along the top. General and Appearance edit a draft that
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
    ['overview', 'Overview', ICON.grid, 'How your site stands right now, and what to look at next.', [['overview', 'Overview'], ['setup', 'Guided Setup']], ''],
    ['general', 'General', ICON.home, 'Your site\'s name, logo and time zone, and which pages appear in the bar.', [['general', 'Basics'], ['nav', 'Navigation'], ['pages', 'Pages']], 'Site'],
    ['look', 'Appearance', ICON.palette, 'How your site looks everywhere: theme, font, accent color and the colors of every page.', [['look', 'Look'], ['themes', 'Presets'], ['colors', 'Colors']], 'Site'],
    ['security', 'Security', ICON.shield, 'Who can get in, and how well your private things are protected.', null, 'Protection & Data'],
    ['telegram', 'Telegram', ICON.send, 'Reminders, login alerts and backups, sent to your phone.', null, 'Protection & Data'],
    ['backup', 'Backup & Restore', ICON.box, 'One file holds your pages and every setting you chose. Download it, restore it, or start over.', null, 'Protection & Data'],
    ['updates', 'Updates', ICON.upload, 'Update the site from GitHub or by uploading a zip, go back to the last version, and clear out files that do not belong.', [['updates', 'Update'], ['files', 'Files']], 'System'],
    ['health', 'Health', ICON.pulse, 'Version, disk, speed, errors, your domains, and what your hosting allows.', [['health', 'Overview'], ['domains', 'Domains and Uptime'], ['check', 'Server Check']], 'System'],
    ['changelog', 'Changelog', ICON.log, 'What changed in every version of your site, newest first.', [['changelog', 'Versions'], ['chmap', 'Version Map'], ['chnotes', 'Notes']], 'System']];
  var PANES = { overview: pOverview, setup: pSetup, general: pGeneral, nav: pNav, pages: pPages, look: pLook, themes: pThemes, colors: pColors, security: pSecurity, telegram: pRemind, backup: pBackup, updates: pUpdate, files: pFiles, health: pHealth, domains: pDomains, check: pCheck, changelog: pChangelog, chmap: pChMap, chnotes: pChNotes };
  var SUB_OF = {};   // sub-tab -> its section (nav -> general, colors -> look)
  SECTIONS.forEach(function (x) { (x[4] || [[x[0]]]).forEach(function (t) { SUB_OF[t[0]] = x[0]; }); });
  var DRAFTED = ['general', 'look'];
  var PAGE = null;                       // the page's own element when Settings runs as a page (web/settings/)
  function P() { return PAGE || D(); }
  var OV = null;                         // what the Overview last learned: the little status labels in the menu come from it
  var TABSEL = {};                       // the tab chosen in each tabbed section (kept while it redraws)
  var TABBED = { security: 'Overview', telegram: 'Status', backup: 'Status' };   // sections whose accordions become tabs, and the name of their first tab
  var SAVED_KEYS = ['siteName', 'nav', 'theme', 'accent', 'accentPg', 'look', 'homeBar', 'font', 'fontCustom', 'colors', 'pages', 'tz'];
  var draft, discardArmed = false, curSec = '';
  /* what Save Settings would send, written the same way every time (empty color sets and their order don't count) */
  function canonColors(c) {
    c = c || {}; var out = {};
    ['dark', 'light'].forEach(function (m) { var s = c[m] || {}; Object.keys(s).sort().forEach(function (k) { if (s[k]) out[m + '.' + k] = s[k]; }); });
    var pg = c.pg || {}; Object.keys(pg).sort().forEach(function (a) { ['dark', 'light'].forEach(function (m) { if (pg[a] && pg[a][m]) out['pg.' + a + '.' + m] = pg[a][m]; }); });
    return out;
  }
  function canonAccents(a) { var out = {}; Object.keys(a || {}).sort().forEach(function (k) { if (a[k]) out[k] = a[k]; }); return out; }
  function pick(o) {
    var r = {};
    SAVED_KEYS.forEach(function (k) { r[k] = k === 'colors' ? canonColors(o.colors) : k === 'accentPg' ? canonAccents(o.accentPg) : k === 'pages' ? (o.pages || []) : (o[k] === undefined ? null : o[k]); });
    return JSON.stringify(r);
  }
  function dirty() { return !!draft && pick(draft) !== pick(S); }
  /* the footer says when something is not saved yet */
  function markDirty(edited) {
    var f = $('#ix-sfnote'); if (!f) return;
    var d = dirty(), sf = $('#ix-sf');
    f.textContent = d ? 'You have changes that are not saved yet.' : ''; f.className = d ? 'ix-dirty' : '';
    if (sf) sf.hidden = !d;
  }
  /* markDirty: the save bar appears at the bottom only while something is not saved yet */
  function mount(host, hash) {
    PAGE = host; host.classList.add('ix-pg'); host.id = 'ix-page';
    if (!S.admin) {
      host.innerHTML = '<div class="ix-gate"><h1>Settings</h1><p>Log in to change your site\'s settings.</p><button type="button" class="ix-btn pri" id="ix-lg">Log In</button></div>';
      host.querySelector('#ix-lg').onclick = function () { K.login().then(function () { location.reload(); }, function () {}); };
      return;
    }
    draft = JSON.parse(JSON.stringify(S)); discardArmed = false; colorMode = '';
    var gl = null;
    host.innerHTML = '<aside class="ix-snav" aria-label="Settings Sections"><div class="ix-snh">Settings</div><div class="ix-ssearch"><input type="search" id="ix-ss" placeholder="Search Settings" aria-label="Search settings" autocomplete="off" spellcheck="false"><div class="ix-sres" id="ix-sres" hidden></div></div>' + SECTIONS.map(function (x) {
        var head = x[5] !== gl ? (gl = x[5], x[5] ? '<div class="ix-sgl">' + x[5] + '</div>' : '') : '';
        return head + '<button type="button" data-sec="' + x[0] + '">' + svg(x[2]) + '<span>' + x[1] + '</span><em class="ix-sp" data-pill="' + x[0] + '"></em></button>'; }).join('') +
        '<button type="button" class="ix-out" data-ix="logout">' + svg(ICON.out) + '<span>Log Out</span></button></aside>' +
      '<section class="ix-pane" id="ix-pane"></section>' +
      '<div class="ix-sf" id="ix-sf" hidden><span id="ix-sfnote"></span><span class="ix-err" id="ix-sferr"></span><button type="button" class="ix-btn" id="ix-discard">Discard</button><button type="button" class="ix-btn pri" id="ix-save">Save Settings</button></div>';
    host.querySelectorAll('[data-sec]').forEach(function (b) { b.onclick = function () { go(b.dataset.sec); }; });
    $('#ix-save').onclick = saveSettings;
    bindSearch(host);
    $('#ix-discard').onclick = function () {   // throw the unsaved changes away and show the saved look again
      draft = JSON.parse(JSON.stringify(S)); applyAttrs(); applyColors(); applyFont(); K.restoreTheme(); redraw(); pane(curSub); markDirty();
    };
    ['input', 'change'].forEach(function (ev) { host.addEventListener(ev, function () { setTimeout(function () { markDirty(true); }, 0); }); });
    host.addEventListener('click', function () { setTimeout(function () { markDirty(false); }, 0); });
    window.addEventListener('beforeunload', function (e) { if (PAGE && dirty()) { e.preventDefault(); e.returnValue = ''; } });
    window.addEventListener('hashchange', function () { if (PAGE) go(location.hash); });
    var h = String(hash || location.hash || '').replace(/^#/, '');
    var narrow = window.matchMedia && window.matchMedia('(max-width: 859px)').matches;
    if (h) go(h);
    else if (narrow) host.setAttribute('data-view', 'list');
    else { var last = ''; try { last = sessionStorage.getItem('ix-sec') || ''; } catch (e) {} go(SUB_OF[last] ? last : 'overview'); }
    api('overview').then(function (j) { if (j.ok) { OV = j; decorateNav(); } }).catch(function () {});
  }
  /* Search Settings: type a word ("passphrase", "cron", "font") and jump to the place for it. "/" focuses the box. */
  var SEARCH = [
    ['Site Name', 'general', 'title brand called'], ['Site Logo', 'general', 'icon favicon image picture'], ['Time Zone', 'general', 'timezone clock hour'],
    ['Navigation Style', 'nav', 'top bar sidebar dock menu'], ['Show the Bar on the Start Page', 'nav', 'home corner'], ['Rename, Reorder or Hide Tabs', 'nav', 'pages names order'],
    ['Open a Page in Edit Mode', 'pages', 'shortcuts pencil'],
    ['Font', 'look', 'typeface text trebuchet georgia'], ['Theme', 'look', 'dark light amoled follow device system'], ['Accent Color', 'look', 'gold buttons highlight'], ['Same Look on Every Page', 'look', 'unified'],
    ['Presets', 'themes', 'themes looks dracula nord gallery surprise my save share import export'], ['Colors', 'colors', 'background text borders menu bar page accent per page'],
    ['Website Password', 'security/password', 'change login'], ['Encryption Passphrase', 'security/encryption', 'encrypt lock private tabs backups'], ['Recovery Key', 'security/encryption', 'forgot passphrase spare'],
    ['Two-Step Login', 'security/two-step-login', '2fa authenticator totp recovery codes'], ['Login Approval', 'security/login-approval', 'telegram approve tap'],
    ['Trusted Browsers', 'security/trusted-browsers', 'skip code remember'], ['Devices and Login History', 'security/devices', 'log out sessions activity wrong password ip'],
    ['Telegram Bot Setup', 'telegram/setup', 'token botfather chat cron schedule connect'], ['Telegram Backups', 'telegram/backups', 'send backup'],
    ['Telegram Messages', 'telegram/messages', 'digest reminders alerts daily hour due'], ['Instant Replies', 'telegram/instant-replies', 'webhook commands bot'],
    ['Back Up', 'backup/back-up', 'download backup file'], ['Restore a Backup', 'backup/restore', 'import'], ['Export Data', 'backup/export-data', 'csv json spreadsheet links cards tasks'],
    ['Earlier Versions', 'backup/earlier-versions', 'history undo'], ['Start Over', 'backup/start-over', 'erase reset'],
    ['Update the Site', 'updates', 'upload zip version install'], ['Update From GitHub', 'updates', 'github check now daily release download'], ['Files That Do Not Belong', 'files', 'extra changed missing leftover'],
    ['Health', 'health', 'disk speed errors log'], ['Domains and Uptime', 'domains', 'expiry ssl hosting renewal'], ['Server Check', 'check', 'php memory gd curl extensions limit photos'],
    ['Changelog', 'changelog', 'versions history what changed new'], ['Version Map', 'chmap', 'all versions']
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
    target = String(target || '').replace(/^#/, ''); var parts = target.split('/'), id = parts[0] || 'overview';
    if (id === 'remind') id = 'telegram';
    if (!PAGE) { location.href = K.ROOT + 'web/settings/#' + target; return; }
    if (!SUB_OF[id]) id = 'overview';
    if (parts[1]) TABSEL[id] = parts[1];
    pane(id);
  }
  function sectionOf(id) { return SECTIONS.filter(function (x) { return x[0] === id; })[0]; }
  var curSub = '';
  function pane(id) {
    var sec = SUB_OF[id] || 'overview', s = sectionOf(sec);
    var subs = s[4] || [[sec, s[1]]], sub = subs.some(function (t) { return t[0] === id; }) ? id : subs[0][0];
    P().querySelectorAll('[data-sec]').forEach(function (b) { if (b.dataset.sec === sec) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    curSec = sec; curSub = sub; P().setAttribute('data-view', 'detail');
    try { sessionStorage.setItem('ix-sec', sub); if (location.hash !== '#' + sub) history.replaceState(null, '', '#' + sub); } catch (e) {}
    var box = $('#ix-pane'); box.scrollTop = 0; window.scrollTo(0, 0);
    box.innerHTML = '<div class="ix-ph"><button type="button" class="ix-back" aria-label="Back to All Settings">‹ Settings</button><h2>' + s[1] + '</h2><p>' + s[3] + '</p>' +
      (subs.length > 1 ? '<div class="ix-subt" role="tablist">' + subs.map(function (t) {
        return '<button type="button" role="tab" data-sub="' + t[0] + '" aria-selected="' + (t[0] === sub) + '">' + t[1] + '</button>'; }).join('') + '<i class="ix-subi"></i></div>' : '') +
      '</div><div id="ix-pc" class="ix-anim"></div>';
    box.querySelector('.ix-back').onclick = function () { P().setAttribute('data-view', 'list'); try { history.replaceState(null, '', location.pathname); } catch (e) {} window.scrollTo(0, 0); };
    box.querySelectorAll('[data-sub]').forEach(function (b) { b.onclick = function () { if (b.dataset.sub !== curSub) subPane(b.dataset.sub); }; });
    mountPane(sub); subMark(); markDirty();
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
  }
  /* The long sections (Security, Telegram, Backup) are drawn as a list of folded parts. Here each part becomes a tab and the status
     above them becomes the first tab, so only one thing is on screen at a time. The parts keep working as they were: they are only shown and hidden. */
  var tabObs = null;
  /* The plain panes (General, Navigation, Pages, Look) are written as "heading, one line, controls". Each heading with what follows it
     becomes a card, so they look like Security and Telegram. The controls are only moved, so everything keeps working. */
  var CARDIFY = { general: 1, nav: 1, pages: 1, look: 1 };
  var CARD_ICON = { 'site name': ICON.edit, 'site logo': ICON.image, 'time zone': ICON.clock, 'font': ICON.type, 'theme': ICON.palette, 'accent color': ICON.palette,
    'navigation style': ICON.menu, 'tabs': ICON.pages, 'open a page in edit mode': ICON.edit };
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
      if (desc) sec.querySelector('.ix-ec-d').innerHTML = desc.innerHTML; else sec.querySelector('.ix-ec-d').remove();
      var b = sec.querySelector('.ix-ec-b'); g.body.forEach(function (n) { b.appendChild(n); });
      pc.insertBefore(sec, g.h); g.h.remove();
    });
  }
  function mountPane(sub) {
    var pc = $('#ix-pc'); if (tabObs) { tabObs.disconnect(); tabObs = null; }
    if (TABBED[sub] || CARDIFY[sub]) { tabObs = new MutationObserver(function () { if (TABBED[sub]) tabify(pc, sub); if (CARDIFY[sub]) cardify(pc); }); tabObs.observe(pc, { childList: true }); }
    PANES[sub](pc); if (TABBED[sub]) tabify(pc, sub); if (CARDIFY[sub]) cardify(pc);
  }
  function slug(t) { return String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function tabify(pc, sub) {
    if (!pc || pc.querySelector(':scope > .ix-tabbar')) return;
    var kids = [].slice.call(pc.children), accs = kids.filter(function (k) { return k.matches && k.matches('details.ix-acc'); });
    if (accs.length < 2) return;
    var rest = kids.filter(function (k) { return accs.indexOf(k) < 0; }), tabs = [];
    if (rest.length) {
      var st = document.createElement('div'); st.className = 'ix-tpane'; st.dataset.tab = 'overview'; pc.insertBefore(st, accs[0]);
      rest.forEach(function (k) { st.appendChild(k); }); tabs.push({ id: 'overview', title: TABBED[sub] || 'Overview', el: st });
    }
    accs.forEach(function (a) {
      var sm = a.querySelector(':scope > summary'), t = sm && sm.querySelector('span') ? sm.querySelector('span').textContent : (sm ? sm.textContent : 'Tab'), cap = sm && sm.querySelector('small');
      a.classList.add('ix-tpane'); a.dataset.tab = slug(t); a.dataset.cap = cap ? cap.textContent : ''; tabs.push({ id: a.dataset.tab, title: t, el: a });
    });
    var bar = document.createElement('div'); bar.className = 'ix-tabbar ix-subt'; bar.setAttribute('role', 'tablist');
    bar.innerHTML = tabs.map(function (t) { return '<button type="button" role="tab" data-tab="' + t.id + '">' + esc(t.title) + '</button>'; }).join('') + '<i class="ix-subi"></i>';
    pc.classList.add('ix-tabbed'); pc.insertBefore(bar, pc.firstChild);
    function show(id) {
      TABSEL[sub] = id;
      tabs.forEach(function (t) { var on = t.id === id; t.el.classList.toggle('ix-on', on); if (t.el.tagName === 'DETAILS') t.el.open = on; });
      bar.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === id ? 'true' : 'false'); });
      var on = bar.querySelector('[aria-selected="true"]'), i = bar.querySelector('.ix-subi');
      if (on && i) { i.style.width = on.offsetWidth + 'px'; i.style.transform = 'translateX(' + on.offsetLeft + 'px)'; }
    }
    bar.querySelectorAll('button').forEach(function (b) { b.onclick = function () { show(b.dataset.tab); }; });
    if (!pc.__tg) { pc.__tg = true; pc.addEventListener('toggle', function (e) { var d = e.target; if (d && d.matches && d.matches('details.ix-tpane') && d.open && !d.classList.contains('ix-on')) { var b = pc.querySelector('.ix-tabbar [data-tab="' + d.dataset.tab + '"]'); if (b) b.click(); } }, true); }
    var want = TABSEL[sub]; show(tabs.some(function (t) { return t.id === want; }) ? want : tabs[0].id);
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
  /* every time zone the browser knows, India first; each with its current offset from UTC */
  function tzOptions(cur) {
    var all = []; try { all = Intl.supportedValuesOf('timeZone'); } catch (e) {}
    if (!all.length) all = ['Asia/Kolkata', 'UTC', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney'];
    if (all.indexOf(cur) < 0) all.unshift(cur);
    var off = function (z) { try { return (new Intl.DateTimeFormat('en-US', { timeZone: z, timeZoneName: 'shortOffset' }).formatToParts(new Date()).filter(function (x) { return x.type === 'timeZoneName'; })[0] || {}).value || ''; } catch (e) { return ''; } };
    var opt = function (z, label) { return '<option value="' + esc(z) + '"' + (z === cur ? ' selected' : '') + '>' + esc(label || z.replace(/_/g, ' ')) + ' (' + esc(off(z).replace('GMT', 'UTC') || 'UTC') + ')</option>'; };
    return '<optgroup label="India">' + opt('Asia/Kolkata', 'India Standard Time, IST') + '</optgroup><optgroup label="All time zones">' +
      all.filter(function (z) { return z !== 'Asia/Kolkata'; }).map(function (z) { return opt(z); }).join('') + '</optgroup>';
  }
  function pGeneral(p) {
    p.innerHTML = '<h3>Site Name</h3><p>Shown in the bar, Telegram messages and backup names.</p><input type="text" id="ix-name" maxlength="30" value="' + esc(draft.siteName) + '" aria-label="Site Name">' +
      '<h3>Site Logo</h3><p>The one logo for your whole site: the bar, the browser tab and every page. PNG, JPG, WebP or GIF.</p>' +
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
          if (!j.ok) { toast(j.error || 'Could not save the logo.'); return; }
          S.logo = draft.logo = j.state.logo; remember(S); redraw(); applyFavicon(); subPane('general'); toast('Logo updated.');
        });
      });
    };
    p.querySelector('#ix-lx').onclick = function () {
      api('logo', { remove: true }).then(function (j) { if (j.ok) { S.logo = draft.logo = ''; remember(S); redraw(); subPane('general'); toast('Logo removed.'); } });
    };
  }
  function pLook(p) {
    var sw = ['#ffc21a', '#ffd45c', '#e8a800', '#ffb000', '#f5c542', '#ffcf40', '#4cc9f0', '#5fd68a', '#ff6b6b', '#b392f0',
      '#ff2d95', '#00f0ff', '#c6ff00', '#ff6a3d', '#b44cff', '#2d8cff', '#00ff41', '#ff2a3d'];
    p.innerHTML = '<h3>Font</h3><p>One font for every page. Code and keyboard keys keep their own.</p><select id="ix-font" class="ix-sel" aria-label="Font">' + FONTS.map(function (f) { return '<option value="' + f[0] + '"' + (draft.font === f[0] || (!draft.font && f[0] === 'default') ? ' selected' : '') + '>' + esc(f[1]) + '</option>'; }).join('') + '</select>' +
      '<input type="text" id="ix-fontc" maxlength="40" placeholder="A font installed on your device, like Calibri" value="' + esc(draft.fontCustom || '') + '" aria-label="Font Name"' + (draft.font === 'custom' ? '' : ' hidden') + '>' +
      '<h3>Theme</h3><p>The look for anyone who has not chosen one. The theme button in the bar changes it for you alone, on every page at once.</p>' +
      seg('theme', [['dark', 'AMOLED Dark'], ['light', 'Light'], ['auto', 'Follow Device']], draft.theme) +
      '<h3>Accent Color</h3><p>Buttons, the current tab, links and highlights.</p><div class="ix-sw">' + sw.map(function (c) { return '<button type="button" data-c="' + c + '" style="background:' + c + '" aria-label="' + c + '" aria-pressed="' + (draft.accent === c) + '"></button>'; }).join('') +
      '<input type="color" id="ix-acc" value="' + esc(draft.accent) + '" aria-label="Custom Color"><input type="text" class="ix-hex" id="ix-acch" maxlength="7" value="' + esc(draft.accent) + '" aria-label="Accent Color Hex" spellcheck="false"></div>' +
      '<label class="ix-tg"><span>Same Look on Every Page<small>AMOLED black with your accent color. Turn off to let each page use its own colors.</small></span><input type="checkbox" id="ix-look"' + (draft.look ? ' checked' : '') + '></label>' +
      '<p class="ix-note">For the colors of the bar, pages and text, open the Colors tab. Each page\'s own options are under its pencil icon.</p>';
    bindSeg(p, function (k, v) { draft[k] = v; if (k === 'theme') K.previewTheme(v); });
    p.querySelectorAll('[data-c]').forEach(function (b) { b.onclick = function () { setAcc(b.dataset.c); }; });
    p.querySelector('#ix-acc').oninput = function (e) { setAcc(e.target.value); };
    p.querySelector('#ix-acch').oninput = function (e) { var h = hexOf(e.target.value); e.target.classList.toggle('bad', !h); if (h) setAcc(h, true); };
    p.querySelector('#ix-look').onchange = function (e) { draft.look = e.target.checked; preview(); };
    p.querySelector('#ix-font').onchange = function (e) { draft.font = e.target.value; p.querySelector('#ix-fontc').hidden = draft.font !== 'custom'; if (draft.font === 'custom') p.querySelector('#ix-fontc').focus(); preview(); };
    p.querySelector('#ix-fontc').oninput = function (e) { draft.fontCustom = e.target.value; preview(); };
    function setAcc(c, fromText) {
      draft.accent = c.toLowerCase(); if (!fromText) p.querySelector('#ix-acch').value = draft.accent; p.querySelector('#ix-acc').value = draft.accent;
      p.querySelectorAll('[data-c]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.c === draft.accent ? 'true' : 'false'); });
      preview();
    }
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
  /* "Text sizes" for Info and Cards: sliders that preview live; the sizes are saved with the site settings. */
  function textSizes() {
    var spec = SIZE_SPEC[APP]; if (!spec) return;
    if (!S.admin) { login().then(function () { textSizes(); }, function () {}); return; }
    var cur = ((S.sizes || {})[APP]) || {}, val = {};
    spec.forEach(function (k) { var v = +cur[k[0]]; val[k[0]] = v >= k[2] && v <= k[3] ? v : k[4]; });
    // the same layout as Links' Text sizes: a labelled slider per size, then a sample that follows the sliders
    var SAMPLE = {
      info: [['tab', 'Notes'], ['head', 'Box Title'], ['text', 'Your notes, lists and links read like this.']],
      cards: [['title', 'Cards'], ['box', '₹1,24,000'], ['text', 'HDFC Regalia · Visa · due 12 Nov']]
    }[APP] || [];
    openDlg('<h2 style="margin:0 0 16px">Text Sizes</h2>' +
      spec.map(function (k) {
        return '<div class="ix-tsf"><label for="ix-ts-' + k[0] + '">' + k[1] + '</label><div class="ix-tsr"><input type="range" id="ix-ts-' + k[0] + '" data-k="' + k[0] + '" min="' + k[2] + '" max="' + k[3] + '" step="1" value="' + val[k[0]] + '"><output>' + val[k[0]] + ' px</output></div></div>';
      }).join('') +
      '<div class="ix-tss ix-tss-' + APP + '" aria-hidden="true">' + SAMPLE.map(function (x) { return '<div data-s="' + x[0] + '">' + esc(x[1]) + '</div>'; }).join('') + '</div>' +
      '<p class="ix-err" id="ix-tze"></p>' +
      '<div class="ix-acts"><button class="ix-btn" id="ix-tzr" style="margin-right:auto">Reset Sizes</button><button class="ix-btn" data-ix="close">Cancel</button><button class="ix-btn pri" id="ix-tzs">Save Sizes</button></div>');
    var saved = false;
    var sample = function () { D().querySelectorAll('[data-s]').forEach(function (el) { el.style.fontSize = val[el.dataset.s] + 'px'; }); };
    D().querySelectorAll('input[type=range]').forEach(function (r) {
      r.oninput = function () { val[r.dataset.k] = +r.value; r.nextElementSibling.textContent = r.value + ' px'; sample(); applySizes(null, val); };
    });
    sample();
    $('#ix-tzr').onclick = function () {
      spec.forEach(function (k) { val[k[0]] = k[4]; });
      D().querySelectorAll('input[type=range]').forEach(function (r) { r.value = val[r.dataset.k]; r.nextElementSibling.textContent = r.value + ' px'; });
      sample(); applySizes(null, {});
    };
    $('#ix-tzs').onclick = function () {
      var mine = {}; spec.forEach(function (k) { if (val[k[0]] !== k[4]) mine[k[0]] = val[k[0]]; });
      var all = JSON.parse(JSON.stringify(S.sizes || {})); if (Array.isArray(all)) all = {};
      if (Object.keys(mine).length) all[APP] = mine; else delete all[APP];
      var b = $('#ix-tzs'); b.disabled = true;
      api('settings', { settings: { sizes: all } }).then(function (j) {
        b.disabled = false;
        if (!j.ok) { $('#ix-tze').textContent = j.error || 'Could not save.'; return; }
        saved = true; S.sizes = j.state.sizes; remember(S); applySizes(); closeDlg(); toast('Text sizes saved.');
      }).catch(function () { b.disabled = false; $('#ix-tze').textContent = "Can't reach the server."; });
    };
    new MutationObserver(function (m, o) { if (!D().classList.contains('open') || !D().querySelector('#ix-tzs')) { o.disconnect(); if (!saved) applySizes(); } }).observe(D(), { attributes: true, childList: true });
  }
  /* Colors: one mode at a time (the site switches to it, so changes show live), grouped by what they paint. Empty = the built-in color. */
  var COLOR_GROUPS = [
    ['Menu Bar', 'The top bar, sidebar or dock, on every page.', [['bar', 'Background'], ['barText', 'Tabs and Icons']]],
    ['Page', 'What sits behind and around your content.', [['bg', 'Page Background'], ['box', 'Boxes and Cards'], ['panel', 'Menus and Dialogs'], ['line', 'Borders']]],
    ['Text', 'Headings, body text, and quieter labels and hints.', [['text', 'Text'], ['mute', 'Secondary Text']]]
  ];
  /* Presets: n = name, g = group, c = colors (left out = the built-in color), a = accent ('' = keep yours). */
  var PRESET_GROUPS = [['mine', 'My Presets'], ['site', 'Site Looks'], ['classic', 'Editor Classics'], ['modern', 'Modern'], ['vivid', 'Vivid'], ['neon', 'Neon'], ['soft', 'Soft'], ['pastel', 'Pastel'], ['earth', 'Earthy'], ['mono', 'Monochrome'], ['retro', 'Retro'], ['contrast', 'High Contrast']];
  var PRESETS = {
    dark: [
      { n: 'AMOLED', g: 'site', c: {  }, a: '' },
      { n: 'Charcoal', g: 'site', c: { bg: '#121212', box: '#1c1c1c', panel: '#232323', line: '#2f2f2f', bar: '#181818' }, a: '' },
      { n: 'Midnight', g: 'site', c: { bg: '#0a0f1d', box: '#111a2d', panel: '#172238', line: '#24304a', text: '#e8edf7', mute: '#97a3bd', bar: '#0d1426', barText: '#97a3bd' }, a: '' },
      { n: 'Forest', g: 'site', c: { bg: '#0a110d', box: '#101b15', panel: '#15231b', line: '#21342a', text: '#e9f2ec', mute: '#9cb3a4', bar: '#0d1711', barText: '#9cb3a4' }, a: '' },
      { n: 'Plum', g: 'site', c: { bg: '#120b14', box: '#1b1220', panel: '#23172a', line: '#33243b', text: '#f3eaf6', mute: '#b39dbd', bar: '#170e1b', barText: '#b39dbd' }, a: '' },
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
      { n: 'Ocean Deep', g: 'vivid', c: { bg:'#00121c',box:'#001e2e',panel:'#002a40',line:'#0b4a6b',text:'#e6f6ff',mute:'#93c9e6',bar:'#000b12',barText:'#93c9e6' }, a: '#00c2ff' },
      { n: 'Grape', g: 'vivid', c: { bg:'#12061f',box:'#1e0c33',panel:'#29114a',line:'#46206f',text:'#f6edff',mute:'#c3a5e8',bar:'#0c0414',barText:'#c3a5e8' }, a: '#b44cff' },
      { n: 'Tangerine', g: 'vivid', c: { bg:'#130800',box:'#221000',panel:'#2f1700',line:'#55300a',text:'#fff3e6',mute:'#e8b98a',bar:'#0c0500',barText:'#e8b98a' }, a: '#ff9100' },
      { n: 'Candy Night', g: 'vivid', c: { bg:'#160a1f',box:'#24112f',panel:'#311842',line:'#55296f',text:'#fff0fb',mute:'#e0aee6',bar:'#0f0616',barText:'#e0aee6' }, a: '#ff5ccf' },
      { n: 'Emerald', g: 'vivid', c: { bg:'#00140b',box:'#00230f',panel:'#003217',line:'#0a5a2e',text:'#e6fff0',mute:'#86d4a4',bar:'#000d07',barText:'#86d4a4' }, a: '#14e07a' },
      { n: 'Pure Contrast', g: 'contrast', c: { bg: '#000000', box: '#000000', panel: '#0a0a0a', line: '#6b6b6b', text: '#ffffff', mute: '#d0d0d0', bar: '#000000', barText: '#e6e6e6' }, a: '#ffd400' },
      { n: 'Night Contrast', g: 'contrast', c: { bg: '#000814', box: '#00101f', panel: '#001a33', line: '#4d6b8a', text: '#ffffff', mute: '#cfe0f1', bar: '#000814', barText: '#d6e6f5' }, a: '#00d1ff' },
      { n: 'Catppuccin Macchiato', g: 'modern', c: { bg: '#24273a', box: '#2b2e44', panel: '#363a4f', line: '#494d64', text: '#cad3f5', mute: '#a5adcb', bar: '#1e2030', barText: '#a5adcb' }, a: '#c6a0f6' },
      { n: 'Catppuccin Frappé', g: 'modern', c: { bg: '#303446', box: '#373b50', panel: '#414559', line: '#51576d', text: '#c6d0f5', mute: '#a5adce', bar: '#292c3c', barText: '#a5adce' }, a: '#ca9ee6' },
      { n: 'Rosé Pine Moon', g: 'modern', c: { bg: '#232136', box: '#2a273f', panel: '#393552', line: '#44415a', text: '#e0def4', mute: '#908caa', bar: '#1d1b2e', barText: '#908caa' }, a: '#ea9a97' },
      { n: 'Ayu Dark', g: 'modern', c: { bg: '#0b0e14', box: '#10141c', panel: '#151a23', line: '#232834', text: '#bfbdb6', mute: '#8a919c', bar: '#080a0f', barText: '#8a919c' }, a: '#e6b450' },
      { n: 'GitHub Dimmed', g: 'modern', c: { bg: '#22272e', box: '#2d333b', panel: '#373e47', line: '#444c56', text: '#adbac7', mute: '#8b98a6', bar: '#1c2128', barText: '#8b98a6' }, a: '#539bf5' },
      { n: 'Material Ocean', g: 'modern', c: { bg: '#0f111a', box: '#141722', panel: '#1a1c25', line: '#292d3e', text: '#c3cbe8', mute: '#8f93a2', bar: '#090b10', barText: '#8f93a2' }, a: '#82aaff' },
      { n: 'Poimandres', g: 'modern', c: { bg: '#1b1e28', box: '#222634', panel: '#2a2f3f', line: '#3a4157', text: '#e4f0fb', mute: '#a6accd', bar: '#171922', barText: '#a6accd' }, a: '#5de4c7' },
      { n: 'Moonlight', g: 'modern', c: { bg: '#212337', box: '#2a2d46', panel: '#32365a', line: '#444a73', text: '#c8d3f5', mute: '#9aa5ce', bar: '#1b1d2f', barText: '#9aa5ce' }, a: '#82aaff' },
      { n: 'Nightfox', g: 'modern', c: { bg: '#192330', box: '#1f2c3c', panel: '#27384b', line: '#39506d', text: '#cdcecf', mute: '#9ba3b0', bar: '#131a24', barText: '#9ba3b0' }, a: '#719cd6' },
      { n: 'Oxocarbon', g: 'modern', c: { bg: '#161616', box: '#1e1e1e', panel: '#262626', line: '#393939', text: '#f2f4f8', mute: '#b6b8bb', bar: '#101010', barText: '#b6b8bb' }, a: '#be95ff' },
      { n: 'Vesper', g: 'modern', c: { bg: '#101010', box: '#161616', panel: '#1c1c1c', line: '#2a2a2a', text: '#d8d8d8', mute: '#a0a0a0', bar: '#0a0a0a', barText: '#a0a0a0' }, a: '#ffc799' },
      { n: 'Darcula', g: 'classic', c: { bg: '#2b2b2b', box: '#313335', panel: '#3c3f41', line: '#4b4d4f', text: '#a9b7c6', mute: '#909ca8', bar: '#242424', barText: '#909ca8' }, a: '#cc7832' },
      { n: 'Zenburn', g: 'classic', c: { bg: '#3f3f3f', box: '#484848', panel: '#4f4f4f', line: '#5f5f5f', text: '#dcdccc', mute: '#bcbcac', bar: '#383838', barText: '#bcbcac' }, a: '#f0dfaf' },
      { n: 'Tomorrow Night', g: 'classic', c: { bg: '#1d1f21', box: '#282a2e', panel: '#303337', line: '#373b41', text: '#c5c8c6', mute: '#9a9d9c', bar: '#161718', barText: '#9a9d9c' }, a: '#81a2be' },
      { n: 'Oceanic Next', g: 'classic', c: { bg: '#1b2b34', box: '#223540', panel: '#2a3f4c', line: '#3b505c', text: '#d8dee9', mute: '#a7b2c0', bar: '#15222a', barText: '#a7b2c0' }, a: '#6699cc' },
      { n: 'Base16 Eighties', g: 'classic', c: { bg: '#2d2d2d', box: '#393939', panel: '#424242', line: '#515151', text: '#d3d0c8', mute: '#b0ada5', bar: '#232323', barText: '#b0ada5' }, a: '#6699cc' },
      { n: 'Obsidian', g: 'mono', c: { bg: '#0e0d0f', box: '#171519', panel: '#201d22', line: '#37333b', text: '#f0eef1', mute: '#b8b5ba', bar: '#09080a', barText: '#b8b5ba' }, a: '#a78bfa' },
      { n: 'Graphite', g: 'mono', c: { bg: '#131416', box: '#1c1d1f', panel: '#242629', line: '#3a3d41', text: '#eff0f1', mute: '#b6b8b9', bar: '#0e0f10', barText: '#b6b8b9' }, a: '#7dd3fc' },
      { n: 'Smoke', g: 'mono', c: { bg: '#171717', box: '#202020', panel: '#292929', line: '#404040', text: '#f0f0f0', mute: '#b8b8b8', bar: '#121212', barText: '#b8b8b8' }, a: '#e5e5e5' },
      { n: 'Ink', g: 'mono', c: { bg: '#0c0e12', box: '#13161d', panel: '#1b1e28', line: '#2e3342', text: '#edeef3', mute: '#b2b5bd', bar: '#08090c', barText: '#b2b5bd' }, a: '#93c5fd' },
      { n: 'Steel', g: 'mono', c: { bg: '#16191d', box: '#1e2227', panel: '#262b31', line: '#3b4249', text: '#eef0f2', mute: '#b4b7bb', bar: '#121417', barText: '#b4b7bb' }, a: '#9cc4e4' },
      { n: 'Slate Night', g: 'mono', c: { bg: '#13161b', box: '#1b1f25', panel: '#22282f', line: '#373e49', text: '#edeff2', mute: '#b3b7bc', bar: '#0f1115', barText: '#b3b7bc' }, a: '#7aa7ff' },
      { n: 'Espresso', g: 'earth', c: { bg: '#17110c', box: '#231913', panel: '#2e2219', line: '#4a382b', text: '#f4efeb', mute: '#c0b6af', bar: '#110c09', barText: '#c0b6af' }, a: '#e0a96d' },
      { n: 'Cocoa', g: 'earth', c: { bg: '#1a120f', box: '#251a16', panel: '#30221d', line: '#4b382f', text: '#f4eeec', mute: '#bfb5b0', bar: '#130e0b', barText: '#bfb5b0' }, a: '#e8a87c' },
      { n: 'Moss', g: 'earth', c: { bg: '#11170d', box: '#1a2213', panel: '#222e1a', line: '#38492c', text: '#eff4eb', mute: '#b6c0b0', bar: '#0c1009', barText: '#b6c0b0' }, a: '#a3c46b' },
      { n: 'Pine', g: 'earth', c: { bg: '#0b1611', box: '#11221b', panel: '#172d24', line: '#294a3c', text: '#ebf4f0', mute: '#aec1b9', bar: '#080f0c', barText: '#aec1b9' }, a: '#4fd1a0' },
      { n: 'Olive Grove', g: 'earth', c: { bg: '#15160d', box: '#1f2214', panel: '#2a2d1a', line: '#44482d', text: '#f2f4ec', mute: '#bdbfb0', bar: '#0f1009', barText: '#bdbfb0' }, a: '#c7c34f' },
      { n: 'Copper', g: 'earth', c: { bg: '#18100c', box: '#241811', panel: '#302017', line: '#4d3428', text: '#f4eeeb', mute: '#c2b4ae', bar: '#110b08', barText: '#c2b4ae' }, a: '#e07b39' },
      { n: 'Rust', g: 'earth', c: { bg: '#190e0b', box: '#251511', panel: '#311c16', line: '#4f2f27', text: '#f4edeb', mute: '#c2b1ad', bar: '#120a08', barText: '#c2b1ad' }, a: '#f0694a' },
      { n: 'Ember', g: 'earth', c: { bg: '#170c0a', box: '#24120f', panel: '#301815', line: '#4e2a25', text: '#f4eceb', mute: '#c3afac', bar: '#100807', barText: '#c3afac' }, a: '#ff8a4c' },
      { n: 'Clay', g: 'earth', c: { bg: '#1c1712', box: '#272019', panel: '#322920', line: '#4c4033', text: '#f3f0ec', mute: '#beb8b1', bar: '#16120e', barText: '#beb8b1' }, a: '#d9a066' },
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
      { n: 'Peach Night', g: 'pastel', c: { bg: '#261c17', box: '#31241e', panel: '#3c2d25', line: '#574238', text: '#f3eeec', mute: '#beb5b1', bar: '#201713', barText: '#beb5b1' }, a: '#ffcba4' }],
    light: [
      { n: 'Paper', g: 'site', c: {  }, a: '' },
      { n: 'Pure White', g: 'site', c: { bg: '#ffffff', box: '#ffffff', panel: '#ffffff', line: '#e6e6e6', bar: '#ffffff' }, a: '' },
      { n: 'Cool Gray', g: 'site', c: { bg: '#f1f3f6', box: '#ffffff', panel: '#ffffff', line: '#dde1e7', text: '#111827', mute: '#5b6472', bar: '#e7eaf0', barText: '#5b6472' }, a: '' },
      { n: 'Sand', g: 'site', c: { bg: '#f4efe6', box: '#fffaf2', panel: '#fffaf2', line: '#e4d9c7', text: '#1d1a15', mute: '#6b6152', bar: '#ece3d4', barText: '#6b6152' }, a: '' },
      { n: 'Solarized Light', g: 'classic', c: { bg: '#fdf6e3', box: '#fffaf0', panel: '#fffaf0', line: '#e6dfc8', text: '#253f46', mute: '#56696f', bar: '#eee8d5', barText: '#4e6167' }, a: '#268bd2' },
      { n: 'Gruvbox Light', g: 'classic', c: { bg: '#fbf1c7', box: '#fdf6d8', panel: '#fffaeb', line: '#d5c4a1', text: '#3c3836', mute: '#665c54', bar: '#ebdbb2', barText: '#665c54' }, a: '#b57614' },
      { n: 'One Light', g: 'classic', c: { bg: '#f0f0f1', box: '#fafafa', panel: '#ffffff', line: '#dbdbdc', text: '#383a42', mute: '#696c77', bar: '#e5e5e6', barText: '#5a5d68' }, a: '#4078f2' },
      { n: 'Nord Snow', g: 'classic', c: { bg: '#eceff4', box: '#f8f9fb', panel: '#ffffff', line: '#d8dee9', text: '#2e3440', mute: '#4c566a', bar: '#e5e9f0', barText: '#4c566a' }, a: '#5e81ac' },
      { n: 'Quiet Light', g: 'classic', c: { bg: '#f5f5f5', box: '#ffffff', panel: '#ffffff', line: '#dddddd', text: '#333333', mute: '#5f5f5f', bar: '#e8e8e8', barText: '#555555' }, a: '#4b69c6' },
      { n: 'GitHub Light', g: 'modern', c: { bg: '#f6f8fa', box: '#ffffff', panel: '#ffffff', line: '#d0d7de', text: '#1f2328', mute: '#59636e', bar: '#ffffff', barText: '#59636e' }, a: '#0969da' },
      { n: 'Catppuccin Latte', g: 'modern', c: { bg: '#eff1f5', box: '#fafbfc', panel: '#ffffff', line: '#ccd0da', text: '#4c4f69', mute: '#62657b', bar: '#e6e9ef', barText: '#5c5f77' }, a: '#8839ef' },
      { n: 'Rosé Pine Dawn', g: 'modern', c: { bg: '#faf4ed', box: '#fffaf3', panel: '#fffaf3', line: '#dfdad9', text: '#575279', mute: '#6a6687', bar: '#f2e9e1', barText: '#615d7f' }, a: '#d7827e' },
      { n: 'Tokyo Night Day', g: 'modern', c: { bg: '#e1e2e7', box: '#eceef3', panel: '#f4f5f8', line: '#c4c8da', text: '#33395a', mute: '#525a85', bar: '#d6d9e4', barText: '#484f7a' }, a: '#2e7de9' },
      { n: 'Ayu Light', g: 'modern', c: { bg: '#f8f9fa', box: '#ffffff', panel: '#ffffff', line: '#e3e5e8', text: '#4a4f55', mute: '#62686e', bar: '#f0f1f3', barText: '#5c6268' }, a: '#fa8d3e' },
      { n: 'Everforest Light', g: 'modern', c: { bg: '#fdf6e3', box: '#fffbef', panel: '#fffbef', line: '#e6e2cc', text: '#4d5b62', mute: '#5d6b65', bar: '#f4f0d9', barText: '#56645e' }, a: '#8da101' },
      { n: 'Kanagawa Lotus', g: 'modern', c: { bg: '#f2ecbc', box: '#f8f3d4', panel: '#fbf7e0', line: '#d5cea3', text: '#43436c', mute: '#5f5f72', bar: '#e7dba0', barText: '#4d4d63' }, a: '#4d699b' },
      { n: 'Mint', g: 'soft', c: { bg: '#eef7f2', box: '#ffffff', panel: '#ffffff', line: '#d3e6db', text: '#1d2b24', mute: '#4f6358', bar: '#e1efe7', barText: '#4a5d53' }, a: '#1f9d6b' },
      { n: 'Lavender', g: 'soft', c: { bg: '#f4f2fb', box: '#ffffff', panel: '#ffffff', line: '#e0dbf3', text: '#25213a', mute: '#5c5577', bar: '#ebe7f8', barText: '#575073' }, a: '#7c5cff' },
      { n: 'Peach', g: 'soft', c: { bg: '#fdf1ec', box: '#ffffff', panel: '#ffffff', line: '#f2dcd2', text: '#3a2a24', mute: '#6f5a51', bar: '#f8e4db', barText: '#6a554c' }, a: '#f0784a' },
      { n: 'Sky', g: 'soft', c: { bg: '#eef5fc', box: '#ffffff', panel: '#ffffff', line: '#d4e3f3', text: '#16263a', mute: '#4c5e74', bar: '#e2edf9', barText: '#475970' }, a: '#2f80ed' },
      { n: 'Bubblegum', g: 'vivid', c: { bg:'#fff0f7',box:'#ffffff',panel:'#ffffff',line:'#ffc9e3',text:'#3a0a24',mute:'#8a4468',bar:'#ffe0ef',barText:'#7a3a5c' }, a: '#ff2d95' },
      { n: 'Citrus', g: 'vivid', c: { bg:'#fffbe6',box:'#ffffff',panel:'#ffffff',line:'#ffe58a',text:'#2e2500',mute:'#7a6a10',bar:'#fff2b3',barText:'#6b5c0d' }, a: '#ff9100' },
      { n: 'Tropical', g: 'vivid', c: { bg:'#e8fff7',box:'#ffffff',panel:'#ffffff',line:'#a8f0d4',text:'#002e22',mute:'#2d7a62',bar:'#c9fae8',barText:'#266b55' }, a: '#00c389' },
      { n: 'Coral Reef', g: 'vivid', c: { bg:'#fff1ee',box:'#ffffff',panel:'#ffffff',line:'#ffd0c7',text:'#3a1410',mute:'#8a4a40',bar:'#ffe0da',barText:'#7a4036' }, a: '#ff4d4d' },
      { n: 'Electric Lilac', g: 'vivid', c: { bg:'#f3ecff',box:'#ffffff',panel:'#ffffff',line:'#dcc8ff',text:'#240a45',mute:'#6a4a99',bar:'#e9dcff',barText:'#5f4390' }, a: '#8a2be2' },
      { n: 'Sunny Day', g: 'vivid', c: { bg:'#fffde7',box:'#ffffff',panel:'#ffffff',line:'#fff0a0',text:'#2a2400',mute:'#756a12',bar:'#fff7c2',barText:'#665c0f' }, a: '#f5a800' },
      { n: 'Sky Pop', g: 'vivid', c: { bg:'#e6f6ff',box:'#ffffff',panel:'#ffffff',line:'#b3e0ff',text:'#00233a',mute:'#2f6a92',bar:'#d2eeff',barText:'#2a5f85' }, a: '#0091ff' },
      { n: 'Fresh Lime', g: 'vivid', c: { bg:'#f4ffe0',box:'#ffffff',panel:'#ffffff',line:'#d6f59a',text:'#1a2b00',mute:'#527a12',bar:'#e8fbbd',barText:'#496d10' }, a: '#6cc800' },
      { n: 'Neon Day', g: 'neon', c: { bg:'#ffffff',box:'#ffffff',panel:'#ffffff',line:'#e0e0e0',text:'#10002b',mute:'#4a3a70',bar:'#f5f0ff',barText:'#4a3a70' }, a: '#e100ff' },
      { n: 'Hot Magenta', g: 'neon', c: { bg:'#fff5fb',box:'#ffffff',panel:'#ffffff',line:'#ffc2e6',text:'#30001f',mute:'#80305e',bar:'#ffe3f3',barText:'#702c55' }, a: '#ff0080' },
      { n: 'Electric Cyan', g: 'neon', c: { bg:'#effcff',box:'#ffffff',panel:'#ffffff',line:'#a8ecfa',text:'#002933',mute:'#1f6a7d',bar:'#d4f7ff',barText:'#1c5f70' }, a: '#00b8d9' },
      { n: 'High Contrast', g: 'contrast', c: { bg: '#ffffff', box: '#ffffff', panel: '#ffffff', line: '#575757', text: '#000000', mute: '#2b2b2b', bar: '#ffffff', barText: '#1a1a1a' }, a: '#0050c8' },
      { n: 'Catppuccin Frappé Light', g: 'modern', c: { bg: '#e6e9ef', box: '#f5f6f9', panel: '#ffffff', line: '#c9cdd9', text: '#4c4f69', mute: '#5c5f77', bar: '#dce0e8', barText: '#5c5f77' }, a: '#687ffd' },
      { n: 'Night Owl Light', g: 'modern', c: { bg: '#fbfbfb', box: '#ffffff', panel: '#ffffff', line: '#e0e7ea', text: '#403f53', mute: '#5f6280', bar: '#f0f0f0', barText: '#5a5d78' }, a: '#4876d6' },
      { n: 'Tomorrow Light', g: 'classic', c: { bg: '#f7f7f6', box: '#ffffff', panel: '#ffffff', line: '#dcdcda', text: '#4d4d4c', mute: '#6a6a68', bar: '#ebebe9', barText: '#62625f' }, a: '#4778b9' },
      { n: 'Material Lighter', g: 'modern', c: { bg: '#fafafa', box: '#ffffff', panel: '#ffffff', line: '#e7eaec', text: '#41565f', mute: '#556b77', bar: '#eef0f1', barText: '#4d6470' }, a: '#6182b8' },
      { n: 'Paperwhite', g: 'classic', c: { bg: '#ffffff', box: '#fafafa', panel: '#ffffff', line: '#e8e8e8', text: '#1a1a1a', mute: '#595959', bar: '#f5f5f5', barText: '#4d4d4d' }, a: '#3770ed' },
      { n: 'Newsprint', g: 'classic', c: { bg: '#f2efe8', box: '#faf8f3', panel: '#fdfcf9', line: '#d9d4c7', text: '#1f1d19', mute: '#5e594e', bar: '#e8e4d8', barText: '#575246' }, a: '#c1590a' },
      { n: 'Sepia', g: 'classic', c: { bg: '#f4ecd8', box: '#faf3e1', panel: '#fdf8ea', line: '#dccfb0', text: '#433422', mute: '#6b5a41', bar: '#ebe1c8', barText: '#625239' }, a: '#a7692c' },
      { n: 'GitHub Soft', g: 'modern', c: { bg: '#f6f8fa', box: '#ffffff', panel: '#ffffff', line: '#d8dee4', text: '#24292f', mute: '#57606a', bar: '#eaeef2', barText: '#57606a' }, a: '#1c8a3c' },
      { n: 'Snow', g: 'mono', c: { bg: '#f8f9f9', box: '#ffffff', panel: '#ffffff', line: '#dee0e3', text: '#16191d', mute: '#585c60', bar: '#f0f1f2', barText: '#53575b' }, a: '#3b82f6' },
      { n: 'Fog', g: 'mono', c: { bg: '#eeeff1', box: '#ffffff', panel: '#ffffff', line: '#d5d7da', text: '#16191d', mute: '#585b5f', bar: '#e6e8ea', barText: '#54565a' }, a: '#6366f1' },
      { n: 'Ash', g: 'mono', c: { bg: '#eeeeee', box: '#ffffff', panel: '#ffffff', line: '#d6d6d6', text: '#1a1a1a', mute: '#5c5c5c', bar: '#e7e7e7', barText: '#575757' }, a: '#777777' },
      { n: 'Pearl', g: 'mono', c: { bg: '#f4f4f6', box: '#ffffff', panel: '#ffffff', line: '#dbdbde', text: '#17181c', mute: '#595a5f', bar: '#ececee', barText: '#545559' }, a: '#8e55ef' },
      { n: 'Concrete', g: 'mono', c: { bg: '#ececeb', box: '#ffffff', panel: '#ffffff', line: '#d5d4d3', text: '#1b1a18', mute: '#5d5c5b', bar: '#e5e4e3', barText: '#585756' }, a: '#cf7106' },
      { n: 'Cloud', g: 'mono', c: { bg: '#f3f5f6', box: '#ffffff', panel: '#ffffff', line: '#d9dde0', text: '#141a1f', mute: '#565d61', bar: '#ebeef0', barText: '#51585c' }, a: '#0c91cd' },
      { n: 'Linen', g: 'earth', c: { bg: '#f6f3ee', box: '#ffffff', panel: '#ffffff', line: '#e2dcd2', text: '#221c11', mute: '#685f4f', bar: '#f1ece4', barText: '#625a4b' }, a: '#d4470d' },
      { n: 'Oat', g: 'earth', c: { bg: '#f3f1ec', box: '#ffffff', panel: '#ffffff', line: '#dedad1', text: '#221d11', mute: '#656052', bar: '#eeeae2', barText: '#605a4e' }, a: '#b1810b' },
      { n: 'Terracotta Light', g: 'earth', c: { bg: '#f7f0ee', box: '#ffffff', panel: '#ffffff', line: '#e3d6d1', text: '#221511', mute: '#6a554e', bar: '#f2e7e3', barText: '#64514a' }, a: '#dc5a2e' },
      { n: 'Sage', g: 'earth', c: { bg: '#f0f3ef', box: '#ffffff', panel: '#ffffff', line: '#d6ddd5', text: '#161f14', mute: '#586156', bar: '#e7ece6', barText: '#535c51' }, a: '#5b9847' },
      { n: 'Olive Light', g: 'earth', c: { bg: '#f2f3ec', box: '#ffffff', panel: '#ffffff', line: '#dcded1', text: '#1f2211', mute: '#626553', bar: '#ecede3', barText: '#5d5f4e' }, a: '#81911a' },
      { n: 'Dune', g: 'earth', c: { bg: '#f2eee8', box: '#ffffff', panel: '#ffffff', line: '#ddd6cd', text: '#221b11', mute: '#675d51', bar: '#ede6de', barText: '#61584c' }, a: '#ba7c29' },
      { n: 'Latte Cream', g: 'earth', c: { bg: '#f7f4f0', box: '#ffffff', panel: '#ffffff', line: '#e2dbd5', text: '#221a11', mute: '#665c51', bar: '#f1ece7', barText: '#61574d' }, a: '#a8683c' },
      { n: 'Clay Light', g: 'earth', c: { bg: '#f3efec', box: '#ffffff', panel: '#ffffff', line: '#ded6d1', text: '#221711', mute: '#655953', bar: '#ede7e3', barText: '#5f544e' }, a: '#c0623a' },
      { n: 'Birch', g: 'earth', c: { bg: '#f4f5f2', box: '#ffffff', panel: '#ffffff', line: '#dcdfd8', text: '#1a1e15', mute: '#5d6157', bar: '#eceee9', barText: '#575b52' }, a: '#759338' },
      { n: 'Pastel Pink', g: 'pastel', c: { bg: '#f8eff3', box: '#ffffff', panel: '#ffffff', line: '#e6d1da', text: '#221118', mute: '#6c4b59', bar: '#f4e4eb', barText: '#664754' }, a: '#e0509a' },
      { n: 'Pastel Blue', g: 'pastel', c: { bg: '#eff4f8', box: '#ffffff', panel: '#ffffff', line: '#d1dbe6', text: '#111922', mute: '#4b5c6c', bar: '#e4ecf4', barText: '#475766' }, a: '#418be1' },
      { n: 'Pastel Green', g: 'pastel', c: { bg: '#edf8f1', box: '#ffffff', panel: '#ffffff', line: '#cfe5d8', text: '#112218', mute: '#4b6c59', bar: '#e2f3e9', barText: '#476654' }, a: '#369a6d' },
      { n: 'Pastel Lilac', g: 'pastel', c: { bg: '#f4eff8', box: '#ffffff', panel: '#ffffff', line: '#dbd1e6', text: '#191122', mute: '#5c4b6c', bar: '#ece4f4', barText: '#574766' }, a: '#9b6ff0' },
      { n: 'Pastel Yellow', g: 'pastel', c: { bg: '#f8f6ed', box: '#ffffff', panel: '#ffffff', line: '#e5e1cf', text: '#221f11', mute: '#6c674b', bar: '#f3f0e2', barText: '#666147' }, a: '#ae8300' },
      { n: 'Butter', g: 'pastel', c: { bg: '#f7f5eb', box: '#ffffff', panel: '#ffffff', line: '#e4e0cd', text: '#221f11', mute: '#6c664b', bar: '#f2efe0', barText: '#666047' }, a: '#b47f00' },
      { n: 'Cotton Candy', g: 'pastel', c: { bg: '#f9f1f6', box: '#ffffff', panel: '#ffffff', line: '#e7d2e0', text: '#22111c', mute: '#6c4b61', bar: '#f5e6f0', barText: '#66475c' }, a: '#e749b0' },
      { n: 'Seafoam', g: 'pastel', c: { bg: '#edf7f6', box: '#ffffff', panel: '#ffffff', line: '#d0e4e1', text: '#11221f', mute: '#4d6b66', bar: '#e3f2f0', barText: '#486560' }, a: '#1a9a88' },
      { n: 'Apricot', g: 'pastel', c: { bg: '#f8f2ed', box: '#ffffff', panel: '#ffffff', line: '#e5d9cf', text: '#221911', mute: '#6c5b4b', bar: '#f3eae2', barText: '#665647' }, a: '#e46014' },
      { n: 'Blush', g: 'pastel', c: { bg: '#f8eff0', box: '#ffffff', panel: '#ffffff', line: '#e6d1d4', text: '#221114', mute: '#6c4b51', bar: '#f4e4e7', barText: '#66474c' }, a: '#e5566d' },
      { n: 'Ocean Light', g: 'modern', c: { bg: '#edf4f8', box: '#ffffff', panel: '#ffffff', line: '#cfdee5', text: '#111c22', mute: '#4b616c', bar: '#e2edf3', barText: '#475c66' }, a: '#0891b2' },
      { n: 'Lilac Mist', g: 'modern', c: { bg: '#f1eef6', box: '#ffffff', panel: '#ffffff', line: '#d8d2e2', text: '#171122', mute: '#584f68', bar: '#e9e4f1', barText: '#544b62' }, a: '#7d5df0' },
      { n: 'Rose Quartz', g: 'modern', c: { bg: '#f8f0f2', box: '#ffffff', panel: '#ffffff', line: '#e4d2d7', text: '#221115', mute: '#6a4e55', bar: '#f3e5e9', barText: '#644a50' }, a: '#d6487a' },
      { n: 'Frost', g: 'modern', c: { bg: '#f1f5f6', box: '#ffffff', panel: '#ffffff', line: '#d5dee2', text: '#111e22', mute: '#526165', bar: '#e7eef1', barText: '#4e5b60' }, a: '#2a92c4' },
      { n: 'Retro Paper', g: 'retro', c: { bg: '#f5e6c8', box: '#fbf0da', panel: '#fdf6e6', line: '#d9c294', text: '#3b2a14', mute: '#6a5330', bar: '#ecd9b0', barText: '#5e4a2a' }, a: '#d4470d' },
      { n: 'Old Terminal Light', g: 'retro', c: { bg: '#e8f5e9', box: '#f3fbf4', panel: '#ffffff', line: '#b8dcbc', text: '#0b3d12', mute: '#2f6b3a', bar: '#d4ecd7', barText: '#2a5f34' }, a: '#1b9e3a' },
      { n: 'Blue Contrast', g: 'contrast', c: { bg: '#ffffff', box: '#ffffff', panel: '#ffffff', line: '#4a4a4a', text: '#000000', mute: '#262626', bar: '#ffffff', barText: '#111111' }, a: '#0e6fff' },
      { n: 'Warm Contrast', g: 'contrast', c: { bg: '#fffdf5', box: '#ffffff', panel: '#ffffff', line: '#5c4a00', text: '#000000', mute: '#2e2500', bar: '#fffdf5', barText: '#1a1500' }, a: '#a46b00' }]
  };
  var lsGet = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var lsSet = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var presetAccent = lsGet('ix-pacc') !== '0', presetGroup = lsGet('ix-pgroup') || 'all';   // remembered in this browser
  var colorMode = '';
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
      return '<button type="button" class="ix-preset" data-pre="' + i + '" data-g="' + pr.g + '" data-name="' + esc(pr.n.toLowerCase()) + '" aria-pressed="' + isOn(pr) + '" title="' + esc(pr.n) + (pr.a ? ' (accent ' + pr.a + ')' : '') + '"><span class="ix-pv" style="background:' + c.bg + ';border-color:' + c.line + '">' +
        '<i style="background:' + c.bar + '"></i><b style="background:' + c.box + ';border-color:' + c.line + '"><em style="background:' + c.text + '"></em><em style="background:' + c.mute + '"></em></b><u style="background:' + acc + '"></u></span>' + esc(pr.n) + '</button>';
    };
    var body = groups.map(function (g) { return '<span class="ix-psep" data-g="' + g[0] + '">' + g[1] + '</span>' + list.filter(function (pr) { return pr.g === g[0]; }).map(card).join(''); }).join('');
    return '<details class="ix-acc" id="ix-presets"' + '' + '><summary><span>Presets</span><small>' + (current ? 'Now: ' + esc(current.n) : Object.keys(set).length ? 'Now: Your Own Mix' : 'Now: Built-In') + ' · ' + list.length + ' looks for ' + (m === 'dark' ? 'dark' : 'light') + ' mode</small></summary><div class="ix-accb">' +
      '<p>One click fills the whole mode; fine-tune any color in the Colors tab afterwards.</p>' +
      '<label class="ix-tg" style="margin:0 0 10px"><span>Use the Preset\'s Accent Color<small>Presets like Dracula or Nord bring their own accent. Off keeps yours.</small></span><input type="checkbox" id="ix-pacc"' + (presetAccent ? ' checked' : '') + '></label>' +
      '<div class="ix-ptools"><input type="search" id="ix-psearch" class="ix-psearch" placeholder="Search ' + list.length + ' Presets" aria-label="Search Presets" autocomplete="off" spellcheck="false"><button type="button" class="ix-btn" id="ix-prand">' + svg(ICON.sparkle) + 'Surprise Me</button></div>' +
      '<details class="ix-more ix-mypre" id="ix-mypre"' + ((S.myPresets || []).length ? ' open' : '') + '><summary>My Presets: Save, Share, Delete</summary>' +
        '<p>Save the colors and accent you have now (both dark and light) as a preset of your own. It appears under My Presets and is kept in your backups.</p>' +
        '<div class="ix-row"><input type="text" id="ix-mpn" maxlength="30" placeholder="Name This Look" aria-label="Name for this look" style="flex:1;min-width:180px"><button type="button" class="ix-btn pri" id="ix-mps">Save Current Look</button></div>' +
        ((S.myPresets || []).length ? '<div class="ix-devs" style="margin-top:12px">' + S.myPresets.map(function (mp, i) { return '<div class="ix-dev"><span class="ix-dev-i" style="background:' + esc(mp.a || '#888') + '"></span><div class="ix-dev-b"><b>' + esc(mp.n) + '</b></div><button type="button" class="ix-btn danger" data-mpd="' + i + '">Delete</button></div>'; }).join('') + '</div>' : '') +
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
    var row = function (k, label, val, shown, attrs) {
      return '<div class="ix-cr"><span>' + esc(label) + '</span><input type="color" ' + attrs + ' value="' + shown + '" aria-label="' + esc(label) + '">' +
        '<input type="text" class="ix-hex" maxlength="7" placeholder="' + shown + '" value="' + (val || '') + '" spellcheck="false" aria-label="' + esc(label) + ', hex code">' +
        '<button type="button" class="ix-ib ix-crx" title="Back to the Default"' + (val ? '' : ' hidden') + ' aria-label="Reset ' + esc(label) + '">↺</button></div>';
    };
    var same = function (a, b) { return JSON.stringify(Object.keys(a).sort().map(function (k) { return [k, a[k]]; })) === JSON.stringify(Object.keys(b).sort().map(function (k) { return [k, b[k]]; })); };
    p.innerHTML = (draft.look === false ? '<p class="ix-err">"Same Look on Every Page" is off (Appearance tab), so these colors aren\'t used.</p>' : '') +
      '<div class="ix-row" style="justify-content:space-between">' + seg('cmode', [['dark', 'Dark Mode'], ['light', 'Light Mode']], m) +
      '<button type="button" class="ix-btn" id="ix-cres">Reset ' + (m === 'dark' ? 'Dark' : 'Light') + ' Mode</button></div>' +
      '<p class="ix-note" style="margin:0 0 12px">Ready-made looks live in the <b>Presets</b> tab.</p>' +
      COLOR_GROUPS.map(function (g) {
        return '<div class="ix-cgrp"><h4>' + g[0] + '</h4><p>' + g[1] + '</p>' + g[2].map(function (k) {
          return row(k[0], k[1], set[k[0]], set[k[0]] || def[k[0]], 'data-k="' + k[0] + '"');
        }).join('') + '</div>';
      }).join('') +
      '<div class="ix-cgrp"><h4>Page Backgrounds</h4><p>A different background for one page, for example a lighter tone for Info. Replaces the page background there.</p>' +
        PG_APPS.map(function (a) { var v = cur.pg[a[0]][m]; return row('', a[1], v, v || set.bg || def.bg, 'data-pg="' + a[0] + '"'); }).join('') + '</div>' +
      '<div class="ix-cgrp"><h4>Page Accents</h4><p>A different accent color for one page: its buttons, highlights and the bar\'s current tab. Empty uses the site accent from the Look tab.</p>' +
        [['home', 'Start Page']].concat(PG_APPS).map(function (a) { var v = (draft.accentPg || {})[a[0]]; return row('', a[1], v, v || draft.accent || '#ffc21a', 'data-ap="' + a[0] + '"'); }).join('') + '</div>' +
      '<p class="ix-note">The site accent: the Look tab. Tab colors: the pencil on each tab.</p>';
    bindSeg(p, function (k, v) { if (k === 'cmode') { colorMode = v; K.previewTheme(v); pColors(p); } });
    p.querySelectorAll('.ix-cr').forEach(function (r) {
      var sw = r.querySelector('input[type=color]'), tx = r.querySelector('.ix-hex'), x = r.querySelector('.ix-crx');
      var put = function (v) {
        if (sw.dataset.ap) { draft.accentPg = draft.accentPg || {}; if (v) draft.accentPg[sw.dataset.ap] = v; else delete draft.accentPg[sw.dataset.ap]; }
        else if (sw.dataset.pg) { if (v) cur.pg[sw.dataset.pg][m] = v; else delete cur.pg[sw.dataset.pg][m]; }
        else { if (v) set[sw.dataset.k] = v; else delete set[sw.dataset.k]; }
        x.hidden = !v; preview();
      };
      bindHex(sw, tx, put, true);
      x.onclick = function () { tx.value = ''; sw.value = tx.placeholder; put(''); };
    });
    p.querySelector('#ix-cres').onclick = function () { cur[m] = {}; PG_APPS.forEach(function (a) { delete cur.pg[a[0]][m]; }); preview(); pColors(p); };
  }
  /* Appearance > Presets: the whole gallery on its own tab, dark or light mode, one click fills every color */
  function pThemes(p) {
    var cur = draft.colors = draft.colors || {};
    ['dark', 'light', 'pg'].forEach(function (k) { if (!cur[k] || Array.isArray(cur[k])) cur[k] = {}; });
    PG_APPS.forEach(function (a) { if (!cur.pg[a[0]] || Array.isArray(cur.pg[a[0]])) cur.pg[a[0]] = {}; });
    var m = colorMode || (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'); colorMode = m;
    var set = cur[m], def = COLOR_DEFAULT[m];
    var html = presetsHtml(m, set, def)
      .replace(/<details class="ix-acc" id="ix-presets"[^>]*><summary><span>Presets<\/span><small>([\s\S]*?)<\/small><\/summary><div class="ix-accb">/, '<div class="ix-flatp" id="ix-presets"><p class="ix-note ix-fh">$1</p><div class="ix-fb">')
      .replace(/<\/div><\/details>$/, '</div></div>');
    p.innerHTML = (draft.look === false ? '<p class="ix-err">"Same Look on Every Page" is off (Appearance tab), so these colors aren\'t used.</p>' : '') +
      '<div class="ix-row" style="justify-content:space-between">' + seg('cmode', [['dark', 'Dark Mode'], ['light', 'Light Mode']], m) +
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
    p.querySelector('#ix-prand').onclick = function () {
      var pool = cards.filter(function (c) { return !c.hidden && c.getAttribute('aria-pressed') !== 'true'; });
      if (pool.length) pool[Math.floor(Math.random() * pool.length)].click();
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
    var again = function () { var op = p.querySelector('#ix-mypre'); keepScroll(function () { pThemes(p); }); var n = p.querySelector('#ix-mypre'); if (n) n.open = true; };
    p.querySelector('#ix-mps').onclick = function () {
      var name = p.querySelector('#ix-mpn').value.trim(); if (!name) { mpe.textContent = 'Give this look a name first.'; return; }
      var mine = (S.myPresets || []).filter(function (x) { return x.n !== name; });
      mine.push({ n: name, a: draft.accent || '', dark: JSON.parse(JSON.stringify(cur.dark || {})), light: JSON.parse(JSON.stringify(cur.light || {})) });
      saveMine(mine.slice(-40)).then(function () { toast('Saved as "' + name + '".'); presetGroup = 'mine'; lsSet('ix-pgroup', 'mine'); again(); }, function (e) { mpe.textContent = e.message; });
    };
    p.querySelectorAll('[data-mpd]').forEach(function (b) { b.onclick = function () {
      if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Click Again to Delete'; return; }
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
  function pNav(p) {
    var n = [['top', 't', 'Top Bar'], ['side', 's', 'Sidebar'], ['dock', 'd', 'Bottom Dock']];
    p.innerHTML = '<h3>Navigation Style</h3><p>Applies to every page. On phones the top bar and sidebar fold into a menu.</p>' +
      '<div class="ix-navpick">' + n.map(function (o) { return '<button type="button" class="' + o[1] + '" data-n="' + o[0] + '" aria-pressed="' + (draft.nav === o[0]) + '"><i></i>' + o[2] + '</button>'; }).join('') + '</div>' +
      '<label class="ix-tg"><span>Show the Bar on the Start Page<small>Off keeps the start page clean; a corner button opens the menu.</small></span><input type="checkbox" id="ix-hb"' + (draft.homeBar ? ' checked' : '') + '></label>' +
      '<h3>Tabs</h3><p>Rename, reorder (drag or arrows) or hide tabs.</p>' +
      '<div class="ix-pgl" id="ix-pgl"></div><div class="ix-row"><button type="button" class="ix-btn" id="ix-pgr">Reset Names and Order</button></div>';
    tabEditor(p.querySelector('#ix-pgl'));
    p.querySelector('#ix-pgr').onclick = function () { draft.pages = []; tabEditor(p.querySelector('#ix-pgl')); preview(); };
    p.querySelectorAll('[data-n]').forEach(function (b) { b.onclick = function () {
      draft.nav = b.dataset.n; p.querySelectorAll('[data-n]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); preview(); }; });
    p.querySelector('#ix-hb').onchange = function (e) { draft.homeBar = e.target.checked; preview(); };
  }
  /* Settings > General > Navigation > Tabs: one row per page (name, up/down, show/hide), drag a row to move it. */
  function tabEditor(box) {
    var list = pageList(draft).map(function (q) { var d = PAGE_DEF.filter(function (x) { return x[0] === q[0]; })[0];
      return { id: q[0], name: q[1] === d[1] ? '' : q[1], hide: q[4], def: d[1], icon: d[3] }; });
    var keep = function () { draft.pages = list.map(function (x) { return { id: x.id, name: x.name, hide: x.hide }; }); preview(); };
    var dragFrom = -1;
    function draw() {
      box.innerHTML = list.map(function (x, i) {
        return '<div class="ix-pgr' + (x.hide ? ' off' : '') + '" draggable="true" data-i="' + i + '"><span class="ix-pgi" aria-hidden="true">' + svg(x.icon) + '</span>' +
          '<input type="text" maxlength="20" value="' + esc(x.name) + '" placeholder="' + esc(x.def) + '" aria-label="Name of the ' + esc(x.def) + ' tab" data-k="name">' +
          '<button type="button" class="ix-ib" data-k="up" aria-label="Move ' + esc(x.def) + ' up" title="Move up"' + (i === 0 ? ' disabled' : '') + '>' + svg(ICON.up) + '</button>' +
          '<button type="button" class="ix-ib" data-k="down" aria-label="Move ' + esc(x.def) + ' down" title="Move Down"' + (i === list.length - 1 ? ' disabled' : '') + '>' + svg(ICON.down) + '</button>' +
          '<label class="ix-pgs" title="Show This Tab"><input type="checkbox" data-k="show"' + (x.hide ? '' : ' checked') + '> Show</label></div>';
      }).join('');
    }
    function move(i, j) { if (j < 0 || j >= list.length || i === j) return; var x = list.splice(i, 1)[0]; list.splice(j, 0, x); draw(); keep(); }
    box.oninput = function (e) { var r = e.target.closest('.ix-pgr'); if (r && e.target.dataset.k === 'name') { list[+r.dataset.i].name = e.target.value.trim(); keep(); } };
    box.onchange = function (e) {
      var r = e.target.closest('.ix-pgr'); if (!r || e.target.dataset.k !== 'show') return;
      var x = list[+r.dataset.i];
      if (!e.target.checked && list.filter(function (y) { return !y.hide; }).length === 1) { e.target.checked = true; toast('Keep at least one tab.'); return; }
      x.hide = !e.target.checked; r.classList.toggle('off', x.hide); keep();
    };
    box.onclick = function (e) {
      var b = e.target.closest('button[data-k]'), r = b && b.closest('.ix-pgr'); if (!r) return;
      var i = +r.dataset.i; move(i, b.dataset.k === 'up' ? i - 1 : i + 1);
      var nb = box.querySelector('.ix-pgr[data-i="' + (b.dataset.k === 'up' ? i - 1 : i + 1) + '"] [data-k="' + b.dataset.k + '"]'); if (nb && !nb.disabled) nb.focus();
    };
    box.ondragstart = function (e) { var r = e.target.closest && e.target.closest('.ix-pgr'); if (!r || e.target.tagName === 'INPUT') return; dragFrom = +r.dataset.i; r.classList.add('drag'); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', r.dataset.i); } catch (x) {} };
    box.ondragover = function (e) { if (dragFrom >= 0) e.preventDefault(); };
    box.ondrop = function (e) { var r = e.target.closest('.ix-pgr'); if (dragFrom >= 0 && r) { e.preventDefault(); move(dragFrom, +r.dataset.i); } dragFrom = -1; };
    box.ondragend = function () { dragFrom = -1; box.querySelectorAll('.drag').forEach(function (x) { x.classList.remove('drag'); }); };
    draw();
  }
  function pPages(p) {
    var rows = [['Start Page', ''], ['Links', 'web/links/'], ['Info', 'web/info/'], ['Cards', 'web/cards/'], ['Tasks', 'web/tasks/']];
    p.innerHTML = '<h3>Open a Page in Edit Mode</h3><p>Jumps to the page and starts editing. The same options are always under the pencil icon in the bar.</p>' +
      rows.map(function (r) { return '<div class="ix-part"><label style="justify-content:space-between">' + r[0] +
        '<a class="ix-btn" href="' + ROOT + r[1] + (r[0] === 'Cards' || r[0] === 'Tasks' ? '' : '#hub-edit') + '">' + svg(ICON.edit) + 'Open &amp; Edit</a></label></div>'; }).join('');
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
      if (!ready) line('bad', '<b>Not connected yet.</b> Open the <b>Setup</b> tab and follow the 4 steps.');
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

        acc('bot', 'Setup', ready ? 'Connected to ' + esc(n.chatName || n.chat) + '. The schedule (a cron job) is what sends messages on time.' : 'Four short steps: make a bot, connect it, check it, add the schedule.',
          tabHead(ICON.gear, 'Setup', 'Four short steps: make a bot, connect it, check it, add the schedule.') + (function () {
            var d1 = !!n.hasToken, d3 = !!n.chat, d4 = ready && !!n.on, cur = !d1 ? 1 : !d3 ? 3 : !d4 ? 4 : 0;
            var stp = function (num, done, now, title, body) {
              return '<li class="ix-stp' + (done ? ' done' : now ? ' now' : '') + '"><span class="ix-stn">' + (done ? '✓' : num) + '</span><div class="ix-stb"><div class="ix-stt">' + title + '</div>' + body + '</div></li>'; };
            return '<ol class="ix-stps">' +
              stp(1, d1, cur === 1, 'Make a Bot', '<p>In Telegram, open <b>@BotFather</b>, send <code>/newbot</code> and answer its questions. It then gives you a <b>token</b>: a long line of letters and numbers.</p>') +
              stp(2, d1, false, 'Paste Its Token', '<div class="ix-fd">' + '<label for="nt-tok">Bot Token</label><div class="ix-row"><input type="password" id="nt-tok" autocomplete="off" spellcheck="false" placeholder="' + esc(n.tokenHint || '123456789:AAE…') + '" style="flex:1;min-width:200px">' +
                '<button type="button" class="ix-btn pri" id="nt-st">Save Token</button>' + (n.hasToken ? '<button type="button" class="ix-btn" id="nt-rm">Remove</button>' : '') + '</div><small>It stays on your server and is only used to talk to Telegram.</small></div>') +
              stp(3, d3, cur === 3, 'Connect Your Chat', '<p>Open your new bot in Telegram, send it <code>/start</code>, then press <b>Find My Chat</b>.</p>' +
                '<div class="ix-row"><button type="button" class="ix-btn" id="nt-find"' + (n.hasToken ? '' : ' disabled') + '>Find My Chat</button></div>' +
                '<div class="ix-status">' + (n.chat ? '<span class="ix-ok">✓</span><span><b>Connected to</b> ' + esc(n.chatName || n.chat) + (n.chatName ? ' <small>(' + esc(n.chat) + ')</small>' : '') + '</span>' : '<span>!</span><span>No chat yet. Send <code>/start</code> to your bot first.</span>') + '</div>' +
                (chats && chats.length > 1 ? '<div class="ix-row">' + chats.map(function (c) { return '<button type="button" class="ix-btn" data-chat="' + esc(c.id) + '" data-name="' + esc(c.name) + '">Use ' + esc(c.name || c.id) + '</button>'; }).join('') + '</div>' : '')) +
              stp(4, d4, cur === 4, 'Send a Test', '<p>You should get a message from your bot within a second. Then open the <b>Messages</b> tab to choose what you want to hear about.</p>' +
                '<div class="ix-row"><button type="button" class="ix-btn" id="nt-test"' + (ready ? '' : ' disabled') + '>Send Test</button></div>') +
              '</ol>' +
              ecCard('', ICON.clock, 'Keep It on Schedule', 'Messages and reminders are sent by a scheduled job (a cron job). Without one they only go out while one of your pages is open.',
                '<p>In your hosting panel (cPanel › Cron Jobs), add this to run <b>every 10 minutes</b>:</p>' +
                '<div class="ix-code"><code id="nt-cmd">' + esc(n.cronCmd) + '</code><button type="button" class="ix-btn" data-copy="nt-cmd">' + svg(ICON.copy) + 'Copy</button></div>' +
                '<p>If your host only accepts a web address, use this one instead and keep it private:</p>' +
                '<div class="ix-code"><code id="nt-url">curl -s "' + esc(n.cronUrl) + '"</code><button type="button" class="ix-btn" data-copy="nt-url">' + svg(ICON.copy) + 'Copy</button></div>');
          })()) +

        acc('bk', 'Backups', n.bkEvery ? bkTxt + (n.bkLast ? ' · last ' + esc(ago(n.bkLast)) : '') : 'Have Telegram send you a full backup file regularly. Off for now.',
          tabHead(ICON.box, 'Backups', 'Have Telegram send you a full backup file regularly. Restore it any time with Backup & Restore › Import.') +
          ecCard('', ICON.clock, 'How Often', 'The whole site as one file, sent at your daily message hour.',
            seg('nbk', [[0, 'Off'], [1, 'Daily'], [3, 'Every 3 Days'], [7, 'Weekly'], [14, 'Every 2 Weeks'], [30, 'Monthly']], n.bkEvery || 0) +
            '<p class="ix-note">Last backup sent: ' + (n.bkLast ? when(n.bkLast) : 'none yet') + '.' + (n.bkError ? ' <span class="ix-err">Last problem: ' + esc(n.bkError) + '</span>' : '') + '</p>') +
          ecCard(n.encReady ? 'good' : '', ICON.lock, n.encReady ? 'Backup Files Are Encrypted' : 'Backup Files Are Not Encrypted',
            n.encReady ? 'Files open with your ' + (n.encMode === 'login' ? 'webwebsite password' : 'encryption passphrase') + '. Anyone who gets into your Telegram still cannot read them.' :
            'Anyone who gets into your Telegram could open them. <a href="#" id="nt-encgo">Set an encryption passphrase in Settings › Security</a>.', '') +
          ecCard('', ICON.send, 'Send One Now', 'Sends a backup file to your chat right away, without waiting for the schedule.', '<div class="ix-row"><button type="button" class="ix-btn pri" id="nt-bknow"' + (ready ? '' : ' disabled') + '>Send Backup Now</button></div>')) +

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
            '<p class="ix-note">Last checked: ' + (n.lastRun ? when(n.lastRun) : 'never') + '. Last message: ' + (n.lastSent ? when(n.lastSent) : 'none yet') + '.' + (n.lastError ? ' <span class="ix-err">Last problem: ' + esc(n.lastError) + '</span>' : '') + '</p>')) +

        acc('two', 'Instant Replies', (n.hook ? 'On: the bot answers your commands within a second.' : 'Off: the bot answers within a few minutes.') + ' It understands 7 commands.',
          tabHead(ICON.pulse, 'Instant Replies', 'Tap Done under reminders, or send commands. Only your own chat is answered.') +
          ecCard(n.hook ? 'good' : '', ICON.pulse, 'Instant Replies', n.hook ? 'Telegram sends each message straight to your site, so the bot answers at once.' : 'The site checks for messages every few minutes and whenever a page is open.',
            '<label class="ix-tg"><span>Instant Replies<small>' + (n.hook ? 'On.' + (n.hookInfo && n.hookInfo.error ? ' <span class="ix-err">Telegram reports: ' + esc(n.hookInfo.error) + '</span>' : '') : 'Off.') + '</small></span><input type="checkbox" id="nt-hook"' + (n.hook ? ' checked' : '') + (n.hasToken ? '' : ' disabled') + '></label>') +
          '<div class="ix-duo"><div class="ix-mini"><b>When It Is On</b><p>Answers at once, and Approve in Telegram logs you in within a second. Needs https; if replies stop behind Cloudflare, add a WAF rule that skips <code>/web/core-data/telegram.php</code>.</p></div>' +
            '<div class="ix-mini"><b>When It Is Off</b><p>Everything still works, a few minutes slower.</p></div></div>' +
          ecCard('', ICON.cmd, 'Commands', 'Send any of these to your bot.',
            '<div class="ix-cmds"><code>/today</code><span>Overdue and today, with Done buttons</span><code>/week</code><span>The next 7 days</span><code>/next</code><span>The next 10 tasks</span>' +
            '<code>/add Netflix 649 monthly 5 Nov</code><span>A new task</span><code>/done Netflix</code><span>Mark one done</span>' +
            '<code>/backup</code><span>A backup file now</span><code>/status</code><span>A quick health check</span></div>'));
      p.querySelectorAll('[data-go]').forEach(function (x) { x.onclick = function () { var d = p.querySelector('details[data-tg="' + x.dataset.go + '"]'); d.open = true; d.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }; });
      var eg = p.querySelector('#nt-encgo'); if (eg) eg.onclick = function (e) { e.preventDefault(); go('security'); };
      var call = function (action, body, btn) {
        if (btn) btn.disabled = true;
        return api(action, body || {}).then(function (j) {
          if (btn) btn.disabled = false;
          if (!j || !j.ok) { draw(j && j.cronCmd ? j : n, chats, (j && j.error) || 'Something went wrong.', true); return null; }
          return j;
        });
      };
      var tok = p.querySelector('#nt-tok');
      p.querySelector('#nt-st').onclick = function () {
        if (!tok.value.trim()) { tok.focus(); return; }
        call('notify_save', { token: tok.value.trim() }, this).then(function (j) { if (j) draw(j, null, 'Token saved. Now send /start to your bot and click Find My Chat.'); });
      };
      var rm = p.querySelector('#nt-rm');
      if (rm) rm.onclick = function () {
        if (rm.dataset.armed !== '1') { rm.dataset.armed = '1'; rm.textContent = 'Click Again to Remove'; return; }
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
      p.querySelector('#nt-test').onclick = function () { call('notify_test', {}, this).then(function (j) { if (j) draw(j, null, 'Test message sent. Check Telegram.'); }); };
      p.querySelector('#nt-now').onclick = function () { call('notify_run', {}, this).then(function (j) { if (j) draw(j, null, j.note || 'Done.', !j.ok); }); };
      p.querySelectorAll('[data-k]').forEach(function (c) { c.onchange = function () {
        var o = {}; o[c.dataset.k] = c.checked;
        call('notify_save', o).then(function (j) { if (j) { n = j; draw(j, null); toast(c.dataset.k === 'on' ? (j.on ? 'Reminders on.' : 'Reminders off.') : 'Saved.'); } });
      }; });
      p.querySelector('#nt-hook').onchange = function (e) {
        var c = e.target; c.disabled = true;
        api('tg_hook', { on: c.checked }).then(function (j) { c.disabled = false; if (!j.ok) { c.checked = !c.checked; toast(j.error || 'Telegram refused.'); return; } draw(j, null, j.hook ? 'Instant replies are on. Send /help to your bot to try it.' : 'Instant replies are off; the site checks every few minutes.'); });
      };
      bindSeg(p, function (k, v) {
        if (k !== 'nbk') return;
        call('notify_save', { bkEvery: +v }).then(function (j) { if (j) { n = j; draw(j, null); toast(j.bkEvery ? 'Backups will be sent ' + (BK_TXT[j.bkEvery] || 'regularly').toLowerCase() + '.' : 'Backups to Telegram are off.'); } });
      });
      p.querySelector('#nt-bknow').onclick = function () {
        var b = this; b.textContent = 'Sending…';
        call('notify_backup', {}, b).then(function (j) { if (j) { S.backupLast = j.backupLast || S.backupLast; remember(S); redraw(); draw(j, null, 'Backup sent. Check Telegram.'); } else b.textContent = 'Send Backup Now'; });
      };
      p.querySelector('#nt-hour').onchange = function (e) { call('notify_save', { hour: +e.target.value }).then(function (j) { if (j) { n = j; draw(j, null); toast('Daily messages at ' + hourLabel(j.hour) + '.'); } }); };
      p.querySelectorAll('[data-copy]').forEach(function (b) { b.onclick = function () {
        var t = p.querySelector('#' + b.dataset.copy).textContent;
        (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast('Copied.'); }, function () { toast('Select the text and copy it.'); });
      }; });
    }
    api('notify').then(function (n) { if (!n || !n.ok) { p.innerHTML = '<p class="ix-err">' + esc((n && n.error) || 'Could not load.') + '</p>'; return; } draw(n); });
  }
  /* Health > Server Check: why icons or titles can't be fetched, folder permissions, then PHP, limits and extensions. */
  function pCheck(p) {
    p.innerHTML = '<p>What your hosting allows: outside connections, folder writes and PHP features.</p><div class="ix-row"><span class="ix-spin"></span><span>Running…</span></div>';
    Promise.all([api('diag'), api('health')]).then(function (r) {
      var j = r[0], h = r[1] || {};
      if (!j.ok) { p.innerHTML = '<p class="ix-err">' + esc(j.error || 'Could not run the check.') + '</p>'; return; }
      var bad = j.checks.filter(function (c) { return !c.ok; }).length;
      p.innerHTML = '<div class="ix-hcards">' +
          hCard('Checks', bad ? bad + ' to Look At' : 'All Passed', bad ? 'of ' + j.checks.length + ' checks, marked ! below' : j.checks.length + ' checks: your hosting allows everything', bad ? 'warn' : 'good') +
          (h.ok ? hCard('PHP', esc(h.php), esc(h.server), '') + hCard('Memory per Request', String(h.limits.memory) === '-1' ? 'No Limit' : esc(h.limits.memory), 'Time limit ' + (h.limits.time ? h.limits.time + ' s' : 'none'), '') +
            hCard('Largest Upload', esc(h.limits.upload), esc(h.limits.post) + ' per request', '') : '') +
        '</div>' +
        '<h3>Connections and Folders</h3>' + j.checks.map(function (c) {
          return '<div class="ix-status"><span class="' + (c.ok ? 'ix-ok' : '') + '">' + (c.ok ? '✓' : '!') + '</span><span><b>' + esc(c.name) + '.</b> ' + esc(c.note) + '</span></div>'; }).join('') +
        (h.ok ? '<h3>PHP Extensions</h3><div class="ix-exts">' + Object.keys(h.ext).map(function (e) { return '<span class="' + (h.ext[e] ? 'on' : 'off') + '">' + (h.ext[e] ? '✓ ' : '✗ ') + esc(e) + '</span>'; }).join('') + '</div>' +
          '<p class="ix-note">Time zone ' + esc(String(h.tz || '').replace(/_/g, ' ')) + '.</p>' : '') +
        '<div class="ix-row" style="margin-top:12px"><button type="button" class="ix-btn" id="ix-rc2">Run Again</button></div>';
      p.querySelector('#ix-rc2').onclick = function () { pCheck(p); };
    });
  }
  /* ---------- Overview: where things stand ---------- */
  var hourLbl = function (h) { return (h % 12 || 12) + ':00 ' + (h < 12 ? 'AM' : 'PM'); };
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
    var al = (OV.alerts || []).length;
    pill('overview', al ? al + ' to see' : '', al ? 'warn' : '');
    pill('look', S.theme === 'auto' ? 'Auto' : S.theme === 'light' ? 'Light' : 'Dark', '');
    pill('health', OV.https ? 'OK' : 'No HTTPS', OV.https ? 'good' : 'warn');
    pill('changelog', 'v' + OV.version, '');
  }
  /* ---------- Guided Setup: the protection steps one after another, using the same flows as Security and Backup ---------- */
  var WZ = { open: '', pp: '', site: '', rec: '', skipped: {} };   // what you typed stays here only while Settings is open, never saved
  function setupSteps(j) {
    var on = function (k) { var x = j.protect.items.filter(function (i) { return i.key === k; })[0]; return !!(x && x.on); };
    return [
      { key: 'pw', title: 'Website Password', done: true, icon: ICON.key, text: 'The one password for every page of your site.' },
      { key: 'enc', title: 'Encryption Passphrase', done: on('enc'), icon: ICON.lock, text: 'Locks your private tabs and your backup files.' },
      { key: 'recovery', title: 'Recovery Key', done: on('recovery'), icon: ICON.shield, text: 'A spare way in, if you ever forget the passphrase.' },
      { key: 'twostep', title: 'Two-Step Login', done: on('twostep'), icon: ICON.device, text: 'A 6-digit code from your phone on top of the password.' },
      { key: 'backup', title: 'First Backup', done: !!(j.backup && j.backup.last), icon: ICON.box, text: 'One file with everything, kept somewhere safe.' }
    ];
  }
  function pSetup(p) {
    p.innerHTML = spinRow('Checking your setup…');
    var steps = [], draw, progress;
    /* only the ring and the step badges change: a step you are in the middle of (recovery codes on screen) is never redrawn */
    progress = function () {
      return api('overview').then(function (j) {
        if (!j.ok) return; OV = j; decorateNav(); steps = setupSteps(j);
        var done = steps.filter(function (s) { return s.done; }).length, ring = p.querySelector('.ix-ring');
        if (ring) { ring.style.setProperty('--p', Math.round(done / steps.length * 100)); ring.classList.toggle('ok', done === steps.length); ring.querySelector('b').textContent = done; }
        steps.forEach(function (s) { var n = p.querySelector('[data-stepn="' + s.key + '"]'); if (n) { n.classList.toggle('done', s.done); n.textContent = s.done ? '✓' : steps.indexOf(s) + 1; } });
      });
    };
    secRefresh = function () { progress(); };
    var fd = function (id, label, type, auto) { return ecField(id, label, type, auto); };
    var errOf = function (x) { return x && x.user ? x.message : "Can't reach the server. Nothing was changed."; };
    draw = function () {
      api('overview').then(function (j) {
        if (!j.ok) { p.innerHTML = '<p class="ix-err">' + esc(j.error || 'Could not load.') + '</p>'; return; }
        OV = j; decorateNav(); steps = setupSteps(j);
        var done = steps.filter(function (s) { return s.done; }).length;
        var next = steps.filter(function (s) { return !s.done && !WZ.skipped[s.key]; })[0];
        var act = WZ.open && steps.some(function (s) { return s.key === WZ.open; }) ? WZ.open : (next ? next.key : '');
        var encOn = steps[1].done;
        var bodies = {
          pw: '<p class="ix-note" style="margin-top:0">Your website password is set. You can change it any time in Security.</p><div class="ix-row"><button type="button" class="ix-btn" data-go2="security/password">Open Password</button></div>',
          enc: steps[1].done ? '<div class="ix-status"><span class="ix-ok">✓</span><span>Your passphrase is set. Private tabs and backup files can be locked with it.</span></div>' :
            '<form id="ix-wze"><div class="ix-fgrid">' + fd('ix-wp1', 'New Passphrase', 'password', 'new-password') + fd('ix-wp2', 'Type It Again', 'password', 'new-password') + '</div>' +
            fd('ix-wpw', 'Website Password', 'password', 'current-password') +
            '<label class="ix-chk"><input type="checkbox" id="ix-wack"> I understand the passphrase can\'t be recovered, only replaced with a recovery key.</label>' +
            '<p class="ix-err" id="ix-wzerr"></p><div class="ix-row"><button class="ix-btn pri" id="ix-wzgo">Set Passphrase</button></div></form>',
          recovery: WZ.rec ? '<div class="ix-status"><span class="ix-ok">✓</span><span><b>Your recovery key. It is shown only now.</b></span></div><div class="ix-codes"><span class="ix-mono" id="ix-wzrk">' + esc(WZ.rec) + '</span></div>' +
              '<div class="ix-row"><button type="button" class="ix-btn" id="ix-wzcp">' + svg(ICON.copy) + 'Copy</button><button type="button" class="ix-btn pri" id="ix-wzsaved">I Saved It, Continue</button></div>' +
              '<p class="ix-note">Save it somewhere safe, apart from this server. A key made earlier no longer works.</p>' :
            steps[2].done ? '<div class="ix-status"><span class="ix-ok">✓</span><span>A recovery key exists. Make a new one any time in Security › Encryption.</span></div>' :
            !encOn ? '<p class="ix-note" style="margin-top:0">Set the passphrase first (the step above), then the recovery key is one click.</p><div class="ix-row"><button type="button" class="ix-btn" data-open="enc">Go to the Passphrase</button></div>' :
            '<form id="ix-wzr">' + (WZ.pp ? '' : fd('ix-wrp', 'Your Passphrase', 'password', 'off')) + (WZ.site ? '' : fd('ix-wrw', 'Website Password', 'password', 'current-password')) +
              '<p class="ix-err" id="ix-wzerr"></p><div class="ix-row"><button class="ix-btn pri" id="ix-wzgo">Make Recovery Key</button></div></form>',
          twostep: steps[3].done ? '<div class="ix-status"><span class="ix-ok">✓</span><span>Two-step login is on. Manage it in Security › Two-Step Login.</span></div>' : '<div id="ix-wz2"></div>',
          backup: steps[4].done ? '<div class="ix-status"><span class="ix-ok">✓</span><span>You have made a full backup. Make another any time in Backup & Restore.</span></div>' :
            '<p class="ix-note" style="margin-top:0">Downloads one file with all your pages and settings' + (encOn ? ', with your encrypted tabs still locked' : '') + '. Keep it somewhere safe, apart from this server.</p>' +
            '<p class="ix-err" id="ix-wzerr"></p><div class="ix-row"><button type="button" class="ix-btn pri" id="ix-wzbk">' + svg(ICON.down) + 'Download Full Backup</button></div>'
        };
        p.innerHTML = tabHead(ICON.shield, 'Guided Setup', 'Protect your site in a few short steps. Each one uses the same screen you would find in Security, so nothing here is different, just in order.') +
          '<div class="ix-hero"><div class="ix-ring ' + (done === steps.length ? 'ok' : '') + '" style="--p:' + Math.round(done / steps.length * 100) + '"><b>' + done + '</b><small>of ' + steps.length + '</small></div>' +
            '<div class="ix-hero-t"><div class="ix-hero-h">' + (done === steps.length ? 'Your Site Is Set Up' : next ? 'Next: ' + next.title : 'Skipped Steps Are Waiting') + '</div><p>' +
            (done === steps.length ? 'Every recommended protection is on. Telegram alerts are optional, and below if you want them.' : 'You can skip a step and come back to it. Nothing is changed until you press the step\'s own button.') + '</p></div></div>' +
          '<div class="ix-steps">' + steps.map(function (s, i) {
            var open = s.key === act, skipped = !s.done && WZ.skipped[s.key];
            return '<section class="ix-ec ix-step' + (s.done ? ' done' : '') + (open ? ' open' : '') + '"><button type="button" class="ix-ec-h ix-steph" data-open="' + s.key + '" aria-expanded="' + open + '">' +
              '<span class="ix-stepn' + (s.done ? ' done' : '') + '" data-stepn="' + s.key + '">' + (s.done ? '✓' : i + 1) + '</span><div><div class="ix-ec-t">' + esc(s.title) + '</div><div class="ix-ec-d">' + esc(s.text) + '</div></div>' +
              '<span class="ix-pill ' + (s.done ? 'good' : skipped ? '' : open ? 'warn' : '') + '">' + (s.done ? 'Done' : skipped ? 'Skipped' : open ? 'Now' : 'To Do') + '</span></button>' +
              (open ? '<div class="ix-ec-b">' + bodies[s.key] + (s.done || s.key === 'pw' ? '' : '<div class="ix-row" style="margin-top:14px"><button type="button" class="ix-btn" data-skip="' + s.key + '">Skip for Now</button></div>') + '</div>' : '') + '</section>'; }).join('') + '</div>' +
          (done === steps.length ? '<div class="ix-row" style="margin-top:6px"><button type="button" class="ix-btn pri" data-go2="overview">Back to Overview</button></div>' : '') +
          ecCard('', ICON.send, 'Optional: Telegram', 'Reminders, login alerts, instant approval of new logins, and automatic backups on your phone. It takes about two minutes.', '<div class="ix-row"><button type="button" class="ix-btn" data-go2="telegram/setup">Open Telegram Setup</button></div>');
        // wiring
        p.querySelectorAll('[data-go2]').forEach(function (b) { b.onclick = function () { go(b.dataset.go2); }; });
        p.querySelectorAll('[data-open]').forEach(function (b) { b.onclick = function () { WZ.open = WZ.open === b.dataset.open && b.classList.contains('ix-steph') ? '' : b.dataset.open; draw(); }; });
        p.querySelectorAll('[data-skip]').forEach(function (b) { b.onclick = function () { WZ.skipped[b.dataset.skip] = true; WZ.open = ''; draw(); }; });
        var er = function () { return p.querySelector('#ix-wzerr'); }, v = function (id) { var x = p.querySelector(id); return x ? x.value : ''; };
        var f1 = p.querySelector('#ix-wze');
        if (f1) f1.onsubmit = function (e) {
          e.preventDefault(); var n1 = v('#ix-wp1'), site = v('#ix-wpw');
          if (n1.length < 8) { er().textContent = 'Use at least 8 characters for the passphrase.'; return; }
          if (n1 !== v('#ix-wp2')) { er().textContent = 'The two passphrases are not the same.'; return; }
          if (!site) { er().textContent = 'Type your website password.'; return; }
          if (!p.querySelector('#ix-wack').checked) { er().textContent = 'Please confirm you understand the passphrase can\'t be recovered.'; return; }
          var b = p.querySelector('#ix-wzgo'); b.disabled = true; er().textContent = 'Setting…';
          PP.set({ pp: n1, site: site, old: '' }).then(function () { WZ.pp = n1; WZ.site = site; WZ.open = 'recovery'; toast('Passphrase set.'); draw(); })
            .catch(function (x) { er().textContent = x && x.needOld ? 'Some tabs are already locked with an earlier passphrase. Set it in Security › Encryption, where you can type the earlier one.' : errOf(x); b.disabled = false; });
        };
        var f2 = p.querySelector('#ix-wzr');
        if (f2) f2.onsubmit = function (e) {
          e.preventDefault(); var pp = WZ.pp || v('#ix-wrp'), site = WZ.site || v('#ix-wrw');
          if (!pp || !site) { er().textContent = 'Type the passphrase and your website password.'; return; }
          var b = p.querySelector('#ix-wzgo'); b.disabled = true; er().textContent = 'Making it…';
          PP.makeRecovery({ pp: pp, site: site }).then(function (code) { WZ.rec = code; WZ.open = 'recovery'; draw(); })
            .catch(function (x) { er().textContent = errOf(x); b.disabled = false; });
        };
        var cp = p.querySelector('#ix-wzcp'); if (cp) cp.onclick = function () { navigator.clipboard && navigator.clipboard.writeText(WZ.rec).then(function () { toast('Copied.'); }); };
        var sv = p.querySelector('#ix-wzsaved'); if (sv) sv.onclick = function () { WZ.rec = ''; WZ.open = 'twostep'; draw(); };
        var tb = p.querySelector('#ix-wz2'); if (tb) twoStep(tb);
        var bk = p.querySelector('#ix-wzbk');
        if (bk) bk.onclick = function () {
          bk.disabled = true; er().textContent = 'Making your backup…';
          fetch(CORE + 'api.php?action=backup', { credentials: 'same-origin', headers: { 'X-Hub-CSRF': S.csrf } }).then(function (r) {
            if (!r.ok) return r.json().then(function (j) { throw new Error(j.error || 'Backup failed.'); });
            var name = (/filename="([^"]+)"/.exec(r.headers.get('Content-Disposition') || '') || [])[1] || 'backup.json';
            return r.blob().then(function (blob) {
              var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
              S.backupLast = Date.now() / 1000; remember(S); toast('Backup downloaded.'); draw();
            });
          }).catch(function (e) { er().textContent = e.message || 'Backup failed.'; bk.disabled = false; });
        };
      }, function () { p.innerHTML = '<p class="ix-err">Can\'t reach the server.</p>'; });
    };
    draw();
  }

  function pOverview(p) {
    p.innerHTML = '<p class="ix-ld">Checking how things stand…</p>';
    api('overview').then(function (j) {
      if (!j.ok) { p.innerHTML = '<p class="ix-err">' + esc(j.error || 'Could not load the overview.') + '</p>'; return; }
      OV = j; decorateNav();
      var pr = j.protect, tg = j.telegram, bk = j.backup, up = j.update, fl = j.files, now = Date.now() / 1000;
      var run = tg.cronLast && now - tg.cronLast < 1800;
      var card = function (go, title, pill, cls, l1, l2, action) {
        return '<div class="ix-oc"><div class="ix-oh"><b>' + title + '</b><span class="ix-pill ' + cls + '">' + esc(pill) + '</span></div><div class="ix-ol">' + l1 + '</div><div class="ix-os">' + l2 + '</div>' +
          '<button type="button" class="ix-btn" data-go="' + go + '">' + action + '</button></div>'; };
      var onNames = [['Password']].concat(pr.items.filter(function (x) { return x.on; }).map(function (x) { return [x.title]; })).map(function (x) { return x[0].toLowerCase(); });
      var n = fl ? fl.extra + fl.changed : 0;
      var cards = [
        card('general', 'Site', 'Set up', 'good', '<b>' + esc(j.siteName) + '</b>' + (j.logo ? ', with your logo.' : ', no logo yet.'), 'Name, logo, time zone and the pages in your bar.', 'Open General'),
        card('security', 'Security', pr.on + ' of ' + pr.total + ' on', pr.on >= pr.total ? 'good' : 'warn', 'On: ' + esc(onNames.join(', ')) + '.', pr.next ? '<b>Next best step:</b> ' + esc(pr.next.next) : 'Everything we recommend is on.', 'Review Security'),
        !tg.ready
          ? card('telegram', 'Telegram', 'Not Set Up', '', 'Get reminders, login alerts and backups on your phone.', 'It takes about two minutes: make a bot, send it one message, done.', 'Set Up Telegram')
          : card('telegram', 'Telegram', run ? 'Running' : 'Needs a Look', run ? 'good' : 'warn', run ? 'The schedule last ran ' + esc(ago(tg.cronLast)) + '.' : (tg.cronLast ? 'The schedule stopped ' + esc(ago(tg.cronLast)) + '.' : 'The schedule has never run.'),
              (tg.on ? 'Daily message at ' + hourLbl(tg.hour) + '. ' : 'Daily message is off. ') + (tg.lastSent ? 'Last message ' + esc(ago(tg.lastSent)) + '.' : 'Nothing sent yet.'), 'Open Telegram'),
        card('backup', 'Backup & Restore', bk.last ? ago(bk.last) : 'No Backup Yet', (bk.every > 0 && (!bk.last || (now - bk.last) / 86400 >= bk.every)) || !bk.last ? 'warn' : 'good',
              bk.tg ? 'A backup goes to Telegram ' + ({ 1: 'every day', 3: 'every 3 days', 7: 'every week', 14: 'every 2 weeks', 30: 'every month' }[bk.tg] || 'regularly') + (bk.enc ? ', encrypted.' : ', not encrypted.') : 'Download one file that restores everything.', 'A backup holds your pages, settings, Telegram and domain watch.', 'Back Up Now'),
        card('updates', 'Updates', up.staged ? 'Update Ready' : up.newer ? 'New Version' : n ? n + ' to check' : 'Up to Date', up.staged || up.newer || n ? 'warn' : 'good',
              up.staged ? 'Version <b>' + esc(up.staged.version) + '</b> is checked and waiting for you.' : up.newer ? 'Version <b>' + esc(up.newer) + '</b> is available on GitHub. You have <b>' + esc(j.version) + '</b>.' : 'You have version <b>' + esc(j.version) + '</b>.',
              !up.hasManifest ? 'Update once with the File Manager, then the site can update itself.' : fl ? (n ? n + ' file' + (n > 1 ? 's' : '') + ' to look at in Files.' : 'Every file on your server belongs to this version.') : 'Upload a new zip here. No File Manager, nothing to delete by hand.', up.staged ? 'Review the Update' : 'Update the Site'),
        card('health', 'Health', 'PHP ' + j.php.split('.').slice(0, 2).join('.'), '', (j.https ? 'HTTPS is on.' : '<b>HTTPS is off.</b>') + ' Version ' + esc(j.version) + '.', 'Disk use, speed, errors, your domains and what your hosting allows.', 'Open Health')
      ];
      var al = (j.alerts || []).slice(0, 4).map(function (a) {
        return '<div class="ix-al ' + a.level + '"><span class="ix-ali">' + (a.level === 'info' ? 'i' : '!') + '</span><span>' + esc(a.text) + '</span><button type="button" class="ix-btn" data-go="' + a.go + '">Open</button></div>'; }).join('');
      var stp = setupSteps(j), stDone = stp.filter(function (x) { return x.done; }).length;
      var chip = function (id, label, cls) { return '<button type="button" class="ix-jchip" data-go="' + id + '"><i class="ix-dot ' + (cls || '') + '"></i>' + label + '</button>'; };
      var chips = '<div class="ix-jchips" role="navigation" aria-label="Jump to">' +
        chip('security', 'Security', pr.on >= pr.total ? 'good' : 'warn') + chip('telegram', 'Telegram', tg.ready ? (run ? 'good' : 'warn') : '') +
        chip('backup', 'Backup', bk.last ? 'good' : 'warn') + chip('look', 'Appearance', '') + chip('updates', 'Updates', up.staged || up.newer || n ? 'warn' : 'good') +
        chip('health', 'Health', j.https ? 'good' : 'warn') + chip('changelog', 'Changelog', '') + '</div>';
      var banner = stDone < stp.length ? '<div class="ix-hero ix-setupb"><div class="ix-ring" style="--p:' + Math.round(stDone / stp.length * 100) + '"><b>' + stDone + '</b><small>of ' + stp.length + '</small></div>' +
        '<div class="ix-hero-t"><div class="ix-hero-h">Protect Your Site Step by Step</div><p>' + stDone + ' of ' + stp.length + ' steps are done. Next: <b>' + esc(stp.filter(function (x) { return !x.done; })[0].title) + '</b>.</p>' +
        '<div class="ix-row" style="margin-top:12px"><button type="button" class="ix-btn pri" data-go="setup">' + (stDone > 1 ? 'Continue Setup' : 'Start Guided Setup') + '</button></div></div></div>' : '';
      p.innerHTML = chips + banner + (al ? '<div class="ix-als">' + (j.alerts.length > 1 ? '<b>' + j.alerts.length + ' things to look at</b>' : '<b>1 thing to look at</b>') + al + '</div>' : '<div class="ix-als ok"><span class="ix-ok">✓</span><b>Nothing needs your attention.</b></div>') +
        '<div class="ix-ocs">' + cards.join('') + '</div>';
      p.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { go(b.dataset.go); }; });
      whatsNew(p, j.version);
    }, function () { p.innerHTML = '<p class="ix-err">Can\'t reach the server.</p>'; });
  }
  /* After an update: once, on the Overview, what the new version changed (from the changelog), until you press Got It. */
  function whatsNew(p, ver) {
    if (lsGet('ix-seen-ver') === ver) return;
    clLoad().then(function (cl) {
      var e = cl.entries[0];
      if (!e || e.ver !== ver) { lsSet('ix-seen-ver', ver); return; }
      var box = document.createElement('section'); box.className = 'ix-ec ix-new';
      box.innerHTML = '<div class="ix-ec-h"><span class="ix-ec-i">' + svg(ICON.sparkle) + '</span><div><div class="ix-ec-t">What\'s New in Version ' + esc(ver) + '</div><div class="ix-ec-d">Your site was updated. Here is what changed.</div></div></div>' +
        '<div class="ix-ec-b"><div class="ix-md ix-newbody">' + mdBlocks(e.body) + '</div><div class="ix-row" style="margin-top:14px"><button type="button" class="ix-btn pri" id="ix-nwok">Got It</button><button type="button" class="ix-btn" id="ix-nwall">Open the Changelog</button></div></div>';
      p.insertBefore(box, p.firstChild);
      box.querySelector('#ix-nwok').onclick = function () { lsSet('ix-seen-ver', ver); box.remove(); };
      box.querySelector('#ix-nwall').onclick = function () { lsSet('ix-seen-ver', ver); go('changelog'); };
    }, function () {});
  }

  /* ---------- Changelog: web/docs/CHANGELOG.md, read through the API (the docs folder is closed to browsers) ---------- */
  var CL = null, CLWANT = '';             // the parsed file (kept while Settings is open), and a version another tab asked to see
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
  function pChangelog(p) {
    p.innerHTML = spinRow('Reading the changelog…');
    clLoad().then(function (cl) {
      var cur = cl.version, shown = cl.entries;
      p.innerHTML = '<div class="ix-hero"><span class="ix-hero-i good">' + svg(ICON.log) + '</span><div class="ix-hero-t"><div class="ix-hero-h">You Have Version ' + esc(cur) + '</div>' +
          '<p>' + cl.entries.length + ' versions are written down here, newest first. Open one to see what changed.</p></div></div>' +
        '<div class="ix-cl-bar"><div class="ix-cl-search">' + svg(ICON.search) + '<input type="search" id="ix-clq" placeholder="Search the Changelog" aria-label="Search the Changelog" autocomplete="off" spellcheck="false"></div>' +
          '<button type="button" class="ix-btn" id="ix-clall">Expand All</button><button type="button" class="ix-btn" id="ix-clnone">Collapse All</button></div>' +
        '<div class="ix-pcount" id="ix-clcount" aria-live="polite"></div>' +
        '<div id="ix-cll">' + shown.map(function (e, i) {
          return '<details class="ix-cl" data-i="' + i + '"' + (i === 0 ? ' open' : '') + '><summary><span class="ix-cl-v">' + esc(e.ver) + '</span>' +
            (e.ver === cur ? '<span class="ix-pill good">Installed</span>' : '') + (e.date ? '<span class="ix-cl-date">' + esc(e.date) + '</span>' : '') +
            '<span class="ix-cl-d">' + mdInline(e.summary || e.label || '') + '</span></summary><div class="ix-cl-b ix-md"></div></details>'; }).join('') + '</div>' +
        '<p class="ix-note ix-pnone" id="ix-clnone2" hidden>Nothing in the changelog matches that. Try a shorter word.</p>';
      var rows = [].slice.call(p.querySelectorAll('details.ix-cl'));
      var fill = function (d) { var b = d.querySelector('.ix-cl-b'); if (!b.dataset.done) { b.innerHTML = mdBlocks(shown[+d.dataset.i].body); b.dataset.done = '1'; } };
      rows.forEach(function (d) { d.addEventListener('toggle', function () { if (d.open) fill(d); }); if (d.open) fill(d); });
      var q = p.querySelector('#ix-clq');
      var filter = function () {
        var t = q.value.trim().toLowerCase(), n = 0;
        rows.forEach(function (d) {
          var e = shown[+d.dataset.i], hit = !t || (e.title + ' ' + e.summary + ' ' + e.body).toLowerCase().indexOf(t) >= 0;
          d.hidden = !hit; if (hit) n++;
          if (t && hit && n <= 6) { d.open = true; fill(d); }
        });
        p.querySelector('#ix-clcount').textContent = t ? n + ' of ' + rows.length + ' versions match' : '';
        p.querySelector('#ix-clnone2').hidden = n > 0;
      };
      q.oninput = filter;
      p.querySelector('#ix-clall').onclick = function () { rows.forEach(function (d) { if (!d.hidden) d.open = true; }); };
      p.querySelector('#ix-clnone').onclick = function () { rows.forEach(function (d) { d.open = false; }); };
      if (CLWANT) {                                                   // sent here from the Version Map
        var want = CLWANT; CLWANT = '';
        var hit = rows.filter(function (d) { return shown[+d.dataset.i].ver === want; })[0] || rows.filter(function (d) { return shown[+d.dataset.i].ver.indexOf(want) === 0; })[0];
        if (hit) { hit.open = true; fill(hit); setTimeout(function () { hit.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60); }
      }
    }).catch(clFail(p));
  }
  function pChMap(p) {
    p.innerHTML = spinRow('Reading the changelog…');
    clLoad().then(function (cl) {
      var open = {}; cl.entries.forEach(function (e) { open[e.ver] = 1; });
      p.innerHTML = tabHead(ICON.clock, 'Version Map', 'Every version in one line. Click a version to read the full story.') +
        '<div class="ix-tblw ix-vmap"><table><thead><tr><th>Version</th><th>What It Brought</th></tr></thead><tbody>' +
        cl.mapRows.map(function (r) {
          var first = r[0].split(/\s/)[0], link = open[first] || cl.entries.some(function (e) { return e.ver.indexOf(first) === 0; });
          return '<tr' + (r[0] === cl.version ? ' class="cur"' : '') + '><td>' + (link ? '<button type="button" class="ix-linkb" data-v="' + esc(first) + '">' + esc(r[0]) + '</button>' : esc(r[0])) + (r[0] === cl.version ? ' <span class="ix-pill good">Installed</span>' : '') + '</td><td>' + mdInline(r[1]) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      p.querySelectorAll('[data-v]').forEach(function (b) { b.onclick = function () { CLWANT = b.dataset.v; subPane('changelog'); }; });
    }).catch(clFail(p));
  }
  function pChNotes(p) {
    p.innerHTML = spinRow('Reading the changelog…');
    clLoad().then(function (cl) {
      p.innerHTML = tabHead(ICON.info, 'Notes', 'How updating works, and a few things worth knowing.') +
        (cl.notes.length ? cl.notes.map(function (x) { return '<section class="ix-ec"><div class="ix-ec-h"><span class="ix-ec-i">' + svg(ICON.info) + '</span><div><div class="ix-ec-t">' + esc(x.title) + '</div></div></div><div class="ix-ec-b ix-md">' + mdBlocks(x.body) + '</div></section>'; }).join('')
          : '<div class="ix-empty"><b>No Notes</b></div>');
    }).catch(clFail(p));
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
      '<label class="ix-chk" style="margin-top:10px"><input type="checkbox" id="ix-gha"' + (g.auto ? ' checked' : '') + '> Check GitHub Once a Day</label>' +
      '<p class="ix-note">Off by default. While it is off, this site makes no request to GitHub unless you press Check Now. When it is on, the check runs with the schedule from Telegram Setup (the cron job). Nothing ever installs by itself.</p>';
    return '<section class="ix-card"><div class="ix-cardh"><h3>Update From GitHub</h3><span class="ix-mu">Installed: <b>' + esc(st.version) + '</b></span></div>' + h + '</section>';
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
    var stepsHtml = '<ol class="ix-steps">' + steps.map(function (t, i) { var n = i + 1; return '<li class="' + (n < at ? 'done' : n === at ? 'now' : '') + '"><span>' + (n < at ? '✓' : n) + '</span>' + t + '</li>'; }).join('') + '</ol>';
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
        '<p class="ix-note">Never touched: <b>site-data</b> (all your data), <b>web/core-data/media</b> (your pictures and logo), <b>web/core-data/config.php</b> and the Tools settings made from your settings.' + (chk && chk.noOldList ? ' This copy had no file list, so no old files can be removed this time.' : '') + '</p>' +
        '<div class="ix-apl"><label for="ix-upw">Website Password</label><div class="ix-row"><input type="password" id="ix-upw" autocomplete="current-password" placeholder="Needed to change the site\'s code" style="max-width:340px"><button type="button" class="ix-btn pri" id="ix-uap">Apply Update</button><button type="button" class="ix-btn" id="ix-ucn">Cancel</button></div></div>' +
        '<label class="ix-chk" style="margin-top:12px"><input type="checkbox" id="ix-uauto"' + (st.autoUndo ? ' checked' : '') + '> Go back by itself if the site stops answering after the update</label>' +
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
        ? '<p>Version <b>' + esc(prev.version) + '</b> was saved ' + esc(ago(prev.at)) + ' (' + size(prev.bytes) + '). Going back does not change your data.</p><div class="ix-apl"><label for="ix-bpw">Website Password</label><div class="ix-row"><input type="password" id="ix-bpw" autocomplete="current-password" style="max-width:340px"><button type="button" class="ix-btn" id="ix-ubk">Go Back to ' + esc(prev.version) + '</button></div></div><p class="ix-err" id="ix-be"></p>'
        : '<p>Nothing is saved yet. The first update saves the version you have now, so you can come back to it in one click.</p>') + '</section>';
    if (!staged) ghWire(p, st);
    var fail = function (m) { var e = p.querySelector('#ix-ue') || p.querySelector('#ix-upm'); if (e) { e.className = 'ix-err'; e.textContent = m; } };
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
    var bk = p.querySelector('#ix-ubk'); if (bk) bk.onclick = function () { if (bk.dataset.armed !== '1') { bk.dataset.armed = '1'; bk.textContent = 'Click Again to Go Back'; return; } run(bk, true, p.querySelector('#ix-bpw'), p.querySelector('#ix-be'), 'Going back…'); };
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
          '<div class="ix-apl"><label for="ix-fpw">Website Password</label><div class="ix-row"><input type="password" id="ix-fpw" autocomplete="current-password" style="max-width:340px"><button type="button" class="ix-btn danger" id="ix-fdel">Delete Selected</button></div></div><p class="ix-err" id="ix-fe"></p></section>'
          : '<div class="ix-status"><span class="ix-ok">✓</span><span><b>Nothing on your server is out of place.</b> Every file there belongs to version ' + esc(j.version) + '.</span></div>') +
        (j.changed.length ? '<section class="ix-card"><div class="ix-cardh"><h3>Changed by Hand</h3></div><p>These files differ from what version ' + esc(j.version) + ' ships. If you did not change them yourself, apply the same version again from the Update tab to put them back.</p><div class="ix-frl">' + j.changed.map(function (c) { return '<div class="ix-fr"><span class="ix-frp"><code>' + esc(c.path) + '</code></span><span class="ix-mu ix-frs">' + size(c.size) + '</span></div>'; }).join('') + '</div></section>' : '') +
        (j.missing.length ? '<section class="ix-card"><div class="ix-cardh"><h3>Missing</h3></div><p>These belong to this version but are not on your server. Apply the same version again from the Update tab to bring them back.</p><div class="ix-frl">' + j.missing.map(function (m) { return '<div class="ix-fr"><span class="ix-frp"><code>' + esc(m) + '</code></span></div>'; }).join('') + '</div></section>' : '') +
        (j.other && j.other.length ? '<p class="ix-note">Other items in your site folder (not part of this site, never listed for deletion or touched): ' + j.other.map(function (o) { return '<code>' + esc(o) + '</code>'; }).join(' ') + '</p>' : '') +
        '<p class="ix-note">Never listed or touched: <b>site-data</b>, <b>web/core-data/media</b> (your pictures and logo), <b>web/core-data/config.php</b>. Checked just now in ' + j.ms + ' ms. <a href="#" id="ix-fagain">Check Again</a></p>';
      var again = p.querySelector('#ix-fagain'); if (again) again.onclick = function (e) { e.preventDefault(); pFiles(p); };
      var all = p.querySelector('#ix-fall'); if (all) { all.onclick = function (e) { e.preventDefault(); p.querySelectorAll('.ix-fr input').forEach(function (c) { c.checked = true; }); }; p.querySelector('#ix-fnone').onclick = function (e) { e.preventDefault(); p.querySelectorAll('.ix-fr input').forEach(function (c) { c.checked = false; }); }; }
      var del = p.querySelector('#ix-fdel');
      if (del) del.onclick = function () {
        var er = p.querySelector('#ix-fe'), pick = [].map.call(p.querySelectorAll('.ix-fr input:checked'), function (c) { return ex[+c.dataset.i].path; });
        if (!pick.length) { er.className = 'ix-err'; er.textContent = 'Tick at least one file.'; return; }
        var pw = p.querySelector('#ix-fpw').value; if (!pw) { er.className = 'ix-err'; er.textContent = 'Type your website password.'; return; }
        if (del.dataset.armed !== '1') { del.dataset.armed = '1'; del.textContent = 'Click Again to Delete ' + pick.length; return; }
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
    var send = { siteName: draft.siteName, nav: draft.nav, theme: draft.theme, accent: draft.accent, accentPg: canonAccents(draft.accentPg), look: draft.look, homeBar: draft.homeBar, font: draft.font, fontCustom: draft.fontCustom, colors: draft.colors, tools: draft.tools, backupEvery: draft.backupEvery, pages: draft.pages || [], tz: draft.tz || 'Asia/Kolkata' };
    api('settings', { settings: send }).then(function (j) {
      if (!j.ok || !j.state) {
        return fail(j._status === 401 ? 'You were logged out. Log in again, then save.' : j._status === 403 ? 'Security check failed. Reload the page, then save again.' : (j.error || 'Could not save (server answered ' + (j._status || 'nothing') + ').'));
      }
      b.disabled = false; b.textContent = 'Save Settings'; $('#ix-sferr').textContent = '';
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
  function spinRow(t) { return '<div class="ix-row"><span class="ix-spin"></span><span>' + (t || 'Loading…') + '</span></div>'; }
  /* how strong a new password looks: length counts most, then mixing letters, digits and symbols */
  function pwScore(s) {
    var n = s.length, kinds = (/[a-z]/.test(s) ? 1 : 0) + (/[A-Z]/.test(s) ? 1 : 0) + (/\d/.test(s) ? 1 : 0) + (/[^A-Za-z0-9]/.test(s) ? 1 : 0);
    if (n < 8) return { pct: 14, cls: 'bad', label: 'Too short: use at least 8 characters' };
    var pts = (n >= 12 ? 1 : 0) + (n >= 16 ? 1 : 0) + (kinds >= 3 ? 1 : 0) + (kinds === 4 ? 1 : 0);
    return pts === 0 ? { pct: 38, cls: 'warn', label: 'Weak: add length or mix in digits and symbols' } : pts === 1 ? { pct: 58, cls: 'warn', label: 'Fair: a few more characters would help' } :
           pts === 2 ? { pct: 80, cls: 'good', label: 'Good' } : { pct: 100, cls: 'good', label: 'Strong' };
  }

  function pSecurity(p) {
    var SECS = [['pw', 'Password'], ['enc', 'Encryption'], ['2fa', 'Two-Step Login'],
                ['ap', 'Login Approval'], ['tr', 'Trusted Browsers'], ['dev', 'Devices']];
    p.innerHTML = '<div class="ix-hero" id="ix-sov">' + spinRow('Checking your protections…') + '</div><div class="ix-tiles" id="ix-stiles"></div><div id="ix-schk"></div>' +
      SECS.map(function (x) { return '<details class="ix-acc" data-sec="' + x[0] + '"><summary><span>' + x[1] + '</span><small data-sum="' + x[0] + '">…</small></summary><div class="ix-accb" data-body="' + x[0] + '"></div></details>'; }).join('');
    var body = function (k) { return p.querySelector('[data-body="' + k + '"]'); }, sum = function (k, t) { p.querySelector('[data-sum="' + k + '"]').textContent = t; };
    var acc = function (k) { return p.querySelector('[data-sec="' + k + '"]'); };
    var st = { vault: null, tabs: 0, bk: {}, ap: { trusted: [] } };

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
          '<p>' + (todo ? '<b>Next best step:</b> ' + esc(todo[2]) : 'Your webwebsite password and every extra protection are on. Nothing to do here.') + '</p>' +
          '<div class="ix-chips" style="margin-top:12px"><span class="ix-chip on"><b>Password</b>on</span>' + have.map(function (x) { return '<span class="ix-chip' + (x[1] ? ' on' : '') + '"><b>' + x[0].replace(/^./, function (c) { return c.toUpperCase(); }) + '</b>' + (x[1] ? 'on' : 'off') + '</span>'; }).join('') + '</div></div>';
      var trN = (a.trusted || []).length;
      p.querySelector('#ix-stiles').innerHTML =
        tile('pw', ICON.key, 'Website Password', 'Set', 'good', 'The one password for every page. Change it any time.') +
        tile('enc', ICON.lock, 'Encryption', encLabel(), encOn() ? 'good' : 'warn', encOn() ? 'Info: ' + (v ? st.tabs + ' locked' : 'none') + ' · Links: ' + (st.lenc ? st.lenc + ' locked' : 'none') + ' · Backups: ' + (bk.set ? 'locked' : 'not locked') + '.' : 'Lock private tabs and backups with one passphrase.') +
        (encOn() ? tile('enc', ICON.shield, 'Recovery Key', st.rec ? 'Created' : 'Not Created', st.rec ? 'good' : 'warn', st.rec ? 'A spare way in if you ever forget the passphrase.' : 'Create one, so a forgotten passphrase does not mean lost tabs.') : '') +
        tile('2fa', ICON.device, 'Two-Step Login', S.twoStep ? 'On' : 'Off', S.twoStep ? 'good' : 'warn', S.twoStep ? S.recoveryLeft + ' recovery ' + (S.recoveryLeft === 1 ? 'code' : 'codes') + ' left.' : 'A 6-digit code from your phone on top of the password.') +
        tile('ap', ICON.send, 'Login Approval', a.on ? 'On' : 'Off', a.on ? 'good' : '', a.on ? 'Every new browser waits for your tap in Telegram.' : (a.telegram ? 'Approve new logins with one tap in Telegram.' : 'Needs the Telegram bot to be set up first.')) +
        tile('tr', ICON.desktop, 'Trusted Browsers', trN ? trN + (trN === 1 ? ' Browser' : ' Browsers') : 'None', '', 'Browsers that skip the code and the tap for 30 days.') +
        tile('dev', ICON.out, 'Devices', '', '', 'Log out every other device in one tap.');
      p.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { var d = acc(b.dataset.go); d.open = true; d.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }; });
      sum('pw', 'Change the one password');
      sum('enc', (encOn() ? 'Passphrase Set' : 'Not Set') + ' · Info tabs: ' + (v ? st.tabs + ' encrypted' : 'none') + ' · Links tabs: ' + (st.lenc ? st.lenc + ' encrypted' : 'none') + ' · Backups: ' + (bk.set ? 'encrypted' : 'not encrypted'));
      sum('2fa', S.twoStep ? 'On · ' + S.recoveryLeft + ' recovery codes left' : 'Off');
      sum('ap', a.on ? 'On' : 'Off');
      sum('tr', trN ? trN + ' ' + (trN === 1 ? 'browser' : 'browsers') : 'None');
      sum('dev', 'Log Out Other Devices');
    }
    function load() {
      return Promise.all([
        fetch(ROOT + 'web/info/api.php', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
        api('bkkey').catch(function () { return {}; }), api('approval').catch(function () { return {}; }),
        fetch(ROOT + 'web/links/api.php?action=get', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
      ]).then(function (r) {
        var info = r[0];
        st.vault = info && info.page && info.page.vault || null;
        st.info = info; st.tabs = info && info.tabs ? info.tabs.filter(function (t) { return t.enc; }).length : 0;
        st.bk = r[1] && r[1].ok ? r[1] : {}; st.ap = r[2] && r[2].ok ? r[2] : { trusted: [] };
        st.lenc = r[3] && r[3].data && r[3].data.tabs ? r[3].data.tabs.filter(function (t) { return typeof t.enc === 'string'; }).length : 0;
        st.lvault = r[3] && r[3].data && r[3].data.settings && r[3].data.settings.vault && r[3].data.settings.vault.wrap ? r[3].data.settings.vault : null;
        st.rec = !!((st.vault && st.vault.rec) || (st.lvault && st.lvault.rec));
        overview(); drawEnc(); drawAp(); drawTrusted();
      });
    }
    secRefresh = function () { overview(); };

    /* Password */
    body('pw').innerHTML = tabHead(ICON.key, 'Website Password', 'One password opens every page of this site. Changing it logs out your other devices, and encryption that uses it follows along.') +
      '<form id="ix-cp">' + ecCard('', ICON.lock, 'Change Your Password', 'Use a long one. A few words you will remember beat a short jumble.',
        ecField('ix-cur', 'Current Password', 'password', 'current-password') +
        '<div class="ix-fgrid">' + ecField('ix-n1', 'New Password', 'password', 'new-password', 'At least 8 characters.') + ecField('ix-n2', 'Type It Again', 'password', 'new-password') + '</div>' +
        '<div class="ix-meterw" id="ix-pwm"><div class="ix-meter"><i></i></div><small></small></div>' +
        '<p class="ix-err" id="ix-cpe"></p><div class="ix-row"><button class="ix-btn pri">Change Password</button></div>') + '</form>';
    p.querySelector('#ix-n1').oninput = function () {
      var r = pwScore(this.value), m = p.querySelector('#ix-pwm'), bar = m.querySelector('i');
      bar.style.width = this.value ? r.pct + '%' : '0'; bar.className = r.cls; m.querySelector('small').textContent = this.value ? r.label : '';
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

    /* Two-step login */
    twoStep(body('2fa'));

    /* Encryption: one passphrase, a second password for secure data. It locks Info's encrypted tabs, Links' encrypted tabs and backup
       files (also the ones sent to Telegram). Set it or remove it; that is all there is to do here. */
    function encOn() { return !!(st.bk && st.bk.pp); }
    function encLabel() { return encOn() ? 'Passphrase Set' : (st.vault || st.lvault || (st.bk && st.bk.set)) ? 'Older Setting' : 'Off'; }
    function drawEnc() {
      var b = body('enc'), bk = st.bk, on = encOn(), older = !on && !!(st.vault || st.lvault || bk.set);
      if (!bk.ok) { b.innerHTML = spinRow(); return; }
      var line = function (k, v) { return '<span><b>' + k + '</b>' + v + '</span>'; };
      var cnt = function (n, has, hint) { return has ? n + ' ' + (n === 1 ? 'tab' : 'tabs') + ' encrypted' : hint; };
      var card = ecCard, chip = ecChip;
      var fd = function (id, label, auto, hint, wrapId) { return ecField(id, label, 'password', auto, hint, wrapId); };
      var chips = '<div class="ix-chips">' +
        chip('Info Tabs', cnt(st.tabs, !!st.vault, on ? 'none locked yet' : 'none'), !!st.vault && st.tabs > 0) +
        chip('Links Tabs', cnt(st.lenc, !!st.lvault, on ? 'none locked yet' : 'none'), !!st.lvault && st.lenc > 0) +
        chip('Backup Files', bk.available ? (bk.set ? 'locked' : 'not locked') : 'not available on this host', !!bk.set) + '</div>';
      var hintTabs = on ? '<p class="ix-note">To lock an Info tab: open Info, press the pencil on a tab, then Encrypt this tab. In Links: press Edit, the pencil on a tab, then Encrypted Tab.</p>' : '';
      var older = (!on && (st.vault || st.lvault || bk.set)) ? '<p class="ix-note">Some of your locked data still uses an older setting (your website password, or a separate passphrase). Setting the passphrase moves all of it onto it.</p>' : '';
      var html;
      if (!on) {
        html = card('intro', ICON.shield, 'Lock Your Private Tabs and Backups', 'One passphrase locks the encrypted tabs in Info and Links, and your backup files. Only you can unlock them, even if someone copies your server.', chips) + older +
          '<form id="ix-ef">' + card('', ICON.key, 'Set a Passphrase', 'At least 8 characters. A few words you will remember work better than a short jumble.',
            '<div class="ix-fgrid">' + fd('ix-en1', 'New Passphrase', 'new-password') + fd('ix-en2', 'Type It Again', 'new-password') + '</div>' +
            fd('ix-epw', 'Website Password', 'current-password', 'To confirm that it is you.') +
            fd('ix-eold', 'Earlier Passphrase', 'off', 'The one your existing locked tabs use now.', 'ix-eoldw') +
            '<label class="ix-chk"><input type="checkbox" id="ix-eack"> I understand a lost passphrase cannot be recovered</label>' +
            '<p class="ix-err" id="ix-ee"></p><div class="ix-row"><button class="ix-btn pri" id="ix-eset">Set Passphrase</button></div>') + '</form>';
      } else {
        html = card('good', ICON.shield, 'Encryption Is On', 'Your locked tabs and backup files are protected by your passphrase.', chips + hintTabs) + older +
          card('', ICON.key, 'Change Passphrase', 'Pick a new one. Your locked tabs are not touched, so this takes a moment. New backups use the new passphrase; older backup files keep opening with the old one.',
            '<div class="ix-fgrid">' + fd('ix-ccur', 'Current Passphrase or Recovery Key', 'off') + fd('ix-cpw', 'Website Password', 'current-password') + '</div>' +
            '<div class="ix-fgrid">' + fd('ix-cn1', 'New Passphrase', 'new-password') + fd('ix-cn2', 'Type It Again', 'new-password') + '</div>' +
            '<p class="ix-err" id="ix-ce"></p><div class="ix-row"><button type="button" class="ix-btn pri" id="ix-cgo">Change Passphrase</button></div>') +
          '<div id="ix-rec">' + card('', ICON.box, 'Recovery Key', 'A spare way in. If you ever forget the passphrase, this code opens your locked tabs and lets you set a new passphrase. Keep it somewhere safe (print it, or put it in a password manager): anyone who has it can open your locked tabs.',
            '<div class="ix-fgrid">' + fd('ix-rpp', 'Your Passphrase', 'off') + fd('ix-rpw', 'Website Password', 'current-password') + '</div>' +
            '<p class="ix-err" id="ix-re"></p><div class="ix-row"><button type="button" class="ix-btn pri" id="ix-rmk">' + (st.rec ? 'Make a New Recovery Key' : 'Create Recovery Key') + '</button>' +
            (st.rec ? '<button type="button" class="ix-btn danger" id="ix-rdel">Remove Recovery Key</button>' : '') + '</div><div id="ix-rshow"></div>',
            '<span class="ix-pill ' + (st.rec ? 'good' : '') + '">' + (st.rec ? 'Created' : 'Not Created') + '</span>') + '</div>' +
          '<form id="ix-ef">' + card('danger', ICON.out, 'Remove Encryption', 'Locked tabs turn back into normal private tabs (still hidden from visitors) and backup files stop being locked. To use a different passphrase, change it above instead.',
            '<div class="ix-fgrid">' + fd('ix-ecur', 'Your Passphrase', 'off') + fd('ix-epw', 'Website Password', 'current-password') + '</div>' +
            fd('ix-eold', 'Earlier Passphrase', 'off', 'The one your existing locked tabs use now.', 'ix-eoldw') +
            '<p class="ix-err" id="ix-ee"></p><div class="ix-row"><button type="button" class="ix-btn danger" id="ix-erm">Remove Passphrase</button></div>') + '</form>';
      }
      b.innerHTML = tabHead(ICON.lock, 'Encryption', 'One passphrase locks your private tabs in Info and Links, and your backup files. Only you can unlock them.') + html;
      var f = b.querySelector('#ix-ef'), er = b.querySelector('#ix-ee'), val = function (id) { var x = b.querySelector(id); return x ? x.value : ''; };
      var run = function (btn, msg, work, ok) {
        btn.disabled = true; er.textContent = msg;
        work().then(function () { er.textContent = ''; toast(ok); afterVaultChange(); })
          .catch(function (x) { er.textContent = x && x.user ? x.message : "Can't reach the server. Nothing was changed."; if (x && x.needOld) b.querySelector('#ix-eoldw').hidden = false; if (btn.dataset.armed) { btn.dataset.armed = ''; btn.textContent = 'Remove Passphrase'; } })
          .finally(function () { btn.disabled = false; });
      };
      if (!on) f.onsubmit = function (e) {
        e.preventDefault(); er.textContent = '';
        var n1 = val('#ix-en1'), site = val('#ix-epw');
        if (n1.length < 8) { er.textContent = 'Use at least 8 characters for the passphrase.'; return; }
        if (n1 !== val('#ix-en2')) { er.textContent = 'The two passphrases are not the same.'; return; }
        if (!site) { er.textContent = 'Type your website password.'; return; }
        if (!b.querySelector('#ix-eack').checked) { er.textContent = 'Please confirm you understand the passphrase can\'t be recovered.'; return; }
        run(b.querySelector('#ix-eset'), 'Setting…', function () { return PP.set({ pp: n1, site: site, old: val('#ix-eold') }); }, 'Passphrase set. Info tabs, Links tabs and backups use it now.');
      };
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
          b.querySelector('#ix-rshow').innerHTML = '<div class="ix-status"><span class="ix-ok">✓</span><span><b>Your recovery key. It is shown only now.</b></span></div><div class="ix-codes"><span class="ix-mono" id="ix-rcode">' + esc(code) + '</span></div>' +
            '<div class="ix-row"><button type="button" class="ix-btn" id="ix-rcopy">Copy</button></div><p class="ix-note">Save it before you close this. A key made earlier no longer works.</p>';
          b.querySelector('#ix-rcopy').onclick = function () { navigator.clipboard && navigator.clipboard.writeText(code).then(function () { toast('Copied.'); }); };
          toast('Recovery key created.');
        }).catch(function (x) { re.textContent = x && x.user ? x.message : "Can't reach the server. Nothing was changed."; })
          .finally(function () { rmk.disabled = false; });
      };
      if (rdel) rdel.onclick = function () {
        var re = b.querySelector('#ix-re'), site = val('#ix-rpw');
        if (!site) { re.textContent = 'Type your website password first.'; return; }
        if (rdel.dataset.armed !== '1') { rdel.dataset.armed = '1'; rdel.textContent = 'Click Again: Remove'; return; }
        rdel.disabled = true; re.textContent = 'Removing…';
        PP.dropRecovery({ site: site }).then(function () { toast('Recovery key removed.'); afterVaultChange(); drawEnc(); })
          .catch(function (x) { re.textContent = x && x.user ? x.message : "Can't reach the server. Nothing was changed."; rdel.dataset.armed = ''; rdel.textContent = 'Remove Recovery Key'; })
          .finally(function () { rdel.disabled = false; });
      };
      var rm = b.querySelector('#ix-erm');
      if (rm) rm.onclick = function () {
        var pp = val('#ix-ecur'), site = val('#ix-epw');
        if (!pp || !site) { er.textContent = 'Type the passphrase and your website password first.'; return; }
        var n = (st.vault ? st.tabs : 0) + (st.lvault ? st.lenc : 0);
        if (rm.dataset.armed !== '1') { rm.dataset.armed = '1'; rm.textContent = 'Click Again: Remove' + (n ? ' and Decrypt ' + n + (n === 1 ? ' Tab' : ' Tabs') : ''); return; }
        run(rm, 'Decrypting…', function () { return PP.remove({ pp: pp, site: site, old: val('#ix-eold') }); }, 'Passphrase removed. Encrypted tabs are normal private tabs now.');
      };
    }
    // Info open behind Settings holds the old key: it reloads so it never saves with it
    function afterVaultChange() { if (APP === 'info') setTimeout(function () { location.reload(); }, 900); else load(); }

    /* Approve logins in Telegram */
    function drawAp() {
      var b = body('ap'), a = st.ap;
      if (!a.ok) { b.innerHTML = spinRow(); return; }
      b.innerHTML = tabHead(ICON.send, 'Login Approval', 'Even someone who knows your password cannot get in until you tap Approve on your phone.') +
        ecCard(a.on ? 'good' : '', ICON.bell, a.on ? 'Login Approval Is On' : 'Login Approval Is Off',
          'After the password (and the two-step code), a new browser waits until you tap <b>Approve</b> on a message from your Telegram bot. You see every login and can refuse it.',
          (a.telegram ? '' : '<div class="ix-status"><span>!</span><span><b>Set up the Telegram bot first.</b> <a href="#" id="ix-apgo">Open Settings › Telegram</a></span></div>') +
          '<form id="ix-apform">' + ecField('ix-appw', 'Website Password', 'password', 'current-password', a.on ? 'Needed to turn this off.' : 'Needed to turn this on.') +
            '<div class="ix-row">' + (a.on ? '<button class="ix-btn" data-ap="off">Turn Off</button>' : '<button class="ix-btn pri" data-ap="on"' + (a.telegram ? '' : ' disabled') + '>Turn On</button>') + '</div>' +
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
    var EV = { login: ['Logged In', '', '✓'], failed: ['Wrong Password', 'warn', '!'], locked: ['Logins Paused After Too Many Wrong Tries', 'warn', '!'], password: ['Password Changed', '', '✓'],
               logoutall: ['Other Devices Logged Out', '', '✓'], twostep_on: ['Two-Step Login Turned On', '', '✓'], twostep_off: ['Two-Step Login Turned Off', 'warn', '!'],
               recovery: ['New Recovery Codes Made', '', '✓'], restore: ['Backup Restored', 'warn', '!'] };
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
        var rows = j.events.map(function (e) {
          var m = EV[e.ev] || [e.ev, '', '•'], label = e.ev === 'failed' ? (e.x === 'code' ? 'Wrong Two-Step Code' : 'Wrong Password') : m[0];
          return checkRow(m[1], m[2], esc(label), esc(e.who || '') + ' · ' + esc(e.ip || '') + (e.cc ? ' (' + esc(e.cc) + ')' : '') + ' · ' + esc(ago(e.t)));
        });
        al.innerHTML = rows.length ? '<div class="ix-checks">' + rows.slice(0, 15).join('') + '</div>' + (rows.length > 15 ? '<div class="ix-row" style="margin-top:12px"><button type="button" class="ix-btn" id="ix-actmore">Show ' + (rows.length - 15) + ' More</button></div>' : '')
          : '<div class="ix-empty"><b>No Activity Yet</b><p>Logins, wrong passwords and security changes appear here.</p></div>';
        var more = al.querySelector('#ix-actmore'); if (more) more.onclick = function () { al.querySelector('.ix-checks').innerHTML = rows.join(''); more.remove(); };
      }).catch(function () { var dl = b.querySelector('#ix-devl'); if (dl) dl.innerHTML = b.querySelector('#ix-act').innerHTML = '<p class="ix-err">Can\'t reach the server.</p>'; });
    }
    var devAcc = acc('dev'); drawDevices();
    devAcc.addEventListener('toggle', function () { if (devAcc.open) drawDevices(); });

    overview(); load();
  }
  /* POST to Info's own API (encrypted tabs live there) with the site's security token. Resolves the fetch Response. */
  function infoApi(b) {
    return fetch(ROOT + 'web/info/api.php', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json', 'X-Hub-CSRF': S.csrf || '' }, body: JSON.stringify(b) });
  }
  /* Info's encrypted-tab key, the same format the Info page uses: a random AES-256-GCM key, wrapped with a key made from
     the password (PBKDF2-SHA256, 600,000 rounds). Text is "enc1:" + base64(iv + ciphertext). Everything happens here. */
  var VK = (function () {
    var te = new TextEncoder(), td = new TextDecoder();
    var b64 = function (u) { var x = ''; for (var i = 0; i < u.length; i += 32768) x += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(x); };
    var kek = function (pass, salt, iter) {
      return crypto.subtle.importKey('raw', te.encode(pass), 'PBKDF2', false, ['deriveKey']).then(function (base) {
        return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); });
    };
    return {
      unwrap: function (v, pass) {   // the raw key, or null when the password (or the recovery key) doesn't fit
        if (!window.crypto || !crypto.subtle) return Promise.reject(new Error('Encrypted tabs need a secure (https) connection.'));
        var one = function (x, p) {
          var w = b64bytes(x.wrap);
          return kek(p, b64bytes(x.salt), x.iter).then(function (k) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: w.subarray(0, 12) }, k, w.subarray(12)); })
            .then(function (r) { return new Uint8Array(r); }, function () { return null; });
        };
        return one(v, pass).then(function (raw) { return raw || (v.rec ? one(v.rec, String(pass).replace(/[\s-]/g, '').toUpperCase()) : null); });
      },
      wrap: function (raw, pass, login) {
        var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), iter = 600000;
        return kek(pass, salt, iter).then(function (k) { return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, raw); }).then(function (ct) {
          ct = new Uint8Array(ct); var out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12);
          var v = { v: 1, salt: b64(salt), iter: iter, wrap: b64(out) }; if (login) v.login = true; return v;
        });
      },
      use: function (raw) { return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']); },
      open: function (s, key) {   // plain text from "enc1:..." (also text that was encrypted more than once)
        var n = 0;
        var step = function (x) {
          if (typeof x !== 'string' || x.indexOf('enc1:') !== 0) return Promise.resolve(x);
          if (++n > 5) return Promise.reject(new Error('layers'));
          var w = b64bytes(x.slice(5));
          return crypto.subtle.decrypt({ name: 'AES-GCM', iv: w.subarray(0, 12) }, key, w.subarray(12)).then(function (r) { return step(td.decode(r)); });
        };
        return step(s);
      }
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
      return Promise.all([getJson('info/api.php'), getJson('links/api.php?action=get')]).then(function (r) {
        var ls = r[1].data && r[1].data.settings;
        return { info: r[0], iv: (r[0].page && r[0].page.vault && r[0].page.vault.wrap) ? r[0].page.vault : null, links: r[1].data || {}, lv: ls && ls.vault && ls.vault.wrap ? ls.vault : null };
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
      return fail(what + ' tabs are locked with a different passphrase. Type it under “Earlier Passphrase” and they move to the new one.', true);
    };
    // a vault (none yet: made now) ends up wrapped with the passphrase
    var move = function (v, o, what, save) {
      if (!v) { var raw = crypto.getRandomValues(new Uint8Array(32)); return VK.wrap(raw, o.pp, false).then(function (nv) { raw.fill(0); return save(nv, ''); }); }
      return openWith(v, o).then(function (r) {
        if (!r) return needOld(what, o);
        if (r.used === 'pp' && !v.login) { r.raw.fill(0); return null; }   // already locked with it
        return VK.wrap(r.raw, o.pp, false).then(function (nv) { r.raw.fill(0); if (v.rec) nv.rec = v.rec; return save(nv, v.wrap); });   // the recovery key opens the same key, so it stays valid
      });
    };
    function set(o) {
      var infoMoved = null;   // {from, to}: Info's key after it moved, so a later failure can put it back (the two must never end up on different passphrases)
      return checkSite(o.site).then(state).then(function (d) {
        return move(d.iv, o, 'Info', function (nv, prev) { return infoApi({ action: 'save_vault', vault: nv, prev: prev, pw: '' }).then(function (r) { return okOrFail(r, 'Info'); }).then(function (r) { if (d.iv) infoMoved = { from: d.iv, to: nv }; return r; }); })
          .then(function () { return move(d.lv, o, 'Links', function (nv, prev) { return linksApi('save_vault', { vault: nv, prev: prev, pw: o.site }).then(function (r) { return okOrFail(r, 'Links'); }); }); })
          .catch(function (e) {
            if (!infoMoved) throw e;
            return infoApi({ action: 'save_vault', vault: infoMoved.from, prev: infoMoved.to.wrap, pw: '' }).then(function () { throw e; }, function () { throw e; });
          });
      }).then(function () { return api('pp_set', { password: o.site, passphrase: o.pp }); })
        .then(function (j) { if (!j.ok) fail(j.error || 'Could not save the passphrase.'); return j; });
    }
    function remove(o) {
      return checkSite(o.site).then(state).then(function (d) {
        var infoStep = !d.iv ? Promise.resolve() : openWith(d.iv, o).then(function (r) {
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
        });
        return infoStep.then(function () {
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
        .then(function (j) { if (!j.ok) fail(j.error || 'Could not remove the passphrase.'); try { indexedDB.deleteDatabase('hub-vault'); } catch (x) {} return j; });
    }
    /* Recovery key: the same tab keys, wrapped a second time with a random code shown once. It opens Info and Links tabs when the
       passphrase is forgotten (type it where the passphrase goes), and can set a new passphrase. The server never sees the code. */
    var CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no 0, 1, I, O: easy to read out and type
    var newCode = function () {
      var b = crypto.getRandomValues(new Uint8Array(20)), c = '';
      for (var i = 0; i < 20; i++) c += CODE_CHARS.charAt(b[i] & 31) + (i % 4 === 3 && i < 19 ? '-' : '');
      return c;
    };
    var saveBoth = function (d, o, mk) {   // mk(v) gives the vault to store (or null to leave it); Info first, put back if Links fails
      var done = null;
      var info = !d.iv ? Promise.resolve() : Promise.resolve(mk(d.iv)).then(function (nv) {
        if (!nv) return;
        return infoApi({ action: 'save_vault', vault: nv, prev: d.iv.wrap, pw: '' }).then(function (r) { return okOrFail(r, 'Info'); }).then(function () { done = nv; });
      });
      return info.then(function () {
        if (!d.lv) return;
        return Promise.resolve(mk(d.lv)).then(function (nv) { if (!nv) return; return linksApi('save_vault', { vault: nv, prev: d.lv.wrap, pw: o.site }).then(function (r) { return okOrFail(r, 'Links'); }); });
      }).catch(function (e) {
        if (!done) throw e;
        return infoApi({ action: 'save_vault', vault: d.iv, prev: done.wrap, pw: '' }).then(function () { throw e; }, function () { throw e; });
      });
    };
    function makeRecovery(o) {   // o = {pp, site}
      var code = newCode(), plain = code.replace(/-/g, '');
      return checkSite(o.site).then(state).then(function (d) {
        if (!d.iv && !d.lv) fail('Set the passphrase first.');
        var opened = {};
        var open = function (v) {
          if (!v) return Promise.resolve(null);
          return VK.unwrap({ salt: v.salt, iter: v.iter, wrap: v.wrap }, o.pp).then(function (raw) { if (!raw) fail('That isn\'t the passphrase.'); return raw; });   // the passphrase only: never the recovery key itself
        };
        return Promise.all([open(d.iv), open(d.lv)]).then(function (raws) {
          return Promise.all(raws.map(function (raw) { return raw ? VK.wrap(raw, plain, false).then(function (r) { raw.fill(0); return { salt: r.salt, iter: r.iter, wrap: r.wrap }; }) : null; }));
        }).then(function (recs) {
          return saveBoth(d, o, function (v) {
            var rec = v === d.iv ? recs[0] : recs[1]; if (!rec) return null;
            var nv = { v: 1, salt: v.salt, iter: v.iter, wrap: v.wrap }; if (v.login) nv.login = true; nv.rec = rec; return nv;
          });
        });
      }).then(function () { return code; });
    }
    function dropRecovery(o) {   // o = {site}
      return checkSite(o.site).then(state).then(function (d) {
        return saveBoth(d, o, function (v) {
          if (!v.rec) return null;
          var nv = { v: 1, salt: v.salt, iter: v.iter, wrap: v.wrap }; if (v.login) nv.login = true; return nv;
        });
      });
    }
    return { set: set, remove: remove, makeRecovery: makeRecovery, dropRecovery: dropRecovery };
  })();
  function twoStep(box) {
    var head = tabHead(ICON.device, 'Two-Step Login', 'A 6-digit code from an authenticator app, on top of your password.');
    if (S.twoStep) {
      box.innerHTML = head + ecCard('good', ICON.shield, 'Two-Step Login Is On', 'Logins ask for your app\'s 6-digit code (not on trusted browsers). Lost your phone? Use a recovery code.',
          '<div class="ix-chips" style="margin-top:0">' + ecChip('Recovery Codes Left', String(S.recoveryLeft), S.recoveryLeft > 2) + '</div>' + (S.recoveryLeft <= 2 ? '<p class="ix-note">Running low. Make new recovery codes below and keep them somewhere safe.</p>' : '')) +
        ecCard('', ICON.key, 'Manage', 'Your webwebsite password is needed to change these settings.',
          ecField('ix-2p', 'Website Password', 'password', 'current-password') +
          '<p class="ix-err" id="ix-2e"></p><div class="ix-row"><button type="button" class="ix-btn" id="ix-rc">New Recovery Codes</button><button type="button" class="ix-btn danger" id="ix-off">Turn Off</button></div>') + '<div id="ix-rcs"></div>';
      box.querySelector('#ix-off').onclick = function () { api('twostep_disable', { password: box.querySelector('#ix-2p').value }).then(function (j) {
        if (!j.ok) { box.querySelector('#ix-2e').textContent = j.error; return; } S.twoStep = false; twoStep(box); toast('Two-step login is off.'); if (secRefresh) secRefresh(); }); };
      box.querySelector('#ix-rc').onclick = function () { api('recovery_new', { password: box.querySelector('#ix-2p').value }).then(function (j) {
        if (!j.ok) { box.querySelector('#ix-2e').textContent = j.error; return; } S.recoveryLeft = j.recovery.length; if (secRefresh) secRefresh(); showCodes(box.querySelector('#ix-rcs'), j.recovery); }); };
      return;
    }
    var how = function (n, t, d) { return '<div class="ix-mini"><span class="ix-num">' + n + '</span><b>' + t + '</b><p>' + d + '</p></div>'; };
    box.innerHTML = head + ecCard('', ICON.lock, 'Add a Second Step', 'Your password alone is no longer enough: a thief would also need your phone.',
        '<div class="ix-trio" style="margin:0 0 14px">' + how(1, 'Get an App', 'Any authenticator app works: Google Authenticator, Microsoft Authenticator, Aegis, 1Password.') + how(2, 'Scan the Code', 'Point the app at the code on the next screen.') + how(3, 'Save Your Codes', 'Keep the recovery codes somewhere safe, for the day you lose your phone.') + '</div>' +
        '<div class="ix-row"><button type="button" class="ix-btn pri" id="ix-on">Set Up Two-Step Login</button></div>');
    box.querySelector('#ix-on').onclick = function () {
      api('twostep_begin', {}).then(function (j) {
        if (!j.ok) { toast(j.error); return; }
        box.innerHTML = head + ecCard('', ICON.device, 'Step 1: Scan the Code', 'Scan this with your authenticator app, or on your phone tap <a href="' + esc(j.uri) + '">open in app</a>. You can also type the key by hand.',
            '<div class="ix-qr" id="ix-qr"></div><p>Key: <span class="ix-mono">' + esc(j.secret.replace(/(.{4})/g, '$1 ').trim()) + '</span></p>') +
          ecCard('', ICON.check, 'Step 2: Type the 6-Digit Code', 'The app now shows a code that changes every 30 seconds. Type the current one to finish.',
            '<div class="ix-fd"><label for="ix-tc">6-Digit Code</label><input type="text" id="ix-tc" inputmode="numeric" autocomplete="one-time-code" maxlength="7" style="max-width:220px"></div>' +
            '<p class="ix-err" id="ix-te2"></p><div class="ix-row"><button type="button" class="ix-btn pri" id="ix-en">Turn On</button></div>') + '<div id="ix-rcs"></div>';
        qr(box.querySelector('#ix-qr'), j.uri);
        box.querySelector('#ix-en').onclick = function () {
          api('twostep_enable', { code: box.querySelector('#ix-tc').value }).then(function (k) {
            if (!k.ok) { box.querySelector('#ix-te2').textContent = k.error; return; }
            S.twoStep = true; S.recoveryLeft = k.recovery.length; if (secRefresh) secRefresh();
            box.innerHTML = head + ecCard('good', ICON.shield, 'Two-Step Login Is On', 'From now on, logins ask for the 6-digit code. Save your recovery codes below before you leave this page.', '') + '<div id="ix-rcs"></div>'; showCodes(box.querySelector('#ix-rcs'), k.recovery);
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
  var NAMES = { links: 'Links', info: 'Info', cards: 'Cards', tasks: 'Tasks', home: 'Home', settings: 'Settings', telegram: 'Telegram', watch: 'Domain Watch' };
  function size(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
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
  function bindExport(p) {
    if (p.__xb) return; p.__xb = true;
    p.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-export]'); if (!b) return;
      var app = b.dataset.export, fmt = b.dataset.fmt, st = document.getElementById('ix-xs'); b.disabled = true; if (st) st.textContent = 'Reading your ' + app + '…';
      api('export&app=' + app).then(function (j) {
        b.disabled = false;
        if (!j || !j.ok) { if (st) st.textContent = (j && j.error) || 'Could not read the data.'; return; }
        var day = new Date().toISOString().slice(0, 10), r = exportRows(app, j.data);
        if (fmt === 'json') { download(app + '-' + day + '.json', 'application/json', JSON.stringify(j.data, null, 2)); if (st) st.textContent = 'Saved ' + app + '-' + day + '.json.'; return; }
        var cols = []; r.rows.forEach(function (x) { Object.keys(x).forEach(function (k) { if (cols.indexOf(k) < 0) cols.push(k); }); });
        if (!r.rows.length) { if (st) st.textContent = 'There is nothing to export yet' + (r.locked ? ' (only encrypted tabs, which stay locked).' : '.'); return; }
        download(app + '-' + day + '.csv', 'text/csv', [cols.map(csvCell).join(',')].concat(r.rows.map(function (x) { return cols.map(function (k) { return csvCell(x[k]); }).join(','); })).join('\r\n'), true);
        if (st) st.textContent = 'Saved ' + app + '-' + day + '.csv with ' + r.rows.length + (r.rows.length === 1 ? ' row.' : ' rows.') + (r.locked ? ' ' + r.locked + (r.locked === 1 ? ' encrypted tab was' : ' encrypted tabs were') + ' left out.' : '');
      }, function () { b.disabled = false; if (st) st.textContent = 'Can\'t reach the server.'; });
    });
  }
  function pBackup(p) {
    bindExport(p);
    p.innerHTML = '<p>Loading…</p>';
    Promise.all([api('backup_overview'), api('notify').catch(function () { return {}; }), api('bkkey').catch(function () { return {}; })]).then(function (r) {
      var j = r[0], n = r[1] || {}, enc = r[2] || {};
      if (!j.ok) { p.innerHTML = '<p class="ix-err">' + esc(j.error) + '</p>'; return; }
      var parts = j.parts, last = +S.backupLast || 0, every = +S.backupEvery || 0;
      var due = every > 0 && (!last || (Date.now() / 1000 - last) / 86400 >= every);
      var tg = n.ok && n.hasToken && n.chat ? (n.bkEvery ? 'Sends a backup ' + ({ 1: 'every day', 3: 'every 3 days', 7: 'every week', 14: 'every 2 weeks', 30: 'every month' }[n.bkEvery] || 'regularly') + (n.bkLast ? '. Last: ' + ago(n.bkLast) : '. None sent yet') : 'Connected, Automatic Backups Off') : 'Not Set Up';
      var newest = j.versions.length ? j.versions.reduce(function (a, v) { return v.time > a ? v.time : a; }, 0) : 0;
      p.innerHTML =
        '<div class="ix-bkstat' + (due ? ' due' : '') + '">' +
          '<div><small>Last Full Backup</small><b>' + (last ? esc(ago(last)) : 'Never') + '</b><span>' + (last ? esc(when(last)) : 'Export one below, or let Telegram send them') + '</span></div>' +
          '<div><small>Remind Me Every</small><select id="ix-every" aria-label="Remind me every">' + [0, 1, 3, 7, 14, 30].map(function (d) {
            return '<option value="' + d + '"' + (every === d ? ' selected' : '') + '>' + (d ? d + (d > 1 ? ' Days' : ' Day') : 'Never') + '</option>'; }).join('') + '</select><span>' + (due ? 'A backup is due' : every ? 'Not due yet' : 'No Reminders') + '</span></div>' +
          '<div><small>Telegram</small><b>' + (n.bkEvery && n.chat ? 'On' : 'Off') + '</b><span>' + esc(tg) + ' · <a href="#" id="ix-tgset">' + (n.chat ? 'Change' : 'Set Up') + '</a></span></div>' +
        '</div>' +
        '<details class="ix-acc" open><summary><span>Back Up</span><small>Download one file that brings back everything, on this server or any other.</small></summary><div class="ix-accb">' +
          '<div class="ix-bkh"><b>What to Include</b><span class="ix-mu"><a href="#" id="ix-bkall">All</a> · <a href="#" id="ix-bknone">None</a></span></div>' +
          '<div class="ix-bkgrid">' + Object.keys(NAMES).map(function (k) {
            var pt = parts[k] || {}, tabs = pt.tabs && pt.tabs.length ? pt.tabs : null;
            return '<div class="ix-bkp"><label class="ix-bkl"><input type="checkbox" data-part="' + k + '" data-size="' + (+pt.size || 0) + '" checked><span class="ix-bkn"><b>' + NAMES[k] + '</b><small title="' + esc(pt.summary || '') + '">' + esc(pt.summary || '') + '</small></span>' + (pt.size ? '<em>' + size(pt.size) + '</em>' : '') + '</label>' +
              (tabs ? '<button type="button" class="ix-linkbtn" data-tabsbtn="' + k + '">Choose tabs (' + tabs.length + ')</button><div class="ix-tabs" data-tabs="' + k + '" hidden>' + tabs.map(function (t) {
                return '<label><input type="checkbox" value="' + esc(t.id) + '" checked>' + esc(t.name || 'Tab') + (t.enc ? ' 🔒' : t.private ? ' (private)' : '') + '</label>'; }).join('') + '</div>' : '') + '</div>';
          }).join('') + '</div>' +
          '<div class="ix-bkf"><div class="ix-bkopt">' +
            (enc.set ? '<label class="ix-chk"><input type="checkbox" id="ix-expenc" checked> Lock the file with my ' + (enc.mode === 'login' ? 'website password' : 'encryption passphrase') + '</label>' : '<span class="ix-mu">Not locked: turn on encryption in Security to lock backup files.</span>') +
            '<small id="ix-bksum" class="ix-mu"></small></div>' +
            '<button type="button" class="ix-btn pri" id="ix-exp">' + svg(ICON.box) + 'Download Backup</button></div>' +
          '<p class="ix-note">Keep backup files somewhere other than this server.</p>' +
        '</div></details>' +
        '<div class="ix-status">' + (enc.set ? '<span class="ix-ok">🔒</span><span><b>Backup Files Are Encrypted</b> and open with your ' + (enc.mode === 'login' ? 'website password' : 'encryption passphrase') + '. '
          : '<span>!</span><span><b>Backup files are not encrypted.</b> ') + '<a href="#" id="ix-encgo2">' + (enc.set ? 'Change' : 'Turn on') + ' in Settings › Security</a></span></div>' +
        '<details class="ix-acc"><summary><span>Restore</span><small>Bring everything back from a backup file. Older Links, Info, Cards and Tasks backups work too.</small></summary><div class="ix-accb">' +
          '<label class="ix-dropz" id="ix-dropz"><input type="file" id="ix-imp" accept=".json,.gz,application/json,application/gzip"><b>Drop a Backup File Here</b><span>or click to choose. .json, or .json.gz from Telegram. You pick what to restore next, and what is there now is kept as an earlier version first.</span></label>' +
          '<div id="ix-impx"></div></div></details>' +
        '<details class="ix-acc" id="ix-xacc"><summary><span>Export Data</span><small>Links, Cards or Tasks as a spreadsheet (CSV) or a JSON file</small></summary><div class="ix-accb">' +
          tabHead(ICON.file, 'Export Data', 'One page at a time, to open in a spreadsheet or keep. This is not a backup: use Back Up for that.') +
          [['links', 'Links', ICON.bookmark, 'Every bookmark with its tab, category, name and address. Encrypted tabs stay locked and are left out of the spreadsheet.'],
           ['cards', 'Cards', ICON.card, 'Every card with its details, one row each.'],
           ['tasks', 'Tasks', ICON.check, 'Every task with its due date, repeat, price and notes.']].map(function (x) {
            return ecCard('', x[2], x[1], x[3], '<div class="ix-row"><button type="button" class="ix-btn pri" data-export="' + x[0] + '" data-fmt="csv">' + svg(ICON.down) + 'Download CSV</button><button type="button" class="ix-btn" data-export="' + x[0] + '" data-fmt="json">' + svg(ICON.down) + 'Download JSON</button></div>'); }).join('') +
          '<p class="ix-note" id="ix-xs">The files hold your data as plain text. Keep them somewhere safe.</p></div></details>' +
        '<details class="ix-acc" id="ix-vacc"><summary><span>Earlier Versions</span><small>' + (j.versions.length ? j.versions.length + ' saved' + (newest ? ', newest ' + esc(ago(newest)) : '') : 'None yet') + '. Kept automatically while you edit</small></summary><div class="ix-accb">' +
          '<p>Up to 40 per page, one every 10 minutes. Restoring keeps a copy first.</p>' +
          '<div class="ix-row" id="ix-vf" style="margin-bottom:6px">' + seg('vf', [['all', 'All']].concat(['links', 'info', 'cards', 'tasks', 'home'].map(function (k) {
            var c = j.versions.filter(function (v) { return v.app === k; }).length; return [k, NAMES[k] + (c ? ' ' + c : '')]; })), 'all') + '</div><div id="ix-vl"></div></div></details>' +
        '<details class="ix-acc ix-danger" id="ix-reset"><summary><span>Start Over</span><small>Erase all data and settings, like a new site</small></summary><div class="ix-accb">' +
          '<p><b>This erases:</b> every page\'s data and earlier versions (Links, Info, Cards, Tasks, Start page), your pictures, icons and logo, the site settings and colors, Telegram, the domain watch list, the encryption passphrase and Telegram login approval.</p>' +
          '<p><b>This keeps:</b> your password and two-step login, so you can log in again. Encrypted tabs cannot be opened afterwards unless you restore a backup and set the same passphrase.</p>' +
          '<p>Everything comes back by importing a backup file (Import, above). <b>Download a full backup first.</b></p>' +
          '<label class="ix-fl2">Type ERASE<input type="text" id="ix-rsc" autocomplete="off" spellcheck="false"></label>' +
          '<label class="ix-fl2">Website Password<input type="password" id="ix-rsp" autocomplete="current-password"></label>' +
          '<p class="ix-err" id="ix-rse"></p><div class="ix-row"><button type="button" class="ix-btn danger" id="ix-rsgo">Erase Everything</button></div></div></details>' +
        '<p class="ix-note">Moving the site to another server or folder? Your data is in the <code>site-data</code> folder inside the site folder, so copying the whole site folder brings it along. A backup file is the safe second copy.</p>';
      p.querySelector('#ix-tgset').onclick = function (e) { e.preventDefault(); go('telegram'); };
      p.querySelector('#ix-rsgo').onclick = function () {
        var er = p.querySelector('#ix-rse'), btn = this;
        if (p.querySelector('#ix-rsc').value.trim() !== 'ERASE') { er.textContent = 'Type ERASE (in capitals) to confirm.'; return; }
        if (!p.querySelector('#ix-rsp').value) { er.textContent = 'Type your website password.'; return; }
        if (!confirm('Erase all data and settings now? This cannot be undone except by importing a backup file.')) return;
        btn.disabled = true; er.textContent = 'Erasing…';
        api('reset_all', { confirm: 'ERASE', password: p.querySelector('#ix-rsp').value }).then(function (j) {
          if (!j.ok) { er.textContent = j.error || 'Nothing was erased.'; btn.disabled = false; return; }
          try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}   // this browser's copies too (theme, cached pages, kept keys)
          try { indexedDB.deleteDatabase('hub-vault'); } catch (e) {}
          er.className = 'ix-note'; er.textContent = 'Erased: ' + j.erased.join(', ') + '. Reloading…';
          setTimeout(function () { location.reload(); }, 1200);
        }).catch(function () { er.textContent = "Can't reach the server. Nothing was erased."; btn.disabled = false; });
      };
      p.querySelectorAll('[data-tabsbtn]').forEach(function (b) { b.onclick = function () { var t = p.querySelector('[data-tabs="' + b.dataset.tabsbtn + '"]'); t.hidden = !t.hidden; }; });
      // tab choices follow their part's checkbox
      p.querySelectorAll('[data-part]').forEach(function (c) { c.onchange = function () { var t = p.querySelector('[data-tabs="' + c.dataset.part + '"]'), b = p.querySelector('[data-tabsbtn="' + c.dataset.part + '"]'); if (b) b.hidden = !c.checked; if (t && !c.checked) t.hidden = true; }; });
      var bkSum = function () {
        var cs = [].slice.call(p.querySelectorAll('[data-part]')), on = cs.filter(function (c) { return c.checked; }), bytes = on.reduce(function (a, c) { return a + (+c.dataset.size || 0); }, 0), el = p.querySelector('#ix-bksum');
        if (el) el.textContent = on.length + ' of ' + cs.length + ' selected' + (bytes ? ' · about ' + size(bytes) : '');
      };
      p.querySelectorAll('[data-part]').forEach(function (c) { c.addEventListener('change', bkSum); }); bkSum();
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
        var ec = p.querySelector('#ix-expenc'); if (ec && ec.checked) extra += '&enc=1';
        fetch(CORE + 'api.php?action=backup&parts=' + q.join(',') + extra, { credentials: 'same-origin', headers: { 'X-Hub-CSRF': S.csrf } }).then(function (r) {
          if (!r.ok) return r.json().then(function (j) { throw new Error(j.error || 'Backup failed.'); });
          var name = (/filename="([^"]+)"/.exec(r.headers.get('Content-Disposition') || '') || [])[1] || 'backup.json';
          return r.blob().then(function (blob) {
            var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
            document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
            if (q.length === Object.keys(NAMES).length && !/_tabs=/.test(extra)) { S.backupLast = Date.now() / 1000; remember(S); redraw(); pBackup(p); }
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
      var dz = p.querySelector('#ix-dropz');
      p.querySelector('#ix-imp').onchange = function (e) { importFile(e.target.files[0], p.querySelector('#ix-impx')); };
      ['dragenter', 'dragover'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('over'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('over'); }); });
      dz.addEventListener('drop', function (e) { if (e.dataTransfer.files[0]) importFile(e.dataTransfer.files[0], p.querySelector('#ix-impx')); });
      // earlier versions: drawn only when opened, 20 at a time
      var vl = p.querySelector('#ix-vl'), filt = 'all', shown = 20;
      function drawVersions() {
        var all = j.versions.filter(function (v) { return filt === 'all' || v.app === filt; }), list = all.slice(0, shown);
        vl.innerHTML = list.length ? list.map(function (v) {
          return '<div class="ix-ver"><span class="ix-tag">' + NAMES[v.app] + '</span><span>' + esc(ago(v.time)) + ' <small>' + esc(when(v.time)) + '</small></span><span style="color:var(--ix-mu2)">' + size(v.size) + '</span>' +
            '<button type="button" class="ix-btn" data-app="' + v.app + '" data-id="' + esc(v.id) + '">Restore</button></div>'; }).join('') +
          (all.length > shown ? '<div class="ix-row"><button type="button" class="ix-btn" id="ix-vmore">Show More (' + (all.length - shown) + ')</button></div>' : '') : '<p>No earlier versions yet.</p>';
        vl.querySelectorAll('[data-id]').forEach(function (b) { b.onclick = function () {
          if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Click Again to Restore'; return; }
          api('version_restore', { app: b.dataset.app, id: b.dataset.id }).then(function (k) {
            if (!k.ok) { toast(k.error); return; } toast(NAMES[b.dataset.app] + ' restored. Reloading…'); setTimeout(function () { location.reload(); }, 900); });
        }; });
        var more = vl.querySelector('#ix-vmore'); if (more) more.onclick = function () { shown += 20; drawVersions(); };
      }
      p.querySelector('#ix-vacc').addEventListener('toggle', function () { if (this.open && !vl.innerHTML) drawVersions(); });
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
      '<p class="ix-note">Used only in this browser. If you changed it since this file was made, use the one from back then.</p><p class="ix-err" id="ix-ence"></p></form>';
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
        '<p class="ix-err" id="ix-re"></p><div class="ix-row"><button type="button" class="ix-btn pri" id="ix-rs">Restore</button></div>';
      var mode = 'replace';
      if (tabbed) bindSeg(box, function (k, v) { mode = v; });
      box.querySelector('#ix-rs').onclick = function () {
        var pick = {}; box.querySelectorAll('[data-r]:checked').forEach(function (c) { pick[c.dataset.r] = true; });
        if (!Object.keys(pick).length) { box.querySelector('#ix-re').textContent = 'Pick at least one part.'; return; }
        var b = this; b.disabled = true; b.textContent = 'Restoring…';
        api('restore', { backup: j, pick: pick, mode: mode }).then(function (k) {
          b.disabled = false; b.textContent = 'Restore';
          if (!k.ok) { box.querySelector('#ix-re').textContent = k.error || 'Restore failed.'; return; }
          toast('Restored: ' + k.restored.join(', ') + '. Reloading…'); setTimeout(function () { location.reload(); }, 1100);
        }).catch(function () { b.disabled = false; b.textContent = 'Restore'; box.querySelector('#ix-re').textContent = 'The file may be too large for this server.'; });
      };
    };
    r.readAsText(file);
  }


  /* ---------- Health (gear > Health, or Settings > Health): Overview, Domains and Uptime, Server Check ---------- */
  function daysLeft(d) { if (!d) return null; return Math.round((new Date(d + 'T12:00:00') - new Date()) / 864e5); }
  function leftText(n) { return n === null ? '' : n < 0 ? 'ended ' + -n + ' days ago' : n === 0 ? 'ends today' : n + (n === 1 ? ' day' : ' days') + ' left'; }
  function leftCls(n, warn) { return n === null ? '' : n < 0 ? 'bad' : n <= warn ? 'warn' : 'good'; }
  function hCard(label, val, sub, cls, go) {
    return '<' + (go ? 'button type="button" data-go="' + go + '"' : 'div') + ' class="ix-hc ' + (cls || '') + '"><small>' + label + '</small><b>' + val + '</b><span>' + sub + '</span></' + (go ? 'button' : 'div') + '>';
  }
  /* gear > Health opens Settings > Health: Overview, Domains and Uptime, Server Check */
  function health(sub) { go(sub || 'health'); }
  function pHealth(p) {
    p.innerHTML = '<div class="ix-row"><span class="ix-spin"></span><span>Checking…</span></div>';
    Promise.all([api('health'), api('watch')]).then(function (r) {
      var h = r[0], w = r[1] || {};
      if (!h.ok) { p.innerHTML = '<p class="ix-err">' + esc(h.error || 'Could not load.') + '</p>'; return; }
      var cronAgo = h.cron ? (Date.now() / 1000 - h.cron) : null, cronOk = cronAgo !== null && cronAgo < 1800;
      var errLines = h.logs.reduce(function (n, l) { return n + l.lines.length; }, 0);
      var maxB = Math.max.apply(null, h.sizes.map(function (x) { return x.bytes; }).concat([1]));
      var up = h.update || {};
      var slowRows = ((h.speed || {}).rows || []).filter(function (x) { return x.ms > 150 || x.bytes > 1500000; });
      var openLogs = h.logs.filter(function (l) { return l.public === true; });
      // the domain, SSL or hosting date that ends first
      var soon = null;
      (w.sites || []).forEach(function (s) {
        [[s.dom && s.dom.exp, 'Domain'], [s.ssl && s.ssl.exp, 'SSL'], [s.hosting, 'Hosting']].forEach(function (x) {
          var n = daysLeft(x[0]); if (n !== null && (!soon || n < soon.n)) soon = { n: n, what: x[1], host: s.host };
        });
      });
      var down = (w.sites || []).filter(function (s) { return s.up && s.st && s.st.at && !s.st.ok; }).length;
      p.innerHTML = '<div class="ix-hcards">' +
          hCard('Version', esc(h.version), up.newer ? '<a href="' + esc(up.link || '#') + '" target="_blank" rel="noopener">' + esc(up.version) + ' is available</a>' : (h.leftovers.length ? h.leftovers.length + ' update problem' + (h.leftovers.length > 1 ? 's' : '') : 'Files match'), up.newer || h.leftovers.length ? 'warn' : 'good') +
          hCard('Schedule', cronOk ? 'Running' : h.cron ? 'Stopped' : 'Not Set Up', h.cron ? 'Last run ' + esc(ago(h.cron)) : 'Add the cron job (Settings › Telegram)', cronOk ? 'good' : 'warn', 'telegram') +
          hCard('Last Backup', h.backup.last ? esc(ago(h.backup.last)) : 'Never', (h.backup.encrypted ? '🔒 Encrypted' : 'Not Encrypted') + (h.backup.tgEvery ? ', Telegram on' : ''), !h.backup.last || (h.backup.every && (Date.now() / 1000 - h.backup.last) / 86400 >= h.backup.every) ? 'warn' : 'good', 'backup') +
          hCard('Domains', (w.sites || []).length ? (w.sites.length + (w.sites.length === 1 ? ' Site' : ' Sites')) : 'None Yet', down ? down + ' down right now' : soon ? esc(soon.what + ' ' + leftText(soon.n)) : 'Add one to watch its expiry', down || (soon && soon.n <= 14) ? (down || soon.n < 0 ? 'bad' : 'warn') : (w.sites || []).length ? 'good' : '', 'domains') +
          hCard('Disk Used', esc(size(h.total)), h.free ? esc(size(h.free)) + ' free on the server' : 'Free Space Not Reported', '') +
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
          '<p class="ix-note">If a page is slow to start, look here first: data that reads in a few milliseconds means the wait is the connection or the host, not the site.</p></div></details>' +
        '<details class="ix-acc"><summary><span>Backups</span><small>Last full backup ' + (h.backup.last ? esc(when(h.backup.last)) : 'never') + '</small></summary><div class="ix-accb">' +
          '<div class="ix-hrow"><span>Last Full Backup</span><span></span><b>' + (h.backup.last ? esc(when(h.backup.last)) : 'Never') + '</b><small>' + (h.backup.every ? 'reminder every ' + h.backup.every + ' days' : 'no reminder') + '</small></div>' +
          '<div class="ix-hrow"><span>Telegram Backups</span><span></span><b>' + (h.backup.telegram ? esc(when(h.backup.telegram)) : 'None Sent') + '</b><small>' + (h.backup.tgEvery ? 'every ' + h.backup.tgEvery + ' days' : 'off') + '</small></div>' +
          '<div class="ix-hrow"><span>Encryption</span><span></span><b>' + (h.backup.encrypted ? '🔒 On' : 'Off') + '</b><small>Backup › Encryption</small></div>' +
          Object.keys(h.versions).map(function (k) { var v = h.versions[k]; return '<div class="ix-hrow"><span>Earlier versions: ' + (NAMES[k] || k) + '</span><span></span><b>' + v.count + '</b><small>' + esc(size(v.bytes)) + '</small></div>'; }).join('') +
          '<div class="ix-row" style="margin-top:10px"><button type="button" class="ix-btn" id="ix-vbk">Test a Restore</button><span class="ix-note" style="margin:0">Makes a backup, opens it again and checks it, without changing anything.</span></div><div id="ix-vres"></div></div></details>' +
        '<details class="ix-acc"' + (errLines || openLogs.length ? ' open' : '') + '><summary><span>PHP Errors</span><small>' + (openLogs.length ? 'A log is publicly readable' : errLines ? 'From your host\'s error_log files, newest last' : 'No Errors Logged') + '</small></summary><div class="ix-accb">' +
          (h.logs.length ? h.logs.map(function (l) {
            return (l.public === true ? '<div class="ix-status"><span>!</span><span><b>' + esc(l.file) + ' can be opened by anyone on the internet.</b> Error logs can show file paths. Add this to the <code>.htaccess</code> in your site\'s main folder: <code>&lt;FilesMatch "^error_log(\\.[0-9]+)?$"&gt; Require all denied &lt;/FilesMatch&gt;</code></span></div>' : '') + '<div class="ix-log"><div class="ix-row" style="justify-content:space-between"><b>' + esc(l.file) + '</b><span class="ix-note" style="margin:0">' + esc(size(l.size)) + ', changed ' + esc(ago(l.at)) + '</span>' +
              (l.clear && l.size ? '<button type="button" class="ix-btn" data-clr="' + esc(l.file) + '">Clear</button>' : '') + '</div><pre>' + (l.lines.length ? esc(l.lines.join('\n')) : '(empty)') + '</pre></div>'; }).join('')
            : '<p>No error_log files were found. That is good news.</p>') + '</div></details>' +
        '<p class="ix-note">PHP version, limits and extensions, and whether your hosting can reach other websites: <button type="button" class="ix-linkbtn" style="padding:0" data-go="check">Server Check</button>.</p>';
      p.querySelectorAll('[data-clr]').forEach(function (b) { b.onclick = function () {
        if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Click Again to Clear'; return; }
        api('health_log_clear', { file: b.dataset.clr }).then(function (j) { if (j.ok) { toast('Log cleared.'); pHealth(p); } else toast(j.error); });
      }; });
      var vb = p.querySelector('#ix-vbk');
      if (vb) vb.onclick = function () {
        var box = p.querySelector('#ix-vres'); vb.disabled = true; box.innerHTML = '<div class="ix-row"><span class="ix-spin"></span><span>Testing…</span></div>';
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
  function pDomains(p) {
    p.innerHTML = '<p>Domain and SSL expiry, hosting renewals and uptime, with Telegram alerts and tasks.</p><div id="ix-wbox"><div class="ix-row"><span class="ix-spin"></span><span>Loading…</span></div></div>';
    api('watch').then(function (w) {
      var box = p.querySelector('#ix-wbox'); if (!box) return;
      if (!w || !w.ok) { box.innerHTML = '<p class="ix-err">' + esc((w && w.error) || 'Could not load.') + '</p>'; return; }
      watchBox(box, w);
    });
  }
  function watchBox(box, w) {
    var draw = function (w) {
      var t = w.tasks || {};
      box.innerHTML = '<form class="ix-row" id="ix-wadd"><input type="text" id="ix-whost" placeholder="example.com or shop.example.com" autocomplete="off" style="flex:1;min-width:200px">' +
          '<label class="ix-chk" style="margin:0"><input type="checkbox" id="ix-wup" checked> Uptime</label><button class="ix-btn pri">Add and Check</button></form>' +
        (w.sites && w.sites.length ? w.sites.map(function (s) {
          var st = s.st || {}, dn = daysLeft(s.dom && s.dom.exp), sn = daysLeft(s.ssl && s.ssl.exp), hn = daysLeft(s.hosting);
          var upTxt = !s.up ? '<span class="ix-wdot off"></span>Uptime off' : st.at ? '<span class="ix-wdot ' + (st.ok ? 'up' : 'down') + '"></span>' + (st.ok ? 'Up' : 'Down') + (st.code ? ' (' + st.code + (st.ms ? ', ' + st.ms + ' ms' : '') + ')' : '') + ', ' + esc(ago(st.at)) : '<span class="ix-wdot off"></span>Not checked yet';
          return '<div class="ix-wsite" data-host="' + esc(s.host) + '"><div class="ix-row" style="justify-content:space-between"><b>' + esc(s.host) + '</b><span class="ix-wup">' + upTxt + '</span></div>' +
            '<div class="ix-wgrid">' +
              '<div><small>Domain' + (s.dom && s.dom.name && s.dom.name !== s.host ? ' (' + esc(s.dom.name) + ')' : '') + '</small><b class="' + leftCls(dn, 30) + '">' + (s.dom && s.dom.exp ? esc(new Date(s.dom.exp + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })) : '—') + '</b><span>' + (s.dom && s.dom.exp ? esc(leftText(dn)) + (s.dom.registrar ? ', ' + esc(s.dom.registrar) : '') : esc((s.dom && s.dom.err) || 'Not checked yet')) + '</span></div>' +
              '<div><small>SSL Certificate</small><b class="' + leftCls(sn, 14) + '">' + (s.ssl && s.ssl.exp ? esc(new Date(s.ssl.exp + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })) : '—') + '</b><span>' + (s.ssl && s.ssl.exp ? esc(leftText(sn)) + (s.ssl.issuer ? ', ' + esc(s.ssl.issuer) : '') : esc((s.ssl && s.ssl.err) || 'Not checked yet')) + '</span></div>' +
              '<div><small>Hosting Renews</small><input type="date" data-hosting value="' + esc(s.hosting || '') + '" aria-label="Hosting renewal date for ' + esc(s.host) + '"><span>' + (s.hosting ? esc(leftText(hn)) : 'Your hosting\'s renewal date') + '</span></div>' +
            '</div><div class="ix-row" style="margin-top:8px"><label class="ix-chk" style="margin:0"><input type="checkbox" data-up' + (s.up ? ' checked' : '') + '> Check Uptime Every 5 Minutes</label><span style="flex:1"></span><button type="button" class="ix-btn" data-del>Remove</button></div></div>';
        }).join('') : '<p class="ix-note" style="margin:14px 0">No domains yet. Add yours above: the expiry dates are looked up for you.</p>') +
        '<div class="ix-row" style="margin-top:10px"><button type="button" class="ix-btn" id="ix-wnow"' + (w.sites && w.sites.length ? '' : ' disabled') + '>Check Everything Now</button></div>' +
        '<h3>Renewal Tasks</h3><p>Expiry dates become tasks, so reminders cover them.</p>' +
        '<label class="ix-tg"><span>Domain Expiry<small>A task 30 days ahead.</small></span><input type="checkbox" data-t="dom"' + (t.dom ? ' checked' : '') + '></label>' +
        '<label class="ix-tg"><span>Hosting Renewal<small>From the date you enter above.</small></span><input type="checkbox" data-t="host"' + (t.host ? ' checked' : '') + '></label>' +
        '<label class="ix-tg"><span>SSL Certificate<small>Usually off: certificates renew themselves. You still get a 7-day warning.</small></span><input type="checkbox" data-t="ssl"' + (t.ssl ? ' checked' : '') + '></label>' +
        '<p class="ix-note">Runs with the cron job: uptime every 5 minutes, expiry twice a day.</p>';
      var busy = function (b, txt) { b.disabled = true; b.textContent = txt; };
      box.querySelector('#ix-wadd').onsubmit = function (e) {
        e.preventDefault(); var b = e.target.querySelector('button'); busy(b, 'Checking…');
        api('watch_add', { host: box.querySelector('#ix-whost').value, up: box.querySelector('#ix-wup').checked }).then(function (j) { if (!j.ok) { toast(j.error); b.disabled = false; b.textContent = 'Add and Check'; return; } toast('Added.'); draw(j); });
      };
      box.querySelector('#ix-wnow').onclick = function () { busy(this, 'Checking…'); api('watch_check', {}).then(function (j) { if (j.ok) { toast('Checked.'); draw(j); } }); };
      box.querySelectorAll('[data-t]').forEach(function (c) { c.onchange = function () { var o = {}; o[c.dataset.t] = c.checked; api('watch_tasks', o).then(function (j) { if (j.ok) toast('Saved.'); }); }; });
      box.querySelectorAll('.ix-wsite').forEach(function (r) {
        var h = r.dataset.host;
        r.querySelector('[data-hosting]').onchange = function (e) { api('watch_set', { host: h, hosting: e.target.value }).then(function (j) { if (j.ok) { toast(e.target.value ? 'Hosting date saved.' : 'Hosting date removed.'); draw(j); } }); };
        r.querySelector('[data-up]').onchange = function (e) { api('watch_set', { host: h, up: e.target.checked }).then(function (j) { if (j.ok) draw(j); }); };
        r.querySelector('[data-del]').onclick = function () {
          var b = this; if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Click Again to Remove'; return; }
          api('watch_del', { host: h }).then(function (j) { if (j.ok) { toast('Removed. Its tasks stay in Tasks.'); draw(j); } });
        };
      });
    };
    draw(w);
  }

  K.impl = { settings: go, mount: mount, openBackup: openBackup, textSizes: textSizes, health: health };
})(window.__ixShell);
