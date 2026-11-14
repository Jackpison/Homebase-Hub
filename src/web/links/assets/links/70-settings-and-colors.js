/* ---------- settings + colors (each dialog edits a draft, previews live, reverts on cancel) ---------- */
let draft = null, draftSaved = false;
const openDraft = () => { draft = JSON.parse(JSON.stringify(S.data.settings || {})); draftSaved = false; };
// (1.64.9) Saving Settings, Colors or Text Sizes redraws every link only when a setting changes what is drawn (icons from Google, visit counts,
// Hide From Visitors). Colors, text sizes and the title are CSS variables and the browser tab's name: with 1,500 links the full redraw took about a second.
const drawnBy = s => [!!(s && s.webIcons), !(s && s.visitCounts === false), !!(s && s.private)].join();
function commitDraft(dlg, msg) { const redraw = drawnBy(S.data.settings) !== drawnBy(draft); const keepV = S.data.settings && S.data.settings.vault; S.data.settings = draft; if (keepV) S.data.settings.vault = keepV; else delete S.data.settings.vault; draftSaved = true; dlg.close(); applyLook(); persist(msg, redraw); }
['#setDlg', '#colorDlg', '#textDlg'].forEach(id => $(id).addEventListener('close', () => { if (!draftSaved) applyLook(); }));

/* colors */
for (const m of ['dark', 'light']) {
  for (const [k, label] of COLOR_KEYS.filter(c => c[0] !== 'bg' && c[0] !== 'accent')) $('#' + m + (k[0] === 'c' ? 'Colors4' : 'Colors')).append(h('div', { class: 'ix-srow ix-nt' },
    h('span', { class: 'lbl' }, k === 'ribbon' ? 'Ribbon' : label),
    h('span', { class: 'cprev', 'data-p': `${m}.${k}` }, k === 'ribbon' ? '▮ Tab' : 'Category'),
    h('label', { class: 'swatch' }, h('input', { type: 'color', 'data-k': `${m}.${k}` }),
      h('input', { type: 'text', 'data-k': `${m}.${k}`, maxlength: 7, 'aria-label': `${m} ${label} hex` })),
    h('button', { type: 'button', class: 'crst', 'data-rst': `${m}.${k}`, title: 'Back to the default (follows the accent)', 'aria-label': `Reset ${label}` }, '↺')));
}
const colorInputs = () => /** @type {HTMLInputElement[]} */ ([...document.querySelectorAll('#colorDlg input[data-k]')]);
function fillColorInputs() {
  colorInputs().forEach(inp => { if (inp === document.activeElement && inp.type === 'text') return; const [m, k] = inp.dataset.k.split('.'); inp.value = colorsFor(m, draft)[k]; });
  document.querySelectorAll('#colorDlg [data-p]').forEach((/** @type {HTMLElement} */ el) => { const [m, k] = el.dataset.p.split('.'); el.style.color = colorsFor(m, draft)[k]; });
  document.querySelectorAll('#colorDlg [data-rst]').forEach((/** @type {HTMLElement} */ b) => { const [m, k] = b.dataset.rst.split('.'); b.style.visibility = draft[m] && isHex(draft[m][k]) ? 'visible' : 'hidden'; });
}
// one mode at a time: the one the page shows now first
function colorMode(m) {
  document.querySelectorAll('#colorDlg [data-cm]').forEach((/** @type {HTMLElement} */ b) => b.setAttribute('aria-pressed', b.dataset.cm === m ? 'true' : 'false'));
  document.querySelectorAll('#colorDlg .cpanel').forEach((/** @type {HTMLElement} */ p) => { p.hidden = p.dataset.m !== m; });
  $('#colorDlg').dataset.mode = m;
}
document.querySelectorAll('#colorDlg [data-cm]').forEach((/** @type {HTMLElement} */ b) => b.onclick = () => colorMode(b.dataset.cm));
document.querySelectorAll('#colorDlg [data-rst]').forEach((/** @type {HTMLElement} */ b) => b.onclick = () => { const [m, k] = b.dataset.rst.split('.'); if (draft[m]) delete draft[m][k]; fillColorInputs(); applyLook(draft); });
document.querySelectorAll('#colorDlg [data-same]').forEach((/** @type {HTMLElement} */ b) => b.onclick = () => {
  const m = b.dataset.same, c0 = colorsFor(m, draft).c0; draft[m] ||= {};
  for (const k of ['c0', 'c1', 'c2', 'c3']) draft[m][k] = c0;
  fillColorInputs(); applyLook(draft);
});
$('#colorsBtn').onclick = () => { openDraft(); colorMode(mode()); fillColorInputs(); $('#colorDlg').showModal(); };
colorInputs().forEach(inp => inp.addEventListener('input', () => {
  let v = inp.value.trim(); if (inp.type === 'text' && v && v[0] !== '#') v = '#' + v;
  if (!isHex(v)) return;
  const [m, k] = inp.dataset.k.split('.');
  (draft[m] ||= {})[k] = v.toLowerCase();
  fillColorInputs(); // keeps the twin input and anything following the accent in step
  applyLook(draft);
}));
$('#colorReset').onclick = () => { const m = $('#colorDlg').dataset.mode || mode(); for (const k of ['ribbon', 'c0', 'c1', 'c2', 'c3']) if (draft[m]) delete draft[m][k]; fillColorInputs(); applyLook(draft); };
$('#colorSave').onclick = e => { e.preventDefault(); commitDraft($('#colorDlg'), 'Colors saved'); };

