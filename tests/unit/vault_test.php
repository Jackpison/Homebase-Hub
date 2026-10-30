<?php
// 1.61.0: the site key (web/hub/core/lib/vault.php): the wrapped key that locks Files, Cards and Tools presets. The server only holds
// it wrapped; a change must name the wrap it replaces; a backup carries it. Runs on its own copy of src/ (run.php).
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/hub/core/lib/boot.php';
require $site . '/web/hub/core/lib/backup.php';

$b64 = fn(int $n) => base64_encode(random_bytes($n));
$vault = fn() => ['v' => 1, 'salt' => $b64(16), 'iter' => 600000, 'wrap' => $b64(60)];
$kid = bin2hex(random_bytes(8));

t('no site key at first', sv_get() === null && sv_in_use() === []);
$v1 = $vault() + ['kid' => $kid];
t('a key is refused when it claims to replace something that is not there', sv_swap($v1, 'AAAA') === 'conflict' && sv_get() === null);
t('...and one that is the wrong shape', sv_swap(['v' => 1, 'salt' => 'x', 'iter' => 5, 'wrap' => 'y'], '') === 'bad' && sv_get() === null);
t('...or has a wrap with odd characters', sv_swap(['v' => 1, 'salt' => $b64(16), 'iter' => 600000, 'wrap' => '<script>alert(1)</script>' . str_repeat('A', 30)], '') === 'bad');
t('the first key is stored', sv_swap($v1, '') === '' && sv_get()['wrap'] === $v1['wrap'] && sv_get()['kid'] === $kid);
$raw = (string)file_get_contents(hub_jpath(sv_file()));
t('...in a guarded PHP file (a browser gets nothing)', strncmp($raw, '<?php', 5) === 0 && strpos($raw, $v1['wrap']) !== false);
t('...and no readable passphrase or key is anywhere in it', stripos($raw, 'passphrase') === false && !preg_match('/"key"\s*:/', $raw));
t('a second key made at the same time (no prev) is refused: a stale page can not replace it', sv_swap($vault(), '') === 'conflict' && sv_get()['wrap'] === $v1['wrap']);
$v2 = $vault() + ['rec' => ['salt' => $b64(16), 'iter' => 600000, 'wrap' => $b64(60)]];   // the passphrase changed: same key, new wrap, no id sent
t('a change that names the right wrap is stored', sv_swap($v2, $v1['wrap']) === '' && sv_get()['wrap'] === $v2['wrap']);
t('...the key keeps its id, and the recovery wrap comes with it', sv_get()['kid'] === $kid && sv_get()['rec']['wrap'] === $v2['rec']['wrap']);
t('...and the old wrap can not be used again', sv_swap($vault(), $v1['wrap']) === 'conflict' && sv_get()['wrap'] === $v2['wrap']);
$v3 = $vault() + ['login' => true];
t('a key locked with the website password is stored without that mark: only the passphrase opens the site key', sv_swap($v3, $v2['wrap']) === '' && !isset(sv_get()['login']));
t('a bad id is ignored, the old one stays', sv_swap($vault() + ['kid' => 'ZZ'], sv_get()['wrap']) === '' && sv_get()['kid'] === $kid);

// backups: the wrapped key travels with data that is locked with it
$bk = bk_export(['cards' => true]);
t('a backup with Cards carries the wrapped key', isset($bk['parts']->sitevault) && $bk['parts']->sitevault['wrap'] === sv_get()['wrap']);
t('a backup with only Links does not', !isset(bk_export(['links' => true])['parts']->sitevault));
$locked = ['enc' => 'enc1:AAAA', 'kid' => $kid];
$fileVault = sv_get();
sv_clear();
t('the key is gone after sv_clear', sv_get() === null);
$threw = false; try { bk_sitevault_for(['cards' => $locked], ['cards' => true]); } catch (Exception $e) { $threw = true; }
t('locked Cards without their key in the file are refused', $threw);
bk_sitevault_for(['cards' => $locked, 'sitevault' => $fileVault], ['cards' => true]);
t('a site without a key takes the one in the file', sv_get() !== null && sv_get()['wrap'] === $fileVault['wrap']);
bk_sitevault_for(['cards' => $locked, 'sitevault' => $fileVault], ['cards' => true]);
t('restoring locked Cards made with the same key works', true);
$threw = false; try { bk_sitevault_for(['cards' => ['enc' => 'enc1:AAAA', 'kid' => bin2hex(random_bytes(8))]], ['cards' => true]); } catch (Exception $e) { $threw = true; }
t('locked Cards made with another key are refused (they could never open)', $threw);
bk_sitevault_for(['cards' => ['cards' => [], 'people' => []]], ['cards' => true]);
t('plain Cards never need a key', true);
$wrapBefore = sv_get()['wrap'];
bk_sitevault_for(['cards' => $locked, 'sitevault' => $vault()], ['cards' => true]);
t('a site that has a key keeps it (the file\'s key is not installed over it)', sv_get()['wrap'] === $wrapBefore);

// what is in use: read from each page's own data file
t('nothing is locked yet', sv_in_use() === []);
hub_jput(hub_dir('cards') . '/cards.json', json_encode(['enc' => 'enc1:AAAA', 'kid' => $kid]));
t('locked Cards are reported', sv_in_use() === ['Cards']);
hub_jput(hub_dir('cards') . '/cards.json', json_encode(['cards' => [], 'people' => []]));
t('plain Cards are not', sv_in_use() === []);
hub_jput(hub_dir('tools') . '/presets.json', json_encode(['kinds' => [], 'locked' => true]));
t('locked Tools presets are reported', sv_in_use() === ['Tools presets']);
