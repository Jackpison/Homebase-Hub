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
// Information - storage endpoint (edits need the shared site login).
// The page has a title, an optional custom icon, custom background colors, a backup reminder, and a list of tabs (1 to 20);
// each tab has a name, a color, a layout, a private flag and 1 to 12 text boxes. A box has a stable id, a title, text, a revision,
// and an optional width (third, half, twothirds, full) and height (short, tall, xtall); empty means the layout's own.
// Private tabs (and, if the page is set to private, everything) are only sent to logged-in browsers.
// Encrypted tabs are private tabs whose box titles and text arrive already encrypted by the browser
// (AES-256-GCM, "enc1:" prefix). The server only stores them; it never has the key or the passphrase.
// page.vault holds the encryption key wrapped with the passphrase (PBKDF2-SHA256), never the key itself.
// vault.login = the passphrase is the website password (one password for everything); changing the password re-wraps it.
// The server keeps earlier versions in site-data/info/versions/ (at most one per 10 minutes, the last 40).
// Data lives in site-data/info/info.php (a guarded file that answers 404 in a browser). Every save replaces the
// file in one step (temp file + rename), so a crash or a full disk can never leave half a file behind.
header('Content-Type: application/json; charset=utf-8');
// Compress responses when the browser supports it (smaller downloads, faster loads).
if (extension_loaded('zlib') && !ini_get('zlib.output_compression')) { @ob_start('ob_gzhandler'); }

require __DIR__ . '/../hub/core/lib/boot.php';   // Hub: one login, private data folder
hub_headers();
hub_same_origin();

$dir      = hub_dir('info');
$file     = $dir . '/info.php';   // guarded: answers 404 if opened in a browser

const MAXTAB = 20;
const MAXBOX = 12;              // boxes in one tab
const BOX_W = ['', 'third', 'half', 'twothirds', 'full'];
const BOX_H = ['', 'short', 'tall', 'xtall'];
const KEEP_VERSIONS = 40;
const VERSION_EVERY = 600;      // seconds between automatic earlier-version copies

function hub_strip($s) { if (strncmp($s, '<?php', 5) === 0) { $n = strpos($s, "\n"); return $n === false ? '' : substr($s, $n + 1); } return $s; }
function rid() { return bin2hex(random_bytes(4)); }
function cut($s, $n) {
    $s = trim((string)$s);
    return function_exists('mb_substr') ? mb_substr($s, 0, $n) : substr($s, 0, $n);
}

/* ---------- data ---------- */

// A custom icon is a small PNG or JPEG image stored as a data: URL. Anything else is ignored.
function icon_ok($v) {
    if (!is_string($v) || strlen($v) > 300000) return false;
    if (!preg_match('#^data:image/(png|jpeg);base64,([A-Za-z0-9+/=]+)$#', $v, $m)) return false;
    $bin = base64_decode($m[2], true);
    if ($bin === false) return false;
    return $m[1] === 'png' ? substr($bin, 0, 8) === "\x89PNG\r\n\x1a\n" : substr($bin, 0, 3) === "\xFF\xD8\xFF";
}
// Tab colors are #rrggbb; an empty color means the page picks one automatically.
function color_ok($c) { return is_string($c) && preg_match('/^#[0-9a-fA-F]{6}$/', $c); }
function tab_color($e) { return is_array($e) && isset($e['color']) && color_ok($e['color']) ? strtolower($e['color']) : ''; }
// The icon of a tab (one of the ids in hub_tab_icon()); not sent = keep the one it has, '' = the page's own icon.
function tab_icon($e, $keep = '') { return is_array($e) && array_key_exists('icon', $e) ? hub_tab_icon($e['icon']) : $keep; }
// Optional color for the box headlines of a tab; empty = the normal text color.
function tab_hc($e, $keep = '') { return is_array($e) && array_key_exists('hc', $e) ? (color_ok($e['hc']) ? strtolower($e['hc']) : '') : $keep; }

// How a tab is laid out: "cards" (notebook cards, the default) or "doc" (one document with an outline). "classic" from earlier versions means cards.
// Anything else, or nothing sent, is the original layout, so old pages and old clients keep working.
function tab_layout($e, $keep = 'cards') {
    $v = is_array($e) && array_key_exists('layout', $e) ? $e['layout'] : $keep;
    return $v === 'doc' ? 'doc' : 'cards';   // the old "classic" layout is gone: those tabs are notebook cards now
}

