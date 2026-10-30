// Saved presets (1.60): a tool's settings kept on the server under a name, for the logged-in owner only, and in the site backup.
// The server checks every preset (web/hub/core/lib/presets.php): plain values only, pictures only as data:image addresses.
import { h, button, input, select, toast } from '../ui.js';

export const KINDS = { sign: 'Sign PDF: Signatures', 'img-watermark': 'Watermark Images', 'pdf-stamp': 'Watermark and Page Numbers (PDF)', qr: 'QR Code Styles', resize: 'Image Resizer: Sizes', invoice: 'Invoice: Your Business' };
const HUB = () => window.HUB;
const SITE = () => window.HubSite;
// When an encryption passphrase is set (1.61.0), presets are locked in this browser with the site key before they are sent: the server holds
// only "enc1:" text. cache = every preset as it reads here (a locked one that is not opened yet is { locked: true }); raw = what the server holds.
let cache = null, raw = null;
async function admin() { const H = HUB(); if (!H || !H.api) return false; try { await H.ready(); } catch (e) { return false; } return H.isAdmin(); }
const lockedStub = (p) => ({ id: p.id, t: p.t, name: 'Locked preset', data: null, locked: true });
async function openOne(p) { try { return { id: p.id, t: p.t, ...(await SITE().openJson(p.enc)) }; } catch (e) { return lockedStub(p); } }
export async function list(force = false) {
  if (cache && !force) return cache;
  const j = await HUB().api('presets');
  if (!j.ok) throw new Error(j._status === 401 ? 'Log in to see your presets.' : j.error || 'Your presets could not be loaded.');
  raw = j;
  let can = false;
  if (j.locked && SITE()) { try { await SITE().key({ ask: false }); can = true; } catch (e) { can = false; } }   // remembered on this device, or already unlocked: no question
  const out = {};
  for (const [k, arr] of Object.entries(j.kinds || {})) out[k] = await Promise.all(arr.map((p) => (p.enc ? (can ? openOne(p) : Promise.resolve(lockedStub(p))) : p)));
  return (cache = out);
}
/** Are some presets locked and not opened yet? (The preset row then offers Unlock.) */
export function hasLocked() { return !!cache && Object.values(cache).some((l) => l.some((p) => p.locked)); }
/** Asks for the passphrase (once) and opens the locked presets. */
export async function unlock() {
  if (!SITE()) throw new Error('Your key is not available here.');
  try { await SITE().key(); } catch (e) { if (e && e.code === 'cancel') throw new Error('Presets stay locked until you type your passphrase.'); throw new Error(e && e.code === 'nopass' ? 'Set an encryption passphrase first (Settings, Security, Encryption).' : (e && e.message) || 'Could not unlock.'); }
  return list(true);
}
async function send(body) {
  const j = await HUB().api('presets', body);
  if (!j.ok) throw new Error(j.error || 'That did not work. Try again.');
  return j;
}
export async function change(body) {
  await list();
  if (!raw.pp) { await send(body); return list(true); }   // no passphrase: presets are plain, as in 1.60
  const unlocked = await unlock().catch((e) => { throw e; });
  const S = SITE(), kid = S.kid();
  // everything that is still readable is locked first, together, so no readable preset is left next to locked ones
  const plain = [];
  for (const [k, arr] of Object.entries(raw.kinds || {})) for (const p of arr) if (!p.enc) plain.push({ kind: k, id: p.id, enc: await S.sealJson({ name: p.name, data: p.data }) });
  if (plain.length) { await send({ op: 'lock_all', items: plain, kid }); await list(true); }
  const L = (unlocked && cache[body.kind]) || [];
  if (body.op === 'delete') { await send(body); return list(true); }
  if (body.op === 'add') {
    const same = (cache[body.kind] || []).find((p) => !p.locked && p.name.toLowerCase() === String(body.name).trim().toLowerCase());
    await send({ op: 'put', kind: body.kind, id: same && same.id, enc: await S.sealJson({ name: String(body.name).trim().slice(0, 60), data: body.data }), kid });
    return list(true);
  }
  if (body.op === 'rename') {
    const p = L.find((x) => x.id === body.id);
    if (!p || p.locked) throw new Error('That preset is locked: unlock your presets first.');
    await send({ op: 'put', kind: body.kind, id: p.id, enc: await S.sealJson({ name: String(body.name).trim().slice(0, 60), data: p.data }), kid });
    return list(true);
  }
  throw new Error('Unknown action.');
}
/** A picture kept in a preset, as an Image (only data:image addresses are used). */
export function picture(url) {
  return new Promise((res, rej) => { if (!/^data:image\/(png|jpeg|webp);base64,/.test(url || '')) return rej(new Error('No picture.')); const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
}
/** get/set for a set of controls: { name: control }. A control is an input or select, or a check(), range() or seg() from ui.js. */
export function controls(map) {
  const kind = (c) => (c.box ? 'check' : c.input && 'value' in c ? 'range' : c.el && 'value' in c ? 'seg' : 'el');
  return {
    get: () => Object.fromEntries(Object.entries(map).map(([k, c]) => [k, c.value])),
    set: (v) => {
      for (const [k, c] of Object.entries(map)) {
        if (!(k in v) || v[k] == null) continue;
        const t = kind(c);
        if (t === 'check') { c.box.checked = !!v[k]; c.box.dispatchEvent(new Event('change')); }
        else if (t === 'range') { c.value = v[k]; c.input.dispatchEvent(new Event('input')); }
        else if (t === 'seg') c.value = v[k];
        else { c.value = String(v[k]); c.dispatchEvent(new Event('input')); c.dispatchEvent(new Event('change')); }
      }
    },
  };
}

/** The preset row of a tool: choose a saved preset, or save the current settings as a new one. get() may return a promise. */
export function presetBar(kind, { get, set }) {
  const box = h('div', { class: 'pbar', role: 'group', 'aria-label': 'Presets' });
  async function draw() {
    if (!(await admin())) {
      box.replaceChildren(h('span', { class: 'hint', text: 'Log in to save these settings as a preset.' }), button('Log In', { small: true, ghost: true, onClick: () => HUB().login().then(draw, () => {}) }));
      return;
    }
    let L = [];
    try { L = (await list())[kind] || []; } catch (e) { box.replaceChildren(h('span', { class: 'hint', text: e.message })); return; }
    const sel = select([['', L.length ? 'Choose a Preset' : 'No Presets Yet'], ...L.map((p) => [p.id, p.locked ? 'Locked preset' : p.name])], '', { keep: true, 'aria-label': 'Saved presets', disabled: !L.length });
    sel.addEventListener('change', async () => {
      const p = L.find((x) => x.id === sel.value); if (!p) return;
      if (p.locked) { sel.value = ''; return toast('Unlock your presets first.', true); }
      try { await set(p.data); toast('Preset "' + p.name + '" used'); } catch (e) { toast('This preset could not be used.', true); }
    });
    box.replaceChildren(sel, button('Save as Preset', { small: true, icon: 'plus', onClick: ask }),
      ...(L.some((p) => p.locked) ? [button('Unlock Presets', { small: true, ghost: true, onClick: async () => { try { await unlock(); draw(); } catch (e) { toast(e.message, true); } } })] : []));
  }
  function ask() {
    const name = input({ placeholder: 'Name, like My Signature', 'aria-label': 'Preset name', maxlength: 60 });
    const ok = button('Save', { small: true, primary: true, onClick: async () => {
      if (!name.value.trim()) { name.focus(); return toast('Give the preset a name.', true); }
      ok.disabled = true;
      try { const data = await get(); if (!data) throw new Error('Set something up first.'); await change({ op: 'add', kind, name: name.value.trim(), data }); toast('Preset "' + name.value.trim() + '" saved'); draw(); }
      catch (e) { ok.disabled = false; toast(e.message, true); }
    } });
    name.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok.click(); if (e.key === 'Escape') draw(); });
    box.replaceChildren(name, ok, button('Cancel', { small: true, ghost: true, onClick: draw }));
    name.focus();
  }
  draw();
  return box;
}

