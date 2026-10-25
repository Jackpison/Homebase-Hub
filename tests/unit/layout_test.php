<?php
// The two layouts (up to 1.49: web/core-data, web/docs; from 1.50: web/hub/core, web/hub/media, web/hub/docs).
// The updater reads both, so a site can move either way (an update, or Go Back); the first request afterwards moves your pictures,
// config.php and the old fallback data folder to where the running version looks for them. Works on either layout's copy of src/.
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
$core = is_dir($site . '/web/hub/core') ? 'web/hub/core' : 'web/core-data';
require $site . '/' . $core . '/lib/boot.php';
require_once $site . '/' . $core . '/lib/update.php';

// names inside an update zip: both layouts' engine files are accepted, your own files never
foreach (['web/core-data/api.php', 'web/core-data/lib/boot.php', 'web/hub/core/api.php', 'web/hub/core/cron.php', 'web/hub/core/lib/update.php', 'web/links/api.php', 'index.php',
          'web/hub/core/assets/shell.js', 'web/hub/docs/CHANGELOG.md', 'web/hub/media/.htaccess', 'web/core-data/media/.htaccess'] as $n)
    t("an update may carry $n", up_name_problem($n, false) === '', up_name_problem($n, false));
foreach (['web/hub/media/brand/logo-1.png' => 'pictures', 'web/core-data/media/home/photos/a.jpg' => 'pictures', 'web/hub/core/config.php' => 'configuration',
          'web/core-data/config.php' => 'configuration', 'web/hub/core/assets/x.php' => 'PHP', 'web/hub/x/y/z.php' => 'PHP', 'web/hub/media/x.php' => 'pictures'] as $n => $why)
    t("an update may not carry $n ($why)", stripos(up_name_problem($n, false), $why) !== false, up_name_problem($n, false));
foreach (['web/hub/media/home/photos/a.jpg', 'web/core-data/media/brand/logo-1.png', 'web/hub/core/config.php', 'web/core-data/config.php', 'web/hub/core/data/x.php', 'web/core-data/data/x.php'] as $p)
    t("$p is never written, listed or removed", up_protected($p));
t('the shipped .htaccess in either media folder is the site\'s own', !up_protected('web/hub/media/.htaccess') && !up_protected('web/core-data/media/.htaccess'));
t('both file lists are recognised', up_is_manifest('web/core-data/manifest.json') && up_is_manifest('web/hub/core/manifest.json') && !up_is_manifest('web/hub/manifest.json'));

// which layout a folder has
$t = sys_get_temp_dir() . '/hub-layout-' . bin2hex(random_bytes(3)); @mkdir("$t/a/web/core-data", 0755, true); @mkdir("$t/b/web/hub/core", 0755, true);
file_put_contents("$t/a/web/core-data/manifest.json", json_encode(['version' => '1.49.0', 'files' => []]));
file_put_contents("$t/b/web/hub/core/manifest.json", json_encode(['version' => '1.50.0', 'files' => []]));
t('a folder with web/core-data/manifest.json has the old layout', up_core_of("$t/a") === 'web/core-data' && (up_manifest("$t/a")['version'] ?? '') === '1.49.0');
t('a folder with web/hub/core/manifest.json has the new layout', up_core_of("$t/b") === 'web/hub/core' && (up_manifest("$t/b")['version'] ?? '') === '1.50.0');
@mkdir("$t/b/web/core-data", 0755, true); file_put_contents("$t/b/web/core-data/manifest.json", json_encode(['version' => '1.49.0', 'files' => []]));
t('while both lists are there (half-way through a move), the new one is read', up_core_of("$t/b") === 'web/hub/core');

// the site's address from a script's address, in either layout
t('the site path from /x/web/core-data/api.php is /x', hub_site_path('/x/web/core-data/api.php') === '/x');
t('the site path from /x/web/hub/core/api.php is /x', hub_site_path('/x/web/hub/core/api.php') === '/x');
t('the site path from /web/links/api.php is ""', hub_site_path('/web/links/api.php') === '');

// the logo is read from any earlier address and stored where this version keeps pictures
$here = HUB_LAYOUT_HERE['media'];
foreach (['web/core-data/media/brand/logo-ab12.png', 'web/hub/media/brand/logo-ab12.png', 'core/media/brand/logo-ab12.png'] as $l)
    t("a logo saved as $l is kept, at $here/brand", hub_clean_settings(['logo' => $l])['logo'] === $here . '/brand/logo-ab12.png', hub_clean_settings(['logo' => $l])['logo']);

// your files follow the layout: put some where the OTHER layout keeps them, then settle
$pub = HUB_PUBLIC; $o = HUB_LAYOUT_OTHER;
@mkdir("$pub/{$o['media']}/brand", 0755, true); @mkdir("$pub/{$o['media']}/home/photos", 0755, true);
file_put_contents("$pub/{$o['media']}/brand/logo-ab12.png", 'logo'); file_put_contents("$pub/{$o['media']}/home/photos/p1.jpg", 'photo');
file_put_contents("$pub/{$o['media']}/.htaccess", 'old rules');
@mkdir(dirname("$pub/{$o['config']}"), 0755, true); file_put_contents("$pub/{$o['config']}", "<?php // mine\n");
@mkdir("$pub/$here/brand", 0755, true); file_put_contents("$pub/$here/brand/logo-keep.png", 'other logo');
if (!is_file("$pub/$here/.htaccess")) file_put_contents("$pub/$here/.htaccess", 'shipped rules');
$shipped = (string)file_get_contents("$pub/$here/.htaccess");
hub_settle_layout();
t('the logo moved to this version\'s media folder', (string)@file_get_contents("$pub/$here/brand/logo-ab12.png") === 'logo');
t('a Home photo moved too, folders and all', (string)@file_get_contents("$pub/$here/home/photos/p1.jpg") === 'photo');
t('a picture already there stays as it was', (string)@file_get_contents("$pub/$here/brand/logo-keep.png") === 'other logo');
t('the .htaccess this version ships wins over the moved one', (string)@file_get_contents("$pub/$here/.htaccess") === $shipped);
t('config.php moved', is_file($pub . '/' . HUB_LAYOUT_HERE['config']) && !is_file("$pub/{$o['config']}"));
t('the other layout\'s media folder is gone (it was left empty)', !is_dir("$pub/{$o['media']}"));
hub_settle_layout();
t('running it again changes nothing', (string)@file_get_contents("$pub/$here/brand/logo-ab12.png") === 'logo');
@unlink($pub . '/' . HUB_LAYOUT_HERE['config']);
