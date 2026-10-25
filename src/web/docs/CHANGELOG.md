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
| 1.48.2 | The Settings menu as before 1.48, the Backup icon and gear back, a sun and moon theme button, a softer look for new sites, and the Security and Telegram cards fixed |
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

## 1.48.2

### Changed

- **The Settings menu is back to how it was before 1.48:** Site (General, Appearance), Protection & Data (Security, Telegram, Backup & Restore), then System (Updates, Health, Changelog). General has Basics, Navigation (where you choose Top Bar, Sidebar or Bottom Dock) and Pages; Appearance has Look, Presets and Colors, and Look shows the Font, Theme, Accent Color and Same Look on Every Page. Links to the System section of 1.48 open Updates.
- **The Backup icon and the gear are back** in every bar style, in place of the round menu: Backup is green, red with a dot while a backup is due, and the gear opens the Settings page.
- **The theme button shows a sun in dark mode and a moon in light mode,** in the app and on the website.
- **A new site starts with a softer look:** a deep grey instead of pure black, warm off-white in light mode, and a lighter gold accent. Existing sites keep their colors.
- Light mode: the green "good" labels and the Images teal and Photos blue in Tools are a little darker, so they stay easy to read.

### Fix

- **The cards in Settings > Security and Telegram look right again.** Since 1.48.0 they were squashed, with their icons above the card.
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
