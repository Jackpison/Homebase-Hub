  /* ---------- Health (Settings > Health): Overview, Domains and Uptime, Server Check ---------- */
  function daysLeft(d) { if (!d) return null; return Math.round((new Date(d + 'T12:00:00') - new Date()) / 864e5); }
  function leftText(n) { return n === null ? '' : n < 0 ? 'ended ' + -n + ' days ago' : n === 0 ? 'ends today' : n + (n === 1 ? ' day' : ' days') + ' left'; }
  function leftCls(n, warn) { return n === null ? '' : n < 0 ? 'bad' : n <= warn ? 'warn' : 'good'; }
  function hCard(label, val, sub, cls, go) {
    return '<' + (go ? 'button type="button" data-go="' + go + '"' : 'div') + ' class="ix-hc ' + (cls || '') + '"><small>' + label + '</small><b>' + val + '</b><span>' + sub + '</span></' + (go ? 'button' : 'div') + '>';
  }
  /* Settings > Health: Overview, Domains and Uptime, Server Check */
  function health(sub) { go(sub || 'health'); }
  function pHealth(p) {
    p.innerHTML = '<div class="ix-row"><span class="ix-spin" aria-hidden="true"><i></i><i></i><i></i></span><span>Checking…</span></div>';
    Promise.all([api('health'), api('watch')]).then(function (r) {
      var h = r[0], w = r[1] || {};
      if (!h.ok) { p.innerHTML = '<p class="ix-err">' + esc(h.error || 'Could not load.') + '</p>'; return; }
      var cronAgo = h.cron ? (Date.now() / 1000 - h.cron) : null, cronOk = cronAgo !== null && cronAgo < 1800;
      var errLines = h.logs.reduce(function (n, l) { return n + l.lines.length; }, 0);
      var maxB = Math.max.apply(null, h.sizes.map(function (x) { return x.bytes; }).concat([1]));
      var up = h.update || {};
      var slowRows = ((h.speed || {}).rows || []).filter(function (x) { return x.ms > 150 || x.bytes > 1500000; });
      var openLogs = h.logs.filter(function (l) { return l.public === true; });
      // the domain, SSL or hosting date that ends first
      var soon = null;
      (w.sites || []).forEach(function (s) {
        [[s.dom && s.dom.exp, 'Domain'], [s.ssl && s.ssl.exp, 'SSL'], [s.hosting, 'Hosting']].forEach(function (x) {
          var n = daysLeft(x[0]); if (n !== null && (!soon || n < soon.n)) soon = { n: n, what: x[1], host: s.host };
        });
      });
      var down = (w.sites || []).filter(function (s) { return s.up && s.st && s.st.at && !s.st.ok; }).length;
      p.innerHTML = '<div class="ix-hcards six">' +
          hCard('Version', esc(h.version), up.newer ? '<a href="' + esc(up.link || '#') + '" target="_blank" rel="noopener">' + esc(up.version) + ' is available</a>' : (h.leftovers.length ? h.leftovers.length + ' update problem' + (h.leftovers.length > 1 ? 's' : '') : 'Files match'), up.newer || h.leftovers.length ? 'warn' : 'good') +
          hCard('Schedule', cronOk ? 'Running' : h.cron ? 'Stopped' : 'Not Set Up', h.cron ? 'Last run ' + esc(ago(h.cron)) : 'Add the cron job (Settings › Telegram)', cronOk ? 'good' : 'warn', 'telegram') +
          hCard('Last Backup', h.backup.last ? esc(ago(h.backup.last)) : 'Never', (h.backup.encrypted ? '🔒 Encrypted' : 'Not Encrypted') + (h.backup.tgEvery ? ', Telegram on' : ''), !h.backup.last || (h.backup.every && (Date.now() / 1000 - h.backup.last) / 86400 >= h.backup.every) ? 'warn' : 'good', 'backup') +
          hCard('Domains', (w.sites || []).length ? (w.sites.length + (w.sites.length === 1 ? ' Site' : ' Sites')) : 'None Yet', down ? down + ' down right now' : soon ? esc(soon.what + ' ' + leftText(soon.n)) : 'Add one to watch its expiry', down || (soon && soon.n <= 14) ? (down || soon.n < 0 ? 'bad' : 'warn') : (w.sites || []).length ? 'good' : '', 'domains') +
          hCard('Disk Used', esc(size(h.total)), 'Your pages, pictures, icons and backups', '') +   /* (1.65.2) no "free on the server": on shared hosting that is the whole disk, not what you may use */
          hCard('PHP Errors', errLines ? errLines + ' lines' : 'None', openLogs.length ? 'A log is publicly readable' : h.logs.length ? h.logs.length + ' log file' + (h.logs.length > 1 ? 's' : '') : 'No error_log files', errLines || openLogs.length ? 'warn' : 'good') +
        '</div>' +
        '<details class="ix-acc"' + (h.leftovers.length || up.newer ? ' open' : '') + '><summary><span>Updates</span><small>Version ' + esc(h.version) + (up.newer ? ', ' + esc(up.version) + ' available' : '') + '</small></summary><div class="ix-accb">' +
          (h.leftovers.length ? '<p><b>Left from an earlier update:</b></p><ul class="ix-ul">' + h.leftovers.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '<div class="ix-status"><span class="ix-ok">✓</span><span>Every page uses this version, and nothing old is left behind.</span></div>') +
          (up.newer ? '<div class="ix-status"><span>!</span><span><b>Version ' + esc(up.version) + ' is available.</b> ' + esc(up.notes || '') + (up.link ? ' <a href="' + esc(up.link) + '" target="_blank" rel="noopener">Get It</a>' : '') + '</span></div>' : '') +
          '<p>Updates come as zip files. If you publish your copy somewhere, an update address (a JSON file with <code>{"version": "1.18.0", "notes": "…", "url": "…"}</code>) lets this page tell you when a newer version is out.</p>' +
          '<form class="ix-row" id="ix-upf"><input type="text" id="ix-upurl" placeholder="https://…/version.json (optional)" value="' + esc(up.url || '') + '" style="flex:1;min-width:220px"><button class="ix-btn">Save and Check</button></form>' +
          (up.err ? '<p class="ix-err">' + esc(up.err) + '</p>' : up.at ? '<p class="ix-note">Checked ' + esc(ago(up.at)) + '.</p>' : '') + '</div></details>' +
        '<details class="ix-acc"><summary><span>Disk Use</span><small>' + esc(size(h.total)) + ' in total</small></summary><div class="ix-accb">' +
          h.sizes.map(function (x) { return '<div class="ix-hrow"><span>' + esc(x.name) + '</span><span class="ix-hbar"><i style="width:' + Math.max(1, x.bytes / maxB * 100) + '%"></i></span><b>' + esc(size(x.bytes)) + '</b><small>' + x.files + ' files</small></div>'; }).join('') + '</div></details>' +
        '<details class="ix-acc"' + (slowRows.length ? ' open' : '') + '><summary><span>Speed</span><small>' + (slowRows.length ? slowRows.length + ' slow to read' : 'Saved Data Reads Quickly') + '</small></summary><div class="ix-accb">' +
          (h.speed.rows || []).map(function (x) { return '<div class="ix-hrow"><span>' + esc(x.name) + '</span><span></span><b>' + (x.bytes ? x.ms + ' ms' : '—') + '</b><small>' + (x.bytes ? esc(size(x.bytes)) : 'no data yet') + '</small></div>'; }).join('') +
          '<div class="ix-hrow"><span>This check took</span><span></span><b>' + h.speed.request_ms + ' ms</b><small>on the server</small></div>' +
          '<div class="ix-hrow"><span>PHP Code Cache (OPcache)</span><span></span><b>' + (h.speed.opcache ? 'On' : 'Off') + '</b><small>' + (h.speed.opcache ? 'pages start faster' : 'ask your host to turn it on: it makes every page start faster') + '</small></div>' +
          '<p class="ix-note">Slow page? Fast data here means the wait is your connection or host.</p></div></details>' +
        '<details class="ix-acc"><summary><span>Backups</span><small>Last full backup ' + (h.backup.last ? esc(when(h.backup.last)) : 'never') + '</small></summary><div class="ix-accb">' +
          '<div class="ix-hrow"><span>Last Full Backup</span><span></span><b>' + (h.backup.last ? esc(when(h.backup.last)) : 'Never') + '</b><small>' + (h.backup.every ? 'reminder every ' + h.backup.every + ' days' : 'no reminder') + '</small></div>' +
          '<div class="ix-hrow"><span>Telegram Backups</span><span></span><b>' + (h.backup.telegram ? esc(when(h.backup.telegram)) : 'None Sent') + '</b><small>' + (h.backup.tgEvery ? 'every ' + h.backup.tgEvery + ' days' : 'off') + '</small></div>' +
          '<div class="ix-hrow"><span>Encryption</span><span></span><b>' + (h.backup.encrypted ? '🔒 On' : 'Off') + '</b><small>Backup › Encryption</small></div>' +
          Object.keys(h.versions).map(function (k) { var v = h.versions[k]; return '<div class="ix-hrow"><span>Earlier versions: ' + (NAMES[k] || k) + '</span><span></span><b>' + v.count + '</b><small>' + esc(size(v.bytes)) + '</small></div>'; }).join('') +
          '<div class="ix-row" style="margin-top:10px"><button type="button" class="ix-btn" id="ix-vbk">Test a Restore</button><span class="ix-note" style="margin:0">Makes a backup, opens it again and checks it, without changing anything.</span></div><div id="ix-vres"></div></div></details>' +
        '<details class="ix-acc"' + (errLines || openLogs.length ? ' open' : '') + '><summary><span>PHP Errors</span><small>' + (openLogs.length ? 'A log is publicly readable' : errLines ? 'From your host\'s error_log files, newest last' : 'No Errors Logged') + '</small></summary><div class="ix-accb">' +
          (h.logs.length ? h.logs.map(function (l) {
            return (l.public === true ? '<div class="ix-status"><span>!</span><span><b>' + esc(l.file) + ' can be opened by anyone on the internet.</b> Error logs can show file paths. Add this to the <code>.htaccess</code> in your site\'s main folder: <code>&lt;FilesMatch "^error_log(\\.[0-9]+)?$"&gt; Require all denied &lt;/FilesMatch&gt;</code></span></div>' : '') + '<div class="ix-log"><div class="ix-row" style="justify-content:space-between"><b>' + esc(l.file) + '</b><span class="ix-note" style="margin:0">' + esc(size(l.size)) + ', changed ' + esc(ago(l.at)) + '</span>' +
              (l.clear && l.size ? '<button type="button" data-hold class="ix-btn" data-clr="' + esc(l.file) + '">Clear</button>' : '') + '</div><pre>' + (l.lines.length ? esc(l.lines.join('\n')) : '(empty)') + '</pre></div>'; }).join('')
            : '<p>No error_log files were found. That is good news.</p>') + '</div></details>' +
        '<p class="ix-note">PHP version, limits and extensions, and whether your hosting can reach other websites: <button type="button" class="ix-linkbtn" style="padding:0" data-go="check">Server Check</button>.</p>';
      if (window.HUB && HUB.countUp) HUB.countUp([].filter.call(p.querySelectorAll('.ix-hcards .ix-hc b'), function (b) { return /^(Disk Used|PHP Errors|Domains)$/.test(b.parentNode.querySelector('small').textContent); }));   // (1.65.0) these numbers roll up; the version never does
      p.querySelectorAll('[data-clr]').forEach(function (b) { b.onclick = function () {
        api('health_log_clear', { file: b.dataset.clr }).then(function (j) { if (j.ok) { toast('Log cleared.'); pHealth(p); } else toast(j.error); });
      }; });
      var vb = p.querySelector('#ix-vbk');
      if (vb) vb.onclick = function () {
        var box = p.querySelector('#ix-vres'); vb.disabled = true; box.innerHTML = '<div class="ix-row"><span class="ix-spin" aria-hidden="true"><i></i><i></i><i></i></span><span>Testing…</span></div>';
        api('health_verify', {}).then(function (j) {
          vb.disabled = false;
          if (!j.ok) { box.innerHTML = '<p class="ix-err">' + esc(j.error || 'The test could not run.') + '</p>'; return; }
          box.innerHTML = '<div class="ix-status"><span class="' + (j.ok && !j.checks.some(function (c) { return !c.ok; }) ? 'ix-ok">✓' : '">!') + '</span><span><b>' + (j.checks.some(function (c) { return !c.ok; }) ? 'Something did not check out.' : 'Your backups work.') + '</b></span></div>' +
            '<ul class="ix-ul">' + j.checks.map(function (c) { return '<li>' + (c.ok ? '✓ ' : '✗ ') + esc(c.name) + (c.note ? ' <small>(' + esc(c.note) + ')</small>' : '') + '</li>'; }).join('') + '</ul>';
        }).catch(function () { vb.disabled = false; box.innerHTML = '<p class="ix-err">The test could not run.</p>'; });
      };
      p.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () {
        var g = b.dataset.go;
        go(g);
      }; });
      p.querySelector('#ix-upf').onsubmit = function (e) { e.preventDefault(); api('health_update', { url: p.querySelector('#ix-upurl').value }).then(function (j) { if (j.ok) pHealth(p); }); };
    });
  }
  function pDomains(p) {
    p.innerHTML = '<p>Domain and SSL expiry, hosting renewals and uptime, with Telegram alerts and tasks.</p><div id="ix-wbox"><div class="ix-row"><span class="ix-spin" aria-hidden="true"><i></i><i></i><i></i></span><span>Loading…</span></div></div>';
    api('watch').then(function (w) {
      var box = p.querySelector('#ix-wbox'); if (!box) return;
      if (!w || !w.ok) { box.innerHTML = '<p class="ix-err">' + esc((w && w.error) || 'Could not load.') + '</p>'; return; }
      watchBox(box, w);
    });
  }
  function watchBox(box, w) {
    var draw = function (w) {
      var t = w.tasks || {};
      box.innerHTML = '<form class="ix-row ix-uf-row" id="ix-wadd">' + linkField({ id: 'ix-whost', prefix: 'https://', strip: true, copy: false, placeholder: 'example.com or shop.example.com', label: 'Domain' }) +
          '<label class="ix-chk" style="margin:0"><input type="checkbox" id="ix-wup" checked> Uptime</label><button class="ix-btn pri">Add and Check</button></form>' +
        (w.sites && w.sites.length ? w.sites.map(function (s) {
          var st = s.st || {}, dn = daysLeft(s.dom && s.dom.exp), sn = daysLeft(s.ssl && s.ssl.exp), hn = daysLeft(s.hosting);
          var upTxt = !s.up ? '<span class="ix-wdot off"></span>Uptime off' : st.at ? '<span class="ix-wdot ' + (st.ok ? 'up' : 'down') + '"></span>' + (st.ok ? 'Up' : 'Down') + (st.code ? ' (' + st.code + (st.ms ? ', ' + st.ms + ' ms' : '') + ')' : '') + ', ' + esc(ago(st.at)) : '<span class="ix-wdot off"></span>Not checked yet';
          return '<div class="ix-wsite" data-host="' + esc(s.host) + '"><div class="ix-row" style="justify-content:space-between"><b>' + esc(s.host) + '</b><span class="ix-wup">' + upTxt + '</span></div>' +
            '<div class="ix-wgrid">' +
              '<div><small>Domain' + (s.dom && s.dom.name && s.dom.name !== s.host ? ' (' + esc(s.dom.name) + ')' : '') + '</small><b class="' + leftCls(dn, 30) + '">' + (s.dom && s.dom.exp ? esc(new Date(s.dom.exp + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })) : '—') + '</b><span>' + (s.dom && s.dom.exp ? esc(leftText(dn)) + (s.dom.registrar ? ', ' + esc(s.dom.registrar) : '') : esc((s.dom && s.dom.err) || 'Not checked yet')) + '</span></div>' +
              '<div><small>SSL Certificate</small><b class="' + leftCls(sn, 14) + '">' + (s.ssl && s.ssl.exp ? esc(new Date(s.ssl.exp + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })) : '—') + '</b><span>' + (s.ssl && s.ssl.exp ? esc(leftText(sn)) + (s.ssl.issuer ? ', ' + esc(s.ssl.issuer) : '') : esc((s.ssl && s.ssl.err) || 'Not checked yet')) + '</span></div>' +
              '<div><small>Hosting Renews</small><input type="date" data-hosting value="' + esc(s.hosting || '') + '" aria-label="Hosting renewal date for ' + esc(s.host) + '"><span>' + (s.hosting ? esc(leftText(hn)) : 'Your hosting\'s renewal date') + '</span></div>' +
            '</div><div class="ix-row" style="margin-top:8px"><label class="ix-chk" style="margin:0"><input type="checkbox" data-up' + (s.up ? ' checked' : '') + '> Check Uptime Every 5 Minutes</label><span style="flex:1"></span><button type="button" data-hold class="ix-btn" data-del>Remove</button></div></div>';
        }).join('') : '<p class="ix-note" style="margin:14px 0">No domains yet. Add yours above: the expiry dates are looked up for you.</p>') +
        '<div class="ix-row" style="margin-top:10px"><button type="button" class="ix-btn" id="ix-wnow"' + (w.sites && w.sites.length ? '' : ' disabled') + '>Check Everything Now</button></div>' +
        '<h3>Renewal Tasks</h3><p>Expiry dates become tasks, so reminders cover them.</p>' +
        '<label class="ix-tg"><span>Domain Expiry<small>A task 30 days ahead.</small></span><input type="checkbox" data-t="dom"' + (t.dom ? ' checked' : '') + '></label>' +
        '<label class="ix-tg"><span>Hosting Renewal<small>From the date you enter above.</small></span><input type="checkbox" data-t="host"' + (t.host ? ' checked' : '') + '></label>' +
        '<label class="ix-tg"><span>SSL Certificate<small>Usually off: certificates renew themselves.</small></span><input type="checkbox" data-t="ssl"' + (t.ssl ? ' checked' : '') + '></label>' +
        '<p class="ix-note">Runs with the cron job: uptime every 5 minutes, expiry twice a day.</p>';
      var busy = function (b, txt) { b.disabled = true; b.textContent = txt; };
      box.querySelector('#ix-wadd').onsubmit = function (e) {
        e.preventDefault(); var b = e.target.querySelector('button'); busy(b, 'Checking…');
        api('watch_add', { host: box.querySelector('#ix-whost').value, up: box.querySelector('#ix-wup').checked }).then(function (j) { if (!j.ok) { toast(j.error); b.disabled = false; b.textContent = 'Add and Check'; return; } toast('Added.'); draw(j); });
      };
      box.querySelector('#ix-wnow').onclick = function () { busy(this, 'Checking…'); api('watch_check', {}).then(function (j) { if (j.ok) { toast('Checked.'); draw(j); } }); };
      box.querySelectorAll('[data-t]').forEach(function (c) { c.onchange = function () { var o = {}; o[c.dataset.t] = c.checked; api('watch_tasks', o).then(function (j) { if (j.ok) toast('Saved.'); }); }; });
      box.querySelectorAll('.ix-wsite').forEach(function (r) {
        var h = r.dataset.host;
        r.querySelector('[data-hosting]').onchange = function (e) { api('watch_set', { host: h, hosting: e.target.value }).then(function (j) { if (j.ok) { toast(e.target.value ? 'Hosting date saved.' : 'Hosting date removed.'); draw(j); } }); };
        r.querySelector('[data-up]').onchange = function (e) { api('watch_set', { host: h, up: e.target.checked }).then(function (j) { if (j.ok) draw(j); }); };
        r.querySelector('[data-del]').onclick = function () {
          api('watch_del', { host: h }).then(function (j) { if (j.ok) { toast('Removed. Its tasks stay in Tasks.'); draw(j); } });
        };
      });
    };
    draw(w);
  }

