// Tools: the page around the tools. Sections, search, favourites, recently used, your own order, settings.
// Every tool lives in src/tools/<id>.js and is loaded only when it is opened. The list of tools is src/tools.json, the one list the
// app, the website's tool finder and the tests all read.
import DATA from './tools.json';
import { icon } from './icons.js';
import { h, button, seg, check, toast } from './ui.js';
import * as st from './state.js';
import './styles.css';

// The tools that are built. Every id in tools.json gets a line here.
const LOAD = {
  'qr-generator': () => import('./tools/qr-generator.js'),
  'favicon': () => import('./tools/favicon.js'),
  'json-formatter': () => import('./tools/json-formatter.js'),
  'text-tools': () => import('./tools/text-tools.js'),
  'generators': () => import('./tools/generators.js'),
  'hash-generator': () => import('./tools/hash-generator.js'),
  'zip-creator': () => import('./tools/zip-creator.js'),
  'img-rotate': () => import('./tools/img-rotate.js'),
  'img-adjust': () => import('./tools/img-adjust.js'),
  'img-watermark': () => import('./tools/img-watermark.js'),
  'img-colors': () => import('./tools/img-colors.js'),
  'img-beautify': () => import('./tools/img-beautify.js'),
  'svg-png': () => import('./tools/svg-png.js'),
  'img-base64': () => import('./tools/img-base64.js'),
  'image-converter': () => import('./tools/image-converter.js'),
  'image-compress': () => import('./tools/image-compress.js'),
  'image-resize': () => import('./tools/image-resize.js'),
  'bg-remove': () => import('./tools/bg-remove.js'),
  'img-redact': () => import('./tools/img-redact.js'),
  'id-photo': () => import('./tools/id-photo.js'),
  'meme': () => import('./tools/meme.js'),
  'image-crop': () => import('./tools/image-crop.js'),
  'circle-crop': () => import('./tools/circle-crop.js'),
  'collage': () => import('./tools/collage.js'),
  'image-metadata': () => import('./tools/image-metadata.js'),
  'pdf-split': () => import('./tools/pdf-split.js'),
  'pdf-organize': () => import('./tools/pdf-organize.js'),
  'pdf-sign': () => import('./tools/pdf-sign.js'),
  'pdf-annotate': () => import('./tools/pdf-annotate.js'),
  'pdf-protect': () => import('./tools/pdf-protect.js'),
  'pdf-stamp': () => import('./tools/pdf-stamp.js'),
  'pdf-text': () => import('./tools/pdf-text.js'),
  'pdf-compress': () => import('./tools/pdf-compress.js'),
  'pdf-merge': () => import('./tools/pdf-merge.js'),
  'images-to-pdf': () => import('./tools/images-to-pdf.js'),
  'pdf-to-images': () => import('./tools/pdf-to-images.js'),
};

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

function drawNav(route) {
  const item = (href, ic, label, on) => h('a', { href, class: 'ni', 'aria-current': on ? 'page' : null, title: label }, icon(ic), h('span', { text: label }));
  const S = st.state();
  nav.replaceChildren(...[
    item('#/', 'apps', 'All Tools', route === '#/'),
    item('#/recent', 'clock', 'Recent', route === '#/recent'),
    item('#/favourites', 'star', 'Favourites', route === '#/favourites'),
    h('span', { class: 'nsep', text: 'Sections', 'aria-hidden': 'true' }),
    ...CATS.map((c) => item('#/s/' + c.id, c.icon, c.name, route === '#/s/' + c.id)),
    h('span', { class: 'nsep', 'aria-hidden': 'true' }),
    item('#/organise', 'organise', 'Organise', route === '#/organise'),
    item('#/settings', 'settings', 'Settings', route === '#/settings'),
    S.layout === 'side' ? h('button', { type: 'button', class: 'ni ncollapse', 'aria-label': S.compact ? 'Show the menu names' : 'Show icons only', title: S.compact ? 'Show the menu names' : 'Show icons only', onClick: () => { st.setCompact(!S.compact); layout(); drawNav(route); } }, icon('panel'), h('span', { text: S.compact ? 'Expand' : 'Collapse' })) : null,
  ].filter(Boolean));
}

