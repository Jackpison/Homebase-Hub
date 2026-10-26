#!/usr/bin/env python3
"""Update tests for Homebase Hub, against a local stand-in for GitHub (no network needed).
Needs PHP 8.3+ with curl, zip and mbstring. See tests/README.md."""
import json, os, shutil, subprocess, sys, threading, time, urllib.request, urllib.error, http.cookiejar, zipfile, hashlib, http.server, socketserver, glob

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import ROOT, FIX, SEED
from helpers import UA, PW, HERE, Site, Checks, mutate_zip, zip_version, zip_core, sha, stop_all
if len(sys.argv) < 4:
    sys.exit('Usage: python3 tests/server/update_test.py CURRENT.zip PREVIOUS.zip OLDER.zip\n'
             '  CURRENT   the zip just built (scripts/build.py)\n'
             '  PREVIOUS  the latest published release zip (before CURRENT)\n'
             '  OLDER     any older release zip (for the upload upgrade and Go Back tests)\n'
             'A "next" version (CURRENT with its patch number raised) is made by this script.')
CUR, REL38, OLD = sys.argv[1:4]
import re, tempfile, urllib.parse

CURV, PREVV, OLDV = zip_version(CUR), zip_version(REL38), zip_version(OLD)
_p = CURV.split('.'); NEXTV = '%s.%s.%d' % (_p[0], _p[1], int(_p[2]) + 1); NEXT2V = '%s.%s.%d' % (_p[0], _p[1], int(_p[2]) + 2)
TMP = tempfile.mkdtemp()
NEW = mutate_zip(CUR, TMP + '/next.zip', version=NEXTV)
_cl = zipfile.ZipFile(CUR).read('web/hub/docs/CHANGELOG.md').decode()
NOTEMARK = re.search(r'^## ' + re.escape(CURV) + r'\b[^\n]*\n+### ([^\n]+)', _cl, re.M).group(1)   # first heading of the newest notes

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
def route_good(ver=f'{NEXTV}', zp=NEW, **over):
    z = open(zp, 'rb').read()
    ROUTES.clear()
    ROUTES['/v%s/site-update-%s.zip' % (ver, ver)] = (200, z, {'Content-Type': 'application/zip'})
    d = {'version': ver, 'zip': 'http://127.0.0.1:8124/v%s/site-update-%s.zip' % (ver, ver), 'sha256': sha(zp), 'size': len(z), 'minPhp': '8.1', 'notes': 'test', 'published': '2026-10-22T09:00:00Z'}
    d.update(over); ROUTES['/latest.json'] = jl(d)
    LOG.clear()

# ---------- sites (tests/lib/helpers.py) ----------
check = Checks(); res = check.res

