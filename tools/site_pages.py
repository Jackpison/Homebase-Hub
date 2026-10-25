"""Pages of the website that are built from data: the home page, the features hub, one page for each of the six app pages,
Telegram, On your phone, the Tools finder and the FAQ. tools/make-site.py imports this and wraps each body in the site's
header and footer. Plain HTML, no inline styles or scripts (the site's security policy allows neither), so the colours come
from classes (a-home, a-tasks ...) and the few positions that vary (the numbered dots on screenshots) from hot.css,
which make-site.py writes from HOT.
Every claim here comes from the README, the guide or the app itself. Keep it that way."""
import html, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HOT = set()          # (x, y) of every numbered dot used: make-site.py writes hot.css from this
REPO = 'https://github.com/Jackpison/Homebase-Hub'
LATEST = REPO + '/releases/latest'


def e(s): return html.escape(s, quote=True)
def I(n): return '{{i:%s}}' % n
def grad(s): return re.sub(r'\*(.+?)\*', r'<span class="grad">\1</span>', e(s))


def img(src, w, h, alt, prio=False):
    return '<img src="img/%s" alt="%s" width="%d" height="%d" %s>' % (src, e(alt), w, h, 'fetchpriority="high" decoding="async"' if prio else 'loading="lazy" decoding="async"')


def frame(src, w, h, alt, url, prio=False):
    return '<div class="frame"><div class="fbar" aria-hidden="true"><i></i><i></i><i></i><b>%s</b></div>%s</div>' % (e(url), img(src, w, h, alt, prio))


def hot(n, x, y):
    HOT.add((x, y)); return '<span class="hot hx%d hy%d" aria-hidden="true">%d</span>' % (x, y, n)


def chip(cls, ac, icon, title, sub):
    return '<div class="chip %s %s"><span class="ci">%s</span><span>%s<small>%s</small></span></div>' % (cls, ac, I(icon), e(title), e(sub))


LOOKS = [('gold', 'Gold'), ('sky', 'Sky'), ('mint', 'Mint'), ('pink', 'Pink'), ('violet', 'Violet'), ('orange', 'Orange')]
def looks_row():
    return ('<div class="looks" role="group" aria-label="Pick a look for this website"><span>Try a look</span>' +
            ''.join('<button class="look l-%s" type="button" data-look="%s" aria-label="%s look" aria-pressed="%s"></button>' % (k, k, n, 'true' if k == 'gold' else 'false') for k, n in LOOKS) + '</div>')


