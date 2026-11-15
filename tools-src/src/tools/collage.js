// Collage Maker: 2 to 50 photos, 21 layouts, a title and a watermark. Export JPG, PNG, WebP or PDF.
import { h, field, input, select, range, seg, button, dropzone, panel, busy, note, toast } from '../ui.js';
import { ACCEPT, decode, encode, canvas, scaled, results } from '../lib/image.js';

const grid = (n, x, y, w, ht, cols, g) => { cols = Math.max(1, Math.min(cols, n)); const rows = Math.ceil(n / cols), ch = (ht - g * (rows - 1)) / rows;
  return Array.from({ length: n }, (_, i) => { const r = Math.floor(i / cols), c = i % cols, inRow = r === rows - 1 ? n - r * cols : cols, cw2 = (w - g * (inRow - 1)) / inRow; return { x: x + c * (cw2 + g), y: y + r * (ch + g), w: cw2, h: ch }; }); };
const autoCols = (n, w, ht) => Math.max(1, Math.round(Math.sqrt(n * w / ht)));
function masonry(ars, x, y, w, ht, cols, g) {
  const cw = (w - g * (cols - 1)) / cols, col = Array.from({ length: cols }, () => []), hs = new Array(cols).fill(0);
  ars.forEach((a, i) => { const k = hs.indexOf(Math.min(...hs)); col[k].push(i); hs[k] += cw / a; });
  const out = [];
  col.forEach((ids, k) => { const tot = ids.reduce((s, i) => s + cw / ars[i], 0), f = (ht - g * (ids.length - 1)) / (tot || 1); let yy = y; ids.forEach((i) => { const hh = cw / ars[i] * f; out[i] = { x: x + k * (cw + g), y: yy, w: cw, h: hh }; yy += hh + g; }); });
  return out;
}
function justified(ars, x, y, w, ht, rowFrac, g) {
  const target = ht * rowFrac, rows = []; let cur = [], sum = 0;
  ars.forEach((a, i) => { cur.push(i); sum += a; if (sum * target + g * (cur.length - 1) >= w) { rows.push(cur); cur = []; sum = 0; } });
  if (cur.length) rows.push(cur);
  const rh = rows.map((r) => (w - g * (r.length - 1)) / r.reduce((s, i) => s + ars[i], 0)), f = (ht - g * (rows.length - 1)) / rh.reduce((a, b) => a + b, 0), out = [];
  let yy = y; rows.forEach((r, k) => { const hh = rh[k] * f; let xx = x; const tw = r.reduce((s, i) => s + ars[i] * rh[k], 0), sx = (w - g * (r.length - 1)) / tw; r.forEach((i) => { const ww = ars[i] * rh[k] * sx; out[i] = { x: xx, y: yy, w: ww, h: hh }; xx += ww + g; }); yy += hh + g; });
  return out;
}
function featured(n, x, y, w, ht, side, g, share = 0.6) {
  if (n === 1) return [{ x, y, w, h: ht }];
  const rest = n - 1;
  if (side === 'top' || side === 'bottom') { const bh = (ht - g) * share, oh = ht - g - bh, big = { x, y: side === 'top' ? y : y + oh + g, w, h: bh }, oy = side === 'top' ? y + bh + g : y; return [big, ...grid(rest, x, oy, w, oh, Math.min(rest, Math.max(2, autoCols(rest, w, oh))), g)]; }
  const bw = (w - g) * share, ow = w - g - bw, big = { x: side === 'left' ? x : x + ow + g, y, w: bw, h: ht }, ox = side === 'left' ? x + bw + g : x;
  return [big, ...grid(rest, ox, y, ow, ht, Math.max(1, autoCols(rest, ow, ht)), g)];
}
export const LAYOUTS = [
  ['auto', 'Grid, automatic'], ...[2, 3, 4, 5, 6].map((c) => ['g' + c, 'Grid, ' + c + ' columns']), ...[2, 3, 4, 5].map((c) => ['m' + c, 'Masonry, ' + c + ' columns']),
  ['j1', 'Rows, small'], ['j2', 'Rows, medium'], ['j3', 'Rows, large'], ['ftop', 'Featured photo on top'], ['fbottom', 'Featured photo at the bottom'], ['fleft', 'Featured photo on the left'], ['fright', 'Featured photo on the right'],
  ['hero', 'Big photo with a strip below'], ['heroside', 'Big photo with a strip beside'], ['row', 'Film strip, one row'], ['col', 'Film strip, one column']];
