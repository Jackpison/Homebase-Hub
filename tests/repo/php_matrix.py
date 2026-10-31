#!/usr/bin/env python3
"""One standalone PHP check for every supported PHP, now and later (1.64.7).

The versions are not written down in CI. They are worked out each time:
  first   the oldest PHP the site supports: HUB_MIN_PHP in src/web/hub/core/lib/boot.php
  last    the newest stable PHP: asked from php.net (releases/index.php?json), or, if php.net cannot be reached, the newest one boot.php knows
  between every minor version from the first to the last (8.3, 8.4, 8.5 today; 8.6 and so on the day they are released)
  next    one minor version past the newest, tried when it can be installed. A failure there is a warning, never a red build: it is the heads-up
          that a coming PHP breaks something, long before a host moves to it.
For each version it runs the PHP lint on every file in src/ and the unit tests (tests/unit/run.php) with that version's own php.

    python3 tests/repo/php_matrix.py            check the versions that are installed here and say which are missing
    python3 tests/repo/php_matrix.py --install  first install the missing ones (Ubuntu, the ondrej/php packages that setup-php also uses; needs sudo)
    python3 tests/repo/php_matrix.py --list     only print the versions that would be checked"""
import json, os, re, shutil, subprocess, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BOOT = os.path.join(ROOT, 'src', 'web', 'hub', 'core', 'lib', 'boot.php')
EXT = ['cli', 'curl', 'mbstring', 'xml', 'zip']   # what the site and its tests use besides the core
res = []


def check(name, ok, extra=''):
    res.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok or not extra else '  -> ' + str(extra)[:400]))


def vt(v): return tuple(int(x) for x in v.split('.'))


def boot_info():
    s = open(BOOT, encoding='utf-8').read()
    lo = re.search(r"const HUB_MIN_PHP = '(\d+\.\d+)'", s).group(1)
    known = re.findall(r"'(\d+\.\d+)' => '\d{4}-\d\d-\d\d'", re.search(r'function hub_php_eol\(\): array \{(.*?)\}', s, re.S).group(1))
    return lo, sorted(known, key=vt)


def newest_stable(known):
    """The newest stable PHP minor version: php.net first, then what boot.php knows."""
    try:
        with urllib.request.urlopen('https://www.php.net/releases/index.php?json&version=8', timeout=15) as r:
            j = json.load(r)
        return '.'.join(str(j['version']).split('.')[:2]), 'php.net'
    except Exception:
        pass
    try:
        with urllib.request.urlopen('https://www.php.net/releases/active.php', timeout=15) as r:
            j = json.load(r)
        vs = [k for major in j.values() for k in major]
        return max(vs, key=vt), 'php.net'
    except Exception:
        return known[-1], 'boot.php'


def versions():
    lo, known = boot_info(); hi, src = newest_stable(known)
    if vt(hi) < vt(known[-1]): hi = known[-1]   # php.net can lag behind a new release by hours; never test fewer than boot.php knows
    a, b = vt(lo), vt(hi)
    out = ['%d.%d' % (a[0], m) for m in range(a[1], b[1] + 1)]
    return out, '%d.%d' % (b[0], b[1] + 1), lo, hi, src, known


def binary(v): return shutil.which('php' + v) or (shutil.which('php') if re.match(r'^PHP %s\.' % re.escape(v), subprocess.run(['php', '-v'], capture_output=True, text=True).stdout or '') else None)


_apt = {'ready': False}


def sh(cmd):
    return subprocess.run(['sudo', '-n'] + cmd if os.geteuid() != 0 else cmd, capture_output=True, text=True)


def install(v):
    """Installs PHP v from the same package source setup-php uses (the ondrej/php archive). On failure it says why, so CI shows the reason."""
    if not _apt['ready']:
        _apt['ready'] = True
        sh(['apt-get', 'install', '-y', '-qq', 'software-properties-common'])
        sh(['add-apt-repository', '-y', 'ppa:ondrej/php'])
        r = sh(['apt-get', 'update', '-qq'])
        if r.returncode != 0: print('apt update: ' + (r.stderr or r.stdout).strip()[-300:])
    r = sh(['apt-get', 'install', '-y', '-qq'] + ['php%s-%s' % (v, e) for e in EXT])
    if r.returncode != 0: print('could not install PHP %s: %s' % (v, (r.stderr or r.stdout).strip().replace('\n', ' | ')[-400:]))
    return r.returncode == 0


def run_one(v, exe):
    bad = []
    files = [os.path.join(d, f) for d, _, fs in os.walk(os.path.join(ROOT, 'src')) for f in fs if f.endswith('.php')]
    for f in files:
        r = subprocess.run([exe, '-l', f], capture_output=True, text=True)
        if r.returncode != 0: bad.append(f.replace(ROOT + '/', '') + ': ' + (r.stdout + r.stderr).strip().split('\n')[0])
    lint = (len(files), bad)
    r = subprocess.run([exe, os.path.join(ROOT, 'tests', 'unit', 'run.php')], capture_output=True, text=True, cwd=ROOT)
    lines = [l for l in (r.stdout + r.stderr).strip().split('\n') if l.strip()]
    if r.returncode != 0:   # show what failed, so CI says it without a second run
        print('--- unit tests on PHP %s failed; the output that matters:' % v)
        for l in [l for l in lines if re.search(r'FAIL|Fatal|Warning|Deprecated|Error|Uncaught|==', l)][:25]: print('    ' + l[:260])
    return lint, r.returncode == 0, (lines[-1:] or [''])[0]


if __name__ == '__main__':
    vs, nxt, lo, hi, src, known = versions()
    print('PHP to check: %s (oldest supported %s, newest stable %s from %s); next, as a heads-up: %s' % (', '.join(vs), lo, hi, src, nxt))
    if '--list' in sys.argv: sys.exit(0)
    for v in vs:
        exe = binary(v)
        if not exe and '--install' in sys.argv and install(v): exe = binary(v)
        if not exe:
            check('P%s PHP %s is installed here' % (v, v), '--install' not in sys.argv, 'missing (run with --install on Ubuntu)') if '--install' in sys.argv else print('SKIP PHP %s: not installed here' % v)
            continue
        lint, ok, tail = run_one(v, exe)
        check('P%s PHP %s: all %d PHP files pass the lint' % (v, v, lint[0]), not lint[1], lint[1][:3])
        check('P%s PHP %s: the unit tests pass (%s)' % (v, v, tail), ok)
    # the coming version: only a warning
    exe = binary(nxt)
    if not exe and '--install' in sys.argv and install(nxt): exe = binary(nxt)
    if exe:
        lint, ok, tail = run_one(nxt, exe)
        if lint[1] or not ok:
            print('::warning::PHP %s (not released as stable yet) breaks something: %s' % (nxt, (lint[1][:2] or [tail])))
        else:
            print('PASS PHP %s (the next version, a heads-up only): lint and unit tests pass' % nxt)
    else:
        print('NOTE PHP %s is not available to install yet' % nxt)
    # boot.php's end-of-support table must know the newest version, or Settings cannot tell when it stops getting fixes
    if vt(hi) > vt(known[-1]):
        print('::warning::boot.php hub_php_eol() has no end-of-support date for PHP %s yet: add it (and raise the test list).' % hi)
    check('Pminimum the oldest supported PHP is in the checked list', lo in vs)
    print('%d/%d passed' % (sum(res), len(res)))
    sys.exit(0 if all(res) else 1)
