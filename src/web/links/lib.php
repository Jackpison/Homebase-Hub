<?php
declare(strict_types=1);
/* Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 *
 * Links: visit counts (1.53). Every click on a link counts, from anyone who can see it, kept on your server in
 * site-data/links/visits.json. Only you (logged in) see the numbers. Links Settings > Show Visit Counts only hides them;
 * counting goes on. Links in encrypted tabs are never counted (their addresses are secret, even from the server).
 * One browser counts once per link every 30 minutes, so nobody can pump a number up by clicking.
 */
require_once __DIR__ . '/../hub/core/lib/boot.php';

const VISIT_GAP = 1800;     // seconds before the same browser counts the same link again
const VISIT_MAX_URL = 2048;

function visits_file(): string { return hub_dir('links') . '/visits.json'; }

/** {counts: {url: n}, seen: {key: time}} */
function visits_read(): array
{
    $v = hub_jread(visits_file()) ?? [];
    return ['counts' => is_array($v['counts'] ?? null) ? $v['counts'] : [], 'seen' => is_array($v['seen'] ?? null) ? $v['seen'] : []];
}

/** The addresses that can be counted: every link and extra link in tabs that are not encrypted. $public: also not private tabs. */
function visits_urls(array $data, bool $public): array
{
    $urls = [];
    foreach ($data['tabs'] ?? [] as $t) {
        if (!is_array($t) || !empty($t['enc']) || ($public && !empty($t['private']))) continue;
        foreach ($t['categories'] ?? [] as $c) foreach (is_array($c['links'] ?? null) ? $c['links'] : [] as $l) {
            if (!is_array($l) || !empty($l['divider'])) continue;
            if (is_string($l['url'] ?? null) && $l['url'] !== '') $urls[$l['url']] = true;
            foreach (is_array($l['extra'] ?? null) ? $l['extra'] : [] as $x) if (is_string($x['url'] ?? null) && $x['url'] !== '') $urls[$x['url']] = true;
        }
    }
    return $urls;
}

/** The counts for the links that exist now (a link whose address changed starts again from 0). */
function visits_for(array $data): array
{
    $urls = visits_urls($data, false); $out = [];
    foreach (visits_read()['counts'] as $u => $n) if (isset($urls[$u]) && (int)$n > 0) $out[$u] = (int)$n;
    return $out;
}

/** Counts one click. $who identifies the browser (a hash of its address and User-Agent). Returns [counted, count];
 *  counted is null when the address is not a link that can be counted. */
function visits_add(string $url, string $who, array $data, bool $public, ?int $now = null): array
{
    $now = $now ?? time();
    if ($url === '' || strlen($url) > VISIT_MAX_URL || !isset(visits_urls($data, $public)[$url])) return [null, 0];
    $f = visits_file(); @mkdir(dirname($f), 0700, true);
    $lk = @fopen($f . '.lock', 'c'); if ($lk) flock($lk, LOCK_EX);
    $v = visits_read();
    foreach ($v['seen'] as $k => $t) if ((int)$t < $now - VISIT_GAP) unset($v['seen'][$k]);   // forget old clicks
    $key = substr(hash('sha256', $who . '|' . $url), 0, 24);
    $counted = !isset($v['seen'][$key]);
    if ($counted) { $v['counts'][$url] = (int)($v['counts'][$url] ?? 0) + 1; $v['seen'][$key] = $now; }
    // keep only links that still exist (counts) and a bounded list of recent clicks
    $all = visits_urls($data, false);
    foreach ($v['counts'] as $u => $_) if (!isset($all[$u])) unset($v['counts'][$u]);
    if (count($v['seen']) > 20000) $v['seen'] = array_slice($v['seen'], -20000, null, true);
    if ($counted) hub_jput($f, json_encode($v, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE));
    if ($lk) { flock($lk, LOCK_UN); fclose($lk); }
    return [$counted, (int)($v['counts'][$url] ?? 0)];
}

/** After a save: forget the counts of addresses that are no longer readable links (deleted, changed, or now in an encrypted
 *  tab: an encrypted tab's addresses must not stay readable here). */
function visits_prune(array $data): void
{
    $f = visits_file(); if (!is_file(hub_jpath($f)) && !is_file($f)) return;
    $lk = @fopen($f . '.lock', 'c'); if ($lk) flock($lk, LOCK_EX);
    $v = visits_read(); $all = visits_urls($data, false); $n = count($v['counts']);
    foreach ($v['counts'] as $u => $_) if (!isset($all[$u])) unset($v['counts'][$u]);
    if (count($v['counts']) !== $n) hub_jput($f, json_encode($v, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE));
    if ($lk) { flock($lk, LOCK_UN); fclose($lk); }
}
