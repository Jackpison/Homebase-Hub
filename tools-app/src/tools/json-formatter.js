// JSON Formatter: format, minify, sort keys and validate, with the exact line and column of an error.
import { h, field, textarea, seg, check, button, download, copyText, panel, note, bytes } from '../ui.js';

/** The first error in a JSON text: {pos, msg}, or null when it is valid. Browsers word (and place) JSON errors differently; this does not. */
export function locate(s) {
  let i = 0;
  const fail = (msg) => { throw { pos: i, msg }; };
  const ws = () => { while (i < s.length && ' \t\n\r'.includes(s[i])) i++; };
  const str = () => {
    i++;
    while (i < s.length) {
      const c = s[i];
      if (c === '"') { i++; return; }
      if (c === '\\') { const n = s[i + 1]; if ('"\\/bfnrt'.includes(n)) i += 2; else if (n === 'u' && /^[0-9a-fA-F]{4}$/.test(s.substr(i + 2, 4))) i += 6; else fail('A backslash must start a valid escape like \\n or \\u0041'); }
      else if (c < ' ') fail('Line breaks and tabs inside a string must be written as \\n and \\t');
      else i++;
    }
    fail('A string is not closed: add the missing "');
  };
  const num = () => { const re = /-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/y; re.lastIndex = i; const m = re.exec(s); if (!m || !m[0] || m[0] === '-') fail('This is not a valid number'); i += m[0].length; };
  const word = (w) => { if (s.startsWith(w, i)) i += w.length; else fail('Unexpected text here: true, false and null are written in small letters, and text needs double quotes'); };
  const val = () => {
    ws(); const c = s[i];
    if (c === undefined) fail('The text ends too early');
    if (c === '{') return obj(); if (c === '[') return arr(); if (c === '"') return str();
    if (c === '-' || (c >= '0' && c <= '9')) return num();
    if (c === "'") fail('Use double quotes, not single quotes');
    return word(c === 't' ? 'true' : c === 'f' ? 'false' : 'null');
  };
  const obj = () => {
    i++; ws(); if (s[i] === '}') { i++; return; }
    for (;;) {
      ws(); if (s[i] !== '"') fail(s[i] === "'" ? 'Keys need double quotes, not single quotes' : 'A key in double quotes is expected here');
      str(); ws(); if (s[i] !== ':') fail('A : is expected after the key'); i++; val(); ws();
      if (s[i] === ',') { i++; ws(); if (s[i] === '}') fail('Remove the comma before }'); continue; }
      if (s[i] === '}') { i++; return; }
      fail('A , or } is expected here');
    }
  };
  const arr = () => {
    i++; ws(); if (s[i] === ']') { i++; return; }
    for (;;) { val(); ws(); if (s[i] === ',') { i++; ws(); if (s[i] === ']') fail('Remove the comma before ]'); continue; } if (s[i] === ']') { i++; return; } fail('A , or ] is expected here'); }
  };
  try { ws(); if (i >= s.length) fail('There is nothing to read'); val(); ws(); if (i < s.length) fail('There is more text after the end of the JSON'); return null; }
  catch (e) { if (e && typeof e.pos === 'number') return e; throw e; }
}
const sortKeys = (v) => Array.isArray(v) ? v.map(sortKeys) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort((a, b) => a.localeCompare(b)).map((k) => [k, sortKeys(v[k])])) : v;

export default function (root) {
  const src = textarea({ rows: 14, placeholder: '{"paste": "your JSON here"}', 'aria-label': 'JSON to read' });
  const res = textarea({ rows: 14, readonly: true, 'aria-label': 'Result' });
  const ind = seg('Indent', [['2', '2 spaces'], ['4', '4 spaces'], ['t', 'Tab']], '2');
  const sort = check('Sort keys A to Z', false);
  const msg = h('div', { 'aria-live': 'polite' });
  function parse() {
    const t = src.value, err = locate(t);
    if (!err) { msg.replaceChildren(note('Valid JSON (' + bytes(new Blob([t]).size) + ').')); return { ok: true, v: JSON.parse(t) }; }
    const before = t.slice(0, err.pos), line = before.split('\n').length, col = err.pos - before.lastIndexOf('\n');
    const lineText = t.split('\n')[line - 1] || '';
    msg.replaceChildren(h('div', { class: 'note bad', role: 'alert' }, h('b', { text: 'Line ' + line + ', column ' + col + ': ' }), err.msg,
      h('pre', { class: 'out', text: lineText.slice(Math.max(0, col - 40), col + 40) + '\n' + ' '.repeat(Math.min(col - 1, 40)) + '^' })));
    src.focus(); src.setSelectionRange(err.pos, Math.min(err.pos + 1, t.length));
    return { ok: false };
  }
  const run = (min) => { const p = parse(); if (!p.ok) return; let v = p.v; if (sort.value) v = sortKeys(v); res.value = min ? JSON.stringify(v) : JSON.stringify(v, null, ind.value === 't' ? '\t' : +ind.value); };
  root.append(h('div', { class: 'cols' },
    panel(field('Your JSON', src), h('div', { class: 'row' }, button('Format', { primary: true, icon: 'braces', onClick: () => run(false) }), button('Minify', { icon: 'compress', onClick: () => run(true) }), button('Check Only', { icon: 'check', onClick: parse })), ind.el, sort.el, msg),
    panel(field('Result', res), h('div', { class: 'row' }, button('Copy', { icon: 'copy', onClick: () => res.value && copyText(res.value) }), button('Download', { icon: 'download', onClick: () => res.value && download(new Blob([res.value], { type: 'application/json' }), 'formatted.json') })))));
}
