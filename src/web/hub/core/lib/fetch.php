<?php
/* Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
declare(strict_types=1);
if (!defined('HUB')) { http_response_code(404); exit; }   // only boot.php loads this file

/**
 * Hub core, part 3 of 4 (split out of boot.php in 1.62.6; boot.php loads it): reaching other websites safely.
 * hub_fetch() is the one fetcher Home's pictures and Links' icons and titles use: public addresses only, redirects checked, size and time limited. */

/* ======================= reaching other websites safely ======================= */

/** True for an address on the public internet (not this server, the hosting network, or anything private/reserved). */
function hub_ip_public(string $ip): bool {
    if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return false;
    // ranges older PHP versions don't treat as private/reserved, and IPv6 forms that can wrap an internal IPv4 address
    foreach (['0.0.0.0/8', '100.64.0.0/10', '127.0.0.0/8', '169.254.0.0/16', '192.0.0.0/24', '192.0.2.0/24', '198.18.0.0/15',
              '198.51.100.0/24', '203.0.113.0/24', '224.0.0.0/3', '::/127', '::ffff:0:0/96', '64:ff9b::/96', '64:ff9b:1::/48',
              '100::/64', '2001:db8::/32', '2002::/16', 'fc00::/7', 'fe80::/10', 'fec0::/10', 'ff00::/8'] as $c) {
        if (hub_ip_in($ip, $c)) return false;
    }
    return true;
}
/**
 * Every IPv4 and IPv6 address a host name points to, or [] when ANY of them is not public (or the name doesn't resolve).
 * Checking IPv6 too matters: a name with a public IPv4 and an internal IPv6 address must not get through.
 */
function hub_public_ips(string $host): array {
    static $cache = [];
    $host = strtolower(rtrim(trim($host, '[]'), '.'));
    if ($host === '') return [];
    if (isset($cache[$host])) return $cache[$host];
    if (filter_var($host, FILTER_VALIDATE_IP)) $ips = [$host];
    elseif (preg_match('/(^|\.)(localhost|local|internal|intranet|lan|home\.arpa)$/', $host)) $ips = [];
    else {
        $ips = [];
        $recs = function_exists('dns_get_record') ? @dns_get_record($host, DNS_A | DNS_AAAA) : false;
        foreach (is_array($recs) ? $recs : [] as $r) { if (!empty($r['ip'])) $ips[] = $r['ip']; if (!empty($r['ipv6'])) $ips[] = $r['ipv6']; }
        if (!$ips) $ips = @gethostbynamel($host) ?: [];
    }
    foreach ($ips as $ip) if (!hub_ip_public($ip)) { $ips = []; break; }
    return $cache[$host] = array_values(array_unique($ips));
}
/**
 * Pins a cURL handle to an address hub_public_ips() approved, so DNS can't answer differently between the check and the
 * connection ("DNS rebinding"). False = not a public host: don't connect.
 */
