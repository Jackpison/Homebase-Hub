#!/usr/bin/env python3
"""deploy/vps/install.sh and deploy/proxmox/homebase-hub-lxc.sh on fresh Debian 13 and Ubuntu 24.04 (in Docker containers).
  python3 tests/server/vps_test.py build/site-update-X.Y.Z.zip
Checks: the script refuses a wrong SHA-256, a missing domain and a bad folder before it changes anything; --lan --zip installs
Apache and PHP and the site; every Apache check passes; setup, an update and Go Back work; a second run never touches the site.
The Proxmox script runs with stand-in pct, pveam and pvesh commands that act inside the container, so its whole flow runs,
including the download of the newest release from GitHub.
DEBIAN_IMAGE and UBUNTU_IMAGE replace the images. Behind a proxy: http_proxy and https_proxy are passed on, VPS_PREP is a shell
command run in each container first, VPS_CA an extra CA file each container trusts, and VPS_HOST_NETWORK=1 puts the containers on the host's network (Apache then also listens on the test's own port, as the
browser of such a machine may not reach port 80)."""
import os, re, subprocess, sys, tempfile, time, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import Checks, Client, PW, mutate_zip, zip_version

if len(sys.argv) < 2: sys.exit('Usage: python3 tests/server/vps_test.py build/site-update-X.Y.Z.zip')
CUR = os.path.abspath(sys.argv[1])
CURV = zip_version(CUR); _p = CURV.split('.'); NEXTV = '%s.%s.%d' % (_p[0], _p[1], int(_p[2]) + 1)
TMP = tempfile.mkdtemp()
NEW = mutate_zip(CUR, TMP + '/next.zip', version=NEXTV)
HERE = os.path.dirname(os.path.abspath(__file__))
DEPLOY = os.path.abspath(os.path.join(HERE, '..', '..', 'deploy'))
IMAGES = [('Debian 13', os.environ.get('DEBIAN_IMAGE', 'debian:trixie'), 8411), ('Ubuntu 24.04', os.environ.get('UBUNTU_IMAGE', 'ubuntu:24.04'), 8412)]
PREP = os.environ.get('VPS_PREP', '')
HOSTNET = os.environ.get('VPS_HOST_NETWORK') == '1'
def base(port): return 'http://127.0.0.1:%d' % port
def also_listen(name, port):   # host network only: the test's port next to 80, for the browser
    if HOSTNET: run(name, "echo 'Listen %d' >> /etc/apache2/ports.conf && sed -i 's#<VirtualHost \\*:80>#<VirtualHost *:80 *:%d>#' /etc/apache2/sites-available/homebase-hub.conf && service apache2 restart" % (port, port))
check = Checks()
names = []

def sh(*a, ok=True, timeout=900):
    r = subprocess.run(list(a), capture_output=True, text=True, timeout=timeout)
    if ok and r.returncode: raise RuntimeError('%s: %s' % (' '.join(a), (r.stderr or r.stdout)[-600:]))
    return r
def box(name, img, port=None):
    sh('docker', 'rm', '-f', name, ok=False)
    args = ['docker', 'run', '-d', '--init', '--name', name]   # --init: a real init reaps stopped processes, as on a server
    args += ['--network', 'host'] if HOSTNET else (['-p', '127.0.0.1:%d:80' % port] if port else [])
    for k in ('http_proxy', 'https_proxy', 'HTTP_PROXY', 'HTTPS_PROXY', 'no_proxy', 'NO_PROXY'):
        if os.environ.get(k): args += ['-e', '%s=%s' % (k, os.environ[k])]
    sh(*args, img, 'sleep', 'infinity'); names.append(name)
    ca = os.environ.get('VPS_CA')
    if ca:
        sh('docker', 'exec', name, 'mkdir', '-p', '/usr/local/share/ca-certificates', '/etc/ssl/certs')
        sh('docker', 'cp', ca, name + ':/usr/local/share/ca-certificates/extra.crt'); sh('docker', 'cp', ca, name + ':/etc/ssl/certs/ca-certificates.crt')
    if PREP: run(name, PREP)
    sh('docker', 'cp', DEPLOY, name + ':/opt/deploy')
    return name
def run(name, cmd): return sh('docker', 'exec', name, 'bash', '-c', cmd, ok=False)
def client(base): return Client(base, base + '/web/hub/core/api.php')
def version(base):
    try: return client(base).get('state').get('v')
    except Exception as e: return str(e)
