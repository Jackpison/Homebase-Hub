  /* ---------- Updates ---------- */
  function rnd16() { var a = new Uint8Array(8); crypto.getRandomValues(a); return [].map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function pUpdate(p) {
    p.innerHTML = '<p class="ix-ld">Looking at what this server allows…</p>';
    api('update_status').then(function (st) {
      if (!st.ok) { p.innerHTML = '<p class="ix-err">' + esc(st.error || 'Could not load.') + '</p>'; return; }
      drawUpdate(p, st, null);
    }, function () { p.innerHTML = '<p class="ix-err">Can\'t reach the server.</p>'; });
  }

  function ghCard(st) {
    var g = st.gh || {}, l = g.latest, h = '';
    if (!g.curl) h += '<div class="ix-status"><span>!</span><span>This server\'s PHP has no curl, so it cannot reach GitHub. You can still update by uploading a zip below.</span></div>';
    if (g.newer && l) {
      h += '<div class="ix-status"><span class="ix-ok">✓</span><span><b>Version ' + esc(l.version) + ' Is Available.</b> ' + (l.published ? '<small>Published ' + esc(l.published.slice(0, 10)) + '.</small> ' : '') + esc(l.notes || '') + '</span></div>' +
        (g.phpOk ? '<div class="ix-row"><button type="button" class="ix-btn pri" id="ix-ghi">Download and Check Version ' + esc(l.version) + '</button></div>' +
          '<p class="ix-note">Nothing on your site changes yet. The download is checked against the SHA-256 GitHub lists, then goes through the same checks as an uploaded zip. You review the changes and type your website password to apply it.</p>'
          : '<div class="ix-status"><span>!</span><span>Version ' + esc(l.version) + ' needs PHP ' + esc(l.minPhp) + ' or newer; this server has ' + esc(st.php) + '.</span></div>');
    } else if (l) h += '<p>You have the newest version (<b>' + esc(st.version) + '</b>).</p>';
    else if (!g.err) h += '<p>Press Check Now to look for a newer version.</p>';
    if (g.err) h += '<p class="ix-err">Couldn\'t check: ' + esc(g.err) + '</p>';
    h += '<p class="ix-err" id="ix-ghe"></p><div class="ix-row"><button type="button" class="ix-btn" id="ix-ghc"' + (g.curl ? '' : ' disabled') + '>Check Now</button><span class="ix-mu">' + (g.at ? 'Last checked ' + esc(ago(g.at)) : 'Not checked yet') + '</span></div>' +
      '<label class="ix-tg"><span>Check GitHub Once a Day<small>The site asks GitHub whether a new version is out.</small></span><input type="checkbox" id="ix-gha"' + (g.auto ? ' checked' : '') + '></label>' +
      '<p class="ix-note">Off: GitHub is asked only when you press Check Now. Nothing ever installs by itself.</p>';
    return '<section class="ix-card"><div class="ix-cardh"><h3>Update From GitHub</h3><span class="ix-mu">Installed: <b>' + esc(st.version) + '</b>' + (/^[\w.-]+\/[\w.-]+$/.test(g.repo || '') ? ' · <a href="https://github.com/' + esc(g.repo) + '" target="_blank" rel="noopener">Project on GitHub</a>' : '') + '</span></div>' + h + '</section>';
  }
  function ghWire(p, st) {
    var e = function (m) { var x = p.querySelector('#ix-ghe'); if (x) x.textContent = m || ''; };
    var c = p.querySelector('#ix-ghc'), a = p.querySelector('#ix-gha'), i = p.querySelector('#ix-ghi');
    if (c) c.onclick = function () { c.disabled = true; c.textContent = 'Checking…'; api('gh_check', {}).then(function (j) { if (j && j.repo) st.gh = j; drawUpdate(p, st, null); }, function () { c.disabled = false; c.textContent = 'Check Now'; e('Can\'t reach the server.'); }); };
    if (a) a.onchange = function () { api('gh_auto', { on: a.checked }).then(function (j) { if (j && j.repo) st.gh = j; }); };
    if (i) i.onclick = function () {
      i.disabled = true; i.textContent = 'Downloading and Checking…'; e('');
      api('gh_install', {}).then(function (j) {
        if (!j.ok) { i.disabled = false; i.textContent = 'Download and Check Version ' + st.gh.latest.version; e(j.error || 'The download did not work.'); return; }
        drawUpdate(p, st, j);
      }, function () { i.disabled = false; i.textContent = 'Download and Check Version ' + st.gh.latest.version; e('Lost the connection while downloading. Nothing was changed.'); });
    };
    if (st.gh && st.gh.auto && st.gh.due && st.gh.curl && !st.ghTried) { st.ghTried = true; api('gh_check', { auto: true }).then(function (j) { if (j && j.repo) { st.gh = j; drawUpdate(p, st, null); } }); }
  }
  function drawUpdate(p, st, chk) {
    var staged = (chk && chk.staged) || st.staged, plan = (chk && chk.plan) || st.plan, last = st.last, prev = st.previous;
    var problems = [];
    if (!st.canInflate) problems.push('This server cannot unpack zip files (PHP\'s zlib is missing). Ask your host to turn it on.');
    if (st.unwritable && st.unwritable.length) problems.push('The site is not allowed to change files in <code>' + st.unwritable.map(esc).join('</code>, <code>') + '</code>. Ask your host to allow it, or update with the File Manager.');
    if (!st.hasManifest) problems.push('This copy of the site has no file list yet, so it cannot tell which files are its own. Update once with the File Manager; after that the site can update itself.');
    var steps = ['Upload the Zip', 'Check it', 'Review the Changes', 'Apply'], at = staged ? 3 : 1;
    var stepsHtml = stepBar(steps, at - 1, { locked: true, done: steps.map(function (t, i) { return i + 1 < at; }) });   // (1.66.0) the shared step bar
    var changes = function (k, label) { var l = (plan && plan[k]) || []; return '<div class="ix-chg ' + k + '"><b>' + l.length + '</b><small>' + label + '</small></div>'; };
    var review = '';
    if (staged) {
      var rows = []; [['updated', 'Updated'], ['new', 'New'], ['removed', 'Removed']].forEach(function (k) { ((plan && plan[k[0]]) || []).slice(0, 60).forEach(function (f) { rows.push('<div class="ix-chr ' + k[0] + '"><span>' + k[1] + '</span><code>' + esc(f) + '</code></div>'); }); });
      review = '<div class="ix-zipcard"><div><b>' + esc(staged.name) + '</b> <span class="ix-mu">· ' + size(staged.size) + ' · version ' + esc(staged.version) + '</span>' +
          '<div class="ix-fp">Fingerprint (SHA-256): <code>' + esc(staged.sha256) + '</code></div></div><button type="button" class="ix-btn" id="ix-uchg">Choose Another</button></div>' +
        (chk && chk.checks ? '<h4>Checked before anything changes</h4><div class="ix-checks">' + chk.checks.map(function (k) { return '<div><span class="' + (k.ok ? 'ix-ok' : 'ix-bad') + '">' + (k.ok ? '✓' : '✗') + '</span><span><b>' + esc(k.title) + '</b> <small>' + esc(k.note) + '</small></span></div>'; }).join('') + '</div>'
          : '<p class="ix-note">This update passed every check when you uploaded it.</p>') +
        (chk && chk.relation === 'same' ? '<p class="ix-note"><b>This is the same version you have.</b> Applying it repairs your files.</p>' : '') +
        ((chk && chk.notes) || st.notes ? '<h4>What Is in This Update</h4><div class="ix-md ix-newbody">' + mdBlocks((chk && chk.notes) || st.notes) + '</div>' : '') +
        '<h4>What Will Change</h4><div class="ix-chgs">' + changes('updated', 'files updated') + changes('new', 'new files') + changes('removed', 'old files removed') + '<div class="ix-chg zero"><b>0</b><small>of your data touched</small></div></div>' +
        (rows.length ? '<details class="ix-more"><summary>Show the Files</summary><div class="ix-chl">' + rows.join('') + '</div></details>' : '') +
        '<p class="ix-note">Never touched: <b>site-data</b> (all your data), <b>web/hub/media</b> (your pictures and logo), <b>web/hub/core/config.php</b> and the Tools settings made from your settings.' + (chk && chk.noOldList ? ' This copy had no file list, so no old files can be removed this time.' : '') + '</p>' +
        '<div class="ix-apl"><label for="ix-upw">Website Password</label><div class="ix-row"><input type="password" id="ix-upw" autocomplete="current-password" placeholder="Needed to change the site\'s code" style="max-width:340px"><button type="button" class="ix-btn pri" id="ix-uap">Apply Update</button><button type="button" class="ix-btn" id="ix-ucn">Cancel</button></div></div>' +
        '<label class="ix-tg"><span>Go Back by Itself<small>Returns to the old version if the site stops answering.</small></span><input type="checkbox" id="ix-uauto"' + (st.autoUndo ? ' checked' : '') + '></label>' +
        '<p class="ix-err" id="ix-ue"></p>';
    } else {
      review = '<label class="ix-dropz" id="ix-udz"><input type="file" id="ix-ufile" accept=".zip,application/zip"><b>Drop the Update Zip Here</b><span>or click to choose it</span></label>' +
        '<p class="ix-note">Only use a zip from a source you trust: it replaces the site\'s own code. After the check you see its fingerprint (SHA-256), which you can compare with the one you were given.</p><div class="ix-upm" id="ix-upm"></div>';
    }
    p.innerHTML =
      (staged ? '' : ghCard(st)) +
      '<section class="ix-card"><div class="ix-cardh"><h3>Update the Site</h3><span class="ix-mu">Installed: <b>' + esc(st.version) + '</b>' + (last ? ' · ' + (last.how === 'back' ? 'went back to ' : 'updated to ') + esc(last.version) + ' ' + esc(ago(last.at)) : '') + '</span></div>' +
        problems.map(function (m) { return '<div class="ix-status"><span>!</span><span>' + m + '</span></div>'; }).join('') + stepsHtml + review + '</section>' +
      '<section class="ix-card"><div class="ix-cardh"><h3>Go Back</h3></div>' + (prev
        ? '<p>Version <b>' + esc(prev.version) + '</b> was saved ' + esc(ago(prev.at)) + ' (' + size(prev.bytes) + '). Going back does not change your data.</p><div class="ix-apl"><label for="ix-bpw">Website Password</label><div class="ix-row"><input type="password" id="ix-bpw" autocomplete="current-password" style="max-width:340px"><button type="button" data-hold class="ix-btn" id="ix-ubk">Go Back to ' + esc(prev.version) + '</button></div></div><p class="ix-err" id="ix-be"></p>'
        : '<p>Nothing is saved yet. The first update saves the version you have now, so you can come back to it in one click.</p>') + '</section>';
    if (!staged) ghWire(p, st);
    var dz = p.querySelector('#ix-udz');
    if (dz) {
      var up = function (file) {
        var box = p.querySelector('#ix-upm'), piece = st.chunk || 1048576, n = Math.max(1, Math.ceil(file.size / piece)), id = rnd16(), i = 0;
        box.className = 'ix-upm';
        if (!/\.zip$/i.test(file.name)) { box.className = 'ix-err ix-upm'; box.textContent = 'Choose the site update zip (a file ending in .zip).'; return; }
        (function next() {
          if (i >= n) { box.textContent = 'Checking the update…'; return api('update_check', { name: file.name }).then(function (j) { if (!j.ok) { box.className = 'ix-err ix-upm'; box.textContent = j.error || 'The check failed.'; return; } drawUpdate(p, st, j); }); }
          box.textContent = 'Uploading… ' + Math.round(100 * i / n) + '%';
          return fetch(CORE + 'api.php?action=update_chunk&id=' + id + '&i=' + i + '&n=' + n, { method: 'POST', credentials: 'same-origin', headers: { 'X-Hub-CSRF': S.csrf, 'Content-Type': 'application/octet-stream' }, body: file.slice(i * piece, (i + 1) * piece) })
            .then(function (r) { return r.json(); }).then(function (j) { if (!j.ok) throw new Error(j.error || 'The upload failed.'); i++; return next(); });
        })().catch(function (e) { box.className = 'ix-err ix-upm'; box.textContent = e.message || 'The upload failed.'; });
      };
      p.querySelector('#ix-ufile').onchange = function (e) { if (e.target.files[0]) up(e.target.files[0]); };
      ['dragenter', 'dragover'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('over'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('over'); }); });
      dz.addEventListener('drop', function (e) { if (e.dataTransfer.files[0]) up(e.dataTransfer.files[0]); });
    }
    var cancel = function () { api('update_cancel', {}).then(function () { pUpdate(p); }); };
    var ch = p.querySelector('#ix-uchg'); if (ch) ch.onclick = cancel;
    var cn = p.querySelector('#ix-ucn'); if (cn) cn.onclick = cancel;
    var au = p.querySelector('#ix-uauto'); if (au) au.onchange = function () { api('update_autoundo', { on: au.checked }); };
    var run = function (btn, back, pwEl, errEl, label) {
      var pw = pwEl.value; if (!pw) { errEl.className = 'ix-err'; errEl.textContent = 'Type your website password first.'; return; }
      btn.disabled = true; errEl.className = 'ix-note'; errEl.textContent = label + ' This takes a few seconds. Keep this page open.';
      api('update_apply', { password: pw, back: back }).then(function (j) {
        if (j.ok) { errEl.className = 'ix-note ix-ok'; errEl.textContent = '✓ Now on version ' + j.version + (j.selfCheck === 'ok' ? '. The site looked at itself afterwards and answered.' : '.') + (j.removed && j.removed.length ? ' ' + j.removed.length + ' old file' + (j.removed.length > 1 ? 's were' : ' was') + ' removed.' : '') + ' Reloading…'; try { sessionStorage.removeItem('ix-ov'); } catch (e) {} setTimeout(function () { location.reload(); }, 2500); return; }
        btn.disabled = false; errEl.className = 'ix-err'; errEl.textContent = j.error || 'The update did not go through.';
      }, function () { btn.disabled = false; errEl.className = 'ix-err'; errEl.textContent = 'Lost the connection while updating. Wait a minute, reload, and look at the version shown in Overview.'; });
    };
    var ap = p.querySelector('#ix-uap'); if (ap) ap.onclick = function () { run(ap, false, p.querySelector('#ix-upw'), p.querySelector('#ix-ue'), 'Applying the update…'); };
    var bk = p.querySelector('#ix-ubk'); if (bk) bk.onclick = function () { run(bk, true, p.querySelector('#ix-bpw'), p.querySelector('#ix-be'), 'Going back…'); };
  }
  function pFiles(p) {
    p.innerHTML = '<p class="ix-ld">Comparing your server with this version\'s file list…</p>';
    api('files_scan').then(function (j) {
      if (!j.ok) { p.innerHTML = '<p class="ix-err">' + esc(j.error || 'Could not check.') + '</p>'; return; }
      if (j.noList) { p.innerHTML = '<div class="ix-status"><span>!</span><span><b>This copy of the site has no file list yet.</b> Update once with the File Manager (or with the Update tab on a site that has one); after that this tab can show you which files do not belong.</span></div>'; return; }
      var ex = j.extra || [], stat = function (n, label, cls) { return '<div class="ix-chg ' + cls + '"><b>' + n + '</b><small>' + label + '</small></div>'; };
      var list = ex.map(function (e, i) {
        return '<label class="ix-fr"><input type="checkbox" data-i="' + i + '" checked><span class="ix-frp"><code>' + esc(e.path) + '</code><small>' + esc(e.why) + '</small></span><span class="ix-pill ' + (e.tone || '') + '">' + esc(e.tag) + '</span><span class="ix-mu ix-frs">' + size(e.size) + '</span></label>'; }).join('');
      p.innerHTML =
        '<div class="ix-chgs">' + stat(j.matched, 'files match version ' + esc(j.version), 'new') + stat(j.changed.length, 'changed by hand', j.changed.length ? 'updated' : 'zero') + stat(j.missing.length, 'missing', j.missing.length ? 'removed' : 'zero') + stat(ex.length, 'not part of this version', ex.length ? 'updated' : 'zero') + '</div>' +
        (ex.length ? '<section class="ix-card"><div class="ix-cardh"><h3>Files That Do Not Belong</h3><span class="ix-mu"><a href="#" id="ix-fall">Select All</a> · <a href="#" id="ix-fnone">None</a></span></div>' +
          '<p>These are not part of any version of the site. You see the list first and nothing goes until you confirm with your password.</p><div class="ix-frl">' + list + '</div>' +
          '<div class="ix-apl"><label for="ix-fpw">Website Password</label><div class="ix-row"><input type="password" id="ix-fpw" autocomplete="current-password" style="max-width:340px"><button type="button" data-hold class="ix-btn danger" id="ix-fdel">Delete Selected</button></div></div><p class="ix-err" id="ix-fe"></p></section>'
          : '<div class="ix-status"><span class="ix-ok">✓</span><span><b>Nothing on your server is out of place.</b> Every file there belongs to version ' + esc(j.version) + '.</span></div>') +
        (j.changed.length ? '<section class="ix-card"><div class="ix-cardh"><h3>Changed by Hand</h3></div><p>These files differ from what version ' + esc(j.version) + ' ships. If you did not change them yourself, apply the same version again from the Update tab to put them back.</p><div class="ix-frl">' + j.changed.map(function (c) { return '<div class="ix-fr"><span class="ix-frp"><code>' + esc(c.path) + '</code></span><span class="ix-mu ix-frs">' + size(c.size) + '</span></div>'; }).join('') + '</div></section>' : '') +
        (j.missing.length ? '<section class="ix-card"><div class="ix-cardh"><h3>Missing</h3></div><p>These belong to this version but are not on your server. Apply the same version again from the Update tab to bring them back.</p><div class="ix-frl">' + j.missing.map(function (m) { return '<div class="ix-fr"><span class="ix-frp"><code>' + esc(m) + '</code></span></div>'; }).join('') + '</div></section>' : '') +
        (j.other && j.other.length ? '<p class="ix-note">Other items in your site folder (not part of this site, never listed for deletion or touched): ' + j.other.map(function (o) { return '<code>' + esc(o) + '</code>'; }).join(' ') + '</p>' : '') +
        '<p class="ix-note">Never listed or touched: <b>site-data</b>, <b>web/hub/media</b> (your pictures and logo), <b>web/hub/core/config.php</b>. Checked just now in ' + j.ms + ' ms. <a href="#" id="ix-fagain">Check Again</a></p>';
      var again = p.querySelector('#ix-fagain'); if (again) again.onclick = function (e) { e.preventDefault(); pFiles(p); };
      var all = p.querySelector('#ix-fall'); if (all) { all.onclick = function (e) { e.preventDefault(); p.querySelectorAll('.ix-fr input').forEach(function (c) { c.checked = true; }); }; p.querySelector('#ix-fnone').onclick = function (e) { e.preventDefault(); p.querySelectorAll('.ix-fr input').forEach(function (c) { c.checked = false; }); }; }
      var del = p.querySelector('#ix-fdel');
      if (del) del.onclick = function () {
        var er = p.querySelector('#ix-fe'), pick = [].map.call(p.querySelectorAll('.ix-fr input:checked'), function (c) { return ex[+c.dataset.i].path; });
        if (!pick.length) { er.className = 'ix-err'; er.textContent = 'Tick at least one file.'; return; }
        var pw = p.querySelector('#ix-fpw').value; if (!pw) { er.className = 'ix-err'; er.textContent = 'Type your website password.'; return; }
        del.disabled = true; er.className = 'ix-note'; er.textContent = 'Deleting…';
        api('files_delete', { paths: pick, password: pw }).then(function (r) {
          if (!r.ok) { del.disabled = false; del.dataset.armed = ''; del.textContent = 'Delete Selected'; er.className = 'ix-err'; er.textContent = r.error || 'Nothing was deleted.'; return; }
          toast(r.deleted.length + ' file' + (r.deleted.length === 1 ? '' : 's') + ' deleted.' + (r.skipped.length ? ' ' + r.skipped.length + ' could not be.' : '')); pFiles(p);
        }, function () { del.disabled = false; er.className = 'ix-err'; er.textContent = 'Lost the connection. Nothing was deleted.'; });
      };
    }, function () { p.innerHTML = '<p class="ix-err">Can\'t reach the server.</p>'; });
  }

