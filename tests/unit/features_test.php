<?php
// 1.79.0: features turned off for real (Settings > Features): the list is cleaned, saved with the settings, and read by hub_feature_off().
// Runs on its own copy of src/ (run.php).
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/hub/core/lib/boot.php';

t('F1 only known features stay, once each, in the site\'s order', hub_clean_off(['files', 'bogus', 'telegram', 'files', 5]) === ['telegram', 'files'], json_encode(hub_clean_off(['files', 'bogus', 'telegram', 'files', 5])));
t('F2 Home, Links and Info can not be turned off', hub_clean_off(['home', 'links', 'info']) === []);
t('F3 a value that is not a list means nothing is off', hub_clean_off('telegram') === [] && hub_clean_off(null) === []);
t('F4 a new site has everything on', hub_settings()['off'] === [] && !hub_feature_off('cards'));
hub_settings_update(function ($s) { $s['off'] = ['cards', 'tools']; return $s; });
t('F5 what was saved is read back', hub_feature_off('cards') && hub_feature_off('tools') && !hub_feature_off('tasks'), json_encode(hub_settings()['off']));
t('F6 a visitor\'s state carries the list', hub_public_state()['off'] === ['cards', 'tools']);
hub_settings_update(function ($s) { $s['off'] = ['nonsense']; return $s; });
t('F7 a bad value saved by hand is cleaned', hub_settings()['off'] === []);
