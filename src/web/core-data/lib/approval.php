<?php
if (PHP_SAPI !== 'cli' && isset($_SERVER['SCRIPT_FILENAME']) && @realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) { http_response_code(404); exit; }   // an include file: never run on its own, even where .htaccess is ignored
/**
 * Approve logins in Telegram (Settings > Security). After the password (and two-step code) are right, a new browser waits
 * until you tap Approve on the message the bot sends. Fallbacks, so you can never be locked out by Telegram:
 *   - Telegram can't be reached (or isn't set up): the login goes through, as the password and code were already right;
 *   - your phone isn't with you: a two-step recovery code (when two-step login is on);
 *   - locked out completely: delete site-data/core/login-approval.php in your hosting file manager and approval is off.
 * "Trust this browser" skips the question, and the two-step code, on that browser for 30 days (the password is always needed).
 * The trusted list stays when approval is turned off, since it also covers the two-step code.
 * File: { on, trusted: [{h, name, added, until, last}], pending: {id: {nh, ip, country, ua, t, state}} }
 */
require_once __DIR__ . '/boot.php';

const AP_WAIT = 300;          // seconds a login waits for approval
const AP_TRUST_DAYS = 30;
function ap_file(): string { return hub_dir('core') . '/login-approval.json'; }   // stored as login-approval.php
function ap_load(): array { $d = hub_jread(ap_file()) ?? []; return $d + ['on' => false, 'trusted' => [], 'pending' => []]; }  
function ap_save(array $d): bool {
    $now = time();
    foreach ($d['pending'] as $k => $p) if ($p['t'] < $now - AP_WAIT - 60) unset($d['pending'][$k]);
    $d['trusted'] = array_values(array_filter($d['trusted'], function ($t) use ($now) { return $t['until'] > $now; }));
    $ok = hub_jput(ap_file(), json_encode($d, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE));
    @chmod(hub_jpath(ap_file()), 0600);
    return $ok;
}
function ap_update(callable $fn) {
    $lk = @fopen(hub_dir('core') . '/login-approval.lock', 'c'); if ($lk) flock($lk, LOCK_EX);
    try { $d = ap_load(); $r = $fn($d); ap_save($d); return $r; } finally { if ($lk) { flock($lk, LOCK_UN); fclose($lk); } }
}
function ap_on(): bool { return is_file(hub_jpath(ap_file())) && !empty(ap_load()['on']); }
function ap_cookie(string $name, string $value, int $until): void {
    setcookie($name, $value, ['expires' => $until, 'path' => '/', 'secure' => hub_https(), 'httponly' => true, 'samesite' => 'Strict']);
}
/** This browser was trusted earlier (cookie), and still is. */
function ap_trusted(): bool {
    $c = (string)($_COOKIE['hub_trust'] ?? '');
    if (!preg_match('/^[a-f0-9]{48}$/', $c)) return false;
    $h = hash('sha256', $c); $ok = false;
    ap_update(function (&$d) use ($h, &$ok) { foreach ($d['trusted'] as &$t) if (hash_equals($t['h'], $h)) { $t['last'] = time(); $ok = true; } });
    return $ok;
}
/**
 * Starts the wait for a login whose password (and code) were right. Returns ['skip' => true] when approval is off, this
 * browser is trusted, or Telegram can't be reached; otherwise ['id' => ...] and the bot has asked you.
 */
