# Changelog

Every change to the site from 1.0.0 to now, newest first. One site made from five: **Home, Links, Info, Cards and Tools**, with one login, one Settings panel, one backup and one look.

Versions match `HUB` in `web/core-data/lib/boot.php` and the `?v=` value each page loads. Your data in `site-data` carries over through every update. Each update is one zip, named with dots in the version (for example `site-update-1.28.1.zip`), and it contains this file as `web/core-data/docs/CHANGELOG.md`.

## How to Update

1. Extract `site-update-X.zip` over your site folder.
2. Press **Ctrl+F5** on any page.
3. **Never delete `site-data`.** It holds all your data, and updates don't touch it.
4. Open **gear › Health**. Leftover files from older versions are deleted automatically; only what could not be deleted is listed.

Nothing to migrate by hand unless an entry says so.

## Version Map

| Version | What it brought |
| --- | --- |
| 1.78.1 | Settings: Data Protection and Telegram Setup in the Sign-In style, Two-Step scan side by side, Look tab renamed; smoother pages, folds and hovers everywhere |
| 1.78.0 | Settings: Sign-In boxes redesigned, Look and Bar in one tab, a clearer Telegram Setup, click-to-copy commands, an Activity log of what was done; Start Here and Domains and Uptime are gone |
| 1.77.5 | Info: an unlocked encrypted tab in the Document layout no longer shows its lock bar on top of the Outline |
| 1.77.4 | Backup & Restore › Back Up is one hero box with Download Backup, and the reminder is a row |
| 1.77.3 | Telegram Setup in one box with two steps, and every Features row opens its page and its related settings |
| 1.77.2 | A Logs section, always-visible Notifications with colourful icons, Overview folded into General, a timeline for Telegram Setup, a Files details panel with Select All, and a simpler Share Link window |
| 1.77.1 | A Dropbox-style Files page, a Features showcase, a simpler Telegram setup, a Changelog tab, and the E key turns editing off again |
| 1.77.0 | Cloud Backup: an encrypted copy of the site sent to a WebDAV folder, on a schedule |
| 1.76.0 | What's New by series with filters, a Features section, and a Files storage limit you can set to any size |
| 1.75.0 | One message stack in the bottom right with a bell for missed ones, sliding-pill tabs, a wider Settings with one header and a box-style Overview, a timeline for What's New, six Spotlight presets, and a Files drop zone |
| 1.74.2 | Settings: pill sub-tabs, Security in four tabs, a new Overview and Colors, per-page colors always shown; smoother sliders; a flatter phone top bar; quicker CI |
| 1.74.1 | Animated designs no longer block menus and page changes, Background has four tabs and a Mix Everything theme, Home's Welcome Text and the search shine are gone, and the top bar and sidebar highlight the current page like the dock |
| 1.74.0 | Animated Designs for Home: sixteen live backgrounds from React Bits with options and Preview; one glass behind the clock on an iPhone app |
| 1.73.2 | A page no longer reloads itself by mistake when the connection flickers; the Docker image moves to PHP 8.5.11 |
| 1.73.1 | One-command install on a VPS and Proxmox; ready files for Unraid, CasaOS, Umbrel and YunoHost; Synology and TrueNAS steps |
| 1.73.0 | Docker and VPS: a ready image (with Caddy for HTTPS), nginx and Apache setups, and a safe way to run behind your own proxy |
| 1.72.3 | Tools › Markdown Editor: the text box stays inside its card; Settings and tests take the last two security scan notes |
| 1.72.2 | Safer handling of a few values the security scan pointed out: Settings addresses, colour codes, card IDs and imported bookmarks |
| 1.72.1 | Maintenance: 2 Tools libraries updated |
| 1.72.0 | Faster and offline pages, search everywhere, more Tasks repeats and followed calendars, four new Home widgets, an Import Center, phone and accessibility fixes |
| 1.71.0 | Smoother on phones: the page follows your finger when you swipe, quicker page changes, the bar hides without restyling the page, Home's next background waits |
| 1.70.0 | Settings sorted: Bar tab in Appearance, Accent Color in Colors, Text Sizes in Look, Start Here in Overview, Telegram backups in Backup, Files in Server Check, What's New in Updates |
| 1.69.1 | The link field (Uiverse): a label in front and a copy icon for Links' Address, Files' Share Link, Health › Domains, the Telegram cron lines and the recovery and two-step keys |
| 1.69.0 | Step-by-step boxes (React Bits' Stepper) for New Site Setup, Links Import, the first Encryption Passphrase, Restore, Start Over, Files Share Link and Add a Passkey, and a new Home Tour |
| 1.68.5 | Glass windows, menus and search results let the page show through: a much lighter layer behind a glass window and a brighter rim |
| 1.68.4 | One glass for the whole site: the bar, the dock and the Home widgets share Settings › Appearance › Glass, with Solid, Tone, Rim Light, Shadow, Liquid only over photos, glass in more places and a live preview |
| 1.68.3 | The Save Settings bar shows only when something changed; Bar Glass is a clean Soft glass by default, the bending is the Liquid pick; CI test fixes |
| 1.68.2 | A Glass tab in Appearance (quick picks and sliders for Bar Glass), a switch to keep the bar in place while scrolling, no line over the current page in the dock |
| 1.68.1 | Bar Glass looks like the mock-up (strong bend, clear on every page), shows even when Windows asks for less transparency, and stays on while the dock shrinks during scrolling |
| 1.68.0 | Bar Glass: an option in Settings › Appearance that turns the top bar and the dock into glass (React Bits GlassSurface); the dock's own blur now reaches the page under it |
| 1.67.2 | A clearer Tabs section in Settings (colour tiles, a preview of the bar, no Home), Save Settings turns on after a drag, a softer line under the current page |
| 1.67.1 | Faster Links edit mode, the dock shows every page and steps aside while you edit, no Home button where the logo already leads home, faster page changes, a stricter security scan |
| 1.67.0 | A new top bar: a colour tile with an icon for each page, a glowing line under the current page, a search with a border in the page's colour, and the buttons on the right in one tray of small colour tiles |
| 1.66.1 | Colour tiles with white icons in every Settings page and page Settings window; the Settings menu starts level with the page title again |
| 1.66.0 | Files shows a card for each file type and per-file upload cards (stop, try again); one step bar for every step-by-step screen in Settings; a new Settings menu with colour tiles |
| 1.65.3 | Settings › Appearance › Look: a new Accent Color picker, ten squares that swell around the mouse |
| 1.65.2 | The edit bar's Done tick shows again; Health's Disk Used no longer shows the server's free space |
| 1.65.1 | The theme button is the sun and moon again; a login card when logged out; search results no longer cut off; Keyboard Shortcuts in search and Settings › General; a new edit bar, Erase Everything button and hover glow |
| 1.65.0 | New look for every page: white switches, a day/night theme switch, hold to delete, swipe in Tasks, tooltips, a bouncing loader, button hover, count-up numbers, and a new Presets screen with Surprise Me |
| 1.64.12 | Links: an icon whose saved file is gone shows the first letter and is fetched again (when you start editing, or with Fetch Icons > Only Missing) |
| 1.64.11 | Links and Cards draw big pages faster: the first screen shows at once, Links builds its edit buttons only while editing, Cards formats and sorts faster |
| 1.64.10 | Links: going back to a tab is about three times quicker on big pages, and moving or editing a link redraws only its own category |
| 1.64.9 | Save Settings in Links and Cards is quick on big pages: it no longer redraws every link or card when only the look or the title changed |
| 1.64.8 | When the host's firewall answers with a CAPTCHA or a block page, the site says so and stops sending for a minute so the host does not count more |
| 1.64.7 | Far fewer requests: moving the mouse over the bar no longer loads whole pages in the background |
| 1.64.6 | If your web host's firewall blocks a save (a plain "403 Forbidden" page), the site now says so, keeps you logged in and keeps your change |
| 1.64.5 | Home Settings closes at once; a steadier test |
| 1.64.4 | Faster Info: typing in a big box no longer lags, Settings closes at once, big pages draw only what you see; a new Export window |
| 1.64.3 | One look for every Settings window: Page Title under General, a clearer Encrypt row, controls that drop under their name, visible off switches, a simpler Add Link, and Save Settings dim until you change something |
| 1.64.2 | The top bar fits on tablets and small laptops: tabs show icons only (the current one keeps its name); a sweep of every page and Settings tab found nothing else |
| 1.64.1 | Edit Tab: the icons fold away until you open them; every window is now checked by one test; Tasks and Files windows fixed to match |
| 1.64.0 | Calmer cards and tiles that follow your Boxes and Cards colour, two soft presets (Soft Dark, Soft Warm), one look for every window, Show Visit Counts in Look |
| 1.63.1 | Fix: dragging a tab now always lands where you drop it, also with a fast mouse or a slow browser |
| 1.63.0 | Links and Info tabs: drag to reorder, 16 icons to choose from, and one new Edit Tab window; new-look Banks and Add Task windows; Tools list, grid and Markdown fixes |
| 1.62.8 | Behind the scenes only: the Cards, Tasks and Info scripts are now type-checked too. Nothing looks different |
| 1.62.7 | Behind the scenes only: Links and Info share their "keep unlocked on this device" code and a colour check, and two more page scripts are type-checked. Nothing looks different |
| 1.62.6 | Behind the scenes only: one safe way to save shared files, the core split into smaller parts, and shared page helpers. Nothing looks different |
| 1.62.5 | A cleanup: unused styles and code removed, the notes in your zip brought up to date, and every picture of the website retaken |
| 1.62.2 | Settings: the on and off switches that had shrunk to a ring and a ball are switches again |
| 1.62.1 | Passkeys: Remove now tells you what it needs, where you can see it |
| 1.62.0 | Undo in Info: a deleted box or tab comes back with its text, also in locked tabs |
| 1.61.9 | Tools tidied (Image Converter tabs, four tools gone, sections you can move, a sharper recorder), one window frame and button shape on every page, Undo in Links and Cards |
| 1.61.6 | Tidier Settings windows, Save Settings always in view, a Passkeys card, picture previews in the Files grid, phone fixes for Files and Settings |
| 1.61.5 | A new Files page like Drive (menu, details panel, Starred, Recent), one new look for every Settings window, a shield key icon, a Saved note, Undo for Trash, Add to Calendar, Send Today's Tasks, switches and buttons in Tools |
| 1.61.1 | Shorter help texts in every Settings window; Import and Export Bookmarks in one window; a clearer first unlock in Files; no server free-space figure |
| 1.61.0 | Your private things are locked in your browser (one passphrase, one recovery key); a new Files page; passkeys; a calendar link for Tasks; Share from your phone; keyboard shortcuts; one Settings look everywhere |
| 1.60.0 | 17 new tools (Calculators, Documents, scanner, recorder and more); saved presets in Tools; the maintained PDF writer; no going back before 1.50 |
| 1.59.1 | iPhone app: the top bar is reachable again; swipes change pages only (1.54-1.58 were skipped) |
| 1.59.0 | Swipe gestures on phones; vivid presets; the project keeps itself current (monthly maintenance); repeated code merged |
| 1.53.8 | A new login window; visit counts at the end of the row, every 30 seconds; one Banks window in Cards; a full app icon |
| 1.53.6 | No more surprise login box; one Holders window in Cards; tidier Settings windows |
| 1.53.5 | One edit bar at the bottom on every page; the pencil keeps Edit This Page and Settings |
| 1.53.2 | Tidier inside: one copy of the encryption and of the code that reaches other websites; nothing new to learn |
| 1.53.1 | A check-up: security, dead code, speed and small fixes; nothing new to learn |
| 1.53.0 | Links shows how often each link is opened; Home's refresh button no longer feels stuck; the characters are gone again |
| 1.52.0 | Characters on Home: 22 little 3D characters that walk about, sit on the clock and do 20 activities and the Power Beam |
| 1.51.3 | An open widget no longer lies on top of the cards in Glance and Expand |
| 1.51.2 | Home's glass stays see-through when the computer reduces transparency, and a Tint choice: Light, Dark or Solid |
| 1.51.1 | Lighter glass on Home, an icon pill for editing, Widgets in its own window with a Show Widgets switch, and the bar switch in Home Settings |
| 1.51.0 | Home gets a clock and widgets in frosted glass; Home's links move to Links; Links stops asking Google for icons unless you turn it on |
| 1.50.0 | A tidier folder layout: the engine, your pictures and the documents now live in `web/hub` |
| 1.49.0 | Gets your site ready for the new folder layout of 1.50, plus small fixes |
| 1.48.9 | Home themes (a Starter theme and your own, with export and import), a welcome text, and no background repeats until the others had their turn |
| 1.48.5 | A new Cards page (a cleaner table, or grouped by holder), Settings regrouped into Web, Data and System Setting, and tidier pencil menus |
| 1.48.2 | The Settings menu as before 1.48, the Backup icon and gear back, a sun and moon theme button, a softer look for new sites, and fixes for the Settings cards and the Tools tab icon |
| 1.48.1 | Fix: the Security and Telegram cards in Settings look right again |
| 1.48.0 | Navigation and fluidity: three redesigned bar styles, a Top Bar that hides while you scroll, a round menu, and a simpler Settings |
| 1.47.1 | Small fixes: the Telegram backup button no longer sticks, Tools has its section colours back, Home uploads up to 128 MB, a GitHub link in Updates |
| 1.47.0 | Tools rebuilt from source: all 36 tools, the same addresses and favourites, newer engines (ONNX Runtime 1.30, Tesseract 7), AVIF saving, and fixes |
| 1.46.0 | Install on Your Phone: the site on a phone's or computer's home screen, opening like an app with its own icon and page shortcuts; Settings descriptions no longer shown twice |
| 1.45.0 | Import Bookmarks in Links: bookmarks from any browser, with a preview, into a new or existing tab, easy to undo; readable main buttons in Links' light mode |
| 1.44.2 | PDF to Text works in Safari; Earlier Versions never overwrites the version being restored; no stale "ready to apply" update after a refused upload; many more tests, now also in Firefox and WebKit |
| 1.44.1 | Cleaner padlock pictures for private and encrypted tabs; Server Check rows laid out properly, and no false warning for the favicon service; a more compact Tools start box |
| 1.44.0 | Telegram: Snooze buttons under Due Now messages and a `/snooze` command; a slightly smaller update zip; more tests behind the scenes |
| 1.43.1 | Tools loads its code once (the React error in the console is gone); pages pre-load when you hover over their link in the bar |
| 1.43.0 | Newer, safer PDF reader in Tools (pdf.js 6.4.299); Excel export without an outside library; easier to read in light and dark mode |
| 1.42.0 | Tools > Favicon: a 512 × 512 size, and downloads save right there instead of opening a new tab; the website uses clean addresses |
| 1.41.0 | New padlock pictures: gold for private tabs, green for encrypted tabs, in Info and Links |
| 1.40.0 | Needs PHP 8.3 or newer; the site tells you when your PHP stops getting security fixes; the bundled libraries were reviewed |
| 1.39.0 | Homebase Hub's own logo is the default logo and tab icon; the docs and readable source moved to web/docs |
| 1.38.0 | Updates from GitHub (Check Now, an optional daily check that is off by default, one-click download with a checksum, then your password); the project is public on GitHub under GPL-3.0; new installs are named Homebase Hub |
| 1.37.0 | Info: any number of boxes in each tab (up to 12), each in its own width and height; Classic layout removed, Notebook Cards is the default |
| 1.36.0 | Home loads faster (phone-sized background photos, Settings styles split out); Info tabs can be Classic, Notebook Cards or Document; Settings: Guided Setup, jump chips and a status pill on every menu item |
| 1.35.0 | Info's four Export buttons work again; Info's broken leftover backup timer removed; dead code and styles removed; every page's scripts and styles minified |
| 1.34.1 | Smaller scripts and styles (about 19 KB less to download per browser); the readable source is kept in `docs/src` |
| 1.34.0 | Login history and a list of logged-in devices; Settings search; Export Data (CSV or JSON); your own presets; page accents; button text that follows the accent; update preview; What's New; Server Check for memory and photos; newer PDF library |
| 1.33.0 | Fix: Home ran out of memory while saving big photos; Changelog in Settings; modern Security and Telegram tabs; 94 more presets; Title Case labels everywhere |
| 1.32.1 | Nothing in site-data can run as code any more; Settings menu: Protection & Data; start page menu: just Settings |
| 1.32.0 | The engine moves into web/core-data; gear opens the Settings page; redesigned Encryption, Telegram Setup and Back Up tabs; Updates renamed |
| 1.31.1 | Fix: the Settings page was white in dark theme |
| 1.31.0 | Settings is a page of its own, with tabs, an Overview and a menu; update the site by uploading a zip; check and delete files that do not belong |
| 1.30.2 | Fix: the start page's Settings sheet was laid out wrongly |
| 1.30.1 | Links' own Site Icon setting removed: one logo everywhere |
| 1.30.0 | Start Over button; backups include Telegram and the domain watch list; clearer Telegram and Security screens; one logo everywhere (in `web/core-data/media/brand`) |
| 1.29.4 | Security hardening (strict page policy, one set of headers, guarded include files); dead endpoints removed; smaller Cards and Info pages; cross-reference checks |
| 1.29.3 | Your pictures and icons live in `web/core-data/media/`; `web/core` is gone (old cron and Telegram addresses stop working) |
| 1.29.2 | Tools files in plain `assets/` (no version in the folder name); `docs/` moved into `core/` |
| 1.29.1 | Cards is back to the original table; the 1.29.0 tile redesign is removed |
| 1.29.0 | New folder layout (core/ beside web/ and site-data/); Cards tiles; change passphrase and recovery key; Health speed, log and backup checks |
| 1.28.4 | Links draws at once; encrypted tabs unlock in the background |
| 1.28.3 | Links opens faster and no longer shows "Loading bookmarks…" |
| 1.28.2 | Links' encrypted tabs match Info's lock screen and unlock box |
| 1.28.1 | This changelog in every update zip, compiled into one history |
| 1.28.0 | One encryption passphrase; Telegram settings reordered |
| 1.27.0 | Encrypted tabs in Links |
| 1.26.3 | Security hardening, faster Tools downloads, Links save fix |
| 1.26.0 – 1.26.2 | 18 new Tools; Tasks week and Analytics reworked |
| 1.25.0 – 1.25.2 | Tasks calendar and side panel; Tools layout; Health in one place |
| 1.24.0 | Tasks rebuilt; Presets tab; Tools section colors |
| 1.23.0 | Safer Telegram and domain-watch saves; security and speed |
| 1.18.0 – 1.22.0 | One password for everything; Security and Settings reorganized |
| 1.17.0 | Encrypted backups, Telegram approval and bot, domain watch, Year in Review, Health |
| 1.10.0 – 1.16.0 | Tasks, Telegram reminders, time zone, themes and presets, Colors and Backup redesign |
| 1.9.3 | Security fixes |
| 1.7.0 – 1.9.2 | Text sizes, page backgrounds, Tools tabs, typed colors |
| 1.1.0 – 1.6.x | Earlier work (summarized) |
| 1.0.0 – 1.0.1 | First combined release (2026-10-12) |

---

## 1.78.1

### Settings
- **Data Protection** (Encryption, Change Passphrase, Recovery Key, Remove Encryption) uses the same two-sided cards as Sign-In.
- **Telegram Setup** is one box with two numbered rows: Create Your Bot, then Connect and Test. Step 2 shows Done as soon as your chat is connected.
- **Two-Step Login**: on the scan screen, Step 2 sits beside Step 1 instead of under it.
- The **Look & Bar** tab is called **Look** again.

### Smoother everywhere
- Cards and Files rise in like the other pages, every fold (details) eases open and shut, and cards, rows and tiles ease their colour and shadow when you point at them. Nothing runs when your device asks for less motion.

---

## 1.78.0

### Settings
- **Sign-In** boxes (Website Password, Passkeys, Two-Step Login, Login Approval) have two sides: what it is on the left, what you do on the right. No more big empty boxes.
- The Data Protection boxes (Change Passphrase, Recovery Key, Remove Encryption) put their fields in a row with the message and button under them.
- **Look and Bar** are one tab in Appearance: theme, font, text sizes, navigation style and tabs.
- **Telegram Setup** is two clear cards: Create Your Bot, then Connect and Test.
- Click a Telegram command (Instant Replies) to copy it.
- Start Here (and its Guided Setup) is removed from General: the help is in Features.
- Domains and Uptime is removed from Health; the box in Health now shows your PHP version. Sites already on the list keep being checked.

### Logs
- **Sign-Ins** is now **Activity**: it also lists what was done (settings saved, backups, restores, updates, files deleted, encryption, passkeys, Telegram) and keeps the last 300.
- Deleting a tab or box names it in the message, and the "Hold the button" hint no longer fills the log.

### Fixes
- The New tag in Features is readable in the light theme.

---

## 1.77.5

### Info

- Fixed: in the **Document** layout, an encrypted tab that was unlocked showed its "Encrypted tab, unlocked on this device" bar on top of the Outline and the start of the page. The bar now sits above both, on a computer and on a phone.

---

## 1.77.4

### Settings

- **Backup & Restore › Back Up** opens with one box: when the last full backup was, a short note on what a backup is, and the **Download Backup** button. The old three-box strip is gone.
- **Remind Me to Back Up** is a row with its own menu, followed by Telegram and Cloud Backup.

---

## 1.77.3

### Settings

- **Telegram › Setup** is one box with two steps: create your bot, then connect your chat and send a test. The schedule stays below it.
- **Features**: each row has an **Open** link to its page, and each page's tab has **Related Settings** buttons that open the matching settings (Look and Colors for Home, Back Up and Export for Links, Encryption for Files, and so on).

---

## 1.77.2

### Settings

- New **Logs** section: **Notifications** (everything the site told you, kept even after you close them), **Sign-Ins** and **PHP Errors**.
- **Overview** is gone. **Start Here** is a tab of **General**, and Install on Your Phone and Keyboard Shortcuts are at the bottom of **Features**.
- **Changelog** is one list of versions with the one you have marked **Installed**; the old What's New box is gone.
- **Telegram › Setup** is a timeline of three steps with a status on each (Done, Next, Waiting). **Instant Replies** is one clear card.
- **Features** lists each page as a row, with its highlights one click away.
- **Health**: the six boxes are shorter.
- The search box, switches and buttons have a new look. Buttons fill with your accent colour when you point at them, and switches turn the accent colour when on.

### Notifications

- The bell is always there. Each message has a colourful icon that matches what happened, and the list animates in.
- Switching between light and dark grows from the button as a circle.

### Files

- The details panel on the right is open by default. It shows what is in the folder and has a **Select All** button (there is one above the list too).
- The panel no longer repeats **Share** and **More**; those are in the row menu and the Share Link box.
- **Share Link** is one window: your links on top, then how long the next one lasts. Making a link copies it for you.

### Under the hood

- A quick check (`scripts/precheck.py`) and a faster first CI job, so a mistake shows up in minutes.

---

## 1.77.1

### Files

- A Dropbox-style Files page: a **Suggested** row, a **Who Can See It** column, and quick actions when you point at a file.
- The storage limit has quick choices (5, 10, 25, 50, 100 GB or No Limit) and a number with MB, GB or TB, and shows the free space on your server.

### Settings

- **Features** is a showcase now: a banner, a coloured card for each page and numbered highlights. The old Notes moved to its bottom as **Good to Know**.
- **What's New** is now **Changelog**: one list of every version, with the one you have marked **Installed**. Versions and Version Map are merged.
- **Telegram › Setup** is a plain checklist, and it no longer gets stuck after the test message arrives. **Instant Replies** shows the commands in a grid.
- The six boxes in **Health** have icons and clearer text.
- **Security** no longer flashes an earlier look right after it loads.
- Fields in Start Over and other long forms are narrower and match the rest of Settings.

### Keyboard

- Pressing **E** turns editing on and off on Home and Info, as it already did on Links.

---

## 1.77.0

### Cloud Backup

- A new card in **Backup & Restore**: an encrypted copy of the whole site, sent to a WebDAV folder (Nextcloud, ownCloud, Synology, a Hetzner Storage Box or another server). Fill in the address, user name, password and folder, press **Test Connection**, then switch on the schedule (daily, every 3 days or weekly) or press **Back Up Now**.
- Only an encrypted backup is ever sent. Without an encryption passphrase, nothing leaves the server.
- It keeps the last 7 to 90 copies. Older copies are removed only after a new one has arrived, and only the ones this feature made (the file name has the date only, like `mysite-backup-2026-11-14.enc.json`); other files in the folder are never touched.
- Files go into the copy while all of them together are 24 MB or less; the card says so when they are not included.
- The address is checked like every other request the site makes. An address on the internet must use https; your own network (a NAS) can use http. Redirects are not followed.
- The password stays on your server (in `site-data`), is not part of any backup, and is never sent back to the browser. Start Over removes it.
- To restore: download the file from your cloud and open it with Import, like any encrypted backup.

---

## 1.76.0

### What's New

- The versions are grouped by series (1.75, 1.74 and so on). The series you are on is open; the rest are closed. Each version is one line with its tags and a short summary.
- The version you have sits on top, with a **Read the Notes** button.
- Filter chips (All, New, Fixes, Settings, Files, Security) show only the versions that have that kind of change. Search, Expand All and Collapse All stay.
- This replaces the timeline of 1.75.0.

### Features

- A new section in System: **Features**. It shows what the site offers: a card for each page (Home, Links, Info, Cards, Tasks, Files and Tools) and a tab for each one with what the page does, in the same words as the website. It has no settings; each page keeps its own.

### Files

- The **Storage Limit** is a size you pick (5, 10, 25, 50 or 100 GB, or No Limit) or type yourself, in MB, GB or TB. It shows what is used and what the server has left, and says so when the limit is more than the server can hold. It is in Files Settings.

### Settings

- The Settings page is wider (up to 1480 px, with the content up to 1160 px), so less room is left empty on each side.

---

## 1.75.0

### Messages

- Every message of the site now appears as a card in the bottom right corner, with a tile, the message, where it came from and when.
- A message that goes away on its own is kept behind a small bell (this tab's last 30), so nothing is missed. Hover a card to keep it; the cross closes it.

### Settings

- The content uses the room it has instead of stopping at 780 px.
- Every section has the same header: its tile, name and status. Security adds a **Fix Next: HTTPS** button when that is the next step.
- **Overview** is a set of boxes: pick Security, Backup, Telegram or Updates and read more below; Health, Protection Steps and what needs a look sit beside it.
- **What's New** (Versions) is a timeline: a tick for versions you have passed, a filled dot for yours, a hollow one for newer ones.
- The small boxes (Security tiles, Overview cards) have a softer look, a lift and an accent edge on hover.
- Tabs and segmented buttons have a solid pill that slides to the open tab.

### Looks

- **Spotlight:** six presets (Ember, Lime, Sky, Violet, Pink, Gold), each in dark and light, with one loud accent that stands out on the page and the boxes. The text is easy to read in all of them.
- The edit bar at the bottom follows the bar colors and Bar Glass, like the rest of the site.
- About a dozen icons (key, lock, shield, bell, home, file and others) are sharper.

### Files

- An empty folder is a drop zone with an upload tile.
- The storage bar is a card.

---

## 1.74.2

### Settings

- Sub-tabs are pills with a dot on the open one. On a phone they scroll sideways and the open tab stays in view.
- **Security** has four tabs instead of eight.
- **Overview** has shorter cards and shows a detail line only when something needs attention.
- **Colors** is two columns with round swatches and small hex fields.
- **Different Colors per Page** is always shown: pick a page, then set its Background and Accent. A dot marks pages with their own colors.

### Changed

- Sliders are smoother everywhere and fill as you drag.
- On a phone the top bar is flat, with no glass strip behind the icons.

### Behind the scenes

- The server and Apache checks run only when files they depend on change, and the whole set runs once a day.
- The security scan skips the third-party Animated Designs code.

---

## 1.74.1

### Fixed
- With an animated design on Home, menus and sheets closed the moment you pressed them, so you could not open another page. Designs now only follow the mouse and never receive presses.

### New
- **Background has four tabs:** Main (the theme and the look), Animated, Sources and Uploads. It opens on the tab you used last.
- **Mix Everything:** a theme that takes turns between Starter, your uploads, the animated designs and the online photos.
- The top bar and the sidebar show the current page as a tinted pill with a thin ring, like the dock. The line under it is gone.

### Removed
- Home's Welcome Text. A saved text is dropped the next time you save.
- The shining border, glow and turning light on the search box.

---

## 1.74.0

### New

- **Animated Designs for Home.** Sixteen live backgrounds, drawn in your browser: Iridescence, Flux Lines, Galaxy, Crystal Ball, Pattern Waves, Gradient Waves, Topography, Light Tunnel, Lightfall, Lightning, Hyperspeed, Ballpit, Orb, Letter Glitch, Balatro and Aero Shards. They are a choice: a new site still starts with the Starter photos, and Starter and Online Photos stay as they were.
- **Home Settings > Background > Animated Designs.** Each design has a switch (in or out of the rotation), **Preview** (shows it at once, saves nothing) and **Options** (colours, speed and a few more, inside safe limits). Your own themes can take designs along with your uploads.
- **Kind to phones and slow machines.** Hyperspeed and Aero Shards are for computers only: they are never offered or downloaded on a phone, and Aero Shards also needs WebGPU. With Reduce Motion on, only the designs that can stand still are used. A design's files are fetched only when it is on screen, and a phone draws at a lower pixel ratio.
- **Credit and licence.** Each design shows "From React Bits" in the corner. The files keep the React Bits licence (MIT with the Commons Clause), not the GPL; this is written in `THIRD-PARTY.md` and on the Licence page.

### Fixed

- **iPhone app:** with Bar Glass on, the clock area looked like a darker band above the bar. One glass now covers both while the bar shows.

### Behind the scenes

- Settings' script is cut into labelled parts (`assets/admin/`) and joined into the same single file at build time: nothing runs differently. The parts are not in the zip.
- More of the JavaScript is type-checked (`tabs.js`, `importer.js`).
- The designs are built by `scripts/build-designs.py` from the React Bits sources, run without React by a small runtime; new tests check each design draws, the licence banner, size limits and that nothing is fetched.

---

## 1.73.2

### Fixed

- When the connection dropped and came back, the page reloaded at once. If the browser said "online" too early, or the connection flickered, that reload could pull you back to the page you had just left. The page now waits a moment (1.5 seconds), checks that you are still online, and only then reloads. A flicker does not reload it.

### Changed

- The Docker image now runs on PHP 8.5.11.

---

## 1.73.1

### New
- **One command on a VPS:** `deploy/vps/install.sh` sets up a fresh Ubuntu 24.04 or Debian 13 server: Apache, PHP, the newest release (checked against its SHA-256) and HTTPS from Let's Encrypt. `--lan` installs it on a home network without a domain. It never replaces a site that is already there.
- **Proxmox VE:** `deploy/proxmox/homebase-hub-lxc.sh`, run on the host, makes a small Debian 13 container that starts with the host and installs the site in it.
- **App stores:** ready files for Unraid, CasaOS (and ZimaOS), Umbrel and YunoHost in `deploy/`. On YunoHost your data lives outside the site, so removing the app keeps it, and the site's own security headers are kept although YunoHost's web server would replace them.
- **Synology and TrueNAS:** steps on the website's Install page, using the Docker image.

---

## 1.73.0

### New
- **Docker:** each release is also an image, `ghcr.io/jackpison/homebase-hub`, for PCs, servers and Raspberry Pi. It holds PHP and Apache, so the site is protected exactly as on a web host. `compose.yaml` starts it on port 8080; `compose.caddy.yaml` adds HTTPS from Caddy for your domain.
- **Updates in Docker work as on any host:** the first start copies the site into a volume, Settings › Updates and Go Back work, and a newer image never replaces a site that is already there.
- **A VPS:** ready settings for Apache and for nginx in `deploy/`, and every step on the website's Install page. nginx ignores the `.htaccess` files, so its file closes `site-data` and sends the same security headers itself.

### Security
- **Behind your own proxy:** a new setting, `HUB_TRUSTED_PROXY`, names your proxy's address. Only then does the site believe it about each visitor's address (login limits, Devices) and HTTPS. A visitor who writes these headers themselves is ignored, as before.

### Fixes
- **Updates:** when the site cannot reach its own address from the server (Docker with another port, or a proxy in front), the check after an update asks the web server directly, instead of undoing a good update.

---

## 1.72.3

### Fixes
- **Tools › Markdown Editor:** the text box now fits inside its card, below the Bold to Quote buttons, instead of running past the bottom of the card.

### Security
- **Settings:** the sections open from a fixed list, as the security scan asked; the screen is the same.

---

## 1.72.2

### Security
- **Settings:** an address such as `#constructor` opens the Overview instead of a broken page. Only the site's own sections can open.
- **Settings › Appearance › Colors:** only real colour codes (like #1a2b3c) are put into the page.
- **Cards:** every part of a card that goes into the page is escaped, including its ID.
- **Links › Import Bookmarks:** picture and media tags in a bookmarks file are removed completely, also when one is hidden inside another, and event attributes (like onclick) are made harmless before the file is read.
- **Home Settings › Backgrounds:** the picture sources' names and counts are put into the page as plain text.

---

## 1.72.1

### Maintenance

- **Tools libraries updated** (each within its own major version, so nothing should change in how Tools work):
  - @neslinesli93/qpdf-wasm 0.3.0 → 0.3.1
  - pdfjs-dist 6.4.299 → 6.5.438

---

## 1.72.0

### Added

- **Import Center** (Settings › Backup & Restore › Import): another app's export, read here in the browser and shown first with ticks. A calendar (.ics) or Todoist (CSV) goes to Tasks; Google Keep (Takeout .zip), Notion (Markdown .zip) or notes (.txt, .md, .html, such as Apple Notes exported by an app) to Info as a new private tab; Raindrop (CSV), Pocket or browser bookmarks (.html) to Links as a new private tab, a category per folder or tag; a spreadsheet of cards (CSV, its columns matched and changeable) to Cards. What is already there is not added twice, the page saves it the usual way (locked Cards stay locked), and Undo takes it back.
- **Offline Reading** (Settings › Overview › Start Here): a switch per device, off by default, needs https. On, Home, Links, Info, Cards and Tasks open without a connection, read-only, with an "Offline" note; back online they load fresh. A page is kept once you have opened it, including the one you switch it on from. Log Out deletes the copy; switching it off deletes it and its service worker.
- **Calendars You Follow** (Tasks Settings): paste a calendar's address (Google's secret iCal address, an Apple public link, Outlook, a school's calendar). The server fetches it then and every 6 hours; its events show read-only in the Calendar, the day panel and Home's Today. The address is never shown in full. Nothing is fetched until you add one.
- **More ways to repeat a task**: on chosen weekdays (Every Weekday, Mon/Wed/Fri, every 2 weeks on Tuesday), on the last day of the month, or on the nth weekday (the 2nd Tuesday, the last Friday). Quick Add understands "weekdays". The calendar link carries the new rules.
- **Home widgets** (off until switched on in Edit › Settings › Widgets): Upcoming Bills (priced tasks still to pay this month, and the total), Recent Links (opened on this device), Recent Files (once Files has opened them in that tab) and Server Status (the same overview as Settings).
- **Search everywhere**: also Cards, the Scratch Pad, every Settings item, Files' names (once Files opened them in that tab) and, while you are on a page, the locked tabs it has unlocked. Results are grouped with counts, a small typo still finds it, and the empty box shows your recent searches.

### Changed

- **Pages open at once**: Links, Info, Cards and Tasks show the data they had last time in that tab while the fresh data loads; the pencil waits until it is in. Log Out clears it.
- **Accessibility**: a stepper step is a labelled group and says "Step 2 of 3"; the search box tells a screen reader which result is chosen and how many there are; Copy says "Copied". The keys [ and ] open the page before and after. The accessibility check now also runs in WebKit.
- On a page opened over plain http, Copy uses the browser's older copy command; only if that fails too is the text selected, with a note for a phone or a computer.

### Fixed

- **Narrow phones**: the recovery key and the two-step key were cut off at the right on a 320 px screen; they now wrap onto a second line.
- **Tasks › Add Task › Repeats › Custom**: the number box took the whole row and pushed the Days / Weeks / Months choice out of the window.

### For the project

- The weekly security check says when an npm override (minimatch) is no longer needed (`scripts/overrides.py`). A checklist for trying a release on a real phone: `docs/PHONE-CHECKLIST.md`.

---

## 1.71.0

### Changed

Smoother on phones, the iPhone app included.

- **Swipe between pages follows your finger.** The page moves with it (the bar stays). Let go past a third of the screen, or with a quick flick, and the page slides away while the next one slides in from that side; not far enough, and it springs back. At the first or last page it only gives a little. Before, nothing moved until you let go, and then the page reloaded with a fade.
- **Quicker page changes:** the fade between pages is 0.26 s in all (it was 0.46 s).
- **Reduce Motion:** nothing slides under your finger, and a page change is a short fade (it was a cut).
- **The top bar hides without restyling the page.** It used to change a setting on the whole page, so every element was styled again each time the bar slid away or came back (up to 36 ms on Tasks on a slow phone). Toasts, Tasks' side panels and the Settings menu now slide with the bar.
- The dock's shrink while scrolling only runs when the dock is used.
- The swipe checks for a sideways-scrolling box only once your finger moves sideways, not on every touch.
- **Home on a phone:** the next background waits 3 seconds after the page is ready (it was 0.6 s), and a next background that is a video is only fetched when you ask for it.

---

## 1.70.0

### Changed

Settings is sorted so each thing sits where you would look for it. Nothing is lost and no setting changes; old links open the new place.

- **Appearance › Bar** (new tab): Navigation Style, Show the Bar on the Home Page, Hide the Bar While Scrolling, and the Tabs list (rename, reorder, hide), which was General › Tabs.
- **Appearance › Look:** Theme, Font and **Text Sizes**. Text Sizes opens Info's or Cards' sizes from here too (Links keeps its own in Links Settings).
- **Appearance › Colors:** holds **Accent Color** (the picker with ten colors). It was in Look and again as a plain row in Colors.
- **Appearance › Glass:** the only place for the glass switch (Glass on the Bar). Look had a second one.
- **General** is one page: Site Name, Site Logo and Time Zone.
- **Overview › Start Here** (was Guided Setup): the setup steps, then **Install on Your Phone** and **Keyboard Shortcuts** (they were in General).
- **Backup & Restore › Back Up:** **Send Backups to Telegram** (how often, Send Backup Now) moved here from Telegram › Backups. Telegram's Backups card opens it.
- **Telegram:** four tabs (Status, Setup, Messages, Instant Replies). **Send Today's Tasks** is in Messages.
- **Health › Server Check** ends with **Files That Do Not Belong** (was Updates › Files).
- **Updates › What's New:** Versions, Version Map and Notes (the Changelog was a section of its own). The menu has eight sections instead of nine.
- The Settings search knows the new places.

---

## 1.69.1

### Added

- **The link field** (the idea of Uiverse "itchy-dodo-49" by Bodyhc, MIT, redone in plain HTML and CSS on the site's colours; credited in THIRD-PARTY.md): a label in front, the field, and a copy icon whose tip says COPY, then COPIED. The edge lights up in the accent colour while you type. One shared piece (shell.js `HUB.linkField`), used in:
  - **Links › Add or Edit Link › Address:** https:// sits in front (a tap gives http://). A typed or pasted https:// or http:// moves into it; an address with another scheme (mailto:, ftp://) hides it. An arrow opens the link in a new tab; the copy icon copies the whole address. What is saved is the whole address, as before.
  - **Files › Share Link:** "Link" in front, read-only, with the copy icon (it replaces the Copy button).
  - **Settings › Health › Domains and Uptime:** https:// in front of the add field; a pasted https:// is dropped, as only the host is kept.
  - **Settings › Telegram › Setup › Keep It on Schedule:** the two cron lines ("Cron" and "curl"). The key in the web address shows as dots; Copy gives the whole line with the real key.
  - **Security › Recovery Key** (also in the first-passphrase steps and the Security Checklist) and **Two-Step Login's key:** "Key" in front, read-only, with the copy icon.

### Changed

- Where the browser can't copy (a page opened over plain http), the field is selected and a note says to press Ctrl+C.

### Fixed

- **Files:** a file or folder whose id came out as 16 digits (about 1 in 1,800) could not be removed for good from the Trash: PHP turns such an id into a number, and the clean-up stopped with an error. New ids are never all digits, and ids made before are handled.

---

## 1.69.0

### Added

- **The Stepper** (React Bits' Stepper by David Haz, ported to plain JavaScript in shell.js, credited in THIRD-PARTY.md): a flow of a few steps in one box. The current step sits on a raised tile that slides along, a finished step turns into a tick that draws itself, the content slides and the box grows or shrinks to the new step, with Back and Continue (the last button says what it does). Numbers with names, dots or bars; steps ahead cannot be clicked where order matters; on a narrow screen only the numbers show; Enter in a field goes on; reduced motion is respected.
- **Where it is used:**
  - **New Site Setup:** Code → Password → Site (each checked before going on), then Done. A wrong code goes back to the first step.
  - **Links › Import:** File → Preview → Where → Import (a good file goes straight on to its preview). Export stays below it.
  - **Security › Encryption, the first passphrase:** Passphrase → Confirm It's You (this sets it) → Recovery Key (made on a click, as it is slow work, then shown once with Copy and an "I saved it" tick; it can also be made later).
  - **Backup › Restore:** File → Choose What to Restore (bars), then Restore.
  - **Backup › Start Over:** What Gets Erased → Back Up First (a Download a Backup button) → Type ERASE, with the Erase Everything button on the last step only.
  - **Files › Share Link:** How Long → Your Link (a file that already has links opens on them).
  - **Security › Add a Passkey:** Name → Your Device (a wrong password goes back to the first step).
  - **The Home Tour (new):** four cards (the start page, the bar, the widgets, Settings) that light up the part they talk about. It opens once, on the first Home visit after setting up a site, and any time from Home Settings › Take the Tour; Skip ends it.

### Checked

- polish_test P66 (Restore), P67 (Start Over: steps ahead locked, the tick, Erase Everything only on the last step), P68 (the passphrase is set on step 2, the recovery key made on step 3), P69 (New Site Setup and the Home Tour). import_test, settings_ui_test, settings_look_test L6, encrypt_test, passkey_test (K4: a wrong password goes back), files_test (Share) and the passphrase helper walk the steps.

---

## 1.68.5

### Changed

- **Glass > Where > Settings Windows** was almost invisible: the window kept 72% of its own colour and the dark layer behind every window dimmed the page, so the glass showed mostly dark. Now the layer behind a glass window is much lighter (the page stays visible around it), the window keeps 55% of its own colour so the frosted page shows through, and its edge is a brighter rim. Menus and Pop-ups and Search Results also keep 55% (was 72%); all of them keep at least 14 px of frost so text stays readable. Solid keeps the usual windows.

### Checked

- polish_test P65: with Settings Windows on, the Links Settings window is see-through glass (55%, 14 px frost) over a light layer; off, windows are as before.

---

## 1.68.4

### Changed

- **One glass for the whole site:** the top bar or dock and the Home widgets (chips, cards, the dock, the open widget) now share one set of values in **Settings › Appearance › Glass**, with one piece of code (the same CSS variables, and glass.js for Liquid). Home › Settings › Glass is now a link to it. A Home glass look you had changed by hand moves into the shared glass once (when the shared glass was never set); Home's built-in look simply takes the shared default (Soft). The open widget keeps its extra frost so text behind it never shows through.
- **The Glass tab:** a live preview (the start page's photo with a bar, the clock, a widget and the dock) that follows every change; Quick Picks Soft, Clear, Frosted, **Solid** (from Home: easiest to read on busy photos), Liquid and Strong Liquid; Fine-Tune with **Tone** (Auto follows the theme, Light, Dark), Frost (up to 40 px), Tint (up to 94%), Saturation, **Rim Light** and **Shadow**; a **Liquid** card with **Only Over Photos** (on by default: the bending runs on the start page, plain glass on pages of text, where it would mirror the words); and **Where**: glass also on Menus and Pop-ups, the Phone Page List, Search Results and Settings Windows, each on its own switch (they keep most of their own colour and at least 14 px of frost, so they stay easy to read).

### Fixed

- **Saturation did nothing since 1.68.3:** a comment had swallowed the line that set it. It is set again (and tested).

### Checked

- polish_test P61 (the Home widgets follow the one glass; Frosted's frost and saturation; Solid), P62 (Liquid with Only Over Photos: bends on the start page, not on Links), P63 (Menus and Pop-ups glass on its switch), P64 (Tone Light and Rim Light change the glass and the preview, Save keeps them); P58 updated. pages_test P40 (the Home widgets follow the Glass tab; still see-through with "reduce transparency"; Tone Light; Solid). settings_look_test L9 (Home Settings shows the link, not its own glass controls). nav_settings_test.php: Home's look moves once and only when the shared glass was never set; the new value ranges.

---

## 1.68.3

### Changed

- **Save Settings bar:** it shows only once something has really changed (and while saving), on every Settings tab. Before, the tabs saved with Save Settings showed it greyed from the start ("No changes yet."), which looked as if something needed saving.
- **Bar Glass is clean by default:** the bending read from just outside the bar, where Chrome mirrors the page, so over text it showed upside-down copies at the edges (any bend, even a small one). The default is now **Soft** glass (a little frost and tint, the rim), with no SVG filter at all. The bending is an effect you can pick: **Liquid** (the mock-up look, best over a photo) and **Strong Liquid**. Quick Picks: Soft, Clear, Frosted, Liquid, Strong Liquid; the Bend slider is now "Liquid Bend" (0 = off).

### Fixed

- **CI on 1.68.2:** the new Glass tab check (P58) waited for the Chromium-only filter, so it failed in WebKit (Safari's engine, which shows frosted glass); it now checks each browser for what it shows. passkey_test opened a page while the logout's own page reload was still running (ERR_ABORTED, now and then); it waits for that reload.

### Checked

- polish_test P51 (no SVG filter by default), P52 (Soft: 3 px frost), P58 (no Save bar until a change; Frosted and Liquid change the bar at once; Liquid turns the bending on; Save keeps them on every page). settings_look_test L10 (no Save bar until something changes). speed_test V32 measures the Liquid glass (the heavy path).

---

## 1.68.2

### Added

- **Settings › Appearance › Glass:** a tab of its own for Bar Glass. Quick Picks (Clear, the mock-up look and the default; Frosted; Strong) and sliders: Bend, Edge Width, Colour Fringe, Frost, Tint and Saturation, with Reset to Default. The real bar or dock follows each move; Save Settings keeps it for every page. Safari and Firefox show frosted glass, so there only Frost, Tint and Saturation change it (the tab says so). The server keeps every value inside its range.
- **Hide the Bar While Scrolling** (Settings › Appearance › Look, on by default): off keeps the top bar in place and the dock from shrinking while you scroll.

### Changed

- **The dock** no longer shows the line over the current page; its tinted pill already marks it. The top bar and the sidebar keep the line.

### Checked

- polish_test P58 and P58b (a quick pick and a slider change the real bar at once; Save keeps them on every page; Reset goes back to the built-in look), P59 (no line in the dock, the top bar keeps it), P60 (the bar slides away while scrolling, or stays when switched off). nav_settings_test.php (Glass values kept inside their ranges; Hide the Bar on unless switched off). settings_test S13 now expects the Glass tab.

---

## 1.68.1

### Fixed

- **Bar Glass did not show on Windows with Transparency effects off:** the browser then asks sites for less transparency and 1.68.0 left the glass off, although it was switched on. The switch decides now.
- **The bend was much weaker than the mock-up:** the glass map was set in pixels; it is stretched over the bar again (100%), as in the React Bits component, so the edges bend with the coloured fringe again.
- **Blurred glass:** the faint frost 1.68.0 put on pages other than the start page hid the bending. Clear glass on every page now, as in the mock-up.
- **The dock's glass and blur went clear while scrolling:** the dock faded a little as it shrank, and a faded box cuts what is inside it off from the page. It still shrinks, but no longer fades.

### Checked

- polish_test P51 (map stretched over the bar at its size), P52 (no frost), P56 (glass shows with "reduce transparency" on), P57 (the dock does not fade while scrolling).

---

## 1.68.0

### Added

- **Bar Glass** (Settings › Appearance › Look, off by default): the top bar, or the dock, turns to glass that bends what is under its edges, with a faint coloured fringe. It is GlassSurface from React Bits by David Haz, ported to plain JavaScript (`glass.js`, loaded only when the option is on). Chrome and Edge show the full glass; Safari and Firefox show the component's frosted glass. The start page shows its photo through clear glass; the other pages add a faint frost (a little blur and tint) so the bar stays readable over what scrolls under it. With glass the dock is a little taller (70 px on computers) so the bend at its round ends has room. Not for the sidebar, and not when the device asks for less see-through.

### Fixed

- **The dock's blur never reached the page:** the dock's outer box carried the name that keeps the bar still between pages, and a box with that name hides the page from anything inside it, so the pill's blur only saw an empty box (on Info, text under the dock showed through). The pill carries the name now; the dock still stays still between pages.

### Checked

- polish_test P49 to P55 (off by default and glass.js not loaded; the switch previews and saves; the SVG filter and its map in Chromium, frosted glass elsewhere; the faint frost on plain pages, clear on the start page; the dock's pill is glass, taller, and the page-change name sits on the pill; the sidebar stays as it is; switching off takes the glass away). speed_test V32 (scrolling 600 links under the glass bar costs at most twice the plain bar per frame). nav_settings_test.php (Bar Glass is on only for a real true; every page receives it).

---

## 1.67.2

### Settings > General > Tabs

- **Home is no longer in the list.** Your logo and site name are Home in the bar (the dock still shows Home first).
- **Save Settings turns on as soon as you drag a tab.** Before, it stayed grey until you clicked something else, such as Basics.
- **A clearer list:** each tab shows its colour tile from the bar, a handle to drag it and a switch to hide it; a hidden tab turns grey and says Hidden. A strip above the list shows the bar as it will look. The up and down arrows are gone: drag a tab, or press Alt + Up or Down on its name.
- The list had borrowed a style meant for the Presets page, which squeezed its rows together; it has its own now.

### The bar

- The glowing line under the current page is softer in dark mode.

---

## 1.67.1

### The bar

- **No Home button in the top bar and the sidebar.** The logo and the site name already take you to the start page, so the extra button is gone. On the start page the logo is marked as the page you are on. The dock keeps its Home button, because it has no logo.
- **The dock shows every page again.** Only the current page showed; the other pages' colour tiles were hidden by mistake.
- **The dock steps aside while you edit** a page, so the edit bar has the bottom to itself. It comes back when you press Done.
- On a phone the dock shows the colour tiles only, so all seven pages fit beside the search button. The current page keeps its glowing line.

### Faster

- **Links: edit mode turns on two to three times faster** on a big page (600 links: from about 0.2 to 0.3 seconds down to about 0.1). Edit mode now draws about one screen of rows at once and the rest right after, each icon is read once instead of once per row, and categories below the screen are not laid out until you scroll to them.
- **Page changes ask the server less.** Scripts, styles and pictures that carry a version in their address are kept by the browser for a year, so moving between pages no longer checks each of them again. A new version has a new address, so updates still arrive at once.
- **Settings** no longer downloads its script and styles twice.
- **Home** loads the next background only after the page has finished loading, so it never slows down the first picture.
- The shell no longer searches the whole page on every change for dropdowns to turn into buttons; it looks only at what was just added.

### Safer

- The security scan (Semgrep) now uses the current version and gives big files enough time: before, two of its rules gave up on the Settings script and never checked it. Everything it found is fixed: the logo and site name in the bar are now built without pasting text into the page, and one line it could not read in Info was written more plainly. The same scan now runs in the local checks too.

---

## 1.67.0

### Changed

- **The top bar:** each page has its own colour tile with a white icon (Home amber, Links blue, Info purple, Files sky blue, Cards green, Tools orange, Tasks rose). A line in the current page's colour sits under its name at the foot of the bar, with a soft glow in light mode and a stronger one in dark mode, and slides to the new page where the browser can. The sidebar shows bigger tiles and the line at its left edge; the dock tints the current page in its colour with the line above it. The drawer on a phone uses the same tiles.
- **The search box:** a dark field (white in light mode) inside a soft border in the current page's colour; pointing at it turns the border, clicking in spins it round once, with a faint glow behind it. The filter button has a slow turning edge. Adapted from Uiverse.io by Lakshay-art ("curvy-earwig-22", MIT).
- **The right side of the bar:** the theme, Edit, Backup and Settings buttons sit in one rounded tray, each a small colour tile with a white icon (theme amber, Edit blue, Backup green or red while a backup is due, Settings grey), with a thin line before Settings.

### Checked

- polish_test P39 to P43: every page has its own tile with a white icon; the line sits under the current page in its colour with a stronger glow in dark mode; the search border turns when clicked in; the tray, its tiles and divider; no sideways scroll on a computer or a phone. nav_test now checks the line (not the old pill) and the page names beside the tiles; the page names in the bar keep the readable muted colour (a11y_test).

---

## 1.66.1

### Changed

- **The colour tiles everywhere:** the tiles in front of the rows of every page's Settings window (Links, Info, Cards, Tasks, Files, Home) and the icons on the Settings pages (cards, the big icons, the Security tiles) are now solid colour tiles with a white icon, like the Settings menu of 1.66.0. On a Settings page they take that section's colour (blue on General, green on Security...); a card that is fine is green, one in trouble red. Pointing at a row in a Settings window makes its tile grow a little and glow.
- **The Settings menu:** the small "Settings" label above the search is gone on computers (phones keep it as the page title).

### Fixed

- **The Settings menu** started 76 px lower than the page title and no longer stayed in place while you scrolled (since 1.66.0): one of its new styles had switched off its "sticky" position. It starts level with the title and stays in place again.

### Checked

- polish_test P37 (the menu is sticky, level with the title, no label; the page tiles are solid) and P38 (a page Settings window's tiles are solid with a white icon). settings_look_test L46 now checks the solid tiles.

---

## 1.66.0

### New

- **File type cards (Files):** every file shows a small page with a coloured label for its type (PDF, XLSX, ZIP, MD, MP4...) and a drawing of its kind: text lines, a sheet grid for spreadsheets, a zipper for archives, a slide, braces for JSON and CSS, tags for code, a picture or a play button, a sound wave for audio, and a plain page with the file's own extension for anything else. In the list (small), the grid (pictures keep their real thumbnail), the details panel, the Share window, and on the page a share link opens. Look from "file-card-collections" by urmauur (21st.dev), rebuilt in the site's own CSS.
- **Uploads, one card per file (Files):** every file you pick or drop shows at once: waiting ("Ready to upload"), locking in your browser, uploading with its % and a thin bar, failed (red, with the reason and a try-again button), or done ("Uploaded · 1.8 MB"). × takes a waiting file off the list, or stops one that is going (the half file is thrown away on the server). At the top: "Uploading 2 of 5", one bar for all of them, Stop All and Clear Done. Done cards stay until you clear them. Downloads and zips use the same cards.
- **One step bar for every step-by-step screen (Settings):** thin bars with the step names under them: done steps fill with your accent, the current one is bright, skipped ones are dashed.
  - Overview › Guided Setup: one step on screen at a time, with Back, Skip for Now and Next; click any step in the bar to jump to it.
  - Telegram › Setup: one step card at a time; click a step in the bar, or use Back and Next.
  - Updates › Update the Site: the bar shows where the update is (its steps can't be clicked: Apply only comes after the review).
  - Security › Two-Step Login, while you turn it on: Get an App, Scan the Code, Type the Code, Save Recovery Codes.
  - On a phone only the current step's name shows under the bars ("2 of 5 · Encryption Passphrase").

### Changed

- **The Settings menu:** each section has a solid colour tile with a white icon (like the settings of a phone): Overview, General, Appearance, Security, Telegram, Backup & Restore, Health, Updates, Changelog. Pointing at one makes its tile grow a little and glow in its colour; the chosen one glows and a highlight in its colour glides to it. The groups are called Web, Data and System. A status is a small glowing dot with quiet text (amber when something waits). Your site's logo, name, address and version sit in a card at the bottom, with Log Out as its button. Icons from Lucide (ISC).
- The bar's search box shortens its "? Shortcuts" hint with "…" when the bar is narrow.

### Checked

- files_test: B7b the type card in the list, B7c the Transfers card "Uploaded · 38 B", B8b a failed upload shows a red card and its try-again button uploads the file. polish_test P31 to P35: the Settings menu tiles, highlight and colour; Guided Setup, Telegram Setup and Updates step bars. settings_test: the menu groups Web, Data, System.

---

## 1.65.3

### Changed

- **Accent Color** (Settings › Appearance › Look): the eight round dots are now a row of ten squares. On a computer, the square under the mouse grows and its neighbours grow a little, and a small bubble shows its colour code. A click chooses it: it gets a ring and a tick, the bubble says "✓ Chosen", and the site shows the colour at once (Save Settings keeps it, as before). The arrow keys move along the row and Enter or Space chooses. On a phone a tap chooses and nothing grows; nothing grows either when your device asks for reduced motion. Your Own Color and the hex box stay after the row. An accent you already saved that is not one of the ten keeps working and shows in the hex box. Adapted from Uiverse (Cobp, MIT).

### Checked

- polish_test P28 to P30: ten squares, the hovered one and its neighbours grow (1.5, 1.3, 1.15), a click chooses (screen readers hear "chosen", the site takes the colour), the arrow keys and Enter. settings_test S14 counts ten colours.

---

## 1.65.2

### Fixed

- **Edit bar:** the Done button's tick was white on its white circle (since 1.65.1), so it looked empty. It is dark again.
- **Health › Disk Used:** no longer shows "… free on the server". On shared hosting that number is the whole server's disk, not space you can use. The card now says what the size counts: your pages, pictures, icons and backups.

### Checked

- polish_test P27: the Done tick is dark on its light circle. settings_look_test L18: Disk Used shows no free-space line.

---

## 1.65.1

### Changed

- **Theme button:** back to the sun and moon icon button of 1.64 (in the bar, the side panel and the phone menu). The day/night switch of 1.65.0 is gone.
- **Edit bar:** the bar at the bottom while you edit (Links, Info, Home) is a dark pill of round buttons. Pointing at a button lifts it, its icon takes the colour of what it does (red for delete, green for add, blue for export or fetch, violet for settings and colours), and its name pops up above it in a light bubble. Icons and Text still shows the names in the bar. Adapted from Uiverse (firemonste_8052, MIT).
- **Erase Everything** (Backup & Restore › Start Over): a red button with its words and an X; pointing at it slides the X across the whole button. It still needs ERASE typed and your password. Adapted from Uiverse (cssbuttons-io, MIT).
- **Hover glow:** buttons that did not change when you pointed at them now glow softly in the accent colour: Cards' More Filters and holder chips, choices that are not picked (view buttons, filters), Presets, and the Backup button in the bar (green). Column headers and text links glow in their text. Idea from Uiverse (mrhyddenn, MIT), at about a third of its strength.
- **What's New:** the card after an update has a calm border with one light that runs around it twice, instead of the heavy accent outline.
- **Login:** behind the login window the page blurs over a faint dot grid, the password field glows when you type, and "or" comes before Log In with a Passkey.

### New

- **Settings when logged out** shows a card with your logo and a proper Log In button, instead of the browser's grey button.
- **Keyboard Shortcuts are easy to find:** the bar's search box says "? Shortcuts"; typing ?, "keys" or "shortcuts" in search shows Keyboard Shortcuts first (Enter opens the list); Settings › General has a Keyboard Shortcuts card with View Shortcuts (hidden on touch-only phones and tablets). The ? key still opens the list on any page.

### Fixed

- **Search:** the result under "Tools" (and any result) was squeezed into a small square and cut off at the left, with the dot over the words. Its text used a class name that window tiles also use; it has its own name now.
- **Settings:** right after a small window closed (for example Keyboard Shortcuts), going to another section left the page on the old one, and Backup & Restore could open the wrong tab. The page looked inside the closing window for its parts.

### Checked

- polish_test.py has nine new checks (26 in all): the logged-out card, the login window, full-width search results, Keyboard Shortcuts from search and from Settings › General (and changing section right after), Erase Everything, the hover glow, the What's New light and the edit bar. nav_test checks the sun and moon button again.

---

## 1.65.0

### New

- **Switches:** every on/off switch on every page (Settings, page Settings windows, Home's sheets, Links, Info, Cards, Tasks, Files) now uses one look: a white track with a metal knob that turns dark when on. Keyboard focus shows an accent ring. Tools' tick boxes are choices in a list, not on/off settings, so they keep their look.
- **Day/night theme switch:** the theme button in the top bar is now a small sky switch (moon and stars for dark, sun and cloud for light). The side panel and the phone dock use a smaller copy.
- **Hold to Delete:** every delete button that used to ask for a second click (links, categories, tabs, boxes, cards, tasks, files, passkeys, saved versions, presets, Go Back, Remove Encryption) now fills with red while you hold it; let go early and nothing is deleted. On a keyboard, hold Enter or Space. A plain click shows "Hold the button down to confirm." Undo after delete still works.
- **Swipe in Tasks:** on a phone or tablet, swipe a task left to mark it done, or right to skip a repeating task to its next date.
- **Tooltips:** icon-only buttons show their name in a small dark label with an accent line when you point at them or move to them with the keyboard.
- **Loader:** waiting screens (sign in, Health, Updates, Presets) show three bouncing dots in your accent colour.
- **Button hover:** on a computer, buttons fill with the accent colour from the sides when you point at them.
- **Count-up numbers:** the totals in Cards and the numbers on Settings > Health count up when they first show.
- **Presets screen:** each preset is a card with a small picture of a page in its colours, grouped and filtered by one row of chips. **Surprise Me** makes a new palette every time (Another One), checked so text stays easy to read; Use It applies it and Save to My Presets keeps it.

### Kept as it was

- Nothing moves or animates when your device asks for reduced motion.
- Credits for the four Uiverse designs (MIT) are in `web/hub/docs/THIRD-PARTY.md`.

### Checked

- A new browser test (polish_test.py, 17 checks) covers the switch size and colours, the theme switch, hold to delete with mouse and keyboard, a plain click not deleting, tooltips, the loader, button hover, count-up, swipe in Tasks, and Surprise Me palettes passing the contrast check. The tests that delete things now hold the button.

---

## 1.64.12

### Fix

- **Missing link icons:** a link whose saved icon file is no longer in the icons folder showed an empty box, and every visit asked the server for the missing file (a "file not found" each time, which some hosts' firewalls count). Now the server tells the page which icon files are gone: the link shows its first letter, nothing missing is asked for, and the icon is fetched again the next time you start editing Links, or at once with Fetch Icons > Only Missing.

### Checked

- The speed test saves a link with an icon file that does not exist and checks the letter shows, no missing file is asked for, and Fetch Icons counts it as missing.

---

## 1.64.11

### Quicker big pages

- **Links, first visit to a tab:** the top of each column shows at once and the rest of the categories follow over the next frames, in order.
- **Links, everyday use:** the edit buttons of each link (move, edit, delete, drag) are hidden unless you are editing, but were built for every link anyway. Now they are built only while editing. With 1,500 links and a 4 times slower processor, the script work of opening a tab for the first time went from about 0.34 s to about 0.17 s, and about 0.05 s for a tab seen before.
- **Cards:** amounts are formatted and cards sorted with one formatter made once (it was made again for every amount and every comparison), and a long list shows its first 60 rows at once and adds the rest over the next frames. With 400 cards: a redraw went from about 0.37 s to about 0.07 s before the first rows show.

### Checked

- The speed test checks that Links builds no edit buttons outside edit mode and all of them inside it, that a tab with 32 categories first shows 12 (the top of each column) and then all in the right order, and that 300 cards show 60 rows at once and then all, with amounts written as before.

---

## 1.64.10

### Quicker Links

- **Switching tabs:** each category's drawn links are kept and used again while nothing in them has changed, so going back to a tab you have already opened draws nothing new. With 1,500 links and a 4 times slower processor: about 0.3 s down to about 0.1 s. The first visit to a tab is as before.
- **Editing:** moving, adding, renaming or deleting a link (or a divider) redraws only the category it is in, not the whole tab.
- **The tab's ease-in** no longer makes the browser measure the whole page at once on every switch.

### Checked

- The speed test switches away from a tab and back and checks that the same categories are shown (not drawn again), and that moving a link redraws only its own category and shows the move.

---

## 1.64.9

### Quicker

- **Links: Save Settings, Colors and Text Sizes** redraw the links only when a setting changes what is drawn (Icons from Google, Show Visit Counts, Only Me). Colors, text sizes and the title change at once without it. With 1,500 links and a 4 times slower processor: about 0.6 s down to about 0.13 s.
- **Cards: Save Settings** changes the title without redrawing every card. With 400 cards: the longest pause went from about 0.8 s to about 0.3 s.

### Checked

- The speed test saves only the title in Links and Cards and checks that the links and rows are the same as before (not drawn again), and that turning Show Visit Counts on or off still redraws.

---

## 1.64.8

### Fix

- **A host firewall that asks for a CAPTCHA or blocks you:** some hosts blacklist an address after a number of blocked or CAPTCHA requests (one counts 101). When the site's data call (api.php) gets a web page back instead of its own answer, the site now says your host's firewall answered, keeps your change in the browser, and stops sending requests for a minute, so the count does not climb while you solve the CAPTCHA in another tab. Nothing is logged out. This covers the 403 page of 1.64.6 too.

### Checked

- The speed test answers a save with a CAPTCHA page (status 200) and checks the message, that the page gets a "could not reach the server" answer, and that the next requests are not sent for a minute.

---

## 1.64.7

### Fewer requests

- **Hovering over the bar:** the bar's page links used to be PRERENDERED as soon as the mouse rested on them, so moving across the bar made your browser run Home, Links, Info, Cards, Tasks and more in the background (about 13 requests each) within a few seconds. Some web hosts' firewalls read that burst as an attack and block the visitor. Now a hover only fetches the page's HTML (one request), and a page is prerendered only when you press the link. Switching pages still feels instant.

### Checked

- A new test (`speculation_test`) fails if a page link is ever prerendered on hover again.

---

## 1.64.6

### Fix

- **A host firewall that says 403:** some web hosts block a request with their own plain "403 Forbidden" page before the site sees it. Every page took that as "you were logged out" and asked for the password. Now a message says your web host blocked the request (not Homebase Hub), you stay logged in, and the change stays in the browser. Homebase Hub's own 403 answers are unchanged.

### Checked

- The speed test now makes a host-style 403 page answer a Settings save and checks the message, no password box, and that the window comes back with the text still in it.

---

## 1.64.5

### Quicker

- **Home Settings:** the window closes at once and the server catches up; if it refuses, the window opens again with the reason (the same as Info Settings in 1.64.4).

### Checked

- The speed test now also checks that Home Settings closes before a slow server answers, with a 1.5 s delay on every answer.
- A test that read the Settings tab bar too early in WebKit now waits for it.

---

## 1.64.4

### Info feels quicker

- **Typing in a big box:** the box used to measure the whole page twice on every key, which made typing lag on a page with many long boxes (about 55 ms per key on a slow computer). It now measures only when the text needs more room, and once per frame.
- **Info Settings:** Save Settings closes the window and changes the title at once; the server catches up in the background. If it refuses, the old settings come back and the window opens again with the reason.
- **Big pages:** boxes that are off the screen are no longer laid out until you scroll to them, so opening an editor, switching tabs and opening windows are quicker on a page with a lot of text (printing is unchanged).

### Export

- The Export window has the same look as the others: one card with two rows, All Tabs and Current Tab (with its name), each with PDF and Text buttons.

### Checked

- The speed test now types in a big Info page and counts the box re-measurements, and checks that Info Settings closes before a slow server answers.

---

## 1.64.3

### One look for every Settings window

- **General:** the first group of every Settings window is now called General, and Page Title is a row like the others (a tile, the name, the hint, the field on the right). Links, Info, Cards and Home.
- **Encrypt Private Tabs (Links and Info):** a purple shield tile of its own (it used to borrow the green lock of Only Me), a badge such as "1 waiting", a short **Encrypt** button and a hint that says how many of your tabs are waiting. When all are done the row stays and says **All encrypted** instead of disappearing.
- **Controls that do not fit drop under their name:** Edit Bar's Icons Only / Icons and Text no longer squeezes its label into a thin column. In every Settings window, also Home's.
- **Switches that are off** have a clear outline now, so they no longer look disabled (also Home and the main Settings page).
- **Save Settings looks dim** until something in the window changes. It always works; only the look changes.
- **Add Link:** the Link card has Address, Name and Category. Icon and Extra Links fold away under Optional (they open by themselves for a link that has them). "URL" is now called Address.
- **Home Settings:** the same headings, tiles on every row, and the focus off the close button.

### Checked

- The window test now also fails a window with a heading called "Page", a squeezed control row, or a Save Settings that is not dim before anything changed; the private-tab tests check the "1 waiting" and "All encrypted" states.

---

## 1.64.2

### Fix

- **Top bar on tablets and small laptops (about 760 to 1180 px wide):** the last tab, Tools, slid under the buttons on the right. Now the tabs show only their icon (the page you are on keeps its name; hover shows the rest) and the site name steps aside. Phones and wide screens look as before.

### Checked

- Every page and every Settings tab, in dark and light, at phone, tablet and laptop width: no script error, no failed request, nothing wider than the screen. The window test now also checks that the top bar fits at seven widths.

---

## 1.64.1

### Windows

- **Edit Tab (Links and Info):** the Icon row is one line that shows the current icon. Press it to open the 16 icons; it is closed every time the window opens.
- **Tasks:** the Add Task fields now have the same rounded look as everywhere else, and Tasks Settings keeps its dropdowns on the right.
- **Files:** opening Settings or another window no longer puts the yellow ring on the X; the first field is selected.

### A test for every window

- New `windows_test`: opens 30 windows (Links, Info, Cards, Tasks, Files, Home) and checks the same rules on each: title and X, scrolling body, footer buttons, headings, cards, switch and field sizes, nothing wider than the window. A window that breaks one fails the build.

---

## 1.64.0

### A calmer look

- **The cards in Settings and in every window now follow your Boxes and Cards colour** (Settings > Appearance > Colors, or any preset). Before, they were made from the text colour, so a bright text made them bright.
- **The coloured icon tiles are calmer** for everyone (a little less saturated), also in the Settings menu.
- **Two new presets** in Settings > Appearance > Presets, under Site Looks: **Soft Dark** (neutral grey, softer text) and **Soft Warm** (a warm dark brown with creamy text). Both keep your accent colour and stay easy to read.

### One look for every window

- Every window on Links, Info, Cards and Tasks (Colors, Text Sizes, Fetch Icons, Restore an Earlier Version, Add Link, Name, Unlock, Edit Card, Holders, Banks, Column Order, Box Settings, Add Task and the rest) now has the same pieces as Settings: headings with a fading line, rounded cards, rows with a tile, the choice or switch at the right.
- **Colors (Links):** the Dark and Light choice is no longer cut off; each colour is a row with a preview, a swatch and its code in full (it was cut: `#8751d`).
- **Fetch Icons:** the two choices are rows with a radio at the right.
- **Text Sizes:** three slider rows in one card.
- A window opens with its first field ready to type in on a computer, and the close X no longer holds the focus (it drew a yellow ring). A list that is still empty (Holders, Banks) is not drawn as an empty bar.

### Links Settings

- **Show Visit Counts** moved into Look; the Visits section is gone.

---

## 1.63.1

### Tabs

- Dragging a tab in Links or Info now always lands where you let go. Before, with a very fast mouse or a slow browser, a tab could stop one place short or not move at all.

---

## 1.63.0

### Tabs in Links and Info

- Tabs now work the same way on both pages. In editing mode, **drag a tab to move it** (on a phone: press and hold, then drag). The arrow buttons in Links are gone. From the keyboard, press Alt + Left or Right on a tab.
- **Pick an icon for each tab.** Edit Tab has 16 icons to choose from, and Default keeps what each page showed before: the ribbon in Links and the document in Info.
- **A new Edit Tab window** in the same look as Settings, with switches for Private Tab and Encrypted Tab. Delete Tab is in this window now, in both pages.
- Each page keeps its own look. Links still shows its ribbon and Info its document icon until you pick another.

### Windows in the new look

- **Banks** (Cards): each bank has a letter badge, its name and link side by side, and the number of cards.
- **Add Task** (Tasks): fields are grouped under Task, When, Payment and Notes.

### Tools

- **Markdown Editor:** a task list followed by a numbered list no longer splits each task into two lines, and a list inside a list no longer has big gaps.
- **Hash Generator:** long hashes wrap inside the page instead of running off the right edge.
- **Phones:** the Hash Generator and the SIP, Loan EMI and FD and RD calculators no longer scroll sideways.
- Choice buttons (such as Text and File, or JPG and PNG) are only as wide as their buttons, not stretched across the page.

### Behind the scenes

- The tab code for Links and Info is now one shared file (`tabs.js`), with a test that the icon list matches on the server.
- New tests for tab drag, icons and the Edit Tab window (`tabs_kit_test`), and for the Tools fixes.

---

## 1.62.8

### Behind the scenes

Nothing on screen changes in this version.

- The Cards, Tasks and Info page scripts are now checked for type slips, like Links, Home, Files and Import Bookmarks, so a later change that passes the wrong kind of value fails a check before it can ship.
- In those three scripts the small function that shows the "Saving…" and "Saved" message was renamed, because its old name clashed with a name the browser already has. It does the same job.
- The check now runs for six page scripts, each on its own.

---

## 1.62.7

### Behind the scenes

Nothing on screen changes in this version. Each page keeps its own look, its own tab icons and its own way of moving tabs.

- Links and Info now use one shared piece of code for "Keep unlocked on this device" (the switch, the kept key, and opening your encrypted tabs right after you log in), instead of two copies.
- Both pages check a colour like `#d9a85b` with the same shared function.
- The Links and Home page scripts are now type-checked, like Files and Import Bookmarks.
- New tests cover the shared unlock code and the shared colour check.

---

## 1.62.6

### Behind the scenes

Nothing on screen changes in this version. The code underneath is tidier.

- Every file the site saves while two things might write at once (Tasks, Files, Home, Links visits, passkeys, notifications, approvals, activity, backups) now uses one shared way to wait its turn, instead of ten copies of it.
- The core file `boot.php` is split into four smaller files: `boot`, `auth` (login, sessions, codes), `fetch` (safe downloads) and `settings` (site settings, time zone, alerts).
- Home, Links, Info, Cards, Tasks and Files use one shared text-escaping and fetching helper from the shell instead of their own copies.
- The Import Bookmarks script is now type-checked with the Files scripts.
- New tests cover the lock helper, the split files and the shared helpers.

---

## 1.62.5

### Cleaner code

- **Unused styles and code are gone.** About twenty style rules that no page used, two unused settings in the code, and a folder-removal routine that existed twice are removed. Nothing changes on screen.
- **The notes in your zip are up to date.** `README.txt` now names Tasks and Files, lists the libraries, and describes the four Backup & Restore tabs instead of a menu that was never built.
- **A new check keeps it tidy:** a test fails when a function, a setting or a style is left that nothing uses.

### Website

- Every screenshot on the website was retaken from the current app, including the Cards, Tasks, Links and Info Settings windows, Colors and Backup.

---

## 1.62.2

### Settings

- **The on and off switches are switches again.** In Settings, many switches (Use the Preset's Accent Color, Show the Bar on the Home Page, the Telegram, Backup and Updates switches, and more) had shrunk to a small ring and a ball since version 1.61.6. They work as before and now look right.

---

## 1.62.1

### Passkeys

- **Remove a passkey now shows what is wrong.** Remove needs your website password, typed in the box below the list. Before, every message about it (no password typed, wrong password) appeared only in that box, out of sight, so it looked as if nothing happened. Now the message also shows at the top of the page, and with no password typed the page scrolls to the password box.
- If passkeys exist but adding one is not available (for example no secure connection), the password box is still shown so you can remove them.

---

## 1.62.0

### Info: Undo

- **Undo after you delete a box or a tab.** A message offers **Undo** for 7 seconds. It puts the box back in its place with its text, or the tab back with all its boxes. Before this, a deleted box could only come back from an earlier version in Backup.
- **Locked tabs work too.** The text goes back exactly as it was, still locked. The server never sees your passphrase, and it refuses to put readable text into a locked tab.
- If the tab was changed on another device, or has no room left, Undo tells you so and changes nothing.

### Behind the scenes

- Links, Cards, Files and Info now share one Undo message. Nothing changes on screen.
- A page change that is cut short no longer causes a harmless error in the browser's log.

---

## 1.61.9

### Tools, tidied

- **Image Converter** now has three tabs: **Convert Images**, **SVG to PNG** and **Image and Base64**. The last two were tools of their own; their old links, stars and Recently Used entries open the right tab.
- **Removed:** Password & UUID, ZIP Creator, QR and Barcode Scanner, and Stopwatch and Timer. Tools no longer asks for the camera. 47 tools now.
- **New section order:** Images, Photos, PDF, Documents, Calculators, Utilities. **Text Tools** and **JSON Formatter** moved to Documents, **Time Zone Converter** to Calculators.
- **Organise** can move whole sections up and down; the side menu and the home page follow, and your order is kept in this browser.
- **Screen and Voice Recorder:** much sharper screen recordings (VP9 first, the full screen size up to 4K, text kept crisp) and a **Quality** choice: Standard, High (the default) or Best. Better sound too.

### Every page

- Every window on Links, Info, Cards and Tasks (Add Link, Edit Tab, Box Settings, Edit Card, Holders, Add Task and the rest) now has the same frame as Settings: the title and a close X on top, the buttons at the bottom, Cancel before the main button.
- One button shape everywhere: rounded corners and bold text.
- **Undo** after deleting a link, a category or a tab in Links, and after deleting a card. The message offers Undo for 7 seconds.

---

## 1.61.6

### Settings windows, tidied

- **Encrypt All Private Tabs** now sits inside the Privacy card (Links and Info), not loose below it.
- No more empty strip at the bottom of a card, no line after the last row, and a help line always stays with its setting.
- **Import and Export Bookmarks** uses the same window as the rest: an Import card with **Choose File**, an Export card, and much shorter text.
- **Home Settings:** the Edit Bar and Tint buttons sit at the right of their name, like everywhere else.
- **Files Settings** and **Tasks Settings** use the same rows and cards: the choice is at the right, with a short line under each name.

### The Settings page

- **Save Settings is always in view** on General, Tabs, Appearance and Colors (greyed out until you change something), so a change to your tabs is never left unsaved by mistake.
- The **Show** boxes in Tabs are switches.
- **Health:** the six cards are two rows of three, and free space is shown in GB.
- **Security:** a **Passkeys** card joins the others; the password card is simply "Password".
- Every section is the same width. On Colors, **Reset** sits next to Dark Mode / Light Mode.
- No backup reminder pops up over the Settings page itself (its menu already shows when Backup is due).
- Shorter help text on General, Appearance, Updates and Backup.

### Files

- **Grid view, new look:** larger tiles with **small previews of your pictures** (made in your browser, like the files themselves), the name and size below.
- The details panel shows the picture too.
- A picked file in the grid keeps its shape.

### On phones

- Files: the details sheet takes at most half the screen and scrolls inside, and the Transfers box moves above it. The page no longer gets wider than the screen.
- Settings: the tabs of a section (Overview, Password, Encryption, Passkeys...) wrap onto more lines instead of running off the right edge.

---

## 1.61.5

### New: Files looks like Drive

- A **menu on the left** (New, My Files, Recent, Shared Links, Starred, Trash, and how much you use), the list in the middle, and a **details panel on the right** with a preview tile, Download, Share, Star and the share link.
- **One click on a file only picks it.** It no longer downloads. Double-click opens a preview; a file with no preview says so. Download is its own button.
- **Starred** and **Recent** are new. A star is locked with the file's name, like everything else.
- **Undo** after Move to Trash. The empty page offers **Upload Your First File**.
- The usage line no longer shows your server's free space, only what Files uses and your limit.

### New look for Settings

- Every Settings window: section headings in the accent colour with a fading line, each section's rows in one rounded card, and a small coloured tile before each row.
- The main Settings page: coloured tiles and new icons in the left panel (all the status chips stay), and the same headings.
- A **shield with a keyhole** is the new key icon (login, encryption, passkeys).
- The first unlock for Files and Cards says "Lock Files and Cards" when your passphrase is already set.

### Everywhere

- A small **Saving... / Saved / Not saved** note at the bottom left whenever a page saves.
- **Undo** in the message after Move to Trash in Files.
- Empty **Links** and **Cards** pages offer a first step ("Add Your First Links", "Add Your First Card").
- **Tools:** a choice of two or three is now a row of buttons, and on/off options are switches. (Your saved-preset list stays a dropdown.)
- **Tasks Calendar Link:** **Add to Google Calendar** and **Add to Apple or Outlook** buttons.
- **Telegram:** **Send Today's Tasks Now** sends the daily list at once.
- Shorter text in the README and in the new Settings and Files screens.

### Please know

- Tools already shows Recently Used first on its home page.
- The website, the PDF guide and the screenshots still describe 1.60 and are refreshed next.

---

## 1.61.1

### Changed

- **Much shorter help texts** in the Settings windows of every page and in Settings itself: one short line under a name, no paragraphs.
- **Export Bookmarks moved** out of Links Settings into the bookmarks window, which is now **Import and Export** (the pencil menu says so too).
- **Files no longer shows your server's free space** (hosts differ and the figure can mislead). It shows only what Files uses and your own limit.
- **First unlock in Files and Cards:** if your passphrase is already set, the window now says so ("Lock Files and Cards") and asks for it once more with your website password. It is needed once because the new locked pages use their own key.
- **Backup:** *Choose What to Include* and *Pick Parts One by One* are now clear buttons.

### Fixed

- Firefox: the Settings windows did not get their new frame (title, close X, footer).
- Version names inside the code now say 1.61.0, not 1.61.

---

## 1.61.0

### Locked in your browser

- **One passphrase locks your private things.** The key is made in your browser, kept on your server only in a locked form, and never seen by the server. Set it (and the **recovery key**) in **Settings > Security**. If you forget the passphrase, the recovery key opens everything; without both, nobody can, not even you.
- **Cards** are locked with it. **Tools' saved presets** are locked with it. **Private tabs** in Links and Info are locked from the start: a new private tab is encrypted, and **Encrypt All Private Tabs** in each page's Settings locks the ones you already had. The server keeps no readable copy, not even in earlier versions.
- **Backups you download are always locked** once you have a passphrase.
- **Tasks stay readable** on your server, so Telegram reminders and the daily list keep working.

### New: Files

- A **Files** page for your own files: folders, search, preview, Trash, and a zip of a whole folder. **Every file is locked in your browser before it is sent.** The server holds only scrambled pieces and cannot read a name or a word.
- **Share links** (on by default; switch them off in Files Settings): anyone with the link opens one file without logging in. The key is in the link after the `#`, which no browser sends to a server. You choose when a link ends, and you can end it at once.
- A **5 GB limit** you can change (or set to 0 to be limited only by your host).
- Files are **not** part of a backup unless you switch **Files** on in Backup > Back Up (they can be big).

### New: Passkeys

- **Settings > Security > Passkeys:** log in with your fingerprint, face or phone's PIN instead of the password. A passkey needs no two-step code (it is already two things at once). Your password and two-step login still work. Add as many as you like and remove any with your password.

### New: Tasks calendar link

- **Tasks Settings > Calendar Link** (off until you turn it on): a secret link for Google, Apple or Outlook Calendar. Your tasks appear there with their repeats and reminders (never the notes). Anyone who has the link can see your task names, so **Make a New Link** ends the old one at once.

### New: Share from your phone

- Add the site to your phone's home screen. Then **Share** in any app lists it. Send a picture, a PDF or some text: you choose **Save to Files** (locked first), **Open in Tools** (the next tool that takes that kind of file gets it) or **Discard**. Nothing leaves the phone until you choose. (Works where the browser supports it, such as Chrome on Android.)

### New: Keyboard shortcuts

- **?** shows them. **G** then a letter goes to a page (**G H** Home, **G L** Links, **G T** Tasks ...); **E** starts editing the page you are on. They never run while you type.

### Settings, tidier

- **One Settings window** on every page: a title and a close X on top, a body that scrolls, and **Cancel** and **Save Settings** always in view. Every page calls its title **Page Title**.
- **Only Me** on every page except Tools: on, a visitor sees a log-in screen and nothing else. Cards, Tasks and Files are always only for you, so they show it locked on. (It replaces *Only Show Bookmarks After Logging In* in Links and *Private Page* in Info, and is new for Home.)
- **Buttons instead of dropdowns** for choices of two or three, and **switches** for on and off, on every page and in Settings.
- **Colors:** the *Same Look on Every Page* switch is gone (every site uses the shared colors; your saved colors still apply). One **Accent** row, and the page-by-page backgrounds and accents are folded into **Different Colors per Page**. 9 rows instead of 21.
- **Backup & Restore** has four tabs: **Back Up** (one big button; *Choose What to Include* is folded away, with *Pages* and *Site* switches; *Files* is off), **Restore** (with Earlier Versions), **Export** and **Start Over**. The old addresses still open the right tab.
- **Export Bookmarks** (Links Settings, and Backup > Export): the standard bookmark file that Chrome, Edge, Firefox and Safari import. Made in your browser; private tabs only if you ask.

### Safer inside

- Every PHP file runs in strict mode, and the analysis behind the tests is stricter (PHPStan level 5).
- The scripts that handle keys and locked data are type-checked in CI.
- CodeQL and Semgrep scan the code on every push, and every week.
- A new check measures every page on a slowed-down phone; a new accessibility check covers the new windows. A few low-contrast texts in the new windows were fixed because of it.

### Please know

- The calendar link and the saved share are not part of a backup: after a restore, make a new calendar link.
- Passkeys belong to a web address: if the site moves to another address, add them again.
- A site moved to a new folder or server keeps its passphrase, key and files by moving the whole site folder (`site-data` included), as before.

---

## 1.60.0

### New in Tools: 17 tools, two new sections

- **Calculators:** EMI Calculator (with the repayment schedule and a CSV), SIP and Lumpsum Calculator (with a yearly step-up), FD and RD Calculator, Percentage and Discount Calculator, Age and Date Calculator (working days too), Unit Converter (with Gaj, Cent and Guntha) and Number to Words (lakh and crore, or million and billion).
- **Documents:** Invoice Generator (your logo, items, a tax line or two halves such as CGST and SGST, the total in words, an A4 PDF), Text Compare, Markdown Editor, and a CSV, JSON and Excel Converter.
- **Utilities:** QR and Barcode Scanner (a photo or the camera), Barcode Generator, Time Zone Converter, Stopwatch and Timer, Random Picker, and Screen and Voice Recorder (the screen on a computer).
- Everything runs in your browser. The scanner's reader comes with the site; nothing is fetched from another website.

### Saved Presets

- **Save as Preset** in Sign PDF, both watermark tools, the QR Code Generator, the Image Resizer and the Invoice Generator: your signature, a watermark, a QR style, sizes or your business details, kept on your server under a name. Only while you are logged in.
- **Tools Settings > Presets** lists them to rename or delete. They are part of the site backup (**Tools Presets**).

### Changed

- **Tools' side menu:** a section's icon opens only that section; the page you are on is tinted in its colour.
- **Tabs on Top:** one tidy row of tabs, with Organise and Settings at the right, and no empty space below it.
- The Tools page may now use the camera, the microphone and screen sharing (for the scanner and the recorder). Your browser still asks first. Other pages allow none of them.
- Tools' PDF writer is now `@cantoo/pdf-lib`, the maintained copy of pdf-lib. Every PDF tool was tested again.
- **Updates:** the updater no longer installs or goes back to versions from before 1.50 (they used another folder layout). A site on 1.49 or older updates with its own updater first. Your pictures and config in the old places stay protected.

### For people who change the code

- Adding a tool: `python3 scripts/new-tool.py` writes its line in `tools.json` and a starter file; the list of tools is built from `tools.json`, and a test fails until the new tool has a check.

---

## 1.59.1

### Fixed

- **iPhone app:** the top bar slid under the clock and battery, so the menu and the other pages could not be reached. The bar now sits below them, and a strip in the bar's colour stays behind the clock while you scroll.

### Changed

- **Swipes change pages only.** On Links and Info a swipe no longer moves between tabs; it always goes to the next or previous page in the order of your bar.
- **Numbering:** versions 1.54 to 1.58 were skipped (1.53.8 was followed by 1.59.0). Nothing is missing.

### For the website

- **docs/FEATURES.md** lists every feature since the website was last refreshed (1.51): where it is, which screenshot to take, and which pages need new words.

---

## 1.59.0

### New

- **Swipe on your phone.** Swipe left or right to go to the next or previous page, in the order of your bar (Home, Links, Info, Cards, Tasks). On Links and Info a swipe first moves between tabs; past the last tab it goes to the next page. On Home, pull down from the top for the next background. Swipes are off while you edit, in a window, in a text field, and on a computer with a mouse.
- **New vivid presets** in Settings › Appearance › Presets: Ultraviolet, Cyber Lime, Magma, Tropic Night, Royal Blue, Berry Blast, Jungle Neon, Cobalt Flame (dark) and Sunburst, Flamingo, Aqua Pop, Lime Soda, Grape Soda, Tangerine (light). All easy to read.

### Changed

- **Fewer look-alike presets.** 39 presets that looked almost the same as another were removed, so each one left is a real choice. The default look, the high-contrast presets and the well-known editor themes stay. Colours you already chose are not changed.
- **Windows on every page** (Links, Info, Cards, Tasks) share one look for their corners, shadow and the dimmed page behind.
- **Messages** on Home and Links now appear in the same place and style as on the other pages.

### Keeping the project alive

- **Monthly maintenance on GitHub.** Once a month GitHub updates the libraries inside Tools (only to versions that promise not to break anything), rebuilds Tools, prepares the next version and its changelog, and opens a pull request. The owner merges it when the tests are green and publishes the release. Nothing changes on any site until you update it in Settings › Updates.
- **The next PHP version is tested early,** every week, so a break shows up months before hosts offer it.
- **MAINTAINING.md** explains, click by click, how to keep the project current without a programmer, and how to hand it over.
- **Tools:** the background-removal engine (onnxruntime) updated to 1.31.1.

### Tidier inside

- Code that existed in several copies now lives once: the settings rows, the message box, the server's answers, the early light or dark theme, the windows' look, and Home's way of saving files. Info's old per-page login token, no longer used since the one site login, is gone.

---

## 1.53.8

### Changed

- **A new login window.** It shows your site's logo and "Log In to" your site's name, has an eye button to show the password while you type, one wide Log In button, and says right under the field when a password is wrong.
- **Trust This Browser is no longer ticked by itself** (with two-step login, and when you approve a login in Telegram). Tick it when you want this browser remembered for 30 days.
- **Links:** a link's visit count now sits at the end of its row, so the numbers line up.
- **Links:** the same browser can count a link again after **30 seconds** (it was 30 minutes). Clicking again and again still adds only one.
- **Installed app icon:** on a phone (Android and iPhone) the app icon now fills the whole shape with the yellow logo, without a dark border around a small icon.
- **Cards Settings** looks like Links and Info Settings: Page, then Look with Text Sizes, Edit Bar and Column Order.
- **Cards: one Banks window,** like Holders. Every bank your cards use, with its name, the link it opens and its number of cards. Renaming a bank moves its cards with it. Banks has its own icon now (it was the same as Add Card).

### Fixed

- **Cards:** the name boxes in Holders showed a cut-off highlight while you typed. They now get a clean border.

---

## 1.53.6

### Fixed

- **No surprise login box.** Pressing the pencil right after a page opened could show the login box although you were logged in (seen on Info). The page now waits a moment for the server's answer and asks for a login only if you are really logged out. This also covers the gear and other buttons.
- **Cards:** the pencil menu no longer shows a line between Edit This Page and Cards Settings.

### Changed

- **Cards: one Holders window.** Add Holder and Edit Holders are now one button, **Holders**. It lists every holder with their number of cards. Rename one in place, delete one that has no cards, or add a new one at the bottom. Save keeps the changes; Cancel drops them.
- **Links and Info Settings:** a **Look** section with Text Sizes (a small Change button) and Edit Bar, each with a line of help. Info's fields are a softer grey instead of black.
- **Tasks Settings:** three sections (General, When the Page Opens, Look), Edit Bar in Look, a short help line under a field, and softer fields.

---

## 1.53.5

### Changed

- **The pencil is simpler.** On Links, Info, Cards and Tasks it now has two items: Edit This Page and the page's Settings. Everything else moved to the edit bar.
- **One edit bar on every page.** While you edit, the page's tools sit in one bar at the bottom, the same as Home's: Links (Colors, Fetch Icons, Import Bookmarks), Info (Export), Cards (Add Card, Add Holder, Edit Holders, Edit Banks, Export) and Tasks (Add Task, Export), then the page's Settings and the round Done button.
- **Cards and Tasks:** Edit This Page shows the edit bar. Done hides it again.
- **Settings:** the pencil is gone from the Settings page, where there was nothing to edit.

### New

- **Edit Bar** in each page's Settings (Home, Links, Info, Cards, Tasks): Icons Only (the name shows when you point at an icon) or Icons and Text. Phones always show icons.

---

## 1.53.2

### Tidier

- **Encrypted tabs:** Links, Info and Settings each carried their own copy of the encryption code. They now share one. Tabs you encrypted before open exactly as they did; a new test opens tabs made by the old code to prove it.
- **Reaching other websites:** Home (background pictures) and Links (icons and titles) each had their own code for this. They now share one, with the same checks: public internet only, every redirect checked, size limits kept.

### Safer

- **Links:** when a website's https certificate cannot be checked, an icon or title is fetched once more without checking it (some hosts ship no certificate list). That second try is now never made for an address that carries a key or token.

---

## 1.53.1

### Fixed

- **Home:** with no site logo, the icon you get when adding Home to an iPhone's home screen was the small 64 px tab icon. It is the sharp 180 px icon again.
- **Settings:** "webwebsite password" now reads "website password" (three places).
- **Links:** when you encrypt a tab, its links' visit counts are removed at once, so their addresses never stay readable on the server.

### Faster

- **Settings opens lighter.** After an update, What's New on the Overview now loads only the new version's notes (about 1.5 KB instead of 150 KB); the full Changelog loads when you open it. Opening Settings also asked for the Overview twice at once; now once.

### Safer

- **Home:** the background's "it was shown" call accepts only the page's own request, so another website cannot send it from a visitor's browser.
- Checked: every action that changes anything needs your login and the security token; pages escape everything they show; the login cookie is protected; no known problem in any bundled library.

### Under the hood

- Unused code removed from Cards, Home, Info, Links, Settings, the bar and three Tools.
- Stricter automatic checks, so dead code and some mistakes are caught before a release.

---

## 1.53.0

### Links

- **Visit counts.** Every link shows how often it was opened, as a small number next to its name. Clicks by anyone who opens your Links count; only you see the numbers.
- **Links Settings > Show Visit Counts** is on at first. Turned off, it only hides the numbers: the clicks are still counted, so they are all there when you turn it back on.
- One browser counts once per link every 30 minutes, so nobody can push a number up by clicking again and again. Only your own links can be counted.
- A link keeps its count when you move it; a link whose address you change starts again from 0. Links in encrypted tabs are never counted, and visitors never count the links of private tabs.
- A backup of the whole of Links includes the counts.

### Home

- **The refresh button no longer feels stuck.** The next background (and a video's still picture) is fetched soon after one appears, so a press usually swaps at once. If the next one is still on its way, the press waits for it instead of starting a new download, and pressing again does not start over. The picture dims a little at once so you see the press took. If nothing arrives, it tries two others and the button is free again within about 18 seconds.
- **The characters are gone again.** They did not fit the clean dashboard look. Their files are removed when you update; Go Back to 1.52 brings them back.
- Home's old copy of its links (moved to Links in 1.51) is removed. A site that updates straight from 1.50 still gets its links moved to Links first.

---

## 1.52.0

### Home: Characters

- **Little 3D characters live on Home.** 22 of them, from the free Kenney and Quaternius packs: people, pets, pirates, monsters, blobs and a flyer. 1 to 5 are on the screen at once (2 at first), a new mix each time Home opens.
- **Everyday life:** they walk about, climb onto the clock and the dock and sit there, nap, wave at each other, have a snack, peek off the edge of the screen and look at your mouse. Click one and it reacts.
- **Activities every few minutes:** Boxing Match, Basketball, Marathon, Pool Day, Sauna, Dance Party, Picnic, Sword Duel, Yoga, Weightlifting, Skateboarding, Rock Concert, Football, Tug of War, Campfire, Snowball Fight, Fishing, Karate, Birthday Party and Treasure Hunt, with props, comic words and anime effects. Characters who are not on the screen walk in as guests when an activity needs more players.
- **Power Beam:** the page darkens, two characters rise with flaming auras, and their beams meet in the middle of the screen in a big clash. It can be turned off.
- **Home Settings > Characters** (the person icon while editing): Show Characters, How Many at Once, Lively or Calm (an activity every 2 to 4 or every 5 to 9 minutes), Power Beam, who can appear, and Play Now to try any activity.
- Everyone who opens Home sees them, like the background. Your browser draws them from files on your own server; nothing is asked from another site. Turned off, nothing extra is loaded.
- If the device asks for less motion, they stand still. In a browser without 3D support, there are none.
- The update is about 3 MB bigger (three.js and the models).

---

## 1.51.3

### Home

- **Fixed:** in Glance and Expand, an open widget (Quote of the Day, Weather and others) lay on top of the cards, and neither could be read. It now opens just above the cards, or above the dock, and scrolls inside when space is short. The clock steps aside when there is not room for both.
- The open widget is frosted more than the cards, so nothing behind it shows through its text.

---

## 1.51.2

### Home

- **Fixed: dark widgets.** With Windows' Transparency effects turned off (or "reduce transparency" on a Mac or phone), every widget became a solid dark block and Opacity and Blur did nothing; only pointing at one showed the glass. Now the glass looks the same everywhere.
- **Home Settings > Glass > Tint:** Light (see-through, the default), Dark, or Solid (not see-through, easiest to read on busy photos).
- The glass brightens under the pointer with every tint, and the text has a soft shadow so it reads on bright photos.

---

## 1.51.1

### Home

- **Lighter glass.** The widgets are lighter, closer to how they were shown before 1.51. They now brighten under the pointer instead of darkening. An open card and the Quick Add box show a soft white edge when selected.
- **Editing Home** shows one row of icons at the bottom, like the bar's dock: Background, Widgets, Home Settings and Done. Log Out is in the site menu.
- **Widgets have their own window** (the four squares while editing), with a new **Show Widgets** switch that hides them all.
- **Home Settings** now has **Show the Bar on the Home Page**, the same setting as in Settings > Appearance, which now uses this name too.
- The corner menu offers Edit This Page and Home Settings for Home; Background and Widgets are in the row of icons while editing.

---

## 1.51.0

### Home: a Clock and Widgets

- **Everyone sees a clock** with the date and a greeting (Home Settings > Widgets > Show the Clock).
- **While you are logged in, Home shows widgets** in frosted glass: Today (with Quick Add, and a tick to mark a task done), Countdown, Pinned Note (one box from Info), Recent Tools, Month Calendar, Scratch Pad, Quote of the Day, World Clock and Weather.
- **Two styles** in Home Settings > Widgets: Glass Dock (chips under the clock and a dock that opens each widget) or Glance and Expand (small cards along the bottom). Choose which widgets show and their order there, along with the countdown, the note, the World Clock places and your town.
- **Visitors see the clock only.** Your widgets and their data are never sent to them.
- **Weather is off at first.** Once you turn it on and type your town, your server asks Open-Meteo for the forecast, at most every 30 minutes. Nothing else on Home contacts another site.
- The Glass slider (opacity and blur) in Home Settings now sets the look of the widgets.

### Home's Links Moved to Links

- **Home no longer has its own list of links.** The first time Home opens after the update, its links are copied into Links, in a category called **From Home** at the top of your first tab that is not encrypted. Links keeps an earlier version first, and a link already in that tab is not added twice.
- Home keeps its old list for one more version, in case you go back.
- **Backup** now includes the Scratch Pad with Home, and its summary of Home no longer shows a link count (it always said 0).

### Privacy

- **Links: Icons from Google** is a new setting in Links Settings, off at first. Before, your browser asked Google's favicon service for the icon of every link without a saved icon, so Google saw which sites are in your Links. Now those links show their first letter until you turn the setting on, or use **Fetch Icons** to save the icons on your server.
- Home no longer loads any picture from another site.

### Fixed

- **Tools** now really ships fflate 0.8.3 (1.49 and 1.50 still carried 0.7.5), plus pdf.js's character maps and standard fonts, so PDFs in Chinese, Japanese and Korean, and PDFs that name a font without carrying it, open correctly.

### For developers

- Tasks has two small actions for Home: `quick_add` (plain words, read like Telegram's /add, which now uses the same code) and `done`.
- Tools' build writes `assets/tools-list.json` (tool ids and names) for Home's Recent Tools.
- CI: one browser job per engine, a single `ci-ok` check, the release waits for CI, docs-only pushes skip the slow jobs, zizmor checks the workflows, and `build-tools.py --check` proves Tools matches its source. The browser tests wait for results instead of fixed pauses.
- `scripts/screenshots.py` also takes Home's pictures.

---

## 1.50.0

### A Tidier Folder Layout

- **Update to 1.49.0 first.** A site on 1.48 or older refuses this update (nothing changes); install 1.49.0, then this one.
- The site's own engine moved from `web/core-data` to `web/hub/core`, your pictures and logo to `web/hub/media`, and the README, changelog and licences to `web/hub/docs`. Your pictures and settings move by themselves on the first page you open after the update, and move back if you Go Back.
- **Your cron job needs the new address.** If you run the schedule from your hosting panel, change `web/core-data/cron.php` to `web/hub/core/cron.php` (the exact line is in Settings > Telegram > Run It on a Schedule). Until then the reminders still go out while the site is open.
- **Instant replies on Telegram** tell Telegram the new address by themselves, the next time reminders run.
- The old `web/core-data` folder is removed once it is empty.

### Fixed

- **Unzipping an update by hand** (for a first install) now gives the empty picture folders normal permissions; before, the web server could not open them until you changed them.

### For developers

- `HUB_MEDIA` and `HUB_DOCS` in `boot.php` name the pictures and documents folders; `tests/lib/helpers.py` reads either layout.

---

## 1.49.0

### Getting Ready for 1.50

- **Install this update before 1.50.** Version 1.50 moves the site's own engine to a tidier place (`web/hub/core`, your pictures to `web/hub/media`, the documents to `web/hub/docs`). The updater in 1.48 and older cannot take that step; this one can, in either direction, so Go Back keeps working. A 1.48 site that tries 1.50 directly simply refuses it, and nothing changes.
- Nothing you see changes in this version.

### Changed

- **The Starter theme has no videos after all.** The 1.48.9 notes said two short videos would come in the next update; they were dropped to keep updates small. The three Starter photos stay.
- **Import Bookmarks** removes pictures and event handlers from a bookmarks file before reading it (bookmark exports never contain them).
- **Tools:** its ZIP library is updated (fflate 0.8.3).
- **Every update now carries the licences of the bundled libraries** (`THIRD-PARTY.md`, beside the README and changelog).

### For developers

- The build scripts moved from `tools/` to `scripts/`; `phpstan.neon` moved to `tests/repo/`.
- `tests/` is grouped into `unit/`, `browser/`, `server/`, `repo/`, `fixtures/` and `lib/`; CI runs a server job and a browser job, and reports visual changes since the last release.
- `tests/unit/layout_test.php` covers both folder layouts and moving your pictures between them.

---

## 1.48.9

### Home

- **Themes.** Background › Theme chooses the set of backgrounds Home takes turns with:
  - **Starter** comes with the app: three photos from Unsplash. New sites start with it. Its two videos (Black Hole and Luminous Glowing Fluid) arrive in the next update, because sites before this one do not accept video files in an update. **Remove** hides Starter; **Bring Back Starter** shows it again.
  - **Online Photos** is how Home worked before (Picsum, Bing, Wikimedia, Wallhaven and your other sources). Sites that already exist keep it.
  - **Your own themes:** **Make a Theme** from your uploads, give it a name, and **Use** it. **Export** saves it as one file with its pictures and videos; **Import** adds it on another Homebase Hub site.
  - While Starter or your own theme is in use, nothing is downloaded from other sites.
- **No repeats.** Each browser remembers the last 30 backgrounds it showed, and one comes back only after the others have had their turn. Before, only the last picture was avoided.
- **Welcome Text** (Home Settings › Page): words that fade in the middle of the screen when Home opens, once per visit, then slowly fade away while the links appear. It starts as "Welcome Home"; leave it empty for none.
- **Videos** start on a still picture, so the screen is never black, and keep it where the video cannot play (older browsers, data saver, Reduce Motion). Background videos pause while the tab is hidden.
- **Page Settings is now Home Settings**, like the other pages.

### Updates

- The updater accepts video files (`.mp4`) in an update, so the next update can bring the Starter videos.

---

## 1.48.5

### Cards

- **A cleaner table, or your cards grouped by holder.** **Table** (the default) shows every card with a Holder column. **By Holder** gives each person a section with their number of cards, total limit and yearly charges; click a heading to fold it, and it stays folded.
- **Four bold colour boxes at the top:** Cards (credit and debit), Lifetime Free (how many of your cards, plus FD and Paid), Charges a Year, and Expiring Soon (red once a card has expired). They follow the search and filters.
- **Six columns instead of eleven:** the card with its bank and remark under it, Limit, Charges, Expiry and Details (network, variant and base as small labels). On a phone each card takes two lines.
- **Colour now means something:** a yearly fee and a card that expires within 3 months are amber; an expired card is red.
- **Filters:** a search box, **All Cards** and a button for each holder, and **More Filters** for bank, network and type. **Clear** shows only when a filter is on.
- Click anywhere on a card's row to edit it, or use the pencil at the end of the row.
- **The pencil menu is simpler:** Add Card, Add Holder, Edit Holders, Edit Banks, Export and Cards Settings. **Column Order** (for Excel and PDF) is inside Cards Settings.

### Settings

- **The menu groups are now Web Setting** (General, Appearance), **Data Setting** (Security, Telegram, Backup & Restore) and **System Setting** (Health, Updates, Changelog).
- **Navigation Style** (Top Bar, Sidebar or Bottom Dock) and **Show the Bar on the Start Page** moved to Appearance > Look.
- General has Basics and **Tabs** (rename, reorder or hide the pages in the bar). The Pages tab was removed; links to it open Tabs.

### Pencil Menus

- **Links:** Edit This Page, Colors, Fetch Icons, then Import Bookmarks and Links Settings.
- **Page Settings is renamed** Links Settings, Info Settings, Tasks Settings and Cards Settings, and each settings window has the same name.

---

## 1.48.2

### Changed

- **The Settings menu is back to how it was before 1.48:** Site (General, Appearance), Protection & Data (Security, Telegram, Backup & Restore), then System (Updates, Health, Changelog). General has Basics, Navigation (where you choose Top Bar, Sidebar or Bottom Dock) and Pages; Appearance has Look, Presets and Colors, and Look shows the Font, Theme, Accent Color and Same Look on Every Page. Links to the System section of 1.48 open Updates.
- **The Backup icon and the gear are back** in every bar style, in place of the round menu: Backup is green, red with a dot while a backup is due, and the gear opens the Settings page.
- **The theme button shows a sun in dark mode and a moon in light mode,** in the app and on the website.
- **A new site starts with a softer look:** a deep grey instead of pure black, warm off-white in light mode, and a lighter gold accent. Existing sites keep their colors.
- Light mode: the green "good" labels and the Images teal and Photos blue in Tools are a little darker, so they stay easy to read.

### Fix

- **The cards in Settings > Security and Telegram look right again.** Since 1.48.0 they were squashed, with their icons above the card.
- **Tools shows your logo in the browser tab** like every other page (it showed a blank globe since 1.47.0).
---

## 1.48.1

### Fix

- **The cards in Settings > Security and Telegram look right again.** Since 1.48.0 they were squashed, with their icons above the card, because the new phone menu of the Bottom Dock shared their style.

---

## 1.48.0

### The Bar

- Three styles, each with its own layout (Settings > Look > Navigation Style).
- Top Bar: slides away while you scroll down and comes back as soon as you scroll up, press / or reach the top of the page.
- Sidebar: now a slim rail with icons and small labels. On a phone, a floating button (or a swipe from the left edge) opens it as a panel.
- Bottom Dock: one floating pill instead of two rows; the current page shows its name. On a phone, the round button beside it opens search, Edit, the theme, Backup and Settings.
- A round menu holds Settings, Backup and Log Out. A red dot on it means a backup is due (it replaces the Backup and gear icons).
- The current page's highlight glides to the next page when you move between pages (Chrome, Edge and Safari).

### Settings

- Fewer sections: Updates, Health and Changelog are now one System section with tabs. Old links still open the right place.
- Look shows Theme, Accent Color and Navigation Style. Font, Same Look on Every Page, Presets (all 166) and Colors are under More Options.
- General > Pages is gone (the pencil in the bar does the same). Install on Your Phone shows its steps under "How?".
- A new site starts with your browser's time zone and a theme that follows your device. Existing sites keep their settings.

### Search and Pages

- Search chooses where to look and one tab; names, web addresses and note text are always searched.
- Text Sizes for Links, Info and Cards is now inside each page's Page Settings.

### Website

- Pages fade into each other (Chrome, Edge and Safari) and the header hides while you scroll down.

### For developers

- `tests/nav_test.py` (56 checks) covers the three bar styles on a computer and a phone, in Chromium, Firefox and WebKit; `tests/unit/nav_settings_test.php` covers the new-site defaults. The settings, app, pages, accessibility and website tests check the rest.

---

## 1.47.1

### Fix

- **Send Backup Now no longer sticks on "Sending…".** On a big site the backup takes longer than the 30 seconds the page waits for an answer, so the file reached Telegram but the button never came back. The page now waits up to 4 minutes, the site finishes and remembers the backup even if the page stopped waiting, and if no answer does come the button is freed with a note that the backup may still arrive in Telegram.

### Changed

- **Tools has its colours back.** Images are teal, Photos blue, PDF red and Utilities purple, in the side menu (with the number of tools in each and, inside a section, its tools listed underneath), on the cards (with a Popular badge, small file-type labels and an arrow), on each tool's title and buttons, and in a new breadcrumb and a More Tools row. Organise and Settings sit at the bottom of the side menu with a button to collapse it. The search box has one clean border.
- **Home: Your Uploads accepts files up to 128 MB** (it was 40 MB).
- **Settings > Updates: Update From GitHub** now has a link to the project on GitHub.
- **A cleaner site.** `web/tools/config.json`, written for the old Tools and read by nothing, is no longer made, and the first request after this update removes it.

### For developers

- The updater now accepts `.bcmap` and `.pfb` files, so a later release can ship pdf.js's character maps and fonts (this release contains none, because older sites would refuse them).
- `tests/settings_test.py` (9 checks) covers the backup button, the GitHub link, the upload limit and the clean-up.

---

## 1.47.0

### New: Tools, rebuilt

Tools was made with a separate project whose source was lost, so every fix had to be made by hand in minified code and its libraries could not be updated. It is now rebuilt from scratch, with its source in the project (`tools-app/`).

- **All 36 tools, at the same addresses.** Links like `web/tools/#/tool/image-resize` still work, and your **favourites and recently used tools carry over**. The layout, your own order and hidden tools start fresh: set them again in Tools > Organise and Tools > Settings.
- **One look with the site.** Tools follows the site's light or dark mode and your colours from Settings > Appearance. Its home has search, popular tools, recently used tools and favourites; the sections show as a side menu (which can collapse to icons) or as tabs.
- **Newer engines.** Background removal runs on ONNX Runtime 1.30 (was 1.17.3), and reading text from scans and photos on Tesseract 7. Heavy engines still load only when a tool needs them.
- **Better tools.** Images can be saved as AVIF; the compressor never hands back a bigger file in the same format; Photo Metadata warns when a photo shows where it was taken; Protect or Unlock says plainly when a password is wrong; the collage takes 2 to 50 photos in 21 layouts and saves as a PDF too; Sign and Fill and Annotate show the page larger.
- **Safer page.** The Tools page no longer needs an inline script, so its security policy allows none.

### Changed

- **Tools Settings** now holds the layout and the reset buttons. Light and dark, and colours, come from the site's own Settings.

### For developers

- Tools is built with `python3 tools/build-tools.py --install`; never edit `web/tools/assets` by hand. Its libraries are pinned in `tools-app/package-lock.json` and watched by Dependabot. `tests/tools_test.py` now checks all 36 tools with real files (76 checks).
- `tools/build.py` refuses to make a zip with a file type the site updater does not accept, so no release can be one that older sites refuse.

---

## 1.46.0

### New: Install on Your Phone

- **Your site as an app.** Add it to the home screen of a phone or computer and it opens like an app: its own icon, its own name, no browser bars. iPhone: Safari, Share, Add to Home Screen. Android: Chrome's menu, Install App. Computer: the install icon in Chrome's or Edge's address bar. The steps are in **Settings › General › Install on Your Phone**, which also shows an **Install** button when your browser offers one.
- **Shortcuts.** Press and hold the icon for Links, Info, Cards, Tasks and Tools, with the names and order of your bar (hidden pages are left out).
- **Nothing kept offline.** Your pages and data always come from your server, as before. Works in a sub-folder too.

### Fix

- **Settings shows each description once.** In Settings, the line under each heading was also repeated below its box. It now appears only inside the box.

---

## 1.45.0

### New: Import Bookmarks

- **Bring your bookmarks from any browser.** In Links, the pencil menu has **Import Bookmarks**. Export your bookmarks from Chrome, Edge, Firefox, Brave, Opera or Safari (each saves an .html file), pick the file, and see a preview first: how many links, which folder becomes which category, how many are already in Links, and what will be left out.
- **Where they go.** Into a new tab (you can make it private) or into one of your tabs. Folders become categories, and a folder inside a folder becomes "Folder / Subfolder". Links already in that tab are not added twice. Encrypted tabs are never written to.
- **Safe with any file.** The file is read in your browser and never uploaded; only the links are saved. Addresses that are not web links (such as javascript: or file:) are left out, and titles are kept as plain text. Up to 5,000 links and 5 MB at a time.
- **Easy to undo.** Links keeps a copy from just before the import, in Settings › Backup & Restore › Earlier Versions. Choose **Fetch Icons** afterwards to save the new links' icons.

### Fix

- **Readable buttons in light mode.** The main button in Links' dialogs (Save, Import and the rest) had white text on a gold that was slightly too light to read well. A deeper gold now meets the accessibility standard.

---

## 1.44.2

### Fixes

- **PDF to Text works in Safari.** Since 1.43.0, PDF to Text failed in Safari and other browsers built on WebKit: the PDF reader used a way of reading text those browsers do not have. Tools now adds it where it is missing.
- **Earlier Versions no longer loses the version you pick.** Restoring a version made in the same second as the restore (for example, undoing a restore straight away) could overwrite that version first. A kept copy now always gets a name of its own; Links' own backups do the same.
- **Updates: no stale "ready to apply".** If a checked update was waiting and you then uploaded a zip that was refused, Settings still showed the first update as ready, and Apply failed with a server error. The waiting update is now cleared, and Apply or Go Back with nothing ready says so plainly.

### Behind the scenes

- **Stricter upload pieces.** An update upload now refuses piece numbers that are not plain whole numbers.
- **More tests, more browsers.** New tests cover backup and restore, two-step login, Start Over, the login lockout and the security token on every action (`tests/core_test.py`), and 65 kinds of damaged or hostile update zips (`tests/update_attack_test.py`). The page and Tools tests now also run in Firefox and WebKit, which is how the Safari problem was found.
- **Upkeep.** A weekly security check of the bundled libraries, a yearly reminder to check PHP's support dates, `tools/release.py` for the version bump, ESLint, and a security policy (SECURITY.md).

---

## 1.44.1

### Easier to read

- **New padlocks.** Private tabs now show a gold padlock and encrypted tabs a green padlock with a tick, drawn as sharp vector pictures that look the same on every screen, in Info and Links. The old picture files are gone.
- **Health checks line up.** In Settings, the Site Checks and Server Check rows now have proper spacing, with the tick or warning circle inside the card instead of touching its edge.
- **Tools start box.** The "What do you want to do?" box at the top of Tools is smaller, so the tools show sooner.

### Fix

- **Server Check no longer warns about the favicon service.** Google's favicon service answers "404" for the test site it has no icon for. That means the service was reached, so it now counts as a pass.

---

## 1.44.0

### Telegram: Snooze

- A Due Now message in Telegram now has **1 Hour**, **3 Hours** and **Tomorrow** buttons next to Done and Skip. Tap one and the reminder waits.
- Send `/snooze Netflix 2h` to do the same from the chat. You can write `30m`, `2h`, `1d` or `tomorrow`; with no time it is one hour. Settings > Telegram lists the new command.
- A snoozed task stays out of the daily digest. When a snooze of an hour or three ends, the Due Now message of a task that has a time comes once more. A task snoozed until tomorrow comes back in the morning digest.
- Snoozing never changes the task or its due date. It only holds back the messages.

### Smaller and tidier

- The update zip no longer carries a second copy of the changelog for sites older than 1.39.0. **Nothing to do:** the first update to this version removes the leftover copy by itself.
- Setting up two-step login no longer relies on a variable PHP could not prove was set. It behaved correctly before; the code is now easier to check.
- Behind the scenes: PHP unit tests for the new Snooze, task parsing, repeat dates, update file names and backup encryption; a static code check (PHPStan); build tools are pinned with a lock file.

---

## 1.43.1

### Tools loads its code once

- The Tools page loaded its main file under two addresses, so the browser ran two copies of React. Every tool hit an error on its first try and then recovered, leaving "Minified React error #321" in the browser console. An import map on the page now tells the browser both addresses are the same file. Tools works as before, without the error.

### Pages open faster from the bar

- Hover over a page in the bar, or start to tap it, and the browser prepares that page in the background, so it opens almost at once. Your site already asked for this, but every page's security policy blocked it, so it never worked. The pages now name a small rules file instead (`web/core-data/assets/speculation-rules.json`), which the security policy allows.
- Browsers that do not support it ignore it, and a browser can skip it, for example to save data or battery.

### Checked on a real Apache server

- The site's `.htaccess` files (security policies, private folders) were tested on Apache for the first time: every page answers with its policy, and `site-data`, `web/docs`, `config.php` and the file list are refused. This test now runs on every change.
- A page's own security policy no longer includes `frame-ancestors`, which browsers ignore there (the server's policy still sends it).

---

## 1.43.0

### Tools: a newer, safer PDF reader

- The PDF tools now use **pdf.js 6.4.299**, the newest version, instead of 3.11.174. Older versions have known problems where a specially made PDF could run script; this version has no known problem. PDFs are opened with scripting turned off.
- Every PDF tool was checked with real files: PDF to Images, Compress, Merge, PDF to Text, and the page previews in Organize, Split, Sign, Annotate, Watermark and Protect.
- pdf.js 6 needs separate decoders for JPEG 2000 and JBIG2 pictures and for colour profiles; they are included and load only when a PDF needs them.

### Cards: Excel export without an outside library

- **Export Excel** now writes the spreadsheet itself instead of loading an 880 KB library (SheetJS) whose last free version has known problems. The file has the same columns, widths, ₹ amounts and totals, a bold header, and the Information sheet when you have notes. It is the standard .xlsx format; it was checked in LibreOffice.

### Easier to read

- Every page was checked with an accessibility tester (WCAG 2.1 AA), in dark and light mode, and every problem it found is fixed:
- In **light mode**, gold and the Tools section colours used as text are now a darker shade of the same colour, so they are easy to read on a light background. Buttons and highlights keep the bright colour.
- Small grey text (notes, the group names in the Settings menu) is a little brighter in dark mode and a little darker in light mode.
- The Settings menu is announced as a list of sections, the Tasks calendar days read what they show, and a hover box in Links no longer confuses screen readers.

### Behind the scenes

- Every change is now tested automatically: the update tests, every page and every tool in a real browser, the accessibility check and the library check. The tools these checks use are pinned to exact versions.
- `AGENTS.md` explains the rules and the release steps for anyone changing the code.

---

## 1.42.0

### Tools: Favicon

- **Get from a Website** now offers **512 × 512** next to 16, 32, 64, 128 and 256. Google's icon service gives at most 256 × 256, so the 512 picture is enlarged from that, and the page says so.
- **Downloads save right there.** Before, a download opened the icon in a new tab and asked you to right-click and save it, because Google's service does not let a web page save its pictures. Now your own site fetches the icon and the browser saves it as a file, like `example.com-favicon-512.png`.
- Only the website name is sent to Google, as before, now through your site. The icon address is open to visitors but limited to 60 icons per visitor per 10 minutes, accepts only real website names and the sizes listed, and only ever returns a PNG.
- If your hosting cannot reach other websites, the tool says so instead of opening a new tab. Settings > Health > Server Check shows whether it can.

### Tools files are now checked on every build

- A short fingerprint of the Tools files decides when your browser throws away its saved copy of them. A new script, `tools/tools-rev.py`, makes it, and the build refuses to run when it is out of date, so a changed Tools file can never be served from an old saved copy.

---

## 1.41.0

### Padlocks you can tell apart

- A **gold padlock** now marks a **private** tab (only shown when you are logged in), and a **green padlock with a tick** marks an **encrypted** tab. Before, both looked alike in Links, and both were thin outlines.
- The same pictures are used on the "Encrypted Tab" unlock card and on the bar that says "Encrypted tab, unlocked on this device until you log out or lock it", in Info and in Links.
- The tab's tooltip says which kind it is.

---

## 1.40.0

### PHP 8.3 or newer

- Homebase Hub now needs **PHP 8.3 or newer**. PHP 8.1 stopped getting security fixes on 31 December 2025, and 8.2 stops on 31 December 2026.
- An update that needs a newer PHP than your server has is **refused with a clear message, and nothing changes**. This covers updates from GitHub and uploaded zips. If your host runs an older PHP, choose 8.3 or newer in your hosting panel (in cPanel: MultiPHP Manager) and try again.
- **Settings > Overview** now tells you when the PHP your site runs on has stopped getting security fixes, or will within about six months, and what to ask your host for.
- Settings > Health > Server Check shows the same notice next to the PHP version.
- The site does not stop working on an older PHP; it only warns, and refuses updates it cannot support.

### Checked the bundled libraries

- The PDF reader in Tools (pdf.js 3.11.174) and the Excel writer in Cards (SheetJS 0.18.5) have known problems that need a crafted file to be opened or read. Tools already opens PDFs the safe way, and the site never reads Excel files, so neither can be reached. Both facts are now checked automatically before every release. The details are in `THIRD-PARTY.md`.
- Nothing else bundled has a known advisory.

---

## 1.39.0

### The logo

- Homebase Hub now has its own logo: a gold house. It is the logo in the bar and the tab icon on every page until you choose your own in Settings > General. Your own logo still replaces it everywhere.

### The docs moved

- `README.txt`, `CHANGELOG.md` and the readable source of every minified script and style moved from `web/core-data/docs` to `web/docs`. They are still closed to browsers.
- For this one version a copy of the changelog also stays at the old place, so a site on an older version can show "What Is in This Update" before it updates. It will be removed in a later version.

---

## 1.38.0

### Homebase Hub is now a public project

- The site is published as **Homebase Hub** on GitHub (https://github.com/Jackpison/Homebase-Hub) under the **GPL-3.0** licence. Every file the project wrote carries a short licence notice; bundled libraries keep their own licences (see `THIRD-PARTY.md` in the repository).
- New installs are named **Homebase Hub** instead of "My Site". An existing site keeps the name it has.

### Updates: from GitHub, and still by uploading a zip

- **Settings > Updates > Update From GitHub.** **Check Now** looks for a newer version. When there is one, **Download and Check Version X** downloads the release zip, compares its size and SHA-256 with the list GitHub publishes, and then runs exactly the same checks an uploaded zip gets. Nothing on your site changes until you read the changes and type your website password; applying is the same as before (snapshot, swap, self-check, automatic rollback).
- **Check GitHub Once a Day** is **off by default**. While it is off the site makes no request to GitHub unless you press Check Now. When it is on, the check runs with the Telegram schedule (the cron job), and Overview shows "Version X is available on GitHub".
- The check reads a small `latest.json` on the project's GitHub Pages address first; GitHub's own API is only a fallback, asked at most once a day. If GitHub cannot be reached the site says "Couldn't check" and keeps working.
- Only github.com, api.github.com, the project's Pages address and githubusercontent.com are ever contacted, over HTTPS, and every redirect is checked again. The zip must be this project's own release file for that very version; a zip whose version differs from what GitHub lists is refused.
- The checksum catches damaged or partial downloads. It comes from the same GitHub account as the zip, so it does not prove a release is genuine; that is why nothing installs by itself and you see the changelog and file list first.
- **Server Check** also tests that your host can reach GitHub.
- Uploading a zip works exactly as before.
- The project website and a PDF guide (every page and every setting, with screenshots) are built from the repository and published on GitHub Pages; they are not part of the update zip.

---

## 1.37.0

### Info: as many boxes as you need, in any size and shape

- **Add Box:** in edit mode every tab ends with a dashed **+ Add Box** tile. A tab can hold up to **12 boxes**, and a new box opens ready to type in. Tabs still start with two boxes.
- **Box Settings** (the small sliders button next to Edit on each box):
  - **Width:** Auto, One Third, Half, Two Thirds or Full. Boxes sit in a 12-column grid, so a third and two thirds share a row, three thirds make a row of three, and so on.
  - **Height:** Auto, Short, Tall or Extra Tall.
  - **Move Earlier / Move Later** to change the order, and **Delete Box** (a box with text asks a second time; the last box in a tab cannot be deleted).
  - Auto width is half the page in Notebook Cards and the full page in Document. In **Document** the sizes make the page: for example a full-width section, then two half-width sections side by side.
- On a phone every box is full width, whatever its size.
- **Safe with other devices:** every box now has its own id, so a page that has not been refreshed still saves into the box it is showing, even after you reordered the boxes on another device. A page that is out of date cannot add, remove or reorder boxes: it says so and shows the latest version.
- Boxes work in **encrypted tabs** too: a new box is stored encrypted, resizing and moving keep the encrypted text as it is, and **Remove Encryption** in Settings now decrypts every box in a tab, in order, with its size (it used to expect exactly two). Backups and restores keep the boxes, their order and sizes, and earlier versions restore them too. Export (text and PDF), search and the outline all handle any number of boxes.

### Layouts: Classic is gone

- **Notebook Cards is the default and the only card look**; **Document** is the other choice. The Classic layout is removed, and a tab that was Classic now shows as Notebook Cards (nothing is lost; the boxes are the same two, now as cards you can resize).
- In Edit Tab the choices are **Notebook Cards** (now described as "Cards you can size and arrange. The default.") and **Document**. New tabs are Notebook Cards.
- Old styles that only the Classic layout used were removed.

---

## 1.36.0

### Faster: Home (the design is unchanged)

Measured on real Apache with the minified files, throttled to a mid-range phone on slow 4G, with a background photo: **329 KB became 197 KB (40% less), the page finishes loading about a third sooner (2.2 s to 1.4 s), and the first paint is a little earlier.**

- **Phone-shaped background photos.** A phone held upright shows only the middle slice of a landscape photo, but used to download all of it. Each new background photo now also gets a center-cropped 3:4 copy (`name-p.jpg`). Portrait screens load that copy (86 KB instead of 221 KB in the test) and look the same as before: compared pixel for pixel, the difference was invisible. Landscape screens and desktops still get the full photo, and turning the phone swaps the file. The copy is deleted with its photo. Photos saved before this version have no copy and rotate out after a few views.
- **The Settings styles are a file of their own.** 68% of `shell.css` only styled the Settings page, yet every page downloaded and parsed it. It is now `shell-settings.css`, loaded by the Settings page, and by other pages only when a Settings part opens. The stylesheet every page needs went from 81 KB to 31 KB (readable), and rules that only belonged to the old Settings popup were removed. About 110 screens (every page, every Settings tab, the login and Text Sizes dialogs, in dark, light and phone widths) were compared before and after: the same.
- The background photo no longer competes with the scripts and styles the page needs to appear: it loads at low priority and fades in as before.
- On data saver or a 2G connection, the idle download of the Settings files is skipped, and the next background photo is not fetched ahead of time.

### Info: three designs, chosen for each tab

- In **Edit Tab** there is a new **Layout** choice with a small picture of each: **Classic** (the original two columns, and what every existing tab keeps), **Notebook Cards** (each box a card with a colored edge in the tab's color) and **Document** (one reading-width page with an outline beside it, which lights up as you scroll and becomes a row above the page on a phone).
- Each tab has its own layout, so one page can mix all three. A new tab starts as Classic.
- Editing works in every layout. Layouts are saved with the tab, show up on your other devices, and are kept by backups and restores. A Classic tab is pixel for pixel what it was.
- Fixed on the way: "New tab", "Save tab" and "Delete tab" in that dialog are now in Title Case.

### Settings: the three ideas together

- **Status on every menu item.** Each section's menu entry now shows where it stands (for example Security "4 of 6", Backup "just now", Updates "Up to date", Health "OK", the theme, the version).
- **Overview first.** The Overview opens with jump chips (each with a status dot) to the main sections, a banner for guided setup while steps are open, then the "things to look at" list and the summary cards as before.
- **Guided Setup** (Overview › Guided Setup): the protection steps in order, one open at a time: Website Password, Encryption Passphrase, Recovery Key, Two-Step Login, First Backup, then optional Telegram. It uses the same code as Security and Backup, so a step does exactly what its Security tab would. A passphrase you type is kept only in memory while Settings is open, so the recovery key step does not ask twice; the key is shown once and is never stored. Steps can be skipped and reopened.

---

## 1.35.0

### Fixed: Info's Export buttons

- **All four buttons in Info's Export dialog did nothing** (All Tabs or Current Tab, as PDF or as Text): the code behind them was missing. This was already so in 1.32.1. They now work:
  - **Text** keeps every character exactly (₹, Hindi, emoji, the formatting marks as you typed them).
  - **PDF** is an A4 document: the page title, then each tab with its boxes. It uses a basic built-in font, so ₹ becomes "Rs", curly quotes and dashes become plain ones, formatting marks are removed, and letters outside Western European scripts become "?". Use Text for those; the dialog says so.
  - Boxes of an encrypted tab that is still locked are left out, with a note in the file. Unlock the tab first to include them.
- File names follow the page or tab: `my-notes-2026-10-21.pdf`, `home-stuff-2026-10-21.txt`.

### Removed: leftovers that still ran

- **Info's own backup timer**, its reminder dialog and its earlier-versions dialog. Their buttons were removed when backups moved to Settings, but the code stayed: the countdown still ticked every second, and when a backup was due the "BACKUP NOW" button called code that no longer existed. The site-wide backup reminder in the bar, and Settings › Backup & Restore › Earlier Versions (which lists and restores Info's versions), do this job. Info's four server actions behind it (`save_timer`, `backup_done`, `list_versions`, `restore_version`) are gone too.
- **Styles nothing uses any more:** 77 rules (about 6 KB) in the site's shell, Info, Cards and Home, left over from earlier Settings and Info designs. Each was checked against every page and script, including the Tools bundle, and names built in code (like `k-` + kind) were kept.
- A variable in Cards' server code that was set and never read.

### Faster

- **Every page's own scripts and styles are now minified**, not just the shell: Home, Links, Info, Cards, Tasks and Settings (18 files, 821 KB to 668 KB; 240 KB to 206 KB compressed). The readable originals ship in the zip in `web/core-data/docs/src/<page>/`, closed to browsers.

### Checked, nothing to change

- **Security:** every action that changes data on every page checks the login and the security token; the login cookie is HttpOnly, SameSite=Strict and Secure on https; HSTS is sent on https; every page sends a content security policy with no inline scripts.
- **Dead files:** none. Every file in Tools is used (the 5 MB OCR language file is loaded by name).

---

## 1.34.1

### Smaller scripts and styles

- `shell.js`, `shell-admin.js` and `shell.css` are now minified: 394 KB became 303 KB, and about **19 KB less is downloaded** (106 KB to 86 KB compressed) the first time a browser loads each version. They are cached for a year after that, so the gain is small, but it is free.
- **Nothing is lost for editing:** the readable originals ship in the same zip, in `web/core-data/docs/src/` as `shell.src.js`, `shell-admin.src.js` and `shell.src.css`. That folder is closed to browsers, like the rest of `docs/`. The next change starts from those files and is minified again before the zip is made (the handoff says how).
- Behavior is unchanged: the whole Settings test suite, every page and the updater were run against the minified build.

---

## 1.34.0

### Security: devices and login history

- **Security › Devices** now shows every browser that is logged in (browser and system, address, when it logged in), with a **Log Out** button on each, so you can end one login without ending the rest. The one you are using is marked **This Device**.
- Below it, **Recent Activity** lists the last 100 security events: logins, wrong passwords and wrong two-step codes, logins paused after too many tries, password and two-step changes, new recovery codes, other devices logged out, and backups restored. Each line says which browser, which address and when.
- Only a fingerprint of each login is kept, never the login itself, so the list cannot be used to get in. Both files live in `site-data/core` as guarded data files (they answer 404 in a browser). A login you end from the list is remembered as ended; a normal request checks that list only while it has something in it.
- Logins made before this version are not listed until they log in again.

### Settings

- **Search Settings:** a box at the top of the menu. Type a word ("passphrase", "cron", "font", "memory") and jump to the right tab. Press `/` anywhere to start typing.
- **General, Navigation, Pages and Look** are now cards, like Security and Telegram. Update, Files, Health and the Colors groups were restyled to match.
- **What's New:** after an update, the Overview shows what the new version changed, once, until you press Got It.
- **Update preview:** when you upload an update zip, the check shows that version's own changelog entry ("What Is in This Update") before you apply it.
- **Export Data** (Backup & Restore): download Links, Cards or Tasks as a CSV spreadsheet (UTF-8, opens correctly in Excel) or as JSON. Encrypted Links tabs stay locked and are left out of the CSV, with a note saying how many. This is not a backup; Back Up is.
- **Server Check** now reports the PHP memory limit (and what it means for big start page photos) and any start page photo source that failed in the last 7 days.

### Looks

- **Your own presets:** Appearance › Presets › My Presets saves the colors and accent you have now (dark and light together) under a name. They appear in their own group, can be deleted, and can be **exported and imported** as a small JSON file to move them between sites. They are kept with your settings, so they are in every backup.
- **Page accents:** Appearance › Colors › Page Accents gives one page its own accent color (its buttons, highlights and the bar's current tab).
- **Button text follows the accent:** text on an accent-colored button is now black or white, whichever reads better on that accent, on every page. A dark blue accent no longer gets unreadable black text.

### Library

- The PDF library behind Tasks' Year in Review is now **jsPDF 4.2.1** (was 2.5.1). The report was made with both versions from the same data: the text is identical and the pages are pixel for pixel the same. SheetJS (Cards' Excel export) stays at 0.18.5: newer versions are not published where the site can fetch them safely.

---

## 1.33.0

### Fix: Home ran out of memory while saving big photos

- The error was `Allowed memory size of 134217728 bytes exhausted ... home/lib.php`. Two things added up on a 128 MB host: the whole downloaded photo (up to 25 MB) was kept in memory while it was being opened and shrunk, and the shrink step (`imagescale` with the bicubic filter) builds a second, half-scaled picture on the way, which the memory check did not count.
- Downloads now go straight into a file as they arrive, so a photo or clip never sits in PHP's memory. This also covers "Test source" in Home's settings.
- Shrinking is done with `imagecopyresampled()` into an image of the final size, and the memory check now counts the open picture, the small copy and a margin. When the limit is too tight, the photo is **kept as it is** instead of crashing the page.
- The refill step asks for 256 MB while it works (hosts that forbid it keep their own limit) and frees memory between photos.

### Settings: Changelog

- A new **Changelog** section after Health, with three tabs: **Versions** (every version, newest first, searchable, with Expand All and Collapse All; the installed one is marked), **Version Map** (one line per version; click a version to open it) and **Notes** (How to Update and Good to Know).
- It reads `web/core-data/docs/CHANGELOG.md` through a new read-only action, `changelog`, which needs you to be logged in (the docs folder stays closed to browsers). Text is escaped before it is drawn.

### Settings: Security and Telegram, modernized

- Every tab starts with a header (icon, title, one line about what it is for) and uses the same cards, status tiles and check rows.
- **Security › Overview:** a ring showing how many protections are on, the next best step, a tile for each protection (click one to open its tab) and a Site Checks list.
- **Password:** a strength meter under the new password. **Two-Step Login:** how it works in three steps, then Step 1 and Step 2 cards, and a warning when recovery codes run low. **Login Approval:** the status, and three small "If something goes wrong" cards. **Trusted Browsers:** one row per browser (address, last used, trusted until) with an empty state. **Devices:** two cards.
- **Telegram › Status:** a connection card, four tiles (Setup, Backups, Messages, Instant Replies) and a Right Now list. **Setup** keeps the numbered steps. **Backups:** how often is a row of buttons instead of a drop-down, plus an encryption card and Send Backup Now. **Messages:** switches grouped in cards (Tasks, Site Alerts, Delivery Time). **Instant Replies:** the switch, a short "on or off" comparison and the commands.
- Telegram opens on **Setup** until the bot is connected. Its messages ("Token saved", "Backup sent") also appear as a toast, so you see them on any tab. After you change a Telegram setting, the Status tab redraws and shows the new state.

### Presets

- **94 more presets** (166 in all): new groups **Pastel**, **Earthy**, **Monochrome** and **Retro**, plus more editor themes (Catppuccin Macchiato and Frappé, Rosé Pine Moon, Ayu Dark, GitHub Dimmed, Material Ocean, Poimandres, Moonlight, Nightfox, Oxocarbon, Vesper, Darcula, Zenburn, Tomorrow Night and more) and light themes (Night Owl Light, Material Lighter, Paperwhite, Sepia, Newsprint and more).
- A **search box**, a live count and a **Surprise Me** button. The group buttons and the search now show and hide presets without redrawing the tab.
- Every new preset was checked for readable text, readable secondary text and visible borders, and its accent for readable buttons.

### Text

- Labels, headings, buttons, tab names, status words and tooltips are now in **Title Case** across the site (for example "Current Passphrase or Recovery Key", "Two-Step Login", "Switch to Light Mode"). Sentences and hints keep normal sentence case.
- "Site password" is now **Website Password** in labels, and "website password" in sentences, everywhere.

---

## 1.32.1

### Nothing in `site-data` can run as code

- The "Go Back" copy of your previous version (`site-data/updates/previous/`) kept its PHP files as they were, and the update's own state files were plain JSON. On Apache and LiteSpeed the folder's `.htaccess` blocks all of it, but on a server that ignores `.htaccess` the saved PHP files could have been opened directly. Now:
  - The saved copy (and an update being checked) keeps every PHP file as `name.php.stored`; it gets its real name back only when copied into place by Go Back or a rollback.
  - The update's state files (`state`, `previous`, the upload's progress) are guarded `.php` data files like all other data: a browser gets a 404.
  - A copy and state files left by the previous updater are converted the first time the Updates tab is opened, so nothing plain is left behind.
- **One thing to know:** if you use Go Back to return from 1.32.1 to 1.32.0, the older updater cannot read the new saved copy, so the Go Back button on 1.32.0 cannot take you forward again. It refuses safely and changes nothing. To move forward again, upload the 1.32.1 zip in Settings > Updates as usual. (This only concerns going back across this one version.)
- Every `.php` file left under `site-data` is now a guarded data file that answers 404. (The empty `index.html`, the `.htaccess` and the empty `*.lock` files in `site-data` are intentional.)

### Menus

- **Settings menu:** the group label "Protection" is now **Protection & Data**, and it holds Security, Telegram and Backup & Restore (right after Telegram). The separate "Data" group is gone.
- **The theme switch is gone from the Settings menu** (the bar's own theme button is still there on every page).
- **Start page corner menu** (the one that opens from the corner when the bar is off): Backup and Health are no longer separate entries; there is just **Settings**, which opens the Settings page, then Log Out.

---

## 1.32.0

### The engine moves back inside `web`, as `web/core-data`

- `core/` is now **`web/core-data/`**. The site folder holds only `index.php`, `web` and `site-data`. Inside `web/core-data/` everything is as it was: `api.php`, `cron.php`, `telegram.php`, `lib/`, `assets/`, `docs/`, the file list `manifest.json`, and `media/` with your pictures and logo.
- Because updates now happen in the browser, nothing has to be deleted by hand in the File Manager any more, so the engine no longer needs a folder of its own.
- All the old-layout code is gone: the one-time steps that moved things in earlier versions, the fallbacks for the pre-1.29 folders, and Health's list of old leftovers. (A logo you set earlier is still recognised at its old address, so it isn't lost while you move files.)

**Installing this version (by hand, once).** The updater of 1.31.1 and earlier only accepts the old layout, so it refuses this zip. Upload and extract it over the site folder with the File Manager, then:
1. **Move your media:** move everything inside `core/media/` into `web/core-data/media/` (merge the folders: logo, start-page pictures, link icons).
2. **If you ever made `core/config.php`** (only needed when your data is somewhere other than `site-data`), move it to `web/core-data/config.php` **before anyone opens the site**; until then the site cannot see your data and asks for setup. Your data itself is never touched.
3. **Delete the old `core/` folder** when the media (and config) are moved. Settings > Updates > Files lists it under "Other items in your site folder" until you do.
4. **Cron job:** change its address to `…/web/core-data/cron.php` (Settings > Telegram > Setup shows the exact one).
5. **Telegram:** switch Instant Replies off and on once in Settings > Telegram > Instant Replies, which registers the new address. If you set a Cloudflare rule for `/core/telegram.php`, change it to `/web/core-data/telegram.php`.
After that the site updates itself again from Settings > Updates.

### Settings

- **The gear in the bar simply opens the Settings page.** Health and Log Out are in the page's menu. On a phone, the light/dark switch that was in the old gear menu is now a button in that menu.
- **Navigation:** the "Edit the Start Page" button is gone (it is in the start page's own settings).
- **"Updates & Files" is now just "Updates"** (its tabs are still Update and Files).
- **Encryption** is redesigned as clear cards: what it protects (shown as chips), setting a passphrase, changing it, the recovery key, and a separate "Remove encryption" card. The form that used to double as the remove form is gone. Wording is simpler throughout.
- **Telegram Setup** is a numbered step list that follows how far you have got (make a bot, paste the token, connect your chat, send a test), with the schedule (cron job) in its own card with copy buttons.
- **Back Up** shows the parts as compact cards in a grid with one size per card, **All / None** links, a live "N of 8 selected · about X MB" line, and one Download Backup button, instead of one long list.

---

## 1.31.1

### Fix: Settings in dark theme

- The Settings page did not paint its own page, so in dark theme the page behind the cards stayed white and the headings (light text) almost disappeared; the link in the backup banner also showed in default blue. The page now has its own background and text color that follow the theme (dark, light, or follow device) and the colors you chose, and its links use your accent color.

---

## 1.31.0

### Settings is a page now

- **One page for everything** (the gear in the bar, or `web/settings/`) instead of a dialog. A menu on the left, in four groups: **Site** (General, Appearance), **Protection** (Security, Telegram), **Data** (Backup & Restore) and **System** (Updates & Files, Health). Each section says in one sentence what it is for.
- **Overview** comes first: a card each for Site, Security, Telegram, Backup, Updates and Health, a short list of things that need a look (a stopped schedule, a failed Telegram backup, a due backup, files that do not belong, an update waiting), and little status labels in the menu.
- **Tabs instead of one long list.** Security (Overview, Password, Encryption, Two-Step Login, Login Approval, Trusted Browsers, Devices), Telegram (Status, Setup, Backups, Messages, Instant Replies) and Backup & Restore (Status, Back Up, Restore, Earlier Versions, Start Over) now show one part at a time. General, Appearance, Updates & Files and Health keep their own sub-tabs.
- **Every tab has an address**, for example `settings/#security/encryption` or `settings/#backup/start-over`, and the page remembers the tab you were on.
- **Save bar:** it appears at the bottom only while something is unsaved, with Discard and Save Settings. Leaving the page with unsaved changes asks first.
- **On a phone** the menu is shown first, and each section opens with a back button.
- Wording is plainer throughout: tab names, captions and the section sentences were rewritten.

### Update the site by uploading a zip (Settings > Updates & Files)

- **No more File Manager.** Choose the update zip; the site checks it completely before it touches anything: that it is a real site update (only `core`, `web` and `index.php`), that every file is whole (each has a fingerprint in the zip's own list), that no PHP file is broken, that it can update itself again, that it is newer than yours, that the server lets the site replace its own files, and that there is room on the disk. It then shows what will change (updated, new, removed) with the file list and the zip's fingerprint (SHA-256) to compare with the one you were given.
- **Applying needs your site password.** The site saves the version it has now, replaces its own files one by one (each is written next to the old one and renamed, so a file is never half-written), removes the files the old version had and the new one does not, and then looks at itself. **If it does not answer, or a file cannot be written, the saved version comes back by itself**; nothing is left half-done.
- **Go Back** returns to the saved version in one click (and the version you left becomes the one to go forward to again). Your data is never touched either way.
- **Never touched:** `site-data` (all your data), `web/core-data/media` (your pictures and logo), `web/core-data/config.php`, and `web/tools/config.json` (made from your settings).
- Refused with a plain reason: names that climb out of the folder, files outside `core`, `web` and `index.php`, scripts among your pictures, odd file types, links, locked or damaged zips, a file that is not the size the zip says, files that changed after the list was made, an older version, and a zip that could not update the site again.
- The zip is read by the site itself in plain PHP, so no zip extension is needed on your host.
- **First time only:** a site that does not have this tab yet has to be updated once with the File Manager (upload and extract this version); after that it can update itself.
- Only upload zips you got from a source you trust: an update replaces the site's own code.

### Files that do not belong (Settings > Updates & Files > Files)

- Every release now carries `web/core-data/manifest.json`, a list of its files with fingerprints. Comparing it with your server shows **files that are not part of this version** (an `error_log` in the site folder, `.bak` copies, archives, system files, scripts nobody added), files **changed by hand**, and files that are **missing**.
- You see the list with a reason for each file, tick what to remove, and confirm with your password. Only files on that list can be deleted; anything else asked for is refused. Planted scripts are marked as risky.
- Never listed or touched: `site-data`, `web/core-data/media` (only a script among your pictures is flagged), `web/core-data/config.php`.

### Smaller changes

- **Tools settings survive an update.** `web/tools/config.json` is made from your settings and used to be overwritten by the zip's copy on every manual update. The site now rewrites it from your settings after each update, and the updater never overwrites it.
- Health also checks the Settings page, and `web/core-data/manifest.json` is hidden from visitors.
- The old Backup dialog and Settings dialog are gone; links that opened them (the Backup button, the gear, Health) go to the page.

---

## 1.30.2

### Fix: start page Settings

- In 1.30.0, removing the start page's Site Icon option left one stray closing tag in the Settings sheet, which pushed the "Links Panel" section out of its place and left the Cancel and Save buttons floating beside it. Fixed: the Page and Links Panel sections sit one under the other again, with Cancel and Save below.
- The other pages edited in the same update (Cards, Info, Links) were checked for the same slip and are fine.

---

## 1.30.1

### One logo, Links too

- Links' **Site Icon** setting (Settings in Links: an emoji, an image address or an uploaded file) is gone, with the upload behind it. Links now shows the site logo like every other page, or its 🔖 when no logo is set.
- Links also no longer changes the tab icon when its look is applied, so it can't cover the site logo any more.
- A Links icon saved before is simply ignored, and dropped the next time Links settings are saved.

---

## 1.30.0

### Start Over (Backup > Start Over)

- A red **Erase Everything** section puts the site back to new: every page's data and earlier versions, your pictures, icons and logo, the site settings and colors, Telegram, the domain watch list, the encryption passphrase and Telegram login approval. It needs you to type `ERASE` and your password.
- **It keeps your password and two-step login**, so you can log in again. Telegram login approval is turned off with it, because without Telegram nobody could approve the login.
- Everything comes back by importing a backup file. **Download a full backup first.** Encrypted tabs open again once you restore and set the same passphrase.
- This browser's own saved state (theme, cached pages, kept keys) is cleared too; other browsers clear theirs on the next visit.

### Backups keep your settings too

- A full backup already held each page with its own settings (Links' look, Info's page and colors, Cards, Tasks, the start page) and the site settings (name, logo, look and colors, navigation, pages). It now also holds **Telegram** (bot, chat, which messages, the daily hour, backups to Telegram, login alerts) and the **domain watch list**.
- **The Telegram bot token only goes into encrypted backup files.** A plain file could be read by anyone who gets it. Restoring a plain file keeps the token already on the site; restoring an encrypted one brings the token back as well.
- After a restore, turn **Instant Replies** on again in Settings > Telegram (that registers the site with Telegram).
- Not in a backup, on purpose: your password, two-step login, trusted browsers and the encryption passphrase itself.
- Restoring does not need an empty site: each part you restore replaces that part. Start Over is there when you want a clean slate first.

### Clearer Telegram and Security screens

- **Telegram** now opens with **Right Now**: whether the schedule (cron job) is really running and when it last ran, when the next daily message goes out, when the last message was sent, how the last backup to Telegram went, whether instant replies work, and the last problem, each with what to do about it.
- **Security** now opens with how many protections are on and **the next best step** (for example "Turn on Two-Step Login: a stolen password alone then gets nobody in"), and shows the recovery key next to encryption.

### One logo

- The logo moved from `web/core-data/brand` to **`web/core-data/media/brand`**, beside your other pictures. The first page you open after the update moves it.
- Cards and Info no longer carry their own icon: their old `icon.png` and `touch.png` held the logo of the separate sites they once were. Their "page icon" options are gone, and so is the Site Icon option in the start page's settings. Every page now shows the site logo (Settings > General), or a plain page symbol when no logo is set.

---

## 1.29.4

### Security

- **Pages no longer allow inline scripts.** Links, Info, Cards, Tasks and the start page now forbid inline `<script>` blocks and inline `onclick="…"` handlers in their Content-Security-Policy. If anything ever slipped text with a script into a page, the browser would now refuse to run it. To make that possible, the few tiny scripts that ran inline (the theme and early-data code) moved into small files (`links-early.js`, `links-boot.js`, `info-boot.js`, `cards-boot.js`), the one inline handler in Tasks became a normal event listener, and the start page's two data scripts carry a fresh random nonce on every request. The policy sits in each page's `<meta>` tag (works on every host) and in its `.htaccess`.
  - **How this was checked:** every page was loaded in a simulated browser that removes inline scripts and handlers the way an enforcing browser does, and each one still worked; a deliberate inline script is caught by the test. No real browser was available, so open each page once and glance at the console. **If a page is ever blank or dead after this update,** the console will show a "Content Security Policy" message; to go back, add `'unsafe-inline'` after `script-src` in that page's `<meta http-equiv="Content-Security-Policy">` and in its `.htaccess`.
- **Security headers are sent once.** Both the PHP code and `.htaccess` set `X-Frame-Options`, `Referrer-Policy` and `nosniff`, so API replies carried them twice, and Links' and Tasks' APIs carried two *different* values (for example `X-Frame-Options: DENY, SAMEORIGIN`), which a browser may reject. `.htaccess` now sets them only on files that are not PHP, and the PHP pages send their own (including `X-Robots-Tag` and `Cross-Origin-Opener-Policy`, which previously came from `.htaccess`).
- **Include files answer 404 when opened directly** (`web/core-data/lib/*.php`, `web/tasks/lib.php`, `web/home/lib.php`, `config.php`). Before, on a server that ignores `.htaccess` (nginx, for example) opening one in a browser ran it.
- **Every media folder blocks script in an SVG opened directly** (`default-src 'none'; sandbox`; before, only Links' icon folder did), and `nosniff` is now sent once instead of twice.
- **A page refuses to be shown inside someone else's page** even on hosts that ignore `.htaccess` (a small check in `shell.js`).
- **Two unused actions were removed:** Info's `replace_all` and the site's `backup_done`. Nothing called them, and each was a way to change data for no benefit.
- **Checked automatically now:** every one of the 58 actions that change something refuses a request without the site's security token; a visitor gets nothing private from any of 166 requests across all 83 actions; hostile uploads (a PHP file renamed `.jpg`, an SVG with script, a backup with `../` file names) are refused; cookies are HttpOnly and `SameSite=Strict`.
- **Known and not changed:** the bundled export libraries (the Excel one is version 0.18.5, the PDF one 2.5.1) have newer releases with security fixes. They only create files from your own data and never open files from outside, so those problems cannot be reached from the site. They could not be upgraded in this release (the newer Excel library is published only on its own download site).

### Speed

- **Cards and Info pages are much smaller.** Each page carried two PNG icons inside its HTML (about 25 KB), which could never be cached and were sent on every visit. They are now files in `assets/` kept for a year: Cards' page went from 34 KB to 9 KB, Info's from 31 KB to 16 KB.
- **Measured, nothing else to gain:** every API answers in 1 to 2 ms on the server, PHP's start-up costs 2 to 3 ms, and shrinking the scripts would save about 15% of what is sent and is already cached for a year, so the code stays readable. If a page feels slow, it is the connection or the host (Settings > Health > Speed shows which).
- Start-up now makes one file check per request for the update steps instead of three.

### Everything fits together

- A new **cross-reference check** confirms that every action the browser calls exists in the PHP, every PHP action is used by something, every page and file path mentioned in the code and the docs exists, the pages the bar lists match the server, and the page-to-bar contract holds. It found the two unused actions above.
- The README has a new section, **Rules for changing the code**, so later changes keep the same structure (no inline scripts, one place for headers, the token check on every changing action, media paths, the include-file guard).

---

## 1.29.3

### Your own files moved into `web/core-data/media/`

- `web/home/photos`, `web/home/uploads`, `web/home/icons` and `web/links/icons` are now **`web/core-data/media/home/photos`**, **`web/core-data/media/home/uploads`**, **`web/core-data/media/home/icons`** and **`web/core-data/media/links/icons`**. `web/` now holds only pages.
- Nothing you saved needs changing: Links and the start page still store short paths like `icons/…` and `photos/…`, and the pages look for them in the new place. Backup, restore, Health's disk use and the Settings folder check use the new folders too.
- Each folder keeps its own `.htaccess` that shows pictures but never runs scripts.
- **Updating:** the first page you open moves your existing files across (sub-folders included) and removes the old folders. If you replace files by hand, keep `web/core-data/media`.
- **Old direct addresses stop working.** A link you shared to something like `…/web/home/uploads/file.jpg` no longer opens; the same file is now under `…/core/media/home/uploads/`.

### `web/core` is gone

- The two forwarders kept in `web/core/` since 1.29.0 (`cron.php`, `telegram.php`) are removed, together with the folder. **Update these two places or they stop working:**
  - **Cron job:** use the address shown in Settings > Telegram (`…/core/cron.php?key=…`), or on the command line `php <site folder>/core/cron.php`.
  - **Telegram instant replies:** turn Instant Replies off and on once in Settings > Telegram, which registers `web/core-data/telegram.php`. (Until then Telegram keeps calling the old address and replies come back only when the site next checks.)
- A `config.php` or `data` folder you might still have in `web/core` from before 1.29 is left alone.

---

## 1.29.2

### Two tidier folder names

- **Tools:** `web/tools/assets-v11/` is now plain **`web/tools/assets/`**. The version number in the folder name was how browsers learned that Tools files had changed. That job now belongs to a short fingerprint of the Tools files, written into `web/tools/sw.js` and onto the page's own links (`?v=…`) by the release script. When no Tools file changes, nothing is downloaded again; when one does, the fingerprint changes and only the browsers that need the new files fetch them.
- Tools' cache rules changed with it: files are re-checked on each load (a quick "not modified" when unchanged) instead of being kept for a year regardless, because not every Tools file name is a content hash. Only addresses with `?v=` are kept for a year.
- The Tools service worker now only handles its own `assets/` folder. (A plain `/assets/` match would also have cached other pages' files such as `web/core-data/assets/shell.js`.)
- **`docs/` moved into `web/core-data/docs/`**, so the site is now three folders side by side: `core/`, `web/` and `site-data/` (plus `index.php`). `README.txt` and `CHANGELOG.md` are still blocked from the web.

**Updating:** extract the zip over the site folder as usual. The first page you open removes the old `docs/` folder (and `web/README.txt` and `web/CHANGELOG.md` if you are updating from before 1.29), and the old `web/tools/assets-v#/` folder once the new one is in place. Your data is not touched. Tools downloads its files once more on the first visit, because the folder name changed.

---

## 1.29.1

### Cards is back as it was

- The tile view, expiry strip, holder chips and view toggle from 1.29.0 are **removed**. Cards looks and works exactly as in 1.28.x: the table, the five stat tiles, the dropdown filters, sorting, and the Edit button that appears on hover.
- Cards' CSS and JavaScript still live in `web/cards/assets/` (the faster-repeat-visit change from 1.29.0), and the code in them is otherwise identical to 1.28.x.
- If you installed 1.29.0, nothing needs doing: the tile view setting it kept in your browser (`cards-view`) is simply ignored.
- Everything else from 1.29.0 stays: the new folder layout, Change Passphrase and the recovery key, icons stored once in encrypted tabs, and the Health speed, `error_log` and Test a Restore checks.

---

## 1.29.0

### A tidier folder layout

The site is now four folders side by side: **`core/`** (the shared engine), **`web/`** (only the pages), **`docs/`** and **`site-data/`**.

- `core/` holds the three files a browser calls (`api.php`, `cron.php`, `telegram.php`), `lib/` (PHP that other files load, blocked from the web), `assets/` (`shell.js`, `shell.css`, `shell-admin.js` and the PDF, Excel and QR libraries) and `brand/` (your logo).
- `README.txt` and `CHANGELOG.md` moved to **`docs/`**, which is blocked from the web. (They can't sit in the main folder: it must not carry an `.htaccess`.)
- Links, Info, Cards and Tasks keep their CSS and JavaScript in their own **`assets/`** folder instead of inside the page. Browsers keep those files for a year (they carry `?v=` and change name with each version), so repeat visits download almost nothing. The pages themselves are now 13 to 35 KB instead of 70 to 160 KB.

**Updating from 1.28.x:** extract the zip over the site folder as usual. The first page you open does the rest by itself, once: it moves your logo to `web/core-data/brand`, carries `web/core/config.php` over to `web/core-data/config.php` (if you made one), rewrites Tools' branding file, and deletes the old `web/core` files. Your data in `site-data` is not touched, and you stay logged in.
- **Cron job and Telegram:** `web/core/cron.php` and `web/core/telegram.php` stay behind as tiny forwarders, so a cron job or Telegram webhook set up before keeps working. Settings > Telegram now shows the new address `web/core-data/cron.php`. Switch when you like (for Telegram, turn Instant Replies off and on once in Settings > Telegram to register the new address), then delete the `web/core` folder.
- If you keep your own copy of the code, `HUB_DATA_DIR` goes in `web/core-data/config.php` now.

### Cards (this redesign was removed again in 1.29.1)
- **Card tiles** (the new default) show bank, name, variant, limit, holder, charges and expiry on one card each, with an Edit button that is always visible. The old table is one tap away with the view toggle, and the choice is remembered on that device.
- **Expiry strip:** cards that expire within 6 months (or already have) are listed at the top, with **Show Them** to filter to them, soonest first. Their tiles say "soon" in amber.
- **Holder chips** with counts replace the Holder dropdown. On a phone the chips and stats scroll sideways and tiles stack one per row.

### Links
- **No more "Loading bookmarks…"** (1.28.3) and the page draws before encrypted tabs are unlocked (1.28.4); both are in this release.
- Identical icons inside an encrypted tab are now stored **once**, so tabs with many links from one site are much smaller. Tabs saved before open as always and are rewritten the next time they change.
- Page data is sent compressed.

### Encryption (Settings > Security > Encryption)
- **Change Passphrase:** type the current passphrase (or a recovery key), the new one twice and your site password. Only the lock on the tab keys changes, so your encrypted tabs are not touched or re-encrypted, and a device that keeps tabs unlocked stays unlocked. If Links fails after Info was moved, Info is put back, so the two never end up on different passphrases. New backups use the new passphrase; backups made before keep opening with the old one.
- **Recovery Key (optional):** a code like `ABCD-EFGH-JKLM-NPQR-STUV`, shown once, that opens your Info and Links tabs when the passphrase is forgotten (type it where the passphrase goes; capitals, dashes and spaces don't matter) and can set a new passphrase. The server never sees the code. A new key replaces the old one, and it can be removed. Whoever holds the code can open your encrypted tabs.
- The unlock boxes in Info and Links now say "Passphrase or Recovery Key".

### Health (Settings > Health)
- **Speed:** how fast each section's saved data reads on your host, whether PHP's code cache (OPcache) is on, and how long the check took. It tells a slow host from a slow site.
- **error_log:** the page now tests whether an `error_log` in your site folder can be opened from the internet and, if so, shows the exact `.htaccess` rule to add.
- **Test a Restore** (Backups section): makes a backup of today's data, opens it again (with the backup key if backups are encrypted) and checks the newest earlier version of each section can be read. Nothing is changed.

### Behind the scenes
- A dev kit (separate from this zip) holds the test suites and a release script: smoke, upgrade from 1.28.x, Health, encryption on the server and in the browser, Links and Cards pages, and a layout check. They run on PHP's server and on real Apache.

---

## 1.28.4

### Links: the page no longer waits for the encrypted tabs

- **Why it was slow:** since "keep unlocked on this device" became the default, every load opened the browser's IndexedDB, unlocked the saved key and decrypted every encrypted tab, and only then drew anything, even your plain tabs. A browser's first database open can take a while, which is why the first load was slow and later ones were quick.
- **Now:** the page draws as soon as the server answers. Plain tabs show at once. Encrypted tabs open a moment later in the background. If you land on an encrypted tab, you see the soft placeholder blocks and then its links (or the lock card, if this browser has no saved key). There is no flash of the lock card.
- Nothing about the encryption itself changes: same keys, same passphrase, same stored data.

---

## 1.28.3

### Links: faster start, no loading text

- **Quicker:** the page now asks the server for your links the moment it starts loading, in parallel with the site's shared script, instead of waiting until everything has loaded. On a slow host this removes the wait before the request even begins.
- **No more "Loading bookmarks…":** the words are gone, so they no longer clash with a tab named Bookmarks. Soft grey blocks pulse in the grid until the links arrive (they stand still if your device asks for reduced motion).
- If the early request fails, the page falls back to the normal request with its retries and error message, as before.
- Nothing changes in your data. Encrypted tabs, saving and every other page are untouched.

---

## 1.28.2

### Links: encrypted tabs now look and work like Info's

- **Locked tab:** a centered card with the lock icon, **Encrypted Tab**, a short sentence and an **Unlock** button, the same as Info. It replaces the left-aligned text.
- **Unlock box:** the same order as Info's: a line of text, the passphrase, **Keep unlocked on this device until I log out**, the message line, then Cancel and Unlock. Untick the option to open the tabs without keeping a key in this browser; the choice is remembered.
- **Open tab:** a slim bar above the links with a green lock and *Encrypted tab, unlocked on this device until you log out or lock it*, and **Lock Now** on the right. The bar says *reload, log out or lock it* when the key is not kept.
- **Removed** the extra lock button from the tab's pencil controls. Lock Now is always visible instead.

---

## 1.28.1

### Added

- **This changelog now ships inside every update zip** as `web/CHANGELOG.md`, so every change can be traced from the site's own files. Each update replaces it with the new full history. It is blocked from the web like the other `.md` files, so visitors can't read it.
- **One history, 1.0.0 to now.** Compiled from five separate changelogs and the 1.26.2 update notes (they came from different chats), newest first. Sections that appeared in more than one source were identical and are listed once.

### Changed

- No program code changed in this version. The version number moved to 1.28.1 so Health and every page agree, and `web/README.txt` now lists `CHANGELOG.md` in its folder map.

### About the older entries

- **Dates** were only recorded for 1.0.0 and 1.0.1.
- **1.0.2 to 1.6.x** have no per-version notes; what changed in that stretch is summarized under *Earlier Work* below.
- **Two notes called "1.9.2"** (one a release, one the baseline upload) are merged into a single 1.9.2 entry.
- **Spelling** is American English throughout ("color"), except names shown on screen, such as the Tools *Colours* card.

---

## 1.28.0

### Encryption: one passphrase

- **One passphrase locks everything secure:** Info's encrypted tabs, Links' encrypted tabs and backup files (the ones sent to Telegram too). It works as a **second password** next to your login password.
- **Settings › Security › Encryption now has two buttons only: Set Passphrase and Remove Passphrase.** The choice between "site password" and "separate passphrase", and the "Encrypt backup files" tick box, are gone. To use a different passphrase, remove this one and set a new one.
- **Set Passphrase** asks for the passphrase twice and your site password (to confirm it is you). It also moves anything still locked the older way onto it: the site password, or a separate Info passphrase. If your Info tabs use a different passphrase than the new one, a field **Earlier Passphrase** appears so they can move (type the one they use now). If Info already uses the passphrase you typed, it is kept as it is.
- **Remove Passphrase** opens every encrypted Info and Links tab and turns it back into a normal private tab (still hidden from visitors), and stops encrypting backup files. It needs the passphrase and your site password, and asks you to click twice.
- **Info and Links only unlock.** They no longer make or change keys. Ticking Encrypted without a passphrase says: *Set an encryption passphrase first: Settings › Security › Encryption.* Unlocking asks for the passphrase, once per browser.
- **Your login password is separate.** Changing it no longer touches encrypted data locked with the passphrase. Data still locked the older way keeps following the site password until you set a passphrase.
- The Telegram backup message, the Backup panel and the unlock boxes all say **encryption passphrase** now.

### Telegram settings, reordered

- **Bot connection and Schedule are one section: Bot and schedule.** The bot token, finding your chat and the cron job lines are together.
- **Backups to Telegram comes right after it,** then Messages, then Two-way bot. The overview tiles at the top follow the same order.

### Good to know

- **Setting the passphrase turns on backup encryption** (when your host has OpenSSL). Backup files made earlier keep opening with the password they were made with.
- **Lost passphrase = lost data.** Nobody, not even the server, can open encrypted tabs without it.
- **After removing the passphrase, tabs are plain.** If you later set a new one, tick Encrypted on the tabs you want locked again.

---

## 1.27.0

*Replaced in 1.28.0: Links tabs are now locked with the encryption passphrase instead of the site password. The entry below is what shipped in this version.*

### Links: encrypted tabs

- **New: Encrypted Tab.** In Links press **Edit**, then the pencil on a tab, and tick **Encrypted Tab**. The tab's categories, links, notes and icons are locked in your browser with AES-256-GCM before they are saved. The server, its earlier versions and your backup files only ever hold scrambled text.
- **One password.** The key is random and is kept only locked with your **site password** (the same lock as Info's site-password mode). Logging in opens it for this browser; logging out, or the **lock** button next to the pencil, removes it again.
- **The first time** you tick it, you type your site password once. A tab that nobody has opened in this browser shows an **Encrypted tab** screen with an Unlock button.
- **Changing your password** (Settings › Security) moves the key to the new password by itself, together with Info's. **Changed it some other way?** In the Unlock box open **I changed my password**, type the current and the earlier password, and the tabs move to the current one.
- **Turning it off** for a tab (untick it) stores that tab as readable text again.
- **On encrypting, readable copies are removed:** the earlier automatic backups of Links and the tab's icon files (their names were the sites') are deleted. Icons now travel inside the encrypted text.
- **Visitors never receive** an encrypted tab or the key. Encrypted tabs are always private.
- **Restoring:** an earlier version of this site keeps this site's key. A Links backup file you import brings its own key (type the password it was made with under **I changed my password**).
- **Settings › Security › Encryption** lists how many Links tabs are encrypted. Backup overview marks them.

### Good to know

- **Lost password = lost tabs.** Nobody, not even the server, can open them. A login reset through the hosting files (deleting `site-data/core/auth.php`) cannot open them either; use the earlier password in **I changed my password**.
- **The tab name stays readable**, and search finds only its name, not its links, until it is unlocked.
- **Copies you made earlier stay readable.** Backup files you downloaded, or received on Telegram, before the tab was encrypted still hold it as plain text. Delete them.
- **Fetching a title or icon** for a link in an encrypted tab still sends that one address to your server for the moment of the lookup. Encrypted tabs never ask a favicon service about your sites; links without an icon show a letter.
- **Needs HTTPS** (the browser only allows encryption on a secure connection).
- A key kept for a browser is only used after it opens one of your encrypted tabs, so a stale key can never lock a tab you can't open again.

---

## 1.26.3

### Security

- **Server error logs can no longer be downloaded.** Files named `error_log` (the ones your host writes next to PHP files, with server paths and code lines in them), plus `*.ini`, `*.inc`, `*.sh`, `*.lock`, `*.swp`, `*.yml` and editor backups ending in `~`, are now refused inside `web/`.
- **Saved-icon check is stricter.** An SVG icon is now refused when an event handler follows a `/` or a quote (not only a space), when CSS `url()` points outside the file, or when it contains control characters. Icons you already saved are not touched.
- **Web addresses the server fetches are checked for two-way readings** (a backslash, a `user@` part, spaces). Anything that PHP and cURL could read as different hosts is refused before the public-address check.
- **Cross-Origin-Opener-Policy** is now sent on every page, so a window opened by another site can't keep a link to yours.
- **Cards and Info** escape the single quote `'` in text, like the other pages.

### Fixed

- **Two Links saves at the same moment could both succeed**, the later one silently replacing the earlier (up to 3 of 24 in a test). Saving, restoring and rolling back now take turns, and the second one is told to reload.
- **Cards: deleting cards always keeps an earlier version first.** Before, an earlier version was made at most every 10 minutes, so a delete soon after another save could not be undone. Tasks and Info already worked this way.
- **Start page: the background top-up does nothing when no photos are needed.** Anyone can call it, and it used to scan a folder and rewrite the photo list every time.

### Faster

- **Tools engines download smaller.** The OCR, background-removal and PDF-protection files are now compressed on the way: the largest goes from 10.5 MB to 2.9 MB, the OCR language file from 5.2 MB to 2.9 MB, the PDF engine from 1.3 MB to 0.44 MB. Browsers still keep them after the first use.

### Good to know

- **One file is still public, and an update can't fix it:** an `error_log` in the **site root** (next to `index.php`). Add this to the `.htaccess` in your site root (do not replace the file, it holds your host's PHP settings):

```
<FilesMatch "^(error_log(\.[0-9]+)?|php_errorlog)$">
  Require all denied
</FilesMatch>
```

- No Tools files changed, so they stay in `web/tools/assets-v11/`.

---

## 1.26.2

### Tasks

- **"All Tasks" is now "Tasks"** everywhere it appears: the big title, the first smart list in the side panel, the first tab above the list, and Page Settings › Show. The "Show All Tasks" button on an empty list is now "Show All".

---

## 1.26.1

### Tasks

- **This Week is now today and the next 6 days.** It no longer ends on Saturday, so on a weekend it still shows what's coming. The side panel, the This Week tab and the week strip all use it. The strip starts at Today, and its arrows move 7 days at a time.
- **List headings:** Overdue, Today, Tomorrow, **This Week**, **Next Week**, Later This Month, then one per month. They match the This Week numbers.
- **The task card is smaller and opens in the middle of the screen,** instead of sliding in from the side. Its tags (status, repeat, category) have their colors and spacing back.
- **Spending › Repeating now works.** It opens Analytics at the new Repeating Costs table and highlights it. Next 12 Months still opens the 12-month view.

### Analytics, reworked

- **Summary tiles:** To Pay, Per Month on average, Repeating per month (and per year), Next 30 Days.
  - **Compared with before:** To Pay shows how it compares with the same length of time before, once there is enough history to compare.
- **At a Glance:** the findings in plain words. The biggest month and how it compares with the average, the top categories, repeating costs, the next payment, and any renewal that now costs more than last time.
- **By Month:**
  - An average line, so busy months stand out.
  - Paid and still-to-pay months are told apart.
  - Hover or tab to a bar to see its exact amount.
  - Click a month to open it in Calendar.
- **Coming Up, Next 30 Days:** each payment with its date and a running total. Click one to open the task.
- **Repeating Costs:** every repeating task with its price and what it costs per month and per year, largest first, with a share bar. Click a row to open the task.
- **Price Changes:** tasks whose price differs from what you paid last time, by how much.
- **Kept:** By Category (click to see those tasks), Online or Offline, How Often, and Year in Review.

---

## 1.26.0

### Tools: 18 new tools (35 in all)

Everything runs on your device: no file is uploaded. The heavy engines (OCR, background-removal AI, PDF encryption) ship with the site and load only when you open the tool that needs them.

**PDF (11 tools)**

- **Split PDF:** every page, every N pages, custom ranges (`1-3, 4-6, 9`), or click the pages to keep. Several files come as one ZIP.
- **Organize PDF Pages:** page thumbnails you drag to reorder.
  - Rotate, duplicate or delete single pages, or select several.
  - Reverse the order or add a blank page.
  - Drop more PDFs to combine their pages.
- **Sign PDF:** draw, type (several handwriting styles) or upload your signature, then click to place it.
  - Drag to move it, use the corner to resize, copy it to every page.
  - Add the date or text as well.
  - Signatures are kept in this browser for next time.
- **Fill and Annotate PDF:** text (any size, color, bold), today's date, ticks, crosses, dots, white-out and highlights. Letters the PDF's built-in font lacks are kept as an image.
- **Protect or Unlock PDF:**
  - **Protect:** an AES-256 password, with choices to block printing, copying or editing.
  - **Unlock:** saves a copy without a password you know.
- **Watermark and Page Numbers:**
  - **Watermark:** text or a logo, with font, color, opacity, angle, 9 positions or repeated across the page, on chosen pages.
  - **Page numbers:** 5 styles, 6 positions, first number, skip the first pages.
  - Live preview.
- **PDF and Image to Text:** copies the text out of PDFs. Scanned pages, photos and screenshots are read with OCR (English). Copy the text or download a .txt file.

**Images (10 tools)**

- **Rotate and Flip:** batch rotate and flip, straighten with automatic corner crop, copy one photo's changes to all.
- **Image Editor:** brightness, contrast, saturation, warmth, tint, sharpness, vignette, fade and sepia, plus 10 one-tap looks. Hold a button to compare with the original.
- **Watermark Images:** text or logo on many photos at once. Choose position, repeat, opacity, angle, shadow and outline.
- **Color Picker and Palette:** a magnifier to pick any pixel, and the main colors with their shares as HEX, RGB or HSL. Copy them as CSS or download JSON or a swatch picture.
- **Screenshot Beautifier:** gradient, color or blurred background; padding, rounded corners and shadow; a light or dark window frame with a title; social shapes (16:9, square, 4:5, 9:16); 2x output. Copy straight to the clipboard, or paste a screenshot in with Ctrl+V.
- **SVG to PNG:** files or pasted code to PNG, JPG or WebP at 1x to 8x or an exact width.
- **Image to Base64:** data URI, CSS, HTML, Markdown or JSON snippets, and back from Base64 to a file.

**Photos (8 tools)**

- **Background Remover:** on-device AI cut-out.
  - Choose a soft or sharp edge.
  - Touch up with Erase and Restore brushes (with Undo).
  - Keep it transparent, or use white, a color or a blurred version of the photo.
- **Blur and Redact:** drag boxes over faces, number plates or card numbers. Choose blur, pixelate or a solid box.
- **Passport and ID Photo:**
  - **Sizes:** India passport, India visa or OCI, US, UK, Schengen, Canada, Australia, China, Japan, PAN card, stamp size or a custom size.
  - **Framing:** a face guide while you drag and zoom.
  - **Background:** change it to white, light grey, light blue or any color.
  - **Single photo:** 300 or 600 DPI, with an optional maximum file size in KB for upload portals.
  - **Print sheets:** 4×6 in, 5×7 in, A4 or Letter, as JPG or PDF, with cut lines.
- **Meme and Text on Image:**
  - Top and bottom captions, plus as many texts as you like, dragged into place.
  - Style: font, size, outline, shadow, alignment, capitals, label background.

### Tools: organise them your way

- **Favourites:** a star on every tool card and tool page. Starred tools appear at the top of the home page and under Favourites in the side menu.
- **Organise Tools** (side menu, Tools › Settings, or the home page):
  - Drag tools to reorder them, or move a tool to another section.
  - Move sections up and down.
  - Hide the tools you never use, and find a tool quickly.
  - Reset Order puts everything back.
- **Tool Order** (Tools › Settings › Layout): My Order, A to Z, or Most Used First.
- **Home Page Shows Tools As:** cards with descriptions, or a compact list.
- **Fixed:**
  - Tools' small messages no longer stretch down the whole page.
  - Option buttons no longer wrap into two columns.

### Good to know

- **Bigger download:** the update zip is about 15 MB (about 33 MB unpacked) because the OCR reader, the background-removal model and the PDF encryption engine are included. They are fetched by the browser only when you use those tools, then cached.
- **Tools files moved** to `web/tools/assets-v11/`. Health deletes the old folders.
- **After uploading,** check that the files in `web/tools/assets-v11/vendor/` arrived complete (a few are 3 to 10 MB).

---

## 1.25.2

### Tasks

- **Search is back at the top of the side panel.** <kbd>F</kbd> still jumps to it.
- **The quick-add bar sits in the header,** between the title and the **List · Calendar** switch and **Add Task**. In Calendar it adds on the day you picked. It hides on Analytics and Completed. On phones it drops to its own line under the title.
- **Side panel without boxes:** a plain list with colored icons.
  - **Smart Lists:** All Tasks first, right under the search, then Today, Overdue, This Week, This Month and Paused, each with its amount and count.
  - **Spending:** two rows, Next 12 Months and Repeating (per month), which open Analytics.
  - Then Tasks, Calendar, Analytics and Completed.
- **Lists (categories) removed from the side panel.** Filter by category with Filters › Category, or by clicking a category in Analytics.
- On phones the smart lists scroll sideways as chips.

---

## 1.25.1

### Tools

- **The side menu is now the default.** Pill Tabs is removed, so Tools › Settings › Layout offers **Side Menu** or **Tabs on Top**. Tabs stay only if you pick them there (the earlier choice saved by 1.25.0 doesn't count, so everyone starts on the side menu once).
- Tools files moved to **`web/tools/assets-v10/`**. Health deletes the old folders.

---

## 1.25.0

### Tasks: a calmer side panel

- **Smart lists redrawn:** smaller tiles with a soft background instead of borders. The count sits next to the icon, the amount goes under the name, and lists with nothing in them fade back so the ones that matter stand out.
- **Spending card:** "Next 12 Months" and "Repeating Cost" are now one card, with a small bar for each of the next 12 months. Click it to open Analytics.
- **Views with counts:** Tasks, **Calendar** (new), Analytics and Completed. Tasks shows how many are open, Completed how many you finished this month.
- **Lists:** clearer color dots and a count in the header. With no categories yet, a short hint says how to get lists.
- **Stays in view:** the panel no longer scrolls away with a long list.
- **Shortcuts:** <kbd>F</kbd> searches tasks, <kbd>N</kbd> adds one, <kbd>C</kbd> switches between List and Calendar.

### Tasks: Calendar, rethought

- **Its own view:** open it from the side panel, or with the **List · Calendar** switch at the top right.
- **Month, Week and Year:**
  - **Month:** each day shows its tasks (time, name, colored by status or category) and how much is due that day.
  - **Week:** one column per day with every task as a card. The **+** on a column adds a task on that day.
  - **Year:** all 12 months at once. The more there is to pay on a day, the stronger its color, and a red dot marks overdue days. Click a month to open it.
- **The chosen day, on the right:** its tasks with the same done circle and menu as the list, a quick-add box for that day (`Gym 1200 monthly` is added on that date), and on today, anything still overdue.
- **At a glance:** to pay, done, overdue and the biggest day for the month, week or year on screen.
- **Move by dragging:** drag a task to another day to change its date. Repeats continue from the new date, and Undo is offered.
- **Double-click a day** to add a task on it.
- **Phones:** days show colored dots, and the chosen day appears below the calendar.
- **Week strip:** the list keeps a compact strip of the current week above it. Arrows move between weeks, and clicking a day shows only that day. The **Week** button next to Filters hides it, and Page Settings › Week Strip sets the default.
- Page Settings › Open On can now be **Calendar**.
- Fixed: the Filters button always said "(1)" even with no filter set.

### Tools: layout choice and section pages

- **Tools › Settings › Layout:**
  - **Tabs on Top:** as before.
  - **Side Menu:** every section on the left with its color and tool count. The section you are in expands to list its tools, so you can jump between them. The arrow at the bottom (or the setting) shrinks the menu to icons.
- **Saving:** the layout is saved in this browser. Phones always get tabs.
- **Section pages** (Images, Photos, PDF, Utilities) now open with a header: icon, name, description and the number of tools, in the section's color.
- Tools files moved to **`web/tools/assets-v9/`** (browsers fetch fresh copies). Health deletes the old `assets-v8`.

### Health and Server Check in one place

- **Settings › Health** replaces the separate Server Check section. It has three sub-tabs:
  - **Overview:** version, schedule, last backup, domains, disk use and PHP errors, plus Updates, Disk Use, Backups and PHP Errors below.
  - **Domains and Uptime:** domain, SSL and hosting renewals, uptime and renewal tasks.
  - **Server Check:** outside connections and folder writes, plus PHP version, memory, upload limit and extensions (moved here from Health).
- **gear › Health** opens the same place.
- **Clickable cards:** Schedule opens Telegram, Last Backup opens Backup, and Domains opens its tab.

### Links

- The pencil menu now reads Colors, Text Sizes, then **Fetch Icons right before Page Settings**.

---

## 1.24.0

### Tasks (rebuilt, modeled on iCloud Reminders and TickTick)

- **Side panel:** colored smart lists with live counts and amounts: **Today, Overdue, This Week, This Month, All Tasks, Paused**. Click one again to clear it.
- **Lists:** your categories appear as a "Lists" section with a color dot and count, plus **No Category**.
- **Shortcuts:** Next 12 Months and Repeating Cost open Analytics. **Tasks, Analytics and Completed** are listed in the same panel.
- **Big title:** the header follows what you picked ("Overdue", "Domain", "This Week") with the task count and total underneath.
- **Quick add:** type one line and press Enter, for example `Gym fee 1200 monthly 5 Nov 9pm`.
  - Understands a price (`649`, `₹649`, `$12.50`), a repeat (`daily`, `monthly`, `quarterly`, `yearly`, `every 2 weeks`), a date (`today`, `tomorrow`, `in 3 days`, `5 Nov`, `Nov 5`, `5/11`, `2026-11-05`, `friday`) and a time (`9pm`, `21:30`).
  - The rest becomes the name. Undo is offered after adding.
  - A selected list or day is used as the category or date when you give none.
- **Rows:** a circle on the left marks a task done (or resumes a paused one). Below the name: due date colored by state, repeat, category, Online/Offline, notes. Price on the right. The **⋯** menu shows on hover (always on touch screens).
- **Groups:** the new default is **Date**: Overdue, Today, Tomorrow, Next 7 Days, Later This Month, then one group per month, then Paused. Click a group header to collapse it. Other groupings stay in Filters › Group By.
- **Task card:** slides in from the right (from the bottom on phones).
- **Phones:** the side panel becomes a scrolling strip of tiles, view buttons and list chips.
- **Kept:** calendar, filters, sort, Analytics, Completed, CSV, calendar (.ics) and print export, Year in Review, Telegram buttons, and the Page Settings options. "Summary Cards" off now hides the amounts and the two shortcuts instead of the whole panel.

### Settings

- **Presets have their own tab:** Appearance now has **Appearance · Presets · Colors**. Pick Dark or Light mode, filter by group, click a look to fill every color. Fine-tune in Colors afterwards.
- **More vibrant presets:** a new **Neon** group and many more bold looks.
  - Dark: Cyberpunk, Neon Pink, Electric Blue, Matrix, Volt, Aurora, Laser Lime, Sunset, Ruby, Ocean Deep, Grape, Tangerine, Candy Night, Emerald.
  - Light: Bubblegum, Citrus, Tropical, Coral Reef, Electric Lilac, Sunny Day, Sky Pop, Fresh Lime, Neon Day, Hot Magenta, Electric Cyan.
- **Accent color:** 8 vivid swatches added (pink, cyan, lime, orange, purple, blue, green, red).
- **Security order:** Password, Encryption, Two-Step Login, then Telegram Approval, Trusted Browsers and Devices, in the overview and in the sections.

### Health

- Leftover files from older versions are removed automatically when Health opens: the old Read Later list (`site-data/links/readlater.php`), `web/core/readlater.php`, `site-data/core/SETUP-CODE.txt` and old `web/tools/assets-*` folders. Pages still loading an older version are still reported.

### Tools

- **Section colors reach every page:** Images, Photos, PDF and Utilities pages, and each tool inside them, now use their section's color (buttons, highlights, borders, icons) instead of the old gold. They follow **Tools › Settings › Colours**, the same as the Tools main page. Pages Home, Recent, Search and Settings keep the main gold. A custom Page Titles color you set still wins.
- Tools files moved to **`web/tools/assets-v8/`** (browsers fetch fresh copies). Health deletes the old `assets-v7`.

### Removed as unused

- Links' offline backup viewer page (`web/links/offline-viewer.html`) and the start page README (`web/home/README.txt`).
- The start page's root `favicon.ico` copy option, its unused login helper and its unused data constant.
- Support for data formats from the first Links and Info versions (a plain `bookmarks.json`, the single-note and fixed-box layouts) and Info's old browser-storage migration.
- The old `SETUP-CODE.txt` handling, an unused accent list and an unused Home function.
- Old summary-strip and row styles in Tasks.

Backups made earlier still import. Old single-page backups from Links, Info and Cards are still accepted.

---

## 1.23.0

### Fixed

- **Telegram settings are saved safely.** Reminders, the backup sender, the bot and Settings no longer overwrite each other. The bot can no longer handle a message twice, and a Settings change can no longer be undone by a running job.
- **Domain watch is saved safely.** A cron check no longer undoes a domain you added, deleted or gave a hosting date meanwhile.
- **Adding a domain checks only that domain** (not all of them).
- **Telegram "Done" replies** arrive even when a task name contains `&` or `<`.
- **The cron line in Settings › Telegram** now shows every 5 minutes.
- **Browser updates no longer log you out.** Your session is tied to the browser type and system, not its version number.

### Security

- **Update address (Health):** every redirect is re-checked and pinned to a public address, so it can't reach your own network.
- **SSL check** connects to the address it already checked.
- **Background-source API keys** (Unsplash, Pixabay, custom headers) are never sent over a connection whose certificate wasn't checked.
- **The start page** sends a Content Security Policy like the other pages.
- The Home API no longer accepts its token in the address. Tab names in the bar are escaped. Links' restore rejects icon names starting with a dot. Cards saves are locked. `lib.php` and `config.php` can't be opened directly.

### Faster

- The start page groups saved photos by source once per load.
- With instant replies off, page views ask Telegram for new messages at most every 10 seconds (a login waiting for approval still checks every 3).
- The time-zone list, data folders and due-task lists are worked out once per request.

---

## 1.22.0

- **Security overview:** new **Two-Step Login** row (On with recovery codes left, or Off). The Log In row is now **Password**.
- **Telegram approval:** the separate backup codes are gone. Without your phone, use a **two-step recovery code** (offered at login only when two-step is on). Other fallbacks stay: Telegram down lets you in, and deleting `site-data/core/login-approval.php` turns approval off.
- **Passphrase minimum:** 8 characters instead of 10, the same as the password.

---

## 1.21.0

- **Settings in five sections:** **General** (General · Navigation · Pages), **Appearance** (Appearance · Colors), Telegram, Security, Server Check. Old shortcuts still work.
- **Smoother movement:** sections and sub-tabs fade in, a highlight slides under the chosen sub-tab, dialogs ease in and out, folded parts open smoothly. Links tab switches and Tasks view switches ease in too.
- **Capitalized labels** across all pages and Tools ("Private page" → "Private Page"). Sentences and hints stay as they are.
- **Shorter help text:** about 30 long explanations cut to one line.
- **One login only:** the old per-page password boxes in Links, Info, Cards and the start page are removed; everything goes through the site login.
- **Security headers:** Info, Cards and Tasks now send a Content Security Policy (Links already did). HSTS is sent on HTTPS, also behind Cloudflare. Info's API uses the site's security headers.
- **Removed dead code:** old password dialogs, the start page's unused login counter, and the old Tools branding editor.

---

## 1.20.1

- **Fixed:** the Cards page showed blank (a missing tag hid everything under the header). No data was affected.

---

## 1.20.0

- **Read Later removed** everywhere: the Links badge, menu entries, dialog, API, bookmarklet and the bot's `/later` command.
- **Security › Encryption** is one section for Info's encrypted tabs and backup files: your site password or one separate passphrase, an "Encrypt Backup Files" switch, and "Remove from Info Tabs".
- **Telegram settings:** an overview, then folded parts (Bot Connection, Messages, Backups to Telegram, Two-Way Bot, Schedule).
- **Colors presets** are folded until you open them.
- **Links:** "Edit raw data" removed. The Colors dialog shows one mode at a time, grouped into Tab Ribbon and Category Names, with a sample and reset on each row.
- **Info:** Export now sits right above Page Settings; the password and encryption blocks left Info's settings; the pencil on the selected tab is visible again.
- **Info and Cards Text Sizes** use the same dialog as Links (sliders with a live sample).
- **Cards menu:** grouped into Add, Manage, Page Look and Export.
- **Tasks Page Settings:** what opens first (view, range, sort, calendar), week start, date style, summary cards.
- **Tools:** Branding removed from its settings; a new **Colours** card (a color per section and per page part); a new first page with search, popular picks, recently used and one colored block per section.

---

## 1.19.0

- **Settings › Security** became the one place for every password, with an overview of what your password protects.
- **Info encrypted tabs:** switch between your site password and a separate passphrase, change it, or remove encryption (tabs become normal private tabs).

---

## 1.18.0

- **One password for everything:** the site password can also lock Info's encrypted tabs and backup files (including Telegram backups). Changing the password brings both along.
- **Trust this browser for 30 days:** skips the two-step code and the Telegram tap on that browser. The password is always needed.
- **Encrypted tabs open by themselves** when you log in, and can stay unlocked on that device until you log out.

---

## 1.17.0

### Added

- **Encrypted backups** (Backup › Encryption).
  - Set a backup passphrase and backup files are encrypted with AES-256-GCM before they leave the server. The key is derived from the passphrase with PBKDF2-SHA256 (310,000 rounds).
  - Telegram backups are always encrypted once a passphrase is set, and downloads get an "Encrypt this file" option.
  - Import asks for the passphrase and decrypts in your browser. The passphrase is never stored, and a wrong passphrase or a tampered file is rejected.
- **Approve logins in Telegram** (Settings › Security).
  - After the password (and two-step code), a new browser waits until you tap Approve on the bot's message. Deny turns it away.
  - "Trust this browser for 30 days" skips the question; trusted browsers are listed with Remove.
  - Fallbacks:
    - If Telegram is unreachable, the login goes through.
    - 8 one-time backup codes are shown when you turn approval on; two-step recovery codes work too.
    - Deleting `site-data/core/login-approval.php` turns approval off.
  - Only the browser that started a login can finish it.
- **Two-way Telegram bot.**
  - Done and Skip buttons under Due Now messages and the daily digest.
  - Commands: `/today`, `/week`, `/next`, `/add` (plain text such as `Netflix 649 monthly 5 Nov`), `/done`, `/later`, `/backup`, `/status`, `/help`.
  - Any link you send is saved to Read Later.
  - Only your own chat is answered.
  - Instant Replies (webhook, checked with a secret) or polling through the cron job and open pages.
- **Domain, SSL and hosting watch** (Health › Domains and Uptime).
  - Domain expiry comes from RDAP; SSL expiry is read from the live certificate; hosting renewal is a date you enter.
  - Uptime is checked every 5 minutes. Telegram alerts you after 2 failed checks in a row, and again when the site is back.
  - SSL warning at 7 days or less.
  - Renewal tasks are created in Tasks and move by themselves after renewals.
- **Year in Review PDF** (Tasks › Analytics), two pages:
  - totals, paid by month and by category
  - the biggest payments and price changes
  - Online vs Offline and next year's repeating costs
- **Read Later**: a badge on the Links tab counts unread links. Save from the dialog, from a "Save to Read Later" bookmarklet on any website, or by sending links to the bot. Opening a link marks it read.
- **Health** (gear › Health).
  - Status cards for version, schedule, disk, last backup and PHP errors.
  - Disk use per section and backup details.
  - PHP errors from your host's `error_log` files, with Clear.
  - Leftovers from older updates, an optional update address, and server limits and extensions.
- Gear menu: Read Later and Health entries.

### Changed

- The cron job now runs the bot, the domain watch, and reminders and backups. Every 5 minutes is recommended.
- Bundled the jsPDF library (MIT), loaded only when you make a PDF.

---

## 1.16.0

### Fixed

- **Settings saves undone in the background.** Recording a backup date, for example during a Telegram backup, could write back an older copy of the settings and undo a save made meanwhile. Every settings write now goes through one locked update that reads the latest settings first.
- **Save stuck after a network error.** The Save button stayed disabled with no message. Failures now show a clear message, and Save works again.
- **Save disappeared** when you changed something and then switched to a section that saves on its own. It now stays visible while anything is unsaved.
- **A saved theme was ignored on other devices** that had used the theme button. Saving a theme now applies to every browser on its next visit.
- "Use the Preset's Accent Color" turned itself back on after a refresh. It's now remembered, along with the preset group you last viewed.

### Changed

- **Presets:** 47 in total, in groups with filter chips and counts: Site Looks, Editor Classics, Modern, Vivid, Soft and High Contrast. The heading shows the current preset or "Your Own Mix". All presets meet 4.5:1 text contrast.
- New dark presets: Material Palenight, Kanagawa, Everforest, Ayu Mirage, Night Owl, Synthwave '84, Cobalt2, Shades of Purple, Horizon, Pure Contrast, Night Contrast.
- New light presets: Quiet Light, Tokyo Night Day, Ayu Light, Everforest Light, Kanagawa Lotus, Mint, Lavender, Peach, Sky, High Contrast.

---

## 1.15.0

### Fixed

- **Theme switches in Settings were saved instead of previewed.** Switching Colors to Dark Mode to edit it, or picking a theme in Appearance, permanently changed your browser's theme, even without saving. They're now previews: closing Settings returns to your actual theme, and saving a new theme also applies it to this browser.

### Added

- Popular color schemes with their own accent colors: Dracula, Nord, One Dark, Tokyo Night, Catppuccin Mocha and Latte, Gruvbox and Gruvbox Light, Solarized and Solarized Light, Monokai, GitHub Dark and Light, Rosé Pine and Rosé Pine Dawn, One Light and Nord Snow.
- "Use the Preset's Accent Color" switch. Preset previews show text lines.

---

## 1.14.0

### Added

- **Menu bar colors:** Bar Background, and Bar Tabs and Icons, for the top bar, sidebar and dock in dark and light mode. The start page keeps the bar see-through.
- **Colors redesign:**
  - edit one mode at a time (Dark or Light), with live preview
  - groups for Menu Bar, Page and Text
  - presets, and reset per color or per mode
  - Page Backgrounds for the current mode
- **Backup redesign:**
  - a status card with last backup, reminder and Telegram status
  - Export open, with "Choose Tabs" per part
  - Import folded, with drag and drop
  - Earlier Versions folded by default, 20 at a time with Show More

### Changed

- **Settings reorganised:** General (name, logo, time zone), Appearance, Colors, Navigation, Pages, Telegram (renamed from Reminders), Security, Server Check.
  - Each section has a title and says whether it needs Save Settings.
  - Closing with unsaved changes asks first.
  - Settings reopens on the last section used.
- **Speed:** Settings, Security, Telegram, Server Check and Backup moved to `shell-admin.js`, loaded only when opened (prefetched while you're logged in). Every page now loads 64 KB of script instead of 114 KB, and visitors never download the admin part.
- **Speed:** versioned files (`?v=`) in `web/core` and the start page's assets are cached for a year instead of re-checked on every page view.
- Code organisation: `shell.js` has a numbered table of contents and one documented connection to `shell-admin.js`. The code map in the zip's README covers every file.
- Server Check has its own icon.

### Fixed

- Closing Settings without saving left previewed colors on the page.

---

## 1.13.0

### Added

- **Telegram login alerts** with time, IP address, country and device:
  - every login, and logins paused after wrong passwords
  - password changes and other devices logged out
  - two-step login turned on or off, and new recovery codes
  - a backup restored
- **Backups to Telegram** every 1, 3, 7, 14 or 30 days, plus Send Backup Now. Each counts as a full backup, so the Backup icon turns green. Very large sites are sent as `.json.gz` (bots can send up to 50 MB).
- Import accepts `.json.gz` files.

---

## 1.12.0

### Added

- **Task card:** clicking a task shows everything about it (status, price, due date, the next three dates, reminder, website, notes, recent completions), with Mark Done, Edit, Skip, Pause, Duplicate and Delete. Links from search and Telegram open it.
- **Completed view:** the last 500 completed or skipped entries, by month, with paid totals, search and filters. Older histories were moved in automatically.
- **Range tabs:** All Tasks, This Week, This Month, This Year, with counts; overdue tasks show first.
- **Summary strip:** Overdue, This Week, This Month, Next 12 Months and Repeating Cost, each clickable.
- Notes in a tooltip on hover.

### Changed

- Tasks design: slimmer bars with a date tile.
- New colors:
  - Status: red for overdue, orange for today, gold for due soon.
  - Each category keeps its own color.
  - Online is cyan and Offline is violet.
- Add Task no longer has Paid With or Autopay. Saved values are kept.
- **Telegram messages:**
  - Due Now is a full card (date and time, price, repeat with the next date, category, Online/Offline, notes, website).
  - The digest has section totals and a detail line per task.
  - The backup reminder includes the last backup date.
- Every place that saves or sends data now handles invalid characters (for example text pasted from PDFs) instead of failing silently.
- Browser permissions header added: no camera, microphone, location or payment access.

### Fixed (same version, later update)

- **Start page video uploads failed silently.** Error messages were drawn behind the open settings sheet. Messages now always show on top, on the start page and site-wide.
- **Uploads above the host's limit:** large files are now sent in pieces under your host's limit and joined on the server (tested with 14 MB under a 2 MB limit). There's a clear message for files over 40 MB or unsupported formats such as iPhone `.mov`.

---

## 1.11.0

### Added

- **Site time zone** (default India Standard Time), used for "today", due times, backup dates and reminders, wherever the browser is.
- **Telegram reminders** (Settings › Reminders):
  - a daily digest at your hour
  - Due Now for tasks with a time
  - a daily backup reminder while a backup is due
  - cron job support, with a command and a key-protected address
  - guided setup with Find My Chat, Send Test and Send Now
- **Tasks redesign:**
  - compact bars with a status stripe
  - a month calendar (click a day to filter)
  - an Analytics view: by category, by month, Online vs Offline, biggest yearly costs, any period
  - a currency for each task
  - Online/Offline per task, with buttons and sorting
  - a cleaner toolbar with removable filter chips
  - Title Case labels
- Tasks appear in the site search while you're logged in.
- Tasks that are due today and past their time show as "Overdue Since 9:00 AM".

### Fixed

- **Tasks could lose a newly added task.** If you added one while a previous save was still in progress, the server's reply replaced the list. Saves now never overwrite newer local changes (stress-tested).

---

## 1.10.0

### Added

- **Tasks:** a private page for renewals and anything with a date.
  - name, date, time, repeat, price, category, reminder window, website and notes
  - sorted by due date automatically
  - Done moves repeating tasks to their next date, keeping the day of the month
  - history, pause, skip and duplicate
  - Undo for every action
  - CSV, calendar (.ics) and print export
  - included in Backup and Earlier Versions
- **Tab names and order:** rename, reorder (arrows or drag) or hide tabs in Settings › Navigation.
- **Backup icon:** green, red while a backup is due; clicking turns it green for a day.

### Changed

- Tabs now light up in your accent color on hover.
- Tools icon is now a wrench.

---

## 1.9.3

### Security

- **The setup code could be downloaded on some servers.** The setup file is now `SETUP-CODE.php`, which answers 404 in a browser even where `.htaccess` is ignored, as on nginx.
- **Icon and title fetching could be pointed at internal addresses.** Every IPv4 and IPv6 address of a site is now checked, connections are locked to the checked address, and names that don't resolve are refused.
- **Login lockout could be bypassed over IPv6.** An IPv6 visitor's whole /64 now counts as one visitor.
- **Password re-checks in Settings had no lockout:** changing the password, turning two-step login off and making new recovery codes.
- **A security token is now required on every change** in Links, Cards and Info, added automatically by `HUB.fetch`.
- **Stronger SVG icon checks**, and SVG icons are sandboxed when opened directly.
- **Cards' Excel library** is now served from the site itself instead of a CDN.
- **Sessions** are kept in `site-data/sessions` instead of the host's shared temp folder, so 30-day logins last.
- Smaller fixes: unsafe link types are blocked in search results, the lockout list no longer grows forever, old `.json` copies are removed after migration, and hidden file names are refused when restoring.

### Fixed

- **Info could lose all notes** if a save was interrupted. Saves are now atomic, and an unreadable file is never overwritten.
- **A bad logo upload deleted the existing logo**, and the same happened on restore.
- Server Check accepted PHP 7.4, but the start page needs PHP 8.
- One visitor could wear out every start page background by repeatedly reporting it as seen. Each visitor now counts once per photo.
- Replace-mode import ignored the 6-tab limit for Links.

### Changed

- **Speed:** Cards no longer loads an 880 KB Excel library on every visit, only when exporting. Photos, uploads and icons are cached long-term.
- About 200 lines of unused code removed.

---

## 1.9.2

### Sub tabs and Cards heading

- Unselected sub tabs in Links, Info and Tools are brighter, and their colored icons are stronger.
- The "Cards Holdings" heading is removed; the summary boxes start right under the bar. The default tab title is now "Cards".

### Baseline

The upload the 1.9.3 and later notes started from: Home, Links, Info, Cards and Tools, with one login, one Settings panel, Backup and Earlier Versions.

---

## 1.9.1

### Typed colors

- Every color swatch has a hex box beside it: Settings > Colors, Page backgrounds, the accent color, and Info's Edit tab dialog. Type `#1a1a1a`, `1a1a1a` or `#fff`; clear the box to return to the default. Invalid codes show a red border and are ignored.

---

## 1.9.0

### Text sizes, page backgrounds, Tools icons

- **Text sizes** in Info (tabs, box titles, box text) and Cards (page title, summary boxes, table text), under each page's pencil menu, with live preview. Saved for every visitor.
- **Page backgrounds** (Settings > Colors): Links, Info, Cards and Tools each get their own dark and light background.
- **Settings order:** Navigation, Appearance, Colors, Pages, Security, Server check. Opens on Navigation.
- **Font:** Trebuchet MS added to the site font list.
- **Bar tabs** (Home, Links, Info, Cards, Tools) are bold.
- **Tools tabs:** each has its own icon (wrench, clock, image, camera, PDF file, sliders); a `|` divider sits between Recent and the categories.
- Tools files moved to `assets-v6` (delete older `web/tools/assets*` folders).

---

## 1.8.0

### Tools menu, link icons, columns, font, menus

- **Tools tabs** reordered: Tools, Recent, categories, Settings at the right with a gear.
- **Fetch icons** is now a dialog: choose links without an icon or every link, with a progress bar and a plain summary. If the host cannot reach a site, the favicon-service address is saved so an icon still shows.
- **Messages** appear just under the bar (below a dialog while one is open) instead of hidden behind the bar.
- **Private tab lock** icon is larger and takes the tab's color.
- **Column colors** (Links): each of the four columns and the tab ribbon get their own color, for dark and light mode. The forced accent color on columns is gone.
- **Box headline color** (Info): per tab, in the Edit tab dialog.
- **One site-wide font** in Settings > Appearance; the font picker is removed from Links (which keeps Text sizes).
- **Pencil menu:** "Edit this page" / "Done editing", icons on entries, "Page settings" below a divider, a Back entry in sub-menus.

---

## 1.7.0

### Smoothness, Tools tabs, retries

- Fixed the old Tools intro reappearing after switching light and dark several times (stale cached files). Tools now loads from a versioned folder with its own offline cache.
- Removed the second-password feature entirely (Settings, Cards, server code, backups).
- Smooth transitions on buttons, links, fields, tabs, dialogs and sheets; respects "reduce motion".
- Tools sub tabs sit under the bar like Links and Info; Favourites removed; Tools section removed from main Settings (Tools settings stay under the pencil).
- API requests wait longer and retry quietly on dropped connections and gateway timeouts; Cards and Info no longer give up after a few seconds; the server allows 60 seconds per request; icon fetching runs two at a time.
- Icons right of the search box show the accent color on hover only.

---

## 1.1.0 to 1.6.x: Earlier Work

*No per-version notes were kept for this stretch, so what changed is summarized below, as recorded in the older changelog.*

### Data and security

- `site-data` lives inside the domain's own folder (not above it) and moves with the site.
- Locked three ways: `.htaccess`, an empty `index.html`, and every data file is a guarded `.php` file that answers 404.
- Fresh-site setup: a one-time `SETUP-CODE.txt` plus a Welcome box (site name and password); works on any domain.
- One bcrypt login for all pages, optional authenticator-app two-step login with recovery codes, login lockout, sessions tied to the browser, a security token on every change.
- Server-side fetches (icons, titles) re-check every redirect against private networks.

### Shared bar and navigation

- One bar on every page: logo and name, page links, search in the middle, icons on the right (Theme, Edit, Backup, Settings or Log in).
- Top bar, sidebar or bottom dock; the start page can hide the bar and show a corner gear menu instead.
- Unified search over Links, Info and Tools, with filters (scope, one tab, fields, whole words) and `links:` / `info:` / `tools:` shortcuts.
- One theme switch for every page with a smooth cross-fade; the site logo is also every page's tab icon.
- One Backup, Import and Earlier versions screen replaces the separate ones on each page.

### Pages

- **Info:** tabs drawn like Links tabs with a colored document icon; header removed; Export wording simplified; backup timer removed.
- **Links:** more reliable icon fetching with fallbacks; Server check pane in Settings to explain what the host allows.
- **Cards:** merged edit menu (Add card, Add holder, Edit…, Export…).
- **Tools:** simple home listing all tools under "All tools"; Privacy and Favourites removed.
- **Home:** tab icon uses the site logo; icon fallback chain; login handled by the shared box.

### Settings and wording

- Settings sections for appearance, colors (dark and light, per portion of the site), navigation, security and pages.
- Sentence-case wording pass across all pages; no branding anywhere (generic name, "Search" placeholder).

---

## 1.0.1 (2026-10-12)

Fix for a new install where the first-time setup screen pointed at a setup-code file that wasn't there.

### Fixed

- **Setup code not found.** The code file is now created as soon as the setup screen is opened, so it exists when you look for it.
- The setup screen now shows where the file really is. That depends on your host:
  - `site-data/core/SETUP-CODE.txt`, next to `public_html` (not inside it), or
  - `public_html/web/core/data/core/SETUP-CODE.txt`, when the host doesn't allow a folder outside `public_html`.
- The setup screen suggests turning on "Show Hidden Files" in cPanel File Manager if the folder isn't visible.
- Page assets now load with `?v=1.0.1`, so browsers fetch the fixed files instead of an old cached copy.

### Files changed

`web/core/boot.php`, `web/core/shell.js`, and the five page entry files (`web/home/index.php`, `web/links/index.html`, `web/info/index.html`, `web/cards/index.html`, `web/tools/index.html`) for the version number only.

### Planned at this point, and where each landed

These were requested after 1.0.1 and built in later versions.

- **Tasks**, a sixth section: 1.10.0 (rebuilt in 1.24.0)
- **IST as the site-wide default time zone:** 1.11.0
- **Telegram:** task and backup reminders in 1.11.0, login alerts and backups to Telegram in 1.13.0, login approval and the two-way bot in 1.17.0
- **Encrypted backups:** 1.17.0
- **Domain, SSL and hosting watch:** 1.17.0
- **Year in Review** as a PDF: 1.17.0
- **Read Later:** 1.17.0 (removed again in 1.20.0)
- **Health** page: 1.17.0

---

## 1.0.0 (2026-10-12)

First combined release.

### Added

**One login for every page**
- One password for Home, Links, Info, Cards and Tools. Your existing Links password carries over.
- First-time setup needs a one-time setup code that only someone with cPanel access can read.
- Optional **two-step login** with an authenticator app (QR code or typed key), 8 one-time recovery codes, and protection against reusing a code.
- Lockout: 5 wrong tries pause logins for 15 minutes, doubling each time up to 24 hours. Cloudflare-aware.
- Sessions last 30 days (HttpOnly, SameSite=Strict, Secure on HTTPS) and are tied to the browser.
- Changing the password or "Log out other devices" ends every other login on every page.
- Requests from other websites are refused, and every change after login needs a security token.
- Each page's own Log out button logs out everywhere. Clicking Edit while logged out asks for the login, then opens the editor.

**One Settings panel** (gear icon)
- **Appearance:** dark, light or follow device; accent color (6 gold presets plus a custom picker); the unified look on or off; site name.
- **Navigation:** top bar, sidebar or bottom dock, plus a switch for showing the bar over the start page photo. On phones the top bar and sidebar fold into a menu button and the dock stays at the bottom.
- **Security:** status checks (data folder, HTTPS, two-step), change password, two-step setup, log out other devices.
- **Backup & versions:** see below.
- **Tools branding:** title, emoji, logo and favicon, saved on the server. No more downloading and uploading `config.json`.
- **Page settings:** shortcuts to each page's own options (Links Colors and Text, Info Colors and Backup, Home Background, Cards main menu).

**One backup file**
- Export everything in one file, or untick parts, or pick single **Links** or **Info** tabs.
- Import accepts the new file and the old backups from Links, Info and Cards. Choose "Replace everything" or "Add or update these tabs only". A copy of what was there is kept first.
- Earlier versions of every page in one list, with Restore.
- Backup reminder on the bar (every 1, 3, 7, 14 or 30 days, or never).
- Info's encrypted tabs stay encrypted inside the file. The password is never included.

**Earlier versions for Cards and Home**
- Automatic versions at most every 10 minutes, the last 40 kept (Links and Info already had this).

**Shared bar and look**
- The same bar on every page, with one theme switch that all pages follow.
- AMOLED black with gold ("Balanced"): gold on active items, headings and main buttons. Each page keeps the colors that carry meaning (Cards' colored columns, Info's tab colors, link icons).

**Cards is private**
- Visitors get a login screen and **no card data at all**. The server sends cards only after login.

**Safer storage and a tidier folder layout**
- Data now lives in `site-data/`, next to `public_html` and not inside it, so no web address can reach it. If the host doesn't allow that, it falls back to `web/core/data`, locked by `.htaccess`.
- Files are written completely or not at all, so a crash can't leave a half-written file.
- Root `public_html` keeps only `index.php`. Everything else is in `web/` (`core`, `home`, `links`, `info`, `cards`, `tools`).
- Shared `.htaccess` rules: no directory listing, security headers, compression, and blocking of leftover or hidden files. They are written to be safe for every subfolder.
- Old addresses (`/web/links`, `/web/info`, `/web/cards`, `/web/tools`) keep working.

**One-time move of your data**
- On the first visit after uploading, existing Links, Info, Cards and Home data, with earlier versions and start page photos, is copied into `site-data/`. Nothing is deleted.
- The old `public_html/home` folder is locked afterwards.

### Changed

- **Home** moved to `web/home`. It now uses Trebuchet MS and no longer loads Google Fonts.
- **Links** no longer ships the 119 starter links; your live data is used.
- **Cards:** the built-in sample data was removed from the page code, so the page source no longer contains card details. Table headings use the accent color. The page ends your login on Log Out and has its own page-level content security policy.
- Password and device controls on Links, Info and Cards are hidden because they now live in Settings.
- Framing is allowed from the same site only (`SAMEORIGIN`; it was `DENY`).

### Included

- `web/README.txt` with the folder map, first upload, updating, forgotten password, lost authenticator phone, and security summary.
- A bundled QR code library (MIT licence) for two-step setup.

### Tested locally

Data move from the old layout, fresh install with setup code, visitor privacy on Links, Info and Cards, login and lockout, cross-site request blocking, two-step login with replay and recovery codes, log out other devices, saves on each page, full and per-tab backup, partial restore, old-format import, restoring earlier versions, all three bar styles, light and dark, and the phone menu.

### Known limits

- **Tools** stays its own compiled build, so its built-in sidebar stays. The navigation-style switch applies to the bar around it but doesn't replace that sidebar.
- Not testable on a local server: Cloudflare behaviour, Apache `.htaccess` rules, HTTPS, and downloading photos and icons from other sites. Check these on the live site.
- Cards' page code still contains one holder's first name, used only to keep that holder's color pink.
- Tools' branding switches from the old `config.json` to Settings the first time you save Settings.

---

## Good to Know

- **Lost passphrase = lost encrypted data.** Nobody, not even the server, can open encrypted tabs or backups without it. Data still locked the older way (with the site password) needs the password it was locked with.
- **Private is not encrypted:** private tabs, Links, Cards and Tasks are hidden from visitors but stored readable on the server. Only tabs you mark **Encrypted** (Info, Links) and backup files are encrypted.
- **Encryption:** AES-256-GCM with a key made from your encryption passphrase by PBKDF2-SHA256 (600,000 rounds for Info and Links tabs, 310,000 for backups). Before 1.28.0 the key could come from the site password instead.
- After changing a `shell.*` file, raise `HUB` in `boot.php` and the `?v=` in each page. After editing Tools files, move them to a new `assets-v#` folder name and update `index.html` and `sw.js`.
- After each update press **Ctrl+F5**. Delete leftover files only if Health lists them (it removes most by itself).
