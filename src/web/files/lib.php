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
if (PHP_SAPI !== 'cli' && isset($_SERVER['SCRIPT_FILENAME']) && @realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) { http_response_code(404); exit; }   // an include file: never run on its own, even where .htaccess is ignored

/**
 * Files (1.61.0): your files on your own server, locked in the browser before they are sent.
 *
 * What the server holds (site-data/files/):
 *   files.php   guarded JSON: { rev, items: {id: item}, shares: {token: share}, settings }
 *   blobs/      one file per piece of a file, named <id>_<n> (random id, no extension): AES-256-GCM pieces, "iv + ciphertext + tag"
 *
 * item  = { id, t: 'f'|'d', p: parent folder id or '', m: "enc1:..." (name, type, size, date: sealed with the site key),
 *           k: "enc1:..." (the file's own key, sealed with the site key; files only), c: number of pieces, z: stored bytes,
 *           at: created, del: moved to Trash at (0 = not in Trash), top: 1 for what you put in Trash itself, up: 1 while uploading }
 * share = { id, exp (0 = never), at, sm: "enc1:..." (the file's name, type and size, sealed with the file's own key) }
 *
 * The server never sees a name, a picture or a key: only ids, who is inside which folder, sizes and dates. Nothing that is stored can
 * run: blobs have no extension and are only ever sent as plain downloads (api.php); the folder refuses to be opened from a browser.
 */
require_once __DIR__ . '/../hub/core/lib/boot.php';

const FL_DEFAULT_LIMIT = 5 * 1024 * 1024 * 1024;   // 5 GB, changeable in Files Settings
const FL_MAX_FILE      = 16 * 1024 * 1024 * 1024;  // no single file is bigger than this, whatever the limit
const FL_PIECE_MAX     = 4 * 1024 * 1024 + 64;     // the biggest piece one request may carry (the browser sends 2 MB pieces)
const FL_MAX_PIECES    = 8192;
const FL_MAX_ITEMS     = 20000;
const FL_MAX_DEPTH     = 24;
const FL_MAX_SHARES    = 300;
const FL_PENDING_HOURS = 12;                       // an upload that never finished is cleaned up after this

function fl_dir(): string { return hub_dir('files'); }
function fl_file(): string { return fl_dir() . '/files.json'; }
function fl_blob_dir(): string { $d = fl_dir() . '/blobs'; if (!is_dir($d)) @mkdir($d, 0700, true); return $d; }

function fl_id_ok($id): bool { return is_string($id) && (bool)preg_match('/^[a-f0-9]{16}$/', $id); }
function fl_token_ok($t): bool { return is_string($t) && (bool)preg_match('/^[A-Za-z0-9_-]{32}$/', $t); }
/** "enc1:" + base64, the text the browser makes (the same as an encrypted tab). $max = the longest allowed. */
function fl_enc_ok($e, int $max = 2000): bool { return is_string($e) && strlen($e) <= $max && (bool)preg_match('~^enc1:[A-Za-z0-9+/=]{20,}$~', $e); }
function fl_blob_path(string $id, int $n): string { return fl_blob_dir() . '/' . $id . '_' . $n; }

function fl_settings_default(): array { return ['limit' => FL_DEFAULT_LIMIT, 'shares' => true, 'trashDays' => 30, 'view' => 'list', 'sort' => 'name', 'bar' => '']; }
function fl_settings_clean($s): array {
    $d = fl_settings_default(); $s = is_array($s) ? $s : [];
    if (isset($s['limit']) && is_numeric($s['limit'])) $d['limit'] = max(0, min((int)$s['limit'], 1024 * 1024 * 1024 * 1024));   // 0: only the server's free space limits
    if (isset($s['shares'])) $d['shares'] = (bool)$s['shares'];
    if (isset($s['trashDays']) && in_array((int)$s['trashDays'], [7, 14, 30, 60, 90], true)) $d['trashDays'] = (int)$s['trashDays'];
    if (isset($s['view']) && in_array($s['view'], ['list', 'grid'], true)) $d['view'] = $s['view'];
    if (isset($s['sort']) && in_array($s['sort'], ['name', 'date', 'size'], true)) $d['sort'] = $s['sort'];
    if (isset($s['bar']) && in_array($s['bar'], ['', 'icons', 'text'], true)) $d['bar'] = $s['bar'];
    return $d;
}

