#!/usr/bin/env bash
# Homebase Hub on a fresh server with Ubuntu 24.04 or newer, or Debian 13 or newer: Apache and PHP, the newest release
# (checked against its published SHA-256), the site's Apache settings and, with a domain, HTTPS from Let's Encrypt.
#
#   curl -fsSLO https://raw.githubusercontent.com/Jackpison/Homebase-Hub/main/deploy/vps/install.sh
#   less install.sh                          read it first
#   sudo bash install.sh hub.example.com     with your domain, already pointing at this server (HTTPS included)
#   sudo bash install.sh --lan               no domain: on this server's address, without HTTPS (a home network)
#
# Options:  --email you@example.com   for Let's Encrypt's expiry mails
#           --no-https                with a domain, but no certificate (you add HTTPS yourself)
#           --dir /var/www/homebase-hub   where the site goes
#           --zip site-update-X.Y.Z.zip   a release you downloaded (its .sha256 file next to it) instead of the newest
# It never changes a site that is already there: update that one in Settings > Updates.
set -euo pipefail
REPO=Jackpison/Homebase-Hub
DIR=/var/www/homebase-hub
DOMAIN=''; LAN=0; EMAIL=''; ZIP=''; HTTPS=1

say() { printf '\n== %s\n' "$*"; }
die() { printf 'Homebase Hub install: %s\n' "$*" >&2; exit 1; }
help() { sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'; exit 0; }
need() { [ $# -ge 2 ] && [ -n "$2" ] || die "$1 needs a value"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --lan) LAN=1; HTTPS=0 ;;
    --no-https) HTTPS=0 ;;
    --email) need "$@"; EMAIL=$2; shift ;;
    --dir) need "$@"; DIR=$2; shift ;;
    --zip) need "$@"; ZIP=$2; shift ;;
    -h|--help) help ;;
    -*) die "unknown option $1 (see --help)" ;;
    *) [ -z "$DOMAIN" ] || die "give one domain only"; DOMAIN=$1 ;;
  esac
  shift
done

# ---- check everything before changing anything ----
[ "$(id -u)" = 0 ] || die "run it as root: sudo bash $0 ..."
if [ "$LAN" = 1 ]; then [ -z "$DOMAIN" ] || die "--lan takes no domain"
else [ -n "$DOMAIN" ] || die "give your domain (sudo bash $0 hub.example.com), or --lan for a home network"; fi
[ -z "$DOMAIN" ] || [[ "$DOMAIN" =~ ^([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$ ]] || die "$DOMAIN is not a domain name"
[ -z "$EMAIL" ] || [[ "$EMAIL" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]] || die "$EMAIL is not an email address"
[[ "$DIR" =~ ^/[A-Za-z0-9._/-]+$ && "$DIR" != / && "$DIR" != *..* ]] || die "--dir must be a full path such as /var/www/homebase-hub"
DIR=${DIR%/}
[ -z "$ZIP" ] || { [ -f "$ZIP" ] || die "$ZIP not found"; [ -f "$ZIP.sha256" ] || die "$ZIP.sha256 not found: download it from the same release"; }
# shellcheck source=/dev/null
. /etc/os-release 2>/dev/null || die "cannot tell which Linux this is (no /etc/os-release)"
case " ${ID:-} ${ID_LIKE:-} " in *" debian "*|*" ubuntu "*) ;; *) die "this script is for Ubuntu and Debian; see the Install guide for other systems" ;; esac
command -v apt-get >/dev/null || die "apt-get is missing"
[ ! -f "$DIR/index.php" ] || die "there is already a site in $DIR. Update it in Settings > Updates (this script never replaces a site)"
[ ! -d "$DIR" ] || [ -z "$(ls -A "$DIR")" ] || die "$DIR has files in it. Choose an empty folder with --dir"
if command -v nginx >/dev/null && pgrep -x nginx >/dev/null; then die "nginx is running on this server. Use deploy/nginx/homebase-hub.conf instead (see the Install guide)"; fi

verify() {
  local want have
  want=$(awk '{print tolower($1); exit}' "$ZIP.sha256")
  have=$(sha256sum "$ZIP" | awk '{print $1}')
  [[ "$want" =~ ^[0-9a-f]{64}$ ]] || die "$ZIP.sha256 holds no SHA-256"
  [ "$want" = "$have" ] || die "the zip does not match its published SHA-256: nothing was installed"
  echo "SHA-256 OK"
}
[ -z "$ZIP" ] || verify

export DEBIAN_FRONTEND=noninteractive
apt_install() { apt-get install -y -q -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold "$@" >/dev/null; }

