#!/usr/bin/env python3
"""Looks for code that nothing uses, in the site's own files (src/, not the built Tools and not the bundled libraries):
a PHP function or constant, or a top-level JavaScript function, that is named nowhere else in src/ or tests/; and a CSS class that
no HTML, PHP or JavaScript file names. A class a script builds from pieces ("k-" + key) is listed in DYNAMIC below.
It also proves its own rules on small made-up samples.   python3 tests/repo/dead_code_test.py"""
import glob, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(ROOT)
res = []
def check(name, ok, extra=''):
    res.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok or not extra else '  -> ' + str(extra)[:600]))

# CSS classes a script builds from pieces: tasks.js ("s-" + status, "k-" + list, "gk-" + n, "mg r" + rows), the Settings page ("ix-tss-" + style),
# Cards ("h-" + column), Info ("c-" + colour name).
DYNAMIC = re.compile(r'^(gk-\d|k-[a-z]+|s-(late|paused|today|up)|r[56]|ix-tss-[a-z]+|h-(expiry|owner)|c-(red|orange|yellow|green|blue|purple|grey))$')
SKIP = ('src/web/tools/', '/vendor/')
IMG = ('.png', '.jpg', '.webp', '.woff2', '.pdf', '.heic', '.zip', '.ico', '.svg')


def read(f):
    try: return open(f, encoding='utf-8').read()
    except (UnicodeDecodeError, OSError): return ''


def php_names(text):
    funcs = re.findall(r'^\s*function\s+([A-Za-z_]\w*)\s*\(', text, re.M)
    consts = re.findall(r'^\s*const\s+([A-Z_][A-Z0-9_]*)\s*=', text, re.M) + re.findall(r"define\(\s*'([A-Z_][A-Z0-9_]*)'", text)
    return funcs, consts


def js_functions(text):
    return re.findall(r'^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(', text, re.M)


def css_classes(text):
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    return {c for sel in re.findall(r'([^{}@]+)\{', text) for c in re.findall(r'\.([A-Za-z_][\w-]*)', sel)}


IDENT = re.compile(r'(?<![\w$])([A-Za-z_$][\w$]*)')


def counts(blob, js=False):
    """How many times each name appears, counted once for the whole blob. In PHP a name after -> or :: is a method, not a function; in
    JavaScript a name after "x." is a property (but a spread ...name, or a call after =>, is a use)."""
    n = {}
    for m in IDENT.finditer(blob):
        a = m.start(1)
        before = blob[max(0, a - 2):a]
        if (js and re.search(r'[\w$)\]]\.$', before)) or (not js and before in ('->', '::')): continue
        n[m.group(1)] = n.get(m.group(1), 0) + 1
    return n


def mentions(name, blob, js=False):
    return counts(blob, js).get(name, 0)


# ---- the rules, proven on made-up samples ----
sample = '<?php\nconst USED_ONE = 1;\nconst LOST_ONE = 2;\nfunction used_fn() { return USED_ONE; }\nfunction lost_fn() {}\nused_fn();'
f, c = php_names(sample)
check('D1 the rules find a PHP function and a constant nothing else names',
      sorted(n for n in f if mentions(n, sample) <= 1) == ['lost_fn'] and sorted(n for n in c if mentions(n, sample) <= 1) == ['LOST_ONE'], (f, c))
check('D2 ...and a JavaScript function', [n for n in js_functions('function a() {}\nasync function b() { a(); }\nb();') if mentions(n, 'function a() {}\nasync function b() { a(); }\nb();', True) <= 1] == [], '')
check('D2b a call after => counts as a use, a property after a dot does not', mentions('go', 'const f = () => go(1);', True) == 1 and mentions('go', 'x.go(1);', True) == 0 and mentions('go', 'f(...go(1));', True) == 1 and mentions('go', 'x->go(1);') == 0, '')
check('D3 ...and a CSS class that nothing in the page names (a class built from pieces is on the list)',
      css_classes('.used{a:b}.lost-one{a:b} .k-today{a:b}') == {'used', 'lost-one', 'k-today'} and DYNAMIC.match('k-today') and not DYNAMIC.match('lost-one'))

# ---- the site ----
site = [f for f in glob.glob('src/**/*', recursive=True) if os.path.isfile(f) and not any(s in f for s in SKIP) and not f.endswith(IMG)]
every = site + [f for f in glob.glob('tests/**/*', recursive=True) if os.path.isfile(f) and not f.endswith(IMG)]
blob = '\n'.join(read(f) for f in every)
CNT_PHP, CNT_JS = counts(blob), counts(blob, True)
dead_php, dead_js = [], []
for f in site:
    if f.endswith('.php'):
        fn, cs = php_names(read(f))
        dead_php += ['%s %s' % (f.split('src/web/')[-1], n) for n in fn + cs if CNT_PHP.get(n, 0) <= 1]
    elif f.endswith('.js'):
        dead_js += ['%s %s' % (f.split('src/web/')[-1], n) for n in js_functions(read(f)) if CNT_JS.get(n, 0) <= 1]
check('D4 every PHP function and constant is used somewhere', not dead_php, dead_php)
check('D5 every top-level JavaScript function is used somewhere', not dead_js, dead_js)
nocss = '\n'.join(read(f) for f in every if not f.endswith('.css'))
dead_css = []
for f in site:
    if f.endswith('.css'):
        for cl in sorted(css_classes(read(f))):
            if not DYNAMIC.match(cl) and not re.search(r'(?<![\w-])' + re.escape(cl) + r'(?![\w-])', nocss): dead_css.append('%s .%s' % (f.split('src/web/')[-1], cl))
check('D6 every CSS class is named by a page or a script (or is built from pieces, see DYNAMIC)', not dead_css, dead_css)
own = []
for f in glob.glob(ROOT + '/src/web/*/assets/*.js'):
    if f.endswith('/shell.js') or f.endswith('/shell-admin.js'): continue
    for m in re.finditer(r'^(?:const|let|var) (esc|HF)\s*=\s*(.*)$', read(f), re.M):
        if not re.match(r'HUB\.(esc|fetch);', m.group(2)): own.append('%s %s' % (f.split('src/web/')[-1], m.group(1)))
check('D7 pages take esc and HF from the shell (HUB.esc, HUB.fetch) instead of keeping their own copy', not own, own)
check('D7b the shell hands out HUB.esc', re.search(r'esc: esc,', read(ROOT + '/src/web/hub/core/assets/shell.js')) is not None, '')
print('\n%d/%d passed' % (sum(res), len(res)))
sys.exit(0 if all(res) else 1)
