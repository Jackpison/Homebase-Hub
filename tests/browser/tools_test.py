#!/usr/bin/env python3
"""The Tools page (built from tools-app/), installed in a real site: the app (sections, search, favourites, recent, organise,
settings, the carry-over from the old Tools, light and dark) and every tool built so far, in a real browser, plus axe.
    python3 tests/browser/tools_test.py build/site-update-X.Y.Z.zip [build/tools-new] [--browser ...]
With a second argument (python3 tools/build-tools.py makes build/tools-new) that staging copy is swapped in first.
Needs PHP, Playwright and axe-core (npm ci). Port 8960."""
import hashlib, io, json, os, shutil, sys, zipfile

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import ROOT, FIX as FIXDIR, SEED
from helpers import Site, Checks, stop_all, browser_name, launch, wait_js, HERE
from playwright.sync_api import sync_playwright

BROWSER = browser_name()
if len(sys.argv) < 2: sys.exit(__doc__)
ZIP = sys.argv[1]
NEW = sys.argv[2] if len(sys.argv) > 2 else ''
DATA = json.load(open(os.path.join(ROOT, 'tools-app', 'src', 'tools.json'), encoding='utf-8'))
AXE = open(os.path.join(ROOT, 'node_modules', 'axe-core', 'axe.min.js'), encoding='utf-8').read()
RUN = "async()=>{const r=await axe.run(document.querySelector('#root'),{resultTypes:['violations'],runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return r.violations.map(v=>v.id+' x'+v.nodes.length+' '+v.nodes[0].target.join(' '))}"
check = Checks()

