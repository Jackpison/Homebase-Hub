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
 * Hub core API (web/core-data/api.php?action=...)
 *
 *  GET  state                       what the shared bar needs (+ settings when logged in)
 *  POST setup      {code,password}  first password (needs the code from site-data/core/SETUP-CODE.php)
 *  POST login      {password,code,trust}  code = 6-digit two-step code or a recovery code, when two-step is on;
 *                                   trust = skip the code (and the Telegram question) on this browser for 30 days
 *  POST logout
 *  POST password   {current,password,vault,prev}  change password; other devices are logged out. The backup key
 *                                   (when it uses the website password) follows; vault = Info's re-wrapped key, if any
 *  POST logoutall                          log out every other device
 *  POST twostep_begin                      new secret for an authenticator app
 *  POST twostep_enable {code}              turn two-step on; returns recovery codes (shown once)
 *  POST twostep_disable {password}
 *  POST recovery_new {password}            new recovery codes
 *  POST settings   {settings}
 *  GET  changelog                          the text of web/docs/CHANGELOG.md, for the Changelog section in Settings
 *  GET  favicon?domain=..&sz=..            Tools > Favicon: a website's icon as a PNG (open to visitors, 60 a visitor per 10 minutes)
 *  GET  backup_overview                    parts, tabs and earlier versions for the Backup panel
 *  GET  backup?parts=...&links=..&info=..  downloads the backup file  (t = security token)
 *  GET  manifest     the web app manifest (public)
 *  POST restore    {backup, pick, mode}
 *  POST version_restore {app, id}
 *
 * Every POST needs the same-site checks; everything after login also needs X-Hub-CSRF.
 */
require __DIR__ . '/lib/boot.php';
require __DIR__ . '/lib/backup.php';
hub_headers();
header('Content-Type: application/json; charset=utf-8');
hub_same_origin();

$action = (string)($_GET['action'] ?? 'state');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function body(int $maxMB = 1): array {
    $raw = (string)file_get_contents('php://input', false, null, 0, $maxMB * 1048576 + 1);
    if (strlen($raw) > $maxMB * 1048576) hub_json(413, ['ok' => false, 'error' => "That's larger than $maxMB MB."]);
    $j = json_decode($raw, true);
    return is_array($j) ? $j : [];
}
function need_post(): void { global $method; if ($method !== 'POST') hub_json(405, ['ok' => false, 'error' => 'Use POST.']); }
function need_admin(bool $csrf = true): void {
    if (!hub_admin()) hub_json(401, ['ok' => false, 'error' => 'You are logged out. Log in again.']);
    if ($csrf) {
        $t = (string)($_SERVER['HTTP_X_HUB_CSRF'] ?? '');   // header only: a token in the address would end up in server logs
        if ($t === '' || !hash_equals(hub_csrf(), $t)) hub_json(403, ['ok' => false, 'error' => 'Security check failed. Reload the page.']);
    }
}
/** Re-checks the password inside Settings, with the same lockout as the login (so a stolen session can't guess it). */
function need_password(string $pw, string $msg = 'Wrong password.'): array {
    if (($w = hub_rate_wait()) > 0) hub_json(429, ['ok' => false, 'error' => 'Too many wrong tries. Try again in ' . max(1, (int)ceil($w / 60)) . ' minutes.']);
    $a = hub_auth();
    if ($pw === '' || !password_verify($pw, $a['hash'])) { usleep(random_int(300000, 700000)); hub_rate_fail(); hub_json(401, ['ok' => false, 'error' => $msg]); }
    return $a;
}
/** Image type from the file's own first bytes (never from what the upload claims). */
function image_ext(string $bin): string {
    if (strncmp($bin, "\x89PNG", 4) === 0) return 'png';
    if (strncmp($bin, "\xFF\xD8\xFF", 3) === 0) return 'jpg';
    if (strncmp($bin, 'GIF8', 4) === 0) return 'gif';
    if (strncmp($bin, 'RIFF', 4) === 0 && substr($bin, 8, 4) === 'WEBP') return 'webp';
    if (strncmp($bin, "\x00\x00\x01\x00", 4) === 0) return 'ico';
    return '';
}
function new_recovery(array &$a): array {
    $abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; $codes = []; $a['recovery'] = [];
    for ($n = 0; $n < 8; $n++) {
        $c = ''; for ($i = 0; $i < 10; $i++) $c .= $abc[random_int(0, 31)];
        $codes[] = substr($c, 0, 5) . '-' . substr($c, 5);
        $a['recovery'][] = password_hash($c, PASSWORD_DEFAULT);
    }
    return $codes;
}
/** Earlier versions of every part, newest first. */
function versions_list(): array {
    $map = ['links' => [hub_dir('links') . '/backups', 'bookmarks-*.php'], 'info' => [hub_dir('info') . '/versions', '*.php'],
            'cards' => [hub_dir('cards') . '/versions', '*.php'], 'tasks' => [hub_dir('tasks') . '/versions', '*.php'], 'home' => [hub_dir('home') . '/versions', '*.php']];
    $out = [];
    foreach ($map as $app => [$dir, $pat]) {
        foreach (glob("$dir/$pat") ?: [] as $f) $out[] = ['app' => $app, 'id' => basename($f), 'time' => filemtime($f), 'size' => filesize($f)];
    }
    usort($out, function ($a, $b) { return $b['time'] - $a['time']; });
    return array_slice($out, 0, 80);
}