# ---------------------------------------------------------------- the six app pages
# Each: what it is, the facts worth a glance, the everyday problems it solves, the details we are proud of, and the
# numbered points on its screenshot (tour = text, hot = where on the picture, in percent).
FEATURES = [
    dict(id='home', name='Home', ac='a-home', icon='home', url='yourdomain.com',
         h1='A start page that feels like *yours*.',
         lead='Your own start page, with background photos that change and their credit in the corner. Show it with the bar, or without it.',
         pic=('home-2.webp', 1440, 683, "Homebase Hub's start page with a mountain photo and its credit in the corner"),
         chips=[('image', 'Photos that change', 'Credit in the corner'), ('phone', 'Installs on a phone', 'Opens like an app')],
         facts=[('Photos', 'background photos that change'), ('Fast', 'phone-sized copies load quickly'), ('Bar', 'shown, or left out'), ('App', 'installs on a phone or computer')],
         problems=[('Ten tabs to open every morning', 'One bar with every page, and search on / for Links, Info, Tasks and Tools', 'search'),
                   ('A start page you did not choose', 'Choose the background photos, the look and which pages show in the bar', 'palette'),
                   ('Heavy pictures on a slow phone', 'Every photo gets a phone-sized copy, so it loads fast', 'phone')],
         details=[('image', 'Photos with credit', 'Each photo keeps its credit in the corner.'), ('phone', 'Phone-sized copies', 'Large photos get a smaller copy for phones, so the page opens quickly.'),
                  ('settings', 'With or without the bar', 'Show the start page full screen, or keep the bar. It is a setting in Settings, Appearance, Look.'), ('search', 'Search from anywhere', 'Press / or Ctrl+K on any page to search Links, Info, Tasks and Tools at once.')],
         tour=[('Photos that change', 'A background photo for your start page.'), ('Credit in the corner', 'Every photo keeps its credit, so you know whose picture it is.')],
         hot=[(38, 58), (78, 7)], everyday=('Ten tabs to open every morning', 'One bar with every page, and search on /')),
    dict(id='links', name='Links', ac='a-links', icon='link', url='yourdomain.com/web/links',
         h1='Every bookmark, *in its place*.',
         lead='Bookmarks in tabs and categories, with icons saved on your server. Bring yours from any browser in a minute.',
         pic=('shot-links.webp', 1440, 709, 'Links page with bookmarks in tabs and categories'),
         chips=[('link', 'Import bookmarks', 'Preview first, undo anytime'), ('lock', 'Encrypted tabs', 'Keys made in your browser')],
         facts=[('6', 'tabs of categories'), ('6', 'browsers you can import from'), ('Icons', 'saved on your server'), ('Locked', 'tabs can be encrypted')],
         problems=[('Bookmarks stuck in one browser', 'Import the .html export from any browser, with a preview first', 'download'),
                   ('Icons that load from other websites', 'Fetch Icons saves each link\'s icon on your server', 'image'),
                   ('Private links in plain sight', 'Make a tab private, or encrypt it with your passphrase', 'lock')],
         details=[('download', 'Import with a preview', 'Pick the file, see how many links and which folders become which categories, then choose a new tab or an existing one. Links you already have are not added twice.'),
                  ('undo', 'Easy to undo', 'A copy of Links is kept just before an import, in Settings, Backup and Restore, Earlier Versions.'),
                  ('palette', 'Colours and sizes', 'Each tab can have its own column colours and text sizes.'), ('lock', 'Encrypted tabs', 'Tabs can be encrypted with your passphrase. The keys are made in your browser.')],
         tour=[('Tabs and categories', 'Group links in categories, and the categories in tabs.'), ('Icons on your server', 'Fetch Icons saves each link\'s icon, so pages load without asking other sites.'),
               ('Private and encrypted tabs', 'Make a tab private, or encrypt it with your passphrase.')],
         hot=[(12, 13), (9, 31), (56, 13)], everyday=('Bookmarks stuck in one browser', 'Import from any browser, preview first, undo anytime')),
    dict(id='info', name='Info', ac='a-info', icon='note', url='yourdomain.com/web/info',
         h1='Notes you can *actually find*.',
         lead='Notes in tabs. Each tab holds 1 to 12 boxes, or is written as one document with an outline.',
         pic=('shot-info.webp', 1440, 709, 'Info page with notes in boxes'),
         chips=[('note', 'Cards or a document', 'Your choice for each tab'), ('lock', 'Encrypted tabs', 'For private notes')],
         facts=[('1 to 12', 'boxes in each tab'), ('2 ways', 'cards, or one document'), ('PDF', 'or text, one tab or all'), ('Locked', 'tabs can be encrypted')],
         problems=[('Notes scattered across apps', 'Boxes in tabs, side by side, in the size and order you want', 'note'),
                   ('Long notes you cannot get around in', 'Write a tab as one document with an outline', 'book'),
                   ('Private notes in plain sight', 'Encrypted tabs, with keys made in your browser', 'lock')],
         details=[('note', 'Boxes you can size and arrange', 'Each tab holds 1 to 12 boxes. Resize them and put them where you want.'), ('book', 'Cards or a document', 'Arrange boxes as cards, or write the tab as one document with an outline.'),
                  ('download', 'Export as PDF or text', 'Export one tab, or all of them.'), ('search', 'Found by search', 'Search covers the text of your notes, not only their titles.')],
         tour=[('Tabs of notes', 'Each tab holds up to 12 boxes.'), ('Boxes', 'Notes in boxes you can size and arrange.'), ('Encrypted tabs', 'Lock a tab with your passphrase.')],
         hot=[(24, 13), (38, 40), (62, 13)], everyday=('Notes scattered across apps', 'Boxes you can size, or one document with an outline')),
    dict(id='cards', name='Cards', ac='a-cards', icon='card', url='yourdomain.com/web/cards',
         h1='Every card, *one table*.',
         lead='Your cards in a table you can search and filter, with the yearly charges added up.',
         pic=('cards-crop.webp', 1440, 640, 'Cards page with a table of example cards'),
         chips=[('chart', 'Yearly charges', 'Added up for you'), ('download', 'Export to Excel', 'Whenever you need a copy')],
         facts=[('4', 'filters: bank, network, type, holder'), ('Yearly', 'charges added up'), ('Excel', 'export a copy'), ('Private', 'sent only after you log in')],
         problems=[('Which card was that fee on?', 'Every card in one table you can search and filter', 'card'),
                   ('Adding up yearly fees by hand', 'Yearly charges added up for you', 'calendar'),
                   ('Card details open to anyone', 'Nothing is sent to the browser until you log in', 'lock')],
         details=[('table', 'One searchable table', 'Search your cards, and filter by bank, network, type and holder.'), ('chart', 'Yearly charges added up', 'See what your cards cost you in a year.'),
                  ('download', 'Export to Excel', 'Take a copy whenever you need one.'), ('lock', 'Sent only after login', 'Card data is not sent to a browser until you are logged in.')],
         tour=[('Summary tiles', 'Counts and yearly charges at the top.'), ('Filters', 'Filter by bank, network, type and holder.'), ('The table', 'Every card in one searchable table.')],
         hot=[(30, 12), (50, 27), (50, 62)], everyday=('Which card was that fee on?', 'Every card in one table, yearly charges added up')),
    dict(id='tasks', name='Tasks', ac='a-tasks', icon='tasks', url='yourdomain.com/web/tasks',
         h1='Bills, renewals and chores that *remind you*.',
         lead='Add a task in plain words, set it to repeat, and let Telegram nudge you with Done, Skip and Snooze.',
         pic=('shot-tasks.webp', 1440, 709, 'Tasks page with smart lists and a week strip'),
         chips=[('repeat', 'Repeats', 'Monthly, yearly, every 2 months'), ('gift', 'Year in Review', 'A PDF of your year')],
         facts=[('Repeats', 'monthly, yearly, every 2 months and more'), ('Lists', 'today, overdue, this week and more'), ('PDF', 'Year in Review'), ('3', 'buttons on Telegram: Done, Skip, Snooze')],
         problems=[('Missing a renewal date', 'A week strip and smart lists show what is due', 'calendar'),
                   ('Re-typing the same monthly bill', 'Repeats bring it back by itself, with its price', 'repeat'),
                   ('Checking an app to see what is due', 'A daily digest and Due Now messages come to you', 'send')],
         details=[('tasks', 'Add in plain words', 'Type a name, a price and how often, like Netflix 649 monthly 5 Nov, and the task fills itself in.'), ('chart', 'Calendar and analytics', 'See your tasks on a calendar, and how they add up in Analytics.'),
                  ('send', 'Done, Skip or Snooze on Telegram', 'Handle a reminder from the message itself: snooze for 1 hour, 3 hours or until tomorrow.'), ('gift', 'Year in Review', 'A PDF that looks back over your year of bills, renewals and chores.')],
         tour=[('Smart lists', 'Today, overdue, this week and more, one click away.'), ('A week at a glance', 'See what is due on each day of the week.'),
               ('Dates, repeats, prices', 'Bills and renewals that come back by themselves.'), ('Add in plain words', 'Type Netflix 649 monthly and it understands.')],
         hot=[(12, 42), (52, 25), (60, 58), (42, 12)], everyday=('Forgotten bills and renewals', 'Due dates, repeats, and a nudge on Telegram')),
    dict(id='tools', name='Tools', ac='a-tools', icon='tools', url='yourdomain.com/web/tools',
         h1='36 tools, *right in your browser*.',
         lead='Resize and convert images, merge and sign PDFs, read text from photos, make QR codes and more. Search, star your favourites and get on with your day.',
         pic=('shot-tools.webp', 1440, 709, 'Tools page with search and recently used tools'),
         chips=[('tools', '36 tools', 'Images, Photos, PDF, Utilities'), ('star', 'Favourites', 'Star and arrange your own')],
         facts=[('36', 'tools'), ('4', 'sections: Images, Photos, PDF, Utilities'), ('Browser', 'does the work'), ('Yours', 'star favourites, arrange sections')],
         problems=[('Sketchy free PDF websites', 'Merge, compress, sign and protect PDFs in your browser', 'tools'),
                   ('One-off apps for one-off jobs', 'Resize, crop, convert and compress images in one place', 'image'),
                   ('Hunting for the tool you used last week', 'Recent and Favourites sections, and a search box', 'star')],
         details=[('tools', 'Heavy engines load on demand', 'OCR, background removal and PDF encryption load only when a tool needs them.'), ('star', 'Favourites and your own order', 'Star favourites, drag tools to reorder them or move them between sections, and hide the ones you never use.'),
                  ('table', 'Side menu or tabs', 'Show the sections as a side menu, or as tabs on top. Phones always get tabs.'), ('search', 'Search them all', 'Find a tool by name or by what it does.')],
         tour=[('Search first', 'Type what you want to do and the right tool appears.'), ('Recently used', 'Your recent tools are one click away.'), ('Sections', 'Images, Photos, PDF and Utilities, plus Favourites.')],
         hot=[(55, 38), (30, 70), (9, 40)], everyday=('Sketchy free PDF websites', '36 tools that run in your own browser')),
]
BY = {f['id']: f for f in FEATURES}
for _f in FEATURES: assert len(_f['tour']) == len(_f['hot']), _f['id']


