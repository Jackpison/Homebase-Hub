  /* ---------- Logs (Settings > Logs): what the site told you, who logged in, and what went wrong ---------- */
  /* (1.78.0) what the site records, in plain words: [label, style, mark, security?]. The detail (e.x) is what was changed, never a value. */
  var LOGEV = { login: ['Logged In', '', '✓', 1], failed: ['Wrong Password', 'warn', '!', 1], locked: ['Logins Paused After Too Many Wrong Tries', 'warn', '!', 1], password: ['Password Changed', '', '✓', 1],
    logoutall: ['Other Devices Logged Out', '', '✓', 1], twostep_on: ['Two-Step Login Turned On', '', '✓', 1], twostep_off: ['Two-Step Login Turned Off', 'warn', '!', 1],
    recovery: ['New Recovery Codes Made', '', '✓', 1], restore: ['Backup Restored', 'warn', '!', 1], passkey: ['Passkey', '', '✓', 1], session_revoke: ['Device Logged Out', '', '✓', 1], approval: ['Telegram Login Approval', '', '✓', 1],
    encryption: ['Encryption', '', '✓', 1], activity_cleared: ['Activity Cleared', 'warn', '!', 1], settings: ['Settings Saved', '', '✓'], logo: ['Logo', '', '✓'], backup: ['Backup', '', '✓'], version_restore: ['Earlier Version Restored', 'warn', '!'],
    update: ['Site Updated', '', '✓'], features: ['Features', '', '✓'], cleanup: ['Cleanup', '', '✓'], update_back: ['Went Back to the Saved Version', 'warn', '!'], files_delete: ['Files Deleted', 'warn', '!'], files: ['Files', '', '✓'], reset: ['Site Erased', 'warn', '!'], telegram: ['Telegram', '', '✓'] };
  var LOGSEC = {}; Object.keys(LOGEV).forEach(function (k) { if (LOGEV[k][3]) LOGSEC[k] = 1; });
  var LOGKEY = { siteName: 'site name', nav: 'navigation', theme: 'theme', accent: 'accent color', accentPg: 'page accents', look: 'look', homeBar: 'bar on Home', glass: 'glass', glassFx: 'glass settings', barRound: 'bar corners', barHide: 'hide bar', font: 'font', fontCustom: 'font', colors: 'colors', pages: 'tabs', tz: 'time zone', sizes: 'text sizes' };
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
  /* (1.80.6) 100 lines to a page. (1.80.8) First, Previous, a page number box, Next and Last. */
  var LOGPAGE = 100;
  function lgPages(total) { return Math.max(1, Math.ceil(total / LOGPAGE)); }
  function lgPager(total, pg) {
    var pages = lgPages(total);
    return pages < 2 ? '' : '<div class="ix-row ix-lgpg"><span class="ix-lgpb"><button type="button" class="ix-btn" data-pg="first"' + (pg <= 0 ? ' disabled' : '') + '>First</button><button type="button" class="ix-btn" data-pg="-1"' + (pg <= 0 ? ' disabled' : '') + '>Previous</button></span>' +
      '<span class="ix-note ix-lgpn" style="margin:0">Page <input type="number" id="ix-lgpn" min="1" max="' + pages + '" value="' + (pg + 1) + '" aria-label="Page number"> of ' + pages + '</span>' +
      '<span class="ix-lgpb"><button type="button" class="ix-btn" data-pg="1"' + (pg >= pages - 1 ? ' disabled' : '') + '>Next</button><button type="button" class="ix-btn" data-pg="last"' + (pg >= pages - 1 ? ' disabled' : '') + '>Last</button></span></div>';
  }
  function lgPagerOn(p, f, total, redraw) {
    var last = lgPages(total) - 1, go = function (n) { redraw(Math.max(0, Math.min(last, n))); };
    [].forEach.call(p.querySelectorAll('.ix-lgpg [data-pg]'), function (b) { b.onclick = function () { var d = b.dataset.pg; go(d === 'first' ? 0 : d === 'last' ? last : f.pg + +d); }; });
    var n = p.querySelector('#ix-lgpn'); if (n) n.onchange = function () { go((parseInt(n.value, 10) || 1) - 1); };
  }
  /* (1.80.8) search, time range and kind, kept while the list is drawn again; and Export for what is shown */
  var LGKINDS = { logins: ['login', 'failed', 'locked', 'password', 'logoutall', 'twostep_on', 'twostep_off', 'recovery', 'passkey', 'session_revoke', 'approval'], backups: ['backup', 'restore', 'version_restore'], updates: ['update', 'update_back'], settings: ['settings', 'logo', 'features', 'cleanup', 'encryption', 'telegram', 'files', 'files_delete', 'reset', 'activity_cleared'] };
  var LGRANGE = [['0', 'Any Time'], ['1', 'Last 24 Hours'], ['7', 'Last 7 Days'], ['30', 'Last 30 Days']];
  function lgBar(f, withKind) {
    var sel = function (id, label, opts, cur) { return '<select id="' + id + '" aria-label="' + label + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (String(cur) === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'; };
    return '<div class="ix-row ix-lgf"><input type="search" id="ix-lgq" placeholder="Search" aria-label="Search" autocomplete="off" value="' + esc(f.q) + '">' + sel('ix-lgd', 'When', LGRANGE, f.days) +
      (withKind ? sel('ix-lgk', 'Kind', [['all', 'All Kinds'], ['logins', 'Logins'], ['backups', 'Backups'], ['updates', 'Updates'], ['settings', 'Settings']], f.kind) : '') + '<button type="button" class="ix-btn" id="ix-lgex">Export</button></div>';
  }
  function lgBind(p, f, redraw, doExport) {
    var q = p.querySelector('#ix-lgq'), d = p.querySelector('#ix-lgd'), k = p.querySelector('#ix-lgk'), x = p.querySelector('#ix-lgex');
    if (f.fq && q) { f.fq = 0; q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
    if (q) q.oninput = function () { f.q = q.value; f.pg = 0; f.fq = 1; redraw(); };
    if (d) d.onchange = function () { f.days = d.value; f.pg = 0; redraw(); };
    if (k) k.onchange = function () { f.kind = k.value; f.pg = 0; redraw(); };
    if (x) x.onclick = doExport;
  }
  function lgCsv(name, head, rows) {
    var cell = function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var text = [head].concat(rows).map(function (r) { return r.map(cell).join(','); }).join('\n') + '\n';
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' })); a.download = name + '.csv';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    toast('Exported ' + rows.length + (rows.length === 1 ? ' line.' : ' lines.'));
  }
  var lgStamp = function () { return new Date().toISOString().slice(0, 10); };
  function pLogNotes(p) {
    var all = K.noteLog().slice().reverse(), only = false, f = { q: '', days: '0', kind: 'all', pg: 0, fq: 0 };
    K.noteLogSync().then(function (l) { if (p.isConnected) { all = l.slice().reverse(); draw(); } });   // (1.79.12) the lines of every device
    var shown = function () {
      var q = f.q.trim().toLowerCase(), since = +f.days ? Date.now() - +f.days * 864e5 : 0;
      return all.filter(function (n) { return (!only || n.b) && (!since || n.ts >= since) && (!q || [n.m, n.d, n.p, n.s, n.w, n.dev].join(' ').toLowerCase().indexOf(q) >= 0); });
    };
    var draw = function () {
      var full = shown(), day = '', perDay = {};
      full.forEach(function (n) { var d = LOGDAY(n.ts); perDay[d] = (perDay[d] || 0) + 1; });   // (1.80.8) how many each day has, in its heading
      f.pg = Math.min(f.pg, lgPages(full.length) - 1);
      var list = full.slice(f.pg * LOGPAGE, (f.pg + 1) * LOGPAGE);
      p.innerHTML = tabHead(ICON.bell, 'Notifications', 'Every message the site showed you, from every device you log in from, newest first. The last 30 days are kept.') +
        '<div class="ix-row ix-lgbar"><div class="ix-seg" role="tablist" aria-label="Show"><button type="button" role="tab" data-f="all" aria-selected="' + !only + '">All</button><button type="button" role="tab" data-f="bad" aria-selected="' + only + '">Problems</button></div>' +
        '<span class="ix-note" style="margin:0">' + full.length + (full.length === 1 ? ' message' : ' messages') + '</span>' +
        '<select id="ix-lgage" aria-label="Clear older messages"' + (all.length ? '' : ' disabled') + '><option value="">Clear Older Than…</option><option value="1">1 Day</option><option value="7">7 Days</option><option value="14">14 Days</option></select>' +
        '<button type="button" class="ix-btn" id="ix-lgclr"' + (all.length ? '' : ' disabled') + '>Clear</button></div>' + lgBar(f, false) +
        (list.length ? '<div class="ix-lg">' + list.map(function (n) {
          var d = LOGDAY(n.ts), head = d !== day ? '<div class="ix-sect">' + esc(d) + ' · ' + perDay[d] + '</div>' : ''; day = d;
          return head + '<div class="ix-lgr" style="--pc:' + K.noteColor(n) + '">' + K.noteTile(n.k && ICON && K.noteKind ? n.k : n.b ? 'bad' : 'ok') + '<div class="ix-lgt"><b></b><i class="ix-lgd"></i></div><div class="ix-lgm"><small>' + esc(n.p || n.s || '') + (n.w ? ' · ' + esc(n.w) : '') + (n.dev ? ' · ' + esc(n.dev) : '')
          + '</small><small>' + esc(new Date(n.ts).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' })) + '</small></div></div>'; }).join('') + '</div>'
          : '<div class="ix-empty"><b>' + (only ? 'No Problems' : all.length ? 'No Matches' : 'Nothing Yet') + '</b><p>' + (only ? 'Nothing has gone wrong on this device.' : all.length ? 'Try a different search or time.' : 'Messages appear here as the site shows them.') + '</p></div>') + lgPager(full.length, f.pg);
      [].forEach.call(p.querySelectorAll('.ix-lgr .ix-lgt b'), function (b, i) { b.textContent = list[i].m; });
      [].forEach.call(p.querySelectorAll('.ix-lgr .ix-lgd'), function (d, i) { if (list[i].d) d.textContent = list[i].d; else d.remove(); });
      p.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { only = b.dataset.f === 'bad'; f.pg = 0; draw(); }; });
      lgBind(p, f, draw, function () { lgCsv('notifications-' + lgStamp(), ['Time', 'Message', 'Detail', 'Where', 'Device'], full.map(function (n) { return [new Date(n.ts).toISOString(), n.m, n.d || '', n.p || n.s || '', n.dev || '']; })); });
      lgPagerOn(p, f, full.length, function (n) { f.pg = n; draw(); p.scrollIntoView({ block: 'start' }); });
      var c = p.querySelector('#ix-lgclr'); if (c) c.onclick = function () { K.noteLogClear(); all = []; draw(); };   // for every device
      var ag = p.querySelector('#ix-lgage'); if (ag) ag.onchange = function () {   // (1.80.8) only the older ones
        if (!ag.value) return; var cut = Date.now() - +ag.value * 864e5, before = all.length;
        K.noteLogClear(cut); all = all.filter(function (n) { return n.ts >= cut; }); toast(before - all.length + (before - all.length === 1 ? ' older message cleared.' : ' older messages cleared.')); draw();
      };
    };
    draw();
  }
  function pLogSign(p) {
    p.innerHTML = spinRow('Reading the activity…');
    api('activity').then(function (j) {
      if (!j || !j.ok) { p.innerHTML = '<p class="ix-err">' + esc((j && j.error) || 'Could not load.') + '</p>'; return; }
      var f = { q: '', days: '0', kind: 'all', pg: 0, fq: 0 };
      var shown = function () {
        var q = f.q.trim().toLowerCase(), since = +f.days ? Date.now() / 1000 - +f.days * 86400 : 0, kinds = LGKINDS[f.kind];
        return j.events.filter(function (e) { return (!since || e.t >= since) && (!kinds || kinds.indexOf(e.ev) >= 0) && (!q || [(LOGEV[e.ev] || [e.ev])[0], e.ev, e.x, e.who, e.ip, e.cc].join(' ').toLowerCase().indexOf(q) >= 0); });
      };
      var show = function () {
      var full = shown(); f.pg = Math.min(f.pg, lgPages(full.length) - 1);
      var rows = full.slice(f.pg * LOGPAGE, (f.pg + 1) * LOGPAGE).map(actRow);
      p.innerHTML = tabHead(ICON.out, 'Activity', 'What was done on your site and who logged in: backups, updates, restores, settings saved, passkeys, encryption and every login. The last 30 days are kept, 100 lines to a page. Who is logged in right now is under Security › Devices.') +
        '<form class="ix-row ix-lgbar" id="ix-actclr" autocomplete="off"><span class="ix-note" style="margin:0">' + full.length + (full.length === 1 ? ' line' : ' lines') + '</span>' +
        '<input type="password" id="ix-actpw" placeholder="Website Password" autocomplete="current-password" aria-label="Website Password" hidden style="max-width:240px"><button type="button" class="ix-btn" id="ix-actgo"' + (j.events.length ? '' : ' disabled') + '>Clear</button></form><p class="ix-err" id="ix-acterr"></p>' + lgBar(f, true) +
        (rows.length ? '<div class="ix-checks">' + rows.join('') + '</div>' : '<div class="ix-empty"><b>' + (j.events.length ? 'No Matches' : 'No Activity Yet') + '</b><p>' + (j.events.length ? 'Try a different search, kind or time.' : 'Logins, backups, updates and changes to settings appear here.') + '</p></div>') + lgPager(full.length, f.pg);
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
      lgBind(p, f, show, function () { lgCsv('activity-' + lgStamp(), ['Time', 'What', 'Detail', 'Browser', 'Address', 'Country'], full.map(function (e) { return [new Date(e.t * 1000).toISOString(), (LOGEV[e.ev] || [e.ev])[0], e.x || '', e.who || '', e.ip || '', e.cc || '']; })); });
      lgPagerOn(p, f, full.length, function (n) { f.pg = n; show(); });
      };
      show();
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
