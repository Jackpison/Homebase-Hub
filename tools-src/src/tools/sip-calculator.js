// SIP and Lumpsum Calculator: what a monthly investment (with an optional yearly step-up) or a one-time amount may grow to.
import { h, panel, seg } from '../ui.js';
import { numField, currencyField, money, stats, bars, table, COL } from '../lib/calc.js';

/** Month by month: the amount goes in at the start of each month and grows at r/12 % (as fund houses show it). Returns [invested, value] per year. */
export function sip(p, r, years, step = 0) {
  const i = r / 12 / 100, out = []; let bal = 0, inv = 0, amt = p;
  for (let m = 1; m <= years * 12; m++) { bal = (bal + amt) * (1 + i); inv += amt; if (m % 12 === 0) { out.push([inv, bal]); amt *= 1 + step / 100; } }
  return out;
}
export function lump(p, r, years) { return Array.from({ length: years }, (_, y) => [p, p * (1 + r / 100) ** (y + 1)]); }

export default function (root) {
  const run = () => draw();
  const mode = seg('', [['sip', 'SIP (Monthly)'], ['lump', 'Lumpsum (One Time)']], 'sip', () => { step.el.hidden = mode.value !== 'sip'; amt.el.querySelector('label').textContent = mode.value === 'sip' ? 'Monthly Investment' : 'Amount Invested'; amt.value = mode.value === 'sip' ? 10000 : 100000; draw(); });
  const amt = numField('Monthly Investment', 10000, { onInput: run }), rate = numField('Expected Return', 12, { suffix: '% a year', onInput: run });
  const yrs = numField('Time', 10, { suffix: 'years', onInput: run }), step = numField('Step Up Each Year', 0, { suffix: '%', hint: 'Raise the monthly amount by this much every year (0 for none).', onInput: run });
  const cur = currencyField('INR', run), out = h('div', { 'aria-live': 'polite' });
  function draw() {
    const p = amt.value, r = rate.value, y = Math.round(yrs.value), s = mode.value === 'sip' ? (step.value || 0) : 0, c = cur.value;
    if (!(p > 0) || !(r >= 0) || r > 100 || !(y >= 1) || y > 60 || s < 0 || s > 100) { out.replaceChildren(h('p', { class: 'note', text: 'Enter an amount, a return from 0 to 100 and from 1 to 60 years.' })); return; }
    const res = mode.value === 'sip' ? sip(p, r, y, s) : lump(p, r, y), [inv, val] = res[res.length - 1];
    out.replaceChildren(stats([['Invested', money(inv, c)], ['Estimated Returns', money(val - inv, c)], ['Total Value', money(val, c), 1]]),
      bars(res.map(([a, b], k) => [String(k + 1), a, Math.max(0, b - a)]), [COL.b, COL.a], ['Invested', 'Returns']),
      table(['Year', 'Invested', 'Returns', 'Value'], res.map(([a, b], k) => ['Year ' + (k + 1), money(a, c), money(b - a, c), money(b, c)])),
      h('p', { class: 'hint', text: 'An estimate at a steady return. Real returns go up and down, and are not promised.' }));
  }
  root.append(h('div', { class: 'field' }, mode.el), h('div', { class: 'cols pl' }, panel(h('h2', { text: 'Result' }), out), panel(h('h2', { text: 'Your Plan' }), amt.el, rate.el, yrs.el, step.el, cur.el)));
  draw();
}
