<?php
// 1.61.0: passkeys (web/hub/core/lib/passkey.php). A software authenticator made here (real P-256 and RSA keys, real signatures) is registered and used to log in;
// every way an answer can be wrong is tried. Runs on its own copy of src/ (run.php).
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/hub/core/lib/boot.php';
require $site . '/web/hub/core/lib/passkey.php';

/* ---------- a small CBOR writer and a software authenticator ---------- */
final class Bytes { public function __construct(public string $s) {} }
function cb($v): string {
    $head = function (int $mt, int $n): string { return $n < 24 ? chr(($mt << 5) | $n) : ($n < 256 ? chr(($mt << 5) | 24) . chr($n) : ($n < 65536 ? chr(($mt << 5) | 25) . pack('n', $n) : chr(($mt << 5) | 26) . pack('N', $n))); };
    if (is_int($v)) return $v >= 0 ? $head(0, $v) : $head(1, -1 - $v);
    if ($v instanceof Bytes) return $head(2, strlen($v->s)) . $v->s;
    if (is_string($v)) return $head(3, strlen($v)) . $v;
    if (is_bool($v)) return chr(0xF4 + (int)$v);
    if (is_array($v)) {
        if (array_is_list($v)) return $head(4, count($v)) . implode('', array_map('cb', $v));
        $o = $head(5, count($v)); foreach ($v as $k => $x) $o .= cb($k) . cb($x); return $o;
    }
    throw new Exception('cb');
}
final class Auth {
    public $priv; public string $credId; public int $alg; public array $cose;
    public function __construct(int $alg = -7) {
        $this->alg = $alg; $this->credId = random_bytes(32);
        if ($alg === -7) {
            $this->priv = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]); $ec = openssl_pkey_get_details($this->priv)['ec'];
            $this->cose = [1 => 2, 3 => -7, -1 => 1, -2 => new Bytes(str_pad($ec['x'], 32, "\0", STR_PAD_LEFT)), -3 => new Bytes(str_pad($ec['y'], 32, "\0", STR_PAD_LEFT))];
        } else {
            $this->priv = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]); $r = openssl_pkey_get_details($this->priv)['rsa'];
            $this->cose = [1 => 3, 3 => -257, -1 => new Bytes($r['n']), -2 => new Bytes($r['e'])];
        }
    }
    public function authData(string $rp, int $flags, int $cnt, bool $withKey): string {
        $d = hash('sha256', $rp, true) . chr($flags) . pack('N', $cnt);
        if ($withKey) $d .= str_repeat("\0", 16) . pack('n', strlen($this->credId)) . $this->credId . cb($this->cose);
        return $d;
    }
    public function create(string $rp, string $origin, string $chal, int $flags = 0x45, int $cnt = 0, string $type = 'webauthn.create'): array {
        $cd = json_encode(['type' => $type, 'challenge' => $chal, 'origin' => $origin, 'crossOrigin' => false]);
        return ['clientDataJSON' => pk_b64u($cd), 'attestationObject' => pk_b64u(cb(['fmt' => 'none', 'attStmt' => [], 'authData' => new Bytes($this->authData($rp, $flags, $cnt, true))]))];
    }
    public function get(string $rp, string $origin, string $chal, int $flags = 0x05, int $cnt = 1, ?string $badSig = null, string $type = 'webauthn.get'): array {
        $cd = json_encode(['type' => $type, 'challenge' => $chal, 'origin' => $origin, 'crossOrigin' => false]);
        $ad = $this->authData($rp, $flags, $cnt, false); $sig = '';
        openssl_sign($ad . hash('sha256', $cd, true), $sig, $this->priv, OPENSSL_ALGO_SHA256);
        return ['clientDataJSON' => pk_b64u($cd), 'authenticatorData' => pk_b64u($ad), 'signature' => pk_b64u($badSig ?? $sig)];
    }
}
$rp = 'hub.example.com'; $origin = 'https://hub.example.com';
$throws = function (callable $f, string $part = ''): bool { try { $f(); return false; } catch (Exception $e) { return $part === '' || stripos($e->getMessage(), $part) !== false; } };

