<?php
// Home 1.51: the widget settings, the Scratch Pad, Home's links moving to Links once, and the two Tasks actions Home uses
// (Quick Add and Done). Runs on its own copy of src/ (run.php).
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/home/lib.php';
require_once $site . '/web/tasks/lib.php';

/* ---------- widget settings ---------- */
$w = clean_widgets([]);
t('a site with no widget settings gets the default: Glass Dock, the clock, every widget in order; Scratch Pad, World Clock and Weather off',
  $w['style'] === 'dock' && $w['clock'] === true && array_column($w['list'], 'id') === WIDGET_IDS && array_column($w['list'], 'on') === [true, true, true, true, true, false, true, false, false]
  && $w['zones'] === [] && $w['weather'] === ['town' => '', 'unit' => 'c'], json_encode($w));
$w = clean_widgets(['style' => 'glance', 'clock' => false, 'list' => [['id' => 'pad', 'on' => true], ['id' => 'nope', 'on' => true], ['id' => 'today', 'on' => false], ['id' => 'pad', 'on' => false], 'x']]);
t('your order is kept, an unknown widget and a second copy are dropped, missing ones come after (in their default state)',
  $w['style'] === 'glance' && $w['clock'] === false && array_slice(array_column($w['list'], 'id'), 0, 2) === ['pad', 'today'] && $w['list'][0]['on'] && !$w['list'][1]['on'] && count($w['list']) === count(WIDGET_IDS), json_encode($w['list']));
t('Show Widgets is on at first, and can be turned off', clean_widgets([])['show'] === true && clean_widgets(['show' => false])['show'] === false);
t('an unknown style falls back to Glass Dock', clean_widgets(['style' => '<b>'])['style'] === 'dock');
$c = fn($d) => clean_widgets(['countdown' => ['name' => str_repeat('Goa trip ', 10), 'date' => $d]])['countdown'];
t('the countdown keeps a real date and a name of up to 40 characters', $c('2026-11-07')['date'] === '2026-11-07' && mb_strlen($c('2026-11-07')['name']) <= 40);
t('...and drops a date that does not exist or is not a date', $c('2026-02-30')['date'] === '' && $c('next week')['date'] === '' && $c('2026-11-7')['date'] === '');
$n = clean_widgets(['note' => ['tab' => 'abc_1', 'box' => '../../x']])['note'];
t('the pinned note keeps a plain Info tab and box id, nothing else', $n['tab'] === 'abc_1' && $n['box'] === '', json_encode($n));
$z = clean_widgets(['zones' => [['tz' => 'Europe/London', 'name' => 'Mum'], ['tz' => '+05:30'], ['tz' => '../etc'], ['tz' => 'Asia/Tokyo', 'name' => str_repeat('x', 50)], ['tz' => 'America/New_York'], ['tz' => 'Europe/Paris']]])['zones'];
t('World Clock keeps up to 3 real time zones with a short name; anything that is not a time zone name is dropped',
  array_column($z, 'tz') === ['Europe/London', 'Asia/Tokyo', 'America/New_York'] && $z[0]['name'] === 'Mum' && mb_strlen($z[1]['name']) <= 30, json_encode($z));
$we = clean_widgets(['weather' => ['town' => "  Bengaluru\n ", 'unit' => 'f']])['weather'];
t('Weather keeps the town (on one line) and °C or °F', $we === ['town' => 'Bengaluru', 'unit' => 'f'] && clean_widgets(['weather' => ['unit' => 'k']])['weather']['unit'] === 'c', json_encode($we));
t('a saved site keeps its widgets through clean_site', clean_site(['widgets' => ['style' => 'glance']])['widgets']['style'] === 'glance');

/* ---------- visitors never see the widget settings ---------- */
write_json(SITE_FILE, clean_site(['widgets' => ['countdown' => ['name' => 'Secret trip', 'date' => '2026-12-01']]]));
$pub = public_payload();
t('a visitor (not logged in) gets no widget settings, so the countdown name is not in the page', $pub['widgets'] === null && strpos(json_encode($pub), 'Secret trip') === false);
t('...and no list of Home links any more', !array_key_exists('columns', $pub));
write_json(SITE_FILE, clean_site(['widgets' => ['clock' => false]]));
t('a visitor does get whether the clock is shown (the clock is for everyone)', public_payload()['clock'] === false && clean_site([])['widgets']['clock'] === true);

/* ---------- Scratch Pad ---------- */
t('the Scratch Pad starts empty', pad_read()['text'] === '');
pad_write("line one\r\nline two");
t('it keeps what you typed (line breaks made plain)', pad_read()['text'] === "line one\nline two" && pad_read()['saved'] >= time() - 5);
pad_write(str_repeat('é', PAD_MAX + 50));
t('it keeps at most ' . PAD_MAX . ' characters', mb_strlen(pad_read()['text']) === PAD_MAX);
t('it is stored as a guarded file in site-data (never readable from the web)', is_file(hub_jpath(pad_file())) && strncmp((string)file_get_contents(hub_jpath(pad_file())), '<?php', 5) === 0);

