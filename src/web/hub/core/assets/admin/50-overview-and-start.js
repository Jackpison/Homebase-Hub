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
    pill('look', S.theme === 'auto' ? 'Auto' : S.theme === 'light' ? 'Light' : 'Dark', '');
    pill('health', OV.https ? 'OK' : 'No HTTPS', OV.https ? 'good' : 'warn');
    var sv = PAGE.querySelector('[data-sver]'); if (sv) sv.textContent = ' · v' + OV.version;    paintHead();
  }
  /* (1.74.3) the status on the right of the section header: the same words and colour as the pill in the left panel; Security adds a bar
     and, when the next step is HTTPS (which is set up with the host, in Health), a button to it */
  function paintHead() {
    var h = PAGE && PAGE.querySelector('#ix-phs'), box = h && h.closest('.ix-ph'); if (!h || !OV) return;
    var sec = box.dataset.sec, pill = PAGE.querySelector('[data-pill="' + sec + '"]'), txt = pill ? pill.textContent : '', cls = pill && /good|warn/.test(pill.className) ? (/good/.test(pill.className) ? 'good' : 'warn') : '';
    if (sec === 'look' || !txt) { h.hidden = true; h.innerHTML = ''; return; }
    var pr = OV.protect, bar = sec === 'security' ? '<span class="ix-phb"><i style="width:' + Math.round(100 * (pr.on + 1) / (pr.total + 1)) + '%"></i></span>' : '';
    var nx = sec === 'security' && pr.next && pr.next.key === 'https' ? '<button type="button" class="ix-btn pri" data-phgo="health">Fix Next: HTTPS</button>' : '';
    h.innerHTML = '<span class="ix-phc ' + cls + '">' + esc(txt) + '</span>' + bar + nx; h.hidden = false;
    var b = h.querySelector('[data-phgo]'); if (b) b.onclick = function () { go(b.dataset.phgo); };
  }
  /* (1.66.0) One step bar for every step-by-step screen: thin bars with the step names under them. Done steps fill with the accent, the
     current one is bright, the ones to come are dim, a skipped one is dashed. o.keys: a data-open key per step (Guided Setup) or o.show (the
     step whose card shows); o.locked: the bar only shows where you are (Updates, Two-Step Login). Phones show
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


