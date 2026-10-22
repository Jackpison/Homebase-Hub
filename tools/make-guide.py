#!/usr/bin/env python3
"""Build the PDF guide: python3 tools/make-guide.py OUT.pdf   (needs reportlab and pillow; screenshots come from website/img)."""
import io, os, re, sys
from PIL import Image as PI
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Image, PageBreak, KeepTogether, ListFlowable, ListItem

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, 'website', 'img')
VER = re.search(r"define\('HUB',\s*'([^']+)'\)", open(os.path.join(ROOT, 'src/web/core-data/lib/boot.php'), encoding='utf-8').read()).group(1)
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'build', 'Homebase-Hub-Guide.pdf')
os.makedirs(os.path.dirname(OUT), exist_ok=True)
AC = colors.HexColor('#b7791f'); INK = colors.HexColor('#2a2622'); MU = colors.HexColor('#6f675f')
S = {
 'b': ParagraphStyle('b', fontName='Helvetica', fontSize=10.5, leading=15.5, textColor=INK, spaceAfter=6),
 'h1': ParagraphStyle('h1', fontName='Helvetica-Bold', fontSize=22, leading=26, textColor=INK, spaceBefore=0, spaceAfter=10),
 'h2': ParagraphStyle('h2', fontName='Helvetica-Bold', fontSize=14, leading=18, textColor=AC, spaceBefore=12, spaceAfter=4),
 'cap': ParagraphStyle('cap', fontName='Helvetica-Oblique', fontSize=8.5, leading=11, textColor=MU, spaceAfter=10),
 'ti': ParagraphStyle('ti', fontName='Helvetica-Bold', fontSize=34, leading=40, textColor=INK, spaceAfter=10),
 'sub': ParagraphStyle('sub', fontName='Helvetica', fontSize=14, leading=20, textColor=MU, spaceAfter=8),
}
def P(t, s='b'): return Paragraph(t, S[s])
def B(items): return ListFlowable([ListItem(P(i), leftIndent=12, bulletColor=AC) for i in items], bulletType='bullet', start='-', leftIndent=14, bulletFontSize=10)
def shot(name, cap, w=165):
    p = os.path.join(IMG, name + '.webp'); im = PI.open(p).convert('RGB'); buf = io.BytesIO(); im.save(buf, 'JPEG', quality=84); buf.seek(0)
    r = im.size[1] / im.size[0]; img = Image(buf, width=w * mm, height=w * mm * r); img.hAlign = 'LEFT'
    return KeepTogether([img, Spacer(1, 3), P(cap, 'cap')])
def chapter(title, *flow): return [PageBreak(), P(title, 'h1')] + list(flow)

story = [Spacer(1, 50 * mm), P('Homebase Hub', 'ti'), P('The guide to every page and every setting', 'sub'), P('Version %s' % VER, 'sub'), Spacer(1, 10 * mm),
 P('A self-hosted personal workspace: your start page, links, notes, cards, tasks and browser tools, on your own server.'),
 Spacer(1, 6 * mm),
 P('This guide was written from the project documentation and the running %s site, and the screenshots are real (with invented example data). If something on your site differs from what is written here, your site is right: please tell <b>@Jackpison</b> on Telegram so the guide can be fixed. Feature requests and questions go there too; bugs go to GitHub Issues (github.com/Jackpison/Homebase-Hub).' % VER),
 Spacer(1, 6 * mm), P('Homebase Hub is free software under the GNU General Public License, version 3. It comes without any warranty.', 'cap')]

story += chapter('1. Introduction',
 P('Homebase Hub has six pages and one Settings page, all behind one login: <b>Home</b> (your start page), <b>Links</b> (bookmarks), <b>Info</b> (notes), <b>Cards</b>, <b>Tasks</b> and <b>Tools</b>. There is no database: your data lives in guarded files in the <font face="Courier">site-data</font> folder inside your site folder.'),
 P('The bar', 'h2'),
 P('On the left are the logo and site name, then the pages. In the middle is search. On the right are icons: Theme, Edit (the pencil), Backup and Settings (the gear). The pencil holds each page\'s edit options, such as Edit this page, and options like Fetch icons, Column colors, Text sizes, Export, Add card, Background and Page settings, depending on the page.'),
 P('Search', 'h2'),
 P('Search covers Links, Info, Tasks (while you are logged in) and Tools; Cards keeps its own search. Press <b>/</b> or <b>Ctrl+K</b> anywhere. The sliders button in the search box sets the options: everything or only Links, Info or Tools, one tab, which fields to look in, and whole words. You can also type <font face="Courier">links: text</font> or <font face="Courier">info: text</font>.'),
 shot('links', 'Links, one of the six pages. The bar is the same on every page.'))

