#!/usr/bin/env python3
"""Joins the parts of Settings' script into the one file the site loads (1.74.0).
  python3 scripts/make-admin.py           write src/web/hub/core/assets/shell-admin.js from the parts in src/web/hub/core/assets/admin/
  python3 scripts/make-admin.py --check   fail if shell-admin.js is not exactly what the parts make (tests/repo/build_test.py runs it)
Edit the PARTS (admin/00-frame.js ... 99-end.js), then run this, and commit both. The parts are one closure cut into labelled files, in the
order of the closure: they are joined as they are, with nothing added, so the site still loads one file and nothing runs differently.
The parts are never shipped (scripts/build.py leaves the admin/ folder out of the zip); ESLint reads the joined file, not the parts."""
import os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'src', 'web', 'hub', 'core', 'assets')
PARTS = os.path.join(ASSETS, 'admin')
OUT = os.path.join(ASSETS, 'shell-admin.js')


def build():
    names = sorted(f for f in os.listdir(PARTS) if f.endswith('.js'))
    if not names: sys.exit('make-admin.py: no parts in ' + PARTS)
    return ''.join(open(os.path.join(PARTS, n), encoding='utf-8', newline='').read() for n in names)


if __name__ == '__main__':
    text = build()
    if sys.argv[1:] == ['--check']:
        have = open(OUT, encoding='utf-8', newline='').read() if os.path.isfile(OUT) else None
        if have != text: sys.exit('make-admin.py: shell-admin.js is not what the parts in assets/admin/ make: run python3 scripts/make-admin.py')
        print('OK: shell-admin.js is what the parts in assets/admin/ make')
    else:
        open(OUT, 'w', encoding='utf-8', newline='').write(text)
        print('wrote src/web/hub/core/assets/shell-admin.js from %d parts' % len([f for f in os.listdir(PARTS) if f.endswith('.js')]))
