// Blur and Redact: hide faces, number plates and ID numbers with blur, pixelation or solid boxes.
import { h, seg, range, button, dropzone, panel, busy, field, note } from '../ui.js';
import { ACCEPT, decode, encode, canvas, sameFormat, outName, results, scaled } from '../lib/image.js';

/** Hides each area (in the image's own pixels). */
export function redact(src, areas, { mode = 'pixel', strength = 50, color = '#000000' }) {
  const c = canvas(src.width, src.height), x = c.getContext('2d'); x.drawImage(src, 0, 0);
  for (const a of areas) {
    const r = { x: Math.max(0, Math.round(a.x)), y: Math.max(0, Math.round(a.y)), w: Math.max(1, Math.round(a.w)), h: Math.max(1, Math.round(a.h)) };
    if (mode === 'box') { x.fillStyle = color; x.fillRect(r.x, r.y, r.w, r.h); continue; }
    const f = mode === 'pixel' ? Math.max(2, Math.round(Math.min(r.w, r.h) * strength / 400)) : Math.max(2, Math.round(Math.min(r.w, r.h) * strength / 900));
    const t = canvas(Math.max(1, r.w / f), Math.max(1, r.h / f)), tx = t.getContext('2d');
    tx.imageSmoothingEnabled = mode !== 'pixel'; tx.drawImage(c, r.x, r.y, r.w, r.h, 0, 0, t.width, t.height);
    let s = t; if (mode === 'blur') for (let i = 0; i < 2; i++) s = scaled(scaled(s, 0.5), 2);
    x.save(); x.imageSmoothingEnabled = mode !== 'pixel'; x.drawImage(s, 0, 0, s.width, s.height, r.x, r.y, r.w, r.h); x.restore();
  }
  return c;
}
export default function (root) {
  let file = null, src = null, small = null, areas = [];
  const mode = seg('How', [['pixel', 'Pixelate'], ['blur', 'Blur'], ['box', 'Solid box']], 'pixel', () => draw()), strength = range('Strength', 10, 100, 1, 60, (v) => v + '%', () => draw()), color = h('input', { type: 'color', value: '#000000', onInput: () => draw() });
  const wrap = h('div', { class: 'crop redact' }), view = h('div', { class: 'preview' }, h('p', { class: 'hint', text: 'Your photo shows here. Drag on it to mark what to hide.' })), list = h('p', { class: 'hint', 'aria-live': 'polite' }), out = h('div');
  const opts = () => ({ mode: mode.value, strength: strength.value, color: color.value });
  function draw() {
    if (!src) return; const f = small.width / src.width;
    const pv = redact(small, areas.map((a) => ({ x: a.x * f, y: a.y * f, w: a.w * f, h: a.h * f })), opts()); pv.setAttribute('role', 'img'); pv.setAttribute('aria-label', 'Preview');
    wrap.replaceChildren(pv, ...areas.map((a, i) => { const b = h('button', { type: 'button', class: 'rbox', 'aria-label': 'Remove area ' + (i + 1), title: 'Remove', onClick: () => { areas.splice(i, 1); draw(); } }); Object.assign(b.style, { left: a.x / src.width * 100 + '%', top: a.y / src.height * 100 + '%', width: a.w / src.width * 100 + '%', height: a.h / src.height * 100 + '%' }); return b; }));
    list.textContent = areas.length ? areas.length + (areas.length === 1 ? ' area marked. Click an area to remove it.' : ' areas marked. Click an area to remove it.') : 'No areas yet.';
  }
  let st = null;
  wrap.addEventListener('pointerdown', (e) => { if (e.target.classList.contains('rbox') || !src) return; const r = wrap.getBoundingClientRect(); st = { x: (e.clientX - r.left) / r.width * src.width, y: (e.clientY - r.top) / r.height * src.height, r }; wrap.setPointerCapture(e.pointerId); });
  wrap.addEventListener('pointerup', (e) => { if (!st) return; const x2 = (e.clientX - st.r.left) / st.r.width * src.width, y2 = (e.clientY - st.r.top) / st.r.height * src.height; const a = { x: Math.min(st.x, x2), y: Math.min(st.y, y2), w: Math.abs(x2 - st.x), h: Math.abs(y2 - st.y) }; st = null; if (a.w > 4 && a.h > 4) { areas.push(a); draw(); } });
  const add = button('Add an Area in the Middle', { icon: 'plus', onClick: () => { if (src) { areas.push({ x: src.width * 0.35, y: src.height * 0.4, w: src.width * 0.3, h: src.height * 0.2 }); draw(); } } });
  const go = button('Save', { primary: true, icon: 'download' });
  go.addEventListener('click', () => busy(go, async () => { if (!src) return; const f = sameFormat(file); results(out, [{ name: outName(file.name, f, 'redacted'), blob: await encode(redact(src, areas, opts()), f, 0.92), before: file.size }]); }));
  root.append(dropzone({ accept: ACCEPT, label: 'Choose a photo', onFiles: async ([f]) => { file = f; src = await decode(f); small = src.width > 900 ? scaled(src, 900 / src.width) : src; areas = []; view.replaceChildren(wrap); out.replaceChildren(); draw(); } }),
    h('div', { class: 'cols' }, panel(view, list), panel(mode.el, strength.el, field('Box colour', color), add, button('Clear All Areas', { onClick: () => { areas = []; draw(); } }), go, out,
      note('For ID numbers and anything that must stay secret, use a solid box: blur and pixelation can sometimes be partly undone.'))));
}
