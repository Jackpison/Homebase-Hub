<?php
// Router for `php -S`: stands in for api.telegram.org. Appends each call to the log file and answers ok.
$log = getenv('NT_STUB_LOG');
$body = json_decode((string)file_get_contents('php://input'), true) ?: [];
file_put_contents($log, json_encode(['method' => basename(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH)), 'p' => $body], JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND);
header('Content-Type: application/json');
echo '{"ok":true,"result":{}}';
