#!/usr/bin/env python3
"""Tests scripts/ci_changes.py: which changes count as docs only (the slow CI jobs skip themselves), and that any doubt runs everything.
  python3 tests/repo/ci_changes_test.py"""
import os, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
from ci_changes import is_doc, code_changed, app_changed

res = []
def check(name, ok, extra=''):
    res.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok or not extra else '  -> ' + str(extra)))

check('X1 README, AGENTS, CONTRIBUTING, tests/README and an issue template are docs', all(is_doc(f) for f in ('README.md', 'AGENTS.md', '.github/CONTRIBUTING.md', 'tests/README.md', 'tools-app/README.md', '.github/ISSUE_TEMPLATE/bug_report.md', '.github/ISSUE_TEMPLATE/config.yml')))
check('X2 CHANGELOG.md is not docs (the release check reads it)', not is_doc('CHANGELOG.md'))
check('X3 anything in src/ is not docs, even .md (it ships)', not is_doc('src/web/hub/docs/README.txt') and not is_doc('src/web/hub/docs/THIRD-PARTY.md'))
check('X4 website, workflows, scripts, tests and code are not docs', not any(is_doc(f) for f in ('website/content/install.html', 'website/style.css', '.github/workflows/ci.yml', 'scripts/build.py', 'tests/browser/pages_test.py', 'tools-app/src/main.js', 'package.json')))
check('X5 only docs changed: the slow jobs skip', code_changed(['README.md', 'AGENTS.md']) is False)
check('X6 docs plus one code file: everything runs', code_changed(['README.md', 'src/web/links/assets/links.js']) is True)
check('X7 the changes could not be listed, or none were found: everything runs', code_changed(None) is True and code_changed([]) is True)

def run(env):
    e = dict(os.environ, **env)
    return subprocess.run([sys.executable, os.path.join(ROOT, 'scripts', 'ci_changes.py')], cwd=ROOT, env=e, capture_output=True, text=True).stdout.strip()
check('X12 the visual report runs when the site, Tools or the build changed', all(app_changed([f]) for f in ('src/web/home/index.php', 'tools-app/src/main.js', 'scripts/build.py', 'tests/browser/visual_compare.py')))
check('X13 ...and not for workflows, website, other tests or docs; any doubt makes it', not app_changed(['.github/workflows/ci.yml', 'website/style.css', 'tests/browser/pages_test.py', 'README.md']) and app_changed(None) and app_changed([]))
check('X8 a new branch (before = 000...), a manual run or an unknown base: code=true', run({'EVENT': 'push', 'BEFORE': '0' * 40}) == 'code=true\napp=true' and run({'EVENT': 'workflow_dispatch'}) == 'code=true\napp=true' and run({'EVENT': 'push', 'BEFORE': 'f' * 40}) == 'code=true\napp=true')
head = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=ROOT, capture_output=True, text=True).stdout.strip()
check('X9 the same commit as before (nothing changed): code=true (no doubt allowed)', run({'EVENT': 'push', 'BEFORE': head}) == 'code=true\napp=true')
import tempfile
with tempfile.TemporaryDirectory() as t:   # a tiny repo: one code commit, then a docs-only commit, then a code commit
    g = lambda *a: subprocess.run(['git', '-c', 'user.name=t', '-c', 'user.email=t@t', *a], cwd=t, capture_output=True, text=True, check=True).stdout.strip()
    g('init', '-q'); open(os.path.join(t, 'a.php'), 'w').write('1'); g('add', '-A'); g('commit', '-qm', 'code'); c1 = g('rev-parse', 'HEAD')
    open(os.path.join(t, 'README.md'), 'w').write('docs'); g('add', '-A'); g('commit', '-qm', 'docs'); c2 = g('rev-parse', 'HEAD')
    rt = lambda before: subprocess.run([sys.executable, os.path.join(ROOT, 'scripts', 'ci_changes.py')], cwd=t, env=dict(os.environ, EVENT='push', BEFORE=before), capture_output=True, text=True).stdout.strip()
    check('X10 a push of a docs-only commit: code=false, app=false', rt(c1) == 'code=false\napp=false', rt(c1))
    open(os.path.join(t, 'a.php'), 'w').write('2'); g('add', '-A'); g('commit', '-qm', 'code again')
    check('X11 a push of docs plus a later code commit: code=true', rt(c1).startswith('code=true') and rt(c2).startswith('code=true'))
print('\n%d/%d passed' % (sum(res), len(res)))
sys.exit(0 if all(res) else 1)
