/*! Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
/* Files: your files, locked in this browser before they are sent (see web/files/lib.php for what the server keeps).
   Every file has its own random key (FK). The file is cut into 2 MB pieces, each locked with FK (AES-256-GCM; the piece number and the
   piece count are part of what is checked, so a piece can not be moved, repeated or cut off). FK is kept next to the file, locked with
   your site key (HubSite, shell.js). Names, types, sizes and dates are locked with the site key too.
   A share link holds the token and, after the #, FK: browsers never send the part after # to the server. */
(() => {
"use strict";
const $ = id => document.getElementById(id);
const HF = (u, o) => window.HUB ? HUB.fetch(u, o) : fetch(u, o);
const toast = (m, bad) => window.HUB ? HUB.toast(m, bad) : alert(m);
const V = window.HubVault, SITE = window.HubSite;
const PIECE = 2 * 1024 * 1024, OVER = 28;   // a piece is locked into iv (12) + the same bytes + tag (16)
const te = new TextEncoder();

/* ---------- small helpers ---------- */
const NS = "http://www.w3.org/2000/svg";
const ICONS = {
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  file: "M6 3h9l4 4v14H6zM14 3v5h5",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.5h.01",
  video: "M3 6h13v12H3zM16 10l5-3v10l-5-3z",
  audio: "M9 18V6l10-2v12M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3zM19 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3z",
  pdf: "M6 3h9l4 4v14H6zM14 3v5h5M9 14h6M9 17h4",
  text: "M6 3h9l4 4v14H6zM14 3v5h5M9 12h6M9 15h6M9 18h4",
  zip: "M6 3h9l4 4v14H6zM14 3v5h5M11 8h2M11 11h2M11 14h2M10 17h4v3h-4z",
  more: "M12 6h.01M12 12h.01M12 18h.01",
  down: "M12 4v12M7 11l5 5 5-5M5 20h14",
  share: "M18 8a3 3 0 1 0-3-3M6 15a3 3 0 1 0 0 .01M18 22a3 3 0 1 0 0-.01M8.6 13.5l6.8 4M15.4 6.5l-6.8 4",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  back: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5",
  move: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM10 13h6M13.5 10.5l2.5 2.5-2.5 2.5",
  edit: "M4 20h4L19 9l-4-4L4 16zM13 7l4 4",
  x: "M6 6l12 12M18 6L6 18"
};
const svg = (name, cls) => { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true"); if (cls) s.setAttribute("class", cls); const p = document.createElementNS(NS, "path"); p.setAttribute("d", ICONS[name] || ICONS.file); s.appendChild(p); return s; };
const h = (tag, attrs, ...kids) => {
  const e = document.createElement(tag);
  for (const k in (attrs || {})) { const v = attrs[k]; if (v === false || v == null) continue; if (k === "class") e.className = v; else if (k === "text") e.textContent = v; else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? "" : v); }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
};
const fmt = n => { if (n == null) return ""; const u = ["B", "KB", "MB", "GB", "TB"]; let i = 0; while (n >= 1024 && i < 4) { n /= 1024; i++; } return (i ? (n >= 100 ? n.toFixed(0) : n.toFixed(1)).replace(/\.0$/, "") : String(n)) + " " + u[i]; };
const when = ms => { try { return new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return ""; } };
const b64 = u => V.b64(u), ub64 = s => V.ub64(s);
const b64u = u => b64(u).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const ext = n => { const m = /\.([A-Za-z0-9]{1,8})$/.exec(n || ""); return m ? m[1].toLowerCase() : ""; };
const KINDS = {
  image: ["png", "jpg", "jpeg", "gif", "webp", "avif", "bmp", "svg"], video: ["mp4", "webm", "mov", "m4v", "ogv"], audio: ["mp3", "m4a", "wav", "ogg", "oga", "flac", "aac", "opus"],
  pdf: ["pdf"], text: ["txt", "md", "csv", "json", "log", "xml", "html", "css", "js", "py", "php", "sh", "yml", "yaml", "ini", "tsv", "rtf", "ics", "vcf"], zip: ["zip", "7z", "rar", "tar", "gz"]
};
const MIME = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", avif: "image/avif", bmp: "image/bmp", svg: "image/svg+xml", mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", m4v: "video/mp4", ogv: "video/ogg",
  mp3: "audio/mpeg", m4a: "audio/mp4", wav: "audio/wav", ogg: "audio/ogg", oga: "audio/ogg", flac: "audio/flac", aac: "audio/aac", opus: "audio/ogg", pdf: "application/pdf" };
const kindOf = n => { const e = ext(n); for (const k in KINDS) if (KINDS[k].includes(e)) return k; return "file"; };
const PREVIEW_MAX = 80 * 1024 * 1024;

/* ---------- state ---------- */
let D = { items: [], shares: [], settings: { limit: 5368709120, shares: true, trashDays: 30, view: "list", sort: "name" }, usage: 0, free: null, max: null };
let byId = new Map();
const MC = new Map();   // locked text -> what it says (names do not change under an id, so each is opened once)
let unlocked = false, noPass = false, cwd = "", tab = "files", q = "";
const sel = new Set();
let started = false;

const post = async (action, body) => {
  for (let tries = 0; tries < 2; tries++) {
    let r;
    try { r = await HF("api.php?action=" + action, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) }); }
    catch (e) { return { ok: false, error: "Can't reach the server. Nothing was changed." }; }
    const j = await r.json().catch(() => ({ ok: false, error: "The server's answer was not understood." }));
    if ((r.status === 401 || r.status === 403) && window.HUB && tries === 0) { try { await HUB.login("You were logged out. Log in to continue."); await HUB.ready(); continue; } catch (e) { return { ok: false, error: "You are logged out." }; } }
    j._s = r.status; return j;
  }
  return { ok: false, error: "You are logged out." };
};

