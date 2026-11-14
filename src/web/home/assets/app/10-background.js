/* ======================================================================
   BACKGROUND
   Photos live on your own server (photos/), so they load fast.
   The next background is preloaded, so the refresh button is instant.
   ====================================================================== */
/* Held upright, a phone shows only the middle slice of a landscape photo, so it gets the phone-shaped copy ("name-p.jpg", about half
   the bytes, same picture). Landscape screens and photos without a copy use the full photo. Turning the phone swaps the file. */
const portraitMQ = matchMedia('(max-aspect-ratio: 3/4)');
const bgSrc = item => media(item.p && portraitMQ.matches ? item.url.replace(/\.(jpe?g|png|webp)$/i, '-p.jpg') : item.url);
portraitMQ.addEventListener?.('change', () => document.querySelectorAll('#bg > img[data-p]').forEach((/** @type {HTMLImageElement} */ n) => { n.src = bgSrc({ url:n.dataset.u, p:1 }); }));

/* ---------- animated designs (1.74.0) ----------
   A design is drawn live in the browser (designs/<id>.js, with its small .css, loaded only when it is on screen). Computers only for the heavy
   ones; Reduce Motion keeps to the designs that can stand still; a phone gets a lower pixel ratio. */
const isPhone = () => matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 700;
const designOk = i => i.type !== 'design' || !((i.design.desktop && isPhone()) || (i.design.gpu === 'webgpu' && !(/** @type {any} */ (navigator).gpu)) || (REDUCED && !i.design.still));
const DESIGNS = {
  files: {},   // id -> the promise of its files
  need(id){
    return this.files[id] ||= new Promise((res, rej) => {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = `designs/${id}.css?v=${PUB.bg.dv || 0}`; css.onerror = () => {}; document.head.appendChild(css);
      const js = document.createElement('script'); js.src = `designs/${id}.js?v=${PUB.bg.dv || 0}`;
      js.onload = () => (/** @type {any} */ (window).HubDesigns?.[id] ? res(true) : rej(new Error('design')));
      js.onerror = () => { delete this.files[id]; rej(new Error('design')); };
      document.head.appendChild(js);
    });
  },
  async load(item){
    const d = item.design; await this.need(d.id);
    const node = /** @type {any} */ (document.createElement('div')); node.className = 'design'; node.setAttribute('aria-hidden', 'true');
    const props = { ...d.props }; if (d.dpr) props.dpr = isPhone() ? 1.5 : 2;
    node._start = () => {
      try {
        node._run = /** @type {any} */ (window).HubDesigns[d.id].start(node, props);
        if (REDUCED && d.still) setTimeout(() => node._run?.update({ paused:true }), 1500);   // one still picture
      } catch { node.remove(); }
    };
    node._stop = () => { try { node._run?.destroy(); } catch {} node._run = null; };
    return node;
  },
};

