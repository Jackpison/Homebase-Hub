#!/usr/bin/env python3
"""The rebuilt Tools page (tools-app/), installed into a real site: the app (sections, search, favourites, recent, organise,
settings, the carry-over from the old Tools, light and dark) and every tool built so far, in a real browser, plus axe.
    python3 tools/build-tools.py && python3 tests/tools_new_test.py build/site-update-X.Y.Z.zip [build/tools-new] [--browser ...]
Needs PHP, Playwright and axe-core (npm ci). Port 8960."""
import hashlib, io, json, os, shutil, sys, zipfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from helpers import Site, Checks, stop_all, browser_name, launch, wait_js, HERE
from playwright.sync_api import sync_playwright

BROWSER = browser_name()
if len(sys.argv) < 2: sys.exit(__doc__)
ZIP = sys.argv[1]
ROOT = os.path.dirname(HERE)
NEW = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'build', 'tools-new')
DATA = json.load(open(os.path.join(ROOT, 'tools-app', 'src', 'tools.json'), encoding='utf-8'))
AXE = open(os.path.join(ROOT, 'node_modules', 'axe-core', 'axe.min.js'), encoding='utf-8').read()
RUN = "async()=>{const r=await axe.run(document.querySelector('#root'),{resultTypes:['violations'],runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return r.violations.map(v=>v.id+' x'+v.nodes.length+' '+v.nodes[0].target.join(' '))}"
check = Checks()

