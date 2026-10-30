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
        check('Vend no page error', not errs, errs)
        b.close()
finally:
    stop_all()
sys.exit(check.done())
