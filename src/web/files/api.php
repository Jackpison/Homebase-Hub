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
/**
 * Files API (web/files/api.php). PRIVATE: nothing is sent until you are logged in, except what a share link shows its holder.
 *
 *  GET  list                    { items, shares, settings, usage, free, max }   (visitors: { private: true, auth: false })
 *  GET  chunk?id=&n=            one piece of a file, as a plain download (still locked: the browser opens it)
 *  POST mkdir {p, m}            a folder         POST rename {id, m}      POST move {ids, p}
 *  POST put_start {p, m, k, c, z}   starts a file (c pieces, z bytes in all); POST put_chunk?id=&n= (the piece, raw); POST put_done {id}; POST put_abort {id}
 *  POST trash {ids}  restore {ids, p?}  purge {ids}  empty_trash
 *  POST share_create {id, sm, exp}  share_delete {token}  settings {settings}
 *  GET  s_meta?t=  /  s_chunk?t=&n=     a share link's file, for anyone who has the link (the key is in the part of the link after #, never sent here)
 *
 * Every POST passes the same-site checks and the site's security check. Names, types and keys arrive already locked ("enc1:..."):
 * this file only checks their shape. Pieces are stored under random names with no extension and are only ever sent as downloads.
 */
require __DIR__ . '/lib.php';
hub_headers();
hub_same_origin();

$action = (string)($_GET['action'] ?? 'list');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

/** A piece number: digits only (anything else is -1, which no file has). */
function num($v): int { return is_string($v) && ctype_digit($v) && strlen($v) < 8 ? (int)$v : -1; }

/** One piece of a file as a plain download: nothing in it can be run or shown by the browser. */
function piece_out(string $id, int $n, int $c): never {
    $f = $n >= 0 && $n < $c ? fl_blob_path($id, $n) : '';
    if ($f === '' || !is_file($f)) hub_json(404, ['ok' => false, 'error' => 'Not found.']);
    header_remove('Content-Type');
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="piece"');
    header('Content-Security-Policy: default-src \'none\'; sandbox');
    header('Cache-Control: private, no-store');
    header('Content-Length: ' . (string)filesize($f));
    readfile($f);
    exit;
}

/* ---------- a share link: anyone with it (the file is still locked; the key is in the part of the link the server never sees) ---------- */
if ($action === 's_meta' || $action === 's_chunk') {
    if ($method !== 'GET') hub_json(405, ['ok' => false, 'error' => 'Use GET.']);
    header('Content-Type: application/json; charset=utf-8');
    $s = fl_share_get((string)($_GET['t'] ?? ''));
    if ($s === null) hub_json(404, ['ok' => false, 'error' => 'This link has ended or was removed.']);   // missing, ended and removed look the same
    if ($action === 's_meta') hub_json(200, ['ok' => true, 'sm' => $s['sm'], 'c' => $s['c'], 'z' => $s['z'], 'exp' => $s['exp']]);
    piece_out($s['id'], num($_GET['n'] ?? null), $s['c']);
}

header('Content-Type: application/json; charset=utf-8');
if (extension_loaded('zlib') && !ini_get('zlib.output_compression')) { @ob_start('ob_gzhandler'); }
$admin = hub_admin();

if ($method === 'GET') {
    if (!$admin) hub_json(200, ['private' => true, 'auth' => false]);
    if ($action === 'chunk') {
        $id = (string)($_GET['id'] ?? ''); $d = fl_load(); $i = $d['items'][$id] ?? null;
        if (!fl_id_ok($id) || !$i || $i['t'] !== 'f' || !empty($i['up'])) hub_json(404, ['ok' => false, 'error' => 'Not found.']);
        if (ob_get_level()) @ob_end_clean();   // a binary download is not compressed again
        piece_out($id, num($_GET['n'] ?? null), $i['c']);
    }
    if ($action !== 'list') hub_json(400, ['ok' => false, 'error' => 'Unknown action.']);
    $d = fl_load();
    $due = false;
    foreach ($d['items'] as $i) if ((!empty($i['top']) && $i['del'] > 0 && time() - $i['del'] > $d['settings']['trashDays'] * 86400) || (!empty($i['up']) && time() - $i['at'] > FL_PENDING_HOURS * 3600)) $due = true;
    foreach ($d['shares'] as $s) if ($s['exp'] > 0 && $s['exp'] < time()) $due = true;
    if ($due) { $r = fl_modify(function (array &$x) { fl_tidy($x); return ''; }); if ($r['ok']) $d = $r['data']; }
    if (random_int(1, 25) === 1) fl_sweep_blobs($d);
    hub_json(200, fl_view($d));
}
if ($method !== 'POST') hub_json(405, ['ok' => false, 'error' => 'Use GET or POST.']);
if (!$admin) hub_json(401, ['ok' => false, 'error' => 'You are logged out. Log in again.']);
if (!hub_csrf_ok()) hub_json(403, ['ok' => false, 'error' => 'Security check failed. Reload the page.']);

/** The ids sent by the browser, checked. */
function ids_in(array $b): array {
    $ids = $b['ids'] ?? null;
    if (!is_array($ids) || !$ids || count($ids) > 500) hub_json(400, ['ok' => false, 'error' => 'Pick something first.']);
    foreach ($ids as $id) if (!fl_id_ok($id)) hub_json(400, ['ok' => false, 'error' => 'Bad data.']);
    return array_values(array_unique($ids));
}
function done(array $r, array $extra = []): never {
    if (!$r['ok']) hub_json((int)($r['code'] ?? 400), ['ok' => false, 'error' => $r['error']]);
    hub_json(200, ['ok' => true, 'rev' => $r['data']['rev']] + $extra);
}

