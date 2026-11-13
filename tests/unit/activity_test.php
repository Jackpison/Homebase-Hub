<?php
// 1.78.0: the activity list (web/hub/core/lib/activity.php) keeps what was done in Settings, not only logins: each line has what, a short detail
// (never a value), and it keeps the newest 300. Runs on its own copy of src/ (run.php).
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/hub/core/lib/boot.php';
require_once $site . '/web/hub/core/lib/activity.php';

t('A1 the list keeps 300 lines', ACT_KEEP === 300);
@unlink(hub_jpath(act_file()));
hub_act('backup', 'downloaded: links, info');
hub_act('settings', 'theme, accent');
hub_act('update', '1.77.5 to 1.78.0');
$ev = hub_jread(act_file()) ?? [];
t('A2 three actions make three lines, oldest first', count($ev) === 3 && $ev[0]['ev'] === 'backup' && $ev[2]['ev'] === 'update', json_encode($ev));
t('A3 a line carries its detail, the address and the browser name', $ev[1]['x'] === 'theme, accent' && isset($ev[1]['ip'], $ev[1]['who'], $ev[1]['t']));
hub_act('Bad Name!', str_repeat('x', 200));
$ev = hub_jread(act_file());
$last = end($ev);
t('A4 the event name is cleaned and the detail is cut to 80 characters', $last['ev'] === 'adame' && mb_strlen($last['x']) === 80, json_encode($last['ev']));
for ($i = 0; $i < 320; $i++) hub_act('settings', 'n' . $i);
$ev = hub_jread(act_file());
t('A5 only the newest 300 are kept', count($ev) === 300 && end($ev)['x'] === 'n319' && $ev[0]['x'] === 'n20');