/** One item exactly as it may be stored; null when it is not one. */
function fl_item_clean($i): ?array {
    if (!is_array($i) || !fl_id_ok($i['id'] ?? null) || !in_array($i['t'] ?? '', ['f', 'd'], true)) return null;
    $p = $i['p'] ?? '';
    if ($p !== '' && !fl_id_ok($p)) return null;
    if (!fl_enc_ok($i['m'] ?? null)) return null;
    $o = ['id' => $i['id'], 't' => $i['t'], 'p' => $p, 'm' => $i['m'], 'at' => max(0, (int)($i['at'] ?? 0)), 'del' => max(0, (int)($i['del'] ?? 0))];
    if ($o['del'] > 0 && !empty($i['top'])) $o['top'] = 1;
    if ($i['t'] === 'f') {
        if (!fl_enc_ok($i['k'] ?? null, 400)) return null;
        $o['k'] = $i['k']; $o['c'] = max(0, min(FL_MAX_PIECES, (int)($i['c'] ?? 0))); $o['z'] = max(0, min(FL_MAX_FILE + 1048576, (int)($i['z'] ?? 0)));
        if (!empty($i['up'])) $o['up'] = 1;
    }
    return $o;
}

function fl_empty(): array { return ['rev' => 0, 'items' => [], 'shares' => [], 'settings' => fl_settings_default()]; }
/** What is stored, cleaned: whatever does not fit is left out, never an error. */
function fl_load(): array {
    $j = hub_read_guarded(hub_jpath(fl_file()));
    if (!is_array($j)) return fl_empty();
    $d = fl_empty(); $d['rev'] = max(0, (int)($j['rev'] ?? 0)); $d['settings'] = fl_settings_clean($j['settings'] ?? []);
    foreach ((array)($j['items'] ?? []) as $i) { $c = fl_item_clean($i); if ($c) $d['items'][$c['id']] = $c; }
    foreach ((array)($j['shares'] ?? []) as $tok => $s) {
        if (!fl_token_ok($tok) || !is_array($s) || !isset($d['items'][$s['id'] ?? '']) || !fl_enc_ok($s['sm'] ?? null, 1200)) continue;
        $d['shares'][$tok] = ['id' => $s['id'], 'exp' => max(0, (int)($s['exp'] ?? 0)), 'at' => max(0, (int)($s['at'] ?? 0)), 'sm' => $s['sm']];
        $k = &$d['shares'][$tok];   // (1.80.0) options: a password hash, a download limit and its count, and the wrong-try count
        if (is_string($s['pw'] ?? null) && preg_match('/^[a-f0-9]{64}$/', $s['pw'])) $k['pw'] = $s['pw'];
        if ((int)($s['lim'] ?? 0) > 0) { $k['lim'] = min(10000, (int)$s['lim']); $k['dl'] = max(0, (int)($s['dl'] ?? 0)); }
        if ((int)($s['bad'] ?? 0) > 0) { $k['bad'] = (int)$s['bad']; $k['bt'] = max(0, (int)($s['bt'] ?? 0)); }
        unset($k);
    }
    return $d;
}
function fl_save(array $d): bool {
    $d['rev'] = (int)$d['rev'] + 1;
    $out = ['rev' => $d['rev'], 'items' => array_values($d['items']), 'shares' => (object)$d['shares'], 'settings' => $d['settings']];
    return hub_write_guarded(hub_jpath(fl_file()), $out);
}
/**
 * Runs $fn($data) under the lock, with the data as it is now; $fn changes the array it is given and returns an error text, or '' to
 * save. Returns ['ok' => bool, 'error' => string, 'data' => the data after].
 */
