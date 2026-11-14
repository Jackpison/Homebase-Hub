/* ---------- icons ---------- */
const DATA_ICON = /^data:image\/(png|jpeg|gif|webp|x-icon|svg\+xml);base64,[A-Za-z0-9+\/=]+$/;
const isFallbackIcon = v => /^https:\/\/www\.google\.com\/s2\/favicons/.test(v || '');
// Links Settings > Icons from Google (1.51, off at first): only then does the browser ask Google's favicon service for an icon.
// Off, a link without an icon saved on your server shows its first letter, and Google never learns which sites are in your Links.
const webIcons = () => !!(S.data && S.data.settings && S.data.settings.webIcons);
let noFile = new Set();
function iconSrc(l, noWeb) {
  if (l.icon && !noFile.has(l.icon) && (webIcons() || !isFallbackIcon(l.icon))) return DATA_ICON.test(l.icon) ? l.icon : mediaUrl(safeUrl(l.icon));
  if (l.noIcon || noWeb || !webIcons()) return '';   // noWeb: in an encrypted tab the browser doesn't ask a favicon service about your sites
  const d = isWeb(l.url) ? host(l.url) : '';
  return d ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=64` : '';
}
function linkIcon(l, noWeb) {
  const src = iconSrc(l, noWeb);
  const fb = (l.title || '?').trim().charAt(0).toUpperCase();
  const box = h('span', { class: 'ico' + (src ? ' has' : ''), 'aria-hidden': 'true' });
  if (src) {
    const img = h('img', { src, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });
    img.onerror = () => { img.remove(); box.classList.remove('has'); box.textContent = fb; };
    box.append(img);
  } else box.textContent = fb;
  return box;
}
// If this server can't reach the site (some hosts block outgoing requests), save the favicon web service's address instead,
// so the icon still shows and is kept. Settings > Health > Server Check explains what the host allows.
const fetchIcon = url => api('icon', { url: safeUrl(url) }).then(j => j.icon).catch(e => {
  if (e.status === 401 || e.status === 400) throw e;                                  // not logged in / not a fetchable address
  if (e.status === 404 && !(e.data && e.data.fallback)) throw e;                      // the server could reach the site and really found no icon
  if (!webIcons()) throw e;                                                          // Icons from Google is off: no service address
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host(url))}&sz=64`;   // timeout, blocked or failing host: the service address still shows an icon
});

let bulkRunning = false, iconStop = false;
const iconTargets = (mode, auto) => allLinks().filter(l => isWeb(l.url) && (mode === 'all' || !l.icon || isFallbackIcon(l.icon) || noFile.has(l.icon)) && !(auto && (l.noIcon || isFallbackIcon(l.icon))));
// Fetches icons for the links picked by mode ("missing" or "all"). ui(done, total) reports progress. Returns the counts, or null if one run is already going.
async function fetchIcons(mode, auto, ui) {
  if (bulkRunning) return null;
  const todo = iconTargets(mode, auto), n = { total: todo.length, saved: 0, service: 0, none: 0, reason: '' };
  if (!todo.length) return n;
  bulkRunning = true; iconStop = false; $('#iconsBtn').disabled = true;
  let done = 0;
  const byHost = {}, queue = [...todo];
  const worker = async () => {
    while (queue.length && S.auth && !iconStop) {
      const l = queue.shift(), hs = host(l.url);
      byHost[hs] ||= fetchIcon(l.url).then(icon => ({ icon }), err => ({ err }));
      const r = await byHost[hs];
      await new Promise(go => setTimeout(go, 150));
      if (r.err && r.err.status === 401) { S.auth = false; break; }
      if (r.icon) { l.icon = r.icon; delete l.noIcon; isFallbackIcon(r.icon) ? n.service++ : n.saved++; }
      else { if (!n.reason && r.err) n.reason = r.err.message || ''; if (!l.icon) l.noIcon = true; n.none++; }
      done++;
      if (ui) ui(done, todo.length); else if (!auto) toast(`Fetching icons: ${done} of ${todo.length}`, false, true);
      if (done % 20 === 0 && !drag) persist(null);
    }
  };
  await Promise.all([worker(), worker()]);   // two at a time, with a short pause, so slow hosts are not overloaded
  bulkRunning = false; $('#iconsBtn').disabled = false;
  if (!S.auth) { endSession('Session ended. Log in again to fetch icons.', true); return n; }
  persist(auto ? null : 'Icons saved');
  return n;
}
const fetchMissingIcons = auto => fetchIcons('missing', auto);   // runs by itself when you start editing, without a dialog