// Backup reminder: remind every N seconds (0 = off) since the last backup (0 = never).
function norm_timer($t) {
    if (!is_array($t)) $t = [];
    $every = isset($t['every']) ? (int)$t['every'] : 7 * 86400;
    return ['every' => max(0, min($every, 365 * 86400)), 'last' => isset($t['last']) ? max(0, (int)$t['last']) : 0];
}

// Custom background colors per theme: page background, text boxes, menus & dialogs. "" = default.
function norm_colors($c) {
    $out = [];
    foreach (['dark', 'light'] as $mode) {
        foreach (['bg', 'box', 'panel'] as $k) {
            $v = isset($c[$mode][$k]) ? $c[$mode][$k] : '';
            $out[$mode][$k] = color_ok($v) ? strtolower($v) : '';
        }
    }
    return $out;
}
// The wrapped encryption key: {v, salt, iter, wrap, login}, all checked for shape only. Anything else is dropped.
function norm_vault($v) {
    if (!is_array($v)) return null;
    $b64 = function ($x, $min, $max) { return is_string($x) && strlen($x) >= $min && strlen($x) <= $max && preg_match('#^[A-Za-z0-9+/=]+$#', $x); };
    if (!isset($v['salt'], $v['wrap'], $v['iter']) || !$b64($v['salt'], 16, 64) || !$b64($v['wrap'], 40, 200)) return null;
    $iter = (int)$v['iter'];
    if ($iter < 100000 || $iter > 10000000) return null;
    $o = ['v' => 1, 'salt' => $v['salt'], 'iter' => $iter, 'wrap' => $v['wrap']];
    if (!empty($v['login'])) $o['login'] = true;
    if (isset($v['rec']) && is_array($v['rec'])) {   // optional recovery key: the same tab key wrapped a second time, with the recovery code
        $r = $v['rec']; $ri = (int)($r['iter'] ?? 0);
        if (isset($r['salt'], $r['wrap']) && $b64($r['salt'], 16, 64) && $b64($r['wrap'], 40, 200) && $ri >= 100000 && $ri <= 10000000) $o['rec'] = ['salt' => $r['salt'], 'iter' => $ri, 'wrap' => $r['wrap']];
    }
    return $o;
}
function norm_page($p) {
    if (!is_array($p)) $p = [];
    return [
        'title'  => isset($p['title']) && is_string($p['title']) ? cut($p['title'], 60) : '',
        'icon'   => isset($p['icon']) && icon_ok($p['icon']) ? $p['icon'] : '',
        'colors' => norm_colors(isset($p['colors']) && is_array($p['colors']) ? $p['colors'] : []),
        'private' => !empty($p['private']),
        'vault'   => norm_vault(isset($p['vault']) ? $p['vault'] : null),
    ];
}

// Box titles are short, but an encrypted title ("enc1:..." from the browser) is longer and must never be cut.
function box_title($t) {
    if (!is_string($t)) return '';
    if (strncmp($t, 'enc1:', 5) === 0) return strlen($t) <= 1200 && preg_match('#^enc1:[A-Za-z0-9+/=]+$#', $t) ? $t : '';
    return cut($t, 80);
}
function has_enc($boxes) {
    foreach ($boxes as $b) { if (strncmp($b['title'], 'enc1:', 5) === 0 || strncmp($b['notes'], 'enc1:', 5) === 0) return true; }
    return false;
}
function box_w($v) { return is_string($v) && in_array($v, BOX_W, true) ? $v : ''; }
function box_h($v) { return is_string($v) && in_array($v, BOX_H, true) ? $v : ''; }
// A box id is 8 hex characters, or a single digit for the two boxes pages had before boxes had ids (0 and 1).
function box_id_ok($v) { return is_string($v) && preg_match('/^([0-9]|[a-f0-9]{8})$/', $v) === 1; }
function norm_box($b, $defTitle) {
    if (!is_array($b)) $b = [];
    $t = isset($b['title']) && is_string($b['title']) ? box_title($b['title']) : '';
    return [
        'id'    => isset($b['id']) && box_id_ok($b['id']) ? $b['id'] : '',
        'w'     => box_w($b['w'] ?? ''),
        'h'     => box_h($b['h'] ?? ''),
        'title' => $t !== '' ? $t : $defTitle,
        'notes' => isset($b['notes']) && is_string($b['notes']) ? $b['notes'] : '',
        'rev'   => isset($b['rev']) ? (int)$b['rev'] : 0,
        'saved' => isset($b['saved']) ? (int)$b['saved'] : 0,
    ];
}

