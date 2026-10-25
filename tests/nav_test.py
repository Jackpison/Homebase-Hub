#!/usr/bin/env python3
"""The bar in all three styles (Top Bar, Sidebar, Bottom Dock), on a computer and on a phone, in a real browser.
  python3 tests/nav_test.py build/site-update-X.Y.Z.zip [--browser firefox|webkit] [--shots DIR]
Checks: the pages are listed and the current one is marked, nothing scrolls sideways, the round menu (Settings, Backup,
Log Out) opens on screen, the top bar hides while scrolling down and comes back, the phone panel and sheet open and close,
the dock never covers the end of a page, the red backup dot, and that reduced motion turns the movement off.
--shots DIR also saves a screenshot of each style and size there.
Needs PHP 8.3+ and Playwright. Nothing leaves this computer: every request to another site is blocked."""
import json, os, re, subprocess, sys, tempfile, time, urllib.request, http.cookiejar, zipfile
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from helpers import browser_name, launch, browser_login, wait_js, CSP_REPORTER
BROWSER = browser_name()
SHOTS = None
if '--shots' in sys.argv:
    i = sys.argv.index('--shots'); SHOTS = sys.argv[i + 1]; del sys.argv[i:i + 2]; os.makedirs(SHOTS, exist_ok=True)
if len(sys.argv) < 2: sys.exit(__doc__)
ZIP = sys.argv[1]; PORT = 8231; B = 'http://127.0.0.1:%d' % PORT; UA = 'NavTest/1.0'; PW = 'correct horse battery staple'
D = tempfile.mkdtemp(); zipfile.ZipFile(ZIP).extractall(D)
php = subprocess.Popen(['php', '-S', '127.0.0.1:%d' % PORT, '-t', D], env=dict(os.environ, PHP_CLI_SERVER_WORKERS='4'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
res = []
def check(name, ok, extra=''):
    res.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok or not extra else '  -> ' + str(extra)[:300]), flush=True)

cj = http.cookiejar.CookieJar(); op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj)); CSRF = ['']
def call(a, b=None):
    h = {'User-Agent': UA, 'Content-Type': 'application/json'}
    if CSRF[0]: h['X-Hub-CSRF'] = CSRF[0]
    rq = urllib.request.Request(B + '/web/core-data/api.php?action=' + a, data=json.dumps(b).encode() if b is not None else None, headers=h, method='POST' if b is not None else 'GET')
    j = json.loads(op.open(rq).read())
    if isinstance(j, dict) and j.get('csrf'): CSRF[0] = j['csrf']
    return j
def set_nav(nav, **more):
    s = {'nav': nav}; s.update(more)
    return call('settings', {'settings': s}).get('ok')

DESK = {'viewport': {'width': 1280, 'height': 800}}
PHONE = {'viewport': {'width': 390, 'height': 844}, 'has_touch': True}
if BROWSER != 'firefox': PHONE['is_mobile'] = True

def open_page(ctx, path='/web/links/'):
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(B + path, wait_until='domcontentloaded')
    wait_js(pg, "!!document.querySelector('#ix-bar .ix-links a') && !!(window.HUB && HUB.isAdmin && HUB.isAdmin())")
    pg.wait_for_timeout(300)
    return pg, errs

def rect(pg, sel):
    return pg.evaluate("(s => { var e = document.querySelector(s); if (!e) return null; var r = e.getBoundingClientRect(); return {x: r.left, y: r.top, w: r.width, h: r.height, b: r.bottom, r: r.right}; })", sel)

def visible(pg, sel):
    return pg.evaluate("(s => { var e = document.querySelector(s); if (!e) return false; var r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; })", sel)

def round_menu(pg, label):
    """Opens the round menu from wherever this style keeps it and checks what is in it."""
    items = pg.evaluate("[...document.querySelectorAll('#ix-pop [role=menuitem] .ix-pl')].map(e => e.textContent)")
    box = rect(pg, '#ix-pop'); vw = pg.evaluate('innerWidth'); vh = pg.evaluate('innerHeight')
    ok = bool(box) and box['x'] >= 0 and box['y'] >= 0 and box['r'] <= vw and box['b'] <= vh
    check('%s: the round menu has Settings, Backup and Log Out, on screen' % label, ok and items[:2] == ['Settings', 'Backup'] and 'Log Out' in items, (items, box))

