<?php
declare(strict_types=1);
/* Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
require __DIR__ . '/lib.php';
header('Cache-Control: no-cache, must-revalidate');
$nonce = rtrim(strtr(base64_encode(random_bytes(16)), '+/', '-_'), '=');   // lets our own two data scripts run; any other inline script is blocked
// Same protection as the other pages: only this site's scripts, no plugins, no framing from elsewhere, no sending data out.
// Images come only from this site (since 1.51 Home has no link icons from other sites); backgrounds are saved on your server.
header('Speculation-Rules: "' . (defined('HOME_BASE') ? '' : '../../') . 'web/hub/core/assets/speculation-rules.json"');   // pre-load a page when you hover over its link in the bar
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-$nonce'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; font-src 'self' data:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'");
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('Cross-Origin-Opener-Policy: same-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()');
header('X-Robots-Tag: noindex, nofollow');
if (hub_https()) header('Strict-Transport-Security: max-age=31536000');
home_move_links();   // 1.51: Home's links move to Links, once (see lib.php)
$site = public_payload();

// Choose the first background on the server so the browser can start loading it immediately.
// Each browser remembers the backgrounds it showed last (hl_seen), so one comes back only when the others have had their turn.
$seen = bg_seen_list((string) ($_COOKIE['hl_seen'] ?? ''));
$last = (string) ($_COOKIE['hl_last'] ?? '');   // the one cookie of 1.48 and earlier
if ($last !== '') $seen[] = bg_tag($last);
$pickFrom = fn(array $list) => bg_pick_fresh($list, $seen);
$rand = fn() => mt_rand() / mt_getrandmax();
$all    = $site['bg']['photos'];
$videos = array_values(array_filter($all, fn($i) => $i['type'] === 'video'));
$images = array_values(array_filter($all, fn($i) => $i['type'] !== 'video'));
$first = null;
if ($site['bg']['own']) {
    // a theme (Starter or your own): its backgrounds take turns; on Starter a browser that has never been here starts with the first one
    $first = !$seen && $site['bg']['theme'] === 'starter' ? $site['bg']['own'][0] : $pickFrom($site['bg']['own']);
}
if (!$first && $site['uploads'] && ($rand() < $site['bg']['uploadChance'] || !$all)) $first = $pickFrom($site['uploads']);
if (!$first && $videos && ($rand() < $site['bg']['videoChance'] || !$images)) $first = $pickFrom($videos);
if (!$first && $images) {
    // choose a source first, so a source with more saved photos isn't favoured
    $bySrc = [];
    foreach ($images as $i) $bySrc[$i['src']][] = $i;
    $first = $pickFrom($bySrc[array_rand($bySrc)]);
}
$first = $first ?? $pickFrom($site['uploads']);
$site['first'] = $first;
$h = fn($s) => htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
$v = fn($f) => $f . '?v=' . (is_file(__DIR__ . '/' . $f) ? filemtime(__DIR__ . '/' . $f) : 0);
// The tab icon is the site logo from the main Settings.
$siteLogo = hub_settings()['logo'] ?? '';
$logoOk = $siteLogo !== '' && is_file(HUB_PUBLIC . '/' . $siteLogo);
$brand = 'web/hub/core/assets/brand/favicon-64.png';   // Homebase Hub's own logo, when no site logo is set
$iconPath = '../../' . ($logoOk ? $siteLogo : $brand);   // one logo for the whole site (no separate start page icon)
$iconFile = HUB_PUBLIC . '/' . ($logoOk ? $siteLogo : $brand);
$iconType = ['ico' => 'image/x-icon', 'png' => 'image/png', 'jpg' => 'image/jpeg', 'gif' => 'image/gif', 'webp' => 'image/webp'][pathinfo($iconPath, PATHINFO_EXTENSION)] ?? 'image/svg+xml';
$favicon = $iconPath . '?v=' . (is_file($iconFile) ? filemtime($iconFile) : 0);   // the site logo, or Homebase Hub's own

// (1.61.0) Only Me: a visitor gets a log-in screen and nothing of the page (no photos, no text, no widgets)
if (!empty($site['private']) && !hub_admin()) {
?><!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<?php if (defined('HOME_BASE')): ?><base href="<?= $h(HOME_BASE) ?>"><?php endif; ?>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title><?= $h($site['title']) ?></title>
<link rel="stylesheet" href="../hub/core/assets/shell.css?v=1.64.5">
<script src="../hub/core/assets/shell.js?v=1.64.5" data-app="home"></script>
<link rel="icon" href="<?= $h($favicon) ?>" type="<?= $iconType ?>" sizes="any">
<link rel="manifest" href="../hub/core/api.php?action=manifest">
<link rel="stylesheet" href="<?= $v('assets/app.css') ?>">
</head>
<body class="onlyme">
<main class="onlyme-card"><h1>This Page Is Private</h1><p>Log in to see it.</p><button type="button" class="btn primary" id="onlymeLogin">Log In</button></main>
<script nonce="<?= $nonce ?>">document.getElementById('onlymeLogin').addEventListener('click',function(){HUB.login();});document.addEventListener('hub:login',function(){location.reload();});</script>
</body>
</html>
<?php
    exit;
}

?><!doctype html>
<html lang="en" data-glass="<?= $h($site['panel']['tint']) ?>">
<head>
<meta charset="utf-8">
<?php if (defined('HOME_BASE')): ?><base href="<?= $h(HOME_BASE) ?>"><?php endif; ?>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title><?= $h($site['title']) ?></title>
<link rel="stylesheet" href="../hub/core/assets/shell.css?v=1.64.5">
<script src="../hub/core/assets/shell.js?v=1.64.5" data-app="home"></script>
<link rel="icon" id="favicon" href="<?= $h($favicon) ?>" type="<?= $iconType ?>" sizes="any">
<?php if ($logoOk): ?><link rel="apple-touch-icon" href="<?= $h($favicon) ?>"><?php else: ?><link rel="apple-touch-icon" href="../hub/core/assets/brand/apple-touch-icon.png"><?php endif; ?>
<!-- install on a phone or computer: Settings > General > Install on Your Phone -->
<link rel="manifest" href="../hub/core/api.php?action=manifest">
<meta name="theme-color" content="#1a1a1a">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<?php if ($first && !empty($first['poster'])): ?>
<link rel="preload" as="image" href="<?= $h($first['poster']) ?>">
<?php endif; ?>
<?php if ($first && ($first['type'] ?? 'image') === 'image'): ?>
<?php if (!empty($first['p'])): ?>
<link rel="preload" as="image" href="<?= $h(media_url(photo_portrait_name($first['url']))) ?>" media="(max-aspect-ratio: 3/4)" fetchpriority="low">
<link rel="preload" as="image" href="<?= $h(media_url($first['url'])) ?>" media="not all and (max-aspect-ratio: 3/4)" fetchpriority="low">
<?php else: ?>
<link rel="preload" as="image" href="<?= $h(media_url($first['url'])) ?>" fetchpriority="low">
<?php endif; ?>
<?php endif; ?>
<link rel="stylesheet" href="<?= $v('assets/app.css') ?>">
<style>:root{--dim:<?= (float) $site['bg']['dim'] ?>;--panel-a:<?= (float) $site['panel']['opacity'] ?>;--panel-blur:<?= (int) $site['panel']['blur'] ?>px}</style>
</head>
<body>

<div id="bg" aria-hidden="true"></div>
<div id="scrim"></div>
<p id="welcome" aria-hidden="true" hidden></p>

<!-- While editing, the shared edit bar (shell.js) shows Background, Widgets, Home Settings and Done. These are its buttons. -->
<div class="toolbar" id="toolbar" data-hub-ebar hidden>
  <button type="button" data-open="bgSheet" data-hub="item" data-hub-label="Background" data-hub-icon="image" data-hub-order="1"></button>
  <button type="button" data-open="widgetsSheet" data-hub="item" data-hub-label="Widgets" data-hub-icon="grid" data-hub-order="2"></button>
  <button type="button" id="doneBtn" data-hub="done"></button>
</div>
<button type="button" hidden data-open="settingsSheet" data-hub="item" data-hub-main data-hub-label="Home Settings" data-hub-icon="gear" data-hub-order="8"></button>

<!-- The clock is for everyone. The widgets (1.51) appear only while you are logged in: their data never reaches a visitor. -->
<main class="stage" id="stage">
  <div class="clock" id="clock"<?= $site['clock'] ? '' : ' hidden' ?>>
    <p class="greet" id="greet"></p>
    <p class="time" id="time"></p>
    <p class="date" id="date"></p>
  </div>
  <div class="chips" id="wChips" hidden></div>
</main>

<section class="lg wpanel" id="wPanel" aria-labelledby="wPanelTitle" hidden>
  <header class="wph"><h2 id="wPanelTitle"></h2><button type="button" class="wx" id="wClose" aria-label="Close">✕</button></header>
  <div class="wbody" id="wBody"></div>
</section>
<div class="lg wdock" id="wDock" role="toolbar" aria-label="Widgets" hidden></div>
<div class="wcards" id="wCards" role="group" aria-label="Widgets" hidden></div>

<div class="corner">
  <a class="credit-text" id="creditText" target="_blank" rel="noopener"></a>
  <button class="chip round" id="nextBg" aria-label="Show a Different Background" title="Different Background">
    <svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>
  </button>
  <button class="chip" id="editBtn" data-hub="toggle">Edit</button>
</div>

<!-- ============ SHEETS ============ -->



<dialog class="sheet" id="settingsSheet">
  <div class="sheet-in">
    <header class="sh"><h2>Home Settings</h2><button type="button" class="x" data-close aria-label="Close">✕</button></header>
    <div class="sb">
      <section>
        <h3>General</h3>
        <div class="group">
          <label class="g-row stack"><span class="g-label">Page Title<small>Shown in the browser tab. The logo comes from the main Settings.</small></span>
            <input type="text" id="sTitle" maxlength="80"></label>
          <label class="g-row stack"><span class="g-label">Welcome Text<small>Fades in when Home opens. Empty for none.</small></span>
            <input type="text" id="sWelcome" maxlength="80" placeholder="Welcome Home"></label>
        </div>
      </section>
      <section>
        <h3>Privacy</h3>
        <div class="group">
          <label class="g-row"><span class="g-label">Only Me<small>Visitors see only a login screen.</small></span>
            <input type="checkbox" class="switch" id="sPrivate"></label>
        </div>
      </section>
      <section>
        <h3>Bar</h3>
        <div class="group">
          <label class="g-row"><span class="g-label">Show the Bar on the Home Page<small>Off keeps Home clean. A corner button opens the menu.</small></span>
            <input type="checkbox" class="switch" id="sHomeBar"></label>
          <label class="g-row"><span class="g-label">Edit Bar<small>Icons Only shows each name on hover.</small></span>
            <select id="sEditBar" data-ix-editbar><option value="icons">Icons Only</option><option value="text">Icons and Text</option></select></label>
        </div>
      </section>
      <section>
        <h3>Glass</h3>
        <div class="group">
          <div class="g-row"><span class="g-label">Tint<small>Solid is easiest to read on busy photos.</small></span>
            <div class="seg" id="pTint" role="radiogroup" aria-label="Tint"><button type="button" role="radio" data-v="light">Light</button><button type="button" role="radio" data-v="dark">Dark</button><button type="button" role="radio" data-v="solid">Solid</button></div></div>
          <div class="g-row stack"><span class="g-label">Opacity <b id="pOpVal"></b><small>How much the widgets tint the photo. 0% is fully see-through.</small></span>
            <input type="range" id="pOpacity" min="0" max="100" step="5"></div>
          <div class="g-row stack"><span class="g-label">Blur <b id="pBlurVal"></b><small>Frosted-glass effect behind the widgets.</small></span>
            <input type="range" id="pBlur" min="0" max="40" step="2"></div>
        </div>
      </section>
    </div>
    <footer class="sf"><span></span><div class="sf-r">
      <button type="button" class="btn" data-close>Cancel</button>
      <button type="button" class="btn primary" id="saveSettings" data-ix-save>Save Settings</button>
    </div></footer>
  </div>
</dialog>

<dialog class="sheet" id="widgetsSheet">
  <div class="sheet-in">
    <header class="sh"><h2>Widgets</h2><button type="button" class="x" data-close aria-label="Close">✕</button></header>
    <div class="sb">
      <section>
        <p class="hint">Only you see widgets. Visitors see the clock.</p>
        <div class="group">
          <label class="g-row"><span class="g-label">Show Widgets<small>Off: only the clock and your background, also for you.</small></span>
            <input type="checkbox" class="switch" id="wShow"></label>
        </div>
        <h3>Style</h3>
        <div class="wstyles" id="wStyle" role="radiogroup" aria-label="Widget Style">
          <button type="button" role="radio" data-v="dock"><span class="wprev dock" aria-hidden="true"><i></i><i></i><i></i></span><b>Glass Dock</b><small>A few chips under the clock. A dock opens each widget.</small></button>
          <button type="button" role="radio" data-v="glance"><span class="wprev glance" aria-hidden="true"><i></i><i></i><i></i><i></i></span><b>Glance and Expand</b><small>Small widgets along the bottom. Click one to open it.</small></button>
        </div>
        <div class="group">
          <label class="g-row"><span class="g-label">Show the Clock<small>The time, the date and a greeting. Visitors see it too.</small></span>
            <input type="checkbox" class="switch" id="wClock"></label>
        </div>
        <h3>Widgets, in This Order</h3>
        <div class="field">
          <div class="group" id="wList"></div></div>
        <div class="group">
          <div class="g-row stack"><span class="g-label">Countdown<small>The days left until a date you choose.</small></span>
            <div class="inline"><input type="text" id="wCdName" maxlength="40" placeholder="Goa Trip" aria-label="Countdown Name"><input type="date" id="wCdDate" aria-label="Countdown Date"></div></div>
          <label class="g-row stack"><span class="g-label">Pinned Note<small>One box from Info. Boxes in encrypted tabs can't be shown here.</small></span>
            <select id="wNote"><option value="">None</option></select></label>
        </div>
        <div class="group">
          <div class="g-row stack"><span class="g-label">World Clock<small>Up to three places. Type a city's time zone, like Europe/London, and a name if you like.</small></span>
            <div class="wzedit" id="wZones"></div></div>
          <div class="g-row stack"><span class="g-label">Weather<small>Asks Open-Meteo for your town, at most every 30 minutes. Off until you turn it on.</small></span>
            <div class="inline"><input type="text" id="wTown" maxlength="60" placeholder="Bengaluru" aria-label="Town for Weather" autocomplete="off">
              <div class="seg" id="wUnit" role="radiogroup" aria-label="Temperature"><button type="button" role="radio" data-v="c">°C</button><button type="button" role="radio" data-v="f">°F</button></div></div></div>
        </div>
        <datalist id="tzList"></datalist>
      </section>
    </div>
    <footer class="sf"><span></span><div class="sf-r">
      <button type="button" class="btn" data-close>Cancel</button>
      <button type="button" class="btn primary" id="saveWidgets">Save Widgets</button>
    </div></footer>
  </div>
</dialog>

<dialog class="sheet wide" id="bgSheet">
  <div class="sheet-in">
    <header class="sh"><h2>Background</h2><button type="button" class="x" data-close aria-label="Close">✕</button></header>
    <div class="sb">
      <section>
        <h3>Theme</h3>
        <p class="hint">Backgrounds Home takes turns with.</p>
        <div class="themes" id="themeRows"></div>
      </section>
      <section>
        <h3>Photo Sources</h3>
        <p class="hint">Saved on your server so they load fast.</p>
        <div class="group" id="sourceRows"></div>
        <label class="field"><span>Keywords for Wallhaven, Unsplash, Pixabay and custom sources</span>
          <input type="text" id="bgQuery" maxlength="450" placeholder="mountains, ocean, northern lights">
          <small class="hint">Separate with commas, up to <?= MAX_KEYWORDS ?>. A keyword can be more than one word, like <i>northern lights</i>. Photos are shared evenly between keywords.</small></label>
      </section>
      <section>
        <h3>API Keys</h3>
        <p class="hint">Free keys. Unsplash and Pixabay stay off until their key is added.</p>
        <div class="group" id="keyRows"></div>
      </section>
      <section>
        <h3>Custom Sources</h3>
        <p class="hint">Add any photo or video service with a JSON API, or any address that returns a new image each time. Up to <?= MAX_CUSTOM_SOURCES ?>.</p>
        <div class="group" id="customRows"></div>
        <button type="button" class="btn" id="addCustom">Add Custom Source</button>
      </section>
      <section>
        <h3>Your Uploads</h3>
        <div class="drop" id="drop" tabindex="0" role="button">
          <strong>Drop Images or Videos Here</strong>
          <span>or click to choose. JPG, PNG, WebP, GIF, AVIF, MP4, WebM, up to <?= MAX_UPLOAD_MB ?> MB</span>
          <input type="file" id="bgFile" accept="image/*,video/mp4,video/webm" multiple hidden>
        </div>
        <div class="prog" id="prog"><i></i></div>
        <div class="thumbs" id="thumbs"></div>
        <label class="field"><span>How Often Uploads Appear <b id="chanceVal"></b></span>
          <input type="range" id="bgChance" min="0" max="100" step="5"></label>
        <label class="field"><span>How Often Videos Appear <b id="videoVal"></b></span>
          <input type="range" id="bgVideo" min="0" max="100" step="5">
          <small class="hint">Applies when Pixabay videos are on. Videos are skipped for visitors with data saver turned on.</small></label>
      </section>
      <section>
        <h3>Look</h3>
        <div class="group">
          <label class="g-row"><span class="g-label">Slow Zoom<small>Gently moves the photo.</small></span>
            <input type="checkbox" class="switch" id="bgMotion"></label>
          <div class="g-row stack"><span class="g-label">Darken <b id="dimVal"></b><small>Keeps the clock and widgets readable on bright photos.</small></span>
            <input type="range" id="bgDim" min="0" max="80" step="5"></div>
          <div class="g-row stack"><span class="g-label">Change Background</span>
            <div class="seg" id="bgRotate">
              <button type="button" data-v="0">On Refresh</button>
              <button type="button" data-v="1">1 min</button>
              <button type="button" data-v="5">5 min</button>
              <button type="button" data-v="15">15 min</button>
              <button type="button" data-v="30">30 min</button>
            </div></div>
        </div>
      </section>
    </div>
    <footer class="sf"><span></span><div class="sf-r">
      <button type="button" class="btn" data-close>Cancel</button>
      <button type="button" class="btn primary" id="saveBg">Save Background</button>
    </div></footer>
  </div>
</dialog>


<dialog class="sheet wide" id="themeSheet">
  <form method="dialog" class="sheet-in" id="themeForm">
    <header class="sh"><h2 id="themeTitle">New Theme</h2><button type="button" class="x" data-close aria-label="Close">✕</button></header>
    <div class="sb">
      <label class="field"><span>Name</span><input type="text" id="tName" maxlength="40" placeholder="My Theme" required></label>
      <div class="field"><span>Backgrounds <b id="tCount"></b></span>
        <small class="hint">Tick the uploads this theme takes turns with. To add pictures or videos, drop them under Your Uploads first.</small>
        <div class="thumbs pick" id="tPick"></div></div>
    </div>
    <footer class="sf">
      <button type="button" class="btn danger" id="tDelete">Delete Theme</button>
      <div class="sf-r">
        <button type="button" class="btn" data-close>Cancel</button>
        <button type="submit" class="btn primary">Done</button>
      </div>
    </footer>
  </form>
</dialog>
<input type="file" id="themeFile" accept=".zip,application/zip" hidden>

<dialog class="sheet wide" id="customSheet">
  <form method="dialog" class="sheet-in" id="customForm">
    <header class="sh"><h2 id="customTitle">Custom Source</h2><button type="button" class="x" data-close aria-label="Close">✕</button></header>
    <div class="sb">
      <div class="field"><span>Start from an Example</span>
        <div class="inline" id="customPresets">
          <button type="button" class="btn small" data-preset="openverse">Openverse (No Key)</button>
          <button type="button" class="btn small" data-preset="pexels">Pexels (Old Key)</button>
          <button type="button" class="btn small" data-preset="image">Image Address</button>
        </div>
      </div>
      <label class="field"><span>Name</span><input type="text" id="cName" maxlength="40" placeholder="My Photo Service" required></label>
      <div class="field"><span>Type</span>
        <div class="seg" id="cKind"><button type="button" data-v="json">JSON API</button><button type="button" data-v="image">Image Address</button></div>
      </div>
      <div class="field"><span>Gives</span>
        <div class="seg" id="cType"><button type="button" data-v="image">Photos</button><button type="button" data-v="video">Videos</button></div>
      </div>
      <label class="field"><span>Address</span>
        <input type="text" id="cUrl" placeholder="https://api.example.com/search?q={keyword}&page={page}" spellcheck="false" required>
        <small class="hint">You can use <code>{keyword}</code> (one of your keywords), <code>{page}</code> (1 to 5), <code>{random}</code> and <code>{width}</code>.</small></label>
      <div data-kind="json">
        <label class="field"><span>Headers <small class="hint">optional, one per line</small></span>
          <textarea id="cHeaders" rows="2" placeholder="Authorization: your-api-key" spellcheck="false"></textarea></label>
      </div>
      <div class="cgrid" data-kind="json">
        <label class="field"><span>List of Items</span><input type="text" id="cList" placeholder="results" spellcheck="false"></label>
        <label class="field"><span>Image or Video Address</span><input type="text" id="cImage" placeholder="urls.full" spellcheck="false"></label>
        <label class="field"><span>Credit <small class="hint">optional</small></span><input type="text" id="cCredit" placeholder="user.name" spellcheck="false"></label>
        <label class="field"><span>Link <small class="hint">optional</small></span><input type="text" id="cLink" placeholder="links.html" spellcheck="false"></label>
      </div>
      <p class="hint" data-kind="json">Dotted paths into the reply, like video_files.0.link.</p>
      <div class="test-row"><button type="button" class="btn" id="cTest">Test</button><p class="test-out" id="cTestOut"></p></div>
      <p class="err" id="customErr"></p>
    </div>
    <footer class="sf">
      <button type="button" class="btn danger" id="cDelete">Delete Source</button>
      <div class="sf-r">
        <button type="button" class="btn" data-close>Cancel</button>
        <button type="submit" class="btn primary">Done</button>
      </div>
    </footer>
  </form>
</dialog>

<dialog class="sheet narrow" id="confirmSheet">
  <form method="dialog" class="sheet-in">
    <header class="sh"><h2 id="confirmTitle"></h2></header>
    <div class="sb"><p class="lead" id="confirmText"></p></div>
    <footer class="sf"><span></span><div class="sf-r">
      <button value="no" class="btn">Cancel</button>
      <button value="yes" class="btn primary" id="confirmYes"></button>
    </div></footer>
  </form>
</dialog>


<script nonce="<?= $nonce ?>">window.LOGO_FAVICON = <?= json_encode($logoOk ? $favicon : '', JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP) ?>;</script>
<script nonce="<?= $nonce ?>">window.PUB = <?= json_encode($site, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE | JSON_HEX_TAG | JSON_HEX_AMP) ?>;</script>
<script src="<?= $v('assets/app.js') ?>"></script>
</body>
</html>