// The boxes of one tab: 1 to MAXBOX, each with a unique id (boxes saved before ids existed get 0 and 1, so nothing already stored changes).
function norm_boxes($bx) {
    $bx = array_slice(array_values(array_filter(is_array($bx) ? $bx : [], 'is_array')), 0, MAXBOX);
    if (!$bx) $bx = [[], []];
    $out = []; $ids = [];
    foreach ($bx as $k => $raw) {
        $b = norm_box($raw, 'Box ' . ($k + 1));
        $id = $b['id'] !== '' && !isset($ids[$b['id']]) ? $b['id'] : '';
        if ($id === '' && $b['id'] === '' && $k < 2 && !isset($ids[(string)$k])) $id = (string)$k;
        while ($id === '' || isset($ids[$id])) $id = rid();
        $ids[$id] = true; $b['id'] = $id; $out[] = $b;
    }
    return $out;
}
function default_boxes($t1 = 'Box 1', $t2 = 'Box 2') { $a = norm_box(null, $t1); $b = norm_box(null, $t2); $a['id'] = rid(); $b['id'] = rid(); return [$a, $b]; }

// Undo (1.62.0): a deleted box or tab comes back with its text. The browser keeps what the server sent (for an encrypted tab that is the
// text still locked, so the server never sees a key) and sends it back as "restore". The text must fit the tab it lands in: locked text
// only into an encrypted tab, readable text only into a readable one, so a restore can never leave readable text in a locked tab.
function restore_box($re, $enc, $defTitle, $id = '', $taken = []) {
    if (!is_array($re)) return null;
    $notes = isset($re['notes']) && is_string($re['notes']) ? $re['notes'] : '';
    $sealed = strncmp($notes, 'enc1:', 5) === 0;
    if ($notes !== '' && $sealed !== (bool)$enc) return null;
    $title = isset($re['title']) && is_string($re['title']) ? box_title($re['title']) : '';
    if (!$enc && strncmp($title, 'enc1:', 5) === 0) return null;
    $b = norm_box(['title' => $title, 'notes' => $notes, 'w' => $re['w'] ?? '', 'h' => $re['h'] ?? ''], $defTitle);
    if (!box_id_ok($id) || isset($taken[$id])) { do { $id = rid(); } while (isset($taken[$id])); }   // the old id comes back when it is free
    $b['id'] = $id; $b['rev'] = 1; $b['saved'] = time();
    return $b;
}
// The boxes of a restored tab: 1 to MAXBOX, each one fitting the tab, with unique ids. null when any of them does not fit.
function restore_boxes($list, $enc) {
    if (!is_array($list) || count($list) < 1 || count($list) > MAXBOX) return null;
    $out = []; $used = [];
    foreach (array_values($list) as $k => $r) {
        $b = restore_box($r, $enc, 'Box ' . ($k + 1), is_array($r) && isset($r['id']) && is_string($r['id']) ? $r['id'] : '', $used);
        if ($b === null) return null;
        $used[$b['id']] = true; $out[] = $b;
    }
    return $out;
}

