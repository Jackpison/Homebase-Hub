<?php
// Home: the animated designs (1.74.0): the list, the limits of every option, which designs a theme takes turns with.
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/home/lib.php';

$reg = designs_registry();
t('the list has the 16 designs', count($reg) === 16, count($reg));
$bad = [];
foreach ($reg as $id => $d) {
    if (!preg_match('/^[a-z0-9-]{3,30}$/', $id) || !is_array($d['defaults'] ?? null) || !is_array($d['options'] ?? null) || $d['options'] === []
        || !str_starts_with((string) ($d['link'] ?? ''), 'https://reactbits.dev/') || ($d['name'] ?? '') === '' || ($d['about'] ?? '') === '') $bad[] = $id;
    foreach ($d['options'] as $o) {
        $ok = isset($o['k'], $o['label'], $o['type']) && array_key_exists($o['k'], $d['defaults']) && in_array($o['type'], ['color', 'colors', 'range', 'choice'], true);
        if ($ok && $o['type'] === 'range') $ok = $o['min'] < $o['max'] && $o['step'] > 0 && $d['defaults'][$o['k']] >= $o['min'] && $d['defaults'][$o['k']] <= $o['max'];
        if ($ok && $o['type'] === 'choice') $ok = in_array($d['defaults'][$o['k']], $o['choices'], true);
        if ($ok && $o['type'] === 'color') $ok = design_hex($d['defaults'][$o['k']]) !== null;
        if ($ok && $o['type'] === 'colors') $ok = count($d['defaults'][$o['k']]) >= 1 && count($d['defaults'][$o['k']]) <= $o['max'] && !array_filter($d['defaults'][$o['k']], fn($c) => design_hex($c) === null);
        if (!$ok) $bad[] = $id . '.' . ($o['k'] ?? '?');
    }
}
t('every design has a name, a React Bits link, defaults and options that fit those defaults', $bad === [], json_encode($bad));
t('the two heavy designs are computers only, and Aero Shards needs WebGPU', $reg['hyperspeed']['desktop'] && $reg['aero-shards']['desktop'] && $reg['aero-shards']['gpu'] === 'webgpu' && !$reg['iridescence']['desktop']);

// the limits of each option
t('a colour is kept in lower case', design_clean_opts('iridescence', ['color' => '#80AACC']) === ['color' => '#80aacc']);
t('a colour that is not #rrggbb is dropped', design_clean_opts('iridescence', ['color' => 'red']) === [] && design_clean_opts('iridescence', ['color' => '#12']) === [] && design_clean_opts('iridescence', ['color' => 'url(x)']) === [] && design_clean_opts('iridescence', ['color' => ['#ffffff']]) === []);
t('a number is kept inside its range, on its step', design_clean_opts('iridescence', ['speed' => 99]) == ['speed' => 3] && design_clean_opts('iridescence', ['speed' => -5]) == ['speed' => 0.2] && design_clean_opts('iridescence', ['speed' => 1.234]) == ['speed' => 1.2], json_encode(design_clean_opts('iridescence', ['speed' => 1.234])));
t('a number that is not a number is dropped', design_clean_opts('iridescence', ['speed' => 'fast']) === []);
t('a choice must be one of the design\'s own', design_clean_opts('crystalized-ball', ['preset' => 'frost']) === ['preset' => 'frost'] && design_clean_opts('crystalized-ball', ['preset' => 'nope']) === []);
t('a list of colours is cut to the most the design takes and bad ones are dropped', design_clean_opts('orb', ['colors' => ['#111111', '#222222', '#333333', '#444444']]) === ['colors' => ['#111111', '#222222', '#333333']] && design_clean_opts('orb', ['colors' => ['#111111', 'x']]) === ['colors' => ['#111111']] && design_clean_opts('orb', ['colors' => ['x']]) === []);
t('only the options a design lists are kept', design_clean_opts('iridescence', ['color' => '#112233', 'hueShift' => 5, 'evil' => '<script>', 'mouseReact' => false]) === ['color' => '#112233']);
t('something that is not a list gives nothing', design_clean_opts('iridescence', 'x') === [] && design_clean_opts('nope', ['color' => '#112233']) === []);

