# Keeping Homebase Hub Alive

This guide is for the owner, or whoever takes over: a person, or any AI tool. You don't need to be a programmer to keep the project current. GitHub does most of the work and asks for a few clicks.

For changing the code itself, read `AGENTS.md`.

## What runs by itself

| When | What | What you see |
|---|---|---|
| Every push and pull request | **CI** tests everything: PHP 8.3, 8.4 and 8.5, the updater, hostile update files, Apache, nginx, the Docker image, the secret check, and every page in Chromium. A push runs the light set; a release commit (version and changelog together) runs the whole set. The run's summary page says what ran and why. | A green tick or a red cross on the commit. |
| Every Monday | **Scheduled checks** (security and next PHP): (1) asks whether any library has a known security problem; (2) tries the next PHP version, still in development, so a break shows up months before hosts offer it. | An issue labelled `security` or `php`, only when something is wrong. |
| Every Monday (Scheduled checks) | **WebKit** (every iPhone browser uses it): runs the page and tools tests in WebKit. | An issue labelled `browsers`, only when something is wrong. |
| Every Monday (Scheduled checks) | The security and next-PHP jobs run on `ubuntu-latest` on purpose; every other workflow is pinned to `ubuntu-24.04`. When GitHub moves `ubuntu-latest` to a new system and something breaks, that job fails first and opens an issue, so you can test and change the pin before CI itself is affected. | An issue labelled `security` or `php`, only when something is wrong. |
| Every Monday | **Scheduled checks** (full-ci): starts the whole CI on `main`: everything a push skips (the update and hostile-zip tests, Apache, nginx, Docker, the install scripts, and the tools and more halves of the browser tests). A push runs only the light set. There is no daily run. | A red run in the Actions tab (CI), only when something is wrong. |
| The 1st of every month | **Scheduled checks** (Firefox and the Animated Designs in full): runs the page tests in Firefox (CI covers Chromium; WebKit runs on Mondays). | An issue labelled `browsers`, only when something is wrong. |
| The 3rd of every month | **Monthly maintenance**: updates the libraries inside Tools (within their major version), rebuilds Tools, raises the version by one, writes the changelog, and opens a pull request. | A pull request "Monthly maintenance: X.Y.Z", or nothing when all is current. |
| Monthly | **Dependabot** proposes updates for GitHub's own build steps, the build tools, the test tools, the Docker images (PHP and Caddy) (one pull request per kind, versions at least 7 days old), and new major versions of Tools' libraries. Security fixes come at once. | Pull requests from Dependabot. |
| 15 November | **Scheduled checks** (PHP reminder): update the PHP support dates. | An issue "Check the PHP support dates". |
| Daily, on each site (if switched on) | **Settings › Updates** checks GitHub for a new version. | "A new version is ready" in Settings. |

## The monthly routine (about 5 minutes)

1. Open the repository on github.com and go to **Pull requests**.
2. Open **Monthly maintenance: X.Y.Z**. Wait until the **CI** run is green (about 10 minutes after it opened). Checks marked *action_required* can be ignored: GitHub holds the checks of a pull request that Actions opened, and the workflow starts its own CI run instead.
3. Press **Merge pull request**, then **Confirm merge**. **Always merge before step 4:** the new version is only on `main` once merged, and a tag made earlier is refused ("The tag ... does not match the version in the code"; nothing is published). If that happened: delete that release and its tag on github.com, merge, and publish again.
4. Go to **Releases › Draft a new release**. Under *Choose a tag* type `vX.Y.Z` (the same number), choose *Create new tag on publish*, target `main`, and press **Publish release**.
5. GitHub builds the update file and adds it to the release by itself (a few minutes), then the Docker image (about 5 minutes more: PCs and ARM boards are built side by side, each on its own kind of machine).
6. On each of your sites: **Settings › Updates › Check Now**, then follow the buttons. The site downloads and checks the file, asks for your website password, and takes a snapshot first; **Go Back** undoes it.

When there is no maintenance pull request, everything was already current. Nothing to do.

**Once, after the first release with Docker (1.73.0):** GitHub makes a new image private. On github.com open your profile › **Packages › homebase-hub › Package settings**, and under *Danger Zone* choose **Change visibility › Public**. Without this nobody else can download the image.

