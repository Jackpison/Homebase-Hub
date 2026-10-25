#!/usr/bin/env python3
"""Tests tests/lib/releases.py's choice of the previous release (the update test's and the visual report's PREVIOUS zip),
with made-up tag lists: the newest release older than the build, compared as numbers, not text.
  python3 tests/repo/releases_test.py"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from releases import previous, ver

res = []
def check(name, ok, extra=''):
    res.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok or not extra else '  -> ' + str(extra)))

T = ['v1.37.0', 'v1.48.9', 'v1.49.0', 'v1.50.0', 'v1.9.3']
check('R1 a build of the released version gets the release before it', previous('1.50.0', T) == 'v1.49.0')
check('R2 a build of the next version gets the newest release', previous('1.50.1', T) == 'v1.50.0' and previous('1.51.0', T) == 'v1.50.0')
check('R3 versions compare as numbers (1.10 is newer than 1.9)', previous('1.10.0', T) == 'v1.9.3' and ver('v1.10.0') > ver('v1.9.3'))
try: previous('1.0.0', T); ok = False
except SystemExit: ok = True
check('R4 nothing older: a clear stop, not a wrong zip', ok)
print('\n%d/%d passed' % (sum(res), len(res)))
sys.exit(0 if all(res) else 1)
