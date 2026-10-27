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
 * Tools' saved presets (1.60): a signature, watermark settings, a QR style, resize sizes, invoice business details.
 * Kept on the server for the logged-in owner (site-data/tools/presets.php, guarded), and in the site backup.
 *
 * File: { kinds: { <kind>: [ { id, name, data, t } ] } }
 * data is the tool's own settings: an object of plain values, at most 8 levels deep. Pictures inside it may only be
 * data:image/png, jpeg or webp addresses, and no other address is kept, so nothing a preset holds can point the browser anywhere.
 */

const PR_KINDS     = ['sign', 'img-watermark', 'pdf-stamp', 'qr', 'resize', 'invoice'];
const PR_MAX_KIND  = 30;          // presets of one kind
const PR_MAX_ONE   = 600000;      // bytes of one preset (a signature or a logo fits easily)
const PR_MAX_ALL   = 4000000;     // bytes of all presets together

function pr_file(): string { return hub_dir('tools') . '/presets.json'; }

/** A preset's settings, or null when they are not plain data. Strings are cut to 2000 characters, except picture addresses. */
function pr_clean_data($v, int $depth = 0) {
    if ($depth > 8) return null;
    if (is_array($v)) {
        if (count($v) > 200) return null;
        $out = [];
        foreach ($v as $k => $x) {
            if (is_string($k) && !preg_match('/^[A-Za-z0-9_-]{1,40}$/', $k)) return null;
            $c = pr_clean_data($x, $depth + 1);
            if ($c === null && $x !== null) return null;
            $out[$k] = $c;
        }
        return $out;
    }
    if (is_string($v)) {
        if (strncmp($v, 'data:', 5) === 0) return preg_match('#^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$#', $v) ? $v : null;
        if (preg_match('#^\s*((javascript|vbscript|blob|file|data):|[a-z][a-z0-9+.-]*://|//)#i', $v)) return null;   // no addresses: a preset never points anywhere
        return mb_substr(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v) ?? '', 0, 2000);
    }
    if (is_int($v) || is_float($v)) return is_finite((float)$v) ? $v : null;
    if (is_bool($v) || $v === null) return $v;
    return null;
}
function pr_name($v): string { return mb_substr(trim(preg_replace('/[\x00-\x1F\x7F]/u', '', is_string($v) ? $v : '') ?? ''), 0, 60); }

/** Every preset, checked (anything that does not fit is left out). */
function pr_clean(array $d): array {
    $out = [];
    foreach (PR_KINDS as $k) {
        $list = [];
        foreach (is_array($d['kinds'][$k] ?? null) ? $d['kinds'][$k] : [] as $p) {
            if (!is_array($p) || ($name = pr_name($p['name'] ?? '')) === '' || !is_array($p['data'] ?? null)) continue;
            $data = pr_clean_data($p['data']);
            if (!is_array($data) || strlen((string)json_encode($data)) > PR_MAX_ONE) continue;
            $id = is_string($p['id'] ?? null) && preg_match('/^[a-z0-9]{6,16}$/', $p['id']) ? $p['id'] : bin2hex(random_bytes(5));
            $list[] = ['id' => $id, 'name' => $name, 'data' => $data, 't' => max(0, (int)($p['t'] ?? time()))];
            if (count($list) >= PR_MAX_KIND) break;
        }
        if ($list) $out[$k] = $list;
    }
    return ['kinds' => $out];
}
function pr_load(): array { return pr_clean(hub_jread(pr_file()) ?? []); }
function pr_save(array $d): bool {
    $d = pr_clean($d);
    $json = json_encode($d, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    return $json !== false && strlen($json) <= PR_MAX_ALL && hub_jput(pr_file(), $json);
}
/** What Tools gets: every preset of every kind ({} when there are none). */
function pr_view(array $d): array { return ['kinds' => (object)$d['kinds']]; }

/**
 * One change from Tools. Returns [http code, answer].
 *  {op: "add", kind, name, data}   a new preset (the same name of the same kind is replaced)
 *  {op: "rename", kind, id, name}  {op: "delete", kind, id}
 */
function pr_change(array $b): array {
    $kind = (string)($b['kind'] ?? ''); $op = (string)($b['op'] ?? '');
    if (!in_array($kind, PR_KINDS, true)) return [400, ['ok' => false, 'error' => 'Unknown kind of preset.']];
    $d = pr_load(); $list = $d['kinds'][$kind] ?? [];
    if ($op === 'add') {
        $name = pr_name($b['name'] ?? '');
        if ($name === '') return [400, ['ok' => false, 'error' => 'Give the preset a name.']];
        $data = is_array($b['data'] ?? null) ? pr_clean_data($b['data']) : null;
        if (!is_array($data)) return [400, ['ok' => false, 'error' => 'These settings cannot be saved as a preset.']];
        if (strlen((string)json_encode($data)) > PR_MAX_ONE) return [413, ['ok' => false, 'error' => 'This preset is too large (use a smaller picture).']];
        $list = array_values(array_filter($list, function ($p) use ($name) { return mb_strtolower($p['name']) !== mb_strtolower($name); }));
        if (count($list) >= PR_MAX_KIND) return [400, ['ok' => false, 'error' => 'There are already ' . PR_MAX_KIND . ' presets here. Delete one first.']];
        $list[] = ['id' => bin2hex(random_bytes(5)), 'name' => $name, 'data' => $data, 't' => time()];
    } elseif ($op === 'rename' || $op === 'delete') {
        $id = (string)($b['id'] ?? ''); $i = array_search($id, array_column($list, 'id'), true);
        if ($i === false) return [404, ['ok' => false, 'error' => 'That preset no longer exists.']];
        if ($op === 'delete') array_splice($list, $i, 1);
        else { $name = pr_name($b['name'] ?? ''); if ($name === '') return [400, ['ok' => false, 'error' => 'Give the preset a name.']]; $list[$i]['name'] = $name; }
    } else return [400, ['ok' => false, 'error' => 'Unknown action.']];
    $d['kinds'][$kind] = $list;
    if (!$list) unset($d['kinds'][$kind]);
    $before = $d;
    if (strlen((string)json_encode(pr_clean($d))) > PR_MAX_ALL) return [413, ['ok' => false, 'error' => 'All presets together are too large. Delete some first.']];
    if (!pr_save($before)) return [500, ['ok' => false, 'error' => 'Could not save (check the folder permissions).']];
    return [200, ['ok' => true] + pr_view(pr_load())];
}
