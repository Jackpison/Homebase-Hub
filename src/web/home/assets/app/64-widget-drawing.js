/* ---------- drawing ---------- */
function renderWidgets(quiet = false){
  renderClock();
  const a = /** @type {HTMLElement} */ (document.activeElement), keep = a && a.dataset && a.dataset.w && !$('#wPanel').contains(a) ? [/** @type {HTMLElement} */ (a.parentNode).id, a.dataset.w] : null;
  const list = WCFG && WCFG.show ? WCFG.list.filter(w => w.on && W_META[w.id]).map(w => w.id) : [];   // Widgets > Show Widgets off: none
  const dock = WCFG && WCFG.style === 'dock';
  if (wOpen && !list.includes(wOpen)) wOpen = '';
  document.body.classList.toggle('has-widgets', list.length > 0);
  document.body.classList.toggle('w-open', !!wOpen);
  document.body.dataset.wstyle = WCFG ? WCFG.style : '';

  // Glass Dock: chips under the clock for Today and Countdown, and a dock with every widget
  const chips = dock ? ['today', 'countdown', 'weather'].filter(id => list.includes(id)).map(id => ({ id, s:summary(id) })).filter(c => c.s.chip) : [];
  $('#wChips').hidden = !chips.length;
  $('#wChips').innerHTML = chips.map(c => `<button type="button" class="lg wchip" data-w="${c.id}" aria-controls="wPanel" aria-expanded="${wOpen === c.id}">${c.s.hot ? '<i class="dot"></i>' : ''}${c.s.pic ? svgI(W_PIC[c.s.pic] || '') : ''}${esc(c.s.chip)}</button>`).join('');
  $('#wDock').hidden = !dock || !list.length;
  $('#wDock').innerHTML = dock ? list.map(id => `<button type="button" class="wdb" data-w="${id}" aria-controls="wPanel" aria-expanded="${wOpen === id}" aria-label="${esc(W_META[id].name)}">${svgI(W_META[id].icon)}<span>${esc(W_META[id].short)}</span></button>`).join('') : '';

  // Glance and Expand: one small glass card per widget
  $('#wCards').hidden = dock || !list.length;
  $('#wCards').style.setProperty('--n', list.length <= 6 ? list.length : Math.ceil(list.length / 2));   // one row, or two even rows
  $('#wCards').innerHTML = !dock ? list.map(id => {
    const s = summary(id);
    return `<button type="button" class="lg wcard" data-w="${id}" aria-controls="wPanel" aria-expanded="${wOpen === id}">
      <span class="wc-h"><span>${esc(s.title || W_META[id].name)}</span>${s.alert ? `<em>${esc(s.alert)}</em>` : ''}</span>
      ${s.big ? `<b class="wc-big">${esc(s.big)}</b>` : ''}<span class="wc-s">${esc(s.small || '')}</span></button>`;
  }).join('') : '';
  if (!quiet || wOpen === 'worldclock') renderPanel();   // each minute: only World Clock's open panel changes (never one you type in)
  if (keep) $(`#${keep[0]} [data-w="${keep[1]}"]`)?.focus();
}

/* The open widget sits just above the dock or the cards, never on top of them, and scrolls inside when space is short.
   If it would reach the clock or the chips, they step aside while it is open (body.w-cover). */
function placePanel(){
  const p = $('#wPanel');
  if (p.hidden){ document.body.classList.remove('w-cover'); return; }
  const anchor = document.body.dataset.wstyle === 'glance' ? $('#wCards') : $('#wDock');
  if (!anchor || anchor.hidden) return;
  const top = anchor.getBoundingClientRect().top, gap = 14;
  p.style.top = 'auto';
  p.style.bottom = Math.round(innerHeight - top + gap) + 'px';
  p.style.maxHeight = Math.max(160, Math.min(560, Math.round(top - gap - 12))) + 'px';
  const pt = p.getBoundingClientRect().top;
  document.body.classList.toggle('w-cover', [$('#clock'), $('#wChips')].some(el => !el.hidden && el.getBoundingClientRect().bottom > pt - 8));
}
addEventListener('resize', () => placePanel());
function renderPanel(){
  const p = $('#wPanel');
  if (!wOpen){ if (!p.hidden){ p.hidden = true; } placePanel(); return; }
  const keep = document.activeElement && p.contains(document.activeElement) ? document.activeElement.id : '';
  if (wOpen === 'pad' && !p.hidden && $('#wPad')) return;   // never redraw the pad while you type
  p.hidden = false;
  p.dataset.shown = wOpen;
  $('#wPanelTitle').textContent = wOpen === 'note' && WD.info && pinnedBox().box && !pinnedBox().tab.enc ? pinnedBox().box.title : W_META[wOpen].name;
  $('#wBody').innerHTML = panelHTML(wOpen);
  placePanel();
  if (keep && document.getElementById(keep)) document.getElementById(keep).focus();
}

