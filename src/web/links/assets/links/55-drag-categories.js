/* ---------- drag categories between columns ---------- */
let drag = null;
function startDrag(e, t, cat, sec) {
  if (!S.editing || S.q || visibleCols() !== COLS) return;
  if (e.button !== 0 || e.target.closest('button,a,input')) return;
  e.preventDefault();
  const r = sec.getBoundingClientRect();
  drag = { kind: 'cat', t, cat, sec, dx: e.clientX - r.left, dy: e.clientY - r.top, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, started: false, w: r.width, hgt: r.height };
  addEventListener('pointermove', onDragMove);
  addEventListener('pointerup', endDrag);
  addEventListener('pointercancel', cancelDrag);
}
// Links (and dividers) drag the same way: to any category, in any tab.
// Mouse: grab the row anywhere. Touch: use the dotted handle, so the page still scrolls.
function startLinkDrag(e, t, cat, link, li) {
  if (!S.editing || S.q || drag) return;
  if (e.button !== 0 || e.target.closest('button,input,.extra')) return;
  if (e.pointerType !== 'mouse' && !e.target.closest('.lgrip')) return;
  e.preventDefault();
  const r = li.getBoundingClientRect();
  drag = { kind: 'link', t, from: cat, link, sec: li, dx: e.clientX - r.left, dy: e.clientY - r.top, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, started: false, w: r.width, hgt: r.height };
  addEventListener('pointermove', onDragMove);
  addEventListener('pointerup', endDrag);
  addEventListener('pointercancel', cancelDrag);
}
const placeAny = () => (drag.kind === 'link' ? placeLinkPlaceholder() : placePlaceholder());
function placeLinkPlaceholder() {
  const d = drag;
  let best = null, bestDist = Infinity;
  for (const c of document.querySelectorAll('.board .cat')) {
    const r = c.getBoundingClientRect();
    const dist = Math.max(0, r.left - d.x, d.x - r.right) * 3 + Math.max(0, r.top - d.y, d.y - r.bottom);
    if (dist < bestDist) { bestDist = dist; best = c; }
  }
  if (!best) return;
  const ul = best.querySelector('ul.links');
  let before = null;
  for (const row of ul.querySelectorAll(':scope > li[data-i]')) {
    const r = row.getBoundingClientRect();
    if (d.y < r.top + r.height / 2) { before = row; break; }
  }
  if (d.ph.parentElement !== ul || d.ph.nextElementSibling !== before) ul.insertBefore(d.ph, before);
}
function beginDrag() {
  const d = drag; d.started = true;
  d.ph = h(d.kind === 'link' ? 'li' : 'div', { class: 'placeholder', style: `height:${d.hgt}px` });
  d.ghost = d.sec.cloneNode(true); d.ghost.classList.add('ghost');
  Object.assign(d.ghost.style, { width: d.w + 'px' });
  d.sec.replaceWith(d.ph);
  document.body.append(d.ghost); document.body.classList.add('dragging');
  d.scroll = setInterval(autoScroll, 16);
}
function onDragMove(e) {
  const d = drag; if (!d) return;
  d.x = e.clientX; d.y = e.clientY;
  if (!d.started) { if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 6) return; beginDrag(); }
  d.ghost.style.left = (d.x - d.dx) + 'px'; d.ghost.style.top = (d.y - d.dy) + 'px';
  const under = document.elementFromPoint(d.x, d.y);
  const tabEl = under && under.closest('a.tab[data-tab]');
  setTabHover(tabEl);
  if (!tabEl) placeAny();
}
// Hovering a tab while dragging: highlight it, and open it after a short pause
function setTabHover(tabEl) {
  const d = drag;
  if (tabEl === d.hoverTab) return;
  if (d.hoverTab) d.hoverTab.classList.remove('drop-target');
  clearTimeout(d.hoverTimer);
  d.hoverTab = tabEl || null;
  if (!tabEl) return;
  tabEl.classList.add('drop-target');
  const id = tabEl.dataset.tab;
  if (id !== curTab().id) d.hoverTimer = setTimeout(() => {
    if (drag !== d) return;
    S.tab = id; history.replaceState(null, '', '#' + id);
    d.allowRender = true; render(); d.allowRender = false;
    d.hoverTab = null; // tabs were redrawn
    setTabHover(document.querySelector(`a.tab[data-tab="${CSS.escape(id)}"]`));
    placeAny();
  }, 450);
}
function placePlaceholder() {
  const d = drag, cols = [...document.querySelectorAll('.board .col')];
  let best = cols[0], bestDist = Infinity;
  for (const c of cols) {
    const r = c.getBoundingClientRect();
    const dist = d.x < r.left ? r.left - d.x : d.x > r.right ? d.x - r.right : 0;
    if (dist < bestDist) { bestDist = dist; best = c; }
  }
  const cats = [...best.querySelectorAll(':scope > .cat')];
  let before = best.querySelector(':scope > .col-add');
  for (const c of cats) { const r = c.getBoundingClientRect(); if (d.y < r.top + r.height / 2) { before = c; break; } }
  if (d.ph.nextElementSibling !== before || d.ph.parentElement !== best) best.insertBefore(d.ph, before);
}
function autoScroll() {
  const d = drag; if (!d) return;
  const edge = 70;
  let dy = 0;
  if (d.y < edge) dy = -Math.ceil((edge - d.y) / 4);
  else if (d.y > innerHeight - edge) dy = Math.ceil((d.y - innerHeight + edge) / 4);
  if (dy) { scrollBy(0, dy); if (!drag.hoverTab) placeAny(); }
}
function cleanupDrag() {
  removeEventListener('pointermove', onDragMove);
  removeEventListener('pointerup', endDrag);
  removeEventListener('pointercancel', cancelDrag);
  if (drag && drag.started) {
    clearInterval(drag.scroll); clearTimeout(drag.hoverTimer); drag.ghost.remove(); document.body.classList.remove('dragging');
    if (drag.hoverTab) drag.hoverTab.classList.remove('drop-target');
  }
}
function endDrag() {
  const d = drag; cleanupDrag(); drag = null;
  if (!d || !d.started) return;
  if (d.kind === 'link') return dropLink(d);
  const sig = t => t.categories.map(c => c.id + ':' + c.col).join();
  const before = sig(d.t);
  let target = curTab(), col, beforeId = null;
  const droppedOnTab = d.hoverTab && S.data.tabs.find(t => t.id === d.hoverTab.dataset.tab);
  if (droppedOnTab) {
    // dropped straight onto a ribbon: same column, at the bottom of that tab
    target = droppedOnTab; col = d.cat.col;
    if (target === d.t) { render(); return; }
  } else {
    col = +d.ph.parentElement.dataset.col;
    const next = d.ph.nextElementSibling;
    beforeId = next && next.classList.contains('cat') ? next.dataset.id : null;
  }
  if (target !== d.t) d.t.categories.splice(d.t.categories.indexOf(d.cat), 1);
  placeInCol(target, d.cat, col, beforeId);
  if (target !== d.t) {
    S.tab = target.id; history.replaceState(null, '', '#' + target.id);
    persist(`Moved to ${target.title}`);
  } else if (before === sig(d.t)) render();
  else persist('Moved');
}
function cancelDrag() { cleanupDrag(); drag = null; render(); }
// A drag that started on a link must not also open it
function swallowClick() {
  const f = e => { e.preventDefault(); e.stopPropagation(); };
  addEventListener('click', f, true);
  setTimeout(() => removeEventListener('click', f, true), 0);
}
function dropLink(d) {
  swallowClick();
  let target, idx;
  const onTab = d.hoverTab && S.data.tabs.find(t => t.id === d.hoverTab.dataset.tab);
  if (onTab) {
    // dropped on a ribbon: bottom of that tab's first category
    if (onTab === d.t) { render(); return; }
    target = [...onTab.categories].sort((a, b) => a.col - b.col)[0];
    if (!target) { toast(`${onTab.title} has no categories yet. Add one first.`, true); render(); return; }
    idx = target.links.length;
  } else {
    const ul = d.ph.parentElement;
    target = ul && allCats().find(c => c.id === ul.dataset.cat);
    if (!target) { render(); return; }
    let n = d.ph.nextElementSibling;
    while (n && !n.dataset.i) n = n.nextElementSibling;
    idx = n ? +n.dataset.i : target.links.length;
  }
  const from = d.from, si = from.links.indexOf(d.link);
  if (si < 0) { render(); return; }
  if (target === from) { if (idx > si) idx--; if (idx === si) { render(); return; } }
  from.links.splice(si, 1);
  target.links.splice(idx, 0, d.link);
  const tTab = S.data.tabs.find(t => t.categories.includes(target));
  if (tTab && tTab.id !== S.tab) { S.tab = tTab.id; history.replaceState(null, '', '#' + tTab.id); }
  persist(target === from ? 'Moved' : `Moved to ${target.title}`);
}
// stop the browser's own link/image dragging while editing
document.addEventListener('dragstart', e => { if (S.editing) e.preventDefault(); });

