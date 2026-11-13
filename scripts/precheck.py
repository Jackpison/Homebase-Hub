#!/usr/bin/env python3
"""Run before every push: it works out what you changed and runs only the checks that cover it, locally, in one pass, and
prints one table. A failure here would have been a red CI run, so fix everything it lists, run it again, then push once.
    python3 scripts/precheck.py              the checks for what changed since origin/main (plus uncommitted work)
    python3 scripts/precheck.py --fast       no browser tests (lint, types, unit, repo checks, version only)
    python3 scripts/precheck.py --all-browser  the pages half of the browser tests whatever changed
    python3 scripts/precheck.py --no-bump    do not demand a version bump
    python3 scripts/precheck.py --install-hook  run it automatically before every `git push` (skip once: git push --no-verify)
    python3 scripts/precheck.py --plan       only print what it would run
The version rule: a push that changes the site (src/ or tools-app/) must raise the version in the same push, unless the version
in the code has no tag yet (it is still unreleased). Pass --no-bump for the rare exception.
Exit 0 only when every check passed. See docs/MAINTAINING.md."""
import concurrent.futures, fnmatch, hashlib, os, re, shutil, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY = sys.executable
BOOT = 'src/web/hub/core/lib/boot.php'

# (path pattern, browser tests that cover it). The first column is matched against each changed file; every test runs once.
BROWSER_MAP = [
    ('src/web/files/*', ['files_test']),
    ('src/web/settings/*', ['settings_test', 'settings_look_test', 'polish_test']),
    ('src/web/hub/core/assets/admin/90-security.js', ['passkey_test', 'lock_test']),
    ('src/web/hub/core/assets/admin/*', ['settings_test', 'settings_look_test', 'polish_test']),
    ('src/web/hub/core/assets/shell-settings.css', ['settings_test', 'settings_look_test', 'polish_test']),
    ('src/web/hub/core/assets/shell-admin.js', ['settings_test', 'settings_look_test', 'polish_test']),
    ('src/web/hub/core/assets/shell*', ['pages_test', 'nav_test', 'app_test']),
    ('src/web/hub/core/*.php', ['pages_test', 'app_test']),
    ('src/web/hub/core/lib/*.php', ['pages_test', 'app_test']),
    ('src/web/home/designs*', ['designs_test']),
    ('src/web/home/*', ['pages_test']),
    ('src/web/links/*', ['pages_test', 'tabs_kit_test']),
    ('src/web/info/*', ['pages_test', 'tabs_kit_test']),
    ('src/web/cards/*', ['pages_test']),
    ('src/web/tasks/*', ['pages_test', 'tasks_more_test']),
    ('src/web/tools/*', ['tools_test']),
    ('tools-app/*', ['tools_test']),
    ('website/*', ['website_test']),
    ('scripts/make-site.py', ['website_test']),
    ('scripts/site_pages.py', ['website_test']),
]
# server tests (take the zip) for PHP that handles updates and files
SERVER_MAP = [
    ('src/web/hub/core/lib/update.php', ['update_attack_test']),
    ('src/web/hub/core/lib/ghupdate.php', ['update_attack_test']),
    ('src/web/hub/core/lib/*', ['core_test']),
    ('src/web/hub/core/*.php', ['core_test']),
    ('src/web/files/*.php', ['files_test']),
]


def sh(cmd, **kw):
    return subprocess.run(cmd, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, **kw)


def changed_files():
    """Everything that differs from origin/main: committed, staged, unstaged and new files."""
    base = 'origin/main'
    if sh(['git', 'rev-parse', '--verify', '-q', base]).returncode != 0:
        base = 'HEAD~1'
    names = set()
    for cmd in (['git', 'diff', '--name-only', base, 'HEAD'], ['git', 'diff', '--name-only'], ['git', 'diff', '--name-only', '--cached'],
                ['git', 'ls-files', '--others', '--exclude-standard']):
        names.update(x for x in sh(cmd).stdout.split('\n') if x.strip())
    return sorted(names)


def match(files, table):
    out = []
    for pat, tests in table:
        if any(fnmatch.fnmatch(f, pat) for f in files):
            out += [t for t in tests if t not in out]
    return out


def hub_version(text):
    m = re.search(r"define\('HUB', '([^']+)'\)", text)
    return m.group(1) if m else None


