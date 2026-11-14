<?php
declare(strict_types=1);
/* Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
/**
 * Cloud Backup (1.77.0): an encrypted backup of the whole site, sent to a WebDAV folder (Nextcloud, ownCloud, a NAS, Synology,
 * Hetzner Storage Box and others) on a schedule. Since 1.79.5 it can also go to an S3 bucket (Amazon S3, Cloudflare R2, Backblaze B2,
 * Wasabi, MinIO and others: path-style addresses, AWS Signature Version 4), and a copy can be fetched back to the browser to restore
 * it (Restore from Cloud): the Import window then opens it with the passphrase, so no new restore path exists.
 *
 * Rules this file keeps:
 *  - Only an ENCRYPTED backup ever leaves the server: no encryption passphrase set, no cloud backup.
 *  - The address is checked and pinned like every other request the site makes (hub_fetch's rules), except that addresses on
 *    your own network (10.x, 172.16-31.x, 192.168.x, 100.64.x, fc00::/7) are allowed here, because a NAS lives there. Loopback,
 *    link-local (cloud metadata) and other reserved addresses stay refused. Addresses on the internet must use https.
 *  - The password lives only in site-data/core/cloud.json (0600, never in a backup, never sent to a browser).
 *  - Cleaning up old copies deletes only files this feature made itself (its own name pattern, in its own folder), and only after
 *    a new copy was uploaded and is there.
 *  - File names hold the date only (site-backup-2026-11-14.enc.json): a second run the same day replaces that day's copy.
 */
require_once __DIR__ . '/fetch.php';

const CL_FILES_MAX = 24 * 1048576;   // Files goes in the cloud backup only while all of it is this small
const CL_KEEP_MAX = 365;
const CL_FETCH_MAX = 134217728;   // a copy fetched back for Restore may be up to 128 MB
const CL_COPY_RE = '/^[A-Za-z0-9._-]{1,80}-backup-(\d{4}-\d{2}-\d{2})\.enc\.json$/';   // any copy of this kind (also one made by another site), for Restore only

