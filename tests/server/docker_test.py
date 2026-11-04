#!/usr/bin/env python3
"""Homebase Hub in Docker (deploy/docker), on a real container.
  cp build/site-update-X.Y.Z.zip deploy/docker/site.zip && docker build -t homebase-hub:test deploy/docker
  python3 tests/server/docker_test.py homebase-hub:test build/site-update-X.Y.Z.zip
Checks: the first start copies the site into the volume; every PHP extension Health looks for is there; the .htaccess rules
protect it (tests/server/apache_test.py runs against the container); setup and login work; an update and Go Back work inside
the container, and its self-check reaches the site although the outside port differs; a new container on the same volume keeps
the updated site and the data; HUB_TRUSTED_PROXY is the only way a forwarded HTTPS is believed; a volume with other files
is refused; compose.caddy.yaml gives HTTPS; a folder of the host works like a volume (Unraid, CasaOS, Umbrel), and the CasaOS file
starts the site."""
import json, os, re, subprocess, sys, tempfile, time, urllib.request, urllib.error
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import Checks, Client, PW, UA, mutate_zip, zip_version

if len(sys.argv) < 3: sys.exit('Usage: python3 tests/server/docker_test.py IMAGE build/site-update-X.Y.Z.zip')
IMG, CUR = sys.argv[1], sys.argv[2]
CURV = zip_version(CUR); _p = CURV.split('.'); NEXTV = '%s.%s.%d' % (_p[0], _p[1], int(_p[2]) + 1)
NEW = mutate_zip(CUR, tempfile.mkdtemp() + '/next.zip', version=NEXTV)
HERE = os.path.dirname(os.path.abspath(__file__))
check = Checks()
names, vols, binds = [], [], []

def sh(*a, ok=True):
    r = subprocess.run(list(a), capture_output=True, text=True)
    if ok and r.returncode: raise RuntimeError('%s: %s' % (' '.join(a), r.stderr[-400:]))
    return r
def start(name, port, vol, env=()):
    sh('docker', 'rm', '-f', name, ok=False)
    args = ['docker', 'run', '-d', '--name', name, '-p', '127.0.0.1:%d:80' % port, '-v', vol + ':/var/www/html']
    for e in env: args += ['-e', e]
    sh(*args, IMG); names.append(name)
    base = 'http://127.0.0.1:%d' % port
    for _ in range(100):
        try: urllib.request.urlopen(base + '/web/hub/core/assets/speculation-rules.json', timeout=2); break
        except Exception: time.sleep(0.3)
    return base
def volume(name):
    sh('docker', 'volume', 'rm', '-f', name, ok=False); sh('docker', 'volume', 'create', name); vols.append(name); return name
