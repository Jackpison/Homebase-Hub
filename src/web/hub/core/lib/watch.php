<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli' && isset($_SERVER['SCRIPT_FILENAME']) && @realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) { http_response_code(404); exit; }   // an include file: never run on its own, even where .htaccess is ignored
/* Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
/**
 * Domain, SSL and uptime watch (Health > Domains). Run by cron.php (and when the site is open), at most:
 *   uptime every 5 minutes, domain and SSL expiry every 12 hours.
 * Stored in site-data/core/watch.php (guarded).
 *   site = { host, hosting "YYYY-MM-DD"|"" (your hosting renewal: no public source for it), up bool (check uptime),
 *            dom {exp, registrar, err, at}, ssl {exp, issuer, err, at}, st {ok, code, ms, at, fails, since, alerted} }
 * Expiry dates become tasks in Tasks (src watch:dom|ssl|host:<name>), so reminders and the digest cover them.
 * Telegram alerts: the site is down (after 2 failed checks in a row) and back up; an SSL certificate with 7 days or less.
 */
require_once __DIR__ . '/boot.php';

const WT_MAX = 25;
function wt_file(): string { return hub_dir('core') . '/watch.json'; }
function wt_load(): array {
    $d = hub_jread(wt_file()) ?? [];
    $d += ['sites' => [], 'tasks' => ['dom' => true, 'ssl' => false, 'host' => true], 'updateUrl' => '', 'update' => []];
    return $d;
}
function wt_save(array $d): bool { return hub_jput(wt_file(), json_encode($d, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE)); }
/**
 * Changes the watch file safely: under a lock, from the file as it is now. A check that runs for minutes (cron) and a
 * domain you add or delete meanwhile never undo each other. $fn(&$d) changes $d. Returns the saved data.
 */
function wt_update(callable $fn): array {
    return hub_with_lock(hub_dir('core') . '/watch-data.lock', function () use ($fn): array { $d = wt_load(); $fn($d); wt_save($d); return $d; });
}
/** "https://Shop.Example.co.uk/x" -> "shop.example.co.uk"; '' when it isn't a host name */
function wt_host(string $s): string {
    $s = strtolower(trim($s));
    if (preg_match('~^[a-z]+://~', $s)) $s = (string)parse_url($s, PHP_URL_HOST);
    $s = rtrim(preg_replace('~[/:?#].*$~', '', $s), '.');
    return preg_match('/^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/', $s) ? $s : '';
}
/** the registered domain of a host: shop.example.co.uk -> example.co.uk, links.infyi.com -> infyi.com */
function wt_regdomain(string $h): string {
    $p = explode('.', $h); $n = count($p);
    if ($n <= 2) return $h;
    $sl = $p[$n - 2];
    $two = in_array($sl, ['co', 'com', 'net', 'org', 'gov', 'ac', 'edu', 'gen', 'firm', 'ind', 'ltd', 'plc', 'me', 'nic', 'res', 'mil'], true) && strlen($p[$n - 1]) === 2;
    return implode('.', array_slice($p, $two ? -3 : -2));
}
/**
 * GET a JSON document over https (RDAP, the update address), following up to 4 redirects to other registries.
 * Every hop is checked and pinned to a public address (core/boot.php), so no redirect can reach your own network.
 */
