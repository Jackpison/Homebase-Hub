# Security Policy

Homebase Hub is maintained by [@Jackpison](https://github.com/Jackpison). It is a self-hosted PHP site that keeps your private data (bookmarks, notes, cards, tasks, files) on your own server, so a security problem here can expose that data. Reports are taken seriously.

## Reporting a Vulnerability

Please report a security problem **privately**, not as a public issue:

1. Open the repository's **Security** tab.
2. Choose **Report a vulnerability**.

Say which version you use (Settings > Changelog) and what you found. Steps to see it happen are the most useful part: a few lines are enough. Please give a fix a chance to ship before you share the details anywhere else.

Everything that is not a security problem (a bug, a wrong label, an idea) belongs in a normal [issue](https://github.com/Jackpison/Homebase-Hub/issues/new/choose).

## Supported Versions

Only the **latest release** gets security fixes. A fix ships as a new release that you install from **Settings > Updates**, and the changelog says what was fixed. You are credited there if you want to be.

## In Scope

- **The site:** everything in the update zip: login, two-step login, passkeys, sessions, the security token, encryption and the backups, the pages and their API, Telegram, Cloud Backup and Tools.
- **Your data's protection:** anything that lets a browser or another website read, change or run files in `site-data`, or that makes the server learn a passphrase or a key.
- **The update system:** updates from GitHub and by upload, the checks on a zip, the snapshot and Go Back.
- **Requests the site makes:** a way to make the server reach an address it should refuse (loopback, link-local, a redirect), or to send a request the person never turned on.
- **The deploy files** in `deploy/` (Docker, nginx, Apache, the install scripts) and the **release files** and **project website**.

## Out of Scope

- Problems in your own server, PHP, host or network settings, or in software you installed beside Homebase Hub.
- Attacks that need someone who already has your website password, your server's files or your unlocked browser.
- A lost passphrase or recovery key. Encrypted data is meant to be unreadable without them.
- Missing hardening that has no way to be used against the site, and reports from automated scanners with no working example.
- Denial of service by sending a huge number of requests, and social engineering.
- Weaknesses in an old release that the latest release already fixes.

## What Is Already Done

How login, encryption, Files, Cloud Backup, updates and `site-data` are protected is written in plain words on the [Security page](https://jackpison.github.io/Homebase-Hub/security/). Reports that go against what that page promises are especially welcome.
