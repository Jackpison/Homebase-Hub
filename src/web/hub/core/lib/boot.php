<?php
declare(strict_types=1);
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
 * Hub core: shared by Home, Links, Info, Cards and Tools.
 *
 *  - Where data lives (site-data inside the site folder, so it moves with the site)
 *  - One login: one password, one session cookie, optional two-step codes. The same password also unlocks Info's
 *    encrypted tabs and encrypted backups (when you choose so), so there is only one thing to remember.
 *  - Login lockout, safe file writes, request checks, security headers
 *  - Site-wide settings (look, navigation, theme)
 *
 * Every app's api.php loads this file first (from the page's own folder, ../hub/core/lib/boot.php). Since 1.62.6 this file holds the
 * paths, the data folders, the locks, safe file writes, request checks and the web app manifest, and loads three more files:
 *   auth.php      login lockout, the one password, sessions and the security token, two-step codes
 *   fetch.php     reaching other websites safely (hub_fetch)
 *   settings.php  site settings, the time zone, security alerts on Telegram
 */

if (defined('HUB')) return;
define('HUB', '1.64.1');
const HUB_MIN_PHP = '8.3';   // the oldest PHP this version supports and is tested on; an update zip carries it as "minPhp" in its file list

/** When each PHP branch stops getting security fixes (https://www.php.net/supported-versions, checked 2026-10-23). Branches not listed are newer than this table. Add a row each November. */
function hub_php_eol(): array { return ['8.1' => '2025-12-31', '8.2' => '2026-12-31', '8.3' => '2027-12-31', '8.4' => '2028-12-31', '8.5' => '2029-12-31']; }

/** A notice when this server's PHP no longer gets security fixes, or soon will not. Null when all is well. $branch and $now are for tests. */
function hub_php_notice(?string $branch = null, ?int $now = null): ?array {
    $b = $branch ?? (PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION); $now = $now ?? time(); $t = hub_php_eol();
    $ask = ' Ask your host to switch this site to PHP 8.4 or newer (in cPanel: MultiPHP Manager).';
    if (!isset($t[$b])) return version_compare($b, '8.1', '<') ? ['level' => 'warn', 'text' => 'PHP ' . $b . ' no longer gets security fixes.' . $ask] : null;
    $end = strtotime($t[$b] . ' 23:59:59 UTC'); $nice = gmdate('j F Y', $end);
    if ($now > $end) return ['level' => 'warn', 'text' => 'PHP ' . $b . ' stopped getting security fixes on ' . $nice . '.' . $ask];
    if ($end - $now < 183 * 86400) return ['level' => 'info', 'text' => 'PHP ' . $b . ' stops getting security fixes on ' . $nice . '.' . $ask];
    return null;
}

const HUB_SESSION_DAYS = 30;
const HUB_MIN_PASSWORD = 8;
const HUB_LOCK_AFTER   = 5;      // wrong passwords...
const HUB_LOCK_WINDOW  = 900;    // ...within 15 minutes
const HUB_LOCK_FIRST   = 900;    // first pause 15 minutes, doubling each time
const HUB_LOCK_MAX     = 86400;  // never longer than a day
const HUB_GUARD        = "<?php http_response_code(404); exit; ?>\n";
const HUB_APPS         = ['home', 'links', 'info', 'cards', 'tasks', 'files', 'tools'];   // the tabs of the bar, in their default order
const HUB_PAGE_NAMES   = ['home' => 'Home', 'links' => 'Links', 'info' => 'Info', 'cards' => 'Cards', 'tasks' => 'Tasks', 'files' => 'Files', 'tools' => 'Tools'];

