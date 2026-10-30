#!/usr/bin/env python3
"""Accessibility check with axe-core (WCAG 2.1 A and AA rules) on every app page, in dark and light mode, and the bar in all three styles.
  npm i --no-save axe-core
  python3 tests/browser/a11y_test.py build/site-update-X.Y.Z.zip
Needs PHP 8.3+ and Playwright with Chromium (or --browser firefox|webkit). Nothing leaves this computer."""
import http.cookiejar, http.server, json, os, re, shutil, socketserver, subprocess, sys, tempfile, threading, time, urllib.request, zipfile
from functools import partial
from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import ROOT, FIX, SEED
from helpers import browser_name, launch, CSP_REPORTER, TRACK_REQUESTS, WATCH_DOM, settle, until
BROWSER = browser_name()
if len(sys.argv) < 2: sys.exit(__doc__)
AXE_PATH, d = None, ROOT   # npm puts it in the nearest node_modules: the repo's, or a parent folder's
while d and not AXE_PATH:
    c = os.path.join(d, 'node_modules', 'axe-core', 'axe.min.js'); AXE_PATH = c if os.path.isfile(c) else None
    d = None if os.path.dirname(d) == d else os.path.dirname(d)
if not AXE_PATH: sys.exit('axe-core is missing: run  npm i --no-save axe-core')
AXE = open(AXE_PATH, encoding='utf-8').read()
ZIP = sys.argv[1]
PORT = 8197; B = 'http://127.0.0.1:%d' % PORT; UA = 'A11yTest/1.0'
D = tempfile.mkdtemp(); zipfile.ZipFile(ZIP).extractall(D)
php = subprocess.Popen(['php', '-S', '127.0.0.1:%d' % PORT, '-t', D], env=dict(os.environ, PHP_CLI_SERVER_WORKERS='6'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
res = []
def check(name, viol):
    res.append(not viol)
    print(('PASS ' if not viol else 'FAIL ') + name + ('' if not viol else '  -> ' + '; '.join('%s x%d (%s)' % (v['id'], v['n'], v['ex']) for v in viol)[:400]))
RUN = "async()=>{const r=await axe.run(document,{resultTypes:['violations'],runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return r.violations.map(v=>({id:v.id,n:v.nodes.length,ex:v.nodes[0].target.join(' ')}))}"
def scan(pg):
    # Colours are measured once the page is still: no change for 400 ms and no fade running. settle() alone could let a page
    # that draws a second time (Settings' Overview, with its fade-in) be measured mid-fade, a contrast failure that is not real.
    pg.evaluate(WATCH_DOM)
    until(lambda: pg.evaluate("performance.now() - window.__lastMut > 400 && document.getAnimations().every(a => a.playState !== 'running' || !isFinite(a.effect.getTiming().iterations))"), 8000, 100)
    pg.add_script_tag(content=AXE); return pg.evaluate(RUN)
try:
    cj = http.cookiejar.CookieJar(); op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    def call(a, b=None):
        rq = urllib.request.Request(B + '/web/hub/core/api.php?action=' + a, data=json.dumps(b).encode() if b is not None else None, headers={'User-Agent': UA, 'Content-Type': 'application/json'}, method='POST' if b is not None else 'GET')
        return json.loads(op.open(rq).read())
    call('state')
    code = re.search(r'([A-Z0-9]{4}(?:-[A-Z0-9]{4})+|[A-Z0-9]{8,})', open(D + '/site-data/core/SETUP-CODE.php').read().replace('<?php', '')).group(1)
    call('setup', {'code': code, 'password': 'correct horse battery staple'})
    subprocess.run(['php', SEED, D], capture_output=True)
    ver = re.search(r"define\('HUB', '([^']+)'\)", open(D + '/web/hub/core/lib/boot.php').read()).group(1)
    pages = [('Home', '/'), ('Links', '/web/links/'), ('Info', '/web/info/'), ('Cards', '/web/cards/'), ('Tasks', '/web/tasks/'), ('Tools', '/web/tools/'),
             ('Tools: a tool', '/web/tools/#/tool/image-resize'), ('Settings', '/web/settings/#overview'), ('Settings: General (Install on Your Phone)', '/web/settings/#general'), ('Settings: Security', '/web/settings/#security'), ('Settings: Updates', '/web/settings/#updates'),
             ('Files', '/web/files/'), ('Settings: Appearance, Colors', '/web/settings/#colors'), ('Settings: Backup (Back Up)', '/web/settings/#backup'), ('Settings: Backup, Restore', '/web/settings/#backup/restore'),
             ('Settings: Backup, Export', '/web/settings/#backup/export'), ('Settings: Security, Passkeys', '/web/settings/#security/passkeys')]
    with sync_playwright() as p:
        b = launch(p, BROWSER); print('browser: %s %s' % (BROWSER, b.version))
        for theme in ('dark', 'light'):
            ctx = b.new_context(bypass_csp=True, user_agent=UA, viewport={'width': 1280, 'height': 860})
            ctx.add_cookies([{'name': c.name, 'value': c.value, 'url': B + '/'} for c in cj])
            ctx.add_init_script("try{localStorage.setItem('ix-seen-ver','%s');localStorage.setItem('hub-theme','%s')}catch(e){}" % (ver, theme))
            ctx.add_init_script(TRACK_REQUESTS)
            ctx.route('**/*', lambda r: r.continue_() if r.request.url.startswith(B) or r.request.url.startswith(('data:', 'blob:')) else r.abort())
            pg = ctx.new_page()
            for name, url in pages:
                pg.goto(B + url); settle(pg); check('%s (%s)' % (name, theme), scan(pg))
            # Links > Import Bookmarks, open with a preview
            pg.goto(B + '/web/links/'); settle(pg)
            pg.evaluate("document.querySelector('#importBmBtn').click()"); pg.wait_for_selector('#impDlg[open]', timeout=10000)
            pg.set_input_files('#impFile', os.path.join(FIX, 'bookmarks', 'chrome.html')); until(lambda: pg.evaluate("document.querySelector('#impPrev').textContent.length > 0"), 10000); settle(pg)
            check('Links: Import Bookmarks dialog (%s)' % theme, scan(pg))
            # (1.61.0) the Settings windows of every page, the Files Settings window, and the keyboard shortcuts
            for name, url, js, sel in [('Links Settings window', '/web/links/', "document.getElementById('settingsBtn').click()", '#setDlg[open]'),
                                       ('Info Settings window', '/web/info/', "document.querySelector('[data-e=settings]').click()", '#setdlg[open]'),
                                       ('Cards Settings window', '/web/cards/', "document.getElementById('tdlg').showModal()", '#tdlg[open]'),
                                       ('Tasks Settings window (with the calendar link)', '/web/tasks/', "document.getElementById('sdlg').showModal()", '#sdlg[open]'),
                                       ('Files Settings window', '/web/files/', "document.getElementById('psets').click()", '#dlg[open]'),
                                       ('Keyboard shortcuts', '/web/links/', "window.dispatchEvent(new Event('focus')); document.body.focus(); 0", None)]:
                pg.goto(B + url); settle(pg)
                if sel: pg.evaluate(js); pg.wait_for_selector(sel, timeout=10000)
                else: pg.keyboard.press('?'); pg.wait_for_selector('#ix-dlg.open', timeout=10000)
                settle(pg); check('%s (%s)' % (name, theme), scan(pg))
            # the bar in each style, on a computer and on a phone, with the phone panel (Sidebar) and sheet (Bottom Dock) open
            for nav in ('side', 'dock', 'top'):
                pg.evaluate("window.__ixShell.api('settings', {settings: {nav: '%s'}})" % nav)   # evaluate waits for the save to answer
                for size, vp in (('computer', {'width': 1280, 'height': 860}), ('phone', {'width': 390, 'height': 844})):
                    pg.set_viewport_size(vp); pg.goto(B + '/web/links/'); settle(pg)
                    check('Bar: %s, %s (%s)' % (nav, size, theme), scan(pg))
                    if size == 'phone' and nav != 'top':
                        pg.click('#ix-bar .ix-fab'); settle(pg)
                        check('Bar: %s, phone, %s open (%s)' % (nav, 'panel' if nav == 'side' else 'sheet', theme), scan(pg))
                pg.set_viewport_size({'width': 1280, 'height': 860})
            ctx.close()
        # the website is checked, with axe, in dark and light on every page, by tests/browser/website_test.py
        b.close()
finally:
    php.terminate(); shutil.rmtree(D, ignore_errors=True)
print('\n%d/%d passed' % (sum(res), len(res)))
sys.exit(0 if all(res) else 1)
