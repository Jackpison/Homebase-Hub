"""Shared helpers for the tests that run a real site with PHP's built-in server (update_test.py, core_test.py,
update_attack_test.py, import_test.py, app_test.py). Nothing here is part of the update zip.

  site = Site(zip_path, port)          unzips into /tmp/site<port>, starts PHP, sets the site up, logs in
  site.get('state'), site.post('backup', {...})   API calls as the logged-in browser (cookies, User-Agent, CSRF token)
  other = site.client('another-browser/1.0')      a second browser on the same site, not logged in
  site.chunks(zip_path, name)          uploads a zip in 1 MB pieces, then update_check
  stop_all()                           ends every PHP server these helpers started
"""
import glob, hashlib, http.cookiejar, json, os, re, shutil, subprocess, sys, time, urllib.error, urllib.request, zipfile

UA = 'ghtest/1.0'
PW = 'correct horse battery staple'
HERE = os.path.dirname(os.path.abspath(__file__))
PREPEND = os.path.join(HERE, 'prepend.php')
_procs = []


def zip_version(p):
    return re.search(r"define\('HUB', '([^']+)'\)", zipfile.ZipFile(p).read('web/core-data/lib/boot.php').decode()).group(1)


def sha(p): return hashlib.sha256(open(p, 'rb').read()).hexdigest()


def mutate_zip(src, dst, version=None, minphp=None):
    """A copy of a release zip with another version and/or minPhp, its file list kept consistent."""
    zin = zipfile.ZipFile(src); items = {i.filename: zin.read(i.filename) for i in zin.infolist()}
    man = json.loads(items['web/core-data/manifest.json'])
    def put(n, data): items[n] = data; man['files'][n] = hashlib.sha256(data).hexdigest()
    if version:
        put('web/core-data/lib/boot.php', re.sub(r"define\('HUB', '[^']+'\)", "define('HUB', '%s')" % version, items['web/core-data/lib/boot.php'].decode()).encode())
        man['version'] = version
        for ch in ('web/docs/CHANGELOG.md',):
            if ch in items:
                x = items[ch].decode(); i = x.index('\n## '); put(ch, (x[:i] + '\n## %s\n\n### Test build\n\nTest build.\n\n---\n' % version + x[i:]).encode())
    if minphp: man['minPhp'] = minphp
    items['web/core-data/manifest.json'] = json.dumps(man).encode()
    with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as z:
        for n, d in items.items(): z.writestr(n, d)
    return dst


class Checks:
    """PASS/FAIL lines and a total, the same output every test script prints."""
    def __init__(self): self.res = []
    def __call__(self, name, cond, extra=''):
        self.res.append(bool(cond))
        print(('PASS ' if cond else 'FAIL ') + name + (('  -> ' + str(extra)[:300]) if (extra and not cond) else ''), flush=True)
        return bool(cond)
    def done(self):
        print('\n%d/%d passed' % (sum(self.res), len(self.res)))
        return 0 if self.res and all(self.res) else 1


class Client:
    """One browser: its own cookies, User-Agent and CSRF token."""
    def __init__(self, base, api, ua=UA):
        self.base, self.api, self.ua, self.csrf = base, api, ua, ''
        self.cj = http.cookiejar.CookieJar()
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cj))
        self.last_status = 0

    def raw(self, url, data=None, method=None, hdr=None, timeout=300):
        """(status, headers, body bytes) without JSON decoding."""
        h = {'User-Agent': self.ua}; h.update(hdr or {})
        rq = urllib.request.Request(url, data=data, headers=h, method=method)
        try:
            r = self.op.open(rq, timeout=timeout); return r.status, dict(r.headers), r.read()
        except urllib.error.HTTPError as e:
            return e.code, dict(e.headers), e.read()

    def req(self, url, data=None, method=None, hdr=None):
        st, hd, b = self.raw(url, data, method, hdr)
        self.last_status = st
        try: j = json.loads(b or b'{}')
        except Exception: j = {'error': b[:300].decode('latin1'), '_notjson': True}
        if not isinstance(j, dict): j = {'_value': j}
        if st >= 400: j['_status'] = st
        return j

    def get(self, a, qs=''): return self.req(self.api + '?action=' + a + qs)

    def post(self, a, b=None, qs='', csrf=True):
        h = {'Content-Type': 'application/json'}
        if csrf: h['X-Hub-CSRF'] = self.csrf
        return self.req(self.api + '?action=' + a + qs, data=json.dumps(b if b is not None else {}).encode(), method='POST', hdr=h)

    def login(self, pw=PW):
        """Logs in (no two-step). Returns the reply; keeps the CSRF token."""
        self.get('state')
        r = self.post('login', {'password': pw}, csrf=False)
        if r.get('ok') and r.get('csrf'): self.csrf = r['csrf']
        elif r.get('ok'): self.csrf = self.get('state').get('csrf', '')
        return r


