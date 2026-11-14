/*! Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
// @ts-check
(() => {
'use strict';

/** @type {(s: string, r?: ParentNode) => any} */   // (any: the page knows which element each id is)
const $  = (s, r = document) => r.querySelector(s);
/** @type {(s: string, r?: ParentNode) => any[]} */
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc=HUB.esc;   // the shell's HTML escaper (shell.js, loaded first)
const pick = a => a[Math.floor(Math.random() * a.length)];
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
let PUB = /** @type {any} */ (window).PUB;      // what visitors see
let ADMIN = null;          // full data while logged in
let CSRF = null;
let editing = false;
/* Saved pictures are stored as "photos/…", "uploads/…" and "icons/…" and live in web/hub/media/home (before 1.29.3: next to this page). Only the address shown changes. */
const media = u => /^(photos|uploads|icons)\//.test(u || '') ? '../hub/media/home/' + u : u;

const DEFAULT_FAVICON = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='26' fill='%23111827'/><circle cx='50' cy='50' r='20' fill='%23A8D8FF'/></svg>";
let lastIcon = PUB.icon;
function setFavicon(icon){
  // Replace the <link> element: some browsers ignore a changed href on the old one.
  const old = $('#favicon');
  const link = document.createElement('link');
  link.id = 'favicon'; link.rel = 'icon'; link.sizes = 'any';
  const ext = (icon.split('.').pop() || '').toLowerCase();
  link.type = icon ? ({ ico:'image/x-icon', png:'image/png', jpg:'image/jpeg', gif:'image/gif', webp:'image/webp' }[ext] || '') : (/** @type {any} */ (window).LOGO_FAVICON ? '' : 'image/svg+xml');
  link.href = icon ? media(icon) + '?v=' + Date.now() : (/** @type {any} */ (window).LOGO_FAVICON || DEFAULT_FAVICON);
  old.replaceWith(link);
}
function applyPageMeta(src){
  document.title = src.title || 'Home';
  if (src.icon !== lastIcon){ setFavicon(src.icon); lastIcon = src.icon; }
  document.documentElement.style.setProperty('--dim', src.bg.dim);
}

