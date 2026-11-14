/* ======================================================================
   START
   ====================================================================== */
renderWidgets();
if (WCFG) api('state').then(st => { CSRF = st.csrf || CSRF; }).catch(() => {}).finally(loadWidgets);   // the pad needs the login's security token
// coming back to Home later (another tab, or the phone woke up): the tasks may have changed, and the date too
let wSeen = Date.now();
document.addEventListener('visibilitychange', () => {
  if (document.hidden || !WCFG || Date.now() - wSeen < 30000) return;
  wSeen = Date.now();
  if (wOn('weather') && (!WD.weather || WD.weather.saved < Date.now() / 1000 - 1800)) loadWeather();
  if (wOn('recent')) loadRecent(); if (wOn('files')) loadFilesW(); if (wOn('status')) loadStatus();
  if (wOn('today') || wOn('calendar') || wOn('bills')) loadTasks(); else renderWidgets();
});
// ?bg=picsum | bing | wikimedia | wallhaven | artic | unsplash | pixabay | pixabay_video | upload  forces a source (handy for testing)
BG.start();
$('#nextBg').addEventListener('click', () => BG.next());
addEventListener('keydown', e => {
  if (/** @type {Element} */ (e.target).matches('input, textarea') || $$('dialog[open]').length) return;
  if (e.key === 'e') { if (editing) exitEdit(); else $('#editBtn').click(); }
  if (e.key === 'Escape' && editing) exitEdit();
});
})();
