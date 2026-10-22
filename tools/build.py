#!/usr/bin/env python3
"""Build the update zip from src/.

Usage: python3 tools/build.py [--out build]
Needs: Node (npx esbuild). Writes build/site-update-X.Y.Z.zip and .sha256.
Steps: copy src/ -> build/tree, save readable copies in docs/src, minify own
JS/CSS (not Tools, not vendor), write manifest.json, zip with dots in the name.
"""
import hashlib, json, os, re, shutil, subprocess, sys, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else 'build')
TREE = os.path.join(OUT, 'tree')
SKIP_MANIFEST = ('web/core-data/config.php',)
SKIP_PREFIX = ('web/core-data/data/',)
KEEP_DIRS = []  # empty folders recreated from .gitkeep

def version():
    t = open(os.path.join(ROOT, 'src/web/core-data/lib/boot.php'), encoding='utf-8').read()
    return re.search(r"define\('HUB',\s*'([^']+)'\)", t).group(1)

def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()

def main():
    ver = version()
    shutil.rmtree(OUT, ignore_errors=True)
    shutil.copytree(os.path.join(ROOT, 'src'), TREE)
    # readable copy + minify (own files only)
    pages = ['core-data', 'home', 'links', 'info', 'cards', 'tasks', 'settings']
    for page in pages:
        adir = os.path.join(TREE, 'web', page, 'assets')
        if not os.path.isdir(adir):
            continue
        for fn in sorted(os.listdir(adir)):
            m = re.match(r'(.+)\.(js|css)$', fn)
            p = os.path.join(adir, fn)
            if not m or not os.path.isfile(p):
                continue
            sd = os.path.join(TREE, 'web/core-data/docs/src', page)
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
            if rel == 'web/core-data/manifest.json' or rel in SKIP_MANIFEST or rel.startswith(SKIP_PREFIX):
                continue
            if rel.startswith('web/core-data/media/') and not rel.endswith('.htaccess'):
                continue
            files[rel] = sha(os.path.join(dp, fn))
    body = '{\n"files": {\n' + ',\n'.join(f'{json.dumps(k)}: {json.dumps(files[k])}' for k in sorted(files)) \
        + '\n},\n"version": ' + json.dumps(ver) + '\n}'
    open(os.path.join(TREE, 'web/core-data/manifest.json'), 'w', encoding='utf-8', newline='\n').write(body)
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
