/* Dark is the default; the light choice is remembered per browser. */
try { if (localStorage.getItem('hh-theme') === 'light') document.documentElement.dataset.theme = 'light'; } catch (e) {}
document.addEventListener('click', function (ev) {
  if (!ev.target.closest || !ev.target.closest('.mode')) return;
  var r = document.documentElement, light = r.dataset.theme !== 'light';
  if (light) r.dataset.theme = 'light'; else delete r.dataset.theme;
  try { localStorage.setItem('hh-theme', light ? 'light' : 'dark'); } catch (e) {}
});