story += chapter('2. Installing',
 P('You need a web host with <b>PHP 8.1 or newer</b> and a file manager or FTP. HTTPS is recommended.'),
 B(['Download <font face="Courier">site-update-X.Y.Z.zip</font> from the latest release on GitHub.',
    'In your hosting file manager open the folder of your domain (for example public_html), upload the zip and extract it there.',
    'Open your domain in a browser and click the key icon (top right). The Welcome box opens.',
    'In the file manager open <font face="Courier">site-data/core/SETUP-CODE.php</font> and copy the code from the line that starts with SETUP CODE:. It is a PHP file only so that a browser gets a 404 for it. If the folder is not there yet, reload the file manager.',
    'Paste the code, choose a site name and a password, and press Create my site. You are logged in, and the code file deletes itself.']),
 P('Nothing else needs configuring. Each domain keeps its own <font face="Courier">site-data</font> folder, so domains never share data. <b>Never delete site-data</b>: it holds all your data, and updates never touch it.'),
 P('Folders in short', 'h2'),
 B(['<font face="Courier">index.php</font>: the start page, the only file in the site folder\'s root.',
    '<font face="Courier">web/</font>: everything the site is made of. <font face="Courier">web/core-data</font> holds the shared engine, its docs and your own files (<font face="Courier">media</font>: the logo, start page photos and uploads, saved link icons).',
    '<font face="Courier">site-data/</font>: your private data, created automatically.']))

story += chapter('3. First-time setup',
 P('After you create your site, open <b>Settings</b> (the gear) and use <b>Overview > Guided Setup</b>. It walks through the protection steps in order: a strong password, two-step login, an encryption passphrase, backups and Telegram. You can do the steps in any order later from their own sections.'),
 shot('s-overview', 'Settings, Overview. Where things stand, and what to look at next.'),
 P('Overview shows a card for Site, Security, Telegram, Backup, Updates and Health, a short list of things that need a look (for example a stopped schedule, a due backup, files that do not belong, or a newer version), and a status pill on every menu item.'))

story += chapter('4. Home',
 P('Home is your start page. Background photos rotate; each new photo also gets a phone-sized copy so the page loads faster on a phone. Photos and uploads are kept in <font face="Courier">web/core-data/media/home</font>, which updates never replace. The start page can be shown without the bar; then a gear button in its corner opens editing, the other pages and Settings once you are logged in.'),
 shot('home', 'Home. (Background photos are not shown here: this screenshot was made without internet access.)'))

story += chapter('5. Links',
 P('Links holds your bookmarks in <b>tabs</b>, each with <b>categories</b> of links. Link icons are saved on your server (<font face="Courier">media/links/icons</font>) so they keep working. The pencil menu offers Edit this page, Fetch icons, Column colors, Text sizes and Export.'),
 P('Encrypted tabs', 'h2'),
 P('A tab can be encrypted. It is locked with your encryption passphrase, which also locks Info\'s encrypted tabs and your backup files (see Security). The site finds a locked tab\'s name in search but not what is inside.'),
 shot('m-links', 'Links on a phone.', 60))

story += chapter('6. Info',
 P('Info holds notes in tabs. Each tab has from <b>1 to 12 boxes</b>. In edit mode every tab ends with a dashed <b>+ Add Box</b> tile, and each box has Box Settings: <b>Width</b> (Auto, One Third, Half, Two Thirds, Full), <b>Height</b> (Auto, Short, Tall, Extra Tall), Move Earlier, Move Later and Delete Box.'),
 P('A tab\'s layout is <b>Notebook Cards</b> (the default: cards you can size and arrange) or <b>Document</b> (sizes make the page, with an outline). On a phone every box is full width. Tabs can be encrypted, and the Export dialog saves all tabs or the current tab as PDF or text. The PDF uses a built-in font, so text in non-Latin scripts belongs in a Text export.'),
 shot('info', 'Info.'))

story += chapter('7. Cards',
 P('Cards keeps your cards in a table you can search. No card data is sent until you are logged in. Deleting cards always keeps an earlier version first, so a delete can be undone from Backup &amp; Restore > Earlier Versions. You can also export Cards as CSV or JSON from Settings (see Backup &amp; Restore).'),
 shot('cards', 'Cards.'))

story += chapter('8. Tasks',
 P('Tasks are things that have a due date. A task can repeat, carry a price, and have a category and a way of paying. The side panel has smart lists: <b>Tasks</b> (everything), <b>Today</b>, <b>Overdue</b>, <b>This Week</b>, <b>This Month</b> and <b>Paused</b>, each with its count and amount. There are also Calendar, Analytics and Completed views, and a Year in Review PDF. Reminders can arrive through Telegram (see Settings > Telegram).'),
 shot('tasks', 'Tasks, with example tasks.'))

