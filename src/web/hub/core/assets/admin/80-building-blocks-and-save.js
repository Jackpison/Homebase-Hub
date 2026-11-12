  function saveSettings() {
    var b = $('#ix-save'); if (b.disabled) return; b.disabled = true; b.textContent = 'Saving…';
    var fail = function (msg) { b.disabled = false; b.textContent = 'Save Settings'; $('#ix-sferr').textContent = msg; };
    var send = { siteName: draft.siteName, nav: draft.nav, theme: draft.theme, accent: draft.accent, accentPg: canonAccents(draft.accentPg), look: draft.look, homeBar: draft.homeBar, glass: draft.glass === true, glassFx: canonGfx(draft.glassFx), barHide: draft.barHide !== false, font: draft.font, fontCustom: draft.fontCustom, colors: draft.colors, tools: draft.tools, backupEvery: draft.backupEvery, pages: draft.pages || [], tz: draft.tz || 'Asia/Kolkata' };
    api('settings', { settings: send }).then(function (j) {
      if (!j.ok || !j.state) {
        return fail(j._status === 401 ? 'You were logged out. Log in again, then save.' : j._status === 403 ? 'Security check failed. Reload the page, then save again.' : (j.error || 'Could not save (server answered ' + (j._status || 'nothing') + ').'));
      }
      b.textContent = 'Save Settings'; $('#ix-sferr').textContent = '';
      if (j.state.theme !== S.theme) K.storeTheme(j.state.theme);   // a newly saved theme becomes this browser's theme too (shown on close)
      try { localStorage.setItem('hub-theme-site', j.state.theme); } catch (e) {}
      Object.assign(S, j.state); remember(S); applyAttrs(); applyColors(); applyFont(); applySizes(); redraw();
      draft = JSON.parse(JSON.stringify(S));
      if (curSub) pane(curSub);   // the open section edits the new draft from here on
      var dr = document.getElementById('ix-drawer'); if (dr) dr.remove();   // the phone menu is drawn again with the new tab names
      toast('Settings saved for every page.');
    }, function () { fail("Couldn't reach the server, so nothing was saved. Check your connection and save again."); });
  }

  /* --- Security ---
     One place for everything a password guards. An overview says what your one password protects; each part folds
     open below it. Info's encrypted tabs and backup encryption are managed here too (change, switch, remove), so the
     same password can do it all. The open/closed state of each part is kept while it redraws. */
  var secRefresh = null;
  /* Card, field and chip builders shared by Encryption, Telegram setup and Backup, so they look like one family. */
  function ecCard(cls, icon, title, desc, bodyHtml, pill) {
    return '<section class="ix-ec ' + cls + '"><div class="ix-ec-h">' + (icon ? '<span class="ix-ec-i">' + svg(icon) + '</span>' : '') + '<div><div class="ix-ec-t">' + title + (pill || '') + '</div>' + (desc ? '<div class="ix-ec-d">' + desc + '</div>' : '') + '</div></div>' + (bodyHtml ? '<div class="ix-ec-b">' + bodyHtml + '</div>' : '') + '</section>';
  }
  function ecField(id, label, type, auto, hint, wrapId, extra) {
    return '<div class="ix-fd"' + (wrapId ? ' id="' + wrapId + '" hidden' : '') + '><label for="' + id + '">' + label + '</label><input type="' + type + '" id="' + id + '" autocomplete="' + auto + '"' + (extra || '') + '>' + (hint ? '<small>' + hint + '</small>' : '') + '</div>';
  }
  function ecChip(k, v, good) { return '<span class="ix-chip' + (good ? ' on' : '') + '"><b>' + k + '</b>' + v + '</span>'; }
  /* More building blocks (Security, Telegram and the Changelog share them): a tab header, status tiles, check rows. */
  function tabHead(icon, title, desc) {
    return '<div class="ix-th"><span class="ix-th-i">' + svg(icon) + '</span><div><div class="ix-th-t">' + title + '</div>' + (desc ? '<p class="ix-th-d">' + desc + '</p>' : '') + '</div></div>';
  }
  function tile(go, icon, title, pill, cls, text) {
    return '<button type="button" class="ix-tile ' + (cls || '') + '" data-go="' + go + '"><span class="ix-tile-i">' + svg(icon) + '</span><span class="ix-tile-b"><span class="ix-tile-h"><b>' + title + '</b>' +
      (pill ? '<span class="ix-pill ' + (cls || '') + '">' + esc(pill) + '</span>' : '') + '</span><small>' + text + '</small></span></button>';
  }
  function checkRow(cls, mark, title, text) {
    return '<div class="ix-chkrow ' + cls + '"><span>' + mark + '</span><div>' + (title ? '<b>' + title + '</b>' : '') + (text ? (title ? '<small>' : '<div>') + text + (title ? '</small>' : '</div>') : '') + '</div></div>';
  }
  function spinRow(t) { return '<div class="ix-row"><span class="ix-spin" aria-hidden="true"><i></i><i></i><i></i></span><span>' + (t || 'Loading…') + '</span></div>'; }
  /* how strong a new password looks: length counts most, then mixing letters, digits and symbols */
  function pwScore(s) {
    var n = s.length, kinds = (/[a-z]/.test(s) ? 1 : 0) + (/[A-Z]/.test(s) ? 1 : 0) + (/\d/.test(s) ? 1 : 0) + (/[^A-Za-z0-9]/.test(s) ? 1 : 0);
    if (n < 8) return { pct: 14, cls: 'bad', label: 'Too short: use at least 8 characters' };
    var pts = (n >= 12 ? 1 : 0) + (n >= 16 ? 1 : 0) + (kinds >= 3 ? 1 : 0) + (kinds === 4 ? 1 : 0);
    return pts === 0 ? { pct: 38, cls: 'warn', label: 'Weak: add length or mix in digits and symbols' } : pts === 1 ? { pct: 58, cls: 'warn', label: 'Fair: a few more characters would help' } :
           pts === 2 ? { pct: 80, cls: 'good', label: 'Good' } : { pct: 100, cls: 'good', label: 'Strong' };
  }