def load_tools():
    d = json.load(open(os.path.join(ROOT, 'tools-app', 'src', 'tools.json'), encoding='utf-8'))   # the one list the Tools page is built from
    return d['categories'], [{**t, 'desc': t['desc'], 'kw': t['kw']} for t in d['tools']]


# ---------------------------------------------------------------- shared pieces
def tour_tab(f, on):
    return '<button class="tab %s" id="t-%s" role="tab" type="button" aria-selected="%s" aria-controls="p-%s">%s%s</button>' % (f['ac'], f['id'], 'true' if on else 'false', f['id'], I(f['icon']), e(f['name']))


def tour_panel(f, link=True):
    pts = ''.join('<div class="pt"><span class="n">%d</span><div><b>%s</b><span>%s</span></div></div>' % (i + 1, e(t), e(d)) for i, (t, d) in enumerate(f['tour']))
    dots = ''.join(hot(i + 1, x, y) for i, (x, y) in enumerate(f['hot']))
    s, w, h, alt = f['pic']
    btn = '<a class="btn ac" href="features/%s/">Explore %s%s</a>' % (f['id'], e(f['name']), I('arrow')) if link else ''
    return ('<div class="panel %s" id="p-%s" role="tabpanel" aria-labelledby="t-%s"><div class="shot">%s%s</div><div class="side">%s%s</div></div>'
            % (f['ac'], f['id'], f['id'], img(s, w, h, alt), dots, pts, btn))


def problem_cards(items, cols=''):
    out = ''
    for ac, before, after, icon, tag in items:
        out += ('<div class="card hv %s"><div class="ico">%s</div><div class="before">%s</div><div class="after">%s</div>%s</div>'
                % (ac, I(icon), e(before), e(after), '<span class="more">%s</span>' % e(tag) if tag else ''))
    return '<div class="cards %s">%s</div>' % (cols, out)


def band():
    return ('<section class="s" id="start"><div class="band"><div><h2>Up and running in three steps.</h2><p>No database and no command line. A file manager is enough.</p>'
            '<div class="btns"><a class="btn dark lg" href="%s">%sDownload {{VER}}</a></div></div>'
            '<ol class="steps"><li class="step"><i>1</i>Download the zip</li><li class="step"><i>2</i>Upload and extract it on your hosting</li><li class="step"><i>3</i>Open your domain and choose a password</li></ol></div></section>' % (LATEST, I('download')))