story += chapter('9. Tools',
 P('Tools are small utilities that run in your browser. They include image tools (crop, circle crop, resize, compress, convert, rotate, adjust, watermark, redact, collage, meme, ID photo, colours, Base64, SVG to PNG, favicon, metadata), PDF tools (merge, compress, organise, annotate, sign, protect, extract text, PDF to images, images to PDF), OCR (text from images), background removal, a QR code generator, a hash generator, a JSON formatter, a text tool and a zip creator.'),
 P('Tools has its own sections: Tools, Recent, Favourites, one per category, Organise and Settings. Settings > Layout shows the sections as a side menu (the default; it can shrink to icons) or as tabs on top; phones always get tabs. In Organise you star favourites, drag tools to reorder them or move them to another section, reorder sections and hide tools. Heavy engines (OCR, background removal, PDF encryption) load only when a tool needs them.'),
 shot('tools', 'Tools.'))

story += chapter('10. Settings',
 P('Settings is a page of its own (the gear in the bar). The menu on the left has three groups: <b>Site</b> (General, Appearance), <b>Protection &amp; Data</b> (Security, Telegram, Backup &amp; Restore) and <b>System</b> (Updates, Health, Changelog). A search box at the top of the menu jumps to any setting (press /). General and Appearance preview live and are kept with <b>Save Settings</b>: a bar appears at the bottom while something is unsaved, with Discard. The other sections save each change at once. On a phone the menu comes first and each section opens with a back button.'),
 P('General', 'h2'),
 P('<b>Basics</b> (site name, logo, time zone), <b>Navigation</b> (rename, reorder or hide the pages in the bar; the start page can run without the bar) and <b>Pages</b>. There is one site logo for every page; no page has its own icon.'),
 shot('s-general', 'Settings, General.'),
 P('Appearance', 'h2'),
 P('<b>Look</b>, <b>Presets</b> and <b>Colors</b>. Presets are 166 built-in looks with a search box and a Surprise Me button; you can save your own presets and export or import them as JSON. Colors work on one mode at a time (Dark or Light) in groups: Menu Bar, Page and Text, and each page can have its own accent. The arrow next to a color puts it back to the default.'),
 shot('s-presets', 'Settings, Appearance, Presets.'),
 shot('s-appearance', 'Settings, Appearance, Look.'),
 P('Security', 'h2'),
 B(['<b>Password</b>: one bcrypt-hashed password, with a strength meter when you change it.',
    '<b>Two-Step Login</b>: an authenticator app and recovery codes. You are warned when recovery codes run low.',
    '<b>Login Approval</b>: approve logins in Telegram.',
    '<b>Trusted Browsers</b>: tick Trust this browser for 30 days when you log in to skip the two-step code (never the password). Each one can be removed.',
    '<b>Devices</b>: login history and the list of logged-in devices; log out one device or all others.',
    '<b>Encryption</b>: Set Passphrase, Change Passphrase, Recovery Key and Remove Passphrase. One passphrase locks Info\'s encrypted tabs, Links\' encrypted tabs and backup files. Keys are made in your browser. A lost passphrase and a lost recovery key mean lost data.']),
 P('Five wrong tries pause logins for 15 minutes, doubling up to a day. Sessions last 30 days and are tied to the browser.'),
 shot('s-security', 'Settings, Security.'),
 P('Telegram', 'h2'),
 P('Telegram can send a daily digest, Due Now messages, a backup reminder, login alerts, backup files, and answer in a two-way bot. Its tabs are <b>Status</b> (a connection card and a Right Now list), <b>Setup</b> (numbered steps: make a bot, paste the token, connect your chat, send a test, and the schedule), <b>Backups</b>, <b>Messages</b> and <b>Instant Replies</b>. The schedule is a cron job you set up in your hosting panel; the Setup tab shows the exact command and address with copy buttons, and Status says whether the schedule is running.'),
 shot('s-telegram', 'Settings, Telegram.'),
 P('Backup &amp; Restore', 'h2'),
 P('One backup file holds every page with its settings, the site settings, Telegram (the bot token only in encrypted files) and the domain watch list. It does not hold the password, two-step login, trusted browsers or the passphrase. Tabs: <b>Status</b>, <b>Back Up</b> (choose the parts, see the size, Download Backup), <b>Restore</b> (replace everything, or add or update some tabs only; what is there now is kept as an earlier version first), <b>Export Data</b> (Links, Cards or Tasks as CSV or JSON; encrypted Links tabs stay locked and are left out of the CSV), <b>Earlier Versions</b> (each page\'s saved versions, with Restore) and <b>Start Over</b>.'),
 P('<b>Start Over</b> erases data, media, settings, Telegram, the watch list and the passphrase. It keeps your password and two-step login. You type ERASE and your password first. Keep backup files off the server.'),
 shot('s-backup', 'Settings, Backup and Restore.'),
 P('Updates', 'h2'),
 P('<b>Update From GitHub</b>: Check Now looks for a newer version. If one exists, Download and Check downloads it, compares its size and SHA-256 with the list GitHub publishes, and runs the same checks as an uploaded zip. Nothing changes until you review the changes and type your website password. <b>Check GitHub Once a Day</b> is off by default; while it is off the site never contacts GitHub unless you press Check Now. When it is on, the check runs with the Telegram schedule.'),
 P('<b>Update the Site</b> (by zip): upload the zip, it is checked completely (safe names, every file whole, PHP files readable, a newer version, room on the disk), you see what will change and what the new version says about itself, and after your password the site saves the current version, replaces its files one by one, removes old files, and looks at itself. If it cannot answer, the saved version comes back by itself. <b>Go Back</b> does the same on request. Never touched: site-data, web/core-data/media, web/core-data/config.php and the Tools settings.'),
 shot('s-updates', 'Settings, Updates. Until you press Check Now, nothing is known about newer versions.'),
 shot('s-updates-available', 'When a newer version exists (this screenshot uses an example release): one click downloads and checks it, then your password applies it.'),
 P('The <b>Files</b> tab compares the server with this version\'s file list and shows files that do not belong (leftovers, copies, unknown scripts), files changed by hand and missing files. You can delete the ones that do not belong after typing your password.'),
 shot('s-files', 'Settings, Updates, Files.'),
 P('Health', 'h2'),
 P('<b>Overview</b> (disk use, speed, errors, backups and Test a Restore), <b>Domains and Uptime</b> (a watch on your domains, SSL and uptime) and <b>Server Check</b> (what your hosting allows: reaching other websites including GitHub, folder writes, PHP limits and extensions).'),
 shot('s-health', 'Settings, Health.'),
 shot('s-check', 'Settings, Health, Server Check.'),
 P('Changelog', 'h2'),
 P('The full history of every version, with a Version Map and Notes.'),
 shot('s-changelog', 'Settings, Changelog.'),
 shot('m-overview', 'Settings on a phone.', 60))