/* ---------- CBOR ---------- */
$samples = [0, 1, 23, 24, 255, 256, 65535, 65536, -1, -7, -257, 'text', new Bytes("\x00\xff\x10"), [1, 2, 3], ['a' => 1, 'b' => [true, false]], [1 => 2, 3 => -7, -1 => new Bytes('xy')]];
$ok = true; foreach ($samples as $v) { $o = 0; $b = cb($v); $r = pk_cbor($b, $o); $ok = $ok && $o === strlen($b) && json_encode($r) === json_encode($v instanceof Bytes ? $v->s : ($v instanceof Bytes ? $v : cbPlain($v))); }
function cbPlain($v) { if ($v instanceof Bytes) return $v->s; if (is_array($v)) return array_map('cbPlain', $v); return $v; }
t('CBOR: numbers, text, bytes, lists and maps with negative keys read back exactly', $ok);
foreach ([['truncated', substr(cb(['a' => new Bytes(str_repeat('x', 50))]), 0, 20)], ['an indefinite-length list', "\x9f\x01\xff"], ['a float', "\xfb\x3f\xf0\x00\x00\x00\x00\x00\x00"], ['a tag', "\xc1\x1a\x51\x4b\x67\xb0"],
          ['a list that says it is huge', "\x99\xff\xff"], ['bytes longer than the data', "\x58\xff\x01"], ['empty', ''], ['text that is not UTF-8', "\x62\xc3\x28"]] as [$what, $bin]) {
    t("CBOR refuses $what", $throws(function () use ($bin) { $o = 0; pk_cbor($bin, $o); }));
}
$deep = str_repeat("\x81", 12) . "\x01";
t('CBOR refuses nesting that is far too deep', $throws(function () use ($deep) { $o = 0; pk_cbor($deep, $o); }));
t('CBOR refuses a map whose key is a list', $throws(function () { $o = 0; pk_cbor("\xa1\x81\x01\x02", $o); }));

/* ---------- keys: COSE to PEM ---------- */
$es = new Auth(-7); $rs = new Auth(-257);
$coseOf = fn(Auth $a) => pk_cbor(cb($a->cose));   // as the device sends it: read back from CBOR
[$alg, $pem] = pk_cose_pem($coseOf($es)) ?? [0, ''];
t('an ES256 key becomes a PEM public key OpenSSL accepts', $alg === -7 && strncmp($pem, '-----BEGIN PUBLIC KEY-----', 26) === 0 && (bool)openssl_pkey_get_public($pem));
[$alg2, $pem2] = pk_cose_pem($coseOf($rs)) ?? [0, ''];
t('...and an RS256 key', $alg2 === -257 && (bool)openssl_pkey_get_public($pem2) && openssl_pkey_get_details(openssl_pkey_get_public($pem2))['bits'] === 2048);
t('a key of another kind (ES384) is not supported', pk_cose_pem([1 => 2, 3 => -35, -1 => 2, -2 => new Bytes(str_repeat('x', 48)), -3 => new Bytes(str_repeat('y', 48))]) === null);
t('a point that is the wrong length is refused', pk_cose_pem([1 => 2, 3 => -7, -1 => 1, -2 => 'xx', -3 => 'yy']) === null && pk_cose_pem('junk') === null);

/* ---------- challenges ---------- */
$c1 = pk_chal_new('create');
t('a challenge is 32 random bytes, base64url', is_string($c1) && strlen(pk_unb64u($c1)) === 32);
$c2 = pk_chal_new('get'); $now = time();
t('a challenge works once', pk_chal_use($c2, 'get') && !pk_chal_use($c2, 'get'));
$c3 = pk_chal_new('get', $now - 400);
t('a challenge older than five minutes does not work', !pk_chal_use($c3, 'get'));
$c4 = pk_chal_new('create'); t('a challenge made for registering does not log anyone in', !pk_chal_use($c4, 'get') && !pk_chal_use($c4, 'create'));
t('a challenge that was never made, or is not base64url, does not work', !pk_chal_use(pk_b64u(random_bytes(32)), 'get') && !pk_chal_use('not base64!', 'get') && !pk_chal_use(pk_b64u('short'), 'get'));
$made = 0; for ($i = 0; $i < PK_PER_IP + 3; $i++) if (pk_chal_new('get') !== null) $made++;
t('one address can ask for only ' . PK_PER_IP . ' challenges at a time (the rest wait)', $made <= PK_PER_IP && pk_chal_new('get') === null);
@unlink(hub_jpath(pk_chal_file()));

