<?php
// Telegram: login alerts, the bot's commands (/help, /add, /today, /done, /status, /backup), backup files, and that names and
// site names can never break a message (Telegram's HTML mode refuses a stray < or &). Telegram itself is telegram_stub.php.
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
define('NT_TEST_API', 'http://127.0.0.1:' . getenv('NT_STUB_PORT'));
require $site . '/web/core-data/lib/notify.php';
require_once HUB_WEB . '/tasks/lib.php';

$log = getenv('NT_STUB_LOG');
function calls(): array { global $log; return array_map(function ($l) { return json_decode($l, true); }, array_filter(explode("\n", (string)@file_get_contents($log)))); }
function since(int $n): array { return array_slice(calls(), $n); }
function said(int $n): string { return implode("\n", array_map(function ($c) { return (string)($c['p']['text'] ?? $c['p']['caption'] ?? ''); }, since($n))); }
/** Telegram's HTML mode accepts only these tags, and every other < or & must be escaped. */
function html_ok(string $m): bool { return !preg_match('~<(?!/?(b|i|a|u|s|code|pre)\b)~', $m) && !preg_match('/&(?!(amp|lt|gt|quot|#\d+);)/', $m); }
$msg = function (string $text, string $chat = '42') { return ['message' => ['message_id' => 1, 'text' => $text, 'chat' => ['id' => $chat]]]; };

$token = '123456789:' . str_repeat('A', 35);
t('a real token shape is accepted', nt_token_ok($token) && nt_token_ok('12345:' . str_repeat('x_-', 11)));
t('a wrong token is refused before any request', !nt_token_ok('') && !nt_token_ok('abc:def') && !nt_token_ok('123:' . str_repeat('a', 35)) && nt_tg('bad', 'getMe')['ok'] === false);
$hint = nt_token_hint($token);
t('the saved token is shown only as a hint (bot number and last 4)', $hint === '123456789:…AAAA' && strpos($hint, str_repeat('A', 10)) === false, $hint);

t('devices: Safari on iPhone', nt_device('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1') === 'Safari on iPhone');
t('devices: Edge on Windows', nt_device('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36 Edg/140.0') === 'Edge on Windows');
t('devices: Chrome on Android', nt_device('Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36') === 'Chrome on Android');
t('devices: a script, and nothing at all', nt_device('curl/8.5.0') === 'A script or bot' && nt_device('') === 'Unknown device');

hub_settings_update(function ($s) { $s['siteName'] = 'Tom & Jerry <Hub>'; return $s; });
t('the site name loses any markup when saved (so it can never reach a message)', hub_settings()['siteName'] === 'Tom & Jerry', hub_settings()['siteName']);
nt_update(function (&$d) use ($token) { $d['on'] = true; $d['token'] = $token; $d['chat'] = '42'; $d['hour'] = 0; $d['tasks'] = true; $d['timed'] = true; $d['backup'] = false; $d['login'] = false; });

// login alerts
$ctx = ['what' => 'login', 'extra' => '', 'time' => time(), 'ip' => '203.0.113.9', 'country' => 'IN', 'ua' => 'curl/8.5.0'];
$n = count(calls()); nt_security($ctx);
t('login alerts off: nothing is sent', count(calls()) === $n);
nt_update(function (&$d) { $d['login'] = true; });
$n = count(calls()); nt_security($ctx); $m = said($n);
t('a login alert names what happened, the address, the country and the device', strpos($m, 'New Login') !== false && strpos($m, '203.0.113.9 (IN)') !== false && strpos($m, 'A script or bot') !== false, $m);
t('...and says what to do if it was not you', strpos($m, 'Not you?') !== false);
t('...and the & in the site name is escaped (Tom &amp; Jerry)', strpos($m, 'Tom &amp; Jerry') !== false && html_ok($m), $m);
$n = count(calls()); nt_security(['what' => 'locked'] + $ctx); $m = said($n);
t('paused logins get their own advice (turn on two-step login)', strpos($m, 'Logins Paused') !== false && strpos($m, 'two-step login') !== false && strpos($m, 'Not you?') === false);
$n = count(calls()); nt_security(['what' => 'restore', 'extra' => '<script>x</script>'] + $ctx); $m = said($n);
t('a restore alert shows its detail as text, never as markup', strpos($m, '&lt;script&gt;') !== false && html_ok($m), $m);

// the bot
$n = count(calls()); nt_handle_update($msg('/help', '999'));
t('a message from another chat gets no answer', count(calls()) === $n);
nt_handle_update($msg('/help')); $m = said($n);
t('/help lists the commands', strpos($m, '/today') !== false && strpos($m, '/add') !== false && strpos($m, '/backup') !== false && html_ok($m));
$n = count(calls()); nt_handle_update($msg('hello there'));
t('anything else gets a pointer to /help', strpos(said($n), 'Send /help') !== false);
$n = count(calls()); nt_handle_update($msg('/start@MyHubBot'));
t('a command with the bot name after it (/start@MyHubBot) works', strpos(said($n), 'What I Can Do') !== false);

