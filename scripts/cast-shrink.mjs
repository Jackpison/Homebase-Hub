// Shrinks one 3D model for the Home characters (scripts/cast_assets.py runs it; not part of the site).
//   node scripts/cast-shrink.mjs IN OUT.glb [keep1,keep2,...] [simplify]
// Keeps only the named animations, merges duplicates, drops near-identical keyframes, stores numbers in fewer bytes
// (three.js reads that natively) and, with "simplify", lowers the triangle count a little. Textures are embedded.
// Needs: npm i --no-save @gltf-transform/core@4.1.1 @gltf-transform/functions@4.1.1 @gltf-transform/extensions@4.1.1 meshoptimizer@0.22.0
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, resample, quantize, weld, simplify } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
const [, , inp, out, keepArg, simp] = process.argv;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inp);
const keep = keepArg ? keepArg.split(',') : null;
if (keep) for (const a of doc.getRoot().listAnimations()) if (!keep.includes(a.getName())) a.dispose();
const steps = [dedup(), resample({ tolerance: 2e-3 })];
if (simp) { await MeshoptSimplifier.ready; steps.push(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: 0.55, error: 0.004, lockBorder: true })); }
steps.push(prune(), quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeWeight: 8 }));
await doc.transform(...steps);
await io.write(out, doc);
