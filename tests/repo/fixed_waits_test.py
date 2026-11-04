#!/usr/bin/env python3
"""Fixed pauses in the browser tests (page.wait_for_timeout, time.sleep) can only go down. A fixed pause is right on a busy computer
and wrong on a busier one (CI): most flaky failures in 2026 came from one. Wait for the thing itself instead: wait_js(), until(),
settle(), wait_for_selector(). A pause that proves "nothing happens" (a short wait, then a check that nothing changed) is fine,
but it has to replace another one: the numbers below are a ceiling per file.
When a file needs fewer, lower its number here (the test says so).
  python3 tests/repo/fixed_waits_test.py"""
import glob, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CEILING = {
 "a11y_test.py": 2,
 "files_test.py": 2,
 "import_test.py": 4,
 "importer_test.py": 3,
 "nav_test.py": 7,
 "offline_test.py": 5,
 "pages_test.py": 17,
 "passkey_test.py": 1,
 "polish_test.py": 62,
 "search_test.py": 7,
 "settings_look_test.py": 27,
 "settings_ui_test.py": 4,
 "speed_test.py": 7,
 "tabs_kit_test.py": 1,
 "tabs_lock_test.py": 3,
 "tasks_more_test.py": 5,
 "tools_test.py": 2,
 "website_test.py": 4,
 "windows_test.py": 4
}
bad, lower = [], []
for f in sorted(glob.glob(os.path.join(ROOT, 'tests', 'browser', '*.py'))):
    name = os.path.basename(f); n = len(re.findall(r'wait_for_timeout\(|time\.sleep\(', open(f, encoding='utf-8').read()))
    top = CEILING.get(name, 0)
    if n > top: bad.append('%s has %d fixed pauses, at most %d: wait for the thing itself (wait_js, until, settle)' % (name, n, top))
    elif n < top: lower.append('%s: %d now, lower its ceiling from %d' % (name, n, top))
for b in bad: print('FAIL ' + b)
for x in lower: print('NOTE ' + x)
print('PASS no browser test gained a fixed pause' if not bad else '')
print('\n%d/1 passed' % (0 if bad else 1))
sys.exit(1 if bad else 0)
