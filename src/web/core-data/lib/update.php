<?php
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
 * Updates (Settings > Updates).
 *
 *   Update  You upload the update zip. It is checked completely before anything on the site is touched; then, after you confirm with your
 *           password, the site saves the version it has now, replaces its own files one by one, removes the files the old version had and
 *           the new one does not, and looks at itself afterwards. If it cannot answer, the saved version comes back by itself.
 *   Files   Every release carries web/core-data/manifest.json (every file with its fingerprint). Comparing it with what is on the server shows files
 *           that are not part of this version (leftovers, copies, a planted script) and files that were changed by hand.
 *
 * Never touched, by an update or by the clean-up: site-data (all your data), web/core-data/media (your pictures and logo), web/core-data/config.php,
 * web/core-data/data (the old fallback data folder) and web/tools/config.json (made from your settings).
 * The zip is read here in plain PHP (gzinflate), so no zip extension is needed.
 */
require_once __DIR__ . '/boot.php';

const UP_MAX_ZIP   = 134217728;   // 128 MB: the whole upload
const UP_MAX_FILES = 3000;
const UP_MAX_FILE  = 83886080;    // 80 MB: one file inside
const UP_MAX_TOTAL = 419430400;   // 400 MB: everything once unpacked
const UP_EXT = ['php', 'js', 'css', 'html', 'json', 'txt', 'md', 'htaccess', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'woff', 'woff2', 'ttf', 'otf', 'wasm', 'traineddata', 'onnx', 'map', 'mjs', 'xml'];

function up_root(): string { return rtrim(str_replace('\\', '/', HUB_PUBLIC), '/'); }
function up_dir(): string { return hub_dir('updates'); }
function up_state(): array { return hub_jread(up_dir() . '/state.json') ?? []; }   // guarded like every data file (state.php; an old plain state.json is read once and replaced)
function up_state_save(array $s): void { hub_jput(up_dir() . '/state.json', json_encode($s, JSON_UNESCAPED_SLASHES)); }

/** Paths no update and no clean-up may write, list or delete (your pictures and logo keep only their own .htaccess in the release). */
function up_protected(string $rel): bool {
    return $rel === 'web/core-data/config.php' || strpos($rel, 'web/core-data/data/') === 0 || $rel === 'web/tools/config.json'
        || (strpos($rel, 'web/core-data/media/') === 0 && basename($rel) !== '.htaccess');
}
function up_hash(string $file): string { return (string)@hash_file('sha256', $file); }
/** Where a file of a stored copy of the code (the update being checked, the saved version) is kept. PHP files get ".stored" added, so nothing
 *  in site-data can ever be run as a script, even on a server that ignores .htaccess. They get their real name back only when copied into place. */
function up_sp(string $dir, string $p): string { return $dir . '/' . $p . (substr($p, -4) === '.php' ? '.stored' : ''); }
/** A copy kept by an earlier updater holds plain .php files: rename them the same way (once). */
function up_neutralise_saved(): void {
    foreach (['state', 'previous', 'incoming'] as $n) {   // state files an earlier updater left as plain .json become guarded .php
        $f = up_dir() . "/$n.json";
        if (is_file($f)) { $j = hub_jread($f); if (is_array($j)) hub_jput($f, json_encode($j, JSON_UNESCAPED_SLASHES)); else @unlink($f); }
    }
    foreach (['previous', 'previous-hold', 'staging'] as $d) {
        $dir = up_dir() . '/' . $d; if (!is_file($dir . '/index.php')) continue;
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS));
        foreach ($it as $f) if ($f->isFile() && !$f->isLink() && substr($f->getFilename(), -4) === '.php') @rename($f->getPathname(), $f->getPathname() . '.stored');
    }
}
function up_size(int $n): string { return $n >= 1048576 ? round($n / 1048576, 1) . ' MB' : max(1, (int)round($n / 1024)) . ' KB'; }

/** web/core-data/manifest.json of a site folder (default: this one): ['version' => '1.31.0', 'files' => [path => sha256]], or null. */
function up_manifest(?string $root = null): ?array {
    $j = json_decode((string)@file_get_contents(($root ?? up_root()) . '/web/core-data/manifest.json'), true);
    if (!is_array($j) || !isset($j['version'], $j['files']) || !is_array($j['files']) || !preg_match('/^\d+\.\d+\.\d+$/', (string)$j['version'])) return null;
    foreach ($j['files'] as $p => $h) if (!is_string($p) || !is_string($h) || !preg_match('/^[a-f0-9]{64}$/', $h)) return null;
    return $j;
}

/* ============================== reading a zip (plain PHP) ============================== */

