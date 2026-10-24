#!/usr/bin/env python3
"""Build the PDF guide.
  python3 tools/make-guide.py OUT.pdf            dark pages (matches the app)
  python3 tools/make-guide.py OUT.pdf --print    light pages, for printing
Needs reportlab and pillow. Screenshots come from website/img, fonts from tools/fonts (Manrope, SIL OFL)."""
import io, os, re, sys
from PIL import Image as PI
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Image, PageBreak, KeepTogether,
                                Table, TableStyle, NextPageTemplate, Flowable, CondPageBreak)
from reportlab.platypus.tableofcontents import TableOfContents

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, 'website', 'img'); FONTS = os.path.join(ROOT, 'tools', 'fonts')
VER = re.search(r"define\('HUB',\s*'([^']+)'\)", open(os.path.join(ROOT, 'src/web/core-data/lib/boot.php'), encoding='utf-8').read()).group(1)
PRINT = '--print' in sys.argv
OUT = [a for a in sys.argv[1:] if not a.startswith('--')]
OUT = OUT[0] if OUT else os.path.join(ROOT, 'build', 'Homebase-Hub-Guide' + ('-Print' if PRINT else '') + '.pdf')
os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
for n in ('Regular', 'Bold', 'ExtraBold'): pdfmetrics.registerFont(TTFont('M-' + n, os.path.join(FONTS, 'Manrope-%s.ttf' % n)))
pdfmetrics.registerFontFamily('M', normal='M-Regular', bold='M-Bold', italic='M-Regular', boldItalic='M-Bold')

H = colors.HexColor
if PRINT: BG, SURF, LINE, TEXT, MUTE, GOLD, GOLDT, INK = H('#ffffff'), H('#f6f1e7'), H('#e4dccd'), H('#1d1913'), H('#655c50'), H('#ffc21a'), H('#a86f00'), H('#1a1204')
else:     BG, SURF, LINE, TEXT, MUTE, GOLD, GOLDT, INK = H('#0a0908'), H('#171512'), H('#2b2722'), H('#efe9df'), H('#a69d90'), H('#ffc21a'), H('#ffc21a'), H('#1a1204')
CBG, CTEXT, CMUTE = H('#000000'), H('#f3eee5'), H('#a69d90')   # the cover is always dark

def st(n, **k):
    d = dict(fontName='M-Regular', fontSize=10.3, leading=15.6, textColor=TEXT, spaceAfter=6); d.update(k); return ParagraphStyle(n, **d)
S = {'b': st('b'), 'mute': st('mute', textColor=MUTE), 'cap': st('cap', fontSize=8.6, leading=12, textColor=MUTE, spaceAfter=12),
     'h1': st('h1', fontName='M-ExtraBold', fontSize=27, leading=31, spaceAfter=8), 'num': st('num', fontName='M-ExtraBold', fontSize=13, leading=16, textColor=GOLDT, spaceAfter=2),
     'lead': st('lead', fontSize=12.2, leading=18, textColor=MUTE, spaceAfter=14), 'h2': st('h2', fontName='M-Bold', fontSize=14.5, leading=19, textColor=GOLDT, spaceBefore=12, spaceAfter=6),
     'cell': st('cell', fontSize=9.4, leading=13.4, spaceAfter=0), 'cellb': st('cellb', fontName='M-Bold', fontSize=9.4, leading=13.4, spaceAfter=0),
     'th': st('th', fontName='M-Bold', fontSize=8.8, leading=12, textColor=MUTE, spaceAfter=0), 'stepn': st('stepn', fontName='M-ExtraBold', fontSize=12, leading=14, textColor=INK, alignment=1, spaceAfter=0),
     'tip': st('tip', fontSize=9.8, leading=14.6, spaceAfter=0)}
def P(t, s='b'): return Paragraph(t, S[s])
def C(t): return '<font name="M-Bold" color="%s">%s</font>' % (GOLDT.hexval().replace('0x', '#'), t)   # names of buttons and menus
W = A4[0] - 40 * mm

class ChapterMark(Flowable):
    """Invisible: tells the contents page where a chapter starts."""
    def __init__(self, title, level=0): super().__init__(); self.title = title; self.level = level
    def wrap(self, *a): return (0, 0)
    def draw(self): pass

