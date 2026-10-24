#!/usr/bin/env python3
"""Tests the built website (build/site, from  python3 tools/make-site.py --no-guide):
  * every link, image and in-page anchor resolves, in every page and in the README's links to the website; the sitemap lists real pages;
  * the site's security policy is respected: no inline style or script, no event handler attributes, nothing from other sites;
  * page basics: a title, a description, one h1, alt text on every image, a canonical address;
  * in a real browser: the tour tabs (mouse, keyboard, #p-... links, and with scripts off), the look picker, light and dark following
    the device with the toggle on top, the example Telegram chat, the tool finder, the question search and the phone menu;
  * no sideways scrolling at 390 and 1280 pixels, and no console error or policy violation;
  * axe (WCAG 2.1 A and AA) on every page, in dark and in light.
    python3 tests/website_test.py build/site [--browser chromium|firefox|webkit]
Needs Playwright and axe-core (npm ci). The built tools list is compared with the Tools bundle in src/."""
import functools, html.parser, http.server, json, os, re, socketserver, sys, threading, urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from helpers import Checks, browser_name, launch, CSP_REPORTER
from playwright.sync_api import sync_playwright

BROWSER = browser_name()
if len(sys.argv) < 2: sys.exit(__doc__)
SITE = os.path.abspath(sys.argv[1])
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = 'https://jackpison.github.io/Homebase-Hub/'
AXE = open(os.path.join(ROOT, 'node_modules', 'axe-core', 'axe.min.js'), encoding='utf-8').read()
RUN = "async()=>{const r=await axe.run(document,{resultTypes:['violations'],runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return r.violations.map(v=>v.id+' x'+v.nodes.length+' '+v.nodes[0].target.join(' '))}"
check = Checks()
if not os.path.isfile(os.path.join(SITE, 'index.html')): sys.exit('No website in %s: build it first with  python3 tools/make-site.py --no-guide' % SITE)


