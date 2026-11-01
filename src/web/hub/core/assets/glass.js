/*! GlassSurface - from React Bits by David Haz, https://reactbits.dev (https://github.com/DavidHDev/react-bits)
 * Ported to plain JavaScript for Homebase Hub (1.68.0): the SVG-filter glass for Chromium and the frosted glass for other browsers.
 * This file is NOT under Homebase Hub's GPL; it keeps the React Bits licence below.
 *
 * MIT + Commons Clause License Condition v1.0
 * Copyright (c) 2026 David Haz
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files
 * (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge,
 * publish, and distribute the Software as part of an application, website, or product, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 * Commons Clause Restriction: You may use this Software, including for any commercial purpose, so long as you do not sell, sublicense,
 * or redistribute the components themselves-whether alone, in a bundle, or as a ported version.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR
 * ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH
 * THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
/* What changed from the React component: no React (one filter, kept and re-pointed when the bar is drawn again); only the props the bar uses;
   the look lives in shell.css
   ("Bar Glass"). Loaded by shell.js only when Settings > Appearance > Bar Glass is on. The map is built from numbers only, never page text. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var O = { borderWidth: 0.07, brightness: 50, opacity: 0.93, blur: 11, displace: 0.5, saturation: 1,
    distortionScale: 0, redOffset: 0, greenOffset: 0, blueOffset: 0, xChannel: 'R', yChannel: 'G', mixBlendMode: 'difference' };
  var ID = 'ix-glass-f', svgEl = null, img = null, el = null, ro = null, last = '', flat = true;

  /* The component's own test: Safari and Firefox can't use an SVG filter as a backdrop filter, so they get the frosted glass. */
  function svgOK() {
    var ua = navigator.userAgent;
    if ((/Safari/.test(ua) && !/Chrome/.test(ua)) || /Firefox/.test(ua)) return false;
    var d = document.createElement('div'); d.style.backdropFilter = 'url(#' + ID + ')';
    return d.style.backdropFilter !== '';
  }
  /* The displacement map: red bends sideways, blue up and down, a soft grey middle (50% = no bend) keeps the centre calm. */
  function map(w, h, r) {
    var e = Math.min(w, h) * (O.borderWidth * 0.5);
    var s = '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg"><defs>' +
      '<linearGradient id="gr" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="red"/></linearGradient>' +
      '<linearGradient id="gb" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="blue"/></linearGradient>' +
      '<filter id="gs" filterUnits="userSpaceOnUse" x="0" y="0" width="' + w + '" height="' + h + '" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="' + O.blur + '"/></filter></defs>' +
      '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="black"/>' +
      '<rect x="0" y="0" width="' + w + '" height="' + h + '" rx="' + r + '" fill="url(#gr)"/>' +
      '<rect x="0" y="0" width="' + w + '" height="' + h + '" rx="' + r + '" fill="url(#gb)" style="mix-blend-mode:' + O.mixBlendMode + '"/>' +
      '<rect x="' + e + '" y="' + e + '" width="' + (w - e * 2) + '" height="' + (h - e * 2) + '" rx="' + r + '" fill="hsl(0 0% ' + O.brightness + '% / ' + O.opacity + ')" filter="url(#gs)"/></svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(s);
  }
  function node(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n);
    return n;
  }
  /* The filter, made once: the map, then red, green and blue each bent a little differently (the coloured fringe), screened together. */
  function filter() {
    if (svgEl && document.body.contains(svgEl)) return;
    svgEl = node('svg', { 'aria-hidden': 'true', focusable: 'false', 'class': 'ix-glass-defs' });
    var f = node('filter', { id: ID, 'color-interpolation-filters': 'sRGB', x: '0', y: '0', width: '100%', height: '100%' }, node('defs', {}, svgEl));
    img = node('feImage', { x: '0', y: '0', width: '100%', height: '100%', preserveAspectRatio: 'none', result: 'map' }, f);   // as the component (1.68.1: 1.68.0 set pixels, which made the bend much weaker)
    var M = { R: '1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0', G: '0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0', B: '0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0' };
    [['R', O.redOffset], ['G', O.greenOffset], ['B', O.blueOffset]].forEach(function (c) {
      node('feDisplacementMap', { 'in': 'SourceGraphic', in2: 'map', result: 'd' + c[0], scale: String(O.distortionScale + c[1]), xChannelSelector: O.xChannel, yChannelSelector: O.yChannel, 'data-c': c[0] }, f);
      node('feColorMatrix', { 'in': 'd' + c[0], type: 'matrix', values: M[c[0]], result: 'c' + c[0] }, f);
    });
    node('feBlend', { 'in': 'cR', in2: 'cG', mode: 'screen', result: 'rg' }, f);
    node('feBlend', { 'in': 'rg', in2: 'cB', mode: 'screen', result: 'output' }, f);
    node('feGaussianBlur', { 'in': 'output', stdDeviation: String(O.displace) }, f);
    document.body.appendChild(svgEl);
    last = '';
  }
  /* A new map whenever the glass changes size (the corners follow its own radius). */
  function draw() {
    if (!el || !img) return;
    var w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
    if (!w || !h) return;
    var r = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, h / 2), k = w + 'x' + h + 'r' + r;
    if (k === last) return;
    last = k;
    img.setAttribute('href', map(w, h, r));
  }
  /* Puts the glass on one element (the bar, or the dock's pill); a new element takes it over from the old one. */
  function apply(target) {
    if (!target) return;
    if (target === el && target.classList.contains('glass-surface')) return;
    off();
    el = target;
    var svg = svgOK();
    el.classList.add('glass-surface', svg ? 'glass-surface--svg' : 'glass-surface--fallback');
    if (!svg) return;
    filter();
    el.style.setProperty('--filter-id', flat ? 'blur(0px)' : 'url(#' + ID + ')');
    last = ''; draw();
    if (window.ResizeObserver) { ro = new ResizeObserver(draw); ro.observe(el); }
  }
  function off() {
    if (ro) { ro.disconnect(); ro = null; }
    if (el) { el.classList.remove('glass-surface', 'glass-surface--svg', 'glass-surface--fallback'); el.style.removeProperty('--filter-id'); }
    el = null;
  }
  /* (1.68.2) Settings > Appearance > Glass: bend (0-100, 60 = the component's -180), edge (2-40 = 2-40% of the shorter side, 7 = 0.07)
     and fringe (0-40: green bends that much more than red, blue twice that; 10 = the component's 10/20). Frost, tint and saturation are CSS.
     (1.68.3) Bend and fringe 0 (the default) use no SVG filter at all: plain glass, nothing read from outside the bar (Chrome mirrors the
     page there, which showed as upside-down copies of the text). The bending is the "Liquid" pick. */
  function set(fx) {
    fx = fx || {};
    var num = function (v, d) { return typeof v === 'number' && isFinite(v) ? v : d; };
    O.distortionScale = -3 * num(fx.bend, 0); O.borderWidth = num(fx.edge, 7) / 100;
    O.greenOffset = num(fx.fringe, 0); O.blueOffset = 2 * O.greenOffset;
    flat = !O.distortionScale && !O.greenOffset;
    if (el && el.classList.contains('glass-surface--svg')) el.style.setProperty('--filter-id', flat ? 'blur(0px)' : 'url(#' + ID + ')');
    if (!svgEl) return;
    var off = { R: O.redOffset, G: O.greenOffset, B: O.blueOffset };
    svgEl.querySelectorAll('feDisplacementMap').forEach(function (d) { d.setAttribute('scale', String(O.distortionScale + off[d.getAttribute('data-c')])); });
    last = ''; draw();
  }
  window.HubGlass = { apply: apply, off: off, svgOK: svgOK, set: set };
})();
