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
 * Hetzner Storage Box and others) on a schedule.
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

function cl_file(): string { return hub_dir('core') . '/cloud.json'; }
function cl_defaults(): array {
    return ['on' => false, 'type' => 'webdav', 'url' => '', 'user' => '', 'pass' => '', 'dir' => 'Homebase Hub', 'every' => 1, 'keep' => 14,
            'last' => 0, 'lastName' => '', 'lastSize' => 0, 'error' => '', 'tried' => '', 'note' => ''];
}
function cl_load(): array {
    $d = hub_jread(cl_file());
    $d = is_array($d) ? array_merge(cl_defaults(), $d) : cl_defaults();
    $d['every'] = in_array((int)$d['every'], [1, 3, 7], true) ? (int)$d['every'] : 1;
    $d['keep'] = max(1, min(CL_KEEP_MAX, (int)$d['keep']));
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
            'dir' => (string)$d['dir'], 'every' => (int)$d['every'], 'keep' => (int)$d['keep'], 'last' => (int)$d['last'], 'lastName' => (string)$d['lastName'],
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
    if ($url === '') return [[], 'Add the WebDAV address first.'];
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
    if (!function_exists('curl_init')) return [0, '', 'This server\'s PHP has no cURL, which Cloud Backup needs.'];
    $port = (int)($p['port'] ?? ($p['scheme'] === 'http' ? 80 : 443));
    $ip = $p['ips'][0]; $ip = strpos($ip, ':') !== false ? "[$ip]" : $ip;
    $ch = curl_init($url);
    $body = ''; $over = false; $fh = null;
    $headers = array_merge(['Expect:'], $o['headers'] ?? []);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method, CURLOPT_RESOLVE => [strtolower((string)$p['host']) . ":$port:$ip"], CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS, CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => (int)($o['timeout'] ?? 60),
        CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2, CURLOPT_HTTPHEADER => $headers,
        CURLOPT_USERPWD => $cfg['user'] . ':' . $cfg['pass'], CURLOPT_HTTPAUTH => CURLAUTH_BASIC,
        CURLOPT_WRITEFUNCTION => function ($c, $chunk) use (&$body, &$over) { if (strlen($body) + strlen($chunk) > 2097152) { $over = true; return 0; } $body .= $chunk; return strlen($chunk); },
    ]);
    if (isset($o['file'])) {
        $fh = @fopen((string)$o['file'], 'rb');
        if (!$fh) { curl_close($ch); return [0, '', 'Could not read the backup file.']; }
        curl_setopt_array($ch, [CURLOPT_UPLOAD => true, CURLOPT_INFILE => $fh, CURLOPT_INFILESIZE => (int)filesize((string)$o['file'])]);
    } elseif (isset($o['body'])) curl_setopt($ch, CURLOPT_POSTFIELDS, (string)$o['body']);
    $ok = curl_exec($ch); $err = curl_error($ch); $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE); curl_close($ch);
    if ($fh) fclose($fh);
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
/** The names inside the backup folder. null = could not read. */
function cl_dav_list(array $cfg, array $parts): ?array {
    [$s, $xml, $e] = cl_http('PROPFIND', cl_dir_url($cfg, $parts) . '/', $cfg, ['headers' => ['Depth: 1', 'Content-Type: application/xml'], 'body' => '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>', 'timeout' => 30]);
    if ($e !== '' || $s !== 207 || preg_match('/<!(DOCTYPE|ENTITY)/i', $xml)) return null;   // no DTD, no entities: nothing in the answer can read a file or open an address
    $doc = new DOMDocument();
    if (!@$doc->loadXML($xml, LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING)) return null;
    $names = [];
    foreach ($doc->getElementsByTagNameNS('DAV:', 'href') as $h) {
        $path = (string)parse_url(trim((string)$h->textContent), PHP_URL_PATH);
        $n = rawurldecode(basename(rtrim($path, '/')));
        if ($n !== '' && substr($path, -1) !== '/') $names[] = $n;   // files only
    }
    return array_values(array_unique($names));
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
function cl_dav_tidy(array $cfg, array $parts, string $slug, int $keep, string $justMade): int {
    $names = cl_dav_list($cfg, $parts);
    if ($names === null) return 0;
    $own = cl_own_names($names, $slug);
    if (!in_array($justMade, $own, true)) return 0;   // the new copy is not seen there: delete nothing
    $gone = 0;
    foreach (array_slice($own, $keep) as $n) {
        if ($n === $justMade) continue;
        [$s] = cl_http('DELETE', cl_dir_url($cfg, $parts) . '/' . rawurlencode($n), $cfg, ['timeout' => 30]);
        if (in_array($s, [200, 202, 204, 404], true)) $gone++;
    }
    return $gone;
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
    if ($d['url'] === '' || $d['user'] === '' || $d['pass'] === '') return ['ok' => false, 'message' => 'Add the address, user name and password first.'];
    $parts = cl_dir_parts((string)$d['dir']);
    if ($parts === null) return ['ok' => false, 'message' => 'The folder name can use letters, numbers, spaces and . _ - ( ) only, up to three levels.'];
    $lock = @fopen(hub_dir('core') . '/cloud.lock', 'c');
    if ($lock && !flock($lock, LOCK_EX | LOCK_NB)) return ['ok' => false, 'message' => 'A cloud backup is already running.'];
    $r = ['ok' => false, 'message' => 'Not done.']; $tmp = '';
    try {
        [$ok, $data, $name, $note] = cl_make();
        if (!$ok) { $r = ['ok' => false, 'message' => $data]; goto done; }
        [$ok, $why] = cl_dav_mkdirs($d, $parts);
        if (!$ok) { $r = ['ok' => false, 'message' => $why]; goto done; }
        $tmp = hub_dir('core') . '/cloud-' . bin2hex(random_bytes(6)) . '.tmp';
        if (@file_put_contents($tmp, $data) !== strlen($data)) { $r = ['ok' => false, 'message' => 'Could not write a temporary file in site-data/core.']; goto done; }
        @chmod($tmp, 0600);
        [$s, , $e] = cl_http('PUT', cl_dir_url($d, $parts) . '/' . rawurlencode($name), $d, ['file' => $tmp, 'timeout' => 900]);
        if ($e !== '') { $r = ['ok' => false, 'message' => $e]; goto done; }
        if (!in_array($s, [200, 201, 204], true)) { $r = ['ok' => false, 'message' => cl_status_text($s, 'the upload')]; goto done; }
        $gone = cl_dav_tidy($d, $parts, cl_slug(), (int)$d['keep'], $name);
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
/** A small check of the address, the login and the folder: makes the folder, writes a tiny file, deletes it. */
function cl_test(array $in): array {
    $d = cl_load();
    $cfg = ['url' => (string)($in['url'] ?? $d['url']), 'user' => (string)($in['user'] ?? $d['user']), 'pass' => ($in['pass'] ?? '') !== '' ? (string)$in['pass'] : (string)$d['pass']];
    $parts = cl_dir_parts((string)($in['dir'] ?? $d['dir']));
    if ($cfg['user'] === '' || $cfg['pass'] === '') return ['ok' => false, 'message' => 'Add the user name and password first.'];
    if ($parts === null) return ['ok' => false, 'message' => 'The folder name can use letters, numbers, spaces and . _ - ( ) only, up to three levels.'];
    [$s, , $e] = cl_http('PROPFIND', cl_base($cfg) . '/', $cfg, ['headers' => ['Depth: 0'], 'timeout' => 20]);
    if ($e !== '') return ['ok' => false, 'message' => $e];
    if ($s !== 207 && $s !== 200) return ['ok' => false, 'message' => cl_status_text($s, 'a look at that address')];
    [$ok, $why] = cl_dav_mkdirs($cfg, $parts);
    if (!$ok) return ['ok' => false, 'message' => $why];
    $tmp = hub_dir('core') . '/cloud-test-' . bin2hex(random_bytes(4)) . '.tmp'; @file_put_contents($tmp, 'Homebase Hub can write here.');
    $name = '.homebase-write-test-' . bin2hex(random_bytes(3)) . '.txt';
    [$s, , $e] = cl_http('PUT', cl_dir_url($cfg, $parts) . '/' . $name, $cfg, ['file' => $tmp, 'timeout' => 30]); @unlink($tmp);
    if ($e !== '') return ['ok' => false, 'message' => $e];
    if (!in_array($s, [200, 201, 204], true)) return ['ok' => false, 'message' => cl_status_text($s, 'writing a file')];
    cl_http('DELETE', cl_dir_url($cfg, $parts) . '/' . $name, $cfg, ['timeout' => 30]);
    return ['ok' => true, 'message' => 'It works: the folder is there and the server accepts files.'];
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
