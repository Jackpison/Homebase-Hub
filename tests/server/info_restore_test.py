#!/usr/bin/env python3
"""Info Undo (1.62.0) through the real API, no browser: a deleted box or tab comes back with its text through save_boxes and save_tabs
("restore"), in its place, with its old id; locked text only goes into an encrypted tab; a stale page, a full tab and hostile input are
refused without changing anything.   python3 tests/server/info_restore_test.py build/site-update-X.Y.Z.zip
Needs PHP 8.3+. Runs a site on port 8780."""
import base64, json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import Site, Checks, stop_all

if len(sys.argv) < 2: sys.exit(__doc__)
ZIP = sys.argv[1]; check = Checks()


def locked(seed='x'):
    """Text shaped like what the browser makes ("enc1:" + base64). The server can not tell what is inside."""
    return 'enc1:' + base64.b64encode((seed.ljust(40, '.') + os.urandom(8).hex()).encode()).decode()


try:
    s = Site(ZIP, 8780)
    api = s.site_base + '/web/info/api.php'
    def call(action, body, c=None):
        c = c or s
        return c.req(api, data=json.dumps(dict(body, action=action)).encode(), method='POST', hdr={'Content-Type': 'application/json', 'X-Hub-CSRF': c.csrf})
    def page(): return s.req(api + '?ih=1')
    def tab(i=0): return page()['tabs'][i]
    def ids(t): return [b['id'] for b in t['boxes']]

    d = page(); t0 = d['tabs'][0]; tid = t0['id']
    # three boxes with text, so a middle one can be deleted
    r = call('save_boxes', {'tab': tid, 'boxes': [{'id': b['id'], 'w': '', 'h': ''} for b in t0['boxes']] + [{'id': None, 'w': '', 'h': ''}], 'rev': d['rev']})
    t = r['data']['tabs'][0]
    for k, b in enumerate(t['boxes']):
        rr = call('save', {'tab': tid, 'box': b['id'], 'title': 'Box %d' % k, 'notes': 'text %d' % k, 'rev': b['rev']}); assert rr.get('ok'), rr
    t = tab(); order = ids(t); mid = t['boxes'][1]
    check('I1 a tab with three boxes and text to start with', len(order) == 3 and [b['notes'] for b in t['boxes']] == ['text 0', 'text 1', 'text 2'])

    # delete the middle box, then restore it
    rev = page()['rev']
    r = call('save_boxes', {'tab': tid, 'boxes': [{'id': i, 'w': '', 'h': ''} for i in (order[0], order[2])], 'rev': rev})
    check('I2 deleting a box drops its text (the reason Undo needs the server)', r.get('ok') and len(ids(r['data']['tabs'][0])) == 2 and 'text 1' not in json.dumps(r['data']['tabs'][0]))
    rev = r['data']['rev']
    r = call('save_boxes', {'tab': tid, 'boxes': [{'id': order[0], 'w': '', 'h': ''}, {'id': mid['id'], 'w': 'half', 'h': 'tall', 'restore': {'title': mid['title'], 'notes': mid['notes']}}, {'id': order[2], 'w': '', 'h': ''}], 'rev': rev})
    t = r['data']['tabs'][0] if r.get('ok') else {'boxes': []}
    check('I3 Undo puts the box back in its place, with its old id, title and text', r.get('ok') and ids(t) == order and t['boxes'][1]['notes'] == 'text 1' and t['boxes'][1]['title'] == mid['title'], r)
    check('I4 ...and its size, and the revision moved on', t['boxes'][1]['w'] == 'half' and t['boxes'][1]['h'] == 'tall' and r['data']['rev'] == rev + 1)
    check('I5 it is saved (a fresh read has it)', ids(tab()) == order and tab()['boxes'][1]['notes'] == 'text 1')

    # refusals change nothing
    rev = page()['rev']; before = json.dumps(page())
    r = call('save_boxes', {'tab': tid, 'boxes': [{'id': i, 'w': '', 'h': ''} for i in order] + [{'id': None, 'w': '', 'h': '', 'restore': {'title': 'x', 'notes': locked()}}], 'rev': rev})
    check('I6 locked text into a readable tab is refused (422) and nothing changes', r.get('_status') == 422 and json.dumps(page()) == before, r)
    r = call('save_boxes', {'tab': tid, 'boxes': [{'id': i, 'w': '', 'h': ''} for i in order] + [{'id': None, 'w': '', 'h': '', 'restore': 'text'}], 'rev': rev})
    check('I7 a restore that is not an object is ignored as a plain new box: no text arrives', r.get('ok') is not True or 'text' not in json.dumps(r['data']['tabs'][0]['boxes'][-1]), r)
    r = call('save_boxes', {'tab': tid, 'boxes': [{'id': i, 'w': '', 'h': ''} for i in order], 'rev': rev - 5})
    check('I8 a stale page (older revision) is refused with a conflict, as before', r.get('_status') == 409)
    r = call('save_boxes', {'tab': tid, 'boxes': [{'id': i, 'w': '', 'h': ''} for i in order] + [{'id': None, 'w': '', 'h': '', 'restore': {'title': 'x', 'notes': 'y'}}] * 10, 'rev': rev})
    check('I9 more than 12 boxes is refused', r.get('_status') == 400 or r.get('_status') == 422, r)
    visitor = s.client('visitor/2.0')
    r = visitor.req(api, data=json.dumps({'action': 'save_boxes', 'tab': tid, 'boxes': [{'id': None, 'restore': {'title': 'x', 'notes': 'y'}}], 'rev': rev}).encode(), method='POST', hdr={'Content-Type': 'application/json'})
    check('I10 a visitor can not restore anything (403)', r.get('_status') == 403 and json.dumps(page()) == before, r)

    # a whole tab
    d = page(); rev = d['rev']
    r = call('save_tabs', {'tabs': [{'id': t['id'], 'name': t['name'], 'color': t['color']} for t in d['tabs']] + [{'id': None, 'name': 'Trip', 'color': '#ff0000'}], 'rev': rev})
    new = r['data']['tabs'][-1]; nid = new['id']
    for k, b in enumerate(new['boxes']):
        call('save', {'tab': nid, 'box': b['id'], 'title': 'T%d' % k, 'notes': 'trip text %d' % k, 'rev': b['rev']})
    new = tab(-1); gone = {'id': new['id'], 'name': new['name'], 'color': new['color'], 'hc': new['hc'], 'layout': new['layout'], 'private': new['private'], 'enc': new['enc'],
                           'boxes': [{'id': b['id'], 'w': b['w'], 'h': b['h'], 'title': b['title'], 'notes': b['notes']} for b in new['boxes']]}
    keep = [{'id': t['id'], 'name': t['name'], 'color': t['color']} for t in page()['tabs'][:-1]]
    rev = page()['rev']
    r = call('save_tabs', {'tabs': keep, 'rev': rev})
    check('I11 deleting a tab removes it with its text', r.get('ok') and len(r['data']['tabs']) == len(keep))
    rev = r['data']['rev']
    head = {k: gone[k] for k in ('id', 'name', 'color', 'hc', 'layout', 'private', 'enc')}
    r = call('save_tabs', {'tabs': keep + [dict(head, restore={'boxes': gone['boxes']})], 'rev': rev})
    back = r['data']['tabs'][-1] if r.get('ok') else {}
    check('I12 Undo brings the tab back at its place with its old id, name, colour and every box with its text', r.get('ok') and back.get('id') == gone['id'] and back['name'] == 'Trip' and back['color'] == '#ff0000'
          and [b['id'] for b in back['boxes']] == [b['id'] for b in gone['boxes']] and [b['notes'] for b in back['boxes']] == ['trip text 0', 'trip text 1'], r)
    check('I13 ...and it is saved', [b['notes'] for b in tab(-1)['boxes']] == ['trip text 0', 'trip text 1'])

    # a locked tab needs the site key (first the restored tab goes again, so its id is free)
    call('save_tabs', {'tabs': keep, 'rev': page()['rev']})
    rev = page()['rev']; before = json.dumps(page())
    lk = [{'id': 'aaaaaaa1', 'title': locked('t'), 'notes': locked('n')}, {'id': 'aaaaaaa2', 'title': 'Box 2', 'notes': ''}]
    r = call('save_tabs', {'tabs': keep + [{'id': 'bbbbbbb1', 'name': 'Locked', 'private': True, 'enc': True, 'restore': {'boxes': lk}}], 'rev': rev})
    check('I14 a locked tab is not restored while the site has no key (422), nothing changes', r.get('_status') == 422 and json.dumps(page()) == before, r)
    r = call('save_tabs', {'tabs': keep + [dict(head, restore={'boxes': [{'id': 'aaaaaaa1', 'title': 'x', 'notes': locked()}]})], 'rev': rev})
    check('I15 locked text in a readable tab is refused (422)', r.get('_status') == 422 and json.dumps(page()) == before, r)
    r = call('save_tabs', {'tabs': keep + [dict(head, restore={'boxes': []})], 'rev': rev})
    check('I16 a tab with no boxes is refused (422)', r.get('_status') == 422 and json.dumps(page()) == before, r)
    r = call('save_tabs', {'tabs': keep + [dict(head, restore={'boxes': gone['boxes']})] * 20, 'rev': rev})
    check('I17 more than 20 tabs is refused (400)', r.get('_status') == 400 or r.get('_status') == 422, r)
    check('I18 no request above changed the saved page', json.dumps(page()) == before)

    # with a site key in place a locked tab, and a locked box in a locked tab, come back, still locked
    b64 = lambda n: base64.b64encode(os.urandom(n)).decode()
    r = call('save_vault', {'vault': {'salt': b64(16), 'iter': 600000, 'wrap': b64(60)}, 'prev': ''})
    check('I19 a site key is set (so a locked tab can exist)', r.get('ok'), r)
    rev = page()['rev']
    r = call('save_tabs', {'tabs': keep + [{'id': 'bbbbbbb1', 'name': 'Locked', 'private': True, 'enc': True, 'restore': {'boxes': lk}}], 'rev': rev})
    lt = r['data']['tabs'][-1] if r.get('ok') else {'boxes': []}
    check('I20 a locked tab comes back with its locked boxes unchanged, and stays encrypted and private', r.get('ok') and lt['enc'] is True and lt['private'] is True
          and [b['notes'] for b in lt['boxes']] == [lk[0]['notes'], ''] and lt['boxes'][0]['title'] == lk[0]['title'], r)
    tid2 = lt['id']; order2 = [b['id'] for b in lt['boxes']]; rev = r['data']['rev']
    r = call('save_boxes', {'tab': tid2, 'boxes': [{'id': order2[0], 'w': '', 'h': ''}, {'id': None, 'w': '', 'h': '', 'restore': {'title': locked('t2'), 'notes': locked('n2')}}], 'rev': rev})
    check('I21 a locked box goes back into a locked tab', r.get('ok') and r['data']['tabs'][-1]['boxes'][-1]['notes'].startswith('enc1:'), r)
    rev = page()['rev']
    r = call('save_boxes', {'tab': tid2, 'boxes': [{'id': order2[0], 'w': '', 'h': ''}, {'id': None, 'w': '', 'h': '', 'restore': {'title': 'x', 'notes': 'readable secret'}}], 'rev': rev})
    check('I22 readable text into a locked tab is refused (422): it would sit there unlocked', r.get('_status') == 422 and 'readable secret' not in json.dumps(page()), r)
    stop_all(); sys.exit(check.done())
finally:
    stop_all()
