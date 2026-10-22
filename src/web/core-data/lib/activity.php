<?php
if (PHP_SAPI !== 'cli' && isset($_SERVER['SCRIPT_FILENAME']) && @realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) { http_response_code(404); exit; }   // an include file: never run on its own, even
/* Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
/**
 * Login history and signed-in devices (Settings > Security > Devices).
 *
 *   activity   the last 100 security events (logins, wrong passwords, password and two-step changes, logout-everywhere...): when, what,
 *              which browser, which address. site-data/core/activity.php (guarded).
 *   devices    one line for each login that can still be used: the browser, the address, when it started. Only a fingerprint of the
 *              session is kept, never the session itself, so this file cannot be used to get in. site-data/core/devices.php (guarded).
 *   revoked    fingerprints of logins you ended one by one from the Devices list. The file exists only while there is something in it;
 *              hub_admin() looks at it only then, so a normal request pays nothing for this.
 */
require_once __DIR__ . '/boot.php';

const ACT_KEEP = 100;

function act_file(): string  { return hub_dir('core') . '/activity.json'; }
function act_dfile(): string { return hub_dir('core') . '/devices.json'; }
function act_rfile(): string { return hub_dir('core') . '/revoked.json'; }

function act_update(string $file, callable $fn): void {
    $lk = @fopen(hub_dir('core') . '/activity.lock', 'c'); if ($lk) flock($lk, LOCK_EX);
    try {
        $d = hub_jread($file) ?? [];
        $d = $fn($d);
        if ($d === null) @unlink(hub_jpath($file));
        else hub_jput($file, json_encode($d, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE));
    } finally { if ($lk) { flock($lk, LOCK_UN); fclose($lk); } }
}
/** "Chrome on Windows", read from the browser's own description of itself. */
function act_browser(string $ua): string {
    if ($ua === '') return 'Unknown browser';
    $b = preg_match('~Edg(?:e|A|iOS)?/~', $ua) ? 'Edge' : (preg_match('~OPR/|Opera~', $ua) ? 'Opera' : (preg_match('~Firefox/|FxiOS~', $ua) ? 'Firefox'
       : (preg_match('~Chrome/|CriOS~', $ua) ? 'Chrome' : (preg_match('~Safari/~', $ua) ? 'Safari' : (preg_match('~curl/~i', $ua) ? 'curl' : 'Browser')))));
    $o = preg_match('~Windows~', $ua) ? 'Windows' : (preg_match('~iPhone|iPad|iPod~', $ua) ? 'iOS' : (preg_match('~Android~', $ua) ? 'Android'
       : (preg_match('~Mac OS X|Macintosh~', $ua) ? 'macOS' : (preg_match('~CrOS~', $ua) ? 'ChromeOS' : (preg_match('~Linux|X11~', $ua) ? 'Linux' : '')))));
    return $b . ($o !== '' ? ' on ' . $o : '');
}
function act_log(string $what, string $extra = ''): void {
    try {
        $ev = ['t' => time(), 'ev' => preg_replace('/[^a-z_0-9]/', '', $what), 'ip' => hub_ip(),
               'cc' => preg_replace('/[^A-Z]/', '', strtoupper((string)($_SERVER['HTTP_CF_IPCOUNTRY'] ?? ''))),
               'who' => act_browser((string)($_SERVER['HTTP_USER_AGENT'] ?? '')), 'x' => mb_substr($extra, 0, 80)];
        act_update(act_file(), function ($d) use ($ev) { $d[] = $ev; return array_slice($d, -ACT_KEEP); });
    } catch (Throwable $e) {}
}
function act_sid(): string { $id = session_id(); return $id === '' ? '' : substr(hash('sha256', 'dev|' . $id), 0, 16); }

/** A login just started (its session id is final): remember its browser and address. Old lines go. */
function act_session_add(array $a): void {
    $h = act_sid(); if ($h === '') return;
    $now = time(); $ver = (int)$a['ver'];
    $me = ['t' => $now, 'ip' => hub_ip(), 'who' => act_browser((string)($_SERVER['HTTP_USER_AGENT'] ?? '')), 'ver' => $ver, 'exp' => $now + HUB_SESSION_DAYS * 86400];
    act_update(act_dfile(), function ($d) use ($h, $me, $ver, $now) {
        foreach ($d as $k => $e) if (!is_array($e) || (int)($e['ver'] ?? -1) !== $ver || (int)($e['exp'] ?? 0) < $now) unset($d[$k]);
        $d[$h] = $me;
        return array_slice($d, -40, null, true);
    });
}
/** This browser logged out. */
function act_session_gone(): void {
    $h = act_sid(); if ($h === '' || !is_file(hub_jpath(act_dfile()))) return;
    act_update(act_dfile(), function ($d) use ($h) { unset($d[$h]); return $d; });
}
/** The logins that can still be used, newest first; 'me' marks the one asking. */
function act_sessions(): array {
    $a = hub_auth(); $ver = (int)($a['ver'] ?? 0); $now = time(); $me = act_sid(); $out = [];
    foreach (hub_jread(act_dfile()) ?? [] as $h => $e) {
        if (!is_array($e) || (int)($e['ver'] ?? -1) !== $ver || (int)($e['exp'] ?? 0) < $now) continue;
        $out[] = ['id' => (string)$h, 'who' => (string)($e['who'] ?? ''), 'ip' => (string)($e['ip'] ?? ''), 't' => (int)($e['t'] ?? 0), 'me' => (string)$h === $me];
    }
    usort($out, function ($x, $y) { return $y['t'] <=> $x['t']; });
    return $out;
}
/** End one login from the list. Not the one you are using (that is Log Out). */
function act_revoke(string $h): bool {
    if (!preg_match('/^[a-f0-9]{16}$/', $h) || $h === act_sid()) return false;
    $now = time();
    act_update(act_rfile(), function ($d) use ($h, $now) {
        foreach ($d as $k => $t) if ((int)$t < $now - HUB_SESSION_DAYS * 86400) unset($d[$k]);
        $d[$h] = $now; return $d;
    });
    act_update(act_dfile(), function ($d) use ($h) { unset($d[$h]); return $d; });
    return true;
}
/** Was this browser's login ended from the list? (Only called when a revoked list exists.) */
function act_revoked(): bool {
    $h = act_sid(); if ($h === '') return false;
    $d = hub_jread(act_rfile());
    return is_array($d) && isset($d[$h]);
}
