# Tools: source

The source of the Tools page (`web/tools`). Plain JavaScript modules, bundled by esbuild; no framework.

```
python3 tools/build-tools.py              # builds into build/tools-new (a staging copy)
python3 tests/tools_new_test.py build/site-update-X.Y.Z.zip
python3 tools/build-tools.py --install    # builds into src/web/tools (replaces the live page)
```

- `src/tools.json`: the one list of tools (id, name, section, description, search words, icon, popular order). The app, the website's
  tool finder and the tests read it. A tool's id is its address (`#/tool/<id>`) and is kept in favourites, so do not rename ids.
- `src/main.js`: the page around the tools (sections, search, favourites, recent, Organise, Settings) and the `LOAD` table that maps
  each id to its module. `src/state.js`: what is remembered in the browser (`tools.v3`; the first visit carries over favourites and
  recent tools from the old app). `src/ui.js`: shared pieces (fields, drop zones, downloads, notices). `src/icons.js`, `src/styles.css`.
- `src/tools/<id>.js`: one file per tool, `export default function (root, ctx)`, loaded only when the tool is opened.
- `src/lib/image.js`: opening every image format (HEIC through libheif, TIFF through UTIF, the rest through the browser), saving as JPG, PNG, WebP or AVIF (the AVIF encoder's `avif_enc.wasm` is copied into `assets/` by `build.mjs`), shrinking to a target size, and the results list with Download All (ZIP).
- `src/lib/cropper.js`: the crop box (drag, corners, arrow keys) used by Quick Crop, Circle Crop and the ID photo. `static/vendor/u2netp.onnx` is the background-removal model; `build.mjs` also copies ONNX Runtime's `ort-wasm-simd-threaded.wasm` (its glue code is in the bundle, so only the .wasm path is set).
- Libraries come from npm, pinned to versions at least two weeks old (`package.json`, `package-lock.json`); Dependabot proposes updates.
- Text from users and files is only set with `textContent` or as a value. The page's security policy (`src/web/tools/.htaccess`) allows
  only this site's own scripts and WebAssembly.

## Status of the rebuild

The old, prebuilt Tools stays in `src/web/tools` until every tool is rebuilt here; then one release swaps it.

| Section | Built |
|---|---|
| Utilities (7) | QR Code Generator, Favicon Downloader and Maker, JSON Formatter, Text Tools, Password and UUID, Hash Generator, ZIP Creator |
| Images (10) | Rotate and Flip, Image Editor, Watermark Images, Color Picker and Palette, Screenshot Beautifier, SVG to PNG, Image to Base64, Image Converter (HEIC, TIFF, AVIF in and out), Image Compressor (target size), Image Resizer (social sizes, size cap) |
| Photos (8) | Background Remover (U-2-Net on ONNX Runtime 1.30, touch-up brush), Blur and Redact, Passport and ID Photo (print sheets), Meme and Text, Quick Crop, Circle Crop, Collage Maker (21 layouts, PDF), Photo Metadata (see and remove) |
| PDF (11) | not yet |
