<?php
// 1.61: the Tasks calendar link. Off until turned on; one secret key, a new key ends the old one; the feed is valid iCalendar with the task names,
// dates and repeats, never the notes, and paused or done tasks are left out.
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/tasks/lib.php';

t('a new site has the calendar link off, with no key', tasks_cal_state() === ['on' => false, 'key' => '']);
t('with no key nothing opens it', !tasks_cal_ok('') && !tasks_cal_ok(str_repeat('a', 32)));
$c = tasks_cal_set(true);
t('turning it on makes a 32-character key', $c['on'] === true && preg_match('/^[a-f0-9]{32}$/', $c['key']) === 1);
t('the right key opens it', tasks_cal_ok($c['key']));
t('a wrong, short, long or odd key does not', !tasks_cal_ok(substr($c['key'], 0, 31)) && !tasks_cal_ok($c['key'] . 'a') && !tasks_cal_ok(strtoupper($c['key'])) && !tasks_cal_ok(str_repeat('0', 32)) && !tasks_cal_ok($c['key'] . "\n"));
$k1 = $c['key']; $c = tasks_cal_set(null, true);
t('a new link makes a new key and the old one stops', $c['on'] === true && $c['key'] !== $k1 && !tasks_cal_ok($k1) && tasks_cal_ok($c['key']));
$k2 = $c['key']; $c = tasks_cal_set(false);
t('off closes it, and keeps the key so turning it on again gives the same link', $c['on'] === false && !tasks_cal_ok($k2) && tasks_cal_set(true)['key'] === $k2 && tasks_cal_ok($k2));
$raw = (string)file_get_contents(hub_jpath(tasks_cal_file()));
t('the key is kept in a guarded file (a browser gets nothing)', str_starts_with($raw, '<?php') && str_contains($raw, $k2));
file_put_contents(hub_jpath(tasks_cal_file()), "<?php exit; ?>\n" . '{"on":true,"key":"not-a-key"}');
t('a damaged file turns it off', tasks_cal_state() === ['on' => false, 'key' => ''] && !tasks_cal_ok('not-a-key'));

$mk = fn(array $o) => tasks_clean_one($o + ['name' => 'Task', 'due' => '2026-10-16']);
$data = ['tasks' => [
    $mk(['id' => 'aaaaaa1', 'name' => 'Rent, due; "soon"', 'due' => '2026-11-01', 'repeat' => ['n' => 1, 'unit' => 'month'], 'price' => 1200.5, 'cur' => 'USD', 'cat' => 'Home', 'notes' => 'SECRET NOTE TEXT', 'remind' => 3, 'url' => 'https://example.com/pay']),
    $mk(['id' => 'aaaaaa2', 'name' => 'Call the bank', 'due' => '2026-10-20', 'time' => '11:30']),
    $mk(['id' => 'aaaaaa3', 'name' => 'Paused one', 'status' => 'paused']),
    $mk(['id' => 'aaaaaa4', 'name' => 'Done one', 'status' => 'done']),
    $mk(['id' => 'aaaaaa5', 'name' => str_repeat('Ünïcode ', 20), 'due' => '2026-12-31', 'repeat' => ['n' => 2, 'unit' => 'week']]),
], 'log' => [], 'settings' => []];
$ics = tasks_ics($data, 'my.example.com', 'My Site Tasks');
t('the feed is a calendar with CRLF line ends', str_starts_with($ics, "BEGIN:VCALENDAR\r\nVERSION:2.0\r\n") && str_ends_with($ics, "END:VCALENDAR\r\n") && substr_count($ics, "\n") === substr_count($ics, "\r\n"));
t('every active task is an event, paused and done ones are not', substr_count($ics, 'BEGIN:VEVENT') === 3 && !str_contains($ics, 'Paused one') && !str_contains($ics, 'Done one'));
t('a monthly task repeats monthly and says its price, category and link; the name is escaped', str_contains($ics, 'RRULE:FREQ=MONTHLY;INTERVAL=1') && str_contains($ics, 'SUMMARY:Rent\\, due\; "soon"') && str_contains($ics, 'Price: 1200.5 USD') && str_contains($ics, 'Category: Home') && str_contains($ics, 'URL:https://example.com/pay'));
t('the notes never leave the server', !str_contains($ics, 'SECRET NOTE'));
t('a task with a time is a 30-minute event, one without is an all-day event', str_contains($ics, "DTSTART:20261020T113000\r\nDTEND:20261020T120000") && str_contains($ics, "DTSTART;VALUE=DATE:20261101\r\nDTEND;VALUE=DATE:20261102"));
t('a fortnight task repeats every 2 weeks', str_contains($ics, 'RRULE:FREQ=WEEKLY;INTERVAL=2'));
t('a reminder becomes an alarm', str_contains($ics, "TRIGGER:-P3D"));
$long = true; foreach (explode("\r\n", $ics) as $l) if (strlen($l) > 75) $long = false;
t('no line is longer than 75 bytes, and folded lines never split a character', $long && mb_check_encoding(str_replace("\r\n ", '', $ics), 'UTF-8'));
t('the UID names the task and the site', str_contains($ics, 'UID:aaaaaa1@my.example.com'));
t('the calendar has the site name', str_contains($ics, 'X-WR-CALNAME:My Site Tasks'));

$cal = (string)file_get_contents($site . '/web/tasks/calendar.php');
$p404 = strpos($cal, 'http_response_code(404)'); $pread = strpos($cal, 'tasks_read()');
t('calendar.php checks the key and answers 404 before it reads any task', $p404 !== false && $pread !== false && strpos($cal, 'tasks_cal_ok') < $p404 && $p404 < $pread);