/** Every entry of a zip, from its central directory. Throws RuntimeException with a sentence for the person. */
function up_zip_entries(string $zip): array {
    $size = (int)@filesize($zip);
    if ($size < 22) throw new RuntimeException('That file is too small to be a zip.');
    $f = fopen($zip, 'rb'); if (!$f) throw new RuntimeException('The uploaded file could not be read.');
    $tail = min($size, 65557); fseek($f, $size - $tail); $buf = (string)fread($f, $tail);
    $p = strrpos($buf, "PK\x05\x06"); if ($p === false) { fclose($f); throw new RuntimeException('That is not a zip file.'); }
    $e = unpack('vdisk/vcddisk/vthis/vtotal/Vcdsize/Vcdoff', substr($buf, $p + 4, 16));
    if ($e['total'] === 0xFFFF || $e['cdoff'] === 0xFFFFFFFF || $e['cdsize'] === 0xFFFFFFFF) { fclose($f); throw new RuntimeException('This zip uses a format that is too large (zip64).'); }
    if ($e['total'] > UP_MAX_FILES) { fclose($f); throw new RuntimeException('The zip holds too many files (' . $e['total'] . ').'); }
    if ($e['cdoff'] + $e['cdsize'] > $size) { fclose($f); throw new RuntimeException('The zip is damaged (its file list is cut off).'); }
    fseek($f, $e['cdoff']); $cd = (string)fread($f, $e['cdsize']); fclose($f);
    $out = []; $pos = 0;
    for ($i = 0; $i < $e['total']; $i++) {
        if (substr($cd, $pos, 4) !== "PK\x01\x02" || $pos + 46 > strlen($cd)) throw new RuntimeException('The zip is damaged (its file list is not readable).');
        $h = unpack('vmade/vneed/vflags/vmethod/vtime/vdate/Vcrc/Vcsize/Vusize/vnlen/velen/vclen/vdisk/viattr/Vxattr/Vloff', substr($cd, $pos + 4, 42));
        $name = substr($cd, $pos + 46, $h['nlen']); $pos += 46 + $h['nlen'] + $h['elen'] + $h['clen'];
        $out[] = ['name' => $name, 'method' => $h['method'], 'flags' => $h['flags'], 'crc' => $h['crc'], 'csize' => $h['csize'], 'usize' => $h['usize'],
                  'loff' => $h['loff'], 'dir' => substr($name, -1) === '/', 'symlink' => ((($h['xattr'] >> 16) & 0170000) === 0120000), 'madeUnix' => (($h['made'] >> 8) === 3)];
    }
    return $out;
}

/** Unpacks one entry to $dest, streaming; checks its size and CRC. */
function up_zip_extract(string $zip, array $en, string $dest): void {
    $f = fopen($zip, 'rb'); if (!$f) throw new RuntimeException('The uploaded file could not be read.');
    fseek($f, $en['loff']); $h = (string)fread($f, 30);
    if (substr($h, 0, 4) !== "PK\x03\x04") { fclose($f); throw new RuntimeException('The zip is damaged near ' . $en['name'] . '.'); }
    $l = unpack('vnlen/velen', substr($h, 26, 4)); fseek($f, $en['loff'] + 30 + $l['nlen'] + $l['elen']);
    @mkdir(dirname($dest), 0755, true); $o = fopen($dest, 'wb'); if (!$o) { fclose($f); throw new RuntimeException('Could not write in the update folder.'); }
    $written = 0;
    try {
        if ($en['method'] === 0) {
            $left = $en['usize'];
            while ($left > 0) { $b = (string)fread($f, min(1048576, $left)); if ($b === '') throw new RuntimeException('The zip is cut off at ' . $en['name'] . '.'); $left -= strlen($b); $written += strlen($b); fwrite($o, $b); }
        } elseif ($en['method'] === 8) {
            $ctx = inflate_init(ZLIB_ENCODING_RAW); $left = $en['csize'];
            while ($left > 0) {
                $b = (string)fread($f, min(262144, $left)); if ($b === '') throw new RuntimeException('The zip is cut off at ' . $en['name'] . '.');
                $left -= strlen($b); $d = @inflate_add($ctx, $b); if ($d === false) throw new RuntimeException('The zip is damaged at ' . $en['name'] . '.');
                $written += strlen($d); if ($written > $en['usize'] || $written > UP_MAX_FILE) throw new RuntimeException($en['name'] . ' unpacks to more than the zip says.');
                fwrite($o, $d);
            }
            $d = @inflate_add($ctx, '', ZLIB_FINISH); if ($d === false) throw new RuntimeException('The zip is damaged at ' . $en['name'] . '.');
            $written += strlen($d); fwrite($o, $d);
        } else throw new RuntimeException($en['name'] . ' is packed in a way this check does not accept.');
    } finally { fclose($f); fclose($o); }
    if ($written !== $en['usize']) throw new RuntimeException($en['name'] . ' does not have the size the zip says.');
    if (strtolower(hash_file('crc32b', $dest)) !== sprintf('%08x', $en['crc'])) throw new RuntimeException($en['name'] . ' is damaged (its checksum is wrong).');
}

