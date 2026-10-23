# Tests

These run on your own computer. Nothing here is part of the update zip.

## Update tests

`update_test.py` installs real zips into temporary folders, runs each site with PHP's built-in server, and checks updating from GitHub and by upload against a local stand-in for GitHub. It covers the full update, a wrong checksum, a wrong size, damaged and cut-off downloads, a wrong version, a broken `latest.json`, the API fallback (asked at most once a day), redirects to other hosts, the security token, the daily check switch, upgrading from the previous release, the notes preview, and Go Back.

```
npm i --no-save esbuild
python3 tools/build.py                        # CURRENT
python3 tests/update_test.py build/site-update-1.40.0.zip site-update-1.39.0.zip site-update-1.37.0.zip
```

The three zips are: the one just built, the latest published release, and any older release. The script makes the "next" version itself (the current zip with its patch number raised).

It needs PHP 8.3 or newer with curl, zip and mbstring, and free ports from 8123. Every check prints PASS or FAIL, then a total.

PHP's built-in server ignores `.htaccess`, so the browser blocks on `site-data`, `web/docs` and `lib` are not tested here.

`prepend.php` is loaded only by these tests (`php -d auto_prepend_file=...`). It points the site at the stand-in. The site itself never defines those constants.

## Library check

`python3 tests/check_libraries.py` checks that the two known problems in bundled libraries (pdf.js in Tools and SheetJS in Cards) cannot be reached: every place that opens a PDF sets `isEvalSupported:false`, and no code reads Excel files. With `--audit` it also asks npm for advisories on the exact versions and fails on any new one. CI runs the offline part on every push.

## Screenshots

`screenshots.py` installs a zip, adds invented demo data (`seed_demo.php`), and saves dark, light and phone screenshots with Playwright and Chromium. The website and the guide use these.
