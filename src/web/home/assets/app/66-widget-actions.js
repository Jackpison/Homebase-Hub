/* ---------- opening, closing and acting ---------- */
function openWidget(id){
  wOpen = wOpen === id ? '' : id;
  if (wOpen === 'calendar') calMonth = '';
  if (wOpen === 'pad' && !WD.pad) loadPad();
  if (wOpen === 'note' && !WD.info && WCFG.note.box) loadInfo();
  if (wOpen === 'tools') loadTools();   // a tool you opened since Home loaded
  renderWidgets();
  if (wOpen) ($('#wQa') || $('#wPad') || $('#wClose')).focus();
}
function closeWidget(){
  if (!wOpen) return;
  const was = wOpen; wOpen = ''; renderWidgets();
  $(`[data-w="${was}"]`)?.focus();
}
document.addEventListener('click', e => {
  const b = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('[data-w]'));
  if (b && !b.closest('#wPanel')) return openWidget(b.dataset.w);
  const c = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('[data-cal]'));
  if (c){
    const d = dParse((calMonth || siteToday().slice(0, 7)) + '-01'); d.setMonth(d.getMonth() + +c.dataset.cal);
    calMonth = dStr(d).slice(0, 7); renderPanel(); $(`[data-cal="${c.dataset.cal}"]`)?.focus();
  }
});
$('#wClose').addEventListener('click', closeWidget);
$('#wBody').addEventListener('click', e => { if (e.target.closest('#wQuoteNext')){ quoteMore++; renderWidgets(); $('#wQuoteNext')?.focus(); } });
addEventListener('keydown', e => { if (e.key === 'Escape' && wOpen && !$$('dialog[open]').length) closeWidget(); });

// Today: tick a task to mark it done (a repeating task moves to its next date), or type one into Quick Add
$('#wBody').addEventListener('change', async e => {
  const cb = e.target.closest('[data-done]'); if (!cb) return;
  cb.disabled = true;
  try {
    const r = await siteJSON('../tasks/api.php', { action:'done', id:cb.dataset.done, due:cb.dataset.due });
    const name = (WD.tasks || []).find(x => x.id === cb.dataset.done)?.name || 'Task';
    toast(String(r.result || '').startsWith('next:') ? `Done. ${name} comes back on ${dLong(r.result.slice(5))}.` : `Done: ${name}`);
  } catch (err){ toast(err.message, true); }
  loadTasks();
});
$('#wBody').addEventListener('submit', async e => {
  if (e.target.id !== 'wQaForm') return;
  e.preventDefault();
  const inp = $('#wQa'), text = inp.value.trim();
  if (!text) return;
  inp.disabled = true;
  try {
    const r = await siteJSON('../tasks/api.php', { action:'quick_add', text });
    toast(`Added: ${r.task.name}, ${r.task.due === siteToday() ? 'today' : dLong(r.task.due)}`);
    inp.value = '';
    await loadTasks();
  } catch (err){ toast(err.message, true); }
  const again = $('#wQa'); if (again){ again.disabled = false; again.focus(); }
});

// Scratch Pad: saves a moment after you stop typing, and when you leave the page
let padT = 0, padDirty = false;
async function savePad(keepalive = false){
  const el = $('#wPad'); if (!el || !padDirty) return;
  padDirty = false; clearTimeout(padT);
  const st = $('#wPadState');
  try {
    const r = await api('pad', { text:el.value }, false, keepalive);
    WD.pad = { text:el.value, saved:r.saved };
    if (st) st.textContent = 'Saved';
  } catch (err){ padDirty = true; if (st) st.textContent = 'Not saved: ' + err.message; }
}
$('#wBody').addEventListener('input', e => {
  if (e.target.id !== 'wPad') return;
  padDirty = true; $('#wPadState').textContent = 'Saving…';
  clearTimeout(padT); padT = setTimeout(savePad, 800);
});
$('#wBody').addEventListener('focusout', e => { if (e.target.id === 'wPad') savePad(); });
addEventListener('pagehide', () => savePad(true));

/* logged in or out after the page loaded (Edit, Log Out, or another tab) */
function setWidgets(cfg){
  WCFG = cfg || null;
  if (!WCFG){ Object.assign(WD, { tasks:null, tasksErr:'', set:{}, info:null, infoErr:'', tools:null, pad:null, padErr:'', weather:null, weatherErr:'' }); wOpen = ''; }
  renderWidgets();
  loadWidgets();
}

