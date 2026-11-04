#!/bin/sh
# Serves an update zip with nginx and PHP-FPM on http://127.0.0.1:8301, using deploy/nginx/homebase-hub.conf as shipped
# (only the domain, folder, port and PHP socket filled in), for: python3 tests/server/apache_test.py http://127.0.0.1:8301
# Usage: sudo sh tests/server/nginx_setup.sh build/site-update-X.Y.Z.zip
set -e
ZIP=$(readlink -f "$1"); CONF=$(readlink -f "$(dirname "$0")/../../deploy/nginx/homebase-hub.conf")
# installed without starting (port 80 may be Apache's): this script starts what it needs
printf '#!/bin/sh\nexit 101\n' > /usr/sbin/policy-rc.d; chmod 755 /usr/sbin/policy-rc.d
apt-get install -y -q nginx php-fpm php-curl php-mbstring php-zip php-gd php-intl > /dev/null || { rm -f /usr/sbin/policy-rc.d; exit 1; }
rm -f /usr/sbin/policy-rc.d
FPM=$(basename "$(ls /etc/init.d/php*-fpm | sort -V | tail -1)")
service "$FPM" start > /dev/null 2>&1 || true; sleep 1
SOCK=/run/php/$FPM.sock; [ -S "$SOCK" ] || { echo "PHP-FPM ($FPM) did not start" >&2; exit 1; }
rm -rf /var/www/hub-nginx && mkdir -p /var/www/hub-nginx && cd /var/www/hub-nginx && unzip -q "$ZIP"
M=web/hub/media; mkdir -p -m 755 "$M/home/photos"; cp web/hub/core/assets/brand/logo-192.png "$M/home/photos/t.png"; printf '<?php echo "ran";\n' > "$M/home/photos/t.php"
chown -R www-data:www-data /var/www/hub-nginx
sed -e 's#listen 80;#listen 8301;#' -e '/listen \[::\]:80;/d' -e 's#server_name hub.example.com;#server_name _;#' \
    -e 's#root /var/www/homebase-hub;#root /var/www/hub-nginx;#' -e "s#unix:/run/php/php8.3-fpm.sock#unix:$SOCK#" "$CONF" > /etc/nginx/sites-enabled/homebase-hub-test
grep -q 'listen 8301;' /etc/nginx/sites-enabled/homebase-hub-test && grep -q "$SOCK" /etc/nginx/sites-enabled/homebase-hub-test
rm -f /etc/nginx/sites-enabled/default   # its [::]:80 fails where there is no IPv6, and port 80 may be Apache's
nginx -t
(nginx -s reload 2>/dev/null || nginx); sleep 1
echo "nginx is serving the site on http://127.0.0.1:8301"
