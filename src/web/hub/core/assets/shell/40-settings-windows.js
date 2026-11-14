  /* ---------- (1.61.0) buttons instead of a dropdown ----------
     <select data-ix-seg> with 2 or 3 options becomes one row of buttons (role radiogroup). The select stays, hidden, and is the
     truth: a click sets it and fires "change"; code that sets select.value is followed on the next change or when the window opens. */
  function segBuild(sel) {
    if (sel._ixSeg || sel.options.length > 3 || !sel.options.length) return; sel._ixSeg = true;   // an empty one waits for its options
    var g = document.createElement('div'); g.className = 'ix-sgc'; g.setAttribute('role', 'radiogroup');
    var lab = sel.id && document.querySelector('label[for="' + sel.id + '"]'); if (lab) { if (!lab.id) lab.id = sel.id + '-l'; g.setAttribute('aria-labelledby', lab.id); } else if (sel.getAttribute('aria-label')) g.setAttribute('aria-label', sel.getAttribute('aria-label'));
    [].forEach.call(sel.options, function (o) {
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.v = o.value; b.textContent = o.textContent;
      b.addEventListener('click', function () { if (sel.value === o.value) return; sel.value = o.value; sel.dispatchEvent(new Event('change', { bubbles: true })); paint(); });
      g.appendChild(b);
    });
    function paint() { [].forEach.call(g.children, function (b) { var on = b.dataset.v === sel.value; b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; }); }
    g.addEventListener('keydown', function (e) {
      var k = e.key, d = k === 'ArrowRight' || k === 'ArrowDown' ? 1 : k === 'ArrowLeft' || k === 'ArrowUp' ? -1 : 0; if (!d) return;
      e.preventDefault(); var bs = [].slice.call(g.children), i = bs.indexOf(document.activeElement); if (i < 0) i = bs.findIndex(function (b) { return b.dataset.v === sel.value; });
      var n = bs[(i + d + bs.length) % bs.length]; n.focus(); n.click();
    });
    sel.classList.add('ix-sgc-h'); sel.setAttribute('aria-hidden', 'true'); sel.tabIndex = -1; sel.parentNode.insertBefore(g, sel.nextSibling);
    sel._ixSegPaint = paint; sel.addEventListener('change', paint); paint();
    var d = sel.closest('dialog'); if (d) new MutationObserver(function () { if (d.open) paint(); }).observe(d, { attributes: true, attributeFilter: ['open'] });
    var pv = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');   // setting .value from a page's code repaints too
    Object.defineProperty(sel, 'value', { configurable: true, get: function () { return pv.get.call(sel); }, set: function (v) { pv.set.call(sel, v); paint(); } });
  }
  var SEG_SEL = 'select[data-ix-seg],select[data-ix-editbar]';
  function segAll(root) { [].forEach.call((root || document).querySelectorAll(SEG_SEL), segBuild); }
  // (1.67.1) only what was just added is looked at: before, every change anywhere on the page searched the whole page again
  function segAdded(list) {
    list.forEach(function (m) { if (m.target.nodeType === 1 && m.target.matches(SEG_SEL)) segBuild(m.target);   // options filled in later
      [].forEach.call(m.addedNodes, function (n) { if (n.nodeType !== 1) return; if (n.matches(SEG_SEL)) segBuild(n); else if (n.firstElementChild) segAll(n); }); });
  }
  whenBody(function () { segAll(); new MutationObserver(segAdded).observe(document.body, { childList: true, subtree: true }); });

  /* ---------- (1.61.0) one Settings window for every page ----------
     dialog.ix-sdlg: title + close X on top, a scrolling body, the buttons in a footer. The X does what Cancel does. */
  /* (1.64.0) every window opens with its first text field ready to type in (a computer only: a phone would pop the keyboard),
     and the focus never sits on the close X (it drew a yellow ring); with no field the window itself takes it */
  function sdlgFocus(d, body, x) {
    new MutationObserver(function () {
      if (!d.open || (x && document.activeElement !== x)) return;
      var f = matchMedia('(pointer:fine)').matches && body.querySelector('input:not([type=hidden]):not([disabled]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=file]),select:not([disabled]),textarea:not([disabled])');
      if (f && f.offsetParent) f.focus(); else { d.setAttribute('tabindex', '-1'); d.focus({ preventScroll: true }); }
    }).observe(d, { attributes: true, attributeFilter: ['open'] });
  }
  /* (1.64.3) "Save Settings" looks dim until something in the window changes. Only how it looks: the button always works (a change made by a page's own code is not seen here, so it is never switched off). */
  function sdlgWatch(d, getBtn) {
    if (d._ixW) return; d._ixW = true;
    var base = '', touched = false, btn = null, timer = 0;
    function snap() { return [].map.call(d.querySelectorAll('input,select,textarea'), function (e) { return e.type === 'checkbox' || e.type === 'radio' ? (e.checked ? 1 : 0) : e.value; }).join('\u0001'); }
    function sync() { if (btn) btn.classList.toggle('ix-clean', !touched && snap() === base); }
    function arm() {
      btn = getBtn(); if (!btn || !/^save settings$/i.test(btn.textContent.trim())) { btn = null; return; }
      touched = false; base = snap(); sync(); clearTimeout(timer);
      timer = setTimeout(function () { if (!touched) { base = snap(); sync(); } }, 600);   // a window filled in just after it opened
    }
    new MutationObserver(function () { if (d.open) arm(); else clearTimeout(timer); }).observe(d, { attributes: true, attributeFilter: ['open'] });
    ['input', 'change'].forEach(function (ev) { d.addEventListener(ev, function () { touched = true; sync(); }); });
    d.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.ix-sgc button')) setTimeout(function () { touched = true; sync(); }, 0); });
    if (d.open) arm();
  }
  function sdlgBuild(d) {
    if (d._ixS) return; d._ixS = true;
    sdlgWatch(d, function () { return d.querySelector('.ix-sf [type=submit],.ix-sf .pri,.ix-sf .primary,.df .pri,.df .primary,.act .pri,.actions .primary'); });
    var plain = d.classList.contains('ix-plain');   // (1.61.9) a page's own window (Add Link, Edit Card...): the frame only, its fields keep their own layout
    if (d.querySelector('.dh,.ix-sh')) { var db = d.querySelector('.db'); if (db) db.classList.add('ix-sb'); /* (1.64.1) the same body as every window: its fields take the shared look */ if (!plain) sdlgDecorate(db, '.sh3'); sdlgFocus(d, d.querySelector('.db,.ix-sb') || d, d.querySelector('.dh [data-close],.dh .ib,.ix-sx')); return; }
    var c = d.querySelector(':scope>form') || (d.children.length === 1 && d.firstElementChild.tagName === 'DIV' ? d.firstElementChild : d), kids = [].slice.call(c.children);   // a form, a single wrapper (Info's Export) or the dialog itself
    var t = kids.filter(function (k) { return /^H[23]$/.test(k.tagName); })[0];
    var foot = kids.slice().reverse().filter(function (k) { return k.matches('.act,.actions'); })[0];
    if (!t || !foot) return;
    var h = document.createElement('div'); h.className = 'ix-sh';
    var x = document.createElement('button'); x.type = 'button'; x.className = 'ix-sx'; x.setAttribute('aria-label', 'Close');
    x.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    x.addEventListener('click', function () {
      var cb = foot.querySelector('[data-close],[value=cancel],[data-r=cancel],[id$=cancel],[id$=Cancel]');
      if (cb) cb.click(); else d.close();
    });
    c.insertBefore(h, t); h.appendChild(t); h.appendChild(x);
    var b = document.createElement('div'); b.className = 'ix-sb';
    kids.forEach(function (k) { if (k !== t && k !== foot) b.appendChild(k); });
    c.insertBefore(b, foot); foot.classList.add('ix-sf'); if (!plain) sdlgDecorate(b, 'h3,h4');
    d.setAttribute('aria-labelledby', t.id || (t.id = (d.id || 'sd') + '-t'));
    sdlgFocus(d, b, x);
  }
  /* (1.61.5) the look inside a Settings window: each section's rows in one rounded card, a small coloured tile in front of each row */
  var RT = [
    /* (1.79.3) the two tab privacy rows: one shield with a check; blue for Private Tab, green for Encrypted Tab (they must come before the wider words below) */
    [/^\s*private tab\b/i, 'M12 3l7.5 3v5.5c0 4.6-3.1 8-7.5 9.5-4.4-1.5-7.5-4.9-7.5-9.5V6zM8.7 12.3l2.4 2.4 4.2-4.6', '59,130,246'],
    [/^\s*encrypted tab\b/i, 'M12 3l7.5 3v5.5c0 4.6-3.1 8-7.5 9.5-4.4-1.5-7.5-4.9-7.5-9.5V6zM8.7 12.3l2.4 2.4 4.2-4.6', '62,207,142'],
    /* (1.64.3) Encrypt first: "Encrypt All Private Tabs" has the word private and took the green lock of Hide From Visitors; now it keeps its own purple shield */
    [/encrypt|passphrase|recovery/i, 'M12 3l7.5 3v5.5c0 4.6-3.1 8-7.5 9.5-4.4-1.5-7.5-4.9-7.5-9.5V6zM9.5 12.5h5v3.5h-5zM10.5 12.5v-1a1.5 1.5 0 0 1 3 0v1', '179,146,240'],
    [/only me|private|lock|password/i, 'M5 11h14v10H5zM8 11V8a4 4 0 0 1 8 0v3', '80,200,140'],
    [/google|icons?\b/i, 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18', '255,138,92'],
    [/colou?r|ribbon|accent|palette/i, 'M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2-.5-1.2.3-2.5 1.6-2.5H17a4 4 0 0 0 4-4c0-5-4-9.5-9-9.5zM7.5 11h.01M10 7.5h.01M14.5 7.5h.01', '255,107,129'],
    [/visit|count|analytics/i, 'M5 20V10M12 20V4M19 20v-7', '91,141,255'],
    [/text size|font/i, 'M4 19 9 5l5 14M6 14h6M16 19l2.5-7 2.5 7M17 17h3', '255,194,26'],
    [/edit bar|bar\b|menu/i, 'M3 15h18v4H3zM7 11l2-2 2 2', '76,201,240'],
    [/column|order|sort/i, 'M5 4v16M12 4v16M19 4v16', '91,141,255'],
    [/calendar|due|week|date|remind/i, 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', '255,107,129'],
    [/amount|price|stat|currency|spend/i, 'M12 3v18M16 7c-1-1-2.5-1.5-4-1.5-2.5 0-4 1-4 2.8 0 4 8 2 8 5.7 0 1.8-1.7 2.8-4 2.8-1.7 0-3.2-.6-4.2-1.7', '95,214,138'],
    [/share|link|webcal/i, 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1', '91,141,255'],
    [/storage|limit|disk|photo|upload|background/i, 'M4 7h16v10H4zM8 17v3M16 17v3M4 11h16', '255,138,92'],
    [/trash|delete|erase/i, 'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13', '170,170,170'],
    [/export|import|backup/i, 'M12 4v11m-4-4 4 4 4-4M5 20h14', '255,138,92'],
    [/title|name|page/i, 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4', '91,141,255'],
    [/welcome|hello|greeting/i, 'M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z', '255,194,26'],
    [/tint|opacity|blur|glass/i, 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z', '179,146,240'],
    [/widget|clock|show/i, 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', '76,201,240']
  ];
  function rowTile(text) {
    var hit = RT.filter(function (r) { return r[0].test(text); })[0] || [0, 'M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M8 15v4', '170,170,170'];
    var t = document.createElement('span'); t.className = 'ix-rt'; t.setAttribute('aria-hidden', 'true');
    t.style.setProperty('--c', 'rgb(' + hit[2] + ')');   // (1.66.1) a solid colour tile with a white icon, like the Settings menu
    t.innerHTML = '<svg viewBox="0 0 24 24"><path d="' + hit[1] + '"/></svg>'; return t;
  }
  function sdlgDecorate(body, headSel) {
    if (!body || body._ixG) return; body._ixG = true;
    var kids = [].slice.call(body.children), grp = null;
    kids.forEach(function (k) {
      if (k.matches(headSel)) { grp = null; return; }
      if (k.matches('.ix-sub')) { grp = null; return; }   // (1.64.0) a panel with its own headings and cards (Colors' Dark and Light sets): decorated below
      if (k.matches('.err,[id$=Err],.ix-sb-skip,.split,p:not(.hint)')) return;   // status lines and old leftovers stay outside the cards
      if (k.matches('p.hint,.hint') && !grp) return;
      // (1.61.6) a hidden row (Encrypt All Private Tabs) joins its card too, so it is not drawn loose once it shows; a hint stays with its row
      if (!grp) { grp = document.createElement('div'); grp.className = 'ix-grp'; body.insertBefore(grp, k); }
      grp.appendChild(k);
    });
    [].forEach.call(body.querySelectorAll('.ix-srow,.g-row:not(.stack)'), function (r) {
      var lab = r.querySelector('label,.g-label,span'); if (!lab || r.querySelector('.ix-rt') || r.classList.contains('ix-nt')) return;   // ix-nt: a row without a tile (a colour row has its own swatch)
      r.insertBefore(rowTile(r.getAttribute('data-rt') || (lab.firstChild && lab.firstChild.textContent || lab.textContent || '')), r.firstChild);
    });
    [].forEach.call(body.querySelectorAll(':scope>.ix-sub'), function (sub) { sdlgDecorate(sub, headSel); });
    [].forEach.call(body.querySelectorAll('.ix-grp'), function (g) { if (!g.children.length) g.remove(); });
  }
  function sdlgAll() { [].forEach.call(document.querySelectorAll('dialog.ix-sdlg'), sdlgBuild); [].forEach.call(document.querySelectorAll('dialog.sheet .sb'), function (b) { sdlgDecorateSheet(b); }); }
  function sdlgDecorateSheet(b) {   // Home's own sheets (1.64.3): the same tiles on every row (a row with a field or slider under it too), the same Save Settings dimming, and the focus off the X
    if (b._ixT) return; b._ixT = true;
    [].forEach.call(b.querySelectorAll('.g-row'), function (r) { var lab = r.querySelector('.g-label'); if (lab && !r.querySelector('.ix-rt')) r.insertBefore(rowTile(r.getAttribute('data-rt') || (lab.firstChild ? lab.firstChild.textContent : '')), r.firstChild); });
    var d = b.closest('dialog'); if (!d) return;
    sdlgFocus(d, b, d.querySelector('.sh .x'));
    sdlgWatch(d, function () { return d.querySelector('.sf .primary'); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sdlgAll); else sdlgAll();   // the dialogs are further down the page than the body

