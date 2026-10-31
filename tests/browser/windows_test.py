#!/usr/bin/env python3
"""The window audit (1.64.1): every window of Links, Info, Cards, Tasks, Files and Home, opened with sample data, must use the
shared pieces (src/web/hub/core/assets/shell.js and shell.css) and nothing of its own: the frame (title and X, scrolling body,
buttons at the bottom), headings in capitals with the fading line, every field and switch inside a card, round 12 px buttons, round
10 px fields, switches 44 x 26, nothing wider than the window, no empty card, and the focus not on the X. A window added later
that skips them fails here, so the look cannot drift apart again. With HUB_SHEET=<folder> it also writes one picture of every
window there (the contact sheet the owner looks at instead of opening each one).
    python3 tests/browser/windows_test.py build/site-update-X.Y.Z.zip [--browser chromium|firefox|webkit]   (port 8987)"""
import json, os, subprocess, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import SEED, Site, Checks, stop_all, browser_login, wait_js, browser_name, launch, CSP_REPORTER
from playwright.sync_api import sync_playwright

if len(sys.argv) < 2: sys.exit(__doc__)
BROWSER = browser_name(); ZIP = sys.argv[1]; check = Checks(); SHEET = os.environ.get('HUB_SHEET', '')
if SHEET: os.makedirs(SHEET, exist_ok=True)

# one rule set for every window: returns a list of what is wrong
AUDIT = """(id => {
  const d = document.getElementById(id); if (!d || !d.open) return ['not open'];
  const bad = [], body = d.querySelector('.ix-sb,.db'), foot = d.querySelector('.ix-sf,.df,.act,.actions'), vis = e => !!(e.offsetParent || e.getClientRects().length);
  if (!d.classList.contains('ix-sdlg')) bad.push('not an ix-sdlg');
  if (!d.querySelector('.ix-sh .ix-sx, .dh [data-close], .dh .ib')) bad.push('no title bar with a close X');
  if (!body || getComputedStyle(body).overflowY !== 'auto') bad.push('no scrolling body');
  if (!foot) bad.push('no footer');
  if (body) {
    for (const h of body.querySelectorAll('h3,h4,.sh3')) if (vis(h) && !h.closest('.ix-sh') && getComputedStyle(h).textTransform !== 'uppercase') bad.push('heading not in capitals: ' + h.textContent.trim().slice(0, 24));
    const inCard = e => e.closest('.ix-grp,.ix-card,.ix-srow,.ix-sgc,.cmodes,.ix-sb-skip,.hubt-ctl,.sample,details,.split,.prog');
    for (const c of body.querySelectorAll('input:not([type=hidden]),select,textarea')) {
      if (!vis(c) || c.type === 'file') continue;
      if (!inCard(c)) bad.push('a loose ' + c.tagName.toLowerCase() + (c.id ? '#' + c.id : ''));
      if (c.type === 'radio' && !c.closest('.ix-srow,.ix-sgc,[role=radiogroup]')) bad.push('a radio outside a row: ' + c.name);
      if (c.classList.contains('ix-sw')) { const r = c.getBoundingClientRect(); if (Math.round(r.width) !== 44 || Math.round(r.height) !== 26) bad.push('switch ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' ' + c.id); }
      else if (['text', 'search', 'password', 'url', 'number', 'email', 'date', 'time', ''].includes(c.type) && !c.closest('.swatch') && getComputedStyle(c).borderRadius !== '10px') bad.push('field radius ' + getComputedStyle(c).borderRadius + ' ' + (c.id || c.name || c.type));
    }
    for (const g of body.querySelectorAll('.ix-grp')) if (vis(g) && g.getBoundingClientRect().height < 24) bad.push('an empty card');
    if (body.scrollWidth > body.clientWidth + 1) bad.push('wider than the window (' + body.scrollWidth + ' > ' + body.clientWidth + ')');
  }
  for (const b of d.querySelectorAll('.ix-sf button, .df button, .act button, .actions button')) if (vis(b) && getComputedStyle(b).borderRadius !== '12px') bad.push('button radius ' + getComputedStyle(b).borderRadius + ': ' + b.textContent.trim().slice(0, 18));
  if (document.activeElement && document.activeElement.closest('.ix-sx, .dh')) bad.push('the close X has the focus');
  return bad;
})"""
TALL = "for (const d of document.querySelectorAll('dialog[open]')) { d.style.maxHeight='none'; d.style.height='auto'; for (const b of d.querySelectorAll('.ix-sb,.sb,.db,form')) { b.style.maxHeight='none'; b.style.overflow='visible'; } }"


