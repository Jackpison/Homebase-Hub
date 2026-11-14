<?php
// 1.77.0: Cloud Backup (core/lib/cloud.php): an encrypted backup sent to a WebDAV folder. The address rules, the folder name, what is
// ever deleted, no copy without encryption, no password shown to a browser, and the whole run against a small local WebDAV server
// (only its own address counts as allowed here). Runs on its own copy of src/ (run.php).
[$self, $site] = $argv + [1 => ''];
$port = 8342; $B = 'http://127.0.0.1:' . $port . '/dav';
define('HUB_TEST_PUBLIC', ['127.0.0.1:' . $port]);
require __DIR__ . '/lib.php';
require $site . '/web/hub/core/lib/boot.php';
require $site . '/web/hub/core/lib/backup.php';
require $site . '/web/hub/core/lib/cloud.php';

$root = sys_get_temp_dir() . '/cl-' . bin2hex(random_bytes(3)); mkdir($root);
$srv = proc_open([PHP_BINARY, '-S', '127.0.0.1:' . $port, __DIR__ . '/cloud_dav_stub.php'], [1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']], $pp, null, ['CL_STUB_ROOT' => $root]);
register_shutdown_function(function () use ($srv, $root) { proc_terminate($srv); exec('rm -rf ' . escapeshellarg($root)); });
for ($i = 0; $i < 50 && !@fsockopen('127.0.0.1', $port); $i++) usleep(100000);

// ---- the address ----
// (the stand-in's own address is allowed in these tests; the rest are judged by the real rules)
t('an address on the internet needs https', cl_url_check('http://8.8.8.8/dav')[1] !== '' && cl_url_check('https://8.8.8.8/dav')[1] === '');
t('http is fine on your own network (192.168, 10, 172.16, 100.64)', cl_url_check('http://192.168.1.20/dav')[1] === '' && cl_url_check('http://10.0.0.5:5005/')[1] === '' && cl_url_check('http://172.16.4.1/')[1] === '' && cl_url_check('http://100.64.1.1/')[1] === '');
t('loopback, link-local (cloud metadata) and reserved addresses are refused', cl_url_check('http://127.0.0.1:9/')[1] !== '' && cl_url_check('http://169.254.169.254/latest/')[1] !== '' && cl_url_check('http://0.0.0.0/')[1] !== '' && cl_url_check('http://[::1]/')[1] !== '' && cl_url_check('http://224.0.0.1/')[1] !== '');
t('a name with one good and one bad answer would get nothing: a private-only host list is judged per address', cl_ip_private_ok('192.168.0.1') && !cl_ip_private_ok('8.8.8.8') && !cl_ip_private_ok('127.0.0.1') && !cl_ip_private_ok('169.254.1.1'));
t('a user name in the address, a backslash, a space, a query, another scheme and an empty address are refused', cl_url_check('https://me@example.org/dav')[1] !== '' && cl_url_check('https://example.org\\@8.8.8.8/')[1] !== ''
  && cl_url_check('https://8.8.8.8/a b')[1] !== '' && cl_url_check('https://8.8.8.8/dav?x=1')[1] !== '' && cl_url_check('ftp://8.8.8.8/')[1] !== '' && cl_url_check('file:///etc/passwd')[1] !== '' && cl_url_check('')[1] !== '');

// ---- the folder and the file names ----
t('the folder name: letters, numbers, spaces and . _ - ( ), up to three levels', cl_dir_parts('Homebase Hub') === ['Homebase Hub'] && cl_dir_parts('Backups/Home (1)/site') === ['Backups', 'Home (1)', 'site'] && cl_dir_parts('a/b/c/d') === null);
t('...and no way up, no empty name, no odd characters', cl_dir_parts('../x') === null && cl_dir_parts('a/../b') === null && cl_dir_parts('') === null && cl_dir_parts('/') === null && cl_dir_parts('a<b') === null && cl_dir_parts("a\0b") === null && cl_dir_parts(str_repeat('x', 70)) === null);
t('only copies this feature made are listed (the name pattern with the date), newest first', cl_own_names(['site-backup-2026-11-01.enc.json', 'site-backup-2026-11-03.enc.json', 'holiday.jpg', 'site-backup-2026-11-02.json', 'other-backup-2026-11-04.enc.json', '.homebase-write-test-ab.txt', 'site-backup-2026-11-02.enc.json'], 'site')
  === ['site-backup-2026-11-03.enc.json', 'site-backup-2026-11-02.enc.json', 'site-backup-2026-11-01.enc.json']);

// ---- settings: the password stays on the server ----
$d = cl_load(); $d['pass'] = 'secret-pass'; $d['url'] = 'https://8.8.8.8/dav'; cl_save($d);
$v = json_encode(cl_view(cl_load()));
t('the view for a browser has no password, only whether there is one', strpos($v, 'secret-pass') === false && cl_view(cl_load())['hasPass'] === true);
$f = hub_jpath(cl_file());
t('the settings file is readable by the site only (0600) and guarded like the other data files', (fileperms($f) & 0777) === 0600 && strncmp((string)file_get_contents($f), '<?php', 5) === 0);
t('the settings are not part of a backup of the site', strpos(json_encode(bk_export(array_fill_keys(BK_PARTS, true), true)), 'secret-pass') === false);

// ---- no encryption, no cloud copy ----
$d = cl_load(); $d['url'] = $B . '/'; $d['user'] = 'u'; $d['pass'] = 'p'; $d['dir'] = 'Backups'; cl_save($d);
$r = cl_run();
t('without an encryption passphrase nothing is made or sent', !$r['ok'] && strpos($r['message'], 'encrypted') !== false && !is_dir($root . '/data/Backups'), json_encode($r));

// ---- a run against the local WebDAV server ----
bk_key_set('a long unit test passphrase 77');
$r = cl_run(); $slug = cl_slug(); $day = date('Y-m-d'); $name = "$slug-backup-$day.enc.json"; $file = "$root/data/Backups/$name";
t('a run makes the folder and uploads one encrypted file named with the date only', $r['ok'] && is_file($file), json_encode($r));
$j = json_decode((string)@file_get_contents($file), true);
t('the file on the server is an encrypted backup (never the plain data) that opens with the key', ($j['format'] ?? '') === 'site-backup-encrypted' && strpos((string)file_get_contents($file), '"links"') === false && bk_decrypt((string)file_get_contents($file)) !== null);
t('the run is written down: when, the file name, no error', cl_load()['last'] > 0 && cl_load()['lastName'] === $name && cl_load()['error'] === '');
t('a wrong password is said plainly and nothing else happens', (function () use ($B) { $d = cl_load(); $d['pass'] = 'nope'; cl_save($d); $r = cl_run(); $d['pass'] = 'p'; cl_save($d); return !$r['ok'] && strpos($r['message'], 'user name or password') !== false; })());
// retention: only own old copies go, and only after the new one is there
foreach (['01', '02', '03'] as $n) file_put_contents("$root/data/Backups/$slug-backup-2020-10-$n.enc.json", 'old');
file_put_contents("$root/data/Backups/holiday.jpg", 'mine'); file_put_contents("$root/data/Backups/$slug-backup-2020-10-09.json", 'plain, not ours');
$d = cl_load(); $d['keep'] = 2; cl_save($d); cl_run();
$left = array_values(array_diff(scandir("$root/data/Backups"), ['.', '..']));
t('only the newest 2 own copies are kept; other files in the folder are never touched', in_array($name, $left, true) && in_array("$slug-backup-2020-10-03.enc.json", $left, true) && !in_array("$slug-backup-2020-10-01.enc.json", $left, true) && !in_array("$slug-backup-2020-10-02.enc.json", $left, true)
  && in_array('holiday.jpg', $left, true) && in_array("$slug-backup-2020-10-09.json", $left, true), json_encode($left));
// ---- Restore from Cloud (1.79.5), WebDAV ----
[$ok, $why, $copies] = cl_copies();
t('Restore lists the copies of the folder with date and size, newest first (WebDAV)', $ok && ($copies[0]['name'] ?? '') === $name && ($copies[0]['date'] ?? '') === $day && ($copies[0]['size'] ?? -1) === filesize($file) && !in_array('holiday.jpg', array_column($copies, 'name'), true), json_encode([$ok, $why, $copies]));
[$ok, $got] = cl_fetch_copy($name);
t('a copy comes back byte for byte, still encrypted, into a private temporary file', $ok && file_get_contents($got) === file_get_contents($file) && (fileperms($got) & 0777) === 0600, json_encode([$ok, $got]));
if ($ok) @unlink($got);
t('only the name of a copy is accepted, and a missing one is said plainly', !cl_fetch_copy('holiday.jpg')[0] && !cl_fetch_copy('../x-backup-2026-01-01.enc.json')[0] && strpos((string)cl_fetch_copy('nothere-backup-2026-01-01.enc.json')[1], 'does not exist') !== false);
t('the sizes in the WebDAV list are the real ones', (cl_dav_sizes(cl_load(), ['Backups'])[$name] ?? -1) === filesize($file));
// a hostile answer to the list: nothing is deleted
$d = cl_load(); $d['dir'] = 'evil'; cl_save($d);
$names = cl_dav_list(cl_load(), ['evil']);
t('a server answer with an entity or DOCTYPE is not read (no file read, no address opened) and so nothing is deleted', $names === null);
// a redirect is not followed
[$s, , $e] = cl_http('GET', 'http://127.0.0.1:' . $port . '/redir/x', ['user' => 'u', 'pass' => 'p']);
t('a redirect is not followed', $s === 302 && $e === '' && strpos((string)file_get_contents($root . '/.log'), '127.0.0.1:1') === false);
// the test button
$d = cl_load(); $d['dir'] = 'Backups'; cl_save($d);
$r = cl_test([]);
t('Test Connection checks the login, makes the folder, writes a file and removes it', $r['ok'] && !glob("$root/data/Backups/.homebase-write-test-*"), json_encode($r));
$r = cl_test(['pass' => 'wrong']);
t('...and says what is wrong in plain words', !$r['ok'] && strpos($r['message'], 'user name or password') !== false, json_encode($r));
$r = cl_test(['dir' => '../x']);
t('...and refuses a folder name that goes up', !$r['ok'] && strpos($r['message'], 'folder name') !== false);

// ---- the schedule ----
$d = cl_load(); $d['on'] = true; $d['last'] = time() - 60; $d['tried'] = ''; cl_save($d);
t('the schedule does nothing when a copy was made a moment ago', cl_tick() === null);
$d = cl_load(); $d['last'] = time() - 3 * 86400; $d['tried'] = $day; cl_save($d);
t('...nor twice in one day, however the first try ended', cl_tick() === null);
$d = cl_load(); $d['on'] = false; $d['last'] = 0; $d['tried'] = ''; cl_save($d);
t('...nor while it is off', cl_tick() === null);
t('Start Over removes the cloud settings (and so the password)', (function () { $c = hub_jpath(cl_file()); $had = is_file($c); bk_reset_all(); return $had && !is_file($c); })());
