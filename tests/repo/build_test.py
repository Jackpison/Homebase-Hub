#!/usr/bin/env python3
"""The build must not put a global helper in every page script (1.61.0): esbuild's --keep-names writes `var n=(T,S)=>Object.defineProperty(T,"name",...)`
at the top of each minified file. Page scripts are classic scripts that share one global scope, so one file's `n` replaced another's and the shell
failed with "Property description must be an object" on Info. This checks the build command, and (with a built zip) every minified script.
    python3 tests/repo/build_test.py [build/site-update-X.Y.Z.zip]"""
import os, re, subprocess, sys, zipfile
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'tests', 'lib'))
from helpers import Checks
check = Checks()
src = open(os.path.join(ROOT, 'scripts', 'build.py'), encoding='utf-8').read()
check('B1 the build does not use --keep-names', '--keep-names' not in src)
# (1.74.0) shell-admin.js is made from the labelled parts in assets/admin/ (scripts/make-admin.py); the parts are never shipped
mk = subprocess.run([sys.executable, os.path.join(ROOT, 'scripts', 'make-admin.py'), '--check'], capture_output=True, text=True)
check('B3 shell-admin.js is exactly what the parts in assets/admin/ make (run scripts/make-admin.py after editing a part)', mk.returncode == 0, (mk.stderr or mk.stdout).strip())
parts = sorted(f for f in os.listdir(os.path.join(ROOT, 'src/web/hub/core/assets/admin')) if f.endswith('.js'))
check('B4 the parts are numbered in join order, each one is a real file with content (%d parts)' % len(parts), len(parts) >= 10 and parts == sorted(parts) and all(re.match(r'\d\d-[a-z-]+\.js$', p) for p in parts))
# (1.79.5) the five big page scripts are made from labelled parts too (scripts/make-parts.py); the parts are never shipped
mp = subprocess.run([sys.executable, os.path.join(ROOT, 'scripts', 'make-parts.py'), '--check'], capture_output=True, text=True)
check('B6 shell.js, home app.js, tasks.js, links.js and info.js are exactly what their parts make (run scripts/make-parts.py after editing a part)', mp.returncode == 0, (mp.stderr or mp.stdout).strip())
PART_DIRS = ['hub/core/assets/shell', 'home/assets/app', 'tasks/assets/tasks', 'links/assets/links', 'info/assets/info']
pp = {d: sorted(f for f in os.listdir(os.path.join(ROOT, 'src/web', d)) if f.endswith('.js')) for d in PART_DIRS}
check('B7 each of the five has 8 or more numbered parts, in join order (%s)' % ', '.join('%s %d' % (d.split('/')[-1], len(v)) for d, v in pp.items()),
      all(len(v) >= 8 and all(re.match(r'\d\d-[a-z0-9-]+\.js$', x) for x in v) and v[0].startswith('00-head') for v in pp.values()))
if len(sys.argv) > 1:
    z = zipfile.ZipFile(sys.argv[1]); bad = []
    for n in z.namelist():
        if re.fullmatch(r'web/(?!tools/)[^/]+(/[^/]+)*/assets/[^/]+\.js', n) and '/vendor/' not in n:
            t = z.read(n).decode('utf-8', 'ignore')
            if re.search(r'=Object\.defineProperty;var \w+=\(\w+,\w+\)=>\w+\(\w+,"name"', t): bad.append(n)
    check('B5 the zip carries shell-admin.js but not its parts', 'web/hub/core/assets/shell-admin.js' in z.namelist() and not [n for n in z.namelist() if '/assets/admin/' in n], [n for n in z.namelist() if '/assets/admin/' in n])
    check('B8 the zip carries the five joined scripts but none of their parts', all(('web/' + d.rsplit('/', 1)[0] + '/' + d.rsplit('/', 1)[1] + '.js') in z.namelist() for d in PART_DIRS) and not [n for n in z.namelist() if any(('web/' + d + '/') in n for d in PART_DIRS)], [n for n in z.namelist() if any(('web/' + d + '/') in n for d in PART_DIRS)][:5])
    check('B2 no minified page script carries the name helper (%d checked)' % len([n for n in z.namelist() if n.endswith('.js') and '/assets/' in n and '/vendor/' not in n and not n.startswith('web/tools/')]), not bad, bad)
sys.exit(check.done())
