#!/usr/bin/env python3
"""Tests tests/lib/run_parallel.py, the helper that runs CI's browser tests side by side: tests overlap in time, output comes back in the
order given, a failure and a crash give exit code 1 and a GitHub annotation, a word with * is expanded, and -j 1 runs one after another.
  python3 tests/repo/parallel_test.py"""
import os, subprocess, sys, tempfile, time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RP = os.path.join(ROOT, 'tests', 'lib', 'run_parallel.py')
res = []
def check(name, ok, extra=''):
    res.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok or not extra else '  -> ' + str(extra)[:400]))

def run(*args):
    t0 = time.time()
    p = subprocess.run([sys.executable, RP] + list(args), capture_output=True, text=True)
    return p.returncode, p.stdout + p.stderr, time.time() - t0

d = tempfile.mkdtemp()
def script(name, body):
    path = os.path.join(d, name); open(path, 'w').write(body); return path
slow_a = script('a_test.py', 'import time; time.sleep(1.5); print("PASS a done")')
slow_b = script('b_test.py', 'import time; time.sleep(0.5); print("PASS b done")')
fail = script('c_test.py', 'print("PASS c1"); print("FAIL c2 something broke"); raise SystemExit(1)')
crash = script('d_test.py', 'raise ValueError("boom")')

code, out, secs = run('-j', '2', 'alpha|' + slow_a, 'beta|' + slow_b)
check('P1 two tests run at the same time (about 1.5 s, not 2 s)', code == 0 and secs < 1.95, (code, round(secs, 2)))
check('P2 the output comes back in the order given, even though beta ends first', out.index('alpha') < out.index('beta') and out.index('PASS a done') < out.index('PASS b done'), out)
check('P3 each test is in its own log group, and the summary counts them', '::group::alpha' in out and '::group::beta' in out and '2 of 2 tests passed' in out, out)
code, out, secs = run('-j', '1', 'alpha|' + slow_a, 'beta|' + slow_b)
check('P4 -j 1 runs one after another (2 s or more)', code == 0 and secs >= 1.95, (code, round(secs, 2)))
code, out, _ = run('-j', '2', 'ok|' + slow_b, 'bad|' + fail)
check('P5 a failing test gives exit code 1 and a GitHub annotation, and the other test is still reported', code == 1 and '::error title=bad::FAIL c2 something broke' in out and 'PASS b done' in out and '1 of 2 tests passed' in out, (code, out))
code, out, _ = run('-j', '2', 'boom|' + crash)
check('P6 a crash gives exit code 1 and an annotation with the error line', code == 1 and '::error title=boom (crash)::ValueError: boom' in out, (code, out))
code, out, _ = run('-j', '2', 'glob|' + os.path.join(d, '[ab]_test.p*') + ' ')
check('P7 a word with * is expanded like a shell would', code == 0 and 'PASS' in out, (code, out))
code, out, _ = run()
check('P8 no tests: it shows how to use it and does not pass quietly', code != 0)
print('\n%d/%d passed' % (sum(res), len(res)))
sys.exit(0 if all(res) else 1)
