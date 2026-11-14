<?php
// 1.79.3, Info: the headline color moved from the tab to each box ("hc" on a box in web/info/api.php).
// The helper functions are cut out of api.php itself (it runs a request when included), so this tests the real code.
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/hub/core/lib/boot.php';
$src = (string)file_get_contents($site . '/web/info/api.php');

/** The source of one top-level function, found by counting braces. */
function fn_src(string $src, string $name): string {
    $i = strpos($src, "function $name("); if ($i === false) return '';
    $j = strpos($src, '{', $i); $d = 0;
    for ($k = $j, $n = strlen($src); $k < $n; $k++) { if ($src[$k] === '{') $d++; elseif ($src[$k] === '}' && --$d === 0) return substr($src, $i, $k - $i + 1); }
    return '';
}
foreach (['cut', 'rid', 'box_title', 'box_id_ok', 'box_w', 'box_h', 'color_ok', 'box_hc', 'norm_box', 'norm_boxes', 'default_boxes', 'tab_color', 'tab_hc', 'tab_layout', 'tab_icon', 'has_enc', 'icon_ok', 'norm_colors', 'norm_vault', 'norm_page', 'norm_timer', 'norm_data'] as $f) {
    $code = fn_src($src, $f); t("api.php has $f", $code !== '');
    if ($code !== '') eval($code);
}
foreach (['BOX_W', 'BOX_H', 'MAXBOX', 'MAXTAB'] as $c) { preg_match("/const $c\\b[^;]*;/", $src, $m); if ($m) eval($m[0]); }

// ---- one box ----
t('a box keeps its own headline color (lower case)', norm_box(['hc' => '#E5484D'], 'Box 1')['hc'] === '#e5484d');
t('a box with no color has none', norm_box(['title' => 'x'], 'Box 1')['hc'] === '');
foreach (['red', '#12345', '#1234567', 'javascript:alert(1)', '#gg0000', 12, ['#ffffff'], null] as $bad) t('a color that is not #rrggbb is dropped: ' . json_encode($bad), norm_box(['hc' => $bad], 'Box 1')['hc'] === '');

// ---- moving the tab's color into its boxes ----
$d = norm_data(['tabs' => [['id' => 'a1b2c3d4', 'name' => 'Home', 'hc' => '#3b82f6', 'boxes' => [['title' => 'One', 'notes' => ''], ['title' => 'Two', 'notes' => '', 'hc' => '#ec4899']]]]]);
t('a color a tab still holds goes to its boxes that have none', $d['tabs'][0]['boxes'][0]['hc'] === '#3b82f6');
t('...but never over a box that has its own', $d['tabs'][0]['boxes'][1]['hc'] === '#ec4899');
t('...and the tab itself no longer holds one', $d['tabs'][0]['hc'] === '');
$again = norm_data($d);
t('...so reading it again changes nothing', $again['tabs'][0]['boxes'][0]['hc'] === '#3b82f6' && $again['tabs'][0]['boxes'][1]['hc'] === '#ec4899' && $again['tabs'][0]['hc'] === '');
$cleared = $d; $cleared['tabs'][0]['boxes'][0]['hc'] = '';
$after = norm_data($cleared);
t('a box whose color was cleared stays cleared (the tab no longer has one to give back)', $after['tabs'][0]['boxes'][0]['hc'] === '');
$plain = norm_data(['tabs' => [['id' => 'a1b2c3d4', 'name' => 'Plain', 'boxes' => [['title' => 'One']]]]]);
t('a tab with no color leaves its boxes alone', $plain['tabs'][0]['boxes'][0]['hc'] === '');
$bad = norm_data(['tabs' => [['id' => 'a1b2c3d4', 'name' => 'Bad', 'hc' => 'url(x)', 'boxes' => [['title' => 'One']]]]]);
t('a tab color that is not #rrggbb gives nothing to its boxes', $bad['tabs'][0]['boxes'][0]['hc'] === '');
