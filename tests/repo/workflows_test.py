#!/usr/bin/env python3
"""Checks the GitHub workflow files (.github/workflows/*.yml) keep their safety settings:
every outside Action is pinned to a full commit SHA, every checkout drops the token from git's settings,
every job has a time limit, and npm never runs install scripts. Plain text checks, no YAML library needed.
  python3 tests/repo/workflows_test.py"""
import glob, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FILES = sorted(glob.glob(os.path.join(ROOT, '.github', 'workflows', '*.yml')))
res = []
def check(name, ok, extra=''):
    res.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok or not extra else '  -> ' + str(extra)[:400]))

def jobs(text):
    """{job id: the job's lines} for the jobs: block (job ids are indented two spaces)."""
    out, cur, inside = {}, None, False
    for line in text.split('\n'):
        if re.match(r'^jobs:\s*$', line): inside = True; continue
        if inside and re.match(r'^\S', line): inside = False
        if not inside: continue
        m = re.match(r'^  ([A-Za-z0-9_-]+):\s*$', line)
        if m: cur = m.group(1); out[cur] = []
        elif cur: out[cur].append(line)
    return out

check('W0 the workflow folder has the six workflows', {os.path.basename(f) for f in FILES} >= {'ci.yml', 'pages.yml', 'release.yml', 'weekly-check.yml', 'php-eol-reminder.yml', 'maintenance.yml'}, [os.path.basename(f) for f in FILES])
unpinned, nocred, notime, scripts = [], [], [], []
for f in FILES:
    name = os.path.basename(f); lines = open(f, encoding='utf-8').read().split('\n')
    for i, line in enumerate(lines):
        if re.search(r'\bnpm ci\b(?!.*--ignore-scripts)', line): scripts.append('%s:%d' % (name, i + 1))
        m = re.match(r'^\s*(?:-\s*)?uses:\s*([^\s#]+)', line)
        if not m or m.group(1).startswith('./'): continue
        if not re.match(r'^[^@\s]+@[0-9a-f]{40}$', m.group(1)): unpinned.append('%s:%d %s' % (name, i + 1, m.group(1)))
        if m.group(1).startswith('actions/checkout@'):
            # the next lines of the same step, up to the next step
            step = []
            for nxt in lines[i + 1:]:
                if re.match(r'^\s*-\s', nxt) or not nxt.startswith('        '): break
                step.append(nxt)
            if not any(re.search(r'persist-credentials:\s*false', s) for s in step): nocred.append('%s:%d' % (name, i + 1))
    for job, body in jobs('\n'.join(lines)).items():
        if not any(re.match(r'^    timeout-minutes:\s*\d+', b) for b in body): notime.append('%s: %s' % (name, job))
check('W1 every outside Action is pinned to a 40-character commit SHA', not unpinned, unpinned)
check('W2 every checkout has persist-credentials: false (no step needs the token kept in git)', not nocred, nocred)
check('W3 every job has a time limit (timeout-minutes)', not notime, notime)
check('W4 every npm ci has --ignore-scripts (no package runs its own install script)', not scripts, scripts)
bt = open(os.path.join(ROOT, 'scripts', 'build-tools.py'), encoding='utf-8').read()
check('W5 scripts/build-tools.py installs with --ignore-scripts too', "'--ignore-scripts'" in bt and not re.search(r"\['npm', 'ci'(?![^\]]*--ignore-scripts)", bt))
ci = open(os.path.join(ROOT, '.github', 'workflows', 'ci.yml'), encoding='utf-8').read()
check('W6 CI checks the committed Tools against a fresh build', 'scripts/build-tools.py --check' in ci)
rel = open(os.path.join(ROOT, '.github', 'workflows', 'release.yml'), encoding='utf-8').read()
check('W7 the release waits for CI and refuses unless every job passed, before it builds the zip', 'scripts/ci_status.py' in rel and 'checks: read' in rel and rel.index('scripts/ci_status.py') < rel.index('scripts/build.py'))
cij = jobs(ci)
others = [j for j in cij if j != 'ci-ok']
okbody = '\n'.join(cij.get('ci-ok', []))
m = re.search(r'needs:\s*\[([^\]]*)\]', okbody)
check('W8 ci-ok needs every other CI job and runs even when one failed (if: always())', m and sorted(x.strip() for x in m.group(1).split(',')) == sorted(others) and 'if: always()' in okbody, (m and m.group(1), others))
gated = [j for j in others if "if: needs.changes.outputs.code == 'true'" in '\n'.join(cij[j])]
check('W9 on a docs-only change only the slow jobs skip; changes and build always run', sorted(gated) == ['apache', 'browsers', 'server'], gated)
check('W10 browsers install in named steps, the Ubuntu packages with a time limit and retries (no --with-deps in one step)', '--with-deps' not in ci and ci.count('playwright install-deps') == 2 and ci.count('for i in 1 2 3') == 2)
mt = open(os.path.join(ROOT, '.github', 'workflows', 'maintenance.yml'), encoding='utf-8').read()
trig = mt[mt.index('\non:'):mt.index('\npermissions:')]
pushes = [l for l in mt.split('\n') if 'git push' in l]
check('W11 the monthly maintenance runs only on its schedule or by hand, and pushes only a maintenance/ branch (never main)',
      'schedule:' in trig and 'workflow_dispatch:' in trig and not any(x in trig for x in ('push:', 'pull_request', 'workflow_run', 'issue')) and 'permissions: {}' in mt
      and len(pushes) == 1 and 'refs/heads/${BRANCH}' in pushes[0] and 'BRANCH="maintenance/' in mt and 'case "$BRANCH" in maintenance/*)' in mt and 'main' not in pushes[0], pushes)
