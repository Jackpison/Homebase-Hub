# Contributing

Thank you for helping with Homebase Hub.

- **Found a bug or another problem?** Open a [GitHub Issue](https://github.com/Jackpison/Homebase-Hub/issues/new/choose). Include your version (Settings > Changelog), what you did, what you expected and what happened. This goes for security problems too: see [SECURITY.md](SECURITY.md).
- **Anything else?** An idea, a question: message [@Jackpison](https://t.me/Jackpison) on Telegram.

## Changing the code

Read `AGENTS.md` first: it has the full rules, the checks and the release checklist.


- Edit the readable files in `src/`. The build makes the minified files; never edit those.
- Each release raises the version in `src/web/core-data/lib/boot.php` (`HUB`) and in every `?v=` on the pages, and adds an entry and a Version Map row to `src/web/docs/CHANGELOG.md` (copied to the root `CHANGELOG.md`).
- After changing any file in `src/web/tools/assets`, run `python3 tools/tools-rev.py --write` (the build refuses to run otherwise).
- Build with `python3 tools/build.py`. The zip is named with dots (`site-update-1.39.0.zip`) and contains the full changelog.
- Run the update tests and `python3 tests/check_libraries.py` before a release: see `tests/README.md`. All of them must pass.
- Never commit `site-data/`, `config.php`, passwords or tokens. The build refuses to run if private data is in `src/`.
