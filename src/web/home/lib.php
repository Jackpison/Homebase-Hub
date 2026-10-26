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

require_once __DIR__ . '/config.php';

require_once __DIR__ . '/../hub/core/lib/boot.php';   // Hub: shared login + private data folder
define('DATA_DIR', hub_dir('home'));
const SITE_FILE  = DATA_DIR . '/site.json';
const POOL_FILE  = DATA_DIR . '/photos.json';
const CACHE_DIR  = DATA_DIR . '/cache';
const LOCK_FILE  = DATA_DIR . '/refill.lock';
const UPLOAD_DIR = HUB_MEDIA . '/home/uploads';   // your own pictures and videos live in web/hub/media (before 1.29.3 they sat next to the page)
const ICON_DIR   = HUB_MEDIA . '/home/icons';
const PHOTO_DIR  = HUB_MEDIA . '/home/photos';
/** An address, from the start page, for a saved file: "photos/x.jpg" is stored that way, the page finds it in web/hub/media/home. */
function media_url(string $u): string { return preg_match('~^(photos|uploads|icons)/~', $u) ? '../hub/media/home/' . $u : $u; }

const BG_TYPES = [
    'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp',
    'image/gif'  => 'gif', 'image/avif' => 'avif',
    'video/mp4'  => 'mp4', 'video/webm' => 'webm',
];
const PHOTO_TYPES = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];

/* Background sources. kw = uses your keywords, key = which API key it needs, video = clips instead of photos. */
const SOURCES = [
    'picsum'        => ['name' => 'Lorem Picsum',                 'about' => 'Random photos'],
    'bing'          => ['name' => 'Bing daily wallpapers',        'about' => 'The latest Bing homepage photos'],
    'wikimedia'     => ['name' => 'Wikimedia picture of the day', 'about' => 'Award-winning photos from Wikimedia Commons'],
    'wallhaven'     => ['name' => 'Wallhaven',                    'about' => 'Community wallpapers matching your keywords', 'kw' => true],
    'unsplash'      => ['name' => 'Unsplash',                     'about' => 'Photos matching your keywords', 'kw' => true, 'key' => 'unsplash'],
    'pixabay'       => ['name' => 'Pixabay photos',               'about' => 'Photos matching your keywords. 1280px, a little soft on big screens', 'kw' => true, 'key' => 'pixabay'],
    'pixabay_video' => ['name' => 'Pixabay videos',               'about' => 'Short looping clips matching your keywords', 'kw' => true, 'key' => 'pixabay', 'video' => true],
];
const API_KEYS = [
    'unsplash' => ['name' => 'Unsplash', 'url' => 'https://unsplash.com/oauth/applications', 'help' => 'Create an app, then copy its Access Key.'],
    'pixabay'  => ['name' => 'Pixabay',  'url' => 'https://pixabay.com/api/docs/',          'help' => 'Log in; your key is shown on that page. Used for photos and videos.'],
];
const ROTATE_CHOICES = [0, 1, 5, 15, 30];
const BG_REMEMBER = 30;   // each browser remembers this many backgrounds it showed last, and shows them again only when nothing else is left
const WELCOME_DEFAULT = 'Welcome Home';
/* The Starter theme: backgrounds that come with the app (web/home/starter/), in the order a new site shows them.
   An entry may be a video with a 'poster' (its still picture); the owner chose photos only, to keep updates small (25 Oct 2026). */
const STARTER = [
    ['file' => 'mountains.jpg',      'type' => 'image', 'credit' => 'Photo from Unsplash', 'poster' => ''],
    ['file' => 'abstract.webp',      'type' => 'image', 'credit' => 'Photo from Unsplash', 'poster' => ''],
    ['file' => 'forest-lake.jpg',    'type' => 'image', 'credit' => 'Photo from Unsplash', 'poster' => ''],
];
const THEMES = ['starter', 'online'];   // and "t:<id>" for a theme you made from your uploads
const MAX_THEMES = 8;
const MAX_THEME_ITEMS = 60;

/* ================= storage ================= */

function ensure_dir(string $dir): void
{
    if (!is_dir($dir)) mkdir($dir, 0755, true);
}
function read_json(string $file): ?array
{
    $j = json_decode(hub_jraw($file), true);   // data files are guarded .php files (old plain .json is still read)
    return is_array($j) ? $j : null;
}
function write_json(string $file, array $data): void
{
    ensure_dir(dirname($file));
    if (substr($file, 0, strlen(DATA_DIR)) === DATA_DIR && substr($file, -5) === '.json' && strpos($file, '/cache/') === false) {
        hub_jput($file, json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE));
        return;
    }
    $tmp = $file . '.' . bin2hex(random_bytes(4)) . '.tmp';
    file_put_contents($tmp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE), LOCK_EX);
    rename($tmp, $file);
}
function new_id(): string
{
    return bin2hex(random_bytes(5));
}

function default_site(): array
{
    return [
        'title'   => 'Home',
        'icon'    => '',
        'linksMoved' => 0,   // when Home's old links (up to 1.50) were copied to Links; 1.53 removed Home's own copy
        'bg' => [
            'sources'      => ['picsum' => true, 'bing' => true, 'wikimedia' => true, 'wallhaven' => true, 'unsplash' => false, 'pixabay' => false, 'pixabay_video' => false],
            'keys'         => ['unsplash' => '', 'pixabay' => ''],
            'query'        => 'mountains, ocean, forest',
            'uploadChance' => 0.35,
            'videoChance'  => 0.3,
            'dim'          => 0.25,
            'motion'       => true,
            'rotate'       => 0,
            'custom'       => [],
            'theme'        => 'starter',   // a new site starts with the Starter theme; sites from before 1.48.9 keep Online Photos
            'starterOff'   => false,
            'themes'       => [],          // your own themes: [{id, name, items: ['uploads/…']}]
        ],
        'panel' => ['opacity' => 0.40, 'blur' => 22, 'tint' => 'light'],
        'welcome' => WELCOME_DEFAULT,
        'widgets' => clean_widgets([]),
    ];
}
function load_site(): array
{
    $s = read_json(SITE_FILE);
    return $s ? clean_site($s) : default_site();
}

/* ================= text helpers ================= */

function str_clip($v, int $max): string
{
    $v = trim(preg_replace('/\s+/u', ' ', (string) $v) ?? '');
    if (function_exists('mb_substr')) return mb_substr($v, 0, $max);
    preg_match('/^.{0,' . $max . '}/us', $v, $m);
    return $m[0] ?? '';
}
function clean_url($v): ?string
{
    $v = trim((string) $v);
    if ($v === '') return null;
    if (!preg_match('~^https?://~i', $v)) $v = 'https://' . $v;
    if (!filter_var($v, FILTER_VALIDATE_URL)) return null;
    return in_array(strtolower((string) parse_url($v, PHP_URL_SCHEME)), ['http', 'https'], true) ? $v : null;
}
function is_icon_path($v): bool
{
    return is_string($v) && (bool) preg_match('~^icons/[a-f0-9]{16}\.(png|jpg|gif|webp|ico)$~', $v);
}
/** "mountains, ocean forest" → ["mountains", "ocean forest"] (max MAX_KEYWORDS). */
function keywords(string $q): array
{
    $out = [];
    foreach (explode(',', $q) as $k) {
        $k = str_clip($k, 40);
        if ($k !== '' && !in_array(strtolower($k), array_map('strtolower', $out), true)) $out[] = $k;
        if (count($out) >= MAX_KEYWORDS) break;
    }
    return $out ?: ['landscape'];
}

/* ================= sanitizing the whole site ================= */

/** One of Home's old links (up to 1.50), made safe: only read to copy it to Links once (home_move_links). */
function clean_link($l): ?array
{
    if (!is_array($l)) return null;
    $url  = clean_url($l['url'] ?? '');
    $name = str_clip($l['name'] ?? '', 60);
    if (!$url) return null;
    if ($name === '') $name = (string) parse_url($url, PHP_URL_HOST);
    $id = preg_match('/^[a-z0-9]{1,16}$/', (string) ($l['id'] ?? '')) ? $l['id'] : new_id();

    $ic   = is_array($l['icon'] ?? null) ? $l['icon'] : [];
    $type = in_array($ic['type'] ?? '', ['auto', 'emoji', 'image'], true) ? $ic['type'] : 'auto';
    $val  = '';
    if ($type === 'emoji') $val = str_clip($ic['value'] ?? '', 8);
    if ($type === 'image') $val = is_icon_path($ic['value'] ?? '') ? $ic['value'] : '';
    if ($type !== 'auto' && $val === '') $type = 'auto';
    return ['id' => $id, 'name' => $name, 'url' => $url, 'icon' => ['type' => $type, 'value' => $val]];
}

