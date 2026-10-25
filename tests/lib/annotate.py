#!/usr/bin/env python3
"""CI helper: passes a test's output through unchanged and turns every FAIL line (and the last line of a Python
traceback) into a GitHub annotation, so failures show on the run's summary page and through the API.
    python3 tests/x_test.py ... 2>&1 | python3 tests/lib/annotate.py "title"     (use with set -o pipefail)"""
import sys

title = (sys.argv[1] if len(sys.argv) > 1 else 'test').replace(',', ' ').replace(':', ' ')
esc = lambda s: s.replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')
tb = False; last = ''
for line in sys.stdin:
    sys.stdout.write(line); sys.stdout.flush()
    s = line.rstrip('\n')
    if s.startswith('FAIL '): print('::error title=%s::%s' % (title, esc(s[:900])), flush=True)
    if s.startswith('Traceback'): tb = True
    elif tb and s and not s.startswith(' '): last = s; tb = False
if last: print('::error title=%s (crash)::%s' % (title, esc(last[:900])), flush=True)
