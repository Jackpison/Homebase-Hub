<?php
// Runs every tests/unit/*_test.php on its own fresh copy of src/, with Telegram replaced by a local stand-in.
//   php tests/unit/run.php
$root = dirname(__DIR__, 2); $dir = __DIR__; $port = 8330; $fail = 0;
$tmp = sys_get_temp_dir() . '/hub-unit-' . bin2hex(random_bytes(4)); mkdir($tmp);
$log = $tmp . '/telegram.log';
$srv = proc_open([PHP_BINARY, '-S', '127.0.0.1:' . $port, '-t', $dir, $dir . '/telegram_stub.php'], [1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']], $p, null, ['NT_STUB_LOG' => $log, 'PATH' => getenv('PATH')]);
usleep(600000);
foreach (glob($dir . '/*_test.php') as $f) {
    $site = $tmp . '/' . basename($f, '.php'); passthru('cp -r ' . escapeshellarg($root . '/src') . ' ' . escapeshellarg($site));
    echo "== " . basename($f) . "\n";
    file_put_contents($log, '');
    passthru('NT_STUB_LOG=' . escapeshellarg($log) . ' NT_STUB_PORT=' . $port . ' ' . escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($f) . ' ' . escapeshellarg($site), $rc);
    if ($rc) $fail++;
}
proc_terminate($srv); passthru('rm -rf ' . escapeshellarg($tmp));
exit($fail ? 1 : 0);