def chat_html(first_note=True):
    cmds = [('/today', 'Due today (3)\n- Electricity bill\n- Netflix\n- Gym fee'), ('/week', 'Next 7 days (5)\n- Mon: Rent\n- Wed: Water bill\n- Fri: Netflix\n- Sat: Gym fee\n- Sun: Plants'),
            ('/next', 'Next up\n1. Electricity bill\n2. Netflix\n3. Gym fee'), ('/add Netflix 649 monthly 5 Nov', 'Added: Netflix, 649, monthly, 5 Nov'),
            ('/done Netflix', 'Marked done: Netflix'), ('/snooze Netflix 2h', 'Snoozed Netflix for 2 hours'), ('/backup', 'Here is your backup file.'), ('/status', 'Everything looks fine.')]
    buttons = ''.join('<button class="cmd" type="button" data-cmd="%s" data-reply="%s">%s</button>' % (e(c), e(r), e(c.split(' ')[0])) for c, r in cmds)
    chat = ('<div class="chat" id="chat" role="log" aria-live="polite" aria-label="Example Telegram chat" tabindex="0"><small>Example chat, with made-up replies</small>'
            '<div class="msg bot"><b>Due now</b>\nElectricity bill<div class="btns2"><span>Done</span><span>Skip</span><span>Snooze</span></div></div></div>')
    return chat, buttons