/* text: separate sizes for tabs, categories and links (the font is one site-wide setting in Settings > Appearance) */
for (const [k, label, min, max] of SIZE_KEYS) $('#xSizes').append(h('div', { class: 'ix-srow', 'data-rt': 'text size' },
  h('label', { for: 'xSize-' + k }, label),
  h('div', { class: 'range' }, h('input', { type: 'range', id: 'xSize-' + k, min, max, step: 1 }), h('output', { id: 'xOut-' + k }))));
function fillTextForm() {
  const z = sizesFor(draft);
  for (const [k] of SIZE_KEYS) $('#xSize-' + k).value = z[k];
  readTextForm();
}
function readTextForm() {
  delete draft.font; delete draft.fontCustom;
  draft.sizes = {};
  for (const [k] of SIZE_KEYS) { draft.sizes[k] = +$('#xSize-' + k).value; $('#xOut-' + k).textContent = draft.sizes[k] + ' px'; }
  delete draft.fontSize;
  applyLook(draft);
}
$('#textBtn').onclick = () => { openDraft(); fillTextForm(); $('#textErr').textContent = ''; $('#textDlg').showModal(); };
$('#xSizes').addEventListener('input', readTextForm);
$('#textReset').onclick = () => { delete draft.font; delete draft.fontCustom; delete draft.sizes; delete draft.fontSize; fillTextForm(); };
$('#textSave').onclick = e => {
  e.preventDefault(); readTextForm();
  if (draft.font === 'custom' && !draft.fontCustom) { $('#textErr').textContent = 'Type a font name, or pick one from the list.'; return; }
  if (!draft.font || draft.font === 'trebuchet') delete draft.font;
  if (draft.font !== 'custom') delete draft.fontCustom;
  if (SIZE_KEYS.every(([k, , , , def]) => draft.sizes[k] === def)) delete draft.sizes;
  commitDraft($('#textDlg'), 'Text saved');
};

/* settings */
function readSettingsForm() {
  draft.title = $('#sTitle').value.trim();
  draft.private = $('#sPrivate').checked;
  draft.webIcons = $('#sWebIcons').checked;
  draft.visitCounts = $('#sVisits').checked;
  applyLook(draft);
}
// Text Sizes lives inside Settings: close it, then open the sizes
$('#sTextBtn').onclick = () => { $('#setDlg').close(); $('#textBtn').click(); };
$('#settingsBtn').onclick = () => {
  openDraft();
  $('#sTitle').value = draft.title || '';
  $('#sPrivate').checked = !!draft.private;
  $('#sWebIcons').checked = !!draft.webIcons;
  $('#sVisits').checked = draft.visitCounts !== false;
  readSettingsForm(); $('#setErr').textContent = '';
  $('#setDlg').showModal();
};
$('#sTitle').addEventListener('input', readSettingsForm);
$('#setSave').onclick = e => {
  e.preventDefault(); readSettingsForm();
  if (!draft.title) delete draft.title;
  delete draft.favicon;   // no separate Links icon any more: the site logo is used
  if (!draft.private) delete draft.private;
  if (!draft.webIcons) delete draft.webIcons;
  commitDraft($('#setDlg'), 'Settings saved');
};

