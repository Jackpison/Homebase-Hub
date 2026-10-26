<?php
/* Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
/**
 * Bookmarks API  (v6)
 * -------------------------------------------------------------------------
 *  GET  ?action=get        page data (private tabs/site hidden unless logged in)
 *  POST ?action=login      { password }            the shared site login (core/boot.php), brute-force protected
 *  POST ?action=logout
 *  POST ?action=save       { rev, data, keep }   keep: keep an earlier version first (Import Bookmarks)
 *  GET  ?action=backup                             full backup file (data + icons)
 *  POST ?action=restore    { backup }
 *  GET  ?action=backups                            list automatic server backups
 *  POST ?action=rollback   { name }                restore one automatic backup
 *  POST ?action=icon       { url }                 fetch and save a site's icon
 *  POST ?action=title      { url }                 the page's title, as shown in the browser tab
 *
 *  Files in site-data/links are PHP files that stop with a 404 when opened in a browser,
 *  so they stay private even on servers that ignore .htaccess.
 *  Every POST needs the X-Requested-With: bookmarks header; changes also pass the site's security check (hub_csrf_ok).
 */

const BM_MAX_TABS     = 6;
const BM_MAX_BACKUPS  = 40;     // automatic backups kept in data/backups
const BM_BACKUP_EVERY = 600;    // seconds: at most one automatic backup per 10 minutes
const BM_GUARD        = "<?php http_response_code(404); exit; ?>\n";

require __DIR__ . '/../hub/core/lib/boot.php';   // Hub: one login, private data folder
require __DIR__ . '/lib.php';                     // visit counts (1.53)

$dataDir    = hub_dir('links');
$dataFile   = $dataDir . '/bookmarks.php';
$seedFile   = $dataDir . '/seed.php';         // starter bookmarks for a fresh install
$backupDir  = $dataDir . '/backups';
$iconDir    = HUB_MEDIA . '/links/icons';   // before 1.29.3 this folder sat next to the page

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: same-origin');
hub_same_origin();
if (extension_loaded('zlib') && !ini_get('zlib.output_compression')) { @ob_start('ob_gzhandler'); }   // the page data shrinks a lot when sent compressed

/* ======================= small helpers ======================= */

function out($code, $arr) {
    http_response_code($code);
    echo json_encode($arr, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}
function body($maxMB = 3) {
    $raw = (string)file_get_contents('php://input', false, null, 0, $maxMB * 1024 * 1024 + 1);   // never read more than allowed
    if ($raw === '' && !empty($_SERVER['CONTENT_LENGTH'])) {
        out(413, ['error' => 'The upload is larger than this server allows (post_max_size in PHP settings).']);
    }
    if (strlen($raw) > $maxMB * 1024 * 1024) out(413, ['error' => "Data is too large ($maxMB MB max)."]);
    $j = json_decode($raw, true);
    return is_array($j) ? $j : [];
}
// Guarded files start with a PHP line that blocks web access; strip it when reading.
function strip_guard($s) {
    if (strncmp($s, '<?php', 5) === 0) { $p = strpos($s, "\n"); return $p === false ? '' : substr($s, $p + 1); }
    return $s;
}
function read_guarded($f) {
    if (!is_file($f)) return null;
    $s = @file_get_contents($f);
    return $s === false ? null : strip_guard($s);
}
function write_guarded($f, $content) {
    $tmp = $f . '.' . bin2hex(random_bytes(4)) . '.tmp';
    // '<' only appears inside JSON strings, where \u003C means the same thing; this keeps PHP from ever reading it as code
    $content = str_replace('<', '\u003C', $content);
    if (@file_put_contents($tmp, BM_GUARD . $content, LOCK_EX) === false) return false;
    if (!@rename($tmp, $f)) { @unlink($tmp); return false; }
    return true;
}
/** One exclusive lock for every change to the bookmarks, so the revision check and the write can't interleave with another save. */
function links_lock() {
    global $dataDir;
    need_dir($dataDir);
    $fh = @fopen($dataDir . '/links.lock', 'c');
    if ($fh) flock($fh, LOCK_EX);
    return $fh;
}
function links_unlock($fh) { if ($fh) { flock($fh, LOCK_UN); fclose($fh); } }
function need_dir($d) {
    if (!is_dir($d) && !@mkdir($d, 0755, true)) out(500, ['error' => "Could not create the folder $d. Check permissions (755)."]);
}

/* ======================= data ======================= */

function current_raw() {
    global $dataFile, $seedFile;
    if (($s = read_guarded($dataFile)) !== null) return $s;
    if (($s = read_guarded($seedFile)) !== null) return $s;
    return '{"tabs":[{"id":"main","title":"Bookmarks","categories":[]}]}';
}
function data_error($data) {
    if (!is_array($data) || !isset($data['tabs']) || !is_array($data['tabs']) || !count($data['tabs'])) {
        return 'Data must contain at least one tab in a "tabs" list.';
    }
    if (count($data['tabs']) > BM_MAX_TABS) return 'There can be at most ' . BM_MAX_TABS . ' tabs.';
    foreach ($data['tabs'] as $t) {
        if (!is_array($t) || !isset($t['categories']) || !is_array($t['categories'])) return 'Every tab needs a "categories" list.';
        if (isset($t['enc']) && !hub_enc_ok($t['enc'])) return 'An encrypted tab is damaged or too large.';
        foreach ($t['categories'] as $c) {
            if (!is_array($c) || (isset($c['links']) && !is_array($c['links']))) return 'Every category needs a "links" list.';
        }
    }
    if (isset($data['settings']) && !is_array($data['settings'])) return '"settings" must be an object.';
    return '';
}
function backup_files() {
    global $backupDir;
    $f = (glob($backupDir . '/bookmarks-*.php') ?: []);
    usort($f, function ($a, $b) { return filemtime($b) - filemtime($a); });
    return $f; // newest first
}
// Saves data; keeps an automatic backup at most every 10 minutes (or always when forced).
function write_data($data, $forceBackup = false) {
    global $dataFile, $backupDir;
    $hasOld = is_file($dataFile);
    if ($hasOld) {
        $files = backup_files();
        if (hub_links_keep_due($files ? (int)filemtime($files[0]) : null, (bool)$forceBackup, BM_BACKUP_EVERY)) {
            need_dir($backupDir);
            write_guarded(hub_version_path($backupDir, 'bookmarks-'), current_raw());
            $files = backup_files();
            foreach (array_slice($files, BM_MAX_BACKUPS) as $old) @unlink($old);
        }
    }
    fix_objects($data);
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE | JSON_HEX_TAG);
    if ($json === false || !write_guarded($dataFile, $json)) {
        out(500, ['error' => 'Could not save to the data folder. Check its permissions (755).']);
    }
    return md5($json);
}
// PHP turns an empty JSON object {} into an empty list []. Settings must stay objects, or the page loses what you set.
function fix_objects(&$data) {
    if (!is_array($data)) return;
    $s = isset($data['settings']) && is_array($data['settings']) ? $data['settings'] : [];
    unset($s['favicon']);   // the Links icon setting is gone: one site logo
    foreach (['dark', 'light', 'sizes'] as $k) {
        if (array_key_exists($k, $s) && (!is_array($s[$k]) || !$s[$k])) unset($s[$k]);
        elseif (isset($s[$k])) $s[$k] = (object)$s[$k];
    }
    $data['settings'] = (object)$s;
}
function count_links($data) {
    $n = 0;
    foreach ($data['tabs'] ?? [] as $t) foreach ($t['categories'] ?? [] as $c) foreach ($c['links'] ?? [] as $l) if (empty($l['divider'])) $n++;
    return $n;
}

