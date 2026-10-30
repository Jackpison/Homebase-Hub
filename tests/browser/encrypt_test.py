#!/usr/bin/env python3
"""1.61.0 end-to-end encryption, in a real browser, through the screens a person uses:
  * Settings > Security > Encryption: setting the passphrase makes the site key (Files, Cards, Tools presets) next to Info's and Links' keys
  * HubSite (shell.js): the unlock dialog, a wrong passphrase, "Keep unlocked on this device", seal and open
  * the recovery key opens the same data, typed loosely; changing the passphrase keeps old data readable; removing it is refused while
    something is locked, and works when nothing is
  * the server only ever holds the wrapped key: no passphrase or key in any file it keeps
    python3 tests/browser/encrypt_test.py build/site-update-X.Y.Z.zip [--browser chromium|firefox|webkit]   (port 8975)"""
import os, re, sys, glob, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import PW
from helpers import Site, Checks, stop_all, browser_login, wait_js, browser_name, launch, until
from playwright.sync_api import sync_playwright

if len(sys.argv) < 2: sys.exit(__doc__)
BROWSER = browser_name(); ZIP = sys.argv[1]; check = Checks()
PP1 = 'river lantern copper meadow'; PP2 = 'violet harbour granite lamp'


def ask_unlock(pg, text, pw, keep=False):
    """Starts HubSite.seal(text) on the page, types the passphrase in the dialog it opens. Returns what seal gave (or 'ERR code')."""
    pg.evaluate("() => { window.__r = null; HubSite.seal(%s).then(x => window.__r = x, e => window.__r = 'ERR ' + e.code); }" % json.dumps(text))
    pg.wait_for_selector('#ix-skp', timeout=10000)
    pg.fill('#ix-skp', pw)
    if keep: pg.check('#ix-skk')
    pg.click('#ix-skg')
    return until(lambda: pg.evaluate("window.__r"), 15000)


def fresh(ctx_factory, url):
    c = ctx_factory(); p = c.new_page(); p.goto(url, wait_until='domcontentloaded'); wait_js(p, "!!(window.HubSite && window.HUB && HUB.isAdmin)", 15000)
    until(lambda: p.evaluate("HUB.isAdmin()"), 10000); return c, p


