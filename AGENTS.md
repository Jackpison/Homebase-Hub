# Working on Homebase Hub

This file is for anyone changing the code, people and AI tools alike. Read it before you start. `CONTRIBUTING.md` has the short version.

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
- Do not claim something works unless you ran it and saw it work. Say what you did not test.

## Checks before a pull request

```
npm ci
php tests/unit/run.php
curl -fsSL -o phpstan.phar https://github.com/phpstan/phpstan/releases/download/2.1.33/phpstan.phar && php -d memory_limit=1G phpstan.phar analyse --no-progress
python3 tests/check_libraries.py
python3 tools/build.py
python3 tools/make-site.py --no-guide
python3 tests/update_test.py build/site-update-X.Y.Z.zip <previous release zip> <an older release zip>
python3 tests/tools_test.py build/site-update-X.Y.Z.zip
python3 tests/pages_test.py build/site-update-X.Y.Z.zip
python3 tests/a11y_test.py build/site-update-X.Y.Z.zip build/site
sudo sh tests/apache_setup.sh build/site-update-X.Y.Z.zip && python3 tests/apache_test.py
```

All of them must pass. CI runs the same checks on every pull request and on every push to `main`.

## Release checklist

1. Raise the version: `HUB` in `src/web/core-data/lib/boot.php` and every `?v=` in the pages (search for the old number).
2. Add a section to `src/web/docs/CHANGELOG.md` (`## X.Y.Z`, then `###` headings and short bullet points) and a row in its Version Map. Copy the file to the root `CHANGELOG.md`.
3. If the minimum PHP changes, change `HUB_MIN_PHP` in `boot.php`; the build carries it into the zip.
4. Run every check above on the final build.
5. Commit, push `main`, and wait for CI to pass.
6. Tag `vX.Y.Z` (the same number as `HUB`) and push the tag. The release workflow builds the zip, publishes the release with only that version's changelog section, and updates the website, the PDF guides and `latest.json`.
7. Check the release page and the website.

The zip is always named `site-update-X.Y.Z.zip` (dots, not underscores) and always contains the full `CHANGELOG.md`.
