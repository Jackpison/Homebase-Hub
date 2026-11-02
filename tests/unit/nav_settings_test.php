<?php
// The bar's style is one of top, side or dock; a brand-new site takes the setup browser's time zone and the theme that follows
// the device, while sites that already exist keep what they have.
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/hub/core/lib/boot.php';

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

$api = file_get_contents($site . '/web/hub/core/api.php');
t('the setup action uses these defaults and the new-site look', strpos($api, 'return hub_new_site_look(hub_setup_defaults($s, $b));') !== false);

$look = hub_new_site_look(hub_clean_settings(['tz' => 'UTC', 'colors' => ['pg' => ['links' => ['dark' => '#123456']]]]));
t('a new site starts with the Default preset: accent #ffd45c and its dark and light colors', $look['accent'] === '#ffd45c' && $look['colors']['dark']['bg'] === '#101010' && $look['colors']['light']['text'] === '#221711' && count($look['colors']['dark']) === 8 && count($look['colors']['light']) === 8, json_encode($look['colors']));
t('the new-site look keeps everything else (time zone, page backgrounds)', $look['tz'] === 'UTC' && $look['colors']['pg']['links']['dark'] === '#123456');
t('the fallback for sites that never saved keeps the old gold and no colors', hub_clean_settings([])['accent'] === '#ffc21a' && hub_clean_settings([])['colors']['dark'] === []);
$shell = file_get_contents($site . '/web/hub/core/assets/shell.js');
t('the setup dialog sends the browser\'s time zone and Follow Device', strpos($shell, "tz: tz, theme: 'auto' }") !== false);

// (1.68.0) Bar Glass: off unless it is exactly true; visitors' pages get it in the public state
t('Bar Glass is off for sites that never saved it', hub_clean_settings([])['glass'] === false);
t('Bar Glass is on only for a real true (not "1", 1 or "yes")', hub_clean_settings(['glass' => true])['glass'] === true && hub_clean_settings(['glass' => '1'])['glass'] === false && hub_clean_settings(['glass' => 1])['glass'] === false && hub_clean_settings(['glass' => 'yes'])['glass'] === false);
t('the public state carries Bar Glass, so every page can draw it', array_key_exists('glass', hub_public_state()));

// (1.68.2) the Glass tab's values and Hide the Bar While Scrolling
$g = hub_clean_settings(['glassFx' => ['bend' => 500, 'edge' => -3, 'fringe' => '12', 'frost' => 4.6, 'tint' => 'lots', 'sat' => 150, 'evil' => 9]])['glassFx'];
t('Glass values are kept inside their ranges, as whole numbers; unknown keys and words are dropped', $g === ['bend' => 100, 'edge' => 2, 'fringe' => 12, 'frost' => 5, 'sat' => 150], json_encode($g));
t('no Glass values (or not a list) means the built-in look', hub_clean_settings([])['glassFx'] === [] && hub_clean_settings(['glassFx' => 'x'])['glassFx'] === []);
t('Hide the Bar While Scrolling is on unless switched off', hub_clean_settings([])['barHide'] === true && hub_clean_settings(['barHide' => false])['barHide'] === false && hub_clean_settings(['barHide' => 0])['barHide'] === true);
$ps = hub_public_state();
t('the public state carries the Glass values and Hide the Bar', array_key_exists('glassFx', $ps) && array_key_exists('barHide', $ps));

// (1.68.4) one glass: Home's own glass look moves into it once
t('Home\'s built-in glass (light, 40%, 22 px) moves nothing: the site takes the shared default', hub_glass_from_panel(['tint' => 'light', 'opacity' => 0.4, 'blur' => 22]) === []);
t('Home set to Solid becomes the Solid glass', hub_glass_from_panel(['tint' => 'solid', 'opacity' => 0.4, 'blur' => 22]) === ['solid' => 1]);
$m = hub_glass_from_panel(['tint' => 'dark', 'opacity' => 0.5, 'blur' => 30]);
t('Home set by hand (dark, 50%, 30 px) becomes frost 30, tint 30%, tone Dark', $m === ['frost' => 30, 'tint' => 30, 'tone' => 2], json_encode($m));
hub_settings_update(function ($x) { $x['glassFx'] = []; $x['glassV'] = 0; return $x; });
hub_glass_adopt_home(['tint' => 'dark', 'opacity' => 0.5, 'blur' => 30]);
$a = hub_settings();
t('the move happens once and only when the one glass was never set', $a['glassFx'] === ['frost' => 30, 'tint' => 30, 'tone' => 2] && $a['glassV'] === 1);
hub_glass_adopt_home(['tint' => 'solid']);
t('...a second time changes nothing', hub_settings()['glassFx'] === ['frost' => 30, 'tint' => 30, 'tone' => 2]);
$c = hub_clean_settings(['glassFx' => ['frost' => 99, 'tint' => 120, 'tone' => 5, 'rim' => 80, 'wpop' => 1, 'solid' => 3]])['glassFx'];
t('the new values keep their ranges (frost up to 40 px, tint up to 94%, tone 0-2, switches 0/1)', $c === ['frost' => 40, 'tint' => 94, 'tone' => 2, 'rim' => 80, 'solid' => 1, 'wpop' => 1], json_encode($c));
