/*! Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
/* ask for the page data right away, while shell.js and this page are still loading; the page script below picks the answer up */
(function () { try { window.__bmGet = fetch('api.php?action=get&t=' + Date.now(), { credentials: 'same-origin' }).then(function (r) { return r.json().then(function (j) { return { r: r, j: j }; }, function () { return { r: r, j: {} }; }); }).catch(function () { return null; }); } catch (e) {} })();
