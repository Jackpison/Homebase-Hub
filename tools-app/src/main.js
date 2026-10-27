// Tools: the page around the tools. Sections, search, favourites, recently used, your own order, settings.
// Every tool lives in src/tools/<id>.js and is loaded only when it is opened. The list of tools is src/tools.json, the one list the
// app, the website's tool finder and the tests all read.
import { presetsPanel } from './lib/presets.js';
import LOAD from './load.gen.js';
import DATA from './tools.json';
import { icon } from './icons.js';
import { h, button, seg, check, toast } from './ui.js';
import * as st from './state.js';
import './styles.css';

// LOAD (each tool's module, loaded when it is opened) is written from tools.json by build.mjs into load.gen.js (1.60): adding a tool
// is its line in tools.json and its file in tools/ (scripts/new-tool.py does both).


const TOOLS = DATA.tools, CATS = DATA.categories;
const BY = Object.fromEntries(TOOLS.map((t) => [t.id, t]));
st.load(new Set(TOOLS.map((t) => t.id)));

const root = document.getElementById('root');
const nav = h('nav', { class: 'tnav', 'aria-label': 'Tools sections' });
const view = h('main', { class: 'view', id: 'tools-main', tabindex: '-1' });
const app = h('div', { class: 'tl' }, nav, view);
root.replaceChildren(app);
let cleanup = null, lastList = '#/';

const visible = (list) => list.filter((t) => !st.isHidden(t.id));
const catName = (id) => (CATS.find((c) => c.id === id) || {}).name || id;

function layout() {
  const S = st.state();
  app.dataset.layout = S.layout; app.dataset.compact = String(S.layout === 'side' && S.compact);
}

function drawNav(route, cur) {
  const S = st.state(), side = S.layout === 'side';
  const count = (c) => visible(TOOLS.filter((t) => t.cat === c)).length;
  const item = (href, ic, label, on, cls, n, open) => h('a', { href, class: 'ni ' + cls + (open ? ' open' : ''), 'aria-current': on ? 'page' : null, title: label },
    h('span', { class: 'nt' }, icon(ic)), h('span', { class: 'nl', text: label }), n != null ? h('span', { class: 'nb', text: String(n) }) : null);
  const sections = CATS.flatMap((c) => {
    // 1.60: a section is one line; its tools are on the page itself (the menu no longer unfolds a list under it)
    const here = cur && cur.cat === c.id;
    return [item('#/s/' + c.id, c.icon, c.name, route === '#/s/' + c.id, 'c-' + c.id, count(c.id), here)];
  });
  const collapse = side ? h('button', { type: 'button', class: 'ncollapse', 'aria-label': S.compact ? 'Expand the menu to show names' : 'Collapse the menu to icons', title: S.compact ? 'Expand the menu' : 'Collapse the menu', onClick: () => { st.setCompact(!S.compact); layout(); drawNav(route, cur); } }, icon('panel')) : null;
  nav.replaceChildren(...[
    item('#/', 'apps', 'All Tools', route === '#/', 'c-gold', visible(TOOLS).length),
    item('#/recent', 'clock', 'Recent', route === '#/recent', 'c-gold'),
    item('#/favourites', 'star', 'Favourites', route === '#/favourites', 'c-gold'),
    h('span', { class: 'nsep', text: 'Sections', 'aria-hidden': 'true' }),
    ...sections,
    h('div', { class: 'nbot' }, item('#/organise', 'organise', 'Organise', route === '#/organise', 'c-gold'),
      h('div', { class: 'nrow' }, item('#/settings', 'settings', 'Settings', route === '#/settings', 'c-gold'), collapse)),
  ].filter(Boolean));
}

/** The file types a tool takes and gives, as small chips: JPG PNG +3 → JPG WEBP. */
function chips(t) {
  if (!t.in || !t.out) return null;
  const cut = (a, n) => (a.length > n ? [...a.slice(0, n), '+' + (a.length - n)] : a);
  const f = (x, o) => h('span', { class: 'f' + (o ? ' o' : ''), text: x.startsWith('+') ? x : x.toUpperCase() });
  return h('span', { class: 'fc' }, cut(t.in, 3).map((x) => f(x, false)), h('span', { class: 'fa', 'aria-hidden': 'true', text: '→' }), cut(t.out, 4).map((x) => f(x, true)));
}

