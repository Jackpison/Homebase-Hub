// Merge PDF: several PDFs into one, in any order, without changing the pages.
import { h, button, dropzone, panel, busy, toast, bytes } from '../ui.js';
import { results } from '../lib/image.js';
import { loadLib, lib, pdfBlob } from '../lib/pdf.js';

export default function (root) {
  let files = [];
  const list = h('ul', { class: 'flist' }), prog = h('p', { class: 'hint', 'aria-live': 'polite' }), out = h('div');
  function draw() {
    list.replaceChildren(...files.map((f, i) => h('li', {}, h('span', { text: (i + 1) + '. ' + f.name }), h('small', { text: bytes(f.size) }),
      h('button', { type: 'button', class: 'ib', 'aria-label': 'Move ' + f.name + ' up', disabled: i === 0, onClick: () => { [files[i - 1], files[i]] = [files[i], files[i - 1]]; draw(); } }, '↑'),
      h('button', { type: 'button', class: 'ib', 'aria-label': 'Move ' + f.name + ' down', disabled: i === files.length - 1, onClick: () => { [files[i + 1], files[i]] = [files[i], files[i + 1]]; draw(); } }, '↓'),
      h('button', { type: 'button', class: 'ib', 'aria-label': 'Remove ' + f.name, onClick: () => { files.splice(i, 1); draw(); } }, '×'))));
  }
  const go = button('Merge', { primary: true, icon: 'merge' });
  go.addEventListener('click', () => busy(go, async () => {
    if (files.length < 2) { toast('Add at least two PDFs.', true); return; }
    const { PDFDocument } = await lib(), outDoc = await PDFDocument.create(); let pages = 0;
    for (const [i, f] of files.entries()) { prog.textContent = 'Adding ' + (i + 1) + ' of ' + files.length + '…'; const d = await loadLib(f); for (const p of await outDoc.copyPages(d, d.getPageIndices())) { outDoc.addPage(p); pages++; } }
    prog.textContent = ''; results(out, [{ name: 'merged.pdf', blob: pdfBlob(await outDoc.save()) }]);
    out.prepend(h('p', { class: 'hint', text: pages + ' pages from ' + files.length + ' PDFs.' }));
  }));
  root.append(dropzone({ accept: '.pdf,application/pdf', multiple: true, label: 'Add PDFs', hint: 'Drop several at once, then put them in order.', onFiles: (fs) => { files.push(...fs); draw(); out.replaceChildren(); } }), panel(list, go, prog, out));
}
