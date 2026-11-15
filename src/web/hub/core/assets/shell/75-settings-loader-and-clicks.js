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
    if (k === 'theme') { if (inPanel) closePanels(); return setTheme(themeNow() === 'light' ? 'dark' : 'light', inPanel ? null : b); }
    if (k === 'login') return login().then(function () { location.reload(); }, function () {});
    if (k === 'logout') return logout();
    if (k === 'search') { closePanels(); return openSpot(); }
    if (k === 'filters') return toggleFilters(b);
    if (k === 'backup') { closePanels(); backupSeen(); return openBackup(); }
    if (k === 'corner') return cornerMenu(b);
    if (k === 'edit') return whenKnown(function () { if (!S.admin && canEdit()) { closePanels(); return startEdit(); } editMenu(b); });
    if (k === 'account') { closePanels(); return HAS_EDIT && !inPanel ? gearMenu(b) : settings(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !popEl) closePanels(); });


  /* what shell-admin.js may use (it holds this same S object, so it always sees the current state) */
  window.__ixShell = { S: S, esc: esc, toast: toast, noteLog: noteLogGet, noteLogClear: noteLogClear, noteTile: noteTile, noteKind: noteKind, noteLabel: function (k) { return NOTE_LABEL[k] || 'Done'; }, legacyCopy: legacyCopy, api: api, ICON: ICON, dollar: $, svg: svg, drawBar: drawBar, redraw: function () { lastBar = ''; drawBar(); },
    remember: remember, applySizes: applySizes, APP: APP, openDlg: openDlg, closeDlg: closeDlg, login: login, ROOT: ROOT, applyFont: applyFont,
    applyColors: applyColors, applyAttrs: applyAttrs, PG_APPS: PG_APPS, CORE: CORE, ASSETS: ASSETS, COLOR_DEFAULT: COLOR_DEFAULT, setTheme: setTheme, pageList: pageList,
    applyFavicon: applyFavicon, SIZE_SPEC: SIZE_SPEC, PAGE_DEF: PAGE_DEF, FONTS: FONTS, COLOR_KEYS: COLOR_KEYS, when: when, previewWith: previewWith,
    previewTheme: previewTheme, restoreTheme: restoreTheme, storeTheme: storeTheme, resolveTheme: resolveTheme,
    stepper: stepper, linkField: linkField, offline: function () { return offline; }, pageColor: pageColor, pageTile: function (id) { var x = PAGE_TILE[id]; return x ? '<svg viewBox="0 0 24 24">' + x[1] + '</svg>' : ''; } };

