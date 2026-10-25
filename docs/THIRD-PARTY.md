# Third-party code

Every bundled component is compatible with GPL-3.0. Each keeps its own licence and copyright; where a file carries a header, it is kept.

| Component | Where | Licence | How it was confirmed |
|---|---|---|---|
| jsPDF 4.2.1 | `core-data/assets/vendor` | MIT | Upstream licence (earlier check) |
| QR code library | `core-data/assets/vendor` | MIT | Upstream licence (earlier check) |
| pdf.js 6.4.299 (Mozilla), legacy build | Tools (`pdf.worker.min.mjs`, `vendor/pdfjs/`) | Apache-2.0 | npm package `pdfjs-dist` |
| pdf.js image decoders: OpenJPEG, JBIG2 (from PDFium), qcms | Tools `vendor/pdfjs/wasm/` | BSD-2-Clause, BSD-3-Clause, MIT | The licence files next to each decoder |
| pdf-lib 1.17.1 | Tools | MIT | npm package |
| qpdf, WebAssembly build `@neslinesli93/qpdf-wasm` 0.3.0 (`qpdf.wasm`) | Tools | Apache-2.0 (qpdf); ISC (the package) | npm package and qpdf's licence |
| Tesseract.js 7.0.0 and tesseract.js-core 7.0.0, with `eng.traineddata` | Tools `vendor/tesseract/` | Apache-2.0 | npm packages; tesseract-ocr/tessdata states its data is Apache-2.0 |
| ONNX Runtime Web 1.30.0 (`ort-wasm-simd-threaded.wasm`) | Tools | MIT | npm package `onnxruntime-web` |
| U-2-Net `u2netp.onnx` | Tools `vendor/` | Apache-2.0 | Upstream xuebinqin/U-2-Net is Apache-2.0 and its author said the weights follow the repo licence |
| libheif-js 1.23.5 (libheif, WebAssembly) | Tools (`t-libheif-bundle-*.js`) | **LGPL-3.0** | npm package; libheif is LGPL. Combining with GPL-3.0 is allowed |
| @jsquash/avif 2.1.1 (libavif encoder, `avif_enc.wasm`) | Tools | Apache-2.0 (the package); BSD-2-Clause (libavif) | npm package |
| exifr 7.1.3, utif2 4.1.0, fflate 0.7.5, qrcode-generator 2.0.4, @noble/hashes 2.4.0 | Tools | MIT | npm packages |

Tools is built from its source in `tools-app/` (pinned in `tools-app/package-lock.json`); the bundled files keep their licence comments.

If you find an entry that is wrong, please open an issue.

## LGPL-3.0 note (libheif)

libheif is unmodified and is loaded as a separate file (`web/tools/assets/t-libheif-bundle-*.js`). You can replace it with your own build of libheif-js. The LGPL-3.0 text is at https://www.gnu.org/licenses/lgpl-3.0.html.

## Security review of the bundled libraries

Last checked 23 October 2026 with `npm audit` against the exact versions in the site: **no known advisory**. Run `python3 tests/repo/check_libraries.py --audit` to repeat it; CI runs the offline part on every push.

| Library | Version | Notes |
|---|---|---|
| pdf.js (Tools) | 6.4.299 | Replaces 3.11.174, which had GHSA-wgrm-67xf-hhpq. Versions 5.6.83 to 6.2.107 have GHSA-hq66-cqwq-w95j, so the check requires 6.2.108 or newer. The PDF tools open files with scripting turned off. |
| SheetJS | removed | Its last npm version (0.18.5) had GHSA-4r6h-8v6p-xvw6 and GHSA-5pgg-2g8v-p4x9 and gets no fixes there. Cards now writes Excel files with its own small writer, and the check fails if SheetJS comes back. |
| ONNX Runtime Web (Tools) | 1.30.0 | No advisory. Replaces 1.17.3, which could not be updated while Tools had no source. |
| libheif-js (Tools) | 1.23.5 | No advisory. The newest release. |
| jsPDF, pdf-lib, Tesseract.js, qpdf | 4.2.1, 1.17.1, 7.0.0, 0.3.0 | No advisory. `npm audit` on `tools-app/package-lock.json` finds nothing. React, JSZip, Sortable and framer-motion are no longer used. |
