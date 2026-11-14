<?php
// 1.79.5: Cloud Backup to an S3 bucket and Restore from Cloud (core/lib/cloud.php). AWS Signature Version 4 against AWS's own published
// examples, the address, bucket and region rules, a whole run against a small local S3 server that checks the signature with its own code
// (only its own address counts as allowed here), what is listed and never deleted, a copy fetched back, and the plain messages for a wrong
// key, region or bucket. Runs on its own copy of src/ (run.php).
[$self, $site] = $argv + [1 => ''];
$port = 8343; $B = 'http://127.0.0.1:' . $port;
define('HUB_TEST_PUBLIC', ['127.0.0.1:' . $port]);
require __DIR__ . '/lib.php';
require $site . '/web/hub/core/lib/boot.php';
require $site . '/web/hub/core/lib/backup.php';
require $site . '/web/hub/core/lib/cloud.php';

$root = sys_get_temp_dir() . '/cs3-' . bin2hex(random_bytes(3)); mkdir($root);
$srv = proc_open([PHP_BINARY, '-S', '127.0.0.1:' . $port, __DIR__ . '/cloud_s3_stub.php'], [1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']], $pp, null, ['CL_STUB_ROOT' => $root]);
register_shutdown_function(function () use ($srv, $root) { proc_terminate($srv); exec('rm -rf ' . escapeshellarg($root)); });
for ($i = 0; $i < 50 && !@fsockopen('127.0.0.1', $port); $i++) usleep(100000);

// ---- the signature: the examples AWS publishes for S3 (docs.aws.amazon.com, "Authenticating Requests: Using the Authorization Header") ----
$AK = 'AKIAIOSFODNN7EXAMPLE'; $SK = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'; $when = gmmktime(0, 0, 0, 5, 24, 2013); $empty = hash('sha256', '');
$g = cl_s3_sign('GET', 'examplebucket.s3.amazonaws.com', '/test.txt', [], ['range' => 'bytes=0-9'], $empty, $AK, $SK, 'us-east-1', $when);
t('AWS example "GET Object" (with a Range header): the signature is exactly the published one', strpos($g['authorization'], 'Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41') !== false && $g['signed'] === 'host;range;x-amz-content-sha256;x-amz-date', $g['authorization']);
$l = cl_s3_sign('GET', 'examplebucket.s3.amazonaws.com', '/', ['max-keys' => '2', 'prefix' => 'J'], [], $empty, $AK, $SK, 'us-east-1', $when);
t('AWS example "GET Bucket (List Objects)" (a query string): the signature is exactly the published one', strpos($l['authorization'], 'Signature=34b48302e7b5fa45bde8084f4b7868a86f0a534bc59db6670ed5711ef69dc6f7') !== false && $l['query'] === 'max-keys=2&prefix=J', $l['authorization']);
t('the Authorization value names the key, the day, the region and the service', strpos($l['authorization'], 'Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request') !== false && $l['date'] === '20130524T000000Z');
t('the query is sorted and every piece is percent-encoded (a slash, a space)', cl_s3_sign('GET', 'h', '/b', ['prefix' => 'Home Base/', 'list-type' => '2'], [], $empty, 'a', 's', 'us-east-1', $when)['query'] === 'list-type=2&prefix=Home%20Base%2F');

// ---- the address, the bucket, the region, the path ----
t('the S3 address is only the server: a folder in it is refused, a port and a trailing slash are fine', cl_s3_endpoint_check('https://8.8.8.8/minio')[1] !== '' && cl_s3_endpoint_check('https://8.8.8.8')[1] === '' && cl_s3_endpoint_check('https://8.8.8.8/')[1] === '' && cl_s3_endpoint_check('http://192.168.1.5:9000')[1] === '');
t('...and every other address rule still holds (http on the internet, loopback, a user name in it)', cl_s3_endpoint_check('http://8.8.8.8')[1] !== '' && cl_s3_endpoint_check('http://169.254.169.254')[1] !== '' && cl_s3_endpoint_check('https://me@8.8.8.8')[1] !== '');
t('bucket names: 3 to 63 lower-case letters, numbers, dots and hyphens, not starting or ending with a dot or hyphen', cl_bucket_ok('my-backups') && cl_bucket_ok('a.b.c') && !cl_bucket_ok('ab') && !cl_bucket_ok('My-Bucket') && !cl_bucket_ok('-abc') && !cl_bucket_ok('abc-') && !cl_bucket_ok('a..b') && !cl_bucket_ok('a/b') && !cl_bucket_ok(str_repeat('a', 64)) && !cl_bucket_ok(''));
t('regions: us-east-1, eu-central-1, auto, us-west-004; nothing with a slash, a space or capitals', cl_region_ok('us-east-1') && cl_region_ok('auto') && cl_region_ok('us-west-004') && !cl_region_ok('US-EAST-1') && !cl_region_ok('a b') && !cl_region_ok('x/y') && !cl_region_ok(''));
t('the path is /bucket/folder/file with each piece encoded once', cl_s3_path('bkt', 'Home Base/(1)/site-backup-2026-11-14.enc.json') === '/bkt/Home%20Base/%281%29/site-backup-2026-11-14.enc.json' && cl_s3_path('bkt', '') === '/bkt' && cl_s3_key(['A', 'B'], 'f') === 'A/B/f');
t('the settings carry the kind, the region and the bucket, and the view still never has the secret', (function () { $d = cl_load(); $d['type'] = 's3'; $d['pass'] = 'TOP-SECRET-KEY'; $d['bucket'] = 'bkt'; $d['region'] = 'eu-test-1'; cl_save($d); $v = cl_view(cl_load()); return $v['type'] === 's3' && $v['bucket'] === 'bkt' && $v['region'] === 'eu-test-1' && $v['hasPass'] === true && strpos(json_encode($v), 'TOP-SECRET-KEY') === false; })());
t('an unknown kind falls back to WebDAV', (function () { $d = cl_load(); $d['type'] = 'ftp'; cl_save($d); return cl_load()['type'] === 'webdav'; })());

// ---- a run against the local S3 server ----
$d = cl_load(); $d = array_merge($d, ['type' => 's3', 'url' => $B, 'user' => 'AKTEST', 'pass' => 'sekrit', 'region' => 'eu-test-1', 'bucket' => 'bkt', 'dir' => 'Backups']); cl_save($d);
bk_key_set('a long unit test passphrase 88');
$r = cl_run(); $slug = cl_slug(); $day = date('Y-m-d'); $name = "$slug-backup-$day.enc.json"; $file = "$root/s3/Backups__$name";
t('a run uploads one encrypted file named with the date to bucket/folder/', $r['ok'] && is_file($file), json_encode($r));
$j = json_decode((string)@file_get_contents($file), true);
t('what the bucket holds is an encrypted backup (never the plain data) that opens with the key', ($j['format'] ?? '') === 'site-backup-encrypted' && strpos((string)file_get_contents($file), '"links"') === false && strpos((string)bk_decrypt((string)file_get_contents($file)), 'site-backup') !== false);
t('the server accepted the signature of every request (the stand-in recomputes it, on the path and query as sent)', is_file("$root/.log") && strpos((string)file_get_contents("$root/.log"), 'PUT /bkt/Backups/') !== false && strpos((string)file_get_contents("$root/.log"), 'GET /bkt?list-type=2&max-keys=1000&prefix=Backups%2F') !== false);
t('the run is written down: when, the file name, no error', cl_load()['last'] > 0 && cl_load()['lastName'] === $name && cl_load()['error'] === '');
$z = cl_names(cl_load(), ['Backups']);
t('the list gives each file with its size', ($z[$name] ?? -1) === filesize($file) && $z[$name] > 100, json_encode($z));
// retention: only own old copies go, and only after the new one is there
foreach (['01', '02', '03'] as $n) file_put_contents("$root/s3/Backups__$slug-backup-2020-10-$n.enc.json", 'old');
file_put_contents("$root/s3/Backups__holiday.jpg", 'mine'); file_put_contents("$root/s3/Backups__$slug-backup-2020-10-09.json", 'plain, not ours'); file_put_contents("$root/s3/Other__$slug-backup-2020-10-01.enc.json", 'other folder');
$d = cl_load(); $d['keep'] = 2; cl_save($d); $r = cl_run();
$left = array_values(array_diff(scandir("$root/s3"), ['.', '..']));
t('only the newest 2 own copies are kept; other files and other folders are never touched', in_array("Backups__$name", $left, true) && in_array("Backups__$slug-backup-2020-10-03.enc.json", $left, true) && !in_array("Backups__$slug-backup-2020-10-01.enc.json", $left, true) && !in_array("Backups__$slug-backup-2020-10-02.enc.json", $left, true)
  && in_array('Backups__holiday.jpg', $left, true) && in_array("Backups__$slug-backup-2020-10-09.json", $left, true) && in_array("Other__$slug-backup-2020-10-01.enc.json", $left, true), json_encode($left));

// ---- Restore from Cloud ----
file_put_contents("$root/s3/Backups__otherhome-backup-2021-01-05.enc.json", 'from another site');
[$ok, $why, $copies] = cl_copies();
$names = array_column($copies, 'name');
t('Restore lists the copies, newest first, each with its date and size', $ok && $names[0] === $name && $copies[0]['date'] === $day && $copies[0]['size'] === filesize($file) && ($names[1] ?? '') === 'otherhome-backup-2021-01-05.enc.json' && ($names[2] ?? '') === "$slug-backup-2020-10-03.enc.json", json_encode($copies));
t('...a copy made by another site is offered too (restoring a site onto a new server), a photo and a plain .json are not', in_array('otherhome-backup-2021-01-05.enc.json', $names, true) && !in_array('holiday.jpg', $names, true) && !in_array("$slug-backup-2020-10-09.json", $names, true));
[$ok, $got] = cl_fetch_copy($name);
t('a copy comes back byte for byte (still encrypted) into a temporary file', $ok && is_file($got) && file_get_contents($got) === file_get_contents($file) && (fileperms($got) & 0777) === 0600, json_encode([$ok, $got]));
if ($ok) @unlink($got);
t('only the name of a copy is accepted (no path, no other file type, no way up)', !cl_fetch_copy('../../core/config.php')[0] && !cl_fetch_copy('holiday.jpg')[0] && !cl_fetch_copy("x/../$name")[0] && !cl_fetch_copy('')[0] && !cl_fetch_copy("a\0-backup-2026-01-01.enc.json")[0]);
t('a name the bucket does not have is said plainly and leaves no temporary file behind', (function () { [$ok, $m] = cl_fetch_copy('nothere-backup-2026-01-01.enc.json'); return !$ok && strpos($m, 'does not exist') !== false && !glob(hub_dir('core') . '/cloud-get-*.tmp'); })());

// ---- plain messages ----
$wrong = fn(array $c) => (function () use ($c) { $d = cl_load(); $keep = $d; cl_save(array_merge($d, $c)); $r = cl_run(); cl_save($keep); return $r; })();
$r = $wrong(['pass' => 'nope']);
t('a wrong secret key: "access key or the secret key"', !$r['ok'] && strpos($r['message'], 'access key or the secret key') !== false, json_encode($r));
$r = $wrong(['user' => 'AKOTHER']);
t('a wrong access key: the same sentence', !$r['ok'] && strpos($r['message'], 'access key or the secret key') !== false, json_encode($r));
$r = $wrong(['region' => 'us-east-1']);
t('a wrong region: the server says which one it expects', !$r['ok'] && strpos($r['message'], 'expects "eu-test-1"') !== false, json_encode($r));
$r = $wrong(['bucket' => 'nothere']);
t('a bucket that does not exist: "no bucket with that name"', !$r['ok'] && strpos($r['message'], 'no bucket with that name') !== false, json_encode($r));
$r = $wrong(['bucket' => 'Bad Bucket']);
t('a bucket name that cannot be one is refused before anything is sent', !$r['ok'] && strpos($r['message'], 'bucket name') !== false, json_encode($r));
$r = $wrong(['url' => 'http://8.8.8.8']);
t('an address on the internet without https is refused before anything is sent', !$r['ok'] && strpos($r['message'], 'https://') !== false, json_encode($r));
t('without an encryption passphrase nothing is made or sent, S3 too', (function () use ($wrong) { bk_key_clear(); $r = cl_run(); bk_key_set('a long unit test passphrase 88'); return !$r['ok'] && strpos($r['message'], 'encrypted') !== false; })());
// a hostile answer to the list: nothing is read, nothing is deleted
$d = cl_load(); $d['dir'] = 'evil'; cl_save($d);
t('a list answer with an entity or DOCTYPE is not read, so nothing is listed and nothing is deleted', cl_s3_sizes(cl_load(), ['evil']) === null && cl_copies()[0] === false);
$d = cl_load(); $d['dir'] = 'Backups'; cl_save($d);

// ---- the test button ----
$r = cl_test([]);
t('Test Connection lists the bucket, writes a file and removes it', $r['ok'] && strpos($r['message'], 'bucket') !== false && !glob("$root/s3/*write-test*"), json_encode($r));
t('...says what is wrong in plain words (secret, region, bucket)', strpos(cl_test(['pass' => 'bad'])['message'], 'secret key') !== false && strpos(cl_test(['region' => 'x-1'])['message'], 'eu-test-1') !== false && strpos(cl_test(['bucket' => 'other'])['message'], 'no bucket') !== false);
t('...and does not use the saved secret for a different kind of server on its own', (function () use ($B) { $r = cl_test(['type' => 'webdav', 'url' => $B]); return !$r['ok']; })());
t('Start Over removes the cloud settings (and so the secret key)', (function () { $c = hub_jpath(cl_file()); $had = is_file($c); bk_reset_all(); return $had && !is_file($c); })());
