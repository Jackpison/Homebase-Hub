#!/usr/bin/env python3
"""Share from your phone (1.61.0), in a real browser (Chromium): the manifest lists the site as a share target, the share worker catches the
POST that the phone's Share button makes (here a form, submitted like the phone does), keeps the files in the browser only, and opens
Files, which asks what to do: Save to Files (locked like any upload), Open in Tools (the next tool that takes that kind of file gets it)
or Discard. Runs in Chromium only (the share sheet and service workers on localhost are tested there).
    python3 tests/browser/share_test.py build/site-update-X.Y.Z.zip   (port 8982)"""
import json, os, re, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import ROOT, FIX, PW
from helpers import Site, Checks, stop_all, browser_login, wait_js, browser_name, launch, until, browser_set_passphrase, browser_unlock, CSP_REPORTER
from playwright.sync_api import sync_playwright

if len(sys.argv) < 2: sys.exit(__doc__)
ZIP = sys.argv[1]; check = Checks(); PP = 'river lantern copper meadow'
if browser_name() != 'chromium':
    print('skipped: the share worker is tested in Chromium'); sys.exit(0)
PNGP = os.path.join(FIX, 'fixture-image.png'); PNG = {'name': 'fixture-image.png', 'mimeType': 'image/png', 'buffer': open(PNGP, 'rb').read()}
FORM = """() => { const f = document.createElement('form'); f.id = 'fake-share'; f.method = 'POST'; f.enctype = 'multipart/form-data'; f.action = '/web/hub/share-target';
  f.innerHTML = '<input name="title" value="Look at this"><input name="text" value="a few words"><input name="url" value="https://example.com/x"><input type="file" name="files" multiple>'; document.body.append(f); }"""


def inbox(pg): return pg.evaluate("caches.open('hub-share').then(c => c.keys()).then(k => k.map(r => new URL(r.url).pathname))")


