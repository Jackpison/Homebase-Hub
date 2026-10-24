// PDFs in and out, for every PDF tool: pdf.js to show and read pages, pdf-lib to change files, page ranges, file names.
import { canvas } from './image.js';

const A = (p) => new URL(p, import.meta.url).href;   // files the build copies next to the scripts in assets/
function streamFix() {   // Safari and other WebKit browsers cannot loop over a ReadableStream with for await; pdf.js reads text that way
  const R = globalThis.ReadableStream;
  if (R && !R.prototype[Symbol.asyncIterator]) R.prototype[Symbol.asyncIterator] = async function* () { const r = this.getReader(); try { for (;;) { const { done, value } = await r.read(); if (done) return; yield value; } } finally { r.releaseLock(); } };
}
let PJ = null;
export async function pdfjs() {
  if (PJ) return PJ;
  streamFix(); PJ = await import('pdfjs-dist/legacy/build/pdf.min.mjs');   // the legacy build carries polyfills: pdf.js 6 uses JavaScript too new for many browsers
  PJ.GlobalWorkerOptions.workerSrc = A('./pdf.worker.min.mjs'); return PJ;
}
const bytesOf = async (f) => (f instanceof Uint8Array ? f.slice() : new Uint8Array(await f.arrayBuffer()));
/** Opens a PDF with pdf.js (to show or read it). */
export async function openDoc(file, password) {
  const pj = await pdfjs(), name = file.name || 'This PDF';
  const task = pj.getDocument({ data: await bytesOf(file), password, cMapUrl: A('./vendor/pdfjs/cmaps/'), cMapPacked: true, standardFontDataUrl: A('./vendor/pdfjs/standard_fonts/'), wasmUrl: A('./vendor/pdfjs/wasm/'), isEvalSupported: false });
  try { return await task.promise; }
  catch (e) { throw new Error(e && e.name === 'PasswordException' ? name + ' has a password. Remove it first with Protect or Unlock PDF.' : name + ' could not be read as a PDF.'); }
}
/** A page drawn on a canvas, `width` pixels wide. Returns {canvas, viewport}. */
export async function renderPage(doc, n, width) {
  const page = await doc.getPage(n), vp1 = page.getViewport({ scale: 1 }), viewport = page.getViewport({ scale: width / vp1.width });
  const c = canvas(viewport.width, viewport.height), x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: x, viewport }).promise;
  return { canvas: c, viewport, page };
}
export const lib = () => import('pdf-lib');
/** Opens a PDF with pdf-lib (to change it). */
export async function loadLib(file) {
  const { PDFDocument } = await lib(), name = file.name || 'This PDF';
  try { return await PDFDocument.load(await bytesOf(file), { updateMetadata: false }); }
  catch (e) { throw new Error(/encrypt/i.test(e.message) ? name + ' has a password. Remove it first with Protect or Unlock PDF.' : name + ' could not be read as a PDF.'); }
}
/** "1-3, 5, 8-" → [[0,2],[4,4],[7,last]] (zero-based, inclusive). Throws a sentence on a mistake. */
export function ranges(text, count) {
  const out = [];
  for (let part of String(text).split(/[,;]+/)) {
    part = part.trim(); if (!part) continue;
    const m = /^(\d*)\s*[-–]\s*(\d*)$/.exec(part) || /^(\d+)$/.exec(part);
    if (!m) throw new Error('"' + part + '" is not a page or a range like 2-5.');
    const a = m[2] === undefined ? +m[1] : m[1] === '' ? 1 : +m[1], b = m[2] === undefined ? +m[1] : m[2] === '' ? count : +m[2];
    if (a < 1 || b < 1 || a > count || b > count) throw new Error('Page ' + Math.max(a, b) + ' does not exist: this PDF has ' + count + ' pages.');
    out.push([Math.min(a, b) - 1, Math.max(a, b) - 1]);
  }
  if (!out.length) throw new Error('Enter pages, for example 1-3, 5.');
  return out;
}
export const pdfBlob = (bytes) => new Blob([bytes], { type: 'application/pdf' });
export const pdfName = (name, tag) => (name || 'document.pdf').replace(/\.pdf$/i, '') + (tag ? '-' + tag : '') + '.pdf';
export const isPdf = (f) => /\.pdf$/i.test(f.name) || f.type === 'application/pdf';
