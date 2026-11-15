// PDF Compressor: smaller PDFs for email and uploads, with a clear before and after.
import { h, seg, button, dropzone, panel, busy, note } from '../ui.js';
import { encode, results } from '../lib/image.js';
import { loadLib, lib, pdfBlob, pdfName, openDoc, renderPage } from '../lib/pdf.js';

const LEVELS = { light: null, strong: [150, 0.7], max: [100, 0.5] };
export async function compress(file, level, say = () => {}) {
  if (level === 'light') { const d = await loadLib(file); return d.save({ useObjectStreams: true }); }
  const [dpi, q] = LEVELS[level], doc = await openDoc(file), { PDFDocument } = await lib(), out = await PDFDocument.create();
  for (let i = 1; i <= doc.numPages; i++) {
    say('Page ' + i + ' of ' + doc.numPages + '…');
    const p = await doc.getPage(i), v = p.getViewport({ scale: 1 }), { canvas: c } = await renderPage(doc, i, v.width * dpi / 72);
    const img = await out.embedJpg(new Uint8Array(await (await encode(c, 'jpg', q)).arrayBuffer()));
    out.addPage([v.width, v.height]).drawImage(img, { x: 0, y: 0, width: v.width, height: v.height });
  }
  say(''); return out.save();
}
export default function (root) {
  let files = [];
  const level = seg('How much', [['light', 'Light (keeps the text)'], ['strong', 'Strong (pages become images, 150 dpi)'], ['max', 'Smallest (pages become images, 100 dpi)']], 'strong');
  const info = h('p', { class: 'hint' }), prog = h('p', { class: 'hint', 'aria-live': 'polite' }), out = h('div');
  const go = button('Compress', { primary: true, icon: 'compress' });
  go.addEventListener('click', () => busy(go, async () => {
    if (!files.length) return; const items = [], same = [];
    for (const f of files) { const b = await compress(f, level.value, (m) => { prog.textContent = f.name + ': ' + m; }); if (b.length >= f.size) { same.push(f.name); items.push({ name: f.name, blob: f, before: f.size }); } else items.push({ name: pdfName(f.name, 'small'), blob: pdfBlob(b), before: f.size }); }
    prog.textContent = ''; results(out, items, 'compressed-pdfs.zip');
    if (same.length) out.prepend(note(same.join(', ') + (same.length === 1 ? ' is' : ' are') + ' already as small as this setting can make ' + (same.length === 1 ? 'it' : 'them') + ', so the original is kept. Try a stronger setting.'));
  }));
  root.append(dropzone({ accept: '.pdf,application/pdf', multiple: true, label: 'Choose PDFs', onFiles: (fs) => { files = fs; info.textContent = fs.length + (fs.length === 1 ? ' PDF chosen.' : ' PDFs chosen.'); out.replaceChildren(); } }),
    panel(info, level.el, note('Strong and Smallest turn each page into a picture: the text can no longer be selected or searched. Use Light for documents that must stay searchable.'), go, prog, out));
}
