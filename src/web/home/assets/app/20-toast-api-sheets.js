/* ======================================================================
   TOAST
   ====================================================================== */
function toast(msg, err = false){ if (window.HUB) HUB.toast(msg, err); }   // the site's one message box (shell.js)

/* ======================================================================
   API
   ====================================================================== */
async function api(action, body, form = false, keepalive = false){
  /** @type {any} */
  const o = { method: body !== undefined ? 'POST' : 'GET', credentials:'same-origin', headers:{}, keepalive };
  if (CSRF) o.headers['X-CSRF-Token'] = CSRF;
  if (body !== undefined){
    if (form) o.body = body;
    else { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body); }
  }
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), form ? 120000 : 45000);
  o.signal = ctl.signal;
  let r;
  try { r = await (window.HUB ? HUB.fetch('api.php?action=' + action, o) : fetch('api.php?action=' + action, o)); }
  catch { throw new Error('Couldn\'t reach your server. Check your connection and try again.'); }
  finally { clearTimeout(timer); }
  let j; try { j = await r.json(); } catch { j = { error:`The server sent an unexpected reply (${r.status}). Check that PHP is enabled.` }; }
  if (!r.ok || j.error){
    if (r.status === 401 && editing){ exitEdit(true); }
    throw Object.assign(new Error(j.error || 'Request failed'), { status:r.status, data:j });
  }
  return j;
}
async function withBusy(btn, fn){
  btn?.classList.add('busy');
  try { return await fn(); } finally { btn?.classList.remove('busy'); }
}

/* ======================================================================
   SHEETS (dialogs)
   ====================================================================== */
function openSheet(id){ const d = $('#' + id); if (!d.open) d.showModal(); return d; }
function closeSheet(id){ const d = $('#' + id); if (d.open) d.close(); }
document.addEventListener('click', e => {
  const c = /** @type {Element} */ (e.target).closest('[data-close]'); if (c) c.closest('dialog').close();
  const o = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('[data-open]')); if (o) openSheetFor(o.dataset.open);
});
$$('dialog.sheet').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));

function confirmBox(title, text, yes = 'Delete'){
  return new Promise(res => {
    const d = $('#confirmSheet');
    $('#confirmTitle').textContent = title; $('#confirmText').textContent = text; $('#confirmYes').textContent = yes;
    d.returnValue = '';
    d.addEventListener('close', () => res(d.returnValue === 'yes'), { once:true });
    d.showModal();
  });
}

function seg(el, value){
  $$('button', el).forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === String(value))));
}
$$('.seg').forEach(el => el.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  seg(el, b.dataset.v); el.dispatchEvent(new CustomEvent('change', { detail:b.dataset.v }));
}));