function apply(j) {
  D = j; byId = new Map(j.items.map(i => [i.id, i]));
  for (const id of [...sel]) if (!byId.has(id) || byId.get(id).del > 0 !== (tab === "trash")) sel.delete(id);
}
const live = () => D.items.filter(i => !i.up && i.del === 0);
const trashed = () => D.items.filter(i => !i.up && i.top && i.del > 0);
const meta = i => MC.get(i.m) || null;
const nameOf = i => { const m = meta(i); return m ? m.n : (i.t === "d" ? "Folder" : "Locked file"); };
const sizeOf = i => { const m = meta(i); return i.t === "f" ? (m ? m.s : Math.max(0, i.z - i.c * OVER)) : null; };
const dateOf = i => { const m = meta(i); return m && m.mt ? m.mt : i.at * 1000; };

async function names() {
  let key = null;
  try { key = await SITE.key({ ask: false }); } catch (e) { key = null; }
  unlocked = !!key;
  if (!unlocked) return;
  const todo = D.items.filter(i => !i.up && !MC.has(i.m));
  for (let k = 0; k < todo.length; k += 150) {
    await Promise.all(todo.slice(k, k + 150).map(async i => { try { MC.set(i.m, await SITE.openJson(i.m)); } catch (e) { /* stays locked */ } }));
  }
}
async function ensureKey() {
  try {
    await SITE.key();
    if (!unlocked) { unlocked = true; noPass = false; await names(); render(); }
    return true;
  } catch (e) {
    if (e && e.code === "nopass") { noPass = true; render(); }
    else if (e && e.code === "insecure") toast("Files need a secure (https) connection to lock your files.", true);
    else if (e && e.code === "login" && window.HUB) HUB.login("Log in to open Files.").catch(() => {});
    else if (!e || e.code !== "cancel") toast((e && e.message) || "Could not unlock.", true);
    return false;
  }
}

