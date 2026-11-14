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
    if (!H.hasAttribute('data-ix-bar') || H.hasAttribute('data-ix-nohide')) return;   // (1.68.2) the bar can be set to stay put
    var t = e.target, el = (t === document || t === H || t === document.body) ? null : t;
    if (el && (el.nodeType !== 1 || el.clientHeight < innerHeight * 0.5 || el.closest('#ix-bar,#ix-pop,#ix-drawer,#ix-sheet,#ix-spot,.ix-panel,#ix-dlg,dialog'))) return;
    var box = el || window, y = el ? el.scrollTop : (window.scrollY || 0), prev = box.__ixY == null ? y : box.__ixY;
    box.__ixY = y;
    if (NAV() === 'dock') { H.classList.add('ix-scrolling'); clearTimeout(scrollT); scrollT = setTimeout(function () { H.classList.remove('ix-scrolling'); }, 240); }   // (1.71.0) only the dock shrinks
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
        (it.pageIcon ? '<svg viewBox="0 0 24 24" aria-hidden="true" style="color:' + pageColor(it.pageIcon) + '">' + PAGE_TILE[it.pageIcon][1] + '</svg>' : it.icon ? (it.tint ? svg(it.icon).replace('<svg ', '<svg style="color:' + it.tint + '" ') : svg(it.icon)) : '<span class="ix-gap"></span>') + '<span class="ix-pl">' + esc(it.label) + '</span>' +
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
  /* (1.77.2) like Magic UI's Animated Theme Toggler: the new theme grows as a circle from the button you pressed (from the middle without one) */
  function setTheme(t, from) {
    if (t !== 'light') t = 'dark';
    if (H.getAttribute('data-theme') === t && ls.get('hub-theme') === t) return;
    if (reduced()) return applyTheme(t);
    if (document.startViewTransition) {
      var r = from && from.getBoundingClientRect ? from.getBoundingClientRect() : null,
          x = r ? r.left + r.width / 2 : innerWidth / 2, y = r ? r.top + r.height / 2 : innerHeight / 2,
          rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      H.classList.add('ix-vt', 'ix-circ');
      var vt = document.startViewTransition(function () { applyTheme(t); });
      var done = function () { H.classList.remove('ix-vt', 'ix-circ'); };
      vt.ready.then(function () {
        H.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + rad + 'px at ' + x + 'px ' + y + 'px)'] }, { duration: 550, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' });
      }).catch(function () {});
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

