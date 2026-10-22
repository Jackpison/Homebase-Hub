# Project Handoff: the site and its GitHub project (as of 1.37.0)

**To continue in a new chat, upload together:**
1. this file (`PROJECT-HANDOFF.md`),
2. the latest site zip (`site-update-1.37.0.zip`, which holds the whole site and its full history in `web/core-data/docs/CHANGELOG.md`),
3. anything else you want changed (screenshots of what looks wrong, the design PDF if you want to pick a website direction).

Then say what you want next. The first thing to settle is in **Part B, section 12** (repo name, owner, licence, signing key).

## Contents

- **Part A: the site** (the self-hosted app as it is today: structure, rules, design, testing, known limits)
- **Part B: the GitHub project** (public repo, GitHub Pages website, automatic and manual updates, signed releases, one-click install, PDF guide, phases, open decisions)

---

# PART A: THE SITE

## What it is

Self-hosted PHP + JavaScript site with one login: **Home, Links, Info, Cards, Tasks, Tools**, and a **Settings page**.
No database: data is guarded PHP/JSON files in `site-data/`.

```
<site folder>/
  index.php            the start page entry (only file in the root)
  site-data/           PRIVATE DATA (made by the site; updates never touch it; never delete)
  web/
    core-data/         the shared engine, its docs and YOUR files
      api.php cron.php telegram.php     the only PHP files a browser calls
      lib/             boot, backup, notify, approval, watch, health, update, overview, activity (blocked from the web)
      assets/          shell.js, shell.css, shell-admin.js, vendor/
      manifest.json    every file of the release with its SHA-256 (written when a release is built)
      docs/            README.txt, CHANGELOG.md
      media/           brand (logo), home/{photos,uploads,icons}, links/icons: the owner's own files
    home/ links/ info/ cards/ tasks/   index.html (or .php) + api.php + assets/<page>.css|js
    settings/          the Settings page (tiny shell; shell-admin.js draws it)
    tools/             browser tools, plain assets/ folder
```

Constants in `web/core-data/lib/boot.php`: `HUB_CORE` = web/core-data, `HUB_WEB` = web, `HUB_PUBLIC` = site folder.
Pages load the engine from `../core-data/...`; the shell finds the site root with `new URL('../../', CORE)`.

## Owner's rules (follow every release)

