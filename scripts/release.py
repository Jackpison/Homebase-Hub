#!/usr/bin/env python3
"""One command for the version bump of a release, and a check that everything agrees.

  python3 scripts/release.py X.Y.Z     raise the version to X.Y.Z (must be higher than HUB; the working tree must be clean):
                                     HUB in boot.php, every ?v= of the old version in src (not Tools' own fingerprints,
                                     not the changelog, not web/hub/docs/src), a "## X.Y.Z" changelog section and a Version Map
                                     row, both with a TODO marker for you to fill in, and the copy in the root CHANGELOG.md.
  python3 scripts/release.py --check   fail if HUB, the ?v= on every page, the newest changelog heading, the top Version Map
                                     row and the root CHANGELOG.md disagree, if a TODO marker is left, or if src/site-data exists.

Run the check before tagging. CI and the release workflow run it too.
"""
import os, re, subprocess, sys

ROOT = os.environ.get('HUB_REPO_ROOT') or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
BOOT = os.path.join(SRC, 'web', 'hub', 'core', 'lib', 'boot.php')
LOG = os.path.join(SRC, 'web', 'hub', 'docs', 'CHANGELOG.md')
ROOT_LOG = os.path.join(ROOT, 'CHANGELOG.md')
SKIP_DIRS = [os.path.join(SRC, 'web', 'tools', 'assets'), os.path.join(SRC, 'web', 'hub', 'docs', 'src')]
SKIP_FILES = [LOG]
TEXT = ('.html', '.php', '.js', '.css', '.json', '.txt', '.md', '.htaccess', '.webmanifest', '.svg')
SEMVER = re.compile(r'^\d+\.\d+\.\d+$')
MARK = 'TODO'


def ver(s): return tuple(int(x) for x in s.split('.'))
def read(p): return open(p, encoding='utf-8').read()
def write(p, t): open(p, 'w', encoding='utf-8', newline='').write(t)


def hub():
    m = re.search(r"define\('HUB', '([^']+)'\)", read(BOOT))
    if not m: sys.exit('release.py: no HUB in boot.php')
    return m.group(1)


def text_files():
    for dp, dn, fn in os.walk(SRC):
        if any(dp == d or dp.startswith(d + os.sep) for d in SKIP_DIRS):
            dn[:] = []; continue
        dn.sort()
        for f in sorted(fn):
            p = os.path.join(dp, f)
            if p in SKIP_FILES or not (f.endswith(TEXT) or f == '.htaccess'): continue
            yield p


def page_files():
    """The pages: they load the shell and their own assets with ?v=<HUB>."""
    out = [os.path.join(SRC, 'index.php')]
    web = os.path.join(SRC, 'web')
    for d in sorted(os.listdir(web)):
        for f in ('index.html', 'index.php', 'share.html'):
            p = os.path.join(web, d, f)
            if os.path.isfile(p): out.append(p)
    return [p for p in out if os.path.isfile(p)]


def page_versions(p):
    """Every ?v= on a page that is a version number (Tools' 8-hex fingerprints and ?v=<file time> are not)."""
    return [v for v in re.findall(r'\?v=([0-9][0-9A-Za-z.]*)', read(p)) if SEMVER.match(v)]


def newest_section(t):
    m = re.search(r'^## (\d+\.\d+\.\d+)[^\n]*\n(.*?)(?=^---\s*$|^## )', t, re.M | re.S)
    return (m.group(1), m.group(2)) if m else (None, '')


def top_map_row(t):
    m = re.search(r'^## Version Map\s*\n.*?^\| ---.*?\n(\|[^\n]*)', t, re.M | re.S)
    if not m: return None, ''
    cells = [c.strip() for c in m.group(1).strip('|').split('|')]
    return cells[0], ' | '.join(cells[1:])


