#!/usr/bin/env python3
"""Checks the two known library problems cannot be reached by this site. Works offline; run it before a release.
  python3 tests/check_libraries.py            fast checks on the source tree
  python3 tests/check_libraries.py --audit    also asks npm for advisories on the pinned versions (needs network and npm)

1. pdf.js 3.11.174 (Tools) has GHSA-wgrm-67xf-hhpq: a crafted PDF can run script when fonts are compiled with eval.
   The documented fix is isEvalSupported:false. Every place Tools opens a PDF must set it.
2. SheetJS 0.18.5 (Cards export) has prototype pollution and ReDoS advisories that need a crafted Excel file to be READ.
   The site only WRITES Excel files, so none of its code may call XLSX.read or XLSX.readFile.
If either check fails, the library must be updated before release."""
import glob, json, os, re, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = os.path.join(ROOT, 'src', 'web')
bad = []

# 1. every pdf.js getDocument call in Tools sets isEvalSupported:false
sites = 0
for f in glob.glob(os.path.join(W, 'tools', 'assets', '*.js')):
    t = open(f, encoding='utf-8', errors='replace').read()
    for m in re.finditer(r'\.getDocument\(\{', t):
        args = t[m.end():m.end() + 400]
        if re.match(r'(?:[^{}]|\{[^{}]*\})*', args):
            sites += 1
            head = args.split('}).promise')[0] if '}).promise' in args else args[:300]
            if not re.search(r'isEvalSupported\s*:\s*(!1|false)', head): bad.append('pdf.js call without isEvalSupported:false in ' + os.path.basename(f))
print('pdf.js getDocument call sites checked:', sites)
if sites == 0: bad.append('found no pdf.js getDocument call in Tools: the check needs updating')

# 2. no Excel reading anywhere in the site's own code
reads = 0
for f in glob.glob(os.path.join(W, '**', '*'), recursive=True):
    if not f.endswith(('.js', '.html', '.php')) or os.sep + 'vendor' + os.sep in f or os.sep + 'docs' + os.sep in f or os.sep + 'tools' + os.sep + 'assets' + os.sep in f: continue
    t = open(f, encoding='utf-8', errors='replace').read()
    if re.search(r'XLSX\.(read|readFile)\s*\(', t): reads += 1; bad.append('XLSX read call in ' + os.path.relpath(f, W))
tools_x = [os.path.basename(f) for f in glob.glob(os.path.join(W, 'tools', 'assets', '*.js')) if re.search(r'XLSX\.(read|readFile)\s*\(', open(f, encoding='utf-8', errors='replace').read())]
if tools_x: bad.append('XLSX read call in Tools: ' + ', '.join(tools_x))
print('Excel read calls found:', reads + len(tools_x))

# versions, for the record
def find(pat, path):
    m = re.search(pat, open(path, encoding='utf-8', errors='replace').read()); return m.group(1) if m else '?'
print('pdf.js worker:', find(r'"(3\.\d+\.\d+)"', glob.glob(os.path.join(W, 'tools', 'assets', 'pdf.worker.min-*.js'))[0]) if glob.glob(os.path.join(W, 'tools', 'assets', 'pdf.worker.min-*.js')) else '?')
print('JSZip:', find(r'JSZip v(\d+\.\d+\.\d+)', glob.glob(os.path.join(W, 'tools', 'assets', 'jszip.min-*.js'))[0]))

if '--audit' in sys.argv:
    import tempfile
    d = tempfile.mkdtemp()
    json.dump({'name': 'audit', 'version': '1.0.0', 'dependencies': {'pdfjs-dist': '3.11.174', 'jszip': '3.10.2', 'onnxruntime-web': '1.17.3', 'libheif-js': '1.23.5', 'react': '18.3.1', 'jspdf': '4.2.1', 'xlsx': '0.18.5', 'pdf-lib': '1.17.1'}}, open(d + '/package.json', 'w'))
    subprocess.run(['npm', 'install', '--package-lock-only', '--ignore-scripts'], cwd=d, capture_output=True)
    r = subprocess.run(['npm', 'audit', '--json'], cwd=d, capture_output=True, text=True)
    known = {'GHSA-wgrm-67xf-hhpq': 'pdf.js: covered by check 1', 'GHSA-4r6h-8v6p-xvw6': 'SheetJS: covered by check 2', 'GHSA-5pgg-2g8v-p4x9': 'SheetJS: covered by check 2'}
    for name, v in json.loads(r.stdout or '{}').get('vulnerabilities', {}).items():
        if name == 'tar': continue   # node-only helper of pdfjs-dist's optional canvas package, never shipped to a browser
        for via in v.get('via', []):
            if isinstance(via, dict):
                ghsa = via.get('url', '').rsplit('/', 1)[-1]
                if ghsa in known: print('known:', ghsa, known[ghsa])
                else: bad.append('NEW advisory %s in %s: %s' % (ghsa, name, via.get('title')))

if bad:
    print('\nFAIL'); [print(' -', b) for b in bad]; sys.exit(1)
print('\nOK: neither known library problem can be reached.')
