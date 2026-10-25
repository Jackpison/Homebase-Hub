# Tests

These run on your own computer. Nothing here is part of the update zip.

**All at once:** `python3 tests/run_all.py build/site-update-X.Y.Z.zip` runs every check below in order and prints one table (check, result, passed, seconds). `--quick` runs only lint, unit, repo and server checks (about 2 minutes); `--browser firefox|webkit` runs the browser tests in another engine; `--apache` adds the Apache test (needs sudo); `--prev` and `--old` give the update test its zips (otherwise they are downloaded and checked against their `.sha256`).

| Folder | What is in it |
|---|---|
| `unit/` | PHP unit tests (`php tests/unit/run.php`) |
| `browser/` | Tests in a real browser: `pages_test`, `nav_test`, `settings_test`, `tools_test`, `import_test`, `a11y_test`, `app_test`, `website_test` |
| `server/` | Tests of the server side: `update_test`, `update_attack_test`, `core_test`, and Apache (`apache_setup.sh`, `apache_test.py`) |
| `repo/` | Checks of the repository itself: `release_test`, `check_libraries`, `workflows_test`, `ci_status_test`, `ci_changes_test`, `releases_test` |
| `fixtures/` | Files the tests open: PDFs, pictures, a HEIC photo, the favicon stand-in, bookmark exports |
| `lib/` | Shared helpers: `helpers.py` (sites, logins, paths), `releases.py` (the previous release and its zip), `annotate.py` (CI annotations), `prepend.php` (test-only shortcuts), `seed_demo.php` (demo data), `phpstan-bootstrap.php` |

`requirements.txt` stays here (Dependabot and the pip cache look for it in `tests/`).

## Unit tests (PHP, no browser)

`php tests/unit/run.php` runs every `tests/unit/*_test.php` on its own fresh copy of `src/`. Telegram is replaced by `telegram_stub.php`, a local stand-in, through `NT_TEST_API`, which only the tests define. It takes a few seconds and needs only PHP 8.3 with openssl and curl.

- `snooze_test.php`: the Snooze buttons, `/snooze`, the daily digest and the Due Now card.
- `telegram_test.php`: login alerts (off, on, paused logins, a restore), the bot's commands (`/help`, `/add`, `/today`, `/week`, `/done`, `/status`, `/backup`, a message from another chat), the backup file it sends, token checks and device names, and that a task or site name with `<` or `&` can never break a message (Telegram refuses stray HTML).
- `home_pick_test.php`: Home's backgrounds (no repeats; the tags match `app.js`), Welcome Text, the Starter theme and your own themes.
- `nav_settings_test.php`: the bar style is top, side or dock; a new site takes the setup browser's time zone and Follow Device, while existing sites keep theirs.
- `logic_test.php`: `/add` parsing, money, repeat dates, completing tasks, the Favicon helpers, the PHP support notice, safe names in an update zip, backup encryption, and a check that no PHP file defines a test shortcut.

Add a new `*_test.php` next to them. `lib.php` gives you `t('what should happen', $ok)`.

## Visual changes

`python3 tests/browser/visual_compare.py build/site-update-X.Y.Z.zip previous.zip OUTDIR` installs both zips with the same demo data, photographs ten views (Home, Links, Info, Cards, Tasks, Tools, Settings, Look, and Cards and Links on a phone) in Chromium, and writes `OUTDIR/<view>-before.png`, `-after.png`, `-diff.png` (changed pixels in red) and `summary.md` (how much of each view changed). It is a report, not a test: it fails only when a view cannot be shown or is not logged in. CI runs it against the last release whenever the site, Tools or the build changed (job "visual changes since the last release"): the table is in the job summary and the pictures in the `visual-changes` artifact. Look at it before a release, together with the screenshots the owner asked for.

## Static analysis

`tests/repo/phpstan.neon` (level 1) is run by CI with a pinned PHPStan, and CI checks the download's SHA-256 before it runs it. See AGENTS.md for the command. To raise the PHPStan version, change the version and the checksum in both `.github/workflows/ci.yml` and `AGENTS.md` (get the new checksum with `sha256sum phpstan.phar`). The checksum is pinned when you first download a version, so it guards against the file changing later, not against a bad first download. `tests/lib/phpstan-bootstrap.php` only tells it the folder constants that `boot.php` defines at run time.

