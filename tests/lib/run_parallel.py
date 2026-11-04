#!/usr/bin/env python3
"""CI helper: runs several tests at the same time, then prints each one's output in the order given, so the log reads like a
sequential run. Every browser test has its own port and its own /tmp/site<port> folder, so they do not collide. A test that must run
alone (a timing test) goes in its own call with -j 1. The exit code is 1 when any test failed. Output goes through annotate.py,
so a FAIL line still becomes a GitHub annotation.
    python3 tests/lib/run_parallel.py -j 3 "title|tests/browser/x_test.py build/site-update-*.zip --browser chromium" ...
A word with * in it is expanded like a shell would (the zip's name has a version in it).
--retry 1 (CI): a test that failed runs once more, alone, after the others. Passing then, it counts as passed, but its first try is
shown as warnings and named in a "flaky" warning (and in the job summary), so a test that needs the second try is never hidden.
A real failure fails twice and stays red. More than one retry is refused: a test that needs more is broken."""
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


def show(title, out, warn=False):
    subprocess.run([sys.executable, os.path.join(HERE, 'annotate.py'), title] + (['--warning'] if warn else []), input=out, text=True)


def main(argv):
    jobs, retry, specs = 2, 0, []
    it = iter(argv)
    for a in it:
        if a == '-j': jobs = max(1, int(next(it)))
        elif a == '--retry': retry = int(next(it))
        else: specs.append(a)
    if not specs: sys.exit(__doc__)
    if retry not in (0, 1): sys.exit('--retry is 0 or 1: a test that needs more than one second try is broken, not unlucky')
    t0 = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=jobs) as ex:
        results = list(ex.map(one, specs))   # map keeps the order given, whichever test ends first
    # the second try: one at a time, so a test that only failed because others slowed it down gets the machine to itself
    again = {i: one(specs[i]) for i, r in enumerate(results) if r[1] != 0} if retry else {}
    bad, flaky = 0, []
    for i, (title, code, out, secs) in enumerate(results):
        if i in again and again[i][1] == 0:
            print('::group::%s (%d s, failed, then passed alone in %d s)' % (title, secs, again[i][3]), flush=True)
            print('--- first try ---', flush=True); show(title, out, warn=True)
            print('--- second try, alone ---', flush=True); show(title, again[i][2])
            print('::endgroup::', flush=True)
            fails = [l for l in out.splitlines() if l.startswith('FAIL ')] or [l for l in out.splitlines() if l.strip()][-1:]
            print('::warning title=%s (flaky)::failed once, passed when run again alone: %s' % (title.replace(':', ' '), ' | '.join(fails)[:700].replace('\n', ' ')), flush=True)
            flaky.append((title, fails[:3]))
            continue
        print('::group::%s (%d s, exit %d)' % (title, secs, code), flush=True)
        if i in again:
            print('--- first try ---', flush=True); show(title, out, warn=True)
            print('--- second try, alone: failed again ---', flush=True); show(title, again[i][2]); code = again[i][1]
        else: show(title, out)
        print('::endgroup::', flush=True)
        if code != 0: bad += 1
    print('%d of %d tests passed%s, %d s in all (one after another: %d s)' % (len(results) - bad, len(results),
          ' (%d only on a second try: %s)' % (len(flaky), ', '.join(f[0] for f in flaky)) if flaky else '', time.time() - t0, sum(r[3] for r in results)), flush=True)
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if flaky and summary:
        with open(summary, 'a') as f:
            f.write('### Passed only on a second try (flaky: fix the test)\n\n' + ''.join('- **%s**: %s\n' % (t, '; '.join(x[:200] for x in fl) or 'crashed') for t, fl in flaky) + '\n')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