export function layout(kind, ars, x, y, w, ht, g) {
  const n = ars.length;
  if (kind === 'auto') return grid(n, x, y, w, ht, autoCols(n, w, ht), g);
  if (/^g\d$/.test(kind)) return grid(n, x, y, w, ht, +kind[1], g);
  if (/^m\d$/.test(kind)) return masonry(ars, x, y, w, ht, Math.min(+kind[1], n), g);
  if (/^j\d$/.test(kind)) return justified(ars, x, y, w, ht, [0.22, 0.33, 0.5][+kind[1] - 1], g);
  if (kind.startsWith('f')) return featured(n, x, y, w, ht, kind.slice(1), g);
  if (kind === 'hero') return featured(n, x, y, w, ht, 'top', g, 0.75);
  if (kind === 'heroside') return featured(n, x, y, w, ht, 'left', g, 0.75);
  if (kind === 'row') return grid(n, x, y, w, ht, n, g);
  return grid(n, x, y, w, ht, 1, g);
}
const SIZES = [['sq', 'Square (2400 × 2400)', 2400, 2400], ['land', 'Landscape (3000 × 2000)', 3000, 2000], ['port', 'Portrait (2000 × 3000)', 2000, 3000], ['story', 'Story (1080 × 1920)', 1080, 1920], ['a4p', 'A4 portrait (300 dpi)', 2480, 3508], ['a4l', 'A4 landscape (300 dpi)', 3508, 2480]];
export function render(imgs, o) {
  const [W, H] = SIZES.find((s) => s[0] === o.size).slice(2), sc = W / 1000, c = canvas(W, H), x = c.getContext('2d'), g = o.gap * sc, m = o.gap * sc;
  x.fillStyle = o.bg; x.fillRect(0, 0, W, H);
  const th = o.title ? Math.round(H * 0.09) : 0, top = o.titlePos === 'top' ? th : 0;
  const rects = layout(o.layout, imgs.map((i) => i.width / i.height), m, m + top, W - m * 2, H - m * 2 - th, g);
  imgs.forEach((im, i) => { const r = rects[i]; if (!r) return; const s = Math.max(r.w / im.width, r.h / im.height), sw = r.w / s, sh = r.h / s;
    x.save(); x.beginPath(); x.roundRect(r.x, r.y, r.w, r.h, o.radius * sc); x.clip(); x.imageSmoothingQuality = 'high'; x.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, r.x, r.y, r.w, r.h); x.restore(); });
  if (o.title) { x.fillStyle = o.titleColor; x.font = '700 ' + Math.round(th * 0.55) + 'px system-ui, -apple-system, "Segoe UI", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(o.title, W / 2, o.titlePos === 'top' ? m / 2 + th / 2 : H - m / 2 - th / 2, W - m * 2); }
  if (o.mark) { x.globalAlpha = 0.6; x.fillStyle = '#ffffff'; x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 6 * sc; x.font = '600 ' + Math.round(22 * sc) + 'px system-ui, sans-serif'; x.textAlign = 'right'; x.textBaseline = 'bottom'; x.fillText(o.mark, W - m - 12 * sc, H - m - th * (o.titlePos === 'bottom' ? 1 : 0) - 10 * sc); x.globalAlpha = 1; }
  return c;
}
async function pdfOf(c, sizeKey) {
  const { PDFDocument } = await import('@cantoo/pdf-lib');
  const jpg = new Uint8Array(await (await encode(c, 'jpg', 0.92)).arrayBuffer()), doc = await PDFDocument.create(), img = await doc.embedJpg(jpg);
  const [pw, ph] = sizeKey === 'a4p' ? [595.28, 841.89] : sizeKey === 'a4l' ? [841.89, 595.28] : [c.width * 72 / 300, c.height * 72 / 300];
  doc.addPage([pw, ph]).drawImage(img, { x: 0, y: 0, width: pw, height: ph });
  return new Blob([await doc.save()], { type: 'application/pdf' });
}
export default function (root) {
  let imgs = [];
  const lay = select(LAYOUTS, 'auto', { onChange: () => draw() }), size = select(SIZES.map((s) => [s[0], s[1]]), 'sq', { onChange: () => draw() });
  const gap = range('Spacing', 0, 60, 1, 12, (v) => String(v), () => draw()), radius = range('Rounded corners', 0, 60, 1, 8, (v) => String(v), () => draw()), bg = h('input', { type: 'color', value: '#ffffff', onInput: () => draw() });
  const title = input({ placeholder: 'Optional', onInput: () => draw() }), titlePos = seg('Title place', [['top', 'Top'], ['bottom', 'Bottom']], 'top', () => draw()), titleColor = h('input', { type: 'color', value: '#1a1917', onInput: () => draw() });
  const mark = input({ placeholder: 'Optional, e.g. © Your Name', onInput: () => draw() }), fmt = seg('Save as', [['jpg', 'JPG'], ['png', 'PNG'], ['webp', 'WebP'], ['pdf', 'PDF']], 'jpg');
  const view = h('div', { class: 'preview' }, h('p', { class: 'hint', text: 'Your collage shows here.' })), thumbs = h('ul', { class: 'flist' }), out = h('div'), info = h('p', { class: 'hint', 'aria-live': 'polite' });
  const opts = () => ({ layout: lay.value, size: size.value, gap: gap.value, radius: radius.value, bg: bg.value, title: title.value.trim(), titlePos: titlePos.value, titleColor: titleColor.value, mark: mark.value.trim() });
  let timer = 0;
  function draw() { clearTimeout(timer); timer = setTimeout(() => { if (!imgs.length) return; const pv = scaled(render(imgs.map((i) => i.small), opts()), 760 / SIZES.find((s) => s[0] === size.value)[2]); pv.setAttribute('role', 'img'); pv.setAttribute('aria-label', 'Collage preview'); view.replaceChildren(pv); }, 60); }
  function list() {
    info.textContent = imgs.length + (imgs.length === 1 ? ' photo' : ' photos') + (imgs.length > 50 ? ': only the first 50 are used.' : '');
    thumbs.replaceChildren(...imgs.map((im, i) => h('li', {}, h('span', { text: (i + 1) + '. ' + im.name }),
      h('button', { type: 'button', class: 'ib', 'aria-label': 'Move ' + im.name + ' up', disabled: i === 0, onClick: () => { [imgs[i - 1], imgs[i]] = [imgs[i], imgs[i - 1]]; list(); draw(); } }, '↑'),
      h('button', { type: 'button', class: 'ib', 'aria-label': 'Remove ' + im.name, onClick: () => { imgs.splice(i, 1); list(); draw(); } }, '×'))));
  }
  const go = button('Save the Collage', { primary: true, icon: 'download' });
  go.addEventListener('click', () => busy(go, async () => {
    if (imgs.length < 2) { toast('Add at least 2 photos.', true); return; }
    const c = render(imgs.slice(0, 50).map((i) => i.full), opts()), f = fmt.value;
    results(out, [{ name: 'collage.' + f, blob: f === 'pdf' ? await pdfOf(c, size.value) : await encode(c, f, 0.92, bg.value) }]);
  }));
  root.append(dropzone({ accept: ACCEPT, multiple: true, label: 'Add photos', hint: '2 to 50 photos. Drop more to add them.', onFiles: async (fs) => {
    for (const f of fs) { if (imgs.length >= 50) break; try { const c = await decode(f), full = c.width > 2400 || c.height > 2400 ? scaled(c, 2400 / Math.max(c.width, c.height)) : c; imgs.push({ name: f.name, full, small: scaled(full, Math.min(1, 500 / Math.max(full.width, full.height))) }); } catch (e) { toast(f.name + ' could not be read.', true); } }
    list(); draw(); } }),
    h('div', { class: 'cols' }, panel(view, info, thumbs, button('Shuffle', { icon: 'refresh', onClick: () => { imgs.sort(() => Math.random() - 0.5); list(); draw(); } }), button('Remove All', { onClick: () => { imgs = []; list(); view.replaceChildren(h('p', { class: 'hint', text: 'Your collage shows here.' })); } })),
      panel(field('Layout (21)', lay), field('Size', size), gap.el, radius.el, field('Background', bg), field('Title', title), titlePos.el, field('Title colour', titleColor), field('Watermark', mark), fmt.el, go, out, note('The PDF holds the collage as one page.'))));
}
