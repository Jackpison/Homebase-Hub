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
// Images may come from https (link icons are loaded from the sites and favicon services); backgrounds are local.
header('Speculation-Rules: "' . (defined('HOME_BASE') ? '' : '../../') . 'web/core-data/assets/speculation-rules.json"');   // pre-load a page when you hover over its link in the bar
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-$nonce'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' blob:; connect-src 'self'; font-src 'self' data:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'");
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('Cross-Origin-Opener-Policy: same-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()');
header('X-Robots-Tag: noindex, nofollow');
if (hub_https()) header('Strict-Transport-Security: max-age=31536000');
$site = public_payload();

// Choose the first background on the server so the browser can start loading it immediately.
$last = (string) ($_COOKIE['hl_last'] ?? '');
$pickFrom = function (array $list) use ($last) {
    $fresh = array_values(array_filter($list, fn($i) => $i['url'] !== $last));
    $list = $fresh ?: $list;
    return $list ? $list[array_rand($list)] : null;
};
$rand = fn() => mt_rand() / mt_getrandmax();
$all    = $site['bg']['photos'];
$videos = array_values(array_filter($all, fn($i) => $i['type'] === 'video'));
$images = array_values(array_filter($all, fn($i) => $i['type'] !== 'video'));
$first = null;
if ($site['uploads'] && ($rand() < $site['bg']['uploadChance'] || !$all)) $first = $pickFrom($site['uploads']);
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
$brand = 'web/core-data/assets/brand/favicon-64.png';   // Homebase Hub's own logo, when no site logo is set
$iconPath = '../../' . ($logoOk ? $siteLogo : $brand);   // one logo for the whole site (no separate start page icon)
$iconFile = HUB_PUBLIC . '/' . ($logoOk ? $siteLogo : $brand);
$iconType = ['ico' => 'image/x-icon', 'png' => 'image/png', 'jpg' => 'image/jpeg', 'gif' => 'image/gif', 'webp' => 'image/webp'][pathinfo($iconPath, PATHINFO_EXTENSION)] ?? 'image/svg+xml';
$favicon = $iconPath ? $iconPath . '?v=' . (is_file($iconFile) ? filemtime($iconFile) : 0) : "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='26' fill='%23111827'/><circle cx='50' cy='50' r='20' fill='%23A8D8FF'/></svg>";

?><!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<?php if (defined('HOME_BASE')): ?><base href="<?= $h(HOME_BASE) ?>"><?php endif; ?>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title><?= $h($site['title']) ?></title>
<link rel="stylesheet" href="../core-data/assets/shell.css?v=1.45.0">
<script src="../core-data/assets/shell.js?v=1.45.0" data-app="home"></script>
<link rel="icon" id="favicon" href="<?= $h($favicon) ?>" type="<?= $iconType ?>" sizes="any">
<?php if ($iconPath): ?><link rel="apple-touch-icon" href="<?= $h($favicon) ?>"><?php endif; ?>
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

<!-- Edit-mode toolbar -->
<div class="toolbar" id="toolbar" hidden>
  <p class="tb-hint">Drag links to reorder, or move them between columns.</p>
  <div class="tb-actions">
    <button class="tb-btn" data-open="bgSheet" data-hub="item" data-hub-label="Background" data-hub-icon="image" data-hub-order="3">Background</button>
    <button class="tb-btn" data-open="settingsSheet" data-hub="item" data-hub-label="Page Settings" data-hub-icon="gear" data-hub-order="8" data-hub-sep>Settings</button>
    <button class="tb-btn" id="logoutBtn" data-hub="logout">Log Out</button>
    <button class="tb-btn tb-done" id="doneBtn" data-hub="done">Done</button>
  </div>
</div>

<main class="stage">
  <nav class="board" id="board" aria-label="My Websites">
    <ul class="col" data-col="0"></ul>
    <ul class="col" data-col="1"></ul>
  </nav>
</main>

<div class="corner">
  <a class="credit-text" id="creditText" target="_blank" rel="noopener"></a>
  <button class="chip round" id="nextBg" aria-label="Show a Different Background" title="Different Background">
    <svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>
  </button>
  <button class="chip" id="editBtn" data-hub="toggle">Edit</button>
</div>

<!-- ============ SHEETS ============ -->



