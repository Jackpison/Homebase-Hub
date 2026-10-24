// Sign PDF: draw, type or upload your signature and place it anywhere on the pages.
import { h, field, input, select, seg, range, check, button, dropzone, panel, busy, note, toast } from '../ui.js';
import { decode, encode, canvas, results } from '../lib/image.js';
import { openDoc, loadLib, pdfBlob, pdfName } from '../lib/pdf.js';
import { placer } from '../lib/placer.js';

const FONTS = [['"Segoe Script","Brush Script MT","Snell Roundhand","Apple Chancery",cursive', 'Handwritten'], ['"Lucida Handwriting","Bradley Hand",cursive', 'Flowing'], ['Georgia,"Times New Roman",serif', 'Formal']];
/** The signature cut to its own size (see-through around it). */
export function trim(c) {
  const x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height).data; let a = c.width, b = c.height, r = -1, bt = -1;
  for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) if (d[(y * c.width + xx) * 4 + 3] > 10) { if (xx < a) a = xx; if (xx > r) r = xx; if (y < b) b = y; if (y > bt) bt = y; }
  if (r < 0) return null;
  const o = canvas(r - a + 9, bt - b + 9); o.getContext('2d').drawImage(c, a - 4, b - 4, o.width, o.height, 0, 0, o.width, o.height); return o;
}
function whiteToClear(src) { const c = canvas(src.width, src.height), x = c.getContext('2d'); x.drawImage(src, 0, 0); const d = x.getImageData(0, 0, c.width, c.height), p = d.data; for (let i = 0; i < p.length; i += 4) { const l = (p[i] + p[i + 1] + p[i + 2]) / 3; if (l > 200) p[i + 3] = Math.max(0, Math.round((255 - l) * 4.6)); } x.putImageData(d, 0, 0); return c; }

export default function (root) {
  let file = null, doc = null, pl = null, sig = null, sigUrl = '';
  const area = h('div'), pageBox = h('div', { class: 'preview' }, h('p', { class: 'hint', text: 'Choose a PDF, make your signature, then click on the page where it goes.' })), out = h('div');
  const ink = select([['#111111', 'Black'], ['#1a3fa0', 'Blue']], '#111111');
  const set = (c) => { sig = c ? trim(c) : null; sigUrl = sig ? sig.toDataURL('image/png') : ''; prev.replaceChildren(sig ? h('img', { src: sigUrl, alt: 'Your signature', class: 'sigprev' }) : ''); };
  const prev = h('div', { class: 'preview' });
  const kind = seg('Signature', [['draw', 'Draw'], ['type', 'Type'], ['upload', 'Upload']], 'draw', () => show());
  function show() {
    if (kind.value === 'draw') {
      const pad = canvas(600, 200); pad.className = 'pad'; pad.setAttribute('aria-label', 'Draw your signature here with the mouse, a pen or a finger'); pad.setAttribute('role', 'img');
      const x = pad.getContext('2d'); let down = false, last = null;
      const at = (e) => { const r = pad.getBoundingClientRect(); return [(e.clientX - r.left) * pad.width / r.width, (e.clientY - r.top) * pad.height / r.height]; };
      pad.addEventListener('pointerdown', (e) => { down = true; last = at(e); pad.setPointerCapture(e.pointerId); });
      pad.addEventListener('pointermove', (e) => { if (!down) return; const p = at(e); x.strokeStyle = ink.value; x.lineWidth = 3.2; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); x.moveTo(...last); x.lineTo(...p); x.stroke(); last = p; });
      pad.addEventListener('pointerup', () => { down = false; set(pad); });
      area.replaceChildren(field('Ink', ink), pad, button('Clear', { onClick: () => { x.clearRect(0, 0, pad.width, pad.height); set(null); } }));
    } else if (kind.value === 'type') {
      const name = input({ placeholder: 'Your name', 'aria-label': 'Your name' }), font = select(FONTS, FONTS[0][0]);
      const make = () => { const c = canvas(900, 220), x = c.getContext('2d'); x.fillStyle = ink.value; x.font = '96px ' + font.value; x.textBaseline = 'middle'; x.fillText(name.value, 20, 110); set(name.value.trim() ? c : null); };
      for (const el of [name, font, ink]) el.addEventListener('input', make);
      area.replaceChildren(field('Your name', name), field('Style', font), field('Ink', ink));
    } else {
      const clear = check('Make a white background see-through', true);
      area.replaceChildren(dropzone({ accept: 'image/*', label: 'Upload a picture of your signature', onFiles: async ([f]) => { const c = await decode(f); set(clear.value ? whiteToClear(c) : c); } }), clear.el);
    }
  }
  const size = range('Size of the selected signature', 5, 60, 1, 25, (v) => v + '% of the page width', (v) => { const it = pl && pl.selected(); if (it) { const r = it.h / it.w; it.w = v / 100; it.h = it.w * r; pl.paint(); } });
  function place(fx, fy, n) {
    if (!sig) { toast('Make your signature first.', true); return null; }
    const w = size.value / 100, ht = w * sig.height / sig.width * pl.aspect();
    return { page: n, x: Math.max(0, Math.min(1 - w, fx - w / 2)), y: Math.max(0, Math.min(1 - ht, fy - ht / 2)), w, h: ht, url: sigUrl, sig };
  }
  const draw = (it) => h('img', { src: it.url, alt: 'Signature', draggable: 'false' });
  const all = button('Put It on Every Page', { icon: 'layers', onClick: () => { const it = pl && pl.selected(); if (!it) { toast('Click a signature on the page first.', true); return; } for (let p = 1; p <= doc.numPages; p++) if (p !== it.page) pl.items.push({ ...it, page: p }); pl.paint(); toast('Added to all ' + doc.numPages + ' pages.'); } });
  const go = button('Save the Signed PDF', { primary: true, icon: 'download' });
  go.addEventListener('click', () => busy(go, async () => {
    if (!pl || !pl.items.length) { toast('Click on the page to place your signature first.', true); return; }
    const d = await loadLib(file), pages = d.getPages(), cache = new Map();
    for (const it of pl.items) {
      if (!cache.has(it.sig)) cache.set(it.sig, await d.embedPng(new Uint8Array(await (await encode(it.sig, 'png')).arrayBuffer())));
      const r = await pl.at(it); pages[it.page - 1].drawImage(cache.get(it.sig), { x: r.x, y: r.y, width: r.w, height: r.h });
    }
    results(out, [{ name: pdfName(file.name, 'signed'), blob: pdfBlob(await d.save()) }]);
  }));
  show();
  root.append(dropzone({ accept: '.pdf,application/pdf', label: 'Choose a PDF', onFiles: async ([f]) => { file = f; out.replaceChildren(); doc = await openDoc(f); pl = placer(doc, { onPlace: place, draw }); pageBox.replaceChildren(pl.el); } }),
    h('div', { class: 'cols pl sign' }, panel(pageBox), panel(kind.el, area, h('h2', { text: 'Your signature' }), prev, size.el, all, go, out,
      note('Click on the page to place it; drag to move it; select it and press Delete to remove it. This is a picture of your signature, not a digital certificate.'))));
}
