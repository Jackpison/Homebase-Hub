#!/usr/bin/env python3
"""The touches of 1.65.0 and 1.65.1, each on a real page: the on/off switches (white track, metal knob) everywhere, the theme button in the bar,
the tooltip on icon-only buttons, the button hover, the loader, Hold to Delete (a click never deletes, a hold does, also by keyboard),
swipe in Tasks (touch), the count-up numbers in Cards, and the Presets screen with Surprise Me (a new readable mix each time).
1.65.1: the logged-out Settings card, the login window, search results at full width, Keyboard Shortcuts in search and in Settings > General,
the What's New light, Erase Everything, the hover glow and the edit bar. 1.67.0: the bar's colour tiles, line, search border and tray.
    python3 tests/browser/polish_test.py build/site-update-X.Y.Z.zip [--browser chromium|firefox|webkit]   (port 8979)"""
import json, os, subprocess, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import SEED, Site, Checks, stop_all, browser_login, wait_js, browser_name, launch, until
from playwright.sync_api import sync_playwright

if len(sys.argv) < 2: sys.exit(__doc__)
BROWSER = browser_name(); ZIP = sys.argv[1]; check = Checks()
CONTRAST = """(([a, b]) => { const L = h => { const v = [1, 3, 5].map(i => { const x = parseInt(h.substr(i, 2), 16) / 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
  const x = L(a), y = L(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); })"""

