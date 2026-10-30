#!/usr/bin/env python3
"""1.61.6 and 1.61.9 in a real browser: the Settings windows (rows in cards, a hidden row joins its card, hints stay with their row, no empty
strip), Import and Export Bookmarks in the window frame, Home Settings' buttons on the right, Files Settings and Tasks Settings in
rows, the main Settings page (a Save bar you can see, switches in Tabs, Health 3 + 3, the Passkeys card, one width, Reset beside
Dark/Light, no backup reminder on Settings), the Files grid (pictures as small previews, a picked tile keeps its shape), and nothing
wider than a 390 px phone on Files and on every Settings section.
    python3 tests/browser/settings_look_test.py build/site-update-X.Y.Z.zip [--browser chromium|firefox|webkit]   (port 8985)"""
import io, os, subprocess, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import SEED, Site, Checks, stop_all, browser_login, browser_set_passphrase, browser_unlock, wait_js, browser_name, launch, until, CSP_REPORTER
from playwright.sync_api import sync_playwright

if len(sys.argv) < 2: sys.exit(__doc__)
BROWSER = browser_name(); ZIP = sys.argv[1]; check = Checks()
PP = 'a long passphrase for the look test 61'


def png(rgb):
    """A small real PNG made without Pillow: one colour, 64 x 48."""
    import struct, zlib
    w, hgt = 64, 48
    raw = b''.join(b'\x00' + bytes(rgb) * w for _ in range(hgt))
    chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, hgt, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')


# every card in an open window: [visible parts, lines with nothing before or after them, empty space at the bottom in px, ends with a row]
CARDS = """(sel => [...document.querySelectorAll(sel + ' .ix-grp')].filter(g => g.offsetParent).map(g => {
  const kids = [...g.children].filter(k => k.offsetParent && getComputedStyle(k).display !== 'none' && k.getBoundingClientRect().height > 1
    && !!(k.textContent.trim() || k.querySelector('input,select,button,img,svg')));   // an empty line still takes room: it is an empty strip, not a part
  const last = kids[kids.length - 1];
  const bad = [...g.children].filter(k => k.classList.contains('ix-srow') && k.offsetParent && parseFloat(getComputedStyle(k).borderTopWidth) > 0
    && !kids.slice(0, kids.indexOf(k)).length).length + (last && parseFloat(getComputedStyle(last).borderBottomWidth) > 0 ? 1 : 0);
  const gap = last ? g.getBoundingClientRect().bottom - last.getBoundingClientRect().bottom : 0;
  return [kids.length, bad, Math.round(gap), !!(last && last.classList.contains('ix-srow'))]; }))"""


def open_menu(pg, base, path, label):
    pg.goto(base + path); wait_js(pg, "!!(window.HUB && HUB.isAdmin()) && !!document.querySelector('[data-ix=edit],[data-ix=corner]')", 20000)
    pg.evaluate("document.querySelector('[data-ix=edit],[data-ix=corner]').click()")
    wait_js(pg, "[...document.querySelectorAll('button,a,[role=menuitem]')].some(x => x.offsetParent && x.textContent.trim() === %r)" % label, 10000)
    pg.evaluate("(l => [...document.querySelectorAll('button,a,[role=menuitem]')].find(x => x.offsetParent && x.textContent.trim() === l).click())(%r)" % label)
    wait_js(pg, "!!document.querySelector('dialog[open]')", 10000)


