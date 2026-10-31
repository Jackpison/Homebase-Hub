#!/usr/bin/env python3
"""Monthly maintenance (1.59): keeps the libraries inside Tools current, so the project keeps going with only a few clicks.
The workflow .github/workflows/maintenance.yml runs it; a person can run the same steps by hand (see docs/MAINTAINING.md).

  python3 scripts/maintain.py plan          asks npm for newer versions of the libraries in tools-app/package.json.
                                            Only updates within the same major version are taken (they promise not to
                                            break anything); a new major version is only listed, for a person to decide.
                                            Writes build/maintenance.json and prints a summary. Changes nothing else.
  python3 scripts/maintain.py apply         writes the planned versions into tools-app/package.json and its lock file
                                            (npm install --package-lock-only --ignore-scripts: no package script runs).
  python3 scripts/maintain.py next          prints the next patch version (1.59.0 -> 1.59.1).
  python3 scripts/maintain.py notes         fills the TODO markers that scripts/release.py X.Y.Z left in the changelog
                                            with the list of updated libraries, and copies it to the root CHANGELOG.md.

Nothing here touches the site's own code, the updater or anyone's site: the result is a pull request that CI tests and a
person merges. A release still needs a person to publish it on GitHub.
"""
import json, os, re, subprocess, sys

ROOT = os.environ.get('HUB_REPO_ROOT') or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PKG = os.path.join(ROOT, 'tools-app', 'package.json')
PLAN = os.path.join(ROOT, 'build', 'maintenance.json')
BOOT = os.path.join(ROOT, 'src', 'web', 'hub', 'core', 'lib', 'boot.php')
LOG = os.path.join(ROOT, 'src', 'web', 'hub', 'docs', 'CHANGELOG.md')
ROOT_LOG = os.path.join(ROOT, 'CHANGELOG.md')
STABLE = re.compile(r'^(\d+)\.(\d+)\.(\d+)$')   # no -beta, -rc, -dev: only finished versions


def parse(v):
    m = STABLE.match(v or '')
    return tuple(int(x) for x in m.groups()) if m else None


def pick(current, versions):
    """(the newest stable version with the same major that is newer than current, or None;
        the newest stable version of a higher major, or None)"""
    cur = parse(current)
    if not cur: return None, None
    same = [parse(v) for v in versions if parse(v) and parse(v)[0] == cur[0] and parse(v) > cur]
    major = [parse(v) for v in versions if parse(v) and parse(v)[0] > cur[0]]
    j = lambda t: '.'.join(map(str, t)) if t else None
    return j(max(same) if same else None), j(max(major) if major else None)


def next_patch(v):
    a, b, c = (int(x) for x in v.split('.'))
    return '%d.%d.%d' % (a, b, c + 1)


def notes(plan):
    """The changelog text of a maintenance release, in the changelog's own plain style."""
    up = plan.get('updates') or []
    lines = ['### Maintenance', '']
    if up:
        lines.append('- **Tools libraries updated** (each within its own major version, so nothing should change in how Tools work):')
        lines += ['  - %s %s → %s' % (n, a, b) for n, a, b in up]
    else:
        lines.append('- Nothing to update this month.')
    if plan.get('majors'):
        lines += ['', '- **Waiting for a person to decide** (a new major version can change how a library works; tried and tested by hand first):']
        lines += ['  - %s %s → %s' % (n, a, b) for n, a, b in plan['majors']]
    return '\n'.join(lines) + '\n'


def map_line(plan):
    n = len(plan.get('updates') or [])
    return 'Maintenance: %d Tools librar%s updated' % (n, 'y' if n == 1 else 'ies')


def deps():
    return json.load(open(PKG, encoding='utf-8')).get('dependencies', {})


def npm_versions(name):
    out = subprocess.run(['npm', 'view', name, 'versions', '--json'], capture_output=True, text=True, timeout=120)
    if out.returncode: raise RuntimeError('npm view %s failed: %s' % (name, out.stderr.strip()[:200]))
    v = json.loads(out.stdout or '[]')
    return v if isinstance(v, list) else [v]


def cmd_plan():
    plan = {'updates': [], 'majors': []}
    for name, cur in sorted(deps().items()):
        new, major = pick(cur, npm_versions(name))
        if new: plan['updates'].append([name, cur, new])
        if major: plan['majors'].append([name, cur, major])
    os.makedirs(os.path.dirname(PLAN), exist_ok=True)
    json.dump(plan, open(PLAN, 'w', encoding='utf-8'), indent=1)
    print(notes(plan))
    gh = os.environ.get('GITHUB_OUTPUT')
    if gh:
        with open(gh, 'a', encoding='utf-8') as f: f.write('changed=%s\n' % ('true' if plan['updates'] else 'false'))


def cmd_apply():
    plan = json.load(open(PLAN, encoding='utf-8'))
    pkg = json.load(open(PKG, encoding='utf-8'))
    for name, _, new in plan['updates']: pkg['dependencies'][name] = new
    open(PKG, 'w', encoding='utf-8').write(json.dumps(pkg, indent=2) + '\n')
    subprocess.run(['npm', 'install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'], cwd=os.path.dirname(PKG), check=True)


def cmd_next():
    print(next_patch(re.search(r"define\('HUB', '([^']+)'\)", open(BOOT, encoding='utf-8').read()).group(1)))


def cmd_notes():
    plan = json.load(open(PLAN, encoding='utf-8'))
    s = open(LOG, encoding='utf-8').read()
    if 'TODO: one line for this version' not in s or '### TODO\n\n- TODO: describe the changes in plain words.\n' not in s:
        sys.exit('maintain.py: no TODO markers in the changelog (run scripts/release.py X.Y.Z first)')
    s = s.replace('TODO: one line for this version', map_line(plan), 1)
    s = s.replace('### TODO\n\n- TODO: describe the changes in plain words.\n', notes(plan), 1)
    open(LOG, 'w', encoding='utf-8', newline='').write(s)
    open(ROOT_LOG, 'w', encoding='utf-8', newline='').write(s)


if __name__ == '__main__':
    c = sys.argv[1] if len(sys.argv) > 1 else ''
    {'plan': cmd_plan, 'apply': cmd_apply, 'next': cmd_next, 'notes': cmd_notes}.get(c, lambda: sys.exit(__doc__))()
