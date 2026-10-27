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
 * Hub core: shared by Home, Links, Info, Cards and Tools.
 *
 *  - Where data lives (site-data inside the site folder, so it moves with the site)
 *  - One login: one password, one session cookie, optional two-step codes. The same password also unlocks Info's
 *    encrypted tabs and encrypted backups (when you choose so), so there is only one thing to remember.
 *  - Login lockout, safe file writes, request checks, security headers
 *  - Site-wide settings (look, navigation, theme)
 *
 * Every app's api.php loads this file first (from the page's own folder, ../hub/core/lib/boot.php).
 */

if (defined('HUB')) return;
define('HUB', '1.53.6');
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
const HUB_APPS         = ['home', 'links', 'info', 'cards', 'tasks', 'tools'];   // the tabs of the bar, in their default order
const HUB_PAGE_NAMES   = ['home' => 'Home', 'links' => 'Links', 'info' => 'Info', 'cards' => 'Cards', 'tasks' => 'Tasks', 'tools' => 'Tools'];

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
        'background_color' => '#1a1a1a', 'theme_color' => '#1a1a1a', 'icons' => $icons, 'shortcuts' => $short_cuts,
    ];
}

/* ======================= login lockout ======================= */

function hub_rate_file(): string { return hub_dir('core') . '/ratelimit.php'; }
function hub_rate_key(): string {   // IPs are never stored as-is
    $ip = hub_ip(); $bin = @inet_pton($ip);
    // One IPv6 connection usually comes with a whole /64 (18 billion billion addresses), so the /64 counts as one visitor.
    if ($bin !== false && strlen($bin) === 16) $ip = bin2hex(substr($bin, 0, 8)) . '::/64';
    return substr(hash('sha256', 'hub|' . $ip), 0, 24);
}
function hub_rate_update(callable $fn) {
    $f = hub_rate_file();
    $fh = @fopen($f, 'c+');
    if (!$fh) return $fn([])[1];
    flock($fh, LOCK_EX);
    $s = stream_get_contents($fh);
    if (strncmp($s, '<?php', 5) === 0) $s = (string)substr($s, strpos($s, "\n") + 1);
    $all = json_decode($s, true); if (!is_array($all)) $all = [];
    $now = time();
    foreach ($all as $k => $v) {
        $quiet = ($v['until'] ?? 0) < $now && ($v['first'] ?? 0) < $now - HUB_LOCK_WINDOW;
        // forget a visitor once it is quiet; one that was paused is remembered for 2 days, so the pauses keep doubling
        if ($quiet && (($v['locks'] ?? 0) === 0 || ($v['until'] ?? 0) < $now - 2 * HUB_LOCK_MAX)) unset($all[$k]);
    }
    [$all, $ret] = $fn($all);
    ftruncate($fh, 0); rewind($fh);
    fwrite($fh, HUB_GUARD . json_encode($all));
    fflush($fh); flock($fh, LOCK_UN); fclose($fh);
    return $ret;
}
/** Seconds until this visitor may try again (0 = now). */
function hub_rate_wait(): int {
    $k = hub_rate_key();
    return hub_rate_update(function ($all) use ($k) { return [$all, max(0, (int)($all[$k]['until'] ?? 0) - time())]; });
}
/** Records a wrong password. Returns tries left before a pause. */
function hub_rate_fail(): int {
    $k = hub_rate_key();
    return hub_rate_update(function ($all) use ($k) {
        $now = time(); $r = $all[$k] ?? ['n' => 0, 'first' => $now, 'until' => 0, 'locks' => 0];
        if ($now - $r['first'] > HUB_LOCK_WINDOW) { $r['n'] = 0; $r['first'] = $now; }
        $r['n']++;
        $left = HUB_LOCK_AFTER - $r['n'];
        if ($left <= 0) {
            $r['until'] = $now + min(HUB_LOCK_MAX, HUB_LOCK_FIRST * (2 ** min(10, (int)$r['locks'])));
            $r['locks']++; $r['n'] = 0; $r['first'] = $now; $left = 0;
        }
        $all[$k] = $r;
        return [$all, $left];
    });
}
function hub_rate_clear(): void {
    $k = hub_rate_key();
    hub_rate_update(function ($all) use ($k) { unset($all[$k]); return [$all, null]; });
}

/* ======================= Tools > Favicon: icons fetched for the browser ======================= */

