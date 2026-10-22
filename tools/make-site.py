#!/usr/bin/env python3
"""Build the GitHub Pages site into build/site from website/ and CHANGELOG.md.
Usage: python3 tools/make-site.py [--latest OWNER REPO VERSION SHA256 SIZE]   (adds latest.json)
Also builds Homebase-Hub-Guide.pdf (tools/make-guide.py). Plain HTML and CSS, no scripts, no trackers."""
import html, os, re, shutil, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'build', 'site')
W = os.path.join(ROOT, 'website')
PAGES = [('index', 'Home'), ('features', 'Features'), ('install', 'Install'), ('guide', 'Guide'), ('changelog', 'Changelog'), ('security', 'Security'), ('about', 'Licence and Contact')]

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

def page(slug, title, body):
    nav = ''.join('<a href="%s.html"%s>%s</a>' % (s, ' aria-current="page"' if s == slug else '', t) for s, t in PAGES)
    return ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
            '<title>%s</title><meta name="description" content="Homebase Hub is a self-hosted personal workspace: start page, links, notes, cards, tasks and browser tools."><link rel="stylesheet" href="style.css"></head><body>'
            '<header><nav><a class="brand" href="index.html"><i>H</i>Homebase Hub</a>%s</nav></header><main>%s</main>'
            '<footer>Homebase Hub is free software under the GPL-3.0 licence. Questions and feature requests: <a href="https://t.me/Jackpison">@Jackpison</a> on Telegram. '
            '<a href="https://github.com/Jackpison/Homebase-Hub">GitHub</a></footer></body></html>') % (html.escape(title), nav, body)

def main():
    shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)
    shutil.copy(os.path.join(W, 'style.css'), OUT); shutil.copytree(os.path.join(W, 'img'), os.path.join(OUT, 'img'))
    for slug, _ in PAGES:
        if slug == 'changelog': continue
        t = open(os.path.join(W, 'content', slug + '.html'), encoding='utf-8').read()
        m = re.match(r'<!--title:(.*?)-->\n', t); title = m.group(1) if m else slug; body = t[m.end():] if m else t
        open(os.path.join(OUT, slug + '.html'), 'w', encoding='utf-8').write(page(slug, 'Homebase Hub: ' + title if slug != 'index' else title, body))
    cl = open(os.path.join(ROOT, 'CHANGELOG.md'), encoding='utf-8').read().replace('# Changelog', '', 1)
    open(os.path.join(OUT, 'changelog.html'), 'w', encoding='utf-8').write(page('changelog', 'Homebase Hub: Changelog', '<h1>Changelog</h1><div class="cl">' + md(cl) + '</div>'))
    subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'make-guide.py'), os.path.join(OUT, 'Homebase-Hub-Guide.pdf')], check=True)
    if '--latest' in sys.argv:
        a = sys.argv[sys.argv.index('--latest') + 1:][:5]
        subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'make-latest.py')] + a + [os.path.join(OUT, 'latest.json')], check=True)
    open(os.path.join(OUT, '.nojekyll'), 'w').close()
    print('site built:', len(os.listdir(OUT)), 'files')
main()
