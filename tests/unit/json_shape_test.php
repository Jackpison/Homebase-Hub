<?php
// 1.79.5: one shape for a failed answer. hub_json_body() (core/boot.php) adds `ok:false` to an answer with an HTTP error code (400 and up)
// and an `error` text, so Links, Home and the other pages all fail the same way. Answers that succeed, or that already carry an `ok`,
// are left exactly as they were. Also checks that Home still sends its answers through the core's hub_json. Runs on its own copy of src/ (run.php).
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/hub/core/lib/boot.php';

$b = hub_json_body(400, ['error' => 'Nope']);
t('a 400 with an error gets ok:false', ($b['ok'] ?? null) === false && $b['error'] === 'Nope', json_encode($b));
t('...and ok comes first', array_key_first($b) === 'ok');
foreach ([401, 403, 404, 405, 409, 413, 429, 500, 502] as $c) t("code $c with an error gets ok:false", (hub_json_body($c, ['error' => 'x'])['ok'] ?? null) === false);
t('extra fields stay (the Links key conflict sends the vault)', hub_json_body(409, ['error' => 'x', 'vault' => ['wrap' => 'w']])['vault']['wrap'] === 'w');
t('a 200 answer is not touched', hub_json_body(200, ['error' => 'odd']) === ['error' => 'odd']);
t('a 200 success is not touched', hub_json_body(200, ['ok' => true, 'rev' => 3]) === ['ok' => true, 'rev' => 3]);
t('an error answer that already has ok keeps it', hub_json_body(400, ['ok' => false, 'error' => 'x', 'need2fa' => true]) === ['ok' => false, 'error' => 'x', 'need2fa' => true]);
t('an error code without an error text is not touched', hub_json_body(404, ['hint' => 'x']) === ['hint' => 'x']);
t('a non-array answer is returned as it is', hub_json_body(500, 'text') === 'text');
t('the code may be a string', (hub_json_body('400', ['error' => 'x'])['ok'] ?? null) === false);

$home = (string)file_get_contents($site . '/web/home/api.php');
t('Home sends every answer through the core hub_json', preg_match('/function out\(array \$d, int \$code = 200\): never \{ hub_json\(\$code, \$d\); \}/', $home) === 1);
$core = (string)file_get_contents($site . '/web/hub/core/api.php');
t('a missing changelog file is a 404 with ok:false, not a 200', strpos($core, "hub_json(404, ['ok' => false, 'error' => 'The changelog file is not on your server") !== false);
t('no answer sends ok:false with HTTP 200 except the approval wait', substr_count($core, "hub_json(200, ['ok' => false") === 1 && strpos($core, "hub_json(200, ['ok' => false, 'wait' => true") !== false);