function fl_modify(callable $fn): array {
    $r = hub_with_lock_or(fl_dir() . '/files.lock', function () use ($fn): array {
        $d = fl_load();
        $res = $fn($d);
        if (is_array($res)) return ['ok' => false, 'error' => (string)($res[0] ?? 'Not possible.'), 'code' => (int)($res[1] ?? 400), 'data' => fl_load()];
        if (!fl_save($d)) return ['ok' => false, 'error' => 'Could not save (check the folder permissions).', 'code' => 500, 'data' => fl_load()];
        return ['ok' => true, 'error' => '', 'code' => 200, 'data' => $d];
    }, null);
    return $r ?? ['ok' => false, 'error' => 'Could not save (check the folder permissions).', 'data' => fl_load(), 'code' => 500];   // null: the lock could not be taken
}

/* ---------- sizes ---------- */
/** Bytes stored for everything (Trash and unfinished uploads included). */
function fl_usage(array $d): int { $n = 0; foreach ($d['items'] as $i) $n += (int)($i['z'] ?? 0); return $n; }
/** Free space the server has for this folder, or null when it cannot say. */
function fl_free(): ?int { $f = @disk_free_space(fl_dir()); return $f === false ? null : (int)$f; }

/* ---------- folders and parents ---------- */
function fl_depth(array $d, string $id): int {
    $n = 0; $seen = [];
    while ($id !== '' && isset($d['items'][$id]) && !isset($seen[$id])) { $seen[$id] = 1; $id = $d['items'][$id]['p']; $n++; if ($n > FL_MAX_DEPTH + 2) break; }
    return $n;
}
/** All ids below a folder (children, their children ...). */
function fl_below(array $d, string $id): array {
    $kids = [];
    foreach ($d['items'] as $i) $kids[$i['p']][] = $i['id'];
    $out = []; $stack = [$id];
    while ($stack) { $x = array_pop($stack); foreach ($kids[$x] ?? [] as $k) { if (isset($out[$k])) continue; $out[$k] = 1; $stack[] = $k; } }
    return array_map('strval', array_keys($out));   // (1.69.1) keys that are all digits come back as numbers
}
/** A live (not in Trash) folder, or '' for the top. Returns '' when fine, else why not. */
function fl_parent_check(array $d, string $p): string {
    if ($p === '') return '';
    if (!isset($d['items'][$p]) || $d['items'][$p]['t'] !== 'd' || $d['items'][$p]['del'] > 0) return 'That folder is not there any more.';
    if (fl_depth($d, $p) >= FL_MAX_DEPTH) return 'Folders can be ' . FL_MAX_DEPTH . ' levels deep at most.';
    return '';
}
// (1.69.1) never all digits: PHP turns such an array key into a number, and a number is not a string id (it broke a purge, about 1 in 1,800 ids)
function fl_new_id(array $d): string { do { $id = bin2hex(random_bytes(8)); } while (isset($d['items'][$id]) || ctype_digit($id)); return $id; }

/* ---------- blobs ---------- */
function fl_blob_drop(string $id): void { foreach (glob(fl_blob_dir() . '/' . $id . '_*') ?: [] as $f) @unlink($f); }
function fl_pieces_have(string $id, int $c): int { $n = 0; for ($i = 0; $i < $c; $i++) if (is_file(fl_blob_path($id, $i))) $n++; return $n; }
function fl_pieces_bytes(string $id, int $c): int { $n = 0; for ($i = 0; $i < $c; $i++) $n += (int)@filesize(fl_blob_path($id, $i)); return $n; }

