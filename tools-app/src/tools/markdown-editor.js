// Markdown Editor: write on the left, see it on the right; save as .md or .html, or print it as a PDF.
// The preview is built from elements (never from markup), links work only for http, https and mailto, and pictures are shown as
// links: the page never loads anything from another website by itself. The draft stays in this browser.
import { h, panel, textarea, button, toast, download } from '../ui.js';

const KEY = 'tools.markdown.v1';
const SAMPLE = '# My Notes\n\nWrite **bold**, *italic*, ~~struck~~ and `code`.\n\n## A List\n\n- Milk\n- Bread\n  - Brown\n- [x] Pay rent\n- [ ] Call the bank\n\n1. First\n2. Second\n\n> A quote.\n\n| Item | Price |\n|---|---:|\n| Tea | 40 |\n| Cake | 120 |\n\n[A link](https://example.com)\n\n```\nsome code\n```\n';
const safeUrl = (u) => /^(https?:|mailto:)/i.test(u) ? u : /^#[\w-]*$/.test(u) ? u : null;

const INLINE = /(`+)([\s\S]*?[^`])\1(?!`)|!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|<((?:https?:\/\/|mailto:)[^>\s]+)>|\*\*(?=\S)([\s\S]*?\S)\*\*|__(?=\S)([\s\S]*?\S)__|~~(?=\S)([\s\S]*?\S)~~|\*(?=[^\s*])([\s\S]*?[^\s*])\*|(?<![\w])_(?=[^\s_])([\s\S]*?[^\s_])_(?![\w])|\\([\\`*_{}[\]()#+\-.!>~|])|(https?:\/\/[^\s<]*[^\s<.,;:!?)\]'"])|(?: {2,}|\\)\n/g;
function link(url, kids) { const u = safeUrl(url); return u ? h('a', { href: u, rel: 'noopener noreferrer', target: u.startsWith('#') ? null : '_blank' }, kids) : h('span', {}, kids); }
/** Inline text (bold, italic, code, links...) as nodes. */
export function inline(s) {
  const out = [], re = new RegExp(INLINE.source, 'g'); let last = 0, m;   // its own copy: inline() calls itself, and a shared one would lose its place
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    if (m[1]) out.push(h('code', { text: m[2].replace(/^ (.*) $/, '$1') }));
    else if (m[4] !== undefined) out.push(link(m[4], ['🖼 ' + (m[3] || 'picture')]));
    else if (m[6] !== undefined) out.push(link(m[6], inline(m[5])));
    else if (m[7]) out.push(link(m[7], [m[7].replace(/^mailto:/i, '')]));
    else if (m[8] !== undefined || m[9] !== undefined) out.push(h('strong', {}, inline(m[8] ?? m[9])));
    else if (m[10] !== undefined) out.push(h('del', {}, inline(m[10])));
    else if (m[11] !== undefined || m[12] !== undefined) out.push(h('em', {}, inline(m[11] ?? m[12])));
    else if (m[13]) out.push(m[13]);
    else if (m[14]) out.push(link(m[14], [m[14]]));
    else out.push(h('br'));
    last = re.lastIndex;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

const LI = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/, HR = /^ {0,3}([-*_])(\s*\1){2,}\s*$/, SEP = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
const cells = (l) => l.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
const starts = (l, next) => /^\s*(#{1,6}\s|```|~~~|>)/.test(l) || HR.test(l) || LI.test(l) || (l.includes('|') && next !== undefined && SEP.test(next) && next.includes('-'));
/** Markdown text as a list of block elements. */
export function blocks(src) {
  const L = src.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n'), out = [];
  for (let i = 0; i < L.length;) {
    const l = L[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = /^\s*(```|~~~)\s*([\w+-]*)/.exec(l))) {
      const body = []; i++; while (i < L.length && !L[i].trim().startsWith(m[1])) body.push(L[i++]); i++;
      out.push(h('pre', {}, h('code', { class: m[2] ? 'lang-' + m[2] : null, text: body.join('\n') }))); continue;
    }
    if ((m = /^\s*(#{1,6})\s+(.*?)\s*#*\s*$/.exec(l))) { out.push(h('h' + m[1].length, {}, inline(m[2]))); i++; continue; }
    if (HR.test(l)) { out.push(h('hr')); i++; continue; }
    if (/^\s*>/.test(l)) { const q = []; while (i < L.length && L[i].trim() && /^\s*>/.test(L[i])) q.push(L[i++].replace(/^\s*> ?/, '')); out.push(h('blockquote', {}, blocks(q.join('\n')))); continue; }
    if (l.includes('|') && i + 1 < L.length && SEP.test(L[i + 1]) && L[i + 1].includes('-')) {
      const head = cells(l), al = cells(L[i + 1]).map((c) => c.endsWith(':') ? (c.startsWith(':') ? 'center' : 'right') : null); i += 2;
      const rows = []; while (i < L.length && L[i].includes('|') && L[i].trim()) rows.push(cells(L[i++]));
      out.push(h('table', {}, h('thead', {}, h('tr', {}, head.map((c, k) => h('th', { style: al[k] ? 'text-align:' + al[k] : null }, inline(c))))),
        h('tbody', {}, rows.map((r) => h('tr', {}, head.map((_, k) => h('td', { style: al[k] ? 'text-align:' + al[k] : null }, inline(r[k] || '')))))))); continue;
    }
    if ((m = LI.exec(l))) {
      const base = m[1].length, ordered = /\d/.test(m[2]), items = [];
      while (i < L.length) {
        const x = LI.exec(L[i]);
        if (x && x[1].length <= base + 1) { if (/\d/.test(x[2]) !== ordered) break; items.push([x[3]]); i++; continue; }
        if (!L[i].trim()) { if (i + 1 < L.length && (LI.test(L[i + 1]) || /^\s{2,}\S/.test(L[i + 1]))) { items[items.length - 1].push(''); i++; continue; } break; }
        if (/^\s/.test(L[i]) || !starts(L[i], L[i + 1])) { items[items.length - 1].push(L[i].replace(new RegExp('^\\s{0,' + (base + 4) + '}'), '')); i++; continue; }
        break;
      }
      const list = h(ordered ? 'ol' : 'ul', { start: ordered && parseInt(m[2], 10) !== 1 ? parseInt(m[2], 10) : null });
      for (const it of items) {
        let first = it[0], box = null; const t = /^\[([ xX])\]\s+(.*)$/.exec(first);
        if (t) { first = t[2]; box = h('input', { type: 'checkbox', disabled: true, checked: t[1] !== ' ', 'aria-label': t[1] !== ' ' ? 'Done' : 'Not done' }); }
        const rest = it.slice(1), simple = rest.every((x) => !x.trim() || !starts(x.trim(), undefined)) && !rest.some((x) => !x.trim());
        const li = h('li', { class: box ? 'task' : null }, box, box ? ' ' : null);
        if (simple) li.append(...inline([first, ...rest].join('\n'))); else li.append(...blocks([first, ...rest].join('\n')));
        list.append(li);
      }
      out.push(list); continue;
    }
    const para = []; while (i < L.length && L[i].trim() && !(para.length && starts(L[i], L[i + 1]))) para.push(L[i++].replace(/^\s+/, ''));
    out.push(h('p', {}, inline(para.join('\n'))));
  }
  return out;
}

export default function (root) {
  let draft = ''; try { draft = localStorage.getItem(KEY) ?? SAMPLE; } catch (e) { draft = SAMPLE; }
  const ed = textarea({ value: draft, 'aria-label': 'Markdown text', placeholder: 'Write Markdown here' }), view = h('article', { class: 'md', 'aria-label': 'Preview' });
  let t = 0;
  const draw = () => { view.replaceChildren(...blocks(ed.value)); try { localStorage.setItem(KEY, ed.value); } catch (e) { /* private mode */ } };
  ed.addEventListener('input', () => { clearTimeout(t); t = setTimeout(draw, 120); });
  const wrap = (a, b = a, ph = 'text') => () => { const s = ed.selectionStart, e = ed.selectionEnd, sel = ed.value.slice(s, e) || ph; ed.setRangeText(a + sel + b, s, e, 'select'); ed.setSelectionRange(s + a.length, s + a.length + sel.length); ed.focus(); draw(); };
  const line = (p) => () => { const s = ed.value.lastIndexOf('\n', ed.selectionStart - 1) + 1; ed.setRangeText(p, s, s, 'end'); ed.focus(); draw(); };
  const title = () => ((/^#\s+(.+)$/m.exec(ed.value) || [])[1] || 'document').trim();
  const fname = (ext) => title().replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase().slice(0, 60) + '.' + ext || 'document.' + ext;
  const htmlDoc = () => '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + title().replace(/[<&>"]/g, (c) => ({ '<': '&lt;', '&': '&amp;', '>': '&gt;', '"': '&quot;' })[c]) + '</title>\n<style>body{font:16px/1.6 system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 20px;color:#1a1917}code{font:.9em ui-monospace,monospace;background:#f3f1ec;padding:1px 5px;border-radius:5px}pre{background:#f3f1ec;padding:12px;border-radius:8px;overflow:auto}pre code{padding:0}blockquote{margin:0;padding:2px 14px;border-left:3px solid #ccc;color:#555}table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 10px}li.task{list-style:none}</style></head><body>\n' + view.innerHTML + '\n</body></html>\n';
  const file = h('input', { type: 'file', accept: '.md,.markdown,.txt,text/markdown,text/plain', class: 'sr', 'aria-label': 'Open a Markdown file', onChange: async () => { const f = file.files[0]; if (f) { ed.value = await f.text(); draw(); toast('Opened ' + f.name); } file.value = ''; } });
  const tb = h('div', { class: 'row noprint' },
    button('Bold', { small: true, onClick: wrap('**') }), button('Italic', { small: true, onClick: wrap('*') }), button('Heading', { small: true, onClick: line('## ') }),
    button('List', { small: true, onClick: line('- ') }), button('Link', { small: true, onClick: wrap('[', '](https://)', 'link text') }), button('Code', { small: true, onClick: wrap('`') }), button('Quote', { small: true, onClick: line('> ') }));
  const acts = h('div', { class: 'row noprint' }, file,
    button('Open File', { icon: 'upload', onClick: () => file.click() }),
    button('Save .md', { icon: 'download', onClick: () => download(new Blob([ed.value], { type: 'text/markdown' }), fname('md')) }),
    button('Save .html', { icon: 'download', onClick: () => download(new Blob([htmlDoc()], { type: 'text/html' }), fname('html')) }),
    button('Print or PDF', { icon: 'filepdf', primary: true, onClick: () => { document.body.classList.add('md-print'); const off = () => { document.body.classList.remove('md-print'); window.removeEventListener('afterprint', off); }; window.addEventListener('afterprint', off); window.print(); setTimeout(off, 1000); } }),
    button('Clear', { ghost: true, onClick: () => { if (confirm('Clear the text? This cannot be undone.')) { ed.value = ''; draw(); } } }));
  root.append(panel(acts, h('p', { class: 'hint noprint', text: 'Your text is kept in this browser until you clear it. Pictures show as links, so nothing is loaded from other websites.' })),
    h('div', { class: 'mdgrid' }, panel(tb, ed), panel(view)));
  draw();
  return () => clearTimeout(t);
}