def version_problem(files):
    """None when fine, or the sentence that says what to do."""
    if not any(f.startswith(('src/', 'tools-app/')) for f in files):
        return None
    now = hub_version(open(os.path.join(ROOT, BOOT)).read())
    if sh(['git', 'rev-parse', '--verify', '-q', 'origin/main']).returncode != 0:
        return None
    old = hub_version(sh(['git', 'show', 'origin/main:' + BOOT]).stdout)
    if now != old:
        return None   # already raised in this push
    if not sh(['git', 'tag', '-l', 'v' + now]).stdout.strip():
        return None   # this version has no tag yet: it is still unreleased, the push joins it
    return 'the site changed but the version is still %s, which is already released: run python3 scripts/release.py X.Y.Z (a sub-number for small things) and fill the changelog in this same push' % now


def digest(path):
    p = os.path.join(ROOT, path)
    return hashlib.sha256(open(p, 'rb').read()).hexdigest() if os.path.isfile(p) else ''


def plan(files, fast, all_browser):
    """The ordered list of (name, command) for what changed. Pure: no running, so it can be tested."""
    src = [f for f in files if f.startswith(('src/', 'tools-app/', 'config/', 'eslint.config.js'))]
    js = [f for f in src if f.endswith(('.js', '.mjs', '.ts'))]
    php = [f for f in files if f.endswith('.php')]
    py = [f for f in files if f.endswith('.py')]
    p = []
    p.append(('Version agrees everywhere', [PY, 'scripts/release.py', '--check']))
    if js:
        p.append(('ESLint', ['npx', 'eslint', 'src', 'tools-app']))
        p.append(('TypeScript check', ['sh', '-c', 'npx tsc -p config/tsconfig.json && npx tsc -p config/tsconfig.links.json && npx tsc -p config/tsconfig.home.json && npx tsc -p config/tsconfig.cards.json && npx tsc -p config/tsconfig.tasks.json && npx tsc -p config/tsconfig.info.json && python3 tests/repo/tscheck_test.py']))
    if php or src:
        p.append(('PHP unit tests', ['php', 'tests/unit/run.php']))
    ph = os.environ.get('PHPSTAN') or next((x for x in ('phpstan.phar', '/tmp/claude-0/phpstan.phar') if os.path.isfile(x if os.path.isabs(x) else os.path.join(ROOT, x))), None)
    if php and ph:
        p.append(('PHPStan', ['php', '-d', 'memory_limit=1G', ph, 'analyse', '-c', 'tests/repo/phpstan.neon', '--no-progress']))
    if py and shutil.which('ruff'):
        p.append(('ruff', ['ruff', 'check']))
    repo = ['root_test', 'dead_code_test', 'fixed_waits_test', 'helpers_test', 'release_test']
    if any(f.startswith('.github/') for f in files) or any(f.startswith('scripts/ci') or f.startswith('tests/lib/run_parallel') for f in files):
        repo += ['workflows_test', 'ci_status_test', 'ci_changes_test', 'parallel_test']
    if any(f.startswith('tools-app/') or f.startswith('src/web/tools/') for f in files):
        repo += ['tools_list_test']
    if any(f.startswith(('deploy/', 'src/web/.htaccess')) or f.endswith('.htaccess') for f in files):
        repo += ['deploy_test']
    if any(f.startswith('src/web/home/designs') for f in files):
        repo += ['designs_test']
    if any(f.startswith('scripts/precheck') or f.startswith('tests/repo/precheck') for f in files):
        repo += ['precheck_test']
    for t in repo:
        p.append(('repo/' + t, [PY, 'tests/repo/%s.py' % t]))
    if any(f.startswith('tools-app/') for f in files):
        p.append(('Tools build is current', [PY, 'scripts/build-tools.py', '--check']))
    br, sv = [], []
    if not fast:
        br = match(files, BROWSER_MAP)
        sv = match(files, SERVER_MAP)
        for f in files:   # a changed test runs itself
            m = re.match(r'tests/browser/(\w+_test)\.py$', f)
            if m and m.group(1) not in br: br.append(m.group(1))
            m = re.match(r'tests/server/(\w+_test)\.py$', f)
            if m and m.group(1) not in sv: sv.append(m.group(1))
        if all_browser and not br:
            br = ['pages_test', 'nav_test', 'app_test', 'settings_test']
        if src and not br and not any(f.startswith('tools-app/') for f in files) and any(f.startswith('src/web/') for f in files):
            br = ['pages_test']   # a change to the site with no more specific test still gets the pages check
    return p, br, sv