/** A visitor may fetch at most $max icons in $window seconds (Tools > Favicon download). The address is kept only as a hash and forgotten when the window ends. */
function hub_icon_allow(int $max = 60, int $window = 600): bool {
    $fh = @fopen(hub_dir('core') . '/favlimit.php', 'c+'); if (!$fh) return true;
    flock($fh, LOCK_EX);
    $s = stream_get_contents($fh); if (strncmp($s, '<?php', 5) === 0) $s = (string)substr($s, strpos($s, "\n") + 1);
    $all = json_decode($s, true); if (!is_array($all)) $all = [];
    $now = time(); $k = hub_rate_key();
    foreach ($all as $key => $v) if (($v['t'] ?? 0) < $now - $window) unset($all[$key]);
    $r = $all[$k] ?? ['t' => $now, 'n' => 0]; if ($now - $r['t'] > $window) $r = ['t' => $now, 'n' => 0];
    $ok = $r['n'] < $max; if ($ok) $r['n']++;
    $all[$k] = $r;
    ftruncate($fh, 0); rewind($fh); fwrite($fh, HUB_GUARD . json_encode($all)); fflush($fh); flock($fh, LOCK_UN); fclose($fh);
    return $ok;
}
/** A website name as the Favicon tool sends it: letters, digits and hyphens in dot-separated parts, at least one dot, not an IP address. Returns it lower-cased, or null. */
function hub_icon_domain($d): ?string {
    $d = strtolower(trim((string)$d));
    if ($d === '' || strlen($d) > 253 || filter_var($d, FILTER_VALIDATE_IP)) return null;
    return preg_match('/^([a-z0-9]([a-z0-9-]*[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/', $d) ? $d : null;
}
function hub_png_ok(string $b): bool { return strlen($b) > 60 && strlen($b) < 400000 && strncmp($b, "\x89PNG\r\n\x1a\n", 8) === 0; }
/** The PNG of a website's icon from Google's public favicon service (only the website name is sent), or null. $sz is 16 to 256. */
function hub_icon_fetch(string $domain, int $sz): ?string {
    if (defined('HUB_TEST_FAVICON')) return (string)@file_get_contents(HUB_TEST_FAVICON);   // tests only: the site never defines this
    $r = hub_get_https('https://www.google.com/s2/favicons?domain=' . rawurlencode($domain) . '&sz=' . $sz, ['Accept: image/png,image/*;q=0.8'], 400000, 10);
    return $r && $r[0] === 200 && hub_png_ok($r[1]) ? $r[1] : null;
}

/* ======================= the one password ======================= */

function hub_auth_file(): string { return hub_dir('core') . '/auth.php'; }
/** {hash, ver, secret, totp: {secret, on, last}, recovery: [hashes]} or null before setup. */
function hub_auth(): ?array {
    if (!array_key_exists('__hub_auth', $GLOBALS)) {
        $a = hub_read_guarded(hub_auth_file());
        $GLOBALS['__hub_auth'] = ($a && !empty($a['hash'])) ? $a : null;
    }
    return $GLOBALS['__hub_auth'];
}
function hub_auth_save(array $a): void {
    if (!hub_write_guarded(hub_auth_file(), $a)) hub_json(500, ['ok' => false, 'error' => 'Could not save the login file.']);
    $GLOBALS['__hub_auth'] = $a;
}
function hub_new_auth(string $pw): array {
    return ['hash' => password_hash($pw, PASSWORD_DEFAULT), 'ver' => 1, 'secret' => bin2hex(random_bytes(32)), 'totp' => ['on' => false]];
}

/**
 * First-time setup needs a one-time setup code that only someone with access to your hosting files can read:
 * it is written to site-data/core/SETUP-CODE.php. So nobody else can claim a fresh install.
 * It is a .php file that answers 404 in a browser, so it stays private even on servers that ignore .htaccess;
 * in the hosting file manager it opens as plain text.
 */
function hub_setup_file(): string { return hub_dir('core') . '/SETUP-CODE.php'; }
function hub_setup_code(): string {
    $f = hub_setup_file();
    $c = '';
    if (is_file($f) && preg_match('/\b([A-Z0-9]{4}-[A-Z0-9]{4})\b/', (string)@file_get_contents($f), $m)) $c = $m[1];
    if ($c === '' || !is_file($f)) {
        if ($c === '') {
            $abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            for ($i = 0; $i < 8; $i++) $c .= $abc[random_int(0, strlen($abc) - 1)] . ($i === 3 ? '-' : '');
        }
        hub_write($f, HUB_GUARD . "\nSETUP CODE:  $c\n\nType this code on the site setup screen. It works once, then this file is deleted.\n");
        @chmod($f, 0600);
    }
    return $c;
}
function hub_setup_done(): void { @unlink(hub_setup_file()); }

