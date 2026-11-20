<?php
// 1.82.6, Info: a box can be pinned to the top of its tab ("pin") and can carry a reminder date ("rem") that Home's Today shows.
// The helper functions are cut out of api.php itself (it runs a request when included), so this tests the real code.
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
$src = (string)file_get_contents($site . '/web/info/api.php');

/** The source of one top-level function, found by counting braces. */
function fn_src(string $src, string $name): string {
    $i = strpos($src, "function $name("); if ($i === false) return '';
    $j = strpos($src, '{', $i); $d = 0;
    for ($k = $j, $n = strlen($src); $k < $n; $k++) { if ($src[$k] === '{') $d++; elseif ($src[$k] === '}' && --$d === 0) return substr($src, $i, $k - $i + 1); }
    return '';
}
foreach (['cut', 'rid', 'box_title', 'box_id_ok', 'box_w', 'box_h', 'color_ok', 'box_hc', 'box_rem', 'norm_box', 'restore_box'] as $f) {
    $code = fn_src($src, $f); t("api.php has $f", $code !== '');
    if ($code !== '') eval($code);
}
foreach (['BOX_W', 'BOX_H', 'MAXBOX'] as $c) { preg_match("/const $c\\b[^;]*;/", $src, $m); if ($m) eval($m[0]); }

t('a box is not pinned and has no reminder at first', norm_box(null, 'Box 1')['pin'] === false && norm_box(null, 'Box 1')['rem'] === '');
t('a pinned box stays pinned', norm_box(['pin' => true], 'Box 1')['pin'] === true);
t('a reminder keeps a real date', norm_box(['rem' => '2026-11-25'], 'Box 1')['rem'] === '2026-11-25');
foreach (['2026-02-30', '2026-13-01', 'tomorrow', '2026-1-5', '', 20261125, ['2026-11-25'], null, "2026-11-25\n<b>"] as $bad)
    t('a reminder that is not a real date is dropped: ' . json_encode($bad), norm_box(['rem' => $bad], 'Box 1')['rem'] === '');
$r = restore_box(['title' => 'Passport', 'notes' => 'x', 'pin' => true, 'rem' => '2027-01-10'], false, 'Box 1', 'a1b2c3d4', []);
t('Undo brings back the pin and the reminder', $r !== null && $r['pin'] === true && $r['rem'] === '2027-01-10');
$sealed = 'enc1:' . base64_encode(random_bytes(24));
$r = restore_box(['title' => '', 'notes' => $sealed, 'pin' => true, 'rem' => '2027-01-10'], true, 'Box 1', 'a1b2c3d4', []);
t('...but a locked tab keeps the pin and never a reminder', $r !== null && $r['pin'] === true && $r['rem'] === '');
// the save paths that rebuild a box must carry both fields over (a plain text save is the one that would drop them)
t('saving a box\'s text keeps its pin and reminder', (bool) preg_match("/'pin' => !empty\\(\\\$cur\\['pin'\\]\\), 'rem' => \\\$cur\\['rem'\\] \\?\\? ''/", $src));
t('the box list keeps them too, and a locked tab clears a reminder', str_contains($src, "array_key_exists('pin', \$e)") && str_contains($src, "!empty(\$t['enc']) ? '' : box_rem(\$e['rem'])"));