/** Removes items (and what is inside folders) for good: their pieces, and their share links. */
function fl_purge(array &$d, array $ids): int {
    $all = [];
    foreach ($ids as $id) { if (!isset($d['items'][$id])) continue; $all[$id] = 1; foreach (fl_below($d, $id) as $k) $all[$k] = 1; }
    foreach (array_keys($all) as $id) { $id = (string)$id; if ($d['items'][$id]['t'] === 'f') fl_blob_drop($id); unset($d['items'][$id]); }   // (1.69.1) an all-digit id (made before 1.69.1) is a number as a key
    foreach ($d['shares'] as $tok => $s) if (isset($all[$s['id']])) unset($d['shares'][$tok]);
    return count($all);
}
/** Clean-up that needs no one's attention: Trash older than its days, uploads that never finished, links that ran out. */
function fl_tidy(array &$d, ?int $now = null): int {
    $now = $now ?? time(); $gone = [];
    $keep = (int)$d['settings']['trashDays'] * 86400;
    foreach ($d['items'] as $i) {
        if (!empty($i['top']) && $i['del'] > 0 && $now - $i['del'] > $keep) $gone[] = $i['id'];
        elseif (!empty($i['up']) && $now - $i['at'] > FL_PENDING_HOURS * 3600) $gone[] = $i['id'];
    }
    $n = $gone ? fl_purge($d, $gone) : 0;
    foreach ($d['shares'] as $tok => $s) if ($s['exp'] > 0 && $s['exp'] < $now) { unset($d['shares'][$tok]); $n++; }
    return $n;
}

/** Pieces whose file is not in the list (an upload that was cut off before it was written down): removed after an hour. */
function fl_sweep_blobs(array $d, ?int $now = null): int {
    $now = $now ?? time(); $n = 0;
    foreach (glob(fl_blob_dir() . '/*') ?: [] as $f) {
        if (!preg_match('/^([a-f0-9]{16})_\d+$/', basename($f), $m)) continue;
        if (isset($d['items'][$m[1]])) continue;
        if ($now - (int)@filemtime($f) > 3600 && @unlink($f)) $n++;
    }
    return $n;
}

/* ---------- what the browser is shown ---------- */
function fl_view(array $d): array {
    $items = [];
    foreach ($d['items'] as $i) {
        $o = ['id' => $i['id'], 't' => $i['t'], 'p' => $i['p'], 'm' => $i['m'], 'at' => $i['at'], 'del' => $i['del']];
        if (!empty($i['top'])) $o['top'] = 1;
        if ($i['t'] === 'f') { $o += ['k' => $i['k'], 'c' => $i['c'], 'z' => $i['z']]; if (!empty($i['up'])) $o['up'] = 1; }
        $items[] = $o;
    }
    $shares = [];
    foreach ($d['shares'] as $tok => $s) $shares[] = ['token' => $tok, 'id' => $s['id'], 'exp' => $s['exp'], 'at' => $s['at'], 'pw' => !empty($s['pw']), 'lim' => (int)($s['lim'] ?? 0), 'dl' => (int)($s['dl'] ?? 0)];
    $free = fl_free();
    return ['ok' => true, 'rev' => $d['rev'], 'items' => $items, 'shares' => $shares, 'settings' => $d['settings'], 'usage' => fl_usage($d), 'free' => $free,
            'max' => $d['settings']['limit'] > 0 ? $d['settings']['limit'] : null];
}

