# Third-party code

Status as of 1.38.0. Every bundled component is compatible with GPL-3.0. Each keeps its own licence and copyright; where a file carries a header, it is kept.

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
