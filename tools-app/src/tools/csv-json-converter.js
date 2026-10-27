// CSV, JSON and Excel Converter: open a CSV, TSV, JSON or Excel (.xlsx) file, or paste the text, and save it as any of the others.
import { h, panel, seg, textarea, field, check, button, dropzone, download, copyText, toast, select, baseName } from '../ui.js';
import { sniff, parseCsv, toCsv, fromJson, toJson, readXlsx, writeXlsx } from '../lib/sheet.js';
import { table } from '../lib/calc.js';

export default function (root) {
  let rows = [], name = 'data', sheets = null;
  const paste = textarea({ rows: 8, placeholder: 'Paste CSV, TSV or JSON here', 'aria-label': 'Data to convert', value: 'name,city,amount\nAsha,Pune,1200\nRavi,"Delhi, NCR",850.5\n' });
  const head = check('The first row has the column names', true, () => draw());
  const to = seg('Save As', [['xlsx', 'Excel (.xlsx)'], ['csv', 'CSV'], ['tsv', 'TSV'], ['json', 'JSON']], 'xlsx', () => draw());
  const info = h('p', { class: 'hint', 'aria-live': 'polite' }), prev = h('div'), out = textarea({ rows: 10, readOnly: true, 'aria-label': 'Converted text' }), outF = field('Result', out);
  const sheetSel = select([], ''), sheetF = field('Sheet', sheetSel); sheetF.hidden = true;
  sheetSel.addEventListener('change', () => { rows = sheets[+sheetSel.value].rows; draw(); });
  function take(text) {
    const t = text.trim(); sheets = null; sheetF.hidden = true;
    if (!t) { rows = []; return draw(); }
    try {
      if (/^[[{]/.test(t)) { const r = fromJson(t); rows = r.rows; head.box.checked = r.head; info.dataset.from = 'JSON'; }
      else { const d = sniff(t); rows = parseCsv(text, d); info.dataset.from = d === '\t' ? 'TSV' : 'CSV (separated by ' + ({ ',': 'commas', ';': 'semicolons', '|': 'bars' })[d] + ')'; }
    } catch (e) { rows = []; info.dataset.from = ''; out.value = ''; prev.replaceChildren(h('p', { class: 'note bad', role: 'alert', text: 'This could not be read: ' + e.message })); return; }
    draw();
  }
  paste.addEventListener('input', () => { name = 'data'; take(paste.value); });
  const drop = dropzone({ accept: '.csv,.tsv,.txt,.json,.xlsx', label: 'Choose a file', hint: 'CSV, TSV, JSON or Excel (.xlsx). It stays on this device.', onFiles: async ([f]) => {
    name = baseName(f.name);
    try {
      if (/\.xlsx$/i.test(f.name)) {
        sheets = readXlsx(await f.arrayBuffer()); rows = sheets[0]?.rows || []; info.dataset.from = 'Excel';
        sheetSel.replaceChildren(...sheets.map((s, i) => h('option', { value: String(i), text: s.name }))); sheetF.hidden = sheets.length < 2; draw();
      } else { const t = await f.text(); paste.value = t.length < 200000 ? t : ''; take(t); }
      toast('Opened ' + f.name);
    } catch (e) { toast('This file could not be read: ' + e.message, true); }
  } });
  function result() {
    const r = rows.filter((x) => x.some((c) => c != null && c !== ''));
    if (to.value === 'csv') return toCsv(r, ','); if (to.value === 'tsv') return toCsv(r, '\t'); if (to.value === 'json') return toJson(r, head.value) + '\n'; return null;
  }
  function draw() {
    const n = rows.length, cols = Math.max(0, ...rows.map((r) => r.length));
    info.textContent = n ? (info.dataset.from ? 'Read as ' + info.dataset.from + ': ' : '') + n + ' row' + (n === 1 ? '' : 's') + ', ' + cols + ' column' + (cols === 1 ? '' : 's') + '.' : 'Nothing to convert yet.';
    const show = rows.slice(0, 101), hd = head.value && show.length ? show[0].map((c, i) => String(c ?? '') || 'Column ' + (i + 1)) : Array.from({ length: cols }, (_, i) => 'Column ' + (i + 1));
    const body = (head.value ? show.slice(1) : show.slice(0, 100)).map((r) => hd.map((_, i) => r[i] ?? ''));
    prev.replaceChildren(...(n ? [table(hd, body), n > 101 ? h('p', { class: 'hint', text: 'Showing the first 100 rows.' }) : null] : []));
    const t = n ? result() : ''; outF.hidden = t === null; out.value = t || '';
  }
  const save = button('Download', { icon: 'download', primary: true, onClick: () => {
    if (!rows.length) return toast('Open a file or paste some data first.', true);
    if (to.value === 'xlsx') return download(new Blob([writeXlsx(rows, head.value, name)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), name + '.xlsx');
    download(new Blob([(to.value === 'json' ? '' : '﻿') + result()], { type: to.value === 'json' ? 'application/json' : 'text/' + (to.value === 'tsv' ? 'tab-separated-values' : 'csv') }), name + '.' + to.value);
  } });
  const copy = button('Copy', { icon: 'copy', onClick: () => to.value === 'xlsx' ? toast('Choose CSV, TSV or JSON to copy text.', true) : copyText(out.value) });
  root.append(h('div', { class: 'cols' }, panel(h('h2', { text: 'Your Data' }), drop, field('Or paste it', paste), sheetF, head.el),
    panel(h('h2', { text: 'Convert' }), to.el, h('div', { class: 'row' }, save, copy), outF, info)), panel(h('h2', { text: 'Preview' }), prev));
  take(paste.value);
}