define('HUB_CORE', dirname(__DIR__));          // .../public_html/web/hub/core  (the shared engine)
define('HUB_WEB', dirname(HUB_CORE, 2));     // .../public_html/web  (the pages, and hub/)
define('HUB_PUBLIC', dirname(HUB_WEB));      // .../public_html  (index.php, web and site-data sit here)
define('HUB_MEDIA', HUB_WEB . '/hub/media'); // your pictures, icons and logo (before 1.50: web/core-data/media)
define('HUB_DOCS', HUB_WEB . '/hub/docs');   // README.txt, CHANGELOG.md, THIRD-PARTY.md (before 1.50: web/docs)
/* The two layouts (see lib/update.php): this version uses the first; the second is where an update or Go Back may have left your files. */
const HUB_LAYOUT_HERE  = ['media' => 'web/hub/media', 'config' => 'web/hub/core/config.php', 'data' => 'web/hub/core/data'];
const HUB_LAYOUT_OTHER = ['media' => 'web/core-data/media', 'config' => 'web/core-data/config.php', 'data' => 'web/core-data/data'];
const HUB_LAYOUT_EMPTY = ['web/core-data'];   // the old engine folder, once its files are gone and yours have moved

/* ======================= your files follow the layout ======================= */

/** Moves everything in $from into $to (made where missing). A file already at $to stays, except the shipped .htaccess, which wins.
 *  Nothing is copied or deleted: only renamed, so even a stop half-way loses nothing, and the next request carries on. */
function hub_merge_move(string $from, string $to): void {
    if (!is_dir($from) || is_link($from)) return;
    if (!is_dir($to) && !@mkdir($to, 0755, true)) return;
    foreach (scandir($from) ?: [] as $n) {
        if ($n === '.' || $n === '..') continue;
        $a = $from . '/' . $n; $b = $to . '/' . $n;
        if (is_link($a)) continue;
        if (is_dir($a)) { if (!file_exists($b)) @rename($a, $b); else hub_merge_move($a, $b); continue; }
        if (!file_exists($b)) @rename($a, $b); elseif ($n === '.htaccess' || $n === '.gitkeep') @unlink($a);
    }
    @rmdir($from);   // only when empty
}
/** After an update that moved the engine (1.49 and 1.50, either way), puts your pictures, config.php and the old fallback data folder
 *  where this version looks for them, then removes the folders left empty. One look per request when there is nothing to do. */
function hub_settle_layout(): void {
    $pub = HUB_PUBLIC;
    $o = HUB_LAYOUT_OTHER; $h = HUB_LAYOUT_HERE;
    if (!is_dir($pub . '/' . $o['media']) && !is_file($pub . '/' . $o['config']) && !is_dir($pub . '/' . $o['data'])) return;
    // never while an update or Go Back is putting files in place (lib/update.php holds this lock); the next request carries on
    $lk = @fopen($pub . '/site-data/updates/apply.lock', 'c');
    if ($lk && !flock($lk, LOCK_EX | LOCK_NB)) { fclose($lk); return; }
    hub_merge_move($pub . '/' . $o['media'], $pub . '/' . $h['media']);
    if (is_file($pub . '/' . $o['config']) && !is_file($pub . '/' . $h['config'])) @rename($pub . '/' . $o['config'], $pub . '/' . $h['config']);
    hub_merge_move($pub . '/' . $o['data'], $pub . '/' . $h['data']);
    foreach (HUB_LAYOUT_EMPTY as $d) if (is_dir($pub . '/' . $d)) @rmdir($pub . '/' . $d);
    if ($lk) { flock($lk, LOCK_UN); fclose($lk); }
}
hub_settle_layout();

/* ======================= where data lives ======================= */

/**
 * The private data folder: site-data, INSIDE this site's own folder (next to the web folder), so it always
 * moves together with the site, also for add-on domains such as public_html/sites/xyz.com.
 * It is locked three ways: .htaccess, an empty index.html, and every data file is a PHP file that answers 404.
 */
