#!/usr/bin/env python3
"""Small things in Settings and Home, in a real browser:
  * Backup & Restore > Send Backups to Telegram > Send Backup Now (Telegram > Backups before 1.70.0): the button waits as long as the server may take (4 minutes, not 30 seconds), and never stays stuck on
    "Sending…": when the answer does not come it frees itself and says the backup may still arrive in Telegram
  * Settings > Updates has a link to the project on GitHub
  * Home takes uploads of up to 128 MB
  * the first request after an update removes the old Tools config.json
  * the Settings menu and its groups, every address opening the right section and tab, Appearance with all 143 presets,
    a chosen font surviving a later save, the Security and Telegram cards, and the site search without field checkboxes
    python3 tests/browser/settings_test.py build/site-update-X.Y.Z.zip [--browser chromium|firefox|webkit]   (port 8970)"""
import os, sys, glob, re, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import Site, Checks, stop_all, browser_login, wait_js, browser_name, launch, until, page_errors
from playwright.sync_api import sync_playwright

if len(sys.argv) < 2: sys.exit(__doc__)
BROWSER = browser_name(); ZIP = sys.argv[1]; check = Checks()
try:
    s = Site(ZIP, 8970)
    r = s.post('notify_save', {'token': '123456789:AAEabcdefghijklmnopqrstuvwxyz0123456', 'chat': '424242'})
    check('S0 setup: a bot token and chat are saved, so the backup button is ready', r.get('ok') is not False and r.get('hasToken'), r)

    # the first request after an update removes the old Tools config.json
    cfg = os.path.join(s.dir, 'web', 'tools', 'config.json'); open(cfg, 'w').write('{"brand":{}}')
    for m in glob.glob(os.path.join(s.dir, 'site-data', 'core', 'after-update-*.done')): os.remove(m)
    s.get('state')
    check('S1 the first request after an update removes the old Tools config.json (and the site stays up)', not os.path.exists(cfg) and s.get('state').get('csrf') is not None)

    # Home: uploads up to 128 MB
    lim = s.get('state')  # make sure we are logged in as the owner
    h = s.raw(s.host + '/web/home/api.php?action=admin') if hasattr(s, 'raw') else None
    cf = open(os.path.join(s.dir, 'web', 'home', 'config.php')).read()
    check('S2 Home takes uploads of up to 128 MB (the setting, and what the page tells you)', re.search(r'const MAX_UPLOAD_MB = 128;', cf) is not None)

    with sync_playwright() as p:
        b = launch(p, BROWSER); print('browser: %s %s' % (BROWSER, b.version))
        ctx = b.new_context(viewport={'width': 1280, 'height': 1000}); ctx.add_init_script("""window.__waits = []; const st = window.setTimeout;
            window.setTimeout = function (f, d, ...a) { if (d >= 100000) window.__waits.push(d); return st.call(window, f, d, ...a); };""")
        pg = ctx.new_page(); errs = []; page_errors(pg, errs)
        why = browser_login(pg, s.base); check('S3 logged in', not why, why)

        pg.goto(s.base + '/web/settings/#updates'); wait_js(pg, "!!document.querySelector('.ix-card a[href^=\"https://github.com/\"]')", 20000)
        a = pg.locator('.ix-card a[href^="https://github.com/"]').first
        check('S4 Settings > Updates > Update From GitHub links to the project on GitHub (in a new tab, safely)', a.get_attribute('href') == 'https://github.com/Jackpison/Homebase-Hub' and a.get_attribute('target') == '_blank' and 'noopener' in a.get_attribute('rel'), a.get_attribute('href'))

        h2x = "(document.querySelector('#ix-pane .ix-ph h2') || {}).textContent"
        def open_backups():
            pg.goto(s.base + '/web/settings/#backup'); wait_js(pg, "!!document.querySelector('#ix-tgbk #ix-tgbknow')", 20000)
        # a quick answer: the button waits for the long time, then goes back to normal and says it was sent
        view = {k: v for k, v in s.post('notify_save', {}).items() if not k.startswith('_')}   # what the real answer carries: the whole Telegram state
        body = json.dumps({**view, 'ok': True, 'note': 'Backup sent. Check Telegram.', 'backupLast': 1893456000})
        pg.route('**/api.php?action=notify_backup*', lambda route: route.fulfill(status=200, content_type='application/json', body=body))
        open_backups(); pg.click('#ix-tgbknow')
        until(lambda: 240000 in (pg.evaluate('window.__waits') or []) and pg.evaluate("(() => { const b = document.querySelector('#ix-tgbknow'); return !!b && !b.disabled && b.textContent === 'Send Backup Now'; })()"), 5000)   # the answer has been handled: S5 and S6 read it
        waits = pg.evaluate('window.__waits')
        check('S5 Send Backup Now waits up to 4 minutes for the site (the usual 30 seconds is too short for a big backup)', 240000 in waits, waits)
        check('S6 ...and when it is done the button is back to "Send Backup Now" and ready', pg.evaluate("(() => { const b = document.querySelector('#ix-tgbknow'); return !!b && !b.disabled && b.textContent === 'Send Backup Now'; })()"))
        # no answer at all (the connection drops): the button must not stay stuck
        pg.unroute('**/api.php?action=notify_backup*'); pg.route('**/api.php?action=notify_backup*', lambda route: route.abort('connectionreset'))
        open_backups(); pg.click('#ix-tgbknow'); wait_js(pg, "((document.getElementById('ix-toast') || {}).textContent || '').includes('did not answer in time')", 20000)   # the helper retries a dropped connection twice first
        state = pg.evaluate("(() => { const b = document.querySelector('#ix-tgbknow'); return [!!b, b && !b.disabled, b && b.textContent, (document.getElementById('ix-toast') || {}).textContent.includes('look there before you try again')]; })()")
        check('S7 with no answer, the button is free again, and a message says the backup may still arrive in Telegram', state == [True, True, 'Send Backup Now', True], state)
        # (1.70.0) Telegram no longer has a Backups tab: its Backups card opens Backup & Restore; Send Today's Tasks is in Messages
        pg.goto(s.base + '/web/settings/#telegram'); wait_js(pg, "document.querySelectorAll('#ix-pc .ix-tabbar [role=tab]').length >= 4", 20000)
        ttabs = pg.evaluate("[...document.querySelectorAll('#ix-pc .ix-tabbar [role=tab]')].map(e => e.textContent)")
        today = pg.evaluate("(() => { const b = document.getElementById('nt-today'); return b ? b.closest('.ix-tpane').dataset.tab : ''; })()")
        pg.click('#ix-pc .ix-tile[data-go="bk"]'); wait_js(pg, "!!document.querySelector('#ix-tgbk')", 10000)
        check("S7b Telegram's tabs are Status, Setup, Messages and Instant Replies; Send Today's Tasks is in Messages; the Backups card opens Backup & Restore",
              ttabs == ['Status', 'Setup', 'Messages', 'Instant Replies'] and today == 'messages' and pg.evaluate(h2x) == 'Backup & Restore', (ttabs, today, pg.evaluate(h2x)))
        # Security > Overview: each card keeps its icon inside the card (the phone sheet's tiles once shared the class name and squashed them)
        pg.goto(s.base + '/web/settings/#security'); wait_js(pg, "document.querySelectorAll('#ix-pc .ix-tile').length >= 6", 15000)
        until(lambda: pg.evaluate("""[...document.querySelectorAll('#ix-pc .ix-tile')].filter(t => t.getBoundingClientRect().width > 0).every(t => {
            const r = t.getBoundingClientRect(), i = t.querySelector('.ix-tile-i').getBoundingClientRect();
            return i.top >= r.top - 1 && i.bottom <= r.bottom + 1 && r.height >= 90; })"""), 3000)   # the cards settle (fonts, icons); the check below then names any that do not
        bad = pg.evaluate("""[...document.querySelectorAll('#ix-pc .ix-tile')].filter(t => t.getBoundingClientRect().width > 0).map(t => {
            const r = t.getBoundingClientRect(), i = t.querySelector('.ix-tile-i').getBoundingClientRect();
            return i.top >= r.top - 1 && i.bottom <= r.bottom + 1 && r.height >= 90 ? '' : t.textContent.slice(0, 30); }).filter(Boolean)""")
        check('S19 Security > Overview: every card holds its icon and text (nothing spills out)', not bad, bad)
        pg.goto(s.base + '/web/settings/#telegram/overview'); wait_js(pg, "document.querySelectorAll('#ix-pc .ix-tile').length >= 4", 15000)
        until(lambda: pg.evaluate("""[...document.querySelectorAll('#ix-pc .ix-tile')].filter(t => t.getBoundingClientRect().width > 0).every(t => {
            const r = t.getBoundingClientRect(), i = t.querySelector('.ix-tile-i').getBoundingClientRect();
            return i.top >= r.top - 1 && i.bottom <= r.bottom + 1 && r.height >= 90; })"""), 3000)
        bad = pg.evaluate("""[...document.querySelectorAll('#ix-pc .ix-tile')].filter(t => t.getBoundingClientRect().width > 0).map(t => {
            const r = t.getBoundingClientRect(), i = t.querySelector('.ix-tile-i').getBoundingClientRect();
            return i.top >= r.top - 1 && i.bottom <= r.bottom + 1 && r.height >= 80 ? '' : t.textContent.slice(0, 30); }).filter(Boolean)""")
        check('S20 Telegram > Status: every card holds its icon and text', not bad, bad)
        # the Settings menu of 1.48.5: Web Setting, Data Setting, System Setting (Health first); 1.70.0: the Changelog is part of Updates
        pg.goto(s.base + '/web/settings/#overview'); wait_js(pg, "document.querySelectorAll('#ix-page .ix-snav [data-sec]').length > 0", 20000)
        menu = pg.evaluate("[...document.querySelectorAll('#ix-page .ix-snav [data-sec] span')].map(e => e.textContent)")
        groups = pg.evaluate("[...document.querySelectorAll('#ix-page .ix-snav .ix-sgl')].map(e => e.textContent)")
        check('S9 the Settings menu: Web Setting (General, Appearance), Data Setting (Security, Telegram, Backup & Restore, Logs), System Setting (Health, Updates, Features)',
              menu == ['General', 'Appearance', 'Security', 'Telegram', 'Backup & Restore', 'Logs', 'Health', 'Updates', 'Features'] and groups == ['Web', 'Data', 'System'], (menu, groups))
        def at(h, expr):
            pg.goto(s.base + '/web/settings/' + h)
            try: wait_js(pg, expr, 10000); return True
            except Exception: return False
        tabs = "[...document.querySelectorAll('#ix-pane .ix-subt [role=tab]')].map(e => e.textContent).join('|')"
        sel = "(document.querySelector('#ix-pane .ix-subt [aria-selected=true]') || {}).textContent"
        h2 = "(document.querySelector('#ix-pane .ix-ph h2') || {}).textContent"
        sub = "[...document.querySelectorAll('#ix-pane .ix-subseg [aria-selected=true]')].map(e => e.textContent).join('')"
        places = [('#updates', 'Updates', 'Update'), ('#files', 'Health', 'Server Check'), ('#health', 'Health', 'Overview'), ('#domains', 'Health', 'Domains and Uptime'), ('#check', 'Health', 'Server Check'),
                  ('#changelog', 'Updates', "Changelog"), ('#system', 'Updates', 'Update'), ('#look', 'Appearance', 'Look'), ('#themes', 'Appearance', 'Presets'),
                  ('#colors', 'Appearance', 'Colors'), ('#glass', 'Appearance', 'Glass'), ('#nav', 'Appearance', 'Bar'), ('#pages', 'Appearance', 'Bar'), ('#setup', 'General', 'Start Here'), ('#logs', 'Logs', 'Notifications'),
                  ('#telegram/backups', 'Backup & Restore', 'Back Up')]
        bad = [h for h, t, u in places if not at(h, h2 + " === %s && %s === %s" % (json.dumps(t), sel, json.dumps(u)))]
        check('S10 every address opens its section and tab (#system, from 1.48, opens Updates; #pages and #nav open Appearance > Bar; 1.70.0: #files opens Server Check, #changelog Changelog, #telegram/backups Backup & Restore)', not bad, bad)
        odd = [h for h in ('#constructor', '#__proto__', '#hasOwnProperty', '#toString/x') if not at(h, h2 + " === 'General'")]
        check('S10d an address that is a built-in JavaScript name (#constructor, #__proto__ ...) opens General, not a broken page (2026-11)', not odd, odd)
        ok = at('#changelog', tabs + " === \"Update|Changelog\"")
        check("S10b Updates has two tabs, Update and Changelog (1.77.1: Versions and Version Map are one list; the Notes moved to Features)", ok and pg.evaluate("document.querySelectorAll('#ix-pane .ix-subseg').length") == 0, pg.evaluate(sub))
        ok = at('#general', "!!document.querySelector('#ix-name')")
        gen = pg.evaluate("[[...document.querySelectorAll('#ix-pc .ix-ec-t')].map(e => e.textContent), document.querySelectorAll('#ix-pane .ix-subt').length]")
        check('S10c General holds Site Name, Site Logo and Time Zone, with the two tabs General and Start Here (1.77.2)', ok and gen == [['Site Name', 'Site Logo', 'Time Zone'], 1] and pg.evaluate(tabs) == 'General|Start Here', gen)
        ok = at('#nav', tabs + " === 'Look|Bar|Colors|Presets|Glass' && !!document.querySelector('#ix-pc #ix-tabl .ix-pgr') && !!document.querySelector('#ix-pc .ix-navpick')")
        cards = pg.evaluate("[...document.querySelectorAll('#ix-pc .ix-ec-t')].map(e => e.textContent)")
        check('S11 Appearance > Bar holds Navigation Style (with the two bar switches) and the Tabs list', ok and cards == ['Navigation Style', 'Tabs'] and pg.evaluate("!!document.querySelector('#ix-hb') && !!document.querySelector('#ix-bh')"), (pg.evaluate(tabs), cards))
        ok = at('#look', "!!document.querySelector('#ix-font')")
        cards = pg.evaluate("[...document.querySelectorAll('#ix-pc .ix-ec-t')].map(e => e.textContent)")
        check('S13 Look shows Theme, Font and Text Sizes; the bar, the accent and the glass switch are on their own tabs',
              ok and cards == ['Theme', 'Font', 'Text Sizes'] and pg.evaluate("!document.querySelector('#ix-pc .ix-navpick, #ix-glass, #ix-pc .ix-apk, #ix-look')"), cards)
        pg.click('#ix-pc [data-ts="cards"]'); wait_js(pg, "!!document.querySelector('#ix-dlg.open #ix-tzs')", 5000)
        tsz = pg.evaluate("[document.querySelector('#ix-dlg.open h2').textContent, document.querySelectorAll('#ix-dlg.open input[type=range]').length, !!document.querySelector('#ix-dlg.open .ix-tss-cards')]")
        pg.evaluate("(() => { const r = document.querySelector('#ix-dlg.open input[type=range]'); r.value = r.max; r.dispatchEvent(new Event('input')); })()")
        rk = pg.evaluate("document.querySelector('#ix-dlg.open input[type=range]').dataset.k"); rmax = pg.evaluate("+document.querySelector('#ix-dlg.open input[type=range]').max")
        pg.click('#ix-tzs'); until(lambda: ((s.get('state').get('sizes') or {}).get('cards') or {}).get(rk) == rmax, 5000)
        check('S13b Look > Cards Text Sizes opens the Cards sizes (title, sliders, sample) and saves them for Cards', tsz[0] == 'Cards Text Sizes' and tsz[1] >= 2 and tsz[2] and ((s.get('state').get('sizes') or {}).get('cards') or {}).get(rk) == rmax, (tsz, s.get('state').get('sizes')))
        wait_js(pg, "!document.querySelector('#ix-dlg.open')", 5000)   # the window has closed before the next section opens
        s.post('settings', {'settings': {'sizes': {}}})
        at('#colors', "!!document.querySelector('#ix-pc .ix-apk')")
        check('S14 Colors holds Accent Color: 10 colors (the 1.65.3 picker) and your own, and no second Accent row', pg.evaluate("document.querySelectorAll('#ix-pc .ix-sw [data-c]').length") == 10 and pg.evaluate("!!document.querySelector('#ix-acc') && !document.querySelector('[data-sa]')"))
        ok = at('#glass', "!!document.querySelector('#ix-glass2')")
        check('S14b the glass on/off switch is on the Glass tab (Glass on the Bar)', ok)
        ok = at('#setup', "!!document.querySelector('#ix-pc .ix-wzhost')")
        check('S14c General > Start Here holds the Guided Setup', ok)
        ok = at('#features', "!!document.querySelector('#ix-pc .ix-help #ix-inst') && !!document.querySelector('#ix-pc .ix-help #ix-keysb')")
        check('S14e Features ends with Install on Your Phone and Keyboard Shortcuts (1.77.2)', ok)
        ok = at('#check', "!!document.querySelector('#ix-pc .ix-scbox .ix-checks') && !!document.querySelector('#ix-pc #ix-fnb') && !!document.querySelector('#ix-pc .ix-fls .ix-chgs, #ix-pc .ix-fls .ix-status')")
        check('S14d Health > Server Check ends with Files That Do Not Belong', ok)
        at('#look', "!!document.querySelector('#ix-font')")
        pg.click('#ix-pane .ix-subt [data-grp="themes"]')
        wait_js(pg, "document.querySelectorAll('#ix-pc .ix-preset').length > 0", 10000)
        n = pg.evaluate("document.querySelectorAll('#ix-pc .ix-preset').length")   # the dark-mode list
        pg.click('#ix-pc [data-seg="cmode"] [data-v="light"]'); wait_js(pg, "document.querySelector('#ix-pc [data-seg=cmode] [data-v=light]').getAttribute('aria-pressed') === 'true' && document.querySelectorAll('#ix-pc .ix-preset').length > 0", 5000)
        n += pg.evaluate("document.querySelectorAll('#ix-pc .ix-preset').length")   # and the light-mode list
        pg.click('#ix-pc [data-seg="cmode"] [data-v="dark"]'); wait_js(pg, "document.querySelector('#ix-pc [data-seg=cmode] [data-v=dark]').getAttribute('aria-pressed') === 'true'", 5000)
        check('S15 Appearance > Presets has all 155 presets (dark and light together; 1.59 removed near-duplicates and added vivid ones; 1.64 added Soft Dark and Soft Warm; 1.75 added six Spotlight looks in dark and light)', n == 155, n)
        # a font chosen in Look survives a later save made after changing only the accent
        at('#look', "!!document.querySelector('#ix-font')")
        pg.select_option('#ix-font', 'georgia'); pg.click('#ix-save'); until(lambda: s.get('state').get('font') == 'georgia', 5000)
        at('#colors', "!!document.querySelector('#ix-pc .ix-apk')")
        pg.click('#ix-pc .ix-sw [data-c="#0ea5e9"]'); pg.click('#ix-save'); until(lambda: s.get('state').get('accent') == '#0ea5e9', 5000)
        st = s.get('state')
        check('S16 a later save keeps the font chosen earlier', st.get('font') == 'georgia' and st.get('accent') == '#0ea5e9', (st.get('font'), st.get('accent')))
        s.post('settings', {'settings': {'font': 'default', 'accent': '#ffc21a'}})
        # the site search: where to look, and one tab; no field checkboxes or "Whole Words Only"
        pg.goto(s.base + '/web/links/'); wait_js(pg, "!!document.querySelector('#ix-q')", 15000)
        pg.click('#ix-sbox .ix-fbtn'); wait_js(pg, "!!document.querySelector('#ix-sres .ix-chips')", 10000)
        txt = pg.inner_text('#ix-sres')
        check('S17 the search panel keeps "search in" and has no field checkboxes or Whole Words Only', 'Everything' in txt and 'Whole Words' not in txt and not pg.evaluate("!!document.querySelector('#ix-sres input[type=checkbox]')"), txt[:200])
        check('S8 no page error', not errs, errs)
        b.close()
finally:
    stop_all()
sys.exit(check.done())
