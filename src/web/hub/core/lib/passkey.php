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
if (PHP_SAPI !== 'cli' && isset($_SERVER['SCRIPT_FILENAME']) && @realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) { http_response_code(404); exit; }   // an include file: never run on its own, even where .htaccess is ignored

/**
 * Passkeys (1.61.0): log in with a fingerprint, face, PIN or security key (WebAuthn), with no library: the checks are here, the signatures are
 * verified by PHP's own OpenSSL.
 *
 * A passkey proves two things at once (the device, and you at the device), so a passkey login does not ask for the two-step code or the Telegram
 * tap. It is only accepted when the device says it verified you (user verification), and only on this site's own address (the "relying party").
 *
 * Stored in site-data/core/passkeys.php (guarded): { keys: [ { id, name, alg, key (PEM public key), cnt, at, last } ] }. Public keys only: nothing in
 * there can log anyone in. Challenges are single-use, last five minutes, and live in site-data/core/passkey-challenges.php.
 * Supported: ES256 (P-256) and RS256, the two every device offers; the attestation statement is not checked (it is only a hint about the device).
 */
require_once __DIR__ . '/boot.php';

const PK_MAX_KEYS = 10;
const PK_CHALLENGE_TTL = 300;
const PK_CHALLENGE_MAX = 200;
const PK_PER_IP = 20;   // challenges one address may ask for within the time they last

function pk_file(): string { return hub_dir('core') . '/passkeys.json'; }
function pk_chal_file(): string { return hub_dir('core') . '/passkey-challenges.json'; }

/* ---------- base64url ---------- */
function pk_b64u(string $bin): string { return rtrim(strtr(base64_encode($bin), '+/', '-_'), '='); }
function pk_unb64u($s): ?string {
    if (!is_string($s) || $s === '' || strlen($s) > 20000 || !preg_match('/^[A-Za-z0-9_-]+$/', $s)) return null;
    $r = base64_decode(strtr($s, '-_', '+/') . str_repeat('=', (4 - strlen($s) % 4) % 4), true);
    return $r === false ? null : $r;
}

/* ---------- CBOR (only what WebAuthn uses: no indefinite lengths, no tags, no floats) ---------- */
/** Reads one value at $o (and moves $o past it). Throws on anything else. */
function pk_cbor(string $b, int &$o = 0, int $depth = 0) {
    if ($depth > 8 || $o >= strlen($b)) throw new Exception('cbor');
    $ib = ord($b[$o++]); $mt = $ib >> 5; $ai = $ib & 31;
    if ($mt === 7) { if ($ai === 20) return false; if ($ai === 21) return true; if ($ai === 22) return null; throw new Exception('cbor'); }
    if ($ai < 24) $n = $ai;
    elseif ($ai === 24) { if ($o + 1 > strlen($b)) throw new Exception('cbor'); $n = ord($b[$o++]); }
    elseif ($ai === 25) { if ($o + 2 > strlen($b)) throw new Exception('cbor'); $n = unpack('n', substr($b, $o, 2))[1]; $o += 2; }
    elseif ($ai === 26) { if ($o + 4 > strlen($b)) throw new Exception('cbor'); $n = unpack('N', substr($b, $o, 4))[1]; $o += 4; }
    else throw new Exception('cbor');   // 8-byte numbers and indefinite lengths are not used here
    switch ($mt) {
        case 0: return $n;
        case 1: return -1 - $n;
        case 2: case 3:
            if ($n > strlen($b) - $o) throw new Exception('cbor');
            $s = substr($b, $o, $n); $o += (int)$n;
            if ($mt === 3 && !mb_check_encoding($s, 'UTF-8')) throw new Exception('cbor');
            return $s;
        case 4:
            if ($n > 64) throw new Exception('cbor');
            $a = []; for ($i = 0; $i < $n; $i++) $a[] = pk_cbor($b, $o, $depth + 1); return $a;
        case 5:
            if ($n > 64) throw new Exception('cbor');
            $m = []; for ($i = 0; $i < $n; $i++) { $k = pk_cbor($b, $o, $depth + 1); if (!is_int($k) && !is_string($k)) throw new Exception('cbor'); $m[$k] = pk_cbor($b, $o, $depth + 1); } return $m;
    }
    throw new Exception('cbor');
}

