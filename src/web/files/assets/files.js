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
// @ts-check
(() => {
"use strict";
/** @type {(id: string) => any} the page's own elements: they are all in index.html */
const $ = id => document.getElementById(id);
/** @typedef {any} Loose */
const why = e => (e instanceof Error ? e.message : String(e));
const HF = HUB.fetch;
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
  edit: "M13 21h8M15 5l4 4M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z",
  x: "M6 6l12 12M18 6L6 18",
  lock: "M5 11h14v10H5zM8 11V8a4 4 0 0 1 8 0v3",
  up: "M12 16V4M7 9l5-5 5 5M5 20h14",
  star: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"
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
/** @type {{ items: any[], shares: any[], settings: any, usage: number, free: number | null, max: number | null }} */
let D = { items: [], shares: [], settings: { limit: 5368709120, shares: true, trashDays: 30, view: "list", sort: "name" }, usage: 0, free: null, max: null };
let byId = new Map();
const MC = new Map();   // locked text -> what it says (names do not change under an id, so each is opened once)
let unlocked = false, noPass = false, cwd = "", tab = "files", q = "";
const sel = new Set();
let started = false;
/** (1.80.0) the keyboard cursor, the row a Shift-click range starts from, and the search filters */
let lpHit = 0;
let cur = "", anchor = "", kindF = "", sizeF = "", dateF = "", everywhere = true;

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
  const todo = D.items.filter(i => !MC.has(i.m));
  for (let k = 0; k < todo.length; k += 150) {
    await Promise.all(todo.slice(k, k + 150).map(async i => { try { MC.set(i.m, await SITE.openJson(i.m)); } catch (e) { /* stays locked */ } }));
  }
}
async function ensureKey() {
  try {
    await SITE.key();
    if (!unlocked) { unlocked = true; noPass = false; await names(); render(); }
    return true;
  } catch (err) {
    const e = /** @type {any} */ (err);
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

/* (1.80.2) Keep on This Device: the file's locked pieces (the same bytes the server holds) are copied into this browser's storage, so the file opens with no
   connection. Opening one still needs your key unlocked on this device. The last list is kept too (only while a file is kept) so the page can show names offline. */
let offView = false;
const OFF = "hub-files-offline", OFFSET = new Set(), offUrl = (id, n) => new URL("api.php?action=chunk&id=" + id + "&n=" + n, location.href).href, offMark = id => new URL("api.php?kept=" + id, location.href).href, offList = () => new URL("api.php?action=list", location.href).href;
const offCache = () => ("caches" in window ? caches.open(OFF).catch(() => null) : Promise.resolve(null));
async function offScan() { OFFSET.clear(); const c = await offCache(); if (!c) return; for (const r of await c.keys()) { const m = /api\.php\?kept=([A-Za-z0-9_-]+)$/.exec(r.url); if (m) OFFSET.add(m[1]); } }
async function offKeep(i) {
  const c = await offCache(); if (!c) { toast("This browser cannot keep files offline.", true); return; }
  toast("Keeping " + nameOf(i) + " on this device…");
  try {
    for (let n = 0; n < i.c; n++) { const r = await HF("api.php?action=chunk&id=" + i.id + "&n=" + n, { cache: "no-store" }); if (!r.ok) throw new Error("Could not download (" + r.status + ")."); await c.put(offUrl(i.id, n), r); }
    await c.put(offMark(i.id), new Response("1")); OFFSET.add(i.id); toast(nameOf(i) + " is kept on this device."); offSaveList();
  } catch (e) { for (let n = 0; n < i.c; n++) await c.delete(offUrl(i.id, n)); toast((e && /** @type {any} */ (e).message) || "Could not keep it.", true); }
  finally { render(); }
}
async function offDrop(ids) { const c = await offCache(); if (!c) return; for (const id of ids) { const i = byId.get(id); for (let n = 0; n < ((i && i.c) || 1); n++) await c.delete(offUrl(id, n)); await c.delete(offMark(id)); OFFSET.delete(id); } if (!OFFSET.size) await c.delete(offList()); }
async function offSaveList() { const c = await offCache(); if (c && OFFSET.size) try { await c.put(offList(), new Response(JSON.stringify(D), { headers: { "Content-Type": "application/json" } })); } catch (e) { /* the list is a convenience */ } }
async function offGet(id, n) { const c = await offCache(); return c ? c.match(offUrl(id, n)) : undefined; }
/* A whole file, opened: {blob, crc, size}. Pieces are fetched one after the other, so a big file never has two copies in memory. */
async function readFile(item, type, onBytes) {
  const raw = await rawKeyOf(item), fk = await fileKey(raw, ["decrypt"]); raw.fill(0);
  const parts = []; let crc = 0, size = 0;
  for (let i = 0; i < item.c; i++) {
    /** @type {Response | undefined} */ let r;
    try { r = await HF("api.php?action=chunk&id=" + item.id + "&n=" + i, { cache: "no-store" }); } catch (e) { r = undefined; }
    if (!r || (!r.ok && r.status >= 500)) { const k = await offGet(item.id, i); if (k) r = k; }
    if (!r) throw new Error("No connection, and this file is not kept on this device.");
    if (!r.ok) throw new Error(r.status === 404 ? "A piece of this file is missing on the server." : "Could not download (" + r.status + ").");
    const plain = new Uint8Array(await openPiece(fk, new Uint8Array(await r.arrayBuffer()), i, item.c).catch(() => { throw new Error("This file did not open: it was changed, or your key does not fit."); }));
    crc = crcUp(crc, plain); size += plain.length; parts.push(plain); if (onBytes) onBytes(plain.length);
  }
  return { blob: new Blob(parts, { type: type || "application/octet-stream" }), crc, size };
}
/* (1.61.6) small pictures for the grid view and the details panel: opened here (like a preview), shrunk to 320 px, kept in this tab only.
   One at a time, only for pictures up to 12 MB that come into view; anything that fails keeps its icon. */
const THUMB = new Map(), THUMB_MAX = 12 * 1048576, thumbQ = [];
let thumbBusy = false;
const thumbKey = i => i.id + ":" + (dateOf(i) || "") + ":" + sizeOf(i);
const thumbable = i => i.t === "f" && unlocked && sizeOf(i) > 0 && ((kindOf(nameOf(i)) === "image" && ext(nameOf(i)) !== "svg" && sizeOf(i) <= THUMB_MAX) || (kindOf(nameOf(i)) === "video" && sizeOf(i) <= 40 * 1048576) || (ext(nameOf(i)) === "pdf" && sizeOf(i) <= 20 * 1048576));
/** (1.80.2) a PDF's picture: page 1, drawn with the same pdf.js Tools uses (its own copy here; eval off, worker is Tools' file) */
async function pdfFrame(blob) {
  /** @type {any} */ const pdfjs = await import("./vendor/pdf.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("../tools/assets/pdf.worker.min.mjs", location.href).href;
  const task = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false }), doc = await task.promise;
  try {
    const pg = await doc.getPage(1), v0 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: 320 / Math.max(v0.width, v0.height) });
    const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(vp.width)); c.height = Math.max(1, Math.round(vp.height));
    const g = /** @type {any} */ (c.getContext("2d")); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    await pg.render({ canvasContext: g, viewport: vp }).promise;
    return c;
  } finally { task.destroy(); }
}
/** (1.80.0) a video's picture: its first second, drawn from the opened file (videos up to 40 MB) */
async function videoFrame(blob) {
  const u = URL.createObjectURL(blob), v = document.createElement("video"); v.muted = true; v.preload = "auto"; v.playsInline = true;
  try {
    await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = () => rej(new Error("no frame")); v.src = u; setTimeout(() => rej(new Error("slow")), 8000); });
    await new Promise(res => { v.onseeked = res; v.currentTime = Math.min(1, (v.duration || 2) / 4); setTimeout(res, 3000); });
    return await createImageBitmap(v);
  } finally { URL.revokeObjectURL(u); }
}
async function thumbMake(i) {
  if (ext(nameOf(i)) === "pdf") {
    const c = await pdfFrame((await readFile(i, "application/pdf")).blob), b = await new Promise(res => c.toBlob(res, "image/webp", 0.8)); if (!b) throw new Error("no thumbnail");
    return URL.createObjectURL(/** @type {Blob} */ (b));
  }
  const r = await readFile(i, MIME[ext(nameOf(i))] || "image/png"), bmp = kindOf(nameOf(i)) === "video" ? await videoFrame(r.blob) : await createImageBitmap(r.blob), sc = Math.min(1, 320 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(bmp.width * sc)); c.height = Math.max(1, Math.round(bmp.height * sc));
  /** @type {any} */ (c.getContext("2d")).drawImage(bmp, 0, 0, c.width, c.height); bmp.close();
  const b = await new Promise(res => c.toBlob(res, "image/webp", 0.8)); if (!b) throw new Error("no thumbnail");
  return URL.createObjectURL(/** @type {Blob} */ (b));
}
async function thumbNext() {
  if (thumbBusy) return; const job = thumbQ.shift(); if (!job) return; thumbBusy = true;
  const k = thumbKey(job.i);
  if (!THUMB.has(k)) { let u = ""; try { u = await thumbMake(job.i); } catch (e) { /* keeps its icon */ } THUMB.set(k, u); }
  thumbBusy = false; thumbShow(job.i); thumbNext();
}
function thumbShow(i) {
  const u = THUMB.get(thumbKey(i)); if (!u) return;
  for (const box of document.querySelectorAll('[data-th="' + i.id + '"]')) if (!box.querySelector("img.th")) { box.replaceChildren(h("img", { class: "th", src: u, alt: "" })); box.classList.add("hasth"); }
}
const thumbIO = "IntersectionObserver" in window ? new IntersectionObserver((es, io) => { for (const e of es) if (e.isIntersecting) { io.unobserve(e.target); const i = byId.get(/** @type {any} */ (e.target).dataset.th); if (i && !THUMB.has(thumbKey(i))) { thumbQ.push({ i }); thumbNext(); } } }, { rootMargin: "200px" }) : null;
function thumbWatch(box, i) {
  if (!thumbable(i)) return; box.dataset.th = i.id;
  if (THUMB.has(thumbKey(i))) thumbShow(i); else if (thumbIO) thumbIO.observe(box);
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
  const cdSize = cen.reduce((a, x) => a + x.byteLength, 0), end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true); end.setUint32(12, cdSize, true); end.setUint32(16, off, true);
  return new Blob([...parts, ...cen, end.buffer], { type: "application/zip" });
}