/* ---------- crypto of one file ---------- */
const aad = (i, n) => { const a = new Uint8Array(8), v = new DataView(a.buffer); v.setUint32(0, i); v.setUint32(4, n); return a; };
const fileKey = (raw, use) => crypto.subtle.importKey("raw", raw, "AES-GCM", false, use);
async function lockPiece(fk, plain, i, n) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: aad(i, n) }, fk, plain));
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12); return out;
}
async function openPiece(fk, data, i, n) {
  if (data.length < 28) throw new Error("short");
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: data.subarray(0, 12), additionalData: aad(i, n) }, fk, data.subarray(12));
}
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crcUp = (c, u) => { c ^= 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
async function rawKeyOf(item) { return ub64(await SITE.open(item.k)); }

/* A whole file, opened: {blob, crc, size}. Pieces are fetched one after the other, so a big file never has two copies in memory. */
async function readFile(item, type, onBytes) {
  const raw = await rawKeyOf(item), fk = await fileKey(raw, ["decrypt"]); raw.fill(0);
  const parts = []; let crc = 0, size = 0;
  for (let i = 0; i < item.c; i++) {
    const r = await HF("api.php?action=chunk&id=" + item.id + "&n=" + i, { cache: "no-store" });
    if (!r.ok) throw new Error(r.status === 404 ? "A piece of this file is missing on the server." : "Could not download (" + r.status + ").");
    const plain = new Uint8Array(await openPiece(fk, new Uint8Array(await r.arrayBuffer()), i, item.c).catch(() => { throw new Error("This file did not open: it was changed, or your key does not fit."); }));
    crc = crcUp(crc, plain); size += plain.length; parts.push(plain); if (onBytes) onBytes(plain.length);
  }
  return { blob: new Blob(parts, { type: type || "application/octet-stream" }), crc, size };
}
const save = (blob, name) => { const u = URL.createObjectURL(blob), a = h("a", { href: u, download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000); };

/* ---------- a zip, made here (stored, not squeezed: pictures and PDFs do not shrink anyway) ---------- */
function zipOf(entries) {   // [{path, blob, crc, size, mt}]
  const parts = [], cen = []; let off = 0;
  const dos = ms => { const d = new Date(Math.max(ms || Date.now(), 315532800000)); return [((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF, (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF]; };
  for (const e of entries) {
    const nm = te.encode(e.path), [tm, dt] = dos(e.mt), lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true); lh.setUint16(10, tm, true); lh.setUint16(12, dt, true);
    lh.setUint32(14, e.crc, true); lh.setUint32(18, e.size, true); lh.setUint32(22, e.size, true); lh.setUint16(26, nm.length, true); lh.setUint16(28, 0, true);
    parts.push(lh.buffer, nm, e.blob);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, tm, true); ch.setUint16(14, dt, true);
    ch.setUint32(16, e.crc, true); ch.setUint32(20, e.size, true); ch.setUint32(24, e.size, true); ch.setUint16(28, nm.length, true); ch.setUint32(42, off, true);
    cen.push(ch.buffer, nm);
    off += 30 + nm.length + e.size;
  }
  const cdSize = cen.reduce((a, x) => a + (x.byteLength !== undefined ? x.byteLength : x.length), 0), end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true); end.setUint32(12, cdSize, true); end.setUint32(16, off, true);
  return new Blob([...parts, ...cen, end.buffer], { type: "application/zip" });
}

/* ---------- dialogs ---------- */
const dlg = $("dlg"), dform = $("dform");
function openDialog(title, body, buttons, o) {   // buttons: [{text, pri, danger, left, run}]; run returns false to keep the dialog open
  return new Promise(resolve => {
    o = o || {};
    dform.replaceChildren(h("h2", { text: title }), ...[].concat(body), h("p", { class: "err", id: "derr", role: "alert" }),
      h("div", { class: "act" }, ...buttons.map(b => h("button", { type: "button", class: "btn" + (b.pri ? " pri" : "") + (b.danger ? " danger" : "") + (b.left ? " left" : ""), text: b.text,
        onclick: async ev => { const btn = ev.currentTarget; btn.disabled = true; let keep = false; try { keep = (await b.run()) === false; } finally { btn.disabled = false; } if (!keep) { dlg.close(); resolve(b.text); } } }))));
    dlg.onclose = () => resolve(null);
    dform.onsubmit = ev => { ev.preventDefault(); const p = buttons.find(b => b.pri); if (p) dform.querySelector(".act .pri").click(); };
    dlg.showModal();
    const f = dform.querySelector("[autofocus],input,select"); if (f) { f.focus(); if (f.select) f.select(); }
  });
}
const derr = t => { const e = $("derr"); if (e) e.textContent = t || ""; };
const cancelBtn = { text: "Cancel", run: () => {} };

const confirmBox = (title, text, yes, danger) => openDialog(title, h("p", { text }), [cancelBtn, { text: yes, pri: !danger, danger: !!danger, run: () => {} }]).then(r => r === yes);

async function nameBox(title, label, value, yes) {
  let out = null;
  const inp = h("input", { type: "text", id: "dname", maxlength: "180", value: value || "", autocomplete: "off", "aria-label": label, autofocus: true });
  await openDialog(title, [h("label", { for: "dname", text: label }), inp], [cancelBtn, { text: yes, pri: true, run: () => {
    const v = inp.value.trim().replace(/[\\/]+/g, "-");
    if (!v || v === "." || v === "..") { derr("Type a name."); return false; }
    out = v;
  } }]);
  return out;
}

/* ---------- the list ---------- */
const pathOf = id => { const out = []; let x = byId.get(id), n = 0; while (x && n++ < 40) { out.unshift(x); x = x.p ? byId.get(x.p) : null; } return out; };
const kidsOf = id => live().filter(i => i.p === id);
function shown() {
  let list;
  if (tab === "trash") list = trashed();
  else if (q) { const t = q.toLowerCase(); list = live().filter(i => nameOf(i).toLowerCase().includes(t)); }
  else list = kidsOf(cwd);
  const s = D.settings.sort || "name";
  list.sort((a, b) => {
    if (tab === "files" && a.t !== b.t) return a.t === "d" ? -1 : 1;
    if (s === "date") return dateOf(b) - dateOf(a);
    if (s === "size") return (sizeOf(b) || 0) - (sizeOf(a) || 0);
    return nameOf(a).localeCompare(nameOf(b), undefined, { numeric: true, sensitivity: "base" });
  });
  return list;
}
const icoOf = i => i.t === "d" ? "d" : kindOf(nameOf(i));
const icoName = i => i.t === "d" ? "folder" : ({ image: "image", video: "video", audio: "audio", pdf: "pdf", text: "text", zip: "zip" }[kindOf(nameOf(i))] || "file");

function render() {
  $("tn").textContent = trashed().length ? " " + trashed().length : "";
  for (const b of $("tabs").querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.dataset.t === tab));
  for (const b of $("vsw").querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.dataset.v === D.settings.view));
  $("sort").value = D.settings.sort || "name";
  /* where you are */
  const cr = $("crumbs"); cr.replaceChildren();
  if (tab === "trash") cr.append(h("button", { type: "button", "aria-current": "page", text: "Trash (kept " + D.settings.trashDays + " days, then removed for good)" }));
  else if (q) cr.append(h("button", { type: "button", "aria-current": "page", text: "Search results" }));
  else {
    const trail = [{ id: "", n: "All Files" }].concat(pathOf(cwd).map(i => ({ id: i.id, n: nameOf(i) })));
    trail.forEach((c, k) => { if (k) cr.append(h("i", { "aria-hidden": "true", text: "/" })); cr.append(h("button", { type: "button", text: c.n, "aria-current": k === trail.length - 1 ? "page" : false, onclick: () => { if (k < trail.length - 1) { cwd = c.id; sel.clear(); render(); } } })); });
  }
  $("empty").hidden = !(tab === "trash" && trashed().length);
  $("mk").hidden = $("up").hidden = tab === "trash";
  /* locked / no passphrase */
  const lock = $("lock"); lock.replaceChildren();
  if (noPass) { lock.hidden = false; lock.append(h("p", {}, h("b", { text: "Files are locked with your encryption passphrase. " }), "Set one first, in Settings, Security, Encryption."), h("button", { type: "button", class: "btn pri", text: "Open Encryption Settings", onclick: () => window.HUB ? HUB.settings("security/encryption") : location.href = "../settings/#security/encryption" })); }
  else if (!unlocked && D.items.length) { lock.hidden = false; lock.append(h("p", {}, h("b", { text: "Your files are locked. " }), "Type your encryption passphrase to see their names and open them."), h("button", { type: "button", class: "btn pri", text: "Unlock", onclick: () => { ensureKey(); } })); }
  else lock.hidden = true;
  /* rows */
  const list = shown(), box = $("list"), grid = D.settings.view === "grid";
  box.className = "list" + (grid ? " grid" : ""); box.replaceChildren();
  if (list.length && !grid) box.append(h("div", { class: "lh", "aria-hidden": "true" }, h("span"), h("span", { text: "Name" }), h("span", { text: "Size" }), h("span", { text: "Date" }), h("span")));
  for (const i of list) box.append(row(i));
  const none = $("none"); none.hidden = list.length > 0;
  if (!list.length) {
    none.replaceChildren(...(tab === "trash" ? [h("b", { text: "The Trash is empty" }), "Things you remove wait here, and are removed for good after " + D.settings.trashDays + " days."]
      : q ? [h("b", { text: "Nothing found" }), "No file or folder has that in its name."]
      : [h("b", { text: cwd ? "This folder is empty" : "No files yet" }), "Drag files here, or press Upload. Everything is locked in your browser before it is sent."]));
  }
  bulk(); usage();
  $("sync").textContent = D.items.length ? "Saved on your server, locked" : "";
}

