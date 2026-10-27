<?php
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
        hub_json(200, ['private' => true, 'auth' => false, 'locked' => true,
                  'settings' => ['title' => is_string($s['title'] ?? null) ? $s['title'] : '']]);
    }
    $j['locked'] = true;
    $j['auth'] = true;
    if (!isset($j['cards'])) { $j['cards'] = []; $j['people'] = []; $j['empty'] = true; }
    echo json_encode($j, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input', false, null, 0, 1048577);
    if ($raw === false || strlen($raw) > 1048576) hub_json(413, ['ok' => false, 'error' => 'too large']);
    $d = json_decode($raw, true);
    if (!is_array($d)) hub_json(400, ['ok' => false, 'error' => 'bad data']);
    if (!$admin) hub_json(403, ['ok' => false, 'error' => 'password']);
    if (!hub_csrf_ok()) hub_json(403, ['ok' => false, 'error' => 'Security check failed. Reload the page.']);

    if (!isset($d['cards']) || !is_array($d['cards']) || !isset($d['people']) || !is_array($d['people'])) {
        hub_json(400, ['ok' => false, 'error' => 'bad data']);
    }
    $outData = [
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
    $fewer = is_array($before) && count($outData['cards']) < count($before['cards'] ?? []);   // deleting cards always keeps an earlier version first
    cards_snapshot($dir, $file, $fewer);
    $ok = hub_jput($file, $json);
    if ($lk) { flock($lk, LOCK_UN); fclose($lk); }
    if (!$ok) hub_json(500, ['ok' => false, 'error' => 'write failed']);
    hub_json(200, ['ok' => true]);
}

hub_json(405, ['ok' => false]);

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
