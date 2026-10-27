<?php
// 1.59: code that used to exist in several copies now lives once. These checks stop a copy from coming back.
// Runs on its own copy of src/ (run.php).
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
$w = $site . '/web/';
$read = function (string $f) use ($w) { return (string)@file_get_contents($w . $f); };

$apis = ['cards', 'info', 'links', 'tasks'];
t('the pages answer through the core\'s one JSON helper (hub_json), with no out() copy of their own',
  !array_filter($apis, function ($a) use ($read) { return strpos($read("$a/api.php"), 'function out(') !== false; })
  && strpos($read('home/api.php'), 'function out(array $d, int $code = 200): never { hub_json($code, $d); }') !== false);
t('one settings-row style (.ix-srow in shell.css), no page copy of it',
  strpos($read('hub/core/assets/shell.css'), '.ix-srow{') !== false
  && !array_filter(['links/assets/links.css', 'info/assets/info.css', 'cards/assets/cards.css'], function ($f) use ($read) { return strpos($read($f), '.srow{') !== false; }));
t('one message box: Home and Links use the shared one (no #toast of their own)',
  strpos($read('home/index.php'), 'id="toast"') === false && strpos($read('links/index.html'), 'id="toast"') === false
  && strpos($read('home/assets/app.js'), 'HUB.toast(msg, err)') !== false && strpos($read('links/assets/links.js'), 'HUB.toast(msg, bad, sticky)') !== false);
t('Info no longer carries its old per-page login token', !preg_match('/(?<![-\w])tok\b|TOKK|action:"load"/', $read('info/assets/info.js')) && strpos($read('info/api.php'), "\$action === 'load'") === false);
t('the theme is set before paint by shell.js only (no page script of its own for it)', !is_file($w . 'cards/assets/cards-boot.js')
  && strpos($read('cards/index.html'), 'cards-boot') === false && strpos($read('info/assets/info-boot.js'), 'info3-theme') === false && strpos($read('links/assets/links-boot.js'), 'bm-theme') === false);
t('every page window takes its corners, shadow and dimmed background from the shared look',
  !array_filter(['links/assets/links.css', 'info/assets/info.css', 'cards/assets/cards.css', 'tasks/assets/tasks.css'], function ($f) use ($read) { $s = $read($f); return strpos($s, 'border-radius:var(--ix-win-radius)') === false || strpos($s, 'dialog::backdrop{background:var(--ix-win-dim)}') === false; }));
t('Home stores its files through the core (hub_jread / hub_jput / hub_write)', strpos($read('home/lib.php'), 'function read_json(string $file): ?array { return hub_jread($file); }') !== false && strpos($read('home/lib.php'), 'file_put_contents($tmp') === false);
