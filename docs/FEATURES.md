# Features Since the Last Website Refresh

The website, the PDF guide and their screenshots were refreshed for **1.60.0** (with a new Screenshots page on the website); before that, for **1.51**. This page lists everything that changed since then, up to **1.60.0**: what it is, where to find it in the site, what a screenshot should show, and which website and guide pages need new words.

Use it for the next website and screenshot refresh (`scripts/screenshots.py`, `scripts/site_pages.py`, `scripts/make-guide.py`, `website/content/`). When a feature is on the website and in the guide, tick it here (`[x]`). Add every new feature to this list as it ships.

Names in **bold** are the names the screen shows.

---

## 1. Editing works the same on every page (1.53.5 to 1.53.8)

- [x] **The pencil has two items:** **Edit This Page** and the page's own Settings (Links Settings, Info Settings, Cards Settings, Tasks Settings, Home Settings). Settings itself has no pencil.
  - *Screenshot:* the pencil menu open on Links (two items, no line between them).
- [x] **The edit bar:** while you edit, the page's tools sit in one pill at the bottom, the same on every page, ending with a round ✓ **Done**.
  - Home: Background, Widgets, Home Settings
  - Links: Colors, Fetch Icons, Import Bookmarks, Links Settings
  - Info: Export, Info Settings
  - Cards: Add Card, **Holders**, **Banks**, Export, Cards Settings
  - Tasks: Add Task, Export, Tasks Settings
  - *Screenshot:* Links while editing, with the bar at the bottom; and Cards' bar.
- [x] **Edit Bar setting:** each page's Settings, Look section: **Icons Only** (the name shows when you point at an icon) or **Icons and Text**. Phones always show icons.
  - *Screenshot:* Home with Icons and Text (Background, Widgets, Home Settings written out).
- [x] **Cards and Tasks** have an edit mode now: Edit This Page shows their edit bar.
- *Website:* the Links, Info, Cards and Tasks feature pages, and the FAQ answer about importing bookmarks (already updated in `site_pages.py`).
- *Guide:* chapters for Links, Info and Cards (already updated in `make-guide.py`); Home, Tasks and the "Editing" explanation in chapter 1 need the edit bar and the Edit Bar setting.

## 2. Settings windows (1.53.6, 1.53.8)

- [x] **Links, Info and Cards Settings** have a **Look** section: **Text Sizes** (a small **Change** button), **Edit Bar**, and in Cards **Column Order** (for Excel and PDF). Each row has a line of help.
- [x] **Tasks Settings** has three sections: **General** (Default Currency, Show a Task as Due Soon), **When the Page Opens** (Open On, Show, Sort By, Week Strip), **Look** (Week Starts On, Dates, Edit Bar, Show Amounts).
- [x] Fields are a softer grey instead of black.
- *Screenshots:* Cards Settings and Tasks Settings.
- *Guide:* the Settings paragraph of each page chapter.

## 3. Cards: Holders and Banks windows (1.53.6, 1.53.8)

- [x] **Holders** (one button, was Add Holder and Edit Holders): every holder with their number of cards; rename in place; **Delete** works for a holder with no cards; **Add Holder** at the bottom; **Save** or **Cancel**.
- [x] **Banks** (was Edit Banks), with its own bank-building icon: every bank your cards use, its name, the link its name opens, and its number of cards. Renaming a bank moves its cards with it. An empty link uses the usual one.
- *Screenshots:* the Holders window and the Banks window with demo data.
- *Website:* the Cards feature page ("Holders" and "Banks" in its details).
- *Guide:* the Cards chapter (already names Holders and Banks).

## 4. Links: visit counts (1.53.0, 1.53.8)

- [x] Every link shows how often it was opened, as a small number **at the end of its row** (lined up).
- [x] Clicks by anyone who opens your Links count; **only you** see the numbers. The same browser counts again after **30 seconds**.
- [x] **Links Settings › Show Visit Counts** (on at first) only hides the numbers; counting goes on. Links in encrypted tabs are never counted.
- *Screenshot:* Links with a few counts (the screenshot script can seed them with `visits_add`).
- *Website:* the Links feature page (a detail line: "See which links you open most").
- *Guide:* the Links chapter.

