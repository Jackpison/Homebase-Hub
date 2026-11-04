#!/usr/bin/env python3
"""scripts/overrides.py (1.72.0): it says when an npm override in package.json is no longer needed, and never says so by mistake.
  python3 tests/repo/overrides_test.py"""
import importlib.util, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
spec = importlib.util.spec_from_file_location('overrides', os.path.join(ROOT, 'scripts', 'overrides.py'))
ov = importlib.util.module_from_spec(spec); spec.loader.exec_module(ov)
res = []
def check(name, ok, extra=''):
    res.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok or not extra else '  -> ' + str(extra)[:600]))

cases = [('11.0.4', '^10.2.5', False), ('11.0.4', '^11.0.1', True), ('11.0.4', '>=10 <12', True), ('11.0.4', '^10 || ^11', True), ('11.0.4', '~11.0.0', True),
         ('11.0.4', '~11.1.0', False), ('0.2.5', '^0.2.3', True), ('0.3.0', '^0.2.3', False), ('11.0.4', '11.0.4', True), ('11.0.4', '11.x', True),
         ('11.0.4', '*', True), ('11.0.4', 'github:foo/bar', False), ('11.0.4', '<11.0.1', False)]
bad = [c for c in cases if ov.satisfies(c[0], c[1]) != c[2]]
check('O1 version ranges: ^, ~, >=, <, x, *, exact and || read correctly; an unknown range never counts as accepted', not bad, bad)

lock = {'packages': {'': {}, 'node_modules/eslint': {'dependencies': {'minimatch': '^10.2.5'}}, 'node_modules/@eslint/config-array': {'dependencies': {'minimatch': '^11.0.1'}}}}
r = ov.report({'overrides': {'minimatch': '11.0.4'}}, lock)
check('O2 one package still asks for the old version: the override is still needed', r and r[0][3] == 'still needed', r)
lock['packages']['node_modules/eslint']['dependencies']['minimatch'] = '^11.0.0'
r = ov.report({'overrides': {'minimatch': '11.0.4'}}, lock)
check('O3 every package accepts the pinned version by itself: the override can go', r and r[0][3] == 'can go', r)
check('O4 no overrides: nothing to report', ov.report({}, lock) == [])

wf = open(os.path.join(ROOT, '.github', 'workflows', 'scheduled.yml')).read()
check('O5 the weekly security check (scheduled.yml) runs scripts/overrides.py --github (a notice, never a failure)', 'scripts/overrides.py --github' in wf)

print('\n%d/%d passed' % (sum(res), len(res)))
sys.exit(0 if all(res) else 1)
