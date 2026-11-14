# Ideas and Requests

Things people asked for that are not built yet, with what was decided and why. Newest first. Add a line when a new request comes in.

## From issue 29 (November 2026)

| Request | Decision |
|---|---|
| Edit button easier to find on every page | **Planned for the next version.** The pencil in the top right is hard to spot. Idea: one clear Edit button in the same place on every page, shown only when logged in. |
| News feed (RSS) with pictures | **Not now.** A bigger feature and a new kind of outside request. If it comes back it must be off by default, fetch only through `hub_get_https` (every hop pinned to a public address), strip all HTML, cache on the server and show pictures only from the feed's own host. |
| Custom iframe or link pages | **Not now.** Many sites refuse to be embedded, and a free-form page widens the security policy. A safe version would be: the owner adds an `https` address, the page shows it inside an iframe with `sandbox` and no `allow-same-origin`, a `frame-src` rule that lists only that host, and a plain "Open in a new tab" link beside it. A page of buttons that open links is already what Links is for. |
| Multiple users with their own storage | **Not planned.** The site is one owner and one site; separate users would change the data layout, the login, backups and every page. |
| One password for login and encryption, and encrypt Tasks and Notes by default | **Not as asked.** The server never sees the passphrase; one shared password would let it. Encrypting Tasks would stop Telegram reminders and the calendar feed, because the server could not read due dates. Done instead (1.79.0): an optional "Lock my private data next" step in first setup, and a This Device card in Data Protection for "keep unlocked on this device". |

Done from the same issue in 1.79.0: Clear Activity (with the password), a Cleanup section, turning Telegram, Tasks, Cards, Files and Tools off for real, and a live countdown.
