/*! Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be
 * useful, but WITHOUT ANY WARRANTY; see <https://www.gnu.org/licenses/> for details.
 */
/* Links > Import Bookmarks. Loaded by links.js the first time the menu item is used.
   Reads a browser's bookmark export (the "Netscape bookmark file" every browser writes: Chrome, Edge, Firefox, Brave,
   Opera, Safari) in this browser with DOMParser. Nothing is uploaded except the normal Links save. Text from the file is
   only ever placed with textContent or as a form value, never as markup. */
(function () {
  'use strict';
  const MAX_BYTES = 5 * 1048576, MAX_LINKS = 5000, MAX_SAVE = 2900000;   // the server takes saves up to 3 MB
  const MAX_TITLE = 200, MAX_CAT = 80;
  const OK_SCHEMES = ['http:', 'https:', 'ftp:'];
  const CONTAINERS = /^(bookmarks bar|bookmarks toolbar|other bookmarks|mobile bookmarks|favorites|favourites|favorites bar|bookmarks menu|bookmarks|reading list|imported|speed dial)$/i;

  const clean = (s, max) => String(s || '').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff\ufffd]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

  /** A URL for comparing: host in small letters, no #part, no slash at the end. '' when it is not a web address. */
  function urlKey(u) {
    try {
      const x = new URL(u);
      if (!OK_SCHEMES.includes(x.protocol)) return '';
      let path = x.pathname.replace(/\/+$/, '');
      return x.protocol + '//' + x.host.toLowerCase() + path + x.search;
    } catch (e) { return ''; }
  }

  /** "A / B / C", or for a long path its end: "… / Level 11 / Level 12" (so deep folders stay apart). */
  function pathName(parts) {
    const all = parts.join(' / ');
    if (all.length <= MAX_CAT) return all;
    let tail = parts[parts.length - 1].slice(0, MAX_CAT - 4);
    for (let i = parts.length - 2; i >= 0 && ('… / ' + parts[i] + ' / ' + tail).length <= MAX_CAT; i--) tail = parts[i] + ' / ' + tail;
    return '… / ' + tail;
  }

  /** The whole file as folders and links. Throws an Error with a sentence for the person. */
  function parse(text, importName) {
    if (typeof text !== 'string' || !text.trim()) throw new Error('That file is empty.');
    const head = text.slice(0, 4096), ctl = (head.match(/[\u0000-\u0008\u000e-\u001a]/g) || []).length;
    if (ctl > 8 || !/<dt[\s>]/i.test(text) || !/<a[\s>]/i.test(text) && !/<h3[\s>]/i.test(text))
      throw new Error('That file is not a bookmarks export. In your browser, open the bookmarks manager and choose Export Bookmarks (an .html file).');
    const doc = new DOMParser().parseFromString(text, 'text/html');   // a parsed document never runs scripts or loads images
    // the top list: where the first entry sits (inside the outer <DL> in most exports; straight in the page in some Safari ones)
    const first = doc.querySelector('dt');
    let root = first && first.parentElement;
    while (root && (root.tagName === 'P' || root.tagName === 'DIV')) root = root.parentElement;
    if (!root) throw new Error('That file is not a bookmarks export.');
    const out = { cats: new Map(), skipped: { scheme: 0, dupFile: 0 }, links: 0, folders: 0, mapping: [] };
    const seen = new Set();
    const cat = (name, from) => {
      name = clean(name, MAX_CAT) || importName;
      if (!out.cats.has(name)) { out.cats.set(name, []); out.mapping.push([from, name]); }
      return out.cats.get(name);
    };
    function addLink(a, into) {
      const href = String(a.getAttribute('href') || '').trim();
      let url;
      try { url = new URL(href); } catch (e) { out.skipped.scheme++; return; }
      if (!OK_SCHEMES.includes(url.protocol) || !url.hostname) { out.skipped.scheme++; return; }
      const key = urlKey(url.href);
      if (seen.has(key)) { out.skipped.dupFile++; return; }
      seen.add(key);
      out.links++;
      into.push({ title: clean(a.textContent, MAX_TITLE) || url.hostname, url: url.href, key });
    }
    // The items of one list: <dt> entries, also when a stray <p> or <div> wraps them (old exports leave <p> unclosed).
    function items(dl) {
      const res = [];
      for (const e of dl.children) {
        const tag = e.tagName;
        if (tag === 'DT') res.push(e);
        else if (tag === 'P' || tag === 'DIV') res.push(...items(e));
      }
      return res;
    }
    function sublist(dt) {
      const inside = [...dt.children].find(e => e.tagName === 'DL');
      if (inside) return inside;
      // Firefox writes a folder's description (<DD>) before its list; the parser then puts the list inside the <DD>
      for (let n = dt.nextElementSibling; n; n = n.nextElementSibling) {
        if (n.tagName === 'DL') return n;
        if (n.tagName !== 'DD') return null;
        const d = [...n.children].find(e => e.tagName === 'DL');
        if (d) return d;
      }
      const inDd = [...dt.children].find(e => e.tagName === 'DD');
      return inDd ? [...inDd.children].find(e => e.tagName === 'DL') || null : null;
    }
    // depth 0: the top of the file. Top folders are containers (their own links get a category named after them);
    // their folders become categories; deeper folders become "Folder / Subfolder".
    function walk(dl, path, depth) {
      for (const dt of items(dl)) {
        const h = [...dt.children].find(e => e.tagName === 'H3' || e.tagName === 'A');
        if (!h) continue;
        if (h.tagName === 'A') {
          // the category: the folder path without the browser's own container at the top ("Bookmarks bar" and the like)
          const named = path.filter((p, i) => !(i === 0 && CONTAINERS.test(p)));
          const name = depth === 0 ? importName : named.length ? pathName(named) : path[0];
          addLink(h, cat(name, depth === 0 ? '(Top of the File)' : path.join(' / ')));
          continue;
        }
        const sub = sublist(dt); if (!sub) continue;
        out.folders++;
        if (depth > 40) continue;   // a file nested this deep is not a real export
        walk(sub, path.concat(clean(h.textContent, MAX_CAT) || 'Folder'), depth + 1);
      }
    }
    walk(root, [], 0);
    // folders without links of their own make no category
    for (const [k, v] of [...out.cats]) if (!v.length) out.cats.delete(k);
    out.mapping = out.mapping.filter(([, name]) => out.cats.has(name));
    if (!out.links && !out.skipped.scheme && !out.skipped.dupFile) throw new Error('No bookmarks were found in that file.');
    if (out.links > MAX_LINKS) throw new Error('That file has ' + out.links + ' links. Import up to ' + MAX_LINKS + ' at a time: export one folder at a time from your browser.');
    return out;
  }

  /* ---------- the dialog ---------- */
  const el = (tag, props, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k in e && typeof v !== 'string') e[k] = v; else e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids) if (c != null) e.append(c);
    return e;
  };
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : (many || one + 's'));
  const today = () => new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  let dlg = null;
  function build() {
    dlg = el('dialog', { id: 'impDlg', 'aria-labelledby': 'impH' });
    const form = el('form', { method: 'dialog' });
    form.append(
      el('h3', { id: 'impH', text: 'Import Bookmarks' }),
      el('p', { class: 'hint', style: 'font-size:13.5px;color:var(--muted);margin:-6px 0 14px', text: 'In your browser, open the bookmarks manager and choose Export Bookmarks. Chrome, Edge, Firefox, Brave, Opera and Safari all make an .html file this can read. The file stays in this browser; only the links are saved.' }),
      el('div', { class: 'field' }, el('label', { for: 'impFile', text: 'Bookmarks File' }), el('input', { id: 'impFile', type: 'file', accept: '.html,.htm,text/html' })),
      el('div', { id: 'impPrev', class: 'imp-prev', role: 'status', 'aria-live': 'polite' }),
      el('fieldset', { id: 'impWhere', class: 'imp-where', hidden: true },
        el('legend', { text: 'Where They Go' }),
        el('label', { class: 'check' }, el('input', { type: 'radio', name: 'impTo', value: 'new', id: 'impToNew', checked: true }), el('span', { text: 'A New Tab' })),
        el('div', { class: 'field imp-sub' }, el('label', { for: 'impName', text: 'Tab Name' }), el('input', { id: 'impName', maxlength: '40' })),
        el('label', { class: 'check imp-sub' }, el('input', { type: 'checkbox', id: 'impPrivate' }), el('span', { text: 'Make the New Tab Private' }, el('small', { text: 'Only visible when you are logged in.' }))),
        el('label', { class: 'check' }, el('input', { type: 'radio', name: 'impTo', value: 'tab', id: 'impToTab' }), el('span', { text: 'An Existing Tab' })),
        el('div', { class: 'field imp-sub' }, el('label', { for: 'impTab', text: 'Tab' }), el('select', { id: 'impTab' })),
        el('p', { id: 'impTabNote', class: 'hint', style: 'font-size:12.5px;color:var(--faint);margin:4px 0 0' })),
      el('p', { class: 'err', id: 'impErr', role: 'alert' }),
      el('div', { id: 'impDone', class: 'imp-done', role: 'status', 'aria-live': 'polite', hidden: true }),
      el('div', { class: 'actions' },
        el('button', { class: 'btn primary', id: 'impGo', type: 'button', disabled: true, text: 'Import' }),
        el('button', { class: 'btn', value: 'cancel', formnovalidate: true, id: 'impClose', text: 'Cancel' })));
    dlg.append(form);
    document.body.append(dlg);
  }

  function open(BM) {
    if (!dlg) build();
    const $ = s => dlg.querySelector(s);
    let plan = null;
    const plain = () => BM.tabs().filter(t => !t.encrypted && !t.enc);
    $('#impFile').value = ''; $('#impPrev').textContent = ''; $('#impErr').textContent = '';
    $('#impWhere').hidden = true; $('#impDone').hidden = true; $('#impDone').textContent = '';
    $('#impGo').disabled = true; $('#impGo').hidden = false; $('#impClose').textContent = 'Cancel';
    $('#impName').value = 'Imported ' + today(); $('#impPrivate').checked = false;
    const sel = $('#impTab'); sel.textContent = '';
    for (const t of plain()) sel.append(el('option', { value: t.id, text: t.title || 'Untitled' }));
    const full = BM.tabs().length >= BM.maxTabs, none = !plain().length;
    $('#impToNew').disabled = full; $('#impToTab').disabled = none;
    $('#impToNew').checked = !full; $('#impToTab').checked = full && !none;
    $('#impTabNote').textContent = full ? 'Links already has ' + BM.maxTabs + ' tabs, the most it holds, so the links go into an existing tab.' : (BM.tabs().length > plain().length ? 'Encrypted tabs are not listed: an import never writes into them.' : '');
    const where = () => $('#impToNew').checked ? 'new' : 'tab';
    const sync = () => { const n = where() === 'new'; $('#impName').disabled = !n; $('#impPrivate').disabled = !n; sel.disabled = n; preview(); };
    $('#impToNew').onchange = $('#impToTab').onchange = sel.onchange = sync;

    function existingKeys(tab) {
      const s = new Set();
      for (const c of (tab ? tab.categories : [])) for (const l of c.links || []) if (l && l.url) s.add(urlKey(l.url));
      return s;
    }
    function allKeys() { const s = new Set(); for (const t of plain()) for (const k of existingKeys(t)) s.add(k); return s; }

    function preview() {
      const box = $('#impPrev'); box.textContent = '';
      if (!plan) return;
      const p = plan.parsed, inLinks = allKeys();
      const already = [...p.cats.values()].flat().filter(l => inLinks.has(l.key)).length;
      box.append(el('p', { style: 'margin:0', text: 'Found ' + plural(p.links, 'link') + ' in ' + plural(p.cats.size, 'category', 'categories') + ' (from ' + plural(p.folders, 'folder') + '). ' + (already ? plural(already, 'link is', 'links are') + ' already in Links.' : 'None of them are in Links yet.') }));
      const skip = [];
      if (p.skipped.scheme) skip.push(plural(p.skipped.scheme, 'address that is not a web link', 'addresses that are not web links') + ' (javascript:, file:, browser pages and the like)');
      if (p.skipped.dupFile) skip.push(plural(p.skipped.dupFile, 'link listed twice', 'links listed twice') + ' in the file');
      if (skip.length) box.append(el('p', { style: 'margin:6px 0 0', text: 'Skipped: ' + skip.join('; ') + '.' }));
      const ul = el('ul', { 'aria-label': 'Folders and the categories they become' });
      for (const [from, to] of p.mapping) ul.append(el('li', { text: from === to ? to : from + ' → ' + to }));
      box.append(ul);
      $('#impWhere').hidden = false;
      $('#impGo').disabled = !p.links || (where() === 'tab' && !sel.value);
    }

    $('#impFile').onchange = async () => {
      plan = null; $('#impErr').textContent = ''; $('#impPrev').textContent = ''; $('#impWhere').hidden = true; $('#impGo').disabled = true; $('#impDone').hidden = true;
      const f = $('#impFile').files[0]; if (!f) return;
      if (f.size > MAX_BYTES) { $('#impErr').textContent = 'That file is larger than 5 MB. Export one folder at a time from your browser.'; return; }
      try {
        const text = await f.text();
        plan = { parsed: parse(text, clean('Imported ' + today(), MAX_CAT)) };
        preview();
      } catch (e) { $('#impErr').textContent = e && e.message ? e.message : 'That file could not be read.'; }
    };

    $('#impGo').onclick = async e => {
      e.preventDefault(); if (!plan) return;
      const toNew = where() === 'new';
      const name = clean($('#impName').value, 40) || 'Imported ' + today();
      let tab = toNew ? null : plain().find(t => t.id === sel.value);
      if (!toNew && !tab) { $('#impErr').textContent = 'Pick a tab.'; return; }
      if (toNew && BM.tabs().length >= BM.maxTabs) { $('#impErr').textContent = 'Links already has ' + BM.maxTabs + ' tabs. Pick an existing tab.'; return; }
      const have = existingKeys(tab);
      let added = 0, there = 0, cut = 0;
      const newCats = [], into = new Map();   // existing categories of the target tab, by name, get the links of the same name
      for (const c of (tab ? tab.categories : [])) into.set((c.title || '').toLowerCase(), c);
      const newTab = toNew ? { id: BM.uid(), title: name, categories: [] } : null;
      if (newTab && $('#impPrivate').checked) newTab.private = true;
      const target = newTab || tab;
      // the save must stay under the server's limit: links are added in order until it would not
      let budget = MAX_SAVE - await BM.size();
      const extra = [];   // [category, link] pairs, so a failed save can take them out again
      for (const [cname, links] of plan.parsed.cats) {
        let c = into.get(cname.toLowerCase());
        for (const l of links) {
          if (have.has(l.key)) { there++; continue; }
          const link = { title: l.title, url: l.url };
          const cost = JSON.stringify(link).length + 4 + (c ? 0 : cname.length + 60);
          if (cost > budget) { cut++; continue; }
          budget -= cost; have.add(l.key);
          if (!c) { c = { id: BM.uid(), title: cname, links: [], col: 0 }; newCats.push(c); into.set(cname.toLowerCase(), c); }
          extra.push([c, link]); added++;
        }
      }
      if (!added) {
        $('#impErr').textContent = there ? 'Every link in the file is already in ' + (target.title || 'that tab') + '. Nothing was changed.' : 'There is no room left in Links for these links. Nothing was changed.';
        return;
      }
      $('#impGo').disabled = true; $('#impErr').textContent = ''; $('#impPrev').textContent = 'Saving…';
      const apply = () => {
        if (newTab) BM.tabs().push(newTab);
        for (const c of newCats) { c.col = BM.shortestCol(target); target.categories.push(c); }
        for (const [c, link] of extra) c.links.push(link);
      };
      const undo = () => {
        for (const [c, link] of extra) { const i = c.links.indexOf(link); if (i >= 0) c.links.splice(i, 1); }
        for (const c of newCats) { const i = target.categories.indexOf(c); if (i >= 0) target.categories.splice(i, 1); }
        if (newTab) { const i = BM.tabs().indexOf(newTab); if (i >= 0) BM.tabs().splice(i, 1); }
      };
      try { await BM.save(apply, undo); }
      catch (err) {
        $('#impPrev').textContent = ''; $('#impGo').disabled = false;
        $('#impErr').textContent = 'Nothing was imported: ' + (err && err.message ? err.message : 'the save failed.');
        return;
      }
      BM.showTab(target.id);
      const skipped = plan.parsed.skipped.scheme + plan.parsed.skipped.dupFile + cut;
      const done = $('#impDone'); done.textContent = ''; done.hidden = false; $('#impPrev').textContent = ''; $('#impWhere').hidden = true;
      done.append(el('p', { text: plural(added, 'link') + ' added to ' + (target.title || 'the tab') + '. ' + there + ' ' + (there === 1 ? 'was' : 'were') + ' already there. ' + skipped + ' ' + (skipped === 1 ? 'was' : 'were') + ' skipped.' }));
      if (cut) done.append(el('p', { text: cut + ' of the skipped links did not fit: Links saves at most 3 MB. Import the rest into another tab, or remove links you no longer need.' }));
      done.append(el('p', { text: 'Their icons: choose Fetch Icons in the same menu. To undo the import: Settings › Backup & Restore › Earlier Versions (a copy of Links was kept just before).' }));
      $('#impGo').hidden = true; $('#impClose').textContent = 'Close';
      BM.toast(plural(added, 'link') + ' imported');
    };
    sync();
    dlg.showModal();
    $('#impFile').focus();
  }

  window.LinksImport = { open, parse, urlKey };
})();
