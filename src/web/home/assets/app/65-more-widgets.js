/* ======================================================================
   SIX MORE WIDGETS (1.82.6)
   Most Used Links, Focus Timer, Habit Streaks, Search, Year Progress and Converter.
   Most Used Links reads Links from this site. Focus Timer and Habit Streaks keep their data in this browser only (like Recent Links).
   Search opens a search site only when you press Enter. Year Progress and Converter work out everything on the page itself.
   ====================================================================== */
/** @type {Record<string, [string, string]>} */
const MW_ENGINES = { ddg:['DuckDuckGo', 'https://duckduckgo.com/?q='], wiki:['Wikipedia', 'https://en.wikipedia.org/w/index.php?search='], yt:['YouTube', 'https://www.youtube.com/results?search_query='], maps:['OpenStreetMap', 'https://www.openstreetmap.org/search?query='] };
/** @type {Record<string, [string, number]>} */
const MW_FOCUS = { focus:['Focus', 25], short:['Short Break', 5], long:['Long Break', 15] };
/** @type {Record<string, Record<string, [string, number]>>} */
const MW_UNITS = {   // every unit is its size in the first one of its group (a temperature is worked out on its own)
  Length: { m:['Meters', 1], km:['Kilometers', 1000], cm:['Centimeters', 0.01], mm:['Millimeters', 0.001], mi:['Miles', 1609.344], yd:['Yards', 0.9144], ft:['Feet', 0.3048], in:['Inches', 0.0254] },
  Weight: { kg:['Kilograms', 1], g:['Grams', 0.001], mg:['Milligrams', 0.000001], lb:['Pounds', 0.45359237], oz:['Ounces', 0.028349523125] },
  Temperature: { c:['Celsius', 0], f:['Fahrenheit', 0], k:['Kelvin', 0] },
  Volume: { l:['Liters', 1], ml:['Milliliters', 0.001], gal:['US Gallons', 3.785411784], cup:['US Cups', 0.2365882365], floz:['US Fluid Ounces', 0.0295735295625] },
  Speed: { kmh:['Kilometers per Hour', 1], mph:['Miles per Hour', 1.609344], ms:['Meters per Second', 3.6], kn:['Knots', 1.852] },
};
let mwForce = false;   // true: draw the open panel even while you are typing in it
const mwLoad = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch { return d; } };
const mwSave = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked: it just won't be remembered */ } };

/* ---------- Most Used Links: what you opened most in Links (never from a locked tab) ---------- */
async function loadMost(){
  try {
    const j = await siteJSON('../links/api.php'), vis = j.visits || {}, seen = new Set(), all = [];
    if (j.auth && j.data) for (const t of j.data.tabs || []) if (!t.encrypted) for (const c of t.categories || []) for (const l of c.links || []){
      if (!l || l.divider || !l.url || !/^https?:/i.test(l.url) || seen.has(l.url) || !(vis[l.url] | 0)) continue;
      seen.add(l.url); all.push({ u:l.url, n:String(l.title || l.url).slice(0, 80), c:vis[l.url] | 0 });
    }
    WD.most = all.sort((a, b) => b.c - a.c).slice(0, 6); WD.mostErr = '';
  } catch (e){ WD.mostErr = e.message; }
  renderWidgets();
}

/* ---------- Focus Timer ---------- */
const focusState = () => { const s = mwLoad('hub-focus', null); return s && MW_FOCUS[s.mode] ? s : { mode:'focus', end:0, left:MW_FOCUS.focus[1] * 60000, done:{} }; };
let focusT = 0;
const focusLeft = s => s.end ? Math.max(0, s.end - Date.now()) : s.left;
const clockMS = ms => { const t = Math.ceil(ms / 1000); return pad2(Math.floor(t / 60)) + ':' + pad2(t % 60); };
function focusTick(){
  const s = focusState(), left = focusLeft(s);
  if (s.end && left <= 0){
    const t = siteToday(); s.done = { [t]:(s.done[t] | 0) + (s.mode === 'focus' ? 1 : 0) };
    s.end = 0; s.left = MW_FOCUS[s.mode][1] * 60000; mwSave('hub-focus', s);
    toast(s.mode === 'focus' ? 'Focus time is over. Take a break.' : 'Break is over.');
    clearInterval(focusT); focusT = 0; renderWidgets(); return;
  }
  const txt = clockMS(left);
  document.querySelectorAll('[data-w="focus"] .wc-big, #wFocusT').forEach(el => { if (el.textContent !== txt) el.textContent = txt; });
}
function focusResume(){ clearInterval(focusT); focusT = 0; if (focusState().end){ focusT = setInterval(focusTick, 500); focusTick(); } }
function focusAct(a, mode){
  const s = focusState();
  if (a === 'mode'){ s.mode = mode; s.end = 0; s.left = MW_FOCUS[mode][1] * 60000; }
  if (a === 'start'){ s.end = Date.now() + (s.left > 0 ? s.left : MW_FOCUS[s.mode][1] * 60000); }
  if (a === 'pause'){ s.left = focusLeft(s); s.end = 0; }
  if (a === 'reset'){ s.end = 0; s.left = MW_FOCUS[s.mode][1] * 60000; }
  mwSave('hub-focus', s); focusResume(); renderWidgets();
}

