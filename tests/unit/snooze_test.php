<?php
// Telegram snooze: the buttons, /snooze, the digest and the "Due Now" card. Telegram itself is replaced by telegram_stub.php.
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
define('NT_TEST_API', 'http://127.0.0.1:' . getenv('NT_STUB_PORT'));
require $site . '/web/core-data/lib/notify.php';
require_once HUB_WEB . '/tasks/lib.php';

$log = getenv('NT_STUB_LOG');
function calls(): array { global $log; return array_map(function ($l) { return json_decode($l, true); }, array_filter(explode("\n", (string)@file_get_contents($log)))); }
function sent_text(int $from): string { return implode("\n", array_map(function ($c) { return (string)($c['p']['text'] ?? ''); }, array_slice(calls(), $from))); }

nt_update(function (&$d) { $d['on'] = true; $d['token'] = '123456789:' . str_repeat('a', 35); $d['chat'] = '42'; $d['hour'] = 0; $d['tasks'] = true; $d['timed'] = true; $d['backup'] = false; });
$today = date('Y-m-d');
tasks_modify(function (&$data) use ($today) {
    $data['tasks'][] = ['id' => 'aaaaaa01', 'name' => 'Netflix', 'due' => $today, 'time' => '00:00', 'status' => 'active'];
    $data['tasks'][] = ['id' => 'bbbbbb02', 'name' => 'Rent', 'due' => $today, 'status' => 'active'];
    $data['tasks'][] = ['id' => 'cccccc03', 'name' => 'Netflix Kids', 'due' => $today, 'status' => 'active'];
    return true;
});
$d = nt_load();

// how long a snooze lasts
$u = nt_snooze_until($d, '1h'); t('1 Hour ends in about an hour', abs($u - (time() + 3600)) < 5);
$u = nt_snooze_until($d, '3h'); t('3 Hours ends in about three hours', abs($u - (time() + 10800)) < 5);
$u = nt_snooze_until($d, 'tm'); t('Tomorrow ends tomorrow at the digest hour', date('Y-m-d', $u) === date('Y-m-d', strtotime('tomorrow')) && date('G', $u) === '0');
t('a number of seconds is held between 5 minutes and 7 days', nt_snooze_until($d, 1) >= time() + 299 && nt_snooze_until($d, 99999999) <= time() + 7 * 86400 + 1);

// the buttons under a "Due Now" card
$kb = nt_task_buttons(nt_due_lists_now()[3][0])['inline_keyboard'];
$snz = array_filter(array_merge(...$kb), function ($b) { return strpos($b['callback_data'], 'tz:') === 0; });
t('the card has three Snooze buttons', count($snz) === 3);
t('every button fits Telegram\'s 64-byte limit and the bot\'s pattern', !array_filter($snz, function ($b) { return strlen($b['callback_data']) > 64 || !preg_match('/^tz:([a-z0-9]{6,16}):(\d{4}-\d{2}-\d{2}):(1h|3h|tm)$/', $b['callback_data']); }));

// pressing a button
$cb = function (string $data, string $chat = '42') { return ['callback_query' => ['id' => 'q1', 'data' => $data, 'message' => ['message_id' => 7, 'text' => 'Due Now', 'chat' => ['id' => $chat]]]]; };
$n = count(calls());
nt_handle_update($cb('tz:aaaaaa01:' . $today . ':1h', '999'));
t('a button from another chat is ignored', !nt_snoozed(nt_load(), 'aaaaaa01') && count(calls()) === $n);
nt_handle_update($cb('tz:aaaaaa01:' . $today . ':1h'));
t('the 1 Hour button snoozes the task', nt_snoozed(nt_load(), 'aaaaaa01'));
t('the bot answers the button and says what it did', strpos(sent_text($n), 'Snoozed: Netflix') !== false && in_array('answerCallbackQuery', array_column(array_slice(calls(), $n), 'method'), true));
$n = count(calls());
nt_handle_update($cb('tz:zzzzzz99:' . $today . ':1h'));
t('a task that is gone is not snoozed', !isset(nt_load()['snooze']['zzzzzz99']) && strpos(sent_text($n), 'no longer exists') !== false);

