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

/** (1.80.1) A gallery link: ?t=T1,T2,...#K1,K2,... (up to 20 pictures). Each picture is its own share link; this page shows them together. */
const proofOf = async (password, raw) => {
  const salt = new Uint8Array(raw.length + 12); salt.set(new TextEncoder().encode("hub-share-pw"), 0); salt.set(raw, 12);
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 150000 }, base, 256));
  return btoa(String.fromCharCode(...bits)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
async function gallery(ts, keys) {
  const app = $("app"); document.title = "Shared Pictures";
  $("name").textContent = "Shared Pictures"; $("info").textContent = "Opening…"; app.classList.add("gal");
  $("dl").hidden = true;
  const grid = document.createElement("div"); grid.className = "galg"; $("pv").after(grid);
  let password = "";
  const items = ts.map((t, i) => ({ t, raw: ub64u(keys[i]), proof: "" }));
  const open = async it => {
    const fk = await crypto.subtle.importKey("raw", it.raw, "AES-GCM", false, ["decrypt"]);
    const hd = /** @type {Record<string, string>} */ (it.proof ? { "X-Share-Proof": it.proof } : {});
    let r = await fetch("api.php?action=s_meta&t=" + it.t, { cache: "no-store", headers: hd });
    let j = await r.json().catch(() => ({}));
    if (j.pw && !it.proof) {
      if (!password) { $("pwf").hidden = false; $("name").textContent = "These Pictures Have a Password"; $("info").textContent = "Type the password you were given."; password = await new Promise(res => { $("pwf").onsubmit = ev => { ev.preventDefault(); res($("pw").value); }; }); $("pwf").hidden = true; }
      it.proof = await proofOf(password, it.raw); return open(it);
    }
    if (r.status === 403) { password = ""; it.proof = ""; $("err").textContent = j.error || "That password is not right."; return open(it); }
    if (!r.ok) throw new Error("ended");
    const w = ub64(j.sm.slice(5)), info = JSON.parse(td.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: w.subarray(0, 12) }, fk, w.subarray(12))));
    const name = String(info.n || "file"), size = +info.s || 0;
    const bytes = async () => {
      const parts = [];
      for (let k = 0; k < j.c; k++) {
        const p = await fetch("api.php?action=s_chunk&t=" + it.t + "&n=" + k, { cache: "no-store", headers: hd });
        if (!p.ok) throw new Error("Could not download (" + p.status + ").");
        const d = new Uint8Array(await p.arrayBuffer());
        parts.push(new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: d.subarray(0, 12), additionalData: aad(k, j.c) }, fk, d.subarray(12))));
      }
      return parts;
    };
    return { name, size, bytes };
  };
  const save = (blob, name) => { const u = URL.createObjectURL(blob), a = document.createElement("a"); a.href = u; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000); };
  const loaded = [];
  for (const it of items) {
    const card = document.createElement("figure"); card.className = "galc"; const cap = document.createElement("figcaption"); card.append(cap); grid.append(card);
    try {
      const f = await open(it); loaded.push(f); cap.textContent = f.name + " · " + fmt(f.size);
      const e = ext(f.name), isImg = MIME[e] && MIME[e].startsWith("image/");
      if (isImg && f.size <= 25 * 1024 * 1024) {
        const img = document.createElement("img"); img.alt = f.name; img.loading = "lazy"; card.prepend(img);
        f.bytes().then(parts => { const b = new Blob(parts, { type: MIME[e] }); img.src = URL.createObjectURL(b); img.onclick = () => save(b, f.name); img.title = "Download " + f.name; }).catch(x => { cap.textContent = f.name + " · " + why(x); });
      }
      const b = document.createElement("button"); b.type = "button"; b.className = "btn sm"; b.textContent = "Download"; b.setAttribute("aria-label", "Download " + f.name);
      b.onclick = async () => { b.disabled = true; try { save(new Blob(await f.bytes(), { type: MIME[e] || "application/octet-stream" }), f.name); } catch (x) { $("err").textContent = why(x); } b.disabled = false; };
      card.append(b);
    } catch (x) { cap.textContent = why(x) === "ended" ? "This link has ended." : why(x); card.classList.add("bad"); }
  }
  $("err").textContent = ""; $("name").textContent = "Shared Pictures"; $("info").textContent = loaded.length + (loaded.length === 1 ? " file" : " files");
}

