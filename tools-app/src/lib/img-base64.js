// Image to Base64: data URIs, CSS and HTML snippets from an image, or Base64 back into a file.
import { h, field, textarea, seg, button, dropzone, panel, copyText, download, note, bytes } from '../ui.js';

const SIG = [['png', 'image/png', [0x89, 0x50, 0x4e, 0x47]], ['jpg', 'image/jpeg', [0xff, 0xd8, 0xff]], ['gif', 'image/gif', [0x47, 0x49, 0x46]], ['webp', 'image/webp', [0x52, 0x49, 0x46, 0x46]], ['bmp', 'image/bmp', [0x42, 0x4d]], ['ico', 'image/x-icon', [0, 0, 1, 0]]];
const toB64 = (buf) => { const b = new Uint8Array(buf); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
export function fromB64(text) {
  let t = text.trim(), mime = null;
  const m = /^data:([\w/+.-]+)?(;[^,]*)?,/i.exec(t); if (m) { mime = m[1] || null; t = t.slice(m[0].length); }
  t = t.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/'); t = t.padEnd(Math.ceil(t.length / 4) * 4, '=');
  let bin; try { bin = atob(t); } catch (e) { throw new Error('That is not valid Base64.'); }
  const bytes2 = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  let ext = 'bin';
  const hit = SIG.find(([, , s]) => s.every((v, i) => bytes2[i] === v)); if (hit) { ext = hit[0]; mime = mime || hit[1]; }
  if (!hit && /^\s*<(\?xml|svg)/i.test(new TextDecoder().decode(bytes2.slice(0, 200)))) { ext = 'svg'; mime = 'image/svg+xml'; }
  if (mime === 'image/svg+xml') ext = 'svg';
  return { blob: new Blob([bytes2], { type: mime || 'application/octet-stream' }), ext, mime };
}
export default function (root) {
  const area = h('div');
  const tab = seg('', [['to', 'Image to Base64'], ['from', 'Base64 to Image']], 'to', () => show());
  function show() {
    if (tab.value === 'to') {
      const out = h('div');
      area.replaceChildren(dropzone({ accept: 'image/*,.svg,.ico', label: 'Choose an image', onFiles: async ([f]) => {
        const uri = 'data:' + (f.type || 'application/octet-stream') + ';base64,' + toB64(await f.arrayBuffer());
        const snips = [['Data URI', uri], ['CSS', 'background-image: url("' + uri + '");'], ['HTML', '<img src="' + uri + '" alt="">'], ['Base64 only', uri.slice(uri.indexOf(',') + 1)]];
        out.replaceChildren(note(f.name + ': ' + bytes(f.size) + ' becomes ' + bytes(uri.length) + ' of text (Base64 is about a third larger).' + (f.size > 1048576 ? ' Images this big are better as normal files.' : '')),
          ...snips.map(([l, v]) => panel(field(l, textarea({ rows: 3, readonly: true, value: v })), button('Copy ' + l, { icon: 'copy', small: true, onClick: () => copyText(v) }))));
      } }), out);
    } else {
      const t = textarea({ rows: 8, placeholder: 'data:image/png;base64,iVBORw0KGgo… or just the Base64 text', 'aria-label': 'Base64 text' }), out = h('div', { 'aria-live': 'polite' });
      const go = button('Make the File', { primary: true, onClick: () => {
        out.replaceChildren();
        try {
          const r = fromB64(t.value), url = URL.createObjectURL(r.blob);
          out.append(note('A ' + r.ext.toUpperCase() + ' file of ' + bytes(r.blob.size) + '.'), r.mime && r.mime.startsWith('image/') ? h('div', { class: 'preview' }, h('img', { src: url, alt: 'The decoded image' })) : null,
            button('Download image.' + r.ext, { icon: 'download', onClick: () => download(r.blob, 'image.' + r.ext) }));
        } catch (e) { out.append(note(e.message, true)); }
      } });
      area.replaceChildren(panel(field('Base64 or data URI', t), go, out));
    }
  }
  root.append(h('div', { class: 'field' }, tab.el), area); show();
}