function clean_site(array $in): array
{
    $def = default_site();
    $b = is_array($in['bg'] ?? null) ? $in['bg'] : [];
    $sources = [];
    foreach (SOURCES as $k => $_) $sources[$k] = (bool) ($b['sources'][$k] ?? $def['bg']['sources'][$k]);
    foreach (is_array($b['sources'] ?? null) ? $b['sources'] : [] as $k => $v) {
        if (preg_match('/^c[a-z0-9]{4,12}$/', (string) $k)) $sources[$k] = (bool) $v;   // custom sources
    }
    $keys = [];
    foreach (API_KEYS as $k => $_) {
        $keys[$k] = substr(preg_replace('/[^A-Za-z0-9_\-]/', '', (string) ($b['keys'][$k] ?? '')) ?? '', 0, 120);
    }
    $rotate = (int) ($b['rotate'] ?? 0);
    $custom = [];
    foreach (array_slice(is_array($b['custom'] ?? null) ? $b['custom'] : [], 0, MAX_CUSTOM_SOURCES) as $c) {
        if ($cc = clean_custom($c)) $custom[] = $cc;
    }
    $pn = is_array($in['panel'] ?? null) ? $in['panel'] : [];
    return [
        'title'   => str_clip($in['title'] ?? $def['title'], 80) ?: 'Home',
        'icon'    => is_icon_path($in['icon'] ?? '') ? $in['icon'] : '',
        'bg'      => [
            'sources'      => $sources,
            'keys'         => $keys,
            'query'        => implode(', ', keywords((string) ($b['query'] ?? $def['bg']['query']))),
            'uploadChance' => max(0, min(1, (float) ($b['uploadChance'] ?? $def['bg']['uploadChance']))),
            'videoChance'  => max(0, min(1, (float) ($b['videoChance'] ?? $def['bg']['videoChance']))),
            'dim'          => max(0, min(0.8, (float) ($b['dim'] ?? $def['bg']['dim']))),
            'motion'       => (bool) ($b['motion'] ?? true),
            'rotate'       => in_array($rotate, ROTATE_CHOICES, true) ? $rotate : 0,
            'custom'       => $custom,
            'starterOff'   => $starterOff = (bool) ($b['starterOff'] ?? false),
            'themes'       => $themes = clean_themes($b['themes'] ?? []),
            'theme'        => theme_ok((string) ($b['theme'] ?? ''), $starterOff, $themes) ? (string) $b['theme'] : 'online',
        ],
        'panel' => [
            'opacity' => max(0, min(1, (float) ($pn['opacity'] ?? $def['panel']['opacity']))),
            'blur'    => max(0, min(40, (int) ($pn['blur'] ?? $def['panel']['blur']))),
            'tint'    => in_array($pn['tint'] ?? '', GLASS_TINTS, true) ? $pn['tint'] : 'light',   // 1.51.2: Light (see-through), Dark or Solid
        ],
        // the words that fade in the middle when Home opens; empty = none (a site saved before 1.49 gets the default)
        'welcome' => array_key_exists('welcome', $in) ? str_clip($in['welcome'], 80) : WELCOME_DEFAULT,
        'linksMoved' => max(0, (int) ($in['linksMoved'] ?? 0)),
        'widgets' => clean_widgets($in['widgets'] ?? []),
    ];
}

/** What the page sends when you save, made safe: the "moved" mark of Home's old links always stays as saved on the server. */
function site_from_page(array $in, array $cur): array
{
    $in['linksMoved'] = $cur['linksMoved'];
    return clean_site($in);
}

/* ================= widgets (1.51) ================= */

/** The widgets Home can show, in their default order. Private ones load their data only for a logged-in browser. */
const WIDGET_IDS = ['today', 'countdown', 'note', 'tools', 'calendar', 'pad', 'quote', 'worldclock', 'weather'];
// Weather stays off until you turn it on and type your town: only then does your server ask Open-Meteo for the forecast.
const WIDGET_ON  = ['today' => true, 'countdown' => true, 'note' => true, 'tools' => true, 'calendar' => true, 'pad' => false,
                    'quote' => true, 'worldclock' => false, 'weather' => false];
const WORLD_CLOCKS = 3;                     // places in World Clock
const WIDGET_STYLES = ['dock', 'glance'];
const GLASS_TINTS = ['light', 'dark', 'solid'];   // Home Settings > Glass > Tint   // Glass Dock, or Glance and Expand
const PAD_MAX = 20000;                      // characters kept in the Scratch Pad

/** Home's widget settings, cleaned: a style, the clock on or off, every known widget once (in your order, unknown ones dropped,
 *  missing ones added at the end), the countdown (a name and a date) and the pinned note (an Info tab and box). */
function clean_widgets($in): array
{
    $in = is_array($in) ? $in : [];
    $list = []; $seen = [];
    foreach (is_array($in['list'] ?? null) ? $in['list'] : [] as $w) {
        $id = is_array($w) ? (string) ($w['id'] ?? '') : '';
        if (!in_array($id, WIDGET_IDS, true) || isset($seen[$id])) continue;
        $seen[$id] = true; $list[] = ['id' => $id, 'on' => (bool) ($w['on'] ?? false)];
    }
    foreach (WIDGET_IDS as $id) if (!isset($seen[$id])) $list[] = ['id' => $id, 'on' => WIDGET_ON[$id]];
    $cd = is_array($in['countdown'] ?? null) ? $in['countdown'] : [];
    $date = (string) ($cd['date'] ?? '');
    $okDate = preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $date, $m) && checkdate((int) $m[2], (int) $m[3], (int) $m[1]);
    $nt = is_array($in['note'] ?? null) ? $in['note'] : [];
    $idOk = fn($v) => is_string($v) && preg_match('/^[A-Za-z0-9_-]{1,40}$/', $v) ? $v : '';
    $zones = [];
    foreach (is_array($in['zones'] ?? null) ? $in['zones'] : [] as $z) {
        $tz = is_array($z) ? (string) ($z['tz'] ?? '') : '';
        if (count($zones) < WORLD_CLOCKS && preg_match('~^(UTC|[A-Z][A-Za-z_]+(/[A-Za-z0-9_+-]+){1,2})$~', $tz))
            $zones[] = ['tz' => $tz, 'name' => str_clip($z['name'] ?? '', 30)];
    }
    $we = is_array($in['weather'] ?? null) ? $in['weather'] : [];
    return [
        'style'     => in_array($in['style'] ?? '', WIDGET_STYLES, true) ? $in['style'] : 'dock',
        'show'      => (bool) ($in['show'] ?? true),   // Widgets > Show Widgets (1.51.1): off hides every widget; the clock has its own switch
        'clock'     => (bool) ($in['clock'] ?? true),
        'list'      => $list,
        'countdown' => ['name' => str_clip($cd['name'] ?? '', 40), 'date' => $okDate ? $date : ''],
        'note'      => ['tab' => $idOk($nt['tab'] ?? ''), 'box' => $idOk($nt['box'] ?? '')],
        'zones'     => $zones,
        'weather'   => ['town' => str_clip(preg_replace('/\s+/u', ' ', (string) ($we['town'] ?? '')) ?? '', 60), 'unit' => ($we['unit'] ?? '') === 'f' ? 'f' : 'c'],
    ];
}

/* ---------- Weather (off until you turn it on) ----------
   Your server, not the browser, asks Open-Meteo (free, no key): once to find the town, then for the forecast at most every
   30 minutes. Nothing is asked while Weather is off or has no town. The answer is kept in site-data/home/weather.php. */
const WEATHER_TTL = 1800;
function weather_file(): string { return DATA_DIR . '/weather.json'; }
/** WMO weather codes (Open-Meteo) in plain words, and which picture: sun, partly, cloud, fog, rain, snow, storm. */
function weather_text(int $c): array
{
    return match (true) {
        $c === 0 => ['Clear', 'sun'], $c === 1 => ['Mostly clear', 'sun'], $c === 2 => ['Partly cloudy', 'partly'], $c === 3 => ['Cloudy', 'cloud'],
        $c === 45 || $c === 48 => ['Fog', 'fog'],
        $c >= 51 && $c <= 57 => ['Drizzle', 'rain'], $c >= 61 && $c <= 67 => ['Rain', 'rain'], $c >= 80 && $c <= 82 => ['Showers', 'rain'],
        $c >= 71 && $c <= 77 || $c === 85 || $c === 86 => ['Snow', 'snow'],
        $c >= 95 => ['Thunderstorm', 'storm'],
        default => ['Unknown', 'cloud'],
    };
}
/** The place from Open-Meteo's geocoding answer: ['name', 'lat', 'lon'], or null when the town was not found. */
function weather_parse_place(string $json): ?array
{
    $r = json_decode($json, true)['results'][0] ?? null;
    if (!is_array($r) || !is_numeric($r['latitude'] ?? null) || !is_numeric($r['longitude'] ?? null)) return null;
    $name = implode(', ', array_filter([str_clip($r['name'] ?? '', 60), str_clip($r['admin1'] ?? '', 60) ?: str_clip($r['country'] ?? '', 60)]));
    return ['name' => $name, 'lat' => round((float) $r['latitude'], 3), 'lon' => round((float) $r['longitude'], 3)];
}
/** Now and the next three days from Open-Meteo's forecast answer, or null when it is not a forecast. */
function weather_parse_forecast(string $json): ?array
{
    $j = json_decode($json, true);
    $cur = $j['current'] ?? null; $d = $j['daily'] ?? null;
    if (!is_array($cur) || !is_numeric($cur['temperature_2m'] ?? null) || !is_array($d) || !is_array($d['time'] ?? null)) return null;
    $days = [];
    foreach (array_slice($d['time'], 0, 3) as $i => $t) {
        if (!is_string($t) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $t)) continue;
        [$text, $pic] = weather_text((int) ($d['weather_code'][$i] ?? -1));
        $days[] = ['date' => $t, 'max' => (int) round((float) ($d['temperature_2m_max'][$i] ?? 0)), 'min' => (int) round((float) ($d['temperature_2m_min'][$i] ?? 0)), 'text' => $text, 'pic' => $pic];
    }
    [$text, $pic] = weather_text((int) ($cur['weather_code'] ?? -1));
    return ['temp' => (int) round((float) $cur['temperature_2m']), 'text' => $text, 'pic' => $pic, 'day' => !empty($cur['is_day']), 'days' => $days];
}
/**
 * The weather for Home's widget. $w is the widget setting {town, unit}; $fetch(url) returns the body or null (tests pass their own).
 * A fresh saved answer is used as it is; when Open-Meteo can't be reached, an older one is shown with 'stale'.
 */