/** Where to find the setup code, in words a person can follow in your hosting file manager. */
function hub_setup_file_hint(): string {
    return (hub_data_outside() ? hub_data_root() : basename(HUB_PUBLIC) . '/site-data') . '/core/SETUP-CODE.php';
}

/* ======================= sessions ======================= */

function hub_session(bool $write = false): void {
    if (session_status() === PHP_SESSION_ACTIVE) { if (!$write) return; session_write_close(); }
    if (session_status() === PHP_SESSION_NONE && !headers_sent()) {
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.gc_maxlifetime', (string)(HUB_SESSION_DAYS * 86400));
        // Session files live in site-data/sessions, not the server's shared temp folder: other sites on a shared host
        // can't read them there, and their cleanup (often after 24 minutes) can't end a 30-day login early.
        $sd = hub_dir('sessions');
        if (is_dir($sd) && is_writable($sd)) {
            ini_set('session.save_path', $sd);
            ini_set('session.gc_probability', '1');
            ini_set('session.gc_divisor', '200');
        }
        session_name('hub_session');
        session_set_cookie_params(['lifetime' => HUB_SESSION_DAYS * 86400, 'path' => '/', 'httponly' => true,
            'samesite' => 'Strict', 'secure' => hub_https()]);
    }
    if (!isset($_COOKIE['hub_session']) && !$write) { $_SESSION = []; return; }   // visitors never get a session file
    if ($write) @session_start(); else @session_start(['read_and_close' => true]);
}
/** True when this browser is logged in. Cheap; call as often as needed. */
function hub_admin(): bool {
    static $r = null;
    if ($r !== null) return $r;
    hub_session();
    $a = hub_auth();
    $r = $a && !empty($_SESSION['hub'])
        && (int)($_SESSION['ver'] ?? -1) === (int)$a['ver']
        && (int)($_SESSION['exp'] ?? 0) > time()
        && (hash_equals((string)($_SESSION['fp'] ?? ''), hub_fingerprint()) || hash_equals((string)($_SESSION['fp'] ?? ''), hub_fingerprint_v1()));
    // a login ended one by one from Settings > Security > Devices (the list file exists only while something is in it)
    if ($r && is_file(hub_dir('core') . '/revoked.php')) { try { require_once __DIR__ . '/activity.php'; if (act_revoked()) $r = false; } catch (Throwable $e) {} }
    return $r;
}
/**
 * Ties a session to the browser it was made in (its kind and system), so a stolen cookie is less useful elsewhere.
 * Version numbers are left out: browsers update every few weeks, and that must not log you out.
 */
function hub_fingerprint(): string { return substr(hash('sha256', 'fp2|' . preg_replace('~[0-9._]+~', '', (string)($_SERVER['HTTP_USER_AGENT'] ?? ''))), 0, 16); }
/** The 1.22 fingerprint (whole user agent), still accepted so logins made before the update keep working. */
function hub_fingerprint_v1(): string { return substr(hash('sha256', 'fp|' . ($_SERVER['HTTP_USER_AGENT'] ?? '')), 0, 16); }
function hub_csrf(): string { hub_session(); return (string)($_SESSION['csrf'] ?? ''); }
/**
 * Security check for changes made while logged in: the page's security token (X-Hub-CSRF header), or a browser that
 * itself vouches the request came from this site (Sec-Fetch-Site: same-origin, a header web pages cannot fake).
 */
function hub_csrf_ok(): bool {
    $t = (string)($_SERVER['HTTP_X_HUB_CSRF'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''));
    $c = hub_csrf();
    if ($t !== '' && $c !== '' && hash_equals($c, $t)) return true;
    return ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'same-origin';
}
function hub_start_session(array $a): void {
    hub_session(true);
    session_regenerate_id(true);
    $_SESSION = ['hub' => true, 'ver' => (int)$a['ver'], 'exp' => time() + HUB_SESSION_DAYS * 86400,
                 'csrf' => bin2hex(random_bytes(32)), 'fp' => hub_fingerprint()];
    session_write_close();
    try { require_once __DIR__ . '/activity.php'; act_session_add($a); } catch (Throwable $e) {}   // the Devices list
}
function hub_end_session(): void {
    hub_session(true);
    try { require_once __DIR__ . '/activity.php'; act_session_gone(); } catch (Throwable $e) {}
    $_SESSION = [];
    if (ini_get('session.use_cookies') && !headers_sent()) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', ['expires' => time() - 42000, 'path' => $p['path'], 'secure' => $p['secure'], 'httponly' => true, 'samesite' => 'Strict']);
    }
    @session_destroy();
}

