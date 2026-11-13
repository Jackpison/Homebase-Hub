  /* ---------- Logs (Settings > Logs): what the site told you, who logged in, and what went wrong ---------- */
  var LOGEV = { login: ['Logged In', '', '✓'], failed: ['Wrong Password', 'warn', '!'], locked: ['Logins Paused After Too Many Wrong Tries', 'warn', '!'], password: ['Password Changed', '', '✓'],
    logoutall: ['Other Devices Logged Out', '', '✓'], twostep_on: ['Two-Step Login Turned On', '', '✓'], twostep_off: ['Two-Step Login Turned Off', 'warn', '!'],
    recovery: ['New Recovery Codes Made', '', '✓'], restore: ['Backup Restored', 'warn', '!'] };
  var LOGDAY = function (ts) { var d = new Date(ts), t = new Date(), y = new Date(Date.now() - 864e5); return d.toDateString() === t.toDateString() ? 'Today' : d.toDateString() === y.toDateString() ? 'Yesterday' : d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }); };
  function pLogNotes(p) {
    var all = K.noteLog().slice().reverse(), only = false;
    var draw = function () {
      var list = only ? all.filter(function (n) { return n.b; }) : all, day = '';
      p.innerHTML = tabHead(ICON.bell, 'Notifications', 'Every message the site showed you on this device, newest first. The last 300 are kept here.') +
        '<div class="ix-row ix-lgbar"><div class="ix-seg" role="tablist" aria-label="Show"><button type="button" role="tab" data-f="all" aria-selected="' + !only + '">All</button><button type="button" role="tab" data-f="bad" aria-selected="' + only + '">Problems</button></div>' +
        '<span class="ix-note" style="margin:0">' + list.length + (list.length === 1 ? ' message' : ' messages') + '</span><button type="button" class="ix-btn" id="ix-lgclr"' + (all.length ? '' : ' disabled') + '>Clear</button></div>' +
        (list.length ? '<div class="ix-lg">' + list.map(function (n) {
          var d = LOGDAY(n.ts), head = d !== day ? '<div class="ix-sect">' + esc(d) + '</div>' : ''; day = d;
          return head + '<div class="ix-lgr">' + K.noteTile(n.k && ICON && K.noteKind ? n.k : n.b ? 'bad' : 'ok') + '<div class="ix-lgt"><b></b><small>' + esc(n.s || '') + ' · ' + esc(new Date(n.ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })) + '</small></div></div>'; }).join('') + '</div>'
          : '<div class="ix-empty"><b>' + (only ? 'No Problems' : 'Nothing Yet') + '</b><p>' + (only ? 'Nothing has gone wrong on this device.' : 'Messages appear here as the site shows them.') + '</p></div>');
      [].forEach.call(p.querySelectorAll('.ix-lgr .ix-lgt b'), function (b, i) { b.textContent = list[i].m; });
      p.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { only = b.dataset.f === 'bad'; draw(); }; });
      var c = p.querySelector('#ix-lgclr'); if (c) c.onclick = function () { K.noteLogClear(); all = []; draw(); };
    };
    draw();
  }
  function pLogSign(p) {
    p.innerHTML = spinRow('Reading the sign-in history…');
    api('activity').then(function (j) {
      if (!j || !j.ok) { p.innerHTML = '<p class="ix-err">' + esc((j && j.error) || 'Could not load.') + '</p>'; return; }
      var rows = j.events.map(function (e) {
        var m = LOGEV[e.ev] || [e.ev, '', '•'], label = e.ev === 'failed' ? (e.x === 'code' ? 'Wrong Two-Step Code' : e.x === 'passkey' ? 'Passkey Not Accepted' : 'Wrong Password') : m[0];
        return checkRow(m[1], m[2], esc(label), esc(e.who || '') + ' · ' + esc(e.ip || '') + (e.cc ? ' (' + esc(e.cc) + ')' : '') + ' · ' + esc(ago(e.t)));
      });
      p.innerHTML = tabHead(ICON.out, 'Sign-Ins', 'Logins, wrong passwords and security changes. Who is logged in right now is under Security › Devices.') +
        (rows.length ? '<div class="ix-checks">' + rows.join('') + '</div>' : '<div class="ix-empty"><b>No Activity Yet</b><p>Logins, wrong passwords and security changes appear here.</p></div>');
    }, function () { p.innerHTML = '<p class="ix-err">Can\'t reach the server.</p>'; });
  }
  function pLogErr(p) {
    p.innerHTML = spinRow('Looking for PHP error logs…');
    api('health').then(function (h) {
      if (!h || !h.ok) { p.innerHTML = '<p class="ix-err">' + esc((h && h.error) || 'Could not load.') + '</p>'; return; }
      p.innerHTML = tabHead(ICON.warn, 'PHP Errors', 'From your host\'s error_log files, newest last. Clearing them is under Health.') +
        (h.logs.length ? h.logs.map(function (l) { return '<div class="ix-log"><b>' + esc(l.file) + '</b><pre>' + esc(l.lines.slice(-40).join('\n')) + '</pre></div>'; }).join('')
          : '<div class="ix-empty"><b>No Errors Logged</b><p>Nothing has gone wrong that your server wrote down.</p></div>');
    }, function () { p.innerHTML = '<p class="ix-err">Can\'t reach the server.</p>'; });
  }
