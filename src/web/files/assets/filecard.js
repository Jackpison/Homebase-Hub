/*! Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
/* (1.66.0) File type cards: a small page with a coloured label at its corner (PDF, XLSX, ZIP...) and a drawing of its kind inside.
   The look comes from "file-card-collections" by urmauur on 21st.dev (https://21st.dev/@urmauur/components/file-card-collections),
   rebuilt here in plain DOM and CSS (filecard.css), no React. Used by Files (list, grid, details, Share window) and the share page.
   FileCard.make(fileName, size) -> an element; size "s" (list rows), "m" (default), "l" (details and the share page).
   The drawings are fixed markup; the file's own name is only ever used through textContent (the label). */
// @ts-check
(() => {
"use strict";
const GROUPS = {
  txt: ["txt", "log", "rtf", "ini", "ics", "vcf"], doc: ["doc", "docx", "odt", "pages"], pdf: ["pdf"], md: ["md", "mdx", "markdown"],
  xls: ["xls", "xlsx", "ods", "numbers"], csv: ["csv", "tsv"], zip: ["zip", "rar", "7z", "tar", "gz", "tgz", "bz2", "xz"],
  ppt: ["ppt", "pptx", "odp", "key"], json: ["json"], css: ["css", "scss", "less"],
  code: ["html", "htm", "js", "mjs", "jsx", "ts", "tsx", "py", "php", "sh", "rb", "go", "java", "c", "cpp", "h", "rs", "xml", "yml", "yaml", "sql", "svelte", "vue"],
  img: ["png", "jpg", "jpeg", "gif", "webp", "avif", "bmp", "svg", "heic", "heif", "tif", "tiff", "ico"],
  video: ["mp4", "webm", "mov", "m4v", "ogv", "mkv", "avi"], audio: ["mp3", "m4a", "wav", "ogg", "oga", "flac", "aac", "opus"]
};
const COLOR = {
  txt: "#6b7280", doc: "#3b82f6", pdf: "#ef4444", md: "#525252", xls: "#059669", csv: "#0f766e", zip: "#a855f7", rar: "#9333ea", tar: "#ca8a04",
  gz: "#a16207", tgz: "#a16207", ppt: "#f97316", json: "#ca8a04", css: "#2563eb", code: "#ea580c", js: "#ca8a04", jsx: "#2563eb", ts: "#2563eb",
  tsx: "#2563eb", py: "#2563eb", img: "#db2777", png: "#525252", jpg: "#15803d", jpeg: "#15803d", gif: "#7c3aed", svg: "#ea580c", webp: "#0f766e",
  video: "#15803d", audio: "#db2777", file: "#6b7280"
};
const LINES = '<i class="h w50"></i><div class="r"><i></i><i></i></div><div class="r"><i></i><i class="f7"></i></div><div class="r"><i></i><i></i></div><div class="r"><i class="f7"></i><i></i></div><i class="w33"></i>';
const ZIPROW = ['<span><b class="h"></b><b></b></span>', '<span><b></b><b class="h"></b></span>'];
const DRAW = {
  txt: LINES, doc: LINES, pdf: LINES, file: LINES,
  md: '<div class="hash">#<i class="h w22"></i></div><i class="w40"></i><i class="w60"></i><i class="w70"></i><i class="w35"></i>',
  xls: '<div class="grid"><b class="h"></b><b class="h"></b><b class="h"></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b class="o"></b><b></b></div>',
  csv: '<div class="r"><i class="h c"></i><i class="h c"></i><i class="h c"></i></div><div class="r"><i class="t"></i><i class="t"></i><i class="t"></i></div><div class="r"><i class="t"></i><i class="t"></i><i class="t"></i></div><div class="r"><i class="t"></i><i class="t"></i><i class="t o"></i></div>',
  zip: '<div class="zip">' + [0, 1, 0, 1, 0, 1, 0, 1, 0].map(n => ZIPROW[n]).join("") + '</div>',
  ppt: '<div class="pic"><u class="o"></u><i class="h"></i></div><div class="r"><i class="h"></i><i class="h f5"></i></div><i class="h w30"></i>',
  img: '<div class="pic"><u></u><i class="h w40"></i><i class="h"></i></div>',
  video: '<div class="pic"><u class="p"></u><i class="h w40"></i><i class="h"></i></div>',
  audio: '<div class="wave"><b class="h30"></b><b class="h65"></b><b class="h100"></b><b class="h55"></b><b class="h80"></b><b class="h40"></b><b class="h70"></b></div><i class="h w60 mb"></i>',
  code: '<div class="code">&lt;<s class="g"></s>&gt;</div><div class="code in">&lt;<s class="b"></s>&gt;</div><div class="code in">&lt;/<s class="b"></s>&gt;</div><div class="code">&lt;<s class="g s"></s>/&gt;</div>',
  css: '<div class="code">{</div><div class="r in"><s class="b"></s><s class="b l"></s></div><div class="r in"><s class="b l"></s><s class="b s"></s></div><div class="r in"><s class="b"></s><s class="b l"></s></div><div class="code">}</div>',
  json: '<div class="code">{</div><div class="r in"><i class="h"></i><i class="h"></i></div><div class="r in"><i></i><i class="f5"></i></div><div class="r in"><i></i><i></i></div><div class="code">}</div>'
};
const extOf = n => { const m = /\.([A-Za-z0-9]{1,8})$/.exec(n || ""); return m ? m[1].toLowerCase() : ""; };
const groupOf = e => { for (const g in GROUPS) if (GROUPS[g].includes(e)) return g; return "file"; };
/** @param {string} name @param {string} [size] */
function make(name, size) {
  const e = extOf(name), g = groupOf(e);
  const wrap = document.createElement("span"); wrap.className = "fcd " + (size || "m") + " k-" + g; wrap.setAttribute("aria-hidden", "true");
  const pg = document.createElement("span"); pg.className = "fcpg";
  pg.innerHTML = DRAW[g] || LINES;   // fixed drawings only (no file data in them)
  const lb = document.createElement("span"); lb.className = "fclb";
  lb.textContent = e && e.length <= 5 ? e : g === "file" ? "file" : g;
  lb.style.background = COLOR[e] || COLOR[g] || COLOR.file;
  wrap.append(pg, lb);
  return wrap;
}
/** @type {any} */ (window).FileCard = { make, groupOf, extOf };
})();