$n = count(calls()); nt_handle_update($msg('/add'));
t('/add with nothing explains with examples', strpos(said($n), '/add Netflix 649 monthly 5 Nov') !== false);
$n = count(calls()); nt_handle_update($msg('/add Netflix 649 monthly tomorrow'));
$added = array_values(array_filter(tasks_read()['tasks'], function ($t) { return $t['name'] === 'Netflix'; }));
t('/add saves the task with its price, repeat and date', count($added) === 1 && $added[0]['price'] === 649.0 && $added[0]['repeat']['unit'] === 'month' && $added[0]['due'] === date('Y-m-d', strtotime('tomorrow')), json_encode($added));
t('...and says so', strpos(said($n), 'Added: Netflix') !== false && strpos(said($n), '₹649') !== false);
$n = count(calls()); nt_handle_update($msg('/add <b>Rent</b> & bills 15000 today'));
$m = said($n);
t('a task name with < and & is saved as typed and shown escaped', strpos($m, '&lt;b&gt;Rent&lt;/b&gt; &amp; bills') !== false && html_ok($m), $m);

$n = count(calls()); nt_handle_update($msg('/today')); $c = since($n); $m = said($n);
t('/today lists what is due today, escaped', strpos($m, 'Overdue and Today') !== false && strpos($m, '&lt;b&gt;Rent') !== false && strpos($m, 'Netflix') === false && html_ok($m), $m);
$btn = $c[0]['p']['reply_markup']['inline_keyboard'][0][0] ?? [];
t('...with a Done button for each task, in the bot\'s own pattern', preg_match('/^td:[a-z0-9]{6,16}:\d{4}-\d{2}-\d{2}$/', $btn['callback_data'] ?? '') === 1, json_encode($btn));
$n = count(calls()); nt_handle_update($msg('/week'));
t('/week also shows tomorrow\'s Netflix', strpos(said($n), 'Netflix') !== false && strpos(said($n), 'Tomorrow') !== false);

$n = count(calls()); nt_handle_update($msg('/done nothing-like-this'));
t('/done with no match says so', strpos(said($n), 'No active task matches') !== false);
tasks_modify(function (&$data) { $data['tasks'][] = ['id' => 'nnnnnn02', 'name' => 'Netflix Kids', 'due' => date('Y-m-d'), 'status' => 'active']; return true; });
$n = count(calls()); nt_handle_update($msg('/done netflix'));
t('/done with two matches asks you to be more exact', strpos(said($n), 'Several tasks match') !== false);
$n = count(calls()); nt_handle_update($msg('/done Netflix Kids'));
t('/done with one match marks it done', strpos(said($n), 'Done: Netflix Kids') !== false && !array_filter(tasks_read()['tasks'], function ($t) { return $t['name'] === 'Netflix Kids' && $t['status'] === 'active'; }));

$n = count(calls()); nt_handle_update($msg('/status')); $m = said($n);
t('/status shows the version, backups and tasks', strpos($m, 'Version ' . HUB) !== false && strpos($m, 'Last full backup') !== false && strpos($m, 'due today') !== false && html_ok($m), $m);

// the digest
$m = nt_digest(nt_load(), true);
t('the daily list has the site name (escaped), the sections and a total', $m !== null && strpos($m, 'Tom &amp; Jerry') !== false && strpos($m, 'Due Today') !== false && strpos($m, 'Total:') !== false && html_ok($m), (string)$m);

// a backup file
hub_settings_update(function ($s) { $s['backupLast'] = 0; return $s; });
$n = count(calls()); nt_handle_update($msg('/backup')); $c = array_values(array_filter(since($n), function ($x) { return $x['method'] === 'sendDocument'; }));
$doc = $c[0]['p']['document'] ?? [];
t('/backup sends one file to the chat', count($c) === 1 && ($c[0]['p']['chat_id'] ?? '') === '42' && preg_match('/^tom-jerry-backup-\d{4}-\d{2}-\d{2}-\d{6}\.json$/', $doc['name'] ?? '') === 1, json_encode($c));
t('...it is the site backup (JSON), and the caption says it is not encrypted', strpos($doc['head'] ?? '', '{') === 0 && strpos($c[0]['p']['caption'] ?? '', 'Not encrypted') !== false && html_ok($c[0]['p']['caption'] ?? ''));
t('...and counts as the full backup (the Backup icon turns green)', (int)hub_settings()['backupLast'] >= time() - 60 && nt_load()['bkError'] === '');
t('no temporary file is left behind', !glob(hub_dir('core') . '/tg-*.tmp'));
