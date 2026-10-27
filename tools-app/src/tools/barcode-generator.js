// Barcode Generator: Code 128, EAN-13, EAN-8, UPC-A, Code 39, ITF-14, Codabar and MSI barcodes, saved as SVG or PNG.
import JsBarcode from 'jsbarcode';
import { h, panel, field, input, select, check, range, button, download, note } from '../ui.js';

const FORMATS = [['CODE128', 'Code 128 (any text)', 'Homebase-001'], ['EAN13', 'EAN-13 (shop products)', '590123412345'], ['EAN8', 'EAN-8 (small products)', '9638507'], ['UPC', 'UPC-A (US products)', '03600029145'],
  ['CODE39', 'Code 39 (letters and numbers)', 'HUB-42'], ['ITF14', 'ITF-14 (cartons)', '1540014128876'], ['codabar', 'Codabar (libraries, labs)', 'A12345B'], ['MSI', 'MSI (shelves)', '123456']];
const HINT = { EAN13: '12 digits (the 13th, a check digit, is added) or all 13.', EAN8: '7 digits (the check digit is added) or all 8.', UPC: '11 digits (the check digit is added) or all 12.', ITF14: '13 digits (the check digit is added) or all 14.', CODE39: 'Capital letters, digits, space and - . $ / + %', codabar: 'Digits and - $ : / . +, starting and ending with A, B, C or D.', MSI: 'Digits only.', CODE128: 'Any letters, digits and signs on a keyboard.' };

export default function (root) {
  const fmt = select(FORMATS.map(([v, l]) => [v, l]), 'CODE128', { onChange: () => { val.value = FORMATS.find((f) => f[0] === fmt.value)[2]; hint.textContent = HINT[fmt.value]; draw(); } });
  const val = input({ value: FORMATS[0][2], autocomplete: 'off', spellcheck: false, onInput: () => draw() }), hint = h('p', { class: 'hint', text: HINT.CODE128 });
  const wide = range('Bar Width', 1, 4, 1, 2, (v) => v + ' px', () => draw()), tall = range('Height', 30, 200, 5, 90, (v) => v + ' px', () => draw());
  const txt = check('Show the text under the bars', true, () => draw()), fg = h('input', { type: 'color', value: '#000000', 'aria-label': 'Bar colour', onInput: () => draw() }), bg = h('input', { type: 'color', value: '#ffffff', 'aria-label': 'Background colour', onInput: () => draw() });
  const prev = h('div', { class: 'bcprev' }), msg = h('div', { 'aria-live': 'polite' });
  let svg = null;
  function draw() {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Barcode of ' + val.value);
    let ok = true;
    try { JsBarcode(svg, val.value, { format: fmt.value, width: wide.value, height: tall.value, displayValue: txt.value, lineColor: fg.value, background: bg.value, margin: 12, font: 'monospace', fontSize: 18, valid: (v) => { ok = v; } }); }
    catch (e) { ok = false; }
    if (!ok || !val.value) { svg = null; prev.replaceChildren(); msg.replaceChildren(note('That cannot be made into this kind of barcode. ' + HINT[fmt.value], true)); dl.forEach((b) => (b.disabled = true)); return; }
    prev.replaceChildren(svg); msg.replaceChildren(); dl.forEach((b) => (b.disabled = false));
  }
  const name = () => 'barcode-' + (val.value.replace(/[^\w-]+/g, '').slice(0, 30) || 'code');
  const dl = [button('Download PNG', { icon: 'download', primary: true, onClick: () => {
    const w = parseFloat(svg.getAttribute('width')), ht = parseFloat(svg.getAttribute('height')), k = 3,   // JsBarcode writes "230px"
      c = document.createElement('canvas'); c.width = w * k; c.height = ht * k;
    const img = new Image(); img.onload = () => { c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); c.toBlob((b) => download(b, name() + '.png'), 'image/png'); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
  } }), button('Download SVG', { icon: 'download', onClick: () => download(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }), name() + '.svg') })];
  root.append(h('div', { class: 'cols pl' }, panel(h('h2', { text: 'Preview' }), prev, msg, h('div', { class: 'row' }, dl)),
    panel(field('Type', fmt), field('Value', val), hint, wide.el, tall.el, txt.el, h('div', { class: 'row' }, field('Bars', fg), field('Background', bg)),
      h('p', { class: 'hint', text: 'For a QR code, use the QR Code Generator.' }))));
  draw();
}