switch ($action) {

case 'manifest':   // GET: the web app manifest for "Add to Home Screen" (public: name, icons, colours, page names; nothing private)
    if ($method !== 'GET') hub_json(405, ['ok' => false, 'error' => 'Use GET.']);
    header('Content-Type: application/manifest+json; charset=utf-8');
    header('Cache-Control: no-cache');
    echo json_encode(hub_manifest(hub_settings(), hub_site_path((string)($_SERVER['SCRIPT_NAME'] ?? '/web/core-data/api.php')), HUB_PUBLIC), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;

case 'state':
    // after the page has its answer: send any Telegram reminders that are due (at most every 10 minutes)
    register_shutdown_function(function () {
        if (function_exists('fastcgi_finish_request')) fastcgi_finish_request();
        elseif (function_exists('litespeed_finish_request')) litespeed_finish_request();
        else return;   // can't answer first on this server: the cron job does the sending
        try { require_once __DIR__ . '/lib/notify.php'; nt_tick(); } catch (Throwable $e) {}
    });
    hub_json(200, hub_public_state());

/* ---- Settings > Telegram ---- */
case 'notify':
    need_admin(false);
    require_once __DIR__ . '/lib/notify.php';
    hub_json(200, nt_view(nt_load()));

case 'notify_save':
case 'notify_find':
case 'notify_test':
case 'notify_run':
case 'notify_backup':
    need_post(); need_admin();
    require_once __DIR__ . '/lib/notify.php';
    $b = body(); $d = nt_load();
    $tok = trim((string)($b['token'] ?? ''));
    if ($tok !== '' && !nt_token_ok($tok)) hub_json(400, ['ok' => false, 'error' => 'That doesn\'t look like a bot token. It looks like 123456789:AAE… and comes from @BotFather.']);
    if ($tok !== '' && $tok !== $d['token']) { $d['token'] = $tok; $d['chat'] = ''; $d['chatName'] = ''; }
    if ($url = nt_site_url()) $d['url'] = $url;
    if ($action === 'notify_save') {
        if (!empty($b['clearToken'])) { $d['token'] = ''; $d['chat'] = ''; $d['chatName'] = ''; $d['on'] = false; }
        if (isset($b['chat'])) { $c = trim((string)$b['chat']); if ($c !== '' && !preg_match('/^-?\d{3,20}$/', $c)) hub_json(400, ['ok' => false, 'error' => 'The chat ID is a number, like 123456789.']); if ($c !== $d['chat']) $d['chatName'] = ''; $d['chat'] = $c; }
        foreach (['on', 'tasks', 'timed', 'backup', 'login', 'bkEnc'] as $k) if (isset($b[$k])) $d[$k] = !empty($b[$k]);
        if (isset($b['bkEvery'])) $d['bkEvery'] = in_array((int)$b['bkEvery'], [0, 1, 3, 7, 14, 30], true) ? (int)$b['bkEvery'] : 0;
        if (isset($b['hour'])) $d['hour'] = max(0, min(23, (int)$b['hour']));
        if ($d['on'] && ($d['token'] === '' || $d['chat'] === '')) $d['on'] = false;
        nt_save_keys($d, NT_USER_KEYS);
        hub_json(200, nt_view($d));
    }
    if ($d['token'] === '') hub_json(400, ['ok' => false, 'error' => 'Add the bot token first.']);
    if ($action === 'notify_find') {   // the chats that wrote to the bot recently (you send it /start first)
        nt_save_keys($d, NT_USER_KEYS);
        $r = nt_tg($d['token'], 'getUpdates', ['limit' => 50, 'allowed_updates' => ['message']]);
        if (empty($r['ok'])) hub_json(400, ['ok' => false, 'error' => 'Telegram: ' . ($r['description'] ?? 'no answer')]);
        $chats = [];
        foreach ($r['result'] ?? [] as $u) {
            $c = $u['message']['chat'] ?? null; if (!is_array($c) || !isset($c['id'])) continue;
            $chats[(string)$c['id']] = ['id' => (string)$c['id'], 'name' => trim(($c['title'] ?? '') ?: (($c['first_name'] ?? '') . ' ' . ($c['last_name'] ?? '')) . (isset($c['username']) ? ' (@' . $c['username'] . ')' : ''))];
        }
        if (count($chats) === 1) { $one = reset($chats); $d['chat'] = $one['id']; $d['chatName'] = $one['name']; nt_save_keys($d, NT_USER_KEYS); }
        hub_json(200, ['ok' => true, 'chats' => array_values($chats)] + nt_view($d));
    }
    if ($d['chat'] === '') hub_json(400, ['ok' => false, 'error' => 'Find your chat first (send /start to your bot, then click Find My Chat).']);
    if ($action === 'notify_test') {
        $r = nt_send($d, '✅ <b>' . nt_h(hub_settings()['siteName']) . '</b>: reminders will arrive in this chat.');
        if (empty($r['ok'])) hub_json(400, ['ok' => false, 'error' => 'Telegram: ' . ($r['description'] ?? 'no answer')]);
        if (isset($b['chatName']) && $d['chatName'] === '') $d['chatName'] = mb_substr(strip_tags((string)$b['chatName']), 0, 80);
        nt_save_keys($d, NT_USER_KEYS);
        hub_json(200, ['ok' => true] + nt_view($d));
    }
    if ($action === 'notify_backup') {
        @set_time_limit(240); @ignore_user_abort(true);   // finish and remember the backup even if the browser stopped waiting
        $r = nt_backup_send($d); $d = nt_save_keys($d, array_merge(NT_USER_KEYS, ['bkLast', 'bkError']));
        if (empty($r['ok'])) hub_json(400, ['ok' => false, 'error' => 'Telegram: ' . ($r['description'] ?? 'no answer')] + nt_view($d));
        hub_json(200, ['ok' => true, 'note' => 'Backup sent. Check Telegram.', 'backupLast' => time()] + nt_view($d));
    }
    $r = nt_run(true);
    hub_json($r['ok'] ? 200 : 400, ['ok' => $r['ok'], 'note' => $r['note'], 'error' => $r['ok'] ? '' : $r['note']] + nt_view(nt_load()));

case 'setup':
    need_post();
    if (hub_auth() !== null) hub_json(409, ['ok' => false, 'error' => 'A password is already set. Log in instead.']);
    $b = body();
    if (($w = hub_rate_wait()) > 0) hub_json(429, ['ok' => false, 'error' => 'Too many wrong tries. Wait a few minutes.']);
    $code = strtoupper(preg_replace('/\s+/', '', (string)($b['code'] ?? '')));   // spaces from copy and paste don't count
    if (!hash_equals(hub_setup_code(), $code)) { hub_rate_fail(); hub_json(401, ['ok' => false, 'error' => 'That setup code is wrong. Open ' . hub_setup_file_hint() . ' in your hosting file manager and copy the code from it.']); }
    $pw = (string)($b['password'] ?? '');
    if (strlen($pw) < HUB_MIN_PASSWORD) hub_json(400, ['ok' => false, 'error' => 'Use at least ' . HUB_MIN_PASSWORD . ' characters.']);
    $fh = @fopen(hub_auth_file(), 'x');   // fails if someone else set it a moment ago
    if (!$fh) hub_json(409, ['ok' => false, 'error' => 'A password was just set. Log in instead.']);
    $a = hub_new_auth($pw);
    $json = HUB_GUARD . json_encode($a);
    if (fwrite($fh, $json) !== strlen($json)) { fclose($fh); @unlink(hub_auth_file()); hub_json(500, ['ok' => false, 'error' => 'Could not save the login file. Check the folder permissions.']); }
    fclose($fh); @chmod(hub_auth_file(), 0600);
    $GLOBALS['__hub_auth'] = $a;
    hub_rate_clear();
    hub_setup_done();
    $nm = trim(strip_tags((string)($b['siteName'] ?? '')));
    hub_settings_update(function ($s) use ($nm, $b) { if ($nm !== '') $s['siteName'] = $nm; return hub_new_site_look(hub_setup_defaults($s, $b)); });   // writes settings.php and Tools' config.json right away
    hub_start_session($a);
    hub_json(200, ['ok' => true]);

case 'login':
    need_post();
    $b = body();
    $r = hub_check_login((string)($b['password'] ?? ''), (string)($b['code'] ?? ''), !empty($b['trust']));
    if (!$r['ok']) { if (!empty($r['setup'])) hub_setup_code(); hub_json($r['code'], ['ok' => false, 'error' => $r['error'], 'need2fa' => !empty($r['need2fa']), 'setup' => !empty($r['setup']), 'approval' => $r['approval'] ?? '', 'recovery' => !empty($r['recovery'])]); }
    hub_start_session(hub_auth());
    hub_json(200, ['ok' => true]);

/* ---- a login waiting for approval in Telegram (only the browser that started it can finish it) ---- */
case 'login_wait':
case 'login_code':
    need_post();
    require_once __DIR__ . '/lib/approval.php';
    $b = body(); $id = (string)($b['id'] ?? '');
    $p = ap_mine($id);
    if (!$p) hub_json(410, ['ok' => false, 'error' => 'This login request has ended. Log in again.']);
    if ($action === 'login_code') {
        if (($w = hub_rate_wait()) > 0) hub_json(429, ['ok' => false, 'error' => 'Too many wrong tries. Try again in ' . max(1, (int)ceil($w / 60)) . ' minutes.']);
        if (!ap_use_code((string)($b['code'] ?? ''))) { hub_rate_fail(); hub_json(401, ['ok' => false, 'error' => 'That recovery code is wrong or was used already.']); }
        $p['state'] = 'ok';
    } else {
        require_once __DIR__ . '/lib/notify.php';
        if ($p['state'] === 'wait') { nt_poll(); $p = ap_mine($id) ?: $p; }   // without instant replies, look for the button press now
        if ($p['state'] === 'no') { ap_finish($id, false); hub_rate_fail(); hub_json(403, ['ok' => false, 'denied' => true, 'error' => 'This login was denied in Telegram.']); }
        if ($p['state'] !== 'ok') hub_json(200, ['ok' => false, 'wait' => true, 'left' => max(0, AP_WAIT - (time() - $p['t']))]);
    }
    ap_finish($id, !empty($b['trust']));
    hub_start_session(hub_auth());
    hub_alert('login');
    hub_json(200, ['ok' => true]);

case 'logout':
    need_post();
    hub_end_session();
    hub_json(200, ['ok' => true]);

case 'password':
    need_post(); need_admin();
    $b = body();
    $a = need_password((string)($b['current'] ?? ''), 'The current password is wrong.');
    $pw = (string)($b['password'] ?? '');
    if (strlen($pw) < HUB_MIN_PASSWORD) hub_json(400, ['ok' => false, 'error' => 'Use at least ' . HUB_MIN_PASSWORD . ' characters.']);
    // Info's encrypted tabs that use the website password: the page re-wrapped their key with the new password. Checked
    // before anything changes, so a stale page fails here and the password stays as it was.
    $vault = is_array($b['vault'] ?? null) ? $b['vault'] : null; $prev = (string)($b['prev'] ?? '');
    if ($vault && ($why = bk_info_vault_check($vault, $prev)) !== '')
        hub_json(409, ['ok' => false, 'error' => $why === 'conflict' ? 'Info\'s encrypted tabs changed on another device. Reload the page and try again.' : 'Could not prepare Info\'s encrypted tabs. Nothing was changed.']);
    // Links' encrypted tabs, the same way (also checked before anything changes)
    $lvault = is_array($b['linksVault'] ?? null) ? $b['linksVault'] : null; $lprev = (string)($b['linksPrev'] ?? '');
    if ($lvault && bk_links_vault_check($lvault, $lprev) !== '')
        hub_json(409, ['ok' => false, 'error' => 'Links\' encrypted tabs changed on another device. Reload the page and try again.']);
    $a['hash'] = password_hash($pw, PASSWORD_DEFAULT);
    $a['ver'] = (int)$a['ver'] + 1;
    hub_auth_save($a);
    hub_start_session($a);   // this device stays logged in
    hub_alert('password');
    $also = [];
    if ($vault) $also['vault'] = bk_info_vault_swap($vault, $prev) === '';
    if ($lvault) $also['links'] = bk_links_vault_swap($lvault, $lprev) === '';
    if (bk_key() && bk_key_mode() === 'login') { bk_key_set($pw, 'login'); $also['backup'] = true; }   // new backup files open with the new password
    hub_json(200, ['ok' => true, 'csrf' => hub_csrf()] + $also);

case 'logoutall':
    need_post(); need_admin();
    $a = hub_auth(); $a['ver'] = (int)$a['ver'] + 1;
    hub_auth_save($a); hub_start_session($a);
    hub_alert('logoutall');
    hub_json(200, ['ok' => true, 'csrf' => hub_csrf()]);

case 'twostep_begin':
    need_post(); need_admin();
    $a = hub_auth();
    if (!empty($a['totp']['on'])) hub_json(409, ['ok' => false, 'error' => 'Two-step login is already on.']);
    $secret = hub_b32enc(random_bytes(20));
    $a['totp'] = ['on' => false, 'pending' => $secret];
    hub_auth_save($a);
    $label = rawurlencode(hub_settings()['siteName'] . ':' . ($_SERVER['HTTP_HOST'] ?? 'site'));
    hub_json(200, ['ok' => true, 'secret' => $secret,
        'uri' => "otpauth://totp/$label?secret=$secret&issuer=" . rawurlencode(hub_settings()['siteName']) . '&digits=6&period=30']);

case 'twostep_enable':
    need_post(); need_admin();
    $a = hub_auth(); $code = preg_replace('/\D/', '', (string)(body()['code'] ?? ''));
    $sec = (string)($a['totp']['pending'] ?? '');
    if ($sec === '') hub_json(409, ['ok' => false, 'error' => 'Start again: open Two-step login.']);
    $ok = false; $step = 0; $now = intdiv(time(), 30);
    foreach ([-1, 0, 1] as $d) if (hash_equals(hub_totp_at($sec, $now + $d), $code)) { $ok = true; $step = $now + $d; }
    if (!$ok) hub_json(400, ['ok' => false, 'error' => "That code doesn't match. Check your phone's clock and try the newest code."]);
    $a['totp'] = ['on' => true, 'secret' => $sec, 'last' => $step];
    $codes = new_recovery($a);
    hub_auth_save($a);
    hub_alert('twostep_on');
    hub_json(200, ['ok' => true, 'recovery' => $codes]);

case 'twostep_disable':
case 'recovery_new':
    need_post(); need_admin();
    $a = need_password((string)(body()['password'] ?? ''));
    if ($action === 'twostep_disable') { $a['totp'] = ['on' => false]; $a['recovery'] = []; hub_auth_save($a); hub_alert('twostep_off'); hub_json(200, ['ok' => true]); }
    if (empty($a['totp']['on'])) hub_json(409, ['ok' => false, 'error' => 'Two-step login is off.']);
    $codes = new_recovery($a); hub_auth_save($a); hub_alert('recovery');
    hub_json(200, ['ok' => true, 'recovery' => $codes]);

case 'settings':
    need_post(); need_admin();
    $in = body(2)['settings'] ?? null;
    if (!is_array($in)) hub_json(400, ['ok' => false, 'error' => 'Nothing to save.']);
    // only what Settings edits; the backup date and logo always come from the file as it is now
    unset($in['backupLast'], $in['logo']);
    $s = hub_settings_update(function ($cur) use ($in) { return array_replace($cur, $in); });
    hub_json(200, ['ok' => true, 'state' => array_merge(hub_public_state(), ['siteName' => $s['siteName']])]);

case 'logo':   // POST {data: "data:image/png;base64,..."} sets the site logo; POST {remove: true} removes it
    need_post(); need_admin();
    $b = body(1); $s = hub_settings();
    $dir = HUB_CORE . '/media/brand';
    $path = '';
    if (empty($b['remove'])) {
        if (!preg_match('#^data:image/(png|jpeg|webp|gif|x-icon|vnd\.microsoft\.icon);base64,([A-Za-z0-9+/=]+)$#', (string)($b['data'] ?? ''), $m)) hub_json(400, ['ok' => false, 'error' => 'Pick a PNG, JPG, WebP or GIF image.']);
        $bin = base64_decode($m[2], true);
        $ext = $bin === false ? '' : image_ext($bin);
        if ($ext === '' || strlen($bin) > 400000) hub_json(400, ['ok' => false, 'error' => 'That image is not usable (max 400 KB).']);
        if (!is_dir($dir)) @mkdir($dir, 0755, true);
        $path = 'web/core-data/media/brand/logo-' . dechex(time()) . bin2hex(random_bytes(2)) . '.' . $ext;
        if (!hub_write(HUB_PUBLIC . '/' . $path, $bin)) hub_json(500, ['ok' => false, 'error' => 'Could not save the logo (check folder permissions).']);
    }
    foreach (glob($dir . '/logo-*') ?: [] as $f) if ($path === '' || basename($f) !== basename($path)) @unlink($f);   // old logos, only now
    hub_settings_update(function ($s) use ($path) { $s['logo'] = $path; return $s; });
    hub_json(200, ['ok' => true, 'state' => hub_public_state()]);

case 'favicon':   // Tools > Favicon: the icon of a website, fetched here because Google's service does not let a browser save its pictures
    if ($method !== 'GET') hub_json(405, ['ok' => false, 'error' => 'Use GET.']);
    $dom = hub_icon_domain($_GET['domain'] ?? ''); $sz = (int)($_GET['sz'] ?? 0);
    if ($dom === null) hub_json(400, ['ok' => false, 'error' => 'Enter a website name like example.com.']);
    if (!in_array($sz, [16, 32, 48, 64, 128, 256, 512], true)) hub_json(400, ['ok' => false, 'error' => 'That size is not offered.']);
    if (!hub_icon_allow()) { header('Retry-After: 600'); hub_json(429, ['ok' => false, 'error' => 'Too many icons in a short time. Try again in a few minutes.']); }
    if (!defined('HUB_TEST_FAVICON') && !function_exists('curl_init')) hub_json(503, ['ok' => false, 'error' => 'This server cannot reach the icon service (PHP has no curl).']);
    @set_time_limit(20);
    $png = hub_icon_fetch($dom, min($sz, 256));   // the service gives at most 256; the browser enlarges it for 512
    if ($png === null) hub_json(502, ['ok' => false, 'error' => 'The icon service did not answer. Try again later.']);
    header('Content-Type: image/png'); header('Content-Length: ' . strlen($png)); header('Cache-Control: public, max-age=86400'); header('X-Content-Type-Options: nosniff');
    echo $png; exit;

case 'diag':   // Settings > Server check
    need_admin(false);
    @set_time_limit(40);
    $c = [];
    $add = function ($name, $ok, $note) use (&$c) { $c[] = ['name' => $name, 'ok' => (bool)$ok, 'note' => $note]; };
    $phpOk = version_compare(PHP_VERSION, HUB_MIN_PHP, '>='); $pn = hub_php_notice();
    $add('PHP', $phpOk && !($pn && $pn['level'] === 'warn'), 'Version ' . PHP_VERSION . ($phpOk ? '.' : ' is older than the ' . HUB_MIN_PHP . ' this site needs; choose ' . HUB_MIN_PHP . ' or newer in your hosting PHP settings.') . ($pn ? ' ' . $pn['text'] : ''));
    $hasCurl = function_exists('curl_init');
    $add('cURL (reaching other sites)', $hasCurl, $hasCurl ? 'Available.' : 'Missing. Link icons and titles cannot be fetched. Enable the curl extension in your hosting PHP settings.');
    $get = function ($url) use ($hasCurl) {
        if (!$hasCurl) return [0, 'cURL missing'];
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => 1, CURLOPT_FOLLOWLOCATION => 1, CURLOPT_MAXREDIRS => 4, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 8,
            CURLOPT_USERAGENT => 'Mozilla/5.0 (site check)']);
        $b = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
        return [$code, $err !== '' ? $err : ($b === false ? 'no answer' : strlen((string)$b) . ' bytes')];
    };
    foreach (['https://www.google.com/s2/favicons?domain=example.com&sz=64' => 'Favicon service (Google)', 'https://icons.duckduckgo.com/ip3/example.com.ico' => 'Favicon service (DuckDuckGo)', 'https://example.com/' => 'A normal website', 'https://api.github.com/' => 'GitHub (for updates)'] as $u => $n) {
        [$code, $note] = $get($u);
        // a favicon service answers 404 (with a plain icon) for a site it has no icon for, such as example.com: it was reached
        $fav = strpos($n, 'Favicon service') === 0;
        $add('Reach: ' . $n, $fav ? ($code >= 200 && $code < 500) : ($code >= 200 && $code < 400), $code ? "Answered HTTP $code ($note)." : "No connection: $note. Your host may block outgoing requests; ask them to allow outbound HTTPS. Link icons then fall back to being loaded by the visitor's browser.");
    }
    $add('allow_url_fopen', true, ini_get('allow_url_fopen') ? 'On.' : 'Off (fine when cURL works).');
    foreach (['Data folder' => hub_data_root(), 'Links icons' => HUB_CORE . '/media/links/icons', 'Start page icons' => HUB_CORE . '/media/home/icons', 'Start page photos' => HUB_CORE . '/media/home/photos',
              'Start page uploads' => HUB_CORE . '/media/home/uploads', 'Logo folder' => HUB_CORE . '/media/brand'] as $n => $d) {
        if (!is_dir($d)) @mkdir($d, 0755, true);
        $t = $d . '/.write-test-' . bin2hex(random_bytes(3));
        $ok = @file_put_contents($t, 'x') !== false; if ($ok) @unlink($t);
        $add('Can write: ' . $n, $ok, $ok ? 'Yes.' : 'No. In your hosting file manager set the folder permissions to 755 (or 775) and make sure it belongs to your account: ' . $d);
    }
    $add('GD (image resizing)', extension_loaded('gd'), extension_loaded('gd') ? 'Available.' : 'Missing; start page photos are saved without shrinking.');
    $ml = trim((string)ini_get('memory_limit')); $mlb = $ml === '-1' ? PHP_INT_MAX : (int)$ml * (['g' => 1 << 30, 'm' => 1 << 20, 'k' => 1 << 10][strtolower(substr($ml, -1))] ?? 1);
    $add('PHP memory limit', $mlb >= (192 << 20), $ml === '-1' ? 'No limit.' : $ml . ($mlb >= (192 << 20) ? '. Plenty for shrinking big start page photos.' : '. Start page photos wider than about 4500 px are saved as they are instead of being shrunk. For all of them, choose 256M for memory_limit in your hosting PHP settings.'));
    $pool = hub_jread(hub_dir('home') . '/photos.json'); $perr = [];
    foreach (is_array($pool['errors'] ?? null) ? $pool['errors'] : [] as $psrc => $pe) if (is_array($pe) && !empty($pe['msg']) && (int)($pe['time'] ?? 0) > time() - 7 * 86400) $perr[] = $psrc . ': ' . $pe['msg'] . ' (' . date('j M', (int)$pe['time']) . ')';
    $add('Start page photo sources', !$perr, $perr ? 'Problems in the last 7 days: ' . implode('; ', array_slice($perr, 0, 4)) . '.' : (is_array($pool) ? 'No download problems in the last 7 days.' : 'Nothing downloaded yet.'));
    $add('Upload limits', true, 'upload_max_filesize ' . ini_get('upload_max_filesize') . ', post_max_size ' . ini_get('post_max_size') . ' (a big backup import needs these to be larger than the file).');
    hub_json(200, ['ok' => true, 'checks' => $c]);

