<?php
// The bar's style is one of top, side or dock; a brand-new site takes the setup browser's time zone and the theme that follows
// the device, while sites that already exist keep what they have.
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/core-data/lib/boot.php';

foreach (['top', 'side', 'dock'] as $n) t("the style \"$n\" is kept", hub_clean_settings(['nav' => $n])['nav'] === $n);
t('an unknown style becomes the Top Bar', hub_clean_settings(['nav' => 'rail'])['nav'] === 'top' && hub_clean_settings([])['nav'] === 'top');

$old = hub_clean_settings(['tz' => 'Europe/Berlin', 'theme' => 'light']);
t('settings saved earlier keep their theme and time zone', $old['tz'] === 'Europe/Berlin' && $old['theme'] === 'light');
t('the fallbacks for sites that never saved are unchanged (dark, India)', hub_clean_settings([])['theme'] === 'dark' && hub_clean_settings([])['tz'] === 'Asia/Kolkata');

$new = hub_setup_defaults(hub_clean_settings([]), ['tz' => 'America/New_York', 'theme' => 'auto']);
t('a new site takes the time zone of the browser that set it up', $new['tz'] === 'America/New_York');
t('a new site follows the device for its theme', $new['theme'] === 'auto');
$bad = hub_setup_defaults(hub_clean_settings([]), ['tz' => 'Mars/Olympus', 'theme' => 'neon']);
t('an unknown time zone or theme from setup is ignored', $bad['tz'] === 'Asia/Kolkata' && $bad['theme'] === 'dark');
t('a setup that sends nothing changes nothing', hub_setup_defaults(['tz' => 'UTC', 'theme' => 'dark'], []) === ['tz' => 'UTC', 'theme' => 'dark']);

$api = file_get_contents($site . '/web/core-data/api.php');
t('the setup action uses these defaults and the new-site look', strpos($api, 'return hub_new_site_look(hub_setup_defaults($s, $b));') !== false);

$look = hub_new_site_look(hub_clean_settings(['tz' => 'UTC', 'colors' => ['pg' => ['links' => ['dark' => '#123456']]]]));
t('a new site starts with the Default preset: accent #ffd45c and its dark and light colors', $look['accent'] === '#ffd45c' && $look['colors']['dark']['bg'] === '#101010' && $look['colors']['light']['text'] === '#221711' && count($look['colors']['dark']) === 8 && count($look['colors']['light']) === 8, json_encode($look['colors']));
t('the new-site look keeps everything else (time zone, page backgrounds)', $look['tz'] === 'UTC' && $look['colors']['pg']['links']['dark'] === '#123456');
t('the fallback for sites that never saved keeps the old gold and no colors', hub_clean_settings([])['accent'] === '#ffc21a' && hub_clean_settings([])['colors']['dark'] === []);
$shell = file_get_contents($site . '/web/core-data/assets/shell.js');
t('the setup dialog sends the browser\'s time zone and Follow Device', strpos($shell, "tz: tz, theme: 'auto' }") !== false);