const BG = {
  el: $('#bg'),
  token: 0,
  timer: 0,
  nextUp: null,          // { item, node } preloaded and ready
  preloading: null,      // { item, promise } the next one, still on its way
  stepping: false,       // the refresh button is working: another press does not start over
  cur: '',               // the address on screen

  credit(text, link){
    const a = $('#creditText');
    a.textContent = text || '';
    if (link) a.href = link; else a.removeAttribute('href');
  },
  busy(on){ $('#nextBg').classList.toggle('spin', on); },
  /* the refresh button reacts at once: the picture on screen dims a little while the next one arrives */
  wait(on){ this.busy(on); this.el.classList.toggle('wait', on); },

  load(item, wait = 20000){
    if (item.type === 'design') return DESIGNS.load(item);
    return new Promise((res, rej) => {
      // a video with a still picture: the picture shows at once, and stays where the video can't play (AV1 on an older browser, data saver, Reduce Motion)
      if (item.type === 'video' && item.poster){
        const v = document.createElement('video');
        const still = () => { const img = new Image(); img.alt = ''; img.onload = () => res(img); img.onerror = () => rej(new Error('load')); img.src = media(item.poster); };
        if (/** @type {any} */ (navigator).connection?.saveData || REDUCED || (/\.mp4$/i.test(item.url) && !v.canPlayType('video/mp4; codecs="av01.0.08M.08"'))) return still();
        Object.assign(v, { muted:true, loop:true, autoplay:true, playsInline:true, preload:'auto', poster:media(item.poster) });
        v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
        v.onerror = () => { v.remove(); const cur = this.el.lastElementChild; if (cur === v) this.show({ ...item, type:'image', url:item.poster }, { count:false }); };
        const pre = new Image(); pre.onload = pre.onerror = () => res(v); pre.src = v.poster;   // ready as soon as its still picture is
        v.src = media(item.url);
        return;
      }
      if (item.type === 'video'){
        const v = document.createElement('video');
        Object.assign(v, { muted:true, loop:true, autoplay:true, playsInline:true, preload:'auto' });
        v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
        const t = setTimeout(() => rej(new Error('timeout')), wait);
        v.oncanplay = () => { clearTimeout(t); v.oncanplay = null; res(v); };
        v.onerror = () => { clearTimeout(t); rej(new Error('load')); };
        v.src = media(item.url);
        return;
      }
      const img = new Image();
      img.alt = ''; img.decoding = 'async';
      if (item.p){ img.dataset.u = item.url; img.dataset.p = '1'; }
      const t = setTimeout(() => rej(new Error('timeout')), wait);
      img.onload = () => { clearTimeout(t); (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(() => res(img)); };
      img.onerror = () => { clearTimeout(t); rej(new Error('load')); };
      img.src = bgSrc(item);
    });
  },

  swap(node, item){
    const old = [...this.el.children];
    if (node.tagName === 'IMG' && motionOn()) node.classList.add('kb');
    this.el.appendChild(node);
    if (node._start) node._start();
    if (node.tagName === 'VIDEO') node.play().catch(() => {});
    requestAnimationFrame(() => requestAnimationFrame(() => {
      node.classList.add('on');
      old.forEach(n => n.classList.remove('on'));
      setTimeout(() => old.forEach(n => { n.remove(); if (n._stop) n._stop(); }), 1800);
    }));
    this.credit(item.credit, item.link);
    this.cur = item.url;
    remember(item.url);
  },

  /** Pick a random item: uploads by chance, then videos by chance, otherwise a photo (source first, then photo).
      Backgrounds this browser showed lately are skipped; when all of a kind were shown, the one shown longest ago comes back. */
  pick(exclude = []){
    const seen = seenTags(), last = lastBg(); if (last) seen.push(bgTag(last));
    const fresh = list => {
      const pool = list.filter(i => !exclude.includes(i.url)); const l = pool.length ? pool : list;
      const f = l.filter(i => !seen.includes(bgTag(i.url)));
      if (f.length) return f;
      const rank = i => seen.lastIndexOf(bgTag(i.url)), oldest = Math.min(...l.map(rank));
      return l.filter(i => rank(i) === oldest);
    };
    const saveData = /** @type {any} */ (navigator).connection?.saveData;
    const all = PUB.bg.photos || [];
    const videos = saveData ? [] : all.filter(i => i.type === 'video');
    const images = all.filter(i => i.type !== 'video');
    const ups = (PUB.uploads || []).filter(u => !(saveData && u.type === 'video'));

    if (PUB.bg.theme === 'mix'){   // (1.74.1) Mix Everything: your own backgrounds, the designs and the online photos take turns, each kind in turn
      const mine = (PUB.bg.own || []).filter(i => !(saveData && i.type === 'video' && !i.poster) && designOk(i));
      const kinds = [mine, images, videos].filter(l => l.length);
      return kinds.length ? pick(fresh(pick(kinds))) : null;
    }
    if (PUB.bg.theme && PUB.bg.theme !== 'online'){   // a theme (Starter or your own): its backgrounds take turns
      const mine = (PUB.bg.own || []).filter(i => !(saveData && i.type === 'video' && !i.poster) && designOk(i));
      return mine.length ? pick(fresh(mine)) : null;
    }
    if (ups.length && (Math.random() < PUB.bg.uploadChance || (!images.length && !videos.length))) return pick(fresh(ups));
    if (videos.length && (Math.random() < PUB.bg.videoChance || !images.length)) return pick(fresh(videos));
    if (images.length){
      const bySrc = {};
      fresh(images).forEach(i => (bySrc[i.src] ||= []).push(i));
      return pick(bySrc[pick(Object.keys(bySrc))]);
    }
    return ups.length ? pick(fresh(ups)) : null;
  },

  async show(item, { count = true, wait = 20000 } = {}){
    if (!item) return false;
    const my = ++this.token;
    let node;
    if (this.nextUp && this.nextUp.item.url === item.url){ node = this.nextUp.node; this.nextUp = null; }
    else {
      if (!this.stepping) this.busy(true);
      try { node = await this.load(item, wait); }
      catch { if (!this.stepping) this.busy(false); return false; }
    }
    if (my !== this.token) return false;
    if (!this.stepping) this.busy(false);
    this.swap(node, item);
    if (count) this.seen(item);
    this.preloadNext(item);
    return true;
  },

  /** Tell the server this photo was shown. After a few views it's replaced with a new one. */
  seen(item){
    if (!item.url.startsWith('photos/')) return;
    fetch('api.php?action=seen', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ url:item.url }), keepalive:true, credentials:'same-origin' })
      .then(r => r.json()).then(r => {
        if (!r.removed) return;
        PUB.bg.photos = (PUB.bg.photos || []).filter(p => p.url !== item.url);
        if (this.nextUp?.item.url === item.url) this.nextUp = null;
        setTimeout(() => this.refill(false), 3000);   // fetch a replacement in the background
      }).catch(() => {});
  },

  /* The next background is fetched soon after one appears (a video: its still picture first), so the refresh button
     usually swaps at once. */
  preloadNext(current){
    this.nextUp = null; this.preloading = null;
    if (/** @type {any} */ (navigator).connection?.saveData) return;   // data saver: the next photo is fetched only when asked for
    const item = this.pick([current.url]);
    if (!item || item.url === current.url) return;
    // (1.71.0) on a phone a next background that is a video is fetched only when asked for (a whole video on mobile data), and a
    // photo waits 3 seconds after the page is ready, so it never slows down the start
    const phone = matchMedia('(pointer: coarse)').matches;
    if (phone && item.type === 'video') return;
    const go = () => {
      if (this.cur !== current.url) return;   // something else is on screen by now
      const p = this.load(item);
      this.preloading = { item, promise:p };
      p.then(node => { if (this.preloading?.promise !== p) return; this.preloading = null; if (this.cur !== item.url) this.nextUp = { item, node }; })
       .catch(() => { if (this.preloading?.promise === p) this.preloading = null; });
    };
    // (1.67.1) once the page has finished loading and the browser is idle, so the next photo never competes with the first one
    const idle = () => setTimeout(() => (window.requestIdleCallback ? requestIdleCallback(go, { timeout: 4000 }) : go()), phone ? 3000 : 600);
    if (document.readyState === 'complete') idle(); else addEventListener('load', idle, { once: true });
  },

  /* The refresh button (and the timer): the ready one at once; the one on its way if it arrives within 6 seconds; otherwise
     two other backgrounds, 6 seconds each. Pressing again while it works does nothing (it never starts over). */
  async next(){
    if (this.stepping) return;
    this.stepping = true; this.wait(true);
    try {
      if (this.nextUp){ const { item } = this.nextUp; if (await this.show(item)) return; }
      if (this.preloading){
        const { item, promise } = this.preloading;
        const node = await Promise.race([promise, new Promise(r => setTimeout(() => r(null), 6000))]).catch(() => null);
        if (node && node.isConnected === false){
          this.token++; this.nextUp = null; this.preloading = null;
          this.swap(node, item); this.seen(item); this.preloadNext(item);
          return;
        }
      }
      const tried = [this.cur];
      for (let i = 0; i < 2; i++){   // at most 6 + 2 x 6 = 18 seconds before the button is free again
        const item = this.pick(tried); if (!item) break; tried.push(item.url);
        if (await this.show(item, { wait:6000 })) return;
      }
    } finally { this.stepping = false; this.wait(false); }
  },

  /** Ask the server to download more photos in the background. Visitors never wait for this. */
  refillRunning: false,
  async refill(showIfEmpty){
    if (this.refillRunning) return;
    this.refillRunning = true;
    try {
      const r = await fetch('api.php?action=refill', { credentials:'same-origin' }).then(r => r.json());
      if (r.added?.length){
        PUB.bg.photos = [...(PUB.bg.photos || []), ...r.added];
        if (showIfEmpty && !this.el.children.length) this.show(r.added[0]);
      }
    } catch {}
    this.refillRunning = false;
  },

  start(){
    const force = new URLSearchParams(location.search).get('bg');
    let first = PUB.first;
    if (force === 'upload' && PUB.uploads.length) first = pick(PUB.uploads);
    else if (force && (PUB.bg.photos || []).some(p => p.src === force)) first = pick(PUB.bg.photos.filter(p => p.src === force));
    if (first && !designOk(first)) first = this.pick();   // (1.74.0) the server chose a design this device cannot run (a computers-only one on a phone)
    if (first) this.show(first);
    if (PUB.bg.refill) setTimeout(() => this.refill(!first), first ? 4000 : 0);
    this.schedule();
  },

  schedule(){
    clearInterval(this.timer);
    const min = PUB.bg.rotate | 0;
    if (min > 0) this.timer = setInterval(() => { if (!document.hidden) this.next(); }, min * 60000);
  },
};
// videos pause while the tab is hidden, so they don't use battery in the background
document.addEventListener('visibilitychange', () => document.querySelectorAll('#bg video').forEach((/** @type {HTMLVideoElement} */ v) => { if (document.hidden) v.pause(); else v.play().catch(() => {}); }));
function motionOn(){ return (editing && ADMIN ? ADMIN.bg.motion : PUB.bg.motion) && !REDUCED; }
const BG_REMEMBER = 30;   // the same as BG_REMEMBER in lib.php
/** A short tag for a background's address (FNV-1a, 32 bits, hex); bg_tag() in lib.php gives the same. */
function bgTag(url){ let h = 0x811c9dc5; for (const b of new TextEncoder().encode(url)) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); }
function seenTags(){ const m = document.cookie.match(/(?:^|; )hl_seen=([^;]*)/); return m ? m[1].split('.').filter(t => /^[0-9a-f]{1,8}$/.test(t)).slice(-BG_REMEMBER) : []; }
function remember(url){
  const t = bgTag(url), s = seenTags().filter(x => x !== t); s.push(t);
  document.cookie = 'hl_seen=' + s.slice(-BG_REMEMBER).join('.') + ';path=/;max-age=2592000;samesite=lax';
  document.cookie = 'hl_last=' + encodeURIComponent(url) + ';path=/;max-age=2592000;samesite=lax';
}
function lastBg(){ const m = document.cookie.match(/(?:^|; )hl_last=([^;]*)/); return m ? decodeURIComponent(m[1]) : ''; }

