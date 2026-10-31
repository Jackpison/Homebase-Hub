#!/usr/bin/env python3
"""The top of the repository stays tidy (1.64.3): only these files and folders may sit in the root of what is committed. A new
config file, notes or a stray script goes into config/, docs/ or scripts/ instead; if something truly belongs in the root (a tool
only looks there), add it to ROOT below on purpose, with the reason. Reads git's list of committed files, so build/ and
node_modules/ on your own computer do not count.
    python3 tests/repo/root_test.py"""
import os, subprocess, sys
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ROOT = {
    '.github': 'workflows',
    '.gitignore': 'git',
    'AGENTS.md': 'the instructions for AI helpers (tools look for it in the root)',
    'CHANGELOG.md': 'the copy of the changelog people read on GitHub (release.py keeps it equal)',
    'LICENSE': 'GitHub shows it from the root',
    'README.md': 'GitHub shows it from the root',
    'config': 'the TypeScript check files',
    'docs': 'FEATURES.md, MAINTAINING.md',
    'eslint.config.js': 'ESLint only looks in the root',
    'package-lock.json': 'npm',
    'package.json': 'npm',
    'ruff.toml': 'ruff looks in the root',
    'scripts': 'build and release scripts',
    'src': 'the site',
    'tests': 'every test',
    'tools-app': 'the source of Tools',
    'website': 'the GitHub Pages site',
}
res = []
def check(name, ok, extra=''):
    res.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok or not extra else '  -> ' + str(extra)[:400]))
files = subprocess.run(['git', 'ls-files'], cwd=ROOT_DIR, capture_output=True, text=True).stdout.split('\n')
top = sorted({f.split('/')[0] for f in files if f})
extra = [t for t in top if t not in ROOT]
check('R1 nothing new in the root of the repository (put it in config/, docs/ or scripts/, or list it here on purpose)', not extra, extra)
check('R2 every listed root entry still exists (remove it from the list when it goes)', all(k in top for k in ROOT), [k for k in ROOT if k not in top])
check('R3 at most 20 entries in the root', len(top) <= 20, len(top))
print('%d/%d passed' % (sum(res), len(res)))
sys.exit(0 if all(res) else 1)
