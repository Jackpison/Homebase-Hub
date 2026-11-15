// Split PDF: single pages, every N pages, your own ranges, or only the pages you pick.
import { h, field, input, seg, button, dropzone, panel, busy, note, toast } from '../ui.js';
import { results } from '../lib/image.js';
import { loadLib, lib, pdfBlob, pdfName, ranges, openDoc, renderPage } from '../lib/pdf.js';

export default function (root) {
  let file = null, doc = null, count = 0; const picked = new Set();
  const mode = seg('Split into', [['each', 'Single pages'], ['n', 'Every N pages'], ['ranges', 'Your ranges'], ['pick', 'Pages you pick']], 'each', () => box());
  const every = input({ type: 'number', min: 1, value: 2, 'aria-label': 'Pages per file' }), rg = input({ placeholder: 'e.g. 1-3, 4-6, 7-', 'aria-label': 'Ranges' });
  const b = h('div'), thumbs = h('div', { class: 'thumbs' }), info = h('p', { class: 'hint' }), out = h('div');
  function box() {
    b.replaceChildren(...(mode.value === 'n' ? [field('Pages in each file', every)] : mode.value === 'ranges' ? [field('Ranges, one file each', rg)] : mode.value === 'pick' ? [note('Click the pages to keep. They go into one new PDF.'), thumbs] : []));
    if (mode.value === 'pick' && doc && !thumbs.childElementCount) drawThumbs();
  }
  async function drawThumbs() {
    for (let i = 1; i <= count; i++) {
      const { canvas: c } = await renderPage(doc, i, 120); c.setAttribute('aria-hidden', 'true');
      const t = h('button', { type: 'button', class: 'thumb', 'aria-pressed': 'false', 'aria-label': 'Page ' + i, onClick: () => { const on = !picked.has(i - 1); on ? picked.add(i - 1) : picked.delete(i - 1); t.setAttribute('aria-pressed', String(on)); } }, c, h('span', { text: String(i) }));
      thumbs.append(t);
    }
  }
  const go = button('Split', { primary: true, icon: 'scissors' });
  go.addEventListener('click', () => busy(go, async () => {
    if (!file) return;
    const src = await loadLib(file), { PDFDocument } = await lib();
    let groups;
    if (mode.value === 'each') groups = Array.from({ length: count }, (_, i) => [i]);
    else if (mode.value === 'n') { const k = Math.max(1, +every.value || 1); groups = []; for (let i = 0; i < count; i += k) groups.push(Array.from({ length: Math.min(k, count - i) }, (_, j) => i + j)); }
    else if (mode.value === 'ranges') groups = ranges(rg.value, count).map(([a, z]) => Array.from({ length: z - a + 1 }, (_, j) => a + j));
    else { if (!picked.size) { toast('Pick at least one page.', true); return; } groups = [[...picked].sort((a, c) => a - c)]; }
    const items = [];
    for (const g of groups) {
      const d = await PDFDocument.create(); for (const p of await d.copyPages(src, g)) d.addPage(p);
      const tag = mode.value === 'pick' ? 'pages' : g.length === 1 ? 'page-' + (g[0] + 1) : 'pages-' + (g[0] + 1) + '-' + (g[g.length - 1] + 1);
      items.push({ name: pdfName(file.name, tag), blob: pdfBlob(await d.save()) });
    }
    results(out, items, pdfName(file.name, 'split').replace(/\.pdf$/, '.zip'));
  }));
  box();
  root.append(dropzone({ accept: '.pdf,application/pdf', label: 'Choose a PDF', onFiles: async ([f]) => { file = f; picked.clear(); thumbs.replaceChildren(); out.replaceChildren(); doc = await openDoc(f); count = doc.numPages; info.textContent = f.name + ': ' + count + (count === 1 ? ' page.' : ' pages.'); box(); } }),
    panel(info, mode.el, b, go, out));
}
