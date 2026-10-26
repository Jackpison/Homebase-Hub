<?php
// Home 1.52: the characters. Their settings (cleaned like every other Home setting), what visitors receive, and the files
// in web/hub/animation that the page loads: every character and prop has its model, and nothing points at another server.
// Runs on its own copy of src/ (run.php).
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/home/lib.php';

/* ---------- settings ---------- */
$c = clean_cast([]);
t('a site with no character settings: on, 2 at once, every character, Lively, Power Beam on',
  $c === ['on' => true, 'count' => 2, 'ids' => [], 'pace' => 'lively', 'beam' => true], json_encode($c));
t('How Many at Once stays between 1 and 5', clean_cast(['count' => 0])['count'] === 1 && clean_cast(['count' => 9])['count'] === 5 && clean_cast(['count' => '3'])['count'] === 3);
t('Activities is Lively or Calm; anything else is Lively', clean_cast(['pace' => 'calm'])['pace'] === 'calm' && clean_cast(['pace' => 'wild'])['pace'] === 'lively');
t('off stays off, and the Power Beam can be turned off', clean_cast(['on' => false])['on'] === false && clean_cast(['beam' => false])['beam'] === false);
$ids = clean_cast(['ids' => ['bruno', 'lion', 'bruno', '../x', '<b>', 7, str_repeat('a', 40), 'pink-blob']])['ids'];
t('Who Can Appear keeps plain character names once each; anything else is dropped', $ids === ['bruno', 'lion', 'pink-blob'], json_encode($ids));
t('a list that is not a list is treated as every character', clean_cast(['ids' => 'bruno'])['ids'] === [] && clean_cast('x') === clean_cast([]));
t('a saved site keeps its character settings through clean_site', clean_site(['cast' => ['count' => 4, 'pace' => 'calm']])['cast']['count'] === 4 && clean_site([])['cast']['on'] === true);
t('a site saved before 1.52 (no cast) gets the default', default_site()['cast'] === clean_cast([]));

/* ---------- visitors see the characters, like the background ---------- */
write_json(SITE_FILE, clean_site(['cast' => ['on' => true, 'count' => 3, 'ids' => ['lion', 'yeti']]]));
$pub = public_payload();
t('a visitor gets the character settings (and only those five values)', ($pub['cast'] ?? null) === ['on' => true, 'count' => 3, 'ids' => ['lion', 'yeti'], 'pace' => 'lively', 'beam' => true], json_encode($pub['cast'] ?? null));
write_json(SITE_FILE, clean_site(['cast' => ['on' => false]]));
t('...and when they are off, the page knows to load nothing', public_payload()['cast']['on'] === false);

/* ---------- the files the page loads ---------- */
$dir = $site . '/web/hub/animation';
$cat = json_decode((string) @file_get_contents($dir . '/cast.json'), true);
t('cast.json lists the characters and the props', is_array($cat) && count($cat['cast'] ?? []) >= 10 && count($cat['props'] ?? []) >= 10, is_array($cat) ? count($cat['cast']) . ' characters' : 'no cast.json');
$bad = [];
foreach ($cat['cast'] ?? [] as $d) {
    if (!preg_match('/^[a-z0-9-]{1,30}$/', $d['id'] ?? '')) $bad[] = 'id ' . json_encode($d['id'] ?? null);
    $m = json_decode((string) @file_get_contents($dir . '/models/' . ($d['id'] ?? '') . '.json'), true);
    $glb = is_array($m) ? base64_decode((string) ($m['glb'] ?? ''), true) : false;
    if (!$glb || substr($glb, 0, 4) !== 'glTF') $bad[] = 'model of ' . ($d['id'] ?? '?');
    if (empty($d['anims'])) $bad[] = 'animations of ' . ($d['id'] ?? '?');
}
foreach ($cat['props'] ?? [] as $p) {
    $m = json_decode((string) @file_get_contents($dir . '/props/' . $p . '.json'), true);
    if (!is_array($m) || substr((string) base64_decode((string) ($m['glb'] ?? ''), true), 0, 4) !== 'glTF') $bad[] = 'prop ' . $p;
}
t('every character and prop has a model file the page can read (a glb inside a .json: an update may carry .json, not .glb)', !$bad, implode(', ', $bad));
$ids = array_column($cat['cast'] ?? [], 'id');
t('no character is listed twice', count($ids) === count(array_unique($ids)));
$ext = [];
foreach (['cast.js', 'engine.js', 'fx.js', 'props.js', 'activities.js', 'stage.css'] as $f) {
    $s = (string) @file_get_contents($dir . '/' . $f);
    if ($s === '') { $ext[] = $f . ' is missing'; continue; }
    $s = preg_replace('~^\s*(/\*.*?\*/|//[^\n]*)~ms', '', $s);   // the licence header names the project's GitHub page
    if (preg_match('~(https?:)?//[a-z0-9.-]+\.[a-z]{2,}/~i', $s, $m)) $ext[] = $f . ': ' . $m[0];
}
t('the characters\' own scripts name no other server (they load only files of this site)', !$ext, implode(', ', $ext));
t('three.js and its loader ship with the site, with their licence', is_file($dir . '/vendor/three.min.js') && is_file($dir . '/vendor/GLTFLoader.js') && is_file($dir . '/vendor/three.LICENSE.txt'));
t('model files are .json, .js, .css, .txt or .htaccess only (types a site update can carry)', (function () use ($dir) {
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS));
    foreach ($it as $f) { $n = $f->getFilename(); if ($n !== '.htaccess' && !in_array(strtolower(pathinfo($n, PATHINFO_EXTENSION)), ['json', 'js', 'css', 'txt'], true)) return false; }
    return true;
})());
$home = (string) file_get_contents($site . '/web/home/index.php');
t('Home loads cast.js with the site version in its address (an update brings fresh models)', strpos($home, '../hub/animation/cast.js?v=<?= $h(HUB') !== false);


