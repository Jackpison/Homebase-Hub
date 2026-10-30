#!/usr/bin/env python3
"""The Settings windows and screens of 1.61.0 in a real browser: choices as buttons (and the keyboard on them), switches, one window
frame with a close X, "Only Me" on every page (a visitor of a private Home gets a log-in screen and nothing else; Cards, Tasks and Files
show it locked on), the shorter Colors tab, the four Backup tabs (Files off by default, one big Download Backup), and Export Bookmarks
(the standard bookmark file, made in the browser, with and without private tabs, and read back by Links' own importer).
    python3 tests/browser/settings_ui_test.py build/site-update-X.Y.Z.zip [--browser chromium|firefox|webkit]   (port 8981)"""
import json, os, re, subprocess, sys, tempfile, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import ROOT, FIX, SEED
from helpers import Site, Checks, stop_all, browser_login, wait_js, browser_name, launch, until, CSP_REPORTER
from playwright.sync_api import sync_playwright

if len(sys.argv) < 2: sys.exit(__doc__)
BROWSER = browser_name(); ZIP = sys.argv[1]; check = Checks()
TMP = tempfile.mkdtemp(prefix='hub-settings-ui-')


def visitor(url, headers=False):
    """What a person who is not logged in is sent (no cookies)."""
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'visitor/1.0'}), timeout=30) as r: return (r.status, r.read().decode('utf-8', 'replace')) + ((dict(r.headers),) if headers else ())
    except urllib.error.HTTPError as e: return (e.code, e.read().decode('utf-8', 'replace')) + ((dict(e.headers),) if headers else ())


