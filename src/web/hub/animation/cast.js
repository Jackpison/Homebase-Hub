/* Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 *
 * Characters: the small part every page that has them loads. It does nothing until the page calls HubCast.start();
 * only then are three.js, the engine and the models loaded (all from this site). Off = nothing is loaded.
 *
 *   HubCast.start(settings, host)  settings: { on, count (1-5), ids ([] = all), pace ('lively' | 'calm'), beam (true/false) }
 *                                  host: { surfaces() -> [{ id, x1, x2, y }], interactive: 'css selector', shakeTargets() -> [elements] }
 *   HubCast.update(settings)       apply new settings (on/off, who, how many)
 *   HubCast.play(id)               start an activity now (Home Settings > Characters > Play)
 *   HubCast.catalog()              the characters and activities, for the settings window
 *   HubCast.stop()
 */
(function(){
'use strict';
const C = window.HubCast = window.HubCast || {};
const me = document.currentScript;
const base = me.src.replace(/[^/?#]*([?#].*)?$/, '');
const ver = (me.src.match(/[?&]v=([^&#]+)/) || [])[1] || '';
const q = ver ? '?v=' + ver : '';
let stage = null, loading = null, cfg = null, hostRef = null, catalog = null;

function script(src){
  return new Promise((ok, no) => { const s = document.createElement('script'); s.src = base + src + q; s.onload = ok; s.onerror = () => no(new Error('Could not load ' + src)); document.head.appendChild(s); });
}
/* three.js and the engine, once */
function loadEngine(){
  if (!loading) loading = (async () => {
    if (!document.querySelector('link[data-hubcast]')){ const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = base + 'stage.css' + q; l.dataset.hubcast = '1'; document.head.appendChild(l); }
    if (!window.THREE) await script('vendor/three.min.js');
    if (!window.THREE.GLTFLoader) await script('vendor/GLTFLoader.js');
    for (const f of ['engine.js', 'fx.js', 'props.js', 'activities.js']) await script(f);
  })();
  return loading;
}
C.catalog = async function(){
  if (!catalog) catalog = fetch(base + 'cast.json' + q).then(r => { if (!r.ok) throw new Error('cast.json ' + r.status); return r.json(); });
  const cast = await catalog;
  await loadEngine();
  return { cast: cast.cast, activities: Object.entries(C.activities || {}).map(([id, a]) => ({ id, name: a.name })) };
};
const reducedMQ = matchMedia('(prefers-reduced-motion: reduce)');
function webgl(){ try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }
/* which characters are on stage this time: a random pick from the allowed ones */
function choose(all, s){
  const allowed = s.ids && s.ids.length ? all.filter(d => s.ids.includes(d.id)) : all;
  const list = allowed.slice().sort(() => Math.random() - .5);
  return list.slice(0, Math.max(1, Math.min(5, s.count || 2))).map(d => d.id);
}
C.start = async function(settings, host){
  cfg = Object.assign({ on: true, count: 2, ids: [], pace: 'lively', beam: true }, settings || {});
  hostRef = host || hostRef || {};
  if (!cfg.on || !webgl()) return C.stop();
  if (stage){ return C.update(cfg); }
  const cat = await (catalog || (catalog = fetch(base + 'cast.json' + q).then(r => r.json())));
  await loadEngine();
  if (stage || !cfg.on) return;
  stage = C.createStage({ cast: cat, host: hostRef, base, settings: cfg, reduced: reducedMQ.matches });
  if (!stage) return;
  await stage.setCast(choose(cat.cast, cfg), cfg.count);
  document.documentElement.classList.add('hc-on');
};
C.update = async function(settings){
  cfg = Object.assign(cfg || {}, settings || {});
  if (!cfg.on) return C.stop();
  if (!stage) return C.start(cfg, hostRef);
  const cat = await catalog;
  const keep = stage.E.actors.map(a => a.id).filter(id => !cfg.ids.length || cfg.ids.includes(id));
  const extra = choose(cat.cast.filter(d => !keep.includes(d.id)), cfg);
  await stage.setCast(keep.concat(extra).slice(0, cfg.count), cfg.count);
};
C.play = async function(id){ if (!stage) await C.start(Object.assign({}, cfg, { on: true }), hostRef); return stage ? stage.play(id) : false; };
C.stop = function(){ if (stage){ stage.stop(); stage = null; } document.documentElement.classList.remove('hc-on'); };
C.reflow = () => stage && stage.reflow();
C.running = () => !!stage;
})();
