#!/usr/bin/env python3
"""The JavaScript type check (tsconfig.json) and the files that ask for it agree: every file that starts with // @ts-check is listed in
one of the tsconfig files (or it would be silently unchecked), and every listed file has the line. The check itself is `npx tsc -p tsconfig.json`.
  python3 tests/repo/tscheck_test.py"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
res = []
def check(name, ok, extra=''):
    res.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok or not extra else '  -> ' + str(extra)[:400]))

CONFIGS = ('tsconfig.json', 'tsconfig.links.json', 'tsconfig.home.json')   # the strict one, and one looser one for each page script
listed = [f for c in CONFIGS for f in json.load(open(os.path.join(ROOT, c)))['files'] if f.endswith('.js')]
flagged = []
for base in ('src', 'tools-app/src'):
    for d, _, fs in os.walk(os.path.join(ROOT, base)):
        if '/src/web/tools' in d.replace(os.sep, '/') + '/' and base == 'src': continue   # Tools' built bundles
        for f in fs:
            if f.endswith('.js') and re.search(r'^// @ts-check\s*$', open(os.path.join(d, f), encoding='utf-8', errors='ignore').read(), re.M):
                flagged.append(os.path.relpath(os.path.join(d, f), ROOT).replace(os.sep, '/'))
check('T1 there are files under the type check', len(listed) >= 2, listed)
check('T2 every file that starts with // @ts-check is listed in a tsconfig file', sorted(flagged) == sorted(listed), (sorted(flagged), sorted(listed)))
check('T3 the security-sensitive files are among them (Files, and the page a share link opens)', {'src/web/files/assets/files.js', 'src/web/files/assets/share.js'} <= set(listed))
print('%d/%d passed' % (sum(res), len(res)))
sys.exit(0 if all(res) else 1)
