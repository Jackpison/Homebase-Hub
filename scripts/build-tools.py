#!/usr/bin/env python3
"""Builds the Tools page from tools-app/ (its source) with esbuild.
  python3 scripts/build-tools.py              into build/tools-new (a staging copy to test)
  python3 scripts/build-tools.py --install    into src/web/tools (replaces the page; then commit the result)
Installs tools-app's own npm packages first when they are missing (npm ci, from tools-app/package-lock.json)."""
import os, shutil, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, 'tools-app')
if not os.path.isdir(os.path.join(APP, 'node_modules')):
    subprocess.run(['npm', 'ci', '--no-audit', '--no-fund'], cwd=APP, check=True)
if not os.path.isdir(os.path.join(ROOT, 'node_modules', 'esbuild')):
    subprocess.run(['npm', 'ci', '--no-audit', '--no-fund'], cwd=ROOT, check=True)
out = os.path.join(ROOT, 'src', 'web', 'tools') if '--install' in sys.argv else os.path.join(ROOT, 'build', 'tools-new')
subprocess.run(['node', os.path.join(APP, 'build.mjs'), '--out', out], check=True)
if '--install' in sys.argv:   # the fingerprint tools-rev.py checks, and a policy without the old inline-script hash
    subprocess.run([sys.executable, os.path.join(ROOT, 'scripts', 'tools-rev.py'), '--write'], check=True)
if '--install' not in sys.argv:   # the staging copy also needs the page's server rules
    shutil.copy(os.path.join(ROOT, 'src', 'web', 'tools', '.htaccess'), os.path.join(out, '.htaccess'))