case 'backup_overview':
    need_admin(false);
    hub_json(200, ['ok' => true, 'parts' => bk_overview(), 'versions' => versions_list()]);

case 'backup':
    need_admin();
    $pick = [];
    $parts = explode(',', (string)($_GET['parts'] ?? implode(',', BK_PARTS)));
    foreach (BK_PARTS as $p) if (in_array($p, $parts, true)) $pick[$p] = true;
    foreach (['links', 'info'] as $p) {
        $ids = trim((string)($_GET[$p . '_tabs'] ?? ''));
        if ($ids !== '' && isset($pick[$p])) $pick[$p] = array_values(array_filter(explode(',', $ids), 'strlen'));
    }
    if (!$pick) hub_json(400, ['ok' => false, 'error' => 'Pick at least one part.']);
    $data = bk_export($pick, !empty($_GET['enc']) && bk_key());   // the Telegram bot token only goes into encrypted files
    $name = preg_replace('/[^a-z0-9]+/', '-', strtolower(hub_settings()['siteName'])) . '-backup-' . (count($pick) < count(BK_PARTS) || array_filter($pick, 'is_array') ? 'partial-' : '') . date('Y-m-d-His') . '.json';
    $json = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE | JSON_PRETTY_PRINT);
    if (!empty($_GET['enc'])) {   // encrypted with the backup passphrase (Backup > Encryption)
        if (!bk_key()) hub_json(400, ['ok' => false, 'error' => 'Set a backup passphrase first (Backup > Encryption).']);
        try { $json = bk_encrypt($json); } catch (Exception $e) { hub_json(500, ['ok' => false, 'error' => $e->getMessage()]); }
        $name = preg_replace('/\.json$/', '.enc.json', $name);
    }
    header('Content-Disposition: attachment; filename="' . $name . '"');
    if (count($pick) === count(BK_PARTS) && !array_filter($pick, 'is_array')) hub_settings_update(function ($s) { $s['backupLast'] = time(); return $s; });
    echo $json;
    exit;

