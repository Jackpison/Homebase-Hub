<?php
// Home: which background comes next (each browser remembers the ones it showed lately), and the Welcome Text setting.
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/home/lib.php';

// the tag must be the same as bgTag() in app.js (these values come from running that function in Node)
t('the tag matches app.js for a photo address', bg_tag('photos/picsum-0123456789abcdef.jpg') === '825dfd40', bg_tag('photos/picsum-0123456789abcdef.jpg'));
t('the tag matches app.js for letters outside ASCII (UTF-8 bytes)', bg_tag('uploads/ü-ñ.mp4') === '2a8f27bd', bg_tag('uploads/ü-ñ.mp4'));
t('an empty address has the FNV start value', bg_tag('') === '811c9dc5');

t('the cookie keeps only real tags', bg_seen_list('abc.<x>.12345678.123456789.zz') === ['abc', '12345678']);
$many = implode('.', array_map('dechex', range(1, 50)));
$l = bg_seen_list($many);
t('the cookie keeps the newest ' . BG_REMEMBER, count($l) === BG_REMEMBER && end($l) === dechex(50) && $l[0] === dechex(50 - BG_REMEMBER + 1), json_encode($l));

$list = array_map(fn($n) => ['url' => "photos/p-$n.jpg"], range(1, 5));
$seen = [bg_tag('photos/p-1.jpg'), bg_tag('photos/p-2.jpg'), bg_tag('photos/p-3.jpg'), bg_tag('photos/p-4.jpg')];
$got = [];
for ($i = 0; $i < 40; $i++) $got[bg_pick_fresh($list, $seen)['url']] = true;
t('four of five seen lately: only the fifth is picked', array_keys($got) === ['photos/p-5.jpg'], json_encode(array_keys($got)));
$seen[] = bg_tag('photos/p-5.jpg');
t('all five seen: the one seen longest ago comes back', bg_pick_fresh($list, $seen)['url'] === 'photos/p-1.jpg');
t('nothing to pick from gives null', bg_pick_fresh([], $seen) === null);

// going through a list never shows one twice before the others had their turn
$seen = []; $order = [];
for ($i = 0; $i < 10; $i++) { $p = bg_pick_fresh($list, $seen)['url']; $order[] = $p; $seen[] = bg_tag($p); $seen = array_slice($seen, -BG_REMEMBER); }
t('ten picks from five: each one twice, and no repeat within the first five', count(array_unique(array_slice($order, 0, 5))) === 5 && count(array_unique($order)) === 5 && array_slice($order, 5) === array_slice($order, 0, 5), json_encode($order));

$index = file_get_contents($site . '/web/home/index.php');
t('the first background on the page uses the same choice', strpos($index, 'bg_pick_fresh($list, $seen)') !== false && strpos($index, "\$_COOKIE['hl_seen']") !== false);

// Welcome Text
t('a new site says Welcome Home', default_site()['welcome'] === 'Welcome Home');
t('a site saved before the setting existed also gets it', clean_site(['title' => 'Home'])['welcome'] === 'Welcome Home');
t('empty means no welcome text', clean_site(['welcome' => ''])['welcome'] === '');
t('the text is kept to 80 characters', mb_strlen(clean_site(['welcome' => str_repeat('a', 200)])['welcome']) === 80);
