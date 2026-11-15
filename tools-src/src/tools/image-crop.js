// Quick Crop: crop freely, to a common shape, or to an exact pixel size.
import { h, field, input, seg, select, button, dropzone, panel, busy } from '../ui.js';
import { ACCEPT, decode, encode, sameFormat, outName, results, FORMATS } from '../lib/image.js';
import { cropper, cut } from '../lib/cropper.js';

const RATIOS = [['free', 'Free'], ['1', '1:1'], ['1.3333', '4:3'], ['1.5', '3:2'], ['1.7778', '16:9'], ['0.5625', '9:16'], ['px', 'Exact pixels']];
export default function (root) {
  let file = null, src = null, cr = null;
  const area = h('div', { class: 'preview' }, h('p', { class: 'hint', text: 'Your photo shows here.' })), info = h('p', { class: 'hint', 'aria-live': 'polite' }), out = h('div');
  const pw = input({ type: 'number', min: 1, value: 1080, 'aria-label': 'Width in pixels' }), ph = input({ type: 'number', min: 1, value: 1080, 'aria-label': 'Height in pixels' }), pxBox = h('div');
  const fmt = select([['same', 'Same as the original'], ...FORMATS], 'same');
  const shape = seg('Shape', RATIOS, 'free', (v) => apply(v));
  function apply(v) {
    pxBox.replaceChildren(v === 'px' ? h('div', { class: 'row' }, field('Width', pw), field('Height', ph)) : '');
    if (cr) cr.setRatio(v === 'free' ? null : v === 'px' ? (+pw.value || 1) / (+ph.value || 1) : +v);
  }
  for (const el of [pw, ph]) el.addEventListener('input', () => shape.value === 'px' && cr && cr.setRatio((+pw.value || 1) / (+ph.value || 1)));
  const go = button('Crop and Save', { primary: true, icon: 'crop' });
  go.addEventListener('click', () => busy(go, async () => {
    if (!cr) return; const r = cr.get(), f = fmt.value === 'same' ? sameFormat(file) : fmt.value;
    const c = shape.value === 'px' ? cut(src, r, Math.max(1, +pw.value), Math.max(1, +ph.value)) : cut(src, r);
    results(out, [{ name: outName(file.name, f, 'cropped'), blob: await encode(c, f, 0.92), before: file.size }]);
  }));
  root.append(dropzone({ accept: ACCEPT, label: 'Choose a photo', onFiles: async ([f]) => { file = f; src = await decode(f); cr = cropper(src, { onChange: (r) => { info.textContent = 'Crop: ' + r.w + ' × ' + r.h + ' px'; } }); area.replaceChildren(cr.el); apply(shape.value); out.replaceChildren(); } }),
    h('div', { class: 'cols' }, panel(shape.el, pxBox, field('Save as', fmt), go, out), panel(area, info)));
}
