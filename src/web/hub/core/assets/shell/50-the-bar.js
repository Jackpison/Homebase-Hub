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
  /* (1.67.0) a button of the bar's right side: a small colour tile with a white icon (the colours in TOOL_C) */
  function toolTile(k, icon) { return '<span class="ix-tt" style="--c:' + (TOOL_C[k] || TOOL_C.account) + '" aria-hidden="true">' + icon + '</span>'; }
  /* (1.65.0) Hold to Delete: a button with data-hold acts only after it is held for 0.9 s (a red fill runs across it); letting go early
     does nothing, and a plain click says to hold it. Works with a mouse, a finger and the keyboard (hold Enter or Space). The page's own
     click handler runs once the hold is complete, so each page keeps its own delete and Undo. */
  var HOLD_MS = 900, holding = null;
  function holdBtn(n) { return n && n.closest ? n.closest('[data-hold]') : null; }
  function holdStart(b) {
    if (holding || !b || b.disabled) return;
    holding = b; b.classList.add('ix-holding'); b.setAttribute('aria-busy', 'true');
    b._hold = setTimeout(function () { holdStop(); b._held = true; try { b.click(); } finally { b._held = false; } }, reduced() ? 500 : HOLD_MS);
  }
  function holdStop() { var b = holding; holding = null; if (!b) return; clearTimeout(b._hold); b.classList.remove('ix-holding'); b.removeAttribute('aria-busy'); }
  document.addEventListener('pointerdown', function (e) { var b = holdBtn(e.target); if (b && e.button === 0) holdStart(b); }, true);
  ['pointerup', 'pointercancel'].forEach(function (k) { addEventListener(k, holdStop, true); });
  addEventListener('blur', function (e) { if (e.target === window) holdStop(); });   // the window lost focus (another app); not a field losing it to the button
  document.addEventListener('pointerout', function (e) { if (holding && holdBtn(e.target) === holding && !holding.contains(e.relatedTarget)) holdStop(); }, true);
  document.addEventListener('contextmenu', function (e) { if (holdBtn(e.target)) e.preventDefault(); }, true);   // a long press on a phone
  document.addEventListener('keydown', function (e) { var b = holdBtn(e.target); if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); if (!e.repeat) holdStart(b); } }, true);
  document.addEventListener('keyup', function (e) { if (holdBtn(e.target) && (e.key === 'Enter' || e.key === ' ')) holdStop(); }, true);
  document.addEventListener('click', function (e) {
    var b = holdBtn(e.target); if (!b || b._held) return;
    e.preventDefault(); e.stopImmediatePropagation();
    toast('Hold the button down to confirm.');
  }, true);

  /* (1.65.0) One tooltip for every button that shows only an icon: the Edit Bar (Icons Only), the bar's buttons, and the page tabs when the bar
     shows icons only. Dark glass with a thin accent line; it eases in after a moment, sits below a button in the top half of the screen and
     above one in the bottom half, and stays on the screen. Buttons whose name is already visible get none. The names stay for screen readers
     (aria-label); the browser's own title tooltip is moved into data-tip so two never show at once. */
  function tipTarget(n) {
    var bt = n && n.closest && n.closest('#ix-ebar .ix-eb, #ix-bar [data-tip], #ix-drawer [data-tip], [data-tip].ix-tipme');
    if (!bt) return null;
    var vis = (bt.innerText || '').trim();   // a visible name: no tooltip needed
    return vis ? null : bt;
  }
  function tipShow(bt) {
    var t = document.getElementById('ix-ebtip');
    if (!bt) { if (t) t.remove(); return; }
    if (!t) { t = document.createElement('div'); t.id = 'ix-ebtip'; t.setAttribute('aria-hidden', 'true'); document.body.appendChild(t); }
    if (t._for === bt) return;
    t._for = bt; t.textContent = bt.getAttribute('data-tip'); t.className = '';
    var r = bt.getBoundingClientRect(), below = r.top + r.height / 2 < innerHeight / 2;
    var left = Math.max(8, Math.min(innerWidth - t.offsetWidth - 8, r.left + r.width / 2 - t.offsetWidth / 2));
    t.style.left = left + 'px';
    t.style.top = (below ? r.bottom + 10 : r.top - t.offsetHeight - 10) + 'px';
    t.style.setProperty('--ix-ax', Math.round(r.left + r.width / 2 - left) + 'px');
    t.className = (below ? 'below' : '') + (bt.closest('#ix-ebar') ? ' eb' : '');
  }
  ['mouseover', 'focusin'].forEach(function (k) { document.addEventListener(k, function (e) { tipShow(tipTarget(e.target)); }, true); });
  ['mouseout', 'focusout'].forEach(function (k) { document.addEventListener(k, function (e) { var to = tipTarget(e.relatedTarget); if (!to || to !== tipTarget(e.target)) tipShow(to); }, true); });
  ['scroll', 'pointerdown', 'keydown'].forEach(function (k) { addEventListener(k, function (e) { if (k !== 'keydown' || e.key === 'Escape') tipShow(null); }, true); });
  function tipNames(root) { [].forEach.call(root.querySelectorAll('[title]'), function (b) { var t = b.getAttribute('title'); if (!b.hasAttribute('aria-label')) b.setAttribute('aria-label', t); b.setAttribute('data-tip', t); b.removeAttribute('title'); }); }   // the name stays for screen readers

  /* the theme button shows what it switches to: a sun in dark mode, a moon in light mode; its tooltip says the same.
     (1.65.1) The day/night switch of 1.65.0 is gone again: the owner preferred the icon button. */
  function themeIcon() { return svg(themeNow() === 'light' ? ICON.moon : ICON.sun); }
  function themeLabel() { var n = themeNow() === 'light' ? 'Dark' : 'Light'; return 'Switch to ' + n + ' Mode'; }
  /* Logged in: Backup (green, red with a dot while a backup is due) and the gear that opens Settings. Logged out: the key. */
  function acctButtons(adm) {
    if (!adm) return iconBtn('login', 'Log In', toolTile('login', svg(ICON.key)), 'ix-key');
    var due = backupDue();
    return '<button type="button" class="ix-ib ix-bk' + (due ? ' due' : '') + '" data-ix="backup" aria-label="' + (due ? 'Backup (a backup is due)' : 'Backup') + '" title="' +
      (due ? 'A backup is due: open Backup' : 'Backup and Import') + '">' + toolTile(due ? 'due' : 'backup', svg(ICON.box)) + '</button><span class="ix-tdiv" aria-hidden="true"></span>' + iconBtn('account', HAS_EDIT ? 'Edit and Settings' : 'Settings', toolTile('account', svg(ICON.gear)));
  }
  /* (1.67.1) The logo and the site name lead to the start page, so the top bar and the sidebar leave Home out of the page list
     (the dock has no logo: it keeps Home). On the start page the logo is the current page. Built with DOM calls, so no name is
     ever pasted into markup. */
  function brandEl(inBar) {
    var a = document.createElement('a'), img = document.createElement('img'), name = document.createElement('span'), n = S.siteName || 'Homebase Hub';
    a.className = 'ix-brand'; a.href = ROOT; if (inBar) a.setAttribute('aria-label', n); if (APP === 'home') a.setAttribute('aria-current', 'page');
    img.className = 'ix-logo'; img.alt = ''; img.src = S.logo ? ROOT + S.logo : CORE + 'assets/brand/logo-192.png';   // your logo, or Homebase Hub's own
    if (inBar) name.className = 'ix-bname'; name.textContent = n;
    a.append(img, name); return a;
  }
  function fillBrand(root, inBar) { [].forEach.call(root.querySelectorAll('span[data-ix-brand]'), function (s) { s.replaceWith(brandEl(inBar)); }); }
  function listPages() { return pages().filter(function (p) { return p[0] !== 'home' || NAV() === 'dock'; }); }
  function pageLinks() {
    return '<div class="ix-links">' + listPages().map(function (p) {
      return '<a href="' + p[2] + '" data-page="' + p[0] + '" style="--c:' + pageColor(p[0]) + '"' + (p[0] === APP ? ' aria-current="page"' : '') + ' title="' + esc(p[1]) + '">' + pageIcon(p) + '<span>' + esc(p[1]) + '</span></a>';
    }).join('') + '<span class="ix-pline" aria-hidden="true"></span></div>';
  }
  function drawBar() {
    var bar = document.getElementById('ix-bar');
    cornerButton();
    if (!H.hasAttribute('data-ix-bar')) { if (bar) bar.remove(); lastBar = ''; glass(); return; }
    if (!document.body) return whenBody(drawBar);
    var adm = isAdmin(), nav = NAV();
    var brand = '<span data-ix-brand></span>';   // the logo and site name: brandEl() puts them in once the markup is in place
    var theme = iconBtn('theme', themeLabel(), toolTile('theme', themeIcon()));
    var edit = '';   // (1.79.1) the pencil is gone from the bar: the gear opens Edit This Page, the page's settings and Site Settings
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
        '<div class="ix-search" id="ix-sbox">' + svg(ICON.search) + '<input type="search" id="ix-q" placeholder="' + (matchMedia('(hover:hover) and (pointer:fine)').matches ? 'Search · ? Shortcuts' : 'Search') + '" autocomplete="off" spellcheck="false" aria-label="Search the Whole Site">' +
          '<button type="button" class="ix-fbtn" data-ix="filters" aria-label="Search Options" title="Search Options">' + svg(ICON.filter) + '</button><kbd>/</kbd></div>' +
        '<div class="ix-tools">' + iconBtn('search', 'Search', toolTile('search', svg(ICON.search)), 'ix-sbtn') + theme + edit + me + '</div>';
    }
    var key = html + '|' + (S.siteName || '') + '|' + (S.logo || '');   // a new name or logo draws the bar again too
    if (key === lastBar && bar) { glass(); return; }
    lastBar = key;
    if (!bar) { bar = document.createElement('div'); bar.id = 'ix-bar'; bar.setAttribute('role', 'navigation'); bar.setAttribute('aria-label', 'Site'); document.body.prepend(bar); }
    var q = document.getElementById('ix-q'), qv = q ? q.value : '', had = q && document.activeElement === q;
    bar.innerHTML = html;
    fillBrand(bar, true);
    bar.style.setProperty('--hc', pageColor(APP));
    placeLine();
    if (qv && (q = document.getElementById('ix-q'))) { q.value = qv; if (had) q.focus(); }
    bindInlineSearch();
    markEditing();
    tipNames(bar);
    glass();
  }
  /* (1.68.0) Bar Glass: the top bar, or the dock's pill, turns to glass (React Bits GlassSurface, glass.js, loaded only when it is on).
     Not for the sidebar. (1.68.1) It shows whenever it is switched on: Windows with Transparency effects off tells the browser to reduce
     transparency, and 1.68.0 then left the glass off although the owner had switched it on. */
  var glassP = null;
  function glass() {
    var bar = document.getElementById('ix-bar'), nav = NAV();
    var on = H.hasAttribute('data-ix-glass') && !!bar && nav !== 'side';
    var el = on ? (nav === 'dock' ? bar.querySelector('.ix-pill') : bar) : null;
    // (1.68.4) glass.js is wanted for the bar's glass, or for Liquid on the Home widgets (the start page) even without the bar's glass
    var fx = liquidHere ? gfx : Object.assign({}, gfx, { bend: 0, fringe: 0 });
    if (!el && !liquidHere) { if (window.HubGlass) { window.HubGlass.off(); window.HubGlass.set(fx); } return; }
    if (window.HubGlass) { if (el) window.HubGlass.apply(el); else window.HubGlass.off(); window.HubGlass.set(fx); return; }
    glassP = glassP || new Promise(function (ok) {
      var s = document.createElement('script'), ver = ((me && /\?v=[^&#]+/.exec(me.src)) || [''])[0];
      s.src = ASSETS + 'glass.js' + ver; s.onload = ok; s.onerror = function () { glassP = null; };
      document.head.appendChild(s);
    });
    glassP.then(function () { glass(); });   // looked at again once loaded: the setting or the bar may have changed meanwhile
  }
  /* (1.67.0) the line in the current page's colour: under it (top bar), beside it (sidebar) or above it (dock). It carries the view-transition
     name, so on browsers that slide between pages it glides over from the page you came from. */
  function placeLine() {
    var bar = document.getElementById('ix-bar'), links = bar && bar.querySelector('.ix-links'), line = links && links.querySelector('.ix-pline'), a = links && links.querySelector('a[aria-current="page"]');
    if (!line) return;
    if (!a || !a.offsetParent) { line.hidden = true; return; }
    line.hidden = false;
    var L = links.getBoundingClientRect(), A = a.getBoundingClientRect(), B = bar.getBoundingClientRect(), nav = NAV(), pill = bar.querySelector('.ix-pill');
    if (nav === 'side') { line.style.cssText = 'left:' + (B.left - L.left) + 'px;top:' + (A.top - L.top + 12) + 'px;width:3px;height:' + Math.max(8, A.height - 24) + 'px'; return; }
    var top = nav === 'dock' ? (pill ? pill.getBoundingClientRect().top : A.top - 6) - L.top : B.bottom - L.top - 3;
    line.style.cssText = 'left:' + (A.left - L.left + 10) + 'px;top:' + top + 'px;width:' + Math.max(8, A.width - 20) + 'px;height:3px';
  }
  addEventListener('resize', function () { placeLine(); });
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
    if (canEdit()) items.push(editing() ? { label: 'Done Editing', icon: ICON.check, accent: true, run: doneEdit } : { label: 'Edit This Page', icon: ICON.edit, tint: pageColor(APP), run: function () { startEdit(); } });
    itemEntries(b, t, true).forEach(function (x) { items.push(x); });
    items.push({ sep: true });
    pages().filter(function (p) { return p[0] !== APP; }).forEach(function (p) { items.push({ label: p[1], icon: p[3], run: function () { location.href = p[2]; } }); });
    items.push({ sep: true }, { label: 'Settings', icon: ICON.gear, run: function () { settings(); } }, { label: 'Log Out', icon: ICON.out, danger: true, run: logout });
    popMenu(b, items, { corner: true });
  }
  function markEditing() { var b = document.querySelector('#ix-bar [data-ix=account]'); if (b) b.classList.toggle('on', editing() && HAS_EDIT); drawEditBar(); }   // (1.79.1) the gear lights up while the page is being edited
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
    if (!S.admin || !backupDue() || APP === 'settings') return;   // same rule as the red icon; (1.61.6) not on Settings, whose menu already says when Backup is due
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
    fillBrand(d, false);
    d.classList.add('open');
    var f = d.querySelector('[aria-current="page"]') || d.querySelector('button,a'); if (f) setTimeout(function () { f.focus(); }, 30);
  }
  function drawer(open, from) {
    openPanel('ix-drawer', open, function (adm) {
      return '<div class="ix-scrim" data-ix="close"></div><nav aria-label="Pages"><span data-ix-brand></span>' +
        '<button type="button" class="ix-psearch" data-ix="search">' + svg(ICON.search) + '<span>Search</span></button>' +
        listPages().map(function (p) { return '<a href="' + p[2] + '" style="--c:' + pageColor(p[0]) + '"' + (p[0] === APP ? ' aria-current="page"' : '') + '>' + pageIcon(p) + esc(p[1]) + '</a>'; }).join('') +
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