case 'restore':
    need_post(); need_admin();
    $b = body(40);
    $parts = bk_normalize($b['backup'] ?? null);
    if (!$parts) hub_json(400, ['ok' => false, 'error' => "This file isn't a site, Links, Info or Cards backup."]);
    $pick = is_array($b['pick'] ?? null) ? $b['pick'] : array_fill_keys(array_keys($parts), true);
    $mode = ($b['mode'] ?? '') === 'merge' ? 'merge' : 'replace';
    try { $done = bk_import($parts, $pick, $mode); }
    catch (Throwable $e) { hub_json(400, ['ok' => false, 'error' => $e->getMessage()]); }
    if (!$done) hub_json(400, ['ok' => false, 'error' => 'Nothing was restored: none of the parts you picked are in this file.']);
    hub_alert('restore', implode(', ', $done));
    hub_json(200, ['ok' => true, 'restored' => $done]);

case 'version_restore':
    need_post(); need_admin();
    $b = body(); $app = (string)($b['app'] ?? ''); $id = basename((string)($b['id'] ?? ''));
    $where = ['links' => [hub_dir('links') . '/backups', bk_links_file(), '/^bookmarks-[0-9-]+\.php$/'],
              'info'  => [hub_dir('info') . '/versions', hub_jpath(bk_info_file()), '/^[0-9-]+\.php$/'],
              'cards' => [hub_dir('cards') . '/versions', hub_jpath(bk_cards_file()), '/^[0-9-]+\.php$/'],
              'tasks' => [hub_dir('tasks') . '/versions', hub_jpath(bk_tasks_file()), '/^[0-9-]+\.php$/'],
              'home'  => [hub_dir('home') . '/versions', hub_jpath(bk_home_file()), '/^[0-9-]+\.php$/']];
    if (!isset($where[$app]) || !preg_match($where[$app][2], $id) || !is_file($where[$app][0] . '/' . $id)) hub_json(404, ['ok' => false, 'error' => 'That version is gone.']);
    [$dir, $target] = $where[$app];
    // keep what's there now, so this restore can be undone too
    if (is_file($target)) @copy($target, hub_version_path($dir, $app === 'links' ? 'bookmarks-' : ''));   // a free name: never the version being restored
    $content = (string)file_get_contents($dir . '/' . $id);
    if ($app === 'links') {   // an earlier version of this site: Links' encrypted tabs keep the key this site uses now
        $old = hub_read_guarded($dir . '/' . $id); $now = hub_read_guarded($target);
        $curV = hub_norm_vault(is_array($now) ? ($now['settings']['vault'] ?? null) : null);
        if (is_array($old) && $curV) {
            if (!is_array($old['settings'] ?? null)) $old['settings'] = [];
            $old['settings']['vault'] = $curV;
            foreach (['dark', 'light', 'sizes'] as $k) if (array_key_exists($k, $old['settings']) && !$old['settings'][$k]) unset($old['settings'][$k]);
            if (hub_write_guarded($target, $old)) hub_json(200, ['ok' => true]);
        }
    }
    if (!hub_write($target, $content)) hub_json(500, ['ok' => false, 'error' => 'Could not restore.']);
    hub_json(200, ['ok' => true]);

