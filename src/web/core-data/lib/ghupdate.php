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
 * Updates from GitHub (Settings > Updates > Update From GitHub).
 *
 *   Check    "Check Now" always works. The daily check is OFF until you switch it on; while it is off the site makes no request to GitHub at all.
 *            The check reads latest.json on the project's GitHub Pages address. Only if that fails does it ask the GitHub API, at most once a day.
 *   Install  One click downloads the release zip into site-data/updates, checks its size and its SHA-256 against latest.json, and then runs the
 *            same complete check an uploaded zip gets (up_check). Nothing on the site changes until you type your website password.
 *            Applying is the existing apply: snapshot, swap, self-check, automatic rollback.
 *
 * The SHA-256 checksum catches a damaged or partial download. Nothing installs by itself, and you can read the changelog and the file list first.
 * Only github.com, api.github.com, jackpison.github.io and *.githubusercontent.com are ever contacted, over HTTPS, and every redirect is checked again.
 */
require_once __DIR__ . '/update.php';

const GH_REPO  = 'Jackpison/Homebase-Hub';
const GH_PAGES = 'https://jackpison.github.io/Homebase-Hub/latest.json';
const GH_API   = 'https://api.github.com/repos/Jackpison/Homebase-Hub/releases/latest';
const GH_DAY   = 86400;

function gh_pages_url(): string { return defined('GH_TEST_PAGES') ? GH_TEST_PAGES : GH_PAGES; }   // GH_TEST_* exist only in tests (never defined by the site)
function gh_api_url(): string { return defined('GH_TEST_API') ? GH_TEST_API : GH_API; }
function gh_zip_prefix(): string { return defined('GH_TEST_ZIPBASE') ? GH_TEST_ZIPBASE : 'https://github.com/' . GH_REPO . '/releases/download/'; }

function gh_host_ok(string $url): bool {
    $p = parse_url($url); if (!is_array($p) || empty($p['host'])) return false;
    $h = strtolower($p['host']);
    if (defined('GH_TEST_ALLOW') && in_array($h . (isset($p['port']) ? ':' . $p['port'] : ''), GH_TEST_ALLOW, true)) return true;
    if (($p['scheme'] ?? '') !== 'https' || isset($p['user']) || isset($p['pass']) || (isset($p['port']) && $p['port'] !== 443)) return false;
    return in_array($h, ['github.com', 'api.github.com', 'jackpison.github.io'], true) || substr($h, -strlen('.githubusercontent.com')) === '.githubusercontent.com';
}

/** GET with every redirect checked against the allowed hosts. Body goes to $saveTo (a file) or comes back in 'body'. */
function gh_fetch(string $url, int $max, int $timeout, ?string $saveTo = null): array {
    if (!function_exists('curl_init')) return ['ok' => false, 'error' => 'This server\'s PHP has no curl, so it cannot reach GitHub. You can still update by uploading the zip.'];
    for ($hop = 0; $hop < 5; $hop++) {
        if (!gh_host_ok($url)) return ['ok' => false, 'error' => 'The site only talks to GitHub, and that address is somewhere else.'];
        $status = 0; $loc = ''; $got = 0; $buf = ''; $fh = null;
        if ($saveTo !== null) { $fh = @fopen($saveTo, 'wb'); if (!$fh) return ['ok' => false, 'error' => 'Could not write in the update folder.']; }
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_FOLLOWLOCATION => false, CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => $timeout, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_USERAGENT => 'HomebaseHub/' . HUB, CURLOPT_HTTPHEADER => ['Accept: */*'], CURLOPT_ENCODING => '',
            CURLOPT_HEADERFUNCTION => function ($c, $l) use (&$status, &$loc) {
                if (preg_match('~^HTTP/\S+\s+(\d+)~', $l, $m)) { $status = (int)$m[1]; $loc = ''; } elseif (stripos($l, 'location:') === 0) $loc = trim(substr($l, 9));
                return strlen($l);
            },
            CURLOPT_WRITEFUNCTION => function ($c, $d) use (&$status, &$got, &$buf, &$fh, $max) {
                if ($status !== 200) return strlen($d);
                $got += strlen($d); if ($got > $max) return 0;
                if ($fh) fwrite($fh, $d); else $buf .= $d;
                return strlen($d);
            },
        ]);
        $ok = curl_exec($ch); $err = curl_error($ch); curl_close($ch); if ($fh) fclose($fh);
        if ($got > $max) { if ($saveTo !== null) @unlink($saveTo); return ['ok' => false, 'error' => 'The download is larger than expected, so it was stopped.']; }
        if (in_array($status, [301, 302, 303, 307, 308], true) && $loc !== '') {
            if ($saveTo !== null) @unlink($saveTo);
            $url = preg_match('~^https?://~i', $loc) ? $loc : (preg_replace('~^(https?://[^/]+).*$~i', '$1', $url) . '/' . ltrim($loc, '/'));
            continue;
        }
        if ($ok === false || $status !== 200) {
            if ($saveTo !== null) @unlink($saveTo);
            return ['ok' => false, 'error' => $status ? 'GitHub answered with code ' . $status . '.' : ('Could not reach GitHub' . ($err !== '' ? ' (' . $err . ')' : '') . '.')];
        }
        return ['ok' => true, 'body' => $buf];
    }
    if ($saveTo !== null) @unlink($saveTo);
    return ['ok' => false, 'error' => 'Too many redirects.'];
}