def shot(name, cap, w=None):
    p = os.path.join(IMG, name + '.webp'); im = PI.open(p).convert('RGB'); buf = io.BytesIO(); im.save(buf, 'JPEG', quality=86); buf.seek(0)
    w = (w or 170) * mm; w = min(w, W); h = w * im.size[1] / im.size[0]
    if h > 150 * mm: h = 150 * mm; w = h * im.size[0] / im.size[1]
    t = Table([[Image(buf, width=w, height=h)]], colWidths=[w + 2]); t.hAlign = 'LEFT'
    t.setStyle(TableStyle([('BOX', (0, 0), (-1, -1), .8, LINE), ('LEFTPADDING', (0, 0), (-1, -1), 1), ('RIGHTPADDING', (0, 0), (-1, -1), 1), ('TOPPADDING', (0, 0), (-1, -1), 1), ('BOTTOMPADDING', (0, 0), (-1, -1), 1), ('ROUNDEDCORNERS', [5, 5, 5, 5])]))
    return KeepTogether([t, Spacer(1, 4), P(cap, 'cap')])
def phones(names, cap):
    cells = []
    for n in names:
        im = PI.open(os.path.join(IMG, n + '.webp')).convert('RGB'); buf = io.BytesIO(); im.save(buf, 'JPEG', quality=86); buf.seek(0)
        w = 50 * mm; cells.append(Image(buf, width=w, height=w * im.size[1] / im.size[0]))
    t = Table([cells], colWidths=[56 * mm] * len(cells)); t.hAlign = 'LEFT'
    t.setStyle(TableStyle([('LEFTPADDING', (0, 0), (-1, -1), 0), ('VALIGN', (0, 0), (-1, -1), 'TOP')]))
    return KeepTogether([t, Spacer(1, 4), P(cap, 'cap')])
def steps(items):
    rows = [[P(str(i), 'stepn'), P(t, 'tip')] for i, t in enumerate(items, 1)]
    t = Table(rows, colWidths=[9 * mm, W - 9 * mm], hAlign='LEFT')
    sty = [('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (1, 0), (1, -1), 10), ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5)]
    for i in range(len(rows)): sty += [('BACKGROUND', (0, i), (0, i), GOLD)]
    sty += [('ROUNDEDCORNERS', [3, 3, 3, 3])]
    t.setStyle(TableStyle(sty))
    # each number sits in its own gold square: draw rows as separate tables so the squares do not join up
    out = []
    for r in rows:
        x = Table([r], colWidths=[8 * mm, W - 8 * mm], hAlign='LEFT')
        x.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('BACKGROUND', (0, 0), (0, 0), GOLD), ('LEFTPADDING', (0, 0), (0, 0), 0), ('RIGHTPADDING', (0, 0), (0, 0), 0),
                               ('TOPPADDING', (0, 0), (0, 0), 3), ('BOTTOMPADDING', (0, 0), (0, 0), 3), ('LEFTPADDING', (1, 0), (1, 0), 10), ('TOPPADDING', (1, 0), (1, 0), 3),
                               ('ROUNDEDCORNERS', [3, 3, 3, 3])]))
        out += [x, Spacer(1, 5)]
    return KeepTogether(out + [Spacer(1, 4)])
def table(head, rows, widths=None):
    data = [[P(h, 'th') for h in head]] + [[P(c, 'cellb' if j == 0 else 'cell') for j, c in enumerate(r)] for r in rows]
    widths = widths or [W * .3, W * .7]
    t = Table(data, colWidths=widths, hAlign='LEFT', repeatRows=1)
    t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LINEBELOW', (0, 0), (-1, -1), .6, LINE), ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                           ('LEFTPADDING', (0, 0), (-1, -1), 4), ('BACKGROUND', (0, 0), (-1, 0), SURF)]))
    return KeepTogether([t, Spacer(1, 10)])
def box(kind, text):
    t = Table([[P('<font name="M-Bold" color="%s">%s</font> %s' % (GOLDT.hexval().replace('0x', '#'), kind, text), 'tip')]], colWidths=[W], hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), SURF), ('LINEBEFORE', (0, 0), (0, -1), 3, GOLD), ('LEFTPADDING', (0, 0), (-1, -1), 12), ('RIGHTPADDING', (0, 0), (-1, -1), 12),
                           ('TOPPADDING', (0, 0), (-1, -1), 8), ('BOTTOMPADDING', (0, 0), (-1, -1), 9)]))
    return KeepTogether([t, Spacer(1, 10)])
