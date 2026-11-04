#!/usr/bin/env python3
"""Writes the YunoHost package's nginx files from deploy/nginx/homebase-hub.conf, so the rules can never drift apart (1.73.1).
  python3 scripts/make-yunohost.py           write deploy/yunohost/conf/nginx.conf and nginx-maps.conf
  python3 scripts/make-yunohost.py --check   fail if they are not what this script would write (tests/repo/deploy_test.py runs it)
YunoHost includes an app's nginx file inside its own server block, and that block sets Content-Security-Policy, X-Frame-Options,
Permissions-Policy and X-Content-Type-Options for every answer with more_set_headers, which replaces what the site sends. So here
every security header is set with more_set_headers too, later (in the app's location): for files nginx serves, the value from the
maps; for PHP's answers, the value PHP itself sent ($upstream_http_...). The maps go to the http level (nginx-maps.conf)."""
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'deploy', 'nginx', 'homebase-hub.conf')
OUT = os.path.join(ROOT, 'deploy', 'yunohost', 'conf')
HEAD = '# Made by scripts/make-yunohost.py from deploy/nginx/homebase-hub.conf: change that file, then run the script.\n'
# header: (the static-file variable in the nginx file, the upstream variable PHP's header arrives in)
SECURITY = {'X-Content-Type-Options': 'hub_s_nosniff', 'X-Frame-Options': 'hub_s_frame', 'Referrer-Policy': 'hub_s_referrer',
            'Cross-Origin-Opener-Policy': 'hub_s_coop', 'Permissions-Policy': 'hub_s_permissions', 'X-Robots-Tag': 'hub_s_robots',
            'Content-Security-Policy': 'hub_s_csp'}


def build():
    src = open(SRC, encoding='utf-8').read()
    maps = src[src.index('# ---- which headers'):src.index('\nserver {')].rstrip() + '\n'
    maps += '\n# YunoHost: for PHP\'s answers, the header PHP sent (YunoHost\'s own server block would replace it otherwise)\n'
    for h, var in SECURITY.items():
        up = '$upstream_http_' + h.lower().replace('-', '_')
        maps += 'map $hub_static $hub_y_%s { 1 $%s; default %s; }\n' % (var[6:], var, up)
    body = src[src.index('\nserver {') + len('\nserver {'):src.rstrip().rindex('}')]
    out = []
    lines = body.split('\n')
    i = 0
    while i < len(lines):
        ln = lines[i]; s = ln.strip(); i += 1
        if re.match(r'(listen|server_name|gzip|gzip_types)\b', s) or s.startswith('# Only when another proxy') or s.startswith('# fastcgi_param HUB_TRUSTED_PROXY'):
            continue
        if s.startswith('root '): out.append('    root __INSTALL_DIR__;'); continue
        if s == 'location / {':   # its try_files moves up to the app's own location /
            while lines[i].strip() != '}': out.append('    ' + lines[i].strip()); i += 1
            i += 1; continue
        m = re.match(r'add_header ([\w-]+) \$(\w+) always;$', s)
        if m and m.group(1) == 'Strict-Transport-Security': continue   # YunoHost sends its own
        if m and m.group(1) in SECURITY:
            out.append('    more_set_headers "%s: $hub_y_%s";' % (m.group(1), SECURITY[m.group(1)][6:])); continue
        ln = re.sub(r'fastcgi_pass unix:\S+;.*$', 'fastcgi_pass unix:/var/run/php/php__PHP_VERSION__-fpm-__APP__.sock;', ln)
        out.append(ln)
    text = '\n'.join(out).strip('\n')
    text = re.sub(r'\n{3,}', '\n\n', text)
    nginx = HEAD + '# YunoHost puts this inside its server block for the domain (the app needs a whole domain).\nlocation / {\n' + \
        text + '\n}\n'
    return {'nginx.conf': nginx, 'nginx-maps.conf': HEAD + '# At the http level: /etc/nginx/conf.d/homebasehub-maps.conf\n' + maps}


if __name__ == '__main__':
    files = build()
    if sys.argv[1:] == ['--check']:
        bad = [f for f, t in files.items() if not os.path.isfile(os.path.join(OUT, f)) or open(os.path.join(OUT, f), encoding='utf-8').read() != t]
        if bad: sys.exit('make-yunohost.py: deploy/yunohost/conf/%s is out of date: run python3 scripts/make-yunohost.py' % ', '.join(bad))
        print('OK: the YunoHost nginx files match deploy/nginx/homebase-hub.conf')
    else:
        os.makedirs(OUT, exist_ok=True)
        for f, t in files.items(): open(os.path.join(OUT, f), 'w', encoding='utf-8').write(t)
        print('wrote deploy/yunohost/conf/' + ', '.join(files))
