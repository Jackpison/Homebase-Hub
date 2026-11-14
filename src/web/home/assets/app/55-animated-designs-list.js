/* ---------- Animated Designs (1.74.0): the list in Background, Preview, and each design's options ---------- */
const dzInfo = () => ADMIN.designsInfo || {};
const dzDraft = id => { if (!bgDraft.designs || Array.isArray(bgDraft.designs)) bgDraft.designs = {}; return (bgDraft.designs[id] ||= { on:true, opts:{} }); };   // an empty list arrives from PHP as [], which cannot carry named entries
const dzProps = id => ({ ...dzInfo()[id].defaults, ...dzDraft(id).opts });
const dzColors = id => {
  const p = dzProps(id), out = [];
  dzInfo()[id].options.forEach(o => { if (o.type === 'color') out.push(p[o.k]); else if (o.type === 'colors') out.push(...(p[o.k] || [])); });
  ['horizonColor', 'waveColor', 'color', 'color1', 'color2', 'color3'].forEach(k => { if (typeof p[k] === 'string' && !out.includes(p[k])) out.push(p[k]); });
  return out.filter(c => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 3);
};
const dzGrad = id => { const c = dzColors(id); while (c.length < 2) c.push('#14141c'); return `linear-gradient(135deg,#0b0b12 0%,${c[0]} 50%,${c[1]} 100%)`; };
function dzItem(id){
  const d = dzInfo()[id];
  return { url:'design:' + id, type:'design', credit:'From React Bits', link:d.link, src:'design', design:{ id, props:dzProps(id), desktop:d.desktop, gpu:d.gpu, still:d.still, dpr:d.dpr } };
}
function dzShow(id){ BG.nextUp = null; BG.preloading = null; BG.show(dzItem(id), { count:false }); }
function renderDesigns(){
  const ids = Object.keys(dzInfo());
  $('#designRows').innerHTML = ids.map(id => {
    const d = dzInfo()[id], here = designOk({ type:'design', design:d }), st = dzDraft(id);
    return `<div class="dz${here ? '' : ' nope'}" data-id="${id}"><span class="dz-sw" aria-hidden="true" style="--dzg:${esc(dzGrad(id))}"></span>
      <div class="dz-b"><b>${esc(d.name)}${d.desktop ? ' <span class="pill soft">Computers Only</span>' : ''}${BG.cur === 'design:' + id ? ' <span class="pill">On Screen</span>' : ''}</b><small>${esc(d.about)}${here ? '' : ' Not available on this device.'}</small></div>
      <div class="dz-a"><label class="dz-on"><input type="checkbox" class="switch" data-z="on"${st.on ? ' checked' : ''} aria-label="Include ${esc(d.name)} in Animated Designs"></label>
      <button type="button" class="btn small" data-z="preview"${here ? '' : ' disabled'}>Preview</button><button type="button" class="btn small" data-z="opts">Options</button></div></div>`;
  }).join('');
}
let dzEdit = '', dzTimer = 0;
function drawDesignOpts(){
  const id = dzEdit, d = dzInfo()[id], p = dzProps(id);
  $('#designTitle').textContent = d.name;
  $('#designOpts').innerHTML = d.options.map(o => {
    if (o.type === 'color') return `<label class="field"><span>${esc(o.label)}</span><input type="color" data-o="${o.k}" value="${esc(p[o.k])}"></label>`;
    if (o.type === 'colors'){
      const l = p[o.k] || [];
      return `<div class="field"><span>${esc(o.label)}</span><div class="dz-cols">${l.map((c, i) => `<input type="color" data-o="${o.k}" data-i="${i}" value="${esc(c)}" aria-label="${esc(o.label)} ${i + 1}">`).join('')}
        ${l.length < o.max ? `<button type="button" class="btn small" data-oa="${o.k}">Add Color</button>` : ''}${l.length > 1 ? `<button type="button" class="btn small" data-or="${o.k}">Remove Last</button>` : ''}</div></div>`;
    }
    if (o.type === 'range') return `<label class="field"><span>${esc(o.label)} <b data-v="${o.k}">${+p[o.k]}</b></span><input type="range" data-o="${o.k}" min="${o.min}" max="${o.max}" step="${o.step}" value="${+p[o.k]}"></label>`;
    return `<div class="field"><span>${esc(o.label)}</span><div class="seg" role="radiogroup" aria-label="${esc(o.label)}">${o.choices.map(c => `<button type="button" role="radio" data-oc="${o.k}" data-v="${esc(c)}" aria-checked="${p[o.k] === c}">${esc(c[0].toUpperCase() + c.slice(1))}</button>`).join('')}</div></div>`;
  }).join('');
}
function dzSet(k, v){
  const st = dzDraft(dzEdit); st.opts = { ...st.opts, [k]:v };
  renderDesigns(); renderThemes();
  clearTimeout(dzTimer); dzTimer = setTimeout(() => dzShow(dzEdit), 350);   // the background follows your change
}
$('#designRows').addEventListener('click', e => {
  const b = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('button[data-z]')); if (!b) return;
  const id = /** @type {HTMLElement} */ (b.closest('[data-id]')).dataset.id;
  if (b.dataset.z === 'preview') dzShow(id);
  else if (b.dataset.z === 'opts'){ dzEdit = id; drawDesignOpts(); openSheet('designSheet'); }
});
$('#designRows').addEventListener('change', e => {
  const c = /** @type {HTMLInputElement | null} */ (/** @type {Element} */ (e.target).closest('input[data-z="on"]')); if (!c) return;
  dzDraft(/** @type {HTMLElement} */ (c.closest('[data-id]')).dataset.id).on = c.checked; renderThemes();
});
$('#designOpts').addEventListener('input', e => {
  const t = /** @type {HTMLInputElement} */ (e.target), k = t.dataset.o; if (!k) return;
  const o = dzInfo()[dzEdit].options.find(x => x.k === k);
  if (o.type === 'range'){ const q = $('[data-v="' + k + '"]'); if (q) q.textContent = t.value; dzSet(k, +t.value); }
  else if (o.type === 'color') dzSet(k, t.value);
  else if (o.type === 'colors'){ const l = [...dzProps(dzEdit)[k]]; l[+t.dataset.i] = t.value; dzSet(k, l); }
});
$('#designOpts').addEventListener('click', e => {
  const b = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('button')); if (!b) return;
  if (b.dataset.oc){ dzSet(b.dataset.oc, b.dataset.v); drawDesignOpts(); }
  else if (b.dataset.oa){ const l = [...dzProps(dzEdit)[b.dataset.oa]]; l.push(l[l.length - 1]); dzSet(b.dataset.oa, l); drawDesignOpts(); }
  else if (b.dataset.or){ const l = [...dzProps(dzEdit)[b.dataset.or]]; l.pop(); dzSet(b.dataset.or, l); drawDesignOpts(); }
});
$('#designReset').addEventListener('click', () => { dzDraft(dzEdit).opts = {}; drawDesignOpts(); renderDesigns(); renderThemes(); dzShow(dzEdit); });
$('#designForm').addEventListener('submit', () => closeSheet('designSheet'));

