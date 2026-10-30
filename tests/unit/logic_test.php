<?php
// Small pieces of logic that the browser tests only reach indirectly: /add parsing, money, dates, update file names, backup encryption.
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/hub/core/lib/notify.php';
require_once $site . '/web/hub/core/lib/update.php';
require_once $site . '/web/hub/core/lib/backup.php';
require_once HUB_WEB . '/tasks/lib.php';

// /add in Telegram
$p = nt_parse_add('Netflix 649 monthly 5 Nov 9pm');
t('/add: name, price, repeat, time and date', $p && $p['name'] === 'Netflix' && $p['price'] === 649.0 && $p['repeat'] === ['n' => 1, 'unit' => 'month'] && $p['time'] === '21:00' && substr($p['due'], 5) === '11-05', json_encode($p));
t('/add: a date is never read as a price (15 Nov)', ($p = nt_parse_add('Pay tax 15 Nov')) && $p['price'] === null && substr($p['due'], 5) === '11-15' && $p['name'] === 'Pay tax', json_encode($p));
$p = nt_parse_add('Call bank tomorrow 11am');
t('/add: tomorrow and 11am', $p && $p['due'] === date('Y-m-d', strtotime('tomorrow')) && $p['time'] === '11:00' && $p['price'] === null && $p['name'] === 'Call bank', json_encode($p));
$p = nt_parse_add('Car insurance 18500 yearly 10 Oct 2027');
t('/add: a full date and a yearly repeat', $p && $p['due'] === '2027-10-10' && $p['price'] === 18500.0 && $p['repeat']['unit'] === 'year', json_encode($p));
$p = nt_parse_add('Gym $12.50 every 2 weeks');
t('/add: dollars and "every 2 weeks"', $p && $p['cur'] === 'USD' && $p['price'] === 12.5 && $p['repeat'] === ['n' => 2, 'unit' => 'week'], json_encode($p));
t('/add: nothing to add gives null', nt_parse_add('   ') === null);

// money
t('rupees use Indian grouping', nt_money(1234567.5, 'INR') === '₹12,34,567.50' && nt_money(649.0, 'INR') === '₹649');
t('dollars use thousands', nt_money(1234567.5, 'USD') === '$1,234,567.50');
t('no price is empty text', nt_money(null, 'INR') === '');

// repeating dates
$m = ['repeat' => ['n' => 1, 'unit' => 'month'], 'due' => '2026-01-31'];
t('monthly from the 31st lands on the last day of February', tasks_next_date($m) === '2026-02-28');
t('and goes back to the 31st when the task remembers its day', tasks_next_date(['repeat' => ['n' => 1, 'unit' => 'month'], 'due' => '2026-02-28', 'day' => 31]) === '2026-03-31');
t('yearly from 29 February lands on 28 February', tasks_next_date(['repeat' => ['n' => 1, 'unit' => 'year'], 'due' => '2028-02-29']) === '2029-02-28');
t('every 2 weeks adds 14 days', tasks_next_date(['repeat' => ['n' => 2, 'unit' => 'week'], 'due' => '2026-03-01']) === '2026-03-15');

// completing tasks
$data = tasks_clean(['tasks' => [
    ['id' => 'rep00001', 'name' => 'Rent', 'due' => '2026-05-01', 'repeat' => ['n' => 1, 'unit' => 'month'], 'status' => 'active'],
    ['id' => 'one00002', 'name' => 'Passport', 'due' => '2026-05-02', 'status' => 'active']]]);
$r = tasks_complete($data, 'rep00001', '2026-05-01');
t('a repeating task moves to its next date', strpos($r, 'next:2026-06-01') === 0, $r);
t('the same date cannot be completed twice', tasks_complete($data, 'rep00001', '2026-05-01') === 'already');
$r = tasks_complete($data, 'one00002', '2026-05-02');
$one = array_values(array_filter($data['tasks'], function ($x) { return $x['id'] === 'one00002'; }))[0];
t('a one-time task becomes done', $one['status'] === 'done' && $r !== '' && $r !== 'already', $r);
t('every completion is written to the log', count($data['log']) === 2);
t('a task that does not exist answers with nothing', tasks_complete($data, 'nope0000', '') === '');

// the Favicon helpers
t('a website name is cleaned', hub_icon_domain(' Example.COM ') === 'example.com');
t('IP addresses, single names and odd names are refused', !hub_icon_domain('127.0.0.1') && !hub_icon_domain('localhost') && !hub_icon_domain('a..b.com') && !hub_icon_domain('exa mple.com') && !hub_icon_domain('evil.com/../x') && !hub_icon_domain(''));
$png = "\x89PNG\r\n\x1a\n" . str_repeat('x', 100);
t('a PNG of a sensible size passes', hub_png_ok($png));
t('a GIF, a page and a tiny file do not', !hub_png_ok('GIF89a' . str_repeat('x', 100)) && !hub_png_ok('<html>' . str_repeat('x', 100)) && !hub_png_ok("\x89PNG\r\n\x1a\n"));
t('a huge PNG does not', !hub_png_ok("\x89PNG\r\n\x1a\n" . str_repeat('x', 400000)));

