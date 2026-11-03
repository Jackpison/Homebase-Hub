#!/usr/bin/env python3
"""Tasks in 1.72.0: more ways to repeat (chosen weekdays, the last day of the month) in the Add Task window, and calendars you follow
(fetched by the server from their address, shown read-only in the Calendar and the day panel, the address never shown in full).
A small local server stands in for a calendar on the internet (port 8125, allowed by tests/lib/prepend.php only).
    python3 tests/browser/tasks_more_test.py build/site-update-X.Y.Z.zip [--browser chromium|firefox|webkit]   (port 8989)"""
import datetime, http.server, os, sys, threading, zoneinfo
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import Site, Checks, stop_all, browser_login, wait_js, browser_name, launch, until
from playwright.sync_api import sync_playwright

if len(sys.argv) < 2: sys.exit(__doc__)
BROWSER = browser_name(); ZIP = sys.argv[1]; check = Checks()
FIX = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'fixtures', 'calendar', 'family.ics')
TODAY = datetime.datetime.now(zoneinfo.ZoneInfo('Asia/Kolkata')).strftime('%Y%m%d')   # the site's default time zone


class Cal(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        body = open(FIX).read().replace('@TODAY@', TODAY).replace('\n', '\r\n').encode()
        self.send_response(200 if self.path == '/family.ics' else 404); self.send_header('Content-Type', 'text/calendar'); self.end_headers()
        if self.path == '/family.ics': self.wfile.write(body)
    def log_message(self, *a): pass


srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8125), Cal); threading.Thread(target=srv.serve_forever, daemon=True).start()
try:
    s = Site(ZIP, 8989)
    with sync_playwright() as p:
        b = launch(p, BROWSER); print('browser: %s %s' % (BROWSER, b.version))
        ctx = b.new_context(viewport={'width': 1360, 'height': 900}); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        why = browser_login(pg, s.base); check('R0 logged in', not why, why)
        pg.goto(s.base + '/web/tasks/'); wait_js(pg, "typeof T !== 'undefined' && typeof openEditor === 'function'", 20000)

        # ---- repeats ----
        pg.click('#add'); wait_js(pg, "document.getElementById('dlg').open", 5000)
        pg.fill('#e-name', 'Gym'); pg.fill('#e-due', '2026-11-02')
        pg.select_option('#e-rep', 'custom'); pg.select_option('#e-unit', 'week')
        rows = pg.evaluate("[document.getElementById('e-wdrow').hidden, document.getElementById('e-onrow').hidden]")
        fit = pg.evaluate("(() => { const p = document.getElementById('e-n').parentElement.getBoundingClientRect(), u = document.getElementById('e-unit').getBoundingClientRect(); return u.right <= p.right + 1 && u.width > 60; })()")
        check('R1a Custom: the number and the Days/Weeks/Months choice sit side by side inside the window (the choice was pushed out)', fit)
        for v in ('1', '3', '5'): pg.check('#e-wd input[value="%s"]' % v)
        prev = pg.evaluate("document.getElementById('e-next').textContent")
        pg.click('#dlg .df button[type=submit]'); until(lambda: pg.evaluate("T.some(t => t.name === 'Gym')"), 5000)
        g = pg.evaluate("T.find(t => t.name === 'Gym').repeat")
        check('R1 Custom, weekly: the day toggles show (not the monthly choice), Mon, Wed and Fri are kept, and the next dates follow them',
              rows == [False, True] and g.get('wd') == [1, 3, 5] and prev.count(',') >= 3, (rows, g, prev))
        pg.click('#add'); wait_js(pg, "document.getElementById('dlg').open", 5000)
        pg.fill('#e-name', 'Rent'); pg.fill('#e-due', '2026-11-30'); pg.select_option('#e-rep', 'mlast')
        pg.click('#dlg .df button[type=submit]'); until(lambda: pg.evaluate("T.some(t => t.name === 'Rent')"), 5000)
        until(lambda: pg.evaluate("document.getElementById('status').textContent.indexOf('Saving') < 0"), 8000); pg.wait_for_timeout(500)
        saved = pg.evaluate("fetch('api.php', { cache: 'no-store' }).then(r => r.json()).then(j => j.tasks.filter(t => t.name === 'Gym' || t.name === 'Rent').map(t => [t.name, t.repeat]))")
        labels = pg.evaluate("[repLabel(T.find(t => t.name === 'Gym').repeat), repLabel(T.find(t => t.name === 'Rent').repeat)]")
        check('R2 the server keeps both rules, and they read "Every Mon, Wed and Fri" and "Monthly on the Last Day"',
              sorted(saved) == [['Gym', {'n': 1, 'unit': 'week', 'wd': [1, 3, 5]}], ['Rent', {'n': 1, 'unit': 'month', 'on': 'last'}]] and labels == ['Every Mon, Wed and Fri', 'Monthly on the Last Day'], (saved, labels))
        nd = pg.evaluate("[nextDate('2026-11-06', { n: 1, unit: 'week', wd: [1, 3, 5] }), nextDate('2027-01-31', { n: 1, unit: 'month', on: 'last' }, 31), nextDate('2026-11-10', { n: 1, unit: 'month', on: 'nth', nth: 2, dow: 2 })]")
        check('R3 the page works out the next dates like the server (Fri -> Mon; 31 Jan -> 28 Feb; 2nd Tuesday -> 8 Dec)', nd == ['2026-11-09', '2027-02-28', '2026-12-08'], nd)

        # ---- calendars you follow ----
        pg.evaluate("document.getElementById('psets').click()"); wait_js(pg, "document.getElementById('sdlg').open", 5000)
        pg.fill('#s-suburl', 'ftp://example.com/x.ics'); pg.click('#s-subadd'); pg.wait_for_timeout(600)
        bad = pg.evaluate("[(document.getElementById('snack') || document.querySelector('.snack') || { textContent: '' }).textContent, SUBS.cals.length]")
        pg.fill('#s-suburl', 'http://127.0.0.1:8125/family.ics'); pg.fill('#s-subname', 'Family'); pg.click('#s-subadd')
        until(lambda: pg.evaluate("SUBS.cals.length === 1"), 15000); pg.wait_for_timeout(200)
        row = pg.evaluate("document.querySelector('#s-subs .subr').textContent")
        check('R4 an address that is not a web calendar is refused; a calendar address is fetched and listed with its events, its address shortened',
              bad[1] == 0 and 'Family' in row and '4 events' in row and '…' in row, (bad, row))
        pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
        pg.evaluate("V.view = 'cal'; V.calV = 'month'; render()"); wait_js(pg, "!!document.querySelector('#vcal .evp')", 5000)
        cal = pg.evaluate("[[...document.querySelectorAll('#vcal .cd.today .evp')].map(e => e.textContent), [...document.querySelectorAll('#agenda .evr')].map(e => e.textContent)]")
        check('R5 today in the Calendar shows the calendar\'s events (read-only chips in its colour), and the day panel lists them "From Your Calendars"',
              any('School play' in x for x in cal[0]) and sorted(cal[1]) == ['Piano lesson', 'School play'], cal)
        # ---- (1.72.0) Home: Upcoming Bills, Recent Links, Recent Files, Server Status, and Today with the calendar's events ----
        pg.keyboard.press('Escape')
        pg.evaluate("T.push({ id: 'billtest01', name: 'Electricity', due: todayS(), repeat: { n: 1, unit: 'month' }, price: 1200, cur: 'INR', status: 'active' }); save()")
        until(lambda: pg.evaluate("document.getElementById('status').textContent.indexOf('Saving') < 0"), 8000); pg.wait_for_timeout(400)
        s.php("require '%s/web/home/lib.php'; $x = load_site(); $x['widgets']['style'] = 'glance'; foreach ($x['widgets']['list'] as &$w) $w['on'] = in_array($w['id'], ['today', 'bills', 'recent', 'files', 'status'], true); unset($w); write_json(SITE_FILE, $x);" % s.dir)
        pg.goto(s.base + '/web/links/'); wait_js(pg, "!!(window.HUB && HUB.isAdmin())", 20000)
        pg.evaluate("(() => { const d = document.createElement('div'); d.className = 'links'; d.innerHTML = '<a data-u=\"https://example.com/garden\" href=\"#\">Garden Centre</a>'; document.body.appendChild(d); d.querySelector('a').addEventListener('click', e => e.preventDefault()); d.querySelector('a').click(); })()")
        pg.evaluate("sessionStorage.setItem('hub-find-files', JSON.stringify([{ n: 'Lease.pdf', d: '', t: Date.now() - 3600e3 }, { n: 'Photo.jpg', d: 'Holiday', t: Date.now() }]))")
        pg.goto(s.base + '/web/home/'); wait_js(pg, "document.querySelectorAll('#wCards .wcard').length === 5 && ![...document.querySelectorAll('#wCards .wcard')].some(c => c.textContent.includes('…'))", 20000)
        cards = pg.evaluate("Object.fromEntries([...document.querySelectorAll('#wCards .wcard')].map(c => [c.dataset.w, c.textContent.replace(/\\s+/g, ' ').trim()]))")
        check('W1 Upcoming Bills shows what is left to pay this month (the priced task, in rupees)', '1,200' in cards.get('bills', ''), cards.get('bills'))
        check('W2 Recent Links lists the link just opened in Links (kept on this device)', 'Garden Centre' in cards.get('recent', ''), cards.get('recent'))
        check('W3 Recent Files lists the newest file names first, once Files has opened them in this tab', cards.get('files', '').find('Photo.jpg') >= 0 and cards.get('files', '').find('Photo.jpg') < cards.get('files', '').find('Lease.pdf'), cards.get('files'))
        check('W4 Server Status says how the site stands (the same overview as Settings)', any(w in cards.get('status', '') for w in ('All good', 'thing')), cards.get('status'))
        pg.evaluate("document.querySelector('#wCards .wcard[data-w=today]').click()"); wait_js(pg, "!!document.querySelector('.wev')", 8000)
        evs = pg.evaluate("[...document.querySelectorAll('.wev .wr-n')].map(e => e.textContent)")
        check('W5 Today lists today\'s events from the calendar you follow (read-only)', 'School play' in evs and 'Piano lesson' in evs, evs)
        pg.goto(s.base + '/web/tasks/'); wait_js(pg, "typeof T !== 'undefined' && typeof openEditor === 'function'", 20000)
        pg.evaluate("document.getElementById('psets').click()"); wait_js(pg, "document.getElementById('sdlg').open && !!document.querySelector('#s-subs [data-subdel]')", 5000)
        pg.once('dialog', lambda d: d.accept()); pg.click('#s-subs [data-subdel]'); until(lambda: pg.evaluate("SUBS.cals.length === 0 && SUBS.events.length === 0"), 8000)
        check('R6 Stop Following removes the calendar and its events', True)
        check('R7 no page error', not errs, errs)
        b.close()
finally:
    srv.shutdown(); stop_all()
sys.exit(check.done())
