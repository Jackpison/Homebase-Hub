<?php
// 1.62.0, Info Undo: a deleted box or tab comes back with its text ("restore" in save_boxes and save_tabs, web/info/api.php).
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
foreach (['cut', 'rid', 'box_title', 'box_id_ok', 'box_w', 'box_h', 'norm_box', 'restore_box', 'restore_boxes'] as $f) {
    $code = fn_src($src, $f); t("api.php has $f", $code !== '');
    eval($code);
}
preg_match("/const BOX_W[^;]*;/", $src, $m1); preg_match("/const BOX_H[^;]*;/", $src, $m2); preg_match("/const MAXBOX[^;]*;/", $src, $m3);
eval($m1[0] . $m2[0] . $m3[0]);

$sealed = 'enc1:' . base64_encode(random_bytes(24));
$sealedT = 'enc1:' . base64_encode(random_bytes(16));

// ---- one box ----
$b = restore_box(['title' => 'Wi-Fi', 'notes' => "Network: home\nPassword: x", 'w' => 'half', 'h' => 'tall'], false, 'Box 1', 'a1b2c3d4', []);
t('a readable box comes back with its title and text', $b && $b['title'] === 'Wi-Fi' && $b['notes'] === "Network: home\nPassword: x");
t('...with its old id when that is free, and its size', $b['id'] === 'a1b2c3d4' && $b['w'] === 'half' && $b['h'] === 'tall');
t('...as revision 1, saved now', $b['rev'] === 1 && abs($b['saved'] - time()) < 5);
$b = restore_box(['title' => 'Wi-Fi', 'notes' => 'x'], false, 'Box 1', 'a1b2c3d4', ['a1b2c3d4' => true]);
t('a taken id gets a new one', $b && $b['id'] !== 'a1b2c3d4' && preg_match('/^[a-f0-9]{8}$/', $b['id']) === 1);
$b = restore_box(['title' => 'T', 'notes' => ''], false, 'Box 1', 'not an id!', []);
t('a bad id gets a new one; empty text is fine', $b && preg_match('/^[a-f0-9]{8}$/', $b['id']) === 1 && $b['notes'] === '');
$b = restore_box(['title' => '', 'notes' => 'x'], false, 'Box 3', '', []);
t('an empty title takes the default one', $b && $b['title'] === 'Box 3');
$b = restore_box(['title' => str_repeat('x', 300), 'notes' => 'x'], false, 'Box 1', '', []);
t('a long readable title is cut like any other (80)', $b && strlen($b['title']) === 80, (string)($b['title'] ?? ''));
t('not an array: refused', restore_box('x', false, 'Box 1') === null && restore_box(null, true, 'Box 1') === null);
t('notes that are not text are treated as empty', (restore_box(['title' => 'T', 'notes' => ['a']], false, 'Box 1')['notes'] ?? 'x') === '');
t('an unknown size is dropped', (restore_box(['title' => 'T', 'notes' => 'x', 'w' => 'huge', 'h' => '<b>'], false, 'Box 1')['w'] ?? 'x') === '');

// ---- locked text only goes into a locked tab ----
$b = restore_box(['title' => $sealedT, 'notes' => $sealed], true, 'Box 1', '', []);
t('locked text goes back into an encrypted tab, unchanged (the server never opens it)', $b && $b['notes'] === $sealed && $b['title'] === $sealedT);
t('locked text into a readable tab is refused', restore_box(['title' => 'T', 'notes' => $sealed], false, 'Box 1') === null);
t('a locked title into a readable tab is refused', restore_box(['title' => $sealedT, 'notes' => 'x'], false, 'Box 1') === null);
t('readable text into an encrypted tab is refused (it would sit there unlocked)', restore_box(['title' => 'T', 'notes' => 'my secret'], true, 'Box 1') === null);
t('an encrypted tab takes an empty box and a plain default title', (restore_box(['title' => 'Box 2', 'notes' => ''], true, 'Box 2')['title'] ?? '') === 'Box 2');
t('a locked title with characters that do not belong is dropped, not stored', (restore_box(['title' => 'enc1:<script>', 'notes' => ''], true, 'Box 4')['title'] ?? '') === 'Box 4');

// ---- a whole tab ----
$boxes = [['id' => '11111111', 'title' => 'A', 'notes' => 'one'], ['id' => '22222222', 'title' => 'B', 'notes' => 'two', 'w' => 'full']];
$r = restore_boxes($boxes, false);
t('a tab comes back with all its boxes in order, with their ids', $r && count($r) === 2 && $r[0]['id'] === '11111111' && $r[1]['id'] === '22222222' && $r[1]['w'] === 'full' && $r[1]['notes'] === 'two');
$r = restore_boxes([['id' => '11111111', 'title' => 'A', 'notes' => 'x'], ['id' => '11111111', 'title' => 'B', 'notes' => 'y']], false);
t('two boxes with the same id: the second gets another one', $r && $r[0]['id'] === '11111111' && $r[1]['id'] !== '11111111');
t('no boxes: refused', restore_boxes([], false) === null && restore_boxes(null, false) === null && restore_boxes('x', false) === null);
t('more than 12 boxes: refused, not cut', restore_boxes(array_fill(0, 13, ['title' => 'A', 'notes' => '']), false) === null && count(restore_boxes(array_fill(0, 12, ['title' => 'A', 'notes' => '']), false)) === 12);
t('one box that does not fit refuses the whole tab', restore_boxes([['title' => 'A', 'notes' => 'ok'], ['title' => 'B', 'notes' => $sealed]], false) === null);
$r = restore_boxes([['title' => $sealedT, 'notes' => $sealed], ['title' => 'Box 2', 'notes' => '']], true);
t('an encrypted tab comes back with its locked boxes', $r && $r[0]['notes'] === $sealed && $r[1]['notes'] === '');

// ---- the actions use them, only for new entries, and only with a key for a locked tab ----
t('save_boxes: only an entry that is not an existing box can carry a restore, and a refusal is 422', strpos($src, "elseif (isset(\$e['restore']))") !== false && preg_match("/restore_box\(\\\$e\['restore'\].*\n.*422/", $src) === 1);
t('save_tabs: a locked tab needs the site key to come back', strpos($src, "\$enc && empty(\$all['page']['vault']) ? null : restore_boxes(") !== false);
t('a restore changes nothing about a normal save (the old paths are still there)', strpos($src, "default_boxes()]") !== false && strpos($src, "\$b = norm_box(null, 'Box ' . \$n)") !== false);
