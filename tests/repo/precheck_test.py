#!/usr/bin/env python3
"""scripts/precheck.py picks the right checks for what changed (the pre-push script). Pure logic only: nothing is run.
    python3 tests/repo/precheck_test.py"""
import importlib.util, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
spec = importlib.util.spec_from_file_location('precheck', os.path.join(ROOT, 'scripts', 'precheck.py'))
pc = importlib.util.module_from_spec(spec); spec.loader.exec_module(pc)
res = []
def check(name, ok, extra=''):
    res.append(ok); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok else '  -> %s' % (extra,)))

p, br, sv = pc.plan(['src/web/files/assets/files.js'], False, False)
check('PR1 a Files change runs the Files browser test, lint and types', br == ['files_test'] and {'ESLint', 'TypeScript check'} <= {n for n, _ in p}, (br, [n for n, _ in p]))
p, br, sv = pc.plan(['src/web/hub/core/assets/admin/60-changelog.js', 'src/web/hub/core/assets/shell-admin.js'], False, False)
check('PR2 a Settings change runs the Settings tests', br[:3] == ['settings_test', 'settings_look_test', 'polish_test'], br)
p, br, sv = pc.plan(['src/web/hub/core/lib/update.php'], False, False)
check('PR3 update.php runs the update attack test and PHP unit tests', 'update_attack_test' in sv and 'PHP unit tests' in [n for n, _ in p], (sv, p))
p, br, sv = pc.plan(['src/web/files/assets/files.js'], True, False)
check('PR4 --fast runs no browser or server test', br == [] and sv == [])
p, br, sv = pc.plan(['docs/MAINTAINING.md'], False, False)
check('PR5 a docs-only change runs no browser test and no lint', br == [] and 'ESLint' not in [n for n, _ in p], (br, p))
p, br, sv = pc.plan(['tests/browser/files_test.py'], False, False)
check('PR6 a changed browser test runs itself (and ruff when installed)', br == ['files_test'], br)
p, br, sv = pc.plan(['src/web/home/assets/app.js'], False, False)
check('PR7 a Home change runs the pages test', br == ['pages_test'], br)
check('PR8 the version is read from boot.php text', pc.hub_version("define('HUB', '1.2.3');") == '1.2.3' and pc.hub_version('x') is None)
check('PR9 a file with no site change needs no bump', pc.version_problem(['docs/MAINTAINING.md']) is None)
print('\n%d/%d passed' % (sum(res), len(res)))
sys.exit(0 if all(res) else 1)
