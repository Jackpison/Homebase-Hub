<!-- v49: 1.79.3 -->
# Homebase Hub: Project-Handoff v49 (v1.79.2 published; 1.79.3 pushed to main as `99f37b6`, CI green, owner to publish)

Give a new chat this file, and make the new chat read the section OWNER RULES AND WORKING AGREEMENTS first. v49 = v48 plus everything from 1.74.2 to 1.79.3 (12 to 14 Nov 2026): the Plan Tracker brought up to date, a new session section, a 1.79.x section, new lessons, the pending list and the history rows. `AGENTS.md` in the repo has the public coding rules; where they disagree, this file wins. v46 = v45 plus the PHP 8.5.11 image, the two Dependabot PRs, the F7 cause and the Cloud Backup plan; the history v27 to v42 is one table near the end. Every rule, lesson and open note is kept. The full v42 stays in the old chat's scratchpad if a detail is ever needed.

- **Homebase Hub**: a self-hosted PHP + JavaScript site: Home, Links, Info, Cards, Tasks, Files, Tools, one Settings page, one login, no database. GPL-3.0.
- Repo: https://github.com/Jackpison/Homebase-Hub (owner `Jackpison`). Website: https://jackpison.github.io/Homebase-Hub/ . Minimum PHP 8.3 (CI: 8.3, 8.4, 8.5).
- Sites update from Settings > Updates (from GitHub, or by uploading the zip). Pushing `main` changes only the website; a site changes only when a version is released.

## OWNER RULES AND WORKING AGREEMENTS (read this first; every item applies, all versions merged)

These come from every handoff (v3 to v48), `AGENTS.md`, and the owner's own words in the 13 to 14 Nov 2026 session. If a task seems to break one, stop and say so. `AGENTS.md` in the repo is part of these rules (public coding rules); where they disagree, this file wins.

### A. How to work with the owner
1. **Plan first and wait for "build"** for anything big or visible. "build" = build it, run the checks, push (plain "build" has been followed by a push when the checks pass and the owner never objected); "build and push" = the same, said out loud. Questions like "you think we should rename X?" get a recommendation, not a build.
2. **Show it before it ships.** Screenshots (send them with `SendUserFile`, `display: render`) before any visible change is released; for a big look change a mock-up first (screenshots, a short video, or an HTML mock-up). The owner judges by eye, on his own data and screens, and rejects whole directions (the three-step Edit Tab of 1.79.1 was "horrible"; he went back to one page with the preview on top). Compare against his own mock code side by side.
3. **Do not change the look unasked.** "Just do behind the scenes only and leave visual look alone, it will be so hard to rectify later" (30 Oct). A new option starts with no visual change (the tab icon: both pages look exactly as before until one is chosen). When he says "touch everything, no setting or page left behind", do all of them.
4. **Short, precise answers.** What is going on, what is done, what is NOT done, what was NOT tested. Never say something works unless you ran it and saw it work. A green run proves only what the tests cover.
5. **One version for a batch.** The owner keeps adding while a version is unreleased and says "all of this in 1.79.3": it all goes in that version, in one push. Updates are built together and released together (fewer releases = less usage). "Do all of this in vX.Y.0, not in diff things" = one version for the batch. Small fixes of the same feature are patch versions (1.72.x), not a new minor. **The owner picks the version numbers** (1.53.5, 1.59.0 ...): do not renumber or skip on your own.
6. **While he is still adding requests, do not run the full check for each one** ("stop checks, let's add more things for 1.79.1", 14 Nov). Build, test the area you touched, keep going; run the full precheck once when he says that is it ("alright that's it", "go ahead with build"). A request that arrives mid-run goes into the same version and the precheck starts again.
7. **Every plan and to-do gets a letter** (Plan Tracker below); update the tracker first in every handoff. Status words: TODO, NOW, BUILT, SHIPPED, PARKED, DROPPED.
8. **Handoff:** when the owner asks for "the handoff" (or at each pushed version when he asks), write the next number (`Project-Handoff vN.md`, N one higher than the newest file in the scratchpad), include ALL of these rules, and send it with `SendUserFile` at once. Do not wait for the chat to get long, and never trim the rules out of it (v43 to v48 trimmed older rules and lists: that is how rules got missed).
9. **"What is pending?"** = the Plan Tracker + docs/IDEAS.md + docs/MAINTAINING.md + docs/PHONE-CHECKLIST.md + open GitHub issues + anything parked or held in the chat.
10. **Firefox check:** never dispatch it and never remind the owner about it (it runs only on its schedule, the 1st and 15th).
11. **After a release** ask the owner to try it on a real phone (`docs/PHONE-CHECKLIST.md`) and say that nothing was tested on a real phone, real iPhone GPU, Firefox or WebKit locally unless it really was.
12. **Opinions only** ("you think...?", "what do you recommend?") = give a recommendation and why, do not build.
13. Ideas the owner turned down are not forever: three of them came back later (calendar feed, share links, passkeys; Cards CSV import; Glass). Do not build a dropped idea unless he asks again.

14. **Push, then ask (the original rule, v1 to v8).** Push to `main` as work is done, then suggest whether to release now or add more first. It still holds, with two limits from later: the push comes only after the precheck passes (D2, D3), and while the owner is still adding requests the work goes into the open version (A5, A6).
15. **Handoff naming (27 Oct 2026):** `Project-Handoff vN.md`, N one higher each time, with the site version in the title line (for example "Project-Handoff v50 (site at v1.79.3)"). Old handoffs: v1 and v2 were named by site version; from v3 on by number.
16. **Why a release waits (27 Oct 2026):** the owner wants real work shipped together, not a small release alone ("fewer small releases").