/* ---------- dialogs ---------- */
const dlg = $("dlg"), dform = $("dform");
function openDialog(title, body, buttons, o) {   // buttons: [{text, pri, danger, left, run}]; run returns false to keep the dialog open
  return new Promise(resolve => {
    o = o || {};
    dlg.setAttribute("aria-labelledby", "dtitle");   // the window is named by its own title
    const framed = !!o.frame; dlg.classList.toggle("ix-sdlg", framed);   // Settings: the same window as every other page's (title and X, scrolling body, footer)
    const x = h("button", { type: "button", class: "ix-sx", "aria-label": "Close", onclick: () => dform.querySelector(".act button").click() });
    x.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    const err = h("p", { class: "err", id: "derr", role: "alert" });
    const parts = framed ? [h("div", { class: "ix-sh" }, h("h2", { text: title, id: "dtitle" }), x), h("div", { class: "ix-sb" }, ...[].concat(body), err)] : [h("h2", { text: title, id: "dtitle" }), ...[].concat(body), err];
    dform.replaceChildren(...parts,
      h("div", { class: framed ? "act ix-sf" : "act" }, ...buttons.map(b => h("button", { type: "button", class: "btn" + (b.pri ? " pri" : "") + (b.danger ? " danger" : "") + (b.left ? " left" : ""), text: b.text, "data-hold": b.danger ? "" : null, title: b.danger ? "Hold to delete" : null,   // (1.65.0) a danger button is held, not clicked

        onclick: async ev => { const btn = ev.currentTarget; btn.disabled = true; let keep = false; try { keep = (await b.run()) === false; } finally { btn.disabled = false; } if (!keep) { dlg.close(); resolve(b.text); } } }))));
    dlg.onclose = () => resolve(null);
    dform.onsubmit = ev => { ev.preventDefault(); const p = buttons.find(b => b.pri); if (p) dform.querySelector(".act .pri").click(); };
    if (o.rows && window.HUB && HUB.settingsRows) HUB.settingsRows(dform.querySelector(".ix-sb"), "h3");   // (1.61.6) the same cards and tiles as every Settings window
    dlg.showModal();
    const f = o.frame ? dform.querySelector(".ix-sb input:not([type=checkbox]):not([type=hidden]),.ix-sb select") : dform.querySelector("[autofocus],input,select"); if (f) { f.focus(); if (f.select) f.select(); }   // (1.64.1) a frame window: its first field, never the close X
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
  else if (tab === "recent" && !q) list = live().filter(i => i.t === "f");
  else if (tab === "starred" && !q) list = live().filter(i => (meta(i) || {}).st);
  else if (tab === "shared" && !q) { const ids = new Set(D.shares.map(x => x.id)); list = live().filter(i => ids.has(i.id)); }
  else if (q) { const t = q.toLowerCase(); list = live().filter(i => (nameOf(i).toLowerCase().includes(t) || String((meta(i) || {}).nt || "").toLowerCase().includes(t)) && (everywhere || i.p === cwd)); }
  else list = kidsOf(cwd);
  if (tab !== "trash") list = list.filter(passes);
  const s = D.settings.sort || "name";
  list.sort((a, b) => {
    if (tab === "files" && a.t !== b.t) return a.t === "d" ? -1 : 1;
    if (s === "date" || (tab === "recent" && !q)) return dateOf(b) - dateOf(a);
    if (s === "size") return bytesOf(b) - bytesOf(a);
    return nameOf(a).localeCompare(nameOf(b), undefined, { numeric: true, sensitivity: "base" });
  });
  return list;
}
const DOCS = ["pdf", "doc", "docx", "odt", "xls", "xlsx", "ods", "ppt", "pptx", "odp", "txt", "md", "rtf", "csv", "epub"];
/** (1.80.0) the filter chips and the size and date lists: a folder always stays (so you can still go in) unless a type chip is on */
function passes(i) {
  if (kindF) { if (i.t === "d") return false; const e = ext(nameOf(i)), k = kindOf(nameOf(i)); if (kindF === "doc" ? !DOCS.includes(e) : k !== kindF) return false; }
  if (i.t === "f" && sizeF && (sizeOf(i) || 0) < +sizeF) return false;
  if (i.t === "f" && dateF && dateOf(i) < Date.now() - +dateF * 86400000) return false;
  return true;
}
/** (1.80.1) how much a folder holds: every file inside it, folders within folders included (worked out once per list) */
let fbCache = new Map();
function folderBytes(id) {
  if (fbCache.has(id)) return fbCache.get(id);
  let n = 0; for (const k of D.items.filter(x => !x.up && x.p === id && (tab === "trash" ? x.del > 0 : x.del === 0))) n += k.t === "d" ? folderBytes(k.id) : (sizeOf(k) || 0);
  fbCache.set(id, n); return n;
}
const bytesOf = i => i.t === "d" ? folderBytes(i.id) : (sizeOf(i) || 0);
const icoOf = i => i.t === "d" ? "d" : kindOf(nameOf(i));
/** (1.66.0) a file's type card (filecard.js); folders keep the folder icon */
const FC = /** @type {any} */ (window).FileCard;
const icoBody = (i, size) => i.t === "d" || !FC ? svg(icoName(i)) : FC.make(nameOf(i), size);
const icoName = i => i.t === "d" ? "folder" : ({ image: "image", video: "video", audio: "audio", pdf: "pdf", text: "text", zip: "zip" }[kindOf(nameOf(i))] || "file");

function render() {
  fbCache = new Map();
  $("tn").textContent = trashed().length ? " " + trashed().length : "";
  for (const b of $("tabs").querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.dataset.t === tab));
  for (const b of $("vsw").querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.dataset.v === D.settings.view));
  $("sort").value = D.settings.sort || "name";
  /* where you are */
  const cr = $("crumbs"); cr.replaceChildren();
  if (tab === "trash") cr.append(h("button", { type: "button", "aria-current": "page", text: "Trash (kept " + D.settings.trashDays + " days, then removed for good)" }));
  else if (q) cr.append(h("button", { type: "button", "aria-current": "page", text: "Search results" }));
  else if (tab !== "files") cr.append(h("button", { type: "button", "aria-current": "page", text: { recent: "Recent: your newest files", shared: "Files with a share link", starred: "Starred" }[tab] }));
  else {
    const trail = [{ id: "", n: "My Files" }].concat(pathOf(cwd).map(i => ({ id: i.id, n: nameOf(i) })));
    trail.forEach((c, k) => { if (k) cr.append(h("i", { "aria-hidden": "true", text: "/" })); cr.append(h("button", { type: "button", "data-to": c.id, text: c.n, "aria-current": k === trail.length - 1 ? "page" : false, onclick: () => { if (k < trail.length - 1) { cwd = c.id; sel.clear(); render(); } } })); });
  }
  if (tab === "files" && !q && unlocked && live().some(i => i.t === "d")) cr.append(h("button", { type: "button", class: "cjump", id: "cjump", "aria-label": "Jump to a folder", "aria-haspopup": "menu", title: "Jump to a folder", onclick: e => { e.stopPropagation(); if (pm && pm.classList.contains("jump")) closeMenu(); else jumpMenu(e.currentTarget); } }, "▾"));
  pins(); chips(); resumeNote();
  $("empty").hidden = !(tab === "trash" && trashed().length);
  $("mk").hidden = $("up").hidden = true;   // the sidebar's New button does both
  $("newb").hidden = tab === "trash";
  /* locked / no passphrase */
  const lock = $("lock"); lock.replaceChildren();
  if (noPass) { lock.hidden = false; lock.append(h("p", {}, h("b", { text: "Files are locked with your encryption passphrase. " }), "Set one first, in Settings, Security, Encryption."), h("button", { type: "button", class: "btn pri", text: "Open Encryption Settings", onclick: () => window.HUB ? HUB.settings("security/encryption") : location.href = "../settings/#security/encryption" })); }
  else if (!unlocked && D.items.length) { lock.hidden = false; lock.append(h("p", {}, h("b", { text: "Your files are locked. " }), "Type your encryption passphrase to see their names and open them."), h("button", { type: "button", class: "btn pri", text: "Unlock", onclick: () => { ensureKey(); } })); }
  else lock.hidden = true;
  /* rows */
  const list = shown(), box = $("list"), grid = D.settings.view === "grid";
  box.className = "list" + (grid ? " grid" : ""); box.replaceChildren();
  if (list.length && !grid) box.append(h("div", { class: "lh" }, h("span", {}, h("input", { type: "checkbox", class: "ck", id: "lhck", "aria-label": "Select all", onchange: toggleAll })), h("span", { "aria-hidden": "true", text: "Name" }), h("span", { "aria-hidden": "true", text: "Who Can See It" }), h("span", { "aria-hidden": "true", text: "Size" }), h("span", { "aria-hidden": "true", text: "Modified" }), h("span")));
  /* (1.80.1) the grid has a Folders part and a Files part, each with its count; the header says how many of each are here */
  const nF = list.filter(x => x.t === "d").length, nFi = list.length - nF, sect = grid && tab === "files" && !q && nF && nFi;
  let lastT = "";
  for (const i of list) { if (sect && i.t !== lastT) { lastT = i.t; box.append(h("div", { class: "gh", text: (i.t === "d" ? "Folders · " + nF : "Files · " + nFi) })); } box.append(row(i)); }
  const cnt = $("cnt"); cnt.textContent = list.length && (tab === "files" || q) ? nF + (nF === 1 ? " folder" : " folders") + " · " + nFi + (nFi === 1 ? " file" : " files") : "";
  const none = $("none"); none.hidden = list.length > 0;
  none.classList.toggle("zone", !list.length && !q && (tab === "files" || !tab));   // (1.75.0) an empty folder is a drop zone
  if (!list.length) {
    none.replaceChildren(...(tab === "trash" ? [h("b", { text: "The Trash is empty" }), "Things you remove wait here, and are removed for good after " + D.settings.trashDays + " days."]
      : q ? [h("b", { text: "Nothing found" }), "No file or folder has that in its name."]
      : tab === "starred" ? [h("b", { text: "Nothing starred yet" }), "Pick a file and press Star to keep it here."]
      : tab === "shared" ? [h("b", { text: "No share links yet" }), "Pick a file and press Share to make a link."]
      : tab === "recent" ? [h("b", { text: "No files yet" }), "Your newest files show up here."]
      : [h("b", { text: cwd ? "This folder is empty" : "No files yet" }), "Drag files here, or press New, then Upload. Everything is locked in your browser before it is sent.", cwd ? null : h("div", { style: "margin-top:12px" }, h("button", { type: "button", class: "btn pri", text: "Upload Your First File", onclick: () => $("pick").click() }))]));
  }
  bulk(); usage(); details();
  $("sync").textContent = offView ? "Offline: showing the last list. Files kept on this device still open." : D.items.length ? "Saved on your server, locked" : "";
}

/** (1.80.0) Resume: uploads the server still holds half of (the tab was closed, the network dropped). Pick the same file again and only the missing pieces are sent. */
function resumeNote() {
  const box = $("resume"), busy = xfers.some(x => x.up && (x.state === "go" || x.state === "lock" || x.state === "wait"));
  const open = D.items.filter(i => i.up && i.t === "f" && MC.has(i.m) && Date.now() / 1000 - i.at > 90);
  box.hidden = !open.length || busy || tab === "trash"; box.replaceChildren(); if (box.hidden) return;
  box.append(h("p", {}, h("b", { text: open.length === 1 ? "An upload did not finish: " : open.length + " uploads did not finish. " }), open.length === 1 ? (MC.get(open[0].m) || {}).n : "Pick the same file again to carry on where it stopped."));
  for (const i of open.slice(0, 5)) {
    const nm = (MC.get(i.m) || {}).n || "file";
    box.append(h("div", { class: "rs" }, h("span", { text: nm + " · " + fmt((MC.get(i.m) || {}).s) }), h("button", { type: "button", class: "btn pri", "data-resume": i.id, text: "Resume", "aria-label": "Resume " + nm, onclick: () => { resumeId = i.id; $("pickres").click(); } }), h("button", { type: "button", class: "btn", text: "Discard", "aria-label": "Discard " + nm, onclick: async () => { await post("put_abort", { id: i.id }); await refresh(); } })));
  }
}
let resumeId = "";
async function resumeUpload(file) {
  const i = byId.get(resumeId), m = i && MC.get(i.m); resumeId = "";
  if (!i || !m) return;
  if (file.size !== m.s || (m.n && file.name !== m.n && !(await confirmBox("Different Name", "This file is called " + file.name + ", the unfinished one is " + m.n + ". Carry on anyway?", "Carry On")))) { if (file.size !== m.s) toast("That is not the same file: its size is different.", true); return; }
  const c = xfer("Uploading " + m.n, m.n, file.size, true); c.set("lock", "Checking what arrived");
  try {
    const raw = await rawKeyOf(i), fk = await fileKey(raw, ["encrypt"]); raw.fill(0);
    const r = await HF("api.php?action=put_status&id=" + i.id, { cache: "no-store" }), j = await r.json().catch(() => ({}));
    if (!j.ok) throw new Error(j.error || "That upload is not open any more.");
    let sent = 0; await sendPieces(file, fk, i.id, i.c, c, new Set(j.have), () => sent, v => { sent = v; }, true);
    c.done("Finished · " + fmt(file.size)); toast("Uploaded: " + m.n); await refresh();
  } catch (e) { if (c.stopped) c.set("stop", "Stopped. Press Resume to carry on."); else c.fail(why(e)); await refresh(); }
}

/** (1.80.0) Storage: what takes the room, the biggest files, empty folders and files that look the same (same name and size). Everything is worked out here from the opened names. */
const BUCKETS = [["image", "Pictures"], ["video", "Videos"], ["audio", "Audio"], ["doc", "Documents"], ["zip", "Archives"], ["other", "Other"]];
const bucketOf = i => { const n = nameOf(i), k = kindOf(n); return k === "image" || k === "video" || k === "audio" || k === "zip" ? k : (k === "pdf" || k === "text" || DOCS.includes(ext(n)) ? "doc" : "other"); };
function storageInfo() {
  const files = live().filter(i => i.t === "f"), by = {}; for (const b of BUCKETS) by[b[0]] = 0;
  for (const f of files) by[bucketOf(f)] += sizeOf(f) || 0;
  const trashBytes = D.items.filter(i => !i.up && i.t === "f" && i.del > 0).reduce((a, f) => a + (sizeOf(f) || 0), 0);
  const big = files.slice().sort((a, b) => (sizeOf(b) || 0) - (sizeOf(a) || 0)).slice(0, 8);
  const empty = live().filter(f => f.t === "d" && !D.items.some(k => !k.up && k.del === 0 && k.p === f.id));
  /* "photo (2).jpg" counts as "photo.jpg" */
  const groups = new Map(); for (const f of files) { const k = nameOf(f).replace(/ \(\d+\)(\.[A-Za-z0-9]{1,8})?$/, "$1").toLowerCase() + "|" + sizeOf(f); if (!(sizeOf(f) > 0)) continue; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(f); }
  const dups = [...groups.values()].filter(g => g.length > 1).map(g => g.slice().sort((a, b) => dateOf(a) - dateOf(b)));
  return { by, trashBytes, big, empty, dups, total: Object.values(by).reduce((a, b) => a + b, 0) };
}
async function storageBox() {
  if (!await ensureKey()) return;
  const st = storageInfo(), box = h("div", { class: "stor" });
  const go = async (act) => { dlg.close(); await act(); };
  const sec = (title, sub, ...kids) => h("section", { class: "stsec" }, h("div", { class: "sth" }, h("h3", { text: title }), sub ? h("small", { text: sub }) : null), ...kids);
  const all = st.total + st.trashBytes, pct = v => all ? Math.round(v / all * 1000) / 10 : 0;
  /* the whole picture: one bar in colours, and a legend that doubles as the list */
  const parts = BUCKETS.map(b => [b[0], b[1], st.by[b[0]]]).concat([["trash", "In the Trash", st.trashBytes]]);
  box.append(sec("What Takes the Room", fmt(all) + " in all" + (D.max ? " · " + fmt(D.usage) + " of " + fmt(D.max) + " used" : ""),
    h("div", { class: "stack", role: "img", "aria-label": "Share of the room by type" }, parts.filter(x => x[2] > 0).map(x => h("i", { class: "b-" + x[0], style: "width:" + pct(x[2]) + "%", title: x[1] + " " + fmt(x[2]) }))),
    h("ul", { class: "stleg" }, parts.map(x => h("li", { class: "stb", "data-bucket": x[0] }, h("i", { class: "dot b-" + x[0] }), h("span", { text: x[1] }), h("small", { text: fmt(x[2]) + (x[2] ? " · " + Math.round(pct(x[2])) + "%" : "") }))))));
  box.append(sec("Biggest Files", st.big.length ? "The biggest first" : "", st.big.length ? h("ul", { class: "stl", id: "stbig" }, st.big.map(f => h("li", {}, h("span", { class: "sic" }, FC ? FC.make(nameOf(f), "s") : svg("file")), h("span", { class: "n", text: nameOf(f), title: pathOf(f.p || "").map(nameOf).concat(nameOf(f)).join(" / ") }), h("small", { text: fmt(sizeOf(f)) }), h("button", { type: "button", class: "btn", text: "Show", "aria-label": "Show " + nameOf(f), onclick: () => go(async () => { tab = "files"; cwd = f.p || ""; q = ""; $("q").value = ""; sel.clear(); sel.add(f.id); cur = anchor = f.id; render(); }) }), h("button", { type: "button", class: "btn", text: "Trash", "aria-label": "Move " + nameOf(f) + " to the Trash", onclick: () => go(() => trash([f.id])) })))) : h("p", { class: "hint", text: "No files yet." })));
  box.append(sec("Empty Folders", st.empty.length ? st.empty.length + (st.empty.length === 1 ? " folder" : " folders") : "", st.empty.length ? h("div", { id: "stempty" }, h("p", { class: "hint", text: st.empty.slice(0, 6).map(nameOf).join(", ") + (st.empty.length > 6 ? ", …" : "") }), h("button", { type: "button", class: "btn", id: "stclr", text: "Move Empty Folders to the Trash", onclick: () => go(() => trash(st.empty.map(f => f.id))) })) : h("p", { class: "hint", id: "stempty", text: "None. Good." })));
  const extra = st.dups.reduce((a, g) => a + (g.length - 1) * (sizeOf(g[0]) || 0), 0);
  box.append(sec("Files That Look the Same", st.dups.length ? "Frees " + fmt(extra) : "", st.dups.length ? h("div", { id: "stdup" }, h("p", { class: "hint", text: st.dups.slice(0, 4).map(g => nameOf(g[0]) + " (" + g.length + " copies)").join(", ") + (st.dups.length > 4 ? ", …" : "") + ". Same name (numbers like (2) ignored) and same size." }), h("button", { type: "button", class: "btn", id: "stdel", text: "Move Extra Copies to the Trash", onclick: () => go(() => trash(st.dups.flatMap(g => g.slice(1).map(f => f.id)))) }), h("p", { class: "hint", text: "The oldest copy stays. The rest go to the Trash, where you can bring them back." })) : h("p", { class: "hint", id: "stdup", text: "None found." })));
  await openDialog("Storage", box, [{ text: "Done", pri: true, run: () => {} }], { frame: true });
}
/** (1.80.1) Send to Telegram. This is the one place a file leaves locked: it is opened here and sent readable through your server to your own Telegram chat, so it asks first. */
async function sendTelegram(i) {
  if (!await ensureKey()) return;
  if ((sizeOf(i) || 0) > 49 * 1048576) return toast("Telegram bots can send at most 50 MB.", true);
  const ok = await confirmBox("Send to Telegram?", "Your files are locked on your server. To send " + nameOf(i) + ", this browser opens it and sends the readable file through your server to your Telegram chat. Telegram will keep a readable copy. Send it?", "Send It");
  if (!ok) return;
  const p = progress("Sending " + nameOf(i), nameOf(i), sizeOf(i));
  try {
    const r = await readFile(i, "application/octet-stream", n => p.add(n, sizeOf(i) || 1));
    const res = await HF("api.php?action=tg_send&name=" + encodeURIComponent(nameOf(i)), { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: r.blob }), j = await res.json().catch(() => ({}));
    if (!j.ok) throw new Error(j.error || "Telegram did not take it.");
    p.done("Sent to Telegram"); toast("Sent: " + nameOf(i) + ". Check Telegram.");
  } catch (e) { p.fail(why(e)); }
}
/** (1.80.0) Open a stored file in Tools: it is opened here, handed over through the browser's own storage (the same way Share from the phone does), and never sent anywhere */
async function openInTools(i) {
  if (!await ensureKey()) return;
  if ((sizeOf(i) || 0) > 300 * 1048576) return toast("That file is too big to hand to Tools (300 MB at most).", true);
  const p = progress("Opening " + nameOf(i), nameOf(i), sizeOf(i));
  try {
    const name = nameOf(i), r = await readFile(i, MIME[ext(name)] || "application/octet-stream", n => p.add(n, sizeOf(i) || 1)), id = [...crypto.getRandomValues(new Uint8Array(10))].map(b => b.toString(16).padStart(2, "0")).join("");
    const c = await caches.open("hub-share");
    await c.put(shareKey(id, "f0"), new Response(r.blob)); await c.put(shareKey(id, "meta"), new Response(JSON.stringify({ title: "", text: "", url: "", files: [{ n: name, type: r.blob.type || "application/octet-stream" }] }), { headers: { "Content-Type": "application/json" } }));
    p.done("Handed to Tools"); location.href = "../tools/?shared=" + id;
  } catch (e) { p.fail(why(e)); }
}

