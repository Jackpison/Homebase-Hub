/* Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 *
 * Characters: the engine. One see-through 3D layer over the page, where 1 to 5 characters live their everyday life
 * (walk, sit on the clock, nap, wave, snack, peek) and, every few minutes, do an activity together (activities.js).
 * Loaded by cast.js only when Characters is on. Nothing here asks another server: models, props and three.js are files of this site.
 *
 * Screen space: 1 unit = 1 CSS pixel. x grows to the right, y grows UP (so a point at the screen's y=py is at -py).
 * A character's position is its feet. Surfaces are lines it can stand on: the floor (bottom of the screen) and the
 * tops of things the page names (the clock, the dock...). See host.surfaces in cast.js.
 */
(function(){
'use strict';
const C = window.HubCast;
const T = window.THREE;

/* ---------- verbs: what an activity asks for, and the clip names each model family has for it (first match wins) ---------- */
const VERBS = {
  idle:   ['idle', 'Idle', 'Flying_Idle', 'Swim', 'Tentacle_Idle'],
  walk:   ['walk', 'Walk', 'Flying_Idle', 'Swim'],
  run:    ['sprint', 'run', 'Run', 'Fast_Flying', 'Swim_Fast', 'walk', 'Walk'],
  jump:   ['jump', 'Jump', 'Fast_Flying', 'Swim_Fast', 'run', 'walk'],
  fall:   ['fall', 'Jump_Idle', 'Flying_Idle', 'Swim', 'idle'],
  happy:  ['emote-yes', 'gesture-positive', 'Yes', 'Wave', 'Swim_Fast'],
  sad:    ['emote-no', 'gesture-negative', 'No', 'Swim'],
  wave:   ['Wave', 'interact-left', 'interact-right', 'emote-yes', 'gesture-positive', 'Yes', 'Swim_Fast'],
  punch:  ['attack-melee-right', 'Punch', 'Bite_Front', 'Headbutt', 'Swim_Bite', 'eat'],
  punch2: ['attack-melee-left', 'Punch', 'Bite_Front', 'Headbutt', 'Swim_Bite', 'eat'],
  kick:   ['attack-kick-right', 'Weapon', 'Sword', 'Headbutt', 'Swim_Bite', 'Bite_Front', 'eat'],
  swing:  ['Sword', 'Weapon', 'attack-melee-right', 'Punch', 'Headbutt', 'Bite_Front', 'Swim_Bite', 'eat'],
  hit:    ['HitReact', 'HitRecieve', 'emote-no', 'gesture-negative', 'No', 'Swim_Fast'],
  ko:     ['die', 'Death', 'gesture-negative', 'Swim'],
  sit:    ['sit', 'Duck', 'crouch', 'idle', 'Idle', 'Flying_Idle', 'Swim'],
  crouch: ['crouch', 'Duck', 'pick-up', 'eat', 'idle', 'Idle', 'Flying_Idle', 'Swim'],
  dance:  ['dance', 'Dance'],
  eat:    ['eat', 'pick-up', 'interact-right', 'Bite_Front', 'Punch', 'Swim_Bite'],
  pick:   ['pick-up', 'interact-right', 'crouch', 'Duck', 'eat', 'Bite_Front', 'Punch'],
  hold:   ['holding-both', 'holding-right', 'idle', 'Idle', 'Flying_Idle', 'Swim'],
  use:    ['interact-right', 'pick-up', 'Punch', 'eat', 'Bite_Front', 'Headbutt'],
  drive:  ['drive', 'sit', 'Duck', 'idle', 'Idle', 'Flying_Idle', 'Swim'],
};
/* How each family moves: people walk, flyers hover above the surface, the shark swims in the air with bubbles. */
const FAMILIES = {
  mini: { walk: 1.15, run: 2.9 }, blocky: { walk: 1.15, run: 2.9 }, pets: { walk: 1.0, run: 2.6 },
  pirates: { walk: 1.1, run: 2.8 }, monsters: { walk: 1.0, run: 2.5 }, blobs: { walk: .9, run: 2.2 },
  flyers: { walk: 1.2, run: 2.8, hover: .42 }, swimmers: { walk: 1.1, run: 2.6, hover: .2, swim: true },
};
C.VERBS = VERBS; C.FAMILIES = FAMILIES;
C.life = C.life || {};   // everyday life: name -> { w: weight, ok(a): can it, run: function*(a) } (filled by activities.js)

const TILT = .26;            // characters lean toward you a little, so you see the tops of heads and props
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = { out: t => 1 - Math.pow(1 - t, 3), inOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  back: t => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  elastic: t => t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI / 3)) + 1 };
C.util = { rand, pick, clamp, ease };

