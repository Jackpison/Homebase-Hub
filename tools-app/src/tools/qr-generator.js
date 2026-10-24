// QR Code Generator: links, text, Wi-Fi, email and phone, in your colours, as PNG or SVG.
import qrcode from 'qrcode-generator';
import { h, field, input, textarea, select, seg, range, button, download, panel, note } from '../ui.js';
qrcode.stringToBytes = (s) => Array.from(new TextEncoder().encode(s));   // UTF-8, so any language and emoji work

const wesc = (s) => s.replace(/([\\;,:"])/g, '\\$1');
const lum = (hex) => { const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };

export default function (root) {
  const F = {
    url: input({ type: 'url', value: 'https://', placeholder: 'https://example.com' }), text: textarea({ rows: 4, placeholder: 'Any text' }),
    ssid: input({ placeholder: 'Network name' }), pass: input({ placeholder: 'Password' }), sec: select([['WPA', 'WPA or WPA2'], ['WEP', 'WEP'], ['nopass', 'No password']], 'WPA'),
    email: input({ type: 'email', placeholder: 'name@example.com' }), subject: input({ placeholder: 'Optional' }), body: textarea({ rows: 3, placeholder: 'Optional' }),
    tel: input({ type: 'tel', placeholder: '+91 98765 43210' }),
  };
  const fg = h('input', { type: 'color', value: '#000000' }), bg = h('input', { type: 'color', value: '#ffffff' });
  const ec = select([['L', 'Low (7%)'], ['M', 'Medium (15%)'], ['Q', 'Quartile (25%)'], ['H', 'High (30%)']], 'M');
  const size = range('Size', 128, 2048, 32, 512, (v) => v + ' px', () => draw());
  const margin = range('Quiet border', 0, 8, 1, 4, (v) => v + ' squares', () => draw());
  const fields = h('div');
  const kind = seg('What it holds', [['url', 'Link'], ['text', 'Text'], ['wifi', 'Wi-Fi'], ['email', 'Email'], ['tel', 'Phone']], 'url', () => { layout(); draw(); });
  const canvas = h('canvas', { width: 512, height: 512, 'aria-label': 'QR code preview', role: 'img' });
  const msg = h('div');
  let svgText = '';
  function layout() {
    const k = kind.value;
    fields.replaceChildren(...(k === 'url' ? [field('Link', F.url)] : k === 'text' ? [field('Text', F.text)] : k === 'wifi' ? [field('Network name', F.ssid), field('Password', F.pass), field('Security', F.sec)]
      : k === 'email' ? [field('Email address', F.email), field('Subject', F.subject), field('Message', F.body)] : [field('Phone number', F.tel)]));
  }
  function payload() {
    const k = kind.value;
    if (k === 'url') return F.url.value.trim() === 'https://' ? '' : F.url.value.trim();
    if (k === 'text') return F.text.value;
    if (k === 'wifi') return F.ssid.value ? 'WIFI:T:' + F.sec.value + ';S:' + wesc(F.ssid.value) + ';' + (F.sec.value === 'nopass' ? '' : 'P:' + wesc(F.pass.value) + ';') + ';' : '';
    if (k === 'email') { if (!F.email.value.trim()) return ''; const q = new URLSearchParams(); if (F.subject.value) q.set('subject', F.subject.value); if (F.body.value) q.set('body', F.body.value); const s = q.toString().replace(/\+/g, '%20'); return 'mailto:' + F.email.value.trim() + (s ? '?' + s : ''); }
    return F.tel.value.trim() ? 'tel:' + F.tel.value.replace(/[^\d+]/g, '') : '';
  }
  function draw() {
    const data = payload(), ctx = canvas.getContext('2d');
    msg.replaceChildren(); svgText = '';
    if (!data) { canvas.width = canvas.height = 1; msg.append(note('Fill in the fields to see your code.')); return; }
    let qr;
    try { qr = qrcode(0, ec.value); qr.addData(data, 'Byte'); qr.make(); }
    catch (e) { canvas.width = canvas.height = 1; msg.append(note('That is too much for one QR code. Shorten it, or pick a lower error correction.', true)); return; }
    const n = qr.getModuleCount(), m = margin.value, total = n + m * 2, px = size.value, cell = px / total;
    canvas.width = canvas.height = px;
    ctx.fillStyle = bg.value; ctx.fillRect(0, 0, px, px); ctx.fillStyle = fg.value;
    let path = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) {
      ctx.fillRect(Math.floor((c + m) * cell), Math.floor((r + m) * cell), Math.ceil(cell), Math.ceil(cell));
      path += 'M' + (c + m) + ' ' + (r + m) + 'h1v1h-1z';
    }
    svgText = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + ' ' + total + '" width="' + px + '" height="' + px + '" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="' + bg.value + '"/><path fill="' + fg.value + '" d="' + path + '"/></svg>';
    const a = lum(fg.value), b = lum(bg.value), ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    if (ratio < 3) msg.append(note('These colours are close: some phones may not read the code. Use a darker code on a lighter background.', true));
    else if (a > b) msg.append(note('A light code on a dark background does not scan on every phone.'));
  }
  for (const el of [...Object.values(F), fg, bg, ec]) el.addEventListener('input', draw);
  layout();
  root.append(h('div', { class: 'cols' },
    panel(kind.el, fields, h('div', { class: 'row' }, field('Code colour', fg), field('Background', bg)), field('Error correction', ec, 'Higher correction still reads when part of the code is covered, but makes it denser.'), size.el, margin.el),
    panel(h('div', { class: 'preview' }, canvas), msg, h('div', { class: 'row' },
      button('Download PNG', { primary: true, icon: 'download', onClick: () => { if (!svgText) return; canvas.toBlob((b) => download(b, 'qr-code.png'), 'image/png'); } }),
      button('Download SVG', { icon: 'download', onClick: () => { if (svgText) download(new Blob([svgText], { type: 'image/svg+xml' }), 'qr-code.svg'); } })))));
  draw();
}
