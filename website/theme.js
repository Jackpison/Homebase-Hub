/* Light or dark follows the visitor's device. The toggle overrides it, and the choice (and the look) is remembered per browser. */
(function () {
  var r = document.documentElement; r.classList.add('js');
  try {
    var t = localStorage.getItem('hh-theme'); if (t === 'light' || t === 'dark') r.dataset.theme = t;
  } catch (e) {}
})();
document.addEventListener('click', function (ev) {
  if (!ev.target.closest || !ev.target.closest('.mode')) return;
  var r = document.documentElement, cur = r.dataset.theme || (window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'), next = cur === 'light' ? 'dark' : 'light';
  var apply = function () { r.dataset.theme = next; };
  try { localStorage.setItem('hh-theme', next); } catch (e) {}
  /* like the app: the new theme grows as a circle from the button you pressed (no motion at all when the device asks for less) */
  if (!document.startViewTransition || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return apply();
  var b = ev.target.closest('.mode').getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2,
      rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  r.classList.add('vt-circ');
  var vt = document.startViewTransition(apply), done = function () { r.classList.remove('vt-circ'); };
  vt.ready.then(function () {
    r.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + rad + 'px at ' + x + 'px ' + y + 'px)'] }, { duration: 550, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' });
  }).catch(done);
  vt.finished.then(done, done);
});