def check():
    errs = []
    h = hub()
    if os.path.exists(os.path.join(SRC, 'site-data')):
        errs.append('src/site-data exists (running boot.php inside src/ makes it): delete it')
    for p in page_files():
        vs = page_versions(p)
        rel = os.path.relpath(p, ROOT)
        bad = sorted(set(v for v in vs if v != h))
        if bad: errs.append('%s loads ?v=%s, HUB is %s' % (rel, ', '.join(bad), h))
    t = read(LOG)
    nv, body = newest_section(t)
    if nv != h: errs.append('newest changelog heading is ## %s, HUB is %s' % (nv, h))
    mv, mtext = top_map_row(t)
    if mv != h: errs.append('top Version Map row is %s, HUB is %s' % (mv, h))
    if MARK in body or MARK in mtext:
        errs.append('a %s marker is left in the %s changelog section or its Version Map row' % (MARK, nv))
    if not os.path.isfile(ROOT_LOG) or read(ROOT_LOG) != t:
        errs.append('root CHANGELOG.md is not a copy of src/web/hub/docs/CHANGELOG.md')
    r = subprocess.run([sys.executable, os.path.join(ROOT, 'scripts', 'tools-rev.py'), '--check'], cwd=ROOT, capture_output=True, text=True)
    if r.returncode != 0: errs.append('Tools fingerprint is stale: run python3 scripts/tools-rev.py --write')
    if errs:
        for e in errs: print('FAIL ' + e)
        sys.exit(1)
    print('OK: version %s agrees everywhere (HUB, %d pages, changelog, Version Map, root copy).' % (h, len(page_files())))


def bump(new):
    if not SEMVER.match(new): sys.exit('release.py: the version must look like 1.45.0')
    old = hub()
    if ver(new) <= ver(old): sys.exit('release.py: %s is not higher than the current version %s' % (new, old))
    st = subprocess.run(['git', 'status', '--porcelain'], cwd=ROOT, capture_output=True, text=True)
    if st.returncode != 0: sys.exit('release.py: not a git working tree')
    if st.stdout.strip(): sys.exit('release.py: the working tree has uncommitted changes; commit or stash them first\n' + st.stdout)
    if os.path.exists(os.path.join(SRC, 'site-data')): sys.exit('release.py: delete src/site-data first')

    t = read(BOOT); write(BOOT, t.replace("define('HUB', '%s')" % old, "define('HUB', '%s')" % new, 1))
    n = 0
    for p in text_files():
        if p == BOOT: continue
        t = read(p)
        u = re.sub(r'\?v=' + re.escape(old) + r'(?![0-9A-Za-z.])', '?v=' + new, t)
        if u != t: write(p, u); n += 1

    t = read(LOG)
    t = re.sub(r'(^## Version Map\s*\n.*?^\| ---[^\n]*\n)', lambda m: m.group(1) + '| %s | %s: one line for this version |\n' % (new, MARK), t, count=1, flags=re.M | re.S)
    skel = '## %s\n\n### %s\n\n- %s: describe the changes in plain words.\n\n---\n\n' % (new, MARK, MARK)
    t = re.sub(r'^## \d+\.\d+\.\d+', lambda m: skel + m.group(0), t, count=1, flags=re.M)
    write(LOG, t); write(ROOT_LOG, t)

    r = subprocess.run([sys.executable, os.path.join(ROOT, 'scripts', 'tools-rev.py'), '--check'], cwd=ROOT)
    print('Version %s -> %s: HUB, ?v= in %d file(s), changelog skeleton and Version Map row (fill in the %s markers), root CHANGELOG.md.' % (old, new, n, MARK))
    if r.returncode != 0: sys.exit('Tools fingerprint is stale: run python3 scripts/tools-rev.py --write')


if __name__ == '__main__':
    a = sys.argv[1:]
    if a == ['--check']: check()
    elif len(a) == 1 and not a[0].startswith('-'): bump(a[0].lstrip('v'))
    else: sys.exit(__doc__)
