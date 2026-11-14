/* ======================================================================
   AUTH / EDIT MODE
   ====================================================================== */
let editOpening = false;
/* One login for the whole site: if you are not logged in, the site's Welcome box opens (same password, same two-step code). */
$('#editBtn').addEventListener('click', async () => {
  if (editOpening) return;
  editOpening = true;
  const btn = $('#editBtn');
  btn.classList.add('busy'); btn.textContent = 'Opening…';
  try {
    let s = await api('state');
    if (!s.admin){
      if (!window.HUB) throw new Error('The site login is not available. Reload the page.');
      btn.classList.remove('busy'); btn.textContent = 'Edit';
      await HUB.login();
      s = await api('state');
    }
    CSRF = s.csrf; await enterEdit();
  } catch (e){ if (e && e.message) toast(e.message, true); }
  finally { editOpening = false; btn.classList.remove('busy'); btn.textContent = 'Edit'; }
});

async function enterEdit(){
  try {
    ADMIN = await api('admin_data');
    editing = true;
    document.body.classList.add('editing');
    $('#toolbar').hidden = false;
    if (JSON.stringify(ADMIN.widgets) !== JSON.stringify(WCFG)) setWidgets(ADMIN.widgets);   // just logged in: the widgets appear
  } catch (e){ toast(e.message, true); }
}
function exitEdit(loggedOut = false){
  editing = false;
  document.body.classList.remove('editing');
  $('#toolbar').hidden = true;
  $$('dialog[open]').forEach(d => d.close());
  if (loggedOut){ CSRF = null; ADMIN = null; setWidgets(null); toast('You were logged out. Log in again to keep editing.', true); }
}
$('#doneBtn').addEventListener('click', () => exitEdit());

/** Save the whole site and refresh local copies. */
async function saveAll(msg = 'Saved'){
  const r = await api('save', stripAdmin(ADMIN));
  ADMIN = r.site; PUB = { ...r.public, first:null };
  applyPageMeta(ADMIN);
  if (JSON.stringify(ADMIN.widgets) !== JSON.stringify(WCFG)) setWidgets(ADMIN.widgets);
  if (msg) toast(msg);
  return r;
}
function stripAdmin(a){
  const { uploadsAdmin, sourceInfo, keyInfo, poolStats, limits, starterInfo, ...rest } = a;
  return rest;
}

