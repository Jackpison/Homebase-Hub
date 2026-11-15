// Image Editor: brightness, contrast, saturation, warmth, sharpness and one-tap filters, with a before and after view.
import { h, field, range, seg, select, button, dropzone, panel, busy } from '../ui.js';
import { ACCEPT, decode, encode, canvas, sameFormat, outName, results, preview, scaled, FORMATS } from '../lib/image.js';

const PRESETS = { none: {}, vivid: { contrast: 15, sat: 35 }, bw: { mono: 1, contrast: 10 }, sepia: { sepia: 1 }, cool: { warm: -35, sat: 5 }, warm: { warm: 35, sat: 10 }, fade: { contrast: -25, bright: 10, sat: -20 }, dramatic: { contrast: 40, sat: -10, sharp: 40 } };
const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
export function adjust(src, v) {
  const c = canvas(src.width, src.height), x = c.getContext('2d'); x.drawImage(src, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  const C = (v.contrast || 0) * 2.55, f = (259 * (C + 255)) / (255 * (259 - C)), br = (v.bright || 0) * 1.28, sat = 1 + (v.sat || 0) / 100, wm = (v.warm || 0) * 0.35;
  for (let i = 0; i < p.length; i += 4) {
    let r = p[i] + br, g = p[i + 1] + br, b = p[i + 2] + br;
    r = f * (r - 128) + 128; g = f * (g - 128) + 128; b = f * (b - 128) + 128;
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    if (v.mono) { r = g = b = gray; } else { r = gray + (r - gray) * sat; g = gray + (g - gray) * sat; b = gray + (b - gray) * sat; }
    if (v.sepia) { const R = r, G = g, B = b; r = 0.393 * R + 0.769 * G + 0.189 * B; g = 0.349 * R + 0.686 * G + 0.168 * B; b = 0.272 * R + 0.534 * G + 0.131 * B; }
    r += wm; b -= wm;
    p[i] = clamp(r); p[i + 1] = clamp(g); p[i + 2] = clamp(b);
  }
  const a = (v.sharp || 0) / 100 * 1.2;
  if (a > 0) {
    const w = c.width, s = new Uint8ClampedArray(p);
    for (let y = 1; y < c.height - 1; y++) for (let xx = 1; xx < w - 1; xx++) { const o = (y * w + xx) * 4; for (let k = 0; k < 3; k++) p[o + k] = clamp(s[o + k] * (1 + 4 * a) - a * (s[o + k - 4] + s[o + k + 4] + s[o + k - w * 4] + s[o + k + w * 4])); }
  }
  x.putImageData(d, 0, 0); return c;
}

export default function (root) {
  let file = null, full = null, small = null, showOrig = false;
  const S = { bright: range('Brightness', -100, 100, 1, 0, String, () => draw()), contrast: range('Contrast', -100, 100, 1, 0, String, () => draw()), sat: range('Saturation', -100, 100, 1, 0, String, () => draw()),
    warm: range('Warmth', -100, 100, 1, 0, String, () => draw()), sharp: range('Sharpness', 0, 100, 1, 0, String, () => draw()) };
  let fx = {};
  const filters = seg('Filters', [['none', 'None'], ['vivid', 'Vivid'], ['bw', 'Black and White'], ['sepia', 'Sepia'], ['cool', 'Cool'], ['warm', 'Warm'], ['fade', 'Fade'], ['dramatic', 'Dramatic']], 'none', (k) => {
    const p = PRESETS[k]; fx = { mono: p.mono, sepia: p.sepia }; for (const n of Object.keys(S)) S[n].value = p[n] || 0; draw(); });
  const fmt = select([['same', 'Same as the original'], ...FORMATS], 'same');
  const view = h('div', { class: 'preview' }, h('p', { class: 'hint', text: 'Your photo shows here.' })), out = h('div');
  const vals = () => ({ ...Object.fromEntries(Object.entries(S).map(([k, r]) => [k, r.value])), ...fx });
  function draw() { if (small) view.replaceChildren(preview(showOrig ? small : adjust(small, vals()), 760)); }
  const cmp = button('Hold to See the Original', { icon: 'eye' });
  const on = () => { showOrig = true; draw(); }, off = () => { showOrig = false; draw(); };
  cmp.addEventListener('pointerdown', on); cmp.addEventListener('pointerup', off); cmp.addEventListener('pointerleave', off);
  cmp.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') on(); }); cmp.addEventListener('keyup', off);
  const go = button('Save', { primary: true, icon: 'download' });
  go.addEventListener('click', () => busy(go, async () => {
    if (!full) return; const f = fmt.value === 'same' ? sameFormat(file) : fmt.value;
    results(out, [{ name: outName(file.name, f, 'edited'), blob: await encode(adjust(full, vals()), f, 0.92), before: file.size }]);
  }));
  root.append(dropzone({ accept: ACCEPT, label: 'Choose a photo', onFiles: async ([f]) => { file = f; full = await decode(f); small = full.width > 1000 ? scaled(full, 1000 / full.width) : full; out.replaceChildren(); draw(); } }),
    h('div', { class: 'cols' }, panel(filters.el, ...Object.values(S).map((r) => r.el), field('Save as', fmt), h('div', { class: 'row' }, go, button('Reset', { onClick: () => { for (const r of Object.values(S)) r.value = 0; fx = {}; draw(); } })), out),
      panel(view, cmp)));
}