try:
    call('state')
    code = re.search(r'([A-Z0-9]{4}(?:-[A-Z0-9]{4})+|[A-Z0-9]{8,})', open(D + '/site-data/core/SETUP-CODE.php').read().replace('<?php', '')).group(1)
    check('N0 a new site can be set up', call('setup', {'code': code, 'password': PW}).get('ok'))
    call('state')
    subprocess.run(['php', os.path.join(HERE, 'seed_demo.php'), D], capture_output=True)
    ver = re.search(r"define\('HUB', '([^']+)'\)", open(D + '/web/core-data/lib/boot.php').read()).group(1)
    with sync_playwright() as p:
        b = launch(p, BROWSER); print('browser: %s %s' % (BROWSER, b.version))
        def block(r):
            u = r.request.url
            return r.continue_() if u.startswith(B) or u.startswith(('data:', 'blob:')) else r.abort()
        base = b.new_context(user_agent=UA, **DESK); base.route('**/*', block)
        lp = base.new_page(); why = browser_login(lp, B, PW)
        check('N1 the browser logs in', why == '', why)
        state = base.storage_state(); base.close()
        # the API client uses the browser's login too, so it can change settings
        for c in state['cookies']:
            cj.set_cookie(http.cookiejar.Cookie(0, c['name'], c['value'], None, False, '127.0.0.1', False, False, '/', True, False, None, False, None, None, {}))
        CSRF[0] = call('state').get('csrf', '')

        def ctx_for(size, **kw):
            c = b.new_context(user_agent=UA, storage_state=state, **dict(size, **kw)); c.route('**/*', block)
            c.add_init_script("try{localStorage.setItem('ix-seen-ver','%s')}catch(e){}" % ver)
            c.add_init_script(CSP_REPORTER)
            return c

        for nav in ('top', 'side', 'dock'):
            check('N2 %s: the style is saved' % nav, set_nav(nav, homeBar=True))
            for size_name, size in (('computer', DESK), ('phone', PHONE)):
                L = '%s, %s' % (nav, size_name)
                ctx = ctx_for(size); pg, errs = open_page(ctx)
                wait_js(pg, "document.documentElement.getAttribute('data-ix-nav') === '%s'" % nav)
                pg.evaluate("document.querySelectorAll('.ix-links').length")
                n_links = pg.evaluate("document.querySelectorAll('#ix-bar .ix-links a').length")
                cur = pg.evaluate("(document.querySelector('#ix-bar .ix-links a[aria-current=page]') || {}).dataset")
                check('%s: the bar lists the 6 pages and marks Links as the current one' % L, n_links == 6 and cur and cur.get('page') == 'links', (n_links, cur))
                sw = pg.evaluate("document.documentElement.scrollWidth - innerWidth")
                check('%s: nothing scrolls sideways' % L, sw <= 1, sw)
                if SHOTS: pg.screenshot(path=os.path.join(SHOTS, '%s-%s.png' % (nav, size_name)))
                phone = size_name == 'phone'
                # the round menu: in the bar, or (phone sidebar, phone dock) inside the panel or sheet
                if nav == 'side' and phone:
                    check('%s: only the floating button shows; it opens the sidebar as a panel' % L, visible(pg, '#ix-bar .ix-fab') and not visible(pg, '#ix-bar .ix-links'))
                    pg.click('#ix-bar .ix-fab'); pg.wait_for_timeout(350)
                    check('%s: the panel lists the pages and has search, Edit and the round menu' % L,
                          pg.evaluate("document.querySelectorAll('#ix-drawer.open nav > a:not(.ix-brand)').length") == 6 and visible(pg, '#ix-drawer .ix-psearch') and visible(pg, '#ix-drawer .ix-me'))
                    if SHOTS: pg.screenshot(path=os.path.join(SHOTS, '%s-%s-panel.png' % (nav, size_name)))
                    pg.click('#ix-drawer .ix-me'); pg.wait_for_timeout(200); round_menu(pg, L)
                    pg.keyboard.press('Escape'); pg.wait_for_timeout(100); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
                    check('%s: Escape closes the panel and gives focus back to the button' % L,
                          not visible(pg, '#ix-drawer.open nav') and pg.evaluate("document.activeElement && document.activeElement.classList.contains('ix-fab')"))
                elif nav == 'dock' and phone:
                    bar = rect(pg, '#ix-bar')
                    check('%s: one row (the pill and its round button), under 70 px tall' % L, bar and bar['h'] < 70 and visible(pg, '#ix-bar .ix-fab'), bar)
                    lbl = pg.evaluate("[...document.querySelectorAll('#ix-bar .ix-links a span')].filter(s => s.getBoundingClientRect().width > 0).map(s => s.textContent)")
                    check('%s: only the current page shows its name' % L, lbl == ['Links'], lbl)
                    pg.click('#ix-bar .ix-fab'); pg.wait_for_timeout(350)
                    tiles = pg.evaluate("[...document.querySelectorAll('#ix-sheet.open .ix-stile span')].map(s => s.textContent)")
                    check('%s: the sheet has search, Edit, the theme, Backup, Settings and Log Out' % L, visible(pg, '#ix-sheet .ix-psearch') and tiles == ['Edit', 'Light Mode', 'Backup', 'Settings', 'Log Out'], tiles)
                    if SHOTS: pg.screenshot(path=os.path.join(SHOTS, '%s-%s-sheet.png' % (nav, size_name)))
                    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
                    check('%s: Escape closes the sheet' % L, not visible(pg, '#ix-sheet.open .ix-shp'))
                else:
                    pg.click('#ix-bar .ix-me'); pg.wait_for_timeout(200); round_menu(pg, L)
                    pg.keyboard.press('Escape')
                if nav == 'top' and phone:
                    pg.click('#ix-bar .ix-menu'); pg.wait_for_timeout(350)
                    check('%s: the menu button opens the page list' % L, pg.evaluate("document.querySelectorAll('#ix-drawer.open nav > a:not(.ix-brand)').length") == 6)
                    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
                if not phone or nav == 'dock':
                    vtn = pg.evaluate("getComputedStyle(document.querySelector('#ix-bar .ix-links a[aria-current=page]')).viewTransitionName")
                    check('%s: the current page carries the name its pill glides with (ix-cur)' % L, vtn in ('ix-cur', None), vtn)
                if nav == 'side' and not phone:
                    w = rect(pg, '#ix-bar')['w']
                    check('%s: the rail is 80 px wide' % L, abs(w - 80) < 1, w)
                    pg.click('#ix-editb'); pg.wait_for_timeout(200)
                    pop, bar = rect(pg, '#ix-pop'), rect(pg, '#ix-bar')
                    check('%s: the Edit menu opens beside the rail' % L, pop and pop['x'] >= bar['r'], (pop, bar))
                    pg.keyboard.press('Escape')
                if nav == 'dock' and not phone:
                    lbl = pg.evaluate("[...document.querySelectorAll('#ix-bar .ix-links a span')].filter(s => s.getBoundingClientRect().width > 0).map(s => s.textContent)")
                    check('%s: only the current page shows its name in the pill' % L, lbl == ['Links'], lbl)
                if nav == 'dock':
                    pad = pg.evaluate("parseFloat(getComputedStyle(document.body).paddingBottom)"); bar = rect(pg, '#ix-bar'); vh = pg.evaluate('innerHeight')
                    check('%s: the page keeps room at its end, so the pill never covers the last item' % L, pad >= vh - bar['y'], (pad, vh - bar['y']))
                if nav == 'top':
                    pg.evaluate("document.documentElement.style.scrollBehavior = 'auto'; document.body.style.minHeight = '4000px'")
                    pg.mouse.move(600, 400)
                    pg.evaluate("window.scrollTo(0, 300)"); pg.wait_for_timeout(80); pg.evaluate("window.scrollTo(0, 900)"); pg.wait_for_timeout(500)
                    hid = pg.evaluate("document.documentElement.classList.contains('ix-hide')"); r = rect(pg, '#ix-bar')
                    check('%s: scrolling down slides the bar away' % L, hid and r['b'] <= 1, (hid, r))
                    pg.evaluate("window.scrollTo(0, 700)"); pg.wait_for_timeout(500)
                    r = rect(pg, '#ix-bar')
                    check('%s: scrolling up brings it back' % L, not pg.evaluate("document.documentElement.classList.contains('ix-hide')") and abs(r['y']) < 1, r)
                    if not phone:
                        pg.evaluate("window.scrollTo(0, 1500)"); pg.wait_for_timeout(400)
                        pg.keyboard.press('/'); pg.wait_for_timeout(400)
                        check('%s: pressing / shows the bar and puts the cursor in search' % L,
                              not pg.evaluate("document.documentElement.classList.contains('ix-hide')") and pg.evaluate("document.activeElement && document.activeElement.id === 'ix-q'"))
                if nav in ('side', 'dock') and not phone:
                    pg.evaluate("document.documentElement.style.scrollBehavior = 'auto'; document.body.style.minHeight = '4000px'; window.scrollTo(0, 900)"); pg.wait_for_timeout(400)
                    check('%s: this style never hides' % L, visible(pg, '#ix-bar .ix-links') and not pg.evaluate("document.documentElement.classList.contains('ix-hide')"))
                check('%s: no page errors' % L, not errs, errs)
                if SHOTS:   # the pages with layouts of their own, for a look by eye
                    for name, path in (('home', '/'), ('tools', '/web/tools/'), ('settings', '/web/settings/#general')):
                        q = ctx.new_page(); q.goto(B + path, wait_until='domcontentloaded'); q.wait_for_timeout(1500)
                        q.screenshot(path=os.path.join(SHOTS, '%s-%s-%s.png' % (nav, size_name, name))); q.close()
                ctx.close()

        # the red dot on the round menu while a backup is due, gone for a day after opening Backup from it
        # (a new site counts as backed up today, so the browser's clock is moved 3 days on)
        set_nav('top', backupEvery=1)
        ctx = ctx_for(DESK); ctx.add_init_script("(function(){var n=Date.now;Date.now=function(){return n()+3*86400000;};})()"); pg, errs = open_page(ctx)
        check('N3 the round menu shows a red dot while a backup is due', pg.evaluate("!!document.querySelector('#ix-bar .ix-me.due')"))
        pg.click('#ix-bar .ix-me'); pg.wait_for_timeout(200)
        note = pg.evaluate("[...document.querySelectorAll('#ix-pop small.warn')].map(e => e.textContent)")
        check('N4 its Backup item says Due', note == ['Due'], note)
        pg.click('#ix-pop [role=menuitem]:nth-child(2)')
        wait_js(pg, "location.pathname.indexOf('/web/settings/') >= 0 && !!document.querySelector('#ix-bar')")
        pg.wait_for_timeout(500)
        check('N5 Backup opens Settings > Backup and the dot goes', '#backup' in pg.url and not pg.evaluate("!!document.querySelector('#ix-bar .ix-me.due')"), pg.url)
        ctx.close()
        set_nav('top', backupEvery=7)

        # reduced motion: the bar still hides, without sliding
        ctx = ctx_for(DESK, reduced_motion='reduce'); pg, errs = open_page(ctx)
        dur = pg.evaluate("parseFloat(getComputedStyle(document.querySelector('#ix-bar')).transitionDuration)")
        check('N6 with reduced motion the bar does not slide', dur < 0.01, dur)
        ctx.close()
        b.close()
finally:
    php.terminate()
print('\n%d/%d passed' % (sum(res), len(res)))
sys.exit(0 if res and all(res) else 1)
