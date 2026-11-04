#!/usr/bin/env python3
"""A slow phone (1.61.0): every page is opened in Chromium with the processor slowed 4 times and a 1.6 Mbit/s, 150 ms network (the usual
"slow 4G" test), once with an empty cache. It reports the first paint, when the page has loaded, and how much it sent (as a host with
compression would: gzip). The limits below are about twice the numbers measured at 1.61.0 (the first paint near 1.3 to 1.8 s, loaded under 2 s); a change that makes a page much slower or
heavier fails here, so it is noticed before a release, not after.
    python3 tests/browser/speed_test.py build/site-update-X.Y.Z.zip   (port 8983; Chromium only: it uses the DevTools throttling)"""
import gzip, json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import SEED, page_errors
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
        pg = ctx.new_page(); errs = []; page_errors(pg, errs)
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
        dc = dp.context.new_cdp_session(dp); dc.send('Network.enable'); dc.send('Network.emulateNetworkConditions', {'offline': False, 'latency': 1500, 'downloadThroughput': -1, 'uploadThroughput': -1})
        dp.evaluate("[...document.querySelectorAll('[data-hub=item]')].find(e => e.getAttribute('data-hub-label') === 'Info Settings').click()"); dp.wait_for_selector('#setdlg[open]')
        dp.fill('#gin', 'Renamed at once'); t0 = dp.evaluate('performance.now()'); dp.click('#setsave')
        wait_js(dp, "!document.getElementById('setdlg').open", 1200)
        check('V13 Info Settings: the window closes and the title changes at once, not after the server answers', dp.evaluate("!document.getElementById('setdlg').open") and dp.evaluate("document.getElementById('ptitle').textContent") == 'Renamed at once', dp.evaluate("document.getElementById('ptitle').textContent"))
        # Home Settings also closes before a slow server answers
        hp = b.new_context(viewport={'width': 1300, 'height': 800}).new_page(); browser_login(hp, s.base)
        hp.goto(s.base + '/'); wait_js(hp, "!!(window.HUB && HUB.isAdmin()) && !!document.getElementById('editBtn')", 30000)
        hc = hp.context.new_cdp_session(hp); hc.send('Network.enable'); hc.send('Network.emulateNetworkConditions', {'offline': False, 'latency': 1500, 'downloadThroughput': -1, 'uploadThroughput': -1})   # every answer takes 1.5 s
        hp.evaluate("document.getElementById('editBtn').click()"); hp.wait_for_selector('#ix-ebar:not([hidden])', timeout=15000)
        hp.evaluate("document.querySelector('[data-open=settingsSheet]').click()"); hp.wait_for_selector('#settingsSheet[open]'); hp.fill('#sWelcome', 'Hello there'); hp.click('#saveSettings')
        wait_js(hp, "!document.getElementById('settingsSheet').open", 1000)
        check('V14 Home Settings: the window closes at once, not after the server answers', hp.evaluate("!document.getElementById('settingsSheet').open"))
        # a web host's firewall answers with its own 403 page: say so, stay logged in, keep the change (1.64.6)
        ep = b.new_context(viewport={'width': 1300, 'height': 800}).new_page(); browser_login(ep, s.base)
        ep.goto(s.base + '/web/info/'); wait_js(ep, "!!(window.HUB && HUB.isAdmin()) && document.querySelectorAll('.box').length > 0", 30000)
        ep.route('**/api.php*', lambda route: route.fulfill(status=403, content_type='text/html', body='<html><body><center><h1>403 Forbidden</h1></center><hr><center>openresty</center></body></html>') if route.request.method == 'POST' and 'save_page' in (route.request.post_data or '') else route.continue_())
        ep.evaluate("[...document.querySelectorAll('[data-hub=item]')].find(e => e.getAttribute('data-hub-label') === 'Info Settings').click()"); ep.wait_for_selector('#setdlg[open]')
        ep.fill('#gin', 'Blocked title'); ep.click('#setsave'); wait_js(ep, "/web host.s firewall answered/.test(document.body.innerText)", 8000)
        check('V15 a host firewall 403 (not our JSON) says so, and does not ask for the password', ep.evaluate("/web host.s firewall answered/.test(document.body.innerText) && !(document.getElementById('ix-dlg') && document.getElementById('ix-dlg').classList.contains('open'))"))
        wait_js(ep, "document.getElementById('setdlg').open", 5000)
        check('V16 ...and the Settings window comes back with the text still in it', ep.evaluate("document.getElementById('setdlg').open && document.getElementById('gin').value === 'Blocked title'"), ep.evaluate("document.getElementById('gin').value"))
        # a CAPTCHA page from the host (status 200, html): said once, and sending pauses so the host's count does not climb (1.64.8)
        cp_ = b.new_context(viewport={'width': 1300, 'height': 800}).new_page(); browser_login(cp_, s.base)
        cp_.goto(s.base + '/web/info/'); wait_js(cp_, "!!(window.HUB && HUB.isAdmin()) && document.querySelectorAll('.box').length > 0", 30000)
        hits = []
        cp_.route('**/api.php*', lambda route: (hits.append(1), route.fulfill(status=200, content_type='text/html', body='<html><body>Please solve the CAPTCHA to continue</body></html>')) if route.request.method == 'POST' else route.continue_())
        r1 = cp_.evaluate("fetch('api.php', {method: 'POST', body: '{}'}).then(r => r.status)"); n1 = len(hits)
        r2 = cp_.evaluate("fetch('api.php', {method: 'POST', body: '{}'}).then(r => r.status)"); r3 = cp_.evaluate("fetch('api.php?action=get').then(r => r.status)")
        check('V17 a CAPTCHA page from the host is told apart, and answered as "could not reach"', r1 == 503 and n1 == 1 and cp_.evaluate("/CAPTCHA if it asks/.test(document.body.innerText)"), (r1, n1))
        check('V18 ...and the next requests are not sent at all for a minute (so the host does not count more)', r2 == 503 and r3 == 503 and len(hits) == 1, (r2, r3, len(hits)))
        # Save Settings does not redraw every link or card when only the look or the title changed (1.64.9)
        sp = b.new_context(viewport={'width': 1300, 'height': 800}).new_page(); browser_login(sp, s.base)
        hdr = {'Content-Type': 'application/json', 'X-Hub-CSRF': s.csrf, 'X-Requested-With': 'bookmarks'}
        tabs = [{'id': 'tk', 'title': 'Big', 'categories': [{'id': 'c%d' % c, 'title': 'Category %d' % c, 'links': [{'title': 'Site %d %d' % (c, l), 'url': 'https://s%d-%d.example.com' % (c, l)} for l in range(10)]} for c in range(12)]}]
        s.req(s.base + '/web/links/api.php?action=save', json.dumps({'data': {'tabs': tabs}}).encode(), 'POST', hdr)
        sp.goto(s.base + '/web/links/'); wait_js(sp, "!!(window.HUB && HUB.isAdmin()) && document.querySelectorAll('.cat').length > 0", 30000)
        sp.evaluate("window.__a = document.querySelector('.cat a')")
        sp.evaluate("document.getElementById('settingsBtn').click()"); sp.wait_for_selector('#setDlg[open]'); sp.fill('#sTitle', 'Quick Title'); sp.click('#setSave')
        wait_js(sp, "document.title === 'Quick Title' && !document.getElementById('setDlg').open", 5000)
        check('V19 Links: saving only the title keeps the links as they are (no full redraw)', sp.evaluate("document.contains(window.__a) && window.__a === document.querySelector('.cat a')"))
        sp.evaluate("document.getElementById('settingsBtn').click()"); sp.wait_for_selector('#setDlg[open]'); sp.click('#sVisits'); sp.click('#setSave')
        wait_js(sp, "!document.getElementById('setDlg').open", 5000); sp.wait_for_timeout(300)
        check('V20 Links: a setting that changes what is drawn (visit counts) still redraws', sp.evaluate("!document.contains(window.__a)"))
        sp.goto(s.base + '/web/cards/'); wait_js(sp, "!!(window.HUB && HUB.isAdmin()) && document.querySelectorAll('#list .row.item').length > 0", 30000)
        sp.evaluate("window.__r = document.querySelector('#list .row.item')")
        sp.evaluate("[...document.querySelectorAll('[data-hub=item]')].find(e => e.getAttribute('data-hub-label') === 'Cards Settings').click()"); sp.wait_for_selector('#tdlg[open]')
        sp.fill('#ttl', 'My Cards'); sp.click('#tsave'); wait_js(sp, "!document.getElementById('tdlg').open", 5000)
        check('V21 Cards: saving the title changes it and keeps the rows as they are', sp.evaluate("document.title === 'My Cards' && document.contains(window.__r)"), sp.evaluate('document.title'))
        # Links: switching back to a tab uses its drawn categories again; a change redraws only the category it is in (1.64.10)
        tabs2 = [{'id': 'ta', 'title': 'First', 'categories': [{'id': 'a%d' % c, 'title': 'A %d' % c, 'col': c % 4, 'links': [{'title': 'A link %d %d' % (c, l), 'url': 'https://a%d-%d.example.com' % (c, l)} for l in range(5)]} for c in range(6)]},
                 {'id': 'tb', 'title': 'Second', 'categories': [{'id': 'b0', 'title': 'B 0', 'col': 0, 'links': [{'title': 'B link', 'url': 'https://b.example.com'}]}]}]
        s.req(s.base + '/web/links/api.php?action=save', json.dumps({'data': {'tabs': tabs2}}).encode(), 'POST', hdr)
        sp.goto(s.base + '/web/links/#ta'); wait_js(sp, "!!(window.HUB && HUB.isAdmin()) && document.querySelectorAll('.cat').length === 6", 30000)
        sp.evaluate("window.__s = [...document.querySelectorAll('.cat')]")
        sp.evaluate("location.hash = 'tb'"); wait_js(sp, "document.querySelectorAll('.cat').length === 1", 5000)
        sp.evaluate("location.hash = 'ta'"); wait_js(sp, "document.querySelectorAll('.cat').length === 6", 5000)
        check('V22 Links: going back to a tab shows the same drawn categories (nothing drawn again)', sp.evaluate("[...document.querySelectorAll('.cat')].every((c, i) => c === window.__s[i])"))
        sp.keyboard.press('e'); sp.wait_for_selector('#ix-ebar:not([hidden])', timeout=10000); wait_js(sp, "document.body.classList.contains('editing')", 5000)
        sp.evaluate("window.__s = [...document.querySelectorAll('.cat')]")
        sp.evaluate("document.querySelector('.cat[data-id=a0] li.row .ctrl [aria-label=\"Move Down\"]').click()")   # move the first link down
        wait_js(sp, "document.querySelector('.cat[data-id=a0] li.row .t').textContent === 'A link 0 1'", 5000)
        same = sp.evaluate("[...document.querySelectorAll('.cat')].map((c, i) => c === window.__s[i])")
        check('V23 Links: moving a link redraws only its own category, and the move shows', same[0] is False and all(same[1:]), same)
        # (1.64.11) Links builds its edit buttons only while editing, and a tab with many categories shows its top first; Cards adds long lists in steps
        big = [{'id': 'tc', 'title': 'Many', 'categories': [{'id': 'm%d' % c, 'title': 'M %d' % c, 'col': c % 4, 'links': [{'title': 'M link %d %d' % (c, l), 'url': 'https://m%d-%d.example.com' % (c, l)} for l in range(6)]} for c in range(32)]}]
        s.req(s.base + '/web/links/api.php?action=save', json.dumps({'data': {'tabs': big}}).encode(), 'POST', hdr)
        sp.goto(s.base + '/web/links/?big=1#tc'); wait_js(sp, "!!(window.HUB && HUB.isAdmin()) && document.querySelectorAll('.cat').length === 32", 30000)
        check('V24 Links: not editing, no edit buttons are built (they were hidden anyway)', sp.evaluate("document.querySelectorAll('.cat .ctrl, .cat .lgrip, .cat-add').length") == 0)
        sp.keyboard.press('e'); wait_js(sp, "document.body.classList.contains('editing') && document.querySelectorAll('.cat-add').length === 32", 10000)
        check('V25 ...and while editing every category has them', sp.evaluate("document.querySelectorAll('.cat-head .ctrl').length === 32 && document.querySelectorAll('.row .ctrl').length === 32 * 6"))
        fp = b.new_context(viewport={'width': 1300, 'height': 800}).new_page(); browser_login(fp, s.base)
        # count the categories at the moment the board first appears (before the next frame)
        fp.add_init_script("new MutationObserver((m, o) => { const b = document.querySelector('#grid .board'); if (b && document.querySelectorAll('.cat').length) { window.__first = document.querySelectorAll('.cat').length; o.disconnect(); } }).observe(document, {childList: true, subtree: true})")
        fp.goto(s.base + '/web/links/?big=2#tc'); wait_js(fp, "window.__first > 0", 30000); first = fp.evaluate('window.__first'); sp = fp
        wait_js(sp, "document.querySelectorAll('.cat').length === 32", 5000)
        order = sp.evaluate("[...document.querySelectorAll('.col')].map(c => [...c.querySelectorAll('.cat')].map(x => x.dataset.id).join(','))")
        want = [','.join('m%d' % c for c in range(32) if c % 4 == k) for k in range(4)]
        check('V26 Links: a tab with many categories shows the top of each column first (%d of 32), then all, each column in order' % first, first <= 12 and order == want, (first, order[:1]))
        f = s.dir + '/site-data/cards/cards.php'; head_, body_ = open(f).read().split('\n', 1); cd = json.loads(body_)
        cd['cards'] = [dict(cd['cards'][0], name='Card %d' % i, bank='Bank %d' % (i % 12), limit=250000) for i in range(300)]; open(f, 'w').write(head_ + '\n' + json.dumps(cd))
        sp.goto(s.base + '/web/cards/'); wait_js(sp, "!!(window.HUB && HUB.isAdmin()) && document.querySelectorAll('#list .row.item').length > 0", 30000)
        n1 = sp.evaluate("(() => { render(); return document.querySelectorAll('#list .row.item').length; })()")
        wait_js(sp, "document.querySelectorAll('#list .row.item').length === 300", 8000)
        check('V27 Cards: 300 cards show 60 at once and then all 300, amounts in Indian digits as before', n1 == 60 and '₹2,50,000' in sp.inner_text('#list'), n1)
        # (1.64.12) a saved icon whose file is gone shows the letter (no request for a missing file) and counts as missing for Fetch Icons
        gone = [{'id': 'tm', 'title': 'Media', 'categories': [{'id': 'g0', 'title': 'G', 'col': 0, 'links': [{'title': 'Lost Icon', 'url': 'https://lost.example.com', 'icon': 'icons/media/www.lost.example.com.png'}]}]}]
        s.req(s.base + '/web/links/api.php?action=save', json.dumps({'data': {'tabs': gone}}).encode(), 'POST', hdr)
        req404 = []; gp = b.new_context(viewport={'width': 1300, 'height': 800}).new_page(); browser_login(gp, s.base)
        gp.on('response', lambda r: r.status == 404 and 'lost.example' in r.url and req404.append(r.url))
        gp.goto(s.base + '/web/links/?gone=1#tm'); wait_js(gp, "!!(window.HUB && HUB.isAdmin()) && document.querySelectorAll('.cat a').length > 0", 30000); gp.wait_for_timeout(800)
        ico = gp.evaluate("(() => { const b = document.querySelector('.cat a .ico'); return [b.textContent, !!b.querySelector('img')]; })()")
        check('V28 Links: a saved icon whose file is gone shows the first letter and asks for no missing file', ico == ['L', False] and not req404, (ico, req404))
        gp.evaluate("document.getElementById('iconsBtn').click()"); gp.wait_for_selector('#iconDlg[open]')
        check('V29 ...and Fetch Icons > Only Missing counts it', gp.inner_text('#iconCnt1').startswith('1 link'), gp.inner_text('#iconCnt1'))
        # ---- (1.67.1) Links with 600 links: edit mode draws about one screen at once and the rest over the next frames ----
        cats = ",".join("['id'=>'z%d','title'=>'Cat %d','col'=>%d,'links'=>[%s]]" % (c, c, c % 4, ",".join("['id'=>'z%d_%d','title'=>'Link %d %d','url'=>'https://ex%d.example/%d']" % (c, k, c, k, k, c) for k in range(30))) for c in range(20))
        s.php("hub_write_guarded(hub_dir('links') . '/bookmarks.php', ['settings' => new stdClass, 'tabs' => [['id'=>'zb','title'=>'Big','categories'=>[%s]]]]);" % cats)
        bp = b.new_context(viewport={'width': 1440, 'height': 900}).new_page(); browser_login(bp, s.base)
        bp.goto(s.base + '/web/links/'); wait_js(bp, "!!(window.HUB && HUB.isAdmin()) && document.querySelectorAll('#grid a.main').length >= 600", 30000); bp.wait_for_timeout(500)
        check('V30 Links: categories below the screen are not laid out (content-visibility)', bp.evaluate("getComputedStyle(document.querySelector('.cat')).contentVisibility") == 'auto')
        first = bp.evaluate("(() => { document.querySelector('[data-hub=toggle]').click(); return document.querySelectorAll('#grid .lgrip').length; })()")
        wait_js(bp, "document.querySelectorAll('#grid .lgrip').length >= 600", 15000)
        check('V31 Links, 600 links: turning edit mode on draws about one screen at once (not hundreds of rows), then all of them', 0 < first < 200 and bp.evaluate("document.querySelectorAll('#grid .lgrip').length") >= 600, first)
        # (1.68.0) Bar Glass: the bar's SVG filter is worked out again while the page scrolls under it; scrolling must stay smooth
        SCROLL = """async () => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, 0); await new Promise(r => setTimeout(r, 200));
            const t = []; let last = performance.now();
            for (let i = 0; i < 90; i++) { scrollBy(0, i % 30 < 15 ? 60 : -60); await new Promise(r => requestAnimationFrame(r)); const n = performance.now(); t.push(n - last); last = n; }
            t.sort((a, b) => a - b); return Math.round(t[Math.floor(t.length * .9)]); }"""
        sc = {}
        for on in (False, True):
            s.php("hub_settings_update(function ($x) { $x['glass'] = %s; $x['glassFx'] = ['bend' => 60, 'fringe' => 10]; return $x; });" % ('true' if on else 'false'))   # the Liquid pick: the SVG filter, the heavy path
            gl = b.new_context(viewport={'width': 1440, 'height': 900}).new_page(); browser_login(gl, s.base)
            gl.goto(s.base + '/web/links/'); wait_js(gl, "document.querySelectorAll('#grid a.main').length >= 600 && (%s)" % ("!!document.querySelector('#ix-bar.glass-surface')" if on else 'true'), 30000); gl.wait_for_timeout(600)
            sc[on] = gl.evaluate(SCROLL); gl.context.close()
        s.php("hub_settings_update(function ($x) { $x['glass'] = false; return $x; });")
        print('    scroll frame (90th percentile): plain %d ms, glass %d ms' % (sc[False], sc[True]))
        check('V32 Links, 600 links, Bar Glass on (Liquid, the SVG filter): scrolling under the glass bar costs at most twice the plain bar per frame (90th percentile; headless Chromium draws without a GPU, so only the ratio means something)', sc[True] <= 2 * sc[False] + 20, sc)
        check('Vend no page error', not errs, errs)
        b.close()
finally:
    stop_all()
sys.exit(check.done())
