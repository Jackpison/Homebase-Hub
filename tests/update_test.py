#!/usr/bin/env python3
"""Update tests for Homebase Hub, against a local stand-in for GitHub (no network needed).
Needs PHP 8.1+ with curl, zip and mbstring. See tests/README.md."""
import json, os, shutil, subprocess, sys, threading, time, urllib.request, urllib.error, http.cookiejar, zipfile, hashlib, http.server, socketserver, glob

UA = 'ghtest/1.0'
PW = 'correct horse battery staple'
HERE = os.path.dirname(os.path.abspath(__file__))
if len(sys.argv) < 5:
    sys.exit('Usage: python3 tests/update_test.py CURRENT.zip NEXT.zip PREVIOUS.zip OLDER.zip\n'
             '  CURRENT  the zip just built (tools/build.py)\n  NEXT     the same source with HUB raised by one patch version and a "Test build." changelog entry\n'
             '  PREVIOUS the latest published release zip\n  OLDER    any older release zip (for the upload upgrade and Go Back test)')
CUR, NEW, REL38, OLD = sys.argv[1:5]
def sha(p): return hashlib.sha256(open(p, 'rb').read()).hexdigest()

# ---------- stand-in for GitHub ----------
ROUTES, LOG = {}, []
class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        LOG.append(self.path)
        r = ROUTES.get(self.path)
        if r is None: self.send_response(404); self.end_headers(); return
        st, body, hd = r
        self.send_response(st)
        for k, v in hd.items(): self.send_header(k, v)
        self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
