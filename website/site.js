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
})();
