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
 * The site key (1.61): one random key, made in the browser, that locks what the pages keep for you: Files, Cards and Tools' saved
 * presets. Like the tab keys of Info and Links, the server only ever holds it "wrapped": encrypted with a key made from your
 * encryption passphrase (and a second time with your recovery key). It never sees the key itself, so a copy of the server (or of a
 * backup) holds scrambled data only.
 *
 * Stored as {v, salt, iter, wrap, rec?, kid} in site-data/core/site-vault.php (guarded: a browser asking for it gets nothing).
 * kid = the first 8 bytes of SHA-256 of the key, in hex (the browser makes it): data locked with the key carries the same "kid", so a
 * restored backup can be matched to its key and a remembered key that no longer fits is noticed. It reveals nothing about the key.
 * A change must name the wrap it replaces ("prev"), so a page that is out of date can never replace a newer key.
 */
require_once __DIR__ . '/boot.php';

function sv_file(): string { return hub_dir('core') . '/site-vault.json'; }

/** The wrapped key, or null when there is none (no passphrase yet, or nothing has needed one so far). */
function sv_get(): ?array {
    $j = hub_jread(sv_file()); $v = hub_norm_vault($j);
    if ($v !== null && is_string($j['kid'] ?? null) && preg_match('/^[a-f0-9]{16}$/', $j['kid'])) $v['kid'] = $j['kid'];
    return $v;
}

/** '' when $new may replace what is stored (named by $prev), otherwise why not: 'bad' or 'conflict'. */
function sv_check(array $new, string $prev): string {
    if (!hub_norm_vault($new)) return 'bad';
    $cur = sv_get();
    if ($cur === null) return $prev === '' ? '' : 'conflict';
    return hash_equals($cur['wrap'], $prev) ? '' : 'conflict';
}

/** Stores $new when it replaces $prev. Returns '' when done, or 'bad', 'conflict' or 'write'. */
function sv_swap(array $new, string $prev): string {
    $lk = @fopen(hub_dir('core') . '/site-vault.lock', 'c'); if ($lk) flock($lk, LOCK_EX);
    try {
        if (($why = sv_check($new, $prev)) !== '') return $why;
        $v = hub_norm_vault($new);
        $cur = sv_get();
        $kid = is_string($new['kid'] ?? null) && preg_match('/^[a-f0-9]{16}$/', $new['kid']) ? $new['kid'] : (string)($cur['kid'] ?? '');   // a change of wrap keeps the key's id
        if ($kid !== '') $v['kid'] = $kid;
        unset($v['login']);   // the site key is never locked with the website password: only the passphrase (and the recovery key) open it
        if (!hub_jput(sv_file(), json_encode($v, JSON_UNESCAPED_SLASHES))) return 'write';
        @chmod(hub_jpath(sv_file()), 0600);
        return '';
    } finally { if ($lk) { flock($lk, LOCK_UN); fclose($lk); } }
}

function sv_clear(): void { @unlink(hub_jpath(sv_file())); @unlink(sv_file()); }

/* What is locked with the site key right now, read straight from each page's own data file (the core API has not loaded the pages' code). */
function sv_use_files(): bool { $j = hub_read_guarded(hub_jpath(hub_dir('files') . '/files.json')); return is_array($j) && !empty($j['items']); }
function sv_use_cards(): bool { $j = hub_jread(hub_dir('cards') . '/cards.json'); return is_array($j) && is_string($j['enc'] ?? null); }
function sv_use_presets(): bool { $j = hub_jread(hub_dir('tools') . '/presets.json'); return is_array($j) && !empty($j['locked']); }

/**
 * What is locked with the site key right now (so the passphrase is never removed from under it).
 * @return string[] plain names such as "Files" or "Cards"
 */
function sv_in_use(): array {
    $out = [];
    if (sv_use_files()) $out[] = 'Files';
    if (sv_use_cards()) $out[] = 'Cards';
    if (sv_use_presets()) $out[] = 'Tools presets';
    return $out;
}
