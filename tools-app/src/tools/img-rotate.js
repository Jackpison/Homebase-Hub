// Rotate and Flip: quarter turns, mirroring and straightening with an automatic crop, for one photo or many.
import { h, button, check, range, dropzone, panel, busy, note } from '../ui.js';
import { ACCEPT, decode, encode, canvas, sameFormat, outName, results, each, preview } from '../lib/image.js';

export function transform(src, { rot = 0, fh = false, fv = false, ang = 0, crop = true }) {
  const r90 = rot % 180 !== 0, w = r90 ? src.height : src.width, ht = r90 ? src.width : src.height;
  let c = canvas(w, ht), x = c.getContext('2d');
  x.translate(w / 2, ht / 2); x.rotate(rot * Math.PI / 180); x.scale(fh ? -1 : 1, fv ? -1 : 1); x.drawImage(src, -src.width / 2, -src.height / 2);
  if (!ang) return c;
  const t = Math.abs(ang) * Math.PI / 180, co = Math.cos(t), si = Math.sin(t);
  const s = crop ? Math.min(w / (w * co + ht * si), ht / (w * si + ht * co)) : 1;
  const W = crop ? w * s : w * co + ht * si, H = crop ? ht * s : w * si + ht * co;
  const o = canvas(W, H), y = o.getContext('2d'); y.imageSmoothingQuality = 'high';
  y.translate(o.width / 2, o.height / 2); y.rotate(ang * Math.PI / 180); y.drawImage(c, -w / 2, -ht / 2);
  return o;
}

export default function (root) {
  let files = [], first = null;
  const S = { rot: 0, fh: false, fv: false };
  const ang = range('Straighten', -45, 45, 0.5, 0, (v) => v + '°', () => draw());
  const crop = check('Crop off the empty corners after straightening', true, () => draw());
  const view = h('div', { class: 'preview' }, h('p', { class: 'hint', text: 'Your photo shows here.' })), info = h('p', { class: 'hint' }), prog = h('p', { class: 'hint', 'aria-live': 'polite' }), out = h('div');
  const opts = () => ({ ...S, ang: ang.value, crop: crop.value });
  function draw() { if (first) view.replaceChildren(preview(transform(first, opts()), 700)); }
  const turn = (label, icon, fn) => button(label, { icon, onClick: () => { fn(); draw(); } });
  const go = button('Save', { primary: true, icon: 'download' });
  go.addEventListener('click', () => busy(go, async () => {
    if (!files.length) return;
    results(out, await each(files, prog, async (f) => { const fmt = sameFormat(f); return { name: outName(f.name, fmt, 'rotated'), blob: await encode(transform(await decode(f), opts()), fmt, 0.92), before: f.size }; }), 'rotated.zip');
  }));
  root.append(dropzone({ accept: ACCEPT, multiple: true, label: 'Choose photos', onFiles: async (fs) => { files = fs; out.replaceChildren(); info.textContent = fs.length + (fs.length === 1 ? ' photo' : ' photos: the preview shows the first, and every photo gets the same changes.'); first = await decode(fs[0]); draw(); } }),
    h('div', { class: 'cols' }, panel(h('div', { class: 'row' }, turn('Left', 'rotate', () => { S.rot = (S.rot + 270) % 360; }), turn('Right', 'rotate', () => { S.rot = (S.rot + 90) % 360; }),
      turn('Flip Across', 'convert', () => { S.fh = !S.fh; }), turn('Flip Up and Down', 'convert', () => { S.fv = !S.fv; })),
      ang.el, crop.el, h('div', { class: 'row' }, go, button('Reset', { onClick: () => { Object.assign(S, { rot: 0, fh: false, fv: false }); ang.value = 0; draw(); } })), prog, out),
    panel(view, info, note('Photos keep their format. The image is re-saved at high quality.'))));
}
