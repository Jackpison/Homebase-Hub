// Stopwatch and Timer: a stopwatch with laps, and a countdown that rings at the end. Both keep time correctly in a background tab.
import { h, panel, seg, button, field, input } from '../ui.js';
import { table } from '../lib/calc.js';

const fmt = (ms, cs = true) => { const t = Math.max(0, ms), hh = Math.floor(t / 3600000), mm = Math.floor(t / 60000) % 60, ss = Math.floor(t / 1000) % 60, c = Math.floor(t / 10) % 100, p = (n) => String(n).padStart(2, '0'); return (hh ? hh + ':' : '') + p(mm) + ':' + p(ss) + (cs ? '.' + p(c) : ''); };
function ring() {   // three short beeps, made in the browser
  try { const A = new (window.AudioContext || window.webkitAudioContext)(); for (let i = 0; i < 3; i++) { const o = A.createOscillator(), g = A.createGain(); o.frequency.value = 880; o.connect(g); g.connect(A.destination); const t = A.currentTime + i * 0.35; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); o.start(t); o.stop(t + 0.3); } setTimeout(() => A.close(), 1500); } catch (e) { /* no sound */ }
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}

export default function (root) {
  const area = h('div'), title = document.title; let tick = 0;
  const loop = (fn) => { cancelAnimationFrame(tick); const f = () => { fn(); tick = requestAnimationFrame(f); }; f(); };
  // stopwatch
  const sw = { start: 0, acc: 0, run: false, laps: [] }, swClock = h('div', { class: 'clock', role: 'timer', 'aria-live': 'off', text: fmt(0) }), lapBox = h('div');
  const swNow = () => sw.acc + (sw.run ? performance.now() - sw.start : 0);
  const swGo = button('Start', { primary: true, onClick: () => { if (sw.run) { sw.acc = swNow(); sw.run = false; cancelAnimationFrame(tick); swClock.textContent = fmt(sw.acc); } else { sw.start = performance.now(); sw.run = true; loop(() => { swClock.textContent = fmt(swNow()); }); } swGo.querySelector('span').textContent = sw.run ? 'Pause' : 'Start'; lap.disabled = !sw.run; } });
  const lap = button('Lap', { onClick: () => { const t = swNow(); sw.laps.push(t); drawLaps(); } }); lap.disabled = true;
  const swReset = button('Reset', { ghost: true, onClick: () => { sw.acc = 0; sw.run = false; sw.laps = []; cancelAnimationFrame(tick); swClock.textContent = fmt(0); swGo.querySelector('span').textContent = 'Start'; lap.disabled = true; drawLaps(); } });
  const drawLaps = () => lapBox.replaceChildren(...(sw.laps.length ? [table(['Lap', 'Lap Time', 'Total'], sw.laps.map((t, i) => ['Lap ' + (i + 1), fmt(t - (sw.laps[i - 1] || 0)), fmt(t)]).reverse())] : []));
  // timer
  const tm = { end: 0, left: 0, run: false, total: 0 }, tmClock = h('div', { class: 'clock', role: 'timer', text: '05:00' });
  const H = input({ inputmode: 'numeric', value: '0', 'aria-label': 'Hours' }), M = input({ inputmode: 'numeric', value: '5', 'aria-label': 'Minutes' }), S = input({ inputmode: 'numeric', value: '0', 'aria-label': 'Seconds' });
  const setF = () => { if (!tm.run && !tm.left) tmClock.textContent = fmt(read(), false); };
  [H, M, S].forEach((x) => x.addEventListener('input', setF));
  const read = () => ((+H.value || 0) * 3600 + (+M.value || 0) * 60 + (+S.value || 0)) * 1000;
  const status = h('p', { class: 'hint', 'aria-live': 'assertive' });
  function tmTick() {
    const left = tm.end - Date.now(); tmClock.textContent = fmt(left + 999, false); document.title = fmt(left + 999, false) + ' · ' + title;
    if (left <= 0) { tm.run = false; tm.left = 0; cancelAnimationFrame(tick); tmClock.classList.add('done'); tmClock.textContent = '00:00'; document.title = 'Time is up · ' + title; status.textContent = 'Time is up.'; tmGo.querySelector('span').textContent = 'Start'; ring(); }
  }
  const tmGo = button('Start', { primary: true, onClick: () => {
    tmClock.classList.remove('done'); status.textContent = '';
    if (tm.run) { tm.left = tm.end - Date.now(); tm.run = false; cancelAnimationFrame(tick); clearInterval(bg); document.title = title; }
    else { const ms = tm.left || read(); if (ms <= 0) { status.textContent = 'Set a time first.'; return; } tm.end = Date.now() + ms; tm.run = true; loop(tmTick); clearInterval(bg); bg = setInterval(() => tm.run && tmTick(), 1000); }
    tmGo.querySelector('span').textContent = tm.run ? 'Pause' : 'Start';
  } });
  let bg = 0;   // requestAnimationFrame stops in a background tab; this keeps the ring on time there
  const tmReset = button('Reset', { ghost: true, onClick: () => { tm.run = false; tm.left = 0; cancelAnimationFrame(tick); clearInterval(bg); tmClock.classList.remove('done'); status.textContent = ''; document.title = title; tmGo.querySelector('span').textContent = 'Start'; setF(); } });
  const quick = h('div', { class: 'row' }, [1, 3, 5, 10, 15, 25, 30, 60].map((m) => button(m + ' min', { small: true, onClick: () => { if (tm.run) return; H.value = String(Math.floor(m / 60)); M.value = String(m % 60); S.value = '0'; tm.left = 0; setF(); } })));
  const mode = seg('', [['sw', 'Stopwatch'], ['tm', 'Timer']], 'sw', () => show());
  function show() {
    if (mode.value === 'sw') area.replaceChildren(panel(swClock, h('div', { class: 'row' }, swGo, lap, swReset)), lapBox);
    else area.replaceChildren(panel(tmClock, status, h('div', { class: 'mini' }, field('Hours', H), field('Minutes', M), field('Seconds', S)), quick, h('div', { class: 'row', style: 'margin-top:14px' }, tmGo, tmReset),
      h('p', { class: 'hint', text: 'It rings when the time is up, also in another tab. Keep this page open.' })));
    if (mode.value === 'sw' && sw.run) loop(() => { swClock.textContent = fmt(swNow()); });
    else if (mode.value === 'tm' && tm.run) loop(tmTick); else cancelAnimationFrame(tick);
  }
  root.append(h('div', { class: 'field' }, mode.el), area); show();
  return () => { cancelAnimationFrame(tick); clearInterval(bg); document.title = title; };
}