/* ---------- one piece of a file: the body is the piece itself ---------- */
if ($action === 'put_chunk') {
    $id = (string)($_GET['id'] ?? ''); $n = num($_GET['n'] ?? null);
    $d = fl_load(); $i = $d['items'][$id] ?? null;
    if (!fl_id_ok($id) || !$i || $i['t'] !== 'f' || empty($i['up'])) hub_json(404, ['ok' => false, 'error' => 'That upload is not open.']);
    if ($n < 0 || $n >= $i['c']) hub_json(400, ['ok' => false, 'error' => 'That piece does not belong to this file.']);
    $raw = (string)file_get_contents('php://input', false, null, 0, FL_PIECE_MAX + 1);
    if (strlen($raw) > FL_PIECE_MAX) hub_json(413, ['ok' => false, 'error' => 'That piece is too big.']);
    if (strlen($raw) < 28) hub_json(400, ['ok' => false, 'error' => 'That piece is too small to be real.']);
    if (!hub_write(fl_blob_path($id, $n), $raw)) hub_json(500, ['ok' => false, 'error' => 'Could not save (check the folder permissions).']);
    hub_json(200, ['ok' => true]);
}

$raw = (string)file_get_contents('php://input', false, null, 0, 262145);
if (strlen($raw) > 262144) hub_json(413, ['ok' => false, 'error' => 'Too much data.']);
$b = json_decode($raw, true);
if (!is_array($b)) hub_json(400, ['ok' => false, 'error' => 'Bad data.']);
$str = function (string $k) use ($b): string { return is_string($b[$k] ?? null) ? $b[$k] : ''; };
$pid = function () use ($str): string { $p = $str('p'); if ($p !== '' && !fl_id_ok($p)) hub_json(400, ['ok' => false, 'error' => 'Bad data.']); return $p; };
$one = function () use ($str): string { $id = $str('id'); if (!fl_id_ok($id)) hub_json(400, ['ok' => false, 'error' => 'Bad data.']); return $id; };

switch ($action) {
case 'mkdir':
    $p = $pid(); $m = $str('m');
    done(fl_modify(function (array &$d) use ($p, $m) { return fl_op_mkdir($d, $p, $m); }));
case 'put_start':
    $p = $pid(); $m = $str('m'); $k = $str('k'); $c = (int)($b['c'] ?? 0); $z = (int)($b['z'] ?? 0); $out = [];
    $r = fl_modify(function (array &$d) use ($p, $m, $k, $c, $z, &$out) { fl_tidy($d); return fl_op_put_start($d, $p, $m, $k, $c, $z, $out); });
    done($r, ['id' => $out['id'] ?? '']);
case 'put_done':
    $id = $one();
    done(fl_modify(function (array &$d) use ($id) { return fl_op_put_done($d, $id); }));
case 'put_abort':
    $id = $one();
    done(fl_modify(function (array &$d) use ($id) {
        if (!isset($d['items'][$id]) || empty($d['items'][$id]['up'])) return ['That upload is not open.', 404];
        fl_purge($d, [$id]); return '';
    }));
case 'rename':
    $id = $one(); $m = $str('m');
    done(fl_modify(function (array &$d) use ($id, $m) { return fl_op_rename($d, $id, $m); }));
case 'move':
    $ids = ids_in($b); $p = $pid();
    done(fl_modify(function (array &$d) use ($ids, $p) { return fl_op_move($d, $ids, $p); }));
case 'trash':
    $ids = ids_in($b);
    done(fl_modify(function (array &$d) use ($ids) { return fl_op_trash($d, $ids); }));
case 'restore':
    $ids = ids_in($b); $p = array_key_exists('p', $b) ? $pid() : null;
    done(fl_modify(function (array &$d) use ($ids, $p) { return fl_op_restore($d, $ids, $p); }));
case 'purge':
    $ids = ids_in($b);
    done(fl_modify(function (array &$d) use ($ids) { return fl_op_purge($d, $ids); }));
case 'empty_trash':
    done(fl_modify(function (array &$d) { return fl_op_empty_trash($d); }));
case 'share_create':
    $id = $one(); $sm = $str('sm'); $exp = (int)($b['exp'] ?? 0); $out = [];
    $r = fl_modify(function (array &$d) use ($id, $sm, $exp, &$out) { return fl_op_share_create($d, $id, $sm, $exp, $out); });
    done($r, ['token' => $out['token'] ?? '']);
case 'share_delete':
    $t = $str('token'); if (!fl_token_ok($t)) hub_json(400, ['ok' => false, 'error' => 'Bad data.']);
    done(fl_modify(function (array &$d) use ($t) { return fl_op_share_delete($d, $t); }));
case 'settings':
    $in = is_array($b['settings'] ?? null) ? $b['settings'] : [];
    $r = fl_modify(function (array &$d) use ($in) {
        $d['settings'] = fl_settings_clean(array_merge($d['settings'], $in));
        if (empty($d['settings']['shares'])) $d['shares'] = [];   // turning links off ends every link
        return '';
    });
    done($r, ['settings' => $r['data']['settings']]);
default:
    hub_json(400, ['ok' => false, 'error' => 'Unknown action.']);
}
