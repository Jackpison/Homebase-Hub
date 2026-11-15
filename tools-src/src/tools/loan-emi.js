// EMI Calculator: the monthly payment of a loan, the interest it costs, and the full repayment schedule (by year or by month).
import { h, panel, seg, button } from '../ui.js';
import { numField, currencyField, money, stats, donut, table, csvDownload, COL } from '../lib/calc.js';

/** The monthly payment for amount p at yearly rate r (%) over n months. */
export function emi(p, r, n) { const i = r / 12 / 100; return i === 0 ? p / n : p * i * (1 + i) ** n / ((1 + i) ** n - 1); }

export default function (root) {
  const run = () => draw();
  const amt = numField('Loan Amount', 1000000, { onInput: run }), rate = numField('Interest Rate', 8.5, { suffix: '% a year', onInput: run });
  const term = numField('Loan Term', 20, { onInput: run }), unit = seg('', [['y', 'Years'], ['m', 'Months']], 'y', run);
  const cur = currencyField('INR', run), by = seg('', [['y', 'By Year'], ['m', 'By Month']], 'y', run);
  const out = h('div', { 'aria-live': 'polite' }), sched = h('div');
  let rows = [];
  function draw() {
    const p = amt.value, r = rate.value, n = Math.round(unit.value === 'y' ? term.value * 12 : term.value), c = cur.value;
    if (!(p > 0) || !(r >= 0) || !(r <= 100) || !(n >= 1) || n > 1200) { out.replaceChildren(h('p', { class: 'note', text: 'Enter the loan amount, a rate from 0 to 100 and a term of up to 100 years.' })); sched.replaceChildren(); return; }
    const m = emi(p, r, n), i = r / 12 / 100; let bal = p; rows = [];
    for (let k = 1; k <= n; k++) { const int = bal * i, pr = Math.min(bal, m - int); bal = Math.max(0, bal - pr); rows.push([k, pr, int, bal]); }
    const total = m * n;
    out.replaceChildren(stats([['Monthly EMI', money(m, c), 1], ['Total Interest', money(total - p, c)], ['Total Payment', money(total, c)]]),
      donut([['Principal', p, COL.a], ['Interest', total - p, COL.b]]));
    const list = by.value === 'm' ? rows.map(([k, pr, int, b]) => ['Month ' + k, money(pr, c), money(int, c), money(b, c)])
      : Array.from({ length: Math.ceil(n / 12) }, (_, y) => { const part = rows.slice(y * 12, y * 12 + 12); return ['Year ' + (y + 1), money(part.reduce((s, x) => s + x[1], 0), c), money(part.reduce((s, x) => s + x[2], 0), c), money(part[part.length - 1][3], c)]; });
    sched.replaceChildren(table([by.value === 'm' ? 'Month' : 'Year', 'Principal', 'Interest', 'Balance'], list, 'Repayment schedule'));
  }
  const csv = button('Download CSV', { icon: 'download', onClick: () => csvDownload('loan-schedule.csv', ['Month', 'Principal', 'Interest', 'Balance'], rows.map(([k, a, b, c]) => [k, a.toFixed(2), b.toFixed(2), c.toFixed(2)])) });
  root.append(h('div', { class: 'cols pl' },
    panel(h('h2', { text: 'Result' }), out, h('h2', { text: 'Schedule' }), h('div', { class: 'row', style: 'align-items:center;margin-bottom:12px' }, by.el, csv), sched),
    panel(h('h2', { text: 'Your Loan' }), amt.el, rate.el, h('div', { class: 'row', style: 'align-items:flex-end' }, h('div', { class: 'grow' }, term.el), h('div', { style: 'margin-bottom:14px' }, unit.el)), cur.el,
      h('p', { class: 'hint', text: 'EMI = P × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1), with r the monthly rate. Banks may round each payment a little differently.' }))));
  draw();
}
