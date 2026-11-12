/* Homebase Hub: the small runtime that runs the React Bits background components WITHOUT React (1.74.0).
   The components are used as they come (JSX, useRef, useEffect, useMemo, useState); this file gives them what they call:
     h(tag, props, ...kids)   makes real DOM elements (className, style object, ref, on*, other attributes)
     useRef / useEffect / useMemo / useState   hooks kept on the running design
     start(Component, props, container)   runs it inside container and returns { update(props), destroy(), pause(), resume() }
   Pointer events: a background sits under the page, so the page's pointer events are handed on to the design's container
   (the components read the pointer from it), and it is paused while the tab is hidden. No React, no request to any server. */
let running = null;   // the design whose component function is being run

export const Fragment = Symbol('Fragment');

function setProp(el, k, v) {
  if (k === 'ref') { if (typeof v === 'function') v(el); else if (v) v.current = el; return; }
  if (k === 'children' || v == null || v === false) return;
  if (k === 'className') { el.setAttribute('class', v); return; }
  if (k === 'style') {
    for (const s in v) { const x = v[s]; if (x == null || x === false) continue; if (s.startsWith('--')) el.style.setProperty(s, String(x)); else el.style[s] = typeof x === 'number' && !/^(opacity|zIndex|flex|order|zoom|fontWeight|lineHeight)$/.test(s) ? x + 'px' : x; }
    return;
  }
  if (/^on[A-Z]/.test(k) && typeof v === 'function') { el.addEventListener(k.slice(2).toLowerCase(), v); return; }
  if (k === 'htmlFor') { el.setAttribute('for', v); return; }
  el.setAttribute(k, v === true ? '' : String(v));
}
function addKids(parent, kids) {
  for (const c of kids) {
    if (c == null || c === false || c === true) continue;
    if (Array.isArray(c)) addKids(parent, c);
    else if (c instanceof Node) parent.appendChild(c);
    else parent.appendChild(document.createTextNode(String(c)));
  }
}
export function h(tag, props, ...kids) {
  if (typeof tag === 'function') return tag({ ...props, children: kids });
  const el = tag === Fragment ? document.createDocumentFragment() : document.createElement(tag);
  if (tag !== Fragment) for (const k in props || {}) setProp(el, k, props[k]);
  addKids(el, kids);
  return el;
}

const same = (a, b) => a && b && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
export function useRef(init) { const d = running, i = d.i++; return d.hooks[i] || (d.hooks[i] = { current: init }); }
export function useMemo(fn, deps) { const d = running, i = d.i++, p = d.hooks[i]; if (p && same(p.deps, deps)) return p.value; return (d.hooks[i] = { deps, value: fn() }).value; }
export function useEffect(fn, deps) { const d = running, i = d.i++; d.effects.push([i, fn, deps]); }
export function useState(init) {
  const d = running, i = d.i++;
  if (!d.hooks[i]) d.hooks[i] = { value: typeof init === 'function' ? init() : init, set: (v) => { const s = d.hooks[i]; const nv = typeof v === 'function' ? v(s.value) : v; if (Object.is(nv, s.value)) return; s.value = nv; d.queue(); } };
  return [d.hooks[i].value, d.hooks[i].set];
}

export function start(Component, props, container) {
  const d = { hooks: [], effects: [], i: 0, cleanups: [], props, dead: false, queued: false, tree: null };
  const flush = () => {
    const todo = d.effects; d.effects = [];
    for (const [i, fn, deps] of todo) {
      const prev = d.cleanups[i];
      if (prev && deps && same(prev.deps, deps)) continue;
      if (prev && prev.fn) { try { prev.fn(); } catch (e) { /* a design must not break the page */ } }
      let out; try { out = fn(); } catch (e) { out = null; }
      d.cleanups[i] = { deps, fn: typeof out === 'function' ? out : null };
    }
  };
  const render = (first) => {
    running = d; d.i = 0; d.effects = [];
    let tree; try { tree = Component(d.props); } finally { running = null; }
    if (first) { d.tree = tree; if (tree instanceof Node) container.appendChild(tree); }
    flush();
  };
  d.queue = () => { if (d.queued || d.dead) return; d.queued = true; Promise.resolve().then(() => { d.queued = false; if (!d.dead) render(false); }); };
  render(true);
  // the page's pointer events go on to the design (it sits under the page): the components read them from their own element
  const root = d.tree instanceof Node ? d.tree : container, fwd = ['pointermove', 'mousemove'];   // (1.74.1) movement only: a forwarded press reached the page's click-away handlers (they run in the capture phase) and closed menus and sheets as they were pressed
  const KEYS = ['clientX', 'clientY', 'screenX', 'screenY', 'button', 'buttons', 'ctrlKey', 'shiftKey', 'altKey', 'metaKey', 'pointerId', 'pointerType', 'isPrimary', 'width', 'height', 'pressure', 'movementX', 'movementY'];
  const pass = (e) => {
    if (d.dead || e.__hubFwd || e.target instanceof Element && e.target.closest('input,textarea,select')) return;
    // the copy does not bubble, so only the design's own element sees it
    const init = { bubbles: false, cancelable: false };
    for (const k of KEYS) if (k in e) init[k] = e[k];
    let ev; try { ev = new (e.constructor)(e.type, init); } catch (x) { return; }
    ev.__hubFwd = true; root.dispatchEvent(ev);
  };
  const live = fwd.filter(() => matchMedia('(pointer: fine)').matches);
  live.forEach((t) => window.addEventListener(t, pass, { passive: true }));
  return {
    update(next) { d.props = { ...d.props, ...next }; render(false); },
    destroy() { d.dead = true; live.forEach((t) => window.removeEventListener(t, pass)); for (const c of d.cleanups) if (c && c.fn) { try { c.fn(); } catch (e) { /* ignore */ } } d.cleanups = []; if (d.tree instanceof Node && d.tree.parentNode) d.tree.parentNode.removeChild(d.tree); },
    root,
  };
}

/* what a design file registers for Home: HubDesigns[id].start(container, props) */
export function define(id, Component) {
  (window.HubDesigns = window.HubDesigns || {})[id] = { start: (container, props) => start(Component, props || {}, container) };
}
