#!/usr/bin/env python3
"""Hostile update zips: every one goes through the real upload (update_chunk) and check (update_check) and must be refused
with a clear message, and afterwards the version, the files (files_scan) and site-data must be unchanged, with nothing
written outside the site folder. Also abuses the chunk upload itself.
    python3 tests/server/update_attack_test.py build/site-update-X.Y.Z.zip
Needs PHP 8.3+ with zip and mbstring. Uses ports 8800-8810 and a few hundred MB in /tmp."""
import hashlib, io, json, os, random, re, struct, sys, tempfile, time, zipfile, zlib

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import ROOT, FIX, SEED
from helpers import PW, Site, Checks, stop_all, zip_version

if len(sys.argv) < 2: sys.exit(__doc__)
CUR = sys.argv[1]
check = Checks()
TMP = tempfile.mkdtemp(prefix='hub-attack-')
CURV = zip_version(CUR)
a, b, c = CURV.split('.'); NEXTV = '%s.%s.%d' % (a, b, int(c) + 1)
MARK = 'zzevil'   # every file an attack tries to plant has this in its name


def items_of(zp):
    z = zipfile.ZipFile(zp); return {i.filename: z.read(i.filename) for i in z.infolist()}


BASE = items_of(CUR)
SMALL = {k: v for k, v in BASE.items() if not k.startswith('web/tools/assets/')}   # a valid update without the big Tools files


def relisted(items, version=NEXTV):
    """A copy with the version set and the file list made to match every file (so only the planted problem remains)."""
    it = dict(items)
    it['web/core-data/lib/boot.php'] = re.sub(rb"define\('HUB', '[^']+'\)", b"define('HUB', '" + version.encode() + b"')", it['web/core-data/lib/boot.php'])
    man = json.loads(it['web/core-data/manifest.json'])
    man['version'] = version
    man['files'] = {k: hashlib.sha256(v).hexdigest() for k, v in it.items() if k != 'web/core-data/manifest.json' and not k.endswith('/')}
    it['web/core-data/manifest.json'] = json.dumps(man).encode()
    return it


def build(items, extra=(), method=zipfile.ZIP_DEFLATED):
    """Zip bytes. extra: (ZipInfo or name, data) entries added after the items, as they are."""
    bio = io.BytesIO()
    with zipfile.ZipFile(bio, 'w', method) as z:
        for n, d in items.items(): z.writestr(n, d)
        for n, d in extra:
            if isinstance(n, zipfile.ZipInfo): z.writestr(n, d)
            else:
                import warnings
                with warnings.catch_warnings():
                    warnings.simplefilter('ignore'); z.writestr(n, d)
    return bio.getvalue()


def rename(raw, old, new):
    """Swaps a name in the local header and the file list (same length), for names Python's zipfile will not write (a null byte)."""
    assert len(old) == len(new) and raw.count(old) == 2, raw.count(old)
    return raw.replace(old, new)


def with_manifest(items, files_extra=None, files_drop=()):
    it = relisted(items); man = json.loads(it['web/core-data/manifest.json'])
    for k in files_drop: man['files'].pop(k, None)
    for k, v in (files_extra or {}).items(): man['files'][k] = v
    it['web/core-data/manifest.json'] = json.dumps(man).encode(); return it


def tree_hash(root, skip=()):
    out = {}
    for dp, dn, fn in os.walk(root):
        rel = os.path.relpath(dp, root)
        if any(rel == s or rel.startswith(s + os.sep) for s in skip): dn[:] = []; continue
        for f in fn:
            p = os.path.join(dp, f)
            try: out[os.path.relpath(p, root)] = hashlib.sha256(open(p, 'rb').read()).hexdigest()
            except OSError: pass
    return out


VOLATILE = ('core/activity', 'core/devices', 'core/sessions', 'core/ratelimit', 'core/settings', 'core/health', 'core/sess')


def sd_hash(s):
    h = tree_hash(s.dir + '/site-data', skip=('updates',))
    return {k: v for k, v in h.items() if not k.startswith(VOLATILE) and not k.startswith('sess')}


