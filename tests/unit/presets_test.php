<?php
// 1.60: Tools' saved presets (web/hub/core/lib/presets.php): kept on the server, checked, size-limited, and part of the site backup.
// Runs on its own copy of src/ (run.php).
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/hub/core/lib/boot.php';
require $site . '/web/hub/core/lib/backup.php';
require $site . '/web/hub/core/lib/presets.php';

$png = 'data:image/png;base64,' . base64_encode("\x89PNG\r\n\x1a\nfake");
t('no presets at first', pr_load() === ['kinds' => []] && json_encode(pr_view(pr_load())) === '{"kinds":{},"locked":false,"kid":"","pp":false}');
[$c, $r] = pr_change(['op' => 'add', 'kind' => 'sign', 'name' => '  My Signature ', 'data' => ['img' => $png, 'colour' => '#000000', 'size' => 1.5, 'on' => true]]);
t('a signature is saved, its name trimmed', $c === 200 && $r['kinds']->sign[0]['name'] === 'My Signature' && $r['kinds']->sign[0]['data']['img'] === $png, json_encode($r));
t('...in a guarded PHP file inside site-data/tools (a browser gets nothing)', is_file(hub_dir('tools') . '/presets.php') && strncmp((string)file_get_contents(hub_dir('tools') . '/presets.php'), '<?php', 5) === 0);
[$c] = pr_change(['op' => 'add', 'kind' => 'sign', 'name' => 'my signature', 'data' => ['img' => $png, 'size' => 2]]);
t('the same name (any case) replaces the old one instead of adding a second', $c === 200 && count(pr_load()['kinds']['sign']) === 1 && pr_load()['kinds']['sign'][0]['data']['size'] === 2);
foreach ([
    ['an unknown kind', ['op' => 'add', 'kind' => 'evil', 'name' => 'x', 'data' => ['a' => 1]], 400],
    ['an empty name', ['op' => 'add', 'kind' => 'qr', 'name' => '  ', 'data' => ['a' => 1]], 400],
    ['a picture from another website', ['op' => 'add', 'kind' => 'qr', 'name' => 'x', 'data' => ['logo' => 'data:text/html;base64,PHNjcmlwdD4=']], 400],
    ['a javascript: address', ['op' => 'add', 'kind' => 'qr', 'name' => 'x', 'data' => ['url' => 'JavaScript:alert(1)']], 400],
    ['an odd key name', ['op' => 'add', 'kind' => 'qr', 'name' => 'x', 'data' => ['__proto__ x' => 1]], 400],
    ['settings nested too deep', ['op' => 'add', 'kind' => 'qr', 'name' => 'x', 'data' => json_decode(str_repeat('{"a":', 12) . '1' . str_repeat('}', 12), true)], 400],
    ['a preset over 600 KB', ['op' => 'add', 'kind' => 'invoice', 'name' => 'big', 'data' => ['logo' => 'data:image/png;base64,' . str_repeat('A', 700000)]], 413],
    ['an unknown action', ['op' => 'drop', 'kind' => 'qr'], 400],
] as [$what, $body, $want]) { [$c, $r] = pr_change($body); t("refused: $what ($want)", $c === $want && $r['ok'] === false, $c . ' ' . json_encode($r)); }
t('...and nothing of those was stored', array_keys(pr_load()['kinds']) === ['sign']);
for ($i = 1; $i <= PR_MAX_KIND; $i++) pr_change(['op' => 'add', 'kind' => 'resize', 'name' => "Size $i", 'data' => ['w' => $i, 'h' => $i]]);
[$c] = pr_change(['op' => 'add', 'kind' => 'resize', 'name' => 'One too many', 'data' => ['w' => 1]]);
t('at most ' . PR_MAX_KIND . ' presets of one kind', $c === 400 && count(pr_load()['kinds']['resize']) === PR_MAX_KIND);
$id = pr_load()['kinds']['resize'][0]['id'];
[$c] = pr_change(['op' => 'rename', 'kind' => 'resize', 'id' => $id, 'name' => 'Instagram Story']);
t('rename', $c === 200 && pr_load()['kinds']['resize'][0]['name'] === 'Instagram Story');
[$c] = pr_change(['op' => 'delete', 'kind' => 'resize', 'id' => $id]);
[$c2] = pr_change(['op' => 'delete', 'kind' => 'resize', 'id' => $id]);
t('delete, and deleting it again says it no longer exists (404)', $c === 200 && $c2 === 404 && count(pr_load()['kinds']['resize']) === PR_MAX_KIND - 1);
for ($i = 1; $i <= PR_MAX_KIND; $i++) pr_change(['op' => 'delete', 'kind' => 'resize', 'id' => pr_load()['kinds']['resize'][0]['id'] ?? 'none00']);
t('a kind with no presets left disappears', !isset(pr_load()['kinds']['resize']));
// a damaged or hand-edited file: what does not fit is left out, never an error
hub_jput(pr_file(), json_encode(['kinds' => ['sign' => [['id' => 'BAD id', 'name' => 'Kept', 'data' => ['x' => 1]], ['name' => '', 'data' => []], 'junk'], 'evil' => [['name' => 'x', 'data' => []]]]]));
$l = pr_load();
t('a damaged file: good presets kept (with a new id), broken ones and unknown kinds left out', array_keys($l['kinds']) === ['sign'] && count($l['kinds']['sign']) === 1 && preg_match('/^[a-z0-9]{10}$/', $l['kinds']['sign'][0]['id']), json_encode($l));

