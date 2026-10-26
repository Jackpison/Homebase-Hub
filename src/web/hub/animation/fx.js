/* Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 *
 * Characters: effects. Particles (sparks, dust, steam, hearts, notes, confetti...), shockwave rings, sword slashes, auras,
 * glowing orbs, the energy beam, lights, and crisp HTML words and speech bubbles over the 3D. Positions are screen px.
 */
(function(){
'use strict';
const C = window.HubCast;
const T = window.THREE;

const NOISE = `
float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float nz(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hh(i), hh(i + vec2(1.0, 0.0)), u.x), mix(hh(i + vec2(0.0, 1.0)), hh(i + vec2(1.0, 1.0)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a * nz(p); p *= 2.03; a *= 0.5; } return v; }`;

/* textures for particles, drawn once in white so any colour can tint them */
function tex(draw, size){
  const c = document.createElement('canvas'); c.width = c.height = size || 64;
  const g = c.getContext('2d'); g.translate(c.width / 2, c.height / 2); g.scale(c.width / 64, c.height / 64); g.fillStyle = '#fff'; g.strokeStyle = '#fff';
  draw(g);
  const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t;
}
const radial = (g, r, stops) => { const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); for (const [o, a] of stops) gr.addColorStop(o, `rgba(255,255,255,${a})`); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); };
const star = (g, n, r1, r2) => { g.beginPath(); for (let i = 0; i < n * 2; i++){ const r = i % 2 ? r2 : r1, a = i / (n * 2) * Math.PI * 2 - Math.PI / 2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); };
const TEX = {
  soft:  () => tex(g => radial(g, 31, [[0, 1], [.35, .55], [1, 0]])),
  glow:  () => tex(g => radial(g, 31, [[0, 1], [.12, 1], [.3, .45], [1, 0]])),
  spark: () => tex(g => { radial(g, 20, [[0, .9], [1, 0]]); star(g, 4, 30, 4.5); g.fill(); }),
  star:  () => tex(g => { g.shadowColor = '#fff'; g.shadowBlur = 6; star(g, 5, 24, 10.5); g.fill(); }),
  ring:  () => tex(g => { g.lineWidth = 5; g.shadowColor = '#fff'; g.shadowBlur = 8; g.beginPath(); g.arc(0, 0, 24, 0, 7); g.stroke(); }),
  smoke: () => tex(g => { for (const [x, y, r] of [[-9, 4, 17], [9, 5, 16], [0, -7, 19], [-2, 9, 14], [12, -4, 12]]){ g.save(); g.translate(x, y); radial(g, r, [[0, .55], [.6, .3], [1, 0]]); g.restore(); } }),
  drop:  () => tex(g => { g.beginPath(); g.moveTo(0, -24); g.bezierCurveTo(14, -4, 16, 8, 0, 22); g.bezierCurveTo(-16, 8, -14, -4, 0, -24); g.fill();
    g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.ellipse(-5, 4, 3, 6, -.3, 0, 7); g.fill(); }),
  heart: () => tex(g => { g.shadowColor = '#fff'; g.shadowBlur = 4; g.beginPath(); g.moveTo(0, 22); g.bezierCurveTo(-30, 2, -20, -26, 0, -10); g.bezierCurveTo(20, -26, 30, 2, 0, 22); g.fill(); }),
  note:  () => tex(g => { g.beginPath(); g.ellipse(-8, 14, 10, 7.5, -.4, 0, 7); g.fill(); g.fillRect(-0.5, -24, 5, 38); g.beginPath(); g.moveTo(2, -24); g.quadraticCurveTo(22, -18, 16, -2); g.quadraticCurveTo(16, -12, 2, -12); g.fill(); }),
  zz:    () => tex(g => { g.font = '900 46px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 6; g.lineJoin = 'round'; g.strokeStyle = 'rgba(30,30,60,.55)'; g.strokeText('z', 0, 2); g.fillText('z', 0, 2); }),
  anger: () => tex(g => { g.lineWidth = 6; g.lineCap = 'round'; for (let i = 0; i < 4; i++){ g.save(); g.rotate(i * Math.PI / 2); g.beginPath(); g.moveTo(6, -18); g.quadraticCurveTo(5, -6, 18, -6); g.stroke(); g.restore(); } }),
  flake: () => tex(g => { g.lineWidth = 3.5; g.lineCap = 'round'; for (let i = 0; i < 6; i++){ g.save(); g.rotate(i * Math.PI / 3); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -24); g.moveTo(0, -14); g.lineTo(-6, -20); g.moveTo(0, -14); g.lineTo(6, -20); g.stroke(); g.restore(); } }),
  rect:  () => tex(g => { g.fillRect(-14, -8, 28, 16); }),
  flame: () => tex(g => { const gr = g.createRadialGradient(0, 8, 0, 0, 4, 26); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.4, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, -28); g.bezierCurveTo(16, -6, 20, 14, 0, 26); g.bezierCurveTo(-20, 14, -16, -6, 0, -28); g.fill(); }),
  streak: () => tex(g => { const gr = g.createLinearGradient(-30, 0, 30, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.7, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(-30, -2.5, 60, 5); }),
  bubble: () => tex(g => { g.lineWidth = 3; g.globalAlpha = .9; g.beginPath(); g.arc(0, 0, 22, 0, 7); g.stroke(); g.globalAlpha = .25; g.fill(); g.globalAlpha = 1; g.beginPath(); g.ellipse(-8, -9, 6, 4, -.6, 0, 7); g.fill(); }),
  rock:  () => tex(g => { g.beginPath(); for (let i = 0; i < 7; i++){ const a = i / 7 * Math.PI * 2, r = 16 + (i * 37 % 9); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-20, 2, 40, 20); }),
};
const ADD = { soft: 1, glow: 1, spark: 1, ring: 1, flame: 1, streak: 1 };   // these glow (added light)

C.makeFx = function(E){
  const scene = E.scene, layer = E.layer;
  const fx = {};
  const layers = {};
  const MAX = 420;
  const pvs = `attribute float aSize; attribute float aAlpha; attribute float aRot; attribute vec3 aColor;
    varying float vA; varying float vR; varying vec3 vC; uniform float uDpr;
    void main(){ vA = aAlpha; vR = aRot; vC = aColor; gl_PointSize = aSize * uDpr; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  const pfs = `uniform sampler2D uMap; varying float vA; varying float vR; varying vec3 vC;
    void main(){ vec2 p = gl_PointCoord - 0.5; float c = cos(vR), s = sin(vR); p = mat2(c, -s, s, c) * p * 1.414 + 0.5;
      if (p.x < 0.0 || p.y < 0.0 || p.x > 1.0 || p.y > 1.0) discard;
      vec4 t = texture2D(uMap, vec2(p.x, 1.0 - p.y)); gl_FragColor = vec4(t.rgb * vC, t.a * vA); if (gl_FragColor.a < 0.004) discard; }`;
  function getLayer(kind){
    if (layers[kind]) return layers[kind];
    const g = new T.BufferGeometry();
    const pos = new Float32Array(MAX * 3), col = new Float32Array(MAX * 3), size = new Float32Array(MAX), alpha = new Float32Array(MAX), rot = new Float32Array(MAX);
    g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('aColor', new T.BufferAttribute(col, 3));
    g.setAttribute('aSize', new T.BufferAttribute(size, 1)); g.setAttribute('aAlpha', new T.BufferAttribute(alpha, 1)); g.setAttribute('aRot', new T.BufferAttribute(rot, 1));
    g.setDrawRange(0, 0);
    const m = new T.ShaderMaterial({ uniforms: { uMap: { value: TEX[kind]() }, uDpr: { value: E.renderer.getPixelRatio() } }, vertexShader: pvs, fragmentShader: pfs,
      transparent: true, depthWrite: false, depthTest: false, blending: ADD[kind] ? T.AdditiveBlending : T.NormalBlending });
    const pts = new T.Points(g, m); pts.frustumCulled = false; pts.renderOrder = ADD[kind] ? 20 : 15;
    scene.add(pts);
    return (layers[kind] = { pts, g, m, list: [] });
  }
  const col = new T.Color(), col2 = new T.Color();
  /* one particle. o: x, y (px), vx, vy (px/s, y down), g (gravity px/s²), drag, life, size, size2, alpha, rot, spin, color, color2, z, fade (fade-in share) */
  fx.p = function(kind, o){
    const L = getLayer(kind);
    if (L.list.length >= MAX) L.list.shift();
    col.set(o.color || '#ffffff'); col2.set(o.color2 || o.color || '#ffffff');
    L.list.push({ x: o.x, y: o.y, z: o.z ?? 600, vx: o.vx || 0, vy: o.vy || 0, g: o.g || 0, drag: o.drag || 0, life: o.life || 1, age: 0,
      s0: o.size || 16, s1: o.size2 ?? (o.size || 16), a: o.alpha ?? 1, rot: o.rot ?? Math.random() * 6.3, spin: o.spin || 0,
      r0: col.r, g0: col.g, b0: col.b, r1: col2.r, g1: col2.g, b1: col2.b, fade: o.fade ?? .12, wob: o.wob || 0, ph: Math.random() * 6 });
  };
  /* many at once, flying out from a point */
  fx.burst = function(kind, x, y, n, o){
    o = o || {};
    for (let i = 0; i < n; i++){
      const a = (o.angle ?? -Math.PI / 2) + (Math.random() - .5) * (o.spread ?? Math.PI * 2), sp = (o.speed || 120) * (.45 + Math.random() * .8);
      fx.p(kind, Object.assign({}, o, { x: x + (Math.random() - .5) * (o.jitter || 0), y: y + (Math.random() - .5) * (o.jitterY ?? o.jitter ?? 0),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: (o.size || 14) * (.6 + Math.random() * .7), life: (o.life || .8) * (.7 + Math.random() * .6),
        spin: (o.spin ?? 2) * (Math.random() - .5) * 2, color: Array.isArray(o.color) ? C.util.pick(o.color) : o.color }));
    }
  };
  function updateParticles(dt){
    for (const k in layers){
      const L = layers[k], P = L.g.attributes;
      let n = 0;
      L.list = L.list.filter(p => (p.age += dt) < p.life);
      for (const p of L.list){
        p.vy += p.g * dt; const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d;
        p.x += p.vx * dt + (p.wob ? Math.sin(E.time * 3 + p.ph) * p.wob * dt : 0); p.y += p.vy * dt; p.rot += p.spin * dt;
        const t = p.age / p.life, fi = Math.min(1, t / Math.max(.001, p.fade)), fo = t > .6 ? 1 - (t - .6) / .4 : 1;
        P.position.array[n * 3] = p.x; P.position.array[n * 3 + 1] = -p.y; P.position.array[n * 3 + 2] = p.z;
        P.aColor.array[n * 3] = p.r0 + (p.r1 - p.r0) * t; P.aColor.array[n * 3 + 1] = p.g0 + (p.g1 - p.g0) * t; P.aColor.array[n * 3 + 2] = p.b0 + (p.b1 - p.b0) * t;
        P.aSize.array[n] = p.s0 + (p.s1 - p.s0) * t; P.aAlpha.array[n] = p.a * fi * fo; P.aRot.array[n] = p.rot;
        n++;
      }
      L.g.setDrawRange(0, n);
      for (const a of ['position', 'aColor', 'aSize', 'aAlpha', 'aRot']) P[a].needsUpdate = true;
      L.m.uniforms.uDpr.value = E.renderer.getPixelRatio();
    }
  }

  /* ---------- ready-made bursts ---------- */
  fx.dust = (x, y, w) => { fx.burst('smoke', x, y - 2, 9, { angle: -Math.PI / 2, spread: Math.PI * .9, speed: (w || 40) * 2.2, g: -30, drag: 4, life: .7, size: (w || 40) * .55, size2: (w || 40) * .95, alpha: .55, color: '#efe6da', z: 650, jitter: w * .5 }); };
  fx.puff = (x, y, s, dir) => fx.p('smoke', { x, y: y - 3, vx: -dir * 30, vy: -20, drag: 3, life: .5, size: s * .5, size2: s, alpha: .45, color: '#ece4d8', z: 650 });
  fx.sparkle = (x, y, n, color) => {
    fx.burst('spark', x, y, n || 12, { speed: 140, drag: 3.2, life: .9, size: 22, size2: 4, spin: 3, color: color || ['#fff6b0', '#ffffff', '#ffd36b'] });
    fx.burst('star', x, y, Math.ceil((n || 12) / 3), { speed: 90, drag: 2, g: 60, life: 1.1, size: 14, size2: 6, spin: 4, color: color || '#ffe27a' });
  };
  fx.hearts = (x, y, n) => { for (let i = 0; i < (n || 3); i++) fx.p('heart', { x: x + (i - 1) * 14, y, vx: (Math.random() - .5) * 30, vy: -60 - Math.random() * 30, drag: .6, life: 1.6, size: 18, size2: 22, color: i % 2 ? '#ff6b9a' : '#ff4f7b', wob: 30, fade: .2, spin: .4 }); };
  fx.notes = (x, y, n, color) => { for (let i = 0; i < (n || 2); i++) fx.p('note', { x: x + (Math.random() - .5) * 20, y, vx: (Math.random() - .5) * 40, vy: -55 - Math.random() * 30, drag: .4, life: 1.8, size: 20, size2: 24, color: color || C.util.pick(['#ffd45c', '#8fd3ff', '#ff9ad5', '#9dffb0']), wob: 50, fade: .2, rot: 0, spin: (Math.random() - .5) * 1.2 }); };
  fx.zz = (x, y) => fx.p('zz', { x, y, vx: 14, vy: -26, drag: .2, life: 2.4, size: 12, size2: 26, color: '#dfe9ff', wob: 18, fade: .25, rot: -.2, spin: .1 });
  fx.anger = (x, y) => { fx.p('anger', { x, y, life: .9, size: 10, size2: 24, color: '#ff4d4d', rot: 0, fade: .1 }); };
  fx.sweat = (x, y, dir) => fx.p('drop', { x, y, vx: (dir || 1) * (30 + Math.random() * 30), vy: -50, g: 420, life: .7, size: 10, size2: 8, color: '#9fdcff', rot: 0, fade: .05 });
  fx.steam = (x, y, w) => fx.p('smoke', { x: x + (Math.random() - .5) * (w || 30), y, vx: (Math.random() - .5) * 14, vy: -32 - Math.random() * 20, drag: .3, life: 2.6, size: 14, size2: 46, alpha: .38, color: '#ffffff', wob: 16, fade: .3 });
  fx.confetti = (x, y, n) => fx.burst('rect', x, y, n || 40, { angle: -Math.PI / 2, spread: 1.4, speed: 420, g: 520, drag: 1.4, life: 2.4, size: 9, size2: 9, spin: 12, wob: 60,
    color: ['#ff5c7a', '#ffd34d', '#4dd2ff', '#7dff8a', '#c08bff', '#ffffff'] });
  fx.embers = (x, y, w) => fx.p('glow', { x: x + (Math.random() - .5) * (w || 20), y, vx: (Math.random() - .5) * 20, vy: -60 - Math.random() * 50, drag: .4, life: 1.4, size: 7, size2: 2, color: '#ffb347', color2: '#ff4d1a', wob: 30 });
  fx.splash = (x, y, n) => { fx.burst('drop', x, y, n || 12, { angle: -Math.PI / 2, spread: 1.6, speed: 220, g: 700, life: .8, size: 11, size2: 7, color: '#bfe8ff', spin: 0 });
    fx.burst('soft', x, y, 5, { angle: -Math.PI / 2, spread: 2, speed: 60, life: .5, size: 18, size2: 30, alpha: .5, color: '#d8f3ff' }); };
  fx.snow = (W) => fx.p('flake', { x: Math.random() * W, y: -10, vx: (Math.random() - .5) * 20, vy: 40 + Math.random() * 30, life: 9, size: 8 + Math.random() * 8, color: '#ffffff', wob: 30, spin: 1, fade: .1, alpha: .9 });
  fx.bubbles = (x, y) => fx.p('bubble', { x: x + (Math.random() - .5) * 10, y, vx: (Math.random() - .5) * 20, vy: -40, drag: .3, life: 1.6, size: 6, size2: 12, color: '#bfefff', wob: 20, alpha: .9 });
  fx.debris = (x, y, n) => fx.burst('rock', x, y, n || 8, { angle: -Math.PI / 2, spread: 2.2, speed: 280, g: 900, life: 1.2, size: 10, size2: 8, spin: 8, color: ['#8a7a6a', '#a8977f', '#6f6255'], z: 640 });
  /* a hit: a bright star, sparks, a ring and short speed lines (the anime impact) */
  fx.impact = function(x, y, big, color){
    const c = color || '#ffcf5a';
    fx.p('glow', { x, y, life: big ? .35 : .22, size: big ? 150 : 80, size2: big ? 40 : 20, color: '#ffffff', fade: .02 });
    fx.p('spark', { x, y, life: big ? .4 : .25, size: big ? 170 : 90, size2: 30, color: c, rot: Math.random(), spin: 2, fade: .02 });
    fx.burst('spark', x, y, big ? 16 : 9, { speed: big ? 380 : 240, drag: 5, life: .45, size: 18, size2: 3, color: [c, '#ffffff'] });
    fx.burst('streak', x, y, big ? 10 : 6, { speed: big ? 520 : 360, drag: 6, life: .3, size: big ? 60 : 40, size2: 10, color: '#ffffff', spin: 0 }, true);
    fx.ring(x, y, { r: big ? 120 : 60, color: c, life: big ? .5 : .32, width: big ? .18 : .25 });
    if (big){ fx.flash('rgba(255,255,255,.35)', 90); fx.shake(big === 2 ? 14 : 7, .3); }
  };
  // streaks fly along their own direction
  const burst0 = fx.burst;
  fx.burst = function(kind, x, y, n, o, aligned){
    if (!aligned) return burst0(kind, x, y, n, o);
    for (let i = 0; i < n; i++){ const a = Math.random() * Math.PI * 2, sp = (o.speed || 200) * (.6 + Math.random() * .6);
      fx.p(kind, Object.assign({}, o, { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: -a, spin: 0 })); }
  };

  /* ---------- meshes with their own shaders ---------- */
  const live = [];   // { mesh, age, life, tick(t, dt) }
  const quad = new T.PlaneGeometry(1, 1);
  function addFx(mesh, life, tick){ scene.add(mesh); const h = { mesh, age: 0, life, tick, stop(){ this.life = this.age; } }; live.push(h); return h; }
  /* a shockwave ring: flat toward you, or squashed onto the ground with ground:true */
  const ringFs = `uniform vec3 uC; uniform float uT; uniform float uW; varying vec2 vUv;
    void main(){ float r = length(vUv - 0.5) * 2.0; float edge = 1.0 - uW; float a = smoothstep(edge - 0.08, edge + 0.04, r) * (1.0 - smoothstep(0.96, 1.0, r));
      a *= (1.0 - uT) * (1.0 - uT); gl_FragColor = vec4(uC * a * 1.4, a); }`;
  const vs = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  fx.ring = function(x, y, o){
    o = o || {};
    const m = new T.ShaderMaterial({ uniforms: { uC: { value: new T.Color(o.color || '#ffffff') }, uT: { value: 0 }, uW: { value: o.width || .2 } }, vertexShader: vs, fragmentShader: ringFs,
      transparent: true, depthWrite: false, depthTest: false, blending: T.AdditiveBlending });
    const mesh = new T.Mesh(quad, m); mesh.position.set(x, -y, 700); mesh.renderOrder = 21;
    const r = o.r || 80, sq = o.ground ? .28 : 1;
    return addFx(mesh, o.life || .5, (t) => { const k = C.util.ease.out(t); mesh.scale.set(r * 2 * (.15 + .85 * k), r * 2 * sq * (.15 + .85 * k), 1); m.uniforms.uT.value = t; });
  };
  /* a sword or kick slash: a bright crescent that sweeps and fades */
  const slashFs = `uniform vec3 uC; uniform float uT; varying vec2 vUv;
    void main(){ vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.y, p.x);
      float band = smoothstep(0.62, 0.8, r) * (1.0 - smoothstep(0.9, 1.0, r));
      float sweep = smoothstep(-2.2, 1.4, a) * (1.0 - smoothstep(1.4, 1.7, a));
      float head = smoothstep(0.2, 1.4, a);
      float k = band * sweep * (0.35 + 0.65 * head) * (1.0 - uT);
      vec3 col = mix(uC, vec3(1.0), smoothstep(0.78, 0.86, r) * 0.8);
      gl_FragColor = vec4(col * k * 1.5, k); }`;
  fx.slash = function(x, y, dir, o){
    o = o || {};
    const m = new T.ShaderMaterial({ uniforms: { uC: { value: new T.Color(o.color || '#9fe6ff') }, uT: { value: 0 } }, vertexShader: vs, fragmentShader: slashFs,
      transparent: true, depthWrite: false, depthTest: false, blending: T.AdditiveBlending, side: T.DoubleSide });
    const mesh = new T.Mesh(quad, m), s = o.size || 110; mesh.position.set(x, -y, 720); mesh.renderOrder = 22;
    mesh.scale.set(s * (dir < 0 ? -1 : 1), s, 1); mesh.rotation.z = o.rot ?? -.4;
    return addFx(mesh, o.life || .32, (t) => { m.uniforms.uT.value = t; mesh.rotation.z = (o.rot ?? -.4) - t * .9 * (dir < 0 ? -1 : 1); });
  };
  /* an aura of flames around a character (charge-ups, karate, meditation) */
  const auraFs = `uniform vec3 uC; uniform vec3 uC2; uniform float uTime; uniform float uI; varying vec2 vUv;` + NOISE + `
    void main(){ vec2 p = vUv;
      // a teardrop of flame: round at the bottom, licking upward, ragged at the edges
      vec2 q = p - vec2(0.5, 0.3); q.x *= 2.1; q.y *= q.y > 0.0 ? 0.95 : 2.6;
      float n = fbm(vec2(p.x * 5.0, p.y * 2.6 - uTime * 2.6)) * 0.9 + fbm(vec2(p.x * 10.0 + 3.0, p.y * 5.0 - uTime * 4.4)) * 0.45;
      float shape = 1.0 - length(q) * 1.55 + (n - 0.6) * 0.75 * smoothstep(0.1, 0.6, p.y);
      float body = smoothstep(0.0, 0.32, shape);
      float core = smoothstep(0.35, 0.75, shape);
      vec3 col = mix(uC, uC2, core);
      float a = body * uI;
      gl_FragColor = vec4(col * a * 1.25, a * 0.8); }`;
  fx.aura = function(actor, o){
    o = o || {};
    const m = new T.ShaderMaterial({ uniforms: { uC: { value: new T.Color(o.color || '#4fb4ff') }, uC2: { value: new T.Color(o.core || '#eaffff') }, uTime: { value: 0 }, uI: { value: 0 } },
      vertexShader: vs, fragmentShader: auraFs, transparent: true, depthWrite: false, depthTest: true, blending: T.AdditiveBlending });
    const mesh = new T.Mesh(quad, m); mesh.renderOrder = 4;   // behind the character: the body stays visible, the flames rise around it
    const h = addFx(mesh, 1e9, (t, dt, age) => {
      const f = actor.feet(), k = o.size || 1;
      mesh.position.set(f.x, -(f.y + actor.h * .08), actor.root.position.z - actor.w * 1.2);
      mesh.scale.set(actor.w * 2.2 * k, actor.h * 1.9 * k, 1);
      mesh.position.y += actor.h * .85 * k;
      m.uniforms.uTime.value = age;
      h.level += ((h.target) - h.level) * Math.min(1, dt * 4); m.uniforms.uI.value = h.level;
      if (h.target === 0 && h.level < .02) h.life = 0;
      if (h.level > .3 && Math.random() < dt * 22 * h.level) fx.p('glow', { x: f.x + (Math.random() - .5) * actor.w * 1.2, y: f.y - Math.random() * actor.h * .4, vy: -120 - Math.random() * 100, life: .6, size: 6, size2: 2, color: o.color || '#4fb4ff', z: 710 });
    });
    h.level = 0; h.target = 1;
    h.set = v => { h.target = v; };
    h.end = () => { h.target = 0; };
    return h;
  };
  /* a glowing orb with turning rays: the charge ball, the beam's head, the clash in the middle */
  const orbFs = `uniform vec3 uC; uniform float uTime; uniform float uI; varying vec2 vUv;` + NOISE + `
    void main(){ vec2 p = (vUv - 0.5) * 2.0; float r = length(p); float a = atan(p.y, p.x);
      float rays = pow(abs(sin(a * 7.0 + uTime * 3.0)), 10.0) + pow(abs(sin(a * 4.0 - uTime * 2.2 + 1.3)), 14.0);
      float n = fbm(vec2(a * 2.0, r * 3.0 - uTime * 3.0));
      float core = smoothstep(0.34, 0.0, r);
      float halo = pow(clamp(1.0 - r, 0.0, 1.0), 2.2);
      float k = core * 1.4 + halo * (0.6 + 0.5 * n) + rays * smoothstep(1.0, 0.25, r) * 0.55;
      vec3 col = mix(uC, vec3(1.0), clamp(core * 1.2, 0.0, 1.0));
      gl_FragColor = vec4(col * k * uI, clamp(k, 0.0, 1.0) * uI); }`;
  fx.orb = function(o){
    o = o || {};
    const m = new T.ShaderMaterial({ uniforms: { uC: { value: new T.Color(o.color || '#58c8ff') }, uTime: { value: 0 }, uI: { value: 1 } }, vertexShader: vs, fragmentShader: orbFs,
      transparent: true, depthWrite: false, depthTest: false, blending: T.AdditiveBlending });
    const mesh = new T.Mesh(quad, m); mesh.renderOrder = 24;
    const h = addFx(mesh, 1e9, (t, dt, age) => {
      const s = h.size * (1 + Math.sin(age * 22) * .05);
      mesh.scale.set(s, s, 1); mesh.position.set(h.x, -h.y, 760); m.uniforms.uTime.value = age; m.uniforms.uI.value = h.i;
    });
    Object.assign(h, { x: o.x || 0, y: o.y || 0, size: o.size || 40, i: 1 });
    return h;
  };
  /* the energy beam: a white-hot core in a coloured glow, rippling and streaming, from (x1,y1) to (x2,y2) */
  const beamFs = `uniform vec3 uC; uniform float uTime; uniform float uI; uniform float uLen; varying vec2 vUv;` + NOISE + `
    void main(){ float y = abs(vUv.y - 0.5) * 2.0; float x = vUv.x * uLen / 60.0;
      float flow = fbm(vec2(x * 1.4 - uTime * 7.0, vUv.y * 3.0));
      float rip = 0.86 + 0.14 * sin(x * 9.0 - uTime * 38.0);
      float w = rip * (0.72 + 0.38 * flow);
      float e = y / w;
      float core = smoothstep(0.55, 0.05, e);
      float glow = pow(clamp(1.0 - e, 0.0, 1.0), 1.1);
      float streak = smoothstep(0.62, 0.9, fbm(vec2(x * 0.8 - uTime * 11.0, vUv.y * 9.0))) * glow;
      float ends = smoothstep(0.0, 0.015, vUv.x);
      vec3 col = uC * (glow * 2.2 + streak * 1.2) + vec3(1.0) * core * 2.0;
      float a = clamp(glow + core, 0.0, 1.0) * ends * uI;
      gl_FragColor = vec4(col * a, a); }`;
  fx.beam = function(o){
    o = o || {};
    const color = new T.Color(o.color || '#58c8ff');
    const mk = () => new T.ShaderMaterial({ uniforms: { uC: { value: color }, uTime: { value: 0 }, uI: { value: 0 }, uLen: { value: 100 } }, vertexShader: vs, fragmentShader: beamFs,
      transparent: true, depthWrite: false, depthTest: false, blending: T.AdditiveBlending });
    const m1 = mk(), m2 = mk();
    const g = new T.PlaneGeometry(1, 1); g.translate(.5, 0, 0);   // grows from its start point
    const outer = new T.Mesh(g, m2), inner = new T.Mesh(g, m1);
    outer.renderOrder = 23; inner.renderOrder = 25;
    scene.add(outer);
    const head = fx.orb({ color: o.color, size: 0 });
    const light = new T.PointLight(color, 0, 900, 1.4); scene.add(light);
    const h = addFx(inner, 1e9, (t, dt, age) => {
      const dx = h.x2 - h.x1, dy = h.y2 - h.y1, len = Math.hypot(dx, dy) * h.reach, ang = Math.atan2(-dy, dx);
      for (const [mesh, k] of [[inner, 1], [outer, 2.6]]){
        mesh.position.set(h.x1, -h.y1, 750); mesh.rotation.z = ang; mesh.scale.set(Math.max(1, len), h.thick * k * (1 + Math.sin(age * 40) * .04), 1);
        mesh.material.uniforms.uTime.value = age; mesh.material.uniforms.uLen.value = len; mesh.material.uniforms.uI.value = h.i * (k > 1 ? .6 : 1);
      }
      const hx = h.x1 + dx * h.reach, hy = h.y1 + dy * h.reach;
      head.x = hx; head.y = hy; head.size = h.thick * 3.2 * h.i; head.i = h.i;
      light.position.set(hx, -hy, 300); light.intensity = 2.4 * h.i;
      if (h.i > .3){
        if (Math.random() < dt * 60) fx.p('spark', { x: h.x1 + dx * h.reach * Math.random(), y: h.y1 + dy * h.reach * Math.random() + (Math.random() - .5) * h.thick, vx: Math.cos(-ang) * 500, vy: -Math.sin(-ang) * 500 + (Math.random() - .5) * 200, drag: 4, life: .4, size: 12, size2: 2, color: color.getStyle(), z: 770 });
        if (Math.random() < dt * 30) fx.p('streak', { x: h.x1 + dx * h.reach * Math.random(), y: h.y1 + dy * h.reach * Math.random() + (Math.random() - .5) * h.thick * 2.2, vx: dx / Math.hypot(dx, dy) * 900, vy: dy / Math.hypot(dx, dy) * 900, life: .25, size: 70, size2: 20, rot: ang, color: '#ffffff', z: 770, alpha: .8 });
      }
    });
    Object.assign(h, { x1: o.x1, y1: o.y1, x2: o.x2, y2: o.y2, thick: o.thick || 40, reach: 0, i: 0, head, light, outer });
    const stop0 = h.stop.bind(h);
    h.stop = () => { stop0(); head.stop(); scene.remove(outer); scene.remove(light); m1.dispose(); m2.dispose(); g.dispose(); };
    return h;
  };
  /* a coloured light for a moment or for as long as it is kept (campfire, disco, beam) */
  fx.light = function(x, y, color, intensity, dist){
    const l = new T.PointLight(color || '#ffcc88', intensity || 1.5, dist || 400, 1.6); l.position.set(x, -y, 260); scene.add(l);
    return { l, set(i){ l.intensity = i; }, move(x2, y2){ l.position.set(x2, -y2, 260); }, stop(){ scene.remove(l); } };
  };
  fx.track = (h) => h;
  function updateMeshes(dt){
    for (let i = live.length - 1; i >= 0; i--){
      const h = live[i]; h.age += dt;
      if (h.age >= h.life){ scene.remove(h.mesh); if (h.mesh.material.dispose) h.mesh.material.dispose(); live.splice(i, 1); continue; }
      h.tick(Math.min(1, h.age / (h.life >= 1e8 ? 1 : h.life)), dt, h.age);
    }
  }

  /* ---------- HTML over the 3D: words, bubbles, flash, speed lines, darkening, shaking ---------- */
  const el = (cls, html) => { const d = document.createElement('div'); d.className = cls; if (html != null) d.innerHTML = html; layer.appendChild(d); return d; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  /* a big comic word: POW!, SWISH!, GOAL!, K.O.! */
  fx.word = function(text, x, y, o){
    o = o || {};
    const d = el('hc-word' + (o.big ? ' big' : ''), esc(text));
    d.style.left = x + 'px'; d.style.top = y + 'px';
    if (o.color) d.style.setProperty('--c', o.color);
    if (o.color2) d.style.setProperty('--c2', o.color2);
    const tilt = o.tilt ?? (Math.random() - .5) * 16;
    const an = d.animate([
      { transform: `translate(-50%,-50%) scale(.2) rotate(${tilt - 20}deg)`, opacity: 0 },
      { transform: `translate(-50%,-50%) scale(1.18) rotate(${tilt + 4}deg)`, opacity: 1, offset: .18 },
      { transform: `translate(-50%,-50%) scale(1) rotate(${tilt}deg)`, opacity: 1, offset: .3 },
      { transform: `translate(-50%,-62%) scale(1) rotate(${tilt}deg)`, opacity: 1, offset: .8 },
      { transform: `translate(-50%,-80%) scale(.9) rotate(${tilt}deg)`, opacity: 0 }], { duration: o.ms || 1300, easing: 'cubic-bezier(.2,.9,.3,1)' });
    an.onfinish = () => d.remove();
  };
  /* a speech bubble that follows a character */
  const bubbles = [];
  fx.say = function(actor, text, secs){
    const d = el('hc-say', esc(text));
    const b = { d, actor, life: secs || 1.8, age: 0 };
    bubbles.push(b);
    d.animate([{ transform: 'translate(-50%,-100%) scale(.3)', opacity: 0 }, { transform: 'translate(-50%,-100%) scale(1.08)', opacity: 1, offset: .7 }, { transform: 'translate(-50%,-100%) scale(1)', opacity: 1 }], { duration: 260, easing: 'ease-out' });
    return b;
  };
  function updateBubbles(dt){
    for (let i = bubbles.length - 1; i >= 0; i--){
      const b = bubbles[i]; b.age += dt;
      const p = b.actor.top();
      b.d.style.left = p.x + 'px'; b.d.style.top = (p.y - 8) + 'px';
      if (b.age > b.life){ b.d.style.opacity = String(Math.max(0, 1 - (b.age - b.life) / .25)); if (b.age > b.life + .25){ b.d.remove(); bubbles.splice(i, 1); } }
    }
  }
  fx.flash = function(color, ms){
    const d = el('hc-flash'); d.style.background = color || 'rgba(255,255,255,.6)';
    d.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms || 160, easing: 'ease-out' }).onfinish = () => d.remove();
  };
  /* anime focus lines rushing in from the edges toward a point */
  fx.lines = function(x, y, o){
    o = o || {};
    const W = E.W, H = E.H, n = o.n || 46, R = Math.hypot(W, H);
    let p = '';
    for (let i = 0; i < n; i++){
      const a = i / n * Math.PI * 2 + Math.random() * .08, r1 = (o.inner || .32) * Math.min(W, H) * (.8 + Math.random() * .5), w = 1 + Math.random() * 3.2;
      const x1 = x + Math.cos(a) * r1, y1 = y + Math.sin(a) * r1, x2 = x + Math.cos(a - w * .004) * R, y2 = y + Math.sin(a - w * .004) * R, x3 = x + Math.cos(a + w * .004) * R, y3 = y + Math.sin(a + w * .004) * R;
      p += `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}L${x3.toFixed(1)} ${y3.toFixed(1)}Z`;
    }
    const d = el('hc-lines', `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><path d="${p}" fill="${o.color || 'rgba(255,255,255,.75)'}"/></svg>`);
    d.animate([{ opacity: 0, transform: 'scale(1.08)' }, { opacity: 1, transform: 'scale(1)', offset: .15 }, { opacity: 0, transform: 'scale(.98)' }], { duration: o.ms || 520, easing: 'ease-out' }).onfinish = () => d.remove();
  };
  /* darken the page around the action (the beam); returns a handle to brighten it again */
  fx.dim = function(amount){
    const d = document.createElement('div'); d.className = 'hc-dim'; E.under.appendChild(d); d.style.setProperty('--dim', String(amount ?? .45));
    d.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, fill: 'forwards' });
    return { stop(){ d.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 900, fill: 'forwards' }).onfinish = () => d.remove(); } };
  };
  /* shake: the characters' layers and what the page names (on Home the clock and the widgets), never the background */
  let shakeT = 0, shakeA = 0, shakeD = 1, shaken = [];
  fx.shake = (amp, secs) => { shakeA = Math.max(shakeA * (shakeT / shakeD || 0), amp); shakeT = shakeD = secs || .3; };
  const targets = () => [E.canvas, E.layer, E.under].concat(E.host.shakeTargets ? E.host.shakeTargets().filter(Boolean) : []);
  function updateShake(dt){
    if (shakeT <= 0) return;
    shakeT -= dt;
    const k = Math.max(0, shakeT / shakeD), a = shakeA * k;
    const t = `${((Math.random() - .5) * 2 * a).toFixed(1)}px ${((Math.random() - .5) * 2 * a).toFixed(1)}px`;
    shaken = targets(); for (const el of shaken) el.style.translate = shakeT > 0 ? t : '';
    if (shakeT <= 0) shakeA = 0;
  }
  /* whoosh: wind lines behind a fast leap */
  fx.whoosh = (a) => { for (let i = 0; i < 5; i++) fx.p('streak', { x: a.x + (Math.random() - .5) * a.w, y: a.y - Math.random() * a.h, vy: 400, life: .3, size: 50, size2: 10, rot: Math.PI / 2, color: '#ffffff', alpha: .6 }); };

  fx.update = function(dt){ updateParticles(dt); updateMeshes(dt); updateBubbles(dt); updateShake(dt); };
  fx.clear = function(){
    for (const k in layers){ layers[k].list = []; }
    for (const h of live.splice(0)){ scene.remove(h.mesh); }
    for (const b of bubbles.splice(0)) b.d.remove();
    layer.innerHTML = ''; E.under.innerHTML = '';
    for (const el of shaken) el.style.translate = ''; shakeT = 0;
  };
  return fx;
};
})();
