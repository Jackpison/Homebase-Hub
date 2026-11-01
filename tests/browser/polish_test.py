#!/usr/bin/env python3
"""The touches of 1.65.0, each on a real page: the on/off switches (white track, metal knob) everywhere, the day/night theme switch in the bar,
the tooltip on icon-only buttons, the button hover, the loader, Hold to Delete (a click never deletes, a hold does, also by keyboard),
swipe in Tasks (touch), the count-up numbers in Cards, and the Presets screen with Surprise Me (a new readable mix each time).
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
        why = browser_login(pg, s.base); check('P0 logged in', not why, why)

        # ---- switches and the theme switch ----
        pg.goto(s.base + '/web/links/'); wait_js(pg, "document.querySelectorAll('.cat').length > 0", 20000)
        pg.evaluate("document.getElementById('settingsBtn').click()"); pg.wait_for_selector('#setDlg[open]')
        sw = pg.evaluate("(() => { const c = document.querySelector('#setDlg input.ix-sw'), r = {width: c.offsetWidth, height: c.offsetHeight}, st = getComputedStyle(c), k = getComputedStyle(c, '::after'); return [c.type, Math.round(r.width), Math.round(r.height), st.backgroundColor, k.backgroundImage.includes('gradient')]; })()")
        check('P1 the on/off switch is a real checkbox, 52 x 26, a white track and a metal knob', sw[:3] == ['checkbox', 52, 26] and sw[3] == 'rgb(255, 255, 255)' and sw[4], sw)
        pg.keyboard.press('Escape')
        t0 = pg.evaluate("document.documentElement.dataset.theme")
        ts = pg.evaluate("(() => { const b = document.querySelector('#ix-bar [data-ix=theme]'); return [b.getAttribute('role'), b.getAttribute('aria-checked'), !!b.querySelector('.ix-tsl')]; })()")
        check('P2 the bar\'s theme button is a day/night switch (role switch, off in dark mode)', ts == ['switch', 'false' if t0 == 'dark' else 'true', True], ts)
        pg.click('#ix-bar [data-ix=theme]')
        wait_js(pg, "document.documentElement.dataset.theme !== %r" % t0, 5000)
        wait_js(pg, "document.querySelector('#ix-bar [data-ix=theme]').getAttribute('aria-checked') === String(document.documentElement.dataset.theme === 'light')", 5000)
        check('P3 clicking it switches the theme and the switch follows', pg.evaluate("document.documentElement.dataset.theme") != t0)
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
        check('P16 no page error', not errs, errs)
        b.close()
finally:
    stop_all()
sys.exit(check.done())
