// Hash Generator: SHA-1, SHA-256, SHA-384 and SHA-512 of text or files, and a check against a hash you were given.
import { sha256, sha384, sha512 } from '@noble/hashes/sha2.js';
import { sha1 } from '@noble/hashes/legacy.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { h, field, input, textarea, seg, button, copyText, dropzone, panel, note, bytes } from '../ui.js';

const ALGOS = [['SHA-1', sha1], ['SHA-256', sha256], ['SHA-384', sha384], ['SHA-512', sha512]];

export default function (root) {
  const area = h('div'), out = h('div', { 'aria-live': 'polite' });
  const expect = input({ placeholder: 'Paste a hash to compare (optional)', autocomplete: 'off' });
  let last = null;
  const tab = seg('', [['text', 'Text'], ['file', 'File']], 'text', () => show());
  function draw(res, label) {
    last = res;
    const want = expect.value.trim().toLowerCase().replace(/[^0-9a-f]/g, '');
    const hit = want && res.find(([, v]) => v === want);
    out.replaceChildren(...[h('p', { class: 'hint', text: label }),
      h('ul', { class: 'flist' }, res.map(([n, v]) => h('li', {}, h('b', { text: n }), h('span', { class: 'out', text: v }), button('', { icon: 'copy', small: true, aria: 'Copy ' + n, onClick: () => copyText(v) })))),
      want ? note(hit ? 'Match: this is the ' + hit[0] + ' you were given.' : 'No match with any of these. The file or text is different, or the hash uses another method.', !hit) : null].filter(Boolean));
  }
  expect.addEventListener('input', () => last && draw(last, out.querySelector('.hint')?.textContent || ''));
  function show() {
    out.replaceChildren(); last = null;
    if (tab.value === 'text') {
      const t = textarea({ rows: 6, placeholder: 'Type or paste text', 'aria-label': 'Text to hash' });
      const run = () => { const b = new TextEncoder().encode(t.value); draw(ALGOS.map(([n, f]) => [n, bytesToHex(f(b))]), 'Text of ' + bytes(b.length) + ' (UTF-8).'); };
      t.addEventListener('input', run); area.replaceChildren(panel(field('Text', t))); run();
    } else {
      const prog = h('p', { class: 'hint', 'aria-live': 'polite' });
      area.replaceChildren(dropzone({ label: 'Choose a file', hint: 'Any file. It is read in your browser in parts, so large files work too.', onFiles: async ([f]) => {
        const hs = ALGOS.map(([n, fn]) => [n, fn.create()]); const step = 8 << 20;
        for (let o = 0; o < f.size; o += step) { const part = new Uint8Array(await f.slice(o, o + step).arrayBuffer()); hs.forEach(([, x]) => x.update(part)); prog.textContent = 'Reading… ' + Math.min(100, Math.round((o + step) / f.size * 100)) + '%'; }
        prog.textContent = ''; draw(hs.map(([n, x]) => [n, bytesToHex(x.digest())]), f.name + ' (' + bytes(f.size) + ').');
      } }), prog);
    }
  }
  root.append(h('div', { class: 'field' }, tab.el), area, panel(field('Compare with', expect), out)); show();
}
