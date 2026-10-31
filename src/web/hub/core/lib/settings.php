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
if (!defined('HUB')) { http_response_code(404); exit; }   // only boot.php loads this file

/**
 * Hub core, part 4 of 4 (split out of boot.php in 1.62.6; boot.php loads it): the site's settings.
 *  - the wrapped key of Links' and Info's encrypted tabs (hub_norm_vault)
 *  - site settings (look, navigation, theme, text sizes), the time zone, and security alerts on Telegram */

/* ======================= Links: encrypted tabs ======================= */
/**
 * The key of Links' encrypted tabs is random and made in the browser; the server only keeps it wrapped (encrypted) with
 * the website password: {v, salt, iter, wrap, login}. Only the shape is checked here; the server never sees the key.
 */
function hub_norm_vault($v): ?array {
    if (!is_array($v)) return null;
    $b64 = function ($x, $min, $max) { return is_string($x) && strlen($x) >= $min && strlen($x) <= $max && preg_match('#^[A-Za-z0-9+/=]+$#', $x); };
    if (!isset($v['salt'], $v['wrap'], $v['iter']) || !$b64($v['salt'], 16, 64) || !$b64($v['wrap'], 40, 200)) return null;
    $iter = (int)$v['iter'];
    if ($iter < 100000 || $iter > 10000000) return null;
    $o = ['v' => 1, 'salt' => $v['salt'], 'iter' => $iter, 'wrap' => $v['wrap']];
    if (!empty($v['login'])) $o['login'] = true;   // older setting: wrapped with the website password instead of the passphrase
    if (isset($v['rec']) && is_array($v['rec'])) {   // optional recovery key: the same tab key wrapped a second time, with the recovery code
        $r = $v['rec']; $ri = (int)($r['iter'] ?? 0);
        if (isset($r['salt'], $r['wrap']) && $b64($r['salt'], 16, 64) && $b64($r['wrap'], 40, 200) && $ri >= 100000 && $ri <= 10000000) $o['rec'] = ['salt' => $r['salt'], 'iter' => $ri, 'wrap' => $r['wrap']];
    }
    return $o;
}
/**
 * The encryption passphrase (Settings > Security > Encryption): a second password for secure data. One passphrase locks Info's
 * encrypted tabs, Links' encrypted tabs and backup files. The browser wraps the tab keys with it; the server only remembers
 * THAT it was set (this marker), plus the backup key made from it. "Set" and "Remove" are the only two things you can do.
 */
function hub_pp_file(): string { return hub_dir('core') . '/passphrase.json'; }
function hub_pp_on(): bool { return is_file(hub_jpath(hub_pp_file())); }
function hub_pp_mark(bool $on): void {
    if ($on) hub_jput(hub_pp_file(), json_encode(['set' => time()]));
    else { @unlink(hub_jpath(hub_pp_file())); @unlink(hub_pp_file()); }
}
/** True for the text an encrypted tab is stored as: "enc1:" + base64 (made in the browser). */
function hub_enc_ok($e): bool { return is_string($e) && strlen($e) <= 2800000 && (bool)preg_match('~^enc1:[A-Za-z0-9+/=]+$~', $e); }
/**
 * Makes Links data safe to store: an encrypted tab carries no readable categories (whatever the browser sent) and is
 * always private, a broken "enc" is dropped, and the key has the right shape. Returns true when any tab is encrypted.
 */
function hub_links_enc_clean(array &$data): bool {
    $any = false;
    foreach ($data['tabs'] ?? [] as $i => $t) {
        if (!is_array($t)) continue;
        if (hub_enc_ok($t['enc'] ?? null)) { $data['tabs'][$i]['categories'] = []; $data['tabs'][$i]['private'] = true; $any = true; }
        else unset($data['tabs'][$i]['enc']);
    }
    if (isset($data['settings']) && is_array($data['settings'])) {
        $v = hub_norm_vault($data['settings']['vault'] ?? null);
        if ($v) $data['settings']['vault'] = $v; else unset($data['settings']['vault']);
    }
    return $any;
}

/* ======================= site settings ======================= */

