// FD and RD Calculator: what a fixed deposit or a recurring (monthly) deposit pays at maturity.
import { h, panel, seg, select, field } from '../ui.js';
import { numField, currencyField, money, stats, donut, table, COL } from '../lib/calc.js';

/** Fixed deposit: p at r % for t years, compounded n times a year (n = 0: simple interest). */
export function fd(p, r, t, n) { return n === 0 ? p * (1 + r / 100 * t) : p * (1 + r / 100 / n) ** (n * t); }
/** Recurring deposit, as Indian banks count it: each monthly deposit grows with quarterly compounding for the months it stays. */
export function rd(m, r, months) { let s = 0; for (let k = 1; k <= months; k++) s += m * (1 + r / 400) ** (k / 3); return s; }

export default function (root) {
  const run = () => draw();
  const kind = seg('', [['fd', 'Fixed Deposit (FD)'], ['rd', 'Recurring Deposit (RD)']], 'fd', () => { const f = kind.value === 'fd'; amt.el.querySelector('label').textContent = f ? 'Deposit' : 'Monthly Deposit'; amt.value = f ? 100000 : 5000; comp.hidden = !f; draw(); });
  const amt = numField('Deposit', 100000, { onInput: run }), rate = numField('Interest Rate', 7, { suffix: '% a year', onInput: run });
  const yrs = numField('Years', 5, { onInput: run }), mon = numField('Months', 0, { onInput: run });
  const cs = select([['4', 'Every Quarter (usual)'], ['12', 'Every Month'], ['2', 'Every Half Year'], ['1', 'Every Year'], ['0', 'Simple Interest (no compounding)']], '4', { onChange: run });
  const comp = field('Interest Added', cs), cur = currencyField('INR', run), out = h('div', { 'aria-live': 'polite' });
  function draw() {
    const p = amt.value, r = rate.value, months = Math.round((yrs.value || 0) * 12 + (mon.value || 0)), c = cur.value;
    if (!(p > 0) || !(r >= 0) || r > 100 || !(months >= 1) || months > 1200) { out.replaceChildren(h('p', { class: 'note', text: 'Enter the deposit, a rate from 0 to 100 and a period of at least one month.' })); return; }
    const isFd = kind.value === 'fd', n = +cs.value, inv = isFd ? p : p * months, mat = isFd ? fd(p, r, months / 12, n) : rd(p, r, months);
    const yearly = Array.from({ length: Math.ceil(months / 12) }, (_, y) => { const mm = Math.min(months, (y + 1) * 12); const v = isFd ? fd(p, r, mm / 12, n) : rd(p, r, mm); const iv = isFd ? p : p * mm; return ['Year ' + (y + 1), money(iv, c), money(v - iv, c), money(v, c)]; });
    out.replaceChildren(stats([['Invested', money(inv, c)], ['Interest Earned', money(mat - inv, c)], ['Maturity Value', money(mat, c), 1]]),
      donut([['Deposits', inv, COL.b], ['Interest', mat - inv, COL.a]]), table(['Year', 'Deposited', 'Interest', 'Value'], yearly),
      h('p', { class: 'hint', text: 'Before tax. Banks may round a little differently, and some take tax off the interest (TDS).' }));
  }
  root.append(h('div', { class: 'field' }, kind.el), h('div', { class: 'cols pl' }, panel(h('h2', { text: 'Result' }), out),
    panel(h('h2', { text: 'Your Deposit' }), amt.el, rate.el, h('div', { class: 'mini' }, yrs.el, mon.el), comp, cur.el)));
  draw();
}
