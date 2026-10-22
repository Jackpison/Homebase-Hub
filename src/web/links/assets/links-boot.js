/* apply saved theme + colors before anything paints (no flash) */
(function () {
  var r = document.documentElement;
  try {
    var m = localStorage.getItem('bm-theme') === 'light' ? 'light' : 'dark';
    r.setAttribute('data-theme', m);
    var look = JSON.parse(localStorage.getItem('bm-look') || 'null');
    if (look) {
      var c = look[m] || {};
      for (var k in c) if (/^#[0-9a-f]{6}$/i.test(c[k])) r.style.setProperty('--' + k, c[k]);
      if (look.sizes) for (var z in look.sizes) r.style.setProperty('--fs-' + z, look.sizes[z] + 'px');
      if (look.title) document.title = look.title;
    }
  } catch (e) {}
})();
