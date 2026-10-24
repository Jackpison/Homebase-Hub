// Text Tools: word counter, case converter, Base64 and URL encoding.
import { h, field, textarea, seg, button, copyText, panel, note } from '../ui.js';

const words = (t) => { if (window.Intl && Intl.Segmenter) { let n = 0; for (const s of new Intl.Segmenter(undefined, { granularity: 'word' }).segment(t)) if (s.isWordLike) n++; return n; } return (t.match(/[\p{L}\p{N}']+/gu) || []).length; };
const split = (t) => t.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const CASES = [
  ['UPPER CASE', (t) => t.toUpperCase()], ['lower case', (t) => t.toLowerCase()],
  ['Title Case', (t) => t.toLowerCase().replace(/(^|[\s\-("'“‘])(\p{L})/gu, (m, a, b) => a + b.toUpperCase())],
  ['Sentence case', (t) => t.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (m, a, b) => a + b.toUpperCase())],
  ['camelCase', (t) => split(t).map((w, i) => i ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()).join('')],
  ['snake_case', (t) => split(t).map((w) => w.toLowerCase()).join('_')], ['kebab-case', (t) => split(t).map((w) => w.toLowerCase()).join('-')],
];
const b64enc = (t) => { const b = new TextEncoder().encode(t); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
const b64dec = (t) => { const s = atob(t.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(t.replace(/\s+/g, '').length / 4) * 4, '=')); return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(s, (c) => c.charCodeAt(0))); };

export default function (root) {
  const area = h('div');
  const tab = seg('', [['count', 'Word Counter'], ['case', 'Case Converter'], ['b64', 'Base64'], ['url', 'URL Encoding']], 'count', () => show());
  const io = (run, btns) => {
    const a = textarea({ rows: 9, 'aria-label': 'Your text' }), b = textarea({ rows: 9, readonly: true, 'aria-label': 'Result' }), msg = h('div');
    const go = (fn) => () => { msg.replaceChildren(); try { b.value = fn(a.value); } catch (e) { b.value = ''; msg.append(note(e.message || 'That text cannot be read this way.', true)); } };
    return h('div', { class: 'cols' }, panel(field('Your text', a), h('div', { class: 'row' }, btns.map(([l, fn, pri]) => button(l, { primary: pri, onClick: go(fn) }))), msg),
      panel(field('Result', b), h('div', { class: 'row' }, button('Copy', { icon: 'copy', onClick: () => b.value && copyText(b.value) }), button('Use as Input', { icon: 'up', onClick: () => { a.value = b.value; a.focus(); } }))));
  };
  function show() {
    const k = tab.value;
    if (k === 'count') {
      const a = textarea({ rows: 10, placeholder: 'Type or paste your text', 'aria-label': 'Your text' }), kv = h('div', { class: 'kv', 'aria-live': 'polite' });
      const draw = () => { const t = a.value, w = words(t); const st = [['Words', w], ['Characters', [...t].length], ['Without spaces', [...t.replace(/\s/g, '')].length], ['Sentences', (t.match(/[^.!?]+[.!?]+(\s|$)/g) || (t.trim() ? [t] : [])).length], ['Paragraphs', t.split(/\n\s*\n/).filter((p) => p.trim()).length], ['Lines', t ? t.split('\n').length : 0], ['Reading time', Math.max(w ? 1 : 0, Math.round(w / 200)) + ' min']];
        kv.replaceChildren(...st.map(([l, v]) => h('div', {}, h('b', { text: String(v) }), h('span', { text: l })))); };
      a.addEventListener('input', draw); draw();
      area.replaceChildren(panel(field('Your text', a), kv));
    } else if (k === 'case') area.replaceChildren(io(null, CASES.map(([l, fn], i) => [l, fn, i === 0])));
    else if (k === 'b64') area.replaceChildren(io(null, [['Encode', b64enc, true], ['Decode', (t) => { try { return b64dec(t); } catch (e) { throw new Error('That is not valid Base64 text.'); } }]]));
    else area.replaceChildren(io(null, [['Encode', encodeURIComponent, true], ['Decode', (t) => { try { return decodeURIComponent(t.replace(/\+/g, ' ')); } catch (e) { throw new Error('That text has a broken % sequence.'); } }]]));
  }
  root.append(h('div', { class: 'field' }, tab.el), area); show();
}