/* ---- Settings > Security: approve logins in Telegram ---- */
case 'approval':
    need_admin(false);
    require_once __DIR__ . '/lib/approval.php'; require_once __DIR__ . '/lib/notify.php';
    $d = ap_load(); $n = nt_load(); $mine = hash('sha256', (string)($_COOKIE['hub_trust'] ?? ''));
    hub_json(200, ['ok' => true, 'on' => ap_on(), 'telegram' => $n['token'] !== '' && $n['chat'] !== '',
        'trusted' => array_map(function ($t, $i) use ($mine) { return ['i' => $i, 'name' => $t['name'], 'ip' => $t['ip'] ?? '', 'added' => $t['added'], 'last' => $t['last'], 'until' => $t['until'], 'me' => hash_equals($t['h'], $mine)]; }, $d['trusted'], array_keys($d['trusted']))]);

case 'approval_on':
case 'approval_off':
case 'approval_untrust':
    need_post(); need_admin();
    require_once __DIR__ . '/lib/approval.php'; require_once __DIR__ . '/lib/notify.php';
    $b = body();
    if ($action !== 'approval_untrust') need_password((string)($b['password'] ?? ''));
    // off: no more questions, but trusted browsers stay (they also skip the two-step code)
    if ($action === 'approval_off') { ap_update(function (&$d) { $d['on'] = false; $d['pending'] = []; }); hub_json(200, ['ok' => true]); }
    if ($action === 'approval_untrust') {
        $i = (int)($b['i'] ?? -1);
        ap_update(function (&$d) use ($i) { if ($i < 0) $d['trusted'] = []; else array_splice($d['trusted'], $i, 1); });
        hub_json(200, ['ok' => true]);
    }
    $n = nt_load();
    if ($action === 'approval_on' && ($n['token'] === '' || $n['chat'] === '')) hub_json(400, ['ok' => false, 'error' => 'Set up the Telegram bot first (Settings > Telegram).']);
    ap_update(function (&$d) { $d['on'] = true; });
    hub_json(200, ['ok' => true]);

