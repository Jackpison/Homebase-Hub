// A PDF page to put things on (signatures, text, ticks): page by page, click to place, drag to move, Delete to remove.
// Items keep their place as fractions of the page; at() turns them into PDF points through pdf.js, so rotated pages work too.
import { h, button } from '../ui.js';
import { renderPage } from './pdf.js';

export function placer(doc, { onPlace, draw }) {
  let n = 1, vp = null, sel = -1, ptw = 595;
  const items = [];
  const label = h('span', { class: 'hint', 'aria-live': 'polite' }), stage = h('div', { class: 'stage' }), layer = h('div', { class: 'layer', tabindex: '0', 'aria-label': 'The page. Click to place; select an item and use the arrow keys to move it, Delete to remove it.' });
  const prev = button('', { icon: 'back', small: true, aria: 'Previous page', onClick: () => go(n - 1) }), next = button('', { icon: 'back', small: true, aria: 'Next page', onClick: () => go(n + 1) });
  next.querySelector('svg').style.transform = 'scaleX(-1)';
  async function go(k) {
    n = Math.max(1, Math.min(doc.numPages, k)); label.textContent = 'Page ' + n + ' of ' + doc.numPages; prev.disabled = n === 1; next.disabled = n === doc.numPages;
    const r = await renderPage(doc, n, 760); vp = r.viewport; ptw = r.page.getViewport({ scale: 1 }).width; r.canvas.setAttribute('aria-hidden', 'true');
    stage.replaceChildren(r.canvas, layer); paint();
  }
  function paint() {
    layer.replaceChildren(...items.map((it, i) => {
      if (it.page !== n) return null;
      const el = draw(it); el.classList.add('item'); if (i === sel) el.classList.add('sel');
      Object.assign(el.style, { left: it.x * 100 + '%', top: it.y * 100 + '%', width: it.w * 100 + '%', height: it.h * 100 + '%' });
      el.addEventListener('pointerdown', (e) => { e.stopPropagation(); sel = i; const r = layer.getBoundingClientRect(), o = { x: it.x, y: it.y, sx: e.clientX, sy: e.clientY }; el.setPointerCapture(e.pointerId);
        el.onpointermove = (ev) => { it.x = Math.min(1 - it.w, Math.max(0, o.x + (ev.clientX - o.sx) / r.width)); it.y = Math.min(1 - it.h, Math.max(0, o.y + (ev.clientY - o.sy) / r.height)); el.style.left = it.x * 100 + '%'; el.style.top = it.y * 100 + '%'; };
        el.onpointerup = () => { el.onpointermove = null; paint(); }; });
      return el;
    }).filter(Boolean));
  }
  layer.addEventListener('pointerdown', (e) => { if (e.target !== layer) return; const r = layer.getBoundingClientRect(); sel = -1; const it = onPlace((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, n); if (it) { items.push(it); sel = items.length - 1; } paint(); });
  layer.addEventListener('keydown', (e) => {
    const it = items[sel]; if (!it) return;
    const m = { ArrowLeft: [-0.01, 0], ArrowRight: [0.01, 0], ArrowUp: [0, -0.01], ArrowDown: [0, 0.01] }[e.key];
    if (m) { e.preventDefault(); it.x = Math.min(1 - it.w, Math.max(0, it.x + m[0])); it.y = Math.min(1 - it.h, Math.max(0, it.y + m[1])); paint(); }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); items.splice(sel, 1); sel = -1; paint(); }
  });
  const api = {
    el: h('div', {}, h('div', { class: 'row' }, prev, label, next), stage), items, page: () => n, go, paint,
    add(it) { items.push(it); sel = items.length - 1; paint(); },
    removeSelected() { if (sel >= 0) { items.splice(sel, 1); sel = -1; paint(); } },
    selected: () => items[sel],
    /** An item's rectangle in PDF points on its page: {x, y, w, h} with y from the bottom. */
    async at(it) {
      const page = await doc.getPage(it.page), v = page.getViewport({ scale: 1 });
      const [x1, y1] = v.convertToPdfPoint(it.x * v.width, it.y * v.height), [x2, y2] = v.convertToPdfPoint((it.x + it.w) * v.width, (it.y + it.h) * v.height);
      return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), rotate: page.rotate || 0 };
    },
    aspect: () => (vp ? vp.width / vp.height : 0.7),
    /** The page's width in points (text sizes on the page are drawn relative to it). */
    ptw: () => ptw,
  };
  go(1);
  return api;
}