1. Zip name with dots: `site-update-1.37.0.zip` (never underscores). **Send only the update zip.** No dev kit, no handoff, unless asked. When the GitHub project exists (Part B) the same name is used for the Release asset.
2. `CHANGELOG.md` inside every zip (`web/core-data/docs/`), new version on top, plus a row in its Version Map.
3. Bump the version everywhere: `HUB` in `lib/boot.php` and every `?v=` (shell files, each page's `assets/`).
4. **Rewrite `web/core-data/manifest.json` for every release** (every shipped file with its SHA-256, excluding itself, `config.php`, `core-data/data/` and user files in `media/` except `.htaccess`). The updater and the Files tab depend on it.
5. No root `.htaccess` (it would overwrite the host's PHP settings). No site-data in a zip.
6. Tools files live in plain `web/tools/assets/`. `TOOLS_REV` in `web/tools/sw.js` and the two `?v=` on its page are a fingerprint of those files: recompute when any Tools file changes. Never mark Tools files `immutable` without `?v=`.
7. The owner does not want a dev kit or test files shipped. Test your own work thoroughly (PHP lint, a real server, real Apache for `.htaccess`, jsdom with real WebCrypto for browser logic) before delivering.
8. Do not redo the Cards tile redesign (the owner disliked it). One logo for the whole site: no per-page icons.

## Code rules (keep these true)

- **No inline scripts or inline handlers** in any page: CSPs forbid them. Tiny early scripts are files (`links-early.js`, `links-boot.js`, `info-boot.js`, `cards-boot.js`); Home's two data scripts carry a per-request nonce.
- **Every API action that changes something** checks login AND the CSRF token (`need_post()` + `need_admin()` in core, `require_admin()` in Home, `authed()` in Info). Read-only actions are the only exception. No action that nothing calls.
- **Security headers once:** PHP files send their own; `.htaccess` sets them only for non-PHP files (duplicates or conflicting values can make browsers ignore them).
- Include files start with the guard that answers 404 when opened directly.
- Media paths in PHP: `HUB_CORE . '/media/...'`. Saved values stay logical (`icons/...`, `photos/...`, `uploads/...`); pages map them (`mediaUrl()` in Links, `media()` in Home's app.js, `media_url()` in Home's PHP, shell search).
- Logo setting is `web/core-data/media/brand/logo-*` (the old `core/...` form is still read).
- After deleting a markup block, check tag balance (a stray `</div>` once broke Home's settings sheet). Every page must paint its own background and text color (a missing body background made Settings white in dark theme).
- Backups that touch media or settings must use the new paths (a backup once silently skipped link icons after a folder move).

## Design facts

**Settings page** (`web/settings/`, drawn by `shell-admin.js` via `HUB.mountSettings`): menu groups Site (General: Basics/Navigation/Pages; Appearance: Look/Presets/Colors), Protection & Data (Security, Telegram, Backup & Restore), System (Updates: Update/Files; Health: Overview/Domains and Uptime/Server Check). Overview first (cards + "things to look at"). Long sections (Security, Telegram, Backup) are tabs: `tabify()` turns each top-level `details.ix-acc` into a tab and the status above them into the first tab; hash links like `#security/encryption`. Save bar only while unsaved. Phones: menu first, section with back button. The bar's gear simply opens this page; the start page's corner menu (bar off) has just Settings and Log Out. No theme switch in the Settings menu (the bar has one).

**Encryption:** random keys made in the browser, wrapped with the passphrase (PBKDF2 600,000). Info key in `page.vault`, Links key in `settings.vault`, optional recovery wrap `rec`. Change Passphrase only re-wraps (Info first, rolled back if Links fails). Server marker `passphrase.json`; backups use a key from the same passphrase. Links encrypted tab: `enc1:` + base64(iv+ciphertext), icons stored once inside (`#i:N`).

**Backup:** one file holds every page with its settings, site settings, Telegram (bot token only in encrypted files) and the domain watch list. Not included: password, two-step login, trusted browsers, the passphrase. **Start Over** (Backup > Start Over): type ERASE + password; erases data, media, settings, Telegram, watch, passphrase; keeps password and two-step login.

**Updates tab** (`lib/update.php`): upload zip in 1 MB pieces; zip read in plain PHP; checks everything (safe names, only `web/` and `index.php`, file fingerprints vs the zip's own list, PHP syntax, newer version, writable, disk space, contains the updater); apply needs the password; snapshot to `site-data/updates/previous` (PHP kept as `*.php.stored`, state files guarded `.php`: nothing in site-data may ever be runnable), atomic per-file swap, old files removed, self-check, automatic rollback; Go Back. Never touches site-data, `core-data/media`, `core-data/config.php`, `web/tools/config.json` (made from settings, regenerated once per version). **Files tab** compares the server with `manifest.json`: lists files not in this version (error_log, copies, archives, unknown scripts), changed and missing files; deletes only files on that list, with the password.

**Telegram:** Setup (numbered steps + cron card), Backups, Messages, Instant Replies; the Status tab ("Right Now") says whether the schedule runs. Cron address is `.../web/core-data/cron.php`; webhook `.../web/core-data/telegram.php`.

**1.33.0-1.34.0 additions (the Settings page and what feeds it):**
- **Text rule:** labels, headings, buttons, tab names, status words and tooltips are Title Case; sentences and hints stay sentence case. It is "Website Password" (label) / "website password" (sentence), never "site password".
- **Shared building blocks** in `shell-admin.js`: `ecCard`, `ecField`, `ecChip`, `tabHead`, `tile`, `checkRow`, `spinRow`; CSS classes `ix-ec`, `ix-th`, `ix-hero`, `ix-ring`, `ix-tiles`, `ix-checks`, `ix-dev(s)`, `ix-mini`, `ix-empty`. New panes should use them. `cardify()` turns the plain "h3 + p + controls" panes (General, Navigation, Pages, Look: the `CARDIFY` map) into cards by moving nodes, so handlers keep working.
- **Settings sections:** Overview, General, Appearance, Security, Telegram, Backup & Restore (tabs: Status, Back Up, Restore, Export Data, Earlier Versions, Start Over), Updates, Health, **Changelog** (Versions, Version Map, Notes; read through the `changelog` API action; `clParse`, `mdBlocks` is a small safe markdown renderer). **Search Settings** is the `SEARCH` list in `shell-admin.js`: add a line when you add a setting.
- **Security > Devices:** `lib/activity.php`. `hub_alert()` also writes the history (`hub_act`); `hub_start_session` records a device; `hub_end_session` removes it; one-by-one logout puts a fingerprint in `site-data/core/revoked.php`, which `hub_admin()` checks only when that file exists. Only a hash of the session id is stored. Actions: `activity`, `session_revoke`.
- **Presets:** 166 built in (`PRESETS`, `PRESET_GROUPS`), search, Surprise Me; **My Presets** live in `settings.myPresets` (saved at once through the `settings` action, not with Save Settings, so they are in backups), exported and imported as JSON `{type:'site-presets'}`. **Page accents:** `settings.accentPg` (home, links, info, cards, tasks, tools), applied in `applyAttrs()` of `shell.js`. **Ink:** `inkFor()` sets `--ix-ink` (black or white) from the accent; page overrides use `var(--ix-ink)`, never `#000`.
- **Export Data:** `export` API action (admin, read only); CSV and JSON are built in the browser (`exportRows`).
- **Updates:** `up_check` stores the new zip's own changelog section (`notes`), shown as "What Is in This Update". It works only when the installed version already has this code (first usable from 1.34.0). **What's New** on the Overview uses `localStorage ix-seen-ver`.
- **Home photos:** `http_get(..., $saveTo)` streams a download to a file; `shrink_photo` uses `imagecopyresampled` with a memory budget and keeps the original when memory is tight. (Hosts with bundled GD count GD memory against `memory_limit`; the Ubuntu test PHP does not, so the crash itself could not be reproduced.)

**1.35.0 findings worth knowing:** Info's Export dialog (All Tabs / Current Tab, PDF / Text) had been calling missing functions since at least 1.32.1; now `exportText`/`exportPdf` in info.js (PDF via jsPDF 4.2.1, built-in Helvetica: Latin-1 only, so non-Latin text belongs in Text export). Info's own backup timer, reminder and versions dialogs were removed (Settings covers them) with their 4 server actions. Dead-code checks used: PHP functions, API actions vs callers, JS functions, and CSS classes/ids vs every page and script including the Tools bundle, keeping names built in code (`'k-'+kind`, `'gh gk-'+k`, `'mg r'+rows`, `'c-'+color`).

**1.36.0 additions:**
- **Home speed:** each new photo also gets `name-p.jpg` (center 3:4 slice at the photo's own height; `photo_make_portrait()` in `home/lib.php`, called in `pool_download`, removed by `photo_unlink()`); `pool_public()` adds `p:1`; `index.php` preloads the right one with media queries (`(max-aspect-ratio: 3/4)`); `app.js` `bgSrc()` picks it and swaps on rotation. Landscape and uploads use the full photo. Preload priority is `low` (the photo fades in anyway).
- **`shell-settings.css`** now holds every rule that starts with `#ix-page` (Settings page); `shell.css` is only what all pages need. The Settings page links it; `adminJs()` in `shell.js` loads it on other pages only when a Settings part opens. Add Settings styles to `shell-settings.css`, never to `shell.css`. Dialog classes used by the four `#ix-dlg` dialogs (login, setup, approval, Text Sizes) must stay in `shell.css`.
- **Info layouts and boxes (1.37.0):** `tab.layout` is `cards` (default; a stored `classic` reads as cards, `tab_layout()` in `info/api.php`) or `doc`; set as `data-lay` on the panel by `setHead()`; picker `#etlays`; outline for doc (`renderOutline`, `spyOutline`). **A tab has 1 to 12 boxes (`MAXBOX`), each with a stable `id`** (8 hex; the two boxes of older pages are `"0"` and `"1"`, so their drafts and saves keep working) and optional `w` (`third|half|twothirds|full`) and `h` (`short|tall|xtall`), empty = the layout's own (half in cards, full in doc). Server: `norm_boxes()`, `norm_box()`, `box_id_ok()`, `save` takes the box **id** (old integer 0/1 still accepted), new action **`save_boxes`** `{tab, boxes:[{id|null,w,h}], rev}` adds/removes/reorders/resizes under the page `rev` (a stale page gets 409), `remove_vault` handles any box count. Client: `mkBox` ids, `mergeTabs` matches boxes by id, `syncBoxes(t)` reconciles the DOM (boxes live in `.bxs` inside the panel, with a `+ Add Box` tile), `saveBoxList`, `addBox`, Box Settings dialog `#bxdlg`. CSS: `.bxs` is a 12-column grid, `.box[data-w]` sets the span, `.box[data-h]` the min height; the notebook-card look is the base `.box` style and the document look overrides it under `.boxes[data-lay="doc"]`. Tests that matter: add/resize/move/delete in both layouts, boxes in an encrypted tab, Settings remove-encryption with 3 boxes, backup/restore, and a stale page saving after a reorder. **An Info page left open from before the update keeps working for its first two boxes but should be reloaded to see the others.**
- **Settings:** `SEARCH` list, a pill on every menu item (`decorateNav`), jump chips and the setup banner on the Overview, and **Guided Setup** (`pSetup`, `setupSteps`, `WZ` holds what you typed in memory only). It reuses `PP.set`, `PP.makeRecovery`, `twoStep(box)` and the backup fetch; `secRefresh` updates only the ring while a step is open.

## Version history (compact)

1.26: hardening. 1.27-1.28: encrypted tabs, one passphrase. 1.29: new layout, per-page assets, Cards table kept. 1.29.x: media into `core/media`, no inline scripts, security pass. 1.30: Start Over, backups carry Telegram and watch list, one logo. 1.31: Settings page, upload-to-update, file check. **1.37.0:** Info boxes (up to 12, sized, ordered), Classic layout removed. **1.36.0:** Home faster (phone photo copies, Settings CSS split), Info layouts, Guided Setup, status pills. **1.35.0:** Info exports fixed, Info's broken timer removed, dead styles removed, every page minified. **1.34.1:** shell minified. **1.34.0:** devices and login history, Settings search, Export Data, My Presets, page accents, ink follows accent, update preview, What's New, jsPDF 4.2.1. **1.33.0:** Home memory fix, Changelog section, modern Security and Telegram, 94 more presets, Title Case everywhere. **1.32.1:** nothing in site-data can run as code; Settings group renamed Protection & Data; corner menu simplified. **1.32.0:** engine moved to `web/core-data`; gear opens Settings; Navigation lost "Edit the Start Page"; "Updates & Files" renamed "Updates"; Encryption, Telegram Setup and Back Up tabs redesigned.

## How to release (since 1.34.1; becomes the GitHub release workflow in Part B)

1. Unzip the latest zip. Copy every `docs/src/<page>/<name>.src.<ext>` back over `<page>/assets/<name>.<ext>` (`core-data` means `core-data/assets/`), then delete `docs/src`: the working tree then holds readable code. Make the changes there.
2. Bump the version everywhere (`HUB`, every `?v=`), write the CHANGELOG entry and Version Map row.
3. **Build:** copy the tree to a build folder; for every `.js`/`.css` in `core-data/assets/` and `<page>/assets/` (not Tools, not vendor), save the readable file as `docs/src/<page>/<name>.src.<ext>` and minify it in place with `esbuild --minify --keep-names --target=es2017` (`npm i esbuild`); write `manifest.json` (every file, SHA-256, sorted, no trailing newline); zip with `zip -X -r -D`. Test the **build**, not the readable tree.

## Real-browser testing (available since 1.35.0)

- `pip` Playwright is present; get a browser with `python3 -m playwright install chromium --with-deps` (the Ubuntu `chromium-browser` package is a snap stub and does not work). Launch with `args=['--no-sandbox']`.
- **Block external requests** in the test browser (`ctx.route('**/*', ...)` abort anything not on the test host): Home asks Google and DuckDuckGo for favicons and those can hang here; use `wait_until='domcontentloaded'`, never `load` or `networkidle`.
- **Background jobs die when a tool call ends**; run captures inside one call. Take screenshots with animations frozen, save each screen as it is taken, and compare two sites side by side (an old tree on one port, the new on another) with Pillow: that is how the CSS split was proven identical on about 110 screens.
- Real Apache for speed and `.htaccess`: `apt-get install apache2 libapache2-mod-php8.3`, a hand-written config (see the handoff of 1.35.0 notes: load authz_core, dir, mime, headers, rewrite, deflate, expires, alias, setenvif, filter, php modules, `AllowOverride All`). Measure with CDP throttling (`Emulation.setCPUThrottlingRate` 4, `Network.emulateNetworkConditions` latency 150, 1.6 Mbps).
- `HUB.login()` returns a promise that resolves only when the dialog closes: call it as `void HUB.login()` in `evaluate`.

## How to test (what worked, and the traps)

- No real browser exists in the build environment. Use **PHP 8.3 (`apt-get install php-cli php-gd php-curl php-mbstring php-zip`)** and **jsdom 24** (`npm i jsdom`) against the real backend: copy the site, `PHP_CLI_SERVER_WORKERS=6 php -S 127.0.0.1:8123 -t <site>` (a single worker **deadlocks the updater's self-check**: the apply fails and rolls back), `GET state` once, read the code in `site-data/core/SETUP-CODE.php`, `POST setup`, keep the `hub_session` cookie.
- **Sessions are tied to the User-Agent:** send the same UA from jsdom's fetch that the login used, or `admin` is false and Settings shows the login gate. jsdom also needs `TextEncoder`/`TextDecoder`, `crypto` (Node's `webcrypto`), `matchMedia`, `HTMLDialogElement.showModal`, `URL.createObjectURL` stubs.
- `pkill -f "php -S"` kills its own shell; find the pid through `/proc` instead. `filesize()` is cached: `clearstatcache()` in tests.
- Test updates for real: build the zip, install the *previous* zip on a fresh site, upload in 1 MB pieces to `update_chunk`, `update_check`, `update_apply`, then `files_scan` must show 0 changed, missing and extra.
- Rebuild `manifest.json` and the zip after the last edit: every file with its SHA-256, sorted, no trailing newline.

## Notes

1.32.0 was installed by hand (the 1.31.x updater cannot apply the new layout). From 1.32.1 the site updates itself from Settings > Updates. Going back from 1.32.1 to 1.32.0 cannot go forward again with the button (the older updater cannot read the new `.stored` copy): upload the newer zip instead.

## Known limits

- Never tested on the owner's live host (PHP version, OPcache, Cloudflare, mod_security). Tested on PHP 8.3, real Apache, simulated browsers.
- **No real browser was ever available:** layouts, the strict CSP, dark/light looks and the redesigned tabs are verified structurally only. Ask the owner what looks off.
- SheetJS is 0.18.5 (newer versions are not on npm; it only writes the owner's own data). jsPDF is 4.2.1: the Year in Review PDF was compared with 2.5.1 and is pixel identical.
- **Every own script and stylesheet is shipped MINIFIED** (the shell plus Home, Links, Info, Cards, Tasks and Settings assets: 18 files). **The readable source is in `web/core-data/docs/src/<page>/<name>.src.js|css`** (for example `docs/src/core-data/shell-admin.src.js`, `docs/src/info/info.src.js`). **Edit those, never the minified files.** Tools is a compiled bundle with no source here: leave it as it is. `docs/` is closed to browsers by its own `.htaccess` (tested on real Apache 2.4: `docs/src/*`, `CHANGELOG.md`, `manifest.json` and `lib/` answer 403; `site-data` answers 404; the assets answer 200).
- The Info API takes its action from the JSON **body** (`{action:"save_boxes", ...}`), not the URL; without one it means `save`.
- Logins made before 1.34.0 are not in the Devices list until they log in again.
- Not built (asked to skip or too large): passkey login, dead-link checker, bookmark import, Telegram snooze, card fee reminders, an accessibility pass (focus order and keyboard use of the new tabs and tiles are untested).
- Tab names stay readable; search finds a locked tab's name only. Lost passphrase and lost recovery key mean lost data. Backups made before a passphrase change need the old one.
- An update replaces the site's own code: only upload zips from a trusted source (the tab shows the zip's SHA-256 to compare).
- **Not built yet (Part B):** updates from GitHub, signed releases, one-click install, the website, the PDF guide. Until they exist, updates are manual uploads only.


---

# PART B: THE GITHUB PROJECT

## 1. The goal

The site becomes a public project on GitHub with:

1. **A public repository** under the GPL-3.0 licence, holding the readable source, a build, and automatic releases.
2. **A project website** on GitHub Pages (`OWNER.github.io/REPO`): calm design, features, real screenshots, install guide, changelog, and the Telegram contact. English only.
3. **Updates from GitHub and the manual zip upload, both kept.** The site can check GitHub for a new release. The daily check is **off by default**; a "Check now" button always works. Installing is **one click plus the website password**.
4. **A detailed PDF guide** covering every feature and every setting, built from real screenshots of the running site.

## 2. Decisions

| Topic | Decision |
|---|---|
| Licence | **GPL-3.0** (the full, unmodified licence text from gnu.org goes in `LICENSE`) |
| Repository visibility | **Public** |
| Project name | **Homebase Hub** (chosen by the owner). Repo name: `homebase-hub` |
| Repo owner | **Jackpison** (GitHub account, created) |
| Repo URL | https://github.com/Jackpison/Homebase-Hub (created, public, GPL-3.0 licence chosen at creation) |
| Repo description | See section 3 (the owner's text, improved) |
| Website address | **GitHub Pages default** (`OWNER.github.io/REPO`), no custom domain |
| Daily update check | **Off by default.** Turned on in Settings › Updates. "Check now" always available |
| Website language | **English only** |
| "Coming soon" features | **None for now** |
| Telegram contact | **@Jackpison** (https://t.me/Jackpison), for feature requests and questions, on the website, in the README and in the guide |
| Updates | **GitHub fetch and manual upload, both kept** |
| Install style | **One click plus the website password** |
| Guide | **Detailed PDF**, every feature and setting |
| Signing key | **Dropped** (owner's decision). Consequences in section 5 |
| Name | Not final (section 3) |

## 3. Name and description

**Name:** Homebase Hub (chosen). Repo slug: `homebase-hub` (GitHub does not allow spaces).

Search check: "Homebase" appears in several unrelated projects (for example a "homeBase" self-hosted stack, a "HomeBase" Vue app, and the archived beakerbrowser "homebase"). "HomeHub" is a different, popular self-hosted family dashboard with about 1.2k stars. Expect some confusion in search. Mitigate it with the topics and the README's first line (below), which name the project as a self-hosted personal workspace.

Changes that follow from the name (later phases, not now): the site's default site name ("My Site") becomes "Homebase Hub" for new installs. Existing installs keep their own name.

**Repository description (GitHub "About" field, 350 characters maximum), recommended:**

> A self-hosted personal workspace: start page, links, notes, cards, tasks and browser tools in one place. Private by design, with encrypted data, secure login and built-in backups. Runs on any PHP host.

**Alternative:**

> One home for your links, notes, cards, tasks and tools. Self-hosted, private by design, with encryption, secure login and built-in backups.

**README first line:** "Homebase Hub is a self-hosted personal workspace: your start page, links, notes, cards, tasks and browser tools, on your own server."

**Suggested topics (GitHub allows up to 20):** self-hosted, php, javascript, personal-workspace, start-page, bookmarks, notes, task-manager, encryption, privacy, backup, pwa.

## 4. What GitHub can and cannot do (checked during planning)

- **GitHub Pages** is free for public repos. The website is static HTML and CSS, generated by the release workflow from the docs and `CHANGELOG.md`.
- **GitHub Releases** holds the update zip and its checksum. Size is no problem (the zip is about 15 MB).
- **GitHub API rate limit: 60 requests per hour per IP without a login.** The planning sandbox hit this limit during the session (the response headers showed 60 of 60 used). Shared IPs run out, so the daily check must not depend on the API. Each release therefore publishes a small `latest.json` on GitHub Pages, and the API is only a fallback.
- **Sandbox limits:** the planning sandbox can reach github.com but has no GitHub login. It cannot create the repo, push, or run Actions. The owner does those steps. The sandbox can test the update code against a local stand-in for GitHub first (section 8).

## 5. Signing: dropped, and what that means

The owner has decided not to use a signing key. Without one, the protection for GitHub updates is the following, in order:

1. **HTTPS** to github.com and the Pages site.
2. **A SHA-256 checksum** of the zip, from `latest.json`, checked before anything is written. This catches corrupted or partial downloads. It does **not** prove the release is genuine: the checksum comes from the same GitHub account as the zip.
3. **A human decision:** nothing installs by itself. The owner presses Install, reads the changelog and the "What Is in This Update" preview, then types the website password.
4. **The existing safety net:** snapshot before install, self-check after, automatic rollback on failure.

What this means in practice: if someone gets into the GitHub account that publishes releases, they could publish a malicious release, and an owner who installs without reading the changelog could install it. Mitigations that do not need a signing key, and are recommended:

- **Turn on two-factor authentication** for the GitHub account, and use a strong unique password.
- **Protect the `main` branch and version tags** (branch protection and tag rules), so only the owner can publish a release.
- **Use the GitHub Release page itself as the place to check:** the release notes and file list are visible there before install.
- **Keep the option open:** a signing key can be added later without changing the manual upload or the one-click flow. The site would then verify a signature in addition to the checksum.

Decision recorded: no signing key for now. Revisit if the project gains users or contributors.

## 6. The update protocol

Each release publishes, on the GitHub Release with the same tag:

- `site-update-X.Y.Z.zip` (dots, always)
- `site-update-X.Y.Z.zip.sha256`

And once per release, on GitHub Pages, `latest.json`:

```json
{ "version": "1.38.0",
  "zip": "https://github.com/OWNER/REPO/releases/download/v1.38.0/site-update-1.38.0.zip",
  "sha256": "...", "size": 15300000,
  "minPhp": "8.1", "notes": "short summary", "published": "2026-10-22T09:00:00Z" }
```

Site flow:

1. **Check** happens only when the owner presses "Check now" in Settings › Updates, or when the daily check has been switched on. The check fetches `latest.json`. If that fails, it tries the GitHub API once, at most once a day.
2. If a newer version exists: "Version X is available", with the changelog summary.
3. **Install** (one click): downloads the zip in pieces into `site-data/updates`, checks the size and the SHA-256, then runs the existing `up_check` (safe names, PHP syntax, writable, disk space) and shows the existing "What Is in This Update" preview.
4. The owner types the website password. Then the existing apply runs: snapshot, atomic swap, self-check, automatic rollback on failure.
5. **Manual upload** stays exactly as it is now.

Other rules:
- Only a newer version is offered. Going back uses the existing "Go Back" feature.
- Settings › Updates › "Check GitHub for updates" turns the daily check on or off. Turned off, the site makes no requests to GitHub at all.
- If GitHub is unreachable, the site says "Couldn't check" and keeps working.

## 7. Repository layout (proposed)

```
REPO/                        (name to be confirmed in the new chat)
  README.md                  what it is, screenshots, quick install, the Telegram contact
  LICENSE                    GPL-3.0 (the official text, unchanged)
  THIRD-PARTY.md             licences of every bundled library (see the open item in section 12)
  CONTRIBUTING.md            how to report bugs and ask for features (@Jackpison on Telegram)
  .gitignore                 site-data/, config.php, *.zip, build/, node_modules/
  src/                       the readable site (today's web/ and index.php, without generated files)
  tools/build.py             the build used by releases (minify, manifest, zip, checksum)
  tools/make-latest.py       writes latest.json
  docs/                      content for the Pages website and the PDF guide sources
  website/                   the GitHub Pages site (static HTML/CSS, real screenshots)
  .github/workflows/
    ci.yml                   on every push: PHP lint, JS syntax, the build, the browser tests
    release.yml              on a tag v*: build, create the release with zip and sha256,
                             update the Pages site and latest.json
  .github/ISSUE_TEMPLATE/    bug report and feature request (feature requests point to Telegram)
```

The readable source is the truth. Today's zip ships minified files with readable copies in `docs/src/`; in the repo the readable tree is the source and the zip is generated from it.

Licence headers: each file the project itself wrote carries a short GPL-3.0 notice (copyright year and owner, then the standard "This program is free software..." paragraph). The bundled third-party files keep their own licence headers.

## 8. Testing plan

- **Local stand-in for GitHub:** a static server serving a fake `latest.json`, zip and checksum. The sandbox cannot rely on the real API, so all update tests run here first.
- **Checksum tests:** a valid zip installs; a changed byte, a wrong checksum, a missing file, and a `latest.json` that does not match the zip are each refused with a clear message.
- **Real GitHub, once:** after the first real release, test the actual download from github.com and from the Pages site, on a live copy of the site.
- **Existing suites** (walkthrough, interactions, features, pages, Info, Telegram, the setup wizard, the updater test) must pass on the minified build before every release.
- **Website and guide screenshots** come from the running site (Chromium via Playwright), never from mockups.
- **Live host:** still untested. Ask the owner to run the Health page after the first GitHub-connected version is installed.

## 9. The website (to design next)

Pages, in order:

1. **Home:** the name, one sentence ("Your own start page, bookmarks, notes and tasks, on your own server"), real screenshots, Install and Guide buttons, the Telegram contact.
2. **Features:** Home, Links, Info, Cards, Tasks, Tools, Settings, each with two or three screenshots.
3. **Install:** requirements (PHP 8.1 or newer, HTTPS recommended, a web host with file access), the zip, first-time setup, and the one-click update.
4. **Guide:** link to the PDF, plus the same content as short sections.
5. **Changelog:** generated from `CHANGELOG.md`.
6. **Security:** how the password, two-step login and encryption work, and how updates are checked, in plain words.
7. **Licence and contact:** GPL-3.0 in plain words, Telegram @Jackpison for feature requests and questions, GitHub Issues for bugs.

Design direction (to confirm in the next chat): calm and soothing. Warm off-white or deep neutral backgrounds, one soft accent, generous spacing, large readable type, slow subtle motion that respects reduced-motion settings, dark and light modes that follow the visitor's system setting. Keep the site's own look so the website and the app feel like one thing. No frameworks, no trackers, optimised images. English only.

## 10. The PDF guide

- Built from the running site with Playwright, so every screenshot is real.
- Sections: introduction, installing, first-time setup, then one chapter per part (Home, Links, Info, Cards, Tasks, Tools, Settings), each with the features, every setting explained, and tips.
- The Settings chapter covers every tab: General, Appearance (themes, presets, colors, page accents), Security (password, encryption, two-step, login approval, trusted browsers, devices), Telegram (setup, backups, messages, instant replies), Backup & Restore (back up, restore, export, earlier versions, start over), Updates (GitHub check, one-click install, manual upload, files), Health, and Changelog.
- An appendix covers backups and recovery, QR codes for two-step login, and what survives if the site is gone. Tested in the earlier session: an encrypted backup restores onto a fresh site, and the passphrase opens its keys while a wrong passphrase does not.
- Every feature described must be checked against the code before it is written, because plain descriptions drift from the real UI.

## 11. Phases

1. **Settle the open items** (section 12).
2. **Repository and release pipeline:** the readable tree, build, manifest, zip, checksum, `latest.json`, the workflows, and the third-party licence list. Tested with a local stand-in.
3. **Site update code:** the check, download, checksum verification, the Install button, the daily-check switch (off by default), and the Health checks (outbound HTTPS). Tested against the stand-in, then against a real release.
4. **Website** on GitHub Pages, with real screenshots.
5. **PDF guide**, checked feature by feature.
6. **First public release** (1.38.0) and the first real update from 1.37.0.

Each phase ends with: tests passing, changelog entry, handoff updated.

## 12. Open items (for the new chat)

Decided: GPL-3.0 licence; public repo; GitHub Pages default address; daily check off by default; English only; no "coming soon" list; no signing key; Telegram @Jackpison; detailed PDF guide.

Still open:

1. **Repo owner:** decided (Jackpison). Repo created at https://github.com/Jackpison/Homebase-Hub (public, GPL-3.0). Note: the repo was created with a capital H in the name; GitHub URLs are not case-sensitive, so both spellings work, and the Pages address will be `jackpison.github.io/Homebase-Hub`.
2. **Third-party licences (must be done before publishing):**
   - Checked: jsPDF (MIT), the QR code library (MIT), and xlsx/SheetJS (Apache-2.0). All are compatible with GPL-3.0.
   - Not yet checked: the Tools bundle. It includes code under MIT, ISC and Apache-2.0, an LGPL library (libheif), a jszip file that offers a choice of licences, and model and language data files (`u2netp.onnx`, `eng.traineddata`) whose licences I could not confirm. Each must be checked against its upstream source before the release. Where a licence cannot be confirmed, the file has to be replaced or removed.
3. **Two-factor authentication on the GitHub account:** confirm it is on before the first release.

## 13. Things to avoid

- Never put `site-data/`, passwords, Telegram bot tokens or `config.php` in the repo. The `.gitignore` must cover them before the first push.
- Never let the update check install anything by itself.
- Never use the GitHub API for the daily check (rate limit).
- Never rename the internal `HUB` code.
- Never promise features on the website or in the guide that are not in the code.
- Never change the zip naming (dots, not underscores), and never drop `CHANGELOG.md` from the zip.
- Never publish a release before the third-party licence check in section 12 is done.

## 14. Current state

- Site version: **1.37.0** (`site-update-1.37.0.zip`, SHA-256 `e58983f7ccb94ec203a350c543a34c74f0377dc04610c65a09f4b2fc3e15ee45`).
- Tests: all suites pass on the minified build; the real updater upgrades 1.36.0 to 1.37.0 cleanly.
- Test scripts and the build script live in the sandbox (`/home/claude/test`, `/home/claude/gen/build.py`) and will not survive a new chat. Their purpose is described under "Real-browser testing" and "How to test" in Part A.
- GitHub project: nothing built yet. Planning only.
- Not yet tested on the owner's live host, in a real browser, or against a real GitHub release.

## 15. Creating the repository (GitHub "Create a new repository" page)

Use these settings:

| Field | Value | Why |
|---|---|---|
| Repository name | `homebase-hub` (created as `Homebase-Hub`, which also works) | Matches the project name. GitHub keeps the capitals you type; URLs ignore case |
| Description | The recommended text in section 3 | Shows on the repo page and in search |
| Visibility | **Public** | Decided |
| Add README | **Off** | The project pushes its own README. A GitHub-made README would conflict with the first push |
| Add .gitignore | **No .gitignore** | The project pushes its own `.gitignore`, which must exclude `site-data/` and `config.php` |
| Add license | **GNU General Public License v3.0** | Decided. GitHub then adds the official licence text as `LICENSE`, unchanged |

Then press **Create repository**.

After creating it, on the repo page:

- **About (gear icon):** paste the description, add the topics from section 3, and leave the website field empty until GitHub Pages is set up (then `https://OWNER.github.io/homebase-hub`).
- **Settings › General › Features:** keep **Issues** on (bug reports). Turn **Wiki** and **Projects** off. Turn **Discussions** off too, since feature requests go to Telegram.
- **Settings › Pages:** set later, when the website exists (source: the `website/` folder or a release workflow).
- **Settings › Rules:** add a tag protection rule for `v*` and a branch protection rule for `main` (only the owner can push). Set these before the first release.
- **Account:** turn on two-factor authentication before anything else (section 12).

Then the first push from the owner's computer: clone the empty repo (it contains only `LICENSE`), copy in the project files, commit, and push. The project files are produced in the next chat.

## 16. Status and checklist before the new chat (owner's list)

Done:
- Repository created: https://github.com/Jackpison/Homebase-Hub (public, GPL-3.0 selected at creation, README and .gitignore off).

To do in GitHub before the first push (owner):
1. **Account security:** turn on two-factor authentication (profile › Settings › Password and authentication).
2. **Repo › Settings › General › Features:** Issues on; Wiki, Projects and Discussions off.
3. **Repo › About (gear):** paste the description from section 3, add the topics, leave the website empty for now.
4. **Repo › Settings › Rules:** create a tag ruleset for `v*` (only the owner may create, update or delete tags). Create a branch ruleset for `main` that blocks deletion and force-pushes.
5. **Repo › Settings › Actions › General:** leave Actions enabled (the release and CI workflows need it).
6. **Check the repo page** shows the GPL-3.0 licence and the description.

Do not put these in the chat, the repo or any file: GitHub passwords or tokens, the website password, the encryption passphrase or recovery key, the Telegram bot token, or the Telegram chat id. Give them only to the site when asked, and never paste them into a chat.

Needed on the owner's computer before the first push: Git installed, and a way to push (GitHub Desktop, or `git` with GitHub's sign-in). The next chat will produce the project files; the owner commits and pushes them.

For the new chat, upload: `PROJECT-HANDOFF.md` and `site-update-1.37.0.zip`. Optional: the design PDF (`Website-Design-Directions.pdf`) if the website direction is to be chosen there.

Still open for the new chat: nothing that blocks the start. The first concrete step is the repository skeleton (Part B, section 7).

## 17. Exact GitHub settings for the rules (owner's steps)

Open https://github.com/Jackpison/Homebase-Hub, then **Settings** (repo tab, not profile) › **Rules** › **Rulesets** › **New ruleset**. Use rulesets (the current GitHub feature), not the older "Branches" page.

### Ruleset 1: protect version tags

Choose **New tag ruleset**, then:

1. **Ruleset name:** `Protect version tags`
2. **Enforcement status:** **Active**
3. **Bypass list:** **Add bypass** › choose **Repository admin** › mode **Always**. Without this, you could not create your own release tag. On this personal repo, the only admin is you.
4. **Target tags:** **Add target** › **Include by pattern** › type `v*` › Add.
5. **Rules:** tick **Restrict creations**, **Restrict updates** and **Restrict deletions**. Leave the other rules off.
6. Press **Create**.

Effect: only you (through the bypass) can create, change or delete tags starting with `v`. A release is made by you pushing a tag such as `v1.38.0`, which starts the release workflow.

### Ruleset 2: protect the main branch

Choose **New branch ruleset**, then:

1. **Ruleset name:** `Protect main`
2. **Enforcement status:** **Active**
3. **Target branches:** **Add target** › **Include default branch** (this is `main`).
4. **Rules:** tick **Restrict deletions** and **Block force pushes**.
5. **Do not tick** **Require a pull request before merging**. On a one-person project it would stop you pushing your own commits.
6. **Bypass list:** leave it empty. You can still push normal commits; only deletion and history rewriting are blocked.
7. Press **Create**.

Effect: nobody can delete `main`, and nobody can overwrite its history with a force push, including you. To rewrite history on purpose, edit the ruleset and turn the rule off for a moment, then turn it back on.

What these rules do and do not do: they stop accidents and mistakes (a wrong force push, a deleted branch, a tag moved by a script). They do not protect against someone who has your GitHub login with full admin rights, because that person can edit the rules. Two-factor login (section 16, step 1) is the real protection for that case.

### Related setting: limit what workflows can do

**Settings › Actions › General › Workflow permissions:** choose **Read repository contents and packages permissions**. Tick nothing else. The release workflow will ask for write access only in the job that needs it, which keeps the default token narrow.

### Check that it works

After both rulesets are active, from your own computer:

- Pushing a normal commit to `main` should still work.
- `git push --force origin main` should be refused with a message about a protected branch. (Only run this test on a throwaway commit, or skip it.)

### Test order

Create the rulesets before the first release, not before the first normal push. The first project push and the first release tag will then both go through the rules as they should.



## 18. Status after 1.38.0 (the first GitHub release)

- **Repository:** https://github.com/Jackpison/Homebase-Hub holds `src/` (readable site), `tools/` (`build.py`, `make-latest.py`, `make-site.py`, `make-guide.py`), `website/`, workflows (`ci.yml`, `release.yml`, `pages.yml`), `README.md`, `CONTRIBUTING.md`, `THIRD-PARTY.md`, `CHANGELOG.md`, and this handoff in `docs/`. `build.py` was checked against the real 1.37.0 zip (every file identical).
- **1.38.0:** updates from GitHub (`web/core-data/lib/ghupdate.php`; API actions `gh_check`, `gh_install`, `gh_auto`; the card in Settings > Updates; Overview alert and pill; Server Check line; cron hook). Daily check off by default; no request to GitHub while off. Tested against a local stand-in (34 tests: update, wrong checksum, wrong size, flipped byte, truncated, wrong version, malformed `latest.json`, API fallback once a day, foreign redirects refused, CSRF, and the real 1.37.0 to 1.38.0 upload with Go Back). Test hooks `GH_TEST_*` exist only if a test defines them (via `auto_prepend_file`); the site never does.
- New installs are named Homebase Hub; every own PHP/JS/CSS file has a GPL-3.0-only header (`/*!` in JS and CSS, so minified files keep it).
- **Release flow:** push a tag `vX.Y.Z` whose number equals `HUB`. `release.yml` builds, checks the tag, creates the release with the zip, its `.sha256` and the changelog, then starts `pages.yml`, which builds the website, the guide and `latest.json` from the newest release and deploys to GitHub Pages. Pages must be set to **Source: GitHub Actions** in the repo settings.
- **Licences:** checked, see `THIRD-PARTY.md`. Not re-verified file by file: ONNX Runtime Web, pdf-lib, exifr, UTIF, Sortable, pako, fflate, framer-motion (upstream MIT is assumed).
- **Not signed** (owner's decision); the checksum only catches damaged downloads.
- **Not tested:** on the owner's live host, against the real github.com download (the first real update will be 1.38.0 to 1.38.1 or later), or by a person using a real browser (screenshots were taken with Chromium, but flows like clicking Download and Check were only tested through the API).
- **Screenshots** on the website and in the guide come from the real 1.38.0 build with invented demo data (Links and Tasks seeded; Info and Cards are empty states; Home has no photos because the test browser had no internet). The "update available" screenshot used a stand-in release and is labelled as an example.
- **Ideas not built:** signed releases, accessibility pass, passkey login, dead-link checker, bookmark import, Telegram snooze, card fee reminders, richer demo data for Info and Cards screenshots.
- A token was once pasted into a chat to push; revoke any such token after use and never store it.