function weather_get(array $w, ?callable $fetch = null): array
{
    $town = (string) ($w['town'] ?? ''); $unit = ($w['unit'] ?? 'c') === 'f' ? 'f' : 'c';
    if ($town === '') return ['error' => 'Type your town in Edit › Settings › Widgets.'];
    $key = mb_strtolower($town) . '|' . $unit;
    $cache = read_json(weather_file()) ?? [];
    if (($cache['key'] ?? '') === $key && is_array($cache['data'] ?? null) && (int) ($cache['saved'] ?? 0) > time() - WEATHER_TTL) return $cache['data'];
    $fetch ??= function (string $url): ?string { $r = http_get($url, ['Accept: application/json'], 300_000, 10); return isset($r['error']) || $r['status'] !== 200 ? null : $r['body']; };
    $old = fn(string $why) => ($cache['key'] ?? '') === $key && is_array($cache['data'] ?? null) ? $cache['data'] + ['stale' => true] : ['error' => $why];
    $place = ($cache['town'] ?? '') === mb_strtolower($town) && is_array($cache['place'] ?? null) ? $cache['place'] : null;
    if (!$place) {
        $body = $fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=' . rawurlencode($town));
        if ($body === null) return $old('Couldn\'t reach Open-Meteo. Try again later.');
        $place = weather_parse_place($body);
        if (!$place) return ['error' => 'Open-Meteo doesn\'t know the town "' . $town . '". Check the spelling in Edit › Settings › Widgets.'];
    }
    $body = $fetch('https://api.open-meteo.com/v1/forecast?latitude=' . $place['lat'] . '&longitude=' . $place['lon']
        . '&current=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=3'
        . ($unit === 'f' ? '&temperature_unit=fahrenheit' : ''));
    $fc = $body === null ? null : weather_parse_forecast($body);
    if (!$fc) return $old('Couldn\'t get the forecast from Open-Meteo. Try again later.');
    $data = $fc + ['place' => $place['name'], 'unit' => $unit === 'f' ? '°F' : '°C', 'saved' => time()];
    write_json(weather_file(), ['key' => $key, 'town' => mb_strtolower($town), 'place' => $place, 'saved' => time(), 'data' => $data]);
    return $data;
}

/** The Scratch Pad: one text, saved by itself while you type (logged in only; stored in site-data/home/pad.php). */
function pad_file(): string { return DATA_DIR . '/pad.json'; }
function pad_read(): array
{
    $p = hub_jread(pad_file()) ?? [];
    return ['text' => is_string($p['text'] ?? null) ? $p['text'] : '', 'saved' => (int) ($p['saved'] ?? 0)];
}
function pad_write(string $text): array
{
    $text = function_exists('mb_substr') ? mb_substr($text, 0, PAD_MAX) : substr($text, 0, PAD_MAX);
    $p = ['text' => str_replace("\r\n", "\n", $text), 'saved' => time()];
    if (!hub_jput(pad_file(), json_encode($p, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE))) throw new RuntimeException('Could not save the Scratch Pad (check the folder permissions).');
    return $p;
}

/**
 * Home's links move to Links (1.51): the first time Home loads after the update, every link of Home's two columns is copied once
 * into a "From Home" category at the top of the first tab of Links that is not encrypted (a new tab "From Home" when there is
 * none). Links keeps an earlier version first; uploaded icons are copied to Links' icons; then Home's own copy is removed from
 * site.json (since 1.53; 1.51 and 1.52 kept it, and a site that moved them then loses that copy here, once) and the move is marked
 * (linksMoved). Nothing is lost if anything goes wrong: then nothing is written and it tries again. A 1.50 site that updates
 * straight to 1.53 or later still gets its links moved.
 * Returns how many links were copied (0 when there was nothing to do).
 */
function home_move_links(): int
{
    $raw = read_json(SITE_FILE);
    if (!$raw) return 0;
    if (!empty($raw['linksMoved'])) {   // moved by 1.51 or 1.52: their copy goes now
        if (array_key_exists('columns', $raw)) { unset($raw['columns']); write_json(SITE_FILE, $raw); }
        return 0;
    }
    $links = [];
    foreach (is_array($raw['columns'] ?? null) ? $raw['columns'] : [] as $col)
        foreach (is_array($col) ? $col : [] as $l) if (count($links) < 50 && ($cl = clean_link($l))) $links[] = $cl;
    if (!$links) { $raw['linksMoved'] = time(); unset($raw['columns']); write_json(SITE_FILE, $raw); return 0; }

    $dir = hub_dir('links'); $file = $dir . '/bookmarks.php';
    $lk = @fopen($dir . '/links.lock', 'c'); if (!$lk) return 0;
    flock($lk, LOCK_EX);
    try {
        $data = is_file($file) ? hub_read_guarded($file) : ['settings' => new stdClass(), 'tabs' => []];
        if (!is_array($data) || !is_array($data['tabs'] ?? null)) return 0;   // unreadable: never write over it
        $out = [];
        foreach ($links as $l) {
            $one = ['title' => $l['name'], 'url' => $l['url']];
            if ($l['icon']['type'] === 'image' && is_icon_path($l['icon']['value'])) {
                $name = basename($l['icon']['value']); $to = HUB_MEDIA . '/links/icons';
                if (!is_dir($to)) @mkdir($to, 0755, true);
                if (is_file(ICON_DIR . '/' . $name) && (is_file($to . '/' . $name) || @copy(ICON_DIR . '/' . $name, $to . '/' . $name))) $one['icon'] = 'icons/' . $name;
            }
            $out[] = $one;
        }
        $t = null;
        foreach ($data['tabs'] as $i => $tab) if (is_array($tab) && empty($tab['enc']) && is_array($tab['categories'] ?? null)) { $t = $i; break; }
        if ($t === null) { $data['tabs'][] = ['id' => 'fromhome', 'title' => 'From Home', 'categories' => []]; $t = count($data['tabs']) - 1; }
        $have = [];
        foreach ($data['tabs'][$t]['categories'] as $c) foreach (is_array($c['links'] ?? null) ? $c['links'] : [] as $x) $have[(string) ($x['url'] ?? '')] = true;
        $out = array_values(array_filter($out, fn($x) => !isset($have[$x['url']])));   // already in that tab: not twice
        if ($out) {
            if (is_file($file)) {   // an earlier version first, like every save of Links
                $bd = $dir . '/backups'; if (!is_dir($bd)) @mkdir($bd, 0700, true);
                if (!@copy($file, hub_version_path($bd, 'bookmarks-'))) return 0;
            }
            array_unshift($data['tabs'][$t]['categories'], ['id' => 'fromhome' . substr(new_id(), 0, 4), 'title' => 'From Home', 'col' => 0, 'links' => $out]);
            if (!hub_write_guarded($file, $data)) return 0;
        }
    } finally { flock($lk, LOCK_UN); fclose($lk); }
    $raw['linksMoved'] = time(); unset($raw['columns']);
    write_json(SITE_FILE, $raw);
    return count($out);
}

/* ================= custom sources ================= */

/** A custom source: a JSON API (list of photos) or an address that returns a different image each time. */
function clean_custom($c): ?array
{
    if (!is_array($c)) return null;
    $path = fn($v) => substr(preg_replace('/[^A-Za-z0-9_.\-]/', '', (string) $v) ?? '', 0, 80);
    $url = trim((string) ($c['url'] ?? ''));
    $test = str_replace(['{keyword}', '{random}', '{page}', '{width}'], ['x', '1', '1', '1'], $url);
    if (!clean_url($test) || !preg_match('~^https?://~i', $url)) return null;
    $headers = [];
    foreach (preg_split('/\r?\n/', (string) ($c['headers'] ?? '')) as $line) {
        if (preg_match('/^\s*([A-Za-z0-9\-]{1,60})\s*:\s*([^\r\n]{1,400})$/', $line, $m)) $headers[] = $m[1] . ': ' . trim($m[2]);
        if (count($headers) >= 6) break;
    }
    $id = preg_match('/^[a-z0-9]{4,12}$/', (string) ($c['id'] ?? '')) ? $c['id'] : substr(new_id(), 0, 8);
    return [
        'id'      => $id,
        'name'    => str_clip($c['name'] ?? '', 40) ?: 'Custom source',
        'kind'    => ($c['kind'] ?? '') === 'image' ? 'image' : 'json',
        'url'     => substr($url, 0, 600),
        'headers' => implode("\n", $headers),
        'list'    => $path($c['list'] ?? ''),
        'image'   => $path($c['image'] ?? ''),
        'credit'  => $path($c['credit'] ?? ''),
        'link'    => $path($c['link'] ?? ''),
        'type'    => ($c['type'] ?? '') === 'video' ? 'video' : 'image',
    ];
}

