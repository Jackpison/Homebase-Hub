  /* ---------- Logs (Settings > Logs): what the site told you, who logged in, and what went wrong ---------- */
  /* (1.78.0) what the site records, in plain words: [label, style, mark, security?]. The detail (e.x) is what was changed, never a value. */
  var LOGEV = { login: ['Logged In', '', '✓', 1], failed: ['Wrong Password', 'warn', '!', 1], locked: ['Logins Paused After Too Many Wrong Tries', 'warn', '!', 1], password: ['Password Changed', '', '✓', 1],
    logoutall: ['Other Devices Logged Out', '', '✓', 1], twostep_on: ['Two-Step Login Turned On', '', '✓', 1], twostep_off: ['Two-Step Login Turned Off', 'warn', '!', 1],
    recovery: ['New Recovery Codes Made', '', '✓', 1], restore: ['Backup Restored', 'warn', '!', 1], passkey: ['Passkey', '', '✓', 1], session_revoke: ['Device Logged Out', '', '✓', 1], approval: ['Telegram Login Approval', '', '✓', 1],
    encryption: ['Encryption', '', '✓', 1], activity_cleared: ['Activity Cleared', 'warn', '!', 1], settings: ['Settings Saved', '', '✓'], logo: ['Logo', '', '✓'], backup: ['Backup', '', '✓'], version_restore: ['Earlier Version Restored', 'warn', '!'],
    update: ['Site Updated', '', '✓'], features: ['Features', '', '✓'], cleanup: ['Cleanup', '', '✓'], update_back: ['Went Back to the Saved Version', 'warn', '!'], files_delete: ['Files Deleted', 'warn', '!'], reset: ['Site Erased', 'warn', '!'], telegram: ['Telegram', '', '✓'] };
  var LOGSEC = {}; Object.keys(LOGEV).forEach(function (k) { if (LOGEV[k][3]) LOGSEC[k] = 1; });
  var LOGKEY = { siteName: 'site name', nav: 'navigation', theme: 'theme', accent: 'accent color', accentPg: 'page accents', look: 'look', homeBar: 'bar on Home', glass: 'glass', glassFx: 'glass settings', barHide: 'hide bar', font: 'font', fontCustom: 'font', colors: 'colors', pages: 'tabs', tz: 'time zone', sizes: 'text sizes' };
  /* one line of the activity list: what happened (with what it was about), then who, from where and when */
  function actRow(e) {
    var m = LOGEV[e.ev] || [e.ev, '', '•'], x = String(e.x || ''), label = m[0];
    if (e.ev === 'failed') label = x === 'code' ? 'Wrong Two-Step Code' : x === 'passkey' ? 'Passkey Not Accepted' : 'Wrong Password';
    else if (e.ev === 'passkey') label = x === 'removed' ? 'Passkey Removed' : 'Passkey Added';
    else if (e.ev === 'settings') label += ': ' + x.split(', ').map(function (k) { return LOGKEY[k] || k; }).filter(function (k, i, a) { return a.indexOf(k) === i; }).join(', ');
    else if (x && e.ev !== 'login') label += ': ' + x;   // what it was about: the parts restored, "3 files", "passphrase set"
    return checkRow(m[1], m[2], esc(label), esc(e.who || '') + ' · ' + esc(e.ip || '') + (e.cc ? ' (' + esc(e.cc) + ')' : '') + ' · ' + esc(ago(e.t)));
  }
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
          return head + '<div class="ix-lgr">' + K.noteTile(n.k && ICON && K.noteKind ? n.k : n.b ? 'bad' : 'ok') + '<div class="ix-lgt"><b></b><i class="ix-lgd"></i><small><span class="ix-lgk' + (n.b ? ' bad' : '') + '">' + esc(K.noteLabel(n.k || (n.b ? 'bad' : 'ok'))) + '</span>' + esc(n.p || n.s || '') + (n.w ? ' · ' + esc(n.w) : '') + '</small><small>' + esc(new Date(n.ts).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' })) + '</small></div></div>'; }).join('') + '</div>'
          : '<div class="ix-empty"><b>' + (only ? 'No Problems' : 'Nothing Yet') + '</b><p>' + (only ? 'Nothing has gone wrong on this device.' : 'Messages appear here as the site shows them.') + '</p></div>');
      [].forEach.call(p.querySelectorAll('.ix-lgr .ix-lgt b'), function (b, i) { b.textContent = list[i].m; });
      [].forEach.call(p.querySelectorAll('.ix-lgr .ix-lgd'), function (d, i) { if (list[i].d) d.textContent = list[i].d; else d.remove(); });
      p.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { only = b.dataset.f === 'bad'; draw(); }; });
      var c = p.querySelector('#ix-lgclr'); if (c) c.onclick = function () { K.noteLogClear(); all = []; draw(); };
    };
    draw();
  }
  function pLogSign(p) {
    p.innerHTML = spinRow('Reading the activity…');
    api('activity').then(function (j) {
      if (!j || !j.ok) { p.innerHTML = '<p class="ix-err">' + esc((j && j.error) || 'Could not load.') + '</p>'; return; }
      var rows = j.events.map(actRow);
      p.innerHTML = tabHead(ICON.out, 'Activity', 'What was done on your site and who logged in: backups, updates, restores, settings saved, passkeys, encryption and every login. The last 300 are kept. Who is logged in right now is under Security › Devices.') +
        '<form class="ix-row ix-lgbar" id="ix-actclr" autocomplete="off"><span class="ix-note" style="margin:0">' + j.events.length + (j.events.length === 1 ? ' line' : ' lines') + '</span>' +
        '<input type="password" id="ix-actpw" placeholder="Website Password" autocomplete="current-password" aria-label="Website Password" hidden style="max-width:240px"><button type="button" class="ix-btn" id="ix-actgo"' + (j.events.length ? '' : ' disabled') + '>Clear</button></form><p class="ix-err" id="ix-acterr"></p>' +
        (rows.length ? '<div class="ix-checks">' + rows.join('') + '</div>' : '<div class="ix-empty"><b>No Activity Yet</b><p>Logins, backups, updates and changes to settings appear here.</p></div>');
      var pw = p.querySelector('#ix-actpw'), go = p.querySelector('#ix-actgo'), er = p.querySelector('#ix-acterr');
      go.onclick = function () {   // first press asks for the password; the second clears. One line stays: that it was cleared.
        if (pw.hidden) { pw.hidden = false; pw.focus(); go.textContent = 'Clear Activity'; return; }
        if (!pw.value) { er.textContent = 'Type your website password.'; return; }
        go.disabled = true; er.textContent = '';
        api('activity_clear', { password: pw.value }).then(function (r) {
          if (!r.ok) { er.textContent = r.error || 'Could not clear.'; go.disabled = false; return; }
          toast('Activity cleared.'); pLogSign(p);
        }, function () { er.textContent = "Can't reach the server."; go.disabled = false; });
      };
      p.querySelector('#ix-actclr').onsubmit = function (e) { e.preventDefault(); go.click(); };
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
