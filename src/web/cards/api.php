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
// Cards Holdings - storage endpoint (hub edition).
// PRIVATE: card data is only ever sent to a browser that is logged in to the site.
// Visitors get the page title and a login screen, nothing else.
// Data lives in the private site-data folder (site-data/cards/cards.json), with earlier versions in versions/.
require __DIR__ . '/../hub/core/lib/boot.php';
hub_headers();
header('Content-Type: application/json; charset=utf-8');
hub_same_origin();
if (extension_loaded('zlib') && !ini_get('zlib.output_compression')) { @ob_start('ob_gzhandler'); }

const CARDS_KEEP_VERSIONS = 40;
const CARDS_VERSION_EVERY = 600;   // seconds

$dir  = hub_dir('cards');
$file = $dir . '/cards.php';   // guarded: answers 404 if opened in a browser


$admin = hub_admin();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $j = is_file($file) ? json_decode(hub_jraw($file), true) : null;
    if (!is_array($j)) $j = [];
    if (!$admin) {
        // Only what's needed to draw the login screen.
        $s = is_array($j['settings'] ?? null) ? $j['settings'] : [];
        $title = is_string($s['title'] ?? null) ? $s['title'] : (is_string($j['title'] ?? null) ? $j['title'] : '');
        hub_json(200, ['private' => true, 'auth' => false, 'locked' => true, 'settings' => ['title' => $title]]);
    }
    if (is_string($j['enc'] ?? null)) {   // 1.61.0: locked in the browser with the site key; the server never sees the cards
        echo json_encode(['enc' => $j['enc'], 'kid' => (string)($j['kid'] ?? ''), 'saved' => (int)($j['saved'] ?? 0), 'title' => (string)($j['title'] ?? ''), 'locked' => true, 'auth' => true], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        exit;
    }
    $j['locked'] = true;
    $j['auth'] = true;
    if (!isset($j['cards'])) { $j['cards'] = []; $j['people'] = []; $j['empty'] = true; }
    echo json_encode($j, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input', false, null, 0, 2097153);
    if ($raw === false || strlen($raw) > 2097152) hub_json(413, ['ok' => false, 'error' => 'too large']);
    $d = json_decode($raw, true);
    if (!is_array($d)) hub_json(400, ['ok' => false, 'error' => 'bad data']);
    if (!$admin) hub_json(403, ['ok' => false, 'error' => 'password']);
    if (!hub_csrf_ok()) hub_json(403, ['ok' => false, 'error' => 'Security check failed. Reload the page.']);

    $stored = is_file($file) ? json_decode(hub_jraw($file), true) : null;
    $storedLocked = is_array($stored) && is_string($stored['enc'] ?? null);
    $lockedIn = isset($d['enc']);
    if ($lockedIn) {   // 1.61.0: the browser sends the cards already locked ("enc1:..."): only the shape is checked here
        if (!is_string($d['enc']) || strlen($d['enc']) > 1600000 || !preg_match('~^enc1:[A-Za-z0-9+/=]{20,}$~', $d['enc'])) hub_json(400, ['ok' => false, 'error' => 'bad data']);
        $kid = is_string($d['kid'] ?? null) && preg_match('/^[a-f0-9]{16}$/', $d['kid']) ? $d['kid'] : '';
        $outData = ['enc' => $d['enc'], 'kid' => $kid, 'title' => mb_substr(is_string($d['title'] ?? null) ? $d['title'] : '', 0, 60), 'saved' => time()];
        $fewer = !empty($d['fewer']);
    } else {
        if (!isset($d['cards']) || !is_array($d['cards']) || !isset($d['people']) || !is_array($d['people'])) {
            hub_json(400, ['ok' => false, 'error' => 'bad data']);
        }
        // locked cards are never saved back as plain text by accident: only when the browser says it is unlocking them on purpose (removing the passphrase)
        if ($storedLocked && empty($d['unlock'])) hub_json(409, ['ok' => false, 'error' => 'locked']);
    }
    if (!$lockedIn) $outData = [
        'cards'  => array_values($d['cards']),
        'people' => array_values($d['people']),
        'notes'  => isset($d['notes']) && is_string($d['notes']) ? $d['notes'] : '',
        'banks'  => (object)(isset($d['banks']) && is_array($d['banks']) ? $d['banks'] : []),
        'settings' => (object)(isset($d['settings']) && is_array($d['settings']) ? $d['settings'] : []),
        'saved'  => time(),
    ];
    $json = json_encode($outData, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    if ($json === false) hub_json(400, ['ok' => false, 'error' => 'bad data']);
    $lk = @fopen($dir . '/cards.lock', 'c'); if ($lk) flock($lk, LOCK_EX);   // two saves at once: one after the other, never mixed
    $before = is_file($file) ? json_decode(hub_jraw($file), true) : null;
    if (!$lockedIn) $fewer = is_array($before) && count($outData['cards']) < count($before['cards'] ?? []);   // deleting cards always keeps an earlier version first
    cards_snapshot($dir, $file, $fewer);
    $ok = hub_jput($file, $json);
    if ($ok && $lockedIn && !empty($d['purgePlain'])) cards_purge_plain($dir);   // Lock Cards: earlier copies that can be read are deleted
    if ($lk) { flock($lk, LOCK_UN); fclose($lk); }
    if (!$ok) hub_json(500, ['ok' => false, 'error' => 'write failed']);
    hub_json(200, ['ok' => true]);
}

hub_json(405, ['ok' => false]);

/** Deletes every earlier copy of Cards that is not locked (they hold the cards in plain text). Used when Cards is locked. */
function cards_purge_plain($dir) {
    $plain = function ($f) { $j = hub_read_guarded($f); return is_array($j) && !is_string($j['enc'] ?? null); };
    foreach (glob($dir . '/versions/*.php') ?: [] as $f) if ($plain($f)) @unlink($f);
    $b = $dir . '/cards.before-restore.php';
    if (is_file($b) && $plain($b)) @unlink($b);
}
/** Keeps an earlier version at most every 10 minutes; the last 40 are kept. Restored from site Settings > Backup. */
function cards_snapshot($dir, $file, $force = false) {
    if (!is_file($file)) return;
    $vd = $dir . '/versions';
    if (!is_dir($vd)) @mkdir($vd, 0700, true);
    $files = glob($vd . '/*.php') ?: [];
    sort($files);
    if (!$force && $files && time() - filemtime(end($files)) < CARDS_VERSION_EVERY) return;
    $name = $vd . '/' . date('Ymd-His') . '.php';
    if (!is_file($name)) @copy($file, $name);
    $files = glob($vd . '/*.php') ?: []; sort($files);
    while (count($files) > CARDS_KEEP_VERSIONS) @unlink(array_shift($files));
}
