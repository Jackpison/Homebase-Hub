// Saved presets (1.60): a tool's settings kept on the server under a name, for the logged-in owner only, and in the site backup.
// The server checks every preset (web/hub/core/lib/presets.php): plain values only, pictures only as data:image addresses.
import { h, button, input, select, toast } from '../ui.js';

export const KINDS = { sign: 'Sign PDF: Signatures', 'img-watermark': 'Watermark Images', 'pdf-stamp': 'Watermark and Page Numbers (PDF)', qr: 'QR Code Styles', resize: 'Image Resizer: Sizes', invoice: 'Invoice: Your Business' };
const HUB = () => window.HUB;
let cache = null;
async function admin() { const H = HUB(); if (!H || !H.api) return false; try { await H.ready(); } catch (e) { return false; } return H.isAdmin(); }
export async function list(force = false) {
  if (cache && !force) return cache;
  const j = await HUB().api('presets');
  if (!j.ok) throw new Error(j._status === 401 ? 'Log in to see your presets.' : j.error || 'Your presets could not be loaded.');
  return (cache = j.kinds || {});
}
export async function change(body) {
  const j = await HUB().api('presets', body);
  if (!j.ok) throw new Error(j.error || 'That did not work. Try again.');
  return (cache = j.kinds || {});
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
    const sel = select([['', L.length ? 'Choose a Preset' : 'No Presets Yet'], ...L.map((p) => [p.id, p.name])], '', { 'aria-label': 'Saved presets', disabled: !L.length });
    sel.addEventListener('change', async () => {
      const p = L.find((x) => x.id === sel.value); if (!p) return;
      try { await set(p.data); toast('Preset "' + p.name + '" used'); } catch (e) { toast('This preset could not be used.', true); }
    });
    box.replaceChildren(sel, button('Save as Preset', { small: true, icon: 'plus', onClick: ask }));
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
    if (!kinds.length) { body.replaceChildren(h('p', { class: 'hint', text: 'No presets yet. Tools with a Save as Preset button keep their settings here: Sign PDF, both watermark tools, the QR Code Generator, the Image Resizer and the Invoice Generator.' })); return; }
    body.replaceChildren(...kinds.map((k) => h('div', { class: 'pgroup' }, h('h3', { text: KINDS[k] }), h('ul', { class: 'olist' }, all[k].map((p) => {
      const name = h('span', { class: 'on', text: p.name });
      const li = h('li', {}, name,
        button('', { icon: 'edit', small: true, ghost: true, aria: 'Rename ' + p.name, onClick: () => {
          const inp = input({ value: p.name, 'aria-label': 'New name for ' + p.name, maxlength: 60 });
          const save = async () => { try { await change({ op: 'rename', kind: k, id: p.id, name: inp.value }); toast('Renamed'); draw(); } catch (e) { toast(e.message, true); } };
          inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') draw(); });
          li.replaceChildren(inp, button('Save', { small: true, primary: true, onClick: save }), button('Cancel', { small: true, ghost: true, onClick: () => draw() })); inp.focus(); inp.select();
        } }),
        button('', { icon: 'trash', small: true, ghost: true, aria: 'Delete ' + p.name, onClick: async () => { if (!confirm('Delete the preset "' + p.name + '"?')) return; try { await change({ op: 'delete', kind: k, id: p.id }); toast('Deleted'); draw(); } catch (e) { toast(e.message, true); } } }));
      return li;
    })))));
  }
  draw(true);
  return h('section', { class: 'panel' }, h('h2', { text: 'Presets' }), h('p', { class: 'hint', text: 'Saved on your server while you are logged in, and included in the site backup.' }), body);
}
