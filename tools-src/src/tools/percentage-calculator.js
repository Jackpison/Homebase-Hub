// Percentage and Discount Calculator: the everyday percentage sums, each worked out as you type.
import { h, panel } from '../ui.js';
import { numField, num } from '../lib/calc.js';

const f = (n) => num(n, 4);
export default function (root) {
  const cards = [];
  /** A small card: fields, and a function that turns their values into the result line(s). */
  function card(title, defs, calc) {
    const out = h('div', { 'aria-live': 'polite' }), fs = defs.map(([l, v, sfx]) => numField(l, v, { suffix: sfx, onInput: () => run() }));
    const run = () => { const v = fs.map((x) => x.value); const r = v.some((x) => !isFinite(x)) ? null : calc(...v); out.replaceChildren(...(r ? [h('div', { class: 'big-out', text: r[0] }), r[1] ? h('p', { class: 'hint', text: r[1] }) : null] : [h('p', { class: 'hint', text: 'Fill in both numbers.' })])); };
    cards.push(panel(h('h2', { text: title }), h('div', { class: 'mini' }, fs.map((x) => x.el)), out)); run();
  }
  card('Percent Of a Number', [['Percent', 15, '%'], ['Of', 2400]], (p, n) => [f(p / 100 * n), p + '% of ' + f(n)]);
  card('What Percent Is It', [['Number', 300], ['Of', 2400]], (a, b) => b === 0 ? null : [f(a / b * 100) + '%', f(a) + ' is ' + f(a / b * 100) + '% of ' + f(b)]);
  card('Percent Change', [['From', 1200], ['To', 1500]], (a, b) => a === 0 ? null : [(b >= a ? '+' : '') + f((b - a) / Math.abs(a) * 100) + '%', (b >= a ? 'An increase of ' : 'A decrease of ') + f(Math.abs(b - a))]);
  card('Discount', [['Price', 2499], ['Discount', 20, '%']], (p, d) => [f(p * (1 - d / 100)), 'You save ' + f(p * d / 100)]);
  card('Two Discounts in a Row', [['Price', 1000], ['First', 20, '%'], ['Then', 10, '%']], (p, a, b) => { const x = p * (1 - a / 100) * (1 - b / 100); return [f(x), 'The same as one discount of ' + f((1 - x / p) * 100) + '% (not ' + f(a + b) + '%)']; });
  card('Add a Percentage', [['Amount', 1000], ['Add', 18, '%']], (a, p) => [f(a * (1 + p / 100)), f(p) + '% of ' + f(a) + ' is ' + f(a * p / 100)]);
  card('Remove a Percentage (Inclusive Price)', [['Price With It', 1180], ['Included', 18, '%']], (a, p) => [f(a / (1 + p / 100)), 'The included part is ' + f(a - a / (1 + p / 100))]);
  card('Price Before a Discount', [['Price Paid', 800], ['Discount Was', 20, '%']], (a, d) => d >= 100 ? null : [f(a / (1 - d / 100)), 'The original price before ' + f(d) + '% off']);
  root.append(h('div', { class: 'cols' }, cards));
}
