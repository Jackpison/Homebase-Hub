/*! Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
/* The tabs of Links and Info (1.63.0): one code base for what they share, each page keeps its own look.
     HubTabs.icons / iconSvg   the 16 icons a tab can wear (the id is saved on the tab; empty = the page's own icon)
     HubTabs.drag(row, opts)   drag the tabs of a row to reorder them (mouse: move; touch: press, hold, drag; Alt+Left/Right from the keyboard)
     HubTabs.edit(cfg)         the Edit Tab / New Tab window, in the same look as the Settings windows
   Loaded after shell.js and before the page's own script. */
(function () {
  'use strict';
  /* ---------- icons: 24 x 24, drawn with a line, the colour comes from the tab ---------- */
  var ICONS = [
    { id: 'bookmark', name: 'Bookmark', d: 'M6 3h12v18l-6-4-6 4z' },
    { id: 'doc', name: 'Document', d: 'M19 8.2 14.2 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6M14 3.5V7a1 1 0 0 0 1 1h3.5M8.5 11.5h3.5M8.5 15h7M8.5 18.4h7' },
    { id: 'star', name: 'Star', d: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z' },
    { id: 'heart', name: 'Heart', d: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z' },
    { id: 'folder', name: 'Folder', d: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
    { id: 'home', name: 'Home', d: 'M4 11l8-7 8 7v9H4zM10 20v-6h4v6' },
    { id: 'globe', name: 'Globe', d: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18' },
    { id: 'briefcase', name: 'Briefcase', d: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16' },
    { id: 'tag', name: 'Tag', d: 'M3 12V4h8l9 9-8 8zM7.5 8.5h.01' },
    { id: 'flag', name: 'Flag', d: 'M5 21V4M5 4h11l-2 4 2 4H5' },
    { id: 'bolt', name: 'Bolt', d: 'M13 3 5 13h6l-1 8 8-10h-6z' },
    { id: 'cart', name: 'Cart', d: 'M3 4h3l2.5 11h9L20 7H7M10 20h.01M17 20h.01' },
    { id: 'book', name: 'Book', d: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM8 7h7' },
    { id: 'code', name: 'Code', d: 'M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14' },
    { id: 'wallet', name: 'Wallet', d: 'M4 7h15a1 1 0 0 1 1 1v11H5a1 1 0 0 1-1-1zM4 7l12-3v3M16 13h2' },
    { id: 'music', name: 'Music', d: 'M9 18V6l10-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM19 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z' }
  ];
  var byId = {}; ICONS.forEach(function (i) { byId[i.id] = i; });
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // The svg of an icon id (an unknown or empty id gives ''), to put in a tab or in the picker.
  function iconSvg(id, cls) {
    var i = byId[id]; if (!i) return '';
    return '<svg class="' + (cls || 'ti') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + i.d + '"/></svg>';
  }
  var isIcon = function (id) { return !!byId[id]; };

  /* ---------- drag to reorder ----------
     row: the element holding the tabs. o.item: selector of one tab's wrapper (default ".tabi"; its data-t is the tab's id).
     o.enabled(): true while the page is in editing mode. o.onDrop(order): the ids in their new order.
     o.skip: selector of what inside a tab must not start a drag (the pencil). After a drag, o.justDragged() is true for one tick so the
     click that ends it is ignored (the page checks it in its click handler). */
  function drag(row, o) {
    o = o || {}; var sel = o.item || '.tabi', skip = o.skip || '.pen', st = null, raf = 0, noClick = false;
    function ids() { return [].map.call(row.querySelectorAll(sel), function (x) { return x.dataset.t; }); }
    function same(a, b) { return a.join() === b.join(); }
    row.addEventListener('pointerdown', function (e) {
      if (!o.enabled() || e.button > 0 || e.target.closest(skip)) return;
      var w = e.target.closest(sel); if (!w) return;
      st = { w: w, pid: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, touch: e.pointerType !== 'mouse', on: false, timer: 0, before: ids() };
      if (st.touch) st.timer = setTimeout(function () { if (st && !st.on) start(); }, 220);
    });
    function start() {
      var w = st.w; st.on = true;
      st.grab = st.x0 - w.getBoundingClientRect().left;
      w.classList.add('dragging'); document.body.classList.add('dragtabs');
      if (st.touch && navigator.vibrate) try { navigator.vibrate(8); } catch (_) {}
      frame();
    }
    document.addEventListener('pointermove', function (e) {
      if (!st || e.pointerId !== st.pid) return;
      st.x = e.clientX;
      if (!st.on) {
        var d = Math.hypot(e.clientX - st.x0, e.clientY - st.y0);
        if (st.touch) { if (d > 10) { clearTimeout(st.timer); st = null; } return; }   // moved before the hold: it is a scroll
        if (d < 5) return; start();
      }
      e.preventDefault();
      if (!raf) raf = requestAnimationFrame(frame);
    }, { passive: false });
    row.addEventListener('touchmove', function (e) { if (st && st.on) e.preventDefault(); }, { passive: false });
    // Slides a tab from where it was to where it now is.
    function glide(el, dx) {
      if (!dx) return;
      el.style.transition = 'none'; el.style.transform = 'translateX(' + dx + 'px)'; void el.offsetWidth;
      el.style.transition = 'transform .22s cubic-bezier(.2,.8,.2,1)'; el.style.transform = '';
    }
    function isItem(x) { return !!x && x.matches(sel); }
    function frame() {
      raf = 0; if (!st || !st.on) return;
      var w = st.w, rr = row.getBoundingClientRect();
      // scroll the row when the pointer is near its edges
      var edge = 48, sp = st.x < rr.left + edge ? -(rr.left + edge - st.x) : st.x > rr.right - edge ? st.x - (rr.right - edge) : 0;
      if (sp) row.scrollLeft += sp / 3;
      var slot = function () { return rr.left + w.offsetLeft - row.scrollLeft; };   // where the tab sits without the drag offset
      var tx = st.x - st.grab - slot(), mid = w.offsetLeft + tx + w.offsetWidth / 2;
      var prev = isItem(w.previousElementSibling) ? w.previousElementSibling : null, next = isItem(w.nextElementSibling) ? w.nextElementSibling : null;
      // swap with a neighbour once the dragged tab's middle passes the neighbour's middle
      var swap = prev && mid < prev.offsetLeft + prev.offsetWidth / 2 ? prev : next && mid > next.offsetLeft + next.offsetWidth / 2 ? next : null;
      if (swap) {
        var was = swap.getBoundingClientRect().left;   // where it is on screen now (including any glide in progress)
        if (swap === prev) row.insertBefore(w, prev); else row.insertBefore(next, w);
        glide(swap, was - (rr.left + swap.offsetLeft - row.scrollLeft));
        tx = st.x - st.grab - slot();
      }
      w.style.transition = 'none'; w.style.transform = 'translateX(' + tx + 'px)';
      if (sp) raf = requestAnimationFrame(frame);   // keep scrolling while held at an edge
    }
    function end(e) {
      if (!st || e.pointerId !== st.pid) return;
      clearTimeout(st.timer); var d = st; st = null;
      if (!d.on) return;
      cancelAnimationFrame(raf); raf = 0;
      noClick = true; setTimeout(function () { noClick = false; }, 0);
      document.body.classList.remove('dragtabs');
      // glide the tab into its new place, then hand over the order
      var w = d.w; w.style.transition = 'transform .2s cubic-bezier(.2,.8,.2,1)'; w.style.transform = '';
      setTimeout(function () { w.style.transition = ''; w.classList.remove('dragging'); }, 210);
      var order = ids(); if (same(order, d.before)) return;
      setTimeout(function () { o.onDrop(order); }, 220);
    }
    document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
    // From the keyboard: Alt + Left or Right on a tab moves it one place (the page re-draws and keeps the focus on it).
    row.addEventListener('keydown', function (e) {
      if (!o.enabled() || !e.altKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
      var w = e.target.closest(sel); if (!w) return;
      var a = ids(), i = a.indexOf(w.dataset.t), j = i + (e.key === 'ArrowLeft' ? -1 : 1);
      if (i < 0 || j < 0 || j >= a.length) return;
      e.preventDefault(); a.splice(j, 0, a.splice(i, 1)[0]); o.onDrop(a, w.dataset.t);
    });
    return { justDragged: function () { return noClick; } };
  }

  /* ---------- the Edit Tab window ---------- */
  var hexOf = function (v) { v = String(v || '').trim().replace(/^#/, ''); if (/^[0-9a-f]{3}$/i.test(v)) v = v.replace(/./g, '$&$&'); return /^[0-9a-f]{6}$/i.test(v) ? '#' + v.toLowerCase() : ''; };
  var dlg = null, cur = null;
  function $(id) { return dlg.querySelector('#' + id); }
  function colorRow(key, label, hint) {
    return '<div class="ix-srow hubt-color" id="ht' + key + 'Row"><label for="ht' + key + '">' + esc(label) + '<small id="ht' + key + 'Hint">' + esc(hint || '') + '</small></label>' +
      '<span class="hubt-ctl"><input type="color" id="ht' + key + '" aria-label="' + esc(label) + '"><input type="text" class="hubt-hx" id="ht' + key + 'Tx" maxlength="7" placeholder="Default" spellcheck="false" autocomplete="off" aria-label="' + esc(label) + ' as a hex code">' +
      '<button type="button" class="btn" id="ht' + key + 'Def">Use Default</button></span></div>';
  }
  function build() {
    dlg = document.createElement('dialog'); dlg.id = 'hubTabDlg'; dlg.className = 'ix-sdlg';
    var icons = '<button type="button" role="radio" class="hubt-ico" data-i="" id="htIcoDef" aria-checked="false"><span class="hubt-def">Default</span></button>' + ICONS.map(function (i) {
      return '<button type="button" role="radio" class="hubt-ico" data-i="' + i.id + '" aria-checked="false" title="' + esc(i.name) + '" aria-label="' + esc(i.name) + '">' + iconSvg(i.id, 'hubt-svg') + '</button>';
    }).join('');
    dlg.innerHTML = '<form method="dialog" novalidate><h3 id="htTitle">Edit Tab</h3>' +
      '<h4>Name</h4><div class="field"><label for="htName">Name</label><input id="htName" maxlength="40" autocomplete="off"></div>' +
      '<h4>Look</h4>' + colorRow('Color', 'Tab Color', '') + colorRow('Hc', 'Box Headline Color', 'Leave it on default to use the normal text color.') +
      '<div class="hubt-block" id="htLayBlock" hidden><span class="hubt-lt">Layout</span><div class="hubt-lays" id="htLays" role="radiogroup" aria-label="Layout">' +
        '<button type="button" class="hubt-lay" data-lay="cards" role="radio" aria-checked="true"><i class="hubt-lp hubt-lp-cards" aria-hidden="true"></i><b>Notebook Cards</b><small>Cards you can size and arrange. The default.</small></button>' +
        '<button type="button" class="hubt-lay" data-lay="doc" role="radio" aria-checked="false"><i class="hubt-lp hubt-lp-doc" aria-hidden="true"></i><b>Document</b><small>One page with an outline</small></button></div></div>' +
      '<div class="hubt-block"><span class="hubt-lt" id="htIcoLbl">Icon</span><div class="hubt-icons" id="htIcons" role="radiogroup" aria-labelledby="htIcoLbl">' + icons + '</div></div>' +
      '<h4>Privacy</h4>' +
      '<div class="ix-srow"><label for="htPriv">Private Tab<small id="htPrivNote"></small></label><input type="checkbox" class="ix-sw" id="htPriv"></div>' +
      '<div class="ix-srow"><label for="htEnc">Encrypted Tab<small id="htEncNote"></small></label><input type="checkbox" class="ix-sw" id="htEnc"></div>' +
      '<p class="err" id="htErr" role="status"></p>' +
      '<div class="actions act"><button type="button" class="btn left danger" id="htDel">Delete Tab</button><button class="btn" value="cancel" formnovalidate>Cancel</button><button type="submit" class="btn primary pri" id="htSave">Save Tab</button></div></form>';
    document.body.appendChild(dlg);
    if (window.HUB && HUB.settingsWindow) HUB.settingsWindow(dlg);
    wire();
  }
  function setColor(key, v) { var el = $('ht' + key), tx = $('ht' + key + 'Tx'); cur[key.toLowerCase()] = v; tx.value = v || ''; tx.classList.remove('bad'); if (v) el.value = v; else el.value = key === 'Color' ? cur.colorShown || '#d4a72c' : '#ffffff'; $('ht' + key + 'Def').disabled = !v; }
  function setLayout(v) { cur.layout = v; [].forEach.call(dlg.querySelectorAll('.hubt-lay'), function (b) { var on = b.dataset.lay === v; b.setAttribute('aria-checked', String(on)); b.classList.toggle('on', on); b.tabIndex = on ? 0 : -1; }); }
  function setIcon(v) { cur.icon = v; [].forEach.call(dlg.querySelectorAll('.hubt-ico'), function (b) { var on = b.dataset.i === v; b.setAttribute('aria-checked', String(on)); b.classList.toggle('on', on); b.tabIndex = on ? 0 : -1; }); }
  // Encrypt needs a key and a secure page; an encrypted tab is always private.
  function encUI() {
    var c = cur.cfg, enc = $('htEnc'), priv = $('htPriv');
    enc.disabled = !!c.encWhy;
    if (enc.checked) { priv.checked = true; priv.disabled = true; } else priv.disabled = !!c.privWhy;
    $('htPrivNote').textContent = c.privWhy || 'Only visible when you are logged in. Visitors never receive this tab.';
    $('htEncNote').textContent = c.encWhy || (enc.checked ? (c.encOnNote || 'Locked in this browser with your encryption passphrase before it is saved. The server, earlier versions and backups only hold scrambled text. The tab name stays readable.') : (c.encOffNote || 'Lock it with your encryption passphrase. The tab name stays readable.'));
  }
  function wire() {
    ['Color', 'Hc'].forEach(function (key) {
      var el = $('ht' + key), tx = $('ht' + key + 'Tx');
      el.addEventListener('input', function () { setColor(key, el.value.toLowerCase()); });
      tx.addEventListener('input', function () { var h = hexOf(tx.value); tx.classList.toggle('bad', !h && !!tx.value.trim()); if (h) { cur[key.toLowerCase()] = h; el.value = h; $('ht' + key + 'Def').disabled = false; } else if (!tx.value.trim()) { cur[key.toLowerCase()] = ''; $('ht' + key + 'Def').disabled = true; } });
      $('ht' + key + 'Def').addEventListener('click', function () { setColor(key, ''); });
    });
    $('htLays').addEventListener('click', function (e) { var b = e.target.closest('.hubt-lay'); if (b) setLayout(b.dataset.lay); });
    $('htLays').addEventListener('keydown', function (e) {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) < 0) return; e.preventDefault();
      var L = cur.cfg.layouts, i = L.indexOf(cur.layout), n = (i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1) + L.length) % L.length;
      setLayout(L[n]); dlg.querySelector('.hubt-lay[data-lay="' + L[n] + '"]').focus();
    });
    $('htIcons').addEventListener('click', function (e) { var b = e.target.closest('.hubt-ico'); if (b) setIcon(b.dataset.i); });
    $('htIcons').addEventListener('keydown', function (e) {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) < 0) return; e.preventDefault();
      var all = [].slice.call(dlg.querySelectorAll('.hubt-ico')), i = all.findIndex(function (b) { return b.dataset.i === cur.icon; });
      var n = (i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1) + all.length) % all.length; setIcon(all[n].dataset.i); all[n].focus();
    });
    $('htEnc').addEventListener('change', function () { encUI(); });
    // With a passphrase set, a new private tab is encrypted from the start (untick Encrypted Tab to keep it private only)
    $('htPriv').addEventListener('change', function () { if (!$('htPriv').checked) $('htEnc').checked = false; else if (cur.cfg.isNew && !$('htEnc').disabled) $('htEnc').checked = true; encUI(); });
    var ctl = {
      say: function (m) { $('htErr').textContent = m || ''; },
      busy: function (on, label) { $('htSave').disabled = !!on; $('htDel').disabled = !!on; if (label != null) ctl.say(label); },
      close: function () { dlg.close(); },
      deleteLabel: function (t) { $('htDel').textContent = t; }
    };
    $('htName').addEventListener('input', function () { ctl.say(''); });
    dlg.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault(); if (!cur) return;
      var v = { name: $('htName').value.trim().slice(0, 40), color: cur.color || '', hc: cur.hc || '', layout: cur.layout, icon: cur.icon || '', priv: $('htPriv').checked || $('htEnc').checked, enc: $('htEnc').checked };
      if (!v.name) { if (cur.cfg.defaultName) v.name = cur.cfg.defaultName; else { ctl.say('Type a name for the tab.'); $('htName').focus(); return; } }
      if (($('htColorTx').value.trim() && !hexOf($('htColorTx').value)) || ($('htHcTx').value.trim() && !hexOf($('htHcTx').value))) { ctl.say('Use a color like #d9a85b, or Use Default.'); return; }
      Promise.resolve(cur.cfg.onSave(v, ctl)).catch(function (err) { ctl.say((err && err.message) || 'That did not work.'); ctl.busy(false); });
    });
    $('htDel').addEventListener('click', function () { if (cur && cur.cfg.onDelete) cur.cfg.onDelete(ctl); });
    cur = null; dlg._ctl = ctl;
  }
  /* cfg: { isNew, title, saveLabel, name, defaultName, color (hex or ''), colorShown (hex shown while the color is the default), colorLabel, colorHint,
            hc (hex or '' / null to hide Box Headline Color), layouts (['cards','doc'] / null to hide the choice), layout, icon, iconDefault (the id this page draws when none is chosen),
            priv, enc, privWhy, encWhy (a reason the switch is off), encOnNote, encOffNote, canDelete, onSave(v, ctl), onDelete(ctl) }
     ctl: say(text), busy(on, text), close(), deleteLabel(text). The page closes the window (ctl.close()) once the save worked. */
  function edit(cfg) {
    if (!dlg) build();
    cur = { cfg: cfg, color: cfg.color || '', hc: cfg.hc || '', layout: cfg.layout || 'cards', icon: isIcon(cfg.icon) ? cfg.icon : '', colorShown: cfg.colorShown };
    $('htTitle').textContent = cfg.title; $('htSave').textContent = cfg.saveLabel; $('htName').value = cfg.name || '';
    dlg.querySelector('label[for=htColor]').firstChild.textContent = cfg.colorLabel || 'Tab Color'; $('htColor').setAttribute('aria-label', cfg.colorLabel || 'Tab Color');
    $('htColorHint').textContent = cfg.colorHint || '';
    $('htHcRow').hidden = cfg.hc == null;
    $('htLayBlock').hidden = !cfg.layouts;
    setColor('Color', cur.color); setColor('Hc', cur.hc); setLayout(cur.layout);
    // the Default button of the icon picker shows what the page draws without a choice
    $('htIcoDef').innerHTML = (cfg.iconDefault ? iconSvg(cfg.iconDefault, 'hubt-svg') : '') + '<span class="hubt-def">Default</span>'; setIcon(cur.icon);
    $('htPriv').checked = !!cfg.priv; $('htEnc').checked = !!cfg.enc; encUI();
    $('htDel').hidden = !cfg.canDelete; dlg._ctl.deleteLabel('Delete Tab'); dlg._ctl.busy(false, '');
    dlg.showModal(); $('htName').focus(); $('htName').select();
  }
  window.HubTabs = { icons: ICONS, iconSvg: iconSvg, isIcon: isIcon, drag: drag, edit: edit, hexOf: hexOf };
})();
