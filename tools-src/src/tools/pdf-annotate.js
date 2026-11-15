// Fill and Annotate PDF: text, dates, ticks, crosses, highlights and white-out on forms and documents.
import { h, field, input, seg, range, button, dropzone, panel, busy, note, toast } from '../ui.js';
import { results } from '../lib/image.js';
import { openDoc, loadLib, lib, pdfBlob, pdfName } from '../lib/pdf.js';
import { placer } from '../lib/placer.js';

const today = () => new Date().toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
export default function (root) {
  let file = null, doc = null, pl = null;
  const tool = seg('Add', [['text', 'Text'], ['date', 'Date'], ['tick', 'Tick'], ['cross', 'Cross'], ['hl', 'Highlight'], ['white', 'White-out']], 'text');
  const text = input({ value: 'Your text', 'aria-label': 'Text to add' }), size = range('Text size', 6, 36, 1, 12, (v) => v + ' pt'), color = h('input', { type: 'color', value: '#111111' });
  const bw = range('Box width', 2, 90, 1, 25, (v) => v + '%', (v) => resize('w', v)), bh = range('Box height', 1, 30, 0.5, 3, (v) => v + '%', (v) => resize('h', v));
  function resize(k, v) { const it = pl && pl.selected(); if (it && (it.kind === 'hl' || it.kind === 'white')) { it[k] = v / 100; pl.paint(); } }
  const pageBox = h('div', { class: 'preview' }, h('p', { class: 'hint', text: 'Choose a PDF, pick what to add, then click on the page.' })), out = h('div');
  function place(fx, fy, n) {
    const k = tool.value, ptw = pl.ptw(), asp = pl.aspect();
    if (k === 'text' || k === 'date') { const t = k === 'date' ? today() : text.value; if (!t.trim()) { toast('Type the text first.', true); return null; } const s = size.value, w = Math.min(0.95, t.length * s * 0.55 / ptw + 0.01), ht = s * 1.3 / ptw * asp; return { page: n, kind: 'text', text: t, size: s, color: color.value, x: Math.min(1 - w, fx), y: Math.max(0, fy - ht / 2), w, h: ht }; }
    if (k === 'tick' || k === 'cross') { const w = size.value * 1.4 / ptw, ht = w * asp; return { page: n, kind: k, color: k === 'tick' ? '#137a48' : '#b42318', x: Math.max(0, fx - w / 2), y: Math.max(0, fy - ht / 2), w, h: ht }; }
    return { page: n, kind: k, x: Math.max(0, fx - bw.value / 200), y: Math.max(0, fy - bh.value / 200), w: bw.value / 100, h: bh.value / 100 };
  }
  function draw(it) {
    const el = h('div', { class: 'ann ann-' + it.kind });
    if (it.kind === 'text') { el.textContent = it.text; el.style.color = it.color; el.style.fontSize = (it.size / pl.ptw() * 100) + 'cqw'; }
    if (it.kind === 'tick') el.textContent = '✓'; if (it.kind === 'cross') el.textContent = '✗';
    if (it.kind === 'tick' || it.kind === 'cross') { el.style.color = it.color; el.style.fontSize = (it.w * 100) + 'cqw'; }
    return el;
  }
  const go = button('Save the PDF', { primary: true, icon: 'download' });
  go.addEventListener('click', () => busy(go, async () => {
    if (!pl || !pl.items.length) { toast('Click on the page to add something first.', true); return; }
    const d = await loadLib(file), { StandardFonts, rgb } = await lib(), font = await d.embedFont(StandardFonts.Helvetica), pages = d.getPages();
    const col = (hex) => { const v = parseInt(hex.slice(1), 16); return rgb(((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255); };
    try {
      for (const it of pl.items) {
        const p = pages[it.page - 1], r = await pl.at(it);
        if (it.kind === 'text') p.drawText(it.text, { x: r.x, y: r.y + r.h * 0.2, size: it.size, font, color: col(it.color) });
        else if (it.kind === 'hl') p.drawRectangle({ x: r.x, y: r.y, width: r.w, height: r.h, color: rgb(1, 0.9, 0.1), opacity: 0.38 });
        else if (it.kind === 'white') p.drawRectangle({ x: r.x, y: r.y, width: r.w, height: r.h, color: rgb(1, 1, 1) });
        else if (it.kind === 'tick') p.drawSvgPath('M 1 6 L 4.5 9.5 L 11 1.5', { x: r.x, y: r.y + r.h, scale: r.w / 12, borderColor: col(it.color), borderWidth: 1.6 });
        else { const t = Math.max(1, r.w / 8); p.drawLine({ start: { x: r.x, y: r.y }, end: { x: r.x + r.w, y: r.y + r.h }, thickness: t, color: col(it.color) }); p.drawLine({ start: { x: r.x, y: r.y + r.h }, end: { x: r.x + r.w, y: r.y }, thickness: t, color: col(it.color) }); }
      }
    } catch (e) { if (/WinAnsi|cannot encode/i.test(e.message)) throw new Error('Text can use Latin letters only for now. Remove other characters and try again.'); throw e; }
    results(out, [{ name: pdfName(file.name, 'filled'), blob: pdfBlob(await d.save()) }]);
  }));
  root.append(dropzone({ accept: '.pdf,application/pdf', label: 'Choose a PDF', onFiles: async ([f]) => { file = f; out.replaceChildren(); doc = await openDoc(f); pl = placer(doc, { onPlace: place, draw }); pageBox.replaceChildren(pl.el); } }),
    h('div', { class: 'cols pl' }, panel(pageBox), panel(tool.el, field('Text', text), size.el, field('Text colour', color), bw.el, bh.el, button('Remove the Selected Item', { icon: 'trash', onClick: () => pl && pl.removeSelected() }), go, out,
      note('Click to add; drag to move; select an item and use the arrow keys, or Delete to remove it. White-out hides what is under it on the page, but the text may still be in the file: for secrets, use Blur and Redact on an image.'))));
}