# ---------------------------------------------------------------- the pages
def home():
    tabs = ''.join(tour_tab(f, i == 4) for i, f in enumerate(FEATURES))   # Tasks is shown first
    panels = ''.join(tour_panel(f) for f in FEATURES)
    problems = problem_cards([(f['ac'], f['everyday'][0], f['everyday'][1], f['icon'], f['name'].upper()) for f in FEATURES])
    chat, buttons = chat_html()
    cats, tools = load_tools()
    count = {c['id']: sum(1 for t in tools if t['cat'] == c['id']) for c in cats}
    cat_ac = {'images': 'a-cards', 'photos': 'a-home', 'pdf': 'a-tasks', 'utilities': 'a-tools'}
    toolcards = ''.join('<a class="card hv %s" href="tools/"><div class="ico">%s</div><h3>%s</h3><p>%s</p><span class="more">%d tools%s</span></a>' % (
        cat_ac[c['id']], I({'images': 'image', 'photos': 'image', 'pdf': 'note', 'utilities': 'tools'}[c['id']]), e(c['name']),
        e(', '.join(t['name'] for t in tools if t['cat'] == c['id'])[:70].rsplit(',', 1)[0] + ' and more'), count[c['id']], I('arrow')) for c in cats)
    around = ''.join('<a class="card hv %s" href="%s"><div class="ico">%s</div><h3>%s</h3><p>%s</p><span class="more">%s%s</span></a>' % (ac, href, I(ic), e(t), e(p), e(m), I('arrow')) for ac, href, ic, t, p, m in [
        ('a-tg', 'telegram/', 'send', 'Telegram', 'A daily digest, Due Now messages with Done, Skip and Snooze, and backups sent to your chat.', 'See Telegram'),
        ('a-home', 'phone/', 'phone', 'On your phone', 'Add the site to your home screen and it opens like an app, with its own icon.', 'See how'),
        ('a-info', 'guide.html', 'book', 'The guide', 'Every page and every setting, step by step, with screenshots of the real app (PDF).', 'Read the guide'),
        ('a-cards', 'security.html', 'shield', 'Security', 'What protects your data, and what does not, in plain words.', 'Read Security')])
    secure = ''.join('<div class="card %s"><div class="ico">%s</div><h3>%s</h3><p>%s</p></div>' % (ac, I(ic), e(t), e(p)) for ac, ic, t, p in [
        ('a-info', 'key', 'One login, done properly', 'Two-step login, recovery codes, trusted browsers, a device list, and logins paused after five wrong tries.'),
        ('a-links', 'lock', 'Encrypted where you choose', 'Encrypted tabs in Links and Info, and encrypted backup files. The keys are made in your browser.'),
        ('a-home', 'shield', 'Data closed to browsers', 'Your data files answer 404 to a browser, even on a server that ignores .htaccess.'),
        ('a-tasks', 'undo', 'Updates you can undo', 'Each update is checked first, needs your password, and Go Back restores the last version.')])
    moments = ''.join('<div class="moment %s"><div class="time">%s</div><h3>%s</h3><p>%s</p><div class="fix">%s</div></div>' % (ac, t, e(h), e(p), e(f)) for ac, t, h, p, f in [
        ('a-home', '07:30', 'Open your start page', 'A fresh photo, every page one click away in the bar, and search on / for Links, Info, Tasks and Tools.', 'Home'),
        ('a-tools', '12:10', 'Sort out a PDF', 'Merge, compress or sign it in your browser with the PDF tools.', 'Tools'),
        ('a-tasks', '21:00', 'The bill is due', 'A Telegram message arrives with Done, Skip and Snooze. One tap and it is handled.', 'Tasks and Telegram')])
    stats = ''.join('<div class="stat %s"><b>%s</b><span>%s</span></div>' % (ac, n, e(t)) for ac, n, t in [
        ('a-home', '6', 'pages, one login'), ('a-tools', '36', 'tools in your browser'), ('a-links', '166', 'ready-made looks'), ('a-cards', '0', 'databases to run'), ('a-tasks', '3', 'browser engines tested')])
    more = ''.join('<a class="card hv %s" href="%s"><h3>%s</h3><p>%s</p><span class="more">Open%s</span></a>' % (ac, href, e(t), e(p), I('arrow')) for ac, href, t, p in [
        ('a-home', 'guide.html', 'The guide', 'Every page and every setting, step by step (PDF).'), ('a-info', 'faq/', 'Questions and answers', 'Hosting, updates, privacy and more.'),
        ('a-tasks', 'changelog.html', 'Changelog', 'What changed in every version.'), ('a-links', REPO, 'Source code', 'Read it, build it, report an issue.')])
    body = f'''<section class="hero"><span class="blob b1" aria-hidden="true"></span><span class="blob b2" aria-hidden="true"></span><span class="blob b3" aria-hidden="true"></span>
<div class="in hgrid"><div class="hcopy"><span class="pill"><i class="dot"></i>Free and open source. No database.</span>
<h1>Your whole day, in one <span class="grad">private place.</span></h1>
<p class="lead">Start page, bookmarks, notes, cards, tasks and 36 tools that run in your browser. One login, one look, on your own hosting.</p>
<div class="cta"><a class="btn pri lg" href="{LATEST}">{I('download')}Download {{{{VER}}}}</a><a class="btn lg" href="#features">Take the tour{I('arrow')}</a></div>
<ul class="trust"><li>PHP 8.3 or newer</li><li>GPL-3.0</li><li>Accessibility-checked</li></ul>{looks_row()}</div>
<div class="hart">{frame('shot-links.webp', 1440, 709, 'Links page with bookmarks in tabs and categories', 'yourdomain.com/web/links', True)}
{chip('c1', 'a-links', 'link', 'Import bookmarks', 'Preview first, undo anytime')}{chip('c2', 'a-cards', 'image', '166 looks', 'Pick yours')}{chip('c3', 'a-info', 'lock', 'Encrypted tabs', 'Keys made in your browser')}</div></div></section>
<section class="stats" aria-label="Homebase Hub at a glance"><div class="in">{stats}</div></section>
<section class="s" id="features"><div class="in"><span class="eyebrow">The tour</span><h2>Six pages. One home.</h2>
<p class="intro">Each page has its own colour and its own job. They share one bar, one login and one Settings page, so it feels like one app.</p>
<div id="screenshots"><div class="tabs" role="tablist" aria-label="The six pages">{tabs}</div>{panels}</div></div></section>
<section class="s" id="pages"><div class="in"><span class="eyebrow">Around the pages</span><h2>More than six pages.</h2><div class="cards c4">{around}</div></div></section>
<section class="s" id="everyday"><div class="in"><span class="eyebrow">Everyday life, improved</span><h2>The small annoyances, gone.</h2><p class="intro">What changes the day you install it.</p>{problems}</div></section>
<section class="s" id="day"><div class="in"><span class="eyebrow">A day with Homebase Hub</span><h2>One ordinary day, made calmer.</h2><div class="cards">{moments}</div></div></section>
<section class="s" id="telegram"><div class="in tg"><div class="a-tg"><span class="eyebrow">Telegram</span><h2>Reminders where you already are.</h2>
<p class="intro">Connect your own Telegram bot and the site tells you what needs you. It only answers your own chat. Tap a command to see the kind of reply you get.</p><div class="cmds">{buttons}</div>
<div class="btns"><a class="btn ac" href="telegram/">Everything Telegram does{I('arrow')}</a></div></div>{chat}</div></section>
<section class="s" id="tools"><div class="in"><span class="eyebrow">Tools</span><h2>36 tools. Zero extra apps.</h2><p class="intro">Small tools that run in your browser: crop, resize and convert images, merge and sign PDFs, read text from photos, remove backgrounds, make QR codes and more.</p>
<div class="cards c4">{toolcards}</div><div class="btns"><a class="btn ac a-tools" href="tools/">Find a tool{I('search')}</a></div></div></section>
<section class="s" id="private"><div class="in"><span class="eyebrow">Security</span><h2>Private, and tested like it matters.</h2>
<p class="intro">Your data lives in one folder on your own hosting, closed to browsers. Nothing is sent anywhere unless you set it up. Updates are tried against 65 checks with damaged and hostile files, and the site is checked in three browser engines.</p>
<div class="cards c4">{secure}</div><div class="btns"><a class="btn" href="security.html">Read what protects your data, and what does not{I('arrow')}</a></div></div></section>
{band()}
<section class="s" id="more"><div class="in"><span class="eyebrow">Keep reading</span><h2>Learn more.</h2><div class="cards c4">{more}</div></div></section>'''
    return dict(slug='index', title='Homebase Hub: a self-hosted start page, bookmarks, notes and tasks', cls='',
                desc='Homebase Hub is a self-hosted start page with bookmarks, notes, cards, tasks and 36 browser tools. One login, private, on your own server. Free and open source.', body=body)


