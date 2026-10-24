# Working on Homebase Hub

This file is for anyone changing the code, people and AI tools alike. Read it before you start. `.github/CONTRIBUTING.md` has the short version.

## What is where

| Path | What it is |
|---|---|
| `src/` | The site, readable. `index.php` and `web/` are what ships. Edit here, never in `build/`. |
| `src/web/core-data/` | The shared engine: login, settings, updates, Telegram, the bar (`assets/shell.js`, `shell.css`, `shell-admin.js`). |
| `src/web/<page>/` | Each page: `home`, `links`, `info`, `cards`, `tasks`, `tools`, `settings`. |
| `src/web/tools/assets/` | Tools, prebuilt and minified (there is no separate source). Small fixes are string edits in these files. |
| `src/web/docs/` | `README.txt` and `CHANGELOG.md` (shipped inside every zip, closed to browsers). |
| `tools/` | `build.py` (the zip), `tools-rev.py` (Tools fingerprint), `make-site.py` and `make-guide.py` (website and PDF guide), `make-latest.py`, `release-notes.py`. |
| `tests/` | Update tests, browser tests, accessibility and library checks. See `tests/README.md`. |
| `website/` | The GitHub Pages site: pages, styles, screenshots, logo. |

## Rules

- Users' data lives in `site-data/` on their server. Never commit it, never ship it, and never write code that reads it from a browser. The build refuses to run if `src/site-data`, `src/web/core-data/config.php` or `src/web/core-data/data` exist.
- Never put passwords, tokens or keys in the repo, in a test, or in a commit message.
- Updates must stay safe: a zip is checked before anything changes, nothing installs without the website password, a snapshot is taken first, and Go Back must work. Do not weaken `src/web/core-data/lib/update.php` or `ghupdate.php` without tests that prove the same safety.
- The site makes no request to another server unless the person turned that feature on or pressed a button for it. Keep it that way.
- Test-only shortcuts (`GH_TEST_*`, `HUB_TEST_FAVICON`) are defined only by `tests/prepend.php`. The site must never define them.
- After changing any file in `src/web/tools/assets/`, run `python3 tools/tools-rev.py --write`. The build refuses a stale fingerprint. It also keeps the Tools import map and its security-policy hash in step.
- `.htaccess` files only work on Apache: a comment must be on its own line (Apache refuses `Directive value  # comment`). Test them with `tests/apache_test.py`.
- Write plainly in everything a user reads: short sentences, the same names the screen shows, Title Case on buttons and headings in the app.
- **Every new feature and every bug fix in the PHP code gets at least one unit test** in `tests/unit/` (a new `*_test.php` is picked up by itself; for a fix, write a test that fails without it). A change to a page or a tool gets a check in the matching browser test (`tests/*_test.py`). A green run proves only what the tests cover, so do not describe it as proof that everything works.
- Do not claim something works unless you ran it and saw it work. Say what you did not test.

## Checks before a pull request

```
npm ci
npx eslint src
php tests/unit/run.php
python3 tools/release.py --check
python3 tests/release_test.py
curl -fsSL -o phpstan.phar https://github.com/phpstan/phpstan/releases/download/2.1.33/phpstan.phar
echo "48caad125554d6b416159db71dd7fd890295ba1a24b3650b49e32752e24fd6a0  phpstan.phar" | sha256sum -c -
php -d memory_limit=1G phpstan.phar analyse --no-progress
python3 tests/check_libraries.py
python3 tools/build.py
python3 tools/make-site.py --no-guide
python3 tests/update_test.py build/site-update-X.Y.Z.zip <previous release zip> <an older release zip>
python3 tests/update_attack_test.py build/site-update-X.Y.Z.zip
python3 tests/core_test.py build/site-update-X.Y.Z.zip
python3 tests/tools_test.py build/site-update-X.Y.Z.zip
python3 tests/pages_test.py build/site-update-X.Y.Z.zip
python3 tests/a11y_test.py build/site-update-X.Y.Z.zip build/site
sudo sh tests/apache_setup.sh build/site-update-X.Y.Z.zip && python3 tests/apache_test.py
```

All of them must pass. CI runs the same checks on every pull request and on every push to `main`, and also runs the page and Tools tests on Firefox and WebKit (`--browser firefox|webkit`) and the accessibility check on Firefox.

## Release checklist

1. On a clean working tree run `python3 tools/release.py X.Y.Z`. It raises `HUB` in `src/web/core-data/lib/boot.php` and every `?v=` of the old version in the pages, adds a `## X.Y.Z` section and a Version Map row to `src/web/docs/CHANGELOG.md`, each with a `TODO` marker, and copies the file to the root `CHANGELOG.md`.
2. Replace the `TODO` markers (`###` headings and short bullet points in plain words; one line in the Version Map) and copy the file to the root `CHANGELOG.md` again. `python3 tools/release.py --check` must pass; CI and the release workflow run it too.
3. If the minimum PHP changes, change `HUB_MIN_PHP` in `boot.php`; the build carries it into the zip.
4. Run every check above on the final build.
5. Commit, push `main`, and wait for CI to pass.
6. Tag `vX.Y.Z` (the same number as `HUB`) and push the tag. The release workflow builds the zip, publishes the release with only that version's changelog section, and updates the website, the PDF guides and `latest.json`. No command line? On github.com open Releases, **Draft a new release**, type the tag `vX.Y.Z` under *Choose a tag* (create it on publish, target `main`) and publish. The workflow then adds the zip and notes to that release.
7. Check the release page and the website.

The zip is always named `site-update-X.Y.Z.zip` (dots, not underscores) and always contains the full `CHANGELOG.md`.