## Python packages

`pip install -r tests/requirements.txt`, then `python3 -m playwright install chromium`. Every package is pinned to the version the tests pass with; Dependabot proposes the bumps each week (for these, the npm build tools and the GitHub Actions).

The libraries bundled inside the site (pdf.js, JSZip, libheif, ONNX Runtime Web, jsPDF, pdf-lib, React in Tools) are copied files, not npm packages, so Dependabot does not see them. `check_libraries.py` and the weekly security check (`.github/workflows/weekly-check.yml`, which runs `check_libraries.py --audit` and `npm audit` every Monday and opens an issue labelled `security` on a failure) cover them.

## Release script and lint

- `python3 scripts/release.py --check`: `HUB`, every `?v=` on the pages, the newest changelog heading, the top Version Map row and the root `CHANGELOG.md` agree, no `TODO` marker is left, `src/site-data` does not exist, and the Tools fingerprint is current.
- `zizmor --offline --persona=auditor .github/workflows/` (zizmor 1.30.1 from pip): Trail of Bits' checker for workflow files, at its strictest setting. Fix what it finds; never silence it.
- `python3 tests/repo/ci_changes_test.py`: which changes count as docs only (`scripts/ci_changes.py`): then CI's slow jobs (server, visual, browsers, apache) skip themselves and the `ci-ok` job still passes; any doubt runs everything.
- `python3 tests/repo/ci_status_test.py`: the release waits for CI on the tagged commit (`scripts/ci_status.py`, up to 20 minutes) and refuses to build unless every job passed; this tests that decision with made-up check runs.
- `python3 tests/repo/releases_test.py`: `tests/lib/releases.py` picks the previous release (the newest one older than the build, compared as numbers); CI uses `python3 tests/lib/releases.py previous` and `download TAG DIR` (checked against the release's `.sha256`).
- `python3 tests/repo/workflows_test.py`: the workflow files keep their safety settings: every outside Action pinned to a full commit SHA, `persist-credentials: false` on every checkout, a time limit on every job, `npm ci --ignore-scripts` everywhere (also in `build-tools.py`), CI checks the committed Tools against a fresh build, the release checks CI before it builds, `ci-ok` needs every other job, and only the slow jobs skip on a docs-only change.
- `python3 tests/repo/release_test.py`: tests `release.py` itself on a temporary copy of the repo (a bump, then each thing broken in turn must fail the check). Needs git.
- `npx eslint src tools-app`: `no-undef`, `no-redeclare`, `no-dupe-keys`, `no-unreachable` and `no-const-assign` on the readable scripts in `src/web` and the Tools source in `tools-app/` (not the built Tools files, not `vendor/`). `eslint.config.js` lists each page's real globals and says why.

## Update tests

`update_test.py` installs real zips into temporary folders, runs each site with PHP's built-in server, and checks updating from GitHub and by upload against a local stand-in for GitHub. It covers the full update, a wrong checksum, a wrong size, damaged and cut-off downloads, a wrong version, a broken `latest.json`, the API fallback (asked at most once a day), redirects to other hosts, the security token, the daily check switch, upgrading from the previous release, the notes preview, and Go Back.

```
npm ci --ignore-scripts
python3 scripts/build.py                        # CURRENT
python3 tests/server/update_test.py build/site-update-1.40.0.zip site-update-1.39.0.zip site-update-1.37.0.zip
```

The three zips are: the one just built, the latest published release, and any older release. The script makes the "next" version itself (the current zip with its patch number raised).

It needs PHP 8.3 or newer with curl, zip and mbstring, and free ports from 8123. Every check prints PASS or FAIL, then a total.

PHP's built-in server ignores `.htaccess`, so the browser blocks on `site-data`, `web/hub/docs` and `lib` are not tested here.

`prepend.php` is loaded only by these tests (`php -d auto_prepend_file=...`). It points the site at the stand-in. The site itself never defines those constants.

## CI annotations

`annotate.py` passes a test's output through and turns each FAIL line (and a crash's last line) into a GitHub annotation, so failures show on the run page without opening the log.

