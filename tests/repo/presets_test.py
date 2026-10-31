#!/usr/bin/env python3
"""Settings > Appearance > Presets (1.59): no two presets look almost the same, and the vivid ones added in 1.59 are easy
to read (text 7:1, secondary text 4.5:1, the accent 3:1). Reads the list straight from shell-admin.js.
  python3 tests/repo/presets_test.py"""
import math, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = open(os.path.join(ROOT, 'src', 'web', 'hub', 'core', 'assets', 'shell-admin.js'), encoding='utf-8').read()
res = []
def check(name, ok, extra=''):
    res.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok or not extra else '  -> ' + str(extra)[:600]))

block = src[src.index('  var PRESETS = {'):src.index('\n  };', src.index('  var PRESETS = {'))]
DEF = {'dark': dict(bg='#000000', box='#0e0e0e', panel='#161616', line='#262626', text='#f2f2f2', mute='#a0a0a0', bar='#000000', barText='#a0a0a0'),
       'light': dict(bg='#f6f5f1', box='#ffffff', panel='#ffffff', line='#e2dfd6', text='#141414', mute='#5f5b54', bar='#f6f5f1', barText='#5f5b54')}
P = {}
for mode, part in (('dark', block[:block.index('    light: [')]), ('light', block[block.index('    light: ['):])):
    P[mode] = []
    for m in re.finditer(r"\{ n: '((?:[^'\\]|\\.)+)', g: '(\w+)', c: \{([^}]*)\}, a: '([^']*)' \}", part):
        c = dict(DEF[mode]); c.update(dict(re.findall(r"(\w+):\s*'(#[0-9a-f]{6})'", m.group(3))))
        P[mode].append({'n': m.group(1).replace("\\'", "'"), 'g': m.group(2), 'c': c, 'a': m.group(4) or '#ffc21a'})

def lab(h):
    rgb = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    r, g, b = [((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in rgb]
    x, y, z = (r * .4124 + g * .3576 + b * .1805) / .95047, r * .2126 + g * .7152 + b * .0722, (r * .0193 + g * .1192 + b * .9505) / 1.08883
    f = lambda t: t ** (1 / 3) if t > .008856 else 7.787 * t + 16 / 116
    return 116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))
def d(a, b): return math.dist(lab(a), lab(b))
def look_dist(x, y): return (d(x['c']['bg'], y['c']['bg']) * 2 + d(x['c']['box'], y['c']['box']) + d(x['c']['panel'], y['c']['panel']) + d(x['c']['text'], y['c']['text']) * .5 + d(x['a'], y['a']) * 1.5) / 6
def lum(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]; c = [v / 12.92 if v <= .03928 else ((v + .055) / 1.055) ** 2.4 for v in c]
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]
def cr(a, b): x, y = lum(a), lum(b); return (max(x, y) + .05) / (min(x, y) + .05)

check('R1 the two lists are read (dark and light)', len(P['dark']) == 91 and len(P['light']) == 52, (len(P['dark']), len(P['light'])))
KEEP = {'GitHub Light', 'GitHub Dark', 'Dracula', 'Nord', 'Solarized', 'Catppuccin Mocha', 'Catppuccin Latte', 'One Dark', 'One Light', 'Tokyo Night', 'Solarized Light', 'Gruvbox', 'Monokai'}
LIMIT = {'dark': 5.6, 'light': 4.6}
close = []
for mode in P:
    L = P[mode]
    for i in range(len(L)):
        for j in range(i + 1, len(L)):
            x, y = L[i], L[j]
            kept = lambda p: p['g'] == 'contrast' or p['n'] in KEEP or p is L[0]   # the default look, the well-known themes and the high-contrast ones may sit close
            if look_dist(x, y) < LIMIT[mode] and not (kept(x) and kept(y)): close.append((mode, x['n'], y['n'], round(look_dist(x, y), 1)))
check('R2 no two presets look almost the same (each one is a real choice)', not close, close)
NEW = ['Ultraviolet', 'Cyber Lime', 'Magma', 'Tropic Night', 'Royal Blue', 'Berry Blast', 'Jungle Neon', 'Cobalt Flame', 'Sunburst', 'Flamingo', 'Aqua Pop', 'Lime Soda', 'Grape Soda', 'Tangerine']
found = {p['n']: p for mode in P for p in P[mode] if p['n'] in NEW}
weak = [(n, [round(v, 1) for v in (cr(p['c']['text'], p['c']['bg']), cr(p['c']['mute'], p['c']['box']), cr(p['c']['barText'], p['c']['bar']), cr(p['a'], p['c']['bg']))])
        for n, p in found.items() if not (cr(p['c']['text'], p['c']['bg']) >= 7 and cr(p['c']['text'], p['c']['box']) >= 7 and cr(p['c']['mute'], p['c']['box']) >= 4.5
                                          and cr(p['c']['mute'], p['c']['bg']) >= 4.5 and cr(p['c']['barText'], p['c']['bar']) >= 4.5 and cr(p['a'], p['c']['bg']) >= 3 and cr(p['a'], p['c']['box']) >= 3)]
check('R3 the 14 vivid presets of 1.59 are there, in the Vivid group, and easy to read', len(found) == 14 and all(p['g'] == 'vivid' for p in found.values()) and not weak, (sorted(set(NEW) - set(found)), weak))
soft = {p['n']: p for p in P['dark'] if p['n'] in ('Soft Dark', 'Soft Warm')}
check('R4 Soft Dark and Soft Warm (1.64.0) are in Site Looks, dimmer than the default, and still easy to read (text 7:1, secondary text 4.5:1)',
      set(soft) == {'Soft Dark', 'Soft Warm'} and all(p['g'] == 'site' and lum(p['c']['text']) < lum(DEF['dark']['text']) and cr(p['c']['text'], p['c']['panel']) >= 7 and cr(p['c']['mute'], p['c']['panel']) >= 4.5 and cr(p['c']['mute'], p['c']['box']) >= 4.5 for p in soft.values()),
      {n: (round(cr(p['c']['text'], p['c']['panel']), 1), round(cr(p['c']['mute'], p['c']['panel']), 1)) for n, p in soft.items()})
print('\n%d/%d passed' % (sum(res), len(res)))
sys.exit(0 if all(res) else 1)