#!/usr/bin/env python3
"""Builds the Tools page from tools-app/ (its source) with esbuild.
  python3 scripts/build-tools.py              into build/tools-new (a staging copy to test)
  python3 scripts/build-tools.py --install    into src/web/tools (replaces the page; then commit the result)
  python3 scripts/build-tools.py --check      builds a staging copy and fails if its assets/ differ from src/web/tools/assets
                                              (the committed Tools must be what the source and the lock file build)
Installs the npm packages first (npm ci --ignore-scripts, from the lock files) when node_modules is missing or does not
match the lock file, so a build never uses an older library left on disk."""
import filecmp, json, os, shutil, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, 'tools-app')


def stale(d):
    """True when d/node_modules is missing or any package in d/package-lock.json has another version on disk."""
    lock = json.load(open(os.path.join(d, 'package-lock.json'), encoding='utf-8'))
    for path, meta in lock.get('packages', {}).items():
        if not path or 'version' not in meta: continue
        pj = os.path.join(d, path, 'package.json')
        if not os.path.isfile(pj):
            if meta.get('optional'): continue   # a package for another system (esbuild's other platforms)
            return True
        if json.load(open(pj, encoding='utf-8')).get('version') != meta['version']: return True
    return False


for d in (APP, ROOT):
    if stale(d):
        subprocess.run(['npm', 'ci', '--ignore-scripts', '--no-audit', '--no-fund'], cwd=d, check=True)
install = '--install' in sys.argv
out = os.path.join(ROOT, 'src', 'web', 'tools') if install else os.path.join(ROOT, 'build', 'tools-new')
subprocess.run(['node', os.path.join(APP, 'build.mjs'), '--out', out], check=True)
if install:   # the fingerprint tools-rev.py checks, and a policy without the old inline-script hash
    subprocess.run([sys.executable, os.path.join(ROOT, 'scripts', 'tools-rev.py'), '--write'], check=True)
else:   # the staging copy also needs the page's server rules
    shutil.copy(os.path.join(ROOT, 'src', 'web', 'tools', '.htaccess'), os.path.join(out, '.htaccess'))
if '--check' in sys.argv:
    def files(base):
        return {os.path.relpath(os.path.join(dp, f), base) for dp, _, fs in os.walk(base) for f in fs}
    a, b = os.path.join(ROOT, 'src', 'web', 'tools', 'assets'), os.path.join(out, 'assets')
    fa, fb = files(a), files(b)
    diff = sorted(fa ^ fb) + sorted(f for f in fa & fb if not filecmp.cmp(os.path.join(a, f), os.path.join(b, f), shallow=False))
    if diff:
        sys.exit('The committed Tools (src/web/tools/assets) is not what tools-app builds now: %d file(s) differ, for example %s.\n'
                 'Run python3 scripts/build-tools.py --install and commit src/web/tools.' % (len(diff), ', '.join(diff[:5])))
    print('OK: the committed Tools is exactly what tools-app builds (%d files).' % len(fa))