/** Why a name inside the zip is not acceptable, or '' when it is. */
function up_name_problem(string $n, bool $dir): string {
    if ($n === '' || strlen($n) > 200) return 'a name that is empty or too long';
    if (!mb_check_encoding($n, 'UTF-8') || preg_match('/[\x00-\x1f\\\\:*?"<>|]/', $n) || $n[0] === '/') return 'a name with unsafe characters';
    $segs = explode('/', rtrim($n, '/'));
    foreach ($segs as $s) if ($s === '' || $s === '.' || $s === '..' || !preg_match('/^[A-Za-z0-9._@+-]+$/', $s)) return 'an unsafe path';
    if ($dir) return '';
    $top = $segs[0];
    if (!($n === 'index.php' || $top === 'web')) return 'a place outside web and index.php';
    $base = end($segs); $ext = $base === '.htaccess' ? 'htaccess' : strtolower(pathinfo($base, PATHINFO_EXTENSION));
    if (!in_array($ext, UP_EXT, true)) return 'a file type a site update never has (.' . $ext . ')';
    if (strpos($n, 'web/core-data/media/') === 0 && $base !== '.htaccess') return 'a file inside your pictures folder';
    if ($ext === 'php' && !preg_match('~^(index\.php|web/core-data/lib/[A-Za-z0-9_-]+\.php|web/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+\.php)$~', $n)) return 'a PHP file in a place where none belongs';
    if ($n === 'web/core-data/config.php') return 'your own configuration file';
    return '';
}

/* ============================== the check ============================== */

/** Can the site replace its own files? Returns the folders it cannot write in (empty = it can). */
function up_unwritable(): array {
    $bad = []; $root = up_root();
    foreach (['', 'web/core-data', 'web/core-data/lib', 'web/core-data/assets', 'web', 'web/tools', 'web/links', 'web/info', 'web/cards', 'web/tasks', 'web/home'] as $d) {
        $dir = $root . ($d === '' ? '' : '/' . $d); if (!is_dir($dir)) continue;
        $t = $dir . '/.upd-test-' . bin2hex(random_bytes(4));
        if (@file_put_contents($t, 'x') === false) { $bad[] = $d === '' ? '(site folder)' : $d; continue; }
        @unlink($t);
    }
    if (is_file($root . '/index.php') && !is_writable($root . '/index.php')) $bad[] = 'index.php';
    return $bad;
}

/** What this server allows, for the Update tab. */
function up_status(): array {
    up_neutralise_saved();
    $s = up_state(); $man = up_manifest();
    $prev = is_file(up_dir() . '/previous/web/core-data/manifest.json') ? (hub_jread(up_dir() . '/previous.json') ?: null) : null;
    return ['version' => HUB, 'hasManifest' => $man !== null, 'manifestVersion' => $man['version'] ?? null, 'php' => PHP_VERSION,
            'canInflate' => function_exists('inflate_init'), 'unwritable' => up_unwritable(),
            'free' => (int)@disk_free_space(up_root()), 'chunk' => 1048576, 'max' => UP_MAX_ZIP,
            'staged' => $s['staged'] ?? null, 'notes' => isset($s['staged']) ? (string)($s['notes'] ?? '') : '', 'plan' => isset($s['staged']) ? ($s['plan'] ?? null) : null, 'previous' => $prev, 'last' => $s['last'] ?? null, 'autoUndo' => !isset($s['autoUndo']) || !empty($s['autoUndo']), 'gh' => (function () { require_once __DIR__ . '/ghupdate.php'; return gh_info(); })()];
}

/** One piece of the upload. The pieces arrive in order; the last one completes the zip. */
function up_chunk(string $id, int $i, int $n, string $data): array {
    if (!preg_match('/^[a-f0-9]{16}$/', $id) || $n < 1 || $n > 256 || $i < 0 || $i >= $n) return ['ok' => false, 'error' => 'That piece of the upload makes no sense.'];
    if ($data === '' || strlen($data) > 4194304) return ['ok' => false, 'error' => 'A piece of the upload was empty or too large.'];
    $part = up_dir() . '/incoming.part'; $meta = up_dir() . '/incoming.json';   // kept as guarded incoming.php
    if ($i === 0) { @unlink($part); @unlink(up_dir() . '/incoming.zip'); hub_jput($meta, json_encode(['id' => $id, 'n' => $n, 'next' => 0, 'bytes' => 0])); }
    $m = hub_jread($meta);
    if (!is_array($m) || $m['id'] !== $id || $m['n'] !== $n || $m['next'] !== $i) return ['ok' => false, 'error' => 'The upload got out of order. Choose the file again.'];
    $m['bytes'] += strlen($data);
    if ($m['bytes'] > UP_MAX_ZIP) { @unlink($part); return ['ok' => false, 'error' => 'That file is larger than ' . up_size(UP_MAX_ZIP) . ', too large for a site update.']; }
    if (@file_put_contents($part, $data, FILE_APPEND | LOCK_EX) === false) return ['ok' => false, 'error' => 'The server could not save the upload (is the disk full?).'];
    $m['next'] = $i + 1; hub_jput($meta, json_encode($m));
    if ($m['next'] === $n) { @rename($part, up_dir() . '/incoming.zip'); return ['ok' => true, 'done' => true, 'bytes' => $m['bytes']]; }
    return ['ok' => true, 'done' => false];
}