/* ---------- registering ---------- */
$ch = pk_chal_new('create');
$cred = pk_register($es->create($rp, $origin, $ch), $ch, '  My Phone ', $rp, $origin);
t('a passkey is registered from the device\'s answer: id, name, algorithm, public key, counter', $cred['id'] === pk_b64u($es->credId) && $cred['name'] === 'My Phone' && $cred['alg'] === -7 && $cred['uv'] === true && strncmp($cred['key'], '-----BEGIN', 10) === 0);
$ch = pk_chal_new('create'); $rcred = pk_register($rs->create($rp, $origin, $ch), $ch, 'Laptop', $rp, $origin);
t('...an RS256 one too', $rcred['alg'] === -257);
$ch = pk_chal_new('create');
foreach ([
    ['a different challenge', fn() => pk_register($es->create($rp, $origin, 'other'), $ch, 'x', $rp, $origin), 'another request'],
    ['another website\'s address', fn() => pk_register($es->create($rp, 'https://evil.example', $ch), $ch, 'x', $rp, $origin), 'another website'],
    ['a passkey made for another site (rp id hash)', fn() => pk_register($es->create('evil.example', $origin, $ch), $ch, 'x', $rp, $origin), 'another website address'],
    ['an answer for logging in, not registering', fn() => pk_register($es->create($rp, $origin, $ch, 0x45, 0, 'webauthn.get'), $ch, 'x', $rp, $origin), 'not for this step'],
    ['a device that did not confirm presence', fn() => pk_register($es->create($rp, $origin, $ch, 0x44), $ch, 'x', $rp, $origin), 'confirm'],
    ['an answer without a key', fn() => pk_register($es->create($rp, $origin, $ch, 0x05), $ch, 'x', $rp, $origin), 'no key'],
    ['damaged text', fn() => pk_register(['clientDataJSON' => '!!', 'attestationObject' => '!!'], $ch, 'x', $rp, $origin), 'damaged'],
    ['an attestation that is not CBOR', fn() => pk_register(['clientDataJSON' => pk_b64u(json_encode(['type' => 'webauthn.create', 'challenge' => $ch, 'origin' => $origin])), 'attestationObject' => pk_b64u('nonsense')], $ch, 'x', $rp, $origin), 'damaged'],
] as [$what, $f, $msg]) t("registering is refused for $what", $throws($f, $msg));
$cd = json_encode(['type' => 'webauthn.create', 'challenge' => $ch, 'origin' => $origin, 'crossOrigin' => true]);
$resp = $es->create($rp, $origin, $ch); $resp['clientDataJSON'] = pk_b64u($cd);
t('...and for an answer that came from inside another page (crossOrigin)', $throws(fn() => pk_register($resp, $ch, 'x', $rp, $origin), 'another page'));
$bad = new Auth(-7); $bad->cose[3] = -35;
t('...and for a key of a kind that is not supported', $throws(fn() => pk_register($bad->create($rp, $origin, $ch), $ch, 'x', $rp, $origin), 'not supported'));
$long = pk_register($es->create($rp, $origin, $ch), $ch, str_repeat('é', 100) . "\x07", $rp, $origin);
t('a name is cut to 40 characters and loses control characters', mb_strlen($long['name']) === 40 && strpos($long['name'], "\x07") === false);

/* ---------- logging in ---------- */
$keys = [$cred, $rcred]; $ch = pk_chal_new('get');
$k = pk_login(['id' => pk_b64u($es->credId), 'response' => $es->get($rp, $origin, $ch, 0x05, 1)], $ch, $keys, $rp, $origin);
t('a login with the right key, an answer from this site and a verified person is accepted, and the counter moves on', $k['id'] === $cred['id'] && $k['cnt'] === 1 && $k['last'] > 0);
$ch = pk_chal_new('get'); $k = pk_login(['id' => pk_b64u($rs->credId), 'response' => $rs->get($rp, $origin, $ch, 0x05, 7)], $ch, $keys, $rp, $origin);
t('...an RS256 key too', $k['id'] === $rcred['id'] && $k['cnt'] === 7);
$login = function (Auth $a, array $over = []) use (&$keys, &$ch, $rp, $origin) { return pk_login(['id' => pk_b64u($a->credId), 'response' => $a->get(...array_merge(['rp' => $rp, 'origin' => $origin, 'chal' => $ch, 'flags' => 0x05, 'cnt' => 5], $over))], $ch, $keys, $rp, $origin); };
$ch = pk_chal_new('get');
foreach ([
    ['an answer made for another challenge', fn() => $login($es, ['chal' => 'x' . $ch]), 'another request'],
    ['another website\'s address', fn() => $login($es, ['origin' => 'https://evil.example']), 'another website'],
    ['another site\'s rp id hash (a passkey phished on a look-alike site)', fn() => $login($es, ['rp' => 'hub.example.com.evil.example']), 'another website address'],
    ['a registering answer used to log in', fn() => $login($es, ['type' => 'webauthn.create']), 'not for this step'],
    ['a person the device did not verify (no fingerprint, face or PIN)', fn() => $login($es, ['flags' => 0x01]), 'check that it is you'],
    ['a device that did not confirm presence', fn() => $login($es, ['flags' => 0x04]), 'confirm'],
    ['a signature that is wrong', fn() => $login($es, ['badSig' => random_bytes(70)]), 'did not prove'],
    ['an empty signature', fn() => $login($es, ['badSig' => '']), 'damaged'],
] as [$what, $f, $msg]) t("a login is refused for $what", $throws($f, $msg));
$other = new Auth(-7);
t('a login with a key this site does not know is refused', $throws(fn() => pk_login(['id' => pk_b64u($other->credId), 'response' => $other->get($rp, $origin, $ch)], $ch, $keys, $rp, $origin), 'not set up'));
t('a signature made by a different key under a known id is refused', $throws(fn() => pk_login(['id' => pk_b64u($es->credId), 'response' => $other->get($rp, $origin, $ch)], $ch, $keys, $rp, $origin), 'did not prove'));
t('an answer with missing parts is refused', $throws(fn() => pk_login(['id' => pk_b64u($es->credId), 'response' => ['clientDataJSON' => 'x']], $ch, $keys, $rp, $origin), 'damaged') && $throws(fn() => pk_login([], $ch, $keys, $rp, $origin), 'damaged'));
$keys[0]['cnt'] = 10;
t('a counter that goes back (a copied passkey) is refused', $throws(fn() => $login($es, ['cnt' => 10]), 'copied') && $throws(fn() => $login($es, ['cnt' => 3]), 'copied'));
t('...a counter that goes on is fine', $login($es, ['cnt' => 11])['cnt'] === 11);
$keys[0]['cnt'] = 0;
t('a device that never counts (counter 0 every time, like a synced passkey) is accepted', $login($es, ['cnt' => 0])['cnt'] === 0);

