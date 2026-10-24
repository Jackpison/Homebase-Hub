// Circle Crop: round profile pictures with a see-through background and an optional border.
import { h, field, seg, range, button, dropzone, panel, busy } from '../ui.js';
import { ACCEPT, decode, encode, canvas, outName, results } from '../lib/image.js';
import { cropper } from '../lib/cropper.js';

export function circle(src, r, size, border, color) {
  const c = canvas(size, size), x = c.getContext('2d'), b = border * size / 512;
  x.save(); x.beginPath(); x.arc(size / 2, size / 2, size / 2 - b, 0, Math.PI * 2); x.clip(); x.imageSmoothingQuality = 'high';
  x.drawImage(src, r.x, r.y, r.w, r.h, 0, 0, size, size); x.restore();
  if (b) { x.beginPath(); x.arc(size / 2, size / 2, size / 2 - b / 2, 0, Math.PI * 2); x.lineWidth = b; x.strokeStyle = color; x.stroke(); }
  return c;
}
export default function (root) {
  let file = null, src = null, cr = null;
  const area = h('div', { class: 'preview' }, h('p', { class: 'hint', text: 'Your photo shows here.' })), prev = h('div', { class: 'preview' }), out = h('div');
  const size = seg('Size', [['256', '256 px'], ['512', '512 px'], ['1024', '1024 px']], '512'), border = range('Border', 0, 40, 1, 0, (v) => v ? v + ' px' : 'None', () => show()), color = h('input', { type: 'color', value: '#ffc21a', onInput: () => show() });
  function show() { if (cr) { const p = circle(src, cr.get(), 200, border.value, color.value); p.setAttribute('role', 'img'); p.setAttribute('aria-label', 'Round preview'); prev.replaceChildren(p); } }
  const go = button('Save PNG', { primary: true, icon: 'download' });
  go.addEventListener('click', () => busy(go, async () => { if (cr) results(out, [{ name: outName(file.name, 'png', 'round'), blob: await encode(circle(src, cr.get(), +size.value, border.value, color.value), 'png') }]); }));
  root.append(dropzone({ accept: ACCEPT, label: 'Choose a photo', onFiles: async ([f]) => { file = f; src = await decode(f); cr = cropper(src, { ratio: 1, round: true, onChange: () => show() }); area.replaceChildren(cr.el); out.replaceChildren(); show(); } }),
    h('div', { class: 'cols' }, panel(area), panel(h('h2', { text: 'Preview' }), prev, size.el, border.el, field('Border colour', color), go, out)));
}