function card(t) {
  const star = h('button', { type: 'button', class: 'star', 'aria-pressed': String(st.isFav(t.id)), 'aria-label': 'Favourite: ' + t.name }, icon(st.isFav(t.id) ? 'starf' : 'star'));
  star.addEventListener('click', () => { const on = st.toggleFav(t.id); star.setAttribute('aria-pressed', String(on)); star.replaceChildren(icon(on ? 'starf' : 'star')); toast(on ? t.name + ' is a favourite' : t.name + ' is no longer a favourite'); });
  return h('article', { class: 'tc c-' + t.cat },
    h('a', { href: '#/tool/' + t.id, class: 'tcm' }, h('span', { class: 'tci' }, icon(t.icon)), h('span', { class: 'tct' }, h('b', { text: t.name }), h('span', { text: t.desc }))), star);
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
        ...CATS.map((c) => { const list = visible(st.ordered(c.id, TOOLS.filter((t) => t.cat === c.id))); return list.length ? h('section', { class: 'sec' }, h('div', { class: 'sh' }, h('h2', {}, icon(c.icon), c.name, h('small', { text: String(list.length) })), h('a', { href: '#/s/' + c.id, text: 'Open' })), h('p', { class: 'sd', text: c.desc }), grid(list)) : null; }),
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
  view.replaceChildren(heading('Tools Settings', 'These choices are kept in this browser. Light and dark follow the site.'),
    h('section', { class: 'panel' }, h('h2', { text: 'Layout' }), lay.el, comp.el, h('p', { class: 'hint', text: 'Phones always show the sections as tabs.' })),
    h('section', { class: 'panel' }, h('h2', { text: 'Your Data' }),
      h('div', { class: 'row' }, button('Clear Recently Used', { icon: 'clock', onClick: () => { st.clearRecent(); toast('Recently used is empty'); } }),
        button('Reset Tools', { icon: 'refresh', onClick: () => { if (confirm('Reset favourites, your order, hidden tools and the layout?')) { st.resetAll(); layout(); route(); toast('Tools reset'); } } })),
      h('p', { class: 'hint', text: 'Files you open in a tool stay in your browser. Tools does not keep them.' })));
}

async function pageTool(id) {
  const t = BY[id];
  if (!t) return pageList('Tool not found', 'That tool does not exist. Pick one below.', visible(TOOLS), '');
  st.used(id);
  document.title = t.name + ' · Tools';
  const star = h('button', { type: 'button', class: 'star big', 'aria-pressed': String(st.isFav(id)), 'aria-label': 'Favourite: ' + t.name }, icon(st.isFav(id) ? 'starf' : 'star'));
  star.addEventListener('click', () => { const on = st.toggleFav(id); star.setAttribute('aria-pressed', String(on)); star.replaceChildren(icon(on ? 'starf' : 'star')); });
  const body = h('div', { class: 'tbody', 'aria-busy': 'true' }, h('p', { class: 'loading', text: 'Loading the tool…' }));
  view.replaceChildren(
    h('header', { class: 'th c-' + t.cat }, h('a', { href: lastList, class: 'back' }, icon('back'), h('span', { text: 'All Tools' })),
      h('div', { class: 'tt' }, h('span', { class: 'tci' }, icon(t.icon)), h('div', {}, h('h1', { text: t.name }), h('p', { text: t.desc })), star)),
    body);
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
  drawNav(path.startsWith('#/tool/') ? lastList : path);
  if (path.startsWith('#/tool/')) pageTool(decodeURIComponent(path.slice(7)));
  else {
    lastList = path;
    if (path === '#/recent') pageList('Recently Used', 'The tools you opened last, newest first.', visible(st.state().recent.map((id) => BY[id]).filter(Boolean)), 'Tools you open will show up here.');
    else if (path === '#/favourites') pageList('Favourites', 'Star a tool to keep it here.', visible(st.state().fav.map((id) => BY[id]).filter(Boolean)), 'No favourites yet. Press the star on any tool.');
    else if (path.startsWith('#/s/') && CATS.some((c) => c.id === path.slice(4))) { const c = CATS.find((x) => x.id === path.slice(4)); pageList(c.name, c.desc, visible(st.ordered(c.id, TOOLS.filter((t) => t.cat === c.id))), 'Every tool in this section is hidden. Show them again in Organise.'); }
    else if (path === '#/organise') pageOrganise();
    else if (path === '#/settings') pageSettings();
    else pageHome(new URLSearchParams(qs || '').get('q') || '');
  }
  if (document.activeElement && document.activeElement !== document.body && !view.contains(document.activeElement)) view.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

layout();
window.addEventListener('hashchange', route);
route();
