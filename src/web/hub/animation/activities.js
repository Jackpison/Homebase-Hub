/* Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 *
 * Characters: what they do. Everyday life (C.life), what happens when you click one (C.poked) and the activities (C.activities).
 *
 * To add an activity: add an entry to C.activities below:
 *   id: { name: 'Shown In Settings', cast: <at least this many>, want: <ideally this many>, weight: <how often, 1 = normal>,
 *         minWidth: <smallest screen in px>, fits(actor) / guestOk(def): <optional filters>,
 *         *run(c){ ... } }   // a generator: see makeCtx for c.* helpers and engine.js for E.walkTo, E.leap, E.act...
 * Characters missing from the active cast walk in as guests and leave at the end.
 */
(function(){
'use strict';
const C = window.HubCast;
const T = window.THREE;
const { rand, pick, clamp, ease } = C.util;

/* waits for a promise inside a task */
function* awaitP(p){ let done = false, val; p.then(v => { done = true; val = v; }, () => { done = true; }); while (!done) yield; return val; }

/* ---------- the helpers every activity gets ---------- */
C.makeCtx = function(E, act, team, guests){
  const fx = C.fx, P = C.props;
  const owned = [], handles = [], tints = [];
  const c = {
    E, fx, P, team, guests, u: E.unit, W: E.W, H: E.H,
    a: team[0], b: team[1], d: team[3], third: team[2],
    floor: () => E.floor().y,
    keep(o){ owned.push(o); return o; },
    fxh(h){ handles.push(h); return h; },
    await: awaitP,
    isGuest: a => guests.includes(a),
    /* a free stretch of floor, w unit-widths wide; returns its centre x */
    spot(w){ const half = Math.min(E.W * .45, w * E.unit / 2), f = E.floor(); return rand(f.x1 + half + 8, Math.max(f.x1 + half + 9, f.x2 - half - 8)); },
    /* walk without staying on the screen (guests come in from the side) */
    *move(a, x, o){
      o = o || {};
      const sp = E.unit * (o.run ? a.fam.run : a.fam.walk) * (o.speed || 1);
      a.play(o.run ? 'run' : 'walk', { speed: o.run ? 1.15 : 1 });
      let dust = 0;
      while (Math.abs(x - a.x) > 1){
        const dir = Math.sign(x - a.x); a.faceTo(dir);
        a.x += dir * Math.min(Math.abs(x - a.x), sp * E.dt);
        if (o.run && !a.hover && (dust -= E.dt) <= 0){ dust = .16; fx.puff(a.x - dir * a.w * .3, a.y, a.w * .5, dir); }
        yield;
      }
      if (!o.keep){ a.play('idle'); a.faceTo(o.face ?? 0); }
    },
    /* bring a character to x on the floor: a guest runs in from the nearest side, an actor runs (or leaps down) there */
    *come(a, x, o){
      o = o || {};
      if (c.isGuest(a) && !a.visible){
        const fromLeft = o.from ? o.from < 0 : x < E.W / 2;
        a.surface = 'floor'; a.x = fromLeft ? -E.unit * 1.2 : E.W + E.unit * 1.2; a.y = E.floor().y; a.setVisible(true);
        yield* c.move(a, x, { run: true, face: o.face ?? 0 });
      } else if (a.surface !== 'floor'){
        yield* E.leap(a, x, 'floor', { face: o.face ?? 0 });
      } else yield* c.move(a, x, { run: true, face: o.face ?? 0 });
    },
    *leave(a){
      if (!c.isGuest(a)) return;
      const right = a.x > E.W / 2;
      yield* c.move(a, right ? E.W + E.unit * 1.5 : -E.unit * 1.5, { run: true });
      a.setVisible(false);
    },
    *leaveAll(){ yield* E.all(...guests.map(g => c.leave(g))); },
    /* a prop from the packs, placed on the floor at x and popped in */
    *prop(name, px, x, z, o){
      const g = yield* awaitP(P.get(name, px, o)); if (!g) return null;
      const placed = c.keep(P.place(g, x, (o && o.y) ?? E.floor().y, z ?? -40));
      placed.scale.setScalar(.001); yield* P.pop(placed, .35);
      return placed;
    },
    /* a shape built in props.js, placed and popped in */
    *build(obj, x, z, o){
      const placed = c.keep(P.place(obj, x, (o && o.y) ?? E.floor().y, z ?? -40));
      if (o && o.noPop) return placed;
      placed.scale.setScalar(.001); yield* P.pop(placed, .4);
      return placed;
    },
    *clear(){ const list = owned.filter(o => o.userData && o.userData.prop); yield* E.all(...list.map(o => P.vanish(o, .3))); },
    face: (a, b) => { a.faceTo(b.x > a.x ? 1 : -1); },
    word: (t, x, y, o) => fx.word(t, x, y, o),
    say: (a, t, s) => fx.say(a, t, s),
    /* everyone in the list cheers once */
    *cheer(list, conf){
      for (const a of list){ a.faceTo(0); a.play('happy', { once: true, restart: true }); }
      if (conf) fx.confetti(conf.x, conf.y, 50);
      yield 1.2;
      for (const a of list) a.play('idle');
    },
    /* warm or cool every material of a character a little (sauna red, ice blue); undone at the end */
    tint(a, color, amount){
      a.model.traverse(o => { if (o.isMesh && !o.userData.outline && o.material.emissive){ tints.push([o.material, o.material.emissive.clone()]); o.material.emissive.lerp(new T.Color(color), amount); } });
    },
    cleanup(){
      for (const o of owned) P.remove(o);
      for (const h of handles) h.stop && h.stop();
      for (const [m, e] of tints) m.emissive.copy(e);
      for (const a of team){ a.lift = 0; a.lean = 0; a.spin = 0; a.z = 0; a.flying = false; a.sx = a.sy = 1; a.root.rotation.z = 0; a.drop(); a.weaponsOn(true); if (!a.visible && !c.isGuest(a)) a.setVisible(true); }
    },
  };
  return c;
};

/* ======================================================================
   EVERYDAY LIFE: what a character does when there is no activity
   ====================================================================== */
const L = C.life;
const E = () => C.E;
/* stroll somewhere on the surface it is on */
L.stroll = { w: 30, *run(a){ const s = E().surface(a.surface || 'floor'); yield* E().walkTo(a, rand(s.x1 + a.w, s.x2 - a.w), { face: pick([0, 0, -1, 1]) }); yield rand(1.5, 4); } };
/* look around (and at your mouse if it is near) */
L.look = { w: 14, *run(a){
  a.play('idle');
  for (let i = 0; i < 4; i++){
    const p = E().pointer();
    if (p.x >= 0 && Math.hypot(p.x - a.x, p.y - a.y) < 220) a.look(p.x); else a.faceTo(pick([-1, 0, 1, 0]));
    yield rand(.8, 1.8);
  }
  a.faceTo(0);
} };
/* climb onto the clock (or another ledge) and sit there for a while */
L.perch = { w: 16, ok: a => E().surfaces().length > 1, *run(a){
  const ledges = E().surfaces().filter(s => s.id !== 'floor' && s.id !== a.surface && !C.E.actors.some(o => o !== a && o.surface === s.id));
  if (!ledges.length) return;
  const s = pick(ledges);
  yield* E().goTo(a, rand(s.x1 + a.w, s.x2 - a.w), s.id, { face: 0 });
  a.play('sit', { fade: .3 }); if (s.id === 'clock') C.fx.say(a, pick(['Nice view!', '♪', 'What time is it?', '…']), 1.6);
  for (let t = rand(10, 22); t > 0; t -= 1){ if (Math.random() < .12) a.faceTo(pick([-1, 0, 1])); yield 1; }
  a.play('idle');
  if (Math.random() < .6) yield* E().leap(a, rand(E().floor().x1 + a.w, E().floor().x2 - a.w), 'floor');
} };
/* a nap: sits down, z z z */
L.nap = { w: 8, *run(a){
  a.play('sit', { fade: .4 }); a.faceTo(0);
  yield 1;
  for (let t = rand(8, 16); t > 0; t -= .9){ const p = a.top(); C.fx.zz(p.x + a.w * .3, p.y + a.h * .1); a.squash(1.03, .97, .8); yield .9; }
  a.play('happy', { once: true, restart: true }); C.fx.say(a, pick(['Yawn~', 'Mmh…']), 1.2); yield 1.2;
} };
/* go and say hello to another character */
L.greet = { w: 10, ok: a => C.E.actors.filter(o => o !== a && !o.job).length > 0, *run(a){
  const b = pick(C.E.actors.filter(o => o !== a && !o.job));
  if (b.surface !== a.surface) yield* E().goTo(a, b.x + (b.x > E().W / 2 ? -1 : 1) * E().unit * 1.1, b.surface || 'floor');
  else yield* E().walkTo(a, b.x + (a.x < b.x ? -1 : 1) * E().unit * 1.1);
  if (b.job || Math.abs(a.x - b.x) > E().unit * 2) return;
  a.faceTo(b.x > a.x ? 1 : -1);
  a.play('wave', { once: true, restart: true }); C.fx.say(a, pick(['Hi!', 'Hey!', 'Yo!', 'Hello!']), 1.3);
  yield .5;
  if (!b.job){ b.faceTo(a.x > b.x ? 1 : -1); b.play('wave', { once: true, restart: true }); }
  yield .6; const m = a.top(); C.fx.hearts((a.x + b.x) / 2, m.y, 2);
  yield 1.2; a.play('idle'); a.faceTo(0); if (!b.job){ b.play('idle'); }
} };
/* a happy hop with sparkles */
L.hop = { w: 7, *run(a){
  a.faceTo(0); a.squash(1.15, .8, .15); yield .12;
  yield* E().tween(.5, k => { a.lift = Math.sin(k * Math.PI) * E().unit * .6; a.spin = k * Math.PI * 2; }, x => x);
  a.lift = 0; a.spin = 0; a.squash(1.2, .78, .3); const t = a.top(); C.fx.sparkle(a.x, t.y, 10);
  a.play('happy', { once: true, restart: true }); yield 1.2; a.play('idle');
} };
/* a snack: something tasty appears, it eats it */
L.snack = { w: 7, *run(a){
  const food = pick(['apple', 'donut', 'cupcake', 'icecream', 'burger', 'soda']);
  const g = yield* awaitP(C.props.get(food, E().unit * .32, { center: true }));
  if (!g) return;
  a.faceTo(0); a.grab(g); g.scale.setScalar(.01);
  yield* E().tween(.3, k => g.scale.setScalar(Math.max(.01, ease.back(k))));
  for (let i = 0; i < 3; i++){ yield* E().act(a, 'eat'); const h = a.hand(); C.fx.burst('rect', h.x, h.y, 4, { speed: 60, g: 300, life: .5, size: 4, color: ['#f6d7a7', '#e9b97a'] }); }
  g.parent && g.parent.remove(g);
  const t = a.top(); C.fx.hearts(a.x, t.y, 2); C.fx.say(a, pick(['Yum!', 'Tasty!', 'Mmm!']), 1.2);
  a.play('happy', { once: true, restart: true }); yield 1.2; a.play('idle');
} };
/* walk to the edge of the screen, peek out, come back */
L.peek = { w: 5, ok: a => a.surface === 'floor', *run(a){
  const left = a.x < E().W / 2, f = E().floor();
  yield* E().walkTo(a, left ? f.x1 + a.w * .5 : f.x2 - a.w * .5, { keep: true });
  a.faceTo(left ? -1 : 1); a.play('idle'); yield* E().tween(.6, k => { a.x = (left ? f.x1 + a.w * .5 : f.x2 - a.w * .5) + (left ? -1 : 1) * a.w * .55 * k; });
  yield rand(1, 2.4);
  a.faceTo(left ? 1 : -1); C.fx.say(a, '!', .8); a.squash(.9, 1.15, .2); yield .5;
  yield* E().walkTo(a, a.x + (left ? 1 : -1) * E().unit * 2.5, { run: true });
} };
/* dance on its own (only those with a dance) */
L.dance = { w: 4, ok: a => a.can('dance'), *run(a){ a.faceTo(0); a.play('dance'); for (let i = 0; i < 6; i++){ const t = a.top(); C.fx.notes(a.x, t.y, 1); yield .8; } a.play('idle'); } };
/* a big stretch and a yawn */
L.stretch = { w: 5, *run(a){ a.faceTo(0); yield* E().act(a, 'crouch'); a.squash(.92, 1.12, .5); a.play('happy', { once: true, restart: true }); C.fx.say(a, pick(['Ahh~', 'Stretch!']), 1.1); yield 1.3; a.play('idle'); } };
/* the shark swims laps with bubbles */
L.swim = { w: 20, ok: a => !!a.fam.swim, *run(a){ const f = E().floor(); a.play('walk'); const to = rand(f.x1 + a.w, f.x2 - a.w);
  while (Math.abs(to - a.x) > 2){ const d = Math.sign(to - a.x); a.faceTo(d); a.x += d * E().unit * 1.1 * E().dt; if (Math.random() < E().dt * 4) C.fx.bubbles(a.x - d * a.w * .3, a.y - a.hover - a.h * .5); yield; }
  a.faceTo(0); a.play('idle'); yield rand(1, 3); } };
for (const k of ['perch', 'nap', 'peek', 'stretch']) { const ok = L[k].ok; L[k].ok = a => !a.fam.swim && (!ok || ok(a)); }

/* ---------- clicking a character ---------- */
C.poked = function*(a){
  const now = C.E.time;
  a.pokes = (a.pokeAt && now - a.pokeAt < 6) ? a.pokes + 1 : 1; a.pokeAt = now;
  const t = a.top();
  a.faceTo(0);
  if (a.pokes >= 4){
    C.fx.anger(t.x + a.w * .3, t.y); C.fx.say(a, pick(['Hey!', 'Stop it!', 'Hmph!']), 1.4);
    a.play('sad', { once: true, restart: true }); a.squash(1.1, .9, .3); yield 1.4; a.pokes = 0;
  } else {
    const r = Math.random();
    if (r < .4){ a.squash(1.2, .78, .12); yield .1; yield* E().tween(.45, k => { a.lift = Math.sin(k * Math.PI) * E().unit * .55; }, x => x); a.lift = 0; a.squash(1.2, .8, .3); C.fx.sparkle(a.x, t.y, 12); C.fx.say(a, pick(['!', 'Hi!', 'Wow!']), 1); a.play('happy', { once: true, restart: true }); yield 1.1; }
    else if (r < .7){ yield* E().tween(.6, k => { a.spin = ease.inOut(k) * Math.PI * 2; }); a.spin = 0; C.fx.burst('star', t.x, t.y, 6, { speed: 70, life: .9, size: 12, color: '#ffe27a' }); yield .4; }
    else { C.fx.hearts(a.x, t.y, 3); a.play('wave', { once: true, restart: true }); C.fx.say(a, pick(['Hehe!', '♥', 'Hello!']), 1.2); yield 1.3; }
  }
  a.play('idle');
  C.E.startLife(a);
};

/* ======================================================================
   ACTIVITIES
   ====================================================================== */
const A = C.activities = C.activities || {};
const U = () => C.E.unit;

/* ---------- Boxing Match ---------- */
A.boxing = { name: 'Boxing Match', cast: 2, want: 2, minWidth: 360, fits: a => !a.fam.swim && !a.fam.hover, guestOk: d => d.family !== 'swimmers' && d.family !== 'flyers',
  *run(c){
    const u = U(), x = c.spot(5.2), { a, b, fx } = c, fy = c.floor();
    const ring = yield* c.build(c.P.ring(u * 4.4, u * 1.25), x, -90);
    yield* E().all(c.come(a, x - u * 1.1, { face: 1 }), c.come(b, x + u * 1.1, { face: -1 }));
    a.lift = b.lift = u * .09; a.weaponsOn(false); b.weaponsOn(false); c.face(a, b); c.face(b, a);
    c.word('ROUND 1', x, fy - u * 2.6, { big: true, color: '#ffd84d' }); c.say(a, 'Ding!', .8); yield 1.1;
    c.word('FIGHT!', x, fy - u * 2.2, { big: true, color: '#ff5c4d' }); fx.lines(x, fy - u * .8, { ms: 500 });
    a.play('idle'); b.play('idle'); yield .7;
    const ropes = ring.children[0].userData.ropes || [];
    for (let round = 0; round < 5; round++){
      const [atk, def] = Math.random() < .5 ? [a, b] : [b, a];
      const dir = def.x > atk.x ? 1 : -1;
      yield* E().tween(.18, k => { atk.x += dir * u * .9 * E().dt; });
      const verb = pick(['punch', 'punch2', 'kick']);
      const d = atk.play(verb, { once: true, restart: true, speed: 1.25 });
      yield d * .42;
      const hp = def.mid();
      fx.impact(hp.x - dir * def.w * .3, hp.y, verb === 'kick' ? 1 : 0, '#ffcf5a');
      if (round % 2 === 0) c.word(pick(['POW!', 'BAM!', 'WHAM!', 'SMACK!']), hp.x, hp.y - u * .9, { color: '#fff36b' });
      def.play('hit', { once: true, restart: true }); fx.sweat(hp.x, hp.y - def.h * .3, dir);
      yield* E().tween(.25, k => { def.x += dir * u * 1.3 * E().dt * (1 - k); });
      for (const r of ropes) r.position.y += (Math.random() - .5) * 2;
      yield d * .4;
      atk.play('idle'); def.play('idle');
      atk.x = clamp(atk.x, x - u * 1.8, x + u * 1.8); def.x = clamp(def.x, x - u * 1.8, x + u * 1.8);
      yield .35;
    }
    /* the finisher */
    const [w, l] = Math.random() < .5 ? [a, b] : [b, a], dir = l.x > w.x ? 1 : -1;
    const aura = c.fxh(fx.aura(w, { color: '#ff5a3c', core: '#fff1a8' }));
    c.say(w, '!!', .9); w.play('crouch', { once: true, restart: true }); w.squash(1.1, .88, .4); fx.shake(3, .7); yield 1;
    yield* E().tween(.15, k => { w.x += dir * u * 5 * E().dt; });
    w.play('kick', { once: true, restart: true, speed: 1.3 }); yield .2;
    const lp = l.mid();
    fx.impact(lp.x, lp.y, 2, '#ff8a3c'); fx.lines(lp.x, lp.y, { ms: 700 }); c.word('K.O.!', x, fy - u * 2.4, { big: true, color: '#ff4d4d', ms: 1800 });
    aura.end();
    l.play('ko', { once: true, restart: true });
    yield* E().tween(.5, k => { l.x += dir * u * 3 * E().dt * (1 - k); });
    for (let i = 0; i < 16; i++){ const t = l.feet(); const ang = i * .8; fx.p('star', { x: t.x + Math.cos(ang) * u * .4, y: t.y - u * .45 + Math.sin(ang) * u * .12, life: .25, size: 12, color: '#ffe27a' }); yield .12; }
    yield* c.cheer([w], { x: w.x, y: fy - u * 1.6 });
    const trophy = yield* c.prop('trophy', u * .6, w.x + (w.x < x ? -u * .7 : u * .7), 80);
    if (trophy) fx.sparkle(trophy.position.x, fy - u * .6, 12);
    l.play('idle', { fade: .5 }); yield .8;
    c.face(l, w); c.face(w, l); l.play('wave', { once: true, restart: true }); w.play('wave', { once: true, restart: true }); fx.hearts((w.x + l.x) / 2, fy - u * 1.3, 3); yield 1.5;
    a.lift = b.lift = 0; yield* c.clear(); yield* c.leaveAll();
  } };

/* ---------- Basketball ---------- */
A.basketball = { name: 'Basketball', cast: 1, want: 2, minWidth: 340, fits: a => !a.fam.swim, guestOk: d => d.family !== 'swimmers',
  *run(c){
    const u = U(), fy = c.floor(), side = Math.random() < .5 ? -1 : 1, x = c.spot(5.5), hx = x + side * u * 1.9, { a, b, fx } = c;
    const hoop = yield* c.build(c.P.hoop(u * 2.7), hx, -60);
    const rim = hoop.children[0].userData.rim, rimY = fy - rim.y - 4, rimX = hx + side * -0, rimZ = 400;
    const ball = c.keep(c.P.ball('basket', u * .3)); ball.userData.ball.position.y = 0; C.E.scene.add(ball);
    const shooterX = x - side * u * .8;
    yield* E().all(c.come(a, shooterX, { face: side }), b ? c.come(b, x + side * u * .6, { face: -side }) : null);
    a.weaponsOn(false); if (b) b.weaponsOn(false);
    let bx = a.x, by = fy - u * .4, dribble = 0;
    const holdBall = () => { const h = a.hand(); bx = h.x + side * a.w * .2; by = fy - Math.abs(Math.sin(dribble)) * u * .55 - u * .15; dribble += C.E.dt * 7; ball.position.set(bx, -by, 420); ball.rotation.z -= C.E.dt * 6; };
    const shoot = function*(make, dunk){
      a.faceTo(side);
      if (dunk){ yield* c.move(a, hx - side * u * 1.4, { run: true, keep: true }); fx.whoosh(a); }
      a.squash(1.15, .82, .15); yield .12;
      a.play('jump', { once: true, restart: true }); fx.dust(a.x, fy, a.w);
      const x0 = bx, y0 = fy - a.h * 1.1, tx = rimX + (make ? 0 : side * rim.r * 1.4), ty = rimY - (make ? 2 : 0);
      const dur = dunk ? .5 : .9, peak = dunk ? u * .3 : u * 1.6, ax0 = a.x;
      yield* E().tween(dur, k => {
        if (dunk) a.x = ax0 + (hx - side * u * .2 - ax0) * k;
        a.lift = Math.sin(Math.min(1, k * 1.4) * Math.PI) * u * (dunk ? 1.6 : .5);
        const bk = dunk ? k : clamp((k - .2) / .8, 0, 1);
        if (bk <= 0) { const h = a.hand(); ball.position.set(h.x, -(h.y - u * .1), 420); return; }
        ball.position.set(x0 + (tx - x0) * bk, -(y0 + (ty - y0) * bk - peak * 4 * bk * (1 - bk)), 420); ball.rotation.z -= .3;
      }, x => x);
      if (make){
        fx.p('ring', { x: rimX, y: rimY, life: .4, size: 30, size2: 90, color: '#ffd84d' });
        const net = hoop.children[0].userData.net;
        yield* E().tween(.35, k => { net.scale.y = 1 + Math.sin(k * Math.PI) * .45; ball.position.y = -(rimY + k * u * .9); });
        if (dunk){ fx.impact(rimX, rimY, 2, '#ffb347'); fx.lines(rimX, rimY, { ms: 800 }); c.word('SLAM DUNK!', rimX - side * u, rimY - u * .8, { big: true, color: '#ff8a3c', ms: 1800 }); }
        else { c.word(pick(['SWISH!', 'NICE!', '+2']), rimX, rimY - u * .6, { color: '#ffd84d' }); fx.sparkle(rimX, rimY, 10); }
      } else {
        fx.impact(tx, ty, 0, '#ffffff'); c.word('CLANG!', tx, ty - u * .5, { color: '#cfd8e3' });
        const sx = tx, sy = ty;
        yield* E().tween(.7, k => { ball.position.set(sx + side * u * 1.6 * k, -(sy + (fy - u * .15 - sy) * k - u * 1.2 * 4 * k * (1 - k)), 420); ball.rotation.z += .2; });
        a.play('sad', { once: true, restart: true }); yield .4;
      }
      // the ball drops and rolls back
      const lx = ball.position.x, ly = -ball.position.y;
      yield* E().tween(.45, k => { ball.position.set(lx, -(ly + (fy - u * .15 - ly) * ease.out(k)), 420); });
      a.lift = 0; a.squash(1.2, .8, .3); fx.dust(a.x, fy, a.w);
      yield .3;
      if (dunk) a.x = hx - side * u * .2;
      yield* E().tween(.6, k => { ball.position.x = lx + (a.x - lx) * k; ball.rotation.z += .15; });
    };
    for (let i = 0; i < 3; i++){
      for (let t = 0; t < 1.6; t += C.E.dt){ holdBall(); if (b){ b.faceTo(-side); } yield; }
      const make = i !== 1;
      if (b && i === 1){ b.play('jump', { once: true, restart: true }); c.say(b, 'Block!', 1); }
      yield* shoot(make, false);
      if (make) yield* E().act(a, 'happy'); else if (b) { b.play('happy', { once: true, restart: true }); fx.sparkle(b.x, b.top().y, 8); }
      a.play('idle');
    }
    for (let t = 0; t < 1.2; t += C.E.dt){ holdBall(); yield; }
    yield* shoot(true, true);
    yield* c.cheer(b ? [a, b] : [a], { x: hx, y: fy - u * 2 });
    C.E.scene.remove(ball);
    yield* c.clear(); yield* c.leaveAll();
  } };

/* ---------- Marathon ---------- */
A.marathon = { name: 'Marathon', cast: 1, want: 3, minWidth: 420, fits: a => !a.fam.swim,
  *run(c){
    const u = U(), fy = c.floor(), W = c.W, dir = Math.random() < .5 ? 1 : -1, { fx } = c;
    const startX = dir > 0 ? u * 1.2 : W - u * 1.2, finishX = dir > 0 ? W - u * 1.6 : u * 1.6;
    const fin = yield* c.build(c.P.finish(u * 2.1, u * 1.6), finishX, -40);
    const runners = c.team;
    yield* E().all(...runners.map((r, i) => c.come(r, startX + dir * i * u * .75, { face: dir, from: -dir })));
    for (const r of runners) r.weaponsOn(false);
    c.word('READY…', W / 2, fy - u * 3, { color: '#ffffff' }); yield 1;
    c.word('SET…', W / 2, fy - u * 3, { color: '#ffd84d' }); for (const r of runners) r.play('crouch', { once: true, restart: true }); yield 1;
    c.word('GO!', W / 2, fy - u * 3, { big: true, color: '#7dff8a' }); fx.flash('rgba(255,255,255,.25)', 120);
    const sp = runners.map(() => rand(.85, 1.05)), ph = runners.map(() => rand(0, 6));
    for (const r of runners){ r.faceTo(dir); r.play('run', { speed: 1.25 }); }
    let winner = null, t = 0, dusts = runners.map(() => 0);
    while (runners.some(r => (finishX - r.x) * dir > 0)){
      t += C.E.dt;
      runners.forEach((r, i) => {
        if ((finishX - r.x) * dir <= 0) return;
        const v = u * 4.2 * (sp[i] + Math.sin(t * 1.3 + ph[i]) * .14);
        r.x += dir * v * C.E.dt;
        if ((dusts[i] -= C.E.dt) <= 0){ dusts[i] = .1; fx.puff(r.x - dir * r.w * .3, fy, r.w * .6, dir); }
        if (Math.random() < C.E.dt * 3) fx.sweat(r.x, r.top().y + r.h * .2, -dir);
        if (Math.random() < C.E.dt * 14) fx.p('streak', { x: r.x - dir * r.w * (1 + Math.random()), y: r.top().y + Math.random() * r.h, vx: -dir * 300, life: .25, size: 46, size2: 12, rot: 0, color: '#ffffff', alpha: .55 });
        if (!winner && (finishX - r.x) * dir <= 0){
          winner = r;
          const tapes = fin.children[0].userData.tapes;
          fx.impact(finishX, fy - u * .75, 1, '#ff5c7a'); c.word('WINNER!', finishX - dir * u * 1.5, fy - u * 2.5, { big: true, color: '#ffd84d', ms: 1800 });
          fx.confetti(finishX, fy - u * 1.4, 60);
          C.E.job.ctx.tapeT = 0; tapes.forEach((tp, k) => { tp.userData.fall = k ? -1 : 1; });
        }
      });
      const tapes = fin.children[0].userData.tapes;
      if (winner) tapes.forEach(tp => { tp.rotation.z += (tp.userData.fall * 1.3 - tp.rotation.z) * Math.min(1, C.E.dt * 6); });
      yield;
    }
    for (const r of runners){ r.play('idle'); r.faceTo(0); fx.sweat(r.x, r.top().y, 1); fx.sweat(r.x, r.top().y, -1); }
    yield .5;
    yield* E().all(...runners.filter(r => r !== winner).map(r => E().act(r, 'sad')));
    yield* c.cheer([winner]);
    winner.lift = 0;
    yield* c.clear(); yield* c.leaveAll();
  } };

/* ---------- Pool Day ---------- */
A.swim = { name: 'Pool Day', cast: 1, want: 2, minWidth: 380, fits: a => !a.fam.hover || a.fam.swim,
  *run(c){
    const u = U(), fy = c.floor(), x = c.spot(6), pw = u * 4.4, ph = u * .8, { fx } = c;
    const pool = yield* c.build(c.P.pool(pw, ph * 1.2), x, -110);
    const inner = pool.children[0], waterY = fy - inner.userData.water;
    let tick = 0; const tickPool = () => { tick += C.E.dt; inner.userData.tick(tick); };
    const swimmers = c.team.slice(0, 2);
    yield* E().all(...swimmers.map((s, i) => c.come(s, x + (i ? 1 : -1) * (pw / 2 + u * .7), { face: i ? -1 : 1 })));
    // jump in
    for (const [i, s] of swimmers.entries()){
      s.weaponsOn(false);
      const x0 = s.x, tx = x + (i ? .8 : -.8) * u;
      s.play('jump', { once: true, restart: true }); s.squash(1.15, .82, .15);
      yield* E().tween(.6, k => { tickPool(); s.x = x0 + (tx - x0) * k; s.lift = Math.sin(k * Math.PI) * u * 1.2 - k * (fy - waterY + s.h * .4) * (k > .7 ? 1 : 0); }, z => z);
      s.z = -110; s.lift = -(s.h * .45) + (fy - waterY); fx.splash(s.x, waterY, 16); c.word('SPLASH!', s.x, waterY - u * 1.1, { color: '#8fd8ff' });
    }
    // laps: a little race
    const lane = [-.12, .12].map(v => v * u);
    for (const s of swimmers){ s.play(s.fam.swim ? 'walk' : 'run', { speed: .8 }); s.lean = 0; }
    const ends = [x - pw / 2 + u * .55, x + pw / 2 - u * .55];
    const goal = swimmers.map((s, i) => ends[i % 2 ? 0 : 1]);
    let laps = swimmers.map(() => 0), t = 0;
    while (laps.some(l => l < 2) && t < 14){
      t += C.E.dt; tickPool();
      swimmers.forEach((s, i) => {
        if (laps[i] >= 2) return;
        const d = Math.sign(goal[i] - s.x); s.faceTo(d); s.lean = s.fam.swim ? 0 : -d * 1.15;
        s.x += d * u * 1.5 * (i ? 1.05 : 1) * C.E.dt;
        s.lift = (fy - waterY) - s.h * (s.fam.swim ? .3 : .25) + Math.sin(t * 8 + i) * 2 + lane[i] * 0;
        if (Math.random() < C.E.dt * 7) fx.splash(s.x + d * s.w * .2, waterY, 3);
        if (Math.random() < C.E.dt * 3) fx.bubbles(s.x - d * s.w * .4, waterY + 4);
        if (Math.abs(goal[i] - s.x) < 3){ laps[i]++; goal[i] = goal[i] === ends[0] ? ends[1] : ends[0]; }
      });
      yield;
    }
    for (const s of swimmers){ s.lean = 0; s.faceTo(0); s.play('happy', { once: true, restart: true }); fx.splash(s.x, waterY, 10); }
    c.word(pick(['REFRESHING!', 'SO COOL!']), x, waterY - u * 1.6, { big: true, color: '#8fd8ff' });
    for (let i = 0; i < 30; i++){ tickPool(); yield; }
    // out of the pool, shake off like a dog
    for (const [i, s] of swimmers.entries()){
      const x0 = s.x, tx = x + (i ? 1 : -1) * (pw / 2 + u * .8), l0 = s.lift;
      s.play('jump', { once: true, restart: true });
      yield* E().tween(.55, k => { tickPool(); s.x = x0 + (tx - x0) * k; s.lift = l0 * (1 - k) + Math.sin(k * Math.PI) * u * 1.4; });
      s.lift = 0; s.z = 0; s.squash(1.2, .8, .3);
      yield* E().tween(.6, k => { tickPool(); s.spin = Math.sin(k * Math.PI * 6) * .5; if (Math.random() < .5) fx.p('drop', { x: s.x, y: s.mid().y, vx: (Math.random() - .5) * 300, vy: -100 - Math.random() * 100, g: 600, life: .6, size: 8, color: '#bfe8ff' }); });
      s.spin = 0;
    }
    yield* c.cheer(swimmers);
    yield* c.clear(); yield* c.leaveAll();
  } };

/* ---------- Sauna ---------- */
A.sauna = { name: 'Sauna', cast: 1, want: 2, minWidth: 340, fits: a => !a.fam.swim && !a.fam.hover,
  *run(c){
    const u = U(), fy = c.floor(), x = c.spot(4.5), { fx } = c, sw = u * 3.6;
    const room = yield* c.build(c.P.sauna(sw, u * 1.9), x, -60);
    const seat = room.children[0].userData.seat * Math.cos(.26) + room.children[0].userData.seatZ * -Math.sin(.26);   // the top bench on screen
    const warm = c.fxh(fx.light(x, fy - u * 1.2, '#ff9a4d', 0, u * 8));
    const sitters = c.team.slice(0, 2);
    yield* E().all(...sitters.map((s, i) => c.come(s, x - u * 1.1 + i * u * 1.05, { face: 0 })));
    for (const s of sitters){ s.weaponsOn(false); s.squash(1.1, .9, .2); s.z = -60; s.lift = seat; s.play('sit', { fade: .3 }); }
    const info = room.children[0].userData, stoveX = x + info.stove.x, stoveY = fy - info.stove.y;
    let heat = 0;
    for (let t = 0; t < 9; t += C.E.dt){
      heat = Math.min(1, heat + C.E.dt * .2); warm.set(heat * 1.4 + Math.sin(t * 7) * .1);
      if (Math.random() < C.E.dt * 8) fx.steam(x, fy - u * .7, sw * .9);
      for (const s of sitters) if (Math.random() < C.E.dt * 1.2 * heat) fx.sweat(s.x + (Math.random() - .5) * s.w * .6, s.top().y + s.h * .2, Math.random() < .5 ? 1 : -1);
      if (t > 2 && t - C.E.dt <= 2) for (const s of sitters){ c.tint(s, '#ff5533', .12); c.say(s, pick(['Ahh~', 'So warm…', 'Hot hot!']), 1.6); }
      if (t > 4.5 && t - C.E.dt <= 4.5){
        const s = sitters[0]; s.play('use', { once: true, restart: true }); c.say(s, 'More steam!', 1.2);
      }
      if (t > 5.2 && t - C.E.dt <= 5.2){
        fx.splash(stoveX, stoveY, 8); c.word('TSSSS!', stoveX, stoveY - u, { color: '#ffffff' });
        for (let i = 0; i < 26; i++) fx.steam(stoveX, stoveY, u * .6);
        info.stones.children.forEach(st => { st.material = st.material.clone(); st.material.emissive = new T.Color('#ff6a1f'); });
        fx.shake(2, .4);
        sitters[0].play('sit');
      }
      yield;
    }
    // too hot: run out, roll in the snow
    for (const s of sitters){ s.lift = 0; s.z = 0; s.play('happy', { once: true, restart: true }); }
    c.word('TOO HOT!', x, fy - u * 2.4, { big: true, color: '#ff7a3c' }); yield .8;
    const out = x + (x < c.W / 2 ? 1 : -1) * u * 3.3;
    yield* E().all(...sitters.map((s, i) => c.move(s, out + i * u * .7, { run: true })));
    for (let i = 0; i < 60; i++) fx.snow(c.W);
    for (const s of sitters){ c.tint(s, '#66aaff', .16); c.say(s, 'Brrr!', 1.2); s.play('hit', { once: true, restart: true }); }
    yield* E().tween(1.2, k => { for (const s of sitters) s.x += Math.sin(k * 60) * .8; });
    warm.stop();
    yield* c.cheer(sitters);
    yield* c.clear(); yield* c.leaveAll();
  } };

/* ---------- Dance Party ---------- */
A.dance = { name: 'Dance Party', cast: 2, want: 4, minWidth: 360,
  *run(c){
    const u = U(), fy = c.floor(), x = c.spot(5), { fx } = c, dancers = c.team;
    const disco = c.keep(c.P.disco(u * .7)); disco.position.set(x, 300, 300); C.E.scene.add(disco); disco.userData.prop = true;
    const dy = fy - u * 3.4;
    yield* E().tween(.9, k => { disco.position.y = -(dy * ease.back(k)) + (1 - k) * 200; });
    const spots = ['#ff4fd8', '#4fd2ff', '#ffe14f', '#7dff8a'].map((col, i) => { const s = c.keep(c.P.spot(u * 3.6, u * 1.2, col)); s.position.set(x + (i - 1.5) * u * .5, -dy, 260); s.userData.prop = true; C.E.scene.add(s); return s; });
    const lights = ['#ff4fd8', '#4fd2ff'].map(col => c.fxh(fx.light(x, fy - u, col, 1.4, u * 6)));
    const speaker = yield* c.prop('speaker', u * .9, x + u * 2.2, -30);
    yield* E().all(...dancers.map((d, i) => c.come(d, x + (i - (dancers.length - 1) / 2) * u * 1.05, { face: 0 })));
    c.word("LET'S DANCE!", x, fy - u * 2.2, { big: true, color: '#ff7ce6' });
    const beat = .5; let t = 0, n = 0;
    while (t < 12){
      t += C.E.dt;
      disco.rotation.y += C.E.dt * 1.5;
      spots.forEach((s, i) => { s.rotation.z = Math.sin(t * 1.7 + i * 1.3) * .6; });
      lights.forEach((l, i) => l.move(x + Math.sin(t * 2 + i * 3) * u * 2, fy - u * (1 + Math.cos(t * 3 + i) * .3)));
      if (Math.random() < C.E.dt * 10) fx.p('spark', { x: x + (Math.random() - .5) * u * 4, y: dy + (Math.random() - .2) * u * 2.5, life: .3, size: 14, size2: 2, color: pick(['#ff4fd8', '#4fd2ff', '#ffffff', '#ffe14f']) });
      if (t > n * beat){
        n++;
        if (speaker) { fx.notes(x + u * 2.2, fy - u * 1.1, 1); speaker.scale.setScalar(1.06); }
        dancers.forEach((d, i) => {
          if (n % 8 === i % 8 || n === 1){
            if (d.can('dance')) d.play('dance');
            else { const mv = pick(['happy', 'wave', 'jump']); d.play(mv, { once: true, restart: true }); }
          }
          if (n % 4 === 0) d.squash(1.08, .92, .25);
          if (n % 16 === (i * 4) % 16 && !d.can('dance')){ C.E.job.ctx.spinFor = d; }
        });
      } else if (speaker) speaker.scale.setScalar(1 + (speaker.scale.x - 1) * .9);
      for (const d of dancers) if (C.E.job.ctx.spinFor === d){ d.spin += C.E.dt * 10; if (d.spin > Math.PI * 2){ d.spin = 0; C.E.job.ctx.spinFor = null; } }
      yield;
    }
    for (const d of dancers){ d.spin = 0; }
    fx.confetti(x, fy - u * 2, 70); c.word('PARTY!', x, fy - u * 2.6, { big: true, color: '#ffe14f' });
    yield* E().all(...dancers.map(d => E().tween(.5, k => { d.lift = Math.sin(k * Math.PI) * u * .7; }, z => z)));
    for (const d of dancers){ d.lift = 0; d.squash(1.2, .8, .3); fx.dust(d.x, fy, d.w); }
    yield* E().tween(.6, k => { disco.position.y = -dy + k * (dy + 200); });
    yield* c.clear(); yield* c.leaveAll();
  } };

/* ---------- Picnic ---------- */
A.picnic = { name: 'Picnic', cast: 2, want: 2, minWidth: 340, fits: a => !a.fam.swim,
  *run(c){
    const u = U(), fy = c.floor(), x = c.spot(4.2), { a, b, fx } = c;
    yield* c.build(c.P.mat(u * 2.6, 'picnic'), x, -60);
    const foods = [];
    for (const [n, dx] of [['watermelon', -.55], ['burger', -.1], ['cupcake', .3], ['soda', .65]]){ const p = yield* c.prop(n, u * .38, x + dx * u, -30); if (p) foods.push(p); }
    yield* E().all(c.come(a, x - u * 1.25, { face: 1 }), c.come(b, x + u * 1.25, { face: -1 }));
    for (const s of [a, b]){ s.weaponsOn(false); s.play('sit', { fade: .3 }); }
    c.say(a, 'Picnic time!', 1.4); yield 1.2;
    for (let i = 0; i < 2; i++){
      for (const s of [a, b]){
        s.play('eat', { once: true, restart: true }); yield .5;
        const h = s.hand(); fx.burst('rect', h.x, h.y, 5, { speed: 70, g: 300, life: .5, size: 4, color: ['#ff6b6b', '#7dff8a', '#f6d7a7'] });
        c.say(s, pick(['Yum!', 'Mmm!', 'So good!']), 1); fx.hearts(s.x, s.top().y, 1); yield .7; s.play('sit');
      }
    }
    // a thief swoops in and takes the burger
    const burger = foods[1];
    if (burger){
      const bx = burger.position.x, thiefFromLeft = Math.random() < .5;
      const thief = c.keep(new T.Group()); thief.userData.prop = true;
      const g = yield* awaitP(C.props.get('fish', u * .5));
      if (g) thief.add(g); C.E.scene.add(thief);
      const sx = thiefFromLeft ? -u : c.W + u;
      c.say(b, '!?', 1);
      yield* E().tween(.9, k => { const xx = sx + (bx - sx) * k, yy = fy - u * 2.4 + Math.sin(k * Math.PI) * u * 1.8; thief.position.set(xx, -yy, 400); thief.rotation.z = Math.sin(k * 20) * .3; });
      burger.parent && burger.parent.remove(burger); burger.position.set(0, -u * .2, 0); thief.add(burger);
      c.word('YOINK!', bx, fy - u * 1.6, { color: '#ffd84d' }); fx.burst('soft', bx, fy - u * .4, 8, { speed: 120, life: .4, size: 14, color: '#ffffff', alpha: .6 });
      const ex = thiefFromLeft ? c.W + u * 2 : -u * 2;
      yield* E().tween(1, k => { thief.position.set(bx + (ex - bx) * k, -(fy - u * .6 - k * u * 3.2), 400); });
      for (const s of [a, b]){ s.play('sad', { once: true, restart: true }); fx.anger(s.top().x + s.w * .3, s.top().y); }
      c.say(a, 'My burger!', 1.4); yield 1.6;
      for (const s of [a, b]) s.play('idle');
      c.face(a, b); c.face(b, a); c.say(b, 'Share mine!', 1.2); yield .9;
      fx.hearts((a.x + b.x) / 2, a.top().y, 4);
    }
    yield* c.cheer([a, b]);
    yield* c.clear(); yield* c.leaveAll();
  } };

/* ---------- Sword Duel ---------- */
A.duel = { name: 'Sword Duel', cast: 2, want: 2, minWidth: 380, fits: a => !a.fam.swim && !a.fam.hover, guestOk: d => d.family !== 'swimmers' && d.family !== 'flyers',
  *run(c){
    const u = U(), fy = c.floor(), x = c.spot(5), { a, b, fx } = c;
    yield* E().all(c.come(a, x - u * 1.6, { face: 1 }), c.come(b, x + u * 1.6, { face: -1 }));
    for (const [s, n] of [[a, 'cutlass'], [b, 'sword']]){
      if (!(s.weapons && s.weapons.length)){ const g = yield* awaitP(C.props.get(n, u * .7, { h: false })); if (g){ g.rotation.x = -Math.PI / 2; s.grab(g); } }
      else s.weaponsOn(true);
    }
    c.face(a, b); c.face(b, a);
    // the stand-off: wind, leaves, silence
    const dim = c.fxh(fx.dim(.3));
    c.word('…', x, fy - u * 2.2, { color: '#ffffff', ms: 1600 });
    for (let t = 0; t < 2.2; t += C.E.dt){ if (Math.random() < C.E.dt * 12) fx.p('streak', { x: -20, y: fy - Math.random() * u * 3, vx: 700, life: 1.4, size: 50, size2: 30, rot: 0, color: '#ffffff', alpha: .35 });
      if (Math.random() < C.E.dt * 3) fx.p('heart', { x: -10, y: fy - Math.random() * u * 3, vx: 260, vy: 20, life: 2.5, size: 9, color: '#ff9fb8', wob: 40, spin: 3, alpha: .8 }); yield; }
    // clash three times
    for (let i = 0; i < 3; i++){
      // step back to the marks, then rush in and stop a sword's length apart
      const ax0 = a.x, bx0 = b.x;
      yield* E().tween(.25, k => { a.x = ax0 + (x - u * 1.6 - ax0) * k; b.x = bx0 + (x + u * 1.6 - bx0) * k; });
      yield* E().tween(.16, k => { a.x = x - u * 1.6 + u * 1.05 * ease.out(k); b.x = x + u * 1.6 - u * 1.05 * ease.out(k); fx.puff(a.x - a.w * .3, fy, a.w * .5, 1); fx.puff(b.x + b.w * .3, fy, b.w * .5, -1); });
      a.play('swing', { once: true, restart: true, speed: 1.4 }); b.play('swing', { once: true, restart: true, speed: 1.4 });
      yield .15;
      const mx = (a.x + b.x) / 2, my = fy - u * .75;
      fx.impact(mx, my, i === 2 ? 1 : 0, '#9fe6ff'); fx.slash(mx - u * .2, my, 1, { color: '#9fe6ff', size: u * 1.6 }); fx.slash(mx + u * .2, my, -1, { color: '#ffd0a8', size: u * 1.6 });
      fx.burst('spark', mx, my, 14, { speed: 320, drag: 4, life: .5, size: 12, size2: 2, color: ['#ffffff', '#9fe6ff', '#ffe08a'] });
      c.word(pick(['CLANG!', 'KLING!', 'SHING!']), mx, my - u, { color: '#d8f4ff' });
      yield* E().all(E().tween(.3, k => { a.x -= u * 2.2 * C.E.dt * (1 - k); }), E().tween(.3, k => { b.x += u * 2.2 * C.E.dt * (1 - k); }));
      a.play('idle'); b.play('idle'); yield .4;
    }
    // the anime finish: they dash past each other in a flash... and one falls
    a.play('crouch', { once: true, restart: true }); b.play('crouch', { once: true, restart: true }); yield .6;
    const ax = a.x, bx = b.x, mx = (ax + bx) / 2;
    fx.flash('rgba(255,255,255,.75)', 220); fx.lines(mx, fy - u * .8, { ms: 900 });
    a.x = bx + u * .7; b.x = ax - u * .7; a.faceTo(1); b.faceTo(-1);
    fx.slash(mx, fy - u * .8, 1, { color: '#ffffff', size: u * 3.2, life: .45 });
    for (let i = 0; i < 18; i++) fx.p('streak', { x: mx + (Math.random() - .5) * u * 3, y: fy - u * (.3 + Math.random()), vx: (Math.random() < .5 ? 1 : -1) * 900, life: .25, size: 70, size2: 10, rot: 0, color: '#ffffff' });
    a.play('swing', { once: true, restart: true }); b.play('swing', { once: true, restart: true });
    yield 1.4;
    const [w, l] = Math.random() < .5 ? [a, b] : [b, a];
    fx.impact(l.mid().x, l.mid().y, 1, '#ff6a6a'); l.play('ko', { once: true, restart: true }); c.word('…!', l.x, l.top().y - u * .3, { color: '#ff6a6a' });
    yield 1.2;
    dim.stop();
    c.word('VICTORY!', w.x, fy - u * 2.2, { big: true, color: '#ffd84d' });
    yield* c.cheer([w]);
    l.play('idle', { fade: .6 }); yield .6; c.face(l, w); c.face(w, l); l.play('wave', { once: true, restart: true }); w.play('wave', { once: true, restart: true }); yield 1.3;
    yield* c.leaveAll();
  } };

/* ---------- Yoga ---------- */
A.yoga = { name: 'Yoga', cast: 1, want: 2, minWidth: 300, fits: a => !a.fam.swim,
  *run(c){
    const u = U(), fy = c.floor(), x = c.spot(4), { fx } = c, yogis = c.team.slice(0, 2);
    for (const [i, y] of yogis.entries()) yield* c.build(c.P.mat(u * 1.25), x + (i - (yogis.length - 1) / 2) * u * 1.6, -40);
    yield* E().all(...yogis.map((y, i) => c.come(y, x + (i - (yogis.length - 1) / 2) * u * 1.6, { face: 0 })));
    for (const y of yogis){ y.weaponsOn(false); y.play('sit', { fade: .5 }); }
    c.say(yogis[0], 'Breathe in…', 1.6); yield 1.8;
    const auras = yogis.map(y => c.fxh(fx.aura(y, { color: '#7dffb8', core: '#fffbe0', size: 1.1 })));
    auras.forEach(a => a.set(.55));
    let t = 0;
    while (t < 7){
      t += C.E.dt;
      for (const [i, y] of yogis.entries()){
        y.lift = Math.min(1, t / 2.5) * u * .55 + Math.sin(t * 1.6 + i) * u * .05;
        if (Math.random() < C.E.dt * 4){ const ang = Math.random() * Math.PI * 2, r = u * .9; fx.p('heart', { x: y.x + Math.cos(ang) * r, y: y.mid().y + Math.sin(ang) * r * .4, vx: -Math.sin(ang) * 40, vy: -20, life: 2, size: 7, size2: 10, color: '#ffb8d9', spin: 2, alpha: .85 }); }
      }
      if (t > 1.5 && t - C.E.dt <= 1.5) c.say(yogis[0], 'Ommm…', 2.4);
      if (Math.random() < C.E.dt * .8) fx.ring(x, fy, { r: u * 1.6, ground: true, color: '#9dffc8', life: 1.6, width: .08 });
      yield;
    }
    auras.forEach(a => a.end());
    yield* E().tween(.7, k => { for (const y of yogis) y.lift = u * .55 * (1 - ease.inOut(k)); });
    for (const y of yogis){ y.lift = 0; y.squash(1.1, .9, .3); }
    for (const y of yogis) y.play('happy', { once: true, restart: true }); fx.sparkle(x, fy - u * 1.4, 14); c.word('ZEN', x, fy - u * 2.2, { big: true, color: '#9dffc8' });
    yield 1.4;
    yield* c.clear(); yield* c.leaveAll();
  } };

/* ---------- Weightlifting ---------- */
A.lift = { name: 'Weightlifting', cast: 1, want: 1, minWidth: 260, fits: a => !a.fam.swim && !a.fam.hover,
  *run(c){
    const u = U(), fy = c.floor(), x = c.spot(3), { a, fx } = c;
    const bar = c.keep(c.P.barbell(u * 1.5)); bar.userData.prop = true; bar.position.set(x, -(fy - u * .22), 300); C.E.scene.add(bar);
    bar.scale.setScalar(.01); yield* E().tween(.35, k => bar.scale.setScalar(Math.max(.01, ease.back(k))));
    yield* c.come(a, x, { face: 0 }); a.weaponsOn(false);
    a.play('crouch', { once: true, restart: true }); c.say(a, 'Hnnng…', 1.6);
    c.tint(a, '#ff4422', .1);
    for (let t = 0; t < 1.6; t += C.E.dt){ a.x = x + Math.sin(t * 70) * 1.2; if (Math.random() < C.E.dt * 6) fx.sweat(a.x, a.top().y + a.h * .15, Math.random() < .5 ? 1 : -1); yield; }
    a.x = x;
    a.play('hold', { fade: .2 });
    const y0 = fy - u * .22;
    yield* E().tween(.5, k => { const top = a.top().y; bar.position.y = -(y0 + (top - u * .06 - y0) * ease.back(k)); });
    a.squash(.9, 1.12, .4); fx.impact(x, a.top().y, 0, '#ffd84d');
    c.word('!!', x + u * .7, a.top().y - u * .3, { color: '#ffffff' });
    for (let t = 0; t < 1.4; t += C.E.dt){ bar.position.y = -(a.top().y - u * .06) + Math.sin(t * 40) * .8; bar.rotation.z = Math.sin(t * 3) * .04; yield; }
    c.word('NEW RECORD!', x, fy - u * 2.6, { big: true, color: '#ffd84d' }); fx.sparkle(x, a.top().y - u * .3, 16); fx.confetti(x, fy - u * 2, 40);
    yield 1;
    // drop it: thud
    const by = -bar.position.y;
    yield* E().tween(.25, k => { bar.position.y = -(by + (y0 - by) * k * k); });
    fx.dust(x - u * .6, fy, u * .6); fx.dust(x + u * .6, fy, u * .6); fx.shake(6, .3); c.word('THUD', x, fy - u * .6, { color: '#cfcfcf' });
    yield* E().act(a, 'happy');
    yield* P_vanish(c, bar);
  } };
function* P_vanish(c, g){ yield* c.P.vanish(g, .3); }

/* ---------- Skateboarding ---------- */
A.skate = { name: 'Skateboarding', cast: 1, want: 1, minWidth: 380, fits: a => !a.fam.swim && !a.fam.hover,
  *run(c){
    const u = U(), fy = c.floor(), { a, fx } = c, W = c.W;
    const g = yield* awaitP(C.props.get('skateboard', u * .85));
    if (!g) return;
    const board = c.keep(new T.Group()); board.add(g); board.rotation.y = Math.PI / 2; board.userData.prop = true; C.E.scene.add(board);
    const dir = a.x < W / 2 ? 1 : -1, start = dir > 0 ? u : W - u;
    yield* c.come(a, start, { face: dir }); a.weaponsOn(false);
    a.lift = u * .12; a.play('drive', { fade: .2 }); a.faceTo(dir);
    let v = 0, tricks = 0, air = 0, flip = 0, t = 0;
    const end = dir > 0 ? W - u * 1.2 : u * 1.2;
    while ((end - a.x) * dir > 0){
      t += C.E.dt; v = Math.min(u * 3.6, v + u * 3 * C.E.dt);
      a.x += dir * v * C.E.dt;
      const third = Math.abs(a.x - start) / Math.abs(end - start);
      if (!air && tricks < 2 && third > (tricks ? .62 : .3)){ air = .01; tricks++; a.squash(1.15, .85, .15); fx.dust(a.x, fy, a.w); }
      if (air){
        air += C.E.dt; const k = Math.min(1, air / .7);
        a.lift = u * .12 + Math.sin(k * Math.PI) * u * 1.1; flip = k * Math.PI * 2;
        if (k >= 1){ air = 0; flip = 0; a.lift = u * .12; a.squash(1.2, .8, .3); fx.impact(a.x, fy - 4, 0, '#7dd3ff'); c.word(tricks === 1 ? 'KICKFLIP!' : '360 FLIP!', a.x, fy - u * 2, { color: '#7dd3ff' }); }
      }
      board.position.set(a.x, -(fy - (a.lift - u * .12) - u * .05), 380);
      board.rotation.set(flip * (tricks === 2 ? 0 : 1), Math.PI / 2 + (tricks === 2 ? flip : 0), 0);
      if (Math.random() < C.E.dt * 16) fx.p('streak', { x: a.x - dir * a.w, y: fy - Math.random() * a.h, vx: -dir * 200, life: .25, size: 40, size2: 10, rot: 0, color: '#ffffff', alpha: .45 });
      yield;
    }
    a.lift = 0; a.play('happy', { once: true, restart: true }); c.word('RAD!', a.x, fy - u * 2, { big: true, color: '#7dd3ff' }); fx.sparkle(a.x, a.top().y, 12);
    yield 1.3; a.play('idle');
  } };

/* ---------- Rock Concert ---------- */
A.guitar = { name: 'Rock Concert', cast: 1, want: 3, minWidth: 340, fits: a => !a.fam.swim,
  *run(c){
    const u = U(), fy = c.floor(), x = c.spot(5), { fx } = c, star = c.team[0], fans = c.team.slice(1);
    const amp = yield* c.prop('speaker', u * 1, x - u * 1.1, -40);
    yield* E().all(c.come(star, x, { face: 0 }), ...fans.map((f, i) => c.come(f, x + (i ? -1 : 1) * u * 1.8, { face: i ? 1 : -1 })));
    star.weaponsOn(false);
    const g = yield* awaitP(C.props.get('lute', u * .75));
    if (g){ g.rotation.set(0, 0, -1.1); star.grab(g, false, new T.Vector3(0, 0, 0)); }
    star.play('hold', { fade: .2 });
    const spot = c.keep(c.P.spot(c.H, u * 1.8, '#fff3c4')); spot.userData.prop = true; spot.position.set(x, 0, 250); C.E.scene.add(spot);
    c.word('ROCK!', x, fy - u * 2.4, { big: true, color: '#ff5c7a' });
    let t = 0, beat = 0;
    while (t < 8){
      t += C.E.dt;
      if (t > beat){ beat += .38; star.squash(1.05, .95, .2); fx.notes(x + u * .3, star.mid().y, 1); if (amp) amp.scale.setScalar(1.08); for (const f of fans) if (Math.random() < .5) f.play(pick(['happy', 'jump', 'wave']), { once: true, restart: true }); }
      if (amp) amp.scale.setScalar(1 + (amp.scale.x - 1) * .88);
      if (Math.random() < C.E.dt * 2) for (const f of fans) fx.hearts(f.x, f.top().y, 1);
      yield;
    }
    // the solo
    const aura = c.fxh(fx.aura(star, { color: '#ff7a1a', core: '#fff3a8' }));
    c.say(star, 'SOLO!', 1.2); fx.lines(x, star.mid().y, { ms: 700 });
    for (let s = 0; s < 2.4; s += C.E.dt){ if (Math.random() < C.E.dt * 20) fx.notes(x + (Math.random() - .5) * u, star.mid().y, 1, '#ffd45c'); if (Math.random() < C.E.dt * 14) fx.embers(x, star.mid().y, u * .6); yield; }
    aura.end();
    yield* E().tween(.5, k => { star.lift = Math.sin(k * Math.PI) * u * .9; star.spin = k * Math.PI * 2; }, z => z);
    star.lift = 0; star.spin = 0; star.squash(1.2, .8, .3);
    fx.impact(x, fy - u * .4, 1, '#ff7a1a'); fx.confetti(x, fy - u * 2, 60); c.word('ENCORE!', x, fy - u * 2.6, { big: true, color: '#ffd84d' });
    yield* c.cheer(c.team);
    yield* c.clear(); yield* c.leaveAll();
  } };

/* ---------- Football ---------- */
A.soccer = { name: 'Football', cast: 2, want: 2, minWidth: 420, fits: a => !a.fam.swim, guestOk: d => d.family !== 'swimmers',
  *run(c){
    const u = U(), fy = c.floor(), side = Math.random() < .5 ? -1 : 1, x = c.spot(6), gx = x + side * u * 2.2, { a, b, fx } = c;
    const goal = yield* c.build(c.P.goal(u * 1.9, u * 1.15), gx, -80);
    const ball = c.keep(c.P.ball('soccer', u * .32)); ball.userData.ball.position.y = 0; C.E.scene.add(ball);
    yield* E().all(c.come(a, x - side * u * 1.4, { face: side }), c.come(b, gx - side * u * .2, { face: -side }));
    a.weaponsOn(false); b.weaponsOn(false);
    let goals = 0;
    for (let i = 0; i < 3; i++){
      const bx0 = x - side * u * .7; ball.position.set(bx0, -(fy - u * .16), 420);
      yield* E().tween(.8, k => { a.faceTo(side); ball.position.x = bx0 + side * u * .3 * k; ball.rotation.z -= side * .2; });
      a.play('kick', { once: true, restart: true, speed: 1.2 }); yield .25;
      fx.impact(ball.position.x, fy - u * .16, 0, '#ffffff');
      const save = i === 1 || (i === 2 && Math.random() < .3);
      const sx = ball.position.x, ty = fy - u * (save ? .6 : .55 + Math.random() * .3), tx = save ? b.x : gx + side * u * .25;
      const keeperUp = Math.random() < .5;
      yield* E().all(
        E().tween(.42, k => { ball.position.set(sx + (tx - sx) * k, -((fy - u * .16) + (ty - (fy - u * .16)) * k - u * .4 * Math.sin(k * Math.PI)), 420); ball.rotation.z -= side * .5;
          if (Math.random() < .6) fx.p('streak', { x: ball.position.x - side * u * .3, y: -ball.position.y, vx: -side * 200, life: .2, size: 40, size2: 8, rot: 0, color: '#ffffff', alpha: .6 }); }),
        (function*(){ yield .12; b.play(save ? 'jump' : 'hit', { once: true, restart: true }); yield* E().tween(.3, k => { b.lift = Math.sin(k * Math.PI) * u * (keeperUp ? .6 : .2); b.x += (save ? 0 : -side) * u * 2 * C.E.dt; }); b.lift = 0; })()
      );
      if (save){
        fx.impact(tx, ty, 1, '#7dd3ff'); c.word('SAVED!', tx, ty - u, { color: '#7dd3ff' }); b.play('happy', { once: true, restart: true });
        yield* E().tween(.6, k => { ball.position.set(tx - side * u * 1.5 * k, -(ty + (fy - u * .16 - ty) * k - u * 4 * k * (1 - k)), 420); });
        a.play('sad', { once: true, restart: true }); yield 1;
      } else {
        goals++;
        const net = goal.children[0].userData.net;
        yield* E().tween(.3, k => { net.position.z = -u * .58 * .25 - Math.sin(k * Math.PI) * u * .25; ball.position.x += side * u * .4 * C.E.dt; });
        fx.confetti(gx, fy - u * 1.6, 50); c.word('GOAL!', gx - side * u * .3, fy - u * 2.2, { big: true, color: '#7dff8a' }); fx.lines(gx, fy - u * .8, { ms: 600 });
        yield* E().act(a, 'happy'); b.play('sad', { once: true, restart: true }); yield .6;
      }
      a.play('idle'); b.play('idle'); b.x = gx - side * u * .2; b.faceTo(-side);
      yield .4;
    }
    c.say(a, goals > 1 ? 'Champion!' : 'Good game!', 1.4);
    yield* c.cheer([a, b]);
    C.E.scene.remove(ball);
    yield* c.clear(); yield* c.leaveAll();
  } };

/* ---------- Tug of War ---------- */
A.tug = { name: 'Tug of War', cast: 2, want: 2, minWidth: 360, fits: a => !a.fam.swim && !a.fam.hover, guestOk: d => d.family !== 'swimmers' && d.family !== 'flyers',
  *run(c){
    const u = U(), fy = c.floor(), x = c.spot(5), { a, b, fx } = c;
    yield* E().all(c.come(a, x - u * 1.3, { face: 1 }), c.come(b, x + u * 1.3, { face: -1 }));
    a.weaponsOn(false); b.weaponsOn(false); a.faceTo(1); b.faceTo(-1);
    const rope = c.keep(c.P.rope(0xc49a5a, u * .04)); rope.userData.prop = true;
    const flag = c.keep(new T.Mesh(new T.PlaneGeometry(u * .16, u * .24), new T.MeshBasicMaterial({ color: 0xff3b3b, side: T.DoubleSide }))); C.E.scene.add(flag); flag.userData.prop = true;
    c.word('PULL!', x, fy - u * 2.4, { big: true, color: '#ffd84d' });
    a.play('hold'); b.play('hold');
    let off = 0, t = 0;
    while (Math.abs(off) < u * .9 && t < 9){
      t += C.E.dt;
      off += (Math.sin(t * 1.7) * .9 + Math.sin(t * 4.3) * .5 + (t > 5 ? (off > 0 ? .8 : -.8) : 0)) * u * .55 * C.E.dt;
      a.x = x - u * 1.3 + off; b.x = x + u * 1.3 + off;
      a.lean = .25; b.lean = -.25;
      const ha = a.hand(), hb = b.hand();
      rope.userData.set({ x: ha.x, y: ha.y }, { x: hb.x, y: hb.y });
      flag.position.set((ha.x + hb.x) / 2, -((ha.y + hb.y) / 2 + u * .12), 530);
      if (Math.random() < C.E.dt * 5){ fx.puff(a.x - a.w * .3, fy, a.w * .5, 1); fx.puff(b.x + b.w * .3, fy, b.w * .5, -1); }
      if (Math.random() < C.E.dt * 2){ fx.sweat(a.x, a.top().y + a.h * .2, -1); fx.sweat(b.x, b.top().y + b.h * .2, 1); }
      yield;
    }
    const [w, l] = off < 0 ? [a, b] : [b, a];
    rope.visible = false; flag.visible = false;
    a.lean = b.lean = 0;
    l.play('ko', { once: true, restart: true }); w.play('sit', { fade: .1 });
    fx.dust(l.x, fy, l.w * 1.4); fx.dust(w.x, fy, w.w * 1.4); fx.shake(5, .3);
    yield* E().tween(.35, k => { l.x += (w.x - l.x > 0 ? 1 : -1) * u * 2 * C.E.dt * (1 - k); });
    c.word('VICTORY!', w.x, fy - u * 2, { big: true, color: '#ffd84d' }); fx.sparkle(w.x, w.top().y, 10);
    yield 1.4; l.play('idle', { fade: .5 }); w.play('idle');
    yield* c.cheer([a, b]);
    yield* c.leaveAll();
  } };

/* ---------- Campfire ---------- */
A.campfire = { name: 'Campfire', cast: 2, want: 3, minWidth: 340, fits: a => !a.fam.swim,
  *run(c){
    const u = U(), fy = c.floor(), x = c.spot(5), { fx } = c, sitters = c.team;
    const pit = yield* c.prop('campfire', u * .9, x, -20);
    const fire = c.keep(c.P.fire(u * .75)); fire.userData.prop = true; fire.position.set(x, -(fy - u * .12), 200); C.E.scene.add(fire);
    const glow = c.fxh(fx.light(x, fy - u * .5, '#ff9a3c', 1.6, u * 7));
    const dim = c.fxh(fx.dim(.22));
    for (const [i, dx] of [[0, -1.6], [1, 1.6]]){ yield* c.prop('log', u * .9, x + dx * u, -50); void i; }
    yield* E().all(...sitters.map((s, i) => c.come(s, x + [-1.6, 1.6, -2.8, 2.8][i] * u, { face: [-1.6, 1.6, -2.8, 2.8][i] < 0 ? 1 : -1 })));
    for (const s of sitters){ s.weaponsOn(false); s.lift = Math.abs(s.x - x) < u * 2 ? u * .18 : 0; s.play('sit', { fade: .3 }); c.face(s, { x }); }
    let t = 0;
    const story = ['Once upon a time…', 'there was a…', 'SPOOKY GHOST!'];
    while (t < 10){
      t += C.E.dt;
      fire.children.forEach(m => m.userData && 0); fire.userData.tick ? fire.userData.tick(t) : null;
      fire.children[0].material.uniforms && (fire.children[0].material.uniforms.uTime.value = t);
      glow.set(1.5 + Math.sin(t * 13) * .2 + Math.sin(t * 7.3) * .15);
      if (Math.random() < C.E.dt * 9) fx.embers(x, fy - u * .45, u * .3);
      if (Math.random() < C.E.dt * 2) fx.p('smoke', { x, y: fy - u * 1, vx: 10, vy: -30, life: 3, size: 16, size2: 50, alpha: .18, color: '#d8d0c8', wob: 15 });
      for (const [k, at] of [[0, 1.2], [1, 3.4], [2, 5.6]]) if (t > at && t - C.E.dt <= at) c.say(sitters[0], story[k], 1.8);
      if (t > 5.8 && t - C.E.dt <= 5.8){
        fx.flash('rgba(160,200,255,.25)', 200);
        for (const s of sitters.slice(1)){ s.play('jump', { once: true, restart: true }); c.say(s, pick(['EEK!', 'AAH!']), 1); s.squash(.8, 1.25, .3); fx.lines(s.x, s.mid().y, { ms: 400 }); }
      }
      if (t > 7.5 && t - C.E.dt <= 7.5){ for (const s of sitters){ s.play('happy', { once: true, restart: true }); } fx.hearts(x, fy - u * 1.5, 4); c.say(sitters[0], 'Hehe, just kidding!', 1.6); }
      if (t > 8.6 && t - C.E.dt <= 8.6) for (const s of sitters) s.play('sit');
      yield;
    }
    for (const s of sitters) s.lift = 0;
    dim.stop(); glow.stop(); void pit;
    yield* c.clear(); yield* c.leaveAll();
  } };

/* ---------- Snowball Fight ---------- */
A.snowball = { name: 'Snowball Fight', cast: 2, want: 2, minWidth: 380, fits: a => !a.fam.swim, guestOk: d => d.family !== 'swimmers',
  *run(c){
    const u = U(), fy = c.floor(), x = c.spot(6), { a, b, fx } = c;
    let snowing = true;
    const snow = (function*(){ while (snowing){ if (Math.random() < .5) fx.snow(c.W); yield .06; } })();
    const snowRun = new C.Runner(snow);
    yield* c.prop('snowpile', u * 1.1, x - u * 1.5, -30); yield* c.prop('snowpile', u * 1.1, x + u * 1.5, -30);
    yield* E().all(c.come(a, x - u * 2.2, { face: 1 }), c.come(b, x + u * 2.2, { face: -1 }));
    a.weaponsOn(false); b.weaponsOn(false);
    c.word('SNOWBALL FIGHT!', x, fy - u * 2.6, { big: true, color: '#dff3ff' });
    for (let i = 0; i < 5; i++){
      snowRun.step(C.E.dt);
      const [t1, t2] = i % 2 ? [b, a] : [a, b], dir = t2.x > t1.x ? 1 : -1;
      t1.play('pick', { once: true, restart: true });
      const ball = c.keep(c.P.ball('snow', u * .22)); ball.userData.ball.position.y = 0; ball.userData.prop = true; C.E.scene.add(ball);
      for (let k = 0; k < .6; k += C.E.dt){ snowRun.step(C.E.dt); const h = t1.hand(); ball.position.set(h.x, -h.y, 430); ball.scale.setScalar(Math.min(1, k / .5)); yield; }
      t1.play('punch', { once: true, restart: true }); yield .2;
      const h = t1.hand(), hit = i !== 2, tgt = t2.mid(), tx = hit ? tgt.x : tgt.x + dir * u * 1.5, ty = hit ? t2.top().y + t2.h * .15 : fy - u * .1;
      if (!hit) t2.play('crouch', { once: true, restart: true });
      yield* E().tween(.5, k => { snowRun.step(C.E.dt); ball.position.set(h.x + (tx - h.x) * k, -(h.y + (ty - h.y) * k - u * 1.2 * 4 * k * (1 - k)), 430); });
      ball.visible = false;
      fx.burst('soft', tx, ty, 10, { speed: 160, drag: 4, life: .5, size: 16, size2: 26, color: '#ffffff', alpha: .8 }); fx.burst('flake', tx, ty, 8, { speed: 200, g: 300, life: .8, size: 9, color: '#ffffff' });
      if (hit){ c.word('SPLAT!', tx, ty - u * .6, { color: '#ffffff' }); t2.play('hit', { once: true, restart: true }); yield* E().tween(.6, k => { t2.spin = Math.sin(k * Math.PI * 4) * .5; }); t2.spin = 0; }
      else { c.say(t2, 'Missed!', 1); t2.play('happy', { once: true, restart: true }); }
      yield .5; t1.play('idle'); t2.play('idle');
    }
    const sm = yield* c.prop('snowman', u * 1.1, x, -60);
    if (sm) fx.sparkle(x, fy - u, 14);
    c.say(a, 'Truce!', 1.2); yield* c.cheer([a, b]);
    snowing = false;
    yield* c.clear(); yield* c.leaveAll();
  } };

/* ---------- Fishing ---------- */
A.fishing = { name: 'Fishing', cast: 1, want: 1, minWidth: 300, fits: a => !a.fam.swim && !a.fam.hover,
  *run(c){
    const u = U(), fy = c.floor(), x = c.spot(4), { a, fx } = c, side = x < c.W / 2 ? 1 : -1;
    const pond = yield* c.build(c.P.puddle(u * 2.2), x + side * u * 1.1, -80);
    const bucket = yield* c.prop('bucket', u * .4, x - side * u * .6, 0);
    yield* c.come(a, x, { face: side }); a.weaponsOn(false);
    a.play('sit', { fade: .3 }); a.faceTo(side);
    const rodG = c.P.rod(u * 1.1); rodG.rotation.z = -side * .9; a.grab(rodG, false);
    const line = c.keep(c.P.rope(0xffffff, .7)); line.userData.prop = true;
    const bob = c.keep(c.P.ball('beach', u * .12)); bob.userData.ball.position.y = 0; bob.userData.prop = true; C.E.scene.add(bob);
    const px = x + side * u * 1.2, pyBase = fy - 4;
    let t = 0, caught = 0;
    const tipPos = () => { const v = new T.Vector3(0, rodG.userData.len, 0); rodG.localToWorld(v); return { x: v.x, y: -v.y }; };
    while (caught < 2 && t < 14){
      t += C.E.dt; pond.children[0].userData.tick(t);
      const waiting = (t % 5.5) < 3.8, bite = !waiting;
      const by = pyBase + (waiting ? Math.sin(t * 3) * 2 : Math.sin(t * 30) * 4);
      bob.position.set(px, -by, 450);
      line.userData.set(tipPos(), { x: px, y: by });
      if (bite && (t - C.E.dt) % 5.5 < 3.8){ c.say(a, '!', .8); fx.ring(px, by, { r: u * .5, ground: true, color: '#ffffff', life: .5, width: .15 }); }
      if (bite && (t % 5.5) > 4.6 && ((t - C.E.dt) % 5.5) <= 4.6){
        caught++;
        a.play('happy', { once: true, restart: true }); fx.splash(px, by, 14);
        const g = yield* awaitP(C.props.get('fish', u * .5, { center: true }));
        if (g){
          const f = c.keep(new T.Group()); f.add(g); f.userData.prop = true; C.E.scene.add(f);
          const bx = bucket ? bucket.position.x : a.x;
          yield* E().tween(.9, k => { f.position.set(px + (bx - px) * k, -(by + (fy - u * .3 - by) * k - u * 2 * 4 * k * (1 - k)), 460); f.rotation.z = k * 8; });
          f.visible = false; fx.sparkle(bx, fy - u * .4, 10); c.word(caught === 1 ? 'GOT ONE!' : 'BIG ONE!', bx, fy - u * 1.4, { color: '#8fd8ff' });
        }
        a.play('sit');
      }
      yield;
    }
    a.drop(); line.visible = false; bob.visible = false;
    yield* E().act(a, 'happy');
    yield* c.clear();
  } };

/* ---------- Karate ---------- */
A.karate = { name: 'Karate', cast: 1, want: 1, minWidth: 280, fits: a => !a.fam.swim && !a.fam.hover,
  *run(c){
    const u = U(), fy = c.floor(), x = c.spot(3.5), { a, fx } = c, side = Math.random() < .5 ? 1 : -1;
    const bd = yield* c.build(c.P.boards(u * 1.3), x + side * u * .75, 40);
    yield* c.come(a, x - side * u * .2, { face: side }); a.weaponsOn(false);
    a.faceTo(0); yield* E().act(a, 'crouch'); c.say(a, 'Osu!', 1); a.play('idle'); yield .6;
    a.faceTo(side);
    const dim = c.fxh(fx.dim(.4)), aura = c.fxh(fx.aura(a, { color: '#ffb02e', core: '#fff6c8' }));
    c.say(a, 'Focus…', 1.4);
    for (let t = 0; t < 1.6; t += C.E.dt){ if (Math.random() < C.E.dt * 6) fx.debris(a.x + (Math.random() - .5) * u, fy, 1); fx.shake(1.5, .1); yield; }
    a.play('punch', { once: true, restart: true, speed: 1.4 }); yield .18;
    fx.flash('rgba(255,255,255,.7)', 140); fx.lines(x + side * u * .75, fy - u * .5, { ms: 800 });
    fx.impact(x + side * u * .75, fy - u * .45, 2, '#ffb02e'); c.word('HI-YAH!', x, fy - u * 2.2, { big: true, color: '#ff8a3c' });
    aura.end(); dim.stop();
    const boards = bd.children[0].userData.boards;
    fx.burst('rect', x + side * u * .75, fy - u * .45, 18, { speed: 260, g: 600, life: 1, size: 7, color: ['#d9a066', '#b07a42'], spin: 10 });
    yield* E().tween(.8, k => { boards.forEach((pair, i) => pair.forEach((bb, j) => { const s = j ? 1 : -1; bb.rotation.z = s * k * (1.2 + i * .3); bb.position.y -= C.E.dt * u * .2 * (1 + i * .3); bb.position.x += s * C.E.dt * u * .25; })); });
    c.word('CRACK!', x + side * u * .75, fy - u * 1.3, { color: '#fff36b' });
    a.faceTo(0); a.play('happy', { once: true, restart: true }); fx.sparkle(a.x, a.top().y, 14); yield 1.4;
    yield* c.clear();
  } };

/* ---------- Birthday Party ---------- */
A.party = { name: 'Birthday Party', cast: 2, want: 3, minWidth: 340,
  *run(c){
    const u = U(), fy = c.floor(), x = c.spot(5), { fx } = c, kids = c.team;
    const cake = yield* c.prop('cupcake', u * .55, x, 20);
    const gift = yield* c.prop('present', u * .5, x + u * .9, 20);
    yield* E().all(...kids.map((k, i) => c.come(k, x + [-1.1, 1.8, -2.1][i] * u, { face: [-1.1, 1.8, -2.1][i] < 0 ? 1 : -1 })));
    for (const k of kids) k.weaponsOn(false);
    // balloons float up
    const cols = [0xff5c7a, 0xffd34d, 0x4dd2ff, 0x7dff8a, 0xc08bff];
    const balloons = cols.map((col, i) => { const g = c.keep(new T.Group()); const b = new T.Mesh(new T.SphereGeometry(u * .2, 18, 14), new T.MeshToonMaterial({ color: col, gradientMap: C.E.gradient })); b.scale.y = 1.2; g.add(b);
      const s = new T.Mesh(new T.CylinderGeometry(.5, .5, u * .9, 4), new T.MeshBasicMaterial({ color: 0xffffff })); s.position.y = -u * .65; g.add(s);
      g.position.set(x + (i - 2) * u * .45, -(fy - u * .3), 300 + i); g.userData.prop = true; g.userData.v = rand(.5, .9); C.E.scene.add(g); return g; });
    c.word('HAPPY BIRTHDAY!', x, fy - u * 2.8, { big: true, color: '#ff8ad8' });
    // the candle sparkles
    let t = 0;
    while (t < 4){ t += C.E.dt; for (const b of balloons){ b.position.y += b.userData.v * u * .9 * C.E.dt * (t < 2.5 ? .35 : 1); b.position.x += Math.sin(t * 2 + b.position.z) * .3; }
      if (cake && Math.random() < C.E.dt * 14) fx.p('spark', { x, y: fy - u * .65, vy: -60, life: .4, size: 10, size2: 2, color: '#ffd34d' });
      if (t > 1 && t - C.E.dt <= 1) c.say(kids[0], 'Make a wish!', 1.4);
      yield; }
    // open the present
    const opener = kids[kids.length - 1];
    yield* c.move(opener, x + u * 1.35, { face: -1 }); opener.play('use', { once: true, restart: true }); yield .4;
    if (gift){ fx.impact(gift.position.x, fy - u * .4, 1, '#ff8ad8'); fx.confetti(gift.position.x, fy - u * .5, 70); fx.sparkle(gift.position.x, fy - u * .8, 18); yield* c.P.vanish(gift, .2); }
    c.word('SURPRISE!', x + u * .9, fy - u * 1.9, { big: true, color: '#ffd34d' });
    yield* E().all(...kids.map(k => E().tween(.5, z => { k.lift = Math.sin(z * Math.PI) * u * .6; }, q => q)));
    for (const k of kids){ k.lift = 0; k.squash(1.2, .8, .3); }
    yield* c.cheer(kids);
    yield* c.clear(); yield* c.leaveAll();
  } };

/* ---------- Treasure Hunt ---------- */
A.treasure = { name: 'Treasure Hunt', cast: 1, want: 1, minWidth: 280, fits: a => !a.fam.swim && !a.fam.hover,
  *run(c){
    const u = U(), fy = c.floor(), x = c.spot(3), { a, fx } = c;
    const mark = c.keep(new T.Group()); mark.userData.prop = true;
    for (const r of [.7, -.7]){ const m = new T.Mesh(new T.BoxGeometry(u * .6, u * .09, 1), new T.MeshBasicMaterial({ color: 0xd8392b })); m.rotation.z = r; mark.add(m); }
    mark.position.set(x, -(fy - 3), 100); mark.scale.y = .35; C.E.scene.add(mark);
    yield* c.come(a, x - u * .7, { face: 1 }); a.weaponsOn(false);
    c.say(a, 'X marks the spot!', 1.5); yield 1.4;
    for (let i = 0; i < 4; i++){ a.play('use', { once: true, restart: true }); yield .3; fx.debris(x, fy, 6); fx.dust(x, fy, u * .6); yield .35; }
    mark.visible = false;
    const chest = yield* awaitP(C.props.get('chest', u * .75));
    if (chest){
      const g = c.keep(new T.Group()); g.add(chest); g.userData.prop = true; C.E.scene.add(g);
      const light = c.fxh(fx.light(x, fy - u * .6, '#ffd34d', 0, u * 5));
      yield* E().tween(.9, k => { g.position.set(x, -(fy + u * .6 * (1 - ease.out(k))), 120); g.rotation.x = .26; light.set(k * 2); });
      fx.impact(x, fy - u * .5, 1, '#ffd34d'); fx.lines(x, fy - u * .5, { ms: 700 });
      for (let i = 0; i < 30; i++) fx.p('star', { x, y: fy - u * .5, vx: (Math.random() - .5) * 300, vy: -200 - Math.random() * 250, g: 700, life: 1.4, size: 12, size2: 8, spin: 6, color: pick(['#ffd34d', '#ffe98a', '#ffffff']) });
      c.word('TREASURE!', x, fy - u * 2.3, { big: true, color: '#ffd34d' });
      a.play('happy', { once: true, restart: true }); yield 1.4;
      yield* E().tween(.5, k => { light.set(2 * (1 - k)); });
    }
    yield* E().act(a, 'happy');
    yield* c.clear();
  } };

/* ---------- Power Beam: two fighters rise, charge, and fire beams that meet in the middle of the screen ---------- */
A.beam = { name: 'Power Beam', cast: 2, want: 2, weight: .7, minWidth: 420, guestOk: d => d.family !== 'swimmers',
  *run(c){
    const u = U(), fy = c.floor(), W = c.W, H = c.H, { a, b, fx } = c;
    const midY = H * .48, ax = W * .14, bx = W * .86;
    yield* E().all(c.come(a, ax, { face: 1 }), c.come(b, bx, { face: -1 }));
    a.weaponsOn(false); b.weaponsOn(false); a.faceTo(1); b.faceTo(-1);
    c.say(a, 'This ends now!', 1.4); yield .8; c.say(b, 'Bring it!', 1.2); yield 1;
    // power up: the page darkens, the ground shakes, rocks float up
    const dim = c.fxh(fx.dim(.5));
    const aa = c.fxh(fx.aura(a, { color: '#4fb4ff', core: '#eaffff', size: 1.25 })), ab = c.fxh(fx.aura(b, { color: '#ffb02e', core: '#fff6c8', size: 1.25 }));
    a.play('crouch', { once: true, restart: true }); b.play('crouch', { once: true, restart: true });
    for (let t = 0; t < 2; t += C.E.dt){
      fx.shake(2 + t * 2, .1);
      if (Math.random() < C.E.dt * 10) fx.debris(rand(W * .1, W * .9), fy, 1);
      if (Math.random() < C.E.dt * 8) fx.p('rock', { x: rand(W * .05, W * .95), y: fy, vy: -80 - Math.random() * 60, life: 2, size: 8 + Math.random() * 8, color: '#8a7a6a', spin: 2 });
      yield;
    }
    c.word('POWER UP!', W / 2, fy - u * 2.5, { big: true, color: '#9fe6ff' });
    // they rise to the middle of the screen
    for (const s of [a, b]){ s.flying = true; s.play('fall', { fade: .3 }); }
    const ya = a.y, yb = b.y;
    yield* E().tween(1.2, k => { a.lift = (ya - midY - a.h * .5) * ease.inOut(k); b.lift = (yb - midY - b.h * .5) * ease.inOut(k); if (Math.random() < .3){ fx.whoosh(a); fx.whoosh(b); } });
    // charge: a growing orb at the hands, sparks pulled in
    a.play('punch', { once: true, restart: true, at: .1 }); a.hold(true); b.play('punch', { once: true, restart: true, at: .1 }); b.hold(true);
    const oa = c.fxh(fx.orb({ color: '#58c8ff', size: 4 })), ob = c.fxh(fx.orb({ color: '#ffb02e', size: 4 }));
    c.say(a, 'HAAA…', 1.8); c.say(b, 'HAAA…', 1.8);
    for (let t = 0; t < 1.8; t += C.E.dt){
      const pa = { x: a.x - a.w * .55, y: a.mid().y }, pb = { x: b.x + b.w * .55, y: b.mid().y };
      oa.x = pa.x; oa.y = pa.y; ob.x = pb.x; ob.y = pb.y; oa.size = ob.size = 6 + t * u * .55;
      for (const [o, col] of [[oa, '#9fe6ff'], [ob, '#ffd08a']]) if (Math.random() < .7){ const ang = Math.random() * 6.3, r = u * 1.4; fx.p('spark', { x: o.x + Math.cos(ang) * r, y: o.y + Math.sin(ang) * r, vx: -Math.cos(ang) * r * 2.2, vy: -Math.sin(ang) * r * 2.2, life: .45, size: 10, size2: 3, color: col }); }
      fx.shake(2 + t * 3, .1);
      yield;
    }
    // FIRE
    a.hold(false); b.hold(false);
    const sxA = a.x + a.w * .5, sxB = b.x - b.w * .5, y1 = a.mid().y, y2 = b.mid().y;
    oa.stop(); ob.stop();
    const thick = clamp(H * .075, u * .7, u * 1.3);   // big: it fills the middle of the screen
    const beamA = c.fxh(fx.beam({ x1: sxA, y1, x2: sxB, y2, thick, color: '#58c8ff' }));
    const beamB = c.fxh(fx.beam({ x1: sxB, y1: y2, x2: sxA, y2: y1, thick, color: '#ffb02e' }));
    fx.flash('rgba(255,255,255,.85)', 260); fx.lines(W / 2, midY, { ms: 900, inner: .22 });
    c.word('HAAAAAA!!', W / 2, midY - u * 1.6, { big: true, color: '#ffffff', ms: 1500 });
    const clash = c.fxh(fx.orb({ color: '#ffffff', size: 0 }));
    let meet = .5;
    yield* E().tween(.28, k => { beamA.reach = k * meet; beamB.reach = k * (1 - meet); beamA.i = beamB.i = k; fx.shake(10, .1); });
    // the clash: pushing back and forth
    for (let t = 0; t < 3; t += C.E.dt){
      meet = .5 + Math.sin(t * 2.4) * .12 + Math.sin(t * 5.7) * .04;
      beamA.reach = meet; beamB.reach = 1 - meet;
      const mx = sxA + (sxB - sxA) * meet, my = y1 + (y2 - y1) * meet;
      clash.x = mx; clash.y = my; clash.size = thick * (4.2 + Math.sin(t * 18) * .4);
      if (Math.random() < .8) fx.p('spark', { x: mx, y: my, vx: (Math.random() - .5) * 900, vy: (Math.random() - .5) * 900, drag: 3, life: .5, size: 16, size2: 2, color: pick(['#ffffff', '#9fe6ff', '#ffd08a']) });
      if (Math.random() < C.E.dt * 6) fx.ring(mx, my, { r: u * 2.4, color: '#ffffff', life: .4, width: .1 });
      fx.shake(7, .1);
      yield;
    }
    // the explosion
    const mx = clash.x, my = clash.y;
    beamA.stop(); beamB.stop(); clash.stop();
    fx.flash('rgba(255,255,255,1)', 520);
    fx.impact(mx, my, 2, '#ffffff');
    fx.ring(mx, my, { r: Math.max(W, H) * .8, color: '#bfe8ff', life: 1.1, width: .06 });
    fx.ring(mx, my, { r: Math.max(W, H) * .5, color: '#ffd08a', life: .8, width: .1 });
    fx.burst('smoke', mx, my, 30, { speed: 420, drag: 2.2, life: 2.2, size: 40, size2: 120, alpha: .5, color: '#cfc8d8' });
    fx.burst('spark', mx, my, 40, { speed: 700, drag: 2.5, life: 1, size: 18, size2: 3, color: ['#ffffff', '#9fe6ff', '#ffd08a'] });
    c.word('BOOM!!', mx, my, { big: true, color: '#ffd84d', ms: 1600 });
    fx.shake(18, .9);
    aa.end(); ab.end();
    // both blown back and down
    for (const s of [a, b]) s.play('ko', { once: true, restart: true });
    const la = a.lift, lb = b.lift, xa = a.x, xb = b.x;
    yield* E().tween(.9, k => { a.lift = la * (1 - ease.inOut(k)); b.lift = lb * (1 - ease.inOut(k)); a.x = xa - u * 1.2 * ease.out(k); b.x = xb + u * 1.2 * ease.out(k); a.spin = -k * 6; b.spin = k * 6; });
    for (const s of [a, b]){ s.lift = 0; s.spin = 0; s.flying = false; s.squash(1.3, .7, .35); fx.dust(s.x, fy, s.w * 1.4); }
    fx.shake(6, .3);
    yield 1.4;
    dim.stop();
    for (const s of [a, b]){ s.play('idle', { fade: .6 }); }
    yield .8;
    yield* E().all(c.move(a, W / 2 - u * .7, { face: 1 }), c.move(b, W / 2 + u * .7, { face: -1 }));
    a.faceTo(1); b.faceTo(-1);
    a.play('wave', { once: true, restart: true }); b.play('wave', { once: true, restart: true }); c.say(a, 'Good fight!', 1.4); fx.hearts(W / 2, fy - u * 1.4, 4);
    yield 1.6;
    yield* c.leaveAll();
  } };
})();