def planted():
    """Files with the marker anywhere under /tmp (outside the site's own staging folder, which is inside site-data)."""
    found = []
    for dp, dn, fn in os.walk('/tmp'):
        if '/site-data/updates' in dp: dn[:] = []; continue
        for f in fn + dn:
            if MARK in f: found.append(os.path.join(dp, f))
    return found


def is_clean_reply(r):
    """A JSON answer with ok false and a sentence; never a PHP error, a blank page or a 500."""
    err = str(r.get('error', ''))
    return (not r.get('_notjson')) and r.get('_status', 200) < 500 and r.get('ok') is False and len(err) > 10 and 'Fatal' not in err and 'Warning' not in err and '<br' not in err


class Victim:
    def __init__(self, port):
        self.s = Site(CUR, port)
        self.ver = self.s.version(); self.sd = sd_hash(self.s)
        self.code = tree_hash(self.s.dir, skip=('site-data',))

    def unchanged(self):
        s = self.s
        return (s.version() == self.ver and s.clean()[:3] == (0, 0, 0) and sd_hash(s) == self.sd
                and tree_hash(s.dir, skip=('site-data',)) == self.code and not planted()
                and s.get('update_status').get('staged') in (None, False))

    def attack(self, label, raw, expect=None):
        r = self.s.chunks(None, 'site-update-%s.zip' % NEXTV, raw=raw)
        ok = is_clean_reply(r) and (expect is None or re.search(expect, r.get('error', ''), re.I)) and self.unchanged()
        if not ok and r.get('ok'): self.s.post('update_cancel')
        check(label, ok, json.dumps(r)[:400])
        return r


