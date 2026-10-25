#!/usr/bin/env python3
"""Links > Import Bookmarks in a real browser: the dialog, the preview numbers, the result, the data Links saved, that
nothing from a hostile file runs or appears as markup, undo through Earlier Versions, the limits, and axe on the dialog.
    python3 tests/browser/import_test.py build/site-update-X.Y.Z.zip [--browser chromium|firefox|webkit]
Needs PHP 8.3+, Playwright and axe-core (npm ci). Fixtures are in tests/bookmarks/. Port 8850."""
import json, os, re, sys, tempfile

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import ROOT, FIX, SEED
from helpers import PW, HERE, Site, Checks, stop_all, browser_name, launch, browser_login, wait_js, CSP_REPORTER
from playwright.sync_api import sync_playwright

BROWSER = browser_name()
if len(sys.argv) < 2: sys.exit(__doc__)
ZIP = sys.argv[1]
FX = os.path.join(FIX, 'bookmarks')
AXE = open(os.path.join(ROOT, 'node_modules', 'axe-core', 'axe.min.js'), encoding='utf-8').read()
AXE_RUN = "async()=>{const r=await axe.run(document.querySelector('#impDlg'),{resultTypes:['violations'],runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return r.violations.map(v=>v.id+' x'+v.nodes.length+' '+v.nodes[0].target.join(' ')+' '+JSON.stringify(((v.nodes[0].any||[])[0]||{}).data||{}).slice(0,260))}"
check = Checks()
TMP = tempfile.mkdtemp(prefix='hub-import-')


def links_data(s):
    j = s.req(s.base + '/web/links/api.php?action=get')
    return j.get('data', {})


def tab_named(d, name): return next((t for t in d.get('tabs', []) if t.get('title') == name), None)
def cats(t): return {c['title']: [(l['title'], l['url']) for l in c['links']] for c in t['categories']}