/** Built-in sources plus the custom ones, in one list keyed by source id. */
function all_sources(array $site): array
{
    static $memo = [];   // asked many times per page: built once per set of custom sources
    $mk = md5(serialize($site['bg']['custom'] ?? []));
    if (isset($memo[$mk])) return $memo[$mk];
    if (count($memo) > 4) $memo = [];
    $all = SOURCES;
    foreach ($site['bg']['custom'] ?? [] as $c) {
        $all['c' . $c['id']] = [
            'name' => $c['name'], 'custom' => true,
            'about' => ($c['kind'] === 'image' ? 'Image address on ' : 'JSON API on ') . (parse_url(str_replace(['{keyword}', '{random}', '{page}', '{width}'], 'x', $c['url']), PHP_URL_HOST) ?: ''),
            'kw' => str_contains($c['url'], '{keyword}'), 'video' => $c['type'] === 'video',
        ];
    }
    return $memo[$mk] = $all;
}
function custom_def(string $src, array $site): ?array
{
    foreach ($site['bg']['custom'] ?? [] as $c) if ('c' . $c['id'] === $src) return $c;
    return null;
}

function source_ready(string $k, array $site): bool
{
    if (empty($site['bg']['sources'][$k])) return false;
    if (!isset(all_sources($site)[$k])) return false;
    if (!empty(SOURCES[$k]['key'])) return ($site['bg']['keys'][SOURCES[$k]['key']] ?? '') !== '';
    return true;
}
function ready_sources(array $site): array
{
    return array_values(array_filter(array_keys(all_sources($site)), fn($k) => source_ready($k, $site)));
}
function source_target(string $src, array $site): int
{
    return empty(all_sources($site)[$src]['video']) ? PHOTOS_PER_SOURCE : VIDEOS_PER_SOURCE;
}

/** True when some ready source has fewer saved photos than it should (and did not fail in the last 30 minutes). */
function pool_needs_refill(array $site, ?array $pool = null): bool
{
    $pool = $pool ?? pool_load();
    $bySrc = [];
    foreach ($pool['items'] as $i) $bySrc[$i['src'] ?? ''][] = $i;
    foreach (ready_sources($site) as $src) {
        $e = $pool['errors'][$src] ?? null;
        if ($e && ($e['time'] ?? 0) >= time() - 1800) continue;
        $mine = 0;
        foreach ($bySrc[$src] ?? [] as $i) if (pool_item_valid($i, $site)) $mine++;
        if ($mine < source_target($src, $site)) return true;
    }
    return false;
}

/** What visitors receive. No API keys, no admin details. */
function public_payload(): array
{
    $s = load_site();
    $ready = ready_sources($s);
    $pool = pool_load();
    $photos = [];
    $need = false;
    $bySrc = [];
    foreach ($pool['items'] as $i) $bySrc[$i['src'] ?? ''][] = $i;   // grouped once, not scanned again for every source
    foreach ($ready as $src) {
        $mine = array_values(array_filter($bySrc[$src] ?? [], fn($i) => pool_item_valid($i, $s)));
        $e = $pool['errors'][$src] ?? null;
        // short of photos, and not a source that failed in the last 30 minutes
        if (count($mine) < source_target($src, $s) && (!$e || ($e['time'] ?? 0) < time() - 1800)) $need = true;
        foreach ($mine as $i) $photos[] = pool_public($i);
    }
    $theme = $s['bg']['theme'] ?? 'online';
    $uploads = array_map(fn($u) => ['url' => $u['url'], 'type' => $u['type'], 'credit' => 'Your upload', 'own' => true], list_uploads());
    $own = theme_items($theme, $s['bg']['themes'] ?? [], $uploads);
    if ($theme !== 'online') { $photos = []; $need = false; }   // Starter and your own themes use only their own backgrounds: nothing is downloaded
    return [
        'title'   => $s['title'],
        'icon'    => '',   // no separate start page icon: the site logo is used
        'panel'   => $s['panel'],
        'welcome' => $s['welcome'] ?? WELCOME_DEFAULT,
        'clock'   => $s['widgets']['clock'],   // the big clock and greeting are for everyone; the widgets themselves are not
        'bg'      => [
            'uploadChance' => $s['bg']['uploadChance'],
            'videoChance'  => $s['bg']['videoChance'],
            'dim'          => $s['bg']['dim'],
            'motion'       => $s['bg']['motion'],
            'rotate'       => $s['bg']['rotate'],
            'theme'        => $theme,
            'own'          => $own,   // the theme's backgrounds, in order (empty for Online Photos)
            'photos'       => $photos,
            'refill'       => $need,
        ],
        'uploads'     => $uploads,
        'hasPassword' => hub_auth() !== null,
        'widgets'     => hub_admin() ? $s['widgets'] : null,   // which widgets, and their countdown and note: only for a logged-in browser
    ];
}

/* ================= which background next ================= */

/** Your own themes, cleaned: an id, a name, and uploads that still exist (a deleted upload drops out of every theme). */
function clean_themes($in): array
{
    $out = []; $ids = [];
    foreach (is_array($in) ? array_slice($in, 0, MAX_THEMES) : [] as $t) {
        if (!is_array($t) || !preg_match('/^[a-f0-9]{8}$/', (string) ($t['id'] ?? '')) || isset($ids[$t['id']])) continue;
        $items = [];
        foreach (is_array($t['items'] ?? null) ? $t['items'] : [] as $u) {
            if (is_string($u) && preg_match('~^uploads/[a-f0-9]{16}\.(jpg|png|webp|gif|avif|mp4|webm)$~', $u) && is_file(UPLOAD_DIR . '/' . substr($u, 8)) && !in_array($u, $items, true)) $items[] = $u;
            if (count($items) >= MAX_THEME_ITEMS) break;
        }
        $ids[$t['id']] = true;
        $out[] = ['id' => $t['id'], 'name' => str_clip($t['name'] ?? '', 40) ?: 'My Theme', 'items' => $items];
    }
    return $out;
}
/** Whether a theme value names one that exists: Starter (unless removed), Online Photos, or one of your own ("t:<id>"). */
function theme_ok(string $theme, bool $starterOff, array $themes): bool
{
    if ($theme === 'starter') return !$starterOff;
    if ($theme === 'online') return true;
    return str_starts_with($theme, 't:') && in_array(substr($theme, 2), array_column($themes, 'id'), true);
}
/** The backgrounds of the theme in use: Starter's own plus your uploads, or the uploads you chose for your theme. */
function theme_items(string $theme, array $themes, array $uploads): array
{
    if ($theme === 'starter') return array_merge(starter_list(), $uploads);
    if (!str_starts_with($theme, 't:')) return [];
    foreach ($themes as $t) if ('t:' . $t['id'] === $theme) {
        $byUrl = array_column($uploads, null, 'url');
        return array_values(array_filter(array_map(fn($u) => $byUrl[$u] ?? null, $t['items'])));
    }
    return [];
}

/** The Starter theme's backgrounds whose files are here (a video arrives one release after its still picture). */
function starter_list(): array
{
    $out = [];
    foreach (STARTER as $i) {
        if (!is_file(__DIR__ . '/starter/' . $i['file'])) continue;
        $o = ['url' => 'starter/' . $i['file'], 'type' => $i['type'], 'credit' => $i['credit'], 'link' => '', 'src' => 'starter'];
        if ($i['poster'] !== '' && is_file(__DIR__ . '/starter/' . $i['poster'])) $o['poster'] = 'starter/' . $i['poster'];
        $out[] = $o;
    }
    return $out;
}

/** A short tag for a background's address (FNV-1a, 32 bits, hex). app.js has the same one (bgTag), so both remember the same pictures. */
function bg_tag(string $url): string
{
    $h = 0x811c9dc5;
    foreach (unpack('C*', $url) ?: [] as $b) { $h ^= $b; $h = ($h * 0x01000193) & 0xFFFFFFFF; }
    return dechex($h);
}
/** The tags in the hl_seen cookie (oldest first, newest last), at most BG_REMEMBER. */
function bg_seen_list(string $cookie): array
{
    $t = array_values(array_filter(explode('.', $cookie), fn($x) => (bool) preg_match('/^[0-9a-f]{1,8}$/', $x)));
    return array_slice($t, -BG_REMEMBER);
}
/** A background from $list this browser has not seen lately; when it has seen them all, the one it saw longest ago. */
function bg_pick_fresh(array $list, array $seen): ?array
{
    if (!$list) return null;
    $pos = array_flip($seen);
    $fresh = array_values(array_filter($list, fn($i) => !isset($pos[bg_tag((string) $i['url'])])));
    if ($fresh) return $fresh[array_rand($fresh)];
    usort($list, fn($a, $b) => $pos[bg_tag((string) $a['url'])] <=> $pos[bg_tag((string) $b['url'])]);
    return $list[0];
}

/* ================= files ================= */

function detect_mime(string $path): string
{
    $head = (string) file_get_contents($path, false, null, 0, 16);
    if (substr($head, 0, 4) === "\x00\x00\x01\x00") return 'image/x-icon';
    if (class_exists('finfo')) return (string) (new finfo(FILEINFO_MIME_TYPE))->file($path);
    if (function_exists('mime_content_type')) return (string) mime_content_type($path);
    $img = @getimagesize($path);
    if ($img && !empty($img['mime'])) return $img['mime'];
    if (substr($head, 4, 4) === 'ftyp') return 'video/mp4';
    if (substr($head, 0, 4) === "\x1A\x45\xDF\xA3") return 'video/webm';
    return 'application/octet-stream';
}

