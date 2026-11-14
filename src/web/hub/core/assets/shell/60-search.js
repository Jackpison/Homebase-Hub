  /* ---------- 7. one search for the whole site (Links, Info, Tools; Cards keeps its own) ----------
     Filters (scope, one tab, which fields, whole words) are remembered in this browser.
     Typing "links: text", "info: text" or "tools: text" is a shortcut for the scope. */
  var SX = { at: 0, p: null, links: [], info: [], linkTabs: [], infoTabs: [] };
  var SF = { scope: 'all', tab: '' };   // where to look; names, web addresses and note text are always searched
  try { var sf0 = JSON.parse(ls.get('hub-sfilter') || '{}') || {}; ['scope', 'tab'].forEach(function (k) { if (k in sf0) SF[k] = sf0[k]; }); } catch (e) {}
  var saveSF = function () { ls.set('hub-sfilter', JSON.stringify(SF)); };
  var SF_DEFAULT = function () { return SF.scope === 'all' && !SF.tab; };

  function plainNote(t) {
    return String(t || '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[#*_`>~|]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function loadSearchData() {
    if (SX.p && Date.now() - SX.at < 60000) return SX.p;
    SX.at = Date.now();
    var get = function (url) { return hubFetch(url, { credentials: 'same-origin', cache: 'no-store' }, { timeout: 20000 }).then(function (r) { return r.json(); }).catch(function () { return null; }); };
    // (1.72.0) also Cards (not locked), Home's Scratch Pad and every Settings item, while you are logged in
    var adm = S.admin;
    SX.p = Promise.all([get(ROOT + 'web/links/api.php?action=get'), get(ROOT + 'web/info/api.php'), adm ? get(ROOT + 'web/tasks/api.php') : null,
      adm ? get(ROOT + 'web/cards/api.php') : null, adm ? hubFetch(ROOT + 'web/home/api.php?action=pad', { credentials: 'same-origin', cache: 'no-store', headers: { 'X-Hub-CSRF': S.csrf || '' } }, { timeout: 20000 }).then(function (r) { return r.json(); }).catch(function () { return null; }) : null,
      adm ? adminJs().then(function (m) { return m.searchIndex ? m.searchIndex() : []; }, function () { return []; }) : null]).then(function (r) {
      var L = r[0], I = r[1], K = r[2], C = r[3], PD = r[4];
      SX.links = []; SX.linkTabs = []; SX.info = []; SX.infoTabs = []; SX.tasks = []; SX.cards = []; SX.pad = ''; SX.files = []; SX.settings = r[5] || [];
      var kept = function (k) { try { var v = JSON.parse(sessionStorage.getItem(k) || 'null'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
      if (C && C.auth !== false && Array.isArray(C.cards)) C.cards.forEach(function (c) { SX.cards.push({ bank: String(c.bank || ''), name: String(c.name || ''), owner: String(c.owner || ''), net: String(c.network || '') }); });
      else kept('hub-find-cards').forEach(function (c) { SX.cards.push(c); });   // locked Cards: only the names, once opened in this tab
      if (PD && typeof PD.text === 'string') SX.pad = PD.text;
      SX.files = kept('hub-find-files');   // Files' names are locked: they are searchable once Files has opened them in this tab
      if (K && K.auth) (K.tasks || []).forEach(function (t) {   // Tasks are private: only searched while you are logged in
        SX.tasks.push({ id: t.id, name: String(t.name || ''), cat: String(t.cat || ''), pay: String(t.pay || ''), notes: plainNote(t.notes), due: t.due, status: t.status,
          price: t.price, cur: t.cur || (K.settings && K.settings.currency) || '' });
      });
      ((L && L.data && L.data.tabs) || []).forEach(function (t) {
        SX.linkTabs.push({ id: t.id, name: t.title || 'Tab' });
        (t.categories || []).forEach(function (c) {
          (c.links || []).forEach(function (l) {
            if (!l || l.divider || !l.url) return;
            SX.links.push({ title: String(l.title || l.url), url: String(l.url), icon: String(l.icon || ''), where: (t.title || '') + (c.title ? ' › ' + c.title : ''), tab: t.id });
          });
        });
      });
      if (I && !I.closed) (I.tabs || []).forEach(function (t) {
        SX.infoTabs.push({ id: t.id, name: t.name || 'Tab' });
        SX.info.push({ title: String(t.name || 'Tab'), text: '', body: '', tab: t.id, color: t.color || '' });
        (t.boxes || []).forEach(function (b) {
          if (/^enc1:/.test(b.title || '') || /^enc1:/.test(b.notes || '')) return;   // encrypted: only the tab name is searchable
          SX.info.push({ title: String(t.name || 'Tab'), text: String(b.title || ''), body: plainNote(b.notes), tab: t.id, color: t.color || '' });
        });
      });
    });
    return SX.p;
  }
  function snip(text, q) {
    var i = text.toLowerCase().indexOf(q); if (i < 0) return esc(text.slice(0, 90));
    var a = Math.max(0, i - 30), z = Math.min(text.length, i + q.length + 60);
    return (a ? '…' : '') + esc(text.slice(a, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length, z)) + (z < text.length ? '…' : '');
  }
  function parseQuery(raw) {
    var scope = SF.scope, m = /^(links|info|tasks|tools)\s*:\s*/i.exec(raw);
    if (m) { scope = m[1].toLowerCase(); raw = raw.slice(m[0].length); }
    return { q: raw.trim(), scope: scope };
  }
  /* (1.72.0) a small typo still finds it: one letter wrong, missing, extra or two swapped, in words of 4 letters or more */
  function near(a, b) {
    if (Math.abs(a.length - b.length) > 1) return false;
    var i = 0; while (i < a.length && a.charAt(i) === b.charAt(i)) i++;
    if (i === a.length && i === b.length) return true;
    var x = a.slice(i + 1), y = b.slice(i + 1);
    return x === y || a.slice(i + 1) === b.slice(i) || a.slice(i) === b.slice(i + 1) || (a.charAt(i) === b.charAt(i + 1) && a.charAt(i + 1) === b.charAt(i) && a.slice(i + 2) === b.slice(i + 2));
  }
  function searchResults(p) {
    var q = p.q.toLowerCase(), scope = p.scope;
    var rank = function (s) {
      s = String(s || '').toLowerCase();
      var i = s.indexOf(q); if (i >= 0) return i === 0 ? 0 : /[\s./:-]/.test(s.charAt(i - 1)) ? 1 : 2;
      if (q.length < 4 || q.indexOf(' ') >= 0) return 9;
      var w = s.split(/[^a-z0-9\u00c0-\uffff]+/);
      for (var k = 0; k < w.length; k++) if (w[k].length >= 3 && (near(w[k], q) || (w[k].length > q.length && near(w[k].slice(0, q.length), q)))) return 4;
      return 9;
    };
    var links = [], info = [], seen = {}, tabFilter = SF.tab ? SF.tab.split(':') : null;
    if (scope === 'all' || scope === 'links') SX.links.forEach(function (l, i) {
      if (tabFilter && !(tabFilter[0] === 'links' && tabFilter[1] === l.tab)) return;
      var r = Math.min(rank(l.title), rank(l.url) + 1, rank(l.where) + 2);
      if (r < 9) links.push({ r: r, i: i, v: l });
    });
    if (scope === 'all' || scope === 'info') SX.info.forEach(function (x, i) {
      if (tabFilter && !(tabFilter[0] === 'info' && tabFilter[1] === x.tab)) return;
      var r = Math.min(rank(x.title), x.text ? rank(x.text) + 1 : 9, x.body ? rank(x.body) + 2 : 9);
      if (r >= 9) return;
      var key = x.tab + '|' + x.text; if (seen[key]) return; seen[key] = 1;
      info.push({ r: r, i: i, v: x });
    });
    var tasks = [];
    if ((scope === 'all' || scope === 'tasks') && !tabFilter) (SX.tasks || []).forEach(function (t, i) {
      var r = Math.min(rank(t.name), rank(t.cat) + 1, rank(t.pay) + 2, t.notes ? rank(t.notes) + 2 : 9);
      if (r < 9) tasks.push({ r: r + (t.status === 'done' ? 3 : 0), i: i, v: t });
    });
    var cards = [], files = [], pad = [], sets = [], here = [];
    var all = (scope === 'all') && !tabFilter;
    if (all) {
      (SX.cards || []).forEach(function (c, i) { var r = Math.min(rank(c.name), rank(c.bank), rank(c.owner) + 1, rank(c.net) + 2); if (r < 9) cards.push({ r: r, i: i, v: c }); });
      (SX.files || []).forEach(function (f, i) { var r = rank(f.n); if (r < 9) files.push({ r: r, i: i, v: f }); });
      if (SX.pad) SX.pad.split(/\n+/).forEach(function (line, i) { var r = rank(line); if (r < 9 && line.trim()) pad.push({ r: r, i: i, v: line.trim() }); });
      (SX.settings || []).forEach(function (x, i) { var r = Math.min(rank(x[0]), rank(x[2]) + 2); if (r < 9) sets.push({ r: r, i: i, v: x }); });
    }
    // the page you are on may add what only it can read: tabs and cards it has unlocked (kept in its memory, never stored)
    if (typeof FIND_HOOK === 'function' && (scope === 'all' || scope === APP)) {
      try { (FIND_HOOK() || []).forEach(function (x, i) { var r = Math.min(rank(x.title), rank(x.text) + 1); if (r < 9) here.push({ r: r, i: i, v: x }); }); } catch (e) {}
    }
    var cmp = function (a, b) { return a.r - b.r || a.i - b.i; };
    var cut = function (a) { a.sort(cmp); return a.slice(0, 8).map(function (x) { return x.v; }); };
    return { links: cut(links), info: cut(info), tasks: cut(tasks), cards: cut(cards), files: cut(files), pad: cut(pad), settings: cut(sets), here: cut(here),
      count: { links: links.length, info: info.length, tasks: tasks.length, cards: cards.length, files: files.length, pad: pad.length, settings: sets.length, here: here.length } };
  }
  var FIND_HOOK = null;
  /* (1.72.0) recent searches, on this device only (shown when the box is empty; a click searches again) */
  var RECENT_KEY = 'hub-srecent';
  function recentList() { try { var v = JSON.parse(ls.get(RECENT_KEY) || '[]'); return Array.isArray(v) ? v.filter(function (x) { return typeof x === 'string'; }).slice(0, 6) : []; } catch (e) { return []; } }
  function recentAdd(q) { q = String(q || '').trim(); if (q.length < 2) return; ls.set(RECENT_KEY, JSON.stringify([q].concat(recentList().filter(function (x) { return x.toLowerCase() !== q.toLowerCase(); })).slice(0, 6))); }
  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } }
  var infoHref = function (x, q) { return ROOT + 'web/info/#hub-info=' + encodeURIComponent(x.tab) + '&q=' + encodeURIComponent(q); };

  function filtersHtml() {
    var chip = function (v, l) { return '<button type="button" data-sf="scope" data-v="' + v + '" aria-pressed="' + (SF.scope === v) + '">' + l + '</button>'; };
    var tabs = '';
    if (SF.scope !== 'tools' && SF.scope !== 'tasks') {
      var opts = '<option value="">Any Tab</option>';
      if (SF.scope !== 'info' && SX.linkTabs.length) opts += '<optgroup label="Links">' + SX.linkTabs.map(function (t) { return '<option value="links:' + esc(t.id) + '"' + (SF.tab === 'links:' + t.id ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('') + '</optgroup>';
      if (SF.scope !== 'links' && SX.infoTabs.length) opts += '<optgroup label="Info">' + SX.infoTabs.map(function (t) { return '<option value="info:' + esc(t.id) + '"' + (SF.tab === 'info:' + t.id ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('') + '</optgroup>';
      tabs = '<label class="ix-fl">Only in Tab<select data-sf="tab">' + opts + '</select></label>';
    }
    // where to look, and (Links and Info) one tab only; names, web addresses and note text are always searched
    return '<div class="ix-fs"><div class="ix-chips" role="group" aria-label="Search in">' + chip('all', 'Everything') + chip('links', 'Links') + chip('info', 'Info') + (S.admin ? chip('tasks', 'Tasks') : '') + chip('tools', 'Tools') +
      (SF_DEFAULT() ? '' : '<button type="button" class="ix-reset ix-more" data-sf="reset">Reset</button>') + '</div>' +
      (tabs ? '<div class="ix-fx">' + tabs + '</div>' : '') + '</div>';
  }
  function resultsHtml(p) {
    var r = searchResults(p), n = 0, h = '', q = p.q, ql = q.toLowerCase();
    var row = function (href, ext, lead, title, sub) {
      return '<a class="ix-r" role="option" id="ix-r' + (n++) + '" href="' + esc(href) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + lead + '<span class="ix-rx"><b>' + title + '</b><span>' + sub + '</span></span></a>';
    };
    // (1.65.1) "?", "keys", "shortcuts", "keyboard" or "hotkeys": the list of keyboard shortcuts comes first
    if (/^\s*\?\s*$|^keys?$|keyboard|shortcut|hotkey/i.test(q)) h += '<div class="ix-rh">Help</div>' + row('#ix-keys', false, '<i class="ix-d"></i>', 'Keyboard Shortcuts', 'Search, go to a page, edit: press ? on any page');
    var head = function (name, k) { var c = r.count[k]; return '<div class="ix-rh">' + name + (c ? ' <span class="ix-rc">' + c + '</span>' : '') + '</div>'; };
    if (r.links.length) h += head('Links', 'links') + r.links.map(function (l) {
      var ic = /^icons\//.test(l.icon) ? ROOT + 'web/hub/media/links/' + l.icon : /^https?:/.test(l.icon) ? l.icon : '';
      return row(safeHref(l.url), true, ic ? '<img src="' + esc(ic) + '" alt="" loading="lazy">' : '<i class="ix-d"></i>', snip(l.title, ql), esc(host(l.url)) + ' · ' + esc(l.where));
    }).join('');
    if (r.info.length) h += head('Info', 'info') + r.info.map(function (x) {
      var sub = x.text ? esc(x.text) + (x.body && x.body.toLowerCase().indexOf(ql) >= 0 ? ' — ' + snip(x.body, ql) : '') : (x.body ? snip(x.body, ql) : 'Tab');
      return row(infoHref(x, q), false, '<i class="ix-d" style="' + (/^#[0-9a-f]{3,8}$/i.test(x.color || '') ? 'background:' + x.color : '') + '"></i>', snip(x.title, ql), sub);
    }).join('');
    if (r.tasks.length) h += head('Tasks', 'tasks') + r.tasks.map(function (t) {
      var d = ''; try { d = new Date(t.due + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) {}
      var pr = ''; if (t.price != null) { try { pr = new Intl.NumberFormat(t.cur === 'INR' ? 'en-IN' : undefined, t.cur ? { style: 'currency', currency: t.cur, maximumFractionDigits: 2, minimumFractionDigits: 0 } : {}).format(t.price); } catch (e) { pr = String(t.price); } }
      var sub = [t.status === 'done' ? 'Done' : t.status === 'paused' ? 'Paused' : 'Due ' + d, t.cat, pr].filter(Boolean).map(esc).join(' · ');
      return row(ROOT + 'web/tasks/#task=' + encodeURIComponent(t.id), false, '<i class="ix-d"></i>', snip(t.name, ql), sub + (t.notes && t.notes.toLowerCase().indexOf(ql) >= 0 ? ' — ' + snip(t.notes, ql) : ''));
    }).join('');
    if (r.here.length) h += head('Unlocked on This Page', 'here') + r.here.map(function (x) {
      return row(x.href || '#', false, '<i class="ix-d"></i>', snip(x.title, ql), esc(x.where || '') + (x.text && x.text.toLowerCase().indexOf(ql) >= 0 ? ' — ' + snip(x.text, ql) : ''));
    }).join('');
    if (r.cards.length) h += head('Cards', 'cards') + r.cards.map(function (c) {
      return row(ROOT + 'web/cards/#q=' + encodeURIComponent(c.name || c.bank), false, '<i class="ix-d"></i>', snip([c.bank, c.name].filter(Boolean).join(' '), ql), esc([c.net, c.owner].filter(Boolean).join(' · ')));
    }).join('');
    if (r.files.length) h += head('Files', 'files') + r.files.map(function (f) {
      return row(ROOT + 'web/files/#q=' + encodeURIComponent(f.n), false, '<i class="ix-d"></i>', snip(f.n, ql), esc(f.d ? 'In ' + f.d : 'Files'));
    }).join('');
    if (r.pad.length) h += head('Scratch Pad', 'pad') + r.pad.map(function (line) { return row(ROOT + 'web/home/#pad', false, '<i class="ix-d"></i>', snip(line, ql), 'Home'); }).join('');
    if (r.settings.length) h += head('Settings', 'settings') + r.settings.map(function (x) {
      return row(ROOT + 'web/settings/#' + x[1], false, '<i class="ix-d"></i>', snip(x[0], ql), esc(x[3] || 'Settings'));
    }).join('');
    // the search words are escaped (esc) before they go into the markup
    if (p.scope === 'all' || p.scope === 'tools') h += '<div class="ix-rh">Tools</div>' + row(ROOT + 'web/tools/#/search/' + encodeURIComponent(q), false, '<i class="ix-d"></i>', 'Search Tools for “' + esc(q) + '”', 'Image, PDF and Utility Tools');   // nosemgrep: javascript.browser.security.raw-html-concat.raw-html-concat
    if (!n) h += '<div class="ix-none">No matches. Try “Everything” or fewer options.</div>';   // nosemgrep: javascript.browser.security.raw-html-concat.raw-html-concat
    return h;
  }

  /* One results list for both the bar's box and the full-screen search. */
  function makeSearch(input, panel, onPick) {
    var idx = -1, t = 0, token = 0, forceOpen = false;
    function items() { return panel.querySelectorAll('.ix-r'); }
    function mark(i) { var it = items(); if (!it.length) { input.removeAttribute('aria-activedescendant'); return; } idx = (i + it.length) % it.length; it.forEach(function (e, k) { e.setAttribute('aria-selected', String(k === idx)); }); it[idx].scrollIntoView({ block: 'nearest' }); input.setAttribute('aria-activedescendant', it[idx].id); }
    // (1.72.0) the box says what it controls; a screen reader hears how many results there are
    input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-controls', panel.id || ''); input.setAttribute('aria-expanded', 'false');
    new MutationObserver(function () { input.setAttribute('aria-expanded', String(!panel.hidden)); if (panel.hidden) input.removeAttribute('aria-activedescendant'); }).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
    function show() {
      var p = parseQuery(input.value), my = ++token;
      if (!p.q && !forceOpen) { panel.hidden = true; panel.innerHTML = ''; return; }
      loadSearchData().then(function () {
        if (my !== token) return;
        var rec = p.q ? [] : recentList();
        panel.innerHTML = filtersHtml() + (p.q ? resultsHtml(p) : rec.length ? '<div class="ix-rh">Recent Searches <button type="button" class="ix-reset ix-rclr" data-recent-clear>Clear</button></div>' +
            rec.map(function (x, i) { return '<a class="ix-r ix-rec" role="option" id="ix-r' + i + '" href="#" data-recent="' + esc(x) + '"><i class="ix-d"></i><span class="ix-rx"><b>' + esc(x) + '</b></span></a>'; }).join('')
          : '<div class="ix-none">Type to search links, notes, tasks, cards, files, settings and tools.</div>') +
          (p.q || !matchMedia('(hover:hover) and (pointer:fine)').matches ? '' : '<a class="ix-khint" href="#ix-keys"><kbd>?</kbd> Keyboard Shortcuts</a>');   // (1.65.1) so the list can be found
        panel.hidden = false; idx = -1; if (p.q) { mark(0); var nr = panel.querySelectorAll('a.ix-r').length; announce(nr ? nr + (nr === 1 ? ' result' : ' results') : 'No results'); }
        if (panel.id === 'ix-sres') placePanel(input, panel);
      });
    }
    panel._toggle = function () {   // the options button: open the filters even before anything is typed
      if (!panel.hidden && forceOpen) { forceOpen = false; if (!input.value.trim()) panel.hidden = true; return; }
      forceOpen = true; input.focus(); show();
    };
    input.addEventListener('focus', function () { loadSearchData(); if (input.value.trim()) show(); else if (recentList().length) { forceOpen = true; show(); } });   // (1.72.0) empty: the recent searches
    input.addEventListener('input', function () { clearTimeout(t); t = setTimeout(show, 60); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); mark(idx + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); mark(idx - 1); }
      else if (e.key === 'Enter') { var it = items()[idx]; if (it) { e.preventDefault(); it.click(); } }
      else if (e.key === 'Escape') { if (input.value) { input.value = ''; show(); } else { forceOpen = false; panel.hidden = true; input.blur(); onPick && onPick(true); } }
    });
    panel.addEventListener('mousedown', function (e) { if (!e.target.closest('select,input,label')) e.preventDefault(); });
    panel.addEventListener('change', function (e) { var f = e.target.getAttribute && e.target.getAttribute('data-sf'); if (!f) return; if (f === 'tab') { SF.tab = e.target.value; saveSF(); show(); } });
    panel.addEventListener('click', function (e) {
      var s = e.target.closest('[data-sf]');
      if (s && s.tagName === 'BUTTON') {
        var f = s.getAttribute('data-sf');
        if (f === 'scope') { SF.scope = s.getAttribute('data-v'); if (SF.tab && SF.scope !== 'all' && SF.tab.split(':')[0] !== SF.scope) SF.tab = ''; }
        else if (f === 'reset') SF = { scope: 'all', tab: '' };
        saveSF(); forceOpen = true; show(); input.focus(); return;
      }
      if (e.target.closest('[data-recent-clear]')) { e.preventDefault(); ls.set(RECENT_KEY, null); forceOpen = true; show(); input.focus(); return; }
      var rc = e.target.closest('a[data-recent]');
      if (rc) { e.preventDefault(); input.value = rc.getAttribute('data-recent'); forceOpen = true; show(); input.focus(); return; }
      var a = e.target.closest('a.ix-r, a.ix-khint'); if (!a) return;
      recentAdd(input.value);
      panel.hidden = true; forceOpen = false; onPick && onPick();
      if (a.getAttribute('href') === '#ix-keys') { e.preventDefault(); input.blur(); showKeys(); return; }
      if (a.href.indexOf('#hub-info=') >= 0 && a.href.split('#')[0] === location.href.split('#')[0]) {   // already on that page: no reload
        e.preventDefault(); location.hash = a.href.split('#')[1]; window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    });
  }
  function placePanel(input, panel) {
    var r = input.getBoundingClientRect(), w = Math.min(Math.max(r.width, 420), innerWidth - 16);
    panel.style.top = (r.bottom + 8) + 'px';
    panel.style.left = Math.max(8, Math.min(r.left, innerWidth - 8 - w)) + 'px';
    panel.style.width = w + 'px';
  }
  var sres;
  function bindInlineSearch() {
    var q = document.getElementById('ix-q'); if (!q) return;
    if (!sres) { sres = document.createElement('div'); sres.id = 'ix-sres'; sres.className = 'ix-panel'; sres.setAttribute('role', 'listbox'); sres.hidden = true; document.body.appendChild(sres); }
    makeSearch(q, sres);
    document.addEventListener('mousedown', function (e) { if (sres && !sres.hidden && !sres.contains(e.target) && !e.target.closest('#ix-sbox')) sres.hidden = true; });
  }
  /* full-screen search: the dock, phones, and the "/" shortcut when the bar has no search box */
  var spot;
  function openSpot() {
    if (!spot) {
      spot = document.createElement('div'); spot.id = 'ix-spot';
      spot.innerHTML = '<div class="ix-scrim" data-ix="spotx"></div><div class="ix-spotbox"><div class="ix-search">' + svg(ICON.search) +
        '<input type="search" id="ix-sq" placeholder="Search" autocomplete="off" spellcheck="false" aria-label="Search the Whole Site"><button type="button" class="ix-fbtn" data-ix="filters" aria-label="Search Options">' + svg(ICON.filter) + '</button></div>' +
        '<div class="ix-panel inline" id="ix-spres" role="listbox" hidden></div></div>';
      document.body.appendChild(spot);
      makeSearch(spot.querySelector('#ix-sq'), spot.querySelector('#ix-spres'), function () { spot.classList.remove('open'); });
    }
    spot.classList.add('open');
    var i = spot.querySelector('#ix-sq'); i.focus(); i.select();
  }
  function toggleFilters(btn) {
    var box = btn.closest('#ix-spot') ? spot.querySelector('#ix-spres') : sres;
    if (box && box._toggle) box._toggle();
  }
  function focusSearch() {
    var q = document.getElementById('ix-q');
    barHidden(false);
    if (q && q.offsetParent !== null) { q.focus(); q.select(); } else openSpot();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && spot && spot.classList.contains('open')) { spot.classList.remove('open'); return; }
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '') || (document.activeElement && document.activeElement.isContentEditable) || document.querySelector('dialog[open]') || (dlg && dlg.classList.contains('open'));
    if (typing || APP === 'cards' && e.key === '/') return;
    if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); e.stopPropagation(); focusSearch(); }
  }, true);

