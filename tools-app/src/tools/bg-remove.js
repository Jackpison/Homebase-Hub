// Background Remover: on-device AI (U-2-Net on ONNX Runtime) finds the subject; touch it up, then keep it clear or put in a colour.
import { h, seg, range, button, dropzone, panel, busy, note, field } from '../ui.js';
import { ACCEPT, decode, encode, canvas, outName, results, scaled } from '../lib/image.js';

let SESSION = null, ORT = null;
async function model(say) {
  if (SESSION) return SESSION;
  say('Loading the AI model (about 17 MB the first time; after that it comes from this browser)…');
  ORT = await import('onnxruntime-web/wasm');
  // only the .wasm comes from assets/: the glue code is already in this bundle
  ORT.env.wasm.wasmPaths = { wasm: new URL('./ort-wasm-simd-threaded.wasm', import.meta.url).href }; ORT.env.wasm.numThreads = 1; ORT.env.wasm.proxy = false;
  const buf = await (await fetch(new URL('./vendor/u2netp.onnx', import.meta.url))).arrayBuffer();
  SESSION = await ORT.InferenceSession.create(new Uint8Array(buf), { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
  return SESSION;
}
/** A mask canvas (white, its alpha = how much of the subject is there) the size of src. */
export async function findSubject(src, say = () => {}) {
  const s = await model(say), N = 320, c = canvas(N, N), x = c.getContext('2d');
  say('Finding the subject…');
  x.drawImage(src, 0, 0, N, N); const d = x.getImageData(0, 0, N, N).data, arr = new Float32Array(3 * N * N);
  const mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225];
  for (let i = 0; i < N * N; i++) for (let k = 0; k < 3; k++) arr[k * N * N + i] = (d[i * 4 + k] / 255 - mean[k]) / std[k];
  const out = await s.run({ [s.inputNames[0]]: new ORT.Tensor('float32', arr, [1, 3, N, N]) }), m = out[s.outputNames[0]].data;
  let lo = Infinity, hi = -Infinity; for (const v of m) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const mc = canvas(N, N), mx = mc.getContext('2d'), md = mx.createImageData(N, N);
  for (let i = 0; i < N * N; i++) { md.data[i * 4] = md.data[i * 4 + 1] = md.data[i * 4 + 2] = 255; md.data[i * 4 + 3] = Math.round((m[i] - lo) / (hi - lo || 1) * 255); }
  mx.putImageData(md, 0, 0);
  const full = canvas(src.width, src.height), fx = full.getContext('2d'); fx.imageSmoothingQuality = 'high'; fx.drawImage(mc, 0, 0, full.width, full.height);
  say(''); return full;
}
/** Hardens or softens the mask's edge. edge 0 = soft, 100 = sharp. */
function edged(mask, edge) {
  const c = canvas(mask.width, mask.height), x = c.getContext('2d'); x.drawImage(mask, 0, 0);
  if (!edge) return c;
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data, k = 1 + edge / 12;
  for (let i = 3; i < p.length; i += 4) p[i] = Math.max(0, Math.min(255, (p[i] - 128) * k + 128));
  x.putImageData(d, 0, 0); return c;
}
export function compose(src, mask, { edge = 30, bg = null }) {
  const c = canvas(src.width, src.height), x = c.getContext('2d');
  x.drawImage(src, 0, 0); x.globalCompositeOperation = 'destination-in'; x.drawImage(edged(mask, edge), 0, 0);
  if (bg) { x.globalCompositeOperation = 'destination-over'; x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height); }
  return c;
}
export default function (root) {
  let file = null, src = null, mask = null, small = null, smallMask = null;
  const status = h('p', { class: 'hint', 'aria-live': 'polite' }), view = h('div', { class: 'preview checker' }, h('p', { class: 'hint', text: 'Your photo shows here.' })), out = h('div');
  const bgMode = seg('Background', [['none', 'See-through'], ['color', 'A colour']], 'none', () => draw()), bg = h('input', { type: 'color', value: '#ffffff', onInput: () => draw() });
  const edge = range('Edge', 0, 100, 1, 30, (v) => (v < 20 ? 'Soft' : v < 70 ? 'Medium' : 'Sharp'), () => draw());
  const brush = seg('Touch up', [['off', 'Off'], ['erase', 'Erase'], ['keep', 'Bring back']], 'off'), bsize = range('Brush size', 4, 120, 1, 30, (v) => v + ' px');
  const opts = () => ({ edge: edge.value, bg: bgMode.value === 'color' ? bg.value : null });
  let pv = null;
  function draw() {
    if (!mask) return;
    smallMask = scaled(mask, small.width / mask.width);
    pv = compose(small, smallMask, opts()); pv.setAttribute('role', 'img'); pv.setAttribute('aria-label', 'Preview without the background');
    pv.addEventListener('pointerdown', paintStart); pv.addEventListener('pointermove', paintMove); pv.addEventListener('pointerup', () => { painting = false; });
    view.replaceChildren(pv);
  }
  let painting = false;
  function paintAt(e) {
    const r = pv.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height, x = mask.getContext('2d');
    x.save(); x.globalCompositeOperation = brush.value === 'erase' ? 'destination-out' : 'source-over'; x.fillStyle = '#fff';
    x.beginPath(); x.arc(fx * mask.width, fy * mask.height, bsize.value * mask.width / r.width / 2, 0, Math.PI * 2); x.fill(); x.restore();
  }
  function paintStart(e) { if (brush.value === 'off') return; painting = true; pv.setPointerCapture(e.pointerId); paintAt(e); draw(); }
  function paintMove(e) { if (painting) { paintAt(e); requestAnimationFrame(draw); } }
  const go = button('Save', { primary: true, icon: 'download' });
  go.addEventListener('click', () => busy(go, async () => {
    if (!mask) return; const o = opts(), fmt = o.bg ? 'jpg' : 'png';
    results(out, [{ name: outName(file.name, fmt, 'no-background'), blob: await encode(compose(src, mask, o), fmt, 0.95, o.bg || '#ffffff') }]);
  }));
  root.append(dropzone({ accept: ACCEPT, label: 'Choose a photo', hint: 'People, pets and products against a plain background work best.', onFiles: async ([f]) => {
    file = f; out.replaceChildren(); src = await decode(f); small = src.width > 900 ? scaled(src, 900 / src.width) : src;
    view.replaceChildren(h('p', { class: 'hint', text: 'Working…' }));
    try { mask = await findSubject(src, (m) => { status.textContent = m; }); draw(); } catch (e) { console.error(e); status.textContent = ''; view.replaceChildren(note('The AI model could not run in this browser. Try Chrome, Edge or Firefox.', true)); }
  } }), status,
  h('div', { class: 'cols' }, panel(view, h('p', { class: 'hint', text: 'With Touch up on, paint on the picture: Erase removes more, Bring back restores parts the AI took away.' })),
    panel(bgMode.el, field('Colour', bg), edge.el, brush.el, bsize.el, go, out, note('Everything runs on your device. The photo is never uploaded.'))));
}
