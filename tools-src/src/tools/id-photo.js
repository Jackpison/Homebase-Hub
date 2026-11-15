// Passport and ID Photo: crop to a standard photo size at 300 dpi, then print copies on one sheet.
import { h, field, select, input, seg, check, button, dropzone, panel, busy, note } from '../ui.js';
import { ACCEPT, decode, encode, canvas, outName, results } from '../lib/image.js';
import { cropper, cut } from '../lib/cropper.js';

const MM = 300 / 25.4;   // pixels per millimetre at 300 dpi
const SIZES = [['35x45', '35 × 45 mm (a common passport and visa size)', 35, 45], ['51x51', '2 × 2 in (51 × 51 mm)', 50.8, 50.8], ['33x48', '33 × 48 mm', 33, 48], ['40x50', '40 × 50 mm', 40, 50], ['30x40', '30 × 40 mm', 30, 40], ['25x35', '25 × 35 mm', 25, 35]];
const SHEETS = [['4x6', '4 × 6 in photo paper (102 × 152 mm)', 101.6, 152.4], ['a4', 'A4 paper (210 × 297 mm)', 210, 297], ['letter', 'US Letter (216 × 279 mm)', 215.9, 279.4]];
/** Copies of one photo on a sheet, with a small gap and thin cut lines. */
export function sheet(photo, sheetMm, pmm, lines) {
  const S = canvas(sheetMm[0] * MM, sheetMm[1] * MM), x = S.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, S.width, S.height);
  const gap = 3 * MM, pw = pmm[0] * MM, ph = pmm[1] * MM, cols = Math.max(1, Math.floor((S.width - gap) / (pw + gap))), rows = Math.max(1, Math.floor((S.height - gap) / (ph + gap)));
  const ox = (S.width - cols * pw - (cols - 1) * gap) / 2, oy = (S.height - rows * ph - (rows - 1) * gap) / 2;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const px = ox + c * (pw + gap), py = oy + r * (ph + gap); x.drawImage(photo, px, py, pw, ph); if (lines) { x.strokeStyle = '#bbb'; x.lineWidth = 1; x.strokeRect(px - 0.5, py - 0.5, pw + 1, ph + 1); } }
  return { canvas: S, count: rows * cols };
}
export default function (root) {
  let file = null, src = null, cr = null;
  const size = select(SIZES.map((s) => [s[0], s[1]]), '35x45', { onChange: () => cr && cr.setRatio(ratio()) }), cw = input({ type: 'number', min: 10, max: 100, value: 35, 'aria-label': 'Width in mm' }), chh = input({ type: 'number', min: 10, max: 100, value: 45, 'aria-label': 'Height in mm' });
  const custom = check('Another size', false, () => { cbox.hidden = !custom.value; cr && cr.setRatio(ratio()); }), cbox = h('div', { class: 'row', hidden: true }, field('Width (mm)', cw), field('Height (mm)', chh));
  for (const el of [cw, chh]) el.addEventListener('input', () => cr && cr.setRatio(ratio()));
  const mm = () => (custom.value ? [Math.max(10, +cw.value || 35), Math.max(10, +chh.value || 45)] : SIZES.find((s) => s[0] === size.value).slice(2));
  const ratio = () => { const [w, hh] = mm(); return w / hh; };
  const sheetSel = select(SHEETS.map((s) => [s[0], s[1]]), '4x6'), lines = check('Thin cut lines', true), kind = seg('Save', [['photo', 'One photo'], ['sheet', 'A print sheet']], 'sheet');
  const area = h('div', { class: 'preview' }, h('p', { class: 'hint', text: 'Your photo shows here. Put the head in the middle of the box, with a little space above it.' })), out = h('div');
  const go = button('Make and Save', { primary: true, icon: 'id' });
  go.addEventListener('click', () => busy(go, async () => {
    if (!cr) return; const [w, hh] = mm(), photo = cut(src, cr.get(), Math.round(w * MM), Math.round(hh * MM));
    if (kind.value === 'photo') { results(out, [{ name: outName(file.name, 'jpg', 'id-photo'), blob: await encode(photo, 'jpg', 0.95) }]); return; }
    const sh = SHEETS.find((s) => s[0] === sheetSel.value), s = sheet(photo, sh.slice(2), [w, hh], lines.value);
    results(out, [{ name: outName(file.name, 'jpg', 'id-sheet-' + sh[0]), blob: await encode(s.canvas, 'jpg', 0.95) }]);
    out.prepend(note(s.count + ' copies on the sheet. Print it at 100% (actual size), not "fit to page".'));
  }));
  root.append(note('Each country sets its own size, background and head position. Check the rules for your passport, visa or ID card before you print.'),
    dropzone({ accept: ACCEPT, label: 'Choose a photo', hint: 'A straight-on photo with an even, light background works best.', onFiles: async ([f]) => { file = f; src = await decode(f); cr = cropper(src, { ratio: ratio() }); area.replaceChildren(cr.el); out.replaceChildren(); } }),
    h('div', { class: 'cols' }, panel(area), panel(field('Photo size', size), custom.el, cbox, kind.el, field('Sheet', sheetSel), lines.el, go, out)));
}
