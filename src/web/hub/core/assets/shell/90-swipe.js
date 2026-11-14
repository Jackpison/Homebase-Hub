  /* ---------- 15. swipe gestures on a phone (1.59) ----------
     - swipe left or right: the next or previous page, in the order of the bar (Home, Links, Info, Cards, Tasks; Tools and
       Settings are left out: their own screens use sideways moves). 1.59.1: a swipe no longer changes Links' or Info's tabs;
     - Home: pull down from the top for the next background.
     Never while editing, in a window or menu, in a text field, on something that scrolls sideways, or with two fingers. */
  var SWIPE_APPS = ['home', 'links', 'info', 'cards', 'tasks', 'files'];
  function swipePages() { return pages().filter(function (p) { return SWIPE_APPS.indexOf(p[0]) >= 0 && (!p[4] || p[0] === APP); }); }
  function swipeTo(dir) { var list = swipePages(), at = list.findIndex(function (p) { return p[0] === APP; }); return at < 0 ? null : list[at + dir] || null; }
  function swipePage(dir) {
    var to = swipeTo(dir); if (!to) return false;
    try { sessionStorage.setItem('ix-swd', (dir > 0 ? 'n' : 'p') + ':' + Date.now()); } catch (e) {}   // the new page slides in from that side
    location.href = to[2]; return true;
  }
  /* the quick checks, made when a finger touches down: editing, a window open, a field or the bar under the finger */
  function swipeQuick(t) {
    if (editing() || document.querySelector('dialog[open], #ix-dlg.open, #ix-pop, #ix-drawer.open, #ix-sheet.open, .wpanel:not([hidden])')) return true;
    return !t || !t.closest || !!t.closest('input, textarea, select, [contenteditable], #ix-bar, #ix-ebar, [data-no-swipe], .grip, .lgrip');
  }
  /* something under the finger scrolls sideways itself (a wide table, a strip of chips). (1.71.0) Asked only once the finger moves
     sideways, not on every touch: it reads the style of each box up the page. */
  function swipeScrolls(t) {
    for (var e = t; e && e !== document.body; e = e.parentElement) {
      if (e.scrollWidth > e.clientWidth + 4 && /(auto|scroll)/.test(getComputedStyle(e).overflowX)) return true;
    }
    return false;
  }
  function swipeBlocked(t) { return swipeQuick(t) || swipeScrolls(t); }
  /* (1.71.0) The page follows the finger: everything on the page moves except the bar, the edit bar and windows. Let go past a third
     of the screen (or with a quick flick) and it slides away while the next page slides in (shell.css); not far enough, it springs
     back. With no page that way it only gives a little. Reduce Motion: nothing moves under the finger, and the page changes with a fade. */
  var SWIPE_SKIP = '#ix-bar,#ix-ebar,#ix-toast,#ix-dlg,#ix-pop,#ix-drawer,#ix-sheet,#ix-spot,#ix-ebtip,#ix-sfoot,script,style,link,template,dialog';
  function swipeLayers() { return [].filter.call(document.body.children, function (e) { return !e.matches(SWIPE_SKIP); }); }
  function swipeMove(els, x, ms) {
    els.forEach(function (e) { e.style.transition = ms ? 'transform ' + ms + 'ms cubic-bezier(.2,.8,.2,1)' : 'none'; e.style.transform = x ? 'translate3d(' + x + 'px,0,0)' : ''; });
  }
  function swipeClear(els) { els.forEach(function (e) { e.style.transition = ''; e.style.transform = ''; e.style.willChange = ''; }); H.classList.remove('ix-swiping'); }
  function swipes() {
    if (!matchMedia('(pointer: coarse)').matches || SWIPE_APPS.indexOf(APP) < 0) return;
    var g = null;   // the gesture: where it started, its mode (wait, drag, flick, vert, off), the layers that move
    if (APP === 'home') H.style.overscrollBehaviorY = 'none';   // Home's pull-down is ours (the browser's own pull-to-reload would reload instead)
    var reduce = function () { return matchMedia('(prefers-reduced-motion: reduce)').matches; };
    var back = function (gg) { if (gg.raf) cancelAnimationFrame(gg.raf); swipeMove(gg.els, 0, 220); setTimeout(function () { swipeClear(gg.els); }, 240); };
    document.addEventListener('touchstart', function (e) {
      if (g && g.mode === 'drag') back(g);
      g = e.touches.length !== 1 || swipeQuick(e.target) ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now(), top: (window.scrollY || 0) <= 0, el: e.target, mode: 'wait', dx: 0 };
    }, { passive: true });
    document.addEventListener('touchmove', function (e) {
      if (!g || g.mode === 'off' || g.mode === 'vert') return;
      if (e.touches.length !== 1) { if (g.mode === 'drag') back(g); g = null; return; }
      var dx = e.touches[0].clientX - g.x, dy = e.touches[0].clientY - g.y;
      if (g.mode === 'wait') {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        if (Math.abs(dx) < Math.abs(dy) * 1.5) { g.mode = 'vert'; return; }
        if (swipeScrolls(g.el) || (window.getSelection && String(window.getSelection()).length)) { g.mode = 'off'; return; }
        if (reduce()) { g.mode = 'flick'; return; }
        g.mode = 'drag'; g.els = swipeLayers(); g.els.forEach(function (x) { x.style.willChange = 'transform'; }); H.classList.add('ix-swiping');
      }
      if (g.mode !== 'drag') return;
      g.dx = dx; var gg = g;
      if (!gg.raf) gg.raf = requestAnimationFrame(function () { gg.raf = 0; swipeMove(gg.els, swipeTo(gg.dx < 0 ? 1 : -1) ? gg.dx : gg.dx * 0.25, 0); });
    }, { passive: true });
    document.addEventListener('touchcancel', function () { if (g && g.mode === 'drag') back(g); g = null; }, { passive: true });
    document.addEventListener('touchend', function (e) {
      var gg = g; g = null;
      if (!gg || gg.mode === 'off' || !e.changedTouches.length) return;
      var dx = e.changedTouches[0].clientX - gg.x, dy = e.changedTouches[0].clientY - gg.y, dt = Math.max(1, Date.now() - gg.t), dir = dx < 0 ? 1 : -1;
      if (gg.mode === 'drag') {
        if (gg.raf) { cancelAnimationFrame(gg.raf); gg.raf = 0; }
        var w = innerWidth || 390, go = swipeTo(dir) && (Math.abs(dx) > w * 0.33 || (Math.abs(dx) > 50 && Math.abs(dx) / dt > 0.45));
        if (!go) { back(gg); return; }
        swipeMove(gg.els, dir > 0 ? -w : w, 170);
        setTimeout(function () { swipePage(dir); }, 150);
        return;
      }
      if (dt > 700 || (window.getSelection && String(window.getSelection()).length)) return;
      if (gg.mode === 'flick') { if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) swipePage(dir); return; }
      if (APP === 'home' && gg.top && dy > 90 && dy > Math.abs(dx) * 2) {
        var nb = document.getElementById('nextBg'); if (nb && nb.offsetParent !== null) nb.click();
      }
    }, { passive: true });
    // back to this page from the browser's memory (Back after a swipe): the page is still slid away, so put it back
    addEventListener('pageshow', function (e) { if (e.persisted) swipeClear(swipeLayers()); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', swipes); else swipes();
  window.__hubSwipe = { page: swipePage, pages: function () { return swipePages().map(function (p) { return p[0]; }); }, blocked: swipeBlocked };   // for the tests

  whenBody(function () { drawBar(); });                 // the bar is there on the very first paint
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

