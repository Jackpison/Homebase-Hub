# Third-party code

Every bundled component is compatible with GPL-3.0. Each keeps its own licence and copyright; where a file carries a header, it is kept.

| Component | Where | Licence | How it was confirmed |
|---|---|---|---|
| jsPDF 4.2.1 | `core-data/assets/vendor` | MIT | Upstream licence (earlier check) |
| QR code library | `core-data/assets/vendor` | MIT | Upstream licence (earlier check) |
| xlsx / SheetJS 0.18.5 | `core-data/assets/vendor` | Apache-2.0 | Upstream licence (earlier check) |
| JSZip 3.10.2 | Tools | MIT or GPL-3.0 (dual); used under MIT | Licence line in the file header |
| pdf.js (Mozilla) | Tools | Apache-2.0 | Licence header in `pdf.worker.min` |
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

## Security review of the bundled libraries (23 October 2026)

Checked with `npm audit` against the exact versions in the site, and by reading how the site calls each library. Run `python3 tests/check_libraries.py --audit` to repeat it.

| Library | Version | Finding | Why it cannot be reached here |
|---|---|---|---|
| pdf.js (Tools) | 3.11.174 | GHSA-wgrm-67xf-hhpq: a crafted PDF can run script when fonts are compiled with eval. Fixed upstream in newer major versions. | Tools opens every PDF with `isEvalSupported:false`, the fix the pdf.js team documents for older versions. `tests/check_libraries.py` fails if any call stops setting it. Updating pdf.js itself needs a rebuild of Tools, which is planned for a later version. |
| SheetJS (Cards) | 0.18.5 | GHSA-4r6h-8v6p-xvw6 (prototype pollution) and GHSA-5pgg-2g8v-p4x9 (ReDoS). Both need a crafted Excel file to be read. SheetJS no longer publishes new versions to npm. | The site only writes Excel files (the Cards export) and never reads one. The check fails if any code calls `XLSX.read` or `XLSX.readFile`. |
| ONNX Runtime Web (Tools) | 1.17.3 | No advisory. Older than the current release. | It only runs the bundled background-removal model. |
| libheif-js (Tools) | 1.23.5 | No advisory. This is the newest release. | Runs inside WebAssembly in the visitor's browser. |
| JSZip, jsPDF, React, pdf-lib | 3.10.2, 4.2.1, 18.3.1, 1.17.1 | No advisory. | |

`npm audit` also lists `tar`, a helper that pdfjs-dist uses only when it is installed for Node. It is not part of the browser files that ship with the site.
