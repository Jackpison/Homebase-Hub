#!/usr/bin/env python3
"""Instant pages and Offline Reading (1.72.0).
  * Instant pages: Links, Info, Cards and Tasks show this tab's last data at once while the fresh data loads (html.ix-stale; the pencil
    waits), then the fresh data; Log Out clears the copy.
  * Offline Reading: off by default (no service worker); the switch in Settings > Overview > Start Here registers one for the whole site;
    without a connection the pages open from the copy, read-only, with a note; back online they load fresh; Log Out deletes the copy;
    switching it off removes the worker and the copy.
    python3 tests/browser/offline_test.py build/site-update-X.Y.Z.zip [--browser chromium|firefox|webkit]   (port 8984)"""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import SEED, Site, Checks, stop_all, browser_login, wait_js, browser_name, launch, until
from playwright.sync_api import sync_playwright

if len(sys.argv) < 2: sys.exit(__doc__)
BROWSER = browser_name(); ZIP = sys.argv[1]; check = Checks()
STATE = """(() => ({ url: location.href, title: document.title, ready: document.readyState, online: navigator.onLine,
  sw: !!(navigator.serviceWorker && navigator.serviceWorker.controller), cls: document.documentElement.className, cols: document.querySelectorAll('#grid .col').length,
  note: !!document.getElementById('ix-offl'), grid: ((document.getElementById('grid') || {}).textContent || '').slice(0, 160), body: (document.body ? document.body.innerText : '').slice(0, 200) }))()"""
