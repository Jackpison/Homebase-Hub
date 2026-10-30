#!/usr/bin/env python3
"""Tools' list (1.60): every tool in tools-app/src/tools.json has its file, a known section and icon, and its own check in
tests/browser/tools_test.py; scripts/new-tool.py adds a tool that passes all of that except the check you write.
  python3 tests/repo/tools_list_test.py"""
import importlib.util, json, os, re, shutil, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'tools-app', 'src')
res = []
def check(name, ok, extra=''):
    res.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok or not extra else '  -> ' + str(extra)[:400]))

data = json.load(open(os.path.join(SRC, 'tools.json'), encoding='utf-8'))
ids = [t['id'] for t in data['tools']]; cats = [c['id'] for c in data['categories']]
icons = set(re.findall(r'^\s*([a-z0-9]+):', open(os.path.join(SRC, 'icons.js'), encoding='utf-8').read(), re.M))
check('T1 every tool has its file tools/<id>.js, and every file is a tool', set(ids) == {f[:-3] for f in os.listdir(os.path.join(SRC, 'tools')) if f.endswith('.js')}, sorted(set(ids) ^ {f[:-3] for f in os.listdir(os.path.join(SRC, 'tools'))}))
check('T2 ids are unique, lower-case words with dashes', len(ids) == len(set(ids)) and all(re.match(r'^[a-z0-9]+(-[a-z0-9]+)*$', i) for i in ids))
bad = [t['id'] for t in data['tools'] if t['cat'] not in cats or t['icon'] not in icons or not t.get('name') or not t.get('desc')]
check('T3 every tool names a known section and icon, with a name and a description', not bad and all(c['icon'] in icons for c in data['categories']), bad)
css = open(os.path.join(SRC, 'styles.css'), encoding='utf-8').read()
check('T4 every section has its colour (dark and light) and its page accent', all(css.count('--c-%s:' % c) == 2 and '.c-%s{' % c in css and '.view[data-cat=%s]' % c in css for c in cats), [c for c in cats if css.count('--c-%s:' % c) != 2])
tt = open(os.path.join(ROOT, 'tests', 'browser', 'tools_test.py'), encoding='utf-8').read()
untested = [i for i in ids if not re.search(r"""['"/]%s['"]""" % re.escape(i), tt)]
check('T5 every tool has its own check in tests/browser/tools_test.py (named by its id)', not untested, untested)
main = open(os.path.join(SRC, 'main.js'), encoding='utf-8').read(); build = open(os.path.join(ROOT, 'tools-app', 'build.mjs'), encoding='utf-8').read()
check('T6 the list of tool modules is built from tools.json (no hand-kept LOAD table)', "import LOAD from './load.gen.js'" in main and '() => import(' not in main and 'load.gen.js' in build)
GONE = ('Password and UUID', 'Password & UUID', 'ZIP Creator', 'QR and Barcode Scanner', 'Stopwatch', 'zip-creator', 'qr-scanner', 'zxing')   # removed in 1.61.9
docs = ['README.md', 'tools-app/README.md', 'src/web/hub/docs/README.txt', 'scripts/site_pages.py', 'scripts/make-guide.py', 'scripts/make-site.py'] + ['website/content/' + f for f in os.listdir(os.path.join(ROOT, 'website', 'content'))]
stale = [(d, g) for d in docs for g in GONE if os.path.isfile(os.path.join(ROOT, d)) and g in open(os.path.join(ROOT, d), encoding='utf-8').read()]
check('T6b no document or website page names a tool that was removed (the list is src/tools.json, with no second copy)', not stale, stale)
# scripts/new-tool.py on a copy of tools-app/src
T = tempfile.mkdtemp(); os.makedirs(os.path.join(T, 'tools-app')); shutil.copytree(SRC, os.path.join(T, 'tools-app', 'src'))
os.environ['HUB_REPO_ROOT'] = T
spec = importlib.util.spec_from_file_location('nt', os.path.join(ROOT, 'scripts', 'new-tool.py')); nt = importlib.util.module_from_spec(spec); spec.loader.exec_module(nt)
f = nt.add('loan-test', 'Loan Test', 'calculators', 'calc', 'A test tool.', ['loan'])
d2 = json.load(open(os.path.join(T, 'tools-app', 'src', 'tools.json'), encoding='utf-8'))
check('T7 new-tool.py adds the line in tools.json and a starter file that uses the shared pieces', d2['tools'][-1]['id'] == 'loan-test' and os.path.isfile(f) and "from '../ui.js'" in open(f).read() and 'export default function (root)' in open(f).read())
refused = []
for a in (('Bad Id', 'X', 'calculators', 'calc', 'd'), ('loan-test', 'X', 'calculators', 'calc', 'd'), ('ok-one', 'X', 'nowhere', 'calc', 'd'), ('ok-two', 'X', 'calculators', 'nope', 'd')):
    try: nt.add(*a, []); refused.append(False)
    except SystemExit: refused.append(True)
check('T8 ...and refuses a bad id, a second tool with the same id, an unknown section or icon', all(refused), refused)
shutil.rmtree(T)
print('\n%d/%d passed' % (sum(res), len(res)))
sys.exit(0 if all(res) else 1)
