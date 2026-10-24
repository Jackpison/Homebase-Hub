// Watermark and Page Numbers: text or a logo on every page, and page numbers in the style you like.
import { h, field, input, select, range, check, button, dropzone, panel, busy, note, toast } from '../ui.js';
import { decode, encode, results } from '../lib/image.js';
import { loadLib, lib, pdfBlob, pdfName, ranges } from '../lib/pdf.js';

const POS = [['bc', 'Bottom centre'], ['br', 'Bottom right'], ['bl', 'Bottom left'], ['tc', 'Top centre'], ['tr', 'Top right'], ['tl', 'Top left']];
const STYLES = [['n', '1'], ['page', 'Page 1'], ['of', 'Page 1 of 9'], ['slash', '1 / 9'], ['dash', '- 1 -']];
const fmtNum = (s, n, total) => ({ n: String(n), page: 'Page ' + n, of: 'Page ' + n + ' of ' + total, slash: n + ' / ' + total, dash: '- ' + n + ' -' })[s];
const rgbOf = (hex, rgb) => { const v = parseInt(hex.slice(1), 16); return rgb(((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255); };
export default function (root) {
  let file = null, logo = null;
  const wm = check('Add a watermark', true), text = input({ value: 'CONFIDENTIAL', 'aria-label': 'Watermark text' }), wsize = range('Size', 12, 120, 1, 60, (v) => v + ' pt'), op = range('Opacity', 5, 100, 1, 20, (v) => v + '%'), angle = range('Angle', -90, 90, 1, 45, (v) => v + '°'), wcol = h('input', { type: 'color', value: '#c62828' });
  const logoZone = dropzone({ accept: 'image/*', label: 'Or use a logo instead of text', hint: 'A PNG with a see-through background works best.', onFiles: async ([f]) => { logo = await decode(f); toast('The logo will be used instead of the text.'); } });
  const lsize = range('Logo width', 5, 90, 1, 40, (v) => v + '% of the page');
  const nums = check('Add page numbers', true), style = select(STYLES, 'of'), pos = select(POS, 'bc'), start = input({ type: 'number', min: 0, value: 1, 'aria-label': 'First number' }), nsize = range('Number size', 6, 24, 1, 10, (v) => v + ' pt'), skip = check('No number on the first page', false);
  const rg = input({ placeholder: 'All pages, or e.g. 2-10', 'aria-label': 'Pages' }), info = h('p', { class: 'hint' }), out = h('div');
  const go = button('Stamp and Save', { primary: true, icon: 'stamp' });
  go.addEventListener('click', () => busy(go, async () => {
    if (!file) return; if (!wm.value && !nums.value) { toast('Choose a watermark, page numbers or both.', true); return; }
    const d = await loadLib(file), { StandardFonts, rgb, degrees } = await lib(), font = await d.embedFont(StandardFonts.Helvetica), bold = await d.embedFont(StandardFonts.HelveticaBold);
    const pages = d.getPages(), total = pages.length, pick = rg.value.trim() ? new Set(ranges(rg.value, total).flatMap(([a, z]) => Array.from({ length: z - a + 1 }, (_, j) => a + j))) : null;
    const img = wm.value && logo ? await d.embedPng(new Uint8Array(await (await encode(logo, 'png')).arrayBuffer())) : null;
    try {
      pages.forEach((p, i) => {
        if (pick && !pick.has(i)) return;
        const { width: W, height: H } = p.getSize();
        if (wm.value && img) { const w = W * lsize.value / 100, ht = w * img.height / img.width; p.drawImage(img, { x: (W - w) / 2, y: (H - ht) / 2, width: w, height: ht, opacity: op.value / 100 }); }
        else if (wm.value && text.value.trim()) {
          const s = wsize.value, tw = bold.widthOfTextAtSize(text.value, s), a = angle.value * Math.PI / 180;
          p.drawText(text.value, { x: W / 2 - Math.cos(a) * tw / 2 + Math.sin(a) * s / 3, y: H / 2 - Math.sin(a) * tw / 2 - Math.cos(a) * s / 3, size: s, font: bold, color: rgbOf(wcol.value, rgb), opacity: op.value / 100, rotate: degrees(angle.value) });
        }
        if (nums.value && !(skip.value && i === 0)) {
          const n = (+start.value || 0) + i - (skip.value ? 1 : 0), t = fmtNum(style.value, n, total - (skip.value ? 1 : 0) + (+start.value || 0) - 1), s = nsize.value, tw = font.widthOfTextAtSize(t, s), m = 28, [v, hz] = pos.value;
          p.drawText(t, { x: hz === 'l' ? m : hz === 'c' ? (W - tw) / 2 : W - tw - m, y: v === 'b' ? m - s / 3 : H - m, size: s, font, color: rgb(0.2, 0.2, 0.2) });
        }
      });
    } catch (e) { if (/WinAnsi|cannot encode/i.test(e.message)) throw new Error('Text stamps can use Latin letters only. For other scripts, use a logo image.'); throw e; }
    results(out, [{ name: pdfName(file.name, 'stamped'), blob: pdfBlob(await d.save()) }]);
  }));
  root.append(dropzone({ accept: '.pdf,application/pdf', label: 'Choose a PDF', onFiles: ([f]) => { file = f; info.textContent = f.name + ' chosen.'; out.replaceChildren(); } }), info,
    h('div', { class: 'cols' }, panel(wm.el, field('Watermark text', text), wsize.el, field('Colour', wcol), angle.el, op.el, logoZone, lsize.el),
      panel(nums.el, field('Style', style), field('Place', pos), field('First number', start), nsize.el, skip.el, field('Pages', rg), go, out, note('Stamps are drawn onto the pages: anyone can still see them, they are not a security feature.'))));
}
