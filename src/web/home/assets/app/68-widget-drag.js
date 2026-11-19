/* ---------- (1.82.1) the page grid: put the clock and every widget where you like ----------
   The page has an invisible grid of 24 columns by 16 rows. Drag a card (or the clock by its handle) and it snaps to a cell; the grid shows
   while you drag. A widget with a place of its own is saved like any Widgets setting; the others keep the usual layout (Widgets > Layout).
   Alt + arrow keys move the focused card or clock handle by one cell. Under 900 px wide the usual layout is always used. */
const GRID_COLS = 24, GRID_ROWS = 16;
const freeOk = () => innerWidth >= 900;
let mv = /** @type {any} */ (null), justDragged = false;
const clampN = (/** @type {number} */ n, /** @type {number} */ lo, /** @type {number} */ hi) => Math.max(lo, Math.min(hi, n));
const cellFromRect = (/** @type {number} */ left, /** @type {number} */ top) => ({ x: clampN(Math.round(left / (innerWidth / GRID_COLS)), 0, GRID_COLS - 1), y: clampN(Math.round(top / (innerHeight / GRID_ROWS)), 0, GRID_ROWS - 1) });
const cellFromPoint = (/** @type {number} */ x, /** @type {number} */ y) => ({ x: clampN(Math.floor(x / (innerWidth / GRID_COLS)), 0, GRID_COLS - 1), y: clampN(Math.floor(y / (innerHeight / GRID_ROWS)), 0, GRID_ROWS - 1) });
async function savePlace(/** @type {(w: any) => void} */ change){
  const wasEditing = editing;
  try { if (!ADMIN) ADMIN = await api('admin_data'); } catch (err){ toast(err.message, true); return; }   // outside Edit the full settings are not loaded yet
  const before = JSON.stringify(ADMIN.widgets);
  ADMIN.widgets.pos = ADMIN.widgets.pos || { clock:null, cards:{} };
  change(ADMIN.widgets);
  if (JSON.stringify(ADMIN.widgets) !== before){
    try { await saveAll('Moved'); setWidgets(ADMIN.widgets); } catch (err){ ADMIN.widgets = JSON.parse(before); setWidgets(ADMIN.widgets); toast(err.message, true); }
  }
  if (!wasEditing) ADMIN = null;
}
function gridShow(/** @type {{x:number,y:number,w:number,h:number} | null} */ box){
  let g = document.getElementById('mvGrid');
  if (!g){ g = document.createElement('div'); g.id = 'mvGrid'; g.setAttribute('aria-hidden', 'true'); g.innerHTML = '<i></i>'; document.body.append(g); }
  g.hidden = !box; if (!box) return;
  const c = /** @type {HTMLElement} */ (g.firstElementChild);
  c.style.cssText = `left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px`;
}
function moveBegin(/** @type {PointerEvent} */ e, /** @type {HTMLElement} */ el, /** @type {string} */ kind, /** @type {string} */ id){
  const r = el.getBoundingClientRect();
  mv = { s:Number(getComputedStyle(el).getPropertyValue('--ws')) || 1, kind, id, el, sx:e.clientX, sy:e.clientY, ox:e.clientX - r.left, oy:e.clientY - r.top, w:r.width, h:r.height, started:false, cell:null, ghost:null, pid:e.pointerId };
}
function moveStart(){
  mv.started = true; document.body.classList.add('moving');
  if (mv.kind === 'card'){
    const g = /** @type {HTMLElement} */ (mv.el.cloneNode(true)); g.classList.add('wghost'); g.removeAttribute('data-w'); g.style.cssText = `position:fixed;left:${mv.el.getBoundingClientRect().left}px;top:${mv.el.getBoundingClientRect().top}px;width:${mv.w / mv.s}px;transform:scale(${mv.s});transform-origin:0 0;margin:0;z-index:11;pointer-events:none`;
    document.body.append(g); mv.ghost = g; mv.el.classList.add('wdim');
  }
}
function movePoint(/** @type {number} */ x, /** @type {number} */ y){
  if (mv.kind === 'card'){
    const left = clampN(x - mv.ox, 0, innerWidth - mv.w), top = clampN(y - mv.oy, 0, innerHeight - mv.h);
    mv.ghost.style.left = left + 'px'; mv.ghost.style.top = top + 'px';
    mv.cell = cellFromRect(left, top); gridShow({ x:mv.cell.x * innerWidth / GRID_COLS, y:mv.cell.y * innerHeight / GRID_ROWS, w:mv.w, h:mv.h });
  } else {
    mv.cell = cellFromPoint(x, y);
    gridShow({ x:(mv.cell.x + .5) * innerWidth / GRID_COLS - mv.w / 2, y:(mv.cell.y + .5) * innerHeight / GRID_ROWS - mv.h / 2, w:mv.w, h:mv.h });
  }
}
function moveEnd(/** @type {boolean} */ commit){
  if (!mv) return;
  const d = mv; mv = null;
  if (!d.started) return;
  d.ghost?.remove(); d.el.classList.remove('wdim'); document.body.classList.remove('moving'); gridShow(null);
  justDragged = true; setTimeout(() => { justDragged = false; }, 0);   // the click that ends a drag must not open the widget
  if (commit && d.cell) savePlace(w => { if (d.kind === 'clock') w.pos.clock = d.cell; else w.pos.cards[d.id] = Object.assign({}, d.cell, d.s && d.s !== 1 ? { s:d.s } : {}); });
}
document.addEventListener('pointerdown', e => {
  const t = /** @type {Element} */ (e.target); if (!WCFG || e.button || editing || !freeOk() || !t.closest) return;
  const grip = /** @type {HTMLElement | null} */ (t.closest('.pgrip')), card = /** @type {HTMLElement | null} */ (t.closest('.wcard[data-w]'));
  if (grip){ e.preventDefault(); moveBegin(e, /** @type {HTMLElement} */ (document.getElementById('clock')), 'clock', ''); moveStart(); movePoint(e.clientX, e.clientY); }
  else if (card) moveBegin(e, card, 'card', card.dataset.w || '');
  if (mv){ try { (grip || card)?.setPointerCapture(e.pointerId); } catch { /* the page still follows the pointer */ } }
});
document.addEventListener('pointermove', e => {
  if (!mv || e.pointerId !== mv.pid) return;
  if (!mv.started){ if (Math.hypot(e.clientX - mv.sx, e.clientY - mv.sy) < 7) return; moveStart(); }
  movePoint(e.clientX, e.clientY);
});
document.addEventListener('pointerup', () => moveEnd(true));
document.addEventListener('pointercancel', () => moveEnd(false));
document.addEventListener('click', e => { if (justDragged){ e.preventDefault(); e.stopImmediatePropagation(); } }, true);
document.addEventListener('keydown', e => {
  const t = /** @type {Element} */ (e.target);
  if (mv && mv.started && e.key === 'Escape'){ moveEnd(false); return; }
  if (!WCFG || editing || !freeOk() || !e.altKey || !e.key.startsWith('Arrow') || !t.closest) return;
  const grip = t.closest('.pgrip'), card = /** @type {HTMLElement | null} */ (t.closest('.wcard[data-w]'));
  if (!grip && !card) return;
  e.preventDefault();
  const id = card ? card.dataset.w || '' : '', pos = WCFG.pos || { clock:null, cards:{} };
  let cur = card ? pos.cards[id] : pos.clock;
  if (!cur){ const r = /** @type {HTMLElement} */ (card || document.getElementById('clock')).getBoundingClientRect(); cur = card ? cellFromRect(r.left, r.top) : cellFromPoint(r.left + r.width / 2, r.top + r.height / 2); }
  const dx = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0, dy = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
  const to = { x:clampN(cur.x + dx, 0, GRID_COLS - 1), y:clampN(cur.y + dy, 0, GRID_ROWS - 1) };
  savePlace(w => { if (card) w.pos.cards[id] = Object.assign({}, to, cur.s ? { s:cur.s } : {}); else w.pos.clock = to; }).then(() => { const sel = card ? `.wcard[data-w="${id}"]` : '.pgrip'; /** @type {HTMLElement | null} */ (document.querySelector(sel))?.focus(); });
});
// when the window crosses 900 px the usual layout (narrow) or the free places (wide) are drawn
let wasFree = freeOk();
addEventListener('resize', () => { const f = freeOk(); if (f !== wasFree){ wasFree = f; if (WCFG) renderWidgets(true); else renderClock(); } });

