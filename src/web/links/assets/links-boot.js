/*! Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
/* apply Links' own colors and text sizes before anything paints (no flash); the light or dark theme is set by shell.js, which runs first */
(function () {
  var r = document.documentElement;
  try {
    var m = r.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    var look = JSON.parse(localStorage.getItem('bm-look') || 'null');
    if (look) {
      var c = look[m] || {};
      for (var k in c) if (/^#[0-9a-f]{6}$/i.test(c[k])) r.style.setProperty('--' + k, c[k]);
      if (look.sizes) for (var z in look.sizes) r.style.setProperty('--fs-' + z, look.sizes[z] + 'px');
      if (look.title) document.title = look.title;
    }
  } catch (e) {}
})();