wk = open(os.path.join(ROOT, '.github', 'workflows', 'weekly-check.yml'), encoding='utf-8').read()
check('W12 the weekly check also tries the next PHP version (development build) and reports a break in its own issue', 'next-php:' in wk and "php-version: 'nightly'" in wk and 'tests/unit/run.php' in wk and '--label php' in wk)
cs = open(os.path.join(ROOT, '.github', 'workflows', 'code-scanning.yml'), encoding='utf-8').read()
check('W13 CodeQL and Semgrep run on every push to main and every pull request, and weekly; a Semgrep finding fails the run', all(x in cs for x in ('push:', 'pull_request:', 'schedule:', 'github/codeql-action/analyze@', 'semgrep scan', '--error', 'security-events: write')))
check('W14 CI runs the JavaScript type check', 'npx tsc -p tsconfig.json' in ci)
bj = '\n'.join(cij['browsers'])
ci_code = '\n'.join(l.split('   #')[0] for l in ci.split('\n') if not l.strip().startswith('#'))   # the comments may say Firefox
check('W15 CI runs the browser tests in Chromium and WebKit, each in two halves (pages, tools), side by side; Firefox and the visual report job are not in CI',
      'browser: [chromium, webkit]' in bj and 'part: [pages, tools]' in bj and not re.search(r'firefox', ci_code, re.I) and 'visual' not in cij,
      [x for x in ('firefox', 'visual') if x in ci_code.lower() or x in cij])
ff = open(os.path.join(ROOT, '.github', 'workflows', 'firefox-check.yml'), encoding='utf-8').read()
check('W16 Firefox runs on the 1st and 15th and by hand, runs the page tests and the accessibility check, and reports a failure in its own issue (label browsers)',
      "cron: '41 5 1,15 * *'" in ff and 'workflow_dispatch:' in ff and 'BROWSER: firefox' in ff and 'settings_look' in ff and 'a11y_test' in ff and 'website_test' in ff and '--label browsers' in ff
      and 'issues: write' in ff and 'timeout-minutes:' in ff and 'permissions: {}' in ff and not re.search(r'pull_request|push:', ff))
check('W17 CI runs the secret check', 'tests/repo/secrets_test.py' in ci)
check('W18 several browser tests run at once through run_parallel.py, and only the slow-phone test (it measures time) runs alone (-j 1)',
      bj.count('tests/lib/run_parallel.py -j 3') == 2 and bj.count('tests/lib/run_parallel.py -j 2') == 2 and 'run_parallel.py -j 1 "slow phone|' in bj and 'speed_test' not in bj.replace('run_parallel.py -j 1 "slow phone|tests/browser/speed_test.py', '') and 'tests/repo/parallel_test.py' in ci)
check('W19 CI lints the Python (ruff, pinned, rules in ruff.toml) and the build job reads enough history for the commit-message secret check',
      'ruff==' in ci and '/tmp/rf/bin/ruff check' in ci and os.path.isfile(os.path.join(ROOT, 'ruff.toml')) and re.search(r'fetch-depth: 50', '\n'.join(cij['build'])))
bad_names = []
for f in FILES:
    for i, line in enumerate(open(f, encoding='utf-8').read().split('\n')):
        m = re.match(r'^\s*(?:-\s+)?name:\s+(.*)$', line)
        if m and m.group(1)[:1] not in ('"', "'") and re.search(r':(\s|$)|\s#', m.group(1)): bad_names.append('%s:%d' % (os.path.basename(f), i + 1))
check('W20 no unquoted step or job name holds a colon and a space (or " #"): YAML reads that as a new key or a comment and CI does not start', not bad_names, bad_names)
print('\n%d/%d passed' % (sum(res), len(res)))
sys.exit(0 if all(res) else 1)
