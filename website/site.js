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
  /* Home: the hero stage (a browser and a phone that walk through the pages), the tour that stays while the text changes, the scroll effects. */
  var stage = d.querySelector('.lp-stage');
  if (stage) {
    var lt = function () { var t = root.dataset.theme; return t ? t === 'light' : !!(window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches); };
    var swapAll = function () {   /* the pictures that have a light copy show it in light mode */
      all('img[data-light]').forEach(function (im) {
        if (!im.dataset.dark) { im.dataset.dark = im.getAttribute('src'); im.dataset.darkSet = im.getAttribute('srcset') || ''; }
        if (lt()) { im.removeAttribute('srcset'); im.setAttribute('src', im.dataset.light); } else { if (im.dataset.darkSet) im.setAttribute('srcset', im.dataset.darkSet); im.setAttribute('src', im.dataset.dark); }
      });
    };
    swapAll(); new MutationObserver(swapAll).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    if (window.matchMedia) matchMedia('(prefers-color-scheme: light)').addEventListener('change', swapAll);

    var frame = stage.querySelector('.lp-frame'), tabs = all('.lp-frame .lp-tab'), shots = all('.lp-frame .lp-shots img'), ptabs = all('.lp-ptabs .lp-tab'), dev = all('.lp-dev img'), small = stage.querySelector('.lp-phone img');
    var view = 'd', cd = 0, cp = 0, timer = 0;
    function mark(list, pics, n) { list.forEach(function (b, i) { b.setAttribute('aria-selected', i === n ? 'true' : 'false'); b.tabIndex = i === n ? 0 : -1; }); pics.forEach(function (im, i) { im.classList.toggle('on', i === n); }); }
    function showD(n) {
      cd = n; mark(tabs, shots, n);
      var k = ['m-home', 'm-links', 'm-info', null, 'm-tasks', null, 'm-tools'][n];
      if (k && small.getAttribute('src').indexOf(k) < 0) { small.style.opacity = 0; setTimeout(function () { small.setAttribute('src', 'img/' + k + '.webp'); small.style.opacity = 1; }, 220); }
    }
    function showP(n) { cp = n; mark(ptabs, dev, n); }
    function restart() {
      clearInterval(timer); stage.classList.toggle('lp-paused', reduce); if (reduce) return;
      var a = tabs[cd]; if (a) { a.style.animation = 'none'; void a.offsetWidth; a.style.animation = ''; }
      timer = setInterval(function () { if (view === 'd') showD((cd + 1) % tabs.length); else showP((cp + 1) % ptabs.length); }, 4400);
    }
    function setView(v) {
      view = v; stage.dataset.view = v;
      all('.lp-vsw button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.v === v ? 'true' : 'false'); });
      restart();
    }
    tabs.forEach(function (b, i) { b.addEventListener('click', function () { showD(i); restart(); }); });
    ptabs.forEach(function (b, i) { b.addEventListener('click', function () { showP(i); restart(); }); });
    all('.lp-vsw button').forEach(function (b) { b.addEventListener('click', function () { setView(b.dataset.v); }); });
    showD(0); showP(0); setView(window.matchMedia && matchMedia('(max-width: 700px)').matches ? 'p' : 'd');
    d.addEventListener('visibilitychange', function () { if (d.hidden) clearInterval(timer); else restart(); });
    if (!reduce && window.matchMedia && matchMedia('(hover: hover)').matches) {
      stage.addEventListener('pointermove', function (e) { if (view !== 'd') return; var r = stage.getBoundingClientRect(); frame.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 7 + 'deg'); frame.style.setProperty('--rx', ((e.clientY - r.top) / r.height - .5) * -6 + 'deg'); });
      stage.addEventListener('pointerleave', function () { frame.style.setProperty('--ry', '0deg'); frame.style.setProperty('--rx', '0deg'); });
    }

    /* the tour: the page in view follows the scroll, and the picture and the text change together */
    var story = d.querySelector('.lp-story'), steps = all('.lp-step'), tpics = all('.lp-stick .lp-shots img'), tcur = -1, ttick = 0;
    story.style.setProperty('--n', steps.length);
    function tour(n) { tcur = n; steps.forEach(function (s, i) { s.classList.toggle('on', i === n); }); tpics.forEach(function (im, i) { im.classList.toggle('on', i === n); }); }
    function place() {
      ttick = 0; if (window.innerWidth <= 960) return;
      var r = story.getBoundingClientRect(), n = Math.max(0, Math.min(steps.length - 1, Math.floor(-r.top / (window.innerHeight * .55) + .5)));
      if (n !== tcur) tour(n);
    }
    window.addEventListener('scroll', function () { if (!ttick) ttick = requestAnimationFrame(place); }, { passive: true });
    window.addEventListener('resize', place);
    var hs = location.hash.match(/^#p-([a-z]+)$/), hi = hs ? steps.map(function (s) { return s.id; }).indexOf('p-' + hs[1]) : -1;
    if (hi > 0 && window.innerWidth > 960) { tour(hi); setTimeout(function () { window.scrollTo(0, story.getBoundingClientRect().top + window.scrollY + hi * window.innerHeight * .55 + 4); }, 60); } else place();

    /* things appear as they scroll into view; the numbers count up; the paragraph fills in; a bar shows how far down you are */
    var prog = d.querySelector('.lp-prog'), sc = d.getElementById('lp-scrub'), words = [];
    if (sc) { var wl = sc.textContent.trim().split(/\s+/); sc.textContent = ''; wl.forEach(function (w, i) { var s = d.createElement('span'); s.textContent = w + (i < wl.length - 1 ? ' ' : ''); sc.appendChild(s); words.push(s); }); }
    var rv = all('.s .card, .s .moment, .s .stat, .s .intro, .s h2, .s .tg > *, .band > *').filter(function (n) { return !n.closest('.lp-story'); });
    if ('IntersectionObserver' in window && !reduce) {
      rv.forEach(function (n) { n.classList.add('lp-rv'); });
      var ro = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); } }); }, { threshold: .12 });
      rv.forEach(function (n) { ro.observe(n); });
      setTimeout(function () { rv.forEach(function (n) { n.classList.add('in'); }); }, 6000);
    }
    all('.stat b[data-n]').forEach(function (el) {
      var to = +el.dataset.n; if (reduce || !to || !('IntersectionObserver' in window)) return;
      var co = new IntersectionObserver(function (es) { if (!es[0].isIntersecting) return; co.disconnect(); var t0 = performance.now(); (function f(t) { var p = Math.min(1, (t - t0) / 1300); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); })(t0); }, { threshold: .6 });
      co.observe(el);
    });
    var stick = 0;
    function onScroll() {
      stick = 0; var h = root.scrollHeight - window.innerHeight, y = window.scrollY;
      if (prog) prog.style.setProperty('--p', h > 0 ? Math.min(1, y / h) : 0);
      if (sc && words.length) { var r = sc.getBoundingClientRect(), p = Math.min(1, Math.max(0, (window.innerHeight * .82 - r.top) / (r.height + window.innerHeight * .3))); words.forEach(function (s, i) { s.classList.toggle('on', i / words.length < p || reduce); }); }
    }
    window.addEventListener('scroll', function () { if (!stick) stick = requestAnimationFrame(onScroll); }, { passive: true }); onScroll();
  }
})();