## Shared helper

`helpers.py` holds what the tests that run a real site share: `Site(zip, port)` installs a zip into `/tmp/site<port>`, starts PHP's built-in server, sets the site up and logs in; `site.get()` and `site.post()` call the API as that browser (cookies, User-Agent, security token); `site.client('other/1.0')` is a second browser on the same site; `site.chunks()` uploads a zip in pieces; `mutate_zip()` makes a copy of a release with another version or PHP minimum; `Checks()` prints PASS or FAIL and the total. It also has `--browser` handling for the browser tests.

## Core features

`python3 tests/server/core_test.py build/site-update-X.Y.Z.zip` (no browser, about a minute, ports 8700 to 8760):

- **Backup and restore:** with demo data, a full backup, a change, a restore (whole and one part), a one-tab backup merged back, Earlier Versions undoing a restore, and a file that is not a backup refused. An encrypted backup opens with the right passphrase (the same PBKDF2 and AES-GCM steps the browser uses) and not with a wrong one. A backup never holds the password, its hash, the two-step secret, recovery codes, the passphrase or the backup key.
- **Two-step login:** turned on with a code computed in the test (RFC 6238), then the password alone is not enough, a wrong code and a reused code are refused, a recovery code works once, New Recovery Codes replaces the old ones, a trusted browser skips the code but never the password, and Log Out Other Devices, one device from the Devices list, and a password change each end the other sessions.
- **Start Over:** needs ERASE and the password; afterwards pages, media, settings, Telegram, the watch list and the passphrase are gone, and the password and two-step login remain.
- **Login lockout:** five wrong passwords pause logins for 15 minutes, then 30, never more than a day. The test moves the clock by editing the rate-limit file in its own copy instead of waiting. The limit is per address: another browser at the same address shares the pause, a second address (127.0.0.2) does not. A right password clears the count for that address.
- **Security token:** every action in `api.php` that changes something (found by reading the file) refuses a request without the token, with a wrong one, and from a visitor who is not logged in.

## Hostile update zips

`python3 tests/server/update_attack_test.py build/site-update-X.Y.Z.zip` (about a minute, ports 8800 to 8810, a few hundred MB in `/tmp`). Each zip goes through the real upload and check and must be refused with a sentence (never a PHP error, a blank page or a 500), and afterwards the version, `files_scan`, `site-data` and the code are unchanged and nothing was written outside the site. Cases: `../` and `..\` paths, absolute paths and drive letters, a null byte, names over 200 characters, 120 folders deep, duplicates and names that differ only in case, non-ASCII names, symlinks, files outside `web/` and `index.php`, `site-data`, `config.php`, the pictures folder, PHP files in the wrong place, a fingerprint that does not match, files missing from or extra to the list, a list naming a path outside the site, a missing or broken `manifest.json`, a PHP syntax error, no updater, a version mismatch, an older version, `minPhp` 99.0, a declared size of 2 GB, a zip bomb (60 MB of zeros declared as 1 KB), 474 MB unpacked, an upload over 128 MB, files that are not zips, the zip cut at 50 places and 200 random bit flips (fixed seed), and the chunk upload abused (bad id, n or i, out of order, twice, no token, a second upload while one is staged).

Two cases are by design, not refusals: the **same version** is accepted as a repair of the installed files (the screen says so), and a **bit flip in a field no file depends on** (a date or an attribute) can still give a valid zip; the test then checks that every file matched its fingerprint. Many cases use a smaller but valid update (the release without the Tools files) so that 250 uploads take seconds, not minutes.

## Import Bookmarks

`python3 tests/browser/import_test.py build/site-update-X.Y.Z.zip [--browser ...]` (port 8850) runs Links > Import Bookmarks in a real browser with the exports in `tests/bookmarks/` (Chrome, Firefox with its folder descriptions, Safari without an outer list, 12 levels deep, duplicates, a hostile file, an empty file, a web page that is not bookmarks) plus a PNG, 5,001 links, a file over 5 MB and 3,000 links made by the test. It checks the preview numbers, the result message, exactly what Links saved, a private new tab, an existing tab (its links kept, nothing added twice), that encrypted tabs are never offered, the six-tab limit, that nothing from the hostile file ran or became markup, undo through Earlier Versions, that the importer loads only when first used, and axe on the open dialog.

## Tools

`python3 tests/browser/tools_test.py build/site-update-X.Y.Z.zip [build/tools-new] [--browser chromium|firefox|webkit]` (port 8960; needs PHP, Playwright, axe-core, Pillow, pypdf and cryptography). It installs a site and drives every one of the 36 tools with real files: the app (search, favourites and recent tools carried over from the old Tools, Organise, Settings, light and dark), conversions checked by opening the output (HEIC and TIFF in, AVIF out, a photo under a target size, exact resize and crop sizes, round PNGs, 300 dpi ID photos and print sheets), background removal on the device, GPS read from a photo and removed, a 21-layout collage and its PDF, and the PDF tools checked with pypdf (merge, split, organize, AES-256 protect and unlock, stamps, signatures, annotations, the text layer, and OCR of a rendered image), plus axe on 26 pages in dark and light. Give `build/tools-new` (from `python3 scripts/build-tools.py`) to test a build before installing it.

## Settings and Home

`python3 tests/browser/settings_test.py build/site-update-X.Y.Z.zip [--browser ...]` (port 8970): Telegram > Backups > Send Backup Now waits as long as the server may take (4 minutes) and is never left stuck on "Sending..." when no answer comes; Settings > System > Updates links to the project on GitHub; Home accepts uploads of up to 128 MB; the first request after an update removes the old Tools `config.json`; and the simpler Settings: the menu in its groups Web Setting, Data Setting and System Setting, Appearance with Look, Presets and Colors (all 166 presets still there), the 1.48 address `#system` still working, a font chosen in Look surviving a save made after changing the accent, the Security cards keeping their icons inside, and a site search without field checkboxes.