/** (1.80.0) Colour labels and a short note: kept in the item's own locked details (fields lb and nt), so the server never sees them */
const LABELS = [["", "None"], ["red", "Red"], ["orange", "Orange"], ["yellow", "Yellow"], ["green", "Green"], ["blue", "Blue"], ["purple", "Purple"], ["gray", "Gray"]];
async function labelBox(i) {
  if (!await ensureKey()) return;
  const old = meta(i) || {}; let lb = old.lb || "";
  const sw = h("div", { class: "lbs", role: "group", "aria-label": "Colour" });
  const draw = () => sw.replaceChildren(...LABELS.map(l => h("button", { type: "button", class: "lbb" + (l[0] ? " lb-" + l[0] : " none"), "aria-label": l[1], "aria-pressed": String(lb === l[0]), title: l[1], onclick: () => { lb = l[0]; draw(); } })));
  draw();
  const nt = h("textarea", { id: "lnote", rows: "3", maxlength: "300", "aria-label": "Note", placeholder: "A short note, only you see it" }); nt.value = old.nt || "";
  const r = await openDialog("Label and Note", [h("p", { text: nameOf(i) }), sw, h("label", { for: "lnote", text: "Note" }), nt], [cancelBtn, { text: "Save", pri: true, run: () => {} }]);
  if (r !== "Save") return;
  const next = Object.assign({}, old); if (lb) next.lb = lb; else delete next.lb; const note = nt.value.trim(); if (note) next.nt = note; else delete next.nt;
  await run(post("rename", { id: i.id, m: await SITE.sealJson(next) }), "Saved: " + nameOf(i));
}

/** (1.80.0) Pin a folder to the sidebar: it is kept in the folder's own locked details, so it follows you to every device */
async function pin(i) {
  if (!await ensureKey()) return;
  const old = meta(i) || {}, m = await SITE.sealJson(Object.assign({}, old, { pin: old.pin ? 0 : 1 }));
  await run(post("rename", { id: i.id, m }), (old.pin ? "Unpinned: " : "Pinned: ") + nameOf(i));
}
function pins() {
  const box = $("pins"), fs = live().filter(i => i.t === "d" && (meta(i) || {}).pin).sort((a, b) => nameOf(a).localeCompare(nameOf(b), undefined, { numeric: true }));
  box.hidden = !fs.length; box.replaceChildren();
  if (!fs.length) return;
  box.append(h("b", { text: "Pinned" }), ...fs.map(f => h("button", { type: "button", "data-pin": f.id, "aria-pressed": String(tab === "files" && cwd === f.id), title: pathOf(f.id).map(nameOf).join(" / "), onclick: () => { tab = "files"; cwd = f.id; q = ""; $("q").value = ""; sel.clear(); render(); } }, svg("folder", "i"), h("span", { text: nameOf(f) }))));
}
/** (1.80.0) the filter chips under the path bar */
function chips() {
  const box = $("chips"); box.replaceChildren();
  const on = tab === "files" || tab === "recent" || tab === "starred" || tab === "shared"; box.hidden = !on || !D.items.length || !unlocked; if (box.hidden) return;
  const chip = (v, t) => h("button", { type: "button", class: "chip", "data-k": v, "aria-pressed": String(kindF === v), text: t, onclick: () => { kindF = v; render(); } });
  const list = (id, label, cur1, opts, set) => { const s1 = h("select", { class: "sel chs", id, "aria-label": label, onchange: e => { set(e.target.value); render(); } }, opts.map(o => h("option", { value: o[0], text: o[1], selected: o[0] === cur1 }))); return s1; };
  box.append(chip("", "All"), chip("image", "Pictures"), chip("doc", "Documents"), chip("video", "Videos"), chip("audio", "Audio"),
    list("fsize", "Size", sizeF, [["", "Any Size"], [String(1 << 20), "Over 1 MB"], [String(10 << 20), "Over 10 MB"], [String(100 << 20), "Over 100 MB"]], v => { sizeF = v; }),
    list("fdate", "Date", dateF, [["", "Any Time"], ["1", "Today"], ["7", "Last 7 Days"], ["30", "Last 30 Days"], ["365", "Last Year"]], v => { dateF = v; }));
  if (q && tab === "files") box.append(h("button", { type: "button", class: "chip", id: "fscope", "aria-pressed": String(!everywhere), text: everywhere ? "Searching Everywhere" : "Searching This Folder", onclick: () => { everywhere = !everywhere; render(); } }));
}
/** (1.80.0) the arrow next to the path: jump to any folder */
function jumpMenu(anchor) {
  closeMenu();
  const fs = folderPicker([], cwd);
  pm = h("div", { class: "pm jump", role: "menu" }, fs.map(f => h("button", { type: "button", role: "menuitem", style: "padding-left:" + (11 + f.d * 14) + "px", "aria-current": f.id === cwd ? "true" : false, onclick: () => { closeMenu(); cwd = f.id; q = ""; $("q").value = ""; sel.clear(); render(); } }, svg("folder"), f.n)));
  document.body.append(pm);
  const r = anchor.getBoundingClientRect(); pm.style.left = Math.max(8, Math.min(innerWidth - pm.offsetWidth - 8, r.left)) + "px"; pm.style.top = (r.bottom + 4) + "px"; pm.style.maxHeight = Math.max(160, innerHeight - r.bottom - 20) + "px";
  pm.querySelector("button").focus();
  pm.addEventListener("keydown", e => { const b = [...pm.querySelectorAll("button")], k = b.indexOf(document.activeElement); if (e.key === "ArrowDown") { b[(k + 1) % b.length].focus(); e.preventDefault(); } if (e.key === "ArrowUp") { b[(k - 1 + b.length) % b.length].focus(); e.preventDefault(); } if (e.key === "Escape") { closeMenu(); anchor.focus(); } });
}

const shareFlags = i => { const l = D.shares.filter(x => x.id === i.id); return (l.some(x => x.pw) ? " · Password" : "") + (l.some(x => x.lim) ? " · " + l.filter(x => x.lim).map(x => x.dl + "/" + x.lim).join(", ") + " downloads" : ""); };
/** (1.80.1) a folder with a colour label is painted in that colour */
const lbCls = i => i.t === "d" && (meta(i) || {}).lb ? " lb-" + (meta(i) || {}).lb : "";
function row(i) {
  const isD = i.t === "d", name = nameOf(i), sz = sizeOf(i), at = dateOf(i);
  const where = q && i.p ? pathOf(i.p).map(nameOf).join(" / ") : "";
  const left = tab === "trash" ? Math.max(0, Math.ceil((i.del + D.settings.trashDays * 86400 - Date.now() / 1000) / 86400)) : 0;
  const sub = tab === "trash" ? "Removed for good in " + left + (left === 1 ? " day" : " days") : (isD ? "Folder · " + fmt(bytesOf(i)) : fmt(sz)) + " · " + when(at) + (where ? " · in " + where : "");
  const ck = h("input", { type: "checkbox", class: "ck", "aria-label": "Pick " + name, checked: sel.has(i.id), onchange: e => { anchor = cur = i.id; e.target.checked ? sel.add(i.id) : sel.delete(i.id); row.sync(); } });
  const open = h("button", { type: "button", class: "nm", title: name, onclick: ev => { cur = i.id; if (ev.shiftKey && anchor) return range(i.id); if (ev.ctrlKey || ev.metaKey) { anchor = i.id; sel.has(i.id) ? sel.delete(i.id) : sel.add(i.id); return row.sync(); } anchor = i.id; if (i.t === "d" || tab === "trash") return openItem(i); pick1(i.id); } },
    h("span", { class: "ico " + icoOf(i) + lbCls(i) + (i.t === "d" ? "" : " fc") }, icoBody(i, D.settings.view === "grid" ? "m" : "s")), h("span", { class: "t" }, name, (meta(i) || {}).st ? h("span", { class: "stm", "aria-label": "Starred", text: "★" }) : null, OFFSET.has(i.id) ? h("span", { class: "stm offm", title: "Kept on this device", "aria-label": "Kept on this device", text: "⬇" }) : null, (meta(i) || {}).lb && i.t !== "d" ? h("span", { class: "lbd lb-" + (meta(i) || {}).lb, role: "img", "aria-label": "Label: " + (meta(i) || {}).lb }) : null, (meta(i) || {}).nt ? h("span", { class: "ntm", title: (meta(i) || {}).nt, role: "img", "aria-label": "Has a note", text: "✎" }) : null, where && tab === "files" ? h("small", { text: "in " + where }) : null));
  const more = h("button", { type: "button", class: "ib more", "aria-label": "More for " + name, "aria-haspopup": "menu", onclick: e => menu(e.currentTarget, i) }, svg("more"));
  const shared = D.shares.some(x => x.id === i.id);
  const quick = tab === "trash" ? null : h("span", { class: "qa" },
    i.t === "f" && D.settings.shares ? h("button", { type: "button", class: "qb", "aria-label": "Share " + name, onclick: e => { e.stopPropagation(); shareBox(i); } }, "Share") : null,
    h("button", { type: "button", class: "ib qb", "aria-label": "Download " + name, title: "Download", onclick: e => { e.stopPropagation(); download([i.id]); } }, svg("down")),
    i.t === "f" ? h("button", { type: "button", class: "ib qb", "aria-label": ((meta(i) || {}).st ? "Unstar " : "Star ") + name, title: "Star", "aria-pressed": String(!!(meta(i) || {}).st), onclick: e => { e.stopPropagation(); star(i); } }, svg("star")) : null);
  const el = h("div", { class: "row" + (sel.has(i.id) ? " sel" : "") + (cur === i.id ? " cur" : ""), "data-id": i.id, draggable: tab === "trash" ? null : "true", ondblclick: () => { if (i.t === "f") openItem(i); }, oncontextmenu: e => { e.preventDefault(); e.stopPropagation(); cur = i.id; if (!sel.has(i.id)) { sel.clear(); sel.add(i.id); row.sync(); } menu(more, i, { x: e.clientX, y: e.clientY }); } },
    ck, open, h("span", { class: "cell vis" + (shared ? " on" : ""), text: tab === "trash" ? "" : shared ? "Anyone with the link" + shareFlags(i) : "Only you" }), h("span", { class: "cell sz num", text: fmt(isD ? bytesOf(i) : sz) }), h("span", { class: "cell dt", text: tab === "trash" ? left + (left === 1 ? " day left" : " days left") : when(at) }), quick, more, h("span", { class: "cell meta", text: sub }));
  if (D.settings.view === "grid") { const ic = open.querySelector(".ico"); if (ic) queueMicrotask(() => thumbWatch(ic, i)); }
  return el;
}
row.sync = () => { for (const r of $("list").querySelectorAll(".row")) { r.classList.toggle("sel", sel.has(r.dataset.id)); r.classList.toggle("cur", r.dataset.id === cur); const c = r.querySelector(".ck"); if (c) c.checked = sel.has(r.dataset.id); } bulk(); details(); };
/** (1.80.0) Shift-click: everything from the row you clicked last to this one */
function range(id) {
  const ids = shown().map(x => x.id), a = ids.indexOf(anchor), b = ids.indexOf(id); if (a < 0 || b < 0) return;
  sel.clear(); for (const x of ids.slice(Math.min(a, b), Math.max(a, b) + 1)) sel.add(x); row.sync();
}
/* one click on a file picks it and shows it in the panel on the right: it never downloads */
function pick1(id) { if (sel.size === 1 && sel.has(id)) sel.clear(); else { sel.clear(); sel.add(id); } row.sync(); }