/* "Fetch icons" dialog: choose which links, watch the progress, read what happened */
function iconSummary(n) {
  if (!n.total) return 'Nothing to fetch: every link already has an icon.';
  const parts = [];
  if (n.saved) parts.push(`${n.saved} saved from the sites`);
  if (n.service) parts.push(`${n.service} using the favicon service`);
  if (n.none) parts.push(`${n.none} with no icon found`);
  let t = parts.join(', ') + '.';
  if (n.service && !n.saved) t += ' Your host could not reach those sites, so the favicon service address was saved instead. See Settings > Health > Server Check.';
  else if (n.none && n.reason) t += ' ' + n.reason;
  return t;
}
function openIconDlg() {
  const c1 = iconTargets('missing').length, c2 = iconTargets('all').length;
  $('#iconCnt1').textContent = `${c1} link${c1 === 1 ? '' : 's'}`; $('#iconCnt2').textContent = `${c2} link${c2 === 1 ? '' : 's'}`;
  $('#iconProg').hidden = true; $('#iconStat').textContent = ''; $('#iconGo').disabled = false;
  $('#iconDlg').showModal();
}
$('#iconGo').onclick = async e => {
  e.preventDefault();
  if (bulkRunning) return;
  const mode = /** @type {HTMLInputElement} */ (document.querySelector('input[name=iconMode]:checked')).value;
  $('#iconGo').disabled = true; $('#iconProg').hidden = false; $('#iconBar').style.width = '0%'; $('#iconStat').textContent = 'Starting…';
  const n = await fetchIcons(mode, false, (d, t) => { $('#iconBar').style.width = Math.round(d / t * 100) + '%'; $('#iconStat').textContent = `Fetching icons: ${d} of ${t}`; });
  $('#iconGo').disabled = false;
  if (!n) return;
  $('#iconBar').style.width = '100%'; $('#iconStat').textContent = iconSummary(n);
  render();
};
$('#iconDlg').addEventListener('close', () => { iconStop = true; });

/* ---------- Import Bookmarks: links-import.js is loaded the first time the menu item is used ---------- */
let importer = null;
// What the importer may use. It changes Links only through save(), which keeps an earlier version first (so Backup & Restore >
// Earlier Versions can undo the import) and sends the page's revision, so a change made in another window is never overwritten.
const BM = {
  tabs: () => S.data.tabs, title: () => (S.data.settings && S.data.settings.title) || 'Bookmarks', maxTabs: MAX_TABS, uid, toast, shortestCol, host,
  size: async () => JSON.stringify(await buildSnapshot()).length,
  async save(apply, undo, msg) {
    await saving;
    apply(); render();
    try { const j = await api('save', { rev: S.rev, data: await buildSnapshot(), keep: true }); S.rev = j.rev; render(); return true; }
    catch (e) { undo(); render(); if (e.status === 401) endSession('Session ended. Log in again to keep editing.', true); throw e; }
  },
  showTab(id) { S.tab = id; location.hash = encodeURIComponent(id); render(); },
};
function openImport() {
  if (!S.auth) return toast('Log in to import bookmarks.', true);
  importer ||= new Promise((ok, no) => {
    const s = document.createElement('script');
    s.src = 'assets/links-import.js?v=1.79.5';
    s.onload = () => window.LinksImport ? ok(window.LinksImport) : no(new Error('The importer did not start.'));
    s.onerror = () => no(new Error('Could not load the importer. Check your connection and try again.'));
    document.head.append(s);
  });
  importer.then(m => m.open(BM), e => { importer = null; toast(e.message, true); });
}
$('#importBmBtn').onclick = openImport;

