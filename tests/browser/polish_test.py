#!/usr/bin/env python3
"""The touches of 1.65.0 and 1.65.1, each on a real page: the on/off switches (white track, metal knob) everywhere, the theme button in the bar,
the tooltip on icon-only buttons, the button hover, the loader, Hold to Delete (a click never deletes, a hold does, also by keyboard),
swipe in Tasks (touch), the count-up numbers in Cards, and the Presets screen with Surprise Me (a new readable mix each time).
1.65.1: the logged-out Settings card, the login window, search results at full width, Keyboard Shortcuts in search and in Settings > General,
the What's New light, Erase Everything, the hover glow and the edit bar. 1.67.0: the bar's colour tiles, line, search border and tray.
    python3 tests/browser/polish_test.py build/site-update-X.Y.Z.zip [--browser chromium|firefox|webkit]   (port 8979)"""
import json, os, re, subprocess, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import SEED, Site, Checks, stop_all, browser_login, wait_js, browser_name, launch, until, browser_set_passphrase, page_errors
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
        errs = []; page_errors(pg, errs)
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
        sw = pg.evaluate("(() => { const c = document.querySelector('#setDlg input.ix-sw'), r = {width: c.offsetWidth, height: c.offsetHeight}, st = getComputedStyle(c), k = getComputedStyle(c, '::after'); return [c.type, Math.round(r.width), Math.round(r.height), k.backgroundColor, k.boxShadow !== 'none']; })()")
        check('P1 the on/off switch is a real checkbox, 52 x 26, a recessed track and a white pill with a shadow (1.77.2)', sw[:3] == ['checkbox', 52, 26] and sw[3] == 'rgb(255, 255, 255)' and sw[4], sw)
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
        sweep = pg.evaluate("(() => { const b = document.createElement('button'); b.className = 'btn'; b.textContent = 'Test'; document.body.appendChild(b); const a = getComputedStyle(b, '::after'); const r = [a.content, a.clipPath.startsWith('polygon')]; b.remove(); return r; })()")
        check('P5 text buttons carry the corner sweep hover fill (clipped away until hovered, 1.77.2)', sweep[0] in ('""', "''") and sweep[1], sweep)

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
        check('P27 the edit bar\'s Done tick is dark on its light circle, not white on white (1.65.2)', sum(int(x) for x in re.findall(r'\d+', tick[0])[:3]) < 150 and tick[1] != tick[0], tick)
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
        tp = tctx.new_page(); page_errors(tp, errs)
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

        # ---- (1.65.1) Settings > Start Here (General before 1.70.0): Keyboard Shortcuts; closing that window and changing section still works ----
        pg.goto(s.base + '/web/settings/#features'); wait_js(pg, "!!document.getElementById('ix-keysb')", 20000)
        pg.click('#ix-keysb'); wait_js(pg, "!!document.querySelector('#ix-dlg.open .ix-keys')", 5000)
        pg.keyboard.press('Escape'); pg.evaluate("location.hash = 'backup'")
        until(lambda: pg.evaluate("!!document.getElementById('ix-exp')"), 8000)
        check('P21 Settings > Features has View Shortcuts; right after its window closes, another section still opens (it stayed on Start Here)', pg.evaluate("!!document.getElementById('ix-exp')"))

        # ---- (1.65.1) Erase Everything ----
        pg.wait_for_timeout(800); pg.click('.ix-tabbar button[data-tab=start-over]'); pg.click('#ix-rsst .ix-st-next'); pg.click('#ix-rsst .ix-st-next'); pg.wait_for_selector('#ix-rsgo', state='visible'); pg.mouse.move(5, 5); pg.wait_for_timeout(500)   # (1.69.0) a Stepper: two steps before the button (the mouse leaves the spot of Continue)
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


        # ---- (1.65.3) the Accent Color picker (Appearance > Colors since 1.70.0) ----
        pg.goto(s.base + '/web/settings/#colors'); wait_js(pg, "document.querySelectorAll('.ix-apk [data-c]').length === 10", 20000); pg.wait_for_timeout(400)
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

        # ---- (1.66.0) Telegram Setup, Updates (a step bar that is not clickable) ----
        pg.goto(s.base + '/web/settings/#telegram/setup'); wait_js(pg, "!!document.querySelector('#nt-tok')", 20000)
        t0 = pg.evaluate("[[...document.querySelectorAll('[data-tg=bot] .ix-srow-t')].map(e => e.firstChild.textContent), document.querySelectorAll('.ix-sbar, .ix-sbnav').length, document.querySelectorAll('[data-tg=bot] .ix-ec .ix-srow .ix-pill').length, document.querySelectorAll('[data-tg=bot] .ix-ec').length]")
        check('P34 Telegram Setup is one box with two numbered rows, Create Your Bot and Connect and Test, each with its state, no step bar and no Back / Next (1.78.1)', t0 == [['Create Your Bot', 'Connect and Test'], 0, 2, 1], t0)
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
        ln = pg.evaluate("(() => { const l = document.querySelector('#ix-bar .ix-pline'), c = document.querySelector('#ix-bar .ix-links a[aria-current=page]'), st = getComputedStyle(c); return [getComputedStyle(l).display, st.backgroundColor.startsWith('rgba(') || st.backgroundColor.startsWith('color('), st.boxShadow.includes('inset')]; })()")
        check('P40 the current page is a tinted pill in its own colour with a thin ring, and no line under it (the dock look, now in the top bar too, 1.74.1)', ln == ['none', True, True], ln)
        pg.evaluate("document.documentElement.dataset.theme = 'dark'"); pg.wait_for_timeout(300)
        sb = pg.evaluate("(() => { const b = document.getElementById('ix-sbox'); return [!!b.querySelector('.ix-sring'), !!b.querySelector('.ix-sglow'), !!b.querySelector('.ix-spk'), getComputedStyle(b.querySelector('.ix-fbtn'), '::before').content]; })()")
        check('P41 the search is a plain field: no shining border, glow or spark, and no turning light on its filter button (shine removed in 1.74.1)', sb[:3] == [False, False, False] and sb[3] in ('none', 'normal'), sb)
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
        # ---- (1.68.0) Bar Glass: off by default; Settings > Appearance turns it on; the top bar and the dock's pill become glass ----
        kind = 'glass-surface--svg' if BROWSER == 'chromium' else 'glass-surface--fallback'   # Safari and Firefox get the frosted glass
        GL = """(() => { const e = document.querySelector('.glass-surface'), f = document.querySelector('#ix-glass-f feImage'), c = e && getComputedStyle(e);
            return { el: e ? (e.id || e.className.split(' ')[0]) : null, cls: e ? e.className : '', bf: c ? c.backdropFilter : '', gb: c ? c.getPropertyValue('--gb').trim() : '',
              map: f && e ? [f.getAttribute('href').slice(0, 18), f.getAttribute('width') === '100%' && f.getAttribute('height') === '100%', f.getAttribute('href').includes('width%3D%22' + Math.round(e.offsetWidth) + '%22')] : null,
              js: [...document.scripts].filter(x => /glass\.js/.test(x.src)).length, attr: document.documentElement.hasAttribute('data-ix-glass') }; })()"""
        gp = b.new_context(viewport={'width': 1440, 'height': 900}).new_page(); page_errors(gp, errs); browser_login(gp, s.base)
        gp.goto(s.base + '/web/links/'); wait_js(gp, "!!document.querySelector('#ix-bar .ix-links') && !!(window.HUB && HUB.isAdmin())", 20000); gp.wait_for_timeout(500)
        g0 = gp.evaluate(GL)
        check('P49 Bar Glass is off by default: no glass and glass.js is not even loaded (1.68.0)', g0['el'] is None and g0['js'] == 0 and not g0['attr'], g0)
        gp.goto(s.base + '/web/settings/#glass'); wait_js(gp, "!!document.getElementById('ix-glass2')", 20000)   # (1.70.0) the switch is on the Glass tab only
        gp.click('#ix-glass2'); wait_js(gp, "!!document.querySelector('#ix-bar.glass-surface')", 8000)
        pv = gp.evaluate(GL)
        gp.click('#ix-save'); until(lambda: s.php("echo json_encode(hub_settings()['glass']);").strip() == 'true', 8000)
        saved = s.php("echo json_encode(hub_settings()['glass']);").strip()
        gp.goto(s.base + '/web/links/'); wait_js(gp, "!!document.querySelector('#ix-bar.glass-surface')", 20000); gp.wait_for_timeout(400)
        g1 = gp.evaluate(GL)
        check('P50 the Bar Glass switch in Settings > Appearance shows it at once and saves it; the top bar is glass on the next page, with one glass.js (1.68.0)',
              pv['el'] == 'ix-bar' and saved == 'true' and g1['el'] == 'ix-bar' and kind in g1['cls'] and g1['js'] == 1 and g1['attr'], (pv, saved, g1))
        if BROWSER == 'chromium':
            check('P51 Chromium: plain glass by default, with no SVG filter, so nothing is read (and mirrored) from outside the bar (1.68.3)',
                  'url(' not in g1['bf'] and 'saturate(' in g1['bf'], g1)
        check('P52 the default glass is Soft: a little frost (3 px) on every page (1.68.3)', g1['gb'] == '3px', g1['gb'])
        s.php("hub_settings_update(function ($x) { $x['homeBar'] = true; return $x; });")
        gp.goto(s.base + '/'); wait_js(gp, "!!document.querySelector('#ix-bar.glass-surface')", 20000)
        hb = gp.evaluate(GL)['gb']
        s.php("hub_settings_update(function ($x) { $x['nav'] = 'dock'; return $x; });")
        gp.goto(s.base + '/web/info/'); wait_js(gp, "!!document.querySelector('#ix-bar .ix-pill.glass-surface')", 20000); gp.wait_for_timeout(400)
        gp.evaluate("document.documentElement.classList.add('ix-scrolling')"); gp.wait_for_timeout(400)
        scr = gp.evaluate("[getComputedStyle(document.getElementById('ix-bar')).opacity, getComputedStyle(document.getElementById('ix-bar')).transform !== 'none']")
        gp.evaluate("document.documentElement.classList.remove('ix-scrolling')"); gp.wait_for_timeout(400)
        check('P57 while scrolling the dock shrinks but does not fade (a faded dock turned its glass and blur clear) (1.68.1)', scr == ['1', True], scr)
        dk = gp.evaluate("""(() => { const p = document.querySelector('#ix-bar .ix-pill'); return [p.classList.contains('glass-surface'), Math.round(p.getBoundingClientRect().height),
            getComputedStyle(document.getElementById('ix-bar')).viewTransitionName, getComputedStyle(p).viewTransitionName, document.documentElement.scrollWidth <= innerWidth]; })()""")
        check('P53 the dock\'s pill is glass and a little taller; the page-change name sits on the pill, so its glass and blur reach the page under it (1.68.0)',
              hb == '3px' and dk[0] and dk[1] >= 60 and dk[2] == 'none' and dk[3] in ('ix-bar', None) and dk[4], (hb, dk))
        if BROWSER == 'chromium':
            rp = b.new_context(viewport={'width': 1440, 'height': 900}).new_page(); browser_login(rp, s.base)
            rp.context.new_cdp_session(rp).send('Emulation.setEmulatedMedia', {'features': [{'name': 'prefers-reduced-transparency', 'value': 'reduce'}]})
            rp.goto(s.base + '/web/links/'); wait_js(rp, "!!document.querySelector('#ix-bar .ix-pill')", 20000)
            until(lambda: rp.evaluate("!!document.querySelector('.glass-surface')"), 5000)
            rt = rp.evaluate("[matchMedia('(prefers-reduced-transparency: reduce)').matches, !!document.querySelector('#ix-bar .ix-pill.glass-surface')]")
            rp.context.close()
            check('P56 the glass shows also when the system asks for less transparency (Windows with Transparency effects off); the switch decides (1.68.1)', rt == [True, True], rt)
        s.php("hub_settings_update(function ($x) { $x['nav'] = 'side'; return $x; });")
        gp.goto(s.base + '/web/info/'); wait_js(gp, "!!document.querySelector('#ix-bar .ix-links')", 20000); gp.wait_for_timeout(600)
        sd = gp.evaluate(GL)['el']
        check('P54 the sidebar stays as it is with Bar Glass on (1.68.0)', sd is None, sd)
        s.php("hub_settings_update(function ($x) { $x['nav'] = 'top'; $x['homeBar'] = false; return $x; });")
        gp.goto(s.base + '/web/settings/#glass'); wait_js(gp, "!!document.getElementById('ix-glass2') && !!document.querySelector('#ix-bar.glass-surface')", 20000)
        gp.click('#ix-glass2'); wait_js(gp, "!document.querySelector('.glass-surface')", 8000)
        off = gp.evaluate(GL)
        check('P55 switching Bar Glass off takes the glass away at once (1.68.0)', off['el'] is None and not off['attr'], off)
        s.php("hub_settings_update(function ($x) { $x['glass'] = false; return $x; });")
        gp.context.close()
        # ---- (1.68.2) Appearance > Glass tab; no line over the current page in the dock; Hide the Bar While Scrolling ----
        s.php("hub_settings_update(function ($x) { $x['glass'] = true; $x['nav'] = 'top'; return $x; });")
        tp = b.new_context(viewport={'width': 1440, 'height': 900}).new_page(); page_errors(tp, errs); browser_login(tp, s.base)
        tp.goto(s.base + '/web/settings/#glass'); wait_js(tp, "!!document.getElementById('ix-gx-bend') && !!document.querySelector('#ix-bar.glass-surface')", 20000); tp.wait_for_timeout(300)
        GX = """[getComputedStyle(document.getElementById('ix-bar')).backdropFilter, (document.querySelector('#ix-glass-f feDisplacementMap') || {getAttribute: () => ''}).getAttribute('scale'),
            document.documentElement.style.getPropertyValue('--ix-gb'), !!document.querySelector('#ix-sf:not([hidden])')]"""
        cr = BROWSER == 'chromium'   # Safari and Firefox (WebKit here) show the frosted glass: no SVG filter, only frost, tint and saturation
        t0 = tp.evaluate(GX)
        tp.click('[data-seg=gpick] [data-v=frosted]'); until(lambda: tp.evaluate(GX)[2:] == ['14px', True], 3000); t1 = tp.evaluate(GX)   # the bar is shown just after the click (a 0 ms timer)
        tp.click('[data-seg=gpick] [data-v=liquid]'); until(lambda: tp.evaluate(GX)[2] == '3px', 3000); tp.wait_for_timeout(200); t2 = tp.evaluate(GX)
        tp.evaluate("(() => { const r = document.getElementById('ix-gx-bend'); r.value = 90; r.dispatchEvent(new Event('input', {bubbles: true})); })()"); tp.wait_for_timeout(200); t3 = tp.evaluate(GX)
        tp.click('#ix-save'); until(lambda: '"bend":90' in s.php("echo json_encode(hub_settings()['glassFx']);"), 8000)
        kept = s.php("echo json_encode(hub_settings()['glassFx']);").strip()
        tp.goto(s.base + '/web/links/'); wait_js(tp, "!!document.querySelector('#ix-bar.glass-surface')", 20000); tp.wait_for_timeout(500); t4 = tp.evaluate(GX)
        ok = t0[3] is False and t1[2] == '14px' and t1[3] is True and json.loads(kept) == {'bend': 90, 'fringe': 10} and t4[:3] == t3[:3]
        if cr: ok = ok and 'url(' not in t0[0] and 'blur(14px)' in t1[0] and 'url(' not in t2[0]   # (1.68.4) Only Over Photos: Liquid bends on the start page only (P62)
        check('P58 the Glass tab: no Save bar until a change; Frosted and Liquid change the real bar at once, the slider too; Save keeps them for every page (1.68.3, 1.68.4)', ok, (t0, t1, t2, t3, kept, t4))
        tp.goto(s.base + '/web/settings/#glass'); wait_js(tp, "!!document.getElementById('ix-gxr')", 20000)
        tp.click('#ix-gxr'); tp.click('#ix-save'); until(lambda: s.php("echo json_encode(hub_settings()['glassFx']);").strip() in ('[]', '{}'), 8000)
        check('P58b Reset to Default goes back to the built-in glass (nothing kept) (1.68.2)', s.php("echo json_encode(hub_settings()['glassFx']);").strip() in ('[]', '{}'))
        s.php("hub_settings_update(function ($x) { $x['glass'] = false; $x['nav'] = 'dock'; return $x; });")
        tp.goto(s.base + '/web/links/'); wait_js(tp, "!!document.querySelector('#ix-bar .ix-pill')", 20000); tp.wait_for_timeout(300)
        dl = tp.evaluate("getComputedStyle(document.querySelector('#ix-bar .ix-pline')).display")
        s.php("hub_settings_update(function ($x) { $x['nav'] = 'top'; return $x; });")
        tp.goto(s.base + '/web/links/'); wait_js(tp, "!!document.querySelector('#ix-bar .ix-pline')", 20000); tp.wait_for_timeout(300)
        tl = tp.evaluate("getComputedStyle(document.querySelector('#ix-bar .ix-pline')).display")
        s.php("hub_settings_update(function ($x) { $x['nav'] = 'side'; return $x; });")
        tp.goto(s.base + '/web/links/'); wait_js(tp, "!!document.querySelector('#ix-bar .ix-pline')", 20000); tp.wait_for_timeout(300)
        sl = tp.evaluate("[getComputedStyle(document.querySelector('#ix-bar .ix-pline')).display, getComputedStyle(document.querySelector('#ix-bar .ix-links a[aria-current=page]')).boxShadow.includes('inset')]")
        s.php("hub_settings_update(function ($x) { $x['nav'] = 'top'; return $x; });")
        check('P59 no line under the current page in the dock, the top bar or the sidebar: all three tint the page instead (1.74.1)', dl == 'none' and tl == 'none' and sl == ['none', True], (dl, tl, sl))
        # (1.73.3) iPhone app: behind the clock a solid strip sat next to the glass bar (two shades). With Bar Glass on, the glass covers the clock while the bar shows
        STRIP = "getComputedStyle(document.documentElement, '::before').opacity"
        plain = tp.evaluate(STRIP)
        s.php("hub_settings_update(function ($x) { $x['glass'] = true; $x['nav'] = 'top'; return $x; });")
        tp.goto(s.base + '/web/links/'); wait_js(tp, "!!document.querySelector('#ix-bar.glass-surface')", 20000)
        shown = tp.evaluate(STRIP); tp.evaluate("document.documentElement.classList.add('ix-hide')"); hidden = tp.evaluate(STRIP)
        s.php("hub_settings_update(function ($x) { $x['glass'] = false; return $x; });")
        check('P59b Bar Glass on: no solid strip behind the clock while the bar shows (one glass), the strip is back when the bar slides away; glass off: the strip stays (1.73.3)',
              (plain, shown, hidden) == ('1', '0', '1'), (plain, shown, hidden))
        HID = """async () => { document.documentElement.style.scrollBehavior = 'auto'; document.body.style.minHeight = '4000px'; scrollTo(0, 0); await new Promise(r => setTimeout(r, 150));
            for (let i = 1; i <= 8; i++) { scrollTo(0, i * 60); await new Promise(r => setTimeout(r, 40)); } await new Promise(r => setTimeout(r, 300));
            const h = document.documentElement.classList.contains('ix-hide'); scrollTo(0, 0); return h; }"""
        hid_on = tp.evaluate(HID)
        s.php("hub_settings_update(function ($x) { $x['barHide'] = false; return $x; });")
        tp.goto(s.base + '/web/links/'); wait_js(tp, "document.documentElement.hasAttribute('data-ix-nohide') && !!document.getElementById('ix-bar')", 20000); tp.wait_for_timeout(300)
        hid_off = tp.evaluate(HID)
        s.php("hub_settings_update(function ($x) { $x['barHide'] = true; return $x; });")
        tp.goto(s.base + '/web/settings/#nav'); wait_js(tp, "!!document.getElementById('ix-bh')", 20000)
        sw = tp.evaluate("document.getElementById('ix-bh').checked")
        check('P60 Hide the Bar While Scrolling: on, the top bar slides away as you scroll down; off, it stays; the switch is in Appearance > Bar (1.68.2; Look before 1.70.0)', hid_on is True and hid_off is False and sw is True, (hid_on, hid_off, sw))
        tp.context.close()
        # ---- (1.68.4) one glass for the whole site: the Home widgets, Liquid only over photos, Where, Tone / Rim / Saturation ----
        s.php("hub_settings_update(function ($x) { $x['glass'] = true; $x['nav'] = 'top'; $x['homeBar'] = true; $x['glassFx'] = ['frost' => 14, 'tint' => 35, 'sat' => 120]; return $x; });")
        op = b.new_context(viewport={'width': 1440, 'height': 900}).new_page(); page_errors(op, errs); browser_login(op, s.base)
        WG = "(() => { const c = document.querySelector('.wchip, .wcard, .chip, .lg'); if (!c) return null; const st = getComputedStyle(c); return [st.backdropFilter || st.webkitBackdropFilter || '', st.backgroundColor]; })()"
        op.goto(s.base + '/'); until(lambda: op.evaluate(WG) is not None, 15000); op.wait_for_timeout(600); w1 = op.evaluate(WG)
        gs = op.evaluate("document.documentElement.style.getPropertyValue('--ix-gs')")
        s.php("hub_settings_update(function ($x) { $x['glassFx'] = ['solid' => 1]; return $x; });")
        op.goto(s.base + '/'); until(lambda: op.evaluate(WG) is not None, 15000); op.wait_for_timeout(600); w2 = op.evaluate(WG)
        check('P61 the Home widgets use the one glass: Frosted gives them 14 px frost and the saturation (1.68.3 had lost it), Solid takes the see-through away (1.68.4)',
              'blur(14px)' in w1[0] and gs == '1.2' and w2[0] in ('none', '') , (w1, gs, w2))
        if BROWSER == 'chromium':
            s.php("hub_settings_update(function ($x) { $x['glassFx'] = ['bend' => 60, 'fringe' => 10]; return $x; });")
            op.goto(s.base + '/'); until(lambda: op.evaluate(WG) is not None, 15000); until(lambda: 'url(' in (op.evaluate(WG) or [''])[0], 8000); lh = op.evaluate(WG)
            op.goto(s.base + '/web/links/'); wait_js(op, "!!document.querySelector('#ix-bar.glass-surface')", 20000); op.wait_for_timeout(600)
            ll = op.evaluate("[getComputedStyle(document.getElementById('ix-bar')).backdropFilter, document.documentElement.style.getPropertyValue('--ix-gf')]")
            check('P62 Liquid with Only Over Photos (the default): it bends on the start page (the widgets read the Liquid filter) but not on a page of text (1.68.4)',
                  'url(' in lh[0] and 'url(' not in ll[0] and ll[1] == 'blur(0px)', (lh, ll))
        POP = "(() => { const e = document.getElementById('ix-pop'); return e ? getComputedStyle(e).backdropFilter || getComputedStyle(e).webkitBackdropFilter || 'none' : null; })()"
        pops = []
        for on in (0, 1):
            s.php("hub_settings_update(function ($x) { $x['glassFx'] = ['wpop' => %d]; return $x; });" % on)
            op.goto(s.base + '/web/links/'); wait_js(op, "!!document.getElementById('ix-editb') && !!(window.HUB && HUB.isAdmin())", 20000)
            op.click('#ix-editb'); until(lambda: op.evaluate(POP) is not None, 5000); op.wait_for_timeout(300); pops.append(op.evaluate(POP)); op.keyboard.press('Escape')
        check('P63 Where > Menus and Pop-ups: off, the Edit menu is as before; on, it is glass (at least 14 px frost so it stays readable) (1.68.4)', pops[0] in ('none', '') and 'blur(14px)' in pops[1], pops)
        s.php("hub_settings_update(function ($x) { $x['glassFx'] = []; return $x; });")
        op.goto(s.base + '/web/settings/#glass'); wait_js(op, "!!document.getElementById('ix-gx-rim') && !!document.querySelector('.ix-gpv')", 20000)
        op.click('[data-seg=gtone] [data-v="1"]')
        op.evaluate("(() => { const r = document.getElementById('ix-gx-rim'); r.value = 80; r.dispatchEvent(new Event('input', {bubbles: true})); })()"); op.wait_for_timeout(300)
        tv = op.evaluate("[document.documentElement.style.getPropertyValue('--ix-gtc'), document.documentElement.style.getPropertyValue('--ix-grim'), getComputedStyle(document.querySelector('.ix-gpvw')).backgroundColor]")
        op.click('#ix-save'); until(lambda: '"rim":80' in s.php("echo json_encode(hub_settings()['glassFx']);"), 8000)
        kept2 = s.php("echo json_encode(hub_settings()['glassFx']);").strip()
        check('P64 the Glass tab: Tone Light and Rim Light change the glass and the live preview at once, Save keeps them (1.68.4)',
              tv[0] == '#f4f4f1' and tv[1] == '0.8' and json.loads(kept2) == {'tone': 1, 'rim': 80} and ('0.956' in tv[2] or tv[2].startswith('rgba(244')), (tv, kept2))
        s.php("hub_settings_update(function ($x) { $x['glassFx'] = []; $x['glass'] = false; $x['homeBar'] = false; return $x; });")
        op.context.close()
        # ---- (1.68.5) Where > Settings Windows: the page shows through a glass window (a light layer behind it, 55% of its own colour) ----
        s.php("hub_settings_update(function ($x) { $x['glassFx'] = ['wwin' => 1, 'frost' => 0, 'tint' => 10]; return $x; });")
        wp = b.new_context(viewport={'width': 1440, 'height': 900}).new_page(); page_errors(wp, errs); browser_login(wp, s.base)
        wp.goto(s.base + '/web/links/'); wait_js(wp, "document.querySelectorAll('.cat').length > 0 && document.documentElement.hasAttribute('data-ix-gwin')", 20000)
        wp.evaluate("document.getElementById('settingsBtn').click()"); wp.wait_for_selector('#setDlg[open]'); wp.wait_for_timeout(400)
        WIN = """(() => { const d = document.getElementById('setDlg'), a = c => { const m = c.match(/[\\d.]+/g) || []; return m.length > 3 ? +m[3] : 1; };
            const st = getComputedStyle(d); return [a(st.backgroundColor), (st.backdropFilter || st.webkitBackdropFilter || ''), a(getComputedStyle(d, '::backdrop').backgroundColor)]; })()"""
        wg = wp.evaluate(WIN); wp.keyboard.press('Escape')
        s.php("hub_settings_update(function ($x) { $x['glassFx'] = []; return $x; });")
        wp.goto(s.base + '/web/links/'); wait_js(wp, "document.querySelectorAll('.cat').length > 0", 20000)
        wp.evaluate("document.getElementById('settingsBtn').click()"); wp.wait_for_selector('#setDlg[open]'); wp.wait_for_timeout(400)
        wn = wp.evaluate(WIN); wp.context.close()
        check('P65 Where > Settings Windows: the window is see-through glass (55% of its own colour, 14 px frost) over a light layer, so the page shows through; off, windows are as before (1.68.5)',
              0.5 < wg[0] < 0.6 and 'blur(14px)' in wg[1] and wg[2] <= 0.2 and wn[0] > 0.95 and wn[2] >= 0.4, (wg, wn))
        # ---- (1.69.0) the Stepper (React Bits' Stepper, shell.js): Restore, Start Over, the passphrase, New Site Setup and the Home Tour ----
        sp = b.new_context(viewport={'width': 1280, 'height': 900}).new_page(); page_errors(sp, errs); browser_login(sp, s.base)
        sp.goto(s.base + '/web/settings/#backup/restore'); wait_js(sp, "!!document.querySelector('#ix-rst .ix-st-bars') && !!document.querySelector('#ix-imp')", 20000)
        bk = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'stepper-links.json')
        open(bk, 'w').write(json.dumps({'format': 'bookmarks-backup', 'version': 2, 'data': {'settings': {}, 'tabs': [{'id': 'rs1', 'title': 'From Backup', 'categories': [{'id': 'rc1', 'title': 'Saved', 'col': 0, 'links': [{'title': 'Restored Site', 'url': 'https://restored.example.com'}]}]}]}}))
        r0 = sp.evaluate("[document.querySelectorAll('#ix-rst .ix-st-bars i').length, document.querySelectorAll('#ix-rst .ix-st-bars i.on').length]")
        sp.set_input_files('#ix-imp', bk); wait_js(sp, "!!document.querySelector('#ix-impx [data-r=links]') && !document.querySelector('#ix-impx').closest('.ix-st-pane').hidden", 10000)
        r1 = sp.evaluate("[document.querySelectorAll('#ix-rst .ix-st-bars i.on').length, document.querySelector('#ix-rst .ix-st-next').textContent]")
        sp.click('#ix-rst .ix-st-next'); until(lambda: 'From Backup' in json.dumps(s.req(s.base + '/web/links/api.php?action=get')), 15000)
        os.remove(bk)
        check('P66 Restore is a Stepper (bars): a backup file goes straight on to what is inside, and Restore brings it back (1.69.0)',
              r0 == [2, 1] and r1 == [2, 'Restore'] and 'From Backup' in json.dumps(s.req(s.base + '/web/links/api.php?action=get')), (r0, r1))
        sp.wait_for_timeout(1500)   # the page reloads after a restore
        sp.goto(s.base + '/web/settings/#backup/start-over'); wait_js(sp, "!!document.querySelector('#ix-rsst .ix-st-track')", 20000)
        so = [sp.evaluate("[document.querySelectorAll('#ix-rsst .ix-st-seg').length, !!document.getElementById('ix-rsgo'), document.querySelector('#ix-rsst .ix-st-seg[data-n=\"3\"]').disabled]")]
        sp.click('#ix-rsst .ix-st-next'); sp.wait_for_timeout(300)
        so.append(sp.evaluate("[!!document.querySelector('#ix-rsst .ix-st-seg[data-n=\"1\"] .ix-st-badge svg'), document.querySelector('#ix-rsst .ix-st-seg[data-n=\"2\"]').getAttribute('aria-current')]"))
        sp.click('#ix-rsst .ix-st-next'); sp.wait_for_selector('#ix-rsgo'); sp.fill('#ix-rsc', 'erase'); sp.click('#ix-rsgo'); sp.wait_for_timeout(300)
        so.append(sp.inner_text('#ix-rse'))
        # (1.75.0) messages: cards in the bottom right corner, the same message once, a bell for what went away unseen, a list behind it
        pg.goto(s.base + '/web/settings/'); wait_js(pg, "!!window.HUB && !!HUB.toast && !!document.querySelector('.ix-subt')", 20000)
        pg.evaluate("HUB.toast('First note'); HUB.toast('Second note', true); HUB.toast('First note')")
        pg.wait_for_timeout(400)
        nc = pg.evaluate("(() => { const t = document.getElementById('ix-toast'), r = t.getBoundingClientRect(); return [t.querySelectorAll('.ix-nc').length, Math.round(innerWidth - r.right), Math.round(innerHeight - r.bottom), !!t.querySelector('.ix-nc.bad')]; })()")
        check('P70 messages are cards in the bottom right corner, and the same message twice is one card', nc[0] == 2 and nc[1] <= 24 and nc[2] <= 24 and nc[3], nc)
        pg.click('#ix-toast .ix-nc >> nth=0 >> .ix-nx'); pg.click('#ix-toast .ix-nc >> nth=0 >> .ix-nx')
        wait_js(pg, "!document.querySelector('#ix-toast .ix-nc')", 5000)
        pg.mouse.move(5, 5)   # a card that appears under a resting pointer is held (hover keeps it), so the pointer goes away first
        pg.evaluate("HUB.toast('Quiet note')"); wait_js(pg, "!document.querySelector('#ix-toast .ix-nc')", 9000)
        wait_js(pg, "!!document.querySelector('#ix-bell') && !document.querySelector('#ix-bell').hidden", 5000)
        pg.click('#ix-bell'); pg.wait_for_selector('#ix-nlist .ix-nc')
        lst = pg.evaluate("[...document.querySelectorAll('#ix-nlist .ix-nm')].map(e => e.textContent)")
        check('P71 a message that went away unseen is kept behind the bell, newest first', lst[0] == 'Quiet note' and 'Second note' in lst and 'First note' in lst, lst)
        pg.click('#ix-nlist [data-clear]')
        check('P72 Clear empties the list; the bell stays on the page (quiet, no number) so messages can be read again later (1.77.2)', pg.evaluate("!document.getElementById('ix-nlist') && !!document.getElementById('ix-bell') && !document.getElementById('ix-bell').hidden && !document.querySelector('#ix-bell b')"))
        check('P67 Start Over is a Stepper: three steps, a step ahead cannot be clicked, a done step shows a tick, Erase Everything only on the last step and it asks for ERASE (1.69.0)',
              so[0] == [3, False, True] and so[1] == [True, 'step'] and 'Type ERASE' in so[2], so)
        why = browser_set_passphrase(sp, s.base, 'stepper passphrase 1')
        sp.wait_for_selector('#ix-ermk', state='visible'); sp.click('#ix-ermk')   # (1.69.0) the recovery key is made on a click (slow work)
        rc = until(lambda: sp.evaluate("(document.getElementById('ix-rcode') || {}).value || ''"), 30000)
        rk = sp.evaluate("[(document.getElementById('ix-rcode') || {}).value || '', !document.getElementById('ix-rcode').closest('.ix-st-pane').hidden]")
        check('P68 the first passphrase is a Stepper: it is set on step 2; step 3 makes the recovery key on a click and shows it (1.69.0)', not why and rk[0] and rk[1], (why, rk))
        # ---- (1.69.1) the link field (Uiverse itchy-dodo-49, shell.js linkField): a label in front, the field, a copy icon (COPY, then COPIED) ----
        CLIP = "(() => { window.__cp = null; const w = t => { window.__cp = t; return Promise.resolve(); }; try { navigator.clipboard.writeText = w; } catch (e) {} if (!navigator.clipboard || navigator.clipboard.writeText !== w) Object.defineProperty(navigator, 'clipboard', { value: { writeText: w }, configurable: true }); })()"
        rf = sp.evaluate("(() => { const i = document.getElementById('ix-rcode'), f = i.closest('.ix-uf'); return [f.querySelector('.ix-uf-px').textContent, i.readOnly, !!f.querySelector('#ix-ercopy.ix-uf-cp')]; })()")
        sp.evaluate(CLIP); sp.click('#ix-ercopy'); sp.wait_for_timeout(150)
        rf += sp.evaluate("[window.__cp === document.getElementById('ix-rcode').value, document.querySelector('#ix-ercopy .ix-uf-tip').textContent, document.getElementById('ix-ercopy').classList.contains('done')]")
        check('P70 the recovery key sits in the link field: "Key" in front, read-only, and its copy icon copies the key and says COPIED (1.69.1)', rf == ['Key', True, True, True, 'COPIED', True], rf)
        sp.goto(s.base + '/web/settings/#telegram/setup'); wait_js(sp, "!!document.getElementById('nt-url')", 20000); sp.evaluate(CLIP)
        sp.click('#nt-schb'); sp.wait_for_selector('#nt-url', state='visible')   # (1.77.2) the schedule lines open from a toggle
        tg = sp.evaluate("['nt-cmd', 'nt-url'].map(id => { const i = document.getElementById(id); return [i.closest('.ix-uf').querySelector('.ix-uf-px').textContent, i.value]; })")
        sp.locator('#nt-url').locator('xpath=..').locator('.ix-uf-cp').click(); sp.wait_for_timeout(150); cp = sp.evaluate('window.__cp') or ''
        check('P71 Telegram > Setup: the two cron lines are link fields ("Cron", "curl"); the key in the address shows as dots, and Copy gives the whole curl line with the real key (1.69.1)',
              tg[0][0] == 'Cron' and 'cron.php' in tg[0][1] and tg[1][0] == 'curl' and 'key=•••••' in tg[1][1] and cp.startswith('curl -s "http') and 'key=' in cp and '•' not in cp and cp.endswith('"'), (tg, len(cp)))
        sp.goto(s.base + '/web/settings/#telegram/instant-replies'); wait_js(sp, "document.querySelectorAll('.ix-cmdc').length > 0", 20000); sp.evaluate(CLIP)
        sp.click('.ix-cmdc >> nth=3'); wait_js(sp, "window.__cp !== null && !!document.querySelector('.ix-cmdc.ok')", 5000)
        cm = sp.evaluate("[window.__cp, (document.querySelector('.ix-cmdc.ok em') || {}).textContent, document.querySelectorAll('button.ix-cmdc').length]")
        check('P71b Telegram > Instant Replies: each of the 8 commands is a button, and a click copies it (1.78.0)', cm == ['/add Netflix 649 monthly 5 Nov', 'Copied', 8], cm)
        sp.goto(s.base + '/web/links/'); wait_js(sp, "document.querySelectorAll('.cat').length > 0", 20000); sp.evaluate(CLIP)
        sp.evaluate("document.querySelector('[data-hub=toggle]').click()"); sp.wait_for_selector('body.editing', timeout=10000)
        sp.evaluate("document.querySelector('.cat .ctrl .ib[aria-label=\\'Edit link\\']').click()"); sp.wait_for_selector('#linkDlg[open]')   # its buttons show on hover
        lk = [sp.evaluate("[document.querySelector('#linkDlg .ix-uf-px').textContent, document.getElementById('lUrl').value]")]
        sp.fill('#lUrl', 'http://Plain.example.com/a'); lk.append(sp.evaluate("[document.querySelector('#linkDlg .ix-uf-px').textContent, document.getElementById('lUrl').value]"))
        sp.click('#linkDlg .ix-uf-px'); sp.click('#linkDlg .ix-uf-cp'); sp.wait_for_timeout(150)
        lk.append(sp.evaluate("[document.querySelector('#linkDlg .ix-uf-px').textContent, window.__cp, document.querySelector('#linkDlg .ix-uf-tip').textContent]"))
        sp.fill('#lUrl', 'mailto:me@example.com'); lk.append(sp.evaluate("getComputedStyle(document.querySelector('#linkDlg .ix-uf-px')).display"))
        sp.fill('#lUrl', 'https://Plain.example.com/a'); sp.fill('#lTitle', 'Plain'); sp.click('#linkSave')
        saved = until(lambda: [l.get('url') for t in s.req(s.base + '/web/links/api.php?action=get').get('data', {}).get('tabs', []) for c in t.get('categories', []) for l in c.get('links', []) if l.get('title') == 'Plain'], 10000)
        check('P73 Links > Edit Link: the Address field has https:// in front (a tap gives http://), a typed http:// moves into it, another scheme hides it, Copy gives the whole address, and Save keeps the whole address (1.69.1)',
              lk[0][0] == 'https://' and lk[0][1] and not lk[0][1].startswith('http') and lk[1] == ['http://', 'Plain.example.com/a'] and lk[2] == ['https://', 'https://Plain.example.com/a', 'COPIED'] and lk[3] == 'none' and saved == ['https://Plain.example.com/a'], (lk, saved))
        # ---- (1.72.0) phone details: a read-only key wraps instead of being cut off; copying without the clipboard API; the two-step key ----
        sp.set_viewport_size({'width': 320, 'height': 760})
        sp.goto(s.base + '/web/settings/#security/encryption'); wait_js(sp, "!!(window.HUB && HUB.linkField)", 20000)
        kw = sp.evaluate("""(() => { const h = document.createElement('div'); h.style.width = '234px'; h.innerHTML = HUB.linkField({ id: 'tkey', value: 'GKTN-M7EC-GTX5-3QAB-ZZ9K', prefix: 'Key', readonly: true, cls: 'ix-uf-key', wrap: true, copyId: 'tkcp' });
            document.body.appendChild(h); const t = document.getElementById('tkey');
            return [t.tagName, t.readOnly, t.value, t.scrollWidth <= t.clientWidth + 1, t.scrollHeight <= t.clientHeight + 2, t.clientHeight > 50]; })()""")
        check('P74 a read-only key (recovery key, two-step key) wraps onto a second line on a 320 px phone: nothing is cut off (1.72.0)',
              kw == ['TEXTAREA', True, 'GKTN-M7EC-GTX5-3QAB-ZZ9K', True, True, True], kw)
        sp.evaluate("Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }); window.__ex = []; document.execCommand = c => { window.__ex.push(c); return window.__exok; }; window.__exok = true")
        sp.click('#tkcp'); sp.wait_for_timeout(150)
        c1 = sp.evaluate("[window.__ex.join(','), document.getElementById('tkcp').classList.contains('done'), document.querySelector('#tkcp .ix-uf-tip').textContent]")
        sp.evaluate("window.__exok = false; window.__ex = []; document.getElementById('tkcp').classList.remove('done')"); sp.click('#tkcp'); sp.wait_for_timeout(250)
        c2 = sp.evaluate("[window.__ex.join(','), document.getElementById('tkcp').classList.contains('done'), document.activeElement && document.activeElement.id, (document.getElementById('ix-toast') || {}).textContent || '']")
        check('P75 no clipboard API (plain http): the older copy command copies and says COPIED; when that fails too the key is selected and a note says how to copy (1.72.0)',
              c1 == ['copy', True, 'COPIED'] and c2[0] == 'copy' and not c2[1] and c2[2] == 'tkey' and 'Ctrl+C' in c2[3], (c1, c2))
        sp.goto(s.base + '/web/settings/#security/two-step-login'); wait_js(sp, "!!document.getElementById('ix-on')", 20000); sp.click('#ix-on')
        wait_js(sp, "!!document.querySelector('#ix-qr') && !!document.querySelector('.ix-uf-key textarea')", 15000)
        ts = sp.evaluate("(() => { const t = document.querySelector('.ix-uf-key textarea'), c = t.closest('.ix-uf').querySelector('.ix-uf-cp'); return [t.readOnly, /^[A-Z2-7]{16,}$/.test(c.dataset.copy || ''), t.value.replace(/ /g, '') === c.dataset.copy, t.scrollWidth <= t.clientWidth + 1, t.scrollHeight <= t.clientHeight + 2]; })()")
        check('P76 Two-Step Login on a 320 px phone: the key field shows the whole key (spaced) and Copy gives it without spaces (1.72.0)', ts == [True, True, True, True, True], ts)
        sp.context.close()
        ns = Site(ZIP, 8974, setup=False)
        try:
            np_ = b.new_context(viewport={'width': 1280, 'height': 860}).new_page(); page_errors(np_, errs)
            np_.goto(ns.base + '/web/links/'); wait_js(np_, "!!(window.HUB && HUB.login)", 20000)
            np_.evaluate("() => { HUB.login(); }"); wait_js(np_, "!!document.querySelector('#ix-setst .ix-st-next')", 20000)   # a new site: Log In opens the setup
            code = re.search(r'([A-Z0-9]{4}(?:-[A-Z0-9]{4})+|[A-Z0-9]{8,})', open(ns.dir + '/site-data/core/SETUP-CODE.php').read().split('?>')[-1]).group(1)
            np_.click('#ix-setst .ix-st-next'); s1 = np_.inner_text('#ix-setst .ix-st-pane:not([hidden]) .ix-st-err')
            np_.fill('#ix-sc', code); np_.click('#ix-setst .ix-st-next'); np_.fill('#ix-p1', 'short'); np_.fill('#ix-p2', 'short'); np_.click('#ix-setst .ix-st-next')
            s2 = np_.inner_text('#ix-setst .ix-st-pane:not([hidden]) .ix-st-err')
            np_.fill('#ix-p1', 'a good long password'); np_.fill('#ix-p2', 'a good long password'); np_.keyboard.press('Enter')   # Enter goes on too
            wait_js(np_, "!!document.getElementById('ix-sn') && !document.getElementById('ix-sn').closest('.ix-st-pane').hidden", 5000)
            np_.fill('#ix-sn', 'Stepper Site'); np_.click('#ix-setst .ix-st-next')
            until(lambda: ns.get('state').get('setup') is False, 15000); np_.wait_for_load_state(); np_.wait_for_timeout(1500)
            landed = 'security/data-protection' if until(lambda: '/web/settings/' in np_.url and np_.evaluate("!!document.querySelector('#ix-encst')"), 20000) else np_.url   # (1.79.0) the box "Lock my private data next" is ticked: Settings opens at the passphrase steps
            due = np_.evaluate("localStorage.getItem('hl-tour-due')")
            np_.goto(ns.base + '/web/home/'); wait_js(np_, "!!document.querySelector('#hlTour .ix-st-dots')", 15000)
            t1 = np_.evaluate("[document.querySelectorAll('#hlTour .ix-st-dots button').length, !!document.querySelector('.hl-spot')]")
            np_.click('#hlTour .ix-st-skip'); np_.wait_for_timeout(300)
            t2 = np_.evaluate("[!!document.getElementById('hlTour'), localStorage.getItem('hl-tour'), localStorage.getItem('hl-tour-due'), !!document.querySelector('.hl-spot')]")
            check('P69 New Site Setup is a Stepper (Code, Password, Site; each checked before going on; Enter goes on), and the first Home visit after it shows the Home Tour (four cards, the part lit up; Skip ends it for good) (1.69.0)',
                  'code' in s1.lower() and '8 characters' in s2 and ns.get('state').get('siteName') == 'Stepper Site' and due == '1' and t1 == [4, True] and t2 == [False, '1', None, False] and 'security/data-protection' in landed, (s1, s2, due, t1, t2, landed))
            np_.context.close()
        finally:
            ns.p.terminate()
        check('P36 no page error', not errs, errs)
        b.close()
finally:
    stop_all()
sys.exit(check.done())
