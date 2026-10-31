# Working on Homebase Hub

This file is for anyone changing the code, people and AI tools alike. Read it before you start. `.github/CONTRIBUTING.md` has the short version.

## What is where

| Path | What it is |
|---|---|
| `src/` | The site, readable. `index.php` and `web/` are what ships. Edit here, never in `build/`. |
| `src/web/hub/core/` | The shared engine: login, settings, updates, Telegram, the bar (`assets/shell.js`, `shell.css`, `shell-admin.js`). |
| `src/web/<page>/` | Each page: `home`, `links`, `info`, `cards`, `tasks`, `files`, `tools`, `settings`. `src/web/hub/share-sw.js` is the small service worker behind Share from the phone. |
| `tools-app/` | The source of Tools (plain ES modules, esbuild). `python3 scripts/build-tools.py --install` builds it into `src/web/tools/` (index.html, sw.js, assets/); never edit `src/web/tools/assets/` by hand. See `tools-app/README.md`. |
| `src/web/hub/docs/` | `README.txt` and `CHANGELOG.md` (shipped inside every zip, closed to browsers). |
| `scripts/` | `build.py` (the zip), `build-tools.py` (Tools from `tools-app/`), `tools-rev.py` (Tools fingerprint), `make-site.py`, `site_pages.py` and `make-guide.py` (website, its data-built pages, and the PDF guide), `make-latest.py`, `release-notes.py`, `screenshots.py` (the website's screenshots from the real app), `maintain.py` (the monthly Tools library update that `.github/workflows/maintenance.yml` runs). |
| `MAINTAINING.md` | Keeping the project alive without a programmer: what runs by itself, the monthly routine, what to do when something fails. |
| `tests/` | `unit/` PHP unit tests; `browser/` tests in a real browser (pages, bar, Settings, Tools, Import, accessibility, the website, installing on a phone); `server/` update, hostile-zip, core and Apache tests; `repo/` checks of the repository (release script, libraries); `fixtures/` files the tests open; `lib/` shared helpers (`helpers.py`, `annotate.py`, `prepend.php`, `seed_demo.php`). See `tests/README.md`. |
| `website/` | The GitHub Pages site: `style.css`, `theme.js`, `site.js`, `content/` (Install, Guide, Security and Licence, written by hand), `data/tools.json` (the tool list), screenshots, logo. The home page, the six feature pages, Telegram, On your phone, the tool finder and the FAQ are built from `scripts/site_pages.py`. The security policy allows no inline style or script, so colours come from classes and the numbered dots from a generated `hot.css`. |

## Rules

- Users' data lives in `site-data/` on their server. Never commit it, never ship it, and never write code that reads it from a browser. The build refuses to run if `src/site-data`, `src/web/hub/core/config.php` or `src/web/hub/core/data` exist.
- Never put passwords, tokens or keys in the repo, in a test, or in a commit message.
- Updates must stay safe: a zip is checked before anything changes, nothing installs without the website password, a snapshot is taken first, and Go Back must work. Do not weaken `src/web/hub/core/lib/update.php` or `ghupdate.php` without tests that prove the same safety.
- The site makes no request to another server unless the person turned that feature on or pressed a button for it. Keep it that way.
- Test-only shortcuts (`GH_TEST_*`, `HUB_TEST_FAVICON`, `HUB_TEST_PUBLIC`, `NT_TEST_*`) are defined only by the tests (`tests/lib/prepend.php` and the unit tests in `tests/unit/`). The site must never define them; `tests/unit/logic_test.php` checks.
- After changing anything in `tools-app/`, run `python3 scripts/build-tools.py --install` (it also refreshes the Tools fingerprint) and commit `src/web/tools/` with it. A new tool: `python3 scripts/new-tool.py <id> "<Name>" <section> <icon> "<description>"` writes its line in `tools-app/src/tools.json` and a starter file; the build makes the list of tool modules from `tools.json`, and `tests/repo/tools_list_test.py` fails until the tool has its own check in `tests/browser/tools_test.py`. The website's tool finder reads the same list.
- `.htaccess` files only work on Apache: a comment must be on its own line (Apache refuses `Directive value  # comment`). Test them with `tests/server/apache_test.py`.
- Every PHP file starts with `declare(strict_types=1);` (a unit test fails for one that does not). Keys and locked data are handled only in the browser: the server never gets a passphrase or a key, and the files that handle them (`files.js`, `share.js`) start with `// @ts-check` and are listed in `tsconfig.json`.
- Write plainly in everything a user reads: short sentences, the same names the screen shows, Title Case on buttons and headings in the app.
- **Every new feature and every bug fix in the PHP code gets at least one unit test** in `tests/unit/` (a new `*_test.php` is picked up by itself; for a fix, write a test that fails without it). A change to a page or a tool gets a check in the matching browser test (`tests/*_test.py`). A green run proves only what the tests cover, so do not describe it as proof that everything works.
- Do not claim something works unless you ran it and saw it work. Say what you did not test.

## Checks before a pull request

```
npm ci --ignore-scripts
npx eslint src tools-app
npx tsc -p tsconfig.json && npx tsc -p tsconfig.links.json && npx tsc -p tsconfig.home.json && python3 tests/repo/tscheck_test.py
php tests/unit/run.php
python3 scripts/release.py --check
python3 tests/repo/release_test.py
python3 tests/repo/workflows_test.py
python3 tests/repo/ci_status_test.py
python3 tests/repo/ci_changes_test.py
python3 tests/repo/releases_test.py
pip install zizmor==1.30.1 && zizmor --offline --persona=auditor .github/workflows/
curl -fsSL -o phpstan.phar https://github.com/phpstan/phpstan/releases/download/2.1.33/phpstan.phar
echo "48caad125554d6b416159db71dd7fd890295ba1a24b3650b49e32752e24fd6a0  phpstan.phar" | sha256sum -c -
php -d memory_limit=1G phpstan.phar analyse -c tests/repo/phpstan.neon --no-progress
python3 tests/repo/check_libraries.py
pip install ruff==0.14.0 && ruff check                              # Python lint for tests/ and scripts/ (rules in ruff.toml)
python3 tests/repo/secrets_test.py                                   # no token or key in any file or in the last 50 commit messages
python3 tests/repo/dead_code_test.py                                 # no PHP function or constant, JavaScript function or CSS class that nothing uses
python3 scripts/build.py
python3 scripts/make-site.py --no-guide
python3 tests/server/update_test.py build/site-update-X.Y.Z.zip <previous release zip> <an older release zip>
python3 tests/server/update_attack_test.py build/site-update-X.Y.Z.zip
python3 tests/server/core_test.py build/site-update-X.Y.Z.zip
python3 tests/browser/import_test.py build/site-update-X.Y.Z.zip
python3 tests/browser/app_test.py build/site-update-X.Y.Z.zip
python3 tests/browser/tools_test.py build/site-update-X.Y.Z.zip
python3 tests/browser/pages_test.py build/site-update-X.Y.Z.zip
python3 tests/browser/nav_test.py build/site-update-X.Y.Z.zip
python3 tests/browser/a11y_test.py build/site-update-X.Y.Z.zip
for t in encrypt files lock tabs_lock settings_ui settings_look passkey share speed; do python3 tests/browser/${t}_test.py build/site-update-X.Y.Z.zip; done   # passkey, share and speed run in Chromium only
python3 tests/server/files_test.py build/site-update-X.Y.Z.zip
python3 tests/browser/website_test.py build/site            # after python3 scripts/make-site.py --no-guide
python3 tests/browser/visual_compare.py build/site-update-X.Y.Z.zip <previous release zip> build/visual   # optional: a report of what changed on screen (CI no longer makes it)
sudo sh tests/server/apache_setup.sh build/site-update-X.Y.Z.zip && python3 tests/server/apache_test.py
```

All of them must pass. `python3 tests/run_all.py build/site-update-X.Y.Z.zip` runs them one after another with one summary table (`--quick`: lint, unit, repo and server checks only, for small changes; `--apache` adds the Apache test). CI runs the same checks on every pull request and on every push to `main`, with the browser tests in Chromium and WebKit, each in two halves side by side and several tests at once inside a half (`tests/lib/run_parallel.py`). Firefox runs on the 1st and 15th in `firefox-check.yml` (`--browser firefox` runs it by hand, and Actions > Firefox check > Run workflow starts it); run it before a release that changed layout or windows. On a docs-only change CI skips the slow jobs; `ci-ok` sums up every job.

## Release checklist

1. On a clean working tree run `python3 scripts/release.py X.Y.Z`. It raises `HUB` in `src/web/hub/core/lib/boot.php` and every `?v=` of the old version in the pages, adds a `## X.Y.Z` section and a Version Map row to `src/web/hub/docs/CHANGELOG.md`, each with a `TODO` marker, and copies the file to the root `CHANGELOG.md`.
2. Replace the `TODO` markers (`###` headings and short bullet points in plain words; one line in the Version Map) and copy the file to the root `CHANGELOG.md` again. `python3 scripts/release.py --check` must pass; CI and the release workflow run it too.
3. If the minimum PHP changes, change `HUB_MIN_PHP` in `boot.php`; the build carries it into the zip.
4. Run every check above on the final build.
5. Commit, push `main`, and wait for CI to pass.
6. Tag `vX.Y.Z` (the same number as `HUB`) and push the tag. The release workflow builds the zip, publishes the release with only that version's changelog section, and updates the website, the PDF guides and `latest.json`. No command line? On github.com open Releases, **Draft a new release**, type the tag `vX.Y.Z` under *Choose a tag* (create it on publish, target `main`) and publish. The workflow then adds the zip and notes to that release.
7. Check the release page and the website.

The zip is always named `site-update-X.Y.Z.zip` (dots, not underscores) and always contains the full `CHANGELOG.md`.
