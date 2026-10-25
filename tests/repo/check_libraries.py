#!/usr/bin/env python3
"""Checks that the bundled libraries have no known security problem that this site could reach. Run it before a release (CI runs it).
  python3 tests/repo/check_libraries.py            fast checks on the source tree, offline
  python3 tests/repo/check_libraries.py --audit    also asks npm for advisories on the exact versions (needs network and npm)

1. pdf.js (Tools, from tools-app/package-lock.json) must be 6.2.108 or newer, opened with eval switched off: older versions have two advisories where a crafted PDF can run script
   (GHSA-wgrm-67xf-hhpq before 4.2.67, GHSA-hq66-cqwq-w95j from 5.6.83 to 6.2.107). No older copy may be left behind.
2. SheetJS is no longer used (its last npm version has advisories and gets no fixes): Cards writes Excel files itself.
   No code may load it again."""
import glob, json, os, re, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
W = os.path.join(ROOT, 'src', 'web')
T = os.path.join(W, 'tools', 'assets')
bad = []

def ver(v): return tuple(int(x) for x in v.split('.'))

# 1. pdf.js: the version Tools is built with (tools-app/package-lock.json), no old copy left, every PDF opened with eval off
LOCK = json.load(open(os.path.join(ROOT, 'tools-app', 'package-lock.json'), encoding='utf-8'))
pv = LOCK['packages'].get('node_modules/pdfjs-dist', {}).get('version', '?')
print('pdf.js:', pv)
if pv == '?' or ver(pv) < (6, 2, 108): bad.append('pdf.js is %s; it must be 6.2.108 or newer' % pv)
if not os.path.isfile(os.path.join(T, 'pdf.worker.min.mjs')): bad.append('the pdf.js worker is missing from Tools: run python3 scripts/build-tools.py --install')
old = [os.path.basename(f) for f in glob.glob(os.path.join(T, 'pdfjs6')) + glob.glob(os.path.join(T, 'pdf.worker.min-*.js')) + glob.glob(os.path.join(T, 'index-ToolsAll*.js'))]
if old: bad.append('an old Tools file is still in web/tools/assets: ' + ', '.join(old))
for f in glob.glob(os.path.join(ROOT, 'tools-app', 'src', '**', '*.js'), recursive=True):
    s = open(f, encoding='utf-8').read()
    if 'getDocument(' in s and 'isEvalSupported: false' not in s: bad.append('a PDF is opened without isEvalSupported: false in ' + os.path.relpath(f, ROOT))

# 2. SheetJS gone and not loaded
if glob.glob(os.path.join(W, '**', 'xlsx*.js'), recursive=True): bad.append('a SheetJS file is in the site again')
for f in glob.glob(os.path.join(W, '**', '*'), recursive=True):
    if f.endswith(('.js', '.html', '.php')) and os.sep + 'docs' + os.sep not in f and os.sep + 'tools' + os.sep + 'assets' + os.sep not in f:
        if re.search(r'XLSX\.|xlsx\.full', open(f, encoding='utf-8', errors='replace').read()): bad.append('SheetJS is referenced in ' + os.path.relpath(f, W))
print('SheetJS: not used')

if '--audit' in sys.argv:
    import tempfile
    found = {}
    # Tools: npm audit on its own lock file (the exact versions the page is built with)
    r = subprocess.run(['npm', 'audit', '--json', '--omit=dev'], cwd=os.path.join(ROOT, 'tools-app'), capture_output=True, text=True)
    found.update(json.loads(r.stdout or '{}').get('vulnerabilities', {}))
    # the rest of the site: jsPDF, copied into core-data/assets/vendor
    d = tempfile.mkdtemp()
    json.dump({'name': 'audit', 'version': '1.0.0', 'dependencies': {'jspdf': '4.2.1'}}, open(d + '/package.json', 'w'))
    subprocess.run(['npm', 'install', '--package-lock-only', '--ignore-scripts'], cwd=d, capture_output=True)
    r = subprocess.run(['npm', 'audit', '--json'], cwd=d, capture_output=True, text=True)
    found.update(json.loads(r.stdout or '{}').get('vulnerabilities', {}))
    for name, v in found.items():
        if name == 'tar': continue   # a Node-only helper of pdfjs-dist's optional canvas package; never shipped to a browser
        for via in v.get('via', []):
            if isinstance(via, dict): bad.append('advisory %s in %s: %s' % (via.get('url', '').rsplit('/', 1)[-1], name, via.get('title')))
    print('npm audit: %d package(s) flagged' % len([n for n in found if n != 'tar']))

if bad:
    print('\nFAIL'); [print(' -', b) for b in bad]; sys.exit(1)
print('\nOK: no known library problem.')
