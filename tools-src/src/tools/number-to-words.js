// Number to Words: any amount written out in words, the Indian way (lakh, crore) or the international way (million, billion),
// as a plain number or as money (for cheques and invoices).
import { h, panel, seg, check, button, copyText, input, field } from '../ui.js';
import { currencyField } from '../lib/calc.js';

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const BIG = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion', 'quintillion', 'sextillion', 'septillion'];
// money names: [whole, wholes, part, parts]
const MONEY = { INR: ['rupee', 'rupees', 'paisa', 'paise'], USD: ['dollar', 'dollars', 'cent', 'cents'], EUR: ['euro', 'euros', 'cent', 'cents'], GBP: ['pound', 'pounds', 'penny', 'pence'], AED: ['dirham', 'dirhams', 'fils', 'fils'], SGD: ['dollar', 'dollars', 'cent', 'cents'], AUD: ['dollar', 'dollars', 'cent', 'cents'], CAD: ['dollar', 'dollars', 'cent', 'cents'], JPY: ['yen', 'yen', '', ''] };

function under1000(n, and) {   // n: 0..999 as a Number
  const out = [];
  if (n >= 100) { out.push(ONES[Math.floor(n / 100)], 'hundred'); n %= 100; if (n && and) out.push('and'); }
  if (n >= 20) out.push(TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '')); else if (n) out.push(ONES[n]);
  return out.join(' ');
}
/** International: groups of three (thousand, million, billion...). n: a BigInt >= 0. */
export function intl(n, and = false) {
  if (n === 0n) return 'zero';
  const parts = []; let i = 0;
  while (n > 0n) { const g = Number(n % 1000n); if (g) parts.unshift(under1000(g, and) + (BIG[i] ? ' ' + BIG[i] : '')); n /= 1000n; i++; if (i >= BIG.length && n > 0n) throw new Error('That number is too big.'); }
  return parts.join(' ');
}
/** Indian: hundred, thousand, lakh, crore; above 99 crore the crores are counted again the same way ("one lakh crore"). */
export function indian(n, and = false) {
  if (n === 0n) return 'zero';
  const out = [];
  if (n >= 10000000n) { out.push(indian(n / 10000000n, and) + ' crore'); n %= 10000000n; }
  if (n >= 100000n) { out.push(under1000(Number(n / 100000n), and) + ' lakh'); n %= 100000n; }
  if (n >= 1000n) { out.push(under1000(Number(n / 1000n), and) + ' thousand'); n %= 1000n; }
  if (n > 0n) out.push(under1000(Number(n), and));
  return out.join(' ');
}
const cap = (s) => s.replace(/(^|[\s-])([a-z])/g, (m, a, b) => a + b.toUpperCase());

/** "1234.5" -> words. style: 'in' or 'intl'; cur: a currency code or '' for a plain number. */
export function words(text, style = 'in', cur = '') {
  const t = String(text).replace(/[\s,_]/g, ''), m = /^(-)?(\d*)(?:\.(\d*))?$/.exec(t);
  if (!m || (!m[2] && !m[3])) throw new Error('Type a number, like 125000 or 1,25,000.50');
  if (m[2].replace(/^0+/, '').length > 27) throw new Error('That number is too big.');
  const W = style === 'in' ? indian : intl, and = style !== 'in', neg = m[1] ? 'minus ' : '', whole = BigInt(m[2] || '0'), frac = m[3] || '';
  if (!cur) return neg + W(whole, and) + (frac ? ' point ' + [...frac].map((d) => ONES[+d]).join(' ') : '');
  const [one, many, p1, pn] = MONEY[cur] || ['', '', '', ''], digits = cur === 'JPY' ? 0 : 2;
  let paise = digits ? Math.round(+('0.' + (frac || '0')) * 100) : 0, w = whole; if (paise === 100) { w += 1n; paise = 0; }
  let s = neg + W(w, and) + ' ' + (w === 1n ? one : many);
  if (paise) s += ' and ' + W(BigInt(paise)) + ' ' + (paise === 1 ? p1 : pn);
  return s + ' only';
}
const group = (t, loc) => { const m = /^(-?)(\d+)(\.\d+)?$/.exec(t); return m ? m[1] + BigInt(m[2]).toLocaleString(loc) + (m[3] || '') : ''; };

export default function (root) {
  const inp = input({ inputmode: 'decimal', value: '1234567.89', autocomplete: 'off', onInput: () => draw() });
  const style = seg('Style', [['in', 'Indian (Lakh, Crore)'], ['intl', 'International (Million)']], 'in', () => draw());
  const asMoney = check('As money (for a cheque or invoice)', true, () => { cur.el.hidden = !asMoney.value; draw(); }), cur = currencyField('INR', () => draw());
  const caps = seg('Letters', [['t', 'Title Case'], ['u', 'CAPITALS'], ['l', 'lower case']], 't', () => draw());
  const out = h('p', { class: 'words', 'aria-live': 'polite' }), grp = h('p', { class: 'hint' });
  const copy = button('Copy', { icon: 'copy', primary: true, onClick: () => copyText(out.textContent) });
  function draw() {
    try {
      let s = words(inp.value, style.value, asMoney.value ? cur.value : '');
      s = caps.value === 'u' ? s.toUpperCase() : caps.value === 't' ? cap(s).replace(/ And /g, ' and ') : s;
      out.textContent = s; out.classList.remove('bad'); copy.disabled = false;
      const t = inp.value.replace(/[\s,_]/g, '');
      grp.textContent = 'Indian: ' + group(t, 'en-IN') + '   ·   International: ' + group(t, 'en-US');
    } catch (e) { out.textContent = e.message; copy.disabled = true; grp.textContent = ''; }
  }
  root.append(h('div', { class: 'cols pl' }, panel(h('h2', { text: 'In Words' }), out, grp, copy),
    panel(field('Number', inp, 'Up to 27 digits. Commas and spaces are fine.'), style.el, asMoney.el, cur.el, caps.el)));
  draw();
}