function row(i) {
  const isD = i.t === "d", name = nameOf(i), sz = sizeOf(i), at = dateOf(i);
  const where = q && i.p ? pathOf(i.p).map(nameOf).join(" / ") : "";
  const left = tab === "trash" ? Math.max(0, Math.ceil((i.del + D.settings.trashDays * 86400 - Date.now() / 1000) / 86400)) : 0;
  const sub = tab === "trash" ? "Removed for good in " + left + (left === 1 ? " day" : " days") : (isD ? "Folder" : fmt(sz)) + " · " + when(at) + (where ? " · in " + where : "");
  const ck = h("input", { type: "checkbox", class: "ck", "aria-label": "Pick " + name, checked: sel.has(i.id), onchange: e => { e.target.checked ? sel.add(i.id) : sel.delete(i.id); row.sync(); } });
  const open = h("button", { type: "button", class: "nm", title: name, onclick: () => openItem(i) },
    h("span", { class: "ico " + icoOf(i) }, svg(icoName(i))), h("span", { class: "t" }, name, where && tab === "files" ? h("small", { text: "in " + where }) : null));
  const more = h("button", { type: "button", class: "ib more", "aria-label": "More for " + name, "aria-haspopup": "menu", onclick: e => menu(e.currentTarget, i) }, svg("more"));
  const el = h("div", { class: "row" + (sel.has(i.id) ? " sel" : ""), "data-id": i.id, oncontextmenu: e => { e.preventDefault(); menu(more, i); } },
    ck, open, h("span", { class: "cell sz num", text: isD ? "" : fmt(sz) }), h("span", { class: "cell dt", text: tab === "trash" ? left + (left === 1 ? " day left" : " days left") : when(at) }), more, h("span", { class: "cell meta", text: sub }));
  return el;
}
row.sync = () => { for (const r of $("list").querySelectorAll(".row")) r.classList.toggle("sel", sel.has(r.dataset.id)); bulk(); };

function usage() {
  const u = $("usage"), max = D.max;
  u.replaceChildren();
  const used = D.usage;
  u.append(h("span", { class: "num", text: fmt(used) + (max ? " of " + fmt(max) : "") + " used" }));
  if (max) { const p = Math.min(100, used / max * 100); u.append(h("span", { class: "bar", role: "img", "aria-label": Math.round(p) + " percent used" }, h("i", { class: p > 90 ? "hot" : "", style: "width:" + p + "%" }))); }
  if (D.free != null) u.append(h("span", { class: "num", text: fmt(D.free) + " free on the server" }));
}

/* ---------- the little menu ---------- */
let pm = null;
function closeMenu() { if (pm) { pm.remove(); pm = null; } }
function menu(anchor, i) {
  closeMenu();
  const acts = [];
  if (tab === "trash") acts.push(["back", "Restore", () => restore([i.id])], ["trash", "Delete Forever", () => purge([i.id])]);
  else {
    acts.push([i.t === "d" ? "folder" : "file", i.t === "d" ? "Open" : (previewable(i) ? "Preview" : "Open"), () => openItem(i)]);
    acts.push(["down", i.t === "d" ? "Download as Zip" : "Download", () => download([i.id])]);
    if (i.t === "f" && D.settings.shares) acts.push(["share", "Share Link", () => shareBox(i)]);
    acts.push(["edit", "Rename", () => rename(i)], ["move", "Move", () => moveBox([i.id])], ["trash", "Move to Trash", () => trash([i.id])]);
  }
  pm = h("div", { class: "pm", role: "menu" }, acts.map(a => h("button", { type: "button", role: "menuitem", onclick: () => { closeMenu(); a[2](); } }, svg(a[0]), a[1])));
  document.body.append(pm);
  const r = anchor.getBoundingClientRect(), w = pm.offsetWidth, hh = pm.offsetHeight;
  pm.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + "px";
  pm.style.top = (r.bottom + hh + 12 > innerHeight && r.top > hh ? r.top - hh - 4 : r.bottom + 4) + "px";
  pm.querySelector("button").focus();
  pm.addEventListener("keydown", e => { const b = [...pm.querySelectorAll("button")], k = b.indexOf(document.activeElement); if (e.key === "ArrowDown") { b[(k + 1) % b.length].focus(); e.preventDefault(); } if (e.key === "ArrowUp") { b[(k + b.length - 1) % b.length].focus(); e.preventDefault(); } if (e.key === "Escape") { closeMenu(); anchor.focus(); } });
}
document.addEventListener("pointerdown", e => { if (pm && !pm.contains(e.target) && !e.target.closest(".more")) closeMenu(); });

