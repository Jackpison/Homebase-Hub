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
 * One backup file for the whole site, or just the parts you pick (down to single tabs on Links and Info).
 *
 * File: { format: "site-backup", version: 1, created, parts: { links, info, cards, tasks, home, settings } }
 *   links    = the same object Links' own "Export backup" makes (data + icons)
 *   info     = { page, tabs, timer }   (encrypted tabs stay encrypted)
 *   cards    = { cards, people, notes, banks, settings }
 *   tasks    = { tasks, log, settings }
 *   home     = { site, icons }          (background photos are not included: they are downloaded again)
 *   settings = Site settings (never the password)
 *   tools    = { kinds }               (Tools' saved presets, 1.60)
 *
 * Import also accepts the old single-site backups from Links, Info and Cards.
 */

require_once __DIR__ . '/vault.php';

/* ---------- reading what's there ---------- */

function bk_links_file(): string { return hub_dir('links') . '/bookmarks.php'; }
function bk_links_visits_file(): string { return hub_dir('links') . '/visits.json'; }   // Links' visit counts (web/links/lib.php)
function bk_links_data(): array { return hub_read_guarded(bk_links_file()) ?? ['settings' => [], 'tabs' => []]; }
function bk_info_file(): string { return hub_dir('info') . '/info.json'; }
function bk_info_data(): array { return hub_jread(bk_info_file()) ?? ['tabs' => []]; }
function bk_cards_file(): string { return hub_dir('cards') . '/cards.json'; }
function bk_cards_data(): array { return hub_jread(bk_cards_file()) ?? []; }
const BK_OPTIONAL = ['files'];   // parts that are in a backup only when asked for (Files can be large; its pieces are already locked)
const BK_FILES_MAX = 24 * 1024 * 1024;   // the most a backup file carries of Files (bytes of locked pieces); more: copy the folder site-data/files
const BK_PARTS = ['links', 'info', 'cards', 'tasks', 'home', 'settings', 'telegram', 'watch', 'tools'];   // every part of a full backup (tools: Tools' saved presets, 1.60)
function bk_tasks_file(): string { return hub_dir('tasks') . '/tasks.json'; }
function bk_tasks_data(): array { return hub_jread(bk_tasks_file()) ?? ['tasks' => [], 'settings' => []]; }
function bk_home_file(): string { return hub_dir('home') . '/site.json'; }
function bk_home_data(): ?array { return hub_jread(bk_home_file()); }
function bk_home_pad_file(): string { return hub_dir('home') . '/pad.json'; }   // Home's Scratch Pad (1.51)

/** What the Backup panel shows: each part, its size, and the tabs you can pick. */
function bk_overview(): array {
    $l = bk_links_data(); $i = bk_info_data(); $c = bk_cards_data(); $h = bk_home_data(); $tk = bk_tasks_data();
    $links = 0; foreach ($l['tabs'] ?? [] as $t) foreach ($t['categories'] ?? [] as $cat) foreach ($cat['links'] ?? [] as $x) if (empty($x['divider'])) $links++;
    return [
        'links' => ['tabs' => array_map(function ($t) { return ['id' => (string)($t['id'] ?? ''), 'name' => (string)($t['title'] ?? ''), 'private' => !empty($t['private']), 'enc' => !empty($t['enc'])]; }, $l['tabs'] ?? []),
                    'summary' => count($l['tabs'] ?? []) . ' tabs, ' . $links . ' links', 'size' => @filesize(bk_links_file()) ?: 0],
        'info'  => ['tabs' => array_map(function ($t) { return ['id' => (string)($t['id'] ?? ''), 'name' => (string)($t['name'] ?? ''), 'private' => !empty($t['private']), 'enc' => !empty($t['enc'])]; }, $i['tabs'] ?? []),
                    'summary' => count($i['tabs'] ?? []) . ' tabs', 'size' => @filesize(hub_jpath(bk_info_file())) ?: 0],
        'cards' => ['summary' => is_string($c['enc'] ?? null) ? 'locked with your passphrase (the server can not count them)' : count($c['cards'] ?? []) . ' cards, ' . count($c['people'] ?? []) . ' holders', 'size' => @filesize(hub_jpath(bk_cards_file())) ?: 0],
        'tasks' => ['summary' => count($tk['tasks'] ?? []) . ' tasks', 'size' => @filesize(hub_jpath(bk_tasks_file())) ?: 0],
        'home'  => ['summary' => $h ? 'widgets, Scratch Pad, settings, background sources' : 'not set up yet', 'size' => @filesize(hub_jpath(bk_home_file())) ?: 0],
        'settings' => ['summary' => 'site name, logo, look and colors, navigation, pages, Tools branding'],
        'telegram' => (function () { require_once __DIR__ . '/notify.php'; $n = nt_load();
            return ['summary' => $n['token'] === '' ? 'not set up' : 'bot, chat, messages, schedule and backup settings (the bot token only in encrypted backups)']; })(),
        'watch'    => (function () { require_once __DIR__ . '/watch.php'; $w = wt_load(); return ['summary' => count($w['sites']) . ' watched ' . (count($w['sites']) === 1 ? 'site' : 'sites')]; })(),
        'files'    => (function () { require_once HUB_WEB . '/files/lib.php'; $d = fl_load(); $n = 0; foreach ($d['items'] as $i) if ($i['t'] === 'f' && empty($i['up'])) $n++; $z = fl_usage($d);
            return ['summary' => $n . ($n === 1 ? ' file' : ' files') . ', ' . fl_bytes($z) . ', locked' . ($z > BK_FILES_MAX ? ' (too big for a backup file: copy the folder site-data/files)' : ''), 'size' => $z, 'tooBig' => $z > BK_FILES_MAX, 'optional' => true]; })(),
        'tools'    => (function () { require_once __DIR__ . '/presets.php'; $n = array_sum(array_map('count', pr_load()['kinds']));
            return ['summary' => $n . ' saved ' . ($n === 1 ? 'preset' : 'presets'), 'size' => @filesize(hub_jpath(pr_file())) ?: 0]; })(),
    ];
}

/* ---------- export ---------- */

/**
 * $pick = ['links' => true | [tabIds], 'info' => true | [tabIds], 'cards' => true, 'home' => true, 'settings' => true]
 */
/** $secrets: also the Telegram bot token. Only for files that are encrypted (a plain file could be read by anyone who gets it). */
function bk_export(array $pick, bool $secrets = false): array {
    $parts = [];
    if (!empty($pick['links'])) {
        $d = bk_links_data();
        if (is_array($pick['links'])) $d['tabs'] = array_values(array_filter($d['tabs'] ?? [], function ($t) use ($pick) { return in_array((string)($t['id'] ?? ''), $pick['links'], true); }));
        $icons = [];
        $base = HUB_MEDIA . '/links/';
        $add = function ($rel) use (&$icons, $base) {
            $rel = preg_replace('/\?.*$/', '', (string)$rel);
            if (!preg_match('#^icons/([A-Za-z0-9._-]+/)?[A-Za-z0-9._-]+\.(png|ico|jpe?g|gif|webp|svg)$#', $rel)) return;
            $f = $base . $rel;
            if (is_file($f) && filesize($f) < 600000) $icons[substr($rel, 6)] = base64_encode((string)file_get_contents($f));
        };
        foreach ($d['tabs'] ?? [] as $t) foreach ($t['categories'] ?? [] as $c) foreach ($c['links'] ?? [] as $x) if (!empty($x['icon'])) $add($x['icon']);
        $parts['links'] = ['format' => 'bookmarks-backup', 'version' => 2, 'created' => gmdate('c'), 'data' => $d, 'icons' => (object)$icons];
        // visit counts (1.53), with the whole of Links only: address => number, nothing about who clicked
        if ($pick['links'] === true) $parts['links']['visits'] = (object)(hub_jread(bk_links_visits_file())['counts'] ?? []);
    }
    if (!empty($pick['info'])) {
        $d = bk_info_data();
        if (is_array($pick['info'])) $d['tabs'] = array_values(array_filter($d['tabs'] ?? [], function ($t) use ($pick) { return in_array((string)($t['id'] ?? ''), $pick['info'], true); }));
        $parts['info'] = ['page' => $d['page'] ?? new stdClass(), 'tabs' => $d['tabs'] ?? [], 'timer' => $d['timer'] ?? new stdClass()];
    }
    if (!empty($pick['cards'])) $parts['cards'] = bk_cards_data();
    if (!empty($pick['tasks'])) { $t = bk_tasks_data(); $parts['tasks'] = ['tasks' => $t['tasks'] ?? [], 'log' => $t['log'] ?? [], 'settings' => (object)($t['settings'] ?? [])]; }
    if (!empty($pick['home']) && ($h = bk_home_data())) {
        $icons = [];
        foreach (glob(HUB_MEDIA . '/home/icons/*') ?: [] as $f) {
            $b = basename($f);
            if (preg_match('/^[A-Za-z0-9._-]+\.(png|ico|jpe?g|gif|webp)$/', $b) && filesize($f) < 600000) $icons[$b] = base64_encode((string)file_get_contents($f));
        }
        $parts['home'] = ['site' => $h, 'icons' => (object)$icons, 'pad' => (string)(hub_jread(bk_home_pad_file())['text'] ?? '')];
    }
    if (!empty($pick['telegram'])) {   // Settings > Telegram: everything you chose there
        require_once __DIR__ . '/notify.php'; $n = nt_load(); $t = [];
        foreach (NT_USER_KEYS as $k) if ($k !== 'hookKey') $t[$k] = $n[$k];
        if (!$secrets) { $t['tokenLeftOut'] = $t['token'] !== ''; $t['token'] = ''; }
        $parts['telegram'] = $t;
    }
    if (!empty($pick['watch'])) { require_once __DIR__ . '/watch.php'; $w = wt_load(); $parts['watch'] = ['sites' => $w['sites'], 'tasks' => $w['tasks'], 'updateUrl' => $w['updateUrl']]; }
    if (!empty($pick['tools'])) { require_once __DIR__ . '/presets.php'; $parts['tools'] = pr_view(pr_load()); }
    if (!empty($pick['files'])) $parts['files'] = bk_files_export();
    if (!empty($pick['settings'])) {
        $parts['settings'] = hub_settings();
        $lf = HUB_PUBLIC . '/' . $parts['settings']['logo'];
        if ($parts['settings']['logo'] !== '' && is_file($lf)) $parts['settings']['logoData'] = base64_encode((string)file_get_contents($lf)) . ';' . pathinfo($lf, PATHINFO_EXTENSION);
    }

    // the wrapped site key travels with any backup that holds data locked with it (it is useless without the passphrase or recovery key)
    if ((!empty($pick['cards']) || !empty($pick['tools']) || !empty($pick['settings']) || !empty($pick['files'])) && ($sv = sv_get())) $parts['sitevault'] = $sv;

    $partial = [];
    foreach (['links', 'info'] as $k) if (!empty($pick[$k]) && is_array($pick[$k])) $partial[$k] = $pick[$k];
    return ['format' => 'site-backup', 'version' => 1, 'created' => gmdate('c'), 'site' => hub_settings()['siteName'],
            'partial' => (object)$partial, 'parts' => (object)$parts];
}

/* ---------- import ---------- */

/** Turns any supported file into backup parts. */
function bk_normalize($j): array {
    if (!is_array($j)) return [];
    if (($j['format'] ?? '') === 'site-backup') return is_array($j['parts'] ?? null) ? $j['parts'] : [];
    if (($j['format'] ?? '') === 'bookmarks-backup') return ['links' => $j];                                 // old Links backup
    if (isset($j['tabs'], $j['page']) && is_array($j['tabs']) && isset($j['tabs'][0]['boxes'])) return ['info' => $j];   // old Info backup (v6)
    if (isset($j['cards']) && is_array($j['cards'])) return ['cards' => $j];                                // old Cards backup
    if (($j['format'] ?? '') === 'tasks-export' && is_array($j['tasks'] ?? null)) return ['tasks' => $j];  // Tasks' own export
    return [];
}

/**
 * Restores the chosen parts.
 * $mode per part: 'replace' (everything in that part is replaced) or 'merge' (tabs with the same id are replaced, new tabs added).
 * Every part keeps an earlier version first, so a restore can be undone.
 */
/** Files for a backup: the list, the share links and the locked pieces, when they are small enough to carry (else an exception says what to do). */
function bk_files_export(): array {
    require_once HUB_WEB . '/files/lib.php';
    $d = fl_load(); $z = fl_usage($d);
    if ($z > BK_FILES_MAX) throw new Exception('Your files are ' . fl_bytes($z) . ', too big for a backup file (the most is ' . fl_bytes(BK_FILES_MAX) . '). Copy the folder site-data/files instead: it is already locked, and it belongs with the site key in a backup that has Settings.');
    $blobs = [];
    foreach ($d['items'] as $i) {
        if ($i['t'] !== 'f' || !empty($i['up'])) continue;
        for ($n = 0; $n < $i['c']; $n++) { $f = fl_blob_path($i['id'], $n); if (is_file($f)) $blobs[$i['id'] . '_' . $n] = base64_encode((string)file_get_contents($f)); }
    }
    return ['items' => array_values(array_filter($d['items'], fn($i) => empty($i['up']))), 'shares' => (object)$d['shares'], 'settings' => $d['settings'], 'kid' => (string)(sv_get()['kid'] ?? ''), 'blobs' => (object)$blobs];
}
/** Puts Files back from a backup: the whole of Files is replaced. Every item, share and piece is checked first. */
function bk_files_import(array $f): void {
    require_once HUB_WEB . '/files/lib.php';
    $items = []; foreach ((array)($f['items'] ?? []) as $i) { $c = fl_item_clean($i); if ($c && empty($c['up'])) $items[$c['id']] = $c; }
    $pieces = [];
    foreach ((array)($f['blobs'] ?? []) as $name => $b64) {
        if (!is_string($name) || !preg_match('/^([a-f0-9]{16})_(\d{1,4})$/', $name, $m) || !isset($items[$m[1]]) || $items[$m[1]]['t'] !== 'f') continue;
        $bin = is_string($b64) ? base64_decode($b64, true) : false;
        if ($bin === false || strlen($bin) < 28 || strlen($bin) > FL_PIECE_MAX) throw new Exception('A file in this backup is damaged.');
        $pieces[$name] = $bin;
    }
    foreach ($items as $i) {
        if ($i['t'] !== 'f') continue;
        $sum = 0; for ($n = 0; $n < $i['c']; $n++) { if (!isset($pieces[$i['id'] . '_' . $n])) throw new Exception('A file in this backup is missing a piece, so Files was not restored.'); $sum += strlen($pieces[$i['id'] . '_' . $n]); }
        if ($sum !== $i['z']) throw new Exception('A file in this backup does not match its size, so Files was not restored.');
    }
    $shares = []; foreach ((array)($f['shares'] ?? []) as $tok => $s) if (fl_token_ok($tok) && is_array($s) && isset($items[$s['id'] ?? '']) && fl_enc_ok($s['sm'] ?? null, 1200)) $shares[$tok] = ['id' => $s['id'], 'exp' => max(0, (int)($s['exp'] ?? 0)), 'at' => max(0, (int)($s['at'] ?? 0)), 'sm' => $s['sm']];
    $r = fl_modify(function (array &$d) use ($items, $shares, $pieces, $f) {
        fl_purge($d, array_keys($d['items']));
        foreach ($pieces as $name => $bin) if (!hub_write(fl_blob_dir() . '/' . $name, $bin)) return ['Could not save a file.', 500];
        $d['items'] = $items; $d['shares'] = $shares; $d['settings'] = fl_settings_clean($f['settings'] ?? []);
        return '';
    });
    if (!$r['ok']) throw new Exception($r['error']);
}

/**
 * Locked data (Cards, saved presets) only opens with the key it was locked with. A site that has no site key takes the one in the file;
 * a site with a different key refuses, so nothing is restored that could never be opened.
 */
function bk_sitevault_for(array $parts, array $pick): void {
    $kids = [];
    if (!empty($pick['cards']) && is_array($parts['cards'] ?? null) && is_string($parts['cards']['enc'] ?? null)) $kids[] = (string)($parts['cards']['kid'] ?? '');
    if (!empty($pick['tools']) && is_array($parts['tools'] ?? null) && !empty($parts['tools']['locked'])) $kids[] = (string)($parts['tools']['kid'] ?? '');
    if (!empty($pick['files']) && is_array($parts['files'] ?? null) && !empty($parts['files']['items'])) $kids[] = (string)($parts['files']['kid'] ?? '');
    if (!$kids) return;
    $cur = sv_get(); $fv = $parts['sitevault'] ?? null;
    if ($cur === null) {
        if (!is_array($fv) || !hub_norm_vault($fv)) throw new Exception('This file holds locked data, but not the key that opens it. Nothing was restored.');
        if (sv_swap($fv, '') !== '') throw new Exception('Could not save the key from the backup. Nothing was restored.');
        return;
    }
    foreach ($kids as $kid) if ($kid !== '' && ($cur['kid'] ?? '') !== '' && $kid !== $cur['kid'])
        throw new Exception('This file was locked with another key than this site uses, so it would never open. Restore it into a new site, or use Start Over first. Nothing was restored.');
}

function bk_import(array $parts, array $pick, string $mode = 'replace'): array {
    bk_sitevault_for($parts, $pick);
    $done = [];
    if (!empty($pick['links']) && isset($parts['links']['data']) && is_array($parts['links']['data'])) {
        $in = $parts['links']['data'];
        if (!isset($in['tabs']) || !is_array($in['tabs'])) throw new Exception('The Links part of this file is damaged.');
        $cur = bk_links_data();
        bk_keep_links_version($cur);
        if ($mode === 'merge') {
            $byId = []; foreach ($cur['tabs'] ?? [] as $i => $t) $byId[(string)($t['id'] ?? '')] = $i;
            foreach ($in['tabs'] as $t) {
                $id = (string)($t['id'] ?? '');
                if ($id !== '' && isset($byId[$id])) $cur['tabs'][$byId[$id]] = $t;
                elseif (count($cur['tabs'] ?? []) < 6) $cur['tabs'][] = $t;
                else throw new Exception('Links already has 6 tabs, the most allowed. Delete one first or use Replace.');
            }
            $new = $cur;
            // Encrypted tabs only open with the key they were locked with: this site keeps its own key, and takes the file's only when it has none.
            if (!hub_norm_vault($cur['settings']['vault'] ?? null) && ($iv = hub_norm_vault($in['settings']['vault'] ?? null))) { if (!is_array($new['settings'] ?? null)) $new['settings'] = []; $new['settings']['vault'] = $iv; }
        } else {
            if (count($in['tabs']) > 6) throw new Exception('Links can have at most 6 tabs; this file has ' . count($in['tabs']) . '.');
            $new = $in;
        }
        hub_links_enc_clean($new);
        if (!isset($new['settings']) || !is_array($new['settings']) || !$new['settings']) $new['settings'] = new stdClass();
        bk_restore_link_icons($parts['links']['icons'] ?? []);
        if (!hub_write_guarded(bk_links_file(), $new)) throw new Exception('Could not save Links.');
        if ($pick['links'] === true && $mode !== 'merge' && is_array($parts['links']['visits'] ?? null)) {   // a backup from 1.53 on carries the visit counts
            $vc = [];
            foreach ($parts['links']['visits'] as $u => $n) if (is_string($u) && $u !== '' && strlen($u) <= 2048 && is_numeric($n) && (int)$n > 0) $vc[$u] = min((int)$n, 100000000);
            hub_jput(bk_links_visits_file(), json_encode(['counts' => $vc, 'seen' => []], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE));
        }
        $done[] = 'Links';
    }
    if (!empty($pick['info']) && isset($parts['info']['tabs']) && is_array($parts['info']['tabs'])) {
        $in = $parts['info'];
        $cur = bk_info_data();
        bk_keep_info_version();
        $tabs = [];
        foreach ($in['tabs'] as $t) {
            if (!is_array($t)) continue;
            $t['id'] = isset($t['id']) && preg_match('/^[a-f0-9]{8}$/', (string)$t['id']) ? $t['id'] : bin2hex(random_bytes(4));
            $tabs[] = $t;
        }
        if ($mode === 'merge') {
            $byId = []; foreach ($cur['tabs'] ?? [] as $i => $t) $byId[(string)($t['id'] ?? '')] = $i;
            foreach ($tabs as $t) {
                if (isset($byId[$t['id']])) $cur['tabs'][$byId[$t['id']]] = $t;
                elseif (count($cur['tabs'] ?? []) < 20) $cur['tabs'][] = $t;
                else throw new Exception('Info already has 20 tabs, the most allowed.');
            }
            $new = $cur;
            // An encrypted tab needs the key it was locked with; it is only valid with the same vault.
            if (empty($cur['page']['vault']) && !empty($in['page']['vault'])) $new['page']['vault'] = $in['page']['vault'];
        } else {
            $new = ['tabs' => $tabs, 'rev' => (int)($cur['rev'] ?? 0) + 1, 'page' => is_array($in['page'] ?? null) ? $in['page'] : ($cur['page'] ?? []),
                    'timer' => is_array($in['timer'] ?? null) ? $in['timer'] : ($cur['timer'] ?? [])];
        }
        $new['rev'] = (int)($cur['rev'] ?? 0) + 1;
        if (!hub_jput(bk_info_file(), json_encode($new, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE))) throw new Exception('Could not save Info.');
        $done[] = 'Info';
    }
    if (!empty($pick['cards']) && is_array($parts['cards'] ?? null) && is_string($parts['cards']['enc'] ?? null)) {   // locked Cards (1.61.0): kept as they are; bk_sitevault_for already matched the key
        $c = $parts['cards'];
        if (strlen($c['enc']) > 1600000 || !preg_match('~^enc1:[A-Za-z0-9+/=]{20,}$~', $c['enc'])) throw new Exception('The Cards part of this file is damaged.');
        $keep = ['enc' => $c['enc'], 'kid' => is_string($c['kid'] ?? null) && preg_match('/^[a-f0-9]{16}$/', $c['kid']) ? $c['kid'] : '', 'title' => mb_substr(is_string($c['title'] ?? null) ? $c['title'] : '', 0, 60), 'saved' => time()];
        if (is_file(hub_jpath(bk_cards_file()))) @copy(hub_jpath(bk_cards_file()), hub_dir('cards') . '/cards.before-restore.php');
        if (!hub_jput(bk_cards_file(), json_encode($keep, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE))) throw new Exception('Could not save Cards.');
        $done[] = 'Cards';
    } elseif (!empty($pick['cards']) && (isset($parts['cards']['cards']) && is_array($parts['cards']['cards']))) {
        $c = $parts['cards'];
        $keep = array_intersect_key($c, array_flip(['cards', 'people', 'notes', 'banks', 'settings', 'saved']));
        $keep['saved'] = time();
        if (is_file(hub_jpath(bk_cards_file()))) @copy(hub_jpath(bk_cards_file()), hub_dir('cards') . '/cards.before-restore.php');
        if (!hub_jput(bk_cards_file(), json_encode($keep, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE))) throw new Exception('Could not save Cards.');
        $done[] = 'Cards';
    }
    if (!empty($pick['tasks']) && isset($parts['tasks']['tasks']) && is_array($parts['tasks']['tasks'])) {
        require_once HUB_WEB . '/tasks/lib.php';
        $cur = bk_tasks_data();
        $new = tasks_clean(['tasks' => $parts['tasks']['tasks'], 'log' => $parts['tasks']['log'] ?? null, 'settings' => $parts['tasks']['settings'] ?? ($cur['settings'] ?? [])]);
        if ($mode === 'merge') {   // tasks with the same id are replaced, new ones added
            $byId = []; foreach ($cur['tasks'] ?? [] as $i => $t) $byId[(string)($t['id'] ?? '')] = $i;
            $all = $cur['tasks'] ?? [];
            foreach ($new['tasks'] as $t) { if (isset($byId[$t['id']])) $all[$byId[$t['id']]] = $t; else $all[] = $t; }
            $logs = []; foreach (array_merge($cur['log'] ?? [], $new['log']) as $e) $logs[(string)($e['id'] ?? '')] = $e;   // both lists, same entries once
            $new = tasks_clean(['tasks' => $all, 'log' => array_values($logs), 'settings' => $cur['settings'] ?? []]);
        }
        $new['rev'] = (int)($cur['rev'] ?? 0) + 1;
        tasks_snapshot(true);
        if (!hub_jput(bk_tasks_file(), json_encode($new, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE))) throw new Exception('Could not save Tasks.');
        $done[] = 'Tasks';
    }
    if (!empty($pick['home']) && isset($parts['home']['site']) && is_array($parts['home']['site'])) {
        if (is_file(hub_jpath(bk_home_file()))) @copy(hub_jpath(bk_home_file()), hub_dir('home') . '/site.before-restore.php');
        foreach ((array)($parts['home']['icons'] ?? []) as $name => $b64) {
            if (!preg_match('/^[A-Za-z0-9_-][A-Za-z0-9._-]*\.(png|ico|jpe?g|gif|webp)$/', (string)$name)) continue;
            $bin = base64_decode((string)$b64, true);
            if ($bin !== false && bk_is_image($bin)) hub_write(HUB_MEDIA . '/home/icons/' . $name, $bin);
        }
        if (!hub_jput(bk_home_file(), json_encode($parts['home']['site'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE))) throw new Exception('Could not save the start page.');
        if (is_string($parts['home']['pad'] ?? null))   // a backup from 1.51 on carries the Scratch Pad; an older one leaves the pad as it is
            hub_jput(bk_home_pad_file(), json_encode(['text' => mb_substr(str_replace("\r\n", "\n", $parts['home']['pad']), 0, 20000), 'saved' => time()], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE));
        $done[] = 'Home';
    }
    if (!empty($pick['settings']) && isset($parts['settings']) && is_array($parts['settings'])) {
        $s = $parts['settings']; $s['backupLast'] = hub_settings()['backupLast']; $s['logo'] = hub_settings()['logo'];
        if (!empty($s['logoData']) && preg_match('/^([A-Za-z0-9+\/=]+);(png|jpg|webp|gif|ico)$/', (string)$s['logoData'], $m) && ($bin = base64_decode($m[1], true)) !== false && strlen($bin) < 400000 && bk_is_image($bin)) {
            @mkdir(HUB_MEDIA . '/brand', 0755, true);
            $logo = HUB_LAYOUT_HERE['media'] . '/brand/logo-' . dechex(time()) . bin2hex(random_bytes(2)) . '.' . $m[2];
            if (hub_write(HUB_PUBLIC . '/' . $logo, $bin)) {   // the old logo is only removed once the new one is saved
                foreach (glob(HUB_MEDIA . '/brand/logo-*') ?: [] as $f) if (basename($f) !== basename($logo)) @unlink($f);
                $s['logo'] = $logo;
            }
        }
        hub_settings_update(function () use ($s) { return $s; });   // a restore replaces the settings as a whole, under the same lock
        $done[] = 'Settings';
    }
    if (!empty($pick['telegram']) && isset($parts['telegram']) && is_array($parts['telegram'])) {
        require_once __DIR__ . '/notify.php'; $t = $parts['telegram']; $k = [];
        foreach (['on', 'tasks', 'timed', 'backup', 'login', 'bkEnc'] as $b) if (array_key_exists($b, $t)) $k[$b] = (bool)$t[$b];
        if (isset($t['hour'])) $k['hour'] = max(0, min(23, (int)$t['hour']));
        if (isset($t['bkEvery'])) $k['bkEvery'] = in_array((int)$t['bkEvery'], [0, 1, 3, 7, 14, 30], true) ? (int)$t['bkEvery'] : 0;
        if (isset($t['chat']) && preg_match('/^-?\d{1,20}$/', (string)$t['chat'])) $k['chat'] = (string)$t['chat'];
        if (isset($t['chatName'])) $k['chatName'] = mb_substr((string)$t['chatName'], 0, 80);
        if (isset($t['url']) && ($t['url'] === '' || preg_match('#^https?://[^\s<>"]+/$#', (string)$t['url']))) $k['url'] = (string)$t['url'];
        if (!empty($t['token']) && nt_token_ok((string)$t['token'])) $k['token'] = (string)$t['token'];   // only in encrypted backups; otherwise the token on this site stays
        $k['hook'] = false;   // instant replies: turn them on again in Settings > Telegram (that registers this site with Telegram)
        nt_save_keys($k, array_keys($k));
        $done[] = 'Telegram';
    }
    if (!empty($pick['watch']) && isset($parts['watch']) && is_array($parts['watch'])) {
        require_once __DIR__ . '/watch.php'; $w = $parts['watch'];
        wt_update(function (&$d) use ($w) {
            if (isset($w['sites']) && is_array($w['sites'])) $d['sites'] = array_values(array_filter($w['sites'], 'is_array'));
            if (isset($w['tasks']) && is_array($w['tasks'])) foreach (['dom', 'ssl', 'host'] as $x) if (isset($w['tasks'][$x])) $d['tasks'][$x] = (bool)$w['tasks'][$x];
            if (isset($w['updateUrl']) && is_string($w['updateUrl']) && ($w['updateUrl'] === '' || preg_match('#^https://#', $w['updateUrl']))) $d['updateUrl'] = $w['updateUrl'];
        });
        $done[] = 'Domain watch';
    }
    if (!empty($pick['files']) && isset($parts['files']['items']) && is_array($parts['files']['items'])) { bk_files_import($parts['files']); $done[] = 'Files'; }
    if (!empty($pick['tools']) && isset($parts['tools']['kinds']) && is_array($parts['tools']['kinds'])) {   // Tools' saved presets (1.60)
        require_once __DIR__ . '/presets.php'; $in = pr_clean($parts['tools']);
        if ($mode === 'merge') {
            $cur = pr_load();
            foreach ($in['kinds'] as $k => $list) {
                $names = array_map(function ($p) { return mb_strtolower($p['name']); }, $list);
                $keep = array_values(array_filter($cur['kinds'][$k] ?? [], function ($p) use ($names) { return !in_array(mb_strtolower($p['name']), $names, true); }));
                $cur['kinds'][$k] = array_merge($keep, $list);
            }
            $in = $cur;
        }
        if (!pr_save($in)) throw new Exception('Tools presets could not be saved (check the folder permissions, or the presets are too large).');
        $done[] = 'Tools presets';
    }
    return $done;
}

/**
 * Start over: erases every page's data and its earlier versions, your pictures, icons and logo, the site settings, Telegram, the domain
 * watch list, the encryption passphrase and backup key, and Telegram login approval. Keeps only what lets you log in again: the password,
 * two-step login and this session. Everything comes back by importing a backup file.
 */
function bk_reset_all(): array {
    $sd = hub_data_root(); $core = hub_dir('core'); $done = [];
    foreach (['links' => 'Links', 'info' => 'Info', 'cards' => 'Cards', 'tasks' => 'Tasks', 'home' => 'Start Page', 'tools' => 'Tools presets', 'files' => 'Files'] as $app => $name) {
        if (is_dir("$sd/$app")) { hub_rm_tree("$sd/$app"); $done[] = $name; }
    }
    foreach (['home/photos', 'home/uploads', 'home/icons', 'links/icons', 'brand'] as $m)
        foreach (glob(HUB_MEDIA . "/$m/*") ?: [] as $f) { if (is_dir($f)) hub_rm_tree($f); else @unlink($f); }   // the folder's own .htaccess is hidden from glob and stays
    $done[] = 'Pictures, icons and logo';
    require_once __DIR__ . '/notify.php';
    $n = nt_load();
    if ($n['hook'] && $n['token'] !== '') { try { nt_hook_set($n, false); } catch (Throwable $e) {} }   // tell Telegram to stop calling this site
    foreach (['notify.json', 'watch.json', 'passphrase.json', 'backup-key.json', 'site-vault.json', 'passkeys.json', 'passkey-challenges.json'] as $f) { @unlink(hub_jpath("$core/$f")); @unlink("$core/$f"); }
    @unlink("$core/login-approval.php");   // Telegram is gone, so approving logins there is turned off too (or nobody could log in)
    @unlink("$core/settings.php"); unset($GLOBALS['__hub_settings']);
    array_push($done, 'Site settings', 'Telegram', 'Domain watch', 'Encryption passphrase', 'Passkeys', 'Telegram login approval');
    return $done;
}

function bk_is_image(string $b): bool {
    return strncmp($b, "\x89PNG", 4) === 0 || strncmp($b, "\xFF\xD8\xFF", 3) === 0 || strncmp($b, 'GIF8', 4) === 0
        || (strncmp($b, 'RIFF', 4) === 0 && substr($b, 8, 4) === 'WEBP') || strncmp($b, "\x00\x00\x01\x00", 4) === 0;
}
function bk_restore_link_icons($icons): void {
    foreach ((array)$icons as $rel => $b64) {
        $rel = (string)$rel;
        // no hidden names (".htaccess.png") and no folder tricks
        if (!preg_match('#^([a-z0-9-]+/)?[A-Za-z0-9_-][A-Za-z0-9._-]*\.(png|ico|jpe?g|gif|webp|svg)$#', $rel) || strpos($rel, '..') !== false) continue;
        $bin = base64_decode((string)$b64, true);
        if ($bin === false || strlen($bin) > 600000) continue;
        $isSvg = substr($rel, -4) === '.svg';
        if ($isSvg ? !hub_svg_safe($bin) : !bk_is_image($bin)) continue;
        hub_write(HUB_MEDIA . '/links/icons/' . $rel, $bin);
    }
}
/** Same automatic backups Links makes itself (data/backups, last 40). */
function bk_keep_links_version(array $cur): void {
    $dir = hub_dir('links') . '/backups';
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    hub_write_guarded(hub_version_path($dir, 'bookmarks-'), $cur);
    $files = glob($dir . '/*.php') ?: []; sort($files);
    while (count($files) > 40) @unlink(array_shift($files));
}
/** Same earlier versions Info keeps itself (versions/, last 40). */
function bk_keep_info_version(): void {
    if (!is_file(hub_jpath(bk_info_file()))) return;
    $dir = hub_dir('info') . '/versions';
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    $name = $dir . '/' . date('Ymd-His') . '.php';
    if (!is_file($name)) @copy(hub_jpath(bk_info_file()), $name);
    $files = glob($dir . '/*.php') ?: []; sort($files);
    while (count($files) > 40) @unlink(array_shift($files));
}

/* ======================= encrypted backups ======================= */
/* Backup encryption (Backup > Encryption). Files are locked either with your website password (mode "login", the default:
   nothing extra to remember) or with a separate backup passphrase (mode "own"). Neither is ever stored: only the key made
   from it (PBKDF2-SHA256, 310,000 rounds, random salt), in site-data/core/backup-key.php. Encrypted files are compressed,
   then AES-256-GCM. They are opened in your browser at Import, so the password never travels anywhere.
   In mode "login" the key is made again whenever the password changes, so new files always open with today's password;
   older files keep opening with the password you had when they were made. */
const BK_KDF_ITER = 310000;
function bk_key_file(): string { return hub_dir('core') . '/backup-key.json'; }
function bk_key(): ?array { $k = hub_jread(bk_key_file()); return is_array($k) && preg_match('/^[a-f0-9]{64}$/', (string)($k['key'] ?? '')) ? $k : null; }
/** "login" when backups use the website password, "own" for a separate passphrase (and for keys made before 1.18). */
function bk_key_mode(?array $k = null): string { $k = $k ?? bk_key(); return $k && ($k['mode'] ?? '') === 'login' ? 'login' : 'own'; }
/** Which password hash a "login" key was made for, so a password changed some other way is noticed at the next login. */
function bk_auth_mark(): string { $a = hub_auth(); return $a ? substr(hash('sha256', 'bk|' . $a['hash']), 0, 24) : ''; }
function bk_key_set(string $pass, string $mode = 'own'): array {
    $salt = random_bytes(16);
    $k = ['key' => bin2hex(hash_pbkdf2('sha256', $pass, $salt, BK_KDF_ITER, 32, true)), 'salt' => base64_encode($salt), 'iter' => BK_KDF_ITER, 'set' => time(),
          'mode' => $mode === 'login' ? 'login' : 'own'];
    if ($k['mode'] === 'login') $k['auth'] = bk_auth_mark();
    hub_jput(bk_key_file(), json_encode($k)); @chmod(hub_jpath(bk_key_file()), 0600);
    return $k;
}
/** The right website password was just typed: a "login" key that was made for another password is made again with it. */
function bk_login_sync(string $pw): void {
    $k = bk_key();
    if (!$k || bk_key_mode($k) !== 'login' || hash_equals((string)($k['auth'] ?? ''), bk_auth_mark())) return;
    bk_key_set($pw, 'login');
}
/**
 * Info's encrypted tabs, when they use the website password: changing the password re-wraps their key in the browser (the
 * server never sees the key) and sends the new wrap with the password change. $new = {v, salt, iter, wrap, login},
 * $prev = the wrap it replaces, so a stale page can never replace a newer key. Returns '' when done, or why not.
 */
function bk_info_vault_check(array $new, string $prev): string {
    $b64 = function ($x, $min, $max) { return is_string($x) && strlen($x) >= $min && strlen($x) <= $max && preg_match('#^[A-Za-z0-9+/=]+$#', $x); };
    if (!isset($new['salt'], $new['wrap'], $new['iter']) || !$b64($new['salt'], 16, 64) || !$b64($new['wrap'], 40, 200) || (int)$new['iter'] < 100000 || (int)$new['iter'] > 10000000) return 'bad';
    $cur = bk_info_data()['page']['vault'] ?? null;
    return is_array($cur) && hash_equals((string)($cur['wrap'] ?? ''), $prev) ? '' : 'conflict';
}
function bk_info_vault_swap(array $new, string $prev): string {
    $lk = @fopen(hub_dir('info') . '/info.lock', 'c'); if ($lk) flock($lk, LOCK_EX);   // the same lock Info's own saves use
    try {
        if (($why = bk_info_vault_check($new, $prev)) !== '') return $why;
        $raw = hub_jraw(bk_info_file()); $all = json_decode($raw, true);
        if (!is_array($all)) return 'unreadable';
        $all['page']['vault'] = ['v' => 1, 'salt' => $new['salt'], 'iter' => (int)$new['iter'], 'wrap' => $new['wrap'], 'login' => true];
        $json = json_encode($all, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        return $json !== false && hub_jput(bk_info_file(), $json) ? '' : 'write';
    } finally { if ($lk) { flock($lk, LOCK_UN); fclose($lk); } }
}
/**
 * Links' encrypted tabs: changing the website password re-wraps their key in the browser, like Info's. $new = {salt, iter, wrap},
 * $prev = the wrap it replaces (a page that is out of date can never replace a newer key). Returns '' when fine, or why not.
 */
function bk_links_vault_check(array $new, string $prev): string {
    if (!hub_norm_vault($new)) return 'bad';
    $cur = hub_norm_vault((bk_links_data()['settings'] ?? [])['vault'] ?? null);
    return $cur && hash_equals($cur['wrap'], $prev) ? '' : 'conflict';
}
function bk_links_vault_swap(array $new, string $prev): string {
    $lk = @fopen(hub_dir('links') . '/links.lock', 'c'); if ($lk) flock($lk, LOCK_EX);   // the same lock Links' own saves use
    try {
        if (($why = bk_links_vault_check($new, $prev)) !== '') return $why;
        $v = hub_norm_vault($new);
        $all = hub_read_guarded(bk_links_file());
        if (!is_array($all) || !isset($all['tabs'])) return 'unreadable';
        if (!is_array($all['settings'] ?? null)) $all['settings'] = [];
        $all['settings']['vault'] = $v;
        foreach (['dark', 'light', 'sizes'] as $k) if (array_key_exists($k, $all['settings']) && !$all['settings'][$k]) unset($all['settings'][$k]);   // an empty {} must not come back as []
        return hub_write_guarded(bk_links_file(), $all) ? '' : 'write';
    } finally { if ($lk) { flock($lk, LOCK_UN); fclose($lk); } }
}
function bk_key_clear(): void { @unlink(hub_jpath(bk_key_file())); }
/** Opens an encrypted backup file with the stored key (the browser does the same with your passphrase). Returns the JSON text, or null. */
function bk_decrypt(string $file, ?array $k = null): ?string {
    $k = $k ?? bk_key(); $j = json_decode($file, true);
    if (!$k || !is_array($j) || ($j['format'] ?? '') !== 'site-backup-encrypted' || !function_exists('openssl_decrypt')) return null;
    $raw = base64_decode((string)($j['data'] ?? ''), true); $iv = base64_decode((string)($j['iv'] ?? ''), true);
    if ($raw === false || $iv === false || strlen($raw) < 17) return null;
    $plain = @openssl_decrypt(substr($raw, 0, -16), 'aes-256-gcm', hex2bin($k['key']), OPENSSL_RAW_DATA, $iv, substr($raw, -16));
    $json = $plain === false ? false : @gzdecode($plain);
    return $json === false ? null : $json;
}
/** A whole backup (JSON text) as an encrypted backup file (JSON text). */
function bk_encrypt(string $json): string {
    $k = bk_key();
    if (!$k || !function_exists('openssl_encrypt')) throw new Exception('Encryption is not available.');
    $iv = random_bytes(12); $tag = '';
    $ct = openssl_encrypt(gzencode($json, 6), 'aes-256-gcm', hex2bin($k['key']), OPENSSL_RAW_DATA, $iv, $tag, '', 16);
    if ($ct === false) throw new Exception('Encryption failed.');
    return json_encode(['format' => 'site-backup-encrypted', 'version' => 1, 'site' => hub_settings()['siteName'], 'created' => gmdate('c'),
        'cipher' => 'AES-256-GCM', 'kdf' => 'PBKDF2-SHA256', 'iter' => (int)$k['iter'], 'salt' => $k['salt'], 'iv' => base64_encode($iv),
        'data' => base64_encode($ct . $tag), 'pw' => bk_key_mode($k),
        'how' => 'Encrypted backup. Open the site, Backup > Import, choose this file and enter ' . (bk_key_mode($k) === 'login' ? 'your website password (the one you had on ' . date('j M Y') . ').' : 'your encryption passphrase.')],
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}
