// PDF and Image to Text: the text out of PDFs and photos; scanned pages are read with OCR (Tesseract), in your browser.
import { h, field, textarea, seg, check, button, dropzone, panel, busy, copyText, download, note } from '../ui.js';
import { ACCEPT, decode } from '../lib/image.js';
import { openDoc, renderPage, isPdf } from '../lib/pdf.js';

let WORKER = null;
async function ocrWorker(say) {
  if (WORKER) return WORKER;
  say('Loading the text reader (about 9 MB the first time)…');   // worker, SIMD core and English data
  const T = await import('tesseract.js'), createWorker = T.createWorker || (T.default && T.default.createWorker);   // a CommonJS package: its exports may sit under default
  const V = new URL('./vendor/tesseract/', import.meta.url).href;
  WORKER = await createWorker('eng', 1, { workerPath: V + 'worker.min.js', corePath: V + 'tesseract-core-simd-lstm.wasm.js', langPath: V, gzip: false, workerBlobURL: false, cacheMethod: 'none', logger: () => {} });
  return WORKER;
}
export async function layerText(page) {
  const tc = await page.getTextContent();
  return tc.items.map((i) => (i.str || '') + (i.hasEOL ? '\n' : '')).join('').replace(/[ \t]+\n/g, '\n').trim();
}
export default function (root) {
  let files = [];
  const mode = seg('How', [['auto', 'Automatic'], ['layer', 'Text Layer Only'], ['ocr', 'Read with OCR']], 'auto'), marks = check('Mark where each page starts', true);
  const res = textarea({ rows: 16, readonly: true, 'aria-label': 'The text' }), prog = h('p', { class: 'hint', 'aria-live': 'polite' }), info = h('p', { class: 'hint' });
  const say = (m) => { prog.textContent = m; };
  const go = button('Get the Text', { primary: true, icon: 'text' });
  go.addEventListener('click', () => busy(go, async () => {
    if (!files.length) return; const parts = [];
    for (const f of files) {
      if (isPdf(f)) {
        const doc = await openDoc(f);
        for (let i = 1; i <= doc.numPages; i++) {
          say(f.name + ': page ' + i + ' of ' + doc.numPages + '…');
          const page = await doc.getPage(i); let t = mode.value === 'ocr' ? '' : await layerText(page);
          if (mode.value === 'ocr' || (mode.value === 'auto' && t.replace(/\s/g, '').length < 20)) { const w = await ocrWorker(say); say(f.name + ': reading page ' + i + ' with OCR…'); const { canvas: c } = await renderPage(doc, i, page.getViewport({ scale: 1 }).width * 2.6); t = (await w.recognize(c)).data.text.trim(); }
          parts.push((marks.value ? '--- ' + (files.length > 1 ? f.name + ', ' : '') + 'page ' + i + ' ---\n' : '') + t);
        }
      } else {
        if (mode.value === 'layer') { parts.push((marks.value ? '--- ' + f.name + ' ---\n' : '') + '(An image has no text layer: choose Automatic or Read with OCR.)'); continue; }
        const w = await ocrWorker(say); say(f.name + ': reading with OCR…');
        parts.push((marks.value ? '--- ' + f.name + ' ---\n' : '') + (await w.recognize(await decode(f))).data.text.trim());
      }
    }
    say(''); res.value = parts.join('\n\n');
  }));
  root.append(dropzone({ accept: '.pdf,application/pdf,' + ACCEPT, multiple: true, label: 'Choose PDFs or photos', onFiles: (fs) => { files = fs; info.textContent = fs.length + (fs.length === 1 ? ' file chosen.' : ' files chosen.'); res.value = ''; } }),
    h('div', { class: 'cols' }, panel(info, mode.el, marks.el, go, prog, note('Automatic uses the text inside a PDF and reads pages without any (scans) with OCR. OCR reads English text.')),
      panel(field('The text', res), h('div', { class: 'row' }, button('Copy', { icon: 'copy', onClick: () => res.value && copyText(res.value) }), button('Download .txt', { icon: 'download', onClick: () => res.value && download(new Blob([res.value], { type: 'text/plain' }), 'text.txt') })))));
}
