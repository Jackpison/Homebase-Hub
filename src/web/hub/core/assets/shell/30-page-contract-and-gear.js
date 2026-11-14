  /* ---------- 3. page contract: the pencil menu is built from what each page marks ----------
     A page marks its own controls with data-hub="toggle | item | done | logout | hide" (see shell.css and README),
     so adding an option to a page never means touching this file. */
  var HAS_EDIT = APP !== 'settings';   // Settings has nothing to edit: no pencil there (1.53.5)
  /* options a page has no buttons for (Tools is a separate app): [label, icon, action] */
  var EXTRA = { tools: [{ label: 'Tools Settings', icon: ICON.gear, run: function () { location.hash = '#/settings'; } }] }[APP] || [];
  var q1 = function (kind) { return document.querySelector('[data-hub="' + kind + '"]'); };
  function hubItems() {
    return [].slice.call(document.querySelectorAll('[data-hub="item"]')).map(function (el, i) {
      return { el: el, label: el.getAttribute('data-hub-label') || el.textContent.trim(), group: el.getAttribute('data-hub-group') || '', order: +(el.getAttribute('data-hub-order') || 0), i: i,
               icon: ICON[el.getAttribute('data-hub-icon')] || '', sep: el.hasAttribute('data-hub-sep'), main: el.hasAttribute('data-hub-main') };
    }).sort(function (a, b) { return a.order - b.order || a.i - b.i; });
  }
  /* Menu entries for the page's items. Items sharing a data-hub-group fold into one entry ("Edit...", "Export...") that opens a short list. */
  function itemEntries(anchor, t, mainOnly) {
    var out = [], groups = {};
    hubItems().filter(function (it) { return !mainOnly || it.main; }).forEach(function (it) {
      var run = function () { if (t && !editing()) startEdit(it.label); else it.el.click(); };
      if (it.sep && !mainOnly) out.push({ sep: true });   // the two-item pencil menu has no lines
      if (!it.group) { out.push({ label: it.label, icon: it.icon, run: run }); return; }
      var g = groups[it.group];
      if (!g) {
        g = groups[it.group] = { label: it.group + '…', icon: it.icon, sub: [], run: function () { popMenu(anchor, [{ label: 'Back', icon: ICON.back, run: function () { backToMenu(anchor); } }, { sep: true }].concat(g.sub), { corner: anchor.getAttribute('data-ix') === 'corner' }); } };
        out.push(g);
      }
      g.sub.push({ label: it.label, icon: it.icon, run: run });
    });
    return out;
  }
  function backToMenu(anchor) { if (anchor.getAttribute('data-ix') === 'corner') cornerMenu(anchor); else editMenu(anchor); }
  var editing = function () { return !!(document.body && document.body.classList.contains('editing')); };
  function afterLogin(thenLabel) {   // logged-in pages load differently, so reload, then continue where the click left off
    try { sessionStorage.setItem('hub-after', 'edit'); if (thenLabel) sessionStorage.setItem('hub-then', thenLabel); } catch (x) {}
    location.reload();
  }
  /* Cards and Tasks have no edit mode of their own: there, editing only shows the edit bar */
  var ownEdit = function () { return !q1('toggle') && hubItems().some(function (it) { return !it.main; }); };
  var canEdit = function () { return !!q1('toggle') || ownEdit(); };
  function doneEdit() { var d = q1('done'); if (d) d.click(); else document.body.classList.remove('editing'); }
  function startEdit(thenLabel) {
    if (S.admin === undefined) return whenKnown(function () { if (S.admin !== undefined) startEdit(thenLabel); });
    var t = q1('toggle'); if (!canEdit()) return;
    if (!S.admin) { login().then(function () { afterLogin(thenLabel); }, function () {}); return; }
    if (!editing()) { if (t) t.click(); else document.body.classList.add('editing'); }
    if (thenLabel) setTimeout(function () { runItem(thenLabel); }, 450);
  }
  function runItem(label) { hubItems().some(function (it) { if (it.label === label) { it.el.click(); return true; } }); }
  /* (1.79.1) The gear menu: Edit This Page (or Done Editing), the page's own settings (data-hub-main), then Site Settings. Everything else is on the edit bar (3b). */
  function gearMenu(anchor) {
    whenKnown(function () {
      var items = [], t = q1('toggle');
      if (canEdit()) items.push(editing()
        ? { label: 'Done Editing', icon: ICON.check, accent: true, run: doneEdit }
        : { label: 'Edit This Page', icon: ICON.edit, tint: pageColor(APP), run: function () { startEdit(); } });
      itemEntries(anchor, t, true).forEach(function (x) { if (/ Settings$/.test(x.label) && PAGE_TILE[APP]) x.pageIcon = APP; items.push(x); });
      EXTRA.forEach(function (x) { items.push(x); });
      if (items.length) items.push({ sep: true });
      items.push({ label: 'Site Settings', icon: ICON.gear, run: function () { settings(); } });
      popMenu(anchor, items);
    });
  }
  /* The pencil menu: Edit This Page and the page's own Settings (data-hub-main). Everything else is on the edit bar (3b). */
  function editMenu(anchor) {
    var items = [], t = q1('toggle');
    if (canEdit()) items.push(editing()
      ? { label: 'Done Editing', icon: ICON.check, accent: true, run: doneEdit }
      : { label: 'Edit This Page', icon: ICON.edit, tint: pageColor(APP), run: function () { startEdit(); } });
    itemEntries(anchor, t, true).forEach(function (x) { if (/ Settings$/.test(x.label) && PAGE_TILE[APP]) x.pageIcon = APP; items.push(x); });   // (1.79.2) the page's own Settings wears the page's icon, like its tab in the bar
    EXTRA.forEach(function (x) { items.push(x); });
    if (!items.length) { toast('There is nothing to edit on this page.'); return; }
    popMenu(anchor, items);
  }