class Site(Client):
    """A site installed from a zip and served by PHP's built-in server. The constructor sets it up with PW and logs in.
    sub='hub' installs it in a sub-folder (/hub/)."""
    def __init__(self, zp, port, sub='', setup=True, prepend=True):
        self.port = port
        self.root = '/tmp/site%d' % port
        shutil.rmtree(self.root, ignore_errors=True); os.makedirs(self.root)
        self.dir = os.path.join(self.root, sub) if sub else self.root
        os.makedirs(self.dir, exist_ok=True)
        zipfile.ZipFile(zp).extractall(self.dir)
        env = dict(os.environ, PHP_CLI_SERVER_WORKERS='6')   # one worker deadlocks the updater's self-check
        cmd = ['php'] + (['-d', 'auto_prepend_file=' + PREPEND] if prepend else []) + ['-S', '127.0.0.1:%d' % port, '-t', self.root]
        self.p = subprocess.Popen(cmd, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        _procs.append(self.p)
        self.host = 'http://127.0.0.1:%d' % port
        base = self.host + ('/' + sub if sub else '')
        super().__init__(base, base + '/web/core-data/api.php')
        for _ in range(50):
            try: urllib.request.urlopen(self.host + '/', timeout=2); break
            except urllib.error.HTTPError: break
            except Exception: time.sleep(0.1)
        if setup: self.setup()

    def setup(self, pw=PW):
        self.get('state')
        code = open(self.dir + '/site-data/core/SETUP-CODE.php').read()
        code = re.search(r'([A-Z0-9]{4}(?:-[A-Z0-9]{4})+|[A-Z0-9]{8,})', code.split('?>')[-1] if '?>' in code else code.replace('<?php', '')).group(1)
        r = self.post('setup', {'code': code, 'password': pw}); assert r.get('ok'), r
        self.csrf = r.get('csrf') or self.get('state').get('csrf', ''); assert self.csrf, r
        return r

    def client(self, ua='other-browser/2.0'): return Client(self.base, self.api, ua)

    def php(self, code):
        """Runs PHP inside this site (boot.php loaded) and returns stdout."""
        prog = "chdir(%r); require %r; %s" % (self.dir, self.dir + '/web/core-data/lib/boot.php', code)
        return subprocess.run(['php', '-r', prog], capture_output=True, text=True).stdout

    def chunks(self, zp, name, raw=None):
        raw = open(zp, 'rb').read() if raw is None else raw
        n = max(1, -(-len(raw) // 1048576)); id = os.urandom(8).hex()
        for i in range(n):
            r = self.req(self.api + '?action=update_chunk&id=%s&i=%d&n=%d' % (id, i, n), data=raw[i*1048576:(i+1)*1048576], method='POST', hdr={'Content-Type': 'application/octet-stream', 'X-Hub-CSRF': self.csrf})
            if not r.get('ok'): return r
        return self.post('update_check', {'name': name})

    def version(self): return open(self.dir + '/web/core-data/lib/boot.php').read().split("define('HUB', '")[1].split("'")[0]
    def clean(self):
        sc = self.get('files_scan'); return (len(sc.get('changed', [])), len(sc.get('missing', [])), len(sc.get('extra', [])), sc.get('matched'))
    def incoming(self): return [os.path.basename(f) for f in glob.glob(self.dir + '/site-data/updates/incoming*')]
    def stop(self):
        try: self.p.terminate(); self.p.wait(5)
        except Exception: pass


def stop_all():
    for p in _procs:
        try: p.terminate()
        except Exception: pass


# ---------- browsers (Playwright) ----------
BROWSERS = ('chromium', 'firefox', 'webkit')


def browser_name(argv=None):
    """Takes --browser chromium|firefox|webkit (default chromium) out of sys.argv and returns it."""
    argv = sys.argv if argv is None else argv
    name = 'chromium'
    if '--browser' in argv:
        i = argv.index('--browser')
        if i + 1 >= len(argv) or argv[i + 1] not in BROWSERS: raise SystemExit('--browser needs one of: ' + ', '.join(BROWSERS))
        name = argv[i + 1]; del argv[i:i + 2]
    return name


def launch(p, name):
    """Starts that browser. --no-sandbox is a Chromium switch (needed in containers); the others do not take it."""
    return getattr(p, name).launch(args=['--no-sandbox'] if name == 'chromium' else [])


# Every engine fires this event when its security policy refuses something; the message wording differs per engine.
CSP_REPORTER = "document.addEventListener('securitypolicyviolation', function (e) { console.error('Refused to load (security policy): ' + e.violatedDirective + ' ' + e.blockedURI); });"


def browser_login(pg, base, pw=PW, timeout=15000):
    """Logs in through the site's own login dialog, the way a person does (works the same in every engine).
    Returns '' when logged in, else what the dialog said."""
    pg.goto(base + '/web/links/', wait_until='domcontentloaded')
    pg.wait_for_function("!!(window.HUB && HUB.login)", timeout=timeout)
    if pg.evaluate("HUB.isAdmin && HUB.isAdmin()"): return ''
    pg.evaluate("void HUB.login()")
    pg.wait_for_selector('#ix-pw', timeout=timeout)
    pg.fill('#ix-pw', pw); pg.click('#ix-lg')
    end = time.time() + timeout / 1000; said = ''
    while time.time() < end:   # the page may reload after logging in, so look again until it says so
        try:
            if pg.evaluate("!!(window.HUB && HUB.isAdmin && HUB.isAdmin())"): return ''
            said = pg.evaluate("(document.querySelector('#ix-le') || {}).textContent || ''") or said
        except Exception: pass
        pg.wait_for_timeout(250)
    return said or 'not logged in'
