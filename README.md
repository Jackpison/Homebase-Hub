# Homebase Hub

Homebase Hub is a self-hosted personal workspace: your start page, links, notes, cards, tasks and browser tools, on your own server.

One login. No database (data lives in guarded files in `site-data/`). Private by design, with encrypted tabs, two-step login, built-in backups and updates from Settings. Runs on any PHP host (PHP 8.1 or newer).

**Pages:** Home, Links, Info, Cards, Tasks, Tools, and one Settings page.

## Install

1. Download `site-update-X.Y.Z.zip` from the [latest release](https://github.com/Jackpison/Homebase-Hub/releases/latest).
2. Extract it into your site folder (for example `public_html`).
3. Open the site and follow the setup. Never delete `site-data/`: it holds all your data and updates never touch it.

Updating later: Settings > Updates > upload the new zip. The site checks it, takes a snapshot, applies it, checks itself, and rolls back on failure.

## Repository layout

```
src/                 the readable site (index.php and web/), the source of truth
tools/build.py       minify, manifest, zip, checksum -> build/site-update-X.Y.Z.zip
tools/make-latest.py writes latest.json for GitHub Pages
docs/                project handoff and notes
CHANGELOG.md         full history (also shipped inside every zip)
.github/workflows/   ci.yml (every push), release.yml (tag v*)
```

Build locally: `npm i esbuild && python3 tools/build.py`. The zip is always named with dots (`site-update-1.37.0.zip`) and always contains `web/core-data/docs/CHANGELOG.md`.

## Contact

Feature requests and questions: Telegram [@Jackpison](https://t.me/Jackpison). Bugs: [GitHub Issues](https://github.com/Jackpison/Homebase-Hub/issues).

## Licence

GPL-3.0, see `LICENSE`. Bundled third-party libraries keep their own licences, see `THIRD-PARTY.md`.
