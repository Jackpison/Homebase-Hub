#!/usr/bin/env python3
"""Tools in a real browser: every tool opens without an error, and the main PDF and image tools turn real files into real downloads.
  python3 tests/tools_test.py build/site-update-X.Y.Z.zip
Needs PHP 8.3+ and Playwright with Chromium (or --browser firefox|webkit) (pip install playwright; python3 -m playwright install chromium).
Nothing leaves this computer: every request to another site is blocked."""
import io, os, re, shutil, subprocess, sys, tempfile, time, zipfile
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from helpers import browser_name, launch, CSP_REPORTER
BROWSER = browser_name()
if len(sys.argv) < 2: sys.exit(__doc__)
ZIP = sys.argv[1]; PORT = 8190; B = 'http://127.0.0.1:%d' % PORT
D = tempfile.mkdtemp(); zipfile.ZipFile(ZIP).extractall(D)
php = subprocess.Popen(['php', '-S', '127.0.0.1:%d' % PORT, '-t', D], env=dict(os.environ, PHP_CLI_SERVER_WORKERS='6'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
res = []
def check(name, ok, extra=''):
    res.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok or not extra else '  -> ' + str(extra)[:1500]))

# the tool list comes from the Tools code itself, so a new tool is covered without editing this file
bundle = zipfile.ZipFile(ZIP).read('web/tools/assets/index-ToolsAll.js').decode('utf-8', 'replace')
ids = [i for i in dict.fromkeys(re.findall(r'id:"([a-z0-9-]+)",name:"', bundle)) if i not in ('images', 'photos', 'pdf', 'utilities')]
F = lambda n: os.path.join(HERE, n)

def act(pg, label, download=True, timeout=60000):
    """Click a button; return the file it downloads (directly, or through a Download button that appears)."""
    btn = pg.locator('main button', has_text=re.compile('^' + re.escape(label))).first
    if not download: btn.click(); return None
    try:
        with pg.expect_download(timeout=8000) as dl: btn.click()
        return dl.value
    except Exception:
        pass
    pg.wait_for_timeout(1500)
    d = pg.locator('main button, main a', has_text=re.compile(r'Download|Save')).first
    with pg.expect_download(timeout=timeout) as dl: d.click()
    return dl.value

def body(dl):
    p = dl.path(); return open(p, 'rb').read()

