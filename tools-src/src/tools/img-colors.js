// Color Picker and Palette: pick any colour from an image, and see its main colours as HEX, RGB and HSL.
import { h, button, dropzone, panel, copyText } from '../ui.js';
import { ACCEPT, decode, canvas } from '../lib/image.js';

const hex = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
function hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let hh = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60; }
  return 'hsl(' + Math.round(hh) + ', ' + Math.round(s * 100) + '%, ' + Math.round(l * 100) + '%)';
}
/** The main colours, by k-means on a small copy. [{rgb:[r,g,b], share}] */
export function palette(src, k = 8) {
  const f = Math.min(1, 120 / Math.max(src.width, src.height)), c = canvas(src.width * f, src.height * f), x = c.getContext('2d'); x.drawImage(src, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height).data, px = [];
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128) px.push([d[i], d[i + 1], d[i + 2]]);
  if (!px.length) return [];
  let cent = Array.from({ length: Math.min(k, px.length) }, (_, i) => px[Math.floor((i + 0.5) * px.length / Math.min(k, px.length))].slice());
  let lab = new Array(px.length).fill(0);
  for (let it = 0; it < 12; it++) {
    lab = px.map((p) => { let best = 0, bd = 1e9; cent.forEach((q, j) => { const dd = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2; if (dd < bd) { bd = dd; best = j; } }); return best; });
    cent = cent.map((q, j) => { const m = px.filter((_, i) => lab[i] === j); return m.length ? [0, 1, 2].map((t) => Math.round(m.reduce((a, p) => a + p[t], 0) / m.length)) : q; });
  }
  return cent.map((q, j) => ({ rgb: q, share: lab.filter((l) => l === j).length / px.length })).filter((x2) => x2.share > 0).sort((a, b) => b.share - a.share);
}

export default function (root) {
  let full = null;
  const view = h('div', { class: 'preview' }, h('p', { class: 'hint', text: 'Your image shows here. Click on it to pick a colour.' })), picked = h('div', { 'aria-live': 'polite' }), pal = h('div');
  const values = (r, g, b) => [['HEX', hex(r, g, b)], ['RGB', 'rgb(' + r + ', ' + g + ', ' + b + ')'], ['HSL', hsl(r, g, b)]];
  const swatch = (r, g, b, big) => { const s = h('span', { class: 'sw' + (big ? ' big' : '') }); s.style.background = hex(r, g, b); return s; };
  function pick(r, g, b) {
    picked.replaceChildren(h('div', { class: 'row' }, swatch(r, g, b, true), h('ul', { class: 'flist grow' }, values(r, g, b).map(([n, v]) => h('li', {}, h('b', { text: n }), h('span', { class: 'out', text: v }), h('button', { type: 'button', class: 'ib', 'aria-label': 'Copy ' + n, onClick: () => copyText(v) }, '⧉'))))));
  }
  function show() {
    const f = Math.min(1, 760 / full.width), c = canvas(full.width * f, full.height * f); c.getContext('2d').drawImage(full, 0, 0, c.width, c.height);
    c.className = 'pick'; c.setAttribute('role', 'img'); c.setAttribute('aria-label', 'Your image. Click a point to pick its colour.');
    c.addEventListener('click', (e) => { const r = c.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / r.width * full.width), y = Math.floor((e.clientY - r.top) / r.height * full.height); const d = full.getContext('2d').getImageData(x, y, 1, 1).data; pick(d[0], d[1], d[2]); });
    view.replaceChildren(c);
    const p = palette(full);
    pal.replaceChildren(h('h2', { text: 'Main colours' }), h('ul', { class: 'flist' }, p.map(({ rgb: [r, g, b], share }) => h('li', {}, swatch(r, g, b), h('span', { class: 'out', text: hex(r, g, b) + '   ' + Math.round(share * 100) + '%' }),
      h('button', { type: 'button', class: 'ib', 'aria-label': 'Pick ' + hex(r, g, b), onClick: () => pick(r, g, b) }, '→')))),
      h('div', { class: 'row' }, button('Copy as CSS Variables', { icon: 'copy', onClick: () => copyText(':root {\n' + p.map(({ rgb }, i) => '  --color-' + (i + 1) + ': ' + hex(...rgb) + ';').join('\n') + '\n}') }),
        button('Copy as a List', { icon: 'copy', onClick: () => copyText(p.map(({ rgb }) => hex(...rgb)).join('\n')) })));
    const [r, g, b] = p[0] ? p[0].rgb : [0, 0, 0]; pick(r, g, b);
  }
  root.append(dropzone({ accept: ACCEPT, label: 'Choose an image', onFiles: async ([f]) => { full = await decode(f); show(); } }),
    h('div', { class: 'cols' }, panel(view), panel(h('h2', { text: 'Picked colour' }), picked, pal)));
}
