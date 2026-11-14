  /* ---------- 3b. the edit bar (1.53.5): while a page is being edited, its tools sit in one pill at the bottom, the same on
     every page (Home's look). The page's own items in order, its Settings last, then Done. A page's old bar is marked
     data-hub-ebar and hidden (html[data-ix-ebar] in shell.css); its data-hub-hint is said once per visit when editing starts.
     Each page's Settings chooses Icons Only or Icons and Text: a select marked data-ix-editbar, saved with that dialog's
     data-ix-save button into the site setting editBar ({links: 'text'}; icons is the default). Phones always show icons. */
  H.setAttribute('data-ix-ebar', '');
  var editBarMode = function () { return S.editBar && S.editBar[APP] === 'text' ? 'text' : 'icons'; };
  var ebarKey = '', ebarEnts = [], ebarWas = false;
  function barEntries() {
    var all = hubItems(), out = [], groups = {};
    all.filter(function (it) { return !it.main; }).concat(all.filter(function (it) { return it.main; })).forEach(function (it) {
      var run = function () { it.el.click(); };
      if (!it.group) { out.push({ label: it.label, icon: it.icon, run: run }); return; }
      var g = groups[it.group];
      if (!g) { g = groups[it.group] = { label: it.group, icon: it.icon, sub: [] }; g.run = function (btn) { popMenu(btn, g.sub); }; out.push(g); }
      g.sub.push({ label: it.label, icon: it.icon, run: run });
    });
    return out;
  }
  /* (1.65.1) the edit bar's look comes from Uiverse.io by firemonste_8052, "lucky-catfish-97" (MIT; see web/hub/docs/THIRD-PARTY.md): round buttons
     in a dark pill; on hover the button lifts a little, its icon takes the colour of what it does, and its name pops up above in a light bubble. */
  function ebTone(label) {
    return /delet|remov|clear|erase/i.test(label) ? 'red' : /^(add|new)\b|import|paste/i.test(label) ? 'green' : /export|backup|download|fetch|save/i.test(label) ? 'blue' :
      /setting|color|colour|look|text size|theme/i.test(label) ? 'violet' : 'accent';
  }
  function drawEditBar() {
    var el = document.getElementById('ix-ebar'), on = editing() && HAS_EDIT;
    if (on && !ebarWas) {   // editing just started: the page's hint, once per visit
      var hn = document.querySelector('[data-hub-hint]'), hk = 'hub-hint-' + APP;
      try { if (hn && !sessionStorage.getItem(hk)) { sessionStorage.setItem(hk, '1'); toast(hn.getAttribute('data-hub-hint')); } } catch (e) {}
    }
    ebarWas = on;
    H.classList.toggle('ix-editing', on);   // (1.67.1) the dock steps aside while editing (shell.css)
    if (!on) { if (el) el.hidden = true; var tp = document.getElementById('ix-ebtip'); if (tp) tp.remove(); return; }
    if (!el) {
      el = document.createElement('div'); el.id = 'ix-ebar'; el.setAttribute('role', 'toolbar'); el.setAttribute('aria-label', 'Edit Tools');
      el.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        if (b.hasAttribute('data-ix-done')) { closePop(); return doneEdit(); }
        var it = ebarEnts[+b.getAttribute('data-i')]; if (it) it.run(b);
      });
      document.body.appendChild(el);
    }
    ebarEnts = barEntries();
    var mode = editBarMode(), key = mode + '|' + ebarEnts.map(function (x) { return x.label; }).join('|');
    if (key !== ebarKey) {
      ebarKey = key; el.className = mode === 'text' ? 'ix-ebar-text' : '';
      el.innerHTML = ebarEnts.map(function (x, i) {
        return '<button type="button" class="ix-eb" data-i="' + i + '" data-c="' + ebTone(x.label) + '" aria-label="' + esc(x.label) + '" data-tip="' + esc(x.label) + '">' + svg(x.icon || ICON.edit) +
          '<span class="ix-ebl">' + esc(x.label) + '</span></button>';
      }).join('') + (ebarEnts.length ? '<span class="ix-ebsep" aria-hidden="true"></span>' : '') +
        '<button type="button" class="ix-eb ix-ebdone" data-ix-done aria-label="Done" data-tip="Done">' + svg(ICON.check) + '</button>';
    }
    el.hidden = false;
  }
  /* the Edit Bar choice in the page's Settings: shown when the dialog opens, saved with its Save button */
  function editBarPick() { [].forEach.call(document.querySelectorAll('[data-ix-editbar]'), function (s) { s.value = editBarMode(); }); }
  function watchEditBarPick() {
    [].forEach.call(document.querySelectorAll('[data-ix-editbar]'), function (s) {
      var d = s.closest('dialog'); if (!d || d._ixEb) return; d._ixEb = true;
      new MutationObserver(function () { if (d.open) editBarPick(); }).observe(d, { attributes: true, attributeFilter: ['open'] });
    });
    editBarPick();
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-ix-save]'), d = b && b.closest('dialog'), sel = d && d.querySelector('[data-ix-editbar]');
    if (!sel || !S.admin || sel.value === editBarMode()) return;
    var eb = {}; Object.keys(S.editBar || {}).forEach(function (k) { eb[k] = S.editBar[k]; });
    if (sel.value === 'text') eb[APP] = 'text'; else delete eb[APP];
    api('settings', { settings: { editBar: eb } }).then(function (j) {
      if (!j.ok || !j.state) { toast(j.error || 'The Edit Bar choice could not be saved.'); return; }
      S.editBar = j.state.editBar; remember(S); ebarKey = ''; drawEditBar();
    }).catch(function () { toast('The Edit Bar choice could not be saved.'); });
  }, true);

