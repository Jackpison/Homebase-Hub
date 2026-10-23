#!/bin/sh
# Serves an update zip with Apache and PHP on http://127.0.0.1:8300 for tests/apache_test.py (the .htaccess files only work on Apache).
# Usage: sudo sh tests/apache_setup.sh build/site-update-X.Y.Z.zip
set -e
ZIP=$(readlink -f "$1")
apt-get install -y -q apache2 libapache2-mod-php > /dev/null
rm -rf /var/www/hub && mkdir -p /var/www/hub && cd /var/www/hub && unzip -q "$ZIP" && chown -R www-data:www-data /var/www/hub
a2enmod headers rewrite mime deflate > /dev/null; a2enmod brotli > /dev/null 2>&1 || true
cat > /etc/apache2/sites-available/hub.conf <<'CONF'
Listen 8300
<VirtualHost *:8300>
  DocumentRoot /var/www/hub
  <Directory /var/www/hub>
    AllowOverride All
    Require all granted
  </Directory>
</VirtualHost>
CONF
a2ensite hub > /dev/null
apache2ctl configtest
(apache2ctl stop || true) 2> /dev/null; sleep 1; apache2ctl start; sleep 2
echo "Apache is serving the site on http://127.0.0.1:8300"
