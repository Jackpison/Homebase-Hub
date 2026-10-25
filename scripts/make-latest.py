#!/usr/bin/env python3
"""Write latest.json (published on GitHub Pages).
Usage: python3 scripts/make-latest.py OWNER REPO VERSION SHA256 SIZE [OUTFILE]
The short notes come from the Version Map row of CHANGELOG.md."""
import datetime, json, os, re, sys
owner, repo, ver, sha, size = sys.argv[1:6]
out = sys.argv[6] if len(sys.argv) > 6 else None
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
notes = ''
m = re.search(r'^\| ' + re.escape(ver) + r' \| (.+?) \|\s*$', open(os.path.join(root, 'CHANGELOG.md'), encoding='utf-8').read(), re.M)
if m: notes = m.group(1)[:600]
d = {'version': ver, 'zip': f'https://github.com/{owner}/{repo}/releases/download/v{ver}/site-update-{ver}.zip', 'sha256': sha, 'size': int(size),
     'minPhp': re.search(r"const HUB_MIN_PHP = '([^']+)'", open(os.path.join(root, 'src/web/hub/core/lib/boot.php'), encoding='utf-8').read()).group(1), 'notes': notes, 'published': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}
s = json.dumps(d, indent=2)
if out: open(out, 'w', encoding='utf-8').write(s + '\n')
else: print(s)
