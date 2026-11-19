  /* ---------- (1.82.1) First-use tips: one small note per visit, next to the thing it explains, for the person who runs the site.
     "Got It" remembers it on this device; "Skip Tips" turns them all off. Features in Settings brings them back (all, or one page's).
     Browsers driven by a script (navigator.webdriver) never get tips, so tests and screenshots stay clean. ---------- */
  var TIPS = [
    { id: 'search', page: '*', sel: '#ix-bar [data-ix="search"]', title: 'Search Everything', text: 'Press / or Ctrl + K on any page to search Links, Info, Tasks and Tools at once.' },
    { id: 'edit', page: '*', sel: '#ix-bar [data-ix="edit"]', title: 'Edit This Page', text: 'Press the pencil to change this page. Its own tools appear in a bar at the bottom.' },
    { id: 'theme', page: '*', sel: '#ix-bar [data-ix="theme"]', title: 'Light or Dark', text: 'Switch between Light and Dark here. Settings, Appearance holds colours, glass and sizes.' },
    { id: 'home-place', page: 'home', sel: '#wFree .wcard, #wCards .wcard, #clock', title: 'Put Widgets Anywhere', text: 'On a computer, drag a card to any place on the page, drag the little corner to resize it, and drag the clock by its handle. Alt with an arrow key moves it a step.' },
    { id: 'home-edit', page: 'home', sel: '#editBtn, #ix-bar [data-ix="edit"]', title: 'Press E to Edit', text: 'The E key opens Edit on Home: widgets, background and the look of the cards.' },
    { id: 'links-tabs', page: 'links', sel: '#tabs', title: 'Tabs and Categories', text: 'Links live in tabs. Open the pencil menu to add tabs, import bookmarks, fetch icons and change colours.' },
    { id: 'backup', page: '*', sel: '#ix-bar [data-ix="backup"]', title: 'Backup and Import', text: 'Make a copy of your whole site here, or bring in bookmarks and files from elsewhere. A copy is also kept just before every update, so Go Back works.' },
    { id: 'menu', page: '*', sel: '#ix-bar [data-ix="menu"], #ix-bar [data-ix="sheet"]', title: 'Settings and Help', text: 'Settings, Features, Health and Logs live here. Features shows what each page can do, and brings these tips back.' },
    { id: 'filters', page: '*', sel: '#ix-bar [data-ix="filters"]', title: 'Search Options', text: 'Choose where the search looks, so Links, Info, Tasks and Tools do not all answer at once.' },
    { id: 'home-widgets', page: 'home', sel: '#wFree .wcard, #wCards .wcard, #wDock .wdb', title: 'Open a Widget', text: 'Click a card to open its panel: tasks, calendar, a note, recent tools and more. Edit, then Widgets, chooses which show and how they look.' },
    { id: 'home-bg', page: 'home', sel: '#nextBg', title: 'A New Background', text: 'Press this for the next photo. Each photo keeps its credit in the corner. On a phone, pull down from the top.' },
    { id: 'home-layouts', page: 'home', sel: '#clock', title: 'Save a Layout', text: 'Once you like where things sit, Edit, Widgets, Saved Layouts keeps it under a name, like Work, so you can switch back and forth.' },
    { id: 'links-search', page: 'links', sel: '#q', title: 'Find a Link Fast', text: 'Type to filter every tab at once. Press Esc to clear. Links you open most show above the page as Most Used.' },
    { id: 'links-private', page: 'links', sel: '#tabs', title: 'Locked Tabs', text: 'A tab can be encrypted with your own passphrase. The key is made in your browser and never reaches the server.' },
    { id: 'info-search', page: 'info', sel: '#q', title: 'Search Your Notes', text: 'The search reads the text inside your notes, not only their titles.' },
    { id: 'info-tabs', page: 'info', sel: '#tabs', title: 'Tabs Hold Notes', text: 'Each tab holds one to twelve boxes, or one long document with an outline. Closed tabs can be brought back.' },
    { id: 'cards-filter', page: 'cards', sel: '#fq, #filters', title: 'Filter Your Cards', text: 'Type to filter, or use the buttons to show only some kinds. Cards can be locked with a password.' },
    { id: 'cards-lock', page: 'cards', sel: '#lockBtn', title: 'Lock Your Cards', text: 'Lock Cards with its own password. Locked data is handled in your browser only.' },
    { id: 'tasks-add', page: 'tasks', sel: '#qadd, #add', title: 'Add a Task Quickly', text: 'Type a task and press Enter. Plain words like "tomorrow" or "friday" set the date for you.' },
    { id: 'tasks-views', page: 'tasks', sel: '#views', title: 'List, Calendar and More', text: 'Switch between the list, the calendar and the charts. You can export as CSV or a calendar file.' },
    { id: 'files-up', page: 'files', sel: '#ix-bar [data-ix="edit"], #app, main', title: 'Your Files, Your Server', text: 'Upload by dragging files onto the page. A file can be shared with a link, and locked shares are encrypted in your browser.' },
    { id: 'tools-search', page: 'tools', sel: '#root', title: 'Tools That Run Here', text: 'Everything in Tools runs in your browser. Nothing you type or drop in is sent anywhere. Press / to search them.' },
    { id: 'info-boxes', page: 'info', sel: '#ix-bar [data-ix="edit"]', title: 'Boxes You Can Arrange', text: 'Each tab holds up to 12 boxes. Edit the page to size and place them, or write the tab as one document.' }
  ];
  var tipState = function () { var s = null; try { s = JSON.parse(ls.get('ix-tips') || 'null'); } catch (e) { s = null; } return s && Array.isArray(s.seen) ? s : { seen: [], off: 0 }; };
  var tipSave = function (s) { ls.set('ix-tips', JSON.stringify(s)); };
  var tipsApi = {
    pages: ['home', 'links', 'info', 'cards', 'tasks', 'files', 'tools'],
    isOff: function () { return !!tipState().off; },
    setOff: function (v) { var s = tipState(); s.off = v ? 1 : 0; tipSave(s); },
    reset: function (page) { var s = tipState(); s.off = 0; s.seen = page ? s.seen.filter(function (id) { return !TIPS.some(function (t) { return t.id === id && (t.page === page || t.page === '*'); }); }) : []; tipSave(s); },
    has: function (page) { return TIPS.some(function (t) { return t.page === page; }); }
  };
  function firstTipHide(mark) {
    var el = document.getElementById('ix-ftip'); if (!el) return;
    if (mark) { var s = tipState(); if (s.seen.indexOf(el.dataset.tip) < 0) s.seen.push(el.dataset.tip); tipSave(s); }
    el.remove();
  }
  function firstTipShow() {
    if (!S.admin || navigator.webdriver || tipState().off || document.getElementById('ix-ftip') || document.querySelector('dialog[open], body.editing')) return;
    var seen = tipState().seen, pick = null, target = null;
    TIPS.some(function (t) {
      if ((t.page !== '*' && t.page !== APP) || seen.indexOf(t.id) >= 0) return false;
      var e = Array.prototype.slice.call(document.querySelectorAll(t.sel)).filter(function (x) { var r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0; })[0];
      if (!e) return false; pick = t; target = e; return true;
    });
    if (!pick) return;
    var el = document.createElement('div'); el.id = 'ix-ftip'; el.dataset.tip = pick.id; el.setAttribute('role', 'status');
    el.innerHTML = '<b></b><p></p><div class="ix-ftip-a"><button type="button" class="ix-btn pri" data-ix-tip="ok">Got It</button><button type="button" class="ix-btn" data-ix-tip="off">Skip Tips</button></div>';
    el.querySelector('b').textContent = pick.title; el.querySelector('p').textContent = pick.text;
    el.addEventListener('click', function (e) { var b = e.target.closest ? e.target.closest('[data-ix-tip]') : null; if (!b) return; if (b.dataset.ixTip === 'off') tipsApi.setOff(true); firstTipHide(true); });
    document.body.appendChild(el);
    var r = target.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight, below = r.bottom + 12 + h < innerHeight;
    var lx = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2));
    el.style.left = lx + 'px'; el.style.setProperty('--ix-ax', Math.round(Math.max(22, Math.min(w - 22, r.left + r.width / 2 - lx))) + 'px'); el.className = below ? 'below' : 'above';   // the pointer shows which thing it explains
    el.style.top = Math.max(8, below ? r.bottom + 12 : r.top - 12 - h) + 'px';
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.getElementById('ix-ftip')) firstTipHide(true); });
  setTimeout(firstTipShow, 2600);
  document.addEventListener('hub:login', function () { setTimeout(firstTipShow, 1500); });
