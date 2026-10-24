#!/usr/bin/env python3
"""Every page and every Settings section in a real browser, with demo data: no page error, no broken request, and the Cards Excel export opens.
  python3 tests/pages_test.py build/site-update-X.Y.Z.zip
Needs PHP 8.3+ and Playwright with Chromium (or --browser firefox|webkit); openpyxl is used to read the Excel file when it is installed.
Nothing leaves this computer: every request to another site is blocked."""
import io, json, os, re, shutil, subprocess, sys, tempfile, time, urllib.request, http.cookiejar, zipfile
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from helpers import browser_name, launch, browser_login, CSP_REPORTER
BROWSER = browser_name()
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
    cookies = [{'name': c.name, 'value': c.value, 'url': B + '/'} for c in cj]
    panes = re.findall(r"\['([a-z]+)', '[A-Z][^']*', ICON", open(D + '/web/docs/src/core-data/shell-admin.src.js', encoding='utf-8').read())
    with sync_playwright() as p:
        b = launch(p, BROWSER); print('browser: %s %s' % (BROWSER, b.version))
        ctx = b.new_context(user_agent=UA, accept_downloads=True, viewport={'width': 1280, 'height': 860})
        ctx.add_init_script("try{localStorage.setItem('ix-seen-ver','%s')}catch(e){}" % ver)
        ctx.add_init_script(CSP_REPORTER)
        # PHP's test server ignores .htaccess, so each page gets the security policy Apache would send, read from its own .htaccess
        CSP = {}
        for app in ('links', 'info', 'cards', 'tasks', 'tools', 'settings'):
            m = re.search(r'Header (?:always )?set Content-Security-Policy "([^"]+)"', open(D + '/web/%s/.htaccess' % app).read()) if os.path.isfile(D + '/web/%s/.htaccess' % app) else None
            if m: CSP['/web/%s/' % app] = m.group(1)
        def handle(r):
            u = r.request.url
            if not (u.startswith(B) or u.startswith(('data:', 'blob:'))): return r.abort()
            path = u[len(B):].split('#')[0].split('?')[0]
            # WebKit fails the requests of a page that Playwright fetched and handed over (seen in CI: P6 failed, P7 passed),
            # so there each page keeps only its own <meta> policy; Chromium, Firefox and the Apache job check the headers.
            if BROWSER != 'webkit' and r.request.resource_type == 'document' and path in CSP:
                resp = r.fetch(); h = dict(resp.headers); h['content-security-policy'] = CSP[path]; return r.fulfill(response=resp, headers=h)
            r.continue_()
        ctx.route('**/*', handle)
        pg = ctx.new_page(); errs = []; bad = []
        why = browser_login(pg, B, PW)
        check('P0 the browser logs in through the login dialog', why == '', why)
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        refused = []; tools_main = set()
        pg.on('console', lambda m: refused.append(m.text[:160]) if m.type in ('error', 'warning') and ('Content Security Policy' in m.text or 'Content-Security-Policy' in m.text or 'Refused to' in m.text or 'React error' in m.text) else None)
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
        admin = pg.evaluate("!!(window.HUB && HUB.isAdmin && HUB.isAdmin())")
        diag = '' if admin else (
            [(c['name'], c['domain'], c['path'], c.get('sameSite'), c.get('secure'), c.get('expires')) for c in ctx.cookies()],
            pg.evaluate("fetch('../core-data/api.php?action=state', {credentials: 'same-origin'}).then(r => r.json()).then(j => ({admin: j.admin}), e => String(e))"))
        check('P6 the browser is logged in (the login cookie was accepted)', admin, diag)
        # P7: the same, in a context without the test's request routing (the routing hands each page to the browser with its
        # security policy added). If P7 passes where P6 fails, the difference is in the routing, not in the site.
        c7 = b.new_context(user_agent=UA, viewport={'width': 1280, 'height': 860}); p7 = c7.new_page()
        why7 = browser_login(p7, B, PW); p7.goto(B + '/web/cards/'); p7.wait_for_timeout(1500)
        check('P7 logged in on a second page without the test routing', p7.evaluate("!!(window.HUB && HUB.isAdmin && HUB.isAdmin())"), why7)
        c7.close()
        data = b''
        try:
            with pg.expect_download(timeout=20000) as dl: pg.evaluate("document.querySelector('[data-a=xlsx]').click()")
            data = open(dl.value.path(), 'rb').read()
        except Exception as e:
            check('P3 Cards exports a file (no download came)', False, str(e)[:120])
        try:
            import openpyxl
            if not data: raise ValueError('no file')
            wb = openpyxl.load_workbook(io.BytesIO(data)); ws = wb['Cards']; hdr = [c.value for c in ws[1]]
            ok = 'Limit' in hdr and isinstance(ws.cell(2, hdr.index('Limit') + 1).value, (int, float)) and '₹' in ws.cell(2, hdr.index('Limit') + 1).number_format
            detail = (wb.sheetnames, hdr[:5])
        except ValueError:
            ok = False; detail = 'no file'
        except ImportError:
            z = zipfile.ZipFile(io.BytesIO(data)); ok = 'xl/worksheets/sheet1.xml' in z.namelist(); detail = z.namelist()
        check('P3 Cards exports a real Excel file with numbers and the money format', data[:2] == b'PK' and ok, detail)
        b.close()
finally:
    php.terminate(); shutil.rmtree(D, ignore_errors=True)
print('\n%d/%d passed' % (sum(res), len(res)))
sys.exit(0 if all(res) else 1)