// what is kept for a site
$d = clean_designs(['iridescence' => ['on' => false, 'opts' => ['speed' => 2]], 'nope' => ['on' => true], 'orb' => ['opts' => []], 'galaxy' => 'x']);
t('your settings are kept per design; unknown designs and bad entries go', array_keys($d) === ['iridescence', 'orb'] && $d['iridescence'] == ['on' => false, 'opts' => ['speed' => 2]] && $d['orb'] === ['on' => true, 'opts' => []], json_encode($d));
t('nothing at all gives an empty list', clean_designs(null) === [] && clean_designs('x') === []);

// the page's item for one design
$s = ['bg' => ['designs' => ['iridescence' => ['on' => true, 'opts' => ['color' => '#112233', 'speed' => 2]]]]];
$i = design_item('iridescence', $s);
t('a design item: its own settings with your options on top', $i['url'] === 'design:iridescence' && $i['type'] === 'design' && $i['design']['props']['color'] === '#112233' && $i['design']['props']['speed'] == 2 && $i['design']['props']['brightness'] === 1.5, json_encode($i));
t('it carries the credit, the link and what the page needs to decide where it runs', $i['credit'] === 'From React Bits' && str_starts_with($i['link'], 'https://reactbits.dev/') && $i['design']['desktop'] === false && design_item('hyperspeed', [])['design']['desktop'] === true && design_item('aero-shards', [])['design']['gpu'] === 'webgpu');
t('an unknown design gives nothing', design_item('nope', []) === null);

// the Animated Designs theme
t('the theme takes every design', count(designs_items([])) === 16);
$s = ['bg' => ['designs' => ['orb' => ['on' => false, 'opts' => []]]]];
$ids = array_map(fn($x) => $x['url'], designs_items($s));
t('a design that is switched off is left out; the rest keep their order', count($ids) === 15 && !in_array('design:orb', $ids, true) && $ids === array_values(array_filter(array_map(fn($k) => 'design:' . $k, array_keys($reg)), fn($u) => $u !== 'design:orb')));
t('the theme is a valid choice, and a new site starts with it', theme_ok('designs', false, []) && default_site()['bg']['theme'] === 'designs');
t('a site that chose Starter or Online Photos keeps it', clean_site(['bg' => ['theme' => 'starter']])['bg']['theme'] === 'starter' && clean_site(['bg' => ['theme' => 'online']])['bg']['theme'] === 'online' && clean_site(['bg' => ['theme' => 'designs']])['bg']['theme'] === 'designs');
t('a theme that does not exist becomes Online Photos', clean_site(['bg' => ['theme' => 'nope']])['bg']['theme'] === 'online');
t('the page gets the designs\' items for the theme', array_column(theme_items('designs', [], [], []), 'url') === array_map(fn($k) => 'design:' . $k, array_keys($reg)));
$saved = clean_site(['bg' => ['theme' => 'designs', 'designs' => ['orb' => ['on' => false, 'opts' => ['colors' => ['#010203']]], 'evil' => ['on' => true]]]]);
t('your design settings survive a save', $saved['bg']['designs'] === ['orb' => ['on' => false, 'opts' => ['colors' => ['#010203']]]], json_encode($saved['bg']['designs']));

// your own theme can take designs in its turns
$themes = clean_themes([['id' => 'aabbccdd', 'name' => 'Mix', 'items' => ['design:iridescence', 'design:nope', 'design:iridescence', 'uploads/0123456789abcdef.jpg', 'design:../x', 'design:galaxy']]]);
t('a theme keeps the designs that exist, once each, and drops the rest', $themes[0]['items'] === ['design:iridescence', 'design:galaxy'], json_encode($themes[0]['items']));
$s = ['bg' => ['designs' => ['galaxy' => ['on' => false, 'opts' => ['starSpeed' => 1.5]]]]];
$items = theme_items('t:aabbccdd', $themes, [], $s);
t('the theme shows them with your options, even a design that is off in the Animated Designs theme', array_column($items, 'url') === ['design:iridescence', 'design:galaxy'] && $items[1]['design']['props']['starSpeed'] == 1.5, json_encode(array_column($items, 'url')));
