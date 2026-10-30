// Files sent to this site from the phone's Share button (1.61). The site's share worker keeps them in this browser (Cache "hub-share") and
// the Files page sends them here with ?shared=<id>. They wait for the next tool that asks for a file of that kind, and are removed when
// used or discarded. Nothing here talks to the server.
import { h } from '../ui.js';

const CACHE = 'hub-share';
let pending = null;   // { id, files: File[] }
let note = null;

const key = (id, p) => new URL('../hub/share-inbox/' + id + '/' + p, location.href).href;

async function drop(id) {
  try { const c = await caches.open(CACHE); for (const k of await c.keys()) if (k.url.includes('/share-inbox/' + id + '/')) await c.delete(k); } catch (e) { /* nothing kept */ }
}

function drawNote() {
  note?.remove(); note = null;
  if (!pending || !pending.files.length) return;
  note = h('div', { class: 'shnote', role: 'status' },
    h('span', { text: 'Shared with you: ' + pending.files.map((f) => f.name).join(', ') + '. Open a tool that takes this kind of file and it goes in.' }),
    h('button', { type: 'button', class: 'btn sm', text: 'Discard', onClick: () => { const id = pending.id; pending = null; drop(id); drawNote(); } }));
  document.body.append(note);
}

/** Reads ?shared=<id> once at start, takes the files out of the browser's storage, and shows what is waiting. */
export async function loadShared() {
  const id = new URLSearchParams(location.search).get('shared');
  if (!id) return;
  history.replaceState(null, '', location.pathname + location.hash);
  if (!/^[a-f0-9]{20}$/.test(id)) return;
  try {
    const c = await caches.open(CACHE), m = await c.match(key(id, 'meta'));
    if (!m) return;
    const meta = await m.json(), files = [];
    for (let i = 0; i < meta.files.length; i++) { const r = await c.match(key(id, 'f' + i)); if (r) files.push(new File([await r.blob()], meta.files[i].n, { type: meta.files[i].type })); }
    pending = { id, files };
    drawNote();
  } catch (e) { /* the browser kept nothing: no files to offer */ }
}

/** The waiting files that a drop zone accepts (ok(file) says so). They leave the waiting list; when the list is empty the stored copy goes. */
export function takeShared(ok, multiple) {
  if (!pending) return [];
  let hit = pending.files.filter(ok);
  if (!multiple) hit = hit.slice(0, 1);
  if (!hit.length) return [];
  pending.files = pending.files.filter((f) => !hit.includes(f));
  if (!pending.files.length) { drop(pending.id); pending = null; }
  drawNote();
  return hit;
}