`python3 tests/browser/nav_test.py build/site-update-X.Y.Z.zip [--browser ...] [--shots DIR]` (port 8231): the bar in all three styles (Top Bar, Sidebar, Bottom Dock) at 1280 and 390 pixels: the pages listed and the current one marked, no sideways scroll, Backup and the gear (Settings) in every style, the Top Bar sliding away on scroll down and back on scroll up or `/`, the phone panel and sheet opening and closing with Escape, the dock never covering the end of a page, the red Backup icon, and no movement with reduced motion. `--shots DIR` also saves screenshots of each style, including Home, Tools and Settings.

## Website

`python3 tests/browser/website_test.py build/site [--browser chromium|firefox|webkit]` (after `python3 scripts/make-site.py --no-guide`; needs Playwright and axe-core). It checks the built site and then drives it in a real browser:

- **Files:** every link, image, script and style on every page exists; every `#anchor` exists; the sitemap lists real pages; the old `install.html` addresses still forward; every link from the README to the website works (pages and anchors such as `#p-links`); the tools on the website are exactly the tools in the Tools bundle (`website/data/tools.json` against `src/web/tools/assets/index-ToolsAll.js`, so a new tool fails this test until the list is updated).
- **Policy:** no inline style or script, no event-handler attributes, nothing from other sites (the pages carry a policy that allows none), and no console error or policy violation on any page at 1280 and 390 pixels.
- **Basics:** a title, a 50 to 200 character description, one h1 and a canonical address on each page; alt text on every image.
- **Behaviour:** light and dark follow the device (`color_scheme`), the toggle overrides and is remembered; the tour tabs work by mouse, by arrow keys, by `/#p-info` links, and with scripts off all six panels show; the look picker re-colours the buttons and is remembered across pages; the example Telegram chat; the tool finder (search, category chips, no match); the question search; the phone menu and the phone steps.
- **Layout and accessibility:** no sideways scrolling at 390 or 1280 pixels; axe (WCAG 2.1 A and AA) on every page in dark and in light.

Colours are CSS `light-dark()` values, so one set follows the device; `theme.js` only sets `data-theme` when the visitor has used the toggle. Axe cannot judge text over the soft glows behind the heroes: look at screenshots when you change those.

