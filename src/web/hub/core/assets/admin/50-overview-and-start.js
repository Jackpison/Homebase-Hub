  /* Health > Server Check: why icons or titles can't be fetched, folder permissions, then PHP, limits and extensions; (1.70.0) below them
     Files That Do Not Belong (pFiles, the Files tab of Updates before). */
  function pCheck(p) {
    p.innerHTML = '<div class="ix-scbox"></div><h3 class="ix-h3" id="ix-fnb">Files That Do Not Belong</h3><p>Your server\'s files compared with this version\'s list: extra, changed by hand or missing.</p><div class="ix-fls"></div>';
    checkInto(p.querySelector('.ix-scbox')); pFiles(p.querySelector('.ix-fls'));
  }
  function checkInto(p) {
    p.innerHTML = '<p>What your hosting allows: outside connections, folder writes and PHP features.</p><div class="ix-row"><span class="ix-spin" aria-hidden="true"><i></i><i></i><i></i></span><span>Running…</span></div>';
    Promise.all([api('diag'), api('health')]).then(function (r) {
      var j = r[0], h = r[1] || {};
      if (!j.ok) { p.innerHTML = '<p class="ix-err">' + esc(j.error || 'Could not run the check.') + '</p>'; return; }
      var bad = j.checks.filter(function (c) { return !c.ok; }).length;
      p.innerHTML = '<div class="ix-hcards">' +
          hCard('Checks', bad ? bad + ' to Look At' : 'All Passed', bad ? 'of ' + j.checks.length + ' checks, marked ! below' : j.checks.length + ' checks: your hosting allows everything', bad ? 'warn' : 'good') +
          (h.ok ? hCard('PHP', esc(h.php), esc(h.server), '') + hCard('Memory per Request', String(h.limits.memory) === '-1' ? 'No Limit' : esc(h.limits.memory), 'Time limit ' + (h.limits.time ? h.limits.time + ' s' : 'none'), '') +
            hCard('Largest Upload', esc(h.limits.upload), esc(h.limits.post) + ' per request', '') : '') +
        '</div>' +
        '<h3>Connections and Folders</h3><div class="ix-checks">' + j.checks.map(function (c) {
          return checkRow(c.ok ? '' : 'warn', c.ok ? '✓' : '!', esc(c.name), esc(c.note)); }).join('') + '</div>' +
        (h.ok ? '<h3>PHP Extensions</h3><div class="ix-exts">' + Object.keys(h.ext).map(function (e) { return '<span class="' + (h.ext[e] ? 'on' : 'off') + '">' + (h.ext[e] ? '✓ ' : '✗ ') + esc(e) + '</span>'; }).join('') + '</div>' +
          '<p class="ix-note">Time zone ' + esc(String(h.tz || '').replace(/_/g, ' ')) + '.</p>' : '') +
        '<div class="ix-row" style="margin-top:12px"><button type="button" class="ix-btn" id="ix-rc2">Run Again</button></div>';
      p.querySelector('#ix-rc2').onclick = function () { checkInto(p); };
    });
  }
  /* ---------- Overview: where things stand ---------- */
  var hourLbl = function (h) { return (h % 12 || 12) + ':00 ' + (h < 12 ? 'AM' : 'PM'); };
  function decorateNav() {
    if (!OV || !PAGE) return;
    var pill = function (id, txt, cls) { var e = PAGE.querySelector('[data-pill="' + id + '"]'); if (e) { e.textContent = txt || ''; e.className = 'ix-sp ' + (cls || ''); } };
    var pr = OV.protect, tg = OV.telegram, bk = OV.backup, up = OV.update, fl = OV.files, now = Date.now() / 1000, run = tg.cronLast && now - tg.cronLast < 1800;
    pill('security', pr.on + ' of ' + pr.total, pr.on >= pr.total ? 'good' : 'warn');
    pill('telegram', !tg.ready ? 'Set up' : run ? 'Running' : 'Check', !tg.ready ? '' : run ? 'good' : 'warn');
    var late = bk.every > 0 && (!bk.last || (now - bk.last) / 86400 >= bk.every);
    pill('backup', bk.last ? ago(bk.last).replace(' ago', '') : 'Never', late ? 'warn' : bk.last ? 'good' : '');
    var n = fl ? fl.extra + fl.changed : 0;
    pill('updates', up.staged ? 'Ready' : up.newer ? 'New Version' : n ? n + ' to check' : 'Up to date', up.staged || up.newer || n ? 'warn' : 'good');
    var al = (OV.alerts || []).length;
    pill('overview', al ? al + ' to see' : '', al ? 'warn' : '');
    pill('look', S.theme === 'auto' ? 'Auto' : S.theme === 'light' ? 'Light' : 'Dark', '');
    pill('health', OV.https ? 'OK' : 'No HTTPS', OV.https ? 'good' : 'warn');
    var sv = PAGE.querySelector('[data-sver]'); if (sv) sv.textContent = ' · v' + OV.version;    paintHead();
  }
  /* (1.74.3) the status on the right of the section header: the same words and colour as the pill in the left panel; Security adds a bar
     and, when the next step is HTTPS (which is set up with the host, in Health), a button to it */
  function paintHead() {
    var h = PAGE && PAGE.querySelector('#ix-phs'), box = h && h.closest('.ix-ph'); if (!h || !OV) return;
    var sec = box.dataset.sec, pill = PAGE.querySelector('[data-pill="' + sec + '"]'), txt = pill ? pill.textContent : '', cls = pill && /good|warn/.test(pill.className) ? (/good/.test(pill.className) ? 'good' : 'warn') : '';
    if (sec === 'overview' || sec === 'look' || !txt) { h.hidden = true; h.innerHTML = ''; return; }
    var pr = OV.protect, bar = sec === 'security' ? '<span class="ix-phb"><i style="width:' + Math.round(100 * (pr.on + 1) / (pr.total + 1)) + '%"></i></span>' : '';
    var nx = sec === 'security' && pr.next && pr.next.key === 'https' ? '<button type="button" class="ix-btn pri" data-phgo="health">Fix Next: HTTPS</button>' : '';
    h.innerHTML = '<span class="ix-phc ' + cls + '">' + esc(txt) + '</span>' + bar + nx; h.hidden = false;
    var b = h.querySelector('[data-phgo]'); if (b) b.onclick = function () { go(b.dataset.phgo); };
  }
  /* (1.70.0) Overview > Start Here: Guided Setup, then Install on Your Phone and Keyboard Shortcuts */
  function pStart(p) {
    p.innerHTML = '<div class="ix-wzhost"></div><div class="ix-help"></div>';
    pSetup(p.querySelector('.ix-wzhost')); helpCards(p.querySelector('.ix-help'));
  }
  /* ---------- Guided Setup: the protection steps one after another, using the same flows as Security and Backup ---------- */
  var WZ = { open: '', pp: '', site: '', rec: '', skipped: {} };   // what you typed stays here only while Settings is open, never saved
  function setupSteps(j) {
    var on = function (k) { var x = j.protect.items.filter(function (i) { return i.key === k; })[0]; return !!(x && x.on); };
    return [
      { key: 'pw', title: 'Website Password', done: true, icon: ICON.key, text: 'The one password for every page of your site.' },
      { key: 'enc', title: 'Encryption Passphrase', done: on('enc'), icon: ICON.lock, text: 'Locks your private tabs and your backup files.' },
      { key: 'recovery', title: 'Recovery Key', done: on('recovery'), icon: ICON.shield, text: 'A spare way in, if you ever forget the passphrase.' },
      { key: 'twostep', title: 'Two-Step Login', done: on('twostep'), icon: ICON.device, text: 'A 6-digit code from your phone on top of the password.' },
      { key: 'backup', title: 'First Backup', done: !!(j.backup && j.backup.last), icon: ICON.box, text: 'One file with everything, kept somewhere safe.' }
    ];
  }
  /* (1.66.0) One step bar for every step-by-step screen: thin bars with the step names under them. Done steps fill with the accent, the
     current one is bright, the ones to come are dim, a skipped one is dashed. o.keys: a data-open key per step (Guided Setup) or o.show (the
     step whose card shows; bindStepBar switches it); o.locked: the bar only shows where you are (Updates, Two-Step Login). Phones show
     only "2 of 4 · Name" under the bars. */
  function stepBar(names, at, o) {
    o = o || {};
    return '<div class="ix-sbar' + (o.locked ? ' locked' : '') + '" role="list" aria-label="Steps">' + names.map(function (n, i) {
      var st = (o.done && o.done[i] ? ' done' : '') + (o.skip && o.skip[i] ? ' skip' : '') + (i === at ? ' now' : '');
      var lab = 'Step ' + (i + 1) + ' of ' + names.length + ', ' + n + (i === at ? ', current' : o.done && o.done[i] ? ', done' : '');
      var attr = o.keys ? ' data-open="' + o.keys[i] + '"' : o.show ? ' data-stp="' + i + '"' : '';
      return o.locked ? '<span role="listitem" class="ix-sbi' + st + '" aria-label="' + esc(lab) + '"' + (i === at ? ' aria-current="step"' : '') + '><i></i><b>' + esc(n) + '</b></span>'
        : '<button type="button" role="listitem" class="ix-sbi' + st + '"' + attr + ' aria-label="' + esc(lab) + '"' + (i === at ? ' aria-current="step"' : '') + '><i></i><b>' + esc(n) + '</b></button>';
    }).join('') + '</div><div class="ix-sbph">' + (at + 1) + ' of ' + names.length + ' · ' + esc(names[Math.max(0, at)] || '') + '</div>';
  }
  /* Telegram Setup: the bar shows one step's card at a time (no redraw); Back and Next under it */
  function bindStepBar(root, list, start) {
    var bar = root.querySelector('.ix-sbar'), items = [].slice.call(list.children), ph = root.querySelector('.ix-sbph');
    if (!bar || !items.length) return;
    var names = [].map.call(bar.querySelectorAll('.ix-sbi b'), function (b) { return b.textContent; });
    var show = function (n) {
      n = Math.max(0, Math.min(items.length - 1, n));
      items.forEach(function (li, i) { li.hidden = i !== n; if (i === n) li.classList.add('ix-sin'); });
      [].forEach.call(bar.querySelectorAll('.ix-sbi'), function (b, i) { b.classList.toggle('now', i === n); if (i === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
      if (ph) ph.textContent = (n + 1) + ' of ' + names.length + ' · ' + names[n];
      list.dataset.at = String(n);
      var bk = root.querySelector('[data-sb="back"]'), nx = root.querySelector('[data-sb="next"]');
      if (bk) bk.disabled = n === 0; if (nx) nx.disabled = n === items.length - 1;
    };
    bar.addEventListener('click', function (e) { var b = e.target.closest('[data-stp]'); if (b) show(+b.dataset.stp); });
    root.addEventListener('click', function (e) { var b = e.target.closest('[data-sb]'); if (b) show(+list.dataset.at + (b.dataset.sb === 'next' ? 1 : -1)); });
    show(start == null ? Math.max(0, [].indexOf.call(bar.querySelectorAll('.ix-sbi'), bar.querySelector('.ix-sbi.now'))) : start);
  }
  function pSetup(p) {
    p.innerHTML = spinRow('Checking your setup…');
    var steps = [], draw, progress;
    /* only the ring and the step badges change: a step you are in the middle of (recovery codes on screen) is never redrawn */
    progress = function () {
      return api('overview').then(function (j) {
        if (!j.ok) return; OV = j; decorateNav(); steps = setupSteps(j);
        var done = steps.filter(function (s) { return s.done; }).length, ring = p.querySelector('.ix-ring');
        if (ring) { ring.style.setProperty('--p', Math.round(done / steps.length * 100)); ring.classList.toggle('ok', done === steps.length); ring.querySelector('b').textContent = done; }
        steps.forEach(function (s) { var n = p.querySelector('[data-stepn="' + s.key + '"]'); if (n) { n.classList.toggle('done', s.done); n.textContent = s.done ? '✓' : steps.indexOf(s) + 1; } });
      });
    };
    secRefresh = function () { progress(); };
    var fd = function (id, label, type, auto) { return ecField(id, label, type, auto); };
    var errOf = function (x) { return x && x.user ? x.message : "Can't reach the server. Nothing was changed."; };
    draw = function () {
      api('overview').then(function (j) {
        if (!j.ok) { p.innerHTML = '<p class="ix-err">' + esc(j.error || 'Could not load.') + '</p>'; return; }
        OV = j; decorateNav(); steps = setupSteps(j);
        var done = steps.filter(function (s) { return s.done; }).length;
        var next = steps.filter(function (s) { return !s.done && !WZ.skipped[s.key]; })[0];
        var act = WZ.open && steps.some(function (s) { return s.key === WZ.open; }) ? WZ.open : (next ? next.key : '');
        var encOn = steps[1].done;
        var bodies = {
          pw: '<p class="ix-note" style="margin-top:0">Your website password is set. You can change it any time in Security.</p><div class="ix-row"><button type="button" class="ix-btn" data-go2="security/password">Open Password</button></div>',
          enc: steps[1].done ? '<div class="ix-status"><span class="ix-ok">✓</span><span>Your passphrase is set. Private tabs and backup files can be locked with it.</span></div>' :
            '<form id="ix-wze"><div class="ix-fgrid">' + fd('ix-wp1', 'New Passphrase', 'password', 'new-password') + fd('ix-wp2', 'Type It Again', 'password', 'new-password') + '</div>' +
            fd('ix-wpw', 'Website Password', 'password', 'current-password') +
            '<label class="ix-chk"><input type="checkbox" id="ix-wack"> I understand the passphrase can\'t be recovered, only replaced with a recovery key.</label>' +
            '<p class="ix-err" id="ix-wzerr"></p><div class="ix-row"><button class="ix-btn pri" id="ix-wzgo">Set Passphrase</button></div></form>',
          recovery: WZ.rec ? '<div class="ix-status"><span class="ix-ok">✓</span><span><b>Your recovery key. It is shown only now.</b></span></div>' + linkField({ id: 'ix-wzrk', value: WZ.rec, prefix: 'Key', readonly: true, copyId: 'ix-wzcp', label: 'Recovery key', cls: 'ix-uf-key', wrap: true }) +
              '<div class="ix-row"><button type="button" class="ix-btn pri" id="ix-wzsaved">I Saved It, Continue</button></div>' +
              '<p class="ix-note">Save it somewhere safe, apart from this server. A key made earlier no longer works.</p>' :
            steps[2].done ? '<div class="ix-status"><span class="ix-ok">✓</span><span>A recovery key exists. Make a new one any time in Security › Encryption.</span></div>' :
            !encOn ? '<p class="ix-note" style="margin-top:0">Set the passphrase first (the step above), then the recovery key is one click.</p><div class="ix-row"><button type="button" class="ix-btn" data-open="enc">Go to the Passphrase</button></div>' :
            '<form id="ix-wzr">' + (WZ.pp ? '' : fd('ix-wrp', 'Your Passphrase', 'password', 'off')) + (WZ.site ? '' : fd('ix-wrw', 'Website Password', 'password', 'current-password')) +
              '<p class="ix-err" id="ix-wzerr"></p><div class="ix-row"><button class="ix-btn pri" id="ix-wzgo">Make Recovery Key</button></div></form>',
          twostep: steps[3].done ? '<div class="ix-status"><span class="ix-ok">✓</span><span>Two-step login is on. Manage it in Security › Two-Step Login.</span></div>' : '<div id="ix-wz2"></div>',
          backup: steps[4].done ? '<div class="ix-status"><span class="ix-ok">✓</span><span>You have made a full backup. Make another any time in Backup & Restore.</span></div>' :
            '<p class="ix-note" style="margin-top:0">Downloads one file with all your pages and settings' + (encOn ? ', with your encrypted tabs still locked' : '') + '. Keep it somewhere safe, apart from this server.</p>' +
            '<p class="ix-err" id="ix-wzerr"></p><div class="ix-row"><button type="button" class="ix-btn pri" id="ix-wzbk">' + svg(ICON.down) + 'Download Full Backup</button></div>'
        };
        p.innerHTML = tabHead(ICON.shield, 'Guided Setup', 'Protect your site in a few short steps. Each one uses the same screen you would find in Security, so nothing here is different, just in order.') +
          '<div class="ix-hero"><div class="ix-ring ' + (done === steps.length ? 'ok' : '') + '" style="--p:' + Math.round(done / steps.length * 100) + '"><b>' + done + '</b><small>of ' + steps.length + '</small></div>' +
            '<div class="ix-hero-t"><div class="ix-hero-h">' + (done === steps.length ? 'Your Site Is Set Up' : next ? 'Next: ' + next.title : 'Skipped Steps Are Waiting') + '</div><p>' +
            (done === steps.length ? 'Every recommended protection is on. Telegram alerts are optional, and below if you want them.' : 'You can skip a step and come back to it. Nothing is changed until you press the step\'s own button.') + '</p></div></div>' +
          stepBar(steps.map(function (s) { return s.title; }), Math.max(0, steps.findIndex(function (s) { return s.key === act; })), { keys: steps.map(function (s) { return s.key; }),
            done: steps.map(function (s) { return s.done; }), skip: steps.map(function (s) { return !s.done && !!WZ.skipped[s.key]; }) }) +
          '<div class="ix-steps ix-one">' + steps.map(function (s, i) {
            var open = s.key === act, skipped = !s.done && WZ.skipped[s.key];
            return '<section class="ix-ec ix-step' + (s.done ? ' done' : '') + (open ? ' open' : '') + '"><button type="button" class="ix-ec-h ix-steph" data-open="' + s.key + '" aria-expanded="' + open + '">' +
              '<span class="ix-stepn' + (s.done ? ' done' : '') + '" data-stepn="' + s.key + '">' + (s.done ? '✓' : i + 1) + '</span><div><div class="ix-ec-t">' + esc(s.title) + '</div><div class="ix-ec-d">' + esc(s.text) + '</div></div>' +
              '<span class="ix-pill ' + (s.done ? 'good' : skipped ? '' : open ? 'warn' : '') + '">' + (s.done ? 'Done' : skipped ? 'Skipped' : open ? 'Now' : 'To Do') + '</span></button>' +
              (open ? '<div class="ix-ec-b">' + bodies[s.key] + '<div class="ix-row ix-sbnav">' + (i ? '<button type="button" class="ix-btn" data-open="' + steps[i - 1].key + '">Back</button>' : '') + '<span></span>' +
                (s.done || s.key === 'pw' ? '' : '<button type="button" class="ix-btn ix-quiet2" data-skip="' + s.key + '">Skip for Now</button>') +
                (i < steps.length - 1 ? '<button type="button" class="ix-btn' + (s.done ? ' pri' : '') + '" data-open="' + steps[i + 1].key + '">Next</button>' : '') + '</div></div>' : '') + '</section>'; }).join('') + '</div>' +
          (done === steps.length ? '<div class="ix-row" style="margin-top:6px"><button type="button" class="ix-btn pri" data-go2="overview">Back to Overview</button></div>' : '') +
          ecCard('', ICON.send, 'Optional: Telegram', 'Reminders, login alerts, instant approval of new logins, and automatic backups on your phone. It takes about two minutes.', '<div class="ix-row"><button type="button" class="ix-btn" data-go2="telegram/setup">Open Telegram Setup</button></div>');
        // wiring
        p.querySelectorAll('[data-go2]').forEach(function (b) { b.onclick = function () { go(b.dataset.go2); }; });
        p.querySelectorAll('[data-open]').forEach(function (b) { b.onclick = function () { WZ.open = WZ.open === b.dataset.open && b.classList.contains('ix-steph') ? '' : b.dataset.open; draw(); }; });
        p.querySelectorAll('[data-skip]').forEach(function (b) { b.onclick = function () {
          WZ.skipped[b.dataset.skip] = true; var k = steps.findIndex(function (s) { return s.key === b.dataset.skip; }), nx = steps.slice(k + 1).filter(function (s) { return !s.done; })[0];
          WZ.open = nx ? nx.key : ''; draw(); }; });
        var er = function () { return p.querySelector('#ix-wzerr'); }, v = function (id) { var x = p.querySelector(id); return x ? x.value : ''; };
        var f1 = p.querySelector('#ix-wze');
        if (f1) f1.onsubmit = function (e) {
          e.preventDefault(); var n1 = v('#ix-wp1'), site = v('#ix-wpw');
          if (n1.length < 8) { er().textContent = 'Use at least 8 characters for the passphrase.'; return; }
          if (n1 !== v('#ix-wp2')) { er().textContent = 'The two passphrases are not the same.'; return; }
          if (!site) { er().textContent = 'Type your website password.'; return; }
          if (!p.querySelector('#ix-wack').checked) { er().textContent = 'Please confirm you understand the passphrase can\'t be recovered.'; return; }
          var b = p.querySelector('#ix-wzgo'); b.disabled = true; er().textContent = 'Setting…';
          PP.set({ pp: n1, site: site, old: '' }).then(function () { WZ.pp = n1; WZ.site = site; WZ.open = 'recovery'; toast('Passphrase set.'); draw(); })
            .catch(function (x) { er().textContent = x && x.needOld ? 'Some tabs are already locked with an earlier passphrase. Set it in Security › Encryption, where you can type the earlier one.' : errOf(x); b.disabled = false; });
        };
        var f2 = p.querySelector('#ix-wzr');
        if (f2) f2.onsubmit = function (e) {
          e.preventDefault(); var pp = WZ.pp || v('#ix-wrp'), site = WZ.site || v('#ix-wrw');
          if (!pp || !site) { er().textContent = 'Type the passphrase and your website password.'; return; }
          var b = p.querySelector('#ix-wzgo'); b.disabled = true; er().textContent = 'Making it…';
          PP.makeRecovery({ pp: pp, site: site }).then(function (code) { WZ.rec = code; WZ.open = 'recovery'; draw(); })
            .catch(function (x) { er().textContent = errOf(x); b.disabled = false; });
        };
        var sv = p.querySelector('#ix-wzsaved'); if (sv) sv.onclick = function () { WZ.rec = ''; WZ.open = 'twostep'; draw(); };
        var tb = p.querySelector('#ix-wz2'); if (tb) twoStep(tb);
        var bk = p.querySelector('#ix-wzbk');
        if (bk) bk.onclick = function () {
          bk.disabled = true; er().textContent = 'Making your backup…';
          fetch(CORE + 'api.php?action=backup', { credentials: 'same-origin', headers: { 'X-Hub-CSRF': S.csrf } }).then(function (r) {
            if (!r.ok) return r.json().then(function (j) { throw new Error(j.error || 'Backup failed.'); });
            var name = (/filename="([^"]+)"/.exec(r.headers.get('Content-Disposition') || '') || [])[1] || 'backup.json';
            return r.blob().then(function (blob) {
              var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
              S.backupLast = Date.now() / 1000; remember(S); toast('Backup downloaded.'); draw();
            });
          }).catch(function (e) { er().textContent = e.message || 'Backup failed.'; bk.disabled = false; });
        };
      }, function () { p.innerHTML = '<p class="ix-err">Can\'t reach the server.</p>'; });
    };
    draw();
  }

  function pOverview(p) {
    p.innerHTML = '<p class="ix-ld">Checking how things stand…</p>';
    ovGet().then(function (j) {
      if (!j.ok) { p.innerHTML = '<p class="ix-err">' + esc(j.error || 'Could not load the overview.') + '</p>'; return; }
      OV = j; decorateNav();
      var pr = j.protect, tg = j.telegram, bk = j.backup, up = j.update, fl = j.files, now = Date.now() / 1000;
      var run = tg.cronLast && now - tg.cronLast < 1800;
      var card = function (go, title, pill, cls, l1, l2, action) {
        return '<div class="ix-oc"><div class="ix-oh"><b>' + title + '</b><span class="ix-pill ' + cls + '">' + esc(pill) + '</span></div><div class="ix-ol">' + l1 + '</div>' + (cls === 'good' ? '' : '<div class="ix-os">' + l2 + '</div>') +
          '<button type="button" class="ix-btn ix-ovgo" data-go="' + go + '">' + action + '</button></div>'; };   // (1.74.2) compact: the detail line only when something needs a look
      var onNames = [['Password']].concat(pr.items.filter(function (x) { return x.on; }).map(function (x) { return [x.title]; })).map(function (x) { return x[0].toLowerCase(); });
      var n = fl ? fl.extra + fl.changed : 0;
      var cards = [
        card('general', 'Site', 'Set up', 'good', '<b>' + esc(j.siteName) + '</b>' + (j.logo ? ', with your logo.' : ', no logo yet.'), 'Name, logo, time zone and the pages in your bar.', 'Open General'),
        card('security', 'Security', pr.on + ' of ' + pr.total + ' on', pr.on >= pr.total ? 'good' : 'warn', 'On: ' + esc(onNames.join(', ')) + '.', pr.next ? '<b>Next best step:</b> ' + esc(pr.next.next) : 'Everything we recommend is on.', 'Review Security'),
        !tg.ready
          ? card('telegram', 'Telegram', 'Not Set Up', '', 'Get reminders, login alerts and backups on your phone.', 'It takes about two minutes: make a bot, send it one message, done.', 'Set Up Telegram')
          : card('telegram', 'Telegram', run ? 'Running' : 'Needs a Look', run ? 'good' : 'warn', run ? 'The schedule last ran ' + esc(ago(tg.cronLast)) + '.' : (tg.cronLast ? 'The schedule stopped ' + esc(ago(tg.cronLast)) + '.' : 'The schedule has never run.'),
              (tg.on ? 'Daily message at ' + hourLbl(tg.hour) + '. ' : 'Daily message is off. ') + (tg.lastSent ? 'Last message ' + esc(ago(tg.lastSent)) + '.' : 'Nothing sent yet.'), 'Open Telegram'),
        card('backup', 'Backup & Restore', bk.last ? ago(bk.last) : 'No Backup Yet', (bk.every > 0 && (!bk.last || (now - bk.last) / 86400 >= bk.every)) || !bk.last ? 'warn' : 'good',
              bk.tg ? 'A backup goes to Telegram ' + ({ 1: 'every day', 3: 'every 3 days', 7: 'every week', 14: 'every 2 weeks', 30: 'every month' }[bk.tg] || 'regularly') + (bk.enc ? ', encrypted.' : ', not encrypted.') : 'Download one file that restores everything.', 'A backup holds your pages, settings, Telegram and domain watch.', 'Back Up Now'),
        card('updates', 'Updates', up.staged ? 'Update Ready' : up.newer ? 'New Version' : n ? n + ' to check' : 'Up to Date', up.staged || up.newer || n ? 'warn' : 'good',
              up.staged ? 'Version <b>' + esc(up.staged.version) + '</b> is checked and waiting for you.' : up.newer ? 'Version <b>' + esc(up.newer) + '</b> is available on GitHub. You have <b>' + esc(j.version) + '</b>.' : 'You have version <b>' + esc(j.version) + '</b>.',
              !up.hasManifest ? 'Update once with the File Manager, then the site can update itself.' : fl ? (n ? n + ' file' + (n > 1 ? 's' : '') + ' to look at in Files.' : 'Every file on your server belongs to this version.') : 'Upload a new zip here. No File Manager, nothing to delete by hand.', up.staged ? 'Review the Update' : 'Update the Site'),
        card('health', 'Health', 'PHP ' + j.php.split('.').slice(0, 2).join('.'), '', (j.https ? 'HTTPS is on.' : '<b>HTTPS is off.</b>') + ' Version ' + esc(j.version) + '.', 'Disk use, speed, errors, your domains and what your hosting allows.', 'Open Health')
      ];
      var al = (j.alerts || []).slice(0, 4).map(function (a) {
        return '<div class="ix-al ' + a.level + '"><span class="ix-ali">' + (a.level === 'info' ? 'i' : '!') + '</span><span>' + esc(a.text) + '</span><button type="button" class="ix-btn" data-go="' + a.go + '">Open</button></div>'; }).join('');
      var stp = setupSteps(j), stDone = stp.filter(function (x) { return x.done; }).length;
      var chip = function (id, label, cls) { return '<button type="button" class="ix-jchip" data-go="' + id + '"><i class="ix-dot ' + (cls || '') + '"></i>' + label + '</button>'; };
      var chips = '<div class="ix-jchips" role="navigation" aria-label="Jump to">' +
        chip('security', 'Security', pr.on >= pr.total ? 'good' : 'warn') + chip('telegram', 'Telegram', tg.ready ? (run ? 'good' : 'warn') : '') +
        chip('backup', 'Backup', bk.last ? 'good' : 'warn') + chip('look', 'Appearance', '') + chip('updates', 'Updates', up.staged || up.newer || n ? 'warn' : 'good') +
        chip('health', 'Health', j.https ? 'good' : 'warn') + chip('changelog', 'What\'s New', '') + '</div>';
      var banner = stDone < stp.length ? '<div class="ix-hero ix-setupb"><div class="ix-ring" style="--p:' + Math.round(stDone / stp.length * 100) + '"><b>' + stDone + '</b><small>of ' + stp.length + '</small></div>' +
        '<div class="ix-hero-t"><div class="ix-hero-h">Protect Your Site Step by Step</div><p>' + stDone + ' of ' + stp.length + ' steps are done. Next: <b>' + esc(stp.filter(function (x) { return !x.done; })[0].title) + '</b>.</p>' +
        '<div class="ix-row" style="margin-top:12px"><button type="button" class="ix-btn pri" data-go="setup">' + (stDone > 1 ? 'Continue Setup' : 'Start Guided Setup') + '</button></div></div></div>' : '';
      p.innerHTML = chips + banner + (al ? '<div class="ix-als">' + (j.alerts.length > 1 ? '<b>' + j.alerts.length + ' things to look at</b>' : '<b>1 thing to look at</b>') + al + '</div>' : '<div class="ix-als ok"><span class="ix-ok">✓</span><b>Nothing needs your attention.</b></div>') +
        '<div class="ix-ocs">' + cards.join('') + '</div>';
      p.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { go(b.dataset.go); }; });
      whatsNew(p, j.version);
    }, function () { p.innerHTML = '<p class="ix-err">Can\'t reach the server.</p>'; });
  }
  /* After an update: once, on the Overview, what the new version changed (from the changelog), until you press Got It. */
  function whatsNew(p, ver) {
    if (lsGet('ix-seen-ver') === ver) return;
    // only the newest version's notes (the whole changelog is over 100 KB; Changelog loads it when you open it)
    (CL && CL.entries ? Promise.resolve(CL) : api('changelog&latest=1').then(function (j) { if (!j || !j.ok) throw new Error('no changelog'); return clParse(j.md); })).then(function (cl) {
      var e = cl.entries[0];
      if (!e || e.ver !== ver) { lsSet('ix-seen-ver', ver); return; }
      var box = document.createElement('section'); box.className = 'ix-ec ix-new';
      box.innerHTML = '<div class="ix-ec-h"><span class="ix-ec-i">' + svg(ICON.sparkle) + '</span><div><div class="ix-ec-t">What\'s New in Version ' + esc(ver) + '</div><div class="ix-ec-d">Your site was updated. Here is what changed.</div></div></div>' +
        '<div class="ix-ec-b"><div class="ix-md ix-newbody">' + mdBlocks(e.body) + '</div><div class="ix-row" style="margin-top:14px"><button type="button" class="ix-btn pri" id="ix-nwok">Got It</button><button type="button" class="ix-btn" id="ix-nwall">Open the Changelog</button></div></div>';
      p.insertBefore(box, p.firstChild);
      box.querySelector('#ix-nwok').onclick = function () { lsSet('ix-seen-ver', ver); box.remove(); };
      box.querySelector('#ix-nwall').onclick = function () { lsSet('ix-seen-ver', ver); go('changelog'); };
    }, function () {});
  }