function usage() {
  const u = $("usage"), max = D.max;
  u.replaceChildren();
  const used = D.usage;
  u.append(h("span", { class: "num", text: fmt(used) + (max ? " of " + fmt(max) : "") + " used" }));
  if (max) { const p = Math.min(100, used / max * 100); u.append(h("span", { class: "bar", role: "img", "aria-label": Math.round(p) + " percent used" }, h("i", { class: p > 90 ? "hot" : "", style: "width:" + p + "%" }))); }
}

/* ---------- the details panel (right side) ---------- */
const KIND = { d: "Folder", image: "Picture", video: "Video", audio: "Sound", pdf: "PDF document", text: "Text", zip: "Zip archive" };
function details() {
  const det = $("det"), fa = $("fa"), ids = [...sel];
  selbtn();
  const i = ids.length === 1 ? byId.get(ids[0]) : null;
  /* (1.77.2) open by default: nothing (or several) picked shows a summary of what is here, with Select All. Phones keep it closed until you pick one. */
  if (!i) {
    const wide = matchMedia("(min-width:1101px)").matches, vis = shown();
    if (tab === "trash" || !wide || !vis.length) { det.hidden = true; fa.classList.remove("hasdet"); selbtn(); return; }
    const many = ids.length > 1, files = vis.filter(x => x.t === "f"), total = files.reduce((n, x) => n + (sizeOf(x) || 0), 0);
    det.hidden = false; fa.classList.add("hasdet");
    det.replaceChildren(h("div", { class: "dh" }, h("b", { text: many ? ids.length + " Picked" : "Details" })),
      h("div", { class: "pv sum" }, svg(many ? "file" : "folder")),
      h("h3", { text: many ? ids.length + " items picked" : vis.length + (vis.length === 1 ? " item here" : " items here") }),
      h("dl", {}, h("dt", { text: "Folders" }), h("dd", { text: String(vis.length - files.length) }), h("dt", { text: "Files" }), h("dd", { text: String(files.length) }), h("dt", { text: "Size" }), h("dd", { text: fmt(total) })),
      h("div", { class: "acts" }, h("button", { type: "button", class: "btn pri", id: "selall", onclick: toggleAll }, ids.length === vis.length ? "Clear Selection" : "Select All")),
      h("p", { class: "hint", text: many ? "Use the bar above the list to download, move or remove them." : "Pick a file or folder to see its details here." }));
    selbtn(); return;
  }
  if (tab === "trash") { det.hidden = true; fa.classList.remove("hasdet"); return; }
  det.hidden = false; fa.classList.add("hasdet");
  const isD = i.t === "d", name = nameOf(i), m = meta(i) || {};
  const where = pathOf(i.p || "").map(nameOf).join(" / ");
  const acts = h("div", { class: "acts" },
    isD ? h("button", { type: "button", class: "btn pri", onclick: () => openItem(i) }, svg("folder", "i"), "Open") : (previewable(i) ? h("button", { type: "button", class: "btn pri", onclick: () => openItem(i) }, svg("file", "i"), "Preview") : null),
    h("button", { type: "button", class: "btn", onclick: () => download([i.id]) }, svg("down", "i"), "Download"),
    h("button", { type: "button", class: "btn star", "aria-pressed": String(!!m.st), onclick: () => star(i) }, m.st ? "★ Starred" : "☆ Star"));
  const shares = D.shares.filter(x => x.id === i.id).length;
  det.replaceChildren(
    h("div", { class: "dh" }, h("b", { text: "Details" }), h("button", { type: "button", class: "ib", "aria-label": "Close details", onclick: () => { sel.clear(); row.sync(); } }, svg("x"))),
    (() => { const pv = h("div", { class: "pv " + icoOf(i) + lbCls(i) + (i.t === "d" ? "" : " fc") }, icoBody(i, "l")); queueMicrotask(() => thumbWatch(pv, i)); return pv; })(),
    h("h3", { text: name }), acts,
    m.nt ? h("p", { class: "dnote", text: m.nt }) : null,
    h("div", { class: "locknote" }, svg("lock"), "Locked in your browser. The server can't read it."),
    h("dl", {}, h("dt", { text: "Type" }), h("dd", { text: isD ? "Folder" : (KIND[kindOf(name)] || (/\.([A-Za-z0-9]{1,8})$/.exec(name) || [, "File"])[1].toUpperCase() + " file") }),
      h("dt", { text: "Size" }), h("dd", { text: fmt(bytesOf(i)) }),
      h("dt", { text: "Modified" }), h("dd", { text: when(dateOf(i)) }), h("dt", { text: "Location" }), h("dd", { text: "My Files" + (where ? " / " + where : "") })),
    !isD && D.settings.shares ? h("div", { class: "shb" }, h("b", { text: "Share link" }), h("small", { text: shares ? shares + " active. Anyone with a link opens this file." : "None yet. Anyone with a link can open this file." }), h("button", { type: "button", class: "btn", onclick: () => shareBox(i) }, shares ? "Manage Links" : "Make a Link")) : null);
}
function toggleAll() { const vis = shown(); if (sel.size === vis.length) sel.clear(); else for (const x of vis) sel.add(x.id); row.sync(); }
/** The Select All button above the list (small screens use it too). */
function selbtn() {
  const vis = shown(), all = !!vis.length && sel.size === vis.length, ck = /** @type {HTMLInputElement | null} */ ($("lhck"));
  if (ck) { ck.checked = all; ck.indeterminate = !all && sel.size > 0; }   // (1.79.1) Select All is the box at the top of the list
  const b = $("sela"); if (!b) return; b.hidden = !vis.length || (D.settings.view !== "grid" && !matchMedia("(max-width:760px)").matches); b.textContent = sel.size && sel.size === vis.length ? "Clear Selection" : "Select All"; }
async function star(i) {
  if (!await ensureKey()) return;
  const old = meta(i) || {}, m = await SITE.sealJson(Object.assign({}, old, { st: old.st ? 0 : 1 }));
  await run(post("rename", { id: i.id, m }), (old.st ? "Star removed: " : "Starred: ") + nameOf(i));
}
function newMenu() {
  closeMenu();
  /** @type {any[][]} */
  const acts = [["up", "Upload Files", () => $("pick").click()], ["folder", "Upload Folder", () => $("pickdir").click()], ["folder", "New Folder", mkdir]];
  if (matchMedia("(pointer:coarse)").matches) acts.splice(2, 0, ["image", "Take Photo or Video", () => $("pickcam").click()]);
  pm = h("div", { class: "pm newm", role: "menu" }, acts.map(a => h("button", { type: "button", role: "menuitem", onclick: () => { closeMenu(); a[2](); } }, svg(a[0]), a[1])));
  document.body.append(pm);
  const r = $("newb").getBoundingClientRect(); pm.style.left = r.left + "px"; pm.style.top = (r.bottom + 4) + "px"; pm.querySelector("button").focus();
  pm.addEventListener("keydown", e => { if (e.key === "Escape") { closeMenu(); $("newb").focus(); } });
}

/* ---------- the little menu ---------- */
let pm = null;
function closeMenu() { if (pm) { pm.remove(); pm = null; } }
function menu(anchor, i, at) {
  closeMenu();
  /** @type {any[][]} */
  const acts = [];
  if (tab === "trash") acts.push(["back", "Restore", () => restore([i.id])], ["trash", "Delete Forever", () => purge([i.id])]);
  else {
    acts.push([i.t === "d" ? "folder" : "file", i.t === "d" ? "Open" : (previewable(i) ? "Preview" : "Open"), () => openItem(i)]);
    acts.push(["down", i.t === "d" ? "Download as Zip" : "Download", () => download([i.id])]);
    if (i.t === "f" && D.settings.shares) acts.push(["share", "Share Link", () => shareBox(i)]);
    const mine = D.shares.filter(x => x.id === i.id);
    if (i.t === "f" && mine.length) acts.push(["link", "Copy Share Link", async () => { try { await navigator.clipboard.writeText(await linkOf(i, mine[mine.length - 1].token)); toast("Link copied."); } catch (e) { toast("Could not copy. Open Share Link instead.", true); } }]);
    if (i.t === "f" && "caches" in window) acts.push(["down", OFFSET.has(i.id) ? "Remove from This Device" : "Keep on This Device", async () => { if (OFFSET.has(i.id)) { await offDrop([i.id]); toast("Removed from this device."); render(); } else offKeep(i); }]);
    if (i.t === "f") acts.push(["file", "Open in Tools", () => openInTools(i)], ["share", "Send to Telegram", () => sendTelegram(i)]);
    if (i.t === "f") acts.push(["link", "Copy Link to This File", async () => { try { await navigator.clipboard.writeText(new URL("./#file=" + i.id, location.href).href); toast("Link copied. It opens this file after you log in."); } catch (e) { toast("Could not copy the link.", true); } }]);
    acts.push(["edit", "Label and Note", () => labelBox(i)]);
    if (i.t === "f") acts.push(["star", (meta(i) || {}).st ? "Remove Star" : "Star", () => star(i)]);
    if (i.t === "d") acts.push(["folder", (meta(i) || {}).pin ? "Unpin from Sidebar" : "Pin to Sidebar", () => pin(i)]);
    acts.push(["edit", "Rename", () => rename(i)], ["move", "Move", () => moveBox([i.id])], ["trash", "Move to Trash", () => trash([i.id])]);
  }
  pm = h("div", { class: "pm", role: "menu" }, acts.map(a => h("button", { type: "button", role: "menuitem", onclick: () => { closeMenu(); a[2](); } }, svg(a[0]), a[1])));
  document.body.append(pm);
  const r = anchor.getBoundingClientRect(), w = pm.offsetWidth, hh = pm.offsetHeight;
  if (at) { pm.style.left = Math.max(8, Math.min(innerWidth - w - 8, at.x)) + "px"; pm.style.top = Math.max(8, Math.min(innerHeight - hh - 8, at.y)) + "px"; }
  else {
    pm.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + "px";
    pm.style.top = (r.bottom + hh + 12 > innerHeight && r.top > hh ? r.top - hh - 4 : r.bottom + 4) + "px";
  }
  pm.querySelector("button").focus();
  pm.addEventListener("keydown", e => { const b = [...pm.querySelectorAll("button")], k = b.indexOf(document.activeElement); if (e.key === "ArrowDown") { b[(k + 1) % b.length].focus(); e.preventDefault(); } if (e.key === "ArrowUp") { b[(k + b.length - 1) % b.length].focus(); e.preventDefault(); } if (e.key === "Escape") { closeMenu(); anchor.focus(); } });
}
document.addEventListener("pointerdown", e => { const t = /** @type {Element} */ (e.target); if (pm && !pm.contains(t) && !t.closest(".more") && !t.closest("#newb") && !t.closest("#cjump")) closeMenu(); });