/** "8M" / "2G" / "512K" (php.ini sizes) -> bytes; 0 = no limit */
function ini_bytes(string $v): int
{
    $v = trim($v); if ($v === '' || $v === '-1') return 0;
    $n = (float) $v; $u = strtolower(substr($v, -1));
    return (int) ($n * (['g' => 1073741824, 'm' => 1048576, 'k' => 1024][$u] ?? 1));
}
/**
 * The biggest piece one request may carry on this server: the smaller of upload_max_filesize and post_max_size,
 * minus room for the rest of the request. Bigger files are sent in pieces of this size (upload_chunk).
 */
function upload_piece_bytes(): int
{
    $lims = array_filter([ini_bytes((string) ini_get('upload_max_filesize')), ini_bytes((string) ini_get('post_max_size'))]);
    $max = $lims ? min($lims) : 8 * 1048576;
    return max(256 * 1024, min(8 * 1048576, $max - 128 * 1024));
}
/** A request bigger than post_max_size arrives with no fields and no files at all: say so plainly. */
function upload_too_big_for_host(): bool
{
    $post = ini_bytes((string) ini_get('post_max_size'));
    return $post > 0 && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > $post;
}
function list_uploads(): array
{
    if (!is_dir(UPLOAD_DIR)) return [];
    $exts = array_values(BG_TYPES);
    $out = [];
    foreach (scandir(UPLOAD_DIR) as $f) {
        if (!preg_match('/^[a-f0-9]{16}\.([a-z0-9]+)$/', $f, $m) || !in_array($m[1], $exts, true)) continue;
        $out[] = [
            'file' => $f, 'url' => 'uploads/' . $f,
            'type' => in_array($m[1], ['mp4', 'webm'], true) ? 'video' : 'image',
            'time' => filemtime(UPLOAD_DIR . '/' . $f),
        ];
    }
    usort($out, fn($a, $b) => $b['time'] <=> $a['time']);
    return $out;
}

function prune_icons(array $site): void
{
    if (!is_dir(ICON_DIR)) return;
    if (empty((read_json(SITE_FILE) ?? [])['linksMoved'])) return;   // Home's old links are not in Links yet: their icons are still needed
    $used = [$site['icon']];
    foreach (scandir(ICON_DIR) as $f) {
        if (!preg_match('/^[a-f0-9]{16}\.[a-z]+$/', $f)) continue;
        if (!in_array('icons/' . $f, $used, true) && filemtime(ICON_DIR . '/' . $f) < time() - 3600) @unlink(ICON_DIR . '/' . $f);
    }
}

/* ================= outbound HTTP ================= */

/** Public internet only: every IPv4 and IPv6 address of the name is checked (core/boot.php). */
function host_is_public(string $host): bool
{
    return (bool) hub_public_ips($host);
}
function resolve_url(string $base, string $rel): string
{
    $rel = trim(html_entity_decode($rel, ENT_QUOTES | ENT_HTML5));
    if ($rel === '') return $base;
    if (preg_match('~^https?://~i', $rel)) return $rel;
    $p = parse_url($base);
    $scheme = $p['scheme'] ?? 'https';
    $origin = $scheme . '://' . ($p['host'] ?? '') . (isset($p['port']) ? ':' . $p['port'] : '');
    if (str_starts_with($rel, '//')) return $scheme . ':' . $rel;
    if (str_starts_with($rel, '/')) return $origin . $rel;
    $path = $p['path'] ?? '/';
    return $origin . substr($path, 0, (int) strrpos($path, '/') + 1) . $rel;
}

/**
 * GET a URL → ['status','body','url','type'] or ['error' => message].
 * Follows up to 4 redirects and re-checks each host so it can't be pointed at your own server.
 */
/**
 * GET a web address. By default the answer comes back in ['body'] (a string held in memory, so keep $maxBytes small).
 * With $saveTo the answer is written straight into that file instead, as it arrives, and ['body'] is empty: a 25 MB photo or a 32 MB
 * clip then never sits in PHP's memory (that was what used up the 128 MB limit when photos were being saved).
 */
function http_get(string $url, array $headers = [], int $maxBytes = 2_000_000, int $timeout = 12, ?string $saveTo = null): array
{
    // Only a plain download (no API key in a header or in the address) may be retried without checking the https
    // certificate, so a key can never be sent over a connection that might not be the real site.
    $plain = !preg_grep('/^(?!accept:)/i', $headers);
    $headers[] = 'User-Agent: HomeLinks/3.0 (personal start page; https://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . ')';
    for ($hop = 0; $hop < 5; $hop++) {
        $plainHop = $plain && !preg_match('~[?&](key|api_?key|apikey|client_id|token|access_token|auth|sig|signature)=~i', $url);
        $p = parse_url($url);
        if (!$p || !in_array(strtolower($p['scheme'] ?? ''), ['http', 'https'], true) || empty($p['host'])) return ['error' => 'Bad address'];
        if (!host_is_public($p['host'])) return ['error' => 'Can\'t reach ' . $p['host']];

        $status = 0; $body = ''; $type = ''; $loc = ''; $fh = null;
        if ($saveTo !== null) {   // every address tried (a redirect, a retry) starts the file again
            $fh = @fopen($saveTo, 'wb');
            if (!$fh) return ['error' => 'Can\'t save the download (the temporary folder is not writable)'];
        }
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            if (!hub_curl_pin($ch, $url)) { curl_close($ch); if ($fh) fclose($fh); return ['error' => 'Can\'t reach ' . $p['host']]; }   // connect only to the address just checked
            $rh = [];
            curl_setopt_array($ch, [
                ($fh ? CURLOPT_FILE : CURLOPT_RETURNTRANSFER) => ($fh ?: true),
                CURLOPT_FOLLOWLOCATION => false,
                CURLOPT_CONNECTTIMEOUT => 6,
                CURLOPT_TIMEOUT        => $timeout,
                CURLOPT_HTTPHEADER     => $headers,
                CURLOPT_ENCODING       => '',
                CURLOPT_HEADERFUNCTION => function ($ch, $h) use (&$rh) { $rh[] = $h; return strlen($h); },
                CURLOPT_NOPROGRESS     => false,
                CURLOPT_PROGRESSFUNCTION => fn($c, $dt, $dn) => $dn > $maxBytes ? 1 : 0,
            ]);
            $ok = curl_exec($ch); $body = $ok;
            $err = curl_error($ch);
            if ($body === false && $plainHop && in_array(curl_errno($ch), [35, 51, 58, 60, 77, 83], true)) {   // host without a CA list: retry once, public photos/icons only
                $rh = [];
                if ($fh) { ftruncate($fh, 0); rewind($fh); }
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
                $ok = curl_exec($ch); $body = $ok; $err = curl_error($ch);
            }
            $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            curl_close($ch);
            if ($fh) { fclose($fh); $fh = null; }
            if ($ok === false) return ['error' => $err ?: 'Connection failed'];
            if ($saveTo !== null) $body = '';
            foreach ($rh as $h) {
                if (stripos($h, 'location:') === 0) $loc = trim(substr($h, 9));
                if (stripos($h, 'content-type:') === 0) $type = trim(substr($h, 13));
            }
        } elseif (ini_get('allow_url_fopen')) {
            $ctx = stream_context_create(['http' => [
                'header' => implode("\r\n", $headers), 'follow_location' => 0, 'timeout' => $timeout, 'ignore_errors' => true,
            ]]);
            if ($fh) {
                $in = @fopen($url, 'rb', false, $ctx);
                if (!$in) { fclose($fh); return ['error' => 'Connection failed']; }
                stream_copy_to_stream($in, $fh, $maxBytes); fclose($in); fclose($fh); $fh = null;
                $body = '';
            } else {
                $body = @file_get_contents($url, false, $ctx, 0, $maxBytes);
                if ($body === false) return ['error' => 'Connection failed'];
            }
            foreach ($http_response_header ?? [] as $h) {
                if (preg_match('~^HTTP/\S+\s+(\d+)~', $h, $m)) $status = (int) $m[1];
                if (stripos($h, 'location:') === 0) $loc = trim(substr($h, 9));
                if (stripos($h, 'content-type:') === 0) $type = trim(substr($h, 13));
            }
        } else {
            if ($fh) fclose($fh);
            return ['error' => 'Your host blocks outgoing connections (enable the curl extension)'];
        }
        if ($status >= 300 && $status < 400 && $loc !== '') { $url = resolve_url($url, $loc); continue; }
        return ['status' => $status, 'body' => (string) $body, 'url' => $url, 'type' => $type];
    }
    return ['error' => 'Too many redirects'];
}

/** GET JSON → [data|null, error|null] with a readable error. */
function http_json(string $url, array $headers = [], int $timeout = 25): array
{
    $r = http_get($url, array_merge(['Accept: application/json'], $headers), 6_000_000, $timeout);
    if (isset($r['error'])) return [null, $r['error']];
    $j = json_decode($r['body'], true);
    if ($r['status'] !== 200) {
        $msg = $j['error']['message'] ?? $j['error']['code'] ?? $j['msg'] ?? $j['errors'][0] ?? $j['error'] ?? null;
        $hint = [401 => 'key rejected', 403 => 'access refused; check the API key if this source uses one', 429 => 'rate limit reached, try later'][$r['status']] ?? '';
        return [null, 'HTTP ' . $r['status'] . ($hint ? " ($hint)" : '') . (is_string($msg) ? ': ' . str_clip($msg, 120) : '')];
    }
    return is_array($j) ? [$j, null] : [null, 'Unexpected reply'];
}

/* ================= source lists ================= */

