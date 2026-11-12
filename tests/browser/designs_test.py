#!/usr/bin/env python3
"""Animated designs on Home (1.74.0): the React Bits backgrounds, run without React.
  * a new site shows one as its background, with the credit; no security-policy refusal and no page error
  * every design (but the WebGPU one, which needs a real GPU) draws something when it starts
  * Background > Animated Designs: Preview shows a design without saving; switching a design off and your options are kept by Save Background
  * a phone is never given the computers-only designs (their files are not even requested); Reduce Motion keeps to the designs that can stand still
    python3 tests/browser/designs_test.py build/site-update-X.Y.Z.zip [--full]     (Chromium only: it needs WebGL; port 8988)
Every push runs the quick version (4 designs drawn, short phone and Reduce Motion loops: software-drawn designs are slow in CI); the monthly
Scheduled checks run --full (all 15 drawn, longer loops)."""
import json, os, subprocess, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import SEED, Site, Checks, stop_all, browser_login, wait_js, browser_name, until, page_errors, CSP_REPORTER
from playwright.sync_api import sync_playwright

if len(sys.argv) < 2: sys.exit(__doc__)
if browser_name() != 'chromium': print('designs_test: WebGL here needs Chromium; nothing to check in this browser'); sys.exit(0)
ZIP = sys.argv[1]; check = Checks(); FULL = '--full' in sys.argv
QUICK = {'iridescence', 'orb', 'balatro', 'crystalized-ball'}   # one that draws with plain WebGL, two shaders, one with the ogl library
ARGS = ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
COLORS = """async (b64) => { const bin = atob(b64), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  const bm = await createImageBitmap(new Blob([a], { type: 'image/png' })), c = document.createElement('canvas'); c.width = 40; c.height = 25;
  const x = c.getContext('2d'); x.drawImage(bm, 0, 0, 40, 25); const d = x.getImageData(0, 0, 40, 25).data, s = new Set();
  for (let i = 0; i < d.length; i += 4) s.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]); return s.size; }"""