def goto(pg, base, page, ready):
    pg.goto(base + '/web/%s/' % page); wait_js(pg, "!!(window.HUB && HUB.isAdmin()) && (%s)" % ready, 20000); pg.wait_for_timeout(500)


def menu(pg, label):
    """Presses a page's menu item by its label, the way the pencil menu does (the items are the page's own buttons)."""
    wait_js(pg, "!![...document.querySelectorAll('[data-hub=item]')].find(e => e.getAttribute('data-hub-label') === %r)" % label, 10000)
    pg.evaluate("(l => [...document.querySelectorAll('[data-hub=item]')].find(e => e.getAttribute('data-hub-label') === l).click())(%r)" % label)


def audit(name, pg, dlg_id):
    wait_js(pg, "!!(document.getElementById(%r) && document.getElementById(%r).open)" % (dlg_id, dlg_id), 10000); pg.wait_for_timeout(450)
    bad = pg.evaluate(AUDIT, dlg_id)
    if SHEET:
        pg.evaluate(TALL); pg.wait_for_timeout(200)
        pg.query_selector('dialog#' + dlg_id).screenshot(path=os.path.join(SHEET, name.replace(' ', '_') + '.png'))
    check('W %s' % name, not bad, bad)
    pg.keyboard.press('Escape'); pg.evaluate("id => { const d = document.getElementById(id); if (d && d.open) d.close(); }", dlg_id); pg.wait_for_timeout(200)