/* Your own theme: a name and the uploads it takes turns with. Kept in bgDraft until Save Background. */
let themeEdit = null;
function openTheme(id){
  const t = id ? bgDraft.themes.find(x => x.id === id) : null;
  themeEdit = { id, name:t ? t.name : '', items:t ? [...t.items] : [] };
  $('#themeTitle').textContent = t ? 'Edit Theme' : 'New Theme';
  $('#tDelete').hidden = !t;
  $('#tName').value = themeEdit.name;
  drawThemePick();
  openSheet('themeSheet');
}
function drawThemePick(){
  const ups = ADMIN.uploadsAdmin || [];
  const designs = Object.keys(dzInfo()).map(id => `<label class="thumb dzp${themeEdit.items.includes('design:' + id) ? ' sel' : ''}"><span class="dz-sw" aria-hidden="true" style="--dzg:${esc(dzGrad(id))}"></span><span class="badge">${esc(dzInfo()[id].name)}</span>
      <input type="checkbox" data-u="design:${id}"${themeEdit.items.includes('design:' + id) ? ' checked' : ''} aria-label="Use ${esc(dzInfo()[id].name)}"></label>`).join('');
  $('#tPick').innerHTML = ups.map(u => `<label class="thumb${themeEdit.items.includes(u.url) ? ' sel' : ''}">
      ${u.type === 'video' ? `<video src="${esc(media(u.url))}#t=0.5" muted preload="metadata"></video><span class="badge">Video</span>` : `<img src="${esc(media(u.url))}" alt="" loading="lazy">`}
      <input type="checkbox" data-u="${esc(u.url)}"${themeEdit.items.includes(u.url) ? ' checked' : ''} aria-label="Use this background"></label>`).join('') + designs;
  $('#tCount').textContent = themeEdit.items.length ? '(' + themeEdit.items.length + ' chosen)' : '';
}
$('#tPick').addEventListener('change', e => {
  const c = e.target.closest('[data-u]'); if (!c) return;
  themeEdit.items = c.checked ? [...themeEdit.items, c.dataset.u] : themeEdit.items.filter(u => u !== c.dataset.u);
  c.closest('.thumb').classList.toggle('sel', c.checked);
  $('#tCount').textContent = themeEdit.items.length ? '(' + themeEdit.items.length + ' chosen)' : '';
});
$('#themeForm').addEventListener('submit', e => {
  const name = $('#tName').value.trim();
  if (!name){ e.preventDefault(); $('#tName').focus(); return; }
  if (!themeEdit.items.length){ e.preventDefault(); toast('Choose at least one background.', true); return; }
  bgDraft.themes = bgDraft.themes || [];
  const t = themeEdit.id && bgDraft.themes.find(x => x.id === themeEdit.id);
  if (t) Object.assign(t, { name, items:themeEdit.items });
  else { const id = crypto.getRandomValues(new Uint32Array(1))[0].toString(16).padStart(8, '0'); bgDraft.themes.push({ id, name, items:themeEdit.items }); bgDraft.theme = 't:' + id; }
  renderThemes();
});
$('#tDelete').addEventListener('click', () => {
  bgDraft.themes = bgDraft.themes.filter(x => x.id !== themeEdit.id);
  if (bgDraft.theme === 't:' + themeEdit.id) bgDraft.theme = bgDraft.starterOff ? 'online' : 'starter';
  closeSheet('themeSheet'); renderThemes();
});

