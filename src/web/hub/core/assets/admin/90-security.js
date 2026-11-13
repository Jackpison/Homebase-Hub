  function pSecurity(p) {
    var SECS = [['pw', 'Password'], ['enc', 'Encryption'], ['pk', 'Passkeys'], ['2fa', 'Two-Step Login'],
                ['ap', 'Login Approval'], ['tr', 'Trusted Browsers'], ['dev', 'Devices']];
    p.innerHTML = '<div class="ix-hero" id="ix-sov">' + spinRow('Checking your protections…') + '</div><div class="ix-tiles" id="ix-stiles"></div><div id="ix-schk"></div>' +
      SECS.map(function (x) { return '<details class="ix-acc" data-sec="' + x[0] + '"><summary><span>' + x[1] + '</span><small data-sum="' + x[0] + '">…</small></summary><div class="ix-accb" data-body="' + x[0] + '"></div></details>'; }).join('');
    var body = function (k) { return p.querySelector('[data-body="' + k + '"]'); }, sum = function (k, t) { p.querySelector('[data-sum="' + k + '"]').textContent = t; };
    var acc = function (k) { return p.querySelector('[data-sec="' + k + '"]'); };
    var st = { vault: null, sv: null, svUse: [], pk: [], pkSecure: false, tabs: 0, bk: {}, ap: { trusted: [] } };

    // the site checks: what is good, and a warning for what is not
    p.querySelector('#ix-schk').innerHTML = '<div class="ix-sect">Site Checks</div><div class="ix-checks">' +
      (S.https ? checkRow('', '✓', 'HTTPS Is On', 'What you type travels encrypted, and encrypted tabs can work.')
               : checkRow('warn', '!', 'This Page Is Not Using HTTPS', 'Turn on SSL in your hosting panel, and "Always Use HTTPS" in Cloudflare (if you use it). Encrypted tabs need HTTPS.')) +
      checkRow('', '✓', S.dataOutside ? 'Your Data Is Outside the Site Folder' : 'Your Data Is Locked Away',
               S.dataOutside ? 'It lives in a folder you chose; copy it when you move the site.' : 'It lives in <code>site-data</code> inside the site folder, locked three ways, and travels with the site.') + '</div>';

    function overview() {
      var v = st.vault, bk = st.bk, a = st.ap;
      var have = [['HTTPS', !!S.https, 'Turn on HTTPS (see Site Checks below).'], ['Two-Step Login', !!S.twoStep, 'Turn on Two-Step Login: a stolen password alone then gets nobody in.'],
                  ['Encryption', encOn(), 'Set an encryption passphrase: encrypted tabs and backup files stay private even if someone copies the server.'],
                  ['Recovery Key', !!st.rec, 'Create a recovery key (Encryption): without it a forgotten passphrase means lost encrypted tabs.'],
                  ['Telegram Approval', !!a.on, 'Approve new logins in Telegram: you see every login and can refuse it.']];
      var on = have.filter(function (x) { return x[1]; }).length, todo = have.filter(function (x) { return !x[1]; })[0], total = have.length + 1, count = on + 1, pct = Math.round(count / total * 100);
      p.querySelector('#ix-sov').innerHTML =
        '<div class="ix-ring ' + (todo ? '' : 'ok') + '" style="--p:' + pct + '"><b>' + count + '</b><small>of ' + total + '</small></div>' +
        '<div class="ix-hero-t"><div class="ix-hero-h">' + (todo ? (count / total < 0.5 ? 'Your Site Needs More Protection' : 'A Good Start, With Room to Grow') : 'Everything Recommended Is On') + '</div>' +
          '<p>' + (todo ? '<b>Next best step:</b> ' + esc(todo[2]) : 'Your website password and every extra protection are on. Nothing to do here.') + '</p>' +
          '</div>';   // (1.74.2) the row of status chips is gone: the cards below say the same

      var trN = (a.trusted || []).length;
      p.querySelector('#ix-stiles').innerHTML =
        tile('pw', ICON.key, 'Password', 'Set', 'good', 'One password for every page.') +
        tile('enc', ICON.lock, 'Encryption', encLabel(), encOn() ? 'good' : 'warn', encOn() ? 'Info: ' + (v ? st.tabs + ' locked' : 'none') + ' · Links: ' + (st.lenc ? st.lenc + ' locked' : 'none') + ' · Backups: ' + (bk.set ? 'locked' : 'not locked') + '.' : 'Lock private tabs and backups with one passphrase.') +
        (encOn() ? tile('enc', ICON.shield, 'Recovery Key', st.rec ? 'Created' : 'Not Created', st.rec ? 'good' : 'warn', st.rec ? 'A spare way in if you ever forget the passphrase.' : 'Create one, so a forgotten passphrase does not mean lost tabs.') : '') +
        tile('2fa', ICON.device, 'Two-Step Login', S.twoStep ? 'On' : 'Off', S.twoStep ? 'good' : 'warn', S.twoStep ? S.recoveryLeft + ' recovery ' + (S.recoveryLeft === 1 ? 'code' : 'codes') + ' left.' : 'A 6-digit code from your phone on top of the password.') +
        tile('pk', ICON.device, 'Passkeys', st.pk.length ? st.pk.length + (st.pk.length === 1 ? ' Passkey' : ' Passkeys') : 'None', st.pk.length ? 'good' : '', st.pk.length ? 'Log in with your fingerprint, face or PIN.' : (st.pkSecure ? 'Log in with your fingerprint, face or PIN.' : 'Needs HTTPS.')) +   // (1.61.6) it had a tab but no card
        tile('ap', ICON.send, 'Login Approval', a.on ? 'On' : 'Off', a.on ? 'good' : '', a.on ? 'Every new browser waits for your tap in Telegram.' : (a.telegram ? 'Approve new logins with one tap in Telegram.' : 'Needs the Telegram bot to be set up first.')) +
        tile('tr', ICON.desktop, 'Trusted Browsers', trN ? trN + (trN === 1 ? ' Browser' : ' Browsers') : 'None', '', 'Browsers that skip the code and the tap for 30 days.') +
        tile('dev', ICON.out, 'Devices', '', '', 'Log out every other device in one tap.');
      p.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { var d = acc(b.dataset.go); d.open = true; d.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }; });
      sum('pw', 'Change the one password');
      sum('enc', (encOn() ? 'Passphrase Set' : 'Not Set') + ' · Info tabs: ' + (v ? st.tabs + ' encrypted' : 'none') + ' · Links tabs: ' + (st.lenc ? st.lenc + ' encrypted' : 'none') + ' · Backups: ' + (bk.set ? 'encrypted' : 'not encrypted'));
      sum('pk', st.pk.length ? st.pk.length + (st.pk.length === 1 ? ' passkey' : ' passkeys') : 'None');
      sum('2fa', S.twoStep ? 'On · ' + S.recoveryLeft + ' recovery codes left' : 'Off');
      sum('ap', a.on ? 'On' : 'Off');
      sum('tr', trN ? trN + ' ' + (trN === 1 ? 'browser' : 'browsers') : 'None');
      sum('dev', 'Log Out Other Devices');
    }
    function load() {
      return Promise.all([
        fetch(ROOT + 'web/info/api.php', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
        api('bkkey').catch(function () { return {}; }), api('approval').catch(function () { return {}; }),
        fetch(ROOT + 'web/links/api.php?action=get', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
        api('sv_get').catch(function () { return {}; }), api('pk_list').catch(function () { return {}; })
      ]).then(function (r) {
        var info = r[0];
        st.pk = r[5] && r[5].ok ? r[5].keys : []; st.pkSecure = !!(r[5] && r[5].secure);
        st.sv = r[4] && r[4].ok && r[4].vault && r[4].vault.wrap ? r[4].vault : null; st.svUse = (r[4] && r[4].use) || [];
        st.vault = info && info.page && info.page.vault || null;
        st.info = info; st.tabs = info && info.tabs ? info.tabs.filter(function (t) { return t.enc; }).length : 0;
        st.bk = r[1] && r[1].ok ? r[1] : {}; st.ap = r[2] && r[2].ok ? r[2] : { trusted: [] };
        st.lenc = r[3] && r[3].data && r[3].data.tabs ? r[3].data.tabs.filter(function (t) { return typeof t.enc === 'string'; }).length : 0;
        st.lvault = r[3] && r[3].data && r[3].data.settings && r[3].data.settings.vault && r[3].data.settings.vault.wrap ? r[3].data.settings.vault : null;
        st.rec = !!((st.vault && st.vault.rec) || (st.lvault && st.lvault.rec) || (st.sv && st.sv.rec));
        st.recGap = st.rec && ((st.vault && !st.vault.rec) || (st.lvault && !st.lvault.rec) || (st.sv && !st.sv.rec));   // a key made before the site key existed does not cover it
        overview(); drawEnc(); drawPk(); drawAp(); drawTrusted();
      });
    }
    secRefresh = function () { overview(); };

    /* Password */
    body('pw').innerHTML = '<form id="ix-cp">' + ecCard('ix-split', ICON.key, 'Website Password', 'One password opens every page of this site. Changing it logs out your other devices, and encryption that uses it follows along. Use at least 8 characters: a few words you will remember beat a short jumble.',
        '<div class="ix-frm">' + ecField('ix-cur', 'Current Password', 'password', 'current-password') + ecField('ix-n1', 'New Password', 'password', 'new-password') + ecField('ix-n2', 'Type It Again', 'password', 'new-password') + '</div>' +
        '<div class="ix-fact"><div class="ix-meterw" id="ix-pwm"><div class="ix-meter"><i></i></div><small></small></div><button class="ix-btn pri">Change Password</button></div><p class="ix-err" id="ix-cpe"></p>') + '</form>';
    p.querySelector('#ix-n1').oninput = function () {
      var r = pwScore(this.value), m = p.querySelector('#ix-pwm'), bar = m.querySelector('i');
      m.classList.toggle('on', !!this.value); bar.style.width = this.value ? r.pct + '%' : '0'; bar.className = r.cls; m.querySelector('small').textContent = this.value ? r.label : '';
    };
    p.querySelector('#ix-cp').onsubmit = function (e) {
      e.preventDefault(); var er = p.querySelector('#ix-cpe');
      if (p.querySelector('#ix-n1').value !== p.querySelector('#ix-n2').value) { er.textContent = "The two new passwords don't match."; return; }
      var cur = p.querySelector('#ix-cur').value, nw = p.querySelector('#ix-n1').value, btn = e.target.querySelector('button.pri');
      btn.disabled = true; er.textContent = 'Changing…';
      Promise.all([rewrapVault(cur, nw), rewrapLinks(cur, nw)]).then(function (r) {
        var v = r[0], lv = r[1];
        return api('password', { current: cur, password: nw, vault: v ? v.vault : null, prev: v ? v.prev : '', linksVault: lv ? lv.vault : null, linksPrev: lv ? lv.prev : '' }).then(function (j) {
          if (!j.ok) { er.textContent = j.error; return; }
          S.csrf = j.csrf; e.target.reset(); p.querySelector('#ix-n1').oninput();
          var also = [];
          if (j.vault) also.push('Info\'s encrypted tabs');
          if (j.links) also.push('Links\' encrypted tabs');
          if (j.backup) also.push('new encrypted backups');
          er.innerHTML = '<span class="ix-ok">Password changed. Other devices are logged out.' + (also.length ? ' ' + esc(also.join(' and ')) + ' now use the new password too.' : '') +
            (j.backup ? ' Backup files made before today still open with the old one.' : '') + '</span>';
          load();
        });
      }).catch(function () { er.textContent = "Can't reach the server. Nothing was changed."; }).finally(function () { btn.disabled = false; });
    };

    /* Passkeys (1.61.0): log in with a fingerprint, face, PIN or security key. Adding or removing one needs the website password. */
    function drawPk() {
      var b = body('pk'), keys = st.pk || [], can = !!(window.PublicKeyCredential && st.pkSecure && window.isSecureContext);
      var when1 = function (t) { return t ? K.when(t) : 'never'; };
      var list = keys.length ? '<div class="ix-devs">' + keys.map(function (k) {
        return '<div class="ix-dev"><span class="ix-dev-i" aria-hidden="true">' + svg(ICON.key) + '</span><div class="ix-dev-b"><b>' + esc(k.name) + '</b><small>Added ' + esc(when1(k.at)) + ' · Last used ' + esc(when1(k.last)) + '</small></div>' +
          '<button type="button" class="ix-btn" data-pkren="' + esc(k.id) + '">Rename</button><button type="button" data-hold class="ix-btn danger" data-pkdel="' + esc(k.id) + '">Remove</button></div>'; }).join('') + '</div>'
        : '<p class="ix-note">No passkey yet. Add one below, on this device or with a security key.</p>';
      // (1.77.2) no separate header and no "No Passkeys Yet" card: your passkeys are rows, and Add a Passkey is one card under them
      // (1.78.0) one card: what a passkey is on the left, your passkeys and the way to add one on the right
      var pkDesc = 'Log in with a fingerprint, face, PIN or security key. A passkey already counts as two steps in one, so it skips the two-step code and the Telegram tap. Your password stays as the other way in. Adding or removing one needs your website password.';
      b.innerHTML = can ? ecCard('ix-split', ICON.device, 'Passkeys', pkDesc, list + '<div id="ix-pkst"></div><p class="ix-err" id="ix-pke"></p>', '<span class="ix-pill ' + (keys.length ? 'good' : '') + '">' + (keys.length ? keys.length + (keys.length === 1 ? ' Passkey' : ' Passkeys') : 'None Yet') + '</span>')
        : ecCard('ix-split warn', ICON.lock, 'Passkeys Are Not Available Here', 'Passkeys need a secure (https) connection and a browser that supports them.' + (keys.length ? ' You can still remove the ones you have: type your website password below.' : ''),
            list + (keys.length ? '<div class="ix-frm">' + ecField('ix-pkw', 'Website Password', 'password', 'current-password') + '</div><p class="ix-err" id="ix-pke"></p>' : ''));
      var err = function (t) { var e = b.querySelector('#ix-pke'); if (e) e.textContent = t; }, val = function (id) { var x = b.querySelector(id); return x ? x.value : ''; };
      /* (1.69.0) Add a Passkey is a Stepper: Name -> Your Device (the last button, #ix-pkadd, asks the device). A wrong password goes back. */
      var pkHost = b.querySelector('#ix-pkst');
      if (pkHost) stepper(pkHost, { kind: 'dots', linear: true, lastId: 'ix-pkadd', complete: 'Ask My Device',
        steps: [
          { title: 'Name', html: '<div class="ix-frm">' + ecField('ix-pkn', 'Name', 'text', 'off', '', '', ' placeholder="Like My Phone or Laptop"') + ecField('ix-pkw', 'Website Password', 'password', 'current-password') + '</div>',
            next: function (q, c) { if (!val('#ix-pkw')) { c.err('Type your website password first.'); return false; } } },
          { title: 'Your Device', html: '<p>Your browser or phone now asks which device or key to use: your fingerprint, face, PIN or a security key.</p>',
            next: function (q, c) {
              var pw = val('#ix-pkw'), nm = val('#ix-pkn').trim() || 'Passkey'; err('');
              return api('pk_register_begin', { password: pw }).then(function (j) {
                if (!j.ok) { if (j._status === 401) { var e = new Error('That isn\'t your website password.'); e.back = true; throw e; } throw new Error(j.error || 'Could not start.'); }
                var o = j.publicKey, H = window.HUB;
                return navigator.credentials.create({ publicKey: { challenge: H.b64uBuf(o.challenge), rp: o.rp, user: { id: H.b64uBuf(o.user.id), name: o.user.name, displayName: o.user.displayName }, pubKeyCredParams: o.pubKeyCredParams, timeout: o.timeout,
                  attestation: o.attestation, authenticatorSelection: o.authenticatorSelection, excludeCredentials: (o.excludeCredentials || []).map(function (x) { return { type: 'public-key', id: H.b64uBuf(x.id) }; }) } });
              }).then(function (cr) {
                if (!cr) throw new Error('No passkey was made.');
                var H = window.HUB;
                return api('pk_register_finish', { name: nm, response: { clientDataJSON: H.bufB64u(cr.response.clientDataJSON), attestationObject: H.bufB64u(cr.response.attestationObject) } });
              }).then(function (j) {
                if (!j.ok) throw new Error(j.error || 'The passkey was not saved.');
                st.pk = j.keys; toast('Passkey added.'); return true;
              }).catch(function (x) {
                var msg = x && x.name === 'NotAllowedError' ? 'No passkey was made: it was cancelled or timed out.' : x && x.name === 'InvalidStateError' ? 'This device already has a passkey here.' : (x && x.message) || 'Could not add a passkey.';
                if (x && x.back) { setTimeout(function () { c.go(1); c.err(msg); }, 0); return false; }   // after the Stepper has finished this try
                throw new Error(msg);
              });
            } }],
        done: '<div class="ix-st-fin"><span class="ix-st-big"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg></span><h3>Passkey added</h3><p>It can log in without the password now.</p></div>',
        onDone: function () { setTimeout(function () { drawPk(); overview(); }, 1200); } });
      // (1.62.1) Remove used to say nothing near the button: its messages went to the line in the box below, out of sight. Now each one also shows as a message on top.
      var say = function (t) { err(t); toast(t, true); };
      b.querySelectorAll('[data-pkdel]').forEach(function (x) { x.onclick = function () {
        var pw = val('#ix-pkw'), pwBox = b.querySelector('#ix-pkw');
        if (!pw) {
          say('Type your website password in the box below, then press Remove again.');
          if (pwBox) { pwBox.scrollIntoView({ block: 'center', behavior: 'smooth' }); pwBox.focus(); }
          return;
        }
        x.disabled = true; api('pk_delete', { id: x.dataset.pkdel, password: pw }).then(function (j) {
          if (!j.ok) { say(j._status === 401 ? 'That isn\'t your website password.' : j.error || 'Could not remove it.'); x.disabled = false; x.dataset.armed = ''; x.textContent = 'Remove'; return; }
          st.pk = j.keys; toast('Passkey removed.'); drawPk(); overview();
        });
      }; });
      b.querySelectorAll('[data-pkren]').forEach(function (x) { x.onclick = function () {
        var k = keys.filter(function (y) { return y.id === x.dataset.pkren; })[0]; if (!k) return;
        var nn = window.prompt('A new name for this passkey', k.name); if (nn == null || !nn.trim()) return;
        api('pk_rename', { id: k.id, name: nn.trim() }).then(function (j) { if (j.ok) { st.pk = j.keys; drawPk(); } else toast(j.error || 'Could not rename it.', true); });
      }; });
    }

    /* Two-step login */
    twoStep(body('2fa'));

    /* Encryption: one passphrase, a second password for secure data. It locks Info's encrypted tabs, Links' encrypted tabs and backup
       files (also the ones sent to Telegram). Set it or remove it; that is all there is to do here. */
    function encOn() { return !!(st.bk && st.bk.pp); }
    function encLabel() { return encOn() ? 'Passphrase Set' : (st.vault || st.lvault || (st.bk && st.bk.set)) ? 'Older Setting' : 'Off'; }
    function drawEnc() {
      var b = body('enc'), bk = st.bk, on = encOn();
      if (!bk.ok) { b.innerHTML = spinRow(); return; }
      var cnt = function (n, has, hint) { return has ? n + ' ' + (n === 1 ? 'tab' : 'tabs') + ' encrypted' : hint; };
      var card = ecCard, chip = ecChip;
      var fd = function (id, label, auto, hint, wrapId) { return ecField(id, label, 'password', auto, hint, wrapId); };
      var chips = '<div class="ix-chips">' +
        chip('Info Tabs', cnt(st.tabs, !!st.vault, on ? 'none locked yet' : 'none'), !!st.vault && st.tabs > 0) +
        chip('Links Tabs', cnt(st.lenc, !!st.lvault, on ? 'none locked yet' : 'none'), !!st.lvault && st.lenc > 0) +
        chip('Files, Cards, Presets', st.sv ? (st.svUse.length ? st.svUse.join(', ') + ' locked' : 'ready') : (on ? 'ready' : 'none'), !!st.sv && st.svUse.length > 0) +
        chip('Backup Files', bk.available ? (bk.set ? 'locked' : 'not locked') : 'not available on this host', !!bk.set) + '</div>';
      var hintTabs = on ? '<p class="ix-note">To lock a tab: edit it, then choose Encrypted Tab.</p>' : '';
      var older = (!on && (st.vault || st.lvault || bk.set)) ? '<p class="ix-note">Some locked data still uses an older key. Setting the passphrase moves it all.</p>' : '';
      var html;
      if (!on) {
        html = card('intro', ICON.shield, 'Lock Your Private Tabs and Backups', 'One passphrase locks your Files, Cards and saved presets, the encrypted tabs in Info and Links, and your backup files. Only you can unlock them, even if someone copies your server.', chips) + older +
          card('', ICON.key, 'Set a Passphrase', 'Three steps: the passphrase, your website password to confirm it is you, then a recovery key in case you ever forget it.',
            '<div id="ix-encst"></div><p class="ix-err" id="ix-ee"></p>');
      } else {
        html = card('good', ICON.shield, 'Encryption Is On', 'Your locked data, tabs and backup files are protected by your passphrase.', chips + hintTabs) + older +
          card('', ICON.key, 'Change Passphrase', 'Pick a new one. Your locked data is not touched, so this takes a moment. New backups use the new passphrase; older backup files keep opening with the old one.',
            '<div class="ix-frm">' + fd('ix-ccur', 'Current Passphrase or Recovery Key', 'off') + fd('ix-cpw', 'Website Password', 'current-password') + fd('ix-cn1', 'New Passphrase', 'new-password') + fd('ix-cn2', 'Type It Again', 'new-password') + '</div>' +
            '<div class="ix-fact"><p class="ix-err" id="ix-ce"></p><button type="button" class="ix-btn pri" id="ix-cgo">Change Passphrase</button></div>') +
          '<div id="ix-rec">' + card('', ICON.box, 'Recovery Key', 'A spare way in. If you ever forget the passphrase, this code opens your Files, Cards, presets and locked tabs and lets you set a new passphrase. Keep it somewhere safe (print it, or put it in a password manager): anyone who has it can open them.',
            '<div class="ix-frm">' + fd('ix-rpp', 'Your Passphrase', 'off') + fd('ix-rpw', 'Website Password', 'current-password') + '</div>' +
            '<div class="ix-fact"><p class="ix-err" id="ix-re"></p><button type="button" class="ix-btn pri" id="ix-rmk">' + (st.rec ? 'Make a New Recovery Key' : 'Create Recovery Key') + '</button>' +
            (st.rec ? '<button type="button" data-hold class="ix-btn danger" id="ix-rdel">Remove Recovery Key</button>' : '') + '</div><div id="ix-rshow"></div>',
            '<span class="ix-pill ' + (st.rec ? 'good' : '') + '">' + (st.rec ? (st.recGap ? 'Make a New One' : 'Created') : 'Not Created') + '</span>') +
          (st.recGap ? '<p class="ix-note">Your recovery key is older than Files and Cards. Make a new one below.</p>' : '') + '</div>' +
          '<form id="ix-ef">' + card('danger', ICON.out, 'Remove Encryption', 'Locked tabs turn back into normal private tabs (still hidden from visitors) and backup files stop being locked. To use a different passphrase, change it above instead.',
            '<div class="ix-frm">' + fd('ix-ecur', 'Your Passphrase', 'off') + fd('ix-epw', 'Website Password', 'current-password') + '</div>' +
            fd('ix-eold', 'Earlier Passphrase', 'off', 'The one your existing locked tabs use now.', 'ix-eoldw') +
            '<div class="ix-fact"><p class="ix-err" id="ix-ee"></p><button type="button" data-hold class="ix-btn danger" id="ix-erm">Remove Passphrase</button></div>') + '</form>';
      }
      b.innerHTML = tabHead(ICON.lock, 'Encryption', 'One passphrase locks your Files, Cards and saved presets, your private tabs in Info and Links, and your backup files. Only you can unlock them.') + html;
      var er = b.querySelector('#ix-ee'), val = function (id) { var x = b.querySelector(id); return x ? x.value : ''; };
      var run = function (btn, msg, work, ok) {
        btn.disabled = true; er.textContent = msg;
        work().then(function () { er.textContent = ''; toast(ok); afterVaultChange(); })
          .catch(function (x) { er.textContent = x && x.user ? x.message : "Can't reach the server. Nothing was changed."; if (x && x.needOld) b.querySelector('#ix-eoldw').hidden = false; if (btn.dataset.armed) { btn.dataset.armed = ''; btn.textContent = 'Remove Passphrase'; } })
          .finally(function () { btn.disabled = false; });
      };
      /* (1.69.0) the first passphrase is a Stepper: Passphrase -> Confirm It's You (sets it) -> Recovery Key (made and shown at once) */
      if (!on) {
        var recCode = '', recFail = function (x) { return x && x.user ? x.message : "Can't reach the server. Nothing was changed."; };
        stepper(b.querySelector('#ix-encst'), { kind: 'numbers', linear: true, complete: 'Finish',
          steps: [
            { title: 'Passphrase', html: '<p>At least 8 characters. A few words you will remember work better than a short jumble.</p><div class="ix-frm">' + fd('ix-en1', 'New Passphrase', 'new-password') + fd('ix-en2', 'Type It Again', 'new-password') + '</div>' +
                '<label class="ix-chk"><input type="checkbox" id="ix-eack"> I understand a lost passphrase cannot be recovered without a recovery key</label>',
              next: function (p, c) {
                if (val('#ix-en1').length < 8) { c.err('Use at least 8 characters for the passphrase.'); return false; }
                if (val('#ix-en1') !== val('#ix-en2')) { c.err('The two passphrases are not the same.'); return false; }
                if (!b.querySelector('#ix-eack').checked) { c.err('Please confirm you understand the passphrase can\'t be recovered.'); return false; } } },
            { title: 'Confirm It\'s You', html: fd('ix-epw', 'Website Password', 'current-password', 'To confirm that it is you. This sets the passphrase.') +
                fd('ix-eold', 'Earlier Passphrase', 'off', 'The one your existing locked tabs use now.', 'ix-eoldw'),
              next: function (p, c) {
                if (!val('#ix-epw')) { c.err('Type your website password.'); return false; }
                return PP.set({ pp: val('#ix-en1'), site: val('#ix-epw'), old: val('#ix-eold') }).then(function () { toast('Passphrase set. Info tabs, Links tabs and backups use it now.'); return true; },
                  function (x) { if (x && x.needOld) b.querySelector('#ix-eoldw').hidden = false; throw new Error(recFail(x)); });
              } },
            { title: 'Recovery Key', html: '<p>A spare way in: if you ever forget the passphrase, this code opens your locked data and lets you set a new passphrase. It is shown only once. You can also make it later, in this section.</p>' +
                '<div id="ix-ercode"><div class="ix-row"><button type="button" class="ix-btn pri" id="ix-ermk">Make My Recovery Key</button></div></div>' +
                '<label class="ix-chk" id="ix-erackw" hidden><input type="checkbox" id="ix-erack"> I saved the recovery key somewhere safe</label>',
              // (1.69.0) made on a click, not on arrival: it is slow work (600,000 rounds), and some people want it later
              enter: function (p, c) {
                var mk = p.querySelector('#ix-ermk'); if (!mk || mk.__on) return; mk.__on = true;
                mk.onclick = function () {
                  mk.disabled = true; mk.textContent = 'Making it…'; c.err(''); c.block(3, true);
                  PP.makeRecovery({ pp: val('#ix-en1'), site: val('#ix-epw') }).then(function (code) {
                    recCode = code; st.rec = true;
                    p.querySelector('#ix-ercode').innerHTML = linkField({ id: 'ix-rcode', value: code, prefix: 'Key', readonly: true, copyId: 'ix-ercopy', label: 'Recovery key', cls: 'ix-uf-key', wrap: true });
                    p.querySelector('#ix-erackw').hidden = false; c.block(3, false);
                  }, function (x) { mk.disabled = false; mk.textContent = 'Make My Recovery Key'; c.err(recFail(x)); c.block(3, false); });
                };
              },
              next: function (p, c) { if (recCode && !b.querySelector('#ix-erack').checked) { c.err('Tick the box once you have saved it.'); return false; } } }],
          done: '<div class="ix-st-fin"><span class="ix-st-big"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg></span><h3>Encryption is on</h3><p>To lock a tab: edit it, then choose Encrypted Tab.</p></div>',
          onDone: function () { setTimeout(afterVaultChange, 1400); } });
      }
      var cgo = b.querySelector('#ix-cgo');
      if (cgo) cgo.onclick = function () {
        var ce = b.querySelector('#ix-ce'), cur = val('#ix-ccur'), n1 = val('#ix-cn1'), site = val('#ix-cpw');
        if (!cur) { ce.textContent = 'Type the current passphrase (or a recovery key).'; return; }
        if (n1.length < 8) { ce.textContent = 'Use at least 8 characters for the new passphrase.'; return; }
        if (n1 !== val('#ix-cn2')) { ce.textContent = 'The two new passphrases are not the same.'; return; }
        if (!site) { ce.textContent = 'Type your website password.'; return; }
        cgo.disabled = true; ce.textContent = 'Changing…';
        PP.set({ pp: n1, site: site, old: cur, change: true }).then(function () { ce.textContent = ''; toast('Passphrase changed. Info tabs, Links tabs and new backups use it now.'); afterVaultChange(); })
          .catch(function (x) { ce.textContent = x && x.user ? x.message : "Can't reach the server. Nothing was changed."; })
          .finally(function () { cgo.disabled = false; });
      };
      var rmk = b.querySelector('#ix-rmk'), rdel = b.querySelector('#ix-rdel');
      if (rmk) rmk.onclick = function () {
        var re = b.querySelector('#ix-re'), pp = val('#ix-rpp'), site = val('#ix-rpw');
        if (!pp || !site) { re.textContent = 'Type the passphrase and your website password first.'; return; }
        rmk.disabled = true; re.textContent = 'Making it…';
        PP.makeRecovery({ pp: pp, site: site }).then(function (code) {
          re.textContent = ''; st.rec = true;
          b.querySelector('#ix-rshow').innerHTML = '<div class="ix-status"><span class="ix-ok">✓</span><span><b>Your recovery key. It is shown only now.</b></span></div>' + linkField({ id: 'ix-rcode', value: code, prefix: 'Key', readonly: true, copyId: 'ix-rcopy', label: 'Recovery key', cls: 'ix-uf-key', wrap: true }) +
            '<p class="ix-note">Save it before you close this. A key made earlier no longer works.</p>';
          toast('Recovery key created.');
        }).catch(function (x) { re.textContent = x && x.user ? x.message : "Can't reach the server. Nothing was changed."; })
          .finally(function () { rmk.disabled = false; });
      };
      if (rdel) rdel.onclick = function () {
        var re = b.querySelector('#ix-re'), site = val('#ix-rpw');
        if (!site) { re.textContent = 'Type your website password first.'; return; }
        rdel.disabled = true; re.textContent = 'Removing…';
        PP.dropRecovery({ site: site }).then(function () { toast('Recovery key removed.'); afterVaultChange(); drawEnc(); })
          .catch(function (x) { re.textContent = x && x.user ? x.message : "Can't reach the server. Nothing was changed."; rdel.dataset.armed = ''; rdel.textContent = 'Remove Recovery Key'; })
          .finally(function () { rdel.disabled = false; });
      };
      var rm = b.querySelector('#ix-erm');
      if (rm) rm.onclick = function () {
        var pp = val('#ix-ecur'), site = val('#ix-epw');
        if (!pp || !site) { er.textContent = 'Type the passphrase and your website password first.'; return; }
        run(rm, 'Decrypting…', function () { return PP.remove({ pp: pp, site: site, old: val('#ix-eold') }); }, 'Passphrase removed. Encrypted tabs are normal private tabs now.');
      };
    }
    // Info open behind Settings holds the old key: it reloads so it never saves with it
    function afterVaultChange() { if (APP === 'info') setTimeout(function () { location.reload(); }, 900); else load(); }

    /* Approve logins in Telegram */
    function drawAp() {
      var b = body('ap'), a = st.ap;
      if (!a.ok) { b.innerHTML = spinRow(); return; }
      b.innerHTML = ecCard('ix-split' + (a.on ? ' good' : ''), ICON.send, 'Login Approval',
          'Even someone who knows your password cannot get in until you tap <b>Approve</b> on a message from your Telegram bot, after the password (and the two-step code). You see every login and can refuse it.',
          (a.telegram ? '' : '<div class="ix-status"><span>!</span><span><b>Set up the Telegram bot first.</b> <a href="#" id="ix-apgo">Open Settings › Telegram</a></span></div>') +
          '<form id="ix-apform"><div class="ix-fact ix-fbot">' + ecField('ix-appw', 'Website Password', 'password', 'current-password', '', '', ' placeholder="' + (a.on ? 'Needed to turn this off' : 'Needed to turn this on') + '"') +
            (a.on ? '<button class="ix-btn" data-ap="off">Turn Off</button>' : '<button class="ix-btn pri" data-ap="on"' + (a.telegram ? '' : ' disabled') + '>Turn On</button>') + '</div>' +
            '<p class="ix-err" id="ix-aperr"></p></form>',
          '<span class="ix-pill ' + (a.on ? 'good' : '') + '">' + (a.on ? 'On' : 'Off') + '</span>') +
        '<div class="ix-sect">If Something Goes Wrong</div><div class="ix-trio">' +
          '<div class="ix-mini"><b>Telegram Can\'t Be Reached</b><p>The login goes through, because the password was already right.</p></div>' +
          '<div class="ix-mini"><b>No Phone With You</b><p>' + (S.twoStep ? 'Use one of your two-step recovery codes.' : 'Turn on Two-Step Login, so a recovery code can stand in for the tap.') + '</p></div>' +
          '<div class="ix-mini"><b>Locked Out Completely</b><p>Delete <code>site-data/core/login-approval.php</code> in your hosting file manager.</p></div></div>';
      var go2 = b.querySelector('#ix-apgo'); if (go2) go2.onclick = function (e) { e.preventDefault(); go('telegram'); };
      b.querySelectorAll('[data-ap]').forEach(function (x) { x.onclick = function (e) {
        e.preventDefault(); var k = x.dataset.ap;
        api('approval_' + k, { password: b.querySelector('#ix-appw').value }).then(function (j) {
          if (!j.ok) { b.querySelector('#ix-aperr').textContent = j.error || 'That did not work.'; return; }
          toast(k === 'off' ? 'Login approval is off.' : 'Login approval is on.');
          api('approval').then(function (n) { st.ap = n; overview(); drawAp(); drawTrusted(); });
        });
      }; });
    }
    /* Trusted browsers: skip the two-step code and the Telegram question for 30 days */
    function drawTrusted() {
      var b = body('tr'), t = st.ap.trusted || [];
      b.innerHTML = tabHead(ICON.desktop, 'Trusted Browsers', 'Skip the code and the Telegram tap for 30 days on a browser you trust. Add one with "Trust this browser" when you log in.') +
        (t.length ? '<div class="ix-devs">' + t.map(function (x) {
          return '<div class="ix-dev"><span class="ix-dev-i">' + svg(ICON.desktop) + '</span><div class="ix-dev-b"><b>' + esc(x.name) + (x.me ? ' <span class="ix-pill good">This One</span>' : '') + '</b>' +
            '<small>' + esc(x.ip || 'Unknown Address') + ' · last used ' + esc(when(x.last)) + ' · trusted until ' + esc(new Date(x.until * 1000).toLocaleDateString()) + '</small></div>' +
            '<button type="button" class="ix-btn" data-untrust="' + x.i + '">Remove</button></div>'; }).join('') + '</div>' +
          '<div class="ix-row" style="margin-top:14px"><button type="button" class="ix-btn danger" data-untrust="-1">Remove All</button></div>'
          : '<div class="ix-empty"><span class="ix-empty-i">' + svg(ICON.desktop) + '</span><b>No Trusted Browsers Yet</b><p>Tick "Trust this browser" the next time you log in, and it shows up here.</p></div>');
      b.querySelectorAll('[data-untrust]').forEach(function (x) { x.onclick = function () {
        api('approval_untrust', { i: +x.dataset.untrust }).then(function (j) { if (j.ok) { toast('Removed.'); api('approval').then(function (n) { st.ap = n; overview(); drawTrusted(); }); } });
      }; });
    }

    /* Devices: who is logged in (end any login), the two log-out buttons, and the recent login history */
    function drawDevices() {
      var b = body('dev');
      b.innerHTML = tabHead(ICON.out, 'Devices and Login History', 'See where you are logged in, end any login, and look back at recent activity.') +
        '<div class="ix-sect" style="margin-top:0">Logged In Now</div><div id="ix-devl">' + spinRow() + '</div>' +
        '<div class="ix-sect">Log Out</div><div class="ix-duo">' +
          ecCard('', ICON.users, 'Log Out Other Devices', 'Ends every login except this one, on every page. Use it if you lost a phone or used a shared computer.', '<div class="ix-row"><button type="button" class="ix-btn pri" id="ix-lo">Log Out Other Devices</button></div>') +
          ecCard('danger', ICON.out, 'Log Out Here', 'Ends the login on this browser only. Other devices stay logged in.', '<div class="ix-row"><button type="button" class="ix-btn danger" data-ix="logout">Log Out Here</button></div>') + '</div>' +
        '<div class="ix-sect">Recent Activity</div><div id="ix-act">' + spinRow() + '</div>';
      b.querySelector('#ix-lo').onclick = function () { api('logoutall', {}).then(function (j) { if (j.ok) { S.csrf = j.csrf; toast('Every other device is logged out.'); drawDevices(); } else toast(j.error); }); };
      api('activity').then(function (j) {
        var dl = b.querySelector('#ix-devl'), al = b.querySelector('#ix-act'); if (!dl) return;
        if (!j || !j.ok) { dl.innerHTML = al.innerHTML = '<p class="ix-err">' + esc((j && j.error) || 'Could not load.') + '</p>'; return; }
        dl.innerHTML = j.sessions.length ? '<div class="ix-devs">' + j.sessions.map(function (x) {
          var phone = /Android|iOS/.test(x.who);
          return '<div class="ix-dev"><span class="ix-dev-i">' + svg(phone ? ICON.device : ICON.desktop) + '</span><div class="ix-dev-b"><b>' + esc(x.who || 'Unknown Browser') + (x.me ? ' <span class="ix-pill good">This Device</span>' : '') + '</b>' +
            '<small>' + esc(x.ip || 'Unknown address') + ' · logged in ' + esc(ago(x.t)) + '</small></div>' + (x.me ? '' : '<button type="button" class="ix-btn" data-rev="' + esc(x.id) + '">Log Out</button>') + '</div>'; }).join('') + '</div>'
          : '<div class="ix-empty"><b>Nothing Recorded Yet</b><p>Logins from now on are listed here. Logins made before this version are not.</p></div>';
        dl.querySelectorAll('[data-rev]').forEach(function (x) { x.onclick = function () {
          x.disabled = true; api('session_revoke', { id: x.dataset.rev }).then(function (k) { toast(k.ok ? 'That device is logged out.' : (k.error || 'Could not log it out.')); drawDevices(); }); }; });
        var rows = j.events.filter(function (e) { return LOGSEC[e.ev]; }).map(actRow);   // only the security events here; everything else is in Logs > Activity
        al.innerHTML = rows.length ? '<div class="ix-checks">' + rows.slice(0, 15).join('') + '</div>' + (rows.length > 15 ? '<div class="ix-row" style="margin-top:12px"><button type="button" class="ix-btn" id="ix-actmore">Show ' + (rows.length - 15) + ' More</button></div>' : '')
          : '<div class="ix-empty"><b>No Activity Yet</b><p>Logins, wrong passwords and security changes appear here.</p></div>';
        var more = al.querySelector('#ix-actmore'); if (more) more.onclick = function () { al.querySelector('.ix-checks').innerHTML = rows.join(''); more.remove(); };
      }).catch(function () { var dl = b.querySelector('#ix-devl'); if (dl) dl.innerHTML = b.querySelector('#ix-act').innerHTML = '<p class="ix-err">Can\'t reach the server.</p>'; });
    }
    var devAcc = acc('dev'); drawDevices();
    devAcc.addEventListener('toggle', function () { if (devAcc.open) drawDevices(); });

    load();   // (1.77.1) drawn once, when the data is there: it used to draw with empty values first, and then change
  }
  /* POST to Info's own API (encrypted tabs live there) with the site's security token. Resolves the fetch Response. */
  function infoApi(b) {
    return fetch(ROOT + 'web/info/api.php', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json', 'X-Hub-CSRF': S.csrf || '' }, body: JSON.stringify(b) });
  }
  /* Info's and Links' encrypted-tab keys: the shared encryption in shell.js (section 14, window.HubVault). Everything happens here. */
  var VK = (function () {
    var V = window.HubVault;
    return {
      unwrap: function (v, pass) {   // the raw key, or null when the password (or the recovery key) doesn't fit
        if (!V.ok()) return Promise.reject(new Error('Encrypted tabs need a secure (https) connection.'));
        return V.unwrap(v, pass);
      },
      wrap: V.wrap,
      use: function (raw) { return V.useKey(raw, true); },
      open: function (s, key) { return V.openDeep(key, s); }   // plain text from "enc1:..." (also text that was encrypted more than once)
    };
  })();
  /* Info's encrypted tabs that use the website password: their key is re-wrapped here, in the browser, with the new password
     (the server never sees the key). Resolves {vault, prev}, or null when there is nothing to re-wrap. */
  function rewrapVault(cur, nw) {
    if (!window.crypto || !crypto.subtle) return Promise.resolve(null);
    return fetch(ROOT + 'web/info/api.php', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      var v = j && j.page && j.page.vault;
      if (!v || !v.login) return null;
      return VK.unwrap(v, cur).then(function (raw) {
        if (!raw) return null;   // wrapped with another password (changed while away): unlock it once in Settings › Security
        return VK.wrap(raw, nw, true).then(function (nv) { raw.fill(0); return { vault: nv, prev: v.wrap }; });
      });
    }, function () { return null; });
  }
  /* The same for Links' encrypted tabs: their key is wrapped with the website password and follows it here, in the browser. */
  function rewrapLinks(cur, nw) {
    if (!window.crypto || !crypto.subtle) return Promise.resolve(null);
    return fetch(ROOT + 'web/links/api.php?action=get', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      var v = j && j.data && j.data.settings && j.data.settings.vault;
      if (!v || !v.login || !v.wrap) return null;
      return VK.unwrap(v, cur).then(function (raw) {
        if (!raw) return null;   // locked with another password (changed while away): open it once in Links with "I changed my password"
        return VK.wrap(raw, nw, true).then(function (nv) { raw.fill(0); return { vault: nv, prev: v.wrap }; });
      });
    }, function () { return null; });
  }
  /* The encryption passphrase. It wraps the key of Info's encrypted tabs and the key of Links' encrypted tabs here, in the browser
     (the server never sees either key), and the server makes the backup key from it. set() also moves anything still locked the
     older way (your website password, or a separate Info passphrase) onto it; remove() opens every encrypted tab and turns it back
     into a normal private tab. Both can be run again after a failure: what is already done is left as it is. */
  var PP = (function () {
    var fail = function (t, needOld) { var e = new Error(t); e.user = true; e.needOld = !!needOld; throw e; };
    var getJson = function (u) { return fetch(ROOT + 'web/' + u, { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : fail('Could not read the saved data. Nothing was changed.'); }); };
    var linksApi = function (action, b) {
      return fetch(ROOT + 'web/links/api.php?action=' + action, { method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'bookmarks', 'X-Hub-CSRF': S.csrf || '' }, body: JSON.stringify(b) });
    };
    var okOrFail = function (r, what) {
      if (r.status === 401) return fail('That isn\'t your website password.');
      if (r.status === 429) return fail('Too many wrong tries. Wait a few minutes.');
      if (r.status === 409) return fail(what + ' changed on another device. Close Settings and try again.');
      if (!r.ok) return fail('Could not save. Nothing was changed.');
      return r;
    };
    var checkSite = function (site) {
      return api('pp_check', { password: site }).then(function (j) {
        if (j.ok) return;
        if (j._status === 401) fail('That isn\'t your website password.');   // the server's own words ("Wrong password.") don't say which password
        fail(j.error || 'Could not check your website password.');
      });
    };
    var state = function () {
      return Promise.all([getJson('info/api.php'), getJson('links/api.php?action=get'), api('sv_get')]).then(function (r) {
        var ls = r[1].data && r[1].data.settings, sv = r[2] && r[2].ok && r[2].vault && r[2].vault.wrap ? r[2].vault : null;
        return { info: r[0], iv: (r[0].page && r[0].page.vault && r[0].page.vault.wrap) ? r[0].page.vault : null, links: r[1].data || {}, lv: ls && ls.vault && ls.vault.wrap ? ls.vault : null, sv: sv, use: (r[2] && r[2].use) || [] };
      });
    };
    // the site key (Files, Cards, Tools presets): the same wrap, saved through the core API with the website password
    var svSave = function (vault, prev, site) {
      return api('sv_save', { vault: vault, prev: prev, password: site }).then(function (j) {
        if (j.ok) return j;
        if (j._status === 401) fail('That isn\'t your website password.');
        if (j._status === 409) fail('The site key changed on another device. Close Settings and try again.');
        fail(j.error || 'Could not save. Nothing was changed.');
      });
    };
    var infoSave = function (vault, prev) { return infoApi({ action: 'save_vault', vault: vault, prev: prev, pw: '' }); };
    var linksSave = function (vault, prev, site) { return linksApi('save_vault', { vault: vault, prev: prev, pw: site }); };
    // the three keys in the order they are changed: site, Info, Links. Whatever moved is put back when a later one fails, so they never end up on different passphrases.
    var changeAll = function (d, o, mk) {   // mk(v, what) gives the vault to store, or null to leave it
      var undo = [];
      var one = function (v, what, save, back) {
        return Promise.resolve(mk(v, what)).then(function (nv) {
          if (!nv) return;
          return save(nv, v ? v.wrap : '').then(function () { if (v) undo.push(function () { return back(v, nv.wrap); }); });
        });
      };
      var chain = Promise.resolve();
      if (d.sv || o.makeSite) chain = chain.then(function () { return one(d.sv, 'Site', function (nv, prev) { return svSave(nv, prev, o.site); }, function (v, cur) { return svSave(v, cur, o.site); }); });
      if (d.iv || o.makeInfo) chain = chain.then(function () { return one(d.iv, 'Info', function (nv, prev) { return infoSave(nv, prev).then(function (r) { return okOrFail(r, 'Info'); }); }, infoSave); });
      if (d.lv || o.makeLinks) chain = chain.then(function () { return one(d.lv, 'Links', function (nv, prev) { return linksSave(nv, prev, o.site).then(function (r) { return okOrFail(r, 'Links'); }); }, function (v, cur) { return linksSave(v, cur, o.site); }); });
      return chain.catch(function (e) {
        var back = function () { return undo.reduceRight(function (q, f) { return q.then(f, f); }, Promise.resolve()); };
        return back().then(function () { throw e; }, function () { throw e; });
      });
    };
    // opens a key with the first secret that fits: the passphrase, the website password (older lock), or an earlier passphrase
    var openWith = function (v, o) {
      var list = [['pp', o.pp]]; if (v.login) list.push(['site', o.site]); list.push(['old', o.old]);
      var i = 0;
      var next = function () {
        while (i < list.length && !list[i][1]) i++;
        if (i >= list.length) return Promise.resolve(null);
        var item = list[i++];
        return VK.unwrap(v, item[1]).then(function (raw) { return raw ? { raw: raw, used: item[0] } : next(); });
      };
      return next();
    };
    var needOld = function (what, o) {
      if (o && o.change) return fail('That isn\'t the current passphrase or recovery key.');
      return fail((what === 'Site' ? 'Your Files, Cards and saved presets are' : what + ' tabs are') + ' locked with a different passphrase. Type it under “Earlier Passphrase” and they move to the new one.', true);
    };
    // a vault (none yet: made now) ends up wrapped with the passphrase
    var move = function (v, o, what, save) {
      if (!v) {
        var raw = crypto.getRandomValues(new Uint8Array(32));
        return Promise.all([VK.wrap(raw, o.pp, false), what === 'Site' ? crypto.subtle.digest('SHA-256', raw) : null]).then(function (w) {
          raw.fill(0); var nv = w[0];
          if (w[1]) nv.kid = Array.prototype.map.call(new Uint8Array(w[1]).subarray(0, 8), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');   // the key's id (see lib/vault.php)
          return save(nv, '');
        });
      }
      return openWith(v, o).then(function (r) {
        if (!r) return needOld(what, o);
        if (r.used === 'pp' && !v.login) { r.raw.fill(0); return null; }   // already locked with it
        return VK.wrap(r.raw, o.pp, false).then(function (nv) { r.raw.fill(0); if (v.rec) nv.rec = v.rec; return save(nv, v.wrap); });   // the recovery key opens the same key, so it stays valid
      });
    };
    function set(o) {
      return checkSite(o.site).then(state).then(function (d) {
        return changeAll(d, { site: o.site, makeSite: true, makeInfo: true, makeLinks: true }, function (v, what) {
          var save = null;
          return move(v, o, what, function (nv) { save = nv; return Promise.resolve(); }).then(function () { return save; });   // null when it already opens with this passphrase
        });
      }).then(function () { return api('pp_set', { password: o.site, passphrase: o.pp }); })
        .then(function (j) { if (!j.ok) fail(j.error || 'Could not save the passphrase.'); return j; });
    }
    // Files, Cards and saved presets are locked with the site key: Cards and presets are turned back into plain data here; Files must be deleted first
    var plainPost = function (path, body) {
      return fetch(ROOT + 'web/' + path, { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json', 'X-Hub-CSRF': S.csrf || '' }, body: JSON.stringify(body) });
    };
    // Cards: opened with the key and saved as plain data again (the server accepts that only when asked on purpose)
    var unlockCards = function (key) {
      return getJson('cards/api.php').then(function (j) {
        if (typeof j.enc !== 'string') return;
        return VK.open(j.enc, key).then(function (txt) {
          var d = JSON.parse(txt);
          if (!d || !Array.isArray(d.cards)) throw new Error('shape');
          return plainPost('cards/api.php', { cards: d.cards, people: d.people || [], notes: d.notes || '', banks: d.banks || {}, settings: d.settings || {}, unlock: true });
        }).then(function (r) { if (!r.ok) fail('Could not save your cards as plain data. Nothing was changed.'); }, function (e) { if (e && e.user) throw e; fail('Your cards could not be opened with that key, so nothing was changed.'); });
      });
    };
    // Tools presets: every locked one is opened here and saved as plain settings again
    var unlockPresets = function (key) {
      return api('presets').then(function (j) {
        if (!j.ok || !j.locked) return;
        var jobs = [], items = [];
        Object.keys(j.kinds || {}).forEach(function (k) { (j.kinds[k] || []).forEach(function (p) {
          if (!p.enc) return;
          jobs.push(VK.open(p.enc, key).then(function (txt) { var d = JSON.parse(txt); items.push({ kind: k, id: p.id, name: d.name, data: d.data }); }));
        }); });
        return Promise.all(jobs).then(function () { return api('presets', { op: 'unlock_all', items: items }); }, function () { fail('Your saved presets could not be opened with that key, so nothing was changed.'); })
          .then(function (r) { if (r && !r.ok) fail(r.error || 'Could not save your presets as plain settings. Nothing was changed.'); });
      });
    };
    var PP_UNLOCK = function (key, use) {
      var jobs = [];
      if (use.indexOf('Tools presets') >= 0) jobs.push(unlockPresets(key));
      if (use.indexOf('Cards') >= 0) jobs.push(unlockCards(key));
      return Promise.all(jobs);
    };
    var unlockSiteData = function (d, o) {
      if (!d.sv || !d.use.length) return Promise.resolve();
      if (d.use.indexOf('Files') >= 0) return fail('Files are locked with your passphrase. Download what you need and delete every file in Files first; then you can remove the passphrase.');
      return openWith(d.sv, o).then(function (r) {
        if (!r) return needOld('Site', o);
        return VK.use(r.raw).then(function (key) { r.raw.fill(0); return PP_UNLOCK(key, d.use); });
      });
    };
    function remove(o) {
      return checkSite(o.site).then(state).then(function (d) {
        var siteStep = unlockSiteData(d, o);
        var infoStep = function () { return !d.iv ? Promise.resolve() : openWith(d.iv, o).then(function (r) {
          if (!r) return needOld('Info');
          return VK.use(r.raw).then(function (key) {
            r.raw.fill(0);
            var out = {}, jobs = [];
            (d.info.tabs || []).forEach(function (t) {
              if (!t.enc) return; out[t.id] = [];
              t.boxes.forEach(function (bx, k) { jobs.push(Promise.all([VK.open(bx.title, key), VK.open(bx.notes, key)]).then(function (x) { out[t.id][k] = { title: x[0], notes: x[1], rev: bx.rev | 0 }; })); });
            });
            return Promise.all(jobs).then(function () { return out; }, function () { return fail('A box couldn\'t be decrypted, so nothing was changed.'); });
          }).then(function (tabs) { return infoApi({ action: 'remove_vault', prev: d.iv.wrap, pw: o.site, tabs: tabs }); }).then(function (r2) { return okOrFail(r2, 'Info'); });
        }); };
        return siteStep.then(infoStep).then(function () {
          if (!d.lv) return null;
          return openWith(d.lv, o).then(function (r) {
            if (!r) return needOld('Links');
            return VK.use(r.raw).then(function (key) {
              r.raw.fill(0);
              var out = {}, jobs = [];
              (d.links.tabs || []).forEach(function (t) {
                if (typeof t.enc !== 'string') return;
                jobs.push(VK.open(t.enc, key).then(function (txt) {
                  var j = JSON.parse(txt); if (!j || !Array.isArray(j.categories)) throw new Error('shape');
                  if (Array.isArray(j.icons)) j.categories.forEach(function (c) { (c.links || []).forEach(function (l) { var m = l && typeof l.icon === 'string' && /^#i:(\d+)$/.exec(l.icon); if (m) l.icon = typeof j.icons[+m[1]] === 'string' ? j.icons[+m[1]] : ''; }); });   // icons stored once inside the tab (1.29)
                  out[t.id] = { enc: t.enc, categories: j.categories };
                }));
              });
              return Promise.all(jobs).then(function () { return out; }, function () { return fail('A tab couldn\'t be decrypted, so nothing was changed.'); });
            }).then(function (tabs) { return linksApi('remove_vault', { pw: o.site, prev: d.lv.wrap, tabs: tabs }).then(function (r2) { return okOrFail(r2, 'Links'); }); });
          });
        });
      }).then(function () { return api('pp_clear', { password: o.site }); })
        .then(function (j) { if (!j.ok) fail(j.error || 'Could not remove the passphrase.'); window.HubVault.devDropAll(); return j; });
    }
    /* Recovery key: the same tab keys, wrapped a second time with a random code shown once. It opens Info and Links tabs when the
       passphrase is forgotten (type it where the passphrase goes), and can set a new passphrase. The server never sees the code. */
    var CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no 0, 1, I, O: easy to read out and type
    var newCode = function () {
      var b = crypto.getRandomValues(new Uint8Array(20)), c = '';
      for (var i = 0; i < 20; i++) c += CODE_CHARS.charAt(b[i] & 31) + (i % 4 === 3 && i < 19 ? '-' : '');
      return c;
    };
    function makeRecovery(o) {   // o = {pp, site}
      var code = newCode(), plain = code.replace(/-/g, '');
      return checkSite(o.site).then(state).then(function (d) {
        if (!d.iv && !d.lv && !d.sv) fail('Set the passphrase first.');
        var list = [['Site', d.sv], ['Info', d.iv], ['Links', d.lv]], recs = {};
        var open = function (v) {
          return VK.unwrap({ salt: v.salt, iter: v.iter, wrap: v.wrap }, o.pp).then(function (raw) { if (!raw) fail('That isn\'t the passphrase.'); return raw; });   // the passphrase only: never the recovery key itself
        };
        return Promise.all(list.map(function (x) {
          if (!x[1]) return null;
          return open(x[1]).then(function (raw) { return VK.wrap(raw, plain, false).then(function (r) { raw.fill(0); recs[x[0]] = { salt: r.salt, iter: r.iter, wrap: r.wrap }; }); });
        })).then(function () {
          return changeAll(d, { site: o.site }, function (v, what) {
            if (!v || !recs[what]) return null;
            var nv = { v: 1, salt: v.salt, iter: v.iter, wrap: v.wrap }; if (v.login) nv.login = true; nv.rec = recs[what]; return nv;
          });
        });
      }).then(function () { return code; });
    }
    function dropRecovery(o) {   // o = {site}
      return checkSite(o.site).then(state).then(function (d) {
        return changeAll(d, { site: o.site }, function (v) {
          if (!v || !v.rec) return null;
          var nv = { v: 1, salt: v.salt, iter: v.iter, wrap: v.wrap }; if (v.login) nv.login = true; return nv;
        });
      });
    }
    return { set: set, remove: remove, makeRecovery: makeRecovery, dropRecovery: dropRecovery };
  })();
  function twoStep(box) {
    var head = tabHead(ICON.device, 'Two-Step Login', 'A 6-digit code from an authenticator app, on top of your password.');
    if (S.twoStep) {
      box.innerHTML = ecCard('ix-split good', ICON.device, 'Two-Step Login', 'Logins ask for your app\'s 6-digit code (not on trusted browsers). Lost your phone? Use a recovery code. Your website password is needed to change these settings.',
          '<div class="ix-chips" style="margin:0 0 14px">' + ecChip('Recovery Codes Left', String(S.recoveryLeft), S.recoveryLeft > 2) + '</div>' + (S.recoveryLeft <= 2 ? '<p class="ix-note">Running low. Make new recovery codes and keep them somewhere safe.</p>' : '') +
          '<div class="ix-frm">' + ecField('ix-2p', 'Website Password', 'password', 'current-password') + '</div>' +
          '<div class="ix-fact"><p class="ix-err" id="ix-2e"></p><button type="button" class="ix-btn" id="ix-rc">New Recovery Codes</button><button type="button" class="ix-btn danger" id="ix-off">Turn Off</button></div>',
          '<span class="ix-pill good">On</span>') + '<div id="ix-rcs"></div>';
      box.querySelector('#ix-off').onclick = function () { api('twostep_disable', { password: box.querySelector('#ix-2p').value }).then(function (j) {
        if (!j.ok) { box.querySelector('#ix-2e').textContent = j.error; return; } S.twoStep = false; twoStep(box); toast('Two-step login is off.'); if (secRefresh) secRefresh(); }); };
      box.querySelector('#ix-rc').onclick = function () { api('recovery_new', { password: box.querySelector('#ix-2p').value }).then(function (j) {
        if (!j.ok) { box.querySelector('#ix-2e').textContent = j.error; return; } S.recoveryLeft = j.recovery.length; if (secRefresh) secRefresh(); showCodes(box.querySelector('#ix-rcs'), j.recovery); }); };
      return;
    }
    var how = function (n, t, d) { return '<div class="ix-mini"><span class="ix-num">' + n + '</span><b>' + t + '</b><p>' + d + '</p></div>'; };
    var tsBar = function (at) { return stepBar(['Get an App', 'Scan the Code', 'Type the Code', 'Save Recovery Codes'], at, { locked: true, done: [0, 1, 2, 3].map(function (i) { return i < at; }) }); };   // (1.66.0)
    box.innerHTML = ecCard('ix-split', ICON.device, 'Two-Step Login', 'A 6-digit code from an authenticator app, on top of your password. Your password alone is no longer enough: a thief would also need your phone.',
        '<div class="ix-trio" style="margin:0 0 14px">' + how(1, 'Get an App', 'Any authenticator app works: Google Authenticator, Microsoft Authenticator, Aegis, 1Password.') + how(2, 'Scan the Code', 'Point the app at the code on the next screen.') + how(3, 'Save Your Codes', 'Keep the recovery codes somewhere safe, for the day you lose your phone.') + '</div>' +
        '<div class="ix-row"><button type="button" class="ix-btn pri" id="ix-on">Set Up Two-Step Login</button></div>', '<span class="ix-pill">Off</span>');
    box.querySelector('#ix-on').onclick = function () {
      api('twostep_begin', {}).then(function (j) {
        if (!j.ok) { toast(j.error); return; }
        box.innerHTML = head + tsBar(1) + ecCard('', ICON.device, 'Step 1: Scan the Code', 'Scan this with your authenticator app, or on your phone tap <a href="' + esc(j.uri) + '">open in app</a>. You can also type the key by hand.',
            '<div class="ix-qr" id="ix-qr"></div>' + linkField({ value: j.secret.replace(/(.{4})/g, '$1 ').trim(), copyText: j.secret, prefix: 'Key', readonly: true, label: 'Two-step key', cls: 'ix-uf-key', wrap: true })) +
          ecCard('', ICON.check, 'Step 2: Type the 6-Digit Code', 'The app now shows a code that changes every 30 seconds. Type the current one to finish.',
            '<div class="ix-fd"><label for="ix-tc">6-Digit Code</label><input type="text" id="ix-tc" inputmode="numeric" autocomplete="one-time-code" maxlength="7" style="max-width:220px"></div>' +
            '<p class="ix-err" id="ix-te2"></p><div class="ix-row"><button type="button" class="ix-btn pri" id="ix-en">Turn On</button></div>') + '<div id="ix-rcs"></div>';
        qr(box.querySelector('#ix-qr'), j.uri);
        box.querySelector('#ix-tc').addEventListener('focus', function () { [].forEach.call(box.querySelectorAll('.ix-sbi'), function (x, k) { x.classList.toggle('now', k === 2); x.classList.toggle('done', k < 2); }); });
        box.querySelector('#ix-en').onclick = function () {
          api('twostep_enable', { code: box.querySelector('#ix-tc').value }).then(function (k) {
            if (!k.ok) { box.querySelector('#ix-te2').textContent = k.error; return; }
            S.twoStep = true; S.recoveryLeft = k.recovery.length; if (secRefresh) secRefresh();
            box.innerHTML = head + tsBar(3) + ecCard('good', ICON.shield, 'Two-Step Login Is On', 'From now on, logins ask for the 6-digit code. Save your recovery codes below before you leave this page.', '') + '<div id="ix-rcs"></div>'; showCodes(box.querySelector('#ix-rcs'), k.recovery);
          });
        };
      });
    };
  }
  function showCodes(box, codes) {
    var d = document.createElement('div');
    d.innerHTML = ecCard('', ICON.key, 'Recovery Codes', 'Each code works once, if you don\'t have your phone. Save them somewhere safe now: they won\'t be shown again.',
      '<div class="ix-codes">' + codes.map(function (c) { return '<span class="ix-mono">' + esc(c) + '</span>'; }).join('') + '</div>' +
      '<div class="ix-row"><button type="button" class="ix-btn">' + svg(ICON.copy) + 'Copy Codes</button></div>');
    d.querySelector('button').onclick = function () { navigator.clipboard && navigator.clipboard.writeText(codes.join('\n')).then(function () { toast('Copied.'); }); };
    box.appendChild(d);
  }
  function qr(el, text) {
    var s = document.createElement('script'); s.src = ASSETS + 'vendor/qrcode.js';
    s.onload = function () { try { var q = window.qrcode(0, 'M'); q.addData(text); q.make(); el.innerHTML = q.createImgTag(5, 0); } catch (e) { el.hidden = true; } };
    s.onerror = function () { el.hidden = true; };
    document.head.appendChild(s);
  }


