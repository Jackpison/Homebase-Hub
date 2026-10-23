#!/usr/bin/env python3
"""The Tools fingerprint: a short code of every file in web/tools/assets.
It goes into web/tools/sw.js (TOOLS_REV) and into the two ?v= on web/tools/index.html, so a browser's saved copy of the Tools files
is emptied and refilled exactly when one of them changed (and never otherwise).

  python3 tools/tools-rev.py --check     fails if the saved code is out of date (the build and CI run this)
  python3 tools/tools-rev.py --write     updates sw.js and index.html after you changed a Tools file
"""
import base64, hashlib, os, re, sys
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

def importmap(r):
    """Chunks import ./index-ToolsAll.js while the page loads it with ?v=: without this map the browser would load it twice (two copies of React)."""
    return '{"imports":{"./assets/index-ToolsAll.js":"./assets/index-ToolsAll.js?v=%s"}}' % r

def csp_hash(text): return "'sha256-%s'" % base64.b64encode(hashlib.sha256(text.encode()).digest()).decode()

def saved():
    sw = open(os.path.join(T, 'sw.js'), encoding='utf-8').read()
    html = open(os.path.join(T, 'index.html'), encoding='utf-8').read()
    return re.search(r"const TOOLS_REV = '([0-9a-f]{8})'", sw).group(1), re.findall(r'\?v=([0-9a-f]{8})', html)

if __name__ == '__main__':
    now = rev(); sw_rev, html_revs = saved()
    if '--write' in sys.argv:
        p = os.path.join(T, 'sw.js'); t = open(p, encoding='utf-8').read(); open(p, 'w', encoding='utf-8').write(re.sub(r"(const TOOLS_REV = ')[0-9a-f]{8}(')", r'\g<1>' + now + r'\g<2>', t))
        p = os.path.join(T, 'index.html'); t = open(p, encoding='utf-8').read(); t = re.sub(r'\?v=[0-9a-f]{8}', '?v=' + now, t)
        t = re.sub(r'<script type="importmap">[^<]*</script>', '<script type="importmap">' + importmap(now) + '</script>', t); open(p, 'w', encoding='utf-8').write(t)
        p = os.path.join(T, '.htaccess'); t = open(p, encoding='utf-8').read()   # the security policy allows exactly this import map
        t = re.sub(r"script-src 'self'( 'sha256-[A-Za-z0-9+/=]+')?", "script-src 'self' " + csp_hash(importmap(now)), t, count=1); open(p, 'w', encoding='utf-8').write(t)
        print('Tools fingerprint:', now); sys.exit(0)
    html = open(os.path.join(T, 'index.html'), encoding='utf-8').read(); ht = open(os.path.join(T, '.htaccess'), encoding='utf-8').read()
    if '<script type="importmap">' + importmap(now) + '</script>' not in html or csp_hash(importmap(now)) not in ht:
        sys.exit('The Tools import map or its security-policy hash is out of date. Run: python3 tools/tools-rev.py --write')
    if sw_rev != now or any(h != now for h in html_revs) or len(html_revs) != 3:
        sys.exit('The Tools fingerprint is out of date (files say %s and %s, the files are %s). Run: python3 tools/tools-rev.py --write' % (sw_rev, html_revs, now))
    print('Tools fingerprint is up to date:', now)