/** Tools Settings > Presets: every saved preset, to rename or delete. */
export function presetsPanel() {
  const body = h('div', { 'aria-live': 'polite' });
  async function draw(force) {
    if (!(await admin())) { body.replaceChildren(h('p', { class: 'hint', text: 'Log in to see your saved presets.' }), button('Log In', { small: true, onClick: () => HUB().login().then(() => draw(true), () => {}) })); return; }
    let all; try { all = await list(force); } catch (e) { body.replaceChildren(h('p', { class: 'note bad', text: e.message })); return; }
    const kinds = Object.keys(KINDS).filter((k) => (all[k] || []).length);
    const lockedNow = kinds.some((k) => all[k].some((p) => p.locked));
    if (!kinds.length) { body.replaceChildren(h('p', { class: 'hint', text: 'No presets yet. Tools with a Save as Preset button keep their settings here: Sign PDF, both watermark tools, the QR Code Generator, the Image Resizer and the Invoice Generator.' })); return; }
    body.replaceChildren(...kinds.map((k) => h('div', { class: 'pgroup' }, h('h3', { text: KINDS[k] }), h('ul', { class: 'olist' }, all[k].map((p) => {
      const name = h('span', { class: 'on', text: p.name });
      const li = h('li', {}, name,
        button('', { icon: 'edit', small: true, ghost: true, aria: 'Rename ' + p.name, disabled: !!p.locked, onClick: () => {
          const inp = input({ value: p.name, 'aria-label': 'New name for ' + p.name, maxlength: 60 });
          const save = async () => { try { await change({ op: 'rename', kind: k, id: p.id, name: inp.value }); toast('Renamed'); draw(); } catch (e) { toast(e.message, true); } };
          inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') draw(); });
          li.replaceChildren(inp, button('Save', { small: true, primary: true, onClick: save }), button('Cancel', { small: true, ghost: true, onClick: () => draw() })); inp.focus(); inp.select();
        } }),
        button('', { icon: 'trash', small: true, ghost: true, aria: 'Delete ' + p.name, onClick: async () => { if (!confirm('Delete the preset "' + p.name + '"?')) return; try { await change({ op: 'delete', kind: k, id: p.id }); toast('Deleted'); draw(); } catch (e) { toast(e.message, true); } } }));
      return li;
    })))), ...(lockedNow ? [h('p', { class: 'hint', text: 'Some presets are locked with your passphrase.' }), button('Unlock Presets', { small: true, onClick: async () => { try { await unlock(); draw(); } catch (e) { toast(e.message, true); } } })] : []));
  }
  draw(true);
  return h('section', { class: 'panel' }, h('h2', { text: 'Presets' }), h('p', { class: 'hint', text: 'Saved on your server while you are logged in, locked with your encryption passphrase when you have one, and included in the site backup.' }), body);
}
