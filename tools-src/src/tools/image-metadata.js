// Photo Metadata: see the camera, date and GPS location hidden in photos, and remove all of it before sharing.
import exifr from 'exifr';
import { h, button, dropzone, panel, busy, note } from '../ui.js';
import { ACCEPT, decode, encode, outName, results, each } from '../lib/image.js';

const fmtExp = (v) => (v ? (v < 1 ? '1/' + Math.round(1 / v) : v) + ' s' : '');
export async function readMeta(file) {
  let m = null; try { m = await exifr.parse(file, { tiff: true, exif: true, gps: true, ifd0: true, xmp: false, icc: false, iptc: true, mergeOutput: true }); } catch (e) { m = null; }
  if (!m) return { rows: [], gps: null, any: false };
  const date = m.DateTimeOriginal || m.CreateDate || m.ModifyDate;
  const rows = [['Camera', [m.Make, m.Model].filter(Boolean).join(' ')], ['Lens', m.LensModel || ''], ['Taken', date instanceof Date ? date.toLocaleString() : date ? String(date) : ''],
    ['Exposure', [fmtExp(m.ExposureTime), m.FNumber ? 'f/' + m.FNumber : '', m.ISO ? 'ISO ' + m.ISO : ''].filter(Boolean).join(' · ')], ['Software', m.Software || ''], ['Author', m.Artist || m.Copyright || m.byline || '']].filter(([, v]) => v);
  const gps = typeof m.latitude === 'number' && typeof m.longitude === 'number' ? { lat: m.latitude, lon: m.longitude } : null;
  return { rows, gps, any: rows.length > 0 || !!gps };
}
export default function (root) {
  let files = [];
  const list = h('div', { 'aria-live': 'polite' }), prog = h('p', { class: 'hint', 'aria-live': 'polite' }), out = h('div');
  async function show() {
    list.replaceChildren();
    for (const f of files) {
      const m = await readMeta(f);
      list.append(panel(h('h2', { text: f.name }), !m.any ? note('No camera details or location found.') : h('ul', { class: 'flist' },
        m.rows.map(([k, v]) => h('li', {}, h('b', { text: k }), h('span', { text: v }))),
        m.gps ? h('li', {}, h('b', { text: 'Location' }), h('span', { text: m.gps.lat.toFixed(5) + ', ' + m.gps.lon.toFixed(5) }), h('a', { href: 'https://www.openstreetmap.org/?mlat=' + m.gps.lat + '&mlon=' + m.gps.lon + '#map=16/' + m.gps.lat + '/' + m.gps.lon, target: '_blank', rel: 'noopener', text: 'Map' })) : null),
      m.gps ? note('This photo shows where it was taken. Remove the metadata before you share it.', true) : null));
    }
  }
  const go = button('Remove Metadata and Save', { primary: true, icon: 'eraser' });
  go.addEventListener('click', () => busy(go, async () => {
    if (!files.length) return;
    results(out, await each(files, prog, async (f) => { const fmt = ['png', 'webp'].includes((f.name.match(/\.(\w+)$/) || [])[1]?.toLowerCase()) ? f.name.match(/\.(\w+)$/)[1].toLowerCase() : 'jpg'; return { name: outName(f.name, fmt, 'clean'), blob: await encode(await decode(f), fmt, 0.95), before: f.size }; }), 'clean-photos.zip');
    out.prepend(note('Saved without any metadata. The photos were re-saved at high quality and keep their upright orientation.'));
  }));
  root.append(dropzone({ accept: ACCEPT, multiple: true, label: 'Choose photos', onFiles: async (fs) => { files = fs; out.replaceChildren(); await show(); } }), panel(go, prog, out), list);
}