def inside(name, *cmd): return sh('docker', 'exec', name, *cmd, ok=False).stdout
def client(base): return Client(base, base + '/web/hub/core/api.php')
def version(base): return client(base).get('state').get('v')
def chunks(c, zp, name):
    raw = open(zp, 'rb').read(); n = max(1, -(-len(raw) // 1048576)); i_d = os.urandom(8).hex()
    for i in range(n):
        r = c.req(c.api + '?action=update_chunk&id=%s&i=%d&n=%d' % (i_d, i, n), data=raw[i * 1048576:(i + 1) * 1048576], method='POST', hdr={'Content-Type': 'application/octet-stream', 'X-Hub-CSRF': c.csrf})
        if not r.get('ok'): return r
    return c.post('update_check', {'name': name})

try:
    vol = volume('hubtest-data')
    B = start('hubtest', 8401, vol)
    logs = sh('docker', 'logs', 'hubtest').stdout + sh('docker', 'logs', 'hubtest').stderr
    check('D1 the first start copies the site into the volume and it answers', 'first start' in logs and version(B) == CURV, (logs[-300:], version(B)))
    mods = inside('hubtest', 'php', '-m').lower().split()
    need = ['curl', 'openssl', 'mbstring', 'gd', 'zip', 'zlib', 'intl', 'fileinfo', 'sodium']
    check('D2 every PHP extension Health looks for is there, and opcache', all(m in mods for m in need) and 'zend' in mods, [m for m in need if m not in mods])
    owner = inside('hubtest', 'stat', '-c', '%U', '/var/www/html/index.php').strip()
    check('D3 the site\'s files belong to the web server (so Settings › Updates can write them)', owner == 'www-data', owner)

    # setup and login
    c = client(B); c.get('state')
    raw = inside('hubtest', 'cat', '/var/www/html/site-data/core/SETUP-CODE.php')
    code = re.search(r'([A-Z0-9]{4}(?:-[A-Z0-9]{4})+|[A-Z0-9]{8,})', raw.split('?>')[-1] if '?>' in raw else raw.replace('<?php', ''))
    r = c.post('setup', {'code': code.group(1) if code else '', 'password': PW}); c.csrf = r.get('csrf') or c.get('state').get('csrf', '')
    check('D4 setup with the code from the volume works, then login', r.get('ok') and client(B).login().get('ok'), r)

    # the .htaccess rules, exactly as tests/server/apache_test.py checks them on Apache
    inside('hubtest', 'sh', '-c', 'M=/var/www/html/web/hub/media/home/photos; mkdir -p $M && cp /var/www/html/web/hub/core/assets/brand/logo-192.png $M/t.png && printf "<?php echo \\"ran\\";\\n" > $M/t.php && chown -R www-data:www-data /var/www/html/web/hub/media')
    a = subprocess.run([sys.executable, os.path.join(HERE, 'apache_test.py'), B], capture_output=True, text=True)
    check('D5 every Apache check passes in the container (private files refused, headers, pages load in a browser)', a.returncode == 0, [l for l in a.stdout.splitlines() if l.startswith('FAIL')][:4] or a.stderr[-300:])

    # an update and Go Back inside the container (the outside port 8401 does not exist inside: the self-check must still find the site)
    c = client(B); c.login()
    r = chunks(c, NEW, 'site-update-%s.zip' % NEXTV)
    ok1 = r.get('ok'); r2 = c.post('update_apply', {'password': PW}); time.sleep(0.5)
    check('D6 an uploaded update installs inside the container', ok1 and r2.get('ok') and version(B) == NEXTV, (r, r2, version(B)))
    check('D7 ...and its self-check found the site (nothing was rolled back)', not r2.get('rolledBack') and 'did not answer' not in json.dumps(r2), r2)

    # a new container from the same image on the same volume: the updated site and the data stay
    sh('docker', 'rm', '-f', 'hubtest')
    B = start('hubtest', 8401, vol)
    logs = sh('docker', 'logs', 'hubtest').stdout
    check('D8 a new container on the same volume keeps the updated site (the image never overwrites it) and the password', version(B) == NEXTV and 'first start' not in logs and client(B).login().get('ok'), (version(B), logs[-200:]))
    c = client(B); c.login()
    r = c.post('update_apply', {'password': PW, 'back': True}); time.sleep(0.5)
    check('D9 Go Back works after that', r.get('ok') and version(B) == CURV, (r, version(B)))

    # HTTPS through a proxy: believed only from addresses listed in HUB_TRUSTED_PROXY
    def secure_cookie(base, proto):
        rq = urllib.request.Request(base + '/web/hub/core/api.php?action=login', data=json.dumps({'password': PW}).encode(), method='POST',
                                    headers={'User-Agent': UA, 'Content-Type': 'application/json', 'X-Forwarded-Proto': proto, 'X-Forwarded-For': '203.0.113.50'})
        try: h = urllib.request.urlopen(rq, timeout=20).headers
        except urllib.error.HTTPError as e: h = e.headers
        return any('secure' in v.lower() for v in h.get_all('Set-Cookie') or [])
    check('D10 without HUB_TRUSTED_PROXY a forwarded "https" is ignored', not secure_cookie(B, 'https'))
    sh('docker', 'rm', '-f', 'hubtest')
    B = start('hubtest', 8401, vol, env=['HUB_TRUSTED_PROXY=0.0.0.0/0, ::/0'])
    check('D11 with HUB_TRUSTED_PROXY set, the proxy\'s "https" is believed (the login cookie is Secure)', secure_cookie(B, 'https') and not secure_cookie(B, 'http'))

    # a volume that holds something else is never overwritten
    v2 = volume('hubtest-other')
    sh('docker', 'run', '--rm', '-v', v2 + ':/x', '--entrypoint', 'sh', IMG, '-c', 'echo mine > /x/notes.txt')
    r = sh('docker', 'run', '--rm', '-v', v2 + ':/var/www/html', IMG, ok=False)
    left = sh('docker', 'run', '--rm', '-v', v2 + ':/x', '--entrypoint', 'ls', IMG, '/x').stdout.split()
    check('D12 a volume with other files (and no site) is refused, and left as it was', r.returncode != 0 and 'no index.php' in r.stderr and left == ['notes.txt'], (r.returncode, r.stderr[-200:], left))

    # compose.caddy.yaml as shipped (only the site image and the outside port changed): HTTPS through Caddy, the visitor's address
    # from Caddy is believed, and an address a visitor writes into X-Forwarded-For is not
    import ssl
    D = os.path.join(os.path.dirname(HERE), '..', 'deploy', 'docker'); D = os.path.abspath(D)
    ov = tempfile.mkdtemp() + '/override.yaml'
    caddy_img = os.environ.get('CADDY_IMAGE', '')
    open(ov, 'w').write('services:\n  caddy:\n' + ('    image: %s\n' % caddy_img if caddy_img else '') + '    ports: !override\n      - "127.0.0.1:18443:443"\n')
    env = dict(os.environ, HUB_DOMAIN='localhost', HUB_IMAGE=IMG)
    dc = ['docker', 'compose', '-p', 'hubcaddytest', '-f', os.path.join(D, 'compose.caddy.yaml'), '-f', ov]
    up = subprocess.run(dc + ['up', '-d'], capture_output=True, text=True, env=env); names.append('__compose__')
    ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
    H = 'https://localhost:18443'
    def treq(path, data=None, hdr=None, jar=None):
        h = {'User-Agent': UA}; h.update(hdr or {})
        rq = urllib.request.Request(H + path, data=data, headers=h, method='POST' if data is not None else 'GET')
        op = urllib.request.build_opener(urllib.request.HTTPSHandler(context=ctx), urllib.request.HTTPCookieProcessor(jar))
        try: r = op.open(rq, timeout=20); return r.status, r.headers, r.read()
        except urllib.error.HTTPError as e: return e.code, e.headers, e.read()
        except Exception as e: return 0, {}, str(e).encode()
    import http.cookiejar
    jar = http.cookiejar.CookieJar()
    for _ in range(60):
        if treq('/web/hub/core/api.php?action=state', jar=jar)[0] == 200: break
        time.sleep(0.5)
    hub_c = subprocess.run(dc + ['ps', '-q', 'hub'], capture_output=True, text=True, env=env).stdout.strip()
    raw = inside(hub_c, 'cat', '/var/www/html/site-data/core/SETUP-CODE.php') if hub_c else ''
    code = re.search(r'([A-Z0-9]{4}(?:-[A-Z0-9]{4})+|[A-Z0-9]{8,})', raw.split('?>')[-1] if '?>' in raw else raw.replace('<?php', ''))
    st, h, b = treq('/web/hub/core/api.php?action=setup', json.dumps({'code': code.group(1) if code else '', 'password': PW}).encode(), {'Content-Type': 'application/json'}, jar)
    secure = any('secure' in v.lower() for v in (h.get_all('Set-Cookie') if hasattr(h, 'get_all') else []) or [])
    check('D13 compose.caddy.yaml: the site answers over HTTPS through Caddy and knows it (Secure login cookie, HSTS)', up.returncode == 0 and st == 200 and secure and 'max-age' in (h.get('Strict-Transport-Security') or ''), (up.stderr[-300:], st, b[:200]))
    try: csrf = json.loads(b).get('csrf', '')
    except Exception: csrf = ''
    treq('/web/hub/core/api.php?action=login', json.dumps({'password': PW}).encode(), {'Content-Type': 'application/json', 'X-Forwarded-For': '198.51.100.66'}, jar)
    st, h, b = treq('/web/hub/core/api.php?action=activity', hdr={'X-Hub-CSRF': csrf}, jar=jar)
    try: ips = {x.get('ip') for x in json.loads(b).get('sessions', [])}
    except Exception: ips = set()
    check('D14 ...the visitor\'s address comes from Caddy, and one the visitor writes in X-Forwarded-For is ignored', ips and '198.51.100.66' not in ips and '172.30.77.10' not in ips, (st, ips, b[:200]))
    subprocess.run(dc + ['down', '-v'], capture_output=True, env=env)

    # a plain folder of the host instead of a volume, as Unraid, CasaOS and Umbrel do it (1.73.1)
    host = tempfile.mkdtemp(prefix='hub-bind-'); binds.append(host)
    sh('docker', 'rm', '-f', 'hubbind', ok=False)
    sh('docker', 'run', '-d', '--name', 'hubbind', '-p', '127.0.0.1:8402:80', '-v', host + ':/var/www/html', IMG); names.append('hubbind')
    Bb = 'http://127.0.0.1:8402'
    for _ in range(100):
        try: urllib.request.urlopen(Bb + '/web/hub/core/assets/speculation-rules.json', timeout=2); break
        except Exception: time.sleep(0.3)
    c = client(Bb); c.get('state')
    raw = inside('hubbind', 'cat', '/var/www/html/site-data/core/SETUP-CODE.php')
    code = re.search(r'\b([A-Z0-9]{4}-[A-Z0-9]{4})\b', raw)
    r = c.post('setup', {'code': code.group(1) if code else '', 'password': PW})
    check('D15 an empty folder of the host works like a volume: the site is copied in, belongs to the web server, and setup works',
          inside('hubbind', 'stat', '-c', '%U', '/var/www/html/index.php').strip() == 'www-data' and r.get('ok'), r)   # the host folder now belongs to www-data: look from inside
    sh('docker', 'rm', '-f', 'hubbind', ok=False)

    # deploy/casaos/docker-compose.yml as shipped, only its folder and port moved (CasaOS makes /DATA itself)
    cas = tempfile.mkdtemp(prefix='hub-casaos-'); binds.append(cas)
    ov2 = tempfile.mkdtemp() + '/override.yaml'
    open(ov2, 'w').write('services:\n  hub:\n    image: %s\n    ports: !override\n      - "127.0.0.1:8403:80"\n    volumes: !override\n      - %s:/var/www/html\n' % (IMG, cas))
    dcc = ['docker', 'compose', '-p', 'hubcasaostest', '-f', os.path.join(D, '..', 'casaos', 'docker-compose.yml'), '-f', ov2]
    cfg = subprocess.run(['docker', 'compose', '-f', os.path.join(D, '..', 'casaos', 'docker-compose.yml'), 'config', '-q'], capture_output=True, text=True, env=dict(os.environ, AppID='homebase-hub'))
    up = subprocess.run(dcc + ['up', '-d'], capture_output=True, text=True, env=dict(os.environ, AppID='homebase-hub'))
    ok = False
    for _ in range(100):
        try: ok = urllib.request.urlopen('http://127.0.0.1:8403/web/hub/core/api.php?action=state', timeout=2).status == 200; break
        except Exception: time.sleep(0.3)
    cid = subprocess.run(dcc + ['ps', '-q', 'hub'], capture_output=True, text=True, env=dict(os.environ, AppID='homebase-hub')).stdout.strip()
    mounted = inside(cid, 'sh', '-c', 'test -f /var/www/html/index.php && echo yes').strip() if cid else ''
    check('D16 the CasaOS file is a valid compose file, and it starts the site', cfg.returncode == 0 and up.returncode == 0 and ok and mounted == 'yes', (cfg.stderr[-300:], up.stderr[-300:], mounted))
    subprocess.run(dcc + ['down'], capture_output=True, env=dict(os.environ, AppID='homebase-hub'))
finally:
    for n in names: subprocess.run(['docker', 'rm', '-f', n], capture_output=True) if n != '__compose__' else None
    for v in vols: subprocess.run(['docker', 'volume', 'rm', '-f', v], capture_output=True)
    for b in binds:   # the container made these files as www-data: remove them through Docker
        subprocess.run(['docker', 'run', '--rm', '-v', b + ':/x', '--entrypoint', 'sh', IMG, '-c', 'rm -rf /x/* /x/.[!.]*'], capture_output=True)
        subprocess.run(['rm', '-rf', b], capture_output=True)
sys.exit(check.done())
