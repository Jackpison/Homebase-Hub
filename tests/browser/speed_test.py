#!/usr/bin/env python3
"""A slow phone (1.61.0): every page is opened in Chromium with the processor slowed 4 times and a 1.6 Mbit/s, 150 ms network (the usual
"slow 4G" test), once with an empty cache. It reports the first paint, when the page has loaded, and how much it sent (as a host with
compression would: gzip). The limits below are about twice the numbers measured at 1.61.0 (the first paint near 1.3 to 1.8 s, loaded under 2 s); a change that makes a page much slower or
heavier fails here, so it is noticed before a release, not after.
    python3 tests/browser/speed_test.py build/site-update-X.Y.Z.zip   (port 8983; Chromium only: it uses the DevTools throttling)"""
import gzip, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import SEED
from helpers import Site, Checks, stop_all, browser_login, wait_js, browser_name, launch
from playwright.sync_api import sync_playwright
import subprocess

if len(sys.argv) < 2: sys.exit(__doc__)
ZIP = sys.argv[1]; check = Checks()
if browser_name() != 'chromium':
    print('skipped: the throttling is Chromium\'s'); sys.exit(0)
# page: (path, wait-for, first-paint limit ms, loaded limit ms, KB gzip limit)
PAGES = [('Home', '/', None, 3500, 10000, 250),   # loaded includes the background picture over the slow network
         ('Links', '/web/links/', "document.querySelectorAll('#grid a').length > 0 || document.querySelector('.tab')", 3500, 6500, 120),
         ('Info', '/web/info/', "document.querySelectorAll('.box, .tab').length > 0", 3500, 6500, 130), ('Cards', '/web/cards/', None, 3500, 6500, 100),
         ('Tasks', '/web/tasks/', None, 3500, 6500, 140), ('Files', '/web/files/', "window.__files && __files.state().started", 3500, 6500, 100),
         ('Settings', '/web/settings/#overview', "document.querySelector('#ix-pc, #ix-page')", 4000, 7500, 300)]
