/* ---------- (1.82.0) drag the clock or the Glance cards to the left, centre or right ----------
   Only you see the handles (body.can-move). While you drag, three zones show; let go over one and it is saved like any Widgets setting.
   The arrow keys on a handle do the same, and Widgets > Clock Position and Cards Position are the plain way. */
const MOVE_PLACES = { clock: ['left', 'center', 'right'], cards: ['left', 'bottom', 'right'] };
let moveDrag = null;
async function movePlace(/** @type {string} */ what, /** @type {string} */ to){
  const key = what === 'clock' ? 'clockPos' : 'cardsPos', wasEditing = editing;
  try { if (!ADMIN) ADMIN = await api('admin_data'); } catch (err){ toast(err.message, true); return; }   // outside Edit the full settings are not loaded yet
  if (!ADMIN.widgets || ADMIN.widgets[key] === to){ if (!wasEditing) ADMIN = null; return; }
  const prev = ADMIN.widgets[key];
  ADMIN.widgets[key] = to;
  try { await saveAll('Moved'); setWidgets(ADMIN.widgets); } catch (err){ ADMIN.widgets[key] = prev; setWidgets(ADMIN.widgets); toast(err.message, true); }
  if (!wasEditing) ADMIN = null;
}
function moveZone(/** @type {string} */ what, /** @type {number} */ x){
  const f = x / innerWidth;
  return what === 'clock' ? (f < .34 ? 'left' : f > .66 ? 'right' : 'center') : (f < .3 ? 'left' : f > .7 ? 'right' : 'bottom');
}
function moveZonesShow(/** @type {string} */ what, /** @type {string} */ on){
  let z = document.getElementById('mvZones');
  if (!z){ z = document.createElement('div'); z.id = 'mvZones'; z.setAttribute('aria-hidden', 'true'); document.body.append(z); }
  z.hidden = !on; if (!on) return;
  const names = MOVE_PLACES[what];
  z.className = what; z.innerHTML = names.map(n => `<i data-z="${n}" class="${n === on ? 'on' : ''}">${n === 'bottom' ? 'Bottom' : n[0].toUpperCase() + n.slice(1)}</i>`).join('');
}
document.addEventListener('pointerdown', e => {
  const g = /** @type {HTMLElement | null} */ ((/** @type {Element} */ (e.target)).closest && (/** @type {Element} */ (e.target)).closest('.pgrip'));
  if (!g || !WCFG || e.button) return;
  e.preventDefault();
  moveDrag = { what: g.dataset.drag || 'clock', to: '' };
  moveDrag.to = moveZone(moveDrag.what, e.clientX); document.body.classList.add('moving'); moveZonesShow(moveDrag.what, moveDrag.to);
  try { g.setPointerCapture(e.pointerId); } catch { /* the page still follows the pointer */ }
});
document.addEventListener('pointermove', e => {
  if (!moveDrag) return;
  const to = moveZone(moveDrag.what, e.clientX); if (to !== moveDrag.to){ moveDrag.to = to; moveZonesShow(moveDrag.what, to); }
});
function moveEnd(/** @type {boolean} */ commit){
  if (!moveDrag) return;
  const d = moveDrag; moveDrag = null; document.body.classList.remove('moving'); moveZonesShow(d.what, '');
  if (commit) movePlace(d.what, d.to);
}
document.addEventListener('pointerup', () => moveEnd(true));
document.addEventListener('pointercancel', () => moveEnd(false));
document.addEventListener('keydown', e => {
  const g = /** @type {HTMLElement | null} */ ((/** @type {Element} */ (e.target)).closest && (/** @type {Element} */ (e.target)).closest('.pgrip'));
  if (moveDrag && e.key === 'Escape'){ moveEnd(false); return; }
  if (!g || !WCFG || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
  e.preventDefault();
  const what = g.dataset.drag || 'clock', list = MOVE_PLACES[what], cur = (what === 'clock' ? WCFG.clockPos : WCFG.cardsPos) || list[what === 'clock' ? 1 : 1];
  const i = Math.max(0, Math.min(list.length - 1, list.indexOf(cur) + (e.key === 'ArrowRight' ? 1 : -1)));
  movePlace(what, list[i]).then(() => /** @type {HTMLElement | null} */ (document.querySelector(`.pgrip[data-drag="${what}"]`))?.focus());
});
