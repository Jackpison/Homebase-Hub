#!/usr/bin/env python3
"""Tells CI whether a push or pull request changed anything besides docs, so the slow jobs can skip themselves on a
docs-only change. Prints "code=true" or "code=false" (for $GITHUB_OUTPUT). Any doubt means true: run everything.
  python3 scripts/ci_changes.py            reads EVENT, BEFORE (push) and BASE (pull request) from the environment
Docs: *.md files outside src/, except CHANGELOG.md (the release check reads it), and .github/ISSUE_TEMPLATE/.
website/** is not docs: the Pages workflow runs no tests, so CI's website test must."""
import os, re, subprocess, sys


def is_doc(path):
    if path.startswith('.github/ISSUE_TEMPLATE/'): return True
    return path.endswith('.md') and not path.startswith('src/') and os.path.basename(path) != 'CHANGELOG.md'


def code_changed(files):
    """files: changed paths, or None when they could not be listed (then run everything)."""
    return True if not files else not all(is_doc(f) for f in files)


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