function hub_settings_default(): array {
    return [
        'siteName' => 'Homebase Hub',   // new installs; an install that kept the old default 'My Site' keeps it
        'logo'     => '',           // site logo: a file in web/hub/media/brand/ (empty = first letter of the name)
        'nav'      => 'top',        // top | side | dock
        'theme'    => 'dark',       // dark | light | auto  (default for new browsers; each browser can switch)
        'accent'   => '#ffc21a',
        'accentPg' => [],           // a different accent color for one page: {links: '#rrggbb'}
        'myPresets' => [],          // looks you saved: [{n, dark: {bg...}, light: {...}, a}]
        'colors'   => ['dark' => [], 'light' => [], 'pg' => []],   // optional overrides: bg, box, panel, line, text, mute, bar, barText (hex); pg = page backgrounds {links: {dark, light}}
        'sizes'    => [],           // text sizes per page, in px: {info: {tab, head, text}, cards: {title, box, text}}
        'look'     => true,         // true = unified AMOLED + gold on every page; false = each page uses its own colours
        'homeBar'  => false,        // show the shared bar on the start page
        'editBar'  => [],           // the edit bar per page: {links: 'text'} = icons and text; missing = icons only (1.53.5)
        'font'     => 'default',    // site-wide font: default | trebuchet | system | verdana | tahoma | segoe | arial | georgia | palatino | mono | custom
        'fontCustom' => '',         // a font installed on the visitor's device, used when font = custom
        'backupEvery' => 7,         // days between backup reminders, 0 = off
        'tz'          => 'Asia/Kolkata',   // the site's time zone (India Standard Time by default): today, due times, reminders
        'backupLast'  => 0,
        'tools'    => ['title' => 'TOOLS', 'emoji' => '', 'logo' => '', 'favicon' => ''],
        'pages'    => [],           // the bar's tabs: [{id, name, hide}] in the order shown (empty = default names and order)
    ];
}
function hub_settings(): array {
    if (!isset($GLOBALS['__hub_settings'])) {
        $j = hub_read_guarded(hub_dir('core') . '/settings.php') ?? [];
        $GLOBALS['__hub_settings'] = hub_clean_settings(array_replace_recursive(hub_settings_default(), $j));
    }
    return $GLOBALS['__hub_settings'];
}
function hub_clean_settings(array $in): array {
    $d = hub_settings_default(); $o = [];
    $o['siteName'] = mb_substr(trim(strip_tags((string)($in['siteName'] ?? $d['siteName']))), 0, 30) ?: $d['siteName'];
    // the logo lives in the media folder's brand/; every address a logo had before (web/hub/media/brand, core/media/brand, core/brand) is still read, so it is not lost
    $o['logo']     = preg_match('#^(?:web/)?(?:core(?:-data)?|hub)/(?:media/)?brand/(logo-[a-z0-9]+\\.(?:png|jpg|webp|gif|ico))$#', (string)($in['logo'] ?? ''), $lm) ? HUB_LAYOUT_HERE['media'] . '/brand/' . $lm[1] : '';
    $o['nav']      = in_array($in['nav'] ?? '', ['top', 'side', 'dock'], true) ? $in['nav'] : 'top';
    $o['theme']    = in_array($in['theme'] ?? '', ['dark', 'light', 'auto'], true) ? $in['theme'] : 'dark';
    $o['accent']   = preg_match('/^#[0-9a-f]{6}$/i', (string)($in['accent'] ?? '')) ? strtolower($in['accent']) : $d['accent'];
    $o['accentPg'] = [];
    foreach (['home', 'links', 'info', 'cards', 'tasks', 'tools'] as $app) { $v = $in['accentPg'][$app] ?? ''; if (is_string($v) && preg_match('/^#[0-9a-f]{6}$/i', $v)) $o['accentPg'][$app] = strtolower($v); }
    $o['myPresets'] = [];
    foreach (is_array($in['myPresets'] ?? null) ? array_slice($in['myPresets'], 0, 40) : [] as $mp) {
        if (!is_array($mp)) continue;
        $n = mb_substr(trim(strip_tags((string)($mp['n'] ?? ''))), 0, 30); if ($n === '') continue;
        $e = ['n' => $n, 'a' => preg_match('/^#[0-9a-f]{6}$/i', (string)($mp['a'] ?? '')) ? strtolower($mp['a']) : '', 'dark' => [], 'light' => []];
        foreach (['dark', 'light'] as $m) foreach (['bg', 'box', 'panel', 'line', 'text', 'mute', 'bar', 'barText'] as $k) {
            $v = $mp[$m][$k] ?? ''; if (is_string($v) && preg_match('/^#[0-9a-f]{6}$/i', $v)) $e[$m][$k] = strtolower($v);
        }
        $o['myPresets'][] = $e;
    }
    $o['colors'] = ['dark' => [], 'light' => [], 'pg' => []];
    foreach (['dark', 'light'] as $m) foreach (['bg', 'box', 'panel', 'line', 'text', 'mute', 'bar', 'barText'] as $k) {
        $v = $in['colors'][$m][$k] ?? '';
        if (is_string($v) && preg_match('/^#[0-9a-f]{6}$/i', $v)) $o['colors'][$m][$k] = strtolower($v);
    }
    foreach (['links', 'info', 'cards', 'tasks', 'tools'] as $app) foreach (['dark', 'light'] as $m) {
        $v = $in['colors']['pg'][$app][$m] ?? '';
        if (is_string($v) && preg_match('/^#[0-9a-f]{6}$/i', $v)) $o['colors']['pg'][$app][$m] = strtolower($v);
    }
    $o['sizes'] = [];
    foreach (['info' => ['tab', 'head', 'text'], 'cards' => ['title', 'box', 'text']] as $app => $keys) foreach ($keys as $k) {
        $v = (int)($in['sizes'][$app][$k] ?? 0);
        if ($v >= 10 && $v <= 64) $o['sizes'][$app][$k] = $v;
    }
    $o['look']     = true;   // (1.61.0) the "Same Look on Every Page" switch is gone: every site uses the shared colours
    $o['homeBar']  = (bool)($in['homeBar'] ?? false);
    $o['editBar']  = [];
    foreach (['home', 'links', 'info', 'cards', 'tasks'] as $app) if (($in['editBar'][$app] ?? '') === 'text') $o['editBar'][$app] = 'text';
    $o['font']     = in_array($in['font'] ?? '', ['default', 'trebuchet', 'system', 'verdana', 'tahoma', 'segoe', 'arial', 'georgia', 'palatino', 'mono', 'custom'], true) ? $in['font'] : 'default';
    $o['fontCustom'] = mb_substr(trim(preg_replace('/[^\p{L}\p{N} \-]/u', '', (string)($in['fontCustom'] ?? ''))), 0, 40);
    $o['backupEvery'] = max(0, min(365, (int)($in['backupEvery'] ?? 7)));
    $tz = (string)($in['tz'] ?? 'Asia/Kolkata');
    $o['tz'] = hub_tz_ok($tz) ? $tz : 'Asia/Kolkata';
    $o['backupLast']  = max(0, (int)($in['backupLast'] ?? 0));
    $t = is_array($in['tools'] ?? null) ? $in['tools'] : [];
    $img = function ($v) { return is_string($v) && ($v === '' || (strlen($v) < 700000 && preg_match('#^data:image/(png|jpeg|webp|gif|x-icon|vnd\.microsoft\.icon);base64,[A-Za-z0-9+/=]+$#', $v))) ? $v : ''; };
    $o['pages'] = hub_clean_pages($in['pages'] ?? []);
    $o['tools'] = ['title' => mb_substr(trim(strip_tags((string)($t['title'] ?? 'TOOLS'))), 0, 40) ?: 'TOOLS',
                   'emoji' => mb_substr((string)($t['emoji'] ?? ''), 0, 8), 'logo' => $img($t['logo'] ?? ''), 'favicon' => $img($t['favicon'] ?? '')];
    return $o;
}
/** The bar's tabs: every known page exactly once, in your order, with your name (empty = the default name). At least one stays visible. */
function hub_clean_pages($in): array {
    $out = []; $seen = [];
    foreach (is_array($in) ? $in : [] as $p) {
        $id = is_array($p) ? (string)($p['id'] ?? '') : '';
        if (!isset(HUB_PAGE_NAMES[$id]) || isset($seen[$id])) continue;
        $seen[$id] = true;
        $nm = mb_substr(trim(preg_replace('/\s+/u', ' ', strip_tags((string)($p['name'] ?? '')))), 0, 20);
        $out[] = ['id' => $id, 'name' => $nm === HUB_PAGE_NAMES[$id] ? '' : $nm, 'hide' => !empty($p['hide'])];
    }
    foreach (HUB_APPS as $id) if (!isset($seen[$id])) {   // a page added in an update joins at its default place
        $at = count($out);
        foreach ($out as $i => $p) if (array_search($p['id'], HUB_APPS, true) > array_search($id, HUB_APPS, true)) { $at = $i; break; }
        array_splice($out, $at, 0, [['id' => $id, 'name' => '', 'hide' => false]]);
    }
    if (!array_filter($out, function ($p) { return !$p['hide']; })) $out[0]['hide'] = false;
    $plain = array_map(function ($id) { return ['id' => $id, 'name' => '', 'hide' => false]; }, HUB_APPS);
    return $out === $plain ? [] : $out;   // nothing changed: store nothing
}
/**
 * Changes some settings safely: under a lock, from what is on disk right now (not this request's earlier copy), so two
 * saves at once (you in Settings, a Telegram backup marking the date) never undo each other. $fn gets the settings and
 * returns them changed.
 */