/* ---------- little task runner: activities and everyday life are generator functions ----------
   yield <seconds>       wait
   yield <function(dt)>  wait until it returns true (called every frame)
   yield <generator>     run it to the end first (same as yield*)
   yield                 wait one frame */
function Runner(gen){ this.stack = [gen]; this.wait = 0; this.cond = null; this.done = false; }
Runner.prototype.step = function(dt){
  if (this.done) return true;
  if (this.wait > 0){ this.wait -= dt; if (this.wait > 0) return false; }
  if (this.cond){ if (!this.cond(dt)) return false; this.cond = null; }
  for (let guard = 0; guard < 64; guard++){
    const top = this.stack[this.stack.length - 1];
    let r;
    try { r = top.next(); } catch (e){ console.warn('Characters:', e); this.done = true; return true; }
    if (r.done){ this.stack.pop(); if (!this.stack.length){ this.done = true; return true; } continue; }
    const v = r.value;
    if (typeof v === 'number'){ this.wait = v; return false; }
    if (typeof v === 'function'){ if (v(0)) continue; this.cond = v; return false; }
    if (v && typeof v.next === 'function'){ this.stack.push(v); continue; }
    return false;
  }
  return false;
};
Runner.prototype.stop = function(){ for (const g of this.stack){ try { g.return(); } catch { /* already finished */ } } this.stack = []; this.done = true; };
C.Runner = Runner;