function card(t) {
  const star = h('button', { type: 'button', class: 'star', 'aria-pressed': String(st.isFav(t.id)), 'aria-label': 'Favourite: ' + t.name }, icon(st.isFav(t.id) ? 'starf' : 'star'));
  star.addEventListener('click', () => { const on = st.toggleFav(t.id); star.setAttribute('aria-pressed', String(on)); star.replaceChildren(icon(on ? 'starf' : 'star')); toast(on ? t.name + ' is a favourite' : t.name + ' is no longer a favourite'); });
  return h('article', { class: 'tc c-' + t.cat },
    h('a', { href: '#/tool/' + t.id, class: 'tcm' }, h('span', { class: 'tci' }, icon(t.icon)), h('b', { text: t.name }), h('span', { class: 'td', text: t.desc }),
      h('span', { class: 'tf' }, chips(t) || h('span'), h('span', { class: 'go', 'aria-hidden': 'true' }, icon('ext')))),
    t.popular ? h('span', { class: 'pop-b', text: 'Popular' }) : null, star);
}
const grid = (list) => list.length ? h('div', { class: 'grid' }, list.map(card)) : null;
const heading = (title, sub) => h('header', { class: 'vh' }, h('h1', { text: title }), sub ? h('p', { text: sub }) : null);

function matches(t, q) {
  const hay = (t.name + ' ' + t.desc + ' ' + t.kw.join(' ') + ' ' + catName(t.cat)).toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}

function pageHome(q = '') {
  const results = h('div', { class: 'results' });
  const search = h('input', { type: 'search', class: 'inp big', id: 'tools-q', value: q, placeholder: 'Try "heic", "compress pdf" or "qr"', autocomplete: 'off', 'aria-label': 'Search the tools' });
  const count = h('p', { class: 'count', role: 'status', 'aria-live': 'polite' });
  const draw = () => {
    const s = search.value.trim();
    if (!s) {
      count.textContent = '';
      const S = st.state(), recent = visible(S.recent.map((id) => BY[id]).filter(Boolean)).slice(0, 6), favs = visible(S.fav.map((id) => BY[id]).filter(Boolean));
      results.replaceChildren(...[
        recent.length ? h('section', { class: 'sec' }, h('div', { class: 'sh' }, h('h2', { text: 'Recently Used' }), h('a', { href: '#/recent', text: 'See all' })), grid(recent)) : null,
        favs.length ? h('section', { class: 'sec' }, h('div', { class: 'sh' }, h('h2', { text: 'Favourites' })), grid(favs)) : null,
        ...CATS.map((c) => { const list = visible(st.ordered(c.id, TOOLS.filter((t) => t.cat === c.id))); return list.length ? h('section', { class: 'sec c-' + c.id }, h('div', { class: 'sh' }, h('h2', {}, h('span', { class: 'sdot' }, icon(c.icon)), c.name, h('small', { text: String(list.length) })), h('a', { href: '#/s/' + c.id, text: 'Open' })), h('p', { class: 'sd', text: c.desc }), grid(list)) : null; }),
      ].filter(Boolean));
      return;
    }
    const found = visible(TOOLS).filter((t) => matches(t, s));
    count.textContent = found.length ? found.length + (found.length === 1 ? ' tool' : ' tools') : 'No tool matches that. Try a shorter word.';
    results.replaceChildren(grid(found) || '');
  };
  search.addEventListener('input', draw);
  search.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const a = results.querySelector('.tcm'); if (a) location.hash = a.getAttribute('href'); } });
  const pop = TOOLS.filter((t) => t.popular).sort((a, b) => a.popular - b.popular);
  view.replaceChildren(
    h('section', { class: 'hero' }, h('h1', { text: 'What do you want to do?' }),
      h('p', { text: TOOLS.length + ' tools for images, photos, PDFs and everyday jobs. They run in your browser.' }),
      h('div', { class: 'qbox' }, icon('search'), search),
      h('div', { class: 'pop' }, h('span', { text: 'Popular' }), pop.map((t) => h('a', { href: '#/tool/' + t.id, class: 'chip', text: t.name })))),
    count, results);
  draw();
  if (!q) setTimeout(() => search.focus({ preventScroll: true }), 0);
}

