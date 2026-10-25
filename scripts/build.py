#!/usr/bin/env python3
"""Build the update zip from src/.

Usage: python3 scripts/build.py [--out build]
Needs: Node (npx esbuild). Writes build/site-update-X.Y.Z.zip and .sha256.
Steps: copy src/ -> build/tree, save readable copies in web/hub/docs/src, minify own
JS/CSS (not Tools, not vendor), write manifest.json, zip with dots in the name.
"""
import hashlib, json, os, re, shutil, subprocess, sys, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else 'build')
TREE = os.path.join(OUT, 'tree')
SKIP_MANIFEST = ('web/hub/core/config.php', 'web/core-data/config.php')
SKIP_PREFIX = ('web/hub/core/data/', 'web/core-data/data/', 'web/core-data/media/')
KEEP_DIRS = []  # empty folders recreated from .gitkeep
# File types just added to UP_EXT: installed sites check a zip with their *own* older list, so files of these types
# stay out of the zip for one release (they wait in src/). Empty this set in the release after the one that added them.
# (mp4 was added in 1.48.9; every site from 1.48.9 on accepts it.)
NOT_YET = set()

def version():
    t = open(os.path.join(ROOT, 'src/web/hub/core/lib/boot.php'), encoding='utf-8').read()
    return re.search(r"define\('HUB',\s*'([^']+)'\)", t).group(1)

def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()

def main():
    ver = version()
    chk = subprocess.run([sys.executable, os.path.join(ROOT, 'scripts', 'tools-rev.py'), '--check'], capture_output=True, text=True)
    if chk.returncode: sys.exit('Refusing to build: ' + (chk.stderr or chk.stdout).strip())
    for bad in ('src/site-data', 'src/web/hub/core/config.php', 'src/web/hub/core/data', 'src/web/core-data/config.php', 'src/web/core-data/data', 'src/web/core-data/media'):
        if os.path.exists(os.path.join(ROOT, bad)):
            sys.exit('Refusing to build: %s exists in the source tree (it is private data and must never be shipped). Delete it.' % bad)
    shutil.rmtree(OUT, ignore_errors=True)
    shutil.copytree(os.path.join(ROOT, 'src'), TREE)
    held = []
    for dp, dn, fns in os.walk(TREE):
        for fn in fns:
            if '.' in fn and fn.rsplit('.', 1)[-1].lower() in NOT_YET:
                os.remove(os.path.join(dp, fn)); held.append(fn)
    if held: print('held back for the next release (installed sites do not accept them yet): ' + ', '.join(sorted(held)))
    # readable copy + minify (own files only)
    pages = ['hub/core', 'home', 'links', 'info', 'cards', 'tasks', 'settings']
    for page in pages:
        adir = os.path.join(TREE, 'web', page, 'assets')
        if not os.path.isdir(adir):
            continue
        for fn in sorted(os.listdir(adir)):
            m = re.match(r'(.+)\.(js|css)$', fn)
            p = os.path.join(adir, fn)
            if not m or not os.path.isfile(p):
                continue
            sd = os.path.join(TREE, 'web/hub/docs/src', page)
            os.makedirs(sd, exist_ok=True)
            shutil.copyfile(p, os.path.join(sd, f'{m.group(1)}.src.{m.group(2)}'))
            subprocess.run(['npx', 'esbuild', p, '--minify', '--keep-names', '--target=es2017',
                            '--allow-overwrite', f'--outfile={p}', '--log-level=error'], check=True)
    # empty folders from .gitkeep
    for dp, dn, fn in os.walk(TREE):
        if '.gitkeep' in fn:
            os.remove(os.path.join(dp, '.gitkeep'))
            KEEP_DIRS.append(os.path.relpath(dp, TREE).replace(os.sep, '/') + '/')
    # manifest
    files = {}
    for dp, dn, fns in os.walk(TREE):
        for fn in fns:
            rel = os.path.relpath(os.path.join(dp, fn), TREE).replace(os.sep, '/')
            if rel == 'web/hub/core/manifest.json' or rel in SKIP_MANIFEST or rel.startswith(SKIP_PREFIX):
                continue
            if rel.startswith('web/hub/media/') and not rel.endswith('.htaccess'):
                continue
            files[rel] = sha(os.path.join(dp, fn))
    minphp = re.search(r"const HUB_MIN_PHP = '([^']+)'", open(os.path.join(ROOT, 'src/web/hub/core/lib/boot.php'), encoding='utf-8').read()).group(1)
    body = '{\n"files": {\n' + ',\n'.join(f'{json.dumps(k)}: {json.dumps(files[k])}' for k in sorted(files)) \
        + '\n},\n"minPhp": ' + json.dumps(minphp) + ',\n"version": ' + json.dumps(ver) + '\n}'
    open(os.path.join(TREE, 'web/hub/core/manifest.json'), 'w', encoding='utf-8', newline='\n').write(body)
    # every file must be a type the updater accepts (UP_EXT in update.php): older sites refuse the whole zip otherwise
    up = open(os.path.join(ROOT, 'src/web/hub/core/lib/update.php'), encoding='utf-8').read()
    exts = set(re.findall(r"'([a-z0-9]+)'", re.search(r"const UP_EXT = \[([^\]]+)\]", up).group(1)))
    wrong = []
    for dp, dn, fns in os.walk(TREE):
        for fn in fns:
            e = 'htaccess' if fn == '.htaccess' else (fn.rsplit('.', 1)[-1].lower() if '.' in fn else '')
            if e not in exts: wrong.append(os.path.relpath(os.path.join(dp, fn), TREE).replace(os.sep, '/'))
    if wrong:
        sys.exit('These files have a type the site updater refuses (UP_EXT in update.php), so no site could install this zip:\n  ' + '\n  '.join(wrong[:20]) + ('\n  ... and %d more' % (len(wrong) - 20) if len(wrong) > 20 else ''))
    # zip
    name = f'site-update-{ver}.zip'
    zp = os.path.join(OUT, name)
    with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
        for d in sorted(KEEP_DIRS):
            z.writestr(zipfile.ZipInfo(d), '')
        for dp, dn, fns in os.walk(TREE):
            dn.sort()
            for fn in sorted(fns):
                full = os.path.join(dp, fn)
                z.write(full, os.path.relpath(full, TREE).replace(os.sep, '/'))
    digest = sha(zp)
    open(zp + '.sha256', 'w').write(f'{digest}  {name}\n')
    print(name, digest, os.path.getsize(zp))

main()
