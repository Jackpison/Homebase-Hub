// Organize PDF Pages: reorder, rotate, delete and duplicate pages with thumbnails; combine pages from several PDFs.
import { h, button, dropzone, panel, busy, toast } from '../ui.js';
import { results } from '../lib/image.js';
import { loadLib, lib, pdfBlob, openDoc, renderPage } from '../lib/pdf.js';

export default function (root) {
  const pages = [];   // {src: index into sources, i: page index, rot: extra degrees, thumb: canvas}
  const sources = [];
  const grid = h('div', { class: 'thumbs org' }), out = h('div'), info = h('p', { class: 'hint', 'aria-live': 'polite' });
  function draw() {
    info.textContent = pages.length + (pages.length === 1 ? ' page' : ' pages') + ' from ' + sources.length + (sources.length === 1 ? ' PDF.' : ' PDFs.');
    grid.replaceChildren(...pages.map((p, k) => {
      const c = p.thumb; c.style.transform = 'rotate(' + p.rot + 'deg)';
      const btn = (lbl, sym, fn, dis) => h('button', { type: 'button', class: 'ib', 'aria-label': lbl + ', page ' + (k + 1), title: lbl, disabled: !!dis, onClick: () => { fn(); draw(); } }, sym);
      return h('div', { class: 'thumb' }, h('div', { class: 'tw' }, c), h('span', { text: (k + 1) + ' · ' + sources[p.src].name.replace(/\.pdf$/i, '') + ' p' + (p.i + 1) }),
        h('div', { class: 'tb' }, btn('Move left', '←', () => { [pages[k - 1], pages[k]] = [pages[k], pages[k - 1]]; }, k === 0), btn('Rotate', '↻', () => { p.rot = (p.rot + 90) % 360; }),
          btn('Duplicate', '⧉', () => { const cc = document.createElement('canvas'); cc.width = c.width; cc.height = c.height; cc.getContext('2d').drawImage(c, 0, 0); cc.setAttribute('aria-hidden', 'true'); pages.splice(k + 1, 0, { ...p, thumb: cc }); }),
          btn('Delete', '×', () => { pages.splice(k, 1); }), btn('Move right', '→', () => { [pages[k + 1], pages[k]] = [pages[k], pages[k + 1]]; }, k === pages.length - 1)));
    }));
  }
  const go = button('Save the New PDF', { primary: true, icon: 'download' });
  go.addEventListener('click', () => busy(go, async () => {
    if (!pages.length) { toast('Add a PDF first.', true); return; }
    const { PDFDocument, degrees } = await lib(), outDoc = await PDFDocument.create(), libs = [];
    for (const s of sources) libs.push(await loadLib(s.file));
    for (const p of pages) { const [cp] = await outDoc.copyPages(libs[p.src], [p.i]); cp.setRotation(degrees((cp.getRotation().angle + p.rot) % 360)); outDoc.addPage(cp); }
    results(out, [{ name: 'organized.pdf', blob: pdfBlob(await outDoc.save()) }]);
  }));
  root.append(dropzone({ accept: '.pdf,application/pdf', multiple: true, label: 'Add PDFs', hint: 'Add more PDFs at any time: their pages join the end.', onFiles: async (fs) => {
    for (const f of fs) { const d = await openDoc(f), si = sources.push({ file: f, name: f.name }) - 1; for (let i = 1; i <= d.numPages; i++) { const { canvas: c } = await renderPage(d, i, 130); c.setAttribute('aria-hidden', 'true'); pages.push({ src: si, i: i - 1, rot: 0, thumb: c }); } }
    draw(); out.replaceChildren(); } }), panel(info, grid, go, out));
}
