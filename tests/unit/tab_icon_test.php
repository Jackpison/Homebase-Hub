<?php
// 1.63.0: the icon of a tab (Links and Info). hub_tab_icon() (settings.php) is the one list the servers check against; tabs.js draws the same
// 16 icons, so the two lists must be equal. Info keeps a tab's icon when a request does not send one; Links cleans it on every save.
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/hub/core/lib/boot.php';

t('a known icon is kept', hub_tab_icon('star') === 'star' && hub_tab_icon('bookmark') === 'bookmark' && hub_tab_icon('music') === 'music');
t('an unknown id, text with markup, a number, null and an array all give "" (the page\'s own icon)',
    hub_tab_icon('rocket') === '' && hub_tab_icon('<b>') === '' && hub_tab_icon(5) === '' && hub_tab_icon(null) === '' && hub_tab_icon(['star']) === '' && hub_tab_icon('') === '');
t('a known id in another case is not accepted', hub_tab_icon('Star') === '' && hub_tab_icon(' star') === '');
t('there are between 10 and 20 icons, each once', count(HUB_TAB_ICONS) >= 10 && count(HUB_TAB_ICONS) <= 20 && count(array_unique(HUB_TAB_ICONS)) === count(HUB_TAB_ICONS), (string)count(HUB_TAB_ICONS));

$js = (string)file_get_contents($site . '/web/hub/core/assets/tabs.js');
preg_match_all("/\{ id: '([a-z]+)', name: '[^']+', d: '/", $js, $m);
t('tabs.js draws the same icons in the same order as the server accepts', $m[1] === HUB_TAB_ICONS, implode(',', $m[1]));

// Info: cut the function out of api.php (it runs a request when included), like info_restore_test.php
$src = (string)file_get_contents($site . '/web/info/api.php');
$i = strpos($src, 'function tab_icon('); $j = strpos($src, "\n", (int)$i);
t('Info has tab_icon()', $i !== false);
eval(substr($src, (int)$i, $j - (int)$i));
t('Info: an icon that is sent is checked', tab_icon(['icon' => 'flag']) === 'flag' && tab_icon(['icon' => 'nope']) === '' && tab_icon(['icon' => '']) === '');
t('Info: nothing sent keeps the icon the tab has (an old page or a drag that does not send it)', tab_icon(['name' => 'x'], 'heart') === 'heart' && tab_icon('x', 'heart') === 'heart');
t('Info: every place that builds a tab sets its icon', substr_count($src, "'icon' => tab_icon(") >= 3 && strpos($src, "\$t['icon'] = tab_icon(\$e, \$t['icon'] ?? '')") !== false);

// Links: the save cleans every tab's icon
$links = (string)file_get_contents($site . '/web/links/api.php');
t('Links: a save keeps only a known icon on each tab', strpos($links, "hub_tab_icon(\$nt['icon'] ?? '')") !== false);