/**
 * Candidates from a source: list of [url, alt?, credit, link, kw, type, ping?] and an error string.
 * Lists are cached so APIs are only asked occasionally.
 */
function source_list(string $src, array $site, string $kw): array
{
    if ($src === 'picsum') {
        $items = [];
        for ($i = 0; $i < 6; $i++) {
            $items[] = ['url' => 'https://picsum.photos/' . PHOTO_MAX_WIDTH . '/' . (int) round(PHOTO_MAX_WIDTH * 9 / 16) . '?random=' . bin2hex(random_bytes(4)),
                        'credit' => 'Photo from Lorem Picsum', 'link' => 'https://picsum.photos', 'kw' => '', 'type' => 'image', 'unique' => '1'];
        }
        return [$items, null];
    }
    if ($c = custom_def($src, $site)) return custom_list($c, $kw);
    $keyName = SOURCES[$src]['key'] ?? '';
    $key = $keyName ? ($site['bg']['keys'][$keyName] ?? '') : '';
    $ttl = ['bing' => 21600, 'wikimedia' => 86400, 'wallhaven' => 3600, 'unsplash' => 3600, 'pixabay' => 86400, 'pixabay_video' => 86400][$src] ?? 3600;
    $file = CACHE_DIR . '/' . $src . '-' . substr(md5($kw . '|' . $key), 0, 10) . '.json';
    $cache = read_json($file);
    if ($cache && ($cache['time'] ?? 0) > time() - $ttl && !empty($cache['items'])) return [$cache['items'], null];

    $items = []; $err = null;
    $big = function_exists('imagecreatefromjpeg'); // can we shrink large originals?

    switch ($src) {
        case 'bing':
            foreach ([0, 8] as $idx) {
                [$j, $e] = http_json("https://www.bing.com/HPImageArchive.aspx?format=js&idx=$idx&n=8&mkt=en-US");
                $err = $err ?? $e;
                foreach ($j['images'] ?? [] as $im) {
                    if (empty($im['urlbase'])) continue;
                    $items[] = [
                        'url'    => 'https://www.bing.com' . $im['urlbase'] . ($big ? '_UHD.jpg' : '_1920x1080.jpg'),
                        'alt'    => 'https://www.bing.com' . $im['urlbase'] . '_1920x1080.jpg',
                        'credit' => str_clip(preg_replace('/\s*\(©.*\)$/', '', (string) ($im['copyright'] ?? 'Bing')), 90),
                        'link'   => (string) ($im['copyrightlink'] ?? 'https://www.bing.com'),
                    ];
                }
            }
            if ($items) $err = null;
            break;

        case 'wikimedia':
            for ($i = 0; $i < 8; $i++) {
                $d = date('Y/m/d', time() - random_int(1, 730) * 86400);
                [$j, $e] = http_json("https://en.wikipedia.org/api/rest_v1/feed/featured/$d", [], 15);
                if (!$j) [$j, $e] = http_json("https://api.wikimedia.org/feed/v1/wikipedia/en/featured/$d", [], 15);
                if (!$j) { $err = $e; continue; }
                $im = $j['image'] ?? null;
                $w = (int) ($im['image']['width'] ?? 0); $h = (int) ($im['image']['height'] ?? 1);
                $orig = (string) ($im['image']['source'] ?? '');
                $thumb = (string) ($im['thumbnail']['source'] ?? '');
                if (!$im || !$orig || $w < 1600 || $w / max(1, $h) < 1.25) continue;
                // Wikimedia only serves standard thumbnail widths (1280, 1920, 3840…).
                $step = ($big && $w >= 3840) ? 3840 : ($w >= 1920 ? 1920 : 0);
                $re = '~/\d+px-([^/]+)$~';
                $items[] = [
                    'url'    => ($step && preg_match($re, $thumb)) ? preg_replace($re, '/' . $step . 'px-$1', $thumb) : $orig,
                    'alt'    => ($w >= 1920 && preg_match($re, $thumb)) ? preg_replace($re, '/1920px-$1', $thumb) : $orig,
                    'credit' => 'Wikimedia Commons: ' . str_clip(strip_tags(html_entity_decode((string) ($im['artist']['text'] ?? $im['description']['text'] ?? ''), ENT_QUOTES)), 70),
                    'link'   => (string) ($im['file_page'] ?? 'https://commons.wikimedia.org'),
                ];
            }
            if ($items) $err = null;
            elseif (!$err) $err = 'No landscape photos on the days checked. It will try other days next time.';
            break;

        case 'wallhaven':
            $q = $kw !== '' ? '&q=' . urlencode($kw) : '';
            [$j, $err] = http_json('https://wallhaven.cc/api/v1/search?categories=100&purity=100&sorting=random&atleast=1920x1080&ratios=16x9,16x10,21x9&seed=' . bin2hex(random_bytes(3)) . $q);
            foreach ($j['data'] ?? [] as $im) {
                if (empty($im['path']) || ($im['file_size'] ?? 0) > 15_000_000 || ($im['dimension_x'] ?? 0) > 6000) continue;
                $items[] = ['url' => (string) $im['path'], 'credit' => 'Wallpaper from Wallhaven', 'link' => (string) ($im['url'] ?? 'https://wallhaven.cc')];
            }
            if (!$items && !$err) $err = "Wallhaven found nothing for “{$kw}”.";
            break;

        case 'unsplash':
            [$j, $err] = http_json('https://api.unsplash.com/photos/random?count=30&orientation=landscape&content_filter=high&query=' . urlencode($kw ?: 'landscape'),
                ['Authorization: Client-ID ' . $key, 'Accept-Version: v1']);
            foreach (is_array($j) ? $j : [] as $im) {
                if (empty($im['urls']['raw'])) continue;
                $items[] = [
                    'url'    => $im['urls']['raw'] . '&w=' . PHOTO_MAX_WIDTH . '&q=80&fm=jpg&fit=max',
                    'credit' => 'Photo by ' . ($im['user']['name'] ?? 'Unknown') . ' on Unsplash',
                    'link'   => ($im['user']['links']['html'] ?? 'https://unsplash.com') . '?utm_source=home_links&utm_medium=referral',
                    'ping'   => $im['links']['download_location'] ?? '',
                ];
            }
            if (!$items && !$err) $err = "Unsplash found nothing for “{$kw}”.";
            break;

        case 'pixabay':
            [$j, $err] = http_json('https://pixabay.com/api/?image_type=photo&orientation=horizontal&min_width=1920&safesearch=true&order=popular&per_page=60&page=' . random_int(1, 3)
                . '&key=' . urlencode($key) . '&q=' . urlencode($kw));
            foreach ($j['hits'] ?? [] as $im) {
                if (empty($im['largeImageURL'])) continue;
                $items[] = ['url' => (string) $im['largeImageURL'], 'credit' => 'Photo by ' . ($im['user'] ?? 'Unknown') . ' on Pixabay', 'link' => (string) ($im['pageURL'] ?? 'https://pixabay.com')];
            }
            if (!$items && !$err) $err = "Pixabay found no photos for “{$kw}”.";
            break;

        case 'pixabay_video':
            [$j, $err] = http_json('https://pixabay.com/api/videos/?video_type=film&safesearch=true&order=popular&per_page=60&page=' . random_int(1, 3)
                . '&key=' . urlencode($key) . '&q=' . urlencode($kw));
            foreach ($j['hits'] ?? [] as $v) {
                $d = (int) ($v['duration'] ?? 0);
                if ($d < 4 || $d > VIDEO_MAX_SECONDS) continue;
                // Pick the best rendition that is at most 1920px wide and under 30 MB.
                $best = null;
                foreach (['large', 'medium', 'small'] as $q) {
                    $r = $v['videos'][$q] ?? null;
                    if (!$r || empty($r['url']) || ($r['width'] ?? 0) <= ($r['height'] ?? 0)) continue;
                    if (($r['width'] ?? 0) > 1920 || ($r['size'] ?? 0) > 30_000_000) continue;
                    $best = $r; break;
                }
                if (!$best) continue;
                $items[] = ['url' => (string) $best['url'], 'credit' => 'Video by ' . ($v['user'] ?? 'Unknown') . ' on Pixabay', 'link' => (string) ($v['pageURL'] ?? 'https://pixabay.com'), 'type' => 'video'];
            }
            if (!$items && !$err) $err = "Pixabay found no short clips for “{$kw}”.";
            break;
    }
    foreach ($items as &$it) { $it['kw'] = $kw; $it['type'] = $it['type'] ?? 'image'; }
    unset($it);
    $items = array_values(array_filter($items, fn($i) => str_starts_with($i['url'], 'https://')));
    write_json($file, ['time' => $items ? time() : time() - $ttl + 600, 'items' => $items]); // retry failures after 10 min
    return [$items, $err];
}

/** Read "a.b.0.c" out of nested arrays. */
function get_path($data, string $path)
{
    if ($path === '') return $data;
    foreach (explode('.', $path) as $k) {
        if (!is_array($data) || !array_key_exists($k, $data)) return null;
        $data = $data[$k];
    }
    return $data;
}

function custom_url(array $c, string $kw): string
{
    return str_replace(
        ['{keyword}', '{random}', '{page}', '{width}'],
        [urlencode($kw ?: 'landscape'), bin2hex(random_bytes(4)), (string) random_int(1, 5), (string) PHOTO_MAX_WIDTH],
        $c['url']
    );
}

