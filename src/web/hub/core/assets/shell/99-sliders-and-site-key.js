
/* ---------- 14. HubVault: the encryption of encrypted tabs, shared by Links, Info and Settings (1.53.2) ----------
   One copy of what those three pages each carried before. Nothing here talks to the server.
   - A tab key is 32 random bytes. The server keeps it only "wrapped": AES-256-GCM with a key made from your password or
     passphrase (PBKDF2-SHA256, 600,000 rounds, 16-byte salt). Stored as {v: 1, salt, iter, wrap: base64(iv + ciphertext)},
     with "login": true when the website password wraps it, and "rec": the same key wrapped with the recovery code.
   - Text of an encrypted tab is "enc1:" + base64(12-byte iv + AES-256-GCM ciphertext).
   - "Keep unlocked on this device": the tab key is kept in this browser's IndexedDB ("hub-vault", store "k"), encrypted with a
     device key that cannot be read out of the browser. Each page keeps its own record (Links "links", Info "dev").
   The format must never change without a way to open the old one: tests/fixtures/vault-vectors.json was made by the code
   before this file, and pages_test P49 opens it with this one. */
(function () {
  'use strict';
  var ENC = 'enc1:', ITER = 600000;
  var te = new TextEncoder(), td = new TextDecoder();
  var ok = function () { return !!(window.isSecureContext && window.crypto && crypto.subtle); };
  var b64 = function (u) { var s = ''; for (var i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); };
  var ub64 = function (s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  var rnd = function (n) { return crypto.getRandomValues(new Uint8Array(n)); };
  var isEnc = function (s) { return typeof s === 'string' && s.indexOf(ENC) === 0; };
  /* the key made from a password or passphrase */
  function kek(pass, salt, iter) {
    return crypto.subtle.importKey('raw', te.encode(pass), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    });
  }
  /* wraps a raw tab key with a password; login: true when it is the website password */
  function wrap(raw, pass, login) {
    var salt = rnd(16), iv = rnd(12);
    return kek(pass, salt, ITER).then(function (k) { return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, raw); }).then(function (ct) {
      ct = new Uint8Array(ct); var w = new Uint8Array(12 + ct.length); w.set(iv); w.set(ct, 12);
      var v = { v: 1, salt: b64(salt), iter: ITER, wrap: b64(w) }; if (login) v.login = true; return v;
    });
  }
  /* the raw key from one wrap, or null when the password does not fit (or the wrap is damaged) */
  function unwrapOne(x, pass) {
    return Promise.resolve().then(function () {
      var w = ub64(x.wrap);
      return kek(pass, ub64(x.salt), x.iter).then(function (k) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: w.subarray(0, 12) }, k, w.subarray(12)); });
    }).then(function (r) { return new Uint8Array(r); }, function () { return null; });
  }
  var normRec = function (s) { return String(s).replace(/[\s-]/g, '').toUpperCase(); };   // a recovery code may be typed with dashes, spaces or small letters
  /* the raw key from the password, else from the recovery code; null when neither fits */
  function unwrap(v, pass) {
    return unwrapOne(v, pass).then(function (raw) { return raw || (v && v.rec ? unwrapOne(v.rec, normRec(pass)) : null); });
  }
  /* the tab key, usable but never readable again; decryptOnly for pages that only open text */
  function useKey(raw, decryptOnly) { return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, decryptOnly ? ['decrypt'] : ['encrypt', 'decrypt']); }
  function seal(key, text) {
    var iv = rnd(12);
    return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, te.encode(text)).then(function (ct) {
      ct = new Uint8Array(ct); var w = new Uint8Array(12 + ct.length); w.set(iv); w.set(ct, 12);
      return ENC + b64(w);
    });
  }
  /* one layer: the text inside "enc1:...". Rejects when the key does not fit. */
  function unseal(key, s) {
    return Promise.resolve().then(function () {
      var w = ub64(s.slice(ENC.length));
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: w.subarray(0, 12) }, key, w.subarray(12));
    }).then(function (r) { return td.decode(r); });
  }
  /* text that may have been encrypted more than once (it happened when a tab lost its encrypted mark): up to 5 layers */
  function openDeep(key, s) {
    var n = 0;
    var step = function (x) {
      if (!isEnc(x)) return Promise.resolve(x);
      if (++n > 5) return Promise.reject(new Error('too many layers'));
      return unseal(key, x).then(step);
    };
    return step(s);
  }
  /* "keep unlocked on this device" */
  function devDb() {
    return new Promise(function (res, rej) { var q = indexedDB.open('hub-vault', 1);
      q.onupgradeneeded = function () { q.result.createObjectStore('k'); }; q.onsuccess = function () { res(q.result); }; q.onerror = function () { rej(q.error); }; q.onblocked = function () { rej(0); }; });
  }
  function devOp(mode, fn) {
    return devDb().then(function (db) {
      return new Promise(function (res, rej) { var t = db.transaction('k', mode), q = fn(t.objectStore('k'));
        t.oncomplete = function () { res(q && q.result); }; t.onerror = t.onabort = function () { rej(t.error); }; })
        .then(function (r) { db.close(); return r; }, function (e) { db.close(); throw e; });   // closed at once, so a log out elsewhere can delete it
    });
  }
  function devSave(name, raw) {
    return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']).then(function (dk) {
      var iv = rnd(12);
      return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, dk, raw).then(function (ct) { return devOp('readwrite', function (st) { return st.put({ dk: dk, iv: iv, ct: new Uint8Array(ct) }, name); }); });
    }).then(function () {}, function () {});
  }
  function devLoad(name) {
    return devOp('readonly', function (st) { return st.get(name); }).then(function (r) {
      if (!r || !r.dk) return null;
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: r.iv }, r.dk, r.ct).then(function (x) { return new Uint8Array(x); });
    }).catch(function () { return null; });
  }
  function devForget(name) { return devOp('readwrite', function (st) { return st.delete(name); }).catch(function () {}); }
  function devDropAll() { try { indexedDB.deleteDatabase('hub-vault'); } catch (e) {} }
  /* "Keep unlocked on this device" for one page (Links, Info): whether it is on (a switch kept in localStorage, on unless turned off),
     the kept key, and opening the tabs right after a login. dropAll: forgetting the key deletes every page's kept key, not only this one. */
  function keeper(name, switchKey, dropAll) {
    function on() { try { return localStorage.getItem(switchKey) !== '0'; } catch (e) { return true; } }
    function clear() { return dropAll ? devDropAll() : devForget(name); }
    return {
      on: on,
      set: function (v) { try { v ? localStorage.removeItem(switchKey) : localStorage.setItem(switchKey, '0'); } catch (e) {} },
      save: function (raw) { return devSave(name, raw); },
      load: function () { return devLoad(name); },
      clear: clear,
      // Just logged in: the password was typed, so a key that uses it is opened and kept right away. getVault() gives the stored vault record.
      afterLogin: function (pw, getVault) {
        if (!pw || !ok() || !on()) return Promise.resolve();
        return Promise.resolve().then(getVault).then(function (v) {
          if (!v || !v.login) return;
          return unwrap(v, pw).then(function (raw) { if (raw) return devSave(name, raw).then(function () { raw.fill(0); }); });
        }).catch(function () {});
      }
    };
  }
  window.HubVault = { keeper: keeper, ENC: ENC, ok: ok, b64: b64, ub64: ub64, rnd: rnd, isEnc: isEnc, kek: kek, wrap: wrap, unwrapOne: unwrapOne, unwrap: unwrap, normRec: normRec,
    useKey: useKey, seal: seal, unseal: unseal, openDeep: openDeep, devSave: devSave, devLoad: devLoad, devForget: devForget, devDropAll: devDropAll };
  /* (1.74.2) sliders: --p, the part of the track to fill, follows the value (the look is in shell.css). It is set when a slider moves, appears,
     or a window opens with new values in it. */
  function fillRanges() {
    document.querySelectorAll('input[type=range]').forEach(function (r) {
      var mn = +r.min || 0, mx = r.max === '' ? 100 : +r.max, v = (mx > mn ? Math.min(100, Math.max(0, (+r.value - mn) / (mx - mn) * 100)) : 0).toFixed(1) + '%';
      if (r.style.getPropertyValue('--p') !== v) r.style.setProperty('--p', v);
    });
  }
  var fillT = 0;
  function fillQ() { if (!fillT) fillT = requestAnimationFrame(function () { fillT = 0; fillRanges(); }); }
  document.addEventListener('input', function (e) { if (e.target && e.target.type === 'range') fillQ(); }, true);
  new MutationObserver(fillQ).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['open', 'hidden'] });
  fillQ();
})();

