#!/usr/bin/env python3
"""The animated Home backgrounds (1.74.0): React Bits components run without React, built by scripts/build-designs.py.
  * the built files are what the sources make (no source changed after the last build), nothing built without a source or a list entry
  * every file keeps the React Bits licence banner, and none of them can reach another server or run text as code (the security policy)
  * each is small enough to load on its own; the zip carries the built files and the list, never the sources
    python3 tests/repo/designs_test.py [build/site-update-X.Y.Z.zip]"""
import json, os, re, subprocess, sys, zipfile
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'tests', 'lib'))
from helpers import Checks
check = Checks()
SRC = os.path.join(ROOT, 'src/web/home/designs-src'); OUT = os.path.join(ROOT, 'src/web/home/designs')
reg = json.load(open(os.path.join(OUT, 'designs.json')))
srcs = sorted(d for d in os.listdir(SRC) if os.path.isdir(os.path.join(SRC, d)))
built = sorted(f[:-3] for f in os.listdir(OUT) if f.endswith('.js'))
mk = subprocess.run([sys.executable, os.path.join(ROOT, 'scripts', 'build-designs.py'), '--check'], capture_output=True, text=True)
check('D1 the built designs are what their sources make (run scripts/build-designs.py after a change)', mk.returncode == 0, (mk.stderr or mk.stdout).strip())
check('D2 the list, the sources and the built files name the same %d designs' % len(reg), sorted(reg) == srcs == built, (sorted(reg), srcs, built))
bad = [i for i in built if not open(os.path.join(OUT, i + '.js'), encoding='utf-8').read().startswith('/*! From React Bits by David Haz')]
check('D3 every built file keeps the React Bits banner (its licence is not the GPL)', not bad, bad)
glass = open(os.path.join(ROOT, 'src/web/hub/core/assets/glass.js'), encoding='utf-8').read()
check('D4 the full React Bits licence text is in the repository (glass.js) for the banner to point at', 'MIT + Commons Clause' in glass and 'Commons Clause Restriction' in glass)
risky = {}
for i in built:
    t = open(os.path.join(OUT, i + '.js'), encoding='utf-8').read()
    hit = [w for w in ('eval(', 'new Function(', 'fetch(', 'XMLHttpRequest', 'importScripts', 'sendBeacon', 'WebSocket(', 'document.write(') if w in t]
    hit += ['url:' + u for u in set(re.findall(r'https?://[A-Za-z0-9./_-]+', t.split('*/', 1)[1])) if not re.match(r'https?://(www\.w3\.org|reactbits\.dev)', u)]
    if hit: risky[i] = hit
check('D5 no design runs text as code (eval, new Function) or talks to another server (fetch, XHR, beacon, socket, a web address)', not risky, risky)
big = {i: os.path.getsize(os.path.join(OUT, i + '.js')) for i in built if os.path.getsize(os.path.join(OUT, i + '.js')) > (800000 if reg[i]['desktop'] else 120000)}
check('D6 a design for every device stays under 120 KB, a computers-only one under 800 KB', not big, big)
heavy = [i for i in built if os.path.getsize(os.path.join(OUT, i + '.js')) > 120000]
check('D7 whatever is over 120 KB is marked computers only (it is never offered or fetched on a phone)', all(reg[i]['desktop'] for i in heavy), heavy)
check('D8 each design has a built file with a settings list', all(os.path.isfile(os.path.join(OUT, i + '.js')) and reg[i]['options'] for i in reg))
if len(sys.argv) > 1:
    z = zipfile.ZipFile(sys.argv[1]); names = z.namelist()
    have = sorted(n[len('web/home/designs/'):-3] for n in names if n.startswith('web/home/designs/') and n.endswith('.js'))
    check('D9 the zip carries every built design and the list, and no source (%d files)' % len(have), have == built and 'web/home/designs/designs.json' in names and not [n for n in names if 'designs-src' in n], (have, [n for n in names if 'designs-src' in n]))
sys.exit(check.done())