/* ---------- what is stored ---------- */
t('nothing is stored yet, and the login box does not offer passkeys', !pk_any() && pk_keys() === [] && !hub_public_state()['passkeys']);
pk_save([$cred, $rcred]); $u1 = pk_uid(); pk_save([$cred, $rcred, $rcred]);
t('keys are stored in a guarded file (public keys only), with a stable account id', pk_any() && strncmp((string)file_get_contents(hub_jpath(pk_file())), '<?php', 5) === 0 && pk_uid() === $u1 && strlen(pk_unb64u($u1)) === 16 && count(pk_keys()) === 2 && hub_public_state()['passkeys'] === true);
$raw = (string)file_get_contents(hub_jpath(pk_file()));
t('...no private key, and nothing that could log anyone in', strpos($raw, 'PRIVATE') === false && strpos($raw, 'password') === false);
t('what Settings is shown has the id, the name and the dates only (no key)', array_keys(pk_view()[0]) === ['id', 'name', 'at', 'last'] && strpos(json_encode(pk_view()), 'BEGIN') === false);
hub_write(hub_jpath(pk_file()), HUB_GUARD . json_encode(['keys' => [['id' => 'not base64!', 'alg' => -7, 'key' => $cred['key']], ['id' => $cred['id'], 'alg' => 99, 'key' => $cred['key']], ['id' => $cred['id'], 'alg' => -7, 'key' => 'plain text'], $cred, 'junk']]));
t('a damaged or hand-edited file: what does not fit (and a key listed twice) is left out', count(pk_keys()) === 1 && pk_keys()[0]['id'] === $cred['id']);
$many = []; for ($i = 0; $i < PK_MAX_KEYS + 3; $i++) { $c = $cred; $c['id'] = pk_b64u(random_bytes(20)); $many[] = $c; }
pk_save($many);
t('at most ' . PK_MAX_KEYS . ' passkeys are kept', count(pk_keys()) === PK_MAX_KEYS);
pk_save([]);
t('with none left the file is gone and the login box stops offering a passkey', !is_file(hub_jpath(pk_file())) && !pk_any() && !hub_public_state()['passkeys']);
t('the site\'s address for passkeys is its host without the port, and its origin keeps the port', (function () { $_SERVER['HTTP_HOST'] = 'Hub.Example.com:8443'; $r = pk_rp() === 'hub.example.com' && pk_origin() === 'http://hub.example.com:8443'; $_SERVER['HTTP_HOST'] = '[::1]:80'; return $r && pk_rp() === '::1'; })());
require $site . '/web/hub/core/lib/backup.php';
pk_save([$cred]); @file_put_contents(hub_jpath(pk_chal_file()), HUB_GUARD . '{}');
t('Start Over removes the passkeys and their challenges', in_array('Passkeys', bk_reset_all(), true) && !pk_any() && !is_file(hub_jpath(pk_chal_file())));
