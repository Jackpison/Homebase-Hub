<?php
// 1.61.0: Home's "Only Me" switch. It is saved (default off), a visitor's page is only a log-in screen, and a visitor can start no photo download.
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/home/lib.php';

t('a new Home is not private', default_site()['private'] === false);
$s = clean_site(['title' => 'Mine', 'private' => true]);
t('Only Me is kept when it is on', $s['private'] === true);
t('0 or nothing leaves it off', clean_site(['private' => 0])['private'] === false && clean_site([])['private'] === false);
$saved = site_from_page(['title' => 'Mine', 'private' => true], load_site());
t('saving Home Settings writes it', ($saved['private'] ?? null) === true, json_encode($saved['private'] ?? null));
t('what visitors are sent says whether the page is private', public_payload()['private'] === false);

$index = (string)file_get_contents($site . '/web/home/index.php');
$lock = strpos($index, "!empty(\$site['private']) && !hub_admin()");
t('index.php answers a visitor of a private Home with the log-in screen before it prints any of the page', $lock !== false && $lock < strpos($index, 'window.PUB') && $lock < strpos($index, 'id="bg"') && strpos($index, 'exit;') !== false);
$api = (string)file_get_contents($site . '/web/home/api.php');
t('a visitor of a private Home can not start the photo refill', preg_match("/case 'refill':.*?\\['private'\\]\\) && !is_admin\\(\\)\\) out\\(\\['added' => \\[\\]/s", $api) === 1);