/** Throws away an upload that was checked but not applied. */
function up_cancel(): void {
    foreach (['incoming.zip', 'incoming.part', 'incoming.json', 'incoming.php'] as $f) @unlink(up_dir() . '/' . $f);
    if (is_dir(up_dir() . '/staging')) hub_rm_tree(up_dir() . '/staging');
    $s = up_state(); unset($s['staged'], $s['notes']); up_state_save($s);
}

/** Checks the uploaded zip completely and unpacks it to the staging folder. Nothing on the site changes. */
function up_check(string $name): array {
    $zip = up_dir() . '/incoming.zip'; $checks = []; $block = [];
    $add = function (bool $ok, string $title, string $note = '') use (&$checks, &$block) { $checks[] = ['ok' => $ok, 'title' => $title, 'note' => $note]; if (!$ok) $block[] = $note !== '' ? $note : $title; };
    if (!is_file($zip)) return ['ok' => false, 'error' => 'Nothing has been uploaded yet.'];
    $stage = up_dir() . '/staging'; if (is_dir($stage)) hub_rm_tree($stage);
    $fail = function (string $why) use (&$checks) { return ['ok' => false, 'error' => $why, 'checks' => $checks]; };
    try { $entries = up_zip_entries($zip); } catch (RuntimeException $e) { return $fail($e->getMessage()); }
    $files = []; $seen = []; $total = 0; $bad = [];
    foreach ($entries as $en) {
        if (in_array($en['name'], ['__MACOSX/', '.DS_Store'], true) || strpos($en['name'], '__MACOSX/') === 0 || basename(rtrim($en['name'], '/')) === '.DS_Store') continue;   // what a Mac adds
        if ($en['flags'] & 1) { $bad[] = $en['name'] . ' (locked with a password)'; continue; }
        if ($en['symlink']) { $bad[] = $en['name'] . ' (a link)'; continue; }
        $pr = up_name_problem($en['name'], $en['dir']);
        if ($pr !== '') { $bad[] = $en['name'] . ' (' . $pr . ')'; continue; }
        if ($en['dir']) continue;
        $k = strtolower($en['name']); if (isset($seen[$k])) { $bad[] = $en['name'] . ' (listed twice)'; continue; } $seen[$k] = 1;
        if ($en['usize'] > UP_MAX_FILE) { $bad[] = $en['name'] . ' (larger than ' . up_size(UP_MAX_FILE) . ')'; continue; }
        $total += $en['usize']; $files[$en['name']] = $en;
    }
    $add(!$bad, 'Every file name is safe.', $bad ? 'Refused: ' . implode('; ', array_slice($bad, 0, 5)) . (count($bad) > 5 ? ' and ' . (count($bad) - 5) . ' more.' : '.') : 'No tricks with folders, no scripts hidden in your picture folders, no private files.');
    if ($total > UP_MAX_TOTAL) $add(false, 'The update is not too large to unpack.', 'It would unpack to ' . up_size($total) . '.');
    if ($block) return $fail('This zip cannot be used. ' . $block[0]);
    $add(isset($files['web/core-data/lib/boot.php'], $files['web/core-data/api.php'], $files['index.php'], $files['web/core-data/manifest.json']), 'It is a site update.', 'It holds the site\'s own files: the web folder and index.php, with its file list.');
    if (!isset($files['web/core-data/manifest.json'])) return $fail('This zip cannot be used: it is not a site update (it has no file list).');
    $free = (int)@disk_free_space(up_dir()); $need = $total * 2 + 8388608;
    $add($free <= 0 || $free > $need, 'There is room on the disk.', $free > 0 ? up_size($free) . ' free, ' . up_size($need) . ' needed.' : '');
    if ($free > 0 && $free <= $need) return $fail('There is not enough room on the disk for this update.');
    try { foreach ($files as $n => $en) up_zip_extract($zip, $en, up_sp($stage, $n)); }
    catch (RuntimeException $e) { hub_rm_tree($stage); return $fail($e->getMessage()); }
    $man = up_manifest($stage);
    if (!$man) { hub_rm_tree($stage); return $fail('The zip\'s file list (web/core-data/manifest.json) cannot be read.'); }
    $wrong = []; foreach ($man['files'] as $p => $h) { if (!isset($files[$p])) $wrong[] = $p . ' (missing)'; elseif (up_hash(up_sp($stage, $p)) !== $h) $wrong[] = $p . ' (changed)'; }
    foreach ($files as $p => $_) if ($p !== 'web/core-data/manifest.json' && !isset($man['files'][$p])) $wrong[] = $p . ' (not on the list)';
    $add(!$wrong, 'Every file is whole.', $wrong ? 'The fingerprints do not match for: ' . implode('; ', array_slice($wrong, 0, 4)) . '.' : 'All ' . count($man['files']) . ' files match the zip\'s own list.');
    $bv = preg_match("/define\('HUB', '(\d+\.\d+\.\d+)'\)/", (string)@file_get_contents(up_sp($stage, 'web/core-data/lib/boot.php')), $mm) ? $mm[1] : '';
    $add($bv !== '' && $bv === $man['version'], 'The version is the same everywhere.', $bv !== '' ? 'Version ' . $bv . '.' : 'The version could not be read.');
    $syntax = [];
    foreach ($files as $n => $_) if (substr($n, -4) === '.php') { try { token_get_all((string)file_get_contents(up_sp($stage, $n)), TOKEN_PARSE); } catch (Throwable $e) { $syntax[] = $n; } }
    $add(!$syntax, 'Every PHP file is readable.', $syntax ? 'Broken: ' . implode(', ', array_slice($syntax, 0, 4)) : 'No cut-off or damaged scripts.');
    $add(isset($files['web/core-data/lib/update.php']), 'It can update itself again.', 'The updater is part of it, so the next update works too.');
    $rel = version_compare($man['version'], HUB);
    $add($rel >= 0, $rel > 0 ? 'It is newer than yours.' : 'It is the same version as yours.', $rel > 0 ? HUB . ' to ' . $man['version'] . '.' : ($rel === 0 ? 'Applying it repairs the files of ' . HUB . '.' : 'This is ' . $man['version'] . ' and you have ' . HUB . '. To go back, use Go Back.'));
    $un = up_unwritable();
    $add(!$un, 'This server lets the site replace its own files.', $un ? 'It cannot write in: ' . implode(', ', $un) . '. Ask your host, or update with the File Manager.' : 'Tested just now.');
    $add(true, 'Your current version is saved first.', 'So you can go back in one click.');
    if ($block) { hub_rm_tree($stage); return $fail('This zip cannot be used. ' . implode(' ', array_slice($block, 0, 2))); }
    // what will change
    $root = up_root(); $old = up_manifest(); $upd = []; $new = []; $rem = [];
    foreach ($man['files'] as $p => $h) { if (up_protected($p) && is_file($root . '/' . $p)) continue; if (!is_file($root . '/' . $p)) $new[] = $p; elseif (up_hash($root . '/' . $p) !== $h) $upd[] = $p; }
    if ($old) foreach ($old['files'] as $p => $_) if (!isset($man['files'][$p]) && is_file($root . '/' . $p) && !up_protected($p)) $rem[] = $p;
    sort($upd); sort($new); sort($rem);
    $info = ['name' => preg_replace('/[^A-Za-z0-9._-]+/', '-', $name) ?: 'update.zip', 'size' => filesize($zip), 'sha256' => up_hash($zip), 'version' => $man['version'], 'at' => time(),
             'updated' => count($upd), 'new' => count($new), 'removed' => count($rem)];
    // what the new version says about itself: its own section of the changelog inside the zip (shown before you apply it)
    $notes = '';
    $clf = up_sp($stage, 'web/core-data/docs/CHANGELOG.md');
    if (is_file($clf) && preg_match('/^## ' . preg_quote($man['version'], '/') . '\\b[^\\n]*\\n(.*?)(?=^---\\s*$|^## )/ms', (string)file_get_contents($clf, false, null, 0, 1500000), $nm)) $notes = substr(trim($nm[1]), 0, 24000);
    $s = up_state(); $s['staged'] = $info; $s['plan'] = ['updated' => $upd, 'new' => $new, 'removed' => $rem]; $s['notes'] = $notes; up_state_save($s);
    return ['ok' => true, 'staged' => $info, 'notes' => $notes, 'installed' => HUB, 'relation' => $rel > 0 ? 'newer' : ($rel === 0 ? 'same' : 'older'), 'checks' => $checks,
            'plan' => ['updated' => $upd, 'new' => $new, 'removed' => $rem], 'noOldList' => $old === null];
}

