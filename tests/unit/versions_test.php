<?php
// Earlier versions: a new copy never overwrites one made in the same second (hub_version_path, used by version_restore and Links).
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/core-data/lib/boot.php';

$d = sys_get_temp_dir() . '/hub-ver-' . bin2hex(random_bytes(4)); mkdir($d);
$now = strtotime('2026-10-24 09:07:02 UTC');
$stamp = date('Ymd-His', $now);
$p1 = hub_version_path($d, '', $now);
t('a free second gives the plain name', $p1 === "$d/$stamp.php", $p1);
file_put_contents($p1, 'first');
$p2 = hub_version_path($d, '', $now);
t('a taken name gets -2', $p2 === "$d/$stamp-2.php", $p2);
file_put_contents($p2, 'second');
t('then -3', hub_version_path($d, '', $now) === "$d/$stamp-3.php");
t('the Links prefix is kept', hub_version_path($d, 'bookmarks-', $now) === "$d/bookmarks-$stamp.php");
t('the names still match what version_restore accepts', preg_match('/^[0-9-]+\.php$/', basename($p2)) === 1 && preg_match('/^bookmarks-[0-9-]+\.php$/', 'bookmarks-' . basename($p2)) === 1);
t('nothing was overwritten', file_get_contents($p1) === 'first' && file_get_contents($p2) === 'second');
array_map('unlink', glob("$d/*")); rmdir($d);

// The bug this fixes: restoring a version made in the same second used to overwrite that version first, then "restore" the current data.
$api = file_get_contents($site . '/web/core-data/api.php');
t('version_restore keeps the current data under a free name', strpos($api, "hub_version_path(\$dir, \$app === 'links' ? 'bookmarks-' : '')") !== false && strpos($api, "'bookmarks-' . date('Ymd-His') . '.php' : date('Ymd-His')") === false);
