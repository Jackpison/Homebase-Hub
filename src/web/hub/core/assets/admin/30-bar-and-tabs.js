  function pBar(p) {
    p.insertAdjacentHTML('beforeend', barHtml() + '<h3>Tabs</h3><p>Drag a tab to move it (or Alt + Up and Down on its name), rename it, or switch it off to hide it. Home is your logo and site name in the bar.</p>' +
      '<div class="ix-tabp" id="ix-tabp" aria-hidden="true"></div><div class="ix-tabl" id="ix-tabl"></div><div class="ix-row"><button type="button" class="ix-btn" id="ix-tabreset">Reset Names and Order</button></div>');
    bindBar(p);
    tabEditor(p.querySelector('#ix-tabl'), p.querySelector('#ix-tabp'));
    p.querySelector('#ix-tabreset').onclick = function () { draft.pages = []; tabEditor(p.querySelector('#ix-tabl'), p.querySelector('#ix-tabp')); preview(); markDirty(true); };
  }
  /* Settings > Appearance > Bar, the Tabs part (1.67.2; General > Tabs before 1.70.0, on Look & Bar since 1.78.0): one row per page with its colour tile (as in the bar), its name and a switch; drag a row to move it.
     A strip above shows the bar as it will look. Home is not listed: the logo and site name lead there (the dock shows it first). */
  var GRIP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01"/></svg>';
  function tabEditor(box, strip) {
    var all = pageList(draft).map(function (q) { var d = PAGE_DEF.filter(function (x) { return x[0] === q[0]; })[0];
      return { id: q[0], name: q[1] === d[1] ? '' : q[1], hide: q[4], def: d[1], icon: d[3] }; });
    var home = all.filter(function (x) { return x.id === 'home'; })[0], list = all.filter(function (x) { return x.id !== 'home'; });
    // every change marks the window as changed at once: a drag ends without a click, so Save Settings stayed grey until another click (1.67.2)
    var keep = function () { draft.pages = (home ? [home] : []).concat(list).map(function (x) { return { id: x.id, name: x.name, hide: x.hide }; }); preview(); markDirty(true); drawStrip(); };
    var tile = function (x) { return '<span class="ix-pgt" style="--c:' + K.pageColor(x.id) + '" aria-hidden="true">' + (K.pageTile(x.id) || svg(x.icon)) + '</span>'; };
    var dragFrom = -1;
    function drawStrip() {
      if (!strip) return;
      strip.innerHTML = list.filter(function (x) { return !x.hide; }).map(function (x) { return '<span class="ix-tabc">' + tile(x) + '<b>' + esc(x.name || x.def) + '</b></span>'; }).join('');
    }
    function draw() {
      box.innerHTML = list.map(function (x, i) {
        return '<div class="ix-pgr' + (x.hide ? ' off' : '') + '" draggable="true" data-i="' + i + '"><span class="ix-pgg" title="Drag to move">' + GRIP + '</span>' + tile(x) +
          '<input type="text" maxlength="20" value="' + esc(x.name) + '" placeholder="' + esc(x.def) + '" aria-label="Name of the ' + esc(x.def) + ' tab (Alt + Up or Down moves it)" data-k="name">' +
          '<span class="ix-pgh">' + (x.hide ? 'Hidden' : '') + '</span>' +
          '<label class="ix-pgs" title="Show This Tab"><input type="checkbox" class="ix-sw" data-k="show" aria-label="Show the ' + esc(x.def) + ' tab"' + (x.hide ? '' : ' checked') + '></label></div>';
      }).join('');
      drawStrip();
    }
    function move(i, j) { if (j < 0 || j >= list.length || i === j) return false; var x = list.splice(i, 1)[0]; list.splice(j, 0, x); draw(); keep(); return true; }
    box.oninput = function (e) { var r = e.target.closest('.ix-pgr'); if (r && e.target.dataset.k === 'name') { list[+r.dataset.i].name = e.target.value.trim(); keep(); } };
    box.onchange = function (e) {
      var r = e.target.closest('.ix-pgr'); if (!r || e.target.dataset.k !== 'show') return;
      var x = list[+r.dataset.i];
      if (!e.target.checked && list.filter(function (y) { return !y.hide; }).length === 1) { e.target.checked = true; toast('Keep at least one tab.'); return; }
      x.hide = !e.target.checked; r.classList.toggle('off', x.hide); r.querySelector('.ix-pgh').textContent = x.hide ? 'Hidden' : ''; keep();
    };
    // from the keyboard: Alt + Up or Down on a tab's name moves it one place, and the name keeps the focus
    box.onkeydown = function (e) {
      if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
      var r = e.target.closest('.ix-pgr'); if (!r) return;
      var i = +r.dataset.i, j = i + (e.key === 'ArrowUp' ? -1 : 1);
      e.preventDefault(); if (move(i, j)) { var n = box.querySelector('.ix-pgr[data-i="' + j + '"] input[data-k=name]'); if (n) n.focus(); }
    };
    box.ondragstart = function (e) { var r = e.target.closest && e.target.closest('.ix-pgr'); if (!r || e.target.tagName === 'INPUT') return; dragFrom = +r.dataset.i; r.classList.add('drag'); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', r.dataset.i); } catch (er) {} };
    box.ondragover = function (e) {
      if (dragFrom < 0) return; e.preventDefault();
      var r = e.target.closest('.ix-pgr'); box.querySelectorAll('.over').forEach(function (x) { if (x !== r) x.classList.remove('over'); }); if (r && +r.dataset.i !== dragFrom) r.classList.add('over');
    };
    box.ondrop = function (e) { var r = e.target.closest('.ix-pgr'); if (dragFrom >= 0 && r) { e.preventDefault(); move(dragFrom, +r.dataset.i); } dragFrom = -1; };
    box.ondragend = function () { dragFrom = -1; box.querySelectorAll('.drag,.over').forEach(function (x) { x.classList.remove('drag'); x.classList.remove('over'); }); };
    draw();
  }