/* ---------- picking several ---------- */
function bulk() {
  const b = $("bulk"); b.replaceChildren();
  const ids = [...sel]; b.hidden = !ids.length; if (!ids.length) return;
  const btn = (t, f, o) => h("button", { type: "button", class: "btn" + (o && o.danger ? " danger" : ""), text: t, onclick: f });
  b.append(h("b", { text: ids.length + (ids.length === 1 ? " picked" : " picked") }));
  if (tab === "trash") b.append(btn("Restore", () => restore(ids)), btn("Delete Forever", () => purge(ids), { danger: true }));
  else {
    b.append(btn("Download", () => download(ids)), btn("Move", () => moveBox(ids)));
    if (ids.length === 1 && byId.get(ids[0]).t === "f" && D.settings.shares) b.append(btn("Share Link", () => shareBox(byId.get(ids[0]))));
    b.append(btn("Move to Trash", () => trash(ids), { danger: true }));
  }
  b.append(btn("Clear", () => { sel.clear(); render(); }));
}

/* ---------- actions ---------- */
async function refresh() {
  const r = await HF("api.php?action=list", { cache: "no-store" }).catch(() => null);
  const j = r && r.ok ? await r.json().catch(() => null) : null;
  if (j && j.ok) { apply(j); await names(); render(); return true; }
  toast("Could not reload the list.", true); return false;
}
async function run(p, okMsg) {
  const j = await p;
  if (!j.ok) { toast(j.error || "That did not work.", true); return false; }
  if (okMsg) toast(okMsg);
  await refresh(); return true;
}
function openItem(i) {
  if (tab === "trash") return toast(i.t === "d" ? "Restore the folder to open it." : "Restore the file to open it.");
  if (i.t === "d") { cwd = i.id; q = ""; $("q").value = ""; sel.clear(); render(); return; }
  if (!unlocked) { ensureKey().then(ok => { if (ok) openItem(byId.get(i.id)); }); return; }
  if (previewable(i)) preview(i); else download([i.id]);
}
async function mkdir() {
  if (!await ensureKey()) return;
  const n = await nameBox("New Folder", "Folder Name", "", "Create");
  if (n == null) return;
  const m = await SITE.sealJson({ n: uniqueName(cwd, n, "d") });
  await run(post("mkdir", { p: cwd, m }), "Folder made.");
}
function uniqueName(parent, name, t) {
  const have = new Set(live().filter(i => i.p === parent && i.t === t).map(nameOf));
  if (!have.has(name)) return name;
  const e = t === "f" && /\.[A-Za-z0-9]{1,8}$/.test(name) ? name.slice(name.lastIndexOf(".")) : "", base = e ? name.slice(0, -e.length) : name;
  for (let k = 2; k < 1000; k++) if (!have.has(base + " (" + k + ")" + e)) return base + " (" + k + ")" + e;
  return name;
}
async function rename(i) {
  if (!await ensureKey()) return;
  const n = await nameBox(i.t === "d" ? "Rename Folder" : "Rename File", "Name", nameOf(i), "Save");
  if (n == null || n === nameOf(i)) return;
  const old = meta(i) || {};
  const m = await SITE.sealJson(Object.assign({}, old, { n }));
  await run(post("rename", { id: i.id, m }), "Renamed.");
}
function folderPicker(skip, current) {
  const skipSet = new Set(); for (const id of skip) { skipSet.add(id); (function walk(x) { for (const k of kidsOf(x)) if (k.t === "d") { skipSet.add(k.id); walk(k.id); } })(id); }
  const out = [{ id: "", n: "All Files", d: 0 }];
  (function walk(parent, d) { for (const f of kidsOf(parent).filter(x => x.t === "d").sort((a, b) => nameOf(a).localeCompare(nameOf(b), undefined, { numeric: true }))) { if (skipSet.has(f.id)) continue; out.push({ id: f.id, n: nameOf(f), d }); walk(f.id, d + 1); } })("", 1);
  return out;
}
async function moveBox(ids) {
  if (!await ensureKey()) return;
  let to = cwd;
  const box = h("div", { class: "pick", role: "group", "aria-label": "Folders" });
  const draw = () => { box.replaceChildren(...folderPicker(ids).map(f => h("button", { type: "button", "aria-pressed": String(f.id === to), style: "padding-left:" + (12 + f.d * 18) + "px", onclick: () => { to = f.id; draw(); } }, svg("folder", "i"), f.n))); };
  draw();
  await openDialog("Move " + (ids.length === 1 ? nameOf(byId.get(ids[0])) : ids.length + " Items"), [h("p", { text: "Pick the folder to move it into." }), box], [cancelBtn, { text: "Move Here", pri: true, run: async () => {
    const j = await post("move", { ids, p: to }); if (!j.ok) { derr(j.error); return false; }
    sel.clear(); await refresh(); toast("Moved.");
  } }]);
}
async function trash(ids) { sel.clear(); await run(post("trash", { ids }), ids.length === 1 ? "Moved to the Trash." : "Moved to the Trash: " + ids.length + " items."); }
async function restore(ids) { sel.clear(); await run(post("restore", { ids }), "Restored."); }
async function purge(ids) {
  if (!await confirmBox("Delete Forever?", ids.length === 1 ? "This can't be undone." : "These " + ids.length + " items can't be brought back.", "Delete Forever", true)) return;
  sel.clear(); await run(post("purge", { ids }), "Deleted.");
}

