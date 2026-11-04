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
# --retry 1: a test that fails once and then passes counts as passed, but loudly; one that fails twice stays red
mark = os.path.join(d, 'tried')
flaky = script('e_test.py', 'import os, sys\nm = %r\nif not os.path.exists(m):\n    open(m, "w").close(); print("FAIL e1 too early"); sys.exit(1)\nprint("PASS e1")' % mark)
summ = os.path.join(d, 'summary.md')
os.environ['GITHUB_STEP_SUMMARY'] = summ
code, out, _ = run('-j', '2', '--retry', '1', 'ok|' + slow_b, 'shaky|' + flaky)
check('P9 --retry 1: a test that fails once, then passes alone, passes; its first FAIL is a warning, never an error',
      code == 0 and '::warning title=shaky::FAIL e1 too early' in out and '::error' not in out and 'PASS e1' in out, (code, out))
check('P10 ...and it is named: a "flaky" warning, the summary line, and the job summary', '::warning title=shaky (flaky)::' in out and
      '2 of 2 tests passed (1 only on a second try: shaky)' in out and 'shaky' in open(summ).read(), (out, os.path.exists(summ) and open(summ).read()))
code, out, _ = run('-j', '2', '--retry', '1', 'bad|' + fail)
check('P11 --retry 1: a test that fails twice stays red (exit 1, an error from the second try)', code == 1 and '::error title=bad::FAIL c2 something broke' in out and
      '::warning title=bad::FAIL c2 something broke' in out and 'failed again' in out and '0 of 1 tests passed' in out, (code, out))
os.remove(mark)
code, out, _ = run('-j', '2', 'shaky|' + flaky)
check('P12 without --retry nothing is tried again (a local run shows every failure)', code == 1 and '::error title=shaky::FAIL e1 too early' in out, (code, out))
code, out, _ = run('--retry', '2', 'ok|' + slow_b)
check('P13 more than one retry is refused', code != 0 and 'retry' in out, (code, out))
ci = open(os.path.join(ROOT, '.github', 'workflows', 'ci.yml')).read()
calls = [l for l in ci.splitlines() if 'run_parallel.py' in l and not l.strip().startswith('#')]
check('P14 CI gives every browser batch exactly one retry (--retry 1), never more', calls and all('--retry 1' in l for l in calls) and '--retry 2' not in ci, calls)
print('\n%d/%d passed' % (sum(res), len(res)))
sys.exit(0 if all(res) else 1)
