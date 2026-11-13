  /* --- Backup --- */
  var NAMES = { links: 'Links', info: 'Info', cards: 'Cards', tasks: 'Tasks', files: 'Files', home: 'Home', settings: 'Settings', telegram: 'Telegram', watch: 'Domain Watch', tools: 'Tools Presets' };
  function size(n) { return n >= 1073741824 ? (n / 1073741824).toFixed(1) + ' GB' : n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }   // (1.61.6) GB from 1 GB up
  function openBackup() { go('backup'); }
  /* "3 days ago", "2 hours ago", "just now" */
  function ago(t) {
    var d = Date.now() / 1000 - t;
    if (d < 90) return 'just now';
    if (d < 5400) return Math.round(d / 60) + ' minutes ago';
    if (d < 129600) return Math.round(d / 3600) + ' hours ago';
    var n = Math.round(d / 86400); return n === 1 ? '1 day ago' : n + ' days ago';
  }
  /* Backup: a status card, then Export (open), Import and Earlier Versions (both folded until you open them). */
  /* Export Data: the page's data is read through the API; the CSV or JSON file is made here in the browser */
  function csvCell(v) { v = String(v == null ? '' : v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function scalars(o) {
    var r = {}; Object.keys(o || {}).forEach(function (k) {
      var v = o[k];
      if (v === null || v === undefined) r[k] = '';
      else if (Array.isArray(v)) { if (v.every(function (x) { return typeof x !== 'object'; })) r[k] = v.join('; '); }
      else if (typeof v !== 'object') r[k] = typeof v === 'string' && v.length > 2000 ? '' : v;   // pictures stored inside a record are not spreadsheet material
    }); return r;
  }
  function exportRows(app, data) {
    var rows = [], locked = 0;
    if (app === 'links') (data.tabs || []).forEach(function (t) {
      if (typeof t.enc === 'string') { locked++; return; }
      (t.categories || []).forEach(function (c) { (c.links || []).forEach(function (l) { if (!l.divider) rows.push(Object.assign({ tab: t.title || '', category: c.title || c.name || '' }, scalars(l))); }); });
    });
    else if (app === 'cards') (data.cards || []).forEach(function (c) { rows.push(scalars(c)); });
    else (data.tasks || []).forEach(function (t) { var r = scalars(t); if (t.repeat) { r.repeat_every = t.repeat.n; r.repeat_unit = t.repeat.unit; } rows.push(r); });
    return { rows: rows, locked: locked };
  }
  function download(name, mime, text, bom) {
    var a = document.createElement('a'), u = URL.createObjectURL(new Blob([bom ? '\ufeff' : '', text], { type: mime }));
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
  }
  /* ---------- (1.72.0) the Import Center (Backup & Restore › Import) ----------
     importer.js reads the file here in the browser; the list shows what was found (all ticked, past calendar events not); Add hands what
     is ticked to the page it goes to (sessionStorage "hub-import", read once by HUB.importTake), which adds it with its own save and
     offers Undo. Info gets one new tab of at most 12 boxes, Links one new tab with a category per folder or tag. */
  var impP = null;
  function importer() {
    if (window.HubImport) return Promise.resolve(window.HubImport);
    return impP || (impP = new Promise(function (ok, fail) {
      var me = document.querySelector('script[src*="shell.js"]'), ver = me ? ((/\?v=[^&#]+/.exec(me.src) || [''])[0]) : '';
      var sc = document.createElement('script'); sc.src = ASSETS + 'importer.js' + ver;
      sc.onload = function () { if (window.HubImport) ok(window.HubImport); else { impP = null; fail(); } }; sc.onerror = function () { impP = null; fail(); };
      document.head.appendChild(sc);
    }));
  }
  var IMP_PAGE = { tasks: ['Tasks', 'web/tasks/', 'tasks'], info: ['Info', 'web/info/', 'notes'], links: ['Links', 'web/links/', 'links'], cards: ['Cards', 'web/cards/', 'cards'] };
  var IMP_FIELD = { bank: 'Bank', name: 'Card Name', network: 'Network', variant: 'Variant', kind: 'Credit or Debit', type: 'Fee Type', limit: 'Limit', fee: 'Annual Fee', expiry: 'Expiry', owner: 'Holder', remark: 'Remark' };
  /* notes into the boxes of one tab: a box per note when there are 12 or fewer; else a box per folder or label (the notes in it under headings) */
  function packBoxes(notes) {
    if (notes.length <= 12) return notes.map(function (n) { return { title: n.title, notes: n.notes }; });
    var groups = [], by = {};
    notes.forEach(function (n) { var g = n.group || 'Notes'; if (!by[g]) { by[g] = []; groups.push(g); } by[g].push(n); });
    groups.sort(function (a, b) { return by[b].length - by[a].length; });
    if (groups.length > 12) { var rest = [].concat.apply([], groups.slice(11).map(function (g) { return by[g]; })); groups = groups.slice(0, 11).concat(['More']); by.More = rest; }
    if (groups.length === 1) {   // one big group: share it out over 12 boxes, in order
      var per = Math.ceil(notes.length / 12); groups = []; by = {};
      for (var i = 0; i < notes.length; i += per) { var nm = 'Notes ' + (i + 1) + '–' + Math.min(notes.length, i + per); groups.push(nm); by[nm] = notes.slice(i, i + per); }
    }
    return groups.map(function (g) { return { title: g.slice(0, 80), notes: by[g].map(function (n) { return '### ' + n.title + (n.notes ? '\n\n' + n.notes : ''); }).join('\n\n---\n\n') }; });
  }
  function bindImport(p) {
    var inp = p.querySelector('#ix-imfile'), drop = p.querySelector('#ix-imdrop'), res = p.querySelector('#ix-imres'); if (!inp) return;
    var cur = null, on = [];
    var take = function (files) {
      if (!files || !files.length) return;
      res.innerHTML = spinRow('Reading ' + esc(files.length === 1 ? files[0].name : files.length + ' files') + '…');
      importer().then(function (H) { return H.read(files); }).then(function (r) { cur = r; on = r.items ? r.items.map(function (x) { return !x.past; }) : []; draw(); },
        function () { res.innerHTML = '<p class="ix-err">The importer could not load. Reload the page and try again.</p>'; });
    };
    inp.onchange = function () { var fl = [].slice.call(inp.files || []); inp.value = ''; take(fl); };   // a copy: clearing the box empties its list
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); take([].slice.call((e.dataTransfer && e.dataTransfer.files) || [])); });
    var line = function (r, x) {
      if (r.to === 'tasks') return [x.name, [x.due + (x.time ? ' ' + x.time : ''), x.repeat && x.repeat.unit !== 'none' ? 'repeats' : '', x.past ? 'already past' : ''].filter(Boolean).join(' · ')];
      if (r.to === 'info') return [x.title, (x.group && x.group !== 'Notes' ? x.group + ' · ' : '') + (x.notes || '').replace(/\s+/g, ' ').slice(0, 90)];
      if (r.to === 'links') return [x.title, x.group + ' · ' + x.url];
      return [[x.bank, x.name].filter(Boolean).join(' '), [x.network, x.owner, x.expiry].filter(Boolean).join(' · ')];
    };
    function draw() {
      var r = cur; if (!r) return;
      if (r.error) { res.innerHTML = '<p class="ix-err">' + esc(r.error) + '</p>'; return; }
      if (!r.items.length) { res.innerHTML = '<p class="ix-err">Nothing to import was found in this file.</p>'; return; }
      var pg = IMP_PAGE[r.to], shown = r.items.slice(0, 500);
      var map = r.to === 'cards' ? '<div class="ix-immap">' + window.HubImport.FIELDS.map(function (f) {
        return '<label>' + IMP_FIELD[f] + '<select data-f="' + f + '"><option value="">(none)</option>' + r.head.map(function (h) { return '<option' + (r.map[f] === h ? ' selected' : '') + '>' + esc(h) + '</option>'; }).join('') + '</select></label>'; }).join('') + '</div>' : '';
      res.innerHTML = '<div class="ix-status"><span class="ix-ok">✓</span><span><b>' + esc(r.label) + '</b>: ' + r.items.length + ' ' + pg[2] + ' found. They go to <b>' + pg[0] + '</b>' +
          (r.to === 'info' ? ', as a new tab' : r.to === 'links' ? ', as a new tab with a category per folder or tag' : '') + '. What is already there is not added twice.</span></div>' + map +
        '<div class="ix-imtools"><button type="button" class="ix-linkbtn" data-imall="1">Tick All</button><button type="button" class="ix-linkbtn" data-imall="0">Untick All</button><span class="ix-mu" id="ix-imn"></span></div>' +
        '<div class="ix-imlist">' + shown.map(function (x, i) { var l = line(r, x); return '<label class="ix-imrow"><input type="checkbox" data-i="' + i + '"' + (on[i] ? ' checked' : '') + '><span><b>' + esc(l[0] || '(no name)') + '</b><small>' + esc(l[1] || '') + '</small></span></label>'; }).join('') +
          (r.items.length > 500 ? '<p class="ix-note">The first 500 are listed; the other ' + (r.items.length - 500) + ' are added too.</p>' : '') + '</div>' +
        '<p class="ix-err" id="ix-imerr"></p><div class="ix-row"><button type="button" class="ix-btn pri" id="ix-imgo">' + svg(ICON.upload) + 'Add to ' + pg[0] + '</button></div>';
      var count = function () { var n = on.filter(Boolean).length + Math.max(0, r.items.length - 500); res.querySelector('#ix-imn').textContent = n + ' of ' + r.items.length + ' ticked'; };
      count();
      res.querySelectorAll('[data-i]').forEach(function (c) { c.onchange = function () { on[+c.dataset.i] = c.checked; count(); }; });
      res.querySelectorAll('[data-imall]').forEach(function (b) { b.onclick = function () { var v = b.dataset.imall === '1'; on = on.map(function () { return v; }); res.querySelectorAll('[data-i]').forEach(function (c) { c.checked = v; }); count(); }; });
      res.querySelectorAll('[data-f]').forEach(function (sel) { sel.onchange = function () {   // Cards: another column for this field, and the list is read again
        r.map[sel.dataset.f] = sel.value; r.items = window.HubImport.cards(r.csv, r.map); on = r.items.map(function () { return true; }); draw(); }; });
      res.querySelector('#ix-imgo').onclick = function () {
        var pick = r.items.filter(function (x, i) { return i >= 500 || on[i]; });
        if (!pick.length) { res.querySelector('#ix-imerr').textContent = 'Tick at least one.'; return; }
        var out = { to: r.to, src: r.label };
        if (r.to === 'info') { out.tab = ('From ' + r.label).slice(0, 40); out.boxes = packBoxes(pick); }
        else if (r.to === 'links') {
          var cats = [], by = {}; pick.forEach(function (l) { var g = l.group || 'Links'; if (!by[g]) { by[g] = { title: g, links: [] }; cats.push(by[g]); } by[g].links.push({ title: l.title, url: l.url }); });
          out.tab = ('From ' + r.label).slice(0, 40); out.cats = cats;
        } else out.items = pick;
        var raw = JSON.stringify(out);
        if (raw.length > 1800000) { res.querySelector('#ix-imerr').textContent = 'That is too much for one go (' + Math.round(raw.length / 1e6 * 10) / 10 + ' MB of text). Untick some and add the rest after.'; return; }
        try { sessionStorage.setItem('hub-import', raw); } catch (e) { res.querySelector('#ix-imerr').textContent = 'This browser could not hold that much. Untick some and add the rest after.'; return; }
        location.href = ROOT + pg[1] + '#hub-import';
      };
    }
  }
  function bindExport(p) {
    if (p.__xb) return; p.__xb = true;
    p.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-export]'); if (!b) return;
      var app = b.dataset.export, fmt = b.dataset.fmt, st = document.getElementById('ix-xs'); b.disabled = true; if (st) st.textContent = 'Reading your ' + app + '…';
      api('export&app=' + app).then(function (j) {
        if (!(app === 'cards' && j && j.ok && j.data && typeof j.data.enc === 'string')) return j;
        if (st) st.textContent = 'Opening your locked cards…';   // locked in the browser (1.61.0): opened here with your passphrase, never on the server
        return window.HubSite.openJson(j.data.enc).then(function (d) { j.data = d; return j; }, function (e) { return { ok: false, error: e && e.code === 'cancel' ? 'Not exported: Cards are locked and need your passphrase.' : 'Your cards could not be unlocked, so nothing was exported.' }; });
      }).then(function (j) {
        b.disabled = false;
        if (!j || !j.ok) { if (st) st.textContent = (j && j.error) || 'Could not read the data.'; return; }
        var day = new Date().toISOString().slice(0, 10), r = exportRows(app, j.data);
        if (fmt === 'html') {   // (1.61.0) the bookmark file other browsers import, made here
          var pv = document.getElementById('ix-bmpriv'), all = j.data.tabs || [], lk = all.filter(function (t) { return typeof t.enc === 'string'; }).length;
          var pick = all.filter(function (t) { return typeof t.enc !== 'string' && (pv && pv.checked || !t.private); });
          var cnt = pick.reduce(function (a, t) { return a + (t.categories || []).reduce(function (b, c) { return b + (c.links || []).filter(function (l) { return !l.divider; }).length; }, 0); }, 0);
          if (!cnt) { if (st) st.textContent = 'There is nothing to export yet' + (lk ? ' (encrypted tabs stay locked).' : '.'); return; }
          download('bookmarks-' + day + '.html', 'text/html', window.HUB.bookmarksHtml(pick, (j.data.settings && j.data.settings.title) || 'Bookmarks'));
          if (st) st.textContent = 'Saved bookmarks-' + day + '.html with ' + cnt + (cnt === 1 ? ' bookmark.' : ' bookmarks.') + (lk ? ' ' + lk + (lk === 1 ? ' encrypted tab was' : ' encrypted tabs were') + ' left out.' : ''); return;
        }
        if (fmt === 'json') { download(app + '-' + day + '.json', 'application/json', JSON.stringify(j.data, null, 2)); if (st) st.textContent = 'Saved ' + app + '-' + day + '.json.'; return; }
        var cols = []; r.rows.forEach(function (x) { Object.keys(x).forEach(function (k) { if (cols.indexOf(k) < 0) cols.push(k); }); });
        if (!r.rows.length) { if (st) st.textContent = 'There is nothing to export yet' + (r.locked ? ' (only encrypted tabs, which stay locked).' : '.'); return; }
        download(app + '-' + day + '.csv', 'text/csv', [cols.map(csvCell).join(',')].concat(r.rows.map(function (x) { return cols.map(function (k) { return csvCell(x[k]); }).join(','); })).join('\r\n'), true);
        if (st) st.textContent = 'Saved ' + app + '-' + day + '.csv with ' + r.rows.length + (r.rows.length === 1 ? ' row.' : ' rows.') + (r.locked ? ' ' + r.locked + (r.locked === 1 ? ' encrypted tab was' : ' encrypted tabs were') + ' left out.' : '');
      }, function () { b.disabled = false; if (st) st.textContent = 'Can\'t reach the server.'; });
    });
  }
  /* ---------- Cloud Backup (1.77.0): an encrypted copy sent to a WebDAV folder (Nextcloud, ownCloud, a NAS, a Storage Box) ---------- */
  function cloudCard(c, enc) {
    if (!c || !c.ok) return '';
    var every = [[1, 'Daily'], [3, 'Every 3 Days'], [7, 'Weekly']], keeps = [7, 14, 30, 60, 90];
    var status = c.error ? '<p class="ix-note"><span class="ix-err">Last problem: ' + esc(c.error) + '</span></p>'
      : c.last ? '<p class="ix-note">Last copy: ' + esc(when(c.last)) + ' · ' + esc(c.lastName) + ' (' + Math.max(1, Math.round(c.lastSize / 1024)) + ' KB).' + (c.note ? ' ' + esc(c.note) : '') + '</p>' : '<p class="ix-note">No copy sent yet.</p>';
    return '<div id="ix-cloud">' + ecCard(c.on ? 'good' : '', ICON.box, 'Cloud Backup', 'An encrypted copy of the whole site, sent to a WebDAV folder (Nextcloud, ownCloud, Synology, a Storage Box or another server). ' +
      'It is always locked with your ' + (enc.mode === 'login' ? 'website password' : 'encryption passphrase') + ', and the password for the cloud stays on your server.' +
      (c.encReady ? '' : ' <b>Set an encryption passphrase first</b> (Settings › Security): without one, nothing is sent.'),
      '<div class="ix-fdgrid">' + ecField('ix-clurl', 'WebDAV Address', 'url', 'off', 'Like https://cloud.example.com/remote.php/dav/files/you/. On your own network, http:// works too.', '', ' value="' + esc(c.url) + '" spellcheck="false" placeholder="https://"') +
        ecField('ix-cluser', 'User Name', 'text', 'off', '', '', ' value="' + esc(c.user) + '" spellcheck="false"') +
        ecField('ix-clpass', 'Password', 'password', 'new-password', c.hasPass ? 'A password is saved. Type a new one only to change it.' : 'For Nextcloud, make an app password in its security settings.', '', ' placeholder="' + (c.hasPass ? 'Saved' : '') + '"') +
        ecField('ix-cldir', 'Folder', 'text', 'off', 'Made for you inside that address.', '', ' value="' + esc(c.dir) + '" spellcheck="false"') + '</div>' +
      '<div class="ix-row"><label class="ix-lab" for="ix-clevery">Copy</label><select id="ix-clevery" aria-label="How often">' + every.map(function (e) { return '<option value="' + e[0] + '"' + (c.every === e[0] ? ' selected' : '') + '>' + e[1] + '</option>'; }).join('') + '</select>' +
        '<label class="ix-lab" for="ix-clkeep">Keep</label><select id="ix-clkeep" aria-label="How many copies to keep">' + keeps.map(function (k) { return '<option value="' + k + '"' + (c.keep === k ? ' selected' : '') + '>' + k + ' copies</option>'; }).join('') + '</select></div>' +
      '<label class="ix-tg"><span>Send Copies on a Schedule<small>One try a day. Older copies this feature made are removed after a new one arrives; nothing else in the folder is touched.</small></span><input type="checkbox" id="ix-clon"' + (c.on ? ' checked' : '') + '></label>' +
      status +
      '<div class="ix-row"><button type="button" class="ix-btn pri" id="ix-clsave">Save</button><button type="button" class="ix-btn" id="ix-cltest">Test Connection</button><button type="button" class="ix-btn" id="ix-clnow">' + svg(ICON.box) + 'Back Up Now</button></div>' +
      '<p class="ix-note" id="ix-clmsg" aria-live="polite"></p>') + '</div>';
  }
  function wireCloud(p, c) {
    var box = p.querySelector('#ix-cloud'); if (!box) return;
    var q = function (id) { return box.querySelector(id); }, msg = function (t, bad) { var m = q('#ix-clmsg'); m.textContent = t; m.className = 'ix-note' + (bad ? ' ix-err' : ''); };
    var body = function () { return { url: q('#ix-clurl').value.trim(), user: q('#ix-cluser').value.trim(), pass: q('#ix-clpass').value, dir: q('#ix-cldir').value.trim(), every: +q('#ix-clevery').value, keep: +q('#ix-clkeep').value, on: q('#ix-clon').checked }; };
    var busy = function (b, t, on) { b.disabled = on; if (on) { b.dataset.t = b.textContent; b.textContent = t; } else if (b.dataset.t) b.textContent = b.dataset.t; };
    q('#ix-clsave').onclick = function () {
      var b = this; busy(b, 'Saving…', true);
      api('cloud_save', body()).then(function (r) { busy(b, '', false); if (r.ok) { toast('Cloud Backup saved.'); pBackup(p); } else msg(r.error || 'Could not save.', true); });
    };
    q('#ix-cltest').onclick = function () {
      var b = this; busy(b, 'Testing…', true); msg('Connecting…');
      api('cloud_test', body(), 'POST', { timeout: 60000 }).then(function (r) { busy(b, '', false); msg(r.ok ? r.message : (r.error || r.message || 'It did not work.'), !r.ok); });
    };
    q('#ix-clnow').onclick = function () {
      var b = this; busy(b, 'Backing up…', true); msg('Making the copy and sending it. A big site can take a minute.');
      api('cloud_save', body()).then(function (s) {
        if (!s.ok) { busy(b, '', false); msg(s.error || 'Could not save.', true); return; }
        return api('cloud_run', {}, 'POST', { timeout: 600000 }).then(function (r) { busy(b, '', false); if (r.ok) { toast(r.message); pBackup(p); } else msg(r.error || r.message || 'It did not work.', true); });
      });
    };
  }
  function pBackup(p) {
    bindExport(p);
    p.innerHTML = '<p>Loading…</p>';
    Promise.all([api('backup_overview'), api('notify').catch(function () { return {}; }), api('bkkey').catch(function () { return {}; }), api('cloud_get').catch(function () { return {}; })]).then(function (r) {
      var j = r[0], n = r[1] || {}, enc = r[2] || {}, cl = r[3] || {};
      if (!j.ok) { p.innerHTML = '<p class="ix-err">' + esc(j.error) + '</p>'; return; }
      var parts = j.parts, last = +S.backupLast || 0, every = +S.backupEvery || 0;
      var due = every > 0 && (!last || (Date.now() / 1000 - last) / 86400 >= every);
      var tgOn = !!(n.ok && n.hasToken && n.chat);
      var newest = j.versions.length ? j.versions.reduce(function (a, v) { return v.time > a ? v.time : a; }, 0) : 0;
      p.innerHTML =
        // (1.77.3) one hero box: what a backup is, when the last one was, and the Download button. Reminder and automatic copies follow as rows.
        '<div class="ix-bkhero' + (due ? ' due' : '') + '"><span class="ix-bkhero-i">' + svg(ICON.box) + '</span><div class="ix-bkhero-t"><b>Back Up Your Site</b>' +
          '<span>' + (last ? 'Last full backup ' + esc(ago(last)) + ' (' + esc(when(last)) + ')' : 'No full backup yet') + (due ? ' · <em>A backup is due</em>' : '') + '</span>' +
          '<small>One file that brings back your pages and settings, on this server or any other.</small><small id="ix-bksum" class="ix-mu"></small></div>' +
          '<button type="button" class="ix-btn pri ix-big" id="ix-exp">' + svg(ICON.box) + 'Download Backup</button></div>' +
        '<div class="ix-status">' + (enc.set ? '<span class="ix-ok">🔒</span><span><b>Backup Files Are Locked</b> and open only with your ' + (enc.mode === 'login' ? 'website password' : 'encryption passphrase') + '. '
          : '<span>!</span><span><b>Backup files are not locked.</b> Set an encryption passphrase and every backup is locked. ') + '<a href="#" id="ix-encgo2">' + (enc.set ? 'Change' : 'Set one') + ' in Settings › Security</a></span></div>' +
        '<div class="ix-rcl">' + rowCard({ ic: ICON.clock, title: 'Remind Me to Back Up', desc: due ? 'A backup is due.' : every ? 'Not due yet.' : 'No reminders. Pick how often you want one.',
          act: '<select id="ix-every" aria-label="Remind me every">' + [0, 1, 3, 7, 14, 30].map(function (d) { return '<option value="' + d + '"' + (every === d ? ' selected' : '') + '>' + (d ? 'Every ' + d + (d > 1 ? ' Days' : ' Day') : 'Never') + '</option>'; }).join('') + '</select>' }) + '</div>' +
        // (1.70.0) moved here from Telegram > Backups
        '<div id="ix-tgbk">' + ecCard(tgOn && n.bkEvery ? 'good' : '', ICON.send, 'Send Backups to Telegram', 'The whole site as one file, sent to your Telegram chat at your daily message hour. ' +
            (enc.set ? 'Locked like the files you download.' : 'Not locked: anyone who gets into your Telegram could open it.'),
          tgOn ? seg('nbk', [[0, 'Off'], [1, 'Daily'], [3, 'Every 3 Days'], [7, 'Weekly'], [14, 'Every 2 Weeks'], [30, 'Monthly']], n.bkEvery || 0) +
            '<p class="ix-note">Last backup sent: ' + (n.bkLast ? esc(when(n.bkLast)) : 'none yet') + '.' + (n.bkError ? ' <span class="ix-err">Last problem: ' + esc(n.bkError) + '</span>' : '') + '</p>' +
            '<div class="ix-row"><button type="button" class="ix-btn" id="ix-tgbknow">' + svg(ICON.send) + 'Send Backup Now</button></div>'
            : '<p class="ix-note">Connect a Telegram bot first.</p><div class="ix-row"><button type="button" class="ix-btn pri" id="ix-tgsetup">Set Up Telegram</button></div>') + '</div>' +
        cloudCard(cl, enc) +
        '<details class="ix-more" id="ix-choose"><summary>Choose What to Include</summary>' +
          [['pages', 'Pages', 'Links, Info, Cards, Tasks, Home and Tools presets.'], ['site', 'Site', 'Your settings, Telegram and the domain watch list.']].concat(parts.files ? [['files', 'Files', 'The files you keep on the Files page. Can be big, so it is off unless you want it.']] : []).map(function (g) {
            return '<label class="ix-tg"><span>' + g[1] + '<small>' + g[2] + '</small></span><input type="checkbox" data-grp="' + g[0] + '"></label>'; }).join('') +
          '<details class="ix-more ix-onebyone"><summary>Pick Parts One by One</summary>' +
          '<div class="ix-bkh"><b>What to Include</b><span class="ix-mu"><a href="#" id="ix-bkall">All</a> · <a href="#" id="ix-bknone">None</a></span></div>' +
          '<div class="ix-bkgrid">' + Object.keys(NAMES).map(function (k) {
            var pt = parts[k] || {}, tabs = pt.tabs && pt.tabs.length ? pt.tabs : null;
            return '<div class="ix-bkp"><label class="ix-bkl"><input type="checkbox" data-part="' + k + '" data-size="' + (+pt.size || 0) + '"' + (k === 'files' ? '' : ' checked') + '><span class="ix-bkn"><b>' + NAMES[k] + '</b><small title="' + esc(pt.summary || '') + '">' + esc(pt.summary || '') + '</small></span>' + (pt.size ? '<em>' + size(pt.size) + '</em>' : '') + '</label>' +
              (tabs ? '<button type="button" class="ix-linkbtn" data-tabsbtn="' + k + '">Choose tabs (' + tabs.length + ')</button><div class="ix-tabs" data-tabs="' + k + '" hidden>' + tabs.map(function (t) {
                return '<label><input type="checkbox" value="' + esc(t.id) + '" checked>' + esc(t.name || 'Tab') + (t.enc ? ' 🔒' : t.private ? ' (private)' : '') + '</label>'; }).join('') + '</div>' : '') + '</div>';
          }).join('') + '</div></details></details>' +
        '<p class="ix-note">Keep backup files somewhere other than this server.</p>' +
        '<details class="ix-acc"><summary><span>Restore</span><small>Bring everything back from a backup file.</small></summary><div class="ix-accb">' +
          '<div id="ix-rst"></div>' +
          '<h3 class="ix-h3" id="ix-vacc">Earlier Versions</h3><p>' + (j.versions.length ? j.versions.length + ' saved' + (newest ? ', newest ' + esc(ago(newest)) : '') : 'None yet') + '. Up to 40 per page, one every 10 minutes, kept automatically while you edit. Restoring keeps a copy first.</p>' +
          '<div class="ix-row" id="ix-vf" style="margin-bottom:6px">' + seg('vf', [['all', 'All']].concat(['links', 'info', 'cards', 'tasks', 'home'].map(function (k) {
            var c = j.versions.filter(function (v) { return v.app === k; }).length; return [k, NAMES[k] + (c ? ' ' + c : '')]; })), 'all') + '</div><div id="ix-vl"></div></div></details>' +
        '<details class="ix-acc" id="ix-xacc"><summary><span>Export</span><small>Spreadsheets, JSON, and bookmarks for other browsers</small></summary><div class="ix-accb">' +
          tabHead(ICON.file, 'Export', 'One page at a time, to open in a spreadsheet, another browser, or to keep. This is not a backup: use Back Up for that.') +
          [['links', 'Links', ICON.bookmark, 'Every bookmark with its tab, category, name and address. Encrypted tabs stay locked and are left out of the spreadsheet.'],
           ['cards', 'Cards', ICON.card, 'Every card with its details, one row each.'],
           ['tasks', 'Tasks', ICON.check, 'Every task with its due date, repeat, price and notes.']].map(function (x) {
            return ecCard('', x[2], x[1], x[3], '<div class="ix-row"><button type="button" class="ix-btn pri" data-export="' + x[0] + '" data-fmt="csv">' + svg(ICON.down) + 'Download CSV</button><button type="button" class="ix-btn" data-export="' + x[0] + '" data-fmt="json">' + svg(ICON.down) + 'Download JSON</button></div>'); }).join('') +
          ecCard('', ICON.bookmark, 'Bookmarks for Other Browsers', 'The standard bookmark file that Chrome, Edge, Firefox and Safari can import. Encrypted tabs stay locked here; to include them, unlock them and use Export Bookmarks in Links Settings.',
            '<label class="ix-tg"><span>Include Private Tabs<small>Also writes your private tabs. The file is plain text: keep it safe.</small></span><input type="checkbox" id="ix-bmpriv"></label><div class="ix-row"><button type="button" class="ix-btn pri" data-export="links" data-fmt="html">' + svg(ICON.down) + 'Download Bookmark File</button></div>') +
          '<p class="ix-note" id="ix-xs">The files hold your data as plain text. Keep them somewhere safe.</p></div></details>' +
        // (1.72.0) the Import Center: another app's export becomes tasks, notes, links or cards (importer.js reads it here in the browser)
        '<details class="ix-acc" id="ix-iacc"><summary><span>Import</span><small>From Todoist, Google Keep, Notion, a calendar, Raindrop, Pocket and more</small></summary><div class="ix-accb">' +
          tabHead(ICON.upload, 'Import', 'Bring in what you keep in another app. You see everything first; nothing is added until you press Add, and Undo takes it back.') +
          '<div class="ix-imfrom">' + [['Calendar (.ics)', 'Tasks'], ['Todoist (CSV)', 'Tasks'], ['Google Keep (Takeout)', 'Info'], ['Notion (Markdown export)', 'Info'], ['Notes (.txt, .md, .html)', 'Info'],
            ['Raindrop (CSV)', 'Links'], ['Pocket', 'Links'], ['Bookmarks (.html)', 'Links'], ['Cards (CSV)', 'Cards']].map(function (x) { return '<span><b>' + x[0] + '</b>' + svg('M5 12h14M13 6l6 6-6 6') + x[1] + '</span>'; }).join('') + '</div>' +
          '<label class="ix-drop" id="ix-imdrop"><input type="file" id="ix-imfile" multiple accept=".ics,.csv,.json,.zip,.md,.markdown,.txt,.html,.htm"><b>Choose a File</b><span>or drop it here. A .zip from Google Takeout or Notion is read as a whole.</span></label>' +
          '<div id="ix-imres" aria-live="polite"></div></div></details>' +
        '<details class="ix-acc ix-danger" id="ix-reset"><summary><span>Start Over</span><small>Erase all data and settings, like a new site</small></summary><div class="ix-accb">' +
          '<div id="ix-rsst"></div></div></details>' +
        '<p class="ix-note">Moving the site? Copy the whole folder: your data is in <code>site-data</code>.</p>';
      wireCloud(p, cl);
      bindImport(p);   // (1.72.0) the Import tab, once it is drawn
      var tgb = p.querySelector('#ix-tgbk');
      if (!tgOn) tgb.querySelector('#ix-tgsetup').onclick = function () { go('telegram/setup'); };
      else {
        bindSeg(tgb, function (k, v) {
          if (k !== 'nbk') return;
          api('notify_save', { bkEvery: +v }).then(function (r2) {
            if (!r2 || !r2.ok) { toast((r2 && r2.error) || 'Could not save.'); pBackup(p); return; }
            toast(r2.bkEvery ? 'Backups will be sent ' + ({ 1: 'every day', 3: 'every 3 days', 7: 'every week', 14: 'every 2 weeks', 30: 'every month' }[r2.bkEvery] || 'regularly') + '.' : 'Backups to Telegram are off.'); pBackup(p);
          }, function () { toast("Can't reach the server."); });
        });
        tgb.querySelector('#ix-tgbknow').onclick = function () {
          var b = this; b.disabled = true; b.lastChild.textContent = 'Sending…';
          api('notify_backup', {}, null, { timeout: 240000 }).then(function (r2) {
            b.disabled = false; b.lastChild.textContent = 'Send Backup Now';
            if (!r2 || !r2.ok) { toast((r2 && r2.error) || 'Something went wrong.'); return; }
            S.backupLast = r2.backupLast || S.backupLast; remember(S); redraw(); toast('Backup sent. Check Telegram.'); pBackup(p);
          }, function () { b.disabled = false; b.lastChild.textContent = 'Send Backup Now'; toast('The site did not answer in time. A backup can still arrive in Telegram: look there before you try again.'); });
        };
      }
      /* (1.69.0) Start Over is a Stepper: What Gets Erased -> Back Up First -> Type ERASE. The last button keeps the Erase Everything look (#ix-rsgo). */
      stepper(p.querySelector('#ix-rsst'), { kind: 'numbers', linear: true, danger: true, lastId: 'ix-rsgo', lastClass: 'ix-erase',
        lastHtml: '<span class="ix-et">Erase Everything</span><span class="ix-ei" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M24 20.188l-8.315-8.209 8.2-8.282-3.697-3.697-8.212 8.318-8.31-8.203-3.666 3.666 8.321 8.24-8.206 8.313 3.666 3.666 8.237-8.318 8.285 8.203z"/></svg></span>',
        steps: [
          { title: 'What Gets Erased', html: '<p><b>This erases:</b> every page\'s data and earlier versions (Links, Info, Cards, Tasks, Start page), your pictures, icons and logo, the site settings and colors, Telegram, the domain watch list, the encryption passphrase and Telegram login approval.</p>' +
              '<p><b>This keeps:</b> your password and two-step login, so you can log in again. Encrypted tabs cannot be opened afterwards unless you restore a backup and set the same passphrase.</p>' },
          { title: 'Back Up First', html: '<p>Everything comes back by restoring a backup file (Restore, above). <b>Download a full backup first</b>; it uses what is chosen under Back Up.</p>' +
              '<div class="ix-row"><button type="button" class="ix-btn pri" id="ix-rsbk">' + svg(ICON.down) + 'Download a Backup</button></div>' },
          { title: 'Confirm', html: '<label class="ix-fl2">Type ERASE<input type="text" id="ix-rsc" autocomplete="off" spellcheck="false"></label>' +
              '<label class="ix-fl2">Website Password<input type="password" id="ix-rsp" autocomplete="current-password"></label><p class="ix-err" id="ix-rse"></p>',
            next: function (q, c) {
              var er = p.querySelector('#ix-rse');
              if (p.querySelector('#ix-rsc').value.trim() !== 'ERASE') { er.textContent = 'Type ERASE (in capitals) to confirm.'; return false; }
              if (!p.querySelector('#ix-rsp').value) { er.textContent = 'Type your website password.'; return false; }
              if (!confirm('Erase all data and settings now? This cannot be undone except by importing a backup file.')) return false;
              er.textContent = 'Erasing…';
              return api('reset_all', { confirm: 'ERASE', password: p.querySelector('#ix-rsp').value }).then(function (j) {
                if (!j.ok) { er.textContent = j.error || 'Nothing was erased.'; return false; }
                try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}   // this browser's copies too (theme, cached pages, kept keys)
                window.HubVault.devDropAll();
                er.textContent = '';
                setTimeout(function () { location.reload(); }, 1200);
                return true;
              }, function () { er.textContent = "Can't reach the server. Nothing was erased."; return false; });
            } }],
        done: '<div class="ix-st-fin"><span class="ix-st-big"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg></span><h3>Everything is erased</h3><p>Reloading…</p></div>' });
      p.querySelector('#ix-rsbk').onclick = function () { var x = p.querySelector('#ix-exp'); if (x) x.click(); };
      p.querySelectorAll('[data-tabsbtn]').forEach(function (b) { b.onclick = function () { var t = p.querySelector('[data-tabs="' + b.dataset.tabsbtn + '"]'); t.hidden = !t.hidden; }; });
      // tab choices follow their part's checkbox
      p.querySelectorAll('[data-part]').forEach(function (c) { c.onchange = function () { var t = p.querySelector('[data-tabs="' + c.dataset.part + '"]'), b = p.querySelector('[data-tabsbtn="' + c.dataset.part + '"]'); if (b) b.hidden = !c.checked; if (t && !c.checked) t.hidden = true; }; });
      var bkSum = function () {
        var cs = [].slice.call(p.querySelectorAll('[data-part]')), on = cs.filter(function (c) { return c.checked; }), bytes = on.reduce(function (a, c) { return a + (+c.dataset.size || 0); }, 0), el = p.querySelector('#ix-bksum');
        if (el) el.textContent = on.length + ' of ' + cs.length + ' selected' + (bytes ? ' · about ' + size(bytes) : '');
      };
      var GRP = { pages: ['links', 'info', 'cards', 'tasks', 'home', 'tools'], site: ['settings', 'telegram', 'watch'], files: ['files'] };
      var syncGrp = function () { p.querySelectorAll('[data-grp]').forEach(function (g) { var cs = GRP[g.dataset.grp].map(function (k) { return p.querySelector('[data-part="' + k + '"]'); }).filter(Boolean); g.checked = cs.length > 0 && cs.every(function (c) { return c.checked; }); }); };
      p.querySelectorAll('[data-grp]').forEach(function (g) { g.onchange = function () { var on = g.checked; GRP[g.dataset.grp].forEach(function (k) { var c = p.querySelector('[data-part="' + k + '"]'); if (c) { c.checked = on; c.dispatchEvent(new Event('change')); } }); }; });
      p.querySelectorAll('[data-part]').forEach(function (c) { c.addEventListener('change', function () { bkSum(); syncGrp(); }); }); bkSum(); syncGrp();
      [['ix-bkall', true], ['ix-bknone', false]].forEach(function (x) { var a = p.querySelector('#' + x[0]); if (a) a.onclick = function (e) { e.preventDefault(); p.querySelectorAll('[data-part]').forEach(function (c) { c.checked = x[1]; c.dispatchEvent(new Event('change')); }); }; });
      p.querySelector('#ix-exp').onclick = function () {
        var q = [], extra = '';
        p.querySelectorAll('[data-part]').forEach(function (c) {
          if (!c.checked) return; q.push(c.dataset.part);
          var t = p.querySelector('[data-tabs="' + c.dataset.part + '"]');
          if (t) { var all = t.querySelectorAll('input'), on = t.querySelectorAll('input:checked');
            if (!on.length) { q.pop(); return; }
            if (on.length < all.length) extra += '&' + c.dataset.part + '_tabs=' + encodeURIComponent([].map.call(on, function (x) { return x.value; }).join(',')); }
        });
        if (!q.length) { toast('Pick at least one part.'); return; }
        // downloaded with the security token in a header (not in the address), then saved from memory
        var btn = this; btn.disabled = true;
        if (enc.set) extra += '&enc=1';   // (1.61.0) a backup is always locked once there is a passphrase
        fetch(CORE + 'api.php?action=backup&parts=' + q.join(',') + extra, { credentials: 'same-origin', headers: { 'X-Hub-CSRF': S.csrf } }).then(function (r) {
          if (!r.ok) return r.json().then(function (j) { throw new Error(j.error || 'Backup failed.'); });
          var name = (/filename="([^"]+)"/.exec(r.headers.get('Content-Disposition') || '') || [])[1] || 'backup.json';
          return r.blob().then(function (blob) {
            var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
            document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
            if (q.length >= Object.keys(NAMES).filter(function (k) { return k !== 'files'; }).length && !/_tabs=/.test(extra) && Object.keys(NAMES).every(function (k) { return k === 'files' || q.indexOf(k) >= 0; })) { S.backupLast = Date.now() / 1000; remember(S); redraw(); pBackup(p); }
            toast('Backup downloaded.');
          });
        }).catch(function (e) { toast(e.message || 'Backup failed.'); }).finally(function () { btn.disabled = false; });
      };
      p.querySelector('#ix-encgo2').onclick = function (e) { e.preventDefault(); go('security'); };
      p.querySelector('#ix-every').onchange = function (e) {
        S.backupEvery = +e.target.value;
        api('settings', { settings: { backupEvery: S.backupEvery } }).then(function () { remember(S); redraw(); toast('Reminder saved.'); pBackup(p); });
      };
      // import: click or drop a file
      /* (1.69.0) Restore is a Stepper: File -> Choose What to Restore -> Restoring (bars). importFile() fills step 2 (or asks for the
         passphrase of an encrypted backup there); the Restore button runs box.__restore. */
      var rst = stepper(p.querySelector('#ix-rst'), { kind: 'bars', linear: true, complete: 'Restore',
        steps: [
          { title: 'File', html: '<label class="ix-dropz" id="ix-dropz"><input type="file" id="ix-imp" accept=".json,.gz,application/json,application/gzip"><b>Drop a Backup File Here</b><span>or click to choose. .json, or .json.gz from Telegram. You pick what to restore next, and what is there now is kept as an earlier version first.</span></label>',
            next: function (q, c) { if (!q.querySelector('#ix-imp').files.length && !rst.__file) { c.err('Choose a backup file first.'); return false; } } },
          { title: 'Choose', html: '<div id="ix-impx"></div>', next: function (q, c) { var bx = q.querySelector('#ix-impx'); if (!bx.__restore) { c.err('Unlock the file first, or choose another one.'); return false; } return bx.__restore(); } }],
        done: '<div class="ix-st-fin"><span class="ix-st-big"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg></span><h3>Restored</h3><p>Reloading…</p></div>' });
      var dz = p.querySelector('#ix-dropz');
      var pickFile = function (f) { if (!f) return; rst.__file = f; var bx = p.querySelector('#ix-impx'); bx.__restore = null; importFile(f, bx); rst.go(2); };
      p.querySelector('#ix-imp').onchange = function (e) { pickFile(e.target.files[0]); };
      ['dragenter', 'dragover'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('over'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('over'); }); });
      dz.addEventListener('drop', function (e) { if (e.dataTransfer.files[0]) pickFile(e.dataTransfer.files[0]); });
      // earlier versions: drawn only when opened, 20 at a time
      var vl = p.querySelector('#ix-vl'), filt = 'all', shown = 20;
      function drawVersions() {
        var all = j.versions.filter(function (v) { return filt === 'all' || v.app === filt; }), list = all.slice(0, shown);
        vl.innerHTML = list.length ? list.map(function (v) {
          return '<div class="ix-ver"><span class="ix-tag">' + NAMES[v.app] + '</span><span>' + esc(ago(v.time)) + ' <small>' + esc(when(v.time)) + '</small></span><span style="color:var(--ix-mu2)">' + size(v.size) + '</span>' +
            '<button type="button" data-hold class="ix-btn" data-app="' + v.app + '" data-id="' + esc(v.id) + '">Restore</button></div>'; }).join('') +
          (all.length > shown ? '<div class="ix-row"><button type="button" class="ix-btn" id="ix-vmore">Show More (' + (all.length - shown) + ')</button></div>' : '') : '<p>No earlier versions yet.</p>';
        vl.querySelectorAll('[data-id]').forEach(function (b) { b.onclick = function () {
          api('version_restore', { app: b.dataset.app, id: b.dataset.id }).then(function (k) {
            if (!k.ok) { toast(k.error); return; } toast(NAMES[b.dataset.app] + ' restored. Reloading…'); setTimeout(function () { location.reload(); }, 900); });
        }; });
        var more = vl.querySelector('#ix-vmore'); if (more) more.onclick = function () { shown += 20; drawVersions(); };
      }
      drawVersions();
      bindSeg(p.querySelector('#ix-vf'), function (k, v) { filt = v; shown = 20; drawVersions(); });
    });
  }
  /* An encrypted backup: the passphrase is asked here and used only in this browser (PBKDF2-SHA256 -> AES-256-GCM, then gzip). */
  function b64bytes(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function decryptBackup(j, pass) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64bytes(j.salt), iterations: j.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    }).then(function (key) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64bytes(j.iv), tagLength: 128 }, key, b64bytes(j.data));
    }).then(function (gz) {
      return new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    });
  }
  function askPassphrase(j, file, box) {
    if (!window.crypto || !crypto.subtle || !window.DecompressionStream) { box.innerHTML = '<p class="ix-err">This browser can\'t open encrypted backups. Use a current Chrome, Edge, Firefox or Safari, on https.</p>'; return; }
    box.innerHTML = '<form class="ix-encask" id="ix-encf"><p style="margin-top:10px"><b>🔒 Encrypted backup</b>' + (j.site ? ' of ' + esc(j.site) : '') + (j.created ? ', ' + esc(new Date(j.created).toLocaleString()) : '') + '.</p>' +
      '<label for="ix-encp">' + (j.pw === 'login' ? 'Website Password' : 'Encryption Passphrase (or Website Password)') + '</label><div class="ix-row"><input type="password" id="ix-encp" autocomplete="' + (j.pw === 'login' ? 'current-password' : 'off') + '" style="flex:1"><button class="ix-btn pri" id="ix-encgo">Unlock</button></div>' +
      '<p class="ix-note">Used only in this browser.</p><p class="ix-err" id="ix-ence"></p></form>';
    var f = box.querySelector('#ix-encf'); box.querySelector('#ix-encp').focus();
    f.onsubmit = function (e) {
      e.preventDefault();
      var b = box.querySelector('#ix-encgo'); b.disabled = true; b.textContent = 'Unlocking…';
      decryptBackup(j, box.querySelector('#ix-encp').value).then(function (text) {
        importFile(new File([text], file.name.replace(/(\.enc)?\.json$/i, '.json'), { type: 'application/json' }), box);
      }, function () { b.disabled = false; b.textContent = 'Unlock'; box.querySelector('#ix-ence').textContent = 'That doesn\'t open this file (or the file was changed).'; });
    };
  }
  function importFile(file, box) {
    if (!file) return;
    // .json.gz (big backups sent to Telegram): unpacked in the browser first
    if (/\.gz$/i.test(file.name)) {
      if (!window.DecompressionStream) { box.innerHTML = '<p class="ix-err">This browser can\'t open .gz files. Use a current Chrome, Edge, Firefox or Safari.</p>'; return; }
      new Response(file.stream().pipeThrough(new DecompressionStream('gzip'))).blob().then(function (b) { importFile(new File([b], file.name.replace(/\.gz$/i, '')), box); },
        function () { box.innerHTML = '<p class="ix-err">This .gz file could not be unpacked.</p>'; });
      return;
    }
    var r = new FileReader();
    r.onload = function () {
      var j; try { j = JSON.parse(r.result); } catch (e) { box.innerHTML = '<p class="ix-err">This isn\'t a backup file (not valid JSON).</p>'; return; }
      if (j.format === 'site-backup-encrypted') return askPassphrase(j, file, box);
      var parts = {};
      if (j.format === 'site-backup') parts = j.parts || {};
      else if (j.format === 'bookmarks-backup') parts = { links: j };
      else if (j.tabs && j.page && j.tabs[0] && j.tabs[0].boxes) parts = { info: j };
      else if (Array.isArray(j.cards)) parts = { cards: j };
      else if (j.format === 'tasks-export' && Array.isArray(j.tasks)) parts = { tasks: j };
      var keys = Object.keys(parts).filter(function (k) { return NAMES[k]; });
      if (!keys.length) { box.innerHTML = '<p class="ix-err">This file isn\'t a site, Links, Info, Cards or Tasks backup.</p>'; return; }
      var tabbed = keys.some(function (k) { return k === 'links' || k === 'info'; });
      box.innerHTML = '<p style="margin-top:10px">Found in this file' + (j.created ? ' (' + esc(new Date(j.created).toLocaleString()) + ')' : '') + ':</p>' +
        keys.map(function (k) { return '<div class="ix-part"><label><input type="checkbox" data-r="' + k + '" checked> <b>' + NAMES[k] + '</b></label></div>'; }).join('') +
        (tabbed ? '<p>For Links and Info:</p>' + seg('mode', [['replace', 'Replace Everything'], ['merge', 'Add or Update These Tabs Only']], 'replace') : '') +
        '<p class="ix-note">What is there now is kept as an earlier version first.</p><p class="ix-err" id="ix-re"></p>';
      var mode = 'replace';
      if (tabbed) bindSeg(box, function (k, v) { mode = v; });
      // (1.69.0) run by the Restore button of the Stepper; true when it went through (then the page reloads)
      box.__restore = function () {
        var pick = {}; box.querySelectorAll('[data-r]:checked').forEach(function (c) { pick[c.dataset.r] = true; });
        box.querySelector('#ix-re').textContent = '';
        if (!Object.keys(pick).length) { box.querySelector('#ix-re').textContent = 'Pick at least one part.'; return false; }
        return api('restore', { backup: j, pick: pick, mode: mode }).then(function (k) {
          if (!k.ok) { box.querySelector('#ix-re').textContent = k.error || 'Restore failed.'; return false; }
          toast('Restored: ' + k.restored.join(', ') + '. Reloading…'); setTimeout(function () { location.reload(); }, 1100); return true;
        }, function () { box.querySelector('#ix-re').textContent = 'The file may be too large for this server.'; return false; });
      };
    };
    r.readAsText(file);
  }