/**
 * A tab was just encrypted: the earlier automatic backups still hold it as readable text, and its icon files are named after
 * the sites. Both go now (the encrypted tab keeps its icons inside the encrypted text).
 */
function purge_readable_copies(array $oldTabs, $iconDir, $secret) {
    foreach (backup_files() as $f) @unlink($f);
    foreach ($oldTabs as $t) {
        $dir = $iconDir . '/' . tab_slug($t, $secret);
        foreach (glob($dir . '/*') ?: [] as $f) if (is_file($f)) @unlink($f);
        @rmdir($dir);
    }
}

/* ======================= icon folders per tab ======================= */

function tab_slug($t, $secret) {
    $s = strtolower(trim(preg_replace('~[^A-Za-z0-9]+~', '-', (string)($t['title'] ?? '')), '-'));
    $s = substr($s, 0, 40);
    if ($s === '') $s = 'tab';
    // private tabs get an unguessable folder name
    if (!empty($t['private'])) $s .= '-' . substr(hash_hmac('sha256', (string)($t['id'] ?? ''), $secret), 0, 12);
    return $s;
}
/**
 * Keeps icons/<tab-folder>/<file> in step with the data. Each link's saved icon is copied into its
 * tab's folder and the link updated. Unused files older than an hour are removed.
 * Returns old path => new path so the page can update itself.
 */
function organize_icons(&$data, $iconDir, $secret) {
    $map = []; $used = []; $slugs = [];
    foreach ($data['tabs'] as &$t) {
        $base = tab_slug($t, $secret); $slug = $base; $n = 2;
        while (isset($slugs[$slug])) $slug = $base . '-' . $n++;
        $slugs[$slug] = true;
        foreach ($t['categories'] as &$c) {
            if (!isset($c['links']) || !is_array($c['links'])) continue;
            foreach ($c['links'] as &$l) {
                if (!is_array($l) || empty($l['icon']) || !is_string($l['icon'])) continue;
                if (!preg_match('~^icons/((?:[a-z0-9-]+/)?)([A-Za-z0-9._-]+\.(?:png|ico|gif|jpg|webp|svg))(\?[^#]*)?$~', $l['icon'], $m)) continue;
                $file = $m[2]; $rel = $m[1] . $file; $target = $slug . '/' . $file;
                if ($file[0] === '_') continue;
                if ($rel !== $target) {
                    $src = $iconDir . '/' . $rel; $dst = $iconDir . '/' . $target;
                    if (!is_dir(dirname($dst))) @mkdir(dirname($dst), 0755, true);
                    if (is_file($src)) { if (!@copy($src, $dst)) continue; }
                    elseif (!is_file($dst)) continue;
                    $new = 'icons/' . $target . ($m[3] ?? '');
                    $map[$l['icon']] = $new;
                    $l['icon'] = $new;
                }
                $used[$target] = true;
            }
            unset($l);
        }
        unset($c);
    }
    unset($t);
    $old = time() - 3600;
    foreach (array_merge(glob($iconDir . '/*.*') ?: [], glob($iconDir . '/*/*.*') ?: []) as $f) {
        $rel = substr($f, strlen($iconDir) + 1); $name = basename($f);
        if ($name[0] === '.' || $name[0] === '_' || isset($used[$rel]) || !is_file($f)) continue;
        if (!preg_match('~\.(png|ico|gif|jpg|webp|svg)$~', $name)) continue;
        if (@filemtime($f) < $old) @unlink($f);
    }
    foreach (glob($iconDir . '/*', GLOB_ONLYDIR) ?: [] as $d) @rmdir($d); // removes only empty folders
    return $map;
}

/* ======================= icon fetching ======================= */

// Public internet only: every IPv4 and IPv6 address of the name is checked (core/boot.php), and names that don't resolve are refused.
function host_ok($host) { return (bool)hub_public_ips((string)$host); }
/**
 * GET a page or image: [body, finalUrl, httpCode, contentType]. Redirects are followed by hand (max 5) and the host of
 * EVERY hop is checked, so a public address can't bounce the server onto your own network. With cURL the connection is
 * also pinned to the checked address, so DNS can't switch to an internal one in between. An https certificate problem
 * is retried once without checking, because some hosts ship no CA list (only public icons/pages are read this way).
 */