try:
    s = Site(ZIP, 8983)
    subprocess.run(['php', SEED, s.dir], capture_output=True)
    with sync_playwright() as p:
        b = launch(p, 'chromium'); print('browser: chromium %s' % b.version)
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        why = browser_login(pg, s.base); check('V0 logged in (before slowing anything down)', not why, why)
        cdp = ctx.new_cdp_session(pg)
        cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
        cdp.send('Network.enable'); cdp.send('Network.emulateNetworkConditions', {'offline': False, 'latency': 150, 'downloadThroughput': int(1.6 * 1e6 / 8), 'uploadThroughput': int(0.75 * 1e6 / 8)})
        for name, path, ready, fp_max, load_max, kb_max in PAGES:
            cdp.send('Network.clearBrowserCache')
            pg.goto('about:blank')
            pg.goto(s.base + path, wait_until='load', timeout=60000)
            if ready: wait_js(pg, ready, 40000)
            m = pg.evaluate("""() => { const nav = performance.getEntriesByType('navigation')[0], fp = performance.getEntriesByName('first-contentful-paint')[0];
              const res = performance.getEntriesByType('resource').filter(r => /\\.(js|css|html|php)(\\?|$)/.test(r.name) || r.initiatorType === 'fetch').map(r => ({ n: r.name, d: r.decodedBodySize }));
              return { fp: fp ? Math.round(fp.startTime) : -1, load: Math.round(nav.loadEventEnd), html: nav.decodedBodySize, res }; }""")
            # what a host with compression would send: the text files gzipped
            total = m['html'] * 0.3 + sum(r['d'] for r in m['res']) * 0.3
            gz = 0
            for r in m['res']:
                u = r['n'].replace(s.base, '')
                f = os.path.join(s.dir, u.split('?')[0].lstrip('/'))
                if os.path.isfile(f) and not f.endswith('.php'): gz += len(gzip.compress(open(f, 'rb').read(), 6))
                else: gz += r['d'] * 0.3
            gz += m['html'] * 0.3; kb = round(gz / 1024)
            print('   %-9s first paint %5d ms   loaded %5d ms   about %4d KB sent (gzip)' % (name, m['fp'], m['load'], kb))
            check('V%s %s: first paint under %.1f s, loaded under %.1f s, under %d KB' % (name[:3], name, fp_max / 1000, load_max / 1000, kb_max), 0 < m['fp'] <= fp_max and m['load'] <= load_max and kb <= kb_max, (m['fp'], m['load'], kb))
        # ---- Info with a big page (1.64.4): typing does not measure the whole page on every key, and Settings closes before the server answers ----
        import json as _json, random as _r
        f = s.dir + '/site-data/info/info.php'; head, body = open(f).read().split('\n', 1); doc = _json.loads(body)
        line = lambda i: 'Line %d  Axis Flipkart - Rs. %d (Multiple Shopping) | Payment Sagar Icici' % (i, _r.randint(100, 99999))
        doc['tabs'] = [{'id': '%08x' % (0xa0000 + k), 'name': 'T%d' % k, 'layout': 'cards', 'color': '', 'boxes': [{'id': '%08x' % (0xb0000 + k * 10 + j), 'w': 'half', 'h': '', 'title': 'Box %d' % j, 'notes': '\n'.join(line(i) for i in range(160)), 'rev': 1, 'saved': 1793457750} for j in range(4)]} for k in range(4)]
        open(f, 'w').write(head + '\n' + _json.dumps(doc))
        dp = b.new_context(viewport={'width': 1440, 'height': 900}).new_page(); browser_login(dp, s.base)
        dp.goto(s.base + '/web/info/'); wait_js(dp, "!!(window.HUB && HUB.isAdmin()) && document.querySelectorAll('.box').length > 0", 30000)
        check('V10 Info: boxes off the screen are not laid out (content-visibility)', dp.evaluate("getComputedStyle(document.querySelector('.box')).contentVisibility") == 'auto')
        dp.keyboard.press('e'); dp.wait_for_selector('#ix-ebar:not([hidden])', timeout=10000); dp.click('.box [data-r=edit] >> nth=0'); dp.wait_for_timeout(500)
        dp.evaluate("window.__h = 0; new MutationObserver(m => { window.__h += m.length; }).observe(document.querySelector('.box textarea'), {attributes: true, attributeFilter: ['style']})")
        dp.click('.box textarea >> nth=0'); dp.keyboard.press('Control+End'); dp.keyboard.type('thirty letters typed on one line', delay=0); dp.wait_for_timeout(300)
        check('V11 Info: typing 33 letters does not re-measure the box on every key (a few height changes when a line wraps, not one per key)', dp.evaluate('window.__h') <= 4, dp.evaluate('window.__h'))
        dp.keyboard.press('Enter'); dp.keyboard.press('Enter'); dp.keyboard.type('more', delay=0); dp.wait_for_timeout(300)
        check('V12 Info: new lines still make the box grow', dp.evaluate('window.__h') >= 1, dp.evaluate('window.__h'))
        dp.goto(s.base + '/web/info/'); wait_js(dp, "!!(window.HUB && HUB.isAdmin()) && document.querySelectorAll('.box').length > 0", 30000)
        def slow(route):
            if 'save_page' in (route.request.post_data or ''): dp.wait_for_timeout(1500)
            route.continue_()
        dp.route('**/api.php*', slow)
        dp.evaluate("[...document.querySelectorAll('[data-hub=item]')].find(e => e.getAttribute('data-hub-label') === 'Info Settings').click()"); dp.wait_for_selector('#setdlg[open]')
        dp.fill('#gin', 'Renamed at once'); t0 = dp.evaluate('performance.now()'); dp.click('#setsave')
        wait_js(dp, "!document.getElementById('setdlg').open", 1200)
        check('V13 Info Settings: the window closes and the title changes at once, not after the server answers', dp.evaluate("!document.getElementById('setdlg').open") and dp.evaluate("document.getElementById('ptitle').textContent") == 'Renamed at once', dp.evaluate("document.getElementById('ptitle').textContent"))
        check('Vend no page error', not errs, errs)
        b.close()
finally:
    stop_all()
sys.exit(check.done())