try:
    s = Site(ZIP, 8979)
    subprocess.run(['php', SEED, s.dir], capture_output=True)
    hdr = {'Content-Type': 'application/json', 'X-Hub-CSRF': s.csrf, 'X-Requested-With': 'bookmarks'}
    data = {'tabs': [{'id': 'main', 'title': 'Bookmarks', 'categories': [{'id': 'c0', 'title': 'Reading', 'col': 0, 'links': [{'title': 'Wikipedia', 'url': 'https://wikipedia.example.com'}, {'title': 'Keep Me', 'url': 'https://keep.example.com'}]}]}]}
    s.req(s.base + '/web/links/api.php?action=save', json.dumps({'data': data}).encode(), 'POST', hdr)
    with sync_playwright() as p:
        b = launch(p, BROWSER); print('browser: %s %s' % (BROWSER, b.version))
        ctx = b.new_context(viewport={'width': 1280, 'height': 860}, color_scheme='dark'); pg = ctx.new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        # ---- (1.65.1) logged out: the Settings card and the login window ----
        pg.goto(s.base + '/web/settings/'); wait_js(pg, "!!document.querySelector('.ix-gcard')", 20000)
        gate = pg.evaluate("(() => { const b = document.getElementById('ix-glg'), t = document.createElement('i'); t.style.background = 'var(--ix-accent)'; document.body.appendChild(t); const acc = getComputedStyle(t).backgroundColor; t.remove(); return [!!document.querySelector('.ix-gcard .ix-llogo'), getComputedStyle(b).backgroundColor === acc, b.offsetHeight >= 44, getComputedStyle(document.querySelector('.ix-gate')).backgroundImage.includes('radial-gradient')]; })()")
        check('P17 logged out, Settings shows a card with the logo and a full-width accent Log In button on a dot grid (not the grey browser button)', gate == [True, True, True, True], gate)
        pg.click('#ix-glg'); pg.wait_for_selector('#ix-pw')
        lw = pg.evaluate("(() => { const d = document.getElementById('ix-dlg'), st = getComputedStyle(d); return [st.backgroundImage.includes('radial-gradient'), (st.backdropFilter || st.webkitBackdropFilter || '').includes('blur'), !!document.getElementById('ix-eye'), document.querySelectorAll('#ix-lg').length]; })()")
        check('P18 the login window: the page blurs behind a faint dot grid, the password can be shown, one Log In button', lw == [True, True, True, 1], lw)
        pg.keyboard.press('Escape')
        why = browser_login(pg, s.base); check('P0 logged in', not why, why)

        # ---- switches and the theme switch ----
        pg.goto(s.base + '/web/links/'); wait_js(pg, "document.querySelectorAll('.cat').length > 0", 20000)
        pg.evaluate("document.getElementById('settingsBtn').click()"); pg.wait_for_selector('#setDlg[open]')
        sw = pg.evaluate("(() => { const c = document.querySelector('#setDlg input.ix-sw'), r = {width: c.offsetWidth, height: c.offsetHeight}, st = getComputedStyle(c), k = getComputedStyle(c, '::after'); return [c.type, Math.round(r.width), Math.round(r.height), st.backgroundColor, k.backgroundImage.includes('gradient')]; })()")
        check('P1 the on/off switch is a real checkbox, 52 x 26, a white track and a metal knob', sw[:3] == ['checkbox', 52, 26] and sw[3] == 'rgb(255, 255, 255)' and sw[4], sw)
        rt = pg.evaluate("(() => { const t = document.querySelector('#setDlg .ix-rt'), st = getComputedStyle(t); return [st.backgroundImage.includes('gradient'), getComputedStyle(t.querySelector('svg')).stroke]; })()")
        check('P38 the rows of a page Settings window have solid colour tiles with a white icon, like the Settings menu (1.66.1)', rt == [True, 'rgb(255, 255, 255)'], rt)
        pg.keyboard.press('Escape')
        t0 = pg.evaluate("document.documentElement.dataset.theme")
        ts = pg.evaluate("(() => { const b = document.querySelector('#ix-bar [data-ix=theme]'); return [b.getAttribute('role'), !!b.querySelector('.ix-tsl'), !!b.querySelector('svg path')]; })()")
        check('P2 the bar\'s theme button is the sun/moon icon button again, not the 1.65.0 day/night switch (1.65.1)', ts == [None, False, True], ts)
        pg.click('#ix-bar [data-ix=theme]')
        wait_js(pg, "document.documentElement.dataset.theme !== %r" % t0, 5000)
        check('P3 clicking it switches the theme', pg.evaluate("document.documentElement.dataset.theme") != t0)
        pg.click('#ix-bar [data-ix=theme]'); wait_js(pg, "document.documentElement.dataset.theme === %r" % t0, 5000)

        # ---- tooltip, button hover, loader ----
        pg.hover('#ix-bar [data-ix=theme]')
        wait_js(pg, "!!document.getElementById('ix-ebtip')", 3000); pg.wait_for_timeout(600)
        tip = pg.evaluate("(() => { const t = document.getElementById('ix-ebtip'), st = getComputedStyle(t); return [t.textContent, st.opacity, st.borderTopWidth !== '0px' || st.borderBottomWidth !== '0px', !document.querySelector('#ix-bar [data-ix=theme]').hasAttribute('title')]; })()")
        check('P4 an icon-only bar button shows the dark-glass tooltip with an accent line (and no second browser tooltip)', tip[0].startswith('Switch to') and float(tip[1]) > .9 and tip[2] and tip[3], tip)
        pg.mouse.move(5, 500)
        sweep = pg.evaluate("(() => { const b = document.createElement('button'); b.className = 'btn'; b.textContent = 'Test'; document.body.appendChild(b); const a = getComputedStyle(b, '::after'); const r = [a.content, a.transform !== 'none']; b.remove(); return r; })()")
        check('P5 text buttons carry the slanted hover fill (hidden until hovered)', sweep[0] in ('""', "''") and sweep[1], sweep)

        # ---- Hold to Delete (Links: the delete button of a link) ----
        pg.keyboard.press('e'); wait_js(pg, "document.body.classList.contains('editing') && !!document.querySelector('.row [data-hold]')", 10000)
        n0 = pg.evaluate("document.querySelectorAll('.cat .row').length")
        pg.evaluate("document.querySelector('.row [data-hold]').click()"); pg.wait_for_timeout(400)
        check('P6 a plain click on a delete button deletes nothing and says to hold it', pg.evaluate("document.querySelectorAll('.cat .row').length") == n0 and 'Hold the button' in pg.evaluate("(document.getElementById('ix-toast') || {}).textContent || ''"))
        pg.hover('.cat .row >> nth=0'); pg.wait_for_timeout(200); btn = pg.query_selector('.row [data-hold]'); bb = btn.bounding_box()
        pg.mouse.move(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); pg.mouse.down(); pg.wait_for_timeout(300); pg.mouse.up(); pg.wait_for_timeout(900)
        check('P7 letting go before the fill ends deletes nothing', pg.evaluate("document.querySelectorAll('.cat .row').length") == n0)
        pg.hover('.cat .row >> nth=0'); pg.wait_for_timeout(200); btn = pg.query_selector('.row [data-hold]'); bb = btn.bounding_box()
        pg.mouse.move(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); pg.mouse.down(); pg.wait_for_timeout(1200); pg.mouse.up()
        until(lambda: pg.evaluate("document.querySelectorAll('.cat .row').length") == n0 - 1, 5000)
        check('P8 holding it for about a second deletes (with Undo as before)', pg.evaluate("document.querySelectorAll('.cat .row').length") == n0 - 1)
        pg.focus('.row [data-hold]'); pg.keyboard.down('Enter'); pg.wait_for_timeout(1200); pg.keyboard.up('Enter')
        until(lambda: pg.evaluate("document.querySelectorAll('.cat .row').length") == n0 - 2, 5000)
        check('P9 holding Enter on it works the same (keyboard)', pg.evaluate("document.querySelectorAll('.cat .row').length") == n0 - 2)
        bar = pg.evaluate("[...document.querySelectorAll('#ix-ebar .ix-eb:not(.ix-ebdone)')].map(x => x.dataset.c)")
        pg.hover('#ix-ebar .ix-eb >> nth=0'); wait_js(pg, "!!document.querySelector('#ix-ebtip.eb')", 3000)
        check('P25 the edit bar: round buttons coloured by what they do, and a light name bubble above on hover (1.65.1)', bar and all(c in ('accent', 'red', 'green', 'blue', 'violet') for c in bar), bar)
        tick = pg.evaluate("(() => { const d = document.querySelector('#ix-ebar .ix-ebdone'); return [getComputedStyle(d).color, getComputedStyle(d).backgroundColor]; })()")
        check('P27 the edit bar\'s Done tick is dark on its light circle, not white on white (1.65.2)', tick[0] == 'rgb(14, 16, 24)' and tick[1] != tick[0], tick)
        pg.mouse.move(5, 5)
        pg.keyboard.press('Escape')

        # ---- count-up (Cards) ----
        cp = ctx.new_page(); cp.add_init_script("window.__seen = []; new MutationObserver(m => { const b = document.querySelector('#stats .stat b'); if (b) window.__seen.push(b.textContent); }).observe(document, {subtree: true, childList: true, characterData: true})")
        cp.goto(s.base + '/web/cards/'); wait_js(cp, "document.querySelectorAll('#stats .stat').length === 4", 20000); cp.wait_for_timeout(1200)
        seen = cp.evaluate("window.__seen"); final = cp.evaluate("[...document.querySelectorAll('#stats .stat b')].map(b => b.textContent)")
        check('P10 Cards: the box numbers roll up when the page opens and end on the real values', len(set(seen)) > 2 and final[0] == seen[-1] and final[2].startswith('₹'), (seen[:6], final))
        cp.close()

        # ---- swipe in Tasks (touch) ----
        tctx = b.new_context(viewport={'width': 390, 'height': 800}, has_touch=True, is_mobile=BROWSER != 'firefox', color_scheme='dark', storage_state=ctx.storage_state())
        tp = tctx.new_page(); tp.on('pageerror', lambda e: errs.append(str(e)[:200]))
        tp.goto(s.base + '/web/tasks/'); wait_js(tp, "!!(window.HUB && HUB.isAdmin()) && !!document.getElementById('qadd')", 20000)
        tp.fill('#qadd', 'Swipe me monthly 20 Nov'); tp.press('#qadd', 'Enter'); wait_js(tp, "[...document.querySelectorAll('.row[data-id]')].some(r => /Swipe me/.test(r.textContent))", 8000); tp.wait_for_timeout(500)
        def swipe(dx):
            return tp.evaluate("""dx => new Promise(res => {
              const row = [...document.querySelectorAll('.row[data-id]')].find(r => /Swipe me/.test(r.textContent)), r = row.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
              const ev = (type, cx) => row.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, pointerType: 'touch', clientX: cx, clientY: y, isPrimary: true }));
              ev('pointerdown', x); let i = 0; const step = () => { i++; ev('pointermove', x + dx * i / 8); if (i < 8) requestAnimationFrame(step); else { ev('pointerup', x + dx); setTimeout(res, 700); } }; requestAnimationFrame(step); })""", dx)
        due0 = tp.evaluate("[...document.querySelectorAll('.row[data-id]')].find(r => /Swipe me/.test(r.textContent)).textContent")
        swipe(-40)
        check('P11 Tasks: a short swipe springs back and changes nothing', tp.evaluate("[...document.querySelectorAll('.row[data-id]')].find(r => /Swipe me/.test(r.textContent)).textContent") == due0)
        swipe(-260); tp.wait_for_timeout(500)
        after = tp.evaluate("[...document.querySelectorAll('.row[data-id]')].find(r => /Swipe me/.test(r.textContent)).textContent")
        check('P12 Tasks: swiping a repeating task far to the left marks it done (it moves to its next date)', after != due0 and 'Undo' in tp.evaluate("document.body.innerText"), (due0[:60], after[:60]))
        tctx.close()

        # ---- (1.65.1) search: full-width results, and Keyboard Shortcuts from "?" ----
        pg.goto(s.base + '/web/info/'); wait_js(pg, "!!document.getElementById('ix-q')", 20000)
        ph = pg.evaluate("document.getElementById('ix-q').placeholder")
        pg.fill('#ix-q', 'mail'); wait_js(pg, "!!document.querySelector('#ix-sres .ix-r')", 8000)
        w = pg.evaluate("(() => { const t = document.querySelector('#ix-sres .ix-r .ix-rx'); return [t.getBoundingClientRect().width, t.querySelector('b').scrollWidth <= t.querySelector('b').clientWidth + 1]; })()")
        check('P19 search results use the row\'s width (the Tools row was squeezed into a 34 px tile and cut off)', w[0] > 150 and w[1], w)
        pg.fill('#ix-q', '?'); wait_js(pg, "[...document.querySelectorAll('#ix-sres .ix-r b')].some(b => b.textContent === 'Keyboard Shortcuts')", 8000)
        first = pg.evaluate("document.querySelector('#ix-sres .ix-r b').textContent")
        pg.keyboard.press('Enter'); wait_js(pg, "!!document.querySelector('#ix-dlg.open .ix-keys')", 5000)
        check('P20 the search box says "? Shortcuts"; typing ? shows Keyboard Shortcuts first and Enter opens the list', 'Shortcuts' in ph and first == 'Keyboard Shortcuts', (ph, first))
        pg.keyboard.press('Escape'); pg.wait_for_timeout(300)

        # ---- (1.65.1) Settings > General: Keyboard Shortcuts; closing that window and changing section still works ----
        pg.goto(s.base + '/web/settings/#general'); wait_js(pg, "!!document.getElementById('ix-keysb')", 20000)
        pg.click('#ix-keysb'); wait_js(pg, "!!document.querySelector('#ix-dlg.open .ix-keys')", 5000)
        pg.keyboard.press('Escape'); pg.evaluate("location.hash = 'backup'")
        until(lambda: pg.evaluate("!!document.getElementById('ix-exp')"), 8000)
        check('P21 Settings > General has View Shortcuts; right after its window closes, another section still opens (it stayed on General)', pg.evaluate("!!document.getElementById('ix-exp')"))

        # ---- (1.65.1) Erase Everything ----
        pg.wait_for_timeout(800); pg.click('.ix-tabbar button[data-tab=start-over]'); pg.wait_for_selector('#ix-rsgo', state='visible')
        er0 = pg.evaluate("(() => { const b = document.getElementById('ix-rsgo'); return [getComputedStyle(b.querySelector('.ix-et')).color, b.querySelector('.ix-ei').offsetWidth < b.offsetWidth / 2]; })()")
        pg.hover('#ix-rsgo'); pg.wait_for_timeout(450)
        er1 = pg.evaluate("(() => { const b = document.getElementById('ix-rsgo'); return [b.querySelector('.ix-ei').offsetWidth >= b.offsetWidth - 2, getComputedStyle(b.querySelector('.ix-et')).color]; })()")
        check('P22 Erase Everything: white words and an X; on hover the X fills the button and the words fade', er0 == ['rgb(255, 255, 255)', True] and er1 == [True, 'rgba(0, 0, 0, 0)'], (er0, er1))
        pg.mouse.move(5, 5)

        # ---- (1.65.1) hover glow ----
        pg.goto(s.base + '/web/cards/'); wait_js(pg, "!!document.getElementById('fmore')", 20000); pg.wait_for_timeout(600)
        g0 = pg.evaluate("getComputedStyle(document.getElementById('fmore')).boxShadow"); pg.hover('#fmore'); pg.wait_for_timeout(450)
        g1 = pg.evaluate("getComputedStyle(document.getElementById('fmore')).boxShadow")
        check('P23 a button that showed no change on hover (Cards: More Filters) now glows softly', g1 != g0 and g1 != 'none', (g0, g1))
        pg.mouse.move(5, 5)

        # ---- (1.65.1) What's New ----
        pg.evaluate("localStorage.removeItem('ix-seen-ver')"); pg.goto(s.base + '/web/settings/#overview')   # one load: a reload would cancel the Overview's own request (WebKit reports that as a page error)
        wait_js(pg, "!!document.querySelector('.ix-ec.ix-new')", 20000)
        bm = pg.evaluate("(() => { const st = getComputedStyle(document.querySelector('.ix-ec.ix-new'), '::before'); return [st.animationName, st.backgroundImage.includes('conic-gradient')]; })()")
        check('P24 What\'s New: a light runs around a calm border (no heavy outline)', bm == ['ix-beam', True], bm)
        pg.wait_for_load_state('networkidle')

        # ---- (1.65.3) the Accent Color picker ----
        pg.goto(s.base + '/web/settings/#look'); wait_js(pg, "document.querySelectorAll('.ix-apk [data-c]').length === 10", 20000); pg.wait_for_timeout(400)
        n = pg.evaluate("document.querySelectorAll('.ix-apk [data-c]').length")
        pg.hover('.ix-apk [data-c="#3b82f6"]'); pg.wait_for_timeout(700)
        sc = pg.evaluate("[...document.querySelectorAll('.ix-apk [data-c]')].map(b => { const m = getComputedStyle(b).transform; return m === 'none' ? 1 : Math.round(parseFloat(m.split('(')[1]) * 100) / 100; })")
        bub = pg.evaluate("getComputedStyle(document.querySelector('.ix-apk [data-c=\"#3b82f6\"]'), '::before').opacity")
        check('P28 Accent Color: ten squares; the one under the mouse grows 1.5x, its neighbours 1.3x and 1.15x, and its code shows in a bubble', n == 10 and sc[6] == 1.5 and sc[5] == 1.3 and sc[7] == 1.3 and sc[4] == 1.15 and sc[8] == 1.15 and sc[0] == 1 and float(bub) > .9, (n, sc, bub))
        pg.click('.ix-apk [data-c="#3b82f6"]'); pg.mouse.move(5, 5); pg.wait_for_timeout(300)
        ch = pg.evaluate("(() => { const b = document.querySelector('.ix-apk [data-c=\"#3b82f6\"]'); return [b.getAttribute('aria-pressed'), b.getAttribute('aria-label'), document.getElementById('ix-acch').value, getComputedStyle(document.documentElement).getPropertyValue('--ix-accent').trim().toLowerCase()]; })()")
        check('P29 a click chooses it: marked chosen (for screen readers too), the hex box follows and the site previews the colour', ch == ['true', 'Accent color #3b82f6, chosen', '#3b82f6', '#3b82f6'], ch)
        pg.focus('.ix-apk [data-c="#3b82f6"]'); pg.keyboard.press('ArrowRight'); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
        kb = pg.evaluate("[document.activeElement.dataset.c, document.getElementById('ix-acch').value, [...document.querySelectorAll('.ix-apk [data-c]')].filter(b => b.tabIndex === 0).length]")
        check('P30 the arrow keys move along the row (one Tab stop) and Enter chooses', kb == ['#0ea5e9', '#0ea5e9', 1], kb)
        pg.click('#ix-discard') if pg.query_selector('#ix-discard:not([disabled])') else None

        # ---- (1.66.0) the Settings menu: colour tiles with icons, a highlight that glides to the chosen section in its colour ----
        pg.goto(s.base + '/web/settings/#security'); wait_js(pg, "!!document.querySelector('.ix-snav [data-sec=security][aria-current=page]')", 20000); pg.wait_for_timeout(700)
        until(lambda: pg.evaluate("(() => { const n = document.querySelector('.ix-snav'), on = n.querySelector('[aria-current=page]'), hl = n.querySelector('.ix-shl'); return !!hl && Math.round(hl.getBoundingClientRect().top) === Math.round(on.getBoundingClientRect().top); })()"), 4000)   # the highlight glides there (slower in WebKit)
        mn = pg.evaluate("(() => { const nav = document.querySelector('.ix-snav'), on = nav.querySelector('[aria-current=page]'), hl = nav.querySelector('.ix-shl'); return [nav.querySelectorAll('[data-sec] .ix-sti svg path, [data-sec] .ix-sti svg rect').length > 15, Math.round(hl.getBoundingClientRect().top) === Math.round(on.getBoundingClientRect().top), getComputedStyle(nav).getPropertyValue('--hc').trim(), [...nav.querySelectorAll('.ix-sgl')].map(e => e.textContent), !!nav.querySelector('.ix-scard .ix-out[data-ix=logout]')]; })()")
        check('P31 Settings menu: every section has a colour tile with its icon; the highlight sits on the chosen one in its colour; Web, Data, System; Log Out in the site card', mn == [True, True, '#22c55e', ['Web', 'Data', 'System'], True], mn)
        pg.click('.ix-snav [data-sec=health]'); pg.wait_for_timeout(700)
        hc = pg.evaluate("(() => { const nav = document.querySelector('.ix-snav'), on = nav.querySelector('[aria-current=page]'), hl = nav.querySelector('.ix-shl'); return [on.dataset.sec, Math.round(hl.getBoundingClientRect().top) === Math.round(on.getBoundingClientRect().top), getComputedStyle(nav).getPropertyValue('--hc').trim()]; })()")
        check('P32 choosing another section moves the highlight there and takes its colour', hc == ['health', True, '#f43f5e'], hc)
        pg.click('.ix-snav [data-sec=security]'); wait_js(pg, "!!document.querySelector('#ix-pane .ix-tile-i')", 15000)
        lay = pg.evaluate("(() => { const n = document.querySelector('.ix-snav'), t = document.querySelector('#ix-pane .ix-ph h2'); return [getComputedStyle(n).position, Math.abs(n.getBoundingClientRect().top - t.getBoundingClientRect().top) < 12, getComputedStyle(document.querySelector('.ix-snh')).display, getComputedStyle(document.querySelector('#ix-pane .ix-ec-i, #ix-pane .ix-th-i, #ix-pane .ix-tile-i, #ix-pane .ix-hero-i')).backgroundImage.includes('gradient')]; })()")
        check('P37 the menu stays in place while scrolling and starts level with the page title, without a small "Settings" label; the page tiles are solid colour (1.66.1)', lay == ['sticky', True, 'none', True], lay)

        # ---- (1.66.0) one step bar: Guided Setup (one step at a time, Next), Telegram Setup (one card at a time), Updates (not clickable) ----
        pg.goto(s.base + '/web/settings/#setup'); wait_js(pg, "!!document.querySelector('.ix-sbar .ix-sbi.now')", 20000)
        g0 = pg.evaluate("[document.querySelectorAll('.ix-sbar .ix-sbi').length, document.querySelector('.ix-sbar .ix-sbi.now b').textContent, document.querySelectorAll('.ix-steps.ix-one > .ix-step.open').length, [...document.querySelectorAll('.ix-steps.ix-one > .ix-step')].filter(e => e.checkVisibility()).length]")
        pg.click('.ix-sbnav [data-open] >> text=Next'); wait_js(pg, "document.querySelector('.ix-sbar .ix-sbi.now b').textContent !== %r" % g0[1], 8000)
        g1 = pg.evaluate("document.querySelector('.ix-sbar .ix-sbi.now b').textContent")
        check('P33 Guided Setup: a bar of five steps, one step on screen, Next moves the bar on', g0[0] == 5 and g0[2] == 1 and g0[3] == 1 and g1 != g0[1], (g0, g1))
        pg.goto(s.base + '/web/settings/#telegram/setup'); wait_js(pg, "!!document.querySelector('.ix-stps.ix-one')", 20000)
        t0 = pg.evaluate("[[...document.querySelectorAll('.ix-stps.ix-one > li')].filter(e => !e.hidden).length, document.querySelector('.ix-sbar .ix-sbi.now b').textContent]")
        pg.click('.ix-sbar [data-stp=\"3\"]'); t1 = pg.evaluate("[[...document.querySelectorAll('.ix-stps.ix-one > li')].filter(e => !e.hidden).map(e => e.querySelector('.ix-stt').textContent), document.querySelector('.ix-sbar .ix-sbi.now b').textContent]")
        check('P34 Telegram Setup: the bar shows one step card at a time; clicking a step in the bar shows that one', t0[0] == 1 and t1 == [['Send a Test'], 'Send a Test'], (t0, t1))
        pg.goto(s.base + '/web/settings/#updates'); wait_js(pg, "!!document.querySelector('.ix-sbar.locked')", 20000)
        u0 = pg.evaluate("[document.querySelectorAll('.ix-sbar.locked .ix-sbi').length, document.querySelectorAll('.ix-sbar.locked button').length, document.querySelector('.ix-sbar.locked .ix-sbi.now b').textContent]")
        check('P35 Updates: the same bar shows where an update is, with no clickable steps', u0 == [4, 0, 'Upload the Zip'], u0)

        # ---- Presets and Surprise Me ----
        pg.goto(s.base + '/web/settings/#themes'); wait_js(pg, "!!document.getElementById('ix-sur') && !!document.getElementById('ix-surn').textContent", 20000)
        cards = pg.evaluate("[...document.querySelectorAll('#ix-pgrid .ix-preset')].slice(0, 3).map(c => [!!c.querySelector('.ix-pv i em'), c.querySelectorAll('.ix-pv b').length, !!c.querySelector('.ix-pn'), !!c.querySelector('.ix-pgl')])")
        check('P13 Presets: each card is a small page (bar, two boxes) with its name and group', cards and all(c == [True, 2, True, True] for c in cards), cards)
        names, ok = [], True
        for i in range(5):
            names.append(pg.inner_text('#ix-surn'))
            mix = pg.evaluate("(() => { const v = document.querySelector('#ix-surpv .ix-pv'), b = v.querySelector('b'), ems = b.querySelectorAll('em'), rgb = c => '#' + c.match(/\\d+/g).slice(0, 3).map(n => (+n).toString(16).padStart(2, '0')).join(''); return [rgb(getComputedStyle(b).backgroundColor), rgb(getComputedStyle(ems[0]).backgroundColor), rgb(getComputedStyle(ems[1]).backgroundColor)]; })()")
            ok = ok and pg.evaluate(CONTRAST, [mix[1], mix[0]]) >= 7 and pg.evaluate(CONTRAST, [mix[2], mix[0]]) >= 4.5
            pg.click('#ix-sura'); wait_js(pg, "!document.getElementById('ix-sura').disabled", 5000)
        check('P14 Surprise Me makes a new named mix each time, every one easy to read (text 7:1, muted 4.5:1 on the boxes)', len(set(names)) >= 3 and ok, names)
        pg.click('#ix-suru'); pg.wait_for_timeout(500)
        check('P15 Use It puts the mix on and waits for Save Settings', 'is on' in pg.evaluate("(document.getElementById('ix-toast') || {}).textContent || ''") and pg.evaluate("!!document.querySelector('#ix-sf') && !document.querySelector('#ix-sf').hidden"))
        # ---- (1.67.0) the bar: page colour tiles, a glowing line under the current page, the search border, the tray of tiles ----
        pg.goto(s.base + '/web/info/'); wait_js(pg, "!!document.querySelector('#ix-bar .ix-pline')", 20000)
        pg.evaluate("document.documentElement.dataset.theme = 'dark'"); pg.wait_for_timeout(500)
        pt = pg.evaluate("(() => { const a = [...document.querySelectorAll('#ix-bar .ix-links a[data-page]')]; return [a.length, a.every(x => !!x.querySelector('.ix-pt svg')), new Set(a.map(x => getComputedStyle(x).getPropertyValue('--c').trim())).size, getComputedStyle(document.querySelector('#ix-bar .ix-links a[aria-current=page] .ix-pt svg')).stroke]; })()")
        check('P39 every page in the bar has its own colour tile with a white icon (1.67.0; Home left out since 1.67.1: the logo leads there)', pt == [6, True, 6, 'rgb(255, 255, 255)'], pt)
        ln = pg.evaluate("(() => { const l = document.querySelector('#ix-bar .ix-pline'), c = document.querySelector('#ix-bar .ix-links a[aria-current=page]').getBoundingClientRect(), r = l.getBoundingClientRect(), b = document.getElementById('ix-bar').getBoundingClientRect(), st = getComputedStyle(l); return [r.left >= c.left - 1 && r.right <= c.right + 1, r.width > 20, Math.abs(r.bottom - b.bottom) <= 2, st.backgroundColor, st.boxShadow.split('px').length]; })()")
        pg.evaluate("document.documentElement.dataset.theme = 'light'"); pg.wait_for_timeout(500)
        lite = pg.evaluate("getComputedStyle(document.querySelector('#ix-bar .ix-pline')).boxShadow.split('px').length")
        check('P40 a line in the page\'s colour sits under the current page at the foot of the bar, with a stronger glow in dark mode than in light (1.67.0)', ln[:4] == [True, True, True, 'rgb(168, 85, 247)'] and ln[4] > lite, (ln, lite))
        pg.evaluate("document.documentElement.dataset.theme = 'dark'"); pg.wait_for_timeout(300)
        sb = pg.evaluate("(() => { const b = document.getElementById('ix-sbox'); return [!!b.querySelector('.ix-sring'), !!b.querySelector('.ix-sglow'), getComputedStyle(b).getPropertyValue('--g1').trim() !== '', getComputedStyle(b.querySelector('.ix-sring'), '::before').transform]; })()")
        pg.click('#ix-q'); pg.wait_for_timeout(300)
        sf = pg.evaluate("getComputedStyle(document.querySelector('#ix-sbox .ix-sring'), '::before').transform")
        pg.keyboard.press('Escape')
        check('P41 the search has a border and glow in the page\'s colour that turns when clicked in (1.67.0)', sb[:3] == [True, True, True] and sf != sb[3], (sb, sf))
        tr = pg.evaluate("(() => { const t = document.querySelector('#ix-bar .ix-tools'), st = getComputedStyle(t); return [t.querySelectorAll('.ix-tt').length >= 3, !!t.querySelector('.ix-tdiv') && t.querySelector('.ix-tdiv').offsetWidth === 1, parseFloat(st.borderTopLeftRadius) >= 10, [...t.querySelectorAll('.ix-tt svg')].every(v => getComputedStyle(v).stroke === 'rgb(255, 255, 255)'), document.documentElement.scrollWidth <= innerWidth]; })()")
        check('P42 the right side is one rounded tray of small colour tiles with a line before Settings, and the page never scrolls sideways (1.67.0)', tr == [True, True, True, True, True], tr)
        pg.set_viewport_size({'width': 390, 'height': 800}); pg.wait_for_timeout(500)
        ph = pg.evaluate("[document.documentElement.scrollWidth <= innerWidth, document.querySelectorAll('#ix-bar .ix-tools .ix-tt').length > 0]")
        check('P43 on a phone the bar still fits, the tiles stay (1.67.0)', ph == [True, True], ph)
        pg.set_viewport_size({'width': 1280, 'height': 860}); pg.wait_for_timeout(300)
        # ---- (1.67.1) Home: the logo and name lead there, so the top bar leaves it out; on the start page the logo is the current page ----
        hm = pg.evaluate("(() => { const b = document.querySelector('#ix-bar .ix-brand'); return [!document.querySelector('#ix-bar .ix-links a[data-page=home]'), !!b && b.getAttribute('href') !== null, b && b.querySelector('.ix-bname').textContent.length > 0]; })()")
        check('P44 the top bar has no Home link; the logo and site name link to the start page (1.67.1)', hm == [True, True, True], hm)
        s.php("hub_settings_update(function ($x) { $x['homeBar'] = true; return $x; });")   # the start page shows the bar only when asked
        pg.goto(s.base + '/'); wait_js(pg, "!!document.querySelector('#ix-bar .ix-brand')", 20000)
        check('P44b ...and on the start page the logo is marked as the current page', pg.evaluate("document.querySelector('#ix-bar .ix-brand').getAttribute('aria-current')") == 'page')
        s.php("hub_settings_update(function ($x) { $x['homeBar'] = false; return $x; });")
        # ---- (1.67.1) Settings fetches its script and styles once (a prefetch used to fetch them a second time) ----
        sp = b.new_context(viewport={'width': 1280, 'height': 860}).new_page(); browser_login(sp, s.base)
        sp.goto(s.base + '/web/settings/#overview'); wait_js(sp, "!!document.querySelector('#ix-pc, #ix-page')", 20000); sp.wait_for_timeout(2500)
        got = sp.evaluate("['shell-admin.js', 'shell-settings.css'].map(f => performance.getEntriesByType('resource').filter(r => r.name.includes(f)).length)")
        check('P45 the Settings page loads shell-admin.js and shell-settings.css once each (1.67.1)', got == [1, 1], got)
        sp.context.close()
        # ---- (1.67.1) a dropdown added later, or filled later, still becomes buttons (the watcher now looks only at what was added) ----
        sg = pg.evaluate("""async () => { const d = document.createElement('div'); d.innerHTML = '<label for=zz1>A</label><select id=zz1 data-ix-seg><option value=a>A</option><option value=b>B</option></select>';
            document.body.append(d); const s2 = document.createElement('select'); s2.setAttribute('data-ix-seg', ''); d.append(s2);
            await new Promise(r => setTimeout(r, 50)); s2.innerHTML = '<option value=x>X</option><option value=y>Y</option>'; await new Promise(r => setTimeout(r, 50));
            const r = [!!d.querySelector('#zz1 + .ix-sgc'), !!(s2.nextElementSibling && s2.nextElementSibling.classList.contains('ix-sgc')), s2.nextElementSibling ? s2.nextElementSibling.children.length : 0]; d.remove(); return r; }""")
        check('P46 a two-choice dropdown added later becomes buttons, also one whose choices are filled in later (1.67.1)', sg == [True, True, 2], sg)
        # ---- (1.67.1) the dock: every page shows its tile, the dock fits on a phone, and it steps aside while editing ----
        s.php("hub_settings_update(function ($x) { $x['nav'] = 'dock'; return $x; });")
        dk = {}
        for w, hgt in ((1440, 900), (390, 800)):
            dp = b.new_context(viewport={'width': w, 'height': hgt}).new_page(); browser_login(dp, s.base)
            dp.goto(s.base + '/web/links/'); wait_js(dp, "!!document.querySelector('#ix-bar .ix-pill') && !!(window.HUB && HUB.isAdmin())", 20000); dp.wait_for_timeout(600)
            dk[w] = dp.evaluate("""(() => { const a = [...document.querySelectorAll('#ix-bar .ix-links a')], pill = document.querySelector('#ix-bar .ix-pill').getBoundingClientRect(), fab = document.querySelector('#ix-bar .ix-fab');
                const fr = fab && fab.offsetParent ? fab.getBoundingClientRect() : null;
                return [a.length, a.every(x => x.querySelector('.ix-pt').getBoundingClientRect().width > 20), a.every(x => { const r = x.getBoundingClientRect(); return r.right <= pill.right + 1 && (!fr || r.right <= fr.left); }), document.documentElement.scrollWidth <= innerWidth]; })()""")
            if w == 1440:
                vis = "getComputedStyle(document.getElementById('ix-bar')).visibility"
                dp.evaluate("document.querySelector('[data-hub=toggle]').click()"); wait_js(dp, "document.body.classList.contains('editing')", 10000)
                until(lambda: dp.evaluate(vis) == 'hidden', 3000); hid = dp.evaluate(vis)   # it hides once it has slid away (0.26 s; slower on a busy machine)
                dp.evaluate("document.querySelector('[data-hub=toggle]').click()"); wait_js(dp, "!document.body.classList.contains('editing')", 10000)
                until(lambda: dp.evaluate(vis) == 'visible', 3000); back = dp.evaluate(vis)
            dp.context.close()
        s.php("hub_settings_update(function ($x) { $x['nav'] = 'top'; return $x; });")
        check('P47 dock: all 7 pages show their colour tile (they were hidden), inside the pill, on a computer and a phone, nothing scrolls sideways (1.67.1)', dk[1440] == [7, True, True, True] and dk[390] == [7, True, True, True], dk)
        check('P48 dock: it steps aside while a page is in edit mode and comes back on Done (1.67.1)', hid == 'hidden' and back == 'visible', (hid, back))
        check('P36 no page error', not errs, errs)
        b.close()
finally:
    stop_all()
sys.exit(check.done())