function gh_zip_url(string $ver): string { return gh_zip_prefix() . 'v' . $ver . '/site-update-' . $ver . '.zip'; }

/** Checks what a release entry says before it is trusted. Returns the clean entry or null. */
function gh_clean(array $j): ?array {
    $v = (string)($j['version'] ?? ''); $sha = strtolower((string)($j['sha256'] ?? '')); $size = (int)($j['size'] ?? 0);
    if (!preg_match('/^\d+\.\d+\.\d+$/', $v) || !preg_match('/^[a-f0-9]{64}$/', $sha) || $size < 0 || $size > UP_MAX_ZIP) return null;
    if ((string)($j['zip'] ?? '') !== gh_zip_url($v)) return null;   // the zip must be this project's own release asset for this very version
    $mp = (string)($j['minPhp'] ?? HUB_MIN_PHP); if (!preg_match('/^\d+\.\d+(\.\d+)?$/', $mp)) $mp = HUB_MIN_PHP;
    return ['version' => $v, 'zip' => gh_zip_url($v), 'sha256' => $sha, 'size' => $size, 'minPhp' => $mp,
            'notes' => mb_substr(strip_tags((string)($j['notes'] ?? '')), 0, 600), 'published' => preg_match('/^\d{4}-\d\d-\d\dT[\d:]+Z$/', (string)($j['published'] ?? '')) ? (string)$j['published'] : ''];
}

function gh_from_pages(): array {
    $r = gh_fetch(gh_pages_url(), 65536, 15); if (!$r['ok']) return $r;
    $j = json_decode($r['body'], true); $c = is_array($j) ? gh_clean($j) : null;
    return $c ? ['ok' => true, 'latest' => $c + ['via' => 'pages']] : ['ok' => false, 'error' => 'The version list on GitHub Pages could not be read.'];
}

function gh_from_api(): array {
    $r = gh_fetch(gh_api_url(), 524288, 15); if (!$r['ok']) return $r;
    $j = json_decode($r['body'], true);
    if (!is_array($j) || !preg_match('/^v(\d+\.\d+\.\d+)$/', (string)($j['tag_name'] ?? ''), $m)) return ['ok' => false, 'error' => 'GitHub\'s answer could not be read.'];
    $v = $m[1]; $shaUrl = '';
    foreach ((array)($j['assets'] ?? []) as $a) if (($a['name'] ?? '') === 'site-update-' . $v . '.zip.sha256') $shaUrl = (string)($a['browser_download_url'] ?? '');
    if ($shaUrl === '') return ['ok' => false, 'error' => 'That release has no checksum file.'];
    $s = gh_fetch($shaUrl, 1024, 15); if (!$s['ok']) return $s;
    if (!preg_match('/^([a-f0-9]{64})\b/i', trim($s['body']), $mm)) return ['ok' => false, 'error' => 'The checksum file could not be read.'];
    $size = 0; foreach ((array)($j['assets'] ?? []) as $a) if (($a['name'] ?? '') === 'site-update-' . $v . '.zip') $size = (int)($a['size'] ?? 0);
    $c = gh_clean(['version' => $v, 'zip' => gh_zip_url($v), 'sha256' => $mm[1], 'size' => $size, 'notes' => '', 'published' => (string)($j['published_at'] ?? '')]);
    return $c ? ['ok' => true, 'latest' => $c + ['via' => 'api']] : ['ok' => false, 'error' => 'The release entry is not valid.'];
}

function gh_state(): array { $s = up_state(); return is_array($s['gh'] ?? null) ? $s['gh'] : []; }
function gh_save(callable $fn): array { $s = up_state(); $g = is_array($s['gh'] ?? null) ? $s['gh'] : []; $g = $fn($g); $s['gh'] = $g; up_state_save($s); return $g; }

