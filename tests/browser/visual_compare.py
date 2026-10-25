#!/usr/bin/env python3
"""What changed on screen since the last release: the same pages, with the same demo data, photographed from two zips on the
same computer, then compared picture by picture. A report, not a pass/fail test: it writes before/after/difference pictures and a
table (how much of each page changed), and fails only when a page cannot be shown at all.
  python3 tests/browser/visual_compare.py build/site-update-X.Y.Z.zip previous-release.zip OUTDIR
CI uploads OUTDIR as an artifact and puts the table in the job summary. Needs PHP, Playwright with Chromium and Pillow."""
import json, os, sys, datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import UA, SEED, Site, stop_all, launch, zip_version
import subprocess
from PIL import Image, ImageChops, ImageOps
from playwright.sync_api import sync_playwright

if len(sys.argv) < 4: sys.exit(__doc__)
NEW, OLD, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)
# (name, address, width, height): the pages people look at most, on a computer and on a phone
VIEWS = [('home', '/', 1280, 800), ('links', '/web/links/', 1280, 800), ('info', '/web/info/', 1280, 800), ('cards', '/web/cards/', 1280, 800),
         ('tasks', '/web/tasks/', 1280, 800), ('tools', '/web/tools/', 1280, 800), ('settings', '/web/settings/#overview', 1280, 800),
         ('settings-look', '/web/settings/#look', 1280, 800), ('cards-phone', '/web/cards/', 390, 844), ('links-phone', '/web/links/', 390, 844)]
# the same moment on every page: no animations, no caret, and Home's welcome text already seen
STILL = "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}"

def seed(s):
    today = datetime.date.today(); d = lambda n: (today + datetime.timedelta(days=n)).isoformat()
    hdr = {'Content-Type': 'application/json', 'X-Hub-CSRF': s.csrf}
    links = {'tabs': [{'id': 'main', 'title': 'Bookmarks', 'categories': [
        {'title': 'Reading', 'links': [{'title': 'Wikipedia', 'url': 'https://www.wikipedia.org'}, {'title': 'The Guardian', 'url': 'https://www.theguardian.com'}]},
        {'title': 'Work', 'links': [{'title': 'GitHub', 'url': 'https://github.com'}, {'title': 'Stack Overflow', 'url': 'https://stackoverflow.com'}]},
        {'title': 'Home Network', 'links': [{'title': 'Router', 'url': 'http://192.168.1.1'}]}]}]}
    s.req(s.base + '/web/links/api.php?action=save', json.dumps({'data': links}).encode(), 'POST', dict(hdr, **{'X-Requested-With': 'bookmarks'}))
    tasks = [{'name': 'Pay hosting', 'due': d(3), 'repeat': {'n': 1, 'unit': 'month'}, 'price': 499, 'cur': 'INR', 'cat': 'Website'},
             {'name': 'Back up photos', 'due': d(0), 'repeat': {'n': 1, 'unit': 'week'}, 'cat': 'Home'},
             {'name': 'Library books due', 'due': d(-2), 'repeat': {'n': 0, 'unit': 'none'}, 'cat': 'Errands'},
             {'name': 'Car insurance', 'due': d(55), 'repeat': {'n': 1, 'unit': 'year'}, 'price': 18500, 'cur': 'INR', 'cat': 'Car'}]
    s.req(s.base + '/web/tasks/api.php', json.dumps({'action': 'save', 'tasks': tasks, 'rev': 0}).encode(), 'POST', hdr)
    subprocess.run(['php', SEED, s.dir], capture_output=True)

def shoot(zp, port, tag, p):
    s = Site(zp, port); seed(s)
    cookies = [{'name': c.name, 'value': c.value, 'url': s.host + '/'} for c in s.cj]
    b = launch(p, 'chromium'); errors = {}
    ver = zip_version(zp)
    for name, url, w, h in VIEWS:
        c = b.new_context(user_agent=UA, viewport={'width': w, 'height': h}, reduced_motion='reduce', color_scheme='dark')   # the login belongs to this browser name
        c.add_cookies(cookies)
        c.add_init_script("try{localStorage.setItem('ix-seen-ver','%s');sessionStorage.setItem('hl-welcomed','1')}catch(e){}" % ver)
        c.route('**/*', lambda r: r.continue_() if r.request.url.startswith(s.host) or r.request.url.startswith(('data:', 'blob:')) else r.abort())
        pg = c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
        try:
            pg.goto(s.host + url, wait_until='domcontentloaded'); pg.add_style_tag(content=STILL); pg.wait_for_timeout(1800)
            if not pg.evaluate("!!(window.HUB && HUB.isAdmin && HUB.isAdmin())"): errs.append('not logged in (the picture would show the login screen)')
            pg.screenshot(path=os.path.join(OUT, '%s-%s.png' % (name, tag)))
        except Exception as e: errs.append(str(e)[:160])
        if errs: errors[name] = errs
        c.close()
    b.close(); s.stop()
    return ver, errors

def compare(name):
    a, b = Image.open(os.path.join(OUT, name + '-before.png')).convert('RGB'), Image.open(os.path.join(OUT, name + '-after.png')).convert('RGB')
    if a.size != b.size:   # a page that grew or shrank: compare the part both have, and count the rest as changed
        w, h = min(a.width, b.width), min(a.height, b.height); extra = a.width * a.height + b.width * b.height - 2 * w * h
        a, b = a.crop((0, 0, w, h)), b.crop((0, 0, w, h))
    else: extra = 0
    diff = ImageChops.difference(a, b).convert('L').point(lambda v: 255 if v > 24 else 0)   # small anti-aliasing differences don't count
    changed = sum(diff.histogram()[255:]) + extra
    shown = Image.blend(ImageOps.grayscale(b).convert('RGB'), Image.new('RGB', b.size, (0, 0, 0)), 0.5)
    shown.paste(Image.new('RGB', b.size, (255, 40, 60)), mask=diff)
    shown.save(os.path.join(OUT, name + '-diff.png'))
    return 100.0 * changed / max(1, b.width * b.height + extra)

try:
    with sync_playwright() as p:
        old_ver, old_err = shoot(OLD, 8411, 'before', p)
        new_ver, new_err = shoot(NEW, 8412, 'after', p)
    rows = []
    for name, url, w, h in VIEWS:
        pct = compare(name) if os.path.isfile(os.path.join(OUT, name + '-before.png')) and os.path.isfile(os.path.join(OUT, name + '-after.png')) else None
        rows.append((name, url, '%dx%d' % (w, h), pct))
    md = ['## Visual changes: %s (before) and %s (after)' % (old_ver, new_ver), '',
          'Each page with the same demo data, photographed from both zips on the same machine. The pictures (before, after, and the changed pixels in red) are in the `visual-changes` artifact.', '',
          '| Page | Address | Size | Changed |', '|---|---|---|---|']
    for name, url, size, pct in rows:
        md.append('| %s | `%s` | %s | %s |' % (name, url, size, 'not shown' if pct is None else ('no change' if pct < 0.05 else '%.1f%%' % pct)))
    if new_err: md += ['', '**Page errors in %s:** ' % new_ver + '; '.join('%s: %s' % (k, v[0]) for k, v in new_err.items())]
    open(os.path.join(OUT, 'summary.md'), 'w').write('\n'.join(md) + '\n')
    print('\n'.join(md))
    if os.environ.get('GITHUB_STEP_SUMMARY'): open(os.environ['GITHUB_STEP_SUMMARY'], 'a').write('\n'.join(md) + '\n')
    sys.exit(1 if new_err or any(r[3] is None for r in rows) else 0)
finally:
    stop_all()