function hub_settings_update(callable $fn): array {
    return hub_with_lock(hub_dir('core') . '/settings.lock', function () use ($fn): array {
        unset($GLOBALS['__hub_settings']);   // read fresh
        return hub_settings_save($fn(hub_settings()));
    });
}
function hub_settings_save(array $s): array {
    $s = hub_clean_settings($s);
    if (!hub_write_guarded(hub_dir('core') . '/settings.php', $s)) hub_json(500, ['ok' => false, 'error' => 'Could not save settings.']);
    $GLOBALS['__hub_settings'] = $s;
    return $s;
}
/** What every page needs to draw the shared bar. Safe to send to visitors. */
function hub_public_state(): array {
    $s = hub_settings(); $admin = hub_admin();
    $o = ['v' => HUB, 'admin' => $admin, 'setup' => hub_auth() === null, 'passkeys' => is_file(hub_jpath(hub_dir('core') . '/passkeys.json')),   // the login box offers a passkey when one is set up
          'tz' => $s['tz'] ?? 'Asia/Kolkata', 'siteName' => $s['siteName'], 'logo' => $s['logo'], 'nav' => $s['nav'], 'theme' => $s['theme'], 'accent' => $s['accent'], 'accentPg' => (object)$s['accentPg'],
          'look' => $s['look'], 'homeBar' => $s['homeBar'], 'editBar' => (object)$s['editBar'], 'font' => $s['font'], 'fontCustom' => $s['fontCustom'], 'colors' => ['dark' => (object)$s['colors']['dark'], 'light' => (object)$s['colors']['light'], 'pg' => (object)array_map(function ($a) { return (object)$a; }, $s['colors']['pg'])],
          'sizes' => (object)array_map(function ($a) { return (object)$a; }, $s['sizes']), 'pages' => $s['pages']];
    if ($o['setup']) {   // brand-new site: make sure the one-time code file exists, and say where it is
        hub_setup_code();
        $o['setupFile'] = hub_setup_file_hint();
        $o['host'] = preg_replace('/^www\./i', '', preg_replace('/:\d+$/', '', (string)($_SERVER['HTTP_HOST'] ?? '')));
    }
    if ($admin) {
        $a = hub_auth();
        $o['csrf'] = hub_csrf();
        $o['twoStep'] = !empty($a['totp']['on']);
        $o['recoveryLeft'] = count($a['recovery'] ?? []);
        $o['backupEvery'] = $s['backupEvery'];
        $o['backupLast'] = $s['backupLast'];
        $o['dataOutside'] = hub_data_outside();
        $o['tools'] = $s['tools'];
        $o['myPresets'] = $s['myPresets'];
        $o['https'] = hub_https();
    }
    return $o;
}

