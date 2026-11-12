#!/usr/bin/env python3
"""Builds the animated Home backgrounds (1.74.0) from src/web/home/designs-src/<id>/ into src/web/home/designs/<id>.js (+ .css).
  python3 scripts/build-designs.py            build every design (needs: npm ci, which brings esbuild, ogl, three and vgpu)
  python3 scripts/build-designs.py --check    fail if a source changed after the last build (tests/repo/designs_test.py runs it)
Each design is one React Bits component (designs-src/<id>/<Name>.jsx, as published, with its CSS), run without React by the small runtime in
designs-src/_runtime.js. esbuild turns the JSX into h() calls, points 'react' at the runtime, bundles the library it needs (ogl, three, vgpu)
and writes ONE file that registers itself as HubDesigns[id]. The page loads only the file of the design on screen. designs-src/ is not shipped."""
import hashlib, json, os, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src', 'web', 'home', 'designs-src')
OUT = os.path.join(ROOT, 'src', 'web', 'home', 'designs')
MANIFEST = os.path.join(OUT, 'manifest.json')
BANNER = ('/*! From React Bits by David Haz, https://reactbits.dev (https://github.com/DavidHDev/react-bits). Run without React for Homebase Hub (1.74.0). '
          'This file is NOT under Homebase Hub\'s GPL; it keeps the React Bits licence (MIT + Commons Clause), written out in full in web/hub/core/assets/glass.js and on the Security and Licence page. */')


def ids():
    return sorted(d for d in os.listdir(SRC) if os.path.isdir(os.path.join(SRC, d)))


def fingerprint(i):
    h = hashlib.sha256()
    for f in sorted(os.listdir(os.path.join(SRC, i))) + ['../_runtime.js', '../_react.js', '../_inject.js']:
        h.update(f.encode()); h.update(open(os.path.join(SRC, i, f), 'rb').read())
    lock = json.load(open(os.path.join(ROOT, 'package-lock.json')))['packages']
    for lib in ('ogl', 'three', 'vgpu', 'esbuild'):
        h.update((lib + (lock.get('node_modules/' + lib) or {}).get('version', '')).encode())
    return h.hexdigest()[:16]


def build(i):
    comp = [f for f in os.listdir(os.path.join(SRC, i)) if f.endswith('.jsx')][0]
    tmp = os.path.join(ROOT, 'build', 'designs-tmp'); os.makedirs(tmp, exist_ok=True)
    entry = os.path.join(tmp, i + '.js')
    open(entry, 'w').write("import C from '%s';\nimport { define } from '%s';\ndefine('%s', C);\n" % (
        os.path.join(SRC, i, comp), os.path.join(SRC, '_runtime.js'), i))
    os.makedirs(OUT, exist_ok=True)
    r = subprocess.run(['npx', 'esbuild', entry, '--bundle', '--minify', '--format=iife', '--target=es2020', '--jsx=transform', '--jsx-factory=h',
                        '--jsx-fragment=Fragment', '--inject:' + os.path.join(SRC, '_inject.js'), '--alias:react=' + os.path.join(SRC, '_react.js'),
                        '--loader:.css=css', '--entry-names=[name]', '--outdir=' + OUT, '--legal-comments=none', '--banner:js=' + BANNER, '--banner:css=' + BANNER,
                        '--log-level=error'], cwd=ROOT, capture_output=True, text=True)
    if r.returncode: sys.exit('build-designs.py: %s failed:\n%s' % (i, r.stderr))
    css = os.path.join(OUT, i + '.css')
    if os.path.isfile(css) and not open(css).read().strip().replace(BANNER, '').strip(): os.remove(css)


if __name__ == '__main__':
    only = [a for a in sys.argv[1:] if not a.startswith('--')]
    cur = json.load(open(MANIFEST)) if os.path.isfile(MANIFEST) else {}
    if '--check' in sys.argv:
        bad = [i for i in ids() if (cur.get(i) or {}).get('src') != fingerprint(i) or not os.path.isfile(os.path.join(OUT, i + '.js'))]
        if bad: sys.exit('build-designs.py: built files are out of date for %s: run python3 scripts/build-designs.py' % ', '.join(bad))
        print('OK: %d designs are built from their sources' % len(ids()))
        sys.exit(0)
    for i in (only or ids()):
        build(i); cur[i] = {'src': fingerprint(i), 'bytes': os.path.getsize(os.path.join(OUT, i + '.js'))}
        print('%-18s %8d bytes' % (i, cur[i]['bytes']))
    cur = {k: cur[k] for k in sorted(cur) if k in ids()}
    json.dump(cur, open(MANIFEST, 'w'), indent=1); open(MANIFEST, 'a').write('\n')