## Install on a phone

`python3 tests/browser/app_test.py build/site-update-X.Y.Z.zip` (Chromium, ports 8890-8891): the manifest is valid JSON served as `application/manifest+json`, GET only and public; `start_url` (Home) is inside `scope` (the site root); every icon exists as a PNG of the stated size; the name and shortcuts follow a changed site name and the bar's names, order and hidden pages; all of this also from a sub-folder install (`/hub/`); every page has the manifest, theme colour and iPhone tags and they resolve; Chromium's `Page.getInstallabilityErrors` and `Page.getAppManifest` report nothing for the top, Home and the sub-folder Home; no service worker exists apart from Tools' own; the Settings card shows its steps, hides Install until the browser offers it, then opens the browser's prompt once. Chromium needs no service worker to install the site, so none was added. The Apache test (A7) checks the manifest and its icons with the real `.htaccess` files.

## Library check

`python3 tests/repo/check_libraries.py` checks that the two known problems in bundled libraries (pdf.js in Tools and SheetJS in Cards) cannot be reached: every place that opens a PDF sets `isEvalSupported:false`, and no code reads Excel files. With `--audit` it also asks npm for advisories on the exact versions and fails on any new one. CI runs the offline part on every push.

## Browser tests

Need Playwright with Chromium (`pip install -r tests/requirements.txt`, then `python3 -m playwright install chromium`). `pages_test.py`, `nav_test.py`, `tools_test.py` and `a11y_test.py` take `--browser chromium|firefox|webkit` (default Chromium; install the engine first with `python3 -m playwright install firefox webkit`). CI runs the browser tests in one job per engine, `browser (chromium|firefox|webkit)`: Import Bookmarks, pages, the bar, Tools and the website in all three, install and Settings in Chromium, accessibility in Chromium and Firefox. The tests run only when the zip was built, so a failed install shows as that one step.

Checks skipped in an engine: none. A check that cannot work in an engine is skipped by name, with the reason written here.

One difference in how the test runs: `pages_test.py` adds each page's `.htaccess` security policy (the header Apache sends) by fetching the page itself and handing it to the browser. WebKit then fails every request that page makes (the browser stays logged out), so in WebKit the pages keep only their own `<meta>` policy, and P4 checks against that. The full header policies are checked in Chromium, Firefox and the Apache job. P7 logs in without any of this, in every engine.

Refused content is found in every engine through the standard `securitypolicyviolation` event (`CSP_REPORTER` in `helpers.py`); each engine words its own console message differently.

- `python3 tests/browser/tools_test.py build/site-update-X.Y.Z.zip`: every tool opens without an error, and real PDFs and images go through the main tools (convert, compress, merge, text, resize, QR, and the PDF tools with page previews).
- `python3 tests/browser/pages_test.py build/site-update-X.Y.Z.zip`: every page and every Settings section loads with no error and no broken request, every page (Tools too) shows the site logo as its tab icon, Text Sizes opens from the Page Settings of Links, Info and Cards, and the Cards Excel export opens.
- `python3 tests/browser/a11y_test.py build/site-update-X.Y.Z.zip`: axe-core (WCAG 2.1 A and AA) on every app page in dark and light mode, and on Links' Import Bookmarks dialog and Settings > General.

The fixture files (`fixture-*.pdf`, `fixture-image.png`, `favicon-fixture.png`) are small test inputs made for these tests.

## On real Apache

The `.htaccess` files (security policies, private folders, caching, the page pre-loading header) only work on Apache, and PHP's test server ignores them.

```
sudo sh tests/server/apache_setup.sh build/site-update-X.Y.Z.zip   # installs Apache with PHP and serves the zip on port 8300
python3 tests/server/apache_test.py
```

It checks that every page answers with its policy and pre-loading header, private files and folders are refused, the rules file has its type, and in a browser nothing is refused and Tools loads its main file once.

## Screenshots

`scripts/screenshots.py` installs a zip, adds invented demo data (`seed_demo.php`), and saves dark, light and phone screenshots with Playwright and Chromium. The website and the guide use these.
