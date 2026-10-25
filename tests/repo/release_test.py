#!/usr/bin/env python3
"""Tests tools/release.py on a temporary copy of the repo: bump, fill in, check passes; then break each thing in turn
and see the check fail. Needs git and Python only.   python3 tests/repo/release_test.py"""
import os, re, shutil, subprocess, sys, tempfile

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
passed = failed = 0


def check(name, ok, detail=''):
    global passed, failed
    if ok: passed += 1; print('PASS ' + name)
    else: failed += 1; print('FAIL ' + name + ('  [' + str(detail)[:400] + ']' if detail else ''))


def run(d, *a):
    return subprocess.run([sys.executable, os.path.join(d, 'tools', 'release.py'), *a], cwd=d, capture_output=True, text=True)


def git(d, *a): subprocess.run(['git', *a], cwd=d, check=True, capture_output=True)


def fresh(tmp):
    d = os.path.join(tmp, 'repo')
    shutil.rmtree(d, ignore_errors=True)
    shutil.copytree(REPO, d, ignore=shutil.ignore_patterns('.git', 'node_modules', 'build', 'rel-*', '__pycache__', 'phpstan.phar'))
    git(d, 'init', '-q'); git(d, 'add', '-A')
    git(d, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-qm', 'base')
    return d


def hub(d): return re.search(r"define\('HUB', '([^']+)'\)", open(os.path.join(d, 'src/web/core-data/lib/boot.php')).read()).group(1)
def p(d, *x): return os.path.join(d, *x)
def rd(f): return open(f, encoding='utf-8').read()
def wr(f, t): open(f, 'w', encoding='utf-8', newline='').write(t)


def fill(d):
    """What a person does after the bump: replace the TODO markers, copy to the root."""
    f = p(d, 'src/web/docs/CHANGELOG.md')
    t = rd(f).replace('### TODO', '### Test').replace('- TODO: describe the changes in plain words.', '- A test change.').replace('TODO: one line for this version', 'A test version')
    wr(f, t); wr(p(d, 'CHANGELOG.md'), t)


tmp = tempfile.mkdtemp(prefix='hub-release-test-')
try:
    d = fresh(tmp)
    old = hub(d)
    a, b, c = (int(x) for x in old.split('.'))
    new = '%d.%d.0' % (a, b + 1)
    tools_before = rd(p(d, 'src/web/tools/index.html'))
    jspdf_before = rd(p(d, 'src/web/info/assets/info.js'))

    check('the check passes on the repo as it is', run(d, '--check').returncode == 0, run(d, '--check').stdout)
    r = run(d, old); check('the same version is refused', r.returncode != 0 and 'not higher' in r.stderr, r.stderr)
    r = run(d, '1.0.0'); check('an older version is refused', r.returncode != 0, r.stderr)
    r = run(d, 'banana'); check('a version that is not X.Y.Z is refused', r.returncode != 0, r.stderr)
    wr(p(d, 'scratch.txt'), 'x')
    r = run(d, new); check('a dirty working tree is refused', r.returncode != 0 and 'uncommitted' in r.stderr and hub(d) == old, r.stderr)
    os.remove(p(d, 'scratch.txt'))

    r = run(d, new)
    check('the bump runs', r.returncode == 0, r.stdout + r.stderr)
    check('HUB is raised', hub(d) == new)
    pages = subprocess.run(['grep', '-rl', '?v=' + old, p(d, 'src')], capture_output=True, text=True).stdout.split()
    pages = [x for x in pages if '/tools/assets/' not in x and not x.endswith('CHANGELOG.md') and '/docs/src/' not in x]
    check('no ?v= of the old version is left (outside the changelog and Tools assets)', not pages, pages)
    check('every page loads the new version', rd(p(d, 'src/web/links/index.html')).count('?v=' + new) >= 1 and rd(p(d, 'src/web/home/index.php')).count('?v=' + new) >= 1)
    t2 = rd(p(d, 'src/web/tools/index.html'))
    check('Tools fingerprints are untouched', re.findall(r'\?v=([0-9a-f]{8})\b', t2) == re.findall(r'\?v=([0-9a-f]{8})\b', tools_before) and len(re.findall(r'\?v=([0-9a-f]{8})\b', t2)) == 2)
    check('the jsPDF ?v=4.2.1 is untouched', rd(p(d, 'src/web/info/assets/info.js')) == jspdf_before)
    log = rd(p(d, 'src/web/docs/CHANGELOG.md'))
    check('a changelog section with a TODO marker is on top', re.search(r'^## (\S+)', log[log.index('---'):], re.M).group(1) == new and 'TODO' in log)
    check('a Version Map row is on top', re.search(r'^\| ---[^\n]*\n\| ' + re.escape(new) + r' \| TODO', log, re.M) is not None)
    check('the root CHANGELOG.md is a copy', rd(p(d, 'CHANGELOG.md')) == log)
    r = run(d, '--check'); check('the check fails while a TODO marker is left', r.returncode != 0 and 'TODO' in r.stdout, r.stdout)
    fill(d)
    r = run(d, '--check'); check('after filling in, the check passes', r.returncode == 0, r.stdout)
    git(d, 'add', '-A'); git(d, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-qm', 'bumped')

    def broken(name, change, expect):
        snap = {f: rd(p(d, f)) for f in ('src/web/core-data/lib/boot.php', 'src/web/links/index.html', 'src/web/docs/CHANGELOG.md', 'CHANGELOG.md', 'src/web/tools/sw.js')}
        change()
        r = run(d, '--check')
        check('the check fails: ' + name, r.returncode != 0 and expect in r.stdout, r.stdout)
        for f, t in snap.items(): wr(p(d, f), t)
        shutil.rmtree(p(d, 'src/site-data'), ignore_errors=True)

    def sub(f, a, b):
        t = rd(p(d, f)); assert a in t, (f, a); wr(p(d, f), t.replace(a, b, 1))

    broken('HUB differs', lambda: sub('src/web/core-data/lib/boot.php', "define('HUB', '%s')" % new, "define('HUB', '%s.1')" % new[:-2]), 'HUB')
    broken('a page loads an old ?v=', lambda: sub('src/web/links/index.html', '?v=' + new, '?v=' + old), 'links/index.html')
    broken('the newest heading differs', lambda: sub('src/web/docs/CHANGELOG.md', '## ' + new + '\n', '## 9.9.9\n'), 'heading')
    broken('the Version Map row differs', lambda: sub('src/web/docs/CHANGELOG.md', '| ' + new + ' | A test version', '| 9.9.9 | A test version'), 'Version Map')
    broken('the root CHANGELOG.md differs', lambda: wr(p(d, 'CHANGELOG.md'), rd(p(d, 'CHANGELOG.md')) + '\nextra\n'), 'root CHANGELOG')
    broken('a TODO is back in the section', lambda: sub('src/web/docs/CHANGELOG.md', '- A test change.', '- A test change. TODO'), 'TODO')
    broken('src/site-data exists', lambda: os.makedirs(p(d, 'src/site-data')), 'site-data')
    broken('the Tools fingerprint is stale', lambda: sub('src/web/tools/sw.js', "const TOOLS_REV = '", "const TOOLS_REV = '0"), 'fingerprint')
    r = run(d, '--check'); check('after every repair the check passes again', r.returncode == 0, r.stdout)
finally:
    shutil.rmtree(tmp, ignore_errors=True)

print('\n%d/%d passed' % (passed, passed + failed))
sys.exit(1 if failed else 0)