/**
 * Checks the password (and two-step code if turned on), with lockout.
 * A browser you trusted (the "Trust this browser for 30 days" tick) skips the two-step code and the Telegram question;
 * the password is always needed. $trust = this login asks to trust this browser from now on.
 * Returns ['ok'=>true] or ['ok'=>false,'code'=>http,'error'=>..., 'need2fa'=>bool].
 */
function hub_check_login(string $pw, string $code = '', bool $trust = false): array {
    $a = hub_auth();
    if (!$a) return ['ok' => false, 'code' => 409, 'error' => 'No password is set yet.', 'setup' => true];
    if (($w = hub_rate_wait()) > 0) return ['ok' => false, 'code' => 429, 'error' => 'Too many wrong tries. Try again in ' . max(1, (int)ceil($w / 60)) . ' minutes.'];
    if ($pw === '' || !password_verify($pw, $a['hash'])) {
        usleep(random_int(300000, 700000));
        $left = hub_rate_fail();
        hub_act('failed', 'password');
        if ($left <= 0) hub_alert('locked');
        return ['ok' => false, 'code' => 401, 'error' => $left > 0 ? "Wrong password. $left " . ($left === 1 ? 'try' : 'tries') . " left before logins pause." : 'Wrong password. Logins are paused for a while.'];
    }
    $trusted = false;
    if (!empty($a['totp']['on']) || is_file(hub_dir('core') . '/login-approval.php')) { require_once __DIR__ . '/approval.php'; $trusted = ap_trusted(); }
    if (!empty($a['totp']['on']) && !$trusted) {
        if ($code === '') return ['ok' => false, 'code' => 401, 'need2fa' => true, 'error' => 'Enter the 6-digit code from your authenticator app.'];
        if (!hub_totp_use($a, $code)) {
            $left = hub_rate_fail();
            hub_act('failed', 'code');
            if ($left <= 0) hub_alert('locked');
            return ['ok' => false, 'code' => 401, 'need2fa' => true, 'error' => $left > 0 ? 'That code is wrong or expired.' : 'Too many wrong codes. Logins are paused for a while.'];
        }
    }
    hub_rate_clear();
    // Approve logins in Telegram (Settings > Security): a new browser waits for your tap. Off, trusted or Telegram down: no wait.
    if (is_file(hub_dir('core') . '/login-approval.php')) {
        require_once __DIR__ . '/approval.php';
        $ap = ap_start($trusted);
        if (empty($ap['skip'])) return ['ok' => false, 'code' => 202, 'approval' => $ap['id'], 'recovery' => !empty($a['totp']['on']), 'error' => 'Approve this login in Telegram.'];
    }
    // trusting only means something when there is a code or a Telegram question to skip
    if ($trust && !$trusted && (!empty($a['totp']['on']) || ap_on_quick())) { require_once __DIR__ . '/approval.php'; ap_trust_this(); }
    hub_alert('login');
    if (password_needs_rehash($a['hash'], PASSWORD_DEFAULT)) { $a = hub_auth(); $a['hash'] = password_hash($pw, PASSWORD_DEFAULT); hub_auth_save($a); }
    hub_password_used($pw);
    return ['ok' => true];
}

/** Login approval is on (cheap: no Telegram, no writing). */
function ap_on_quick(): bool {
    if (!is_file(hub_dir('core') . '/login-approval.php')) return false;
    require_once __DIR__ . '/approval.php';
    return ap_on();
}
/**
 * The password was just typed and is right: things that use the same password follow it. Today that is the backup
 * key when Backup > Encryption is set to "use my website password" (it is made again if the password changed some other
 * way, for example after a reset through the hosting files).
 */
function hub_password_used(string $pw): void {
    if (!is_file(hub_dir('core') . '/backup-key.php')) return;
    require_once __DIR__ . '/backup.php';
    bk_login_sync($pw);
}

/* ======================= two-step codes (TOTP, RFC 6238) ======================= */

