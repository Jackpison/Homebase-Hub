// An adjustable crop box over an image: drag to move, drag a corner to resize, or use the arrow keys (Shift + arrows resizes).
// The box is kept in the image's own pixels; get() returns {x, y, w, h}.
import { h } from '../ui.js';
import { canvas } from './image.js';

export function cropper(src, { ratio = null, round = false, onChange } = {}) {
  const f = Math.min(1, 900 / src.width), disp = canvas(src.width * f, src.height * f); disp.getContext('2d').drawImage(src, 0, 0, disp.width, disp.height);
  disp.setAttribute('aria-hidden', 'true');
  const box = h('div', { class: 'cbox' + (round ? ' round' : ''), tabindex: '0', role: 'group', 'aria-label': 'Crop area. Arrow keys move it; Shift and arrow keys change its size.' },
    ...['nw', 'ne', 'sw', 'se'].map((k) => h('span', { class: 'ch ' + k, dataset: { k } })));
  const wrap = h('div', { class: 'crop' }, disp, box);
  const W = src.width, H = src.height;
  let r = { x: 0, y: 0, w: W, h: H }, rat = ratio;
  const clamp = () => {
    r.w = Math.max(8, Math.min(r.w, W)); r.h = Math.max(8, Math.min(r.h, H));
    if (rat) { if (r.w / r.h > rat) r.w = r.h * rat; else r.h = r.w / rat; }
    r.x = Math.max(0, Math.min(r.x, W - r.w)); r.y = Math.max(0, Math.min(r.y, H - r.h));
  };
  const draw = () => { clamp(); Object.assign(box.style, { left: r.x / W * 100 + '%', top: r.y / H * 100 + '%', width: r.w / W * 100 + '%', height: r.h / H * 100 + '%' }); onChange && onChange(get()); };
  function setRatio(v, fill = 0.9) { rat = v; if (v) { let w = W * fill, ht = w / v; if (ht > H * fill) { ht = H * fill; w = ht * v; } r = { x: (W - w) / 2, y: (H - ht) / 2, w, h: ht }; } else r = { x: W * 0.05, y: H * 0.05, w: W * 0.9, h: H * 0.9 }; draw(); }
  function set(n) { r = { ...n }; draw(); }
  const get = () => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) });
  let drag = null;
  box.addEventListener('pointerdown', (e) => { e.preventDefault(); box.setPointerCapture(e.pointerId); const s = W / wrap.getBoundingClientRect().width; drag = { k: e.target.dataset.k || 'move', sx: e.clientX, sy: e.clientY, r0: { ...r }, s }; box.focus(); });
  box.addEventListener('pointermove', (e) => {
    if (!drag) return; const dx = (e.clientX - drag.sx) * drag.s, dy = (e.clientY - drag.sy) * drag.s, o = drag.r0;
    if (drag.k === 'move') r = { ...o, x: o.x + dx, y: o.y + dy };
    else {
      const L = drag.k.includes('w'), T = drag.k.includes('n');
      let w = o.w + (L ? -dx : dx), ht = o.h + (T ? -dy : dy);
      if (rat) { if (Math.abs(dx) > Math.abs(dy)) ht = w / rat; else w = ht * rat; }
      w = Math.max(8, Math.min(w, L ? o.x + o.w : W - o.x)); ht = Math.max(8, Math.min(ht, T ? o.y + o.h : H - o.y));
      if (rat) { if (w / ht > rat) w = ht * rat; else ht = w / rat; }
      r = { x: L ? o.x + o.w - w : o.x, y: T ? o.y + o.h - ht : o.y, w, h: ht };
    }
    draw();
  });
  box.addEventListener('pointerup', () => { drag = null; });
  box.addEventListener('keydown', (e) => {
    const st = Math.max(1, Math.round(Math.min(W, H) / 100)), m = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key];
    if (!m) return; e.preventDefault();
    if (e.shiftKey) {   // resize from the top-left corner; the shape lock is applied by clamp()
      if (m[0]) { r.w += m[0]; if (rat) r.h = r.w / rat; } else { r.h += m[1]; if (rat) r.w = r.h * rat; }
    } else { r.x += m[0]; r.y += m[1]; }
    draw();
  });
  setRatio(ratio);
  return { el: wrap, get, set, setRatio };
}
/** The cropped part as a new canvas, optionally scaled to outW x outH. */
export function cut(src, rect, outW, outH) {
  const c = canvas(outW || rect.w, outH || rect.h), x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
  x.drawImage(src, rect.x, rect.y, rect.w, rect.h, 0, 0, c.width, c.height); return c;
}
