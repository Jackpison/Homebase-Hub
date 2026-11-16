<?php
// 1.79.12: the Notifications list shared by every device (web/hub/core/lib/notelog.php): lines are made safe, a line sent twice is kept once,
// the last 30 days are kept, and clearing empties the list. Runs on its own copy of src/ (run.php).
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
t('N7 every line of the last 30 days is kept (about 450 here), oldest first', count($l) > 300 && count($l) <= NL_KEEP && end($l)['m'] === 'r7-49' && $l[0]['ts'] <= $l[1]['ts'], json_encode(count($l)));
t('N7b alerts from Files and Cards are never kept on the site (they can name locked things)', nl_add([['id' => 'fl00001', 'm' => 'Moved: secret.pdf', 's' => 'Files', 'ts' => $now + 5000], ['id' => 'cd00001', 'm' => 'Card added: Bank', 's' => 'Cards', 'ts' => $now + 5000]]) === 0);
$cnt = count(nl_list());
t('N8 clearing empties the list and says how many went', nl_clear() === $cnt && nl_list() === []);
nl_add([['id' => 'old0001', 'm' => 'Old line', 'ts' => (time() - 40 * 86400) * 1000], ['id' => 'new0001', 'm' => 'New line', 'ts' => $now]]);
nl_add([['id' => 'new0002', 'm' => 'Newer line', 'ts' => $now + 1]]);
t('N9 (1.80.6) a line older than 30 days is dropped when the list is next saved', array_column(nl_list(), 'm') === ['New line', 'Newer line'], json_encode(array_column(nl_list(), 'm')));

// ---- 1.80.8: Clear Older Than ----
nl_clear();
nl_add([['id' => 'pr00001', 'm' => 'Two days old', 'ts' => $now - 2 * 86400 * 1000], ['id' => 'pr00002', 'm' => 'Ten days old', 'ts' => $now - 10 * 86400 * 1000], ['id' => 'pr00003', 'm' => 'Just now', 'ts' => $now]]);
t('N10 three lines of different ages are kept', count(nl_list()) === 3);
t('N11 nl_prune removes only the lines older than the time and says how many', nl_prune($now - 5 * 86400 * 1000) === 1 && array_column(nl_list(), 'm') === ['Two days old', 'Just now'], json_encode(array_column(nl_list(), 'm')));
t('N12 nl_prune with nothing that old removes nothing', nl_prune($now - 30 * 86400 * 1000) === 0 && count(nl_list()) === 2);