/* ---------- Habit Streaks ---------- */
const habits = () => (mwLoad('hub-habits', []) || []).filter(h => h && typeof h.n === 'string' && Array.isArray(h.d)).slice(0, 8);
function habitStreak(h, t){   // days in a row, counted up to today (or yesterday while today is still open)
  const d = new Set(h.d); let n = 0, c = d.has(t) ? t : dStr(new Date(+dParse(t) - 86400000));
  while (d.has(c) && n < 1000){ n++; const p = dParse(c); p.setDate(p.getDate() - 1); c = dStr(p); }
  return n;
}
function habitToggle(id){
  const l = habits(), h = l.find(x => x.id === id), t = siteToday(); if (!h) return;
  h.d = h.d.includes(t) ? h.d.filter(x => x !== t) : [...h.d, t].sort().slice(-400);
  mwSave('hub-habits', l); renderWidgets();
}

/* ---------- Year Progress ---------- */
function yearNow(){
  const t = siteToday(), d = dParse(t), y = d.getFullYear(), start = new Date(y, 0, 1), len = Math.round((+new Date(y + 1, 0, 1) - +start) / 86400000);
  const day = Math.round((+d - +start) / 86400000) + 1, mlen = new Date(y, d.getMonth() + 1, 0).getDate(), wd = (d.getDay() + (WD.set.week === 'mon' ? 6 : 0)) % 7;
  return { y, day, len, left:len - day, pct:Math.floor(day / len * 100), mon:d.toLocaleDateString(undefined, { month:'long' }), md:d.getDate(), mlen, wd:wd + 1 };
}

/* ---------- Converter ---------- */
const cv = { cat:'Length', from:'km', to:'mi', val:'1' };
function convert(cat, from, to, v){
  if (cat === 'Temperature'){
    const c = from === 'c' ? v : from === 'f' ? (v - 32) * 5 / 9 : v - 273.15;
    return to === 'c' ? c : to === 'f' ? c * 9 / 5 + 32 : c + 273.15;
  }
  return v * MW_UNITS[cat][from][1] / MW_UNITS[cat][to][1];
}
function convertText(){
  const v = parseFloat(String(cv.val).replace(',', '.'));
  if (!isFinite(v)) return '';
  const r = convert(cv.cat, cv.from, cv.to, v);
  return new Intl.NumberFormat(undefined, { maximumSignificantDigits:8 }).format(r) + ' ' + MW_UNITS[cv.cat][cv.to][0];
}

