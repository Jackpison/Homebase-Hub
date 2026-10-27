<?php
// Install on a phone: the site's own path, the owner's logo as an app icon, and the web app manifest.
[$self, $site] = $argv + [1 => ''];
require __DIR__ . '/lib.php';
require $site . '/web/hub/core/lib/boot.php';

t('the site path at the top is ""', hub_site_path('/web/hub/core/api.php') === '');
t('in a sub-folder it is "/hub"', hub_site_path('/hub/web/hub/core/api.php') === '/hub');
t('two folders deep', hub_site_path('/a/b/web/hub/core/api.php') === '/a/b');
t('from the top index.php', hub_site_path('/hub/index.php') === '/hub' && hub_site_path('/index.php') === '');
t('Windows separators', hub_site_path('\\hub\\web\\hub/core\\api.php') === '/hub');

$pub = sys_get_temp_dir() . '/hub-man-' . bin2hex(random_bytes(4)); @mkdir($pub . '/web/hub/media/brand', 0755, true);
$png = function (string $name, int $w, int $h) use ($pub) { $im = imagecreatetruecolor($w, $h); imagepng($im, $pub . '/web/hub/media/brand/' . $name); return 'web/hub/media/brand/' . $name; };
$big = $png('logo-1a.png', 512, 512); $small = $png('logo-2b.png', 192, 192); $wide = $png('logo-3c.png', 800, 512);
t('a square PNG of 512 px can be the app icon', hub_app_logo($big, $pub) === $big);
t('a 192 px logo cannot', hub_app_logo($small, $pub) === '');
t('a logo that is not square cannot', hub_app_logo($wide, $pub) === '');
t('a path outside the logo folder is ignored', hub_app_logo('../../etc/passwd', $pub) === '' && hub_app_logo('web/hub/core/lib/boot.php', $pub) === '');
t('a missing file is ignored', hub_app_logo('web/hub/media/brand/logo-ff.png', $pub) === '');

$m = hub_manifest(['siteName' => 'Family Hub', 'logo' => ''], '/hub', $pub);
t('start_url is Home, inside the scope', $m['start_url'] === '/hub/web/home/' && $m['scope'] === '/hub/' && strpos($m['start_url'], $m['scope']) === 0);
t('standalone, dark colours, the site name', $m['display'] === 'standalone' && $m['theme_color'] === '#1a1a1a' && $m['name'] === 'Family Hub' && $m['short_name'] === 'Family Hub');
t('icons: 192, 512 and a maskable 512, all in the site', count($m['icons']) === 3 && $m['icons'][2]['purpose'] === 'maskable' && !array_filter($m['icons'], function ($i) { return strpos($i['src'], '/hub/web/hub/core/assets/brand/') !== 0; }));
t('shortcuts for Links, Info, Cards, Tasks and Tools', array_column($m['shortcuts'], 'name') === ['Links', 'Info', 'Cards', 'Tasks', 'Tools'] && $m['shortcuts'][0]['url'] === '/hub/web/links/');
t('a long name gets a short name of at most 12 characters', mb_strlen(hub_manifest(['siteName' => 'The Very Long Family Website'], '', $pub)['short_name']) <= 12);
$m = hub_manifest(['siteName' => 'X', 'logo' => $big], '', $pub);
t('the owner\'s square 512 px logo becomes the 512 icon', $m['icons'][1]['src'] === '/' . $big);
$m = hub_manifest(['siteName' => 'X', 'pages' => [['id' => 'tools', 'name' => 'Toolbox'], ['id' => 'links', 'name' => 'Bookmarks'], ['id' => 'cards', 'hide' => true]]], '', $pub);
t('shortcuts follow the bar: its names, its order, no hidden pages', array_column($m['shortcuts'], 'name') === ['Toolbox', 'Bookmarks', 'Info', 'Tasks']);
$m = hub_manifest(['siteName' => '<b>Hi</b>', 'pages' => [['id' => 'evil', 'name' => 'x'], ['id' => 'links', 'name' => '<script>x</script>']]], '', $pub);
t('unknown pages are left out and names lose markup', strpos(json_encode($m), 'evil') === false && strpos(json_encode($m), '<') === false && $m['name'] === 'Hi');
t('nothing private: no password, logo path only when used, no settings beyond names', !preg_grep('/hash|password|totp|token|csrf/i', array_keys($m)));
array_map('unlink', glob($pub . '/web/hub/media/brand/*')); @rmdir($pub . '/web/hub/media/brand');

/* 1.53.8: the icons a phone puts on its home screen fill the whole square (no dark border around a small logo) */
foreach (['logo-512-maskable.png' => 512, 'apple-touch-icon.png' => 180] as $f => $px) {
    $im = imagecreatefrompng($site . '/web/hub/core/assets/brand/' . $f);
    $ok = imagesx($im) === $px;
    foreach ([[0, 0], [$px - 1, 0], [0, $px - 1], [$px - 1, $px - 1], [intdiv($px, 2), 1], [1, intdiv($px, 2)]] as [$x, $y]) {
        $c = imagecolorsforindex($im, imagecolorat($im, $x, $y));
        if ($c['alpha'] !== 0 || $c['red'] < 200 || $c['green'] < 120) $ok = false;   // an opaque yellow, not the old dark frame
    }
    t("$f fills its whole square with the logo's yellow (phones round it themselves)", $ok);
}