class TS(socketserver.ThreadingMixIn, http.server.HTTPServer): daemon_threads = True
srv = TS(('127.0.0.1', 8124), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
def jl(o): return (200, json.dumps(o).encode(), {'Content-Type': 'application/json'})
def route_good(ver='1.39.1', zp=NEW, **over):
    z = open(zp, 'rb').read()
    ROUTES.clear()
    ROUTES['/v%s/site-update-%s.zip' % (ver, ver)] = (200, z, {'Content-Type': 'application/zip'})
    d = {'version': ver, 'zip': 'http://127.0.0.1:8124/v%s/site-update-%s.zip' % (ver, ver), 'sha256': sha(zp), 'size': len(z), 'minPhp': '8.1', 'notes': 'test', 'published': '2026-10-22T09:00:00Z'}
    d.update(over); ROUTES['/latest.json'] = jl(d)
    LOG.clear()

# ---------- sites ----------
procs = []
class Site:
    def __init__(self, zp, port):
        self.dir = '/tmp/site%d' % port; shutil.rmtree(self.dir, ignore_errors=True); os.makedirs(self.dir)
        zipfile.ZipFile(zp).extractall(self.dir)
        env = dict(os.environ, PHP_CLI_SERVER_WORKERS='6')
        self.p = subprocess.Popen(['php', '-d', 'auto_prepend_file=' + os.path.join(HERE, 'prepend.php'), '-S', '127.0.0.1:%d' % port, '-t', self.dir], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        procs.append(self.p); self.base = 'http://127.0.0.1:%d' % port
        self.cj = http.cookiejar.CookieJar(); self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cj))
        time.sleep(1.0); self.csrf = ''
        self.get('state')
        code = open(self.dir + '/site-data/core/SETUP-CODE.php').read()
        import re; code = re.search(r'([A-Z0-9]{4}(?:-[A-Z0-9]{4})+|[A-Z0-9]{8,})', code.split('?>')[-1] if '?>' in code else code.replace('<?php', '')).group(1)
        r = self.post('setup', {'code': code, 'password': PW}); assert r.get('ok'), r
        self.csrf = r.get('csrf') or self.get('state').get('csrf', ''); assert self.csrf, r
    def req(self, url, data=None, method=None, hdr=None):
        h = {'User-Agent': UA}; h.update(hdr or {})
        rq = urllib.request.Request(url, data=data, headers=h, method=method)
        try: r = self.op.open(rq, timeout=300); return json.loads(r.read() or b'{}')
        except urllib.error.HTTPError as e:
            b = e.read()
            try: j = json.loads(b)
            except Exception: j = {'error': b[:200].decode('latin1')}
            j['_status'] = e.code; return j
    def get(self, a): return self.req(self.base + '/web/core-data/api.php?action=' + a)
    def post(self, a, b=None, qs=''): return self.req(self.base + '/web/core-data/api.php?action=' + a + qs, data=json.dumps(b or {}).encode(), method='POST', hdr={'Content-Type': 'application/json', 'X-Hub-CSRF': self.csrf})
    def chunks(self, zp, name):
        raw = open(zp, 'rb').read(); n = max(1, -(-len(raw) // 1048576)); id = os.urandom(8).hex()
        for i in range(n):
            r = self.req(self.base + '/web/core-data/api.php?action=update_chunk&id=%s&i=%d&n=%d' % (id, i, n), data=raw[i*1048576:(i+1)*1048576], method='POST', hdr={'Content-Type': 'application/octet-stream', 'X-Hub-CSRF': self.csrf}); assert r.get('ok'), r
        return self.post('update_check', {'name': name})
    def version(self): return open(self.dir + '/web/core-data/lib/boot.php').read().split("define('HUB', '")[1].split("'")[0]
    def clean(self):
        sc = self.get('files_scan'); return (len(sc.get('changed', [])), len(sc.get('missing', [])), len(sc.get('extra', [])), sc.get('matched'))
    def incoming(self): return [os.path.basename(f) for f in glob.glob(self.dir + '/site-data/updates/incoming*')]

res = []
def check(name, cond, extra=''):
    res.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name + (('  -> ' + str(extra)[:220]) if (extra and not cond) else ''))

try:
    # ===== A. the GitHub path, 1.38.0 -> 1.39.1 =====
    s = Site(CUR, 8123); route_good()
    st = s.get('update_status'); g = st.get('gh', {})
    check('A1 fresh site: daily check is off, curl present, nothing known yet', g.get('auto') is False and g.get('curl') and g.get('latest') is None, g)
    s.get('overview'); s.get('update_status'); s.post('gh_check', {'auto': True})
    r = subprocess.run(['php', '-d', 'auto_prepend_file=' + os.path.join(HERE, 'prepend.php'), '-r', "require '%s/web/core-data/lib/ghupdate.php'; gh_tick(); echo 'tick';" % s.dir], capture_output=True, text=True)
    check('A2 with the daily check off: status, overview, cron tick and an automatic check make NO request to GitHub', LOG == [] and r.stdout == 'tick', (LOG, r.stdout, r.stderr[:200]))
    r = s.post('gh_check', {}); g = r
    check('A3 Check Now finds 1.39.1 via latest.json (1 request)', g.get('newer') and g['latest']['version'] == '1.39.1' and g['latest']['via'] == 'pages' and LOG == ['/latest.json'], (g, LOG))
    ov = s.get('overview'); check('A4 Overview shows the available version', any('1.39.1' in a['text'] for a in ov.get('alerts', [])), ov.get('alerts'))
    r = s.post('gh_install', {})
    check('A5 one click downloads, verifies and runs the full check', r.get('ok') and r.get('source') == 'github' and r['staged']['version'] == '1.39.1' and all(c['ok'] for c in r['checks']), r)
    check('A6 the staged zip fingerprint equals the one GitHub lists', r.get('staged', {}).get('sha256') == sha(NEW), r.get('staged'))
    check('A7 nothing on the site changed yet', s.version() == '1.39.0')
    bad = s.post('update_apply', {'password': 'wrong password here'}); check('A8 apply without the right password is refused', not bad.get('ok') and s.version() == '1.39.0', bad)
    r = s.post('update_apply', {'password': PW}); time.sleep(0.5)
    check('A9 apply with the password works and the site answers', r.get('ok') and s.version() == '1.39.1', r)
    check('A10 file check after the update: 0 changed, 0 missing, 0 extra', s.clean()[:3] == (0, 0, 0), s.clean())
    st = s.get('update_status'); check('A11 after update no newer version is offered', st['gh']['newer'] is False and st['version'] == '1.39.1', st['gh'])
    r = s.post('gh_install', {}); check('A12 install when already current is refused', not r.get('ok'), r)

    # ===== B. refusals =====
    def fresh(): s = Site(CUR, 8123 + 10 + len(res)); return s
    def fresh_checked(**over):
        route_good(**over); s = Site(CUR, 9000 + len(res)); s.post('gh_check', {}); return s
    s = fresh_checked(sha256='0' * 64); r = s.post('gh_install', {})
    check('B1 wrong SHA-256 in latest.json: refused, nothing kept, nothing changed', not r.get('ok') and 'SHA-256' in r.get('error', '') and s.incoming() == [] and s.version() == '1.39.0', (r, s.incoming()))
    s = fresh_checked(size=12345); r = s.post('gh_install', {})
    check('B2 wrong size in latest.json: refused', not r.get('ok') and 'size' in r.get('error', '') and s.incoming() == [], r)
    z = open(NEW, 'rb').read(); bz = bytearray(z); bz[len(bz) // 2] ^= 0xFF; open('/tmp/bad.zip', 'wb').write(bz)
    route_good(); ROUTES['/v1.39.1/site-update-1.39.1.zip'] = (200, bytes(bz), {}); s = Site(CUR, 9101); s.post('gh_check', {}); r = s.post('gh_install', {})
    check('B3 one changed byte in the download: refused (same size, wrong checksum)', not r.get('ok') and 'SHA-256' in r.get('error', '') and s.incoming() == [] and s.version() == '1.39.0', r)
    route_good(); ROUTES['/v1.39.1/site-update-1.39.1.zip'] = (200, z[:len(z) // 2], {}); s = Site(CUR, 9102); s.post('gh_check', {}); r = s.post('gh_install', {})
    check('B4 a cut-off download: refused', not r.get('ok') and s.incoming() == [], r)
    s = fresh_checked(zip='http://127.0.0.1:8124/evil/site-update-1.39.1.zip'); g = s.get('update_status')['gh']
    check('B5 latest.json pointing at another zip address is not trusted', g['latest'] is None and g['err'] != '', g)
    s = fresh_checked(sha256='ZZ'); g = s.get('update_status')['gh']; check('B6 a malformed checksum in latest.json is not trusted', g['latest'] is None and g['err'] != '', g)
    route_good(ver='1.39.2'); s = Site(CUR, 9103)   # latest.json says 1.39.2 but the file behind it is 1.39.1
    s.post('gh_check', {}); r = s.post('gh_install', {})
    check('B7 zip whose real version differs from what latest.json says: refused and discarded', not r.get('ok') and '1.39.1' in r.get('error', '') and s.incoming() == [] and s.version() == '1.39.0', (r, s.incoming()))
    route_good(); ROUTES['/latest.json'] = (200, b'{"version": "1.39.1"', {}); s = Site(CUR, 9104); r = s.post('gh_check', {})
    check('B8 broken latest.json: "Couldn\'t check", site keeps working', r.get('ok') and r['err'] != '' and r['latest'] is None, r)
    # API fallback
    route_good(); del ROUTES['/latest.json']
    ROUTES['/api.json'] = jl({'tag_name': 'v1.39.1', 'published_at': '2026-10-22T09:00:00Z', 'assets': [{'name': 'site-update-1.39.1.zip', 'size': len(z), 'browser_download_url': 'http://127.0.0.1:8124/v1.39.1/site-update-1.39.1.zip'}, {'name': 'site-update-1.39.1.zip.sha256', 'browser_download_url': 'http://127.0.0.1:8124/sha'}]})
    ROUTES['/sha'] = (200, ('%s  site-update-1.39.1.zip\n' % sha(NEW)).encode(), {})
    s = Site(CUR, 9105); LOG.clear(); r = s.post('gh_check', {})
    check('B9 Pages down: falls back to the GitHub API once and finds 1.39.1', r.get('newer') and r['latest']['via'] == 'api' and LOG.count('/api.json') == 1, (r, LOG))
    LOG.clear(); r = s.post('gh_check', {})
    check('B10 asked again the same day: the API is NOT asked again', LOG.count('/api.json') == 0 and r['err'] != '', (r, LOG))
    r = s.post('gh_install', {}); check('B11 install works from an API-found release too', r.get('ok') and r['staged']['version'] == '1.39.1', r)
    # redirect to a host that is not allowed
    route_good(); ROUTES['/v1.39.1/site-update-1.39.1.zip'] = (302, b'', {'Location': 'http://127.0.0.1:8125/x.zip'}); s = Site(CUR, 9106); s.post('gh_check', {}); r = s.post('gh_install', {})
    check('B12 a redirect to a host that is not GitHub is refused', not r.get('ok') and 'GitHub' in r.get('error', ''), r)
    # redirect within allowed host works
    route_good(); ROUTES['/v1.39.1/site-update-1.39.1.zip'] = (302, b'', {'Location': 'http://127.0.0.1:8124/real.zip'}); ROUTES['/real.zip'] = (200, z, {}); s = Site(CUR, 9107); s.post('gh_check', {}); r = s.post('gh_install', {})
    check('B13 a redirect to an allowed host is followed (as GitHub does)', r.get('ok'), r)
    # auth and csrf
    anon = Site(CUR, 9108); csrf = anon.csrf; anon.csrf = 'nope'
    check('B14 gh actions need the CSRF token', all(anon.post(a, {}).get('_status') == 403 for a in ('gh_check', 'gh_install', 'gh_auto')))
    anon.csrf = csrf; r = anon.post('gh_auto', {'on': True}); check('B15 daily check can be switched on and is remembered', r.get('auto') is True and anon.get('update_status')['gh']['auto'] is True, r)
    route_good(); LOG.clear(); anon.post('gh_check', {'auto': True}); check('B16 with it on, the automatic check makes the request', LOG == ['/latest.json'], LOG)
    anon.post('gh_auto', {'on': False}); LOG.clear(); anon.post('gh_check', {'auto': True}); check('B17 switched off again: no request', LOG == [], LOG)

    # ===== C. the real upgrade path 1.37.0 -> 1.39.0 by uploading the zip =====
    s = Site(OLD, 9200); r = s.chunks(CUR, 'site-update-1.39.0.zip')
    check('C1 uploaded 1.39.0 passes every check on a 1.37.0 site', r.get('ok') and all(c['ok'] for c in r['checks']), r)
    r = s.post('update_apply', {'password': PW}); time.sleep(0.5)
    check('C2 1.37.0 -> 1.39.0 applied by the old updater', r.get('ok') and s.version() == '1.39.0', r)
    check('C3 file check afterwards: 0 changed, 0 missing, 0 extra', s.clean()[:3] == (0, 0, 0), s.clean())
    st = s.get('update_status'); check('C4 new GitHub card data is there, daily check off', st['gh']['auto'] is False and st['gh']['curl'], st.get('gh'))
    r = s.post('update_apply', {'password': PW, 'back': True}); time.sleep(0.5)
    check('C5 Go Back to 1.37.0 works', r.get('ok') and s.version() == '1.37.0', r)

    # ===== D. the docs move: 1.38.0 (real release) -> 1.39.0 =====
    s = Site(REL38, 9300); r = s.chunks(CUR, 'site-update-1.39.0.zip')
    check('D1 a 1.38.0 site shows the 1.39.0 notes before updating (old path copy)', r.get('ok') and 'The logo' in (r.get('notes') or ''), (r.get('ok'), (r.get('notes') or '')[:120]))
    r = s.post('update_apply', {'password': PW}); time.sleep(0.5)
    check('D2 1.38.0 -> 1.39.0 applied', r.get('ok') and s.version() == '1.39.0', r)
    check('D3 file check afterwards: 0 changed, 0 missing, 0 extra', s.clean()[:3] == (0, 0, 0), s.clean())
    check('D4 docs are now in web/docs; the old readable source is gone', os.path.isfile(s.dir + '/web/docs/CHANGELOG.md') and os.path.isfile(s.dir + '/web/docs/.htaccess') and not os.path.isdir(s.dir + '/web/core-data/docs/src'), os.listdir(s.dir + '/web/core-data/docs'))
    cl = s.get('changelog'); check('D5 Settings > Changelog reads the new place', '1.39.0' in (cl.get('text') or cl.get('md') or json.dumps(cl))[:4000], str(cl)[:200])
    st = s.get('update_status'); check('D6 GitHub card still there after the move', 'gh' in st and st['gh']['auto'] is False, st.get('gh'))
    r = s.post('update_apply', {'password': PW, 'back': True}); time.sleep(0.5)
    check('D7 Go Back to 1.38.0 works', r.get('ok') and s.version() == '1.38.0', r)
    check('D8 after going back, 1.38.0 is whole again', s.clean()[:3] == (0, 0, 0), s.clean())
    # a 1.39.0 site reads notes of the next zip from the new place
    s = Site(CUR, 9301); r = s.chunks(NEW, 'site-update-1.39.1.zip')
    check('D9 a 1.39.0 site reads the next version\'s notes from web/docs', r.get('ok') and 'Test build' in (r.get('notes') or ''), (r.get('notes') or '')[:120])
    s = Site(CUR, 9302); r = s.chunks(REL38, 'site-update-1.38.0.zip')
    check('D10 an older zip is still refused as not newer', not r.get('ok') or not all(c['ok'] for c in r.get('checks', [])), r.get('error') or [c for c in r.get('checks', []) if not c['ok']][:1])
finally:
    for p in procs: p.terminate()
print('\n%d/%d passed' % (sum(res), len(res)))
sys.exit(0 if all(res) else 1)