/* earlier versions kept on the server */
$('#versionsBtn').onclick = async () => {
  const list = $('#verList'); list.innerHTML = ''; $('#verErr').textContent = '';
  $('#verDlg').showModal();
  list.append(h('li', {}, 'Loading…'));
  try {
    const j = await api('backups'); list.innerHTML = '';
    if (!j.backups.length) list.append(h('li', {}, 'No earlier versions yet. They appear as you edit.'));
    for (const b of j.backups) list.append(h('li', {},
      h('div', { class: 'when' }, new Date(b.time * 1000).toLocaleString(), h('small', {}, `${b.tabs} tab${b.tabs === 1 ? '' : 's'}, ${b.links} links`)),
      h('button', { class: 'btn', type: 'button', onclick: async ev => {
        if (!confirm(`Restore the version from ${new Date(b.time * 1000).toLocaleString()}? The current version is kept as a backup too.`)) return;
        ev.currentTarget.disabled = true;
        try { await api('rollback', { name: b.name }); $('#verDlg').close(); draftSaved = true; $('#setDlg').close(); await load(); toast('Earlier version restored'); }
        catch (err) { $('#verErr').textContent = err.message; ev.currentTarget.disabled = false; }
      } }, 'Restore')));
  } catch (err) { list.innerHTML = ''; $('#verErr').textContent = err.message; }
};

/* export (inside settings) */
$('#exportBtn').onclick = async e => {
  const btn = e.currentTarget; btn.disabled = true; btn.textContent = 'Preparing…';
  try {
    const r = await fetch(`${API}?action=backup&t=${Date.now()}`, { credentials: 'same-origin' });
    if (!r.ok) { let j = {}; try { j = await r.json(); } catch {} throw new Error(j.error || `Backup failed (${r.status})`); }
    const blob = await r.blob();
    const a = h('a', { href: URL.createObjectURL(blob), download: `bookmarks-backup-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a); a.click(); a.remove();
    toast('Backup downloaded');
  } catch (err) { $('#setErr').textContent = err.message; }
  btn.disabled = false; btn.textContent = 'Export Backup';
};
$('#importBtn').onclick = () => $('#importFile').click();
$('#importFile').onchange = async () => {
  const f = $('#importFile').files[0]; $('#importFile').value = '';
  if (!f) return;
  let backup;
  try { backup = JSON.parse(await f.text()); } catch { $('#setErr').textContent = 'That file is not valid JSON, so it cannot be a backup.'; return; }
  const d = backup && backup.format === 'bookmarks-backup' ? backup.data : backup;
  const tabs = d && Array.isArray(d.tabs) ? d.tabs : d && Array.isArray(d.categories) ? [{ categories: d.categories }] : null;
  if (!tabs) { $('#setErr').textContent = 'That file is not a bookmarks backup.'; return; }
  const nLinks = tabs.reduce((a, t) => a + (t.categories || []).reduce((b, c) => b + (c.links || []).filter(l => !l.divider).length, 0), 0);
  const nIcons = backup.icons ? Object.keys(backup.icons).length : 0;
  if (!confirm(`Replace everything on this site with this backup?\n\n${tabs.length} tab${tabs.length > 1 ? 's' : ''}, ${nLinks} links, ${nIcons} icons.\n\nThe current bookmarks are kept in data/backups first.`)) return;
  const btn = $('#importBtn'); btn.disabled = true; btn.textContent = 'Importing…'; $('#setErr').textContent = '';
  try {
    const j = await api('restore', { backup });
    draftSaved = true; $('#setDlg').close();
    toast(`Backup imported: ${nLinks} links, ${j.icons} icons`);
    await load(); setEditing(true);
  } catch (err) { $('#setErr').textContent = err.message; }
  btn.disabled = false; btn.textContent = 'Import Backup';
};

