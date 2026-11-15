// Time Zone Converter: a date and time in one place, shown in every time zone you pick (summer time included).
import { h, panel, field, input, button, toast } from '../ui.js';

const KEY = 'tools.timezones.v1';
// Browsers list some zones by an old name (Chrome: Asia/Calcutta); show the name people know when the browser accepts it
const MODERN = { 'Asia/Calcutta': 'Asia/Kolkata', 'Asia/Katmandu': 'Asia/Kathmandu', 'Europe/Kiev': 'Europe/Kyiv', 'America/Godthab': 'America/Nuuk', 'Asia/Saigon': 'Asia/Ho_Chi_Minh', 'Asia/Rangoon': 'Asia/Yangon', 'Pacific/Enderbury': 'Pacific/Kanton', 'Atlantic/Faeroe': 'Atlantic/Faroe' };
const valid = (z) => { try { new Intl.DateTimeFormat('en', { timeZone: z }); return true; } catch (e) { return false; } };
const modern = (z) => (MODERN[z] && valid(MODERN[z]) ? MODERN[z] : z);
const HERE = modern(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
const ALL = (() => { let l; try { l = Intl.supportedValuesOf('timeZone'); } catch (e) { l = ['UTC', 'Asia/Kolkata', 'Europe/London', 'America/New_York']; } return [...new Set(l.map(modern))].sort(); })();
const city = (z) => z === 'UTC' ? 'UTC' : z.split('/').pop().replace(/_/g, ' ');
/** How far zone z is ahead of UTC at instant t, in milliseconds. */
export function offset(z, t) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: z, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(t).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - Math.floor(t / 1000) * 1000;
}
/** The instant when the clocks in zone z show the wall time w (given as if it were UTC). */
export function instant(w, z) { const a = w - offset(z, w); return w - offset(z, a); }
const off = (ms) => { const m = Math.round(ms / 60000), s = m < 0 ? '−' : '+', a = Math.abs(m); return 'UTC' + s + Math.floor(a / 60) + (a % 60 ? ':' + String(a % 60).padStart(2, '0') : ''); };
const wallNow = (z) => { const t = Date.now(); return new Date(t + offset(z, t)).toISOString().slice(0, 16); };

export default function (root) {
  let zones; try { zones = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { zones = null; }
  if (!Array.isArray(zones) || !zones.every((z) => typeof z === 'string' && valid(z))) zones = [...new Set([HERE, 'UTC', 'Asia/Kolkata', 'Europe/London', 'America/New_York'])];
  zones = zones.map(modern);
  const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(zones)); } catch (e) { /* private mode */ } };
  const dl = h('datalist', { id: 'tz-all' }, ALL.map((z) => h('option', { value: z })));
  const from = input({ list: 'tz-all', value: HERE, autocomplete: 'off', spellcheck: false, onChange: () => draw() }), when = input({ type: 'datetime-local', value: wallNow(HERE), onInput: () => draw() });
  const add = input({ list: 'tz-all', placeholder: 'Type a city, like Tokyo or Dubai', autocomplete: 'off', spellcheck: false });
  const pick = (v) => { v = v.trim(); if (!v) return null; return ALL.find((z) => z.toLowerCase() === v.toLowerCase()) || ALL.find((z) => city(z).toLowerCase() === v.toLowerCase()) || ALL.find((z) => z.toLowerCase().includes(v.toLowerCase().replace(/ /g, '_'))) || (v.toUpperCase() === 'UTC' ? 'UTC' : null); };
  const addZone = () => { const z = pick(add.value); if (!z) return toast('No time zone by that name.', true); if (!zones.includes(z)) zones.push(z); keep(); add.value = ''; draw(); };
  add.addEventListener('keydown', (e) => { if (e.key === 'Enter') addZone(); });
  const list = h('div', { class: 'flist', 'aria-live': 'polite' }), info = h('p', { class: 'hint' });
  function draw() {
    const z0 = pick(from.value) || HERE, m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(when.value);
    if (!m) { list.replaceChildren(h('p', { class: 'note', text: 'Choose a date and time.' })); return; }
    const t = instant(Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5]), z0), dayOf = (z) => new Date(t + offset(z, t)).toISOString().slice(0, 10), d0 = dayOf(z0);
    info.textContent = 'In ' + city(z0) + ' (' + off(offset(z0, t)) + ').';
    list.replaceChildren(...zones.map((z, i) => {
      const o = offset(z, t), d = dayOf(z), rel = d === d0 ? '' : d > d0 ? ' · next day' : ' · day before';
      const time = new Intl.DateTimeFormat(undefined, { timeZone: z, hour: 'numeric', minute: '2-digit' }).format(t), date = new Intl.DateTimeFormat(undefined, { timeZone: z, weekday: 'short', day: 'numeric', month: 'short' }).format(t);
      return h('div', { class: 'tzrow panel' }, h('div', {}, h('strong', { text: city(z) + (z === HERE ? ' (here)' : '') }), h('small', { text: z + ' · ' + off(o) })), h('div', {}, h('b', { text: time }), h('small', { text: date + rel })),
        h('div', { class: 'tb' }, button('', { icon: 'up', small: true, aria: 'Move ' + city(z) + ' up', onClick: () => { if (i) { [zones[i - 1], zones[i]] = [zones[i], zones[i - 1]]; keep(); draw(); } } }),
          button('', { icon: 'x', small: true, aria: 'Remove ' + city(z), onClick: () => { zones.splice(i, 1); keep(); draw(); } })));
    }));
  }
  root.append(dl, h('div', { class: 'cols pl' }, h('div', {}, list),
    panel(h('h2', { text: 'Time' }), field('Date and Time', when), field('In This Time Zone', from), info, h('div', { class: 'row' }, button('Now', { small: true, onClick: () => { when.value = wallNow(pick(from.value) || HERE); draw(); } })),
      h('h2', { text: 'Add a Time Zone' }), field('City or Zone', add), button('Add', { icon: 'plus', onClick: addZone }))));
  draw();
}