/* ---------- changes (each runs inside fl_modify) ---------- */
function fl_op_mkdir(array &$d, string $p, string $m) {
    if (!fl_enc_ok($m)) return ['That name does not look right.', 400];
    if (($why = fl_parent_check($d, $p)) !== '') return [$why, 400];
    if (count($d['items']) >= FL_MAX_ITEMS) return ['That is the most items Files keeps (' . FL_MAX_ITEMS . ').', 400];
    $id = fl_new_id($d);
    $d['items'][$id] = ['id' => $id, 't' => 'd', 'p' => $p, 'm' => $m, 'at' => time(), 'del' => 0];
    return '';
}
/** Starts a file: the item exists (unfinished) so its pieces have somewhere to go. $out['id'] gets the new id. */
function fl_op_put_start(array &$d, string $p, string $m, string $k, int $c, int $z, array &$out) {
    if (!fl_enc_ok($m) || !fl_enc_ok($k, 400)) return ['That file does not look right.', 400];
    if (($why = fl_parent_check($d, $p)) !== '') return [$why, 400];
    if ($c < 1 || $c > FL_MAX_PIECES || $z < 1 || $z > FL_MAX_FILE) return ['That file is too big for Files.', 413];
    if ($z > $c * FL_PIECE_MAX) return ['The pieces of that file do not add up.', 400];
    if (count($d['items']) >= FL_MAX_ITEMS) return ['That is the most items Files keeps (' . FL_MAX_ITEMS . ').', 400];
    $limit = (int)$d['settings']['limit'];
    if ($limit > 0 && fl_usage($d) + $z > $limit) return ['Files is full: that would go over your limit (' . fl_bytes($limit) . '). Empty the Trash or raise the limit in Files Settings.', 507];
    $free = fl_free();
    if ($free !== null && $free < $z + 64 * 1024 * 1024) return ['The server does not have room for that file.', 507];
    $id = fl_new_id($d);
    $d['items'][$id] = ['id' => $id, 't' => 'f', 'p' => $p, 'm' => $m, 'k' => $k, 'c' => $c, 'z' => $z, 'at' => time(), 'del' => 0, 'up' => 1];
    $out['id'] = $id;
    return '';
}
/** (1.80.1) The name a file is sent to Telegram under: no folders, no control characters, at most 120 characters, never empty. */
function fl_tg_name($n): string {
    $n = is_string($n) ? $n : ''; $n = str_replace(['\\', '/'], '-', $n); $n = preg_replace('/[\x00-\x1f\x7f]+/u', '', $n) ?? ''; $n = trim($n, " .\t");
    if (mb_strlen($n) > 120) { $e = (string)pathinfo($n, PATHINFO_EXTENSION); $n = mb_substr($n, 0, 110) . ($e !== '' && strlen($e) <= 8 ? '.' . $e : ''); }
    return $n === '' ? 'file' : $n;
}
/** (1.80.0) Resume: which pieces of an open upload are already on the server. null when that upload is not open. */
function fl_put_have(array $d, string $id): ?array {
    $i = $d['items'][$id] ?? null;
    if (!fl_id_ok($id) || !$i || $i['t'] !== 'f' || empty($i['up'])) return null;
    $have = [];
    for ($n = 0; $n < $i['c']; $n++) if (is_file(fl_blob_path($id, $n))) $have[] = $n;
    return $have;
}
/** (1.80.0) Files activity: one line in Settings > Logs > Activity for what matters (never a name). The same kind is written at most once a minute, so 100 uploads are one line. */
const FL_ACT_WORDS = ['uploaded' => 'Uploaded files', 'trashed' => 'Moved to the Trash', 'purged' => 'Deleted for good', 'shared' => 'Made a share link', 'unshared' => 'Removed a share link'];
function fl_act(string $kind, ?int $now = null): bool {
    if (!isset(FL_ACT_WORDS[$kind])) return false;
    $now = $now ?? time(); $f = fl_dir() . '/act.json'; $j = @json_decode((string)@file_get_contents($f), true); $j = is_array($j) ? $j : [];
    if ($now - (int)($j[$kind] ?? 0) < 60) return false;
    $j[$kind] = $now; hub_write($f, (string)json_encode($j));
    if (function_exists('hub_act')) hub_act('files', FL_ACT_WORDS[$kind]);
    return true;
}
function fl_op_put_done(array &$d, string $id) {
    $i = $d['items'][$id] ?? null;
    if (!$i || $i['t'] !== 'f' || empty($i['up'])) return ['That upload is not open.', 404];
    if (fl_pieces_have($id, $i['c']) !== $i['c'] || fl_pieces_bytes($id, $i['c']) !== $i['z']) return ['Some pieces of that file did not arrive. Try again.', 409];
    unset($d['items'][$id]['up']);
    return '';
}
function fl_op_rename(array &$d, string $id, string $m) {
    if (!isset($d['items'][$id]) || $d['items'][$id]['del'] > 0) return ['That is not there any more.', 404];
    if (!fl_enc_ok($m)) return ['That name does not look right.', 400];
    $d['items'][$id]['m'] = $m; return '';
}
/** Moves items into a folder ('' = the top). A folder can not go into itself or below itself. */
function fl_op_move(array &$d, array $ids, string $p) {
    if (($why = fl_parent_check($d, $p)) !== '') return [$why, 400];
    foreach ($ids as $id) {
        if (!isset($d['items'][$id]) || $d['items'][$id]['del'] > 0) return ['Something you picked is not there any more.', 404];
        if ($p !== '' && ($p === $id || in_array($p, fl_below($d, $id), true))) return ['A folder can not go inside itself.', 400];
    }
    foreach ($ids as $id) $d['items'][$id]['p'] = $p;
    return '';
}
function fl_op_trash(array &$d, array $ids) {
    $now = time();
    foreach ($ids as $id) if (!isset($d['items'][$id]) || $d['items'][$id]['del'] > 0) return ['Something you picked is not there any more.', 404];
    foreach ($ids as $id) {
        $d['items'][$id]['del'] = $now; $d['items'][$id]['top'] = 1;
        foreach (fl_below($d, $id) as $k) if ($d['items'][$k]['del'] === 0) $d['items'][$k]['del'] = $now;
    }
    foreach ($d['shares'] as $tok => $s) { $t = $d['items'][$s['id']] ?? null; if (!$t || $t['del'] > 0) unset($d['shares'][$tok]); }   // a link to something in Trash stops working
    return '';
}
/** Brings items back from Trash into $p (or where they were when that folder is still there, when $p is null). */
function fl_op_restore(array &$d, array $ids, ?string $p) {
    foreach ($ids as $id) if (!isset($d['items'][$id]) || empty($d['items'][$id]['top'])) return ['That is not in the Trash.', 404];
    if ($p !== null && ($why = fl_parent_check($d, $p)) !== '') return [$why, 400];
    foreach ($ids as $id) {
        $was = $d['items'][$id]['del'];
        $to = $p ?? $d['items'][$id]['p'];
        if ($to !== '' && fl_parent_check($d, $to) !== '') $to = '';   // where it was is gone (or in Trash itself): back at the top
        $d['items'][$id]['p'] = $to; $d['items'][$id]['del'] = 0; unset($d['items'][$id]['top']);
        foreach (fl_below($d, $id) as $k) if ($d['items'][$k]['del'] === $was) $d['items'][$k]['del'] = 0;
    }
    return '';
}
function fl_op_purge(array &$d, array $ids) {
    foreach ($ids as $id) if (!isset($d['items'][$id]) || empty($d['items'][$id]['top'])) return ['That is not in the Trash.', 404];
    fl_purge($d, $ids); return '';
}
function fl_op_empty_trash(array &$d) {
    $ids = []; foreach ($d['items'] as $i) if (!empty($i['top']) && $i['del'] > 0) $ids[] = $i['id'];
    fl_purge($d, $ids); return '';
}
/* (1.80.0) Share link options. A password is checked on this side as a "proof": the browser makes it from the password and the link's token (PBKDF2), so the
   password itself never arrives; only a hash of the proof is kept. A download limit counts how many times the first piece is fetched. */
