#!/usr/bin/env python3
"""The ready-made server files in deploy/ stay in step with the site (1.73.0).
nginx ignores .htaccess, so deploy/nginx/homebase-hub.conf repeats its rules: every security policy, permission list and closed
folder in the .htaccess files must be in it. The Docker files: the base images are pinned by digest, the image keeps the
site in a volume, and Caddy is the only address the site trusts in compose.caddy.yaml. 1.73.1: the install script, the Proxmox
script and the app-store packages (Unraid, CasaOS, Umbrel, YunoHost)."""
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
# 1.73.1: the install script, Proxmox, and the app-store packages
import shutil, subprocess, xml.etree.ElementTree as ET
HUB = re.search(r"define\('HUB', '([^']+)'\)", read('src/web/hub/core/lib/boot.php')).group(1)
inst = read('deploy/vps/install.sh')
check('S1 install.sh checks the zip against its SHA-256 before it installs Apache, takes the PHP it needs from the zip, and never replaces a site',
      inst.index('[ -z "$ZIP" ] || verify') < inst.index('apt_install apache2') and inst.index('  verify\nfi') < inst.index('apt_install apache2')
      and 'HUB_MIN_PHP' in inst and 'already a site in' in inst and 'has files in it' in inst and 'set -euo pipefail' in inst)
ap = read('deploy/apache/homebase-hub.conf')
check('S2 ...and its Apache settings are the ones in deploy/apache (AllowOverride All, no folder listing)',
      all(x in ap and x in inst for x in ('Options -Indexes +FollowSymLinks', 'AllowOverride All', 'Require all granted')))
px = read('deploy/proxmox/homebase-hub-lxc.sh')
check('S3 the Proxmox script makes an unprivileged Debian 13 container and runs install.sh in it', '--unprivileged 1' in px and 'debian-13-standard' in px and '/vps/install.sh' in px and 'set -euo pipefail' in px)
sc = shutil.which('shellcheck')
if sc:
    files = ['deploy/vps/install.sh', 'deploy/proxmox/homebase-hub-lxc.sh', 'deploy/docker/entrypoint.sh']
    r = subprocess.run([sc, *[os.path.join(ROOT, f) for f in files]], capture_output=True, text=True)
    r2 = subprocess.run([sc, '-s', 'bash', '-e', 'SC1091,SC2154', *glob.glob(os.path.join(ROOT, 'deploy/yunohost/scripts/*'))], capture_output=True, text=True)
    check('S4 shellcheck finds nothing in the deploy scripts', r.returncode == 0 and r2.returncode == 0, (r.stdout + r2.stdout)[-400:])
else: print('skip S4 (no shellcheck)')
x = ET.parse(os.path.join(ROOT, 'deploy/unraid/homebase-hub.xml')).getroot()
cfg = {c.get('Target'): c for c in x.findall('Config')}
check('U1 Unraid: the published image, port 80 inside, the site in a folder of its own, no proxy trusted unless set',
      x.findtext('Repository') == 'ghcr.io/jackpison/homebase-hub:latest' and cfg.get('80') is not None and cfg['80'].get('Type') == 'Port'
      and cfg.get('/var/www/html') is not None and cfg['/var/www/html'].get('Type') == 'Path' and not (cfg.get('HUB_TRUSTED_PROXY').text or '').strip())
um, uc = read('deploy/umbrel/umbrel-app.yml'), read('deploy/umbrel/docker-compose.yml')
check('U2 Umbrel: the app files name this version (release.py raises it), Umbrel\'s login is not added in front, the data is in the app\'s folder',
      ('version: "%s"' % HUB) in um and ('ghcr.io/jackpison/homebase-hub:%s\n' % HUB) in uc and 'PROXY_AUTH_ADD: "false"' in uc
      and 'APP_HOST: homebase-hub_web_1' in uc and 'id: homebase-hub' in um and '${APP_DATA_DIR}/data/site:/var/www/html' in uc)
ca = read('deploy/casaos/docker-compose.yml')
check('U3 CasaOS: the published image for amd64 and arm64, the site in /DATA/AppData', 'image: ghcr.io/jackpison/homebase-hub:latest' in ca and '- amd64' in ca and '- arm64' in ca
      and 'source: /DATA/AppData/$AppID/site' in ca and 'target: /var/www/html' in ca)
r = subprocess.run([sys.executable, os.path.join(ROOT, 'scripts', 'make-yunohost.py'), '--check'], capture_output=True, text=True)
check('Y1 the YunoHost nginx files are made from deploy/nginx/homebase-hub.conf and up to date', r.returncode == 0, r.stdout + r.stderr)
yn = read('deploy/yunohost/conf/nginx.conf')
heads = [h for h in ('Content-Security-Policy', 'X-Frame-Options', 'Permissions-Policy', 'X-Content-Type-Options') if 'more_set_headers "%s: $hub_y_' % h not in yn]
check('Y2 ...and set every header YunoHost would replace again with more_set_headers (PHP\'s own for PHP\'s answers)', not heads and '$upstream_http_content_security_policy' in read('deploy/yunohost/conf/nginx-maps.conf'), heads)
man = read('deploy/yunohost/manifest.toml')
php = re.findall(r'php(\d+\.\d+)-fpm', man)
check('Y3 YunoHost: a domain of its own, one install, PHP %s or newer' % minphp, 'full_domain = true' in man and 'multi_instance = false' in man and 'helpers_version = "2.1"' in man
      and php and tuple(map(int, php[0].split('.'))) >= tuple(map(int, minphp.split('.'))), php)
yc, yu = read('deploy/yunohost/scripts/_common.sh'), read('deploy/yunohost/scripts/upgrade')
check('Y4 YunoHost: the install checks the SHA-256; the data lives outside the site; an upgrade of the package never replaces the site',
      'sha256sum' in yc and 'HUB_DATA_DIR' in yc and 'hub_download' in read('deploy/yunohost/scripts/install') and 'hub_download' not in yu and '[ -f "$f" ] ||' in yc)
print('\n%d/%d passed' % (sum(res), len(res)))
sys.exit(0 if all(res) else 1)