/** Candidates from a custom source. Cached for an hour like the built-in ones. */
function custom_list(array $c, string $kw, bool $useCache = true): array
{
    $name = $c['name'];
    if ($c['kind'] === 'image') {
        $items = [];
        for ($i = 0; $i < 6; $i++) {
            $u = custom_url($c, $kw);
            $items[] = ['url' => $u, 'credit' => 'From ' . $name, 'link' => '', 'kw' => $kw, 'type' => $c['type'], 'unique' => bin2hex(random_bytes(4))];
        }
        return [$items, null];
    }
    $file = CACHE_DIR . '/c' . $c['id'] . '-' . substr(md5($kw . '|' . json_encode($c)), 0, 10) . '.json';
    $cache = $useCache ? read_json($file) : null;
    if ($cache && ($cache['time'] ?? 0) > time() - 3600 && !empty($cache['items'])) return [$cache['items'], null];

    [$j, $err] = http_json(custom_url($c, $kw), $c['headers'] !== '' ? explode("\n", $c['headers']) : []);
    $items = [];
    if ($j !== null) {
        $list = get_path($j, $c['list']);
        if (!is_array($list)) {
            $err = $c['list'] === '' ? 'The reply is not a list. Set "List of items" to the field that holds the list.' : "Couldn't find a list at “{$c['list']}”.";
        } else {
            if (!array_is_list($list)) $list = [$list]; // a single object (e.g. "photo of the day")
            foreach ($list as $it) {
                $u = get_path($it, $c['image']);
                if (!is_string($u) || !preg_match('~^https?://~i', $u)) continue;
                $cr = $c['credit'] !== '' ? get_path($it, $c['credit']) : null;
                $ln = $c['link'] !== '' ? get_path($it, $c['link']) : null;
                $items[] = [
                    'url'    => str_replace('http://', 'https://', $u),
                    'credit' => is_scalar($cr) && $cr !== '' ? str_clip((string) $cr, 90) : 'From ' . $name,
                    'link'   => is_string($ln) && preg_match('~^https?://~i', $ln) ? $ln : '',
                    'kw'     => $kw, 'type' => $c['type'],
                ];
            }
            if (!$items) $err = "Found " . count($list) . " items, but no image address at “{$c['image']}”.";
        }
    }
    if ($useCache) write_json($file, ['time' => $items ? time() : time() - 3000, 'items' => $items]);
    return [$items, $err];
}

/* ================= local photo/video pool ================= */

function pool_load(): array
{
    $p = read_json(POOL_FILE) ?? [];
    return [
        'items'  => is_array($p['items'] ?? null) ? $p['items'] : [],
        'errors' => is_array($p['errors'] ?? null) ? $p['errors'] : [],
        'used'   => is_array($p['used'] ?? null) ? $p['used'] : [],   // originals already shown out, so they aren't downloaded again
    ];
}

/** Read-modify-write the pool under a lock, so visitors and downloads never overwrite each other. */
function pool_update(callable $fn)
{
    ensure_dir(DATA_DIR);
    $lock = fopen(POOL_FILE . '.lock', 'c');
    flock($lock, LOCK_EX);
    $pool = pool_load();
    $result = $fn($pool);
    $pool['used'] = array_slice($pool['used'], -800);
    write_json(POOL_FILE, $pool);
    flock($lock, LOCK_UN);
    fclose($lock);
    return $result;
}

function pool_public(array $i): array
{
    $o = ['url' => 'photos/' . $i['file'], 'type' => $i['type'] ?? 'image', 'credit' => $i['credit'], 'link' => $i['link'], 'src' => $i['src']];
    if ($o['type'] === 'image' && is_file(PHOTO_DIR . '/' . photo_portrait_name($i['file']))) $o['p'] = 1;   // a phone-shaped copy exists
    return $o;
}

/**
 * The phone-shaped copy of a background photo: the middle 3:4 slice of it, at the photo's own height ("name-p.jpg").
 * On a phone held upright the browser shows only that middle slice of a landscape photo anyway (object-fit: cover, centered),
 * so the copy looks exactly the same there while being about half the bytes. Landscape screens keep using the full photo.
 */
function photo_portrait_name(string $file): string { return preg_replace('/\.(jpe?g|png|webp)$/i', '-p.jpg', $file); }
/** Delete a photo and its phone-shaped copy. */
function photo_unlink(string $file): void { @unlink(PHOTO_DIR . '/' . $file); @unlink(PHOTO_DIR . '/' . photo_portrait_name($file)); }
function photo_make_portrait(string $file): bool
{
    if (!function_exists('imagecreatetruecolor') || !preg_match('/\.(jpe?g|png|webp)$/i', $file)) return false;
    $path = PHOTO_DIR . '/' . $file; $out = PHOTO_DIR . '/' . photo_portrait_name($file);
    $sz = @getimagesize($path); if (!$sz) return false;
    [$w, $h] = $sz; if ($w < 1 || $h < 1 || $w / $h < 1.15) return false;
    $dh = min($h, 1400); $dw = (int) round($dh * 0.75); $sw = (int) round($h * 0.75); $sx = (int) floor(($w - $sw) / 2);
    $limit = memory_bytes();
    if ($limit !== PHP_INT_MAX && memory_get_usage() + (int) (($w * $h * 4 + $dw * $dh * 4 + 3_000_000) * 1.25) > $limit * 0.8) return false;   // too tight: the full photo is used instead
    $img = match ($sz[2]) { IMAGETYPE_JPEG => @imagecreatefromjpeg($path), IMAGETYPE_PNG => @imagecreatefrompng($path), IMAGETYPE_WEBP => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : false, default => false };
    if (!$img) return false;
    $c = imagecreatetruecolor($dw, $dh); $ok = $c && imagecopyresampled($c, $img, 0, 0, $sx, 0, $dw, $dh, $sw, $h);
    imagedestroy($img);
    if (!$ok) return false;
    imageinterlace($c, true); $saved = @imagejpeg($c, $out, 80); imagedestroy($c);
    if (!$saved) { @unlink($out); return false; }
    @chmod($out, 0644); return true;
}

/** Keyword sources only count photos for current keywords. */
function pool_item_valid(array $i, array $site): bool
{
    static $kwMemo = [];
    $all = all_sources($site);
    if (!isset($all[$i['src'] ?? ''])) return false;
    if (!empty($all[$i['src']]['kw'])) {
        $q = (string) $site['bg']['query'];
        if (!isset($kwMemo[$q])) { if (count($kwMemo) > 4) $kwMemo = []; $kwMemo[$q] = array_flip(array_map('strtolower', keywords($q))); }
        if (!isset($kwMemo[$q][strtolower($i['kw'] ?? '')])) return false;
    }
    return is_file(PHOTO_DIR . '/' . ($i['file'] ?? ''));   // the disk last: the cheap checks first
}

/** Remove entries that no longer match (keywords changed, source removed) and stray files. */
function pool_cleanup(array &$pool, array $site): void
{
    $keep = [];
    foreach ($pool['items'] as $i) {
        if (!pool_item_valid($i, $site)) { photo_unlink($i['file']); continue; }
        $keep[] = $i;
    }
    $pool['items'] = $keep;
    if (is_dir(PHOTO_DIR)) {
        $known = array_flip(array_column($keep, 'file'));
        foreach (scandir(PHOTO_DIR) as $f) {
            // the phone copy ("name-p.jpg") belongs to its photo: it stays while the photo does
            $parent = preg_match('/^([a-z0-9_]+-[a-f0-9]{16})-p\.jpg$/', $f, $pm) ? null : $f;
            $isP = $parent === null;
            if ($isP ? !(isset($known[$pm[1] . '.jpg']) || isset($known[$pm[1] . '.png']) || isset($known[$pm[1] . '.webp'])) : (preg_match('/^[a-z0-9_]+-[a-f0-9]{16}\.(jpg|png|webp|mp4|webm)$/', $f) && !isset($known[$f]))) {
              if (filemtime(PHOTO_DIR . '/' . $f) < time() - 900) @unlink(PHOTO_DIR . '/' . $f);
            }
        }
    }
}

function memory_bytes(): int
{
    $v = trim((string) ini_get('memory_limit'));
    if ($v === '' || $v === '-1') return PHP_INT_MAX;
    $n = (int) $v;
    return match (strtolower(substr($v, -1))) { 'g' => $n << 30, 'm' => $n << 20, 'k' => $n << 10, default => $n };
}

/**
 * Shrink to PHOTO_MAX_WIDTH and re-save as JPEG, when GD is there and the memory limit leaves room for it.
 * GD holds a picture as 4 bytes per pixel, so a 4500x3000 photo needs about 54 MB just to be opened, and the small copy comes on top.
 * The copy is made with imagecopyresampled() into an image of the final size: imagescale() with the bicubic filter quietly builds a
 * second, half-scaled picture on the way (1920 x the full height x 4 bytes), and that extra was what ran the memory out. When the
 * limit is too tight, the photo is kept as it is: a big file is better than a crashed page.
 */