function fetch_url($url, $maxBytes, $headers = [], $stopAt = null) {
    $ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
    for ($hop = 0; $hop < 6; $hop++) {
        $p = parse_url($url);
        if (!$p || empty($p['host']) || !in_array(strtolower($p['scheme'] ?? ''), ['http', 'https'], true) || !host_ok($p['host'])) return ['', $url, 0, ''];
        $buf = ''; $code = 0; $ct = ''; $loc = '';
        if (!function_exists('curl_init')) {
            $ctx = stream_context_create(['http' => ['timeout' => 8, 'follow_location' => 0, 'ignore_errors' => true,
                'header' => "User-Agent: $ua\r\n" . ($headers ? implode("\r\n", $headers) . "\r\n" : '')]]);
            $b = @file_get_contents($url, false, $ctx, 0, $maxBytes);
            $buf = $b === false ? '' : $b;
            foreach ($http_response_header ?? [] as $hd) {
                if (preg_match('~^HTTP/\S+\s+(\d+)~', $hd, $m)) $code = (int)$m[1];
                if (stripos($hd, 'content-type:') === 0) $ct = trim(substr($hd, 13));
                if (stripos($hd, 'location:') === 0) $loc = trim(substr($hd, 9));
            }
        } else {
            for ($try = 0; $try < 2; $try++) {
                $buf = ''; $loc = ''; $ct = '';
                $ch = curl_init($url);
                if (!hub_curl_pin($ch, $url)) { curl_close($ch); return ['', $url, 0, '']; }
                curl_setopt_array($ch, [
                    CURLOPT_FOLLOWLOCATION => false, CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_TIMEOUT => 8, CURLOPT_ENCODING => '',
                    CURLOPT_SSL_VERIFYPEER => $try === 0, CURLOPT_SSL_VERIFYHOST => $try === 0 ? 2 : 0,
                    CURLOPT_USERAGENT => $ua,
                    CURLOPT_HTTPHEADER => array_merge(['Accept: text/html,application/xhtml+xml,image/avif,image/webp,image/*,*/*;q=0.8', 'Accept-Language: en-US,en;q=0.9'], $headers),
                    CURLOPT_HEADERFUNCTION => function ($ch, $h) use (&$loc, &$ct) {
                        if (stripos($h, 'location:') === 0) $loc = trim(substr($h, 9));
                        if (stripos($h, 'content-type:') === 0) $ct = trim(substr($h, 13));
                        return strlen($h);
                    },
                    CURLOPT_WRITEFUNCTION => function ($ch, $chunk) use (&$buf, $maxBytes, $stopAt) {
                        $from = max(0, strlen($buf) - 16);
                        $buf .= $chunk;
                        if (strlen($buf) > $maxBytes) return 0;
                        if ($stopAt !== null && stripos($buf, $stopAt, $from) !== false) return 0; // got what we need
                        return strlen($chunk);
                    },
                ]);
                if (defined('CURLPROTO_HTTP')) curl_setopt($ch, CURLOPT_PROTOCOLS, CURLPROTO_HTTP | CURLPROTO_HTTPS);
                curl_exec($ch);
                $errno = curl_errno($ch); $e = curl_error($ch);
                $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                if ($errno && !in_array($errno, [23], true)) $GLOBALS['fetch_err'] = $e;   // 23 = we stopped the download ourselves
                if ($try === 0 && in_array($errno, [35, 51, 58, 60, 77, 83], true)) continue;   // certificate trouble: retry once
                break;
            }
        }
        if ($code >= 300 && $code < 400 && $loc !== '') {
            $url = resolve_url($loc, $url);
            continue;
        }
        return [$buf, $url, $code, $ct];
    }
    return ['', $url, 0, ''];
}
function resolve_url($rel, $base) {
    $rel = trim(html_entity_decode($rel));
    if ($rel === '') return '';
    if (preg_match('~^(data:|https?://)~i', $rel)) return $rel;
    $b = parse_url($base);
    $scheme = $b['scheme'] ?? 'https';
    $origin = $scheme . '://' . ($b['host'] ?? '') . (isset($b['port']) ? ':' . $b['port'] : '');
    if (strpos($rel, '//') === 0) return $scheme . ':' . $rel;
    if ($rel[0] === '/') return $origin . $rel;
    $path = $b['path'] ?? '/';
    $dir = substr($path, 0, strrpos($path, '/') + 1);
    $parts = [];
    foreach (explode('/', $dir . $rel) as $seg) {
        if ($seg === '..') array_pop($parts);
        elseif ($seg !== '.') $parts[] = $seg;
    }
    return $origin . implode('/', $parts);
}
function icons_from_html($html, $base) {
    $links = [];
    if (class_exists('DOMDocument')) {
        $doc = new DOMDocument();
        libxml_use_internal_errors(true);
        $doc->loadHTML('<?xml encoding="utf-8"?>' . $html);
        libxml_clear_errors();
        foreach ($doc->getElementsByTagName('base') as $bt) {
            if ($bt->getAttribute('href')) { $base = resolve_url($bt->getAttribute('href'), $base); break; }
        }
        foreach ($doc->getElementsByTagName('link') as $l) {
            $links[] = [$l->getAttribute('rel'), $l->getAttribute('href'), $l->getAttribute('sizes'), $l->getAttribute('type')];
        }
    } else {
        $attr = function ($tag, $name) {
            return preg_match('~\s' . $name . '\s*=\s*(?:"([^"]*)"|\'([^\']*)\'|([^\s>]+))~i', $tag, $m) ? ($m[3] ?? '') . ($m[2] ?? '') . ($m[1] ?? '') : '';
        };
        if (preg_match('~<base[^>]+>~i', $html, $bm) && ($bh = $attr($bm[0], 'href'))) $base = resolve_url($bh, $base);
        if (preg_match_all('~<link\b[^>]*>~i', $html, $m)) foreach ($m[0] as $tag) {
            $links[] = [$attr($tag, 'rel'), $attr($tag, 'href'), $attr($tag, 'sizes'), $attr($tag, 'type')];
        }
    }
    $scored = [];
    foreach ($links as [$relRaw, $href, $sizes, $type]) {
        $rel = strtolower(' ' . $relRaw . ' ');
        if (!$href || strpos($rel, 'icon') === false || strpos($rel, 'mask-icon') !== false) continue;
        $size = 0;
        if (preg_match_all('~(\d+)x(\d+)~i', $sizes, $sm)) $size = max(array_map('intval', $sm[1]));
        $isSvg = stripos($type, 'svg') !== false || preg_match('~\.svg(\?|$)~i', $href);
        if (strpos($rel, 'apple-touch-icon') !== false) $score = 500;
        elseif ($isSvg) $score = 700;
        elseif ($size >= 32 && $size <= 256) $score = 800 - abs(64 - $size);
        elseif ($size) $score = 400;
        else $score = 600;
        $scored[] = [$score, resolve_url($href, $base)];
    }
    usort($scored, function ($a, $b) { return $b[0] - $a[0]; });
    return array_column($scored, 1);
}
// Returns the image type if these bytes are a real, safe image; null otherwise.
function sniff_image($b) {
    if (strlen($b) < 20) return null;
    if (strncmp($b, "\x89PNG", 4) === 0) return 'png';
    if (strncmp($b, "\x00\x00\x01\x00", 4) === 0) return 'ico';
    if (strncmp($b, 'GIF8', 4) === 0) return 'gif';
    if (strncmp($b, "\xFF\xD8\xFF", 3) === 0) return 'jpg';
    if (strncmp($b, 'RIFF', 4) === 0 && substr($b, 8, 4) === 'WEBP') return 'webp';
    $head = ltrim(substr($b, 0, 1000));
    if (preg_match('~^(<\?xml[^>]*>\s*)?(<!--.*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]~is', $head)) {
        return hub_svg_safe($b) ? 'svg' : null;   // nothing that can run code or load other files
    }
    return null;
}
function get_image($url) {
    if (stripos($url, 'data:image') === 0) {
        if (!preg_match('~^data:image/[^;,]+(;base64)?,(.*)$~is', $url, $m)) return null;
        $b = $m[1] ? base64_decode($m[2]) : rawurldecode($m[2]);
        $ext = sniff_image((string)$b);
        return $ext ? [$b, $ext] : null;
    }
    $p = parse_url($url);
    if (empty($p['host']) || !host_ok($p['host'])) return null;
    [$b, , $code] = fetch_url($url, 600 * 1024);
    if ($code < 200 || $code >= 300 || strlen($b) > 500 * 1024) return null;
    $ext = sniff_image($b);
    return $ext ? [$b, $ext] : null;
}