**A Dependabot pull request for `ogl`, `three` or `vgpu` fails the designs check** (the Home Animated Designs are built into the site from those): close it and run `python3 scripts/build-designs.py` yourself (or ask for it), then commit the rebuilt `src/web/home/designs/`.

**Dependabot pull requests:** open each one. When its checks are green, press **Merge**. They change only the build and test tools, never your sites.

## When something fails

- **A maintenance or Dependabot pull request has a red check:** do not merge it. Leave a comment if you like, then close it. Next month tries again with newer versions, which often fixes it. If it keeps failing, it needs a person or an AI: give them this file, `AGENTS.md` and the link to the failed check.
- **An issue "Monthly maintenance failed":** nothing reached `main`, and your sites are safe. Run it again later: **Actions › Monthly maintenance › Run workflow**. (The other calendar checks are under **Actions › Scheduled checks › Run workflow**, where you choose which one.) If it fails again, hand it over as above.
- **…and the failed run says "GitHub Actions is not permitted to create or approve pull requests":** the update worked, but GitHub would not let it open the pull request. Turn it on once: **Settings › Actions › General › Workflow permissions**, tick **Allow GitHub Actions to create and approve pull requests**, **Save**. Then **Run workflow** again and close the issue.
- **CI's "web servers" job failed in the install-script step:** usually Ubuntu's or Debian's package servers were slow. Re-run it; if it fails twice, hand it over.
- **The release's job "build the Docker image (amd64 or arm64)" or "publish the Docker image" failed:** the release and its zip are fine, and web hosts update as usual. Open the failed run and press **Re-run failed jobs**. If it fails again, hand it over.
- **An issue labelled `security`:** a library has a known problem. If the monthly maintenance doesn't fix it within a month (or it's urgent), hand it over.
- **An issue labelled `php`:** the next PHP version breaks something. You have months: hosts offer a new PHP about a year after it appears. Hand it over before your host switches.
- **A site misbehaves after an update:** **Settings › Updates › Go Back** puts the previous version back.

## The app stores (Unraid, CasaOS, Umbrel, YunoHost)

The ready files are in `deploy/`, and people can use them from there. A listing in each store's own catalogue is a pull request or form to that project, which only you can send, and which they review:

- **Unraid:** Community Apps lists templates from a repository you register on the Unraid forum (`deploy/unraid/homebase-hub.xml`).
- **CasaOS:** a pull request to github.com/IceWhaleTech/CasaOS-AppStore with `deploy/casaos/docker-compose.yml` as `Apps/HomebaseHub/docker-compose.yml`.
- **Umbrel:** a pull request to github.com/getumbrel/umbrel-apps with the two files of `deploy/umbrel` in a folder `homebase-hub`, gallery pictures, and the image pinned by its digest (`ghcr.io/jackpison/homebase-hub:X.Y.Z@sha256:...`, shown on the package page). `release.py` keeps the version in these files up to date.
- **YunoHost:** ask in the YunoHost forum to add `deploy/yunohost` to their apps catalogue (they usually move it into a `homebasehub_ynh` repository of their own).

Each store then updates on its own schedule; the site itself always updates in Settings, Updates.

## Things only a person can decide

The maintenance pull request lists them under "Waiting for a person to decide":

- **A new major version of a library** (for example pdf.js 6 → 7). It can change how the library works, so someone must try it and run all the tests. Follow `AGENTS.md`: change `tools-app/package.json`, run `python3 scripts/build-tools.py --install`, run every check, commit.
- **PDF writer:** since 1.60 Tools uses `@cantoo/pdf-lib`, the maintained copy of pdf-lib (the original is no longer updated). The monthly maintenance updates it like the other libraries.
- **PHP versions:** when a PHP version stops getting security fixes (the dates are in `hub_php_eol()` in `src/web/hub/core/lib/boot.php`), raise `HUB_MIN_PHP` and the CI versions together.

## After a release that changes how the site looks or moves

Go through [PHONE-CHECKLIST.md](PHONE-CHECKLIST.md) on a real phone: the tests cannot use a real finger, camera or clipboard.

## Handing the project over

Give the new person or AI:

1. this file;
2. `AGENTS.md` (the rules for changing the code, and every check to run);
3. the newest `Project-Handoff vN.md`, if you keep one (it holds the history and the plans).

They need nothing else. Everything is in the repository: the site in `src/`, Tools' source in `tools-app/`, the website in `website/`, the tests in `tests/`, and the scripts in `scripts/`.