/* ---------- Home's links move to Links, once ---------- */
$lf = hub_dir('links') . '/bookmarks.php';
@mkdir(ICON_DIR, 0755, true); file_put_contents(ICON_DIR . '/0123456789abcdef.png', 'png-bytes');
$cols = [[['id' => 'a1', 'name' => 'My Blog', 'url' => 'https://blog.example.com', 'icon' => ['type' => 'image', 'value' => 'icons/0123456789abcdef.png']],
          ['id' => 'a2', 'name' => 'Mail', 'url' => 'https://mail.example.com', 'icon' => ['type' => 'emoji', 'value' => '📮']]],
         [['id' => 'a3', 'name' => 'Already', 'url' => 'https://already.example.com', 'icon' => ['type' => 'auto', 'value' => '']]]];
write_json(SITE_FILE, ['columns' => $cols]);
hub_write_guarded($lf, ['settings' => ['x' => 1], 'tabs' => [
    ['id' => 'vault', 'title' => 'Vault', 'enc' => 'enc1:' . base64_encode(random_bytes(40))],
    ['id' => 'daily', 'title' => 'Daily', 'categories' => [['id' => 'c1', 'title' => 'News', 'col' => 0, 'links' => [['title' => 'Already', 'url' => 'https://already.example.com']]]]]]]);
$n1 = home_move_links();
$d = hub_read_guarded($lf);
$cat = $d['tabs'][1]['categories'][0] ?? [];
t('the links are copied to a "From Home" category at the top of the first tab that is not encrypted',
  $n1 === 2 && ($cat['title'] ?? '') === 'From Home' && array_column($cat['links'], 'url') === ['https://blog.example.com', 'https://mail.example.com'] && array_column($cat['links'], 'title') === ['My Blog', 'Mail'], json_encode($cat));
t('...a link already in that tab is not added twice, and the tab keeps its own category', $d['tabs'][1]['categories'][1]['title'] === 'News');
t('...the encrypted tab and the Links settings are left as they were', $d['tabs'][0]['enc'] !== '' && !isset($d['tabs'][0]['categories']) && $d['settings']['x'] === 1);
t('...an uploaded icon is copied to Links\' icons and used', ($cat['links'][0]['icon'] ?? '') === 'icons/0123456789abcdef.png' && is_file(HUB_MEDIA . '/links/icons/0123456789abcdef.png') && !isset($cat['links'][1]['icon']));
t('...Links kept an earlier version first', count(glob(hub_dir('links') . '/backups/bookmarks-*.php') ?: []) === 1);
$raw = read_json(SITE_FILE);
t('...Home marks the move and keeps its own copy of the links until the next version', ($raw['linksMoved'] ?? 0) >= time() - 5 && count($raw['columns'][0]) === 2);
t('a second load copies nothing again', home_move_links() === 0 && count(hub_read_guarded($lf)['tabs'][1]['categories']) === 2);
$fromPage = site_from_page(['linksMoved' => 0, 'columns' => [[], []], 'title' => 'Mine'], load_site());
t('a later save from the page cannot undo the mark or change the old links (the server keeps both)', $fromPage['linksMoved'] === $raw['linksMoved'] && count($fromPage['columns'][0]) === 2 && $fromPage['title'] === 'Mine');

// no Links file yet: one is made with a "From Home" tab
@unlink($lf); write_json(SITE_FILE, ['columns' => $cols]);
$n2 = home_move_links(); $d = hub_read_guarded($lf);
t('with no Links data yet, the links go into a new tab "From Home"', $n2 === 3 && ($d['tabs'][0]['title'] ?? '') === 'From Home' && count($d['tabs'][0]['categories'][0]['links']) === 3, json_encode($d));
// a Links file that cannot be read: nothing is written and Home tries again next time
file_put_contents($lf, "<?php exit; ?>\n{not json"); write_json(SITE_FILE, ['columns' => $cols]);
t('a Links file that cannot be read is never written over, and the move is tried again later', home_move_links() === 0 && file_get_contents($lf) === "<?php exit; ?>\n{not json" && empty(read_json(SITE_FILE)['linksMoved']));
// no links on Home at all: just marked
write_json(SITE_FILE, ['columns' => [[], []]]);
t('a Home with no links is only marked, Links is not touched', home_move_links() === 0 && !empty(read_json(SITE_FILE)['linksMoved']) && file_get_contents($lf) === "<?php exit; ?>\n{not json");