def Tip(t): return box('Tip.', t)
def Note(t): return box('Note.', t)
def chapter(n, title, lead, *flow):
    return [PageBreak(), ChapterMark('%s  %s' % (n, title)), P('Chapter %s' % n if n.isdigit() else n, 'num'), P(title, 'h1'), P(lead, 'lead')] + list(flow)
def sub(title): return [CondPageBreak(40 * mm), ChapterMark(title, 1), P(title, 'h2')]

# ------------------------------------------------------------------ content
story = [NextPageTemplate('page'), PageBreak()]
toc = TableOfContents(); toc.dotsMinLevel = 0
toc.levelStyles = [ParagraphStyle('t0', fontName='M-Bold', fontSize=11.5, leading=17, textColor=TEXT, leftIndent=0, spaceBefore=6),
                   ParagraphStyle('t1', fontName='M-Regular', fontSize=9.6, leading=13.5, textColor=MUTE, leftIndent=14)]
story += [P('Contents', 'h1'), Spacer(1, 6), toc]

story += chapter('1', 'Welcome', 'Homebase Hub puts the small things you open every day in one private place on your own hosting.',
 P('There are six pages and one Settings page, all behind one login. They share the same bar, the same look and the same backup. There is no database: your data lives in one folder, <font name="M-Bold">site-data</font>, that browsers cannot open.'),
 table(['Page', 'What it is for'], [['Home', 'Your start page, with background photos that change.'], ['Links', 'Bookmarks in tabs and categories.'], ['Info', 'Notes in tabs, arranged as boxes or written as a document.'],
   ['Cards', 'Your cards in one table you can search.'], ['Tasks', 'Bills, renewals and chores with due dates.'], ['Tools', 'Image, PDF and text tools that run in your browser.'], ['Settings', 'Everything about the site: look, security, Telegram, backups, updates, health.']]),
 *sub('The bar'),
 P('On the left are the logo and the site name, then the pages. In the middle is search. On the right are four icons: %s (dark or light), %s (the pencil, with the edit options of the page you are on), %s and %s (the gear).' % (C('Theme'), C('Edit'), C('Backup'), C('Settings'))),
 shot('links-crop', 'The bar is the same on every page. Here it sits above Links.'),
 *sub('Search'),
 P('Search covers Links, Info, Tasks and Tools; Cards has its own search box. The sliders button in the search box chooses where to look: everything, one page, one tab, which fields, and whole words only.'),
 table(['To do this', 'Press or type'], [['Open search from anywhere', '<font name="M-Bold">/</font> or <font name="M-Bold">Ctrl+K</font>'], ['Search only Links', '<font name="M-Bold">links:</font> followed by your words'], ['Search only Info', '<font name="M-Bold">info:</font> followed by your words']]))

story += chapter('2', 'Install', 'You need web hosting with PHP 8.3 or newer and a file manager or FTP. HTTPS is recommended.',
 steps(['Download <font name="M-Bold">site-update-X.Y.Z.zip</font> from the latest release on GitHub (github.com/Jackpison/Homebase-Hub/releases).',
        'In your hosting file manager, open your domain\'s folder (for example <font name="M-Bold">public_html</font>). Upload the zip and extract it there.',
        'Open your domain in a browser and click the key icon at the top right. The welcome box opens.',
        'In the file manager, open <font name="M-Bold">site-data/core/SETUP-CODE.php</font> and copy the code from the line that starts with SETUP CODE. If the folder is not there yet, reload the file manager.',
        'Paste the code, choose a site name and a password, and press %s. You are logged in, and the code file deletes itself.' % C('Create my site')]),
 Note('Never delete <font name="M-Bold">site-data</font>. It holds all your data, and updates never touch it. Each domain has its own site-data folder, so domains never share data.'),
 *sub('What is in the site folder'),
 table(['Folder', 'What it holds'], [['index.php', 'The start page. The only file in the root of the site folder.'], ['web/', 'Everything the site is made of: the pages, the shared engine (web/core-data) and the docs (web/docs).'],
   ['web/core-data/media/', 'Your own files: your logo, start page photos and uploads, saved link icons. Never replaced by an update.'], ['web/docs/', 'README.txt, CHANGELOG.md and the readable source. Closed to browsers.'],
   ['site-data/', 'Your private data, made by the site. Closed to browsers.']]))