/* ---- Backup > Encryption ---- */
case 'bkkey':
    need_admin(false);
    $k = bk_key();
    hub_json(200, ['ok' => true, 'set' => (bool)$k, 'at' => $k ? (int)$k['set'] : 0, 'mode' => bk_key_mode($k), 'available' => function_exists('openssl_encrypt'), 'pp' => hub_pp_on()]);

/* ---- Settings > Security > Encryption: one passphrase. Set it, or remove it; nothing else. ---- */
case 'pp_check':   // the website password, checked like a login (before the browser starts re-locking anything)
    need_post(); need_admin();
    need_password((string)(body()['password'] ?? ''));
    hub_json(200, ['ok' => true]);

case 'changelog':   // Settings > Changelog: the history of every version (docs/ is closed to browsers, so it is read here, for you only)
    need_admin(false);
    $cl = HUB_WEB . '/docs/CHANGELOG.md';
    if (!is_file($cl)) $cl = HUB_CORE . '/docs/CHANGELOG.md';   // before 1.39.0 the docs were in web/core-data/docs
    if (!is_file($cl)) hub_json(200, ['ok' => false, 'error' => 'The changelog file is not on your server (web/docs/CHANGELOG.md).']);
    hub_json(200, ['ok' => true, 'version' => HUB, 'md' => (string)file_get_contents($cl, false, null, 0, 1500000), 'time' => (int)filemtime($cl)]);

