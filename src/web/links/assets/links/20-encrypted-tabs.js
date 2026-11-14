/* ---------- encrypted tabs ----------
   An encrypted tab is stored as "enc1:" + base64(iv + AES-256-GCM ciphertext) of its categories (links, notes, icons), made here in the
   browser. The key is random; the server only keeps it wrapped with a key made from your encryption passphrase (PBKDF2-SHA256, 600,000 rounds),
   so the server, its earlier versions and backup files cannot read the tab. The open key lives in this page's memory, and (so a reload
   doesn't ask again) in this browser's IndexedDB under a device key that can't be read out; logging out or Lock deletes it. */
const V = window.HubVault, CAN_ENC = V.ok();   // the shared encryption (shell.js, section 14)
const keeper = V.keeper('links', 'links-keep', false);   // "keep unlocked on this device": on unless turned off in the unlock box
const keepOn = keeper.on, setKeep = keeper.set;
let KEY = null;
const b64 = V.b64;
const vault = () => (S.data.settings && S.data.settings.vault && S.data.settings.vault.wrap) ? S.data.settings.vault : null;
const wrapKey = (raw, pass) => V.wrap(raw, pass, true);
const unwrapKey = V.unwrap;   // the raw key, or null when the password (or the recovery key) doesn't fit
const useKey = raw => V.useKey(raw);
const seal = text => V.seal(KEY, text);
const unseal = s => V.unseal(KEY, s);
// "Keep unlocked on this device": the same IndexedDB Info uses (its own record), deleted when you log out or press Lock.
const devSave = keeper.save, devLoad = keeper.load, devClear = keeper.clear;
// What the server sent: tabs with "enc" become locked tabs (marked at once, so the page can draw; their text is opened afterwards).
function markEnc() {
  for (const t of S.data.tabs) {
    if (typeof t.enc !== 'string') continue;
    t.encrypted = true; t._blob = t.enc; delete t.enc; t.private = true; t.categories = []; t.locked = true; t.bad = false;
  }
  return !!(S.auth && S.data.tabs.some(t => t.encrypted));
}
// The key this browser kept (IndexedDB can be slow on its first open), then the text of every encrypted tab.
async function openKept() {
  if (!KEY && CAN_ENC && vault()) { const raw = await devLoad(); if (raw) { try { KEY = await useKey(raw); } catch {} raw.fill(0); } }
  if (KEY) await decryptAll();
}
// Identical icons (many links from one site) are stored once inside the encrypted text; each link points at its copy as "#i:N".
// Tabs saved before 1.29 (version 1, icons written out in full) still open, and are rewritten the next time they change.
function packPlain(categories) {
  const table = [], seen = new Map(), cats = JSON.parse(JSON.stringify(categories));
  for (const c of cats) for (const l of c.links || []) {
    if (l && typeof l.icon === 'string' && l.icon.startsWith('data:') && l.icon.length > 120) {
      let n = seen.get(l.icon); if (n === undefined) { n = table.length; table.push(l.icon); seen.set(l.icon, n); }
      l.icon = '#i:' + n;
    }
  }
  return JSON.stringify(table.length ? { v: 2, categories: cats, icons: table } : { v: 1, categories: cats });
}
function unpackPlain(j) {
  if (Array.isArray(j.icons)) for (const c of j.categories) for (const l of c.links || []) {
    const m = l && typeof l.icon === 'string' && /^#i:(\d+)$/.exec(l.icon);
    if (m) l.icon = typeof j.icons[+m[1]] === 'string' ? j.icons[+m[1]] : '';
  }
  return j.categories;
}
async function decryptAll() {
  let bad = 0;
  for (const t of S.data.tabs) {
    if (!t.encrypted || !(t.locked || t.bad)) continue;
    try {
      const j = JSON.parse(await unseal(t._blob));
      if (!j || !Array.isArray(j.categories)) throw new Error('shape');
      t.categories = unpackPlain(j); normalize({ tabs: [t] }, true);
      t._plain = packPlain(t.categories);
      t.locked = false; t.bad = false;
    } catch { t.categories = []; t.locked = true; t.bad = true; bad++; }
  }
  if (bad) { KEY = null; devClear(); }   // a kept key that no longer fits is dropped
}
async function lockNow() {
  await saving;   // anything still being saved goes out first
  KEY = null; devClear();
  for (const t of S.data.tabs) if (t.encrypted && !t.locked) { t.categories = []; t.locked = true; t._plain = ''; }
  render(); toast('Encrypted tabs are locked');
}
// Just logged in: the password was typed, so the key is opened right away and kept for this browser (the page reloads next).
const unlockAfterLogin = pw => keeper.afterLogin(pw, async () => { const j = await api('get'); return j.data && j.data.settings && j.data.settings.vault; });
// Icons of an encrypted tab travel inside its encrypted text (a file in icons/ is named after the site and readable by the server).
let embeddedAny = false;   // icons were swapped for embedded copies: the page must redraw (the old files are deleted by the server)
async function embedIcons(t) {
  const MIME = { png: 'image/png', ico: 'image/x-icon', gif: 'image/gif', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml' };
  for (const c of t.categories) for (const l of c.links) {
    const m = typeof l.icon === 'string' && /^icons\/[A-Za-z0-9._\/-]+\.(png|ico|gif|jpe?g|webp|svg)(\?.*)?$/i.exec(l.icon);
    if (!m) continue;
    try {
      const r = await fetch(mediaUrl(l.icon), { credentials: 'same-origin' }); if (!r.ok) continue;
      const bin = new Uint8Array(await r.arrayBuffer()); if (!bin.length || bin.length > 500 * 1024) continue;
      l.icon = 'data:' + MIME[m[1].toLowerCase()] + ';base64,' + b64(bin); embeddedAny = true;
    } catch {}
  }
}
// The data to send: encrypted tabs go as their encrypted text (a locked one as it came, never re-encrypted from nothing).
async function buildSnapshot() {
  const settings = JSON.parse(JSON.stringify(S.data.settings || {})); delete settings.vault;   // the key only changes through its own request
  const tabs = [];
  for (const t of S.data.tabs) {
    const { locked, bad, encrypted, _blob, _plain, categories, ...meta } = t;
    if (!encrypted) { tabs.push(JSON.parse(JSON.stringify({ ...meta, categories }))); continue; }
    const out = JSON.parse(JSON.stringify(meta)); out.private = true; out.categories = [];
    if (locked || bad) out.enc = _blob;
    else {
      await embedIcons(t);
      const plain = packPlain(t.categories);
      if (plain !== t._plain || !t._blob) { t._blob = await seal(plain); t._plain = plain; }
      out.enc = t._blob;
    }
    tabs.push(out);
  }
  return { settings, tabs };
}
// Opens the encrypted tabs with the encryption passphrase (set in Settings › Security › Encryption: that is the only place keys are made).
// Resolves true when the key is open.
function ensureKey() {
  if (KEY) return Promise.resolve(true);
  if (!CAN_ENC) { toast('Encryption needs a secure (https) connection.', true); return Promise.resolve(false); }
  const v = vault();
  if (!v) { toast('Set an encryption passphrase first: Settings › Security › Encryption.', true); return Promise.resolve(false); }
  return new Promise(resolve => {
    const dlg = $('#keyDlg'); let done = false, legacy = !!v.login;   // legacy: still locked with the website password (set a passphrase to move it)
    $('#keyTitle').textContent = 'Unlock Encrypted Tabs';
    $('#keyText').textContent = legacy ? 'These tabs are still locked with your website password. Set an encryption passphrase in Settings › Security › Encryption to move them onto it.'
      : 'Type your encryption passphrase to open the encrypted tabs in this browser.';
    $('#keyPwLbl').textContent = legacy ? 'Website Password' : 'Passphrase or Recovery Key';
    $('#keyPw').autocomplete = legacy ? 'current-password' : 'off';
    $('#keyGo').textContent = 'Unlock';
    $('#keyOldBox').hidden = !legacy; $('#keyOldBox').open = false;
    $('#keyPw').value = ''; $('#keyOld').value = ''; $('#keyErr').textContent = ''; $('#keyKeep').checked = keepOn();
    dlg.addEventListener('close', () => { if (!done) resolve(false); }, { once: true });
    $('#keyGo').onclick = async e => {
      e.preventDefault();
      const pw = $('#keyPw').value, old = legacy ? $('#keyOld').value : '', err = $('#keyErr'), btn = $('#keyGo');
      if (!pw) { err.textContent = legacy ? 'Type your website password.' : 'Type your encryption passphrase.'; return; }
      btn.disabled = true; err.textContent = 'Unlocking…';
      try {
        const raw = await unwrapKey(v, old || pw);
        if (!raw) { err.textContent = old ? "That earlier password doesn't open them." : legacy ? "That password doesn't open them. If you changed your password while these tabs were locked, open \"I changed my password\"." : "That passphrase isn't right."; btn.disabled = false; return; }
        if (old) {   // older site-password lock: moved to the current password
          const nv = await wrapKey(raw, pw), j = await api('save_vault', { vault: nv, prev: v.wrap, pw });
          S.data.settings.vault = j.vault; S.rev = j.rev;
        }
        KEY = await useKey(raw); setKeep($('#keyKeep').checked);
        if ($('#keyKeep').checked) await devSave(raw); else devClear();
        raw.fill(0);
        await decryptAll();
        done = true; dlg.close(); render(); resolve(!!KEY);
      } catch (e2) {
        err.textContent = e2.message || 'That did not work.';
        if (e2.status === 409) await load();
      }
      btn.disabled = false;
    };
    dlg.showModal(); $('#keyPw').focus();
  });
}
async function api(action, body) {
  const opt = body === undefined ? {} : {
    method: 'POST', body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'bookmarks' }
  };
  const r = await HF(`${API}?action=${action}&t=${Date.now()}`, { credentials: 'same-origin', ...opt });
  let j = {}; try { j = await r.json(); } catch {}
  if (!r.ok) { const e = /** @type {any} */ (new Error(j.error || `Request failed (${r.status})`)); e.status = r.status; e.data = j; throw e; }
  return j;
}
function pickTab() {
  const want = decodeURIComponent(location.hash.slice(1));
  S.tab = S.data.tabs.some(t => t.id === want) ? want : (S.data.tabs[0] || {}).id;
}
// Show the last public view instantly while the server answers (never used for logged-in data).
function paintFromCache() {
  try {
    const c = JSON.parse(localStorage.getItem('bm-cache') || 'null');
    if (!c || !Array.isArray(c.tabs)) return;
    S.data = normalize(c, true); pickTab(); render();
  } catch {}
}
// (1.72.0) the site search finds links in locked tabs too, while they are unlocked on this page (read from memory, never stored)
{ const HB0 = /** @type {any} */ (window).HUB; if (HB0 && HB0.findHook) HB0.findHook(() => {
  const out = [];
  for (const t of S.data.tabs) if (t.encrypted && !t.locked) for (const c of t.categories || []) for (const l of c.links || []) if (l && !l.divider && l.url) out.push({ title: String(l.title || l.url), text: String(l.url), where: (t.title || 'Tab') + (c.title ? ' › ' + c.title : ''), href: l.url });
  return out;
}); }
async function load() {
  let j;
  // (1.72.0) instant: the last data this tab got while you were logged in shows at once; the fresh data replaces it below
  const HB = /** @type {any} */ (window).HUB, sn = HB && HB.snap && !S.data.tabs.length ? HB.snap.get('links') : null;
  if (sn && sn.data) {
    S.auth = !!sn.auth; S.setup = !!sn.setup; S.locked = !!sn.locked; S.rev = sn.rev || ''; S.data = normalize(sn.data, !S.auth);
    S.visits = sn.visits && typeof sn.visits === 'object' ? sn.visits : {}; markEnc(); pickTab(); applyLook(); HB.snap.stale(true); render();
  }
  try {
    const w = /** @type {any} */ (window), early = w.__bmGet ? await w.__bmGet : null; w.__bmGet = null;   // used once: later reloads ask the server again
    j = early && early.r.ok && early.j && early.j.data ? early.j : await api('get');
  }
  catch (e) {
    if (HB && HB.snap) HB.snap.stale(false);
    if (S.data.tabs.length) { toast('Could not reach the server: ' + e.message, true); return; }
    $('#grid').innerHTML = '';
    $('#grid').append(h('div', { class: 'loading' }, 'Could not load bookmarks: ' + e.message + '. Check that api.php is uploaded and PHP is enabled.'));
    return;
  }
  S.auth = !!j.auth; S.setup = !!j.setup; S.locked = !!j.locked; S.rev = j.rev || '';
  if (HB && HB.snap) { HB.snap.put('links', S.auth ? j : null); HB.snap.stale(false); }
  S.data = normalize(j.data, !S.auth);
  S.visits = S.auth && j.visits && typeof j.visits === 'object' ? j.visits : {};
  noFile = new Set(Array.isArray(j.missingIcons) ? j.missingIcons : []);   // (1.64.12) saved icons whose file is gone: show the letter, and Fetch Icons > Only Missing gets them again   // visit counts: only you get them
  const enc = markEnc(), mine = S.data;
  try {
    if (!S.auth && !S.locked) localStorage.setItem('bm-cache', JSON.stringify(j.data));
    else localStorage.removeItem('bm-cache');
  } catch {}
  pickTab(); applyLook();
  if (enc && KEY) await decryptAll();   // the key is already in memory: quick
  S.opening = enc && !KEY && CAN_ENC && !!vault();   // a kept key may open the tabs: draw the page first and unlock in the background
  render();
  takeImport();
  if (S.opening) {
    try { await openKept(); } catch {}
    if (S.data === mine) { S.opening = false; render(); }
  }
}
/* (1.72.0) the Import Center hands over links (Raindrop, Pocket, bookmarks): a new private tab with a category per folder or tag (when all
   all the tabs are in use, the categories go into the first tab that is not locked); a link already anywhere in Links is left out. With Undo. */
