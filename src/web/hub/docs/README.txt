YOUR SITE: Home, Links, Info, Cards and Tools with one login and one Settings page
===================================================================================

FOLDERS
-------
<site folder>/       the folder of one domain (public_html, an add-on domain folder, a subdomain folder...)
  index.php          the start page (the only file kept in the root)
  web/               everything the site is made of
    hub/             the site's own engine, your pictures and these notes
      core/          the engine shared by every page
        api.php cron.php telegram.php   the only PHP files a browser calls: site API, schedule, Telegram replies
        lib/         PHP that other files load: boot, backup, notify, approval, watch, health, update, overview (blocked from the web)
        assets/      what every page loads: shell.js, shell.css, shell-admin.js, vendor/ (PDF, Excel and QR libraries)
        manifest.json  every file of this release with its fingerprint (made when the release is built; Updates uses it)
      media/         YOUR OWN FILES: brand (the site logo), home/photos, home/uploads, home/icons (start page) and links/icons
                     (saved link icons). Visitors load them from here. Never replaced by an update.
      docs/          README.txt (this file), CHANGELOG.md (every change since 1.0.0, newest first), THIRD-PARTY.md (the
                     libraries' licences) and src/ (the readable source of every minified script and style); all blocked from the web
                     (up to 1.49 these three were web/core-data, web/core-data/media and web/docs)
    home/            start page      (its pictures are in hub/media/home)
    links/ info/ cards/ tasks/        each has index.html (the page), api.php, and assets/ (its CSS and JavaScript)
    settings/        the Settings page (a small shell: hub/core/assets/shell-admin.js draws everything in it)
    tools/           browser tools
  site-data/         PRIVATE DATA, created automatically inside the same site folder:
    core/            password hash, settings, SETUP-CODE.php (only before setup)
    updates/         an update being checked, and the saved version you can go back to (its PHP files are kept as .stored so
                     nothing in site-data can ever run as a script; its state files are guarded .php like all data)
    links/ info/ cards/ home/    each page's data and its earlier versions

site-data sits inside the site folder, so it always moves with the site: copy or zip the whole folder and
nothing is left behind. It is locked three ways:
  1. a .htaccess that denies every request    2. an empty index.html
  3. every data file is a .php file that answers "404" in a browser, even on a server that ignores .htaccess.
To keep the data somewhere else on purpose, create web/hub/core/config.php containing
  <?php define('HUB_DATA_DIR', '/path/to/some-folder');
and remember to copy that folder when you move the site.


WHAT IT NEEDS
-------------
Web hosting with PHP 8.3 or newer (with the curl and zip extensions for updates from GitHub) and a file manager or FTP.
The PHP version is chosen in your hosting panel (in cPanel: MultiPHP Manager). Settings > Overview tells you when the PHP your site
runs on stops getting security fixes, and Settings > Health > Server Check shows its version. An update that needs a newer PHP than
your server has is refused with a clear message, and nothing changes.

KEEPING IT SAFE
---------------
- The site itself needs no regular work. Its pages, data and login do not expire.
- PHP is the one thing to watch: each version gets security fixes for about four years. Keep your hosting on a supported PHP.
- Install new versions of Homebase Hub when they come out (Settings > Updates). Each release says what changed.
- Back up now and then (Settings > Backup and Restore), and keep the file somewhere other than your server.

SET UP ON ANY DOMAIN
--------------------
1. In your hosting file manager open the domain's folder, upload site-update.zip and extract it.
2. Open the domain in a browser and click the key icon (top right). The "Welcome!" box opens.
3. In the file manager open  <site folder>/site-data/core/SETUP-CODE.php  (the box shows the exact path) and view it:
   the code is on the line starting "SETUP CODE:". It is a .php file only so that a browser gets a 404 for it.
   If the folder is not there yet, reload the file manager.
4. Copy the code into the box, enter a site name and a password, then press "Create my site".
   You are logged in, and the code file deletes itself.
Nothing else needs configuring. Each domain keeps its own site-data folder, so domains never share data.


UPDATING LATER
--------------
Settings > Updates: upload the new zip there. The site checks it completely first (it must be a real site update, every
file whole, a newer version), shows what will change, and only after you type your password saves the version it has now,
replaces its own files one by one, removes the files the old version had and the new one does not, and looks at itself
afterwards. If it cannot answer, the saved version comes back by itself, and "Go Back" does the same on request.
Never touched: site-data (all your data), web/hub/media (pictures and logo), web/hub/core/config.php, and the Tools settings (made from yours).
From 1.38.0 Settings > Updates can also fetch the update from GitHub: "Check Now" looks for a newer release, "Download and Check" downloads it, compares its size and SHA-256 with the list the project publishes, and runs the same checks as an uploaded zip. Nothing changes until you type your password. The daily check is off by default; while it is off the site never contacts GitHub unless you press Check Now.
The very first time (when the site does not have this tab yet), upload and extract the zip with the File Manager, as below;
after that the site can update itself. Settings > Updates > Files compares the server with the version's file list
(web/hub/core/manifest.json) and shows files that do not belong, which you can delete from there.
By hand, if you ever need to: upload and extract the new zip over the site folder. Everything in site-data is left alone.
Every update zip contains web/hub/docs/CHANGELOG.md with the full history, so you can see what each version changed.
Keep these folders if you replace files by hand: web/hub/media (home/photos, home/uploads, home/icons, links/icons) and web/hub/media/brand.


THE BAR
-------
Three styles (Settings > Appearance > Look), each with its own layout. The pages are Home, Links, Info, Cards, Tasks
and Tools (rename, reorder or hide them in Settings > General > Tabs).
  Top Bar (the default): logo, pages, search, then Theme / Edit (pencil) / Backup / Settings (gear). It slides away while you
    scroll down and comes back on any scroll up, at the top of the page, when you press / or move the mouse to the top
    edge. Phones: a menu button opens the pages; search, pencil, Backup and the gear stay in the bar.
  Sidebar: an 80 px rail: logo, search, the pages with small labels, then Theme / Edit / Backup / gear. It never hides.
    Phones: a floating button at the bottom left (or a swipe from the left edge) opens it as a panel.
  Bottom Dock: one floating pill: the pages (the current one shows its name), search, Edit, Backup and the gear. It gets a
    little smaller while you scroll. Phones: one row; the round button beside the pill opens search, Edit, Light/Dark,
    Backup, Settings and Log Out.
  Backup is green, red with a dot while a backup is due. The gear opens the Settings page (Log Out is in its menu).
  Logged out, a key takes the place of both. The current page's pill glides to its new place when you change
  page (Chrome, Edge, Safari).
- The pencil holds each page's edit options: "Edit this page" (becomes "Done editing"), then the page's own options such as
  Fetch icons, Column colors, Text sizes, Export, Add card, Background, and Page settings at the bottom.
  Links > Import Bookmarks reads the .html file any browser exports (Chrome, Edge, Firefox, Brave, Opera, Safari) in your
  browser, shows a preview, and adds the links to a new tab (private if you like) or one of your tabs. Folders become
  categories, links you already have are not added twice, and only web links are kept. Undo: Settings > Backup & Restore >
  Earlier Versions (a copy of Links is kept just before the import).
  Tools has its own sections: Tools, Recent, Favourites, one per category, Organise and Settings. Tools > Settings > Layout
  shows them as a side menu on the left (the default; it can shrink to icons) or as tabs on top. Phones always get tabs.
  Tools > Organise: star favourites, drag tools to reorder them or move them to another section, reorder sections, hide tools.
  Heavy engines live in web/tools/assets/vendor/ (OCR, background removal, PDF encryption) and load only when a tool needs them.
- Search covers Links, Info, Tasks (while logged in) and Tools; Cards keeps its own search. Press / or Ctrl+K anywhere. The sliders button in
  the search box chooses where to look: Everything or only Links / Info / Tasks / Tools, and one tab. Names, web addresses
  and note text are always searched. Shortcut: type  links: text  or  info: text.
- Settings is a page of its own (web/settings/, the gear in the bar). A menu on the left: Overview, then three groups: Web Setting (General:
  Basics, Tabs; Appearance: Look, Presets, Colors), Data Setting (Security, Telegram, Backup & Restore) and System Setting
  (Health, Updates, Changelog). A search box at the top of the menu jumps to any setting (press /). Overview › Guided Setup walks through the protection steps in order. Overview comes first: how things stand and what to look at next. Security, Telegram and Backup &
  Restore are tabs, one part on screen at a time; every tab has a link (settings/#security/encryption). On a phone the menu is shown
  first and each section opens with a back button.
  General and Appearance preview live and are kept with Save Settings (a bar at the bottom appears while something is unsaved;
  Discard puts the saved look back). The other sections save each change straight away.
- Settings > Appearance > Colors: one mode at a time (Dark or Light), in groups: Menu Bar (bar background, tabs and icons), Page
  (background, boxes, menus, borders) and Text. Presets (166 looks, a search box, a Surprise Me button, and your own saved looks that can be exported and imported) fill a whole mode in one click; Colors also holds a separate accent for each page; the arrow next to a color puts it
  back to the default. Page Backgrounds gives one page its own background. Tab colors in Links and Info are set on each tab.
- Text sizes: Links, Info and Cards each have "Change Text Sizes" inside their own Page Settings (pencil > the page's Settings).
- Install on Your Phone (Settings > General > Basics): add the site to the home screen of a phone or computer and it opens
  like an app (its own icon, no browser bars). The steps are under "How?". iPhone: Safari, Share, Add to Home Screen. Android: Chrome menu, Install App.
  Computer: the install icon in Chrome's or Edge's address bar. The site describes itself to the phone through
  web/hub/core/api.php?action=manifest (public: the site name, icons, colours and the pages' names). There is no offline
  mode: pages and data always come from your server.
- Start page without the bar (Settings > Appearance > Look): a gear button in its corner opens editing, the other
  sections and Settings once you are logged in.


BACKUP
------
Round menu > Backup opens the only Backup, Import and Earlier versions screen:
- At the top: when the last full backup was, the reminder interval, and whether Telegram sends backups for you.
- Export (open): one file for everything, or untick parts, or "Choose Tabs" for single Links / Info tabs.
- Import (click to open): drop or choose a .json or .json.gz file. Choose "Replace everything" or "Add or update these
  tabs only". What is there now is kept as an earlier version first.
- Earlier Versions (click to open): every page's saved versions, 20 at a time, with Restore.
Moving the site: copy the whole site folder (data included), or export a backup and import it on the new site.
Keep backup files off the server.


FORGOT THE PASSWORD
-------------------
1. In your hosting file manager delete  site-data/core/auth.php
2. Open the site and click the key icon. It asks for a setup code.
3. The code is in  site-data/core/SETUP-CODE.php  (only someone with access to your hosting files can read it).
   Enter it with a new password. The file deletes itself afterwards.
Two-step login is turned off by this; turn it on again in Settings > Security.
Encrypted tabs and backup files are locked with your encryption PASSPHRASE, not the login password, so a reset does not
touch them. Only data still locked the older way (with the website password) needs the old password: unlock it once, then set a
passphrase in Settings > Security > Encryption to move it.

TWO PASSWORDS: LOGIN AND PASSPHRASE
-----------------------------------
Your website password logs you in. The encryption passphrase is a second password for secure data. One passphrase locks
Info's encrypted tabs, Links' encrypted tabs and backup files (including the ones sent to Telegram).
Settings > Security > Encryption: Set Passphrase, Change Passphrase, Recovery Key and Remove Passphrase. Setting it also moves
anything still locked the older way (the website password, or a separate Info passphrase) onto it. Changing it only re-locks the
keys (your tabs are not touched). The optional recovery key opens your encrypted tabs if the passphrase is forgotten. Removing
it turns every encrypted tab back into a normal private tab and stops encrypting backups. Info and Links only unlock with it;
they never make or change it. Lost passphrase and lost recovery key = lost data.
When you log in, tick "Trust this browser for 30 days" to skip the two-step code (and the Telegram tap) on that
browser. Settings > Security > Trusted Browsers lists them, and you can remove any one there.

LOST THE PHONE WITH THE AUTHENTICATOR APP
-----------------------------------------
Log in with a recovery code instead of the 6-digit code. No codes left? Follow "Forgot the password".


LINK ICONS DON'T LOAD?
----------------------
Settings > Server check tests whether your hosting can reach other websites and write to the icon folders.
If outgoing requests are blocked, Links saves the favicon web service's address instead, so icons still show.


SECURITY, IN SHORT
------------------
- One bcrypt-hashed password; optional two-step login (authenticator app and recovery codes), with an optional
  30-day "trusted browser" that skips the code (never the password).
- One encryption passphrase locks Info's encrypted tabs and Links' encrypted tabs (keys wrapped in the browser, PBKDF2
  600,000 rounds) and backup files (PBKDF2 310,000 rounds, AES-256-GCM). Pick a long one: it guards all three.
- 5 wrong tries pause logins for 15 minutes, doubling up to a day. Cloudflare-aware.
- Sessions last 30 days: HttpOnly, SameSite=Strict, Secure on HTTPS, tied to the browser.
  Changing the password or "Log out other devices" ends every other login.
- Requests from other websites are refused; every change after login needs a security token.
- Data lives in site-data inside the site folder, locked three ways; files are written completely or not at all.
- Outgoing fetches (icons, titles, photos) re-check every redirect so they cannot reach your own network.
- Cards sends no card data until you are logged in. Private tabs and private pages stay hidden from visitors.
- Recommended: SSL with "Always use HTTPS", and two-step login on your hosting account, Cloudflare, domain registrar
  and email.


HOW THE CODE FITS TOGETHER (for later changes)
----------------------------------------------
web/hub/core/lib/boot.php        data folder, the one login, sessions, settings, time zone, login alerts (every api.php requires it)
web/hub/core/api.php             the site API: login, settings, logo, backup, Telegram, Health and its server check
web/hub/core/lib/backup.php      what goes into and comes out of a backup file (and opens an encrypted one to test it)
web/hub/core/lib/notify.php      Telegram: digest, Due Now, backup reminder, login alerts, backup files, and the two-way bot
web/hub/core/telegram.php        Telegram's instant replies (webhook), checked with a secret
web/hub/core/cron.php            the schedule: bot messages, domain watch, reminders (the cron job in Settings > Telegram)
web/hub/core/lib/activity.php    login history and the list of logged-in devices (Settings > Security > Devices)
web/hub/core/lib/approval.php    approve logins in Telegram (fallbacks: a two-step recovery code; delete site-data/core/login-approval.php)
web/hub/core/lib/watch.php       domain, SSL and uptime watch; keeps renewal tasks in Tasks
web/hub/core/lib/health.php      Health (Settings > Health): disk use, speed, backups and Test a Restore, PHP errors, updates
web/hub/core/lib/ghupdate.php    Updates from GitHub: check (latest.json, API fallback), download, checksum, then update.php's check
web/hub/core/lib/update.php      Updates: reads the zip (plain PHP), checks it, saves the current version, swaps files, rolls back, compares files
web/hub/core/lib/overview.php    Settings > Overview: where things stand, from what is already saved
web/hub/core/assets/shell.js     on every page: the bar, search, theme, login, page contract (numbered sections inside)
web/hub/core/assets/shell-admin.js  the Settings page: menu, Overview, tabs, General, Appearance, Security, Telegram, Backup, Updates, Health; loaded only on that page
web/hub/core/assets/shell.css    the bar, dialogs and the Settings page, plus the PAGE CONTRACT rules
web/<page>/assets/       each page's own <page>.css and <page>.js, loaded as ?v=<version> and cached for a year
web/tasks/lib.php        Tasks data rules (shared with backup.php); web/tasks/api.php is its API
web/links/lib.php        Links' visit counts (site-data/links/visits.php); web/links/api.php is its API
Every page loads shell.css and shell.js first and keeps its own api.php.
shell.css, shell.js, shell-admin.js and each page's assets are loaded as  ?v=<version>  and cached for a year: after changing one of them,
raise the version (HUB in web/hub/core/lib/boot.php and the ?v= in each page) so browsers fetch the new file. 

PAGE CONTRACT: a page tells the bar what to take over by marking its own controls; no bar code changes needed.
  data-hub="toggle"   the page's Edit button (the pencil starts and finishes editing through it)
  data-hub="item"     one button on the edit bar (the pill at the bottom while editing): data-hub-label="Colors", optional
                      data-hub-order="9" (higher = later), data-hub-icon="palette" (an icon name from shell.js) and
                      data-hub-group="Export" (items sharing a group fold into one "Export" button with a short list).
                      data-hub-main marks the page's Settings: it is also in the pencil menu (Edit This Page and Settings)
  data-hub="done"     the page's Done button (the edit bar's Done presses it; a page without one, like Cards, just stops editing)
  data-hub-ebar       the page's own old edit bar: hidden (its buttons stay, for the edit bar to press); data-hub-hint="..."
                      on it is said once per visit when editing starts
  data-ix-editbar     a select (icons | text) in the page's Settings for Icons Only or Icons and Text; data-ix-save marks
                      that dialog's Save button, which also saves this choice (site setting editBar)
  data-hub="logout"   the page's own Log out button (runs the site log out)
  data-hub="hide"     anything the bar already does (theme, search, timers...), hidden while the bar is on
A page that recolors itself listens for the hub:theme event (detail = "light" or "dark").


RULES FOR CHANGING THE CODE
---------------------------------------------------------------------------------
1. No inline scripts and no inline handlers (onclick="...") in any page: the pages' Content-Security-Policy forbids them. Code goes in
   web/<page>/assets/*.js. Scripts that must run before the page paints (theme, early data request) are the small <page>-boot.js and
   links-early.js files. The start page (PHP) allows only its two data scripts, which carry a fresh nonce.
   If a page ever shows up blank or dead after an update, open the browser console: a "Content Security Policy" message names the culprit.
   As a quick way back, put 'unsafe-inline' after script-src in that page's <meta http-equiv="Content-Security-Policy"> and in its .htaccess.
2. Every API action that changes something must check the login AND the security token (need_post() + need_admin() in core, require_admin() in
   Home, authed() in Info).
3. Security headers come from ONE place per file type: PHP files send their own (hub_headers() in boot.php, or the page's own header() calls);
   .htaccess sets them only for files that are not PHP. Never both: two copies, or two values, can make a browser ignore the header.
4. Your pictures, icons and the logo live in web/hub/media/... : in PHP use HUB_MEDIA . '/...' (never a path next to the page), in the browser map
   the stored "icons/..." / "photos/..." values with mediaUrl() (Links) or media() (start page).
5. Include files (lib.php, web/hub/core/lib/*.php, config.php) start with the guard line that answers 404 if one is opened directly.
6. Do not leave an API action that nothing calls: it is attack surface.
7. Every change to what a release contains needs its file list rewritten (web/hub/core/manifest.json): the release is built, not hand-zipped.
8. Settings screens: a new long section should be a set of folded parts (details.ix-acc); the page turns them into tabs by itself.