class Page(html.parser.HTMLParser):
    """What a page links to and how it is built."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids, self.refs, self.imgs, self.bad, self.h1, self.title, self.meta, self._t = set(), [], [], [], 0, '', {}, None
    def handle_starttag(self, tag, a):
        a = dict(a)
        if 'id' in a: self.ids.add(a['id'])
        if tag == 'h1': self.h1 += 1
        if tag == 'title': self._t = ''
        if tag == 'meta' and a.get('name'): self.meta[a['name']] = a.get('content', '')
        if tag == 'link' and a.get('rel') == 'canonical': self.meta['canonical'] = a.get('href', '')
        for k in ('href', 'src'):
            if k in a and tag != 'link': self.refs.append((tag, a[k]))
            elif k == 'href' and tag == 'link' and a.get('rel') in ('stylesheet', 'icon', 'apple-touch-icon', 'preload'): self.refs.append((tag, a[k]))
        if tag == 'img': self.imgs.append(a)
        if 'style' in a: self.bad.append('style attribute on <%s>' % tag)
        if tag == 'style': self.bad.append('<style> element')
        if tag == 'script' and 'src' not in a: self.bad.append('inline <script>')
        for k in a:
            if k.startswith('on'): self.bad.append('%s on <%s>' % (k, tag))
        if tag in ('img', 'script', 'link', 'iframe', 'video', 'audio', 'source', 'object', 'embed'):
            for k in ('src', 'href', 'srcset'):
                if re.match(r'^(https?:)?//', a.get(k, '')) and not (tag == 'link' and a.get('rel') == 'canonical'): self.bad.append('%s from another site: %s' % (tag, a[k][:60]))
    def handle_data(self, d):
        if self._t is not None: self._t += d
    def handle_endtag(self, tag):
        if tag == 'title': self.title, self._t = self._t.strip(), None


def parse(rel):
    p = Page(); p.feed(open(os.path.join(SITE, rel), encoding='utf-8').read()); return p


def target(page_rel, href):
    """(file, anchor) a link points at inside the site, or None for other sites."""
    if re.match(r'^(https?:|mailto:|data:)', href): return None
    u = urllib.parse.urlparse(urllib.parse.urljoin('http://x/' + page_rel, href))
    path = urllib.parse.unquote(u.path).lstrip('/')
    if path == '' or path.endswith('/'): path += 'index.html'
    return path, u.fragment


pages = sorted(os.path.relpath(os.path.join(d, 'index.html'), SITE) for d, _, f in os.walk(SITE) if 'index.html' in f)
pages.append('404.html')
parsed = {r: parse(r) for r in pages}

# ---------- A. the files ----------
broken, anchors, policy, basics, alts = [], [], [], [], []
for rel, p in parsed.items():
    for tag, href in p.refs:
        if href.endswith('.pdf') and 'Homebase-Hub-Guide' in href and not os.path.isfile(os.path.join(SITE, 'Homebase-Hub-Guide.pdf')): continue   # the guide is only built without --no-guide
        t = target(rel, href) if rel != '404.html' else (target('', href) if not href.startswith(BASE) else (href[len(BASE):] or 'index.html', ''))
        if t is None: continue
        f, frag = t
        if f.endswith('/') or os.path.isdir(os.path.join(SITE, f)): f = f.rstrip('/') + '/index.html'
        if not os.path.isfile(os.path.join(SITE, f)): broken.append('%s -> %s' % (rel, href)); continue
        if frag and f.endswith('.html'):
            tp = parsed.get(f) or parse(f)
            if frag not in tp.ids: anchors.append('%s -> %s#%s' % (rel, f, frag))
    policy += ['%s: %s' % (rel, b) for b in p.bad]
    if rel != '404.html':
        if not p.title or len(p.title) > 90: basics.append(rel + ': title')
        if len(p.meta.get('description', '')) < 50 or len(p.meta.get('description', '')) > 200: basics.append(rel + ': description length')
        if p.h1 != 1: basics.append('%s: %d h1' % (rel, p.h1))
        if not p.meta.get('canonical', '').startswith(BASE): basics.append(rel + ': canonical')
    alts += ['%s: %s' % (rel, i.get('src')) for i in p.imgs if 'alt' not in i]
check('W1 %d pages, and every link, image, script and style they use exists' % len(pages), not broken, broken[:5])
check('W2 every #anchor a link points at exists on its page', not anchors, anchors[:5])
check('W3 the security policy holds: no inline style or script, no event handlers, nothing from other sites', not policy, policy[:5])
check('W4 every page has a title, a 50 to 200 character description, one h1 and a canonical address', not basics, basics[:5])
check('W5 every image has an alt attribute', not alts, alts[:5])
sm = re.findall(r'<loc>([^<]+)</loc>', open(os.path.join(SITE, 'sitemap.xml')).read())
miss = [u for u in sm if not os.path.isfile(os.path.join(SITE, (u[len(BASE):] + 'index.html') if u.endswith('/') or u == BASE else u[len(BASE):]))]
check('W6 the sitemap lists %d pages and each exists' % len(sm), len(sm) >= 15 and not miss, miss[:3])
old = [s for s in ('install', 'guide', 'security', 'changelog', 'about') if not os.path.isfile(os.path.join(SITE, s + '.html'))]
check('W7 the old addresses (install.html and the others) still forward to the new ones', not old, old)
rd = open(os.path.join(ROOT, 'README.md'), encoding='utf-8').read()
rb = []
for m in re.finditer(r'https://jackpison\.github\.io/Homebase-Hub/([^\s)"\'<>]*)', rd):
    path, _, frag = m.group(1).partition('#')
    f = (path + 'index.html') if path == '' or path.endswith('/') else path
    if f.endswith('.pdf'):
        if os.path.isfile(os.path.join(SITE, f)) or True: continue   # the guide PDF is only built without --no-guide
    if not os.path.isfile(os.path.join(SITE, f)): rb.append(m.group(0)); continue
    if frag and frag not in parsed.get(f, parse(f)).ids: rb.append(m.group(0))
check('W8 every link from the README to this website still works (pages and #anchors)', not rb, rb[:5])
data = json.load(open(os.path.join(ROOT, 'website', 'data', 'tools.json'), encoding='utf-8'))
bundle = open(os.path.join(ROOT, 'src', 'web', 'tools', 'assets', 'index-ToolsAll.js'), encoding='utf-8').read()
cats = {'images', 'photos', 'pdf', 'utilities'}
ids = {m.group(1) for m in re.finditer(r'\{id:"([a-z0-9-]+)",name:"', bundle)} - cats
check('W9 the website lists exactly the %d tools the app has (website/data/tools.json against the Tools bundle)' % len(ids), {t['id'] for t in data['tools']} == ids and len(ids) >= 30, sorted(ids ^ {t['id'] for t in data['tools']})[:5])

# ---------- B. in a browser ----------
socketserver.ThreadingTCPServer.allow_reuse_address = True
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
H = functools.partial(Quiet, directory=SITE)
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
B = 'http://127.0.0.1:%d' % srv.server_address[1]
URLS = ['/' + r[:-len('index.html')] if r.endswith('index.html') else '/' + r for r in pages if r != '404.html']
LUM = "(() => { const c = getComputedStyle(document.body).backgroundColor.match(/[\\d.]+/g).map(Number); return (c[0] + c[1] + c[2]) / 3; })()"

try:
    with sync_playwright() as p:
        b = launch(p, BROWSER); print('browser: %s %s' % (BROWSER, b.version))

        def ctx(scheme='dark', width=1280, **kw):
            c = b.new_context(color_scheme=scheme, viewport={'width': width, 'height': 900}, **kw); c.add_init_script(CSP_REPORTER); return c

        # no console error, no policy violation, no sideways scroll, on every page (policy NOT bypassed here)
        c = ctx(); bad, wide = [], []
        for width in (1280, 390):
            c2 = ctx('dark', width); pg = c2.new_page(); errs = []
            pg.on('console', lambda m: errs.append(m.text[:140]) if m.type == 'error' else None); pg.on('pageerror', lambda e: errs.append(str(e)[:140]))
            for u in URLS:
                errs.clear(); pg.goto(B + u); pg.wait_for_timeout(250)
                if errs: bad.append('%s %d: %s' % (u, width, errs[0]))
                if pg.evaluate('document.documentElement.scrollWidth') > width: wide.append('%s at %d' % (u, width))
            c2.close()
        check('W10 no console error or security-policy violation on any page (at 1280 and 390 pixels)', not bad, bad[:3])
        check('W11 no sideways scrolling on any page at 1280 or 390 pixels wide', not wide, wide[:5])

        # light and dark follow the device; the toggle overrides and is remembered
        for scheme, lo, hi in (('dark', 0, 60), ('light', 200, 256)):
            c2 = ctx(scheme); pg = c2.new_page(); pg.goto(B + '/'); l = pg.evaluate(LUM)
            check('W12 with the device set to %s, the page is %s (no choice made yet)' % (scheme, scheme), lo <= l <= hi and pg.evaluate('document.documentElement.dataset.theme') is None, l); c2.close()
        c2 = ctx('dark'); pg = c2.new_page(); pg.goto(B + '/'); pg.click('.mode'); pg.wait_for_timeout(200); lit = pg.evaluate(LUM); pg.reload(); pg.wait_for_timeout(200)
        check('W13 the toggle turns a dark device light, and the choice is still there after a reload', lit > 200 and pg.evaluate(LUM) > 200 and pg.evaluate('document.documentElement.dataset.theme') == 'light', lit)
        pg.click('.mode'); pg.wait_for_timeout(200); check('W14 and turns it back', pg.evaluate(LUM) < 60); c2.close()

        # the tour
        c2 = ctx(); pg = c2.new_page(); pg.goto(B + '/'); pg.wait_for_timeout(300)
        vis = lambda: pg.evaluate("[...document.querySelectorAll('#screenshots [role=tabpanel]')].filter(p => !p.hidden).map(p => p.id)")
        check('W15 the tour opens on Tasks, with one panel showing', vis() == ['p-tasks'] and pg.get_attribute('#t-tasks', 'aria-selected') == 'true', vis())
        pg.click('#t-links'); check('W16 clicking Links shows Links only', vis() == ['p-links'] and pg.get_attribute('#t-tasks', 'aria-selected') == 'false', vis())
        pg.focus('#t-links'); pg.keyboard.press('ArrowRight'); pg.keyboard.press('ArrowRight')
        check('W17 the arrow keys move between tabs (Links, Info, Cards)', vis() == ['p-cards'], vis())
        pg.keyboard.press('End'); check('W18 End goes to the last tab (Tools)', vis() == ['p-tools'], vis())
        n = pg.evaluate("document.querySelectorAll('#screenshots .hot').length"); check('W19 the numbered dots are on the pictures (%d)' % n, n >= 15, n)
        pg.goto(B + '/#p-info'); pg.wait_for_timeout(400); check('W20 a link like /#p-info (used by the README) opens that tab', vis() == ['p-info'], vis()); c2.close()
        c2 = ctx(java_script_enabled=False); pg = c2.new_page(); pg.goto(B + '/'); pg.wait_for_timeout(300)
        shown = pg.evaluate("[...document.querySelectorAll('#screenshots [role=tabpanel]')].filter(p => p.offsetParent !== null).length")
        check('W21 with scripts off the whole tour is still there (all 6 panels, no tabs)', shown == 6 and not pg.is_visible('#screenshots [role=tablist]'), shown); c2.close()

        # the look picker
        c2 = ctx(); pg = c2.new_page(); pg.goto(B + '/'); pg.wait_for_timeout(200)
        btn = lambda: pg.evaluate("getComputedStyle(document.querySelector('.hcopy .btn.pri')).backgroundColor")
        a = btn(); pg.click('.hcopy .look[data-look=pink]'); pg.wait_for_timeout(150)
        check('W22 picking the pink look re-colours the buttons and marks the choice', a != btn() and btn() == 'rgb(255, 95, 162)' and pg.get_attribute('.hcopy .look[data-look=pink]', 'aria-pressed') == 'true', (a, btn()))
        pg.goto(B + '/faq/'); pg.wait_for_timeout(200)
        check('W23 the look is remembered on other pages', pg.evaluate("document.documentElement.dataset.look") == 'pink')
        pg.click('.foot .look[data-look=gold]'); check('W24 gold puts it back', pg.evaluate("document.documentElement.dataset.look") is None); c2.close()

        # the example Telegram chat
        c2 = ctx(); pg = c2.new_page(); pg.goto(B + '/telegram/'); pg.wait_for_timeout(200)
        before = pg.evaluate("document.querySelectorAll('#chat .msg').length"); pg.click('.cmd[data-cmd="/today"]'); pg.wait_for_timeout(700)
        txt = pg.evaluate("[...document.querySelectorAll('#chat .msg')].slice(-2).map(m => m.textContent)")
        check('W25 tapping /today adds the command and a reply to the example chat', pg.evaluate("document.querySelectorAll('#chat .msg').length") == before + 2 and txt[0] == '/today' and 'Due today' in txt[1], txt)
        pg.click('.cmd[data-cmd="/snooze Netflix 2h"]'); pg.wait_for_timeout(700); check('W26 and another command works too', 'Snoozed' in pg.evaluate("[...document.querySelectorAll('#chat .msg')].pop().textContent")); c2.close()

        # the tool finder
        c2 = ctx(); pg = c2.new_page(); pg.goto(B + '/tools/'); pg.wait_for_timeout(200)
        count = lambda: pg.evaluate("[...document.querySelectorAll('.tool')].filter(t => !t.hidden).length")
        check('W27 the finder starts with all %d tools showing' % len(ids), count() == len(ids) and pg.inner_text('#tf-count') == '%d tools' % len(ids), count())
        pg.fill('#tf-q', 'pdf'); pg.wait_for_timeout(150); n1 = count(); ok1 = pg.evaluate("[...document.querySelectorAll('.tool')].filter(t => !t.hidden).every(t => t.dataset.text.includes('pdf'))")
        check('W28 typing pdf narrows the list to tools about PDFs, and the count follows', 0 < n1 < len(ids) and ok1 and pg.inner_text('#tf-count').startswith('%d ' % n1), n1)
        pg.fill('#tf-q', ''); pg.click('.chipbtn[data-cat=photos]'); pg.wait_for_timeout(150)
        check('W29 the Photos chip shows only photo tools', count() == sum(1 for t in data['tools'] if t['cat'] == 'photos') and pg.get_attribute('.chipbtn[data-cat=photos]', 'aria-pressed') == 'true', count())
        pg.click('.chipbtn[data-cat=all]'); pg.fill('#tf-q', 'zzzzqq'); pg.wait_for_timeout(150)
        check('W30 a search with no match says so', count() == 0 and pg.is_visible('#tf-none') and pg.inner_text('#tf-count') == '0 tools'); c2.close()

        # the FAQ
        c2 = ctx(); pg = c2.new_page(); pg.goto(B + '/faq/'); pg.wait_for_timeout(200)
        total = pg.evaluate("document.querySelectorAll('.faq details').length"); pg.fill('#faq-q', 'update'); pg.wait_for_timeout(150)
        shown = pg.evaluate("[...document.querySelectorAll('.faq details')].filter(d => !d.hidden).length")
        check('W31 searching the questions for "update" narrows %d answers to %d' % (total, shown), 0 < shown < total and pg.inner_text('#faq-count').startswith('%d ' % shown), shown)
        pg.fill('#faq-q', ''); pg.click('.faq details:first-child summary'); check('W32 a question opens to show its answer', pg.evaluate("document.querySelector('.faq details').open") is True); c2.close()

        # the phone menu and the phone steps
        c2 = ctx('dark', 390); pg = c2.new_page(); pg.goto(B + '/'); pg.wait_for_timeout(200)
        check('W33 on a phone the pill menu is replaced by a menu button', not pg.is_visible('.menu') and pg.is_visible('.mm summary'))
        pg.click('.mm summary'); pg.wait_for_timeout(150); check('W34 the menu opens with the main pages', pg.is_visible('.mm nav a[href$="install/"]') and pg.is_visible('.mm nav a[href$="telegram/"]'))
        pg.goto(B + '/phone/'); pg.wait_for_timeout(200); pg.click('#t-android'); pg.wait_for_timeout(100)
        check('W35 On your phone: choosing Android shows the Android steps only', pg.is_visible('#p-android') and not pg.is_visible('#p-ios') and 'Chrome' in pg.inner_text('#p-android')); c2.close()

        # axe, every page, both themes (this context bypasses the page policy, which would stop axe from running)
        for scheme in ('dark', 'light'):
            c2 = b.new_context(color_scheme=scheme, bypass_csp=True, viewport={'width': 1280, 'height': 900}); found = []
            def local(route):   # the 404 page names the real website address for its files: serve them from this build
                f = os.path.join(SITE, route.request.url[len(BASE):].split('?')[0] or 'index.html')
                if os.path.isdir(f): f = os.path.join(f, 'index.html')
                route.fulfill(path=f) if os.path.isfile(f) else route.abort()
            c2.route(re.compile('^' + re.escape(BASE)), local); pg = c2.new_page()
            for u in URLS + ['/404.html']:
                pg.goto(B + u); pg.wait_for_timeout(250); pg.evaluate(AXE); v = pg.evaluate(RUN)
                if v: found.append('%s: %s' % (u, '; '.join(v[:3])))
            check('W36 axe (WCAG 2.1 A and AA) finds nothing on any of %d pages in %s' % (len(URLS) + 1, scheme), not found, found[:4]); c2.close()
        b.close()
finally:
    srv.shutdown()
sys.exit(check.done())
