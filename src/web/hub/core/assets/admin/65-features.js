  /* ---------- Features (1.76.0): what the site does, page by page, and the settings of each part, in one place ----------
     Files' settings (storage limit, Trash, share links, view) work right here. The other pages say where theirs are. */
  var FEATS = [
    { id: 'home', name: 'Home', c: '#3b82f6', ic: ICON.home, url: 'web/home/', lead: 'Your own start page: a clock, your day in frosted-glass widgets, and background photos that change. Show it with the bar, or without it.',
      tags: ['Widgets', 'Photos that change', 'Animated designs', 'Glass', 'Search from anywhere'],
      where: [['Show the Bar on the Home Page', 'Off keeps the home page clean.', 'go', 'nav'], ['Colors and Glass', 'The look of the glass widgets.', 'go', 'glass'], ['Widgets, photos and designs', 'On the Home page itself, in its Settings.', 'url', 'web/home/']] },
    { id: 'links', name: 'Links', c: '#22c55e', ic: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7', url: 'web/links/', lead: 'Bookmarks in tabs and categories, with icons saved on your server. Bring yours from any browser in a minute.',
      tags: ['Import with a preview', 'Easy to undo', 'Encrypted tabs', 'Most opened'],
      where: [['Tabs in the bar', 'Which pages show, and in what order.', 'go', 'nav'], ['Import Center', 'Bring links from a browser, Raindrop or Pocket.', 'go', 'backup'], ['Colors and sizes', 'On the Links page, in its Settings.', 'url', 'web/links/']] },
    { id: 'info', name: 'Info', c: '#a855f7', ic: ICON.log, url: 'web/info/', lead: 'Notes in tabs. Each tab holds 1 to 12 boxes, or is written as one document with an outline.',
      tags: ['Boxes', 'Document tabs', 'Export as PDF or text', 'Undo after a delete'],
      where: [['Encryption for locked tabs', 'One passphrase for locked tabs and files.', 'go', 'security'], ['Tab layout and boxes', 'On the Info page, in its Settings.', 'url', 'web/info/']] },
    { id: 'cards', name: 'Cards', c: '#ec4899', ic: 'M3 6h18v12H3zM3 10h18', url: 'web/cards/', lead: 'Your cards in a table you can search and filter, with the yearly charges added up.',
      tags: ['Searchable table', 'Yearly charges', 'Export to Excel', 'Sent only after login'],
      where: [['Encryption', 'Card details are locked in your browser.', 'go', 'security'], ['Holders and Banks', 'On the Cards page, in its Settings.', 'url', 'web/cards/']] },
    { id: 'tasks', name: 'Tasks', c: '#f59e0b', ic: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9', url: 'web/tasks/', lead: 'Add a task in plain words, set it to repeat, and let Telegram nudge you with Done, Skip and Snooze.',
      tags: ['Plain words', 'Repeats', 'Calendar link', 'Year in Review'],
      where: [['Telegram reminders', 'Done, Skip and Snooze on your phone.', 'go', 'telegram'], ['Time zone', 'Today and due times follow it.', 'go', 'general'], ['Calendar, repeats and analytics', 'On the Tasks page, in its Settings.', 'url', 'web/tasks/']] },
    { id: 'files', name: 'Files', c: '#0ea5e9', ic: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', url: 'web/files/', lead: 'Keep documents, photos and anything else on your own server. Each file is locked in your browser before it is sent, so the server only ever holds scrambled data.',
      tags: ['Locked in your browser', 'Share links', 'Trash', 'Starred and Recent', 'Share from your phone'], live: true,
      where: [['Encryption', 'The passphrase that locks your files.', 'go', 'security'], ['Backup & Restore', 'Files are included in a full backup.', 'go', 'backup']] },
    { id: 'tools', name: 'Tools', c: '#14b8a6', ic: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.6-.6-.6-2.6z', url: 'web/tools/', lead: 'Resize and convert images, merge and sign PDFs, work out loans and savings, make invoices, scan QR codes and more.',
      tags: ['Over 100 tools', 'Runs in your browser', 'Favourites', 'Saved presets'],
      where: [['Offline Reading', 'Keep pages on this device.', 'go', 'setup'], ['Menu or tabs, favourites', 'On the Tools page, in its Settings.', 'url', 'web/tools/']] }
  ];
  FEATS.forEach(function (f) { PANES['ft-' + f.id] = function (p) { pFeature(p, f); }; PANE_FN.set('ft-' + f.id, PANES['ft-' + f.id]); });   // (the tabs themselves are listed in SECTIONS)
  var GBY = { MB: 1048576, GB: 1073741824, TB: 1099511627776 };
  function fBytes(n) { var u = ['B', 'KB', 'MB', 'GB', 'TB'], i = 0; n = +n || 0; while (n >= 1024 && i < 4) { n /= 1024; i++; } return (i ? (n >= 100 ? n.toFixed(0) : n.toFixed(1)) : n) + ' ' + u[i]; }
  function featHead(f) {
    return '<div class="ix-fhero"><span class="ix-fhero-i" style="background:' + f.c + '">' + svg(f.ic) + '</span><div class="ix-fhero-t"><div class="ix-fhero-h">' + esc(f.name) + '</div><p>' + esc(f.lead) + '</p></div>' +
      '<a class="ix-btn" href="' + K.ROOT + f.url + '">Open ' + esc(f.name) + '</a></div>' +
      '<div class="ix-ftags">' + f.tags.map(function (t) { return '<span class="ix-cl-tag">' + esc(t) + '</span>'; }).join('') + '</div>';
  }
  function pFeatures(p) {
    p.innerHTML = '<div class="ix-fgrid">' + FEATS.map(function (f) {
        return '<button type="button" class="ix-fcard" data-ft="' + f.id + '"><span class="ix-fcard-h"><span class="ix-fhero-i" style="background:' + f.c + '">' + svg(f.ic) + '</span><b>' + esc(f.name) + '</b>' +
          (f.live ? '<span class="ix-cl-tag">Settings here</span>' : '') + '</span><span class="ix-fcard-p">' + esc(f.lead) + '</span><span class="ix-fcard-m">' + f.tags.slice(0, 3).map(esc).join(' · ') + '</span></button>';
      }).join('') + '</div>';
    p.querySelectorAll('[data-ft]').forEach(function (b) { b.onclick = function () { subPane('ft-' + b.dataset.ft); }; });
  }
  function featWhere(f) {
    return '<section class="ix-ec"><div class="ix-ec-h"><div><div class="ix-ec-t">' + (f.live ? 'Also Controlled In' : 'Where Its Settings Are') + '</div></div></div><div class="ix-ec-b">' + f.where.map(function (w, i) {
      return '<div class="ix-frow"><div><b>' + esc(w[0]) + '</b><small>' + esc(w[1]) + '</small></div><button type="button" class="ix-btn" data-fw="' + i + '">Open</button></div>';
    }).join('') + '</div></section>';
  }
  function featWire(p, f) {
    p.querySelectorAll('[data-fw]').forEach(function (b) { b.onclick = function () { var w = f.where[+b.dataset.fw]; if (w[2] === 'go') go(w[3]); else location.href = K.ROOT + w[3]; }; });
  }
  function pFeature(p, f) {
    if (!f.live) { p.innerHTML = featHead(f) + featWhere(f); featWire(p, f); return; }
    p.innerHTML = featHead(f) + spinRow('Reading the Files settings…');
    window.HUB.fetch(K.ROOT + 'web/files/api.php?action=list').then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.settings) throw new Error('Files did not answer.');
      var s = j.settings, used = j.usage || 0, free = j.free, lim = s.limit || 0, unit = lim >= GBY.TB && lim % GBY.TB === 0 ? 'TB' : 'GB';
      p.innerHTML = featHead(f) +
        '<section class="ix-ec"><div class="ix-ec-h"><div><div class="ix-ec-t">Storage Limit</div><div class="ix-ec-d">How much space Files may use on your server.</div></div></div><div class="ix-ec-b">' +
          '<div class="ix-fused"><b>' + fBytes(used) + ' used</b><small id="ix-flst"></small></div>' +
          '<div class="ix-fbar"><i id="ix-flbar"></i></div>' +
          '<div class="ix-fchips" id="ix-flch">' + [['5 GB', 5], ['10 GB', 10], ['25 GB', 25], ['50 GB', 50], ['100 GB', 100], ['No Limit', 0]].map(function (c) { return '<button type="button" class="ix-fchip" data-b="' + c[1] * GBY.GB + '">' + c[0] + '</button>'; }).join('') + '</div>' +
          '<div class="ix-frow2"><input type="number" id="ix-flnum" min="0" step="any" value="' + (lim ? +(lim / GBY[unit]).toFixed(3) : 0) + '" aria-label="Storage limit"><select id="ix-flun" aria-label="Unit">' +
            ['MB', 'GB', 'TB'].map(function (u) { return '<option' + (u === unit ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select><button type="button" class="ix-btn pri" id="ix-flsave">Save Limit</button></div>' +
          '<small class="ix-fnote" id="ix-flnote"></small></div></section>' +
        '<section class="ix-ec"><div class="ix-ec-h"><div><div class="ix-ec-t">Files Settings</div><div class="ix-ec-d">Saved as soon as you change them.</div></div></div><div class="ix-ec-b">' +
          '<label class="ix-tg"><span>Share Links<small>Off ends every link.</small></span><input type="checkbox" id="ix-flsh"' + (s.shares ? ' checked' : '') + '></label>' +
          '<div class="ix-frow"><div><b>Keep Deleted Files</b><small>Days in Trash before they are removed for good.</small></div><select id="ix-fltd" aria-label="Keep Trash">' +
            [7, 14, 30, 60, 90].map(function (d) { return '<option value="' + d + '"' + (d === s.trashDays ? ' selected' : '') + '>' + d + ' days</option>'; }).join('') + '</select></div>' +
          '<div class="ix-frow"><div><b>Default View</b><small>How files show when you open the page.</small></div><select id="ix-flvw" aria-label="Default view"><option value="list"' + (s.view === 'list' ? ' selected' : '') + '>List</option><option value="grid"' + (s.view === 'grid' ? ' selected' : '') + '>Grid</option></select></div>' +
        '</div></section>' + featWhere(f);
      featWire(p, f);
      var num = p.querySelector('#ix-flnum'), un = p.querySelector('#ix-flun'), val = function () { return Math.round(Math.max(0, +num.value || 0) * GBY[un.value]); };
      var paint = function () {
        var v = val(), t = 'Free on the server: ' + (free == null ? 'unknown' : fBytes(free)) + '.';
        if (v && v < used) t += ' That is less than you use now, so new uploads stop until you free some space.';
        else if (v && free != null && v > used + free) t += ' That is more than the server has room for, so the server\'s free space limits you first.';
        else if (!v) t += ' No limit: only the server\'s free space limits you.';
        p.querySelector('#ix-flnote').textContent = t;
        p.querySelector('#ix-flst').textContent = v ? 'of ' + fBytes(v) + ' limit' : 'no limit';
        p.querySelector('#ix-flbar').style.width = (v ? Math.min(100, used / v * 100) : 0) + '%';
        p.querySelectorAll('#ix-flch [data-b]').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.b === v)); });
      };
      num.oninput = un.onchange = paint;
      p.querySelectorAll('#ix-flch [data-b]').forEach(function (b) { b.onclick = function () { un.value = 'GB'; num.value = String(+b.dataset.b / GBY.GB); paint(); }; });
      paint();
      var save = function (set, ok) {
        return window.HUB.fetch(K.ROOT + 'web/files/api.php?action=settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings: set }) })
          .then(function (r) { return r.json(); }).then(function (r) { if (r && r.ok) { toast(ok || 'Saved.'); return true; } toast((r && r.error) || 'Could not save.', true); return false; }, function () { toast('Can\'t reach the server. Nothing was changed.', true); return false; });
      };
      p.querySelector('#ix-flsave').onclick = function () { var v = val(); save({ limit: v }, 'Storage limit saved.').then(function (ok) { if (ok) lim = v; }); };
      p.querySelector('#ix-flsh').onchange = function (e) { save({ shares: e.target.checked }); };
      p.querySelector('#ix-fltd').onchange = function (e) { save({ trashDays: +e.target.value }); };
      p.querySelector('#ix-flvw').onchange = function (e) { save({ view: e.target.value }); };
    }).catch(function (e) { p.innerHTML = featHead(f) + '<div class="ix-empty"><b>Could Not Read the Files Settings</b><p>' + esc(e && e.message || 'Can\'t reach the server.') + '</p></div>' + featWhere(f); featWire(p, f); });
  }
