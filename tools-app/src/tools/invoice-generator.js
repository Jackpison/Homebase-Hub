// Invoice Generator: your details and logo, the customer, the items, one tax rate (shown as one line or split into two halves),
// and a clean A4 PDF. The draft stays in this browser.
import { h, panel, field, input, textarea, select, check, button, toast, download, busy } from '../ui.js';
import { CURRENCIES, money, parse } from '../lib/calc.js';
import { lib, pdfBlob } from '../lib/pdf.js';
import { decode, canvas } from '../lib/image.js';
import { words } from './number-to-words.js';
import { presetBar } from '../lib/presets.js';

const KEY = 'tools.invoice.v1';
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const DEF = () => ({ biz: { name: '', addr: '', taxLabel: 'GSTIN', taxId: '', phone: '', email: '' }, logo: '', to: { name: '', addr: '', taxId: '' },
  no: 'INV-001', date: today(), due: '', cur: 'INR', items: [{ d: '', q: '1', r: '' }], disc: '', taxName: 'GST', tax: '18', split: false, halfA: 'CGST', halfB: 'SGST',
  notes: '', terms: 'Thank you for your business.', colour: '#1f4e79', words: true });
/** The sums of an invoice. Amounts are rounded to 2 decimals at each step, as on paper. */
export function totals(s) {
  const r2 = (x) => Math.round(x * 100) / 100, lines = s.items.map((it) => { const q = parse(it.q), r = parse(it.r); return isFinite(q) && isFinite(r) ? r2(q * r) : 0; });
  const sub = r2(lines.reduce((a, b) => a + b, 0)), dp = parse(s.disc) || 0, disc = r2(sub * Math.min(100, Math.max(0, dp)) / 100), net = r2(sub - disc), tp = Math.max(0, parse(s.tax) || 0);
  const half = r2(net * tp / 200), tax = s.split ? r2(half * 2) : r2(net * tp / 100);
  return { lines, sub, dp, disc, net, tp, half, tax, total: r2(net + tax) };
}
// The rupee sign, drawn (the PDF's standard fonts do not have it): 1000 units to the em, the baseline at 0, y going down.
const RUPEE = 'M30 -700H560V-640H30Z M30 -520H560V-460H30Z M200 -640C350 -640 425 -575 425 -490C425 -395 345 -330 205 -330H30V-392H205C305 -392 358 -430 358 -490C358 -550 305 -580 200 -580Z M85 -392H175L470 0H375Z', RUPEE_W = 600;

