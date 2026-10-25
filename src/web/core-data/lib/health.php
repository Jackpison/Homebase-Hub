<?php
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
 * Health (Settings > Health): disk use per section, backups, recent PHP errors from your host's error_log files, the schedule,
 * the Telegram bot, server limits, and update checks (files left from an earlier update; an optional update address).
 */
require_once __DIR__ . '/boot.php';
require_once __DIR__ . '/backup.php';

/** Bytes and file count of a folder (stops counting after 30,000 files so a huge folder can't slow the page). */
function health_size(string $dir): array {
    $b = 0; $n = 0;
    if (!is_dir($dir)) return ['bytes' => 0, 'files' => 0];
    try {
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS));
        foreach ($it as $f) { if ($f->isFile()) { $b += $f->getSize(); if (++$n >= 30000) break; } }
    } catch (Throwable $e) {}
    return ['bytes' => $b, 'files' => $n];
}
/** True when this file inside the site can be opened from the internet, false when it cannot, null when it could not be tested. */
function health_is_public(string $rel): ?bool {
    static $n = 0;
    if (!function_exists('curl_init') || ++$n > 5 || !($base = nt_site_url())) return null;
    $ch = curl_init($base . str_replace('%2F', '/', rawurlencode($rel)));
    curl_setopt_array($ch, [CURLOPT_NOBODY => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 4, CURLOPT_CONNECTTIMEOUT => 3, CURLOPT_FOLLOWLOCATION => false, CURLOPT_SSL_VERIFYPEER => false, CURLOPT_SSL_VERIFYHOST => 0]);
    @curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    return $code === 0 ? null : $code === 200;
}
/** How fast the saved data of each section reads here (a slow disk or a very large file is the usual reason a page starts slowly). */
function health_speed(): array {
    $sd = hub_data_root(); $rows = [];
    foreach (['links' => 'Links', 'info' => 'Info', 'cards' => 'Cards', 'tasks' => 'Tasks', 'home' => 'Start Page'] as $app => $name) {
        $best = null;
        foreach (glob($sd . '/' . $app . '/*.{php,json}', GLOB_BRACE) ?: [] as $f) if (!$best || filesize($f) > filesize($best)) $best = $f;
        if (!$best) { $rows[] = ['name' => $name, 'bytes' => 0, 'ms' => 0]; continue; }
        $t = microtime(true); $raw = (string)@file_get_contents($best); $d = json_decode(preg_replace('/^<\?php.*?\?>\s*/s', '', $raw), true);
        $rows[] = ['name' => $name, 'bytes' => strlen($raw), 'ms' => round((microtime(true) - $t) * 1000, 1), 'ok' => $d !== null || $raw === ''];
    }
    $op = function_exists('opcache_get_status') ? @opcache_get_status(false) : null;
    return ['rows' => $rows, 'opcache' => is_array($op) ? !empty($op['opcache_enabled']) : false, 'request_ms' => round((microtime(true) - (float)($_SERVER['REQUEST_TIME_FLOAT'] ?? microtime(true))) * 1000, 1)];
}
/**
 * "Test a restore": builds a full backup of today's data, and when backups are encrypted locks it and opens it again with the stored key.
 * Nothing is written or changed. Also checks that the saved earlier versions can still be read.
 */
