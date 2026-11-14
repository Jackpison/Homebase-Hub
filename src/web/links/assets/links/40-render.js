/* ---------- render ---------- */
function visibleCols() { return innerWidth >= 1100 ? 4 : innerWidth >= 700 ? 2 : 1; }

// The tabs: one wrapper per tab (the tab and its pencil, shown while editing). Drag a tab to move it (tabs.js); Alt + Left/Right does the same from the keyboard.
const tabDrag = HubTabs.drag($('#tabs'), { enabled: () => S.editing, onDrop(order, focusId) {
  const by = new Map(S.data.tabs.map(x => [x.id, x]));
  S.data.tabs.splice(0, S.data.tabs.length, ...order.map(id => by.get(id)).filter(Boolean));
  persist('Moved'); if (focusId) { const a = /** @type {HTMLElement | null} */ (document.querySelector(`#tabs .tab[data-tab="${CSS.escape(focusId)}"]`)); if (a) a.focus(); }
} });
$('#tabs').addEventListener('dragstart', e => { if (S.editing) e.preventDefault(); });   // a tab is a link: the browser must not drag it as one
// The icon of a tab: the one chosen for it (Edit Tab), else the ribbon.
const tabIcon = t => HubTabs.isIcon(t.icon) ? h('span', { 'aria-hidden': 'true', html: HubTabs.iconSvg(t.icon) }).firstChild : ribbon();
function renderTabs() {
  const wrap = $('#tabs'); wrap.innerHTML = '';
  const tabs = S.data.tabs, cur = curTab();
  tabs.forEach(t => {
    const active = t === cur && !S.q;
    wrap.append(h('div', { class: 'tabi' + (active ? ' on' : ''), 'data-t': t.id, role: 'none' },
      h('a', { class: 'tab' + (active ? ' active' : ''), href: '#' + encodeURIComponent(t.id), 'data-tab': t.id, role: 'tab', style: isHex(t.ribbon) ? `--tab-ribbon:${t.ribbon}` : null, 'aria-selected': active ? 'true' : 'false',
        onclick: e => { if (tabDrag.justDragged()) { e.preventDefault(); return; } if (S.editing && active) { e.preventDefault(); editTab(t); return; } if (S.q) { $('#q').value = ''; S.q = ''; } } }, tabIcon(t), h('span', {}, t.title),
        h('span', { class: 'tslot', 'aria-label': t.private ? (t.encrypted ? 'encrypted' : 'private') : null, title: t.private ? (t.encrypted ? 'Encrypted: locked with your passphrase' : 'Private: visible only when logged in') : null, html: t.private ? (t.encrypted ? ICONS.safe : ICONS.lock) : '' })),
      h('button', { class: 'pen', type: 'button', title: 'Edit Tab', 'aria-label': 'Edit tab ' + t.title, html: ICONS.edit, onclick: () => { if (!tabDrag.justDragged()) editTab(t); } })));
  });
  if (S.editing) wrap.append(h('button', { class: 'tab add', type: 'button', onclick: addTab, title: tabs.length >= MAX_TABS ? `You can have up to ${MAX_TABS} tabs` : 'New tab' }, ribbon(true), 'New tab'));   // (1.79.3) still there at the limit: it says why instead of vanishing
  const act = wrap.querySelector('.tab.active');
  if (act && wrap.scrollWidth > wrap.clientWidth) act.scrollIntoView({ block: 'nearest', inline: 'center' });
}
function addTab() {
  if (S.data.tabs.length >= MAX_TABS) return toast(`You can have up to ${MAX_TABS} tabs`, true);
  editTab(null);
}
// New Tab and Edit Tab: the window itself is shared with Info (tabs.js); what saving does is Links' own.
function editTab(t) {
  const stuck = !!(t && t.encrypted && (t.locked || t.bad));   // a locked tab can only be turned back to plain text after unlocking it
  const noKey = !vault() && !(t && t.encrypted);   // keys are made in Settings › Security › Encryption
  HubTabs.edit({
    isNew: !t, title: t ? 'Edit Tab' : 'New Tab', saveLabel: t ? 'Save Tab' : 'Add Tab', name: t ? t.title : '',
    color: t && isHex(t.ribbon) ? t.ribbon : '', colorShown: colorsFor(mode()).ribbon, colorLabel: 'Ribbon Color', colorHint: 'Default uses the ribbon color from Colors.',
    icon: t && t.icon, iconDefault: 'bookmark', priv: !!(t && t.private), enc: !!(t && t.encrypted),
    encWhy: !CAN_ENC ? 'Needs a secure (https) connection.' : noKey ? 'Set an encryption passphrase first: Settings › Security › Encryption.' : stuck ? 'Unlock this tab first to change this.' : '',
    canDelete: !!t && S.data.tabs.length > 1,
    async onSave(v, ctl) {
      const wantEnc = v.enc, wasEnc = !!(t && t.encrypted);
      if (wantEnc && !wasEnc && !(await ensureKey())) { ctl.say('Encryption was not turned on.'); return; }
      if (!wantEnc && wasEnc && !confirm('Store this tab as readable text again? Its links will no longer be encrypted on the server.')) return;
      let tab = t;
      if (!tab) {
        if (S.data.tabs.length >= MAX_TABS) { ctl.say(`You can have up to ${MAX_TABS} tabs.`); return; }
        tab = { id: uid(), title: v.name, categories: [] };
        S.data.tabs.push(tab); S.tab = tab.id; history.replaceState(null, '', '#' + tab.id);
      }
      tab.title = v.name;
      if (v.color) tab.ribbon = v.color; else delete tab.ribbon;
      if (v.icon) tab.icon = v.icon; else delete tab.icon;
      if (wantEnc) { tab.encrypted = true; tab.private = true; if (!wasEnc) { tab._blob = ''; tab._plain = ''; tab.locked = false; tab.bad = false; } }
      else {
        if (wasEnc) { delete tab.encrypted; delete tab._blob; delete tab._plain; delete tab.locked; delete tab.bad; }
        if (v.priv) tab.private = true; else delete tab.private;
      }
      ctl.close();
      persist((t ? 'Tab saved: ' : 'Tab added: ') + tab.title);
    },
    onDelete(ctl) {
      const tabs = S.data.tabs, ti = tabs.indexOf(t);   // (1.65.0) the Delete Tab button is held to confirm
      const gone = tabs.splice(ti, 1)[0]; S.tab = tabs[Math.max(0, ti - 1)].id; history.replaceState(null, '', '#' + S.tab); ctl.close(); persist('');
      undoable('Tab deleted: ' + gone.title, () => { tabs.splice(Math.min(ti, tabs.length), 0, gone); S.tab = gone.id; history.replaceState(null, '', '#' + S.tab); persist('Tab restored'); });
    }
  });
}
async function addCategory(col) {
  const t = curTab();
  const n = await askName(`Add category to ${t.title}`, '', 'Add category'); if (!n) return;
  t.categories.push({ id: uid(), title: n, links: [], col: col == null ? shortestCol(t) : col });
  persist('Category added: ' + n);
}