/* ---------- download ---------- */
async function download(ids) {
  if (!await ensureKey()) return;
  const items = ids.map(id => byId.get(id)).filter(Boolean);
  try {
    if (items.length === 1 && items[0].t === "f") {
      const i = items[0], p = progress("Downloading " + nameOf(i));
      try { const r = await readFile(i, "application/octet-stream", n => p.add(n, sizeOf(i))); save(r.blob, nameOf(i)); p.done("Downloaded"); } catch (e) { p.fail(e.message); }
      return;
    }
    /* folders and several files: one zip, made here */
    const files = [];
    const collect = (i, base) => { if (i.t === "f") files.push({ i, path: base + nameOf(i) }); else for (const k of kidsOf(i.id)) collect(k, base + nameOf(i) + "/"); };
    for (const i of items) collect(i, "");
    const total = files.reduce((a, f) => a + (sizeOf(f.i) || 0), 0);
    if (!files.length) return toast("There is nothing in there to download.");
    if (total > 3.5 * 1024 * 1024 * 1024) return toast("That is too much for one zip (" + fmt(total) + "). Download the folders inside it one at a time.", true);
    const p = progress("Making a zip of " + files.length + (files.length === 1 ? " file" : " files"));
    try {
      const out = []; let done = 0;
      for (const f of files) { const r = await readFile(f.i, "application/octet-stream", n => { done += n; p.add(done, total, true); }); out.push({ path: f.path, blob: r.blob, crc: r.crc, size: r.size, mt: dateOf(f.i) }); }
      const nm = items.length === 1 ? nameOf(items[0]) : "Files";
      save(zipOf(out), nm + ".zip"); p.done("Zip ready");
    } catch (e) { p.fail(e.message); }
  } catch (e) { toast(e.message || "Could not download.", true); }
}

/* ---------- preview ---------- */
const previewable = i => i.t === "f" && ["image", "video", "audio", "pdf", "text"].includes(kindOf(nameOf(i))) && (sizeOf(i) || 0) <= PREVIEW_MAX;
const pdlg = $("pdlg"), pbox = $("pbox");
async function preview(i) {
  const name = nameOf(i), k = kindOf(name), mime = MIME[ext(name)] || (k === "text" ? "text/plain" : "application/octet-stream");
  pbox.replaceChildren(h("div", { class: "ph" }, h("b", { text: name }), h("button", { type: "button", class: "btn", text: "Download", onclick: () => download([i.id]) }), h("button", { type: "button", class: "btn", text: "Close", onclick: () => pdlg.close() })), h("div", { class: "pv", id: "pv", text: "Opening…" }));
  pdlg.showModal(); let url = "";
  pdlg.onclose = () => { if (url) URL.revokeObjectURL(url); pbox.replaceChildren(); };
  try {
    const r = await readFile(i, mime), pv = $("pv"); if (!pdlg.open) return;
    pv.replaceChildren();
    if (k === "text") { const t = await r.blob.slice(0, 600000).text(); pv.append(h("pre", { text: t + (r.size > 600000 ? "\n\n… (only the start is shown)" : "") })); return; }
    url = URL.createObjectURL(r.blob);
    if (k === "image") pv.append(h("img", { src: url, alt: name }));
    else if (k === "video") pv.append(h("video", { src: url, controls: true }));
    else if (k === "audio") pv.append(h("audio", { src: url, controls: true }));
    else pv.append(h("iframe", { src: url, title: name }));
  } catch (e) { const pv = $("pv"); if (pv) pv.textContent = e.message; }
}

