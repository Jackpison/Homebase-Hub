#!/usr/bin/env python3
"""Cards locked with the passphrase (1.61), in a real browser: the offer to lock, one press, what the server is left holding, reopening, adding a
card, a browser that has not unlocked, the CSV export of locked cards, and Remove Passphrase turning them back into plain cards.
    python3 tests/browser/lock_test.py build/site-update-X.Y.Z.zip [--browser chromium|firefox|webkit]   (port 8977)"""
import csv, glob, io, json, os, re, subprocess, sys, tempfile
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import ROOT, FIX, SEED, PW
from helpers import Site, Checks, stop_all, browser_login, wait_js, browser_name, launch, until, browser_set_passphrase, browser_unlock, CSP_REPORTER
from playwright.sync_api import sync_playwright

if len(sys.argv) < 2: sys.exit(__doc__)
BROWSER = browser_name(); ZIP = sys.argv[1]; check = Checks()
PP = 'river lantern copper meadow'


def cards_file(s): return s.dir + '/site-data/cards/cards.php'
def cards_doc(s):
    t = open(cards_file(s)).read(); return json.loads(t[t.index('\n') + 1:])
def blob_of(s):
    out = ''
    for f in glob.glob(s.dir + '/site-data/cards/**/*', recursive=True):
        if os.path.isfile(f): out += open(f, errors='ignore').read()
    return out


