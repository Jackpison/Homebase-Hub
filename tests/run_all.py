#!/usr/bin/env python3
"""Runs the checks from AGENTS.md one after another and prints one summary table.
  python3 tests/run_all.py ZIP               everything (lint, unit, repo, server, browser, website)
  python3 tests/run_all.py ZIP --quick       lint, unit, repo and server checks only (for small changes)
  options: --prev PREV.zip --old OLD.zip     zips for the update test (default: downloaded with tests/lib/releases.py)
           --browser firefox|webkit          browser tests in another engine (default chromium)
           --apache                          also the Apache test (needs sudo; installs Apache)
Build the zip first: python3 scripts/build.py. PHPStan runs when phpstan.phar is in the repo folder (see AGENTS.md).
Exit 0 only when every check passed."""
import os, re, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tests', 'lib'))
args = sys.argv[1:]
if not args or args[0].startswith('-'): sys.exit(__doc__)
ZIP = os.path.abspath(args[0])
def opt(name):
    return args[args.index(name) + 1] if name in args and args.index(name) + 1 < len(args) else None
QUICK, APACHE, BROWSER = '--quick' in args, '--apache' in args, opt('--browser')
PY = sys.executable
rows = []


def run(name, cmd, shell=False):
    """Runs one check, shows its output as it goes, and keeps (name, ok, 'passed/total', seconds)."""
    print('\n=== %s' % name, flush=True)
    t = time.time(); out = []
    p = subprocess.Popen(cmd, cwd=ROOT, shell=shell, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    for line in p.stdout:
        out.append(line); sys.stdout.write(line)
    p.wait()
    tallies = [(int(a), int(b)) for a, b in re.findall(r'^(\d+)/(\d+) passed', ''.join(out), re.M)]   # one per test file (unit has several)
    done, total = sum(a for a, _ in tallies), sum(b for _, b in tallies)
    counts = '%d/%d' % (done, total) if tallies else ''
    ok = p.returncode == 0 and done == total
    rows.append((name, ok, counts, time.time() - t))


if not os.path.isfile(ZIP): sys.exit('No zip at %s: build it first (python3 scripts/build.py).' % ZIP)
b = ['--browser', BROWSER] if BROWSER else []

run('ESLint', ['npx', 'eslint', 'src', 'tools-app'])
run('TypeScript check', ['sh', '-c', 'npx tsc -p tsconfig.json && npx tsc -p tsconfig.links.json && npx tsc -p tsconfig.home.json && npx tsc -p tsconfig.cards.json && npx tsc -p tsconfig.tasks.json && npx tsc -p tsconfig.info.json'])
run('Unit tests', ['php', 'tests/unit/run.php'])
run('Version agrees everywhere', [PY, 'scripts/release.py', '--check'])
for t in ('release_test', 'workflows_test', 'secrets_test', 'dead_code_test', 'parallel_test', 'ci_status_test', 'ci_changes_test', 'releases_test', 'maintain_test', 'presets_test', 'tools_list_test', 'tscheck_test', 'build_test'):
    run('repo/' + t, [PY, 'tests/repo/%s.py' % t])
run('Library check', [PY, 'tests/repo/check_libraries.py'])
if os.path.isfile(os.path.join(ROOT, 'phpstan.phar')):
    run('PHPStan', ['php', '-d', 'memory_limit=1G', 'phpstan.phar', 'analyse', '-c', 'tests/repo/phpstan.neon', '--no-progress'])

prev, old = opt('--prev'), opt('--old')
if not prev or not old:
    import releases
    dest = os.path.join(ROOT, 'build', 'releases')
    prev = prev or releases.download(releases.previous(), dest)
    old = old or releases.download('v1.37.0', dest)
run('Update test', [PY, 'tests/server/update_test.py', ZIP, prev, old])
run('Hostile update zips', [PY, 'tests/server/update_attack_test.py', ZIP])
run('Core', [PY, 'tests/server/core_test.py', ZIP])
run('Files (server)', [PY, 'tests/server/files_test.py', ZIP])

if not QUICK:
    for t in ('import', 'app', 'settings', 'tools', 'pages', 'nav', 'a11y', 'encrypt', 'files', 'lock', 'tabs_lock', 'tabs_kit', 'settings_ui', 'settings_look', 'passkey', 'share', 'speed'):
        if BROWSER and t in ('app', 'settings'): continue   # Chromium only
        run('browser/' + t + (' (%s)' % BROWSER if BROWSER else ''), [PY, 'tests/browser/%s_test.py' % t, ZIP] + ([] if t in ('app',) else b))
    run('Website build', [PY, 'scripts/make-site.py', '--no-guide'])
    run('browser/website' + (' (%s)' % BROWSER if BROWSER else ''), [PY, 'tests/browser/website_test.py', 'build/site'] + b)
if APACHE:
    run('Apache', 'sudo sh tests/server/apache_setup.sh "%s" >/dev/null && %s tests/server/apache_test.py' % (ZIP, PY), shell=True)

print('\n%-34s %-6s %9s %8s' % ('Check', 'Result', 'Passed', 'Seconds'))
print('-' * 60)
for name, ok, counts, secs in rows:
    print('%-34s %-6s %9s %8.0f' % (name, 'PASS' if ok else 'FAIL', counts, secs))
bad = [r[0] for r in rows if not r[1]]
print('-' * 60)
print('%d of %d checks passed in %.0f s%s' % (len(rows) - len(bad), len(rows), sum(r[3] for r in rows), ('; failed: ' + ', '.join(bad)) if bad else ''))
sys.exit(1 if bad else 0)
