#!/usr/bin/env python3
"""The Tools fingerprint: a short code of every file in web/tools/assets.
It goes into web/tools/sw.js (TOOLS_REV) and into the two ?v= on web/tools/index.html, so a browser's saved copy of the Tools files
is emptied and refilled exactly when one of them changed (and never otherwise).

  python3 tools/tools-rev.py --check     fails if the saved code is out of date (the build and CI run this)
  python3 tools/tools-rev.py --write     updates sw.js and index.html after you changed a Tools file
"""
import hashlib, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = os.path.join(ROOT, 'src', 'web', 'tools')

def rev():
    lines = []
    base = os.path.join(T, 'assets')
    for dp, dn, fn in os.walk(base):
        for f in fn:
            p = os.path.join(dp, f)
            lines.append('%s\t%s\n' % (os.path.relpath(p, base).replace(os.sep, '/'), hashlib.sha256(open(p, 'rb').read()).hexdigest()))
    return hashlib.sha256(''.join(sorted(lines)).encode()).hexdigest()[:8]

def saved():
    sw = open(os.path.join(T, 'sw.js'), encoding='utf-8').read()
    html = open(os.path.join(T, 'index.html'), encoding='utf-8').read()
    return re.search(r"const TOOLS_REV = '([0-9a-f]{8})'", sw).group(1), re.findall(r'\?v=([0-9a-f]{8})', html)

if __name__ == '__main__':
    now = rev(); sw_rev, html_revs = saved()
    if '--write' in sys.argv:
        p = os.path.join(T, 'sw.js'); t = open(p, encoding='utf-8').read(); open(p, 'w', encoding='utf-8').write(re.sub(r"(const TOOLS_REV = ')[0-9a-f]{8}(')", r'\g<1>' + now + r'\g<2>', t))
        p = os.path.join(T, 'index.html'); t = open(p, encoding='utf-8').read(); open(p, 'w', encoding='utf-8').write(re.sub(r'\?v=[0-9a-f]{8}', '?v=' + now, t))
        print('Tools fingerprint:', now); sys.exit(0)
    if sw_rev != now or any(h != now for h in html_revs) or len(html_revs) != 2:
        sys.exit('The Tools fingerprint is out of date (files say %s and %s, the files are %s). Run: python3 tools/tools-rev.py --write' % (sw_rev, html_revs, now))
    print('Tools fingerprint is up to date:', now)