try:
    v = Victim(8800)
    big = build(relisted(BASE)); small = build(relisted(SMALL))
    r = v.s.chunks(None, 'x.zip', raw=small)
    check('Z0 control: the small update (no Tools files) passes every check', r.get('ok') and all(c['ok'] for c in r['checks']), json.dumps(r)[:300])
    v.s.post('update_cancel')
    check('Z1 control: after Cancel nothing is staged and nothing changed', v.unchanged())

    # ----- paths -----
    for n, label in [('../%s.php' % MARK, '../ path'), ('web/../../%s.php' % MARK, 'web/../../ path'), ('..\\%s.php' % MARK, '..\\ path'),
                     ('web\\..\\..\\%s.php' % MARK, 'backslash path'), ('/tmp/%s.php' % MARK, 'absolute path'),
                     ('C:/%s.php' % MARK, 'drive letter C:/'), ('C:\\%s.php' % MARK, 'drive letter C:\\'), ('web/./%s.js' % MARK, './ segment')]:
        zi = zipfile.ZipInfo(n); zi.filename = n   # the name exactly as given
        raw = build(with_manifest(SMALL, {n: hashlib.sha256(b'<?php echo 1;').hexdigest()}), [(zi, b'<?php echo 1;')])
        v.attack('P1 refused: %s (%s)' % (label, n), raw, 'cannot be used')
    ph = 'web/core-data/nb-%s-.js' % MARK
    raw = build(with_manifest(SMALL, {ph: hashlib.sha256(b'x').hexdigest()}), [(ph, b'x')])
    v.attack('P2 refused: a name with a null byte', rename(raw, ph.encode(), ph.encode()[:-4] + b'\x00.js'), 'cannot be used')
    long = 'web/' + 'a' * 240 + MARK + '.js'
    v.attack('P3 refused: a name longer than 200 characters', build(with_manifest(SMALL, {long: hashlib.sha256(b'x').hexdigest()}), [(long, b'x')]), 'cannot be used')
    deep = 'web/' + 'd/' * 120 + MARK + '.js'
    v.attack('P4 refused: 120 folders deep', build(with_manifest(SMALL, {deep: hashlib.sha256(b'x').hexdigest()}), [(deep, b'x')]), 'cannot be used')
    v.attack('P5 refused: the same entry twice', build(relisted(SMALL), [('web/core-data/api.php', b'<?php echo "second";')]), 'listed twice')
    v.attack('P6 refused: two names that differ only in case', build(with_manifest(SMALL, {'web/core-data/API.php': hashlib.sha256(b'<?php').hexdigest()}), [('web/core-data/API.php', b'<?php')]), 'listed twice')
    for n in ('web/caf\u00e9-%s.js' % MARK, 'web/cafe\u0301-%s.js' % MARK):
        v.attack('P7 refused: a non-ASCII (Unicode) name %r' % n, build(with_manifest(SMALL, {n: hashlib.sha256(b'x').hexdigest()}), [(n, b'x')]), 'cannot be used')
    zi = zipfile.ZipInfo('web/core-data/%s-link.js' % MARK); zi.create_system = 3; zi.external_attr = (0o120777 << 16)
    v.attack('P8 refused: a symlink entry', build(with_manifest(SMALL, {zi.filename: hashlib.sha256(b'/etc/passwd').hexdigest()}), [(zi, b'/etc/passwd')]), 'link')
    for n, why in [('%s.php' % MARK, 'outside web/'), ('tools/%s.js' % MARK, 'outside web/'), ('site-data/core/auth.php', 'site-data'),
                   ('web/core-data/config.php', 'your own configuration file'), ('web/core-data/media/brand/logo-%s.png' % MARK, 'pictures folder'),
                   ('web/core-data/media/home/uploads/%s.php' % MARK, 'pictures folder'), ('web/links/assets/%s.php' % MARK, 'PHP file'),
                   ('web/%s.phtml' % MARK, 'file type'), ('web/.user.ini', 'file type')]:
        v.attack('P9 refused: %s (%s)' % (n, why), build(with_manifest(SMALL, {n: hashlib.sha256(b'<?php phpinfo();').hexdigest()}), [(n, b'<?php phpinfo();')]), 'cannot be used')

    # ----- the file list -----
    it = relisted(SMALL); it['web/core-data/api.php'] = it['web/core-data/api.php'] + b'\n// changed after listing'
    v.attack('L1 refused: a file whose SHA-256 differs from the file list', build(it), 'fingerprints')
    v.attack('L2 refused: a file that is not on the list', build(with_manifest(SMALL, files_drop=['web/links/index.html'])), 'not on the list')
    v.attack('L3 refused: a file on the list but not in the zip', build(with_manifest(SMALL, {'web/links/gone.js': '0' * 64})), 'missing')
    v.attack('L4 refused: the list names a path outside the allowed ones', build(with_manifest(SMALL, {'../../%s.php' % MARK: '0' * 64})), 'missing|cannot')
    it = relisted(SMALL); del it['web/core-data/manifest.json']
    v.attack('L5 refused: no manifest.json', build(it), 'no file list')
    for label, body in [('not JSON', b'{"version": "9.9.9", "files": {'), ('no version', b'{"files": {}}'), ('a bad hash', json.dumps({'version': NEXTV, 'files': {'index.php': 'nothex'}}).encode()), ('a list instead of files', json.dumps({'version': NEXTV, 'files': []}).encode())]:
        it = relisted(SMALL); it['web/core-data/manifest.json'] = body
        v.attack('L6 refused: a broken manifest.json (%s)' % label, build(it), 'file list|not on the list')

    # ----- contents and versions -----
    it = dict(SMALL); it['web/links/api.php'] = it['web/links/api.php'][:len(it['web/links/api.php']) // 2]
    v.attack('C1 refused: a PHP file with a syntax error (cut in half)', build(relisted(it)), 'PHP')
    it = dict(SMALL); del it['web/core-data/lib/update.php']
    v.attack('C2 refused: the updater itself is missing', build(relisted(it)), 'update itself|cannot be used')
    it = relisted(SMALL); it['web/core-data/lib/boot.php'] = re.sub(rb"define\('HUB', '[^']+'\)", b"define('HUB', '9.9.9')", it['web/core-data/lib/boot.php'])
    man = json.loads(it['web/core-data/manifest.json']); man['files']['web/core-data/lib/boot.php'] = hashlib.sha256(it['web/core-data/lib/boot.php']).hexdigest(); it['web/core-data/manifest.json'] = json.dumps(man).encode()
    v.attack('C3 refused: boot.php says another version than the file list', build(it), 'version|cannot')
    v.attack('C4 refused: an older version', build(relisted(SMALL, '1.0.0')), 'cannot be used')
    it = relisted(SMALL); man = json.loads(it['web/core-data/manifest.json']); man['minPhp'] = '99.0'; it['web/core-data/manifest.json'] = json.dumps(man).encode()
    v.attack('C5 refused: needs a newer PHP (minPhp 99.0)', build(it), 'PHP 99.0')
    r = v.s.chunks(None, 'same.zip', raw=build(relisted(SMALL, CURV)))
    check('C6 the same version is offered only as a repair of the installed files, marked "same"', r.get('ok') and r.get('relation') == 'same', json.dumps(r)[:300])
    v.s.post('update_cancel'); check('C7 ...and cancelling it changes nothing', v.unchanged())

    # ----- sizes and zip bombs -----
    raw = bytearray(build(relisted(SMALL)))
    cdpos = raw.rfind(b'PK\x05\x06'); cdoff = struct.unpack('<I', raw[cdpos + 16:cdpos + 20])[0]
    i = raw.find(b'web/core-data/api.php', cdoff) - 46; assert raw[i:i + 4] == b'PK\x01\x02'
    raw[i + 24:i + 28] = struct.pack('<I', 0x7FFFFFFF)   # api.php claims to unpack to 2 GB
    v.attack('S1 refused: an entry that claims to unpack to 2 GB', bytes(raw), 'larger than|cannot')
    bomb_name = 'web/core-data/assets/%s-bomb.js' % MARK; bomb = b'\0' * (60 * 1048576)
    it = with_manifest(SMALL, {bomb_name: hashlib.sha256(bomb).hexdigest()})
    raw = bytearray(build(it, [(bomb_name, bomb)]))
    cdpos = raw.rfind(b'PK\x05\x06'); cdoff = struct.unpack('<I', raw[cdpos + 16:cdpos + 20])[0]
    j = raw.find(b'PK\x01\x02' , raw.find(bomb_name.encode(), cdoff) - 46)
    raw[j + 24:j + 28] = struct.pack('<I', 1000)   # a 60 MB file of zeros (about 60 KB packed) that says it is 1 KB
    v.attack('S2 refused: a zip bomb (60 MB of zeros declared as 1 KB, ratio about 1000:1)', bytes(raw), 'more than the zip says|size|cannot')
    many = {('web/core-data/assets/%s-%d.js' % (MARK, k)): b'\0' * (79 * 1048576) for k in range(6)}
    v.attack('S3 refused: 6 files of 79 MB each (474 MB unpacked, over the 400 MB limit)', build(with_manifest(SMALL, {k: hashlib.sha256(d).hexdigest() for k, d in many.items()}), list(many.items())), 'too large|unpack')
    del many
    huge = os.urandom(1048576) * 130
    r = v.s.chunks(None, 'huge.zip', raw=huge)
    check('S4 refused: an upload over 128 MB (stopped during the upload)', is_clean_reply(r) and 'too large' in r.get('error', '') and v.unchanged(), json.dumps(r)[:300])
    del huge
    for label, raw in [('random bytes', os.urandom(300000)), ('a text file', b'hello, this is not a zip\n' * 100), ('an empty-looking file', b'PK'), ('a PNG', open(os.path.join(FIX, 'fixture-image.png'), 'rb').read())]:
        v.attack('S5 refused: not a zip at all (%s)' % label, raw)

    # ----- damage: cuts and byte flips (fixed seed, so a failure repeats) -----
    rnd = random.Random(20261024)
    cuts = sorted(rnd.sample(range(1, len(small) - 1), 50))
    bad = []
    for k in cuts:
        r = v.s.chunks(None, 'cut.zip', raw=small[:k])
        if not is_clean_reply(r):
            bad.append((k, json.dumps(r)[:120])); v.s.post('update_cancel')
    check('D1 the small update cut at 50 places: every one refused with a clear message', not bad, bad[:3])
    check('D2 ...and nothing changed', v.unchanged())
    accepted = []; bad = []
    for n in range(200):
        raw = bytearray(small); pos = rnd.randrange(len(raw)); raw[pos] ^= 1 << rnd.randrange(8)
        r = v.s.chunks(None, 'flip.zip', raw=bytes(raw))
        if r.get('ok'):
            accepted.append(pos)   # the check passed: every file matched its fingerprint, so no file content changed
            if not all(c['ok'] for c in r.get('checks', [])): bad.append((pos, 'accepted with a failed check'))
            v.s.post('update_cancel')
        elif not is_clean_reply(r): bad.append((pos, json.dumps(r)[:120]))
    check('D3 200 random bit flips: each refused with a clear message, or (a flip in a date or attribute no file depends on) passed with every fingerprint right; %d passed, %d refused' % (len(accepted), 200 - len(accepted)), not bad, bad[:3])
    check('D4 ...and nothing changed', v.unchanged())

    # ----- the chunk upload itself -----
    def chunk(id, i, n, data=b'x' * 100, csrf=True):
        h = {'Content-Type': 'application/octet-stream'}
        if csrf: h['X-Hub-CSRF'] = v.s.csrf
        return v.s.req(v.s.api + '?action=update_chunk&id=%s&i=%s&n=%s' % (id, i, n), data=data, method='POST', hdr=h)
    good = 'a' * 16
    cases = [('a bad id', ('../../etc', 0, 1)), ('a short id', ('abc', 0, 1)), ('n = 0', (good, 0, 0)), ('n = 300', (good, 0, 300)), ('n not a number', (good, 0, 'x')),
             ('i = -1', (good, -1, 2)), ('i = n', (good, 2, 2)), ('i not a number', (good, 'zz', 2))]
    bad = [lbl for lbl, args in cases if not is_clean_reply(chunk(*args))]
    check('U1 a bad id, n or i is refused with a clear message', not bad, bad)
    check('U2 an empty piece is refused', is_clean_reply(chunk(good, 0, 2, b'')))
    check('U3 a piece over 4 MB is refused', is_clean_reply(chunk(good, 0, 2, b'x' * (4 * 1048576 + 1))))
    i2 = 'b' * 16
    check('U4 pieces out of order are refused (piece 1 first)', is_clean_reply(chunk(i2, 1, 3)))
    r0 = chunk(i2, 0, 3); r1 = chunk(i2, 1, 3); r1b = chunk(i2, 1, 3)
    check('U5 a piece sent twice is refused', r0.get('ok') and r1.get('ok') and is_clean_reply(r1b), (r0, r1, r1b))
    check('U6 a piece of another upload is refused', is_clean_reply(chunk('c' * 16, 2, 3)))
    check('U7 a piece without the security token is refused', chunk(good, 0, 1, csrf=False).get('_status') == 403)
    v.s.post('update_cancel')
    r = v.s.chunks(None, 'good.zip', raw=small)
    staged = (r.get('staged') or {}).get('sha256')
    r2 = v.s.chunks(None, 'bad.zip', raw=b'not a zip at all' * 100)
    st = v.s.get('update_status')
    still = (st.get('staged') or {}).get('sha256')
    check('U8 a second upload while one is staged: the bad one is refused', r.get('ok') and is_clean_reply(r2), (r.get('ok'), r2))
    ap = v.s.post('update_apply', {'password': PW}); time.sleep(0.5)
    check('U9 ...and Apply afterwards cannot install anything unchecked: it installs the checked update, or refuses clearly', (ap.get('ok') and still == staged and v.s.version() == NEXTV and v.s.clean()[:3] == (0, 0, 0)) or (is_clean_reply(ap) and v.s.version() == CURV and v.s.clean()[:3] == (0, 0, 0)), (still == staged, json.dumps(ap)[:300], v.s.version()))
    check('U10 nothing was planted anywhere outside the site', not planted(), planted()[:3])
finally:
    stop_all()
sys.exit(check.done())