<dialog class="sheet" id="linkSheet">
  <form method="dialog" class="sheet-in" id="linkForm">
    <header class="sh"><h2 id="linkSheetTitle">Add Link</h2><button type="button" class="x" data-close aria-label="Close">✕</button></header>
    <div class="sb">
      <label class="field"><span>Web Address</span><input type="text" id="lUrl" inputmode="url" placeholder="https://yoursite.com" required autocomplete="off"></label>
      <div class="field"><span>Name</span>
        <div class="inline">
          <input type="text" id="lName" maxlength="60" placeholder="My Blog" autocomplete="off">
          <button type="button" class="btn" id="lGetTitle">Get Title</button>
        </div>
      </div>
      <div class="field"><span>Icon</span>
        <div class="icon-edit">
          <div class="icon-preview" id="lIconPreview"></div>
          <div class="icon-controls">
            <div class="seg" id="lIconType" role="radiogroup">
              <button type="button" data-v="auto">Automatic</button>
              <button type="button" data-v="emoji">Emoji</button>
              <button type="button" data-v="image">Image</button>
            </div>
            <div data-pane="auto"><p class="hint">Uses the website's own favicon.</p></div>
            <div data-pane="emoji" hidden><input type="text" id="lEmoji" maxlength="8" placeholder="Type or paste an emoji" class="emoji-in"></div>
            <div data-pane="image" hidden class="inline">
              <button type="button" class="btn" id="lFetchIcon">Fetch from Site</button>
              <button type="button" class="btn" id="lUploadIcon">Upload</button>
              <input type="file" id="lIconFile" accept="image/png,image/jpeg,image/webp,image/gif,image/x-icon,.ico" hidden>
            </div>
          </div>
        </div>
      </div>
      <div class="field"><span>Column</span>
        <div class="seg" id="lCol" role="radiogroup">
          <button type="button" data-v="0">Left</button>
          <button type="button" data-v="1">Right</button>
        </div>
      </div>
      <p class="err" id="linkErr"></p>
    </div>
    <footer class="sf">
      <button type="button" class="btn danger" id="lDelete">Delete Link</button>
      <div class="sf-r">
        <button type="button" class="btn" data-close>Cancel</button>
        <button type="submit" class="btn primary">Save Link</button>
      </div>
    </footer>
  </form>
</dialog>

<dialog class="sheet" id="settingsSheet">
  <div class="sheet-in">
    <header class="sh"><h2>Settings</h2><button type="button" class="x" data-close aria-label="Close">✕</button></header>
    <div class="sb">
      <section>
        <h3>Page</h3>
        <div class="group">
          <label class="g-row stack"><span class="g-label">Site Title<small>Shown in the browser tab. The logo comes from the main Settings.</small></span>
            <input type="text" id="sTitle" maxlength="80"></label>
        </div>
      </section>
      <section>
        <h3>Links Panel</h3>
        <div class="group">
          <div class="g-row stack"><span class="g-label">Opacity <b id="pOpVal"></b><small>0% is fully see-through.</small></span>
            <input type="range" id="pOpacity" min="0" max="100" step="5"></div>
          <div class="g-row stack"><span class="g-label">Blur <b id="pBlurVal"></b><small>Frosted-glass effect behind the links.</small></span>
            <input type="range" id="pBlur" min="0" max="40" step="2"></div>
        </div>
      </section>
    </div>
    <footer class="sf"><span></span><div class="sf-r">
      <button type="button" class="btn" data-close>Cancel</button>
      <button type="button" class="btn primary" id="saveSettings">Save Settings</button>
    </div></footer>
  </div>
</dialog>

<dialog class="sheet wide" id="bgSheet">
  <div class="sheet-in">
    <header class="sh"><h2>Background</h2><button type="button" class="x" data-close aria-label="Close">✕</button></header>
    <div class="sb">
      <section>
        <h3>Photo Sources</h3>
        <p class="hint">Photos and videos are saved on your server so they load fast. Up to <?= PHOTOS_PER_SOURCE ?> photos (<?= VIDEOS_PER_SOURCE ?> videos) per source are kept. Each is deleted after it's been shown <?= MAX_VIEWS ?> times and a new one is downloaded.</p>
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
          <div class="g-row stack"><span class="g-label">Darken <b id="dimVal"></b><small>Keeps your links readable on bright photos.</small></span>
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
      <p class="hint" data-kind="json">Field names are paths into the JSON reply, joined with dots. Use numbers for list positions, like <code>video_files.0.link</code>. Leave “List of items” empty if the reply itself is the list.</p>
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

<div id="toast" role="status" aria-live="polite"></div>

<script nonce="<?= $nonce ?>">window.LOGO_FAVICON = <?= json_encode($logoOk ? $favicon : '', JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP) ?>;</script>
<script nonce="<?= $nonce ?>">window.PUB = <?= json_encode($site, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE | JSON_HEX_TAG | JSON_HEX_AMP) ?>;</script>
<script src="<?= $v('assets/app.js') ?>"></script>
</body>
</html>