## 5. The login window (1.53.8)

- [x] Shows your site's logo and **Log In to** *site name*, an eye button to show the password, one wide **Log In** button, and a wrong password's message right under the field.
- [x] **Trust This Browser** (two-step login, Approve in Telegram) is no longer ticked by itself.
- *Screenshot:* the login window, on a computer and on a phone.
- *Website:* the Security page (two-step login and trusted browsers).
- *Guide:* "Logging in" in chapter 1, and the Security chapter.

## 6. Phone (1.53.8 to 1.59.1)

- [x] **Swipe** left or right to go to the next or previous page, in the order of your bar (Home, Links, Info, Cards, Tasks). Off while editing, in a window or a text field, and on a computer with a mouse.
- [x] **Home:** pull down from the top for the next background.
- [x] **The installed app's icon** fills the whole shape with the yellow logo (Android and iPhone), with no dark frame.
- [x] **iPhone app:** the top bar sits below the clock and battery (1.59.1; before, it slid under them).
- [x] Installing on iPhone: Safari › Share › **Add to Home Screen**. Layout updates arrive by themselves; the icon on an iPhone only changes after removing and adding the app again.
- *Screenshots:* the phone's home screen with the app icon; Links on a phone as an installed app (status bar visible).
- *Website:* the **On Your Phone** page (swipes, pull to refresh, iPhone steps, the icon).
- *Guide:* "On a phone" (chapter 2).

## 7. Looks (1.59.0)