/* ---------- uploads ---------- */
const ups = $("ups"); let upList = null;
function progress(label) {
  if (!upList) { ups.replaceChildren(h("h2", {}, "Transfers", h("button", { type: "button", class: "ib", "aria-label": "Hide", onclick: () => { ups.hidden = true; } }, svg("x"))), upList = h("div")); }
  ups.hidden = false;
  const bar = h("i"), sm = h("small", { text: "Starting…" }), el = h("div", { class: "up" }, h("div", { class: "l" }, h("span", { text: label }), sm), h("div", { class: "pb" }, bar));
  upList.prepend(el); let sum = 0;
  const api = {
    add(n, total, absolute) { sum = absolute ? n : sum + n; if (total) bar.style.width = Math.min(100, sum / total * 100) + "%"; sm.textContent = total ? Math.round(Math.min(100, sum / total * 100)) + "%" : fmt(sum); },
    done(t) { bar.style.width = "100%"; sm.textContent = t || "Done"; setTimeout(() => { if (el.parentNode) { el.remove(); if (!upList.children.length) ups.hidden = true; } }, 4000); },
    fail(t) { el.classList.add("bad"); sm.textContent = t || "Failed"; sm.title = t || ""; }
  };
  return api;
}
let busy = 0, queue = Promise.resolve();
function uploadAll(entries) {   // [{file, parts: [folder names]}]
  if (!entries.length) return;
  queue = queue.then(() => doUploads(entries)).catch(e => toast(e.message || "Upload stopped.", true));
}
async function doUploads(entries) {
  if (!await ensureKey()) return;
  const base = cwd, made = new Map([["", base]]);
  const folderFor = async parts => {
    let parent = base, key = "";
    for (const nm of parts) {
      key += "/" + nm;
      if (!made.has(key)) {
        const have = live().find(i => i.t === "d" && i.p === parent && nameOf(i) === nm);
        if (have) made.set(key, have.id);
        else {
          const m = await SITE.sealJson({ n: nm }), j = await post("mkdir", { p: parent, m });
          if (!j.ok) throw new Error(j.error);
          await refresh();
          const f = live().find(i => i.t === "d" && i.p === parent && nameOf(i) === nm); if (!f) throw new Error("Could not make a folder.");
          made.set(key, f.id);
        }
      }
      parent = made.get(key);
    }
    return parent;
  };
  let okN = 0;
  for (const e of entries) {
    const p = progress("Uploading " + e.file.name);
    try { const parent = await folderFor(e.parts); await uploadOne(e.file, parent, p); okN++; p.done("Done"); }
    catch (x) { p.fail(x.message || "Failed"); }
  }
  await refresh();
  if (okN) toast(okN === 1 ? "Uploaded." : "Uploaded " + okN + " files.");
}
async function uploadOne(file, parent, p) {
  const raw = crypto.getRandomValues(new Uint8Array(32)), fk = await fileKey(raw, ["encrypt"]);
  const n = Math.max(1, Math.ceil(file.size / PIECE)), z = file.size + n * OVER;
  const name = uniqueName(parent, file.name || "file", "f");
  const m = await SITE.sealJson({ n: name, ty: file.type || "", s: file.size, mt: file.lastModified || Date.now() });
  const k = await SITE.seal(b64(raw)); raw.fill(0);
  const st = await post("put_start", { p: parent, m, k, c: n, z });
  if (!st.ok) throw new Error(st.error || "Could not start.");
  const id = st.id; let sent = 0;
  try {
    for (let i = 0; i < n; i++) {
      const plain = await file.slice(i * PIECE, Math.min(file.size, (i + 1) * PIECE)).arrayBuffer();
      const body = await lockPiece(fk, plain, i, n);
      let r = null;
      for (let t = 0; t < 3 && !(r && r.ok); t++) { r = await HF("api.php?action=put_chunk&id=" + id + "&n=" + i, { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body }).catch(() => null); if (r && !r.ok && r.status !== 502 && r.status !== 504) break; }
      if (!r || !r.ok) { const j = r ? await r.json().catch(() => ({})) : {}; throw new Error(j.error || "A piece did not arrive."); }
      sent += plain.byteLength; p.add(sent, file.size || 1, true);
    }
    const dn = await post("put_done", { id }); if (!dn.ok) throw new Error(dn.error || "The file did not finish.");
  } catch (e) { await post("put_abort", { id }); throw e; }
}
/* what was dropped: files, and folders with everything in them */
async function dropped(dt) {
  const out = [];
  const walk = async (en, parts) => {
    if (en.isFile) { const f = await new Promise((res, rej) => en.file(res, rej)); out.push({ file: f, parts }); }
    else if (en.isDirectory) {
      const rd = en.createReader(), kids = []; for (;;) { const b = await new Promise((res, rej) => rd.readEntries(res, rej)); if (!b.length) break; kids.push(...b); }
      if (!kids.length) out.push({ file: null, parts: parts.concat(en.name), empty: true });
      for (const k of kids) await walk(k, parts.concat(en.name));
    }
  };
  const items = [...(dt.items || [])].map(it => it.webkitGetAsEntry && it.webkitGetAsEntry()).filter(Boolean);
  if (items.length) for (const en of items) await walk(en, en.isDirectory ? [] : []);
  else for (const f of dt.files) out.push({ file: f, parts: [] });
  return out.filter(x => x.file);
}

/* ---------- share links ---------- */
async function shareBox(i) {
  if (!await ensureKey()) return;
  const raw = await rawKeyOf(i), fk = await fileKey(raw, ["encrypt"]);
  const linkFor = t => { const u = new URL("share.html", location.href); u.searchParams.set("t", t); u.hash = b64u(raw); return u.href; };
  const box = h("div", { class: "links" });
  const exp = h("select", { id: "dexp", "aria-label": "Link ends" }, [["0", "Never"], ["86400", "After 1 day"], ["604800", "After 7 days"], ["2592000", "After 30 days"], ["7776000", "After 90 days"]].map(o => h("option", { value: o[0], text: o[1] })));
  const draw = () => {
    const mine = D.shares.filter(s => s.id === i.id);
    box.replaceChildren(...(mine.length ? mine.map(s => {
      const url = linkFor(s.token), inp = h("input", { type: "text", readonly: true, value: url, "aria-label": "Share link", onfocus: e => e.target.select() });
      return h("div", { class: "lk" }, h("div", { class: "meta", text: "Made " + when(s.at * 1000) + (s.exp ? " · ends " + when(s.exp * 1000) : " · never ends") }),
        h("div", { class: "linkbox" }, inp, h("button", { type: "button", class: "btn", text: "Copy", onclick: async () => { try { await navigator.clipboard.writeText(url); toast("Link copied."); } catch (e) { inp.select(); toast("Press Ctrl+C to copy."); } } }),
          h("button", { type: "button", class: "btn danger", text: "Remove", onclick: async () => { const j = await post("share_delete", { token: s.token }); if (!j.ok) return derr(j.error); await refresh(); draw(); } })));
    }) : [h("p", { text: "No link yet. Make one, and send it to the person who should have this file." })]));
  };
  draw();
  const make = async () => {
    const meta1 = meta(i) || { n: nameOf(i), s: sizeOf(i) };
    const sm = await V.seal(fk, JSON.stringify({ n: meta1.n, ty: meta1.ty || "", s: meta1.s }));
    const e = +exp.value, j = await post("share_create", { id: i.id, sm, exp: e ? Math.floor(Date.now() / 1000) + e : 0 });
    if (!j.ok) { derr(j.error); return false; }
    await refresh(); draw(); toast("Link made."); return false;
  };
  await openDialog("Share " + nameOf(i), [h("p", { text: "Anyone with the link can open this one file. The key to unlock it is in the link itself (after the #), so it never reaches your server, and the file stays locked there." }), box,
    h("label", { for: "dexp", text: "New link ends" }), exp], [{ text: "Make a New Link", pri: true, left: true, run: make }, { text: "Done", run: () => {} }]);
  raw.fill(0);
}

