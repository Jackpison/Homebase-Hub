  /* ---------- 8. dialogs ---------- */
  var dlg;
  function openDlg(html, wide) {
    if (window.__ixShell) window.__ixShell.beforeClose = null;   // a new dialog starts without the previous one's close guard
    if (!dlg) {
      dlg = document.createElement('div'); dlg.id = 'ix-dlg'; dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true');
      document.body.appendChild(dlg);
      dlg.addEventListener('mousedown', function (e) { if (e.target === dlg) closeDlg(); });
    }
    if (dlg._shut) { clearTimeout(dlg._shut); dlg._shut = 0; }   // a dialog closing right now is replaced, never wiped later
    dlg.classList.remove('closing');
    dlg.innerHTML = '<div class="ix-box' + (wide ? ' wide' : '') + '">' + html + '</div>';
    dlg.classList.add('open');
    var f = dlg.querySelector('[autofocus]') || dlg.querySelector('input,button'); if (f) setTimeout(function () { f.focus(); }, 30);
    return dlg;
  }
  function closeDlg(force) {
    var K = window.__ixShell;   // Settings can hold the close while it has unsaved changes (shell-admin.js)
    if (!force && K && K.beforeClose && K.beforeClose() === false) return;
    if (K) K.beforeClose = null;
    if (dlg && dlg.classList.contains('open') && !dlg._shut) {   // fades out, then empties
      dlg.classList.add('closing');
      dlg._shut = setTimeout(function () { dlg._shut = 0; dlg.classList.remove('open', 'closing'); dlg.innerHTML = ''; }, matchMedia('(prefers-reduced-motion:reduce)').matches ? 0 : 150);
    }
    if (loginWait) { loginWait.reject(); loginWait = null; }
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && dlg && dlg.classList.contains('open')) { e.stopPropagation(); closeDlg(); } }, true);
  var $ = function (s) { return dlg.querySelector(s); };

  /* ---------- 9. login ---------- */
  var loginWait = null;
  function login(reason) {
    if (S.admin) return Promise.resolve();
    if (S.admin === undefined) return refresh().then(function () { return S.admin ? undefined : S.admin === undefined ? loginBox(reason) : login(reason); });   // not known yet: ask the server first
    return loginBox(reason);
  }
  function loginBox(reason) {
    return new Promise(function (res, rej) {
      if (loginWait) loginWait.reject();
      loginWait = { resolve: res, reject: rej };
      if (S.setup) return setupForm();
      /* 1.53.8: the site's logo and name, a password that can be shown, one wide Log In button. Trust This Browser starts off. */
      openDlg('<div class="ix-lhead"><img class="ix-llogo" alt="" src="' + esc(S.logo ? ROOT + S.logo : CORE + 'assets/brand/logo-192.png') + '">' +
        '<h2>Log In to ' + esc(S.siteName || 'Homebase Hub') + '</h2><p>' + esc(reason || 'Your website password opens editing and your private pages.') + '</p></div>' +
        '<form id="ix-lf"><label for="ix-pw">Password</label><div class="ix-pwrap"><input type="password" id="ix-pw" autocomplete="current-password" autofocus>' +
          '<button type="button" class="ix-eye" id="ix-eye" aria-label="Show Password" aria-pressed="false" title="Show Password">' + svg(ICON.eye) + '</button></div>' +
        '<div id="ix-2s" hidden><label for="ix-code">Code from Your Authenticator App</label><input type="text" id="ix-code" inputmode="numeric" autocomplete="one-time-code" placeholder="123456 or a recovery code">' +
          '<label class="ix-chk"><input type="checkbox" id="ix-ltrust"> Trust this browser for 30 days (no code here next time)</label></div>' +
        '<p class="ix-err" id="ix-le" role="alert"></p><button class="ix-btn pri ix-wide" id="ix-lg">Log In</button>' +
        (S.passkeys && window.PublicKeyCredential && window.isSecureContext ? '<div class="ix-lor" aria-hidden="true">or</div><button type="button" class="ix-btn ix-wide" id="ix-pk">' + svg(ICON.key) + ' Log In with a Passkey</button>' : '') +
        '<button type="button" class="ix-btn ix-quiet" data-ix="close">Cancel</button></form>');
      dlg.querySelector('.ix-box').classList.add('ix-login');
      $('#ix-eye').onclick = function () {
        var on = $('#ix-pw').type === 'password';
        $('#ix-pw').type = on ? 'text' : 'password'; this.innerHTML = svg(on ? ICON.eyeoff : ICON.eye);
        this.setAttribute('aria-pressed', String(on)); this.setAttribute('aria-label', on ? 'Hide Password' : 'Show Password'); this.title = this.getAttribute('aria-label');
        $('#ix-pw').focus();
      };
      if ($('#ix-pk')) $('#ix-pk').onclick = function () {
        var pb = this; pb.disabled = true; $('#ix-le').textContent = '';
        passkeyLogin().then(function (j) {
          pb.disabled = false;
          if (j && j.ok) return loggedIn();
          $('#ix-le').textContent = (j && j.error) || 'The passkey was not accepted.';
        }).catch(function (x) { pb.disabled = false; $('#ix-le').textContent = x && x.name === 'NotAllowedError' ? 'The passkey was not used: it was cancelled or timed out.' : (x && x.message) || 'The passkey could not be used.'; });
      };
      $('#ix-lf').onsubmit = function (e) {
        e.preventDefault();
        var b = $('#ix-lg'); b.disabled = true; $('#ix-le').textContent = '';
        var pw = $('#ix-pw').value, twoStep = !$('#ix-2s').hidden;
        api('login', { password: pw, code: $('#ix-code').value, trust: twoStep && $('#ix-ltrust').checked }).then(function (j) {
          b.disabled = false;
          if (j.ok) return loggedIn(pw);
          if (j.approval) return approvalWait(j.approval, pw, twoStep && $('#ix-ltrust').checked, j.recovery);
          if (j.setup) { S.setup = true; return setupForm(); }
          if (j.need2fa) { $('#ix-2s').hidden = false; $('#ix-code').focus(); }
          $('#ix-le').textContent = j.error || 'Could not log in.';
        }).catch(function () { b.disabled = false; $('#ix-le').textContent = "Can't reach the server."; });
      };
    });
  }
  /* Passkeys (1.61.0): the browser asks for a fingerprint, face, PIN or security key; the server checks the signature (lib/passkey.php). */
  function bufB64u(buf) { var u = new Uint8Array(buf), t = ''; for (var i = 0; i < u.length; i++) t += String.fromCharCode(u[i]); return btoa(t).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function b64uBuf(x) { x = x.replace(/-/g, '+').replace(/_/g, '/'); while (x.length % 4) x += '='; var t = atob(x), u = new Uint8Array(t.length); for (var i = 0; i < t.length; i++) u[i] = t.charCodeAt(i); return u.buffer; }
  function passkeyLogin() {
    return api('pk_login_begin', {}).then(function (j) {
      if (!j.ok) throw new Error(j.error || 'No passkey is set up on this site.');
      var o = j.publicKey;
      return navigator.credentials.get({ publicKey: { challenge: b64uBuf(o.challenge), rpId: o.rpId, timeout: o.timeout, userVerification: o.userVerification,
        allowCredentials: o.allowCredentials.map(function (c) { return { type: 'public-key', id: b64uBuf(c.id) }; }) } });
    }).then(function (c) {
      if (!c) throw new Error('No passkey was chosen.');
      return api('pk_login_finish', { id: c.id, response: { clientDataJSON: bufB64u(c.response.clientDataJSON), authenticatorData: bufB64u(c.response.authenticatorData), signature: bufB64u(c.response.signature) } });
    });
  }
  /* "www.example.com" -> "Example", "shop.example.co.uk" -> "Example", an IP address -> "Homebase Hub" */
  function guessName(host) {
    if (!host || /^[\d.:]+$/.test(host) || host.indexOf('.') < 0) return host ? host.charAt(0).toUpperCase() + host.slice(1) : 'Homebase Hub';
    var l = host.split('.'), n = l.length >= 3 && l[l.length - 2].length <= 3 ? l[l.length - 3] : l[l.length - 2];
    return n.charAt(0).toUpperCase() + n.slice(1);
  }
  /* (1.69.0) a new site: Code -> Password -> Site -> Done, in the Stepper (it was one long form). The server checks everything again. */
  function setupForm() {
    var nm = S.siteName && S.siteName !== 'My Site' ? S.siteName : guessName(S.host || '');
    openDlg('<div class="ix-ico">' + svg(ICON.key) + '</div><h2>Welcome!</h2><div id="ix-setst"></div>' +
      '<p class="ix-note">One password unlocks editing on every page. You can open this box any time from the key icon.</p>');
    var val = function (id) { var e = document.getElementById(id); return e ? e.value : ''; }, wantLock = false;
    stepper($('#ix-setst'), { kind: 'numbers', linear: true, complete: 'Create My Site', skip: function () { closeDlg(); }, skipText: 'Later',
      steps: [
        { title: 'Code', html: '<p>Open this file in your hosting file manager, copy the code inside and paste it here. This proves the site is yours:</p>' +
            '<p><code>' + esc(S.setupFile || 'site-data/core/SETUP-CODE.php') + '</code></p>' +
            '<label for="ix-sc">Setup Code</label><input type="text" id="ix-sc" autocomplete="off" autocapitalize="characters" placeholder="ABCD-1234">',
          next: function (p, c) { if (!val('ix-sc').trim()) { c.err('Paste the code from the file first.'); return false; } } },
        { title: 'Password', html: '<p>One password for editing every page.</p><label for="ix-p1">New Password (at least 8 characters)</label><input type="password" id="ix-p1" autocomplete="new-password">' +
            '<label for="ix-p2">Type It Again</label><input type="password" id="ix-p2" autocomplete="new-password">',
          next: function (p, c) {
            if (val('ix-p1').length < 8) { c.err('At least 8 characters.'); return false; }
            if (val('ix-p1') !== val('ix-p2')) { c.err("The two passwords don't match."); return false; } } },
        { title: 'Site', html: '<label for="ix-sn">Site Name</label><input type="text" id="ix-sn" maxlength="30" value="' + esc(nm) + '">' +
            '<label class="ix-chk"><input type="checkbox" id="ix-sen" checked> Lock my private data next (an encryption passphrase, about two minutes)</label>' +
            '<p class="ix-note">The time zone is taken from this browser; the look follows your device (light or dark). Both can be changed in Settings.</p>',
          next: function (p, c) {
            var en = document.getElementById('ix-sen'); wantLock = !!(en && en.checked);   // (1.79.0) the box is read before the Stepper moves on
            var tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (x) {}
            // a new site starts with this browser's time zone and the theme that follows the device
            return api('setup', { code: val('ix-sc'), password: val('ix-p1'), siteName: val('ix-sn'), tz: tz, theme: 'auto' }).then(function (j) {
              if (j.ok) { S.setup = false; return true; }
              if (/code/i.test(j.error || '')) { setTimeout(function () { c.go(1); c.err(j.error); }, 0); return false; }   // after the Stepper has finished this try
              throw new Error(j.error || 'Could not save.');
            });
          } }],
      done: '<div class="ix-st-fin"><span class="ix-st-big">' + '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg></span><h3>Your site is ready</h3><p>Opening it…</p></div>',
      onDone: function () { try { localStorage.setItem('hl-tour-due', '1'); } catch (x) {} loggedIn().then(function () { if (wantLock) location.href = ROOT + 'web/settings/#security/data-protection'; else location.reload(); }); } });   // (1.69.0) the Home Tour on the first visit; (1.79.0) or the passphrase steps, when asked for
  }
  /* The password was right; the login waits for Approve in Telegram (or a two-step recovery code, when two-step is on).
     Settings > Security turns this on. */
  function approvalWait(id, pw, trust, rc) {
    var left = 300, timer = null, stopped = false;
    openDlg('<div class="ix-ico">' + svg(ICON.lock) + '</div><h2>Approve in Telegram</h2>' +
      '<p>Your bot sent a message. Tap <b>Approve</b> there and this page logs in by itself.</p>' +
      '<div class="ix-apw"><span class="ix-spin" aria-hidden="true"><i></i><i></i><i></i></span><span id="ix-apt" aria-live="polite">Waiting… 5:00</span></div>' +
      '<label class="ix-chk"><input type="checkbox" id="ix-trust"' + (trust === true ? ' checked' : '') + '> Trust this browser for 30 days (no code or tap here next time)</label>' +
      (rc ? '<details class="ix-apc"><summary>No phone? Use a recovery code instead</summary>' +
        '<form id="ix-apf"><label for="ix-apcode">One of your two-step recovery codes</label>' +
        '<input type="text" id="ix-apcode" autocomplete="one-time-code" spellcheck="false" placeholder="ABCDE-FGHJK"><button class="ix-btn" id="ix-apgo">Use Code</button></form></details>' : '') +
      '<p class="ix-err" id="ix-ape"></p><div class="ix-acts"><button type="button" class="ix-btn" data-ix="close">Cancel</button></div>');
    var apf = $('#ix-apf');
    var stop = function () { stopped = true; clearTimeout(timer); };
    var done = function (j) {
      if (j.ok) { stop(); return loggedIn(pw); }
      if (j.wait) return;
      stop(); $('#ix-ape').textContent = j.error || 'The login did not go through.';
      $('#ix-apt').textContent = j.denied ? 'Denied in Telegram.' : 'Ended.';
    };
    var tick = function () {
      if (stopped || !$('#ix-apt')) return stop();
      api('login_wait', { id: id, trust: $('#ix-trust').checked }).then(function (j) {
        if (stopped) return;
        if (j.left != null) left = j.left;
        $('#ix-apt').textContent = 'Waiting… ' + Math.floor(left / 60) + ':' + ('0' + left % 60).slice(-2);
        done(j); if (!stopped) timer = setTimeout(tick, 2500);
      }, function () { if (!stopped) timer = setTimeout(tick, 4000); });
    };
    timer = setTimeout(tick, 1500);
    if (apf) apf.onsubmit = function (e) {
      e.preventDefault();
      api('login_code', { id: id, code: $('#ix-apcode').value, trust: $('#ix-trust').checked }).then(function (j) { if (j.ok) done(j); else $('#ix-ape').textContent = j.error || 'That code did not work.'; });
    };
    var K = window.__ixShell; if (K) K.beforeClose = function () { stop(); return true; };
  }
  /* pw: the password just typed. The login promise hands it to the page that asked (Info uses it to open its encrypted
     tabs right away, as they use the same password); it is never stored. */
  function loggedIn(pw) {
    var w = loginWait; loginWait = null;
    return refresh().then(function () {
      closeDlg();
      if (w) w.resolve(pw);
      document.dispatchEvent(new CustomEvent('hub:login'));
    });
  }
  function logout() {
    api('logout', {}).finally(function () {
      // private copies some pages keep in this browser
      ls.set('family4', null); ls.set('cards3', null); ls.set('notes4', null); ls.set('hub-recent-links', null);   // (1.72.0) Home's Recent Links
      try { sessionStorage.clear(); } catch (e) {}
      if (window.caches) caches.delete('hub-offline').catch(function () {});   // (1.72.0) Offline Reading's copy; the switch stays on
      window.HubVault.devDropAll();   // the "keep unlocked on this device" keys of Links and Info
      location.reload();
    });
  }

  /* The pages' own Edit buttons (and "Log in" buttons inside pages): logged out, they open the one login first. */
  document.addEventListener('click', function (e) {
    if (S.admin || !e.target.closest) return;
    var btn = e.target.closest('[data-hub="toggle"]');
    if (!btn) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (S.admin === undefined) { refresh().then(function () { if (S.admin) btn.click(); else login().then(function () { afterLogin(); }, function () {}); }); return; }   // state not loaded yet
    login().then(function () { afterLogin(); }, function () {});
  }, true);
  /* The pages' own Log out buttons end the one login everywhere. */
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('[data-hub="logout"]')) return;
    e.preventDefault(); e.stopImmediatePropagation(); logout();
  }, true);
  function afterLoad() {
    var a = null, then = null;
    try { a = sessionStorage.getItem('hub-after'); then = sessionStorage.getItem('hub-then'); sessionStorage.removeItem('hub-after'); sessionStorage.removeItem('hub-then'); } catch (e) {}
    if (a === 'edit') waitFor(function () { var b = q1('toggle'); return (b ? !b.disabled : ownEdit()) && document.readyState === 'complete'; },
      function () { setTimeout(function () { var t = q1('toggle'); if (!editing()) { if (t) t.click(); else document.body.classList.add('editing'); } if (then) setTimeout(function () { runItem(then); }, 450); }, 250); });
    if (/[#&]hub=settings/.test(location.hash) && S.admin) { history.replaceState(null, '', location.pathname + location.search); settings(); }
  }
  function waitFor(test, go) { var n = 0, t = setInterval(function () { if (test()) { clearInterval(t); go(); } else if (++n > 60) clearInterval(t); }, 100); }

  /* Links from other pages: …/info/#hub-info=<tab>&q=<text> opens that tab with the text highlighted; …#hub-edit starts editing. */
  function openFromHash() {
    var h = location.hash;
    var mi = /hub-info=([^&]+)&q=([^&]*)/.exec(h);
    if (mi && APP === 'info') {
      var id = decodeURIComponent(mi[1]), q = decodeURIComponent(mi[2]);
      history.replaceState(null, '', location.pathname + location.search);
      waitFor(function () { try { return typeof showTab === 'function' && typeof TABS !== 'undefined' && TABS.length > 0; } catch (e) { return false; } }, function () {
        try {
          if (TABS.some(function (t) { return t.id === id; })) {
            if (q && typeof setHighlight === 'function') setHighlight(q);
            showTab(id);
            setTimeout(function () { var m = document.querySelector('.box mark'); if (m) m.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }); }, 120);
          }
        } catch (e) {}
      });
      return;
    }
    if (/hub-edit/.test(h)) {
      history.replaceState(null, '', location.pathname + location.search);
      waitFor(function () { return S.admin !== undefined && document.readyState === 'complete'; }, function () { startEdit(); });
    }
  }