try:
    s = Site(ZIP, 8988, home_theme='designs')   # a new site starts on Starter; this one is switched to the Animated Designs
    subprocess.run(['php', SEED, s.dir], capture_output=True)
    reg = json.load(open(os.path.join(s.dir, 'web/home/designs/designs.json')))
    site_bg = lambda: json.loads(s.php("require '%s/web/home/lib.php'; echo json_encode(load_site()['bg']);" % s.dir))
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS); print('browser: chromium', b.version)
        ctx = b.new_context(viewport={'width': 1280, 'height': 800}); ctx.add_init_script(CSP_REPORTER)
        failed = []; ctx.on('response', lambda r: failed.append('%d %s' % (r.status, r.url)) if '/designs/' in r.url and r.status >= 400 else None)
        errs = []; pg = ctx.new_page(); page_errors(pg, errs)
        pg.on('console', lambda m: errs.append(m.text[:200]) if m.type == 'error' and 'security policy' in m.text else None)
        pg.goto(s.base + '/web/home/', wait_until='commit', timeout=90000)
        try: wait_js(pg, "!!document.querySelector('#bg > .design canvas')", 20000)
        except Exception: pass
        st = pg.evaluate("[PUB.bg.theme, (PUB.bg.own || []).length, document.querySelectorAll('#bg > .design canvas').length, document.getElementById('creditText').textContent]")
        check('H1 with the Animated Designs chosen, one is drawn behind the page, with its credit, and nothing is refused', st[0] == 'designs' and st[1] == 16 and st[2] >= 1 and st[3] == 'From React Bits' and not errs, (st, errs))

        pg.goto('about:blank')   # its animation stops, so the next page has the processor to itself
        # every design draws: its files are loaded by hand in a blank page of the site (the same address, so the same security policy)
        pg2 = ctx.new_page(); pg2.set_viewport_size({'width': 800, 'height': 500}); errs2 = []; page_errors(pg2, errs2)
        pg2.on('console', lambda m: errs2.append(m.text[:200]) if m.type == 'error' and 'security policy' in m.text else None)
        def drawn(page):
            """The most colours seen on screen, waiting until there are more than 12 (a design draws a moment after it starts)."""
            seen = [0]
            def look():
                seen[0] = page.evaluate(COLORS, __import__('base64').b64encode(page.screenshot(timeout=90000)).decode()); return seen[0] >= 12
            until(look, 25000, 300); return seen[0]
        weak = {}
        for i in sorted(reg):
            if reg[i]['gpu'] or (not FULL and i not in QUICK): continue
            pg2.goto(s.base + '/web/home/designs/manifest.json')
            pg2.evaluate("() => { document.body.innerHTML = ''; const c = document.createElement('div'); c.id = 'c'; Object.assign(c.style, { position: 'fixed', inset: '0', background: '#000' }); document.body.appendChild(c); }")
            if os.path.isfile(os.path.join(s.dir, 'web/home/designs', i + '.css')): pg2.add_style_tag(url=s.base + '/web/home/designs/%s.css' % i)
            pg2.add_script_tag(url=s.base + '/web/home/designs/%s.js' % i)
            ok = pg2.evaluate("(d) => { try { window.__r = HubDesigns[d[0]].start(document.getElementById('c'), d[1]); return true; } catch (e) { return String(e); } }", [i, reg[i]['defaults']])
            n = drawn(pg2) if ok is True else 0
            canv = pg2.evaluate("document.querySelectorAll('#c canvas').length")
            pg2.evaluate("window.__r && window.__r.destroy()"); gone = pg2.evaluate("document.querySelectorAll('#c canvas').length")
            if ok is not True or n < 12 or not canv or gone: weak[i] = (ok, n, canv, gone)
        check('H2 each design starts, draws something (more than 12 colours on screen), and takes its canvas away when it stops (%d designs)' % len([i for i in reg if not reg[i]['gpu'] and (FULL or i in QUICK)]), not weak and not errs2, (weak, errs2))
        pg2.close()

        # the Background sheet: Preview does not save; switching off and options are kept by Save Background
        before = site_bg(); why = browser_login(pg, s.base); pg.goto(s.base + '/web/home/', wait_until='commit', timeout=90000); wait_js(pg, "!!document.querySelector('[data-hub=toggle]')", 20000)
        pg.evaluate("document.querySelector('[data-hub=toggle]').click()"); wait_js(pg, "document.body.classList.contains('editing')", 15000)
        pg.evaluate("document.querySelector('[data-open=bgSheet]').click()"); wait_js(pg, "document.querySelectorAll('#designRows .dz').length === 16", 15000)
        rows = pg.evaluate("[...document.querySelectorAll('#designRows .dz')].map(r => [r.dataset.id, r.querySelector('.dz-sw') ? getComputedStyle(r.querySelector('.dz-sw')).backgroundImage.slice(0, 15) : ''])")
        check('H3 Background lists the 16 designs, each with a colour swatch (the swatches are not blocked) and the Animated Designs theme card is In Use', len(rows) == 16 and all(r[1].startswith('linear-gradient') for r in rows) and pg.evaluate("!!document.querySelector('.theme.on[data-theme=designs]')"), rows[:2])
        pg.evaluate("document.querySelector('#designRows [data-id=galaxy] [data-z=preview]').click()")
        shown = until(lambda: pg.evaluate("!!document.querySelector('#bg > .design.on') && document.querySelector('#creditText').textContent === 'From React Bits'"), 15000)
        check('H4 Preview shows that design at once and saves nothing', shown and site_bg() == before, (shown,))
        pg.evaluate("document.querySelector('#designRows [data-id=orb] [data-z=on]').click()")
        pg.evaluate("document.querySelector('#designRows [data-id=orb] [data-z=opts]').click()"); wait_js(pg, "document.getElementById('designSheet').open", 5000)
        pg.evaluate("(() => { const i = document.querySelector('#designOpts input[data-i=\"0\"]'); i.value = '#112233'; i.dispatchEvent(new Event('input', { bubbles: true })); })()")
        pg.evaluate("document.getElementById('designForm').requestSubmit()")
        pg.evaluate("document.getElementById('saveBg').click()")
        saved = until(lambda: (site_bg().get('designs') or {}).get('orb', {}).get('on') is False, 10000)
        d = site_bg().get('designs') or {}
        check('H5 Save Background keeps a design switched off and your colour (only the options the design lists)', saved and d['orb']['opts'].get('colors', [None])[0] == '#112233' and len(d['orb']['opts']['colors']) == 3, d)
        pg.goto('about:blank')   # the design on screen stops, so the next load has the processor to itself
        pg.goto(s.base + '/web/home/', wait_until='commit', timeout=90000); wait_js(pg, "!!window.PUB", 60000)
        own = pg.evaluate("(PUB.bg.own || []).map(i => i.url)")
        check('H6 the saved choice reaches the page: Orb is out of the rotation, the other 15 are in', 'design:orb' not in own and len(own) == 15, own)

        # a phone: no computers-only design is ever requested
        ph = b.new_context(**p.devices['Pixel 7']); ph.add_init_script(CSP_REPORTER); asked = []
        pp = ph.new_page(); pp.on('request', lambda r: asked.append(r.url) if '/designs/' in r.url else None); perr = []; page_errors(pp, perr)
        pp.goto(s.base + '/web/home/', wait_until='commit', timeout=90000)
        wait_js(pp, "!!document.getElementById('nextBg') && !!window.PUB", 60000)
        have = pp.evaluate("(PUB.bg.own || []).map(i => i.url)")
        for _ in range(14 if FULL else 8):
            pp.evaluate("document.getElementById('nextBg').click()"); until(lambda: not pp.evaluate("document.getElementById('nextBg').classList.contains('spin')"), 15000)
        heavy = [i for i in reg if reg[i]['desktop']]
        check('H7 on a phone the computers-only designs (Hyperspeed, Aero Shards) are on the list but never asked for; the others are', all('design:' + i in have for i in heavy) and not [u for u in asked if any('/%s.' % i in u for i in heavy)] and len([u for u in asked if u.endswith('.js') or '.js?' in u]) >= 2, (asked[:6], perr))
        ph.close()

        # Reduce Motion: only the designs that can stand still
        rm = b.new_context(viewport={'width': 1280, 'height': 800}, reduced_motion='reduce'); asked2 = []
        rp = rm.new_page(); rp.on('request', lambda r: asked2.append(r.url) if '/designs/' in r.url and '.js' in r.url else None)
        rp.goto(s.base + '/web/home/', wait_until='commit', timeout=90000)
        wait_js(rp, "!!document.getElementById('nextBg') && !!window.PUB", 60000)
        for _ in range(12 if FULL else 6):
            rp.evaluate("document.getElementById('nextBg').click()"); until(lambda: not rp.evaluate("document.getElementById('nextBg').classList.contains('spin')"), 15000)
        moving = [i for i in reg if not reg[i]['still']]
        check('H8 with Reduce Motion only the designs that can stand still are fetched', asked2 and not [u for u in asked2 if any('/%s.js' % i in u for i in moving)], asked2)
        check('H9 no file of a design was missing or refused (a design without styles still has a stylesheet)', not failed, failed[:4])
        rm.close(); b.close()
finally:
    stop_all()
sys.exit(check.done())