function hub_data_root(): string {
    static $root = null;
    if ($root !== null) return $root;
    if (is_file(HUB_CORE . '/config.php')) include HUB_CORE . '/config.php';   // optional: define('HUB_DATA_DIR', '/path');
    $tries = [];
    if (defined('HUB_DATA_DIR')) $tries[] = rtrim((string)HUB_DATA_DIR, '/');
    $tries[] = HUB_PUBLIC . '/site-data';        // .../xyz.com/site-data  (travels with the site)
    $tries[] = HUB_CORE . '/data';               // fallback
    foreach ($tries as $d) {
        if (@is_dir($d) || @mkdir($d, 0700, true)) {
            if (@is_writable($d)) { $root = $d; break; }
        }
    }
    if ($root === null) { http_response_code(500); exit('Hub: no writable data folder.'); }
    if (strpos($root, HUB_PUBLIC) === 0) hub_lock_folder($root);
    return $root;
}
/** Data folder for one part of the site, e.g. hub_dir('links'). */
function hub_dir(string $app): string {
    static $known = [];   // checked once per request (it is called many times)
    if (isset($known[$app])) return $known[$app];
    $d = hub_data_root() . '/' . $app;
    if (!is_dir($d)) { @mkdir($d, 0700, true); if (strpos($d, HUB_PUBLIC) === 0) hub_lock_folder($d); }
    return $known[$app] = $d;
}
/** True when data is outside the site folder (only when you set HUB_DATA_DIR yourself). */
function hub_data_outside(): bool { return strpos(hub_data_root(), HUB_PUBLIC) !== 0; }

function hub_lock_folder(string $d): void {
    if (!is_file("$d/.htaccess")) @file_put_contents("$d/.htaccess", "# Private data: never served\n<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\nOptions -Indexes\n");
    if (!is_file("$d/index.html")) @file_put_contents("$d/index.html", '');
}

/* ======================= locks ======================= */

/** Runs $fn while this process holds an exclusive lock on $lockFile, a file used only for locking (it is made when missing), and returns what
 *  $fn returns. The lock is let go when $fn returns or throws. When the lock file cannot be opened $fn still runs, without a lock: the way every
 *  caller behaved before there was one copy of this. */
function hub_with_lock(string $lockFile, callable $fn)
{
    $lk = @fopen($lockFile, 'c'); if ($lk) flock($lk, LOCK_EX);
    try { return $fn(); } finally { if ($lk) { flock($lk, LOCK_UN); fclose($lk); } }
}
/** The same for a change that must not happen at all without the lock: when the lock file cannot be opened $fn does not run, and $failed is returned. */
function hub_with_lock_or(string $lockFile, callable $fn, $failed)
{
    $lk = @fopen($lockFile, 'c'); if (!$lk) return $failed;
    flock($lk, LOCK_EX);
    try { return $fn(); } finally { flock($lk, LOCK_UN); fclose($lk); }
}

/* ======================= safe files ======================= */

/** Writes a file completely or not at all (temp file + rename), so a crash can never leave half a file. */
function hub_write(string $file, string $content): bool {
    $dir = dirname($file);
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    $tmp = $dir . '/.' . basename($file) . '.' . bin2hex(random_bytes(4)) . '.tmp';
    if (@file_put_contents($tmp, $content, LOCK_EX) !== strlen($content)) { @unlink($tmp); return false; }
    if (!@rename($tmp, $file)) { @unlink($tmp); return false; }
    return true;
}
/** JSON stored inside a PHP file that answers 404 if anyone ever opens it in a browser. */
function hub_read_guarded(string $file) {
    if (!is_file($file)) return null;
    $s = (string)@file_get_contents($file);
    if (strncmp($s, '<?php', 5) === 0) $s = (string)substr($s, strpos($s, "\n") + 1);
    $j = json_decode($s, true);
    return is_array($j) ? $j : null;
}
function hub_write_guarded(string $file, array $data): bool {
    $json = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    return $json !== false && hub_write($file, HUB_GUARD . str_replace('<', '\u003C', $json));
}

/**
 * Data files that used to be plain .json are now guarded .php files (a browser gets a 404 even if .htaccess is ignored).
 * hub_jpath maps x.json -> x.php; hub_jraw reads the JSON text (old plain file as fallback); hub_jput writes it guarded.
 */
