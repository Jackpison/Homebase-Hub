// TOOLS service worker: instant repeat visits and offline use.
// Everything in assets/ is served from cache. TOOLS_REV is a fingerprint of those files (the release script writes it): the cache is
// emptied and refilled only when a Tools file really changed. The page itself is always fetched fresh first, so new uploads show at once.
const TOOLS_REV = '0e66a7f4';
const CACHE = 'tools-' + TOOLS_REV;
const ASSETS = new URL('./assets/', self.location).pathname;   // this folder only: never web/hub/core/assets or another page's assets

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  if (url.pathname.startsWith(ASSETS)) {
    e.respondWith(caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    }));
    return;
  }

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./', copy)); }
      return res;
    }).catch(() => caches.match('./').then((r) => r || Response.error())));
  }
});