/* ---------- public keys: COSE -> PEM (so OpenSSL can verify) ---------- */
function pk_der(int $tag, string $body): string {
    $l = strlen($body);
    $len = $l < 128 ? chr($l) : ($l < 256 ? "\x81" . chr($l) : ($l < 65536 ? "\x82" . pack('n', $l) : "\x83" . substr(pack('N', $l), 1)));
    return chr($tag) . $len . $body;
}
function pk_der_uint(string $n): string { $n = ltrim($n, "\x00"); if ($n === '') $n = "\x00"; if (ord($n[0]) > 127) $n = "\x00" . $n; return pk_der(0x02, $n); }
function pk_pem(string $spki): string { return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($spki), 64, "\n") . "-----END PUBLIC KEY-----\n"; }
/** The PEM of a COSE key (ES256 or RS256), and its algorithm number; null when it is neither. */
function pk_cose_pem($k): ?array {
    if (!is_array($k)) return null;
    $kty = $k[1] ?? null; $alg = $k[3] ?? null;
    if ($kty === 2 && $alg === -7 && ($k[-1] ?? null) === 1 && is_string($k[-2] ?? null) && is_string($k[-3] ?? null) && strlen($k[-2]) === 32 && strlen($k[-3]) === 32) {
        $spki = hex2bin('3059301306072a8648ce3d020106082a8648ce3d030107034200') . "\x04" . $k[-2] . $k[-3];
        return [-7, pk_pem($spki)];
    }
    if ($kty === 3 && $alg === -257 && is_string($k[-1] ?? null) && is_string($k[-2] ?? null) && strlen($k[-1]) >= 128 && strlen($k[-1]) <= 1024 && strlen($k[-2]) <= 8) {
        $rsaKey = pk_der(0x30, pk_der_uint($k[-1]) . pk_der_uint($k[-2]));
        $spki = pk_der(0x30, pk_der(0x30, hex2bin('06092a864886f70d0101010500')) . pk_der(0x03, "\x00" . $rsaKey));
        return [-257, pk_pem($spki)];
    }
    return null;
}

/* ---------- the site's own address (the "relying party") ---------- */
function pk_rp(): string { $h = strtolower((string)($_SERVER['HTTP_HOST'] ?? '')); return trim((string)preg_replace('/:\d+$/', '', $h), '[]'); }
function pk_origin(): string { return (hub_https() ? 'https' : 'http') . '://' . strtolower((string)($_SERVER['HTTP_HOST'] ?? '')); }

/* ---------- what is stored ---------- */
function pk_clean($d): array {
    $out = []; $seen = [];
    foreach ((is_array($d) ? ($d['keys'] ?? []) : []) as $k) {
        if (!is_array($k) || !is_string($k['id'] ?? null) || pk_unb64u($k['id']) === null || strlen($k['id']) > 1400 || isset($seen[$k['id']])) continue;
        if (!in_array($k['alg'] ?? 0, [-7, -257], true) || !is_string($k['key'] ?? null) || strncmp($k['key'], '-----BEGIN PUBLIC KEY-----', 26) !== 0 || strlen($k['key']) > 3000) continue;
        $seen[$k['id']] = 1;
        $out[] = ['id' => $k['id'], 'name' => mb_substr(trim((string)preg_replace('/[\x00-\x1F\x7F]/u', '', (string)($k['name'] ?? ''))), 0, 40) ?: 'Passkey', 'alg' => $k['alg'], 'key' => $k['key'],
                  'cnt' => max(0, (int)($k['cnt'] ?? 0)), 'at' => max(0, (int)($k['at'] ?? 0)), 'last' => max(0, (int)($k['last'] ?? 0))];
        if (count($out) >= PK_MAX_KEYS) break;
    }
    return $out;
}
function pk_keys(): array { return pk_clean(hub_jread(pk_file())); }
/** The one account's id for passkeys (WebAuthn wants a stable opaque id): made from the site's own secret, so it never changes and nothing has to be kept. */
function pk_uid(): string { return pk_b64u(substr(hash_hmac('sha256', 'passkey-account', (string)(hub_auth()['secret'] ?? 'no-secret-yet'), true), 0, 16)); }
function pk_any(): bool { return is_file(hub_jpath(pk_file())) && pk_keys() !== []; }
function pk_save(array $keys): bool {
    if (!$keys) { @unlink(hub_jpath(pk_file())); return true; }   // no passkeys left: no file, and the login box stops offering them
    return hub_jput(pk_file(), (string)json_encode(['keys' => array_values($keys)], JSON_UNESCAPED_SLASHES));
}
/** What Settings is shown: no keys, only names, dates and the id (to remove one). */
function pk_view(): array { return array_map(fn($k) => ['id' => $k['id'], 'name' => $k['name'], 'at' => $k['at'], 'last' => $k['last']], pk_keys()); }
function pk_lock_run(callable $fn) {
    return hub_with_lock(hub_dir('core') . '/passkeys.lock', $fn);
}