function health_verify_backup(): array {
    $checks = [];
    $add = function ($name, $ok, $note = '') use (&$checks) { $checks[] = ['name' => $name, 'ok' => (bool)$ok, 'note' => $note]; };
    try {
        $pick = array_fill_keys(BK_PARTS, true);
        $json = json_encode(bk_export($pick), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        $parts = $json === false ? null : bk_normalize(json_decode($json, true));
        $add('A full backup can be made', is_string($json) && strlen($json) > 20, is_string($json) ? round(strlen($json) / 1024) . ' KB' : '');
        $add('It reads back as a site backup', is_array($parts) && count($parts) >= 1, is_array($parts) ? implode(', ', array_keys($parts)) : '');
        if ($k = bk_key()) {
            $enc = bk_encrypt($json); $back = bk_decrypt($enc, $k);
            $add('Locking it with the backup key works', strlen($enc) > 100);
            $add('Opening it again gives the same data', $back !== null && hash_equals(md5($json), md5($back)), $back === null ? 'could not be opened' : 'identical');
        } else $add('Backup encryption', true, 'off (backups are plain files)');
    } catch (Throwable $e) { $add('Backup test', false, $e->getMessage()); }
    $sd = hub_data_root();
    foreach (['links' => [$sd . '/links/backups', '*.php'], 'info' => [$sd . '/info/versions', '*.php'], 'cards' => [$sd . '/cards/versions', '*.php'], 'tasks' => [$sd . '/tasks/versions', '*.php']] as $app => [$dir, $pat]) {
        $files = glob($dir . '/' . $pat) ?: []; if (!$files) continue; sort($files); $f = end($files);
        $raw = preg_replace('/^<\?php.*?\?>\s*/s', '', (string)@file_get_contents($f));
        $add('Newest earlier version of ' . ucfirst($app) . ' is readable', json_decode($raw, true) !== null, basename($f));
    }
    return ['ok' => !array_filter($checks, function ($c) { return !$c['ok']; }), 'checks' => $checks];
}
/** The error_log files PHP writes for this site (cPanel puts one in each folder that had an error). */
function health_logs(): array {
    $cand = [HUB_PUBLIC . '/error_log', HUB_WEB . '/error_log'];
    foreach (glob(HUB_WEB . '/*/error_log') ?: [] as $f) $cand[] = $f;
    foreach (glob(HUB_WEB . '/*/*/error_log') ?: [] as $f) $cand[] = $f;
    $cand[] = HUB_CORE . '/error_log';   // errors of the engine (core is beside web, not inside it)
    foreach (glob(HUB_CORE . '/*/error_log') ?: [] as $f) $cand[] = $f;
    $ini = (string)ini_get('error_log');
    if ($ini !== '' && strpos($ini, 'syslog') === false && @is_file($ini) && @is_readable($ini)) $cand[] = $ini;
    $out = []; $seen = [];
    foreach ($cand as $f) {
        $r = @realpath($f); if (!$r || isset($seen[$r]) || !@is_readable($r)) continue; $seen[$r] = true;
        $size = (int)@filesize($r); $tail = '';
        if ($size > 0 && ($fh = @fopen($r, 'rb'))) { fseek($fh, max(0, $size - 65536)); $tail = (string)fread($fh, 65536); fclose($fh); }
        $lines = array_values(array_filter(preg_split('/\r?\n/', $tail), 'strlen'));
        if ($size > 65536) array_shift($lines);   // the first line may be cut
        $inSite = strpos($r, realpath(HUB_PUBLIC) . DIRECTORY_SEPARATOR) === 0;
        $rel = $inSite ? substr($r, strlen(realpath(HUB_PUBLIC)) + 1) : $r;
        $out[] = ['file' => $rel, 'size' => $size, 'at' => (int)@filemtime($r),
                  'lines' => array_slice($lines, -40), 'clear' => $inSite && basename($r) === 'error_log',
                  'public' => $inSite && basename($r) === 'error_log' ? health_is_public($rel) : null];
    }
    usort($out, function ($a, $b) { return $b['at'] <=> $a['at']; });
    return $out;
}
/** Clears an error_log inside the site folder (never anything else). */
function health_clear_log(string $rel): bool {
    $p = @realpath(HUB_PUBLIC . '/' . $rel);
    if (!$p || basename($p) !== 'error_log' || strpos($p, realpath(HUB_PUBLIC) . DIRECTORY_SEPARATOR) !== 0) return false;
    return @file_put_contents($p, '') !== false;
}
/** Recursively removes one old Tools asset folder (only ever called for web/tools/assets*). */
function health_rmdir(string $dir): void {
    try {
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
        foreach ($it as $f) { $f->isDir() && !$f->isLink() ? @rmdir($f->getPathname()) : @unlink($f->getPathname()); }
    } catch (Throwable $e) {}
    @rmdir($dir);
}
/**
 * Files left from an earlier update (the old Read Later list, an old setup-code file, older Tools asset folders) are
 * deleted here by themselves. Only what could not be deleted, and pages that still load an older shell, are listed.
 */
function health_leftovers(): array {
    $issues = [];
    $gone = array_merge([hub_dir('core') . '/SETUP-CODE.txt'], glob(hub_dir('links') . '/readlater*') ?: []);
    foreach ($gone as $f) if (is_file($f) && !@unlink($f)) $issues[] = str_replace(HUB_PUBLIC . '/', '', $f) . ' is left from an older version and can be deleted by hand.';
    $pages = ['Start Page' => HUB_WEB . '/home/index.php', 'Links' => HUB_WEB . '/links/index.html', 'Info' => HUB_WEB . '/info/index.html',
              'Cards' => HUB_WEB . '/cards/index.html', 'Tasks' => HUB_WEB . '/tasks/index.html', 'Tools' => HUB_WEB . '/tools/index.html', 'Settings' => HUB_WEB . '/settings/index.html'];
    foreach ($pages as $name => $f) {
        $t = (string)@file_get_contents($f);
        if (preg_match('/shell\.js\?v=([0-9.]+)/', $t, $m) && $m[1] !== HUB) $issues[] = $name . ' still loads version ' . $m[1] . ' (the site is ' . HUB . '): upload the whole update again.';
    }
    $tools = (string)@file_get_contents(HUB_WEB . '/tools/index.html');
    foreach (glob(HUB_WEB . '/tools/assets*', GLOB_ONLYDIR) ?: [] as $dir) {
        if ($tools === '' || strpos($tools, basename($dir) . '/') !== false) continue;
        health_rmdir($dir);
        if (is_dir($dir)) $issues[] = 'web/tools/' . basename($dir) . ' is from an older version and can be deleted by hand.';
    }
    return $issues;
}
/** Optional: an address that publishes {"version": "1.18.0", "notes": "...", "url": "..."}. Checked at most once a day. */
function health_check_update(?string $url = null): array {
    require_once __DIR__ . '/watch.php';
    $d = wt_load();
    if ($url !== null) {
        $url = trim($url);
        if ($url !== '' && !preg_match('~^https://[^\s<>"]+$~i', $url)) return ['err' => 'The update address must start with https://.', 'url' => $d['updateUrl']];
        $d['updateUrl'] = $url; $d['update'] = [];
        wt_update(function (&$x) use ($url) { $x['updateUrl'] = $url; $x['update'] = []; });
    }
    if ($d['updateUrl'] === '') return ['url' => ''];
    $u = $d['update'] ?? [];
    if ($url !== null || time() - (int)($u['at'] ?? 0) > 86400) {
        $host = (string)parse_url($d['updateUrl'], PHP_URL_HOST);
        $j = hub_public_ips($host) ? wt_json($d['updateUrl']) : null;
        $u = $j && preg_match('/^\d+(\.\d+){1,3}$/', (string)($j['version'] ?? ''))
            ? ['at' => time(), 'version' => (string)$j['version'], 'notes' => mb_substr(strip_tags((string)($j['notes'] ?? '')), 0, 600), 'link' => preg_match('~^https://~', (string)($j['url'] ?? '')) ? (string)$j['url'] : '', 'err' => '']
            : ['at' => time(), 'err' => 'The update address did not answer with a version.'];
        $d['update'] = $u; $upd = $d['updateUrl'];
        wt_update(function (&$x) use ($u, $upd) { if ($x['updateUrl'] === $upd) $x['update'] = $u; });   // only the result: never undoes the domain list
    }
    return $u + ['url' => $d['updateUrl'], 'newer' => !empty($u['version']) && version_compare($u['version'], HUB, '>')];
}
function health_report(): array {
    require_once __DIR__ . '/notify.php';
    require_once __DIR__ . '/watch.php';
    $sd = hub_data_root();
    $sec = [
        ['Links', $sd . '/links'], ['Info', $sd . '/info'], ['Cards', $sd . '/cards'], ['Tasks', $sd . '/tasks'], ['Start page data', $sd . '/home'],
        ['Site settings and logins', $sd . '/core'], ['Sessions', $sd . '/sessions'],
        ['Start page photos', HUB_CORE . '/media/home/photos'], ['Start page uploads', HUB_CORE . '/media/home/uploads'], ['Link icons', HUB_CORE . '/media/links/icons'],
        ['Site code', HUB_WEB],
    ];
    $sizes = []; $total = 0;
    foreach ($sec as [$name, $dir]) { $s = health_size($dir); $sizes[] = ['name' => $name, 'bytes' => $s['bytes'], 'files' => $s['files']]; }
    // the code is the pages (web) plus the engine (core) without the media folders, which are counted on their own
    $core = health_size(HUB_CORE); $code = &$sizes[count($sizes) - 1];
    $code['bytes'] += $core['bytes']; $code['files'] += $core['files'];
    foreach ([7, 8, 9] as $i) { $code['bytes'] -= $sizes[$i]['bytes']; $code['files'] -= $sizes[$i]['files']; } unset($code);
    foreach ($sizes as $s) $total += $s['bytes'];
    $vers = [];
    foreach (['links' => [$sd . '/links/backups', 'bookmarks-*.php'], 'info' => [$sd . '/info/versions', '*.php'], 'cards' => [$sd . '/cards/versions', '*.php'],
              'tasks' => [$sd . '/tasks/versions', '*.php'], 'home' => [$sd . '/home/versions', '*.php']] as $app => [$dir, $pat]) {
        $f = glob($dir . '/' . $pat) ?: []; $b = 0; foreach ($f as $x) $b += (int)@filesize($x);
        $vers[$app] = ['count' => count($f), 'bytes' => $b];
    }
    $s = hub_settings(); $n = nt_load(); $k = bk_key();
    $free = function_exists('disk_free_space') ? @disk_free_space(HUB_PUBLIC) : false;
    $ext = [];
    foreach (['curl', 'openssl', 'mbstring', 'gd', 'zip', 'zlib', 'intl', 'fileinfo'] as $e) $ext[$e] = extension_loaded($e);
    return [
        'version' => HUB, 'php' => PHP_VERSION, 'tz' => hub_tz(), 'server' => (string)($_SERVER['SERVER_SOFTWARE'] ?? ''),
        'limits' => ['memory' => ini_get('memory_limit'), 'upload' => ini_get('upload_max_filesize'), 'post' => ini_get('post_max_size'), 'time' => (int)ini_get('max_execution_time')],
        'ext' => $ext, 'free' => $free === false ? null : (float)$free,
        'sizes' => $sizes, 'total' => $total, 'versions' => $vers,
        'backup' => ['last' => (int)$s['backupLast'], 'every' => (int)$s['backupEvery'], 'telegram' => (int)$n['bkLast'], 'tgEvery' => (int)$n['bkEvery'], 'encrypted' => (bool)$k],
        'cron' => (int)@file_get_contents(hub_dir('core') . '/cron-last.txt'), 'reminders' => (int)$n['lastRun'],
        'bot' => ['ready' => $n['token'] !== '' && $n['chat'] !== '', 'on' => (bool)$n['on'], 'hook' => (bool)$n['hook'], 'error' => (string)$n['lastError']],
        'speed' => health_speed(), 'logs' => health_logs(), 'leftovers' => health_leftovers(), 'update' => health_check_update(null),
        'watch' => array_map(function ($w) { return ['host' => $w['host'], 'ok' => $w['st']['ok'] ?? null, 'dom' => $w['dom']['exp'] ?? '', 'ssl' => $w['ssl']['exp'] ?? '']; }, wt_load()['sites']),
    ];
}
