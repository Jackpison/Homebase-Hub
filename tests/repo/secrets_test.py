#!/usr/bin/env python3
"""Looks for secrets in every file git tracks and in the messages of the last 50 commits: GitHub, Slack, AWS, Google, Anthropic and OpenAI keys, Telegram bot tokens and private keys.
AGENTS.md says no password, token or key goes into the repo, a test or a commit message; this is the check that says so.
It also proves its own patterns catch a made-up secret of each kind (the samples are built from pieces, so this file never holds one).
  python3 tests/repo/secrets_test.py"""
import os, re, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
res = []
def check(name, ok, extra=''):
    res.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok or not extra else '  -> ' + str(extra)[:400]))

PATTERNS = {
    'GitHub token': r'\bgh[pousr]_[A-Za-z0-9]{36,}\b',
    'GitHub fine-grained token': r'\bgithub_pat_[A-Za-z0-9_]{50,}\b',
    'private key': r'-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY',
    'AWS access key': r'\bAKIA[0-9A-Z]{16}\b',
    'Slack token': r'\bxox[abprs]-[0-9A-Za-z-]{10,}',
    'Google API key': r'\bAIza[0-9A-Za-z_-]{35}\b',
    'Anthropic or OpenAI key': r'\bsk-(?:ant-)?[A-Za-z0-9_-]{32,}',
    'Telegram bot token': r'\b[0-9]{8,10}:[A-Za-z0-9_-]{35}\b',
}
RX = {k: re.compile(v) for k, v in PATTERNS.items()}
# Files that are not ours or are not text: libraries bundled into Tools, pictures, fonts, zips.
SKIP = ('src/web/tools/assets/', 'website/img/', 'website/fonts/', 'scripts/fonts/')
SKIP_EXT = ('.png', '.webp', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.zip', '.pdf', '.wasm', '.heic', '.mjs.map', '.map')


def scan(text):
    return [k for k, rx in RX.items() if rx.search(text)]


# the scanner finds one of each kind (pieces glued together here, so this file holds none)
SAMPLES = {
    'GitHub token': 'gh' + 'p_' + 'a1B2' * 9,
    'GitHub fine-grained token': 'github' + '_pat_' + 'A1b2C3' * 9,
    'private key': '-----BEGIN ' + 'RSA PRIVATE KEY-----',
    'AWS access key': 'AK' + 'IA' + 'ABCDEFGH12345678',
    'Slack token': 'xo' + 'xb-' + '1234567890-abcdef',
    'Google API key': 'AI' + 'za' + 'A' * 35,
    'Anthropic or OpenAI key': 'sk' + '-ant-' + 'a1' * 20,
    'Telegram bot token': '123456789' + ':' + 'AAF' + 'x' * 32,
}
check('S1 every kind of secret the check knows is found in a made-up sample', all(k in scan('x = "%s"' % v) for k, v in SAMPLES.items()), [k for k, v in SAMPLES.items() if k not in scan(v)])
check('S2 ordinary text, hashes and version numbers are not flagged', not scan('sha256 3f786850e387550fdab836ed7e6dc881de23001b 1.61.9 v1.61.9 https://github.com/Jackpison/homebase-hub  ghp_ is a prefix'))

files = subprocess.run(['git', '-C', ROOT, 'ls-files', '-z'], capture_output=True, text=True, check=True).stdout.split('\0')
found, read = [], 0
for f in files:
    if not f or f.startswith(SKIP) or f.lower().endswith(SKIP_EXT): continue
    try:
        text = open(os.path.join(ROOT, f), encoding='utf-8').read()
    except (UnicodeDecodeError, FileNotFoundError, IsADirectoryError):
        continue
    read += 1
    for kind in scan(text): found.append('%s: %s' % (f, kind))   # never print the match itself
check('S3 no file git tracks holds a secret (%d text files read)' % read, not found and read > 100, found[:10] or read)
def message_findings(root):
    """[(short hash, kinds)] for the last 50 commit messages in a repo, and how many it read (CI's checkout is shallow: it reads what it has)."""
    out = subprocess.run(['git', '-C', root, 'log', '-n', '50', '--format=%H%x00%B%x01'], capture_output=True, text=True).stdout.split('\x01')
    rows = [m.split('\x00', 1) for m in out if '\x00' in m]
    return [(h.strip()[:10], ', '.join(scan(body))) for h, body in rows if scan(body)], len(rows)


bad_msgs, n_msgs = message_findings(ROOT)
check('S4 none of the last 50 commit messages holds a secret (%d read)' % n_msgs, not bad_msgs and n_msgs > 0, bad_msgs[:10])
tmp = tempfile.mkdtemp()
g = lambda *a: subprocess.run(['git', '-C', tmp, '-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false'] + list(a), capture_output=True, text=True, check=True)
g('init', '-q'); g('commit', '-q', '--allow-empty', '-m', 'fine message'); g('commit', '-q', '--allow-empty', '-m', 'oops ' + SAMPLES['GitHub token'])
found, read = message_findings(tmp)
check('S5 a commit message that holds a token is found (made-up sample in a scratch repo), a clean one is not', read == 2 and len(found) == 1 and found[0][1] == 'GitHub token', (found, read))
print('\n%d/%d passed' % (sum(res), len(res)))
sys.exit(0 if all(res) else 1)
