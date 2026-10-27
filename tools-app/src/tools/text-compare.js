// Text Compare: two texts side by side, the differences marked line by line or word by word.
import { h, panel, seg, textarea, field, check, button } from '../ui.js';

/** Myers' diff of two lists. Returns [['=', x] | ['-', x] | ['+', x], ...]. eq compares two items. Throws when the texts differ in
 * too many places to compare here (the memory it needs grows with the square of the number of changes). */
export function diff(a, b, eq = (x, y) => x === y, limit = 8000) {
  let p = 0, s = 0; const head = [], tail = [];
  while (p < a.length && p < b.length && eq(a[p], b[p])) head.push(['=', a[p++]]);
  while (s < a.length - p && s < b.length - p && eq(a[a.length - 1 - s], b[b.length - 1 - s])) { tail.unshift(['=', a[a.length - 1 - s]]); s++; }
  a = a.slice(p, a.length - s); b = b.slice(p, b.length - s);
  const n = a.length, m = b.length, max = n + m, O = max + 1, v = new Int32Array(2 * max + 4), trace = [];
  const at = (vv, d, k) => vv[k + d + 1];   // trace[d] keeps v[-d-1 .. d+1]
  let found = max === 0;
  for (let d = 0; d <= max && !found; d++) {
    if (d > limit) throw new Error('These texts differ in too many places to compare here.');
    trace.push(v.slice(O - d - 1, O + d + 2));
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[O + k - 1] < v[O + k + 1]) ? v[O + k + 1] : v[O + k - 1] + 1, y = x - k;
      while (x < n && y < m && eq(a[x], b[y])) { x++; y++; }
      v[O + k] = x;
      if (x >= n && y >= m) { found = true; break; }
    }
  }
  const out = []; let x = n, y = m;
  for (let d = trace.length - 1; d >= 0 && (x > 0 || y > 0); d--) {
    const vv = trace[d], k = x - y, prev = k === -d || (k !== d && at(vv, d, k - 1) < at(vv, d, k + 1)) ? k + 1 : k - 1, px = d ? at(vv, d, prev) : 0, py = px - prev;
    while (x > px && y > py) { out.push(['=', a[--x]]); y--; }
    if (d > 0) { if (x === px) out.push(['+', b[--y]]); else out.push(['-', a[--x]]); }
  }
  return [...head, ...out.reverse(), ...tail];
}

export default function (root) {
  const A = textarea({ rows: 12, placeholder: 'The original text', 'aria-label': 'Original text' }), B = textarea({ rows: 12, placeholder: 'The changed text', 'aria-label': 'Changed text' });
  const mode = seg('Compare', [['line', 'Line by Line'], ['word', 'Word by Word']], 'line', () => run());
  const icase = check('Ignore upper and lower case', false, () => run()), ispace = check('Ignore extra spaces', true, () => run());
  const sum = h('p', { class: 'hint', 'aria-live': 'polite' }), out = h('div');
  let t = 0; const later = () => { clearTimeout(t); t = setTimeout(run, 250); };
  A.addEventListener('input', later); B.addEventListener('input', later);
  function run() { try { draw(); } catch (e) { sum.textContent = e.message; out.replaceChildren(); } }
  function draw() {
    const norm = (s) => { if (ispace.value) s = s.replace(/\s+/g, ' ').trim(); return icase.value ? s.toLowerCase() : s; }, eq = (x, y) => norm(x) === norm(y);
    if (!A.value && !B.value) { sum.textContent = 'Paste two texts to see what changed.'; out.replaceChildren(); return; }
    if (mode.value === 'line') {
      const a = A.value.split(/\r?\n/), b = B.value.split(/\r?\n/);
      const d = diff(a, b, eq), add = d.filter((x) => x[0] === '+').length, del = d.filter((x) => x[0] === '-').length;
      sum.textContent = add || del ? add + ' line' + (add === 1 ? '' : 's') + ' added, ' + del + ' removed.' : 'The two texts are the same.';
      out.replaceChildren(h('div', { class: 'diff', role: 'region', 'aria-label': 'Differences' }, d.map(([op, s]) => h('div', { class: op === '+' ? 'add' : op === '-' ? 'del' : null, text: s || ' ', 'aria-label': op === '+' ? 'Added: ' + s : op === '-' ? 'Removed: ' + s : null }))));
    } else {
      const tok = (s) => s.match(/\s+|[^\s]+/g) || [], a = tok(A.value), b = tok(B.value);
      const d = diff(a, b, (x, y) => (/^\s+$/.test(x) && /^\s+$/.test(y) && ispace.value) || eq(x, y)), add = d.filter((x) => x[0] === '+' && /\S/.test(x[1])).length, del = d.filter((x) => x[0] === '-' && /\S/.test(x[1])).length;
      sum.textContent = add || del ? add + ' word' + (add === 1 ? '' : 's') + ' added, ' + del + ' removed.' : 'The two texts are the same.';
      out.replaceChildren(h('div', { class: 'diff w', role: 'region', 'aria-label': 'Differences' }, d.map(([op, s]) => op === '=' ? s : h(op === '+' ? 'ins' : 'del', { class: 'dw', text: s }))));
    }
  }
  const swap = button('Swap', { icon: 'convert', small: true, onClick: () => { [A.value, B.value] = [B.value, A.value]; run(); } });
  root.append(h('div', { class: 'cols' }, panel(field('Original', A)), panel(field('Changed', B))),
    panel(h('div', { class: 'row' }, mode.el, swap), icase.el, ispace.el, sum, out));
  run();
}
