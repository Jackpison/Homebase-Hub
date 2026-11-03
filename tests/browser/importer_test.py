#!/usr/bin/env python3
"""The Import Center (1.72.0, Settings > Backup & Restore > Import): a calendar and Todoist to Tasks, Google Keep and Notion (zip) to Info,
Raindrop and Pocket to Links, a spreadsheet to Cards. Each file is recognised, previewed with ticks, and added by its page with its own save;
what is already there is not added twice, and Undo takes it back. The sample exports are made here, in a temporary folder.
    python3 tests/browser/importer_test.py build/site-update-X.Y.Z.zip [--browser chromium|firefox|webkit]   (port 8990)"""
import datetime, json, os, sys, tempfile, zipfile
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lib'))
from helpers import Site, Checks, stop_all, browser_login, wait_js, browser_name, launch, until
from playwright.sync_api import sync_playwright

if len(sys.argv) < 2: sys.exit(__doc__)
BROWSER = browser_name(); ZIP = sys.argv[1]; check = Checks()
T = tempfile.mkdtemp(prefix='hub-import-')
day = (datetime.date.today() + datetime.timedelta(days=3)).strftime('%Y%m%d')
past = (datetime.date.today() - datetime.timedelta(days=40)).strftime('%Y%m%d')
def put(name, text): p = os.path.join(T, name); open(p, 'w', encoding='utf-8').write(text); return p
ICS = put('family.ics', '\r\n'.join(['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', 'UID:1', 'DTSTART;VALUE=DATE:' + day, 'SUMMARY:Dentist', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:2', 'DTSTART;VALUE=DATE:' + day, 'RRULE:FREQ=WEEKLY;BYDAY=MO,TH', 'SUMMARY:Yoga', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:3', 'DTSTART;VALUE=DATE:' + past, 'SUMMARY:Old party', 'END:VEVENT', 'END:VCALENDAR', '']))
TODO = put('Errands.csv', 'TYPE,CONTENT,DESCRIPTION,PRIORITY,INDENT,AUTHOR,RESPONSIBLE,DATE,DATE_LANG,TIMEZONE\n'
    'task,Renew passport @home,"Bring two photos, the old one",1,1,me,,2027-02-01,en,Asia/Kolkata\ntask,Water the plants,,4,1,me,,every week,en,\nsection,Later,,,,,,,,\n')