/* A theme file is a plain zip (stored, not compressed: pictures and videos are compressed already) with theme.json and the files. */
const ZIP = (() => {
  const CRC = new Uint32Array(256);
  for (let n = 0; n < 256; n++){ let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; }
  const crc = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const enc = new TextEncoder();
  function make(files){   // [[name, Uint8Array]] -> Blob
    const parts = [], cd = []; let off = 0;
    for (const [name, d] of files){
      const n = enc.encode(name), c = crc(d), h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint32(14, c, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true); h.setUint16(26, n.length, true);
      parts.push(new Uint8Array(h.buffer), n, d);
      const e = new DataView(new ArrayBuffer(46));
      e.setUint32(0, 0x02014b50, true); e.setUint16(4, 20, true); e.setUint16(6, 20, true); e.setUint16(8, 0x0800, true); e.setUint32(16, c, true); e.setUint32(20, d.length, true); e.setUint32(24, d.length, true); e.setUint16(28, n.length, true); e.setUint32(42, off, true);
      cd.push(new Uint8Array(e.buffer), n); off += 30 + n.length + d.length;
    }
    const len = cd.reduce((s, x) => s + x.length, 0), end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, len, true); end.setUint32(16, off, true);
    return new Blob([...parts, ...cd, new Uint8Array(end.buffer)], { type:'application/zip' });
  }
  function read(buf){   // a zip made by make() -> { name: Uint8Array }; null for anything else
    const v = new DataView(buf), out = {}, dec = new TextDecoder(); let p = 0;
    while (p + 30 <= buf.byteLength && v.getUint32(p, true) === 0x04034b50){
      if (v.getUint16(p + 8, true) !== 0 || (v.getUint16(p + 6, true) & 8)) return null;   // only stored entries with their sizes up front
      const size = v.getUint32(p + 18, true), nl = v.getUint16(p + 26, true), xl = v.getUint16(p + 28, true);
      const name = dec.decode(new Uint8Array(buf, p + 30, nl)), at = p + 30 + nl + xl;
      if (at + size > buf.byteLength) return null;
      out[name] = new Uint8Array(buf, at, size); p = at + size;
    }
    return Object.keys(out).length ? out : null;
  }
  return { make, read };
})();
async function exportTheme(t){
  if (!t) return;
  const ups = (ADMIN.uploadsAdmin || []).filter(u => t.items.includes(u.url));
  const files = [], items = [];
  for (const [i, u] of ups.entries()){
    const r = await fetch(media(u.url), { credentials:'same-origin' }); if (!r.ok) continue;
    const name = String(i + 1).padStart(2, '0') + '.' + u.url.split('.').pop();
    files.push([name, new Uint8Array(await r.arrayBuffer())]); items.push({ file:name, type:u.type });
  }
  files.unshift(['theme.json', new TextEncoder().encode(JSON.stringify({ format:'homebase-theme', version:1, name:t.name, items }, null, 2))]);
  const a = document.createElement('a'); a.href = URL.createObjectURL(ZIP.make(files));
  a.download = 'theme-' + (t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mine') + '.zip';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Theme exported');
}
$('#themeFile').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  const bad = () => toast('That file isn\'t a Homebase Hub theme. Choose a file made with Export.', true);
  let zip, meta;
  try { zip = ZIP.read(await f.arrayBuffer()); meta = zip && JSON.parse(new TextDecoder().decode(zip['theme.json'])); } catch { zip = null; }
  if (!zip || !meta || meta.format !== 'homebase-theme' || !Array.isArray(meta.items)) return bad();
  const MIME = { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', webp:'image/webp', gif:'image/gif', avif:'image/avif', mp4:'video/mp4', webm:'video/webm' };
  const got = [];
  $('#prog').classList.add('on');
  for (const it of meta.items.slice(0, 60)){
    const data = zip[it.file], ext = String(it.file || '').split('.').pop().toLowerCase();
    if (!data || !MIME[ext]) continue;
    try { $('#prog i').style.width = '0'; const r = await uploadOne(new File([data], it.file, { type:MIME[ext] })); if (r.uploads) renderThumbs(r.uploads); if (r.file) got.push(r.file); }
    catch (err){ toast(`${it.file}: ${err.message}`, true); }
  }
  $('#prog').classList.remove('on');
  if (!got.length) return bad();
  const id = crypto.getRandomValues(new Uint32Array(1))[0].toString(16).padStart(8, '0');
  let name = String(meta.name || 'Imported Theme').slice(0, 36), n = 1;
  const taken = new Set((bgDraft.themes || []).map(t => t.name));
  while (taken.has(n === 1 ? name : name + ' ' + n)) n++;
  bgDraft.themes = [...(bgDraft.themes || []), { id, name:n === 1 ? name : name + ' ' + n, items:got }];
  bgDraft.theme = 't:' + id;
  renderThemes();
  toast(`Imported ${got.length} background${got.length === 1 ? '' : 's'}. Press Save Background to use the theme.`);
});
function renderSources(){
  const info = ADMIN.sourceInfo, stats = ADMIN.poolStats || {};
  $('#sourceRows').innerHTML = Object.entries(info).filter(([, s]) => !s.custom).map(([k, s]) => {
    const on = !!bgDraft.sources[k];
    const st = stats[k] || { count:0, target:0, error:null };
    const missingKey = s.key && !bgDraft.keys[s.key];
    let status = '';
    if (on && missingKey) status = `<div class="src-status bad">Needs your ${esc(ADMIN.keyInfo[s.key].name)} key (below)</div>`;
    else if (on) status = `<div class="src-status ${st.error && !st.count ? 'bad' : ''}">${Number(st.count) || 0} of ${Number(st.target) || 0} ${s.video ? 'videos' : 'photos'} saved${st.error ? ` <span class="src-err">Last problem: ${esc(st.error)}</span>` : ''}</div>`;
    return `<div class="g-row stack src-row">
      <div class="src-head">
        <span class="g-label">${esc(s.name)}<small>${esc(s.about)}</small></span>
        <span class="src-tools">
          <button type="button" class="btn small ghost" data-preview="${esc(k)}">Preview</button>
          <input type="checkbox" class="switch" data-src="${esc(k)}" ${on ? 'checked' : ''} aria-label="Use ${esc(s.name)}">
        </span>
      </div>${status}</div>`;
  }).join('');
}
function renderCustom(){
  const stats = ADMIN.poolStats || {};
  const list = bgDraft.custom || [];
  $('#customRows').hidden = !list.length;
  $('#addCustom').hidden = list.length >= ADMIN.limits.maxCustom;
  $('#customRows').innerHTML = list.map((c, i) => {
    const k = 'c' + c.id, on = bgDraft.sources[k] !== false && !!bgDraft.sources[k];
    const st = stats[k];
    let host = ''; try { host = new URL(c.url.replace(/\{[a-z]+\}/g, 'x')).hostname; } catch {}
    const status = !on ? '' : st
      ? `<div class="src-status ${st.error && !st.count ? 'bad' : ''}">${Number(st.count) || 0} of ${Number(st.target) || 0} ${c.type === 'video' ? 'videos' : 'photos'} saved${st.error ? ` <span class="src-err">Last problem: ${esc(st.error)}</span>` : ''}</div>`
      : `<div class="src-status">Save to start downloading.</div>`;
    return `<div class="g-row stack src-row">
      <div class="src-head">
        <span class="g-label">${esc(c.name)}<small>${c.kind === 'image' ? 'Image address' : 'JSON API'} on ${esc(host)}${c.type === 'video' ? ', videos' : ''}</small></span>
        <span class="src-tools">
          <button type="button" class="btn small ghost" data-cedit="${Number(i)}">Edit</button>
          <button type="button" class="btn small ghost" data-preview="${esc(k)}">Preview</button>
          <input type="checkbox" class="switch" data-src="${esc(k)}" ${on ? 'checked' : ''} aria-label="Use ${esc(c.name)}">
        </span>
      </div>${status}</div>`;
  }).join('');
}
$('#customRows').addEventListener('change', e => {
  const k = e.target.dataset.src; if (!k) return;
  bgDraft.sources[k] = e.target.checked; renderCustom();
});
$('#customRows').addEventListener('click', e => {
  const ed = e.target.closest('[data-cedit]');
  if (ed) openCustom(+ed.dataset.cedit);
});
function renderKeys(){
  $('#keyRows').innerHTML = Object.entries(ADMIN.keyInfo).map(([k, info]) => `
    <div class="g-row stack">
      <span class="g-label">${esc(info.name)} key<small>${esc(info.help)} <a href="${esc(info.url)}" target="_blank" rel="noopener" class="ext">Get a Free Key</a></small></span>
      <input type="text" data-key="${k}" value="${esc(bgDraft.keys[k] || '')}" placeholder="Paste your ${esc(info.name)} key" autocomplete="off" spellcheck="false">
    </div>`).join('');
}
$('#keyRows').addEventListener('input', e => {
  const k = e.target.dataset.key; if (!k) return;
  bgDraft.keys[k] = e.target.value.trim(); renderSources();
});
$('#sourceRows').addEventListener('change', e => {
  const k = e.target.dataset.src; if (!k) return;
  bgDraft.sources[k] = e.target.checked; renderSources();
});
async function previewSource(e){
  const b = e.target.closest('[data-preview]'); if (!b) return;
  const k = b.dataset.preview, s = ADMIN.sourceInfo[k];
  if (!s || customDirty){ toast('Save your changes first, then preview.', true); return; }
  if (s.key && !bgDraft.keys[s.key]){ toast(`Add your ${ADMIN.keyInfo[s.key].name} key below, then save.`, true); return; }
  if (JSON.stringify(bgDraft.keys) !== JSON.stringify(ADMIN.bg.keys) || bgDraft.query !== ADMIN.bg.query){
    toast('Save your changes first, then preview.', true); return;
  }
  b.textContent = 'Loading…';
  await withBusy(b, async () => {
    try {
      const r = await api('photo_now', { src:k });
      ADMIN.poolStats = r.stats; renderSources(); renderCustom();
      if (!(PUB.bg.photos || []).some(p => p.url === r.photo.url)) PUB.bg.photos = [...(PUB.bg.photos || []), r.photo];
      await BG.show(r.photo, { count:false });
    } catch (err){
      if (err.data?.stats){ ADMIN.poolStats = err.data.stats; renderSources(); renderCustom(); }
      toast(err.message, true);
    }
  });
  const btn = $(`[data-preview="${esc(k)}"]`); if (btn) btn.textContent = 'Preview';
}
$('#sourceRows').addEventListener('click', previewSource);
$('#customRows').addEventListener('click', previewSource);
$('#bgQuery').addEventListener('input', e => bgDraft.query = e.target.value);
$('#bgVideo').addEventListener('input', e => { bgDraft.videoChance = e.target.value / 100; $('#videoVal').textContent = e.target.value + '%'; });
$('#bgChance').addEventListener('input', e => { bgDraft.uploadChance = e.target.value / 100; $('#chanceVal').textContent = e.target.value + '%'; });
$('#bgDim').addEventListener('input', e => { bgDraft.dim = e.target.value / 100; $('#dimVal').textContent = e.target.value + '%'; document.documentElement.style.setProperty('--dim', bgDraft.dim); });
$('#bgMotion').addEventListener('change', e => bgDraft.motion = e.target.checked);
$('#bgRotate').addEventListener('change', e => bgDraft.rotate = +e.detail);
$('#bgSheet').addEventListener('close', () => document.documentElement.style.setProperty('--dim', ADMIN ? ADMIN.bg.dim : PUB.bg.dim));

