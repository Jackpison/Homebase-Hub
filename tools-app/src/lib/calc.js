// Shared pieces for the calculators (1.60): money and number formatting, number fields, result tiles, a donut and bar chart,
// tables and a CSV download. Everything is drawn with elements and SVG; text is only ever set as text.
import { h, field, input, select, download, nextId } from '../ui.js';

export const CURRENCIES = [['INR', '₹ Rupee'], ['USD', '$ Dollar'], ['EUR', '€ Euro'], ['GBP', '£ Pound'], ['AED', 'AED Dirham'], ['SGD', 'S$ Dollar'], ['AUD', 'A$ Dollar'], ['CAD', 'C$ Dollar'], ['JPY', '¥ Yen']];
const LOCALE = (cur) => (cur === 'INR' ? 'en-IN' : 'en-US');

/** 1234567.8 -> "₹12,34,567.80" (Indian grouping for rupees). digits: the decimals to show (default 0 for big sums). */
export function money(n, cur = 'INR', digits = 0) {
  if (!isFinite(n)) return '—';
  return new Intl.NumberFormat(LOCALE(cur), { style: 'currency', currency: cur, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
}
export function num(n, digits = 2, cur = 'INR') {
  if (!isFinite(n)) return '—';
  return new Intl.NumberFormat(LOCALE(cur), { maximumFractionDigits: digits }).format(n);
}
/** A number from what was typed: "12,34,567.5" or "1 234" -> 1234567.5; empty or nonsense -> NaN. */
export const parse = (s) => { const t = String(s).replace(/[\s,_₹$€£]/g, ''); return t === '' || !/^-?\d*\.?\d*(e-?\d+)?$/i.test(t) ? NaN : +t; };

/** A number field: { el, value (NaN when empty), input }. onInput runs on every change. suffix: a unit shown inside the box. */
export function numField(label, value, { hint, suffix, onInput } = {}) {
  const id = nextId('n');
  const inp = input({ id, inputmode: 'decimal', autocomplete: 'off', value: value == null ? '' : String(value), onInput: () => onInput && onInput() });
  const ctl = suffix ? h('div', { class: 'sfx' }, inp, h('span', { text: suffix })) : inp;
  const el = h('div', { class: 'field' }, h('label', { for: id, text: label }), ctl, hint ? h('p', { class: 'hint', text: hint }) : null);
  return { el, input: inp, get value() { return parse(inp.value); }, set value(v) { inp.value = v; } };
}
export function currencyField(value = 'INR', onChange) {
  const s = select(CURRENCIES, value, { onChange: () => onChange && onChange() });
  return { el: field('Currency', s), get value() { return s.value; }, set value(v) { s.value = v; } };
}

/** Result tiles: [[label, value, accent?], ...] */
export function stats(items) {
  return h('div', { class: 'stats' }, items.map(([l, v, a]) => h('div', { class: 'stat' + (a ? ' a' : '') }, h('span', { text: l }), h('b', { text: v }))));
}

/** A two-part donut (for example principal and interest). parts: [[label, value, cssColour], ...] */
export function donut(parts, size = 170) {
  const total = parts.reduce((s, p) => s + Math.max(0, p[1]), 0) || 1, r = 15.915, ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', '0 0 42 42'); svg.setAttribute('width', size); svg.setAttribute('height', size); svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', parts.map((p) => p[0] + ' ' + Math.round(p[1] / total * 100) + '%').join(', '));
  let off = 25;
  for (const [, v, c] of parts) {
    const pct = Math.max(0, v) / total * 100, ci = document.createElementNS(ns, 'circle');
    for (const [k, val] of Object.entries({ cx: 21, cy: 21, r, fill: 'none', 'stroke-width': 6, stroke: c, 'stroke-dasharray': pct + ' ' + (100 - pct), 'stroke-dashoffset': off })) ci.setAttribute(k, val);
    svg.append(ci); off -= pct;
  }
  const legend = h('ul', { class: 'legend' }, parts.map(([l, v, c]) => h('li', {}, h('i', { style: 'background:' + c }), h('span', { text: l + ' · ' + Math.round(Math.max(0, v) / total * 100) + '%' }))));
  return h('div', { class: 'donut' }, svg, legend);
}

/** Stacked bars per year: rows [[label, a, b]], colours [ca, cb], names [na, nb]. */
export function bars(rows, colours, names) {
  const max = Math.max(1, ...rows.map((r) => r[1] + r[2])), ns = 'http://www.w3.org/2000/svg', W = Math.max(rows.length * 22, 220), H = 140;
  const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + (H + 16)); svg.setAttribute('class', 'barsv'); svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', names.join(' and ') + ', year by year');
  const bw = W / rows.length;
  rows.forEach(([l, a, b], i) => {
    const ha = a / max * H, hb = b / max * H, x = i * bw + bw * 0.18, w = bw * 0.64;
    for (const [y, hh, c] of [[H - ha, ha, colours[0]], [H - ha - hb, hb, colours[1]]]) { const r = document.createElementNS(ns, 'rect'); for (const [k, v] of Object.entries({ x, y, width: w, height: Math.max(0, hh), rx: 2, fill: c })) r.setAttribute(k, v); svg.append(r); }
    if (rows.length <= 15 || i % Math.ceil(rows.length / 15) === 0) { const t = document.createElementNS(ns, 'text'); for (const [k, v] of Object.entries({ x: x + w / 2, y: H + 12, 'text-anchor': 'middle', 'font-size': 8, fill: 'currentColor' })) t.setAttribute(k, v); t.textContent = l; svg.append(t); }
  });
  return h('div', { class: 'barsw' }, svg, h('ul', { class: 'legend' }, names.map((n, i) => h('li', {}, h('i', { style: 'background:' + colours[i] }), h('span', { text: n })))));
}

/** A simple table: head [..], rows [[..]]. Numbers are given already formatted. */
export function table(head, rows, label = 'Table') {
  return h('div', { class: 'tblw', tabindex: '0', role: 'region', 'aria-label': label }, h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, head.map((t) => h('th', { text: t })))), h('tbody', {}, rows.map((r) => h('tr', {}, r.map((c) => h('td', { text: String(c) })))))));
}
/** Saves rows as a CSV file Excel opens (UTF-8 with a BOM, so ₹ shows). */
export function csvDownload(name, head, rows) {
  const q = (v) => { const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  download(new Blob(['﻿' + [head, ...rows].map((r) => r.map(q).join(',')).join('\r\n')], { type: 'text/csv' }), name);
}
export const COL = { a: 'var(--accent)', b: 'color-mix(in srgb,var(--accent) 35%,var(--card-2))' };