/* ---------- challenges: single-use, five minutes ---------- */
function pk_chal_new(string $type, ?int $now = null): ?string {
    $now = $now ?? time();
    return pk_lock_run(function () use ($type, $now) {
        $d = hub_jread(pk_chal_file()) ?? []; $c = [];
        foreach ((array)($d['c'] ?? []) as $h => $x) if (is_array($x) && (int)($x['e'] ?? 0) > $now && preg_match('/^[a-f0-9]{64}$/', (string)$h)) $c[$h] = $x;
        $ip = hash('sha256', 'pk|' . hub_ip()); $mine = 0; foreach ($c as $x) if (($x['i'] ?? '') === $ip) $mine++;
        if ($mine >= PK_PER_IP) return null;   // too many asked for from one address: wait a few minutes
        if (count($c) >= PK_CHALLENGE_MAX) { uasort($c, fn($a, $b) => $a['e'] <=> $b['e']); $c = array_slice($c, -PK_CHALLENGE_MAX + 1, null, true); }
        $chal = random_bytes(32);
        $c[hash('sha256', $chal)] = ['t' => $type, 'e' => $now + PK_CHALLENGE_TTL, 'i' => $ip];
        hub_jput(pk_chal_file(), (string)json_encode(['c' => (object)$c]));
        return pk_b64u($chal);
    });
}
/** True once for a challenge that was made for $type, is not expired and was not used. */
function pk_chal_use(string $chal, string $type, ?int $now = null): bool {
    $bin = pk_unb64u($chal); if ($bin === null || strlen($bin) !== 32) return false;
    $now = $now ?? time();
    return pk_lock_run(function () use ($bin, $type, $now) {
        $d = hub_jread(pk_chal_file()) ?? []; $c = (array)($d['c'] ?? []); $h = hash('sha256', $bin);
        $ok = isset($c[$h]) && is_array($c[$h]) && ($c[$h]['t'] ?? '') === $type && (int)($c[$h]['e'] ?? 0) > $now;
        unset($c[$h]);
        hub_jput(pk_chal_file(), (string)json_encode(['c' => (object)$c]));
        return $ok;
    });
}

/* ---------- checks ---------- */
/** clientDataJSON: the right kind, the challenge that was issued, this site's address, not from inside another site. Returns the raw bytes' hash. */
function pk_client_data(string $json, string $type, string $chalB64u, string $origin): string {
    $j = json_decode($json, true);
    if (!is_array($j) || ($j['type'] ?? '') !== $type) throw new Exception('That answer is not for this step.');
    if (!hash_equals($chalB64u, (string)($j['challenge'] ?? ''))) throw new Exception('That answer is for another request.');
    if (strtolower((string)($j['origin'] ?? '')) !== strtolower($origin)) throw new Exception('That answer came from another website, so it was refused.');
    if (!empty($j['crossOrigin'])) throw new Exception('That answer came from inside another page, so it was refused.');
    return hash('sha256', $json, true);
}
/** authenticatorData: [rpIdHash ok, flags, signCount, rest]. */
function pk_auth_data(string $ad, string $rp): array {
    if (strlen($ad) < 37) throw new Exception('That answer is damaged.');
    if (!hash_equals(hash('sha256', $rp, true), substr($ad, 0, 32))) throw new Exception('That passkey belongs to another website address.');
    return ['flags' => ord($ad[32]), 'cnt' => unpack('N', substr($ad, 33, 4))[1], 'rest' => substr($ad, 37)];
}