function wt_json(string $url): ?array {
    $r = hub_get_https($url, ['Accept: application/rdap+json, application/json'], 2000000, 15);
    if (!$r || $r[0] < 200 || $r[0] >= 400) return null;
    $j = json_decode($r[1], true);
    return is_array($j) ? $j : null;
}
/** Domain expiry and registrar from RDAP (the registries' official lookup service). */
function wt_domain(string $host): array {
    $d = wt_regdomain($host);
    $j = wt_json('https://rdap.org/domain/' . rawurlencode($d));
    if (!$j) return ['exp' => '', 'registrar' => '', 'err' => 'The registry did not answer for ' . $d . ' (some domain endings have no public lookup).', 'at' => time(), 'name' => $d];
    $exp = '';
    foreach ($j['events'] ?? [] as $e) if (($e['eventAction'] ?? '') === 'expiration' && !empty($e['eventDate'])) $exp = date('Y-m-d', strtotime($e['eventDate']));
    $reg = '';
    foreach ($j['entities'] ?? [] as $en) {
        if (!in_array('registrar', (array)($en['roles'] ?? []), true)) continue;
        foreach ($en['vcardArray'][1] ?? [] as $v) if (($v[0] ?? '') === 'fn') $reg = (string)$v[3];
    }
    return ['exp' => $exp, 'registrar' => mb_substr($reg, 0, 80), 'err' => $exp ? '' : 'The registry does not publish an expiry date for ' . $d . '.', 'at' => time(), 'name' => $d];
}
/** The SSL certificate the site serves: when it ends, and who issued it. */
function wt_ssl(string $host): array {
    $ips = hub_public_ips($host);
    if (!$ips) return ['exp' => '', 'issuer' => '', 'err' => 'Not a public address.', 'at' => time()];
    // connect to the address just checked (not a second lookup), and ask for $host's certificate by name
    $v4 = array_values(array_filter($ips, function ($i) { return (bool)filter_var($i, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4); }));
    $ip = $v4[0] ?? $ips[0]; $addr = strpos($ip, ':') !== false ? '[' . $ip . ']' : $ip;
    $ctx = stream_context_create(['ssl' => ['capture_peer_cert' => true, 'verify_peer' => false, 'verify_peer_name' => false, 'SNI_enabled' => true, 'peer_name' => $host]]);
    $s = @stream_socket_client('ssl://' . $addr . ':443', $errno, $errstr, 8, STREAM_CLIENT_CONNECT, $ctx);
    if (!$s) return ['exp' => '', 'issuer' => '', 'err' => 'No HTTPS answer (' . ($errstr ?: 'connection failed') . ').', 'at' => time()];
    $p = stream_context_get_params($s); fclose($s);
    $c = isset($p['options']['ssl']['peer_certificate']) ? openssl_x509_parse($p['options']['ssl']['peer_certificate']) : null;
    if (!$c) return ['exp' => '', 'issuer' => '', 'err' => 'The certificate could not be read.', 'at' => time()];
    $iss = (string)($c['issuer']['O'] ?? ($c['issuer']['CN'] ?? ''));
    return ['exp' => date('Y-m-d', (int)$c['validTo_time_t']), 'issuer' => mb_substr($iss, 0, 80), 'err' => '', 'at' => time()];
}
/** Is the site answering? Up = any answer below 500 within 12 seconds. */
function wt_up(string $host): array {
    if (!function_exists('curl_init') || !hub_public_ips($host)) return ['ok' => false, 'code' => 0, 'ms' => 0, 'err' => 'Not a public address.'];
    $url = 'https://' . $host . '/';
    $ch = curl_init($url); hub_curl_pin($ch, $url);
    curl_setopt_array($ch, [CURLOPT_NOBODY => false, CURLOPT_RETURNTRANSFER => false, CURLOPT_FOLLOWLOCATION => false, CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_TIMEOUT => 12,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (site uptime check)', CURLOPT_RANGE => '0-2047',
        CURLOPT_WRITEFUNCTION => function ($c, $d) { return strlen($d); }]);
    $t = microtime(true); curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
    return ['ok' => $code > 0 && $code < 500, 'code' => $code, 'ms' => (int)round((microtime(true) - $t) * 1000), 'err' => $code ? '' : ($err ?: 'no answer')];
}

/** Keeps the renewal tasks in Tasks in step with what the checks found (and with your hosting dates). */
function wt_sync_tasks(array $d): void {
    $file = HUB_WEB . '/tasks/lib.php';
    if (!is_file($file)) return;
    require_once $file;
    $want = [];
    foreach ($d['sites'] as $s) {
        $dn = $s['dom']['name'] ?? wt_regdomain($s['host']);
        if (!empty($d['tasks']['dom']) && !empty($s['dom']['exp'])) $want['watch:dom:' . $dn] = ['Domain Renewal: ' . $dn, $s['dom']['exp'], 'Domain', 30, $s['dom']['registrar'] ? 'Registrar: ' . $s['dom']['registrar'] : ''];
        if (!empty($d['tasks']['ssl']) && !empty($s['ssl']['exp'])) $want['watch:ssl:' . $s['host']] = ['SSL Certificate: ' . $s['host'], $s['ssl']['exp'], 'SSL', 14, $s['ssl']['issuer'] ? 'Issuer: ' . $s['ssl']['issuer'] : ''];
        if (!empty($d['tasks']['host']) && !empty($s['hosting'])) $want['watch:host:' . $dn] = ['Hosting Renewal: ' . $dn, $s['hosting'], 'Hosting', 30, ''];
    }
    tasks_modify(function (&$data) use ($want) {
        $changed = false; $have = [];
        foreach ($data['tasks'] as &$t) {
            if ($t['src'] === '' || strpos($t['src'], 'watch:') !== 0) continue;
            $have[$t['src']] = true;
            if (!isset($want[$t['src']])) continue;   // no longer watched: left as it is (yours to delete)
            [$name, $due, , , $note] = $want[$t['src']];
            // a renewed domain shows a later expiry: the task moves there and is active again
            if ($t['due'] !== $due && ($due > $t['due'] || $t['status'] === 'active')) { $t['due'] = $due; $t['day'] = (int)substr($due, 8, 2); $t['status'] = 'active'; $t['doneAt'] = 0; $t['updated'] = time(); $changed = true; }
            if ($note !== '' && strpos($t['notes'], $note) === false) { $t['notes'] = trim($note . "\n" . $t['notes']); $changed = true; }
        }
        unset($t);
        foreach ($want as $src => [$name, $due, $cat, $remind, $note]) {
            if (isset($have[$src])) continue;
            $data['tasks'][] = ['name' => $name, 'due' => $due, 'repeat' => ['n' => 1, 'unit' => 'none'], 'cat' => $cat, 'remind' => $remind, 'mode' => 'online',
                                'notes' => trim($note . "\nAdded by the domain watch (Health > Domains)."), 'src' => $src, 'status' => 'active', 'created' => time(), 'updated' => time()];
            $changed = true;
        }
        return $changed;
    });
}

