// Protect or Unlock PDF: a password with AES-256 and limits on printing and copying, or remove a password you know (qpdf).
import createQpdf from '@neslinesli93/qpdf-wasm';
import { h, field, input, seg, check, button, dropzone, panel, busy, note, toast } from '../ui.js';
import { results } from '../lib/image.js';
import { pdfBlob, pdfName } from '../lib/pdf.js';

/** Runs qpdf once on a PDF. Returns the new file, or throws a sentence. */
export async function qpdf(file, args) {
  const said = [], ce = console.error, cw = console.warn;   // qpdf keeps the console.error it finds when it starts, and writes its messages there
  console.error = console.warn = (...m) => said.push(m.join(' '));
  let q;
  try { q = await createQpdf({ locateFile: () => new URL('./qpdf.wasm', import.meta.url).href, noInitialRun: true, print: () => {}, printErr: (t) => said.push(t) }); }
  finally { console.error = ce; console.warn = cw; }
  q.FS.writeFile('/in.pdf', new Uint8Array(await file.arrayBuffer()));
  let code; try { code = q.callMain([...args, '/in.pdf', '/out.pdf']); } catch (e) { code = typeof e === 'number' ? e : e && e.status != null ? e.status : 2; }
  if (code !== 0 && code !== 3) throw new Error(/invalid password/i.test(said.join(' ')) ? 'That password is not right.' : /not a PDF|can't find PDF header/i.test(said.join(' ')) ? file.name + ' is not a PDF.' : 'qpdf could not change this file: ' + (said.pop() || 'unknown error'));
  return q.FS.readFile('/out.pdf');
}
const randomPw = () => Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(36).padStart(2, '0')).join('');
export default function (root) {
  let file = null;
  const area = h('div'), out = h('div'), info = h('p', { class: 'hint' });
  const mode = seg('', [['lock', 'Add a Password'], ['unlock', 'Remove a Password']], 'lock', () => show());
  function show() {
    out.replaceChildren();
    if (mode.value === 'lock') {
      const p1 = input({ type: 'password', autocomplete: 'new-password' }), p2 = input({ type: 'password', autocomplete: 'new-password' });
      const pr = check('Allow printing', true), cp = check('Allow copying text', true), ed = check('Allow changes', false);
      const go = button('Protect', { primary: true, icon: 'lock' });
      go.addEventListener('click', () => busy(go, async () => {
        if (!file) { toast('Choose a PDF first.', true); return; }
        if (p1.value.length < 4) { toast('Use a password of at least 4 characters.', true); return; }
        if (p1.value !== p2.value) { toast('The two passwords are not the same.', true); return; }
        const b = await qpdf(file, ['--encrypt', p1.value, randomPw(), '256', '--print=' + (pr.value ? 'full' : 'none'), '--extract=' + (cp.value ? 'y' : 'n'), '--modify=' + (ed.value ? 'all' : 'none'), '--']);
        results(out, [{ name: pdfName(file.name, 'protected'), blob: pdfBlob(b) }]);
        out.prepend(note('Protected with AES-256. Keep the password safe: nobody can open the file without it.'));
      }));
      area.replaceChildren(panel(field('Password', p1), field('Type it again', p2), pr.el, cp.el, ed.el, go, note('The limits on printing and copying are respected by most PDF readers, but not all.')));
    } else {
      const pw = input({ type: 'password', autocomplete: 'current-password' }), go = button('Remove the Password', { primary: true, icon: 'lock' });
      go.addEventListener('click', () => busy(go, async () => {
        if (!file) { toast('Choose a PDF first.', true); return; }
        const b = await qpdf(file, ['--password=' + pw.value, '--decrypt']);
        results(out, [{ name: pdfName(file.name, 'unlocked'), blob: pdfBlob(b) }]);
      }));
      area.replaceChildren(panel(field('The PDF’s password', pw), go, note('This only works with the password you already know. It does not guess passwords.')));
    }
  }
  root.append(h('div', { class: 'field' }, mode.el), dropzone({ accept: '.pdf,application/pdf', label: 'Choose a PDF', onFiles: ([f]) => { file = f; info.textContent = f.name + ' chosen.'; out.replaceChildren(); } }), info, area, out);
  show();
}
