// SVG to PNG: SVG files or code to sharp PNG, JPG or WebP at any size.
import { h, field, textarea, input, seg, check, button, dropzone, panel, busy, note, toast } from '../ui.js';
import { encode, canvas, outName, results, each } from '../lib/image.js';

/** The SVG's own size, from width and height or its viewBox. */
export function svgSize(text) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml'), s = doc.documentElement;
  if (!s || s.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) throw new Error('That is not valid SVG.');
  const num = (v) => (v && /^[\d.]+(px)?$/.test(v.trim()) ? parseFloat(v) : 0);
  let w = num(s.getAttribute('width')), ht = num(s.getAttribute('height'));
  const vb = (s.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
  if ((!w || !ht) && vb.length === 4 && vb[2] > 0 && vb[3] > 0) { if (w) ht = w * vb[3] / vb[2]; else if (ht) w = ht * vb[2] / vb[3]; else { w = vb[2]; ht = vb[3]; } }
  return { doc, w: w || 300, h: ht || 150 };
}
export async function render(text, width, bg) {
  const { doc, w, h: ht } = svgSize(text), W = Math.round(width), H = Math.round(width * ht / w), s = doc.documentElement;
  if (!s.getAttribute('viewBox')) s.setAttribute('viewBox', '0 0 ' + w + ' ' + ht);
  s.setAttribute('width', W); s.setAttribute('height', H);
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(s)], { type: 'image/svg+xml' })), img = new Image();
  try { img.src = url; await img.decode(); } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
  const c = canvas(W, H), x = c.getContext('2d'); if (bg) { x.fillStyle = bg; x.fillRect(0, 0, W, H); } x.drawImage(img, 0, 0, W, H); return c;
}
export default function (root) {
  let items = [];
  const code = textarea({ rows: 6, placeholder: '<svg xmlns="http://www.w3.org/2000/svg" …>', 'aria-label': 'SVG code' });
  const mode = seg('Size', [['w', 'Width in pixels'], ['x', 'Scale']], 'w', () => sizeBox()), width = input({ type: 'number', min: 1, max: 16384, value: 1024 }), scale = seg('', [['1', '1×'], ['2', '2×'], ['3', '3×'], ['4', '4×']], '2');
  const fmt = seg('Save as', [['png', 'PNG'], ['jpg', 'JPG'], ['webp', 'WebP']], 'png'), bgOn = check('Fill the background', false), bg = h('input', { type: 'color', value: '#ffffff' });
  const sb = h('div'), prog = h('p', { class: 'hint', 'aria-live': 'polite' }), out = h('div'), list = h('p', { class: 'hint' });
  function sizeBox() { sb.replaceChildren(mode.value === 'w' ? field('Width (the height follows)', width) : scale.el); }
  const go = button('Convert', { primary: true, icon: 'convert' });
  go.addEventListener('click', () => busy(go, async () => {
    const src = items.length ? items : code.value.trim() ? [{ name: 'image.svg', text: code.value }] : [];
    if (!src.length) { toast('Choose SVG files or paste SVG code.', true); return; }
    const f = fmt.value, back = f === 'jpg' ? (bgOn.value ? bg.value : '#ffffff') : bgOn.value ? bg.value : null;
    results(out, await each(src, prog, async (it) => { const { w } = svgSize(it.text); const W = mode.value === 'w' ? Math.min(16384, Math.max(1, +width.value || 1024)) : w * +scale.value; return { name: outName(it.name, f), blob: await encode(await render(it.text, W, back), f, 0.92) }; }), 'svg-images.zip');
  }));
  sizeBox();
  root.append(dropzone({ accept: '.svg,image/svg+xml', multiple: true, label: 'Choose SVG files', onFiles: async (fs) => { items = await Promise.all(fs.map(async (f) => ({ name: f.name, text: await f.text() }))); list.textContent = fs.length + ' SVG file' + (fs.length > 1 ? 's' : '') + ' chosen.'; } }),
    h('div', { class: 'cols' }, panel(list, field('Or paste SVG code', code), note('Files you choose are used first; the code box is used when no file is chosen.')), panel(mode.el, sb, fmt.el, h('div', { class: 'row' }, bgOn.el, bg), go, prog, out)));
}
