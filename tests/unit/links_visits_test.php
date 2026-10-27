<?php
// Links 1.53: visit counts. Every click counts (yours and visitors'), once per browser per link every 30 seconds (30 minutes before 1.53.8); only links
// that exist can be counted; encrypted tabs never; a visitor cannot count a private tab's link; counts follow a link when it
// moves and start again when its address changes; backups carry them. Runs on its own copy of src/ (run.php).
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/links/lib.php';
require_once $site . '/web/hub/core/lib/backup.php';

$data = ['settings' => [], 'tabs' => [
    ['id' => 'daily', 'title' => 'Daily', 'categories' => [['id' => 'c1', 'title' => 'News', 'col' => 0, 'links' => [
        ['title' => 'Example', 'url' => 'https://example.org/', 'extra' => [['title' => 'Docs', 'url' => 'https://example.org/docs']]],
        ['divider' => true]]]]],
    ['id' => 'mine', 'title' => 'Mine', 'private' => true, 'categories' => [['id' => 'c2', 'title' => 'Bank', 'col' => 0, 'links' => [['title' => 'Bank', 'url' => 'https://bank.example/']]]]],
    ['id' => 'secret', 'title' => 'Secret', 'enc' => 'v1.xxxx', 'categories' => []],
]];
$now = 2000000000;
@unlink(hub_jpath(visits_file()));

[$c, $n] = visits_add('https://example.org/', 'browser-a', $data, true, $now);
t('a visitor\'s click on a link counts', $c === true && $n === 1);
[$c, $n] = visits_add('https://example.org/', 'browser-a', $data, true, $now + 10);
t('...the same browser clicking again within 30 seconds does not count again', $c === false && $n === 1);
[$c, $n] = visits_add('https://example.org/', 'browser-b', $data, true, $now + 10);
t('...another browser counts at once', $c === true && $n === 2);
[$c, $n] = visits_add('https://example.org/', 'browser-a', $data, true, $now + VISIT_GAP + 1);
t('...and the first browser counts again after 30 seconds', $c === true && $n === 3);
[$c] = visits_add('https://example.org/docs', 'browser-a', $data, true, $now);
t('an extra link (the small link next to a link) counts too', $c === true && visits_for($data)['https://example.org/docs'] === 1);
[$c] = visits_add('https://evil.example/', 'browser-a', $data, true, $now);
t('an address that is not one of your links is not counted (nobody can fill the file)', $c === null && !isset(visits_read()['counts']['https://evil.example/']));
[$c] = visits_add('https://bank.example/', 'browser-a', $data, true, $now);
t('a visitor cannot count a link of a private tab', $c === null);
[$c] = visits_add('https://bank.example/', 'me', $data, false, $now);
t('...you (logged in) can', $c === true && visits_for($data)['https://bank.example/'] === 1);
$moved = $data; $moved['tabs'][0]['categories'][0]['links'][] = array_shift($moved['tabs'][0]['categories'][0]['links']);
t('a link that moves keeps its count', visits_for($moved)['https://example.org/'] === 3);
$changed = $data; $changed['tabs'][0]['categories'][0]['links'][0]['url'] = 'https://example.org/new';
t('a link whose address changes starts from 0', !isset(visits_for($changed)['https://example.org/new']) && !isset(visits_for($changed)['https://example.org/']));
t('links in encrypted tabs are never counted (the server cannot even see their addresses)', !isset(visits_urls($data, false)['https://secret.example/']) && count(visits_urls($data, false)) === 3);
[$c] = visits_add(str_repeat('a', 3000), 'me', $data, false, $now);
t('a very long address is refused', $c === null);
$raw = hub_jraw(visits_file());
t('the file (guarded, closed to browsers) keeps no browser addresses or names, only a short code per recent click', $raw !== '' && strpos($raw, 'browser-a') === false && strpos($raw, '127.0.0.1') === false);

/* backups carry the counts */
hub_write_guarded(bk_links_file(), $data);
$bk = json_decode(json_encode(bk_export(['links' => true])['parts']), true);   // as in a saved file
t('a backup of Links carries the visit counts', ($c0 = (array) ($bk['links']['visits'] ?? [])) && $c0 === visits_read()['counts'], json_encode($bk['links']['visits'] ?? null));
$part = json_decode(json_encode(bk_export(['links' => ['daily']])['parts']), true);
t('...a backup of single tabs does not (it would mix with the other tabs\' counts)', !isset($part['links']['visits']));
@unlink(hub_jpath(visits_file()));
bk_import(['links' => $bk['links']], ['links' => true]);
t('restoring it brings the counts back', visits_for($data)['https://example.org/'] === 3);
$old = $bk['links']; unset($old['visits']); visits_add('https://example.org/', 'browser-z', $data, true, $now + 99999);
bk_import(['links' => $old], ['links' => true]);
t('a backup from before 1.53 (no counts) leaves the counts as they are', visits_for($data)['https://example.org/'] === 4);

/* the page */
$api = (string) file_get_contents($site . '/web/links/api.php');
t('only a logged-in browser receives the counts; a visitor\'s click answer has no number', strpos($api, '"visits":') !== false && strpos($api, "\$AUTH ? ['ok' => true, 'counted' => (bool)\$counted, 'count' => \$n] : ['ok' => true, 'counted' => (bool)\$counted]") !== false);
$js = (string) file_get_contents($site . '/web/links/assets/links.js');
t('Show Visit Counts is on unless you turn it off, and off only hides the numbers', strpos($js, "visitCounts !== false") !== false && strpos($js, "function countVisit(") !== false && strpos($js, 'showVisits()') !== false);
t('lib.php is closed to browsers', (bool) preg_match('/\(config\|lib\)\\\\\.php/', (string) file_get_contents($site . '/web/links/.htaccess')));

/* a tab that becomes encrypted: its addresses leave the counts file at once (1.53.1) */
visits_add('https://bank.example/', 'me2', $data, false, $now + 50000);
$enc = $data; $enc['tabs'][1] = ['id' => 'mine', 'title' => 'Mine', 'enc' => 'v1.yyyy', 'categories' => []];
visits_prune($enc);
t('encrypting a tab removes its links\' addresses from the counts file right away (the others stay)', strpos(hub_jraw(visits_file()), 'bank.example') === false && visits_for($enc)['https://example.org/'] === 4);
t('Links\' save runs it', strpos((string) file_get_contents($site . '/web/links/api.php'), 'visits_prune($data);') !== false);
t('1.53.8: the same browser counts the same link again after 30 seconds (it was 30 minutes)', VISIT_GAP === 30);
