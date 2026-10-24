// Images → PDF: JPG, PNG, HEIC or any images into one PDF; reorder pages, pick the page size and margins.
import { h, seg, range, button, dropzone, panel, busy, toast } from '../ui.js';
import { ACCEPT, decode, encode, results, scaled } from '../lib/image.js';
import { lib, pdfBlob } from '../lib/pdf.js';

const PT = 72 / 25.4, SIZE = { a4: [210, 297], letter: [215.9, 279.4] };
export default function (root) {
  let items = [];
  const size = seg('Page size', [['a4', 'A4'], ['letter', 'Letter'], ['fit', 'Same as each image']], 'a4'), orient = seg('Orientation', [['auto', 'Follow each image'], ['p', 'Portrait'], ['l', 'Landscape']], 'auto');
  const margin = range('Margin', 0, 30, 1, 10, (v) => v + ' mm'), quality = range('Image quality', 40, 100, 1, 85, (v) => v + '%');
  const list = h('ul', { class: 'flist' }), out = h('div'), prog = h('p', { class: 'hint', 'aria-live': 'polite' });
  function draw() {
    list.replaceChildren(...items.map((it, i) => h('li', {}, h('span', { text: (i + 1) + '. ' + it.name }),
      h('button', { type: 'button', class: 'ib', 'aria-label': 'Move ' + it.name + ' up', disabled: i === 0, onClick: () => { [items[i - 1], items[i]] = [items[i], items[i - 1]]; draw(); } }, '↑'),
      h('button', { type: 'button', class: 'ib', 'aria-label': 'Remove ' + it.name, onClick: () => { items.splice(i, 1); draw(); } }, '×'))));
  }
  const go = button('Make PDF', { primary: true, icon: 'filepdf' });
  go.addEventListener('click', () => busy(go, async () => {
    if (!items.length) { toast('Add some images first.', true); return; }
    const { PDFDocument } = await lib(), d = await PDFDocument.create(), m = margin.value * PT;
    for (const [k, it] of items.entries()) {
      prog.textContent = 'Page ' + (k + 1) + ' of ' + items.length + '…';
      let c = await decode(it.file); if (Math.max(c.width, c.height) > 3508) c = scaled(c, 3508 / Math.max(c.width, c.height));
      const img = await d.embedJpg(new Uint8Array(await (await encode(c, 'jpg', quality.value / 100)).arrayBuffer()));
      let pw, ph;
      if (size.value === 'fit') { pw = c.width * 72 / 150 + m * 2; ph = c.height * 72 / 150 + m * 2; }
      else { [pw, ph] = SIZE[size.value].map((v) => v * PT); const land = orient.value === 'l' || (orient.value === 'auto' && c.width > c.height); if (land) [pw, ph] = [ph, pw]; }
      const page = d.addPage([pw, ph]), s = Math.min((pw - m * 2) / img.width, (ph - m * 2) / img.height), w = img.width * s, ht = img.height * s;
      page.drawImage(img, { x: (pw - w) / 2, y: (ph - ht) / 2, width: w, height: ht });
    }
    prog.textContent = ''; results(out, [{ name: 'images.pdf', blob: pdfBlob(await d.save()) }]);
  }));
  root.append(dropzone({ accept: ACCEPT, multiple: true, label: 'Add images', onFiles: (fs) => { items.push(...fs.map((f) => ({ file: f, name: f.name }))); draw(); out.replaceChildren(); } }),
    h('div', { class: 'cols' }, panel(list), panel(size.el, orient.el, margin.el, quality.el, go, prog, out)));
}