/**
 * Runs what is due (or everything when $force; only the host $only when given). Returns the watch data.
 * Sends Telegram alerts through notify.php. The checks run without holding the file; the results are merged into the
 * file as it is at the end, so anything you changed meanwhile stays.
 */
function wt_run(bool $force = false, ?string $only = null): array {
    $lk = @fopen(hub_dir('core') . '/watch.lock', 'c');
    if (!$lk || !flock($lk, LOCK_EX | LOCK_NB)) return wt_load();
    $d = wt_load(); $now = time(); $alerts = []; $expiryRan = false;
    foreach ($d['sites'] as &$s) {
        if ($only !== null && $s['host'] !== $only) continue;
        if ($force || $now - (int)($s['dom']['at'] ?? 0) > 43200) { $s['dom'] = wt_domain($s['host']); $expiryRan = true; }
        if ($force || $now - (int)($s['ssl']['at'] ?? 0) > 43200) {
            $s['ssl'] = wt_ssl($s['host']); $expiryRan = true;
            $left = $s['ssl']['exp'] ? (int)floor((strtotime($s['ssl']['exp']) - $now) / 86400) : null;
            if ($left !== null && $left <= 7 && ($s['sslWarned'] ?? '') !== $s['ssl']['exp']) {
                $alerts[] = '🔒 <b>SSL Certificate Ending</b>' . "\n" . nt_h2($s['host']) . ': ' . ($left < 0 ? 'ended ' . -$left . ' days ago' : 'ends in ' . $left . ($left === 1 ? ' day' : ' days')) . ' (' . nt_h2($s['ssl']['exp']) . ').' .
                            "\nIf your host or Cloudflare renews it automatically, check that renewal is working.";
                $s['sslWarned'] = $s['ssl']['exp'];
            }
        }
        if (!empty($s['up']) && ($force || $now - (int)($s['st']['at'] ?? 0) > 270)) {
            $r = wt_up($s['host']); $st = $s['st'] ?? ['ok' => true, 'fails' => 0, 'since' => $now, 'alerted' => false];
            if ($r['ok']) {
                if (!empty($st['alerted'])) $alerts[] = '✅ <b>Back Up</b>' . "\n" . nt_h2($s['host']) . ' answers again (' . $r['code'] . ', ' . $r['ms'] . ' ms). It was down for about ' . wt_dur($now - (int)$st['since']) . '.';
                $st = ['ok' => true, 'fails' => 0, 'since' => !empty($st['ok']) ? (int)($st['since'] ?? $now) : $now, 'alerted' => false];
            } else {
                $st['fails'] = (int)($st['fails'] ?? 0) + 1;
                if (!empty($st['ok'])) $st['since'] = $now;
                $st['ok'] = false;
                if ($st['fails'] >= 2 && empty($st['alerted'])) { $alerts[] = '🔴 <b>Site Down</b>' . "\n" . nt_h2($s['host']) . ' is not answering (' . ($r['code'] ? 'error ' . $r['code'] : $r['err']) . '), checked twice. You will get a message when it is back.'; $st['alerted'] = true; }
            }
            $s['st'] = $st + ['code' => $r['code'], 'ms' => $r['ms'], 'at' => $now];
            $s['st']['code'] = $r['code']; $s['st']['ms'] = $r['ms']; $s['st']['at'] = $now;
        }
    }
    unset($s);
    $res = []; foreach ($d['sites'] as $s) $res[$s['host']] = $s;
    $d = wt_update(function (&$cur) use ($res) {
        foreach ($cur['sites'] as &$s) {
            $n = $res[$s['host']] ?? null; if (!$n) continue;   // deleted meanwhile: stays deleted
            foreach (['dom', 'ssl', 'sslWarned'] as $k) if (array_key_exists($k, $n)) $s[$k] = $n[$k];
            if (!empty($s['up']) && isset($n['st'])) $s['st'] = $n['st'];   // uptime turned off meanwhile: stays off
        }
        unset($s);
    });
    flock($lk, LOCK_UN); fclose($lk);
    if ($expiryRan || $force) wt_sync_tasks($d);
    if ($alerts) { require_once __DIR__ . '/notify.php'; $n = nt_load(); if ($n['token'] !== '' && $n['chat'] !== '') foreach ($alerts as $a) nt_send($n, $a); }
    return $d;
}
function wt_dur(int $sec): string { return $sec < 3600 ? max(1, (int)round($sec / 60)) . ' minutes' : ($sec < 172800 ? round($sec / 3600, 1) . ' hours' : round($sec / 86400) . ' days'); }
function nt_h2($s): string { return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
