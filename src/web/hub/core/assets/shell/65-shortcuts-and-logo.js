  /* ---------- 7a. keyboard shortcuts (1.61.0) ----------
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
    openDlg('<div class="ix-ico">' + svg(ICON.keyboard) + '</div><h2>Keyboard Shortcuts</h2>' +
      '<div class="ix-keys" tabindex="0" role="region" aria-label="Keyboard shortcuts"><h3>Anywhere</h3>' + row(kbd('/') + ' or ' + kbd('Ctrl K'), 'Search the site') + row(kbd('?'), 'Show this list') + row(kbd('Esc'), 'Close a window') +
      (S.admin ? row(kbd('E'), 'Edit this page (or open the gear menu)') : '') + (SWIPE_APPS.indexOf(APP) >= 0 ? row(kbd('[') + ' and ' + kbd(']'), 'The page before or after (like a swipe on a phone)') : '') +
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
    if ((k === '[' || k === ']') && SWIPE_APPS.indexOf(APP) >= 0 && !e.ctrlKey && !e.metaKey && !e.altKey) { if (swipePage(k === ']' ? 1 : -1)) { e.preventDefault(); return; } }   // (1.72.0) like a swipe
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

