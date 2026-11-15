// PDF → Images: every page, or a range, as JPG or PNG images.
import { h, field, input, seg, button, dropzone, panel, busy } from '../ui.js';
import { encode, results } from '../lib/image.js';
import { openDoc, renderPage, ranges } from '../lib/pdf.js';

export default function (root) {
  let file = null, doc = null;
  const fmt = seg('Save as', [['jpg', 'JPG'], ['png', 'PNG']], 'jpg'), dpi = seg('Sharpness', [['72', 'Screen (72 dpi)'], ['150', 'Good (150 dpi)'], ['300', 'Print (300 dpi)']], '150');
  const rg = input({ placeholder: 'All pages, or e.g. 1-3, 5', 'aria-label': 'Pages' }), info = h('p', { class: 'hint' }), prog = h('p', { class: 'hint', 'aria-live': 'polite' }), out = h('div');
  const go = button('Make Images', { primary: true, icon: 'image' });
  go.addEventListener('click', () => busy(go, async () => {
    if (!doc) return;
    const idx = rg.value.trim() ? ranges(rg.value, doc.numPages).flatMap(([a, z]) => Array.from({ length: z - a + 1 }, (_, j) => a + j)) : Array.from({ length: doc.numPages }, (_, i) => i);
    const items = [], base = file.name.replace(/\.pdf$/i, '');
    for (const [k, i] of idx.entries()) {
      prog.textContent = 'Page ' + (k + 1) + ' of ' + idx.length + '…';
      const page = await doc.getPage(i + 1), w = page.getViewport({ scale: +dpi.value / 72 }).width, { canvas: c } = await renderPage(doc, i + 1, w);
      items.push({ name: base + '-page-' + (i + 1) + '.' + fmt.value, blob: await encode(c, fmt.value, 0.92) });
    }
    prog.textContent = ''; results(out, items, base + '-images.zip');
  }));
  root.append(dropzone({ accept: '.pdf,application/pdf', label: 'Choose a PDF', onFiles: async ([f]) => { file = f; out.replaceChildren(); doc = await openDoc(f); info.textContent = f.name + ': ' + doc.numPages + (doc.numPages === 1 ? ' page.' : ' pages.'); } }),
    panel(info, fmt.el, dpi.el, field('Pages', rg), go, prog, out));
}
