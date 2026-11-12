# Settings script, in labelled parts

`shell-admin.js` (Settings, Security, Backup, Health, Updates) is one closure: its screens share variables, so it cannot be separate loaded
files. This folder holds it cut into labelled parts, **in the order they are joined** (the number is the order, not the importance).

| Part | What is in it |
|---|---|
| `00-frame.js` | Shared state, the sections and tabs, `mount`, `go`, the Settings search lines (`SEARCH`), cards, the draft and its dirty mark |
| `10-general.js` | General: time zones, Start Here cards, `pGeneral` |
| `20-appearance.js` | Appearance: Look, bar and accent, text sizes, Colors and presets, Glass, Themes |
| `30-bar-and-tabs.js` | The bar's settings and the tab editor (`pNav`, `tabEditor`) |
| `40-telegram.js` | Telegram reminders (`pRemind`) |
| `50-overview-and-start.js` | Server Check start, Overview, Start Here and Guided Setup |
| `60-changelog.js` | What's New: the changelog reader |
| `70-updates.js` | Updates, GitHub updates, Files That Do Not Belong |
| `80-building-blocks-and-save.js` | Save Settings and the small blocks every screen uses |
| `90-security.js` | Security: devices, password, two-step, passkeys, encryption |
| `95-backup-and-import.js` | Backup, Restore and the Import Center |
| `97-health.js` | Health: Overview, Domains and Uptime, Server Check |
| `99-end.js` | The search index and the hand-over to `shell.js` |

## How to change it

1. Edit the part.
2. Run `python3 scripts/make-admin.py`. It writes `../shell-admin.js` by joining the parts as they are.
3. Commit the parts and `shell-admin.js` together. `python3 scripts/make-admin.py --check` (and `tests/repo/build_test.py`) fails when they differ.

The parts are not shipped: the build leaves this folder out of the zip. ESLint reads `shell-admin.js`, not the parts. Cut a new part
only at a top-level statement (two spaces of indent), and name it so the sort order is the join order.
