#!/usr/bin/env python3
"""The site search everywhere (1.72.0): Settings items, Cards, Home's Scratch Pad, Files' names (once Files opened them in this tab),
what a page has unlocked (its own memory, never stored), a small typo, groups with counts, and recent searches.
    python3 tests/browser/search_test.py build/site-update-X.Y.Z.zip [--browser chromium|firefox|webkit]   (port 8988)"""
import os, subprocess, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import SEED, Site, Checks, stop_all, browser_login, wait_js, browser_name, launch, page_errors
from playwright.sync_api import sync_playwright

if len(sys.argv) < 2: sys.exit(__doc__)
BROWSER = browser_name(); ZIP = sys.argv[1]; check = Checks()
GROUPS = "[...document.querySelectorAll('#ix-sres .ix-rh')].map(h => h.childNodes[0].textContent.trim() + (h.querySelector('.ix-rc') ? '=' + h.querySelector('.ix-rc').textContent : ''))"
TITLES = "[...document.querySelectorAll('#ix-sres a.ix-r b')].map(b => b.textContent)"
try:
    s = Site(ZIP, 8988)
    subprocess.run(['php', SEED, s.dir], capture_output=True)
    s.php("require '%s/web/home/lib.php'; pad_write(\"Shopping list\\nCall the plumber about the boiler\\nBuy batteries\");" % s.dir)
    with sync_playwright() as p:
        b = launch(p, BROWSER); print('browser: %s %s' % (BROWSER, b.version))
        ctx = b.new_context(viewport={'width': 1360, 'height': 900}); pg = ctx.new_page(); errs = []
        page_errors(pg, errs)
        why = browser_login(pg, s.base); check('Q0 logged in', not why, why)
        pg.goto(s.base + '/web/links/'); wait_js(pg, "!!document.getElementById('ix-q') && !!(window.HUB && HUB.isAdmin())", 20000)
        def find(q, wait="!!document.querySelector('#ix-sres a.ix-r')"):
            pg.fill('#ix-q', ''); pg.fill('#ix-q', q); wait_js(pg, wait, 10000); pg.wait_for_timeout(150)
            return pg.evaluate(GROUPS), pg.evaluate(TITLES)

        g, t = find('passphrase', "[...document.querySelectorAll('#ix-sres .ix-rh')].some(h => /Settings/.test(h.textContent))")
        href = pg.evaluate("[...document.querySelectorAll('#ix-sres a.ix-r')].filter(a => a.querySelector('b').textContent === 'Encryption Passphrase').map(a => new URL(a.href).hash)")
        check('Q1 Settings items are found: "passphrase" lists Encryption Passphrase, opening Settings › Security › Encryption; the group shows its count',
              'Encryption Passphrase' in t and href == ['#security/encryption'] and any(x.startswith('Settings=') for x in g), (g, t, href))
        g, t = find('pasphrase', "[...document.querySelectorAll('#ix-sres a.ix-r b')].some(b => b.textContent === 'Encryption Passphrase')")
        check('Q2 a small typo still finds it ("pasphrase")', 'Encryption Passphrase' in t, t)
        bank = pg.evaluate("fetch('../cards/api.php', { cache: 'no-store' }).then(r => r.json()).then(j => (j.cards || [])[0] ? j.cards[0].bank : '')")
        g, t = find(bank, "[...document.querySelectorAll('#ix-sres .ix-rh')].some(h => /Cards/.test(h.textContent))")
        chref = pg.evaluate("(() => { const h = [...document.querySelectorAll('#ix-sres .ix-rh')].find(x => /Cards/.test(x.textContent)); const a = h && h.nextElementSibling; return a ? new URL(a.href).pathname + new URL(a.href).hash.slice(0, 3) : ''; })()")
        check('Q3 Cards are found by bank or card name, and the result opens Cards with that search', bool(bank) and any(x.startswith('Cards') for x in g) and chref == '/web/cards/#q=', (bank, g, chref))
        g, t = find('plumber', "[...document.querySelectorAll('#ix-sres .ix-rh')].some(h => /Scratch Pad/.test(h.textContent))")
        check('Q4 Home\'s Scratch Pad is found, line by line', 'Call the plumber about the boiler' in t, (g, t))
        pg.evaluate("sessionStorage.setItem('hub-find-files', JSON.stringify([{ n: 'Tax return 2025.pdf', d: 'Papers' }]))"); pg.evaluate("location.reload()")
        wait_js(pg, "!!document.getElementById('ix-q') && !!(window.HUB && HUB.isAdmin())", 20000)
        g, t = find('tax return', "[...document.querySelectorAll('#ix-sres .ix-rh')].some(h => /Files/.test(h.textContent))")
        check('Q5 Files are found by name once Files has opened them in this tab (only the names are kept, in this tab only)', 'Tax return 2025.pdf' in t, (g, t))
        pg.evaluate("HUB.findHook(() => [{ title: 'Garage code', text: 'the door code is 4711', where: 'Locked tab', href: '#' }])")
        g, t = find('door code', "[...document.querySelectorAll('#ix-sres .ix-rh')].some(h => /Unlocked on This Page/.test(h.textContent))")
        check('Q6 what the page has unlocked is found while you are on it ("Unlocked on This Page")', 'Garage code' in t, (g, t))
        pg.evaluate("[...document.querySelectorAll('#ix-sres a.ix-r')].find(a => a.querySelector('b').textContent === 'Garage code').click()"); pg.wait_for_timeout(300)
        pg.fill('#ix-q', ''); pg.evaluate("document.getElementById('ix-q').blur()"); pg.wait_for_timeout(600); pg.focus('#ix-q')
        wait_js(pg, "!!document.querySelector('#ix-sres a[data-recent]')", 5000)
        rec = pg.evaluate("[...document.querySelectorAll('#ix-sres a[data-recent]')].map(a => a.dataset.recent)")
        pg.click('#ix-sres a[data-recent]'); wait_js(pg, "document.getElementById('ix-q').value === 'door code'", 3000)
        pg.fill('#ix-q', ''); pg.evaluate("document.getElementById('ix-q').blur()"); pg.wait_for_timeout(600); pg.focus('#ix-q')
        wait_js(pg, "!!document.querySelector('#ix-sres [data-recent-clear]')", 5000); pg.click('#ix-sres [data-recent-clear]'); pg.wait_for_timeout(200)
        left = pg.evaluate("localStorage.getItem('hub-srecent')")
        check('Q7 recent searches show in the empty box (on this device), a click searches again, Clear forgets them', rec[:1] == ['door code'] and left is None, (rec, left))
        # ---- (1.72.0) for screen readers: the search box, a step change, the copy; and the keys that do what a swipe does ----
        find('passphrase', "[...document.querySelectorAll('#ix-sres .ix-rh')].some(h => /Settings/.test(h.textContent))"); pg.wait_for_timeout(300)
        sr = pg.evaluate("(() => { const q = document.getElementById('ix-q'), a = document.getElementById(q.getAttribute('aria-activedescendant') || 'x'); return [q.getAttribute('role'), q.getAttribute('aria-expanded'), q.getAttribute('aria-controls'), !!a && a.getAttribute('aria-selected'), (document.getElementById('ix-live') || {}).textContent || '']; })()")
        check('Q9 the search box is a combobox: it says it is open, which list it controls and which result is chosen; how many results is read out',
              sr[0] == 'combobox' and sr[1] == 'true' and sr[2] == 'ix-sres' and sr[3] == 'true' and sr[4].endswith('results'), sr)
        pg.fill('#ix-q', ''); pg.keyboard.press('Escape'); pg.evaluate("document.activeElement && document.activeElement.blur()")
        st = pg.evaluate("""(() => { const h = document.createElement('div'); document.body.appendChild(h);
            HUB.stepper(h, { steps: [{ title: 'Name It', html: '<p>First</p>' }, { title: 'Pick a Colour', html: '<label>Colour <input id="sxin"></label>' }] });
            const p = h.querySelector('.ix-st-pane'); h.querySelector('.ix-st-next').click();
            return [p.getAttribute('role'), p.getAttribute('aria-label'), document.activeElement && document.activeElement.id]; })()""")
        pg.wait_for_timeout(200); live = pg.evaluate("(document.getElementById('ix-live') || {}).textContent || ''")
        check('Q10 a stepper step is a labelled group ("Step 1 of 2: Name It"); Continue moves the focus into the next step and says "Step 2 of 2: Pick a Colour"',
              st == ['group', 'Step 1 of 2: Name It', 'sxin'] and live == 'Step 2 of 2: Pick a Colour', (st, live))
        pg.goto(s.base + '/web/links/'); wait_js(pg, "!!(window.__hubSwipe && HUB.isAdmin())", 20000); pg.evaluate("document.activeElement && document.activeElement.blur()")
        with pg.expect_navigation(timeout=10000): pg.keyboard.press(']')
        nxt = pg.url
        with pg.expect_navigation(timeout=10000): pg.keyboard.press('[')
        check('Q11 the keys ] and [ open the page after and before (what a swipe does on a phone)', '/web/info/' in nxt and '/web/links/' in pg.url, (nxt, pg.url))
        check('Q8 no page error', not errs, errs)
        b.close()
finally:
    stop_all()
sys.exit(check.done())