def features_hub():
    cards = ''.join('<a class="card hv %s" href="features/%s/"><div class="ico">%s</div><h3>%s</h3><p>%s</p><ul class="mini">%s</ul><span class="more">See %s%s</span></a>' % (
        f['ac'], f['id'], I(f['icon']), e(f['name']), e(f['lead']), ''.join('<li>%s</li>' % e(d[1]) for d in f['details'][:3]), e(f['name']), I('arrow')) for f in FEATURES)
    extra = ''.join('<a class="card hv %s" href="%s"><div class="ico">%s</div><h3>%s</h3><p>%s</p><span class="more">Open%s</span></a>' % (ac, href, I(ic), e(t), e(p), I('arrow')) for ac, href, ic, t, p in [
        ('a-tools', 'tools/', 'search', 'Tool finder', 'Search all 36 tools by name or by what they do.'), ('a-tg', 'telegram/', 'send', 'Telegram', 'Digest, Due Now buttons, commands and backups.'),
        ('a-home', 'phone/', 'phone', 'On your phone', 'Install the site like an app, on iPhone, Android or a computer.'), ('a-info', 'security.html', 'shield', 'Security', 'What protects your data, and what does not.')])
    body = f'''<section class="hero"><span class="blob b1" aria-hidden="true"></span><span class="blob b2" aria-hidden="true"></span>
<div class="in"><div class="crumb"><b>Features</b></div><h1>Six pages. <span class="grad">One home.</span></h1><p class="lead">Each page does one job and has its own colour. They share the same bar, login, backup and Settings. Pick one to see what it does.</p></div></section>
<section class="in"><div class="cards c2">{cards}</div></section>
<section class="s"><div class="in"><span class="eyebrow">And around them</span><h2>Everything else.</h2><div class="cards c4">{extra}</div></div></section>{band()}'''
    return dict(slug='features', title='Features: Homebase Hub', cls='', desc='The six pages of Homebase Hub: Home, Links, Info, Cards, Tasks and Tools, and what each one does for your everyday life.', body=body)


def feature(f):
    i = [x['id'] for x in FEATURES].index(f['id'])
    prev, nxt = FEATURES[i - 1], FEATURES[(i + 1) % len(FEATURES)]
    s, w, h, alt = f['pic']
    chips = ''.join(chip(c, f['ac'], ic, t, sub) for c, (ic, t, sub) in zip(['c1', 'c3'], f['chips']))
    stats = ''.join('<div class="stat"><b>%s</b><span>%s</span></div>' % (e(b), e(t)) for b, t in f['facts'])
    problems = problem_cards([(f['ac'], b, a, ic, '') for b, a, ic in f['problems']])
    details = ''.join('<div class="card %s"><div class="ico">%s</div><h3>%s</h3><p>%s</p></div>' % (f['ac'], I(ic), e(t), e(p)) for ic, t, p in f['details'])
    body = f'''<section class="hero fh"><span class="blob b1" aria-hidden="true"></span><span class="blob b2" aria-hidden="true"></span><span class="blob b3" aria-hidden="true"></span>
<div class="in hgrid"><div class="hcopy"><div class="crumb"><a href="features/">Features</a> / <b>{e(f['name'])}</b></div><h1>{grad(f['h1'])}</h1><p class="lead">{e(f['lead'])}</p>
<div class="cta"><a class="btn pri lg" href="{LATEST}">{I('download')}Get Homebase Hub</a><a class="btn lg" href="index.html#features">All six pages{I('arrow')}</a></div></div>
<div class="hart">{frame(s, w, h, alt, f['url'], True)}{chips}</div></div></section>
<section class="stats n4"><div class="in">{stats}</div></section>
<section class="s"><div class="in"><span class="eyebrow">Everyday problems</span><h2>What {e(f['name'])} takes off your mind.</h2>{problems}</div></section>
<section class="s"><div class="in"><span class="eyebrow">Look closer</span><h2>The real page, point by point.</h2><div id="p-{f['id']}" class="panel {f['ac']}"><div class="shot">{img(s, w, h, alt)}{''.join(hot(n + 1, x, y) for n, (x, y) in enumerate(f['hot']))}</div>
<div class="side">{''.join('<div class="pt"><span class="n">%d</span><div><b>%s</b><span>%s</span></div></div>' % (n + 1, e(t), e(d)) for n, (t, d) in enumerate(f['tour']))}</div></div></div></section>
<section class="s"><div class="in"><span class="eyebrow">Details we are proud of</span><h2>Small things, done properly.</h2><div class="cards c2">{details}</div></div></section>
<section class="s"><div class="in"><div class="pager"><a href="features/{prev['id']}/"><span><small>Previous</small>{e(prev['name'])}</span>{I('arrow')}</a><a href="features/{nxt['id']}/"><span class="nx"><small>Next</small>{e(nxt['name'])}</span>{I('arrow')}</a></div></div></section>{band()}'''
    return dict(slug='features/' + f['id'], title='%s: Homebase Hub' % f['name'], cls=f['ac'], desc=f['lead'], body=body)


