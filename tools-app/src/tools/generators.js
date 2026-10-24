// Password and UUID: strong random passwords and UUIDs, made on your device.
import { h, range, check, seg, button, copyText, panel, note } from '../ui.js';

/** A random whole number below n, with no bias. */
function rnd(n) { const max = Math.floor(0x100000000 / n) * n, a = new Uint32Array(1); do crypto.getRandomValues(a); while (a[0] >= max); return a[0] % n; }
const SETS = { upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', lower: 'abcdefghijklmnopqrstuvwxyz', digits: '0123456789', symbols: '!@#$%^&*()-_=+[]{};:,.?/~' };
const LOOKALIKE = /[Il1O0o|`'"]/g;
function uuid() {
  if (crypto.randomUUID && window.isSecureContext) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
  const x = [...b].map((v) => v.toString(16).padStart(2, '0')).join('');
  return x.slice(0, 8) + '-' + x.slice(8, 12) + '-' + x.slice(12, 16) + '-' + x.slice(16, 20) + '-' + x.slice(20);
}

export default function (root) {
  const area = h('div');
  const tab = seg('', [['pw', 'Passwords'], ['uuid', 'UUIDs']], 'pw', () => show());
  const list = (items) => h('ul', { class: 'flist' }, items.map((t) => h('li', {}, h('span', { class: 'out', text: t }), button('', { icon: 'copy', small: true, aria: 'Copy', onClick: () => copyText(t) }))));
  function show() {
    if (tab.value === 'pw') {
      const len = range('Length', 4, 128, 1, 20, (v) => v + ' characters', () => make());
      const c = { upper: check('Capital letters (A–Z)', true, () => make()), lower: check('Small letters (a–z)', true, () => make()), digits: check('Numbers (0–9)', true, () => make()), symbols: check('Symbols (!@#$…)', true, () => make()), look: check('Leave out look-alikes (I l 1 O 0)', false, () => make()) };
      const howMany = range('How many', 1, 30, 1, 5, (v) => String(v), () => make());
      const out = h('div', { 'aria-live': 'polite' });
      function make() {
        const sets = Object.keys(SETS).filter((k) => c[k].value).map((k) => c.look.value ? SETS[k].replace(LOOKALIKE, '') : SETS[k]);
        if (!sets.length) { out.replaceChildren(note('Pick at least one kind of character.', true)); return; }
        const all = sets.join(''), n = len.value;
        const one = () => { const p = sets.map((s) => s[rnd(s.length)]); while (p.length < n) p.push(all[rnd(all.length)]); for (let i = p.length - 1; i > 0; i--) { const j = rnd(i + 1); [p[i], p[j]] = [p[j], p[i]]; } return p.slice(0, n).join(''); };
        const bits = Math.round(n * Math.log2(all.length));
        const verdict = bits >= 100 ? 'Very strong' : bits >= 75 ? 'Strong' : bits >= 50 ? 'Fair' : 'Weak';
        out.replaceChildren(note(verdict + ': about ' + bits + ' bits of randomness.', bits < 50), list(Array.from({ length: howMany.value }, one)));
      }
      area.replaceChildren(h('div', { class: 'cols' }, panel(len.el, ...Object.values(c).map((x) => x.el), howMany.el, button('Make New Ones', { primary: true, icon: 'refresh', onClick: () => make() })), panel(h('h2', { text: 'Your passwords' }), out)));
      make();
    } else {
      const howMany = range('How many', 1, 100, 1, 5, (v) => String(v), () => make()), up = check('Capital letters', false, () => make()), nodash = check('Without dashes', false, () => make());
      const out = h('div', { 'aria-live': 'polite' });
      function make() { let u = Array.from({ length: howMany.value }, uuid); if (up.value) u = u.map((x) => x.toUpperCase()); if (nodash.value) u = u.map((x) => x.replace(/-/g, '')); out.replaceChildren(list(u), button('Copy All', { icon: 'copy', onClick: () => copyText(u.join('\n')) })); }
      area.replaceChildren(h('div', { class: 'cols' }, panel(howMany.el, up.el, nodash.el, button('Make New Ones', { primary: true, icon: 'refresh', onClick: () => make() }), h('p', { class: 'hint', text: 'Version 4 (random) UUIDs.' })), panel(h('h2', { text: 'Your UUIDs' }), out)));
      make();
    }
  }
  root.append(h('div', { class: 'field' }, tab.el), area); show();
}