// a snoozed task stays out of the daily digest, the others stay in
nt_update(function (&$x) { $x['sent'] = []; });
$n = count(calls());
nt_run();
$txt = sent_text($n);
t('the digest still lists the tasks that are not snoozed', strpos($txt, 'Rent') !== false);
t('the digest leaves the snoozed task out (Netflix Kids is a different task and stays)', strpos($txt, '<b>Netflix</b>') === false && strpos($txt, '<b>Netflix Kids</b>') !== false);
t('no "Due Now" card is sent while it is snoozed', strpos($txt, 'Due Now') === false);

// when the snooze runs out the card comes once more
nt_update(function (&$x) { $x['snooze']['aaaaaa01']['until'] = time() - 5; $x['sent'] = []; });
$k = 't|aaaaaa01|' . $today . '|00:00';
nt_update(function (&$x) use ($k) { $x['sent'][$k] = time() - 3600; });   // the card was sent before the snooze
$n = count(calls());
nt_run();
t('after the snooze the "Due Now" card comes again', strpos(sent_text($n), 'Due Now') !== false && strpos(sent_text($n), 'Netflix') !== false);
t('and the snooze is cleared', !isset(nt_load()['snooze']['aaaaaa01']));
$n = count(calls());
nt_update(function (&$x) { $x['sent'] = array_filter($x['sent'], function ($v, $key) { return strpos($key, 't|') === 0; }, ARRAY_FILTER_USE_BOTH); });
nt_run();
t('it does not come a third time', strpos(sent_text($n), 'Due Now') === false);

// /snooze
$msg = function (string $text) { return ['message' => ['text' => $text, 'chat' => ['id' => '42']]]; };
nt_update(function (&$x) { $x['snooze'] = []; });
$n = count(calls()); nt_handle_update($msg('/snooze Rent 2h'));
$s = nt_load()['snooze']['bbbbbb02'] ?? null;
t('/snooze Rent 2h holds Rent for two hours', $s && abs($s['until'] - (time() + 7200)) < 5 && $s['due'] === $today);
t('and tells you until when', strpos(sent_text($n), 'Snoozed: Rent until') !== false);
nt_handle_update($msg('/snooze Rent 30 minutes'));
t('minutes are understood', abs(nt_load()['snooze']['bbbbbb02']['until'] - (time() + 1800)) < 5);
nt_handle_update($msg('/snooze Rent 1d'));
t('days are understood', abs(nt_load()['snooze']['bbbbbb02']['until'] - (time() + 86400)) < 5);
nt_handle_update($msg('/snooze Rent tomorrow'));
t('"tomorrow" is understood', date('Y-m-d', nt_load()['snooze']['bbbbbb02']['until']) === date('Y-m-d', strtotime('tomorrow')));
nt_update(function (&$x) { $x['snooze'] = []; });
nt_handle_update($msg('/snooze Rent'));
t('without a time it is one hour', abs(nt_load()['snooze']['bbbbbb02']['until'] - (time() + 3600)) < 5);
$n = count(calls()); nt_handle_update($msg('/snooze Netflix 1h'));
t('two tasks match: asks for a more exact name, snoozes nothing', strpos(sent_text($n), 'Several tasks match') !== false && !isset(nt_load()['snooze']['aaaaaa01']));
$n = count(calls()); nt_handle_update($msg('/snooze Nothing 1h'));
t('no match is said plainly', strpos(sent_text($n), 'No active task matches') !== false);
$n = count(calls()); nt_handle_update($msg('/snooze'));
t('no name asks which task', strpos(sent_text($n), 'Which task?') !== false);
$n = count(calls()); nt_handle_update($msg('/snooze Rent 1h <b>'));
t('what you typed is never sent back as markup', strpos(sent_text($n), '<b>') === false && strpos(sent_text($n), '&lt;b&gt;') !== false);

// old snoozes are forgotten
nt_update(function (&$x) use ($today) { $x['snooze']['oldold01'] = ['until' => time() - 5 * 86400, 'due' => $today]; });
nt_run();
t('a snooze that ran out days ago is cleaned up', !isset(nt_load()['snooze']['oldold01']));
