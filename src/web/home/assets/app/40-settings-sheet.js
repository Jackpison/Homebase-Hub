/* ======================================================================
   SETTINGS SHEET
   ====================================================================== */
let settingsDraft = null;
function openSheetFor(id){
  if (id === 'settingsSheet') return openSettings();
  if (id === 'widgetsSheet') return openWidgets();
  if (id === 'bgSheet') return openBg();
  openSheet(id);
}
function openSettings(){
  settingsDraft = { title:ADMIN.title, icon:ADMIN.icon };   // (1.68.4) the glass is set in Settings > Appearance > Glass
  $('#sTitle').value = settingsDraft.title;
  $('#sHomeBar').checked = homeBarOn();
  $('#sPrivate').checked = !!ADMIN.private;
  openSheet('settingsSheet');
}
/* Show the Bar on the Home Page: the site-wide setting (Settings > Appearance), shown here too */
const homeBarOn = () => !!(window.HUB && HUB.state && HUB.state().homeBar);
async function saveHomeBar(on){
  if (!window.HUB) throw new Error('Reload the page and try again.');
  const r = await HUB.fetch('../hub/core/api.php?action=settings', { method:'POST', credentials:'same-origin', headers:{ 'Content-Type':'application/json', ...(CSRF ? { 'X-Hub-CSRF':CSRF } : {}) }, body:JSON.stringify({ settings:{ homeBar:on } }) });
  let j = {}; try { j = await r.json(); } catch {}
  if (!r.ok || !j.ok) throw new Error(j.error || 'Could not save the bar setting. Reload the page and try again.');
}
/* Widgets: their own window (the edit pill's Widgets button) */
let widgetsDraft = null;
function openWidgets(){
  widgetsDraft = structuredClone(ADMIN.widgets);
  const w = widgetsDraft;
  $('#wShow').checked = w.show;
  seg($('#wStyle'), w.style);
  $('#wClock').checked = w.clock;
  $('#wCdName').value = w.countdown.name; $('#wCdDate').value = w.countdown.date; $('#wCdTime').value = w.countdown.time || '';
  drawWidgetList();
  fillNotePicker();
  drawZones();
  $('#wTown').value = w.weather.town; seg($('#wUnit'), w.weather.unit);
  openSheet('widgetsSheet');
}
/* Settings > Widgets: tick the ones to show, and move them up or down (the dock and the cards follow this order) */
function drawWidgetList(){
  const l = widgetsDraft.list;
  $('#wList').innerHTML = l.map((w, i) => `<div class="g-row wl-row">
      <label class="wl-on"><input type="checkbox" class="switch" data-wl="${w.id}"${w.on ? ' checked' : ''}><span>${esc(W_META[w.id].name)}</span></label>
      <span class="wl-mv"><button type="button" class="btn small" data-wmove="${i}" data-by="-1" aria-label="Move ${esc(W_META[w.id].name)} Up"${i ? '' : ' disabled'}>↑</button><button type="button" class="btn small" data-wmove="${i}" data-by="1" aria-label="Move ${esc(W_META[w.id].name)} Down"${i < l.length - 1 ? '' : ' disabled'}>↓</button></span>
    </div>`).join('');
}
$('#wList').addEventListener('change', e => { const c = e.target.closest('[data-wl]'); if (c) widgetsDraft.list.find(w => w.id === c.dataset.wl).on = c.checked; });
$('#wList').addEventListener('click', e => {
  const b = e.target.closest('[data-wmove]'); if (!b) return;
  const l = widgetsDraft.list, i = +b.dataset.wmove, j = i + +b.dataset.by;
  [l[i], l[j]] = [l[j], l[i]]; drawWidgetList();
  $(`[data-wmove="${j}"][data-by="${b.dataset.by}"]`)?.focus() || $(`[data-wmove="${j}"]`)?.focus();
});
$('#wStyle').addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (!b) return; widgetsDraft.style = b.dataset.v; seg($('#wStyle'), b.dataset.v); });
/* World Clock: three rows of name and time zone; the browser offers its list of time zones */
function drawZones(){
  const z = widgetsDraft.zones;
  $('#wZones').innerHTML = [0, 1, 2].map(i => `<div class="inline"><input type="text" list="tzList" data-zt="${i}" value="${esc(z[i]?.tz || '')}" placeholder="${['Europe/London', 'America/New_York', 'Asia/Tokyo'][i]}" aria-label="Place ${i + 1} Time Zone" autocomplete="off" spellcheck="false"><input type="text" data-zn="${i}" value="${esc(z[i]?.name || '')}" maxlength="30" placeholder="Name (optional)" aria-label="Place ${i + 1} Name"></div>`).join('');
  const dl = $('#tzList');
  if (!dl.options.length && Intl.supportedValuesOf) dl.innerHTML = Intl.supportedValuesOf('timeZone').map(t => `<option value="${esc(t)}">`).join('');
}
const tzOk = tz => { try { new Intl.DateTimeFormat('en', { timeZone:tz }); return /\//.test(tz) || tz === 'UTC'; } catch { return false; } };
/* the Pinned Note list: the boxes of your Info tabs (an encrypted tab's boxes can't be read here, so they are left out) */
async function fillNotePicker(){
  const sel = $('#wNote'), cur = widgetsDraft.note, val = cur.box ? cur.tab + '|' + cur.box : '';
  sel.innerHTML = '<option value="">None</option>' + (val ? `<option value="${esc(val)}">Loading…</option>` : '');
  sel.value = val;
  try {
    const info = await siteJSON('../info/api.php');
    const groups = (info.tabs || []).filter(t => !t.enc && (t.boxes || []).length).map(t => `<optgroup label="${esc(t.name)}">${t.boxes.map(b => `<option value="${esc(t.id + '|' + b.id)}">${esc(b.title)}</option>`).join('')}</optgroup>`).join('');
    sel.innerHTML = '<option value="">None</option>' + groups;
    sel.value = [...sel.options].some(o => o.value === val) ? val : '';
  } catch { sel.innerHTML = '<option value="">None</option>' + (val ? `<option value="${esc(val)}">The note you chose</option>` : ''); sel.value = val; }
}
$('#saveSettings').addEventListener('click', e => withBusy(e.currentTarget, async () => {
  const prev = { title:ADMIN.title, icon:ADMIN.icon, private:ADMIN.private };
  ADMIN.title = $('#sTitle').value.trim() || 'Home';
  ADMIN.private = $('#sPrivate').checked;
  ADMIN.icon = '';   // no separate start page icon any more: the site logo is used
  const bar = $('#sHomeBar').checked, barChanged = bar !== homeBarOn();
  try {
    if (!barChanged) closeSheet('settingsSheet');   // (1.64.4) the window closes at once; the server catches up. If it refuses, it opens again below
    await saveAll(barChanged ? '' : 'Settings saved');
    if (barChanged){ await saveHomeBar(bar); toast('Settings saved'); setTimeout(() => location.reload(), 600); return; }   // the bar comes or goes with a reload
    closeSheet('settingsSheet');
  } catch (err){ Object.assign(ADMIN, prev); toast(err.message, true); openSheet('settingsSheet'); }
}));
$('#saveWidgets').addEventListener('click', e => withBusy(e.currentTarget, async () => {
  const prev = ADMIN.widgets;
  const w = widgetsDraft, [tab, box] = ($('#wNote').value || '|').split('|');
  const zones = [0, 1, 2].map(i => ({ tz:$(`[data-zt="${i}"]`).value.trim(), name:$(`[data-zn="${i}"]`).value.trim() })).filter(z => z.tz);
  const badZone = zones.find(z => !tzOk(z.tz));
  if (badZone){ toast(`“${badZone.tz}” is not a time zone. Pick one from the list, like Europe/London.`, true); $(`[data-zt]`)?.focus(); return; }
  w.show = $('#wShow').checked;
  w.zones = zones;
  w.weather = { town:$('#wTown').value.trim(), unit:$('#wUnit [aria-checked="true"]')?.dataset.v === 'f' ? 'f' : 'c' };
  w.clock = $('#wClock').checked;
  w.countdown = { name:$('#wCdName').value.trim(), date:$('#wCdDate').value, time:$('#wCdTime').value };
  w.note = { tab:tab || '', box:box || '' };
  ADMIN.widgets = w;
  try {
    await saveAll('Widgets saved');
    closeSheet('widgetsSheet');
  } catch (err){ ADMIN.widgets = prev; toast(err.message, true); }
}));

