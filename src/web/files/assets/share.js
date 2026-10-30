/*! Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
/* A share link (web/files/share.html?t=TOKEN#KEY): opens one file for anyone who has the link. TOKEN lets this page fetch the file's
   locked pieces; KEY (after the #, which browsers never send anywhere) unlocks them here. Nothing on this page talks to any other site. */
// @ts-check
(() => {
"use strict";
/** @type {(id: string) => any} the page's own elements: they are all in share.html */
const $ = id => document.getElementById(id);
const td = new TextDecoder();
const why = x => (x instanceof Error ? x.message : String(x));
const fmt = n => { const u = ["B", "KB", "MB", "GB", "TB"]; let i = 0; while (n >= 1024 && i < 4) { n /= 1024; i++; } return (i ? (n >= 100 ? n.toFixed(0) : n.toFixed(1)).replace(/\.0$/, "") : String(n)) + " " + u[i]; };
const ub64 = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
const ub64u = s => ub64(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - s.length % 4) % 4));
const aad = (i, n) => { const a = new Uint8Array(8), v = new DataView(a.buffer); v.setUint32(0, i); v.setUint32(4, n); return a; };
const ext = n => { const m = /\.([A-Za-z0-9]{1,8})$/.exec(n || ""); return m ? m[1].toLowerCase() : ""; };
const MIME = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", avif: "image/avif", bmp: "image/bmp", svg: "image/svg+xml", mp4: "video/mp4", webm: "video/webm", m4v: "video/mp4", mov: "video/quicktime",
  mp3: "audio/mpeg", m4a: "audio/mp4", wav: "audio/wav", ogg: "audio/ogg", flac: "audio/flac", aac: "audio/aac", pdf: "application/pdf" };
const TEXT = ["txt", "md", "csv", "json", "log", "xml", "html", "css", "js", "py", "php", "sh", "yml", "yaml", "ini", "tsv"];
const fail = t => { $("name").textContent = "This link does not work"; $("info").textContent = ""; $("err").textContent = t; document.title = "Link Ended"; };

async function main() {
  const t = new URLSearchParams(location.search).get("t") || "", key = location.hash.slice(1);
  if (!/^[A-Za-z0-9_-]{32}$/.test(t) || !/^[A-Za-z0-9_-]{43}$/.test(key)) return fail("This link is not complete. Ask for it again, and copy the whole address.");
  if (!(window.isSecureContext && crypto && crypto.subtle)) return fail("Opening a locked file needs a secure (https) connection.");
  let r; try { r = await fetch("api.php?action=s_meta&t=" + t, { cache: "no-store" }); } catch (e) { return fail("Can't reach the server."); }
  if (!r.ok) return fail("This link has ended or was removed.");
  const m = await r.json();
  let fk;
  try { fk = await crypto.subtle.importKey("raw", ub64u(key), "AES-GCM", false, ["decrypt"]); } catch (e) { return fail("The key in this link is damaged."); }
  let info;
  try { const w = ub64(m.sm.slice(5)); info = JSON.parse(td.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: w.subarray(0, 12) }, fk, w.subarray(12)))); }
  catch (e) { return fail("This link's key does not open the file. Ask for the link again."); }
  const name = String(info.n || "file"), size = +info.s || Math.max(0, m.z - m.c * 28);
  $("name").textContent = name; document.title = name; $("info").textContent = fmt(size) + (m.exp ? " · link ends " + new Date(m.exp * 1000).toLocaleDateString() : "");
  const get = async onBytes => {
    const parts = [];
    for (let i = 0; i < m.c; i++) {
      const p = await fetch("api.php?action=s_chunk&t=" + t + "&n=" + i, { cache: "no-store" });
      if (!p.ok) throw new Error(p.status === 404 ? "This link has ended or was removed." : "Could not download (" + p.status + ").");
      const d = new Uint8Array(await p.arrayBuffer());
      try { parts.push(new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: d.subarray(0, 12), additionalData: aad(i, m.c) }, fk, d.subarray(12)))); }
      catch (e) { throw new Error("The file did not open: it was changed, or the key does not fit."); }
      if (onBytes) onBytes(parts.reduce((a, x) => a + x.length, 0));
    }
    return parts;
  };
  const e = ext(name), dl = $("dl"); dl.hidden = false;
  dl.onclick = async () => {
    dl.disabled = true; $("err").textContent = "";
    try {
      const parts = await get(n => { dl.textContent = "Opening… " + Math.round(Math.min(100, n / Math.max(1, size) * 100)) + "%"; });
      const u = URL.createObjectURL(new Blob(parts, { type: "application/octet-stream" })), a = document.createElement("a"); a.href = u; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000);
      dl.textContent = "Download Again";
    } catch (x) { $("err").textContent = why(x); dl.textContent = "Download"; }
    dl.disabled = false;
  };
  if (size <= 60 * 1024 * 1024 && (MIME[e] || TEXT.includes(e))) {   // a quick look, for what a browser shows safely
    try {
      const parts = await get(), pv = $("pv"); pv.hidden = false;
      if (TEXT.includes(e)) { const pre = document.createElement("pre"); pre.textContent = td.decode(await new Blob(parts).slice(0, 400000).arrayBuffer()); pv.append(pre); return; }
      const u = URL.createObjectURL(new Blob(parts, { type: MIME[e] })), k = MIME[e].split("/")[0];
      /** @type {any} */
      const el = document.createElement(MIME[e] === "application/pdf" ? "iframe" : k === "image" ? "img" : k === "video" ? "video" : "audio");
      el.src = u; if (el.tagName === "VIDEO" || el.tagName === "AUDIO") el.controls = true; if (el.tagName === "IMG") el.alt = name; if (el.tagName === "IFRAME") el.title = name;
      pv.append(el);
    } catch (x) { $("err").textContent = why(x); }
  }
}
main();
})();
