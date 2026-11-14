/* ---------- name dialog ---------- */
function askName(title, value, btn) {
  return new Promise(res => {
    const d = $('#nameDlg');
    $('#nameDlgTitle').textContent = title; $('#nameSave').textContent = btn || 'Save';
    $('#nameInput').value = value || '';
    let result = null;
    $('#nameSave').onclick = e => { e.preventDefault(); const v = $('#nameInput').value.trim(); if (!v) return; result = v; d.close(); };
    d.onclose = () => res(result);
    d.showModal(); $('#nameInput').select();
  });
}

/* ---------- edit mode ---------- */
function setEditing(on) { S.editing = on; render(); }
function openSetup() {   // the site's one login box (it also creates the password on a new site)
  if (window.HUB) HUB.login().then(pw => unlockAfterLogin(pw)).then(() => location.reload(), () => {});   // encrypted tabs open with the password just typed
}
$('#editBtn').onclick = () => {
  if (S.editing) return setEditing(false);
  if (S.setup && !S.auth) return openSetup();
  if (S.auth) { setEditing(true); fetchMissingIcons(true); return; }
  openSetup();   // logging in is the site's one login box
};
$('#doneBtn').onclick = () => setEditing(false);
// Leaving the owner view: hide private things at once, then load exactly what a visitor gets.
async function endSession(msg, bad, serverLogout) {
  KEY = null; devClear();   // leaving the owner view locks the encrypted tabs
  S.auth = false; S.editing = false; S.rev = '';
  ['#linkDlg', '#iconDlg', '#hubTabDlg', '#nameDlg', '#setDlg', '#colorDlg', '#textDlg', '#verDlg'].forEach(id => { const d = $(id); if (d.open) d.close(); });
  if (S.data.settings && S.data.settings.private) { S.locked = true; S.data.tabs = []; }
  else S.data.tabs = S.data.tabs.filter(t => !t.private);
  pickTab(); render();
  if (location.hash && !S.data.tabs.some(t => '#' + t.id === location.hash)) history.replaceState(null, '', location.pathname + location.search);
  toast(msg, bad);
  if (serverLogout) { try { await api('logout', {}); } catch {} }
  await load();
}
$('#logoutBtn').onclick = () => endSession('Logged out', false, true);
$('#iconsBtn').onclick = openIconDlg;