try:
    s = Site(ZIP, 8977)
    subprocess.run(['php', SEED, s.dir], capture_output=True)
    doc = cards_doc(s); names = [c.get('name', '') for c in doc['cards']]; banks = [c.get('bank', '') for c in doc['cards']]
    check('L0 setup: the demo has cards the server can read', len(names) >= 3 and all(names), doc.keys())
    secret = next(n for n in names if len(n) > 5)
    # an earlier version exists, readable
    os.makedirs(s.dir + '/site-data/cards/versions', exist_ok=True)
    open(s.dir + '/site-data/cards/versions/20260101-000000.php', 'w').write(open(cards_file(s)).read())

    with sync_playwright() as p:
        b = launch(p, BROWSER); print('browser: %s %s' % (BROWSER, b.version))
        ctx = b.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True); ctx.add_init_script(CSP_REPORTER)
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        why = browser_login(pg, s.base); check('L1 logged in', not why, why)
        pg.goto(s.base + '/web/cards/'); wait_js(pg, "document.querySelectorAll('#list .row, #list tr').length > 0 || document.querySelector('#list').children.length > 0", 20000)
        check('L2 before a passphrase there is no offer to lock', pg.is_hidden('#lockbar'))
        why = browser_set_passphrase(pg, s.base, PP); check('L3 the passphrase is set', not why, why)

        pg.goto(s.base + '/web/cards/'); wait_js(pg, "document.querySelector('#list').children.length > 0", 20000)
        until(lambda: pg.is_visible('#lockbar'), 8000)
        check('L4 with a passphrase and plain cards, Cards offers to lock them', pg.is_visible('#lockbar') and 'not locked yet' in pg.inner_text('#lockbar'), pg.inner_text('#lockbar'))
        pg.click('#lockBtn'); why = browser_unlock(pg, PP, keep=True); check('L5 Lock Cards asks for the passphrase', not why, why)
        until(lambda: 'enc' in cards_doc(s), 15000)
        d = cards_doc(s)
        check('L6 the server now holds only locked text, the key id and the title', d.get('enc', '').startswith('enc1:') and re.fullmatch(r'[a-f0-9]{16}', d.get('kid', '')) and 'cards' not in d and 'people' not in d, list(d.keys()))
        check('L7 no card name or bank is anywhere in the cards folder, including earlier versions', not any(x and x in blob_of(s) for x in names + banks), [x for x in names + banks if x and x in blob_of(s)][:3])
        check('L8 the readable earlier version was deleted', not os.path.exists(s.dir + '/site-data/cards/versions/20260101-000000.php'))
        check('L9 the offer is gone, and the page still shows the cards', pg.is_hidden('#lockbar') and secret in pg.inner_text('#list'), pg.inner_text('#list')[:200])
        check('L10 no plain copy is kept in this browser', pg.evaluate("localStorage.getItem('family4') === null"))

        pg.reload(); wait_js(pg, "document.querySelector('#list').children.length > 0", 20000)
        check('L11 a reload opens the locked cards with no question (kept unlocked on this device)', secret in pg.inner_text('#list') and not pg.is_visible('#ix-skp'))
        before = cards_doc(s)['enc']
        pg.evaluate("document.querySelector('#pop button[data-a=card]').click()"); pg.wait_for_selector('#dlg[open]')   # the page's own menu is hidden behind the bar
        pg.fill('#bank', 'Lockbank'); pg.fill('#name', 'Vault Gold'); pg.fill('#network', 'Visa'); pg.fill('#limit', '100000'); pg.fill('#fee', '0'); pg.click('#saveBtn')
        until(lambda: cards_doc(s)['enc'] != before, 15000)
        check('L12 a card added now is saved locked (the text changed, and no new word is readable)', cards_doc(s)['enc'] != before and 'Lockbank' not in blob_of(s) and 'Vault Gold' not in blob_of(s))
        pg.reload(); wait_js(pg, "document.querySelector('#list').children.length > 0", 20000)
        check('L13 ...and it is there after a reload', 'Vault Gold' in pg.inner_text('#list'))
        # a plain save over locked cards is refused by the server
        r = s.req(s.site_base + '/web/cards/api.php', data=json.dumps({'cards': [], 'people': []}).encode(), method='POST', hdr={'Content-Type': 'application/json', 'X-Hub-CSRF': s.csrf})
        check('L14 the server refuses a plain save over locked cards (409): they can not be replaced by accident', r.get('_status') == 409 and 'enc' in cards_doc(s), r)

        # ---- a browser that has not unlocked ----
        lctx = b.new_context(viewport={'width': 1100, 'height': 800}, storage_state=ctx.storage_state()); lp = lctx.new_page()
        lp.goto(s.base + '/web/cards/', wait_until='domcontentloaded'); lp.wait_for_selector('#ix-skp', timeout=20000)
        lp.click('#ix-dlg [data-ix=close]'); wait_js(lp, "!!document.querySelector('.lockedbox')", 10000)
        check('L15 a browser that has not unlocked is asked, and if the answer is Cancel it shows that the cards are locked', 'locked' in lp.inner_text('.lockedbox').lower() and secret not in lp.inner_text('body'), lp.inner_text('body')[:200])
        lp.click('#unlockBtn'); lp.wait_for_selector('#ix-skp', timeout=20000); why = browser_unlock(lp, PP); wait_js(lp, "document.querySelector('#list').textContent.length > 20", 20000)
        check('L16 Unlock asks again, and then shows the cards', not why and secret in lp.inner_text('#list'), why)
        lctx.close()

        # ---- export of locked cards ----
        pg.goto(s.base + '/web/settings/#backup/export-data'); wait_js(pg, "!!document.querySelector('[data-export=cards][data-fmt=csv]')", 20000)
        with pg.expect_download(timeout=30000) as dl:
            pg.click('[data-export=cards][data-fmt=csv]')
        fp = os.path.join(tempfile.mkdtemp(), 'cards.csv'); dl.value.save_as(fp); rows = list(csv.DictReader(open(fp, encoding='utf-8-sig')))
        check('L17 Settings > Export Data opens locked cards in the browser and saves them as a spreadsheet', any(r.get('name') == 'Vault Gold' for r in rows) and len(rows) >= len(names) + 1, (len(rows), dl.value.suggested_filename))

        # ---- backups carry the locked cards and the wrapped key ----
        st_, hd_, raw_ = s.raw(s.api + '?action=backup&parts=cards,settings', hdr={'X-Hub-CSRF': s.csrf}); bk = json.loads(raw_)
        parts = bk.get('parts', {})
        check('L18 a backup carries the cards locked, and the wrapped key (no readable card, no passphrase)', parts.get('cards', {}).get('enc', '').startswith('enc1:') and parts.get('sitevault', {}).get('wrap') and 'Vault Gold' not in json.dumps(bk) and PP not in json.dumps(bk), list(parts.keys()))
        ov = s.get('backup_overview'); check('L19 the Backup panel says the cards are locked instead of counting them', 'locked' in ov['parts']['cards']['summary'], ov['parts']['cards'])

        # ---- Remove Passphrase turns the cards back into plain cards ----
        pg.goto(s.base + '/web/settings/#security/encryption'); wait_js(pg, "!!document.querySelector('#ix-erm')", 20000)
        pg.fill('#ix-ecur', PP); pg.fill('#ix-epw', PW); pg.click('#ix-erm'); pg.click('#ix-erm')
        until(lambda: s.get('sv_get').get('pp') is False, 40000)
        sv = s.get('sv_get'); d = cards_doc(s)
        check('L20 removing the passphrase turns the locked cards back into plain cards (all of them, with the one added)', sv.get('pp') is False and 'enc' not in d and any(c.get('name') == 'Vault Gold' for c in d.get('cards', [])) and len(d['cards']) == len(names) + 1, (sv, list(d.keys())))
        check('L21 no page error and no blocked request', not errs, errs)
        b.close()
finally:
    stop_all()
sys.exit(check.done())
