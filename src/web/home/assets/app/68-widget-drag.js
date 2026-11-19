/* ---------- (1.82.1) the page grid: put the clock and every widget where you like ----------
   The page has an invisible grid of 24 columns by 16 rows. Drag a card (or the clock by its handle) and it snaps to a cell; the grid shows
   while you drag. A widget with a place of its own is saved like any Widgets setting; the others keep the usual layout (Widgets > Layout).
   Alt + arrow keys move the focused card or clock handle by one cell. Under 900 px wide the usual layout is always used. */
const GRID_COLS = 24, GRID_ROWS = 16;
const freeOk = () => innerWidth >= 900;
let mv = /** @type {any} */ (null), justDragged = false, kb = false;   // kb: Move mode from the keyboard
function say(/** @type {string} */ msg){
  let l = document.getElementById('wLive');
  if (!l){ l = document.createElement('div'); l.id = 'wLive'; l.className = 'sr'; l.setAttribute('role', 'status'); document.body.append(l); }
  l.textContent = ''; setTimeout(() => { l.textContent = msg; }, 30);
}
document.addEventListener('focusin', e => { if (kb && !(/** @type {Element} */ (e.target)).closest('.pgrip, .crs, .wcard[data-w]')) kb = false; });
const clampN = (/** @type {number} */ n, /** @type {number} */ lo, /** @type {number} */ hi) => Math.max(lo, Math.min(hi, n));
const cellFromRect = (/** @type {number} */ left, /** @type {number} */ top) => ({ x: clampN(Math.round(left / (innerWidth / GRID_COLS)), 0, GRID_COLS - 1), y: clampN(Math.round(top / (innerHeight / GRID_ROWS)), 0, GRID_ROWS - 1) });
const cellFromPoint = (/** @type {number} */ x, /** @type {number} */ y) => ({ x: clampN(Math.floor(x / (innerWidth / GRID_COLS)), 0, GRID_COLS - 1), y: clampN(Math.floor(y / (innerHeight / GRID_ROWS)), 0, GRID_ROWS - 1) });
async function savePlace(/** @type {(w: any) => void} */ change, /** @type {boolean} */ undo = true){
  const wasEditing = editing;
  try { if (!ADMIN) ADMIN = await api('admin_data'); } catch (err){ toast(err.message, true); return; }   // outside Edit the full settings are not loaded yet
  const before = JSON.stringify(ADMIN.widgets), posBefore = JSON.stringify(ADMIN.widgets.pos || { clock:null, cards:{} });
  ADMIN.widgets.pos = ADMIN.widgets.pos || { clock:null, cards:{} };
  change(ADMIN.widgets);
  if (JSON.stringify(ADMIN.widgets) !== before){
    try {
      await saveAll(''); setWidgets(ADMIN.widgets);
      const H = /** @type {any} */ (window).HUB;   // (1.82.3) Moved, with Undo for a few seconds
      if (undo && H && H.undo) H.undo('Moved', () => savePlace(w => { w.pos = JSON.parse(posBefore); }, false)); else toast('Saved');
    } catch (err){ ADMIN.widgets = JSON.parse(before); setWidgets(ADMIN.widgets); toast(err.message, true); }
  }
  if (!wasEditing) ADMIN = null;
}
// (1.82.3) a piece dropped on another card or the clock goes to the nearest free cell instead
function clearCell(/** @type {any} */ d){
  const others = [...document.querySelectorAll('.wcard:not(.wdim), #clock:not(.wdim)')].map(e => e.getBoundingClientRect()).filter(r => r.width > 0 && r.height > 0);
  const at = (/** @type {{x:number,y:number}} */ c) => d.kind === 'card' ? { x:Math.min(c.x * innerWidth / GRID_COLS, innerWidth - 236 * d.s), y:Math.min(c.y * innerHeight / GRID_ROWS, innerHeight - 100 * d.s) } : { x:(c.x + .5) * innerWidth / GRID_COLS - d.w / 2, y:(c.y + .5) * innerHeight / GRID_ROWS - d.h / 2 };
  const fits = (/** @type {{x:number,y:number}} */ c) => { const p = at(c); return p.x >= 0 && p.y >= 0 && p.x + d.w <= innerWidth && p.y + d.h <= innerHeight && !others.some(r => p.x < r.right + 6 && p.x + d.w + 6 > r.left && p.y < r.bottom + 6 && p.y + d.h + 6 > r.top); };
  if (fits(d.cell)) return;
  let best = null, bd = 1e9;
  for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++){
    const c = { x:d.cell.x + dx, y:d.cell.y + dy }, dist = dx * dx + dy * dy;
    if (dist < bd && c.x >= 0 && c.y >= 0 && c.x < GRID_COLS && c.y < GRID_ROWS && fits(c)){ best = c; bd = dist; }
  }
  if (best) d.cell = best;
}
function gridShow(/** @type {{x:number,y:number,w:number,h:number} | null} */ box){
  let g = document.getElementById('mvGrid');
  if (!g){ g = document.createElement('div'); g.id = 'mvGrid'; g.setAttribute('aria-hidden', 'true'); g.innerHTML = '<i></i>'; document.body.append(g); }
  g.hidden = !box; if (!box) return;
  const c = /** @type {HTMLElement} */ (g.firstElementChild);
  c.style.cssText = `left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px`;
}
// (1.82.3) guide lines: when the target lines up with the edge or middle of another piece, a thin line shows it
function guideShow(/** @type {{x:number,y:number,w:number,h:number}} */ b, /** @type {DOMRect[]} */ others){
  const g = document.getElementById('mvGrid'); if (!g) return;
  g.querySelectorAll('.gl').forEach(n => n.remove());
  const xs = [b.x, b.x + b.w / 2, b.x + b.w], ys = [b.y, b.y + b.h / 2, b.y + b.h];
  let vx = null, hy = null;
  for (const r of others){
    for (const a of xs) for (const c of [r.left, r.left + r.width / 2, r.right]) if (vx === null && Math.abs(a - c) < 3) vx = c;
    for (const a of ys) for (const c of [r.top, r.top + r.height / 2, r.bottom]) if (hy === null && Math.abs(a - c) < 3) hy = c;
  }
  if (vx !== null){ const l = document.createElement('i'); l.className = 'gl gv'; l.style.left = vx + 'px'; g.append(l); }
  if (hy !== null){ const l = document.createElement('i'); l.className = 'gl gh'; l.style.top = hy + 'px'; g.append(l); }
}
function moveBegin(/** @type {PointerEvent} */ e, /** @type {HTMLElement} */ el, /** @type {string} */ kind, /** @type {string} */ id){
  const r = el.getBoundingClientRect();
  mv = { s:kind === 'clock' ? (document.body.classList.contains('clock-free') ? Number(getComputedStyle(document.body).getPropertyValue('--cs')) || 1 : 1) : Number(getComputedStyle(el).getPropertyValue('--ws')) || 1, kind, id, el, sx:e.clientX, sy:e.clientY, ox:e.clientX - r.left, oy:e.clientY - r.top, w:r.width, h:r.height, started:false, cell:null, ghost:null, pid:e.pointerId, raf:0, px:e.clientX, py:e.clientY };
}
// the piece in your hand follows the pointer by transform (no layout work), lifts a little, and glides into its cell when you let go
const lift = (/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ k) => `translate3d(${x}px,${y}px,0) scale(${mv.s * k})`;
function moveStart(){
  mv.started = true; document.body.classList.add('moving');
  const r = mv.el.getBoundingClientRect(), g = /** @type {HTMLElement} */ (mv.el.cloneNode(true));
  g.querySelectorAll('[id]').forEach(n => n.removeAttribute('id')); g.querySelectorAll('.pgrip, .crs').forEach(n => n.remove()); g.removeAttribute('id'); g.removeAttribute('data-w');
  g.classList.add('wghost'); g.style.cssText = `position:fixed;left:0;top:0;right:auto;bottom:auto;width:${mv.w / mv.s}px;margin:0;z-index:11;pointer-events:none;transform-origin:0 0;will-change:transform;transform:${lift(r.left, r.top, 1)}`;
  document.body.append(g); mv.ghost = g; mv.el.classList.add('wdim');
  mv.others = [...document.querySelectorAll('.wcard:not(.wdim), #clock:not(.wdim)')].map(e => e.getBoundingClientRect()).filter(r => r.width > 0 && r.height > 0);
  requestAnimationFrame(() => { if (mv && mv.ghost === g) g.classList.add('wlift'); });
}
function movePoint(/** @type {number} */ x, /** @type {number} */ y){
  mv.px = x; mv.py = y;
  if (mv.raf) return;   // once a frame is enough
  mv.raf = requestAnimationFrame(() => { if (mv){ mv.raf = 0; moveFrame(mv); } });
}
function moveFrame(/** @type {any} */ d){
  const left = clampN(d.px - d.ox, 0, innerWidth - d.w), top = clampN(d.py - d.oy, 0, innerHeight - d.h);
  if (d.ghost) d.ghost.style.transform = `translate3d(${left}px,${top}px,0) scale(${d.s * 1.03})`;
  if (d.kind === 'card'){
    d.cell = cellFromRect(left, top); const bx = { x:d.cell.x * innerWidth / GRID_COLS, y:d.cell.y * innerHeight / GRID_ROWS, w:d.w, h:d.h }; gridShow(bx); guideShow(bx, d.others || []);
  } else {
    d.cell = cellFromPoint(left + d.w / 2, top + d.h / 2);
    const bx = { x:(d.cell.x + .5) * innerWidth / GRID_COLS - d.w / 2, y:(d.cell.y + .5) * innerHeight / GRID_ROWS - d.h / 2, w:d.w, h:d.h }; gridShow(bx); guideShow(bx, d.others || []);
  }
}
function moveEnd(/** @type {boolean} */ commit){
  if (!mv) return;
  const d = mv; mv = null; cancelAnimationFrame(d.raf);
  if (!d.started) return;
  if (commit){ moveFrame(d); if (d.cell) clearCell(d); }   // the last pointer position counts, even if no frame was drawn for it
  document.body.classList.remove('moving'); gridShow(null);
  justDragged = true; setTimeout(() => { justDragged = false; }, 0);   // the click that ends a drag must not open the widget
  const done = () => { d.ghost?.remove(); d.el.classList.remove('wdim'); };
  if (!commit || !d.cell){ done(); return; }
  // glide the piece onto its cell, keep it there until the saved page is drawn, then hand over
  const c = d.cell, g = d.ghost;
  const tx = d.kind === 'card' ? Math.min(c.x * innerWidth / GRID_COLS, innerWidth - 236 * d.s) : (c.x + .5) * innerWidth / GRID_COLS - d.w / 2, ty = d.kind === 'card' ? Math.min(c.y * innerHeight / GRID_ROWS, innerHeight - 100 * d.s) : (c.y + .5) * innerHeight / GRID_ROWS - d.h / 2;
  if (g){ g.classList.remove('wlift'); g.classList.add('wdrop'); g.style.transform = `translate3d(${tx}px,${ty}px,0) scale(${d.s})`; }
  const t0 = Date.now();
  savePlace(w => { if (d.kind === 'clock') w.pos.clock = c; else w.pos.cards[d.id] = Object.assign({}, c, d.s && d.s !== 1 ? { s:d.s } : {}); }).then(() => { setTimeout(done, Math.max(0, 200 - (Date.now() - t0))); });
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
  if (!WCFG || editing || !freeOk() || !t.closest) return;
  // (1.82.3) M on a focused card or the clock handle starts Move mode: arrows move it, Plus and Minus resize it, Enter or Escape puts it down
  const onPiece = !!t.closest('.pgrip, .crs, .wcard[data-w]');
  if (!e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'm' && onPiece){ e.preventDefault(); kb = !kb; say(kb ? 'Move mode. Arrow keys move, Plus and Minus resize, Enter puts it down.' : 'Placed.'); return; }
  if (kb && (e.key === 'Enter' || e.key === 'Escape')){ e.preventDefault(); e.stopPropagation(); kb = false; say('Placed.'); return; }
  if (!(e.altKey || (kb && onPiece)) || !e.key.startsWith('Arrow')) return;
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
  if (!WCFG || editing || !freeOk() || !(e.altKey || kb) || !['+', '=', '-', '_'].includes(e.key) || !t.closest) return;
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
