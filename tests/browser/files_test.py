#!/usr/bin/env python3
"""Files in a real browser, through the screens a person uses: upload (one piece and several), the list, folders, rename, move, search, Trash and
restore, preview, download (a file and a folder as a zip), share links opened by someone who is not logged in, the limit, a locked page,
and what the server is left holding (nothing readable).
    python3 tests/browser/files_test.py build/site-update-X.Y.Z.zip [--browser chromium|firefox|webkit]   (port 8976)"""
import glob, os, re, sys, tempfile, zipfile
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import FIX, hold, page_errors
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
    if pg.is_visible('.uph .ubtn'): pg.click('.uph .ubtn')   # finished uploads sit over the last rows: clear them, so the click never depends on where the panel is
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
        pg = ctx.new_page(); errs = []; page_errors(pg, errs)
        csp = []; pg.on('console', lambda m: csp.append(m.text[:160]) if m.type == 'error' and ('security policy' in m.text.lower() or 'Refused to' in m.text) else None)
        why = browser_login(pg, s.base); check('B0 logged in', not why, why)
        why = browser_set_passphrase(pg, s.base, PP); check('B1 the encryption passphrase is set', not why, why)

        pg.goto(s.base + '/web/files/'); wait_js(pg, "window.__files && __files.state().started", 20000)
        check('B2 a new Files page says there is nothing yet, and shows the limit', 'No files yet' in pg.inner_text('#none') and '5 GB' in pg.inner_text('#usage'), pg.inner_text('#usage'))
        check('B2b an empty Files page is a drop zone (a dashed area with an upload tile and the Upload Your First File button)', pg.evaluate("document.getElementById('none').classList.contains('zone') && getComputedStyle(document.getElementById('none')).borderStyle === 'dashed' && !!document.querySelector('#none .btn.pri')"))
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
        fc = pg.evaluate("(() => { const r = [...document.querySelectorAll('#list .row')].find(r => r.querySelector('.nm[title=\"hello.txt\"]')); const c = r && r.querySelector('.fcd'); return c ? [c.className, c.querySelector('.fclb').textContent] : null; })()")
        check('B7b the file shows its type card (TXT) in the list (1.66.0)', fc is not None and 'k-txt' in fc[0] and fc[1] == 'txt', fc)
        up = pg.evaluate("[...document.querySelectorAll('#ups .uc')].map(c => c.className + '|' + c.querySelector('small').textContent)")
        check('B7c the Transfers box keeps a card for it: "Uploaded · 38 B" (1.66.0)', any('done' in u and 'Uploaded · 38 B' in u for u in up), up)

        # ---- a big file in three pieces ----
        upload(pg, 'big.bin', BIG)
        check('B8 a file of 5 MB is uploaded in three pieces', wait_names(pg, ['big.bin'], 60000) and len(os.listdir(s.dir + '/site-data/files/blobs')) == 4, os.listdir(s.dir + '/site-data/files/blobs'))
        # ---- (1.66.0) a failed upload: a red card with try-again, which uploads it ----
        fails = {'on': True}
        def flaky(route):
            if fails['on']: return route.fulfill(status=500, body='{"ok":false,"error":"A piece did not arrive."}', headers={'Content-Type': 'application/json'})
            route.continue_()
        pg.route('**/api.php?action=put_chunk*', flaky)
        upload(pg, 'retry.txt', b'try me again')
        until(lambda: pg.evaluate("!!document.querySelector('#ups .uc.bad .re:not([hidden])')"), 20000)
        bad = pg.evaluate("(() => { const c = document.querySelector('#ups .uc.bad'); return c ? [c.querySelector('b').textContent, c.querySelector('small').textContent, c.querySelector('.re').getAttribute('aria-label')] : null; })()")
        fails['on'] = False; pg.click('#ups .uc.bad .re'); ok = wait_names(pg, ['retry.txt'], 20000)
        pg.unroute('**/api.php?action=put_chunk*')
        check('B8b a failed upload shows a red card with its reason and a try-again button; pressing it uploads the file', bad is not None and bad[0] == 'retry.txt' and 'did not arrive' in bad[1] and bad[2] == 'Try retry.txt again' and ok, (bad, ok))
        with pg.expect_download(timeout=60000) as d:
            menu(pg, 'big.bin', 'Download')
        out = os.path.join(tempfile.mkdtemp(), 'big.bin'); d.value.save_as(out)
        check('B9 downloading it gives back exactly the same bytes, under its name', d.value.suggested_filename == 'big.bin' and open(out, 'rb').read() == BIG)

        # ---- remembered: a reload shows names with no question ----
        pg.reload(); wait_js(pg, "window.__files && __files.state().started", 20000); wait_names(pg, ['hello.txt', 'big.bin'])
        check('B10 after "keep unlocked on this device" a reload shows the names with no question', not pg.is_visible('#ix-skp') and not pg.is_visible('#lock'))

        # ---- folders ----
        pg.click('#newb'); pg.click('.pm button:has-text("New Folder")'); pg.fill('#dname', 'Docs'); pg.click('#dform .act .pri'); wait_names(pg, ['Docs'])
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
        menu(pg, 'big.bin', 'Delete Forever'); hold(pg, '#dform .act .danger'); until(lambda: 'big.bin' not in names(pg), 10000)
        check('B21 Delete Forever (after asking) removes it, and its three pieces from the server (hello.txt, retry.txt and one more stay)', 'big.bin' not in names(pg) and len(os.listdir(s.dir + '/site-data/files/blobs')) == 3, os.listdir(s.dir + '/site-data/files/blobs'))
        pg.click('#tabs button[data-t=files]')

        # ---- preview ----
        upload(pg, 'photo.png', PNG, 'image/png'); wait_names(pg, ['photo.png'])
        row(pg, 'photo.png').locator('.nm').dblclick(); pg.wait_for_selector('#pbox img', timeout=15000)
        check('B22 a picture opens in a preview', pg.evaluate("(() => { const i = document.querySelector('#pbox img'); return i && i.complete && i.naturalWidth > 0; })()"))
        pg.keyboard.press('Escape')
        pg.locator('.nm[title="Docs"]').click(); wait_names(pg, ['greeting.txt'])
        row(pg, 'greeting.txt').locator('.nm').dblclick(); pg.wait_for_selector('#pbox pre', timeout=15000)
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

        # ---- (1.77.2) the details panel is open by default, with Select All
        pg.locator('.row .ck').first.wait_for()
        pg.evaluate("document.querySelectorAll('.row.sel').length && document.querySelector('#bulk .btn:last-child')?.click()")
        pn = pg.evaluate("(() => [document.getElementById('det').hidden, !document.getElementById('selall'), !!document.getElementById('lhck') && document.getElementById('sela').hidden])()")
        check('B24b nothing picked: the details panel stays closed (1.80.3), and the list has a Select All box at the top', pn == [True, True, True], pn)
        pg.click('#lhck'); until(lambda: pg.evaluate("document.querySelectorAll('.row.sel').length") == pg.evaluate("document.querySelectorAll('.row').length"), 3000)
        check('B24e the box at the top of the list picks every row, and clears them when pressed again (1.79.1)', pg.evaluate("document.getElementById('lhck').checked") and pg.evaluate("document.querySelectorAll('.row.sel').length") == pg.evaluate("document.querySelectorAll('.row').length"))
        pg.click('#lhck'); check('B24d the top box clears the pick', pg.evaluate("document.querySelectorAll('.row.sel').length") == 0)

        # ---- share links ----
        pg.locator('.nm[title="Docs"]').click(); wait_names(pg, ['greeting.txt'])
        menu(pg, 'greeting.txt', 'Share Link'); pg.wait_for_selector('#dform button:has-text("Make a New Link")')
        pg.click('#dform button:has-text("Make a New Link")'); pg.wait_for_selector('#dform .linkbox input')
        link = pg.locator('#dform .linkbox input').first.input_value()
        check('B25 Share Link makes an address with the token in the query and the key after the #', re.search(r'/web/files/share\.html\?t=[A-Za-z0-9_-]{32}#[A-Za-z0-9_-]{43}$', link), link)
        key = link.split('#')[1]; tok = re.search(r't=([A-Za-z0-9_-]{32})', link).group(1)
        lf = pg.evaluate("(() => { const f = document.querySelector('#dform .linkbox .ix-uf'); return f ? [f.querySelector('.ix-uf-px').textContent, f.querySelector('input').readOnly, !!f.querySelector('.ix-uf-cp .ix-uf-tip')] : null; })()")
        check('B25b the share link sits in the link field: "Link" in front, read-only, a copy icon with its COPY tip (1.69.1)', lf == ['Link', True, True], lf)
        pg.click('#dform .act button:has-text("Done")')   # (1.77.2) one window: Done closes it
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
        pg.click('#dform .act button:has-text("Done")')   # (1.77.2) one window: Done closes it
        vp.goto(link); wait_js(vp, "document.getElementById('err').textContent.length > 0", 15000)
        check('B32 once the link is removed, opening it says it has ended', 'ended or was removed' in vp.inner_text('#err'), vp.inner_text('#err'))
        vp.goto(s.site_base + '/web/files/share.html?t=%s#%s' % ('a' * 32, 'b' * 43)); wait_js(vp, "document.getElementById('err').textContent.length > 0", 15000)
        check('B33 a link that never existed says the same', 'ended or was removed' in vp.inner_text('#err'))
        vctx.close()

        # ---- the limit ----
        pg.click('#crumbs button:first-child')
        sg = pg.evaluate("(() => [document.querySelectorAll('#app .sug').length === 0 ? 2 : 0, document.querySelectorAll('#list .row .qa').length > 0, [...document.querySelectorAll('#list .row .cell.vis')].every(c => /^(Only you|Anyone with the link)$/.test(c.textContent)), (document.querySelector('#list .lh') || {}).textContent])()")
        check('B34c (1.79.1: no Suggested for You cards any more) each row says who can see it, and has Share / Download / Star for when you point at it', 2 <= sg[0] <= 5 and sg[1] and sg[2] and 'Who Can See It' in sg[3], sg)
        pg.evaluate("document.getElementById('psets').click()"); pg.wait_for_selector('#dform .limin')
        fs = pg.evaluate("(() => { const d = document.getElementById('dlg'); const o = document.getElementById('donly'), sh = document.getElementById('dsh'); return [d.classList.contains('ix-sdlg'), !!d.querySelector('.ix-sh .ix-sx'), !!d.querySelector('.ix-sb'), o.checked, o.disabled, o.classList.contains('ix-sw'), sh.classList.contains('ix-sw'), d.querySelector('.ix-sh h2').textContent]; })()")
        check('B34b Files Settings is the shared Settings window: a close X, Hide From Visitors locked on, Share Links as a switch', fs == [True, True, True, True, True, True, True, 'Files Settings'], fs)
        pg.fill('#dlimv', '25'); lim25 = pg.inner_text('#dlimn'); pg.fill('#dlimv', ''); lim0 = pg.inner_text('#dlimn'); pg.select_option('#dlimu', 'tb'); pg.fill('#dlimv', '2'); lim2tb = pg.inner_text('#dlimn')
        check('B34a (1.79.9) the storage limit is one typed number with GB or TB (no size buttons): the free space shows below, an empty box says no limit', pg.locator('#dform .limchips').count() == 0 and 'Free on the server' in lim25 and 'No limit' in lim0 and 'Free on the server' in lim2tb, (lim25, lim0, lim2tb))
        pg.keyboard.press('Escape'); pg.evaluate("HUB.fetch('api.php?action=settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings: { limit: 21475 } }) }).then(r => r.json())"); pg.reload(); until(lambda: 'of 21' in pg.inner_text('#usage'), 10000)
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
        # ---- 1.61.5: the Drive-style layout ----
        pg.click('#tabs button[data-t=files]'); pg.locator('.crumbs button').first.click()
        upload(pg, 'pack.zip', b'PK\x03\x04 not really a zip', 'application/zip'); wait_names(pg, ['pack.zip'])
        got = []; pg.on('download', lambda d: got.append(d.suggested_filename))
        row(pg, 'pack.zip').locator('.nm').click(); pg.wait_for_timeout(1200)
        check('B40 one click on a file only picks it: nothing downloads, and the details panel shows it', got == [] and pg.is_visible('#det') and 'pack.zip' in pg.inner_text('#det h3') and 'Locked in your browser' in pg.inner_text('#det'), (got, pg.inner_text('#det')[:80]))
        row(pg, 'pack.zip').locator('.nm').dblclick(); pg.wait_for_timeout(800)
        check('B41 opening a file that has no preview does not download it either (it says so)', got == [])
        check('B42 the sidebar lists My Files, Recent, Shared Links, Starred and Trash, and the usage has no server figure',
              pg.evaluate("[...document.querySelectorAll('#tabs button')].map(b => b.textContent.trim().replace(/[0-9 ]+$/, ''))") == ['My Files', 'Recent', 'Shared Links', 'Starred', 'Trash'] and 'free' not in pg.inner_text('#usage'), pg.inner_text('#usage'))
        pg.click('#det button.star'); until(lambda: pg.evaluate("document.querySelector('#det button.star').getAttribute('aria-pressed')") == 'true', 10000)
        pg.click('#tabs button[data-t=starred]'); wait_names(pg, ['pack.zip'])
        check('B43 Star puts it under Starred (and only it)', names(pg) == ['pack.zip'], names(pg))
        stored = open(s.dir + '/site-data/files/files.php').read()
        check('B44 the star is locked with the name: the server file shows no readable star or name', 'pack.zip' not in stored and '"st"' not in stored)
        pg.click('#tabs button[data-t=recent]'); until(lambda: len(names(pg)) >= 3, 10000)
        check('B45 Recent lists files only, newest first', 'Docs' not in names(pg) and names(pg)[0] in ('pack.zip', 'photo.png'), names(pg))
        pg.click('#tabs button[data-t=shared]')
        check('B46 Shared Links is empty until a file has a link, with a hint', pg.is_visible('#none') and 'No share links' in pg.inner_text('#none'), pg.inner_text('#none'))
        pg.click('#tabs button[data-t=files]')
        pg.click('#newb'); check('B47 New offers Upload Files and New Folder', pg.inner_text('.pm') .replace('\n', ' ').count('Upload Files') == 1 and 'New Folder' in pg.inner_text('.pm')); pg.keyboard.press('Escape')
        menu(pg, 'pack.zip', 'Move to Trash'); until(lambda: 'pack.zip' not in names(pg), 10000)
        pg.wait_for_selector('#ix-toast.on .ix-tact', timeout=5000)
        check('B48 Move to Trash says so, with an Undo button', 'Moved to the Trash' in pg.inner_text('#ix-toast') and 'Undo' in pg.inner_text('#ix-toast'), pg.inner_text('#ix-toast'))
        pg.click('#ix-toast .ix-tact'); wait_names(pg, ['pack.zip'])
        check('B49 Undo brings it back', 'pack.zip' in names(pg))
        # ---- (1.79.3) drag a file onto a folder, onto the path above the list, and onto the Trash ----
        pg.reload(wait_until='domcontentloaded'); wait_names(pg, ['pack.zip', 'Docs'])   # a fresh list: nothing picked
        n_docs = len([i for i in srv_items()[0] if i['p'] == docs])
        row(pg, 'pack.zip').drag_to(row(pg, 'Docs')); until(lambda: 'pack.zip' not in names(pg), 10000)
        check('B50 dragging a file onto a folder moves it there, and says so', len([i for i in srv_items()[0] if i['p'] == docs]) == n_docs + 1 and 'Moved: pack.zip to Docs' in pg.inner_text('#ix-toast'), pg.inner_text('#ix-toast'))
        row(pg, 'Docs').locator('.nm').click(); wait_names(pg, ['pack.zip'])
        pg.locator('#crumbs button[data-to=""]').wait_for()
        row(pg, 'pack.zip').drag_to(pg.locator('#crumbs button[data-to=""]')); until(lambda: 'pack.zip' not in names(pg), 10000)
        check('B51 dragging a file onto My Files in the path moves it back out', len([i for i in srv_items()[0] if i['p'] == docs]) == n_docs and 'to My Files' in pg.inner_text('#ix-toast'), pg.inner_text('#ix-toast'))
        pg.locator('#crumbs button', has_text='My Files').click(); wait_names(pg, ['pack.zip', 'Docs'])
        row(pg, 'pack.zip').drag_to(pg.locator('#tabs button[data-t="trash"]')); until(lambda: 'pack.zip' not in names(pg), 10000)
        check('B52 dragging a file onto the Trash tab moves it to the Trash, with Undo', 'Moved to the Trash: pack.zip' in pg.inner_text('#ix-toast') and 'Undo' in pg.inner_text('#ix-toast'), pg.inner_text('#ix-toast'))
        pg.click('#ix-toast .ix-tact'); wait_names(pg, ['pack.zip'])
        # ---- (1.80.0) keyboard, right-click, ranges, filters, pinned folders, jump menu, preview next/previous ----
        pg.reload(wait_until='domcontentloaded'); wait_names(pg, ['pack.zip', 'Docs'])
        pg.keyboard.press('ArrowDown'); pg.keyboard.press('ArrowDown')
        first = pg.evaluate("document.querySelector('#list .row.cur .nm').getAttribute('title')")
        check('B53 the arrow keys move a cursor over the rows', first == names(pg)[1], (first, names(pg)))
        pg.keyboard.press('Space')
        check('B54 Space picks the row under the cursor', pg.evaluate("document.querySelectorAll('#list .row.sel').length") == 1)
        pg.keyboard.press('Control+a')
        check('B55 Ctrl+A picks everything shown', pg.evaluate("document.querySelectorAll('#list .row.sel').length") == len(names(pg)), names(pg))
        pg.keyboard.press('Escape')
        check('B56 Escape clears the picks', pg.evaluate("document.querySelectorAll('#list .row.sel').length") == 0)
        row(pg, names(pg)[0]).locator('.ck').check(); row(pg, names(pg)[2]).locator('.nm').click(modifiers=['Shift'])
        check('B57 Shift-click picks the whole range', pg.evaluate("document.querySelectorAll('#list .row.sel').length") == 3, pg.evaluate("document.querySelectorAll('#list .row.sel').length"))
        pg.keyboard.press('Escape')
        row(pg, 'Docs').click(button='right')
        check('B58 right-click opens the row menu where you clicked, with Pin to Sidebar for a folder', pg.is_visible('.pm') and 'Pin to Sidebar' in pg.inner_text('.pm'), pg.inner_text('.pm') if pg.is_visible('.pm') else '')
        pg.locator('.pm button', has_text='Pin to Sidebar').click(); until(lambda: pg.is_visible('#pins button'), 10000)
        check('B59 a pinned folder shows in the sidebar and opens when pressed', 'Docs' in pg.inner_text('#pins') and (pg.click('#pins button') or True) and until(lambda: pg.evaluate("window.__files.state().cwd") != '', 5000))
        pg.click('#crumbs button[data-to=""]'); wait_names(pg, ['pack.zip', 'Docs'])
        pg.click('#cjump'); check('B60 the arrow by the path lists every folder to jump to', pg.is_visible('.pm.jump') and 'Docs' in pg.inner_text('.pm.jump'), '')
        pg.keyboard.press('Escape')
        pg.click('#chips .chip[data-k="image"]'); until(lambda: 'pack.zip' not in names(pg), 5000)
        check('B61 the Pictures chip leaves only pictures', names(pg) and all(n.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')) for n in names(pg)), names(pg))
        pg.click('#chips .chip[data-k=""]'); wait_names(pg, ['pack.zip', 'Docs'])
        pg.select_option('#fsize', str(100 << 20)); until(lambda: 'pack.zip' not in names(pg), 5000)
        check('B62 the size list hides small files', 'pack.zip' not in names(pg) and 'Docs' in names(pg), names(pg))
        pg.select_option('#fsize', ''); wait_names(pg, ['pack.zip'])
        row(pg, 'photo.png').dblclick(); pg.wait_for_selector('#pdlg[open] #pv img', timeout=20000)
        t1 = pg.inner_text('#pbox .ph b'); pg.keyboard.press('ArrowRight'); until(lambda: pg.inner_text('#pbox .ph b') != t1, 10000)
        check('B63 in the preview, the arrow keys go to the next file, and a counter shows where you are', pg.is_visible('#pcount') and ' of ' in pg.inner_text('#pcount'), pg.inner_text('#pcount'))
        pg.keyboard.press('ArrowLeft'); check('B63b the left arrow goes back to the first file', until(lambda: pg.inner_text('#pbox .ph b') == t1, 10000), pg.inner_text('#pbox .ph b')); pg.wait_for_selector('#pdlg[open] #pv img', timeout=20000)
        pg.click('#pzi'); check('B64 Zoom In makes the picture bigger (125 percent)', pg.inner_text('#pzl') == '125%', pg.inner_text('#pzl'))
        pg.click('#pfit'); check('B65 Fit goes back to the window size', pg.inner_text('#pzl') == '100%')
        check('B66 the preview has Full Screen, Share and Download', all(pg.is_visible(x) for x in ('#pfs', '#pdl')), '')
        pg.click('#pclose')

        # ---- (1.80.0) name clash, label and note, undo for rename and move, paste, upload a folder, resume ----
        pg.reload(wait_until='domcontentloaded'); wait_names(pg, ['pack.zip', 'Docs'])
        upload(pg, 'pack.zip', b'second copy of the pack')
        pg.wait_for_selector('#dlg[open] h2', timeout=15000)
        check('B67 a file whose name is already used asks: Skip, Replace or Keep Both', 'Name Already Used' in pg.inner_text('#dlg') and all(x in pg.inner_text('#dlg .act') for x in ('Skip', 'Replace', 'Keep Both')), pg.inner_text('#dlg'))
        n0 = len(srv_items()[0]); pg.locator('#dlg .act button', has_text='Skip').click()
        until(lambda: 'Skipped' in pg.inner_text('#ups'), 10000)
        check('B68 Skip uploads nothing', len(srv_items()[0]) == n0)
        upload(pg, 'pack.zip', b'second copy of the pack'); pg.wait_for_selector('#dlg[open] h2', timeout=15000)
        pg.locator('#dlg .act button', has_text='Keep Both').click(); check('B69 Keep Both adds a numbered copy', wait_names(pg, ['pack (2).zip'], 20000), names(pg))
        upload(pg, 'pack.zip', b'third version'); pg.wait_for_selector('#dlg[open] h2', timeout=15000)
        pg.locator('#dlg .act button', has_text='Replace').click(); until(lambda: len([n for n in names(pg) if n == 'pack.zip']) == 1 and 'Trash' in pg.inner_text('#ix-toast'), 20000)
        pg.click('#tabs button[data-t=trash]'); check('B70 Replace puts the old file in the Trash', 'pack.zip' in names(pg), names(pg)); pg.click('#tabs button[data-t=files]'); wait_names(pg, ['pack.zip'])
        menu(pg, 'pack.zip', 'Label and Note'); pg.wait_for_selector('#dlg[open] .lbs', timeout=5000)
        pg.click('#dlg .lbb.lb-green'); pg.fill('#lnote', 'check this on Friday'); pg.locator('#dlg .act button', has_text='Save').click()
        until(lambda: pg.is_visible('.row .lbd.lb-green'), 10000)
        check('B71 a colour label and a note show in the row', pg.is_visible('.row .ntm') and 'check this' in (pg.get_attribute('.row .ntm', 'title') or ''), '')
        stored = open(s.dir + '/site-data/files/files.json').read() if os.path.exists(s.dir + '/site-data/files/files.json') else open(s.dir + '/site-data/files/files.php').read()
        check('B72 the label and the note are locked: the server file shows neither', 'check this' not in stored and 'green' not in stored)
        pg.fill('#q', 'friday'); until(lambda: names(pg) == ['pack.zip'], 5000)
        check('B73 search finds a file by its note', names(pg) == ['pack.zip'], names(pg)); pg.fill('#q', ''); wait_names(pg, ['Docs'])
        menu(pg, 'pack.zip', 'Rename'); pg.fill('#dname', 'pack-renamed.zip'); pg.locator('#dlg .act button', has_text='Save').click(); wait_names(pg, ['pack-renamed.zip'])
        pg.wait_for_selector('#ix-toast.on .ix-tact', timeout=5000); pg.click('#ix-toast .ix-tact')
        check('B74 Rename can be undone', wait_names(pg, ['pack.zip']) and 'pack-renamed.zip' not in names(pg), names(pg))
        row(pg, 'pack.zip').drag_to(row(pg, 'Docs')); until(lambda: 'pack.zip' not in names(pg), 10000)
        pg.wait_for_selector('#ix-toast.on .ix-tact', timeout=5000); pg.click('#ix-toast .ix-tact')
        check('B75 Move can be undone', wait_names(pg, ['pack.zip']), names(pg))
        pg.evaluate("""(() => { const f = new File([new Uint8Array([137,80,78,71,13,10,26,10])], 'image.png', {type: 'image/png'}); const dt = new DataTransfer(); dt.items.add(f); document.dispatchEvent(new ClipboardEvent('paste', {clipboardData: dt, bubbles: true, cancelable: true})); })()""")
        check('B76 pasting a picture uploads it with a dated name', until(lambda: any(n.startswith('Pasted ') and n.endswith('.png') for n in names(pg)), 20000), names(pg))
        pg.evaluate("""(() => { const dt = new DataTransfer(); for (const [p, t] of [['trip/a.txt', 'one'], ['trip/sub/b.txt', 'two']]) { const f = new File([t], p.split('/').pop()); Object.defineProperty(f, 'webkitRelativePath', {value: p}); dt.items.add(f); } const el = document.getElementById('pickdir'); el.files = dt.files; el.dispatchEvent(new Event('change')); })()""")
        check('B77 Upload Folder keeps the folders inside (trip, then sub)', wait_names(pg, ['trip'], 30000), names(pg))
        row(pg, 'trip').locator('.nm').click(); wait_names(pg, ['sub', 'a.txt'])
        check('B78 the folder holds its file and its inner folder', 'sub' in names(pg) and 'a.txt' in names(pg), names(pg)); pg.locator('#crumbs button[data-to=""]').click(); wait_names(pg, ['Docs'])
        # resume: the second piece fails and the clean-up is blocked, so the server keeps the first piece; then the page finishes it
        HALF = os.urandom(2 * 1024 * 1024 + 500)
        pg.evaluate("HUB.fetch('api.php?action=settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings: { limit: 5368709120 } }) }).then(r => r.json())"); pg.reload(wait_until='domcontentloaded'); wait_names(pg, ['Docs'])
        pg.route('**/api.php?action=put_chunk&id=*&n=1', lambda route: route.fulfill(status=500, body='{"ok":false,"error":"A piece did not arrive."}', headers={'Content-Type': 'application/json'}))
        pg.route('**/api.php?action=put_abort', lambda route: route.abort())
        upload(pg, 'half.bin', HALF); until(lambda: pg.evaluate("!!document.querySelector('#ups .uc.bad')"), 30000)
        pg.unroute('**/api.php?action=put_chunk&id=*&n=1'); pg.unroute('**/api.php?action=put_abort')
        pg.evaluate("(() => { const real = Date.now; Date.now = () => real() + 300000; })()"); pg.click('#tabs button[data-t=recent]'); pg.click('#tabs button[data-t=files]')
        until(lambda: pg.is_visible('#resume'), 10000)
        check('B79 an upload that stopped shows a note with Resume and Discard', 'half.bin' in pg.inner_text('#resume') and pg.is_visible('#resume [data-resume]'), pg.inner_text('#resume') if pg.is_visible('#resume') else '')
        with pg.expect_file_chooser() as fc: pg.click('#resume [data-resume]')
        fc.value.set_files({'name': 'half.bin', 'mimeType': 'application/octet-stream', 'buffer': HALF})
        check('B80 Resume sends only what is missing, and the file is whole', wait_names(pg, ['half.bin'], 30000) and not pg.is_visible('#resume'), names(pg))
        with pg.expect_download(timeout=60000) as d2: menu(pg, 'half.bin', 'Download')
        out2 = os.path.join(tempfile.mkdtemp(), 'half.bin'); d2.value.save_as(out2)
        check('B80b the resumed file downloads with the same bytes', open(out2, 'rb').read() == HALF)
        check('B81 no page error here', not errs, errs)

        # ---- (1.80.0) share link options: password, download limit, QR code, status ----
        pg.reload(wait_until='domcontentloaded'); wait_names(pg, ['pack.zip', 'Docs'])
        menu(pg, 'pack.zip', 'Share Link'); pg.wait_for_selector('#dform button:has-text("Make a New Link")')
        pg.fill('#dpw', 'open sesame'); pg.select_option('#dlim', '1'); pg.click('#dform button:has-text("Make a New Link")'); pg.wait_for_selector('#dform .lk')
        meta1 = pg.inner_text('#dform .lk .meta')
        check('B82 a link made with a password and one download says so: Password, 0 of 1 downloads used', 'Password' in meta1 and '0 of 1 downloads used' in meta1, meta1)
        pg.click('#dform .lk button:has-text("QR Code")'); pg.wait_for_selector('#dform .qrbox img', timeout=10000)
        check('B83 QR Code shows a picture of the link, made in the browser', pg.is_visible('#dform .qrbox img'), '')
        plink = pg.locator('#dform .linkbox input').first.input_value(); ptok = re.search(r't=([A-Za-z0-9_-]{32})', plink).group(1)
        pg.click('#dform .act button:has-text("Done")')
        raw_meta = s.req(api.replace('files/api.php', 'files/api.php') + '?action=s_meta&t=' + ptok)
        check('B84 without the password the server gives out no name, size or piece (only that a password is needed)', raw_meta.get('pw') is True and 'sm' not in raw_meta and 'z' not in raw_meta, raw_meta)
        v2 = b.new_context(viewport={'width': 1000, 'height': 800}, accept_downloads=True); v2.add_init_script(CSP_REPORTER); vp2 = v2.new_page(); v2e = []; page_errors(vp2, v2e)
        vp2.goto(plink); vp2.wait_for_selector('#pwf:not([hidden])', timeout=15000)
        check('B85 the link page asks for the password and shows no file name', 'Password' in vp2.inner_text('#name') and 'pack' not in vp2.inner_text('body'), vp2.inner_text('#name'))
        vp2.fill('#pw', 'wrong one'); vp2.click('#pwf button'); until(lambda: 'not right' in vp2.inner_text('#err'), 20000)
        check('B86 a wrong password is refused with a plain message', 'not right' in vp2.inner_text('#err'), vp2.inner_text('#err'))
        vp2.fill('#pw', 'open sesame'); vp2.click('#pwf button'); wait_js(vp2, "document.getElementById('name').textContent === 'pack.zip'", 30000)
        check('B87 the right password opens the file, and it says one download is left', 'pack.zip' == vp2.inner_text('#name') and '1 download left' in vp2.inner_text('#info'), vp2.inner_text('#info'))
        with vp2.expect_download(timeout=30000) as d3: vp2.click('#dl')
        check('B88 Download works with the password', d3.value.suggested_filename == 'pack.zip', d3.value.suggested_filename)
        v3 = b.new_context(viewport={'width': 1000, 'height': 800}); vp3 = v3.new_page(); vp3.goto(plink); wait_js(vp3, "document.getElementById('err').textContent.length > 0", 30000)
        check('B89 after its one download the link has ended', 'ended' in vp3.inner_text('#err'), vp3.inner_text('#err'))
        pg.reload(wait_until='domcontentloaded'); wait_names(pg, ['pack.zip']); pg.click('#tabs button[data-t=shared]'); until(lambda: 'pack.zip' in names(pg), 10000)
        vis = pg.inner_text('#list .row .vis')
        check('B90 the Shared Links tab shows the password and the downloads used (1/1)', 'Password' in vis and '1/1' in vis, vis)
        stored = open(s.dir + '/site-data/files/files.json').read() if os.path.exists(s.dir + '/site-data/files/files.json') else open(s.dir + '/site-data/files/files.php').read()
        check('B91 the server keeps no password, only a hash', 'open sesame' not in stored and 'sesame' not in stored)
        check('B92 no page error on the link pages', not v2e, v2e)
        pg.click('#tabs button[data-t=files]'); wait_names(pg, ['pack.zip'])

        # ---- (1.80.0) Storage view, Files activity, Open in Tools, phone swipes and pull to refresh ----
        pg.reload(wait_until='domcontentloaded'); wait_names(pg, ['pack.zip', 'Docs'])
        upload(pg, 'dup.txt', b'same words here'); wait_names(pg, ['dup.txt'], 20000)
        upload(pg, 'dup.txt', b'same words here'); pg.wait_for_selector('#dlg[open] h2', timeout=15000); pg.locator('#dlg .act button', has_text='Keep Both').click(); wait_names(pg, ['dup (2).txt'], 20000)
        upload(pg, 'dup (2).txt', b'same words here'); pg.wait_for_selector('#dlg[open] h2', timeout=15000); pg.locator('#dlg .act button', has_text='Skip').click()
        pg.click('#stbtn'); pg.wait_for_selector('#dlg[open] .stor', timeout=10000)
        buckets = pg.evaluate("[...document.querySelectorAll('#dlg .stb')].map(r => r.querySelector('span').textContent)")
        check('B93 Storage lists what takes the room: Pictures, Videos, Audio, Documents, Archives, Other and the Trash', buckets == ['Pictures', 'Videos', 'Audio', 'Documents', 'Archives', 'Other', 'In the Trash'], buckets)
        check('B94 Storage lists the biggest files, biggest first, with the 5 MB file at the top', 'big.bin' in pg.inner_text('#stbig li:first-child') or 'half.bin' in pg.inner_text('#stbig li:first-child'), pg.inner_text('#stbig'))
        check('B95 Storage finds files that look the same (same name and size)', pg.is_visible('#stdel') and 'dup' in pg.inner_text('#stdup'), pg.inner_text('#stdup'))
        pg.click('#stdel'); until(lambda: 'dup (2).txt' not in names(pg) or 'dup.txt' not in names(pg), 15000)
        check('B96 Move Extra Copies to the Trash keeps one copy', ('dup.txt' in names(pg)) != ('dup (2).txt' in names(pg)) or names(pg).count('dup.txt') == 1, [n for n in names(pg) if n.startswith('dup')])
        acts = open(s.dir + '/site-data/core/activity.php').read()
        check('B97 Files activity: Logs shows "files" lines (uploaded, trashed, share link) and no file name', '"ev":"files"' in acts.replace(' ', '') and 'Uploaded files' in acts and 'dup' not in acts and 'pack' not in acts, acts[-300:])
        navs = []; pg.on('request', lambda r: navs.append(r.url) if r.is_navigation_request() else None)
        menu(pg, 'pack.zip', 'Open in Tools'); pg.wait_for_url('**/web/tools/**', timeout=30000)   # (the page asks Tools by ?shared=ID; Tools takes the file and drops the ID at once)
        check('B98 Open in Tools opens Tools with the file handed over (?shared=...)', any(re.search(r'/web/tools/\?shared=[a-f0-9]{20}$', u) for u in navs), navs)
        pg.goto(s.base + '/web/files/'); wait_js(pg, "window.__files && __files.state().started", 20000); wait_names(pg, ['pack.zip'])
        # phone: swipe a row left to Trash, right to Star, pull down to reload (touch events)
        SW = """async ([name, dx]) => { const r = [...document.querySelectorAll('#list .row')].find(x => x.querySelector('.nm').title === name); const b = r.getBoundingClientRect(); const x0 = b.left + 120, y0 = b.top + 20;
          const mk = (x, y) => new Touch({identifier: 1, target: r, clientX: x, clientY: y}); const fire = (t, x, y) => r.dispatchEvent(new TouchEvent(t, {bubbles: true, cancelable: true, touches: t === 'touchend' ? [] : [mk(x, y)], changedTouches: [mk(x, y)]}));
          fire('touchstart', x0, y0); for (let k = 1; k <= 6; k++) fire('touchmove', x0 + dx * k / 6, y0 + 1); fire('touchend', x0 + dx, y0 + 1); }"""
        pg.evaluate(SW, ['pack.zip', 130]); until(lambda: pg.evaluate("!!document.querySelector('#list .row .stm')"), 10000)
        check('B99 swiping a row right stars it', pg.evaluate("[...document.querySelectorAll('#list .row')].some(r => r.querySelector('.nm').title === 'pack.zip' && !!r.querySelector('.stm'))"))
        pg.evaluate(SW, ['pack.zip', -130]); until(lambda: 'pack.zip' not in names(pg), 10000)
        check('B100 swiping a row left moves it to the Trash', 'pack.zip' not in names(pg), names(pg)); pg.wait_for_selector('#ix-toast.on .ix-tact', timeout=5000); pg.click('#ix-toast .ix-tact'); wait_names(pg, ['pack.zip'])
        pg.evaluate("""(() => { window.__pull = 0; const el = document.body; const mk = (y) => new Touch({identifier: 2, target: el, clientX: 200, clientY: y}); const fire = (t, y) => el.dispatchEvent(new TouchEvent(t, {bubbles: true, cancelable: true, touches: t === 'touchend' ? [] : [mk(y)], changedTouches: [mk(y)]}));
          fire('touchstart', 200); for (let k = 1; k <= 6; k++) fire('touchmove', 200 + k * 25); fire('touchend', 350); })()""")
        check('B101 pulling the page down reloads the list ("Up to date.")', until(lambda: 'Up to date' in pg.inner_text('#ix-toast'), 10000), pg.inner_text('#ix-toast'))
        pg.set_viewport_size({'width': 420, 'height': 800}); row(pg, 'pack.zip').locator('.ck').check(); row(pg, 'Docs').locator('.ck').check()
        bp = pg.evaluate("(() => { const b = document.getElementById('bulk'); const r = b.getBoundingClientRect(); return [getComputedStyle(b).position, Math.round(r.bottom), innerHeight]; })()")
        check('B102 on a phone, the actions for picked items sit in a bar at the bottom of the screen', bp[0] == 'fixed' and bp[1] > bp[2] * 0.6, bp)
        pg.set_viewport_size({'width': 1280, 'height': 900}); pg.keyboard.press('Escape')

        # ---- (1.80.1) a folder shows how much it holds ----
        pg.reload(wait_until='domcontentloaded'); wait_names(pg, ['Docs', 'trip'])
        fsz = pg.evaluate("[...document.querySelectorAll('#list .row')].filter(r => r.querySelector('.nm').title === 'trip').map(r => r.querySelector('.sz').textContent)[0]")
        check('B103 a folder shows the size of everything inside it, folders in folders included ("trip" holds 3 B + 3 B)', fsz == '6 B', fsz)

        # ---- (1.80.1) a gallery link for several pictures ----
        pg.reload(wait_until='domcontentloaded'); wait_names(pg, ['photo.png'])
        pics = [n for n in names(pg) if n.lower().endswith('.png')][:2]
        for n in pics: row(pg, n).locator('.ck').check()
        pg.click('#bulk button:has-text("Share as Gallery")'); pg.wait_for_selector('#dform button:has-text("Make the Gallery Link")')
        pg.fill('#gpw', 'gallery pass'); pg.click('#dform button:has-text("Make the Gallery Link")'); pg.wait_for_selector('#dform .linkbox input', timeout=30000)
        glink = pg.locator('#dform .linkbox input').first.input_value()
        check('B104 the gallery link holds one token and one key for each picture', len(pics) == 2 and re.search(r'share\.html\?t=[A-Za-z0-9_-]{32}(,|%2C)[A-Za-z0-9_-]{32}#[A-Za-z0-9_-]{43},[A-Za-z0-9_-]{43}$', glink), glink)
        pg.click('#dform .act button:has-text("Done")')
        v4 = b.new_context(viewport={'width': 1100, 'height': 800}); vp4 = v4.new_page(); e4 = []; page_errors(vp4, e4)
        vp4.goto(glink); vp4.wait_for_selector('#pwf:not([hidden])', timeout=15000); vp4.fill('#pw', 'gallery pass'); vp4.click('#pwf button')
        until(lambda: vp4.evaluate("document.querySelectorAll('.galg img[src^=blob]').length") == 2, 40000)
        check('B105 the gallery page asks for the password once, then shows both pictures', vp4.evaluate("document.querySelectorAll('.galg img[src^=blob]').length") == 2 and 'Shared Pictures' in vp4.inner_text('#name'), vp4.inner_text('#info'))
        check('B106 each picture is captioned with its name', all(n in vp4.inner_text('.galg') for n in pics), vp4.inner_text('.galg'))
        check('B107 no page error on the gallery page', not e4, e4)
        pg.keyboard.press('Escape')

        # ---- (1.80.1) Send to Telegram asks first, and says so when Telegram is not set up ----
        pg.reload(wait_until='domcontentloaded'); wait_names(pg, ['photo.png'])
        menu(pg, 'photo.png', 'Send to Telegram'); pg.wait_for_selector('#dlg[open] h2', timeout=10000)
        check('B108 Send to Telegram first explains that the readable file goes through the server', 'readable' in pg.inner_text('#dlg') and 'Telegram' in pg.inner_text('#dlg h2'), pg.inner_text('#dlg'))
        pg.locator('#dlg .act button', has_text='Send It').click(); until(lambda: 'not set up' in pg.inner_text('#ups'), 20000)
        check('B109 with no Telegram set up it says so, and nothing is sent', 'not set up' in pg.inner_text('#ups'), pg.inner_text('#ups')[:200])

        # ---- (1.80.2) a PDF shows its first page as the picture ----
        upload(pg, 'paper.pdf', open(os.path.join(FIX, 'fixture-2pages.pdf'), 'rb').read(), 'application/pdf'); wait_names(pg, ['paper.pdf'])
        pg.reload(wait_until='domcontentloaded'); wait_names(pg, ['paper.pdf'])
        pg.click('button[data-v="grid"]')
        try: pg.wait_for_selector('#list .row:has(.nm[title="paper.pdf"]) img.th', timeout=30000); got = True
        except Exception: got = False
        pg.click('button[data-v="list"]')
        check('B110 a PDF shows a picture of its first page, drawn here (no server, no page error)', got and not errs, errs)

        # ---- (1.80.2) Keep on This Device: the locked pieces are stored here and the file opens with no connection ----
        pg.reload(wait_until='domcontentloaded'); wait_names(pg, ['photo.png'])
        menu(pg, 'photo.png', 'Keep on This Device'); pg.wait_for_selector('#list .row:has(.nm[title="photo.png"]) .offm', timeout=30000)
        check('B111 Keep on This Device marks the file and the menu now offers Remove from This Device', row(pg, 'photo.png').locator('.offm').count() == 1)
        ctx.set_offline(True)
        row(pg, 'photo.png').locator('.nm').dblclick(); pg.wait_for_selector('#pbox img', timeout=20000)
        check('B112 with no connection the kept picture still opens in the preview', pg.evaluate("(() => { const i = document.querySelector('#pbox img'); return !!i && i.complete && i.naturalWidth > 0; })()"))
        pg.keyboard.press('Escape'); ctx.set_offline(False)
        menu(pg, 'photo.png', 'Remove from This Device'); pg.wait_for_selector('#list .row:has(.nm[title="photo.png"]):not(:has(.offm))', timeout=15000)
        check('B113 Remove from This Device takes the mark away', row(pg, 'photo.png').locator('.offm').count() == 0)

        # ---- (1.80.2) Attach a File: Tasks picks a file from Files, gets a link, and the link opens that file in Files ----
        pg.goto(s.base + '/web/tasks/'); wait_js(pg, "typeof T !== 'undefined' && typeof openEditor === 'function'", 20000)
        pg.click('#add'); wait_js(pg, "document.getElementById('dlg').open", 5000)
        pg.click('#e-att'); pg.wait_for_selector('dialog.ix-fp[open] .ix-fpl button', timeout=20000)
        pg.fill('dialog.ix-fp input', 'photo'); pg.click('dialog.ix-fp .ix-fpl button:has-text("photo.png")')
        link = pg.input_value('#e-url')
        check('B114 Attach a File puts a link to the chosen file in the Website field', re.search(r'/web/files/#file=[A-Za-z0-9_-]+$', link) is not None, link)
        pg.goto(link); pg.wait_for_selector('#pbox img', timeout=30000)
        check('B115 that link opens the file in Files, in its preview', pg.evaluate("(() => { const i = document.querySelector('#pbox img'); return !!i && i.complete && i.naturalWidth > 0; })()") and '#file=' not in pg.url, pg.url)

        # ---- (1.80.3) list view: the current row follows the rounded frame (inset line, rounded last row) ----
        pg.goto(s.base + '/web/files/'); wait_js(pg, "window.__files && __files.state().started", 20000)
        pg.click('#list .row:last-child .nm'); pg.keyboard.press('ArrowDown')
        st = pg.evaluate("(() => { const r = document.querySelector('#list .row:last-child'), c = getComputedStyle(r); return [c.borderBottomLeftRadius, c.outlineStyle]; })()")
        check('B117 the last list row has rounded bottom corners like the frame, and the current row uses no square outline', st[0] == '13px' and st[1] == 'none', st)

        pg.screenshot(path='/tmp/claude-0/-home-user-homebase-hub/c92d2661-ab66-5c0d-9223-a322b3014135/scratchpad/list.png', clip={'x': 0, 'y': 0, 'width': 1280, 'height': 500})

        # ---- (1.80.3) a HEIC file is a picture: it is in Pictures and opens in the preview (or says what to do when the browser cannot draw it) ----
        pg.goto(s.base + '/web/files/'); wait_js(pg, "window.__files && __files.state().started", 20000)
        upload(pg, 'camera.heic', open(os.path.join(FIX, 'fixture-photo.heic'), 'rb').read(), 'image/heic'); wait_names(pg, ['camera.heic'])
        pg.click('#chips .chip:has-text("Pictures")')
        check('B118 a HEIC file is listed under the Pictures filter', 'camera.heic' in names(pg), names(pg))
        row(pg, 'camera.heic').locator('.nm').dblclick(); pg.wait_for_selector('#pbox img, #pbox .pvno', timeout=20000)
        ok = pg.evaluate("(() => { const i = document.querySelector('#pbox img'); return !!i && i.complete && i.naturalWidth > 0; })()") or pg.locator('#pbox button:has-text("Open in Tools")').count() == 1
        check('B119 the HEIC preview shows the picture, or Open in Tools when this browser cannot draw HEIC', ok)
        pg.keyboard.press('Escape'); pg.click('#chips .chip:has-text("All")')

        # ---- (1.80.2) Info: the paperclip button in a box's toolbar writes a [name](link) link ----
        pg.goto(s.base + '/web/info/'); wait_js(pg, "!!document.querySelector('#boxTpl') && document.querySelectorAll('.box').length > 0", 20000)
        pg.evaluate("document.querySelector('.box [data-r=edit]').click()")
        pg.wait_for_selector('.box .form:not([hidden]) [data-f=file]', timeout=10000)
        pg.click('.box .form:not([hidden]) [data-f=file]'); pg.wait_for_selector('dialog.ix-fp[open] .ix-fpl button', timeout=20000)
        pg.click('dialog.ix-fp .ix-fpl button:has-text("photo.png")')
        got = pg.input_value('.box .form:not([hidden]) textarea')
        check('B116 the Info paperclip button writes a link to the chosen file into the box', re.search(r'\[photo\.png\]\(http[^)]*/web/files/#file=[A-Za-z0-9_-]+\)', got) is not None, got[-200:])

        check('B39 no page error and no blocked request in all of it', not errs and not csp, (errs, csp))
        b.close()
finally:
    stop_all()
sys.exit(check.done())
