// What Tools remembers in this browser: favourites, recently used, hidden tools, your own order, and the layout.
// Kept under one key. The first time, it picks up favourites and recent tools from the old Tools (tools.*.v1 keys).
const KEY = 'tools.v3';
const DEF = { fav: [], recent: [], hidden: [], order: {}, layout: 'side', compact: false };

function read(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
function ids(v) {   // the old app kept lists of ids, or of objects with an id
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === 'string' ? x : x && (x.id || x.toolId))).filter((x) => typeof x === 'string');
}

let S = null;
export function load(knownIds) {
  const saved = read(KEY);
  S = { ...DEF, ...(saved || {}) };
  if (!saved) {   // carry over from the old Tools once
    S.fav = ids(read('tools.favorites.v1'));
    S.recent = ids(read('tools.recent.v1'));
  }
  const ok = (id) => knownIds.has(id);
  S.fav = [...new Set(S.fav.filter(ok))]; S.recent = [...new Set(S.recent.filter(ok))].slice(0, 12); S.hidden = [...new Set(S.hidden.filter(ok))];
  if (!['side', 'tabs'].includes(S.layout)) S.layout = 'side';
  save();
  return S;
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* private mode: works for this visit only */ } }
export const state = () => S;

export function isFav(id) { return S.fav.includes(id); }
export function toggleFav(id) { S.fav = isFav(id) ? S.fav.filter((x) => x !== id) : [...S.fav, id]; save(); return isFav(id); }
export function used(id) { S.recent = [id, ...S.recent.filter((x) => x !== id)].slice(0, 12); save(); }
export function clearRecent() { S.recent = []; save(); }
export function isHidden(id) { return S.hidden.includes(id); }
export function toggleHidden(id) { S.hidden = isHidden(id) ? S.hidden.filter((x) => x !== id) : [...S.hidden, id]; save(); }
export function setLayout(l) { S.layout = l; save(); }
export function setCompact(c) { S.compact = !!c; save(); }

/** The tools of a section in your order (tools you never moved keep the built-in order at the end). */
export function ordered(section, list) {
  const mine = (S.order[section] || []).filter((id) => list.some((t) => t.id === id));
  return [...mine.map((id) => list.find((t) => t.id === id)), ...list.filter((t) => !mine.includes(t.id))];
}
export function move(section, list, id, by) {
  const ids2 = ordered(section, list).map((t) => t.id), i = ids2.indexOf(id), j = i + by;
  if (i < 0 || j < 0 || j >= ids2.length) return;
  [ids2[i], ids2[j]] = [ids2[j], ids2[i]]; S.order[section] = ids2; save();
}
export function resetAll() { S = { ...DEF }; save(); }
