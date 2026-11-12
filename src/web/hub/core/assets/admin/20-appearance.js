  /* Appearance > Look (1.70.0): the theme, the font and the text sizes. The bar's settings are on the Bar tab, Accent Color on Colors, the glass switch on Glass. */
  function pLook(p) {
    p.innerHTML = '<h3>Theme</h3><p>The default look. The sun/moon button in the bar changes it just for you.</p>' +
      seg('theme', [['auto', 'Follow Device'], ['dark', 'Dark'], ['light', 'Light']], draft.theme) +
      '<h3>Font</h3><p>One font for every page.</p><select id="ix-font" class="ix-sel" aria-label="Font">' +
        FONTS.map(function (f) { return '<option value="' + f[0] + '"' + (draft.font === f[0] || (!draft.font && f[0] === 'default') ? ' selected' : '') + '>' + esc(f[1]) + '</option>'; }).join('') + '</select>' +
      '<input type="text" id="ix-fontc" maxlength="40" placeholder="A font installed on your device, like Calibri" value="' + esc(draft.fontCustom || '') + '" aria-label="Font Name"' + (draft.font === 'custom' ? '' : ' hidden') + '>' +
      '<h3>Text Sizes</h3><p>Make the text on Info or Cards bigger or smaller. Links has its own, in Links Settings.</p>' +
      '<div class="ix-row"><button type="button" class="ix-btn" data-ts="info">' + svg(ICON.type) + 'Info Text Sizes</button><button type="button" class="ix-btn" data-ts="cards">' + svg(ICON.type) + 'Cards Text Sizes</button></div>';
    bindSeg(p, function (k, v) { draft[k] = v; if (k === 'theme') K.previewTheme(v); });
    p.querySelector('#ix-font').onchange = function (e) { draft.font = e.target.value; p.querySelector('#ix-fontc').hidden = draft.font !== 'custom'; if (draft.font === 'custom') p.querySelector('#ix-fontc').focus(); preview(); };
    p.querySelector('#ix-fontc').oninput = function (e) { draft.fontCustom = e.target.value; preview(); };
    p.querySelectorAll('[data-ts]').forEach(function (b) { b.onclick = function () { textSizes(b.dataset.ts); }; });
  }
  /* Appearance > Bar (1.70.0): how the bar looks and acts, then its tabs (pNav). */
  function barHtml() {
    return '<h3>Navigation Style</h3><p>For every page.</p>' +
      '<div class="ix-navpick">' + [['top', 't', 'Top Bar'], ['side', 's', 'Sidebar'], ['dock', 'd', 'Bottom Dock']].map(function (o) { return '<button type="button" class="' + o[1] + '" data-n="' + o[0] + '" aria-pressed="' + (draft.nav === o[0]) + '"><i></i>' + o[2] + '</button>'; }).join('') + '</div>' +
      '<label class="ix-tg"><span>Show the Bar on the Home Page<small>Off keeps the home page clean; a corner button opens the menu.</small></span><input type="checkbox" id="ix-hb"' + (draft.homeBar ? ' checked' : '') + '></label>' +
      '<label class="ix-tg"><span>Hide the Bar While Scrolling<small>The top bar slides away as you scroll down and comes back as you scroll up; the dock shrinks a little. Off keeps the bar in place.</small></span><input type="checkbox" id="ix-bh"' + (draft.barHide !== false ? ' checked' : '') + '></label>' +
      '<p class="ix-note">Glass for the bar: the Glass tab.</p>';
  }
  function bindBar(p) {
    p.querySelectorAll('[data-n]').forEach(function (b) { b.onclick = function () {
      draft.nav = b.dataset.n; p.querySelectorAll('[data-n]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); preview(); }; });
    p.querySelector('#ix-hb').onchange = function (e) { draft.homeBar = e.target.checked; preview(); };
    p.querySelector('#ix-bh').onchange = function (e) { draft.barHide = e.target.checked; preview(); };
  }
  /* Accent Color (on the Colors tab since 1.70.0). (1.65.3) The picker is adapted from Uiverse.io by Cobp, "horrible-quail-18" (MIT; see web/hub/docs/THIRD-PARTY.md):
     ten squares in a row that swell around the mouse, the hex code in a bubble; a click chooses (the original copies), the arrow keys move along the row */
  var ACC_SW = ['#ffc21a', '#fb923c', '#e11d48', '#f472b6', '#a78bfa', '#8b5cf6', '#3b82f6', '#0ea5e9', '#10b981', '#84cc16'];
  function accentHtml() {
    var tickOn = function (c) { var n = parseInt(c.slice(1), 16); return ((n >> 16) * 299 + (n >> 8 & 255) * 587 + (n & 255) * 114) / 1000 > 140 ? '#111' : '#fff'; };
    return '<div class="ix-cgrp"><h4>Accent Color</h4><p>Buttons, the current page, links and highlights, on every page, in dark and light mode.</p><div class="ix-sw"><div class="ix-apk" role="group" aria-label="Accent Color">' + ACC_SW.map(function (c, i) {
        var on = draft.accent === c, first = ACC_SW.indexOf(draft.accent) < 0 ? i === 0 : on;
        return '<button type="button" data-c="' + c + '" data-hex="' + c + '" style="--c:' + c + '" aria-label="Accent color ' + c + (on ? ', chosen' : '') + '" aria-pressed="' + on + '" tabindex="' + (first ? 0 : -1) + '">' +
          '<svg class="ix-apt" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3 3 7-7" stroke="' + tickOn(c) + '"/></svg></button>'; }).join('') + '</div>' +
      '<label class="ix-swc" title="Your Own Color"><input type="color" id="ix-acc" value="' + esc(draft.accent) + '" aria-label="Your Own Color"></label><input type="text" class="ix-hex" id="ix-acch" maxlength="7" value="' + esc(draft.accent) + '" aria-label="Accent Color Hex" spellcheck="false"></div></div>';
  }
  function bindAccent(p) {
    function setAcc(c, fromText) {
      draft.accent = c.toLowerCase(); if (!fromText) p.querySelector('#ix-acch').value = draft.accent; p.querySelector('#ix-acc').value = draft.accent;
      p.querySelectorAll('.ix-apk [data-c]').forEach(function (b) { var on = b.dataset.c === draft.accent; b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.setAttribute('aria-label', 'Accent color ' + b.dataset.c + (on ? ', chosen' : '')); });
      preview();
    }
    var apk = [].slice.call(p.querySelectorAll('.ix-apk [data-c]'));   // the arrow keys move along the row (one stop for Tab)
    apk.forEach(function (b, i) {
      b.onclick = function () { setAcc(b.dataset.c); };
      b.onkeydown = function (e) {
        var d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!d) return; e.preventDefault();
        var n = apk[(i + d + apk.length) % apk.length]; apk.forEach(function (x) { x.tabIndex = -1; }); n.tabIndex = 0; n.focus(); }; });
    p.querySelector('#ix-acc').oninput = function (e) { setAcc(e.target.value); };
    p.querySelector('#ix-acch').oninput = function (e) { var h = hexOf(e.target.value); e.target.classList.toggle('bad', !h); if (h) setAcc(h, true); };
  }
  /* A color swatch with an editable hex box beside it (#1a1a1a, 1a1a1a or #fff). Typing a valid color applies it; clearing the box means "default".
     set(value) gets a #rrggbb string, or '' for default. */
  function hexOf(v) {
    v = String(v || '').trim().replace(/^#/, '');
    if (/^[0-9a-f]{3}$/i.test(v)) v = v.replace(/./g, '$&$&');
    return /^[0-9a-f]{6}$/i.test(v) ? '#' + v.toLowerCase() : '';
  }
  function bindHex(sw, tx, set, canClear) {
    sw.addEventListener('input', function () { tx.value = sw.value; tx.classList.remove('bad'); set(sw.value.toLowerCase()); });
    tx.addEventListener('input', function () {
      var h = hexOf(tx.value);
      if (h) { tx.classList.remove('bad'); sw.value = h; set(h); }
      else if (!tx.value.trim() && canClear) { tx.classList.remove('bad'); set(''); }
      else tx.classList.add('bad');
    });
    tx.addEventListener('blur', function () { var h = hexOf(tx.value); if (h) tx.value = h; });
  }
  /* "Text sizes" for Info and Cards: sliders that preview live; the sizes are saved with the site settings. app: the page whose sizes
     these are (1.70.0: Settings > Appearance > Look opens them for Info or Cards; on those pages it is the page itself). The page
     itself follows the sliders only when it is that page; the sample in the window always does. */
  function textSizes(app) {
    app = typeof app === 'string' && SIZE_SPEC[app] ? app : APP;
    var spec = SIZE_SPEC[app], here = app === APP; if (!spec) return;
    if (!S.admin) { login().then(function () { textSizes(app); }, function () {}); return; }
    var cur = ((S.sizes || {})[app]) || {}, val = {};
    spec.forEach(function (k) { var v = +cur[k[0]]; val[k[0]] = v >= k[2] && v <= k[3] ? v : k[4]; });
    // the same layout as Links' Text sizes: a labelled slider per size, then a sample that follows the sliders
    var SAMPLE = {
      info: [['tab', 'Notes'], ['head', 'Box Title'], ['text', 'Your notes, lists and links read like this.']],
      cards: [['title', 'Cards'], ['box', '₹1,24,000'], ['text', 'HDFC Regalia · Visa · due 12 Nov']]
    }[app] || [];
    openDlg('<h2 style="margin:0 0 16px">' + (here ? '' : esc(app.charAt(0).toUpperCase() + app.slice(1)) + ' ') + 'Text Sizes</h2>' +
      spec.map(function (k) {
        return '<div class="ix-tsf"><label for="ix-ts-' + k[0] + '">' + k[1] + '</label><div class="ix-tsr"><input type="range" id="ix-ts-' + k[0] + '" data-k="' + k[0] + '" min="' + k[2] + '" max="' + k[3] + '" step="1" value="' + val[k[0]] + '"><output>' + val[k[0]] + ' px</output></div></div>';
      }).join('') +
      '<div class="ix-tss ix-tss-' + app + '" aria-hidden="true">' + SAMPLE.map(function (x) { return '<div data-s="' + x[0] + '">' + esc(x[1]) + '</div>'; }).join('') + '</div>' +
      '<p class="ix-err" id="ix-tze"></p>' +
      '<div class="ix-acts"><button class="ix-btn" id="ix-tzr" style="margin-right:auto">Reset Sizes</button><button class="ix-btn" data-ix="close">Cancel</button><button class="ix-btn pri" id="ix-tzs">Save Sizes</button></div>');
    var saved = false;
    var sample = function () { D().querySelectorAll('[data-s]').forEach(function (el) { el.style.fontSize = val[el.dataset.s] + 'px'; }); };
    D().querySelectorAll('input[type=range]').forEach(function (r) {
      r.oninput = function () { val[r.dataset.k] = +r.value; r.nextElementSibling.textContent = r.value + ' px'; sample(); if (here) applySizes(null, val); };
    });
    sample();
    $('#ix-tzr').onclick = function () {
      spec.forEach(function (k) { val[k[0]] = k[4]; });
      D().querySelectorAll('input[type=range]').forEach(function (r) { r.value = val[r.dataset.k]; r.nextElementSibling.textContent = r.value + ' px'; });
      sample(); if (here) applySizes(null, {});
    };
    $('#ix-tzs').onclick = function () {
      var mine = {}; spec.forEach(function (k) { if (val[k[0]] !== k[4]) mine[k[0]] = val[k[0]]; });
      var all = JSON.parse(JSON.stringify(S.sizes || {})); if (Array.isArray(all)) all = {};
      if (Object.keys(mine).length) all[app] = mine; else delete all[app];
      var b = $('#ix-tzs'); b.disabled = true;
      api('settings', { settings: { sizes: all } }).then(function (j) {
        b.disabled = false;
        if (!j.ok) { $('#ix-tze').textContent = j.error || 'Could not save.'; return; }
        saved = true; S.sizes = j.state.sizes; remember(S); applySizes(); closeDlg(); toast('Text sizes saved.');
      }).catch(function () { b.disabled = false; $('#ix-tze').textContent = "Can't reach the server."; });
    };
    new MutationObserver(function (m, o) { if (!D().classList.contains('open') || !D().querySelector('#ix-tzs')) { o.disconnect(); if (!saved && here) applySizes(); } }).observe(D(), { attributes: true, childList: true });
  }
  /* Colors: one mode at a time (the site switches to it, so changes show live), grouped by what they paint. Empty = the built-in color. */
  var COLOR_GROUPS = [
    ['Menu Bar', 'The top bar, sidebar or dock, on every page.', [['bar', 'Background'], ['barText', 'Tabs and Icons']]],
    ['Page', 'What sits behind and around your content.', [['bg', 'Page Background'], ['box', 'Boxes and Cards'], ['panel', 'Menus and Dialogs'], ['line', 'Borders']]],
    ['Text', 'Headings, body text, and quieter labels and hints.', [['text', 'Text'], ['mute', 'Secondary Text']]]
  ];
  /* Presets: n = name, g = group, c = colors (left out = the built-in color), a = accent ('' = keep yours). */
  var PRESET_GROUPS = [['mine', 'My Presets'], ['site', 'Site Looks'], ['classic', 'Editor Classics'], ['modern', 'Modern'], ['vivid', 'Vivid'], ['neon', 'Neon'], ['soft', 'Soft'], ['pastel', 'Pastel'], ['earth', 'Earthy'], ['mono', 'Monochrome'], ['retro', 'Retro'], ['contrast', 'High Contrast']];
  var PRESETS = {
    dark: [
      { n: 'AMOLED', g: 'site', c: {  }, a: '' },
      { n: 'Soft Dark', g: 'site', c: { bg: '#1a1a1a', box: '#212121', panel: '#292929', line: '#363636', text: '#cdcdcd', mute: '#9a9a9a', bar: '#151515', barText: '#9a9a9a' }, a: '' },
      { n: 'Soft Warm', g: 'site', c: { bg: '#1f160d', box: '#2a1f13', panel: '#342718', line: '#463524', text: '#dccfb6', mute: '#a39478', bar: '#1a120a', barText: '#a39478' }, a: '' },
      { n: 'Midnight', g: 'site', c: { bg: '#0a0f1d', box: '#111a2d', panel: '#172238', line: '#24304a', text: '#e8edf7', mute: '#97a3bd', bar: '#0d1426', barText: '#97a3bd' }, a: '' },
      { n: 'Dracula', g: 'classic', c: { bg: '#21222c', box: '#282a36', panel: '#2f3241', line: '#44475a', text: '#f8f8f2', mute: '#a4abd6', bar: '#191a21', barText: '#a4abd6' }, a: '#bd93f9' },
      { n: 'Monokai', g: 'classic', c: { bg: '#272822', box: '#2f302a', panel: '#3e3d32', line: '#49483e', text: '#f8f8f2', mute: '#a8a48e', bar: '#1e1f1c', barText: '#a8a48e' }, a: '#a6e22e' },
      { n: 'Solarized', g: 'classic', c: { bg: '#002b36', box: '#073642', panel: '#0b3f4c', line: '#1e4d58', text: '#e4ddc8', mute: '#93a1a1', bar: '#00232c', barText: '#93a1a1' }, a: '#b58900' },
      { n: 'Gruvbox', g: 'classic', c: { bg: '#282828', box: '#32302f', panel: '#3c3836', line: '#504945', text: '#ebdbb2', mute: '#bdae93', bar: '#1d2021', barText: '#bdae93' }, a: '#fabd2f' },
      { n: 'One Dark', g: 'classic', c: { bg: '#21252b', box: '#282c34', panel: '#2c313a', line: '#3e4451', text: '#dcdfe4', mute: '#9da5b4', bar: '#1b1f24', barText: '#9da5b4' }, a: '#61afef' },
      { n: 'Nord', g: 'classic', c: { bg: '#2e3440', box: '#3b4252', panel: '#434c5e', line: '#4c566a', text: '#eceff4', mute: '#b3bccb', bar: '#272c36', barText: '#b3bccb' }, a: '#88c0d0' },
      { n: 'Material Palenight', g: 'classic', c: { bg: '#292d3e', box: '#2f3347', panel: '#34324a', line: '#444267', text: '#e0e4f2', mute: '#a6accd', bar: '#232635', barText: '#a6accd' }, a: '#c792ea' },
      { n: 'Tokyo Night', g: 'modern', c: { bg: '#1a1b26', box: '#1f2335', panel: '#24283b', line: '#2f3549', text: '#c0caf5', mute: '#9aa5ce', bar: '#16161e', barText: '#9aa5ce' }, a: '#7aa2f7' },
      { n: 'Catppuccin Mocha', g: 'modern', c: { bg: '#1e1e2e', box: '#252536', panel: '#313244', line: '#45475a', text: '#cdd6f4', mute: '#a6adc8', bar: '#181825', barText: '#a6adc8' }, a: '#cba6f7' },
      { n: 'GitHub Dark', g: 'modern', c: { bg: '#0d1117', box: '#161b22', panel: '#1c2128', line: '#30363d', text: '#e6edf3', mute: '#8d96a0', bar: '#010409', barText: '#8d96a0' }, a: '#4493f8' },
      { n: 'Rosé Pine', g: 'modern', c: { bg: '#191724', box: '#1f1d2e', panel: '#26233a', line: '#403d52', text: '#e0def4', mute: '#908caa', bar: '#16141f', barText: '#908caa' }, a: '#ebbcba' },
      { n: 'Kanagawa', g: 'modern', c: { bg: '#1f1f28', box: '#2a2a37', panel: '#363646', line: '#54546d', text: '#dcd7ba', mute: '#a6a69c', bar: '#16161d', barText: '#a6a69c' }, a: '#7e9cd8' },
      { n: 'Everforest', g: 'modern', c: { bg: '#272e33', box: '#2e383c', panel: '#374145', line: '#4f5b58', text: '#d3c6aa', mute: '#a5b0a4', bar: '#1e2326', barText: '#a5b0a4' }, a: '#a7c080' },
      { n: 'Ayu Mirage', g: 'modern', c: { bg: '#1f2430', box: '#242936', panel: '#2a3040', line: '#3a4152', text: '#cccac2', mute: '#9da3b0', bar: '#1a1f29', barText: '#9da3b0' }, a: '#ffcc66' },
      { n: 'Night Owl', g: 'modern', c: { bg: '#011627', box: '#0b2236', panel: '#102a44', line: '#1d3b53', text: '#d6deeb', mute: '#93a8bd', bar: '#010e1a', barText: '#93a8bd' }, a: '#7fdbca' },
      { n: 'Synthwave \'84', g: 'vivid', c: { bg: '#211d30', box: '#2a2139', panel: '#34294f', line: '#463465', text: '#f6f0ff', mute: '#bbb3d1', bar: '#191624', barText: '#bbb3d1' }, a: '#ff7edb' },
      { n: 'Cobalt2', g: 'vivid', c: { bg: '#15232d', box: '#193549', panel: '#1f4662', line: '#2c5b7e', text: '#ffffff', mute: '#a6c5dc', bar: '#122738', barText: '#a6c5dc' }, a: '#ffc600' },
      { n: 'Shades of Purple', g: 'vivid', c: { bg: '#1e1e3f', box: '#2d2b55', panel: '#35336a', line: '#4a4785', text: '#ffffff', mute: '#b8b5e8', bar: '#1a1a36', barText: '#b8b5e8' }, a: '#fad000' },
      { n: 'Horizon', g: 'vivid', c: { bg: '#1c1e26', box: '#232530', panel: '#2e303e', line: '#3a3d4d', text: '#e0e0e0', mute: '#a2a6c0', bar: '#16161c', barText: '#a2a6c0' }, a: '#e95678' },
      { n: 'Cyberpunk', g: 'neon', c: { bg:'#0d0221',box:'#1a0b3b',panel:'#240f4f',line:'#3d1f7a',text:'#f5f0ff',mute:'#b9a7e6',bar:'#08011a',barText:'#b9a7e6' }, a: '#00f0ff' },
      { n: 'Neon Pink', g: 'neon', c: { bg:'#14000d',box:'#200016',panel:'#2d0020',line:'#4d0a38',text:'#fff0f8',mute:'#e6a3c8',bar:'#0d0008',barText:'#e6a3c8' }, a: '#ff2d95' },
      { n: 'Electric Blue', g: 'neon', c: { bg:'#000b1a',box:'#001330',panel:'#001a40',line:'#0a3a80',text:'#eef5ff',mute:'#9dc1f2',bar:'#00060f',barText:'#9dc1f2' }, a: '#2d8cff' },
      { n: 'Matrix', g: 'neon', c: { bg:'#000a02',box:'#001a05',panel:'#002709',line:'#064d14',text:'#d9ffe3',mute:'#6fc986',bar:'#000601',barText:'#6fc986' }, a: '#00ff41' },
      { n: 'Volt', g: 'neon', c: { bg:'#0a0a0a',box:'#151515',panel:'#1e1e1e',line:'#3a3a3a',text:'#ffffff',mute:'#bdbdbd',bar:'#050505',barText:'#bdbdbd' }, a: '#faff00' },
      { n: 'Aurora', g: 'neon', c: { bg:'#02100f',box:'#06201e',panel:'#0a2c29',line:'#14504a',text:'#e8fffb',mute:'#8fd4c8',bar:'#010a09',barText:'#8fd4c8' }, a: '#2effc4' },
      { n: 'Laser Lime', g: 'neon', c: { bg:'#0a0f00',box:'#141c00',panel:'#1c2600',line:'#34450a',text:'#f6ffe0',mute:'#b8cc7a',bar:'#070b00',barText:'#b8cc7a' }, a: '#c6ff00' },
      { n: 'Sunset', g: 'vivid', c: { bg:'#1a0a0f',box:'#2a1018',panel:'#381520',line:'#5c2335',text:'#fff1ea',mute:'#e6a98f',bar:'#12060a',barText:'#e6a98f' }, a: '#ff6a3d' },
      { n: 'Ruby', g: 'vivid', c: { bg:'#150204',box:'#240508',panel:'#310a0e',line:'#5a141c',text:'#fff0f0',mute:'#e8a0a4',bar:'#0e0103',barText:'#e8a0a4' }, a: '#ff2a3d' },
      { n: 'Grape', g: 'vivid', c: { bg:'#12061f',box:'#1e0c33',panel:'#29114a',line:'#46206f',text:'#f6edff',mute:'#c3a5e8',bar:'#0c0414',barText:'#c3a5e8' }, a: '#b44cff' },
      { n: 'Tangerine', g: 'vivid', c: { bg:'#130800',box:'#221000',panel:'#2f1700',line:'#55300a',text:'#fff3e6',mute:'#e8b98a',bar:'#0c0500',barText:'#e8b98a' }, a: '#ff9100' },
      { n: 'Candy Night', g: 'vivid', c: { bg:'#160a1f',box:'#24112f',panel:'#311842',line:'#55296f',text:'#fff0fb',mute:'#e0aee6',bar:'#0f0616',barText:'#e0aee6' }, a: '#ff5ccf' },
      { n: 'Emerald', g: 'vivid', c: { bg:'#00140b',box:'#00230f',panel:'#003217',line:'#0a5a2e',text:'#e6fff0',mute:'#86d4a4',bar:'#000d07',barText:'#86d4a4' }, a: '#14e07a' },
      { n: 'Pure Contrast', g: 'contrast', c: { bg: '#000000', box: '#000000', panel: '#0a0a0a', line: '#6b6b6b', text: '#ffffff', mute: '#d0d0d0', bar: '#000000', barText: '#e6e6e6' }, a: '#ffd400' },
      { n: 'Night Contrast', g: 'contrast', c: { bg: '#000814', box: '#00101f', panel: '#001a33', line: '#4d6b8a', text: '#ffffff', mute: '#cfe0f1', bar: '#000814', barText: '#d6e6f5' }, a: '#00d1ff' },
      { n: 'Catppuccin Frappé', g: 'modern', c: { bg: '#303446', box: '#373b50', panel: '#414559', line: '#51576d', text: '#c6d0f5', mute: '#a5adce', bar: '#292c3c', barText: '#a5adce' }, a: '#ca9ee6' },
      { n: 'Rosé Pine Moon', g: 'modern', c: { bg: '#232136', box: '#2a273f', panel: '#393552', line: '#44415a', text: '#e0def4', mute: '#908caa', bar: '#1d1b2e', barText: '#908caa' }, a: '#ea9a97' },
      { n: 'Ayu Dark', g: 'modern', c: { bg: '#0b0e14', box: '#10141c', panel: '#151a23', line: '#232834', text: '#bfbdb6', mute: '#8a919c', bar: '#080a0f', barText: '#8a919c' }, a: '#e6b450' },
      { n: 'GitHub Dimmed', g: 'modern', c: { bg: '#22272e', box: '#2d333b', panel: '#373e47', line: '#444c56', text: '#adbac7', mute: '#8b98a6', bar: '#1c2128', barText: '#8b98a6' }, a: '#539bf5' },
      { n: 'Material Ocean', g: 'modern', c: { bg: '#0f111a', box: '#141722', panel: '#1a1c25', line: '#292d3e', text: '#c3cbe8', mute: '#8f93a2', bar: '#090b10', barText: '#8f93a2' }, a: '#82aaff' },
      { n: 'Poimandres', g: 'modern', c: { bg: '#1b1e28', box: '#222634', panel: '#2a2f3f', line: '#3a4157', text: '#e4f0fb', mute: '#a6accd', bar: '#171922', barText: '#a6accd' }, a: '#5de4c7' },
      { n: 'Moonlight', g: 'modern', c: { bg: '#212337', box: '#2a2d46', panel: '#32365a', line: '#444a73', text: '#c8d3f5', mute: '#9aa5ce', bar: '#1b1d2f', barText: '#9aa5ce' }, a: '#82aaff' },
      { n: 'Oxocarbon', g: 'modern', c: { bg: '#161616', box: '#1e1e1e', panel: '#262626', line: '#393939', text: '#f2f4f8', mute: '#b6b8bb', bar: '#101010', barText: '#b6b8bb' }, a: '#be95ff' },
      { n: 'Vesper', g: 'modern', c: { bg: '#101010', box: '#161616', panel: '#1c1c1c', line: '#2a2a2a', text: '#d8d8d8', mute: '#a0a0a0', bar: '#0a0a0a', barText: '#a0a0a0' }, a: '#ffc799' },
      { n: 'Darcula', g: 'classic', c: { bg: '#2b2b2b', box: '#313335', panel: '#3c3f41', line: '#4b4d4f', text: '#a9b7c6', mute: '#909ca8', bar: '#242424', barText: '#909ca8' }, a: '#cc7832' },
      { n: 'Zenburn', g: 'classic', c: { bg: '#3f3f3f', box: '#484848', panel: '#4f4f4f', line: '#5f5f5f', text: '#dcdccc', mute: '#bcbcac', bar: '#383838', barText: '#bcbcac' }, a: '#f0dfaf' },
      { n: 'Tomorrow Night', g: 'classic', c: { bg: '#1d1f21', box: '#282a2e', panel: '#303337', line: '#373b41', text: '#c5c8c6', mute: '#9a9d9c', bar: '#161718', barText: '#9a9d9c' }, a: '#81a2be' },
      { n: 'Oceanic Next', g: 'classic', c: { bg: '#1b2b34', box: '#223540', panel: '#2a3f4c', line: '#3b505c', text: '#d8dee9', mute: '#a7b2c0', bar: '#15222a', barText: '#a7b2c0' }, a: '#6699cc' },
      { n: 'Base16 Eighties', g: 'classic', c: { bg: '#2d2d2d', box: '#393939', panel: '#424242', line: '#515151', text: '#d3d0c8', mute: '#b0ada5', bar: '#232323', barText: '#b0ada5' }, a: '#6699cc' },
      { n: 'Graphite', g: 'mono', c: { bg: '#131416', box: '#1c1d1f', panel: '#242629', line: '#3a3d41', text: '#eff0f1', mute: '#b6b8b9', bar: '#0e0f10', barText: '#b6b8b9' }, a: '#7dd3fc' },
      { n: 'Smoke', g: 'mono', c: { bg: '#171717', box: '#202020', panel: '#292929', line: '#404040', text: '#f0f0f0', mute: '#b8b8b8', bar: '#121212', barText: '#b8b8b8' }, a: '#e5e5e5' },
      { n: 'Ink', g: 'mono', c: { bg: '#0c0e12', box: '#13161d', panel: '#1b1e28', line: '#2e3342', text: '#edeef3', mute: '#b2b5bd', bar: '#08090c', barText: '#b2b5bd' }, a: '#93c5fd' },
      { n: 'Espresso', g: 'earth', c: { bg: '#17110c', box: '#231913', panel: '#2e2219', line: '#4a382b', text: '#f4efeb', mute: '#c0b6af', bar: '#110c09', barText: '#c0b6af' }, a: '#e0a96d' },
      { n: 'Moss', g: 'earth', c: { bg: '#11170d', box: '#1a2213', panel: '#222e1a', line: '#38492c', text: '#eff4eb', mute: '#b6c0b0', bar: '#0c1009', barText: '#b6c0b0' }, a: '#a3c46b' },
      { n: 'Pine', g: 'earth', c: { bg: '#0b1611', box: '#11221b', panel: '#172d24', line: '#294a3c', text: '#ebf4f0', mute: '#aec1b9', bar: '#080f0c', barText: '#aec1b9' }, a: '#4fd1a0' },
      { n: 'Olive Grove', g: 'earth', c: { bg: '#15160d', box: '#1f2214', panel: '#2a2d1a', line: '#44482d', text: '#f2f4ec', mute: '#bdbfb0', bar: '#0f1009', barText: '#bdbfb0' }, a: '#c7c34f' },
      { n: 'Copper', g: 'earth', c: { bg: '#18100c', box: '#241811', panel: '#302017', line: '#4d3428', text: '#f4eeeb', mute: '#c2b4ae', bar: '#110b08', barText: '#c2b4ae' }, a: '#e07b39' },
      { n: 'Rust', g: 'earth', c: { bg: '#190e0b', box: '#251511', panel: '#311c16', line: '#4f2f27', text: '#f4edeb', mute: '#c2b1ad', bar: '#120a08', barText: '#c2b1ad' }, a: '#f0694a' },
      { n: 'Desert Night', g: 'earth', c: { bg: '#18150e', box: '#241e14', panel: '#2f281b', line: '#4b402d', text: '#f4f1eb', mute: '#c0bab0', bar: '#120f0a', barText: '#c0bab0' }, a: '#f2b84b' },
      { n: 'Deep Teal', g: 'modern', c: { bg: '#081616', box: '#0d2322', panel: '#12302f', line: '#214f4d', text: '#ebf4f4', mute: '#abc4c4', bar: '#060f0e', barText: '#abc4c4' }, a: '#2dd4bf' },
      { n: 'Lagoon', g: 'modern', c: { bg: '#081417', box: '#0c2024', panel: '#112c32', line: '#1f4951', text: '#ebf3f4', mute: '#a9c1c6', bar: '#050e0f', barText: '#a9c1c6' }, a: '#22d3ee' },
      { n: 'Abyss', g: 'modern', c: { bg: '#060f16', box: '#0a1924', panel: '#0e2331', line: '#1c3b52', text: '#ebf0f4', mute: '#a8bac7', bar: '#040a0e', barText: '#a8bac7' }, a: '#38bdf8' },
      { n: 'Indigo Night', g: 'modern', c: { bg: '#0b0a1a', box: '#110f27', panel: '#161434', line: '#272352', text: '#ecebf4', mute: '#adabc4', bar: '#080712', barText: '#adabc4' }, a: '#818cf8' },
      { n: 'Twilight', g: 'modern', c: { bg: '#110a19', box: '#1a1026', panel: '#231533', line: '#392451', text: '#efebf4', mute: '#b7acc4', bar: '#0c0712', barText: '#b7acc4' }, a: '#c084fc' },
      { n: 'Orchid', g: 'vivid', c: { bg: '#190b19', box: '#251125', panel: '#311631', line: '#4f274f', text: '#f4ebf4', mute: '#c2adc2', bar: '#120812', barText: '#c2adc2' }, a: '#e879f9' },
      { n: 'Wine', g: 'vivid', c: { bg: '#170a0d', box: '#231014', panel: '#30151b', line: '#4d262e', text: '#f4ebed', mute: '#c2adb1', bar: '#100709', barText: '#c2adb1' }, a: '#fb7185' },
      { n: 'Mulberry', g: 'vivid', c: { bg: '#180b13', box: '#24111c', panel: '#311726', line: '#4e283e', text: '#f4ebf0', mute: '#c2adb9', bar: '#11080e', barText: '#c2adb9' }, a: '#f472b6' },
      { n: 'Blueberry', g: 'vivid', c: { bg: '#080b19', box: '#0d1126', panel: '#111734', line: '#202853', text: '#ebedf4', mute: '#a9aec6', bar: '#060811', barText: '#a9aec6' }, a: '#60a5fa' },
      { n: 'Ultraviolet', g: 'vivid', c: { bg: '#1a0b2e', box: '#24113f', panel: '#2d1650', line: '#43246d', text: '#f6efff', mute: '#c9b6ea', bar: '#140824', barText: '#c9b6ea' }, a: '#ff4fd8' },   // 1.59
      { n: 'Cyber Lime', g: 'vivid', c: { bg: '#06180f', box: '#0b2318', panel: '#112f21', line: '#1d4834', text: '#ecfff4', mute: '#a3dcc0', bar: '#04120b', barText: '#a3dcc0' }, a: '#b6ff3b' },   // 1.59
      { n: 'Magma', g: 'vivid', c: { bg: '#200805', box: '#2c0e09', panel: '#39140d', line: '#552117', text: '#fff2ec', mute: '#f2bda9', bar: '#180604', barText: '#f2bda9' }, a: '#ff6a1f' },   // 1.59
      { n: 'Tropic Night', g: 'vivid', c: { bg: '#002a2b', box: '#003639', panel: '#004346', line: '#0f5e61', text: '#eafffe', mute: '#a6dcda', bar: '#001f20', barText: '#a6dcda' }, a: '#ffcc00' },   // 1.59
      { n: 'Royal Blue', g: 'vivid', c: { bg: '#0a1446', box: '#101c5b', panel: '#17256f', line: '#28388c', text: '#f0f3ff', mute: '#b8c1f2', bar: '#070f39', barText: '#b8c1f2' }, a: '#ffd23f' },   // 1.59
      { n: 'Berry Blast', g: 'vivid', c: { bg: '#2a0420', box: '#37072c', panel: '#440b37', line: '#62164f', text: '#ffeef8', mute: '#f2b4d9', bar: '#21031a', barText: '#f2b4d9' }, a: '#00e5ff' },   // 1.59
      { n: 'Jungle Neon', g: 'vivid', c: { bg: '#03200f', box: '#062c17', panel: '#0a381e', line: '#145230', text: '#ecfff2', mute: '#a5ddb9', bar: '#02190b', barText: '#a5ddb9' }, a: '#ff3d8b' },   // 1.59
      { n: 'Cobalt Flame', g: 'vivid', c: { bg: '#071a3a', box: '#0c244d', panel: '#122f60', line: '#1f4580', text: '#eef5ff', mute: '#aac4ec', bar: '#05132c', barText: '#aac4ec' }, a: '#ff7a1a' },   // 1.59
      { n: 'Terminal Green', g: 'retro', c: { bg: '#020b04', box: '#06140a', panel: '#0a1d0f', line: '#134a22', text: '#9dffb0', mute: '#5fc77a', bar: '#010603', barText: '#5fc77a' }, a: '#33ff66' },
      { n: 'Amber Terminal', g: 'retro', c: { bg: '#0d0700', box: '#1a0f00', panel: '#241500', line: '#4d3000', text: '#ffd58a', mute: '#d19a3a', bar: '#080500', barText: '#d19a3a' }, a: '#ffb000' },
      { n: 'Game Console', g: 'retro', c: { bg: '#0f380f', box: '#164a16', panel: '#1c5a1c', line: '#2d7a2d', text: '#d0f0a8', mute: '#9bc36a', bar: '#0a2a0a', barText: '#9bc36a' }, a: '#c4f06a' },
      { n: 'Vaporwave', g: 'retro', c: { bg: '#1a0b2e', box: '#251042', panel: '#301659', line: '#4a2682', text: '#ffe9ff', mute: '#d4a8f0', bar: '#12061f', barText: '#d4a8f0' }, a: '#ff71ce' },
      { n: 'Arcade', g: 'retro', c: { bg: '#0b0b1f', box: '#14143a', panel: '#1c1c52', line: '#33337a', text: '#f0f0ff', mute: '#a8a8e8', bar: '#07071a', barText: '#a8a8e8' }, a: '#05ffa1' },
      { n: 'Retro Blue', g: 'retro', c: { bg: '#1c1a52', box: '#25236b', panel: '#2e2c82', line: '#4543a8', text: '#d6d4ff', mute: '#a9a7f0', bar: '#14123c', barText: '#a9a7f0' }, a: '#9d99ff' },
      { n: 'Amber Contrast', g: 'contrast', c: { bg: '#000000', box: '#000000', panel: '#0a0a0a', line: '#8a6d00', text: '#ffffff', mute: '#ffe9a0', bar: '#000000', barText: '#ffe9a0' }, a: '#ffb000' },
      { n: 'Green Contrast', g: 'contrast', c: { bg: '#000000', box: '#000000', panel: '#0a0a0a', line: '#1f8a3a', text: '#ffffff', mute: '#b9f5c8', bar: '#000000', barText: '#b9f5c8' }, a: '#3dff7a' },
      { n: 'Dusk Pastel', g: 'pastel', c: { bg: '#1a1627', box: '#221c33', panel: '#2a233e', line: '#3e3559', text: '#eeebf4', mute: '#b4b0c0', bar: '#161221', barText: '#b4b0c0' }, a: '#b8c0ff' },
      { n: 'Cotton Night', g: 'pastel', c: { bg: '#25181f', box: '#301f28', panel: '#3b2630', line: '#563947', text: '#f3ecf0', mute: '#beb1b8', bar: '#1f141a', barText: '#beb1b8' }, a: '#ffc8dd' },
      { n: 'Mint Night', g: 'pastel', c: { bg: '#16221e', box: '#1d2d28', panel: '#243831', line: '#375249', text: '#ecf3f1', mute: '#b1beba', bar: '#121c19', barText: '#b1beba' }, a: '#b5ead7' },
      { n: 'Peach Night', g: 'pastel', c: { bg: '#261c17', box: '#31241e', panel: '#3c2d25', line: '#574238', text: '#f3eeec', mute: '#beb5b1', bar: '#201713', barText: '#beb5b1' }, a: '#ffcba4' }],
    light: [
      { n: 'Paper', g: 'site', c: {  }, a: '' },
      { n: 'Solarized Light', g: 'classic', c: { bg: '#fdf6e3', box: '#fffaf0', panel: '#fffaf0', line: '#e6dfc8', text: '#253f46', mute: '#56696f', bar: '#eee8d5', barText: '#4e6167' }, a: '#268bd2' },
      { n: 'Gruvbox Light', g: 'classic', c: { bg: '#fbf1c7', box: '#fdf6d8', panel: '#fffaeb', line: '#d5c4a1', text: '#3c3836', mute: '#665c54', bar: '#ebdbb2', barText: '#665c54' }, a: '#b57614' },
      { n: 'One Light', g: 'classic', c: { bg: '#f0f0f1', box: '#fafafa', panel: '#ffffff', line: '#dbdbdc', text: '#383a42', mute: '#696c77', bar: '#e5e5e6', barText: '#5a5d68' }, a: '#4078f2' },
      { n: 'Nord Snow', g: 'classic', c: { bg: '#eceff4', box: '#f8f9fb', panel: '#ffffff', line: '#d8dee9', text: '#2e3440', mute: '#4c566a', bar: '#e5e9f0', barText: '#4c566a' }, a: '#5e81ac' },
      { n: 'GitHub Light', g: 'modern', c: { bg: '#f6f8fa', box: '#ffffff', panel: '#ffffff', line: '#d0d7de', text: '#1f2328', mute: '#59636e', bar: '#ffffff', barText: '#59636e' }, a: '#0969da' },
      { n: 'Catppuccin Latte', g: 'modern', c: { bg: '#eff1f5', box: '#fafbfc', panel: '#ffffff', line: '#ccd0da', text: '#4c4f69', mute: '#62657b', bar: '#e6e9ef', barText: '#5c5f77' }, a: '#8839ef' },
      { n: 'Rosé Pine Dawn', g: 'modern', c: { bg: '#faf4ed', box: '#fffaf3', panel: '#fffaf3', line: '#dfdad9', text: '#575279', mute: '#6a6687', bar: '#f2e9e1', barText: '#615d7f' }, a: '#d7827e' },
      { n: 'Tokyo Night Day', g: 'modern', c: { bg: '#e1e2e7', box: '#eceef3', panel: '#f4f5f8', line: '#c4c8da', text: '#33395a', mute: '#525a85', bar: '#d6d9e4', barText: '#484f7a' }, a: '#2e7de9' },
      { n: 'Ayu Light', g: 'modern', c: { bg: '#f8f9fa', box: '#ffffff', panel: '#ffffff', line: '#e3e5e8', text: '#4a4f55', mute: '#62686e', bar: '#f0f1f3', barText: '#5c6268' }, a: '#fa8d3e' },
      { n: 'Everforest Light', g: 'modern', c: { bg: '#fdf6e3', box: '#fffbef', panel: '#fffbef', line: '#e6e2cc', text: '#4d5b62', mute: '#5d6b65', bar: '#f4f0d9', barText: '#56645e' }, a: '#8da101' },
      { n: 'Kanagawa Lotus', g: 'modern', c: { bg: '#f2ecbc', box: '#f8f3d4', panel: '#fbf7e0', line: '#d5cea3', text: '#43436c', mute: '#5f5f72', bar: '#e7dba0', barText: '#4d4d63' }, a: '#4d699b' },
      { n: 'Peach', g: 'soft', c: { bg: '#fdf1ec', box: '#ffffff', panel: '#ffffff', line: '#f2dcd2', text: '#3a2a24', mute: '#6f5a51', bar: '#f8e4db', barText: '#6a554c' }, a: '#f0784a' },
      { n: 'Bubblegum', g: 'vivid', c: { bg:'#fff0f7',box:'#ffffff',panel:'#ffffff',line:'#ffc9e3',text:'#3a0a24',mute:'#8a4468',bar:'#ffe0ef',barText:'#7a3a5c' }, a: '#ff2d95' },
      { n: 'Citrus', g: 'vivid', c: { bg:'#fffbe6',box:'#ffffff',panel:'#ffffff',line:'#ffe58a',text:'#2e2500',mute:'#7a6a10',bar:'#fff2b3',barText:'#6b5c0d' }, a: '#ff9100' },
      { n: 'Tropical', g: 'vivid', c: { bg:'#e8fff7',box:'#ffffff',panel:'#ffffff',line:'#a8f0d4',text:'#002e22',mute:'#2d7a62',bar:'#c9fae8',barText:'#266b55' }, a: '#00c389' },
      { n: 'Coral Reef', g: 'vivid', c: { bg:'#fff1ee',box:'#ffffff',panel:'#ffffff',line:'#ffd0c7',text:'#3a1410',mute:'#8a4a40',bar:'#ffe0da',barText:'#7a4036' }, a: '#ff4d4d' },
      { n: 'Electric Lilac', g: 'vivid', c: { bg:'#f3ecff',box:'#ffffff',panel:'#ffffff',line:'#dcc8ff',text:'#240a45',mute:'#6a4a99',bar:'#e9dcff',barText:'#5f4390' }, a: '#8a2be2' },
      { n: 'Sunny Day', g: 'vivid', c: { bg:'#fffde7',box:'#ffffff',panel:'#ffffff',line:'#fff0a0',text:'#2a2400',mute:'#756a12',bar:'#fff7c2',barText:'#665c0f' }, a: '#f5a800' },
      { n: 'Sky Pop', g: 'vivid', c: { bg:'#e6f6ff',box:'#ffffff',panel:'#ffffff',line:'#b3e0ff',text:'#00233a',mute:'#2f6a92',bar:'#d2eeff',barText:'#2a5f85' }, a: '#0091ff' },
      { n: 'Fresh Lime', g: 'vivid', c: { bg:'#f4ffe0',box:'#ffffff',panel:'#ffffff',line:'#d6f59a',text:'#1a2b00',mute:'#527a12',bar:'#e8fbbd',barText:'#496d10' }, a: '#6cc800' },
      { n: 'Sunburst', g: 'vivid', c: { bg: '#fff1bd', box: '#fff9e8', panel: '#ffffff', line: '#f0d06d', text: '#2b1d00', mute: '#5f4a00', bar: '#ffe27f', barText: '#3d2c00' }, a: '#c24a00' },   // 1.59
      { n: 'Flamingo', g: 'vivid', c: { bg: '#ffdcea', box: '#fff2f7', panel: '#ffffff', line: '#f2a9c6', text: '#3a0a1f', mute: '#7e2a4a', bar: '#ffc2da', barText: '#4f1129' }, a: '#c80f55' },   // 1.59
      { n: 'Aqua Pop', g: 'vivid', c: { bg: '#d2f6ff', box: '#effcff', panel: '#ffffff', line: '#90d9ec', text: '#002a35', mute: '#1d5a6a', bar: '#afeeff', barText: '#00384a' }, a: '#0068b8' },   // 1.59
      { n: 'Lime Soda', g: 'vivid', c: { bg: '#e3ffcc', box: '#f4ffea', panel: '#ffffff', line: '#afe383', text: '#0f2900', mute: '#375c14', bar: '#cdf7a6', barText: '#1a3d00' }, a: '#2a8a00' },   // 1.59
      { n: 'Grape Soda', g: 'vivid', c: { bg: '#eadcff', box: '#f7f1ff', panel: '#ffffff', line: '#c5a9f3', text: '#1e0a3f', mute: '#53368a', bar: '#d9c5ff', barText: '#2e1460' }, a: '#6d22e0' },   // 1.59
      { n: 'Tangerine', g: 'vivid', c: { bg: '#ffdfc7', box: '#fff3e8', panel: '#ffffff', line: '#f4b98a', text: '#331300', mute: '#723a0f', bar: '#ffcca3', barText: '#4a1d00' }, a: '#c44d00' },   // 1.59
      { n: 'Neon Day', g: 'neon', c: { bg:'#ffffff',box:'#ffffff',panel:'#ffffff',line:'#e0e0e0',text:'#10002b',mute:'#4a3a70',bar:'#f5f0ff',barText:'#4a3a70' }, a: '#e100ff' },
      { n: 'Electric Cyan', g: 'neon', c: { bg:'#effcff',box:'#ffffff',panel:'#ffffff',line:'#a8ecfa',text:'#002933',mute:'#1f6a7d',bar:'#d4f7ff',barText:'#1c5f70' }, a: '#00b8d9' },
      { n: 'High Contrast', g: 'contrast', c: { bg: '#ffffff', box: '#ffffff', panel: '#ffffff', line: '#575757', text: '#000000', mute: '#2b2b2b', bar: '#ffffff', barText: '#1a1a1a' }, a: '#0050c8' },
      { n: 'Catppuccin Frappé Light', g: 'modern', c: { bg: '#e6e9ef', box: '#f5f6f9', panel: '#ffffff', line: '#c9cdd9', text: '#4c4f69', mute: '#5c5f77', bar: '#dce0e8', barText: '#5c5f77' }, a: '#687ffd' },
      { n: 'Tomorrow Light', g: 'classic', c: { bg: '#f7f7f6', box: '#ffffff', panel: '#ffffff', line: '#dcdcda', text: '#4d4d4c', mute: '#6a6a68', bar: '#ebebe9', barText: '#62625f' }, a: '#4778b9' },
      { n: 'Newsprint', g: 'classic', c: { bg: '#f2efe8', box: '#faf8f3', panel: '#fdfcf9', line: '#d9d4c7', text: '#1f1d19', mute: '#5e594e', bar: '#e8e4d8', barText: '#575246' }, a: '#c1590a' },
      { n: 'Sepia', g: 'classic', c: { bg: '#f4ecd8', box: '#faf3e1', panel: '#fdf8ea', line: '#dccfb0', text: '#433422', mute: '#6b5a41', bar: '#ebe1c8', barText: '#625239' }, a: '#a7692c' },
      { n: 'GitHub Soft', g: 'modern', c: { bg: '#f6f8fa', box: '#ffffff', panel: '#ffffff', line: '#d8dee4', text: '#24292f', mute: '#57606a', bar: '#eaeef2', barText: '#57606a' }, a: '#1c8a3c' },
      { n: 'Ash', g: 'mono', c: { bg: '#eeeeee', box: '#ffffff', panel: '#ffffff', line: '#d6d6d6', text: '#1a1a1a', mute: '#5c5c5c', bar: '#e7e7e7', barText: '#575757' }, a: '#777777' },
      { n: 'Concrete', g: 'mono', c: { bg: '#ececeb', box: '#ffffff', panel: '#ffffff', line: '#d5d4d3', text: '#1b1a18', mute: '#5d5c5b', bar: '#e5e4e3', barText: '#585756' }, a: '#cf7106' },
      { n: 'Linen', g: 'earth', c: { bg: '#f6f3ee', box: '#ffffff', panel: '#ffffff', line: '#e2dcd2', text: '#221c11', mute: '#685f4f', bar: '#f1ece4', barText: '#625a4b' }, a: '#d4470d' },
      { n: 'Oat', g: 'earth', c: { bg: '#f3f1ec', box: '#ffffff', panel: '#ffffff', line: '#dedad1', text: '#221d11', mute: '#656052', bar: '#eeeae2', barText: '#605a4e' }, a: '#b1810b' },
      { n: 'Sage', g: 'earth', c: { bg: '#f0f3ef', box: '#ffffff', panel: '#ffffff', line: '#d6ddd5', text: '#161f14', mute: '#586156', bar: '#e7ece6', barText: '#535c51' }, a: '#5b9847' },
      { n: 'Olive Light', g: 'earth', c: { bg: '#f2f3ec', box: '#ffffff', panel: '#ffffff', line: '#dcded1', text: '#1f2211', mute: '#626553', bar: '#ecede3', barText: '#5d5f4e' }, a: '#81911a' },
      { n: 'Latte Cream', g: 'earth', c: { bg: '#f7f4f0', box: '#ffffff', panel: '#ffffff', line: '#e2dbd5', text: '#221a11', mute: '#665c51', bar: '#f1ece7', barText: '#61574d' }, a: '#a8683c' },
      { n: 'Pastel Blue', g: 'pastel', c: { bg: '#eff4f8', box: '#ffffff', panel: '#ffffff', line: '#d1dbe6', text: '#111922', mute: '#4b5c6c', bar: '#e4ecf4', barText: '#475766' }, a: '#418be1' },
      { n: 'Pastel Green', g: 'pastel', c: { bg: '#edf8f1', box: '#ffffff', panel: '#ffffff', line: '#cfe5d8', text: '#112218', mute: '#4b6c59', bar: '#e2f3e9', barText: '#476654' }, a: '#369a6d' },
      { n: 'Seafoam', g: 'pastel', c: { bg: '#edf7f6', box: '#ffffff', panel: '#ffffff', line: '#d0e4e1', text: '#11221f', mute: '#4d6b66', bar: '#e3f2f0', barText: '#486560' }, a: '#1a9a88' },
      { n: 'Ocean Light', g: 'modern', c: { bg: '#edf4f8', box: '#ffffff', panel: '#ffffff', line: '#cfdee5', text: '#111c22', mute: '#4b616c', bar: '#e2edf3', barText: '#475c66' }, a: '#0891b2' },
      { n: 'Lilac Mist', g: 'modern', c: { bg: '#f1eef6', box: '#ffffff', panel: '#ffffff', line: '#d8d2e2', text: '#171122', mute: '#584f68', bar: '#e9e4f1', barText: '#544b62' }, a: '#7d5df0' },
      { n: 'Rose Quartz', g: 'modern', c: { bg: '#f8f0f2', box: '#ffffff', panel: '#ffffff', line: '#e4d2d7', text: '#221115', mute: '#6a4e55', bar: '#f3e5e9', barText: '#644a50' }, a: '#d6487a' },
      { n: 'Retro Paper', g: 'retro', c: { bg: '#f5e6c8', box: '#fbf0da', panel: '#fdf6e6', line: '#d9c294', text: '#3b2a14', mute: '#6a5330', bar: '#ecd9b0', barText: '#5e4a2a' }, a: '#d4470d' },
      { n: 'Old Terminal Light', g: 'retro', c: { bg: '#e8f5e9', box: '#f3fbf4', panel: '#ffffff', line: '#b8dcbc', text: '#0b3d12', mute: '#2f6b3a', bar: '#d4ecd7', barText: '#2a5f34' }, a: '#1b9e3a' },
      { n: 'Blue Contrast', g: 'contrast', c: { bg: '#ffffff', box: '#ffffff', panel: '#ffffff', line: '#4a4a4a', text: '#000000', mute: '#262626', bar: '#ffffff', barText: '#111111' }, a: '#0e6fff' },
      { n: 'Warm Contrast', g: 'contrast', c: { bg: '#fffdf5', box: '#ffffff', panel: '#ffffff', line: '#5c4a00', text: '#000000', mute: '#2e2500', bar: '#fffdf5', barText: '#1a1500' }, a: '#a46b00' }]
  };
  var lsGet = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var lsSet = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var presetAccent = lsGet('ix-pacc') !== '0', presetGroup = lsGet('ix-pgroup') || 'all';   // remembered in this browser
  var colorMode = '', pgSel = 'home';
  /* the preset gallery: group chips (remembered), then the presets of that group, or all of them under headings */
  /* the looks you saved (kept with your settings, so they are in every backup) are listed with the built-in ones */
  function presetList(m) {
    return PRESETS[m].concat((S.myPresets || []).map(function (mp) { return { n: mp.n, g: 'mine', c: Array.isArray(mp[m]) ? {} : JSON.parse(JSON.stringify(mp[m] || {})), a: mp.a || '' }; }));
  }
  function saveMine(list) {
    return api('settings', { settings: { myPresets: list } }).then(function (j) {
      if (!j.ok || !j.state) throw new Error(j.error || 'Could not save.');
      S.myPresets = j.state.myPresets || []; return S.myPresets;
    });
  }
  function presetsHtml(m, set, def) {
    var list = presetList(m), acc0 = draft.accent || S.accent || '#ffc21a';
    var same = function (a, b) { var ka = Object.keys(a).filter(function (k) { return a[k]; }).sort(), kb = Object.keys(b).filter(function (k) { return b[k]; }).sort();
      return ka.join() === kb.join() && ka.every(function (k) { return String(a[k]).toLowerCase() === String(b[k]).toLowerCase(); }); };
    var isOn = function (pr) { return same(pr.c, set) && (!presetAccent || !pr.a || pr.a === draft.accent); };
    var current = list.filter(isOn)[0];
    var groups = PRESET_GROUPS.filter(function (g) { return list.some(function (pr) { return pr.g === g[0]; }); });
    // the remembered group, or All when this mode has none of it (the choice is kept for the other mode)
    var grp = presetGroup !== 'all' && groups.some(function (g) { return g[0] === presetGroup; }) ? presetGroup : 'all';
    var card = function (pr) {
      var i = list.indexOf(pr), c = Object.assign({}, def, pr.c), acc = presetAccent && pr.a ? pr.a : acc0;
      return '<button type="button" class="ix-preset" data-pre="' + i + '" data-g="' + pr.g + '" data-name="' + esc(pr.n.toLowerCase()) + '" aria-pressed="' + isOn(pr) + '" title="' + esc(pr.n) + (pr.a ? ' (accent ' + pr.a + ')' : '') + '">' +
        miniPage(c, acc) + '<span class="ix-pn">' + esc(pr.n) + '</span><small class="ix-pgl">' + esc((PRESET_GROUPS.filter(function (g) { return g[0] === pr.g; })[0] || ['', ''])[1]) + '</small></button>';
    };
    var body = groups.map(function (g) { return '<span class="ix-psep" data-g="' + g[0] + '">' + g[1] + '</span>' + list.filter(function (pr) { return pr.g === g[0]; }).map(card).join(''); }).join('');
    return '<details class="ix-acc" id="ix-presets"' + '' + '><summary><span>Presets</span><small>' + (current ? 'Now: ' + esc(current.n) : Object.keys(set).length ? 'Now: Your Own Mix' : 'Now: Built-In') + ' · ' + list.length + ' looks for ' + (m === 'dark' ? 'dark' : 'light') + ' mode</small></summary><div class="ix-accb">' +
      '<p>One click fills the whole mode; fine-tune any color in the Colors tab afterwards.</p>' +
      '<label class="ix-tg" style="margin:0 0 10px"><span>Use the Preset\'s Accent Color<small>Presets like Dracula or Nord bring their own accent. Off keeps yours.</small></span><input type="checkbox" id="ix-pacc"' + (presetAccent ? ' checked' : '') + '></label>' +
      '<div class="ix-sur" id="ix-sur" aria-live="polite"><div class="ix-surpv" id="ix-surpv"></div><div class="ix-surt"><h4>Surprise Me</h4><h3 id="ix-surn">A New Mix</h3>' +
        '<p>A colour mix made just now for ' + (m === 'dark' ? 'dark' : 'light') + ' mode, checked to be easy to read. Not one of the presets.</p>' +
        '<div class="ix-row"><button type="button" class="ix-btn pri" id="ix-sura">' + svg(ICON.sparkle) + 'Another One</button><button type="button" class="ix-btn" id="ix-suru">Use It</button><button type="button" class="ix-btn" id="ix-surs">Save to My Presets</button></div>' +
        '<div class="ix-surw" id="ix-surw" hidden><span class="ix-spin" aria-hidden="true"><i></i><i></i><i></i></span><small>Mixing…</small></div></div></div>' +
      '<div class="ix-ptools"><input type="search" id="ix-psearch" class="ix-psearch" placeholder="Search ' + list.length + ' Presets" aria-label="Search Presets" autocomplete="off" spellcheck="false"></div>' +
      '<details class="ix-more ix-mypre" id="ix-mypre"' + ((S.myPresets || []).length ? ' open' : '') + '><summary>My Presets: Save, Share, Delete</summary>' +
        '<p>Save the colors and accent you have now (both dark and light) as a preset of your own. It appears under My Presets and is kept in your backups.</p>' +
        '<div class="ix-row"><input type="text" id="ix-mpn" maxlength="30" placeholder="Name This Look" aria-label="Name for this look" style="flex:1;min-width:180px"><button type="button" class="ix-btn pri" id="ix-mps">Save Current Look</button></div>' +
        ((S.myPresets || []).length ? '<div class="ix-devs" style="margin-top:12px">' + S.myPresets.map(function (mp, i) { return '<div class="ix-dev"><span class="ix-dev-i" style="background:' + esc(mp.a || '#888') + '"></span><div class="ix-dev-b"><b>' + esc(mp.n) + '</b></div><button type="button" class="ix-btn danger" data-hold title="Hold to delete" data-mpd="' + i + '">Delete</button></div>'; }).join('') + '</div>' : '') +
        '<div class="ix-row" style="margin-top:12px"><button type="button" class="ix-btn" id="ix-mpx">' + svg(ICON.down) + 'Export My Presets</button><label class="ix-btn" for="ix-mpf">' + svg(ICON.upload) + 'Import Presets</label><input type="file" id="ix-mpf" accept=".json,application/json" hidden></div>' +
        '<p class="ix-err" id="ix-mpe"></p></details>' +
      '<div class="ix-pfilt" role="group" aria-label="Preset Groups"><button type="button" data-pg-f="all" aria-pressed="' + (grp === 'all') + '">All <small>' + list.length + '</small></button>' +
        groups.map(function (g) { var n = list.filter(function (pr) { return pr.g === g[0]; }).length; return '<button type="button" data-pg-f="' + g[0] + '" aria-pressed="' + (grp === g[0]) + '">' + g[1] + ' <small>' + n + '</small></button>'; }).join('') + '</div>' +
      '<div class="ix-pcount" id="ix-pcount" aria-live="polite"></div>' +
      '<div class="ix-presets" id="ix-pgrid" data-grp="' + grp + '">' + body + '</div><p class="ix-note ix-pnone" id="ix-pnone" hidden>No preset matches that name. Try a color or a style, like "blue", "mint" or "terminal".</p></div></details>';
  }
  function pColors(p) {
    var cur = draft.colors = draft.colors || {};
    ['dark', 'light', 'pg'].forEach(function (m) { if (!cur[m] || Array.isArray(cur[m])) cur[m] = {}; });   // PHP sends an empty set as []
    PG_APPS.forEach(function (a) { if (!cur.pg[a[0]] || Array.isArray(cur.pg[a[0]])) cur.pg[a[0]] = {}; });
    var m = colorMode || (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'); colorMode = m;
    var set = cur[m], def = COLOR_DEFAULT[m];
    var anyPg = PG_APPS.some(function (a) { return cur.pg[a[0]][m]; }) || Object.keys(draft.accentPg || {}).length > 0;
    var pgs = [['home', 'Start Page']].concat(PG_APPS);
    var own = function (id) { return !!((cur.pg[id] && cur.pg[id][m]) || (draft.accentPg || {})[id]); };
    if (!pgs.some(function (a) { return a[0] === pgSel; })) pgSel = 'home';
    var pgBg = pgSel === 'home' ? '' : cur.pg[pgSel][m], pgAc = (draft.accentPg || {})[pgSel];
    var row = function (k, label, val, shown, attrs) {
      val = /^#[0-9a-f]{6}$/i.test(String(val || '')) ? String(val) : ''; shown = /^#[0-9a-f]{6}$/i.test(String(shown || '')) ? String(shown) : '#000000';   // only a real colour code reaches the page
      return '<div class="ix-cr"><span>' + esc(label) + '</span><input type="color" ' + attrs + ' value="' + esc(shown) + '" aria-label="' + esc(label) + '">' +
        '<input type="text" class="ix-hex" maxlength="7" placeholder="' + esc(shown) + '" value="' + esc(val) + '" spellcheck="false" aria-label="' + esc(label) + ', hex code">' +
        '<button type="button" class="ix-ib ix-crx" title="Back to the Default"' + (val ? '' : ' hidden') + ' aria-label="Reset ' + esc(label) + '">↺</button></div>';
    };
    p.innerHTML = '<div class="ix-row" style="gap:10px">' + seg('cmode', [['dark', 'Dark Mode'], ['light', 'Light Mode']], m) +
      '<button type="button" class="ix-btn" id="ix-cres">Reset ' + (m === 'dark' ? 'Dark' : 'Light') + ' Mode</button></div>' +
      '<p class="ix-note" style="margin:0 0 12px">Ready-made looks live in the <b>Presets</b> tab.</p>' + accentHtml() +
      COLOR_GROUPS.map(function (g) {
        return '<div class="ix-cgrp"><h4>' + g[0] + '</h4><p>' + g[1] + '</p>' + g[2].map(function (k) {
          return row(k[0], k[1], set[k[0]], set[k[0]] || def[k[0]], 'data-k="' + k[0] + '"');
        }).join('') + '</div>';
      }).join('') +
      '<div class="ix-cgrp ix-pgc" id="ix-pgc"><h4>Different Colors per Page</h4><p>' + (anyPg ? 'The dot marks pages with colors of their own.' : 'Every page uses the colors above. Pick a page to give it its own.') + '</p>' +
        seg('pgsel', pgs.map(function (a) { return [a[0], esc(a[1]) + (own(a[0]) ? '<i class="ix-pgdot" aria-label="has its own colors"></i>' : '')]; }), pgSel) +
        '<div class="ix-pgrows">' +
          (pgSel === 'home' ? '' : row('', 'Background', pgBg, pgBg || set.bg || def.bg, 'data-pg="' + pgSel + '"')) +
          row('', 'Accent', pgAc, pgAc || draft.accent || '#ffc21a', 'data-ap="' + pgSel + '"') +
        '</div></div>' +
      '<p class="ix-note">Tab colors: the pencil on each tab.</p>';
    bindSeg(p, function (k, v) { if (k === 'cmode') { colorMode = v; K.previewTheme(v); pColors(p); } else if (k === 'pgsel') { pgSel = v; pColors(p); } });
    p.querySelectorAll('.ix-cr').forEach(function (r) {
      var sw = r.querySelector('input[type=color]'), tx = r.querySelector('.ix-hex'), x = r.querySelector('.ix-crx');
      var put = function (v) {
        if (sw.dataset.ap) { draft.accentPg = draft.accentPg || {}; if (v) draft.accentPg[sw.dataset.ap] = v; else delete draft.accentPg[sw.dataset.ap]; }
        else if (sw.dataset.pg) { if (v) cur.pg[sw.dataset.pg][m] = v; else delete cur.pg[sw.dataset.pg][m]; }
        else { if (v) set[sw.dataset.k] = v; else delete set[sw.dataset.k]; }
        x.hidden = !v; preview(); if (sw.dataset.pg || sw.dataset.ap) { var d = p.querySelector('[data-seg=pgsel] [aria-pressed=true]'); if (d) { var had = d.querySelector('.ix-pgdot'), id = sw.dataset.pg || sw.dataset.ap; if (own(id) && !had) d.insertAdjacentHTML('beforeend', '<i class="ix-pgdot" aria-label="has its own colors"></i>'); else if (!own(id) && had) had.remove(); } }
      };
      bindHex(sw, tx, put, true);
      x.onclick = function () { tx.value = ''; sw.value = tx.placeholder; put(''); };
    });
    bindAccent(p);
    p.querySelector('#ix-cres').onclick = function () { cur[m] = {}; PG_APPS.forEach(function (a) { delete cur.pg[a[0]][m]; }); preview(); pColors(p); };
  }
  /* Appearance > Presets: the whole gallery on its own tab, dark or light mode, one click fills every color */
  /* (1.65.0) a preset card's picture: a small page in its colours (the bar with its pages, two boxes with text, an accent button) */
  function miniPage(c, acc) {
    return '<span class="ix-pv" style="background:' + c.bg + ';border-color:' + c.line + '"><i style="background:' + c.bar + '"><em style="background:' + c.mute + '"></em><em style="background:' + acc + '"></em><em style="background:' + c.mute + '"></em><em style="background:' + c.mute + '"></em></i>' +
      '<b style="background:' + c.box + ';border-color:' + c.line + '"><em style="background:' + c.text + '"></em><em style="background:' + c.mute + '"></em><em style="background:' + c.mute + '"></em></b>' +
      '<b style="background:' + c.box + ';border-color:' + c.line + '"><em style="background:' + c.text + '"></em><em style="background:' + c.mute + '"></em></b><u style="background:' + acc + '"></u></span>';
  }
  /* (1.65.0) Surprise Me: a new colour mix, not one of the presets. One hue for the page, another for the accent; tried again until the
     text and the muted text are easy to read on the boxes (contrast 7 and 4.5, the rules the presets pass) and the accent stands out. */
  function hslHex(h, s, l) {
    s /= 100; l /= 100; var k = function (n) { return (n + h / 30) % 12; }, a = s * Math.min(l, 1 - l);
    var f = function (n) { return Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))))).toString(16).padStart(2, '0'); };
    return '#' + f(0) + f(8) + f(4);
  }
  function luminance(hex) { var v = [1, 3, 5].map(function (i) { var x = parseInt(hex.substr(i, 2), 16) / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; }
  function contrastOf(a, b) { var x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  var MIX_HUE = [[15, 'Ember'], [35, 'Amber'], [55, 'Gold'], [80, 'Lime'], [120, 'Moss'], [160, 'Jade'], [180, 'Teal'], [195, 'Lagoon'], [215, 'Ocean'], [235, 'Indigo'], [260, 'Violet'], [285, 'Plum'], [315, 'Orchid'], [340, 'Rose'], [361, 'Ember']];
  var MIX_MOOD = { dark: ['Dusk', 'Night', 'Haze', 'Deep', 'Midnight', 'Shadow', 'Velvet'], light: ['Morning', 'Mist', 'Paper', 'Cloud', 'Linen', 'Daylight', 'Breeze'] };
  function mixColors(mode) {
    var R = function (a, b) { return a + Math.random() * (b - a); };
    for (var tries = 0; tries < 40; tries++) {
      var h = Math.round(R(0, 360)), s = R(12, 32), ah = Math.round((h + R(120, 220)) % 360), c;
      if (mode === 'dark') c = { bg: hslHex(h, s, R(5, 9)), bar: hslHex(h, s, R(3, 6)), box: hslHex(h, s, R(10, 14)), panel: hslHex(h, s, R(13, 17)), line: hslHex(h, s * .9, R(20, 26)),
        text: hslHex(h, R(8, 20), R(87, 93)), mute: hslHex(h, R(6, 14), R(62, 70)), barText: hslHex(h, R(6, 14), R(62, 70)), accent: hslHex(ah, R(70, 90), R(60, 68)) };
      else c = { bg: hslHex(h, s, R(94, 97)), bar: hslHex(h, s, R(90, 93)), box: hslHex(h, s * .6, R(98, 100)), panel: hslHex(h, s * .6, R(97, 99)), line: hslHex(h, s * .8, R(82, 87)),
        text: hslHex(h, R(15, 30), R(10, 16)), mute: hslHex(h, R(8, 16), R(34, 40)), barText: hslHex(h, R(8, 16), R(34, 40)), accent: hslHex(ah, R(65, 85), R(38, 46)) };
      if (contrastOf(c.text, c.box) >= 7 && contrastOf(c.mute, c.box) >= 4.5 && contrastOf(c.mute, c.bg) >= 4.5 && contrastOf(c.accent, c.bg) >= 3) {
        var hn = MIX_HUE.filter(function (x) { return h < x[0]; })[0][1], md = MIX_MOOD[mode];
        return { n: hn + ' ' + md[Math.floor(Math.random() * md.length)], c: c, a: c.accent };
      }
    }
    return null;
  }
  var lastMix = { dark: null, light: null };
  /* (1.68.2) Appearance > Glass; (1.68.4) one glass for the whole site: the bar, the dock, the Home widgets and the places under Where.
     The real bar and the preview follow each move (preview); Save keeps it. */
  function pGlass(p) {
    draft.glassFx = canonGfx(draft.glassFx);
    var fx = draft.glassFx, val = function (k, d) { return typeof fx[k] === 'number' ? fx[k] : d; };
    var ua = navigator.userAgent, bends = !((/Safari/.test(ua) && !/Chrome/.test(ua)) || /Firefox/.test(ua));
    var picked = GPICKS.filter(function (k) { return gLook(canonGfx(k[2])) === gLook(fx); })[0];
    var slider = function (g) { var v = val(g[0], g[5]);
      return '<div class="ix-tsf ix-gxf"><label for="ix-gx-' + g[0] + '">' + g[1] + '<small>' + esc(g[2]) + '</small></label><div class="ix-tsr"><input type="range" id="ix-gx-' + g[0] + '" data-g="' + g[0] + '" min="' + g[3] + '" max="' + g[4] + '" step="1" value="' + v + '"><output>' + v + g[6] + '</output></div></div>'; };
    var sw = function (id, name, help, on, off) { return '<label class="ix-tg"><span>' + name + '<small>' + esc(help) + '</small></span><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + (off ? ' disabled' : '') + '></label>'; };
    var photo = ROOT + 'web/home/starter/mountains.jpg';
    p.innerHTML = '<h3>Glass</h3><p>One glass for the whole site: the top bar or the dock, the Home widgets, and the places you pick under Where.</p>' +
        sw('ix-glass2', 'Glass on the Bar', 'The top bar or the dock (not the sidebar). The Home widgets are always glass.', draft.glass) +
        '<div class="ix-gpv" aria-hidden="true"><i class="ix-gpvb"><b></b><b></b><b></b><em></em></i>' +
          '<i class="ix-gpvc">6:13</i><i class="ix-gpvw"><b>Note</b><span>Buy milk. Call the plumber on Monday.</span></i><i class="ix-gpvd"><b></b><b></b><b></b><b></b><b></b></i></div>' +
        '<p class="ix-note">The preview follows every change. ' + (bends ? 'Liquid shows on the real glass (with Only Over Photos: on the start page).' : 'This browser shows frosted glass: Liquid, Edge Width and Colour Fringe change nothing here; Chrome and Edge show them.') + '</p>' +
      '<h3>Quick Picks</h3><p>A starting point; everything below fine-tunes it. Solid is easiest to read on busy photos.</p>' + seg('gpick', GPICKS.map(function (k) { return [k[0], k[1]]; }), picked ? picked[0] : '') +
      '<h3>Fine-Tune</h3><p>Every glass on the site follows these.</p>' +
        '<div class="ix-gxt"><span>Tone<small>Auto follows the theme; Light and Dark keep one look.</small></span>' + seg('gtone', [['0', 'Auto'], ['1', 'Light'], ['2', 'Dark']], String(val('tone', 0))) + '</div>' +
        GFX.filter(function (g) { return g[7] === 'fine'; }).map(slider).join('') +
      '<h3>Liquid</h3><p>Bends what is under the edges, with a colour fringe (React Bits\' GlassSurface). Over text it mirrors the words a little, so by default it shows only over the start page\'s photo.</p>' +
        GFX.filter(function (g) { return g[7] === 'liquid'; }).map(slider).join('') +
        sw('ix-gphoto', 'Only Over Photos', 'Liquid on the start page (the photo); plain glass on pages of text.', val('photo', 1) === 1) +
      '<h3>Where</h3><p>Glass in more places, each on its own switch. These stay easy to read: they keep most of their own colour.</p>' +
        sw('ix-gwhome', 'Home Widgets', 'Today, Countdown, Note, Calendar, Quote and the open widget.', true, true) +
        GWHERE.map(function (w) { return sw('ix-g' + w[0], w[1], w[2], val(w[0], 0) === 1); }).join('') +
        '<div class="ix-acts"><button type="button" class="ix-btn" id="ix-gxr">Reset to Default</button></div>';
    p.querySelector('.ix-gpv').style.backgroundImage = 'url("' + photo + '")';   // the start page's own mountain photo
    var setFx = function (k, v) { var o = Object.assign({}, draft.glassFx); o[k] = v; draft.glassFx = canonGfx(o); };
    var markPick = function () { var pk = GPICKS.filter(function (k) { return gLook(canonGfx(k[2])) === gLook(draft.glassFx); })[0];
      p.querySelectorAll('[data-seg="gpick"] button').forEach(function (b) { b.setAttribute('aria-pressed', pk && b.dataset.v === pk[0] ? 'true' : 'false'); }); };
    p.querySelector('#ix-glass2').onchange = function (e) { draft.glass = e.target.checked; preview(); };
    p.querySelector('#ix-gphoto').onchange = function (e) { setFx('photo', e.target.checked ? 1 : 0); preview(); };
    GWHERE.forEach(function (w) { p.querySelector('#ix-g' + w[0]).onchange = function (e) { setFx(w[0], e.target.checked ? 1 : 0); preview(); }; });
    bindSeg(p, function (k, v) {
      if (k === 'gtone') { setFx('tone', +v); preview(); return; }
      if (k !== 'gpick') return;
      var pk = GPICKS.filter(function (x) { return x[0] === v; })[0], o = Object.assign({}, draft.glassFx);
      GLOOK.forEach(function (key) { delete o[key]; }); Object.assign(o, pk ? pk[2] : {});
      draft.glassFx = canonGfx(o); preview(); var y = p.closest('.ix-pane') ? p.closest('.ix-pane').scrollTop : 0; pGlass(p); if (p.closest('.ix-pane')) p.closest('.ix-pane').scrollTop = y;
    });
    p.querySelectorAll('[data-g]').forEach(function (r) {
      var g = GFX.filter(function (x) { return x[0] === r.dataset.g; })[0];
      r.oninput = function () { setFx(g[0], +r.value); r.nextElementSibling.textContent = r.value + g[6]; markPick(); preview(); };
    });
    p.querySelector('#ix-gxr').onclick = function () { draft.glassFx = {}; preview(); pGlass(p); };
  }
  function pThemes(p) {
    var cur = draft.colors = draft.colors || {};
    ['dark', 'light', 'pg'].forEach(function (k) { if (!cur[k] || Array.isArray(cur[k])) cur[k] = {}; });
    PG_APPS.forEach(function (a) { if (!cur.pg[a[0]] || Array.isArray(cur.pg[a[0]])) cur.pg[a[0]] = {}; });
    var m = colorMode || (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'); colorMode = m;
    var set = cur[m], def = COLOR_DEFAULT[m];
    var html = presetsHtml(m, set, def)
      .replace(/<details class="ix-acc" id="ix-presets"[^>]*><summary><span>Presets<\/span><small>([\s\S]*?)<\/small><\/summary><div class="ix-accb">/, '<div class="ix-flatp" id="ix-presets"><p class="ix-note ix-fh">$1</p><div class="ix-fb">')
      .replace(/<\/div><\/details>$/, '</div></div>');
    p.innerHTML = '<div class="ix-row" style="gap:10px">' + seg('cmode', [['dark', 'Dark Mode'], ['light', 'Light Mode']], m) +
      '<button type="button" class="ix-btn" id="ix-cres">Reset ' + (m === 'dark' ? 'Dark' : 'Light') + ' Mode</button></div>' + html +
      '<p class="ix-note">Fine-tune any color in the Colors tab. The accent color is in the Appearance tab.</p>';
    bindSeg(p, function (k, v) { if (k === 'cmode') { colorMode = v; K.previewTheme(v); pThemes(p); } });
    p.querySelector('#ix-pacc').onchange = function (e) { presetAccent = e.target.checked; lsSet('ix-pacc', presetAccent ? '1' : '0'); var y = p.closest('.ix-pane').scrollTop; pThemes(p); p.closest('.ix-pane').scrollTop = y; };
    /* group chips and the search box only show and hide cards that are already drawn (no redraw, so typing keeps its place) */
    var grid = p.querySelector('#ix-pgrid'), search = p.querySelector('#ix-psearch'), cards = [].slice.call(grid.querySelectorAll('.ix-preset')), seps = [].slice.call(grid.querySelectorAll('.ix-psep'));
    function applyFilter() {
      var t = search.value.trim().toLowerCase(), g = grid.dataset.grp, shown = 0;
      cards.forEach(function (c) { var hide = t ? c.dataset.name.indexOf(t) < 0 : (g !== 'all' && c.dataset.g !== g); c.hidden = hide; if (!hide) shown++; });
      seps.forEach(function (sp) { sp.hidden = !!t || g !== 'all'; });
      p.querySelector('#ix-pcount').textContent = t ? shown + ' of ' + cards.length + ' match' + (shown === 1 ? 'es' : '') : (g === 'all' ? cards.length + ' presets' : shown + ' in this group');
      p.querySelector('#ix-pnone').hidden = shown > 0;
    }
    search.oninput = applyFilter;
    p.querySelectorAll('[data-pg-f]').forEach(function (b) { b.onclick = function () {
      presetGroup = b.dataset.pgF; lsSet('ix-pgroup', presetGroup); grid.dataset.grp = presetGroup; search.value = '';
      p.querySelectorAll('[data-pg-f]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); applyFilter();
    }; });
    /* Surprise Me: Another One mixes again (the loader shows for a moment), Use It fills this mode's colours and the accent like a preset
       (Save Settings keeps them), Save to My Presets keeps the mix by its name. */
    var showMix = function (mx) {
      p.querySelector('#ix-surpv').innerHTML = miniPage(Object.assign({}, def, mx.c), mx.a);
      p.querySelector('#ix-surn').textContent = mx.n;
    };
    if (!lastMix[m]) lastMix[m] = mixColors(m);
    if (lastMix[m]) showMix(lastMix[m]);
    p.querySelector('#ix-sura').onclick = function () {
      var w = p.querySelector('#ix-surw'), bt = this; w.hidden = false; bt.disabled = true;
      setTimeout(function () { var mx = mixColors(m); if (mx) { lastMix[m] = mx; showMix(mx); } w.hidden = true; bt.disabled = false; }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450);
    };
    p.querySelector('#ix-suru').onclick = function () {
      var mx = lastMix[m]; if (!mx) return;
      cur[m] = JSON.parse(JSON.stringify(mx.c)); delete cur[m].accent; draft.accent = mx.a;
      var y = p.closest('.ix-pane').scrollTop; preview(); pThemes(p); p.closest('.ix-pane').scrollTop = y;
      toast('"' + mx.n + '" is on. Save Settings keeps it.');
    };
    p.querySelector('#ix-surs').onclick = function () {
      var mx = lastMix[m]; if (!mx) return;
      var mine = (S.myPresets || []).filter(function (x) { return x.n !== mx.n; }), c = JSON.parse(JSON.stringify(mx.c)); delete c.accent;
      var item = { n: mx.n, a: mx.a, dark: JSON.parse(JSON.stringify(cur.dark || {})), light: JSON.parse(JSON.stringify(cur.light || {})) }; item[m] = c;
      mine.push(item);
      saveMine(mine.slice(-40)).then(function () { toast('Saved as "' + mx.n + '" in My Presets.'); }, function (e) { mpe.textContent = e.message; });
    };
    applyFilter();
    p.querySelectorAll('[data-pre]').forEach(function (b) { b.onclick = function () {
      var pr = presetList(m)[+b.dataset.pre];
      cur[m] = JSON.parse(JSON.stringify(pr.c));
      if (presetAccent && pr.a) draft.accent = pr.a;   // shown in Appearance too, kept with Save Settings
      var y = p.closest('.ix-pane').scrollTop; preview(); pThemes(p); p.closest('.ix-pane').scrollTop = y;
    }; });
    p.querySelector('#ix-cres').onclick = function () { cur[m] = {}; PG_APPS.forEach(function (a) { delete cur.pg[a[0]][m]; }); preview(); pThemes(p); };
    /* My Presets */
    var mpe = p.querySelector('#ix-mpe'), keepScroll = function (fn) { var y = p.closest('.ix-pane').scrollTop; fn(); p.closest('.ix-pane').scrollTop = y; };
    var again = function () { keepScroll(function () { pThemes(p); }); var n = p.querySelector('#ix-mypre'); if (n) n.open = true; };
    p.querySelector('#ix-mps').onclick = function () {
      var name = p.querySelector('#ix-mpn').value.trim(); if (!name) { mpe.textContent = 'Give this look a name first.'; return; }
      var mine = (S.myPresets || []).filter(function (x) { return x.n !== name; });
      mine.push({ n: name, a: draft.accent || '', dark: JSON.parse(JSON.stringify(cur.dark || {})), light: JSON.parse(JSON.stringify(cur.light || {})) });
      saveMine(mine.slice(-40)).then(function () { toast('Saved as "' + name + '".'); presetGroup = 'mine'; lsSet('ix-pgroup', 'mine'); again(); }, function (e) { mpe.textContent = e.message; });
    };
    p.querySelectorAll('[data-mpd]').forEach(function (b) { b.onclick = function () {
      saveMine((S.myPresets || []).filter(function (x, i) { return i !== +b.dataset.mpd; })).then(function () { toast('Deleted.'); again(); }, function (e) { mpe.textContent = e.message; }); }; });
    p.querySelector('#ix-mpx').onclick = function () {
      if (!(S.myPresets || []).length) { mpe.textContent = 'You have no presets of your own to export yet.'; return; }
      download('my-presets-' + new Date().toISOString().slice(0, 10) + '.json', 'application/json', JSON.stringify({ type: 'site-presets', version: 1, presets: S.myPresets }, null, 2)); mpe.textContent = '';
    };
    p.querySelector('#ix-mpf').onchange = function (e) {
      var f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
      if (f.size > 400000) { mpe.textContent = 'That file is too big to be a preset file.'; return; }
      var rd = new FileReader();
      rd.onload = function () {
        var j; try { j = JSON.parse(String(rd.result)); } catch (x) { mpe.textContent = 'That is not a preset file (it could not be read).'; return; }
        var list = Array.isArray(j) ? j : j && j.presets; if (!Array.isArray(list)) { mpe.textContent = 'That is not a preset file (no presets in it).'; return; }
        var mine = (S.myPresets || []).slice(), added = 0, hex = /^#[0-9a-f]{6}$/i;
        list.forEach(function (x) {
          if (!x || typeof x.n !== 'string' || !x.n.trim()) return;
          var e2 = { n: x.n.trim().slice(0, 30), a: hex.test(x.a || '') ? x.a : '', dark: {}, light: {} };
          ['dark', 'light'].forEach(function (md) { Object.keys(x[md] || {}).forEach(function (k) { if (COLOR_KEYS.some(function (c) { return c[0] === k; }) && hex.test(x[md][k])) e2[md][k] = x[md][k]; }); });
          mine = mine.filter(function (y) { return y.n !== e2.n; }); mine.push(e2); added++;
        });
        if (!added) { mpe.textContent = 'No usable presets were found in that file.'; return; }
        saveMine(mine.slice(-40)).then(function () { toast('Imported ' + added + (added === 1 ? ' preset.' : ' presets.')); presetGroup = 'mine'; lsSet('ix-pgroup', 'mine'); again(); }, function (e3) { mpe.textContent = e3.message; });
      };
      rd.readAsText(f);
    };
  }
