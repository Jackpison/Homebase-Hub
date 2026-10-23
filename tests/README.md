# Tests

These run on your own computer. Nothing here is part of the update zip.

## Unit tests (PHP, no browser)

`php tests/unit/run.php` runs every `tests/unit/*_test.php` on its own fresh copy of `src/`. Telegram is replaced by `telegram_stub.php`, a local stand-in, through `NT_TEST_API`, which only the tests define. It takes a few seconds and needs only PHP 8.3 with openssl and curl.

- `snooze_test.php`: the Snooze buttons, `/snooze`, the daily digest and the Due Now card.
- `logic_test.php`: `/add` parsing, money, repeat dates, completing tasks, the Favicon helpers, the PHP support notice, safe names in an update zip, backup encryption, and a check that no PHP file defines a test shortcut.

Add a new `*_test.php` next to them. `lib.php` gives you `t('what should happen', $ok)`.

## Static analysis

`phpstan.neon` (level 1) is run by CI with a pinned PHPStan, and CI checks the download's SHA-256 before it runs it. See AGENTS.md for the command. To raise the PHPStan version, change the version and the checksum in both `.github/workflows/ci.yml` and `AGENTS.md` (get the new checksum with `sha256sum phpstan.phar`). The checksum is pinned when you first download a version, so it guards against the file changing later, not against a bad first download. `tests/phpstan-bootstrap.php` only tells it the folder constants that `boot.php` defines at run time.

## Python packages

`pip install -r tests/requirements.txt`, then `python3 -m playwright install chromium`.

## Update tests

`update_test.py` installs real zips into temporary folders, runs each site with PHP's built-in server, and checks updating from GitHub and by upload against a local stand-in for GitHub. It covers the full update, a wrong checksum, a wrong size, damaged and cut-off downloads, a wrong version, a broken `latest.json`, the API fallback (asked at most once a day), redirects to other hosts, the security token, the daily check switch, upgrading from the previous release, the notes preview, and Go Back.

```
npm ci
python3 tools/build.py                        # CURRENT
python3 tests/update_test.py build/site-update-1.40.0.zip site-update-1.39.0.zip site-update-1.37.0.zip
```

The three zips are: the one just built, the latest published release, and any older release. The script makes the "next" version itself (the current zip with its patch number raised).

It needs PHP 8.3 or newer with curl, zip and mbstring, and free ports from 8123. Every check prints PASS or FAIL, then a total.

PHP's built-in server ignores `.htaccess`, so the browser blocks on `site-data`, `web/docs` and `lib` are not tested here.

`prepend.php` is loaded only by these tests (`php -d auto_prepend_file=...`). It points the site at the stand-in. The site itself never defines those constants.

## Library check

`python3 tests/check_libraries.py` checks that the two known problems in bundled libraries (pdf.js in Tools and SheetJS in Cards) cannot be reached: every place that opens a PDF sets `isEvalSupported:false`, and no code reads Excel files. With `--audit` it also asks npm for advisories on the exact versions and fails on any new one. CI runs the offline part on every push.

## Browser tests

Need Playwright with Chromium (`pip install playwright openpyxl pypdf`, then `python3 -m playwright install chromium`).

- `python3 tests/tools_test.py build/site-update-X.Y.Z.zip`: every tool opens without an error, and real PDFs and images go through the main tools (convert, compress, merge, text, resize, QR, and the PDF tools with page previews).
- `python3 tests/pages_test.py build/site-update-X.Y.Z.zip`: every page and every Settings section loads with no error and no broken request, and the Cards Excel export opens.
- `python3 tests/a11y_test.py build/site-update-X.Y.Z.zip build/site`: axe-core (WCAG 2.1 A and AA) on every app page in dark and light mode and on the website. Needs `npm i --no-save axe-core` and the website built with `python3 tools/make-site.py --no-guide`.

The fixture files (`fixture-*.pdf`, `fixture-image.png`, `favicon-fixture.png`) are small test inputs made for these tests.

## On real Apache

The `.htaccess` files (security policies, private folders, caching, the page pre-loading header) only work on Apache, and PHP's test server ignores them.

```
sudo sh tests/apache_setup.sh build/site-update-X.Y.Z.zip   # installs Apache with PHP and serves the zip on port 8300
python3 tests/apache_test.py
```

It checks that every page answers with its policy and pre-loading header, private files and folders are refused, the rules file has its type, and in a browser nothing is refused and Tools loads its main file once.

## Screenshots

`screenshots.py` installs a zip, adds invented demo data (`seed_demo.php`), and saves dark, light and phone screenshots with Playwright and Chromium. The website and the guide use these.
