/* ---------- visit counts (1.53) ----------
   Every click on a link counts on your server (also a visitor's, once per browser per link every 30 seconds); only you see
   the numbers. Links Settings > Show Visit Counts (on at first) only hides them. Links in encrypted tabs are never counted. */
const showVisits = () => S.auth && (S.data.settings || {}).visitCounts !== false;
const fmtVisits = n => n >= 10000 ? Math.round(n / 1000) + 'k' : n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n);
function visitBadge(url) {
  const n = (S.visits || {})[url] | 0;
  if (!showVisits() || !n) return null;
  return h('span', { class: 'vc', 'data-vu': url, title: `Opened ${n} time${n === 1 ? '' : 's'}`, 'aria-label': `${n} visit${n === 1 ? '' : 's'}` }, fmtVisits(n));
}
function countVisit(a) {
  const url = a.dataset.u; if (!url || S.editing) return;
  // a plain request (the link opens in a new tab, so this page stays): Firefox leaves the login cookie off keep-alive requests,
  // and the site's own fetch would retry, which counts as a second click
  fetch(`${API}?action=visit`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'bookmarks' }, body: JSON.stringify({ url }) })
    .then(r => r.json()).then(j => {
      if (!j || !j.counted || !S.auth || !j.count) return;
      S.visits[url] = j.count;
      document.querySelectorAll('a.main[data-u]').forEach((/** @type {HTMLElement} */ m) => {
        if (m.dataset.u !== url) return;
        const row = m.closest('.row'), old = row.querySelector('.vc'), b = visitBadge(url);
        if (old) old.remove(); if (b) { const c = row.querySelector('.ctrl'); c ? row.insertBefore(b, c) : row.append(b); }
      });
    }).catch(() => {});
}
// (1.72.0) Home's Recent Links: the last links you opened on this device (localStorage; never those of a locked tab; Log Out clears it)
function rememberOpen(/** @type {any} */ a) {
  try {
    const url = a.getAttribute('data-u') || a.href; if (!/^https?:/i.test(url)) return;
    if (S.data.tabs.some(t => t.encrypted && (t.categories || []).some(c => (c.links || []).some(l => l && l.url === url)))) return;
    const title = (a.textContent || '').trim().slice(0, 120) || url;
    const list = JSON.parse(localStorage.getItem('hub-recent-links') || '[]').filter((/** @type {any} */ x) => x && x.u !== url);
    list.unshift({ u: url, n: title, t: Date.now() }); localStorage.setItem('hub-recent-links', JSON.stringify(list.slice(0, 12)));
  } catch { /* storage blocked: nothing to remember */ }
}
document.addEventListener('click', e => { const tg = /** @type {Element} */ (e.target), a = tg.closest && tg.closest('.links a[data-u]'); if (a) { countVisit(a); rememberOpen(a); } });
document.addEventListener('auxclick', e => { if (e.button !== 1) return; const tg = /** @type {Element} */ (e.target), a = tg.closest && tg.closest('.links a[data-u]'); if (a) countVisit(a); });   // the middle button opens a new tab

