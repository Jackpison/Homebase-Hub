<?php
// 1.79.12: the Notifications list shared by every device (web/hub/core/lib/notelog.php): lines are made safe, a line sent twice is kept once,
// the newest 300 are kept, and clearing empties the list. Runs on its own copy of src/ (run.php).
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/hub/core/lib/boot.php';
require_once $site . '/web/hub/core/lib/notelog.php';

@unlink(hub_jpath(nl_file()));
$now = time() * 1000;
t('N1 an empty list starts empty', nl_list() === []);
$new = nl_add([['id' => 'abc123x', 'm' => 'Link added', 'b' => false, 'k' => 'plus', 's' => 'Links', 'p' => 'Links › Bookmarks', 'ts' => $now]]);
$l = nl_list();
t('N2 a line is kept with its kind, source and browser', $new === 1 && count($l) === 1 && $l[0]['k'] === 'plus' && $l[0]['p'] === 'Links › Bookmarks' && isset($l[0]['dev']), json_encode($l));
t('N3 the same line sent twice is kept once', nl_add([['id' => 'abc123x', 'm' => 'Link added', 'ts' => $now]]) === 0 && count(nl_list()) === 1);
t('N4 a line with no message, a short id or a time that is not milliseconds is refused', nl_add([['id' => 'abc123y', 'm' => '  ', 'ts' => $now], ['id' => 'ab1', 'm' => 'x', 'ts' => $now], ['id' => 'abc123z', 'm' => 'x', 'ts' => 5], 'text', ['id' => 'abc123w', 'm' => 'x', 'ts' => $now * 3]]) === 0);
nl_add([['id' => 'lng0001', 'm' => str_repeat('é', 500), 'k' => '<script>', 's' => str_repeat('s', 99), 'd' => str_repeat('d', 500), 'ts' => $now + 1]]);
$l = nl_list(); $e = end($l);
t('N5 long text is cut, an unknown kind is dropped', mb_strlen($e['m']) === 300 && $e['k'] === '' && mb_strlen($e['s']) === 20 && mb_strlen($e['d']) === 200, json_encode([mb_strlen($e['m']), $e['k']]));
$batch = []; for ($i = 0; $i < 60; $i++) $batch[] = ['id' => 'bt' . str_pad((string)$i, 5, '0', STR_PAD_LEFT), 'm' => 'm' . $i, 'ts' => $now + 10 + $i];
t('N6 at most 50 lines are taken at once', nl_add($batch) === 50);
for ($r = 0; $r < 8; $r++) { $b = []; for ($i = 0; $i < 50; $i++) $b[] = ['id' => 'rb' . $r . str_pad((string)$i, 4, '0', STR_PAD_LEFT), 'm' => 'r' . $r . '-' . $i, 'ts' => $now + 1000 + $r * 100 + $i]; nl_add($b); }
$l = nl_list();
t('N7 only the newest 300 are kept, oldest first', count($l) === NL_KEEP && end($l)['m'] === 'r7-49' && $l[0]['ts'] <= $l[1]['ts'], json_encode(count($l)));
t('N8 clearing empties the list and says how many went', nl_clear() === NL_KEEP && nl_list() === []);