try:
    s = Site(ZIP, 8960)
    t = os.path.join(s.dir, 'web', 'tools')
    if NEW and os.path.isfile(os.path.join(NEW, 'index.html')):   # a staging build: put it in place of the page
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
        pg.get_by_role('button', name='Make an Icon Pack', exact=True).click(); pg.set_input_files('#root .dropwrap input[type=file]', os.path.join(FIXDIR, 'fixture-image.png'))
        wait_js(pg, "document.querySelectorAll('#root .icons img').length === 5")
        data, name = dl(lambda: pg.get_by_role('button', name='Download the Icon Pack (ZIP)', exact=True).click())
        z = zipfile.ZipFile(io.BytesIO(data)); ico = z.read('favicon.ico')
        check('N16 Favicon Maker makes a pack: favicon.ico with 3 sizes, PNGs up to 512, a manifest', {'favicon.ico', 'icon-512.png', 'apple-touch-icon.png', 'site.webmanifest'} <= set(z.namelist()) and ico[:4] == b'\x00\x00\x01\x00' and ico[4] == 3, z.namelist())

        # ---------- Images ----------
        import tempfile
        from PIL import Image as PI, ImageStat
        TMP = tempfile.mkdtemp(prefix='hub-img-')
        def img(data): return PI.open(io.BytesIO(data))
        noisy = os.path.join(TMP, 'big-photo.jpg')
        PI.effect_noise((1600, 1200), 70).convert('RGB').resize((2000, 1500)).save(noisy, quality=95)
        tif = os.path.join(TMP, 'scan.tif'); PI.open(os.path.join(FIXDIR, 'fixture-image.png')).save(tif)
        FIX = os.path.join(FIXDIR, 'fixture-image.png'); HEIC = os.path.join(FIXDIR, 'fixture-photo.heic')
        OPENED = []
        def open_tool(i):   # through the home, so the tool starts fresh even when it was the last one open
            OPENED.append(i)
            pg.goto(U + '#/'); wait_js(pg, "location.hash === '#/'"); pg.goto(U + '#/tool/' + i); wait_js(pg, "!!document.querySelector('#root .dropwrap input[type=file]')")
        def go(name, files, timeout=60000):
            pg.set_input_files('#root .dropwrap input[type=file] >> nth=0', files); pg.wait_for_timeout(400)
            with pg.expect_download(timeout=timeout) as d: pg.get_by_role('button', name=name, exact=True).click()
            return open(d.value.path(), 'rb').read(), d.value.suggested_filename

        open_tool('image-converter')
        data, name = go('Convert', FIX); check('I1 Image Converter: PNG to JPG', data[:3] == b'\xff\xd8\xff' and name == 'fixture-image.jpg' and img(data).size == (800, 600), name)
        open_tool('image-converter'); pg.get_by_role('button', name='AVIF', exact=True).click()
        data, name = go('Convert', FIX, 120000); check('I2 ...to AVIF (the AVIF encoder loads and works)', data[4:12] == b'ftypavif' and name.endswith('.avif'), data[:16])
        open_tool('image-converter'); data, name = go('Convert', HEIC, 120000)
        check('I3 ...HEIC to JPG (the HEIC reader loads and works)', data[:3] == b'\xff\xd8\xff' and name == 'fixture-photo.jpg' and img(data).size == (320, 240), (name, data[:4]))
        open_tool('image-converter'); pg.get_by_role('button', name='PNG', exact=True).click(); data, name = go('Convert', tif)
        check('I4 ...TIFF to PNG', data[:8] == b'\x89PNG\r\n\x1a\n' and img(data).size == (800, 600), name)
        open_tool('image-converter'); pg.set_input_files('#root .dropwrap input[type=file]', [FIX, tif]); pg.wait_for_timeout(300)
        pg.get_by_role('button', name='Convert', exact=True).click(); wait_js(pg, "[...document.querySelectorAll('#root button')].some(b => b.textContent.includes('Download All (ZIP)'))", 60000)
        with pg.expect_download() as d: pg.get_by_role('button', name='Download All (ZIP)').click()
        zz = zipfile.ZipFile(d.value.path()); check('I5 ...two images at once come as a ZIP of two JPGs', len(zz.namelist()) == 2 and all(n.endswith('.jpg') for n in zz.namelist()), zz.namelist())

        open_tool('image-compress'); pg.fill('#root input[aria-label="Target size"]', '120')
        data, name = go('Compress', noisy, 120000); before = os.path.getsize(noisy)
        check('I6 Image Compressor: a %d KB photo comes under the 120 KB target' % (before // 1024), len(data) <= 120 * 1024 and data[:3] == b'\xff\xd8\xff', len(data))
        check('I7 ...and the page shows the saving', 'smaller' in pg.inner_text('#root'))

        open_tool('image-resize'); pg.fill('#root input[aria-label="Width"]', '300')
        data, name = go('Resize', FIX); check('I8 Image Resizer: width 300 keeps the shape (300 x 225)', img(data).size == (300, 225) and '300x225' in name, (img(data).size, name))
        open_tool('image-resize'); pg.get_by_role('button', name='Social sizes', exact=True).click()
        data, name = go('Resize', FIX); check('I9 ...the Instagram square preset fills 1080 x 1080', img(data).size == (1080, 1080), img(data).size)

        open_tool('img-rotate'); pg.set_input_files('#root .dropwrap input[type=file]', FIX); pg.wait_for_timeout(500)
        pg.get_by_role('button', name='Right', exact=True).click()
        with pg.expect_download() as d: pg.get_by_role('button', name='Save', exact=True).click()
        check('I10 Rotate and Flip: a quarter turn swaps width and height', img(open(d.value.path(), 'rb').read()).size == (600, 800))

        open_tool('img-adjust'); pg.set_input_files('#root .dropwrap input[type=file]', FIX); pg.wait_for_timeout(500)
        pg.evaluate("(() => { const r = [...document.querySelectorAll('#root input[type=range]')][0]; r.value = 60; r.dispatchEvent(new Event('input')); })()")
        with pg.expect_download() as d: pg.get_by_role('button', name='Save', exact=True).click()
        lum = lambda im: sum(ImageStat.Stat(im.convert('L')).mean)
        check('I11 Image Editor: more brightness makes a brighter photo', lum(img(open(d.value.path(), 'rb').read())) > lum(PI.open(FIX)) + 20)

        open_tool('img-watermark'); data, name = go('Add to All and Save', FIX)
        check('I12 Watermark Images: same size, and the photo changed', img(data).size == (800, 600) and list(img(data).convert('RGB').getdata())[::997] != list(PI.open(FIX).convert('RGB').getdata())[::997], name)

        open_tool('img-colors'); pg.set_input_files('#root .dropwrap input[type=file]', HEIC); wait_js(pg, "document.querySelectorAll('#root .sw').length >= 4", 60000)
        hexes = pg.evaluate("[...document.querySelectorAll('#root .flist .out')].map(x => x.textContent)")
        check('I13 Color Picker: the palette finds the main colours of the photo', sum(1 for x in hexes if x.startswith('#')) >= 4, hexes[:6])

        open_tool('img-beautify'); data, name = go('Save PNG', FIX)
        check('I14 Screenshot Beautifier: padding and a window frame around the screenshot (928 x 762)', img(data).size == (928, 762), img(data).size)

        open_tool('svg-png'); pg.fill('#root textarea', '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><rect width="100" height="50" fill="#f00"/></svg>')
        pg.fill('#root input[type=number]', '400')
        with pg.expect_download() as d: pg.get_by_role('button', name='Convert', exact=True).click()
        sv = img(open(d.value.path(), 'rb').read()); check('I15 SVG to PNG: code at 400 pixels wide keeps the shape and colour', sv.size == (400, 200) and sv.convert('RGB').getpixel((200, 100)) == (255, 0, 0), sv.size)

        open_tool('img-base64'); pg.set_input_files('#root .dropwrap input[type=file]', FIX); pg.wait_for_timeout(500)
        uri = pg.input_value('#root textarea >> nth=0')
        check('I16 Image to Base64 makes a data URI', uri.startswith('data:image/png;base64,iVBOR'))
        pg.get_by_role('button', name='Base64 to Image', exact=True).click(); pg.fill('#root textarea', uri); pg.get_by_role('button', name='Make the File', exact=True).click()
        with pg.expect_download() as d: pg.get_by_role('button', name='Download image.png', exact=True).click()
        check('I17 ...and turns it back into the same file', open(d.value.path(), 'rb').read() == open(FIX, 'rb').read())
        # ---------- Photos ----------
        def run_save(btn='Save', timeout=60000):
            with pg.expect_download(timeout=timeout) as d: pg.get_by_role('button', name=btn, exact=True).click()
            return open(d.value.path(), 'rb').read(), d.value.suggested_filename
        def load(i, f): open_tool(i); pg.set_input_files('#root .dropwrap input[type=file] >> nth=0', f); pg.wait_for_timeout(600)

        load('image-crop', FIX); pg.get_by_role('button', name='1:1', exact=True).click(); data, name = run_save('Crop and Save')
        w_, h_ = img(data).size; check('P1 Quick Crop: 1:1 gives a square', w_ == h_ and w_ >= 500, (w_, h_))
        load('image-crop', FIX); pg.get_by_role('button', name='Exact pixels', exact=True).click(); pg.fill('#root input[aria-label="Width in pixels"]', '300'); pg.fill('#root input[aria-label="Height in pixels"]', '200'); pg.wait_for_timeout(200)
        data, name = run_save('Crop and Save'); check('P2 ...exact pixels give exactly 300 x 200', img(data).size == (300, 200), img(data).size)
        pg.focus('#root .cbox'); before = pg.evaluate("document.querySelector('#root .cbox').style.left"); pg.keyboard.press('ArrowLeft'); pg.keyboard.press('ArrowLeft')
        check('P3 ...the crop box moves with the arrow keys', pg.evaluate("document.querySelector('#root .cbox').style.left") != before)

        load('circle-crop', FIX); data, name = run_save('Save PNG'); ci = img(data).convert('RGBA')
        check('P4 Circle Crop: a 512 px round PNG, see-through in the corners', ci.size == (512, 512) and ci.getpixel((2, 2))[3] == 0 and ci.getpixel((256, 256))[3] == 255, (ci.size, ci.getpixel((2, 2))))

        load('id-photo', FIX); pg.get_by_role('button', name='One photo', exact=True).click(); data, name = run_save('Make and Save')
        check('P5 Passport and ID Photo: 35 x 45 mm at 300 dpi is 413 x 531 pixels', img(data).size == (413, 531), img(data).size)
        load('id-photo', FIX); data, name = run_save('Make and Save'); txt = pg.inner_text('#root')
        check('P6 ...a 4 x 6 in print sheet (1200 x 1800) with several copies', img(data).size == (1200, 1800) and 'copies on the sheet' in txt, (img(data).size, txt[-200:]))

        load('bg-remove', FIX); wait_js(pg, "!!document.querySelector('#root .preview canvas')", 120000)
        data, name = run_save('Save'); bi = img(data).convert('RGBA'); W_, H_ = bi.size
        check('P7 Background Remover (ONNX Runtime 1.30, on the device): the background goes, the subject stays', bi.getpixel((5, 5))[3] < 80 and bi.getpixel((W_ // 2, H_ // 2))[3] > 170 and name.endswith('.png'), (bi.getpixel((5, 5)), bi.getpixel((W_ // 2, H_ // 2))))

        load('img-redact', FIX); pg.get_by_role('button', name='Add an Area in the Middle', exact=True).click(); pg.get_by_role('button', name='Solid box', exact=True).click()
        data, name = run_save(); ri = img(data).convert('RGB')
        check('P8 Blur and Redact: a solid box covers the marked area and nothing else', ri.getpixel((400, 300)) == (0, 0, 0) and ri.getpixel((10, 10)) == PI.open(FIX).convert('RGB').getpixel((10, 10)), (ri.getpixel((400, 300)), ri.getpixel((10, 10))))

        load('meme', FIX); data, name = run_save(); mi = img(data).convert('RGB'); orig = PI.open(FIX).convert('RGB')
        diff = sum(1 for x in range(0, 800, 8) if mi.getpixel((x, 60)) != orig.getpixel((x, 60)))
        check('P9 Meme and Text: the caption is drawn at the top', mi.size == (800, 600) and diff > 10, diff)

        gpsf = os.path.join(TMP, 'holiday.jpg'); ex = PI.Exif(); ex[0x010F] = 'TestMaker'; ex[0x0110] = 'Model 7'
        ex[0x8825] = {1: 'N', 2: (12.0, 58.0, 0.0), 3: 'E', 4: (77.0, 35.0, 0.0)}
        PI.new('RGB', (400, 300), (200, 100, 50)).save(gpsf, exif=ex.tobytes())
        load('image-metadata', gpsf); wait_js(pg, "document.querySelector('#root').innerText.includes('Location') || document.querySelector('#root').innerText.includes('No camera')", 20000)
        txt = pg.inner_text('#root')
        check('P10 Photo Metadata shows the camera and the GPS location, with a warning', 'TestMaker' in txt and '12.96667' in txt and 'shows where it was taken' in txt, txt[-300:])
        data, name = run_save('Remove Metadata and Save'); ci2 = img(data)
        check('P11 ...and saves the photo without any metadata', len(ci2.getexif()) == 0 and ci2.size == (400, 300), dict(ci2.getexif()))

        open_tool('collage'); cols = [(230, 60, 60), (60, 160, 230), (250, 200, 40), (60, 200, 120), (150, 80, 220), (240, 120, 30)]
        tiles = []
        for k, c in enumerate(cols): f = os.path.join(TMP, 'p%d.png' % k); PI.new('RGB', (600 + k * 50, 400 + k * 30), c).save(f); tiles.append(f)
        pg.set_input_files('#root .dropwrap input[type=file]', tiles); pg.wait_for_timeout(800)
        check('P12 Collage Maker offers 21 layouts', pg.evaluate("document.querySelectorAll('#root select')[0].options.length") == 21)
        pg.select_option('#root select >> nth=0', 'g3'); data, name = run_save('Save the Collage'); co = img(data).convert('RGB')
        near = lambda p, q: all(abs(x - y) <= 6 for x, y in zip(p, q))   # JPEG rounds colours a little
        check('P13 ...a 3-column grid of 6 photos at 2400 x 2400', co.size == (2400, 2400) and near(co.getpixel((400, 600)), (230, 60, 60)) and near(co.getpixel((2000, 1800)), (240, 120, 30)), (co.size, co.getpixel((400, 600)), co.getpixel((2000, 1800))))
        pg.get_by_role('button', name='PDF', exact=True).click(); data, name = run_save('Save the Collage')
        check('P14 ...and as a PDF', data[:5] == b'%PDF-' and name == 'collage.pdf', data[:8])
        # ---------- PDF ----------
        from pypdf import PdfReader
        P3, P2 = os.path.join(FIXDIR, 'fixture-3pages.pdf'), os.path.join(FIXDIR, 'fixture-2pages.pdf')
        rd = lambda b: PdfReader(io.BytesIO(b))
        load('pdf-merge', [P3, P2]); data, name = run_save('Merge'); check('D1 Merge PDF: 3 + 2 pages make one 5-page PDF', len(rd(data).pages) == 5 and name == 'merged.pdf', name)
        load('pdf-split', P3); wait_js(pg, "document.querySelector('#root').innerText.includes('3 pages')", 20000)
        pg.get_by_role('button', name='Split', exact=True).click(); wait_js(pg, "[...document.querySelectorAll('#root button')].some(b => b.textContent.includes('Download All'))", 30000)
        with pg.expect_download() as d: pg.get_by_role('button', name='Download All (ZIP)').click()
        zz = zipfile.ZipFile(d.value.path()); check('D2 Split PDF: single pages make 3 one-page PDFs', len(zz.namelist()) == 3 and all(len(rd(zz.read(n)).pages) == 1 for n in zz.namelist()), zz.namelist())
        load('pdf-split', P3); wait_js(pg, "document.querySelector('#root').innerText.includes('3 pages')", 20000); pg.get_by_role('button', name='Your ranges', exact=True).click(); pg.fill('#root input[aria-label="Ranges"]', '1-2, 3')
        pg.get_by_role('button', name='Split', exact=True).click(); wait_js(pg, "[...document.querySelectorAll('#root button')].some(b => b.textContent.includes('Download All'))", 30000)
        with pg.expect_download() as d: pg.get_by_role('button', name='Download All (ZIP)').click()
        zz = zipfile.ZipFile(d.value.path()); check('D3 ...your ranges 1-2, 3 make files of 2 and 1 pages', sorted(len(rd(zz.read(n)).pages) for n in zz.namelist()) == [1, 2], zz.namelist())
        load('pdf-organize', P3); wait_js(pg, "document.querySelectorAll('#root .thumb').length === 3", 30000)
        pg.click('button[aria-label="Delete, page 2"]'); pg.click('button[aria-label="Rotate, page 1"]'); data, name = run_save('Save the New PDF'); r_ = rd(data)
        check('D4 Organize PDF Pages: delete one page and turn another', len(r_.pages) == 2 and r_.pages[0].rotation == 90, (len(r_.pages), r_.pages[0].rotation))
        load('pdf-to-images', P3); wait_js(pg, "document.querySelector('#root').innerText.includes('3 pages')", 20000)
        pg.get_by_role('button', name='Make Images', exact=True).click(); wait_js(pg, "[...document.querySelectorAll('#root button')].some(b => b.textContent.includes('Download All'))", 60000)
        with pg.expect_download() as d: pg.get_by_role('button', name='Download All (ZIP)').click()
        zz = zipfile.ZipFile(d.value.path()); check('D5 PDF to Images: 3 pages make 3 JPGs', len(zz.namelist()) == 3 and all(zz.read(n)[:3] == b'\xff\xd8\xff' for n in zz.namelist()), zz.namelist())
        load('images-to-pdf', [FIX, HEIC]); data, name = run_save('Make PDF'); r_ = rd(data)
        dims = [sorted((round(float(p.mediabox.width)), round(float(p.mediabox.height)))) for p in r_.pages]
        check('D6 Images to PDF: a PNG and a HEIC make a 2-page A4 PDF (landscape photos on landscape pages)', len(r_.pages) == 2 and dims == [[595, 842], [595, 842]] and float(r_.pages[0].mediabox.width) > float(r_.pages[0].mediabox.height), dims)
        load('pdf-compress', P3); pg.get_by_role('button', name='Light (keeps the text)', exact=True).click(); data, name = run_save('Compress', 60000)
        check('D7 PDF Compressor: Light keeps a valid PDF with its 3 pages and its text', len(rd(data).pages) == 3 and 'quick brown fox' in rd(data).pages[0].extract_text().lower(), name)
        load('pdf-compress', P3); data, name = run_save('Compress', 120000); check('D8 ...Strong rebuilds the pages', len(rd(data).pages) == 3, name)
        load('pdf-protect', P3); pg.fill('#root input[type=password] >> nth=0', 'open sesame'); pg.fill('#root input[type=password] >> nth=1', 'open sesame'); data, name = run_save('Protect', 60000)
        r_ = rd(data); enc = r_.is_encrypted; ed = str(r_.trailer['/Encrypt'].get_object()) if enc else ''   # read without decrypting: CI has no cryptography package
        check('D9 Protect or Unlock: AES-256 with a password (qpdf)', enc and '/AESV3' in ed and "'/V': 5" in ed, ed[:160])
        prot = os.path.join(TMP, 'locked.pdf'); open(prot, 'wb').write(data)
        open_tool('pdf-protect'); pg.get_by_role('button', name='Remove a Password', exact=True).click(); pg.set_input_files('#root .dropwrap input[type=file]', prot); pg.wait_for_timeout(300)
        pg.fill('#root input[type=password]', 'wrong one'); pg.get_by_role('button', name='Remove the Password', exact=True).click()
        wait_js(pg, "document.body.innerText.includes('not right')", 30000)
        check('D10 ...a wrong password is refused with a plain message', 'That password is not right.' in pg.inner_text('body'))
        pg.fill('#root input[type=password]', 'open sesame'); data, name = run_save('Remove the Password', 60000)
        check('D11 ...and the right one removes it', not rd(data).is_encrypted and len(rd(data).pages) == 3, name)
        load('pdf-text', P3); pg.get_by_role('button', name='Text Layer Only', exact=True).click(); pg.get_by_role('button', name='Get the Text', exact=True).click()
        wait_js(pg, "document.querySelector('#root textarea').value.length > 10", 60000); txt = pg.input_value('#root textarea')
        check('D12 PDF to Text reads the text layer, page by page', 'quick brown fox' in txt.lower() and '--- page 3 ---' in txt, txt[:120])
        ocr = os.path.join(TMP, 'note.png'); im_ = PI.new('RGB', (900, 260), 'white'); from PIL import ImageDraw, ImageFont
        ImageDraw.Draw(im_).text((40, 70), 'HELLO WORLD 2026', fill='black', font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 72)); im_.save(ocr)
        load('pdf-text', ocr); pg.get_by_role('button', name='Get the Text', exact=True).click()
        wait_js(pg, "document.querySelector('#root textarea').value.length > 5", 180000); txt = pg.input_value('#root textarea')
        check('D13 ...and reads a photo of text with OCR (Tesseract 7, in the browser)', 'HELLO WORLD' in txt.upper(), txt[:120])
        load('pdf-stamp', P3); data, name = run_save('Stamp and Save', 60000); t1 = rd(data).pages[0].extract_text()
        check('D14 Watermark and Page Numbers: CONFIDENTIAL and "Page 1 of 3"', 'CONFIDENTIAL' in t1 and 'Page 1 of 3' in t1 and 'Page 3 of 3' in rd(data).pages[2].extract_text(), t1[-120:])
        load('pdf-sign', P3); wait_js(pg, "!!document.querySelector('#root .stage canvas')", 30000)
        pg.locator('#root canvas.pad').scroll_into_view_if_needed(); pg.wait_for_timeout(200)
        box = pg.locator('#root canvas.pad').bounding_box(); W2, H2 = box['width'], box['height']   # draw a zigzag across the pad, whatever its size
        pg.mouse.move(box['x'] + W2 * 0.1, box['y'] + H2 * 0.5); pg.mouse.down()
        for k in range(1, 12): pg.mouse.move(box['x'] + W2 * (0.1 + k * 0.07), box['y'] + H2 * (0.5 + (0.25 if k % 2 else -0.25)))
        pg.mouse.up(); pg.wait_for_timeout(200); pg.click('#root .layer', position={'x': 300, 'y': 500}); pg.wait_for_timeout(300)
        check('D15 Sign PDF: a drawn signature is placed on the page', pg.evaluate("document.querySelectorAll('#root .layer .item').length") == 1)
        data, name = run_save('Save the Signed PDF', 60000); res = rd(data).pages[0]['/Resources']
        check('D16 ...and saved into the PDF as an image', '/XObject' in res and len(res['/XObject']) >= 1, list(res.keys()))
        load('pdf-annotate', P3); wait_js(pg, "!!document.querySelector('#root .stage canvas')", 30000); pg.fill('#root input[aria-label="Text to add"]', 'Hello PDF')
        pg.click('#root .layer', position={'x': 200, 'y': 300}); pg.get_by_role('button', name='Tick', exact=True).click(); pg.click('#root .layer', position={'x': 200, 'y': 400})
        pg.get_by_role('button', name='Highlight', exact=True).click(); pg.click('#root .layer', position={'x': 400, 'y': 200}); pg.wait_for_timeout(200)
        check('D17 Fill and Annotate: text, a tick and a highlight are placed', pg.evaluate("document.querySelectorAll('#root .layer .item').length") == 3)
        data, name = run_save('Save the PDF', 60000); check('D18 ...and the text is in the saved PDF', 'Hello PDF' in rd(data).pages[0].extract_text(), name)
        shutil.rmtree(TMP, ignore_errors=True)

        # the app itself
        pg.goto(U + '#/'); wait_js(pg, "document.querySelectorAll('#root .tc').length > 0")
        pg.click('#root .tc:has(a[href="#/tool/json-formatter"]) .star'); pg.goto(U + '#/favourites'); wait_js(pg, "location.hash === '#/favourites'"); pg.wait_for_timeout(150)
        favs = pg.evaluate("[...document.querySelectorAll('#root .tcm')].map(a => a.getAttribute('href'))")
        check('N17 a star adds a favourite, and Favourites lists it', '#/tool/json-formatter' in favs and '#/tool/image-resize' in favs, favs)
        pg.goto(U + '#/recent'); pg.wait_for_timeout(150)
        rec = pg.evaluate("[...document.querySelectorAll('#root .tcm')].map(a => a.getAttribute('href'))")
        last = []
        for i in reversed(OPENED):
            if i not in last: last.append(i)
        check('N18 Recent lists the tools just used, newest first, and keeps at most 12', rec[:3] == ['#/tool/' + i for i in last[:3]] and len(rec) == 12, (rec[:4], last[:3], len(rec)))
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
            for u in ('#/', '#/tool/qr-generator', '#/tool/json-formatter', '#/tool/generators', '#/tool/image-converter', '#/tool/image-resize', '#/tool/img-adjust', '#/tool/img-watermark', '#/tool/collage', '#/tool/id-photo', '#/tool/image-crop', '#/tool/img-redact', '#/tool/meme', '#/tool/bg-remove', '#/tool/pdf-merge', '#/tool/pdf-split', '#/tool/pdf-protect', '#/tool/pdf-text', '#/tool/pdf-stamp', '#/tool/pdf-sign', '#/tool/pdf-annotate', '#/organise', '#/settings'):
                pg.goto(U + u); pg.wait_for_timeout(300); pg.evaluate("document.documentElement.setAttribute('data-theme', %r)" % scheme); pg.mouse.move(2, 2); pg.wait_for_timeout(100)
                pg.evaluate(AXE); v = pg.evaluate(RUN)
                if v: found.append(u + ': ' + '; '.join(v[:3]))
            check('N25 axe finds nothing on the home, three tools, Organise and Settings (%s)' % scheme, not found, found[:4])
        b.close()
finally:
    stop_all()
sys.exit(check.done())