/* ---------- picking several ---------- */
function bulk() {
  const b = $("bulk"); b.replaceChildren();
  const ids = [...sel]; b.hidden = ids.length < 2 && !(ids.length === 1 && tab === "trash"); if (b.hidden) return;
  const btn = (t, f, o) => h("button", { type: "button", class: "btn" + (o && o.danger ? " danger" : ""), text: t, onclick: f });
  const total = ids.reduce((a, id) => a + bytesOf(byId.get(id) || { t: "f" }), 0);
  b.append(h("b", { text: ids.length + (ids.length === 1 ? " item selected" : " items selected") }), total ? h("span", { class: "bsz", text: fmt(total) }) : null);
  if (tab === "trash") b.append(btn("Restore", () => restore(ids)), btn("Delete Forever", () => purge(ids), { danger: true }));
  else {
    b.append(btn("Download", () => download(ids)), btn("Move", () => moveBox(ids)));
    const pics = ids.map(id => byId.get(id)).filter(x => x && x.t === "f" && kindOf(nameOf(x)) === "image");
    if (D.settings.shares && ids.length > 1 && pics.length === ids.length && ids.length <= 20) b.append(btn("Share as Gallery", () => galleryBox(pics)));
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
  if (previewable(i)) preview(i); else toast("No preview for this kind of file. Use Download.");
}
async function mkdir() {
  if (!await ensureKey()) return;
  const n = await nameBox("New Folder", "Folder Name", "", "Create");
  if (n == null) return;
  const fname = uniqueName(cwd, n, "d"), m = await SITE.sealJson({ n: fname });
  await run(post("mkdir", { p: cwd, m }), "Folder made: " + fname);
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
  const m = await SITE.sealJson(Object.assign({}, old, { n })), was = nameOf(i), id = i.id;
  if (!await run(post("rename", { id, m }), "")) return;
  const msg = "Renamed: " + was + " to " + n;
  if (window.HUB) HUB.undo(msg, async () => { await run(post("rename", { id, m: await SITE.sealJson(old) }), "Name put back: " + was); }); else toast(msg);
}
function folderPicker(skip, current) {
  const skipSet = new Set(); for (const id of skip) { skipSet.add(id); (function walk(x) { for (const k of kidsOf(x)) if (k.t === "d") { skipSet.add(k.id); walk(k.id); } })(id); }
  const out = [{ id: "", n: "All Files", d: 0 }];
  (function walk(parent, d) { for (const f of kidsOf(parent).filter(x => x.t === "d").sort((a, b) => nameOf(a).localeCompare(nameOf(b), undefined, { numeric: true }))) { if (skipSet.has(f.id)) continue; out.push({ id: f.id, n: nameOf(f), d }); walk(f.id, d + 1); } })("", 1);
  return out;
}
async function moveBox(ids) {
  if (!await ensureKey()) return;
  let to = cwd; const what = ids.length === 1 ? nameOf(byId.get(ids[0])) : ids.length + " items";
  const box = h("div", { class: "pick", role: "group", "aria-label": "Folders" });
  const draw = () => { box.replaceChildren(...folderPicker(ids).map(f => h("button", { type: "button", "aria-pressed": String(f.id === to), style: "padding-left:" + (12 + f.d * 18) + "px", onclick: () => { to = f.id; draw(); } }, svg("folder", "i"), f.n))); };
  draw();
  await openDialog("Move " + (ids.length === 1 ? nameOf(byId.get(ids[0])) : ids.length + " Items"), [h("p", { text: "Pick the folder to move it into." }), box], [cancelBtn, { text: "Move Here", pri: true, run: async () => {
    const back = ids.map(id => [id, (byId.get(id) || {}).p || ""]);
    const j = await post("move", { ids, p: to }); if (!j.ok) { derr(j.error); return false; }
    sel.clear(); await refresh(); movedMsg("Moved: " + what + (to === cwd ? "" : " to " + ((folderPicker(ids).filter(f => f.id === to)[0] || {}).n || "the folder")), back);
  } }]);
}
/* (1.79.3) Drag files and folders onto a folder, a folder name in the path above the list, or the Trash. A picked row drags everything picked. */
async function moveTo(ids, to) {
  const what = ids.length === 1 ? nameOf(byId.get(ids[0])) : ids.length + " items", dest = to ? nameOf(byId.get(to)) : "My Files";
  const back = ids.map(id => [id, (byId.get(id) || {}).p || ""]);
  const j = await post("move", { ids, p: to });
  if (!j.ok) { toast(j.error || "That did not work.", true); return; }
  sel.clear(); await refresh(); movedMsg("Moved: " + what + " to " + dest, back);
}
/** (1.80.0) Move can be undone: each item goes back to the folder it came from */
function movedMsg(msg, back) {
  if (!window.HUB) return toast(msg);
  HUB.undo(msg, async () => {
    const by = new Map(); for (const [id, p] of back) { if (!by.has(p)) by.set(p, []); /** @type {any[]} */ (by.get(p)).push(id); }
    for (const [p, ids] of by) await post("move", { ids, p });
    await refresh(); toast("Moved back");
  });
}
function dragSetup() {
  let ids = null, over = null;
  /** @param {Event} e */
  const target = e => {
    if (!ids) return null;
    const at = /** @type {Element | null} */ (e.target);
    const r = /** @type {HTMLElement | null} */ (at && at.closest ? at.closest(".row[data-id]") : null);
    if (r) { const f = byId.get(r.dataset.id); return f && f.t === "d" && !ids.includes(f.id) ? { el: r, to: f.id } : null; }
    const c = /** @type {HTMLElement | null} */ (at && at.closest ? at.closest("#crumbs button[data-to]") : null);
    if (c && c.getAttribute("aria-current") !== "page") return { el: c, to: c.dataset.to };
    const t = at && at.closest ? at.closest('#tabs button[data-t="trash"]') : null;
    return t ? { el: t, to: null } : null;
  };
  const clear = () => { if (over) over.classList.remove("dropto"); over = null; };
  document.addEventListener("dragstart", e => {
    const at = /** @type {Element | null} */ (e.target), r = /** @type {HTMLElement | null} */ (at && at.closest ? at.closest(".row[data-id]") : null), dt = e.dataTransfer;
    if (!r || !dt || tab === "trash" || !byId.has(r.dataset.id)) return;
    ids = sel.has(r.dataset.id) ? [...sel] : [r.dataset.id];
    dt.effectAllowed = "move"; dt.setData("application/x-hub-files", JSON.stringify(ids));
    for (const x of document.querySelectorAll(".row[data-id]")) x.classList.toggle("dragging", ids.includes(/** @type {HTMLElement} */ (x).dataset.id));
  });
  document.addEventListener("dragend", () => { ids = null; clear(); for (const x of document.querySelectorAll(".row.dragging")) x.classList.remove("dragging"); });
  document.addEventListener("dragover", e => { const t = target(e); if (!t) { clear(); return; } e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = "move"; if (over !== t.el) { clear(); over = t.el; over.classList.add("dropto"); } });
  document.addEventListener("drop", e => {
    const t = target(e); if (!t) return; e.preventDefault(); const go = ids; ids = null; clear();
    for (const x of document.querySelectorAll(".row.dragging")) x.classList.remove("dragging");
    if (t.to == null) trash(go); else moveTo(go, t.to);
  });
}
async function trash(ids) {
  sel.clear();
  const what = ids.length === 1 ? nameOf(byId.get(ids[0])) : ids.length + " items";
  if (!await run(post("trash", { ids }), "")) return;
  const msg = "Moved to the Trash: " + what;
  if (window.HUB) HUB.undo(msg, () => restore(ids)); else toast(msg);
}
async function restore(ids) { sel.clear(); await run(post("restore", { ids }), "Restored."); }
async function purge(ids) {
  offDrop(ids);
  if (!await confirmBox("Delete Forever?", ids.length === 1 ? "This can't be undone." : "These " + ids.length + " items can't be brought back.", "Delete Forever", true)) return;
  sel.clear(); await run(post("purge", { ids }), "Deleted.");
}

/* ---------- download ---------- */
async function download(ids) {
  if (!await ensureKey()) return;
  const items = ids.map(id => byId.get(id)).filter(Boolean);
  try {
    if (items.length === 1 && items[0].t === "f") {
      const i = items[0], p = progress("Downloading " + nameOf(i), nameOf(i), sizeOf(i));
      try { const r = await readFile(i, "application/octet-stream", n => p.add(n, sizeOf(i))); save(r.blob, nameOf(i)); p.done("Downloaded"); } catch (e) { p.fail(why(e)); }
      return;
    }
    /* folders and several files: one zip, made here */
    const files = [];
    const collect = (i, base) => { if (i.t === "f") files.push({ i, path: base + nameOf(i) }); else for (const k of kidsOf(i.id)) collect(k, base + nameOf(i) + "/"); };
    for (const i of items) collect(i, "");
    const total = files.reduce((a, f) => a + (sizeOf(f.i) || 0), 0);
    if (!files.length) return toast("There is nothing in there to download.");
    if (total > 3.5 * 1024 * 1024 * 1024) return toast("That is too much for one zip (" + fmt(total) + "). Download the folders inside it one at a time.", true);
    const p = progress("Making a zip of " + files.length + (files.length === 1 ? " file" : " files"), "", total);
    try {
      const out = []; let done = 0;
      for (const f of files) { const r = await readFile(f.i, "application/octet-stream", n => { done += n; p.add(done, total, true); }); out.push({ path: f.path, blob: r.blob, crc: r.crc, size: r.size, mt: dateOf(f.i) }); }
      const nm = items.length === 1 ? nameOf(items[0]) : "Files";
      save(zipOf(out), nm + ".zip"); p.done("Zip ready");
    } catch (e) { p.fail(why(e)); }
  } catch (e) { toast(why(e) || "Could not download.", true); }
}

/* ---------- preview ---------- */
const previewable = i => i.t === "f" && ["image", "video", "audio", "pdf", "text"].includes(kindOf(nameOf(i))) && (sizeOf(i) || 0) <= PREVIEW_MAX;
const pdlg = $("pdlg"), pbox = $("pbox");
/** (1.80.0) a small, safe Markdown: headings, bold, italic, code, links (http and https only), lists, quotes, rules. Everything is made with textContent, never HTML. */
function mdInline(text) {
  const out = document.createDocumentFragment(), re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(\[[^\]]+\]\((https?:\/\/[^)\s]+)\))/g;
  let at = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > at) out.append(text.slice(at, m.index));
    if (m[1]) out.append(h("code", { text: m[1].slice(1, -1) }));
    else if (m[2]) out.append(h("b", { text: m[2].slice(2, -2) }));
    else if (m[3]) out.append(h("i", { text: m[3].slice(1, -1) }));
    else out.append(h("a", { href: m[5], target: "_blank", rel: "noopener noreferrer", text: m[4].slice(1, m[4].indexOf("]")) }));
    at = m.index + m[0].length;
  }
  if (at < text.length) out.append(text.slice(at));
  return out;
}
function markdown(src) {
  const root = h("div", { class: "md" }), lines = src.replace(/\r/g, "").split("\n");
  let k = 0, para = [], list = null;
  const flush = () => { if (para.length) { root.append(h("p", {}, mdInline(para.join(" ")))); para = []; } list = null; };
  while (k < lines.length) {
    const l = lines[k++]; let m;
    if (/^```/.test(l)) { flush(); const code = []; while (k < lines.length && !/^```/.test(lines[k])) code.push(lines[k++]); k++; root.append(h("pre", { class: "mdc", text: code.join("\n") })); }
    else if ((m = /^(#{1,6})\s+(.*)$/.exec(l))) { flush(); root.append(h("h" + m[1].length, {}, mdInline(m[2]))); }
    else if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(l)) { flush(); root.append(h("hr")); }
    else if ((m = /^\s*(?:[-*+]|\d+\.)\s+(.*)$/.exec(l))) { if (!list) { para.length && flush(); list = h(/^\s*\d/.test(l) ? "ol" : "ul"); root.append(list); } list.append(h("li", {}, mdInline(m[1]))); }
    else if ((m = /^>\s?(.*)$/.exec(l))) { flush(); root.append(h("blockquote", {}, mdInline(m[1]))); }
    else if (!l.trim()) flush();
    else { list = null; para.push(l.trim()); }
  }
  flush(); return root;
}
let pvList = /** @type {any[]} */ ([]), pvAt = 0, pvUrl = "", pvGen = 0, pvDir = 0;
function preview(i) {
  if (!pdlg.open) { pvList = shown().filter(previewable); pdlg.showModal(); pdlg.onclose = () => { pvGen++; if (pvUrl) URL.revokeObjectURL(pvUrl); pvUrl = ""; pbox.replaceChildren(); }; }
  pvAt = Math.max(0, pvList.findIndex(x => x.id === i.id)); if (!pvList.length) pvList = [i];
  return pvShow(i);
}
function pvStep(d) { if (pvList.length < 2) return; pvDir = d; pvAt = (pvAt + d + pvList.length) % pvList.length; pvShow(pvList[pvAt]); }
async function pvShow(i) {
  const gen = ++pvGen; if (pvUrl) { URL.revokeObjectURL(pvUrl); pvUrl = ""; }
  const name = nameOf(i), k = kindOf(name), mime = MIME[ext(name)] || (k === "text" ? "text/plain" : "application/octet-stream");
  const tb = (t, f, label, id) => h("button", { type: "button", class: "btn pb", text: t, id, "aria-label": label || t, onclick: f });
  const many = pvList.length > 1, img = k === "image";
  const zoom = /** @type {any} */ ({ z: 1 });
  const setZoom = z => { zoom.z = Math.max(.25, Math.min(6, z)); const im = pbox.querySelector("img"); if (im) { im.style.maxWidth = zoom.z === 1 ? "100%" : "none"; im.style.maxHeight = zoom.z === 1 ? "" : "none"; im.style.width = zoom.z === 1 ? "" : Math.round(zoom.z * (zoom.w || im.naturalWidth || 400)) + "px"; } const zl = $("pzl"); if (zl) zl.textContent = Math.round(zoom.z * 100) + "%"; };
  pbox.replaceChildren(h("div", { class: "ph" }, h("b", { text: name, title: name }), many ? h("span", { class: "pcount", id: "pcount", text: (pvAt + 1) + " of " + pvList.length }) : null,
    many ? tb("‹", () => pvStep(-1), "Previous", "pprev") : null, many ? tb("›", () => pvStep(1), "Next", "pnext") : null,
    img ? tb("−", () => setZoom(zoom.z / 1.25), "Zoom Out", "pzo") : null, img ? h("span", { class: "pcount", id: "pzl", text: "100%" }) : null, img ? tb("+", () => setZoom(zoom.z * 1.25), "Zoom In", "pzi") : null, img ? tb("Fit", () => setZoom(1), "Fit to Window", "pfit") : null,
    tb("Full Screen", () => { const pv = $("pv"); if (document.fullscreenElement) document.exitFullscreen(); else if (pv && pv.requestFullscreen) pv.requestFullscreen().catch(() => {}); }, "Full Screen", "pfs"),
    i.t === "f" && D.settings.shares ? tb("Share", () => { pdlg.close(); shareBox(i); }, "Share", "pshare") : null,
    tb("Download", () => download([i.id]), "Download", "pdl"), tb("Close", () => pdlg.close(), "Close", "pclose")), h("div", { class: "pv", id: "pv", text: "Opening…" }));
  const fb = $(pvDir > 0 && $("pnext") ? "pnext" : pvDir < 0 && $("pprev") ? "pprev" : $("pnext") ? "pnext" : "pclose"); if (fb) fb.focus();   // the key stays inside the preview
  pbox.onkeydown = e => { if (e.key === "ArrowLeft") { e.preventDefault(); pvStep(-1); } else if (e.key === "ArrowRight") { e.preventDefault(); pvStep(1); } else if (img && (e.key === "+" || e.key === "=")) setZoom(zoom.z * 1.25); else if (img && e.key === "-") setZoom(zoom.z / 1.25); else if (img && e.key === "0") setZoom(1); };
  pbox.onwheel = e => { if (img && e.ctrlKey) { e.preventDefault(); setZoom(zoom.z * (e.deltaY < 0 ? 1.1 : 1 / 1.1)); } };
  try {
    const r = await readFile(i, mime), pv = $("pv"); if (!pdlg.open || gen !== pvGen) return;
    pv.replaceChildren();
    if (k === "text") { const t = await r.blob.slice(0, 600000).text(), more = r.size > 600000 ? "\n\n… (only the start is shown)" : ""; if (gen !== pvGen) return; if (ext(name) === "md") { pv.classList.add("mdv"); pv.append(markdown(t + more)); } else pv.append(h("pre", { text: t + more })); return; }
    pvUrl = URL.createObjectURL(r.blob);
    if (k === "image") { const im = h("img", { src: pvUrl, alt: name, onload: e => { zoom.w = e.target.naturalWidth; } }); pv.append(im); }
    else if (k === "video") pv.append(h("video", { src: pvUrl, controls: true }));
    else if (k === "audio") pv.append(h("audio", { src: pvUrl, controls: true }));
    else pv.append(h("iframe", { src: pvUrl, title: name }));
  } catch (e) { const pv = $("pv"); if (pv && gen === pvGen) pv.textContent = why(e); }
}

/* ---------- uploads (and downloads): the Transfers box ----------
   (1.66.0) One card per file, shown as soon as it is picked or dropped: Waiting (dashed, "Ready to upload"), Locking (encrypted in this
   browser), Uploading with its % and a thin bar, Failed (red, with ↻ to try again), Done ("Uploaded · 1.8 MB", stays until Clear Done or the
   box is closed). × takes a waiting file off the list, or stops one that is going (the half file is thrown away on the server: put_abort).
   At the top: "Uploading 2 of 5", one overall bar, Stop All and Clear Done. Downloads and zips use the same cards. */
const ups = $("ups"); let upList = null, upHead = null, upAll = null;
/** @type {any[]} every card in the box, oldest first */
const xfers = [];
const XI = { wait: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z", bad: "M12 8v5M12 16.5h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z", done: "M5 12.5l4.5 4.5L19 7",
  re: "M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4", x: "M6 6l12 12M18 6 6 18", stop: "M8 8h8v8H8z" };
const xsvg = d => { const v = document.createElementNS("http://www.w3.org/2000/svg", "svg"), pa = document.createElementNS("http://www.w3.org/2000/svg", "path"); v.setAttribute("viewBox", "0 0 24 24"); v.setAttribute("aria-hidden", "true"); pa.setAttribute("d", d); v.append(pa); return v; };
function upBox() {
  if (upList) return;
  upHead = h("b", { class: "uht", "aria-live": "polite" });
  const clear = h("button", { type: "button", class: "ubtn", text: "Clear Done", onclick: () => { for (const x of xfers.slice()) if (x.state === "done" || x.state === "stop") x.drop(); upSync(); } });
  const stopAll = h("button", { type: "button", class: "ubtn", text: "Stop All", onclick: () => { for (const x of xfers) if (x.state === "wait" || x.state === "lock" || x.state === "go") x.stop(); upSync(); } });
  const hide = h("button", { type: "button", class: "ib", "aria-label": "Close Transfers", onclick: () => { for (const x of xfers.slice()) if (x.state === "done" || x.state === "stop" || x.state === "bad") x.drop(); upSync(); if (!xfers.length) ups.hidden = true; } }, svg("x"));
  upAll = h("i");
  ups.replaceChildren(h("div", { class: "uph" }, upHead, clear, stopAll, hide), h("div", { class: "upbar" }, upAll), upList = h("div", { class: "upl" }));
  /** @type {any} */ (ups)._clear = clear; /** @type {any} */ (ups)._stop = stopAll;
}
function upSync() {
  if (!upList) return;
  const going = xfers.filter(x => x.state === "go" || x.state === "lock"), waiting = xfers.filter(x => x.state === "wait"), done = xfers.filter(x => x.state === "done");
  const ups1 = xfers.filter(x => x.up), cur = ups1.findIndex(x => x.state === "go" || x.state === "lock");
  upHead.textContent = cur >= 0 ? "Uploading " + (cur + 1) + " of " + ups1.length : going.length ? xfers.find(x => x.state === "go" || x.state === "lock").label : waiting.length ? waiting.length + " waiting" : done.length ? "Transfers · " + done.length + " done" : "Transfers";
  const tot = xfers.reduce((a, x) => a + (x.total || 0), 0), got = xfers.reduce((a, x) => a + (x.state === "done" ? (x.total || 0) : x.state === "go" ? (x.total || 0) * x.frac : 0), 0);
  upAll.style.width = tot ? Math.round(got / tot * 100) + "%" : (done.length && !going.length && !waiting.length ? "100%" : "0%");
  /** @type {any} */ (ups)._clear.hidden = !xfers.some(x => x.state === "done" || x.state === "stop");
  /** @type {any} */ (ups)._stop.hidden = !(going.length + waiting.length);
  if (!xfers.length) ups.hidden = true;
}
/** One card. name: the file's name (its type card shows while it waits or is done); up: an upload (retry runs again) */
function xfer(label, name, total, up) {
  upBox(); ups.hidden = false;
  const ic = h("span", { class: "uic" }), nm = h("b", { text: name || label }), sub = h("small"), bar = h("span", { class: "upb" });
  const re = h("button", { type: "button", class: "ib re", "aria-label": "Try " + (name || label) + " again", title: "Try again", hidden: true }, xsvg(XI.re));
  const x = h("button", { type: "button", class: "ib", "aria-label": "Remove " + (name || label) });
  const el = h("div", { class: "uc" }, ic, h("span", { class: "ut" }, nm, sub), re, x, bar);
  upList.append(el);
  const card = { label, name, total: total || 0, frac: 0, got: 0, up, state: "", stopped: false, retry: /** @type {any} */ (null),
    set(st, text) {
      card.state = st; el.className = "uc " + st; sub.textContent = text;
      if (st === "go" || st === "lock") { if (!ic.querySelector(".ix-spin")) ic.replaceChildren(h("span", { class: "ix-spin", "aria-hidden": "true" }, h("i"), h("i"), h("i"))); }
      else ic.replaceChildren(st === "bad" ? xsvg(XI.bad) : st === "stop" ? xsvg(XI.stop) : name && FC ? FC.make(name, "s") : xsvg(st === "done" ? XI.done : XI.wait));
      re.hidden = st !== "bad" || !card.retry;
      x.setAttribute("aria-label", (st === "go" || st === "lock" ? "Stop " : "Remove ") + (name || label)); x.replaceChildren(xsvg(XI.x));
      bar.style.width = st === "go" ? Math.round(card.frac * 100) + "%" : "0";
      upSync();
    },
    add(n, tot, absolute) { const t = tot || card.total; if (tot) card.total = tot; const done = absolute ? n : (card.got || 0) + n; card.got = done; card.frac = t ? Math.min(1, done / t) : 0;
      card.set("go", (up ? "Uploading" : label.startsWith("Making") ? "Making the zip" : "Downloading") + " · " + (t ? Math.round(card.frac * 100) + "%" : fmt(done))); },
    done(t) { card.frac = 1; card.set("done", t || "Done"); },
    fail(t) { card.set("bad", t || "Failed. Try again."); x.title = t || ""; },
    stop() { card.stopped = true; if (card.state === "wait") card.set("stop", "Not uploaded"); },
    drop() { el.remove(); xfers.splice(xfers.indexOf(card), 1); }
  };
  x.onclick = () => { if (card.state === "go" || card.state === "lock") { card.stopped = true; sub.textContent = "Stopping…"; } else if (card.state === "wait") { card.stop(); } else { card.drop(); upSync(); } };
  re.onclick = () => { if (card.retry) card.retry(); };
  xfers.push(card); card.set("wait", up ? "Ready to upload" : "Waiting");
  return card;
}
/* downloads and zips: a card that starts at once */
function progress(label, name, total) { const c = xfer(label, name, total, false); c.set("go", label.startsWith("Making") ? "Making the zip" : "Downloading · 0%"); return c; }
let queue = Promise.resolve();
function uploadAll(entries) {   // [{file, parts: [folder names]}]
  if (!entries.length) return;
  const base = cwd;   // the folder the files were dropped into, even if you open another one while they wait
  const jobs = entries.map(e => ({ e, card: e.file ? xfer("Uploading " + e.file.name, e.file.name, e.file.size, true) : null }));
  queue = queue.then(() => doUploads(jobs, base)).catch(e => toast(e.message || "Upload stopped.", true));
}
async function doUploads(jobs, base) {
  if (!await ensureKey()) { for (const j of jobs) if (j.card && j.card.state === "wait") j.card.set("stop", "Not uploaded (locked)"); return; }
  const made = new Map([["", base]]);
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
      parent = /** @type {string} */ (made.get(key));
    }
    return parent;
  };
  let okN = 0, okName = "";
  const one = async j => {
    const c = j.card;
    if (!c) { await folderFor(j.e.parts); return; }   // an empty folder that was dropped
    if (c.stopped || c.state !== "wait") return;
    c.retry = () => { c.stopped = false; c.frac = 0; c.got = 0; c.set("wait", "Ready to upload"); queue = queue.then(() => one(j)).then(() => refresh()).catch(e => toast(e.message || "Upload stopped.", true)); };
    try {
      c.set("lock", "Locking in your browser");
      const parent = await folderFor(j.e.parts);
      const same = live().find(x => x.t === "f" && x.p === parent && nameOf(x) === j.e.file.name);
      if (same) {
        const ch = await clashChoice(j.e.file.name);
        if (ch === "skip") { c.set("stop", "Skipped. The same name is already there."); return; }
        if (ch === "replace") { await post("trash", { ids: [same.id] }); await refresh(); toast("The old " + j.e.file.name + " is in the Trash."); }
      }
      await uploadOne(j.e.file, parent, c); okN++; okName = j.e.file.name;
      c.done("Uploaded · " + fmt(j.e.file.size));
    } catch (x) { if (c.stopped) c.set("stop", "Stopped. Nothing was kept."); else c.fail(why(x) || "Upload failed. Try again."); }
  };
  for (const j of jobs) await one(j);
  await refresh();
  if (okN) toast(okN === 1 ? "Uploaded: " + okName : "Uploaded " + okN + " files, the last one " + okName);
}
/** (1.80.0) A file with this name is already in the folder: Keep Both (the new one gets a number), Replace (the old one goes to the Trash), or Skip. "Do this for the rest" remembers the answer for this batch. */
let clashAll = "";
async function clashChoice(name) {
  if (clashAll) return clashAll;
  const all = h("input", { type: "checkbox", id: "clall" });
  let ch = "skip";
  const r = await openDialog("Name Already Used", [h("p", { text: "A file called " + name + " is already in this folder." }), h("label", { class: "chk", for: "clall" }, all, " Do this for the rest")],
    [{ text: "Skip", run: () => { ch = "skip"; } }, { text: "Replace", run: () => { ch = "replace"; } }, { text: "Keep Both", pri: true, run: () => { ch = "keep"; } }]);
  if (r == null) ch = "skip";
  if (all.checked) { clashAll = ch; setTimeout(() => { clashAll = ""; }, 60000); }
  return ch;
}
async function uploadOne(file, parent, p, resume) {
  const raw = crypto.getRandomValues(new Uint8Array(32)), fk = await fileKey(raw, ["encrypt"]);
  const n = Math.max(1, Math.ceil(file.size / PIECE)), z = file.size + n * OVER;
  const name = uniqueName(parent, file.name || "file", "f");
  const m = await SITE.sealJson({ n: name, ty: file.type || "", s: file.size, mt: file.lastModified || Date.now() });
  const k = await SITE.seal(b64(raw)); raw.fill(0);
  const st = await post("put_start", { p: parent, m, k, c: n, z });
  if (!st.ok) throw new Error(st.error || "Could not start.");
  const id = st.id; let sent = 0;
  await sendPieces(file, fk, id, n, p, new Set(), () => sent, v => { sent = v; });
}
/** The pieces of one file, one by one. have: pieces the server already holds (Resume skips them). A failed or stopped upload is thrown away on the server unless keep is set. */
async function sendPieces(file, fk, id, n, p, have, getSent, setSent, keep) {
  let sent = getSent();
  try {
    for (let i = 0; i < n; i++) {
      if (have.has(i)) { sent += Math.min(PIECE, file.size - i * PIECE); setSent(sent); p.add(sent, file.size || 1, true); continue; }
      const plain = await file.slice(i * PIECE, Math.min(file.size, (i + 1) * PIECE)).arrayBuffer();
      const body = await lockPiece(fk, plain, i, n);
      let r = null;
      for (let t = 0; t < 3 && !(r && r.ok); t++) { r = await HF("api.php?action=put_chunk&id=" + id + "&n=" + i, { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body }).catch(() => null); if (r && !r.ok && r.status !== 502 && r.status !== 504) break; }
      if (!r || !r.ok) { const j = r ? await r.json().catch(() => ({})) : {}; throw new Error(j.error || "A piece did not arrive."); }
      sent += plain.byteLength; setSent(sent); p.add(sent, file.size || 1, true);
      if (p.stopped) throw new Error("Stopped");   // (1.66.0) × on its card: the half file is thrown away below
    }
    const dn = await post("put_done", { id }); if (!dn.ok) throw new Error(dn.error || "The file did not finish.");
  } catch (e) { if (!keep) await post("put_abort", { id }); throw e; }
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
/** (1.80.0) The proof of a link's password: PBKDF2 of the password with the file key as salt. The server keeps only a hash of it; share.js makes the same proof. */
async function shareProof(password, raw) {
  const salt = new Uint8Array(raw.length + 12); salt.set(te.encode("hub-share-pw"), 0); salt.set(raw, 12);
  const base = await crypto.subtle.importKey("raw", te.encode(password), "PBKDF2", false, ["deriveBits"]);
  return b64u(new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 150000 }, base, 256)));
}
const linkOf = async (i, token) => { const raw = await rawKeyOf(i); const u = new URL("share.html", location.href); u.searchParams.set("t", token); u.hash = b64u(raw); raw.fill(0); return u.href; };
/** a line about each link: password, downloads used, end date */
const shareNote = x => [x.pw ? "Password" : "", x.lim ? x.dl + " of " + x.lim + " downloads used" : "", x.exp ? "ends " + when(x.exp * 1000) : "never ends"].filter(Boolean).join(" · ");
/** (1.80.0) a QR code of a link, made here (the library is the one Settings uses) */
let qrLoad = null;
function qrMake(text, into) {
  if (!qrLoad) qrLoad = new Promise((res, rej) => { const sc = document.createElement("script"); sc.src = "../hub/core/assets/vendor/qrcode.js"; sc.onload = res; sc.onerror = rej; document.head.append(sc); });
  return qrLoad.then(() => { const q = /** @type {any} */ (window).qrcode(0, "M"); q.addData(text); q.make(); into.innerHTML = q.createImgTag(5, 8); const im = into.querySelector("img"); if (im) im.setAttribute("alt", "QR code of the link"); }).catch(() => { into.textContent = "Could not make the QR code."; });
}
/** (1.80.1) One link for several pictures: each picture gets its own share link (same end date, limit and password), and the gallery link holds them all */
async function galleryBox(pics) {
  if (!await ensureKey()) return;
  const exp = h("select", { id: "gexp", "aria-label": "Link ends" }, [["0", "Never"], ["86400", "After 1 day"], ["604800", "After 7 days"], ["2592000", "After 30 days"]].map(o => h("option", { value: o[0], text: o[1] })));
  const pw = h("input", { type: "password", id: "gpw", autocomplete: "new-password", placeholder: "No password", "aria-label": "Password" });
  const out = h("div", { class: "links" });
  await openDialog("Share " + pics.length + " Pictures", [h("p", { text: "Makes one link that shows all " + pics.length + " pictures together. Each picture also has its own link, so you can remove them one by one in Shared Links. Pictures stay locked in your browser: the keys are in the link, after the #." }),
    h("div", { class: "shend" }, h("label", { for: "gexp", text: "The link ends" }), exp, h("label", { for: "gpw", text: "Password (optional)" }), pw), out],
  [{ text: "Make the Gallery Link", pri: true, left: true, run: async () => {
    const ts = [], ks = [];
    for (const i of pics) {
      const raw = await rawKeyOf(i), fk = await fileKey(raw, ["encrypt"]), m1 = meta(i) || { n: nameOf(i), s: sizeOf(i) };
      const body = { id: i.id, sm: await V.seal(fk, JSON.stringify({ n: m1.n, ty: m1.ty || "", s: m1.s })), exp: +exp.value ? Math.floor(Date.now() / 1000) + +exp.value : 0, lim: 0 };
      if (pw.value) body.pw = await shareProof(pw.value, raw);
      const j = await post("share_create", body); if (!j.ok) { derr(j.error); raw.fill(0); return false; }
      ts.push(j.token); ks.push(b64u(raw)); raw.fill(0);
    }
    const u = new URL("share.html", location.href); u.searchParams.set("t", ts.join(",")); u.hash = ks.join(",");
    await refresh();
    const fld = h("div", { class: "uf-host" }); fld.innerHTML = HUB.linkField({ value: u.href, prefix: "Link", readonly: true, label: "Gallery link" });
    out.replaceChildren(h("div", { class: "lk" }, h("div", { class: "meta", text: "Gallery link for " + pics.length + " pictures" }), h("div", { class: "linkbox" }, fld)));
    try { await navigator.clipboard.writeText(u.href); toast("Gallery link made and copied."); } catch (e) { toast("Gallery link made."); }
    return false;
  } }, { text: "Done", run: () => {} }]);
}
async function shareBox(i) {
  if (!await ensureKey()) return;
  const raw = await rawKeyOf(i), fk = await fileKey(raw, ["encrypt"]);
  const linkFor = t => { const u = new URL("share.html", location.href); u.searchParams.set("t", t); u.hash = b64u(raw); return u.href; };
  const box = h("div", { class: "links" });
  const exp = h("select", { id: "dexp", "aria-label": "Link ends" }, [["0", "Never"], ["86400", "After 1 day"], ["604800", "After 7 days"], ["2592000", "After 30 days"], ["7776000", "After 90 days"]].map(o => h("option", { value: o[0], text: o[1] })));
  const draw = () => {
    const mine = D.shares.filter(s => s.id === i.id);
    box.replaceChildren(...(mine.length ? mine.map(s => {
      // (1.69.1) the link field: "Link" in front, the address, the copy icon (COPY, then COPIED); shell.js does the copying
      const url = linkFor(s.token), fld = h("div", { class: "uf-host" });
      fld.innerHTML = HUB.linkField({ value: url, prefix: "Link", readonly: true, label: "Share link" });
      fld.querySelector("input").addEventListener("focus", e => e.target.select());
      const qr = h("div", { class: "qrbox", hidden: true });
      return h("div", { class: "lk" }, h("div", { class: "meta", "data-meta": s.token, text: "Made " + when(s.at * 1000) + " · " + shareNote(s) }),
        h("div", { class: "linkbox" }, fld,
          h("button", { type: "button", class: "btn", text: "QR Code", "aria-expanded": "false", onclick: e => { qr.hidden = !qr.hidden; e.currentTarget.setAttribute("aria-expanded", String(!qr.hidden)); if (!qr.hidden && !qr.firstChild) qrMake(url, qr); } }),
          h("button", { type: "button", class: "btn danger", text: "Remove", onclick: async () => { const j = await post("share_delete", { token: s.token }); if (!j.ok) return derr(j.error); await refresh(); draw(); } })), qr);
    }) : [h("p", { text: "No link yet. Make one, and send it to the person who should have this file." })]));
  };
  draw();
  /* (1.77.2) one window, no steps: your links on top, then how long the next one lasts. Making a link copies it for you. */
  const copyNew = async u => { try { await navigator.clipboard.writeText(u); return true; } catch (e) { return false; } };
  const make = async () => {
    const meta1 = meta(i) || { n: nameOf(i), s: sizeOf(i) };
    const sm = await V.seal(fk, JSON.stringify({ n: meta1.n, ty: meta1.ty || "", s: meta1.s }));
    const e = +exp.value, pwv = pw.value, body = { id: i.id, sm, exp: e ? Math.floor(Date.now() / 1000) + e : 0, lim: +lim.value || 0 };
    if (pwv) body.pw = await shareProof(pwv, raw);
    const j = await post("share_create", body);
    if (!j.ok) { derr(j.error); return false; }
    pw.value = "";
    await refresh(); draw();
    const made = D.shares.filter(x => x.id === i.id).find(x => x.token === j.token) || D.shares.filter(x => x.id === i.id).slice(-1)[0];
    toast(made && await copyNew(linkFor(made.token)) ? "Link made and copied." : "Link made."); return true;
  };
  const pw = h("input", { type: "password", id: "dpw", autocomplete: "new-password", placeholder: "No password", "aria-label": "Password for the next link" });
  const lim = h("select", { id: "dlim", "aria-label": "Downloads allowed" }, [["0", "No limit"], ["1", "1 download"], ["5", "5 downloads"], ["10", "10 downloads"], ["50", "50 downloads"]].map(o => h("option", { value: o[0], text: o[1] })));
  const ends = h("div", { class: "shend" }, h("label", { for: "dexp", text: "The next link ends" }), exp, h("label", { for: "dlim", text: "Downloads allowed" }), lim, h("label", { for: "dpw", text: "Password (optional)" }), pw,
    h("small", { class: "pwn", text: "With a password, the person needs it as well as the link. It is not sent to your server." }));
  await openDialog("Share " + nameOf(i), [FC ? h("div", { class: "shfc" }, FC.make(nameOf(i), "m"), h("b", { text: nameOf(i) })) : null, h("p", { text: "Anyone with the link can open this one file. The key to unlock it is in the link itself (after the #), so it never reaches your server, and the file stays locked there." }), box, ends],
    [{ text: "Make a New Link", pri: true, left: true, run: async () => { await make(); return false; } }, { text: "Done", run: () => {} }]);
  raw.fill(0);
}

