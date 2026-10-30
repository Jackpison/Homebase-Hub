#!/usr/bin/env python3
"""Files in a real browser, through the screens a person uses: upload (one piece and several), the list, folders, rename, move, search, Trash and
restore, preview, download (a file and a folder as a zip), share links opened by someone who is not logged in, the limit, a locked page,
and what the server is left holding (nothing readable).
    python3 tests/browser/files_test.py build/site-update-X.Y.Z.zip [--browser chromium|firefox|webkit]   (port 8976)"""
import glob, io, json, os, re, sys, tempfile, zipfile
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import ROOT, FIX, PW
from helpers import Site, Checks, stop_all, browser_login, wait_js, browser_name, launch, until, browser_set_passphrase, browser_unlock, CSP_REPORTER
from playwright.sync_api import sync_playwright

if len(sys.argv) < 2: sys.exit(__doc__)
BROWSER = browser_name(); ZIP = sys.argv[1]; check = Checks()
PP = 'river lantern copper meadow'
BIG = os.urandom(5 * 1024 * 1024 + 123)   # three pieces
TXT = b'hello files, this is a small text file'
PNG = open(os.path.join(FIX, 'fixture-image.png'), 'rb').read()


def names(pg): return pg.evaluate("[...document.querySelectorAll('#list .row .nm')].map(e => e.getAttribute('title'))")
def row(pg, name): return pg.locator('#list .row', has=pg.locator('.nm[title="%s"]' % name))
def menu(pg, name, item):
    row(pg, name).locator('.more').click(); pg.locator('.pm button', has_text=item).first.click()
def wait_names(pg, want, timeout=15000): return until(lambda: all(w in names(pg) for w in want), timeout)
def upload(pg, name, data, mime='application/octet-stream'): pg.set_input_files('#pick', {'name': name, 'mimeType': mime, 'buffer': data})