// Always returns ['tabs' => [ {id, name, boxes: [box, ...]}, ... ], 'rev' => n, 'page' => {title, icon}] with 1..MAXTAB tabs.
function norm_data($j) {
    if (!is_array($j)) $j = [];
    if (!isset($j['tabs'])) $j['tabs'] = [];
    $tabs = []; $seen = [];
    foreach (is_array($j['tabs']) ? array_values($j['tabs']) : [] as $i => $t) {
        if (count($tabs) >= MAXTAB) break;
        if (!is_array($t)) continue;
        $id = isset($t['id']) && is_string($t['id']) && preg_match('/^[a-f0-9]{8}$/', $t['id']) && !isset($seen[$t['id']]) ? $t['id'] : rid();
        $seen[$id] = true;
        $bx = isset($t['boxes']) && is_array($t['boxes']) ? array_values($t['boxes']) : [];
        $nm = isset($t['name']) && is_string($t['name']) ? cut($t['name'], 40) : '';
        $boxes = norm_boxes($bx);
        // A tab holding encrypted text is always an encrypted (and private) tab, whatever its flag says,
        // so encrypted text is never shown raw and never sent to visitors.
        $enc = !empty($t['enc']) || has_enc($boxes);
        $tabs[] = ['id' => $id, 'name' => $nm !== '' ? $nm : 'Tab ' . (count($tabs) + 1), 'color' => tab_color($t), 'hc' => tab_hc($t), 'layout' => tab_layout($t), 'icon' => tab_icon($t), 'private' => !empty($t['private']) || $enc, 'enc' => $enc,
                   'boxes' => $boxes];
    }
    if (!$tabs) $tabs[] = ['id' => rid(), 'name' => 'Information & Notes', 'color' => '', 'layout' => 'cards', 'boxes' => default_boxes('Information', 'Notes')];
    return ['tabs' => $tabs, 'rev' => isset($j['rev']) ? (int)$j['rev'] : 0, 'page' => norm_page(isset($j['page']) ? $j['page'] : null),
            'timer' => norm_timer(isset($j['timer']) ? $j['timer'] : null)];
}

function read_data($file) {
    return norm_data(is_file($file) ? json_decode(hub_jraw($file), true) : null);
}

// Reads the data under an exclusive lock, lets $fn change it, and writes it back when $fn says so.
// $fn returns [httpCode, responseBody, shouldWrite, forceEarlierVersionCopy].
// Copies the data as it was before a change into versions/, at most every VERSION_EVERY seconds
// (always when $force), keeping the newest KEEP_VERSIONS copies.
function snapshot($dir, $raw, $force) {
    if (!is_string($raw) || $raw === '') return;
    $vd = $dir . '/versions';
    if (!is_dir($vd)) @mkdir($vd, 0700, true);
    $files = glob($vd . '/*.php') ?: [];
    sort($files);
    if (!$force && $files && time() - filemtime(end($files)) < VERSION_EVERY) return;
    $name = $vd . '/' . date('Ymd-His') . '.php';
    if (is_file($name) || @file_put_contents($name, $raw, LOCK_EX) === false) return;
    $files[] = $name;
    while (count($files) > KEEP_VERSIONS) @unlink(array_shift($files));
}

/** One lock for every change, kept in its own file so the data file itself can be swapped in one step. */
function info_lock($file) {
    $fh = @fopen(dirname($file) . '/info.lock', 'c');
    if (!$fh) hub_json(500, ['ok' => false, 'error' => 'write failed']);
    flock($fh, LOCK_EX);
    return $fh;
}
function info_unlock($fh) { flock($fh, LOCK_UN); fclose($fh); }

