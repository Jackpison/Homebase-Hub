  /* ---------- 2. small helpers ---------- */
  /* fetch that does not give up on a slow host: a generous timeout, and a quiet retry after a short pause when the connection
     fails or a gateway times out (GET: also on 502/503/504/524; other methods: only when nothing reached the server). */
  function hubFetch(url, opts, o) {
    o = o || {}; opts = opts || {};
    var tries = o.retries == null ? 2 : o.retries, timeout = o.timeout || 30000, method = (opts.method || 'GET').toUpperCase();
    /* changes on this site carry the login's security token, so the server can tell them from requests made by other websites */
    var base = Object.assign({}, opts);
    if (method !== 'GET' && method !== 'HEAD' && S.csrf && sameSite(url)) {
      if (typeof Headers !== 'undefined' && base.headers instanceof Headers) { base.headers = new Headers(base.headers); if (!base.headers.has('X-Hub-CSRF')) base.headers.set('X-Hub-CSRF', S.csrf); }
      else { base.headers = Object.assign({}, base.headers); if (!base.headers['X-Hub-CSRF']) base.headers['X-Hub-CSRF'] = S.csrf; }
    }
    function once(n) {
      var ctl = window.AbortController ? new AbortController() : null, timer = ctl && setTimeout(function () { ctl.abort(); }, timeout);
      var init = Object.assign({}, base); if (ctl && !init.signal) init.signal = ctl.signal;
      return fetch(url, init).then(function (r) {
        if (timer) clearTimeout(timer);
        var gw = r.status === 502 || r.status === 504 || r.status === 524, again = (method === 'GET' ? gw || r.status === 503 : r.status === 503);
        if (again && n < tries) return new Promise(function (go) { setTimeout(go, 500 * (n + 1)); }).then(function () { return once(n + 1); });
        return r;
      }, function (err) {
        if (timer) clearTimeout(timer);
        var timedOut = err && err.name === 'AbortError';
        if (n < tries && (method === 'GET' || !timedOut)) return new Promise(function (go) { setTimeout(go, 500 * (n + 1)); }).then(function () { return once(n + 1); });
        throw err;
      });
    }
    var track = method !== 'GET' && method !== 'HEAD' && /\/web\/(links|info|cards|tasks|home)\//.test(String(url));   // page saves only
    if (!track) return once(0);
    saveNote('saving');
    return once(0).then(function (r) { saveNote(r.ok ? 'saved' : 'failed'); return r; }, function (e) { saveNote('failed'); throw e; });
  }
  /* (1.61.5) a small "Saving... / Saved / Not saved" note at the bottom left, on every page that saves */
  var saveT = 0;
  function saveNote(state) {
    var n = document.getElementById('ix-savepill');
    if (!n) { n = document.createElement('div'); n.id = 'ix-savepill'; n.setAttribute('role', 'status'); n.setAttribute('aria-live', 'polite'); (document.body || document.documentElement).appendChild(n); }
    clearTimeout(saveT); n.className = 'on ' + state;
    n.textContent = state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : 'Not saved. Try again.';
    if (state !== 'saving') saveT = setTimeout(function () { n.className = ''; }, state === 'saved' ? 1800 : 7000);
  }
  function sameSite(u) { try { return new URL(u, location.href).origin === location.origin; } catch (e) { return false; } }
  /* only web addresses become links; anything like javascript: turns into a harmless "#" */
  function safeHref(u) { u = String(u || '').trim(); if (/^(https?:|mailto:|\/|\.\/|#)/i.test(u)) return u; return /^[a-z][a-z0-9+.-]*:/i.test(u) ? '#' : (u ? 'https://' + u : '#'); }
  function api(action, body, method, wait) {   // wait: {timeout: ms} for the few jobs that take a while (hubFetch gives up after 30 s otherwise)
    var o = { method: method || (body ? 'POST' : 'GET'), headers: {}, credentials: 'same-origin', cache: 'no-store' };
    if (body) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body); }
    if (S.csrf) o.headers['X-Hub-CSRF'] = S.csrf;
    return hubFetch(CORE + 'api.php?action=' + action, o, wait).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { j._status = r.status; return j; });
    });
  }
  /* (1.75.0) The one place every message of the site appears: cards in the bottom right corner, newest at the bottom, each with a tile, the message,
     where it came from and when. A message that goes away on its own is still kept in the list behind the bell (this tab's last 30), so
     nothing is missed when it was not looked at. Hovering a card keeps it; the cross closes it. toast() keeps its old form, so every page
     and every pane calls it the same way. bad: a problem (red, stays longer); sticky: stays until closed; act: {label, run} adds a button, such as Undo. */
  var NOTE_MAX = 4, NOTE_KEEP = 30, noteHist = [], noteSeen = 0;
  try { noteHist = JSON.parse(sessionStorage.getItem('ix-notes') || '[]').filter(function (n) { return n && typeof n.m === 'string'; }).slice(-NOTE_KEEP); noteSeen = +sessionStorage.getItem('ix-notes-seen') || 0; } catch (e) {}
  var NOTE_SRC = { home: 'Home', links: 'Links', info: 'Info', cards: 'Cards', tasks: 'Tasks', files: 'Files', tools: 'Tools', settings: 'Settings' };
  /* (1.77.2) each message gets the icon and color of what it did: saved, deleted, backed up, sent, copied, locked, updated, added, or a problem */
  var NOTE_ICON = { bad: 'M12 3l10 18H2zM12 10v5M12 18h.01', ok: 'M5 12l5 5 9-10', act: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
    del: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6', box: 'M21 8v13H3V8M1 3h22v5H1zM10 12h4', send: 'M22 2L11 13M22 2l-7 20-4-9-9-4z',
    copy: 'M9 9h11v11H9zM5 15H4V4h11v1', lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4', sync: 'M21 12a9 9 0 0 1-15.5 6.3L3 16M3 12a9 9 0 0 1 15.5-6.3L21 8M3 21v-5h5M21 3v5h-5', plus: 'M12 5v14M5 12h14' };
  var NOTE_HINT = /^Hold the button down to confirm\.?$/;
  function noteKind(msg, bad, act) {
    if (bad) return 'bad'; if (act) return 'act'; var m = String(msg).toLowerCase();
    if (/trash|delet|remov|erase|cleared/.test(m)) return 'del';
    if (/telegram|test message|message sent|sent to/.test(m)) return 'send';
    if (/backup|backed up|download|export/.test(m)) return 'box';
    if (/copied|copy/.test(m)) return 'copy';
    if (/passkey|passphrase|password|encrypt|locked|unlock|log(ged)? (in|out)|two-step/.test(m)) return 'lock';
    if (/updat|version|restor|refresh|reload|synced/.test(m)) return 'sync';
    if (/added|created|uploaded|imported|new /.test(m)) return 'plus';
    return 'ok';
  }
  /* (1.79.3) a richer record: what kind of thing it was, where on the site it happened (page, tab, open window) and a detail line when the page gives one */
  var NOTE_LABEL = { ok: 'Done', bad: 'Problem', act: 'Can be undone', del: 'Deleted', box: 'Backup', send: 'Sent', copy: 'Copied', lock: 'Security', sync: 'Updated', plus: 'Added' };
  function noteWhere() {
    var tab = document.querySelector('.tabi.on .tab, .tab.active, .tab[aria-selected="true"]'), dl = [].slice.call(document.querySelectorAll('dialog[open]')).pop(), h = dl && dl.querySelector('h3, h2');
    var t = tab && (tab.querySelector('span:not(.tslot):not(.lk)') || tab).textContent.trim().slice(0, 40), w = h && h.textContent.trim().slice(0, 40);
    return { p: (NOTE_SRC[APP] || 'Homebase Hub') + (t ? ' › ' + t : ''), w: w && w !== t ? w : '' };
  }
  /* (1.77.2) every message is also kept on this device (the last 300, in Settings > Logs), after the tab and its short list are gone */
  function noteLogGet() { try { return (JSON.parse(ls.get('hub-notelog') || '[]') || []).filter(function (n) { return n && typeof n.m === 'string'; }); } catch (e) { return []; } }
  function noteLogAdd(e) { try { var a = noteLogGet(); a.push(e); ls.set('hub-notelog', JSON.stringify(a.slice(-300))); } catch (x) {} }
  function noteLogClear() { try { ls.set('hub-notelog', '[]'); } catch (x) {} }
  function noteSave() { try { sessionStorage.setItem('ix-notes', JSON.stringify(noteHist.slice(-NOTE_KEEP))); sessionStorage.setItem('ix-notes-seen', String(noteSeen)); } catch (e) {} }
  function noteAgo(ts) { var s = Math.max(0, Math.round((Date.now() - ts) / 1000)); return s < 45 ? 'now' : s < 3600 ? Math.round(s / 60) + 'm ago' : Math.round(s / 3600) + 'h ago'; }
  function noteTile(kind) { return '<span class="ix-nt ' + kind + '" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="' + NOTE_ICON[kind] + '"/></svg></span>'; }
  function noteBell() {
    var b = document.getElementById('ix-bell'), n = noteHist.length - noteSeen, box = document.getElementById('ix-toast'), live = box && box.querySelector('.ix-nc');
    if (live) { if (b) b.hidden = true; return; }   // (1.77.2) the bell stays on every page, so the messages can always be read again; the number shows only what was missed
    if (!b) {
      b = document.createElement('button'); b.type = 'button'; b.id = 'ix-bell'; b.setAttribute('aria-label', 'Messages you may have missed');
      b.onclick = function () { noteList(); }; document.body.appendChild(b);
    }
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>' + (n > 0 ? '<b>' + Math.min(n, 9) + (n > 9 ? '+' : '') + '</b>' : ''); b.classList.toggle('ix-quiet', n <= 0); b.hidden = false;
  }
  whenBody(noteBell);   // the bell is there from the first moment on every page
  /* the list behind the bell: the last messages of this tab, newest first */
  function noteList() {
    var old = document.getElementById('ix-nlist'); if (old) { old.remove(); return; }
    noteSeen = noteHist.length; noteSave(); noteBell();
    var l = document.createElement('div'); l.id = 'ix-nlist'; l.setAttribute('role', 'dialog'); l.setAttribute('aria-label', 'Messages');
    l.innerHTML = '<div class="ix-nlh"><b>Messages</b><span>' + (noteHist.length ? 'This tab, newest first' : 'Nothing yet') + '</span><button type="button" class="ix-nlc" ' + (noteHist.length ? '' : 'hidden ') + 'data-clear>Clear</button><button type="button" class="ix-nlx" aria-label="Close">×</button></div><div class="ix-nlb">' +
      noteHist.slice().reverse().map(function (n) { return '<div class="ix-nc ' + (n.b ? 'bad' : '') + '">' + noteTile(n.k && NOTE_ICON[n.k] ? n.k : n.b ? 'bad' : 'ok') + '<div class="ix-nb"><div class="ix-nm"></div><small>' + esc(n.p || n.s) + ' · ' + esc(noteAgo(n.ts)) + '</small></div></div>'; }).join('') + '</div>';
    [].forEach.call(l.querySelectorAll('.ix-nm'), function (m, i) { m.textContent = noteHist[noteHist.length - 1 - i].m; });
    document.body.appendChild(l);
    l.querySelector('.ix-nlx').onclick = function () { l.remove(); };
    var c = l.querySelector('[data-clear]'); if (c) c.onclick = function () { noteHist = []; noteSeen = 0; noteSave(); l.remove(); };
    l.querySelector('.ix-nlx').focus();
    l.addEventListener('keydown', function (e) { if (e.key === 'Escape') { l.remove(); } });
  }
  /* runs a change to a list and slides every item that stayed from where it was to where it is now (a spring-like curve) */
  function flip(box, change) {
    var before = new Map(); [].forEach.call(box.children, function (ch) { before.set(ch, ch.getBoundingClientRect().top); });
    change();
    if (reduced()) return;
    [].forEach.call(box.children, function (ch) {
      var b = before.get(ch); if (b == null || !ch.animate) return;
      var d = b - ch.getBoundingClientRect().top;
      if (d) ch.animate([{ translate: '0 ' + d + 'px' }, { translate: '0 0' }], { duration: 450, easing: 'cubic-bezier(.3,1.25,.5,1)' });
    });
  }
  function toast(msg, bad, sticky, act, detail) {
    msg = String(msg == null ? '' : msg); if (!msg) return;
    var t = document.getElementById('ix-toast');
    if (!t) { t = document.createElement('div'); t.id = 'ix-toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); }
    // a page's open modal <dialog> is drawn above everything: the messages go inside it so they can be seen
    var host = [].slice.call(document.querySelectorAll('dialog[open]')).pop() || document.body;
    if (t.parentNode !== host) host.appendChild(t);
    var list = document.getElementById('ix-nlist'); if (list) list.remove();
    var same = [].filter.call(t.children, function (c) { return c.dataset.msg === msg; })[0];   // the same message again: one card, kept longer
    if (same) { clearTimeout(+same.dataset.tm); same.remove(); }
    else {
      var wh = noteWhere(), e = { m: msg, b: !!bad, k: noteKind(msg, bad, act), s: NOTE_SRC[APP] || 'Homebase Hub', ts: Date.now(), p: wh.p, w: wh.w, d: detail ? String(detail).slice(0, 200) : '' };
      noteHist.push(e); noteHist = noteHist.slice(-NOTE_KEEP); noteSave();
      if (!NOTE_HINT.test(msg)) noteLogAdd(e);   // (1.78.0) a hint ("Hold the button down to confirm.") is shown, but it is not something that got done: it stays out of Settings > Logs
    }
    var c = document.createElement('div'), kind = noteKind(msg, bad, act);
    c.className = 'ix-nc' + (bad ? ' bad' : ''); c.dataset.msg = msg;
    c.innerHTML = noteTile(kind) + '<div class="ix-nb"><div class="ix-nm"></div><small>' + esc(noteWhere().p) + ' · now</small></div><button type="button" class="ix-nx" aria-label="Close message">×</button>';
    c.querySelector('.ix-nm').textContent = msg;
    var gone = function () { clearTimeout(+c.dataset.tm); c.classList.remove('in'); setTimeout(function () { flip(t, function () { c.remove(); }); if (!t.querySelector('.ix-nc')) { t.classList.remove('on'); } noteBell(); }, 160); };
    var arm = function (ms) { clearTimeout(+c.dataset.tm); if (!sticky) c.dataset.tm = String(setTimeout(gone, ms)); };
    if (act && act.label) {
      var ab = document.createElement('button'); ab.type = 'button'; ab.className = 'ix-tact'; ab.textContent = act.label;
      ab.onclick = function () { noteSeen = noteHist.length; noteSave(); gone(); act.run(); };
      c.insertBefore(ab, c.querySelector('.ix-nx'));
    }
    c.querySelector('.ix-nx').onclick = function () { noteSeen = noteHist.length; noteSave(); gone(); };
    c.addEventListener('pointerenter', function () { clearTimeout(+c.dataset.tm); });
    c.addEventListener('pointerleave', function () { arm(2500); });
    // (1.77.2) like Magic UI's Animated List: the newest message is on top and springs in from nothing; the others slide to their new place
    flip(t, function () {
      t.insertBefore(c, t.firstChild); t.classList.add('on');
      while (t.children.length > NOTE_MAX) { clearTimeout(+t.lastChild.dataset.tm); t.removeChild(t.lastChild); }
    });
    requestAnimationFrame(function () { c.classList.add('in'); });
    var bell = document.getElementById('ix-bell'); if (bell) bell.hidden = true;
    arm(bad ? 7000 : act ? 8000 : 4500);
  }
  function remember(st) {
    var keep = {}; ['siteName', 'logo', 'nav', 'theme', 'accent', 'accentPg', 'look', 'homeBar', 'glass', 'glassFx', 'barHide', 'editBar', 'colors', 'font', 'fontCustom', 'sizes', 'pages', 'backupEvery', 'backupLast', 'tz'].forEach(function (k) { if (k in st) keep[k] = st[k]; });
    keep.adm = !!st.admin;   // only a hint so the bar draws the right icons straight away; the server decides what is allowed
    ls.set('hub-state', JSON.stringify(keep));
  }
  var isAdmin = function () { return S.admin === undefined ? !!S.adm : !!S.admin; };
  function whenBody(fn) {
    if (document.body) return fn();
    var mo = new MutationObserver(function () { if (document.body) { mo.disconnect(); fn(); } });
    mo.observe(H, { childList: true });
  }

