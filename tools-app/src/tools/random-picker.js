// Random Picker: pick names from a list, shuffle a list, pick numbers, toss a coin or roll dice. Fair: it uses the browser's
// cryptographic random numbers, with no bias towards any choice.
import { h, panel, seg, textarea, field, check, button, copyText } from '../ui.js';
import { numField } from '../lib/calc.js';

/** A fair whole number from 0 to n - 1. */
export function rnd(n) { const lim = Math.floor(0x100000000 / n) * n, a = new Uint32Array(1); do crypto.getRandomValues(a); while (a[0] >= lim); return a[0] % n; }
export function shuffle(list) { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

export default function (root) {
  const area = h('div'), out = h('div', { 'aria-live': 'polite' }), hist = [];
  const histBox = h('div');
  function result(items, label) {
    out.replaceChildren(h('div', { class: 'picked' }, items.map((x) => h('b', { text: String(x) }))), button('Copy', { icon: 'copy', small: true, onClick: () => copyText(items.join('\n')) }));
    hist.unshift(label + ': ' + items.join(', ')); hist.length = Math.min(hist.length, 10);
    histBox.replaceChildren(h('h2', { text: 'Earlier' }), h('ol', { class: 'hint' }, hist.map((x) => h('li', { text: x }))));
  }
  const names = textarea({ rows: 8, 'aria-label': 'List', value: 'Asha\nRavi\nMeera\nKabir\nZoya\nArjun' });
  const howMany = numField('How Many', 1), noRepeat = check('Remove the picked ones from the list', false);
  const lo = numField('From', 1), hi = numField('To', 100), cnt = numField('How Many', 1), uniq = check('No number twice', true);
  const dice = numField('Dice', 2), sides = numField('Sides', 6);
  const P = {
    list: () => [field('One per line', names), howMany.el, noRepeat.el, h('div', { class: 'row' }, button('Pick', { primary: true, onClick: () => {
      const L = names.value.split('\n').map((x) => x.trim()).filter(Boolean), n = Math.min(L.length, Math.max(1, Math.round(howMany.value) || 1));
      if (!L.length) return out.replaceChildren(h('p', { class: 'note', text: 'Add some names or items first.' }));
      const got = shuffle(L).slice(0, n); result(got, 'Picked');
      if (noRepeat.value) { const left = [...L]; for (const g of got) left.splice(left.indexOf(g), 1); names.value = left.join('\n'); }
    } }), button('Shuffle All', { onClick: () => { const L = names.value.split('\n').map((x) => x.trim()).filter(Boolean); if (L.length) result(shuffle(L), 'Shuffled'); } }))],
    num: () => [h('div', { class: 'mini' }, lo.el, hi.el, cnt.el), uniq.el, button('Pick', { primary: true, onClick: () => {
      const a = Math.ceil(Math.min(lo.value, hi.value)), b = Math.floor(Math.max(lo.value, hi.value)), n = Math.max(1, Math.min(1000, Math.round(cnt.value) || 1));
      if (!isFinite(a) || !isFinite(b) || b - a > 2 ** 32 - 2) return out.replaceChildren(h('p', { class: 'note', text: 'Choose two whole numbers.' }));
      if (uniq.value && n > b - a + 1) return out.replaceChildren(h('p', { class: 'note', text: 'There are only ' + (b - a + 1) + ' numbers in that range.' }));
      const got = []; const s = new Set(); while (got.length < n) { const x = a + rnd(b - a + 1); if (uniq.value && s.has(x)) continue; s.add(x); got.push(x); }
      result(got, 'Numbers ' + a + '–' + b);
    } })],
    coin: () => [button('Toss', { primary: true, onClick: () => result([rnd(2) ? 'Heads' : 'Tails'], 'Coin') })],
    dice: () => [h('div', { class: 'mini' }, dice.el, sides.el), button('Roll', { primary: true, onClick: () => {
      const n = Math.max(1, Math.min(20, Math.round(dice.value) || 1)), s = Math.max(2, Math.min(1000, Math.round(sides.value) || 6)), r = Array.from({ length: n }, () => 1 + rnd(s));
      result(n > 1 ? [...r, '= ' + r.reduce((a, b) => a + b, 0)] : r, n + ' × d' + s);
    } })],
  };
  const mode = seg('', [['list', 'From a List'], ['num', 'Numbers'], ['coin', 'Coin'], ['dice', 'Dice']], 'list', () => { area.replaceChildren(...P[mode.value]()); out.replaceChildren(); });
  root.append(h('div', { class: 'field' }, mode.el), h('div', { class: 'cols pl' }, panel(h('h2', { text: 'Result' }), out, histBox), panel(area)));
  area.replaceChildren(...P.list());
}