/* ======================= time zone ======================= */
/** Every date and time the server works out (today, backups, versions, reminders) uses the site's time zone (Settings > General). */
/* The look a brand-new site starts with (the owner's "Default" preset): a softer black and warm off-white, with a light gold accent.
   Existing sites keep their own colors; this is only written when a site is first set up. */
const HUB_NEW_SITE_LOOK = [
    'accent' => '#ffd45c',
    'dark' => ['bg' => '#101010', 'box' => '#161616', 'panel' => '#1c1c1c', 'line' => '#2a2a2a', 'text' => '#d8d8d8', 'mute' => '#a0a0a0', 'bar' => '#0a0a0a', 'barText' => '#a0a0a0'],
    'light' => ['bg' => '#f3efec', 'box' => '#ffffff', 'panel' => '#ffffff', 'line' => '#ded6d1', 'text' => '#221711', 'mute' => '#655953', 'bar' => '#ede7e3', 'barText' => '#5f544e'],
];
function hub_new_site_look(array $s): array {
    $s['accent'] = HUB_NEW_SITE_LOOK['accent'];
    $s['colors'] = ['dark' => HUB_NEW_SITE_LOOK['dark'], 'light' => HUB_NEW_SITE_LOOK['light'], 'pg' => $s['colors']['pg'] ?? []];
    return hub_clean_settings($s);
}
/* A brand-new site starts with the time zone of the browser that set it up and the theme that follows the device; the setup
   dialog sends both. Existing sites keep what they have: the fallbacks in hub_settings() ('dark', 'Asia/Kolkata') stay as they were. */
