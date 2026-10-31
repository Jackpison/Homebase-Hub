<?php
// 1.62.6: hub_with_lock() and hub_with_lock_or() (boot.php), the one copy of "take a lock on a file, change a data file, let go".
// Before, wt_update, nt_update, ap_update, act_update, pk_lock_run, sv_swap, two backup swaps, hub_settings_update, pool_update, the visit
// counts, tasks_modify and fl_modify each wrote it out; this test proves the helper and that those functions use it.
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/hub/core/lib/boot.php';

$d = sys_get_temp_dir() . '/hub-lock-' . bin2hex(random_bytes(4)); mkdir($d);
$lock = $d . '/a.lock';
$free = function (string $f): bool { $h = fopen($f, 'c'); $ok = flock($h, LOCK_EX | LOCK_NB); if ($ok) flock($h, LOCK_UN); fclose($h); return $ok; };

// ---- hub_with_lock ----
$during = null;
$r = hub_with_lock($lock, function () use ($free, $lock, &$during) { $during = $free($lock); return 'result'; });
t('it returns what the function returns', $r === 'result');
t('...the lock file is made when it is missing', is_file($lock));
t('...while the function runs nobody else can take the lock', $during === false);
t('...and the lock is let go afterwards', $free($lock));
$threw = false;
try { hub_with_lock($lock, function () { throw new RuntimeException('boom'); }); } catch (RuntimeException $e) { $threw = $e->getMessage() === 'boom'; }
t('an exception goes on to the caller, and the lock is let go', $threw && $free($lock));
$inner = null;
hub_with_lock($lock, function () use ($d, &$inner) { $inner = hub_with_lock($d . '/b.lock', fn() => 'inner'); });
t('two different locks can be held at once (one inside the other)', $inner === 'inner');
$ran = false;
$r = hub_with_lock($d . '/missing-folder/x.lock', function () use (&$ran) { $ran = true; return 7; });
t('when the lock file cannot be opened the function still runs, without a lock (as every caller did before)', $ran && $r === 7);
$byRef = ['n' => 1];
hub_with_lock($lock, function () use (&$byRef) { $byRef['n']++; });
t('the function can change what it was given by reference', $byRef['n'] === 2);

// ---- hub_with_lock_or ----
$r = hub_with_lock_or($lock, fn() => 'done', 'failed');
t('hub_with_lock_or returns the function\'s value when the lock was taken, and lets go', $r === 'done' && $free($lock));
$ran = false;
$r = hub_with_lock_or($d . '/missing-folder/y.lock', function () use (&$ran) { $ran = true; return 'done'; }, 'failed');
t('...when the lock file cannot be opened the function does NOT run and the failure value comes back', !$ran && $r === 'failed');
$threw = false;
try { hub_with_lock_or($lock, function () { throw new LogicException('x'); }, null); } catch (LogicException $e) { $threw = true; }
t('...an exception lets go of the lock too', $threw && $free($lock));
array_map('unlink', glob($d . '/*.lock')); @rmdir($d . '/missing-folder'); rmdir($d);

// ---- the functions use it, and nothing writes the pattern out again ----
function fn_src(string $src, string $name): string {
    $i = strpos($src, "function $name("); if ($i === false) return '';
    $j = strpos($src, '{', $i); $n = 0;
    for ($k = $j, $len = strlen($src); $k < $len; $k++) { if ($src[$k] === '{') $n++; elseif ($src[$k] === '}' && --$n === 0) return substr($src, $i, $k - $i + 1); }
    return '';
}
$where = ['wt_update' => 'hub/core/lib/watch.php', 'nt_update' => 'hub/core/lib/notify.php', 'ap_update' => 'hub/core/lib/approval.php', 'act_update' => 'hub/core/lib/activity.php',
          'pk_lock_run' => 'hub/core/lib/passkey.php', 'sv_swap' => 'hub/core/lib/vault.php', 'bk_info_vault_swap' => 'hub/core/lib/backup.php', 'bk_links_vault_swap' => 'hub/core/lib/backup.php',
          'hub_settings_update' => 'hub/core/lib/boot.php', 'pool_update' => 'home/lib.php', 'visits_add' => 'links/lib.php', 'visits_prune' => 'links/lib.php',
          'tasks_modify' => 'tasks/lib.php', 'fl_modify' => 'files/lib.php'];
$bad = [];
foreach ($where as $fn => $file) {
    $src = fn_src((string)file_get_contents($site . '/web/' . $file), $fn);
    if ($src === '' || (strpos($src, 'hub_with_lock(') === false && strpos($src, 'hub_with_lock_or(') === false) || strpos($src, 'flock(') !== false) $bad[] = $fn;
}
t('each of the ' . count($where) . ' functions that used to take its own lock now uses the helper and has no flock of its own', !$bad, implode(', ', $bad));
