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
  var NOTE_MAX = 4, NOTE_KEEP = 30, noteHist = [], noteSeen = 0, noteNew = 0;   // noteNew: messages since the list was last opened (the history is capped, so its length cannot count them)
  try { noteHist = JSON.parse(sessionStorage.getItem('ix-notes') || '[]').filter(function (n) { return n && typeof n.m === 'string'; }).slice(-NOTE_KEEP); noteSeen = +sessionStorage.getItem('ix-notes-seen') || 0; noteNew = +sessionStorage.getItem('ix-notes-new') || 0; } catch (e) {}
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
  /* (1.77.2) every message is also kept on this device (the last 30 days, in Settings > Logs), after the tab and its short list are gone */
  /* (1.79.12) The list in Settings > Logs is shared by every device: each message is kept here at once and sent to the site when this browser is logged in
     (a line that could not be sent waits and goes with the next one). Reading it brings the other devices' lines in too. */
  var noteTimer = 0, noteBusy = false, NOTE_LOCAL = ['Files', 'Cards'];
  function noteNewId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function noteLogGet() { try { return (JSON.parse(ls.get('hub-notelog') || '[]') || []).filter(function (n) { return n && typeof n.m === 'string'; }); } catch (e) { return []; } }
  function notePendGet() { try { return (JSON.parse(ls.get('hub-notepend') || '[]') || []).filter(function (x) { return typeof x === 'string'; }); } catch (e) { return []; } }
  function noteLogPut(a) { try { ls.set('hub-notelog', JSON.stringify(a.filter(function (n) { return !n.ts || n.ts > Date.now() - 30 * 864e5; }).slice(-3000))); } catch (x) {} }   // (1.80.6) 30 days, at most 3000
  function noteLogAdd(e) {
    try { var a = noteLogGet(); a.push(e); noteLogPut(a); var p = notePendGet(); p.push(e.id); ls.set('hub-notepend', JSON.stringify(p.slice(-300))); noteFlushSoon(2000); } catch (x) {}
  }
  function noteFlushSoon(ms) { clearTimeout(noteTimer); noteTimer = setTimeout(noteFlush, ms); }
  function noteFlush() {
    if (noteBusy || !isAdmin() || !S.csrf) return;
    var a = noteLogGet(), p = notePendGet(), fix = false;
    a.forEach(function (n) { if (!n.id) { n.id = 'l' + (+n.ts || 0).toString(36) + String(n.m).length.toString(36) + noteNewId().slice(-4); p.push(n.id); fix = true; } });   // lines from before 1.79.12 get an id once
    if (fix) { noteLogPut(a); ls.set('hub-notepend', JSON.stringify(p)); }
    var send = a.filter(function (n) { return p.indexOf(n.id) >= 0 && NOTE_LOCAL.indexOf(n.s) < 0; }).slice(0, 50);   // Files and Cards alerts can name locked things: they stay on this device
    if (!send.length) { if (p.length) ls.set('hub-notepend', '[]'); return; }   // (all that is left to send stays here)
    noteBusy = true;
    api('notelog_add', { items: send }).then(function (j) {
      noteBusy = false;
      if (!j || !j.ok) return;
      var done = send.map(function (n) { return n.id; });
      ls.set('hub-notepend', JSON.stringify(notePendGet().filter(function (x) { return done.indexOf(x) < 0; })));
      if (notePendGet().length) noteFlushSoon(500);
    }, function () { noteBusy = false; });
  }
  /** The shared list: what the site has, plus what is only here so far, oldest first. */
  function noteLogSync() {
    if (!isAdmin()) return Promise.resolve(noteLogGet());
    noteFlush();
    return api('notelog').then(function (j) {
      if (!j || !j.ok) return noteLogGet();
      var by = {}, out = [];
      (j.items || []).concat(noteLogGet()).forEach(function (n) { if (n && n.id && !by[n.id]) { by[n.id] = 1; out.push(n); } else if (n && !n.id) out.push(n); });
      out.sort(function (x, y) { return (x.ts || 0) - (y.ts || 0); }); out = out.filter(function (n) { return !n.ts || n.ts > Date.now() - 30 * 864e5; }).slice(-3000);
      noteLogPut(out); return out;
    }, function () { return noteLogGet(); });
  }
  /** Clear: the list on this device and, when logged in, on the site (so every device). */
  function noteLogClear(before) {   // (1.80.8) before: only the lines older than this time (ms) go
    try {
      if (before) { noteLogPut(noteLogGet().filter(function (n) { return (n.ts || 0) >= before; })); }
      else { ls.set('hub-notelog', '[]'); ls.set('hub-notepend', '[]'); }
    } catch (x) {}
    return isAdmin() ? api('notelog_clear', before ? { before: before } : {}).then(function () {}, function () {}) : Promise.resolve();
  }
  function noteSave() { try { sessionStorage.setItem('ix-notes', JSON.stringify(noteHist.slice(-NOTE_KEEP))); sessionStorage.setItem('ix-notes-seen', String(noteSeen)); sessionStorage.setItem('ix-notes-new', String(noteNew)); } catch (e) {} }
  function noteAgo(ts) { var s = Math.max(0, Math.round((Date.now() - ts) / 1000)); return s < 45 ? 'now' : s < 3600 ? Math.round(s / 60) + 'm ago' : Math.round(s / 3600) + 'h ago'; }
  /* (1.79.9) every message wears the colour of the page (or Settings) it came from, so the source can be guessed at a glance */
  function noteColor(n) { var a = n.a; if (!a) Object.keys(NOTE_SRC).forEach(function (k) { if (String(n.s) === NOTE_SRC[k]) a = k; }); return a === 'settings' || !PAGE_TILE[a] ? '#8b5cf6' : pageColor(a); }
  function noteTile(kind) { return '<span class="ix-ntl ' + kind + '" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="' + NOTE_ICON[kind] + '"/></svg></span>'; }
  function noteBell() {
    var b = document.getElementById('ix-bell'), n = noteNew, box = document.getElementById('ix-toast'), live = box && box.querySelector('.ix-nc');
    var tools = document.querySelector('#ix-bar .ix-tools');   // (1.79.12) with the bar showing, the bell sits in it next to the theme button; without a bar it floats in the corner
    if (live && !tools) { if (b) b.hidden = true; return; }   // (1.77.2) the bell stays on every page, so the alerts can always be read again; the number shows only what was missed
    if (!b) {
      b = document.createElement('button'); b.type = 'button'; b.id = 'ix-bell'; b.setAttribute('aria-label', 'Alerts you may have missed'); b.title = 'Alerts';
      b.onclick = function () { noteList(); };
    }
    if (tools) { if (b.parentNode !== tools) { var th = tools.querySelector('[data-ix="theme"]'); tools.insertBefore(b, th ? th.nextSibling : tools.firstChild); } /* (1.80.6) order: theme, alerts, backup, settings */ b.classList.add('ix-bb'); }
    else if (document.querySelector('.corner #editBtn')) { var cn = document.querySelector('.corner'), eb = document.getElementById('editBtn'); if (b.parentNode !== cn) cn.insertBefore(b, eb); b.classList.remove('ix-bb'); b.classList.add('ix-bc'); /* (1.82.1) on Home the bell sits in the top-right buttons, between Different Background and Edit */ }
    else { if (b.parentNode !== document.body) document.body.appendChild(b); b.classList.remove('ix-bb', 'ix-bc'); }
    b.innerHTML = '<img class="ix-bell3" alt="" width="22" height="22" src="data:image/png;base64,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">' + (n > 0 ? '<b aria-hidden="true"></b>' : ''); b.classList.toggle('ix-quiet', n <= 0); b.setAttribute('aria-label', n > 0 ? 'Alerts: ' + n + ' new' : 'Alerts you may have missed'); b.hidden = false;
  }
  /* (1.80.7) the bell rings once when a new message arrives (not when it is only redrawn) */
  function noteRing() { var b = document.getElementById('ix-bell'); if (!b) return; b.classList.remove('ix-ring'); void b.offsetWidth; b.classList.add('ix-ring'); clearTimeout(b.__r); b.__r = setTimeout(function () { b.classList.remove('ix-ring'); }, 900); }
  noteFlushSoon(4000);   // lines that were not sent yet (this browser was logged out, or offline) go once the page is up
  whenBody(noteBell);   // the bell is there from the first moment on every page
  /* the list behind the bell: the last messages of this tab, newest first */
  function noteList() {
    var old = document.getElementById('ix-nlist'); if (old) { old.remove(); return; }
    noteSeen = noteHist.length; noteNew = 0; noteSave(); noteBell();
    var l = document.createElement('div'); l.id = 'ix-nlist'; l.setAttribute('role', 'dialog'); l.setAttribute('aria-label', 'Alerts');
    l.innerHTML = '<div class="ix-nlh"><b>Alerts</b><span>' + (noteHist.length ? '' : 'Nothing yet') + '</span><button type="button" class="ix-nlc" ' + (noteHist.length ? '' : 'hidden ') + 'data-clear>Clear</button><button type="button" class="ix-nlc ix-nlq" data-logs>Logs</button><button type="button" class="ix-nlc ix-nlq" data-keys>Shortcuts</button><button type="button" class="ix-nlx" aria-label="Close">×</button></div><div class="ix-nlb">' +
      noteHist.slice().reverse().map(function (n) { return '<div class="ix-nc ' + (n.b ? 'bad' : '') + '" style="--pc:' + noteColor(n) + '">' + noteTile(n.k && NOTE_ICON[n.k] ? n.k : n.b ? 'bad' : 'ok') + '<div class="ix-nb"><div class="ix-nm"></div><small>' + esc(n.p || n.s) + ' · ' + esc(noteAgo(n.ts)) + '</small></div></div>'; }).join('') + '</div>';
    [].forEach.call(l.querySelectorAll('.ix-nm'), function (m, i) { m.textContent = noteHist[noteHist.length - 1 - i].m; });
    var bell = document.getElementById('ix-bell'); if (bell && bell.classList.contains('ix-bb') && NAV() === 'top') l.classList.add('ix-under');   // under the bar, at the right
    document.body.appendChild(l);
    l.querySelector('.ix-nlx').onclick = function () { l.remove(); };
    l.querySelector('[data-keys]').onclick = function () { l.remove(); showKeys(); };
    l.querySelector('[data-logs]').onclick = function () { l.remove(); settings('logs'); };   // (1.79.9) the full list is in Settings > Logs
    var c = l.querySelector('[data-clear]'); if (c) c.onclick = function () { noteHist = []; noteSeen = 0; noteNew = 0; noteSave(); l.remove(); };
    l.querySelector('.ix-nlx').focus();
    l.addEventListener('keydown', function (e) { if (e.key === 'Escape') { l.remove(); } });
    /* (1.79.9) a press anywhere outside the list (the bell itself toggles it) puts it back to the bell */
    var away = function (e) {
      if (l.isConnected && (l.contains(e.target) || (e.target.closest && e.target.closest('#ix-bell')))) return;
      document.removeEventListener('pointerdown', away, true); l.remove();
    };
    setTimeout(function () { document.addEventListener('pointerdown', away, true); }, 0);
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
      var wh = noteWhere(), e = { id: noteNewId(), m: msg, b: !!bad, k: noteKind(msg, bad, act), s: NOTE_SRC[APP] || 'Homebase Hub', a: APP, ts: Date.now(), p: wh.p, w: wh.w, d: detail ? String(detail).slice(0, 200) : '' };
      noteHist.push(e); noteHist = noteHist.slice(-NOTE_KEEP); noteNew++; noteSave(); noteBell(); noteRing();   // (1.80.5) the bell shows its dot at once, even while the message is still on screen
      if (!NOTE_HINT.test(msg)) noteLogAdd(e);   // (1.78.0) a hint ("Hold the button down to confirm.") is shown, but it is not something that got done: it stays out of Settings > Logs
    }
    var c = document.createElement('div'), kind = noteKind(msg, bad, act);
    c.className = 'ix-nc' + (bad ? ' bad' : ''); c.dataset.msg = msg; c.style.setProperty('--pc', noteColor({ a: APP }));
    c.innerHTML = noteTile(kind) + '<div class="ix-nb"><div class="ix-nm"></div><small>' + esc(noteWhere().p) + ' · now</small></div><button type="button" class="ix-nx" aria-label="Close message">×</button>';
    c.querySelector('.ix-nm').textContent = msg;
    var gone = function () { clearTimeout(+c.dataset.tm); c.classList.remove('in'); setTimeout(function () { flip(t, function () { c.remove(); }); if (!t.querySelector('.ix-nc')) { t.classList.remove('on'); } noteBell(); }, 160); };
    var arm = function (ms) { clearTimeout(+c.dataset.tm); if (!sticky) c.dataset.tm = String(setTimeout(gone, ms)); };
    if (act && act.label) {
      var ab = document.createElement('button'); ab.type = 'button'; ab.className = 'ix-tact'; ab.textContent = act.label;
      ab.onclick = function () { gone(); act.run(); };
      c.insertBefore(ab, c.querySelector('.ix-nx'));
    }
    c.querySelector('.ix-nx').onclick = function () { gone(); };   // (1.80.5) closing a message does not clear the bell's dot: opening the list does
    c.addEventListener('pointerenter', function () { clearTimeout(+c.dataset.tm); });
    c.addEventListener('pointerleave', function () { arm(2500); });
    // (1.77.2) like Magic UI's Animated List: the newest message is on top and springs in from nothing; the others slide to their new place
    flip(t, function () {
      t.insertBefore(c, t.firstChild); t.classList.add('on');
      while (t.children.length > NOTE_MAX) { clearTimeout(+t.lastChild.dataset.tm); t.removeChild(t.lastChild); }
    });
    requestAnimationFrame(function () { c.classList.add('in'); });
    var bell = document.getElementById('ix-bell'); if (bell && !bell.classList.contains('ix-bb')) bell.hidden = true;
    arm(bad ? 7000 : act ? 8000 : 4500);
  }
  function remember(st) {
    var keep = {}; ['siteName', 'logo', 'nav', 'theme', 'accent', 'accentPg', 'look', 'homeBar', 'glass', 'glassFx', 'barHide', 'barRound', 'editBar', 'colors', 'font', 'fontCustom', 'sizes', 'pages', 'backupEvery', 'backupLast', 'tz'].forEach(function (k) { if (k in st) keep[k] = st[k]; });
    keep.adm = !!st.admin;   // only a hint so the bar draws the right icons straight away; the server decides what is allowed
    ls.set('hub-state', JSON.stringify(keep));
  }
  var isAdmin = function () { return S.admin === undefined ? !!S.adm : !!S.admin; };
  function whenBody(fn) {
    if (document.body) return fn();
    var mo = new MutationObserver(function () { if (document.body) { mo.disconnect(); fn(); } });
    mo.observe(H, { childList: true });
  }

