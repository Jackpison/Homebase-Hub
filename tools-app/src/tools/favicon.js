// Favicon Downloader and Maker: a website's icon at the size you need, or a full icon pack from your own logo.
import { zipSync } from 'fflate';
import { h, field, input, select, seg, range, check, button, download, dropzone, panel, note, busy, toast } from '../ui.js';

const API = new URL('../core-data/api.php', location.href).href;
const SIZES = [16, 32, 48, 64, 128, 256, 512];

function canvasOf(src, s, { bg = null, pad = 0, round = 0 } = {}) {
  const c = document.createElement('canvas'); c.width = c.height = s;
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
  if (round) { const r = s * round / 100; x.beginPath(); x.roundRect(0, 0, s, s, r); x.clip(); }
  if (bg) { x.fillStyle = bg; x.fillRect(0, 0, s, s); }
  const p = s * pad / 100, w = s - p * 2, ar = (src.naturalWidth || src.width) / (src.naturalHeight || src.height);
  const dw = ar >= 1 ? w : w * ar, dh = ar >= 1 ? w / ar : w;
  x.drawImage(src, p + (w - dw) / 2, p + (w - dh) / 2, dw, dh);
  return c;
}
const pngOf = (c) => new Promise((ok) => c.toBlob(ok, 'image/png'));
async function icoOf(pngs) {   // a .ico file holding PNG images (every current browser reads these)
  const bufs = await Promise.all(pngs.map(([, b]) => b.arrayBuffer()));
  const head = 6 + 16 * pngs.length, out = new Uint8Array(head + bufs.reduce((a, b) => a + b.byteLength, 0)), v = new DataView(out.buffer);
  v.setUint16(2, 1, true); v.setUint16(4, pngs.length, true);
  let off = head;
  pngs.forEach(([s], i) => { const e = 6 + 16 * i; v.setUint8(e, s >= 256 ? 0 : s); v.setUint8(e + 1, s >= 256 ? 0 : s); v.setUint16(e + 4, 1, true); v.setUint16(e + 6, 32, true); v.setUint32(e + 8, bufs[i].byteLength, true); v.setUint32(e + 12, off, true); out.set(new Uint8Array(bufs[i]), off); off += bufs[i].byteLength; });
  return new Blob([out], { type: 'image/x-icon' });
}

export default function (root) {
  const area = h('div');
  const mode = seg('', [['grab', 'Get a Website’s Icon'], ['make', 'Make an Icon Pack']], 'grab', () => show());
  function grab() {
    const dom = input({ placeholder: 'example.com', autocomplete: 'off' }), size = select(SIZES.map((s) => [s, s + ' × ' + s]), 64);
    const out = h('div');
    const go = button('Get Icon', { primary: true, icon: 'download' });
    const run = () => busy(go, async () => {
      const d = dom.value.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
      if (!d) { out.replaceChildren(note('Enter a website name like example.com.', true)); return; }
      const res = await fetch(API + '?action=favicon&domain=' + encodeURIComponent(d) + '&sz=' + size.value);
      if (!res.ok) { let m = 'The icon could not be fetched.'; try { m = (await res.json()).error || m; } catch (e) { /* not JSON */ } out.replaceChildren(note(m, true)); return; }
      let blob = await res.blob(); const s = +size.value;
      const img = await createImageBitmap(blob);
      if (img.width !== s) { const c = document.createElement('canvas'); c.width = c.height = s; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, s, s); blob = await pngOf(c); }
      const url = URL.createObjectURL(blob), name = d.replace(/[^a-z0-9.-]/gi, '_') + '-' + s + '.png';
      out.replaceChildren(h('div', { class: 'preview' }, h('img', { src: url, alt: 'Icon of ' + d, width: Math.min(s, 256), height: Math.min(s, 256) })),
        h('div', { class: 'row' }, button('Download ' + s + ' × ' + s + ' PNG', { icon: 'download', onClick: () => download(blob, name) })));
    });
    go.addEventListener('click', run); dom.addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
    return panel(h('div', { class: 'row' }, h('div', { style: 'flex:1;min-width:220px' }, field('Website', dom)), field('Size', size), go), out,
      h('p', { class: 'hint', text: 'The icon comes through your own site from Google’s icon service. Sizes above 256 are enlarged from 256.' }));
  }
  function make() {
    let src = null;
    const bgOn = check('Fill the background', false, () => draw()), bg = h('input', { type: 'color', value: '#ffffff', onInput: () => draw() });
    const pad = range('Padding', 0, 30, 1, 0, (v) => v + '%', () => draw()), round = range('Rounded corners', 0, 50, 1, 0, (v) => v + '%', () => draw());
    const prev = h('div', { class: 'icons' }), out = h('div');
    const opts = () => ({ bg: bgOn.value ? bg.value : null, pad: pad.value, round: round.value });
    function draw() {
      if (!src) return;
      prev.replaceChildren(...[16, 32, 48, 180, 192].map((s) => { const c = canvasOf(src, s, opts()); const im = h('img', { alt: s + ' pixel icon', width: Math.min(s, 96), height: Math.min(s, 96) }); im.src = c.toDataURL(); return h('figure', {}, im, s + ' px'); }));
    }
    const get = button('Download the Icon Pack (ZIP)', { primary: true, icon: 'download' });
    get.addEventListener('click', () => busy(get, async () => {
      if (!src) { toast('Choose your logo first.', true); return; }
      const o = opts(), files = {};
      const add = async (name, s) => { const b = await pngOf(canvasOf(src, s, o)); files[name] = new Uint8Array(await b.arrayBuffer()); return b; };
      const small = [];
      for (const s of [16, 32, 48]) small.push([s, await add('favicon-' + s + 'x' + s + '.png', s)]);
      await add('apple-touch-icon.png', 180); await add('icon-192.png', 192); await add('icon-512.png', 512);
      files['favicon.ico'] = new Uint8Array(await (await icoOf(small)).arrayBuffer());
      files['site.webmanifest'] = new TextEncoder().encode(JSON.stringify({ icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }] }, null, 2));
      files['add-to-your-head.html'] = new TextEncoder().encode('<link rel="icon" href="/favicon.ico" sizes="48x48">\n<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">\n<link rel="apple-touch-icon" href="/apple-touch-icon.png">\n<link rel="manifest" href="/site.webmanifest">\n');
      download(new Blob([zipSync(files, { level: 6 })], { type: 'application/zip' }), 'favicon-pack.zip');
      out.replaceChildren(note('The ZIP holds favicon.ico, PNGs at 16, 32, 48, 180, 192 and 512 pixels, a web manifest and the lines to add to your page’s <head>.'));
    }));
    return h('div', {}, dropzone({ accept: 'image/*,.svg', label: 'Choose your logo', hint: 'A square PNG or SVG of 512 pixels or more works best.', onFiles: async ([f]) => {
      const url = URL.createObjectURL(f), im = new Image(); im.src = url;
      try { await im.decode(); src = im; draw(); } catch (e) { toast('That image could not be read.', true); }
    } }), h('div', { class: 'cols' }, panel(h('div', { class: 'row' }, bgOn.el, bg), pad.el, round.el), panel(h('h2', { text: 'Preview' }), prev, get, out)));
  }
  function show() { area.replaceChildren(mode.value === 'grab' ? grab() : make()); }
  root.append(h('div', { class: 'field' }, mode.el), area); show();
}
