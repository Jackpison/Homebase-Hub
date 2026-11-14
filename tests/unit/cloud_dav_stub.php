<?php
// A tiny WebDAV server for cloud_test.php (php -S): user "u", password "p", files under CL_STUB_ROOT.
// /evil/... answers PROPFIND with a document that has an entity (a hostile server); /redir/... answers every request with a redirect.
$root = (string)getenv('CL_STUB_ROOT');
$u = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH); $m = $_SERVER['REQUEST_METHOD'];
file_put_contents($root . '/.log', $m . ' ' . $u . "\n", FILE_APPEND);
if (strpos($u, '/redir/') === 0) { header('Location: http://127.0.0.1:1/x', true, 302); exit; }
if (($_SERVER['PHP_AUTH_USER'] ?? '') !== 'u' || ($_SERVER['PHP_AUTH_PW'] ?? '') !== 'p') { header('WWW-Authenticate: Basic realm="t"'); http_response_code(401); exit; }
$rel = rawurldecode(preg_replace('~^/dav~', '', $u)); if (strpos($rel, '..') !== false) { http_response_code(400); exit; }
$path = rtrim($root . '/data' . $rel, '/');
@mkdir($root . '/data', 0777, true);
switch ($m) {
    case 'MKCOL':
        if (is_dir($path)) { http_response_code(405); exit; }
        if (!is_dir(dirname($path))) { http_response_code(409); exit; }
        mkdir($path); http_response_code(201); exit;
    case 'PUT':
        if (!is_dir(dirname($path))) { http_response_code(409); exit; }
        file_put_contents($path, file_get_contents('php://input')); http_response_code(201); exit;
    case 'GET':
        if (!is_file($path)) { http_response_code(404); exit; }
        header('Content-Type: application/json'); readfile($path); exit;
    case 'DELETE':
        if (is_file($path)) unlink($path); http_response_code(204); exit;
    case 'PROPFIND':
        if (strpos($u, '/evil') === 0 || strpos($u, '/dav/evil') === 0) {
            http_response_code(207); echo '<?xml version="1.0"?><!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><d:multistatus xmlns:d="DAV:"><d:response><d:href>/dav/&e;</d:href></d:response></d:multistatus>'; exit;
        }
        if (!is_dir($path)) { http_response_code(404); exit; }
        http_response_code(207); header('Content-Type: application/xml');
        $x = '<?xml version="1.0"?><d:multistatus xmlns:d="DAV:"><d:response><d:href>' . htmlspecialchars($u) . '</d:href></d:response>';
        if (($_SERVER['HTTP_DEPTH'] ?? '') === '1') foreach (scandir($path) as $f) if ($f !== '.' && $f !== '..') $x .= '<d:response><d:href>' . htmlspecialchars(rtrim($u, '/') . '/' . rawurlencode($f)) . (is_dir("$path/$f") ? '/' : '') . '</d:href>' . (is_file("$path/$f") ? '<d:propstat><d:prop><d:getcontentlength>' . filesize("$path/$f") . '</d:getcontentlength></d:prop></d:propstat>' : '') . '</d:response>';
        echo $x . '</d:multistatus>'; exit;
}
http_response_code(501);