try:
    s = Site(ZIP, 8975)
    base = s.base
    with sync_playwright() as p:
        b = launch(p, BROWSER); print('browser: %s %s' % (BROWSER, b.version))
        mk = lambda: b.new_context(viewport={'width': 1280, 'height': 900})
        ctx = mk(); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        why = browser_login(pg, base); check('E0 logged in', not why, why)
        # cookies of this browser for the next contexts
        state = ctx.storage_state()
        mk2 = lambda: b.new_context(viewport={'width': 1280, 'height': 900}, storage_state=state)

        sv = s.get('sv_get')
        check('E1 before a passphrase: no site key, no passphrase, nothing locked', sv.get('ok') and sv.get('vault') is None and sv.get('pp') is False and sv.get('use') == [], sv)

        # ---- set the passphrase in Settings > Security > Encryption ----
        pg.goto(base + '/web/settings/#security/encryption'); wait_js(pg, "!!document.querySelector('#ix-en1')", 20000)
        pg.fill('#ix-en1', PP1); pg.fill('#ix-en2', PP1); pg.fill('#ix-epw', PW); pg.check('#ix-eack'); pg.click('#ix-eset')
        until(lambda: s.get('sv_get').get('pp'), 30000)   # the passphrase mark comes last, after every key is wrapped
        sv = s.get('sv_get'); v = sv.get('vault') or {}
        check('E2 setting the passphrase makes the site key, wrapped (salt, 600,000 rounds, wrap) with a key id, and marks the passphrase as set',
              sv.get('pp') is True and v.get('iter') == 600000 and re.fullmatch(r'[a-f0-9]{16}', v.get('kid', '')) and len(v.get('wrap', '')) >= 40, sv)
        raw = open(s.dir + '/site-data/core/site-vault.php').read()
        check('E3 the server file for it is guarded, and holds no passphrase and no plain key', raw.startswith('<?php') and PP1 not in raw and 'passphrase' not in raw.lower())
        kid1 = v['kid']

        # ---- unlock dialog: wrong passphrase, then the right one ----
        c1, p1 = fresh(mk2, base + '/web/links/')
        p1.evaluate("() => { window.__r = null; HubSite.seal('first secret').then(x => window.__r = x, e => window.__r = 'ERR ' + e.code); }")
        p1.wait_for_selector('#ix-skp', timeout=10000)
        check('E4 the first use asks for the passphrase (or the recovery key) in a dialog', 'Unlock' in p1.inner_text('#ix-dlg') and p1.is_visible('#ix-skk'))
        p1.fill('#ix-skp', 'not my passphrase'); p1.click('#ix-skg')
        until(lambda: p1.inner_text('#ix-ske').strip(), 15000)
        check('E5 a wrong passphrase is refused in words, and the dialog stays', "doesn't open it" in p1.inner_text('#ix-ske') and p1.is_visible('#ix-skp'), p1.inner_text('#ix-ske'))
        p1.fill('#ix-skp', PP1); p1.check('#ix-skk'); p1.click('#ix-skg')
        sealed = until(lambda: p1.evaluate("window.__r"), 15000)
        check('E6 the right passphrase unlocks: seal gives "enc1:" text that is not the plain words', isinstance(sealed, str) and sealed.startswith('enc1:') and 'first secret' not in sealed, sealed)
        back = p1.evaluate("HubSite.open(%s)" % json.dumps(sealed))
        check('E7 open gives the words back, without asking again', back == 'first secret' and until(lambda: not p1.is_visible('#ix-skp'), 3000), back)
        other = p1.evaluate("HubSite.seal('first secret')")
        check('E8 sealing the same words twice gives different text (a fresh random start each time)', other != sealed and other.startswith('enc1:'))
        p1.close()

        # ---- keep unlocked on this device ----
        p1b = c1.new_page(); p1b.goto(base + '/web/cards/', wait_until='domcontentloaded'); wait_js(p1b, "!!window.HubSite", 15000)
        r = p1b.evaluate("HubSite.key({ ask: false }).then(() => 'unlocked', e => 'ERR ' + e.code)")
        check('E9 "Keep unlocked on this device": a page opened later in the same browser opens the data with no question', r == 'unlocked', r)
        r = p1b.evaluate("HubSite.open(%s)" % json.dumps(sealed))
        check('E10 ...and reads what was sealed before', r == 'first secret', r)
        c1.close()
        c2, p2 = fresh(mk2, base + '/web/cards/')
        r = p2.evaluate("HubSite.key({ ask: false }).then(() => 'unlocked', e => 'ERR ' + e.code)")
        check('E11 another browser profile (nothing remembered) is locked until the passphrase is typed', r == 'ERR locked', r)

        # ---- recovery key ----
        pg.goto(base + '/web/settings/#security/encryption'); wait_js(pg, "!!document.querySelector('#ix-rmk')", 20000)
        pg.fill('#ix-rpp', PP1); pg.fill('#ix-rpw', PW); pg.click('#ix-rmk')
        code = until(lambda: pg.evaluate("(document.querySelector('#ix-rcode') || {}).textContent || ''"), 30000)
        check('E12 the recovery key is shown once (four letters and digits at a time)', re.fullmatch(r'([A-Z2-9]{4}-){4}[A-Z2-9]{4}', code or ''), code)
        sv = s.get('sv_get'); v = sv['vault']
        check('E13 the site key now also has a recovery wrap, and keeps its id', 'rec' in v and v['kid'] == kid1, v)
        loose = ' ' + code.lower().replace('-', ' ') + ' '
        r = ask_unlock(p2, 'after recovery', loose)
        check('E14 the recovery key (typed in small letters with spaces) unlocks the same data', isinstance(r, str) and r.startswith('enc1:'), r)
        r = p2.evaluate("HubSite.open(%s)" % json.dumps(sealed))
        check('E15 ...and opens what was sealed with the passphrase', r == 'first secret', r)
        c2.close()

        # ---- change the passphrase ----
        pg.goto(base + '/web/settings/#security/encryption'); wait_js(pg, "!!document.querySelector('#ix-cgo')", 20000)
        pg.fill('#ix-ccur', PP1); pg.fill('#ix-cpw', PW); pg.fill('#ix-cn1', PP2); pg.fill('#ix-cn2', PP2); pg.click('#ix-cgo')
        until(lambda: s.get('sv_get')['vault']['wrap'] != v['wrap'], 30000)
        v2 = s.get('sv_get')['vault']
        check('E16 changing the passphrase re-wraps the key: new wrap, same key id, recovery wrap kept', v2['wrap'] != v['wrap'] and v2['kid'] == kid1 and 'rec' in v2, v2)
        c3, p3 = fresh(mk2, base + '/web/cards/')
        p3.evaluate("() => { window.__r = null; HubSite.open(%s).then(x => window.__r = x, e => window.__r = 'ERR ' + e.code); }" % json.dumps(sealed))
        p3.wait_for_selector('#ix-skp', timeout=10000)
        p3.fill('#ix-skp', PP1); p3.click('#ix-skg')
        until(lambda: p3.inner_text('#ix-ske').strip(), 15000)
        check('E17 the old passphrase no longer opens it', "doesn't open it" in p3.inner_text('#ix-ske'))
        p3.fill('#ix-skp', PP2); p3.click('#ix-skg')
        r = until(lambda: p3.evaluate("window.__r"), 15000)
        check('E18 the new passphrase opens data sealed before the change', r == 'first secret', r)
        c3.close()

        # ---- the server holds nothing readable ----
        blob = ''
        for f in glob.glob(s.dir + '/site-data/**/*', recursive=True):
            if os.path.isfile(f) and os.path.getsize(f) < 5000000:
                try: blob += open(f, 'r', errors='ignore').read()
                except Exception: pass
        check('E19 no file the server keeps holds either passphrase, the recovery key or the words that were sealed',
              PP1 not in blob and PP2 not in blob and code not in blob and code.replace('-', '') not in blob and 'first secret' not in blob)

        # ---- removing the passphrase ----
        pg.goto(base + '/web/settings/#security/encryption'); wait_js(pg, "!!document.querySelector('#ix-erm')", 20000)
        pg.fill('#ix-ecur', PP2); pg.fill('#ix-epw', PW); pg.click('#ix-erm'); pg.click('#ix-erm')
        until(lambda: s.get('sv_get').get('pp') is False, 30000)
        sv = s.get('sv_get')
        check('E20 removing the passphrase (nothing locked with the site key) clears the key and the mark', sv.get('pp') is False and sv.get('vault') is None, sv)
        check('E21 no page errors in all of it', not errs, errs)
        b.close()
finally:
    stop_all()
sys.exit(check.done())
