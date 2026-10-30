#!/usr/bin/env python3
"""Passkeys in a real browser (1.61), with Chrome's virtual authenticator: adding one in Settings > Security > Passkeys, logging in with it (and not being asked
for the two-step code), what the server keeps, a wrong person (the device could not verify), a removed passkey, and the password still working.
Runs in Chromium only: the virtual authenticator is Chromium's.
    python3 tests/browser/passkey_test.py build/site-update-X.Y.Z.zip   (port 8980; the site is opened as http://localhost:8980, a secure address for passkeys)"""
import base64, hashlib, hmac, json, os, re, struct, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import ROOT, PW
from helpers import Site, Checks, stop_all, browser_login, wait_js, browser_name, launch, until, CSP_REPORTER
from playwright.sync_api import sync_playwright

if len(sys.argv) < 2: sys.exit(__doc__)
ZIP = sys.argv[1]; check = Checks()
if browser_name() != 'chromium':
    print('skipped: passkeys are tested in Chromium (its virtual authenticator)'); sys.exit(0)


def totp(secret, step):
    key = base64.b32decode(secret + '=' * (-len(secret) % 8), casefold=True)
    h = hmac.new(key, struct.pack('>Q', step), hashlib.sha1).digest(); o = h[19] & 15
    return '%06d' % ((struct.unpack('>I', h[o:o + 4])[0] & 0x7FFFFFFF) % 1000000)