/* ============================== applying, going back ============================== */

/** Every file of the release this site has now (from its own file list), copied to updates/previous so it can come back. */
function up_snapshot(): array {
    $root = up_root(); $dir = up_dir() . '/previous'; if (is_dir($dir)) hub_rm_tree($dir);
    $man = up_manifest(); $list = [];
    if ($man) { foreach ($man['files'] as $p => $_) if (is_file($root . '/' . $p)) $list[] = $p; $list[] = 'web/core-data/manifest.json'; }
    else { foreach (up_walk($root) as $p) if (!up_protected($p)) $list[] = $p; }   // a site from before file lists: everything in web
    $list = array_values(array_unique($list)); $bytes = 0;
    foreach ($list as $p) {
        $to = up_sp($dir, $p); @mkdir(dirname($to), 0755, true);
        if (!@copy($root . '/' . $p, $to)) { hub_rm_tree($dir); throw new RuntimeException('Could not save the current version first (' . $p . ').'); }
        $bytes += (int)@filesize($to);
    }
    $info = ['version' => HUB, 'at' => time(), 'files' => count($list), 'bytes' => $bytes, 'hadList' => $man !== null];
    hub_jput(up_dir() . '/previous.json', json_encode($info));
    return $info;
}

/** Relative paths of every file under web/ (and index.php), without symlinks. */
function up_walk(string $root): array {
    $out = []; if (is_file($root . '/index.php')) $out[] = 'index.php';
    foreach (['web'] as $top) {
        if (!is_dir($root . '/' . $top)) continue;
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root . '/' . $top, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::SELF_FIRST);
        foreach ($it as $f) if ($f->isFile() && !$f->isLink()) $out[] = $top . substr(str_replace('\\', '/', $f->getPathname()), strlen(str_replace('\\', '/', $root . '/' . $top)));
    }
    sort($out); return $out;
}

