/* Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 *
 * Characters: props. Models from the free packs (props/<name>.json, see scripts/cast_assets.py) and simple shapes built here
 * (balls, the hoop, the boxing ring, the pool, the disco ball...). Everything gets the same toon look and outline as the characters.
 * Sizes are in screen px; a prop's origin is the middle of its base, so it stands where you put it.
 */
(function(){
'use strict';
const C = window.HubCast;
const T = window.THREE;

C.makeProps = function(E){
  const P = {};
  const toon = (color, o) => new T.MeshToonMaterial(Object.assign({ color, gradientMap: E.gradient }, o || {}));
  const outline = (mesh, px) => {   // a dark outline for a built shape
    const m = new T.MeshBasicMaterial({ color: 0x17121f, side: T.BackSide });
    m.onBeforeCompile = sh => { sh.uniforms.uO = { value: px || 1.4 }; sh.vertexShader = 'uniform float uO;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normalize(normal) * uO / length(modelMatrix[0].xyz);'); };
    const o = new T.Mesh(mesh.geometry, m); o.renderOrder = -1; mesh.add(o); return mesh;
  };
  const mesh = (geo, mat, line) => { const m = new T.Mesh(geo, mat); if (line !== false) outline(m, line); return m; };
  const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t; };
  /* put a prop on the stage at (x, y = the surface line), leaning like the characters */
  P.place = function(obj, x, y, z){ const g = new T.Group(); g.add(obj); g.rotation.x = .26; g.position.set(x, -y, z ?? 0); E.scene.add(g); g.userData.prop = true; return g; };
  P.remove = g => { if (g && g.parent) g.parent.remove(g); };
  /* pop in with a bounce, or shrink away */
  P.pop = function*(g, secs, to){ const s = to || 1; let t = 0; secs = secs || .35; while (t < secs){ t += E.dt; g.scale.setScalar(s * C.util.ease.back(Math.min(1, t / secs))); yield; } };
  P.vanish = function*(g, secs){ const s = g.scale.x; let t = 0; secs = secs || .3; while (t < secs){ t += E.dt; g.scale.setScalar(s * (1 - C.util.ease.inOut(Math.min(1, t / secs)))); yield; } P.remove(g); };

  /* ---------- props from the packs ---------- */
  const cache = {};
  P.load = function(name){
    if (!cache[name]) cache[name] = E.loadGlb(E.base + 'props/' + name + '.json').then(g => {
      const m = g.scene; E.toonify(m, 1.4);
      const box = E.measure(m), size = box.getSize(new T.Vector3());
      return { m, box, size };
    });
    return cache[name];
  };
  P.preload = names => Promise.all(names.map(n => P.load(n).catch(() => null)));
  /* a copy of a pack prop, scaled so its biggest side (or o.h for height) is px */
  P.get = async function(name, px, o){
    o = o || {};
    const src = await P.load(name);
    const m = src.m.clone(true), s = src.size, k = px / (o.h ? s.y : Math.max(s.x, s.y, s.z));
    m.traverse(n => { if (n.isMesh && n.material && n.material.userData && n.material.userData.u === undefined && n.userData.outline){ /* clone keeps the outline material */ } });
    const g = new T.Group(); m.scale.setScalar(k);
    m.position.set(-(src.box.min.x + s.x / 2) * k, -src.box.min.y * k, -(src.box.min.z + s.z / 2) * k);
    if (o.center) m.position.y = -(src.box.min.y + s.y / 2) * k;
    // the outline width is in model units: keep it about 1.4 px whatever the size
    m.traverse(n => { if (n.userData.outline && n.material.onBeforeCompile){ const mm = n.material.clone(); mm.userData = Object.assign({}, n.material.userData);
      mm.onBeforeCompile = sh => { sh.uniforms.uOutline = { value: 1.4 / k }; sh.vertexShader = 'uniform float uOutline;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normalize(normal) * uOutline;'); };
      mm.customProgramCacheKey = () => 'ol' + (1.4 / k).toFixed(4); n.material = mm; } });
    g.add(m); g.userData.h = s.y * k; g.userData.w = s.x * k;
    return g;
  };

  /* ---------- shapes built here ---------- */
  /* balls: basketball, soccer, beach, snow, volley */
  P.ball = function(kind, d){
    let map = null, color = 0xffffff;
    if (kind === 'basket') map = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#e8772e'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2a160c'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.moveTo(w / 4, 0); g.lineTo(w / 4, h); g.moveTo(w * 3 / 4, 0); g.lineTo(w * 3 / 4, h); g.stroke();
      g.beginPath(); g.ellipse(w / 2, h / 2, w * .12, h * .5, 0, 0, 7); g.stroke(); g.beginPath(); g.ellipse(0, h / 2, w * .12, h * .5, 0, 0, 7); g.stroke(); g.beginPath(); g.ellipse(w, h / 2, w * .12, h * .5, 0, 0, 7); g.stroke(); });
    else if (kind === 'soccer') map = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#fafafa'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d1d24';
      for (let i = 0; i < 10; i++){ const x = (i % 5) * w / 5 + (i > 4 ? w / 10 : 0), y = i > 4 ? h * .72 : h * .3; g.beginPath(); for (let k = 0; k < 5; k++){ const a = k / 5 * Math.PI * 2; g.lineTo(x + Math.cos(a) * 15, y + Math.sin(a) * 15); } g.fill(); } });
    else if (kind === 'beach') map = canvasTex(256, 64, (g, w, h) => { const cs = ['#ff5a5a', '#ffffff', '#ffd23f', '#ffffff', '#3fa7ff', '#ffffff']; cs.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * w / 6, 0, w / 6 + 1, h); }); });
    else if (kind === 'snow') color = 0xf4fbff;
    else if (kind === 'volley') map = canvasTex(256, 64, (g, w, h) => { const cs = ['#ffffff', '#ffd23f', '#3f7bff']; for (let i = 0; i < 6; i++){ g.fillStyle = cs[i % 3]; g.fillRect(i * w / 6, 0, w / 6 + 1, h); } });
    const m = mesh(new T.SphereGeometry(d / 2, 24, 16), toon(color, { map }), 1.2);
    m.position.y = d / 2;
    const g = new T.Group(); g.add(m); g.userData.ball = m; g.userData.d = d;
    return g;
  };
  /* a basketball hoop: pole, board, orange rim and a white net. userData.rim = the rim's height above the base */
  P.hoop = function(h){
    const g = new T.Group();
    const pole = mesh(new T.CylinderGeometry(h * .025, h * .03, h * .82, 10), toon(0x5d6672)); pole.position.set(0, h * .41, -h * .08); g.add(pole);
    const arm = mesh(new T.BoxGeometry(h * .04, h * .04, h * .16), toon(0x5d6672)); arm.position.set(0, h * .8, 0); g.add(arm);
    const boardTex = canvasTex(256, 160, (c, w, hh) => { c.fillStyle = '#fbfbfb'; c.fillRect(0, 0, w, hh); c.strokeStyle = '#e2442f'; c.lineWidth = 12; c.strokeRect(8, 8, w - 16, hh - 16); c.lineWidth = 9; c.strokeRect(w * .33, hh * .45, w * .34, hh * .42); });
    const board = mesh(new T.BoxGeometry(h * .5, h * .31, h * .025), [toon(0xdddddd), toon(0xdddddd), toon(0xdddddd), toon(0xdddddd), toon(0xffffff, { map: boardTex }), toon(0xdddddd)]);
    board.position.set(0, h * .88, h * .08); g.add(board);
    const rim = mesh(new T.TorusGeometry(h * .09, h * .012, 8, 28), toon(0xff6a1f, { emissive: 0x401000 }));
    rim.rotation.x = Math.PI / 2; rim.position.set(0, h * .78, h * .19); g.add(rim);
    const net = new T.LineSegments(new T.WireframeGeometry(new T.CylinderGeometry(h * .09, h * .06, h * .12, 12, 2, true)), new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .85 }));
    net.position.set(0, h * .72, h * .19); g.add(net);
    g.userData.rim = { y: h * .78, z: h * .19, r: h * .09 }; g.userData.net = net;
    return g;
  };
  /* a football goal: white posts and a net */
  P.goal = function(w, h){
    const g = new T.Group(), m = toon(0xffffff);
    for (const x of [-w / 2, w / 2]){ const p = mesh(new T.CylinderGeometry(h * .04, h * .04, h, 10), m); p.position.set(x, h / 2, 0); g.add(p); }
    const bar = mesh(new T.CylinderGeometry(h * .04, h * .04, w, 10), m); bar.rotation.z = Math.PI / 2; bar.position.y = h; g.add(bar);
    const net = new T.LineSegments(new T.WireframeGeometry(new T.BoxGeometry(w, h, h * .5, 8, 6, 3)), new T.LineBasicMaterial({ color: 0xe9eef5, transparent: true, opacity: .6 }));
    net.position.set(0, h / 2, -h * .25); g.add(net); g.userData.net = net;
    return g;
  };
  /* a boxing ring seen from the front: corner posts and three ropes; userData.ropes for the bounce */
  P.ring = function(w, h){
    const g = new T.Group(), d = h * .9;
    const mat = mesh(new T.BoxGeometry(w * 1.04, h * .07, d), [toon(0x2a3b8f), toon(0x2a3b8f), toon(0x3f5bd8), toon(0x2a3b8f), toon(0x24326f), toon(0x2a3b8f)]); mat.position.y = h * .035; g.add(mat);
    const posts = [[-w / 2, -d / 2, 0xd8392b], [w / 2, -d / 2, 0x2b62d8], [-w / 2, d / 2, 0xeeeeee], [w / 2, d / 2, 0xeeeeee]];
    for (const [x, z, c] of posts){ const p = mesh(new T.CylinderGeometry(h * .035, h * .035, h * .95, 10), toon(c)); p.position.set(x, h * .5, z); g.add(p); }
    const ropes = [];
    for (let i = 0; i < 3; i++){
      const y = h * (.35 + i * .2), col = [0xff4d4d, 0xffffff, 0x4d7dff][i];
      for (const z of [-d / 2, d / 2]){ const r = mesh(new T.CylinderGeometry(h * .012, h * .012, w, 8), toon(col), 1); r.rotation.z = Math.PI / 2; r.position.set(0, y, z); g.add(r); if (z > 0) ropes.push(r); }
      for (const x of [-w / 2, w / 2]){ const r = mesh(new T.CylinderGeometry(h * .012, h * .012, d, 8), toon(col), 1); r.rotation.x = Math.PI / 2; r.position.set(x, y, 0); g.add(r); }
    }
    g.userData.ropes = ropes; g.userData.floor = h * .07;
    return g;
  };
  /* a barbell */
  P.barbell = function(w){
    const g = new T.Group();
    const bar = mesh(new T.CylinderGeometry(w * .018, w * .018, w, 10), toon(0xc9ced6)); bar.rotation.z = Math.PI / 2; g.add(bar);
    for (const s of [-1, 1]) for (let i = 0; i < 2; i++){
      const p = mesh(new T.CylinderGeometry(w * (.15 - i * .03), w * (.15 - i * .03), w * .05, 22), toon(i ? 0xd8392b : 0x23252b)); p.rotation.z = Math.PI / 2; p.position.x = s * (w * .38 + i * w * .055); g.add(p);
    }
    return g;
  };
  /* a mat (yoga, picnic blanket with a checked cloth) */
  P.mat = function(w, kind){
    const map = kind === 'picnic' ? canvasTex(128, 128, (c) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++){ c.fillStyle = (i + j) % 2 ? '#ffffff' : '#e8473f'; c.fillRect(i * 16, j * 16, 16, 16); } }) : null;
    const m = mesh(new T.BoxGeometry(w, w * .02, w * (kind === 'picnic' ? .55 : .32)), toon(kind === 'picnic' ? 0xffffff : 0x8a5cf6, { map }), 1);
    m.position.y = w * .01; const g = new T.Group(); g.add(m); return g;
  };
  /* the finish line: two posts with a FINISH banner and a red tape that breaks */
  P.finish = function(w, h){
    const g = new T.Group(), m = toon(0xf1f1f1);
    for (const x of [-w / 2, w / 2]){ const p = mesh(new T.CylinderGeometry(h * .03, h * .03, h, 10), m); p.position.set(x, h / 2, 0); g.add(p); }
    const tex = canvasTex(512, 96, (c, cw, ch) => { for (let i = 0; i < 32; i++){ c.fillStyle = i % 2 ? '#111' : '#fff'; c.fillRect(i * 16, 0, 16, 16); c.fillStyle = i % 2 ? '#fff' : '#111'; c.fillRect(i * 16, ch - 16, 16, 16); }
      c.fillStyle = '#fff'; c.fillRect(0, 16, cw, ch - 32); c.fillStyle = '#e2442f'; c.font = '900 52px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('FINISH', cw / 2, ch / 2 + 2); });
    const banner = mesh(new T.BoxGeometry(w, h * .2, h * .02), [m, m, m, m, toon(0xffffff, { map: tex }), m]); banner.position.y = h * .92; g.add(banner);
    const tapes = [];
    for (const s of [-1, 1]){ const t = new T.Group(); t.position.x = s * w / 2; const tm = mesh(new T.BoxGeometry(w / 2, h * .025, h * .01), toon(0xff2d3a), 1); tm.position.x = -s * w / 4; t.add(tm); t.position.y = h * .45; g.add(t); tapes.push(t); }
    g.userData.tapes = tapes;
    return g;
  };
  /* a little pool: tiled walls and moving water. userData.water = the water level above the base */
  const waterFs = `uniform float uTime; varying vec2 vUv;
    float w(vec2 p){ return sin(p.x * 18.0 + uTime * 1.8) * 0.5 + sin(p.y * 13.0 - uTime * 1.3 + p.x * 4.0) * 0.5; }
    void main(){ vec2 p = vUv; float c = smoothstep(0.55, 1.0, abs(w(p) + w(p * 1.7 + 3.1)) * 0.5 + 0.35);
      vec3 col = mix(vec3(0.16, 0.62, 0.86), vec3(0.42, 0.86, 0.98), p.y) + c * 0.38;
      gl_FragColor = vec4(col, 0.94); }`;
  P.pool = function(w, h){
    // tipped toward you more than other props, so the water is a wide band you can see swimmers in
    const outer = new T.Group(), g = new T.Group(), d = h * 1.9, tip = .34, wall = h * .55, level = h * .5;
    g.rotation.x = tip; outer.add(g);
    const tiles = canvasTex(128, 64, (c) => { c.fillStyle = '#e9f6ff'; c.fillRect(0, 0, 128, 64); c.strokeStyle = '#9fd0ea'; c.lineWidth = 2; for (let i = 0; i <= 8; i++){ c.beginPath(); c.moveTo(i * 16, 0); c.lineTo(i * 16, 64); c.stroke(); } for (let j = 0; j <= 4; j++){ c.beginPath(); c.moveTo(0, j * 16); c.lineTo(128, j * 16); c.stroke(); } });
    tiles.wrapS = tiles.wrapT = T.RepeatWrapping; tiles.repeat.set(w / (h * 1.2), 1);
    const wallM = toon(0xffffff, { map: tiles }), rimM = toon(0xf4f4f0);
    const front = mesh(new T.BoxGeometry(w, wall, h * .1), wallM); front.position.set(0, wall / 2, d / 2); g.add(front);
    const back = mesh(new T.BoxGeometry(w, wall * 1.1, h * .1), wallM); back.position.set(0, wall * .55, -d / 2); g.add(back);
    for (const s of [-1, 1]){ const side = mesh(new T.BoxGeometry(h * .1, wall, d), wallM); side.position.set(s * w / 2, wall / 2, 0); g.add(side); }
    const rim = mesh(new T.BoxGeometry(w + h * .14, h * .05, h * .16), rimM); rim.position.set(0, wall, d / 2); g.add(rim);
    const wm = new T.ShaderMaterial({ uniforms: { uTime: { value: 0 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: waterFs, transparent: true });
    const water = new T.Mesh(new T.PlaneGeometry(w - h * .1, d - h * .1), wm); water.rotation.x = -Math.PI / 2; water.position.y = level; g.add(water);
    // where the water line is on screen (above the base), for swimmers in the middle of the pool
    outer.userData.water = level * Math.cos(tip + .26); outer.userData.tick = t => { wm.uniforms.uTime.value = t; };
    return outer;
  };
  /* the disco ball: mirror tiles that sparkle as it turns */
  P.disco = function(d){
    const tex = canvasTex(256, 128, (c, w, h) => { for (let i = 0; i < 32; i++) for (let j = 0; j < 16; j++){ const v = 150 + Math.floor(Math.random() * 105); c.fillStyle = `rgb(${v},${v},${v + 10})`; c.fillRect(i * 8, j * 8, 7, 7); } });
    const ball = mesh(new T.SphereGeometry(d / 2, 24, 16), toon(0xffffff, { map: tex, emissive: 0x333344 }), 1);
    const g = new T.Group(); g.add(ball);
    const cord = new T.Mesh(new T.CylinderGeometry(.8, .8, 2000, 4), new T.MeshBasicMaterial({ color: 0x222222 })); cord.position.y = 1000 + d / 2; g.add(cord);
    g.userData.ball = ball;
    return g;
  };
  /* a cone of coloured light (stage spotlights) */
  const coneFs = `uniform vec3 uC; uniform float uI; varying vec2 vUv; void main(){ float x = abs(vUv.x - 0.5) * 2.0; float a = (1.0 - smoothstep(0.0, 1.0, x)) * pow(1.0 - vUv.y, 0.6) * 0.5 * uI; gl_FragColor = vec4(uC * a, a); }`;
  P.spot = function(len, width, color){
    const geo = new T.PlaneGeometry(width, len); geo.translate(0, -len / 2, 0);
    const m = new T.ShaderMaterial({ uniforms: { uC: { value: new T.Color(color) }, uI: { value: 1 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = vec2(uv.x * (0.15 + 0.85 * (1.0 - uv.y)) + (1.0 - (0.15 + 0.85 * (1.0 - uv.y))) * 0.5, uv.y); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: coneFs, transparent: true, depthWrite: false, depthTest: false, blending: T.AdditiveBlending });
    const s = new T.Mesh(geo, m); s.renderOrder = 5; s.userData.m = m;
    return s;
  };
  /* karate: two blocks and a stack of boards. userData.boards to break */
  P.boards = function(w){
    const g = new T.Group(), stone = toon(0x8e939c), wood = toon(0xd9a066);
    for (const s of [-1, 1]){ const b = mesh(new T.BoxGeometry(w * .22, w * .3, w * .3), stone); b.position.set(s * w * .36, w * .15, 0); g.add(b); }
    const boards = [];
    for (let i = 0; i < 3; i++){
      const pair = [];
      for (const s of [-1, 1]){ const b = mesh(new T.BoxGeometry(w * .5, w * .045, w * .34), wood, 1); b.position.set(s * w * .25, w * (.33 + i * .05), 0); g.add(b); pair.push(b); }
      boards.push(pair);
    }
    g.userData.boards = boards;
    return g;
  };
  /* a rope between two points (tug of war, fishing line) */
  P.rope = function(color, thick){
    const m = mesh(new T.CylinderGeometry(thick || 2.4, thick || 2.4, 1, 6), toon(color || 0xc49a5a), 1);
    const g = new T.Group(); g.add(m);
    g.userData.set = (a, b) => { const dx = b.x - a.x, dy = -(b.y - a.y), len = Math.hypot(dx, dy); g.position.set((a.x + b.x) / 2, -(a.y + b.y) / 2, 520); m.scale.set(1, len, 1); m.rotation.z = Math.atan2(dy, dx) - Math.PI / 2; };
    E.scene.add(g);
    return g;
  };
  /* sauna: a small cabin seen from the front, with a plank wall, a frame and a sign, a two-step bench and a stove with stones.
     userData.seat = the top bench's height, userData.stove = where the stones are, userData.stones */
  P.sauna = function(w, h){
    const g = new T.Group(), d = h * .5;
    const planks = canvasTex(256, 256, (c, cw, ch) => { for (let i = 0; i < 12; i++){ c.fillStyle = ['#b8784a', '#c2834f', '#ad7044'][i % 3]; c.fillRect(i * cw / 12, 0, cw / 12, ch); c.fillStyle = 'rgba(70,35,12,.45)'; c.fillRect(i * cw / 12, 0, 2, ch); }
      c.fillStyle = 'rgba(255,220,170,.08)'; for (let k = 0; k < 40; k++) c.fillRect(Math.random() * cw, Math.random() * ch, 1 + Math.random() * 2, 8 + Math.random() * 20); });
    const dark = toon(0x6b3d22), wood = toon(0xa8693a), wallM = toon(0xffffff, { map: planks });
    const wall = mesh(new T.BoxGeometry(w, h, h * .05), wallM); wall.position.set(0, h / 2, -d); g.add(wall);
    for (const sx of [-1, 1]){ const post = mesh(new T.BoxGeometry(h * .09, h * 1.04, h * .09), dark); post.position.set(sx * (w / 2 + h * .02), h * .52, -d + h * .05); g.add(post); }
    const beam = mesh(new T.BoxGeometry(w + h * .2, h * .1, h * .12), dark); beam.position.set(0, h * 1.03, -d + h * .06); g.add(beam);
    const sign = canvasTex(256, 72, (c, cw, ch) => { c.fillStyle = '#4a2814'; c.fillRect(0, 0, cw, ch); c.strokeStyle = '#e8b779'; c.lineWidth = 4; c.strokeRect(6, 6, cw - 12, ch - 12);
      c.fillStyle = '#ffd9a0'; c.font = '800 40px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('SAUNA', cw / 2, ch / 2 + 2); });
    const board = mesh(new T.BoxGeometry(h * .62, h * .17, h * .03), [dark, dark, dark, dark, toon(0xffffff, { map: sign }), dark]); board.position.set(0, h * .86, -d + h * .07); g.add(board);
    // two benches, the top one to sit on
    const seat = h * .3;
    for (const [y, z, dep] of [[seat * .5, -d * .1, h * .22], [seat, -d * .55, h * .26]]){
      const top = mesh(new T.BoxGeometry(w * .72, h * .045, dep), wood); top.position.set(-w * .1, y, z); g.add(top);
      const front = mesh(new T.BoxGeometry(w * .72, y, h * .03), toon(0x8a5530)); front.position.set(-w * .1, y / 2, z + dep / 2); g.add(front);
    }
    // the stove: black iron, a basket of stones that glow when water hits them
    const sx = w * .36, sz = -d * .2;
    const stove = mesh(new T.BoxGeometry(h * .26, h * .3, h * .22), toon(0x2c2e35)); stove.position.set(sx, h * .15, sz); g.add(stove);
    const door = mesh(new T.BoxGeometry(h * .14, h * .08, h * .01), toon(0xff7a2a, { emissive: 0x7a2a05 }), false); door.position.set(sx, h * .12, sz + h * .115); g.add(door);
    const rim = mesh(new T.BoxGeometry(h * .3, h * .04, h * .26), toon(0x3d4049)); rim.position.set(sx, h * .32, sz); g.add(rim);
    const stones = new T.Group();
    for (let i = 0; i < 9; i++){ const st = mesh(new T.DodecahedronGeometry(h * (.035 + Math.random() * .015)), toon(0x8a8c95, { emissive: 0x220a00 }), 1);
      st.position.set(sx + (Math.random() - .5) * h * .22, h * .36 + Math.random() * h * .04, sz + (Math.random() - .5) * h * .16); stones.add(st); }
    g.add(stones);
    g.userData.stones = stones; g.userData.seat = seat; g.userData.stove = { x: sx, y: h * .4 }; g.userData.seatZ = -d * .55;
    return g;
  };
  /* fire: two crossed flickering flame planes (put on top of the campfire) */
  const flameFs = `uniform float uTime; varying vec2 vUv;
    float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float nz(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(hh(i), hh(i + vec2(1.0, 0.0)), u.x), mix(hh(i + vec2(0.0, 1.0)), hh(i + vec2(1.0, 1.0)), u.x), u.y); }
    void main(){ vec2 p = vUv; float n = nz(vec2(p.x * 6.0, p.y * 4.0 - uTime * 4.0)) * 0.6 + nz(vec2(p.x * 12.0, p.y * 8.0 - uTime * 7.0)) * 0.4;
      float cx = abs(p.x - 0.5) * 2.0; float shape = (1.0 - cx * 1.2) * (1.0 - p.y * 0.95) + (n - 0.5) * 0.7;
      float a = smoothstep(0.15, 0.45, shape); float core = smoothstep(0.5, 0.85, shape);
      vec3 col = mix(vec3(1.0, 0.35, 0.05), vec3(1.0, 0.85, 0.35), core) + core * 0.4;
      gl_FragColor = vec4(col * a, a); }`;
  P.fire = function(h){
    const g = new T.Group(), m = new T.ShaderMaterial({ uniforms: { uTime: { value: 0 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: flameFs, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
    for (let i = 0; i < 2; i++){ const p = new T.Mesh(new T.PlaneGeometry(h * .75, h), m); p.position.y = h / 2; p.rotation.y = i * Math.PI / 2 + .4; p.renderOrder = 6; g.add(p); }
    g.userData.tick = t => { m.uniforms.uTime.value = t; };
    return g;
  };
  /* a fishing rod (held) */
  P.rod = function(len){
    const g = new T.Group();
    const r = mesh(new T.CylinderGeometry(len * .008, len * .016, len, 6), toon(0x6b4423), 1); r.position.y = len / 2; g.add(r);
    const reel = mesh(new T.CylinderGeometry(len * .04, len * .04, len * .03, 12), toon(0x333333), 1); reel.rotation.z = Math.PI / 2; reel.position.y = len * .15; g.add(reel);
    g.userData.tip = r; g.userData.len = len;
    return g;
  };
  /* a small puddle of water to fish or splash in */
  P.puddle = function(w){
    const wm = new T.ShaderMaterial({ uniforms: { uTime: { value: 0 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float uTime; varying vec2 vUv; void main(){ vec2 p = (vUv - 0.5) * 2.0; float r = length(p); if (r > 1.0) discard;
        float ripple = smoothstep(0.92, 1.0, sin(r * 22.0 - uTime * 3.0)) * 0.3; vec3 col = mix(vec3(0.42, 0.85, 0.98), vec3(0.15, 0.55, 0.85), r) + ripple;
        float a = smoothstep(1.0, 0.9, r) * 0.95; gl_FragColor = vec4(col, a); }`, transparent: true, depthWrite: false });
    const m = new T.Mesh(new T.PlaneGeometry(w, w * .5), wm); m.rotation.x = -Math.PI / 2; m.position.y = 1;
    const g = new T.Group(); g.add(m); g.userData.tick = t => { wm.uniforms.uTime.value = t; };
    return g;
  };
  /* a guitar: the lute from the Pirate Kit, held across the body (async because it loads) */
  return P;
};
})();
