#!/usr/bin/env python3
"""Waits for CI on one commit and says whether every job passed. The release workflow runs it before it builds the zip,
so a release is never built from a commit whose tests failed or never ran.
  python3 scripts/ci_status.py <commit sha> [--wait MINUTES]      (needs gh with GH_TOKEN and GH_REPO, or a logged-in gh)
Exit 0: every CI job passed (or was skipped). Exit 1: a job failed, CI never ran, or it was still running when time ran out."""
import json, subprocess, sys, time

REQUIRED = 'build (PHP 8.3)'                                  # always runs on a pushed commit: proof that CI ran at all
IGNORED = ('build and publish the release', 'deploy')         # the release itself, and the website deploy (not a test)
GOOD = ('success', 'skipped', 'neutral')


def decide(runs):
    """runs: [{'name', 'status', 'conclusion'}] -> ('ok' | 'wait' | 'fail', message)."""
    runs = [r for r in runs if not any(r['name'] == i or r['name'].startswith(i + ' ') for i in IGNORED)]
    bad = [r['name'] for r in runs if r['status'] == 'completed' and r['conclusion'] not in GOOD]
    if bad: return 'fail', 'CI failed on this commit: ' + ', '.join(sorted(bad))
    if not any(r['name'] == REQUIRED for r in runs): return 'wait', 'CI has not started on this commit yet'
    busy = [r['name'] for r in runs if r['status'] != 'completed']
    if busy: return 'wait', 'still running: ' + ', '.join(sorted(busy))
    return 'ok', 'every CI job passed (%d)' % len(runs)


def runs_of(sha):
    out = subprocess.run(['gh', 'api', '--paginate', 'repos/{owner}/{repo}/commits/%s/check-runs?per_page=100' % sha,
                          '--jq', '.check_runs[] | {name, status, conclusion}'], capture_output=True, text=True, check=True).stdout
    return [json.loads(line) for line in out.splitlines() if line.strip()]


if __name__ == '__main__':
    if len(sys.argv) < 2: sys.exit(__doc__)
    sha = sys.argv[1]
    minutes = float(sys.argv[sys.argv.index('--wait') + 1]) if '--wait' in sys.argv else 20
    end = time.time() + minutes * 60
    while True:
        try: state, msg = decide(runs_of(sha))
        except subprocess.CalledProcessError as e:   # GitHub did not answer, or does not know the commit: try again until time runs out
            state, msg = 'wait', 'could not read the check runs (%s)' % (e.stderr or '').strip()[:200]
        print(msg, flush=True)
        if state == 'ok': sys.exit(0)
        if state == 'fail': sys.exit(1)
        if time.time() > end: sys.exit('Gave up after %g minutes: %s' % (minutes, msg))
        time.sleep(30)