/** Copies $from over $to without ever leaving a half-written $to: written next to it first, then renamed. */
function up_put(string $from, string $to): bool {
    @mkdir(dirname($to), 0755, true);
    $tmp = $to . '.upd' . getmypid();
    if (!@copy($from, $tmp)) { @unlink($tmp); return false; }
    @chmod($tmp, 0644);
    if (@rename($tmp, $to)) return true;
    if (is_file($to)) @unlink($to);
    if (@rename($tmp, $to)) return true;
    @unlink($tmp); return false;
}

/** Puts back what an update wrote and removed, from the saved version. Only those files: a folder that failed once is not asked again for the rest. */
function up_rollback(array $written, array $removed): bool {
    $root = up_root(); $prev = up_dir() . '/previous'; $ok = true;
    foreach ($written as $p) {
        if (up_name_problem($p, false) !== '' && $p !== 'web/core-data/manifest.json') continue;
        if (is_file(up_sp($prev, $p))) { if (!up_put(up_sp($prev, $p), $root . '/' . $p)) $ok = false; }
        elseif (is_file($root . '/' . $p)) @unlink($root . '/' . $p);   // a file the update added
    }
    foreach ($removed as $p) if (is_file(up_sp($prev, $p)) && !up_put(up_sp($prev, $p), $root . '/' . $p)) $ok = false;
    return $ok;
}

/** Puts every file of $srcDir (its web/core-data/manifest.json lists them) in place, then removes what $oldList had and the new release does not. */
function up_install(string $srcDir, array $oldList): array {
    $root = up_root(); $man = up_manifest($srcDir); if (!$man) throw new RuntimeException('The new file list cannot be read.');
    $done = []; $written = []; $order = array_keys($man['files']);
    usort($order, function ($a, $b) { $w = function ($p) { return $p === 'index.php' ? 3 : ($p === 'web/core-data/lib/boot.php' ? 2 : (strpos($p, 'web/core-data/lib/') === 0 || $p === 'web/core-data/api.php' ? 1 : 0)); }; return $w($a) <=> $w($b) ?: strcmp($a, $b); });
    $order[] = 'web/core-data/manifest.json';
    try {
        foreach ($order as $p) {
            if ($p !== 'web/core-data/manifest.json' && up_name_problem($p, false) !== '') throw new RuntimeException('Refused an unsafe path: ' . $p . '.');
            if (up_protected($p) && is_file($root . '/' . $p)) continue;   // your own file stays
            if (!up_put(up_sp($srcDir, $p), $root . '/' . $p)) throw new RuntimeException('Could not write ' . $p . '.');
            $written[] = $p;
        }
    } catch (RuntimeException $e) { return ['ok' => false, 'error' => $e->getMessage(), 'written' => $written]; }
    $removed = [];
    foreach ($oldList as $p) {
        if (isset($man['files'][$p]) || $p === 'web/core-data/manifest.json' || up_protected($p)) continue;
        $f = $root . '/' . $p; if (is_file($f) && !is_link($f) && @unlink($f)) { $removed[] = $p; $d = dirname($f); while ($d !== $root && @rmdir($d)) $d = dirname($d); }
    }
    return ['ok' => true, 'written' => $written, 'removed' => $removed];
}

function up_opcache_reset(): void { if (function_exists('opcache_reset')) @opcache_reset(); }

/** Does the site answer after the swap? true / false / null (could not look: no curl). */
function up_self_check(string $expect): ?bool {
    if (!function_exists('curl_init')) return null;
    $dir = rtrim(str_replace('\\', '/', dirname((string)($_SERVER['SCRIPT_NAME'] ?? '/web/core-data/api.php'))), '/');
    $url = (hub_https() ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . $dir . '/api.php?action=state';
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 12, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_FOLLOWLOCATION => false, CURLOPT_SSL_VERIFYPEER => false, CURLOPT_SSL_VERIFYHOST => 0, CURLOPT_USERAGENT => 'site-self-check']);
    $body = (string)curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    $j = json_decode($body, true);
    return $code === 200 && is_array($j) && isset($j['v']);
}

