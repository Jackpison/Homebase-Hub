# Homebase Hub in Docker: PHP 8.4 with Apache, so the site's own .htaccess rules protect it exactly as on a web host.
# The release workflow builds this with that version's site-update zip copied in as site.zip (see README.md here).
# The first start copies the site into /var/www/html, a volume: from then on Settings > Updates and Go Back work
# as on any host, and a newer image never overwrites a site that is already there.
FROM php:8.5.11-apache-trixie@sha256:47e6d8849049375e0d19e81f1b391ed88828d4653e0d1b00822185b66b564e8b

# the PHP extensions Health looks for that the base image does not have: gd (pictures), zip (updates, backups), intl
RUN set -eux; \
    savedAptMark="$(apt-mark showmanual)"; \
    apt-get update; \
    apt-get install -y --no-install-recommends libfreetype-dev libicu-dev libjpeg62-turbo-dev libpng-dev libwebp-dev libzip-dev; \
    docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp; \
    docker-php-ext-install -j"$(nproc)" gd intl zip; \
    # opcache: built into PHP from 8.5 on, an extension to add before that
    php -m | grep -qi '^Zend OPcache$' || docker-php-ext-install opcache; \
    apt-mark auto '.*' > /dev/null; apt-mark manual $savedAptMark; \
    find /usr/local/lib/php/extensions -type f -name '*.so' -exec ldd '{}' ';' \
      | awk '/=>/ { so = $(NF-1); if (index(so, "/usr/local/") == 1) next; gsub("^/(usr/)?", "", so); print so }' \
      | sort -u | xargs -r dpkg-query --search | cut -d: -f1 | sort -u | xargs -rt apt-mark manual; \
    apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false; \
    apt-get install -y --no-install-recommends unzip; \
    rm -rf /var/lib/apt/lists/*; \
    php -m | grep -qi '^gd$'; php -m | grep -qi '^intl$'; php -m | grep -qi '^zip$'; php -m | grep -qi '^Zend OPcache$'

RUN set -eux; \
    cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"; \
    a2enmod headers rewrite mime deflate brotli > /dev/null
COPY php.ini "$PHP_INI_DIR/conf.d/homebase-hub.ini"
COPY apache.conf /etc/apache2/conf-available/homebase-hub.conf
RUN a2enconf homebase-hub > /dev/null && apache2ctl configtest

COPY site.zip /usr/src/homebase-hub/site.zip
COPY entrypoint.sh /usr/local/bin/homebase-entrypoint
RUN chmod 755 /usr/local/bin/homebase-entrypoint && unzip -l /usr/src/homebase-hub/site.zip index.php > /dev/null

LABEL org.opencontainers.image.title="Homebase Hub" \
      org.opencontainers.image.description="A private start page, links, notes, cards, tasks, files and tools for your own server." \
      org.opencontainers.image.source="https://github.com/Jackpison/Homebase-Hub" \
      org.opencontainers.image.licenses="GPL-3.0-only"

VOLUME /var/www/html
EXPOSE 80
HEALTHCHECK --interval=1m --timeout=10s --start-period=20s \
  CMD php -r 'exit(@file_get_contents("http://127.0.0.1/web/hub/core/assets/speculation-rules.json") === false ? 1 : 0);'
ENTRYPOINT ["homebase-entrypoint"]
CMD ["apache2-foreground"]
