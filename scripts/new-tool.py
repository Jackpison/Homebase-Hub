#!/usr/bin/env python3
"""Adds a new tool to Tools (1.60): its line in tools-app/src/tools.json and a working starter file tools-app/src/tools/<id>.js.

  python3 scripts/new-tool.py <id> "<Name>" <section> <icon> "<one-line description>" [keyword ...]

  id        lower-case words with dashes, for example loan-emi. It becomes the address (#/tool/<id>) and is kept in favourites:
            never rename it later.
  section   one of the sections in tools.json (images, photos, pdf, utilities, calculators, documents).
  icon      a name from tools-app/src/icons.js.

Then: write the tool in its file, add at least one check for it to tests/browser/tools_test.py (tests/repo/tools_list_test.py fails
until the id is named there), and run  python3 scripts/build-tools.py --install  (it builds the list of tools from tools.json).
"""
import json, os, re, sys

ROOT = os.environ.get('HUB_REPO_ROOT') or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools-app', 'src')

STARTER = '''// {name}: {desc}
import {{ h, panel, field, input, button, note }} from '../ui.js';

export default function (root) {{
  const box = input({{ placeholder: 'Type here' }});
  const out = h('div', {{ 'aria-live': 'polite' }});
  const run = () => out.replaceChildren(note(box.value ? 'You typed: ' + box.value : 'Type something first.', !box.value));
  root.append(h('div', {{ class: 'cols' }}, panel(field('Input', box), button('Go', {{ primary: true, onClick: run }})), panel(h('h2', {{ text: 'Result' }}), out)));
}}
'''


def add(tid, name, cat, icon, desc, kw):
    data = json.load(open(os.path.join(SRC, 'tools.json'), encoding='utf-8'))
    if not re.match(r'^[a-z0-9]+(-[a-z0-9]+)*$', tid): sys.exit('new-tool.py: the id must be lower-case words with dashes, like loan-emi')
    if any(t['id'] == tid for t in data['tools']): sys.exit('new-tool.py: there is already a tool ' + tid)
    if cat not in [c['id'] for c in data['categories']]: sys.exit('new-tool.py: no section "%s" (there are: %s)' % (cat, ', '.join(c['id'] for c in data['categories'])))
    icons = open(os.path.join(SRC, 'icons.js'), encoding='utf-8').read()
    if not re.search(r'^\s*%s:' % re.escape(icon), icons, re.M): sys.exit('new-tool.py: no icon "%s" in icons.js' % icon)
    f = os.path.join(SRC, 'tools', tid + '.js')
    if os.path.exists(f): sys.exit('new-tool.py: ' + f + ' already exists')
    data['tools'].append({'id': tid, 'name': name, 'cat': cat, 'desc': desc, 'kw': kw, 'icon': icon, 'popular': 0})
    open(os.path.join(SRC, 'tools.json'), 'w', encoding='utf-8').write(json.dumps(data, indent=1, ensure_ascii=False) + '\n')
    open(f, 'w', encoding='utf-8').write(STARTER.format(name=name, desc=desc))
    return f


if __name__ == '__main__':
    a = sys.argv[1:]
    if len(a) < 5: sys.exit(__doc__)
    print('Added %s. Next: write it in %s, add its checks to tests/browser/tools_test.py, then python3 scripts/build-tools.py --install' % (a[0], add(a[0], a[1], a[2], a[3], a[4], a[5:])))