function pageList(title, sub, list, empty) {
  view.replaceChildren(heading(title, sub), grid(list) || h('p', { class: 'empty', text: empty }));
}

function pageOrganise() {
  const body = h('div', { class: 'org' });
  const draw = () => body.replaceChildren(...CATS.map((c) => {
    const list = st.ordered(c.id, TOOLS.filter((t) => t.cat === c.id));
    return h('section', { class: 'sec' }, h('h2', {}, icon(c.icon), c.name), h('ul', { class: 'olist' }, list.map((t, i) => h('li', { class: st.isHidden(t.id) ? 'off' : '' },
      h('span', { class: 'on' }, icon(t.icon), h('span', { text: t.name })),
      h('button', { type: 'button', class: 'ib', 'aria-label': 'Move ' + t.name + ' up', disabled: i === 0, onClick: () => { st.move(c.id, TOOLS.filter((x) => x.cat === c.id), t.id, -1); draw(); } }, icon('up')),
      h('button', { type: 'button', class: 'ib', 'aria-label': 'Move ' + t.name + ' down', disabled: i === list.length - 1, onClick: () => { st.move(c.id, TOOLS.filter((x) => x.cat === c.id), t.id, 1); draw(); } }, icon('down')),
      h('button', { type: 'button', class: 'ib', 'aria-pressed': String(st.isFav(t.id)), 'aria-label': 'Favourite: ' + t.name, onClick: () => { st.toggleFav(t.id); draw(); } }, icon(st.isFav(t.id) ? 'starf' : 'star')),
      h('button', { type: 'button', class: 'ib', 'aria-pressed': String(!st.isHidden(t.id)), 'aria-label': 'Show ' + t.name, onClick: () => { st.toggleHidden(t.id); draw(); } }, icon(st.isHidden(t.id) ? 'eyeoff' : 'eye'))))));
  }));
  draw();
  view.replaceChildren(heading('Organise', 'Star favourites, change the order within a section, and hide tools you never use. Hidden tools stay here and in Settings.'), body);
}

function pageSettings() {
  const S = st.state();
  const lay = seg('Layout', [['side', 'Side Menu'], ['tabs', 'Tabs on Top']], S.layout, (v) => { st.setLayout(v); layout(); route(); });
  const comp = check('Show icons only in the side menu', S.compact, (v) => { st.setCompact(v); layout(); drawNav(location.hash || '#/'); });
  view.replaceChildren(heading('Tools Settings', 'Layout and your data are kept in this browser; presets on your server. Light and dark follow the site.'),
    h('section', { class: 'panel' }, h('h2', { text: 'Layout' }), lay.el, comp.el, h('p', { class: 'hint', text: 'Phones always show the sections as tabs.' })),
    h('section', { class: 'panel' }, h('h2', { text: 'Your Data' }),
      h('div', { class: 'row' }, button('Clear Recently Used', { icon: 'clock', onClick: () => { st.clearRecent(); toast('Recently used is empty'); } }),
        button('Reset Tools', { icon: 'refresh', onClick: () => { if (confirm('Reset favourites, your order, hidden tools and the layout?')) { st.resetAll(); layout(); route(); toast('Tools reset'); } } })),
      h('p', { class: 'hint', text: 'Files you open in a tool stay in your browser. Tools does not keep them.' })),
    presetsPanel());
}

