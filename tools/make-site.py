#!/usr/bin/env python3
"""Build the GitHub Pages site into build/site from website/, tools/site_pages.py and CHANGELOG.md.
Usage: python3 tools/make-site.py [--no-guide] [--latest OWNER REPO VERSION SHA256 SIZE]   (adds latest.json)
Also builds Homebase-Hub-Guide.pdf (tools/make-guide.py). Plain HTML and CSS and two small scripts (theme.js, site.js), a security
policy that allows nothing else (no inline styles or scripts, no other sites), no trackers."""
import html, os, re, shutil, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import site_pages as SP
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'build', 'site')
W = os.path.join(ROOT, 'website')
CONTENT = [('install', 'Install'), ('guide', 'Guide'), ('security', 'Security'), ('about', 'Licence')]   # written by hand in website/content
OLD = [s for s, _ in CONTENT] + ['changelog']          # addresses that were published as name.html before: they forward to name/
SLUGS = ['index'] + OLD
NAV = [('features/', 'Features'), ('tools/', 'Tools'), ('telegram/', 'Telegram'), ('security/', 'Security'), ('install/', 'Install'), ('guide/', 'Guide')]
BASE = 'https://jackpison.github.io/Homebase-Hub/'


def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', s)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    s = re.sub(r'\[([^\]]+)\]\((https?://[^)\s]+)\)', r'<a href="\2" rel="noopener">\1</a>', s)
    return s


def md(text):
    out, ul, tbl = [], False, []
    def close():
        nonlocal ul
        if ul: out.append('</ul>'); ul = False
    def flush():
        nonlocal tbl
        if tbl:
            rows = [r for r in tbl if not re.match(r'^\|[\s:|-]+\|$', r)]
            h = ''.join('<tr>' + ''.join(('<th>%s</th>' if i == 0 else '<td>%s</td>') % inline(c.strip()) for c in r.strip('|').split('|')) + '</tr>' for i, r in enumerate(rows))
            out.append('<table>' + h + '</table>'); tbl = []
    for ln in text.split('\n'):
        if ln.startswith('|'): tbl.append(ln); continue
        flush()
        if ln.startswith('### '): close(); out.append('<h3>%s</h3>' % inline(ln[4:]))
        elif ln.startswith('## '): close(); out.append('<h2>%s</h2>' % inline(ln[3:]))
        elif re.match(r'^\s*- ', ln):
            if not ul: out.append('<ul>'); ul = True
            out.append('<li>%s</li>' % inline(re.sub(r'^\s*- ', '', ln)))
        elif ln.strip() in ('', '---'): close()
        else: close(); out.append('<p>%s</p>' % inline(ln))
    close(); flush(); return '\n'.join(out)


def url(slug): return '' if slug == 'index' else slug + '/'


def relink(doc, root):
    """Pages are written with plain names (install.html, img/x.webp, features/tasks/); this turns the old name.html forms into
    folder addresses (install/) and adds the way back up to the site's top ('' on the home page, '../' for each level below it)."""
    def f(m):
        attr, u = m.group(1), m.group(2)
        if re.match(r'^(https?:|mailto:|data:|#)', u): return m.group(0)
        m2 = re.match(r'^([a-z]+)\.html(#.*)?$', u)
        if m2 and m2.group(1) in SLUGS: return '%s="%s%s%s"' % (attr, root, url(m2.group(1)), m2.group(2) or '')
        m3 = re.match(r'^index\.html(#.*)?$', u)
        if m3: return '%s="%s%s"' % (attr, root, m3.group(1) or '')
        return '%s="%s%s"' % (attr, root, u)
    return re.sub(r'\b(href|src)="([^"]*)"', f, doc)


def page(slug, title, body, wide=False, desc=None, cls=''):
    desc = desc or 'Homebase Hub is a self-hosted start page with bookmarks, notes, cards, tasks and browser tools. One login, private, on your own server.'
    cur = lambda h: slug == h.rstrip('/') or slug.startswith(h)
    nav = ''.join('<a href="%s"%s>%s</a>' % (h, ' aria-current="page"' if cur(h) else '', n) for h, n in NAV)
    more = [('index.html', 'Overview'), ('phone/', 'On your phone'), ('faq/', 'Questions'), ('changelog.html', 'Changelog')]
    mnav = ''.join('<a href="%s"%s>%s</a>' % (h, ' aria-current="page"' if cur(h) else '', n) for h, n in [('index.html', 'Overview')] + NAV[:-0 or None] + more[1:])
    main = body if wide else '<div class="page">' + body + '</div>'
    canon = '' if slug == '404' else '<link rel="canonical" href="%s%s">' % (BASE, url(slug))
    foot_links = lambda items: ''.join('<li><a href="%s">%s</a></li>' % (h, n) for h, n in items)
    doc = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark light">'
           '<title>%s</title><meta name="description" content="%s">'
           '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'self\'; style-src \'self\'; img-src \'self\'; font-src \'self\'; base-uri \'self\'; form-action \'none\'">'
           '<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0a0a10"><meta name="theme-color" media="(prefers-color-scheme: light)" content="#fbf6ec">'
           '<link rel="icon" type="image/png" href="brand/favicon-32.png"><link rel="apple-touch-icon" href="brand/apple-touch-icon.png">%s'
           '<meta property="og:type" content="website"><meta property="og:title" content="%s"><meta property="og:description" content="%s"><meta property="og:image" content="%sbrand/social-preview.png"><meta name="twitter:card" content="summary_large_image">'
           '<link rel="preload" href="fonts/manrope.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="style.css"><link rel="stylesheet" href="hot.css">'
           '<script src="theme.js"></script><script src="site.js" defer></script></head><body>'
           '<a class="skip" href="#main">Skip to the content</a>'
           '<header class="top"><div class="in bar"><a class="brand" href="index.html"><img src="brand/logo-192.png" alt="" width="36" height="36">Homebase Hub</a>'
           '<nav class="menu" aria-label="Main">%s</nav>'
           '<div class="acts"><button class="mode" type="button" aria-label="Switch between dark and light"><span class="m-sun">{{i:sun}}</span><span class="m-moon">{{i:moon}}</span></button>'
           '<a class="btn pri sm" href="%s">{{i:download}}Download</a>'
           '<details class="mm"><summary aria-label="Menu">{{i:menu}}</summary><nav aria-label="Menu">%s</nav></details></div></div></header>'
           '<main id="main" class="%s">%s</main>'
           '<footer class="foot"><div class="in"><div class="fgrid"><div><a class="brand" href="index.html"><img src="brand/logo-192.png" alt="" width="36" height="36">Homebase Hub</a>'
           '<p>Your start page, bookmarks, notes and tasks, on your own server.</p>%s</div>'
           '<div><h4>The pages</h4><ul>%s</ul></div><div><h4>Learn</h4><ul>%s</ul></div><div><h4>Project</h4><ul>%s</ul></div></div>'
           '<div class="copy"><span>Homebase Hub is free software under the GPL-3.0 licence.</span><span>No trackers, and nothing is loaded from other sites.</span></div></div></footer></body></html>') % (
        html.escape(title), html.escape(desc, quote=True), canon, html.escape(title, quote=True), html.escape(desc, quote=True), BASE, nav, SP.LATEST, mnav, cls, main, SP.looks_row(),
        foot_links([('features/%s/' % f['id'], f['name']) for f in SP.FEATURES]),
        foot_links([('install.html', 'Install'), ('guide.html', 'Guide'), ('faq/', 'Questions'), ('phone/', 'On your phone'), ('telegram/', 'Telegram'), ('tools/', 'Tool finder'), ('changelog.html', 'Changelog')]),
        foot_links([('https://github.com/Jackpison/Homebase-Hub', 'GitHub'), ('https://github.com/Jackpison/Homebase-Hub/issues/new/choose', 'Report a problem'), ('https://t.me/Jackpison', 'Telegram: @Jackpison'), ('security.html', 'Security'), ('about.html', 'Licence')]))
    return relink(doc, '' if slug in ('index', '404') else '../' * (slug.count('/') + 1))


# Simple line icons (24 x 24), drawn for this site. {{i:name}} in a page becomes the inline SVG, so no icon file is fetched.
ICONS = {
    'home': '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
    'link': '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    'note': '<path d="M6 3h9l4 4v14H6z"/><path d="M14.5 3v4.5H19"/><path d="M9 12h7M9 16h7"/>',
    'card': '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M6.5 15h4"/>',
    'tasks': '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8.5 12.2 2.4 2.4 4.6-5"/>',
    'tools': '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    'settings': '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/>',
    'lock': '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    'shield': '<path d="M12 3 5 6v5.5c0 4.3 2.9 7.8 7 9.5 4.1-1.7 7-5.2 7-9.5V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
    'download': '<path d="M12 4v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M5 19.5h14"/>',
    'refresh': '<path d="M20 7v4.5h-4.5"/><path d="M4 17v-4.5h4.5"/><path d="M6.2 9.5A7 7 0 0 1 19 11.5M17.8 14.5A7 7 0 0 1 5 12.5"/>',
    'send': '<path d="M21 4 10.5 14.5"/><path d="M21 4l-6.5 16-4-5.5L5 11z"/>',
    'server': '<rect x="3.5" y="4" width="17" height="6.5" rx="2"/><rect x="3.5" y="13.5" width="17" height="6.5" rx="2"/><path d="M7 7.2h.01M7 16.8h.01"/>',
    'book': '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3"/>',
    'code': '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
    'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    'bell': '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    'palette': '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-.9-.6-1.2-.6-2.1 0-.9.7-1.4 1.6-1.4H17a4 4 0 0 0 4-4C21 6.7 17 3 12 3z"/><path d="M7.5 11h.01M10 7.5h.01M14.5 7.5h.01"/>',
    'check': '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    'phone': '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>',
    'image': '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.5"/><path d="m4 17 5-4.5 3.5 3 3-2.5L20 17"/>',
    'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>',
    'key': '<circle cx="8" cy="15" r="4"/><path d="m11 12 8-8M16 7l2.5 2.5"/>',
    'arrow': '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    'repeat': '<path d="m17 3 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="m7 21-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
    'calendar': '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    'chart': '<path d="M5 20V11M11 20V5M17 20v-6M3 20h18"/>',
    'gift': '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12"/><path d="M12 8c-3.5 0-4.5-4-2-4S12 8 12 8zm0 0c3.5 0 4.5-4 2-4S12 8 12 8z"/>',
    'undo': '<path d="M4 12a8 8 0 1 0 2.8-6"/><path d="M4 4.5V9h4.5"/>',
    'search': '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    'star': '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9-4.3-4.1 5.9-.8z"/>',
    'menu': '<path d="M4 7h16M4 12h16M4 17h16"/>',
    'table': '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M3.5 10h17M3.5 14.5h17M9.5 5v14"/>',
    'contrast': '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/>',
    'moon': '<path d="M20.99 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.78 9.79z"/>',
}
def icons(doc):
    """{{i:name}} -> the inline SVG of that icon."""
    def f(m):
        if m.group(1) not in ICONS: raise SystemExit('Unknown icon: ' + m.group(1))
        return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[m.group(1)] + '</svg>'
    return re.sub(r'\{\{i:([a-z-]+)\}\}', f, doc)


SIZES = (640, 960)
def make_sizes():
    """640 and 960 pixel copies of every wide screenshot, so phones and small windows download less."""
    from PIL import Image
    d = os.path.join(OUT, 'img'); made = 0
    for f in os.listdir(d):
        if not f.endswith('.webp') or re.search(r'-\d+w\.webp$', f): continue
        im = Image.open(os.path.join(d, f))
        if im.size[0] < 1000: continue
        for w in SIZES:
            im.convert('RGB').resize((w, round(im.size[1] * w / im.size[0])), Image.LANCZOS).save(os.path.join(d, f[:-5] + '-%dw.webp' % w), 'WEBP', quality=80, method=6); made += 1
    return made


def srcsets(doc):
    """<img src=".../img/x.webp" width="1440"> gets a srcset with the smaller copies."""
    def f(m):
        tag, src = m.group(0), m.group(2)
        w = re.search(r'width="(\d+)"', tag)
        if not w or int(w.group(1)) < 1000 or 'srcset=' in tag: return tag
        base = src[:-5]
        ss = ', '.join('%s-%dw.webp %dw' % (base, x, x) for x in SIZES) + ', %s %sw' % (src, w.group(1))
        return tag.replace(m.group(1), m.group(1) + ' srcset="%s" sizes="(max-width: 1220px) 100vw, 1180px"' % ss, 1)
    return re.sub(r'(<img src="([^"]*img/[^"]+\.webp)")[^>]*>', f, doc)


def write(slug, doc):
    doc = srcsets(icons(doc))
    d = OUT if slug == 'index' else os.path.join(OUT, slug); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(doc)


def main():
    shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)
    for f in ('style.css', 'theme.js', 'site.js'): shutil.copy(os.path.join(W, f), OUT)
    shutil.copytree(os.path.join(W, 'img'), os.path.join(OUT, 'img')); shutil.copytree(os.path.join(W, 'fonts'), os.path.join(OUT, 'fonts'))
    os.makedirs(os.path.join(OUT, 'brand'))
    for f in ('logo-192.png', 'logo-512.png', 'apple-touch-icon.png', 'favicon-32.png', 'social-preview.png'):
        if os.path.isfile(os.path.join(W, 'brand', f)): shutil.copy(os.path.join(W, 'brand', f), os.path.join(OUT, 'brand', f))
    ver = re.search(r"define\('HUB',\s*'([^']+)'\)", open(os.path.join(ROOT, 'src/web/core-data/lib/boot.php'), encoding='utf-8').read()).group(1)
    fix = lambda s: s.replace('Download {{VER}}', 'Download v' + ver).replace('{{VER}}', ver)
    slugs = ['index']
    for p in SP.all_pages():     # home, features, Telegram, phone, tools, FAQ: built from data
        write(p['slug'], page(p['slug'], p['title'], fix(p['body']), p.get('wide', True), p['desc'], p['cls'])); slugs.append(p['slug'])
    for slug, _ in CONTENT:      # install, guide, security, licence: written by hand
        t = open(os.path.join(W, 'content', slug + '.html'), encoding='utf-8').read()
        m = re.match(r'<!--title:(.*?)-->\n', t); title = m.group(1) if m else slug; body = t[m.end():] if m else t
        write(slug, page(slug, 'Homebase Hub: ' + title, fix(body), body.startswith('<!--wide-->'))); slugs.append(slug)
    cl = open(os.path.join(ROOT, 'CHANGELOG.md'), encoding='utf-8').read().replace('# Changelog', '', 1)
    parts = re.split(r'(?m)^(?=## \d+\.\d+\.\d+)', cl)   # [intro and version map, newest version, ...]
    head, vers = parts[0], parts[1:]
    recent = head + ''.join(vers[:10])
    write('changelog', page('changelog', 'Homebase Hub: Changelog', '<h1>Changelog</h1><p class="lead">The newest ten versions. <a href="changelog/all/">Every version since 1.0.0</a> is on its own page.</p><div class="cl">' + md(recent) + '</div><p><a class="btn" href="changelog/all/">Every version</a></p>', desc='What changed in each version of Homebase Hub: new features, fixes and changes, newest first, in plain words.')); slugs.append('changelog')
    write('changelog/all', page('changelog/all', 'Homebase Hub: Every version', '<h1>Every version</h1><p class="lead">Newest first. The <a href="changelog.html">changelog</a> page shows just the newest ten.</p><div class="cl">' + md(cl) + '</div>', desc='Every version of Homebase Hub since 1.0.0, newest first.')); slugs.append('changelog/all')
    # the old addresses (install.html ...) were published before: they forward to the new ones
    for slug in OLD:
        open(os.path.join(OUT, slug + '.html'), 'w', encoding='utf-8').write('<!doctype html><meta charset="utf-8"><title>Moved</title><meta http-equiv="refresh" content="0; url=%s/"><link rel="canonical" href="%s%s/"><p>This page moved to <a href="%s/">%s/</a>.</p>' % (slug, BASE, slug, slug, slug))
    nf = page('404', 'Page not found: Homebase Hub', '<h1>Page not found</h1><p class="lead">That address does not exist on this site.</p><div class="btns"><a class="btn pri" href="index.html">Go to the home page</a><a class="btn" href="install.html">Install</a><a class="btn" href="faq/">Questions</a></div>')
    open(os.path.join(OUT, '404.html'), 'w', encoding='utf-8').write(icons(nf).replace('<head>', '<head><base href="%s">' % BASE, 1))   # served for any missing address, so its links are absolute
    xs = sorted({x for x, _ in SP.HOT}); ys = sorted({y for _, y in SP.HOT})
    open(os.path.join(OUT, 'hot.css'), 'w').write(''.join('.hx%d{left:%d%%}' % (x, x) for x in xs) + ''.join('.hy%d{top:%d%%}' % (y, y) for y in ys) + '\n')   # where the numbered dots sit on screenshots
    open(os.path.join(OUT, 'sitemap.xml'), 'w', encoding='utf-8').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join('<url><loc>%s%s</loc></url>\n' % (BASE, url(s)) for s in slugs) + '</urlset>\n')
    open(os.path.join(OUT, 'robots.txt'), 'w', encoding='utf-8').write('User-agent: *\nAllow: /\nSitemap: %ssitemap.xml\n' % BASE)
    if '--no-guide' not in sys.argv:
        subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'make-guide.py'), os.path.join(OUT, 'Homebase-Hub-Guide.pdf')], check=True)
        subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'make-guide.py'), os.path.join(OUT, 'Homebase-Hub-Guide-Print.pdf'), '--print'], check=True)
    if '--latest' in sys.argv:
        a = sys.argv[sys.argv.index('--latest') + 1:][:5]
        subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'make-latest.py')] + a + [os.path.join(OUT, 'latest.json')], check=True)
    print('smaller screenshot copies:', make_sizes())
    open(os.path.join(OUT, '.nojekyll'), 'w').close()
    print('site built:', len(slugs), 'pages,', len(os.listdir(OUT)), 'files')
main()
