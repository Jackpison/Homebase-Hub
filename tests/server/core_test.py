#!/usr/bin/env python3
"""Core features through the real API (no browser): backup and restore (plain, per part, encrypted, earlier versions),
two-step login, trusted browsers, sessions, password change, Start Over, the login lockout, and the CSRF token on every
changing action.   python3 tests/server/core_test.py build/site-update-X.Y.Z.zip
Needs PHP 8.3+ with curl, zip, mbstring and openssl. Runs sites on ports 8700-8760."""
import base64, hashlib, hmac, http.client, json, os, re, struct, subprocess, sys, time

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import SEED
from helpers import PW, Site, Checks, stop_all

if len(sys.argv) < 2: sys.exit(__doc__)
ZIP = sys.argv[1]
check = Checks()
PP = 'river lantern copper meadow'


def totp(secret, step):
    """RFC 6238: HMAC-SHA1, 30-second steps, 6 digits."""
    key = base64.b32decode(secret + '=' * (-len(secret) % 8), casefold=True)
    h = hmac.new(key, struct.pack('>Q', step), hashlib.sha1).digest()
    o = h[19] & 15
    return '%06d' % ((struct.unpack('>I', h[o:o + 4])[0] & 0x7FFFFFFF) % 1000000)


def snap(s):
    """The four data parts as the site stores them (only the content, not the save counters)."""
    out = s.php("require HUB_CORE . '/lib/backup.php'; echo json_encode(['info' => bk_info_data()['tabs'] ?? null, 'cards' => bk_cards_data()['cards'] ?? null, 'links' => bk_links_data()['tabs'] ?? null, 'tasks' => bk_tasks_data()['tasks'] ?? null]);")
    return json.loads(out)


def seed(s):
    r = subprocess.run(['php', SEED, s.dir], capture_output=True, text=True)
    assert 'seeded' in r.stdout, r.stdout + r.stderr
    s.php("""hub_write_guarded(hub_dir('links') . '/bookmarks.php', ['settings' => [], 'tabs' => [['id' => 't1', 'name' => 'Daily', 'categories' => [['name' => 'News', 'links' => [['title' => 'Example', 'url' => 'https://example.com/']]]]]]]);
      require_once HUB_WEB . '/tasks/lib.php';
      hub_jput(hub_dir('tasks') . '/tasks.json', json_encode(tasks_clean(['tasks' => [['id' => 'task01', 'name' => 'Water the plants', 'due' => '2026-11-01', 'repeat' => ['n' => 1, 'unit' => 'week']]], 'log' => [], 'settings' => []])));""")


def change(s):
    s.php("""require HUB_CORE . '/lib/backup.php';
      $i = bk_info_data(); $i['tabs'] = [['id' => 'zz', 'name' => 'Changed', 'layout' => 'cards', 'color' => '', 'boxes' => []]]; hub_jput(bk_info_file(), json_encode($i));
      $c = bk_cards_data(); $c['cards'] = []; hub_jput(bk_cards_file(), json_encode($c));""")


def decrypt(enc_text, passphrase):
    """What the browser does with an encrypted backup file and a passphrase (PBKDF2-SHA256, AES-256-GCM, gzip)."""
    prog = r'''$j = json_decode(stream_get_contents(STDIN), true); $pp = $argv[1];
      $key = hash_pbkdf2('sha256', $pp, base64_decode($j['salt']), (int)$j['iter'], 32, true);
      $raw = base64_decode($j['data']); $p = openssl_decrypt(substr($raw, 0, -16), 'aes-256-gcm', $key, OPENSSL_RAW_DATA, base64_decode($j['iv']), substr($raw, -16));
      echo $p === false ? 'WRONG' : gzdecode($p);'''
    return subprocess.run(['php', '-r', prog, passphrase], input=enc_text, capture_output=True, text=True).stdout


