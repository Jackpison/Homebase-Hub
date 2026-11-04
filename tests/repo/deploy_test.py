#!/usr/bin/env python3
"""The ready-made server files in deploy/ stay in step with the site (1.73.0).
nginx ignores .htaccess, so deploy/nginx/homebase-hub.conf repeats its rules: every security policy, permission list and closed
folder in the .htaccess files must be in it. The Docker files: the base images are pinned by digest, the image keeps the
site in a volume, and Caddy is the only address the site trusts in compose.caddy.yaml."""
import glob, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
res = []
def check(name, ok, extra=''):
    res.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok or not extra else '  -> ' + str(extra)[:400]))
def read(p): return open(os.path.join(ROOT, p), encoding='utf-8').read()

nginx = read('deploy/nginx/homebase-hub.conf')
hts = {p: open(p, encoding='utf-8').read() for p in glob.glob(os.path.join(ROOT, 'src/web/**/.htaccess'), recursive=True)}
want = set()
for p, t in hts.items():
    for name, val in re.findall(r'^\s*Header\s+(?:always\s+)?set\s+(Content-Security-Policy|Permissions-Policy)\s+"([^"]+)"', t, re.M):
        want.add((name, val, os.path.relpath(p, ROOT)))
missing = [(n, f) for n, v, f in want if '"' + v + '"' not in nginx]
check('N1 every Content-Security-Policy and Permissions-Policy in the .htaccess files is in the nginx file, word for word', want and not missing, missing)
closed = [d for d in ('/site-data/', '/web/hub/docs/', '/web/hub/core/lib/') if 'location ^~ %s' % d not in nginx]
check('N2 nginx closes site-data, the docs and the engine\'s code', not closed, closed)
check('N3 nginx never runs a script in the pictures folder', re.search(r'location \^~ /web/hub/media/ \{[^}]*php\[0-9\]\?', nginx, re.S) and 'phtml' in nginx)
check('N4 nginx refuses lib.php, config.php, hidden and backup files', '(lib|config)\\.php$' in nginx and 'location ~ /\\.' in nginx and 'README\\.txt' in nginx)
spec = [os.path.relpath(p, ROOT) for p, t in hts.items() if 'Speculation-Rules' in t]
block = re.search(r'map \$uri \$hub_spec \{(.*?)\n\}', nginx, re.S); block = block.group(1) if block else ''
check('N5 the pages that send the pre-loading header in Apache do in nginx', spec and all(re.search(r'\b' + re.escape(f.split(os.sep)[2]) + r'\b', block) for f in spec), spec)

docker = read('deploy/docker/Dockerfile')
check('D1 the Docker image starts from a PHP image pinned by its digest, PHP %s or newer' % re.search(r"HUB_MIN_PHP = '([\d.]+)'", read('src/web/hub/core/lib/boot.php')).group(1),
      re.search(r'^FROM php:(\d+\.\d+)\.\d+-apache[\w-]*@sha256:[0-9a-f]{64}$', docker, re.M))
m = re.search(r'^FROM php:(\d+\.\d+)', docker, re.M); minphp = re.search(r"HUB_MIN_PHP = '([\d.]+)'", read('src/web/hub/core/lib/boot.php')).group(1)
check('D2 ...and that PHP is one the site supports', m and tuple(map(int, m.group(1).split('.'))) >= tuple(map(int, minphp.split('.'))), (m and m.group(1), minphp))
check('D3 the site lives in a volume, and the image reads .htaccess (AllowOverride All)', 'VOLUME /var/www/html' in docker and 'AllowOverride All' in read('deploy/docker/apache.conf'))
ent = read('deploy/docker/entrypoint.sh')
check('D4 the first start never overwrites a site or other files that are already in the volume', '! -f "$SITE/index.php"' in ent and 'unzip -q -n' in ent and 'exit 1' in ent)
cad = read('deploy/docker/compose.caddy.yaml')
ip = re.search(r'ipv4_address:\s*([\d.]+)', cad); tp = re.search(r'HUB_TRUSTED_PROXY:\s*"([^"]+)"', cad)
check('D5 compose.caddy.yaml trusts Caddy\'s own address only, not a whole network', ip and tp and tp.group(1) == ip.group(1), (ip and ip.group(1), tp and tp.group(1)))
check('D6 the Caddy image is pinned by digest', re.search(r'image: caddy:[\d.]+@sha256:[0-9a-f]{64}', cad))
plain = read('deploy/docker/compose.yaml')
check('D7 compose.yaml trusts no proxy unless you add one', not re.search(r'^\s+HUB_TRUSTED_PROXY:', plain, re.M))
print('\n%d/%d passed' % (sum(res), len(res)))
sys.exit(0 if all(res) else 1)