/* ---------- Tasks: Quick Add and Done (Home's Today widget) ---------- */
$t1 = tasks_add_text('Call the bank tomorrow 11am', 'Home');
t('Quick Add reads plain words like Telegram\'s /add: name, date and time', is_array($t1) && $t1['name'] === 'Call the bank' && $t1['due'] === date('Y-m-d', strtotime('tomorrow')) && $t1['time'] === '11:00' && $t1['notes'] === 'Added from Home.', json_encode($t1));
t('...and the task is saved', count(array_filter(tasks_read()['tasks'], fn($t) => $t['name'] === 'Call the bank')) === 1);
t('empty words add nothing', tasks_add_text('   ', 'Home') === null);
$t2 = tasks_add_text('Netflix 649 monthly ' . date('j M', strtotime('+3 days')), 'Home');
$res = '';
tasks_modify(function (&$d) use ($t2, &$res) { $res = tasks_complete($d, $t2['id'], $t2['due'], 'paid'); return $res !== '' && $res !== 'already'; });
$after = array_values(array_filter(tasks_read()['tasks'], fn($t) => $t['id'] === $t2['id']))[0];
t('Done on a monthly task moves it to its next date and keeps the payment', strpos($res, 'next:') === 0 && $after['due'] > $t2['due'] && $after['status'] === 'active' && count($after['history']) === 1, $res);
$res2 = '';
tasks_modify(function (&$d) use ($t2, &$res2) { $res2 = tasks_complete($d, $t2['id'], $t2['due'], 'paid'); return false; });
t('...and the same date cannot be marked done twice', $res2 === 'already');

/* ---------- Weather: asks Open-Meteo only with a town, keeps the answer 30 minutes ---------- */
$asked = [];
$geo = '{"results":[{"name":"Bengaluru","latitude":12.97194,"longitude":77.59369,"country":"India","admin1":"Karnataka"}]}';
$fc = '{"current":{"temperature_2m":26.6,"weather_code":2,"is_day":1},"daily":{"time":["2026-10-26","2026-10-27","2026-10-28"],"weather_code":[2,61,95],"temperature_2m_max":[29.2,27,25.5],"temperature_2m_min":[19.4,19,18.6]}}';
$fake = function (string $url) use (&$asked, $geo, $fc) { $asked[] = $url; return str_contains($url, 'geocoding') ? $geo : $fc; };
t('no town: Open-Meteo is not asked', isset(weather_get(['town' => '', 'unit' => 'c'], $fake)['error']) && !$asked);
@unlink(hub_jpath(weather_file()));
$r = weather_get(['town' => 'Bengaluru', 'unit' => 'c'], $fake);
t('with a town: the place, the temperature now and three days in plain words', $r['place'] === 'Bengaluru, Karnataka' && $r['temp'] === 27 && $r['text'] === 'Partly cloudy' && $r['unit'] === '°C'
  && array_column($r['days'], 'text') === ['Partly cloudy', 'Rain', 'Thunderstorm'] && $r['days'][0]['max'] === 29 && count($asked) === 2 && str_contains($asked[1], 'latitude=12.972&longitude=77.594'), json_encode([$r, $asked]));
t('...the town goes to Open-Meteo safely encoded, and nothing else about you', str_contains($asked[0], 'name=Bengaluru') && !preg_grep('/key=|token=/', $asked));
weather_get(['town' => 'bengaluru', 'unit' => 'c'], $fake);
t('within 30 minutes the saved answer is used: Open-Meteo is not asked again', count($asked) === 2);
weather_get(['town' => 'Bengaluru', 'unit' => 'f'], $fake);
t('°F asks again for the forecast in Fahrenheit, but the town is not looked up again', count($asked) === 3 && str_contains($asked[2], 'temperature_unit=fahrenheit'));
$c = read_json(weather_file()); $c['saved'] = time() - 4000; write_json(weather_file(), $c);
$down = fn($u) => null;
$st = weather_get(['town' => 'Bengaluru', 'unit' => 'f'], $down);
t('Open-Meteo can\'t be reached: the last answer is shown, marked as old', ($st['stale'] ?? false) === true && $st['place'] === 'Bengaluru, Karnataka', json_encode($st));
t('...and a town never looked up gets a clear message', str_contains(weather_get(['town' => 'Mysuru', 'unit' => 'c'], $down)['error'] ?? '', 'reach Open-Meteo'));
t('a town Open-Meteo does not know gets a clear message', str_contains(weather_get(['town' => 'Nowhereville', 'unit' => 'c'], fn($u) => str_contains($u, 'geocoding') ? '{"generationtime_ms":0.5}' : $fc)['error'] ?? '', 'doesn\'t know the town'));
t('the weather is kept as a guarded file in site-data', strncmp((string) file_get_contents(hub_jpath(weather_file())), '<?php', 5) === 0);

/* ---------- Backup carries the Scratch Pad ---------- */
require_once HUB_CORE . '/lib/backup.php';
write_json(SITE_FILE, clean_site([])); pad_write('Spare key is with Asha');
$bk = json_decode(json_encode(bk_export(['home' => true])), true)['parts'];   // as it is saved in the backup file
t('a backup of Home carries the Scratch Pad, and Backup no longer counts Home links', ($bk['home']['pad'] ?? null) === 'Spare key is with Asha' && strpos(bk_overview()['home']['summary'] ?? '', 'links') === false, json_encode([$bk['home']['pad'] ?? null, bk_overview()['home'] ?? null]));
pad_write('changed later');
bk_import(['home' => $bk['home']], ['home' => true]);
t('...and restoring it brings the pad back', pad_read()['text'] === 'Spare key is with Asha');
$old = $bk['home']; unset($old['pad']); pad_write('kept');
bk_import(['home' => $old], ['home' => true]);
t('a backup from before 1.51 (no pad) leaves the pad as it is', pad_read()['text'] === 'kept');