- [x] **Settings › Appearance › Presets:** 141 presets (89 dark, 52 light). 39 look-alikes were removed.
- [x] 14 new **Vivid** presets: Ultraviolet, Cyber Lime, Magma, Tropic Night, Royal Blue, Berry Blast, Jungle Neon, Cobalt Flame (dark); Sunburst, Flamingo, Aqua Pop, Lime Soda, Grape Soda, Tangerine (light).
- [x] Windows on every page share one look; messages appear in one place on every page.
- *Screenshots:* `s-presets` (the guide's Presets picture) with the Vivid group open; one page in a vivid preset (for example Links in Ultraviolet).
- *Website:* wherever the number of presets is mentioned (search the site pages for "presets").
- *Guide:* the Appearance section of the Settings chapter says 141 (updated in 1.59.1); its `s-presets` picture is older.

## 8. Home (1.53.0)

- [x] The **refresh** button swaps the background at once (the next one is fetched ahead); on a slow network the picture dims while the next one loads.
- [x] The characters added in 1.52 were **removed** in 1.53. Checked in 1.59.1: no website page or guide text mentions them.

## 9. Settings Overview (1.53.1)

- [x] **What's New** loads only the newest version's notes (faster); the full Changelog opens from it.
- *Screenshot:* `s-overview` right after an update (What's New card).

## 10. For the people who keep it running (1.53.2 to 1.59.0)

Not for the website's feature pages, but worth one line on the **About** or **Security** page:

- [x] **Monthly maintenance:** GitHub updates the libraries inside Tools each month and opens a pull request; the owner merges it and publishes the release (`MAINTAINING.md`).
- [x] **The next PHP version** is tested every week, months before hosts offer it.
- [x] **No surprise login box** (1.53.6): pressing the pencil right after a page opens waits for the server instead of asking for the password again.
- [x] Safer fetching from other websites: one checked way for Home's photos and Links' icons (1.53.2).

## 11. Tools: 17 new tools, saved presets, a tidier menu (1.60)

- [x] **Two new sections**, each with its own colour: **Calculators** (orange) and **Documents** (sky blue). Tools now has **53 tools** in six sections.
- [x] **Calculators:** **EMI Calculator** (monthly payment, interest, a donut chart, the schedule by year or month, Download CSV); **SIP and Lumpsum Calculator** (yearly step-up, a bar chart by year); **FD and RD Calculator** (quarterly compounding as Indian banks count it); **Percentage and Discount Calculator** (eight everyday sums on one page); **Age and Date Calculator** (exact age and next birthday, days and working days between dates, add or subtract days, weeks, months, years); **Unit Converter** (ten kinds, with Gaj, Cent and Guntha); **Number to Words** (lakh and crore, or million and billion; as money for cheques).
  - *Screenshots:* EMI Calculator with its chart and schedule; SIP with the bar chart.
- [x] **Documents:** **Invoice Generator** (your logo and details, items, one tax line or two halves such as CGST and SGST, discount, the total in words, an A4 PDF with the ₹ sign); **Text Compare** (line by line or word by word); **Markdown Editor** (live preview, save .md or .html, Print or PDF; pictures show as links so nothing loads from other websites); **CSV, JSON and Excel Converter** (.xlsx in and out, sheets, a preview).
  - *Screenshots:* an invoice PDF next to the form; Text Compare with changes marked.
- [x] **New in Utilities:** **QR and Barcode Scanner** (a photo, a screenshot or the camera; the reader ships with the site), **Barcode Generator** (Code 128, EAN-13, UPC and more, PNG or SVG), **Time Zone Converter**, **Stopwatch and Timer** (laps; the timer rings), **Random Picker** (names, numbers, a coin, dice; fair), **Screen and Voice Recorder** (screen on a computer, voice anywhere).
  - *Screenshot:* the scanner with a found code; the Time Zone Converter.
- [x] **Saved presets:** while logged in, **Save as Preset** in Sign PDF (your signature), Watermark Images, Watermark and Page Numbers, QR Code Generator (colours and size), Image Resizer (sizes) and Invoice Generator (your business and logo). Kept on your server, listed in **Tools Settings > Presets** (rename, delete) and in the site backup (**Tools Presets**).
  - *Screenshots:* the preset row in Sign PDF; Tools Settings with the Presets panel.
- [x] **The side menu:** clicking a section's icon opens that section only (no list of every tool below it); the page you are on has a soft tint in its colour and a filled icon.
- [x] **Tabs on Top:** one tidy row of rounded tabs, Organise and Settings at the right; no big empty space under it.
  - *Screenshot:* Tools with Tabs on Top.
- [x] Camera, microphone and screen sharing are allowed on the Tools page only, and the browser still asks first.
- *Website:* the Tools feature page and the home page count the tools from the list (53). The tool finder lists the new tools by itself.
- *Guide:* chapter 9 lists the six sections and explains presets (updated in 1.60).

## 12. For the people who keep it running (1.60)

- [x] **Adding a tool** takes one command (`python3 scripts/new-tool.py`) and one test: the list of tools is built from `tools.json`.
- [x] Tools' PDF writer is now `@cantoo/pdf-lib`, the maintained copy of pdf-lib.
- [x] The updater no longer installs, or goes back to, versions from before 1.50 (they had another folder layout). Sites on 1.49 or older update with their own updater first.

---

## 13. Locked in your browser (1.61.0)

- [x] **One passphrase and a recovery key** (Settings > Security): Cards, Files, Tools' saved presets and private tabs in Links and Info are locked in the browser; backups you download are locked too. Tasks stay readable. Say what is lost if both are lost. (Security page, guide.)
- [x] **Encrypt All Private Tabs** in Links Settings and Info Settings; a new private tab is encrypted from the start.
- [x] **Passkeys** (Settings > Security > Passkeys): no two-step code after a passkey.

## 14. Files (1.61.0)

- [x] A new seventh page: **Files**. Folders, search, preview, Trash, a folder as a zip, share links (key after the `#`, you choose when it ends), a 5 GB limit you can change. Needs a feature page on the website, a tour card on the home page and a guide chapter.
- [x] **Share from your phone** (installed app, Chrome on Android): Save to Files, Open in Tools, Discard. (On Your Phone page.)

## 15. Tasks and shortcuts (1.61.0)

- [x] **Calendar Link** in Tasks Settings (off by default, secret, a new link ends the old one). Tasks page, guide.
- [x] **Keyboard shortcuts**: `?` lists them; `G` then a letter goes to a page; `E` edits. (Guide, a short card on the home page tour.)

## 16. Settings, tidier (1.61.0)

- [x] **One Settings window** on every page (close X, scrolling body, Cancel and Save Settings in view; "Page Title"); **Only Me** on every page but Tools; **buttons** for two or three choices and **switches** for on and off, everywhere.
- [x] **Colors** tab: 9 rows, one Accent, *Different Colors per Page* folded; **Backup & Restore** in four tabs (Back Up, Restore, Export, Start Over); **Export Bookmarks** (Links Settings and Backup > Export).
- [x] Retaken on 30 Oct 2026, every picture in dark and light, from the real 1.62.2 app (`python3 scripts/screenshots.py ZIP OUT --webp`): `cards-settings`, `tasks-settings`, `links-settings`, `info-settings`, `files-settings`, `s-colors`, `s-backup`, `s-security`, `s-encryption`, `s-passkeys`, `files`, `files-share`, `tasks-calendar-link`, `info-undo`. A picture of the Backup Export tab (`s-backup-export`) was never made: `s-backup` is the Backup picture on the website and in the guide.

## 16b. Tools, tidied (1.61.9)

- [x] **Image Converter** has three tabs: Convert Images, SVG to PNG, Image and Base64 (SVG to PNG and Image to Base64 were tools of their own; their old addresses, stars and Recent entries open the tab).
- [x] **Gone:** Password & UUID, ZIP Creator, QR and Barcode Scanner (Tools no longer asks for the camera), Stopwatch and Timer. 47 tools.
- [x] Sections in this order: Images, Photos, PDF, Documents, Calculators, Utilities. Text Tools and JSON Formatter are in Documents, Time Zone Converter in Calculators. **Organise** moves whole sections up and down.
- [x] **Recorder:** sharper screen recordings (VP9 first, up to 4K, a Quality choice: Standard, High, Best).
- [x] Every page's own windows in the same frame as Settings; one button shape; **Undo** after deleting a link, category, tab (Links) or a card.

## 16c. Info: Undo (1.62.0)

- [x] **Undo after deleting a box or a tab** in Info (7 seconds), also in locked tabs; the same message as Links, Cards and Files. Info page, guide.

## 17. For the people who keep it running (1.61.0)

- [x] Every PHP file runs in strict mode and PHPStan runs at level 5 (a test fails for a file without `declare(strict_types=1)`).
- [x] `npx tsc -p tsconfig.json` type-checks the files that start with `// @ts-check` (the Files page and the share-link page first); add more files to `tsconfig.json` as they are cleaned up.
- [x] CodeQL and Semgrep scan on every push and every week (`.github/workflows/code-scanning.yml`).
- [x] New checks: a slow-phone speed check (`tests/browser/speed_test.py`) and accessibility checks for the new windows.

---

## Screenshot checklist for the refresh

Take these with `python3 scripts/screenshots.py build/site-update-X.Y.Z.zip OUT` (add the scenes it does not take yet):

| Picture | Shows | Used on |
|---|---|---|
| `links` | Links with visit counts at the row ends | Links page, home page tour |
| `links-edit` *(new)* | Links while editing, the edit bar at the bottom | Links page, guide chapter 1 |
| `cards` | Cards with demo data | Cards page |
| `cards-holders`, `cards-banks` *(new)* | the Holders and Banks windows | Cards page, guide |
| `cards-settings`, `tasks-settings` *(new)* | the tidied Settings windows | guide |
| `login`, `m-login` *(new)* | the login window, computer and phone | Security page, guide |
| `s-presets` | Presets with the Vivid group | Settings section, guide |
| `m-links`, `m-home` | phone screenshots as an installed app (status bar on top) | On Your Phone page (retaken in a phone-sized browser; an installed-app shot with the status bar is **still to take**, on a real phone) |
| `app-icon` *(new, by hand)* | the app icon on a phone's home screen | On Your Phone page (**still to take**, on a real phone) |
| `home-1`, `home-2`, `home-3` | Home (no characters) | Home page |
| `tools-emi`, `tools-invoice`, `tools-compare` *(new)* | EMI Calculator, Invoice Generator with its PDF, Text Compare | Tools page, guide chapter 9 |
| `tools-tabs`, `tools-presets` *(new)* | Tabs on Top; Tools Settings with Presets | Tools page |
