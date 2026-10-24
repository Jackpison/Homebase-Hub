// Images in and out, for every image tool: open any format the tools accept, save as JPG, PNG, WebP or AVIF,
// shrink to a target size, and show results with one download each or all in a ZIP.
import { zipSync } from 'fflate';
import { h, button, download, bytes, toast } from '../ui.js';

export const ACCEPT = 'image/*,.heic,.heif,.tif,.tiff,.avif,.bmp,.svg';
export const FORMATS = [['jpg', 'JPG'], ['png', 'PNG'], ['webp', 'WebP'], ['avif', 'AVIF']];
const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' };
export const extOf = (file) => { const e = (file.name.match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase(); return e === 'jpeg' ? 'jpg' : e; };
export const sameFormat = (file) => (['jpg', 'png', 'webp', 'avif'].includes(extOf(file)) ? extOf(file) : 'png');
export const outName = (name, ext, tag = '') => name.replace(/\.[^.]+$/, '') + (tag ? '-' + tag : '') + '.' + ext;

export function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

/** Reads an image file into a canvas, whatever its format. Photos are turned upright from their EXIF orientation. */
export async function decode(file) {
  const name = file.name.toLowerCase();
  if (/\.(heic|heif)$/.test(name) || /hei[cf]/.test(file.type)) return heic(file);
  if (/\.tiff?$/.test(name) || file.type === 'image/tiff') return tiff(file);
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const c = canvas(bmp.width, bmp.height); c.getContext('2d').drawImage(bmp, 0, 0); bmp.close?.(); return c;
  } catch (e) {   // SVG, and formats createImageBitmap refuses in some browsers
    const url = URL.createObjectURL(file), img = new Image();
    try {
      img.src = url; await img.decode();
      const w = img.naturalWidth || 1024, ht = img.naturalHeight || 1024, c = canvas(w, ht); c.getContext('2d').drawImage(img, 0, 0, w, ht); return c;
    } catch (e2) { throw new Error(file.name + ' could not be read as an image.'); }
    finally { URL.revokeObjectURL(url); }
  }
}
async function heic(file) {
  const mod = await import('libheif-js/libheif-wasm/libheif-bundle.mjs');
  const lib = (mod.default || mod)();
  const imgs = new lib.HeifDecoder().decode(new Uint8Array(await file.arrayBuffer()));
  if (!imgs || !imgs.length) throw new Error(file.name + ' is not a HEIC image this tool can read.');
  const im = imgs[0], w = im.get_width(), ht = im.get_height(), c = canvas(w, ht), x = c.getContext('2d'), data = x.createImageData(w, ht);
  await new Promise((ok, no) => im.display(data, (d) => (d ? ok() : no(new Error(file.name + ' could not be decoded.')))));
  x.putImageData(data, 0, 0); imgs.forEach((i) => i.free?.()); return c;
}
async function tiff(file) {
  const UTIF = (await import('utif2')).default;
  const buf = await file.arrayBuffer(), ifds = UTIF.decode(buf);
  if (!ifds.length) throw new Error(file.name + ' is not a TIFF this tool can read.');
  UTIF.decodeImage(buf, ifds[0]);
  const rgba = UTIF.toRGBA8(ifds[0]), w = ifds[0].width, ht = ifds[0].height, c = canvas(w, ht);
  c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba.buffer, 0, w * ht * 4), w, ht), 0, 0); return c;
}

/** Saves a canvas. quality 0..1 (JPG, WebP, AVIF). JPG gets a background colour where the image is transparent. */
export async function encode(c, fmt, quality = 0.9, bg = '#ffffff') {
  if (fmt === 'jpg') { const f = canvas(c.width, c.height), x = f.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, f.width, f.height); x.drawImage(c, 0, 0); c = f; }
  if (fmt === 'avif') {
    const { default: enc } = await import('@jsquash/avif/encode.js');
    const data = c.getContext('2d').getImageData(0, 0, c.width, c.height);
    return new Blob([await enc(data, { quality: Math.round(quality * 100), speed: 6 })], { type: 'image/avif' });
  }
  const blob = await new Promise((ok) => c.toBlob(ok, MIME[fmt], quality));
  if (!blob) throw new Error('The image is too large for this browser to save.');
  if (blob.type !== MIME[fmt]) throw new Error('This browser cannot save ' + fmt.toUpperCase() + ' files. Choose another format, or use Chrome, Edge or Firefox.');
  return blob;
}

