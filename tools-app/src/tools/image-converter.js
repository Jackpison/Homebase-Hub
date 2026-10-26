// Image Converter: HEIC, PNG, WebP, TIFF, BMP, GIF or AVIF to JPG, PNG, WebP or AVIF, one or many.
import { h, seg, range, button, dropzone, panel, busy, field } from '../ui.js';
import { ACCEPT, FORMATS, decode, encode, outName, results, each } from '../lib/image.js';

export default function (root) {
  let files = [];
  const fmt = seg('Convert to', FORMATS, 'jpg', () => q.input.disabled = fmt.value === 'png'), q = range('Quality', 10, 100, 1, 90, (v) => v + '%');
  const bg = h('input', { type: 'color', value: '#ffffff' }), list = h('p', { class: 'hint' }), prog = h('p', { class: 'hint', 'aria-live': 'polite' }), out = h('div');
  const go = button('Convert', { primary: true, icon: 'convert' });
  go.addEventListener('click', () => busy(go, async () => {
    if (!files.length) return; const f = fmt.value;
    results(out, await each(files, prog, async (file) => ({ name: outName(file.name, f), blob: await encode(await decode(file), f, q.value / 100, bg.value), before: file.size })), 'converted.zip');
  }));
  root.append(dropzone({ accept: ACCEPT, multiple: true, label: 'Choose images', hint: 'HEIC, PNG, JPG, WebP, TIFF, BMP, GIF or AVIF. Drop many at once.', onFiles: (fs) => { files = fs; list.textContent = fs.length + (fs.length === 1 ? ' image chosen.' : ' images chosen.'); out.replaceChildren(); } }),
    panel(list, fmt.el, q.el, field('Background for JPG (where the image is see-through)', bg), go, prog, out));
}
