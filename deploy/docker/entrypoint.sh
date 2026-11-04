#!/bin/sh
# First start: copy the site into the volume. Later starts leave it alone, so updates made in Settings > Updates stay.
set -eu
SITE=/var/www/html
if [ ! -f "$SITE/index.php" ]; then
  # shellcheck disable=SC2010
  if [ -n "$(ls -A "$SITE" 2>/dev/null | grep -v '^site-data$' || true)" ]; then
    echo "Homebase Hub: $SITE has files but no index.php. Use an empty volume (your data folder site-data may stay)." >&2
    exit 1
  fi
  echo "Homebase Hub: first start, copying the site into $SITE"
  unzip -q -n /usr/src/homebase-hub/site.zip -d "$SITE"
  chown -R www-data:www-data "$SITE"
fi
exec docker-php-entrypoint "$@"