const FL_SHARE_TRIES = 15;    // wrong passwords allowed per link ...
const FL_SHARE_WAIT = 600;    // ... in this many seconds
function fl_proof_ok($p): bool { return is_string($p) && (bool)preg_match('/^[A-Za-z0-9_-]{43}$/', $p); }
function fl_proof_hash(string $proof): string { return hash('sha256', $proof); }
function fl_op_share_create(array &$d, string $id, string $sm, int $exp, array &$out, string $pw = '', int $lim = 0) {
    if (empty($d['settings']['shares'])) return ['Share links are turned off in Files Settings.', 403];
    $i = $d['items'][$id] ?? null;
    if (!$i || $i['t'] !== 'f' || $i['del'] > 0 || !empty($i['up'])) return ['Only a finished file can be shared.', 404];
    if (!fl_enc_ok($sm, 1200)) return ['That link does not look right.', 400];
    if ($exp !== 0 && ($exp < time() + 60 || $exp > time() + 3650 * 86400)) return ['Pick an end date that is still to come (within ten years).', 400];
    if ($pw !== '' && !fl_proof_ok($pw)) return ['That password does not look right.', 400];
    if ($lim < 0 || $lim > 10000) return ['Pick a download limit from 1 to 10000, or none.', 400];
    if (count($d['shares']) >= FL_MAX_SHARES) return ['That is the most share links Files keeps (' . FL_MAX_SHARES . '). Remove some first.', 400];
    $tok = rtrim(strtr(base64_encode(random_bytes(24)), '+/', '-_'), '=');
    $d['shares'][$tok] = ['id' => $id, 'exp' => $exp, 'at' => time(), 'sm' => $sm];
    if ($pw !== '') $d['shares'][$tok]['pw'] = fl_proof_hash($pw);
    if ($lim > 0) { $d['shares'][$tok]['lim'] = $lim; $d['shares'][$tok]['dl'] = 0; }
    $out['token'] = $tok;
    return '';
}
function fl_op_share_delete(array &$d, string $tok) {
    if (!isset($d['shares'][$tok])) return ['That link is already gone.', 404];
    unset($d['shares'][$tok]); return '';
}
/** What a share link shows its holder, or null when it is not valid (missing, ended, or its file is gone: all look the same). */
function fl_share_get(string $tok, ?int $now = null, bool $more = false): ?array {
    if (!fl_token_ok($tok)) return null;
    $d = fl_load(); $s = $d['settings']['shares'] ? ($d['shares'][$tok] ?? null) : null;
    if (!$s || ($s['exp'] > 0 && $s['exp'] < ($now ?? time()))) return null;
    $lim = (int)($s['lim'] ?? 0); $dl = (int)($s['dl'] ?? 0);
    if ($lim > 0 && $dl >= $lim && !$more) return null;   // used up (a download that has started may still fetch its other pieces: $more)
    $i = $d['items'][$s['id']] ?? null;
    if (!$i || $i['t'] !== 'f' || $i['del'] > 0 || !empty($i['up'])) return null;
    return ['id' => $i['id'], 'c' => $i['c'], 'z' => $i['z'], 'sm' => $s['sm'], 'exp' => $s['exp'], 'pw' => !empty($s['pw']), 'lim' => $lim, 'dl' => $dl];
}
/** Does this proof open the link? 'ok', 'need' (none sent), 'wrong', or 'wait' (too many wrong ones lately). A wrong proof is counted. */
function fl_share_proof(string $tok, string $proof, ?int $now = null): string {
    $now = $now ?? time(); $d = fl_load(); $s = $d['shares'][$tok] ?? null;
    if (!$s || empty($s['pw'])) return 'ok';
    if ((int)($s['bad'] ?? 0) >= FL_SHARE_TRIES && $now - (int)($s['bt'] ?? 0) < FL_SHARE_WAIT) return 'wait';
    if ($proof === '' ) return 'need';
    if (fl_proof_ok($proof) && hash_equals($s['pw'], fl_proof_hash($proof))) return 'ok';
    fl_modify(function (array &$x) use ($tok, $now) {
        if (!isset($x['shares'][$tok])) return '';
        $r = &$x['shares'][$tok]; if ($now - (int)($r['bt'] ?? 0) >= FL_SHARE_WAIT) $r['bad'] = 0;
        $r['bad'] = (int)($r['bad'] ?? 0) + 1; $r['bt'] = $now; return '';
    });
    return 'wrong';
}
/** One more download of a link (called when its first piece is sent). */
function fl_share_count(string $tok): void {
    fl_modify(function (array &$x) use ($tok) { if (isset($x['shares'][$tok]) && !empty($x['shares'][$tok]['lim'])) $x['shares'][$tok]['dl'] = (int)($x['shares'][$tok]['dl'] ?? 0) + 1; return ''; });
}

function fl_bytes(int $n): string {
    foreach (['B', 'KB', 'MB', 'GB', 'TB'] as $k => $u) { if ($n < 1024 || $u === 'TB') return ($k ? rtrim(rtrim(number_format($n, 1, '.', ''), '0'), '.') : (string)$n) . ' ' . $u; $n /= 1024; }
    return (string)$n;
}