case 'activity':   // Settings > Security > Devices: who is logged in, and the recent login history
    need_admin(false);
    require_once __DIR__ . '/lib/activity.php';
    hub_json(200, ['ok' => true, 'now' => time(), 'sessions' => act_sessions(), 'events' => array_reverse(hub_jread(act_file()) ?? [])]);

case 'session_revoke':   // log out one device from the list ({id}); the one you are using is "Log Out Here"
    need_post(); need_admin();
    require_once __DIR__ . '/lib/activity.php';
    $okr = act_revoke((string)(body()['id'] ?? ''));
    hub_json($okr ? 200 : 400, ['ok' => $okr, 'error' => $okr ? '' : 'That device cannot be logged out from here.']);

case 'export':   // Settings > Backup > Export Data: one page's own data, to be turned into a CSV or JSON file in the browser
    need_admin(false);
    $ea = (string)($_GET['app'] ?? '');
    $ef = ['links' => hub_dir('links') . '/bookmarks.php', 'cards' => hub_dir('cards') . '/cards.php', 'tasks' => hub_dir('tasks') . '/tasks.php'][$ea] ?? '';
    if ($ef === '') hub_json(400, ['ok' => false, 'error' => 'Choose Links, Cards or Tasks.']);
    hub_json(200, ['ok' => true, 'app' => $ea, 'data' => hub_read_guarded($ef) ?: new stdClass()]);

case 'overview':   // Settings > Overview: where things stand
    need_admin(false);
    require_once __DIR__ . '/lib/overview.php';
    hub_json(200, hub_overview());

case 'update_status':
    need_admin(false);
    require_once __DIR__ . '/lib/update.php';
    hub_json(200, ['ok' => true] + up_status());

case 'update_chunk':   // one piece (about 1 MB) of the zip, sent as the raw request body
    need_post(); need_admin();
    require_once __DIR__ . '/lib/update.php';
    $ca = up_chunk_args($_GET);
    $r = $ca ? up_chunk($ca[0], $ca[1], $ca[2], (string)file_get_contents('php://input', false, null, 0, 4194305)) : ['ok' => false, 'error' => 'That piece of the upload makes no sense.'];
    hub_json($r['ok'] ? 200 : 400, $r);

case 'update_check':   // checks the uploaded zip completely; changes nothing on the site
    need_post(); need_admin();
    require_once __DIR__ . '/lib/update.php';
    $b = body(); $r = up_check((string)($b['name'] ?? 'update.zip'));
    hub_json($r['ok'] ? 200 : 400, $r);

case 'gh_check':   // Check Now: looks for a newer version on GitHub (the daily check is a separate switch, off by default)
    need_post(); need_admin();
    require_once __DIR__ . '/lib/ghupdate.php';
    $b = body(); hub_json(200, gh_check(empty($b['auto'])));

case 'gh_auto':
    need_post(); need_admin();
    require_once __DIR__ . '/lib/ghupdate.php';
    $b = body(); hub_json(200, ['ok' => true] + gh_set_auto(!empty($b['on'])));

case 'gh_install':   // downloads the newest release, checks size and SHA-256, then the same full check as an uploaded zip; changes nothing on the site
    need_post(); need_admin();
    require_once __DIR__ . '/lib/ghupdate.php';
    $r = gh_install(); hub_json($r['ok'] ? 200 : 400, $r);

case 'update_cancel':
    need_post(); need_admin();
    require_once __DIR__ . '/lib/update.php';
    up_cancel(); hub_json(200, ['ok' => true]);

case 'update_apply':   // applies the checked zip, or goes back to the saved version ({back: true}); needs the password
    need_post(); need_admin();
    $b = body(); need_password((string)($b['password'] ?? ''));
    require_once __DIR__ . '/lib/update.php';
    if (isset($b['autoUndo'])) { $us = up_state(); $us['autoUndo'] = (bool)$b['autoUndo']; up_state_save($us); }
    $us = up_state(); $r = up_apply(!empty($b['back']), !isset($us['autoUndo']) || !empty($us['autoUndo']));
    $code = $r['ok'] ? 200 : (int)($r['code'] ?? 500); unset($r['code']);   // 409: nothing ready to apply (not a server failure)
    hub_json($code, $r);

case 'update_autoundo':
    need_post(); need_admin();
    require_once __DIR__ . '/lib/update.php';
    $b = body(); $us = up_state(); $us['autoUndo'] = !empty($b['on']); up_state_save($us); hub_json(200, ['ok' => true]);

case 'files_scan':   // compares the server with this version's file list
    need_admin(false);
    require_once __DIR__ . '/lib/update.php';
    hub_json(200, up_scan());