async function main() {
  const tq = new URLSearchParams(location.search).get("t") || "";
  if (tq.includes(",")) {
    const ts = tq.split(","), ks = location.hash.slice(1).split(",");
    if (ts.length > 20 || ts.length !== ks.length || !ts.every(x => /^[A-Za-z0-9_-]{32}$/.test(x)) || !ks.every(x => /^[A-Za-z0-9_-]{43}$/.test(x))) return fail("This link is not complete. Ask for it again, and copy the whole address.");
    if (!(window.isSecureContext && crypto && crypto.subtle)) return fail("Opening a locked file needs a secure (https) connection.");
    return gallery(ts, ks);
  }
  const t = tq, key = location.hash.slice(1);
  if (!/^[A-Za-z0-9_-]{32}$/.test(t) || !/^[A-Za-z0-9_-]{43}$/.test(key)) return fail("This link is not complete. Ask for it again, and copy the whole address.");
  if (!(window.isSecureContext && crypto && crypto.subtle)) return fail("Opening a locked file needs a secure (https) connection.");
  let fk;
  try { fk = await crypto.subtle.importKey("raw", ub64u(key), "AES-GCM", false, ["decrypt"]); } catch (e) { return fail("The key in this link is damaged."); }
  /* (1.80.0) a link with a password: the proof is PBKDF2 of the password with the key as salt (the same as Files makes), sent in a header; the password is never sent */
  let proof = "";
  const hd = () => /** @type {Record<string, string>} */ (proof ? { "X-Share-Proof": proof } : {});
  const askPw = () => new Promise(res => {
    const f = $("pwf"), inp = $("pw"); f.hidden = false; $("name").textContent = "This File Has a Password"; $("info").textContent = "Type the password you were given."; inp.focus();
    f.onsubmit = async ev => {
      ev.preventDefault(); const b = f.querySelector("button"); b.disabled = true; $("err").textContent = "";
      const raw = ub64u(key), salt = new Uint8Array(raw.length + 12); salt.set(new TextEncoder().encode("hub-share-pw"), 0); salt.set(raw, 12);
      const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(inp.value), "PBKDF2", false, ["deriveBits"]);
      const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 150000 }, base, 256));
      proof = btoa(String.fromCharCode(...bits)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      res(true); b.disabled = false;
    };
  });
  let m;
  for (;;) {
    let r; try { r = await fetch("api.php?action=s_meta&t=" + t, { cache: "no-store", headers: hd() }); } catch (e) { return fail("Can't reach the server."); }
    if (r.status === 429) { const j0 = await r.json().catch(() => ({})); return fail(j0.error || "Too many tries. Wait a while."); }
    if (!r.ok && r.status !== 403) return fail("This link has ended or was removed.");
    const j = await r.json().catch(() => ({}));
    if (r.status === 403) { $("err").textContent = j.error || "That password is not right."; proof = ""; await askPw(); continue; }
    if (j.pw && !proof) { await askPw(); continue; }
    m = j; break;
  }
  $("pwf").hidden = true; $("err").textContent = "";
  let info;
  try { const w = ub64(m.sm.slice(5)); info = JSON.parse(td.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: w.subarray(0, 12) }, fk, w.subarray(12)))); }
  catch (e) { return fail("This link's key does not open the file. Ask for the link again."); }
  const name = String(info.n || "file"), size = +info.s || Math.max(0, m.z - m.c * 28);
  let cache = /** @type {any} */ (null);   // the opened file: the quick look and Download share it, so a download limit counts once
  $("name").textContent = name; document.title = name;
  const FC = /** @type {any} */ (window).FileCard, ic = document.querySelector("#app > .ico");   // (1.66.0) the file's type card instead of a plain page icon
  if (FC && ic) { ic.replaceChildren(FC.make(name, "l")); ic.classList.add("fc"); } $("info").textContent = fmt(size) + (m.exp ? " · link ends " + new Date(m.exp * 1000).toLocaleDateString() : "") + (m.lim ? " · " + m.left + (m.left === 1 ? " download" : " downloads") + " left" : "");
  const get = async onBytes => {
    if (cache) return cache;
    const parts = [];
    for (let i = 0; i < m.c; i++) {
      const p = await fetch("api.php?action=s_chunk&t=" + t + "&n=" + i, { cache: "no-store", headers: hd() });
      if (!p.ok) throw new Error(p.status === 404 ? "This link has ended or was removed." : "Could not download (" + p.status + ").");
      const d = new Uint8Array(await p.arrayBuffer());
      try { parts.push(new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: d.subarray(0, 12), additionalData: aad(i, m.c) }, fk, d.subarray(12)))); }
      catch (e) { throw new Error("The file did not open: it was changed, or the key does not fit."); }
      if (onBytes) onBytes(parts.reduce((a, x) => a + x.length, 0));
    }
    cache = parts; return parts;
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
