<?php
// 1.79.0: Cleanup (web/hub/core/lib/cleanup.php) lets go of piled-up files only: earlier versions beyond the newest 3, unused downloaded Home photos,
// login files that ran out, and the host's error log. Runs on its own copy of src/ (run.php).
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/hub/core/lib/boot.php';
require_once $site . '/web/hub/core/lib/cleanup.php';

$sd = hub_data_root();
@mkdir($sd . '/info/versions', 0755, true);
for ($i = 1; $i <= 6; $i++) { $f = $sd . "/info/versions/v$i.php"; file_put_contents($f, "<?php // v$i\n"); touch($f, time() - (7 - $i) * 100); }   // v6 is the newest
$old = cu_old_versions();
t('C1 six earlier versions: the three oldest are due, the newest three stay', count($old) === 3 && isset($old[$sd . '/info/versions/v1.php'], $old[$sd . '/info/versions/v3.php']) && !isset($old[$sd . '/info/versions/v4.php']), json_encode(array_map('basename', array_keys($old))));
$r = cu_run('versions');
t('C2 running it removes exactly those', $r['count'] === 3 && !is_file($sd . '/info/versions/v1.php') && is_file($sd . '/info/versions/v4.php') && is_file($sd . '/info/versions/v6.php'), json_encode($r));
t('C3 a second run finds nothing', cu_run('versions')['count'] === 0);

@mkdir(HUB_MEDIA . '/home/photos', 0755, true); @mkdir($sd . '/home', 0755, true);
file_put_contents(HUB_MEDIA . '/home/photos/used.jpg', 'x'); file_put_contents(HUB_MEDIA . '/home/photos/spare.jpg', 'xx');
file_put_contents($sd . '/home/photos.json', json_encode(['items' => [['file' => 'used.jpg']]]));
$ph = cu_unused_photos();
t('C4 only the photo no list refers to is unused', array_keys($ph) === [HUB_MEDIA . '/home/photos/spare.jpg'], json_encode(array_map('basename', array_keys($ph))));
cu_run('photos');
t('C5 it is removed and the used one stays', !is_file(HUB_MEDIA . '/home/photos/spare.jpg') && is_file(HUB_MEDIA . '/home/photos/used.jpg'));

@mkdir($sd . '/sessions', 0755, true);
file_put_contents($sd . '/sessions/sess_old', 'x'); touch($sd . '/sessions/sess_old', time() - 90 * 86400);
file_put_contents($sd . '/sessions/sess_new', 'x');
cu_run('sessions');
t('C6 a login file that ran out goes, a recent one stays', !is_file($sd . '/sessions/sess_old') && is_file($sd . '/sessions/sess_new'));

file_put_contents(HUB_PUBLIC . '/error_log', "PHP Warning: test\n");
t('C7 a host error log in the site folder is listed', isset(cu_logs()[realpath(HUB_PUBLIC . '/error_log')]));
cu_run('logs'); clearstatcache();
t('C8 it is emptied, not deleted', is_file(HUB_PUBLIC . '/error_log') && filesize(HUB_PUBLIC . '/error_log') === 0);
$scan = cu_scan();
t('C9 the scan names every kind', array_keys($scan) === CU_KINDS);
t('C10 an unknown kind removes nothing', cu_run('everything') === ['count' => 0, 'bytes' => 0]);
