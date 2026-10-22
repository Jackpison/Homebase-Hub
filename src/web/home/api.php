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

require __DIR__ . '/lib.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
hub_headers();
hub_same_origin();

function out(array $d, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($d, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}
function body(): array
{
    $raw = (string) file_get_contents('php://input', false, null, 0, 2097153);   // settings and link data: never more than 2 MB
    if (strlen($raw) > 2097152) out(['error' => 'That is too much data.'], 413);
    $j = json_decode($raw, true);
    return is_array($j) ? $j : [];
}
function auth(): ?array { return hub_auth(); }
function is_admin(): bool { return hub_admin(); }
function require_post(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(['error' => 'Use POST.'], 405);
}
function require_admin(bool $post = true): void
{
    if ($post) require_post();
    if (!is_admin()) out(['error' => 'You are logged out. Log in again to keep editing.'], 401);
    $t = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_SERVER['HTTP_X_HUB_CSRF'] ?? '');   // header only: a token in the address would end up in server logs
    if (!is_string($t) || $t === '' || !hash_equals(hub_csrf(), $t)) out(['error' => 'Security check failed. Reload the page.'], 403);
}
function admin_payload(): array
{
    $s = load_site();
    $s['uploadsAdmin'] = list_uploads();
    $s['sourceInfo'] = all_sources($s);
    $s['keyInfo'] = API_KEYS;
    $s['poolStats'] = pool_stats($s);
    $s['limits'] = ['perColumn' => LINKS_PER_COLUMN, 'maxKeywords' => MAX_KEYWORDS, 'maxViews' => MAX_VIEWS, 'maxCustom' => MAX_CUSTOM_SOURCES,
                    'maxUploadMB' => MAX_UPLOAD_MB, 'piece' => upload_piece_bytes()];
    return $s;
}
function save_site(array $in): array
{
    $site = clean_site($in);
    home_snapshot();
    write_json(SITE_FILE, $site);
    prune_icons($site);
    // drop saved photos that no longer match (keywords changed)
    pool_update(function (&$p) use ($site) { pool_cleanup($p, $site); });
    return $site;
}
/** Earlier versions of the start page: at most one per 10 minutes, the last 40. */
function home_snapshot(): void
{
    if (!is_file(hub_jpath(SITE_FILE))) return;
    $vd = DATA_DIR . '/versions';
    if (!is_dir($vd)) @mkdir($vd, 0700, true);
    $files = glob($vd . '/*.php') ?: [];
    sort($files);
    if ($files && time() - filemtime(end($files)) < 600) return;
    @copy(hub_jpath(SITE_FILE), $vd . '/' . date('Ymd-His') . '.php');
    $files = glob($vd . '/*.php') ?: []; sort($files);
    while (count($files) > 40) @unlink(array_shift($files));
}
function received_file(string $field, int $maxBytes): array
{
    if (upload_too_big_for_host()) out(['error' => 'The file is bigger than your host accepts in one go (' . ini_get('post_max_size') . '). Reload the page and try again: big files are then sent in pieces.'], 413);
    $f = $_FILES[$field] ?? null;
    if (!$f || !is_array($f) || is_array($f['error'])) out(['error' => 'No file received.'], 400);
    if ($f['error'] === UPLOAD_ERR_INI_SIZE || $f['error'] === UPLOAD_ERR_FORM_SIZE) {
        out(['error' => 'File is bigger than your host allows (' . ini_get('upload_max_filesize') . '). Raise upload_max_filesize in your hosting PHP settings.'], 413);
    }
    if ($f['error'] !== UPLOAD_ERR_OK) out(['error' => 'Upload failed (code ' . $f['error'] . ').'], 400);
    if ($f['size'] > $maxBytes) out(['error' => 'File is over ' . round($maxBytes / 1048576, 1) . ' MB.'], 413);
    return $f;
}

$action = $_GET['action'] ?? '';

