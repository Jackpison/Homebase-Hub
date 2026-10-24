<?php
// Links keeps an earlier version before a save every 10 minutes, and always when the save asks for it (Import Bookmarks).
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/core-data/lib/boot.php';
$now = 2000000000;
t('no version yet: one is kept', hub_links_keep_due(null, false, 600, $now));
t('the last one is 5 minutes old: none for an ordinary save', !hub_links_keep_due($now - 300, false, 600, $now));
t('the last one is 10 minutes old: one is kept', hub_links_keep_due($now - 600, false, 600, $now));
t('a save that asks for it (keep) always gets one, even 1 second after the last', hub_links_keep_due($now - 1, true, 600, $now));
$api = file_get_contents($site . '/web/links/api.php');
t('the save action passes "keep" on', strpos($api, "write_data(\$data, !empty(\$b['keep']))") !== false);
