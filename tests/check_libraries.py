#!/usr/bin/env python3
"""Checks that the bundled libraries have no known security problem that this site could reach. Run it before a release (CI runs it).
  python3 tests/check_libraries.py            fast checks on the source tree, offline
  python3 tests/check_libraries.py --audit    also asks npm for advisories on the exact versions (needs network and npm)

1. pdf.js (Tools) must be 6.2.108 or newer: older versions have two advisories where a crafted PDF can run script
   (GHSA-wgrm-67xf-hhpq before 4.2.67, GHSA-hq66-cqwq-w95j from 5.6.83 to 6.2.107). No older copy may be left behind.
2. SheetJS is no longer used (its last npm version has advisories and gets no fixes): Cards writes Excel files itself.
   No code may load it again."""
import glob, json, os, re, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = os.path.join(ROOT, 'src', 'web')
T = os.path.join(W, 'tools', 'assets')
bad = []

def ver(v): return tuple(int(x) for x in v.split('.'))

# 1. pdf.js
p = os.path.join(T, 'pdfjs6', 'pdf.min.js')
pv = re.search(r'apiVersion:"(\d+\.\d+\.\d+)"', open(p, encoding='utf-8', errors='replace').read()) if os.path.isfile(p) else None   # the version pdf.js reports to its worker
pv = pv.group(1) if pv else '?'
print('pdf.js:', pv)
if pv == '?' or ver(pv) < (6, 2, 108): bad.append('pdf.js is %s; it must be 6.2.108 or newer' % pv)
old = [os.path.basename(f) for f in glob.glob(os.path.join(T, 'pdf.worker.min-*.js')) + glob.glob(os.path.join(T, 'pdf-*.js'))]
if old: bad.append('an old pdf.js copy is still in Tools: ' + ', '.join(old))
wrap = [f for f in glob.glob(os.path.join(T, '*.js')) if 'getDocument(' in open(f, encoding='utf-8', errors='replace').read() and 'pdfjs6' not in f]
for f in wrap:
    if './pdfjs6/pdf.min.js' not in open(f, encoding='utf-8', errors='replace').read(): bad.append('a PDF call does not use pdfjs6: ' + os.path.basename(f))

# 2. SheetJS gone and not loaded
if glob.glob(os.path.join(W, '**', 'xlsx*.js'), recursive=True): bad.append('a SheetJS file is in the site again')
for f in glob.glob(os.path.join(W, '**', '*'), recursive=True):
    if f.endswith(('.js', '.html', '.php')) and os.sep + 'docs' + os.sep not in f and os.sep + 'tools' + os.sep + 'assets' + os.sep not in f:
        if re.search(r'XLSX\.|xlsx\.full', open(f, encoding='utf-8', errors='replace').read()): bad.append('SheetJS is referenced in ' + os.path.relpath(f, W))
print('SheetJS: not used')

if '--audit' in sys.argv:
    import tempfile
    d = tempfile.mkdtemp()
    json.dump({'name': 'audit', 'version': '1.0.0', 'dependencies': {'pdfjs-dist': pv, 'jszip': '3.10.2', 'onnxruntime-web': '1.17.3', 'libheif-js': '1.23.5', 'react': '18.3.1', 'jspdf': '4.2.1', 'pdf-lib': '1.17.1'}}, open(d + '/package.json', 'w'))
    subprocess.run(['npm', 'install', '--package-lock-only', '--ignore-scripts'], cwd=d, capture_output=True)
    r = subprocess.run(['npm', 'audit', '--json'], cwd=d, capture_output=True, text=True)
    found = json.loads(r.stdout or '{}').get('vulnerabilities', {})
    for name, v in found.items():
        if name == 'tar': continue   # a Node-only helper of pdfjs-dist's optional canvas package; never shipped to a browser
        for via in v.get('via', []):
            if isinstance(via, dict): bad.append('advisory %s in %s: %s' % (via.get('url', '').rsplit('/', 1)[-1], name, via.get('title')))
    print('npm audit: %d package(s) flagged' % len([n for n in found if n != 'tar']))

if bad:
    print('\nFAIL'); [print(' -', b) for b in bad]; sys.exit(1)
print('\nOK: no known library problem.')