KEEP = os.path.join(T, 'takeout.zip')
with zipfile.ZipFile(KEEP, 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('Takeout/Keep/Wifi.json', json.dumps({'title': 'Wi-Fi', 'textContent': 'Network: Home5G\nPassword: on the router', 'isTrashed': False, 'isArchived': False, 'labels': [{'name': 'House'}]}))
    z.writestr('Takeout/Keep/Shopping.json', json.dumps({'title': 'Shopping', 'listContent': [{'text': 'Milk', 'isChecked': True}, {'text': 'Bread', 'isChecked': False}], 'isTrashed': False, 'isArchived': False}))
    z.writestr('Takeout/Keep/Old.json', json.dumps({'title': 'Thrown away', 'textContent': 'x', 'isTrashed': True, 'isArchived': False}))
    z.writestr('Takeout/Keep/Wifi.html', '<html><body>also here as html</body></html>')
NOTION = os.path.join(T, 'notion.zip')
with zipfile.ZipFile(NOTION, 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('Export/Recipes 0123456789abcdef0123456789abcdef.md', '# Recipes\n\nPancakes: flour, milk, eggs.')
    z.writestr('Export/Travel 89abcdef0123456789abcdef01234567.md', '# Travel\n\nPassport in the top drawer.')
RAIN = put('raindrop.csv', 'id,title,note,excerpt,url,folder,tags,created\n1,Recipes Site,,,https://cooking.example.com/,Food/Cooking,,2026-01-01\n'
    '2,Train Times,,,https://trains.example.com/,Travel,,2026-01-02\n3,Again,,,https://cooking.example.com/,Food/Cooking,,2026-01-03\n')
POCKET = put('ril_export.html', '<!DOCTYPE html><html><head><title>Pocket Export</title></head><body><h1>Unread</h1><ul>'
    '<li><a href="https://read.example.com/long-article" time_added="1700000000" tags="reading">A Long Article</a></li></ul><h1>Read Archive</h1><ul></ul></body></html>')
CARDS = put('my cards.csv', 'Bank,Card,Network,Holder,Credit Limit,Expiry\nLakeside Bank,Platinum Rewards,Visa,Asha,500000,08/2029\nHill Bank,Everyday,RuPay,Ravi,,12/2028\n')

try:
    s = Site(ZIP, 8990)
    with sync_playwright() as p:
        b = launch(p, BROWSER); print('browser: %s %s' % (BROWSER, b.version))
        ctx = b.new_context(viewport={'width': 1360, 'height': 900}); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        why = browser_login(pg, s.base); check('M0 logged in', not why, why)

        def choose(path, ready="!!document.querySelector('#ix-imres .ix-status, #ix-imres .ix-err')"):
            pg.goto(s.base + '/web/settings/#backup/import'); wait_js(pg, "!!document.getElementById('ix-imfile')", 20000)
            pg.set_input_files('#ix-imfile', path); wait_js(pg, ready, 15000); pg.wait_for_timeout(150)
            return pg.evaluate("[(document.querySelector('#ix-imres .ix-status, #ix-imres .ix-err') || {}).textContent || '', [...document.querySelectorAll('#ix-imres .ix-imrow')].map(r => [r.querySelector('b').textContent, r.querySelector('input').checked])]")
        def add(): pg.click('#ix-imgo'); pg.wait_for_load_state('load')

        # ---- calendar -> Tasks ----
        st, rows = choose(ICS)
        check('M1 a calendar file is recognised: its events listed for Tasks; one already past is listed but not ticked',
              'Calendar' in st and 'Tasks' in st and dict(rows) == {'Dentist': True, 'Yoga': True, 'Old party': False}, (st, rows))
        add(); wait_js(pg, "typeof T !== 'undefined' && T.some(t => t.name === 'Yoga')", 15000)
        tk = pg.evaluate("[T.map(t => [t.name, t.repeat]).sort(), (document.querySelector('.snack') || {}).textContent || '']")
        check('M2 Tasks adds them (the weekly event repeats on Mon and Thu; the past one is left out) and says so, with Undo',
              ['Yoga', {'n': 1, 'unit': 'week', 'wd': [1, 4]}] in tk[0] and not any(x[0] == 'Old party' for x in tk[0]) and 'Added 2 tasks from Calendar' in tk[1] and 'Undo' in tk[1], tk)
        pg.click('.snack button'); until(lambda: pg.evaluate("!T.some(t => t.name === 'Yoga')"), 5000)
        until(lambda: pg.evaluate("document.getElementById('status').textContent.indexOf('Saving') < 0"), 8000); pg.wait_for_timeout(400)
        left = pg.evaluate("fetch('api.php', { cache: 'no-store' }).then(r => r.json()).then(j => j.tasks.map(t => t.name))")
        check('M3 Undo takes them back out (also on the server)', 'Yoga' not in left and 'Dentist' not in left, left)

        # ---- Todoist -> Tasks, twice: the second time nothing is doubled ----
        st, rows = choose(TODO); add(); wait_js(pg, "typeof T !== 'undefined' && T.some(t => t.name === 'Water the plants')", 15000)
        td = pg.evaluate("T.filter(t => /passport|plants/i.test(t.name)).map(t => [t.name, t.due, t.repeat.unit, t.notes, t.cat])")
        check('M4 Todoist: the tasks (not the section), the date, "every week" as a weekly repeat, the description as notes, @home as the category',
              'Todoist' in st and sorted(x[0] for x in td) == ['Renew passport', 'Water the plants'] and ['Renew passport', '2027-02-01', 'none', 'Bring two photos, the old one', 'home'] in td
              and any(x[0] == 'Water the plants' and x[2] == 'week' for x in td), (st, td))
        until(lambda: pg.evaluate("document.getElementById('status').textContent.indexOf('Saving') < 0"), 8000); pg.wait_for_timeout(300)
        choose(TODO); add(); wait_js(pg, "!!document.querySelector('.snack')", 15000)
        again = pg.evaluate("[(document.querySelector('.snack') || {}).textContent, T.filter(t => t.name === 'Renew passport').length]")
        check('M5 importing the same file again adds nothing twice ("already here")', 'Nothing new' in again[0] and 'already here' in again[0] and again[1] == 1, again)

        # ---- Google Keep (Takeout zip) -> Info ----
        st, rows = choose(KEEP)
        check('M6 a Google Takeout zip: the Keep notes found (the one in the trash left out)', 'Google Keep' in st and sorted(r[0] for r in rows) == ['Shopping', 'Wi-Fi'], (st, rows))
        add(); wait_js(pg, "typeof TABS !== 'undefined' && TABS.some(t => t.name === 'From Google Keep')", 15000)
        kp = pg.evaluate("(() => { const t = TABS.find(t => t.name === 'From Google Keep'); return [t.private, t.boxes.map(b => [b.title, b.notes])]; })()")
        check('M7 Info adds one private tab "From Google Keep", a box per note (a checklist as - [x] lines)',
              kp[0] is True and ['Wi-Fi', 'Network: Home5G\nPassword: on the router'] in kp[1] and ['Shopping', '- [x] Milk\n- [ ] Bread'] in kp[1], kp)
        # ---- Notion (zip of Markdown) -> Info ----
        st, rows = choose(NOTION); add(); wait_js(pg, "typeof TABS !== 'undefined' && TABS.some(t => t.name === 'From Notion')", 15000)
        nt = pg.evaluate("TABS.find(t => t.name === 'From Notion').boxes.map(b => [b.title, b.notes])")
        check('M8 Notion: page titles without Notion\'s long ids, their text as the notes', 'Notion' in st and ['Recipes', 'Pancakes: flour, milk, eggs.'] in nt and ['Travel', 'Passport in the top drawer.'] in nt, (st, nt))

        # ---- Raindrop and Pocket -> Links ----
        st, rows = choose(RAIN)
        check('M9 Raindrop: the links found (the same address twice is listed once in Links later)', 'Raindrop' in st and len(rows) == 3, (st, rows))
        add(); wait_js(pg, "!!document.querySelector('#tabs') && document.body.textContent.includes('Train Times')", 15000)
        lk = pg.evaluate("fetch('api.php?action=get', { cache: 'no-store' }).then(r => r.json()).then(j => { const t = j.data.tabs.find(t => t.title === 'From Raindrop'); return t ? [!!t.private, t.categories.map(c => [c.title, c.links.map(l => l.url)])] : null; })")
        check('M10 Links adds a private tab "From Raindrop" with a category per folder, each address once',
              lk and lk[0] and sorted(lk[1]) == [['Cooking', ['https://cooking.example.com/']], ['Travel', ['https://trains.example.com/']]], lk)
        st, rows = choose(POCKET); add(); wait_js(pg, "document.body.textContent.includes('A Long Article')", 15000)
        pk = pg.evaluate("fetch('api.php?action=get', { cache: 'no-store' }).then(r => r.json()).then(j => { const t = j.data.tabs.find(t => t.title === 'From Pocket'); return t ? t.categories.map(c => [c.title, c.links.map(l => l.title)]) : null; })")
        check('M11 Pocket\'s HTML export: its links, the tag as the category', 'Pocket' in st and pk == [['reading', ['A Long Article']]], (st, pk))

        # ---- a spreadsheet -> Cards (columns matched; one can be changed) ----
        st, rows = choose(CARDS)
        mp = pg.evaluate("Object.fromEntries([...document.querySelectorAll('#ix-imres [data-f]')].map(s => [s.dataset.f, s.value]))")
        check('M12 a spreadsheet of cards: its columns matched to the card fields (Bank, Card, Network, Holder, Credit Limit, Expiry)',
              'Cards' in st and mp.get('bank') == 'Bank' and mp.get('name') == 'Card' and mp.get('owner') == 'Holder' and mp.get('limit') == 'Credit Limit' and mp.get('expiry') == 'Expiry', (st, mp))
        add(); wait_js(pg, "typeof D !== 'undefined' && D.some(c => c.name === 'Everyday')", 15000)
        cd = pg.evaluate("D.filter(c => c.bank === 'Lakeside Bank' || c.bank === 'Hill Bank').map(c => [c.bank, c.name, c.network, c.owner, c.limit, c.expiry]).sort()")
        check('M13 Cards adds them, holders included', cd == [['Hill Bank', 'Everyday', 'RuPay', 'Ravi', None, '12/2028'], ['Lakeside Bank', 'Platinum Rewards', 'Visa', 'Asha', 500000, '08/2029']], cd)
        st, rows = choose(put('notes.bin', '\x00\x01'))
        check('M14 a file it does not know gets a plain message', 'not recognised' in st, st)
        check('M15 no page error', not errs, errs)
        b.close()
finally:
    stop_all()
sys.exit(check.done())
