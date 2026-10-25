#!/usr/bin/env python3
"""Tests scripts/ci_status.py's decision (the release waits for CI and refuses unless every job passed), with made-up check runs.
  python3 tests/repo/ci_status_test.py"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'scripts'))
from ci_status import decide

res = []
def check(name, ok, extra=''):
    res.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok or not extra else '  -> ' + str(extra)))
def run(name, status='completed', conclusion='success'): return {'name': name, 'status': status, 'conclusion': conclusion}

GREEN = [run('ci-ok'), run('changes'), run('build (PHP 8.3)'), run('build (PHP 8.4)'), run('server (updates, hostile zips, core)'), run('browser (webkit)')]
check('C1 every job passed: ok', decide(GREEN)[0] == 'ok', decide(GREEN))
check('C2 one job failed: fail, and it is named', decide(GREEN + [run('apache (the .htaccess files)', conclusion='failure')]) == ('fail', 'CI failed on this commit: apache (the .htaccess files)'))
check('C3 a cancelled or timed-out job counts as failed', all(decide(GREEN + [run('x', conclusion=c)])[0] == 'fail' for c in ('cancelled', 'timed_out', 'action_required', 'stale')))
check('C4 a job still running: wait', decide(GREEN + [run('browser (firefox)', status='in_progress', conclusion=None)])[0] == 'wait')
check('C5 a failure wins over a job still running (no need to wait)', decide(GREEN + [run('a', 'in_progress', None), run('b', conclusion='failure')])[0] == 'fail')
check('C6 no check runs at all (CI never ran): wait, then the time limit refuses', decide([])[0] == 'wait')
check('C7 only other checks, no ci-ok yet: wait', decide([run('deploy (website, guides, latest.json)'), run('build (PHP 8.3)')])[0] == 'wait')
check('C8 skipped jobs count as passed (docs-only pushes)', decide(GREEN + [run('tests (browser)', conclusion='skipped')])[0] == 'ok')
check('C9 the release job itself and the website deploy are not counted', decide(GREEN + [run('build and publish the release', 'in_progress', None), run('deploy (website, guides, latest.json)', conclusion='failure')])[0] == 'ok')
print('\n%d/%d passed' % (sum(res), len(res)))
sys.exit(0 if all(res) else 1)