def telegram():
    chat, buttons = chat_html()
    feats = ''.join('<div class="card hv a-tg"><div class="ico">%s</div><h3>%s</h3><p>%s</p></div>' % (I(ic), e(t), e(p)) for ic, t, p in [
        ('bell', 'A daily digest', 'What is overdue, due today and coming up, at the hour you choose.'),
        ('tasks', 'Due Now, with buttons', 'Tasks with a time get a message when it arrives. Tap Done, Skip or Snooze (1 hour, 3 hours or tomorrow) right there.'),
        ('send', 'Commands in the chat', 'Send /today, /week, /next, /add, /done, /snooze, /backup or /status to your bot.'),
        ('download', 'Backups and login alerts', 'Backup files every few days, and a message whenever someone logs in.')])
    rows = ''.join('<tr><td><code>%s</code></td><td>%s</td></tr>' % (e(c), e(d)) for c, d in [
        ('/today', 'Overdue and due today, with Done buttons'), ('/week', 'The next 7 days'), ('/next', 'The next 10 tasks'), ('/add Netflix 649 monthly 5 Nov', 'A new task (price, repeat, date and time are optional)'),
        ('/done Netflix', 'Mark a task done'), ('/snooze Netflix 2h', 'Pause its reminders (30m, 2h, 1d or tomorrow)'), ('/backup', 'Send a backup file now'), ('/status', 'A quick check of the site')])
    body = f'''<section class="hero fh a-tg"><span class="blob b1" aria-hidden="true"></span><span class="blob b2" aria-hidden="true"></span>
<div class="in hgrid"><div class="hcopy"><div class="crumb"><b>Telegram</b></div><h1>Reminders <span class="grad">where you already are.</span></h1>
<p class="lead">Connect your own Telegram bot and the site tells you what needs you. It only answers your own chat. Tap a command to see the kind of reply you get.</p><div class="cmds">{buttons}</div></div>
<div class="hart">{chat}</div></div></section>
<section class="s a-tg"><div class="in"><span class="eyebrow">What it does</span><h2>Four ways it helps.</h2><div class="cards c2">{feats}</div></div></section>
<section class="s a-tg"><div class="in"><span class="eyebrow">Commands</span><h2>Type it, and it is done.</h2><div class="page flush"><table><tr><th>Command</th><th>What it does</th></tr>{rows}</table></div></div></section>
<section class="s a-tg"><div class="in tg"><div><span class="eyebrow">Set up</span><h2>Four short steps.</h2><p class="intro">Settings, Telegram walks you through making a bot and connecting your chat. It takes a few minutes, and Guided Setup in Settings can lead you there.</p></div>
<div class="frame">{img('s-telegram.webp', 1440, 900, 'Settings, Telegram: four short steps to make a bot and connect your chat')}</div></div></section>{band()}'''
    return dict(slug='telegram', title='Telegram: Homebase Hub', cls='a-tg', desc='Homebase Hub can send a daily digest, Due Now reminders with Done, Skip and Snooze buttons, and backups to your own Telegram chat.', body=body)


def phone():
    os_steps = [('ios', 'iPhone or iPad', 'phone', ['Open your site in Safari.', 'Tap Share (the square with an arrow).', 'Choose Add to Home Screen, then Add.']),
                ('android', 'Android', 'phone', ['Open your site in Chrome.', 'Open the menu (the three dots).', 'Choose Install App, or Add to Home Screen.']),
                ('computer', 'Computer', 'server', ['Open your site in Chrome or Edge.', 'Click the install icon at the right end of the address bar, or open the menu and choose Install.', 'The site opens in its own window and can be pinned like any app.'])]
    tabs = ''.join('<button class="tab a-home" id="t-%s" role="tab" type="button" aria-selected="%s" aria-controls="p-%s">%s%s</button>' % (k, 'true' if n == 0 else 'false', k, I(ic), e(t)) for n, (k, t, ic, _) in enumerate(os_steps))
    panels = ''.join('<div class="a-home" id="p-%s" role="tabpanel" aria-labelledby="t-%s"><ol class="os step-list">%s</ol></div>' % (k, k, ''.join('<li class="step"><i>%d</i><span>%s</span></li>' % (j + 1, e(s)) for j, s in enumerate(ss))) for k, t, ic, ss in os_steps)
    perks = ''.join('<div class="card a-home"><div class="ico">%s</div><h3>%s</h3><p>%s</p></div>' % (I(ic), e(t), e(p)) for ic, t, p in [
        ('phone', 'Its own icon', 'The site sits on your home screen with the Homebase Hub icon, or your site name.'), ('home', 'No browser bars', 'It opens in its own window, like an app.'),
        ('link', 'Shortcuts', 'Press and hold the icon, where your phone allows it, to jump to Links, Info, Cards, Tasks or Tools.'), ('shield', 'Nothing kept offline', 'Your data always comes from your server, and stays there.')])
    body = f'''<section class="hero fh a-home"><span class="blob b1" aria-hidden="true"></span><span class="blob b2" aria-hidden="true"></span>
<div class="in hgrid"><div class="hcopy"><div class="crumb"><b>On your phone</b></div><h1>Your site, <span class="grad">on your home screen.</span></h1>
<p class="lead">Add Homebase Hub to a phone or computer and it opens like an app, with its own icon and no browser bars. Your data still comes from your server every time.</p>
<div class="tabs" role="tablist" aria-label="Your device">{tabs}</div>{panels}</div>
<div class="hart"><div class="phones"><img src="img/m-links.webp" alt="Links on a phone" width="390" height="844" loading="lazy"><img src="img/m-info.webp" alt="Info on a phone" width="390" height="844" loading="lazy"><img src="img/m-tasks.webp" alt="Tasks on a phone" width="390" height="844" loading="lazy"></div></div></div></section>
<section class="s a-home"><div class="in"><span class="eyebrow">What you get</span><h2>Like an app, still your site.</h2><div class="cards c4">{perks}</div>
<p class="intro mt">The same steps are in Settings, General, Install on Your Phone, where an Install button also appears when your browser offers one. It works in a sub-folder too.</p></div></section>{band()}'''
    return dict(slug='phone', title='On your phone: Homebase Hub', cls='a-home', desc='Add Homebase Hub to the home screen of an iPhone, an Android phone or a computer and it opens like an app. Nothing is kept offline.', body=body)


