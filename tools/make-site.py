#!/usr/bin/env python3
"""Build the GitHub Pages site into build/site from website/ and CHANGELOG.md.
Usage: python3 tools/make-site.py [--latest OWNER REPO VERSION SHA256 SIZE]   (adds latest.json)
Also builds Homebase-Hub-Guide.pdf (tools/make-guide.py). Plain HTML and CSS, no scripts, no trackers."""
import html, os, re, shutil, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'build', 'site')
W = os.path.join(ROOT, 'website')
PAGES = [('index', 'Home'), ('install', 'Install'), ('guide', 'Guide'), ('security', 'Security'), ('changelog', 'Changelog'), ('about', 'Licence')]
NAV = [('index.html#features', 'Features'), ('index.html#screenshots', 'Screenshots'), ('install.html', 'Install'), ('guide.html', 'Guide'), ('security.html', 'Security'), ('changelog.html', 'Changelog')]

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

def page(slug, title, body, wide=False):
    nav = ''.join('<a href="%s"%s>%s</a>' % (h, ' aria-current="page"' if h == slug + '.html' else '', n) for h, n in NAV)
    main = body if wide else '<div class="page">' + body + '</div>'
    return ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
            '<title>%s</title><meta name="description" content="Homebase Hub is a self-hosted start page with bookmarks, notes, cards, tasks and browser tools. One login, private, on your own server.">'
            '<meta name="theme-color" content="#000000"><link rel="icon" type="image/png" href="brand/favicon-32.png"><link rel="apple-touch-icon" href="brand/apple-touch-icon.png">'
            '<meta property="og:title" content="Homebase Hub"><meta property="og:description" content="A self-hosted start page with bookmarks, notes, cards, tasks and tools.">'
            '<meta property="og:image" content="https://jackpison.github.io/Homebase-Hub/brand/social-preview.png">'
            '<link rel="preload" href="fonts/manrope.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="style.css">'
            '<script>try{if(localStorage.getItem("hh-theme")==="light")document.documentElement.dataset.theme="light"}catch(e){}</script></head><body>'
            '<header class="top"><nav aria-label="Main"><a class="brand" href="index.html"><img src="brand/logo-192.png" alt="" width="34" height="34">Homebase Hub</a>%s'
            '<button class="mode" type="button" aria-label="Switch between dark and light" onclick="var r=document.documentElement,l=r.dataset.theme!==\'light\';if(l)r.dataset.theme=\'light\';else delete r.dataset.theme;try{localStorage.setItem(\'hh-theme\',l?\'light\':\'dark\')}catch(e){}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/></svg></button>'
            '<a class="gh" href="https://github.com/Jackpison/Homebase-Hub">GitHub</a></nav></header><main>%s</main>'
            '<footer><div class="in"><span class="sp"><img src="brand/logo-192.png" alt="" width="24" height="24">Homebase Hub is free software under the GPL-3.0 licence.</span>'
            '<a href="https://t.me/Jackpison">Questions and ideas: @Jackpison on Telegram</a><a href="https://github.com/Jackpison/Homebase-Hub/issues">Report a bug</a><a href="about.html">Licence</a></div></footer></body></html>') % (html.escape(title), nav, main)

def main():
    shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)
    shutil.copy(os.path.join(W, 'style.css'), OUT); shutil.copytree(os.path.join(W, 'img'), os.path.join(OUT, 'img')); shutil.copytree(os.path.join(W, 'fonts'), os.path.join(OUT, 'fonts'))
    os.makedirs(os.path.join(OUT, 'brand'))
    for f in ('logo-192.png', 'logo-512.png', 'apple-touch-icon.png', 'favicon-32.png', 'social-preview.png'):
        if os.path.isfile(os.path.join(W, 'brand', f)): shutil.copy(os.path.join(W, 'brand', f), os.path.join(OUT, 'brand', f))
    ver = re.search(r"define\('HUB',\s*'([^']+)'\)", open(os.path.join(ROOT, 'src/web/core-data/lib/boot.php'), encoding='utf-8').read()).group(1)
    for slug, _ in PAGES:
        if slug == 'changelog': continue
        t = open(os.path.join(W, 'content', slug + '.html'), encoding='utf-8').read()
        m = re.match(r'<!--title:(.*?)-->\n', t); title = m.group(1) if m else slug; body = t[m.end():] if m else t
        wide = body.startswith('<!--wide-->')
        body = body.replace('Download {{VER}}', 'Download v' + ver).replace('{{VER}}', ver)
        open(os.path.join(OUT, slug + '.html'), 'w', encoding='utf-8').write(page(slug, 'Homebase Hub: ' + title if slug != 'index' else title, body, wide))
    cl = open(os.path.join(ROOT, 'CHANGELOG.md'), encoding='utf-8').read().replace('# Changelog', '', 1)
    open(os.path.join(OUT, 'changelog.html'), 'w', encoding='utf-8').write(page('changelog', 'Homebase Hub: Changelog', '<h1>Changelog</h1><p class="lead">Every version, newest first.</p><div class="cl">' + md(cl) + '</div>'))
    if '--no-guide' not in sys.argv:
        subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'make-guide.py'), os.path.join(OUT, 'Homebase-Hub-Guide.pdf')], check=True)
        subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'make-guide.py'), os.path.join(OUT, 'Homebase-Hub-Guide-Print.pdf'), '--print'], check=True)
    if '--latest' in sys.argv:
        a = sys.argv[sys.argv.index('--latest') + 1:][:5]
        subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'make-latest.py')] + a + [os.path.join(OUT, 'latest.json')], check=True)
    open(os.path.join(OUT, '.nojekyll'), 'w').close()
    print('site built:', len(os.listdir(OUT)), 'files')
main()
