#!/usr/bin/env python3
"""Files through the real API (no browser): who may call what, hostile uploads, hostile ids, the headers of everything that is sent,
the limit, Trash, and the share links anyone may open.   python3 tests/server/files_test.py build/site-update-X.Y.Z.zip
Needs PHP 8.3+. Runs a site on port 8770."""
import base64, json, os, re, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import PW
from helpers import Site, Checks, stop_all

if len(sys.argv) < 2: sys.exit(__doc__)
ZIP = sys.argv[1]; check = Checks()


def locked(seed='x'):
    """Text shaped like what the browser makes ("enc1:" + base64). The server can not tell what is inside."""
    return 'enc1:' + base64.b64encode((seed.ljust(40, '.') + os.urandom(8).hex()).encode()).decode()


def piece(n):
    """A piece of n bytes (iv 12 + data + tag 16 in real life; here only the size counts)."""
    return os.urandom(n)


try:
    s = Site(ZIP, 8770)
    visitor = s.client('visitor/1.0')
    base = s.site_base + '/web/files/api.php'
    def call(c, action, body=None, qs='', csrf=True):
        h = {'Content-Type': 'application/json'}
        if csrf: h['X-Hub-CSRF'] = c.csrf
        return c.req(base + '?action=' + action + qs, data=json.dumps(body or {}).encode(), method='POST', hdr=h)
    def put(c, p='', size=600, pieces=2, name='file'):
        r = call(c, 'put_start', {'p': p, 'm': locked(name), 'k': locked('key'), 'c': pieces, 'z': size})
        if not r.get('ok'): return r
        per = size // pieces
        for n in range(pieces):
            st, hd, b = c.raw(base + '?action=put_chunk&id=%s&n=%d' % (r['id'], n), data=piece(per if n < pieces - 1 else size - per * (pieces - 1)), method='POST', hdr={'Content-Type': 'application/octet-stream', 'X-Hub-CSRF': c.csrf})
            if st != 200: return {'ok': False, '_status': st, 'error': b[:200]}
        d = call(c, 'put_done', {'id': r['id']})
        return d if not d.get('ok') else r

    # ---- who may call what ----
    v = visitor.req(base + '?action=list')
    check('F1 a visitor gets only "this page is private" for the list', v.get('private') is True and v.get('auth') is False and 'items' not in v, v)
    st, hd, b = visitor.raw(base + '?action=chunk&id=' + '0123456789abcdef' + '&n=0')
    check('F2 ...and nothing of any file, even by guessing an id', st == 200 and json.loads(b).get('private') is True)
    check('F3 a visitor can not change anything (logged out, 401)', call(visitor, 'mkdir', {'p': '', 'm': locked()}, csrf=False).get('_status') == 401)
    check('F4 a logged-in browser without the security token can not either (403)', call(s, 'mkdir', {'p': '', 'm': locked()}, csrf=False).get('_status') == 403)
    check('F5 the list is empty for the owner: no files, the default limit of 5 GB, links on', (lambda j: j.get('ok') and j['items'] == [] and j['settings']['limit'] == 5 * 1024 ** 3 and j['settings']['shares'] is True and j['max'] == 5 * 1024 ** 3)(s.req(base + '?action=list')))

    # ---- folders and files ----
    r = call(s, 'mkdir', {'p': '', 'm': locked('docs')}); check('F6 a folder is made', r.get('ok'), r)
    items = s.req(base + '?action=list')['items']; docs = items[0]['id']
    f = put(s, docs, 700, 2); check('F7 a file is uploaded in two pieces and finished', f.get('ok') and re.fullmatch(r'[a-f0-9]{16}', f.get('id', '')), f)
    fid = f['id']
    lst = s.req(base + '?action=list')
    check('F8 the list shows it with its parent, locked name and size, and nothing readable', any(i['id'] == fid and i['p'] == docs and i['m'].startswith('enc1:') and i['z'] == 700 for i in lst['items']) and lst['usage'] == 700)
    blobs = sorted(os.listdir(s.dir + '/site-data/files/blobs'))
    check('F9 the pieces are stored under the id and the number, with no extension', blobs == [fid + '_0', fid + '_1'], blobs)
    stored = open(s.dir + '/site-data/files/files.php').read()
    check('F10 the list file is guarded (a browser opening it gets nothing) and holds no plain name', stored.startswith('<?php') and 'docs' not in stored and 'renamed' not in stored)

    # ---- what a download looks like ----
    st, hd, b = s.raw(base + '?action=chunk&id=%s&n=0' % fid)
    H = {k.lower(): v for k, v in hd.items()}
    check('F11 a piece is sent as a plain download: octet-stream, attachment, nosniff, no cache, a sandboxing policy', st == 200 and H.get('content-type', '').startswith('application/octet-stream') and 'attachment' in H.get('content-disposition', '')
          and H.get('x-content-type-options') == 'nosniff' and 'no-store' in H.get('cache-control', '') and 'sandbox' in H.get('content-security-policy', ''), H)
    check('F12 ...and it is the bytes that were uploaded, whole', len(b) == 350 and int(H.get('content-length', 0)) == 350)
    for q, name in (('&id=../../../etc/passwd&n=0', 'a path as the id'), ('&id=' + fid + '&n=-1', 'a negative piece'), ('&id=' + fid + '&n=2', 'a piece that is not there'), ('&id=' + fid + '&n=abc', 'a piece number that is not a number'),
                    ('&id=' + fid.upper() + '&n=0', 'an id in capitals'), ('&id=' + 'a' * 17 + '&n=0', 'an id that is too long')):
        st, hd, b = s.raw(base + '?action=chunk' + q)
        check('F13 refused: ' + name, st in (400, 404) and b'root:' not in b, (st, b[:80]))

    # ---- hostile uploads: whatever it is, it is only ever bytes ----
    php = b"<?php system($_GET['c']); ?>" + b'A' * 40
    r = call(s, 'put_start', {'p': docs, 'm': locked('evil.php'), 'k': locked('key'), 'c': 1, 'z': len(php)}); eid = r['id']
    st, hd, b = s.raw(base + '?action=put_chunk&id=%s&n=0' % eid, data=php, method='POST', hdr={'Content-Type': 'application/octet-stream', 'X-Hub-CSRF': s.csrf})
    check('F14 a piece that is PHP code is stored like any other bytes', st == 200)
    call(s, 'put_done', {'id': eid})
    st, hd, b = s.raw(s.host + '/site-data/files/blobs/%s_0?c=id' % eid)
    check('F15 asked for directly, it is never run (no extension, so the server treats it as plain data)', b'uid=' not in b and (st != 200 or b == php or b == b''), (st, b[:60]))
    st, hd, b = s.raw(base + '?action=chunk&id=%s&n=0&c=id' % eid)
    check('F16 through the API it comes as a download and does not run', b'uid=' not in b and b == php)
    for q, body, name in (
        ('put_chunk&id=%s&n=0' % eid, b'x' * 10, 'a piece to a finished file (not open)'),
        ('put_chunk&id=../x&n=0', b'x' * 40, 'a piece with a path as the id'),
    ):
        st, hd, b = s.raw(base + '?action=' + q, data=body, method='POST', hdr={'Content-Type': 'application/octet-stream', 'X-Hub-CSRF': s.csrf})
        check('F17 refused: ' + name, st in (400, 404), (st, b[:80]))
    r = call(s, 'put_start', {'p': '', 'm': locked(), 'k': locked(), 'c': 2, 'z': 5000}); oid = r['id']
    st, hd, b = s.raw(base + '?action=put_chunk&id=%s&n=0' % oid, data=b'x' * 10, method='POST', hdr={'Content-Type': 'application/octet-stream', 'X-Hub-CSRF': s.csrf})
    check('F18 a piece too small to be a locked piece is refused', st == 400)
    st, hd, b = s.raw(base + '?action=put_chunk&id=%s&n=0' % oid, data=os.urandom(4 * 1024 * 1024 + 200), method='POST', hdr={'Content-Type': 'application/octet-stream', 'X-Hub-CSRF': s.csrf})
    check('F19 a piece over the largest allowed is refused (413)', st == 413)
    st, hd, b = s.raw(base + '?action=put_chunk&id=%s&n=5' % oid, data=os.urandom(100), method='POST', hdr={'Content-Type': 'application/octet-stream', 'X-Hub-CSRF': s.csrf})
    check('F20 a piece number the file does not have is refused', st == 400)
    check('F21 finishing a file whose pieces are missing is refused', call(s, 'put_done', {'id': oid}).get('_status') == 409)
    check('F22 an upload can be cancelled, and its pieces go', call(s, 'put_abort', {'id': oid}).get('ok') and not [x for x in os.listdir(s.dir + '/site-data/files/blobs') if x.startswith(oid)])
    for body, name in (({'p': '', 'm': 'plain name'}, 'a plain name'), ({'p': '../..', 'm': locked()}, 'a path as the folder'), ({'p': 'A' * 16, 'm': locked()}, 'an id in capitals'),
                       ({'p': '', 'm': 'enc1:<img src=x onerror=alert(1)>AAAAAAAAAAAAAAAAAAAAAAAA'}, 'markup in the locked text')):
        r = call(s, 'mkdir', body); check('F23 refused: ' + name, r.get('_status') == 400, r)
    for body, name in (({'p': '', 'm': locked(), 'k': 'plain', 'c': 1, 'z': 100}, 'a plain key'), ({'p': '', 'm': locked(), 'k': locked(), 'c': 0, 'z': 100}, 'no pieces'), ({'p': '', 'm': locked(), 'k': locked(), 'c': 1, 'z': 0}, 'no bytes'),
                       ({'p': '', 'm': locked(), 'k': locked(), 'c': 1, 'z': 17 * 1024 ** 3}, 'a file over the largest possible'), ({'p': '', 'm': locked(), 'k': locked(), 'c': 100000, 'z': 100}, 'a million pieces')):
        r = call(s, 'put_start', body); check('F24 refused: ' + name, r.get('_status') in (400, 413), r)
    check('F25 a body that is not JSON is refused', s.req(base + '?action=mkdir', data=b'not json', method='POST', hdr={'X-Hub-CSRF': s.csrf}).get('_status') == 400)

    # ---- the limit ----
    check('F26 the limit is changed in Files Settings (here 1 KB), and read back', call(s, 'settings', {'settings': {'limit': 1024}}).get('settings', {}).get('limit') == 1024)
    r = call(s, 'put_start', {'p': '', 'm': locked(), 'k': locked(), 'c': 1, 'z': 900})
    check('F27 a file that would go over it is refused with a plain message (507)', r.get('_status') == 507 and 'full' in r.get('error', '') and 'Files Settings' in r.get('error', ''), r)
    check('F28 limit 0 means only the server\'s free space limits', call(s, 'settings', {'settings': {'limit': 0}}).get('ok') and call(s, 'put_start', {'p': '', 'm': locked(), 'k': locked(), 'c': 1, 'z': 900}).get('ok'))
    for x in s.req(base + '?action=list')['items']:
        if x.get('up'): call(s, 'put_abort', {'id': x['id']})
    call(s, 'settings', {'settings': {'limit': 5 * 1024 ** 3}})

    # ---- rename, move, Trash ----
    r = call(s, 'rename', {'id': fid, 'm': locked('renamed')}); check('F29 rename', r.get('ok'))
    r = call(s, 'move', {'ids': [docs], 'p': docs}); check('F30 a folder can not be moved into itself', r.get('_status') == 400, r)
    r = call(s, 'trash', {'ids': [docs]}); check('F31 trash a folder', r.get('ok'))
    tl = {i['id']: i for i in s.req(base + '?action=list')['items']}
    check('F32 the folder is the one in Trash; what is in it follows it out of sight', tl[docs].get('top') == 1 and tl[docs]['del'] > 0 and tl[fid]['del'] > 0 and not tl[fid].get('top'))
    check('F33 a file in a folder in Trash can not be changed', call(s, 'rename', {'id': fid, 'm': locked()}).get('_status') == 404)
    check('F34 restore brings it all back', call(s, 'restore', {'ids': [docs]}).get('ok') and {i['id']: i for i in s.req(base + '?action=list')['items']}[fid]['del'] == 0)

    # ---- share links ----
    r = call(s, 'share_create', {'id': fid, 'sm': locked('meta'), 'exp': 0}); tok = r.get('token', '')
    check('F35 a link is made: 32 letters and digits', re.fullmatch(r'[A-Za-z0-9_-]{32}', tok), r)
    m = visitor.req(base + '?action=s_meta&t=' + tok)
    check('F36 anyone with the link gets the locked meta, the number of pieces and the size, and nothing else', m.get('ok') and m['c'] == 2 and m['z'] == 700 and m['sm'].startswith('enc1:') and set(m) == {'ok', 'sm', 'c', 'z', 'exp'}, m)
    st, hd, b = visitor.raw(base + '?action=s_chunk&t=%s&n=1' % tok)
    H = {k.lower(): v for k, v in hd.items()}
    check('F37 ...and the pieces, as plain downloads', st == 200 and len(b) == 350 and H.get('content-type', '').startswith('application/octet-stream') and H.get('x-content-type-options') == 'nosniff')
    for t2, name in (('a' * 32, 'a link that never existed'), ('short', 'a link that is too short'), ('../../etc/passwd' + 'x' * 16, 'a path as the link'), (tok[:-1] + ('A' if tok[-1] != 'A' else 'B'), 'a link one letter off')):
        st, hd, b = visitor.raw(base + '?action=s_meta&t=' + t2)
        check('F38 nothing for ' + name + ' (404, the same words as an ended link)', st == 404 and 'ended or was removed' in b.decode(), (st, b[:80]))
    st, hd, b = visitor.raw(base + '?action=s_chunk&t=%s&n=9' % tok)
    check('F39 a piece the file does not have: 404', st == 404)
    check('F40 a link can not be made with a past end date, or one more than ten years away', call(s, 'share_create', {'id': fid, 'sm': locked(), 'exp': int(time.time()) - 10}).get('_status') == 400 and call(s, 'share_create', {'id': fid, 'sm': locked(), 'exp': int(time.time()) + 4000 * 86400}).get('_status') == 400)
    r = call(s, 'share_create', {'id': fid, 'sm': locked(), 'exp': int(time.time()) + 3600}); short = r['token']
    fp = s.dir + '/site-data/files/files.php'; raw = open(fp).read(); head, body = raw.split('\n', 1); data = json.loads(body); data['shares'][short]['exp'] = int(time.time()) + 2   # the end date is at least a minute away when it is made: shorten it in the file
    open(fp, 'w').write(head + '\n' + json.dumps(data))
    time.sleep(3.2)
    st, hd, b = visitor.raw(base + '?action=s_meta&t=' + short)
    check('F41 a link that has ended gets nothing', st == 404)
    lst = s.req(base + '?action=list')
    check('F42 the owner sees which links exist (token, file, end), and the next list clears the ended one', any(x['token'] == tok for x in lst['shares']) and not any(x['token'] == short for x in lst['shares']), lst['shares'])
    check('F43 a link to a file that goes to Trash stops working at once', call(s, 'trash', {'ids': [fid]}).get('ok') and visitor.raw(base + '?action=s_meta&t=' + tok)[0] == 404)
    call(s, 'restore', {'ids': [fid]})
    r = call(s, 'share_create', {'id': fid, 'sm': locked(), 'exp': 0}); tok = r['token']
    check('F44 a link can be removed by its owner, and then it is gone', call(s, 'share_delete', {'token': tok}).get('ok') and visitor.raw(base + '?action=s_meta&t=' + tok)[0] == 404)
    check('F45 a visitor can not make or remove links', call(visitor, 'share_create', {'id': fid, 'sm': locked(), 'exp': 0}, csrf=False).get('_status') == 401 and call(visitor, 'share_delete', {'token': tok}, csrf=False).get('_status') == 401)
    r = call(s, 'share_create', {'id': fid, 'sm': locked(), 'exp': 0}); tok = r['token']
    check('F46 turning Share Links off ends every link and refuses new ones', call(s, 'settings', {'settings': {'shares': False}}).get('ok') and visitor.raw(base + '?action=s_meta&t=' + tok)[0] == 404 and call(s, 'share_create', {'id': fid, 'sm': locked(), 'exp': 0}).get('_status') == 403)
    call(s, 'settings', {'settings': {'shares': True}})
    check('F47 ...and the old link does not come back when they are turned on again', visitor.raw(base + '?action=s_meta&t=' + tok)[0] == 404)

    # ---- Trash for good ----
    call(s, 'trash', {'ids': [docs]})
    check('F48 only what is in Trash itself can be deleted for good (a file inside a trashed folder is not picked on its own)', call(s, 'purge', {'ids': [fid]}).get('_status') == 404)
    r = call(s, 'purge', {'ids': [docs]})
    check('F49 deleting a folder for good removes what is in it, with its pieces', r.get('ok') and not [x for x in os.listdir(s.dir + '/site-data/files/blobs') if x.startswith(fid) or x.startswith(eid)], os.listdir(s.dir + '/site-data/files/blobs'))
    # the passphrase can not be removed from under files
    r = call(s, 'mkdir', {'p': '', 'm': locked()})
    s.post('pp_set', {'password': PW, 'passphrase': 'river lantern copper meadow'})
    r2 = s.post('pp_clear', {'password': PW})
    check('F50 the passphrase can not be removed while files exist (409), and says why', r2.get('_status') == 409 and 'Files' in json.dumps(r2.get('inUse', [])), r2)
    for x in s.req(base + '?action=list')['items']: call(s, 'trash', {'ids': [x['id']]}) if x['del'] == 0 else None
    call(s, 'empty_trash')
    r2 = s.post('pp_clear', {'password': PW})
    check('F51 ...and it can once Files is empty', r2.get('ok'), r2)
    check('F52 every answer of the API carries the usual protective headers', (lambda H: H.get('x-content-type-options') == 'nosniff' and 'no-store' in H.get('cache-control', ''))({k.lower(): v for k, v in s.raw(base + '?action=list')[1].items()}))
finally:
    stop_all()
sys.exit(check.done())