story += chapter('3', 'First steps', 'Guided Setup walks you through protecting your site, one step at a time.',
 steps(['Open %s (the gear in the bar).' % C('Settings'), 'Choose %s, then the %s tab.' % (C('Overview'), C('Guided Setup')),
        'Work through the steps: a strong password, two-step login, an encryption passphrase, a first backup, and Telegram.', 'Come back to Overview any time: it shows what still needs a look.']),
 shot('s-overview', 'Settings, Overview: a card for each area, the things to look at next, and a status on every menu item.'),
 Tip('You can do the steps in any order, and skip the ones you do not need. Each one also lives in its own section of Settings.'),
 *sub('Install on your phone'),
 P('Put your site on the home screen of a phone or computer. It then opens like an app, with its own icon and no browser bars. Your data still comes from your server every time: nothing is kept offline. The steps are also in %s.' % C('Settings, General, Install on Your Phone')),
 P('<font name="M-Bold">iPhone or iPad</font>'),
 steps(['Open your site in Safari.', 'Tap %s (the square with an arrow).' % C('Share'), 'Choose %s, then %s.' % (C('Add to Home Screen'), C('Add'))]),
 P('<font name="M-Bold">Android</font>'),
 steps(['Open your site in Chrome.', 'Open the menu (the three dots).', 'Choose %s (or %s).' % (C('Install App'), C('Add to Home Screen'))]),
 P('<font name="M-Bold">Computer</font>'),
 steps(['Open your site in Chrome or Edge.', 'Click the install icon at the right end of the address bar, or open the menu and choose %s.' % C('Install'), 'The site opens in its own window and can be pinned like any app.']),
 Tip('On a computer, Settings can also show an %s button when the browser offers it.' % C('Install')))

story += chapter('4', 'Home', 'Your start page: the first thing you see when you open your site.',
 shot('home-1', 'Home, with a photo and its credit in the top corner, next to the buttons for the next photo and for settings.'),
 P('Background photos change on their own, and the photo\'s credit is shown in the corner. Each new photo also gets a phone-sized copy, so the page loads quickly on a phone. Your own photos and uploads are kept in <font name="M-Bold">web/core-data/media/home</font>, which updates never replace.'),
 P('The start page can be shown with the bar or without it. Without the bar, the gear button in the corner opens editing, the other pages and Settings once you are logged in.'),
 shot('home-3', 'Another photo from the start page\'s rotation.'))

story += chapter('5', 'Links', 'Bookmarks in tabs, each with categories of links.',
 shot('links-crop', 'Links with six categories. Each link shows its saved icon.'),
 *sub('Edit your bookmarks'),
 steps(['Open the pencil menu in the bar and choose %s.' % C('Edit This Page'), 'Add, rename, reorder or remove tabs, categories and links.', 'Press %s when you are finished.' % C('Done Editing')]),
 P('The pencil menu also has %s, %s (saves each link\'s icon on your server), %s, %s and %s.' % (C('Import Bookmarks'), C('Fetch Icons'), C('Colors'), C('Text Sizes'), C('Page Settings'))),
 *sub('Import from your browser'),
 steps(['In your browser, open the bookmarks manager and choose %s. Chrome, Edge, Firefox, Brave, Opera and Safari all save an .html file.' % C('Export Bookmarks'),
        'In Links, open the pencil menu and choose %s, then pick that file.' % C('Import Bookmarks'),
        'Check the preview: how many links, which folder becomes which category, and how many are already in Links.',
        'Choose %s (it can be private) or an existing tab, and press %s.' % (C('A New Tab'), C('Import'))]),
 shot('links-import', 'Import Bookmarks with the preview of a browser\'s export.'),
 P('Folders become categories; a folder inside a folder becomes "Folder / Subfolder". Links you already have are not added twice, and addresses that are not web links (such as javascript: or file:) are left out. The file is read in your browser and never uploaded; only the links are saved.'),
 Tip('Changed your mind? Settings, Backup & Restore, Earlier Versions has a copy of Links from just before the import. Choose %s afterwards to save the new links\' icons.' % C('Fetch Icons')),
 *sub('Encrypted tabs'),
 P('A tab can be encrypted with your passphrase (set it in Settings, Security, Encryption). The same passphrase locks Info\'s encrypted tabs and your backup files. Search finds a locked tab by its name, but never shows what is inside.'),
 P('A <font name="M-Bold">gold padlock</font> on a tab means it is private: it is only shown when you are logged in. A <font name="M-Bold">green padlock with a tick</font> means it is encrypted.'),
 Note('A lost passphrase together with a lost recovery key means the encrypted tabs cannot be opened by anyone, including you.'),
 phones(['m-links'], 'Links on a phone.'))