/* ======================= page titles ======================= */

function clean_title($t) {
    $t = html_entity_decode(strip_tags((string)$t), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $t = trim(preg_replace('~\s+~u', ' ', $t) ?? $t);
    if (preg_match('~^(.{200}).~us', $t, $m)) $t = rtrim($m[1]) . '…'; // at most 200 characters
    return $t;
}
// Titles that come from bot checks, error pages or bare site names: not useful as a link name.
function useless_title($t) {
    return $t === '' || (bool)preg_match('~^(just a moment|attention required|access denied|robot check|are you a (human|robot)|please wait|please verify|verify(ing)? you are|security check|captcha|one more step|forbidden|not found|page not found|404|403|error|blocked|sign in|log ?in|before you continue( to [a-z ]+)?|consent|reddit - (please wait.*|dive into anything)|amazon(\.[a-z]{2,3}){1,2}|x|twitter|youtube)[\s.…!]*$~iu', $t);
}
function to_utf8($s, $contentType, $html) {
    if (preg_match('//u', $s)) return $s;
    // Not valid UTF-8, so a declared UTF-8 is wrong: try the page's own charset, the header's, then Windows-1252.
    $tries = [];
    if (preg_match('~<meta[^>]+charset\s*=\s*["\']?([\w-]+)~i', $html, $m)) $tries[] = $m[1];
    if (preg_match('~charset=["\']?([\w-]+)~i', $contentType, $m)) $tries[] = $m[1];
    $tries[] = 'Windows-1252';
    foreach (array_unique($tries) as $cs) {
        if (preg_match('~^utf-?8$~i', $cs)) continue;
        $r = function_exists('mb_convert_encoding') ? @mb_convert_encoding($s, 'UTF-8', $cs) : false;
        if (($r === false || $r === '') && function_exists('iconv')) $r = @iconv($cs, 'UTF-8//IGNORE', $s);
        if (is_string($r) && $r !== '' && preg_match('//u', $r)) return $r;
    }
    return '';
}
// The <title> first (that's what the browser tab shows), then the share titles.
function titles_from_html($html) {
    $out = [];
    $head = preg_split('~</head>~i', $html)[0];
    if (preg_match('~<title[^>]*>(.*?)</title>~is', $head, $m)) $out[] = $m[1];
    foreach (['og:title', 'twitter:title'] as $prop) {
        if (preg_match('~<meta[^>]+(?:property|name)\s*=\s*["\']' . preg_quote($prop, '~') . '["\'][^>]*>~i', $html, $m)
            && preg_match('~content\s*=\s*(["\'])(.*?)\1~is', $m[0], $c)) $out[] = $c[2];
    }
    return $out;
}
// Titles that can be built without visiting the page, or need a site's own lookup service.
function special_title($url, $host) {
    $h = preg_replace('~^(www|m|mobile)\.~', '', $host);
    $p = parse_url($url);
    parse_str($p['query'] ?? '', $q);
    $path = $p['path'] ?? '/';
    $words = function ($s) { return clean_title(str_replace('+', ' ', (string)$s)); };

    // Search result pages: the browser tab shows the search words, which are in the address
    if (preg_match('~(^|\.)google\.[a-z.]{2,8}$~', $h)) {
        if ($path === '/search' && !empty($q['q'])) return $words($q['q']) . ' - Google Search';
        if ($path === '/url') { // a Google redirect link: name it after where it leads
            $to = (string)($q['url'] ?? $q['q'] ?? '');
            if (preg_match('~^https?://~i', $to)) return ['redirect' => $to];
        }
    }
    if (preg_match('~(^|\.)bing\.com$~', $h) && $path === '/search' && !empty($q['q'])) return $words($q['q']) . ' - Search';
    if (preg_match('~(^|\.)duckduckgo\.com$~', $h) && !empty($q['q'])) return $words($q['q']) . ' at DuckDuckGo';
    if (preg_match('~(^|\.)youtube\.com$~', $h) && $path === '/results' && !empty($q['search_query'])) return $words($q['search_query']) . ' - YouTube';
    if (preg_match('~(^|\.)amazon\.([a-z.]{2,6})$~', $h, $am) && $path === '/s' && !empty($q['k'])) return 'Amazon.' . $am[2] . ' : ' . $words($q['k']);

    // IMDb blocks servers; its own search-box service knows every title and person
    if (preg_match('~(^|\.)imdb\.com$~', $h) && preg_match('~/(?:title|name)/((?:tt|nm)\d+)~', $path, $m)) {
        $id = $m[1];
        [$b, , $code] = fetch_url('https://v3.sg.media-imdb.com/suggestion/' . $id[0] . '/' . $id . '.json', 300 * 1024);
        $j = $code === 200 ? json_decode($b, true) : null;
        foreach ((is_array($j) && is_array($j['d'] ?? null)) ? $j['d'] : [] as $e) {
            if (($e['id'] ?? '') !== $id || empty($e['l'])) continue;
            $name = clean_title($e['l']);
            if ($id[0] === 'n') return "$name - IMDb";
            $kind = strtolower((string)($e['q'] ?? ''));
            $yr = str_replace('-', '–', (string)($e['yr'] ?? $e['y'] ?? ''));
            if (preg_match('~^(\d{4})–\1$~u', $yr, $one)) $yr = $one[1]; // "2019–2019" is shown as "2019"
            if (substr($yr, -3) === '–') $yr .= ' '; // still running: "2019– "
            if (strpos($kind, 'mini') !== false) return "$name (TV Mini Series $yr) - IMDb";
            if (strpos($kind, 'tv series') !== false) return "$name (TV Series $yr) - IMDb";
            if (strpos($kind, 'tv movie') !== false) return "$name (TV Movie $yr) - IMDb";
            return $yr !== '' ? "$name ($yr) - IMDb" : "$name - IMDb";
        }
        return '';
    }

    // YouTube channels, playlists pages and other non-video pages: the embed service only knows videos
    if (preg_match('~(^|\.)youtube\.com$~', $h) && !preg_match('~^/(watch|shorts/|embed/|live/)~', $path)) {
        // skip the cookie-consent page, and stop reading as soon as the title has arrived (channel pages are huge)
        [$html, , $code] = fetch_url($url, 3 * 1024 * 1024, ['Cookie: SOCS=CAI; CONSENT=YES+'], '</title>');
        if ($code >= 200 && $code < 400 && preg_match('~<title[^>]*>(.*?)</title>~is', $html, $m)) {
            $t = clean_title(to_utf8($m[1], '', $html));
            if (!useless_title($t)) return preg_match('~ - YouTube$~', $t) ? $t : "$t - YouTube";
        }
        return '';
    }
    return null; // not a special case
}

// Sites that only build their title with JavaScript, or block servers: ask their official embed service.
function oembed_title($url, $host) {
    $h = preg_replace('~^(www|m|old|new|mobile)\.~', '', $host);
    if (preg_match('~(^|\.)reddit\.com$~', $h)) $ep = 'https://www.reddit.com/oembed?url=' . rawurlencode($url);
    elseif (preg_match('~(^|\.)(youtube\.com|youtu\.be)$~', $h)) $ep = 'https://www.youtube.com/oembed?format=json&url=' . rawurlencode($url);
    elseif (preg_match('~(^|\.)(x\.com|twitter\.com)$~', $h) && preg_match('~/status/\d+~', $url)) $ep = 'https://publish.twitter.com/oembed?omit_script=1&dnt=true&url=' . rawurlencode($url);
    else return '';
    [$b, , $code] = fetch_url($ep, 300 * 1024);
    $j = $code === 200 ? json_decode($b, true) : null;
    if (!is_array($j)) return '';
    if (strpos($ep, 'twitter.com') !== false) {
        $name = clean_title($j['author_name'] ?? '');
        $text = '';
        if (!empty($j['html']) && preg_match('~<p[^>]*>(.*?)</p>~is', $j['html'], $m)) $text = clean_title(preg_replace('~<br\s*/?>~i', ' ', $m[1]));
        return $name === '' ? '' : ($text !== '' ? "$name on X: \"$text\"" : "$name on X");
    }
    $t = clean_title($j['title'] ?? '');
    if ($t === '') return '';
    if (strpos($ep, 'reddit.com') !== false && preg_match('~/r/([A-Za-z0-9_]+)~', $url, $m)) $t .= ' : r/' . $m[1];
    if (strpos($ep, 'youtube.com') !== false) $t .= ' - YouTube';
    return $t;
}

/* ======================= request setup ======================= */

$action = (string)($_GET['action'] ?? 'get');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Hub: the login is shared by every page. Links' own login actions below just use it.
$auth  = hub_auth();
$setup = $auth === null;
$AUTH  = hub_admin();

if ($method === 'POST') {
    if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'bookmarks') out(403, ['error' => 'Missing request header.']);
}
function need_post() { global $method; if ($method !== 'POST') out(405, ['error' => 'Use POST.']); }
function need_auth() {
    global $AUTH, $method;
    if (!$AUTH) out(401, ['error' => 'Log in first.']);
    if ($method === 'POST' && !hub_csrf_ok()) out(403, ['error' => 'Security check failed. Reload the page.']);
}

