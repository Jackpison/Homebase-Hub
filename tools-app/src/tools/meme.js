// Meme and Text on Image: bold captions or any text, with fonts, outline and shadow; drag the text to place it.
import { h, field, input, select, range, check, button, dropzone, panel, busy } from '../ui.js';
import { ACCEPT, decode, encode, canvas, outName, results, scaled } from '../lib/image.js';

const FONTS = [['Impact, "Arial Black", sans-serif', 'Impact'], ['"Arial Black", Arial, sans-serif', 'Arial Black'], ['Georgia, serif', 'Georgia'], ['"Courier New", monospace', 'Courier'], ['"Comic Sans MS", "Comic Neue", cursive', 'Comic'], ['system-ui, sans-serif', 'System']];
export function paint(src, texts) {
  const c = canvas(src.width, src.height), x = c.getContext('2d'); x.drawImage(src, 0, 0);
  for (const t of texts) {
    const s = Math.max(8, c.width * t.size / 100), lines = (t.upper ? t.text.toUpperCase() : t.text).split('\n');
    x.font = '700 ' + s + 'px ' + t.font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    lines.forEach((ln, i) => {
      const px = t.x * c.width, py = t.y * c.height + (i - (lines.length - 1) / 2) * s * 1.1;
      if (t.shadow) { x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = s / 6; x.shadowOffsetY = s / 20; }
      if (t.outline) { x.lineWidth = s * t.outline / 100; x.strokeStyle = t.stroke; x.strokeText(ln, px, py); }
      x.shadowColor = 'transparent'; x.fillStyle = t.color; x.fillText(ln, px, py);
    });
  }
  return c;
}
export default function (root) {
  let file = null, src = null, small = null, sel = 0;
  const T = [{ text: 'TOP TEXT', x: 0.5, y: 0.1 }, { text: 'BOTTOM TEXT', x: 0.5, y: 0.9 }].map((t) => ({ size: 9, color: '#ffffff', stroke: '#000000', outline: 12, font: FONTS[0][0], upper: true, shadow: false, ...t }));
  const pick = select([], 0, { 'aria-label': 'Which text' }), text = h('textarea', { class: 'inp', rows: 2, 'aria-label': 'Text' }), font = select(FONTS, FONTS[0][0]);
  const size = range('Size', 2, 30, 0.5, 9, (v) => v + '%'), outline = range('Outline', 0, 30, 1, 12, (v) => v ? v + '%' : 'None'), color = h('input', { type: 'color' }), stroke = h('input', { type: 'color' });
  const upper = check('CAPITAL LETTERS', true), shadow = check('Shadow', false);
  const view = h('div', { class: 'preview' }, h('p', { class: 'hint', text: 'Your picture shows here. Drag the text to move it.' })), out = h('div');
  function fill() { pick.replaceChildren(...T.map((t, i) => h('option', { value: String(i), text: (i + 1) + ': ' + (t.text.split('\n')[0] || '(empty)').slice(0, 30), selected: i === sel }))); const t = T[sel]; if (!t) return; text.value = t.text; font.value = t.font; size.value = t.size; outline.value = t.outline; color.value = t.color; stroke.value = t.stroke; upper.box.checked = t.upper; shadow.box.checked = t.shadow; }
  function take() { const t = T[sel]; if (!t) return; Object.assign(t, { text: text.value, font: font.value, size: size.value, outline: outline.value, color: color.value, stroke: stroke.value, upper: upper.value, shadow: shadow.value }); pick.options[sel] && (pick.options[sel].text = (sel + 1) + ': ' + (t.text.split('\n')[0] || '(empty)').slice(0, 30)); draw(); }
  for (const el of [text, font, color, stroke]) el.addEventListener('input', take);
  for (const r of [size, outline]) r.input.addEventListener('input', take);
  for (const c of [upper, shadow]) c.box.addEventListener('change', take);
  pick.addEventListener('change', () => { sel = +pick.value; fill(); });
  let pv = null, drag = null;
  function draw() {
    if (!src) return; pv = paint(small, T); pv.setAttribute('role', 'img'); pv.setAttribute('aria-label', 'Preview'); pv.style.touchAction = 'none'; pv.style.cursor = 'move';
    pv.addEventListener('pointerdown', (e) => { const r = pv.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height; let best = -1, bd = 1; T.forEach((t, i) => { const d = Math.hypot(t.x - fx, (t.y - fy) * r.height / r.width); if (d < bd) { bd = d; best = i; } }); if (best >= 0 && bd < 0.25) { sel = best; fill(); drag = { r }; pv.setPointerCapture(e.pointerId); } });
    pv.addEventListener('pointermove', (e) => { if (!drag) return; const t = T[sel]; t.x = Math.min(1, Math.max(0, (e.clientX - drag.r.left) / drag.r.width)); t.y = Math.min(1, Math.max(0, (e.clientY - drag.r.top) / drag.r.height)); requestAnimationFrame(draw); });
    pv.addEventListener('pointerup', () => { drag = null; });
    view.replaceChildren(pv);
  }
  const go = button('Save', { primary: true, icon: 'download' });
  go.addEventListener('click', () => busy(go, async () => { if (src) results(out, [{ name: outName(file.name, 'jpg', 'meme'), blob: await encode(paint(src, T), 'jpg', 0.92) }]); }));
  fill();
  root.append(dropzone({ accept: ACCEPT, label: 'Choose a picture', onFiles: async ([f]) => { file = f; src = await decode(f); small = src.width > 900 ? scaled(src, 900 / src.width) : src; out.replaceChildren(); draw(); } }),
    h('div', { class: 'cols' }, panel(view), panel(h('div', { class: 'row' }, h('div', { class: 'grow' }, field('Text', pick)), button('Add Text', { icon: 'plus', onClick: () => { T.push({ ...T[sel] || T[0], text: 'NEW TEXT', x: 0.5, y: 0.5 }); sel = T.length - 1; fill(); draw(); } }), button('Remove', { icon: 'trash', onClick: () => { if (T.length) { T.splice(sel, 1); sel = Math.max(0, sel - 1); fill(); draw(); } } })),
      field('Words', text), field('Font', font), size.el, h('div', { class: 'row' }, field('Colour', color), field('Outline colour', stroke)), outline.el, upper.el, shadow.el, go, out)));
}
