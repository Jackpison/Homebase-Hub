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
})();