try:
    s = Site(ZIP, 8980)
    L = 'http://localhost:8980'
    # two-step login on, so a passkey skipping it can be seen
    tb = s.post('twostep_begin'); en = s.post('twostep_enable', {'code': totp(tb['secret'], int(time.time()) // 30)}); check('K0 setup: two-step login is on (a password alone gets "enter the code")', en.get('ok'), en)
    st = s.client('plain/1.0'); st.get('state'); r = st.post('login', {'password': PW}, csrf=False)
    check('K1 ...so a password login is asked for the code', r.get('need2fa') is True, r)

    with sync_playwright() as p:
        b = launch(p, 'chromium'); print('browser: chromium %s' % b.version)
        ctx = b.new_context(viewport={'width': 1280, 'height': 900}); ctx.add_init_script(CSP_REPORTER)
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        cdp = ctx.new_cdp_session(pg); cdp.send('WebAuthn.enable')
        auth = cdp.send('WebAuthn.addVirtualAuthenticator', {'options': {'protocol': 'ctap2', 'transport': 'internal', 'hasResidentKey': True, 'hasUserVerification': True, 'isUserVerified': True, 'automaticPresenceSimulation': True}})['authenticatorId']
        # log in with the password and the code (two-step is on)
        pg.goto(L + '/web/links/', wait_until='domcontentloaded'); wait_js(pg, "!!(window.HUB && HUB.login)", 15000)
        check('K2 before any passkey, the login box does not offer one', not pg.evaluate("(window.HUB.state() || {}).passkeys"))
        pg.evaluate("void HUB.login()"); pg.wait_for_selector('#ix-pw'); pg.fill('#ix-pw', PW); pg.click('#ix-lg'); pg.wait_for_selector('#ix-2s:not([hidden])'); pg.fill('#ix-code', en['recovery'][0]); pg.click('#ix-lg')   # a recovery code: the app's code was just used to turn two-step on, and can not be used twice
        until(lambda: pg.evaluate("HUB.isAdmin()"), 15000); check('K3 logged in with the password and a code', pg.evaluate("HUB.isAdmin()"))

        # ---- add a passkey ----
        pg.goto(L + '/web/settings/#security/passkeys'); wait_js(pg, "!!document.querySelector('#ix-pkadd')", 20000)
        pg.fill('#ix-pkn', 'Test Phone'); pg.fill('#ix-pkw', 'wrong password'); pg.click('#ix-pkadd'); until(lambda: 'website password' in pg.inner_text('#ix-pke'), 10000)
        check('K4 a wrong website password refuses to add a passkey', "isn't your website password" in pg.inner_text('#ix-pke'), pg.inner_text('#ix-pke'))
        pg.fill('#ix-pkw', PW); pg.click('#ix-pkadd'); pg.wait_for_selector('.ix-dev:has-text("Test Phone")', timeout=20000)
        keys = s.get('pk_list').get('keys', [])
        check('K5 Add a Passkey asks the device, and the passkey is listed with its name', len(keys) == 1 and keys[0]['name'] == 'Test Phone' and 'key' not in keys[0], keys)
        raw = open(s.dir + '/site-data/core/passkeys.php').read()
        creds = cdp.send('WebAuthn.getCredentials', {'authenticatorId': auth})['credentials']
        check('K6 the server holds a public key only, in a guarded file; the private key is only in the device', raw.startswith('<?php') and 'BEGIN PUBLIC KEY' in raw and 'PRIVATE' not in raw and len(creds) == 1 and creds[0].get('privateKey'), len(creds))
        check('K7 the login box offers a passkey now (the page state says so)', s.get('state').get('passkeys') is True)

        # ---- log out, log in with the passkey (no code) ----
        pg.goto(L + '/web/links/'); wait_js(pg, "!!(window.HUB && HUB.logout)", 15000); pg.evaluate("HUB.logout()"); until(lambda: not pg.evaluate("HUB.isAdmin()"), 10000)
        pg.goto(L + '/web/links/', wait_until='domcontentloaded'); wait_js(pg, "!!(window.HUB && HUB.login)", 15000); until(lambda: pg.evaluate("(HUB.state() || {}).passkeys === true"), 10000)
        pg.evaluate("void HUB.login()"); pg.wait_for_selector('#ix-pk')
        check('K8 the login box offers "Log In with a Passkey"', 'Passkey' in pg.inner_text('#ix-pk'))
        pg.click('#ix-pk'); until(lambda: pg.evaluate("HUB.isAdmin()"), 20000)
        check('K9 the passkey logs in, and the two-step code was not asked for', pg.evaluate("HUB.isAdmin()") and not pg.is_visible('#ix-2s'))
        creds = cdp.send('WebAuthn.getCredentials', {'authenticatorId': auth})['credentials']
        keys = s.get('pk_list').get('keys', [])
        check('K10 the passkey\'s last-used time is recorded', keys[0]['last'] > 0, keys)
        pg.goto(L + '/web/settings/#security/devices'); wait_js(pg, "document.body.innerText.includes('Logged In')", 20000)

        # ---- a device that cannot verify the person ----
        cdp.send('WebAuthn.setUserVerified', {'authenticatorId': auth, 'isUserVerified': False})
        pg.goto(L + '/web/links/'); wait_js(pg, "!!(window.HUB && HUB.logout)", 15000); pg.evaluate("HUB.logout()"); until(lambda: not pg.evaluate("HUB.isAdmin()"), 10000)
        pg.goto(L + '/web/links/', wait_until='domcontentloaded'); wait_js(pg, "!!(window.HUB && HUB.login)", 15000); until(lambda: pg.evaluate("(HUB.state() || {}).passkeys === true"), 10000)
        pg.evaluate("void HUB.login()"); pg.wait_for_selector('#ix-pk'); pg.click('#ix-pk'); until(lambda: pg.inner_text('#ix-le').strip(), 20000)
        check('K11 when the device could not check the person (no fingerprint or PIN), the passkey is not accepted, and they are not logged in', not pg.evaluate("HUB.isAdmin()") and pg.inner_text('#ix-le').strip() != '', pg.inner_text('#ix-le'))
        cdp.send('WebAuthn.setUserVerified', {'authenticatorId': auth, 'isUserVerified': True})

        # ---- the password still works ----
        pg.fill('#ix-pw', PW); pg.click('#ix-lg'); pg.wait_for_selector('#ix-2s:not([hidden])', timeout=10000)
        check('K12 the password is still a way in, with its code', pg.is_visible('#ix-2s'))
        pg.fill('#ix-code', en['recovery'][1]); pg.click('#ix-lg'); until(lambda: pg.evaluate("HUB.isAdmin()"), 15000)   # another recovery code
        check('K13 ...and it logs in', pg.evaluate("HUB.isAdmin()"))

        # ---- a login that is not the passkey's own: replay and a bad answer, over the API ----
        a = s.client('attacker/1.0'); a.get('state')
        b1 = a.post('pk_login_begin', {}, csrf=False)
        check('K14 anyone can ask to log in with a passkey and gets a challenge and the list of credential ids, nothing else', b1.get('ok') and set(b1['publicKey']) == {'challenge', 'rpId', 'timeout', 'userVerification', 'allowCredentials'} and b1['publicKey']['userVerification'] == 'required', b1)
        r = a.post('pk_login_finish', {'id': keys[0]['id'], 'response': {'clientDataJSON': base64.urlsafe_b64encode(json.dumps({'type': 'webauthn.get', 'challenge': b1['publicKey']['challenge'], 'origin': 'https://evil.example'}).encode()).decode().rstrip('='), 'authenticatorData': 'AAAA', 'signature': 'AAAA'}}, csrf=False)
        check('K15 a made-up answer is refused (401) and the person is not logged in', r.get('_status') == 401 and not a.get('state').get('admin'), r)
        r = a.post('pk_login_finish', {'id': keys[0]['id'], 'response': {'clientDataJSON': 'AAAA', 'authenticatorData': 'AAAA', 'signature': 'AAAA'}}, csrf=False)
        check('K16 an answer for a challenge that was never given is refused', r.get('_status') == 401 and 'ended' in r.get('error', ''), r)
        check('K17 a visitor can not add, list or remove passkeys', a.post('pk_register_begin', {'password': PW}, csrf=False).get('_status') == 401 and a.post('pk_delete', {'id': keys[0]['id'], 'password': PW}, csrf=False).get('_status') == 401 and a.get('pk_list').get('_status') == 401)

        # ---- remove it ----
        pg.goto(L + '/web/settings/#security/passkeys'); wait_js(pg, "!!document.querySelector('[data-pkdel]')", 20000)
        pg.fill('#ix-pkw', PW); pg.click('[data-pkdel]'); pg.click('[data-pkdel]'); until(lambda: not s.get('pk_list').get('keys'), 15000)
        check('K18 Remove (asked twice, with the password) deletes it, and the file goes', s.get('pk_list').get('keys') == [] and not os.path.exists(s.dir + '/site-data/core/passkeys.php') and s.get('state').get('passkeys') is False)
        check('K19 no page error', not errs, errs)
        b.close()
finally:
    stop_all()
sys.exit(check.done())
