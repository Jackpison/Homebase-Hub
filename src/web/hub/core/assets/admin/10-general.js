  /* every time zone the browser knows, the saved one and this device's own first; each with its current offset from UTC */
  function tzOptions(cur) {
    var all = []; try { all = Intl.supportedValuesOf('timeZone'); } catch (e) {}
    if (!all.length) all = ['Asia/Kolkata', 'UTC', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney'];
    if (all.indexOf(cur) < 0) all.unshift(cur);
    var off = function (z) { try { return (new Intl.DateTimeFormat('en-US', { timeZone: z, timeZoneName: 'shortOffset' }).formatToParts(new Date()).filter(function (x) { return x.type === 'timeZoneName'; })[0] || {}).value || ''; } catch (e) { return ''; } };
    var opt = function (z, label) { return '<option value="' + esc(z) + '"' + (z === cur ? ' selected' : '') + '>' + esc(label || z.replace(/_/g, ' ')) + ' (' + esc(off(z).replace('GMT', 'UTC') || 'UTC') + ')</option>'; };
    var mine = ''; try { mine = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    var top = [cur].concat(mine && mine !== cur ? [mine] : []);   // the saved zone, then this device's own
    return '<optgroup label="Saved and This Device">' + top.map(function (z) { return opt(z, z === 'Asia/Kolkata' ? 'India Standard Time, IST' : ''); }).join('') + '</optgroup><optgroup label="All Time Zones">' +
      all.filter(function (z) { return top.indexOf(z) < 0; }).map(function (z) { return opt(z); }).join('') + '</optgroup>';
  }
  /* (1.70.0) Overview > Start Here: under Guided Setup, Install on Your Phone and Keyboard Shortcuts (they were in General; they are help, not settings) */
  function helpCards(p) {
    p.innerHTML = '<h3 id="ix-install">Install on Your Phone</h3><p>Opens like an app, with its own icon.</p>' +
      '<details class="ix-how"><summary>How?</summary><div class="ix-steps"><h4>iPhone or iPad</h4><p>In Safari, tap Share, then Add to Home Screen.</p>' +
      '<h4>Android</h4><p>In Chrome, open the menu (the three dots), then Install App or Add to Home Screen.</p>' +
      '<h4>Computer</h4><p>In Chrome or Edge, click the install icon at the right end of the address bar, or open the menu and choose Install.</p></div></details>' +
      '<button type="button" class="ix-btn pri" id="ix-inst" hidden>' + svg(ICON.down) + 'Install</button>' +
      '<h3 id="ix-keyh" class="ix-kbonly">Keyboard Shortcuts</h3><p class="ix-kbonly">Search, go to a page and edit from the keyboard. Press <kbd>?</kbd> on any page to see them all.</p>' +
      '<button type="button" class="ix-btn ix-kbonly" id="ix-keysb">' + svg(ICON.keyboard) + 'View Shortcuts</button>' +
      // (1.72.0) Offline Reading: one switch for this device (the copy stays in this browser only)
      '<h3 id="ix-offh">Offline Reading</h3><p>Open Home, Links, Info, Cards and Tasks without a connection, read-only. Only on this device; Log Out deletes the copy, and locked tabs stay locked.</p>' +
      '<label class="ix-tg"><span>On This Device<small id="ix-offst">' + (OFFL().can() ? 'Off' : 'Needs a secure (https) connection.') + '</small></span><input type="checkbox" id="ix-offsw"' + (OFFL().on() ? ' checked' : '') + (OFFL().can() ? '' : ' disabled') + '></label>';
    p.querySelector('#ix-keysb').onclick = function () { window.HUB.showKeys(); };
    var offSt = function () {
      var st = p.querySelector('#ix-offst'); if (!st || !OFFL().can()) return;
      if (!OFFL().on()) { st.textContent = 'Off'; return; }
      OFFL().count().then(function (n) { st.textContent = n ? 'On: ' + n + ' pages and files kept on this device.' : 'On: pages are kept as you open them.'; });
    };
    p.querySelector('#ix-offsw').onchange = function (e) {
      var on = e.target.checked; e.target.disabled = true;
      OFFL().set(on).then(function (ok) { e.target.disabled = false; if (on && !ok) { e.target.checked = false; OFFL().set(false); toast('This browser cannot keep the site for offline use.'); } else toast(on ? 'Offline Reading is on for this device.' : 'Offline Reading is off; the copy is deleted.'); offSt(); });
    };
    offSt();
    // the Install button shows only when this browser offers it (settings.js keeps the offer: beforeinstallprompt)
    var ib = p.querySelector('#ix-inst');
    var offer = function () { ib.hidden = !window.__hubInstall; };
    offer(); document.addEventListener('hub-install', offer);
    ib.onclick = function () {
      var ev = window.__hubInstall; if (!ev) return;
      window.__hubInstall = null; ib.hidden = true; ev.prompt();
      Promise.resolve(ev.userChoice).then(function (r) { if (r && r.outcome === 'accepted') toast('Installed.'); }, function () {});
    };
    cardify(p);
  }
  function pGeneral(p) {
    p.innerHTML = '<h3>Site Name</h3><p>Shown in the bar, Telegram messages and backup names.</p><input type="text" id="ix-name" maxlength="30" value="' + esc(draft.siteName) + '" aria-label="Site Name">' +
      '<h3>Site Logo</h3><p>Shown in the bar and the browser tab. PNG, JPG, WebP or GIF.</p>' +
      '<div class="ix-row"><span class="ix-logoprev" id="ix-lp">' + (S.logo ? '<img src="' + esc(ROOT + S.logo) + '" alt="">' : '<span>' + esc((S.siteName || 'M').charAt(0).toUpperCase()) + '</span>') + '</span>' +
      '<button type="button" class="ix-btn" id="ix-lu">' + svg(ICON.image) + 'Change Logo</button><button type="button" class="ix-btn" id="ix-lx"' + (S.logo ? '' : ' hidden') + '>Remove</button>' +
      '<input type="file" id="ix-lf2" accept="image/png,image/jpeg,image/webp,image/gif" hidden></div>' +
      '<h3>Time Zone</h3><p>Today, due times, backups and Telegram all follow it.</p>' +
      '<select id="ix-tz" class="ix-sel" aria-label="Time Zone">' + tzOptions(draft.tz || 'Asia/Kolkata') + '</select>';
    p.querySelector('#ix-tz').onchange = function (e) { draft.tz = e.target.value; };
    p.querySelector('#ix-name').oninput = function (e) { draft.siteName = e.target.value; };
    p.querySelector('#ix-lu').onclick = function () { p.querySelector('#ix-lf2').click(); };
    p.querySelector('#ix-lf2').onchange = function (e) {
      var f = e.target.files[0]; if (!f) return;
      smallImage(f, 192, function (data) {
        api('logo', { data: data }).then(function (j) {
          if (!j.ok) { toast(j.error || 'Could not save the logo.'); return; }
          S.logo = draft.logo = j.state.logo; remember(S); redraw(); applyFavicon(); subPane('general'); toast('Logo updated.');
        });
      });
    };
    p.querySelector('#ix-lx').onclick = function () {
      api('logo', { remove: true }).then(function (j) { if (j.ok) { S.logo = draft.logo = ''; remember(S); redraw(); subPane('general'); toast('Logo removed.'); } });
    };
  }
