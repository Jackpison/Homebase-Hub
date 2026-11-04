#!/bin/bash
# Homebase Hub for YunoHost: shared by the scripts.

# The newest release into $1, after checking it against its published SHA-256.
hub_download() {
    local dest=$1 tmp url tag v want have
    tmp=$(mktemp -d)
    url=$(curl -fsSLI -o /dev/null -w '%{url_effective}' "https://github.com/Jackpison/Homebase-Hub/releases/latest")
    tag=${url##*/}
    [[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || ynh_die "Could not find the newest release of Homebase Hub on GitHub"
    v=${tag#v}
    curl -fsSL -o "$tmp/hub.zip" "https://github.com/Jackpison/Homebase-Hub/releases/download/$tag/site-update-$v.zip"
    curl -fsSL -o "$tmp/hub.zip.sha256" "https://github.com/Jackpison/Homebase-Hub/releases/download/$tag/site-update-$v.zip.sha256"
    want=$(awk '{print tolower($1); exit}' "$tmp/hub.zip.sha256")
    have=$(sha256sum "$tmp/hub.zip" | awk '{print $1}')
    [[ "$want" =~ ^[0-9a-f]{64}$ && "$want" == "$have" ]] || { rm -rf "$tmp"; ynh_die "The download does not match its published SHA-256: nothing was installed"; }
    unzip -q "$tmp/hub.zip" -d "$dest"
    rm -rf "$tmp"
}

# web/hub/core/config.php: the data lives in YunoHost's data folder for the app, outside the site (updates never touch this file)
hub_config() {
    local f="$install_dir/web/hub/core/config.php"
    [ -f "$f" ] || printf '<?php\ndeclare(strict_types=1);\n// YunoHost: your data is in the app'"'"'s data folder, outside the site\ndefine('"'"'HUB_DATA_DIR'"'"', '"'"'%s'"'"');\n' "$data_dir" > "$f"
}

hub_owners() {
    chown -R "$app:www-data" "$install_dir"
    chmod -R u=rwX,g=rX,o= "$install_dir"
    find "$install_dir" -type d -exec chmod g+s {} +   # files an update adds stay in the www-data group, so nginx can read them
    chown -R "$app:$app" "$data_dir"
    chmod 700 "$data_dir"
}

hub_php_settings() {
    ynh_app_setting_set_default --key=php_upload_max_filesize --value=512M
    ynh_app_setting_set_default --key=php_memory_limit --value=512M
}
