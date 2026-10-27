// Age and Date Calculator: an exact age, the time between two dates (with working days), and a date plus or minus some days.
import { h, panel, seg, input, field, select, check } from '../ui.js';
import { numField, stats, num } from '../lib/calc.js';

const DAY = 86400000;
const iso = (d) => d.toISOString().slice(0, 10);
const today = () => { const n = new Date(); return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())); };
const read = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); return m ? new Date(Date.UTC(+m[1], m[2] - 1, +m[3])) : null; };
const long = (d) => d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const pl = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
const dim = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

/** Whole years, months and days from a to b (a <= b), counted the way people say an age. */
export function ymd(a, b) {
  let y = b.getUTCFullYear() - a.getUTCFullYear(), m = b.getUTCMonth() - a.getUTCMonth(), d = b.getUTCDate() - a.getUTCDate();
  if (d < 0) { m--; d += dim(b.getUTCFullYear(), b.getUTCMonth() - 1); }
  if (m < 0) { y--; m += 12; }
  return [y, m, d];
}
/** Monday to Friday between a and b, both counted. */
export function workdays(a, b) { let n = 0; for (let t = a.getTime(); t <= b.getTime(); t += DAY) { const w = new Date(t).getUTCDay(); if (w && w < 6) n++; } return n; }
export function addTo(d, n, unit) {
  const r = new Date(d.getTime());
  if (unit === 'd') r.setUTCDate(r.getUTCDate() + n); else if (unit === 'w') r.setUTCDate(r.getUTCDate() + n * 7);
  else { const months = unit === 'y' ? n * 12 : n, day = r.getUTCDate(); r.setUTCDate(1); r.setUTCMonth(r.getUTCMonth() + months); r.setUTCDate(Math.min(day, dim(r.getUTCFullYear(), r.getUTCMonth()))); }
  return r;
}

export default function (root) {
  const area = h('div'), out = h('div', { 'aria-live': 'polite' });
  const date = (v, lbl) => { const i = input({ type: 'date', value: v, onInput: () => draw() }); return { el: field(lbl, i), get d() { return read(i.value); }, i }; };
  const t0 = iso(today());
  const P = {
    age: { born: date('1990-05-15', 'Date of Birth'), on: date(t0, 'Age On') },
    between: { a: date(t0.slice(0, 4) + '-01-01', 'From'), b: date(t0, 'To'), incl: check('Count the last day too', false, () => draw()) },
    add: { a: date(t0, 'Start Date'), op: select([['+', 'Add'], ['-', 'Subtract']], '+', { onChange: () => draw() }), n: numField('How Many', 90, { onInput: () => draw() }), u: select([['d', 'Days'], ['w', 'Weeks'], ['m', 'Months'], ['y', 'Years']], 'd', { onChange: () => draw() }) },
  };
  const tab = seg('', [['age', 'Age'], ['between', 'Between Two Dates'], ['add', 'Add or Subtract']], 'age', () => show());
  function show() {
    const p = P[tab.value];
    area.replaceChildren(...(tab.value === 'age' ? [p.born.el, p.on.el] : tab.value === 'between' ? [p.a.el, p.b.el, p.incl.el] : [p.a.el, h('div', { class: 'mini' }, field('Add or Subtract', p.op), p.n.el, field('Of', p.u))]));
    draw();
  }
  function draw() {
    const p = P[tab.value], bad = (t) => out.replaceChildren(h('p', { class: 'note', text: t }));
    if (tab.value === 'age') {
      const a = p.born.d, b = p.on.d; if (!a || !b) return bad('Choose both dates.'); if (a > b) return bad('The date of birth is after the other date.');
      const [y, m, d] = ymd(a, b), days = Math.round((b - a) / DAY);
      let next = new Date(Date.UTC(b.getUTCFullYear(), a.getUTCMonth(), Math.min(a.getUTCDate(), dim(b.getUTCFullYear(), a.getUTCMonth())))); if (next < b) next = addTo(next, 1, 'y');
      const left = Math.round((next - b) / DAY);
      out.replaceChildren(h('div', { class: 'big-out', text: pl(y, 'year') + ', ' + pl(m, 'month') + ', ' + pl(d, 'day') }),
        stats([['Total Months', num(y * 12 + m, 0)], ['Total Weeks', num(Math.floor(days / 7), 0)], ['Total Days', num(days, 0)], ['Next Birthday', left === 0 ? 'Today!' : 'In ' + pl(left, 'day')]]),
        h('p', { class: 'hint', text: 'Born on a ' + a.toLocaleDateString(undefined, { weekday: 'long', timeZone: 'UTC' }) + '. Turns ' + (y + (left === 0 ? 0 : 1)) + ' on ' + long(next) + '.' }));
    } else if (tab.value === 'between') {
      let a = p.a.d, b = p.b.d; if (!a || !b) return bad('Choose both dates.'); let sign = ''; if (a > b) { [a, b] = [b, a]; sign = ' (the first date is the later one)'; }
      const end = p.incl.value ? addTo(b, 1, 'd') : b, [y, m, d] = ymd(a, end), days = Math.round((end - a) / DAY);
      out.replaceChildren(h('div', { class: 'big-out', text: pl(days, 'day') }), stats([['Years, Months, Days', y + ' y, ' + m + ' m, ' + d + ' d'], ['Weeks', Math.floor(days / 7) + ' w, ' + days % 7 + ' d'], ['Working Days (Mon–Fri)', num(days ? workdays(a, addTo(end, -1, 'd')) : 0, 0)], ['Hours', num(days * 24, 0)]]), sign ? h('p', { class: 'hint', text: 'Counted from the earlier date' + sign + '.' }) : null);
    } else {
      const a = p.a.d, n = Math.round(p.n.value); if (!a || !isFinite(n)) return bad('Choose a date and a number.');
      const r = addTo(a, p.op.value === '-' ? -n : n, p.u.value);
      out.replaceChildren(h('div', { class: 'big-out', text: long(r) }), h('p', { class: 'hint', text: iso(r) }));
    }
  }
  root.append(h('div', { class: 'field' }, tab.el), h('div', { class: 'cols pl' }, panel(h('h2', { text: 'Result' }), out), panel(h('h2', { text: 'Dates' }), area)));
  show();
}
