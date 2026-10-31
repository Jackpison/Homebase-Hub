#!/usr/bin/env python3
"""Private tabs in Links and Info (1.61.0): "Encrypt All Private Tabs" in each page's Settings, a new private tab encrypted from the start, and what the
server is left holding (no readable copy, earlier versions included).
    python3 tests/browser/tabs_lock_test.py build/site-update-X.Y.Z.zip [--browser chromium|firefox|webkit]   (port 8978)"""
import glob, json, os, subprocess, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import SEED
from helpers import Site, Checks, stop_all, browser_login, wait_js, browser_name, launch, until, browser_set_passphrase, CSP_REPORTER
from playwright.sync_api import sync_playwright

if len(sys.argv) < 2: sys.exit(__doc__)
BROWSER = browser_name(); ZIP = sys.argv[1]; check = Checks()
PP = 'river lantern copper meadow'


def everything(d, pattern):
    out = ''
    for f in glob.glob(d + pattern, recursive=True):
        if os.path.isfile(f): out += open(f, errors='ignore').read()
    return out


try:
    s = Site(ZIP, 8978)
    subprocess.run(['php', SEED, s.dir], capture_output=True)
    s.php("""hub_write_guarded(hub_dir('links') . '/bookmarks.php', ['settings' => new stdClass, 'tabs' => [
        ['id' => 't1', 'title' => 'Daily', 'categories' => [['id' => 'c1', 'title' => 'News', 'col' => 0, 'links' => [['id' => 'l1', 'title' => 'Public Daily Link', 'url' => 'https://example.com/daily']]]]],
        ['id' => 't2', 'title' => 'Secret', 'private' => true, 'categories' => [['id' => 'c2', 'title' => 'Money', 'col' => 0, 'links' => [['id' => 'l2', 'title' => 'Hidden Bank Login', 'url' => 'https://bank.example.com/login']]]]]]]);
      @mkdir(hub_dir('links') . '/backups', 0700, true); copy(hub_jpath(hub_dir('links') . '/bookmarks.json'), hub_dir('links') . '/backups/bookmarks-20260101-000000.php');
      @mkdir(hub_dir('info') . '/versions', 0700, true); copy(hub_jpath(hub_dir('info') . '/info.json'), hub_dir('info') . '/versions/20260101-000000.php');""")
    check('T0 setup: a private Links tab and a private Info tab, readable, with an earlier version of each', 'Hidden Bank Login' in everything(s.dir + '/site-data/links', '/**/*') and 'Weekend in the Mountains' in everything(s.dir + '/site-data/info', '/**/*'))

    with sync_playwright() as p:
        b = launch(p, BROWSER); print('browser: %s %s' % (BROWSER, b.version))
        ctx = b.new_context(viewport={'width': 1280, 'height': 900}); ctx.add_init_script(CSP_REPORTER)
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        why = browser_login(pg, s.base); check('T1 logged in', not why, why)
        pg.goto(s.base + '/web/links/'); wait_js(pg, "document.querySelectorAll('.tab').length > 1", 20000)
        pg.evaluate("document.getElementById('settingsBtn').click()")
        check('T2 before a passphrase, Links Settings has no "Encrypt All" row', pg.is_hidden('#sEncRow'))
        why = browser_set_passphrase(pg, s.base, PP); check('T3 the passphrase is set', not why, why)

        # ---- Links ----
        pg.goto(s.base + '/web/links/'); wait_js(pg, "document.querySelectorAll('.tab').length > 1", 20000)
        pg.evaluate("document.getElementById('settingsBtn').click()"); pg.wait_for_selector('#setDlg[open]')
        check('T4 with a passphrase and a readable private tab, Links Settings offers "Encrypt 1 Tab"', pg.is_visible('#sEncRow') and 'Encrypt 1 Tab' in pg.inner_text('#sEncAll'), pg.inner_text('#sEncRow'))
        pg.click('#sEncAll'); pg.wait_for_selector('#keyDlg[open]'); pg.fill('#keyPw', PP); pg.check('#keyKeep'); pg.click('#keyGo')
        until(lambda: 'Hidden Bank Login' not in everything(s.dir + '/site-data/links', '/**/*'), 20000)
        doc = json.loads(open(s.dir + '/site-data/links/bookmarks.php').read().split('\n', 1)[1])
        sec = [t for t in doc['tabs'] if t.get('title') == 'Secret'][0]
        check('T5 the server then holds the private tab as locked text only: no readable link, in the data or in any earlier version', isinstance(sec.get('enc'), str) and sec['enc'].startswith('enc1:') and not sec.get('categories')
              and 'Hidden Bank Login' not in everything(s.dir + '/site-data/links', '/**/*') and 'bank.example.com' not in everything(s.dir + '/site-data/links', '/**/*'))
        check('T6 the public tab is untouched and still readable', 'Public Daily Link' in everything(s.dir + '/site-data/links', '/bookmarks.php'))
        pg.keyboard.press('Escape'); pg.reload(); wait_js(pg, "document.querySelectorAll('.tab').length > 1", 20000)
        pg.evaluate("document.getElementById('settingsBtn').click()"); pg.wait_for_selector('#setDlg[open]')
        check('T7 once every private tab is locked, the row is gone', pg.is_hidden('#sEncRow'))
        pg.keyboard.press('Escape')
        # a new private tab starts encrypted
        pg.evaluate("document.querySelector('[data-hub=toggle]').click()"); pg.wait_for_selector('body.editing', timeout=10000)
        pg.evaluate("document.querySelector('.tab.add').click()"); pg.wait_for_selector('#hubTabDlg[open]')
        pg.check('#htPriv')
        check('T8 ticking Private on a new Links tab ticks Encrypted Tab too (it can be unticked)', pg.is_checked('#htEnc'))
        pg.keyboard.press('Escape')

        # ---- Info ----
        pg.goto(s.base + '/web/info/'); wait_js(pg, "server === true && TABS.length > 1", 20000)
        pg.evaluate("document.querySelector('[data-e=settings]').click()"); pg.wait_for_selector('#setdlg[open]')
        check('T9 Info Settings offers "Encrypt 1 Tab" for its readable private tab', pg.is_visible('#sencrow') and 'Encrypt 1 Tab' in pg.inner_text('#sencall'), pg.inner_text('#sencrow'))
        pg.click('#sencall'); pg.wait_for_selector('#uldlg[open]'); pg.fill('#ulin', PP); pg.check('#ulkeep'); pg.click('#ulsave')
        until(lambda: 'Weekend in the Mountains' not in everything(s.dir + '/site-data/info', '/**/*'), 30000)
        raw_info = everything(s.dir + '/site-data/info', '/**/*')
        tabs = json.loads(open(s.dir + '/site-data/info/info.php').read().split('\n', 1)[1])['tabs']
        trip = [t for t in tabs if t.get('name') == 'Trip Notes'][0]
        check('T10 Info\'s private tab is locked on the server: its boxes are locked text, and no readable copy is left in the data or the earlier versions',
              trip.get('enc') and all(str(x.get('title', '')).startswith('enc1:') for x in trip['boxes']) and 'Weekend in the Mountains' not in raw_info and 'guest house' not in raw_info, trip.get('boxes', [{}])[0])
        check('T11 the other Info tabs stay readable', 'Lemon Pasta' in raw_info)
        pg.reload(); wait_js(pg, "server === true && TABS.length > 1", 20000)
        # 1.62.0: Undo in a locked tab puts the locked text back unchanged, and no readable copy ever reaches the server
        trip_now = lambda: [t for t in json.loads(open(s.dir + '/site-data/info/info.php').read().split('\n', 1)[1])['tabs'] if t.get('name') == 'Trip Notes'][0]['boxes']
        tb = [(x['id'], x['title'], x['notes']) for x in trip_now()]
        pg.evaluate("[...document.querySelectorAll('.tabi')].find(x => x.textContent.includes('Trip Notes')).querySelector('.tab').click()"); pg.wait_for_timeout(800)
        pg.evaluate("[...document.querySelectorAll('.box')].find(b => b.offsetParent).querySelector('[data-r=cfg]').click()"); pg.wait_for_selector('#bxdlg[open]'); pg.click('#bxdel')
        if pg.evaluate("document.getElementById('bxdel').textContent.includes('Its Text')"): pg.click('#bxdel')
        got = until(lambda: pg.evaluate("!!document.querySelector('#ix-toast.on .ix-tact')"), 10000)
        gone = len(trip_now()) == len(tb) - 1
        pg.click('#ix-toast .ix-tact'); until(lambda: len(trip_now()) == len(tb), 8000); pg.wait_for_timeout(800)
        ta = [(x['id'], x['title'], x['notes']) for x in trip_now()]
        raw_after = everything(s.dir + '/site-data/info', '/**/*')
        pg.reload(); wait_js(pg, "server === true && TABS.length > 1", 20000)
        pg.evaluate("[...document.querySelectorAll('.tabi')].find(x => x.textContent.includes('Trip Notes')).querySelector('.tab').click()"); pg.wait_for_timeout(1200)
        shown = pg.evaluate("[...document.querySelectorAll('.box')].filter(b => b.offsetParent).map(b => b.innerText).join(' ')")
        check('T13 Info, a locked tab: a deleted box offers Undo and comes back in its place with the same locked text; nothing readable reaches the server; it reads normally after a reload',
              got and gone and ta == tb and 'Weekend in the Mountains' not in raw_after and 'guest house' not in raw_after and 'guest house' in shown, (got, len(ta), len(tb), ta == tb))
        # a new private Info tab is encrypted from the start
        pg.evaluate("document.querySelector('[data-hub=toggle]') && document.querySelector('[data-hub=toggle]').click()")
        pg.evaluate("document.querySelector('[data-add]').click()"); pg.wait_for_selector('#hubTabDlg[open]')
        pg.check('#htPriv')
        check('T12 ticking Private on a new Info tab ticks Encrypt too', pg.is_checked('#htEnc'))
        check('T14 no page error', not errs, errs)
        b.close()
finally:
    stop_all()
sys.exit(check.done())
