// Image Converter: HEIC, PNG, WebP, TIFF, BMP, GIF or AVIF to JPG, PNG, WebP or AVIF, one or many.
// (1.61.9) Two more tabs: SVG to PNG and Image to Base64 (they were tools of their own; their old addresses open the tab).
import { h, seg, range, button, dropzone, panel, busy, field } from '../ui.js';
import { ACCEPT, FORMATS, decode, encode, outName, results, each } from '../lib/image.js';
import svgPng from '../lib/svg-png.js';
import imgBase64 from '../lib/img-base64.js';

function convert(root) {
  let files = [];
  const fmt = seg('Convert to', FORMATS, 'jpg', () => q.input.disabled = fmt.value === 'png'), q = range('Quality', 10, 100, 1, 90, (v) => v + '%');
  const bg = h('input', { type: 'color', value: '#ffffff' }), list = h('p', { class: 'hint' }), prog = h('p', { class: 'hint', 'aria-live': 'polite' }), out = h('div');
  const go = button('Convert', { primary: true, icon: 'convert' });
  go.addEventListener('click', () => busy(go, async () => {
    if (!files.length) return; const f = fmt.value;
    results(out, await each(files, prog, async (file) => ({ name: outName(file.name, f), blob: await encode(await decode(file), f, q.value / 100, bg.value), before: file.size })), 'converted.zip');
  }));
  root.append(dropzone({ accept: ACCEPT, multiple: true, label: 'Choose images', hint: 'HEIC, PNG, JPG, WebP, TIFF, BMP, GIF or AVIF. Drop many at once.', onFiles: (fs) => { files = fs; list.textContent = fs.length + (fs.length === 1 ? ' image chosen.' : ' images chosen.'); out.replaceChildren(); } }),
    panel(list, fmt.el, q.el, field('Background for JPG (where the image is see-through)', bg), go, prog, out));
}

const TABS = [['convert', 'Convert Images', convert], ['svg', 'SVG to PNG', svgPng], ['base64', 'Image and Base64', imgBase64]];

export default function (root, ctx) {
  const body = h('div', { class: 'ictab' });
  let cleanup = null;
  const show = (k) => {
    if (typeof cleanup === 'function') { try { cleanup(); } catch (e) { /* ignore */ } }
    body.replaceChildren(); cleanup = (TABS.find((t) => t[0] === k) || TABS[0])[2](body) || null;
  };
  const start = TABS.some((t) => t[0] === (ctx && ctx.tab)) ? ctx.tab : 'convert';
  const tabs = seg('', TABS.map((t) => [t[0], t[1]]), start, show);
  tabs.el.classList.add('tabseg');
  root.append(tabs.el, body); show(start);
  return () => { if (typeof cleanup === 'function') cleanup(); };
}
