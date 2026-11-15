// Screen and Voice Recorder: record your screen (a window, a tab or the whole screen, with sound) or just your voice, then save it.
// Everything stays on this device. Recording the screen needs a computer: phone browsers do not offer it.
import { h, panel, seg, check, button, toast, download, note } from '../ui.js';

// (1.61.9) VP9 first: far sharper text and edges per bit than the MP4 (H.264) browsers make while recording; MP4 where VP9 is missing (Safari)
const TYPES = { video: ['video/webm;codecs=vp9,opus', 'video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp8,opus', 'video/webm'], audio: ['audio/mp4', 'audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm'] };
const best = (k) => (window.MediaRecorder ? TYPES[k].find((t) => MediaRecorder.isTypeSupported(t)) || '' : null);
const ext = (t) => (/mp4/.test(t) ? (t.startsWith('audio') ? 'm4a' : 'mp4') : /ogg/.test(t) ? 'ogg' : 'webm');
const clock = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0');

export default function (root) {
  const canScreen = !!navigator.mediaDevices?.getDisplayMedia, canMic = !!navigator.mediaDevices?.getUserMedia, area = h('div'), res = h('div', { 'aria-live': 'polite' });
  let rec = null, streams = [], t0 = 0, timer = 0, url = '', actx = null;
  const time = h('div', { class: 'clock', role: 'timer', text: '00:00' }), meter = h('div', { class: 'meter', 'aria-hidden': 'true' }, h('i'));
  const mic = check('Add my microphone', true), sysAudio = check('Record the sound of the tab or screen too', true);
  // (1.61.9) quality: the bitrate per second of video; High is the default (the old fixed 4 Mbps looked soft on a large screen)
  const QUAL = { std: [6e6, 'Standard'], high: [12e6, 'High'], best: [20e6, 'Best'] }, qual = seg('Quality', Object.entries(QUAL).map(([k, v]) => [k, v[1]]), 'high');
  const go = button('Start Recording', { icon: 'record', primary: true, onClick: () => (rec ? stop() : start()) });
  function stopAll() { streams.forEach((s) => s.getTracks().forEach((t) => t.stop())); streams = []; clearInterval(timer); if (actx) { actx.close().catch(() => {}); actx = null; } meter.firstChild.style.width = '0'; }
  function level(stream) {
    try { actx = new AudioContext(); const an = actx.createAnalyser(); an.fftSize = 512; actx.createMediaStreamSource(stream).connect(an); const d = new Uint8Array(an.fftSize);
      return () => { an.getByteTimeDomainData(d); let m = 0; for (const v of d) m = Math.max(m, Math.abs(v - 128)); meter.firstChild.style.width = Math.min(100, m / 1.28 * 1.6) + '%'; };
    } catch (e) { return () => {}; }
  }
  async function start() {
    const screen = mode.value === 'screen', type = best(screen ? 'video' : 'audio');
    if (type === null) return toast('This browser cannot record.', true);
    let out;
    try {
      if (screen) {
        const s = await navigator.mediaDevices.getDisplayMedia({ video: { width: { ideal: 3840 }, height: { ideal: 2160 }, frameRate: { ideal: 30, max: 60 } }, audio: sysAudio.value ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false } : false }); streams.push(s);
        s.getVideoTracks().forEach((t) => { try { t.contentHint = 'detail'; } catch (e) { /* older browsers */ } });   // keeps text sharp instead of smooth motion
        let m = null; if (mic.value && canMic) { try { m = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); streams.push(m); } catch (e) { toast('The microphone was not allowed: recording the screen without it.', true); } }
        const tracks = [...s.getAudioTracks(), ...(m ? m.getAudioTracks() : [])];
        if (tracks.length > 1) { actx = new AudioContext(); const dest = actx.createMediaStreamDestination(); for (const t of tracks) actx.createMediaStreamSource(new MediaStream([t])).connect(dest); out = new MediaStream([...s.getVideoTracks(), ...dest.stream.getAudioTracks()]); }
        else out = new MediaStream([...s.getVideoTracks(), ...tracks]);
        s.getVideoTracks()[0].addEventListener('ended', () => rec && stop());   // the browser's own Stop Sharing button
      } else { out = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1, sampleRate: 48000 } }); streams.push(out); }
    } catch (e) { stopAll(); return toast(e && e.name === 'NotAllowedError' ? 'Recording was not allowed, or you closed the choice.' : 'Recording could not start: ' + (e.message || e.name), true); }
    const chunks = [], lv = screen ? () => {} : level(out);
    try { rec = new MediaRecorder(out, type ? (screen ? { mimeType: type, videoBitsPerSecond: QUAL[qual.value][0], audioBitsPerSecond: 192000 } : { mimeType: type, audioBitsPerSecond: 128000 }) : {}); } catch (e) { stopAll(); return toast('This browser cannot record this.', true); }
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      const tp = rec.mimeType || type || (screen ? 'video/webm' : 'audio/webm'), blob = new Blob(chunks, { type: tp.split(';')[0] }), name = (screen ? 'screen-recording-' : 'voice-recording-') + new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-') + '.' + ext(tp);
      if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(blob);
      const media = h(screen ? 'video' : 'audio', { controls: true, src: url, class: screen ? 'cam' : null, 'aria-label': 'Your recording' });
      res.replaceChildren(media, h('div', { class: 'row' }, button('Download ' + ext(tp).toUpperCase(), { icon: 'download', primary: true, onClick: () => download(blob, name) })), h('p', { class: 'hint', text: clock((performance.now() - t0) / 1000) + ' recorded, ' + (blob.size / 1048576).toFixed(1) + ' MB.' }));
      rec = null; stopAll(); go.querySelector('span').textContent = 'Start Recording'; lock(false);
    };
    rec.start(1000); t0 = performance.now(); res.replaceChildren(); lock(true); go.querySelector('span').textContent = 'Stop and Save';
    timer = setInterval(() => { time.textContent = clock((performance.now() - t0) / 1000); lv(); }, 100);
  }
  function stop() { if (rec && rec.state !== 'inactive') rec.stop(); }
  const lock = (on) => { mode.el.querySelectorAll('button').forEach((b) => (b.disabled = on)); [mic.box, sysAudio.box].forEach((b) => (b.disabled = on)); qual.el.querySelectorAll('button').forEach((b) => (b.disabled = on)); };
  const mode = seg('', [['screen', 'Screen'], ['voice', 'Voice']], canScreen ? 'screen' : 'voice', () => show());
  function show() {
    time.textContent = '00:00';
    if (mode.value === 'screen') area.replaceChildren(canScreen ? h('div', {}, time, qual.el, mic.el, sysAudio.el, go, h('p', { class: 'hint', text: 'The browser asks what to share: a tab, a window or the whole screen. Sound from a tab works best in Chrome and Edge.' }))
      : note('Recording the screen needs a computer: phone and tablet browsers do not offer it. Voice recording works here.'));
    else area.replaceChildren(canMic ? h('div', {}, time, meter, go, h('p', { class: 'hint', text: 'The browser asks to use the microphone the first time.' })) : note('This browser cannot use a microphone here.'));
  }
  root.append(h('div', { class: 'field' }, mode.el), h('div', { class: 'cols' }, panel(h('h2', { text: 'Record' }), area), panel(h('h2', { text: 'Your Recording' }), res)));
  res.replaceChildren(h('p', { class: 'hint', text: 'Your recording appears here when you stop. It is not saved until you download it.' }));
  show();
  return () => { stop(); stopAll(); if (url) URL.revokeObjectURL(url); };
}