function render() {
  if (drag && drag.started && !drag.allowRender) return; // redraw after the drop instead
  hideTip();
  renderTabs();
  const n = visibleCols();
  document.body.classList.toggle('editing', S.editing);
  document.body.classList.toggle('is-locked', S.locked);
  document.body.classList.toggle('searching', !!S.q);
  document.body.classList.toggle('can-drag', n === COLS && !S.q);
  $('#editBtn').classList.toggle('on', S.editing);
  const grid = $('#grid'); grid.innerHTML = '';
  if (S.locked || !S.data.tabs.length) {
    grid.append(h('div', { class: 'locked' },
      S.locked ? 'This page is private. Log in to see the bookmarks.' : 'There is nothing to show here yet.',
      S.auth ? null : h('button', { class: 'btn primary', type: 'button', onclick: () => $('#editBtn').click() }, S.setup ? 'Create password' : 'Log in')));
    return;
  }
  const q = S.q.toLowerCase(), cur = curTab(), multi = S.data.tabs.length > 1;
  const tabsShown = q ? S.data.tabs : [cur];
  if (!q && S.opening && cur.encrypted && (cur.locked || cur.bad)) { grid.append(h('div', { class: 'skel', role: 'status', 'aria-label': 'Loading' }, h('i'), h('i'), h('i'))); return; }   // the kept key is being opened
  if (!q && cur.encrypted && (cur.locked || cur.bad)) {   // an encrypted tab nobody has opened yet in this browser
    const what = vault() && vault().login ? 'website password' : 'encryption passphrase';
    grid.append(h('div', { class: 'gate' }, h('span', { class: 'lk', html: ICONS.safe }), h('h3', {}, 'Encrypted Tab'),
      h('p', {}, cur.bad ? `This tab couldn't be opened with the key this browser kept. Unlock it with your ${what}.` : `This tab is encrypted. Unlock it with your ${what} to view and edit it.`),
      h('button', { class: 'pill', type: 'button', onclick: () => ensureKey() }, 'Unlock')));
    return;
  }
  if (!q && cur.encrypted && !cur.locked) grid.append(h('div', { class: 'encbar' }, h('span', { class: 'lk', html: ICONS.safe }),
    h('span', {}, `Encrypted tab, unlocked on this device until you ${keepOn() ? '' : 'reload, '}log out or lock it.`), h('button', { type: 'button', onclick: lockNow }, 'Lock Now')));

  const board = h('div', { class: 'board', style: `--cols:${n}` });
  const cols = Array.from({ length: n }, (_, i) => h('div', { class: 'col', 'data-col': i }));
  // On narrower screens, data columns fold together: 2 visible -> (0,2) and (1,3); 1 visible -> all in order
  let shown = 0;
  // (1.64.11) A tab with many categories not drawn yet shows the top of each column at once and fills in the rest over the next frames.
  const fresh = !q && !(drag && drag.started), job = ++fillJob, perCol = new Map(), later = [];
  const quick = fresh && tabsShown.reduce((k, t) => k + t.categories.filter(c => !isDrawn(t, c, multi)).reduce((r, c) => r + catRows(c), 0), 0) > FIRST_ROWS * 2;
  for (let c = 0; c < COLS; c++) {
    const target = cols[n === COLS ? c : n === 2 ? c % 2 : 0];
    for (const t of tabsShown) for (const cat of t.categories.filter(x => x.col === c)) {
      if (drag && drag.started && drag.kind === 'cat' && cat === drag.cat) continue; // it's in the user's hand
      if (quick && (perCol.get(target) || 0) >= FIRST_ROWS) { later.push([target, t, cat]); continue; }
      const sec = fresh ? drawnCategory(t, cat, multi) : renderCategory(t, cat, q, multi);   // (1.64.10) reused when nothing in it changed
      if (sec) { target.append(sec); shown++; perCol.set(target, (perCol.get(target) || 0) + catRows(cat)); }
    }
  }
  if (later.length) fillLater(later, job, multi);
  if (n === COLS) cols.forEach((col, i) => col.append(h('button', { class: 'col-add', type: 'button', onclick: () => addCategory(i) }, 'Add category')));
  else cols[0].append(h('button', { class: 'col-add', type: 'button', onclick: () => addCategory(null) }, 'Add category'));
  board.append(...cols);

  if (q && !shown) grid.append(h('div', { class: 'nores' }, `Nothing matches "${S.q}". Press Esc to clear the search.`));
  if (!q && !cur.categories.length) grid.append(h('div', { class: 'nores first' },
    h('b', {}, S.editing ? 'This tab has no categories yet' : 'This tab is empty'),
    h('span', {}, S.editing ? 'Add one to any column below.' : 'Add a category, then your first links.'),
    S.auth && !S.editing ? h('button', { class: 'btn primary', type: 'button', onclick: () => { const t = /** @type {HTMLElement} */ (document.querySelector('[data-hub=toggle]')); if (t) t.click(); } }, 'Add Your First Links') : null));
  grid.append(board);
}
let lastCols = visibleCols();
addEventListener('resize', () => { const n = visibleCols(); if (n !== lastCols && !drag) { lastCols = n; render(); } });