try:
    with sync_playwright() as p:
        b = launch(p, BROWSER); print('browser: %s %s' % (BROWSER, b.version))
        ctx = b.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True)
        ctx.route('**/*', lambda r: r.continue_() if r.request.url.startswith(B) or r.request.url.startswith(('data:', 'blob:')) else r.abort())
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        cons = []   # console errors and warnings, shown when a check fails (helps find engine differences in CI)
        pg.on('console', lambda m: cons.append(m.type + ': ' + m.text[:200]) if m.type in ('error', 'warning') else None)

        # 1. every tool opens
        broken = []
        for tid in ids:
            errs.clear(); pg.goto(B + '/web/tools/#/tool/' + tid); pg.wait_for_timeout(900)
            h = pg.locator('main h1').first.inner_text(timeout=5000) if pg.locator('main h1').count() else ''
            if errs or not h.strip(): broken.append((tid, h, errs[:1]))
        check('T1 all %d tools open with a title and no page error' % len(ids), len(ids) >= 30 and not broken, broken)

        def tool(tid, files):
            errs.clear(); pg.goto(B + '/web/tools/#/tool/' + tid); pg.wait_for_timeout(1000)
            pg.locator('input[type=file]').first.set_input_files(files); pg.wait_for_timeout(1500)

        # 2. PDF tools (these use pdf.js and pdf-lib)
        tool('pdf-to-images', [F('fixture-3pages.pdf')]); d = act(pg, 'Convert'); data = body(d)
        check('T2 PDF to Images turns a 3-page PDF into images', data[:4] == b'PK\x03\x04' and len(zipfile.ZipFile(io.BytesIO(data)).namelist()) == 3 or data[:8] == b'\x89PNG\r\n\x1a\n' or data[:3] == b'\xff\xd8\xff', (d.suggested_filename, data[:8], errs))
        tool('pdf-compress', [F('fixture-3pages.pdf')]); d = act(pg, 'Compress'); data = body(d)
        check('T3 PDF Compressor makes a PDF', data[:5] == b'%PDF-' and not errs, (d.suggested_filename, data[:8], errs))
        tool('pdf-merge', [F('fixture-3pages.pdf'), F('fixture-2pages.pdf')]); d = act(pg, 'Merge PDFs'); data = body(d)
        try:
            import pypdf; pages = len(pypdf.PdfReader(io.BytesIO(data)).pages)
        except ImportError:
            pages = 5 if data[:5] == b'%PDF-' else 0; print('  (pypdf is not installed, so the page count was not checked)')
        check('T4 Merge PDF joins 3 + 2 pages into one 5-page PDF', data[:5] == b'%PDF-' and pages == 5, (pages, errs))
        tool('pdf-text', [F('fixture-3pages.pdf')]); act(pg, 'Text Layer Only', download=False); act(pg, 'Get the Text', download=False)
        for _ in range(40):   # up to 20 s: the text appears when the reader is done (slower in some engines)
            if 'quick brown fox' in ' '.join(pg.locator('main textarea').nth(i).input_value() for i in range(pg.locator('main textarea').count())) + pg.locator('main').inner_text(): break
            pg.wait_for_timeout(500)
        txt = ' '.join(pg.locator('main textarea').nth(i).input_value() for i in range(pg.locator('main textarea').count())) + pg.locator('main').inner_text()
        check('T5 PDF to Text reads the text layer', 'quick brown fox' in txt and not errs, (txt[-200:], errs, cons[-6:]))

        # PDF tools that show page previews (pdf.js) after a PDF is chosen
        bad = []
        for tid in ('pdf-organize', 'pdf-split', 'pdf-sign', 'pdf-annotate', 'pdf-stamp', 'pdf-protect'):
            tool(tid, [F('fixture-3pages.pdf')]); pg.wait_for_timeout(2500)
            shown = pg.evaluate("[...document.querySelectorAll('main canvas, main img')].filter(e => (e.tagName === 'CANVAS' ? e.width : e.naturalWidth) > 20).length")
            txt = pg.locator('main').inner_text()
            if errs or re.search(r'went wrong|not a valid PDF|damaged', txt): bad.append((tid, shown, errs[:1], re.findall(r'[^\n]*went wrong[^\n]*', txt)[:1]))
            elif tid in ('pdf-organize', 'pdf-split', 'pdf-sign', 'pdf-annotate') and shown == 0: bad.append((tid, 'no page preview'))
        check('T9 the PDF tools with page previews read the PDF and show its pages', not bad, bad)

        # 3. image tools
        tool('image-resize', [F('fixture-image.png')]); d = act(pg, 'Resize'); data = body(d)
        check('T6 Image Resizer makes an image', data[:8] == b'\x89PNG\r\n\x1a\n' or data[:3] == b'\xff\xd8\xff' or data[:4] == b'RIFF' or data[:2] == b'PK', (d.suggested_filename, data[:8], errs))
        tool('image-converter', [F('fixture-image.png')]); act(pg, 'JPG', download=False); d = act(pg, 'Convert to JPG'); data = body(d)
        check('T7 Image Converter makes a JPG', data[:3] == b'\xff\xd8\xff', (d.suggested_filename, data[:8], errs))

        # 4. a tool with no file
        errs.clear(); pg.goto(B + '/web/tools/#/tool/qr-generator'); pg.wait_for_timeout(1000)
        pg.locator('main textarea, main input[type=text], main input[type=url]').first.fill('https://example.com')
        pg.wait_for_timeout(600); d = act(pg, 'Download PNG'); data = body(d)
        check('T8 QR Code Generator downloads a PNG', data[:8] == b'\x89PNG\r\n\x1a\n' and not errs, (data[:8], errs))
        b.close()
finally:
    php.terminate(); shutil.rmtree(D, ignore_errors=True)
print('\n%d/%d passed' % (sum(res), len(res)))
sys.exit(0 if all(res) else 1)
