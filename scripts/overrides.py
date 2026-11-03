#!/usr/bin/env python3
"""Can an npm override go?  (1.72.0)

package.json may pin a package through "overrides" (since 1.71.0: minimatch 11.0.4, for an advisory in the version ESLint asked for).
An override is only needed while some package still asks for a version the pin does not satisfy. This reads package-lock.json and,
for each override, lists who depends on that package and what they ask for. When every one of them would accept the pinned version
by itself, the override can be removed (and should be: an override hides the libraries' own choices).

    python3 scripts/overrides.py             prints one line per override; exit 0
    python3 scripts/overrides.py --github    also writes a GitHub notice for each override that can go (the weekly check)

The version ranges understood: exact, ^, ~, >=, >, <=, <, x and *, ranges joined by spaces (and) or || (or). Anything else counts as
"does not accept", so an unknown range never removes an override by mistake."""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def ver(v):
    m = re.match(r'^\s*v?(\d+)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?', v or '')
    if not m:
        return None
    return tuple(int(p) if p and p.isdigit() else None for p in m.groups())


def cmp(a, b):
    for x, y in zip(a, b):
        x, y = x or 0, y or 0
        if x != y:
            return -1 if x < y else 1
    return 0


def one(v, r):
    """Does version v (a tuple) satisfy the single comparator r?"""
    r = r.strip()
    if r in ('', '*', 'x', 'latest'):
        return True
    m = re.match(r'^(\^|~|>=|<=|>|<|=)?\s*(.+)$', r)
    op, b = m.group(1) or '=', ver(m.group(2))
    if b is None:
        return False
    if op == '=':
        return all(y is None or x == y for x, y in zip(v, b))
    if op == '>=':
        return cmp(v, b) >= 0
    if op == '>':
        return cmp(v, b) > 0
    if op == '<=':
        return cmp(v, b) <= 0
    if op == '<':
        return cmp(v, b) < 0
    lo = cmp(v, b) >= 0
    if op == '~':
        return lo and v[0] == b[0] and (b[1] is None or v[1] == b[1])
    if b[0]:   # ^1.2.3: same major
        return lo and v[0] == b[0]
    if b[1]:   # ^0.2.3: same minor
        return lo and v[0] == 0 and v[1] == b[1]
    return lo and v[:3] == (0, 0, b[2] or 0)


def satisfies(v, rng):
    v = ver(v)
    if v is None or v[1] is None or v[2] is None:
        return False
    for alt in str(rng).split('||'):
        parts = alt.split()
        if parts and all(one(v, p) for p in parts):
            return True
    return False


def report(pkg, lock):
    out = []
    for name, pin in sorted((pkg.get('overrides') or {}).items()):
        if not isinstance(pin, str):
            out.append((name, pin, None, 'nested override: check by hand'))
            continue
        asks = []
        for where, p in (lock.get('packages') or {}).items():
            for kind in ('dependencies', 'optionalDependencies', 'peerDependencies'):
                rng = (p.get(kind) or {}).get(name)
                if rng is not None:
                    asks.append((where.replace('node_modules/', '') or 'package.json', rng))
        bad = [a for a in asks if not satisfies(pin, a[1])]
        out.append((name, pin, asks, 'can go' if asks and not bad else 'still needed' if bad else 'nothing depends on it: it can go'))
    return out


def main():
    pkg = json.load(open(os.path.join(ROOT, 'package.json')))
    lock = json.load(open(os.path.join(ROOT, 'package-lock.json')))
    gh = '--github' in sys.argv
    rows = report(pkg, lock)
    if not rows:
        print('No overrides in package.json.')
    for name, pin, asks, verdict in rows:
        who = ', '.join('%s asks %s' % a for a in (asks or [])) or 'no package'
        print('%s pinned to %s: %s (%s)' % (name, pin, verdict, who))
        if gh and verdict != 'still needed':
            print('::notice title=An npm override can go::%s is pinned to %s in package.json, but every package that uses it now accepts that version by itself. '
                  'Remove it from "overrides", run npm install, and commit package.json and package-lock.json.' % (name, pin))
    return 0


if __name__ == '__main__':
    sys.exit(main())