function ap_start(bool $trusted = false): array {
    if (!ap_on() || $trusted || ap_trusted()) return ['skip' => true];
    require_once __DIR__ . '/notify.php';
    $n = nt_load();
    if ($n['token'] === '' || $n['chat'] === '') return ['skip' => true];
    $id = bin2hex(random_bytes(8)); $nonce = bin2hex(random_bytes(24));
    $ctx = ['ip' => hub_ip(), 'country' => preg_replace('/[^A-Z]/', '', strtoupper((string)($_SERVER['HTTP_CF_IPCOUNTRY'] ?? ''))), 'ua' => substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 300)];
    $msg = '🔐 <b>Approve this login?</b>' . "\n" . nt_h(hub_settings()['siteName']) . "\n\n🕒 " . nt_h(date('l, j M Y, g:i A')) .
           "\n🌍 " . nt_h($ctx['ip']) . ($ctx['country'] !== '' && $ctx['country'] !== 'XX' ? ' (' . nt_h($ctx['country']) . ')' : '') . "\n💻 " . nt_h(nt_device($ctx['ua'])) .
           "\n\nThe password was right. Approve only if this is you; the request ends in 5 minutes.";
    $r = nt_send($n, $msg, ['inline_keyboard' => [[['text' => '✅ Approve', 'callback_data' => 'ap:ok:' . $id], ['text' => '❌ Deny', 'callback_data' => 'ap:no:' . $id]]]]);
    if (empty($r['ok'])) return ['skip' => true, 'note' => 'Telegram could not be reached, so the login went through without approval.'];
    ap_update(function (&$d) use ($id, $nonce, $ctx, $r) {
        $d['pending'][$id] = $ctx + ['nh' => hash('sha256', $nonce), 't' => time(), 'state' => 'wait', 'msg' => (int)($r['result']['message_id'] ?? 0)];
    });
    ap_cookie('hub_appr', $nonce, time() + AP_WAIT + 60);   // only this browser can finish this login
    return ['id' => $id];
}
/** The pending login $id, if it belongs to this browser. */
function ap_mine(string $id): ?array {
    $c = (string)($_COOKIE['hub_appr'] ?? '');
    if (!preg_match('/^[a-f0-9]{16}$/', $id) || !preg_match('/^[a-f0-9]{48}$/', $c)) return null;
    $p = ap_load()['pending'][$id] ?? null;
    if (!$p || !hash_equals($p['nh'], hash('sha256', $c)) || $p['t'] < time() - AP_WAIT) return null;
    return $p;
}
/** Telegram's Approve / Deny button. Returns the text the message is changed to. */
function ap_answer(string $id, bool $ok): string {
    return ap_update(function (&$d) use ($id, $ok) {
        $p = $d['pending'][$id] ?? null;
        if (!$p || $p['t'] < time() - AP_WAIT) return '⌛ This request has ended.';
        if ($p['state'] !== 'wait') return $p['state'] === 'ok' ? '✅ Already approved.' : '❌ Already denied.';
        $d['pending'][$id]['state'] = $ok ? 'ok' : 'no';
        return $ok ? '✅ Approved. The browser is logging in.' : '❌ Denied. That browser was not let in.';
    });
}
/** Adds a browser to the trusted list (in $d) and gives it the cookie. */
function ap_add_trusted(array &$d, string $ua, string $ip): void {
    require_once __DIR__ . '/notify.php';   // nt_device: "Chrome on Windows"
    $tok = bin2hex(random_bytes(24));
    $d['trusted'][] = ['h' => hash('sha256', $tok), 'name' => nt_device($ua), 'ip' => $ip, 'added' => time(), 'until' => time() + AP_TRUST_DAYS * 86400, 'last' => time()];
    ap_cookie('hub_trust', $tok, time() + AP_TRUST_DAYS * 86400);
}
/** The browser finishes its login: trusted for 30 days when asked. */
function ap_finish(string $id, bool $trust): void {
    ap_update(function (&$d) use ($id, $trust) {
        $p = $d['pending'][$id] ?? null; unset($d['pending'][$id]);
        if ($trust && $p) ap_add_trusted($d, (string)$p['ua'], (string)$p['ip']);
    });
    ap_cookie('hub_appr', '', time() - 3600);
}
/** Trusts the browser of this request (a login that needed no Telegram tap, only the two-step code). */
function ap_trust_this(): void {
    $ua = substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 300); $ip = hub_ip();
    ap_update(function (&$d) use ($ua, $ip) { ap_add_trusted($d, $ua, $ip); });
}
/** A two-step recovery code (one use) instead of the Telegram tap. Only when two-step login is on. */
function ap_use_code(string $code): bool {
    $code = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $code));
    $a = hub_auth();
    return strlen($code) === 10 && !empty($a['totp']['on']) && hub_totp_use($a, $code);
}