story += chapter('Appendix: backups and recovery',
 P('Forgot the password', 'h2'),
 B(['In your hosting file manager delete <font face="Courier">site-data/core/auth.php</font>.', 'Open the site and click the key icon. It asks for a setup code.', 'The code is in <font face="Courier">site-data/core/SETUP-CODE.php</font>. Enter it with a new password. The file deletes itself afterwards.']),
 P('Two-step login is turned off by this; turn it on again in Settings > Security. Encrypted tabs and backup files are locked with your passphrase, not the login password, so a reset does not touch them.'),
 P('Lost the phone with the authenticator app', 'h2'),
 P('Log in with a recovery code instead of the 6-digit code. With no codes left, follow Forgot the password.'),
 P('Link icons do not load', 'h2'),
 P('Settings > Health > Server Check tests whether your hosting can reach other websites and write to the icon folders. If outgoing requests are blocked, Links saves the icon service\'s address instead, so icons still show.'),
 P('Moving the site', 'h2'),
 P('Copy the whole site folder (data included), or export a backup and import it on the new site. Backups made before a passphrase change need the old passphrase.'),
 P('Updating by hand', 'h2'),
 P('If you ever need to, upload and extract the new zip over the site folder. Everything in site-data is left alone.'),
 P('Contact', 'h2'),
 P('Feature requests and questions: Telegram @Jackpison (t.me/Jackpison). Bugs: github.com/Jackpison/Homebase-Hub/issues.'))

def footer(c, d):
    c.saveState(); c.setFont('Helvetica', 8); c.setFillColor(MU)
    c.drawString(20 * mm, 10 * mm, 'Homebase Hub %s - Guide' % VER); c.drawRightString(190 * mm, 10 * mm, str(d.page)); c.restoreState()
doc = BaseDocTemplate(OUT, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm, bottomMargin=18 * mm, title='Homebase Hub Guide', author='Jackpison')
doc.addPageTemplates([PageTemplate(id='p', frames=[Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='f')], onPage=footer)])
doc.build(story); print('guide', os.path.getsize(OUT) // 1024, 'KB')
