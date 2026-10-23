# Third-party code

Every bundled component is compatible with GPL-3.0. Each keeps its own licence and copyright; where a file carries a header, it is kept.

| Component | Where | Licence | How it was confirmed |
|---|---|---|---|
| jsPDF 4.2.1 | `core-data/assets/vendor` | MIT | Upstream licence (earlier check) |
| QR code library | `core-data/assets/vendor` | MIT | Upstream licence (earlier check) |
| JSZip 3.10.2 | Tools | MIT or GPL-3.0 (dual); used under MIT | Licence line in the file header |
| pdf.js 6.4.299 (Mozilla), legacy build | Tools `pdfjs6/` | Apache-2.0 | `pdfjs6/LICENSE.txt` from the npm package `pdfjs-dist` |
| pdf.js image decoders: OpenJPEG, JBIG2 (from PDFium), qcms | Tools `pdfjs6/wasm/` | BSD-2-Clause, BSD-3-Clause, MIT | The licence files next to each decoder in `pdfjs6/wasm/` |
| lucide-react 0.460.0 | Tools | ISC | `@license` header in the bundle |
| React | Tools | MIT | `@license` header in the bundle |
| libheif-js (libheif, WebAssembly) | Tools (`libheif-bundle`) | **LGPL-3.0** | npm package page; libheif is LGPL. Combining with GPL-3.0 is allowed. Source: https://github.com/catdad-experiments/libheif-js and https://github.com/strukturag/libheif |
| qpdf (WebAssembly, `qpdf.wasm`) | Tools | Apache-2.0 | qpdf's licence page; npm `@jspawn/qpdf-wasm` is Apache-2.0 |
| Tesseract OCR engine and `eng.traineddata` | Tools `vendor/` | Apache-2.0 | tesseract-ocr/tessdata states all its data is Apache-2.0 |
| U-2-Net `u2netp.onnx` | Tools `vendor/` | Apache-2.0 | Upstream xuebinqin/U-2-Net is Apache-2.0 and its author said the weights follow the repo licence. The model was trained on the DUTS dataset; that dataset's own terms were not reviewed. |
| ONNX Runtime Web (`ort-wasm-simd.wasm`) | Tools `vendor/` | MIT | Upstream licence (not re-verified in this review) |
| pdf-lib, exifr, UTIF.js, Sortable, pako, fflate, framer-motion | Tools | MIT (pako: MIT and zlib) | Upstream licences (not re-verified file by file) |

If you find an entry that is wrong, please open an issue.

## LGPL-3.0 note (libheif)

libheif is unmodified and is loaded as a separate file (`web/tools/assets/libheif-bundle-*.js`). You can replace it with your own build of libheif-js. The LGPL-3.0 text is at https://www.gnu.org/licenses/lgpl-3.0.html.

## Security review of the bundled libraries

Last checked 23 October 2026 with `npm audit` against the exact versions in the site: **no known advisory**. Run `python3 tests/check_libraries.py --audit` to repeat it; CI runs the offline part on every push.

| Library | Version | Notes |
|---|---|---|
| pdf.js (Tools) | 6.4.299 | Replaces 3.11.174, which had GHSA-wgrm-67xf-hhpq. Versions 5.6.83 to 6.2.107 have GHSA-hq66-cqwq-w95j, so the check requires 6.2.108 or newer. The PDF tools open files with scripting turned off. |
| SheetJS | removed | Its last npm version (0.18.5) had GHSA-4r6h-8v6p-xvw6 and GHSA-5pgg-2g8v-p4x9 and gets no fixes there. Cards now writes Excel files with its own small writer, and the check fails if SheetJS comes back. |
| ONNX Runtime Web (Tools) | 1.17.3 | No advisory. Older than the current release; it only runs the bundled background-removal model. |
| libheif-js (Tools) | 1.23.5 | No advisory. The newest release. |
| JSZip, jsPDF, React, pdf-lib | 3.10.2, 4.2.1, 18.3.1, 1.17.1 | No advisory. |