say "Getting the package lists"
apt-get update -q >/dev/null
apt_install ca-certificates curl unzip

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
if [ -z "$ZIP" ]; then
  say "Finding the newest release"
  url=$(curl -fsSLI -o /dev/null -w '%{url_effective}' "https://github.com/$REPO/releases/latest")
  tag=${url##*/}
  [[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "could not find the newest release on github.com/$REPO"
  V=${tag#v}
  echo "Homebase Hub $V"
  curl -fsSL -o "$TMP/site-update-$V.zip" "https://github.com/$REPO/releases/download/$tag/site-update-$V.zip"
  curl -fsSL -o "$TMP/site-update-$V.zip.sha256" "https://github.com/$REPO/releases/download/$tag/site-update-$V.zip.sha256"
  ZIP=$TMP/site-update-$V.zip
  verify
fi
unzip -tq "$ZIP" >/dev/null || die "the zip is damaged"
MIN=$(unzip -p "$ZIP" web/hub/core/lib/boot.php | sed -n "s/^const HUB_MIN_PHP = '\([0-9.]*\)'.*/\1/p")
[[ "$MIN" =~ ^[0-9]+\.[0-9]+$ ]] || die "this zip is not a Homebase Hub release"

newer() { [ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -1)" = "$2" ]; }   # $1 >= $2
cand=$(apt-cache policy php | awk '/Candidate:/{print $2}')
pv=${cand#*:}; pv=${pv%%+*}
[[ "$pv" =~ ^[0-9]+\.[0-9]+$ ]] || die "this system offers no PHP package"
newer "$pv" "$MIN" || die "this system offers PHP $pv, and Homebase Hub needs $MIN or newer. Use Ubuntu 24.04 or Debian 13 (or newer), or Docker"

say "Installing Apache and PHP $pv"
apt_install apache2 libapache2-mod-php php-curl php-gd php-intl php-mbstring php-zip
a2enmod headers rewrite mime deflate >/dev/null
a2enmod brotli >/dev/null 2>&1 || true
PV=$(php -r 'echo PHP_MAJOR_VERSION . "." . PHP_MINOR_VERSION;')
cat > "/etc/php/$PV/apache2/conf.d/90-homebase-hub.ini" <<'INI'
; Homebase Hub (deploy/vps/install.sh)
expose_php = Off
memory_limit = 512M
upload_max_filesize = 512M
post_max_size = 512M
max_execution_time = 300
INI

say "Copying the site into $DIR"
mkdir -p "$DIR"
unzip -q "$ZIP" -d "$DIR"
chown -R www-data:www-data "$DIR"

say "Setting up Apache"
{
  echo '# Homebase Hub (deploy/vps/install.sh). The site'"'"'s own .htaccess files do the protecting: AllowOverride All.'
  echo '<VirtualHost *:80>'
  [ -z "$DOMAIN" ] || echo "  ServerName $DOMAIN"
  echo "  DocumentRoot $DIR"
  echo "  <Directory $DIR>"
  echo '    Options -Indexes +FollowSymLinks'
  echo '    AllowOverride All'
  echo '    Require all granted'
  echo '  </Directory>'
  echo '  # Only when another proxy (Cloudflare Tunnel, a load balancer) sits in front of this Apache: its address.'
  echo '  # SetEnv HUB_TRUSTED_PROXY "10.0.0.5"'
  # shellcheck disable=SC2016
  echo '  ErrorLog ${APACHE_LOG_DIR}/homebase-hub-error.log'
  # shellcheck disable=SC2016
  echo '  CustomLog ${APACHE_LOG_DIR}/homebase-hub-access.log combined'
  echo '</VirtualHost>'
} > /etc/apache2/sites-available/homebase-hub.conf
a2ensite homebase-hub >/dev/null
echo "ServerName ${DOMAIN:-localhost}" > /etc/apache2/conf-available/homebase-hub-servername.conf
a2enconf homebase-hub-servername >/dev/null
[ "$LAN" = 0 ] || a2dissite 000-default >/dev/null 2>&1 || true
apache2ctl configtest >/dev/null 2>&1 || { apache2ctl configtest || true; die "Apache refused the settings (above)"; }
if [ -d /run/systemd/system ]; then systemctl enable apache2 >/dev/null 2>&1 || true; systemctl restart apache2
else service apache2 restart >/dev/null; fi
if command -v ufw >/dev/null && ufw status 2>/dev/null | grep -q '^Status: active'; then ufw allow 'Apache Full' >/dev/null; fi

URL="http://${DOMAIN:-$(hostname -I 2>/dev/null | awk '{print $1}')}"
if [ "$HTTPS" = 1 ]; then
  say "Getting a certificate for $DOMAIN"
  apt_install certbot python3-certbot-apache
  if [ -n "$EMAIL" ]; then mail=(-m "$EMAIL"); else mail=(--register-unsafely-without-email); fi
  if certbot --apache -d "$DOMAIN" --non-interactive --agree-tos --redirect "${mail[@]}"; then URL="https://$DOMAIN"
  else echo "No certificate yet (is $DOMAIN pointing at this server?). The site works without it; try again later with:"
       echo "  sudo certbot --apache -d $DOMAIN"; fi
fi

say "Done"
echo "Open $URL and click the key icon. Then get the setup code with:"
echo "  sudo cat $DIR/site-data/core/SETUP-CODE.php"
echo "Updates: in the site, Settings > Updates."