function cl_file(): string { return hub_dir('core') . '/cloud.json'; }
function cl_defaults(): array {
    return ['on' => false, 'type' => 'webdav', 'url' => '', 'user' => '', 'pass' => '', 'dir' => 'Homebase Hub', 'every' => 1, 'keep' => 14,
            'region' => 'us-east-1', 'bucket' => '', 'last' => 0, 'lastName' => '', 'lastSize' => 0, 'error' => '', 'tried' => '', 'note' => ''];
}
function cl_load(): array {
    $d = hub_jread(cl_file());
    $d = is_array($d) ? array_merge(cl_defaults(), $d) : cl_defaults();
    $d['every'] = in_array((int)$d['every'], [1, 3, 7], true) ? (int)$d['every'] : 1;
    $d['keep'] = max(1, min(CL_KEEP_MAX, (int)$d['keep']));
    if (!in_array($d['type'], ['webdav', 's3'], true)) $d['type'] = 'webdav';
    return $d;
}
function cl_save(array $d): bool {
    $ok = hub_jput(cl_file(), json_encode($d, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    @chmod(hub_jpath(cl_file()), 0600);
    return $ok;
}
/** The settings as the browser sees them: never the password. */
function cl_view(array $d): array {
    return ['ok' => true, 'on' => (bool)$d['on'], 'type' => (string)$d['type'], 'url' => (string)$d['url'], 'user' => (string)$d['user'], 'hasPass' => $d['pass'] !== '',
            'dir' => (string)$d['dir'], 'region' => (string)$d['region'], 'bucket' => (string)$d['bucket'], 'every' => (int)$d['every'], 'keep' => (int)$d['keep'], 'last' => (int)$d['last'], 'lastName' => (string)$d['lastName'],
            'lastSize' => (int)$d['lastSize'], 'error' => (string)$d['error'], 'note' => (string)$d['note'], 'encReady' => (bool)bk_key(), 'now' => time()];
}

/* ---------- the address ---------- */
/** An address on your own network (a NAS, a Nextcloud at home). Loopback, link-local, multicast and reserved ranges are not. */
function cl_ip_private_ok(string $ip): bool {
    foreach (['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '100.64.0.0/10', 'fc00::/7'] as $c) if (hub_ip_in($ip, $c)) return true;
    return false;
}
/** Every address a host points to; [] when any of them is refused (so a name with one good and one bad answer gets nothing). */
function cl_host_ips(string $host): array {
    $host = strtolower(rtrim(trim($host, '[]'), '.'));
    if ($host === '') return [];
    if (filter_var($host, FILTER_VALIDATE_IP)) $ips = [$host];
    else {
        $ips = [];
        $recs = function_exists('dns_get_record') ? @dns_get_record($host, DNS_A | DNS_AAAA) : false;
        foreach (is_array($recs) ? $recs : [] as $r) { if (!empty($r['ip'])) $ips[] = $r['ip']; if (!empty($r['ipv6'])) $ips[] = $r['ipv6']; }
        if (!$ips) $ips = @gethostbynamel($host) ?: [];
    }
    foreach ($ips as $ip) if (!hub_ip_public($ip) && !cl_ip_private_ok($ip)) return [];
    return array_values(array_unique($ips));
}
/** The address that is set, checked: [parsed parts, a plain message] (the message is '' when it is fine). */
function cl_url_check(string $url): array {
    $url = trim($url);
    if ($url === '') return [[], 'Add the address first.'];
    if (strlen($url) > 400 || strpos($url, '\\') !== false || preg_match('~[\x00-\x20\x7F]~', $url) || preg_match('~^[a-z][a-z0-9+.-]*://[^/?#]*@~i', $url)) return [[], 'That address is not valid. Leave the user name and password out of it: they have their own fields.'];
    $p = parse_url($url);
    $scheme = strtolower((string)($p['scheme'] ?? ''));
    if (!$p || !in_array($scheme, ['http', 'https'], true) || empty($p['host']) || isset($p['query']) || isset($p['fragment'])) return [[], 'Use an address like https://cloud.example.com/remote.php/dav/files/you/'];
    $test = hub_fetch_test_host($p);   // only the tests define this
    $ips = $test ? ['127.0.0.1'] : cl_host_ips((string)$p['host']);
    if (!$ips) return [[], 'Can\'t reach ' . $p['host'] . ': it does not exist, or it points to an address this feature does not use.'];
    $allPrivate = true; foreach ($ips as $ip) if (!cl_ip_private_ok($ip)) $allPrivate = false;
    if ($scheme === 'http' && !$allPrivate && !$test) return [[], 'An address on the internet must start with https://. Only http:// on your own network is allowed.'];
    $p['ips'] = $ips; $p['scheme'] = $scheme;
    return [$p, ''];
}

/* ---------- one request ---------- */
/**
 * One WebDAV request. $o: file (a path, sent as the body), body (a string), headers, timeout. Returns [status, body, error].
 * Connects only to the address cl_url_check approved (DNS can't change between the check and the connection), follows no redirect,
 * checks the certificate, and keeps at most 2 MB of the answer.
 */
function cl_http(string $method, string $url, array $cfg, array $o = []): array {
    [$p, $why] = cl_url_check($url);
    if ($why !== '') return [0, '', $why];
    if (!empty($o['query'])) $url .= '?' . $o['query'];   // S3's list request: the address was approved without it
    if (!function_exists('curl_init')) return [0, '', 'This server\'s PHP has no cURL, which Cloud Backup needs.'];
    $port = (int)($p['port'] ?? ($p['scheme'] === 'http' ? 80 : 443));
    $ip = $p['ips'][0]; $ip = strpos($ip, ':') !== false ? "[$ip]" : $ip;
    $ch = curl_init($url);
    $body = ''; $over = false; $fh = null; $max = (int)($o['max'] ?? 2097152); $out = null;
    if (isset($o['saveTo'])) { $out = @fopen((string)$o['saveTo'], 'wb'); if (!$out) { curl_close($ch); return [0, '', 'Could not write a temporary file in site-data/core.']; } @chmod((string)$o['saveTo'], 0600); }
    $headers = array_merge(['Expect:'], $o['headers'] ?? []);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method, CURLOPT_RESOLVE => [strtolower((string)$p['host']) . ":$port:$ip"], CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS, CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => (int)($o['timeout'] ?? 60),
        CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2, CURLOPT_HTTPHEADER => $headers,
        CURLOPT_WRITEFUNCTION => function ($c, $chunk) use (&$body, &$over, &$out, &$got, $max) {
            $got = ($got ?? 0) + strlen($chunk);
            if ($got > $max) { $over = true; return 0; }
            if ($out) { fwrite($out, $chunk); return strlen($chunk); }
            $body .= $chunk; return strlen($chunk);
        },
    ]);
    if (empty($o['noauth'])) curl_setopt_array($ch, [CURLOPT_USERPWD => $cfg['user'] . ':' . $cfg['pass'], CURLOPT_HTTPAUTH => CURLAUTH_BASIC]);
    if (isset($o['file'])) {
        $fh = @fopen((string)$o['file'], 'rb');
        if (!$fh) { curl_close($ch); return [0, '', 'Could not read the backup file.']; }
        curl_setopt_array($ch, [CURLOPT_UPLOAD => true, CURLOPT_INFILE => $fh, CURLOPT_INFILESIZE => (int)filesize((string)$o['file'])]);
    } elseif (isset($o['body'])) curl_setopt($ch, CURLOPT_POSTFIELDS, (string)$o['body']);
    $ok = curl_exec($ch); $err = curl_error($ch); $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE); curl_close($ch);
    if ($fh) fclose($fh);
    if ($out) fclose($out);
    if ($over && $out) return [$status, '', 'The copy is larger than this feature takes back (' . round($max / 1048576) . ' MB).'];
    if ($ok === false && !$over) return [0, '', $err !== '' ? 'No answer: ' . $err : 'No answer.'];
    return [$status, $body, ''];
}
/** A plain sentence for a status the server answered with. */
function cl_status_text(int $s, string $what): string {
    if ($s === 401 || $s === 403) return 'The server refused the user name or password' . ($s === 403 ? ' (or this account may not do that here).' : '.');
    if ($s === 404) return 'The server says that address or folder does not exist. Check the address.';
    if ($s === 405 || $s === 501) return 'That address does not look like a WebDAV folder (the server does not accept ' . $what . ' there).';
    if ($s === 409) return 'A folder above the backup folder is missing. Check the address.';
    if ($s === 413) return 'The server says the backup is too big for it.';
    if ($s === 423) return 'The folder is locked on the server right now. Try again in a moment.';
    if ($s === 507) return 'The cloud account is out of space.';
    if ($s >= 300 && $s < 400) return 'The server sent us somewhere else (a redirect). Use the address it finally ends at.';
    return 'The server answered ' . $s . ' to ' . $what . '.';
}

/* ---------- WebDAV ---------- */
/** The folder name as clean path pieces (up to 3), or null. */
function cl_dir_parts(string $dir): ?array {
    $out = [];
    foreach (explode('/', str_replace('\\', '/', trim($dir))) as $seg) {
        $seg = trim($seg);
        if ($seg === '') continue;
        if ($seg === '.' || $seg === '..' || strlen($seg) > 60 || !preg_match('/^[\p{L}\p{N} ._()-]+$/u', $seg)) return null;
        $out[] = $seg;
    }
    return $out && count($out) <= 3 ? $out : null;
}
function cl_base(array $cfg): string { return rtrim(trim((string)$cfg['url']), '/'); }
function cl_dir_url(array $cfg, array $parts): string { return cl_base($cfg) . '/' . implode('/', array_map('rawurlencode', $parts)); }
/** Makes the folder (and the ones above it, inside the address) if it is not there. [ok, message] */
function cl_dav_mkdirs(array $cfg, array $parts): array {
    for ($i = 1; $i <= count($parts); $i++) {
        [$s, , $e] = cl_http('MKCOL', cl_dir_url($cfg, array_slice($parts, 0, $i)), $cfg, ['timeout' => 30]);
        if ($e !== '') return [false, $e];
        if (!in_array($s, [200, 201, 204, 301, 405], true)) return [false, cl_status_text($s, 'making the folder')];   // 405 = it is already there
    }
    return [true, ''];
}
/** The files inside the backup folder as name => size (0 when the server did not say). null = could not read. */
function cl_dav_sizes(array $cfg, array $parts): ?array {
    [$s, $xml, $e] = cl_http('PROPFIND', cl_dir_url($cfg, $parts) . '/', $cfg, ['headers' => ['Depth: 1', 'Content-Type: application/xml'], 'body' => '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/><d:getcontentlength/></d:prop></d:propfind>', 'timeout' => 30]);
    if ($e !== '' || $s !== 207 || preg_match('/<!(DOCTYPE|ENTITY)/i', $xml)) return null;   // no DTD, no entities: nothing in the answer can read a file or open an address
    $doc = new DOMDocument();
    if (!@$doc->loadXML($xml, LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING)) return null;
    $names = [];
    foreach ($doc->getElementsByTagNameNS('DAV:', 'response') as $r) {
        $h = $r->getElementsByTagNameNS('DAV:', 'href')->item(0);
        if (!$h) continue;
        $path = (string)parse_url(trim((string)$h->textContent), PHP_URL_PATH);
        $n = rawurldecode(basename(rtrim($path, '/')));
        if ($n === '' || substr($path, -1) === '/') continue;   // files only
        $l = $r->getElementsByTagNameNS('DAV:', 'getcontentlength')->item(0);
        $names[$n] = $l ? max(0, (int)$l->textContent) : 0;
    }
    return $names;
}
/** The names inside the backup folder. null = could not read. */
function cl_dav_list(array $cfg, array $parts): ?array {
    $z = cl_dav_sizes($cfg, $parts);
    return $z === null ? null : array_map('strval', array_keys($z));
}
/** The names this feature made, newest first (date in the name). Nothing else is ever listed here, so nothing else is ever deleted. */
function cl_own_names(array $names, string $slug): array {
    $mine = [];
    foreach ($names as $n) if (preg_match('/^' . preg_quote($slug, '/') . '-backup-(\d{4}-\d{2}-\d{2})\.enc\.json$/', $n, $m)) $mine[$n] = $m[1];
    arsort($mine); // newest date first
    return array_keys($mine);
}
function cl_slug(): string {
    $s = trim((string)preg_replace('/[^a-z0-9]+/', '-', strtolower((string)(hub_settings()['siteName'] ?? ''))), '-');
    return $s !== '' ? substr($s, 0, 40) : 'site';
}
/** Deletes the copies beyond $keep (the newest are kept). Returns how many went. */
function cl_tidy(array $cfg, array $parts, string $slug, int $keep, string $justMade): int {
    $z = cl_names($cfg, $parts);
    if ($z === null) return 0;
    $own = cl_own_names(array_map('strval', array_keys($z)), $slug);
    if (!in_array($justMade, $own, true)) return 0;   // the new copy is not seen there: delete nothing
    $gone = 0;
    foreach (array_slice($own, $keep) as $n) {
        if ($n === $justMade) continue;
        [$s] = cl_delete($cfg, $parts, $n);
        if (in_array($s, [200, 202, 204, 404], true)) $gone++;
    }
    return $gone;
}

/* ---------- S3 (1.79.5): Amazon S3, Cloudflare R2, Backblaze B2, Wasabi, MinIO ... Path-style addresses: https://server/bucket/folder/file ---------- */
function cl_is_s3(array $cfg): bool { return (string)($cfg['type'] ?? 'webdav') === 's3'; }
function cl_bucket_ok(string $b): bool { return strlen($b) >= 3 && strlen($b) <= 63 && preg_match('/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/', $b) === 1 && strpos($b, '..') === false; }
function cl_region_ok(string $r): bool { return preg_match('/^[a-z0-9-]{2,30}$/', $r) === 1; }
/** The S3 address: the same rules as any address here, and only the server (the bucket is its own field, so no folder in the address). */
function cl_s3_endpoint_check(string $url): array {
    [$p, $why] = cl_url_check($url);
    if ($why !== '') return [[], $why];
    if (($p['path'] ?? '') !== '' && $p['path'] !== '/') return [[], 'The S3 address is only the server, like https://s3.eu-central-1.amazonaws.com . The bucket and the folder have their own fields.'];
    return [$p, ''];
}
function cl_s3_key(array $parts, string $name = ''): string { return implode('/', $parts) . '/' . $name; }
/** The path to send: /bucket/folder/file with every piece percent-encoded once (what S3 signs). */
function cl_s3_path(string $bucket, string $key): string {
    $segs = $key === '' ? [] : explode('/', $key);
    return '/' . rawurlencode($bucket) . ($segs ? '/' . implode('/', array_map('rawurlencode', $segs)) : '');
}
/**
 * AWS Signature Version 4 for S3. $headers: extra headers to sign (lower-case names). Returns the Authorization value, the date, the
 * canonical query string to put in the address, and the list of signed headers. $now is for the tests (AWS publishes examples).
 */
function cl_s3_sign(string $method, string $host, string $uri, array $query, array $headers, string $payloadHash, string $access, string $secret, string $region, ?int $now = null): array {
    $now = $now ?? time(); $amz = gmdate('Ymd\THis\Z', $now); $day = gmdate('Ymd', $now);
    $h = [];
    foreach ($headers + ['host' => $host, 'x-amz-content-sha256' => $payloadHash, 'x-amz-date' => $amz] as $k => $v) $h[strtolower((string)$k)] = trim((string)preg_replace('/\s+/', ' ', (string)$v));
    ksort($h, SORT_STRING);
    $canonH = ''; foreach ($h as $k => $v) $canonH .= $k . ':' . $v . "\n";
    $signed = implode(';', array_keys($h));
    ksort($query, SORT_STRING); $pairs = [];
    foreach ($query as $k => $v) $pairs[] = rawurlencode((string)$k) . '=' . rawurlencode((string)$v);
    $cq = implode('&', $pairs);
    $canon = $method . "\n" . $uri . "\n" . $cq . "\n" . $canonH . "\n" . $signed . "\n" . $payloadHash;
    $scope = $day . '/' . $region . '/s3/aws4_request';
    $sts = "AWS4-HMAC-SHA256\n" . $amz . "\n" . $scope . "\n" . hash('sha256', $canon);
    $k = hash_hmac('sha256', $day, 'AWS4' . $secret, true);
    foreach ([$region, 's3', 'aws4_request'] as $piece) $k = hash_hmac('sha256', $piece, $k, true);
    return ['authorization' => 'AWS4-HMAC-SHA256 Credential=' . $access . '/' . $scope . ',SignedHeaders=' . $signed . ',Signature=' . hash_hmac('sha256', $sts, $k),
            'date' => $amz, 'query' => $cq, 'signed' => $signed];
}
/** One signed S3 request ($o as cl_http). Returns [status, body, error]. */
function cl_s3_req(string $method, array $cfg, string $key, array $query = [], array $o = []): array {
    $base = cl_base($cfg);
    [$p, $why] = cl_s3_endpoint_check($base);
    if ($why !== '') return [0, '', $why];
    $uri = cl_s3_path((string)$cfg['bucket'], $key);
    $hash = isset($o['file']) ? (string)hash_file('sha256', (string)$o['file']) : hash('sha256', (string)($o['body'] ?? ''));
    $host = strtolower((string)$p['host']); $port = (int)($p['port'] ?? 0);
    if ($port && !(($p['scheme'] === 'https' && $port === 443) || ($p['scheme'] === 'http' && $port === 80))) $host .= ':' . $port;
    $sg = cl_s3_sign($method, $host, $uri, $query, [], $hash, (string)$cfg['user'], (string)$cfg['pass'], (string)$cfg['region']);
    $o['headers'] = ['Authorization: ' . $sg['authorization'], 'x-amz-date: ' . $sg['date'], 'x-amz-content-sha256: ' . $hash];
    $o['noauth'] = true; $o['query'] = $sg['query'];
    return cl_http($method, $base . $uri, $cfg, $o);
}
/** A plain sentence for what an S3 server answered (its error code is in the answer's text). */
function cl_s3_status_text(int $s, string $body, string $what): string {
    $code = preg_match('~<Code>([A-Za-z]+)</Code>~', $body, $m) ? $m[1] : '';
    $reg = preg_match('~<Region>([a-z0-9-]+)</Region>~', $body, $r) ? $r[1] : '';
    if (in_array($code, ['SignatureDoesNotMatch', 'InvalidAccessKeyId', 'InvalidSecretAccessKey', 'InvalidToken', 'ExpiredToken'], true)) return 'The server refused the access key or the secret key.';
    if ($code === 'AuthorizationHeaderMalformed' || $code === 'AuthorizationQueryParametersError') return $reg !== '' ? 'The region is wrong: this server expects "' . $reg . '".' : 'The region does not fit this server. Check the Region field.';
    if ($code === 'NoSuchBucket') return 'The server has no bucket with that name. Check the bucket name and the region.';
    if ($code === 'AccessDenied') return 'The server refused this key for that bucket (it may not be allowed to ' . $what . ').';
    if ($code === 'PermanentRedirect' || $s === 301 || $s === 307) return 'That bucket lives at another address or in another region. Check the Region and the address.';
    if ($s === 401 || $s === 403) return 'The server refused the access key or the secret key (or this key may not do that in the bucket).';
    if ($s === 404) return 'The server says the bucket or the file does not exist. Check the bucket name and the address.';
    if ($s === 413 || $code === 'EntityTooLarge') return 'The server says the backup is too big for it.';
    if ($s === 503 || $code === 'SlowDown') return 'The server is busy. Try again in a moment.';
    return 'The server answered ' . $s . ($code !== '' ? ' (' . $code . ')' : '') . ' to ' . $what . '.';
}
/** The files in the backup folder as name => size. null = could not read. */
function cl_s3_sizes(array $cfg, array $parts): ?array {
    $prefix = implode('/', $parts) . '/';
    [$s, $xml, $e] = cl_s3_req('GET', $cfg, '', ['list-type' => '2', 'prefix' => $prefix, 'max-keys' => '1000']);
    if ($e !== '' || $s !== 200 || preg_match('/<!(DOCTYPE|ENTITY)/i', $xml)) return null;
    $doc = new DOMDocument();
    if (!@$doc->loadXML($xml, LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING)) return null;
    $out = [];
    foreach ($doc->getElementsByTagNameNS('*', 'Contents') as $c) {
        $key = ''; $size = 0;
        foreach ($c->childNodes as $n) { if ($n->localName === 'Key') $key = (string)$n->textContent; elseif ($n->localName === 'Size') $size = (int)$n->textContent; }
        if (strncmp($key, $prefix, strlen($prefix)) !== 0) continue;
        $name = substr($key, strlen($prefix));
        if ($name === '' || strpos($name, '/') !== false) continue;   // files directly in the folder only
        $out[$name] = max(0, $size);
    }
    return $out;
}

/* ---------- one place for what differs between WebDAV and S3 ---------- */
/** Gets the folder ready (WebDAV makes it; S3 has no folders, the name is part of each file's name). [ok, message] */
function cl_prepare(array $cfg, array $parts): array { return cl_is_s3($cfg) ? [true, ''] : cl_dav_mkdirs($cfg, $parts); }
/** name => size of the files in the backup folder. null = could not read. */
function cl_names(array $cfg, array $parts): ?array { return cl_is_s3($cfg) ? cl_s3_sizes($cfg, $parts) : cl_dav_sizes($cfg, $parts); }
/** Uploads a file. [status, body, error] */
function cl_put(array $cfg, array $parts, string $name, string $file, int $timeout = 900): array {
    if (cl_is_s3($cfg)) return cl_s3_req('PUT', $cfg, cl_s3_key($parts, $name), [], ['file' => $file, 'timeout' => $timeout]);
    return cl_http('PUT', cl_dir_url($cfg, $parts) . '/' . rawurlencode($name), $cfg, ['file' => $file, 'timeout' => $timeout]);
}
function cl_delete(array $cfg, array $parts, string $name): array {
    if (cl_is_s3($cfg)) return cl_s3_req('DELETE', $cfg, cl_s3_key($parts, $name), [], ['timeout' => 30]);
    return cl_http('DELETE', cl_dir_url($cfg, $parts) . '/' . rawurlencode($name), $cfg, ['timeout' => 30]);
}
/** Fetches one file into $dest. [status, body, error] */
function cl_get_to(array $cfg, array $parts, string $name, string $dest): array {
    $o = ['saveTo' => $dest, 'max' => CL_FETCH_MAX, 'timeout' => 900];
    if (cl_is_s3($cfg)) return cl_s3_req('GET', $cfg, cl_s3_key($parts, $name), [], $o);
    return cl_http('GET', cl_dir_url($cfg, $parts) . '/' . rawurlencode($name), $cfg, $o);
}
/** A plain sentence for a failed answer, from whichever kind of server it was. */
function cl_fail_text(array $cfg, int $s, string $body, string $what): string { return cl_is_s3($cfg) ? cl_s3_status_text($s, $body, $what) : cl_status_text($s, $what); }
/** What is wrong with the settings that every run and every test needs, or '' when they are fine. */
function cl_cfg_problem(array $cfg): string {
    if ($cfg['url'] === '' || $cfg['user'] === '' || $cfg['pass'] === '') return cl_is_s3($cfg) ? 'Add the address, bucket, access key and secret key first.' : 'Add the address, user name and password first.';
    if (cl_is_s3($cfg)) {
        if (!cl_bucket_ok((string)$cfg['bucket'])) return 'The bucket name can use lower-case letters, numbers, dots and hyphens only (3 to 63 characters).';
        if (!cl_region_ok((string)$cfg['region'])) return 'The region looks like us-east-1 or eu-central-1 (letters, numbers and hyphens).';
    }
    return '';
}
/** The folder as clean pieces, or '' / message for the two folder rules. */
function cl_dir_problem(string $dir): string { return cl_dir_parts($dir) === null ? 'The folder name can use letters, numbers, spaces and . _ - ( ) only, up to three levels.' : ''; }

/* ---------- Restore from Cloud ---------- */
/** The copies in the folder that Restore may offer: [{name, size, date}], newest first. [ok, message, copies] */
function cl_copies(): array {
    $d = cl_load();
    if ($why = cl_cfg_problem($d)) return [false, $why, []];
    $parts = cl_dir_parts((string)$d['dir']);
    if ($parts === null) return [false, cl_dir_problem((string)$d['dir']), []];
    $z = cl_names($d, $parts);
    if ($z === null) return [false, 'The folder could not be read. Press Test Connection to see what is wrong.', []];
    $list = [];
    foreach ($z as $n => $size) if (preg_match(CL_COPY_RE, (string)$n, $m)) $list[] = ['name' => (string)$n, 'size' => (int)$size, 'date' => $m[1]];
    usort($list, fn($a, $b) => [$b['date'], $b['name']] <=> [$a['date'], $a['name']]);
    return [true, '', $list];
}
/** Fetches one copy into a temporary file for the browser (the file is encrypted: only the passphrase opens it, in the browser). [ok, message|path] */
function cl_fetch_copy(string $name): array {
    if (!preg_match(CL_COPY_RE, $name)) return [false, 'That is not the name of a Cloud Backup copy.'];
    $d = cl_load();
    if ($why = cl_cfg_problem($d)) return [false, $why];
    $parts = cl_dir_parts((string)$d['dir']);
    if ($parts === null) return [false, cl_dir_problem((string)$d['dir'])];
    $tmp = hub_dir('core') . '/cloud-get-' . bin2hex(random_bytes(6)) . '.tmp';
    [$s, $body, $e] = cl_get_to($d, $parts, $name, $tmp);
    if ($e !== '' || $s !== 200) {
        $err = $e !== '' ? $e : cl_fail_text($d, $s, is_file($tmp) ? (string)@file_get_contents($tmp, false, null, 0, 4096) : $body, 'fetching the copy');
        @unlink($tmp); return [false, $err];
    }
    return [true, $tmp];
}

/* ---------- the backup ---------- */
/** The whole site as an encrypted backup file's text, and its name. [ok, error|data, name, note] */
function cl_make(): array {
    require_once __DIR__ . '/backup.php';
    if (!bk_key()) return [false, 'Cloud Backup is always encrypted: set an encryption passphrase first (Settings, Security, Encryption).', '', ''];
    $pick = array_fill_keys(BK_PARTS, true); $note = '';
    try {
        require_once HUB_WEB . '/files/lib.php';
        $z = fl_usage(fl_load());
        if ($z > 0 && $z <= CL_FILES_MAX) $pick['files'] = true;
        elseif ($z > CL_FILES_MAX) $note = 'Files (' . fl_bytes($z) . ') are not in the cloud copy: it takes Files up to ' . fl_bytes(CL_FILES_MAX) . '.';
    } catch (Throwable $e) { /* no Files: nothing to add */ }
    try { $json = json_encode(bk_export($pick, true), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE); } catch (Throwable $e) { return [false, $e->getMessage(), '', '']; }
    if ($json === false) return [false, 'The backup could not be made.', '', ''];
    try { $data = bk_encrypt($json); } catch (Throwable $e) { return [false, $e->getMessage(), '', '']; }
    return [true, $data, cl_slug() . '-backup-' . date('Y-m-d') . '.enc.json', $note];
}
/** Makes a backup and uploads it. Never throws; the answer says what happened in plain words. */
function cl_run(): array {
    $d = cl_load();
    if ($why = cl_cfg_problem($d)) return ['ok' => false, 'message' => $why];
    $parts = cl_dir_parts((string)$d['dir']);
    if ($parts === null) return ['ok' => false, 'message' => cl_dir_problem((string)$d['dir'])];
    $lock = @fopen(hub_dir('core') . '/cloud.lock', 'c');
    if ($lock && !flock($lock, LOCK_EX | LOCK_NB)) return ['ok' => false, 'message' => 'A cloud backup is already running.'];
    $r = ['ok' => false, 'message' => 'Not done.']; $tmp = '';
    try {
        [$ok, $data, $name, $note] = cl_make();
        if (!$ok) { $r = ['ok' => false, 'message' => $data]; goto done; }
        [$ok, $why] = cl_prepare($d, $parts);
        if (!$ok) { $r = ['ok' => false, 'message' => $why]; goto done; }
        $tmp = hub_dir('core') . '/cloud-' . bin2hex(random_bytes(6)) . '.tmp';
        if (@file_put_contents($tmp, $data) !== strlen($data)) { $r = ['ok' => false, 'message' => 'Could not write a temporary file in site-data/core.']; goto done; }
        @chmod($tmp, 0600);
        [$s, $rb, $e] = cl_put($d, $parts, $name, $tmp);
        if ($e !== '') { $r = ['ok' => false, 'message' => $e]; goto done; }
        if (!in_array($s, [200, 201, 204], true)) { $r = ['ok' => false, 'message' => cl_fail_text($d, $s, $rb, 'the upload')]; goto done; }
        $gone = cl_tidy($d, $parts, cl_slug(), (int)$d['keep'], $name);
        $r = ['ok' => true, 'message' => 'Saved ' . $name . ($gone ? ' and removed ' . $gone . ' older ' . ($gone === 1 ? 'copy' : 'copies') : '') . '.', 'name' => $name, 'size' => strlen($data), 'note' => $note];
    } catch (Throwable $e) { $r = ['ok' => false, 'message' => 'Cloud Backup stopped: ' . $e->getMessage()]; }
    done:
    if ($tmp !== '') @unlink($tmp);
    if ($lock) { flock($lock, LOCK_UN); fclose($lock); }
    // only what this run changed is written back (a save made in Settings meanwhile stays)
    $cur = cl_load();
    if ($r['ok']) {
        $cur['last'] = time(); $cur['lastName'] = (string)$r['name']; $cur['lastSize'] = (int)$r['size']; $cur['error'] = ''; $cur['note'] = (string)($r['note'] ?? '');
        hub_settings_update(function ($s) { $s['backupLast'] = time(); return $s; });   // a copy off the server: the backup reminder starts over
    } else $cur['error'] = (string)$r['message'];
    cl_save($cur);
    return $r;
}
/** A small check of the address, the login and the folder (or the bucket): makes the folder, writes a tiny file, deletes it. */
function cl_test(array $in): array {
    $d = cl_load();
    $cfg = $d;
    foreach (['url', 'user', 'region', 'bucket'] as $k) if (isset($in[$k])) $cfg[$k] = trim((string)$in[$k]);
    if (isset($in['type']) && in_array($in['type'], ['webdav', 's3'], true)) $cfg['type'] = (string)$in['type'];
    if (($in['pass'] ?? '') !== '') $cfg['pass'] = (string)$in['pass'];
    $dir = (string)($in['dir'] ?? $d['dir']);
    $parts = cl_dir_parts($dir);
    if ($cfg['user'] === '' || $cfg['pass'] === '') return ['ok' => false, 'message' => cl_is_s3($cfg) ? 'Add the access key and the secret key first.' : 'Add the user name and password first.'];
    if ($parts === null) return ['ok' => false, 'message' => cl_dir_problem($dir)];
    if ($why = cl_cfg_problem($cfg)) return ['ok' => false, 'message' => $why];
    if (cl_is_s3($cfg)) {
        [$s, $b, $e] = cl_s3_req('GET', $cfg, '', ['list-type' => '2', 'max-keys' => '1', 'prefix' => implode('/', $parts) . '/']);
        if ($e !== '') return ['ok' => false, 'message' => $e];
        if ($s !== 200) return ['ok' => false, 'message' => cl_s3_status_text($s, $b, 'look in that bucket')];
    } else {
        [$s, , $e] = cl_http('PROPFIND', cl_base($cfg) . '/', $cfg, ['headers' => ['Depth: 0'], 'timeout' => 20]);
        if ($e !== '') return ['ok' => false, 'message' => $e];
        if ($s !== 207 && $s !== 200) return ['ok' => false, 'message' => cl_status_text($s, 'a look at that address')];
    }
    [$ok, $why] = cl_prepare($cfg, $parts);
    if (!$ok) return ['ok' => false, 'message' => $why];
    $tmp = hub_dir('core') . '/cloud-test-' . bin2hex(random_bytes(4)) . '.tmp'; @file_put_contents($tmp, 'Homebase Hub can write here.');
    $name = '.homebase-write-test-' . bin2hex(random_bytes(3)) . '.txt';
    [$s, $b, $e] = cl_put($cfg, $parts, $name, $tmp, 30); @unlink($tmp);
    if ($e !== '') return ['ok' => false, 'message' => $e];
    if (!in_array($s, [200, 201, 204], true)) return ['ok' => false, 'message' => cl_fail_text($cfg, $s, $b, 'writing a file')];
    cl_delete($cfg, $parts, $name);
    return ['ok' => true, 'message' => cl_is_s3($cfg) ? 'It works: the bucket is there and the server accepts files.' : 'It works: the folder is there and the server accepts files.'];
}
/** The schedule: called from cron.php and, without a cron job, after a page's answer. One try a day, however it ends. */
function cl_tick(): ?array {
    $d = cl_load();
    if (!$d['on'] || $d['url'] === '' || $d['pass'] === '') return null;
    $today = date('Y-m-d');
    if ($d['tried'] === $today || time() - (int)$d['last'] < (int)$d['every'] * 86400 - 3 * 3600) return null;
    if ((int)date('G') < 2) return null;   // not in the first two hours of the day
    $d['tried'] = $today; cl_save($d);
    return cl_run();
}