story += chapter('6', 'Info', 'Notes in tabs. Each tab holds from 1 to 12 boxes.',
 shot('info-crop', 'A tab laid out as Notebook Cards: boxes of different widths.'),
 *sub('Two layouts'),
 table(['Layout', 'How it looks'], [['Notebook Cards', 'The default. Boxes are cards that you size and arrange.'], ['Document', 'The boxes make one page, with an outline at the side.']]),
 shot('info-doc-crop', 'A tab laid out as a Document, with its outline.'),
 *sub('Add and size boxes'),
 steps(['Choose %s from the pencil menu.' % C('Edit This Page'), 'At the end of the tab, click the dashed %s tile.' % C('+ Add Box'), 'Open the box\'s %s to set its width and height, move it earlier or later, or delete it.' % C('Box Settings')]),
 table(['Setting', 'Choices'], [['Width', 'Auto, One Third, Half, Two Thirds, Full'], ['Height', 'Auto, Short, Tall, Extra Tall']]),
 P('On a phone every box is full width. Tabs can be encrypted like Links tabs. %s saves the current tab or all tabs as PDF or text.' % C('Export')),
 Tip('The PDF export uses a built-in font. For text in non-Latin scripts, export as text instead.'))

story += chapter('7', 'Cards', 'Your cards in one table you can search and filter.',
 shot('cards-crop', 'Cards with example data. The boxes at the top count cards and add up yearly charges.'),
 table(['Column', 'What it shows'], [['Bank and Card', 'The bank and the card\'s name, linked to their pages where known.'], ['Network', 'Visa, Mastercard, RuPay and so on.'], ['Variant', 'For example Platinum or Signature.'],
   ['Limit', 'The credit limit.'], ['Holder', 'Whose card it is.'], ['Type and Base', 'Credit or debit, and what it is based on.'], ['Charges', 'The yearly fee, or Free.'], ['Expiry', 'Month and year.'], ['Remark', 'Your own note.']]),
 P('Filter by bank, network, type and holder, or type in the search box. Hover over a row to show its Edit button.'),
 Note('No card data is sent to a browser until you are logged in. Deleting cards always keeps an earlier version first, so a delete can be undone from Backup and Restore.'))

story += chapter('8', 'Tasks', 'Bills, renewals and chores: anything with a due date.',
 shot('tasks', 'Tasks grouped by when they are due, with this week across the top.'),
 *sub('Add a task'),
 steps(['Type into the quick box at the top, for example "Netflix 649 monthly 5 Nov 9pm", and press %s.' % C('Add'), 'Or press %s to open the full editor.' % C('Add Task'), 'Fill in what you need and save.']),
 table(['Field', 'What it is for'], [['Name', 'What the task is.'], ['Due', 'The date (and time) it is due.'], ['Repeat', 'Every few days, weeks, months or years, or never.'], ['Price and currency', 'What it costs, for the money views.'],
   ['Category', 'Your own groups, such as Home or Website.'], ['Payment', 'How you pay, such as Card or Bank transfer.']]),
 *sub('Smart lists and views'),
 table(['List or view', 'What it shows'], [['Tasks', 'Everything.'], ['Today, Overdue', 'What is due today, and what is late.'], ['This Week, This Month', 'What is coming up, with the amounts.'], ['Paused', 'Tasks you stopped for now.'],
   ['Calendar', 'The month at a glance.'], ['Analytics', 'Spending by month and by category, coming payments and repeating costs.'], ['Completed', 'What you have done.']]),
 shot('tasks-analytics-crop', 'Analytics: the next 12 months at a glance.'),
 Tip('Telegram can remind you when something is due (Settings, Telegram). Analytics also makes a Year in Review PDF.'))

