#!/usr/bin/env python3
"""The shared test helpers that decide what counts as a page error (tests/lib/helpers.py): only two browser notices are left out,
and only in their exact form. Any other error, and a "cancelled" message for another server's address, still fails a test.
  python3 tests/repo/helpers_test.py"""
import os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'tests', 'lib'))
from helpers import harmless, cancelled_by_navigation   # noqa: E402

res = []
def check(name, ok, extra=''):
    res.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok or not extra else '  -> ' + str(extra)[:400]))

ours = ['Fetch API cannot load http://127.0.0.1:8979/web/hub/core/api.php?action=changelog&latest=1 due to access control checks.',
        '/127.0.0.1:8977/web/hub/share-sw.js due to access control checks', 'XMLHttpRequest cannot load http://localhost:8980/web/links/api.php due to access control checks.']
check('H1 a request to the test site that a page change cut off (WebKit) is not a page error', all(cancelled_by_navigation(m) for m in ours), ours)
check('H2 WebKit\'s "ResizeObserver loop" notice is not a page error', harmless('ResizeObserver loop completed with undelivered notifications.'))
real = ['Fetch API cannot load https://evil.example/x due to access control checks.', 'Fetch API cannot load http://127.0.0.2:80/x due to access control checks.',
        'TypeError: null is not an object (evaluating \'document.querySelector("#x").value\')', 'http://127.0.0.1:8979/x failed to load',
        'ReferenceError: due is not defined', 'Fetch API cannot load http://127.0.0.1.evil.example/x due to access control checks.']
check('H3 every other error still counts: another address, a script error, a failed load', not any(harmless(m) for m in real), [m for m in real if harmless(m)])

used = 0
for f in os.listdir(os.path.join(ROOT, 'tests', 'browser')):
    if f.endswith('_test.py') and f != 'website_test.py':   # the public website counts every error, notices included
        t = open(os.path.join(ROOT, 'tests', 'browser', f)).read()
        used += t.count('page_errors(')
        if "on('pageerror'" in t: res.append(False); print('FAIL H4 %s collects page errors by hand: use page_errors() from helpers.py' % f)
check('H4 the browser tests collect page errors through page_errors() (one rule for all)', used >= 30, used)
print('\n%d/%d passed' % (sum(res), len(res)))
sys.exit(0 if all(res) else 1)