try:
    s = Site(ZIP, 8960)
    t = os.path.join(s.dir, 'web', 'tools')
    if os.path.isfile(os.path.join(NEW, 'index.html')):   # a staging build: put it in place of the page
        shutil.rmtree(os.path.join(t, 'assets')); shutil.copytree(os.path.join(NEW, 'assets'), os.path.join(t, 'assets'))
        for f in ('index.html', 'sw.js'): shutil.copy(os.path.join(NEW, f), os.path.join(t, f))
    U = s.base + '/web/tools/'
    with sync_playwright() as p:
        b = launch(p, BROWSER); print('browser: %s %s' % (BROWSER, b.version))
        ctx = b.new_context(accept_downloads=True, viewport={'width': 1280, 'height': 900})
        ctx.add_init_script("if (!sessionStorage.getItem('seeded')) { localStorage.setItem('tools.favorites.v1', JSON.stringify(['image-resize', 'nope'])); localStorage.setItem('tools.recent.v1', JSON.stringify([{id: 'pdf-merge'}])); sessionStorage.setItem('seeded', '1'); }")
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.goto(U); wait_js(pg, "document.querySelectorAll('#root .tc').length > 0")
        n = pg.evaluate("new Set([...document.querySelectorAll('#root .tc .tcm')].map(a => a.getAttribute('href'))).size")
        check('N1 the home lists all %d tools, with no page error' % len(DATA['tools']), n == len(DATA['tools']) and not errs, (n, errs))
        NULLS = "(() => { const w = document.createTreeWalker(document.getElementById('root'), NodeFilter.SHOW_TEXT); let n = 0; while (w.nextNode()) if (/^(null|undefined)+$/.test(w.currentNode.nodeValue.trim())) n++; return n; })()"
        check('N1b no stray "null" or "undefined" text on the home', pg.evaluate(NULLS) == 0)
        st = pg.evaluate("JSON.parse(localStorage.getItem('tools.v3'))")
        check('N2 favourites and recent tools carry over from the old Tools (unknown ids dropped)', st['fav'] == ['image-resize'] and st['recent'] == ['pdf-merge'], st)
        pg.fill('#tools-q', 'qr'); pg.wait_for_timeout(150)
        found = pg.evaluate("[...document.querySelectorAll('#root .results .tcm')].map(a => a.getAttribute('href'))")
        check('N3 searching "qr" finds the QR Code Generator', '#/tool/qr-generator' in found and len(found) < 5, found)
        pg.keyboard.press('Enter'); wait_js(pg, "location.hash === '#/tool/qr-generator' && !!document.querySelector('canvas')")
        check('N4 Enter opens the first match', pg.evaluate("location.hash") == '#/tool/qr-generator')

        def dl(click):
            with pg.expect_download(timeout=20000) as d: click()
            return open(d.value.path(), 'rb').read(), d.value.suggested_filename

        pg.fill('#root input[type=url]', 'https://example.com/hello'); pg.wait_for_timeout(200)
        data, name = dl(lambda: pg.get_by_role('button', name='Download PNG', exact=True).click())
        check('N5 QR Code Generator downloads a PNG of the code', data[:8] == b'\x89PNG\r\n\x1a\n' and name == 'qr-code.png', name)
        data, name = dl(lambda: pg.get_by_role('button', name='Download SVG', exact=True).click())
        check('N6 ...and an SVG', data.startswith(b'<svg') and b'<path' in data, data[:40])

        pg.goto(U + '#/tool/json-formatter'); wait_js(pg, "!!document.querySelector('#root textarea')")
        pg.fill('#root textarea >> nth=0', '{\n  "a": 1,\n  "b": [1, 2,]\n}'); pg.get_by_role('button', name='Format', exact=True).click(); pg.wait_for_timeout(150)
        msg = pg.inner_text('#root .note.bad')
        check('N7 JSON Formatter names the exact line and column of an error', 'Line 3, column' in msg and 'comma' in msg, msg)
        pg.fill('#root textarea >> nth=0', '{"b":2,"a":{"d":1,"c":2}}'); pg.get_by_label('Sort keys A to Z').check(); pg.get_by_role('button', name='Format', exact=True).click(); pg.wait_for_timeout(150)
        check('N8 ...formats with sorted keys', pg.input_value('#root textarea >> nth=1') == '{\n  "a": {\n    "c": 2,\n    "d": 1\n  },\n  "b": 2\n}', pg.input_value('#root textarea >> nth=1'))

        pg.goto(U + '#/tool/hash-generator'); wait_js(pg, "!!document.querySelector('#root textarea')")
        pg.fill('#root textarea', 'abc'); pg.wait_for_timeout(150)
        txt = pg.inner_text('#root')
        check('N9 Hash Generator gives the known SHA-256 and SHA-1 of "abc"', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' in txt and 'a9993e364706816aba3e25717850c26c9cd0d89d' in txt)
        pg.fill('#root input[placeholder^="Paste a hash"]', 'BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD'); pg.wait_for_timeout(150)
        check('N10 ...and recognises a pasted hash, in capitals too', 'Match: this is the SHA-256' in pg.inner_text('#root'))

        pg.goto(U + '#/tool/generators'); wait_js(pg, "document.querySelectorAll('#root .flist .out').length > 0")
        pw = pg.evaluate("[...document.querySelectorAll('#root .flist .out')].map(x => x.textContent)")
        import re as _re
        check('N11 Password generator makes 5 passwords of 20 characters with every kind of character', len(pw) == 5 and all(len(x) == 20 and _re.search('[A-Z]', x) and _re.search('[a-z]', x) and _re.search('[0-9]', x) and _re.search(r'[^A-Za-z0-9]', x) for x in pw) and len(set(pw)) == 5, pw)
        pg.get_by_role('button', name='UUIDs', exact=True).click(); pg.wait_for_timeout(150)
        u = pg.evaluate("[...document.querySelectorAll('#root .flist .out')].map(x => x.textContent)")
        check('N12 ...and version 4 UUIDs', len(u) == 5 and all(_re.fullmatch(r'[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}', x) for x in u), u)

        pg.goto(U + '#/tool/text-tools'); wait_js(pg, "!!document.querySelector('#root textarea')")
        pg.fill('#root textarea', 'One two three.\n\nFour five.'); pg.wait_for_timeout(100)
        check('N13 Word counter counts words, sentences and paragraphs', pg.evaluate("[...document.querySelectorAll('#root .kv div')].slice(0,5).map(d => d.firstChild.textContent).join(',')") == '5,26,21,2,2', pg.evaluate("[...document.querySelectorAll('#root .kv div')].map(d => d.textContent).join(' | ')"))
        pg.get_by_role('button', name='Base64', exact=True).click(); pg.fill('#root textarea >> nth=0', 'héllo ✓'); pg.get_by_role('button', name='Encode', exact=True).click(); pg.wait_for_timeout(100)
        enc = pg.input_value('#root textarea >> nth=1'); pg.get_by_role('button', name='Use as Input', exact=True).click(); pg.get_by_role('button', name='Decode', exact=True).click(); pg.wait_for_timeout(100)
        check('N14 Base64 encodes and decodes UTF-8 text', enc == 'aMOpbGxvIOKckw==' and pg.input_value('#root textarea >> nth=1') == 'héllo ✓', enc)

        pg.goto(U + '#/tool/zip-creator'); wait_js(pg, "!!document.querySelector('#root input[type=file]')")
        pg.set_input_files('#root .dropwrap input[type=file]', files=[{'name': 'a.txt', 'mimeType': 'text/plain', 'buffer': b'hello ' * 100}, {'name': 'b.txt', 'mimeType': 'text/plain', 'buffer': b'world'}])
        data, name = dl(lambda: pg.get_by_role('button', name='Create ZIP', exact=True).click())
        z = zipfile.ZipFile(io.BytesIO(data))
        check('N15 ZIP Creator puts both files into one ZIP', sorted(z.namelist()) == ['a.txt', 'b.txt'] and z.read('a.txt') == b'hello ' * 100 and name == 'files.zip', (z.namelist(), name))

        pg.goto(U + '#/tool/favicon'); wait_js(pg, "!!document.querySelector('#root .seg')")
        pg.get_by_role('button', name='Make an Icon Pack', exact=True).click(); pg.set_input_files('#root .dropwrap input[type=file]', os.path.join(HERE, 'fixture-image.png'))
        wait_js(pg, "document.querySelectorAll('#root .icons img').length === 5")
        data, name = dl(lambda: pg.get_by_role('button', name='Download the Icon Pack (ZIP)', exact=True).click())
        z = zipfile.ZipFile(io.BytesIO(data)); ico = z.read('favicon.ico')
        check('N16 Favicon Maker makes a pack: favicon.ico with 3 sizes, PNGs up to 512, a manifest', {'favicon.ico', 'icon-512.png', 'apple-touch-icon.png', 'site.webmanifest'} <= set(z.namelist()) and ico[:4] == b'\x00\x00\x01\x00' and ico[4] == 3, z.namelist())

        # the app itself
        pg.goto(U + '#/'); wait_js(pg, "document.querySelectorAll('#root .tc').length > 0")
        pg.click('#root .tc:has(a[href="#/tool/json-formatter"]) .star'); pg.goto(U + '#/favourites'); wait_js(pg, "location.hash === '#/favourites'"); pg.wait_for_timeout(150)
        favs = pg.evaluate("[...document.querySelectorAll('#root .tcm')].map(a => a.getAttribute('href'))")
        check('N17 a star adds a favourite, and Favourites lists it', '#/tool/json-formatter' in favs and '#/tool/image-resize' in favs, favs)
        pg.goto(U + '#/recent'); pg.wait_for_timeout(150)
        rec = pg.evaluate("[...document.querySelectorAll('#root .tcm')].map(a => a.getAttribute('href'))")
        check('N18 Recent lists the tools just used, newest first', rec[:2] == ['#/tool/favicon', '#/tool/zip-creator'], rec[:4])
        pg.goto(U + '#/organise'); pg.wait_for_timeout(150)
        pg.click('button[aria-label="Show QR Code Generator"]'); pg.goto(U + '#/s/utilities'); pg.wait_for_timeout(150)
        ul = pg.evaluate("[...document.querySelectorAll('#root .tcm')].map(a => a.getAttribute('href'))")
        check('N19 Organise hides a tool from its section', '#/tool/qr-generator' not in ul and '#/tool/favicon' in ul, ul)
        pg.goto(U + '#/organise'); pg.wait_for_timeout(150); pg.click('button[aria-label="Move Favicon Downloader down"], button[aria-label^="Move Favicon"][aria-label$="down"]')
        pg.goto(U + '#/s/utilities'); pg.wait_for_timeout(150)
        ul2 = pg.evaluate("[...document.querySelectorAll('#root .tcm')].map(a => a.getAttribute('href'))")
        check('N20 ...and changes the order within a section', ul2.index('#/tool/favicon') > ul.index('#/tool/favicon'), (ul, ul2))
        pg.goto(U + '#/settings'); pg.wait_for_timeout(150); pg.get_by_role('button', name='Tabs on Top', exact=True).click(); pg.reload(); wait_js(pg, "!!document.querySelector('.tl')")
        check('N21 Settings: tabs on top is kept after a reload, with no stray text in the menu', pg.evaluate("document.querySelector('.tl').dataset.layout") == 'tabs' and pg.evaluate(NULLS) == 0)
        dark = pg.evaluate("getComputedStyle(document.body).backgroundColor"); pg.evaluate("document.documentElement.setAttribute('data-theme','light')"); pg.wait_for_timeout(100)
        check('N22 light and dark follow the site', dark != pg.evaluate("getComputedStyle(document.body).backgroundColor"))
        missing = [t['id'] for t in DATA['tools']]
        pg.goto(U + '#/tool/nothing-like-this'); pg.wait_for_timeout(200)
        check('N23 an unknown tool address says so and offers the list', 'Tool not found' in pg.inner_text('#root'))
        check('N24 no page error anywhere', not errs, errs)
        for scheme in ('dark', 'light'):
            pg.evaluate("document.documentElement.setAttribute('data-theme', %r)" % scheme)
            found = []
            for u in ('#/', '#/tool/qr-generator', '#/tool/json-formatter', '#/tool/generators', '#/organise', '#/settings'):
                pg.goto(U + u); pg.wait_for_timeout(300); pg.evaluate("document.documentElement.setAttribute('data-theme', %r)" % scheme); pg.mouse.move(2, 2); pg.wait_for_timeout(100)
                pg.evaluate(AXE); v = pg.evaluate(RUN)
                if v: found.append(u + ': ' + '; '.join(v[:3]))
            check('N25 axe finds nothing on the home, three tools, Organise and Settings (%s)' % scheme, not found, found[:4])
        b.close()
finally:
    stop_all()
sys.exit(check.done())
