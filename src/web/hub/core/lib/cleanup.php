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
 * Cleanup (Settings > Health > Cleanup, 1.79.0): what the site has piled up and can safely let go. Each kind is scanned (a count and a size)
 * and removed on its own, never anything you made:
 *   versions  earlier versions of Links, Info, Cards, Tasks and Home beyond the newest CU_KEEP of each page (the undo history)
 *   photos    downloaded Home background photos that no setting or photo list refers to any more (your own uploads are never touched)
 *   sessions  login files of browsers whose login ran out long ago
 *   logs      the host's error_log files inside the site folder (emptied, not deleted)
 */
require_once __DIR__ . '/boot.php';

const CU_KEEP = 3;
const CU_KINDS = ['versions', 'photos', 'sessions', 'logs'];

/** [page => [folder, pattern]] of the saved earlier versions */
function cu_version_dirs(): array {
    $sd = hub_data_root();
    return ['links' => [$sd . '/links/backups', 'bookmarks-*.php'], 'info' => [$sd . '/info/versions', '*.php'], 'cards' => [$sd . '/cards/versions', '*.php'],
            'tasks' => [$sd . '/tasks/versions', '*.php'], 'home' => [$sd . '/home/versions', '*.php']];
}
/** the files of earlier versions that are older than the newest CU_KEEP in their folder: [path => bytes] */
function cu_old_versions(): array {
    $out = [];
    foreach (cu_version_dirs() as [$dir, $pat]) {
        $f = glob($dir . '/' . $pat) ?: [];
        usort($f, static fn(string $a, string $b): int => (int)@filemtime($b) <=> (int)@filemtime($a) ?: strcmp($b, $a));
        foreach (array_slice($f, CU_KEEP) as $x) $out[$x] = (int)@filesize($x);
    }
    return $out;
}
/** downloaded Home photos nothing refers to: [path => bytes] */
function cu_unused_photos(): array {
    $dir = HUB_MEDIA . '/home/photos'; $out = [];
    $files = array_filter(glob($dir . '/*') ?: [], 'is_file');
    if (!$files) return $out;
    $refs = '';   // everything the start page keeps in its data folder (the photo list, the settings): a photo named anywhere in it is in use
    foreach (glob(hub_data_root() . '/home/*') ?: [] as $d) if (is_file($d) && filesize($d) < 4000000) $refs .= (string)@file_get_contents($d);
    foreach ($files as $f) if (strpos($refs, basename($f)) === false) $out[$f] = (int)@filesize($f);
    return $out;
}
/** login files that ran out: [path => bytes] */
function cu_old_sessions(): array {
    $out = []; $limit = time() - (HUB_SESSION_DAYS + 5) * 86400;
    foreach (glob(hub_data_root() . '/sessions/sess_*') ?: [] as $f) if (is_file($f) && (int)@filemtime($f) < $limit) $out[$f] = (int)@filesize($f);
    return $out;
}
/** the host's error_log files inside the site folder that hold something: [path => bytes] */
function cu_logs(): array {
    $cand = [HUB_PUBLIC . '/error_log', HUB_WEB . '/error_log', HUB_CORE . '/error_log'];   // the places a host writes them (as Health lists them)
    foreach ([HUB_WEB . '/*/error_log', HUB_WEB . '/*/*/error_log', HUB_CORE . '/*/error_log'] as $g) foreach (glob($g) ?: [] as $f) $cand[] = $f;
    $out = []; $root = realpath(HUB_PUBLIC);
    foreach ($cand as $f) {
        $p = @realpath($f);
        if ($p && $root && basename($p) === 'error_log' && strpos($p, $root . DIRECTORY_SEPARATOR) === 0 && (int)@filesize($p) > 0) $out[$p] = (int)filesize($p);
    }
    return $out;
}
function cu_items(string $kind): array {
    switch ($kind) {
        case 'versions': return cu_old_versions();
        case 'photos':   return cu_unused_photos();
        case 'sessions': return cu_old_sessions();
        case 'logs':     return cu_logs();
    }
    return [];
}
/** what could be cleaned: [kind => ['count' => n, 'bytes' => b]] */
function cu_scan(): array {
    $out = [];
    foreach (CU_KINDS as $k) { $i = cu_items($k); $out[$k] = ['count' => count($i), 'bytes' => array_sum($i)]; }
    return $out;
}
/** removes one kind. Returns ['count' => files removed, 'bytes' => bytes freed]. */
function cu_run(string $kind): array {
    if (!in_array($kind, CU_KINDS, true)) return ['count' => 0, 'bytes' => 0];
    $n = 0; $b = 0;
    foreach (cu_items($kind) as $f => $size) {
        $ok = $kind === 'logs' ? @file_put_contents($f, '') !== false : @unlink($f);
        if ($ok) { $n++; $b += $size; }
    }
    return ['count' => $n, 'bytes' => $b];
}