/* ---------- 16. HubSite: the site key (1.61.0) ----------
   One random 32-byte key, made in this browser, that locks what the pages keep for you: Files, Cards and Tools' saved presets.
   Same scheme as the tab keys of Info and Links (section 14): the server only holds it wrapped with the encryption passphrase (and a
   second time with the recovery key), in site-data/core/site-vault.php. It never sees the key or the passphrase for this.
   - HubSite.key() gives the key (a CryptoKey that cannot be read out), asking for the passphrase once per page visit; "Keep unlocked
     on this device" keeps it in this browser's IndexedDB like the tabs do (record "site").
   - HubSite.seal(text) / open(text): "enc1:" + base64(12-byte iv + AES-256-GCM), the same text as an encrypted tab.
   - Errors carry .code: login, nopass (no passphrase yet), insecure (not https), cancel, wrongkey, server. */
(function () {
  'use strict';
  var V = window.HubVault, NAME = 'site';
  var cached = null, cachedKid = '', fromDevice = false, stat = null, asking = null;
  var K = function () { return window.__ixShell; };
  var kidOf = function (raw) { return crypto.subtle.digest('SHA-256', raw).then(function (h) { return Array.prototype.map.call(new Uint8Array(h).subarray(0, 8), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }); };
  var fail = function (code, msg) { var e = new Error(msg || code); e.code = code; return e; };
  var core = function (a, b) { return window.HUB.api(a, b); };
  var get = function (u) { return window.HUB.fetch(K().ROOT + 'web/' + u, { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }, function () { return null; }); };

  /* {vault, pp, use}: what the server holds (the wrapped key, whether a passphrase is set, what is locked with the key) */
  function status(force) {
    if (stat && !force) return stat;
    var p = stat = core('sv_get').then(function (j) {
      if (j._status === 401) throw fail('login', 'Log in first.');
      if (!j.ok) throw fail('server', j.error || 'Could not read the key.');
      return j;
    });
    p.catch(function () { if (stat === p) stat = null; });
    return p;
  }
  function useRaw(raw, keep) {
    return Promise.all([V.useKey(raw), kidOf(raw)]).then(function (r) {
      var done = keep ? V.devSave(NAME, raw) : Promise.resolve();
      return done.then(function () { raw.fill(0); cached = r[0]; cachedKid = r[1]; fromDevice = false; return r[0]; });
    });
  }
  /* is this the passphrase of the tabs (Info or Links)? Used when the site key does not exist yet, so a typo can't make a new key. */
  function checkPassphrase(pass) {
    return Promise.all([get('info/api.php'), get('links/api.php?action=get')]).then(function (r) {
      var iv = r[0] && r[0].page && r[0].page.vault && r[0].page.vault.wrap ? r[0].page.vault : null;
      var ls = r[1] && r[1].data && r[1].data.settings, lv = ls && ls.vault && ls.vault.wrap ? ls.vault : null;
      var list = [iv, lv].filter(Boolean);
      if (!list.length) return null;   // nothing to check it against: the caller asks for it twice
      return Promise.all(list.map(function (v) { return V.unwrapOne(v, pass); })).then(function (raws) {
        raws.forEach(function (x) { if (x) x.fill(0); });
        return raws.some(Boolean);
      });
    });
  }
  /* the one dialog: unlock (the key exists) or set up (it does not yet; needs the website password too) */
  function ask(st) {
    if (asking) return asking;
    var K0 = K(), setup = !st.vault;
    asking = new Promise(function (res, rej) {
      var settled = false;
      var done = function (fn, v) { if (settled) return; settled = true; asking = null; K0.beforeClose = null; fn(v); };
      K0.openDlg('<div class="ix-ico">' + K0.svg(K0.ICON.lock) + '</div><h2>' + (setup ? (st.pp ? 'Lock Files and Cards' : 'Set Up Encryption') : 'Unlock Your Data') + '</h2>' +
        '<p>' + (setup ? (st.pp ? 'Your passphrase is already set. Type it once more, with your website password, to lock this page the same way. This happens once.' : 'Your data is locked in this browser. The server only holds scrambled data.')
                       : 'Type your passphrase (or recovery key) to open your data.') + '</p>' +
        '<form id="ix-skf"><label for="ix-skp">Encryption Passphrase' + (setup ? '' : ' or Recovery Key') + '</label><input type="password" id="ix-skp" autocomplete="off" autofocus>' +
        (setup ? '<label for="ix-skw">Website Password</label><input type="password" id="ix-skw" autocomplete="current-password"><p class="ix-note">To confirm that it is you.</p>' : '') +
        '<label class="ix-chk"><input type="checkbox" id="ix-skk"> Keep unlocked on this device</label>' +
        '<p class="ix-err" id="ix-ske" role="alert"></p><div class="ix-acts"><button type="button" class="ix-btn" data-ix="close">Cancel</button><button class="ix-btn pri" id="ix-skg">' + (setup ? 'Set Up' : 'Unlock') + '</button></div></form>');
      K0.beforeClose = function () { done(rej, fail('cancel', 'Cancelled.')); };
      var d = K0.dollar, err = function (t) { d('#ix-ske').textContent = t; };
      d('#ix-skf').onsubmit = function (e) {
        e.preventDefault(); err('');
        var pass = d('#ix-skp').value, keep = d('#ix-skk').checked, btn = d('#ix-skg');
        if (!pass) return err(setup ? 'Type your encryption passphrase.' : 'Type your encryption passphrase or recovery key.');
        btn.disabled = true;
        var finish = function (k) { K0.beforeClose = null; K0.closeDlg(true); done(res, k); };
        var oops = function (x) { btn.disabled = false; err(x && x.user ? x.message : "Can't reach the server. Nothing was changed."); };
        if (!setup) {
          V.unwrap(st.vault, pass).then(function (raw) {
            if (!raw) { btn.disabled = false; return err("That doesn't open it. Check the passphrase (or the recovery key)."); }
            return useRaw(raw, keep).then(finish);
          }, oops); return;
        }
        var site = d('#ix-skw').value;
        if (!site) { btn.disabled = false; return err('Type your website password.'); }
        checkPassphrase(pass).then(function (ok) {
          if (ok === false) { btn.disabled = false; return err("That isn't your encryption passphrase."); }
          var raw = V.rnd(32);
          return Promise.all([V.wrap(raw, pass, false), kidOf(raw)]).then(function (w) {
            var nv = w[0]; nv.kid = w[1];
            return core('sv_save', { vault: nv, prev: '', password: site }).then(function (j) {
              if (!j.ok) { raw.fill(0); var e2 = new Error(j._status === 401 ? "That isn't your website password." : (j.error || 'Could not save the key.')); e2.user = true; throw e2; }
              stat = null; return useRaw(raw, keep).then(finish);
            });
          });
        }).catch(oops);
      };
    });
    return asking;
  }
  function key(o) {
    o = o || {};
    if (cached) return Promise.resolve(cached);
    return status().then(function (st) {
      if (!V.ok()) throw fail('insecure', 'Encryption needs a secure (https) connection.');
      if (!st.pp) throw fail('nopass', 'Set an encryption passphrase first (Settings, Security, Encryption).');
      var dev = st.vault ? V.devLoad(NAME) : Promise.resolve(null);
      return dev.then(function (raw) {
        if (raw) {   // a remembered key that is not this vault's (the key was made again) is dropped, and the passphrase asked for
          return kidOf(raw).then(function (kid) {
            if (st.vault.kid && kid !== st.vault.kid) { raw.fill(0); return V.devForget(NAME).then(function () { if (o.ask === false) throw fail('locked', 'Locked.'); return status(true).then(ask); }); }
            return V.useKey(raw).then(function (k) { raw.fill(0); cached = k; cachedKid = kid; fromDevice = true; return k; });
          });
        }
        if (o.ask === false) throw fail('locked', 'Locked.');
        return status(true).then(ask);   // the newest wrap (it can have changed on another device since this page loaded)
      });
    });
  }
  /* an old device record that no longer fits (the key was made again): forget it and ask */
  function relock() { cached = null; cachedKid = ''; fromDevice = false; return V.devForget(NAME); }
  function withKey(fn) {
    return key().then(function (k) {
      return fn(k).catch(function (e) {
        if (!fromDevice || (e && e.code)) throw e;
        return relock().then(key).then(fn);   // the remembered key did not fit: ask once with the dialog
      });
    });
  }
  function seal(text) { return withKey(function (k) { return V.seal(k, String(text)); }); }
  function open(text) {
    return withKey(function (k) { return V.openDeep(k, text); }).catch(function (e) { if (e && e.code) throw e; throw fail('wrongkey', "That doesn't open with your key."); });
  }
  function sealJson(o) { return seal(JSON.stringify(o)); }
  function openJson(s) { return open(s).then(function (t) { return JSON.parse(t); }); }
  window.HubSite = { key: key, status: status, seal: seal, open: open, sealJson: sealJson, openJson: openJson, relock: relock, isSealed: V.isEnc,
    unlocked: function () { return !!cached; }, kid: function () { return cachedKid; }, forget: function () { cached = null; cachedKid = ''; stat = null; return V.devForget(NAME); } };
})();