try:
    s = Site(ZIP, 8982)
    with sync_playwright() as p:
        b = launch(p, 'chromium'); print('browser: chromium %s' % b.version)
        ctx = b.new_context(viewport={'width': 1280, 'height': 900}); ctx.add_init_script(CSP_REPORTER)
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        why = browser_login(pg, s.base); check('H0 logged in', not why, why)
        why = browser_set_passphrase(pg, s.base, PP); check('H1 the encryption passphrase is set', not why, why)

        m = s.req(s.base + '/web/hub/core/api.php?action=manifest')
        st = m.get('share_target') or {}
        check('H2 the manifest lists the site as a share target: a POST of files, text and links to web/hub/share-target', st.get('action', '').endswith('/web/hub/share-target') and st.get('method') == 'POST' and st.get('enctype') == 'multipart/form-data'
              and st.get('params', {}).get('files', [{}])[0].get('name') == 'files', st)
        check('H3 the share target lies inside the site\'s scope', st.get('action', '').startswith(m.get('scope', '#')), (st.get('action'), m.get('scope')))

        pg.goto(s.base + '/web/links/'); wait_js(pg, "navigator.serviceWorker.getRegistration('/web/hub/').then(r => !!(r && r.active))", 20000)
        check('H4 once you are logged in, the share worker is installed for web/hub/', pg.evaluate("navigator.serviceWorker.getRegistration('/web/hub/').then(r => r.scope)").endswith('/web/hub/'))
        pg.evaluate(FORM); pg.set_input_files('#fake-share input[type=file]', [PNG, {'name': 'note.txt', 'mimeType': 'text/plain', 'buffer': b'hello shared'}])
        with pg.expect_navigation(): pg.evaluate("document.getElementById('fake-share').submit()")
        pg.wait_for_selector('#dlg[open]', timeout=20000)
        txt = pg.inner_text('#dlg')
        check('H5 a share opens Files with a window that lists what came (the files, and the text or link), and nothing is saved yet', 'Shared With Homebase Hub' in txt and 'fixture-image.png' in txt and 'note.txt' in txt and 'Text or link' in txt and 'Nothing has been saved yet' in txt, txt)
        check('H6 the address is cleaned up (no ?shared left to reload)', 'shared=' not in pg.url, pg.url)
        keys = inbox(pg)
        check('H7 the files are kept in this browser only, for now (a meta entry and one per file)', len([k for k in keys if k.endswith('/meta')]) == 1 and len([k for k in keys if k.split('/')[-1].startswith('f')]) == 2, keys)
        check('H8 the server has been sent no file (nothing in Files yet)', s.req(s.site_base + '/web/files/api.php?action=list')['items'] == [])

        # ---- Save to Files ----
        pg.click('#dform .act .pri')
        why = browser_unlock(pg, PP, keep=True); check('H9 saving asks for the passphrase (the files are locked in the browser first)', not why, why)
        until(lambda: len(s.req(s.site_base + '/web/files/api.php?action=list')['items']) == 3, 30000)
        its = s.req(s.site_base + '/web/files/api.php?action=list')['items']
        blobs = ''.join(open(os.path.join(s.dir, 'site-data/files/blobs', f), 'rb').read().decode('latin-1') for f in os.listdir(s.dir + '/site-data/files/blobs'))
        check('H10 Save to Files uploads each file, and the text as "Shared text.txt": 3 files, locked', len(its) == 3 and 'hello shared' not in blobs and 'a few words' not in blobs, len(its))
        until(lambda: not inbox(pg), 10000)
        check('H11 the browser\'s waiting copy is removed afterwards', inbox(pg) == [], inbox(pg))
        names = pg.evaluate("[...document.querySelectorAll('#list .row .nm')].map(e => e.getAttribute('title'))")
        check('H12 the files show in the list by name', {'fixture-image.png', 'note.txt', 'Shared text.txt'} <= set(names), names)

        # ---- Discard ----
        pg.evaluate(FORM); pg.set_input_files('#fake-share input[type=file]', {'name': 'x.txt', 'mimeType': 'text/plain', 'buffer': b'discard me'})
        with pg.expect_navigation(): pg.evaluate("document.getElementById('fake-share').submit()")
        pg.wait_for_selector('#dlg[open]', timeout=20000); pg.click('#dform .act button:first-child')
        until(lambda: not inbox(pg) and not pg.evaluate("document.getElementById('dlg').open"), 10000)
        check('H13 Discard removes it from the browser and saves nothing', inbox(pg) == [] and len(s.req(s.site_base + '/web/files/api.php?action=list')['items']) == 3)

        # ---- Open in Tools ----
        pg.evaluate(FORM); pg.set_input_files('#fake-share input[type=file]', PNG)
        with pg.expect_navigation(): pg.evaluate("document.getElementById('fake-share').submit()")
        pg.wait_for_selector('#dlg[open]', timeout=20000); pg.click('#dform .act button:nth-child(2)')
        pg.wait_for_selector('.shnote', timeout=30000)
        check('H14 Open in Tools opens Tools with a note saying what is waiting', 'fixture-image.png' in pg.inner_text('.shnote') and 'shared=' not in pg.url, pg.inner_text('.shnote'))
        pg.goto(s.base + '/web/tools/#/tool/img-colors'); pg.wait_for_selector('#root .drop', timeout=30000)
        until(lambda: pg.evaluate("!!document.querySelector('#root canvas, #root img')") and not pg.evaluate("!!document.querySelector('.shnote')"), 30000)
        check('H15 the next tool that takes pictures gets the file by itself, and the note goes', pg.evaluate("!!document.querySelector('#root canvas, #root img')") and not pg.evaluate("!!document.querySelector('.shnote')"))
        check('H16 the waiting copy is removed once Tools has used it', inbox(pg) == [], inbox(pg))

        # ---- a bad or old address, and the worker leaves other requests alone ----
        pg.goto(s.base + '/web/files/?shared=nope'); wait_js(pg, "window.__files && __files.state().started", 20000)
        until(lambda: pg.evaluate("(document.getElementById('ix-toast') || {}).textContent || ''").find('Nothing came through') >= 0, 10000)
        check('H17 a made-up ?shared= says nothing came through, and nothing else happens', not pg.evaluate("document.getElementById('dlg').open") and len(s.req(s.site_base + '/web/files/api.php?action=list')['items']) == 3)
        check('H18 no page error', not errs, errs)
        b.close()
finally:
    stop_all()
sys.exit(check.done())
