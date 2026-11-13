#!/usr/bin/env python3
"""Tells CI whether a push or pull request changed anything besides docs, so the slow jobs can skip themselves on a
docs-only change. Prints "code=true|false", "app=true|false", "servers=true|false" and "matrix=<JSON>" (for $GITHUB_OUTPUT). Any doubt means true: run everything.
app: the site, Tools or the visual check itself changed, so the "visual changes" report is worth making.
  python3 scripts/ci_changes.py            reads EVENT, BEFORE (push) and BASE (pull request) from the environment
Docs: *.md files outside src/, except CHANGELOG.md (the release check reads it), and .github/ISSUE_TEMPLATE/.
matrix: the browser jobs of CI. CI tests Chromium only. Every push runs the light set (the pages half); the tools half joins it when Tools or the
Animated Designs changed, when a release is being prepared (the version and the changelog change together), on a manual run and when the changes
cannot be listed. The weekly run in scheduled.yml starts CI by hand, so every week the whole set runs too. WebKit and Firefox run in scheduled.yml
(WebKit every Monday, Firefox on the 1st), not here.
website/** is not docs: the Pages workflow runs no tests, so CI's website test must."""
import json, os, re, subprocess, sys


def is_doc(path):
    if path.startswith('.github/ISSUE_TEMPLATE/'): return True
    return path.endswith('.md') and not path.startswith('src/') and os.path.basename(path) != 'CHANGELOG.md'


APP = ('src/', 'tools-app/', 'scripts/build.py', 'scripts/build-tools.py', 'tests/browser/visual_compare.py', 'tests/lib/')


def app_changed(files):
    """files: changed paths, or None when they could not be listed (then make the report)."""
    return True if not files else any(f.startswith(APP) for f in files)


def code_changed(files):
    """files: changed paths, or None when they could not be listed (then run everything)."""
    return True if not files else not all(is_doc(f) for f in files)


SERVER_PATHS = ('deploy/', 'tests/server/', 'tests/lib/', 'scripts/', '.github/', 'src/web/hub/')


def servers_changed(files):
    """The Apache, nginx, Docker, install-script and update/hostile-zip jobs: only when something they test changed (any PHP or .htaccess, the engine, the build
    and deploy files, their tests). A change to a page's script, style or text leaves them out. Any doubt runs them."""
    if not files: return True
    return any(f.startswith(SERVER_PATHS) or f.endswith(('.php', '.htaccess')) for f in files)


TOOLS_PATHS = ('tools-app/', 'src/web/tools/', 'src/web/home/designs')


def browser_parts(files):
    """The halves of the browser tests this push runs: always 'pages'; 'tools' too when it matters (see the top of this file)."""
    if not files: return ['pages', 'tools']
    release = 'src/web/hub/core/lib/boot.php' in files and 'CHANGELOG.md' in files
    return ['pages', 'tools'] if release or any(f.startswith(TOOLS_PATHS) for f in files) else ['pages']


def changed_files():
    event = os.environ.get('EVENT', '')
    base = os.environ.get('BASE', '') if event == 'pull_request' else os.environ.get('BEFORE', '') if event == 'push' else ''
    if not re.fullmatch(r'[0-9a-f]{40}', base or '') or set(base) == {'0'}: return None   # a new branch, a manual run, no base
    try:
        subprocess.run(['git', 'cat-file', '-e', base + '^{commit}'], check=True, capture_output=True)
        out = subprocess.run(['git', 'diff', '--name-only', base, 'HEAD'], check=True, capture_output=True, text=True).stdout
    except subprocess.CalledProcessError:
        return None
    return [f for f in out.splitlines() if f.strip()]


if __name__ == '__main__':
    files = changed_files()
    code = code_changed(files)
    print('Changed: %s' % ('(could not tell: run everything)' if files is None else ', '.join(files[:20]) or '(nothing)'), file=sys.stderr)
    print('code=%s' % ('true' if code else 'false'))
    print('app=%s' % ('true' if app_changed(files) else 'false'))
    print('servers=%s' % ('true' if servers_changed(files) else 'false'))
    print('matrix=%s' % json.dumps({'browser': ['chromium'], 'part': browser_parts(files)}, separators=(',', ':')))