/** Applies the checked zip (Update) or the saved version ($fromPrevious: Go Back). */
function up_apply(bool $fromPrevious, bool $autoUndo): array {
    ignore_user_abort(true); @set_time_limit(300);
    $lk = fopen(up_dir() . '/apply.lock', 'c'); if (!$lk || !flock($lk, LOCK_EX | LOCK_NB)) return ['ok' => false, 'error' => 'An update is already running. Wait a minute and look again.'];
    try {
        up_neutralise_saved();
        $root = up_root(); $s = up_state();
        if ($fromPrevious) {
            if (!is_file(up_dir() . '/previous/web/core-data/manifest.json')) return ['ok' => false, 'error' => 'There is no saved version to go back to.'];
            $src = up_dir() . '/previous'; $target = (up_manifest($src) ?? ['version' => '?'])['version'];
        } else {
            $st = $s['staged'] ?? null; $src = up_dir() . '/staging';
            if (!$st || !is_file($src . '/web/core-data/manifest.json')) return ['ok' => false, 'error' => 'There is no checked update to apply. Upload the zip again.'];
            $sm = up_manifest($src); if (!$sm || $sm['version'] !== $st['version']) return ['ok' => false, 'error' => 'The checked update changed. Upload the zip again.'];
            $target = $sm['version'];
        }
        $fromVersion = HUB; $oldMan = up_manifest();
        if (!$oldMan) return ['ok' => false, 'error' => 'This site has no file list yet, so it cannot tell which files are its own. Update once with the File Manager; after that the site can update itself.'];
        $oldList = array_keys($oldMan['files']);
        // 1. save the version we have now (for a going back it becomes the version to go forward to again)
        if ($fromPrevious) { $hold = up_dir() . '/previous-hold'; if (is_dir($hold)) hub_rm_tree($hold); @rename(up_dir() . '/previous', $hold); $src = $hold; }
        $snap = up_snapshot();   // updates/previous now holds the current version
        // 2. put the new files in place
        $r = up_install($src, $oldList);
        if (!$r['ok']) {   // put back what was written
            $okb = up_rollback($r['written'], []); up_opcache_reset();
            return ['ok' => false, 'error' => $r['error'] . ($okb ? ' Nothing was left half-done: the version you had is back.' : ' Some files could not be put back; update again with the File Manager.'), 'rolledBack' => $okb];
        }
        up_opcache_reset();
        // 3. look at the site again
        $alive = up_self_check($target);
        if ($alive === false && $autoUndo) {
            $okb = up_rollback($r['written'], $r['removed']); up_opcache_reset();
            return ['ok' => false, 'error' => 'The site did not answer after the update, so the version you had is back.', 'rolledBack' => $okb];
        }
        $s = up_state(); unset($s['staged'], $s['plan'], $s['notes']);
        $s['last'] = ['version' => $target, 'from' => $fromVersion, 'at' => time(), 'how' => $fromPrevious ? 'back' : 'update', 'updated' => count($r['written']), 'removed' => count($r['removed'])];
        up_state_save($s);
        foreach (['incoming.zip', 'incoming.part', 'incoming.json', 'incoming.php'] as $f) @unlink(up_dir() . '/' . $f);
        if (is_dir(up_dir() . '/staging')) hub_rm_tree(up_dir() . '/staging');
        if (is_dir(up_dir() . '/previous-hold')) hub_rm_tree(up_dir() . '/previous-hold');
        return ['ok' => true, 'version' => $target, 'from' => $fromVersion, 'written' => count($r['written']), 'removed' => $r['removed'], 'selfCheck' => $alive === null ? 'skipped' : ($alive ? 'ok' : 'failed'), 'previous' => $snap];
    } catch (Throwable $e) {
        return ['ok' => false, 'error' => 'The update stopped: ' . $e->getMessage()];
    } finally { flock($lk, LOCK_UN); fclose($lk); }
}

/* ============================== Files ============================== */

