// Small building blocks every tool uses: elements, buttons, fields, drop zones, downloads, notices.
// Text from a user or a file is only ever set with textContent or as a value, never as markup.
import { icon } from './icons.js';

let uid = 0;
export const nextId = (p = 'f') => p + '-' + (++uid);

/** h('div', {class: 'x', onClick: fn}, child, 'text') */
export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'value') el.value = v;   // a property: the attribute does nothing for <textarea>
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}

export function button(label, opts = {}) {
  const b = h('button', { type: 'button', class: 'btn' + (opts.primary ? ' pri' : '') + (opts.small ? ' sm' : '') + (opts.ghost ? ' ghost' : ''), onClick: opts.onClick, title: opts.title, 'aria-label': opts.aria });
  if (opts.icon) b.append(icon(opts.icon));
  if (label) b.append(h('span', { text: label }));
  return b;
}

/** A labelled field. control may be an element or a function (id) => element. */
export function field(label, control, hint) {
  const id = nextId();
  const el = typeof control === 'function' ? control(id) : control;
  if (!el.id) el.id = id;
  return h('div', { class: 'field' }, h('label', { for: el.id, text: label }), el, hint ? h('p', { class: 'hint', text: hint }) : null);
}

export const input = (props = {}) => h('input', { class: 'inp', type: 'text', ...props });
export const textarea = (props = {}) => h('textarea', { class: 'inp area', spellcheck: false, ...props });
export function select(options, value, props = {}) {
  const s = h('select', { class: 'inp', ...props });
  for (const o of options) { const [v, l] = Array.isArray(o) ? o : [o, o]; s.append(h('option', { value: String(v), text: String(l), selected: String(v) === String(value) })); }
  return s;
}
export function check(label, checked, onChange) {
  const id = nextId('c');
  const box = h('input', { type: 'checkbox', id, checked: !!checked, onChange: () => onChange && onChange(box.checked) });
  return { el: h('label', { class: 'chk', for: id }, box, h('span', { text: label })), get value() { return box.checked; }, box };
}
/** A slider with its value shown next to it. */
export function range(label, min, max, step, value, fmt = (v) => String(v), onInput) {
  const id = nextId('r'), out = h('output', { for: id, text: fmt(value) });
  const r = h('input', { type: 'range', id, min, max, step, value, onInput: () => { out.textContent = fmt(+r.value); onInput && onInput(+r.value); } });
  return { el: h('div', { class: 'field' }, h('label', { for: id }, label, ' ', out), r), get value() { return +r.value; }, set value(v) { r.value = v; out.textContent = fmt(+v); }, input: r };
}
/** Segmented choice (one of a few). */
export function seg(label, options, value, onChange) {
  const g = h('div', { class: 'seg', role: 'group', 'aria-label': label });
  let cur = value;
  const btns = options.map(([v, l]) => h('button', { type: 'button', 'aria-pressed': String(v === cur), text: l, onClick: () => { cur = v; btns.forEach((b, i) => b.setAttribute('aria-pressed', String(options[i][0] === cur))); onChange && onChange(v); } }));
  g.append(...btns);
  return { el: label ? h('div', { class: 'field' }, h('span', { class: 'lbl', text: label }), g) : g, get value() { return cur; }, set value(v) { const i = options.findIndex((o) => o[0] === v); if (i >= 0 && v !== cur) btns[i].click(); } };
}

/** A place to drop, pick or paste files. onFiles(File[]) */
export function dropzone({ accept = '', multiple = false, label = 'Choose a file', hint = '', onFiles }) {
  const id = nextId('d');
  const inp = h('input', { type: 'file', id, accept, multiple, class: 'sr', onChange: () => { if (inp.files.length) onFiles([...inp.files]); inp.value = ''; } });
  const zone = h('label', { class: 'drop', for: id },
    icon('upload', 'big'), h('b', { text: label }), h('span', { text: hint || (multiple ? 'Drop files here, or click to choose. You can also paste.' : 'Drop a file here, or click to choose. You can also paste.') }));
  const ok = (f) => !accept || accept.split(',').some((a) => { a = a.trim().toLowerCase(); return a.startsWith('.') ? f.name.toLowerCase().endsWith(a) : a.endsWith('/*') ? (f.type || '').startsWith(a.slice(0, -1)) : f.type === a; });
  const take = (list) => { let files = [...list].filter(ok); if (!multiple) files = files.slice(0, 1); if (files.length) onFiles(files); else toast('That file type does not fit this tool.', true); };
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('over'));
  zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('over'); if (e.dataTransfer.files.length) take(e.dataTransfer.files); });
  const paste = (e) => { if (!document.body.contains(zone)) return document.removeEventListener('paste', paste); const fs = [...(e.clipboardData?.files || [])]; if (fs.length) take(fs); };
  document.addEventListener('paste', paste);
  return h('div', { class: 'dropwrap' }, inp, zone);
}

/** Saves a Blob as a file (in place, no new tab). */
export function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name, class: 'sr' });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

let toastBox = null;
export function toast(msg, bad = false) {
  if (!toastBox) { toastBox = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' }); document.body.append(toastBox); }
  const t = h('div', { class: 'toast' + (bad ? ' bad' : ''), text: msg });
  toastBox.append(t); setTimeout(() => t.remove(), 4200);
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Copied'); }
  catch (e) { toast('Copying is not allowed here. Select the text and copy it yourself.', true); }
}

export function bytes(n) {
  if (n < 1024) return n + ' B';
  const u = ['KB', 'MB', 'GB']; let i = -1;
  do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1);
  return (n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2)) + ' ' + u[i];
}

export const panel = (...kids) => h('section', { class: 'panel' }, ...kids);
export const row = (...kids) => h('div', { class: 'row' }, ...kids);
export const note = (text, bad) => h('p', { class: 'note' + (bad ? ' bad' : ''), role: bad ? 'alert' : null, text });

/** Runs an async job with the button showing it is busy; errors become a notice. */
export async function busy(btn, job) {
  btn.disabled = true; btn.classList.add('busy');
  try { return await job(); }
  catch (e) { console.error(e); toast(e && e.message ? e.message : 'Something went wrong.', true); }
  finally { btn.disabled = false; btn.classList.remove('busy'); }
}

export function baseName(name) { return name.replace(/\.[^.]+$/, '') || 'file'; }