function hub_jpath(string $f): string { return preg_replace('/\.json$/', '.php', $f); }
function hub_jraw(string $f): string {
    $p = hub_jpath($f);
    $s = is_file($p) ? (string)@file_get_contents($p) : (is_file($f) ? (string)@file_get_contents($f) : '');
    if (strncmp($s, '<?php', 5) === 0) { $n = strpos($s, "\n"); $s = $n === false ? '' : substr($s, $n + 1); }
    return $s;
}
function hub_jread(string $f): ?array { $j = json_decode(hub_jraw($f), true); return is_array($j) ? $j : null; }
function hub_jput(string $f, string $json): bool {
    $p = hub_jpath($f);
    if (!hub_write($p, HUB_GUARD . str_replace('<', '\u003C', $json))) return false;
    if ($p !== $f && is_file($f)) @unlink($f);   // the old plain .json copy is only protected by .htaccess: drop it once moved
    return true;
}

/* ======================= requests ======================= */

function hub_json($code, $arr): never {
    if (!headers_sent()) { http_response_code($code); header('Content-Type: application/json; charset=utf-8'); }
    echo json_encode($arr, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}
function hub_headers(): void {
    @set_time_limit(60);   // slow hosts: do not stop a request half way
    @ignore_user_abort(true);
    if (headers_sent()) return;
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: same-origin');
    header('Cache-Control: no-store');
    header('Cross-Origin-Resource-Policy: same-origin');
    header('Cross-Origin-Opener-Policy: same-origin');
    header('X-Robots-Tag: noindex, nofollow');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()');   // nothing on the site needs these
    if (hub_https()) header('Strict-Transport-Security: max-age=31536000');   // also behind Cloudflare, where .htaccess can't tell
}
/** Blocks POSTs sent from other websites. Every app API calls this. */
function hub_same_origin(): void {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') return;
    $site = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '';
    if ($site !== '' && $site !== 'same-origin' && $site !== 'none') hub_json(403, ['ok' => false, 'error' => 'Requests from other sites are not allowed.']);
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && $origin !== 'null') {
        $oh = strtolower((string)parse_url($origin, PHP_URL_HOST));
        $hh = strtolower(preg_replace('~:\d+$~', '', (string)($_SERVER['HTTP_HOST'] ?? '')));
        if ($oh !== $hh) hub_json(403, ['ok' => false, 'error' => 'Requests from other sites are not allowed.']);
    }
}
function hub_https(): bool {
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https' && hub_from_cloudflare());
}

/* ======================= visitor IP (Cloudflare-aware) ======================= */

function hub_cf_ranges(): array {   // cloudflare.com/ips (check once a year)
    return ['173.245.48.0/20','103.21.244.0/22','103.22.200.0/22','103.31.4.0/22','141.101.64.0/18','108.162.192.0/18',
        '190.93.240.0/20','188.114.96.0/20','197.234.240.0/22','198.41.128.0/17','162.158.0.0/15','104.16.0.0/13',
        '104.24.0.0/14','172.64.0.0/13','131.0.72.0/22','2400:cb00::/32','2606:4700::/32','2803:f800::/32',
        '2405:b500::/32','2405:8100::/32','2a06:98c0::/29','2c0f:f248::/32'];
}
function hub_ip_in(string $ip, string $cidr): bool {
    [$net, $bits] = explode('/', $cidr);
    $a = @inet_pton($ip); $b = @inet_pton($net);
    if ($a === false || $b === false || strlen($a) !== strlen($b)) return false;
    $bits = (int)$bits; $bytes = intdiv($bits, 8); $rem = $bits % 8;
    if (substr($a, 0, $bytes) !== substr($b, 0, $bytes)) return false;
    if ($rem === 0) return true;
    $mask = chr(0xFF << (8 - $rem) & 0xFF);
    return (($a[$bytes] & $mask) === ($b[$bytes] & $mask));
}
function hub_from_cloudflare(): bool {
    $r = $_SERVER['REMOTE_ADDR'] ?? '';
    foreach (hub_cf_ranges() as $c) if (hub_ip_in($r, $c)) return true;
    return false;
}
function hub_ip(): string {
    $r = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $cf = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? '';
    if ($cf !== '' && filter_var($cf, FILTER_VALIDATE_IP) && hub_from_cloudflare()) return $cf;
    return $r;
}