/* ---------- link dialog ---------- */
let linkCtx = null;
function showIconPreview() {
  const v = $('#lIcon').value.trim(), p = $('#lIconPrev'); p.innerHTML = '';
  if (v) { const img = h('img', { src: mediaUrl(safeUrl(v)), alt: '' }); img.onerror = () => img.remove(); p.append(img); }
}
// (1.69.1) the Address field keeps https:// (or http://) in front of the box: these give and take the whole address
const urlNow = () => window.HUB && HUB.linkValue ? HUB.linkValue($('#lUrl')) : $('#lUrl').value.trim();
const linkSet = u => { if (window.HUB && HUB.linkSet) HUB.linkSet($('#lUrl'), u); else $('#lUrl').value = u; };
function openLink(cat, i) {
  const l = i >= 0 ? cat.links[i] : {};
  linkCtx = { cat, i, oldHost: host(l.url || ''), oldIcon: l.icon || '' };
  $('#linkDlgTitle').textContent = i >= 0 ? 'Edit link' : `Add link to ${cat.title}`;
  $('#lTitle').value = l.title || '';
  linkSet(l.url || '');
  $('#lIcon').value = l.icon || ''; showIconPreview();
  $('#lExtra').value = (l.extra || []).map(x => `${x.title} | ${x.url}`).join('\n');
  const sel = $('#lCat'); sel.innerHTML = '';
  S.data.tabs.forEach(t => sel.append(h('optgroup', { label: t.title },
    t.categories.map(c => h('option', { value: c.id, selected: c === cat }, c.title)))));
  $('#lOptIcon').open = !!l.icon; $('#lOptExtra').open = !!(l.extra && l.extra.length);   // a link that has them shows them
  $('#linkErr').textContent = '';
  titleSeq++; titleUrl = '';
  $('#lTitleFetch').disabled = false; $('#lTitleFetch').textContent = 'Get Title';
  $('#lTitle').placeholder = 'Filled in from the page title';
  $('#linkDlg').showModal(); (i >= 0 ? $('#lTitle') : $('#lUrl')).focus();
}
$('#lIcon').addEventListener('change', showIconPreview);
// Name from the address (instant guess), then the real page title from the server
const nameGuess = url => { const d = host(url).replace(/^www\./, ''); return d ? d.split('.')[0].replace(/^./, c => c.toUpperCase()) : ''; };
const fetchTitle = url => api('title', { url: safeUrl(url) }).then(j => j.title);
let titleSeq = 0, titleUrl = ''; // the box stays empty while loading, so your typing is never mixed in
function autoTitle(force) {
  const url = urlNow(), name = $('#lTitle');
  if (!url || !isWeb(safeUrl(url))) return;
  if (!force && (name.value.trim() || titleUrl === url)) return; // has a name, or already on its way
  const seq = ++titleSeq, btn = $('#lTitleFetch');
  titleUrl = url;
  name.placeholder = 'Getting the page title…'; btn.disabled = true; btn.textContent = 'Getting…';
  fetchTitle(url).then(t => {
    if (seq !== titleSeq || !$('#linkDlg').open) return;
    if (force || !name.value.trim()) { name.value = t; if (document.activeElement === name) name.select(); }
  }).catch(err => {
    if (seq !== titleSeq || !$('#linkDlg').open) return;
    if (force) $('#linkErr').textContent = err.message;
    else if (!name.value.trim()) name.value = nameGuess(url); // the site hid its title: use the domain
  }).finally(() => {
    if (seq !== titleSeq) return;
    titleUrl = ''; btn.disabled = false; btn.textContent = 'Get Title'; name.placeholder = 'Filled in from the page title';
  });
}
$('#lUrl').addEventListener('change', () => autoTitle(false));
$('#lUrl').addEventListener('paste', () => setTimeout(() => autoTitle(false)));
$('#lTitleFetch').onclick = () => { $('#linkErr').textContent = ''; autoTitle(true); };
$('#lIconFetch').onclick = async e => {
  const btn = e.currentTarget, url = urlNow();
  if (!url) { $('#linkErr').textContent = 'Enter the URL first.'; return; }
  btn.disabled = true; btn.textContent = 'Fetching…'; $('#linkErr').textContent = '';
  try { $('#lIcon').value = await fetchIcon(url); showIconPreview(); }
  catch (err) { $('#linkErr').textContent = err.message; }
  btn.disabled = false; btn.textContent = 'Fetch';
};
$('#linkSave').onclick = e => {
  e.preventDefault();
  const url = urlNow();
  if (!url) { $('#linkErr').textContent = 'Enter the URL.'; return; }
  // saved before the page title arrived: keep the quick guess now, swap in the real title when it comes
  const typed = $('#lTitle').value.trim();
  const title = typed || nameGuess(url) || url;
  const waitTitle = !typed && isWeb(safeUrl(url)); // saved before the title arrived
  const extra = [];
  for (const line of $('#lExtra').value.split('\n').map(s => s.trim()).filter(Boolean)) {
    const k = line.indexOf('|');
    if (k < 1) { $('#linkErr').textContent = `Extra link "${line}" needs the format: label | URL`; return; }
    extra.push({ title: line.slice(0, k).trim(), url: safeUrl(line.slice(k + 1)) });
  }
  const link = { title, url: safeUrl(url) };
  if (extra.length) link.extra = extra;
  let icon = $('#lIcon').value.trim();
  if (icon && icon === linkCtx.oldIcon && host(link.url) !== linkCtx.oldHost) icon = '';
  if (icon) link.icon = safeUrl(icon);

  const { cat, i } = linkCtx;
  const target = allCats().find(c => c.id === $('#lCat').value) || cat;
  if (i >= 0 && target === cat) cat.links[i] = link;
  else { if (i >= 0) cat.links.splice(i, 1); target.links.push(link); }
  $('#linkDlg').close();
  persist(i >= 0 ? 'Link saved' : 'Link added');
  titleSeq++; // the dialog is closed; any title still on its way is handled here instead
  if (waitTitle) fetchTitle(link.url).then(t => { if (link.title === title) { link.title = t; persist('Name updated from the page title'); } }).catch(() => {});
  if (!link.icon && isWeb(link.url)) {
    fetchIcon(link.url).then(ic => { link.icon = ic; persist('Icon saved'); })
      .catch(() => { link.noIcon = true; persist(null); });
  }
};

