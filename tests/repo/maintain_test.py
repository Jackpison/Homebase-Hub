#!/usr/bin/env python3
"""scripts/maintain.py (1.59, the monthly maintenance): which library versions it takes, and the changelog text it writes.
No network: npm is not asked.   python3 tests/repo/maintain_test.py"""
import importlib.util, json, os, shutil, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
res = []
def check(name, ok, extra=''):
    res.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok or not extra else '  -> ' + str(extra)[:400]))

T = tempfile.mkdtemp()
os.makedirs(os.path.join(T, 'src/web/hub/docs')); os.makedirs(os.path.join(T, 'build'))
os.environ['HUB_REPO_ROOT'] = T
spec = importlib.util.spec_from_file_location('maintain', os.path.join(ROOT, 'scripts', 'maintain.py')); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)

check('M1 takes the newest finished version with the same major', m.pick('1.30.0', ['1.29.0', '1.30.0', '1.30.2', '1.31.1', '1.32.0-dev.20261001', '2.0.0']) == ('1.31.1', '2.0.0'))
check('M2 never a beta, release candidate or nightly', m.pick('4.1.0', ['4.1.0', '4.2.0-rc.1', '4.2.0-beta', '5.0.0-alpha']) == (None, None))
check('M3 never an older version, even when npm calls it "latest" (tesseract.js-core 7.0.0 vs 6.1.2)', m.pick('7.0.0', ['6.1.2', '7.0.0']) == (None, None))
check('M4 a new major version is only listed, not taken', m.pick('1.17.1', ['1.17.1', '2.0.0', '2.1.0']) == (None, '2.1.0'))
check('M5 a version that is not plain x.y.z is left alone', m.pick('^1.0.0', ['1.2.0']) == (None, None))
check('M6 the next version is the next patch', m.next_patch('1.59.0') == '1.59.1' and m.next_patch('1.9.9') == '1.9.10')
plan = {'updates': [['onnxruntime-web', '1.30.0', '1.31.1']], 'majors': [['pdf-lib', '1.17.1', '2.0.0']]}
t = m.notes(plan)
check('M7 the changelog text lists each update and what waits for a person', '### Maintenance' in t and 'onnxruntime-web 1.30.0 → 1.31.1' in t and 'pdf-lib 1.17.1 → 2.0.0' in t and 'Waiting for a person' in t, t)
check('M8 the Version Map line counts the updates', m.map_line(plan) == 'Maintenance: 1 Tools library updated' and m.map_line({'updates': []}) == 'Maintenance: 0 Tools libraries updated')
skel = '# Changelog\n\n| Version | What it brought |\n| --- | --- |\n| 1.59.1 | TODO: one line for this version |\n\n---\n\n## 1.59.1\n\n### TODO\n\n- TODO: describe the changes in plain words.\n\n---\n'
open(os.path.join(T, 'src/web/hub/docs/CHANGELOG.md'), 'w').write(skel)
json.dump(plan, open(os.path.join(T, 'build/maintenance.json'), 'w'))
m.cmd_notes()
out = open(os.path.join(T, 'src/web/hub/docs/CHANGELOG.md')).read()
check('M9 notes fills both TODO markers that release.py leaves, and copies the changelog to the root', 'TODO' not in out and '| 1.59.1 | Maintenance: 1 Tools library updated |' in out and out == open(os.path.join(T, 'CHANGELOG.md')).read(), out)
rel = open(os.path.join(ROOT, 'scripts', 'release.py'), encoding='utf-8').read()
check('M10 the markers it fills are the ones scripts/release.py writes', "MARK = 'TODO'" in rel and '%s: one line for this version' in rel and "'## %s\\n\\n### %s\\n\\n- %s: describe the changes in plain words.\\n" in rel)
wf = open(os.path.join(ROOT, '.github', 'workflows', 'maintenance.yml'), encoding='utf-8').read()
check('M11 the workflow runs it: plan, apply, rebuild Tools, version, notes, check', all(x in wf for x in ['scripts/maintain.py plan', 'scripts/maintain.py apply', 'scripts/build-tools.py --install', 'scripts/release.py "$NEXT"', 'scripts/maintain.py notes', 'scripts/release.py --check']))
shutil.rmtree(T)
print('\n%d/%d passed' % (sum(res), len(res)))
sys.exit(0 if all(res) else 1)
