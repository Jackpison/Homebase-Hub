// Watermark Images: your text or logo on many photos at once, in a corner, in the middle or tiled across.
import { h, field, input, select, seg, range, check, button, dropzone, panel, busy, toast } from '../ui.js';
import { ACCEPT, decode, encode, canvas, sameFormat, outName, results, each, preview } from '../lib/image.js';
import { presetBar, controls, picture } from '../lib/presets.js';

const POS = [['tl', 'Top left'], ['tc', 'Top centre'], ['tr', 'Top right'], ['ml', 'Middle left'], ['mc', 'Centre'], ['mr', 'Middle right'], ['bl', 'Bottom left'], ['bc', 'Bottom centre'], ['br', 'Bottom right']];

export function stamp(src, o) {
  const c = canvas(src.width, src.height), x = c.getContext('2d'); x.drawImage(src, 0, 0);
  const W = c.width, H = c.height, m = Math.round(Math.min(W, H) * o.margin / 100);
  let mw, mh, paint;
  if (o.mode === 'text') {
    const fs = Math.max(8, Math.round(W * o.size / 100));
    x.font = (o.bold ? '700 ' : '500 ') + fs + 'px system-ui, -apple-system, "Segoe UI", sans-serif';
    mw = x.measureText(o.text).width; mh = fs;
    paint = (px, py) => { x.fillStyle = o.color; x.textBaseline = 'top'; x.shadowColor = 'rgba(0,0,0,.25)'; x.shadowBlur = fs / 12; x.fillText(o.text, px, py); x.shadowBlur = 0; };
  } else {
    if (!o.logo) return c;
    mw = W * o.size / 100; mh = mw * o.logo.height / o.logo.width;
    paint = (px, py) => x.drawImage(o.logo, px, py, mw, mh);
  }
  x.globalAlpha = o.opacity / 100;
  if (o.tile) {
    x.save(); x.translate(W / 2, H / 2); x.rotate(-o.angle * Math.PI / 180);
    const sx = mw * 1.8 + m, sy = mh * 3 + m, R = Math.hypot(W, H) / 2;
    for (let yy = -R; yy < R; yy += sy) for (let xx = -R - ((yy / sy) % 2 ? sx / 2 : 0); xx < R; xx += sx) paint(xx, yy);
    x.restore();
  } else {
    const [v, hz] = o.pos;
    const px = hz === 'l' ? m : hz === 'c' ? (W - mw) / 2 : W - mw - m, py = v === 't' ? m : v === 'm' ? (H - mh) / 2 : H - mh - m;
    paint(px, py);
  }
  x.globalAlpha = 1; return c;
}

/** A logo as a PNG address for a preset, made smaller when it is big (a preset holds at most about 600 KB). */
export function logoUrl(src, max = 600) { const k = Math.min(1, max / Math.max(src.width, src.height)), c = canvas(src.width * k, src.height * k); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); return c.toDataURL('image/png'); }

export default function (root) {
  let files = [], first = null, logo = null;
  const mode = seg('Watermark', [['text', 'Text'], ['logo', 'Logo']], 'text', () => { modeBox(); draw(); });
  const text = input({ value: '© Your Name', onInput: () => draw() }), color = h('input', { type: 'color', value: '#ffffff', onInput: () => draw() }), bold = check('Bold', true, () => draw());
  const size = range('Size (share of the width)', 2, 60, 1, 6, (v) => v + '%', () => draw()), opacity = range('Opacity', 5, 100, 1, 60, (v) => v + '%', () => draw());
  const pos = select(POS, 'br', { onChange: () => draw() }), margin = range('Distance from the edge', 0, 20, 1, 3, (v) => v + '%', () => draw());
  const tile = check('Tile it across the whole photo', false, () => draw()), angle = range('Tile angle', -60, 60, 1, 30, (v) => v + '°', () => draw());
  const box = h('div'), view = h('div', { class: 'preview' }, h('p', { class: 'hint', text: 'Your photo shows here.' })), prog = h('p', { class: 'hint', 'aria-live': 'polite' }), out = h('div');
  const logoZone = dropzone({ accept: 'image/png,image/svg+xml,image/webp,image/*', label: 'Choose your logo', hint: 'A PNG with a transparent background looks best.', onFiles: async ([f]) => { logo = await decode(f); draw(); } });
  function modeBox() { box.replaceChildren(...(mode.value === 'text' ? [field('Text', text), h('div', { class: 'row' }, field('Colour', color), bold.el)] : [logoZone])); }
  const opts = () => ({ mode: mode.value, text: text.value, color: color.value, bold: bold.value, size: size.value, opacity: opacity.value, pos: pos.value, margin: margin.value, tile: tile.value, angle: angle.value, logo });
  function draw() { if (first) view.replaceChildren(preview(stamp(first, opts()), 700)); }
  const go = button('Add to All and Save', { primary: true, icon: 'download' });
  go.addEventListener('click', () => busy(go, async () => {
    if (!files.length) return; if (mode.value === 'logo' && !logo) { toast('Choose your logo first.', true); return; }
    results(out, await each(files, prog, async (f) => { const fmt = sameFormat(f); return { name: outName(f.name, fmt, 'watermarked'), blob: await encode(stamp(await decode(f), opts()), fmt, 0.92), before: f.size }; }), 'watermarked.zip');
  }));
  const ctl = controls({ mode, text, color, bold, size, opacity, pos, margin, tile, angle });
  const bar = presetBar('img-watermark', {
    get: () => ({ ...ctl.get(), logo: logo ? logoUrl(logo) : '' }),
    set: async (v) => { ctl.set(v); if (v.logo) { const i = await picture(v.logo), c = canvas(i.width, i.height); c.getContext('2d').drawImage(i, 0, 0); logo = c; } draw(); },
  });
  modeBox();
  root.append(dropzone({ accept: ACCEPT, multiple: true, label: 'Choose photos', onFiles: async (fs) => { files = fs; out.replaceChildren(); first = await decode(fs[0]); draw(); } }),
    h('div', { class: 'cols' }, panel(bar, mode.el, box, size.el, opacity.el, field('Position', pos), margin.el, tile.el, angle.el, go, prog, out), panel(view)));
}