/* ---------- the cards and the panels ---------- */
function mwSummary(id){
  if (id === 'most'){
    if (WD.mostErr) return { small:WD.mostErr };
    if (!WD.most) return { small:'…' };
    return { small: WD.most.length ? WD.most.slice(0, 3).map(x => x.n).join(' · ') : 'Open links in Links and your favorites show up here' };
  }
  if (id === 'focus'){
    const s = focusState(), left = focusLeft(s), n = s.done[siteToday()] | 0;
    return { big:clockMS(left), small:MW_FOCUS[s.mode][0] + (s.end ? ' · running' : left < MW_FOCUS[s.mode][1] * 60000 ? ' · paused' : '') + (n ? ' · ' + plural(n, 'session', 'sessions') + ' today' : '') };
  }
  if (id === 'habits'){
    const l = habits(), t = siteToday();
    if (!l.length) return { small:'Add a habit and tick it off each day' };
    const done = l.filter(h => h.d.includes(t)).length, best = l.map(h => [habitStreak(h, t), h.n]).sort((a, b) => b[0] - a[0])[0];
    return { big:done + ' of ' + l.length, small:best[0] ? best[1] + ': ' + plural(best[0], 'day', 'days') + ' in a row' : 'Done today', alert:done < l.length ? '' : 'All done' };
  }
  if (id === 'search') return { small:'Type and press Enter' };
  if (id === 'year'){ const y = yearNow(); return { big:y.pct + '%', small:'Day ' + y.day + ' of ' + y.len + ' · ' + plural(y.left, 'day', 'days') + ' left' }; }
  if (id === 'convert') return { small:'Length, weight, temperature, volume and speed' };
  return {};
}
function mwPanel(id){
  if (id === 'most'){
    const more = '<a class="wmore" href="../links/">Open Links</a>';
    if (WD.mostErr) return `<p class="wmsg">${esc(WD.mostErr)}</p>`;
    if (!WD.most) return '<p class="wmsg">Loading…</p>';
    if (!WD.most.length) return '<p class="wmsg">Open links in Links and the ones you use most show up here.</p>' + more;
    return `<div class="wlist">${WD.most.map(x => `<a class="wrow" href="${esc(x.u)}" target="_blank" rel="noopener noreferrer"><span class="wr-n">${esc(x.n)}</span><span class="wr-t">${plural(x.c, 'visit', 'visits')}</span></a>`).join('')}</div>${more}`;
  }
  if (id === 'focus'){
    const s = focusState(), run = !!s.end, n = s.done[siteToday()] | 0;
    return `<p class="wfocus" id="wFocusT" role="timer" aria-label="Time left">${clockMS(focusLeft(s))}</p>
      <div class="wseg" role="group" aria-label="Timer Length">${Object.entries(MW_FOCUS).map(([k, m]) => `<button type="button" class="wbtn${k === s.mode ? ' on' : ''}" data-fmode="${k}" aria-pressed="${k === s.mode}">${m[0]} ${m[1]}</button>`).join('')}</div>
      <div class="wseg"><button type="button" class="wbtn on" data-fact="${run ? 'pause' : 'start'}" id="wFocusGo">${run ? 'Pause' : 'Start'}</button><button type="button" class="wbtn" data-fact="reset">Reset</button></div>
      <p class="wmsg small">${n ? plural(n, 'focus session', 'focus sessions') + ' finished today. ' : ''}Kept in this browser only.</p>`;
  }
  if (id === 'habits'){
    const l = habits(), t = siteToday();
    return `<div class="wlist">${l.map(h => { const on = h.d.includes(t), n = habitStreak(h, t);
      return `<div class="wrow whab${on ? ' on' : ''}"><button type="button" class="wtick" data-hab="${esc(h.id)}" aria-pressed="${on}" aria-label="${esc(h.n)}: done today"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button><span class="wr-n">${esc(h.n)}</span><span class="wr-t">${plural(n, 'day', 'days')}</span><button type="button" class="wx" data-habdel="${esc(h.id)}" aria-label="Remove ${esc(h.n)}">×</button></div>`; }).join('')}</div>
      ${l.length ? '' : '<p class="wmsg">Add a habit, then tick it off each day to build a streak.</p>'}
      ${l.length < 8 ? `<form class="wqa" id="wHabForm"><input type="text" id="wHab" maxlength="40" autocomplete="off" placeholder="+ Add a habit, press Enter" aria-label="New Habit"></form>` : '<p class="wmsg small">Eight habits is the most.</p>'}
      <p class="wmsg small">Kept in this browser only.</p>`;
  }
  if (id === 'search'){
    const e = mwLoad('hub-search-engine', 'ddg');
    return `<form class="wqa wsearch" id="wSearchForm"><input type="search" id="wSq" maxlength="200" autocomplete="off" placeholder="Search and press Enter" aria-label="Search"><select id="wSe" aria-label="Search With">${Object.entries(MW_ENGINES).map(([k, v]) => `<option value="${k}"${k === e ? ' selected' : ''}>${v[0]}</option>`).join('')}</select></form>
      <p class="wmsg small">Nothing is sent until you press Enter. The search opens in a new tab.</p>`;
  }
  if (id === 'year'){
    const y = yearNow(), bar = (label, a, b, note) => `<div class="wbarr"><span class="wz-n">${label}<small>${note}</small></span><div class="wbar" role="img" aria-label="${label}: ${Math.floor(a / b * 100)} percent"><i style="width:${Math.min(100, a / b * 100).toFixed(1)}%"></i></div><b>${Math.floor(a / b * 100)}%</b></div>`;
    return `<div class="wbars">${bar(String(y.y), y.day, y.len, 'Day ' + y.day + ' of ' + y.len + ' · ' + plural(y.left, 'day', 'days') + ' left')}${bar(esc(y.mon), y.md, y.mlen, 'Day ' + y.md + ' of ' + y.mlen)}${bar('This Week', y.wd, 7, 'Day ' + y.wd + ' of 7')}</div>`;
  }
  if (id === 'convert'){
    const u = MW_UNITS[cv.cat], opt = sel => Object.entries(u).map(([k, v]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${v[0]}</option>`).join('');
    return `<div class="wcv"><select id="wCvCat" aria-label="What to Convert">${Object.keys(MW_UNITS).map(c => `<option${c === cv.cat ? ' selected' : ''}>${c}</option>`).join('')}</select>
      <input type="text" id="wCvVal" inputmode="decimal" autocomplete="off" value="${esc(cv.val)}" aria-label="Amount">
      <select id="wCvFrom" aria-label="From">${opt(cv.from)}</select><select id="wCvTo" aria-label="To">${opt(cv.to)}</select></div>
      <p class="wcvout" id="wCvOut" aria-live="polite">${esc(convertText())}</p><p class="wmsg small">Worked out on this page. Nothing is sent anywhere.</p>`;
  }
  return '';
}

/* ---------- what you press and type ---------- */
$('#wBody').addEventListener('click', e => {
  const t = /** @type {HTMLElement} */ (e.target), b = /** @type {HTMLElement | null} */ (t.closest('[data-fmode],[data-fact],[data-hab],[data-habdel]'));
  if (!b) return;
  if (b.dataset.fmode) focusAct('mode', b.dataset.fmode);
  else if (b.dataset.fact) focusAct(b.dataset.fact);
  else if (b.dataset.hab){ habitToggle(b.dataset.hab); $(`[data-hab="${b.dataset.hab}"]`)?.focus(); }
  else if (b.dataset.habdel){ mwSave('hub-habits', habits().filter(h => h.id !== b.dataset.habdel)); renderWidgets(); $('#wHab')?.focus(); }
});
$('#wBody').addEventListener('submit', e => {
  const f = /** @type {HTMLElement} */ (e.target);
  if (f.id === 'wHabForm'){
    e.preventDefault();
    const inp = $('#wHab'), n = inp.value.trim().slice(0, 40), l = habits();
    if (!n || l.length >= 8) return;
    l.push({ id:Date.now().toString(36), n, d:[] }); mwSave('hub-habits', l);
    mwForce = true; renderWidgets(); mwForce = false; $('#wHab')?.focus();
  }
  if (f.id === 'wSearchForm'){
    e.preventDefault();
    const q = $('#wSq').value.trim(), k = $('#wSe').value; if (!q || !MW_ENGINES[k]) return;
    mwSave('hub-search-engine', k);
    window.open(MW_ENGINES[k][1] + encodeURIComponent(q), '_blank', 'noopener,noreferrer');
  }
});
$('#wBody').addEventListener('input', e => {
  if (!e.target.id || !e.target.id.startsWith('wCv')) return;
  cv.val = $('#wCvVal').value; $('#wCvOut').textContent = convertText();
});
$('#wBody').addEventListener('change', e => {
  const id = e.target.id; if (!id || !id.startsWith('wCv')) return;
  if (id === 'wCvCat'){ cv.cat = e.target.value; const k = Object.keys(MW_UNITS[cv.cat]); cv.from = k[0]; cv.to = k[1] || k[0]; mwForce = true; renderPanel(); mwForce = false; $('#wCvCat').focus(); return; }
  if (id === 'wCvFrom') cv.from = e.target.value;
  if (id === 'wCvTo') cv.to = e.target.value;
  $('#wCvOut').textContent = convertText();
});
