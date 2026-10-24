/* Light or dark follows the visitor's device. The toggle overrides it, and the choice (and the look) is remembered per browser. */
(function () {
  var r = document.documentElement; r.classList.add('js');
  try {
    var t = localStorage.getItem('hh-theme'); if (t === 'light' || t === 'dark') r.dataset.theme = t;
    var l = localStorage.getItem('hh-look'); if (l && /^[a-z]+$/.test(l)) r.dataset.look = l;
  } catch (e) {}
})();
document.addEventListener('click', function (ev) {
  if (!ev.target.closest || !ev.target.closest('.mode')) return;
  var r = document.documentElement, cur = r.dataset.theme || (window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'), next = cur === 'light' ? 'dark' : 'light';
  r.dataset.theme = next;
  try { localStorage.setItem('hh-theme', next); } catch (e) {}
});
