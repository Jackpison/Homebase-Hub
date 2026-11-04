#!/bin/sh
# Serves an update zip the way YunoHost would, on http://127.0.0.1:8302, for: python3 tests/server/apache_test.py http://127.0.0.1:8302
# A separate nginx with YunoHost's own header lines in its server block (copied from YunoHost's conf/nginx/security.conf.inc),
# the package's nginx-maps.conf at the http level and its nginx.conf inside the server block, as YunoHost places them.
# Usage: sudo sh tests/server/yunohost_setup.sh build/site-update-X.Y.Z.zip
set -e
ZIP=$(readlink -f "$1"); CONF=$(readlink -f "$(dirname "$0")/../../deploy/yunohost/conf")
printf '#!/bin/sh\nexit 101\n' > /usr/sbin/policy-rc.d; chmod 755 /usr/sbin/policy-rc.d
apt-get install -y -q nginx libnginx-mod-http-headers-more-filter php-fpm php-curl php-mbstring php-zip php-gd php-intl > /dev/null || { rm -f /usr/sbin/policy-rc.d; exit 1; }
rm -f /usr/sbin/policy-rc.d
FPM=$(basename "$(ls /etc/init.d/php*-fpm | sort -V | tail -1)"); PV=${FPM#php}; PV=${PV%-fpm}
service "$FPM" start > /dev/null 2>&1 || true; sleep 1
SOCK=/run/php/$FPM.sock; [ -S "$SOCK" ] || { echo "PHP-FPM ($FPM) did not start" >&2; exit 1; }
SITE=/var/www/hub-ynh; rm -rf $SITE && mkdir -p $SITE && cd $SITE && unzip -q "$ZIP"
M=web/hub/media; mkdir -p -m 755 "$M/home/photos"; cp web/hub/core/assets/brand/logo-192.png "$M/home/photos/t.png"; printf '<?php echo "ran";\n' > "$M/home/photos/t.php"
chown -R www-data:www-data $SITE
P=/etc/nginx-ynh-test
[ ! -f $P/nginx.pid ] || { kill "$(cat $P/nginx.pid)" 2>/dev/null || true; sleep 1; }
rm -rf $P && mkdir -p $P/conf.d $P/domain.d $P/logs
cp /etc/nginx/mime.types /etc/nginx/fastcgi_params $P/
MOD=$(ls /usr/share/nginx/modules/ngx_http_headers_more_filter_module.so /usr/lib/nginx/modules/ngx_http_headers_more_filter_module.so 2>/dev/null | head -1)
cp "$CONF/nginx-maps.conf" $P/conf.d/homebasehub-maps.conf
sed -e "s#__INSTALL_DIR__#$SITE#g" -e "s#/var/run/php/php__PHP_VERSION__-fpm-__APP__.sock#$SOCK#" -e "s#__PHP_VERSION__#$PV#g" -e 's#__APP__#homebasehub#g' \
    "$CONF/nginx.conf" > $P/domain.d/homebasehub.conf
! grep -q '__[A-Z_]*__' $P/domain.d/homebasehub.conf
cat > $P/nginx.conf <<EOF
user www-data;
load_module $MOD;
pid $P/nginx.pid;
error_log $P/logs/error.log;
events { worker_connections 256; }
http {
    include mime.types;
    default_type application/octet-stream;
    access_log off;
    include conf.d/*.conf;
    server {
        listen 8302;
        server_name _;
        # YunoHost's own lines (security.conf.inc, the default "not experimental" ones)
        more_set_headers "Content-Security-Policy : upgrade-insecure-requests";
        more_set_headers "X-Content-Type-Options : nosniff";
        more_set_headers "X-XSS-Protection : 1; mode=block";
        more_set_headers "X-Download-Options : noopen";
        more_set_headers "X-Permitted-Cross-Domain-Policies : none";
        more_set_headers "X-Frame-Options : SAMEORIGIN";
        more_set_headers "Permissions-Policy : interest-cohort=()";
        gzip off;
        include domain.d/*.conf;
    }
}
EOF
nginx -p $P -c $P/nginx.conf -t
nginx -p $P -c $P/nginx.conf
sleep 1
echo "nginx (as YunoHost) is serving the site on http://127.0.0.1:8302"
