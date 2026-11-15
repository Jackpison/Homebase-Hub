// Image Compressor: shrink photos to a target size, or by quality, and see exactly how much you saved.
import { h, seg, range, input, select, button, dropzone, panel, busy, field } from '../ui.js';
import { ACCEPT, decode, encode, toTarget, outName, results, each, extOf } from '../lib/image.js';

export default function (root) {
  let files = [];
  const mode = seg('Shrink by', [['size', 'Target size'], ['q', 'Quality']], 'size', () => box()), size = input({ type: 'number', min: 1, value: 200, 'aria-label': 'Target size' }), unit = select([['KB', 'KB'], ['MB', 'MB']], 'KB', { 'aria-label': 'Unit' });
  const q = range('Quality', 10, 95, 1, 75, (v) => v + '%'), fmt = select([['same', 'Same as the original (PNG becomes WebP)'], ['jpg', 'JPG'], ['webp', 'WebP'], ['avif', 'AVIF (smallest, slower)']], 'same');
  const b = h('div'), list = h('p', { class: 'hint' }), prog = h('p', { class: 'hint', 'aria-live': 'polite' }), out = h('div');
  function box() { b.replaceChildren(mode.value === 'size' ? h('div', { class: 'row' }, field('Each image at most', size), unit) : q.el); }
  const go = button('Compress', { primary: true, icon: 'compress' });
  go.addEventListener('click', () => busy(go, async () => {
    if (!files.length) return;
    const max = Math.max(1, +size.value || 200) * (unit.value === 'MB' ? 1048576 : 1024);
    results(out, await each(files, prog, async (file) => {
      const e = extOf(file), f = fmt.value !== 'same' ? fmt.value : ['jpg', 'webp', 'avif'].includes(e) ? e : 'webp', c = await decode(file);
      let blob = mode.value === 'size' ? await toTarget(c, f, max) : await encode(c, f, q.value / 100);
      if (blob.size >= file.size && f === e) blob = file;   // never hand back something bigger in the same format
      return { name: outName(file.name, f, blob === file ? '' : 'small'), blob, before: file.size };
    }), 'compressed.zip');
  }));
  box();
  root.append(dropzone({ accept: ACCEPT, multiple: true, label: 'Choose photos', onFiles: (fs) => { files = fs; list.textContent = fs.length + (fs.length === 1 ? ' photo chosen.' : ' photos chosen.'); out.replaceChildren(); } }),
    panel(list, mode.el, b, field('Save as', fmt), go, prog, out));
}
