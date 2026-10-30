#!/usr/bin/env python3
"""CI helper: runs several tests at the same time, then prints each one's output in the order given, so the log reads like a
sequential run. Every browser test has its own port and its own /tmp/site<port> folder, so they do not collide. A test that must run
alone (a timing test) goes in its own call with -j 1. The exit code is 1 when any test failed. Output goes through annotate.py,
so a FAIL line still becomes a GitHub annotation.
    python3 tests/lib/run_parallel.py -j 3 "title|tests/browser/x_test.py build/site-update-*.zip --browser chromium" ...
A word with * in it is expanded like a shell would (the zip's name has a version in it)."""
import concurrent.futures, glob, os, shlex, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))


def expand(words):
    out = []
    for w in words:
        hits = sorted(glob.glob(w)) if '*' in w else []
        out.extend(hits or [w])
    return out


def one(spec):
    title, _, cmd = spec.partition('|')
    t0 = time.time()
    p = subprocess.run([sys.executable] + expand(shlex.split(cmd)), cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    return title.strip(), p.returncode, p.stdout, time.time() - t0


def main(argv):
    jobs, specs = 2, []
    it = iter(argv)
    for a in it:
        if a == '-j': jobs = max(1, int(next(it)))
        else: specs.append(a)
    if not specs: sys.exit(__doc__)
    t0 = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=jobs) as ex:
        results = list(ex.map(one, specs))   # map keeps the order given, whichever test ends first
    bad = 0
    for title, code, out, secs in results:
        print('::group::%s (%d s, exit %d)' % (title, secs, code), flush=True)
        subprocess.run([sys.executable, os.path.join(HERE, 'annotate.py'), title], input=out, text=True)
        print('::endgroup::', flush=True)
        if code != 0: bad += 1
    print('%d of %d tests passed, %d s in all (one after another: %d s)' % (len(results) - bad, len(results), time.time() - t0, sum(r[3] for r in results)), flush=True)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
