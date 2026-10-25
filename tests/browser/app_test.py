#!/usr/bin/env python3
"""Install on a phone or computer: the web app manifest, its icons, the head tags on every page, a sub-folder install,
the Settings card and its Install button, and that Chromium finds nothing missing for installing (Page.getInstallabilityErrors).
    python3 tests/browser/app_test.py build/site-update-X.Y.Z.zip
Needs PHP 8.3+, Playwright with Chromium and Pillow. Ports 8890-8891."""
import io, json, os, re, sys
from urllib.parse import urljoin

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import ROOT, FIX, SEED
from helpers import Site, Checks, stop_all, browser_login, wait_js, until
from playwright.sync_api import sync_playwright
from PIL import Image

if len(sys.argv) < 2: sys.exit(__doc__)
ZIP = sys.argv[1]
check = Checks()
PAGES = ['web/home/', '', 'web/links/', 'web/info/', 'web/cards/', 'web/tasks/', 'web/tools/', 'web/settings/']


def manifest(s):
    st, hd, body = s.raw(s.api + '?action=manifest')
    try: m = json.loads(body)
    except Exception: m = None
    return st, hd.get('Content-Type', ''), m


def site_checks(s, label):
    st, ctype, m = manifest(s)
    root = (s.base[len(s.host):] or '') + '/'
    check('%s: the manifest is valid JSON served as application/manifest+json' % label, st == 200 and ctype.startswith('application/manifest+json') and isinstance(m, dict), (st, ctype))
    if not m: return None
    check('%s: start_url (Home) is inside scope, and scope is the site root %s' % (label, root), m['scope'] == root and m['start_url'].startswith(m['scope']) and m['start_url'] == root + 'web/home/' and m['display'] == 'standalone', (m['scope'], m['start_url']))
    bad = []
    for ic in m['icons'] + [i for sc in m['shortcuts'] for i in sc.get('icons', [])]:
        stt, hd, data = s.raw(s.host + ic['src'])
        try: size = '%dx%d' % Image.open(io.BytesIO(data)).size
        except Exception: size = 'not an image'
        if stt != 200 or size != ic['sizes'] or not hd.get('Content-Type', '').startswith('image/png'): bad.append((ic['src'], stt, size, ic['sizes']))
    check('%s: every icon exists, is a PNG and has the stated size (192, 512, maskable 512)' % label, not bad and {i.get('purpose') for i in m['icons']} >= {'any', 'maskable'}, bad)
    check('%s: shortcuts for Links, Info, Cards, Tasks and Tools, inside the site' % label, [x['name'] for x in m['shortcuts']] == ['Links', 'Info', 'Cards', 'Tasks', 'Tools'] and all(x['url'].startswith(root + 'web/') for x in m['shortcuts']), m['shortcuts'])
    missing = []
    for pg in PAGES:
        stt, hd, html = s.raw(s.base + '/' + pg); html = html.decode('utf-8', 'replace')
        base = s.base + '/' + (pg or 'web/home/')   # the top index.php serves Home with <base href="web/home/">
        need = {'manifest': re.search(r'<link rel="manifest" href="([^"]+)"', html), 'theme-color': re.search(r'<meta name="theme-color" content="#1a1a1a">', html),
                'apple-touch-icon': re.search(r'<link rel="apple-touch-icon" href="([^"]+)"', html), 'apple-mobile-web-app-capable': 'name="apple-mobile-web-app-capable" content="yes"' in html,
                'status-bar-style': 'name="apple-mobile-web-app-status-bar-style"' in html}
        for k, v in need.items():
            if not v: missing.append((pg or '/', k))
        if need['manifest'] and manifest_url_ok(s, urljoin(base, need['manifest'].group(1))) is False: missing.append((pg or '/', 'manifest address'))
        if need['apple-touch-icon'] and s.raw(urljoin(base, need['apple-touch-icon'].group(1)))[0] != 200: missing.append((pg or '/', 'apple-touch-icon file'))
        if '<script>' in html.replace('<script>window', ''): missing.append((pg or '/', 'inline script'))
    check('%s: every page (top, Home, Links, Info, Cards, Tasks, Tools, Settings) has the manifest, theme colour and iPhone tags, and they resolve' % label, not missing, missing)
    return m


def manifest_url_ok(s, url):
    st, hd, _ = s.raw(url); return st == 200 and hd.get('Content-Type', '').startswith('application/manifest+json')