/* ---------- settings ---------- */
/** (1.79.9) The storage limit is one typed number with a GB or TB choice (empty or 0 = no limit), with what the server has left. */
const GB = 1073741824, TB = 1024 * GB;
function limitControl(bytes) {
  let cur = bytes;
  const note = h("small", { id: "dlimn", class: "limn" });
  const asTB = bytes >= TB && bytes % TB === 0, shown = bytes ? String(Math.round(bytes / (asTB ? TB : GB) * 100) / 100) : "";
  const num = /** @type {HTMLInputElement} */ (h("input", { type: "number", id: "dlimv", min: "0", step: "any", inputmode: "decimal", placeholder: "No limit", value: shown, "aria-label": "Storage limit" }));
  const unit = /** @type {HTMLSelectElement} */ (h("select", { id: "dlimu", "aria-label": "Unit" }, [h("option", { value: "gb", selected: !asTB, text: "GB" }), h("option", { value: "tb", selected: asTB, text: "TB" })]));
  const el = h("div", { class: "limin" }, num, unit);
  const paint = () => {
    const n = parseFloat(num.value);
    cur = n > 0 ? Math.round(n * (unit.value === "tb" ? TB : GB)) : 0;
    const v = cur, free = D.free, used = D.usage;
    let t = "Used now: " + fmt(used) + (free != null ? ". Free on the server: " + fmt(free) + "." : ".");
    if (v && v < used) t += " That is less than you use now, so new uploads stop until you free some space.";
    else if (v && free != null && v > used + free) t += " That is more than the server has room for, so the server's free space limits you first.";
    else if (!v) t += " No limit: only the server's free space limits you.";
    note.textContent = t;
  };
  num.oninput = paint; unit.onchange = paint;
  paint();
  return { el, note, value: () => cur };
}
async function settingsBox() {
  const s = D.settings, lc = limitControl(s.limit || 0);
  const sh = h("input", { type: "checkbox", id: "dsh", class: "ix-sw", checked: !!s.shares }), only = h("input", { type: "checkbox", id: "donly", class: "ix-sw", checked: true, disabled: true });
  const td = h("select", { id: "dtd", "aria-label": "Keep Trash" }, [7, 14, 30, 60, 90].map(d => h("option", { value: d, selected: d === s.trashDays, text: d + " days" })));
  const row = (id, name, help, ctl) => h("div", { class: "ix-srow" }, h("label", { for: id }, name, h("small", { text: help })), ctl);
  await openDialog("Files Settings", [
    h("h3", { text: "Privacy" }),
    row("donly", "Hide From Visitors", "Always on: visitors must log in to see Files.", only),
    h("h3", { text: "Storage" }),
    row("dlimv", "Storage Limit", "Type a size. Leave it empty for no limit.", lc.el),   // (1.79.10) the number and GB/TB sit at the right of the name, like every other row
    h("div", { class: "limx" }, lc.note),
    h("h3", { text: "Sharing" }),
    row("dsh", "Share Links", "Off ends every link.", sh),
    h("h3", { text: "Trash" }),
    row("dtd", "Keep in Trash", "Then it is deleted for good.", td)
  ], [cancelBtn, { text: "Save Settings", pri: true, run: async () => {
    const j = await post("settings", { settings: { limit: lc.value(), shares: sh.checked, trashDays: +td.value } });
    if (!j.ok) { derr(j.error); return false; }
    await refresh(); toast("Saved.");
  } }], { frame: true, rows: true });
}

