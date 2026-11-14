  /* ---------- (1.69.0) Stepper: a flow of a few steps in one box. Ported to plain JavaScript from React Bits' Stepper (David Haz, MIT +
     Commons Clause; credited in THIRD-PARTY.md). The current step sits on a raised tile that slides along; a finished step turns into a tick
     that draws itself; the content slides and the box grows or shrinks to the new step; Back / Continue below (Continue says the last action).
     All steps are built at once and only shown one at a time, so their fields and handlers stay as they are.
     o = { steps: [{ title, html, enter(pane, ctl), next(pane, ctl) -> false to stay (or a promise) }], kind: 'numbers' | 'dots' | 'bars',
           linear (only back to steps already reached), complete (last button), danger (red last button), skip (a Skip button: function),
           done (html shown after the last step), onDone(ctl), frame (a glass panel around it), back, cont }
     Also: lastId, lastClass, lastHtml (the last button's id, class and inside), skipText, start (the step to open on). Returns { el, go(n), pane(n), err(text), block(n, on), fin (the done pane), step() }. */
  /* (1.72.0) a short message a screen reader reads out (a step changed, a copy worked, how many results), without moving the focus */
  var liveT = 0;
  function announce(text) {
    var el = document.getElementById('ix-live');
    if (!el) { if (!document.body) return; el = document.createElement('div'); el.id = 'ix-live'; el.className = 'ix-sr'; el.setAttribute('aria-live', 'polite'); el.setAttribute('role', 'status'); document.body.appendChild(el); }
    clearTimeout(liveT); el.textContent = ''; liveT = setTimeout(function () { el.textContent = String(text || ''); }, 60);   // emptied first, so the same words are read again
  }
  function stepper(host, o) {
    var steps = o.steps, total = steps.length, kind = o.kind || 'numbers', cur = 1, reached = 1, busy = false, blocked = {};
    var TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
    var root = document.createElement('div'); root.className = 'ix-st' + (o.frame ? ' ix-st-frame' : '');
    var head = document.createElement('div'); head.className = 'ix-st-head ix-st-' + kind;
    var view = document.createElement('div'); view.className = 'ix-st-view';   // (1.72.0) no aria-live here: it read the whole step out; announce() says which step it is
    var foot = document.createElement('div'); foot.className = 'ix-st-foot';
    var panes = steps.map(function (st, i) {
      var p = document.createElement('div'); p.className = 'ix-st-pane'; p.tabIndex = -1; p.hidden = i > 0;
      p.setAttribute('role', 'group'); p.setAttribute('aria-label', 'Step ' + (i + 1) + ' of ' + steps.length + ': ' + (st.title || ''));
      p.innerHTML = (st.html || '') + '<p class="ix-err ix-st-err" role="alert"></p>'; view.appendChild(p); return p;
    });
    var fin = document.createElement('div'); fin.className = 'ix-st-pane ix-st-done'; fin.hidden = true; fin.tabIndex = -1; view.appendChild(fin);
    root.append(head, view, foot); host.innerHTML = ''; host.appendChild(root);
    var status = function (n) { return cur > total || n < cur ? 'done' : n === cur ? 'active' : 'upcoming'; };
    var can = function (n) { return !busy && n !== cur && cur <= total && (!o.linear || n <= reached); };
    function drawHead() {
      if (kind === 'bars') { head.innerHTML = '<div class="ix-st-bars">' + steps.map(function (st, i) { return '<i' + (cur > i ? ' class="on"' : '') + '><b></b></i>'; }).join('') + '</div>'; return; }
      if (kind === 'dots') {
        head.innerHTML = '<div class="ix-st-dots">' + steps.map(function (st, i) { var n = i + 1;
          return '<button type="button" data-n="' + n + '" data-s="' + status(n) + '" aria-label="Step ' + n + ': ' + esc(st.title) + '"' + (n === cur ? ' aria-current="step"' : '') + (can(n) ? '' : ' disabled') + '><i></i></button>'; }).join('') + '</div>';
      } else {
        if (!head.firstChild) head.innerHTML = '<div class="ix-st-track"><span class="ix-st-glider" aria-hidden="true"></span>' + steps.map(function (st, i) {
          return '<button type="button" class="ix-st-seg" data-n="' + (i + 1) + '"><span class="ix-st-badge"></span><span class="ix-st-name">' + esc(st.title) + '</span><span class="ix-st-sr"></span></button>'; }).join('') + '</div>';
        head.querySelectorAll('.ix-st-seg').forEach(function (b) {
          var n = +b.dataset.n, s = status(n), bd = b.firstChild; b.dataset.s = s; b.disabled = !can(n);
          b.querySelector('.ix-st-sr').textContent = s === 'done' ? ', done' : '';   // the name is what shows (number and title), plus ", done"
          if (n === cur) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
          if (bd.dataset.s !== s) { bd.dataset.s = s; bd.innerHTML = s === 'done' ? TICK : String(n); }
        });
        placeGlider(true);
      }
      head.querySelectorAll('[data-n]').forEach(function (b) { b.onclick = function () { go(+b.dataset.n); }; });
    }
    function placeGlider(anim) {
      var g = head.querySelector('.ix-st-glider'), seg = head.querySelector('.ix-st-seg[data-n="' + Math.min(cur, total) + '"]');
      if (!g || !seg) return;
      if (!anim) g.style.transition = 'none';
      g.style.width = seg.offsetWidth + 'px'; g.style.height = seg.offsetHeight + 'px';
      g.style.transform = 'translate(' + seg.offsetLeft + 'px,' + seg.offsetTop + 'px)'; g.style.opacity = cur > total ? '0' : '1';
      if (!anim) { void g.offsetWidth; g.style.transition = ''; }
    }
    function drawFoot() {
      if (cur > total) { foot.hidden = true; return; }
      var last = cur === total;
      foot.innerHTML = '<button type="button" class="ix-btn ix-st-back"' + (cur <= 1 ? ' data-h' : '') + '>' + esc(o.back || 'Back') + '</button>' +
        (o.skip ? '<button type="button" class="ix-btn ix-st-skip">' + esc(o.skipText || 'Skip') + '</button>' : '') +
        '<button type="button" class="ix-btn ' + (last && o.danger ? 'danger' : 'pri') + (last && o.lastClass ? ' ' + o.lastClass : '') + ' ix-st-next"' + (last && o.lastId ? ' id="' + o.lastId + '"' : '') + (blocked[cur] ? ' disabled' : '') + '>' +
          (last && o.lastHtml ? o.lastHtml : esc(last ? (o.complete || 'Done') : (o.cont || 'Continue'))) + '</button>';
      foot.querySelector('.ix-st-back').onclick = function () { go(cur - 1); };
      foot.querySelector('.ix-st-next').onclick = forward;
      if (o.skip) foot.querySelector('.ix-st-skip').onclick = function () { o.skip(ctl); };
    }
    function err(t) { var e = panes[Math.min(cur, total) - 1].querySelector('.ix-st-err'); if (e) e.textContent = t || ''; }
    function forward() {
      if (busy || blocked[cur]) return;
      var st = steps[cur - 1], b = foot.querySelector('.ix-st-next'), label = b.innerHTML;
      err('');
      var r = st.next ? st.next(panes[cur - 1], ctl) : true;
      if (r && typeof r.then === 'function') {
        busy = true; b.disabled = true; if (!o.lastHtml || cur < total) b.textContent = 'Working…';
        r.then(function (ok) { busy = false; if (b.isConnected) { b.disabled = !!blocked[cur]; b.innerHTML = label; } if (ok !== false) go(cur + 1); },
          function (e) { busy = false; if (b.isConnected) { b.disabled = !!blocked[cur]; b.innerHTML = label; } err((e && e.message) || "Can't reach the server."); });
      } else if (r !== false) go(cur + 1);
    }
    function go(n) {
      n = Math.max(1, Math.min(total + 1, n));
      if (n === cur || busy) return;
      var dir = n > cur ? 1 : -1, from = view.offsetHeight, old = cur <= total ? panes[cur - 1] : fin;
      cur = n; reached = Math.max(reached, n);
      var now = n > total ? fin : panes[n - 1];
      if (n > total) { fin.innerHTML = o.done || ''; }
      old.hidden = true; now.hidden = false;
      var moving = now.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (moving) {
        now.animate([{ transform: 'translateX(' + (dir * 36) + 'px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.34,1.3,.64,1)' });
        var to = view.offsetHeight;
        if (Math.abs(to - from) > 1) view.animate([{ height: from + 'px' }, { height: to + 'px' }], { duration: 420, easing: 'cubic-bezier(.34,1.3,.64,1)' });
      }
      drawHead(); drawFoot();
      if (n <= total) { var st = steps[n - 1]; if (st.enter) st.enter(now, ctl); var f = now.querySelector('input:not([type=hidden]):not([disabled]),select,textarea'); (f || now).focus({ preventScroll: true }); announce('Step ' + n + ' of ' + total + ': ' + (st.title || '')); }
      else { if (o.onDone) o.onDone(ctl); if (fin.isConnected && !fin.contains(document.activeElement)) fin.focus({ preventScroll: true }); announce('Done.'); }
    }
    // block(n, on): Continue stays off on step n until it is unblocked (a file not chosen yet, a box not ticked)
    var block = function (n, on) { blocked[n] = !!on; var b = foot.querySelector('.ix-st-next'); if (b && n === cur && !busy) b.disabled = !!on; };
    var ctl = { el: root, go: go, err: err, block: block, fin: fin, pane: function (n) { return panes[n - 1]; }, step: function () { return cur; } };
    root.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox' && e.target.type !== 'radio') { e.preventDefault(); forward(); } });
    if (window.ResizeObserver) new ResizeObserver(function () { root.classList.toggle('ix-st-tight', root.clientWidth < 420); placeGlider(false); }).observe(root);
    if (o.start > 1 && o.start <= total) { panes[0].hidden = true; cur = reached = o.start; panes[cur - 1].hidden = false; }   // start: open on a later step
    drawHead(); drawFoot();
    if (steps[cur - 1].enter) steps[cur - 1].enter(panes[cur - 1], ctl);
    return ctl;
  }

