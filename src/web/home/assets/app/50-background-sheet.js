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
/* Theme cards: Starter (comes with the app; Remove hides it, Bring Back shows it again) and Online Photos (the sources below) */
function renderThemes(){
  const st = ADMIN.starterInfo || [], on = bgDraft.theme || 'online', off = !!bgDraft.starterOff;
  const thumb = i => `<img src="${esc(media(i.poster || i.url))}" alt="" loading="lazy">`;
  const vids = st.filter(i => i.type === 'video').length, pics = st.length - vids;
  const what = [vids ? vids + (vids === 1 ? ' video' : ' videos') : '', pics ? pics + (pics === 1 ? ' photo' : ' photos') : ''].filter(Boolean).join(', ');
  const mosaic = list => { const k = list.length >= 5 ? 5 : Math.min(list.length, 3); return { n:k, html:list.slice(0, k).join('') }; };   // 1, 2, 3 or 5 pictures fill the frame
  const card = (id, name, about, thumbs, acts) => { const m = Array.isArray(thumbs) ? mosaic(thumbs) : { n:0, html:thumbs };
    return `<div class="theme${on === id ? ' on' : ''}" data-theme="${id}"><div class="theme-mos" data-n="${m.n}">${m.html}</div>
    <div class="theme-b"><b>${name}${on === id ? ' <span class="pill">In Use</span>' : ''}</b><small>${about}</small><div class="theme-acts">${acts}</div></div></div>`; };
  const dids = Object.keys(ADMIN.designsInfo || {});
  const mixCard = card('mix', 'Mix Everything', 'A bit of everything, in turn', [...st.slice(0, 2).map(thumb), ...dids.slice(0, 3).map(id => `<span class="dz-chip" style="--dzg:${esc(dzGrad(id))}"></span>`)],
    on === 'mix' ? '' : '<button type="button" class="btn small primary" data-t="use-mix">Use</button>');
  const dcard = dids.length ? card('designs', 'Animated Designs', dids.filter(id => dzDraft(id).on).length + ' of ' + dids.length + ' designs, drawn live', dids.slice(0, 5).map(id => `<span class="dz-chip" style="--dzg:${esc(dzGrad(id))}"></span>`),
      on === 'designs' ? '' : '<button type="button" class="btn small primary" data-t="use-designs">Use</button>') : '';
  $('#themeRows').innerHTML = mixCard + dcard + (off
      ? `<div class="theme off"><div class="theme-b"><b>Starter</b><small>Removed. It comes with the app, so you can bring it back.</small><div class="theme-acts"><button type="button" class="btn small" data-t="back">Bring Back Starter</button></div></div></div>`
      : card('starter', 'Starter', esc(what || 'Comes with the app') + (st[0]?.type === 'video' ? ' · ' + esc(st[0].credit) + ' first' : ''), st.map(thumb),
          (on === 'starter' ? '' : '<button type="button" class="btn small primary" data-t="use-starter">Use</button>') + '<button type="button" class="btn small danger" data-t="remove">Remove</button>'))
    + card('online', 'Online Photos', 'The photo sources below. New photos arrive by themselves.', '<span class="theme-ph">Picsum · Bing · Wikimedia · Wallhaven</span>',
        on === 'online' ? '' : '<button type="button" class="btn small primary" data-t="use-online">Use</button>')
    + (bgDraft.themes || []).map(t => {
        const ups = (ADMIN.uploadsAdmin || []).filter(u => t.items.includes(u.url));
        const th = ups.length ? ups.map(u => u.type === 'video' ? `<video src="${esc(media(u.url))}#t=0.5" muted preload="metadata"></video>` : `<img src="${esc(media(u.url))}" alt="" loading="lazy">`) : '<span class="theme-ph">No backgrounds yet</span>';
        const id = 't:' + t.id;
        const dn = t.items.filter(u => u.startsWith('design:') && dzInfo()[u.slice(7)]).length;
        return card(id, esc(t.name), (ups.length + dn) + ((ups.length + dn) === 1 ? ' background' : ' backgrounds') + ' · your own', dn && !ups.length ? t.items.filter(u => u.startsWith('design:') && dzInfo()[u.slice(7)]).map(u => `<span class="dz-chip" style="--dzg:${esc(dzGrad(u.slice(7)))}"></span>`) : th,
          (on === id || !(ups.length + dn) ? '' : `<button type="button" class="btn small primary" data-t="use" data-id="${t.id}">Use</button>`)
          + `<button type="button" class="btn small" data-t="edit" data-id="${t.id}">Edit</button><button type="button" class="btn small" data-t="export" data-id="${t.id}"${ups.length ? '' : ' disabled'}>Export</button>`);
      }).join('')
    + ((bgDraft.themes || []).length < 8 ? `<div class="theme new"><div class="theme-mos"><span class="theme-ph">+</span></div><div class="theme-b"><b>New Theme</b><small>Make one from your uploads, or import a theme file.</small>
        <div class="theme-acts"><button type="button" class="btn small" data-t="new">Make a Theme</button><button type="button" class="btn small" data-t="import">Import</button></div></div></div>` : '');
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

