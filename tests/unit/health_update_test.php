<?php
// 1.78.2: the domain and uptime watch is gone. The optional update address keeps working from its own file (update-check.json),
// takes over the address an older version kept in watch.json, and backups no longer carry a "watch" part. Runs on its own copy of src/ (run.php).
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/hub/core/lib/boot.php';
require_once $site . '/web/hub/core/lib/health.php';
require_once $site . '/web/hub/core/lib/backup.php';

t('W1 the watch code is gone', !is_file($site . '/web/hub/core/lib/watch.php') && !function_exists('wt_load'));
t('W2 a full backup has no watch part', !in_array('watch', BK_PARTS, true) && !array_key_exists('watch', bk_export(array_fill_keys(BK_PARTS, true))));

$core = hub_dir('core');
@unlink(hub_jpath(health_upd_file())); @unlink(hub_jpath("$core/watch.json"));
hub_jput("$core/watch.json", json_encode(['sites' => [['host' => 'example.com']], 'updateUrl' => 'https://example.com/version.json', 'update' => []]));
$d = health_upd_load();
t('W3 the update address is taken over from the old watch file', $d['updateUrl'] === 'https://example.com/version.json', json_encode($d));
t('W4 ...and the old file is deleted, the new one exists', !is_file(hub_jpath("$core/watch.json")) && is_file(hub_jpath(health_upd_file())));
t('W5 the next read keeps the address', health_upd_load()['updateUrl'] === 'https://example.com/version.json');

$r = health_check_update('http://example.com/version.json');
t('W6 an address that is not https is refused and the saved one stays', !empty($r['err']) && health_upd_load()['updateUrl'] === 'https://example.com/version.json', json_encode($r));
$r = health_check_update('');
t('W7 an empty address turns the check off', ($r['url'] ?? 'x') === '' && health_upd_load()['updateUrl'] === '', json_encode($r));

// a backup file from 1.78.1 or before still has a "watch" part: restoring ignores it and does not fail
$done = bk_import(['watch' => ['sites' => [['host' => 'example.com']], 'tasks' => [], 'updateUrl' => '']], ['watch' => true], 'replace');
t('W8 an old backup\'s watch part is ignored on restore', is_array($done) && !is_file(hub_jpath("$core/watch.json")), json_encode($done));
