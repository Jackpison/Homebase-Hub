# Third-party code

Every bundled component is compatible with GPL-3.0, with one exception the owner has accepted: the React Bits files (below) keep their own licence, MIT + Commons Clause, and are **not** under the GPL. Each component keeps its own licence and copyright; where a file carries a header, it is kept.

| Component | Where | Licence | How it was confirmed |
|---|---|---|---|
| jsPDF 4.2.1 | `hub/core/assets/vendor` | MIT | Upstream licence (earlier check) |
| QR code library | `hub/core/assets/vendor` | MIT | Upstream licence (earlier check) |
| pdf.js 6.4.299 (Mozilla), legacy build | Tools (`pdf.worker.min.mjs`, `vendor/pdfjs/`) | Apache-2.0 | npm package `pdfjs-dist` |
| pdf.js image decoders: OpenJPEG, JBIG2 (from PDFium), qcms | Tools `vendor/pdfjs/wasm/` | BSD-2-Clause, BSD-3-Clause, MIT | The licence files next to each decoder |
| pdf.js character maps (Adobe) and standard fonts (Foxit from PDFium, Liberation Sans) | Tools `vendor/pdfjs/cmaps/`, `vendor/pdfjs/standard_fonts/` | BSD-3-Clause (Adobe, Foxit); Liberation: GPL-2.0 with the font exception | `LICENSE.txt`, `LICENSE_FOXIT.txt`, `LICENSE_LIBERATION.txt` next to the files |
| @cantoo/pdf-lib 2.11.1 (the maintained copy of pdf-lib, since 1.60), with culori 4.0.2, html-entities 2.6.0, node-html-better-parser 1.5.9 and tslib 2.8.1 | Tools | MIT (tslib: 0BSD) | npm packages |
| JsBarcode 3.12.3 | Tools (Barcode Generator, 1.60) | MIT | npm package |
| qpdf, WebAssembly build `@neslinesli93/qpdf-wasm` 0.3.0 (`qpdf.wasm`) | Tools | Apache-2.0 (qpdf); ISC (the package) | npm package and qpdf's licence |
| Tesseract.js 7.0.0 and tesseract.js-core 7.0.0, with `eng.traineddata` | Tools `vendor/tesseract/` | Apache-2.0 | npm packages; tesseract-ocr/tessdata states its data is Apache-2.0 |
| ONNX Runtime Web 1.31.1 (`ort-wasm-simd-threaded.wasm`) | Tools | MIT | npm package `onnxruntime-web` |
| U-2-Net `u2netp.onnx` | Tools `vendor/` | Apache-2.0 | Upstream xuebinqin/U-2-Net is Apache-2.0 and its author said the weights follow the repo licence |
| libheif-js 1.23.5 (libheif, WebAssembly) | Tools (`t-libheif-bundle-*.js`) | **LGPL-3.0** | npm package; libheif is LGPL. Combining with GPL-3.0 is allowed |
| @jsquash/avif 2.1.1 (libavif encoder, `avif_enc.wasm`) | Tools | Apache-2.0 (the package); BSD-2-Clause (libavif) | npm package |
| **React Bits** by David Haz: GlassSurface (`hub/core/assets/glass.js`, 1.68.0) and the 16 Animated Designs for Home (`web/home/designs/`, 1.74.0): Iridescence, Flux Lines, Galaxy, Crystal Ball, Pattern Waves, Gradient Waves, Topography, Light Tunnel, Lightfall, Lightning, Hyperspeed, Ballpit, Orb, Letter Glitch, Balatro, Aero Shards | Home, Settings | **MIT + Commons Clause** (not GPL). The files keep their banner; the full text is at the top of `glass.js` | reactbits.dev (the free, not the Pro, components); the owner confirmed the site allows publishing them. They run without React (`designs-src/_runtime.js`) |
| ogl 1.0.11, three 0.187.0, vgpu 0.6.0 | bundled into Crystal Ball and Pattern Waves (ogl), Hyperspeed (three), Aero Shards (vgpu) | Unlicense (ogl); MIT (three, vgpu) | npm packages |
| exifr 7.1.3, utif2 4.1.0, fflate 0.8.3, qrcode-generator 2.0.4, @noble/hashes 2.4.0 | Tools | MIT | npm packages |

The Animated Designs are built from `src/web/home/designs-src/` by `scripts/build-designs.py` (versions pinned in `package-lock.json`); Tools is built from its source in `tools-app/` (pinned in `tools-app/package-lock.json`); the bundled files keep their licence comments.

If you find an entry that is wrong, please open an issue.

## LGPL-3.0 note (libheif)

libheif is unmodified and is loaded as a separate file (`web/tools/assets/t-libheif-bundle-*.js`). You can replace it with your own build of libheif-js. The LGPL-3.0 text is at https://www.gnu.org/licenses/lgpl-3.0.html.

## Security review of the bundled libraries

Last checked 23 October 2026 with `npm audit` against the exact versions in the site: **no known advisory**. Run `python3 tests/repo/check_libraries.py --audit` to repeat it; CI runs the offline part on every push.

