#!/usr/bin/env python3
"""Write latest.json for GitHub Pages: python3 tools/make-latest.py OWNER REPO build/site-update-X.Y.Z.zip [notes]"""
import datetime, hashlib, json, os, re, sys
owner, repo, zp = sys.argv[1:4]
notes = sys.argv[4] if len(sys.argv) > 4 else ''
ver = re.search(r'site-update-(.+)\.zip$', os.path.basename(zp)).group(1)
h = hashlib.sha256(open(zp, 'rb').read()).hexdigest()
print(json.dumps({'version': ver,
  'zip': f'https://github.com/{owner}/{repo}/releases/download/v{ver}/site-update-{ver}.zip',
  'sha256': h, 'size': os.path.getsize(zp), 'minPhp': '8.1', 'notes': notes,
  'published': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}, indent=2))
