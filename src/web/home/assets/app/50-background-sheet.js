/* ======================================================================
   BACKGROUND SHEET
   ====================================================================== */
let bgDraft = null;
/* The Background sheet's tabs: Main, Animated, Sources, Uploads. The sheet opens on the tab you used last. */
let bgTab = 'main';
function showBgTab(/** @type {string} */ id, /** @type {boolean} */ focus){
  bgTab = id;
  document.querySelectorAll('#bgSheet [data-bgt]').forEach(el => { const b = /** @type {HTMLElement} */ (el), on = b.dataset.bgt === id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
  document.querySelectorAll('#bgSheet .bgp').forEach(el => { /** @type {HTMLElement} */ (el).hidden = el.id !== 'bgp-' + id; });
  const sb = document.querySelector('#bgSheet .sb'); if (sb) sb.scrollTop = 0;
}
$('#bgSheet .bgtabs').addEventListener('click', e => { const b = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest('[data-bgt]')); if (b) showBgTab(b.dataset.bgt || 'main', false); });
$('#bgSheet .bgtabs').addEventListener('keydown', e => {
  const ids = [...document.querySelectorAll('#bgSheet [data-bgt]')].map(b => /** @type {HTMLElement} */ (b).dataset.bgt || ''), i = ids.indexOf(bgTab);
  const k = /** @type {KeyboardEvent} */ (e).key;
  const to = k === 'ArrowRight' ? (i + 1) % ids.length : k === 'ArrowLeft' ? (i + ids.length - 1) % ids.length : k === 'Home' ? 0 : k === 'End' ? ids.length - 1 : -1;
  if (to < 0) return; e.preventDefault(); showBgTab(ids[to], true);
});
function openBg(){
  bgDraft = structuredClone(ADMIN.bg); showBgTab(bgTab, false);
  bgDraft.custom = bgDraft.custom || [];
  customDirty = false;
  renderDesigns(); renderThemes(); renderSources(); renderKeys(); renderCustom();
  $('#bgQuery').value = bgDraft.query;
  $('#bgVideo').value = Math.round(bgDraft.videoChance * 100);
  $('#videoVal').textContent = $('#bgVideo').value + '%';
  $('#bgChance').value = Math.round(bgDraft.uploadChance * 100);
  $('#chanceVal').textContent = $('#bgChance').value + '%';
  $('#bgDim').value = Math.round(bgDraft.dim * 100);
  $('#dimVal').textContent = $('#bgDim').value + '%';
  $('#bgMotion').checked = bgDraft.motion;
  seg($('#bgRotate'), bgDraft.rotate);
  renderThumbs(ADMIN.uploadsAdmin || []);
  openSheet('bgSheet');
}
/* Theme picker (1.82.8): a big preview of the theme in use, and one row of round chips to switch. Edit, Export and Remove show under the preview for the chosen theme. */
function renderThemes(){
  const st = ADMIN.starterInfo || [], on = bgDraft.theme || 'online', off = !!bgDraft.starterOff;
  const thumb = i => `<img src="${esc(media(i.poster || i.url))}" alt="" loading="lazy">`;
  const chip = id => `<span class="dz-chip" style="--dzg:${esc(dzGrad(id))}"></span>`;
  const vids = st.filter(i => i.type === 'video').length, pics = st.length - vids;
  const what = [vids ? vids + (vids === 1 ? ' video' : ' videos') : '', pics ? pics + (pics === 1 ? ' photo' : ' photos') : ''].filter(Boolean).join(', ');
  const dids = Object.keys(ADMIN.designsInfo || {});
  const list = [];   // { id, name, about, pics: [html], pick, acts, dim }
  list.push({ id:'mix', short:'Mix', name:'Mix Everything', about:'A bit of everything, in turn', pics:[...st.slice(0, 2).map(thumb), ...dids.slice(0, 3).map(chip)], pick:'data-t="use-mix"' });
  if (dids.length) list.push({ id:'designs', short:'Designs', name:'Animated Designs', about:dids.filter(id => dzDraft(id).on).length + ' of ' + dids.length + ' drawn live. Choose them in the Animated tab.', pics:dids.slice(0, 5).map(chip), pick:'data-t="use-designs"' });
  if (off) list.push({ id:'starter-off', name:'Starter', about:'Removed. It comes with the app, so you can bring it back.', pics:[], dim:true, pick:'data-t="back"', acts:'<button type="button" class="btn small primary" data-t="back">Bring Back Starter</button>' });
  else list.push({ id:'starter', name:'Starter', about:esc(what || 'Comes with the app') + (st[0]?.type === 'video' ? ' · ' + esc(st[0].credit) + ' first' : ''), pics:st.map(thumb), pick:'data-t="use-starter"', acts:'<button type="button" class="btn small danger" data-t="remove">Remove Starter</button>' });
  list.push({ id:'online', short:'Online', name:'Online Photos', about:'New photos from the sources you set up in the Sources tab.', pics:[], ph:'Always new', pick:'data-t="use-online"' });
  (bgDraft.themes || []).forEach(t => {
    const ups = (ADMIN.uploadsAdmin || []).filter(u => t.items.includes(u.url));
    const dz = t.items.filter(u => u.startsWith('design:') && dzInfo()[u.slice(7)]), n = ups.length + dz.length;
    const pics = ups.length ? ups.map(u => u.type === 'video' ? `<video src="${esc(media(u.url))}#t=0.5" muted preload="metadata"></video>` : `<img src="${esc(media(u.url))}" alt="" loading="lazy">`) : dz.map(u => chip(u.slice(7)));
    list.push({ id:'t:' + t.id, name:esc(t.name), about:n + (n === 1 ? ' background' : ' backgrounds') + ' · yours', pics, ph:'No backgrounds yet', pick:n ? `data-t="use" data-id="${t.id}"` : `data-t="edit" data-id="${t.id}"`,
      acts:`<button type="button" class="btn small" data-t="edit" data-id="${t.id}">Edit</button><button type="button" class="btn small" data-t="export" data-id="${t.id}"${ups.length ? '' : ' disabled'}>Export</button>` });
  });
  const cur = list.find(x => x.id === on) || list.find(x => x.id === 'online');
  const k = cur.pics.length >= 5 ? 5 : Math.min(cur.pics.length, 3);
  const face = x => x.pics.length ? x.pics[0] : '<span class="theme-blank"></span>';
  $('#themeRows').innerHTML = `<div class="theme-big" data-theme-now="${esc(cur.id)}"><div class="theme-mos" data-n="${k}">${cur.pics.length ? cur.pics.slice(0, k).join('') : `<span class="theme-ph">${esc(cur.ph || 'No pictures')}</span>`}</div>
      <div class="theme-cap"><b>${cur.name}</b><small>${cur.about}</small></div></div>
    <div class="theme-chips" role="group" aria-label="Themes">${list.map(x => `<button type="button" class="theme${x.id === on ? ' on' : ''}${x.dim ? ' dim' : ''}" data-theme="${esc(x.id)}" ${x.pick} aria-pressed="${x.id === on}" aria-label="${esc(x.name.replace(/&[a-z#0-9]+;/g, ''))}"><span class="theme-face">${face(x)}</span><span class="theme-nm">${x.short || x.name}</span></button>`).join('')}
      ${(bgDraft.themes || []).length < 8 ? '<button type="button" class="theme new" data-t="new" aria-label="New Theme"><span class="theme-face"><span class="theme-plus">+</span></span><span class="theme-nm">New</span></button>' : ''}</div>
    <div class="theme-acts">${cur.acts || ''}<button type="button" class="btn small" data-t="import">Import a Theme File</button></div>`;
}
$('#themeRows').addEventListener('click', e => {
  const b = e.target.closest('[data-t]'); if (!b) return;
  const t = b.dataset.t;
  if (t === 'use-starter') bgDraft.theme = 'starter';
  else if (t === 'use-designs') bgDraft.theme = 'designs';
  else if (t === 'use-mix') bgDraft.theme = 'mix';
  else if (t === 'use-online') bgDraft.theme = 'online';
  else if (t === 'remove'){ bgDraft.starterOff = true; bgDraft.theme = 'online'; }
  else if (t === 'back'){ bgDraft.starterOff = false; bgDraft.theme = 'starter'; }
  else if (t === 'use') bgDraft.theme = 't:' + b.dataset.id;
  else if (t === 'new') return openTheme(null);
  else if (t === 'edit') return openTheme(b.dataset.id);
  else if (t === 'import') return $('#themeFile').click();
  else if (t === 'export') return withBusy(b, () => exportTheme(bgDraft.themes.find(x => x.id === b.dataset.id)));
  renderThemes();
});