case 'files_delete':   // deletes files from the "not part of this version" list; needs the password
    need_post(); need_admin();
    $b = body(2); need_password((string)($b['password'] ?? ''));
    require_once __DIR__ . '/lib/update.php';
    hub_json(200, up_delete(is_array($b['paths'] ?? null) ? array_slice($b['paths'], 0, 500) : []));

case 'reset_all':   // Backup > Start Over: everything back to a new site, except your password and two-step login
    need_post(); need_admin();
    $b = body();
    if (($b['confirm'] ?? '') !== 'ERASE') hub_json(400, ['ok' => false, 'error' => 'Type ERASE to confirm.']);
    need_password((string)($b['password'] ?? ''));
    require_once __DIR__ . '/lib/backup.php';
    hub_json(200, ['ok' => true, 'erased' => bk_reset_all()]);

case 'pp_set':     // the browser has already wrapped the Info and Links keys with the passphrase; this makes the backup key and the marker
    need_post(); need_admin();
    $b = body(); need_password((string)($b['password'] ?? ''));
    $pp = (string)($b['passphrase'] ?? '');
    if (mb_strlen($pp) < 8) hub_json(400, ['ok' => false, 'error' => 'Use at least 8 characters for the passphrase.']);
    if (function_exists('openssl_encrypt')) bk_key_set($pp, 'own');   // backup files (also the ones sent to Telegram) open with it too
    hub_pp_mark(true);
    hub_json(200, ['ok' => true, 'backups' => function_exists('openssl_encrypt')]);

case 'pp_clear':   // the browser has already turned the encrypted tabs back into normal private tabs
    need_post(); need_admin();
    need_password((string)(body()['password'] ?? ''));
    bk_key_clear(); hub_pp_mark(false);
    hub_json(200, ['ok' => true]);

/* ---- Health > Domains: domain, SSL and uptime watch ---- */
case 'watch':
    need_admin(false);
    require_once __DIR__ . '/lib/watch.php';
    hub_json(200, ['ok' => true] + wt_load());

case 'watch_add':
case 'watch_set':
case 'watch_del':
case 'watch_check':
case 'watch_tasks':
    need_post(); need_admin();
    require_once __DIR__ . '/lib/watch.php'; require_once __DIR__ . '/lib/notify.php';
    @set_time_limit(180);
    $b = body(); $d = wt_load(); $h = wt_host((string)($b['host'] ?? ''));
    if ($action === 'watch_add') {
        if ($h === '') hub_json(400, ['ok' => false, 'error' => 'Type a domain like example.com or shop.example.com.']);
        foreach ($d['sites'] as $s) if ($s['host'] === $h) hub_json(400, ['ok' => false, 'error' => $h . ' is already on the list.']);
        if (count($d['sites']) >= WT_MAX) hub_json(400, ['ok' => false, 'error' => 'At most ' . WT_MAX . ' domains.']);
        $up = !empty($b['up']);
        wt_update(function (&$x) use ($h, $up) { foreach ($x['sites'] as $s) if ($s['host'] === $h) return; $x['sites'][] = ['host' => $h, 'hosting' => '', 'up' => $up, 'dom' => [], 'ssl' => [], 'st' => []]; });
        $d = wt_run(true, $h);   // only the new domain is checked now; the others keep their schedule
    } elseif ($action === 'watch_set') {
        $d = wt_update(function (&$x) use ($h, $b) {
            foreach ($x['sites'] as &$s) if ($s['host'] === $h) {
                if (isset($b['up'])) { $s['up'] = !empty($b['up']); if (!$s['up']) $s['st'] = []; }
                if (isset($b['hosting'])) { $hd = (string)$b['hosting']; $s['hosting'] = preg_match('/^\d{4}-\d{2}-\d{2}$/', $hd) ? $hd : ''; }
            }
            unset($s);
        });
        wt_sync_tasks($d);
    } elseif ($action === 'watch_del') {
        wt_update(function (&$x) use ($h) { $x['sites'] = array_values(array_filter($x['sites'], function ($s) use ($h) { return $s['host'] !== $h; })); });
    } elseif ($action === 'watch_tasks') {
        $d = wt_update(function (&$x) use ($b) { foreach (['dom', 'ssl', 'host'] as $k) if (isset($b[$k])) $x['tasks'][$k] = !empty($b[$k]); });
        wt_sync_tasks($d);
    } else $d = wt_run(true);
    hub_json(200, ['ok' => true] + wt_load());

/* ---- Health ---- */
case 'health':
    need_admin(false);
    require_once __DIR__ . '/lib/health.php';
    hub_json(200, ['ok' => true] + health_report());

case 'health_verify':
    need_post(); need_admin();
    require_once __DIR__ . '/lib/health.php';
    hub_json(200, ['ok' => true] + health_verify_backup());

case 'health_log_clear':
case 'health_update':
    need_post(); need_admin();
    require_once __DIR__ . '/lib/health.php';
    $b = body();
    if ($action === 'health_log_clear') { if (!health_clear_log((string)($b['file'] ?? ''))) hub_json(400, ['ok' => false, 'error' => 'That log could not be cleared.']); hub_json(200, ['ok' => true]); }
    hub_json(200, ['ok' => true, 'update' => health_check_update(isset($b['url']) ? (string)$b['url'] : null)]);

/* ---- Settings > Telegram: instant replies (webhook) ---- */
case 'tg_hook':
    need_post(); need_admin();
    require_once __DIR__ . '/lib/notify.php';
    $b = body(); $d = nt_load();
    if ($d['token'] === '') hub_json(400, ['ok' => false, 'error' => 'Add the bot token first.']);
    if ($url = nt_site_url()) $d['url'] = $url;
    $r = nt_hook_set($d, !empty($b['on'])); nt_save_keys($d, NT_USER_KEYS);
    if (empty($r['ok'])) hub_json(400, ['ok' => false, 'error' => 'Telegram: ' . ($r['description'] ?? 'no answer')] + nt_view($d));
    hub_json(200, ['ok' => true] + nt_view($d));

default:
    hub_json(400, ['ok' => false, 'error' => 'Unknown action.']);
}