| Library | Version | Notes |
|---|---|---|
| pdf.js (Tools) | 6.4.299 | Replaces 3.11.174, which had GHSA-wgrm-67xf-hhpq. Versions 5.6.83 to 6.2.107 have GHSA-hq66-cqwq-w95j, so the check requires 6.2.108 or newer. The PDF tools open files with scripting turned off. |
| SheetJS | removed | Its last npm version (0.18.5) had GHSA-4r6h-8v6p-xvw6 and GHSA-5pgg-2g8v-p4x9 and gets no fixes there. Cards now writes Excel files with its own small writer, and the check fails if SheetJS comes back. |
| ONNX Runtime Web (Tools) | 1.31.1 | No advisory. Replaces 1.17.3, which could not be updated while Tools had no source. |
| libheif-js (Tools) | 1.23.5 | No advisory. The newest release. |
| jsPDF, @cantoo/pdf-lib, Tesseract.js, qpdf, JsBarcode | 4.2.1, 2.11.1, 7.0.0, 0.3.0, 3.12.3 | No advisory. `npm audit` on `tools-app/package-lock.json` finds nothing. React, JSZip, Sortable and framer-motion are no longer used. |

## Uiverse elements (1.65.0 to 1.69.1)

A few small pieces of the site's look are adapted from elements shared on [Uiverse](https://uiverse.io) under the MIT licence. They were
rewritten for the site (its own class names, sizes, colours, keyboard and reduce-motion support; no React or other library). Each one is
credited again in a comment where it is used (`hub/core/assets/shell.css`).

| What | Where in the site | Original | Author |
|---|---|---|---|
| On/off switch (white track, metal knob) | every on/off switch | https://uiverse.io/Yaya12085/bright-dolphin-91 | Yaya12085 |
| Loader (three bouncing dots) | waiting states | https://uiverse.io/mobinkakei/grumpy-turtle-41 | mobinkakei |
| Button hover (slanted fill) | text buttons | https://uiverse.io/CristianMontoya98/nasty-fish-9 | CristianMontoya98 |
| Erase button (X slides across) | Backup & Restore › Start Over (1.65.1) | https://uiverse.io/cssbuttons-io/stupid-impala-51 | cssbuttons-io |
| Edit bar (round buttons, name bubble) | the edit bar of Links, Info and Home (1.65.1) | https://uiverse.io/firemonste_8052/lucky-catfish-97 | firemonste_8052 |
| Accent Color picker (squares that swell around the mouse) | Settings › Appearance › Look (1.65.3) | https://uiverse.io/Cobp/horrible-quail-18 | Cobp |
| Hover glow (toned down) | buttons that had no hover change (1.65.1) | https://uiverse.io/mrhyddenn/moody-badger-62 | mrhyddenn |
| Link field (a label in front, a copy icon with a COPY tip) | Links › Address, Files › Share Link, Health › Domains, Telegram › Setup, the recovery and two-step keys (1.69.1) | https://uiverse.io/Bodyhc/itchy-dodo-49 | Bodyhc |

## MIT License (Uiverse elements)

Copyright (c) 2023 Uiverse.io and the authors named above

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## File type cards (1.66.0)

The file type cards in Files and on the share page (`web/files/assets/filecard.js` and `filecard.css`) follow the look of
"file-card-collections" by urmauur on 21st.dev: https://21st.dev/@urmauur/components/file-card-collections . Rebuilt for this site in plain
DOM and CSS (no React or Tailwind), with extra kinds for audio and unknown file types.

## Lucide icons (1.66.0)

The section icons of the Settings menu (`web/hub/core/assets/shell-admin.js`, `SEC_TILE`) and its Log Out icon, and (1.67.0) the page icons in the top bar (`web/hub/core/assets/shell.js`, `PAGE_TILE`), are from Lucide,
https://lucide.dev , used under the ISC License:

ISC License

Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held by
Lucide Contributors 2022.

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the
above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

## GlassSurface from React Bits (1.68.0)

Bar Glass (Settings › Appearance › Look) uses **GlassSurface** from React Bits by David Haz (https://reactbits.dev ,
https://github.com/DavidHDev/react-bits), ported to plain JavaScript in `web/hub/core/assets/glass.js` (no React). Its look is in
`web/hub/core/assets/shell.css` ("Bar Glass"). That file is **not** under this project's GPL: it keeps the React Bits licence, written
out in full at the top of the file:

MIT + Commons Clause License Condition v1.0. Copyright (c) 2026 David Haz. Use, copying, changing, merging, publishing and distributing
are allowed **as part of an application, website, or product**, with the copyright and permission notice kept. **Commons Clause:** the
components themselves may not be sold, sublicensed or redistributed, alone, in a bundle, or as a ported version. Provided "as is",
without warranty of any kind.

## Stepper from React Bits (1.69.0)

The step-by-step boxes (New Site Setup, Links › Import, the first Encryption Passphrase, Backup › Restore and Start Over, Files › Share
Link, Add a Passkey and the Home Tour) use **Stepper** from React Bits by David Haz (https://reactbits.dev/c/components/stepper),
ported to plain JavaScript as `stepper()` in `web/hub/core/assets/shell.js` (no React, no icon package: the site's own icons), with its
look in `web/hub/core/assets/shell.css` ("Stepper"). Same licence as GlassSurface above: MIT + Commons Clause, Copyright (c) 2026
David Haz; use as part of an application, website or product is allowed with the notice kept; the component itself may not be sold,
sublicensed or redistributed, alone, in a bundle, or as a ported version. Provided "as is", without warranty of any kind.
