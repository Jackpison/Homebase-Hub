#!/usr/bin/env python3
"""The tabs of Links and Info share one code base (1.63.0, hub/core/assets/tabs.js): drag to reorder (no arrow buttons), the Edit Tab window in the
Settings look, and a tab icon chosen from 16 (saved on the tab, kept by both servers, dropped when it is not one of them).
    python3 tests/browser/tabs_kit_test.py build/site-update-X.Y.Z.zip [--browser chromium|firefox|webkit]   (port 8986)"""
import json, os, subprocess, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import SEED
from helpers import Site, Checks, stop_all, browser_login, wait_js, browser_name, launch, until
from playwright.sync_api import sync_playwright

if len(sys.argv) < 2: sys.exit(__doc__)
BROWSER = browser_name(); ZIP = sys.argv[1]; check = Checks()


def links_tabs(s):
    doc = json.loads(open(s.dir + '/site-data/links/bookmarks.php').read().split('\n', 1)[1])
    return doc['tabs']


def info_tabs(s):
    doc = json.loads(open(s.dir + '/site-data/info/info.php').read().split('\n', 1)[1])
    return doc['tabs']


try:
    s = Site(ZIP, 8986)
    subprocess.run(['php', SEED, s.dir], capture_output=True)
    s.php("""hub_write_guarded(hub_dir('links') . '/bookmarks.php', ['settings' => new stdClass, 'tabs' => [
        ['id' => 'ta', 'title' => 'Alpha', 'categories' => [['id' => 'c1', 'title' => 'One', 'col' => 0, 'links' => [['id' => 'l1', 'title' => 'First', 'url' => 'https://example.com/1']]]]],
        ['id' => 'tb', 'title' => 'Beta', 'categories' => [['id' => 'c2', 'title' => 'Two', 'col' => 0, 'links' => []]]],
        ['id' => 'tc', 'title' => 'Gamma', 'categories' => [['id' => 'c3', 'title' => 'Three', 'col' => 0, 'links' => []]]]]]);""")

    with sync_playwright() as p:
        b = launch(p, BROWSER); print('browser: %s %s' % (BROWSER, b.version))
        ctx = b.new_context(viewport={'width': 1280, 'height': 900})
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        why = browser_login(pg, s.base); check('K0 logged in', not why, why)

        def edit_on():
            pg.evaluate("document.querySelector('[data-hub=toggle]').click()"); pg.wait_for_selector('body.editing', timeout=10000)

        def order(sel):
            return pg.evaluate("sel => [...document.querySelectorAll(sel)].map(x => x.textContent.trim())", sel)

        def drag(sel_from, i_from, i_to):
            """Mouse drag of one tab onto the place of another."""
            boxes = pg.evaluate("sel => [...document.querySelectorAll(sel)].map(x => { const r = x.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })", sel_from)
            a, z = boxes[i_from], boxes[i_to]
            pg.mouse.move(a[0] + a[2] / 3, a[1] + a[3] / 2); pg.mouse.down()
            pg.mouse.move(a[0] + a[2] / 3 + 12, a[1] + a[3] / 2, steps=4)
            pg.mouse.move(z[0] + z[2] * 0.75, z[1] + z[3] / 2, steps=14)
            pg.mouse.up()
            pg.wait_for_timeout(300)

        # ---------------- Links ----------------
        pg.goto(s.base + '/web/links/'); wait_js(pg, "document.querySelectorAll('#tabs .tab').length >= 3", 20000)
        edit_on()
        check('K1 Links: every tab has its pencil, and the arrow buttons are gone', pg.evaluate("document.querySelectorAll('#tabs .tabi .pen').length") == 3
              and pg.evaluate("document.querySelectorAll('#tabs .tab-ctrl, #tabs [aria-label*=\"Move tab\"]').length") == 0)
        pg.evaluate("document.querySelectorAll('#tabs .pen')[0].click()"); pg.wait_for_selector('#hubTabDlg[open]')
        d = pg.evaluate("""(() => { const d = document.getElementById('hubTabDlg'); return { x: !!d.querySelector('.ix-sh .ix-sx'), grp: d.querySelectorAll('.ix-grp').length,
            sw: d.querySelectorAll('input.ix-sw').length, icons: d.querySelectorAll('.hubt-ico').length, lay: !d.querySelector('#htLayBlock').hidden, hc: !d.querySelector('#htHcRow').hidden,
            title: d.querySelector('.ix-sh h3').textContent, del: !d.querySelector('#htDel').hidden }; })()""")
        check('K2 Links: Edit Tab is a Settings-look window (title and X, cards, two switches), with 16 icons and Default; no layout or headline colour', d['x'] and d['grp'] >= 3 and d['sw'] == 2 and d['icons'] == 17 and not d['lay'] and not d['hc'] and d['title'] == 'Edit Tab' and d['del'], d)
        col = pg.evaluate("[document.getElementById('htIcoBtn').getAttribute('aria-expanded'), document.getElementById('htIcons').hidden, getComputedStyle(document.getElementById('htIcons')).display, document.getElementById('htIcoCur').textContent.trim()]")
        check('K2b the Icon row is folded: the 16 icons are hidden when the window opens, and the row says which icon is in use', col == ['false', True, 'none', 'Default'], col)
        pg.click('#htIcoBtn'); opened = pg.evaluate("[document.getElementById('htIcoBtn').getAttribute('aria-expanded'), !document.getElementById('htIcons').hidden, document.querySelector('.hubt-ico[data-i=\"star\"]').offsetParent !== null]")
        pg.click('.hubt-ico[data-i="star"]')
        check('K2c ...pressing the row opens the icons, and choosing one is shown in the row (Star)', opened == ['true', True, True] and pg.evaluate("document.getElementById('htIcoCur').textContent.trim()") == 'Star', opened)
        check('K3 ...the chosen icon is marked', pg.evaluate("document.querySelector('.hubt-ico[data-i=\"star\"]').getAttribute('aria-checked')") == 'true')
        pg.click('#htSave'); until(lambda: links_tabs(s)[0].get('icon') == 'star', 10000)
        check('K4 saving keeps the icon on the tab (on the server) and the tab draws it', links_tabs(s)[0].get('icon') == 'star' and pg.evaluate("!!document.querySelector('#tabs .tabi:first-child svg.ti')"), links_tabs(s)[0])
        pg.evaluate("document.querySelectorAll('#tabs .pen')[0].click()"); pg.wait_for_selector('#hubTabDlg[open]'); pg.click('#htIcoBtn'); pg.click('#htIcoDef'); pg.click('#htSave')
        until(lambda: 'icon' not in links_tabs(s)[0], 10000)
        check('K5 Default takes the icon away again, and the tab goes back to its ribbon', 'icon' not in links_tabs(s)[0] and pg.evaluate("!document.querySelector('#tabs .tabi:first-child svg.ti')"))

        until(lambda: not pg.evaluate("document.getElementById('hubTabDlg').open"), 10000)
        n0 = order('#tabs .tabi .tab')
        drag('#tabs .tabi', 0, 2)
        until(lambda: [t['title'] for t in links_tabs(s)] != ['Alpha', 'Beta', 'Gamma'], 10000)
        got = [t['title'] for t in links_tabs(s)]
        check('K6 Links: dragging the first tab to the end moves it, and the new order is saved', got == ['Beta', 'Gamma', 'Alpha'], (n0, got))
        pg.focus('#tabs .tabi:first-child .tab'); pg.keyboard.press('Alt+ArrowRight')
        until(lambda: [t['title'] for t in links_tabs(s)][0] == 'Gamma', 10000)
        check('K7 Links: from the keyboard, Alt + Right moves the focused tab one place', [t['title'] for t in links_tabs(s)] == ['Gamma', 'Beta', 'Alpha'], [t['title'] for t in links_tabs(s)])
        pg.click('#tabs .tabi:nth-child(2) .tab'); until(lambda: pg.evaluate("document.querySelector('#tabs .tabi:nth-child(2) .tab').classList.contains('active')"), 5000)
        check('K8 a plain click on a tab (not a drag) still opens it', pg.evaluate("document.querySelector('#tabs .tabi:nth-child(2) .tab').classList.contains('active')"))

        # ---------------- Info ----------------
        pg.goto(s.base + '/web/info/'); wait_js(pg, "document.querySelectorAll('#tabs .tab:not(.add)').length >= 2", 20000)
        edit_on()
        names0 = order('#tabs .tabi .tab')
        pg.evaluate("document.querySelectorAll('#tabs .pen')[0].click()"); pg.wait_for_selector('#hubTabDlg[open]')
        d = pg.evaluate("""(() => { const d = document.getElementById('hubTabDlg'); return { x: !!d.querySelector('.ix-sh .ix-sx'), icons: d.querySelectorAll('.hubt-ico').length, lay: !d.querySelector('#htLayBlock').hidden,
            hc: !d.querySelector('#htHcRow').hidden, move: /Move (Left|Right)/.test(d.textContent), title: d.querySelector('.ix-sh h3').textContent, colorLabel: d.querySelector('label[for=htColor]').firstChild.textContent }; })()""")
        check('K9 Info: the same window, with Layout and Box Headline Color (its own), the same 16 icons, and no Move Left / Move Right', d['x'] and d['icons'] == 17 and d['lay'] and d['hc'] and not d['move'] and d['title'] == 'Edit Tab' and d['colorLabel'] == 'Tab Color', d)
        check('K10 ...a tab with no icon chosen is marked Default and draws the document icon', pg.evaluate("document.querySelector('#htIcoDef').getAttribute('aria-checked')") == 'true' and pg.evaluate("!!document.querySelector('#tabs .tabi:first-child svg.ti')"))
        pg.click('#htIcoBtn'); pg.click('.hubt-ico[data-i="globe"]'); pg.click('#htSave')
        until(lambda: info_tabs(s)[0].get('icon') == 'globe', 10000)
        check('K11 Info: the chosen icon is saved on the tab and drawn', info_tabs(s)[0].get('icon') == 'globe' and pg.evaluate("document.querySelector('#tabs .tabi:first-child svg.ti path').getAttribute('d')") != '', info_tabs(s)[0])
        until(lambda: not pg.evaluate("document.getElementById('hubTabDlg').open"), 10000)   # the window closes once the save is answered
        ids0 = [t['id'] for t in info_tabs(s)]
        drag('#tabs .tabi', 0, 1)
        until(lambda: [t['id'] for t in info_tabs(s)] != ids0, 10000)
        ids1 = [t['id'] for t in info_tabs(s)]
        check('K12 Info: dragging a tab moves it, and the order is saved with its icon kept', ids1[:2] == [ids0[1], ids0[0]] and [t for t in info_tabs(s) if t['id'] == ids0[0]][0].get('icon') == 'globe', (ids0, ids1))
        pg.focus('#tabs .tabi:first-child .tab'); pg.keyboard.press('Alt+ArrowRight')
        until(lambda: [t['id'] for t in info_tabs(s)] == ids0 or [t['id'] for t in info_tabs(s)][0] != ids1[0], 10000)
        check('K13 Info: Alt + Right moves the focused tab one place too', [t['id'] for t in info_tabs(s)][0] != ids1[0], [t['id'] for t in info_tabs(s)])

        # ---------------- both servers drop an icon that is not one of the 16 ----------------
        def call_info(body):
            return s.req(s.site_base + '/web/info/api.php', data=json.dumps(body).encode(), method='POST', hdr={'Content-Type': 'application/json', 'X-Hub-CSRF': s.csrf})
        cur = s.req(s.site_base + '/web/info/api.php?ih=1')
        lst = [{'id': t['id'], 'name': t['name'], 'color': t['color'], 'icon': ('<script>' if k == 0 else 'rocket' if k == 1 else t.get('icon', ''))} for k, t in enumerate(cur['tabs'])]
        r = call_info({'action': 'save_tabs', 'tabs': lst, 'rev': cur['rev']})
        got = [t.get('icon', '') for t in r['data']['tabs']] if r.get('ok') else r
        check('K14 Info: an icon that is not one of the 16 (markup, an unknown name) is dropped by the server', r.get('ok') and got[0] == '' and got[1] == '', got)
        r2 = call_info({'action': 'save_tabs', 'tabs': [{'id': t['id'], 'name': t['name']} for t in r['data']['tabs']], 'rev': r['data']['rev']})
        check('K15 ...and a request that does not send an icon keeps the one the tab has', r2.get('ok') and [t.get('icon', '') for t in r2['data']['tabs']] == got, r2)
        lk = s.req(s.site_base + '/web/links/api.php?action=get')
        data = lk['data']; data['tabs'][0]['icon'] = 'rocket'; data['tabs'][1]['icon'] = 'heart'
        r3 = s.req(s.site_base + '/web/links/api.php?action=save', data=json.dumps({'data': data, 'rev': lk.get('rev')}).encode(), method='POST', hdr={'Content-Type': 'application/json', 'X-Hub-CSRF': s.csrf, 'X-Requested-With': 'bookmarks'})
        ic = [t.get('icon') for t in links_tabs(s)]
        check('K16 Links: a save keeps only a known icon on each tab', ic[0] is None and ic[1] == 'heart', (ic, r3))
        check('K17 no page errors', not errs, errs)
        b.close()
finally:
    stop_all()
sys.exit(check.done())