function hub_b32enc(string $bin): string {
    $abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; $bits = ''; $out = '';
    foreach (str_split($bin) as $c) $bits .= str_pad(decbin(ord($c)), 8, '0', STR_PAD_LEFT);
    foreach (str_split($bits, 5) as $chunk) $out .= $abc[bindec(str_pad($chunk, 5, '0'))];
    return $out;
}
function hub_b32dec(string $s): string {
    $abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; $bits = ''; $out = '';
    foreach (str_split(strtoupper(preg_replace('/[^A-Za-z2-7]/', '', $s))) as $c) $bits .= str_pad(decbin(strpos($abc, $c)), 5, '0', STR_PAD_LEFT);
    foreach (str_split($bits, 8) as $byte) if (strlen($byte) === 8) $out .= chr(bindec($byte));
    return $out;
}
function hub_totp_at(string $secretB32, int $step): string {
    $h = hash_hmac('sha1', pack('N2', 0, $step), hub_b32dec($secretB32), true);
    $o = ord($h[19]) & 0xF;
    $n = ((ord($h[$o]) & 0x7F) << 24 | ord($h[$o + 1]) << 16 | ord($h[$o + 2]) << 8 | ord($h[$o + 3])) % 1000000;
    return str_pad((string)$n, 6, '0', STR_PAD_LEFT);
}
/** Accepts a 6-digit code (30 s window, ±30 s clock drift, never the same code twice) or a one-time recovery code. */
function hub_totp_use(array $a, string $code): bool {
    $code = strtoupper(preg_replace('/[\s-]/', '', $code));
    if (preg_match('/^\d{6}$/', $code)) {
        $now = intdiv(time(), 30);
        foreach ([-1, 0, 1] as $d) {
            $step = $now + $d;
            if ($step <= (int)($a['totp']['last'] ?? 0)) continue;
            if (hash_equals(hub_totp_at($a['totp']['secret'], $step), $code)) {
                $a['totp']['last'] = $step; hub_auth_save($a); return true;
            }
        }
        return false;
    }
    if (preg_match('/^[A-Z0-9]{10}$/', $code)) {   // recovery code
        foreach ($a['recovery'] ?? [] as $i => $h) {
            if (password_verify($code, $h)) { array_splice($a['recovery'], $i, 1); hub_auth_save($a); return true; }
        }
    }
    return false;
}

/* ======================= reaching other websites safely ======================= */

/** True for an address on the public internet (not this server, the hosting network, or anything private/reserved). */
function hub_ip_public(string $ip): bool {
    if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return false;
    // ranges older PHP versions don't treat as private/reserved, and IPv6 forms that can wrap an internal IPv4 address
    foreach (['0.0.0.0/8', '100.64.0.0/10', '127.0.0.0/8', '169.254.0.0/16', '192.0.0.0/24', '192.0.2.0/24', '198.18.0.0/15',
              '198.51.100.0/24', '203.0.113.0/24', '224.0.0.0/3', '::/127', '::ffff:0:0/96', '64:ff9b::/96', '64:ff9b:1::/48',
              '100::/64', '2001:db8::/32', '2002::/16', 'fc00::/7', 'fe80::/10', 'fec0::/10', 'ff00::/8'] as $c) {
        if (hub_ip_in($ip, $c)) return false;
    }
    return true;
}
/**
 * Every IPv4 and IPv6 address a host name points to, or [] when ANY of them is not public (or the name doesn't resolve).
 * Checking IPv6 too matters: a name with a public IPv4 and an internal IPv6 address must not get through.
 */
function hub_public_ips(string $host): array {
    static $cache = [];
    $host = strtolower(rtrim(trim($host, '[]'), '.'));
    if ($host === '') return [];
    if (isset($cache[$host])) return $cache[$host];
    if (filter_var($host, FILTER_VALIDATE_IP)) $ips = [$host];
    elseif (preg_match('/(^|\.)(localhost|local|internal|intranet|lan|home\.arpa)$/', $host)) $ips = [];
    else {
        $ips = [];
        $recs = function_exists('dns_get_record') ? @dns_get_record($host, DNS_A | DNS_AAAA) : false;
        foreach (is_array($recs) ? $recs : [] as $r) { if (!empty($r['ip'])) $ips[] = $r['ip']; if (!empty($r['ipv6'])) $ips[] = $r['ipv6']; }
        if (!$ips) $ips = @gethostbynamel($host) ?: [];
    }
    foreach ($ips as $ip) if (!hub_ip_public($ip)) { $ips = []; break; }
    return $cache[$host] = array_values(array_unique($ips));
}
/**
 * Pins a cURL handle to an address hub_public_ips() approved, so DNS can't answer differently between the check and the
 * connection ("DNS rebinding"). False = not a public host: don't connect.
 */