try:
    s = Site(ZIP, 8976)
    api = s.site_base + '/web/files/api.php'
    def srv_items():
        r = s.req(api + '?action=list'); return r['items'], r
    with sync_playwright() as p:
        b = launch(p, BROWSER); print('browser: %s %s' % (BROWSER, b.version))
        ctx = b.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True); ctx.add_init_script(CSP_REPORTER)
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        csp = []; pg.on('console', lambda m: csp.append(m.text[:160]) if m.type == 'error' and ('security policy' in m.text.lower() or 'Refused to' in m.text) else None)
        why = browser_login(pg, s.base); check('B0 logged in', not why, why)
        why = browser_set_passphrase(pg, s.base, PP); check('B1 the encryption passphrase is set', not why, why)

        pg.goto(s.base + '/web/files/'); wait_js(pg, "window.__files && __files.state().started", 20000)
        check('B2 a new Files page says there is nothing yet, and shows the limit', 'No files yet' in pg.inner_text('#none') and '5 GB' in pg.inner_text('#usage'), pg.inner_text('#usage'))
        check('B3 the Files tab is in the bar between Tasks and Tools', pg.evaluate("[...document.querySelectorAll('.ix-links a, #ix-bar a')].map(a => a.textContent.trim()).filter(Boolean)").count('Files') >= 1)

        # ---- upload a small file: the first use asks for the passphrase ----
        upload(pg, 'hello.txt', TXT, 'text/plain')
        why = browser_unlock(pg, PP, keep=True); check('B4 the first upload asks for the passphrase, and it opens', not why, why)
        check('B5 the file is in the list with its name and size', wait_names(pg, ['hello.txt']) and '38 B' in row(pg, 'hello.txt').inner_text(), row(pg, 'hello.txt').inner_text())
        items, lst = srv_items()
        blobs = sorted(os.listdir(s.dir + '/site-data/files/blobs'))
        check('B6 the server holds one locked piece (the text plus 28 bytes), not the words', len(items) == 1 and len(blobs) == 1 and os.path.getsize(s.dir + '/site-data/files/blobs/' + blobs[0]) == len(TXT) + 28
              and TXT not in open(s.dir + '/site-data/files/blobs/' + blobs[0], 'rb').read(), (blobs, items))
        stored = open(s.dir + '/site-data/files/files.php').read()
        check('B7 the list the server keeps holds no name', 'hello' not in stored and stored.startswith('<?php'))

        # ---- a big file in three pieces ----
        upload(pg, 'big.bin', BIG)
        check('B8 a file of 5 MB is uploaded in three pieces', wait_names(pg, ['big.bin'], 60000) and len(os.listdir(s.dir + '/site-data/files/blobs')) == 4, os.listdir(s.dir + '/site-data/files/blobs'))
        with pg.expect_download(timeout=60000) as d:
            menu(pg, 'big.bin', 'Download')
        out = os.path.join(tempfile.mkdtemp(), 'big.bin'); d.value.save_as(out)
        check('B9 downloading it gives back exactly the same bytes, under its name', d.value.suggested_filename == 'big.bin' and open(out, 'rb').read() == BIG)

        # ---- remembered: a reload shows names with no question ----
        pg.reload(); wait_js(pg, "window.__files && __files.state().started", 20000); wait_names(pg, ['hello.txt', 'big.bin'])
        check('B10 after "keep unlocked on this device" a reload shows the names with no question', not pg.is_visible('#ix-skp') and not pg.is_visible('#lock'))

        # ---- folders ----
        pg.click('#mk'); pg.fill('#dname', 'Docs'); pg.click('#dform .act .pri'); wait_names(pg, ['Docs'])
        check('B11 New Folder makes a folder, shown first', names(pg)[0] == 'Docs', names(pg))
        row(pg, 'Docs').locator('.nm').click()
        check('B12 opening it shows the way back in the path, and it is empty', until(lambda: 'Docs' in pg.inner_text('#crumbs'), 5000) and 'empty' in pg.inner_text('#none'), pg.inner_text('#crumbs'))
        upload(pg, 'inside.txt', b'inside the folder', 'text/plain'); wait_names(pg, ['inside.txt'])
        items, _ = srv_items(); docs = [i for i in items if i['t'] == 'd'][0]['id']
        check('B13 a file uploaded in a folder is stored in that folder', any(i['t'] == 'f' and i['p'] == docs for i in items))
        pg.click('#crumbs button:first-child'); wait_names(pg, ['Docs', 'hello.txt'])
        check('B14 the first part of the path goes back to All Files', 'big.bin' in names(pg))

        # ---- rename, move ----
        menu(pg, 'hello.txt', 'Rename'); pg.fill('#dname', 'greeting.txt'); pg.click('#dform .act .pri'); wait_names(pg, ['greeting.txt'])
        check('B15 rename works and the old name is gone', 'hello.txt' not in names(pg))
        menu(pg, 'greeting.txt', 'Move'); pg.locator('.pick button', has_text='Docs').click(); pg.click('#dform .act .pri'); until(lambda: 'greeting.txt' not in names(pg), 10000)
        check('B16 Move puts it in the folder picked', 'greeting.txt' not in names(pg) and any(i['t'] == 'f' and i['p'] == docs for i in srv_items()[0]) and len([i for i in srv_items()[0] if i['p'] == docs]) == 2)

        # ---- search ----
        pg.fill('#q', 'greet'); until(lambda: names(pg) == ['greeting.txt'], 5000)
        check('B17 search finds a file by its name wherever it is, and says where', names(pg) == ['greeting.txt'] and 'Docs' in row(pg, 'greeting.txt').inner_text())
        pg.fill('#q', ''); until(lambda: 'Docs' in names(pg), 5000)

        # ---- Trash ----
        menu(pg, 'big.bin', 'Move to Trash'); until(lambda: 'big.bin' not in names(pg), 10000)
        check('B18 Move to Trash takes it out of the list and counts it in the Trash tab', 'big.bin' not in names(pg) and pg.inner_text('#tn').strip() == '1')
        pg.click('#tabs button[data-t=trash]'); wait_names(pg, ['big.bin'])
        check('B19 the Trash lists it with the days left (and says so in words in the heading)', '30 days left' in row(pg, 'big.bin').inner_text() and 'then removed for good' in pg.inner_text('#crumbs'), (row(pg, 'big.bin').inner_text(), pg.inner_text('#crumbs')))
        menu(pg, 'big.bin', 'Restore'); until(lambda: 'big.bin' not in names(pg), 10000)
        pg.click('#tabs button[data-t=files]'); wait_names(pg, ['big.bin'])
        check('B20 Restore brings it back where it was', 'big.bin' in names(pg))
        menu(pg, 'big.bin', 'Move to Trash'); until(lambda: 'big.bin' not in names(pg), 10000)
        pg.click('#tabs button[data-t=trash]'); wait_names(pg, ['big.bin'])
        menu(pg, 'big.bin', 'Delete Forever'); pg.click('#dform .act .danger'); until(lambda: 'big.bin' not in names(pg), 10000)
        check('B21 Delete Forever (after asking) removes it, and its three pieces from the server', 'big.bin' not in names(pg) and len(os.listdir(s.dir + '/site-data/files/blobs')) == 2, os.listdir(s.dir + '/site-data/files/blobs'))
        pg.click('#tabs button[data-t=files]')

        # ---- preview ----
        upload(pg, 'photo.png', PNG, 'image/png'); wait_names(pg, ['photo.png'])
        row(pg, 'photo.png').locator('.nm').click(); pg.wait_for_selector('#pbox img', timeout=15000)
        check('B22 a picture opens in a preview', pg.evaluate("(() => { const i = document.querySelector('#pbox img'); return i && i.complete && i.naturalWidth > 0; })()"))
        pg.keyboard.press('Escape')
        pg.locator('.nm[title="Docs"]').click(); wait_names(pg, ['greeting.txt'])
        row(pg, 'greeting.txt').locator('.nm').click(); pg.wait_for_selector('#pbox pre', timeout=15000)
        check('B23 a text file opens in a preview with its words', 'hello files' in pg.inner_text('#pbox pre'), pg.inner_text('#pbox pre'))
        pg.keyboard.press('Escape')

        # ---- a folder as a zip ----
        pg.click('#crumbs button:first-child'); wait_names(pg, ['Docs'])
        with pg.expect_download(timeout=30000) as d:
            menu(pg, 'Docs', 'Download as Zip')
        zp = os.path.join(tempfile.mkdtemp(), 'Docs.zip'); d.value.save_as(zp)
        try: z = zipfile.ZipFile(zp); zn = sorted(z.namelist()); bad = z.testzip(); zc = {n: z.read(n) for n in zn}
        except Exception as e: zn, bad, zc = [str(e)], 'x', {}
        check('B24 a folder downloads as a zip that opens, with its files under the folder\'s name and the right bytes', d.value.suggested_filename == 'Docs.zip' and bad is None and zn == ['Docs/greeting.txt', 'Docs/inside.txt'] and zc.get('Docs/greeting.txt') == TXT and zc.get('Docs/inside.txt') == b'inside the folder', (zn, bad))

        # ---- share links ----
        pg.locator('.nm[title="Docs"]').click(); wait_names(pg, ['greeting.txt'])
        menu(pg, 'greeting.txt', 'Share Link'); pg.wait_for_selector('#dform button:has-text("Make a New Link")')
        pg.click('#dform button:has-text("Make a New Link")'); pg.wait_for_selector('#dform .linkbox input')
        link = pg.locator('#dform .linkbox input').first.input_value()
        check('B25 Share Link makes an address with the token in the query and the key after the #', re.search(r'/web/files/share\.html\?t=[A-Za-z0-9_-]{32}#[A-Za-z0-9_-]{43}$', link), link)
        key = link.split('#')[1]; tok = re.search(r't=([A-Za-z0-9_-]{32})', link).group(1)
        pg.click('#dform .act button:has-text("Done")')
        vctx = b.new_context(viewport={'width': 1000, 'height': 800}, accept_downloads=True); vctx.add_init_script(CSP_REPORTER)
        vp = vctx.new_page(); seen = []; vp.on('request', lambda r: seen.append(r.url)); verrs = []
        vp.on('console', lambda m: verrs.append(m.text[:160]) if m.type == 'error' and 'security policy' in m.text.lower() else None)
        vp.goto(link); wait_js(vp, "document.getElementById('name').textContent !== 'Opening…'", 20000)
        check('B26 someone who is not logged in opens the link and sees the file name and size', vp.inner_text('#name') == 'greeting.txt' and '38 B' in vp.inner_text('#info'), (vp.inner_text('#name'), vp.inner_text('#info')))
        until(lambda: 'hello files' in vp.inner_text('#pv'), 15000)
        check('B27 ...and a quick look at the words', 'hello files' in vp.inner_text('#pv'))
        with vp.expect_download(timeout=20000) as d:
            vp.click('#dl')
        sp = os.path.join(tempfile.mkdtemp(), 'x'); d.value.save_as(sp)
        check('B28 ...and Download gives the file, under its name', d.value.suggested_filename == 'greeting.txt' and open(sp, 'rb').read() == TXT)
        check('B29 the key (after the #) was never sent in any request', not any(key in u for u in seen) and all(u.startswith(s.host) for u in seen), [u for u in seen if key in u])
        check('B30 the share page broke no security policy', not verrs, verrs)
        # the link is not the owner's page: no login, no list
        vp.goto(s.base + '/web/files/'); wait_js(vp, "!!document.getElementById('ix-private')", 15000)
        check('B31 a visitor opening Files itself sees only "private"', 'private' in vp.inner_text('body').lower() and 'greeting' not in vp.inner_text('body'))
        # remove it
        menu(pg, 'greeting.txt', 'Share Link'); pg.wait_for_selector('#dform .lk'); pg.click('#dform .lk button:has-text("Remove")'); until(lambda: pg.locator('#dform .lk').count() == 0, 8000)
        pg.click('#dform .act button:has-text("Done")')
        vp.goto(link); wait_js(vp, "document.getElementById('err').textContent.length > 0", 15000)
        check('B32 once the link is removed, opening it says it has ended', 'ended or was removed' in vp.inner_text('#err'), vp.inner_text('#err'))
        vp.goto(s.site_base + '/web/files/share.html?t=%s#%s' % ('a' * 32, 'b' * 43)); wait_js(vp, "document.getElementById('err').textContent.length > 0", 15000)
        check('B33 a link that never existed says the same', 'ended or was removed' in vp.inner_text('#err'))
        vctx.close()

        # ---- the limit ----
        pg.click('#crumbs button:first-child')
        pg.evaluate("document.getElementById('psets').click()"); pg.wait_for_selector('#dlim')
        fs = pg.evaluate("(() => { const d = document.getElementById('dlg'); const o = document.getElementById('donly'), sh = document.getElementById('dsh'); return [d.classList.contains('ix-sdlg'), !!d.querySelector('.ix-sh .ix-sx'), !!d.querySelector('.ix-sb'), o.checked, o.disabled, o.classList.contains('ix-sw'), sh.classList.contains('ix-sw'), d.querySelector('.ix-sh h2').textContent]; })()")
        check('B34b Files Settings is the shared Settings window: a close X, Only Me locked on, Share Links as a switch', fs == [True, True, True, True, True, True, True, 'Files Settings'], fs)
        pg.fill('#dlim', '0.00002'); pg.click('#dform .act .pri'); until(lambda: 'of 21' in pg.inner_text('#usage'), 10000)
        check('B34 Files Settings changes the limit (here about 21 KB), and the usage line follows', srv_items()[1]['settings']['limit'] == 21475 and 'of 21' in pg.inner_text('#usage'), pg.inner_text('#usage'))
        upload(pg, 'toobig.bin', os.urandom(60000)); until(lambda: 'full' in (pg.inner_text('#ups') or ''), 15000)
        check('B35 a file over the limit is refused with a plain message, and nothing is left on the server', 'full' in pg.inner_text('#ups') and not any(i.get('up') for i in srv_items()[0]) and 'toobig' not in ' '.join(names(pg)), pg.inner_text('#ups'))

        # ---- locked: a browser that remembers nothing ----
        lctx = b.new_context(viewport={'width': 1100, 'height': 800}, storage_state=ctx.storage_state()); lp = lctx.new_page()
        lp.goto(s.base + '/web/files/'); wait_js(lp, "window.__files && __files.state().started", 20000)
        check('B36 a browser that has not unlocked shows that the files are locked, with no names', lp.is_visible('#lock') and 'locked' in lp.inner_text('#lock').lower() and 'Docs' not in lp.inner_text('#list'), lp.inner_text('#lock'))
        lp.click('#lock button'); why = browser_unlock(lp, PP); wait_names(lp, ['Docs'])
        check('B37 Unlock asks for the passphrase and then shows the names', not why and 'Docs' in names(lp), why)
        lctx.close()

        # ---- what the server holds, at the end ----
        blob = b''
        for f in glob.glob(s.dir + '/site-data/**/*', recursive=True):
            if os.path.isfile(f) and os.path.getsize(f) < 20000000:
                try: blob += open(f, 'rb').read()
                except Exception: pass
        check('B38 nothing the server keeps holds a file name, any file\'s words, the picture, the passphrase or a file key',
              not any(x in blob for x in (b'greeting', b'photo.png', b'inside the folder', b'hello files', PP.encode(), PNG[:64], BIG[:64], key.encode())))
        check('B39 no page error and no blocked request in all of it', not errs and not csp, (errs, csp))
        b.close()
finally:
    stop_all()
sys.exit(check.done())