/* ---------- settings ---------- */
async function settingsBox() {
  const s = D.settings, lim = h("input", { type: "number", id: "dlim", min: "0", step: "0.5", value: s.limit ? +(s.limit / 1073741824).toFixed(2) : 0, "aria-label": "Storage limit in GB" });
  const sh = h("input", { type: "checkbox", id: "dsh", checked: !!s.shares }), only = h("input", { type: "checkbox", checked: true, disabled: true, "aria-label": "Only Me: always on" });
  const td = h("select", { id: "dtd", "aria-label": "Keep Trash" }, [7, 14, 30, 60, 90].map(d => h("option", { value: d, selected: d === s.trashDays, text: d + " days" })));
  await openDialog("Files Settings", [
    h("div", { class: "frow" }, h("div", {}, h("b", { text: "Only Me" }), h("small", { text: "Always on: this page is only for you." })), h("label", { class: "sw" }, only, h("i"))),
    h("label", { for: "dlim", text: "Storage Limit (GB, 0 = only the server's free space limits)" }), lim,
    h("div", { class: "frow" }, h("div", {}, h("b", { text: "Share Links" }), h("small", { text: "Lets you make a link to one file. Turning this off ends every link." })), h("label", { class: "sw" }, sh, h("i"))),
    h("label", { for: "dtd", text: "Keep Things in the Trash" }), td
  ], [cancelBtn, { text: "Save Settings", pri: true, run: async () => {
    const j = await post("settings", { settings: { limit: Math.round(Math.max(0, +lim.value || 0) * 1073741824), shares: sh.checked, trashDays: +td.value } });
    if (!j.ok) { derr(j.error); return false; }
    await refresh(); toast("Saved.");
  } }]);
}

/* ---------- start ---------- */
function privateScreen(j) {
  document.body.innerHTML = '<div id="ix-private"><div class="ix-ico"><svg viewBox="0 0 24 24"><path d="M5 11h14v10H5zM8 11V8a4 4 0 0 1 8 0v3"/></svg></div><h1></h1><p>This page is private. Log in to see it.</p><button type="button">Log In</button></div>';
  document.querySelector("#ix-private h1").textContent = document.title || "Files";
  document.querySelector("#ix-private button").onclick = () => window.HUB ? HUB.login("Log in to see your files.").then(() => location.reload(), () => {}) : location.reload();
  if (window.HUB && HUB.ready) HUB.ready();
}
async function load() {
  let j = null;
  try { const r = await HF("api.php?action=list", { cache: "no-store" }); j = await r.json(); } catch (e) { j = null; }
  if (!j) { $("sync").textContent = "Could not reach the server."; return; }
  if (j.private && !j.auth) return privateScreen(j);
  apply(j); await names(); started = true; render();
}
function wire() {
  $("up").onclick = $("uph").onclick = () => $("pick").click();
  $("mk").onclick = $("mkh").onclick = mkdir;
  $("psets").onclick = settingsBox;
  $("pick").onchange = e => { uploadAll([...e.target.files].map(f => ({ file: f, parts: [] }))); e.target.value = ""; };
  $("empty").onclick = async () => { if (await confirmBox("Empty the Trash?", "Everything in the Trash is deleted for good. This can't be undone.", "Empty Trash", true)) await run(post("empty_trash"), "Trash emptied."); };
  $("tabs").onclick = e => { const b = e.target.closest("button"); if (!b) return; tab = b.dataset.t; sel.clear(); q = ""; $("q").value = ""; render(); };
  $("vsw").onclick = e => { const b = e.target.closest("button"); if (!b) return; D.settings.view = b.dataset.v; render(); post("settings", { settings: { view: b.dataset.v } }); };
  $("sort").onchange = e => { D.settings.sort = e.target.value; render(); post("settings", { settings: { sort: e.target.value } }); };
  let qt; $("q").oninput = e => { clearTimeout(qt); qt = setTimeout(() => { q = e.target.value.trim(); if (q && tab !== "files") tab = "files"; render(); }, 120); };
  const dz = $("drop"); let depth = 0;
  window.addEventListener("dragenter", e => { if ([...(e.dataTransfer.types || [])].includes("Files")) { depth++; dz.classList.add("over"); } });
  window.addEventListener("dragleave", () => { depth = Math.max(0, depth - 1); if (!depth) dz.classList.remove("over"); });
  window.addEventListener("dragover", e => { if ([...(e.dataTransfer.types || [])].includes("Files")) e.preventDefault(); });
  window.addEventListener("drop", async e => { depth = 0; dz.classList.remove("over"); if (![...(e.dataTransfer.types || [])].includes("Files") || tab !== "files") return; e.preventDefault(); uploadAll(await dropped(e.dataTransfer)); });
  document.addEventListener("keydown", e => { if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.querySelector("dialog[open]")) { e.preventDefault(); $("q").focus(); } });
}
wire();
load();
window.__files = { state: () => ({ D, unlocked, cwd, tab, started }) };   // read-only, for the tests
})();
