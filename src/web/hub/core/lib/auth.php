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
 * Hub core, part 2 of 4 (split out of boot.php in 1.62.6; boot.php loads it): who may do what.
 *  - login lockout (wrong passwords), the icon download limit of Tools > Favicon
 *  - the one password, sessions and the security token (CSRF), two-step codes (TOTP) */

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
