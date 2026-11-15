// Tables in and out (1.60): CSV and TSV (RFC 4180, with quotes), JSON, and Excel .xlsx (read and write, with fflate).
// A table is a list of rows; a row is a list of cells (strings, numbers, true/false or null).
import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';

/** Which separator a CSV-like text uses: the one that appears most, the same number of times, in the first lines. */
export function sniff(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 10);
  let best = ',', score = -1;
  for (const d of [',', '\t', ';', '|']) {
    const counts = lines.map((l) => l.split(d).length - 1), s = counts[0] > 0 && counts.every((c) => c === counts[0]) ? counts[0] * 10 : Math.min(...counts);
    if (s > score) { score = s; best = d; }
  }
  return best;
}
export function parseCsv(text, d = sniff(text)) {
  const rows = []; let row = [], cell = '', q = false, i = 0, quoted = false;
  text = text.replace(/^﻿/, '');
  const end = () => { row.push(quoted ? cell : cell); cell = ''; quoted = false; };
  for (; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
    if (c === '"' && cell === '') { q = true; quoted = true; } else if (c === d) end();
    else if (c === '\n' || c === '\r') { end(); rows.push(row); row = []; if (c === '\r' && text[i + 1] === '\n') i++; }
    else cell += c;
  }
  if (cell !== '' || row.length) { end(); rows.push(row); }
  return rows;
}
const q = (v, d) => { const s = v == null ? '' : String(v); return s.includes(d) || /["\r\n]/.test(s) || /^\s|\s$/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
export const toCsv = (rows, d = ',') => rows.map((r) => r.map((v) => q(v, d)).join(d)).join('\r\n') + '\r\n';

/** JSON text as a table: a list of objects (the keys become the first row), a list of lists, or one object. */
export function fromJson(text) {
  let v = JSON.parse(text);
  if (v && !Array.isArray(v) && typeof v === 'object') { const arr = Object.values(v).find(Array.isArray); v = arr || [v]; }
  if (!Array.isArray(v)) throw new Error('This JSON is not a list of rows.');
  const cell = (x) => x == null ? null : typeof x === 'object' ? JSON.stringify(x) : x;
  if (v.every(Array.isArray)) return { rows: v.map((r) => r.map(cell)), head: false };
  const keys = []; for (const o of v) if (o && typeof o === 'object') for (const k of Object.keys(o)) if (!keys.includes(k)) keys.push(k);
  if (!keys.length) return { rows: v.map((x) => [cell(x)]), head: false };
  return { rows: [keys, ...v.map((o) => keys.map((k) => cell(o && typeof o === 'object' ? o[k] : null)))], head: true };
}
/** A table as JSON: objects named by the first row when head, else lists. Number-like text stays text unless typed is set. */
export function toJson(rows, head, typed = true) {
  const val = (x) => { if (!typed || typeof x !== 'string') return x === undefined ? null : x; const t = x.trim(); if (t === '') return null; if (/^-?(0|[1-9]\d{0,14})(\.\d+)?$/.test(t)) return +t; if (t === 'true' || t === 'false') return t === 'true'; return x; };
  if (!head) return JSON.stringify(rows.map((r) => r.map(val)), null, 2);
  const keys = rows[0].map((k, i) => String(k ?? '').trim() || 'column' + (i + 1));
  return JSON.stringify(rows.slice(1).map((r) => Object.fromEntries(keys.map((k, i) => [k, val(r[i] ?? null)]))), null, 2);
}

// ---------- Excel ----------
const X = (s) => new DOMParser().parseFromString(s, 'application/xml');
const kids = (el, name) => [...el.getElementsByTagName(name)];
const colNum = (ref) => { let n = 0; for (const c of ref.replace(/\d+$/, '')) n = n * 26 + c.charCodeAt(0) - 64; return n - 1; };
const DATE_IDS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);
/** The sheets of an .xlsx file: [{ name, rows }]. */
export function readXlsx(buf) {
  const z = unzipSync(new Uint8Array(buf)), get = (p) => z[p] ? strFromU8(z[p]) : null;
  if (!get('xl/workbook.xml')) throw new Error('This is not an Excel (.xlsx) file.');
  const ss = get('xl/sharedStrings.xml') ? kids(X(get('xl/sharedStrings.xml')), 'si').map((si) => kids(si, 't').filter((t) => t.parentNode.nodeName !== 'rPh').map((t) => t.textContent).join('')) : [];
  const dateStyle = [];
  if (get('xl/styles.xml')) {
    const st = X(get('xl/styles.xml')), fmts = {};
    for (const f of kids(st, 'numFmt')) fmts[f.getAttribute('numFmtId')] = f.getAttribute('formatCode') || '';
    const xfs = st.getElementsByTagName('cellXfs')[0];
    if (xfs) for (const x of kids(xfs, 'xf')) { const id = +x.getAttribute('numFmtId'); dateStyle.push(DATE_IDS.has(id) || (fmts[id] && /[dmyhs]/i.test(fmts[id].replace(/"[^"]*"|\[[^\]]*\]/g, '')))); }
  }
  const rels = {}; if (get('xl/_rels/workbook.xml.rels')) for (const r of kids(X(get('xl/_rels/workbook.xml.rels')), 'Relationship')) rels[r.getAttribute('Id')] = r.getAttribute('Target');
  const toDate = (v) => { const d = new Date(Math.round((v - 25569) * 86400000)), s = d.toISOString(); return v % 1 ? s.slice(0, 19).replace('T', ' ') : s.slice(0, 10); };
  return kids(X(get('xl/workbook.xml')), 'sheet').map((s) => {
    const rid = s.getAttribute('r:id') || s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    let t = rels[rid] || ''; t = t.startsWith('/') ? t.slice(1) : 'xl/' + t.replace(/^\.\//, '');
    const xml = get(t), rows = [];
    if (xml) for (const r of kids(X(xml), 'row')) {
      const ri = (+r.getAttribute('r') || rows.length + 1) - 1, row = rows[ri] = [];
      for (const c of kids(r, 'c')) {
        const ty = c.getAttribute('t'), v = c.getElementsByTagName('v')[0]?.textContent, ref = c.getAttribute('r'), ci = ref ? colNum(ref) : row.length;
        let val = null;
        if (ty === 's') val = ss[+v] ?? ''; else if (ty === 'inlineStr') val = kids(c, 't').map((x) => x.textContent).join(''); else if (ty === 'str') val = v ?? '';
        else if (ty === 'b') val = v === '1'; else if (ty === 'e') val = v ?? ''; else if (v != null) { val = +v; if (dateStyle[+c.getAttribute('s') || 0] && isFinite(val)) val = toDate(val); }
        row[ci] = val;
      }
    }
    for (let i = 0; i < rows.length; i++) rows[i] = Array.from(rows[i] || [], (x) => x ?? null);
    return { name: s.getAttribute('name') || 'Sheet', rows };
  });
}
const esc = (s) => String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]);
const colName = (n) => { let s = ''; for (n++; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s; return s; };
/** A table as an .xlsx file (one sheet; the first row bold when head). Number-like text becomes numbers. */
export function writeXlsx(rows, head = true, name = 'Sheet1') {
  const cell = (v, r, c) => {
    const ref = colName(c) + (r + 1), s = r === 0 && head ? ' s="1"' : '';
    if (v == null || v === '') return '';
    if (typeof v === 'number' && isFinite(v)) return `<c r="${ref}"${s}><v>${v}</v></c>`;
    if (typeof v === 'boolean') return `<c r="${ref}" t="b"${s}><v>${v ? 1 : 0}</v></c>`;
    const t = String(v); if (!(r === 0 && head) && /^-?(0|[1-9]\d{0,14})(\.\d+)?$/.test(t.trim())) return `<c r="${ref}"${s}><v>${+t}</v></c>`;
    return `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${esc(t)}</t></is></c>`;
  };
  const sheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' + (head ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' : '') + '<sheetData>' +
    rows.map((r, i) => `<row r="${i + 1}">` + r.map((v, c) => cell(v, i, c)).join('') + '</row>').join('') + '</sheetData></worksheet>';
  const ct = 'application/vnd.openxmlformats-';
  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="${ct}package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="${ct}officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="${ct}officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="${ct}officedocument.spreadsheetml.styles+xml"/></Types>`,
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(name.slice(0, 31).replace(/[\\/?*[\]:]/g, ' ')) || 'Sheet1'}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
    'xl/worksheets/sheet1.xml': sheet,
  };
  return zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])), { level: 6 });
}