SNAPS = "Object.keys(sessionStorage).filter(k => k.startsWith('hub-snap-')).sort()"
try:
    s = Site(ZIP, 8984)
    subprocess.run(['php', SEED, s.dir], capture_output=True)
    with sync_playwright() as p:
        b = launch(p, BROWSER); print('browser: %s %s' % (BROWSER, b.version))
        ctx = b.new_context(viewport={'width': 1280, 'height': 900}); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        why = browser_login(pg, s.base); check('F0 logged in', not why, why)

        # two tasks to see (the demo data has none): added through the page, as a person would
        pg.goto(s.base + '/web/tasks/'); wait_js(pg, "typeof T !== 'undefined' && typeof save === 'function' && !document.documentElement.classList.contains('ix-stale')", 20000)
        pg.evaluate("T.push({ id: 'offtask01', name: 'Pay the rent', due: '2026-11-05', repeat: { n: 1, unit: 'month' }, status: 'open' }, { id: 'offtask02', name: 'Water the plants', due: '2026-11-04', repeat: { n: 1, unit: 'week' }, status: 'open' }); save()")
        until(lambda: '/web/tasks/' in pg.url and pg.evaluate("document.getElementById('status').textContent.indexOf('Saving') < 0 && REV > 0"), 10000)
        # ---- instant pages ----
        for app, ready in (('links', "!!document.querySelector('#grid .col')"), ('info', "document.querySelectorAll('.box').length > 0"),
                           ('cards', "document.querySelectorAll('#list .row').length > 0"), ('tasks', "typeof T !== 'undefined' && T.length > 0")):
            pg.goto(s.base + '/web/%s/' % app); wait_js(pg, ready + " && !document.documentElement.classList.contains('ix-stale')", 20000)
        kept = pg.evaluate(SNAPS)
        check('F1 each page keeps its last data in this tab after loading (Links, Info, Cards, Tasks)', kept == ['hub-snap-cards', 'hub-snap-info', 'hub-snap-links', 'hub-snap-tasks'], kept)
        # the fresh data takes 2.5 seconds: the page's own fetch waits (a pause in the test itself would hold up every request)
        ctx.add_init_script("""(() => { const f = window.fetch; window.fetch = function (u, o) { const s = new URL(String(u && u.url || u), location.href).href, p = window.__slowAt || sessionStorage.getItem('slowAt');
          const hit = p && s.split('?')[0].endsWith(p.split('?')[0]) && (p.indexOf('?') < 0 ? s.indexOf('?') < 0 : s.indexOf(p.split('?')[1]) >= 0);
          return hit ? new Promise(r => setTimeout(r, 2500)).then(() => f.call(this, u, o)) : f.call(this, u, o); }; })()""")
        pg.evaluate("sessionStorage.setItem('slowAt', 'web/tasks/api.php')")
        slow = {'n': 1}
        t0 = time.time(); pg.goto(s.base + '/web/tasks/', wait_until='domcontentloaded')
        wait_js(pg, "typeof T !== 'undefined' && T.length > 0 && !!document.querySelector('#main .wk, #list .row')", 2000)
        early = [round(time.time() - t0, 2), pg.evaluate("document.documentElement.classList.contains('ix-stale')")]
        wait_js(pg, "!document.documentElement.classList.contains('ix-stale')", 10000)
        check('F2 Tasks: the list shows at once from the last copy while the fresh one takes 2.5 s (the page is marked as waiting), then the fresh list',
              early[0] < 2.2 and early[1] and slow['n'] >= 1, early)
        pg.evaluate("sessionStorage.setItem('slowAt', 'web/links/api.php?action=get')")
        pg.goto(s.base + '/web/links/', wait_until='domcontentloaded'); wait_js(pg, "!!document.querySelector('#grid .col') && document.documentElement.classList.contains('ix-stale')", 3000)
        pg.evaluate("document.querySelector('[data-hub=toggle]').click()"); pg.wait_for_timeout(200)
        waiting = [pg.evaluate("document.body.classList.contains('editing')"), pg.evaluate("((document.getElementById('ix-toast') || {}).textContent || '')")]
        wait_js(pg, "!document.documentElement.classList.contains('ix-stale')", 10000); pg.evaluate("sessionStorage.removeItem('slowAt')")
        check('F3 Links: while the old copy is on screen the pencil waits ("Loading the latest version first…"); editing works once the fresh data is in',
              waiting[0] is False and 'Loading the latest' in waiting[1], waiting)

        # ---- Offline Reading ----
        sw0 = pg.evaluate("navigator.serviceWorker.getRegistrations().then(r => r.filter(x => /action=sw/.test((x.active || x.installing || x.waiting || {}).scriptURL || '')).length)")
        pg.goto(s.base + '/web/settings/#setup'); wait_js(pg, "!!document.getElementById('ix-offsw')", 20000)
        sw_off = pg.evaluate("[document.getElementById('ix-offsw').checked, document.getElementById('ix-offst').textContent]")
        check('F4 Offline Reading is off by default: no service worker for it; Start Here has its switch, off', sw0 == 0 and sw_off == [False, 'Off'], (sw0, sw_off))
        pg.click('#ix-offsw')
        wait_js(pg, "navigator.serviceWorker.getRegistrations().then(r => r.some(x => x.active && /action=sw$/.test(x.active.scriptURL)))", 15000)
        scope = pg.evaluate("navigator.serviceWorker.getRegistrations().then(r => r.filter(x => x.active && /action=sw$/.test(x.active.scriptURL)).map(x => x.scope))")
        check('F5 switched on, a service worker looks after the whole site (its scope is the site\'s folder)', scope == [s.base + '/'], scope)
        try: kept = wait_js(pg, "caches.open('hub-offline').then(c => c.keys()).then(k => k.some(r => new URL(r.url).pathname === '/web/settings/') && k.some(r => /\\/shell\\.js\\?v=/.test(r.url)))", 15000)
        except TimeoutError: kept = False
        check('F5b the page where it was switched on (it loaded before the worker) is kept too, with its files', kept is not False)
        for app, ready in (('links', "!!document.querySelector('#grid .col')"), ('tasks', "typeof T !== 'undefined' && T.length > 0"),
                           ('info', "document.querySelectorAll('.box').length > 0")):
            pg.goto(s.base + '/web/%s/' % app); wait_js(pg, ready + " && !!navigator.serviceWorker.controller", 20000); pg.wait_for_timeout(600)
        n = pg.evaluate("caches.open('hub-offline').then(c => c.keys()).then(k => k.map(r => new URL(r.url).pathname + new URL(r.url).search))")
        check('F6 the pages, their files and their data are kept on this device (no time stamps in the keys)',
              any('/web/tasks/api.php' in k for k in n) and any(k.endswith('/web/links/api.php?action=get') for k in n) and any('shell.js?v=' in k for k in n), n[:12])
        ctx.set_offline(True)
        pg.goto(s.base + '/web/tasks/', wait_until='domcontentloaded'); wait_js(pg, "typeof T !== 'undefined' && T.length > 0", 15000)
        wait_js(pg, "document.documentElement.classList.contains('ix-offline') && !!document.getElementById('ix-offl')", 8000)
        off = pg.evaluate("[document.getElementById('ix-offl').textContent, T.length]")
        pg.goto(s.base + '/web/links/', wait_until='domcontentloaded')
        try: wait_js(pg, "!!document.querySelector('#grid .col') && document.documentElement.classList.contains('ix-offline')", 15000)
        except TimeoutError:   # say what the page looked like, so a CI failure can be understood
            raise SystemExit('F7 Links offline did not open: ' + json.dumps(pg.evaluate(STATE)))
        pg.evaluate("document.querySelector('[data-hub=toggle]').click()"); pg.wait_for_timeout(200)
        ro = [pg.evaluate("document.body.classList.contains('editing')"), pg.evaluate("((document.getElementById('ix-toast') || {}).textContent || '')")]
        check('F7 no connection: Tasks and Links open from the copy with an "Offline" note, and editing waits for the connection',
              'Offline' in off[0] and off[1] > 0 and ro[0] is False and 'offline' in ro[1], (off, ro))
        pg.evaluate("window.__beforeOnline = 1"); ctx.set_offline(False)
        # back online the page loads itself again: wait for that new page, or the next goto collides with it
        wait_js(pg, "!window.__beforeOnline && document.readyState === 'complete' && !document.documentElement.classList.contains('ix-offline') && !document.getElementById('ix-offl')", 15000)
        check('F8 back online the note goes and the page loads fresh', True)
        pg.goto(s.base + '/web/settings/#overview'); wait_js(pg, "!!(window.HUB && HUB.logout && HUB.isAdmin())", 20000)
        pg.evaluate("window.HUB.logout()"); pg.wait_for_load_state('load'); pg.wait_for_timeout(1500)
        after = pg.evaluate("caches.open('hub-offline').then(c => c.match(location.origin + '/web/tasks/api.php')).then(r => r ? r.json() : null).then(j => [j ? !!j.auth : null, " + SNAPS + "])")
        check('F9 Log Out deletes the kept copy (what is kept afterwards is only what a visitor sees) and the instant-page copies', after[0] in (None, False) and after[1] == [], after)
        browser_login(pg, s.base)
        pg.goto(s.base + '/web/settings/#setup'); wait_js(pg, "!!document.getElementById('ix-offsw') && document.getElementById('ix-offsw').checked", 20000)
        pg.click('#ix-offsw'); pg.wait_for_timeout(1500)
        gone = pg.evaluate("Promise.all([navigator.serviceWorker.getRegistrations().then(r => r.filter(x => /action=sw/.test((x.active || x.installing || x.waiting || {}).scriptURL || '')).length), caches.has('hub-offline')])")
        check('F10 switching it off removes the service worker and deletes the copy', gone == [0, False], gone)
        check('F11 no page error', not [e for e in errs if 'Failed to fetch' not in e], errs)
        b.close()
finally:
    stop_all()
sys.exit(check.done())