function hub_curl_pin($ch, string $url): bool {
    // PHP and some older cURL builds read "https://10.0.0.1\\@example.com" differently (different host): refuse anything that could be read two ways
    if (strpos($url, '\\') !== false || preg_match('~[\x00-\x20\x7F]~', $url) || preg_match('~^[a-z][a-z0-9+.-]*://[^/?#]*@~i', $url)) return false;
    $p = parse_url($url);
    $host = strtolower(trim((string)($p['host'] ?? ''), '[]'));
    $ips = hub_public_ips($host);
    if (!$ips) return false;
    if (defined('CURLPROTO_HTTP')) { curl_setopt($ch, CURLOPT_PROTOCOLS, CURLPROTO_HTTP | CURLPROTO_HTTPS); }
    if (filter_var($host, FILTER_VALIDATE_IP)) return true;   // a bare address: nothing to look up
    $port = (int)($p['port'] ?? (strtolower((string)($p['scheme'] ?? '')) === 'http' ? 80 : 443));
    $v4 = array_values(array_filter($ips, function ($i) { return (bool)filter_var($i, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4); }));
    $ip = $v4[0] ?? $ips[0];
    curl_setopt($ch, CURLOPT_RESOLVE, ["$host:$port:" . (strpos($ip, ':') !== false ? "[$ip]" : $ip)]);
    return true;
}
/** The address a redirect (Location: $rel) points to, seen from $base. */
function hub_url_join(string $base, string $rel): string {
    $rel = trim($rel);
    if ($rel === '') return $base;
    if (preg_match('~^[a-z][a-z0-9+.-]*:~i', $rel)) return $rel;
    $p = parse_url($base); $scheme = $p['scheme'] ?? 'https';
    $origin = $scheme . '://' . ($p['host'] ?? '') . (isset($p['port']) ? ':' . $p['port'] : '');
    if (strncmp($rel, '//', 2) === 0) return $scheme . ':' . $rel;
    if ($rel[0] === '/') return $origin . $rel;
    $path = $p['path'] ?? '/';
    return $origin . substr($path, 0, (int)strrpos($path, '/') + 1) . $rel;
}
/**
 * GET over https only, for addresses that come from outside (an update address, RDAP): every redirect hop is checked
 * and pinned like the first one, so a public address can never bounce the server onto your own network.
 * Returns [httpCode, body] or null.
 */
function hub_get_https(string $url, array $headers = [], int $maxBytes = 2000000, int $timeout = 15): ?array {
    if (!function_exists('curl_init')) return null;
    for ($hop = 0; $hop < 5; $hop++) {
        if (!preg_match('~^https://~i', $url)) return null;
        $ch = curl_init($url);
        if (!hub_curl_pin($ch, $url)) { curl_close($ch); return null; }
        $loc = ''; $buf = '';
        curl_setopt_array($ch, [CURLOPT_FOLLOWLOCATION => false, CURLOPT_CONNECTTIMEOUT => 6, CURLOPT_TIMEOUT => $timeout,
            CURLOPT_HTTPHEADER => $headers, CURLOPT_USERAGENT => 'Mozilla/5.0 (site check)', CURLOPT_ENCODING => '',
            CURLOPT_HEADERFUNCTION => function ($c, $h) use (&$loc) { if (stripos($h, 'location:') === 0) $loc = trim(substr($h, 9)); return strlen($h); },
            CURLOPT_WRITEFUNCTION => function ($c, $chunk) use (&$buf, $maxBytes) { $buf .= $chunk; return strlen($buf) > $maxBytes ? 0 : strlen($chunk); }]);
        if (defined('CURLPROTO_HTTPS')) curl_setopt($ch, CURLOPT_PROTOCOLS, CURLPROTO_HTTPS);
        $ok = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
        if ($ok === false) return null;
        if ($code >= 300 && $code < 400 && $loc !== '') { $url = hub_url_join($url, $loc); continue; }
        return [$code, $buf];
    }
    return null;
}
/**
 * GET from another website over http or https, public internet only: Home's pictures and Links' icons and titles (1.53.2; each
 * had its own copy before). Every redirect hop is checked and pinned like the first address, so a public address can never
 * bounce the server onto your own network. Options:
 *   headers  extra request headers         ua       User-Agent                 hops     addresses tried in all (5)
 *   max      bytes kept (2 MB)             timeout  seconds in all (12)        connect  seconds to connect (6)
 *   save     a file: the answer is written there as it arrives (never held in memory); 'body' is then ''
 *   stop     text: stop reading once it has arrived (a page's </head>)
 *   cut      true: an answer longer than max is cut there instead of failing
 *   insecure true: on an https certificate problem try once more without checking it (some hosts ship no CA list).
 *            Never when the address carries a key or token, so a key is never sent where the site might not be the real one.
 * Returns ['status', 'body', 'url' (the last hop), 'type'] or ['error' => message, 'url'].
 */
