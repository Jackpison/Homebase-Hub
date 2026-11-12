/*! Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
// @ts-check
/* The Import Center (1.72.0): reads what other apps export, here in the browser, and turns it into what a page of this site keeps.
   Nothing is sent anywhere by reading: Settings > Backup & Restore > Import shows a preview, and the page it goes to adds what you keep
   (through its own save, so locked Cards stay locked), with Undo.
     calendar (.ics)                  -> Tasks: each event a task (a repeating event repeats)
     Todoist (CSV export)             -> Tasks
     Google Keep (Takeout .zip or its .json files)  -> Info: a new tab, the notes in its boxes
     Notion (Markdown & CSV .zip)     -> Info
     notes as .txt, .md or .html (Apple Notes exported by an app, Obsidian, plain text; a .zip of them too) -> Info
     Raindrop (CSV), Pocket (HTML or CSV), browser bookmarks (HTML)  -> Links: a new tab, one category per folder or tag
     a spreadsheet of cards (CSV)     -> Cards (its columns are matched to the card's fields, and can be changed)
   window.HubImport.read(files) -> Promise of { kind, label, to, items } or { error }. Only the browser's own unzip (DecompressionStream). */
(function () {
  'use strict';
  var MAX_FILES = 3000, MAX_BYTES = 80 * 1024 * 1024;

  /* ---------- zip: the central directory, then each file (stored or deflated) ---------- */
  function u16(v, o) { return v[o] | (v[o + 1] << 8); }
  function u32(v, o) { return (v[o] | (v[o + 1] << 8) | (v[o + 2] << 16) | (v[o + 3] << 24)) >>> 0; }
  function unzip(buf) {
    var v = new Uint8Array(buf), end = -1;
    for (var i = v.length - 22; i >= Math.max(0, v.length - 66000); i--) if (u32(v, i) === 0x06054b50) { end = i; break; }
    if (end < 0) return Promise.reject(new Error('This zip file can’t be read.'));
    var n = u16(v, end + 10), at = u32(v, end + 16), list = [], dec = new TextDecoder();
    if (n > MAX_FILES) return Promise.reject(new Error('This zip has too many files (' + n + ').'));
    for (var k = 0; k < n && at + 46 <= v.length; k++) {
      if (u32(v, at) !== 0x02014b50) break;
      var method = u16(v, at + 10), csize = u32(v, at + 20), usize = u32(v, at + 24), nl = u16(v, at + 28), xl = u16(v, at + 30), cl = u16(v, at + 32), lh = u32(v, at + 42);
      var name = dec.decode(v.subarray(at + 46, at + 46 + nl));
      at += 46 + nl + xl + cl;
      if (/\/$/.test(name) || /(^|\/)(__MACOSX|\.)/.test(name)) continue;
      var start = lh + 30 + u16(v, lh + 26) + u16(v, lh + 28);
      list.push({ name: name, method: method, data: v.subarray(start, start + csize), size: usize });
    }
    var total = list.reduce(function (s, f) { return s + f.size; }, 0);
    if (total > MAX_BYTES) return Promise.reject(new Error('This zip is too big to import here (over 80 MB unpacked).'));
    return Promise.all(list.map(function (f) {
      if (f.method === 0) return Promise.resolve({ name: f.name, bytes: f.data });
      if (f.method !== 8 || typeof DecompressionStream === 'undefined') return Promise.resolve(null);
      var s = new Blob([f.data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return new Response(s).arrayBuffer().then(function (b) { return { name: f.name, bytes: new Uint8Array(b) }; }, function () { return null; });
    })).then(function (all) { return all.filter(Boolean); });
  }

  /* ---------- text helpers ---------- */
  function csv(text) {   // RFC 4180: quotes, commas and line breaks inside quotes
    var rows = [], row = [], cell = '', q = false;
    text = String(text).replace(/^﻿/, '');
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
      if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    rows = rows.filter(function (r) { return r.some(function (x) { return x.trim() !== ''; }); });
    var head = (rows.shift() || []).map(function (h) { return h.trim(); });
    return { head: head, rows: rows.map(function (r) { var o = {}; head.forEach(function (h, k) { o[h.toLowerCase()] = (r[k] || '').trim(); }); return o; }) };
  }
  function htmlText(html) {
    var d = new DOMParser().parseFromString(String(html), 'text/html');
    d.querySelectorAll('br').forEach(function (b) { b.replaceWith('\n'); });
    d.querySelectorAll('p,div,li,h1,h2,h3,h4,tr').forEach(function (b) { b.append('\n'); });
    return (d.body ? d.body.textContent : '').replace(/\n{3,}/g, '\n\n').trim();
  }
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var ymd = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var today = function () { return ymd(new Date()); };
  function dateOf(s) {   // a date written in a common way -> YYYY-MM-DD, or ''
    s = String(s || '').trim(); if (!s) return '';
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if (m) return m[1] + '-' + m[2] + '-' + m[3];
    var t = Date.parse(s.replace(/\s+\d{1,2}:\d{2}.*$/, '')); return isNaN(t) ? '' : ymd(new Date(t));
  }
  function repeatOf(s) {   // "every week", "every 2 months", "every weekday", "monthly"
    s = String(s || '').toLowerCase();
    if (/every\s*weekday|every workday/.test(s)) return { n: 1, unit: 'week', wd: [1, 2, 3, 4, 5] };
    var m = /every\s+(\d{1,2})\s*(day|week|month|year)s?/.exec(s); if (m) return { n: +m[1], unit: m[2] };
    m = /\b(every\s+(day|week|month|year)|daily|weekly|monthly|yearly|annually)\b/.exec(s);
    if (m) return { n: 1, unit: m[2] || { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year', annually: 'year' }[m[1]] };
    return { n: 1, unit: 'none' };
  }
  var clip = function (s, n) { s = String(s == null ? '' : s).trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

  /* ---------- calendar (.ics) -> tasks ---------- */
  function ics(text) {
    text = String(text).replace(/\r?\n[ \t]/g, '');
    var out = [], ev = null, depth = 0, t0 = today();
    text.split(/\r\n|\n|\r/).forEach(function (line) {
      if (/^BEGIN:VEVENT$/i.test(line)) { ev = {}; depth = 0; return; }
      if (!ev) return;
      if (/^BEGIN:/i.test(line)) { depth++; return; }
      if (/^END:/i.test(line)) { if (depth) { depth--; return; } if (/^END:VEVENT$/i.test(line)) { out.push(ev); ev = null; } return; }
      if (depth) return;
      var c = line.indexOf(':'); if (c < 0) return;
      var head = line.slice(0, c).split(';'), name = head.shift().toUpperCase(), val = line.slice(c + 1);
      var un = function (v) { return v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1'); };
      if (name === 'SUMMARY') ev.name = un(val);
      else if (name === 'DESCRIPTION') ev.notes = un(val);
      else if (name === 'STATUS') ev.status = val.toUpperCase();
      else if (name === 'RRULE') ev.rule = val.toUpperCase();
      else if (name === 'RECURRENCE-ID') ev.moved = true;
      else if (name === 'DTSTART') {
        var m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})\d{2}(Z?))?/.exec(val); if (!m) return;
        if (!m[4]) { ev.due = m[1] + '-' + m[2] + '-' + m[3]; ev.time = ''; return; }
        var d = m[6] ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])) : new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
        ev.due = ymd(d); ev.time = pad(d.getHours()) + ':' + pad(d.getMinutes());
      }
    });
    var code = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
    return out.filter(function (e) { return e.due && e.status !== 'CANCELLED' && !e.moved; }).map(function (e) {
      var r = { n: 1, unit: 'none' };
      if (e.rule) {
        var p = {}; e.rule.split(';').forEach(function (kv) { var x = kv.split('='); p[x[0]] = x[1] || ''; });
        var unit = { DAILY: 'day', WEEKLY: 'week', MONTHLY: 'month', YEARLY: 'year' }[p.FREQ];
        if (unit) {
          r = { n: Math.max(1, Math.min(99, +p.INTERVAL || 1)), unit: unit };
          var by = (p.BYDAY || '').split(',').filter(Boolean);
          if (unit === 'week' && by.length && by.every(function (b) { return code[b] != null; })) r.wd = by.map(function (b) { return code[b]; }).sort();
          if (unit === 'month' && p.BYMONTHDAY === '-1') r.on = 'last';
          else if (unit === 'month' && by.length === 1 && /^-?\d(SU|MO|TU|WE|TH|FR|SA)$/.test(by[0])) { r.on = 'nth'; r.nth = Math.max(-1, Math.min(4, parseInt(by[0], 10))); r.dow = code[by[0].slice(-2)]; }
          if (p.UNTIL && /^\d{8}/.test(p.UNTIL) && p.UNTIL.slice(0, 8) < t0.replace(/-/g, '')) r = { n: 1, unit: 'none', over: true };
        }
      }
      return { name: clip(e.name || 'Event', 120), due: e.due, time: e.time || '', repeat: r, notes: clip(e.notes || '', 4000), past: e.due < t0 && (r.unit === 'none') };
    });
  }
  /* ---------- Todoist (CSV of a project) -> tasks ---------- */
  function todoist(c) {
    return c.rows.filter(function (r) { return (r.type || 'task') === 'task' && (r.content || '').trim(); }).map(function (r) {
      var due = dateOf(r.date) || dateOf(r.deadline) || today();
      var tm = /(\d{1,2}):(\d{2})/.exec(r.date || '');
      return { name: clip(r.content.replace(/\s*@\w+/g, ''), 120), due: due, time: tm ? pad(+tm[1]) + ':' + tm[2] : '', repeat: repeatOf(r.date), notes: clip(r.description || '', 4000), cat: clip((r.content.match(/@(\w+)/) || ['', ''])[1], 40), past: false };
    });
  }
  /* ---------- Google Keep (Takeout) -> notes ---------- */
  function keepNote(j, file) {
    if (!j || j.isTrashed) return null;
    var body = j.textContent || ((j.listContent || []).map(function (x) { return (x.isChecked ? '- [x] ' : '- [ ] ') + (x.text || ''); }).join('\n'));
    var title = j.title || body.split('\n')[0] || file.replace(/\.json$/i, '').split('/').pop();
    if (!body && !j.title) return null;
    return { title: clip(title, 80), notes: clip(body, 20000), group: ((j.labels || [])[0] || {}).name || (j.isArchived ? 'Archived' : 'Notes') };
  }
  /* ---------- Notion / plain notes -> notes ---------- */
  function mdNote(name, text) {
    var base = name.split('/').pop().replace(/\.(md|markdown|txt|html?)$/i, '').replace(/\s+[0-9a-f]{32}$/i, '');
    if (/\.html?$/i.test(name)) text = htmlText(text);
    var lines = String(text).replace(/\r/g, '').split('\n'), h = /^#\s+(.+)/.exec(lines[0] || '');
    var title = h ? h[1] : base, body = (h ? lines.slice(1) : lines).join('\n').trim();
    var dir = name.split('/').slice(0, -1).map(function (x) { return x.replace(/\s+[0-9a-f]{32}$/i, ''); }).filter(Boolean);
    return { title: clip(title, 80), notes: clip(body, 20000), group: dir.length > 1 ? dir[1] : dir[0] || 'Notes' };
  }
  /* ---------- links: Raindrop CSV, Pocket CSV or HTML, browser bookmarks HTML ---------- */
  function linksHtml(text) {
    // a browser's bookmarks: <DT><H3>Folder</H3><DL><DT><A ...> (the list sits inside the folder's DT); Pocket: <h1>Unread</h1><ul><li><a tags="...">
    var d = new DOMParser().parseFromString(String(text), 'text/html'), out = [];
    d.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href') || ''; if (!/^https?:\/\//i.test(href)) return;
      var dl = a.closest('dl'), dt = dl && dl.parentElement, h3 = dt && dt.querySelector(':scope > h3');
      var ul = a.closest('ul'), hd = ul && ul.previousElementSibling && /^H[1-6]$/.test(ul.previousElementSibling.tagName) ? ul.previousElementSibling : null;
      var tags = (a.getAttribute('tags') || '').split(',').filter(Boolean);
      out.push({ title: clip(a.textContent || href, 120), url: href, group: clip(tags[0] || (h3 ? h3.textContent : hd ? hd.textContent : 'Links'), 40) });
    });
    return out;
  }
  function linksCsv(c) {
    return c.rows.filter(function (r) { return /^https?:\/\//i.test(r.url || ''); }).map(function (r) {
      return { title: clip(r.title || r.url, 120), url: r.url, group: clip((r.folder || '').split('/').pop() || (r.tags || '').split(/[,|]/)[0] || r.status || 'Links', 40) };
    });
  }
  /* ---------- cards (CSV) ---------- */
  /** @type {[string, RegExp][]} */
  var CARD_FIELDS = [['bank', /bank|issuer/], ['name', /^(card|card name|name|product)$/], ['network', /network|scheme|visa|master/], ['variant', /variant|tier/], ['kind', /kind|credit.?debit/],
    ['type', /^type$|fee type|ltf/], ['limit', /limit/], ['fee', /fee|annual/], ['expiry', /expir|valid/], ['owner', /owner|holder|person|member/], ['remark', /remark|note|comment/]];
  function cardMap(head) {
    var map = {}, used = {};
    CARD_FIELDS.forEach(function (f) { var h = head.find(function (x) { return !used[x] && f[1].test(x.toLowerCase()); }); if (h) { map[f[0]] = h; used[h] = 1; } });
    return map;
  }
  function cards(c, map) {
    map = map || cardMap(c.head);
    return c.rows.map(function (r) {
      var g = function (k) { return map[k] ? (r[map[k].toLowerCase()] || '').trim() : ''; }, num = function (v) { var n = parseFloat(String(v).replace(/[^0-9.]/g, '')); return isFinite(n) ? n : null; };
      return { bank: clip(g('bank'), 60), name: clip(g('name'), 60), network: clip(g('network'), 40), variant: clip(g('variant'), 40), kind: /debit/i.test(g('kind')) ? 'Debit' : 'Credit',
        type: /ltf|lifetime/i.test(g('type')) ? 'LTF' : g('type') ? 'Paid' : 'LTF', limit: num(g('limit')), fee: num(g('fee')) || 0, expiry: g('expiry'), owner: clip(g('owner'), 40), remark: clip(g('remark'), 200) };
    }).filter(function (x) { return x.bank || x.name; });
  }

  /* ---------- which file is which ---------- */
  function readText(f) { return f.bytes ? Promise.resolve(new TextDecoder().decode(f.bytes)) : f.file.text(); }
  function read(fileList) {
    var files = [].slice.call(fileList || []);
    if (!files.length) return Promise.resolve({ error: 'Choose a file.' });
    if (files.reduce(function (s, f) { return s + f.size; }, 0) > MAX_BYTES) return Promise.resolve({ error: 'That is too big to import here (over 80 MB).' });
    return Promise.all(files.map(function (f) {
      return /\.zip$/i.test(f.name) ? f.arrayBuffer().then(unzip) : Promise.resolve([{ name: f.name, file: f }]);
    })).then(function (lists) {
      var all = /** @type {any[]} */ ([]).concat.apply([], lists);
      return Promise.all(all.map(function (f) { return readText(f).then(function (t) { return { name: f.name, text: t }; }); }));
    }).then(function (all) {
      var by = function (re) { return all.filter(function (f) { return re.test(f.name); }); };
      var icsF = all.filter(function (f) { return /\.ics$/i.test(f.name) || /^BEGIN:VCALENDAR/m.test(f.text.slice(0, 200)); });
      if (icsF.length) return { kind: 'calendar', label: 'Calendar', to: 'tasks', items: /** @type {any[]} */ ([]).concat.apply([], icsF.map(function (f) { return ics(f.text); })) };
      var keep = by(/\.json$/i).map(function (f) { try { return [JSON.parse(f.text), f.name]; } catch (e) { return null; } }).filter(function (x) { return x && x[0] && (x[0].textContent != null || x[0].listContent) && 'isTrashed' in x[0]; });
      if (keep.length) return { kind: 'keep', label: 'Google Keep', to: 'info', items: /** @type {any[]} */ (keep).map(function (x) { return keepNote(x[0], x[1]); }).filter(Boolean) };
      var csvs = by(/\.csv$/i).map(function (f) { return csv(f.text); });
      for (var i = 0; i < csvs.length; i++) {
        var hl = csvs[i].head.map(function (h) { return h.toLowerCase(); });
        if (hl.indexOf('content') >= 0 && (hl.indexOf('type') >= 0 || hl.indexOf('priority') >= 0)) return { kind: 'todoist', label: 'Todoist', to: 'tasks', items: [].concat.apply([], csvs.filter(function (c) { return c.head.map(function (h) { return h.toLowerCase(); }).indexOf('content') >= 0; }).map(todoist)) };
        if (hl.indexOf('url') >= 0 && (hl.indexOf('folder') >= 0 || hl.indexOf('time_added') >= 0 || hl.indexOf('tags') >= 0 || hl.indexOf('title') >= 0)) return { kind: hl.indexOf('folder') >= 0 ? 'raindrop' : 'pocket', label: hl.indexOf('folder') >= 0 ? 'Raindrop' : 'Pocket', to: 'links', items: [].concat.apply([], csvs.map(linksCsv)) };
        if (Object.keys(cardMap(csvs[i].head)).length >= 2) return { kind: 'cards', label: 'Cards Spreadsheet', to: 'cards', head: csvs[i].head, map: cardMap(csvs[i].head), items: cards(csvs[i]), csv: csvs[i] };
      }
      var html = by(/\.html?$/i), bm = html.filter(function (f) { return /<a\s[^>]*href=["']?https?:/i.test(f.text) && (/NETSCAPE-Bookmark|<DT>/i.test(f.text) || /time_added|Pocket/i.test(f.text)); });
      if (bm.length) return { kind: /time_added|Pocket/i.test(bm[0].text) ? 'pocket' : 'bookmarks', label: /time_added|Pocket/i.test(bm[0].text) ? 'Pocket' : 'Bookmarks', to: 'links', items: /** @type {any[]} */ ([]).concat.apply([], bm.map(function (f) { return linksHtml(f.text); })) };
      var notes = by(/\.(md|markdown|txt|html?)$/i);
      if (notes.length) return { kind: by(/\.md$/i).length && notes.some(function (f) { return /\s[0-9a-f]{32}\.md$/i.test(f.name); }) ? 'notion' : 'notes', label: notes.some(function (f) { return /\s[0-9a-f]{32}\.md$/i.test(f.name); }) ? 'Notion' : 'Notes',
        to: 'info', items: notes.map(function (f) { return mdNote(f.name, f.text); }).filter(function (n) { return n.title || n.notes; }) };
      return { error: 'This file was not recognised. Try a calendar (.ics), a Todoist or Raindrop CSV, a Google Keep or Notion export (.zip), notes (.txt, .md) or a bookmarks file (.html).' };
    }, function (e) { return { error: (e && e.message) || 'This file can’t be read.' }; });
  }
  window.HubImport = { read: read, csv: csv, cards: cards, cardMap: cardMap, unzip: unzip, ics: ics, FIELDS: CARD_FIELDS.map(function (f) { return f[0]; }) };
})();