def main(argv):
    if '--install-hook' in argv:
        hook = os.path.join(ROOT, '.git', 'hooks', 'pre-push')
        open(hook, 'w').write('#!/bin/sh\n# installed by scripts/precheck.py: runs the checks for what changed before every push (skip once: git push --no-verify)\n'
                              'only_tags=1\nwhile read local_ref local_sha remote_ref remote_sha; do case "$local_ref" in refs/tags/*) ;; *) only_tags=0 ;; esac; done\n'
                              '[ "$only_tags" = 1 ] && exit 0\nexec python3 scripts/precheck.py "$@"\n')
        os.chmod(hook, 0o755)
        print('Installed: %s. It runs before every git push.' % hook)
        return 0
    fast, all_b, nobump, only_plan = '--fast' in argv, '--all-browser' in argv, '--no-bump' in argv, '--plan' in argv
    files = changed_files()
    if not files:
        print('Nothing differs from origin/main: nothing to check.')
        return 0
    steps, br, sv = plan(files, fast, all_b)
    print('Changed: %d file(s). Checks: %d, browser: %s, server: %s' % (len(files), len(steps), ', '.join(br) or 'none', ', '.join(sv) or 'none'))
    if only_plan:
        for n, c in steps: print('  ', n)
        return 0
    rows = []
    admin_before = digest('src/web/hub/core/assets/shell-admin.js')
    if any('assets/admin/' in f for f in files):
        sh([PY, 'scripts/make-admin.py'])
        rows.append(('shell-admin.js is built from its parts', True, 'rebuilt' if digest('src/web/hub/core/assets/shell-admin.js') != admin_before else 'unchanged', 0.0, ''))
    bump = None if nobump else version_problem(files)
    rows.append(('Version raised when the site changed', bump is None, bump or '', 0.0, ''))

    def run(name, cmd):
        t = time.time()
        p = sh(cmd)
        out = p.stdout
        tal = re.findall(r'^(\d+)/(\d+) passed', out, re.M)
        ok = p.returncode == 0 and all(a == b for a, b in tal)
        return name, ok, '/'.join(map(str, (sum(int(a) for a, _ in tal), sum(int(b) for _, b in tal)))) if tal else '', time.time() - t, out
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
        rows += list(ex.map(lambda s: run(*s), steps))
    if br or sv:
        z = sh([PY, 'scripts/build.py'])
        zips = sorted(f for f in os.listdir(os.path.join(ROOT, 'build')) if f.startswith('site-update-') and f.endswith('.zip')) if os.path.isdir(os.path.join(ROOT, 'build')) else []
        if z.returncode != 0 or not zips:
            rows.append(('Build the zip', False, '', 0.0, z.stdout))
        else:
            want = 'site-update-%s.zip' % hub_version(open(os.path.join(ROOT, BOOT)).read())
            zp = 'build/' + (want if want in zips else zips[-1])
            jobs = [('browser/' + t, [os.path.join('tests', 'browser', t + '.py'), zp]) for t in br] + [('server/' + t, [os.path.join('tests', 'server', t + '.py'), zp]) for t in sv]
            if 'website_test' in br:
                sh([PY, 'scripts/make-site.py', '--no-guide'])
                jobs = [(n, [c[0], 'build/site'] if n.endswith('website_test') else c) for n, c in jobs]
            with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:
                rows += list(ex.map(lambda j: run(j[0], [PY] + j[1]), jobs))
    print('\n%-44s %-6s %-9s %s' % ('Check', 'Result', 'Passed', 'Seconds'))
    bad = 0
    for n, ok, c, s, out in rows:
        print('%-44s %-6s %-9s %5.0f%s' % (n, 'ok' if ok else 'FAIL', c if ok else '', s, ('  ' + c) if (not ok and c) else ''))
        bad += not ok
    for n, ok, c, s, out in rows:
        if not ok and out:
            lines = [x for x in out.split('\n') if re.search(r'FAIL|Error|error|Traceback|\bat line\b|waiting for', x)] or out.split('\n')[-12:]
            print('\n--- %s\n%s' % (n, '\n'.join(lines[:14])))
    print('\n%s' % ('All %d checks passed. Push once.' % len(rows) if not bad else '%d check(s) failed: fix them all, run this again, then push once.' % bad))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
