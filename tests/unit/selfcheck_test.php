<?php
declare(strict_types=1);
// 1.73.0: after an update the site looks at itself (up_self_check). In Docker the address in the browser (server:8080) cannot be
// reached from inside the container, so the check also asks the web server on its own address and port. Two small local
// servers stand in for the site: one answers like a working site, the other is broken.
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/hub/core/lib/boot.php';
require_once $site . '/web/hub/core/lib/update.php';

$dir = sys_get_temp_dir() . '/hub-selfcheck-' . bin2hex(random_bytes(3)); mkdir($dir);
file_put_contents("$dir/good.php", '<?php file_put_contents(__DIR__ . "/host.txt", $_SERVER["HTTP_HOST"] ?? ""); header("Content-Type: application/json"); echo $_SERVER["REQUEST_URI"] === "/web/hub/core/api.php?action=state" ? json_encode(["v" => "9.9.9"]) : "{}";');
file_put_contents("$dir/bad.php", '<?php http_response_code(500); echo "Fatal error";');
$good = 8352; $bad = 8353; $srv = [];
foreach ([[$good, 'good.php'], [$bad, 'bad.php']] as [$port, $r]) $srv[] = proc_open([PHP_BINARY, '-S', '127.0.0.1:' . $port, "$dir/$r"], [1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']], $pp);
register_shutdown_function(function () use ($srv, $dir) { foreach ($srv as $s) proc_terminate($s); array_map('unlink', glob("$dir/*")); @rmdir($dir); });
foreach ([$good, $bad] as $port) for ($i = 0; $i < 50 && !@fsockopen('127.0.0.1', $port); $i++) usleep(100000);

$_SERVER['SCRIPT_NAME'] = '/web/hub/core/api.php';
$_SERVER['HTTP_HOST'] = '127.0.0.1:' . $good; unset($_SERVER['SERVER_ADDR'], $_SERVER['SERVER_PORT']);
t('a site that answers at its own address passes', up_self_check('9.9.9') === true);
$_SERVER['HTTP_HOST'] = '127.0.0.1:' . $bad;
t('a broken site fails', up_self_check('9.9.9') === false);

$_SERVER['HTTP_HOST'] = '127.0.0.1:1'; $_SERVER['SERVER_ADDR'] = '127.0.0.1'; $_SERVER['SERVER_PORT'] = (string)$good;
t('its address cannot be reached (Docker): the web server is asked on its own port, and passes', up_self_check('9.9.9') === true);
t('...with the site\'s address kept as Host', trim((string)@file_get_contents("$dir/host.txt")) === '127.0.0.1:1');
$_SERVER['SERVER_PORT'] = (string)$bad;
t('...and a broken site still fails there', up_self_check('9.9.9') === false);
$_SERVER['SERVER_ADDR'] = 'not an address'; $_SERVER['SERVER_PORT'] = (string)$good;
t('no usable server address: it fails as before (nothing else is tried)', up_self_check('9.9.9') === false);
$_SERVER['HTTP_HOST'] = '127.0.0.1:' . $bad; $_SERVER['SERVER_ADDR'] = '127.0.0.1';
t('the second try is only for an address that cannot be reached, never to rescue a wrong answer', up_self_check('9.9.9') === false);
