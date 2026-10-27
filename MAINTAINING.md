# Keeping Homebase Hub Alive

This guide is for the owner, or whoever takes over: a person, or any AI tool. You don't need to be a programmer to keep the project current. GitHub does most of the work and asks for a few clicks.

For changing the code itself, read `AGENTS.md`.

## What runs by itself

| When | What | What you see |
|---|---|---|
| Every push and pull request | **CI** tests everything: PHP 8.3, 8.4 and 8.5, the updater, hostile update files, Apache, and every page in Chromium, Firefox and WebKit. | A green tick or a red cross on the commit. |
| Every Monday | **Weekly check**: (1) asks whether any library has a known security problem; (2) tries the next PHP version, still in development, so a break shows up months before hosts offer it. | An issue labelled `security` or `php`, only when something is wrong. |
| The 3rd of every month | **Monthly maintenance**: updates the libraries inside Tools (within their major version), rebuilds Tools, raises the version by one, writes the changelog, and opens a pull request. | A pull request "Monthly maintenance: X.Y.Z", or nothing when all is current. |
| Weekly | **Dependabot** proposes updates for GitHub's own build steps, the build tools and the test tools. | Pull requests from Dependabot. |
| 15 November | **PHP dates reminder**: update the PHP support dates. | An issue "Check the PHP support dates". |
| Daily, on each site (if switched on) | **Settings › Updates** checks GitHub for a new version. | "A new version is ready" in Settings. |

## The monthly routine (about 5 minutes)

1. Open the repository on github.com and go to **Pull requests**.
2. Open **Monthly maintenance: X.Y.Z**. Wait until the checks at the bottom are all green (about 10 minutes after it opened).
3. Press **Merge pull request**, then **Confirm merge**.
4. Go to **Releases › Draft a new release**. Under *Choose a tag* type `vX.Y.Z` (the same number), choose *Create new tag on publish*, target `main`, and press **Publish release**.
5. GitHub builds the update file and adds it to the release by itself (a few minutes).
6. On each of your sites: **Settings › Updates › Check Now**, then follow the buttons. The site downloads and checks the file, asks for your website password, and takes a snapshot first; **Go Back** undoes it.

When there is no maintenance pull request, everything was already current. Nothing to do.

**Dependabot pull requests:** open each one. When its checks are green, press **Merge**. They change only the build and test tools, never your sites.

## When something fails

- **A maintenance or Dependabot pull request has a red check:** do not merge it. Leave a comment if you like, then close it. Next month tries again with newer versions, which often fixes it. If it keeps failing, it needs a person or an AI: give them this file, `AGENTS.md` and the link to the failed check.
- **An issue "Monthly maintenance failed":** nothing reached `main`, and your sites are safe. Run it again later: **Actions › Monthly maintenance › Run workflow**. If it fails again, hand it over as above.
- **An issue labelled `security`:** a library has a known problem. If the monthly maintenance doesn't fix it within a month (or it's urgent), hand it over.
- **An issue labelled `php`:** the next PHP version breaks something. You have months: hosts offer a new PHP about a year after it appears. Hand it over before your host switches.
- **A site misbehaves after an update:** **Settings › Updates › Go Back** puts the previous version back.

## Things only a person can decide

The maintenance pull request lists them under "Waiting for a person to decide":

- **A new major version of a library** (for example pdf.js 6 → 7). It can change how the library works, so someone must try it and run all the tests. Follow `AGENTS.md`: change `tools-app/package.json`, run `python3 scripts/build-tools.py --install`, run every check, commit.
- **pdf-lib** (Tools' PDF writer) is no longer updated by its makers. It works today. If it ever breaks, the maintained copy `@cantoo/pdf-lib` is the replacement.
- **PHP versions:** when a PHP version stops getting security fixes (the dates are in `hub_php_eol()` in `src/web/hub/core/lib/boot.php`), raise `HUB_MIN_PHP` and the CI versions together.

## Handing the project over

Give the new person or AI:

1. this file;
2. `AGENTS.md` (the rules for changing the code, and every check to run);
3. the newest `Project-Handoff vN.md`, if you keep one (it holds the history and the plans).

They need nothing else. Everything is in the repository: the site in `src/`, Tools' source in `tools-app/`, the website in `website/`, the tests in `tests/`, and the scripts in `scripts/`.
