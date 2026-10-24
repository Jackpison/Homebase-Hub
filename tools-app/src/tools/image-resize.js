// Image Resizer: by pixels or percentage with the aspect ratio locked, social media sizes, and an optional size cap.
import { h, seg, range, input, select, check, button, dropzone, panel, busy, field } from '../ui.js';
import { ACCEPT, FORMATS, decode, encode, toTarget, canvas, resized, sameFormat, outName, results, each } from '../lib/image.js';

const PRESETS = [['ig-sq', 'Instagram post, square (1080 × 1080)', 1080, 1080], ['ig-pt', 'Instagram post, portrait (1080 × 1350)', 1080, 1350], ['story', 'Story or Reel (1080 × 1920)', 1080, 1920],
  ['x', 'X post (1600 × 900)', 1600, 900], ['fb', 'Facebook cover (1640 × 624)', 1640, 624], ['yt', 'YouTube thumbnail (1280 × 720)', 1280, 720], ['li', 'LinkedIn banner (1584 × 396)', 1584, 396], ['wa', 'WhatsApp profile (500 × 500)', 500, 500]];
/** New size for an image, following the chosen mode. */
export function size(w, ht, o) {
  if (o.mode === 'pct') return [Math.max(1, Math.round(w * o.pct / 100)), Math.max(1, Math.round(ht * o.pct / 100))];
  if (o.mode === 'px') { let W = +o.w || 0, H = +o.h || 0; if (o.lock) { if (W) H = Math.round(W * ht / w); else if (H) W = Math.round(H * w / ht); } return [Math.max(1, W || w), Math.max(1, H || ht)]; }
  const p = PRESETS.find((x) => x[0] === o.preset); return [p[2], p[3]];
}
function place(src, W, H, fill) {
  if (!fill) { const s = Math.min(W / src.width, H / src.height); return resized(src, Math.round(src.width * s), Math.round(src.height * s)); }
  const s = Math.max(W / src.width, H / src.height), c = canvas(W, H), x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
  x.drawImage(src, (W - src.width * s) / 2, (H - src.height * s) / 2, src.width * s, src.height * s); return c;
}
export default function (root) {
  let files = [];
  const mode = seg('Resize by', [['px', 'Pixels'], ['pct', 'Percentage'], ['preset', 'Social sizes']], 'px', () => box());
  const w = input({ type: 'number', min: 1, placeholder: 'Width', 'aria-label': 'Width' }), ht = input({ type: 'number', min: 1, placeholder: 'Height', 'aria-label': 'Height' }), lock = check('Keep the shape (aspect ratio)', true);
  const pct = range('Percentage', 1, 400, 1, 50, (v) => v + '%'), preset = select(PRESETS.map((p) => [p[0], p[1]]), 'ig-sq'), fit = seg('Fit', [['fill', 'Fill and crop'], ['fit', 'Fit inside']], 'fill');
  const capOn = check('Keep each file under', false), cap = input({ type: 'number', min: 10, value: 500, 'aria-label': 'Size cap in KB' });
  const fmt = select([['same', 'Same as the original'], ...FORMATS], 'same'), b = h('div'), list = h('p', { class: 'hint' }), prog = h('p', { class: 'hint', 'aria-live': 'polite' }), out = h('div');
  function box() { b.replaceChildren(...(mode.value === 'px' ? [h('div', { class: 'row' }, field('Width (px)', w), field('Height (px)', ht)), lock.el, h('p', { class: 'hint', text: 'Leave one empty and it follows the shape of each image.' })] : mode.value === 'pct' ? [pct.el] : [field('Size', preset), fit.el])); }
  const go = button('Resize', { primary: true, icon: 'resize' });
  go.addEventListener('click', () => busy(go, async () => {
    if (!files.length) return;
    const o = { mode: mode.value, w: w.value, h: ht.value, lock: lock.value, pct: pct.value, preset: preset.value };
    results(out, await each(files, prog, async (file) => {
      const src = await decode(file), [W, H] = size(src.width, src.height, o), f = fmt.value === 'same' ? sameFormat(file) : fmt.value;
      const c = o.mode === 'preset' ? place(src, W, H, fit.value === 'fill') : resized(src, W, H);
      const blob = capOn.value ? await toTarget(c, f, Math.max(10, +cap.value || 500) * 1024) : await encode(c, f, 0.9);
      return { name: outName(file.name, f, c.width + 'x' + c.height), blob, before: file.size };
    }), 'resized.zip');
  }));
  box();
  root.append(dropzone({ accept: ACCEPT, multiple: true, label: 'Choose images', onFiles: (fs) => { files = fs; list.textContent = fs.length + (fs.length === 1 ? ' image chosen.' : ' images chosen.'); out.replaceChildren(); } }),
    panel(list, mode.el, b, h('div', { class: 'row' }, capOn.el, cap, h('span', { class: 'hint', text: 'KB' })), field('Save as', fmt), go, prog, out));
}