function hub_fetch(string $url, array $o = []): array {
    $max = (int)($o['max'] ?? 2000000); $save = $o['save'] ?? null; $stop = $o['stop'] ?? null;
    $headers = $o['headers'] ?? []; if (isset($o['ua'])) $headers[] = 'User-Agent: ' . $o['ua'];
    $hops = (int)($o['hops'] ?? 5);
    for ($hop = 0; $hop < $hops; $hop++) {
        $p = parse_url($url);
        if (!$p || !in_array(strtolower($p['scheme'] ?? ''), ['http', 'https'], true) || empty($p['host'])) return ['error' => 'Bad address', 'url' => $url];
        // an address different parsers read differently (a backslash, a space, "user@"): refused, with or without cURL
        if (strpos($url, '\\') !== false || preg_match('~[\x00-\x20\x7F]~', $url) || preg_match('~^[a-z][a-z0-9+.-]*://[^/?#]*@~i', $url) || !hub_fetch_host_ok($p)) return ['error' => 'Can\'t reach ' . $p['host'], 'url' => $url];
        $status = 0; $body = ''; $type = ''; $loc = '';
        if (function_exists('curl_init')) {
            $insecure = !empty($o['insecure']) && !preg_match('~[?&#](key|api_?key|apikey|client_id|token|access_token|auth|sig|signature)=~i', $url);
            $ok = false; $err = ''; $over = false; $stopped = false;
            for ($try = 0; $try < 2; $try++) {
                $fh = null; $body = ''; $got = 0; $over = false; $stopped = false; $loc = ''; $type = '';
                if ($save !== null && !($fh = @fopen($save, 'wb'))) return ['error' => 'Can\'t save the download (the temporary folder is not writable)', 'url' => $url];
                $ch = curl_init($url);
                if (!hub_fetch_pin($ch, $url, $p)) { curl_close($ch); if ($fh) fclose($fh); return ['error' => 'Can\'t reach ' . $p['host'], 'url' => $url]; }   // connect only to the address just checked
                curl_setopt_array($ch, [
                    CURLOPT_FOLLOWLOCATION => false, CURLOPT_CONNECTTIMEOUT => (int)($o['connect'] ?? 6), CURLOPT_TIMEOUT => (int)($o['timeout'] ?? 12),
                    CURLOPT_HTTPHEADER => $headers, CURLOPT_ENCODING => '',
                    CURLOPT_SSL_VERIFYPEER => $try === 0, CURLOPT_SSL_VERIFYHOST => $try === 0 ? 2 : 0,
                    CURLOPT_HEADERFUNCTION => function ($c, $h) use (&$loc, &$type) {
                        if (stripos($h, 'location:') === 0) $loc = trim(substr($h, 9));
                        if (stripos($h, 'content-type:') === 0) $type = trim(substr($h, 13));
                        return strlen($h);
                    },
                    CURLOPT_WRITEFUNCTION => function ($c, $chunk) use (&$body, &$got, &$over, &$stopped, $fh, $max, $stop) {
                        $n = strlen($chunk);
                        if ($got + $n > $max) { $over = true; $chunk = substr($chunk, 0, max(0, $max - $got)); }
                        $got += strlen($chunk);
                        if ($fh) fwrite($fh, $chunk);
                        else {
                            $from = max(0, strlen($body) - 16); $body .= $chunk;
                            if ($stop !== null && stripos($body, $stop, $from) !== false) { $stopped = true; return 0; }   // got what is needed
                        }
                        return $over ? 0 : $n;
                    },
                ]);
                $ok = curl_exec($ch); $errno = curl_errno($ch); $err = curl_error($ch);
                $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE); curl_close($ch);
                if ($fh) fclose($fh);
                if ($try === 0 && $insecure && in_array($errno, [35, 51, 58, 60, 77, 83], true)) continue;   // certificate trouble: once more without checking
                break;
            }
            if ($over && empty($o['cut'])) return ['error' => 'The answer is larger than ' . round($max / 1048576, 1) . ' MB', 'url' => $url];
            if ($ok === false && !$over && !$stopped) return ['error' => $err ?: 'Connection failed', 'url' => $url];
        } elseif (ini_get('allow_url_fopen')) {
            $ctx = stream_context_create(['http' => ['header' => implode("\r\n", $headers), 'follow_location' => 0, 'timeout' => (int)($o['timeout'] ?? 12), 'ignore_errors' => true]]);
            $in = @fopen($url, 'rb', false, $ctx);
            if (!$in) return ['error' => 'Connection failed', 'url' => $url];
            $meta = stream_get_meta_data($in);
            if ($save !== null) {
                $fh = @fopen($save, 'wb');
                if (!$fh) { fclose($in); return ['error' => 'Can\'t save the download (the temporary folder is not writable)', 'url' => $url]; }
                stream_copy_to_stream($in, $fh, $max); fclose($fh);
            } else $body = (string)stream_get_contents($in, $max);
            fclose($in);
            foreach ($meta['wrapper_data'] ?? [] as $h) {
                if (!is_string($h)) continue;
                if (preg_match('~^HTTP/\S+\s+(\d+)~', $h, $m)) { $status = (int)$m[1]; $loc = ''; }
                elseif (stripos($h, 'location:') === 0) $loc = trim(substr($h, 9));
                elseif (stripos($h, 'content-type:') === 0) $type = trim(substr($h, 13));
            }
        } else return ['error' => 'Your host blocks outgoing connections (enable the curl extension)', 'url' => $url];
        if ($status >= 300 && $status < 400 && $loc !== '') { $url = hub_url_join($url, $loc); continue; }
        return ['status' => $status, 'body' => $body, 'url' => $url, 'type' => $type];
    }
    return ['error' => 'Too many redirects', 'url' => $url];
}
/** hub_fetch's address check. Only the unit test's own small server can count as public, while that test runs (HUB_TEST_PUBLIC). */
function hub_fetch_test_host(array $p): bool {
    return defined('HUB_TEST_PUBLIC') && in_array(strtolower((string)$p['host']) . ':' . ($p['port'] ?? ''), (array)constant('HUB_TEST_PUBLIC'), true);
}
function hub_fetch_host_ok(array $p): bool { return hub_fetch_test_host($p) || (bool)hub_public_ips((string)$p['host']); }
function hub_fetch_pin($ch, string $url, array $p): bool {
    if (hub_fetch_test_host($p)) { if (defined('CURLPROTO_HTTP')) curl_setopt($ch, CURLOPT_PROTOCOLS, CURLPROTO_HTTP | CURLPROTO_HTTPS); return true; }
    return hub_curl_pin($ch, $url);
}
/** An SVG icon is only kept when nothing in it can run code or load other files. */
function hub_svg_safe(string $b): bool {
    if (strlen($b) > 600000) return false;
    if (preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', $b)) return false;   // control characters are never in a real SVG, and can split a keyword past this filter
    $x = preg_replace('/\s+/', ' ', $b);
    // an event handler can follow a space, "/" or a closing quote (browsers' HTML parser accepts all three); url() may only point inside the file or at an embedded image
    return !preg_match('~<script|<foreignobject|<iframe|<embed|<object|<handler|<listener|<!entity|<!doctype(?! svg)|<\?xml-stylesheet|'
        . '[\s/"\']on[a-z]+\s*=|javascript:|vbscript:|data:text|&#|<set\b|<animate|<use\b|@import|expression\s*\(|'
        . 'url\(\s*+["\']?+\s*+(?!#|data:image/(?:png|jpe?g|gif|webp);)|'
        . 'href\s*+=\s*+["\']?+\s*+(?!#|data:image/(?:png|jpe?g|gif|webp);)~i', $x);
}