/** The best quality (and if needed a smaller size) that fits under maxBytes. */
export async function toTarget(c, fmt, maxBytes) {
  if (fmt === 'png') { let cur = c; for (let i = 0; i < 12; i++) { const b = await encode(cur, 'png'); if (b.size <= maxBytes || cur.width < 64) return b; cur = scaled(cur, 0.85); } return encode(cur, 'png'); }
  let cur = c;
  for (let round = 0; round < 12; round++) {
    let lo = 0.3, hi = 0.95, best = null;
    for (let i = 0; i < 7; i++) { const q = (lo + hi) / 2, b = await encode(cur, fmt, q); if (b.size <= maxBytes) { best = b; lo = q; } else hi = q; }
    if (best) return best;
    const low = await encode(cur, fmt, 0.3); if (low.size <= maxBytes) return low;
    if (cur.width < 64) return low;
    cur = scaled(cur, Math.max(0.5, Math.sqrt(maxBytes / low.size) * 0.95));
  }
  return encode(cur, fmt, 0.3);
}
export function scaled(c, f) { const o = canvas(c.width * f, c.height * f), x = o.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, o.width, o.height); return o; }
export function resized(c, w, ht) { const o = canvas(w, ht), x = o.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, o.width, o.height); return o; }

/** A list of finished files: each with its size (and the saving, when there was a before size), one download each, all as a ZIP. */
export function results(box, items, zipName = 'images.zip') {
  const total0 = items.reduce((a, i) => a + (i.before || 0), 0), total1 = items.reduce((a, i) => a + i.blob.size, 0);
  const saving = (b, a) => (b ? ' (' + (a <= b ? Math.round((1 - a / b) * 100) + '% smaller' : Math.round((a / b - 1) * 100) + '% larger') + ')' : '');
  box.replaceChildren(
    h('ul', { class: 'flist' }, items.map((i) => h('li', {}, h('span', { text: i.name }), h('small', { text: (i.before ? bytes(i.before) + ' → ' : '') + bytes(i.blob.size) + saving(i.before, i.blob.size) }),
      button('', { icon: 'download', small: true, aria: 'Download ' + i.name, onClick: () => download(i.blob, i.name) })))),
    items.length > 1 ? h('div', { class: 'row' }, button('Download All (ZIP)', { primary: true, icon: 'download', onClick: () => zipAll(items, zipName) }),
      h('span', { class: 'hint', text: items.length + ' files, ' + bytes(total1) + saving(total0, total1) })) : null,
  );
  if (items.length === 1) download(items[0].blob, items[0].name);
}
export async function zipAll(items, name) {
  const files = {}, seen = {};
  for (const i of items) { let n = i.name; if (seen[n]) n = n.replace(/(\.[^.]+)$/, '-' + (++seen[n]) + '$1'); else seen[n] = 1; files[n] = [new Uint8Array(await i.blob.arrayBuffer()), { level: 0 }]; }
  download(new Blob([zipSync(files)], { type: 'application/zip' }), name);
}

/** Runs one job per file, showing progress; a file that fails is named and skipped. */
export async function each(files, prog, job) {
  const out = [];
  for (let i = 0; i < files.length; i++) {
    prog.textContent = files.length > 1 ? 'Working on ' + (i + 1) + ' of ' + files.length + '…' : 'Working…';
    await new Promise((r) => setTimeout(r, 0));
    try { const r = await job(files[i], i); if (r) out.push(r); } catch (e) { console.error(e); toast(e.message || files[i].name + ' failed.', true); }
  }
  prog.textContent = '';
  return out;
}

/** Shows a canvas scaled down to fit the preview box. */
export function preview(c, maxW = 900) {
  const f = Math.min(1, maxW / c.width), p = f < 1 ? scaled(c, f) : c;
  p.setAttribute('role', 'img'); p.setAttribute('aria-label', 'Preview'); return p;
}
