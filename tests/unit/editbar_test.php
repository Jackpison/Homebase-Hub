<?php
// 1.53.5: the edit bar's look per page (Settings of each page > Edit Bar), kept in the site settings as editBar.
// Only "text" (icons and text) is stored; icons only is the default and stores nothing. Runs on its own copy of src/ (run.php).
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/hub/core/lib/boot.php';

t('a site without the setting: every page shows icons only', hub_settings()['editBar'] === []);
$c = hub_clean_settings(['editBar' => ['links' => 'text', 'cards' => 'icons', 'tasks' => 'TEXT', 'tools' => 'text', 'evil' => 'text', 'home' => ['text']]]);
t('only "text" is kept, only for pages that have an edit bar (Home, Links, Info, Cards, Tasks)', $c['editBar'] === ['links' => 'text'], json_encode($c['editBar']));
t('a damaged value is ignored, never an error', hub_clean_settings(['editBar' => 'text'])['editBar'] === [] && hub_clean_settings(['editBar' => null])['editBar'] === []);
$s = hub_settings_update(function ($cur) { $cur['editBar'] = ['info' => 'text', 'home' => 'text']; return $cur; });
unset($GLOBALS['__hub_settings']);
t('it is saved and read back', hub_settings()['editBar'] === ['home' => 'text', 'info' => 'text'], json_encode(hub_settings()['editBar']));
$pub = json_decode(json_encode(hub_public_state()), true);
t('every page receives it (it is not private), also when nothing is set (an empty object)', ($pub['editBar'] ?? null) === ['home' => 'text', 'info' => 'text']
  && json_encode(hub_public_state_empty_editbar()) === '{}');
function hub_public_state_empty_editbar() { hub_settings_update(function ($cur) { $cur['editBar'] = []; return $cur; }); unset($GLOBALS['__hub_settings']); return hub_public_state()['editBar']; }
$js = (string)file_get_contents($site . '/web/hub/core/assets/shell.js');
t('the Settings page has no pencil', strpos($js, "var HAS_EDIT = APP !== 'settings';") !== false);
foreach (['home/index.php', 'links/index.html', 'info/index.html', 'cards/index.html', 'tasks/index.html'] as $f) {
    $h = (string)file_get_contents($site . '/web/' . $f);
    t("$f: its Settings has the Edit Bar choice, saved with its Save button, and its Settings item stays in the pencil menu",
      substr_count($h, 'data-ix-editbar') === 1 && substr_count($h, 'data-ix-save') === 1 && substr_count($h, 'data-hub-main') === 1);
}
