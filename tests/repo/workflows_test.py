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

check('W0 the workflow folder has the five workflows', {os.path.basename(f) for f in FILES} >= {'ci.yml', 'pages.yml', 'release.yml', 'weekly-check.yml', 'php-eol-reminder.yml'}, [os.path.basename(f) for f in FILES])
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
check('W9 on a docs-only change only the slow jobs skip; changes and build always run', sorted(gated) == ['apache', 'browsers', 'server', 'tests', 'visual'], gated)
print('\n%d/%d passed' % (sum(res), len(res)))
sys.exit(0 if all(res) else 1)