/**
 * A free file name for an earlier version, made from the current second: "<dir>/<prefix>20261024-090702.php", or with -2, -3...
 * when that name is taken (two saves in one second must not overwrite each other, and restoring a version made in the same
 * second must not overwrite the version being restored).
 */
function hub_version_path(string $dir, string $prefix = '', ?int $now = null): string {
    $base = $dir . '/' . $prefix . date('Ymd-His', $now ?? time());
    $p = $base . '.php';
    for ($i = 2; is_file($p) && $i < 1000; $i++) $p = $base . '-' . $i . '.php';
    return $p;
}

/**
 * Links keeps an earlier version of its data before a save at most every $every seconds (10 minutes), and always when
 * asked: a restore, a rollback, and a save the page marks with "keep" (Import Bookmarks, so the import can be undone from
 * Backup & Restore > Earlier Versions). $newest is the time of the newest kept version, null when there is none.
 */
function hub_links_keep_due(?int $newest, bool $force, int $every, ?int $now = null): bool {
    return $force || $newest === null || ($now ?? time()) - $newest >= $every;
}

/* ======================= install on a phone or computer (web app manifest) ======================= */

/** The site's own path from the address of a script inside it: "/hub" for /hub/web/hub/core/api.php (or /hub/web/hub/core/api.php), "" at the top. */
function hub_site_path(string $script): string {
    $s = str_replace('\\', '/', $script);
    $p = preg_replace('#/web/(?:hub/)?[^/]+/[^/]*$#', '', $s);
    if ($p === null || $p === $s) $p = rtrim(dirname($s), '/');   // a script at the top (index.php)
    return rtrim($p, '/');
}

/** The owner's logo, when it can be an app icon: a square PNG of at least 512 px. Its address inside the site, or ''. */
function hub_app_logo(string $logo, string $public): string {
    if (!preg_match('#^web/(?:hub/core|hub)/media/brand/logo-[0-9a-f]+\.png$#', $logo)) return '';
    $f = $public . '/' . $logo;
    $i = is_file($f) ? @getimagesize($f) : false;
    return ($i && $i[2] === IMAGETYPE_PNG && $i[0] === $i[1] && $i[0] >= 512) ? $logo : '';
}

/**
 * The web app manifest (what a phone uses for "Add to Home Screen"). Public: only the site name, icons, colours and the
 * pages' names. Every address starts at the site's own path, so an install in a sub-folder works. No offline mode.
 */