function hub_curl_pin($ch, string $url): bool {
    // PHP and some older cURL builds read "https://10.0.0.1\\@example.com" differently (different host): refuse anything that could be read two ways
    if (strpos($url, '\\') !== false || preg_match('~[\x00-\x20\x7F]~', $url) || preg_match('~^[a-z][a-z0-9+.-]*://[^/?#]*@~i', $url)) return false;
    $p = parse_url($url);
    $host = strtolower(trim((string)($p['host'] ?? ''), '[]'));
    $ips = hub_public_ips($host);
    if (!$ips) return false;
    if (defined('CURLPROTO_HTTP')) { curl_setopt($ch, CURLOPT_PROTOCOLS, CURLPROTO_HTTP | CURLPROTO_HTTPS); }
    if (filter_var($host, FILTER_VALIDATE_IP)) return true;   // a bare address: nothing to look up
    $port = (int)($p['port'] ?? (strtolower((string)($p['scheme'] ?? '')) === 'http' ? 80 : 443));
    $v4 = array_values(array_filter($ips, function ($i) { return (bool)filter_var($i, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4); }));
    $ip = $v4[0] ?? $ips[0];
    curl_setopt($ch, CURLOPT_RESOLVE, ["$host:$port:" . (strpos($ip, ':') !== false ? "[$ip]" : $ip)]);
    return true;
}
/** The address a redirect (Location: $rel) points to, seen from $base. */
function hub_url_join(string $base, string $rel): string {
    $rel = trim($rel);
    if ($rel === '') return $base;
    if (preg_match('~^[a-z][a-z0-9+.-]*:~i', $rel)) return $rel;
    $p = parse_url($base); $scheme = $p['scheme'] ?? 'https';
    $origin = $scheme . '://' . ($p['host'] ?? '') . (isset($p['port']) ? ':' . $p['port'] : '');
    if (strncmp($rel, '//', 2) === 0) return $scheme . ':' . $rel;
    if ($rel[0] === '/') return $origin . $rel;
    $path = $p['path'] ?? '/';
    return $origin . substr($path, 0, (int)strrpos($path, '/') + 1) . $rel;
}
/**
 * GET over https only, for addresses that come from outside (an update address, RDAP): every redirect hop is checked
 * and pinned like the first one, so a public address can never bounce the server onto your own network.
 * Returns [httpCode, body] or null.
 */
function hub_get_https(string $url, array $headers = [], int $maxBytes = 2000000, int $timeout = 15): ?array {
    if (!function_exists('curl_init')) return null;
    for ($hop = 0; $hop < 5; $hop++) {
        if (!preg_match('~^https://~i', $url)) return null;
        $ch = curl_init($url);
        if (!hub_curl_pin($ch, $url)) { curl_close($ch); return null; }
        $loc = ''; $buf = '';
        curl_setopt_array($ch, [CURLOPT_FOLLOWLOCATION => false, CURLOPT_CONNECTTIMEOUT => 6, CURLOPT_TIMEOUT => $timeout,
            CURLOPT_HTTPHEADER => $headers, CURLOPT_USERAGENT => 'Mozilla/5.0 (site check)', CURLOPT_ENCODING => '',
            CURLOPT_HEADERFUNCTION => function ($c, $h) use (&$loc) { if (stripos($h, 'location:') === 0) $loc = trim(substr($h, 9)); return strlen($h); },
            CURLOPT_WRITEFUNCTION => function ($c, $chunk) use (&$buf, $maxBytes) { $buf .= $chunk; return strlen($buf) > $maxBytes ? 0 : strlen($chunk); }]);
        if (defined('CURLPROTO_HTTPS')) curl_setopt($ch, CURLOPT_PROTOCOLS, CURLPROTO_HTTPS);
        $ok = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
        if ($ok === false) return null;
        if ($code >= 300 && $code < 400 && $loc !== '') { $url = hub_url_join($url, $loc); continue; }
        return [$code, $buf];
    }
    return null;
}
/**
 * GET from another website over http or https, public internet only: Home's pictures and Links' icons and titles (1.53.2; each
 * had its own copy before). Every redirect hop is checked and pinned like the first address, so a public address can never
 * bounce the server onto your own network. Options:
 *   headers  extra request headers         ua       User-Agent                 hops     addresses tried in all (5)
 *   max      bytes kept (2 MB)             timeout  seconds in all (12)        connect  seconds to connect (6)
 *   save     a file: the answer is written there as it arrives (never held in memory); 'body' is then ''
 *   stop     text: stop reading once it has arrived (a page's </head>)
 *   cut      true: an answer longer than max is cut there instead of failing
 *   insecure true: on an https certificate problem try once more without checking it (some hosts ship no CA list).
 *            Never when the address carries a key or token, so a key is never sent where the site might not be the real one.
 * Returns ['status', 'body', 'url' (the last hop), 'type'] or ['error' => message, 'url'].
 */
