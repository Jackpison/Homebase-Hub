<?php
// The updater's upload and staging rules (lib/update.php): strict piece numbers, a refused zip clears an older checked one,
// and Apply with nothing ready is a 409 with a sentence (not a server failure).
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/core-data/lib/boot.php';
require_once $site . '/web/core-data/lib/update.php';

// piece numbers from the address
t('normal piece numbers are read', up_chunk_args(['id' => str_repeat('a', 16), 'i' => '0', 'n' => '3']) === [str_repeat('a', 16), 0, 3]);
foreach (['zz', '-1', '1.5', '', ' 1', '0x1', '99999'] as $bad)
    t("i = \"$bad\" is refused (not read as a number)", up_chunk_args(['id' => str_repeat('a', 16), 'i' => $bad, 'n' => '3']) === null);
t('a missing n is refused', up_chunk_args(['id' => str_repeat('a', 16), 'i' => '0']) === null);
t('an array instead of a number is refused', up_chunk_args(['id' => str_repeat('a', 16), 'i' => ['0'], 'n' => '3']) === null);
t('up_chunk still refuses i beyond n and a bad id', !up_chunk(str_repeat('a', 16), 3, 3, 'x')['ok'] && !up_chunk('../x', 0, 1, 'x')['ok']);

// a checked update, then a second upload that is refused
@mkdir(up_dir() . '/staging/web/core-data', 0755, true);
file_put_contents(up_dir() . '/staging/web/core-data/manifest.json', json_encode(['version' => '9.9.9', 'files' => []]));
$s = up_state(); $s['staged'] = ['version' => '9.9.9', 'sha256' => str_repeat('0', 64)]; $s['plan'] = ['updated' => [], 'new' => [], 'removed' => []]; $s['notes'] = 'x'; up_state_save($s);
t('setup: an update is staged', (up_status()['staged']['version'] ?? '') === '9.9.9');
file_put_contents(up_dir() . '/incoming.zip', 'not a zip, but long enough to be looked at as one');
$r = up_check('bad.zip');
t('the second zip is refused', $r['ok'] === false && $r['error'] !== '');
t('...and the older checked update is no longer shown as ready (its files are gone)', up_status()['staged'] === null && !is_dir(up_dir() . '/staging'));
$a = up_apply(false, true);
t('Apply with nothing ready says so with 409, not a server failure', $a['ok'] === false && ($a['code'] ?? 0) === 409 && strpos($a['error'], 'no checked update') !== false, json_encode($a));
$a = up_apply(true, true);
t('Go Back with nothing saved is a 409 too', $a['ok'] === false && ($a['code'] ?? 0) === 409, json_encode($a));

// file types an update may hold: pdf.js's character maps and fonts are allowed, anything runnable or unknown is not
t('pdf.js character maps (.bcmap) and fonts (.pfb) are accepted', up_name_problem('web/tools/assets/vendor/pdfjs/cmaps/78-EUC-H.bcmap', false) === '' && up_name_problem('web/tools/assets/vendor/pdfjs/standard_fonts/FoxitDingbats.pfb', false) === '');
t('...and a program, a script type or an unknown type is still refused', up_name_problem('web/tools/a.exe', false) !== '' && up_name_problem('web/tools/a.phtml', false) !== '' && up_name_problem('web/tools/a.sh', false) !== '' && up_name_problem('web/tools/a.bin', false) !== '');
t('...and a file with no type at all is refused', up_name_problem('web/tools/assets/vendor/LICENSE', false) !== '');