/** Looks for a newer version. $force = the person pressed Check Now. Without $force and with the daily check off, nothing is requested. */
function gh_check(bool $force): array {
    $g = gh_state();
    if (!$force && empty($g['auto'])) return ['ok' => true, 'skipped' => true] + gh_info();
    $r = gh_from_pages(); $apiNote = '';
    if (!$r['ok']) {
        if (time() - (int)($g['apiAt'] ?? 0) > GH_DAY) { gh_save(function ($x) { $x['apiAt'] = time(); return $x; }); $r2 = gh_from_api(); if ($r2['ok']) $r = $r2; else $apiNote = ' ' . $r2['error']; }
        else $apiNote = ' (GitHub\'s own list was asked less than a day ago, so it is not asked again yet.)';
    }
    gh_save(function ($x) use ($r, $apiNote) { $x['at'] = time(); if ($r['ok']) { $x['latest'] = $r['latest']; $x['err'] = ''; } else $x['err'] = $r['error'] . $apiNote; return $x; });
    return ['ok' => true] + gh_info();
}

/** What the Update tab shows. No network. */
function gh_info(): array {
    $g = gh_state(); $l = is_array($g['latest'] ?? null) ? $g['latest'] : null;
    return ['repo' => GH_REPO, 'auto' => !empty($g['auto']), 'at' => (int)($g['at'] ?? 0), 'err' => (string)($g['err'] ?? ''), 'latest' => $l,
            'newer' => $l !== null && version_compare($l['version'], HUB, '>'), 'curl' => function_exists('curl_init'),
            'phpOk' => $l === null || version_compare(PHP_VERSION, (string)($l['minPhp'] ?? HUB_MIN_PHP), '>='),
            'due' => !empty($g['auto']) && time() - (int)($g['at'] ?? 0) > GH_DAY];
}
function gh_set_auto(bool $on): array { gh_save(function ($x) use ($on) { $x['auto'] = $on; return $x; }); return gh_info(); }
/** Called by cron.php: the daily check, only when it was switched on. */
function gh_tick(): void { $i = gh_info(); if ($i['auto'] && $i['due']) gh_check(false); }

/** Downloads the newest release, checks size and SHA-256, then runs the same check an uploaded zip gets. Nothing on the site changes. */
function gh_install(): array {
    $g = gh_state(); $l = is_array($g['latest'] ?? null) ? $g['latest'] : null;
    if (!$l || version_compare($l['version'], HUB, '<=')) return ['ok' => false, 'error' => 'No newer version is known. Press Check Now first.'];
    if (version_compare(PHP_VERSION, (string)$l['minPhp'], '<')) return ['ok' => false, 'error' => 'Version ' . $l['version'] . ' needs PHP ' . $l['minPhp'] . ' or newer; this server has ' . PHP_VERSION . '.'];
    $free = (int)@disk_free_space(up_dir()); if ($free > 0 && $l['size'] > 0 && $free < $l['size'] * 4 + 8388608) return ['ok' => false, 'error' => 'There is not enough room on the disk for this update.'];
    @set_time_limit(300);
    foreach (['incoming.zip', 'incoming.part', 'incoming.json', 'incoming.php'] as $f) @unlink(up_dir() . '/' . $f);
    if (is_dir(up_dir() . '/staging')) hub_rm_tree(up_dir() . '/staging');
    $part = up_dir() . '/incoming.part';
    $d = gh_fetch($l['zip'], UP_MAX_ZIP, 280, $part);
    if (!$d['ok']) { @unlink($part); return ['ok' => false, 'error' => $d['error']]; }
    clearstatcache(true, $part); $sz = (int)@filesize($part);
    if ($l['size'] > 0 && $sz !== $l['size']) { @unlink($part); return ['ok' => false, 'error' => 'The download is not the size GitHub lists (' . $sz . ' bytes, expected ' . $l['size'] . '). Nothing was changed.'];
    }
    if (!hash_equals($l['sha256'], (string)@hash_file('sha256', $part))) { @unlink($part); return ['ok' => false, 'error' => 'The download\'s SHA-256 does not match the one GitHub lists, so it was refused. Nothing was changed.']; }
    if (!@rename($part, up_dir() . '/incoming.zip')) { @unlink($part); return ['ok' => false, 'error' => 'Could not keep the download.']; }
    $r = up_check('site-update-' . $l['version'] . '.zip');
    if (!empty($r['ok']) && ($r['staged']['version'] ?? '') !== $l['version']) { up_cancel(); return ['ok' => false, 'error' => 'The zip holds version ' . ($r['staged']['version'] ?? '?') . ', not ' . $l['version'] . ' as GitHub says. It was refused.']; }
    return $r + ['source' => 'github'];
}