function shrink_photo(string $path, int $w, int $h, string $mime): string
{
    if ($w <= PHOTO_MAX_WIDTH || $h < 1 || !function_exists('imagecreatefromjpeg')) return $path;
    $dw = PHOTO_MAX_WIDTH; $dh = max(1, (int) round($h * $dw / $w));
    $need = (int) (($w * $h * 4 + $dw * $dh * 4 + 3_000_000) * 1.25);   // the open picture + the small copy + libjpeg's own room, with a margin
    $limit = memory_bytes();
    if ($limit !== PHP_INT_MAX && memory_get_usage() + $need > $limit * 0.8) return $path;
    gc_collect_cycles();
    $img = match ($mime) {
        'image/jpeg' => @imagecreatefromjpeg($path),
        'image/png'  => @imagecreatefrompng($path),
        'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : false,
        default      => false,
    };
    if (!$img) return $path;
    $small = imagecreatetruecolor($dw, $dh);
    if (!$small) { imagedestroy($img); return $path; }
    $ok = imagecopyresampled($small, $img, 0, 0, 0, 0, $dw, $dh, $w, $h);
    imagedestroy($img);
    if (!$ok) { imagedestroy($small); return $path; }
    $out = preg_replace('/\.(png|webp)$/', '.jpg', $path);
    imageinterlace($small, true);
    $saved = @imagejpeg($small, $out, 82);
    imagedestroy($small);
    if (!$saved) { @unlink($out !== $path ? $out : ''); return $path; }   // could not write the small copy: keep the original
    if ($out !== $path) @unlink($path);
    return $out;
}

/** Download one candidate into photos/. Returns [entry|null, error|null]. */
function pool_download(string $src, array $c, array $site): array
{
    $isVideo = ($c['type'] ?? 'image') === 'video';
    $last = null;
    foreach (array_unique(array_filter([$c['url'], $c['alt'] ?? null])) as $url) {
        $tmp = tempnam(sys_get_temp_dir(), 'pho');
        if ($tmp === false) { $last = 'Can\'t make a temporary file'; continue; }
        // The download goes straight into the file: a 25 MB photo or a 32 MB clip never sits in PHP's memory, which is
        // what leaves room to open and shrink the picture afterwards.
        $r = http_get($url, [$isVideo ? 'Accept: video/mp4,video/*' : 'Accept: image/jpeg,image/png,image/webp,image/*'], $isVideo ? 32_000_000 : 25_000_000, $isVideo ? 90 : 45, $tmp);
        if (isset($r['error'])) { @unlink($tmp); $last = $r['error']; continue; }
        if ($r['status'] !== 200) { @unlink($tmp); $last = 'Download failed (HTTP ' . $r['status'] . ')'; continue; }
        unset($r);
        $mime = detect_mime($tmp);
        ensure_dir(PHOTO_DIR);
        if ($isVideo) {
            $ext = ['video/mp4' => 'mp4', 'video/webm' => 'webm'][$mime] ?? null;
            if (!$ext) { @unlink($tmp); $last = 'Not a usable video'; continue; }
            $file = PHOTO_DIR . '/' . $src . '-' . bin2hex(random_bytes(8)) . '.' . $ext;
            if (!@rename($tmp, $file)) { if (!@copy($tmp, $file)) { @unlink($tmp); $last = 'Can\'t save the file (check the photos folder permissions)'; continue; } @unlink($tmp); }
        } else {
            $size = @getimagesize($tmp);
            if (!isset(PHOTO_TYPES[$mime]) || !$size) { @unlink($tmp); $last = 'Not a usable image'; continue; }
            [$w, $h] = $size;
            if ($w < 1200 || $w / max(1, $h) < 1.15) { @unlink($tmp); return [null, null]; } // portrait or tiny: skip quietly
            $file = PHOTO_DIR . '/' . $src . '-' . bin2hex(random_bytes(8)) . '.' . PHOTO_TYPES[$mime];
            if (!@rename($tmp, $file)) { if (!@copy($tmp, $file)) { @unlink($tmp); $last = 'Can\'t save the file (check the photos folder permissions)'; continue; } @unlink($tmp); }
            $file = shrink_photo($file, $w, $h, $mime);
        }
        @chmod($file, 0644);
        if (!$isVideo) photo_make_portrait(basename($file));
        if (!empty($c['ping'])) http_get($c['ping'], ['Authorization: Client-ID ' . ($site['bg']['keys']['unsplash'] ?? '')], 50_000, 5); // Unsplash asks for this
        return [[
            'file' => basename($file), 'src' => $src, 'type' => $isVideo ? 'video' : 'image', 'kw' => $c['kw'] ?? '',
            'origin' => $c['url'] . (!empty($c['unique']) ? '#' . $c['unique'] : ''), 'credit' => $c['credit'], 'link' => $c['link'], 'time' => time(), 'views' => 0, 'seen' => 0,
        ], null];
    }
    return [null, $last];
}

/** Download one new item for a source and add it to the pool. Returns [entry|null, error|null]. */
function pool_add_one(string $src, array $site): array
{
    $pool = pool_load();
    $kws = !empty(all_sources($site)[$src]['kw']) ? keywords($site['bg']['query']) : [''];
    $count = array_fill_keys($kws, 0);
    foreach ($pool['items'] as $i) if ($i['src'] === $src && isset($count[$i['kw'] ?? ''])) $count[$i['kw']]++;
    asort($count);
    $kw = (string) array_key_first($count);   // keyword with the fewest saved items

    [$list, $err] = source_list($src, $site, $kw);
    if (!$list) return [null, $err ?: 'No photos available'];
    $skip = array_flip(array_merge(array_column($pool['items'], 'origin'), $pool['used']));
    $fresh = array_values(array_filter($list, fn($c) => !empty($c['unique']) || !isset($skip[$c['url']])));
    if (!$fresh) return [null, null]; // everything here was already used; wait for new ones
    shuffle($fresh);
    $lastErr = null;
    foreach (array_slice($fresh, 0, 3) as $c) {
        [$item, $e] = pool_download($src, $c, $site);
        if ($item) {
            pool_update(function (&$p) use ($item) { $p['items'][] = $item; $p['errors'][$item['src']] = null; });
            return [$item, null];
        }
        $lastErr = $e ?? $lastErr;
    }
    return [null, $lastErr];
}

/** Top up the pool for at most $seconds. Only one refill runs at a time. */
function pool_refill(array $site, int $seconds = 25, ?string $only = null): array
{
    ensure_dir(DATA_DIR);
    $lock = fopen(LOCK_FILE, 'c');
    if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) return ['added' => [], 'busy' => true, 'error' => null];
    @set_time_limit($seconds + 120);
    ignore_user_abort(true);
    if (memory_bytes() < (256 << 20)) @ini_set('memory_limit', '256M');   // picture work is the heaviest thing this site does; hosts that forbid it keep their own limit

    pool_update(function (&$p) use ($site) { pool_cleanup($p, $site); });
    $start = time();
    $ready = $only ? [$only] : ready_sources($site);
    $added = []; $failed = []; $errors = [];
    while (time() - $start < $seconds) {
        $pool = pool_load();
        $counts = [];
        foreach ($ready as $s) {
            if (isset($failed[$s])) continue;
            $n = count(array_filter($pool['items'], fn($i) => $i['src'] === $s && pool_item_valid($i, $site)));
            if ($n < source_target($s, $site) || $only) $counts[$s] = $n / source_target($s, $site);
        }
        if (!$counts) break;
        asort($counts);
        $s = (string) array_key_first($counts);
        [$item, $err] = pool_add_one($s, $site);
        gc_collect_cycles();   // give back what the last picture used before the next one
        if ($item) {
            $added[] = pool_public($item);
            if ($only) break;
        } else {
            $failed[$s] = true;
            $errors[$s] = $err;
            if ($err) pool_update(function (&$p) use ($s, $err) { $p['errors'][$s] = ['msg' => $err, 'time' => time()]; });
        }
    }
    flock($lock, LOCK_UN);
    fclose($lock);
    return ['added' => $added, 'busy' => false, 'error' => $only ? ($errors[$only] ?? null) : null];
}

/** Count a view. After MAX_VIEWS the file is deleted so a fresh one can take its place. */
function pool_seen(string $url): array
{
    if (!preg_match('~^photos/([a-z0-9_]+-[a-f0-9]{16}\.(jpg|png|webp|mp4|webm))$~', $url, $m)) return ['removed' => false];
    $file = $m[1];
    // Each visitor counts once per photo, so one browser (or a script) can't wear out every photo and use up API quotas.
    $who = substr(hash('sha256', 'seen|' . hub_rate_key()), 0, 12);
    return pool_update(function (&$p) use ($file, $who) {
        foreach ($p['items'] as $k => &$i) {
            if ($i['file'] !== $file) continue;
            if (($i['seen'] ?? 0) > time() - 20) return ['removed' => false]; // same view reported twice
            $by = is_array($i['by'] ?? null) ? $i['by'] : [];
            if (in_array($who, $by, true)) return ['removed' => false, 'views' => $i['views'] ?? 0];
            $i['by'] = array_slice(array_merge($by, [$who]), -MAX_VIEWS);
            $i['views'] = ($i['views'] ?? 0) + 1;
            $i['seen'] = time();
            if ($i['views'] >= MAX_VIEWS) {
                photo_unlink($file);
                $p['used'][] = $i['origin'];
                array_splice($p['items'], $k, 1);
                return ['removed' => true];
            }
            return ['removed' => false, 'views' => $i['views']];
        }
        return ['removed' => false];
    });
}

function pool_stats(array $site): array
{
    $pool = pool_load();
    $out = [];
    foreach (all_sources($site) as $k => $_) {
        $out[$k] = [
            'count'  => count(array_filter($pool['items'], fn($i) => $i['src'] === $k && pool_item_valid($i, $site))),
            'target' => source_target($k, $site),
            'error'  => $pool['errors'][$k]['msg'] ?? null,
        ];
    }
    return $out;
}