try:
    s = Site(ZIP, 8981)
    subprocess.run(['php', SEED, s.dir], capture_output=True)
    s.php("""hub_write_guarded(hub_dir('links') . '/bookmarks.php', ['settings' => new stdClass, 'tabs' => [
        ['id' => 't1', 'title' => 'Daily', 'categories' => [['id' => 'c1', 'title' => 'News & Mail', 'col' => 0, 'links' => [
            ['id' => 'l1', 'title' => 'Public "Daily" Link', 'url' => 'https://example.com/daily?a=1&b=2'], ['id' => 'l1b', 'title' => 'Mail', 'url' => 'https://mail.example.com/']]]]],
        ['id' => 't2', 'title' => 'Secret', 'private' => true, 'categories' => [['id' => 'c2', 'title' => 'Money', 'col' => 0, 'links' => [['id' => 'l2', 'title' => 'Hidden Bank Login', 'url' => 'https://bank.example.com/login']]]]]]]);""")

    with sync_playwright() as p:
        b = launch(p, BROWSER); print('browser: %s %s' % (BROWSER, b.version))
        ctx = b.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True); ctx.add_init_script(CSP_REPORTER)
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        why = browser_login(pg, s.base); check('U0 logged in', not why, why)

        # ---- choices as buttons, switches, one window frame ----
        pg.goto(s.base + '/web/links/'); wait_js(pg, "document.querySelectorAll('.tab').length > 1", 20000)
        pg.evaluate("document.getElementById('settingsBtn').click()"); pg.wait_for_selector('#setDlg[open]')
        seg = pg.evaluate("(() => { const s = document.getElementById('sEditBar'), g = s.nextElementSibling; return [s.offsetWidth, g.className, g.getAttribute('role'), [...g.children].map(b => b.textContent + ':' + b.getAttribute('aria-checked'))]; })()")
        check('U1 Edit Bar is a row of two buttons (the select is hidden but still the truth)', seg[0] == 0 and seg[1] == 'ix-sgc' and seg[2] == 'radiogroup' and seg[3] == ['Icons Only:true', 'Icons and Text:false'], seg)
        pg.click('#sEditBar + .ix-sgc [data-v=text]')
        check('U2 clicking a button picks it', pg.evaluate("document.getElementById('sEditBar').value") == 'text' and pg.get_attribute('#sEditBar + .ix-sgc [data-v=text]', 'aria-checked') == 'true')
        pg.focus('#sEditBar + .ix-sgc [data-v=text]'); pg.keyboard.press('ArrowLeft')
        check('U3 the arrow keys move the choice', pg.evaluate("document.getElementById('sEditBar').value") == 'icons')
        sw = pg.evaluate("(() => { const c = document.getElementById('sPrivate'), r = c.getBoundingClientRect(); return [c.type, c.classList.contains('ix-sw'), Math.round(r.width), Math.round(r.height)]; })()")
        check('U4 Only Me is an on/off switch over a real checkbox', sw == ['checkbox', True, 44, 26], sw)
        frame = pg.evaluate("(() => { const d = document.getElementById('setDlg'); return [!!d.querySelector('.ix-sh .ix-sx'), getComputedStyle(d.querySelector('.ix-sb')).overflowY, [...d.querySelectorAll('.ix-sf button')].map(x => x.textContent.trim()), d.querySelector('.ix-sh h3,.ix-sh h2').textContent]; })()")
        check('U5 the Settings window has its title and a close X on top, a scrolling body, and Cancel / Save Settings in the footer', frame == [True, 'auto', ['Cancel', 'Save Settings'], 'Links Settings'], frame)
        pg.click('#setDlg .ix-sx'); until(lambda: not pg.evaluate("document.getElementById('setDlg').open"), 5000)
        check('U6 the X closes it', not pg.evaluate("document.getElementById('setDlg').open"))
        check('U6b ...and nothing was saved by closing it (Edit Bar still Icons Only)', not (pg.evaluate("HUB.state().editBar || {}") or {}).get('links'))

        # ---- Export Bookmarks ----
        pg.evaluate("document.querySelector('#importBmBtn').click()"); pg.wait_for_selector('#impDlg[open]', timeout=10000)
        check('U6c Export Bookmarks is in the Import and Export window, not in Links Settings', pg.is_visible('#impExport') and not pg.evaluate("!!document.getElementById('sBmExport')"))
        with pg.expect_download() as dl: pg.click('#impExport')
        f1 = os.path.join(TMP, 'plain.html'); dl.value.save_as(f1); t1 = open(f1, encoding='utf-8').read()
        check('U7 Export Bookmarks gives a standard bookmark file: public tabs only, as folders, with the text safely escaped',
              t1.startswith('<!DOCTYPE NETSCAPE-Bookmark-file-1>') and '<H3 ADD_DATE' in t1 and 'Daily' in t1 and 'News &amp; Mail' in t1 and 'Public &quot;Daily&quot; Link' in t1 and 'a=1&amp;b=2' in t1
              and 'Hidden Bank' not in t1 and 'bank.example.com' not in t1 and dl.value.suggested_filename.endswith('.html'), t1[:400])
        pg.check('#impExPriv')
        with pg.expect_download() as dl: pg.click('#impExport')
        f2 = os.path.join(TMP, 'all.html'); dl.value.save_as(f2); t2 = open(f2, encoding='utf-8').read()
        check('U8 with Include Private Tabs on, the private tab is in the file too', 'Hidden Bank Login' in t2 and 'https://bank.example.com/login' in t2 and 'Secret' in t2)
        # read back by the importer in the same window
        pg.set_input_files('#impFile', f2); wait_js(pg, "document.querySelector('#impPrev').textContent || document.querySelector('#impErr').textContent", 10000)
        pv = pg.inner_text('#impPrev')
        check('U9 Links\' own importer reads the file back: 3 links, the folders as tabs and categories', 'Found 3 links' in pv and 'Daily' in pv and 'Money' in pv, pv)
        pg.fill('#impName', 'Round Trip'); pg.click('#impGo'); wait_js(pg, "!document.querySelector('#impDone').hidden || document.querySelector('#impErr').textContent", 20000)
        d = s.req(s.base + '/web/links/api.php?action=get').get('data', {})
        rt = [t for t in d.get('tabs', []) if t.get('title') == 'Round Trip'][0]
        got = sorted((l['title'], l['url']) for c in rt['categories'] for l in c['links'])
        want = sorted([('Public "Daily" Link', 'https://example.com/daily?a=1&b=2'), ('Mail', 'https://mail.example.com/'), ('Hidden Bank Login', 'https://bank.example.com/login')])
        check('U10 the import holds the same titles and addresses that went out (the importer reads every link)', set(want) <= set(got), (got, want))

        s.php("""hub_write_guarded(hub_dir('links') . '/bookmarks.php', ['settings' => new stdClass, 'tabs' => array_values(array_filter(hub_jread(hub_dir('links') . '/bookmarks.php')['tabs'], fn($t) => $t['title'] !== 'Round Trip'))]);""")   # the imported copy goes again
        # ---- Only Me ----
        pg.goto(s.base + '/web/home/'); wait_js(pg, "!!(window.HUB && HUB.isAdmin()) && !!document.getElementById('editBtn')", 20000); pg.evaluate("document.getElementById('editBtn').click()"); pg.wait_for_selector('#ix-ebar:not([hidden])', timeout=15000)
        code, html = visitor(s.base + '/web/home/')
        check('U11 Home starts public: a visitor sees the page', code == 200 and 'window.PUB' in html and 'This Page Is Private' not in html)
        pg.evaluate("document.querySelector('[data-open=settingsSheet]').click()"); pg.wait_for_selector('#settingsSheet[open]')
        check('U12 Home Settings has an Only Me switch, and calls the title "Page Title"', pg.evaluate("document.getElementById('sPrivate').classList.contains('switch')") and 'Page Title' in pg.inner_text('#settingsSheet'))
        pg.check('#sPrivate'); pg.click('#saveSettings'); until(lambda: not pg.evaluate("document.getElementById('settingsSheet').open"), 10000)
        code, html = visitor(s.base + '/web/home/')
        check('U13 with Only Me on, a visitor is sent a log-in screen and nothing of the page (no photos, no data)', code == 200 and 'This Page Is Private' in html and 'window.PUB' not in html and 'id="bg"' not in html and 'welcome' not in html.lower().replace('welcome-', ''), html[:300])
        pg.reload(); wait_js(pg, "!!(window.HUB && HUB.isAdmin()) && !!document.getElementById('stage')", 20000); pg.evaluate("document.getElementById('editBtn').click()"); pg.wait_for_selector('#ix-ebar:not([hidden])', timeout=15000)
        check('U14 ...and you, logged in, still see your page', pg.evaluate("!!document.getElementById('stage')") and 'This Page Is Private' not in pg.content())
        pg.evaluate("document.querySelector('[data-open=settingsSheet]').click()"); pg.wait_for_selector('#settingsSheet[open]')
        check('U15 Only Me shows as on when you open Home Settings again', pg.is_checked('#sPrivate'))
        pg.uncheck('#sPrivate'); pg.click('#saveSettings'); until(lambda: not pg.evaluate("document.getElementById('settingsSheet').open"), 10000)
        check('U16 turning it off opens the page to visitors again', 'window.PUB' in visitor(s.base + '/web/home/')[1])
        pg.goto(s.base + '/web/cards/'); pg.wait_for_selector('#tdlg', state='attached'); pg.evaluate("document.getElementById('tdlg').showModal()")
        c = pg.evaluate("(() => { const e = document.getElementById('tonlyme'); return [e.checked, e.disabled]; })()")
        pg.goto(s.base + '/web/tasks/'); pg.wait_for_selector('#sdlg', state='attached'); pg.evaluate("document.getElementById('sdlg').showModal()")
        t = pg.evaluate("(() => { const e = document.getElementById('s-onlyme'); return [e.checked, e.disabled]; })()")
        check('U17 Cards and Tasks show Only Me locked on (they are only ever for you)', c == [True, True] and t == [True, True], (c, t))

        # ---- the calendar link ----
        pg.goto(s.base + '/web/tasks/'); wait_js(pg, "!!(window.HUB && HUB.isAdmin()) && !!document.getElementById('psets')", 20000)
        pg.evaluate("document.getElementById('psets').click()"); pg.wait_for_selector('#sdlg[open]')
        check('U17b the calendar link is off by default (no link shown)', not pg.is_checked('#s-calon') and pg.is_hidden('#s-calbox') and visitor(s.base + '/web/tasks/calendar.php?k=' + '0' * 32)[0] == 404)
        pg.check('#s-calon'); wait_js(pg, "document.getElementById('s-calurl').value.includes('calendar.php?k=')", 10000)
        link = pg.input_value('#s-calurl'); code, body, hd = visitor(link, True)
        check('U17c turning it on shows a link that a calendar app can read: text/calendar, with no login', code == 200 and body.startswith('BEGIN:VCALENDAR') and hd.get('Content-Type', '').startswith('text/calendar'), (code, hd.get('Content-Type')))
        check('U17d a wrong key and a missing key are the same plain 404', visitor(link[:-1] + ('0' if link[-1] != '0' else '1'))[0] == 404 and visitor(s.base + '/web/tasks/calendar.php')[0] == 404)
        pg.once('dialog', lambda d: d.accept()); pg.click('#s-calnew'); until(lambda: pg.input_value('#s-calurl') != link, 10000)
        link2 = pg.input_value('#s-calurl')
        check('U17e Make a New Link ends the old link at once', link2 != link and visitor(link)[0] == 404 and visitor(link2)[0] == 200)
        pg.uncheck('#s-calon'); until(lambda: visitor(link2)[0] == 404 and pg.is_hidden('#s-calbox'), 10000)
        check('U17f turning it off ends the link and hides it', visitor(link2)[0] == 404 and pg.is_hidden('#s-calbox'))
        pg.click('#sdlg .dh [data-close]')

        # ---- Colors: shorter ----
        pg.goto(s.base + '/web/settings/#colors'); wait_js(pg, "!!document.querySelector('#ix-pgc')", 20000)
        col = pg.evaluate("(() => { const d = document.getElementById('ix-pgc'); return [d.open, [...document.querySelectorAll('.ix-cr')].filter(e => e.checkVisibility()).length, document.body.innerText.includes('Same Look on Every Page'), !!document.querySelector('[data-sa]')]; })()")
        check('U18 the Colors tab shows 9 rows (the colors and one Accent), with the per-page colors folded away', col == [False, 9, False, True], col)
        pg.click('#ix-pgc summary')
        check('U19 Different Colors per Page holds the page backgrounds and accents', pg.evaluate("document.querySelectorAll('#ix-pgc .ix-cr').length") >= 10)

        # ---- Backup: four tabs ----
        pg.goto(s.base + '/web/settings/#backup'); wait_js(pg, "!!document.querySelector('#ix-exp')", 20000)
        tabs = pg.evaluate("[...document.querySelectorAll('.ix-tabbar button')].map(b => b.textContent)")
        check('U20 Backup & Restore has four tabs', tabs == ['Back Up', 'Restore', 'Export', 'Start Over'], tabs)
        big = pg.evaluate("(() => { const b = document.getElementById('ix-exp'); return [b.offsetHeight >= 48, document.getElementById('ix-choose').open, [...document.querySelectorAll('[data-grp]')].map(x => x.dataset.grp), document.querySelectorAll('[data-part]:checked').length > 0]; })()")
        check('U21 one big Download Backup, and "Choose What to Include" is folded with Pages and Site switches', big[0] and big[1] is False and big[2][:2] == ['pages', 'site'], big)
        pg.click('#ix-choose summary')
        check('U22 the Pages and Site switches are on, Files (when offered) is off', pg.is_checked('[data-grp=pages]') and pg.is_checked('[data-grp=site]') and not pg.evaluate("!!document.querySelector('[data-grp=files]:checked')"))
        pg.uncheck('[data-grp=site]')
        check('U23 turning Site off clears Settings, Telegram and Domain Watch', not pg.evaluate("[...document.querySelectorAll('[data-part=settings],[data-part=telegram],[data-part=watch]')].some(c => c.checked)") and pg.evaluate("document.querySelector('[data-part=links]').checked"))
        pg.check('[data-grp=site]')
        with pg.expect_download() as dl: pg.click('#ix-exp')
        fb = os.path.join(TMP, 'backup.json'); dl.value.save_as(fb); bk = json.load(open(fb))
        check('U24 Download Backup saves a full backup without Files', bk.get('format') == 'site-backup' and {'links', 'info', 'cards', 'tasks', 'settings'} <= set(bk.get('parts', {})) and 'files' not in bk.get('parts', {}), list(bk.get('parts', {})))
        pg.goto(s.base + '/web/settings/#backup/export-data'); wait_js(pg, "!!document.querySelector('[data-export=links]')", 20000)
        check('U25 the old address of the Export tab still opens it', pg.evaluate("document.querySelector('.ix-tabbar [aria-selected=true]').textContent") == 'Export')
        with pg.expect_download() as dl: pg.click('[data-export=links][data-fmt=html]')
        fh = os.path.join(TMP, 'settings.html'); dl.value.save_as(fh); th = open(fh, encoding='utf-8').read()
        check('U26 Export > Bookmarks for Other Browsers saves the bookmark file (public tabs only until Include Private Tabs is on)', 'Public &quot;Daily&quot; Link' in th and 'Hidden Bank' not in th, th[:1200])
        pg.check('#ix-bmpriv')
        with pg.expect_download() as dl: pg.click('[data-export=links][data-fmt=html]')
        fh2 = os.path.join(TMP, 'settings2.html'); dl.value.save_as(fh2)
        check('U27 ...and with Include Private Tabs on, the private tab is there too', 'Hidden Bank Login' in open(fh2, encoding='utf-8').read())
        pg.goto(s.base + '/web/settings/#backup/restore'); wait_js(pg, "!!document.getElementById('ix-vl')", 20000)
        check('U28 Earlier Versions is part of the Restore tab', 'Earlier Versions' in pg.inner_text('.ix-tpane.ix-on') and pg.evaluate("document.querySelector('.ix-tabbar [aria-selected=true]').textContent") == 'Restore')
        # ---- keyboard shortcuts ----
        pg.goto(s.base + '/web/links/'); wait_js(pg, "!!(window.HUB && HUB.isAdmin()) && document.querySelectorAll('.tab').length > 1", 20000)
        pg.keyboard.press('?'); pg.wait_for_selector('#ix-dlg.open')
        kt = pg.inner_text('#ix-dlg')
        check('U30 ? lists the shortcuts: search, going to each page with G, and this page\'s own (Links: 1 to 9)', 'Keyboard Shortcuts' in kt and 'Show this list' in kt and 'Settings' in kt and 'Open that tab' in kt and pg.evaluate("document.querySelectorAll('#ix-dlg .ix-krow').length") >= 10, kt)
        pg.keyboard.press('g'); pg.keyboard.press('i'); pg.wait_for_timeout(400)
        check('U31 with a window open, G then I does nothing', '/web/links/' in pg.url)
        pg.keyboard.press('Escape'); until(lambda: not pg.evaluate("document.getElementById('ix-dlg').classList.contains('open')"), 4000)
        pg.focus('#ix-q'); pg.keyboard.type('gi'); pg.wait_for_timeout(400)
        check('U32 typing in a field never counts as a shortcut', '/web/links/' in pg.url and pg.input_value('#ix-q') == 'gi')
        pg.fill('#ix-q', ''); pg.evaluate("document.activeElement.blur()")
        pg.keyboard.press('g'); pg.wait_for_selector('#ix-chord')
        check('U33 G shows where each letter goes', 'Info' in pg.inner_text('#ix-chord') and 'Tasks' in pg.inner_text('#ix-chord'))
        pg.keyboard.press('i'); pg.wait_for_url('**/web/info/', timeout=10000)
        check('U34 G then I opens Info', '/web/info/' in pg.url)
        wait_js(pg, "!!(window.HUB && HUB.isAdmin()) && !!document.querySelector('[data-hub=toggle]')", 20000)
        pg.keyboard.press('e'); pg.wait_for_selector('#ix-ebar:not([hidden])', timeout=10000)
        check('U35 E starts editing the page (the edit bar comes up)', pg.is_visible('#ix-ebar'))
        pg.goto(s.base + '/web/tasks/'); wait_js(pg, "!!(window.HUB && HUB.isAdmin())", 20000); pg.wait_for_timeout(600)
        pg.keyboard.press('g'); pg.keyboard.press('f'); pg.wait_for_url('**/web/files/', timeout=10000)
        check('U36 on Tasks, G then F goes to Files (it does not search the tasks)', '/web/files/' in pg.url)
        pg.goto(s.base + '/web/tasks/'); wait_js(pg, "!!(window.HUB && HUB.isAdmin())", 20000); pg.wait_for_timeout(600)
        pg.keyboard.press('n'); pg.wait_for_selector('#edlg[open], dialog[open]', timeout=5000)
        check('U37 the page\'s own keys still work (Tasks: N opens a new task)', pg.evaluate("!!document.querySelector('dialog[open]')"))
        check('U29 no page error', not errs, errs)
        b.close()
finally:
    stop_all()
sys.exit(check.done())