function panelHTML(id){
  const more = (href, text) => `<a class="wmore" href="${href}">${text}</a>`;
  if (id === 'today'){
    if (WD.tasksErr) return `<p class="wmsg">${esc(WD.tasksErr)}</p>`;
    if (!WD.tasks) return '<p class="wmsg">Loading…</p>';
    const t = siteToday(), l = dueNow();
    const rows = l.map(x => {
      const late = dDiff(t, x.due), when = late === 1 ? 'yesterday' : late > 1 ? late + ' days ago' : x.time;
      return `<label class="wrow${late > 0 ? ' late' : ''}"><input type="checkbox" data-done="${esc(x.id)}" data-due="${esc(x.due)}"><span class="wr-n">${esc(x.name)}</span>${when ? `<span class="wr-t">${esc(when)}</span>` : ''}</label>`;
    }).join('');
    const evs = (WD.events || []).map(e => `<div class="wrow wev" style="--ec:${esc(e.cal.color)}"><span class="wr-n">${esc(e.s)}</span><span class="wr-t">${esc(e.t || 'All day')} · ${esc(e.cal.name)}</span></div>`).join('');
    return `<div class="wlist">${rows || (evs ? '' : '<p class="wmsg">Nothing due today.</p>')}${evs ? '<p class="wmsg small">From Your Calendars</p>' + evs : ''}</div>
      <form class="wqa" id="wQaForm"><input type="text" id="wQa" maxlength="300" autocomplete="off" placeholder="+ Add a task, press Enter" aria-label="Quick Add" aria-describedby="wQaHint"></form>
      <p class="wmsg small" id="wQaHint">For example: Pay rent 5 Nov, or Netflix 649 monthly</p>${more('../tasks/', 'Open Tasks')}`;
  }
  if (id === 'countdown'){
    const c = countdown();
    if (!c) return '<p class="wmsg">Choose a name and a date in Edit › Settings › Widgets.</p>';
    const n = Math.abs(c.days);
    const live = c.days >= 0 ? `<p class="wcl" aria-hidden="true" data-d="${esc(WCFG.countdown.date)}" data-t="${esc(WCFG.countdown.time || '')}">${esc(cdLive(WCFG.countdown.date, WCFG.countdown.time))}</p>` : '';   // the seconds are for the eyes: the sentence above says it for a screen reader
    return `<p class="wcount"><b>${c.days > 1 || c.days < -1 ? n : esc(c.when)}</b><span>${c.days > 1 ? 'days to ' + esc(c.name) : c.days < -1 ? 'days since ' + esc(c.name) : esc(c.name)} · ${esc(dLong(WCFG.countdown.date))}${WCFG.countdown.time ? ', ' + esc(WCFG.countdown.time) : ''}</span></p>${live}`;
  }
  if (id === 'note'){
    if (!WCFG.note.box) return '<p class="wmsg">Choose a box from Info in Edit › Settings › Widgets.</p>';
    if (WD.infoErr) return `<p class="wmsg">${esc(WD.infoErr)}</p>`;
    if (!WD.info) return '<p class="wmsg">Loading…</p>';
    const { tab, box } = pinnedBox();
    if (!box) return '<p class="wmsg">That box is no longer in Info. Choose another in Edit › Settings.</p>' + more('../info/', 'Open Info');
    if (tab.enc) return '<p class="wmsg">This box is in an encrypted tab, so it can only be read in Info.</p>' + more('../info/', 'Open Info');
    return `<p class="wnote">${esc(box.notes) || '<i>Empty</i>'}</p>${more('../info/', 'Open in Info')}`;
  }
  if (id === 'tools'){
    if (!WD.tools) return '<p class="wmsg">Loading…</p>';
    if (!WD.tools.length) return '<p class="wmsg">The tools you open in Tools show up here.</p>' + more('../tools/', 'Open Tools');
    return `<div class="wtools">${WD.tools.map(t => `<a href="../tools/#/tool/${encodeURIComponent(t.id)}">${esc(t.name)}</a>`).join('')}</div>${more('../tools/', 'Open Tools')}`;
  }
  if (id === 'calendar') return calendarHTML();
  if (id === 'quote'){
    const q = quoteNow();
    return `<figure class="wquote"><blockquote>“${esc(q[0])}”</blockquote><figcaption>${esc(q[1])}</figcaption></figure><button type="button" class="wbtn" id="wQuoteNext">Another Quote</button>`;
  }
  if (id === 'worldclock'){
    if (!WCFG.zones.length) return '<p class="wmsg">Choose up to three places in Edit › Settings › Widgets.</p>';
    return `<div class="wzones">${WCFG.zones.map(zoneNow).map(z => `<div class="wzone"><span class="wz-n">${esc(z.name)}<small>${esc([z.day, z.off].filter(Boolean).join(' · '))}</small></span><b>${esc(z.time)}</b></div>`).join('')}</div>`;
  }
  if (id === 'weather'){
    if (!WCFG.weather.town) return '<p class="wmsg">Type your town in Edit › Settings › Widgets.</p>';
    if (WD.weatherErr) return `<p class="wmsg">${esc(WD.weatherErr)}</p>`;
    if (!WD.weather) return '<p class="wmsg">Loading…</p>';
    const w = WD.weather, t = siteToday();
    const day = s => s === t ? 'Today' : dDiff(s, t) === 1 ? 'Tomorrow' : dParse(s).toLocaleDateString(undefined, { weekday:'long' });
    return `<div class="wwnow">${svgI(W_PIC[w.pic] || '')}<b>${w.temp}${esc(w.unit)}</b><span>${esc(w.text)}<small>${esc(w.place)}</small></span></div>
      <div class="wwdays">${w.days.map(d => `<div class="wwday"><span>${esc(day(d.date))}</span>${svgI(W_PIC[d.pic] || '')}<span class="ww-t">${esc(d.text)}</span><b>${d.max}°</b><span class="ww-min">${d.min}°</span></div>`).join('')}</div>
      ${w.stale ? '<p class="wmsg small">Open-Meteo can\'t be reached just now, so this is the last forecast your server got.</p>' : ''}
      <a class="wmore" href="https://open-meteo.com/" target="_blank" rel="noopener">Weather data by Open-Meteo.com</a>`;
  }
  if (id === 'bills'){
    if (WD.tasksErr) return `<p class="wmsg">${esc(WD.tasksErr)}</p>`;
    if (!WD.tasks) return '<p class="wmsg">Loading…</p>';
    const b = billsNow(), t = siteToday();
    if (!b.list.length) return '<p class="wmsg">Nothing left to pay this month. Give a task a price in Tasks and it shows here.</p>' + more('../tasks/', 'Open Tasks');
    return `<div class="wlist">${b.list.slice(0, 8).map(x => `<a class="wrow${x.due < t ? ' late' : ''}" href="../tasks/#task=${encodeURIComponent(x.id)}"><span class="wr-n">${esc(x.name)}</span><span class="wr-t">${esc(dShortW(x.due))} · ${esc(moneyW(x.price, x.cur || (WD.set && WD.set.currency) || ''))}</span></a>`).join('')}</div>
      <p class="wmsg small">Left this month: ${Object.entries(b.tot).map(([c, v]) => esc(moneyW(v, c))).join(' · ')}</p>${more('../tasks/', 'Open Tasks')}`;
  }
  if (id === 'recent'){
    if (!WD.recent) return '<p class="wmsg">Loading…</p>';
    if (!WD.recent.length) return '<p class="wmsg">The links you open in Links show up here (on this device only).</p>' + more('../links/', 'Open Links');
    return `<div class="wtools">${WD.recent.map(x => `<a href="${esc(x.u)}" target="_blank" rel="noopener">${esc(x.n)}</a>`).join('')}</div>${more('../links/', 'Open Links')}`;
  }
  if (id === 'files'){
    if (!WD.files) return '<p class="wmsg">Loading…</p>';
    if (!WD.files.length) return '<p class="wmsg">Your files are locked, so their names show here once Files has opened them in this tab.</p>' + more('../files/', 'Open Files');
    return `<div class="wlist">${WD.files.map(x => `<a class="wrow" href="../files/#q=${encodeURIComponent(x.n)}"><span class="wr-n">${esc(x.n)}</span><span class="wr-t">${esc(new Date(x.t).toLocaleDateString(undefined, { day:'numeric', month:'short' }))}</span></a>`).join('')}</div>${more('../files/', 'Open Files')}`;
  }
  if (id === 'status'){
    if (WD.statusErr) return `<p class="wmsg">${esc(WD.statusErr)}</p>`;
    if (!WD.status) return '<p class="wmsg">Checking…</p>';
    const o = WD.status, bk = o.backup || {}, up = o.update || {}, ago = s => { const d = Math.round((Date.now() / 1000 - s) / 86400); return d < 1 ? 'today' : d === 1 ? 'yesterday' : d + ' days ago'; };
    const rows = [['Last Backup', bk.last ? ago(bk.last) : 'Never', !bk.last], ['Updates', up.staged ? 'Ready to install' : up.newer ? 'Version ' + up.newer + ' is out' : 'Up to date', !!(up.staged || up.newer)],
      ['Protection', (o.protect ? o.protect.on + ' of ' + o.protect.total : '—'), !!(o.protect && o.protect.on < o.protect.total)], ['Secure Connection', o.https ? 'Yes (https)' : 'No', !o.https]];
    return `<div class="wzones">${rows.map(r => `<div class="wzone${r[2] ? ' late' : ''}"><span class="wz-n">${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join('')}</div>
      ${(o.alerts || []).slice(0, 3).map(a => `<p class="wmsg small">• ${esc(a.text)}</p>`).join('')}${more('../settings/#overview', 'Open Settings')}`;
  }
  if (id === 'pad'){
    if (WD.padErr) return `<p class="wmsg">${esc(WD.padErr)}</p>`;
    if (!WD.pad) return '<p class="wmsg">Loading…</p>';
    return `<textarea id="wPad" rows="6" maxlength="20000" aria-label="Scratch Pad" placeholder="Type anything. It saves by itself.">${esc(WD.pad.text)}</textarea><p class="wmsg small" id="wPadState" aria-live="polite">Saves by itself</p>`;
  }
  return '';
}

/* the month calendar: today, and the days that have a task (repeating tasks included) */
function stepDue(t, s){
  const n = t.repeat?.n || 1, u = t.repeat?.unit;
  const d = dParse(s);
  if (u === 'day') d.setDate(d.getDate() + n);
  else if (u === 'week') d.setDate(d.getDate() + 7 * n);
  else if (u === 'month' || u === 'year'){
    const m = d.getMonth() + (u === 'month' ? n : 12 * n), y = d.getFullYear() + Math.floor(m / 12), mm = ((m % 12) + 12) % 12;
    const last = new Date(y, mm + 1, 0).getDate();
    return y + '-' + pad2(mm + 1) + '-' + pad2(Math.min(t.day || d.getDate(), last));
  } else return '';
  return dStr(d);
}
function calendarHTML(){
  const t = siteToday(), m = calMonth || t.slice(0, 7);
  const first = dParse(m + '-01'), days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const mon = WD.set.week === 'mon', lead = (first.getDay() - (mon ? 1 : 0) + 7) % 7;
  const busy = {};
  for (const x of WD.tasks || []){
    if (x.status !== 'active') continue;
    for (let s = x.due, i = 0; s && s <= m + '-31' && i < 400; s = stepDue(x, s), i++) if (s.startsWith(m)) (busy[s] = busy[s] || []).push(x.name);
  }
  const names = mon ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  let cells = names.map(n => `<span class="wcal-h" aria-hidden="true">${n}</span>`).join('') + '<span></span>'.repeat(lead);
  for (let d = 1; d <= days; d++){
    const s = m + '-' + pad2(d), b = busy[s];
    const label = dParse(s).toLocaleDateString(undefined, { weekday:'long', day:'numeric', month:'long' }) + (b ? ': ' + b.join(', ') : '');
    cells += `<span class="wcal-d${s === t ? ' now' : ''}${b ? ' busy' : ''}" role="gridcell" aria-label="${esc(label)}"${b ? ` title="${esc(b.join(', '))}"` : ''}>${d}</span>`;
  }
  const title = first.toLocaleDateString(undefined, { month:'long', year:'numeric' });
  return `<div class="wcal-nav"><button type="button" class="wx" data-cal="-1" aria-label="Previous Month">‹</button><b>${esc(title)}</b><button type="button" class="wx" data-cal="1" aria-label="Next Month">›</button></div>
    <div class="wcal" role="grid" aria-label="${esc(title)}">${cells}</div>${WD.tasksErr ? `<p class="wmsg small">${esc(WD.tasksErr)}</p>` : ''}<a class="wmore" href="../tasks/">Open Tasks</a>`;
}