/* ---------- the stage ---------- */
C.createStage = function(opts){
  const host = opts.host;                       // the page: surfaces(), avoid(el), layer for words and bubbles
  const reduced = !!opts.reduced;
  const E = { base: opts.base || '', dt: 0, time: 0, actors: [], guests: [], cast: opts.cast, defs: {}, models: {}, busy: false, last: [], paused: false, host };
  for (const d of opts.cast.cast) E.defs[d.id] = d;
  C.E = E;

  /* renderer: one canvas over the whole page, never catching the mouse */
  const canvas = document.createElement('canvas');
  canvas.className = 'hc-canvas'; canvas.setAttribute('aria-hidden', 'true');
  const layer = document.createElement('div');      // words, bubbles, flashes: crisp HTML over the 3D
  layer.className = 'hc-layer'; layer.setAttribute('aria-hidden', 'true');
  const under = document.createElement('div');      // darkening that sits under the characters (the beam, the duel)
  under.className = 'hc-under'; under.setAttribute('aria-hidden', 'true');
  document.body.append(under, canvas, layer);
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power', premultipliedAlpha: true });
  } catch { canvas.remove(); layer.remove(); under.remove(); return null; }   // no 3D in this browser: no characters, nothing else changes
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.setClearColor(0x000000, 0);
  const scene = new T.Scene();
  const cam = new T.OrthographicCamera(0, 1, 0, -1, -4000, 4000);
  cam.position.set(0, 0, 1000);
  E.renderer = renderer; E.scene = scene; E.cam = cam; E.canvas = canvas; E.layer = layer; E.under = under;

  /* light: a soft sky, a warm key light from the top left, a cool rim from behind */
  scene.add(new T.HemisphereLight(0xfff4e6, 0x3a4660, .85));
  const key = new T.DirectionalLight(0xfff1dc, 1.05); key.position.set(-.6, 1, .9); scene.add(key);
  const rim = new T.DirectionalLight(0x9fc4ff, .55); rim.position.set(.7, .4, -1); scene.add(rim);
  E.lights = { key, rim };

  /* cel shading: three tones and a dark outline, the anime look */
  const tones = new Uint8Array([90, 90, 90, 255, 168, 168, 168, 255, 225, 225, 225, 255, 255, 255, 255, 255]);
  const gradient = new T.DataTexture(tones, 4, 1, T.RGBAFormat); gradient.minFilter = gradient.magFilter = T.NearestFilter; gradient.needsUpdate = true;
  E.gradient = gradient;

  let W = 1, H = 1, dpr = 1;
  E.unit = 64;   // a person's height in px; set by resize
  function resize(){
    W = innerWidth; H = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
    cam.left = 0; cam.right = W; cam.top = 0; cam.bottom = -H; cam.updateProjectionMatrix();
    E.W = W; E.H = H;
    const u = clamp(Math.min(H * .11, W * .16), 48, 104);
    if (Math.abs(u - E.unit) > .5){ E.unit = u; for (const a of E.actors.concat(E.guests)) a.fit(); }
    surfaces(true);
  }

  /* ---------- surfaces ---------- */
  let surf = [], surfAt = 0;
  function surfaces(force){
    if (!force && E.time - surfAt < .4) return surf;
    surfAt = E.time;
    const list = [{ id: 'floor', x1: 10, x2: W - 10, y: H - Math.max(10, H * .018), kind: 'floor' }];
    for (const s of host.surfaces ? host.surfaces() : []){
      if (s.x2 - s.x1 > E.unit * .9 && s.y > E.unit * 1.2 && s.y < H - E.unit * .6) list.push(s);
    }
    surf = list; E.surf = list;
    return list;
  }
  E.surfaces = surfaces;
  E.surface = id => surfaces().find(s => s.id === id) || surf[0];
  E.floor = () => surfaces()[0];

  /* ---------- loading models (the .json files hold a base64 glb: see scripts/cast_assets.py) ---------- */
  const loader = new T.GLTFLoader();
  // textures inside a model become blob: addresses; read them as plain images (allowed by the page's img-src) instead of
  // with fetch(), which the page's security policy keeps to this site's own addresses
  loader.register(parser => { parser.textureLoader = new T.TextureLoader(parser.options.manager); return { name: 'hub_images' }; });
  const files = {};
  function loadGlb(url){
    // the bytes are kept; each call parses a fresh copy (a character that comes back gets its own model)
    if (!files[url]) files[url] = fetch(url).then(r => { if (!r.ok) throw new Error(url + ': ' + r.status); return r.json(); }).then(j => {
      const bin = atob(j.glb), u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      return u8.buffer;
    });
    return files[url].then(buf => new Promise((ok, no) => loader.parse(buf, '', ok, no)));
  }
  E.loadGlb = loadGlb;

  /* toon materials and an outline for everything we load */
  const outlineMat = (px) => {
    const m = new T.MeshBasicMaterial({ color: 0x17121f, side: T.BackSide });
    m.userData.px = px;
    m.onBeforeCompile = sh => {
      sh.uniforms.uOutline = { value: 0 }; m.userData.u = sh.uniforms.uOutline;
      sh.vertexShader = 'uniform float uOutline;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normalize(normal) * uOutline;');
    };
    return m;
  };
  function toonify(root, px){
    const meshes = [];
    root.traverse(o => { if (o.isMesh) meshes.push(o); });
    const mats = [];
    for (const m of meshes){
      if (!m.geometry.attributes.normal) m.geometry.computeVertexNormals();   // Blocky models have none (they were made unlit)
      const src = Array.isArray(m.material) ? m.material[0] : m.material;
      const toon = new T.MeshToonMaterial({ color: src.color ? src.color.clone() : 0xffffff, map: src.map || null, gradientMap: gradient,
        transparent: !!src.transparent, opacity: src.opacity ?? 1, side: T.FrontSide });
      if (src.emissive) { toon.emissive = src.emissive.clone(); toon.emissiveMap = src.emissiveMap || null; }
      m.material = toon; m.castShadow = false; m.frustumCulled = false;
      const om = outlineMat(px);
      let o;
      if (m.isSkinnedMesh){ o = new T.SkinnedMesh(m.geometry, om); o.bind(m.skeleton, m.bindMatrix); }
      else o = new T.Mesh(m.geometry, om);
      o.position.copy(m.position); o.quaternion.copy(m.quaternion); o.scale.copy(m.scale);
      o.frustumCulled = false; o.renderOrder = -1; o.userData.outline = true;
      m.parent.add(o); mats.push(om);
    }
    return mats;
  }
  E.toonify = toonify;
  /* the outline is a few pixels wide whatever the model's own size */
  E.setOutline = (mats, scale) => { for (const m of mats) if (m.userData.u) m.userData.u.value = m.userData.px / scale; else m.userData.pending = m.userData.px / scale; };
  function syncOutlines(){ /* first frame: the shader exists only after compile */
    for (const a of E.actors.concat(E.guests)) for (const m of a.outlines) if (m.userData.u && m.userData.pending){ m.userData.u.value = m.userData.pending; m.userData.pending = 0; }
  }

  /* the real size of a model: skinned meshes are measured in their posed shape (the stored numbers are packed, so
     three.js's own box would be wrong) */
  E.measure = function(root){
    root.updateMatrixWorld(true);
    const box = new T.Box3(), v = new T.Vector3();
    root.traverse(o => {
      if (!o.isMesh || o.userData.outline) return;
      const pos = o.geometry.attributes.position, step = Math.max(1, Math.floor(pos.count / 3000));
      if (o.isSkinnedMesh) o.skeleton.update();
      for (let i = 0; i < pos.count; i += step){
        v.fromBufferAttribute(pos, i);
        if (o.isSkinnedMesh) o.boneTransform(i, v);
        v.applyMatrix4(o.matrixWorld); box.expandByPoint(v);
      }
    });
    return box;
  };

  /* soft round shadow under a character */
  const shadowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 2, 32, 32, 31);
    r.addColorStop(0, 'rgba(10,8,20,.55)'); r.addColorStop(.6, 'rgba(10,8,20,.22)'); r.addColorStop(1, 'rgba(10,8,20,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); const t = new T.CanvasTexture(c); return t; })();
  E.shadowTex = shadowTex;

  /* ---------- a character ---------- */
  function Actor(def){
    this.def = def; this.id = def.id; this.fam = FAMILIES[def.family] || FAMILIES.mini;
    this.root = new T.Group(); this.root.rotation.x = TILT;
    this.turn = new T.Group(); this.root.add(this.turn);
    this.shadow = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    this.shadow.renderOrder = -2;   // an ellipse facing you, under the feet
    scene.add(this.shadow);
    this.x = 0; this.y = 0; this.z = 0; this.lift = 0; this.hover = 0;
    this.sx = 1; this.sy = 1; this.face = 0; this.faceT = 0; this.spin = 0;
    this.surface = 'floor'; this.actions = {}; this.cur = null; this.verb = ''; this.brain = null; this.job = null;
    this.held = []; this.temp = []; this.outlines = []; this.ready = false; this.visible = true; this.pokes = 0; this.mood = 0;
  }
  Actor.prototype.load = function(){
    return loadGlb(E.base + 'models/' + this.id + '.json').then(g => {
      const m = g.scene;
      this.outlines = toonify(m, 1.6);
      this.model = m; this.turn.add(m);
      const box = E.measure(m), size = box.getSize(new T.Vector3());
      this.box = { size, min: box.min.clone() };
      this.mixer = new T.AnimationMixer(m);
      for (const clip of g.animations) this.actions[clip.name] = this.mixer.clipAction(clip);
      // bones to hold things with: Quaternius hands (Middle2.R) or Kenney arms (arm-right)
      m.traverse(o => {
        const n = (o.name || '').toLowerCase();
        if (!this.handR && (n === 'middle2.r' || n === 'arm-right')) this.handR = o;
        if (!this.handL && (n === 'middle2.l' || n === 'arm-left')) this.handL = o;
        if (!this.head && n === 'head') this.head = o;
        if (/^weapon_/.test(o.name || '')) (this.weapons = this.weapons || []).push(o);
      });
      this.kenneyArm = this.handR && this.handR.name === 'arm-right';
      this.fit(); scene.add(this.root); this.ready = true;
      this.play('idle');
      return this;
    });
  };
  /* size: a person is E.unit px tall; the model's feet sit on the origin */
  Actor.prototype.fit = function(){
    if (!this.box) return;
    const s = this.box.size, h = E.unit * (this.def.height || 1);
    const k = this.fam.swim ? h / Math.max(s.y * 1.6, s.x * .55, s.z * .55) : h / Math.max(s.y, s.x * .8, s.z * .8);
    this.k = k; this.h = s.y * k; this.w = Math.max(s.x, s.z) * k;
    this.model.scale.setScalar(k);
    this.model.position.set(-(this.box.min.x + s.x / 2) * k, -this.box.min.y * k, -(this.box.min.z + s.z / 2) * k);
    this.hover = (this.fam.hover || 0) * E.unit;
    E.setOutline(this.outlines, k);
    this.shadow.scale.set(this.w * 1.2, this.w * .32, 1);
  };
  Actor.prototype.clip = function(verb){
    const names = VERBS[verb] || [verb];
    for (const n of names) if (this.actions[n]) return this.actions[n];
    return this.actions[Object.keys(this.actions)[0]];
  };
  Actor.prototype.can = function(verb){ return (VERBS[verb] || [verb]).slice(0, 4).some(n => this.actions[n]); };
  /* play a verb. once: plays one time and holds the last frame. Returns the clip length in seconds. */
  Actor.prototype.play = function(verb, o){
    o = o || {};
    const a = this.clip(verb); if (!a) return 0;
    const speed = o.speed || 1;
    if (a === this.cur && !o.once && !o.restart){ a.timeScale = speed; return a.getClip().duration / speed; }
    a.reset(); a.enabled = true; a.timeScale = speed;
    a.setLoop(o.once ? T.LoopOnce : T.LoopRepeat, Infinity); a.clampWhenFinished = !!o.once;
    if (o.at != null) a.time = o.at * a.getClip().duration;
    a.setEffectiveWeight(1);
    if (this.cur && this.cur !== a) a.crossFadeFrom(this.cur, o.fade ?? .22, true);
    a.play();
    this.cur = a; this.verb = verb;
    return a.getClip().duration / speed;
  };
  /* freeze the current pose (for a charge-up), or let it run again */
  Actor.prototype.hold = function(on){ if (this.cur) this.cur.timeScale = on ? 0 : 1; };
  Actor.prototype.faceTo = function(dir){ this.faceT = dir; };   // -1 left, 1 right, 0 toward you
  Actor.prototype.look = function(x){ this.faceT = x > this.x + 4 ? 1 : x < this.x - 4 ? -1 : 0; };
  Actor.prototype.squash = function(sx, sy, t){ this.sqA = { sx, sy, t: t || .22, e: 0 }; };
  Actor.prototype.top = function(){ return { x: this.x, y: this.y - this.lift - this.hover - this.h * this.sy }; };
  Actor.prototype.mid = function(){ return { x: this.x, y: this.y - this.lift - this.hover - this.h * .55 * this.sy }; };
  Actor.prototype.feet = function(){ return { x: this.x, y: this.y - this.lift - this.hover }; };
  /* where a hand is, in screen px (for props, beams, sparks) */
  const v3 = new T.Vector3();
  Actor.prototype.hand = function(left){
    const b = left ? this.handL : this.handR;
    if (!b){ const m = this.mid(); return { x: m.x + (this.faceDir() * this.w * .45), y: m.y }; }
    this.root.updateMatrixWorld(true);
    if (this.kenneyArm){ v3.set(0, -this.box.size.y * .2, 0); b.localToWorld(v3); } else b.getWorldPosition(v3);
    return { x: v3.x, y: -v3.y, z: v3.z };
  };
  Actor.prototype.faceDir = function(){ return this.faceT === 0 ? (this.lastDir || 1) : this.faceT; };
  /* hold a prop in a hand: it follows the bone */
  Actor.prototype.grab = function(obj, left, offset){
    const b = left ? this.handL : this.handR;
    if (!b){ this.turn.add(obj); obj.position.set(this.w * .45 * (left ? -1 : 1), this.h * .5, this.w * .3); this.held.push(obj); return obj; }
    // the bone is inside a scaled model: undo that scale so the prop keeps its own size
    const holder = new T.Group(); holder.scale.setScalar(1 / this.k);
    if (this.kenneyArm) holder.position.set(0, -this.box.size.y * .2, this.box.size.z * .05);
    if (offset) holder.position.add(offset);
    holder.add(obj); b.add(holder); this.held.push(holder);
    return obj;
  };
  Actor.prototype.drop = function(){ for (const h of this.held) h.parent && h.parent.remove(h); this.held = []; };
  Actor.prototype.weaponsOn = function(on){ for (const w of this.weapons || []) w.visible = on; };
  Actor.prototype.setVisible = function(on){ this.visible = on; this.root.visible = on; this.shadow.visible = on; };
  Actor.prototype.place = function(x, surfaceId){ this.surface = surfaceId || this.surface; this.x = x; this.y = E.surface(this.surface).y; };
  Actor.prototype.update = function(dt){
    if (!this.ready) return;
    if (this.surface && !this.flying){
      const s = E.surface(this.surface);
      if (s.id !== this.surface){ this.surface = 'floor'; this.falling = true; }   // the thing it stood on is gone: it falls
      else if (!this.jumping) this.y = s.y;
    }
    if (this.falling){ this.vy = (this.vy || 0) + 2600 * dt; this.y += this.vy * dt; const f = E.floor().y;
      if (this.y >= f){ this.y = f; this.falling = false; this.vy = 0; this.squash(1.25, .72); C.fx && C.fx.dust(this.x, f, this.w); } }
    this.mixer.update(dt);
    // turning: smooth, a 3/4 view when walking so you still see the face
    const want = this.faceT * 1.12 + this.spin;
    this.face += (want - this.face) * Math.min(1, dt * 9);
    if (this.faceT) this.lastDir = this.faceT;
    this.turn.rotation.y = this.face;
    // squash and stretch, springing back
    if (this.sqA){ const q = this.sqA; q.e += dt; const t = Math.min(1, q.e / q.t), k = ease.elastic(t);
      this.sx = q.sx + (1 - q.sx) * k; this.sy = q.sy + (1 - q.sy) * k; if (t >= 1){ this.sqA = null; this.sx = this.sy = 1; } }
    const bob = this.hover ? Math.sin(E.time * 2.6 + this.x * .01) * E.unit * .06 : 0;
    this.root.scale.set(this.sx, this.sy, this.sx);
    this.root.rotation.z = this.lean || 0;   // leaning (swimming, pulling a rope)
    this.root.position.set(this.x, -(this.y - this.lift - this.hover - bob), this.z + (this.y * .02));
    // the shadow stays on the surface and shrinks as it goes up
    const up = this.lift + this.hover + bob, f = clamp(1 - up / (E.unit * 3), .25, 1);
    this.shadow.position.set(this.x, -this.y - 1, this.z - 5);
    this.shadow.scale.set(this.w * 1.2 * f, this.w * .32 * f, 1);
    this.shadow.material.opacity = f * (this.visible ? 1 : 0);
  };
  Actor.prototype.dispose = function(){
    scene.remove(this.root); scene.remove(this.shadow);
    if (this.brain) this.brain.stop();
    for (const t of this.temp) t.dispose ? t.dispose() : t.parent && t.parent.remove(t);
  };
  E.Actor = Actor;

  /* ---------- movement, written as tasks (generators) ---------- */
  /* walk (or run) along the current surface to x */
  E.walkTo = function*(a, x, o){
    o = o || {};
    const s = E.surface(a.surface); x = clamp(x, s.x1 + a.w * .5, s.x2 - a.w * .5);
    if (Math.abs(x - a.x) < 2){ return; }
    const run = !!o.run, sp = E.unit * (run ? a.fam.run : a.fam.walk) * (o.speed || 1);
    a.play(run ? 'run' : 'walk', { speed: run ? 1.15 : 1 });
    let dustT = 0;
    while (Math.abs(x - a.x) > 1){
      const dir = Math.sign(x - a.x); a.faceTo(dir);
      a.x += dir * Math.min(Math.abs(x - a.x), sp * E.dt);
      if (run && !a.hover && (dustT -= E.dt) <= 0){ dustT = .18; C.fx.puff(a.x - dir * a.w * .3, a.y, a.w * .5, dir); }
      if (a.surface !== 'floor'){ const s2 = E.surface(a.surface); if (s2.id !== a.surface) return; x = clamp(x, s2.x1 + a.w * .4, s2.x2 - a.w * .4); }
      yield;
    }
    if (!o.keep){ a.play('idle'); a.faceTo(o.face ?? 0); }
  };
  /* leap to a point on another surface: crouch, stretch on the way up, squash on landing */
  E.leap = function*(a, x, surfaceId, o){
    o = o || {};
    const s = E.surface(surfaceId); if (!s) return;
    x = clamp(x, s.x1 + a.w * .4, s.x2 - a.w * .4);
    const x0 = a.x, y0 = a.y, y1 = s.y, dist = Math.hypot(x - x0, y1 - y0);
    a.faceTo(Math.sign(x - x0) || a.faceDir());
    if (!a.hover){ a.squash(1.18, .78, .16); a.play('crouch', { once: true }); yield .14; }
    a.play('jump', { once: true, restart: true }); a.jumping = true; a.surface = null;
    const dur = clamp(.45 + dist / (E.unit * 9), .45, 1.05), peak = Math.max(E.unit * .9, (y0 - y1) * .25 + E.unit * (o.high || 1));
    if (!a.hover) C.fx.dust(x0, y0, a.w);
    if (dist > E.unit * 3) C.fx.whoosh(a);
    let t = 0;
    a.sx = .9; a.sy = 1.14;
    while (t < dur){
      t += E.dt; const k = Math.min(1, t / dur);
      a.x = x0 + (x - x0) * ease.inOut(k);
      a.y = y0 + (y1 - y0) * k - peak * 4 * k * (1 - k);
      if (k > .5 && a.verb !== 'fall'){ a.play('fall', { fade: .15 }); }
      yield;
    }
    a.x = x; a.y = y1; a.jumping = false; a.surface = surfaceId;
    if (!a.hover){ a.squash(1.28, .7, .3); C.fx.dust(x, y1, a.w); }
    a.play('idle'); a.faceTo(o.face ?? 0);
    yield .12;
  };
  /* go somewhere: walk if it is on the same surface, otherwise leap */
  E.goTo = function*(a, x, surfaceId, o){
    surfaceId = surfaceId || 'floor';
    if (a.surface === surfaceId) yield* E.walkTo(a, x, o);
    else {
      // walk under the target first if it is far away sideways, then leap
      const s = E.surface(a.surface || 'floor');
      const nearX = clamp(x, s.x1 + a.w, s.x2 - a.w);
      if (Math.abs(nearX - a.x) > E.unit * 3) yield* E.walkTo(a, nearX - Math.sign(nearX - a.x) * E.unit * 1.5, { run: o && o.run, keep: true });
      yield* E.leap(a, x, surfaceId, o);
    }
  };
  /* play a verb once and wait for it to finish (or wait a set time for a looping one) */
  E.act = function*(a, verb, secs, o){
    const d = a.play(verb, Object.assign({ once: !secs, restart: true }, o || {}));
    yield secs || Math.max(.3, d - .05);
  };
  E.all = function*(...gens){ const rs = gens.filter(Boolean).map(g => new Runner(g)); let first = true;
    while (true){ let done = true; for (const r of rs) if (!r.step(first ? 0 : E.dt)) done = false; first = false; if (done) return; yield; } };
  E.until = f => () => f();
  E.tween = function*(secs, fn, e){ let t = 0; while (t < secs){ t += E.dt; fn((e || ease.inOut)(Math.min(1, t / secs))); yield; } };

  /* ---------- everyday life ---------- */
  const life = C.life;
  function chooseLife(a){
    const opts = Object.entries(life).filter(([, l]) => !l.ok || l.ok(a));
    let sum = 0; for (const [, l] of opts) sum += l.w;
    let r = Math.random() * sum;
    for (const [n, l] of opts){ r -= l.w; if (r <= 0) return [n, l]; }
    return opts[0];
  }
  function* everyday(a){
    yield rand(.2, 1.2);
    while (true){
      const [n, l] = chooseLife(a);
      a.doing = n;
      yield* l.run(a);
      for (const t of a.temp.splice(0)) t.dispose ? t.dispose() : t.parent && t.parent.remove(t);
      a.drop();
      yield rand(.6, 2.4);
    }
  }
  E.free = a => !a.job;
  E.startLife = a => { if (a.brain) a.brain.stop(); a.brain = reduced ? null : new Runner(everyday(a)); };

  /* ---------- the director: an activity every few minutes ---------- */
  let nextAt = 0;
  const pace = () => opts.settings.pace === 'calm' ? [300, 540] : [120, 240];
  function plan(first){ const [a, b] = first ? [22, 36] : pace(); nextAt = E.time + rand(a, b); }
  E.activities = C.activities || {};
  function eligible(force){
    const W0 = E.W;
    return Object.entries(C.activities).filter(([id, act]) => {
      if (force) return id === force;
      if (act.off) return false;
      if (opts.settings.beam === false && id === 'beam') return false;
      if (act.minWidth && W0 < act.minWidth) return false;
      if (E.last.includes(id)) return false;
      return true;
    });
  }
  async function startActivity(force){
    if (E.busy || reduced) return false;
    const list = eligible(force); if (!list.length) return false;
    let sum = 0; for (const [, a] of list) sum += a.weight || 1;
    let r = Math.random() * sum, id = list[0][0], act = list[0][1];
    for (const [i, a] of list){ r -= a.weight || 1; if (r <= 0){ id = i; act = a; break; } }
    E.busy = true;
    try {
      const need = act.cast || 1, want = act.want || need;
      // who takes part: free actors that can do it, then guests from the rest of the cast walk in
      const pool = E.actors.filter(a => a.ready && (!act.fits || act.fits(a)));
      const team = pool.sort(() => Math.random() - .5).slice(0, want);
      const guestIds = [];
      if (team.length < want){
        const gOk = act.guestOk || (d => !act.fits || act.fits({ fam: FAMILIES[d.family] || {}, can: () => true }));
        const ids = opts.settings.ids || [];   // guests come only from the characters allowed in Settings
        const others = opts.cast.cast.filter(d => !E.actors.some(a => a.id === d.id) && (!ids.length || ids.includes(d.id)) && gOk(d));
        for (const d of others.sort(() => Math.random() - .5)){ if (team.length + guestIds.length >= want) break; guestIds.push(d.id); }
      }
      const guests = await Promise.all(guestIds.map(id2 => new Actor(E.defs[id2]).load().catch(() => null)));
      for (const g of guests) if (g){ E.guests.push(g); g.setVisible(false); team.push(g); }
      if (team.length < need){ for (const g of guests) if (g) removeGuest(g); E.busy = false; return false; }
      E.last.push(id); if (E.last.length > 6) E.last.shift();
      const ctx = C.makeCtx(E, act, team, guests.filter(Boolean));
      for (const a of team){ if (a.brain) a.brain.stop(); a.brain = null; a.job = id; a.drop(); }
      E.job = { id, runner: new Runner(runActivity(ctx, act)), ctx };
      return true;
    } catch (e){ console.warn('Characters:', e); E.busy = false; return false; }
  }
  function* runActivity(ctx, act){
    try { yield* act.run(ctx); }
    finally { ctx.cleanup(); }
  }
  function endActivity(){
    const j = E.job; E.job = null; E.busy = false;
    if (!j) return;
    for (const a of j.ctx.team){ a.job = null; a.drop(); a.weaponsOn(true); a.spin = 0; a.lift = 0; a.flying = false; a.hold(false); }
    for (const g of j.ctx.guests) removeGuest(g);
    for (const a of E.actors){ if (!a.surface) a.surface = 'floor'; a.y = E.surface(a.surface).y; E.startLife(a); }
    plan();
  }
  function removeGuest(g){ g.dispose(); E.guests = E.guests.filter(x => x !== g); }
  E.endActivity = endActivity;

  /* ---------- who is on stage ---------- */
  async function setCast(ids, count){
    const want = ids.slice(0, count);
    for (const a of E.actors.slice()) if (!want.includes(a.id)){ a.dispose(); E.actors = E.actors.filter(x => x !== a); }
    const fl = E.floor();
    for (const id of want){
      if (E.actors.some(a => a.id === id) || !E.defs[id]) continue;
      const a = new Actor(E.defs[id]);
      E.actors.push(a);
      try { await a.load(); } catch (e){ console.warn('Characters:', e); E.actors = E.actors.filter(x => x !== a); continue; }
      a.place(rand(fl.x1 + E.unit, fl.x2 - E.unit), 'floor');
      // a little entrance: drop in from above with a puff
      if (!reduced){ a.y = -E.unit * 2; a.falling = true; a.vy = 0; }
      E.startLife(a);
    }
  }
  E.setCast = setCast;

  /* ---------- clicks: poke a character ---------- */
  const hitTest = (x, y) => E.actors.concat(E.guests).find(a => a.ready && a.visible && Math.abs(x - a.x) < a.w * .6 + 6 && y < a.y - a.lift - a.hover + 4 && y > a.y - a.lift - a.hover - a.h * a.sy - 6);
  E.hitTest = hitTest;
  function onDown(e){
    if (e.button > 0) return;
    if (e.target.closest && e.target.closest(host.interactive || 'a,button,input,textarea,select,label,dialog,[role=button]')) return;
    const a = hitTest(e.clientX, e.clientY);
    if (!a || a.job) return;
    if (a.brain) a.brain.stop();
    a.brain = new Runner(C.poked(a));
  }
  let px = -1, py = -1;
  const onMove = e => { px = e.clientX; py = e.clientY; };
  document.addEventListener('pointerdown', onDown);
  document.addEventListener('pointermove', onMove, { passive: true });
  E.pointer = () => ({ x: px, y: py });

  /* ---------- the loop: 30 frames a second in everyday life, 60 during an activity, nothing while the tab is hidden ---------- */
  let last = 0, raf = 0, acc = 0, frames = 0;
  function frame(now){
    raf = requestAnimationFrame(frame);
    if (E.paused) { last = now; return; }
    const step = E.busy ? 1 / 60 : 1 / 30;
    const d = Math.min(.1, (now - (last || now)) / 1000); last = now;
    acc += d; if (acc < step * .92) return;
    const dt = Math.min(acc, .1); acc = 0;
    E.dt = dt; E.time += dt;
    surfaces();
    for (const a of E.actors) if (a.brain && !a.job) a.brain.step(dt);
    if (E.job && E.job.runner.step(dt)) endActivity();
    if (!E.busy && !reduced && E.time > nextAt) startActivity();
    for (const a of E.actors.concat(E.guests)) a.update(dt);
    C.fx.update(dt);
    if (frames++ < 3) syncOutlines();
    renderer.render(scene, cam);
    if (reduced && frames > 4){ cancelAnimationFrame(raf); raf = 0; }   // reduced motion: one still picture, then stop
  }
  const onVis = () => { E.paused = document.hidden; };
  document.addEventListener('visibilitychange', onVis);
  addEventListener('resize', resize);
  resize();
  C.fx = C.makeFx(E);
  C.props = C.makeProps(E);
  plan(true);
  raf = requestAnimationFrame(frame);
  if (reduced) setTimeout(() => { if (!raf) raf = requestAnimationFrame(frame); }, 2500);   // again once the models are in

  return {
    E,
    setCast,
    play: id => startActivity(id),
    stop(){
      cancelAnimationFrame(raf); raf = 0;
      document.removeEventListener('pointerdown', onDown); document.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVis); removeEventListener('resize', resize);
      if (E.job){ E.job.runner.stop(); E.job.ctx.cleanup(); E.job = null; }
      for (const a of E.actors.concat(E.guests)) a.dispose();
      E.actors = []; E.guests = []; C.fx.clear();
      renderer.dispose(); canvas.remove(); layer.remove(); under.remove();
    },
    reflow(){ resize(); },
  };
};
})();