/* (1.64.10) A category's drawn section is kept and used again while nothing it shows has changed: its links (and which objects they are, since
   its buttons act on them), its place in the columns, edit mode, Icons from Google, visit counts and the tab's lock. Switching back to a tab then
   draws nothing, and moving or editing one link redraws only its own category. Search results and a drag in progress are always drawn fresh. */
const drawnCats = new WeakMap(), objIds = new WeakMap(); let nextObjId = 1;
const oid = o => { let v = objIds.get(o); if (!v) { v = nextObjId++; objIds.set(o, v); } return v; };
function catSig(t, cat, multi) {
  const same = t.categories.filter(c => c.col === cat.col), vis = S.visits || {};
  return [oid(t), oid(cat), t.categories.indexOf(cat), same.indexOf(cat), same.length, t.encrypted ? 1 : 0, S.editing ? 1 : 0, multi ? 1 : 0,
    showVisits() ? 1 : 0, webIcons() ? 1 : 0, cat.links.map(oid).join(','), cat.links.map(l => vis[l.url] | 0).join(','), JSON.stringify(cat)].join('\u0001');
}
const FIRST_ROWS = 24;   // (1.67.1) about one screen of rows in each column (it was 3 categories, which could be hundreds of links)
const catRows = c => c.links.length + 2;   // its links and its heading
let fillJob = 0;
function isDrawn(t, cat, multi) { const hit = drawnCats.get(cat); return !!hit && hit.sig === catSig(t, cat, multi); }
// Draws the rest of a tab a few categories at a time (about 12 ms of work per frame), in order, before each column's Add Category button.
// A newer drawing of the page (another tab, an edit) stops it: its board is gone.
function fillLater(list, job, multi) {
  const step = () => {
    if (job !== fillJob) return;
    const t0 = performance.now();
    while (list.length && performance.now() - t0 < 12) { const [col, t, cat] = list.shift(); col.insertBefore(drawnCategory(t, cat, multi), col.querySelector(':scope > .col-add')); }
    if (list.length) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function drawnCategory(t, cat, multi) {
  const sig = catSig(t, cat, multi), hit = drawnCats.get(cat);
  if (hit && hit.sig === sig) return hit.sec;
  const sec = renderCategory(t, cat, '', multi); drawnCats.set(cat, { sig, sec }); return sec;
}
function renderCategory(t, cat, q, multi) {
  const ci = t.categories.indexOf(cat);
  let items = cat.links.map((l, i) => ({ l, i }));
  if (q) items = items.filter(({ l }) => !l.divider && ((l.title || '').toLowerCase().includes(q) || (l.url || '').toLowerCase().includes(q)
    || (l.extra || []).some(x => (x.title || '').toLowerCase().includes(q))));
  if (q && !items.length) return null;
  const count = linkCount(cat);
  const same = t.categories.filter(c => c.col === cat.col), pos = same.indexOf(cat);

  const E = S.editing;   // (1.64.11) the edit controls (hidden unless editing) are only built while editing: most of the work of drawing a tab
  const head = h('div', { class: 'cat-head' },
    E ? h('span', { class: 'grip', html: ICONS.grip, 'aria-hidden': 'true' }) : null,
    h('h2', {}, q && multi ? h('span', { class: 'from' }, t.title + ' / ') : null, cat.title),
    h('span', { class: 'count' }, String(count)),
    !E ? null : h('div', { class: 'ctrl' },
      ib('left', 'Move to column on the left', () => { placeInCol(t, cat, cat.col - 1); persist('Moved'); }, '', cat.col === 0),
      ib('right', 'Move to column on the right', () => { placeInCol(t, cat, cat.col + 1); persist('Moved'); }, '', cat.col === COLS - 1),
      ib('up', 'Move up', () => moveWithinCol(t, cat, -1) && persist('Moved'), '', pos === 0),
      ib('down', 'Move Down', () => moveWithinCol(t, cat, 1) && persist('Moved'), '', pos === same.length - 1),
      ib('edit', 'Rename category', async () => { const n = await askName('Rename category', cat.title, 'Save category'); if (n) { cat.title = n; persist('Category renamed'); } }),
      ib('del', 'Delete category', () => {
        { /* (1.65.0) held to confirm */ t.categories.splice(ci, 1); persist(''); undoable('Category deleted: ' + cat.title, () => { t.categories.splice(Math.min(ci, t.categories.length), 0, cat); persist('Category restored'); }); }
      }, 'del')));

  const ul = h('ul', { class: 'links', 'data-cat': cat.id });
  const dragHandle = () => E ? h('span', { class: 'lgrip', html: ICONS.lgrip, 'aria-hidden': 'true' }) : null;
  for (const { l, i } of items) {
    if (drag && drag.started && drag.kind === 'link' && l === drag.link) continue; // in the user's hand
    let li;
    if (l.divider) {
      ul.append(li = h('li', { class: 'divider-row', 'data-i': i }, dragHandle(), h('div', { class: 'divider', role: 'separator' }),
        !E ? null : h('div', { class: 'ctrl' },
          ib('up', 'Move divider up', () => move(cat.links, i, -1) && persist('Moved')),
          ib('down', 'Move divider down', () => move(cat.links, i, 1) && persist('Moved')),
          ib('del', 'Remove divider', () => { cat.links.splice(i, 1); persist('Divider removed'); }, 'del'))));
      if (E) li.addEventListener('pointerdown', e => startLinkDrag(e, t, cat, l, li));
      continue;
    }
    ul.append(li = h('li', { class: 'row', 'data-i': i }, dragHandle(),
      h('a', { class: 'main', href: safeUrl(l.url), target: '_blank', rel: 'noopener noreferrer', title: l.url, 'data-u': t.encrypted ? null : l.url },
        linkIcon(l, t.encrypted), h('span', { class: 't' }, l.title)),
      (l.extra || []).map(x => h('a', { class: 'extra', href: safeUrl(x.url), target: '_blank', rel: 'noopener noreferrer', title: x.url, 'data-u': t.encrypted ? null : x.url }, x.title)),
      t.encrypted ? null : visitBadge(l.url),   // at the end of the row, so the numbers line up (1.53.8)
      !E ? null : h('div', { class: 'ctrl' },
        ib('up', 'Move up', () => move(cat.links, i, -1) && persist('Moved')),
        ib('down', 'Move Down', () => move(cat.links, i, 1) && persist('Moved')),
        ib('edit', 'Edit link', () => openLink(cat, i)),
        ib('del', 'Delete link', () => { { /* (1.65.0) held to confirm */ cat.links.splice(i, 1); persist(''); undoable('Link deleted: ' + (l.title || l.url), () => { cat.links.splice(Math.min(i, cat.links.length), 0, l); persist('Link restored'); }); } }, 'del'))));
    if (E) li.addEventListener('pointerdown', e => startLinkDrag(e, t, cat, l, li));
  }
  if (!cat.links.length) ul.append(h('li', { class: 'empty-cat' }, S.editing ? 'No links yet. Add one below.' : 'No links yet.'));

  const sec = h('section', { class: 'cat', 'data-id': cat.id, style: `--cat:var(--c${cat.col})` }, head, ul,
    q || !E ? null : h('div', { class: 'cat-add' },
      h('button', { class: 'btn', type: 'button', onclick: () => openLink(cat, -1) }, 'Add link'),
      h('button', { class: 'btn', type: 'button', onclick: () => { cat.links.push({ divider: true }); persist('Divider added'); } }, 'Add divider')));
  head.addEventListener('pointerdown', e => startDrag(e, t, cat, sec));
  return sec;
}

