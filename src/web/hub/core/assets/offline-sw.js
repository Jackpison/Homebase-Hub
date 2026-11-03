/*! Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
/* Offline Reading (1.72.0). Only on a device where it was switched on (Settings > Overview > Start Here), and served by
   web/hub/core/api.php?action=sw so it may look after the whole site. It keeps, in this browser only (Cache "hub-offline"):
   the pages, their scripts and styles, and the last data of Home, Links, Info, Cards, Tasks and Files' list. Online, everything
   comes from the server as before (and the copy is refreshed); without a connection, the last copy is shown, read-only.
   Locked tabs, Cards and Files stay locked in the copy (the server only ever sends them scrambled). Log Out and switching it off
   delete the copy. Files themselves, pictures you upload and Tools are never kept here (Tools has its own). */
const CACHE = 'hub-offline';
const root = new URL('../../../', self.location);   // the site's folder (this script is web/hub/core/api.php?action=sw)
const WAIT_MS = 4000;                               // a slow answer counts as none: show the copy instead
// the data each page loads, by its address inside the site (query parts that only stop caching are dropped from the key)
const DATA = [/^web\/links\/api\.php\?action=get$/, /^web\/info\/api\.php$/, /^web\/cards\/api\.php$/, /^web\/tasks\/api\.php$/,
  /^web\/files\/api\.php\?action=list$/, /^web\/home\/api\.php\?action=state$/, /^web\/hub\/core\/api\.php\?action=state$/,
  /^web\/hub\/core\/assets\/brand\/[\w.-]+\.(png|svg|ico)$/, /^web\/hub\/media\/brand\/logo-[a-z0-9]+\.(png|jpg|webp|gif|ico)$/];   // the logo in the bar

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('message', (e) => { if (e.data === 'clear') e.waitUntil(caches.delete(CACHE)); });

/* the key a request is kept under: its full address without t= (a time stamp) and ih= (Info's icon check). Always a full address:
   a relative one would be read from this script's own folder. */
function keyOf(u) {
  const p = new URLSearchParams(u.search); p.delete('t'); p.delete('ih');
  const q = p.toString();
  return u.origin + u.pathname + (q ? '?' + q : '');
}
function kind(req, u) {
  if (req.method !== 'GET' || u.origin !== root.origin || !u.pathname.startsWith(root.pathname)) return '';
  const k = keyOf(u).slice(root.href.length);   // the address inside the site
  if (/^web\/tools\//.test(k) || /^web\/hub\/media\/(?!brand\/)/.test(k) || /^web\/home\/(photos|uploads|starter)\//.test(k)) return '';   // Tools has its own; pictures can be big
  if (req.mode === 'navigate') return 'page';
  if (DATA.some((r) => r.test(k))) return 'data';
  if (/\.(css|js|svg|png|woff2?)$/.test(u.pathname) && /[?&]v=/.test(u.search)) return 'asset';   // a versioned file never changes
  return '';
}
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url), k = kind(e.request, u);
  if (!k) return;   // everything else goes to the network, untouched
  e.respondWith(k === 'asset' ? asset(e.request, u) : fresh(e.request, u, e.clientId || e.resultingClientId));
});
async function asset(req, u) {
  const c = await caches.open(CACHE), hit = await c.match(keyOf(u));
  if (hit) return hit;
  const r = await fetch(req);
  if (r.ok) c.put(keyOf(u), r.clone()).catch(() => {});
  return r;
}
/* the network first; its answer is kept for next time. No answer within WAIT_MS (or none at all): the kept copy, and the page is told */
async function fresh(req, u, client) {
  const c = await caches.open(CACHE), key = keyOf(u);
  const net = fetch(req).then((r) => { if (r.ok && r.type === 'basic') c.put(key, r.clone()).catch(() => {}); return r; });
  const late = new Promise((res) => setTimeout(() => res(null), WAIT_MS));
  try {
    const r = await Promise.race([net, late]);
    if (r) return r;
  } catch (e) { /* no connection: the copy below */ }
  const hit = await c.match(key);
  if (!hit) return net;   // nothing kept: wait for the network after all (or its error)
  tell(client);
  return hit;
}
async function tell(id) {
  const list = id ? [await self.clients.get(id)] : await self.clients.matchAll({ type: 'window' });
  list.forEach((w) => { if (w) w.postMessage({ hub: 'offline' }); });
}
