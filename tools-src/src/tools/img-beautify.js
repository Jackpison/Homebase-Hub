// Screenshot Beautifier: a screenshot on a gradient, with padding, rounded corners, a shadow and an optional window frame.
import { h, seg, range, button, dropzone, panel, busy, field } from '../ui.js';
import { ACCEPT, decode, encode, canvas, outName, results, preview } from '../lib/image.js';

const BG = { sunset: ['#ff7e5f', '#feb47b'], ocean: ['#2193b0', '#6dd5ed'], forest: ['#11998e', '#38ef7d'], candy: ['#ee9ca7', '#ffdde1'], night: ['#232526', '#414345'], gold: ['#f7971e', '#ffd200'] };
export function beautify(src, o) {
  const sc = o.scale, pad = o.pad * sc, bar = o.frame === 'none' ? 0 : 34 * sc, r = o.radius * sc;
  const W = src.width * sc + pad * 2, H = src.height * sc + bar + pad * 2, c = canvas(W, H), x = c.getContext('2d');
  const [a, b] = o.bg === 'custom' ? [o.c1, o.c2] : BG[o.bg];
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, a); g.addColorStop(1, b); x.fillStyle = g; x.fillRect(0, 0, W, H);
  const bx = pad, by = pad, bw = src.width * sc, bh = src.height * sc + bar;
  x.save(); x.shadowColor = 'rgba(0,0,0,' + (o.shadow / 100 * 0.55) + ')'; x.shadowBlur = o.shadow * 0.6 * sc; x.shadowOffsetY = o.shadow * 0.25 * sc;
  x.beginPath(); x.roundRect(bx, by, bw, bh, r); x.fillStyle = o.frame === 'light' ? '#f3f3f3' : '#1f1f22'; x.fill(); x.restore();
  x.save(); x.beginPath(); x.roundRect(bx, by, bw, bh, r); x.clip();
  if (bar) { x.fillStyle = o.frame === 'light' ? '#ececec' : '#2a2a2e'; x.fillRect(bx, by, bw, bar); ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => { x.beginPath(); x.arc(bx + (18 + i * 20) * sc, by + bar / 2, 6 * sc, 0, Math.PI * 2); x.fillStyle = col; x.fill(); }); }
  x.imageSmoothingQuality = 'high'; x.drawImage(src, bx, by + bar, bw, src.height * sc); x.restore();
  return c;
}
export default function (root) {
  let file = null, src = null;
  const bg = seg('Background', [['sunset', 'Sunset'], ['ocean', 'Ocean'], ['forest', 'Forest'], ['candy', 'Candy'], ['night', 'Night'], ['gold', 'Gold'], ['custom', 'Your Colours']], 'ocean', () => draw());
  const c1 = h('input', { type: 'color', value: '#6a11cb', onInput: () => draw() }), c2 = h('input', { type: 'color', value: '#2575fc', onInput: () => draw() });
  const pad = range('Padding', 0, 200, 4, 64, (v) => v + ' px', () => draw()), radius = range('Rounded corners', 0, 40, 1, 12, (v) => v + ' px', () => draw()), shadow = range('Shadow', 0, 100, 1, 60, (v) => v + '%', () => draw());
  const frame = seg('Window frame', [['none', 'None'], ['light', 'Light'], ['dark', 'Dark']], 'dark', () => draw()), scale = seg('Size', [['1', 'Normal'], ['2', 'Double (sharp on big screens)']], '1');
  const view = h('div', { class: 'preview' }, h('p', { class: 'hint', text: 'Your screenshot shows here. You can also paste one.' })), out = h('div');
  const opts = (s = 1) => ({ bg: bg.value, c1: c1.value, c2: c2.value, pad: pad.value, radius: radius.value, shadow: shadow.value, frame: frame.value, scale: s });
  function draw() { if (src) view.replaceChildren(preview(beautify(src, opts(1)), 760)); }
  const go = button('Save PNG', { primary: true, icon: 'download' });
  go.addEventListener('click', () => busy(go, async () => { if (src) results(out, [{ name: outName(file.name || 'screenshot.png', 'png', 'beautified'), blob: await encode(beautify(src, opts(+scale.value)), 'png') }]); }));
  root.append(dropzone({ accept: ACCEPT, label: 'Choose or paste a screenshot', onFiles: async ([f]) => { file = f; src = await decode(f); draw(); } }),
    h('div', { class: 'cols' }, panel(bg.el, h('div', { class: 'row' }, field('From', c1), field('To', c2)), pad.el, radius.el, shadow.el, frame.el, scale.el, go, out), panel(view)));
}
