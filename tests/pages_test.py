#!/usr/bin/env python3
"""Every page and every Settings section in a real browser, with demo data: no page error, no broken request, and the Cards Excel export opens.
  python3 tests/pages_test.py build/site-update-X.Y.Z.zip
Needs PHP 8.3+ and Playwright with Chromium; openpyxl is used to read the Excel file when it is installed.
Nothing leaves this computer: every request to another site is blocked."""
import io, json, os, re, shutil, subprocess, sys, tempfile, time, urllib.request, http.cookiejar, zipfile
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
if len(sys.argv) < 2: sys.exit(__doc__)
ZIP = sys.argv[1]; PORT = 8195; B = 'http://127.0.0.1:%d' % PORT; UA = 'PagesTest/1.0'; PW = 'correct horse battery staple'
D = tempfile.mkdtemp(); zipfile.ZipFile(ZIP).extractall(D)
php = subprocess.Popen(['php', '-S', '127.0.0.1:%d' % PORT, '-t', D], env=dict(os.environ, PHP_CLI_SERVER_WORKERS='6'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
res = []
def check(name, ok, extra=''):
    res.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok or not extra else '  -> ' + str(extra)[:300]))

cj = http.cookiejar.CookieJar(); op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
def call(a, b=None):
    rq = urllib.request.Request(B + '/web/core-data/api.php?action=' + a, data=json.dumps(b).encode() if b is not None else None, headers={'User-Agent': UA, 'Content-Type': 'application/json'}, method='POST' if b is not None else 'GET')
    return json.loads(op.open(rq).read())
try:
    call('state')
    code = re.search(r'([A-Z0-9]{4}(?:-[A-Z0-9]{4})+|[A-Z0-9]{8,})', open(D + '/site-data/core/SETUP-CODE.php').read().replace('<?php', '')).group(1)
    check('P1 a new site can be set up', call('setup', {'code': code, 'password': PW}).get('ok'))
    subprocess.run(['php', os.path.join(HERE, 'seed_demo.php'), D], capture_output=True)
    ver = re.search(r"define\('HUB', '([^']+)'\)", open(D + '/web/core-data/lib/boot.php').read()).group(1)
    cookies = [{'name': c.name, 'value': c.value, 'domain': '127.0.0.1', 'path': '/'} for c in cj]
    panes = re.findall(r"\['([a-z]+)', '[A-Z][^']*', ICON", open(D + '/web/docs/src/core-data/shell-admin.src.js', encoding='utf-8').read())
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--no-sandbox'])
        ctx = b.new_context(user_agent=UA, accept_downloads=True, viewport={'width': 1280, 'height': 860}); ctx.add_cookies(cookies)
        ctx.add_init_script("try{localStorage.setItem('ix-seen-ver','%s')}catch(e){}" % ver)
        # PHP's test server ignores .htaccess, so each page gets the security policy Apache would send, read from its own .htaccess
        CSP = {}
        for app in ('links', 'info', 'cards', 'tasks', 'tools', 'settings'):
            m = re.search(r'Header (?:always )?set Content-Security-Policy "([^"]+)"', open(D + '/web/%s/.htaccess' % app).read()) if os.path.isfile(D + '/web/%s/.htaccess' % app) else None
            if m: CSP['/web/%s/' % app] = m.group(1)
        def handle(r):
            u = r.request.url
            if not (u.startswith(B) or u.startswith(('data:', 'blob:'))): return r.abort()
            path = u[len(B):].split('#')[0].split('?')[0]
            if r.request.resource_type == 'document' and path in CSP:
                resp = r.fetch(); h = dict(resp.headers); h['content-security-policy'] = CSP[path]; return r.fulfill(response=resp, headers=h)
            r.continue_()
        ctx.route('**/*', handle)
        pg = ctx.new_page(); errs = []; bad = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        refused = []; tools_main = set()
        pg.on('console', lambda m: refused.append(m.text[:160]) if m.type in ('error', 'warning') and ('Content Security Policy' in m.text or 'Refused to' in m.text or 'React error' in m.text) else None)
        pg.on('request', lambda r: tools_main.add(r.url.replace(B, '')) if 'index-ToolsAll.js' in r.url else None)
        pg.on('response', lambda r: bad.append((r.status, r.url.replace(B, ''))) if r.url.startswith(B) and r.status >= 400 else None)
        problems = []
        for name, url in [('Home', '/'), ('Links', '/web/links/'), ('Info', '/web/info/'), ('Cards', '/web/cards/'), ('Tasks', '/web/tasks/'), ('Tools', '/web/tools/'), ('Tools: a tool', '/web/tools/#/tool/image-resize')] + [('Settings ' + s, '/web/settings/#' + s) for s in panes]:
            errs.clear(); bad.clear()
            pg.goto(B + url, wait_until='domcontentloaded'); pg.wait_for_timeout(1100)
            if errs or bad: problems.append((name, errs[:1], bad[:2]))
        check('P2 every page and all %d Settings sections load with no page error and no broken request' % len(panes), len(panes) >= 8 and not problems, problems)
        check('P4 with the real security policies, nothing is refused and React reports no error', len(CSP) >= 5 and not refused, (len(CSP), refused[:3]))
        check('P5 Tools loads its main file once (one copy of React)', len(tools_main) == 1, sorted(tools_main))
        pg.goto(B + '/web/cards/'); pg.wait_for_timeout(1500)
        with pg.expect_download(timeout=10000) as dl: pg.evaluate("document.querySelector('[data-a=xlsx]').click()")
        data = open(dl.value.path(), 'rb').read()
        try:
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(data)); ws = wb['Cards']; hdr = [c.value for c in ws[1]]
            ok = 'Limit' in hdr and isinstance(ws.cell(2, hdr.index('Limit') + 1).value, (int, float)) and '₹' in ws.cell(2, hdr.index('Limit') + 1).number_format
            detail = (wb.sheetnames, hdr[:5])
        except ImportError:
            z = zipfile.ZipFile(io.BytesIO(data)); ok = 'xl/worksheets/sheet1.xml' in z.namelist(); detail = z.namelist()
        check('P3 Cards exports a real Excel file with numbers and the money format', data[:2] == b'PK' and ok, detail)
        b.close()
finally:
    php.terminate(); shutil.rmtree(D, ignore_errors=True)
print('\n%d/%d passed' % (sum(res), len(res)))
sys.exit(0 if all(res) else 1)