story += chapter('9', 'Tools', 'Small tools that run in your browser.',
 shot('tools-crop', 'Tools, grouped into sections.'),
 table(['Kind', 'Tools'], [['Images', 'Crop, circle crop, resize, compress, convert, rotate, adjust, watermark, redact, collage, meme, ID photo, colours, Base64, SVG to PNG, favicon, metadata'],
   ['PDF', 'Merge, compress, organise, annotate, sign, protect, extract text, PDF to images, images to PDF'], ['Other', 'Text from images (OCR), background removal, QR codes, hashes, JSON formatter, text tool, zip files']]),
 P('%s (Get from a Website) shows a website\'s icon in 16, 32, 64, 128, 256 and 512 pixels. Press %s under a size and the file is saved right away. Google\'s icon service gives at most 256 pixels, so the 512 picture is enlarged from that.' % (C('Favicon'), C('PNG'))),
 P('Tools has its own sections: Tools, Recent, Favourites, one per category, Organise and Settings. In %s you star favourites, drag tools to reorder them or move them to another section, and hide the ones you do not use.' % C('Organise')),
 Tip('Heavy engines, such as OCR and background removal, only load when a tool needs them.'))

story += chapter('10', 'Settings', 'Everything about the site, in one page.',
 P('The menu on the left has three groups: %s (General, Appearance), %s (Security, Telegram, Backup and Restore) and %s (Updates, Health, Changelog). The search box at the top of the menu jumps to any setting.' % (C('Site'), C('Protection and Data'), C('System'))),
 Note('General and Appearance show changes as you make them and are kept with %s; a bar appears at the bottom while something is unsaved. Every other section saves each change at once.' % C('Save Settings')),
 *sub('General'),
 table(['Tab', 'What it holds'], [['Basics', 'Site name, logo and time zone. One logo is used everywhere; until you choose one, Homebase Hub\'s gold house is used.'], ['Navigation', 'Rename, reorder or hide the pages in the bar. The start page can run without the bar.'], ['Pages', 'The site\'s pages.']]),
 shot('s-general', 'Settings, General.'),
 *sub('Appearance'),
 table(['Tab', 'What it holds'], [['Look', 'Where the bar sits, the font and the default theme.'], ['Presets', '166 looks with a search box and Surprise Me. Save your own and export or import them.'], ['Colors', 'Colours for Dark and Light separately, and a separate accent for each page.']]),
 shot('s-presets', 'Appearance, Presets.'),
 *sub('Security'),
 table(['Tab', 'What it holds'], [['Password', 'Change your password, with a strength meter.'], ['Two-Step Login', 'An authenticator app and recovery codes.'], ['Login Approval', 'Approve each login in Telegram.'],
   ['Trusted Browsers', 'Browsers that skip the two-step code for 30 days (never the password).'], ['Devices', 'Login history and logged-in devices. Log out one, or all others.'], ['Encryption', 'Set, change or remove the passphrase, and make a recovery key.']]),
 shot('s-security', 'Settings, Security.'),
 *sub('Telegram'),
 P('Telegram can send a daily digest, Due Now messages, a backup reminder, login alerts and backup files, and can answer you in a two-way bot. Under a Due Now message you can tap Done, Skip or Snooze (1 hour, 3 hours or tomorrow), and %s holds a task\'s reminders back for the time you choose.' % C('/snooze Netflix 2h')),
 steps(['Make a bot with @BotFather in Telegram and copy its token.', 'Paste the token in %s, then connect your chat.' % C('Setup'), 'Send a test message.', 'Set up the schedule: a cron job in your hosting panel. The Setup tab shows the exact command with a copy button.']),
 shot('s-telegram', 'Settings, Telegram.'),
 *sub('Backup and Restore'),
 table(['Tab', 'What it holds'], [['Back Up', 'Choose the parts, see the size, and download one backup file.'], ['Restore', 'Replace everything, or add or update only some tabs. The current data is kept as an earlier version first.'],
   ['Export Data', 'Links, Cards or Tasks as CSV or JSON.'], ['Earlier Versions', 'Each page\'s saved versions, with Restore.'], ['Start Over', 'Erase everything except your password and two-step login. Needs ERASE and your password.']]),
 Note('A backup holds every page and its settings, Telegram and the domain watch list. It does not hold your password, two-step login, trusted browsers or passphrase. Keep backup files somewhere other than your server.'),
 shot('s-backup', 'Settings, Backup and Restore.'),
 *sub('Health'),
 table(['Tab', 'What it holds'], [['Overview', 'Disk use, speed, errors, backups, and Test a Restore.'], ['Domains and Uptime', 'A watch on your domains, their SSL and whether they answer.'], ['Server Check', 'What your hosting allows: reaching other websites (including GitHub), writing folders, PHP limits and extensions.']]),
 shot('s-check', 'Health, Server Check.'),
 *sub('Changelog'),
 P('Every version and what it changed, newest first.'),
 phones(['m-settings', 'm-tasks', 'm-info'], 'On a phone, Settings opens with its menu, and every page fits the screen.'))

