#!/usr/bin/env python3
"""The build must not put a global helper in every page script (1.61.0): esbuild's --keep-names writes `var n=(T,S)=>Object.defineProperty(T,"name",...)`
at the top of each minified file. Page scripts are classic scripts that share one global scope, so one file's `n` replaced another's and the shell
failed with "Property description must be an object" on Info. This checks the build command, and (with a built zip) every minified script.
    python3 tests/repo/build_test.py [build/site-update-X.Y.Z.zip]"""
import os, re, sys, zipfile
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'tests', 'lib'))
from helpers import Checks
check = Checks()
src = open(os.path.join(ROOT, 'scripts', 'build.py'), encoding='utf-8').read()
check('B1 the build does not use --keep-names', '--keep-names' not in src)
if len(sys.argv) > 1:
    z = zipfile.ZipFile(sys.argv[1]); bad = []
    for n in z.namelist():
        if re.fullmatch(r'web/(?!tools/)[^/]+(/[^/]+)*/assets/[^/]+\.js', n) and '/vendor/' not in n:
            t = z.read(n).decode('utf-8', 'ignore')
            if re.search(r'=Object\.defineProperty;var \w+=\(\w+,\w+\)=>\w+\(\w+,"name"', t): bad.append(n)
    check('B2 no minified page script carries the name helper (%d checked)' % len([n for n in z.namelist() if n.endswith('.js') and '/assets/' in n and '/vendor/' not in n and not n.startswith('web/tools/')]), not bad, bad)
sys.exit(check.done())