function hub_setup_defaults(array $s, array $b): array {
    $tz = (string)($b['tz'] ?? '');
    if ($tz !== '' && hub_tz_ok($tz)) $s['tz'] = $tz;
    if (in_array($b['theme'] ?? '', ['auto', 'dark', 'light'], true)) $s['theme'] = $b['theme'];
    return $s;
}
function hub_tz_ok(string $t): bool { static $all = null; if ($all === null) $all = array_flip(timezone_identifiers_list()); return isset($all[$t]); }
function hub_tz(): string { $t = (string)(hub_settings()['tz'] ?? 'Asia/Kolkata'); return hub_tz_ok($t) ? $t : 'Asia/Kolkata'; }
date_default_timezone_set('Asia/Kolkata');
if (!defined('HUB_TEST')) { try { date_default_timezone_set(hub_tz()); } catch (Throwable $e) {} }

/* ======================= security alerts on Telegram ======================= */
/**
 * Queues a Telegram alert (Settings > Telegram > Messages): login, locked, password, logoutall, twostep_on,
 * twostep_off, recovery, restore. Who and where are noted now; the message is sent after the page has its answer.
 */
/** One line in the login history (Settings > Security > Devices). Never stops what it is called from. */
function hub_act(string $what, string $extra = ''): void {
    try { require_once __DIR__ . '/activity.php'; act_log($what, $extra); } catch (Throwable $e) {}
}
function hub_alert(string $what, string $extra = ''): void {
    static $queue = null;
    hub_act($what, $extra);
    $ctx = ['what' => $what, 'extra' => $extra, 'time' => time(), 'ip' => hub_ip(), 'country' => preg_replace('/[^A-Z]/', '', strtoupper((string)($_SERVER['HTTP_CF_IPCOUNTRY'] ?? ''))),
            'ua' => substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 300)];
    if ($queue === null) {
        $queue = [];
        register_shutdown_function(function () use (&$queue) {
            if (function_exists('fastcgi_finish_request')) @fastcgi_finish_request();
            elseif (function_exists('litespeed_finish_request')) @litespeed_finish_request();
            try { require_once __DIR__ . '/notify.php'; foreach ($queue as $c) nt_security($c); } catch (Throwable $e) {}
        });
    }
    $queue[] = $ctx;
}

/* ======================= tab icons ======================= */
// The icons a tab of Links or Info can wear (1.63.0). The same ids, in the same order, are in hub/core/assets/tabs.js (a test keeps them equal).
const HUB_TAB_ICONS = ['bookmark', 'doc', 'star', 'heart', 'folder', 'home', 'globe', 'briefcase', 'tag', 'flag', 'bolt', 'cart', 'book', 'code', 'wallet', 'music'];
/** The icon id if it is one of those, else '' (the page's own icon). */
function hub_tab_icon($v): string
{
    return is_string($v) && in_array($v, HUB_TAB_ICONS, true) ? $v : '';
}
