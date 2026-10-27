// QR and Barcode Scanner: read QR codes and barcodes from a photo or a screenshot, or live from the camera.
// The browser's own reader is used where there is one; elsewhere ZXing (WebAssembly, shipped with the site). Nothing leaves the device.
import { h, panel, button, dropzone, copyText, toast, note } from '../ui.js';
import { decode } from '../lib/image.js';

let zx = null;
async function reader() {
  if (zx) return zx;
  const m = await import('zxing-wasm/reader');
  m.prepareZXingModule({ overrides: { locateFile: (p, pre) => (p.endsWith('.wasm') ? new URL('./zxing_reader.wasm', import.meta.url).href : pre + p) }, fireImmediately: true });
  return (zx = m);
}
const NAMES = { qr_code: 'QR Code', QRCode: 'QR Code', ean_13: 'EAN-13', EAN13: 'EAN-13', ean_8: 'EAN-8', EAN8: 'EAN-8', code_128: 'Code 128', Code128: 'Code 128', code_39: 'Code 39', Code39: 'Code 39', upc_a: 'UPC-A', UPCA: 'UPC-A', upc_e: 'UPC-E', UPCE: 'UPC-E', itf: 'ITF', ITF: 'ITF', data_matrix: 'Data Matrix', DataMatrix: 'Data Matrix', pdf417: 'PDF417', PDF417: 'PDF417', aztec: 'Aztec', Aztec: 'Aztec', codabar: 'Codabar', Codabar: 'Codabar' };
/** Every code in an image (ImageData). Returns [{ text, format }]. */
export async function scan(img) {
  if ('BarcodeDetector' in window) {
    try { const d = new window.BarcodeDetector(), r = await d.detect(img); if (r.length) return r.map((x) => ({ text: x.rawValue, format: NAMES[x.format] || x.format })); } catch (e) { /* fall back to ZXing */ }
  }
  const { readBarcodes } = await reader();
  return (await readBarcodes(img, { tryHarder: true, maxNumberOfSymbols: 8 })).filter((x) => x.isValid !== false && x.text).map((x) => ({ text: x.text, format: NAMES[x.format] || x.format }));
}

export default function (root) {
  const out = h('div', { 'aria-live': 'polite' }), seen = new Map(), video = h('video', { class: 'cam', playsinline: true, muted: true, hidden: true, 'aria-label': 'Camera' });
  let stream = null, timer = 0, busy2 = false;
  function show(found, from) {
    for (const f of found) seen.set(f.format + '\n' + f.text, f);
    if (!seen.size) { out.replaceChildren(note(from === 'cam' ? 'Point the camera at a code. Hold it steady and close enough to fill a third of the picture.' : 'No code found in this picture. Try a sharper or closer photo.', from !== 'cam')); return; }
    out.replaceChildren(h('ul', { class: 'flist' }, [...seen.values()].reverse().map((f) => {
      const url = /^https?:\/\/\S+$/i.test(f.text) ? f.text : null;
      return h('li', {}, h('small', { text: f.format }), h('span', { class: 'out', text: f.text }), url ? h('a', { class: 'btn sm', href: url, target: '_blank', rel: 'noopener noreferrer', text: 'Open' }) : null,
        button('', { icon: 'copy', small: true, aria: 'Copy ' + f.format, onClick: () => copyText(f.text) }));
    })), h('p', { class: 'hint', text: 'Check a link before you open it: a QR code can point anywhere.' }));
  }
  const pixels = (src, w, ht) => { const c = document.createElement('canvas'), k = Math.min(1, 1600 / Math.max(w, ht)); c.width = Math.round(w * k); c.height = Math.round(ht * k); const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(src, 0, 0, c.width, c.height); return x.getImageData(0, 0, c.width, c.height); };
  const drop = dropzone({ accept: 'image/*,.heic,.heif', label: 'Choose a photo or screenshot', hint: 'Drop, choose or paste a picture with a QR code or barcode.', onFiles: async ([f]) => {
    stop(); out.replaceChildren(h('p', { class: 'loading', text: 'Reading…' }));
    try { const c = await decode(f); show(await scan(pixels(c, c.width, c.height)), 'file'); } catch (e) { out.replaceChildren(note('This picture could not be read.', true)); }
  } });
  const camBtn = button('Use the Camera', { icon: 'scan', primary: true, onClick: () => (stream ? stop() : start()) });
  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) return toast('This browser cannot use a camera here. Use a photo instead.', true);
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }); }
    catch (e) { stream = null; return toast(e && e.name === 'NotAllowedError' ? 'The camera was not allowed. Allow it in the browser’s site settings, or use a photo.' : 'No camera could be started.', true); }
    video.srcObject = stream; video.hidden = false; await video.play().catch(() => {}); camBtn.querySelector('span').textContent = 'Stop the Camera'; show([], 'cam');
    timer = setInterval(async () => {
      if (busy2 || !video.videoWidth) return; busy2 = true;
      try { const r = await scan(pixels(video, video.videoWidth, video.videoHeight)); if (r.length) { const before = seen.size; show(r, 'cam'); if (seen.size > before && navigator.vibrate) navigator.vibrate(60); } } catch (e) { /* the next frame */ }
      busy2 = false;
    }, 350);
  }
  function stop() { clearInterval(timer); timer = 0; if (stream) stream.getTracks().forEach((t) => t.stop()); stream = null; video.hidden = true; video.srcObject = null; camBtn.querySelector('span').textContent = 'Use the Camera'; }
  root.append(h('div', { class: 'cols' }, panel(h('h2', { text: 'Scan' }), drop, h('div', { class: 'row' }, camBtn), video, h('p', { class: 'hint', text: 'The camera is used only while it is on, and nothing is sent anywhere.' })),
    panel(h('h2', { text: 'Found' }), out)));
  out.replaceChildren(h('p', { class: 'hint', text: 'Codes you scan appear here.' }));
  return stop;
}
