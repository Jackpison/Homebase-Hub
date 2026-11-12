  /* ---------- Changelog: web/hub/docs/CHANGELOG.md, read through the API (the docs folder is closed to browsers) ---------- */
  var CL = null, CLWANT = '';             // the parsed file (kept while Settings is open), and a version another tab asked to see
  function mdInline(src) {                // everything is escaped first; only code, bold, italic and web links are turned back into markup
    return String(src).split(/(`[^`]+`)/).map(function (part) {
      if (part.charAt(0) === '`' && part.length > 2 && part.charAt(part.length - 1) === '`') return '<code>' + esc(part.slice(1, -1)) + '</code>';
      var t = esc(part);
      t = t.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*\w])\*([^*\s][^*]*)\*(?![\w*])/g, '$1<i>$2</i>');
      return t.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    }).join('');
  }
  function mdBlocks(md) {
    var L = String(md).replace(/\r/g, '').split('\n'), out = [], i = 0, stack = [];
    var closeTo = function (n) { while (stack.length > n) out.push('</li></' + stack.pop() + '>'); };
    while (i < L.length) {
      var ln = L[i], m;
      if (/^```/.test(ln)) {                                           // a code block
        closeTo(0); var code = []; i++;
        while (i < L.length && !/^```/.test(L[i])) code.push(L[i++]);
        i++; out.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>'); continue;
      }
      if ((m = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(ln))) {               // a list item; two spaces of indent = one level deeper
        var lvl = Math.floor(m[1].length / 2) + 1, tag = /\d/.test(m[2]) ? 'ol' : 'ul';
        if (lvl > stack.length) { while (stack.length < lvl) { out.push('<' + tag + '>'); stack.push(tag); } out.push('<li>' + mdInline(m[3])); }
        else { closeTo(lvl); out.push('</li><li>' + mdInline(m[3])); }
        i++; continue;
      }
      if (stack.length && /^\s{2,}\S/.test(ln)) { out.push('<br>' + mdInline(ln.trim())); i++; continue; }   // a wrapped list line
      closeTo(0);
      if (!ln.trim()) { i++; continue; }
      if ((m = /^(#{1,6})\s+(.*)$/.exec(ln))) { var h = Math.min(6, Math.max(4, m[1].length + 1)); out.push('<h' + h + '>' + mdInline(m[2]) + '</h' + h + '>'); i++; continue; }
      if (/^-{3,}\s*$/.test(ln)) { i++; continue; }
      if (/^\|/.test(ln)) {                                            // a table
        var rows = []; while (i < L.length && /^\|/.test(L[i])) rows.push(L[i++]);
        var cells = function (r) { return r.replace(/^\||\|\s*$/g, '').split('|').map(function (c) { return c.trim(); }); };
        var head = cells(rows[0]), bodyRows = rows.slice(/^\|[\s:|-]+\|?\s*$/.test(rows[1] || '') ? 2 : 1);
        out.push('<div class="ix-tblw"><table><thead><tr>' + head.map(function (c) { return '<th>' + mdInline(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          bodyRows.map(function (r) { return '<tr>' + cells(r).map(function (c) { return '<td>' + mdInline(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>'); continue;
      }
      if (/^>\s?/.test(ln)) { var q = []; while (i < L.length && /^>\s?/.test(L[i])) q.push(L[i++].replace(/^>\s?/, '')); out.push('<blockquote>' + mdInline(q.join(' ')) + '</blockquote>'); continue; }
      var para = [ln]; i++;
      while (i < L.length && L[i].trim() && !/^(#{1,6}\s|```|\||>|\s*([-*]|\d+\.)\s)/.test(L[i])) para.push(L[i++]);
      out.push('<p>' + mdInline(para.join(' ')) + '</p>');
    }
    closeTo(0); return out.join('');
  }
  function clParse(md) {
    var secs = [], cur = null, fence = false;
    String(md).replace(/\r/g, '').split('\n').forEach(function (ln) {
      if (/^```/.test(ln)) fence = !fence;
      var m = !fence && /^## (.+)$/.exec(ln);
      if (m) { cur = { title: m[1].trim(), lines: [] }; secs.push(cur); } else if (cur) cur.lines.push(ln);
    });
    var map = {}, entries = [], notes = [];
    secs.forEach(function (x) {
      var body = x.lines.join('\n').replace(/\n-{3,}\s*$/, '').replace(/^\s+|\s+$/g, '');
      if (x.title === 'Version Map') {
        body.split('\n').forEach(function (r) { var c = /^\|\s*([^|]+?)\s*\|\s*(.+?)\s*\|\s*$/.exec(r); if (c && c[1] !== 'Version' && !/^-+$/.test(c[1])) map[c[1]] = c[2]; });
        x.mapRows = body.split('\n').filter(function (r) { return /^\|/.test(r); }).slice(2).map(function (r) { var c = /^\|\s*([^|]+?)\s*\|\s*(.+?)\s*\|\s*$/.exec(r); return c ? [c[1], c[2]] : null; }).filter(Boolean);
        CL.mapRows = x.mapRows;
      } else if (/^\d/.test(x.title)) {
        var d = /^(\S+?)(?:\s*\((\d{4}-\d{2}-\d{2})\))?(?::\s*(.*))?$/.exec(x.title) || [x.title, x.title];
        var firstWord = x.title.split(/\s|:/)[0];
        entries.push({ ver: firstWord, title: x.title, date: d[2] || '', label: d[3] || '', body: body });
      } else notes.push({ title: x.title, body: body });
    });
    entries.forEach(function (e) { e.summary = map[e.ver] || map[e.title] || ''; });
    return { entries: entries, notes: notes };
  }
  function clLoad() {
    if (CL && CL.entries) return Promise.resolve(CL);
    return api('changelog').then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || 'Could not load the changelog.');
      CL = { version: j.version, time: j.time, mapRows: [] };
      var r = clParse(j.md); CL.entries = r.entries; CL.notes = r.notes;
      return CL;
    });
  }
  function clFail(p) { return function (e) { p.innerHTML = '<div class="ix-empty"><span class="ix-empty-i">' + svg(ICON.warn) + '</span><b>Could Not Load the Changelog</b><p>' + esc(e && e.message || 'Can\'t reach the server.') + '</p></div>'; }; }
  function pChangelog(p) {
    p.innerHTML = spinRow('Reading the changelog…');
    clLoad().then(function (cl) {
      var cur = cl.version, shown = cl.entries;
      p.innerHTML = '<div class="ix-hero"><span class="ix-hero-i good">' + svg(ICON.log) + '</span><div class="ix-hero-t"><div class="ix-hero-h">You Have Version ' + esc(cur) + '</div>' +
          '<p>' + cl.entries.length + ' versions are written down here, newest first. Open one to see what changed.</p></div></div>' +
        '<div class="ix-cl-bar"><div class="ix-cl-search">' + svg(ICON.search) + '<input type="search" id="ix-clq" placeholder="Search the Changelog" aria-label="Search the Changelog" autocomplete="off" spellcheck="false"></div>' +
          '<button type="button" class="ix-btn" id="ix-clall">Expand All</button><button type="button" class="ix-btn" id="ix-clnone">Collapse All</button></div>' +
        '<div class="ix-pcount" id="ix-clcount" aria-live="polite"></div>' +
        '<div id="ix-cll" class="ix-tl">' + shown.map(function (e, i) {
          var ci = shown.findIndex(function (x) { return x.ver === cur; }), st = ci < 0 || i > ci ? 'done' : i === ci ? 'now' : 'up';   // (1.75.0) a timeline: newer than yours (not yet), yours, and the ones you have passed
          return '<details class="ix-cl ' + st + '" data-i="' + i + '"' + (i === 0 ? ' open' : '') + '><summary><i class="ix-cl-m" aria-hidden="true"></i><span class="ix-cl-v">' + esc(e.ver) + '</span>' +
            (e.ver === cur ? '<span class="ix-pill good">Installed</span>' : '') + (e.date ? '<span class="ix-cl-date">' + esc(e.date) + '</span>' : '') +
            '<span class="ix-cl-d">' + mdInline(e.summary || e.label || '') + '</span></summary><div class="ix-cl-b ix-md"></div></details>'; }).join('') + '</div>' +
        '<p class="ix-note ix-pnone" id="ix-clnone2" hidden>Nothing in the changelog matches that. Try a shorter word.</p>';
      var rows = [].slice.call(p.querySelectorAll('details.ix-cl'));
      var fill = function (d) { var b = d.querySelector('.ix-cl-b'); if (!b.dataset.done) { b.innerHTML = mdBlocks(shown[+d.dataset.i].body); b.dataset.done = '1'; } };
      rows.forEach(function (d) { d.addEventListener('toggle', function () { if (d.open) fill(d); }); if (d.open) fill(d); });
      var q = p.querySelector('#ix-clq');
      var filter = function () {
        var t = q.value.trim().toLowerCase(), n = 0;
        rows.forEach(function (d) {
          var e = shown[+d.dataset.i], hit = !t || (e.title + ' ' + e.summary + ' ' + e.body).toLowerCase().indexOf(t) >= 0;
          d.hidden = !hit; if (hit) n++;
          if (t && hit && n <= 6) { d.open = true; fill(d); }
        });
        p.querySelector('#ix-clcount').textContent = t ? n + ' of ' + rows.length + ' versions match' : '';
        p.querySelector('#ix-clnone2').hidden = n > 0;
      };
      q.oninput = filter;
      p.querySelector('#ix-clall').onclick = function () { rows.forEach(function (d) { if (!d.hidden) d.open = true; }); };
      p.querySelector('#ix-clnone').onclick = function () { rows.forEach(function (d) { d.open = false; }); };
      if (CLWANT) {                                                   // sent here from the Version Map
        var want = CLWANT; CLWANT = '';
        var hit = rows.filter(function (d) { return shown[+d.dataset.i].ver === want; })[0] || rows.filter(function (d) { return shown[+d.dataset.i].ver.indexOf(want) === 0; })[0];
        if (hit) { hit.open = true; fill(hit); setTimeout(function () { hit.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60); }
      }
    }).catch(clFail(p));
  }
  function pChMap(p) {
    p.innerHTML = spinRow('Reading the changelog…');
    clLoad().then(function (cl) {
      var open = {}; cl.entries.forEach(function (e) { open[e.ver] = 1; });
      p.innerHTML = tabHead(ICON.clock, 'Version Map', 'Every version in one line. Click a version to read the full story.') +
        '<div class="ix-tblw ix-vmap"><table><thead><tr><th>Version</th><th>What It Brought</th></tr></thead><tbody>' +
        cl.mapRows.map(function (r) {
          var first = r[0].split(/\s/)[0], link = open[first] || cl.entries.some(function (e) { return e.ver.indexOf(first) === 0; });
          return '<tr' + (r[0] === cl.version ? ' class="cur"' : '') + '><td>' + (link ? '<button type="button" class="ix-linkb" data-v="' + esc(first) + '">' + esc(r[0]) + '</button>' : esc(r[0])) + (r[0] === cl.version ? ' <span class="ix-pill good">Installed</span>' : '') + '</td><td>' + mdInline(r[1]) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      p.querySelectorAll('[data-v]').forEach(function (b) { b.onclick = function () { CLWANT = b.dataset.v; subPane('changelog'); }; });
    }).catch(clFail(p));
  }
  function pChNotes(p) {
    p.innerHTML = spinRow('Reading the changelog…');
    clLoad().then(function (cl) {
      p.innerHTML = tabHead(ICON.info, 'Notes', 'How updating works, and a few things worth knowing.') +
        (cl.notes.length ? cl.notes.map(function (x) { return '<section class="ix-ec"><div class="ix-ec-h"><span class="ix-ec-i">' + svg(ICON.info) + '</span><div><div class="ix-ec-t">' + esc(x.title) + '</div></div></div><div class="ix-ec-b ix-md">' + mdBlocks(x.body) + '</div></section>'; }).join('')
          : '<div class="ix-empty"><b>No Notes</b></div>');
    }).catch(clFail(p));
  }