switch ($action) {

    /* ---------- auth ---------- */

    case 'state':
        out(['hasPassword' => auth() !== null, 'admin' => is_admin(), 'csrf' => is_admin() ? hub_csrf() : null]);

    case 'logout':
        require_post();
        hub_end_session();
        out(['ok' => true]);

    /* ---------- site data ---------- */

    case 'admin_data':
        require_admin(false);
        out(admin_payload());

    case 'save':
        require_admin();
        save_site(body());
        out(['ok' => true, 'site' => admin_payload(), 'public' => public_payload()]);

    /* ---------- link helpers ---------- */

    case 'get_title':
        require_admin();
        $url = clean_url(body()['url'] ?? '');
        if (!$url) out(['error' => 'Enter a valid web address first.'], 400);
        $r = http_get($url, ['Accept: text/html'], 600_000);
        if (isset($r['error']) || $r['status'] >= 400) out(['error' => 'Couldn\'t reach that site.'], 502);
        $html = $r['body'];
        $title = '';
        foreach (['~<meta[^>]+property=["\']og:site_name["\'][^>]*content=["\']([^"\']+)~i', '~<meta[^>]+content=["\']([^"\']+)["\'][^>]*property=["\']og:site_name~i', '~<title[^>]*>(.*?)</title>~is'] as $re) {
            if (preg_match($re, $html, $m)) { $title = $m[1]; break; }
        }
        $title = str_clip(html_entity_decode(strip_tags($title), ENT_QUOTES | ENT_HTML5, 'UTF-8'), 60);
        if ($title === '') out(['error' => 'That page has no title.'], 404);
        out(['title' => $title]);

    case 'fetch_icon':
        require_admin();
        $url = clean_url(body()['url'] ?? '');
        if (!$url) out(['error' => 'Enter a valid web address first.'], 400);
        $candidates = [];
        $r = http_get($url, ['Accept: text/html'], 600_000);
        if (!isset($r['error']) && $r['status'] < 400) {
            $base = $r['url'];
            if (preg_match('~<base[^>]+href=["\']([^"\']+)~i', $r['body'], $bm)) $base = resolve_url($base, $bm[1]);
            preg_match_all('~<link\b[^>]*>~i', $r['body'], $tags);
            $scored = [];
            foreach ($tags[0] as $tag) {
                if (!preg_match('~rel=["\']([^"\']+)~i', $tag, $rel) || !preg_match('~href=["\']([^"\']+)~i', $tag, $href)) continue;
                $rel = strtolower($rel[1]);
                if (!str_contains($rel, 'icon')) continue;
                if (preg_match('~\.svg(\?|$)~i', $href[1]) || stripos($tag, 'image/svg') !== false) continue; // SVG not allowed
                $size = preg_match('~sizes=["\'](\d+)x~i', $tag, $sz) ? (int) $sz[1] : (str_contains($rel, 'apple') ? 180 : 32);
                // Prefer regular icons (transparent) over apple-touch icons (solid square backgrounds)
                $score = (str_contains($rel, 'apple') || str_contains($rel, 'mask')) ? 100 + min($size, 99) : 1000 + min($size, 256);
                $scored[resolve_url($base, $href[1])] = $score;
            }
            arsort($scored);
            $candidates = array_keys($scored);
            $p = parse_url($base);
            $candidates[] = ($p['scheme'] ?? 'https') . '://' . ($p['host'] ?? '') . '/favicon.ico';
        }
        $host = (string) parse_url($url, PHP_URL_HOST);
        $candidates[] = 'https://www.google.com/s2/favicons?sz=128&domain=' . urlencode($host);
        foreach (array_slice(array_unique($candidates), 0, 6) as $c) {
            $ir = http_get($c, ['Accept: image/*'], MAX_ICON_KB * 1024);
            if (isset($ir['error']) || $ir['status'] !== 200) continue;
            if ($path = store_icon($ir['body'])) out(['path' => $path]);
        }
        out(['error' => 'Couldn\'t find an icon for that site. Upload one instead.'], 404);

    case 'upload_icon':
        require_admin();
        $f = received_file('file', MAX_ICON_KB * 1024);
        $path = store_icon((string) file_get_contents($f['tmp_name']));
        if (!$path) out(['error' => 'Use a PNG, JPG, WebP, GIF or ICO image.'], 415);
        out(['path' => $path]);

    /* ---------- backgrounds ---------- */

    case 'refill':
        // Called by visitors' browsers in the background to top up saved photos.
        // Anyone can call this, so it does nothing (no scan, no write) unless a source really is short of photos.
        $site = load_site();
        if (!pool_needs_refill($site)) out(['added' => [], 'busy' => false]);
        $r = pool_refill($site, 25);
        out(['added' => $r['added'], 'busy' => $r['busy']]);

    case 'seen':
        // A background was shown. After MAX_VIEWS it's deleted and replaced.
        require_post();
        $r = pool_seen((string) (body()['url'] ?? ''));
        out(['removed' => $r['removed']]);

    case 'photo_now':
        // "Preview" in the editor: download one new item from this source right now.
        require_admin();
        $src = (string) (body()['src'] ?? '');
        $site = load_site();
        $all = all_sources($site);
        if (!isset($all[$src])) out(['error' => 'Save this source first, then preview.'], 400);
        $keyName = SOURCES[$src]['key'] ?? '';
        if ($keyName && ($site['bg']['keys'][$keyName] ?? '') === '') out(['error' => 'Add your ' . API_KEYS[$keyName]['name'] . ' key and save first.'], 400);
        $site['bg']['sources'][$src] = true;
        $r = pool_refill($site, 60, $src);
        if ($r['busy']) out(['error' => 'Photos are downloading right now. Try again in a few seconds.'], 409);
        if ($r['added']) out(['photo' => $r['added'][0], 'stats' => pool_stats($site)]);
        $have = array_values(array_filter(pool_load()['items'], fn($i) => $i['src'] === $src && pool_item_valid($i, $site)));
        if ($have && !$r['error']) out(['photo' => pool_public($have[array_rand($have)]), 'stats' => pool_stats($site)]);
        out(['error' => $all[$src]['name'] . ': ' . ($r['error'] ?: 'nothing new available right now.'), 'stats' => pool_stats($site)], 502);

    case 'test_source':
        // Try a custom source without saving it: report what was found.
        require_admin();
        $c = clean_custom(body());
        if (!$c) out(['error' => 'Enter a valid address starting with https://'], 400);
        $kw = keywords(load_site()['bg']['query'])[0];
        if ($c['kind'] === 'image') {
            $tmp = tempnam(sys_get_temp_dir(), 'tst');
            $r = http_get(custom_url($c, $kw), ['Accept: image/*,video/*'], 32_000_000, 30, $tmp);   // straight into a file, not into memory
            if (isset($r['error'])) { @unlink($tmp); out(['error' => $r['error']], 502); }
            if ($r['status'] !== 200) { @unlink($tmp); out(['error' => 'The address answered HTTP ' . $r['status'] . '.'], 502); }
            $mime = detect_mime($tmp); $size = @getimagesize($tmp); @unlink($tmp);
            if (!str_starts_with($mime, 'image/') && !str_starts_with($mime, 'video/')) out(['error' => "That address returned $mime, not an image or video."], 502);
            out(['ok' => true, 'message' => 'Works. Got ' . ($size ? $size[0] . '×' . $size[1] . ' ' : '') . $mime . '.' . (str_contains($c['url'], '{random}') ? '' : ' Add {random} to the address if it returns the same image every time.')]);
        }
        [$items, $err] = custom_list($c, $kw, false);
        if (!$items) out(['error' => $err ?: 'Nothing found.'], 502);
        out(['ok' => true, 'message' => 'Works. Found ' . count($items) . ' item' . (count($items) === 1 ? '' : 's') . '. First: ' . $items[0]['url'], 'sample' => $items[0]]);

    case 'upload':
        require_admin();
        $f = received_file('file', MAX_UPLOAD_MB * 1048576);
        $mime = detect_mime($f['tmp_name']);
        if (!isset(BG_TYPES[$mime])) out(['error' => 'Use JPG, PNG, WebP, GIF, AVIF, MP4 or WebM.'], 415);
        ensure_dir(UPLOAD_DIR);
        $name = bin2hex(random_bytes(8)) . '.' . BG_TYPES[$mime];
        if (!move_uploaded_file($f['tmp_name'], UPLOAD_DIR . '/' . $name)) {
            out(['error' => 'Couldn\'t save the file. Set the uploads folder permissions to 755.'], 500);
        }
        chmod(UPLOAD_DIR . '/' . $name, 0644);
        out(['ok' => true, 'uploads' => list_uploads()]);

    /* Big files arrive in pieces (each under the host's limit), are joined here, then checked like a normal upload.
       Fields: id (16 hex), index (0..), total (pieces), size (bytes of the whole file); the piece is the file field "piece". */
    case 'upload_chunk':
        require_admin();
        $id = (string) ($_POST['id'] ?? ''); $index = (int) ($_POST['index'] ?? -1); $total = (int) ($_POST['total'] ?? 0); $size = (int) ($_POST['size'] ?? 0);
        if (!preg_match('/^[a-f0-9]{16}$/', $id) || $total < 1 || $total > 5000 || $index < 0 || $index >= $total) out(['error' => 'Bad upload piece.'], 400);
        if ($size < 1 || $size > MAX_UPLOAD_MB * 1048576) out(['error' => 'File is over ' . MAX_UPLOAD_MB . ' MB.'], 413);
        $f = received_file('piece', upload_piece_bytes() + 1048576);
        $tmpDir = DATA_DIR . '/upload-tmp';
        ensure_dir($tmpDir);
        foreach (glob($tmpDir . '/*') ?: [] as $old) if (filemtime($old) < time() - 7200) @unlink($old);   // pieces of uploads abandoned 2 hours ago
        $part = $tmpDir . '/' . $id . '.part'; $meta = $tmpDir . '/' . $id . '.next';
        $next = is_file($meta) ? (int) file_get_contents($meta) : 0;
        if ($index === $next - 1) out(['ok' => true, 'next' => $next]);   // the same piece sent again (a retry): already have it
        if ($index !== $next) out(['error' => 'Upload pieces arrived out of order. Try again.'], 409);
        $in = fopen($f['tmp_name'], 'rb'); $outF = fopen($part, $index === 0 ? 'wb' : 'ab');
        if (!$in || !$outF) out(['error' => 'Couldn\'t save the file. Check the site-data folder permissions.'], 500);
        stream_copy_to_stream($in, $outF); fclose($in); fclose($outF);
        clearstatcache(true, $part);
        if (filesize($part) > $size) { @unlink($part); @unlink($meta); out(['error' => 'The upload was larger than announced.'], 400); }
        file_put_contents($meta, (string) ($index + 1));
        if ($index < $total - 1) out(['ok' => true, 'next' => $index + 1]);
        // last piece: the whole file is here
        @unlink($meta);
        if (filesize($part) !== $size) { @unlink($part); out(['error' => 'The upload is incomplete. Try again.'], 400); }
        $mime = detect_mime($part);
        if (!isset(BG_TYPES[$mime])) { @unlink($part); out(['error' => 'Use JPG, PNG, WebP, GIF, AVIF, MP4 or WebM.'], 415); }
        ensure_dir(UPLOAD_DIR);
        $name = bin2hex(random_bytes(8)) . '.' . BG_TYPES[$mime];
        if (!@rename($part, UPLOAD_DIR . '/' . $name)) { @unlink($part); out(['error' => 'Couldn\'t save the file. Set the uploads folder permissions to 755.'], 500); }
        @chmod(UPLOAD_DIR . '/' . $name, 0644);
        out(['ok' => true, 'uploads' => list_uploads()]);

    case 'delete_upload':
        require_admin();
        $file = (string) (body()['file'] ?? '');
        if (!preg_match('/^[a-f0-9]{16}\.[a-z0-9]+$/', $file)) out(['error' => 'Invalid file name.'], 400);
        if (is_file(UPLOAD_DIR . '/' . $file)) unlink(UPLOAD_DIR . '/' . $file);
        out(['ok' => true, 'uploads' => list_uploads()]);

    default:
        out(['error' => 'Unknown action.'], 404);
}