/* ---------- (1.82.1) resize: a card from 0.7 to 2 times, the clock from 0.5 to 2.5 times, in steps of 0.05 ---------- */
const SCALE_LIM = { card:[0.7, 2], clock:[0.5, 2.5] };
const snap05 = (/** @type {number} */ n, /** @type {number[]} */ lim) => clampN(Math.round(n / 0.05) * 0.05, lim[0], lim[1]);
let rz = /** @type {any} */ (null);
document.addEventListener('pointerdown', e => {
  const t = /** @type {Element} */ (e.target); if (!WCFG || e.button || editing || !freeOk() || !t.closest) return;
  const h = /** @type {HTMLElement | null} */ (t.closest('.wrs, .crs')); if (!h) return;
  e.preventDefault(); e.stopPropagation();
  const clock = h.classList.contains('crs'), box = /** @type {HTMLElement} */ (clock ? document.getElementById('clock') : h.closest('.wfc')), r = box.getBoundingClientRect();
  const s0 = clock ? Number(getComputedStyle(document.body).getPropertyValue('--cs')) || 1 : Number(getComputedStyle(box).getPropertyValue('--ws')) || 1;
  rz = { clock, box, id:h.dataset.w || '', s0, s:s0, pid:e.pointerId, ox:clock ? r.left + r.width / 2 : r.left, oy:clock ? r.top + r.height / 2 : r.top, d0:clock ? Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) : Math.max(8, e.clientX - r.left) };
  document.body.classList.add('moving'); try { h.setPointerCapture(e.pointerId); } catch { /* the page still follows the pointer */ }
}, true);
document.addEventListener('pointermove', e => {
  if (!rz || e.pointerId !== rz.pid) return;
  const d = rz.clock ? Math.hypot(e.clientX - rz.ox, e.clientY - rz.oy) : Math.max(8, e.clientX - rz.ox);
  rz.s = snap05(rz.s0 * d / Math.max(8, rz.d0), rz.clock ? SCALE_LIM.clock : SCALE_LIM.card);
  if (rz.clock){ document.body.classList.add('clock-free'); document.body.style.setProperty('--cs', String(rz.s)); } else rz.box.style.setProperty('--ws', String(rz.s));
});
function resizeEnd(/** @type {boolean} */ commit){
  if (!rz) return; const d = rz; rz = null; document.body.classList.remove('moving'); justDragged = true; setTimeout(() => { justDragged = false; }, 0);
  if (!commit || d.s === d.s0) { if (d.clock && !(WCFG && WCFG.pos && WCFG.pos.clock) && !PUB.clockCell) renderClock(); return; }
  scaleSave(d.clock, d.id, d.s);
}
let keySaveT = /** @type {any} */ (0);
function scaleSave(/** @type {boolean} */ clock, /** @type {string} */ id, /** @type {number} */ s){
  const sv = s === 1 ? undefined : s;
  return savePlace(w => {
    if (clock){ if (!w.pos.clock){ const r = /** @type {HTMLElement} */ (document.getElementById('clock')).getBoundingClientRect(); w.pos.clock = cellFromPoint(r.left + r.width / 2, r.top + r.height / 2); } w.pos.clockScale = s; }
    else if (w.pos.cards[id]){ const c = Object.assign({}, w.pos.cards[id]); if (sv) c.s = sv; else delete c.s; w.pos.cards[id] = c; }
  });
}
document.addEventListener('pointerup', () => resizeEnd(true));
document.addEventListener('pointercancel', () => resizeEnd(false));
document.addEventListener('keydown', e => {
  const t = /** @type {Element} */ (e.target);
  if (!WCFG || editing || !freeOk() || !e.altKey || !['+', '=', '-', '_'].includes(e.key) || !t.closest) return;
  const clock = !!t.closest('.pgrip, .crs'), card = /** @type {HTMLElement | null} */ (t.closest('.wfc'));
  if (!clock && !card) return;
  e.preventDefault();
  const cur = clock ? Number(getComputedStyle(document.body).getPropertyValue('--cs')) || 1 : Number(getComputedStyle(/** @type {HTMLElement} */ (card)).getPropertyValue('--ws')) || 1;
  const to = snap05(cur + (e.key === '-' || e.key === '_' ? -0.05 : 0.05), clock ? SCALE_LIM.clock : SCALE_LIM.card);
  if (to === cur) return;
  const id = card ? card.querySelector('.wcard')?.getAttribute('data-w') || '' : '';
  if (clock) document.body.style.setProperty('--cs', String(to)); else /** @type {HTMLElement} */ (card).style.setProperty('--ws', String(to));   // seen at once
  clearTimeout(keySaveT);   // saved once, a moment after the last key
  keySaveT = setTimeout(() => { scaleSave(clock, id, to).then(() => { /** @type {HTMLElement | null} */ (document.querySelector(clock ? '.pgrip' : `.wcard[data-w="${id}"]`))?.focus(); }); }, 350);
});
