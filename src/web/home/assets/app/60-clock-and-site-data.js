/* ======================================================================
   CLOCK AND WIDGETS (1.51)
   The clock is for everyone. The widgets appear only while you are logged in, and read their data from this site only:
   Tasks, Info, Tools and the Scratch Pad. Nothing here contacts another site.
   Settings > Widgets chooses the style: Glass Dock (chips under the clock, a dock that opens each widget)
   or Glance and Expand (small widgets along the bottom; click one to open it).
   ====================================================================== */
const svgI = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const W_META = {
  today:     { name:'Today',          short:'Today',     icon:'<path d="M4 6h16v15H4zM4 10h16M8 3v4M16 3v4M8.5 15.5l2.2 2.2 4.8-4.8"/>' },
  countdown: { name:'Countdown',      short:'Countdown', icon:'<path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9"/>' },
  note:      { name:'Pinned Note',    short:'Note',      icon:'<path d="M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 16h5"/>' },
  tools:     { name:'Recent Tools',   short:'Tools',     icon:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.4-3.4a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>' },
  calendar:  { name:'Month Calendar', short:'Calendar',  icon:'<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>' },
  pad:       { name:'Scratch Pad',    short:'Pad',       icon:'<path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4"/>' },
  quote:     { name:'Quote of the Day', short:'Quote',    icon:'<path d="M7 7h4v4c0 3-2 5-4 6M14 7h4v4c0 3-2 5-4 6"/>' },
  worldclock:{ name:'World Clock',    short:'World',     icon:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>' },
  // (1.72.0) four more: money due this month, the links you opened last, your newest files, and how the site is doing
  bills:     { name:'Upcoming Bills', short:'Bills',     icon:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>' },
  recent:    { name:'Recent Links',   short:'Links',     icon:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>' },
  files:     { name:'Recent Files',   short:'Files',     icon:'<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>' },
  status:    { name:'Server Status',  short:'Status',    icon:'<path d="M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01"/>' },
  weather:   { name:'Weather',        short:'Weather',   icon:'<path d="M8 3v1.5M3.5 8H2M4.8 4.8l1 1M12 6.5A4 4 0 0 0 5 9"/><path d="M8 20h9a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6 1.6A2.8 2.8 0 0 0 8 20z"/>' },
};
let WCFG = PUB.widgets || null;   // null: a visitor, or logged out
const WD = { tasks:null, tasksErr:'', set:{}, info:null, infoErr:'', tools:null, pad:null, padErr:'', weather:null, weatherErr:'', events:[], recent:null, files:null, status:null, statusErr:'' };
let wOpen = '', calMonth = '';

/* dates: Tasks uses the site's time zone (Settings > General), so "today" here is the same day as on the Tasks page */
const pad2 = n => String(n).padStart(2, '0');
const SITE_TZ = () => (window.HUB && HUB.tz && HUB.tz()) || 'Asia/Kolkata';
function siteToday(){
  try {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone:SITE_TZ(), year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date());
    const g = t => p.find(x => x.type === t).value;
    return g('year') + '-' + g('month') + '-' + g('day');
  } catch { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
}
/** @type {(s: string) => Date} */
const dParse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const dStr = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
const dDiff = (a, b) => Math.round((+dParse(a) - +dParse(b)) / 86400000);   // days from b to a
const dLong = s => dParse(s).toLocaleDateString(undefined, { weekday:'long', day:'numeric', month:'long' });
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);

/* ---------- the clock ---------- */
let clockT = 0;
function renderClock(){
  clearTimeout(clockT);
  const on = !!(WCFG ? WCFG.clock : PUB.clock);
  $('#clock').hidden = !on;
  if (!on) return;
  const now = new Date(), h = now.getHours();
  $('#greet').textContent = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 22 ? 'Good evening' : 'Good night';
  $('#time').textContent = now.toLocaleTimeString([], { hour:'numeric', minute:'2-digit' });
  $('#date').textContent = now.toLocaleDateString([], { weekday:'long', day:'numeric', month:'long' });
  clockT = setTimeout(() => (WCFG ? renderWidgets(true) : renderClock()), 60500 - now.getSeconds() * 1000 - now.getMilliseconds());
}

/* ---------- reading this site's data ---------- */
async function siteJSON(url, body, opts = {}){
  /** @type {any} */
  const o = { method: body ? 'POST' : 'GET', credentials:'same-origin', headers:{}, ...opts };
  if (body){ o.headers['Content-Type'] = 'application/json'; if (CSRF) o.headers['X-Hub-CSRF'] = CSRF; o.body = JSON.stringify(body); }
  let r;
  try { r = await (window.HUB ? HUB.fetch(url, o) : fetch(url, o)); }
  catch { throw new Error('Couldn\'t reach your server. Check your connection and try again.'); }
  let j; try { j = await r.json(); } catch { j = { error:`The server sent an unexpected reply (${r.status}).` }; }
  if (!r.ok || j.error) throw Object.assign(new Error(j.error || 'Request failed'), { status:r.status });
  return j;
}
const wOn = id => !!WCFG && WCFG.show && WCFG.list.some(w => w.id === id && w.on);
async function loadTasks(){
  try { const j = await siteJSON('../tasks/api.php'); WD.tasks = j.auth ? j.tasks : []; WD.set = j.settings || {}; WD.tasksErr = ''; }
  catch (e){ WD.tasksErr = e.message; }
  renderWidgets();
  // (1.72.0) today's events from the calendars you follow in Tasks (read-only)
  try { const s = await siteJSON('../tasks/api.php?action=subs'); const t = siteToday(), cals = Object.fromEntries((s.cals || []).map(c => [c.id, c]));
    WD.events = (s.events || []).filter(e => e.d === t).map(e => ({ ...e, cal:cals[e.c] || { name:'Calendar', color:'#4cc9f0' } })).sort((a, b) => (a.t || '').localeCompare(b.t || '')); renderWidgets(); } catch { WD.events = []; }
}
/* (1.72.0) Recent Links: the links you opened last on this device (Links keeps the list; nothing from a locked tab) */
function loadRecent(){
  try { WD.recent = (JSON.parse(localStorage.getItem('hub-recent-links') || '[]') || []).filter(x => x && /^https?:/i.test(x.u)).slice(0, 6); } catch { WD.recent = []; }
  renderWidgets();
}
/* (1.72.0) Recent Files: the names are locked, so they come from Files once it has opened them in this tab */
function loadFilesW(){
  try { WD.files = (JSON.parse(sessionStorage.getItem('hub-find-files') || '[]') || []).filter(x => x && x.t).sort((a, b) => b.t - a.t).slice(0, 5); } catch { WD.files = []; }
  renderWidgets();
}
/* (1.72.0) Server Status: the same overview as Settings › Overview (logged in only) */
async function loadStatus(){
  try { const j = window.HUB && HUB.api ? await HUB.api('overview') : null; if (!j || !j.ok) throw new Error(j && j.error || 'Couldn\'t check the site'); WD.status = j; WD.statusErr = ''; }
  catch (e){ WD.statusErr = e.message; }
  renderWidgets();
}
/* (1.72.0) Upcoming Bills: what is still to pay this month (and anything overdue), from Tasks: priced tasks only */
function billsNow(){
  const t = siteToday(), end = t.slice(0, 7) + '-31', cur = (WD.set && WD.set.currency) || '';
  const l = (WD.tasks || []).filter(x => x.status === 'active' && x.price != null && x.due <= end).sort((a, b) => a.due.localeCompare(b.due));
  const tot = {}; l.forEach(x => { const c = x.cur || cur; tot[c] = (tot[c] || 0) + x.price; });
  return { list:l, tot, over:l.filter(x => x.due < t).length };
}
function moneyW(v, c){ try { return new Intl.NumberFormat(c === 'INR' ? 'en-IN' : undefined, c ? { style:'currency', currency:c, maximumFractionDigits:2, minimumFractionDigits:0 } : { maximumFractionDigits:2 }).format(v); } catch { return String(v); } }
const dShortW = s => dParse(s).toLocaleDateString(undefined, { day:'numeric', month:'short' });
async function loadInfo(){
  try { WD.info = await siteJSON('../info/api.php'); WD.infoErr = ''; } catch (e){ WD.infoErr = e.message; }
  renderWidgets();
}
/* Tools keeps its recently used tools in this browser (the same site, so Home can read them); the names come from Tools' own list. */
async function loadTools(){
  let ids = [];
  try { ids = (JSON.parse(localStorage.getItem('tools.v3') || 'null') || {}).recent || []; } catch {}
  ids = ids.filter(x => typeof x === 'string').slice(0, 6);
  if (!ids.length){ WD.tools = []; renderWidgets(); return; }
  try {
    const list = await siteJSON('../tools/assets/tools-list.json');
    const by = Object.fromEntries((list.tools || []).map(t => [t.id, t.name]));
    WD.tools = ids.filter(id => by[id]).map(id => ({ id, name:by[id] }));
  } catch { WD.tools = []; }
  renderWidgets();
}
async function loadPad(){
  try { WD.pad = await api('pad'); WD.padErr = ''; } catch (e){ WD.padErr = e.message; }
  renderWidgets();
}
async function loadWeather(){
  try { WD.weather = await api('weather'); WD.weatherErr = ''; } catch (e){ WD.weatherErr = e.message; }
  renderWidgets();
}
function loadWidgets(){
  if (!WCFG) return;
  if (wOn('weather')) loadWeather();
  if (wOn('today') || wOn('calendar') || wOn('bills')) loadTasks();
  if (wOn('recent')) loadRecent();
  if (wOn('files')) loadFilesW();
  if (wOn('status')) loadStatus();
  if (wOn('note') && WCFG.note.box) loadInfo();
  if (wOn('tools')) loadTools();
  if (wOn('pad')) loadPad();
  // (1.72.0) a search result from the Scratch Pad: open it
  if (location.hash === '#pad' && wOn('pad')){ history.replaceState(null, '', location.pathname + location.search); if (wOpen !== 'pad') openWidget('pad'); }
}