try:
    s = Site(ZIP, 8987)
    subprocess.run(['php', SEED, s.dir], capture_output=True)
    hdr = {'Content-Type': 'application/json', 'X-Hub-CSRF': s.csrf}
    def links_save(n):
        data = {'tabs': [{'id': 'main', 'title': 'Bookmarks', 'categories': [
            {'title': 'Reading', 'links': [{'title': 'Wikipedia', 'url': 'https://www.wikipedia.org'}, {'title': 'The Guardian %d' % n, 'url': 'https://www.theguardian.com'}]},
            {'title': 'Work', 'links': [{'title': 'GitHub', 'url': 'https://github.com'}]}]}]}
        s.req(s.base + '/web/links/api.php?action=save', json.dumps({'data': data}).encode(), 'POST', dict(hdr, **{'X-Requested-With': 'bookmarks'}))
    links_save(1)
    with sync_playwright() as p:
        b = launch(p, BROWSER); print('browser: %s %s' % (BROWSER, b.version))
        ctx = b.new_context(viewport={'width': 1280, 'height': 900}, color_scheme='dark'); ctx.add_init_script(CSP_REPORTER)
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        why = browser_login(pg, s.base); check('W0 logged in', not why, why)

        # ---- Links ----
        links_ready = "document.querySelectorAll('.cat').length > 0"
        for name, opener, dlg in [('Links Colors', "document.getElementById('colorsBtn').click()", 'colorDlg'), ('Links Text Sizes', "document.getElementById('textBtn').click()", 'textDlg'),
                                  ('Links Fetch Icons', "document.getElementById('iconsBtn').click()", 'iconDlg'), ('Links Settings', "document.getElementById('settingsBtn').click()", 'setDlg'),
                                  ('Links Import and Export', "document.getElementById('importBmBtn').click()", 'impDlg'), ('Links Restore a Version', "document.getElementById('versionsBtn').click()", 'verDlg'),
                                  ('Links Add Link', "document.getElementById('linkDlg').showModal()", 'linkDlg'), ('Links Name', "document.getElementById('nameDlg').showModal()", 'nameDlg'),
                                  ('Links Unlock', "document.getElementById('keyDlg').showModal()", 'keyDlg'), ('Links Edit Tab', "document.querySelectorAll('#tabs .pen')[0].click()", 'hubTabDlg')]:
            links_save(2) if name.endswith('Version') else None
            goto(pg, s.base, 'links', links_ready); pg.evaluate(opener); audit(name, pg, dlg)

        # ---- Info ----
        info_ready = "document.querySelectorAll('.box').length > 0"
        goto(pg, s.base, 'info', info_ready); menu(pg, 'Info Settings'); audit('Info Settings', pg, 'setdlg')
        goto(pg, s.base, 'info', info_ready); pg.evaluate("document.getElementById('bkdlg').showModal()"); audit('Info Export', pg, 'bkdlg')
        goto(pg, s.base, 'info', info_ready); pg.evaluate("document.querySelector('[data-e=colors]').click()"); audit('Info Edit Colors', pg, 'kdlg')
        goto(pg, s.base, 'info', info_ready); pg.evaluate("document.getElementById('uldlg').showModal()"); audit('Info Unlock', pg, 'uldlg')
        goto(pg, s.base, 'info', info_ready); pg.evaluate("document.getElementById('idlg').showModal()"); audit('Info Import Backup', pg, 'idlg')
        goto(pg, s.base, 'info', info_ready); pg.evaluate("document.querySelectorAll('#tabs .pen')[0].click()"); audit('Info Edit Tab', pg, 'hubTabDlg')
        goto(pg, s.base, 'info', info_ready); pg.keyboard.press('e'); pg.wait_for_selector('#ix-ebar:not([hidden])', timeout=10000)
        pg.evaluate("(() => { const b = [...document.querySelectorAll('.box [data-r=cfg]')].find(x => x.offsetParent); if (b) b.click(); })()")
        audit('Info Box Settings', pg, 'bxdlg')

        # ---- Cards ----
        cards_ready = "document.querySelectorAll('#list .row.item').length > 0"
        goto(pg, s.base, 'cards', cards_ready); menu(pg, 'Add Card'); audit('Cards Edit Card', pg, 'dlg')
        goto(pg, s.base, 'cards', cards_ready); menu(pg, 'Holders'); audit('Cards Holders', pg, 'hdlg')
        goto(pg, s.base, 'cards', cards_ready); menu(pg, 'Banks'); audit('Cards Banks', pg, 'bdlg')
        goto(pg, s.base, 'cards', cards_ready); menu(pg, 'Cards Settings'); audit('Cards Settings', pg, 'tdlg')
        goto(pg, s.base, 'cards', cards_ready); menu(pg, 'Cards Settings'); wait_js(pg, "document.getElementById('tdlg').open", 5000); pg.evaluate("document.getElementById('tcols').click()"); audit('Cards Column Order', pg, 'odlg')
        goto(pg, s.base, 'cards', cards_ready); pg.evaluate("document.getElementById('idlg').showModal()"); audit('Cards Import Backup', pg, 'idlg')

        # ---- Tasks ----
        goto(pg, s.base, 'tasks', "true"); menu(pg, 'Add Task'); audit('Tasks Add Task', pg, 'dlg')
        goto(pg, s.base, 'tasks', "true"); menu(pg, 'Tasks Settings'); audit('Tasks Settings', pg, 'sdlg')
        goto(pg, s.base, 'tasks', "true"); pg.evaluate("document.getElementById('ydlg').showModal()"); audit('Tasks Year in Review', pg, 'ydlg')

        # ---- Files and Home ----
        goto(pg, s.base, 'files', "!!window.__files && __files.state().started"); menu(pg, 'Files Settings'); audit('Files Settings', pg, 'dlg')
        pg.goto(s.base + '/'); wait_js(pg, "!!document.getElementById('settingsSheet')", 20000)
        pg.evaluate("document.getElementById('settingsSheet').showModal()")
        wait_js(pg, "[...document.querySelectorAll('#settingsSheet .switch')].every(c => { const r = c.getBoundingClientRect(); return Math.round(r.width) === 44; })", 5000)   # after the opening animation, not a fixed pause
        d = pg.evaluate("[document.getElementById('settingsSheet').open, [...document.querySelectorAll('#settingsSheet .group')].length, [...document.querySelectorAll('#settingsSheet .switch')].every(c => { const r = c.getBoundingClientRect(); return Math.round(r.width) === 44 && Math.round(r.height) === 26; })]")
        check('W Home Settings: open, in groups, with 44 x 26 switches', d[0] and d[1] >= 3 and d[2], d)
        if SHEET:
            pg.evaluate(TALL); pg.query_selector('#settingsSheet').screenshot(path=os.path.join(SHEET, 'Home_Settings.png'))
        # the top bar at tablet widths: the last tab must end before the buttons on the right (1.64.2: Tools slid under them at 820)
        for w in (780, 820, 900, 960, 1100, 1180, 1280):
            pg.set_viewport_size({'width': w, 'height': 700}); goto(pg, s.base, 'links', links_ready)
            gap = pg.evaluate("(() => { const a = [...document.querySelectorAll('#ix-bar .ix-links a')].pop().getBoundingClientRect(), r = [...document.querySelectorAll('#ix-bar button, #ix-bar input, #ix-bar .ix-search')].filter(e => !e.closest('.ix-links') && e.getClientRects().length).map(e => e.getBoundingClientRect()).filter(x => x.width && x.left > a.left); return r.length ? Math.round(Math.min(...r.map(x => x.left)) - a.right) : 99; })()")
            check('W top bar fits at %d px' % w, gap >= 0, gap)
        check('W no page error', not errs, errs)
        b.close()
finally:
    stop_all()
sys.exit(check.done())