function takeImport() {
  const HB = /** @type {any} */ (window).HUB, p = HB && HB.importTake ? HB.importTake('links') : null;
  if (!p || !Array.isArray(p.cats)) return;
  if (!S.auth) { toast('Log in to add what you imported.', true); return; }
  const have = new Set(); S.data.tabs.forEach(t => (t.categories || []).forEach(c => (c.links || []).forEach(l => { if (l && l.url) have.add(l.url); })));
  let dup = 0;
  const cats = p.cats.map((/** @type {any} */ c, /** @type {number} */ i) => ({ id: uid(), title: String(c.title || 'Links').slice(0, 60), col: i % COLS,
    links: (Array.isArray(c.links) ? c.links : []).filter((/** @type {any} */ l) => { if (!l || !/^https?:\/\//i.test(String(l.url))) return false; if (have.has(l.url)) { dup++; return false; } have.add(l.url); return true; })
      .map((/** @type {any} */ l) => ({ id: uid(), title: String(l.title || l.url).slice(0, 120), url: String(l.url) })) })).filter(c => c.links.length);
  const n = cats.reduce((a, c) => a + c.links.length, 0);
  if (!n) { toast('Nothing new to add' + (dup ? ': every link is already in Links.' : '.')); return; }
  /** @type {any} */
  let tab = null, added = null;
  if (S.data.tabs.length < MAX_TABS) { tab = { id: uid(), title: String(p.tab || 'Imported').slice(0, 40), categories: cats, private: true }; S.data.tabs.push(tab); S.tab = tab.id; added = tab; }
  else { tab = S.data.tabs.find(t => !t.encrypted); if (!tab) { toast('Every tab is locked: unlock one, or make room for a new tab.', true); return; } tab.categories.push(...cats); S.tab = tab.id; }
  persist('Imported');
  const msg = 'Added ' + n + (n === 1 ? ' link' : ' links') + ' from ' + (p.src || 'the import') + '.' + (dup ? ' ' + dup + (dup === 1 ? ' was' : ' were') + ' already here.' : '');
  if (HB.undo) HB.undo(msg, () => {
    if (added) { S.data.tabs = S.data.tabs.filter(t => t !== added); S.tab = S.data.tabs[0] ? S.data.tabs[0].id : ''; }
    else tab.categories = tab.categories.filter((/** @type {any} */ c) => !cats.includes(c));
    persist('Import undone');
  }); else toast(msg);
}

// Saving: changes made while a save is running are sent together right after it.
let saving = Promise.resolve(), inFlight = false, again = false, pendingMsg = null;
function persist(msg = 'Saved', redraw = true) {   // redraw false: only the look changed (colors, text sizes, the title), which the CSS variables already show
  if (msg) pendingMsg = msg;
  if (redraw) render(); else renderTabs();
  if (inFlight) { again = true; return saving; }
  inFlight = true;
  saving = (async () => {
    do {
      again = false;
      const m = pendingMsg;
      pendingMsg = null;
      try {
        const snapshot = await buildSnapshot(), redraw = embeddedAny; embeddedAny = false;
        const j = await api('save', { rev: S.rev, data: snapshot });
        S.rev = j.rev; if (m) toast(m);
        if (redraw) render();
        const map = j.iconMap || {};
        if (Object.keys(map).length) { allLinks().forEach(l => { if (map[l.icon]) l.icon = map[l.icon]; }); render(); }
      } catch (e) {
        again = false;
        if (e.status === 401) endSession('Session ended. Log in again to keep editing.', true);
        else toast(e.message, true);
      }
    } while (again);
    inFlight = false;
  })();
  return saving;
}
addEventListener('beforeunload', e => { if (inFlight) { e.preventDefault(); e.returnValue = ''; } });

