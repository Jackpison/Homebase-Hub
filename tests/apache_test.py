#!/usr/bin/env python3
"""The site on real Apache, where the .htaccess files apply (PHP's test server ignores them).
  sudo sh tests/apache_setup.sh build/site-update-X.Y.Z.zip
  python3 tests/apache_test.py [http://127.0.0.1:8300]
Checks: every page answers with its security policy and the page pre-loading header; private files and folders are refused;
the pre-loading rules file is served with its type; the app manifest and its icons are public; in a browser nothing is refused, React reports no error and Tools loads
its main file once."""
import sys, urllib.request, urllib.error
from playwright.sync_api import sync_playwright
B = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8300').rstrip('/')
res = []
def check(name, ok, extra=''):
    res.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok or not extra else '  -> ' + str(extra)[:300]))
def get(path):
    try:
        r = urllib.request.urlopen(urllib.request.Request(B + path, headers={'User-Agent': 'ApacheTest/1.0'}), timeout=20); return r.status, r.headers, r.read()
    except urllib.error.HTTPError as e: return e.code, e.headers, e.read()

get('/web/core-data/api.php?action=state')   # makes site-data, so its block can be checked
pages = ['/', '/web/links/', '/web/info/', '/web/cards/', '/web/tasks/', '/web/tools/', '/web/settings/']
bad = []
for p in pages:
    st, h, _ = get(p)
    if st != 200 or 'speculation-rules.json' not in (h.get('Speculation-Rules') or '') or "script-src 'self'" not in (h.get('Content-Security-Policy') or ''): bad.append((p, st, h.get('Speculation-Rules'), (h.get('Content-Security-Policy') or '')[:40]))
check('A1 every page answers 200 with its security policy and the pre-loading header', not bad, bad)
private = ['/site-data/', '/site-data/core/', '/web/docs/CHANGELOG.md', '/web/docs/README.txt', '/web/docs/src/', '/web/core-data/config.php', '/web/core-data/manifest.json', '/web/core-data/docs/CHANGELOG.md', '/web/core-data/lib/boot.php']
open_ = [(p, get(p)[0]) for p in private if get(p)[0] not in (403, 404)]
check('A2 private files and folders are refused', not open_, open_)
st, h, body = get('/web/core-data/assets/speculation-rules.json')
check('A3 the pre-loading rules are served as application/speculationrules+json', st == 200 and (h.get('Content-Type') or '').startswith('application/speculationrules+json') and b'prerender' in body, (st, h.get('Content-Type')))
check('A4 other JSON files in core-data stay refused', get('/web/core-data/assets/nothing.json')[0] in (403, 404) and get('/web/core-data/manifest.json')[0] == 403)
import json
st, h, body = get('/web/core-data/api.php?action=manifest')
try: man = json.loads(body)
except Exception: man = {}
icons = [i['src'] for i in man.get('icons', [])] + ['/web/core-data/assets/brand/apple-touch-icon.png']
shut = [(s, get(s)[0]) for s in icons if get(s)[0] != 200]
check('A7 the app manifest is public, served as application/manifest+json, and its icons and the iPhone icon load', st == 200 and (h.get('Content-Type') or '').startswith('application/manifest+json') and man.get('start_url') == '/web/home/' and not shut, (st, h.get('Content-Type'), shut))
with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox']); ctx = b.new_context(viewport={'width': 1280, 'height': 800})
    ctx.route('**/*', lambda r: r.continue_() if r.request.url.startswith(B) or r.request.url.startswith(('data:', 'blob:')) else r.abort())
    pg = ctx.new_page(); refused = []; main = set(); errs = []
    pg.on('console', lambda m: refused.append(m.text[:160]) if ('Refused' in m.text or 'Content Security Policy' in m.text or 'React error' in m.text) else None)
    pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
    pg.on('request', lambda r: main.add(r.url.replace(B, '')) if 'index-ToolsAll.js' in r.url else None)
    for u in pages + ['/web/tools/#/tool/image-resize', '/web/tools/#/tool/qr-generator']:
        pg.goto(B + u); pg.wait_for_timeout(1300)
    check('A5 in a browser, no security-policy message, no React error and no page error on any page', not refused and not errs, (refused[:2], errs[:2]))
    check('A6 Tools loads its main file once (one copy of React)', len(main) == 1, sorted(main))
    b.close()
print('\n%d/%d passed' % (sum(res), len(res)))
sys.exit(0 if all(res) else 1)
