// Share from your phone (1.61.0). When this site is added to the home screen, the phone's Share button lists it. The shared pictures,
// files, text or link arrive as a POST to web/hub/share-target; this service worker catches it in the browser, keeps the files in the
// browser's own storage (Cache "hub-share", on this device only, for a day at most), and opens the Files page, which asks what to do:
// Save to Files (locked in the browser like any upload), Open in Tools, or Discard. Nothing is sent to the server by this step.
const CACHE = 'hub-share';
const KEEP_MS = 24 * 3600 * 1000;      // a share nobody picked up is dropped after a day
const MAX_BYTES = 300 * 1024 * 1024;   // one share, all files together
const root = new URL('../../', self.location);   // the site's folder (this file is web/hub/share-sw.js)

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'POST' || u.origin !== self.location.origin || !u.pathname.endsWith('/web/hub/share-target')) return;   // everything else goes to the network, untouched
  e.respondWith(take(r));
});

async function sweep(cache) {
  for (const k of await cache.keys()) {
    if (!k.url.endsWith('/meta')) continue;
    const m = await (await cache.match(k)).json().catch(() => null);
    if (!m || Date.now() - m.t > KEEP_MS) await dropEntry(cache, k.url.split('/').slice(-2)[0]);
  }
}
async function dropEntry(cache, id) {
  for (const k of await cache.keys()) if (k.url.includes('/share-inbox/' + id + '/')) await cache.delete(k);
}

async function take(req) {
  const back = (v) => Response.redirect(new URL('web/files/?shared=' + v, root).href, 303);
  try {
    const fd = await req.formData();
    const files = fd.getAll('files').filter((f) => f && typeof f !== 'string');
    const str = (k) => String(fd.get(k) || '').slice(0, 4000);
    const size = files.reduce((n, f) => n + f.size, 0);
    if (size > MAX_BYTES) return back('toobig');
    if (!files.length && !str('text') && !str('url') && !str('title')) return back('none');
    const cache = await caches.open(CACHE);
    await sweep(cache);
    const id = Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => b.toString(16).padStart(2, '0')).join('');
    const at = (p) => new URL('web/hub/share-inbox/' + id + '/' + p, root).href;
    for (let i = 0; i < files.length; i++) await cache.put(at('f' + i), new Response(files[i], { headers: { 'Content-Type': files[i].type || 'application/octet-stream' } }));
    const meta = { id, t: Date.now(), title: str('title'), text: str('text'), url: str('url'), files: files.map((f) => ({ n: String(f.name || 'file').slice(0, 180), type: f.type || '', size: f.size })) };
    await cache.put(at('meta'), new Response(JSON.stringify(meta), { headers: { 'Content-Type': 'application/json' } }));
    return back(id);
  } catch (err) {
    return back('error');
  }
}