// the site backup
pr_change(['op' => 'add', 'kind' => 'invoice', 'name' => 'My Shop', 'data' => ['biz' => ['name' => 'Sharma Traders', 'taxId' => '27AAAAA0000A1Z5'], 'logo' => $png]]);
t('the backup lists Tools presets with their number', in_array('tools', BK_PARTS, true) && bk_overview()['tools']['summary'] === '2 saved presets', json_encode(bk_overview()['tools']));
$bk = json_decode(json_encode(bk_export(['tools' => true])), true);
t('a backup holds them', ($bk['parts']['tools']['kinds']['invoice'][0]['data']['biz']['name'] ?? '') === 'Sharma Traders');
pr_save(['kinds' => []]);
t('restore (replace) brings them back', bk_import($bk['parts'], ['tools' => true]) === ['Tools presets'] && pr_load()['kinds']['invoice'][0]['name'] === 'My Shop');
pr_change(['op' => 'add', 'kind' => 'qr', 'name' => 'Blue', 'data' => ['fg' => '#0000ff']]);
pr_change(['op' => 'add', 'kind' => 'invoice', 'name' => 'My Shop', 'data' => ['biz' => ['name' => 'Changed']]]);
bk_import($bk['parts'], ['tools' => true], 'merge');
$l = pr_load();
t('restore (merge) keeps presets made since, and the backup wins for the same name', isset($l['kinds']['qr']) && count($l['kinds']['invoice']) === 1 && $l['kinds']['invoice'][0]['data']['biz']['name'] === 'Sharma Traders', json_encode($l));
$bad = $bk; $bad['parts']['tools']['kinds']['sign'][0]['data']['img'] = 'https://evil.example/x.png';
bk_import($bad['parts'], ['tools' => true]);
t('a backup file cannot slip in a picture from another website', strpos(json_encode(pr_load()), 'evil.example') === false);
t('Start Over removes them', in_array('Tools presets', bk_reset_all(), true) && pr_load() === ['kinds' => []]);
$api = (string)file_get_contents($site . '/web/hub/core/api.php');
t('the API: reading needs the login; changing needs POST, the login and the security token', preg_match("/case 'presets':.*?need_admin\(false\).*?need_post\(\); need_admin\(\);/s", $api) === 1);


// ---- 1.61: presets locked in the browser ----
$enc = fn(string $seed = 'x') => 'enc1:' . base64_encode(str_pad($seed, 40, '.') . random_bytes(6));
$kid = bin2hex(random_bytes(8));
pr_save(['kinds' => []]);
[$c, $r] = pr_change(['op' => 'put', 'kind' => 'sign', 'enc' => $enc('sig'), 'kid' => $kid]);
t('a locked preset is stored as it is: only its locked text, an id and the date', $c === 200 && $r['locked'] === true && $r['kid'] === $kid && count($r['kinds']->sign) === 1 && array_keys($r['kinds']->sign[0]) === ['id', 'enc', 't'], json_encode($r));
$raw = (string)file_get_contents(hub_jpath(pr_file()));
t('...and nothing readable is in the file the server keeps', strpos($raw, 'name') === false && strpos($raw, 'data') === false && strncmp($raw, '<?php', 5) === 0);
$id = pr_load()['kinds']['sign'][0]['id'];
[$c] = pr_change(['op' => 'put', 'kind' => 'sign', 'id' => $id, 'enc' => $enc('renamed'), 'kid' => $kid]);
t('the same id again replaces it (a rename or new settings, made in the browser)', $c === 200 && count(pr_load()['kinds']['sign']) === 1);
foreach ([['plain text', 'hello'], ['markup', 'enc1:<script>alert(1)</script>AAAAAAAAAAAAAAAAAAAA'], ['too short', 'enc1:AAAA'], ['too long', 'enc1:' . str_repeat('A', PR_MAX_LOCKED + 10)]] as [$what, $e]) {
    [$c] = pr_change(['op' => 'put', 'kind' => 'sign', 'enc' => $e]); t("a locked preset that is $what is refused", $c === 400, (string)$c);
}
[$c] = pr_change(['op' => 'put', 'kind' => 'evil', 'enc' => $enc()]);
t('an unknown kind is refused for locked presets too', $c === 400);
for ($i = 1; $i < PR_MAX_KIND; $i++) pr_change(['op' => 'put', 'kind' => 'sign', 'enc' => $enc("n$i")]);
[$c] = pr_change(['op' => 'put', 'kind' => 'sign', 'enc' => $enc('one more')]);
t('at most ' . PR_MAX_KIND . ' locked presets of one kind', $c === 400 && count(pr_load()['kinds']['sign']) === PR_MAX_KIND);
[$c] = pr_change(['op' => 'delete', 'kind' => 'sign', 'id' => $id]);
t('a locked preset can be deleted', $c === 200 && count(pr_load()['kinds']['sign']) === PR_MAX_KIND - 1);
pr_save(['kinds' => []]);