function hub_manifest(array $s, string $root, string $public): array {
    $name = mb_substr(trim(strip_tags((string)($s['siteName'] ?? ''))), 0, 30) ?: 'Homebase Hub';
    $short = mb_strlen($name) <= 12 ? $name : rtrim(mb_substr(preg_split('/\s+/', $name)[0], 0, 12));
    $u = function (string $path) use ($root) { return $root . '/' . $path; };
    $brand = 'web/hub/core/assets/brand/';
    $own = hub_app_logo((string)($s['logo'] ?? ''), $public);
    $icons = [
        ['src' => $u($brand . 'logo-192.png'), 'sizes' => '192x192', 'type' => 'image/png', 'purpose' => 'any'],
        ['src' => $u($own !== '' ? $own : $brand . 'logo-512.png'), 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'any'],
        ['src' => $u($brand . 'logo-512-maskable.png'), 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'maskable'],
    ];
    if ($own !== '') { $sz = getimagesize($public . '/' . $own); $icons[1]['sizes'] = $sz[0] . 'x' . $sz[1]; }
    $names = ['links' => 'Links', 'info' => 'Info', 'cards' => 'Cards', 'tasks' => 'Tasks', 'tools' => 'Tools'];
    $order = array_keys($names); $hidden = [];
    foreach ((array)($s['pages'] ?? []) as $pg) {   // the bar's own names, order and hidden pages (Settings > General > Tabs)
        $id = (string)($pg['id'] ?? '');
        if (!isset($names[$id])) continue;
        if (trim((string)($pg['name'] ?? '')) !== '') $names[$id] = mb_substr(trim(strip_tags((string)$pg['name'])), 0, 30);
        if (!empty($pg['hide'])) $hidden[$id] = true;
    }
    $listed = array_values(array_filter(array_map(function ($p) { return (string)($p['id'] ?? ''); }, (array)($s['pages'] ?? [])), function ($id) use ($names) { return isset($names[$id]); }));
    $order = array_values(array_unique(array_merge($listed, $order)));
    $short_cuts = [];
    foreach ($order as $id) if (empty($hidden[$id])) $short_cuts[] = ['name' => $names[$id], 'url' => $u('web/' . $id . '/'), 'icons' => [['src' => $u($brand . 'logo-192.png'), 'sizes' => '192x192', 'type' => 'image/png']]];
    return [
        'id' => $u(''), 'name' => $name, 'short_name' => $short, 'description' => $name . ': start page, bookmarks, notes and tasks on your own server.',
        'start_url' => $u('web/home/'), 'scope' => $u(''), 'display' => 'standalone',
        // (1.61.0) the phone's Share button: pictures, files, text and links go to web/hub/share-sw.js, which opens the Files page (see there)
        'share_target' => ['action' => $u('web/hub/share-target'), 'method' => 'POST', 'enctype' => 'multipart/form-data',
            'params' => ['title' => 'title', 'text' => 'text', 'url' => 'url', 'files' => [['name' => 'files', 'accept' => ['image/*', 'video/*', 'audio/*', 'text/*', 'application/*']]]]],
        'background_color' => '#1a1a1a', 'theme_color' => '#1a1a1a', 'icons' => $icons, 'shortcuts' => $short_cuts,
    ];
}

/* ======================= the rest of the core, in three files ======================= */
/* Split out of this file in 1.62.6. They are loaded here, in this order, because the time zone below is set while settings.php loads. */
require_once __DIR__ . '/auth.php';       // login lockout, the one password, sessions, two-step codes
require_once __DIR__ . '/fetch.php';      // reaching other websites safely (hub_fetch)
require_once __DIR__ . '/settings.php';   // site settings, the time zone, security alerts

/* ======================= housekeeping ======================= */
/** Removes a folder and everything in it. Only ever called with a path the code built itself. */
function hub_rm_tree(string $dir): void {
    try {
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
        foreach ($it as $f) { $f->isDir() && !$f->isLink() ? @rmdir($f->getPathname()) : @unlink($f->getPathname()); }
    } catch (Throwable $e) {}
    @rmdir($dir);
}

/* Once per version, after an update: removes web/tools/config.json, which older versions wrote for the old Tools and nothing reads any more.
   One file check per request: the marker carries the version. */
if (!is_file(hub_dir('core') . '/after-update-' . HUB . '.done')) {
    foreach (glob(hub_dir('core') . '/after-update-*.done') ?: [] as $old) @unlink($old);
    @unlink(HUB_WEB . '/tools/config.json');
    @file_put_contents(hub_dir('core') . '/after-update-' . HUB . '.done', date('c'));
}

/** The newest version's part of the changelog (from its first "## x.y.z" heading to the next "---" or "## "), for Settings > Overview. */
function hub_changelog_latest(string $md): string {
    if (!preg_match('/^## \d+\.\d+\.\d+.*$/m', $md, $m, PREG_OFFSET_CAPTURE)) return '';
    $rest = substr($md, $m[0][1]);
    $end = preg_match('/\n(---|## )/', $rest, $e, PREG_OFFSET_CAPTURE, strlen($m[0][0])) ? $e[0][1] : strlen($rest);
    return substr($rest, 0, $end) . "\n";
}