try:
    # ===== A. the GitHub path, 1.38.0 -> 1.39.1 =====
    s = Site(CUR, 8123); route_good()
    st = s.get('update_status'); g = st.get('gh', {})
    check('A1 fresh site: daily check is off, curl present, nothing known yet', g.get('auto') is False and g.get('curl') and g.get('latest') is None, g)
    s.get('overview'); s.get('update_status'); s.post('gh_check', {'auto': True})
    r = subprocess.run(['php', '-d', 'auto_prepend_file=' + os.path.join(HERE, 'prepend.php'), '-r', "require '%s/web/hub/core/lib/ghupdate.php'; gh_tick(); echo 'tick';" % s.dir], capture_output=True, text=True)
    check('A2 with the daily check off: status, overview, cron tick and an automatic check make NO request to GitHub', LOG == [] and r.stdout == 'tick', (LOG, r.stdout, r.stderr[:200]))
    r = s.post('gh_check', {}); g = r
    check(f'A3 Check Now finds {NEXTV} via latest.json (1 request)', g.get('newer') and g['latest']['version'] == f'{NEXTV}' and g['latest']['via'] == 'pages' and LOG == ['/latest.json'], (g, LOG))
    ov = s.get('overview'); check('A4 Overview shows the available version', any(f'{NEXTV}' in a['text'] for a in ov.get('alerts', [])), ov.get('alerts'))
    r = s.post('gh_install', {})
    check('A5 one click downloads, verifies and runs the full check', r.get('ok') and r.get('source') == 'github' and r['staged']['version'] == f'{NEXTV}' and all(c['ok'] for c in r['checks']), r)
    check('A6 the staged zip fingerprint equals the one GitHub lists', r.get('staged', {}).get('sha256') == sha(NEW), r.get('staged'))
    check('A7 nothing on the site changed yet', s.version() == f'{CURV}')
    bad = s.post('update_apply', {'password': 'wrong password here'}); check('A8 apply without the right password is refused', not bad.get('ok') and s.version() == f'{CURV}', bad)
    r = s.post('update_apply', {'password': PW}); time.sleep(0.5)
    check('A9 apply with the password works and the site answers', r.get('ok') and s.version() == f'{NEXTV}', r)
    check('A10 file check after the update: 0 changed, 0 missing, 0 extra', s.clean()[:3] == (0, 0, 0), s.clean())
    st = s.get('update_status'); check('A11 after update no newer version is offered', st['gh']['newer'] is False and st['version'] == f'{NEXTV}', st['gh'])
    r = s.post('gh_install', {}); check('A12 install when already current is refused', not r.get('ok'), r)

    # ===== B. refusals =====
    def fresh(): s = Site(CUR, 8123 + 10 + len(res)); return s
    def fresh_checked(**over):
        route_good(**over); s = Site(CUR, 9000 + len(res)); s.post('gh_check', {}); return s
    s = fresh_checked(sha256='0' * 64); r = s.post('gh_install', {})
    check('B1 wrong SHA-256 in latest.json: refused, nothing kept, nothing changed', not r.get('ok') and 'SHA-256' in r.get('error', '') and s.incoming() == [] and s.version() == f'{CURV}', (r, s.incoming()))
    s = fresh_checked(size=12345); r = s.post('gh_install', {})
    check('B2 wrong size in latest.json: refused', not r.get('ok') and 'size' in r.get('error', '') and s.incoming() == [], r)
    z = open(NEW, 'rb').read(); bz = bytearray(z); bz[len(bz) // 2] ^= 0xFF; open('/tmp/bad.zip', 'wb').write(bz)
    route_good(); ROUTES[f'/v{NEXTV}/site-update-{NEXTV}.zip'] = (200, bytes(bz), {}); s = Site(CUR, 9101); s.post('gh_check', {}); r = s.post('gh_install', {})
    check('B3 one changed byte in the download: refused (same size, wrong checksum)', not r.get('ok') and 'SHA-256' in r.get('error', '') and s.incoming() == [] and s.version() == f'{CURV}', r)
    route_good(); ROUTES[f'/v{NEXTV}/site-update-{NEXTV}.zip'] = (200, z[:len(z) // 2], {}); s = Site(CUR, 9102); s.post('gh_check', {}); r = s.post('gh_install', {})
    check('B4 a cut-off download: refused', not r.get('ok') and s.incoming() == [], r)
    s = fresh_checked(zip=f'http://127.0.0.1:8124/evil/site-update-{NEXTV}.zip'); g = s.get('update_status')['gh']
    check('B5 latest.json pointing at another zip address is not trusted', g['latest'] is None and g['err'] != '', g)
    s = fresh_checked(sha256='ZZ'); g = s.get('update_status')['gh']; check('B6 a malformed checksum in latest.json is not trusted', g['latest'] is None and g['err'] != '', g)
    route_good(ver=f'{NEXT2V}'); s = Site(CUR, 9103)   # latest.json says 1.39.2 but the file behind it is 1.39.1
    s.post('gh_check', {}); r = s.post('gh_install', {})
    check('B7 zip whose real version differs from what latest.json says: refused and discarded', not r.get('ok') and f'{NEXTV}' in r.get('error', '') and s.incoming() == [] and s.version() == f'{CURV}', (r, s.incoming()))
    route_good(); ROUTES['/latest.json'] = (200, ('{"version": "%s"' % NEXTV).encode(), {}); s = Site(CUR, 9104); r = s.post('gh_check', {})
    check('B8 broken latest.json: "Couldn\'t check", site keeps working', r.get('ok') and r['err'] != '' and r['latest'] is None, r)
    # API fallback
    route_good(); del ROUTES['/latest.json']
    ROUTES['/api.json'] = jl({'tag_name': f'v{NEXTV}', 'published_at': '2026-10-22T09:00:00Z', 'assets': [{'name': f'site-update-{NEXTV}.zip', 'size': len(z), 'browser_download_url': f'http://127.0.0.1:8124/v{NEXTV}/site-update-{NEXTV}.zip'}, {'name': f'site-update-{NEXTV}.zip.sha256', 'browser_download_url': 'http://127.0.0.1:8124/sha'}]})
    ROUTES['/sha'] = (200, (f'%s  site-update-{NEXTV}.zip\n' % sha(NEW)).encode(), {})
    s = Site(CUR, 9105); LOG.clear(); r = s.post('gh_check', {})
    check(f'B9 Pages down: falls back to the GitHub API once and finds {NEXTV}', r.get('newer') and r['latest']['via'] == 'api' and LOG.count('/api.json') == 1, (r, LOG))
    LOG.clear(); r = s.post('gh_check', {})
    check('B10 asked again the same day: the API is NOT asked again', LOG.count('/api.json') == 0 and r['err'] != '', (r, LOG))
    r = s.post('gh_install', {}); check('B11 install works from an API-found release too', r.get('ok') and r['staged']['version'] == f'{NEXTV}', r)
    # redirect to a host that is not allowed
    route_good(); ROUTES[f'/v{NEXTV}/site-update-{NEXTV}.zip'] = (302, b'', {'Location': 'http://127.0.0.1:8125/x.zip'}); s = Site(CUR, 9106); s.post('gh_check', {}); r = s.post('gh_install', {})
    check('B12 a redirect to a host that is not GitHub is refused', not r.get('ok') and 'GitHub' in r.get('error', ''), r)
    # redirect within allowed host works
    route_good(); ROUTES[f'/v{NEXTV}/site-update-{NEXTV}.zip'] = (302, b'', {'Location': 'http://127.0.0.1:8124/real.zip'}); ROUTES['/real.zip'] = (200, z, {}); s = Site(CUR, 9107); s.post('gh_check', {}); r = s.post('gh_install', {})
    check('B13 a redirect to an allowed host is followed (as GitHub does)', r.get('ok'), r)
    # auth and csrf
    anon = Site(CUR, 9108); csrf = anon.csrf; anon.csrf = 'nope'
    check('B14 gh actions need the CSRF token', all(anon.post(a, {}).get('_status') == 403 for a in ('gh_check', 'gh_install', 'gh_auto')))
    anon.csrf = csrf; r = anon.post('gh_auto', {'on': True}); check('B15 daily check can be switched on and is remembered', r.get('auto') is True and anon.get('update_status')['gh']['auto'] is True, r)
    route_good(); LOG.clear(); anon.post('gh_check', {'auto': True}); check('B16 with it on, the automatic check makes the request', LOG == ['/latest.json'], LOG)
    anon.post('gh_auto', {'on': False}); LOG.clear(); anon.post('gh_check', {'auto': True}); check('B17 switched off again: no request', LOG == [], LOG)

    # ===== C. the real upgrade path 1.37.0 -> 1.39.0 by uploading the zip =====
    s = Site(OLD, 9200); r = s.chunks(CUR, f'site-update-{CURV}.zip')
    # 1.50 moved the engine to web/hub/core; an updater from before 1.49 cannot take that step and must refuse it safely
    OLD_TOO_OLD = zip_core(CUR) != zip_core(OLD) and b'UP_CORES' not in zipfile.ZipFile(OLD).read(zip_core(OLD) + '/lib/update.php')
    if OLD_TOO_OLD:
        check(f'C1 a {OLDV} site refuses {CURV} (new folder layout; 1.49 is needed first)', not r.get('ok') and 'Refused' in r.get('error', ''), str(r)[:200])
        r = s.post('update_apply', {'password': PW})
        check('C2 ...nothing can be applied and nothing changed', not r.get('ok') and s.version() == f'{OLDV}' and s.clean()[:3] == (0, 0, 0), (r, s.clean()))
    else:
        # Home's own links (up to 1.50): a site that jumps straight to the newest version must still find them in Links
        home_links = 'columns' in zipfile.ZipFile(OLD).read('web/home/lib.php').decode('utf-8', 'replace')
        if home_links:
            s.php("require_once 'web/home/lib.php'; write_json(SITE_FILE, ['columns' => [[['id' => 'h1', 'name' => 'Old Home Link', 'url' => 'https://old-home.example', 'icon' => ['type' => 'auto', 'value' => '']]], []]]);")
        check(f'C1 uploaded {CURV} passes every check on a {OLDV} site', r.get('ok') and all(c['ok'] for c in r['checks']), r)
        r = s.post('update_apply', {'password': PW}); time.sleep(0.5)
        check(f'C2 {OLDV} -> {CURV} applied by the old updater', r.get('ok') and s.version() == f'{CURV}', r)
        check('C3 file check afterwards: 0 changed, 0 missing, 0 extra', s.clean()[:3] == (0, 0, 0), s.clean())
        if home_links:
            urllib.request.urlopen(s.base + '/web/home/').read()   # the first visit to Home moves its links
            moved = s.php("$d = hub_read_guarded(hub_dir('links') . '/bookmarks.php'); $u = []; foreach ($d['tabs'] ?? [] as $t) foreach ($t['categories'] ?? [] as $c) foreach ($c['links'] ?? [] as $l) $u[] = $l['url']; echo json_encode($u);")
            left = s.php("require_once 'web/home/lib.php'; echo json_encode(array_key_exists('columns', read_json(SITE_FILE) ?? []));")
            check(f'C3b a {OLDV} site\'s Home links arrive in Links after updating straight to {CURV}, and Home keeps no copy', 'https://old-home.example' in json.loads(moved or '[]') and left == 'false', (moved[:200], left))
        st = s.get('update_status'); check('C4 new GitHub card data is there, daily check off', st['gh']['auto'] is False and st['gh']['curl'], st.get('gh'))
        r = s.post('update_apply', {'password': PW, 'back': True}); time.sleep(0.5)
        check(f'C5 Go Back to {OLDV} works', r.get('ok') and s.version() == f'{OLDV}', r)

    # ===== D. the docs move: 1.38.0 (real release) -> 1.39.0 =====
    s = Site(REL38, 9300)
    moving = zip_core(REL38) != zip_core(CUR)   # 1.49 -> 1.50: the engine, pictures and docs move to web/hub
    if moving:   # a picture and the logo where the old layout keeps them
        om = s.dir + '/web/core-data/media'
        import base64
        r = s.post('logo', {'data': 'data:image/png;base64,' + base64.b64encode(open(os.path.join(FIX, 'favicon-fixture.png'), 'rb').read()).decode()})
        LOGO = os.path.basename(s.php("echo hub_settings()['logo'];"))
        check('D0 the old site keeps its logo in web/core-data/media', r.get('ok') and LOGO.startswith('logo-') and os.path.isfile(om + '/brand/' + LOGO), (r, LOGO))
        os.makedirs(om + '/home/photos', exist_ok=True); open(om + '/home/photos/mine.jpg', 'wb').write(b'my photo')
    r = s.chunks(CUR, f'site-update-{CURV}.zip')
    check(f'D1 a {PREVV} site shows the {CURV} notes before updating ', r.get('ok') and NOTEMARK in (r.get('notes') or ''), (r.get('ok'), (r.get('notes') or '')[:120]))
    r = s.post('update_apply', {'password': PW}); time.sleep(0.5)
    check(f'D2 {PREVV} -> {CURV} applied', r.get('ok') and s.version() == f'{CURV}', r)
    check('D3 file check afterwards: 0 changed, 0 missing, 0 extra', s.clean()[:3] == (0, 0, 0), s.clean())
    had_old = 'web/core-data/docs/CHANGELOG.md' in zipfile.ZipFile(REL38).namelist()
    check('D3b the old second copy of the changelog (web/core-data/docs) is gone after the update', not os.path.exists(s.dir + '/web/core-data/docs/CHANGELOG.md'), 'previous zip had it: %s' % had_old)
    had_cast = any(n.startswith('web/hub/animation/') for n in zipfile.ZipFile(REL38).namelist())
    has_cast = any(n.startswith('web/hub/animation/') for n in zipfile.ZipFile(CUR).namelist())
    if had_cast and not has_cast:   # 1.53: the Home characters (1.52) were taken out again
        check('D3c the Home characters of %s are gone after the update (folder and all)' % PREVV, not os.path.exists(s.dir + '/web/hub/animation'), os.listdir(s.dir + '/web/hub'))
    check('D4 docs are now in web/hub/docs; the old readable source is gone', os.path.isfile(s.dir + '/web/hub/docs/CHANGELOG.md') and os.path.isfile(s.dir + '/web/hub/docs/.htaccess') and not os.path.isdir(s.dir + '/web/core-data/docs/src'), os.listdir(s.dir + '/web/hub/core') )
    if moving:
        s.get('state')   # the first request after the update moves your files
        nm = s.dir + '/web/hub/media'
        check('D4b your pictures moved to web/hub/media', os.path.isfile(nm + '/brand/' + LOGO) and open(nm + '/home/photos/mine.jpg', 'rb').read() == b'my photo', sorted(os.listdir(nm)))
        check('D4c the old web/core-data folder is gone', not os.path.exists(s.dir + '/web/core-data'), os.listdir(s.dir + '/web/core-data') if os.path.isdir(s.dir + '/web/core-data') else '')
        logo = s.php("echo hub_settings()['logo'];")
        ok = urllib.request.urlopen(s.base + '/' + logo).status == 200 if logo else False
        check('D4d the logo is read from its new place and loads', logo == 'web/hub/media/brand/' + LOGO and ok, logo)
        r = subprocess.run(['php', s.dir + '/web/hub/core/cron.php'], capture_output=True, text=True)
        check('D4e the schedule runs from its new address (web/hub/core/cron.php)', r.returncode == 0 and 'Reminders' in r.stdout, (r.stdout[-200:], r.stderr[-200:]))
    cl = s.get('changelog'); check('D5 Settings > Changelog reads the new place', f'{CURV}' in (cl.get('text') or cl.get('md') or json.dumps(cl))[:4000], str(cl)[:200])
    st = s.get('update_status'); check('D6 GitHub card still there after the move', 'gh' in st and st['gh']['auto'] is False, st.get('gh'))
    r = s.post('update_apply', {'password': PW, 'back': True}); time.sleep(0.5)
    check(f'D7 Go Back to {PREVV} works', r.get('ok') and s.version() == f'{PREVV}', r)
    check(f'D8 after going back, {PREVV} is whole again', s.clean()[:3] == (0, 0, 0), s.clean())
    if had_cast and not has_cast:
        check(f'D8a ...and Go Back brings {PREVV}\'s characters back', os.path.isfile(s.dir + '/web/hub/animation/cast.js'), '')
    if moving:
        s.get('state')
        check(f'D8b after going back, your pictures are where {PREVV} looks for them', os.path.isfile(s.dir + '/web/core-data/media/brand/' + LOGO) and s.php("echo hub_settings()['logo'];") == 'web/core-data/media/brand/' + LOGO and os.path.isfile(s.dir + '/web/core-data/media/home/photos/mine.jpg') and not os.path.exists(s.dir + '/web/hub/media/home/photos/mine.jpg'), '')
    # a 1.39.0 site reads notes of the next zip from the new place
    s = Site(CUR, 9301); r = s.chunks(NEW, f'site-update-{NEXTV}.zip')
    check(f'D9 a {CURV} site reads the next version\'s notes from web/hub/docs', r.get('ok') and 'Test build' in (r.get('notes') or ''), (r.get('notes') or '')[:120])
    s = Site(CUR, 9302); r = s.chunks(REL38, f'site-update-{PREVV}.zip')
    check('D10 an older zip is still refused as not newer', not r.get('ok') or not all(c['ok'] for c in r.get('checks', [])), r.get('error') or [c for c in r.get('checks', []) if not c['ok']][:1])

    # ===== E. the PHP minimum =====
    man = json.loads(zipfile.ZipFile(CUR).read('web/hub/core/manifest.json'))
    boot_min = re.search(r"const HUB_MIN_PHP = '([^']+)'", zipfile.ZipFile(CUR).read('web/hub/core/lib/boot.php').decode()).group(1)
    check('E1 the zip\'s file list carries the PHP minimum from the code', man.get('minPhp') == boot_min and re.match(r'^\d+\.\d+$', boot_min), man.get('minPhp'))
    s = Site(CUR, 9400); r = s.chunks(mutate_zip(CUR, TMP + '/php99.zip', version=NEXTV, minphp='99.0'), f'site-update-{NEXTV}.zip')
    check('E2 an uploaded zip that needs a newer PHP is refused with a clear message', not r.get('ok') and 'PHP 99.0' in json.dumps(r) and s.version() == CURV, json.dumps(r)[:300])
    check('E3 nothing was kept or changed after that refusal', s.version() == CURV and s.get('update_status').get('staged') in (None, False), s.get('update_status').get('staged'))
    route_good(minPhp='99.0'); s = Site(CUR, 9401); g = s.post('gh_check', {}); r = s.post('gh_install', {})
    check('E4 an update from GitHub that needs a newer PHP is refused', g.get('newer') and g.get('phpOk') is False and not r.get('ok') and 'PHP 99.0' in r.get('error', ''), (g.get('phpOk'), r))
    s = Site(CUR, 9402); r = s.chunks(mutate_zip(CUR, TMP + '/php83.zip', version=NEXTV, minphp=boot_min), f'site-update-{NEXTV}.zip')
    check('E5 a zip that needs only the minimum PHP is accepted', r.get('ok') and all(c['ok'] for c in r['checks']), json.dumps(r)[:300])
    prog = ("require '%s/web/hub/core/lib/boot.php'; $now = strtotime('2026-10-23 12:00 UTC'); foreach (['7.4','8.1','8.2','8.3','8.4','8.5','9.0'] as $b) { $n = hub_php_notice($b, $now); echo $b, '=', $n ? $n['level'] : 'none', ' '; }" % s.dir)
    out = subprocess.run(['php', '-r', prog], capture_output=True, text=True).stdout.strip()
    check('E6 the PHP support notice: 7.4 and 8.1 warn, 8.2 gives notice, newer ones stay quiet (at 23 Oct 2026)', out == '7.4=warn 8.1=warn 8.2=info 8.3=none 8.4=none 8.5=none 9.0=none', out)
    # ===== F. Tools > Favicon: the icon address (the icon service is replaced by a fixture; nothing leaves this computer) =====
    fixture = open(os.path.join(FIX, 'favicon-fixture.png'), 'rb').read()
    s = Site(CUR, 9500)
    def anon(qs, method='GET'):
        rq = urllib.request.Request(s.base + '/web/hub/core/api.php?action=favicon' + qs, method=method, data=b'{}' if method == 'POST' else None, headers={'User-Agent': UA})
        try:
            r = urllib.request.urlopen(rq, timeout=30); return r.status, dict(r.headers), r.read()
        except urllib.error.HTTPError as e: return e.code, dict(e.headers), e.read()
    st_, hd, bd = anon('&domain=Example.com&sz=64')
    check('F1 a visitor without a login gets the icon as a PNG', st_ == 200 and hd.get('Content-Type') == 'image/png' and bd == fixture, (st_, hd.get('Content-Type')))
    check('F2 512 is an offered size', anon('&domain=example.com&sz=512')[0] == 200)
    bad = ['localhost', '127.0.0.1', '10.0.0.5', 'a b.com', 'exa_mple.com', '-bad.com', 'bad-.com', 'x.com/../etc', 'http://x.com', 'x.com:80', ('a' * 300) + '.com', '', '..', 'x..com']
    wrong = [d for d in bad if anon('&domain=' + urllib.parse.quote(d) + '&sz=64')[0] != 400]
    check('F3 anything that is not a plain website name is refused', not wrong, wrong)
    check('F4 sizes that are not offered are refused', all(anon('&domain=example.com' + z)[0] == 400 for z in ('&sz=7', '&sz=0', '&sz=1024', '&sz=abc', '')))
    check('F5 only GET is accepted', anon('&domain=example.com&sz=64', 'POST')[0] == 405)
    n_ok = 2 + 0; code = 200
    while code == 200 and n_ok < 100: code = anon('&domain=example.com&sz=32')[0]; n_ok += 1 if code == 200 else 0
    st_, hd, _b = anon('&domain=example.com&sz=32')
    check('F6 a visitor is limited to 60 icons per 10 minutes, then gets a clear wait message', code == 429 and st_ == 429 and 58 <= n_ok <= 60 and hd.get('Retry-After') == '600', (code, n_ok, hd.get('Retry-After')))
    zf = zipfile.ZipFile(CUR); defs = [n for n in zf.namelist() if n.endswith('.php') and re.search(rb"define\('HUB_TEST_", zf.read(n))]
    check('F7 the release never turns the test shortcut on by itself', not defs, defs)
    prog = ("require '%s/web/hub/core/lib/boot.php'; echo (hub_png_ok(file_get_contents('%s')) ? 'y' : 'n'), (hub_png_ok('GIF89a' . str_repeat('x', 200)) ? 'y' : 'n'), (hub_png_ok('<html>' . str_repeat('x', 200)) ? 'y' : 'n'), (hub_png_ok(\"\\x89PNG\\r\\n\\x1a\\n\" . str_repeat('x', 30)) ? 'y' : 'n');" % (s.dir, os.path.join(FIX, 'favicon-fixture.png')))
    out = subprocess.run(['php', '-r', prog], capture_output=True, text=True).stdout.strip()
    check('F8 only a real PNG of a sensible size is passed on (not a GIF, a web page or a stub)', out == 'ynnn', out)
finally:
    stop_all()
sys.exit(check.done())