try:
    s = Site(ZIP, 8890)
    m = site_checks(s, 'top')
    check('the name is the site name', m and m['name'] == 'Homebase Hub')
    r = s.post('settings', {'settings': {'siteName': 'Family Hub', 'pages': [{'id': 'tools', 'name': 'Toolbox'}, {'id': 'cards', 'hide': True}]}})
    _, _, m2 = manifest(s)
    bar = [x.get('name') or x['id'].title() for x in s.get('state').get('pages', []) if x['id'] in ('links', 'info', 'cards', 'tasks', 'tools') and not x.get('hide')]
    names = [x['name'] for x in m2['shortcuts']]
    check('the manifest follows a changed site name and the bar (its names, order and hidden pages)', r.get('ok') and m2['name'] == 'Family Hub' and m2['short_name'] == 'Family Hub' and 'Toolbox' in names and 'Cards' not in names and names == bar, (r.get('error'), m2 and m2['name'], names, bar))
    s.post('settings', {'settings': {'siteName': 'Homebase Hub', 'pages': []}})
    st, _, _ = s.raw(s.api + '?action=manifest', data=b'{}', method='POST', hdr={'Content-Type': 'application/json'})
    check('the manifest is GET only', st == 405, st)
    anon = s.client('visitor/1.0'); st, hd, body = anon.raw(s.api + '?action=manifest')
    check('a visitor gets it too (it holds nothing private) and it never names a private file', st == 200 and b'site-data' not in body and b'csrf' not in body.lower(), st)

    sub = Site(ZIP, 8891, sub='hub')
    site_checks(sub, 'sub-folder /hub/')

    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox']); print('browser: chromium %s' % b.version)
        ctx = b.new_context(viewport={'width': 1280, 'height': 1000}); pg = ctx.new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        for label, site, path in (('top', s, '/'), ('Home', s, '/web/home/'), ('sub-folder Home', sub, '/hub/web/home/')):
            pg.goto(site.host + path)
            cdp = ctx.new_cdp_session(pg)
            # Chromium reads the manifest after the page loads: ask until it has no installability errors (or 10 s pass)
            inst = until(lambda: (lambda e: e if e == [] else None)(cdp.send('Page.getInstallabilityErrors').get('installabilityErrors')), 10000, 200)
            if inst is None: inst = cdp.send('Page.getInstallabilityErrors').get('installabilityErrors')
            man = cdp.send('Page.getAppManifest')
            check('Chromium: %s is installable (no installability errors, no manifest errors)' % label, inst == [] and not man.get('errors') and man.get('url', '').endswith('action=manifest'), (inst, man.get('errors')))
            cdp.detach()
        regs = pg.evaluate("navigator.serviceWorker ? navigator.serviceWorker.getRegistrations().then(r => r.map(x => x.scope)) : []")
        check('no service worker for the site (no offline mode); only Tools keeps its own', not [x for x in regs if not x.rstrip('/').endswith('/web/tools')], regs)
        why = browser_login(pg, s.base)
        pg.goto(s.base + '/web/settings/#general'); wait_js(pg, "!!document.querySelector('#ix-inst')", 15000)
        card = pg.get_by_text('Install on Your Phone', exact=True)
        hidden = pg.evaluate("!document.querySelector('.ix-how').open && !document.querySelector('.ix-how .ix-steps').checkVisibility()")
        pg.click('.ix-how > summary')
        txt = pg.inner_text('#ix-pc')
        check('Settings > General has the Install on Your Phone card; its steps for iPhone, Android and a computer open under "How?"', not why and card.count() == 1 and hidden and all(x in txt for x in ('iPhone or iPad', 'Add to Home Screen', 'Android', 'Install App', 'Computer')), (why, card.count(), hidden))
        check('the Install button is hidden when the browser offers no install', pg.evaluate("document.querySelector('#ix-inst').hidden"))
        check('each description shows once (inside its card, not again below it)', txt.count('Today, due times, backups and Telegram all follow it.') == 1, txt.count('Today, due times'))
        # a browser that offers to install: the button appears, and pressing it opens the browser's own install prompt
        pg.evaluate("""() => { const e = new Event('beforeinstallprompt', { cancelable: true }); window.__prompted = 0;
            e.prompt = () => { window.__prompted++; return Promise.resolve(); }; e.userChoice = Promise.resolve({ outcome: 'accepted' }); window.dispatchEvent(e); }""")
        shown = not pg.evaluate("document.querySelector('#ix-inst').hidden")
        pg.click('#ix-inst'); until(lambda: pg.evaluate("window.__prompted === 1 && document.querySelector('#ix-inst').hidden"), 3000)
        check('when the browser offers it, Install appears and opens the browser\'s prompt once', shown and pg.evaluate("window.__prompted") == 1 and pg.evaluate("document.querySelector('#ix-inst').hidden"), (shown, pg.evaluate("window.__prompted")))
        sw = pg.evaluate("fetch('../hub/core/api.php?action=state').then(r => r.ok)")
        check('no page error anywhere in this test', not errs and sw, errs)
        b.close()
finally:
    stop_all()
sys.exit(check.done())