export default function (root) {
  let S; try { S = { ...DEF(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { S = DEF(); }
  const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* private mode */ } sumsFn(); };
  const bind = (obj, k, el, ev = 'input') => { el.value = obj[k] ?? ''; el.addEventListener(ev, () => { obj[k] = el.type === 'checkbox' ? el.checked : el.value; keep(); }); return el; };
  const tf = (label, obj, k, props = {}) => field(label, bind(obj, k, input(props)));
  const ta = (label, obj, k, rows = 3) => field(label, bind(obj, k, textarea({ rows, class: 'inp' })));

  let sumsFn = () => {};
  const rebuild = () => { root.replaceChildren(); ui(); };
  function ui() {
    sumsFn = sums;   // a function declaration below: hoisted
    // your business
    const logoPrev = h('img', { class: 'logo-prev', alt: 'Your logo' }), logoIn = h('input', { type: 'file', accept: 'image/*', class: 'sr', 'aria-label': 'Choose a logo' });
    const showLogo = () => { logoPrev.hidden = !S.logo; if (S.logo) logoPrev.src = S.logo; rmLogo.hidden = !S.logo; };
    logoIn.addEventListener('change', async () => {
      const f = logoIn.files[0]; logoIn.value = ''; if (!f) return;
      try { const c = await decode(f), k = Math.min(1, 500 / Math.max(c.width, c.height)), o = canvas(c.width * k, c.height * k); o.getContext('2d').drawImage(c, 0, 0, o.width, o.height); S.logo = o.toDataURL('image/png'); keep(); showLogo(); }
      catch (e) { toast('This picture could not be read.', true); }
    });
    const rmLogo = button('Remove', { small: true, ghost: true, onClick: () => { S.logo = ''; keep(); showLogo(); } });
    const bizPanel = panel(h('h2', { text: 'From (Your Business)' }), tf('Business Name', S.biz, 'name'), ta('Address', S.biz, 'addr'),
      h('div', { class: 'mini' }, tf('Tax ID Name', S.biz, 'taxLabel', { placeholder: 'GSTIN, VAT, EIN' }), tf('Tax ID', S.biz, 'taxId')),
      h('div', { class: 'mini' }, tf('Phone', S.biz, 'phone', { type: 'tel' }), tf('Email', S.biz, 'email', { type: 'email' })),
      h('div', { class: 'field' }, h('span', { class: 'lbl', text: 'Logo' }), h('div', { class: 'row' }, logoIn, logoPrev, button('Choose Logo', { small: true, icon: 'upload', onClick: () => logoIn.click() }), rmLogo)),
      h('div', { 'data-presets': '' }));
    const toPanel = panel(h('h2', { text: 'Bill To' }), tf('Customer Name', S.to, 'name'), ta('Address', S.to, 'addr'), tf('Customer Tax ID', S.to, 'taxId', { placeholder: 'Optional' }));
    const curSel = bind(S, 'cur', select(CURRENCIES, S.cur), 'change'), colour = bind(S, 'colour', h('input', { type: 'color', 'aria-label': 'Colour' }));
    const meta = panel(h('h2', { text: 'Invoice' }), h('div', { class: 'mini' }, tf('Invoice Number', S, 'no'), tf('Date', S, 'date', { type: 'date' }), tf('Due Date', S, 'due', { type: 'date' })),
      h('div', { class: 'mini' }, field('Currency', curSel), field('Colour', colour)));

    // items
    const list = h('div', { class: 'items' });
    function drawItems() {
      list.replaceChildren(h('div', { class: 'irow hint', 'aria-hidden': 'true' }, h('span', { text: 'Description' }), h('span', { text: 'Qty' }), h('span', { text: 'Rate' }), h('b', { text: 'Amount' }), h('span')),
        ...S.items.map((it, i) => {
          const amt = h('b', { class: 'amt' }), n = i + 1;
          const f = (k, ph, al, mode) => bind(it, k, input({ placeholder: ph, 'aria-label': al + ' ' + n, inputmode: mode }));
          return h('div', { class: 'irow' }, f('d', 'Item or service', 'Description', null), f('q', '1', 'Quantity', 'decimal'), f('r', '0.00', 'Rate', 'decimal'), amt,
            h('button', { type: 'button', class: 'ib', 'aria-label': 'Remove item ' + n, text: '×', onClick: () => { S.items.splice(i, 1); if (!S.items.length) S.items.push({ d: '', q: '1', r: '' }); keep(); drawItems(); } }));
        }));
      sums();
    }
    const items = panel(h('h2', { text: 'Items' }), list, button('Add Item', { icon: 'plus', small: true, onClick: () => { S.items.push({ d: '', q: '1', r: '' }); keep(); drawItems(); list.querySelector('.irow:last-child input')?.focus(); } }));

    // tax and totals
    const split = check('Split the tax into two halves', S.split, (v) => { S.split = v; halves.hidden = !v; keep(); });
    const halves = h('div', { class: 'mini' }, tf('First Half', S, 'halfA'), tf('Second Half', S, 'halfB')); halves.hidden = !S.split;
    const inWords = check('Write the total in words', S.words, (v) => { S.words = v; keep(); });
    const sumBox = h('div', { 'aria-live': 'polite' });
    const taxPanel = panel(h('h2', { text: 'Tax and Discount' }), h('div', { class: 'mini' }, tf('Tax Name', S, 'taxName'), tf('Tax %', S, 'tax', { inputmode: 'decimal' }), tf('Discount %', S, 'disc', { inputmode: 'decimal', placeholder: '0' })),
      split.el, h('p', { class: 'hint', text: 'For example GST 18% as CGST 9% and SGST 9%. Leave Tax % empty for none.' }), halves, inWords.el, sumBox);
    function sums() {
      const t = totals(S), c = S.cur, m = (x) => money(x, c, 2);
      list.querySelectorAll('.amt').forEach((b, i) => { b.textContent = m(t.lines[i] || 0); });
      const r = [['Subtotal', m(t.sub)]];
      if (t.disc) r.push(['Discount (' + t.dp + '%)', '− ' + m(t.disc)]);
      if (t.tp) { if (S.split) r.push([S.halfA + ' (' + t.tp / 2 + '%)', m(t.half)], [S.halfB + ' (' + t.tp / 2 + '%)', m(t.half)]); else r.push([S.taxName + ' (' + t.tp + '%)', m(t.tax)]); }
      sumBox.replaceChildren(h('table', { class: 'tbl' }, h('tbody', {}, r.map(([a, b]) => h('tr', {}, h('td', { text: a }), h('td', { text: b }))), h('tr', {}, h('td', {}, h('b', { text: 'Total' })), h('td', {}, h('b', { class: 'total', text: m(t.total) }))))));
    }
    const notes = panel(h('h2', { text: 'Notes' }), ta('Payment Details or Notes', S, 'notes', 4), ta('Footer', S, 'terms', 2));
    const go = button('Download PDF', { icon: 'download', primary: true });
    go.addEventListener('click', () => busy(go, async () => { const { bytes, lost } = await makePdf(S); download(pdfBlob(bytes), 'invoice-' + (S.no || 'draft').replace(/[^\w-]+/g, '-') + '.pdf'); if (lost) toast('Some letters are not in the PDF font and show as "?".', true); }));
    const clear = button('New Invoice', { ghost: true, onClick: () => { if (!confirm('Start a new invoice? Your business details and logo stay.')) return; const keepBiz = { biz: S.biz, logo: S.logo, cur: S.cur, colour: S.colour, taxName: S.taxName, tax: S.tax, split: S.split, halfA: S.halfA, halfB: S.halfB, terms: S.terms }; const m = /^(.*?)(\d+)$/.exec(S.no || ''); S = { ...DEF(), ...keepBiz, no: m ? m[1] + String(+m[2] + 1).padStart(m[2].length, '0') : '' }; keep(); rebuild(); } });
    root.append(h('div', { class: 'cols' }, bizPanel, toPanel), meta, items, h('div', { class: 'cols' }, taxPanel, notes), panel(h('div', { class: 'row' }, go, clear), h('p', { class: 'hint', text: 'The PDF uses a standard font: letters beyond Western European ones (for example Hindi or Chinese) show as "?".' })));
    drawItems(); showLogo();
    bizPanel.querySelector('[data-presets]').replaceWith(presetBar('invoice', {
      get: () => ({ biz: { ...S.biz }, logo: S.logo, cur: S.cur, colour: S.colour, taxName: S.taxName, tax: S.tax, split: S.split, halfA: S.halfA, halfB: S.halfB, notes: S.notes, terms: S.terms }),
      set: (v) => { for (const k of ['cur', 'colour', 'taxName', 'tax', 'split', 'halfA', 'halfB', 'notes', 'terms']) if (k in v) S[k] = v[k]; S.biz = { ...DEF().biz, ...(v.biz || {}) }; S.logo = /^data:image\//.test(v.logo || '') ? v.logo : ''; keep(); rebuild(); },
    }));
  }
  ui();
}

/** The invoice as an A4 PDF. Returns { bytes, lost } (lost: some letters could not be written). */
export async function makePdf(S) {
  const { PDFDocument, StandardFonts, rgb } = await lib(), doc = await PDFDocument.create(), F = await doc.embedFont(StandardFonts.Helvetica), B = await doc.embedFont(StandardFonts.HelveticaBold);
  const OK = new Set(F.getCharacterSet()); let lost = false;
  const clean = (s) => [...String(s ?? '')].map((ch) => ch === '₹' || ch === '\n' || OK.has(ch.codePointAt(0)) ? ch : ch === '−' ? '-' : (lost = true, '?')).join('');
  const hex = (c) => { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(c || '') || [0, '1f', '4e', '79']; return rgb(parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255); };
  const ACC = hex(S.colour), INK = rgb(0.1, 0.1, 0.1), MUT = rgb(0.4, 0.4, 0.4), W = 595.28, H = 841.89, M = 48;
  const t = totals(S), cur = S.cur, m = (x) => money(x, cur, 2);
  let page = doc.addPage([W, H]), y = H - M;
  const width = (s, f, size) => clean(s).split('₹').reduce((w, part, i) => w + f.widthOfTextAtSize(part, size) + (i ? RUPEE_W / 1000 * size : 0), 0);
  function text(s, x, yy, { f = F, size = 10, color = INK, align = 'left' } = {}) {
    s = clean(s); let cx = align === 'right' ? x - width(s, f, size) : x;
    s.split('₹').forEach((part, i) => {
      if (i) { page.drawSvgPath(RUPEE, { x: cx, y: yy, scale: size / 1000 * (f === B ? 1 : 0.96), color }); cx += RUPEE_W / 1000 * size; }
      if (part) { page.drawText(part, { x: cx, y: yy, size, font: f, color }); cx += f.widthOfTextAtSize(part, size); }
    });
  }
  const wrap = (s, f, size, max) => clean(s).split('\n').flatMap((ln) => { const out = []; let cur2 = ''; for (const w of ln.split(/(\s+)/)) { const tt = cur2 + w; if (width(tt, f, size) > max && cur2.trim()) { out.push(cur2.trimEnd()); cur2 = w.trimStart(); } else cur2 = tt; } out.push(cur2); return out; });
  // header: logo and business on the left, INVOICE and its numbers on the right
  let lx = M, top = y;
  if (S.logo) {
    try { const img = await doc.embedPng(Uint8Array.from(atob(S.logo.split(',')[1]), (c) => c.charCodeAt(0))), k = Math.min(140 / img.width, 60 / img.height); page.drawImage(img, { x: M, y: y - img.height * k, width: img.width * k, height: img.height * k }); y -= img.height * k + 12; }
    catch (e) { /* a broken logo: leave it out */ }
  }
  if (S.biz.name) { text(S.biz.name, lx, y - 14, { f: B, size: 15 }); y -= 22; }
  for (const l of [...wrap(S.biz.addr, F, 9.5, 260), S.biz.taxId ? (S.biz.taxLabel || 'Tax ID') + ': ' + S.biz.taxId : '', [S.biz.phone, S.biz.email].filter(Boolean).join('   ')].filter((x) => x && x.trim())) { text(l, lx, y - 10, { size: 9.5, color: MUT }); y -= 13; }
  text('INVOICE', W - M, top - 22, { f: B, size: 24, color: ACC, align: 'right' });
  let ry = top - 44;
  const dt = (v) => { const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return d ? new Date(Date.UTC(+d[1], d[2] - 1, +d[3])).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : ''; };
  for (const [a, b] of [['Invoice No.', S.no], ['Date', dt(S.date)], ['Due Date', dt(S.due)]]) if (b) { text(a, W - M - 120, ry, { size: 9.5, color: MUT }); text(b, W - M, ry, { f: B, size: 9.5, align: 'right' }); ry -= 14; }
  y = Math.min(y, ry) - 18;
  // bill to
  page.drawRectangle({ x: M, y: y - 2, width: W - 2 * M, height: 1, color: rgb(0.85, 0.85, 0.85) }); y -= 20;
  text('BILL TO', M, y, { f: B, size: 8.5, color: ACC }); y -= 15;
  if (S.to.name) { text(S.to.name, M, y, { f: B, size: 11.5 }); y -= 15; }
  for (const l of [...wrap(S.to.addr, F, 9.5, 300), S.to.taxId ? (S.biz.taxLabel || 'Tax ID') + ': ' + S.to.taxId : ''].filter((x) => x && x.trim())) { text(l, M, y, { size: 9.5, color: MUT }); y -= 13; }
  y -= 16;
  // items
  const C = [M + 8, W - M - 230, W - M - 120, W - M - 8];   // description (left), qty, rate, amount (right edges)
  const head = () => { page.drawRectangle({ x: M, y: y - 8, width: W - 2 * M, height: 24, color: ACC }); const o = { f: B, size: 9.5, color: rgb(1, 1, 1) }; text('DESCRIPTION', C[0], y, o); text('QTY', C[1], y, { ...o, align: 'right' }); text('RATE', C[2], y, { ...o, align: 'right' }); text('AMOUNT', C[3], y, { ...o, align: 'right' }); y -= 26; };
  head();
  S.items.forEach((it, i) => {
    if (!it.d && !parse(it.r)) return;
    const ls = wrap(it.d || '', F, 10, C[1] - C[0] - 50), hh = ls.length * 13 + 10;
    if (y - hh < M + 60) { page = doc.addPage([W, H]); y = H - M; head(); }
    if (i % 2) page.drawRectangle({ x: M, y: y - hh + 13, width: W - 2 * M, height: hh, color: rgb(0.965, 0.965, 0.965) });
    ls.forEach((l, k) => text(l, C[0], y - k * 13, { size: 10 }));
    text(it.q || '', C[1], y, { size: 10, align: 'right' }); text(isFinite(parse(it.r)) ? m(parse(it.r)) : '', C[2], y, { size: 10, align: 'right' }); text(m(t.lines[i]), C[3], y, { size: 10, align: 'right' });
    y -= hh;
  });
  // totals
  const rows = [['Subtotal', m(t.sub)]];
  if (t.disc) rows.push(['Discount (' + t.dp + '%)', '- ' + m(t.disc)]);
  if (t.tp) { if (S.split) rows.push([S.halfA + ' @ ' + t.tp / 2 + '%', m(t.half)], [S.halfB + ' @ ' + t.tp / 2 + '%', m(t.half)]); else rows.push([S.taxName + ' @ ' + t.tp + '%', m(t.tax)]); }
  if (y - rows.length * 16 - 60 < M) { page = doc.addPage([W, H]); y = H - M; }
  y -= 10;
  for (const [a, b] of rows) { text(a, C[2] - 30, y, { size: 10, color: MUT, align: 'right' }); text(b, C[3], y, { size: 10, align: 'right' }); y -= 16; }
  y -= 8;   // room between the last line and the TOTAL bar
  page.drawRectangle({ x: C[2] - 150, y: y - 10, width: C[3] - C[2] + 158, height: 28, color: ACC });
  text('TOTAL', C[2] - 30, y, { f: B, size: 12, color: rgb(1, 1, 1), align: 'right' }); text(m(t.total), C[3], y, { f: B, size: 12, color: rgb(1, 1, 1), align: 'right' });
  y -= 36;
  if (S.words && t.total > 0) {
    let w = ''; try { w = words(t.total.toFixed(2), cur === 'INR' ? 'in' : 'intl', cur).replace(/(^|[\s-])([a-z])/g, (x, a, b) => a + b.toUpperCase()).replace(/ And /g, ' and '); } catch (e) { w = ''; }
    for (const l of wrap('Amount in words: ' + w, F, 9.5, W - 2 * M)) { text(l, M, y, { size: 9.5, color: MUT }); y -= 13; }
    y -= 8;
  }
  for (const [label, body] of [['NOTES', S.notes]]) if (body && body.trim()) {
    const ls = wrap(body, F, 9.5, W - 2 * M); if (y - ls.length * 13 - 20 < M) { page = doc.addPage([W, H]); y = H - M; }
    y -= 6; text(label, M, y, { f: B, size: 8.5, color: ACC }); y -= 14; for (const l of ls) { text(l, M, y, { size: 9.5 }); y -= 13; }
  }
  const pages = doc.getPages();
  pages.forEach((p, i) => { page = p; if (S.terms) text(S.terms.split('\n')[0], W / 2 - width(S.terms.split('\n')[0], F, 9) / 2, 30, { size: 9, color: MUT }); if (pages.length > 1) text('Page ' + (i + 1) + ' of ' + pages.length, W - M, 30, { size: 8.5, color: MUT, align: 'right' }); });
  doc.setTitle('Invoice ' + clean(S.no || '')); doc.setCreator('Homebase Hub Tools'); doc.setProducer('Homebase Hub Tools');
  return { bytes: await doc.save(), lost };
}
