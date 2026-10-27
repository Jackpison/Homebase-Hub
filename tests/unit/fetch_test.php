<?php
// 1.53.2: the one fetcher for other websites (hub_fetch, core/boot.php) that Home's pictures and Links' icons and titles use.
// Public internet only, with every redirect checked; limits, "stop when you have it", saving to a file, and the same rules
// without cURL. A small local server stands in for the other websites: only its own address and port count as public here.
// Runs on its own copy of src/ (run.php).
[$self, $site] = $argv + [1 => ''];
$port = 8341; $B = 'http://127.0.0.1:' . $port;
define('HUB_TEST_PUBLIC', ['127.0.0.1:' . $port]);
require __DIR__ . '/lib.php';
require $site . '/web/home/lib.php';
$srv = proc_open([PHP_BINARY, '-S', '127.0.0.1:' . $port, __DIR__ . '/fetch_stub.php'], [1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']], $pp);
register_shutdown_function(function () use ($srv) { proc_terminate($srv); });
for ($i = 0; $i < 50 && !@fsockopen('127.0.0.1', $port); $i++) usleep(100000);

$r = hub_fetch("$B/page");
t('an answer comes back with its code, text and type', ($r['status'] ?? 0) === 200 && strpos($r['body'], 'Lakeside') !== false && strpos($r['type'], 'text/html') === 0, json_encode($r));
$r = hub_fetch("$B/hop2");
t('redirects are followed (also a relative one) and the last address is given', ($r['status'] ?? 0) === 200 && $r['url'] === "$B/page", json_encode($r));
$r = hub_fetch("$B/inside");
t('a redirect onto another address of this server is refused', ($r['error'] ?? '') === 'Can\'t reach 127.0.0.1', json_encode($r));
$r = hub_fetch("$B/lan");
t('...and onto the home network', ($r['error'] ?? '') === 'Can\'t reach 10.0.0.1', json_encode($r));
$r = hub_fetch("$B/local");
t('...and onto a private name (localhost)', ($r['error'] ?? '') === 'Can\'t reach localhost', json_encode($r));
t('an address of this server is refused straight away', (hub_fetch('http://127.0.0.1:1/')['error'] ?? '') === 'Can\'t reach 127.0.0.1' && isset(hub_fetch('http://192.168.1.1/')['error']) && isset(hub_fetch('http://[::1]:' . $port . '/page')['error']));
$r = hub_fetch("$B/loop");
t('a redirect loop stops (5 addresses by default)', ($r['error'] ?? '') === 'Too many redirects');
t('only http and https', (hub_fetch('ftp://example.org/x')['error'] ?? '') === 'Bad address' && (hub_fetch('file:///etc/passwd')['error'] ?? '') === 'Bad address' && (hub_fetch('example.org')['error'] ?? '') === 'Bad address');
t('an address that parsers read two ways (user@, a backslash, a space) is refused',
  isset(hub_fetch("http://evil.example@127.0.0.1:$port/page")['error'], hub_fetch("http://127.0.0.1:$port\\@example.org/page")['error'], hub_fetch("http://127.0.0.1:$port/pa ge")['error']));
$r = hub_fetch("$B/big", ['max' => 100000]);
t('an answer over the limit fails (it is never cut silently)...', isset($r['error']) && strpos($r['error'], 'larger') !== false, json_encode($r));
$r = hub_fetch("$B/big", ['max' => 100000, 'cut' => true]);
t('...unless cutting was asked for: then exactly the limit comes back', ($r['status'] ?? 0) === 200 && strlen($r['body']) === 100000, strlen($r['body'] ?? '') . '');
$r = hub_fetch("$B/head", ['stop' => '</head>', 'max' => 5000000]);
t('"stop" stops reading once the text has arrived (a page\'s head, not its whole body)', ($r['status'] ?? 0) === 200 && stripos($r['body'], '</head>') !== false && strlen($r['body']) < 200000, strlen($r['body'] ?? '') . '');
$f = tempnam(sys_get_temp_dir(), 'hf');
$r = hub_fetch("$B/big", ['save' => $f, 'max' => 400000]);
t('"save" writes the answer into the file, not into memory', ($r['status'] ?? 0) === 200 && $r['body'] === '' && filesize($f) === 300000);
clearstatcache(); $r = hub_fetch("$B/big", ['save' => $f, 'max' => 1000]);
t('...and over the limit it fails too', isset($r['error']));
@unlink($f);
$r = hub_fetch("$B/ua", ['ua' => 'Tester/1', 'headers' => ['Accept: image/*', 'X-Extra: 7']]);
t('the User-Agent and headers asked for are sent', ($r['body'] ?? '') === 'Tester/1|image/*|7', $r['body'] ?? '');
t('a page that is not there gives its code (not an error)', (hub_fetch("$B/missing")['status'] ?? 0) === 404);

/* Home's http_get uses it */
$r = http_get("$B/hop");
t('Home: http_get follows redirects through it and says nothing of the address when it fails', ($r['status'] ?? 0) === 200 && strpos($r['body'], 'Lakeside') !== false && http_get("$B/lan") === ['error' => 'Can\'t reach 10.0.0.1']);
[$j, $e] = http_json("$B/missing");
t('Home: http_json reports the code', $j === null && strpos((string)$e, 'HTTP 404') === 0, (string)$e);
$links = (string)file_get_contents($site . '/web/links/api.php');
t('Links: fetch_url uses it (one copy of the fetching rules)', strpos($links, "\$r = hub_fetch((string)\$url, ['max' => (int)\$maxBytes, 'cut' => true") !== false && substr_count($links, 'curl_init') === 0);
$home = (string)file_get_contents($site . '/web/home/lib.php');
t('Home: no copy of its own', substr_count($home, 'curl_init') === 0 && strpos($home, 'function host_is_public') === false);

/* the same rules where PHP has no cURL (some cheap hosts): a separate PHP with curl_init switched off */
$code = 'define("HUB_TEST_PUBLIC", ["127.0.0.1:' . $port . '"]); require ' . var_export($site . '/web/hub/core/lib/boot.php', true) . ';'
    . '$a = hub_fetch("' . $B . '/hop2"); $b = hub_fetch("' . $B . '/lan"); $c = hub_fetch("' . $B . '/inside"); $d = hub_fetch("' . $B . '/loop"); $e = hub_fetch("' . $B . '/big", ["max" => 1000]);'
    . 'echo json_encode([function_exists("curl_init"), $a["status"] ?? 0, $a["url"] ?? "", $b["error"] ?? "", $c["error"] ?? "", $d["error"] ?? "", strlen($e["body"] ?? "")]);';
$tmpd = sys_get_temp_dir() . '/hf-' . bin2hex(random_bytes(3)); mkdir($tmpd);
$out = shell_exec('cd ' . escapeshellarg($tmpd) . ' && ' . escapeshellarg(PHP_BINARY) . ' -d disable_functions=curl_init -d allow_url_fopen=1 -r ' . escapeshellarg($code) . ' 2>&1');
exec('rm -rf ' . escapeshellarg($tmpd));
$o = json_decode((string)$out, true);
t('without cURL: redirects are followed and checked the same way (home network, this server, loops), and the limit holds',
  $o === [false, 200, "$B/page", 'Can\'t reach 10.0.0.1', 'Can\'t reach 127.0.0.1', 'Too many redirects', 1000], (string)$out);
