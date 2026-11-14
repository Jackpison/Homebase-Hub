/* ---------- what each widget says ---------- */
function dueNow(){
  const t = siteToday();
  return (WD.tasks || []).filter(x => x.status === 'active' && x.due <= t)
    .sort((a, b) => a.due.localeCompare(b.due) || (a.time || '99').localeCompare(b.time || '99') || a.name.localeCompare(b.name));
}
function pinnedBox(){
  const n = WCFG.note, tab = (WD.info?.tabs || []).find(t => t.id === n.tab);
  const box = tab?.boxes?.find(b => b.id === n.box);
  return { tab, box };
}
function countdown(){
  const c = WCFG.countdown;
  if (!c.date) return null;
  const days = dDiff(c.date, siteToday()), name = c.name || 'Countdown';
  return { name, days, when: days > 1 ? plural(days, 'day', 'days') : days === 1 ? 'Tomorrow' : days === 0 ? 'Today' : plural(-days, 'day', 'days') + ' ago',
           chip: days > 1 ? `${name} in ${days} days` : days === 1 ? `${name} is tomorrow` : days === 0 ? `${name} is today` : `${name} was ${plural(-days, 'day', 'days')} ago` };
}
/* (1.79.0) live countdown: days, hours, minutes and seconds to the date (and the time, when one is set), in the site's time zone. One timer updates every .wcl. */
function cdLive(date, time){
  try {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone:SITE_TZ(), hourCycle:'h23', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit' }).formatToParts(new Date());
    const g = t => +p.find(x => x.type === t).value;
    const now = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second'));
    const [y, m, d] = date.split('-').map(Number), [hh, mm] = (time || '00:00').split(':').map(Number);
    let s = Math.floor((Date.UTC(y, m - 1, d, hh, mm, 0) - now) / 1000);
    if (s <= 0) return '';
    const days = Math.floor(s / 86400); s -= days * 86400;
    const h = Math.floor(s / 3600); s -= h * 3600;
    return `${days}d ${pad2(h)}h ${pad2(Math.floor(s / 60))}m ${pad2(s % 60)}s`;
  } catch { return ''; }
}
function cdTick(){ document.querySelectorAll('.wcl').forEach(e => { const el = /** @type {HTMLElement} */ (e); el.textContent = cdLive(el.dataset.d || '', el.dataset.t || ''); }); }
setInterval(cdTick, 1000);
/* Quote of the Day: short sayings, all long out of copyright, kept here (nothing is fetched). One a day; Another Quote shows the next. */
const QUOTES = [
  ['The journey of a thousand miles begins with a single step.', 'Lao Tzu'],
  ['Waste no more time arguing what a good man should be. Be one.', 'Marcus Aurelius'],
  ['Very little is needed to make a happy life.', 'Marcus Aurelius'],
  ['It is not that we have a short time to live, but that we waste a lot of it.', 'Seneca'],
  ['While we are postponing, life speeds by.', 'Seneca'],
  ['Begin at once to live, and count each separate day as a separate life.', 'Seneca'],
  ['Men are disturbed not by things, but by the views which they take of things.', 'Epictetus'],
  ['First say to yourself what you would be; and then do what you have to do.', 'Epictetus'],
  ['No man is free who is not master of himself.', 'Epictetus'],
  ['Well done is better than well said.', 'Benjamin Franklin'],
  ['Lost time is never found again.', 'Benjamin Franklin'],
  ['Little strokes fell great oaks.', 'Benjamin Franklin'],
  ['Write it on your heart that every day is the best day in the year.', 'Ralph Waldo Emerson'],
  ['Nothing great was ever achieved without enthusiasm.', 'Ralph Waldo Emerson'],
  ['Our life is frittered away by detail. Simplify, simplify.', 'Henry David Thoreau'],
  ['Heaven is under our feet as well as over our heads.', 'Henry David Thoreau'],
  ['It is not enough to be busy. The question is: what are we busy about?', 'Henry David Thoreau'],
  ['The best way out is always through.', 'Robert Frost'],
  ['Rest is not idleness.', 'John Lubbock'],
  ['There is nothing either good or bad, but thinking makes it so.', 'William Shakespeare'],
  ['The fault, dear Brutus, is not in our stars, but in ourselves.', 'William Shakespeare'],
  ['Hope is the thing with feathers that perches in the soul.', 'Emily Dickinson'],
  ['Forever is composed of nows.', 'Emily Dickinson'],
  ['If you shed tears when you miss the sun, you also miss the stars.', 'Rabindranath Tagore'],
  ['To know what you know and to know what you do not know, that is true knowledge.', 'Confucius'],
  ['Slow and steady wins the race.', 'Aesop'],
  ['Know thyself.', 'Inscription at Delphi'],
  ['Nothing in excess.', 'Inscription at Delphi'],
  ['Many hands make light work.', 'Proverb'],
  ['Measure twice, cut once.', 'Proverb'],
  ['Rome was not built in a day.', 'Proverb'],
];
let quoteMore = 0;
function quoteNow(){ const day = Math.floor(+dParse(siteToday()) / 86400000); return QUOTES[((day + quoteMore) % QUOTES.length + QUOTES.length) % QUOTES.length]; }
/* World Clock: the time in up to three places you choose, and how far ahead or behind you they are */
function tzOffset(tz, d){
  /** @type {any} */
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone:tz, hourCycle:'h23', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }).formatToParts(d).map(x => [x.type, x.value]));
  return Math.round((Date.UTC(+p.year, p.month - 1, +p.day, +p.hour, +p.minute) - d.getTime()) / 60000);
}
const zoneName = z => z.name || z.tz.split('/').pop().replace(/_/g, ' ');
function zoneNow(z){
  const d = new Date();
  try {
    const diff = tzOffset(z.tz, d) + d.getTimezoneOffset(), a = Math.abs(diff);
    return { name:zoneName(z), time:d.toLocaleTimeString([], { timeZone:z.tz, hour:'numeric', minute:'2-digit' }), day:d.toLocaleDateString([], { timeZone:z.tz, weekday:'short' }),
             off: diff === 0 ? 'Same time as you' : `${Math.floor(a / 60)}h${a % 60 ? ' ' + (a % 60) + 'm' : ''} ${diff > 0 ? 'ahead' : 'behind'}` };
  } catch { return { name:zoneName(z), time:'—', day:'', off:'Unknown time zone' }; }
}
const W_PIC = {
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  partly:W_META.weather.icon, cloud:'<path d="M7 19h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 2A3 3 0 0 0 7 19z"/>', fog:'<path d="M4 9h16M3 13h18M5 17h14"/>',
  rain:'<path d="M7 15h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 2A3 3 0 0 0 7 15z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
  snow:'<path d="M7 15h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 2A3 3 0 0 0 7 15z"/><path d="M8 19h.01M12 21h.01M16 19h.01"/>',
  storm:'<path d="M7 15h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 2A3 3 0 0 0 7 15z"/><path d="M13 14l-2 3.5h3L12 21"/>',
};
/** A short summary for the Glance card (and the chips). */
function summary(id){
  if (id === 'today'){
    if (WD.tasksErr) return { big:'—', small:'Couldn\'t load your tasks' };
    if (!WD.tasks) return { big:'…', small:'' };
    const l = dueNow(), over = l.filter(x => x.due < siteToday()).length, next = l.find(x => x.due === siteToday()) || l[0];
    return { big: l.length ? plural(l.length, 'task', 'tasks') : 'All clear', small: next ? 'Next: ' + next.name + (next.time ? ', ' + next.time : '') : 'Nothing due today',
             alert: over ? over + ' overdue' : '', chip: l.length ? plural(l.length - over, 'task', 'tasks') + ' today' + (over ? ' · ' + over + ' overdue' : '') : 'Nothing due today', hot: !!over };
  }
  if (id === 'countdown'){
    const c = countdown();
    return c ? { title:c.name, big:c.when, small:dLong(WCFG.countdown.date), chip:c.chip } : { big:'Not set', small:'Choose a date in Edit › Settings' };
  }
  if (id === 'note'){
    if (!WCFG.note.box) return { small:'Choose a note in Edit › Settings' };
    if (WD.infoErr) return { small:'Couldn\'t load Info' };
    if (!WD.info) return { small:'…' };
    const { tab, box } = pinnedBox();
    if (!box) return { small:'That note is gone. Choose another in Edit › Settings.' };
    if (tab.enc) return { title:'Pinned Note', small:'This note is encrypted. Open it in Info.' };
    return { title:box.title, small:box.notes.slice(0, 120) || 'Empty' };
  }
  if (id === 'tools'){
    if (!WD.tools) return { small:'…' };
    return { small: WD.tools.length ? WD.tools.map(t => t.name).join(' · ') : 'Tools you open show up here' };
  }
  if (id === 'calendar'){
    const t = siteToday();
    return { big: dParse(t).toLocaleDateString(undefined, { month:'long' }), small: dLong(t) };
  }
  if (id === 'quote'){ const q = quoteNow(); return { small:'“' + q[0] + '” ' + q[1] }; }
  if (id === 'worldclock'){
    if (!WCFG.zones.length) return { small:'Choose up to three places in Edit › Settings' };
    const z = WCFG.zones.map(zoneNow);
    return { title:z[0].name, big:z[0].time, small: z.length > 1 ? z.slice(1).map(x => x.name + ' ' + x.time).join(' · ') : [z[0].day, z[0].off].filter(Boolean).join(' · ') };
  }
  if (id === 'weather'){
    if (!WCFG.weather.town) return { small:'Type your town in Edit › Settings' };
    if (WD.weatherErr) return { small:WD.weatherErr };
    if (!WD.weather) return { small:'…' };
    const w = WD.weather;
    return { big:w.temp + '°', small:w.text + ' · ' + w.place.split(',')[0], chip:w.temp + '° ' + w.place.split(',')[0], pic:w.pic };
  }
  if (id === 'bills'){
    if (WD.tasksErr) return { small:'Couldn\'t load your tasks' };
    if (!WD.tasks) return { small:'…' };
    const b = billsNow(), sums = Object.entries(b.tot).map(([c, v]) => moneyW(v, c));
    return { big: sums[0] || 'Nothing', small: b.list.length ? plural(b.list.length, 'bill', 'bills') + ' left this month' + (sums.length > 1 ? ' · + ' + sums.slice(1).join(' · ') : '') : 'Nothing left to pay this month',
             alert: b.over ? b.over + ' overdue' : '', chip: sums[0] ? sums[0] + ' to pay' : 'No bills', hot: !!b.over };
  }
  if (id === 'recent'){
    if (!WD.recent) return { small:'…' };
    return { small: WD.recent.length ? WD.recent.slice(0, 3).map(x => x.n).join(' · ') : 'Links you open show up here' };
  }
  if (id === 'files'){
    if (!WD.files) return { small:'…' };
    return { small: WD.files.length ? WD.files.slice(0, 3).map(x => x.n).join(' · ') : 'Open Files to see your newest files here' };
  }
  if (id === 'status'){
    if (WD.statusErr) return { small:WD.statusErr };
    if (!WD.status) return { small:'…' };
    const o = WD.status, n = (o.alerts || []).length;
    return { big: n ? plural(n, 'thing', 'things') : 'All good', small: n ? o.alerts[0].text : 'Backups, updates and security look fine', alert: n ? 'Look' : '', chip: n ? plural(n, 'thing', 'things') + ' to see' : 'All good', hot: !!n };
  }
  if (id === 'pad'){
    if (WD.padErr) return { small:'Couldn\'t load the pad' };
    if (!WD.pad) return { small:'…' };
    return { small: WD.pad.text.slice(0, 120) || 'Empty. Click to write a quick note.' };
  }
  return {};
}