def tools_page():
    cats, tools = load_tools()
    cat_ac = {'images': 'a-cards', 'photos': 'a-home', 'pdf': 'a-tasks', 'utilities': 'a-tools'}
    chips = '<button class="chipbtn" type="button" data-cat="all" aria-pressed="true">All %d</button>' % len(tools) + ''.join(
        '<button class="chipbtn" type="button" data-cat="%s" aria-pressed="false">%s %d</button>' % (c['id'], e(c['name']), sum(1 for t in tools if t['cat'] == c['id'])) for c in cats)
    names = {c['id']: c['name'] for c in cats}
    cards = ''.join('<article class="tool %s" data-cat="%s" data-text="%s"><span class="k">%s</span><b>%s</b><p>%s</p></article>' % (
        cat_ac[t['cat']], t['cat'], e((t['name'] + ' ' + t['desc'] + ' ' + ' '.join(t['kw'])).lower()), e(names[t['cat']]), e(t['name']), e(t['desc'])) for t in sorted(tools, key=lambda t: (t['cat'], t['name'])))
    body = f'''<section class="hero fh a-tools"><span class="blob b1" aria-hidden="true"></span><span class="blob b2" aria-hidden="true"></span>
<div class="in"><div class="crumb"><a href="features/">Features</a> / <b>Tools</b></div><h1>Find the tool <span class="grad">for the job.</span></h1>
<p class="lead">All {len(tools)} tools in Homebase Hub run in your browser. Search by name or by what you want to do.</p></div></section>
<section class="in a-tools"><div class="finder"><label class="sr" for="tf-q">Search the tools</label><input class="search" id="tf-q" type="search" placeholder="Try pdf, qr, resize, background" autocomplete="off">
<div class="cats" role="group" aria-label="Filter by section">{chips}</div><p class="count" id="tf-count" role="status" aria-live="polite">{len(tools)} tools</p>
<div class="tgrid">{cards}</div><p class="none" id="tf-none" hidden>No tool matches that. Try a shorter word.</p></div></section>{band()}'''
    return dict(slug='tools', title='Tool finder: Homebase Hub', cls='a-tools', desc='All %d browser tools in Homebase Hub: images, photos, PDF and utilities. Search by name or by what you want to do.' % len(tools), body=body)


FAQ = [
    ('Do I need a database?', 'No. Everything is kept as files in site-data, which is closed to browsers.'),
    ('What kind of hosting do I need?', 'Any hosting with PHP 8.3 or newer and a file manager (or FTP). HTTPS is recommended. Settings tells you when your PHP is about to stop getting security fixes.'),
    ('Can I put it in a sub-folder?', 'Yes. Upload it to a folder such as /hub/ and it works the same, including installing it on a phone.'),
    ('Can I bring my bookmarks from my browser?', 'Yes. Export them from Chrome, Edge, Firefox, Brave, Opera or Safari, then choose Import Bookmarks in the Links pencil menu. You see a preview first, and a copy of Links is kept so you can undo.'),
    ('Does it work offline?', 'No, on purpose. Your data is private, so it always comes from your server. Added to a home screen, the site opens like an app, but nothing is kept on the phone.'),
    ('What if an update goes wrong?', 'A copy of the current version is kept before every update, and the site checks itself afterwards. If it cannot answer, the saved version comes back by itself. Go Back in Settings, Updates does the same on request. Your data in site-data is never touched by an update.'),
    ('Is my data encrypted?', 'You choose. Encrypted tabs in Links and Info, and encrypted backup files, use one passphrase, and the keys are made in your browser. A lost passphrase and a lost recovery key mean lost data.'),
    ('What if I forget my password?', 'Delete site-data/core/auth.php in your file manager, open the site, click the key icon, and use the setup code from site-data/core/SETUP-CODE.php. Encrypted tabs are locked with your passphrase, so a reset does not touch them.'),
    ('Does Telegram have to be set up?', 'No, it is optional. When you set it up, the bot only answers your own chat.'),
    ('Can I move the site to another host?', 'Yes. Copy the whole site folder, data included, or export a backup and import it on the new site.'),
    ('Which browsers is it tested in?', 'The pages, Tools and this website are tested in Chromium (Chrome, Edge), Firefox and WebKit (Safari) engines, and checked for accessibility.'),
    ('How do I report a problem or ask something?', 'To report a problem, open an issue on GitHub. For anything else, message @Jackpison on Telegram.'),
    ('Is it really free?', 'Yes. Homebase Hub is free software under the GPL-3.0 licence: you may use it, study it, change it and share it.'),
]


def faq():
    items = ''.join('<details><summary>%s</summary><p>%s</p></details>' % (e(q), e(a)) for q, a in FAQ)
    body = f'''<div class="page"><h1>Questions and answers</h1><p class="lead">Short answers about hosting, updates, privacy and more. Search to narrow them down.</p>
<label class="sr" for="faq-q">Search the questions</label><input class="search" id="faq-q" type="search" placeholder="Try update, password, hosting" autocomplete="off"><p class="count mt1" id="faq-count" role="status" aria-live="polite">{len(FAQ)} answers</p>
<div class="faq">{items}</div><p class="none" id="faq-none" hidden>No answer matches that. Ask on <a href="https://t.me/Jackpison">Telegram</a>.</p></div>'''
    return dict(slug='faq', title='Questions and answers: Homebase Hub', cls='', desc='Answers about hosting, updates, privacy, bookmarks, Telegram and more for Homebase Hub.', body=body, wide=True)


def all_pages():
    return [home(), features_hub()] + [feature(f) for f in FEATURES] + [telegram(), phone(), tools_page(), faq()]