// with a passphrase set, readable presets are refused (they must be locked); a rename of a locked one is made in the browser
hub_pp_mark(true);
[$c, $r] = pr_change(['op' => 'add', 'kind' => 'qr', 'name' => 'Blue', 'data' => ['fg' => '#0000ff']]);
t('while a passphrase is set, a readable preset is refused (409): the browser sends it locked', $c === 409 && pr_load()['kinds'] === [], json_encode($r));
pr_change(['op' => 'put', 'kind' => 'qr', 'enc' => $enc('qr1'), 'kid' => $kid]); $qid = pr_load()['kinds']['qr'][0]['id'];
[$c] = pr_change(['op' => 'rename', 'kind' => 'qr', 'id' => $qid, 'name' => 'Plain rename']);
t('...and a locked preset can not be renamed with a readable name', $c === 409);
t('the view says a passphrase is set and presets are locked', pr_view(pr_load())['pp'] === true && pr_view(pr_load())['locked'] === true);
t('sv_in_use lists Tools presets while one is locked', sv_in_use() === ['Tools presets']);
hub_pp_mark(false);

// converting everything at once
pr_save(['kinds' => []]);
pr_change(['op' => 'add', 'kind' => 'qr', 'name' => 'Blue', 'data' => ['fg' => '#0000ff']]); pr_change(['op' => 'add', 'kind' => 'resize', 'name' => 'Story', 'data' => ['w' => 1080, 'h' => 1920]]);
$l = pr_load(); $items = [];
foreach ($l['kinds'] as $k => $list) foreach ($list as $p) $items[] = ['kind' => $k, 'id' => $p['id'], 'enc' => $enc($p['name'])];
[$c, $r] = pr_change(['op' => 'lock_all', 'items' => $items, 'kid' => $kid]);
t('lock_all replaces every readable preset by its locked text, in one step', $c === 200 && $r['locked'] && $r['kid'] === $kid && !isset(pr_load()['kinds']['qr'][0]['name']) && !isset(pr_load()['kinds']['resize'][0]['data']), json_encode($r));
$ids = array_column($items, 'id');
t('...with the same ids and kinds', array_column(pr_load()['kinds']['qr'], 'id') === [$items[0]['id']] && in_array($items[1]['id'], array_column(pr_load()['kinds']['resize'], 'id'), true));
[$c] = pr_change(['op' => 'lock_all', 'items' => [['kind' => 'qr', 'id' => 'nope0000', 'enc' => $enc()]]]);
t('lock_all for a preset that is not there is refused (404): the list changed meanwhile', $c === 404);
[$c] = pr_change(['op' => 'lock_all', 'items' => [['kind' => 'qr', 'id' => $items[0]['id'], 'enc' => 'plain']]]);
t('...and with text that is not locked text', $c === 400);
$back = [['kind' => 'qr', 'id' => $items[0]['id'], 'name' => 'Blue', 'data' => ['fg' => '#0000ff']], ['kind' => 'resize', 'id' => $items[1]['id'], 'name' => 'Story', 'data' => ['w' => 1080, 'h' => 1920]]];
[$c, $r] = pr_change(['op' => 'unlock_all', 'items' => $back]);
t('unlock_all (the passphrase is being removed) brings the readable presets back, and nothing is marked locked', $c === 200 && $r['locked'] === false && pr_load()['kinds']['qr'][0]['name'] === 'Blue' && !sv_use_presets(), json_encode($r));
[$c] = pr_change(['op' => 'unlock_all', 'items' => [['kind' => 'qr', 'id' => $items[0]['id'], 'name' => 'x', 'data' => ['logo' => 'https://evil.example/x.png']]]]);
t('unlock_all cannot slip in an address from another website', $c === 400);

// a backup with locked presets carries them, and a site with another key refuses them
pr_save(['kinds' => []]); pr_change(['op' => 'put', 'kind' => 'qr', 'enc' => $enc('qr'), 'kid' => $kid]);
$bk = json_decode(json_encode(bk_export(['tools' => true])), true);
t('a backup holds locked presets locked, with the key id', $bk['parts']['tools']['locked'] === true && $bk['parts']['tools']['kid'] === $kid && isset($bk['parts']['tools']['kinds']['qr'][0]['enc']) && strpos(json_encode($bk), '"name"') === false);
sv_swap(['v' => 1, 'salt' => base64_encode(random_bytes(16)), 'iter' => 600000, 'wrap' => base64_encode(random_bytes(60)), 'kid' => bin2hex(random_bytes(8))], '');
$threw = false; try { bk_import($bk['parts'], ['tools' => true]); } catch (Exception $e) { $threw = true; }
t('restoring locked presets into a site with another key is refused', $threw);