def rate_file(s): return s.dir + '/site-data/core/ratelimit.php'
def rate_read(s):
    t = open(rate_file(s)).read(); return json.loads(t[t.index('\n') + 1:]) if '\n' in t else {}
def rate_write(s, d):
    t = open(rate_file(s)).read(); open(rate_file(s), 'w').write(t[:t.index('\n') + 1] + json.dumps(d))
def rate_reset(s):
    if os.path.exists(rate_file(s)): rate_write(s, {})


def login_from(s, source, pw):
    """A login from another address on this computer (127.0.0.2): the lockout counts each address on its own."""
    c = http.client.HTTPConnection('127.0.0.1', s.port, timeout=30, source_address=(source, 0))
    c.request('POST', '/web/hub/core/api.php?action=login', body=json.dumps({'password': pw}), headers={'Content-Type': 'application/json', 'User-Agent': 'third-browser/3.0'})
    r = c.getresponse(); st = r.status; r.read(); c.close(); return st


try:
    # ===== A. Backup and restore =====
    s = Site(ZIP, 8700); seed(s)
    before = snap(s)
    check('A0 demo data is in place (Info tabs, Cards, Links, Tasks)', before['info'] and before['cards'] and before['links'] and before['tasks'], before)
    st, hd, raw = s.raw(s.api + '?action=backup', hdr={'X-Hub-CSRF': s.csrf})
    bk = json.loads(raw)
    info_ids = [x['id'] for x in before['info']]
    st1, hd1, raw1 = s.raw(s.api + '?action=backup&parts=info&info_tabs=' + info_ids[0], hdr={'X-Hub-CSRF': s.csrf})
    one = json.loads(raw1)
    check('A1 a full backup downloads as a site backup with every part', st == 200 and bk.get('format') == 'site-backup' and {'links', 'info', 'cards', 'tasks', 'settings'} <= set(bk.get('parts', {})), (st, list(bk.get('parts', {}))))
    change(s)
    check('A2 the data changed after the backup', snap(s) != before)
    r = s.post('restore', {'backup': bk})
    after = snap(s)
    check('A3 restoring the whole backup brings every part back exactly', r.get('ok') and after == before, (r, [k for k in before if before[k] != after[k]]))
    ov = s.get('backup_overview'); vers = [v for v in ov.get('versions', []) if v['app'] == 'info']
    check('A4 the restore kept an earlier version of Info first', len(vers) >= 1, ov.get('versions'))
    r = s.post('version_restore', {'app': 'info', 'id': vers[0]['id']})
    check('A5 Earlier Versions puts the changed Info back (the restore can be undone)', r.get('ok') and snap(s)['info'][0]['name'] == 'Changed', (r, snap(s)['info'][:1]))
    change(s)
    r = s.post('restore', {'backup': bk, 'pick': {'cards': True}})
    now = snap(s)
    check('A6 restoring one part (Cards) brings only that part back', r.get('ok') and now['cards'] == before['cards'] and now['info'][0]['name'] == 'Changed', r)
    check('A7 a backup of one Info tab holds just that tab', [t['id'] for t in one['parts']['info']['tabs']] == info_ids[:1], one.get('parts', {}).get('info', {}).get('tabs'))
    change(s)
    r = s.post('restore', {'backup': one, 'mode': 'merge'})
    check('A8 merging that one tab back adds it beside the changed tab', r.get('ok') and [t['id'] for t in snap(s)['info']] == ['zz', info_ids[0]], [t['id'] for t in snap(s)['info']])
    r = s.post('restore', {'backup': {'hello': 'world'}})
    check('A9 a file that is not a backup is refused and changes nothing', not r.get('ok') and r.get('_status') == 400, r)

    s.post('restore', {'backup': bk})   # back to the demo data
    # secrets: two-step on, a passphrase set, a trusted browser
    tb = s.post('twostep_begin'); sec = tb.get('secret', '')
    en = s.post('twostep_enable', {'code': totp(sec, int(time.time()) // 30)})
    pp = s.post('pp_set', {'password': PW, 'passphrase': PP})
    check('A10 two-step login and the passphrase are on', tb.get('ok') and en.get('ok') and pp.get('ok'), (tb, en, pp))
    auth = s.php("echo json_encode(hub_auth());"); a = json.loads(auth)
    key = json.loads(s.php("require HUB_CORE . '/lib/backup.php'; echo json_encode(bk_key());"))
    st, hd, raw = s.raw(s.api + '?action=backup', hdr={'X-Hub-CSRF': s.csrf}); text = raw.decode()
    leaks = [n for n, v in [('password', PW), ('password hash', a['hash']), ('two-step secret', sec), ('recovery codes', (en.get('recovery') or ['x' * 12])[0].replace('-', '')),
                            ('passphrase', PP), ('backup key', key['key']), ('backup salt', key['salt'])] if v and v in text.replace('-', '') ]
    check('A11 a backup never holds the password, two-step secret, recovery codes, passphrase or backup key', not leaks and 'totp' not in json.loads(text)['parts'].get('settings', {}), leaks)
    st, hd, raw = s.raw(s.api + '?action=backup&enc=1', hdr={'X-Hub-CSRF': s.csrf}); enc = raw.decode()
    ej = json.loads(enc)
    check('A12 an encrypted backup is AES-256-GCM and holds no readable data', ej.get('format') == 'site-backup-encrypted' and ej.get('cipher') == 'AES-256-GCM' and 'Lemon Pasta' not in enc, list(ej))
    plain = decrypt(enc, PP)
    check('A13 the right passphrase opens it', plain.startswith('{') and json.loads(plain).get('format') == 'site-backup', plain[:80])
    check('A14 a wrong passphrase does not', decrypt(enc, 'not the passphrase') == 'WRONG')
    change(s)
    r = s.post('restore', {'backup': json.loads(plain)})
    check('A15 the opened encrypted backup restores like a plain one', r.get('ok') and snap(s)['cards'] == before['cards'], r)
    r = s.post('restore', {'backup': ej})
    check('A16 the encrypted file itself (not opened) is refused by restore', not r.get('ok'), r)
    s.stop()

    # ===== B. Two-step login, trusted browsers, sessions =====
    s = Site(ZIP, 8710)
    tb = s.post('twostep_begin'); sec = tb['secret']
    step = int(time.time()) // 30
    check('B1 enabling needs a right code', not s.post('twostep_enable', {'code': '000000' if totp(sec, step) != '000000' else '111111'}).get('ok'))
    en = s.post('twostep_enable', {'code': totp(sec, step)}); codes = en.get('recovery') or []
    check('B2 two-step login turns on and gives recovery codes', en.get('ok') and len(codes) >= 5, en)
    b = s.client('browser-b/1.0'); b.get('state')
    r = b.post('login', {'password': PW}, csrf=False)
    check('B3 the password alone is not enough now: a code is asked for', not r.get('ok') and r.get('need2fa'), r)
    r = b.post('login', {'password': PW, 'code': '123456' if totp(sec, step + 1) != '123456' else '654321'}, csrf=False)
    check('B4 a wrong code is refused', not r.get('ok') and r.get('need2fa'), r)
    r = b.post('login', {'password': PW, 'code': totp(sec, step + 1)}, csrf=False)
    check('B5 the password and the right code log in', r.get('ok') and b.get('state').get('admin') is True, r)
    rate_reset(s)
    c = s.client('browser-c/1.0'); c.get('state')
    r = c.post('login', {'password': PW, 'code': totp(sec, step + 1)}, csrf=False)
    check('B6 the same code cannot be used twice', not r.get('ok'), r)
    r = c.post('login', {'password': PW, 'code': codes[0]}, csrf=False)
    check('B7 a recovery code works', r.get('ok'), r)
    d = s.client('browser-d/1.0'); d.get('state')
    r = d.post('login', {'password': PW, 'code': codes[0]}, csrf=False)
    check('B8 ...once only', not r.get('ok'), r)
    rate_reset(s)
    nr = s.post('recovery_new', {'password': PW}); new = nr.get('recovery') or []
    check('B9 New Recovery Codes needs the password and gives new codes', nr.get('ok') and new and set(new).isdisjoint(codes), nr)
    r = d.post('login', {'password': PW, 'code': codes[1]}, csrf=False)
    check('B10 an old recovery code no longer works', not r.get('ok'), r)
    r = d.post('login', {'password': PW, 'code': new[0]}, csrf=False)
    check('B11 a new one does', r.get('ok'), r)
    rate_reset(s)
    t = s.client('browser-trusted/1.0'); t.get('state')
    r = t.post('login', {'password': PW, 'code': new[1], 'trust': True}, csrf=False)
    t.csrf = t.get('state').get('csrf', '')
    t.post('logout', {}, csrf=False)
    check('B12 "trust this browser" logs in and sets a trust cookie', r.get('ok') and any(ck.name == 'hub_trust' for ck in t.cj), [ck.name for ck in t.cj])
    r = t.post('login', {'password': PW}, csrf=False)
    check('B13 a trusted browser skips the code next time', r.get('ok') and t.get('state').get('admin') is True, r)
    t.post('logout', {}, csrf=False)
    r = t.post('login', {'password': 'wrong password entirely'}, csrf=False)
    check('B14 a trusted browser never skips the password', not r.get('ok') and r.get('_status') == 401, r)
    rate_reset(s)
    r = t.login()
    st_b = b.get('state').get('admin'); st_t = t.get('state').get('admin')
    r = s.post('logoutall'); s.csrf = r.get('csrf', s.csrf)
    check('B15 Log Out Other Devices ends the other sessions and keeps this one', st_b and st_t and r.get('ok') and b.get('state').get('admin') is False and t.get('state').get('admin') is False and s.get('state').get('admin') is True, r)
    rate_reset(s)
    t.login()
    act = s.get('activity'); other = [x for x in act.get('sessions', []) if not x['me']]; mine = [x for x in act.get('sessions', []) if x['me']]
    r = s.post('session_revoke', {'id': other[0]['id']}) if other else {}
    check('B16 one device can be logged out from the Devices list', other and r.get('ok') and t.get('state').get('admin') is False and s.get('state').get('admin') is True, (act.get('sessions'), r))
    r = s.post('session_revoke', {'id': mine[0]['id']}) if mine else {'ok': True}
    check('B17 this device cannot log itself out from that list', not r.get('ok'), r)
    rate_reset(s)
    t.login()
    r = s.post('password', {'current': PW, 'password': 'a brand new website password'}); s.csrf = r.get('csrf', s.csrf)
    check('B18 changing the password ends the other sessions and keeps this one', r.get('ok') and t.get('state').get('admin') is False and s.get('state').get('admin') is True, r)
    x = s.client('browser-x/1.0'); x.get('state')
    check('B19 the old password no longer works', not x.post('login', {'password': PW, 'code': new[2]}, csrf=False).get('ok'))
    rate_reset(s)
    check('B20 the new one does', x.post('login', {'password': 'a brand new website password', 'code': new[3]}, csrf=False).get('ok'))
    s.stop()

    # ===== C. Start Over =====
    s = Site(ZIP, 8720); seed(s)
    tb = s.post('twostep_begin'); sec = tb['secret']; en = s.post('twostep_enable', {'code': totp(sec, int(time.time()) // 30)}); codes = en['recovery']
    s.post('pp_set', {'password': PW, 'passphrase': PP})
    s.php("""hub_jput(hub_dir('core') . '/notify.json', json_encode(['token' => '1:test', 'chat' => '1']));
      hub_jput(hub_dir('core') . '/watch.json', json_encode(['domains' => [['d' => 'example.com']]]));
      @mkdir(HUB_MEDIA . '/home/uploads', 0755, true); file_put_contents(HUB_MEDIA . '/home/uploads/a.jpg', 'x');
      $st = hub_settings(); $st['siteName'] = 'Before Start Over'; hub_settings_save($st);""")
    full = snap(s)
    r = s.post('reset_all', {'confirm': 'erase', 'password': PW})
    check('C1 without the word ERASE nothing is erased', not r.get('ok') and snap(s) == full, r)
    r = s.post('reset_all', {'confirm': 'ERASE', 'password': 'not my password'})
    check('C2 with a wrong password nothing is erased', not r.get('ok') and r.get('_status') == 401 and snap(s) == full, r)
    rate_reset(s)
    r = s.post('reset_all', {'confirm': 'ERASE', 'password': PW})
    gone = snap(s)
    left = s.php("""echo json_encode(['notify' => is_file(hub_jpath(hub_dir('core') . '/notify.json')), 'watch' => is_file(hub_jpath(hub_dir('core') . '/watch.json')),
      'pp' => hub_pp_on(), 'key' => is_file(hub_jpath(hub_dir('core') . '/backup-key.json')), 'media' => is_file(HUB_MEDIA . '/home/uploads/a.jpg'),
      'name' => hub_settings()['siteName'], 'totp' => !empty(hub_auth()['totp']['on'])]);""")
    left = json.loads(left)
    check('C3 ERASE and the password erase every page', r.get('ok') and not gone['info'] and not gone['cards'] and not gone['links'] and not gone['tasks'], (r, gone))
    check('C4 ...and media, settings, Telegram, the watch list and the passphrase', not left['notify'] and not left['watch'] and not left['pp'] and not left['key'] and not left['media'] and left['name'] != 'Before Start Over', left)
    check('C5 two-step login is kept', left['totp'] is True, left)
    y = s.client('browser-y/1.0'); y.get('state')
    r1 = y.post('login', {'password': PW}, csrf=False); r2 = y.post('login', {'password': PW, 'code': codes[0]}, csrf=False)
    check('C6 the password is kept (and still asks for the code)', r1.get('need2fa') and r2.get('ok'), (r1, r2))
    s.stop()

    # ===== D. Login lockout =====
    s = Site(ZIP, 8730)
    w = s.client('wrong-guesser/1.0'); w.get('state')
    replies = [w.post('login', {'password': 'guess %d' % i}, csrf=False) for i in range(5)]
    check('D1 four wrong passwords say how many tries are left', all(x.get('_status') == 401 and 'left' in x.get('error', '') for x in replies[:4]), [x.get('error') for x in replies])
    check('D2 the fifth pauses logins', 'paused' in replies[4].get('error', ''), replies[4])
    r = w.post('login', {'password': PW}, csrf=False)
    check('D3 during the pause even the right password is refused (429, in minutes)', r.get('_status') == 429 and '15 minutes' in r.get('error', ''), r)
    o = s.client('other-browser-same-address/1.0'); o.get('state')
    r = o.post('login', {'password': PW}, csrf=False)
    check('D4 another browser at the same address shares the pause (the limit is per address)', r.get('_status') == 429, r)
    check('D5 a different address is limited on its own and can log in', login_from(s, '127.0.0.2', PW) == 200)
    d = rate_read(s); k = [k for k, v in d.items() if v.get('until', 0) > time.time()]
    check('D6 the first pause is 15 minutes', len(k) == 1 and 880 <= d[k[0]]['until'] - time.time() <= 905, d)
    d[k[0]]['until'] = int(time.time()) - 1; d[k[0]]['first'] = int(time.time()) - 1000; rate_write(s, d)   # move the clock past the pause
    for i in range(5): w.post('login', {'password': 'again %d' % i}, csrf=False)
    d = rate_read(s); k2 = [k for k, v in d.items() if v.get('until', 0) > time.time()]
    check('D7 five more wrong tries after the pause: the next pause is twice as long (30 minutes)', len(k2) == 1 and 1780 <= d[k2[0]]['until'] - time.time() <= 1805, d)
    d[k2[0]]['locks'] = 20; d[k2[0]]['until'] = int(time.time()) - 1; d[k2[0]]['first'] = int(time.time()) - 1000; rate_write(s, d)
    for i in range(5): w.post('login', {'password': 'more %d' % i}, csrf=False)
    d = rate_read(s); k3 = [k for k, v in d.items() if v.get('until', 0) > time.time()]
    check('D9 pauses never grow past one day', len(k3) == 1 and 86300 <= d[k3[0]]['until'] - time.time() <= 86405, d)
    r = s.post('reset_all', {'confirm': 'ERASE', 'password': PW})
    check('D10 Settings actions that ask for the password also respect the pause', r.get('_status') == 429, r)
    d = rate_read(s)
    for v in d.values(): v['until'] = int(time.time()) - 1; v['first'] = int(time.time()) - 1000
    rate_write(s, d)
    r = w.post('login', {'password': PW}, csrf=False)
    check('D11 after the pause the right password works', r.get('ok'), r)
    me = hashlib.sha256(b'hub|127.0.0.1').hexdigest()[:24]
    check('D12 and a right password clears the count for that address (the next pause starts at 15 minutes again)', me not in rate_read(s), rate_read(s))
    s.stop()

    # ===== E. The security token on every changing action =====
    s = Site(ZIP, 8740)
    src = open(s.dir + '/web/hub/core/api.php').read()
    blocks = re.split(r'\n(?=case \')', src)
    acts = []
    for bl in blocks:
        names = re.findall(r"^case '([a-z_]+)':", bl, re.M)
        if not names or 'need_admin();' not in bl: continue
        for n in names: acts.append((n, 'need_post()' in bl))
    nocsrf = []
    for n, post in acts:
        if post: r = s.req(s.api + '?action=' + n, data=b'{}', method='POST', hdr={'Content-Type': 'application/json'})
        else: r = s.req(s.api + '?action=' + n)
        if r.get('_status') != 403: nocsrf.append((n, r.get('_status')))
    check('E1 every changing action (%d found in api.php) refuses a request without the security token' % len(acts), len(acts) >= 30 and not nocsrf, nocsrf)
    bad = []
    for n, post in acts:
        r = s.req(s.api + '?action=' + n, data=b'{}', method='POST', hdr={'Content-Type': 'application/json', 'X-Hub-CSRF': 'f' * 64})
        if r.get('_status') != 403: bad.append((n, r.get('_status')))
    check('E2 ...and one with a wrong token', not bad, bad)
    anon = s.client('anonymous/1.0'); anon.get('state')
    out = [n for n, post in acts if (anon.req(s.api + '?action=' + n, data=b'{}', method='POST', hdr={'Content-Type': 'application/json'}) if post else anon.get(n)).get('_status') not in (401, 403)]
    check('E3 none of them works for a visitor who is not logged in', not out, out)
    check('E4 the site still works after all that (state, overview)', s.get('state').get('admin') is True and s.get('overview').get('ok') is not False)
    # E5 (1.53.1): Home's public "a background was shown" call takes only the page's own JSON request, which another website
    # cannot send from a visitor's browser without asking first (a plain form or text post is refused)
    home = s.site_base + '/web/home/api.php?action=seen'
    plain = anon.req(home, data=b'{"url":"photos/x.jpg"}', method='POST', hdr={'Content-Type': 'text/plain'})
    js = anon.req(home, data=b'{"url":"photos/x.jpg"}', method='POST', hdr={'Content-Type': 'application/json'})
    check('E5 Home\'s "seen" call refuses a text or form post and takes the page\'s JSON', plain.get('_status') == 415 and js.get('_status') in (None, 200) and 'removed' in js, (plain, js))
finally:
    stop_all()
sys.exit(check.done())