$('#saveBg').addEventListener('click', e => withBusy(e.currentTarget, async () => {
  const prev = ADMIN.bg;
  ADMIN.bg = bgDraft;
  const missing = [...new Set(Object.entries(ADMIN.sourceInfo).filter(([k, s]) => s.key && bgDraft.sources[k] && !bgDraft.keys[s.key]).map(([, s]) => s.name))];
  try {
    await saveAll(missing.length ? `Saved. ${missing.join(' and ')} stay off until you add a key.` : 'Background saved');
    $$('#bg > img').forEach(n => n.classList.toggle('kb', ADMIN.bg.motion && !REDUCED));
    BG.schedule();
    customDirty = false;
    if (PUB.bg.refill) BG.refill(false);   // start downloading photos for newly enabled sources
    closeSheet('bgSheet');
  } catch (err){ ADMIN.bg = prev; toast(err.message, true); }
}));

/* custom source sheet */
const PRESETS = {
  openverse: { name:'Openverse', kind:'json', type:'image', url:'https://api.openverse.org/v1/images/?q={keyword}&aspect_ratio=wide&size=large&mature=false&page_size=40&page={page}', headers:'', list:'results', image:'url', credit:'creator', link:'foreign_landing_url' },
  pexels:    { name:'Pexels', kind:'json', type:'image', url:'https://api.pexels.com/v1/search?query={keyword}&orientation=landscape&size=large&per_page=40&page={page}', headers:'Authorization: YOUR_PEXELS_KEY', list:'photos', image:'src.original', credit:'photographer', link:'url' },
  image:     { name:'Picsum (example)', kind:'image', type:'image', url:'https://picsum.photos/{width}/1440?random={random}', headers:'', list:'', image:'', credit:'', link:'' },
};
let customIdx = null, customDraft = null, customDirty = false;
function openCustom(i){
  customIdx = i;
  customDraft = i === null ? { id:null, name:'', kind:'json', type:'image', url:'', headers:'', list:'', image:'', credit:'', link:'' } : { ...bgDraft.custom[i] };
  $('#customTitle').textContent = i === null ? 'Add custom source' : 'Edit custom source';
  $('#cDelete').hidden = i === null;
  $('#customPresets').closest('.field').hidden = i !== null;
  fillCustom();
  openSheet('customSheet');
}
function fillCustom(){
  const d = customDraft;
  $('#cName').value = d.name; $('#cUrl').value = d.url; $('#cHeaders').value = d.headers;
  $('#cList').value = d.list; $('#cImage').value = d.image; $('#cCredit').value = d.credit; $('#cLink').value = d.link;
  seg($('#cKind'), d.kind); seg($('#cType'), d.type);
  $$('#customSheet [data-kind]').forEach(el => el.hidden = el.dataset.kind !== d.kind);
  $('#cTestOut').textContent = ''; $('#cTestOut').className = 'test-out'; $('#customErr').textContent = '';
}
function readCustom(){
  return { ...customDraft, name:$('#cName').value.trim(), url:$('#cUrl').value.trim(), headers:$('#cHeaders').value,
    list:$('#cList').value.trim(), image:$('#cImage').value.trim(), credit:$('#cCredit').value.trim(), link:$('#cLink').value.trim() };
}
$('#addCustom').addEventListener('click', () => openCustom(null));
$('#customPresets').addEventListener('click', e => {
  const b = e.target.closest('[data-preset]'); if (!b) return;
  customDraft = { ...customDraft, ...PRESETS[b.dataset.preset] }; fillCustom();
});
$('#cKind').addEventListener('change', e => { customDraft = readCustom(); customDraft.kind = e.detail; fillCustom(); });
$('#cType').addEventListener('change', e => { customDraft.type = e.detail; });
$('#cTest').addEventListener('click', e => withBusy(e.currentTarget, async () => {
  const out = $('#cTestOut');
  out.className = 'test-out'; out.textContent = 'Testing…';
  try { const r = await api('test_source', readCustom()); out.className = 'test-out ok'; out.textContent = r.message; }
  catch (err){ out.className = 'test-out bad'; out.textContent = err.message; }
}));
$('#customForm').addEventListener('submit', e => {
  e.preventDefault();
  const d = readCustom();
  if (!d.name){ $('#customErr').textContent = 'Give it a name.'; return; }
  if (!/^https?:\/\//i.test(d.url)){ $('#customErr').textContent = 'The address must start with https://'; return; }
  if (d.kind === 'json' && !d.image){ $('#customErr').textContent = 'Fill in where the image or video address is in the reply.'; return; }
  if (customIdx === null){
    d.id = Math.random().toString(36).slice(2, 10).replace(/[^a-z0-9]/g, 'x').padEnd(8, '0');
    bgDraft.custom.push(d);
    bgDraft.sources['c' + d.id] = true;
  } else bgDraft.custom[customIdx] = d;
  customDirty = true;
  closeSheet('customSheet');
  renderCustom();
  toast('Click “Save background” to keep it.');
});
$('#cDelete').addEventListener('click', async () => {
  closeSheet('customSheet');
  const c = bgDraft.custom[customIdx];
  if (!(await confirmBox('Delete this source?', `“${c.name}” and its saved photos are removed when you save.`))){ openSheet('customSheet'); return; }
  bgDraft.custom.splice(customIdx, 1);
  delete bgDraft.sources['c' + c.id];
  customDirty = true;
  renderCustom();
});

/* uploads */
function renderThumbs(list){
  ADMIN.uploadsAdmin = list;
  PUB.uploads = list.map(u => ({ url:u.url, type:u.type, credit:'Your upload' }));
  $('#thumbs').innerHTML = list.map(u => `
    <div class="thumb">
      ${u.type === 'video' ? `<video src="${esc(media(u.url))}#t=0.5" muted preload="metadata"></video><span class="badge">Video</span>` : `<img src="${esc(media(u.url))}" alt="" loading="lazy">`}
      <div class="acts">
        <button type="button" data-show="${esc(u.url)}" data-type="${u.type}">Show</button>
        <button type="button" class="del" data-del="${esc(u.file)}">Delete</button>
      </div>
    </div>`).join('');
}
$('#thumbs').addEventListener('click', async e => {
  const s = e.target.closest('[data-show]'), d = e.target.closest('[data-del]');
  if (s) BG.show({ url:s.dataset.show, type:s.dataset.type, credit:'Your upload' }, { count:false });
  if (d){
    if (!(await confirmBox('Delete this background?', 'The file is removed from your server.'))){ openSheet('bgSheet'); return; }
    openSheet('bgSheet');
    try { const r = await api('delete_upload', { file:d.dataset.del }); renderThumbs(r.uploads); toast('Background deleted'); }
    catch (err){ toast(err.message, true); }
  }
});
/** One POST with progress. `done` = bytes already sent before this request (for the overall bar). */
function sendForm(action, fd, done, total){
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('POST', 'api.php?action=' + action);
    x.setRequestHeader('X-CSRF-Token', CSRF);
    x.timeout = 300000;
    x.upload.onprogress = e => { if (e.lengthComputable) $('#prog i').style.width = Math.min(100, (done + e.loaded) / total * 100) + '%'; };
    x.onload = () => {
      let j; try { j = JSON.parse(x.responseText); } catch {
        j = { error: x.status === 413 ? 'The file is bigger than your host or Cloudflare accepts.' : x.status === 403 ? "Your host's firewall blocked the upload (403)." : `Upload failed (server answered ${x.status}).` };
      }
      (x.status < 300 && !j.error) ? resolve(j) : reject(new Error(j.error || 'Upload failed.'));
    };
    x.onerror = () => reject(new Error('The connection dropped during the upload. Try again.'));
    x.ontimeout = () => reject(new Error('The upload took too long. Try a smaller file or a faster connection.'));
    x.send(fd);
  });
}
const BG_OK = /^(image\/(jpeg|png|webp|gif|avif)|video\/(mp4|webm))$/;
/** Small files go in one request; bigger ones in pieces that fit the host's limit, joined on the server. */
async function uploadOne(file){
  const lim = (ADMIN && ADMIN.limits) || {}, maxMB = lim.maxUploadMB || 40, piece = lim.piece || 1572864;
  if (file.type && !BG_OK.test(file.type)) {
    throw new Error(/^video\//.test(file.type) ? 'This video type (' + file.type.replace('video/', '').toUpperCase() + ") isn't supported. Use MP4 or WebM." : 'Use JPG, PNG, WebP, GIF, AVIF, MP4 or WebM.');
  }
  if (file.size > maxMB * 1048576) throw new Error('The file is ' + (file.size / 1048576).toFixed(1) + ' MB; the most is ' + maxMB + ' MB.');
  if (file.size <= piece) { const fd = new FormData(); fd.append('file', file); return sendForm('upload', fd, 0, file.size); }
  const id = [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, '0')).join('');
  const total = Math.ceil(file.size / piece);
  let r;
  for (let i = 0; i < total; i++){
    const fd = new FormData();
    fd.append('id', id); fd.append('index', String(i)); fd.append('total', String(total)); fd.append('size', String(file.size));
    fd.append('piece', file.slice(i * piece, Math.min(file.size, (i + 1) * piece)), 'piece');
    for (let tries = 0; ; tries++){   // a dropped piece is sent again (twice at most)
      try { r = await sendForm('upload_chunk', fd, i * piece, file.size); break; }
      catch (e){ if (tries >= 2 || !/connection|too long/.test(e.message)) throw e; await new Promise(ok => setTimeout(ok, 1500)); }
    }
  }
  return r;
}
async function handleFiles(files){
  if (!files.length) return;
  $('#prog').classList.add('on');
  let ok = 0;
  for (const f of files){
    $('#prog i').style.width = '0';
    try { const r = await uploadOne(f); if (r.uploads) renderThumbs(r.uploads); ok++; }
    catch (e){ toast(`${f.name}: ${e.message}`, true); }
  }
  $('#prog').classList.remove('on');
  if (ok) toast(ok === 1 ? 'Background uploaded' : `${ok} backgrounds uploaded`);
}
const drop = $('#drop');
drop.addEventListener('click', () => $('#bgFile').click());
drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); $('#bgFile').click(); } });
$('#bgFile').addEventListener('change', e => { handleFiles([...e.target.files]); e.target.value = ''; });
['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => handleFiles([...e.dataTransfer.files]));

