#!/usr/bin/env python3
"""Published releases for the tests: which one came before this build, and its zip (checked against its .sha256).
  python3 tests/lib/releases.py previous               prints the newest release tag older than HUB in boot.php (e.g. v1.50.0)
  python3 tests/lib/releases.py download TAG DIR       saves TAG's site-update-X.Y.Z.zip into DIR, after checking its SHA-256
Uses GitHub's REST API (gh api) for the list and a plain download for the files; works in CI and in a sandbox without GraphQL."""
import hashlib, json, os, re, subprocess, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REPO = os.environ.get('GH_REPO') or 'Jackpison/Homebase-Hub'


def ver(s): return tuple(int(x) for x in s.lstrip('v').split('.'))


def current():
    return re.search(r"define\('HUB', '([^']+)'\)", open(os.path.join(ROOT, 'src/web/hub/core/lib/boot.php'), encoding='utf-8').read()).group(1)


def tags():
    out = subprocess.run(['gh', 'api', '--paginate', 'repos/%s/releases?per_page=100' % REPO, '--jq', '.[] | select(.draft | not) | .tag_name'],
                         capture_output=True, text=True, check=True).stdout
    return [t for t in out.split() if re.fullmatch(r'v\d+\.\d+\.\d+', t)]


def previous(cur=None, all_tags=None):
    """The newest release older than cur (the build's version); the update test's PREVIOUS zip."""
    cur = cur or current()
    older = [t for t in (all_tags if all_tags is not None else tags()) if ver(t) < ver(cur)]
    if not older: raise SystemExit('No release older than %s.' % cur)
    return max(older, key=ver)


def download(tag, dest):
    name = 'site-update-%s.zip' % tag.lstrip('v')
    base = 'https://github.com/%s/releases/download/%s/' % (REPO, tag)
    data = urllib.request.urlopen(base + name, timeout=120).read()
    want = urllib.request.urlopen(base + name + '.sha256', timeout=60).read().decode().split()[0].lower()
    got = hashlib.sha256(data).hexdigest()
    if got != want: raise SystemExit('%s: SHA-256 %s does not match the release\'s %s' % (name, got, want))
    os.makedirs(dest, exist_ok=True)
    path = os.path.join(dest, name)
    open(path, 'wb').write(data)
    return path


if __name__ == '__main__':
    if len(sys.argv) >= 2 and sys.argv[1] == 'previous': print(previous())
    elif len(sys.argv) == 4 and sys.argv[1] == 'download': print(download(sys.argv[2], sys.argv[3]))
    else: sys.exit(__doc__)