function locked_update($file, $fn) {
    $lk = info_lock($file);
    $before = is_file($file) ? (string)@file_get_contents($file) : '';
    $cur = json_decode(hub_strip($before), true);
    // A file that exists but can't be read must never be "repaired" by saving an empty page over it.
    if ($before !== '' && !is_array($cur)) { info_unlock($lk); hub_json(500, ['ok' => false, 'error' => 'The saved notes could not be read, so nothing was changed. Restore an earlier version in Backup.']); }
    $all = norm_data($cur);
    $res = $fn($all);
    if (!empty($res[2])) {
        snapshot(dirname($file), $before, !empty($res[3]));
        $json = json_encode($all, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        if ($json === false || !hub_write($file, HUB_GUARD . str_replace('<', '\u003C', $json))) { info_unlock($lk); hub_json(500, ['ok' => false, 'error' => 'write failed']); }
    }
    info_unlock($lk);
    hub_json($res[0], $res[1]);
}

// Makes sure the file exists in the current format, so tab ids stay the same from one request to the next.
function ensure_file($file) {
    $marker = dirname($file) . '/.format3';
    if (is_file($file) && is_file($marker)) return;   // already upgraded: skip reading the file on every request
    $j = is_file($file) ? json_decode(hub_jraw($file), true) : null;
    if (is_array($j) && isset($j['tabs'])) { @touch($marker); return; }
    $lk = info_lock($file);
    $raw = is_file($file) ? (string)@file_get_contents($file) : '';
    $cur = json_decode(hub_strip($raw), true);
    if ($raw !== '' && !is_array($cur)) { info_unlock($lk); return; }   // unreadable: leave it alone, never overwrite it
    if (!(is_array($cur) && isset($cur['tabs']))) {
        hub_write($file, HUB_GUARD . str_replace('<', '\u003C', json_encode(norm_data($cur), JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE)));
    }
    info_unlock($lk);
    @touch($marker);
}

/* ---------- setup ---------- */

ensure_file($file);   // hub_dir() already created and locked the folder

/* ---------- login ---------- */

// Edits need the shared site login, plus the site's security check (a request from this site, not another one).
function authed() { return hub_admin() && hub_csrf_ok(); }

$hash = hub_auth() === null ? null : 'hub';   // a password always exists once the site is set up

/* ---------- requests ---------- */

// Sends the page data. Logged-in browsers (or everyone, while no password is set) get everything;
// visitors never receive private tabs, and get only the title, icon and colors when the whole page is private.
function send_view($file, $hash, $in, $ih) {
    $d = read_data($file);
    $d['locked'] = ($hash !== null);
    $d['auth'] = $in;
    if (!$in) {
        if ($d['page']['private']) {
            $d = ['tabs' => [], 'rev' => 0, 'timer' => ['every' => 0, 'last' => 0], 'locked' => true, 'auth' => false, 'closed' => true,
                  'page' => ['title' => $d['page']['title'], 'icon' => $d['page']['icon'], 'colors' => $d['page']['colors'], 'private' => true]];
        } else {
            $d['tabs'] = array_values(array_filter($d['tabs'], function ($t) { return !$t['private']; }));
            $d['page']['vault'] = null;
        }
    }
    // The icon can be large, so it is only sent when the browser's cached copy (identified by $ih) differs.
    $h = $d['page']['icon'] !== '' ? substr(sha1($d['page']['icon']), 0, 16) : '';
    $d['page']['iconHash'] = $h;
    if ($h !== '' && $ih === $h) { $d['page']['icon'] = null; $d['page']['iconSame'] = true; }
    echo json_encode($d, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    send_view($file, true, hub_admin(), isset($_GET['ih']) ? (string)$_GET['ih'] : '');
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') hub_json(405, ['ok' => false]);

$raw = file_get_contents('php://input', false, null, 0, 2097153);
if ($raw === false || strlen($raw) > 2097152) hub_json(413, ['ok' => false, 'error' => 'too large']);
$d = json_decode($raw, true);
if (!is_array($d)) hub_json(400, ['ok' => false, 'error' => 'bad data']);
$action = isset($d['action']) && is_string($d['action']) ? $d['action'] : 'save';


if ($action === 'logout') {   // "Log Out" / "Lock Now": ends the site login on this device
    hub_end_session();
    hub_json(200, ['ok' => true]);
}

if (!in_array($action, ['save', 'save_boxes', 'save_tabs', 'save_page', 'save_colors', 'save_vault', 'remove_vault', 'clear_versions'], true)) hub_json(400, ['ok' => false, 'error' => 'unknown action']);
if (!authed()) hub_json(403, ['ok' => false, 'error' => hub_admin() ? 'Security check failed. Reload the page.' : 'password']);

// Save one box: {tab, box (its id), title, notes, rev, force}
if ($action === 'save') {
    $tabId = isset($d['tab']) && is_string($d['tab']) ? $d['tab'] : '';
    $bid   = isset($d['box']) && (is_string($d['box']) || is_int($d['box'])) ? (string)$d['box'] : '';
    if (!box_id_ok($bid) || !isset($d['notes']) || !is_string($d['notes'])) hub_json(400, ['ok' => false, 'error' => 'bad data']);
    locked_update($file, function (&$all) use ($d, $tabId, $bid) {
        foreach ($all['tabs'] as &$t) {
            if ($t['id'] !== $tabId) continue;
            $k = -1; foreach ($t['boxes'] as $i => $bb) if ($bb['id'] === $bid) { $k = $i; break; }
            if ($k < 0) return [404, ['ok' => false, 'error' => 'gone'], false];
            $cur = $t['boxes'][$k];
            if (empty($d['force']) && (isset($d['rev']) ? (int)$d['rev'] : -1) !== $cur['rev']) {
                return [409, ['ok' => false, 'error' => 'conflict', 'box' => $cur], false];
            }
            $title = isset($d['title']) && is_string($d['title']) ? box_title($d['title']) : '';
            $t['boxes'][$k] = ['id' => $bid, 'w' => $cur['w'], 'h' => $cur['h'], 'title' => $title !== '' ? $title : $cur['title'], 'notes' => $d['notes'], 'rev' => $cur['rev'] + 1, 'saved' => time()];
            return [200, ['ok' => true, 'box' => $t['boxes'][$k]], true];
        }
        return [404, ['ok' => false, 'error' => 'gone'], false];
    });
}

// Add, remove, reorder and resize the boxes of one tab: {tab, boxes: [{id or null, w, h}, ...], rev}
// Boxes left out are removed together with their text; entries without a known id are new, empty boxes.
if ($action === 'save_boxes') {
    $tabId = isset($d['tab']) && is_string($d['tab']) ? $d['tab'] : '';
    $list  = isset($d['boxes']) && is_array($d['boxes']) ? array_values($d['boxes']) : [];
    if (count($list) < 1 || count($list) > MAXBOX) hub_json(400, ['ok' => false, 'error' => 'box count']);
    locked_update($file, function (&$all) use ($d, $tabId, $list) {
        if ((isset($d['rev']) ? (int)$d['rev'] : -1) !== $all['rev']) return [409, ['ok' => false, 'error' => 'conflict', 'data' => $all], false];
        foreach ($all['tabs'] as &$t) {
            if ($t['id'] !== $tabId) continue;
            $old = []; foreach ($t['boxes'] as $b) $old[$b['id']] = $b;
            $boxes = []; $used = []; $n = 0;
            foreach ($list as $e) {
                $n++; if (!is_array($e)) $e = [];
                $id = isset($e['id']) && is_string($e['id']) ? $e['id'] : '';
                if ($id !== '' && isset($old[$id]) && !isset($used[$id])) { $b = $old[$id]; }
                elseif (isset($e['restore'])) {   // Undo: a deleted box comes back with its text, at this place in the list
                    $b = restore_box($e['restore'], !empty($t['enc']), 'Box ' . $n, $id, $old + $used);
                    if ($b === null) return [422, ['ok' => false, 'error' => 'restore'], false];
                    $id = $b['id'];
                }
                else { do { $id = rid(); } while (isset($old[$id]) || isset($used[$id])); $b = norm_box(null, 'Box ' . $n); $b['id'] = $id; }
                $used[$id] = true; $b['w'] = box_w($e['w'] ?? ''); $b['h'] = box_h($e['h'] ?? '');
                $boxes[] = $b;
            }
            $removed = count(array_diff(array_keys($old), array_keys($used))) > 0;
            $t['boxes'] = $boxes; $all['rev']++;
            return [200, ['ok' => true, 'data' => $all], true, $removed];   // removing a box keeps an earlier version
        }
        return [404, ['ok' => false, 'error' => 'gone'], false];
    });
}

// Rename, recolor, add, remove and reorder tabs: {tabs: [{id or null, name, color}, ...], rev}
// Tabs left out are removed together with their text; entries without a known id are new tabs.
if ($action === 'save_tabs') {
    $list = isset($d['tabs']) && is_array($d['tabs']) ? array_values($d['tabs']) : [];
    if (count($list) < 1 || count($list) > MAXTAB) hub_json(400, ['ok' => false, 'error' => 'tab count']);
    locked_update($file, function (&$all) use ($d, $list) {
        if ((isset($d['rev']) ? (int)$d['rev'] : -1) !== $all['rev']) {
            return [409, ['ok' => false, 'error' => 'conflict', 'data' => $all], false];
        }
        $old = [];
        foreach ($all['tabs'] as $t) $old[$t['id']] = $t;
        $tabs = []; $used = [];
        foreach ($list as $i => $e) {
            $id = is_array($e) && isset($e['id']) && is_string($e['id']) ? $e['id'] : '';
            $nm = is_array($e) && isset($e['name']) && is_string($e['name']) ? cut($e['name'], 40) : '';
            if ($nm === '') $nm = 'Tab ' . ($i + 1);
            if ($id !== '' && isset($old[$id]) && !isset($used[$id])) {
                $t = $old[$id]; $t['name'] = $nm; $t['color'] = tab_color($e); $t['hc'] = tab_hc($e, $t['hc'] ?? ''); $t['layout'] = tab_layout($e, $t['layout'] ?? 'cards'); $t['icon'] = tab_icon($e, $t['icon'] ?? ''); $t['enc'] = array_key_exists('enc', $e) ? !empty($e['enc']) || has_enc($t['boxes']) : $t['enc']; // pages from before encryption don't send it
                $t['private'] = !empty($e['private']) || $t['enc']; $used[$id] = true;
            } elseif (is_array($e) && isset($e['restore']) && is_array($e['restore'])) {   // Undo: a deleted tab comes back with all its boxes
                $enc = !empty($e['enc']);
                $bx = $enc && empty($all['page']['vault']) ? null : restore_boxes($e['restore']['boxes'] ?? null, $enc);   // a locked tab needs the key that locked it
                if ($bx === null) return [422, ['ok' => false, 'error' => 'restore'], false];
                $tid = preg_match('/^[a-f0-9]{8}$/', $id) === 1 && !isset($old[$id]) && !isset($used[$id]) ? $id : rid();
                $t = ['id' => $tid, 'name' => $nm, 'color' => tab_color($e), 'hc' => tab_hc($e), 'layout' => tab_layout($e), 'icon' => tab_icon($e), 'private' => !empty($e['private']) || $enc, 'enc' => $enc, 'boxes' => $bx];
                $used[$tid] = true;
            } else {
                $t = ['id' => rid(), 'name' => $nm, 'color' => tab_color($e), 'hc' => tab_hc($e), 'layout' => tab_layout($e), 'icon' => tab_icon($e), 'private' => !empty($e['private']) || !empty($e['enc']), 'enc' => !empty($e['enc']), 'boxes' => default_boxes()];
            }
            $tabs[] = $t;
        }
        $removed = count(array_diff(array_keys($old), array_keys($used))) > 0;
        $all['tabs'] = $tabs; $all['rev']++;
        return [200, ['ok' => true, 'data' => $all], true, $removed];   // removing a tab always keeps an earlier version
    });
}

// Page settings: {title, icon, private}. An empty title or icon means the default one.
if ($action === 'save_page') {
    if (isset($d['icon']) && $d['icon'] !== '' && !icon_ok($d['icon'])) hub_json(400, ['ok' => false, 'error' => 'bad icon']);
    locked_update($file, function (&$all) use ($d) {
        $np = norm_page($d);
        $all['page']['title'] = $np['title'];
        $all['page']['icon']  = $np['icon'];
        if (isset($d['private'])) $all['page']['private'] = !empty($d['private']);
        return [200, ['ok' => true, 'page' => $all['page']], true];
    });
}

// Background colors: {colors: {dark: {bg, box, panel}, light: {bg, box, panel}}}; "" = default.
if ($action === 'save_colors') {
    locked_update($file, function (&$all) use ($d) {
        $all['page']['colors'] = norm_colors(isset($d['colors']) && is_array($d['colors']) ? $d['colors'] : []);
        return [200, ['ok' => true, 'page' => $all['page']], true];
    });
}


// Set or change the wrapped encryption key: {vault, prev, pw}. prev must be the current wrap ("" if none), so a stale
// page can never replace a key that encrypted tabs depend on. A key wrapped with the website password (vault.login) needs
// that password in pw, checked like a login, so a typo can never lock the tabs with a password nobody knows.
if ($action === 'save_vault') {
    $v = norm_vault(isset($d['vault']) ? $d['vault'] : null);
    if (!$v) hub_json(400, ['ok' => false, 'error' => 'bad vault']);
    if (!empty($v['login'])) {
        if (($w = hub_rate_wait()) > 0) hub_json(429, ['ok' => false, 'error' => 'wait']);
        $pw = isset($d['pw']) && is_string($d['pw']) ? $d['pw'] : '';
        if ($pw === '' || !password_verify($pw, hub_auth()['hash'])) { usleep(random_int(300000, 700000)); hub_rate_fail(); hub_json(401, ['ok' => false, 'error' => 'sitepw']); }
    }
    $prev = isset($d['prev']) && is_string($d['prev']) ? $d['prev'] : '';
    locked_update($file, function (&$all) use ($v, $prev) {
        $cur = $all['page']['vault'] ? $all['page']['vault']['wrap'] : '';
        if (!hash_equals($cur, $prev)) return [409, ['ok' => false, 'error' => 'conflict', 'vault' => $all['page']['vault']], false];
        $all['page']['vault'] = $v;
        return [200, ['ok' => true, 'vault' => $v], true];
    });
}

// Remove encryption (Settings > Security): {prev, pw, tabs: {tabId: [{title, notes, rev}, {title, notes, rev}]}}.
// The browser decrypted every encrypted tab with the key; this swaps in that plain text, turns the tabs into normal
// private tabs and deletes the key, all in one write. Every encrypted tab must be there with the revisions the browser
// saw, so a box changed elsewhere in the meantime is never overwritten. Needs the website password, checked like a login.
if ($action === 'remove_vault') {
    if (($w = hub_rate_wait()) > 0) hub_json(429, ['ok' => false, 'error' => 'wait']);
    $pw = isset($d['pw']) && is_string($d['pw']) ? $d['pw'] : '';
    if ($pw === '' || !password_verify($pw, hub_auth()['hash'])) { usleep(random_int(300000, 700000)); hub_rate_fail(); hub_json(401, ['ok' => false, 'error' => 'sitepw']); }
    $prev = isset($d['prev']) && is_string($d['prev']) ? $d['prev'] : '';
    $plain = isset($d['tabs']) && is_array($d['tabs']) ? $d['tabs'] : [];
    locked_update($file, function (&$all) use ($prev, $plain) {
        $cur = $all['page']['vault'] ? $all['page']['vault']['wrap'] : '';
        if ($cur === '' || !hash_equals($cur, $prev)) return [409, ['ok' => false, 'error' => 'conflict'], false];
        foreach ($all['tabs'] as &$t) {
            if (!$t['enc']) continue;
            $in = isset($plain[$t['id']]) && is_array($plain[$t['id']]) ? array_values($plain[$t['id']]) : null;
            if (!$in || count($in) !== count($t['boxes'])) return [409, ['ok' => false, 'error' => 'missing tab'], false];
            foreach (array_keys($t['boxes']) as $k) {
                $b = $in[$k];
                if (!is_array($b) || !isset($b['notes']) || !is_string($b['notes']) || (int)($b['rev'] ?? -1) !== $t['boxes'][$k]['rev']) return [409, ['ok' => false, 'error' => 'conflict'], false];
                $title = isset($b['title']) && is_string($b['title']) ? $b['title'] : '';
                if (strncmp($title, 'enc1:', 5) === 0 || strncmp($b['notes'], 'enc1:', 5) === 0) return [400, ['ok' => false, 'error' => 'still encrypted'], false];
                $title = box_title($title);
                $t['boxes'][$k] = ['id' => $t['boxes'][$k]['id'], 'w' => $t['boxes'][$k]['w'], 'h' => $t['boxes'][$k]['h'], 'title' => $title !== '' ? $title : 'Box ' . ($k + 1), 'notes' => $b['notes'], 'rev' => $t['boxes'][$k]['rev'] + 1, 'saved' => time()];
            }
            $t['enc'] = false; $t['private'] = true;   // still hidden from visitors
        }
        unset($t);
        $all['page']['vault'] = null;
        $all['rev']++;
        return [200, ['ok' => true], true, true];
    });
}

// Delete all earlier versions (used after encrypting a tab, so no unencrypted copy of it stays on the server).
if ($action === 'clear_versions') {
    $n = 0;
    foreach (glob($dir . '/versions/*.php') ?: [] as $f) { if (@unlink($f)) $n++; }
    hub_json(200, ['ok' => true, 'removed' => $n]);
}
