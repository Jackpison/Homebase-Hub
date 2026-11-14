#!/usr/bin/env python3
"""Joins the parts of the five big page scripts into the one file each page loads (1.79.5; the same idea as make-admin.py for Settings).
  python3 scripts/make-parts.py           write every joined file from its parts
  python3 scripts/make-parts.py --check   fail if a joined file is not exactly what its parts make (tests/repo/build_test.py runs it)
  python3 scripts/make-parts.py shell     only one of: shell, home, tasks, links, info
Edit the PARTS (the numbered files in the folder named below), run this, and commit both. Each script is one file cut into labelled parts
at the places where its own section comments begin, in the order of the file: they are joined as they are, with nothing added, so the
site still loads one file per page and nothing runs differently. The parts are never shipped (scripts/build.py leaves these folders out of
the zip); ESLint, the type check and the dead-code check read the joined file, not the parts."""
import os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = os.path.join(ROOT, 'src', 'web')
# name -> (parts folder, joined file), both under src/web/
TARGETS = {
    'shell': ('hub/core/assets/shell', 'hub/core/assets/shell.js'),
    'home':  ('home/assets/app',       'home/assets/app.js'),
    'tasks': ('tasks/assets/tasks',    'tasks/assets/tasks.js'),
    'links': ('links/assets/links',    'links/assets/links.js'),
    'info':  ('info/assets/info',      'info/assets/info.js'),
}


def part_dirs():
    return [os.path.join(WEB, d) for d, _ in TARGETS.values()]


def build(name):
    d, _ = TARGETS[name]; folder = os.path.join(WEB, d)
    names = sorted(f for f in os.listdir(folder) if f.endswith('.js')) if os.path.isdir(folder) else []
    if not names: sys.exit('make-parts.py: no parts in ' + folder)
    return ''.join(open(os.path.join(folder, n), encoding='utf-8', newline='').read() for n in names)


def main(argv):
    check = '--check' in argv
    picked = [a for a in argv if not a.startswith('--')] or list(TARGETS)
    bad = [a for a in picked if a not in TARGETS]
    if bad: sys.exit('make-parts.py: unknown script ' + ', '.join(bad) + ' (use: ' + ', '.join(TARGETS) + ')')
    for name in picked:
        out = os.path.join(WEB, TARGETS[name][1]); text = build(name)
        if check:
            have = open(out, encoding='utf-8', newline='').read() if os.path.isfile(out) else None
            if have != text: sys.exit('make-parts.py: %s is not what the parts in %s/ make: run python3 scripts/make-parts.py' % (TARGETS[name][1], TARGETS[name][0]))
            print('OK: %s is what the parts in %s/ make' % (TARGETS[name][1], TARGETS[name][0]))
        else:
            open(out, 'w', encoding='utf-8', newline='').write(text)
            print('wrote src/web/%s from %d parts' % (TARGETS[name][1], len([f for f in os.listdir(os.path.join(WEB, TARGETS[name][0])) if f.endswith('.js')])))


if __name__ == '__main__':
    main(sys.argv[1:])