def chunks(c, zp, name):
    raw = open(zp, 'rb').read(); n = max(1, -(-len(raw) // 1048576)); i_d = os.urandom(8).hex()
    for i in range(n):
        r = c.req(c.api + '?action=update_chunk&id=%s&i=%d&n=%d' % (i_d, i, n), data=raw[i * 1048576:(i + 1) * 1048576], method='POST', hdr={'Content-Type': 'application/octet-stream', 'X-Hub-CSRF': c.csrf})
        if not r.get('ok'): return r
    return c.post('update_check', {'name': name})
def wait(base):
    for _ in range(60):
        try: urllib.request.urlopen(base + '/web/hub/core/assets/speculation-rules.json', timeout=2); return True
        except Exception: time.sleep(0.5)
    return False

try:
    for label, img, port in IMAGES:
        n = box('hubvps-' + label.split()[0].lower(), img, port)
        sh('docker', 'cp', CUR, n + ':/root/site.zip')
        I = 'bash /opt/deploy/vps/install.sh'
        # refusals first: nothing may be installed after them
        run(n, "cp /root/site.zip /root/bad.zip && printf '%064d  bad.zip\\n' 0 > /root/bad.zip.sha256")
        r1 = run(n, I + ' --lan --zip /root/bad.zip'); r2 = run(n, I + ' --zip /root/site.zip'); r3 = run(n, I + ' --lan --dir "/var/www/a b" --zip /root/site.zip')
        r4 = run(n, I + ' "bad domain" --zip /root/site.zip')
        clean = run(n, 'command -v apache2ctl || command -v php || ls /var/www/homebase-hub 2>&1 | grep -v "No such"').stdout.strip()
        check('V1 %s: a wrong SHA-256, no domain, a bad folder and a bad domain are refused, and nothing was installed' % label,
              r1.returncode and 'does not match its published SHA-256' in r1.stderr and r2.returncode and '--lan' in r2.stderr and r3.returncode and r4.returncode and not clean,
              (r1.stderr[-200:], r2.stderr[-200:], r3.stderr[-200:], r4.stderr[-200:], clean))
        run(n, 'cd /root && sha256sum site.zip > site.zip.sha256')
        r = run(n, I + ' --lan --zip /root/site.zip')
        also_listen(n, port); B = base(port)
        check('V2 %s: --lan --zip installs Apache, PHP and the site, and it answers' % label, r.returncode == 0 and 'SHA-256 OK' in r.stdout and wait(B) and version(B) == CURV, (r.stdout[-400:], r.stderr[-400:], version(B)))
        st = run(n, 'stat -c %U /var/www/homebase-hub/index.php; grep -h upload_max_filesize /etc/php/*/apache2/conf.d/90-homebase-hub.ini; grep -c "AllowOverride All" /etc/apache2/sites-enabled/homebase-hub.conf; ls /etc/apache2/sites-enabled; php -m').stdout
        mods = st.lower().split()
        check('V3 %s: the web server owns the files, uploads up to 512 MB, the site reads .htaccess, the default site is off, PHP has every extension Health looks for' % label,
              st.startswith('www-data') and '512M' in st and '000-default' not in st and all(m in mods for m in ('curl', 'gd', 'intl', 'mbstring', 'zip', 'sodium', 'fileinfo')), st[-500:])
        c = client(B); c.get('state')
        raw = run(n, 'cat /var/www/homebase-hub/site-data/core/SETUP-CODE.php').stdout
        code = re.search(r'\b([A-Z0-9]{4}-[A-Z0-9]{4})\b', raw)
        rs = c.post('setup', {'code': code.group(1) if code else '', 'password': PW})
        check('V4 %s: setup with the code the script points to, then login' % label, rs.get('ok') and client(B).login().get('ok'), rs)
        run(n, 'M=/var/www/homebase-hub/web/hub/media/home/photos; mkdir -p $M && cp /var/www/homebase-hub/web/hub/core/assets/brand/logo-192.png $M/t.png && printf "<?php echo \\"ran\\";\\n" > $M/t.php && chown -R www-data:www-data /var/www/homebase-hub/web/hub/media')
        a = subprocess.run([sys.executable, os.path.join(HERE, 'apache_test.py'), B], capture_output=True, text=True)
        check('V5 %s: every Apache check passes (private files refused, headers, pages load in a browser)' % label, a.returncode == 0, [l for l in a.stdout.splitlines() if l.startswith('FAIL')][:4] or a.stderr[-300:])
        c = client(B); c.login()
        ru = chunks(c, NEW, 'site-update-%s.zip' % NEXTV); ra = c.post('update_apply', {'password': PW}); time.sleep(0.5)
        check('V6 %s: an update installs (its self-check finds the site)' % label, ru.get('ok') and ra.get('ok') and not ra.get('rolledBack') and version(B) == NEXTV, (ru, ra, version(B)))
        c = client(B); c.login(); rb = c.post('update_apply', {'password': PW, 'back': True}); time.sleep(0.5)
        check('V7 %s: Go Back works' % label, rb.get('ok') and version(B) == CURV, (rb, version(B)))
        before = run(n, 'md5sum /var/www/homebase-hub/index.php').stdout
        r = run(n, I + ' --lan --zip /root/site.zip')
        check('V8 %s: running the script again refuses and leaves the site as it was' % label, r.returncode and 'already a site' in r.stderr and run(n, 'md5sum /var/www/homebase-hub/index.php').stdout == before and client(B).login().get('ok'), r.stderr[-200:])
        sh('docker', 'rm', '-f', n)

    # Proxmox: pct, pveam and pvesh stand-ins that log their arguments and run "pct exec" and "pct push" inside this container
    n = box('hubvps-proxmox', IMAGES[0][1], 8413)
    stub = r'''set -e; mkdir -p /stub
cat > /usr/local/bin/pct <<'S'
#!/bin/bash
echo "pct $*" >> /stub/log
case "$1" in
  status) exit 1 ;;
  exec) shift 2; [ "$1" = -- ] && shift; exec "$@" ;;
  push) cp "$3" "$4" ;;
esac
S
cat > /usr/local/bin/pveam <<'S'
#!/bin/bash
echo "pveam $*" >> /stub/log
case "$1" in
  available) printf 'system          debian-12-standard_12.12-1_amd64.tar.zst\nsystem          debian-13-standard_13.1-1_amd64.tar.zst\nsystem          debian-13-standard_13.2-1_amd64.tar.zst\nsystem          ubuntu-24.04-standard_24.04-2_amd64.tar.zst\n' ;;
  list) echo "local:vztmpl/debian-12-standard_12.12-1_amd64.tar.zst" ;;
esac
S
printf '#!/bin/bash\necho "pvesh $*" >> /stub/log\necho 123\n' > /usr/local/bin/pvesh
chmod +x /usr/local/bin/pct /usr/local/bin/pveam /usr/local/bin/pvesh
command -v ip >/dev/null || { apt-get update -q >/dev/null && apt-get install -y -q iproute2 >/dev/null; }'''
    run(n, stub)
    r = run(n, 'bash /opt/deploy/proxmox/homebase-hub-lxc.sh')
    also_listen(n, 8413)
    log = run(n, 'cat /stub/log').stdout
    create = next((l for l in log.splitlines() if l.startswith('pct create')), '')
    B = base(8413)
    check('P1 Proxmox: the newest Debian 13 template is downloaded, and container 123 is made unprivileged, starting with the host, on vmbr0 with DHCP',
          'pveam download local debian-13-standard_13.2-1_amd64.tar.zst' in log and create.startswith('pct create 123 local:vztmpl/debian-13-standard_13.2-1_amd64.tar.zst')
          and '--unprivileged 1' in create and '--onboot 1' in create and 'bridge=vmbr0,ip=dhcp' in create and '--rootfs local-lvm:8' in create, (log[-600:], r.stderr[-300:]))
    rel = version(B) if wait(B) else 'no answer'
    check('P2 Proxmox: the installer runs inside it with --lan, downloads the newest release from GitHub (SHA-256 checked) and the site answers',
          r.returncode == 0 and 'pct exec 123 -- bash /root/homebase-hub-install.sh --lan' in log and 'SHA-256 OK' in r.stdout and re.match(r'^\d+\.\d+\.\d+$', str(rel)), (r.stdout[-400:], r.stderr[-400:], rel))
    r = run(n, 'bash /opt/deploy/proxmox/homebase-hub-lxc.sh --memory 100; bash /opt/deploy/proxmox/homebase-hub-lxc.sh --bridge "vmbr0;x"')
    check('P3 Proxmox: too little memory and a bad bridge name are refused', '--memory is in MB' in r.stderr and 'is not a storage or bridge name' in r.stderr, r.stderr[-300:])
finally:
    for x in names: subprocess.run(['docker', 'rm', '-f', x], capture_output=True)

sys.exit(check.done())
