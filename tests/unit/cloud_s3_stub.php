<?php
// A tiny S3 server for cloud_s3_test.php (php -S): bucket "bkt", access key "AKTEST", secret "sekrit", region "eu-test-1", files under CL_STUB_ROOT/s3.
// It checks the AWS Signature Version 4 itself, with its own code (not the site's), from what really arrived: the path as sent, the query
// as sent, the signed headers, and the body's hash. Anything else is answered with the same XML errors a real server sends.
// /bkt/evil/... lists a document with an entity (a hostile server); a wrong signature, region or bucket gets the real error codes.
$root = (string)getenv('CL_STUB_ROOT'); $KEY = 'AKTEST'; $SECRET = 'sekrit'; $REGION = 'eu-test-1';
$uri = $_SERVER['REQUEST_URI']; $m = $_SERVER['REQUEST_METHOD'];
[$rawPath, $rawQuery] = array_pad(explode('?', $uri, 2), 2, '');
file_put_contents($root . '/.log', $m . ' ' . $uri . "\n", FILE_APPEND);
function xerr(int $code, string $c, string $msg = 'x', string $extra = ''): never { http_response_code($code); header('Content-Type: application/xml'); echo '<?xml version="1.0" encoding="UTF-8"?><Error><Code>' . $c . '</Code><Message>' . $msg . '</Message>' . $extra . '</Error>'; exit; }
$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!preg_match('~^AWS4-HMAC-SHA256 Credential=([^/]+)/(\d{8})/([^/]+)/s3/aws4_request,SignedHeaders=([a-z0-9;-]+),Signature=([0-9a-f]{64})$~', $auth, $a)) xerr(403, 'AccessDenied', 'no valid Authorization');
[, $ak, $day, $reg, $signed, $sig] = $a;
if ($ak !== $KEY) xerr(403, 'InvalidAccessKeyId');
if ($reg !== $REGION) xerr(400, 'AuthorizationHeaderMalformed', 'the region is wrong', '<Region>' . $REGION . '</Region>');
$body = file_get_contents('php://input');
$amz = $_SERVER['HTTP_X_AMZ_DATE'] ?? ''; $chash = $_SERVER['HTTP_X_AMZ_CONTENT_SHA256'] ?? '';
if (!preg_match('/^' . $day . 'T\d{6}Z$/', $amz)) xerr(403, 'AccessDenied', 'bad date');
if (abs(strtotime(substr($amz, 0, 4) . '-' . substr($amz, 4, 2) . '-' . substr($amz, 6, 2) . ' ' . substr($amz, 9, 2) . ':' . substr($amz, 11, 2) . ':' . substr($amz, 13, 2) . ' UTC') - time()) > 900) xerr(403, 'RequestTimeTooSkewed');
if ($chash !== hash('sha256', $body)) xerr(400, 'XAmzContentSHA256Mismatch');
$hv = ['host' => $_SERVER['HTTP_HOST'] ?? '', 'x-amz-date' => $amz, 'x-amz-content-sha256' => $chash];
$ch = ''; foreach (explode(';', $signed) as $n) { if (!isset($hv[$n])) xerr(403, 'AccessDenied', 'unknown signed header ' . $n); $ch .= $n . ':' . $hv[$n] . "\n"; }
$pairs = []; foreach (explode('&', $rawQuery) as $q) { if ($q === '') continue; [$k, $v] = array_pad(explode('=', $q, 2), 2, ''); $pairs[] = rawurlencode(rawurldecode($k)) . '=' . rawurlencode(rawurldecode($v)); }
sort($pairs, SORT_STRING);
$canon = "$m\n$rawPath\n" . implode('&', $pairs) . "\n$ch\n$signed\n$chash";
$sts = "AWS4-HMAC-SHA256\n$amz\n$day/$reg/s3/aws4_request\n" . hash('sha256', $canon);
$k = hash_hmac('sha256', 'aws4_request', hash_hmac('sha256', 's3', hash_hmac('sha256', $reg, hash_hmac('sha256', $day, 'AWS4' . $SECRET, true), true), true), true);
if (!hash_equals(hash_hmac('sha256', $sts, $k), $sig)) xerr(403, 'SignatureDoesNotMatch', 'the signature does not match');
// the request is signed correctly: now the bucket and the key
$path = rawurldecode($rawPath);
if (!preg_match('~^/([^/]+)(?:/(.*))?$~', $path, $pm)) xerr(400, 'InvalidRequest');
$bucket = $pm[1]; $key = $pm[2] ?? '';
if ($bucket !== 'bkt') xerr(404, 'NoSuchBucket');
if (strpos($key, '..') !== false) xerr(400, 'InvalidRequest');
$dir = $root . '/s3'; @mkdir($dir, 0777, true);
$file = $dir . '/' . str_replace('/', '__', $key);   // folders are only part of a name, like on a real S3
parse_str($rawQuery, $q);
if ($m === 'GET' && $key === '' && ($q['list-type'] ?? '') === '2') {
    $prefix = (string)($q['prefix'] ?? '');
    header('Content-Type: application/xml');
    if (strpos($prefix, 'evil/') === 0) { echo '<?xml version="1.0"?><!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Contents><Key>&e;</Key><Size>1</Size></Contents></ListBucketResult>'; exit; }
    $x = '<?xml version="1.0" encoding="UTF-8"?><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>bkt</Name><Prefix>' . htmlspecialchars($prefix) . '</Prefix><IsTruncated>false</IsTruncated>';
    $max = (int)($q['max-keys'] ?? 1000); $n = 0; $names = scandir($dir); sort($names, SORT_STRING);
    foreach ($names as $f) {
        if ($f === '.' || $f === '..') continue;
        $kk = str_replace('__', '/', $f);
        if (strncmp($kk, $prefix, strlen($prefix)) !== 0 || $n >= $max) continue;
        $x .= '<Contents><Key>' . htmlspecialchars($kk) . '</Key><Size>' . filesize($dir . '/' . $f) . '</Size></Contents>'; $n++;
    }
    echo $x . '</ListBucketResult>'; exit;
}
switch ($m) {
    case 'PUT': file_put_contents($file, $body); header('ETag: "x"'); http_response_code(200); exit;
    case 'GET': if (!is_file($file)) xerr(404, 'NoSuchKey'); header('Content-Type: application/json'); readfile($file); exit;
    case 'DELETE': if (is_file($file)) unlink($file); http_response_code(204); exit;
}
xerr(405, 'MethodNotAllowed');
