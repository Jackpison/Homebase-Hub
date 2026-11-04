#!/bin/sh
# Serves an update zip with Apache and PHP on http://127.0.0.1:8300 for tests/server/apache_test.py (the .htaccess files only work on Apache).
# Usage: sudo sh tests/server/apache_setup.sh build/site-update-X.Y.Z.zip
set -e
ZIP=$(readlink -f "$1"); HERE=$(dirname "$(readlink -f "$0")")
apt-get install -y -q apache2 libapache2-mod-php > /dev/null
rm -rf /var/www/hub && mkdir -p /var/www/hub && cd /var/www/hub && unzip -q "$ZIP" && \
  { M=web/hub/media; [ -d "$M" ] || M=web/core-data/media; mkdir -p -m 755 "$M/home/photos"; cp "$(ls web/*/core/assets/brand/logo-192.png web/core-data/assets/brand/logo-192.png 2>/dev/null | head -1)" "$M/home/photos/t.png"; printf '<?php echo "ran";\n' > "$M/home/photos/t.php"; chmod 644 "$M/home/photos/t.png" "$M/home/photos/t.php"; } && \
  chown -R www-data:www-data /var/www/hub
a2enmod headers rewrite mime deflate > /dev/null; a2enmod brotli > /dev/null 2>&1 || true
# deploy/apache/homebase-hub.conf as shipped: only the port, domain and folder filled in
CONF="$HERE/../../deploy/apache/homebase-hub.conf"
{ echo 'Listen 8300'; sed -e 's#<VirtualHost \*:80>#<VirtualHost *:8300>#' -e 's#ServerName hub.example.com#ServerName localhost#' -e 's#/var/www/homebase-hub#/var/www/hub#g' "$CONF"; } > /etc/apache2/sites-available/hub.conf
grep -q '<VirtualHost \*:8300>' /etc/apache2/sites-available/hub.conf && grep -q 'AllowOverride All' /etc/apache2/sites-available/hub.conf
a2ensite hub > /dev/null
apache2ctl configtest
(apache2ctl stop || true) 2> /dev/null; sleep 1; apache2ctl start; sleep 2
echo "Apache is serving the site on http://127.0.0.1:8300"