function hub_fetch(string $url, array $o = []): array {
    $max = (int)($o['max'] ?? 2000000); $save = $o['save'] ?? null; $stop = $o['stop'] ?? null;
    $headers = $o['headers'] ?? []; if (isset($o['ua'])) $headers[] = 'User-Agent: ' . $o['ua'];
    $hops = (int)($o['hops'] ?? 5);
    for ($hop = 0; $hop < $hops; $hop++) {
        $p = parse_url($url);
        if (!$p || !in_array(strtolower($p['scheme'] ?? ''), ['http', 'https'], true) || empty($p['host'])) return ['error' => 'Bad address', 'url' => $url];
        // an address different parsers read differently (a backslash, a space, "user@"): refused, with or without cURL
        if (strpos($url, '\\') !== false || preg_match('~[\x00-\x20\x7F]~', $url) || preg_match('~^[a-z][a-z0-9+.-]*://[^/?#]*@~i', $url) || !hub_fetch_host_ok($p)) return ['error' => 'Can\'t reach ' . $p['host'], 'url' => $url];
        $status = 0; $body = ''; $type = ''; $loc = '';
        if (function_exists('curl_init')) {
            $insecure = !empty($o['insecure']) && !preg_match('~[?&#](key|api_?key|apikey|client_id|token|access_token|auth|sig|signature)=~i', $url);
            $ok = false; $err = ''; $over = false; $stopped = false;
            for ($try = 0; $try < 2; $try++) {
                $fh = null; $body = ''; $got = 0; $over = false; $stopped = false; $loc = ''; $type = '';
                if ($save !== null && !($fh = @fopen($save, 'wb'))) return ['error' => 'Can\'t save the download (the temporary folder is not writable)', 'url' => $url];
                $ch = curl_init($url);
                if (!hub_fetch_pin($ch, $url, $p)) { curl_close($ch); if ($fh) fclose($fh); return ['error' => 'Can\'t reach ' . $p['host'], 'url' => $url]; }   // connect only to the address just checked
                curl_setopt_array($ch, [
                    CURLOPT_FOLLOWLOCATION => false, CURLOPT_CONNECTTIMEOUT => (int)($o['connect'] ?? 6), CURLOPT_TIMEOUT => (int)($o['timeout'] ?? 12),
                    CURLOPT_HTTPHEADER => $headers, CURLOPT_ENCODING => '',
                    CURLOPT_SSL_VERIFYPEER => $try === 0, CURLOPT_SSL_VERIFYHOST => $try === 0 ? 2 : 0,
                    CURLOPT_HEADERFUNCTION => function ($c, $h) use (&$loc, &$type) {
                        if (stripos($h, 'location:') === 0) $loc = trim(substr($h, 9));
                        if (stripos($h, 'content-type:') === 0) $type = trim(substr($h, 13));
                        return strlen($h);
                    },
                    CURLOPT_WRITEFUNCTION => function ($c, $chunk) use (&$body, &$got, &$over, &$stopped, $fh, $max, $stop) {
                        $n = strlen($chunk);
                        if ($got + $n > $max) { $over = true; $chunk = substr($chunk, 0, max(0, $max - $got)); }
                        $got += strlen($chunk);
                        if ($fh) fwrite($fh, $chunk);
                        else {
                            $from = max(0, strlen($body) - 16); $body .= $chunk;
                            if ($stop !== null && stripos($body, $stop, $from) !== false) { $stopped = true; return 0; }   // got what is needed
                        }
                        return $over ? 0 : $n;
                    },
                ]);
                $ok = curl_exec($ch); $errno = curl_errno($ch); $err = curl_error($ch);
                $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE); curl_close($ch);
                if ($fh) fclose($fh);
                if ($try === 0 && $insecure && in_array($errno, [35, 51, 58, 60, 77, 83], true)) continue;   // certificate trouble: once more without checking
                break;
            }
            if ($over && empty($o['cut'])) return ['error' => 'The answer is larger than ' . round($max / 1048576, 1) . ' MB', 'url' => $url];
            if ($ok === false && !$over && !$stopped) return ['error' => $err ?: 'Connection failed', 'url' => $url];
        } elseif (ini_get('allow_url_fopen')) {
            $ctx = stream_context_create(['http' => ['header' => implode("\r\n", $headers), 'follow_location' => 0, 'timeout' => (int)($o['timeout'] ?? 12), 'ignore_errors' => true]]);
            $in = @fopen($url, 'rb', false, $ctx);
            if (!$in) return ['error' => 'Connection failed', 'url' => $url];
            $meta = stream_get_meta_data($in);
            if ($save !== null) {
                $fh = @fopen($save, 'wb');
                if (!$fh) { fclose($in); return ['error' => 'Can\'t save the download (the temporary folder is not writable)', 'url' => $url]; }
                stream_copy_to_stream($in, $fh, $max); fclose($fh);
            } else $body = (string)stream_get_contents($in, $max);
            fclose($in);
            foreach ($meta['wrapper_data'] ?? [] as $h) {
                if (!is_string($h)) continue;
                if (preg_match('~^HTTP/\S+\s+(\d+)~', $h, $m)) { $status = (int)$m[1]; $loc = ''; }
                elseif (stripos($h, 'location:') === 0) $loc = trim(substr($h, 9));
                elseif (stripos($h, 'content-type:') === 0) $type = trim(substr($h, 13));
            }
        } else return ['error' => 'Your host blocks outgoing connections (enable the curl extension)', 'url' => $url];
        if ($status >= 300 && $status < 400 && $loc !== '') { $url = hub_url_join($url, $loc); continue; }
        return ['status' => $status, 'body' => $body, 'url' => $url, 'type' => $type];
    }
    return ['error' => 'Too many redirects', 'url' => $url];
}
/** hub_fetch's address check. Only the unit test's own small server can count as public, while that test runs (HUB_TEST_PUBLIC). */
function hub_fetch_test_host(array $p): bool {
    return defined('HUB_TEST_PUBLIC') && in_array(strtolower((string)$p['host']) . ':' . ($p['port'] ?? ''), (array)constant('HUB_TEST_PUBLIC'), true);
}
function hub_fetch_host_ok(array $p): bool { return hub_fetch_test_host($p) || (bool)hub_public_ips((string)$p['host']); }
function hub_fetch_pin($ch, string $url, array $p): bool {
    if (hub_fetch_test_host($p)) { if (defined('CURLPROTO_HTTP')) curl_setopt($ch, CURLOPT_PROTOCOLS, CURLPROTO_HTTP | CURLPROTO_HTTPS); return true; }
    return hub_curl_pin($ch, $url);
}
/** An SVG icon is only kept when nothing in it can run code or load other files. */
function hub_svg_safe(string $b): bool {
    if (strlen($b) > 600000) return false;
    if (preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', $b)) return false;   // control characters are never in a real SVG, and can split a keyword past this filter
    $x = preg_replace('/\s+/', ' ', $b);
    // an event handler can follow a space, "/" or a closing quote (browsers' HTML parser accepts all three); url() may only point inside the file or at an embedded image
    return !preg_match('~<script|<foreignobject|<iframe|<embed|<object|<handler|<listener|<!entity|<!doctype(?! svg)|<\?xml-stylesheet|'
        . '[\s/"\']on[a-z]+\s*=|javascript:|vbscript:|data:text|&#|<set\b|<animate|<use\b|@import|expression\s*\(|'
        . 'url\(\s*+["\']?+\s*+(?!#|data:image/(?:png|jpe?g|gif|webp);)|'
        . 'href\s*+=\s*+["\']?+\s*+(?!#|data:image/(?:png|jpe?g|gif|webp);)~i', $x);
}

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
    $o['look']     = (bool)($in['look'] ?? true);
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
    $lk = @fopen(hub_dir('core') . '/settings.lock', 'c');
    if ($lk) flock($lk, LOCK_EX);
    unset($GLOBALS['__hub_settings']);   // read fresh
    try { $s = hub_settings_save($fn(hub_settings())); }
    finally { if ($lk) { flock($lk, LOCK_UN); fclose($lk); } }
    return $s;
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
    $o = ['v' => HUB, 'admin' => $admin, 'setup' => hub_auth() === null,
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
