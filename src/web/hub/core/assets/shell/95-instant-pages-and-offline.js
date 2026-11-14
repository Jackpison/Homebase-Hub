  /* ---------- (1.72.0) Instant pages: each page keeps the last data it got from the server in this browser tab (sessionStorage), and
     shows it at once on the next visit while the fresh data loads. Only what the page got while you were logged in; locked tabs and
     locked Cards stay locked in it (scrambled, as the server sends them). It is gone when the tab closes, and Log Out clears it.
     While the old copy is on screen (html.ix-stale) the pencil waits: nothing can be edited until the fresh data is in. ---------- */
  var snap = {
    get: function (app) { try { var v = JSON.parse(sessionStorage.getItem('hub-snap-' + app) || 'null'); return v && v.d ? v.d : null; } catch (e) { return null; } },
    put: function (app, d) {
      try { if (d == null) sessionStorage.removeItem('hub-snap-' + app); else sessionStorage.setItem('hub-snap-' + app, JSON.stringify({ t: Date.now(), d: d })); }
      catch (e) { try { sessionStorage.removeItem('hub-snap-' + app); } catch (x) {} }   // too big for this browser: no copy, the page just loads as before
    },
    stale: function (on) { H.classList.toggle('ix-stale', !!on); }
  };
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-hub=toggle]') : null;
    if (!t || editing()) return;
    var off = H.classList.contains('ix-offline');
    if (!off && !H.classList.contains('ix-stale')) return;
    e.preventDefault(); e.stopImmediatePropagation();
    toast(off ? 'You are offline: editing comes back when you are online.' : 'Loading the latest version first…');
  }, true);

  /* ---------- (1.72.0) Offline Reading: a switch per device (Settings > Overview > Start Here), off by default. On, a service worker
     (assets/offline-sw.js, served by api.php?action=sw so it may look after the whole site) keeps the pages and their last data in this
     browser, and shows them, read-only, when there is no connection. Log Out deletes the copy; switching it off deletes it and the worker. */
  var OFF_KEY = 'hub-offline';
  var offline = {
    can: function () { return 'serviceWorker' in navigator && !!window.isSecureContext && !!window.caches; },
    on: function () { return ls.get(OFF_KEY) === '1'; },
    start: function () {
      if (!offline.can()) return Promise.resolve(false);
      return navigator.serviceWorker.register(CORE + 'api.php?action=sw', { scope: ROOT }).then(function () { return true; }, function () { return false; });
    },
    stop: function () {
      var p = [];
      if ('serviceWorker' in navigator) p.push(navigator.serviceWorker.getRegistrations().then(function (rs) {
        return Promise.all(rs.filter(function (r) { var w = r.active || r.waiting || r.installing; return w && /api\.php\?action=sw$/.test(w.scriptURL); }).map(function (r) { return r.unregister(); }));
      }));
      if (window.caches) p.push(caches.delete('hub-offline'));
      return Promise.all(p).then(function () { return true; }, function () { return false; });
    },
    set: function (v) { ls.set(OFF_KEY, v ? '1' : null); return v ? offline.start().then(function (ok) { if (ok) offlineKeepPage(); return ok; }) : offline.stop(); },
    count: function () { return window.caches ? caches.open('hub-offline').then(function (c) { return c.keys(); }).then(function (k) { return k.length; }, function () { return 0; }) : Promise.resolve(0); }
  };
  /* no connection (the browser says so, or the worker had to show its copy): a note at the top, and editing waits (see the click guard above) */
  function offlineNote(on) {
    var was = H.classList.contains('ix-offline'); if (was === on) return;
    H.classList.toggle('ix-offline', on);
    var n = document.getElementById('ix-offl');
    if (on && !n && document.body) {
      n = document.createElement('div'); n.id = 'ix-offl'; n.setAttribute('role', 'status');
      n.textContent = 'Offline: showing your last copy. Changes can’t be saved until you are back online.';
      document.body.appendChild(n);
    } else if (!on && n) n.remove();
    clearTimeout(backTimer);
    if (was && !on) backTimer = setTimeout(function () {   // back online: the page fetches everything fresh, once the connection has held for a moment (1.73.2: a flicker, or an "online" the browser reports too early, must not reload a page you are leaving)
      if (navigator.onLine !== false && !H.classList.contains('ix-offline') && !editing()) location.reload();
    }, 1500);
  }
  var backTimer = 0;
  addEventListener('offline', function () { offlineNote(true); });
  addEventListener('online', function () { offlineNote(false); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', function (e) { if (e.data && e.data.hub === 'offline') offlineNote(true); });
  /* the worker may have started after this page loaded (the page where it was switched on, or a slow start): hand it what the page loaded */
  function offlineKeepPage() {
    navigator.serviceWorker.ready.then(function (reg) {
      var more = (performance.getEntriesByType ? performance.getEntriesByType('resource') : []).map(function (e) { return e.name; })
        .filter(function (n) { return n.indexOf(location.origin + '/') === 0; });
      if (reg.active) reg.active.postMessage({ keep: { page: location.href.split('#')[0], more: more } });
    }).catch(function () {});
  }
  function offlineStart() {
    if (navigator.onLine === false) offlineNote(true);
    if (offline.on()) offline.start().then(function (ok) { if (ok) offlineKeepPage(); });
    else if ('serviceWorker' in navigator && navigator.serviceWorker.controller && /api\.php\?action=sw$/.test(navigator.serviceWorker.controller.scriptURL)) offline.stop();   // switched off in another tab
  }

  window.HUB = {
    app: APP, state: function () { return S; }, login: login, logout: logout, settings: settings, toast: toast, undo: function (msg, run) { toast(msg, false, false, { label: 'Undo', run: run }); }, theme: themeNow, setTheme: setTheme,
    isAdmin: function () { return !!S.admin; }, ready: function () { return refresh(); }, fetch: hubFetch, esc: esc, isHex: isHex,
    bufB64u: bufB64u, b64uBuf: b64uBuf, bookmarksHtml: bookmarksHtml,   // (1.61.0) for the passkey screens of Settings
    api: api,   // (1.60) the core API with the security token, for pages without their own (Tools' presets)
    stepper: stepper,   // (1.69.0) a flow of a few steps (Links import, Files share, the Home tour)
    linkField: linkField, linkValue: linkValue, linkSet: linkSet,   // (1.69.1) the link field (Links, Files share, Settings)
    findHook: function (fn) { FIND_HOOK = typeof fn === 'function' ? fn : null; },
    // (1.72.0) the Import Center hands what you chose to the page it goes to (sessionStorage, read once): Tasks, Info, Links or Cards
    importTake: function (to) {
      if (location.hash !== '#hub-import') return null;
      var p = null; try { p = JSON.parse(sessionStorage.getItem('hub-import') || 'null'); } catch (e) { p = null; }
      if (!p || p.to !== to) return null;
      try { sessionStorage.removeItem('hub-import'); history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
      return p;
    },   // (1.72.0) a page adds what only it can read (unlocked tabs) to the search
    snap: snap,   // (1.72.0) instant pages: the last data of a page in this tab
    /* (1.65.1) A page that needs the login (Settings when logged out): a card with the site's logo, a line and the Log In button, on a
       faint dot grid. One copy for every such page, styled by shell.css, so it never falls back to the browser's own grey button. */
    gate: function (host, title, text) {   // built from elements (textContent), so nothing is read as HTML
      var el = function (tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; };
      var wrap = el('div', 'ix-gate'), card = el('div', 'ix-gcard'), img = el('img', 'ix-llogo'), btn = el('button', 'ix-btn pri ix-wide');
      img.alt = ''; img.src = S.logo ? ROOT + S.logo : CORE + 'assets/brand/logo-192.png';
      btn.type = 'button'; btn.id = 'ix-glg'; var NS = 'http://www.w3.org/2000/svg', ic = document.createElementNS(NS, 'svg'), pa = document.createElementNS(NS, 'path'); ic.setAttribute('viewBox', '0 0 24 24'); ic.setAttribute('aria-hidden', 'true'); pa.setAttribute('d', ICON.key); ic.appendChild(pa); btn.appendChild(ic); btn.appendChild(document.createTextNode(' Log In'));
      btn.onclick = function () { login().then(function () { location.reload(); }, function () {}); };
      card.append(img, el('h1', '', title), el('p', '', text), btn); wrap.appendChild(card);
      host.replaceChildren(wrap);
    },
    showKeys: function () { showKeys(); },   // (1.65.1) Settings > General opens the list too
    mountSettings: function (host, hash) { return adminJs().then(function (m) { m.mount(host, hash); }); },   // the Settings page hands its element to the admin part
    tz: function () { return S.tz || 'Asia/Kolkata'; },   // the site's time zone (Settings > General)
    settingsWindow: function (d) { d.classList.add('ix-sdlg'); sdlgBuild(d); },
    /* (1.65.0) Numbers roll up to their value when a page opens (about 0.6 s): the first number in each element, in its own format (Indian or
       Western digit groups, decimals, a currency sign or a unit around it). Reduce motion, or a number that is not shown: no animation. */
    countUp: function (els) {
      if (reduced()) return;
      [].forEach.call(els || [], function (el) {
        var tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n, m;
        while ((n = tw.nextNode())) if ((m = /\d[\d,]*(?:\.\d+)?/.exec(n.nodeValue))) break;
        if (!n || !m || !el.offsetParent) return;
        var raw = m[0], to = parseFloat(raw.replace(/,/g, '')), dec = (raw.split('.')[1] || '').length;
        var loc = /,/.test(raw) ? (/\d,\d{2},\d{3}/.test(raw) ? 'en-IN' : 'en-US') : null, pre = n.nodeValue.slice(0, m.index), post = n.nodeValue.slice(m.index + raw.length);
        var fmt = function (v) { return loc ? v.toLocaleString(loc, { minimumFractionDigits: dec, maximumFractionDigits: dec }) : v.toFixed(dec); };
        if (!(to > 0)) return;
        var t0 = performance.now(), node = n;
        (function step(t) {
          var k = Math.min(1, (t - t0) / 600), e = 1 - Math.pow(1 - k, 3);
          node.nodeValue = pre + fmt(k < 1 ? (dec ? to * e : Math.round(to * e)) : to) + post;
          if (k < 1) requestAnimationFrame(step); else node.nodeValue = pre + raw + post;
        })(t0);
      });
    },
    watchSave: function (d) { sdlgWatch(d, function () { return d.querySelector('.ix-sf .pri,.act .pri'); }); },   // (1.64.3) Files draws its Settings window itself, each time it opens
    settingsRows: function (body, heads) { sdlgDecorate(body, heads || 'h3,h4'); }   // (1.61.6) cards and tiles for a body a page draws itself (Files Settings)   // (1.61.6) a Settings window made later by a page (Import and Export, Files Settings) gets the same look
  };
})();