story += chapter('11', 'Updates', 'Update from GitHub with one click and your password, or by uploading a zip.',
 shot('s-updates', 'Settings, Updates: Update From GitHub above, Update the Site by zip below.'),
 *sub('Update from GitHub'),
 steps(['Open %s, then %s.' % (C('Settings'), C('Updates')), 'Press %s.' % C('Check Now'), 'If a newer version exists, press %s. The site downloads it and checks its size and SHA-256, then gives it the same checks as an uploaded zip.' % C('Download and Check Version X'),
        'Read what will change and what the new version says about itself.', 'Type your website password and apply it.']),
 Note('The daily check (%s) is off by default. While it is off, the site never contacts GitHub unless you press Check Now. When it is on, the check runs with the Telegram schedule, and nothing ever installs by itself.' % C('Check GitHub Once a Day')),
 *sub('Update by zip'),
 steps(['Download the new zip on your computer.', 'In %s, upload it under %s.' % (C('Updates'), C('Update the Site')), 'Read the changes and apply with your password.']),
 *sub('What happens when you apply'),
 P('The site saves the version it has now, replaces its files one by one, removes old files, and then looks at itself. If it cannot answer, the saved version comes back by itself. %s does the same on request.' % C('Go Back')),
 table(['Never touched by an update', ''], [['site-data/', 'Your data.'], ['web/core-data/media/', 'Your logo, photos and saved icons.'], ['web/core-data/config.php', 'Site limits.'], ['Tools settings', 'Your tools layout and favourites.']]),
 *sub('Files'),
 P('The %s tab compares your server with this version\'s file list. It shows files that do not belong, files changed by hand, and missing files. You can delete the ones that do not belong after typing your password.' % C('Files')),
 shot('s-files', 'Updates, Files.'))

story += chapter('A', 'Help and recovery', 'What to do when something goes wrong.',
 *sub('Forgot the password'),
 steps(['In your hosting file manager, delete <font name="M-Bold">site-data/core/auth.php</font>.', 'Open the site and click the key icon. It asks for a setup code.', 'Copy the code from <font name="M-Bold">site-data/core/SETUP-CODE.php</font>, enter it with a new password. The file deletes itself afterwards.']),
 Note('This turns two-step login off; turn it on again in Settings, Security. Encrypted tabs and backups are locked with your passphrase, not your password, so they are not affected.'),
 *sub('Lost the phone with the authenticator app'),
 P('Log in with a recovery code instead of the 6-digit code. With no codes left, follow Forgot the password.'),
 *sub('Link icons do not load'),
 P('Run Settings, Health, Server Check. It shows whether your hosting can reach other websites and write to the icon folders. If it cannot reach other websites, Links shows icons from an icon service instead.'),
 *sub('Keeping your site safe'),
 P('The site itself needs no regular work. The one thing to watch is PHP, the language your hosting runs it with. Each PHP version gets security fixes for about four years, and then stops. Homebase Hub needs PHP 8.3 or newer.'),
 table(['What', 'What to do'], [['PHP version', 'Check it in Settings, Health, Server Check. Settings, Overview warns you when your PHP is about to stop getting fixes. Change it in your hosting panel (in cPanel: MultiPHP Manager) to 8.4 or newer.'], ['New versions', 'Install them from Settings, Updates when you see them. Each release says what changed.'], ['Backups', 'Make one now and then in Settings, Backup and Restore, and keep it somewhere other than your server.']]),
 Note('An update that needs a newer PHP than your server has is refused with a clear message, and nothing changes. Change the PHP version, then try again.'),
 *sub('Moving the site'),
 P('Copy the whole site folder, data included. Or export a backup, install a new site, and import the backup there. Backups made before a passphrase change need the old passphrase.'),
 *sub('Contact'),
 table(['For', 'Where'], [['Questions and ideas', 'Telegram @Jackpison (t.me/Jackpison)'], ['Bugs', 'github.com/Jackpison/Homebase-Hub/issues'], ['Security problems', 'Telegram @Jackpison, not a public issue'], ['Website and downloads', 'jackpison.github.io/Homebase-Hub']]))

