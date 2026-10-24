/*! Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
/* The Settings page: it only hands its element to the admin part of the shell (web/core-data/assets/shell-admin.js), which draws everything. */
(function () {
  'use strict';
  var host = document.getElementById('settings');
  function start() {
    if (!window.HUB) return setTimeout(start, 30);
    window.HUB.ready().then(function () {
      if (!window.HUB.isAdmin()) {
        host.innerHTML = '<div class="ix-gate"><h1>Settings</h1><p>Log in to change your site\'s settings.</p><button type="button" class="ix-btn pri" id="ix-lg">Log In</button></div>';
        document.getElementById('ix-lg').onclick = function () { window.HUB.login().then(function () { location.reload(); }, function () {}); };
        return;
      }
      window.HUB.mountSettings(host);
    }, function () { host.innerHTML = '<p class="ix-err">Could not reach the site. Check your connection and reload.</p>'; });
  }
  start();
  // Install on Your Phone (Settings > General): keep the browser's install offer so the Install button can use it later.
  // Only this page does this, so the other pages keep the browser's own install hint.
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); window.__hubInstall = e; document.dispatchEvent(new Event('hub-install')); });
  window.addEventListener('appinstalled', function () { window.__hubInstall = null; document.dispatchEvent(new Event('hub-install')); });
})();