// the PHP support notice
$ts = function (string $d) { return strtotime($d . ' 12:00:00 UTC'); };
t('PHP 8.3 is fine in early 2027', hub_php_notice('8.3', $ts('2027-01-01')) === null);
t('PHP 8.3 gets a heads-up in the last six months', (hub_php_notice('8.3', $ts('2027-08-01'))['level'] ?? '') === 'info');
t('PHP 8.3 gets a warning after its end', (hub_php_notice('8.3', $ts('2028-02-01'))['level'] ?? '') === 'warn');
t('a very old PHP always gets a warning', (hub_php_notice('7.4', $ts('2026-01-01'))['level'] ?? '') === 'warn');
t('a PHP newer than the table is fine', hub_php_notice('9.9', $ts('2026-01-01')) === null);

// names inside an update zip
$bad = ['../x.php', '/etc/passwd', 'site-data/x.php', 'web/hub/core/config.php', 'web/hub/media/logo.png', 'web/evil.exe', 'web/a/b/c/d.php', 'web\\x.php', 'web/a b.php', "web/x\0.php", '', 'index.html'];
$badOk = []; foreach ($bad as $n) if (up_name_problem($n, false) === '') $badOk[] = $n;
t('unsafe names in an update are all refused', !$badOk, implode(', ', $badOk));
t('normal names are accepted', up_name_problem('index.php', false) === '' && up_name_problem('web/home/index.php', false) === '' && up_name_problem('web/hub/core/lib/boot.php', false) === '' && up_name_problem('web/hub/core/assets/shell.js', false) === '' && up_name_problem('web/home/', true) === '');
t('the .htaccess files are accepted, also in the pictures folder', up_name_problem('web/hub/media/.htaccess', false) === '' && up_name_problem('web/info/.htaccess', false) === '');

// encrypted backups
if (!function_exists('openssl_encrypt')) { t('openssl is available for the backup tests', false); return; }
$k1 = bk_key_set('first passphrase'); $json = json_encode(['pages' => ['info' => ['tabs' => [['name' => 'Ünïcode ✓']]]]], JSON_UNESCAPED_UNICODE);
$enc = bk_encrypt($json);
t('an encrypted backup does not hold the text in the clear', strpos($enc, 'Ünïcode') === false && strpos($enc, 'pages') === false);
t('it opens with the same key and gives back the same text', bk_decrypt($enc, $k1) === $json);
$k2 = bk_key_set('second passphrase');
t('another passphrase does not open it', bk_decrypt($enc, $k2) === null);
$j = json_decode($enc, true); $raw = base64_decode($j['data']); $raw[10] = $raw[10] ^ "\x01"; $j['data'] = base64_encode($raw);
t('a changed byte is noticed and nothing is returned', bk_decrypt(json_encode($j), $k1) === null);
t('a file of another kind is refused', bk_decrypt('{"format":"other"}', $k1) === null && bk_decrypt('not json', $k1) === null);

// the release never turns a test shortcut on
$found = [];
foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($site, FilesystemIterator::SKIP_DOTS)) as $f)
    if (substr($f, -4) === '.php' && preg_match("/define\\(\\s*'(NT_TEST_|GH_TEST_|HUB_TEST_)/", (string)file_get_contents($f))) $found[] = $f->getFilename();
t('no PHP file in the site defines a test shortcut', !$found, implode(', ', $found));

// 1.62.5: one copy of the recursive folder remover (health.php had its own, word for word)
$rm = sys_get_temp_dir() . '/hub-rm-' . bin2hex(random_bytes(4)); mkdir($rm . '/a/b', 0777, true); file_put_contents($rm . '/a/b/f.txt', 'x'); file_put_contents($rm . '/top.txt', 'y');
$keep = sys_get_temp_dir() . '/hub-keep-' . bin2hex(random_bytes(4)); mkdir($keep); file_put_contents($keep . '/safe.txt', 'z'); @symlink($keep, $rm . '/a/link');
hub_rm_tree($rm);
t('hub_rm_tree removes a folder with everything in it', !is_dir($rm));
t('...and never follows a link into another folder', is_file($keep . '/safe.txt'));
array_map('unlink', glob($keep . '/*')); rmdir($keep);
$health = (string)file_get_contents($site . '/web/hub/core/lib/health.php');
t('health.php uses it and has no copy of its own', strpos($health, 'function health_rmdir') === false && strpos($health, 'hub_rm_tree(') !== false);