# ------------------------------------------------------------------ pages
class Doc(BaseDocTemplate):
    def afterFlowable(self, f):
        if isinstance(f, ChapterMark): self.notify('TOCEntry', (f.level, f.title, self.page))
def cover(c, d):
    c.saveState(); c.setFillColor(CBG); c.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)
    p = c.beginPath(); p.moveTo(40 * mm, 170 * mm); p.lineTo(110 * mm, 240 * mm); p.lineTo(A4[0], 240 * mm - (A4[0] - 110 * mm)); p.lineTo(A4[0], 0); p.lineTo(40 * mm + 0, 0); p.close()
    c.setFillColor(colors.Color(245 / 255, 158 / 255, 11 / 255, alpha=.14)); c.drawPath(p, stroke=0, fill=1)
    c.setFillAlpha(1); c.setStrokeAlpha(1)
    c.drawImage(os.path.join(ROOT, 'website', 'brand', 'logo-512.png'), 22 * mm, 200 * mm, 50 * mm, 50 * mm, mask='auto')
    c.setFillColor(CTEXT); c.setFont('M-ExtraBold', 44); c.drawString(22 * mm, 172 * mm, 'Homebase Hub')
    c.setFillColor(GOLD); c.setFont('M-Bold', 19); c.drawString(22 * mm, 158 * mm, 'The guide to every page and every setting')
    c.setFillColor(CMUTE); c.setFont('M-Regular', 12.5); c.drawString(22 * mm, 146 * mm, 'Version %s%s' % (VER, '   Print edition' if PRINT else ''))
    c.setFont('M-Regular', 9.5)
    y = 40 * mm
    for ln in ['A self-hosted start page with bookmarks, notes, cards, tasks and browser tools.', 'Screenshots show the real app with example data.',
               'Free software under the GNU General Public License, version 3, without any warranty.', 'github.com/Jackpison/Homebase-Hub']:
        c.drawString(22 * mm, y, ln); y -= 6 * mm
    c.setFillColor(GOLD); c.rect(0, 0, A4[0], 5 * mm, stroke=0, fill=1); c.restoreState()
def page(c, d):
    c.saveState(); c.setFillColor(BG); c.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)
    c.setStrokeColor(LINE); c.setLineWidth(.6); c.line(20 * mm, A4[1] - 13 * mm, A4[0] - 20 * mm, A4[1] - 13 * mm)
    c.drawImage(os.path.join(ROOT, 'website', 'brand', 'logo-192.png'), 20 * mm, A4[1] - 11.4 * mm, 5 * mm, 5 * mm, mask='auto')
    c.setFont('M-Bold', 8.5); c.setFillColor(MUTE); c.drawString(27 * mm, A4[1] - 10 * mm, 'Homebase Hub Guide')
    c.drawRightString(A4[0] - 20 * mm, A4[1] - 10 * mm, 'Version %s' % VER)
    c.setFillColor(GOLDT); c.setFont('M-ExtraBold', 9.5); c.drawRightString(A4[0] - 20 * mm, 10 * mm, str(d.page))
    c.restoreState()
doc = Doc(OUT, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=20 * mm, bottomMargin=18 * mm, title='Homebase Hub Guide', author='Jackpison', subject='Homebase Hub %s' % VER)
fr = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='f')
doc.addPageTemplates([PageTemplate(id='cover', frames=[fr], onPage=cover), PageTemplate(id='page', frames=[fr], onPage=page)])
doc.multiBuild(story)
print('guide', os.path.basename(OUT), os.path.getsize(OUT) // 1024, 'KB')
