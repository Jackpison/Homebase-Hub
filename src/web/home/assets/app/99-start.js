/* ======================================================================
   START
   ====================================================================== */
renderWidgets();
// the pad needs the login's security token. (1.79.11) Opened from a saved or restored copy of the page (the app on a phone), it can arrive without the
// widgets although you are logged in: the answer here brings them in, so Home looks the same every time.
api('state').then(st => { CSRF = st.csrf || CSRF; if (st.admin && st.widgets && !WCFG) { setWidgets(st.widgets); return 'set'; } }).catch(() => {}).then(r => { if (WCFG && r !== 'set') loadWidgets(); });
// coming back to Home later (another tab, or the phone woke up): the tasks may have changed, and the date too
let wSeen = Date.now();
document.addEventListener('visibilitychange', () => {
  if (document.hidden || !WCFG || Date.now() - wSeen < 30000) return;
  wSeen = Date.now();
  if (wOn('weather') && (!WD.weather || WD.weather.saved < Date.now() / 1000 - 1800)) loadWeather();
  if (wOn('recent')) loadRecent(); if (wOn('files')) loadFilesW(); if (wOn('status')) loadStatus(); if (wOn('most')) loadMost();
  if (wOn('today') || wOn('calendar') || wOn('bills')) loadTasks(); else renderWidgets();
});
// ?bg=picsum | bing | wikimedia | wallhaven | artic | unsplash | pixabay | pixabay_video | upload  forces a source (handy for testing)
BG.start();
$('#nextBg').addEventListener('click', () => BG.next());
addEventListener('keydown', e => {
  if (/** @type {Element} */ (e.target).matches('input, textarea') || $$('dialog[open]').length) return;
  if (e.key.toLowerCase() === 'e' && !e.ctrlKey && !e.metaKey && !e.altKey) { if (editing) exitEdit(); else $('#editBtn').click(); }   // (1.82.1) also with Caps Lock on
  if (e.key === 'Escape' && editing) exitEdit();
});
})();