/* ======================= routes ======================= */

switch ($action) {

case 'get':
    $raw = current_raw();
    if ($AUTH) {
        $vd = json_decode($raw, true);
        $visits = json_encode((object)(is_array($vd) ? visits_for($vd) : []), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        echo '{"auth":true,"setup":false,"rev":"' . md5($raw) . '","data":' . $raw . ',"visits":' . $visits . '}';   // only you see the counts
        exit;
    }
    $d = json_decode($raw, true);
    if (!is_array($d)) $d = ['tabs' => []];
    $s = is_array($d['settings'] ?? null) ? $d['settings'] : [];
    if (!empty($s['private'])) {
        // private site: only send what's needed to draw the login screen
        $look = ['settings' => array_intersect_key($s, array_flip(['title', 'dark', 'light', 'font', 'fontCustom', 'fontSize', 'sizes'])), 'tabs' => []];
        fix_objects($look);
        out(200, ['auth' => false, 'setup' => $setup, 'locked' => true, 'data' => $look]);
    }
    $d['tabs'] = array_values(array_filter($d['tabs'] ?? [], function ($t) { return empty($t['private']) && empty($t['enc']); }));
    if (is_array($d['settings'] ?? null)) unset($d['settings']['vault']);
    fix_objects($d);
    out(200, ['auth' => false, 'setup' => $setup, 'data' => $d]);

case 'visit':   // a click on a link, from anyone who can see it: {url}. Counted once per browser per link every 30 minutes.
    need_post();
    $b = body(1);
    $d = json_decode(current_raw(), true); $d = is_array($d) ? $d : [];
    if (!$AUTH && !empty($d['settings']['private'])) out(200, ['ok' => true, 'counted' => false]);   // a private Links: visitors see nothing to click
    [$counted, $n] = visits_add((string)($b['url'] ?? ''), hub_ip() . '|' . ($_SERVER['HTTP_USER_AGENT'] ?? ''), $d, !$AUTH);
    out(200, $AUTH ? ['ok' => true, 'counted' => (bool)$counted, 'count' => $n] : ['ok' => true, 'counted' => (bool)$counted]);   // visitors never get the number

case 'logout':
    need_post();
    hub_end_session();
    out(200, ['ok' => true]);

case 'save':
    need_post(); need_auth();
    $b = body();
    $data = $b['data'] ?? null;
    if ($err = data_error($data)) out(400, ['error' => $err]);
    $lk = links_lock();   // released when the request ends (out() exits)
    if (!empty($b['rev']) && $b['rev'] !== md5(current_raw())) {
        links_unlock($lk);
        out(409, ['error' => 'Bookmarks were changed in another window. Reload the page to continue.']);
    }
    // The key of the encrypted tabs only changes through save_vault (which checks your password), never through a plain save.
    $cur = json_decode(current_raw(), true); $cur = is_array($cur) ? $cur : [];
    $curV = hub_norm_vault($cur['settings']['vault'] ?? null);
    if (!isset($data['settings']) || !is_array($data['settings'])) $data['settings'] = [];
    unset($data['settings']['vault']); if ($curV) $data['settings']['vault'] = $curV;
    hub_links_enc_clean($data);
    $oldById = []; foreach ($cur['tabs'] ?? [] as $ot) if (is_array($ot)) $oldById[(string)($ot['id'] ?? '')] = $ot;
    $newlyEnc = [];   // tabs that were readable until now and are encrypted in this save
    foreach ($data['tabs'] as $nt) if (!empty($nt['enc']) && isset($oldById[(string)($nt['id'] ?? '')]) && empty($oldById[(string)$nt['id']]['enc'])) $newlyEnc[] = $oldById[(string)$nt['id']];
    $map = organize_icons($data, $iconDir, ($auth['secret'] ?? ''));
    $rev = write_data($data, !empty($b['keep']));   // keep: a version first, so this save can be undone (Import Bookmarks)
    if ($newlyEnc) purge_readable_copies($newlyEnc, $iconDir, ($auth['secret'] ?? ''));
    links_unlock($lk);
    out(200, ['ok' => true, 'rev' => $rev, 'iconMap' => (object)$map]);

case 'backup':
    need_auth();
    $icons = [];
    foreach (array_merge(glob($iconDir . '/*') ?: [], glob($iconDir . '/*/*') ?: []) as $f) {
        $n = substr($f, strlen($iconDir) + 1);
        if (is_file($f) && preg_match('~^([a-z0-9-]+/)?[A-Za-z0-9._-]+\.(png|ico|gif|jpg|webp|svg)$~', $n)) $icons[$n] = base64_encode(file_get_contents($f));
    }
    header('Content-Disposition: attachment; filename="bookmarks-backup-' . date('Y-m-d') . '.json"');
    out(200, ['format' => 'bookmarks-backup', 'version' => 2, 'created' => date('c'),
        'data' => json_decode(current_raw(), true), 'icons' => $icons]);

case 'restore':
    need_post(); need_auth();
    @set_time_limit(120);
    $bk = body(40)['backup'] ?? null;
    if (!is_array($bk)) out(400, ['error' => 'That file is not a bookmarks backup.']);
    $icons = [];
    if (($bk['format'] ?? '') === 'bookmarks-backup') { $data = $bk['data'] ?? null; $icons = is_array($bk['icons'] ?? null) ? $bk['icons'] : []; }
    else $data = $bk;
    if (is_array($data) && !isset($data['tabs']) && isset($data['categories']) && is_array($data['categories'])) {
        $data = ['tabs' => [['id' => 'main', 'title' => 'Bookmarks', 'categories' => $data['categories']]]];
    }
    if ($err = data_error($data)) out(400, ['error' => 'That file is not a usable backup. ' . $err]);
    need_dir($iconDir);
    $saved = 0; $skipped = 0;
    foreach ($icons as $name => $b64) {
        $name = (string)$name;
        if (!preg_match('~^((?:[a-z0-9-]+/)?[A-Za-z0-9_-][A-Za-z0-9._-]*)\.(png|ico|gif|jpg|webp|svg)$~', $name, $m) || strpos($name, '..') !== false) { $skipped++; continue; }
        $bytes = base64_decode((string)$b64, true);
        if ($bytes === false || strlen($bytes) > 500 * 1024 || sniff_image($bytes) !== $m[2]) { $skipped++; continue; }
        if (strpos($name, '/') !== false) need_dir($iconDir . '/' . dirname($name));
        if (@file_put_contents($iconDir . '/' . $name, $bytes) === false) out(500, ['error' => 'Could not write to the icons folder. Check its permissions (755).']);
        $saved++;
    }
    $lk = links_lock();
    hub_links_enc_clean($data);   // the backup's encrypted tabs come with the backup's own key
    organize_icons($data, $iconDir, ($auth['secret'] ?? ''));
    $rev = write_data($data, true);
    links_unlock($lk);
    out(200, ['ok' => true, 'rev' => $rev, 'icons' => $saved, 'skipped' => $skipped]);

case 'backups':
    need_auth();
    $list = [];
    foreach (backup_files() as $f) {
        $d = json_decode(strip_guard((string)@file_get_contents($f)), true);
        $list[] = ['name' => basename($f), 'time' => filemtime($f), 'tabs' => is_array($d) ? count($d['tabs'] ?? []) : 0, 'links' => is_array($d) ? count_links($d) : 0];
    }
    out(200, ['backups' => $list]);

case 'rollback':
    need_post(); need_auth();
    $name = (string)(body()['name'] ?? '');
    if (!preg_match('~^bookmarks-[0-9A-Za-z-]+\.php$~', $name) || !is_file($backupDir . '/' . $name)) out(404, ['error' => 'That backup no longer exists.']);
    $data = json_decode(strip_guard((string)file_get_contents($backupDir . '/' . $name)), true);
    if (is_array($data) && !isset($data['tabs']) && isset($data['categories'])) $data = ['tabs' => [['id' => 'main', 'title' => 'Bookmarks', 'categories' => $data['categories']]]];
    if ($err = data_error($data)) out(400, ['error' => 'That backup cannot be used. ' . $err]);
    $lk = links_lock();
    // an earlier version of this site: the key is the one this site uses now (it never changes, it is only re-wrapped)
    $cur = json_decode(current_raw(), true); $curV = hub_norm_vault(is_array($cur) ? ($cur['settings']['vault'] ?? null) : null);
    if (is_array($data) && $curV) { if (!isset($data['settings']) || !is_array($data['settings'])) $data['settings'] = []; $data['settings']['vault'] = $curV; }
    hub_links_enc_clean($data);
    organize_icons($data, $iconDir, ($auth['secret'] ?? ''));
    $rev = write_data($data, true);
    links_unlock($lk);
    out(200, ['ok' => true, 'rev' => $rev]);

case 'save_vault':   // set or change the wrapped key of the encrypted tabs: {vault, prev, pw}; needs the current website password
    need_post(); need_auth();
    $b = body();
    $v = hub_norm_vault($b['vault'] ?? null);
    if (!$v) out(400, ['error' => 'The key could not be prepared.']);
    if (($w = hub_rate_wait()) > 0) out(429, ['error' => 'Too many wrong tries. Try again in ' . max(1, (int)ceil($w / 60)) . ' minutes.']);
    $pw = (string)($b['pw'] ?? '');
    if ($pw === '' || !password_verify($pw, $auth['hash'])) { usleep(random_int(300000, 700000)); hub_rate_fail(); out(401, ['error' => 'That is not your current website password.']); }
    $prev = (string)($b['prev'] ?? '');
    $lk = links_lock();
    $cur = json_decode(current_raw(), true);
    if (!is_array($cur) || !isset($cur['tabs'])) { links_unlock($lk); out(500, ['error' => 'The bookmarks could not be read, so nothing was changed.']); }
    $curV = hub_norm_vault($cur['settings']['vault'] ?? null);
    // "prev" must be the wrap that is stored now, so a page that is out of date can never replace a key the tabs depend on
    if (!hash_equals($curV ? $curV['wrap'] : '', $prev)) { links_unlock($lk); out(409, ['error' => 'The encryption key was changed in another window. Reload the page.', 'vault' => $curV]); }
    if (!isset($cur['settings']) || !is_array($cur['settings'])) $cur['settings'] = [];
    $cur['settings']['vault'] = $v;
    $rev = write_data($cur);
    links_unlock($lk);
    out(200, ['ok' => true, 'vault' => $v, 'rev' => $rev]);

case 'remove_vault':   // the passphrase is being removed: {pw, prev, tabs: {tabId: {enc, categories}}}. The browser opened every encrypted tab; they become normal private tabs.
    need_post(); need_auth();
    $b = body();
    if (($w = hub_rate_wait()) > 0) out(429, ['error' => 'Too many wrong tries. Try again in ' . max(1, (int)ceil($w / 60)) . ' minutes.']);
    $pw = (string)($b['pw'] ?? '');
    if ($pw === '' || !password_verify($pw, $auth['hash'])) { usleep(random_int(300000, 700000)); hub_rate_fail(); out(401, ['error' => 'That is not your current website password.']); }
    $plain = is_array($b['tabs'] ?? null) ? $b['tabs'] : [];
    $lk = links_lock();
    $cur = json_decode(current_raw(), true);
    if (!is_array($cur) || !isset($cur['tabs'])) { links_unlock($lk); out(500, ['error' => 'The bookmarks could not be read, so nothing was changed.']); }
    $curV = hub_norm_vault($cur['settings']['vault'] ?? null);
    if (!$curV || !hash_equals($curV['wrap'], (string)($b['prev'] ?? ''))) { links_unlock($lk); out(409, ['error' => 'The encryption key was changed in another window. Reload the page.']); }
    foreach ($cur['tabs'] as $i => $t) {
        if (!is_array($t) || !hub_enc_ok($t['enc'] ?? null)) continue;
        $p = $plain[(string)($t['id'] ?? '')] ?? null;
        // every encrypted tab must come back, exactly as the browser opened it (a tab changed meanwhile is never overwritten)
        if (!is_array($p) || !is_array($p['categories'] ?? null) || !hash_equals($t['enc'], (string)($p['enc'] ?? ''))) { links_unlock($lk); out(409, ['error' => 'A tab changed in the meantime or could not be opened. Nothing was changed.']); }
        $cur['tabs'][$i]['categories'] = array_values($p['categories']); $cur['tabs'][$i]['private'] = true; unset($cur['tabs'][$i]['enc']);
    }
    if ($err = data_error($cur)) { links_unlock($lk); out(400, ['error' => $err]); }
    unset($cur['settings']['vault']);
    $rev = write_data($cur, true);   // the version before is kept, so this can be undone
    links_unlock($lk);
    out(200, ['ok' => true, 'rev' => $rev]);

case 'icon':
    need_post(); need_auth();
    @set_time_limit(40);
    $url = trim((string)(body()['url'] ?? ''));
    if (!preg_match('~^https?://~i', $url)) out(400, ['error' => 'Icons can only be fetched for http(s) links.']);
    $p = parse_url($url);
    $host = strtolower($p['host'] ?? '');
    if (!$host) out(400, ['error' => 'That URL has no domain.']);
    if (!host_ok($host)) out(400, ['error' => 'That address is on a private network, so its icon cannot be fetched.']);
    $origin = strtolower($p['scheme']) . '://' . $host . (isset($p['port']) ? ':' . $p['port'] : '');
    $cands = [];
    foreach (array_unique([$url, $origin . '/']) as $pg) {
        [$html, $final, , $ct] = fetch_url($pg, 400 * 1024);
        if ($html !== '' && (stripos($ct, 'html') !== false || stripos($html, '<link') !== false)) {
            $cands = array_merge($cands, icons_from_html($html, $final));
            $fp = parse_url($final);
            if (!empty($fp['host'])) $cands[] = $fp['scheme'] . '://' . $fp['host'] . (isset($fp['port']) ? ':' . $fp['port'] : '') . '/favicon.ico';
        }
        if ($cands) break;
    }
    $cands[] = $origin . '/favicon.ico';
    $cands[] = 'https://www.google.com/s2/favicons?domain=' . rawurlencode($host) . '&sz=64';
    $cands[] = 'https://icons.duckduckgo.com/ip3/' . rawurlencode($host) . '.ico';
    need_dir($iconDir);
    $safe = preg_replace('~[^a-z0-9.-]~', '_', $host) . (isset($p['port']) ? '_' . (int)$p['port'] : '');
    foreach (array_unique($cands) as $c) {
        $img = get_image($c);
        if (!$img) continue;
        [$bytes, $ext] = $img;
        foreach (glob($iconDir . '/' . $safe . '.*') ?: [] as $old) @unlink($old);
        if (@file_put_contents($iconDir . '/' . $safe . '.' . $ext, $bytes) === false) out(500, ['error' => 'Could not write to the icons folder. Check its permissions (755).']);
        out(200, ['icon' => 'icons/' . $safe . '.' . $ext . '?v=' . time()]);
    }
    out(404, ['error' => 'No icon found for ' . $host . '.' . (!empty($GLOBALS['fetch_err']) ? ' The server could not reach it (' . $GLOBALS['fetch_err'] . '). See Settings > Server check.' : ''), 'fallback' => !empty($GLOBALS['fetch_err']) ? 'https://www.google.com/s2/favicons?domain=' . rawurlencode($host) . '&sz=64' : '']);

case 'title':
    need_post(); need_auth();
    @set_time_limit(30);
    $url = trim((string)(body()['url'] ?? ''));
    if (!preg_match('~^https?://~i', $url)) out(400, ['error' => 'Titles can only be read from http(s) links.']);
    $host = strtolower((string)parse_url($url, PHP_URL_HOST));
    if (!$host) out(400, ['error' => 'That URL has no domain.']);
    if (!host_ok($host)) out(400, ['error' => 'That address is on a private network, so its title cannot be read.']);
    $title = special_title($url, $host);
    if (is_array($title)) { // a redirect link: use its destination
        $url = $title['redirect'];
        $host = strtolower((string)parse_url($url, PHP_URL_HOST));
        if (!$host || !host_ok($host)) out(400, ['error' => 'That link leads to an address whose title cannot be read.']);
        $title = special_title($url, $host);
        if (is_array($title)) $title = null;
    }
    if ($title === null) $title = oembed_title($url, $host);
    if (useless_title((string)$title)) {
        $title = '';
        [$html, , $code, $ct] = fetch_url($url, 2 * 1024 * 1024, [], '</head>');
        if ($html !== '' && $code >= 200 && $code < 400) {
            foreach (titles_from_html($html) as $raw) {
                $t = clean_title(to_utf8($raw, $ct, $html));
                if (!useless_title($t)) { $title = $t; break; }
            }
        }
    }
    if ($title === '') out(404, ['error' => 'This site did not share its page title with the server. Type the name yourself.']);
    out(200, ['title' => $title]);

default:
    out(404, ['error' => 'Unknown action.']);
}
