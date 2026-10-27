/* Homebase Hub website: small interactions. Every page works without this file; it only adds the tabs, the look picker,
   the example Telegram chat, the tool finder and the question search. No requests, no trackers. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function all(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }

  /* Tabs: the tour and the phone steps. Arrow keys, Home and End move between tabs; a link like #p-tasks opens that tab. */
  all('[role=tablist]').forEach(function (list) {
    var tabs = all('[role=tab]', list);
    function show(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab, p = d.getElementById(t.getAttribute('aria-controls'));
        t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1;
        if (p) p.hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { show(t); });
      t.addEventListener('keydown', function (ev) {
        var k = ev.key, n = k === 'ArrowRight' ? i + 1 : k === 'ArrowLeft' ? i - 1 : k === 'Home' ? 0 : k === 'End' ? tabs.length - 1 : -1;
        if (n < 0) return; ev.preventDefault(); show(tabs[(n + tabs.length) % tabs.length], true);
      });
    });
    function fromHash() {
      var h = location.hash.slice(1), t = tabs.filter(function (x) { return x.getAttribute('aria-controls') === h; })[0];
      if (t) { show(t); return true; } return false;
    }
    var opened = fromHash();
    if (!opened) show(tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0]);
    else { var el = d.getElementById(location.hash.slice(1)); if (el) setTimeout(function () { el.scrollIntoView(); }, 60); }
    window.addEventListener('hashchange', fromHash);
  });

  /* Look picker: changes the colour of the buttons and highlights across the whole site, and remembers it. */
  var looks = all('.look');
  function setLook(n) {
    if (n === 'gold') delete root.dataset.look; else root.dataset.look = n;
    looks.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.look === (root.dataset.look || 'gold') ? 'true' : 'false'); });
  }
  looks.forEach(function (b) { b.addEventListener('click', function () { setLook(b.dataset.look); try { localStorage.setItem('hh-look', b.dataset.look); } catch (e) {} }); });
  if (looks.length) setLook(root.dataset.look || 'gold');

  /* Example Telegram chat: tap a command, see a made-up reply. */
  var chat = d.getElementById('chat');
  if (chat) {
    var add = function (who, text) { var m = d.createElement('div'); m.className = 'msg ' + who; m.textContent = text; chat.appendChild(m); chat.scrollTop = chat.scrollHeight; };
    all('.cmd').forEach(function (b) {
      b.addEventListener('click', function () { add('me', b.dataset.cmd); setTimeout(function () { add('bot', b.dataset.reply); }, reduce ? 0 : 350); });
    });
  }

  /* Tool finder: search and category chips filter the list of tools. */
  var q = d.getElementById('tf-q');
  if (q) {
    var tools = all('.tool'), btns = all('.chipbtn'), count = d.getElementById('tf-count'), none = d.getElementById('tf-none'), cat = 'all';
    var run = function () {
      var s = q.value.trim().toLowerCase(), n = 0;
      tools.forEach(function (t) { var ok = (cat === 'all' || t.dataset.cat === cat) && (!s || t.dataset.text.indexOf(s) > -1); t.hidden = !ok; if (ok) n++; });
      count.textContent = n + (n === 1 ? ' tool' : ' tools'); none.hidden = n > 0;
    };
    btns.forEach(function (b) { b.addEventListener('click', function () { cat = b.dataset.cat; btns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); run(); }); });
    q.addEventListener('input', run); run();
  }

  /* Question search on the FAQ page. */
  var fq = d.getElementById('faq-q');
  if (fq) {
    var items = all('.faq details'), fc = d.getElementById('faq-count'), fn = d.getElementById('faq-none');
    var frun = function () {
      var s = fq.value.trim().toLowerCase(), n = 0;
      items.forEach(function (it) { var ok = !s || it.textContent.toLowerCase().indexOf(s) > -1; it.hidden = !ok; if (ok) n++; });
      fc.textContent = n + (n === 1 ? ' answer' : ' answers'); fn.hidden = n > 0;
    };
    fq.addEventListener('input', frun); frun();
  }

  /* Screenshots page: Dark or Light pictures, and a click shows a picture full size (arrow keys for the next one, Escape closes). */
  var lb = d.getElementById('lb');
  if (lb && lb.showModal) {
    var zooms = all('.zoom'), cur = -1, lbImg = lb.querySelector('img'), lbCap = lb.querySelector('p');
    var visible = function () { return zooms.filter(function (z) { return !z.closest('[hidden]'); }); };
    var open = function (z) {
      var list = visible(); cur = list.indexOf(z); var im = z.querySelector('img');
      lbImg.src = im.currentSrc || im.src; lbImg.alt = im.alt; lbCap.textContent = z.parentNode.querySelector('figcaption').firstChild.textContent;
      if (!lb.open) lb.showModal();
    };
    var step = function (by) { var list = visible(); if (!list.length) return; open(list[(cur + by + list.length) % list.length]); };
    zooms.forEach(function (z) { z.addEventListener('click', function (ev) { ev.preventDefault(); open(z); }); });
    lb.querySelector('.lbx').addEventListener('click', function () { lb.close(); });
    lb.querySelector('.lbp').addEventListener('click', function () { step(-1); });
    lb.querySelector('.lbn').addEventListener('click', function () { step(1); });
    lb.addEventListener('click', function (ev) { if (ev.target === lb) lb.close(); });
    lb.addEventListener('keydown', function (ev) { if (ev.key === 'ArrowRight') step(1); if (ev.key === 'ArrowLeft') step(-1); });
    all('[data-theme-shots]').forEach(function (b) {
      b.addEventListener('click', function () {
        var light = b.dataset.themeShots === 'light';
        all('[data-theme-shots]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        all('.zoom[data-light]').forEach(function (z) {
          var im = z.querySelector('img'); if (!z.dataset.dark) { z.dataset.dark = z.getAttribute('href'); z.dataset.darkSet = im.getAttribute('srcset') || ''; }
          var src = light ? z.dataset.light : z.dataset.dark; z.setAttribute('href', src); im.src = src;
          if (light) im.removeAttribute('srcset'); else if (z.dataset.darkSet) im.setAttribute('srcset', z.dataset.darkSet);
        });
      });
    });
  }

  /* The shapes behind the top section shift a little with the mouse, and a soft glow follows it. Only with a mouse, and not for reduced motion. */
  var shapes = d.querySelector('.shapes'), hero = shapes && shapes.parentNode;
  if (shapes && !reduce && window.matchMedia && matchMedia('(pointer: fine)').matches) {
    var glow = shapes.querySelector('.glowm'), parts = all('.sh'), tx = .5, ty = .4, cx = .5, cy = .4, running = false;
    var frame = function () {
      cx += (tx - cx) * .06; cy += (ty - cy) * .06; var r = hero.getBoundingClientRect();
      glow.style.transform = 'translate(' + (cx * r.width - 170) + 'px,' + (cy * r.height - 170) + 'px)';
      parts.forEach(function (p) { var k = +p.dataset.d; p.style.transform = 'translate(' + ((cx - .5) * -26 * k) + 'px,' + ((cy - .5) * -20 * k) + 'px)'; });
      if (Math.abs(tx - cx) + Math.abs(ty - cy) > .001) requestAnimationFrame(frame); else running = false;
    };
    hero.addEventListener('pointermove', function (ev) {
      var r = hero.getBoundingClientRect(); tx = (ev.clientX - r.left) / r.width; ty = (ev.clientY - r.top) / r.height; glow.classList.add('on');
      if (!running) { running = true; requestAnimationFrame(frame); }
    });
    hero.addEventListener('pointerleave', function () { glow.classList.remove('on'); });
  }

  /* The header slides away while you scroll down and comes back on any scroll up or near the top, like the Top Bar in the app.
     It stays while the phone menu is open or something in it has focus. */
  var top = d.querySelector('.top');
  if (top) {
    var lastY = window.scrollY || 0;
    window.addEventListener('scroll', function () {
      var y = window.scrollY || 0, dy = y - lastY; lastY = y;
      var keep = top.contains(d.activeElement) || !!d.querySelector('.mm[open]');
      if (y < 80 || dy < -4 || keep) root.classList.remove('hh-hide');
      else if (dy > 6) root.classList.add('hh-hide');
    }, { passive: true });
    top.addEventListener('focusin', function () { root.classList.remove('hh-hide'); });
  }
})();