/** Compares the server with this version's file list. */
function up_scan(): array {
    $man = up_manifest(); $root = up_root();
    if (!$man) return ['ok' => true, 'noList' => true, 'version' => HUB];
    $t0 = microtime(true); $matched = 0; $changed = []; $extra = []; $on = [];
    foreach (up_walk($root) as $p) {
        if (strpos(basename($p), '.upd-test-') === 0) continue;   // the short-lived file the "can the site write here?" check makes
        $on[$p] = 1;
        if (up_protected($p) && strpos($p, 'web/core-data/media/') !== 0) continue;   // your own files are never compared or listed (pictures are looked at below, for scripts only)
        if (isset($man['files'][$p])) { if (up_hash($root . '/' . $p) === $man['files'][$p]) $matched++; else $changed[] = ['path' => $p, 'size' => (int)filesize($root . '/' . $p)]; continue; }
        if ($p === 'web/core-data/manifest.json') continue;
        $base = basename($p); $ext = strtolower(pathinfo($base, PATHINFO_EXTENSION));
        if (strpos($p, 'web/core-data/media/') === 0) {   // your pictures are yours: only a script among them is flagged
            if (!in_array($ext, ['php', 'phtml', 'phar', 'php3', 'php4', 'php5', 'php7', 'pl', 'py', 'cgi', 'sh', 'html', 'htm', 'js', 'jsp', 'asp', 'aspx'], true) && $base !== '.htaccess') continue;
            $extra[] = ['path' => $p, 'size' => (int)filesize($root . '/' . $p), 'tag' => 'Script', 'tone' => 'bad', 'why' => 'A script has no place among your pictures. It is not part of any version of the site.'];
            continue;
        }
        if ($base === 'error_log' || $base === 'php_errorlog') { $tag = 'Error log'; $tone = 'warn'; $why = 'Written by PHP when something goes wrong. It can show file paths.'; }
        elseif (preg_match('/\.(bak|old|orig|tmp|swp|save|copy)$|~$|^\.#|\.upd\d+$/i', $base)) { $tag = 'Copy'; $tone = 'warn'; $why = 'A copy or temporary file, made by hand or by an editor.'; }
        elseif (preg_match('/\.(php\d?|phtml|phar)$/i', $base)) { $tag = 'Unknown script'; $tone = 'bad'; $why = 'A PHP file that is not part of any version of the site. If you did not add it, treat it as suspicious.'; }
        elseif (preg_match('/\.(zip|tar|gz|tgz|rar|7z|sql)$/i', $base)) { $tag = 'Archive'; $tone = 'warn'; $why = 'An archive or dump left in the site folder.'; }
        elseif (in_array($base, ['.DS_Store', 'Thumbs.db', 'desktop.ini'], true) || strpos($p, '__MACOSX') !== false) { $tag = 'System file'; $tone = ''; $why = 'Added by your computer when files were copied.'; }
        else { $tag = 'Not in this version'; $tone = ''; $why = 'Not part of this version of the site. Often left behind by an older version.'; }
        $extra[] = ['path' => $p, 'size' => (int)filesize($root . '/' . $p), 'tag' => $tag, 'tone' => $tone, 'why' => $why];
    }
    foreach (scandir($root) ?: [] as $n) {   // the classic leftover sits in the site folder itself
        if (is_file($root . '/' . $n) && preg_match('/^(error_log|php_errorlog)(\.\d+)?$/', $n)) $extra[] = ['path' => $n, 'size' => (int)filesize($root . '/' . $n), 'tag' => 'Error log', 'tone' => 'warn', 'why' => 'Written by PHP when something goes wrong. It can show file paths.'];
    }
    $missing = []; foreach ($man['files'] as $p => $_) if (!isset($on[$p]) && !up_protected($p)) $missing[] = $p;
    $other = []; foreach (scandir($root) ?: [] as $n) if (!in_array($n, ['.', '..', 'web', 'site-data', 'index.php'], true) && !preg_match('/^(error_log|php_errorlog)(\.\d+)?$/', $n)) $other[] = $n;
    sort($missing); sort($other);
    $r = ['ok' => true, 'version' => $man['version'], 'running' => HUB, 'matched' => $matched, 'changed' => $changed, 'missing' => $missing, 'extra' => $extra, 'other' => array_slice($other, 0, 40), 'at' => time(), 'ms' => (int)round((microtime(true) - $t0) * 1000)];
    $s = up_state(); $s['files'] = ['at' => $r['at'], 'extra' => count($extra), 'changed' => count($changed), 'missing' => count($missing)]; up_state_save($s);
    return $r;
}

/** Deletes files from a fresh scan's "not part of this version" list. Anything else asked for is refused. */
function up_delete(array $paths): array {
    $scan = up_scan(); if (empty($scan['extra'])) return ['ok' => true, 'deleted' => [], 'skipped' => array_map('strval', $paths)];
    $ok = []; foreach ($scan['extra'] as $e) $ok[$e['path']] = 1;
    $root = up_root(); $del = []; $skip = [];
    foreach ($paths as $p) {
        $p = (string)$p;
        if (!isset($ok[$p])) { $skip[] = $p; continue; }
        $f = $root . '/' . $p;
        if (is_file($f) && !is_link($f) && @unlink($f)) { $del[] = $p; $d = dirname($f); while ($d !== $root && $d !== $root . '/web/core-data' && $d !== $root . '/web' && @rmdir($d)) $d = dirname($d); }
        else $skip[] = $p;
    }
    up_scan();   // refreshes the numbers shown on the Overview
    return ['ok' => true, 'deleted' => $del, 'skipped' => $skip];
}