try:
    s = Site(ZIP, 8985)
    subprocess.run(['php', SEED, s.dir], capture_output=True)
    s.php("""hub_write_guarded(hub_dir('links') . '/bookmarks.php', ['settings' => new stdClass, 'tabs' => [
        ['id' => 't1', 'title' => 'Daily', 'categories' => [['id' => 'c1', 'title' => 'News', 'col' => 0, 'links' => [['id' => 'l1', 'title' => 'Example', 'url' => 'https://example.com/']]]]],
        ['id' => 't2', 'title' => 'Secret', 'private' => true, 'categories' => [['id' => 'c2', 'title' => 'Money', 'col' => 0, 'links' => [['id' => 'l2', 'title' => 'Bank', 'url' => 'https://bank.example.com/']]]]]]]);""")
    with sync_playwright() as p:
        b = launch(p, BROWSER); print('browser: %s %s' % (BROWSER, b.version))
        ctx = b.new_context(viewport={'width': 1280, 'height': 900}); ctx.add_init_script(CSP_REPORTER)
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        why = browser_login(pg, s.base); check('L0 logged in', not why, why)
        why = browser_set_passphrase(pg, s.base, PP); check('L0b the encryption passphrase is set', not why, why)

        # ---- the page Settings windows ----
        open_menu(pg, s.base, '/web/links/', 'Links Settings'); wait_js(pg, "!document.getElementById('sEncRow').hidden", 10000)
        enc = pg.evaluate("(() => { const r = document.getElementById('sEncRow'), g = r.closest('.ix-grp'); return [!!g, !!(g && g.contains(document.getElementById('sPrivate'))), !!r.offsetParent]; })()")
        check('L1 Links: Encrypt All Private Tabs is a row inside the Privacy card (it was hidden when the window was drawn)', enc == [True, True, True], enc)
        cards = pg.evaluate(CARDS, '#setDlg')
        check('L2 Links: no card draws a line above its first row, and none ends with an empty strip', cards and all(c[1] == 0 and c[2] <= (4 if c[3] else 16) for c in cards), cards)
        check('L3 Links: the Backups line under Look is gone', 'Backups: use the Backup icon' not in pg.inner_text('#setDlg'))
        pg.click('#setDlg .ix-sx')

        open_menu(pg, s.base, '/web/info/', 'Info Settings')
        cards = pg.evaluate(CARDS, '#setdlg')
        check('L4 Info: no empty strip at the bottom of a card (the Look card used to have one)', cards and all(c[2] <= (4 if c[3] else 16) for c in cards) and all(c[1] == 0 for c in cards), cards)
        hint = pg.evaluate("(() => { const h = [...document.querySelectorAll('#setdlg .hint')].find(x => /browser tab/.test(x.textContent)); return !!(h && h.closest('.ix-grp') && h.closest('.ix-grp').contains(document.getElementById('gin'))); })()")
        check('L5 Info: "Shown in the browser tab" stays inside the Page Title card', hint)
        pg.click('#setdlg .ix-sx')

        pg.goto(s.base + '/web/links/'); wait_js(pg, "!!(window.HUB && HUB.isAdmin()) && !!document.getElementById('importBmBtn')", 20000)
        pg.evaluate("document.getElementById('importBmBtn').click()"); pg.wait_for_selector('#impDlg[open]')
        imp = pg.evaluate("""(() => { const d = document.getElementById('impDlg');
            return [d.classList.contains('ix-sdlg'), !!d.querySelector('.ix-sh .ix-sx'), d.querySelectorAll('.ix-grp').length, [...d.querySelectorAll('.ix-sf button')].map(b => b.textContent.trim()),
                    Math.max(...[...d.querySelectorAll('.ix-sb small, .ix-sb .hint')].map(x => x.textContent.length)), document.activeElement.id, !!document.getElementById('impFile').hidden]; })()""")
        check('L6 Import and Export Bookmarks: the Settings window frame (title and X, Import and Export cards, Cancel then Import), short help, focus on Choose File',
              imp[:4] == [True, True, 2, ['Cancel', 'Import']] and imp[4] <= 80 and imp[5] == 'impPick' and imp[6], imp)
        pg.keyboard.press('Escape'); until(lambda: not pg.evaluate("document.getElementById('impDlg').open"), 4000)

        open_menu(pg, s.base, '/web/files/', 'Files Settings')
        fs = pg.evaluate("""(() => { const d = document.querySelector('dialog[open]'), n = d.querySelector('#dlim'), t = d.querySelector('#dtd');
            const row = x => x.closest('.ix-srow'), same = x => { const a = x.getBoundingClientRect(), l = row(x).querySelector('label').getBoundingClientRect(); return a.left > l.right - 2 && Math.abs(a.top + a.height / 2 - (l.top + l.height / 2)) < 30; };
            return [d.querySelectorAll('.ix-grp').length, d.querySelectorAll('.ix-rt').length >= 4, Math.round(n.getBoundingClientRect().width) <= 140, same(n), same(t)]; })()""")
        check('L7 Files Settings: four cards with tiles; the storage box and the Trash choice sit small at the right of their row', fs == [4, True, True, True, True], fs)
        pg.keyboard.press('Escape')

        pg.goto(s.base + '/web/tasks/'); pg.wait_for_selector('#sdlg', state='attached'); pg.evaluate("document.getElementById('sdlg').showModal()")
        tk = pg.evaluate("""(() => { const d = document.getElementById('sdlg'), sels = [...d.querySelectorAll('select')];
            return [sels.length, sels.filter(x => x.closest('.ix-srow')).length, d.querySelectorAll('.c2').length, d.querySelectorAll('.ix-grp').length >= 4]; })()""")
        check('L8 Tasks Settings: every choice is a row with its control on the right (no two-column fields left)', tk[0] >= 8 and tk[0] == tk[1] and tk[2] == 0 and tk[3], tk)

        pg.goto(s.base + '/'); wait_js(pg, "!!document.getElementById('settingsSheet')", 20000)
        pg.evaluate("document.getElementById('settingsSheet').showModal()"); pg.wait_for_timeout(300)
        hm = pg.evaluate("""(() => { const r = id => document.getElementById(id), seg = r('sEditBar').nextElementSibling, tint = r('pTint');
            const right = (ctl) => { const row = ctl.closest('.g-row'), l = row.querySelector('.g-label').getBoundingClientRect(), c = ctl.getBoundingClientRect(); return c.left >= l.right - 2 && Math.abs((c.top + c.bottom) / 2 - (l.top + l.bottom) / 2) < 30; };
            const only = r('sPrivate').closest('.g-row'), lab = only.querySelector('.g-label').getBoundingClientRect(), tile = only.querySelector('.ix-rt').getBoundingClientRect();
            return [right(seg), right(tint), Math.round(lab.left - tile.right) <= 24]; })()""")
        check('L9 Home Settings: Edit Bar and Tint buttons sit at the right of their label; Only Me starts next to its tile', hm == [True, True, True], hm)

        # ---- the main Settings page ----
        pg.goto(s.base + '/web/settings/#nav'); wait_js(pg, "!!document.querySelector('#ix-pgl .ix-pgr')", 20000)
        sf = lambda: pg.evaluate("(() => { const f = document.getElementById('ix-sf'), b = document.getElementById('ix-save'); return [!f.hidden && !!f.offsetParent, b.disabled]; })()")
        check('L10 Tabs: the Save Settings bar is there from the start, greyed out', sf() == [True, True], sf())
        sw = pg.evaluate("[...document.querySelectorAll('#ix-pgl [data-k=show]')].map(c => c.classList.contains('ix-sw') && Math.round(c.getBoundingClientRect().width))")
        check('L11 Tabs: Show is a switch on every row', len(sw) >= 7 and all(w == 44 for w in sw), sw)
        pg.fill('#ix-pgl input[type=text] >> nth=1', 'My Links')
        check('L12 ...renaming a tab turns Save Settings on', until(lambda: sf() == [True, False], 4000), sf())
        pg.click('#ix-discard'); until(lambda: sf()[1], 4000)
        pg.click('#ix-pgl .ix-pgr >> nth=2 >> [data-k=up]')
        check('L13 ...so does moving a tab with the arrows', until(lambda: sf() == [True, False], 4000), sf())
        pg.click('#ix-discard'); until(lambda: sf()[1], 4000)
        pg.click('#ix-pgl .ix-pgr >> nth=3 >> [data-k=show]')
        check('L14 ...and hiding a tab', until(lambda: sf() == [True, False], 4000), sf())
        pg.click('#ix-discard')
        pg.goto(s.base + '/web/settings/#security'); wait_js(pg, "!!document.querySelector('#ix-sf')", 20000)
        check('L15 a tab that saves at once (Security) has no Save bar', until(lambda: pg.evaluate("document.getElementById('ix-sf').hidden"), 4000))
        tiles = pg.evaluate("(() => { const t = [...document.querySelectorAll('#ix-stiles .ix-tile b')].map(b => b.textContent); return t; })()") if until(lambda: pg.evaluate("document.querySelectorAll('#ix-stiles .ix-tile').length > 4"), 15000) else []
        check('L16 Security Overview: a Passkeys card, and the password card says just "Password"', 'Passkeys' in tiles and 'Password' in tiles and 'Website Password' not in tiles, tiles)
        check('L17 no backup reminder pops up on the Settings page', 'Backup reminder' not in (pg.evaluate("(document.getElementById('ix-toast') || {}).textContent || ''") or ''))

        pg.goto(s.base + '/web/settings/#health'); until(lambda: pg.evaluate("document.querySelectorAll('.ix-hcards.six .ix-hc').length") == 6, 20000)
        hc = pg.evaluate("[...new Set([...document.querySelectorAll('.ix-hcards.six .ix-hc')].map(c => Math.round(c.getBoundingClientRect().top)))].length")
        free = pg.evaluate("[...document.querySelectorAll('.ix-hc')].map(c => c.textContent).find(t => /free on the server/.test(t)) || ''")
        import re
        big = re.search(r'([\d.]+) MB free', free)
        check('L18 Health: the six cards are two rows of three, and free space over 1 GB is shown in GB', hc == 2 and not (big and float(big.group(1)) >= 1024), (hc, free))

        widths = {}
        for sec in ('general', 'look', 'backup', 'updates', 'security'):
            pg.goto(s.base + '/web/settings/#' + sec); wait_js(pg, "!!document.querySelector('#ix-pc') && document.querySelector('#ix-pc').children.length > 0", 20000); pg.wait_for_timeout(500)
            widths[sec] = pg.evaluate("Math.max(...[...document.querySelectorAll('#ix-pc > *')].filter(e => !e.classList.contains('ix-tabbar') && e.offsetParent).map(e => Math.round(e.getBoundingClientRect().width)))")
        check('L19 every section stops at the same width (780 px)', all(w <= 781 for w in widths.values()), widths)
        pg.goto(s.base + '/web/settings/#colors'); wait_js(pg, "!!document.querySelector('#ix-pc .ix-seg')", 20000)
        gap = pg.evaluate("(() => { const s = document.querySelector('#ix-pc .ix-row .ix-seg'), b = [...document.querySelectorAll('#ix-pc .ix-row button')].find(x => /^Reset/.test(x.textContent)); return Math.round(b.getBoundingClientRect().left - s.getBoundingClientRect().right); })()")
        check('L20 Colors: Reset sits next to the Dark/Light choice', 0 <= gap <= 30, gap)

        # ---- Files: the grid ----
        pg.goto(s.base + '/web/files/'); wait_js(pg, "window.__files && __files.state().started", 20000)
        pg.set_input_files('#pick', [{'name': 'red.png', 'mimeType': 'image/png', 'buffer': png((220, 40, 40))}])
        why = browser_unlock(pg, PP, keep=True); check('L21 the first upload opens Files with the passphrase', not why, why)
        until(lambda: 'red.png' in pg.inner_text('#list'), 20000)
        pg.set_input_files('#pick', [{'name': 'blue.png', 'mimeType': 'image/png', 'buffer': png((40, 80, 220))}, {'name': 'notes.txt', 'mimeType': 'text/plain', 'buffer': b'hello'}])
        until(lambda: 'notes.txt' in pg.inner_text('#list'), 20000)
        pg.click('#vsw [data-v=grid]')
        ok = until(lambda: pg.evaluate("document.querySelectorAll('#list .row .ico img.th').length") == 2, 20000)
        check('L22 Grid: both pictures show as small previews; the text file keeps its icon', ok and pg.evaluate("!document.querySelector('#list .row .nm[title=\"notes.txt\"] img')"),
              pg.evaluate("document.querySelectorAll('#list .row .ico img.th').length"))
        pg.click('#list .row .nm[title="red.png"]')
        hs = pg.evaluate("[...document.querySelectorAll('#list .row')].map(r => [r.classList.contains('sel'), Math.round(r.getBoundingClientRect().height)])")
        check('L23 Grid: a picked tile keeps the same size as the others (a style meant for the Sort list squashed it)', len({h for _, h in hs}) == 1 and any(s_ for s_, _ in hs), hs)
        check('L24 the details panel shows the picture too', until(lambda: pg.evaluate("!!document.querySelector('#det .pv img.th')"), 10000))

        # ---- 1.61.9: every page window in the shared frame, one button shape, Undo ----
        frames = {}
        for page, ids in (('links', ['linkDlg', 'nameDlg', 'colorDlg', 'textDlg', 'iconDlg', 'tabDlg', 'keyDlg', 'verDlg']), ('info', ['bkdlg', 'uldlg', 'kdlg', 'etdlg', 'bxdlg', 'idlg']),
                          ('cards', ['dlg', 'hdlg', 'idlg', 'odlg', 'bdlg']), ('tasks', ['dlg', 'ydlg'])):
            pg.goto(s.base + '/web/%s/' % page); wait_js(pg, "!!(window.HUB && HUB.isAdmin())", 20000); pg.wait_for_timeout(300)
            frames[page] = pg.evaluate("""ids => ids.filter(id => { const d = document.getElementById(id); if (!d) return true;
                const sf = d.querySelector('.ix-sf, .df'); return !(d.classList.contains('ix-sdlg') && d.querySelector('.ix-sh .ix-sx, .dh [data-close]') && sf); })""", ids)
        check('L28 every window on Links, Info, Cards and Tasks has the shared frame (title and X, buttons at the bottom)', not any(frames.values()), frames)
        pg.goto(s.base + '/web/links/'); wait_js(pg, "!!(window.HUB && HUB.isAdmin()) && document.querySelectorAll('.cat').length > 0", 20000)
        pg.evaluate("document.getElementById('linkDlg').showModal()"); pg.wait_for_timeout(200)
        lk = pg.evaluate("""(() => { const d = document.getElementById('linkDlg'), b = [...d.querySelectorAll('.ix-sf button')].filter(x => x.offsetParent).sort((x, y) => x.getBoundingClientRect().left - y.getBoundingClientRect().left);   // as they show, left to right
            return [document.activeElement && document.activeElement.tagName !== 'BUTTON', b.map(x => x.textContent.trim()), getComputedStyle(b[0]).borderRadius]; })()""")
        check('L29 Add Link opens with a field ready to type in (not the X); Cancel then Save Link; round 12 px buttons', lk[0] and lk[1][-1] == 'Save Link' and lk[1][0] == 'Cancel' and lk[2] == '12px', lk)
        pg.keyboard.press('Escape')
        pg.evaluate("document.getElementById('tabDlg').showModal()")
        sw_h = pg.evaluate("Math.round(document.querySelector('#tabDlg .swatch').getBoundingClientRect().height)")
        check('L30 Edit Tab: the colour and its code stay on one line', sw_h < 60, sw_h)
        pg.keyboard.press('Escape')
        shapes = {}
        for page in ('links', 'cards', 'tasks', 'files'):
            pg.goto(s.base + '/web/%s/' % page); wait_js(pg, "!!(window.HUB && HUB.isAdmin())", 20000); pg.wait_for_timeout(500)
            shapes[page] = pg.evaluate("[...new Set([...document.querySelectorAll('.btn')].filter(b => b.offsetParent).map(b => getComputedStyle(b).borderRadius))]")
        check('L31 one button shape on Links, Cards, Tasks and Files (12 px corners)', all(v == ['12px'] for v in shapes.values() if v), shapes)

        pg.on('dialog', lambda d: d.accept())
        pg.goto(s.base + '/web/links/'); wait_js(pg, "!!(window.HUB && HUB.isAdmin()) && !!document.querySelector('[aria-label=\"Delete link\"]')", 20000)
        titles = lambda: pg.evaluate("[...document.querySelectorAll('.cat a')].map(a => a.textContent.trim()).filter(Boolean)")
        before = titles()
        pg.evaluate("document.querySelector('[aria-label=\"Delete link\"]').click()")
        got = until(lambda: pg.evaluate("(() => { const t = document.getElementById('ix-toast'); return !!(t && t.classList.contains('on') && t.querySelector('.ix-tact')); })()"), 5000)
        gone = len(titles()) == len(before) - 1
        pg.wait_for_timeout(800); pg.click('#ix-toast .ix-tact')
        until(lambda: len(titles()) == len(before), 5000); pg.wait_for_timeout(1500)
        pg.reload(); wait_js(pg, "document.querySelectorAll('.cat a').length > 0", 20000)
        check('L32 Links: a deleted link offers Undo, and Undo puts it back and saves it (still there after a reload)', got and gone and titles() == before, (got, gone, before, titles()))

        pg.goto(s.base + '/web/cards/'); pg.wait_for_selector('#list .row.item', timeout=15000)
        rows = lambda: pg.evaluate("document.querySelectorAll('#list .row.item').length")
        n0 = rows(); pg.click('#list .row.item[data-id] .cn small'); until(lambda: pg.evaluate("document.getElementById('dlg').open"), 5000)
        pg.click('#del'); pg.click('#del'); until(lambda: rows() == n0 - 1, 5000)
        got = until(lambda: pg.evaluate("!!document.querySelector('#ix-toast.on .ix-tact')"), 5000)
        pg.wait_for_timeout(800); pg.click('#ix-toast .ix-tact'); until(lambda: rows() == n0, 5000); pg.wait_for_timeout(1500)
        pg.reload(); pg.wait_for_selector('#list .row.item', timeout=15000)
        check('L33 Cards: a deleted card offers Undo, and Undo brings it back for good', got and rows() == n0, (got, n0, rows()))

        # ---- phones: nothing wider than the screen ----
        ph = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=BROWSER != 'firefox', has_touch=True, storage_state=ctx.storage_state())
        q = ph.new_page(); q.on('pageerror', lambda e: errs.append('phone: ' + str(e)[:200]))
        q.goto(s.base + '/web/files/'); wait_js(q, "window.__files && __files.state().started", 20000)
        q.evaluate("(() => { const b = document.querySelector('#lock button'); if (b) b.click(); })()"); browser_unlock(q, PP, keep=True)
        until(lambda: 'red.png' in q.inner_text('#list'), 15000)
        q.locator('#list .row .nm[title="red.png"]').click(); q.wait_for_selector('#det:not([hidden])')
        fp = q.evaluate("[document.documentElement.scrollWidth - innerWidth, Math.round(document.getElementById('det').getBoundingClientRect().height), getComputedStyle(document.getElementById('det')).overflowY]")
        check('L25 phone, Files: nothing wider than the screen; the details sheet takes at most half the screen and scrolls inside', fp[0] <= 0 and fp[1] <= 844 // 2 + 2 and fp[2] == 'auto', fp)
        wide = []
        for sec in ('overview', 'general', 'nav', 'look', 'themes', 'colors', 'security', 'telegram', 'backup', 'health', 'domains', 'check', 'updates', 'files', 'changelog'):
            q.goto(s.base + '/web/settings/#' + sec); wait_js(q, "!!document.querySelector('#ix-pc') && document.querySelector('#ix-pc').children.length > 0", 20000); q.wait_for_timeout(300)
            r = q.evaluate("[document.documentElement.scrollWidth - innerWidth, Math.max(0, ...[...document.querySelectorAll('.ix-subt button')].map(b => Math.round(b.getBoundingClientRect().right)))]")
            if r[0] > 0 or r[1] > 390:   # name what sticks out, so a failure in Firefox or WebKit (CI only) says where to look
                r.append(q.evaluate("[...document.querySelectorAll('body *')].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.right > innerWidth + 0.5; }).map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + '.' + String(e.className).trim().split(/\\s+/).slice(0, 2).join('.') + ' ' + Math.round(e.getBoundingClientRect().left) + '-' + Math.round(e.getBoundingClientRect().right)).slice(0, 5)"))
                wide.append((sec, r))
        check('L26 phone, Settings: no section is wider than the screen, and every sub-tab is in view (they wrap)', not wide, wide)
        check('L27 no page error', not errs, errs)
        b.close()
finally:
    stop_all()
sys.exit(check.done())
