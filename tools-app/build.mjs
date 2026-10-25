// Builds the Tools page from tools-app/src into a folder shaped like src/web/tools (index.html, sw.js, assets/).
//   node tools-app/build.mjs [--out DIR]      default: build/tools-new (a staging copy; the live page is not touched)
// Each tool becomes its own file, loaded when it is opened. The fingerprint of assets/ goes into the page and the service worker,
// so a browser's saved copy is refreshed exactly when something changed.
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.dirname(HERE);
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = path.resolve(arg('--out', path.join(ROOT, 'build', 'tools-new')));
const A = path.join(OUT, 'assets');
fs.rmSync(A, { recursive: true, force: true }); fs.mkdirSync(A, { recursive: true });

const r = await build({
  entryPoints: [path.join(HERE, 'src', 'main.js')], bundle: true, splitting: true, format: 'esm', minify: true, target: ['es2021'],
  outdir: A, entryNames: 'app-[hash]', chunkNames: 't-[name]-[hash]', assetNames: '[name]-[hash]', legalComments: 'eof', metafile: true, logLevel: 'warning',
  loader: { '.json': 'json', '.wasm': 'file' },
  external: ['fs', 'path'],   // qpdf's Node-only branch; never runs in a browser
});
// WebAssembly that a library loads next to its own script (new URL('x.wasm', import.meta.url)): copied into assets/
for (const w of ['pdfjs-dist/legacy/build/pdf.worker.min.mjs', '@neslinesli93/qpdf-wasm/dist/qpdf.wasm'])
  fs.copyFileSync(path.join(HERE, 'node_modules', w), path.join(A, path.basename(w)));
// pdf.js's image decoders (JPEG 2000, JBIG2, colour profiles). Not its character maps (.bcmap) or standard fonts (.pfb): a site update may only
// hold the file types the updater accepts (UP_EXT in update.php), and older sites refuse anything else. Without them pdf.js uses system fonts.
// Not quickjs either: it runs scripts inside PDFs, which the tools switch off (isEvalSupported: false). Licence files get a .txt name.
fs.mkdirSync(path.join(A, 'vendor/pdfjs/wasm'), { recursive: true });
for (const f of fs.readdirSync(path.join(HERE, 'node_modules/pdfjs-dist/wasm'))) if (!f.startsWith('quickjs-eval')) fs.copyFileSync(path.join(HERE, 'node_modules/pdfjs-dist/wasm', f), path.join(A, 'vendor/pdfjs/wasm', /\./.test(f) ? f : f + '.txt'));
fs.copyFileSync(path.join(HERE, 'node_modules/pdfjs-dist/LICENSE'), path.join(A, 'vendor/pdfjs/LICENSE.txt'));
fs.mkdirSync(path.join(A, 'vendor/tesseract'), { recursive: true });
for (const f of ['tesseract.js/dist/worker.min.js', 'tesseract.js-core/tesseract-core-simd-lstm.wasm.js'])   // the SIMD core only: every current browser has WebAssembly SIMD
  fs.copyFileSync(path.join(HERE, 'node_modules', f), path.join(A, 'vendor/tesseract', path.basename(f)));
for (const w of ['@jsquash/avif/codec/enc/avif_enc.wasm', 'onnxruntime-web/dist/ort-wasm-simd-threaded.wasm']) fs.copyFileSync(path.join(HERE, 'node_modules', w), path.join(A, path.basename(w)));
for (const d of fs.readdirSync(path.join(HERE, 'static'))) if (d !== 'sw.js' && fs.statSync(path.join(HERE, 'static', d)).isDirectory()) fs.cpSync(path.join(HERE, 'static', d), path.join(A, d), { recursive: true });

// fingerprint of every file in assets/
const files = []; (function walk(d) { for (const f of fs.readdirSync(d).sort()) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else files.push(p); } })(A);
const hsh = createHash('sha256'); for (const f of files) { hsh.update(path.relative(A, f)); hsh.update(fs.readFileSync(f)); }
const REV = hsh.digest('hex').slice(0, 8);
const outs = Object.keys(r.metafile.outputs).map((p) => path.basename(p));
const js = outs.find((f) => /^app-.*\.js$/.test(f)), css = outs.find((f) => /^app-.*\.css$/.test(f));
const HUB = (fs.readFileSync(path.join(ROOT, 'src/web/core-data/lib/boot.php'), 'utf8').match(/define\('HUB', '([^']+)'\)/) || [])[1];
fs.writeFileSync(path.join(OUT, 'index.html'), `<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Tools</title>
  <meta name="description" content="Tools for images, photos, PDFs and everyday jobs. Everything runs in your browser.">
  <link rel="stylesheet" href="../core-data/assets/shell.css?v=${HUB}">
  <script src="../core-data/assets/shell.js?v=${HUB}" data-app="tools"></script>
  <link rel="stylesheet" href="./assets/${css}?v=${REV}">
  <script type="module" src="./assets/${js}?v=${REV}"></script>
<!-- install on a phone or computer: Settings > General > Install on Your Phone -->
<link rel="manifest" href="../core-data/api.php?action=manifest">
<meta name="theme-color" content="#1a1a1a">
<link rel="apple-touch-icon" href="../core-data/assets/brand/apple-touch-icon.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
</head>
<body>
  <div id="root"></div>
</body>
</html>
`);
fs.writeFileSync(path.join(OUT, 'sw.js'), fs.readFileSync(path.join(HERE, 'static', 'sw.js'), 'utf8').replace('__REV__', REV));
let total = 0; for (const f of files) total += fs.statSync(f).size;
console.log(`Tools built into ${path.relative(ROOT, OUT) || OUT}: ${files.length} files, ${(total / 1024).toFixed(0)} KB, fingerprint ${REV}`);
