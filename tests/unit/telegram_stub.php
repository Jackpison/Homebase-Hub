<?php
// Router for `php -S`: stands in for api.telegram.org. Appends each call to the log file and answers ok.
$log = getenv('NT_STUB_LOG');
$body = json_decode((string)file_get_contents('php://input'), true) ?: [];
if (!$body && $_POST) {   // a file upload (sendDocument): the fields, plus the file's name, size and first bytes
    $body = $_POST;
    foreach ($_FILES as $k => $f) $body[$k] = ['name' => $f['name'], 'size' => $f['size'], 'head' => substr((string)@file_get_contents($f['tmp_name']), 0, 40)];
}
file_put_contents($log, json_encode(['method' => basename(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH)), 'p' => $body], JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND);
header('Content-Type: application/json');
echo '{"ok":true,"result":{}}';
