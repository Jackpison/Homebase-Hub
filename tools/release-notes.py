#!/usr/bin/env python3
"""Print the CHANGELOG.md section of one version (for the GitHub release notes): python3 tools/release-notes.py 1.38.0"""
import os, re, sys
ver = sys.argv[1].lstrip('v')
t = open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'CHANGELOG.md'), encoding='utf-8').read()
m = re.search(r'^## ' + re.escape(ver) + r'\b[^\n]*\n(.*?)(?=^---\s*$|^## )', t, re.M | re.S)
if not m: sys.exit('No section for version ' + ver)
print('## ' + ver + '\n' + m.group(1).strip() + '\n')