/**
 * A new passkey from the browser's answer (attestation "none"): {clientDataJSON, attestationObject}, both base64url. Returns the credential to keep.
 * Throws an Exception whose message can be shown as it is.
 */
function pk_register(array $resp, string $chalB64u, string $name, ?string $rp = null, ?string $origin = null): array {
    $cd = pk_unb64u($resp['clientDataJSON'] ?? null); $ao = pk_unb64u($resp['attestationObject'] ?? null);
    if ($cd === null || $ao === null) throw new Exception('That answer is damaged.');
    pk_client_data($cd, 'webauthn.create', $chalB64u, $origin ?? pk_origin());
    try { $att = pk_cbor($ao); } catch (Exception $e) { throw new Exception('That answer is damaged.'); }
    if (!is_array($att) || !is_string($att['authData'] ?? null)) throw new Exception('That answer is damaged.');
    $a = pk_auth_data($att['authData'], $rp ?? pk_rp());
    if (!($a['flags'] & 0x01)) throw new Exception('The device did not confirm that you were there.');
    if (!($a['flags'] & 0x40) || strlen($a['rest']) < 18) throw new Exception('That answer holds no key.');
    $len = unpack('n', substr($a['rest'], 16, 2))[1];
    if ($len < 1 || $len > 1023 || strlen($a['rest']) < 18 + $len) throw new Exception('That answer is damaged.');
    $credId = substr($a['rest'], 18, $len); $o = 0;
    try { $cose = pk_cbor(substr($a['rest'], 18 + $len), $o); } catch (Exception $e) { throw new Exception('That answer is damaged.'); }
    $pem = pk_cose_pem($cose);
    if (!$pem) throw new Exception('This device uses a kind of key that is not supported here (only ES256 and RS256).');
    if (!@openssl_pkey_get_public($pem[1])) throw new Exception('That key could not be read.');
    $name = mb_substr(trim((string)preg_replace('/[\x00-\x1F\x7F]/u', '', $name)), 0, 40);
    return ['id' => pk_b64u($credId), 'name' => $name !== '' ? $name : 'Passkey', 'alg' => $pem[0], 'key' => $pem[1], 'cnt' => $a['cnt'], 'at' => time(), 'last' => 0, 'uv' => (bool)($a['flags'] & 0x04)];
}

/**
 * A login: {id, response: {clientDataJSON, authenticatorData, signature}} with the challenge that was issued. Returns the key (with its new count) when
 * everything fits, otherwise throws. The device must say it verified the person (fingerprint, face or PIN): without that a passkey is one factor, not two.
 */
function pk_login(array $p, string $chalB64u, array $keys, ?string $rp = null, ?string $origin = null): array {
    $r = is_array($p['response'] ?? null) ? $p['response'] : [];
    $cd = pk_unb64u($r['clientDataJSON'] ?? null); $ad = pk_unb64u($r['authenticatorData'] ?? null); $sig = pk_unb64u($r['signature'] ?? null);
    if ($cd === null || $ad === null || $sig === null || !is_string($p['id'] ?? null)) throw new Exception('That answer is damaged.');
    $key = null; foreach ($keys as $k) if (hash_equals($k['id'], $p['id'])) $key = $k;
    if ($key === null) throw new Exception('This passkey is not set up on this site.');
    $hash = pk_client_data($cd, 'webauthn.get', $chalB64u, $origin ?? pk_origin());
    $a = pk_auth_data($ad, $rp ?? pk_rp());
    if (!($a['flags'] & 0x01)) throw new Exception('The device did not confirm that you were there.');
    if (!($a['flags'] & 0x04)) throw new Exception('Your device did not check that it is you (fingerprint, face or PIN), so the passkey was not accepted.');
    $pub = @openssl_pkey_get_public($key['key']);
    if (!$pub || openssl_verify($ad . $hash, $sig, $pub, OPENSSL_ALGO_SHA256) !== 1) throw new Exception('The passkey did not prove itself.');
    if (($a['cnt'] !== 0 || $key['cnt'] !== 0) && $a['cnt'] <= $key['cnt']) throw new Exception('This passkey looks copied (its use counter went back), so it was refused.');
    $key['cnt'] = $a['cnt']; $key['last'] = time();
    return $key;
}
