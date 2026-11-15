<?php
declare(strict_types=1);
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
 * (1.79.12) The Notifications list in Settings > Logs, shared by every device you log in from.
 *
 * Every message the site shows is also kept in the browser it was shown in. A logged-in browser sends those lines here, so another phone or
 * computer sees them too. The newest 300 are kept in site-data/core/notelog.json (guarded). Only a logged-in browser can read, add or clear
 * them. Alerts from Files and Cards never leave the device (they can name locked files and cards). A line has an id (the same line sent twice is kept once), the message, a kind, where it came from, when, and which browser showed it.
 */
require_once __DIR__ . '/boot.php';
require_once __DIR__ . '/activity.php';

const NL_DAYS = 30;     // (1.80.6) kept for 30 days (a line is a few hundred bytes), never more than NL_KEEP lines
const NL_KEEP = 3000;
const NL_LOCAL_ONLY = ['Files', 'Cards'];
const NL_KINDS = ['bad', 'ok', 'act', 'del', 'box', 'send', 'copy', 'lock', 'sync', 'plus'];

function nl_file(): string { return hub_dir('core') . '/notelog.json'; }

/** One line from a browser, made safe: null when it is not a message at all. */
function nl_clean(mixed $e): ?array {
    if (!is_array($e) || !is_string($e['m'] ?? null) || trim($e['m']) === '') return null;
    $id = preg_replace('/[^a-z0-9]/', '', strtolower((string)($e['id'] ?? '')));
    if (strlen($id) < 6) return null;
    $ts = is_numeric($e['ts'] ?? null) ? (int)$e['ts'] : 0;
    if ($ts < 1e12 || $ts > (time() + 86400) * 1000) return null;   // milliseconds, and not from the far future
    if (in_array($e['s'] ?? '', NL_LOCAL_ONLY, true)) return null;   // Files and Cards can name locked things: those alerts stay on the device that showed them
    $k = is_string($e['k'] ?? null) && in_array($e['k'], NL_KINDS, true) ? $e['k'] : '';
    $s = static fn(mixed $v, int $n): string => is_string($v) ? mb_substr(trim($v), 0, $n) : '';
    return ['id' => substr($id, 0, 24), 'm' => $s($e['m'], 300), 'b' => !empty($e['b']), 'k' => $k, 's' => $s($e['s'] ?? '', 20), 'p' => $s($e['p'] ?? '', 80),
            'w' => $s($e['w'] ?? '', 60), 'd' => $s($e['d'] ?? '', 200), 'ts' => $ts, 'dev' => act_browser((string)($_SERVER['HTTP_USER_AGENT'] ?? ''))];
}
/** Adds lines (at most 50 at once); a line that is already there is skipped. Returns how many were new. */
function nl_add(array $items): int {
    $new = 0;
    $items = array_slice(array_values($items), 0, 50);
    hub_with_lock(hub_dir('core') . '/notelog.lock', function () use ($items, &$new): void {
        $d = hub_jread(nl_file()) ?? [];
        $have = array_column($d, 'id');
        foreach ($items as $it) {
            $c = nl_clean($it);
            if (!$c || in_array($c['id'], $have, true)) continue;
            $d[] = $c; $have[] = $c['id']; $new++;
        }
        if ($new === 0) return;
        usort($d, static fn(array $a, array $b): int => $a['ts'] <=> $b['ts']);
        $min = (time() - NL_DAYS * 86400) * 1000;
        $d = array_values(array_filter($d, static fn(array $e): bool => (int)$e['ts'] >= $min));
        hub_jput(nl_file(), json_encode(array_slice($d, -NL_KEEP), JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE));
    });
    return $new;
}
/** The kept lines, oldest first. */
function nl_list(): array { return array_values(hub_jread(nl_file()) ?? []); }
/** Empties the list. Returns how many lines went. */
function nl_clear(): int {
    $n = 0;
    hub_with_lock(hub_dir('core') . '/notelog.lock', function () use (&$n): void {
        $n = count(hub_jread(nl_file()) ?? []);
        hub_jput(nl_file(), '[]');
    });
    return $n;
}
