#!/usr/bin/env python3
"""The page pre-loading rules (src/web/hub/core/assets/speculation-rules.json) never load a whole page just because the mouse passes over it (1.64.7).
Before, every bar link was PRERENDERED on hover: moving across the bar made the browser run Home, Links, Info, Cards, Tasks and the rest in the
background, about 13 requests each, in a few seconds. A host's firewall can read that as an attack and block the visitor. Now a hover only
prefetches the page's HTML (one request), and a whole page is prerendered only when the button is pressed.
    python3 tests/repo/speculation_test.py"""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
rules = json.load(open(os.path.join(ROOT, 'src', 'web', 'hub', 'core', 'assets', 'speculation-rules.json')))
res = []
def check(name, ok, extra=''):
    res.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok or not extra else '  -> ' + str(extra)[:300]))
pre = rules.get('prerender', [])
check('S1 a page is prerendered only when the link is pressed (conservative), never on hover', pre and all(r.get('eagerness') == 'conservative' for r in pre), pre)
check('S2 hovering only prefetches the page (one request, no scripts run)', any(r.get('eagerness') == 'moderate' for r in rules.get('prefetch', [])) and not any(r.get('eagerness') in ('moderate', 'eager', 'immediate') for r in pre))
print('%d/%d passed' % (sum(res), len(res)))
sys.exit(0 if all(res) else 1)