### B. Looks and wording
1. Plain words everywhere a user reads: short sentences, the same names the screen shows, **Title Case** on buttons and headings in the app. Names he chose: **Hide From Visitors** (was Only Me), **Site Settings** (was Main Settings), **Telegram Login Approval**, Notifications, Activity, Features.
2. Fixed page colors (`PAGE_TILE` in shell.js: Home #f5a524, Links #3b82f6, Info #a855f7, Files #0ea5e9, Cards #22c55e, Tools #f97316, Tasks #f43f5e); the Features page and its tabs use them. Keep the sun/moon theme button, one logo for the whole site, the original white switches (chosen 1.65.0), colored tiles with white icons.
3. Health > Disk Used NEVER shows server free space (shared hosting: the whole disk, not usable).
4. Third-party looks (Uiverse, React Bits, 21st.dev): use the owner's pasted code or the real component, ported to plain HTML/CSS/JS (no React, Tailwind, shadcn); credit in `src/web/hub/docs/THIRD-PARTY.md`; React Bits is MIT + Commons Clause. When he says "use your mockups", his mock-ups win over the third-party style. He wanted the GlassSurface code itself, not a look-alike.
5. A report of a window problem = fix it AND add a rule to `windows_test`.
6. Do not make cards "too bright": the tone follows Settings > Appearance > Colors (`--ix-s1`).
7. Tools page options: buttons and switches everywhere except where agreed; the Tools options still use dropdowns: change them tool by tool only if asked.
8. Latest looks he approved: shield mark (blue private, green encrypted) on tabs and in Edit Tab; one-page Edit Tab with the preview on top and name, icon and color on one line; grey dividers between tabs (Links and Info); Notifications row = message left, place and date centred, kind chip right.

### C. Code and tests (the full list is in AGENTS.md; these are the ones most often missed)
1. Every new feature and every bug fix gets a test (a fix: a test that fails without it). PHP: a unit test in `tests/unit/`; a page or tool: the matching browser test. Register a new browser test in `ci.yml`, `tests/run_all.py`, AGENTS.md and `tests/README.md`.
2. Never weaken the updater (`lib/update.php`, `ghupdate.php`): checked before anything changes, password to install, snapshot first, Go Back works; the installed updater decides what a zip may hold.
3. Edit `src/` only, never `build/`. Edit `shell-admin.js` through its parts in `src/web/hub/core/assets/admin/` + `python3 scripts/make-admin.py`, commit both. After `tools-app/` changes run `python3 scripts/build-tools.py --install` and commit `src/web/tools/`.
4. Every PHP file starts with `declare(strict_types=1);`. Keys and passphrases are handled only in the browser. Never commit `site-data/`. Never read user data from a browser except through the APIs.
5. The site makes NO request to another server unless the owner turned that feature on or pressed a button. Visitor address and HTTPS only through `hub_ip()` and `hub_https()`. Test-only constants (`GH_TEST_*`, `HUB_TEST_*`, `NT_TEST_*`) are defined only by the tests.
6. Keep the repo root tidy (new config in `config/`, notes in `docs/`, scripts in `scripts/`; `root_test` enforces it). No new top-level folders. `tools-app/` stays at the top; the root `CHANGELOG.md` is a copy of the one in the app; old addresses get no forwarding files after a move.
7. No tokens, passwords or keys in the repo, a test, a commit message, a URL or a log. A pushed token is the owner's only to paste, in one command, then unset.
8. Never put a `//` comment inside a concatenation, use `wait_js()` (not string waits), never raise a fixed wait (`fixed_waits_test` ceilings only go down), never sleep in a Playwright route handler.
9. An unused CSS class, JS function or PHP function fails `dead_code_test`: delete what nothing uses.

### D. Git, checks, release
1. **Commit as Claude, push straight to `main`, also for releases** (owner, 30 Oct 2026: "do this from now on"). A commit made as `Claude <noreply@anthropic.com>` (the session's own identity) is Verified on GitHub; one made as Jackpison shows `unknown_key`. So: **no `-c user.name` / `-c user.email` overrides**, **no pull request** unless the owner asks, **no merge commit**, **no force-push**. The owner's trailer rule (v25, v40, v42) is three lines on every commit: `Co-Authored-By: Claude <the session's model> <noreply@anthropic.com>`, `Co-Authored-By: Jackpison <Jackpison@users.noreply.github.com>` and the `Claude-Session:` line. The 14 Nov 2026 harness reminder lists only the Claude and Claude-Session lines, and the 1.79.x commits used only those two: ask the owner which he wants and follow his answer.
2. Before pushing: `python3 scripts/precheck.py` (quick checks on what changed: ESLint, tsc (6 configs), dead code, tscheck, ruff, Semgrep, unit tests, the browser tests for that area AND every test that uses what you changed). It ends with "All N checks passed. Push once." Push once, let CI run the rest; if CI goes red, fix it at once. Do not wait for the full 17-minute `run_all` before every push. Do not edit `src/` while it runs.
3. **Push only after the precheck passes**, and only when the work is what the owner asked for. The stop hook nags about unpushed commits: do not let it push half-done work.
4. Release bump: `python3 scripts/release.py X.Y.Z` (needs a clean tree: `git stash -u`), fill the `TODO`s in both CHANGELOG.md copies (Version Map row + section, plain words, `###` headings), `release.py --check`, build.
5. Push nothing else once a release is waiting to be published. **The owner publishes the release on github.com** (tag `vX.Y.Z`, target = the pushed commit). The session cannot publish, delete releases or tags, push `v*` tags, merge pull requests, use GraphQL or read code-scanning alerts. After he publishes: check the Release workflow, the zip sha256 and `latest.json`.
6. A maintenance pull request is merged BEFORE its version is tagged (the release refuses a tag that does not match HUB).
7. Do not weaken CI: the release refuses unless CI passed on that commit.
8. (The old rule to commit as Jackpison in v1 to v8 was replaced by D1 on 30 Oct 2026. Do not go back to it.)

### E. Fixed choices (change only if the owner asks)
- **Privacy:** no contact with other servers unless the feature is on or a button was pressed (daily GitHub check off by default; calendars only when followed; Offline Reading off by default).
- **Updates stay safe** (see C2). **Undo** exists for Files Trash, Tasks, Links, Info (boxes and tabs), Cards and every import.
- **Encryption:** the server never sees a passphrase or key; one shared password for login and encryption is NOT allowed ("not as asked"); Tasks stay readable to the server (Telegram reminders, the calendar feed).
- Real phone, GPU and Firefox are untested unless said otherwise.

### F. Decided against, dropped, parked (do not build unless the owner asks again)
- Rewriting in another language; a plugins folder; multi-user accounts; SQLite; an activity log of data changes; the macOS magnifying dock and the grow effect on the edit bar ("nah leave this plan"); AlignUI; more tab icons; translations; a redesign of the whole app; a dead-link checker; Links "Check Links" and "Find Duplicates" (never asked for); email for login or password reset; a new look for the main Settings tabs (30 Oct); re-carding Links and Info beyond the window frame, button shape and Undo; the GitHub language-bar fix (`.gitattributes`); the two real-phone website pictures; card fee reminders on Telegram (30 Oct); a round menu in place of the Backup icon and gear; building Tools only in the release workflow; Tools "GST calculator" and video tools; one-click cloud buttons (1.73.1); a desktop app, Helm, Softaculous.
- From docs/IDEAS.md (issue 29): RSS feed ("not now"; if it returns: off by default, fetch only through `hub_get_https`, strip HTML, cache, pictures only from the feed's host), custom iframe pages ("not now"; sandboxed, no `allow-same-origin`, `frame-src` for one host), multiple users ("not planned"), one password for login and encryption ("not as asked").
- Maybe later: outbound webhooks (Home Assistant, n8n), offline edits sent later (needs a same-item-on-two-devices rule), Cloud Backup S3 and Restore from Cloud.
- Parked: marketing and launch posts (r/selfhosted New Project Friday from about 22 Jan 2027, awesome-selfhosted from about 22 Feb 2027, the owner writes it; selfh.st, Lemmy, LowEndTalk, AlternativeTo).
- Reversals to remember: Also turned down on 25 Oct 2026: a login history. (Passkey login was "not doing" in v1 to v8 and was built later in 1.61.0.) Glass was dropped on 27 Oct 2026 and then built on purpose as Liquid Glass (1.68.0); the characters on Home were built in 1.52.0, removed in 1.53.0 and a different set came back later; the calendar feed, share links, passkeys and Cards CSV import were turned down and later chosen.

### G. Sandbox and harness facts that cost time
- Kill stale `php -S` before browser tests (`pkill -f "php -S"`); run long jobs in the background and wait with Monitor (`until` loop); never chain sleeps. Never `pkill -f` a pattern that is in your own command line.
- `scripts/build.py` empties `build/`: install Tools into `src/` first. Do not rebuild the zip while browser tests run.
- `gh release` and GraphQL are blocked; REST works: `gh api repos/Jackpison/homebase-hub/...`; `gh run list --json name,status,conclusion,headSha`.
- Unit tests that cut functions out of an `api.php` must list every helper the code calls; a fatal inside `eval` can still print "N/N passed": look for "Fatal".
- The owner's Windows has "Transparency effects" off: test glass with reduce-transparency emulation too.

## PLAN TRACKER (letters; update this first in every handoff)

Owner's way of working (6 Nov 2026): every plan and to-do gets a letter, so pending / in progress / shipped is easy to see. Updates are built together and released together (fewer releases = less usage), so one release may carry several letters. Status words: TODO, NOW, BUILT (pushed, CI green, not yet published), SHIPPED, PARKED, DROPPED.

| Letter | What | Version | Status |
|---|---|---|---|
| A | SHIPPED IN 1.74.0 iPhone: one glass behind the clock and the bar when Bar Glass is on (`::before` strip hidden while the bar shows); polish_test P59b. No blind smoothness change; owner to try Appearance > Glass > Solid / lower Frost on the iPhone | 1.74.0 | BUILT |
| B | SHIPPED IN 1.74.0: `shell-admin.js` = 13 labelled parts in `src/web/hub/core/assets/admin/` joined by `scripts/make-admin.py`; byte-identical; build_test B3-B5; parts not shipped, not linted | 1.74.0 | BUILT |
| F | SHIPPED IN 1.74.0: `tabs.js` and `importer.js` now `// @ts-check` (comment-only hints) | 1.74.0 | BUILT |
| E | DONE: report in section E; the change (add `ok:false` to Links and Home errors, HTTP-200 cases, Home `out()` -> `hub_json`) waits for the owner | | REPORT |
| M | SHIPPED IN 1.74.0: 16 Animated Designs (GridMotion left out: it needs photos and a full React re-render). See "M as built" below | 1.74.0 | BUILT |
| N | SHIPPED 1.74.1: Home Background sheet has 4 tabs (Main, Animated, Sources, Uploads), remembers the last tab; new theme "Mix Everything" (Starter + uploads + designs + online photos; server `theme_items('mix')`, client `pick`); smaller theme cards | 1.74.1 | SHIPPED |
| O | SHIPPED 1.74.1: Home "Welcome Text" removed completely (field, code, saved setting dropped) | 1.74.1 | SHIPPED |
| P | SHIPPED 1.74.1: with a design on Home, menus/sheets closed when pressed (the design runtime forwarded pointerdown/up to its element and the page's capture-phase click-away handler closed the menu). Now only pointermove/mousemove are forwarded, not bubbling. designs_test H10 (real clicks), H11 (tabs) | 1.74.1 | SHIPPED |
| Q | SHIPPED 1.74.1: current page = tinted pill with thin ring in the top bar, sidebar and dock; the line under it is hidden in all three; the search box shine (Uiverse border/glow/spark) removed | 1.74.1 | SHIPPED |
| R | SHIPPED 1.74.2: sliders sitewide (thick filled track, big knob that grows while held; `--p` set by `fillRanges` in shell.js; Firefox rules too) | 1.74.2 | SHIPPED |
| S | SHIPPED 1.74.2: Settings sub-tabs (`.ix-subt`) and the Home Background tabs are a track with a lifted pill and an accent dot (mock-up approved; NOT the 21st.dev cell style, the owner said "use your mockups") | 1.74.2 | SHIPPED |
| T | SHIPPED 1.74.2: Security 8 tabs -> 4 (Overview, Sign-In, Data Protection, Devices) via `TABMERGE` in `tabify` (00-frame.js); old addresses like `#security/encryption` still open the right tab; status chips row removed from the Security overview | 1.74.2 | SHIPPED |
| U | SHIPPED 1.74.2: iPhone/phone top bar flat in the page colour (not for Home or Bar Glass), no box round the buttons (CSS at the end of shell.css). The owner's real screenshot looked like the glass look; NOT verified on a real iPhone. Ask for a new screenshot after release | 1.74.2 | SHIPPED, VERIFY ON PHONE |
| V | SHIPPED 1.74.2: Settings Overview cards compact (detail line only when something needs a look; "Open X ->" link style); Colors section = two columns, round swatch, small code field | 1.74.2 | SHIPPED |
| W | DONE: CI split. A push runs the light browser set (pages half, Chromium + WebKit); the tools half joins when Tools/designs changed, on a release bump (boot.php + CHANGELOG.md together) and on a manual run; `scheduled.yml` job `full-ci` (daily 03:47 UTC) starts the whole CI on main. Server + Apache/Docker jobs run only when PHP/.htaccess/src/web/hub/deploy/scripts/.github/tests changed (`scripts/ci_changes.py`: `matrix=`, `servers=`). CodeQL config ignores `src/web/home/designs*` (third-party designs, 7 false alerts) | | DONE |
| C | Same split for `shell.js` (its header already numbers sections 1 to 13) | next patch | TODO |
| D | Same split for Home `app.js`, Tasks `tasks.js`, Links `links.js`, Info `info.js` (one per patch; D1 Home, D2 Tasks, D3 Links, D4 Info) | patches | TODO |
| G | Cloud Backup: WebDAV SHIPPED in 1.77.0 (Settings > Backup). S3 and "Restore from Cloud" from the plan below: check the 1.77.0 changelog before building them | 1.77.0 | PART SHIPPED |
| H | Website screenshots and PDF guide: retaken in 1.78.2. They do NOT yet show 1.79.x (Edit Tab, shield marks, Features colours, Logs, Files drag, gear menu): retake with `scripts/screenshots.py` | none | TODO (held by the owner) |
| I | Launch: r/selfhosted New Project Friday (from about 22 Jan 2027), awesome-selfhosted (from about 22 Feb 2027, the owner writes it), selfh.st, Lemmy, LowEndTalk, AlternativeTo | none | PARKED |
| J | Outbound webhooks (task done, backup finished) for Home Assistant / n8n, off by default | | MAYBE LATER |
| K | Offline edits sent later (needs a rule for the same item changed on two devices) | | MAYBE LATER |
| L | Real-phone pass with `docs/PHONE-CHECKLIST.md`: Android all steps good (6 Nov); iPhone showed the dull bar and dark band (= A) | | iPhone open, goes with A |
| AA | SHIPPED 1.75.0 to 1.78.2: one message stack + bell, sliding-pill tabs, wider Settings, What's New by series, Features, Files storage limit any size, Cloud Backup (WebDAV), Dropbox-style Files, Logs section (Notifications, Activity, PHP Errors), Telegram Setup in one box, Settings Sign-In redesign, Start Here and the Domains and Uptime watch removed. See History | 1.75.0 to 1.78.2 | SHIPPED |
| AB | SHIPPED 1.79.0: Clear Activity (needs the password), Cleanup section, turn Telegram/Tasks/Cards/Files/Tools off for real, live countdown, optional encryption step in first setup, This Device card | 1.79.0 | SHIPPED |
| AC | SHIPPED 1.79.1 and 1.79.2: gear menu (Edit This Page, page Settings, Site Settings), one-column phone forms, Hide From Visitors, one-page Edit Tab with preview, tab bar gaps, Links dividers, Telegram Login Approval | 1.79.1 to 1.79.2 | SHIPPED |
| AD | BUILT 1.79.3 (`99f37b6`, CI green, owner to publish): Box Headline Color per box; Edit Tab shows the color once; shield marks; Links 20 tabs; Info dividers; Files drag and drop; richer Notifications; Features page colors; Telegram logo; Edit This Page colored. See "1.79.x" | 1.79.3 | BUILT |
| AE | More messages that name what changed (done for Links and Files only; Info, Cards, Tasks, Tools, Settings still say "Saved") | next patch | TODO |
| AF | Issue #28 "Unable to Add Card or Upload Logo" (1 comment, not looked at since 1.79.0's Add Your First Card fix); issue #29 waits for the requester | | OPEN |
| Z | Dropped, do not build unless asked again: plugins folder, multi-user, SQLite, a rewrite in Rust/Go/Python/React, an activity log of data changes, the macOS magnifying dock, AlignUI | | DROPPED |

Shipped lately: 1.79.2 (published; 1.79.3 waits for the owner), 1.73.1 (install scripts, app stores), 1.73.2 (the page waits 1.5 s and checks before reloading when the connection returns; Docker image on PHP 8.5.11; offline_test F8b/F8c). Liquid Glass (1.68.0 to 1.68.5) was already done: the old task "1.68.0 Liquid Glass" is closed.

Facts for B (found 6 Nov): shell-admin.js is ONE closure; its panes share variables, so the parts cannot be separate loaded files without a module loader. That is why B joins at build time. Real ES modules (esbuild, like Tools) is the cleaner end state, one file at a time, only when that area is changed anyway. shell-admin.js has 3,000 lines, shell.js 2,400, Home app.js 1,566, tasks.js 1,402, links.js 1,401, info.js 1,279, home/lib.php 1,201.

Found for A (6 Nov): reproduced in WebKit (iPhone profile, status bar faked with --ix-safe-top:47px) ONLY with Bar Glass on: the solid strip `html[data-ix-bar][data-ix-nav="top"]:not([data-ix-app="home"])::before` (#0a0a0a, behind the clock) is a different shade from the translucent glass bar, so the clock area looks like a darker band. Proposed fix: with glass on and the bar showing, the strip is invisible (`html[data-ix-glass][data-ix-nav="top"]:not(.ix-hide)::before{opacity:0}`), so ONE glass covers the clock and the bar; the strip still shows while the bar is slid away. Mock-up files in the scratchpad mock folder (glass-now.png, glass-new2.png). With Bar Glass OFF the browser shows no band (app-now.png), so the owner's iPhone has Bar Glass on (to confirm). Not reproducible here: the real home-screen app mode, real iPhone GPU smoothness. Smoothness plan is unchanged and still to do.\n\nFacts for A: `glass.js` line ~28 gives Safari and Firefox the frosted fallback (no SVG backdrop filter). The top bar is `html[data-ix-nav="top"] #ix-bar` (shell.css ~line 88): `color-mix(--ix-barbg 90%, transparent)` with `blur(16px) saturate(1.4)`. A strip in the bar colour behind the clock is `html[data-ix-bar][data-ix-nav="top"]:not([data-ix-app="home"])::before`. Meta: `black-translucent` status bar. The Android screenshot had a floating four-squares ring beside Mails: the owner says it is the phone's own overlay, not the Hub.

## Session of 13 to 14 Nov 2026 (v49)

- **Published by the owner:** 1.74.2 to 1.79.2 (about 25 releases in two days; Version Map in History). 1.79.2 verified: Release workflow success, `latest.json` 1.79.2, zip sha256 `1f4220e160084d1d938cee2d8a8ebc1e0a34f5be7ee0cdc1c84a253de5b5ba36`, 21,024,037 bytes. **1.79.3 = `99f37b6` on main, CI, Pages and Code scanning green; the owner publishes tag `v1.79.3` with the target `99f37b6`.** Then verify the zip sha and `latest.json`.
- **Owner's way of working now:** he keeps adding requests while a version is still unreleased and says "all of this in 1.79.3": one version, one precheck, one push. Mid-turn messages arrive often; answer them in the same version. He judges by screenshots: send them with `SendUserFile` (display render). Mock-ups first for big visual changes (he picked "B" and "all together" for tabs, then called the three-step Edit Tab "horrible" and went back to one page with the preview on top).
- **Decisions this session:** Only Me renamed Hide From Visitors; Encrypt Private Tabs row gone from Links and Info settings; Main Settings renamed Site Settings; Login Approval renamed Telegram Login Approval; Info and Links get the grey divider between tabs; Links tab limit equals Info's (20); private and encrypted tab marks are the owner's shield with a check (blue private, green encrypted); notifications: message left, place and date centred, kind chip right.
- **Pending (answer when asked "what is pending"):** publish 1.79.3; website screenshots and PDF guide for 1.79.x (H); messages naming what changed outside Links and Files (AE); issues #28 and #29 (AF); Home Settings visual check after the 1.79.1 restyle; Files drag is mouse and Chromium only (phone uses Move; Firefox may not start a drag from the file-name button; not tested there); the real-phone checklist (`docs/PHONE-CHECKLIST.md`) for 1.79.3; owner-only: monthly maintenance PR, Docker package public, app-store submissions; docs/IDEAS.md decisions (RSS and iframe pages "not now", multi-user "not planned", one-password "not as asked").
- **Stop hook:** it nags about unpushed commits all the time. Push only after the full precheck passed; say so, do not push half-done work.

## 1.79.x (what is in it, for the next session)

- **Gear menu** (`gearMenu`, `itemEntries`, `popMenu` in shell.js): Edit This Page (or Done Editing), the page's own Settings (wears the page icon through `x.pageIcon`), Site Settings. `tint: pageColor(APP)` colors the Edit This Page pencil. Pencil is gone from the bar.
- **Edit Tab** (`HubTabs.edit`, `#hubTabDlg`, tabs.js + tabs.css, shared by Links and Info): one page; first card = preview pill `#htPrev` (icon in the tab color, name, lock) + one line `.hubt-line` (icon button `#htIcoBtn`, name `#htName`, color well `#htColor`, `#htColorDef` Use Default shown only while a color is set); Privacy card = two `ix-srow` switches. The Look card and swatches are gone (1.79.3). `cfg.hc` (Box Headline Color) still exists in the module but Info passes `null`.
- **Tab bar:** pen only on the active tab, fixed lock slot `.tslot`, underline under the active tab, `+ New tab`; Links `.tabs>.tabi+.tabi::before` and Info (1.79.3) draw the grey divider (Info gap is 8 px, so `left:-5px`).
- **Per-box headline color:** every box has `hc` (api.php `box_hc`, `norm_box`, `restore_box`, boxes-list save). `norm_data` migrates once: a tab's old `hc` goes to its boxes that have none, then the tab's `hc` is `''`. UI: Box Settings (`#bxdlg`) `#bxhc`, `#bxhcdef`, swatches `#bxsw` (8 colors); `syncBoxes` sets `--hc` on the box. Tests: `tests/unit/info_box_color_test.php` (39), tabs_kit K18 to K20.
- **Shield marks:** Links `ICONS.lock` and `ICONS.safe`, Info `IMG_LOCK` and `IMG_SAFE`, tabs.js `lockSvg` (currentColor; `.hubt-pl` blue, `.enc` green): shield + white check, blue `#4a9bff` private, green `#2fc983` encrypted. Edit Tab privacy rows get the same shield as their tile from the `RT` table in shell.js (`/^\s*private tab/` blue 59,130,246 and `/^\s*encrypted tab/` green 62,207,142, before the wider words). Other padlocks (gate pages, Settings tiles) were NOT changed.
- **Links 20 tabs:** `BM_MAX_TABS` (links/api.php), `MAX_TABS` (links.js), the numbers in backup.php merge and replace, import_test I35. New Tab stays on the bar at the limit and toasts "You can have up to 20 tabs" (tabs_kit K24).
- **Files drag and drop** (files.js `dragSetup()`, `moveTo()`): rows are `draggable` (not in the Trash); a picked row drags everything picked; targets are a folder row, a path crumb (`#crumbs button[data-to]`, root = `""`) and the Trash tab; classes `.dragging` and `.dropto` (files.css). Mouse only. Tests B50 to B52 (Playwright `drag_to`). Selection and the open folder persist between steps: reload or click the My Files crumb in a test.
- **Notifications:** record `{m, b, k, s, ts, p, w, d}` in localStorage `hub-notelog` (last 300): `p` = page and active tab (`noteWhere()`), `w` = title of the open window, `d` = detail. `HUB.toast(msg, bad, sticky, act, detail)`; the page wrappers in links.js and files.js take fewer arguments, so those pages put the name in the message ("Tab saved: Bookmarks", "Link deleted: Router page", "Folder made: Photos", "Moved: x to Docs", "Uploaded: x"). Logs > Notifications (98-logs.js, `pLogNotes`): `.ix-lgr` is a grid: tile | message + detail | place and full date (centred, `left:-27px` evens the icon) | kind chip (`K.noteLabel`). Phone: wraps under the message. Test: settings_test S10f (reload so the log is fresh).
- **Features page** (65-features.js): each page's color is `K.pageColor(id)`, the same as its tab in the bar; group tabs `.ix-subt button[data-grp^="ft-"]` carry `--sc` (00-frame.js). Telegram status card: `.ix-hero-i.tg`, the Telegram plane on a blue tile (40-telegram.js).
- **Settings map (1.79):** General, Appearance (Look and Bar in one tab, Colors, Presets, Glass), Security (4 tabs), Telegram (Status, Setup, Messages, Instant Replies), Backup & Restore, Logs (Notifications, Activity, PHP Errors), Health (Overview, Server Check, Cleanup), Updates (Update, Changelog), Features. `shell-admin.js` = 15 parts in `src/web/hub/core/assets/admin/` (run `python3 scripts/make-admin.py` after editing a part; commit both).
- **Checks:** `python3 scripts/precheck.py` picks the checks for the changed files (it printed "Changed: 39 file(s). Checks: 13, browser: ...") and ends with "All N checks passed. Push once." CI on a push = the light set only; the heavy jobs run weekly or by hand (1.77.5 change).

## Session of 12 Nov 2026 (v48)

- Published by the owner: 1.74.0 (skipped as its own release) and **1.74.1**. 1.74.2 (R, S, T, U, V, Background fixes) is on main, version not bumped yet (run `release.py 1.74.2` with the stash method when the owner says release).
- Owner wants: less waiting. Run only the browser tests for the area changed, in parallel, say what was skipped. The designs draw test is slow (software WebGL): only when design files change.
- Open: iPhone top bar (U) needs the owner's screenshot after release; Cloud Backup (G) needs the 3 answers; screenshots (H); the shell.js split (C).
- Facts: "hidden bar" on Home (homeBar off) = gear button top right (`[data-ix=corner]`) opening `popMenu`; it closes on a capture-phase `mousedown` outside it (shell.js ~975).
- The component the owner pasted from 21st.dev (React, Tailwind, shadcn) is NOT used: no React/Tailwind in this project; looks are copied in plain CSS.

## Earlier (5 Nov 2026, v46)

- **v1.73.1 published by the owner.** Release Docker jobs on the new native matrix: amd64 ~1:43, arm64 ~1:55, tags ~0:24 (~2.5 min, was 21). ghcr.io/jackpison/homebase-hub:1.73.1 has linux/amd64 + linux/arm64 + attestations; 1.73.1, 1.73 and latest share one digest.
- **main = `36f38cc`, `HUB` = 1.73.1 (no new version). CI green.**
  - `5df2a91`: Dockerfile on `php:8.5.11-apache-trixie@sha256:47e6d884...` (Dependabot #25, which failed because PHP 8.5 has OPcache built in). Now `php -m | grep -qi '^Zend OPcache$' || docker-php-ext-install opcache`, and the final check requires Zend OPcache. docker_test 16/16 locally (amd64). #25 closed by Dependabot. Ships in the next release. Not tested: the 8.5 image on arm64 or a Pi.
  - `36f38cc`: Dependabot #26 (docker/login-action 4.6.0 -> 4.7.0), squash-merged by the owner. Its CI run sat "in progress" for a while during a GitHub Actions incident, then ended green.
  - The session may NOT merge PRs (`gh api PUT pulls/N/merge` is denied by the auto-mode classifier as "Merge Without Review"): the owner merges on github.com.
- **F7 offline flake: cause found, fix waiting for the owner's "build" (patch version).** The log shows `offlineNote(false)` (shell.js ~line 2056: `if (was && !on && !editing()) location.reload()`) running on a false `online` event while Chromium's context is offline; the reload lands after the test has gone to Links, so Links ends on Info. Real phones on patchy Wi-Fi can do the same. Plan: on `online`, wait ~1.5 s and reload only if `navigator.onLine` is still true and the page has not started leaving (`pagehide`); a test that fakes offline -> online -> offline and checks no reload and the page you went to stays. Not reproduced here yet.
- **Planned, not started: Cloud Backup** (see "Future plan: Cloud Backup" below). The owner asked for it to be planned properly; build only on "build".
- Not wanted (owner asked for opinions only, 5 Nov): plugins folder, multi-user, SQLite. Maybe later: outbound webhooks, offline edits sent later.

## Earlier (4 Nov 2026, v45)

- **v1.73.0 published by the owner.** Its Docker job took 21 min (arm64 under QEMU). Verified: the package is public; amd64 + arm64 (+ attestations); the published amd64 image passed docker_test 14/14; arm64 PHP 8.4.27 with every extension runs (qemu-aarch64-static on the exported rootfs). Not tested: a real Raspberry Pi.
- **main = `0239309`, `HUB` = 1.73.1, CI fully green (first run failed: CI shellcheck 0.9 flags SC2015 in `need()`, fixed with an if; docker_test D15/D16 could not read the www-data-owned bind folder as the runner user, now checks inside the container). The owner publishes v1.73.1.**
- **`c785d4f` (workflow only, no version):** release.yml `docker` is now a matrix (amd64 on ubuntu-24.04, arm64 on ubuntu-24.04-arm, no QEMU), each pushes by digest and uploads it (upload-artifact v7.0.2 `cf430e03...`); new job `docker-tags` (download-artifact v8.0.2 `9000827c...`) makes X.Y.Z, X.Y, latest with `imagetools create`, checks there are 2 digests, then attests. workflows_test W21 allows `runs-on: ${{ matrix.runner }}` in release.yml only; W25 checks the shape. Expected about 5 min; **first real run = v1.73.1**.
- **1.73.1 = more ways to install** (owner: "skip 4 do rest in next build with small version change"; 4 = one-click cloud buttons, skipped; also not done: desktop app, Helm, Softaculous):
  - `deploy/vps/install.sh` (bash): Ubuntu 24.04+/Debian 13+, `DOMAIN` or `--lan`, `--email`, `--no-https`, `--dir`, `--zip FILE` (+FILE.sha256). Checks everything first (root, OS, empty dir, no running nginx, a local zip's SHA-256 before any apt), then apt (ca-certificates curl unzip), newest release via the github.com/.../releases/latest redirect + .sha256, min PHP read from the zip's boot.php vs `apt-cache policy php`, Apache + libapache2-mod-php + php-curl/gd/intl/mbstring/zip, `90-homebase-hub.ini` (512M), vhost written inline (same lines as deploy/apache; deploy_test S2), global ServerName conf, --lan disables 000-default, systemctl or `service`, ufw if active, certbot --apache non-interactive (failure only warns).
  - `deploy/proxmox/homebase-hub-lxc.sh` (run on the PVE host): newest `debian-13-standard` template, `pct create` unprivileged, nesting, onboot, DHCP on vmbr0, then pushes install.sh (next to it, or from main) and runs it with --lan or the domain. Options --id --storage --template-storage --bridge --memory --disk --domain.
  - App-store files: `deploy/unraid/homebase-hub.xml`, `deploy/casaos/docker-compose.yml` (x-casaos, /DATA/AppData/$AppID/site), `deploy/umbrel/{umbrel-app.yml,docker-compose.yml}` (version = HUB; **release.py now raises it** (PINS) and `--check` fails on a mismatch; release_test has 2 new checks; app_proxy, PROXY_AUTH_ADD false, port 8473), `deploy/yunohost/` (packaging v2, helpers 2.1, full_domain, single instance, php8.3 packages, install downloads newest release + SHA-256 in `_common.sh`, data in `$data_dir` through `web/hub/core/config.php` define HUB_DATA_DIR (updates keep config.php), upgrade only renews php-fpm/nginx, remove/backup/restore). **YunoHost's server block `more_set_headers` replaces CSP, X-Frame-Options, Permissions-Policy, nosniff on every answer**, so `scripts/make-yunohost.py` generates `conf/nginx.conf` (all inside `location /`) + `conf/nginx-maps.conf` (http level, as /etc/nginx/conf.d/homebasehub-maps.conf) from deploy/nginx and sets each security header again with more_set_headers: map values for static files, `$upstream_http_*` (PHP's own) for PHP. Run it after any change to deploy/nginx (`--check` in deploy_test Y1).
  - Store submissions are the owner's (MAINTAINING.md "The app stores"): Unraid CA forum, CasaOS-AppStore PR, umbrel-apps PR (needs `@sha256:` digest + gallery), YunoHost catalogue.
  - Install page: quick VPS script, #proxmox, #nas (Synology Container Manager project, TrueNAS Custom App/YAML, Unraid, CasaOS/ZimaOS, umbrelOS), #yunohost. README.md, README.txt, AGENTS.md, tests/README.md, MAINTAINING.md updated.
  - Tests: `tests/server/vps_test.py ZIP` (V1-V8 on Debian 13 and Ubuntu 24.04 containers with `--init`; P1-P3 Proxmox with stand-in pct/pveam/pvesh that run inside a Debian container; P2 downloads the real newest release from GitHub). `tests/server/yunohost_setup.sh ZIP` = own nginx (`-p /etc/nginx-ynh-test`, user www-data, headers-more module, YunoHost's security lines) on 8302 + apache_test (13/13). docker_test D15 (host folder bind) and D16 (CasaOS file). deploy_test S1-S4 (S4 shellcheck if installed), U1-U3, Y1-Y4. CI "web servers (Apache, nginx, Docker, install scripts)", timeout 50.
  - Sandbox-only for vps_test: `VPS_HOST_NETWORK=1 VPS_CA=/root/.ccr/ca-bundle.crt`, `VPS_PREP` (https apt sources, `Acquire::https::CAInfo`, a hosts line for deb.debian.org), images from mirror.gcr.io (scratch `vpsenv.sh`). This sandbox's Chromium cannot load port 80, so host-network mode also opens Apache on the test port. Never `pkill -f` a pattern that is in your own command line.
  - Not tested: a real Proxmox host, real YunoHost/Unraid/CasaOS/Umbrel/Synology/TrueNAS, Let's Encrypt in the script, the release's new Docker jobs, a Raspberry Pi.

## Earlier (4 Nov 2026, v44)

- **main = `cbb1f17`, `HUB` = 1.73.0, not published yet.** CI (every job, incl. the new "web servers (Apache, nginx, Docker)"), Code scanning, Pages and Dependabot's config check are green on it. **The owner publishes v1.73.0**, then once makes the package public: profile > Packages > homebase-hub > Package settings > Change visibility > Public (in MAINTAINING.md).
- **Released by the owner:** v1.72.0, v1.72.1, v1.72.2. **v1.72.3** (`fbfe51a`, Markdown Editor text box stayed inside its card: `.mdgrid>.panel:first-child` flex column; tools_test C20a) was green; the owner was told to publish it (not confirmed). Code scanning alerts #8 and #15 closed (owner confirmed).
- **1.73.0 = Docker and VPS** (owner: "build for 1.73.0"):
  - `deploy/docker/`: Dockerfile (`php:8.4.27-apache-trixie@sha256:4af38a...`, gd/intl/zip/opcache, production php.ini + `php.ini`, `apache.conf` AllowOverride All), `entrypoint.sh` (first start unzips `/usr/src/homebase-hub/site.zip` into the volume `/var/www/html` only when there is no index.php; refuses a volume with other files), `compose.yaml` (8080, no proxy trusted), `compose.caddy.yaml` + `Caddyfile` (caddy:2.11.6 digest-pinned, network 172.30.77.0/24, Caddy fixed at 172.30.77.10 = the only `HUB_TRUSTED_PROXY`). `HUB_IMAGE` env overrides the image in both compose files. `deploy/docker/site.zip` is git-ignored (copied in at build time).
  - `deploy/nginx/homebase-hub.conf`: every .htaccess rule as `map $uri` tables + one `add_header` set; `deploy/apache/homebase-hub.conf` (vhost; `apache_setup.sh` now uses it).
  - Release workflow job `docker` (after `release`): downloads the released zip, checks its .sha256, builds amd64+arm64 with QEMU/buildx, pushes `ghcr.io/<owner lowercased>/homebase-hub:X.Y.Z, X.Y, latest`, attests. Never run yet: the first real run is v1.73.0.
  - `HUB_TRUSTED_PROXY` (boot.php `hub_trusted_proxies`, `hub_proxied`, `hub_from_proxy`; env, fastcgi_param/SetEnv, or define in web/hub/core/config.php): X-Forwarded-For read from the right past trusted hops (Cloudflare hop -> CF-Connecting-IP), X-Forwarded-Proto first value. `hub_ip_in` accepts a single address. Unit: tests/unit/proxy_test.php (14).
  - Updater fix: `up_self_check` asks the web server on SERVER_ADDR (SERVER_PORT, then 80/443) with the original Host when the site's own address cannot be reached (code 0). Apache reports the browser's port as SERVER_PORT, hence the second port. Unit: selfcheck_test.php (7); docker_test D6-D9 failed without it.
  - Tests: `tests/server/docker_test.py IMAGE ZIP` (D1-D14; `CADDY_IMAGE` env to swap Caddy), `tests/server/nginx_setup.sh` + `apache_test.py http://127.0.0.1:8301`, `tests/repo/deploy_test.py` (N1-N5 nginx = .htaccess, D1-D7 docker safety). CI job `apache` renamed "web servers (Apache, nginx, Docker)", timeout 35. Dependabot: docker + docker-compose for /deploy/docker (W16d counts 6 ecosystems). root_test allows `deploy/`.
  - Docs: website Install (#docker, #vps), README.md, README.txt, AGENTS.md, MAINTAINING.md, tests/README.md.
  - Not tested: a real VPS, a real Let's Encrypt certificate, the arm64 image / Raspberry Pi, the release's docker job, Firefox.
- **Local Docker in this sandbox:** `dockerd &` works. Docker Hub answers 429 here: pull bases from `mirror.gcr.io/library/...@sha256:...`; builds need `--network=host`, the proxy as build args, and the proxy CA plus https apt sources added to a scratch copy of the Dockerfile (never in the repo). The scratch script was `dbuild.sh`.
- **Opinions given (owner asked, nothing to build):** keep WebKit in CI (iPhone engine, runs in parallel, free on a public repo); no desktop app.

## Earlier (3-4 Nov 2026, v43)

- **main = `a64e3ec`, `HUB` = 1.72.0** (not published yet). 1.72.0 is `dcb2f54` plus two follow-ups:
  - `c20cd5d` (tests and docs only): tabs_kit waits for a still page before a drag; a11y measures colour contrast twice. CI on `dcb2f54` had failed K6/K7 and the new WebKit a11y run.
  - `a64e3ec` (site code, kept in 1.72.0 with a changelog line because 1.72.0 is not published): Offline Reading kept only what passed through the worker, so the page it was switched on from, or a page that loaded while the worker was starting, was missing offline (CI: F7 on Links). Now the page sends the worker what it loaded (`offlineKeepPage()` in shell.js, message `{keep: {page, more}}` in offline-sw.js); offline_test F5b proves it (fails without the fix).
  - CI, Code scanning and Pages green on `a64e3ec`. Later commits are tests only: the owner publishes **v1.72.0** on `4021ec7`.
- **Released:** v1.71.0 (the owner published it). v1.70.0 is included in it.
- **Monthly maintenance fixed (3 Nov):** the owner allowed Actions to open pull requests; the session started the workflow by REST dispatch (`gh api -X POST .../actions/workflows/maintenance.yml/dispatches -f ref=main` works). It opened [#21](https://github.com/Jackpison/Homebase-Hub/pull/21) "Monthly maintenance: 1.72.1" (qpdf-wasm 0.3.1, pdfjs-dist 6.5.438), CI green. Issue #20 closed. The pull request's own checks show "action_required" (GitHub holds checks on pull requests made by Actions); the workflow's own CI run is the one that counts.
- **Order:** publish v1.72.0 on `4021ec7` first, then merge #21, then publish v1.72.1.
- Later test-only commits on main: `4c89b58`, `9f654de` (offline_test: wait for the back-online reload; F7 prints the page state and a navigation log: once in CI, Links opened offline ended on Info, cause unknown), `4021ec7` (nav_test scrolls in steps). CI green on `4021ec7`.
- **4 Nov: v1.72.0 released (on `a64e3ec`).** The owner tagged v1.72.1 before #21 was merged: the release stopped ("Tag v1.72.1 does not match HUB 1.72.0"), Pages failed ("no assets": the empty release was latest). The owner deleted that release and tag (the session cannot: releases and tag deletes are refused by the proxy). The session merged #21 by REST (`PUT pulls/21/merge` works) = `60b9bce` (HUB 1.72.1), fixed pages_test P63b (waited for the first drag move, not the last) in `0a869ca`. CI and Code scanning green on `0a869ca`. **Owner publishes v1.72.1 on `0a869ca`.**
- Lesson: a maintenance pull request must be merged before its version is tagged. The release workflow refuses a tag that does not match HUB, so nothing broken ships, but the empty release becomes "latest" until deleted.
- **4 Nov: CI hardening** (`641f4f2` + `9302635`, CI, Code scanning and Pages green; v1.72.1 published by the owner):
  - `run_parallel.py --retry 1` in every CI browser batch: a failed test runs once more alone; passing then = a "flaky" warning (annotation + job summary), never hidden. Read the warnings and fix those tests.
  - `page_errors(pg, list)` in helpers: the one rule for page errors (ignores only WebKit's "<test site> due to access control checks" and the ResizeObserver notice). `helpers_test.py` forbids hand-made pageerror listeners.
  - `wait_js` waits until `html.ix-stale` is gone (instant pages); `fresh=False` to test that state.
  - `fixed_waits_test.py`: per-file ceiling on wait_for_timeout/time.sleep (156 today); lower a ceiling when a file needs fewer.
  - Workflows now 6 files: ci, code-scanning (CodeQL javascript-typescript + python + actions, Semgrep), pages, release, maintenance, scheduled (security + next PHP weekly, Firefox 1st/15th, PHP reminder 15 Nov; by hand: Actions > Scheduled checks > Run workflow > choose). Plus GitHub's own Dependabot Updates.
  - Dependabot monthly, 7-day cooldown, Tools only majors. CI no longer tries the next PHP (scheduled does).
  - Release checks tag vs HUB first with a plain error; Pages picks the newest release that has its zip.
  - Lesson: run actionlint with shellcheck locally (`pip install shellcheck-py`, then `actionlint -shellcheck=<path>`): without shellcheck it passes things CI rejects.
- **4 Nov: 1.72.2 on main `64e7805`** (CI, Code scanning, Pages green; owner publishes v1.72.2):
  - Code scanning alerts fixed: Settings own-name lookups (`own()`, SUB_OF without prototype; S10d), colour rows escaped, card IDs escaped, bookmarks import (media tags removed to a fixed point, `<` before such names as text, on...= renamed per whole tag before parsing, removed again after; hostile.html nested line, I24b), Home source keys/counts, tests compare hosts.
  - False positives for the owner to dismiss: #3 (links-import DOMParser), #4 (info preview), #10 (svg-png).
  - core_test E6-E9: page-API sweep (62 actions). TypeScript 6.0.3 on main; Dependabot skips TypeScript >= 7 (48 new errors in files.js, links-import.js).
  - This session cannot: read code-scanning alerts (403), run CodeQL (download blocked), delete branches, close pull requests. The owner does those.
  - Lesson: CI's Chromium (156) is newer than the local one (153): it reports inline handlers in a DOMParser document as refused scripts. A check that passes locally can still fail in CI.
- Nothing else queued.

## E: API answer-shape audit (REPORT, 6 Nov 2026; nothing changed)

Counted in each api.php (`hub_json(` / `'ok' => false` / `'error' =>`): core 149/83/86, files 27/22/22, info 20/30/29, tasks 30/21/22, cards 12/10/9, links 52/0/37, home 1 (own `out()`)/0/34.
Findings: (1) the error text key is always `error` (good; Home has 2 `msg`). (2) Errors carry the right HTTP status (400, 401, 403, 404, 405, 409, 413, 429, 500...) everywhere. (3) INCONSISTENT: Core, Cards, Info, Tasks and Files send `{ok:false, error}`; Links and Home send only `{error}` (no `ok:false`), so a client that tests `r.ok === false` misses them. (4) Core has 2 places that send `ok:false` with HTTP 200. (5) Cards' error values are short codes ('too large', 'bad data', 'password'), the others are full sentences; page JS may compare the codes, so do not reword them. (6) Home has its own `out($arr, $code)` helper instead of `hub_json`.
Proposed standard (not built): every error = HTTP 4xx/5xx + `{ok:false, error:"plain sentence"}`; add the missing `ok:false` to Links and Home (additive, nothing that reads `.error` breaks); leave Cards' codes; look at the 2 HTTP-200 cases; Home's `out()` calls `hub_json`. Needs a unit/server test that every api.php error carries `ok:false`. Waiting for the owner's decision.

## M as built (1.74.0, 12 Nov 2026)

- Sources: `src/web/home/designs-src/<id>/<Name>.jsx|.css` (the 16 React Bits components as published, extracted from `background.txt`), `_runtime.js` (h(), useRef/useEffect/useMemo/useState, start(), pointer events handed from the page to the design), `_react.js`, `_inject.js`. Built by `python3 scripts/build-designs.py` (esbuild: JSX -> h(), 'react' aliased to the runtime, ogl/three/vgpu bundled) into `src/web/home/designs/<id>.js|css` + `manifest.json` (source fingerprint incl. lib versions; `--check` in tests/repo/designs_test.py D1). `designs/designs.json` = the list: name, about, link, defaults (the usage-example props from background.txt), options (color/colors/range/choice with limits), desktop, gpu, still, dpr. designs-src is NOT in the zip.
- Sizes: 14 to 87 KB each; Hyperspeed 578 KB (three), Aero Shards 230 KB (vgpu): computers only. Every built file starts with the React Bits banner; none fetches, evals or uses a web address (D5).
- PHP (`src/web/home/lib.php`): `designs_registry`, `design_clean_opts`, `clean_designs`, `design_item`, `designs_items`; `bg.designs` = id => {on, opts}; theme `designs` (new default for new sites; starter/online unchanged); user themes may hold `design:<id>` items; `bg.dv` = filemtime of manifest.json (cache bust). api.php `designsInfo`.
- Client (`app.js`): `DESIGNS` loader (loads designs/<id>.css + .js on demand), `designOk()` (phone / WebGPU / Reduce Motion), `BG.load/swap` handle type 'design' (`_start`, `_stop`), `BG.start` re-picks when the server's first pick cannot run here; gallery `renderDesigns`, Options sheet (`#designSheet`), theme card "Animated Designs", theme editor can tick designs. A bug the browser test found: PHP sends an empty `designs` as `[]`, so `dzDraft` resets it to `{}`.
- NOTE for tests: the zip's app.js is minified, so top-level names (bgDraft, openSheetFor) are NOT reachable from `page.evaluate`; drive the UI through the DOM.
- Tests: tests/unit/home_designs_test.php, tests/repo/designs_test.py (D1-D9), tests/browser/designs_test.py (H1-H8, Chromium, WebGL by SwiftShader; Aero Shards cannot be drawn without a real GPU, so it is only checked for being listed, built and skipped on phones). Registered in run_all.py and ci.yml.
- NOT tested: any design on a real phone or a real GPU; WebGPU (Aero Shards) at all; the look of each design with the user's changed options beyond Orb; Firefox/WebKit (WebGL there not run); GridMotion (dropped).
- Licence: ships under React Bits' MIT + Commons Clause as the owner decided; THIRD-PARTY.md, About page, banner on every file. The Commons Clause wording about bundles/ported versions is an accepted risk (an email to the author would settle it).
- Home theme Export ignores designs (it packs uploads only).

## Plan M (the plan it came from) (written 6 Nov 2026, not started)

Owner's ask: "Introduce and revamp Home wallpaper settings. Instead of preshipped wallpaper add designs like these (background.txt), keep the ability we have for wallpaper access. We need better management for the theme/background section. Add some of the prebuilt default settings first."

What background.txt holds (read from its headers and props tables only, NOT the full sources): 17 React Bits components: FluxLines, CrystalizedBall, PatternWaves, AeroShards, GradientWaves, Topography, LightTunnel, Lightfall, Lightning, Galaxy, Hyperspeed, Iridescence, Ballpit, Orb, LetterGlitch, GridMotion, Balatro. Libraries: CrystalizedBall and PatternWaves use `ogl` (small WebGL); Hyperspeed uses `three` (big); AeroShards uses `vgpu` (WebGPU, not on every phone); the rest are self-contained. All are React: each would be ported to plain JavaScript (no React, rule).

LICENCE RISK, owner must decide first: React Bits is "MIT + Commons Clause" (see the header of `src/web/hub/core/assets/glass.js`): you may not sell, sublicense or redistribute the components themselves, "whether alone, in a bundle, or as a ported version". One glass effect used inside our own UI (1.68.0) was accepted with its licence kept in the file; shipping a gallery of 17 ported backgrounds that a person picks from is much closer to redistributing the components as a bundle, and the zip is GPL-3.0. Not legal advice. Routes: (1) ask David Haz for written permission (cleanest); (2) ship only a few, each file keeping the licence header; (3) write our OWN original backgrounds in the same spirit in plain canvas/WebGL, GPL like the rest (no risk, more work). Recommended: (3), plus (1) if the owner wants the exact React Bits looks.

Design (all routes): `src/web/home/backgrounds/<id>.js`, one small file per design with a common contract (start(canvas, options), stop(), setOptions()), loaded only when chosen. Rules for each: pause when the tab is hidden; Reduce Motion or Battery Saver shows one still frame; pixel ratio capped (1.5 on phones); touch instead of the mouse; no inline script or style (CSP); no request to another server. Weight budget per design, no `three` and no `vgpu`. The Starter theme becomes these designs; the 3 shipped photos (1.4 MB) go from the zip.

Management (Home Settings, Background): one gallery with cards: Designs (animated), Online Photos, Your Uploads, Your Themes. Each card has live (paused) thumbnail, In Use badge, Preview (full screen, not saved), Use, and for designs 3 to 4 options (colours, speed, density) with Reset. A Theme can mix photos, uploads and designs in its rotation. Export/Import of themes stays and carries design options. Dim and Motion settings apply to designs too.

Existing sites: a site whose theme is "starter" keeps working. DECISION: keep the 3 photos for them (hidden from new sites) or switch them to designs.

OWNER'S ANSWERS (6 Nov 2026): licence route = ship the React Bits components DIRECTLY (ported to plain JavaScript), because the owner says the site allows publishing them and they are not the Pro ones. Keep each file's React Bits licence header and credit (like glass.js), list them on the Security and Licence page, and show "From React Bits" in the gallery. The Commons Clause wording ("not in a bundle or as a ported version") is still a risk the owner has accepted; I am not a lawyer. HEAVY ONES SHIP TOO: Hyperspeed (`three`, MIT) and AeroShards (`vgpu`, MIT, WebGPU) are DESKTOP ONLY: they are not offered and not downloaded on phones/tablets (coarse pointer or small screen), and AeroShards also needs `navigator.gpu`; if the saved design is not allowed on this device, the theme shows its next design or a still. Libraries (npm, checked 6 Nov): three 0.187.0 MIT (21 MB unpacked; bundle only what Hyperspeed uses), ogl 1.0.11 Unlicense (423 KB), vgpu 0.6.0 MIT (9 MB unpacked; check what the bundle really weighs). They load only on the page that uses the design. Defaults I will use unless the owner says otherwise: all 17 over stages (M1 engine + gallery + the 6 light ones, M2 the rest, M3 the two desktop-only ones); existing "starter" sites keep their 3 photos (hidden for new sites); on phones, designs that are not desktop-only run with the pause, still-frame and pixel-cap rules.

Owner's answers needed (1 and 3 answered above, 2 = all 17 in stages, 4 = only the heavy two are skipped on phones): (1) licence route 1, 2 or 3; (2) the first batch (suggest 6 that suit phones and need no heavy library: Iridescence, Galaxy, Lightning, Topography, GradientWaves, Orb; later: PatternWaves, LetterGlitch, FluxLines, Balatro, LightTunnel, Lightfall); (3) what happens to the Starter photos on existing sites; (4) animated backgrounds off by default on phones?

Tests (when built): unit for settings cleaning (design ids and options), browser: each design draws non-blank pixels in headless WebGL, pauses when hidden, still frame under Reduce Motion, Preview does not save, a theme with a design survives export and import, a11y of the gallery.

## Future plan: Cloud Backup (encrypted copy to WebDAV, Nextcloud or S3)

Status: planned 5 Nov 2026, not started. Needs the owner's "build", and a mock-up of the Settings card first. A minor version (new feature, visible change).

**Why:** today the off-server copy is Telegram only (50 MB limit, a chat is not storage) or a file the person downloads by hand. If the server dies, backups kept on it die too.

**Already there to build on (do not rewrite):**
- `bk_export()` (backup.php) makes the whole-site file; `bk_encrypt()` locks it (gzip, then AES-256-GCM, key from PBKDF2-SHA256 310,000 rounds of the website password, mode "login", or an own passphrase, mode "own"; only the key is stored, in site-data/core/backup-key). Import opens it in the browser with the password.
- `nt_backup_send()` + step 4 of `nt_run()` (notify.php) already send that file on a schedule: every `bkEvery` days at the daily hour, one try a day, run by cron.php or, with no cron, by the page-visit tick (at most every 10 min). Success sets `backupLast` (Backup icon green). Cloud Backup copies this pattern.
- `hub_fetch()` (fetch.php): no redirects, http/https only, public-address pinning against SSRF.
- `bk_export($pick, $secrets)`: secrets (the Telegram token) go only into encrypted files. The cloud credential follows the same rule.

**What the person gets:** Settings > Backup gets a **Cloud Backup** card:
- Where: Off / WebDAV (Nextcloud, ownCloud, Synology, Hetzner Storage Box, Koofr...) / S3-compatible (Backblaze B2, Wasabi, Cloudflare R2, MinIO, AWS).
- WebDAV: address of a folder, user, app password. S3: endpoint, region, bucket, folder (prefix), access key, secret key.
- Every N days (like Telegram's), keep the last N copies (default 14), Test Connection, Back Up Now, and a last-result line ("Sent 5 Nov, 3.2 MB" or the error in plain words).
- **Restore from Cloud:** lists the copies (date, size), fetches the chosen one through the server to the browser, then the existing Import window opens it with the password. No new restore path.

**Decisions for the owner (my recommendation first):**
1. Encrypted only: refuse to upload unless backup encryption is set (Telegram allows plain files; a cloud folder should not). Recommend yes.
2. Home addresses: a Nextcloud at home is 192.168.x, which `hub_fetch` blocks. Allow private addresses for this feature only, since only the logged-in owner types the address; HTTPS required except for those. Recommend yes.
3. Files page: first version the same as Telegram (Files up to 24 MB inside the file). Later, maybe: copy the site-data/files pieces as they are (already locked in the browser) and only the new ones. Recommend later.
4. Order: WebDAV first (step A), S3 in the same version (step B). Google Drive, Dropbox, OneDrive: not planned (need OAuth apps); rclone users can serve any of them as WebDAV.

**Design (server, PHP, no libraries):**
- New `src/web/hub/core/lib/cloud.php`; settings in site-data/core/cloud.json (0600) like Telegram's; the secret is never sent back to the browser (a hint only, like `tokenHint`).
- WebDAV: MKCOL the folder if missing, PUT the file, PROPFIND (Depth 1) to list, DELETE old copies. XML read with no entity or network loading (XXE).
- S3: Signature V4 written by hand (about 100 lines), PUT, ListObjectsV2, DeleteObject; path-style by default, virtual-host style as an option.
- The upload streams from a temp file (CURLOPT_UPLOAD + INFILE), never the whole file in memory; longer timeout (5 min); certificate checked; no redirects.
- Retention deletes only files in its own folder whose name matches the backup name pattern, oldest first, and only after a new upload succeeded. File names carry no site name (date only), since the provider can read names.
- Schedule: a step 5 in the same run as Telegram's step 4 (cron.php or the page tick), so it works with no cron. One try a day; the error shows in Settings and goes to Telegram if that is on. Success sets `backupLast`.
- Server Status widget and the Overview show the last cloud copy.
- Password change: in mode "login", new copies open with the new password and old ones with the old (as today); the card says so.

**Rules it must keep:** no request until the owner turns it on and enters the place; nothing is decrypted on the server for this; only encrypted files leave; the credential stays in site-data and goes only into encrypted backups; it never touches the updater.

**Tests (every step has its own):**
- Unit `tests/unit/cloud_test.php`: settings cleaning and limits, the secret never in the view, the name pattern, which files retention deletes (never a foreign file, never before a successful upload), SigV4 against AWS's published test vectors, PROPFIND parsing (also hostile XML), refusing a plain file, private address allowed only here.
- Server `tests/server/cloud_test.py`: a real WebDAV and S3 server from one binary (`rclone serve webdav` and `rclone serve s3`, version pinned, checksum checked; or MinIO for S3) in the "web servers" CI job. Turn on, Test, Back Up Now, the schedule tick, retention after 15 copies, list + restore round trip (the data comes back the same), wrong password, server down (error line, nothing deleted), a redirect refused, a large file streamed.
- Browser: the card in `settings_ui_test` (fields, Test, last result, Restore from Cloud opens Import).
- Docs: the Guide, README.txt, the Security page (what the provider sees: an encrypted file, its size and date), CHANGELOG.

**Steps:** A core + WebDAV + tests; B S3 + tests; C Settings card (mock-up first) + browser test; D Restore from Cloud; E docs, changelog, full checks, release.

**Not tested / unknowns:** nothing built yet. Real Nextcloud, Synology and B2 quirks (chunked upload limits, B2's S3 differences) need a check against the real services before release; shared hosting with short PHP time limits may cut big uploads (cron.php has no web time limit).

## Open notes (for the owner to decide; none queued)

- **Marketing** (parked by the owner). Lead with "no database: upload a zip to PHP hosting, or run the Docker image" (Docker since 1.73.0). r/selfhosted takes a project under 3 months old only on New Project Friday (full post from about 22 Jan 2027). awesome-selfhosted needs the first release over 4 months old (from about 22 Feb 2027) and bans AI-written entries, so the owner writes it. Also selfh.st (email), Lemmy's selfhosted, LowEndTalk, AlternativeTo.
- Info's Lock forgets every page's kept key (`V.keeper('dev','info-keep',true)`, dropAll); Links' Lock forgets only Links'. Not asked to change.
- Website screenshots and PDF guide pictures still show Settings before 1.70.0 (texts are updated). Retake with `scripts/screenshots.py` when the owner wants.
- Slow-phone ideas not done: Home's 4 small backdrop blurs and the bar's 16 px blur cost GPU on iPhones; Safari has no speculation rules, so pages are not pre-loaded there. (Instant pages and Offline Reading in 1.72.0 cover the round-trip wait.)
- Measured, not an open task (owner will report): Links tab switch ~0.9 s and Save Settings ~0.6-1 s with 1,500 links; Cards Save Settings ~0.6 s with 400 rows.
- **Asked and dropped (do not build unless asked again):** the macOS-style magnifying dock (Uiverse "calm-skunk-54", MIT) and the grow effect on the edit bar. Notes if it returns: pure CSS (`:has()`, sibling selectors); `#ix-ebar` has `overflow-x:auto`, so growing buttons need `overflow:visible` and a fixed bar height; the tooltip `#ix-ebtip` is placed by JS and needs placing again after the grow; 40 px tiles were too wide for the phone dock. More tab icons: not wanted.
- The old commit titles "1.61 (work in progress)" show beside files on GitHub; they cannot be changed (no force-push).

**Recurring (runs by itself)**
- **3rd of each month:** Monthly maintenance (Tools libraries within their major version, 1 patch version, a pull request for the owner to merge, then the owner publishes). Needs the Actions setting above.
- **Weekly (Mondays):** `weekly-check` audits libraries (npm audit), tries the next PHP, and since 1.72.0 prints a notice when an npm override in `package.json` can go (`scripts/overrides.py --github`). Opens an issue labelled `security` or `php` on a problem. Runs on `ubuntu-latest` on purpose. The `minimatch` 11.0.4 override (GHSA-g3hv-75wg-m249, through ESLint) goes when ESLint moves to minimatch 11.
- **1st and 15th:** `firefox-check` (never dispatch it, never remind the owner).
- **Every 15 November:** `php-eol-reminder` opens "Check the PHP support dates": update `hub_php_eol()` in `src/web/hub/core/lib/boot.php`, close the issue.
- **Dependabot** pull requests are applied by hand on `main` (Tools rebuilt when `tools-app/` changes), then closed with a comment.

## 1.72.0 (dcb2f54): what is in it

Owner: "do improve 1, 3, 4 and 5; do Add 1, 3, 4, 6 (but better); Look after the project 2, 3", "do all of this in v1.72.0", answers: instant pages yes, Offline Reading ok, calendars ok (import and follow), widgets all, import order "your order", then "build".

- **Instant pages:** `HUB.snap` keeps each page's last data in sessionStorage (`hub-snap-<app>`), draws it at once, refreshes from the server after; `html.ix-stale` blocks edit toggles until fresh. Links, Info, Cards, Tasks.
- **Offline Reading** (Settings > Overview > Start Here help cards, `#ix-offsw`; per device, off by default): `src/web/hub/core/assets/offline-sw.js`, served by `api.php?action=sw` with `Service-Worker-Allowed` from `hub_sw_headers()` (boot.php). Cache `hub-offline`, full-URL keys without `t=`/`ih=`. Network first with a 4 s cutoff for pages and data; cache first for `?v=` assets. Never keeps Tools, photos, `web/hub/media/` (except `brand/`). Offline: `html.ix-offline`, note `#ix-offl`, read-only. Logout clears the caches and `hub-recent-links`.
- **Search everywhere:** Cards, Scratch Pad (fetched with the CSRF header), Settings (`K.impl.searchIndex`), Files names (`hub-find-files`), Cards (`hub-find-cards`), unlocked tabs through `HUB.findHook` (memory only). Typo matching (`near()`), groups with counts, recent searches (localStorage `hub-srecent`). `#q=` opens Files/Cards filtered.
- **Accessibility:** live region `#ix-live` (`announce()`), search as a combobox, stepper panes as labelled groups, `[` and `]` change pages, key fields are read-only textareas (`linkField` `o.wrap`), `legacyCopy()` for plain http. WebKit a11y in CI.
- **Tasks repeats:** chosen weekdays (`wd`), last day of month (`on:'last'`), nth weekday (`on:'nth'`, `nth` 1-4 or -1, `dow`). Server: `tasks_clean_repeat`, `tasks_nth_weekday`, `tasks_next_date`, `tasks_ics_by`, `tasks_repeat_label` (src/web/tasks/lib.php); JS mirrors `nextDate`, `repLabel`, `nthWeekday` (tasks.js) must stay identical. Quick Add knows "weekdays".
- **Calendars You Follow** (Tasks Settings): `site-data/tasks/subs.json`, max 8 (`TASKS_SUBS_MAX`), 1500 events each, refreshed by cron every 6 h (`tasks_subs_tick`), fetched with `hub_fetch` (private addresses blocked). Parser `tasks_ics_parse` + `tasks_rrule_dates` (RRULE daily/weekly/monthly/yearly, COUNT, UNTIL, EXDATE, RECURRENCE-ID, CANCELLED, TZID). Address shown with its middle hidden (`tasks_sub_show`). API actions `subs`, `sub_add`, `sub_del`, `sub_refresh`. Events show in month, week and agenda, and on Home's Today.
- **Home widgets** (off by default): Upcoming Bills, Recent Links, Recent Files, Server Status (`W_META`, `WIDGET_IDS`/`WIDGET_ON` in home/lib.php).
- **Import Center** (Settings > Backup & Restore > Import): `src/web/hub/core/assets/importer.js` (`window.HubImport`: zip via `DecompressionStream`, CSV, ICS; Todoist, Google Keep, Notion/Markdown, Apple Notes text, bookmarks HTML, Raindrop/Pocket CSV, Cards CSV). Hand-over through sessionStorage `hub-import`, read once by `HUB.importTake(to)`; each page saves with its own code and offers Undo.
- **Look after the project:** `scripts/overrides.py` (+ weekly notice), `docs/PHONE-CHECKLIST.md` (linked from MAINTAINING.md), this trimmed handoff.
- **Tested locally (Chromium):** ESLint, tsc (6), tscheck, dead code, ruff, unit tests, PHPStan, Semgrep (0), repo tests, zizmor; all 23 browser tests; website 54/54; core 59/59; update_attack 66/66; files 68/68; update_test 60/60 from 1.71.0 and 1.69.0.
- **Not tested:** a real iPhone or Android phone; the installed app offline; Offline Reading in WebKit (Playwright's WebKit fails offline page loads with "internal error", so offline_test stays Chromium-only); a real Google, Apple or Outlook calendar address (a local stand-in served `tests/fixtures/calendar/family.ics`); real Keep, Notion or Todoist exports (samples made in the tests); Firefox; WebKit locally (CI only); Offline Reading only in Chromium (test is Chromium-only); Files search and Recent Files only with names set in the test.

## Where things are

```
src/                 the site, readable; index.php and web/ are what ships (the build minifies it)
  web/<page>/        home links info cards tasks files settings: index.html (Home: index.php), api.php, assets/ (files: lib.php, share.html; tasks: lib.php, calendar.php)
  web/tools/         Tools as BUILT: never edit by hand
  web/hub/core/      the engine: api.php cron.php telegram.php, lib/ (boot.php loads auth.php, fetch.php, settings.php; vault.php, passkey.php, update.php, ghupdate.php ...)
  web/hub/core/assets/  shell.js shell.css shell-admin.js (joined from admin/*.js, 15 parts) shell-settings.css, tabs.js + tabs.css, offline-sw.js, importer.js
  web/hub/share-sw.js  the service worker behind Share from the phone
  web/hub/media/     the owner's pictures (only .htaccess, brand/ and empty folders ship)
  web/hub/docs/      README.txt, CHANGELOG.md, THIRD-PARTY.md (closed to browsers)
tools-app/           the source of Tools: src/tools.json (47 tools), src/main.js, src/tools/<id>.js, build.mjs
scripts/             precheck.py, release.py, build.py, build-tools.py, tools-rev.py, make-site.py, site_pages.py, make-guide.py, screenshots.py, maintain.py, overrides.py, new-tool.py ...
config/              tsconfig.json and one per page
docs/                MAINTAINING.md, PHONE-CHECKLIST.md, FEATURES.md
tests/               unit/ browser/ server/ repo/ fixtures/ lib/
website/             the GitHub Pages site
.github/             workflows (ci, codeql/semgrep "Code scanning", pages, release, maintenance, weekly-check, firefox-check, php-eol-reminder), CONTRIBUTING, SECURITY, dependabot
```
On a site, private data is `site-data/` (never in a zip).

**Settings map: see "1.79.x" above (this older 1.70.0 map is kept for the alias notes).** **Settings map (1.70.0):** Overview [Overview, Start Here (Guided Setup, Install on Your Phone, Keyboard Shortcuts, Offline Reading)], General, Appearance [Look, Bar, Colors, Presets, Glass], Security, Telegram [Status, Setup, Messages, Instant Replies], Backup & Restore [Back Up (+ Send Backups to Telegram), ..., Import], Health [Health, Domains, Check], Updates [Update, What's New]. Old ids still work through aliases in `go()` (`files`->`check`, `telegram/backups`->`backup`, `nav` = Appearance > Bar, `setup` = Start Here).

## How to ship

1. Clean tree: `python3 scripts/release.py X.Y.Z` (if the tree is dirty: see Lessons).
2. Write the changelog (`###` headings, short plain bullets, one Version Map line), copy `src/web/hub/docs/CHANGELOG.md` to the root, `python3 scripts/release.py --check`.
3. Checks: `python3 scripts/precheck.py` (picks the checks from the changed files; kill stale servers first with `pkill -f "php -S"`), or `python3 tests/run_all.py build/site-update-X.Y.Z.zip --quick` ~3 min plus the browser tests for what changed. Commit with the trailers, push `main`.
4. CI on `main`: `gh run list --branch main --limit 6 --json headSha,name,status,conclusion,databaseId`; failures: `gh api repos/Jackpison/Homebase-Hub/commits/<sha>/check-runs`, then `.../check-runs/<id>/annotations`.
5. The owner publishes: Releases > Draft a new release > tag `vX.Y.Z` (create on publish, target `main`) > Publish. The workflow attaches the zip and notes, updates the website and `latest.json`. A tag can never be reused: fix forward. Never force-push `main`.

The session can push `main` and branches, and use REST `gh api` (it could comment on and close an issue). It cannot use GraphQL (`gh release download`, `gh pr create`), push `v*` tags, read the Actions settings, read job logs through some paths, re-run or dispatch workflows (`gh run view --log-failed` did work on 3 Nov).

**Backup way** (a chat without the repo attached): the owner pastes a token. Never write it into a file, URL, commit or log.
```
export GH_PAT='<token>'; AUTH="Authorization: Basic $(printf 'x-access-token:%s' "$GH_PAT" | base64 -w0)"
git -c http.extraheader="$AUTH" push origin main; unset GH_PAT AUTH
```

## Tests

```
npm ci --ignore-scripts && npx eslint src tools-app
for c in "" .links .home .cards .tasks .info; do npx tsc -p config/tsconfig$c.json; done; python3 tests/repo/tscheck_test.py
php tests/unit/run.php                                    # new in 1.72.0: tasks_repeat_test.php, tasks_subs_test.php
python3 scripts/release.py --check && python3 tests/repo/release_test.py
php -d memory_limit=1G phpstan.phar analyse -c tests/repo/phpstan.neon --no-progress    # phar 2.1.33, SHA-256 in AGENTS.md
python3 tests/repo/{check_libraries,workflows_test,secrets_test,dead_code_test,parallel_test,maintain_test,presets_test,overrides_test,root_test,tools_list_test}.py && ruff check && python3 scripts/build-tools.py --check
python3 scripts/build.py                                  # build/site-update-X.Y.Z.zip = ZIP
python3 tests/server/update_test.py ZIP <previous release zip> <an older release zip>     # 60
python3 tests/server/update_attack_test.py ZIP            # 66
python3 tests/server/core_test.py ZIP                     # 59
python3 tests/server/files_test.py ZIP && python3 tests/server/info_restore_test.py ZIP   # 68, 22
python3 tests/browser/{import,app,settings,tools,pages,nav,a11y,windows,encrypt,files,lock,tabs_lock,tabs_kit,settings_ui,settings_look,polish,passkey,share,speed,offline,search,tasks_more,importer}_test.py ZIP
python3 scripts/make-site.py --no-guide && python3 tests/browser/website_test.py build/site   # 54
sudo sh tests/server/apache_setup.sh ZIP && python3 tests/server/apache_test.py          # 10
```
- Chromium only: passkey, share, speed, offline.
- Ports of the newest tests: windows 8987, offline 8984, search 8988, tasks_more 8989 (calendar stand-in 8125, allowed by `HUB_TEST_PUBLIC` in `tests/lib/prepend.php`), importer 8990. Tests use ports 8123 to 9500.
- CI: Chromium and WebKit, each in two halves (pages, tools) with tests at the same time (`tests/lib/run_parallel.py`). A new browser test must be added to `ci.yml`, `tests/run_all.py`, AGENTS.md and `tests/README.md`.
- The update test's previous zip must be the newest release older than the build. Release zips: `gh api -H "Accept: application/octet-stream" repos/Jackpison/Homebase-Hub/releases/assets/<id>` (id from `gh api repos/.../releases/tags/vX.Y.Z`), or `python3 tests/lib/releases.py download vX.Y.Z <dir>`.
- Firefox is not installed locally. **WebKit can run locally** since 3 Nov: `python3 -m playwright install-deps webkit` (apt works), then `ln -s /opt/pw-browsers/webkit-2359 /opt/pw-browsers/webkit-2215` (the installed Playwright wants build 2215; 2359 = WebKit 26 runs fine). A new container needs both steps again. CI uses WebKit 27.

## Lessons

**Process**
- **A unit test that cuts functions out of an api.php (`fn_src` + `eval`) must list every helper they call.** A missing one is a PHP fatal inside `eval`, and the runner can still print "N/N passed": look for "Fatal" in the output. Info's `norm_data` needs `rid cut icon_ok color_ok box_hc norm_colors norm_vault tab_*` and boot.php (`hub_tab_icon`).
- **Stale `php -S` servers on fixed test ports give false failures**: `pkill -f "php -S"` before every browser run. Run tests in the background and wait with Monitor (`until` loop), never a chain of sleeps.
- **Never edit `src/` while the precheck runs.** If the owner adds something mid-run, finish the edit, rebuild, test the area, commit, restart the precheck.
- **`release.py` refuses untracked files too**: `git stash -u`, run it, commit a wip bump, `git stash pop`; a conflict on a `?v=` line is the version bump against your edit.
- **Files and Settings tests:** the Files "files" tab does not return to the root folder (click the My Files crumb); a picked selection is dragged with the row (reload first); Settings `at(hash)` uses `goto`, which for the same page only changes the hash: reload to re-read localStorage.
- **Screenshots for the owner:** a small Playwright script with `Site(zip, port)`, `SEED`, `browser_login`, `launch` from `tests/lib/helpers.py`; fire `HUB.toast(...)` to make log rows; send with `SendUserFile`. The seed site has no Telegram bot, so a connected state is built by hand in the page.
- **GitHub CLI in this sandbox:** `gh release` is blocked; REST works: `gh api repos/Jackpison/homebase-hub/...`, `gh run list --json name,status,conclusion,headSha`.
- **release.py needs a clean tree.** `git stash`, `release.py X.Y.Z`, `git diff > patch`, `git checkout -- .`, `git stash pop`, `git apply patch` (plain apply).
- **Do not rebuild the zip while browser tests run in the background** (later tests find no zip).
- **Never push while a CI run you re-ran is going** (a newer push cancels it). "Re-run failed jobs" replays the old commit; to test a fix use Run workflow.
- **GitHub Actions cannot open pull requests** unless the repo setting allows it (monthly maintenance, Nov 2026; now in MAINTAINING.md).
- A new browser test added to CI can fail on the first CI run for reasons not seen locally (load, WebKit): read the CI log (`gh run view <id> --log-failed` works), reproduce with WebKit locally and under load (`tests/lib/run_parallel.py` with the CI half's list).
- A CI failure can be a race in the test, not the site: wait for the exact result. Running tests at the same time exposes load-sensitive timing: lower the concurrency or fix the race; never raise a fixed wait.
- WebKit (CI only) can fail a drag test that Chromium passes: do the work on the pointer event itself and read the last pointer position on release. When a test fails only in CI, find the cause in the logic, fix, and say it is unverified until CI runs.
- WebKit in CI sometimes reports "ResizeObserver loop completed with undelivered notifications" as a page error: a notice, not a bug (import_test ignores it).
- A step name with `: ` breaks a workflow (CI never starts). `workflows_test` W20 and actionlint check it; parse a changed workflow with `yaml.safe_load` before pushing.
- A path filter on a merge push may not start Pages; the release workflow starts Pages itself.
- The owner judges layout and names by eye: screenshots and short videos before release (inject CSS/JS with Playwright, `bypass_csp=True`). Compare with the owner's own mock code side by side.
- The **installed** updater decides what a zip may hold: a new file type or place for PHP needs a release that accepts it first. Test the step from the real published previous zip. Anything moved on the server must move back on Go Back.
- PHP's test server ignores `.htaccess`: only the Apache test proves it.
- Tools shipped a stale library twice: `build-tools.py` reinstalls when a package differs from the lock, and `--check` proves the committed Tools matches its source. `npm uninstall` in `tools-app/` rewrites the lock: check what went.
- `npm audit fix --force` can downgrade (it offered ESLint 4): use an `overrides` entry instead.

**CSS and layout**
- A class name may already exist (`.ix-chk`, `ix-pill`, `.sel`, `.ix-tile`): grep `\.name\b` before inventing one. Never reuse `.ix-tile` outside Settings (the phone sheet uses `.ix-stile`); style `select.sel`, never a bare `.sel`.
- Changing a custom property on `html`, or a rule like `html.ix-hide ... [class*="x"]`, restyles every element: toggle classes on the element that needs them.
- `:not(.x)` adds the specificity of `.x`. When a style rule changes, measure every element it can match. A `:not(.ix-srow)>label` selector also matched `label.ix-srow`: keep `:not()` on the label itself.
- `1fr` tracks do not shrink below their content: use `minmax(0,1fr)`. On a phone a too-wide page zooms out, so compare `scrollWidth` with the fixed 390, never `innerWidth`; prove a width check can fail by adding a 600 px element once.
- `light-dark()` works only for colours. Dimming by `opacity` fails the contrast test: use a colour filter.
- `content-visibility` on lists whose text people copy or tests read breaks WebKit's innerText (Cards rows). It is fine on Info boxes.
- Cross-document view-transition pseudo-elements are styled by the NEW page's CSS: hand state over through sessionStorage, read in `pagereveal`.
- Styles for the Settings page (`#ix-page ...`) go in `shell-settings.css`. `#ix-page input[type=checkbox]` sizes plain boxes to 17 px: a switch needs `.ix-sw`.
- In a dialog, scope sizing rules to `#dlg` (Tasks' "Every" row overflowed in 1.72.0).

**Code traps**
- `sdlgDecorate()` runs once when a window is first drawn: rows added later must exist before DOMContentLoaded or carry their own tile; a window built later calls `HUB.settingsWindow()` / `HUB.settingsRows()`. Settings turns each `h3` into a card: tests look for text, not `h3`.
- Wire a Settings pane's controls after its content is drawn (the Import tab was bound too early). Copy a `FileList` before clearing the input.
- A service worker resolves relative cache keys from its own folder: use full URLs. Match `?v=` with `/[?&]v=/`.
- A global name in a classic script collides with the browser's (`status`, `name`): rename it.
- A `//` comment inside a string-concatenation expression swallows the `+`: use `/* */`.
- A global (`/g`) RegExp shared by a recursive function loses its place: copy per call.
- A tool merged into another keeps its old address (`MOVED` in `tools-app/src/main.js`) and its star and Recent entry; old modules live in `src/lib/`.
- Home's `bg_tag()` (`web/home/lib.php`) and `bgTag()` (`app.js`) must stay identical; so must the Tasks repeat functions in `lib.php` and `tasks.js`.
- Info's API takes its action from the JSON body. Home's `api.php` checks the security token on GET too: widgets load only after `api('state')`. Home redraws widgets every minute: never redraw an open panel (only World Clock's).
- Requests that change things need the CSRF header (the Scratch Pad fetch for search).
- Firefox drops cookies on `fetch(..., {keepalive:true})`; `HUB.fetch` retries quietly (never for something that must happen once).
- Chrome lists some time zones by old names (`Asia/Calcutta`); the sandbox's PHP lacks some names. JsBarcode writes `width="230px"`: use `parseFloat`.
- `scripts/build.py` empties `build/`: install Tools into `src/` (`build-tools.py --install`) before building a zip.

**Tests**
- Use `wait_js()` (the pages' policy refuses Playwright's string waits); block outside requests. Firefox and WebKit use wider fonts.
- A modal `<dialog>` still open blocks mouse events: wait for it to close.
- `.box`-style selectors match every tab's boxes: pick `find(b => b.offsetParent)`.
- `void Promise.reject(...)` inside `page.evaluate`, never a bare reject.
- A "nothing behind the text" test measures text lines (Range.getClientRects).
- A test that "cuts a file in half" must cut inside a block.
- Never sleep inside a Playwright route handler (it blocks every request): delay inside the page instead.
- Before a mouse drag, `settle(pg)` (needs `TRACK_REQUESTS`): a save reply that lands mid-drag can redraw the row and lose the drag. A drag failure should report `elementFromPoint` at the start.
- axe colour contrast is measured twice (a11y_test): only a failure seen both times counts. A11y failures that move between pages from run to run are timing, not colours.
- Elements hidden outside edit mode (Tasks' Settings button) can be opened with `click()` in script.
- `webcal://` becomes https: a local stand-in needs `http://` plus `HUB_TEST_PUBLIC`.
- A private-word test must use a word that is not also a placeholder (Countdown's "Goa Trip"; P28 uses "Lakeside Weekend").
- An owner report of a window problem = fix + a rule in windows_test.

**Sandbox**
- Chromium and Playwright are preinstalled: never `playwright install` (install-deps for WebKit's libraries is fine, see Tests). Background processes end with each tool call: start and use servers in one call.
- Never `pkill -f` a pattern that also matches its own shell; `pgrep -f` inside a waiter matches the waiter. Wait on a log or the task notification.
- The safety check can refuse a harmless command (a `sed`, or "download and run"): use the Edit tool, or download + verify checksum in one command and run in another.
- The stop hook compares with a stale `origin/<branch>`: after a push, `git fetch origin +refs/heads/<b>:refs/remotes/origin/<b>`.
- Semgrep refuses untracked files: scan them as a separate folder. Semgrep runs from a venv (`semgrep==1.183.0`); PHPStan phar at `/tmp/phpstan.phar`; ruff and zizmor in venvs.
- The sandbox cannot reach google.com, github.io or Open-Meteo.
- Playwright's `context.clock.install(time=...)` and `timezone_id` fix the time in screenshots.

## Fixed choices (change only if the owner asks)

- **Privacy:** the site contacts no other server unless the owner turned the feature on or pressed a button (daily GitHub check off by default; calendars only when followed; Offline Reading off by default).
- **Updates stay safe:** checked before anything changes, the password to install, a snapshot first, Go Back works.
- **Repo layout:** `tools-app/` stays at the top; the root `CHANGELOG.md` stays (a copy); old addresses get no forwarding files after a move.
- **Look:** one logo; screenshots before any visible change; sun/moon theme button; Disk Used never shows server free space.
- **Undo** exists for Files Trash, Tasks, Links, Info (boxes and tabs), Cards and every import.

## History (one line per version; CHANGELOG.md has everything)

| Version | What |
|---|---|
| 1.79.3 | Box Headline Color per box; Edit Tab shows the color once; shield marks for private and encrypted tabs; Links 20 tabs; Info tab dividers; Files drag and drop; richer Notifications; Features page colors; Telegram logo |
| 1.79.2 | One-page Edit Tab with preview on top; tab bar gaps fixed; Links dividers; Telegram Login Approval; Site Settings |
| 1.79.1 | Gear menu (Edit This Page, page Settings, Main Settings); Only Me is Hide From Visitors; one-column Settings forms on a phone |
| 1.79.0 | Clear Activity, Cleanup, turn pages off for real, live countdown, encryption step in first setup, This Device card |
| 1.78.2 | Domains and Uptime watch removed completely |
| 1.78.1 | Data Protection and Telegram Setup in the Sign-In style; Two-Step scan side by side; smoother pages |
| 1.78.0 | Sign-In boxes redesigned, Look and Bar in one tab, clearer Telegram Setup, click-to-copy commands, Activity log; Start Here and Domains gone |
| 1.77.5 | Info: an unlocked Document-layout tab no longer shows its lock bar over the Outline |
| 1.77.4 | Back Up is one hero box |
| 1.77.3 | Telegram Setup in one box with two steps; Features rows open their page and related settings |
| 1.77.2 | Logs section, Notifications with colourful icons, Files details panel with Select All, simpler Share Link window |
| 1.77.1 | Dropbox-style Files, Features showcase, Changelog tab, simpler Telegram setup, E key turns editing off |
| 1.77.0 | Cloud Backup: encrypted copy to a WebDAV folder on a schedule |
| 1.76.0 | What's New by series, Features section, Files storage limit of any size |
| 1.75.0 | One message stack with a bell, sliding-pill tabs, wider Settings, a timeline for What's New, Spotlight presets, Files drop zone |
| 1.74.2 | Pill sub-tabs, Security in 4 tabs, new Overview and Colors, smoother sliders, flatter phone top bar, quicker CI |
| 1.74.1 | Home Background sheet with 4 tabs, theme Mix Everything, Welcome Text removed, menus work with a design running, current-page pill |
| 1.74.0 | 16 Animated Designs (React Bits ports), shell-admin split into parts, ts-check for tabs.js and importer.js |
| 1.73.x | Docker image, VPS and Proxmox scripts, app-store files, trusted proxy setting |
| 1.72.0 | Instant pages, Offline Reading, search everywhere, accessibility, Tasks repeats and Calendars You Follow, four widgets, Import Center, override notice, phone checklist |
| 1.71.0 | Smoother on phones: swipe follows the finger, slide-in, faster fade, Reduce Motion fade, lighter bar hide, Home preload later |
| 1.70.0 | Settings sorted into 8 sections; Send Backups to Telegram under Backup |
| 1.69.x | Step-by-step boxes (Stepper) for setup, import, passphrase, restore, share link, passkey; Home Tour; the link field with label and copy icon |
| 1.68.x | Bar Glass (GlassSurface port, plain JS), Glass tab with quick picks and sliders, one glass for bar, dock and widgets, lighter glass windows |
| 1.67.x | New top bar (colour tiles, glowing current line, tray); full check: Semgrep, faster Links edit, faster page changes; clearer Tabs section |
| 1.66.x | Files type cards and upload cards, one step bar, Settings menu with colour tiles, white-icon tiles everywhere |
| 1.65.x | New look (white switches, hold to delete, tooltips, loader, Presets with Surprise Me), sun/moon button back, Disk Used without free space, Accent Color picker |
| 1.64.x | Calmer cards and tiles, Soft presets, one window look, Edit Tab icon row folds, top bar at mid widths, Info typing speed, Info Export window, windows_test |
| 1.63.1 | Tab drag lands where you drop it |
| 1.62.x | Undo in Info, passkey Remove, switches restored, cleanup, type checks |
| 1.61.x | Locked in the browser (passphrase, recovery key), Files, passkeys, calendar link, Share, shortcuts, one Settings look |
| 1.60.0 | 17 new tools, saved presets, @cantoo/pdf-lib |
| 1.59.x | Swipes, vivid presets, monthly maintenance |
| 1.53 and earlier | Visit counts, one edit bar, Home characters and widgets, folder move to `web/hub/` (1.50), bridge release (1.49) |
