#!/usr/bin/env python3
"""The site on real Apache, where the .htaccess files apply (PHP's test server ignores them).
  sudo sh tests/server/apache_setup.sh build/site-update-X.Y.Z.zip
  python3 tests/server/apache_test.py [http://127.0.0.1:8300]
Checks: every page answers with its security policy and the page pre-loading header; private files and folders are refused;
the pre-loading rules file is served with its type; the app manifest and its icons are public; in a browser nothing is refused; no error and Tools loads
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

get('/web/hub/core/api.php?action=state')   # makes site-data, so its block can be checked
pages = ['/', '/web/links/', '/web/info/', '/web/cards/', '/web/tasks/', '/web/tools/', '/web/settings/']
bad = []
for p in pages:
    st, h, _ = get(p)
    if st != 200 or 'speculation-rules.json' not in (h.get('Speculation-Rules') or '') or "script-src 'self'" not in (h.get('Content-Security-Policy') or ''): bad.append((p, st, h.get('Speculation-Rules'), (h.get('Content-Security-Policy') or '')[:40]))
check('A1 every page answers 200 with its security policy and the pre-loading header', not bad, bad)
private = ['/site-data/', '/site-data/core/', '/web/hub/docs/CHANGELOG.md', '/web/hub/docs/README.txt', '/web/hub/docs/src/', '/web/hub/core/config.php', '/web/hub/core/manifest.json', '/web/core-data/docs/CHANGELOG.md', '/web/hub/core/lib/boot.php', '/web/links/lib.php', '/web/home/lib.php']
open_ = [(p, get(p)[0]) for p in private if get(p)[0] not in (403, 404)]
check('A2 private files and folders are refused', not open_, open_)
st, h, body = get('/web/hub/core/assets/speculation-rules.json')
check('A3 the pre-loading rules are served as application/speculationrules+json', st == 200 and (h.get('Content-Type') or '').startswith('application/speculationrules+json') and b'prerender' in body, (st, h.get('Content-Type')))
check('A4 other JSON files in hub/core stay refused', get('/web/hub/core/assets/nothing.json')[0] in (403, 404) and get('/web/hub/core/manifest.json')[0] == 403)
# 1.60: the QR scanner and the recorder: the camera, microphone and screen sharing are allowed on the Tools page only, and a recording can play
pp = {pg: (get(pg)[1].get('Permissions-Policy') or '') for pg in ('/web/tools/', '/web/links/', '/web/tools/assets/tools-list.json')}
st, h, _ = get('/web/tools/')
check('A8 Tools allows camera, microphone and screen sharing for itself (the browser still asks); other pages allow none',
      'camera=(self)' in pp['/web/tools/'] and 'microphone=(self)' in pp['/web/tools/'] and 'display-capture=(self)' in pp['/web/tools/'] and 'camera=()' in pp['/web/links/']
      and "media-src 'self' blob:" in (h.get('Content-Security-Policy') or ''), pp)
import json
st, h, body = get('/web/hub/core/api.php?action=manifest')
try: man = json.loads(body)
except Exception: man = {}
icons = [i['src'] for i in man.get('icons', [])] + ['/web/hub/core/assets/brand/apple-touch-icon.png']
shut = [(s, get(s)[0]) for s in icons if get(s)[0] != 200]
check('A7 the app manifest is public, served as application/manifest+json, and its icons and the iPhone icon load', st == 200 and (h.get('Content-Type') or '').startswith('application/manifest+json') and man.get('start_url') == '/web/home/' and not shut, (st, h.get('Content-Type'), shut))
with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox']); ctx = b.new_context(viewport={'width': 1280, 'height': 800})
    ctx.route('**/*', lambda r: r.continue_() if r.request.url.startswith(B) or r.request.url.startswith(('data:', 'blob:')) else r.abort())
    pg = ctx.new_page(); refused = []; main = set(); errs = []
    pg.on('console', lambda m: refused.append(m.text[:160]) if ('Refused' in m.text or 'Content Security Policy' in m.text or 'React error' in m.text) else None)
    pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
    pg.on('request', lambda r: main.add(r.url.replace(B, '')) if '/tools/assets/app-' in r.url and r.url.split('?')[0].endswith('.js') else None)
    for u in pages + ['/web/tools/#/tool/image-resize', '/web/tools/#/tool/qr-generator']:
        pg.goto(B + u); pg.wait_for_timeout(1300)
    check('A5 in a browser, no security-policy message, no React error and no page error on any page', not refused and not errs, (refused[:2], errs[:2]))
    check('A6 Tools loads its main file once', len(main) == 1, sorted(main))
    b.close()
# your pictures folder (apache_setup.sh puts a picture and a script in home/photos)
st, h, _ = get('/web/hub/media/home/photos/t.png')
check('A7b a picture in web/hub/media loads, with nosniff', st == 200 and (h.get('X-Content-Type-Options') or '') == 'nosniff', (st, h.get('X-Content-Type-Options')))
st, _, body = get('/web/hub/media/home/photos/t.php')
check('A7c a script put in web/hub/media is refused and never runs', st == 403 and b'ran' not in body, (st, body[:40]))
check('A7d the pictures folder lists nothing', get('/web/hub/media/')[0] in (403, 404) and get('/web/hub/media/home/photos/')[0] in (403, 404) and get('/web/hub/')[0] in (403, 404))
print('\n%d/%d passed' % (sum(res), len(res)))
sys.exit(0 if all(res) else 1)