try:
    s = Site(ZIP, 8850)
    # Links starts with one tab holding one link, so "already there" can be checked
    s.php("""hub_write_guarded(hub_dir('links') . '/bookmarks.php', ['settings' => [], 'tabs' => [
      ['id' => 'daily', 'title' => 'Daily', 'categories' => [['id' => 'c1', 'title' => 'Dupes', 'col' => 0, 'links' => [['title' => 'Already', 'url' => 'https://already.example.com/']]]]]]]);""")
    with sync_playwright() as p:
        b = launch(p, BROWSER); print('browser: %s %s' % (BROWSER, b.version))
        ctx = b.new_context(user_agent='ImportTest/1.0', viewport={'width': 1280, 'height': 900})
        ctx.add_init_script(CSP_REPORTER)
        ctx.route('**/*', lambda r: r.continue_() if r.request.url.startswith(s.host) or r.request.url.startswith(('data:', 'blob:')) else r.abort())
        pg = ctx.new_page()
        errs, refused, loads = [], [], []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.on('console', lambda m: refused.append(m.text[:200]) if m.type == 'error' and 'Refused' in m.text else None)
        pg.on('request', lambda r: loads.append(r.url) if 'links-import' in r.url else None)
        why = browser_login(pg, s.base)
        check('I0 the browser logs in', why == '', why)
        pg.goto(s.base + '/web/links/', wait_until='domcontentloaded'); wait_js(pg, "!!(window.HUB && HUB.isAdmin && HUB.isAdmin()) && !!document.querySelector('#importBmBtn') && document.querySelectorAll('[data-hub=item]').length > 0", 15000)
        pg.wait_for_timeout(500)   # on purpose: I1 checks the importer is NOT fetched, so give the page time it could have used
        check('I1 Links does not load the importer until it is used', not loads, loads)
        items = pg.evaluate("[...document.querySelectorAll('[data-hub=item]')].map(e => e.getAttribute('data-hub-label'))")
        check('I2 Import Bookmarks is in the Links menu, right after Fetch Icons', 'Import Bookmarks' in items and items.index('Fetch Icons') + 1 == items.index('Import Bookmarks'), items)

        def open_dlg():
            pg.evaluate("document.querySelector('#importBmBtn').click()")
            pg.wait_for_selector('#impDlg[open]', timeout=10000)

        def choose(name):
            pg.set_input_files('#impFile', os.path.join(FX, name) if not os.path.isabs(name) else name)
            wait_js(pg, "document.querySelector('#impPrev').textContent || document.querySelector('#impErr').textContent", 10000)
            return pg.inner_text('#impPrev'), pg.inner_text('#impErr')

        def go():
            pg.click('#impGo')
            wait_js(pg, "!document.querySelector('#impDone').hidden || document.querySelector('#impErr').textContent", 20000)
            return pg.inner_text('#impDone'), pg.inner_text('#impErr')

        def close(): pg.evaluate("document.querySelector('#impDlg').close()")

        # ----- Chrome export into a new tab -----
        open_dlg()
        check('I3 the importer is loaded once, on first use', len(loads) == 1, loads)
        check('I4 the dialog opens with focus on the file field', pg.evaluate("document.activeElement && document.activeElement.id") == 'impFile')
        pv, er = choose('chrome.html')
        check('I5 Chrome: the preview counts 6 links in 4 categories from 4 folders and names the skipped address', 'Found 6 links in 4 categories (from 4 folders)' in pv and '1 address that is not a web link' in pv and not er, (pv, er))
        check('I6 the preview shows which folder becomes which category', 'Bookmarks bar / Work / Projects → Work / Projects' in pv and 'Other bookmarks' in pv, pv)
        check('I7 the default target is a new tab named "Imported" and the date', pg.is_checked('#impToNew') and pg.input_value('#impName').startswith('Imported '))
        pg.fill('#impName', 'From Chrome')
        done, er = go()
        check('I8 the result says what happened', re.search(r'6 links added to From Chrome\. 0 were already there\. 1 was skipped\.', done) and 'Fetch Icons' in done and 'Earlier Versions' in done, (done, er))
        d = links_data(s); t = tab_named(d, 'From Chrome')
        want = {'Bookmarks bar': [('Example News', 'https://news.example.com/')], 'Work': [('Mail', 'https://mail.example.com/'), ('Calendar', 'https://calendar.example.com/week')],
                'Work / Projects': [('Team Repo', 'https://git.example.com/team/repo')], 'Other bookmarks': [('Recipes', 'https://recipes.example.org/'), ('Old FTP', 'ftp://files.example.org/pub/')]}
        check('I9 Links saved exactly those links in those categories (no icons, no extra fields)', t and cats(t) == want and all(set(l) == {'title', 'url'} for c in t['categories'] for l in c['links']), t and cats(t))
        check('I10 the new tab is not private (nobody asked)', t and not t.get('private'), t and t.get('private'))
        check('I11 the page shows the new tab', pg.evaluate("location.hash.slice(1)") == (t or {}).get('id') and 'Team Repo' in pg.inner_text('#grid'))
        close()

        # undo: Backup & Restore > Earlier Versions holds the version kept just before
        ov = s.get('backup_overview'); vers = [v for v in ov.get('versions', []) if v['app'] == 'links']
        r = s.post('version_restore', {'app': 'links', 'id': vers[0]['id']}) if vers else {}
        d = links_data(s)
        check('I12 Earlier Versions undoes the import (the version was kept right before it)', vers and r.get('ok') and tab_named(d, 'From Chrome') is None and tab_named(d, 'Daily'), (vers[:2], r))
        pg.reload(wait_until='domcontentloaded'); wait_js(pg, "!!(window.HUB && HUB.isAdmin && HUB.isAdmin()) && !!document.querySelector('#importBmBtn') && document.querySelectorAll('[data-hub=item]').length > 0", 15000)

        # ----- Firefox export into the existing tab, made private -----
        open_dlg(); pv, er = choose('firefox.html')
        check('I13 Firefox: 3 links (the folder description and place: are handled), loose links go into a category named after the import', 'Found 3 links' in pv and '(Top of the File) → Imported' in pv and '1 address that is not a web link' in pv, pv)
        pg.check('#impToTab'); pg.select_option('#impTab', 'daily')
        done, er = go()
        d = links_data(s); t = tab_named(d, 'Daily'); c = cats(t)
        check('I14 into an existing tab: its own links stay, new categories are added', c.get('Dupes') == [('Already', 'https://already.example.com/')] and c.get('Bookmarks Toolbar') == [('On the Toolbar', 'https://toolbar.example.com/')] and 'Firefox Help' in c, c)
        close()

        # ----- Safari, private new tab -----
        open_dlg(); pv, er = choose('safari.html')
        check('I15 Safari: top folders without an outer list are read; nested folder becomes "Travel / Hotels"', 'Found 4 links' in pv and 'Travel / Hotels' in pv, pv)
        pg.fill('#impName', 'From Safari'); pg.check('#impPrivate'); done, er = go()
        t = tab_named(links_data(s), 'From Safari')
        check('I16 "Make the New Tab Private" makes it private', t and t.get('private') is True and cats(t).get('Travel / Hotels') == [('Lake House', 'https://stay.example.com/lake')], t)
        pub = s.client('visitor/1.0').req(s.base + '/web/links/api.php?action=get')
        check('I17 a visitor does not receive the private tab', not any(x.get('title') == 'From Safari' for x in pub.get('data', {}).get('tabs', [])))
        close()

        # ----- duplicates against the file and the target tab -----
        open_dlg(); pv, er = choose('duplicates.html')
        check('I18 duplicates in the file (host case, slash at the end, #part) are counted; one is already in Links', 'Found 4 links' in pv and '2 links listed twice' in pv and '1 link is already in Links' in pv, pv)
        pg.check('#impToTab'); pg.select_option('#impTab', 'daily'); done, er = go()
        c = cats(tab_named(links_data(s), 'Daily'))
        check('I19 the link already in the tab is not added again; http and a ?query are different addresses', re.search(r'3 links added to Daily\. 1 was already there\. 2 were skipped\.', done) and sorted(u for _, u in c['Dupes']) == ['http://example.com/page', 'https://already.example.com/', 'https://example.com/page/', 'https://example.com/page?x=1'], (done, c.get('Dupes')))
        close()

        # ----- deep nesting -----
        open_dlg(); pv, er = choose('deep.html'); pg.fill('#impName', 'Deep'); go()
        c = cats(tab_named(links_data(s), 'Deep'))
        check('I20 12 levels deep: 12 categories, the long ones keep their end ("… / Level 11 / Level 12")', len(c) == 12 and any(k.startswith('… /') and k.endswith('Level 12') for k in c) and all(len(k) <= 80 for k in c), list(c)[-3:])
        close()

        # ----- hostile file -----
        open_dlg(); pv, er = choose('hostile.html')
        check('I21 hostile file: 4 addresses that are not web links are skipped (javascript:, data:, file:, about:)', 'Found 8 links' in pv and '4 addresses that are not web links' in pv, pv)
        check('I22 a folder name with markup shows as text in the preview', 'Evil <b>Folder</b>' in pv and pg.evaluate("document.querySelectorAll('#impPrev b, #impPrev img, #impPrev script').length") == 0, pv[:200])
        pg.fill('#impName', 'Hostile'); done, er = go()
        t = tab_named(links_data(s), 'Hostile'); ls = [l for c in t['categories'] for l in c['links']]
        titles = [l['title'] for l in ls]
        check('I23 only the 8 web links were saved, all http(s)', len(ls) == 8 and all(l['url'].startswith('https://safe.example.com/') for l in ls), [l['url'] for l in ls])
        check('I24 titles are kept as plain text (markup shown, never run)', "<script>window.__pwned='title'</script>" in titles and any(x.startswith('<img src=x onerror=') for x in titles), titles[:3])
        check('I25 control characters, the null byte and direction overrides are gone; a huge title is cut to 200; an empty one uses the host', all(not re.search(r'[\x00-\x1f\u202e\ufffd]', x) for x in titles) and max(map(len, titles)) == 200 and 'safe.example.com' in titles, [len(x) for x in titles])
        pg.wait_for_timeout(500)   # on purpose: I26 checks nothing from the file ran, so give a planted onerror time to fire
        markup = pg.evaluate("document.querySelectorAll('#grid img[src=\"x\"], #grid script, #grid b').length")
        check('I26 nothing from the file ran or became markup on the page', pg.evaluate("window.__pwned === undefined") and markup == 0 and not errs, (pg.evaluate("window.__pwned"), markup, errs))
        close()

        # ----- files that are refused -----
        open_dlg()
        _, er = choose('empty.html'); check('I27 an empty file: a plain message', 'empty' in er, er)
        _, er = choose('not-bookmarks.html'); check('I28 a web page that is not bookmarks: a plain message', 'not a bookmarks export' in er, er)
        _, er = choose(os.path.join(FIX, 'fixture-image.png')); check('I29 a file that is not HTML (a PNG): a plain message, no script error', 'not a bookmarks export' in er and not errs, (er, errs))
        many = os.path.join(TMP, 'many.html')
        open(many, 'w').write('<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<DL><p>\n<DT><H3>Many</H3>\n<DL><p>\n' + ''.join('<DT><A HREF="https://m.example.com/%d">Link %d</A>\n' % (i, i) for i in range(5001)) + '</DL><p>\n</DL><p>\n')
        _, er = choose(many); check('I30 more than 5,000 links: refused with a plain message', '5001 links' in er and '5000' in er, er)
        big = os.path.join(TMP, 'big.html'); open(big, 'w').write('<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<DL>' + 'x' * (5 * 1048576 + 10) + '</DL>')
        _, er = choose(big); check('I31 a file over 5 MB: refused with a plain message', '5 MB' in er, er)
        check('I32 the Import button stays off for a refused file', pg.is_disabled('#impGo'))
        close()

        # ----- 3,000 links: a big but allowed import, timed -----
        k3 = os.path.join(TMP, 'k3.html')
        open(k3, 'w').write('<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<DL><p>\n' + ''.join('<DT><H3>Folder %d</H3>\n<DL><p>\n' % f + ''.join('<DT><A HREF="https://k.example.com/%d/%d">Bookmark %d-%d</A>\n' % (f, i, f, i) for i in range(100)) + '</DL><p>\n' for f in range(30)) + '</DL><p>\n')
        open_dlg(); pv, er = choose(k3)
        check('I33 3,000 links in 30 folders: the preview reads them', 'Found 3000 links in 30 categories' in pv, pv[:120])
        pg.check('#impToTab'); pg.select_option('#impTab', 'daily'); done, er = go()
        n = sum(len(c['links']) for c in tab_named(links_data(s), 'Daily')['categories'])
        check('I34 ...and they are saved', '3000 links added' in done and n >= 3000, (done, er, n))
        close()

        # ----- six tabs: the new-tab choice is off, existing tabs offered -----
        s.php("""$d = hub_read_guarded(hub_dir('links') . '/bookmarks.php'); $d['tabs'][] = ['id' => 'locked1', 'title' => 'Locked Tab', 'private' => true, 'enc' => 'enc1:' . base64_encode(random_bytes(64)), 'categories' => []]; while (count($d['tabs']) < 6) $d['tabs'][] = ['id' => 'x' . count($d['tabs']), 'title' => 'Extra ' . count($d['tabs']), 'categories' => []]; hub_write_guarded(hub_dir('links') . '/bookmarks.php', $d);""")
        pg.reload(wait_until='domcontentloaded'); wait_js(pg, "!!(window.HUB && HUB.isAdmin && HUB.isAdmin()) && !!document.querySelector('#importBmBtn') && document.querySelectorAll('[data-hub=item]').length > 0", 15000)
        open_dlg()
        check('I35 with 6 tabs (the most Links holds) the new-tab choice is off and says why', pg.is_disabled('#impToNew') and pg.is_checked('#impToTab') and '6 tabs' in pg.inner_text('#impTabNote'))
        opts = pg.evaluate("[...document.querySelectorAll('#impTab option')].map(o => o.value)")
        check('I35b an encrypted tab is never offered as a target', 'locked1' not in opts and 'daily' in opts, opts)
        choose('chrome.html')
        pg.mouse.move(2, 2)   # a hovered button is slightly lighter: axe must see the resting colours
        pg.wait_for_timeout(200)   # on purpose: the hover colour fades out (a CSS transition) before axe reads the colours
        pg.evaluate(AXE)
        viol = pg.evaluate(AXE_RUN)
        check('I36 axe (WCAG 2.1 A and AA) finds nothing in the open dialog with a preview', not viol, viol)
        close()
        check('I37 no page error and nothing refused by the security policy during all of this', not errs and not refused, (errs, refused))
        b.close()
finally:
    stop_all()
sys.exit(check.done())