/* ---------- start ---------- */
function privateScreen(j) {
  document.body.innerHTML = '<div id="ix-private"><div class="ix-ico"><svg viewBox="0 0 24 24"><path d="M5 11h14v10H5zM8 11V8a4 4 0 0 1 8 0v3"/></svg></div><h1></h1><p>This page is private. Log in to see it.</p><button type="button">Log In</button></div>';
  /** @type {any} */ (document.querySelector("#ix-private h1")).textContent = document.title || "Files";
  /** @type {any} */ (document.querySelector("#ix-private button")).onclick = () => window.HUB ? HUB.login("Log in to see your files.").then(() => location.reload(), () => {}) : location.reload();
  if (window.HUB && HUB.ready) HUB.ready();
}
/* ---------- shared from the phone's Share button (1.61.0) ----------
   web/hub/share-sw.js keeps what was shared in this browser (Cache "hub-share") and opens this page with ?shared=<id>.
   Here you choose: Save to Files (locked like any upload), Open in Tools, or Discard. */
const shareKey = (id, p) => new URL("../hub/share-inbox/" + id + "/" + p, location.href).href;
async function shareTake(id) {
  const c = await caches.open("hub-share"), m = await c.match(shareKey(id, "meta"));
  if (!m) return null;
  const meta = await m.json(), files = [];
  for (let i = 0; i < meta.files.length; i++) { const r = await c.match(shareKey(id, "f" + i)); if (r) files.push(new File([await r.blob()], meta.files[i].n, { type: meta.files[i].type })); }
  return { meta, files };
}
async function shareDrop(id) { try { const c = await caches.open("hub-share"); for (const k of await c.keys()) if (k.url.includes("/share-inbox/" + id + "/")) await c.delete(k); } catch (e) { /* nothing kept */ } }
async function sharedBox(id) {
  if (!/^[a-f0-9]{20}$/.test(id)) { toast(id === "toobig" ? "That share is too big (300 MB at most)." : "Nothing came through from Share.", true); return; }
  const got = await shareTake(id).catch(() => null);
  if (!got) { toast("That share is no longer here.", true); return; }
  const { meta, files } = got, text = [meta.title, meta.text, meta.url].filter(Boolean).join("\n");
  const list = h("ul", { class: "shl" }, files.map(f => h("li", {}, f.name, h("small", { text: " " + fmt(f.size) }))), text ? h("li", {}, "Text or link", h("small", { text: " " + text.slice(0, 120) })) : null);
  const choice = await openDialog("Shared With Homebase Hub", [h("p", { text: "Something was sent here from Share. Nothing has been saved yet." }), list],
    [{ text: "Discard", run: () => {} }, { text: "Open in Tools", run: () => {} }, { text: "Save to Files", pri: true, run: () => {} }]);
  if (choice === "Open in Tools") { location.href = "../tools/?shared=" + id; return; }   // Tools takes the files from the browser's storage and removes them
  if (choice === "Save to Files") {
    const entries = files.map(f => ({ file: f, parts: [] }));
    if (text) entries.push({ file: new File([text + "\n"], "Shared text.txt", { type: "text/plain" }), parts: [] });
    uploadAll(entries); await queue;
  }
  await shareDrop(id);
}
async function load() {
  let j = null;
  await offScan(); let cached = false;
  try { const r = await HF("api.php?action=list", { cache: "no-store" }); j = await r.json(); } catch (e) { j = null; }
  if (!j && OFFSET.size) { try { const c = await offCache(), r = c && await c.match(offList()); if (r) { j = await r.json(); cached = true; } } catch (e) { j = null; } }
  if (!j) { $("sync").textContent = "Could not reach the server."; return; }
  if (j.private && !j.auth) return privateScreen(j);
  apply(j); await names(); started = true; offView = cached; if (!cached) offSaveList();
  // (1.72.0) the site search finds files by name once they are opened here: only the names (and their folder), in this tab only
  if (unlocked) { try { sessionStorage.setItem("hub-find-files", JSON.stringify(live().filter(i => MC.has(i.m)).slice(0, 3000).map(i => ({ n: nameOf(i), d: i.p && byId.get(i.p) ? nameOf(byId.get(i.p)) : "", t: i.t === "f" ? dateOf(i) : 0 })))); } catch (e) { /* too big: no names */ } }
  // (1.80.2) a link to one file (made by Attach File in Tasks and Cards, or Copy Link to This File): open its folder and show it
  const hf = /^#file=([A-Za-z0-9_-]+)$/.exec(location.hash);
  if (hf) { history.replaceState(null, "", location.pathname + location.search); const fi = byId.get(hf[1]); if (fi && fi.t === "f" && fi.del === 0) { tab = "files"; cwd = fi.p || ""; sel.clear(); sel.add(fi.id); cur = anchor = fi.id; render(); openItem(fi); } else { render(); toast("That file is not in Files any more."); } }
  const hq = /^#q=(.+)$/.exec(location.hash);   // a search result: show the file
  if (hq) { try { q = decodeURIComponent(hq[1]); } catch (e) { q = ""; } tab = "files"; $("q").value = q; history.replaceState(null, "", location.pathname + location.search); }
  render();
  const sh = new URLSearchParams(location.search).get("shared");
  if (sh) { history.replaceState(null, "", location.pathname + location.hash); sharedBox(sh); }
}
/** (1.80.0) the page's keys: arrows move, Enter opens, Space picks, F2 renames, Delete removes, Ctrl+A picks all, / searches, Escape clears */
function keys(e) {
  const t = /** @type {Element} */ (document.activeElement), typing = /INPUT|TEXTAREA|SELECT/.test(t?.tagName || "") && !(t.classList && t.classList.contains("ck")), dlgOpen = !!document.querySelector("dialog[open]");
  if (dlgOpen) return;
  if (e.key === "/" && !typing) { e.preventDefault(); $("q").focus(); return; }
  if (typing || e.altKey || !started) return;
  if (pm && (e.key.startsWith("Arrow") || e.key === "Enter" || e.key === " ")) return;   // the open menu has its own keys
  const vis = shown(), ids = vis.map(x => x.id), at = ids.indexOf(cur), grid = D.settings.view === "grid";
  const cols = grid ? Math.max(1, Math.round($("list").clientWidth / (($("list").querySelector(".row") || { clientWidth: 1 }).clientWidth + 12))) : 1;
  const go = n => { if (!ids.length) return; n = Math.max(0, Math.min(ids.length - 1, n)); cur = ids[n]; if (e.shiftKey) { if (!anchor) anchor = ids[Math.max(0, at)]; range(cur); } else { anchor = cur; } row.sync(); const el = $("list").querySelector('.row[data-id="' + cur + '"]'); if (el) { el.scrollIntoView({ block: "nearest" }); } };
  const i = byId.get(cur);
  if (e.key === "ArrowDown") { e.preventDefault(); go(at < 0 ? 0 : at + cols); }
  else if (e.key === "ArrowUp") { e.preventDefault(); go(at < 0 ? 0 : at - cols); }
  else if (e.key === "ArrowRight" && grid) { e.preventDefault(); go(at < 0 ? 0 : at + 1); }
  else if (e.key === "ArrowLeft" && grid) { e.preventDefault(); go(at < 0 ? 0 : at - 1); }
  else if (e.key === "Home") { e.preventDefault(); go(0); }
  else if (e.key === "End") { e.preventDefault(); go(ids.length - 1); }
  else if (e.key === "Enter" && i && !/BUTTON|A/.test(t?.tagName || "")) { e.preventDefault(); openItem(i); }
  else if (e.key === " " && i && !/BUTTON|A/.test(t?.tagName || "")) { e.preventDefault(); anchor = i.id; sel.has(i.id) ? sel.delete(i.id) : sel.add(i.id); row.sync(); }
  else if (e.key === "F2" && tab !== "trash") { const x = i || (sel.size === 1 ? byId.get([...sel][0]) : null); if (x) { e.preventDefault(); rename(x); } }
  else if ((e.key === "Delete" || e.key === "Backspace") && (sel.size || i)) { e.preventDefault(); const ids2 = sel.size ? [...sel] : [i.id]; tab === "trash" ? purge(ids2) : trash(ids2); }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") { e.preventDefault(); for (const x of vis) sel.add(x.id); row.sync(); }
  else if (e.key === "Escape") { if (sel.size) { sel.clear(); row.sync(); } else if (cur) { cur = ""; row.sync(); } }
}
/** (1.80.0) On a phone: swipe a row left for Trash and right for Star, and pull the list down to reload it */
function phone() {
  let sx = 0, sy = 0, row1 = null, dx = 0, mode = "", pull = 0;
  const reset = () => { if (row1) { row1.style.transform = ""; row1.classList.remove("swl", "swr"); } row1 = null; mode = ""; dx = 0; };
  document.addEventListener("touchstart", e => {
    if (e.touches.length !== 1 || document.querySelector("dialog[open]")) return; const t = e.touches[0]; sx = t.clientX; sy = t.clientY; dx = 0; mode = ""; pull = 0;
    const r = /** @type {Element} */ (e.target).closest && /** @type {Element} */ (e.target).closest("#list .row"); row1 = r && tab !== "trash" && D.settings.view !== "grid" ? /** @type {HTMLElement} */ (r) : null;
  }, { passive: true });
  document.addEventListener("touchmove", e => {
    const t = e.touches[0], mx = t.clientX - sx, my = t.clientY - sy;
    if (!mode) { if (Math.abs(mx) > 12 && Math.abs(mx) > Math.abs(my) * 1.6 && row1) mode = "swipe"; else if (my > 12 && Math.abs(my) > Math.abs(mx) && scrollY <= 0 && !row1) mode = "pull"; else if (Math.abs(my) > 12) { mode = "scroll"; } }
    if (mode === "swipe" && row1) { dx = Math.max(-140, Math.min(140, mx)); row1.style.transform = "translateX(" + dx + "px)"; row1.classList.toggle("swl", dx < -8); row1.classList.toggle("swr", dx > 8); }
    if (mode === "pull") pull = my;
  }, { passive: true });
  document.addEventListener("touchend", () => {
    const r = row1, d = dx, m = mode, pl = pull; reset(); pull = 0;
    if (m === "swipe" && r) { const i = byId.get(/** @type {any} */ (r).dataset.id); if (!i) return; if (d <= -90) trash([i.id]); else if (d >= 90 && i.t === "f") star(i); }
    else if (m === "pull" && pl > 90) refresh().then(ok => { if (ok) toast("Up to date."); });
  }, { passive: true });
  document.addEventListener("touchcancel", () => { reset(); pull = 0; }, { passive: true });
}
function areaMenu(at) {
  closeMenu();
  /** @type {any[][]} */
  const acts = [["up", "Upload Files", () => $("pick").click()], ["folder", "Upload Folder", () => $("pickdir").click()], ["folder", "New Folder", mkdir]];
  pm = h("div", { class: "pm newm", role: "menu" }, acts.map(a => h("button", { type: "button", role: "menuitem", onclick: () => { closeMenu(); a[2](); } }, svg(a[0]), a[1])));
  document.body.append(pm);
  pm.style.left = Math.max(8, Math.min(innerWidth - pm.offsetWidth - 8, at.x)) + "px"; pm.style.top = Math.max(8, Math.min(innerHeight - pm.offsetHeight - 8, at.y)) + "px";
  pm.querySelector("button").focus();
  pm.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });
}
function wire() {
  $("up").onclick = $("uph").onclick = () => $("pick").click();
  $("newb").onclick = e => { e.stopPropagation(); if (pm && pm.classList.contains("newm")) closeMenu(); else newMenu(); };
  $("mk").onclick = $("mkh").onclick = mkdir;
  $("psets").onclick = settingsBox;
  $("stbtn").onclick = storageBox;
  phone();
  $("pick").onchange = e => { uploadAll([...e.target.files].map(f => ({ file: f, parts: [] }))); e.target.value = ""; };
  $("pickdir").onchange = e => { const fl = [...e.target.files]; uploadAll(fl.map(f => ({ file: f, parts: String(f.webkitRelativePath || "").split("/").slice(0, -1) }))); e.target.value = ""; };
  $("pickcam").onchange = e => { uploadAll([...e.target.files].map(f => ({ file: f, parts: [] }))); e.target.value = ""; };
  $("pickres").onchange = e => { const f = e.target.files[0]; e.target.value = ""; if (f) resumeUpload(f); };
  /* (1.80.0) paste a picture or a file anywhere on the page: it is uploaded here */
  document.addEventListener("paste", e => { const fl = [...((e.clipboardData && e.clipboardData.files) || [])]; if (!fl.length || tab !== "files" || document.querySelector("dialog[open]") || /INPUT|TEXTAREA/.test(document.activeElement?.tagName || "")) return; e.preventDefault(); uploadAll(fl.map((f, k) => ({ file: f.name && f.name !== "image.png" ? f : new File([f], "Pasted " + new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-") + (k ? " " + (k + 1) : "") + "." + (ext(f.name) || (f.type.split("/")[1] || "png")), { type: f.type, lastModified: Date.now() }), parts: [] }))); });
  $("sela").onclick = toggleAll;
  $("empty").onclick = async () => { if (await confirmBox("Empty the Trash?", "Everything in the Trash is deleted for good. This can't be undone.", "Empty Trash", true)) await run(post("empty_trash"), "Trash emptied."); };
  $("tabs").onclick = e => { const b = e.target.closest("button"); if (!b) return; tab = b.dataset.t; sel.clear(); q = ""; $("q").value = ""; render(); };
  $("vsw").onclick = e => { const b = e.target.closest("button"); if (!b) return; D.settings.view = b.dataset.v; render(); post("settings", { settings: { view: b.dataset.v } }); };
  $("sort").onchange = e => { D.settings.sort = e.target.value; render(); post("settings", { settings: { sort: e.target.value } }); };
  let qt; $("q").oninput = e => { clearTimeout(qt); qt = setTimeout(() => { q = e.target.value.trim(); if (q && tab !== "files") tab = "files"; render(); }, 120); };
  dragSetup();
  const dz = $("drop"); let depth = 0;
  window.addEventListener("dragenter", e => { if ([...(e.dataTransfer?.types || [])].includes("Files")) { depth++; dz.classList.add("over"); } });
  window.addEventListener("dragleave", () => { depth = Math.max(0, depth - 1); if (!depth) dz.classList.remove("over"); });
  window.addEventListener("dragover", e => { if ([...(e.dataTransfer?.types || [])].includes("Files")) e.preventDefault(); });
  window.addEventListener("drop", async e => { depth = 0; dz.classList.remove("over"); if (![...(e.dataTransfer?.types || [])].includes("Files") || tab !== "files") return; e.preventDefault(); uploadAll(await dropped(/** @type {DataTransfer} */ (e.dataTransfer))); });
  document.addEventListener("keydown", keys);
  /* (1.80.0) right-click on the empty part of the list, and a long press on a phone */
  $("drop").addEventListener("contextmenu", e => { if (e.target.closest(".row") || tab !== "files" || !unlocked) return; e.preventDefault(); areaMenu({ x: e.clientX, y: e.clientY }); });
  let lp = 0, lpx = 0, lpy = 0;
  $("list").addEventListener("pointerdown", e => { if (e.pointerType !== "touch") return; const r = e.target.closest(".row"); if (!r) return; lpx = e.clientX; lpy = e.clientY; clearTimeout(lp); lp = setTimeout(() => { const i = byId.get(r.dataset.id); if (!i) return; cur = i.id; if (!sel.has(i.id)) { sel.clear(); sel.add(i.id); row.sync(); } menu(r.querySelector(".more") || r, i, { x: lpx, y: lpy }); lpHit = Date.now(); }, 520); });
  for (const t of ["pointerup", "pointercancel"]) $("list").addEventListener(t, () => clearTimeout(lp));
  $("list").addEventListener("pointermove", e => { if (Math.abs(e.clientX - lpx) > 10 || Math.abs(e.clientY - lpy) > 10) clearTimeout(lp); });
  $("list").addEventListener("contextmenu", e => { if (/** @type {any} */ (e).pointerType === "touch" || Date.now() - lpHit < 800) e.preventDefault(); });
}
wire();
load();
window.__files = { state: () => ({ D, unlocked, cwd, tab, started }) };   // read-only, for the tests
})();