async function pageTool(id) {
  const t = BY[id];
  if (!t) return pageList('Tool not found', 'That tool does not exist. Pick one below.', visible(TOOLS), '');
  st.used(id);
  document.title = t.name + ' · Tools';
  const star = h('button', { type: 'button', class: 'star big', 'aria-pressed': String(st.isFav(id)), 'aria-label': 'Favourite: ' + t.name }, icon(st.isFav(id) ? 'starf' : 'star'));
  star.addEventListener('click', () => { const on = st.toggleFav(id); star.setAttribute('aria-pressed', String(on)); star.replaceChildren(icon(on ? 'starf' : 'star')); });
  const body = h('div', { class: 'tbody', 'aria-busy': 'true' }, h('p', { class: 'loading', text: 'Loading the tool…' }));
  view.dataset.cat = t.cat;   // the page takes its section's colour
  const more = visible(TOOLS.filter((x) => x.cat === t.cat && x.id !== t.id)).slice(0, 8);
  view.replaceChildren(
    h('header', { class: 'th c-' + t.cat }, h('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' }, h('a', { href: '#/', text: 'Home' }), h('span', { 'aria-hidden': 'true', text: '/' }), h('a', { href: '#/s/' + t.cat, text: catName(t.cat) }), h('span', { 'aria-hidden': 'true', text: '/' }), h('span', { 'aria-current': 'page', text: t.name })),
      h('div', { class: 'tt' }, h('span', { class: 'tci big' }, icon(t.icon)), h('div', {}, h('h1', { text: t.name }), h('p', { text: t.desc }), chips(t)), star)),
    body,
    more.length ? h('section', { class: 'moretools c-' + t.cat }, h('h2', { text: 'More Tools' }), h('div', { class: 'mgrid' }, more.map((x) => h('a', { href: '#/tool/' + x.id, class: 'mt' }, h('span', { class: 'tci' }, icon(x.icon)), h('span', { text: x.name }), icon('ext'))))) : null);
  if (!LOAD[id]) { body.replaceChildren(h('p', { class: 'note', text: 'This tool is being rebuilt and will be back in the next version.' })); body.removeAttribute('aria-busy'); return; }
  try {
    const mod = await LOAD[id]();
    if (location.hash !== '#/tool/' + id) return;   // the visitor moved on while it loaded
    body.replaceChildren(); body.removeAttribute('aria-busy');
    cleanup = mod.default(body, { tool: t }) || null;
  } catch (e) {
    console.error(e);
    body.replaceChildren(h('p', { class: 'note bad', role: 'alert', text: 'This tool could not load. Check your connection and reload the page.' }));
  }
}

function route() {
  if (typeof cleanup === 'function') { try { cleanup(); } catch (e) { /* ignore */ } }
  cleanup = null;
  const hash = location.hash || '#/';
  const [path, qs] = hash.split('?');
  document.title = 'Tools';
  const cur = path.startsWith('#/tool/') ? { id: decodeURIComponent(path.slice(7)), cat: (BY[decodeURIComponent(path.slice(7))] || {}).cat } : path.startsWith('#/s/') ? { cat: path.slice(4) } : null;
  if (!path.startsWith('#/tool/')) delete view.dataset.cat;
  drawNav(path.startsWith('#/tool/') ? lastList : path, cur);
  if (path.startsWith('#/tool/')) pageTool(decodeURIComponent(path.slice(7)));
  else {
    lastList = path;
    if (path === '#/recent') pageList('Recently Used', 'The tools you opened last, newest first.', visible(st.state().recent.map((id) => BY[id]).filter(Boolean)), 'Tools you open will show up here.');
    else if (path === '#/favourites') pageList('Favourites', 'Star a tool to keep it here.', visible(st.state().fav.map((id) => BY[id]).filter(Boolean)), 'No favourites yet. Press the star on any tool.');
    else if (path.startsWith('#/s/') && CATS.some((c) => c.id === path.slice(4))) { const c = CATS.find((x) => x.id === path.slice(4)); pageList(c.name, c.desc, visible(st.ordered(c.id, TOOLS.filter((t) => t.cat === c.id))), 'Every tool in this section is hidden. Show them again in Organise.'); }
    else if (path === '#/organise') pageOrganise();
    else if (path === '#/settings') pageSettings();
    else if (path.startsWith('#/search/')) pageHome(decodeURIComponent(path.slice(9)));   // the site's search sends people here
    else pageHome(new URLSearchParams(qs || '').get('q') || '');
  }
  if (document.activeElement && document.activeElement !== document.body && !view.contains(document.activeElement)) view.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

layout();
window.addEventListener('hashchange', route);
route();
