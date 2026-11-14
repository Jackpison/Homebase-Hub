  /* ---------- 1. before the page paints: look, nav style and theme from the last visit ---------- */
  var S = {};
  try { S = JSON.parse(ls.get('hub-state') || '{}') || {}; } catch (e) { S = {}; }
  function themeNow() {
    var t = ls.get('hub-theme') || S.theme || 'dark';
    if (t === 'auto') t = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    return t === 'light' ? 'light' : 'dark';
  }
  /* Every page remembers its theme under its own key; write them all so each page's own early script agrees. */
  function syncThemeKeys(t) {
    ls.set('bm-theme', t); ls.set('info3-theme', t); ls.set('theme4', t);
  }
  var gfx = {}, liquidHere = false;
  /* (1.68.4) One glass for the whole site (Settings > Appearance > Glass): the bar, the dock, the Home widgets and the places switched on
     under "Where" all read these variables. Defaults = the Soft pick. 1.68.3 had lost the saturation line inside a comment. */
  function glassVars() {
    var gv = function (k, d) { return typeof gfx[k] === 'number' ? gfx[k] : d; }, st = H.style;
    st.setProperty('--ix-gt', gv('tint', 20) + '%'); st.setProperty('--ix-gb', gv('frost', 3) + 'px'); st.setProperty('--ix-gs', String(gv('sat', 100) / 100));
    st.setProperty('--ix-grim', String(gv('rim', 35) / 100)); st.setProperty('--ix-gsh', String(gv('shadow', 30) / 100));
    st.setProperty('--ix-gtc', ['var(--ix-barbg,var(--ix-bg))', '#f4f4f1', '#101114'][gv('tone', 0)] || 'var(--ix-barbg,var(--ix-bg))');
    var flag = function (a, on) { if (on) H.setAttribute(a, ''); else H.removeAttribute(a); };
    flag('data-ix-gsolid', gv('solid', 0) === 1);
    flag('data-ix-gpop', gv('wpop', 0) === 1); flag('data-ix-gdrawer', gv('wdrawer', 0) === 1); flag('data-ix-gsearch', gv('wsearch', 0) === 1); flag('data-ix-gwin', gv('wwin', 0) === 1);
    // Liquid (the bending) only where it is wanted: with "Only Over Photos" (on by default) just on the start page, where the photo is
    liquidHere = (gv('bend', 0) > 0 || gv('fringe', 0) > 0) && gv('solid', 0) !== 1 && (gv('photo', 1) !== 1 || APP === 'home');
    if (!liquidHere) st.setProperty('--ix-gf', 'blur(0px)');
  }
  function applyAttrs() {
    H.setAttribute('data-ix-app', APP);
    H.setAttribute('data-ix-nav', S.nav || 'top');
    if (S.look !== false) H.setAttribute('data-ix-look', ''); else H.removeAttribute('data-ix-look');
    if (APP !== 'home' || S.homeBar === true) H.setAttribute('data-ix-bar', ''); else H.removeAttribute('data-ix-bar');
    if (S.glass === true) H.setAttribute('data-ix-glass', ''); else H.removeAttribute('data-ix-glass');   // (1.68.0) Settings > Appearance > Bar Glass
    // (1.68.2) the Glass tab: tint, frost and saturation are CSS; bend, edge and fringe go to glass.js (gfx, read by glass())
    gfx = (S.glassFx && typeof S.glassFx === 'object' && !Array.isArray(S.glassFx)) ? S.glassFx : {};
    glassVars();
    // (1.68.2) Settings > Appearance > Hide the Bar While Scrolling (on unless switched off)
    if (S.barHide === false) { H.setAttribute('data-ix-nohide', ''); H.classList.remove('ix-hide', 'ix-scrolling'); } else H.removeAttribute('data-ix-nohide');
    var acc = (S.accentPg && S.accentPg[APP]) || S.accent || '#ffc21a';   // a page can have an accent of its own (Settings > Appearance > Colors)
    H.style.setProperty('--ix-accent', acc);
    H.style.setProperty('--ix-ink', inkFor(acc));
  }
  /* The text on an accent-colored button: black or white, whichever reads better on that accent (a dark blue accent gets white text). */
  function inkFor(hex) {
    var m = /^#([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return '#000';
    var c = [0, 2, 4].map(function (i) { var v = parseInt(m[1].substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    var l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    return (l + 0.05) / 0.05 >= 1.05 / (l + 0.05) ? '#000' : '#fff';   // contrast with black against contrast with white
  }
  /* Custom colors (Settings > Appearance > Colors): which CSS variable each portion of the site sets, per page.
     Written as one <style> so every page gets them before it paints. They only apply while "Same look on every page" is on. */
  var COLOR_KEYS = [['bg', 'Page Background'], ['box', 'Boxes and Cards'], ['panel', 'Menus and Dialogs'], ['line', 'Borders'], ['text', 'Text'], ['mute', 'Secondary Text'],
                    ['bar', 'Bar Background'], ['barText', 'Bar Tabs and Icons']];
  var COLOR_DEFAULT = {
    dark: { bg: '#000000', box: '#0e0e0e', panel: '#161616', line: '#262626', text: '#f2f2f2', mute: '#a0a0a0', bar: '#000000', barText: '#a0a0a0' },
    light: { bg: '#f6f5f1', box: '#ffffff', panel: '#ffffff', line: '#e2dfd6', text: '#141414', mute: '#5f5b54', bar: '#f6f5f1', barText: '#5f5b54' }
  };
  var COLOR_VARS = {
    bg:    { all: ['--ix-bg'], links: ['--bg'], info: ['--bg'], cards: ['--bg'], tasks: ['--bg'], files: ['--bg'], tools: ['--bg', '--sidebar'] },
    box:   { all: ['--ix-s1'], links: ['--raise'], info: ['--box'], cards: ['--panel'], tasks: ['--box'], files: ['--box'], tools: ['--card'], home: ['--s-bg2'] },
    panel: { all: ['--ix-s2'], links: ['--panel'], info: ['--panel'], tasks: ['--panel'], files: ['--panel'], tools: ['--card-2'], home: ['--s-bg'] },
    line:  { all: ['--ix-line', '--ix-line2'], links: ['--line', '--line2'], info: ['--line', '--border'], cards: ['--line', '--border2'], tasks: ['--line'], files: ['--line'], tools: ['--line', '--line-2'], home: ['--s-line'] },
    text:  { all: ['--ix-tx'], links: ['--text'], info: ['--fg'], cards: ['--fg'], tasks: ['--fg'], files: ['--fg'], tools: ['--text'], home: ['--s-ink'] },
    mute:  { all: ['--ix-mu', '--ix-mu2'], links: ['--muted'], info: ['--mute'], cards: ['--mute'], tasks: ['--mute'], files: ['--mute'], tools: ['--muted'], home: ['--s-mute'] },
    bar:   { all: ['--ix-barbg'] },        // the menu bar (top bar, sidebar or dock) on every page
    barText: { all: ['--ix-bartx'] }
  };
  var PG_APPS = [['links', 'Links'], ['info', 'Info'], ['cards', 'Cards'], ['tasks', 'Tasks'], ['files', 'Files'], ['tools', 'Tools']];
  function colorsCss(c, look) {
    if (!c || look === false) return '';
    var css = '';
    ['dark', 'light'].forEach(function (m) {
      var set = c[m] || {}, byScope = {};
      COLOR_KEYS.forEach(function (k) {
        var v = set[k[0]]; if (!isHex(v)) return;
        Object.keys(COLOR_VARS[k[0]]).forEach(function (scope) {
          (byScope[scope] = byScope[scope] || []).push.apply(byScope[scope], COLOR_VARS[k[0]][scope].map(function (n) { return n + ':' + v + '!important'; }));
        });
      });
      Object.keys(byScope).forEach(function (scope) {
        var sel = 'html[data-theme="' + m + '"]' + (scope === 'all' ? '' : '[data-ix-app="' + scope + '"][data-ix-app][data-ix-app]');
        css += sel + '{' + byScope[scope].join(';') + '}\n';
      });
    });
    /* a background set for one page wins over the general one (written last, with more weight) */
    var pg = c.pg || {};
    PG_APPS.forEach(function (a) {
      ['dark', 'light'].forEach(function (m) {
        var v = pg[a[0]] && pg[a[0]][m]; if (!isHex(v)) return;
        css += 'html[data-theme="' + m + '"][data-ix-app="' + a[0] + '"][data-ix-app][data-ix-app][data-ix-app]{' + COLOR_VARS.bg[a[0]].map(function (n) { return n + ':' + v + '!important'; }).join(';') + '}\n';
      });
    });
    return css;
  }
  function applyColors(st) {
    st = st || S;
    var el = document.getElementById('ix-colors');
    if (!el) { el = document.createElement('style'); el.id = 'ix-colors'; document.head.appendChild(el); }
    var css = colorsCss(st.colors, st.look);
    if (el.textContent !== css) el.textContent = css;
  }
  /* Site-wide font (Settings > Appearance). One <style> overrides the font of every page, but leaves code and keyboard keys alone. */
  var FONTS = [['default', 'Each page\'s own font', ''],
    ['trebuchet', 'Trebuchet MS', '"Trebuchet MS","Lucida Grande","Lucida Sans Unicode","Lucida Sans",Tahoma,system-ui,sans-serif'],
    ['system', 'System Default', 'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif'],
    ['verdana', 'Verdana', 'Verdana,Geneva,Tahoma,sans-serif'],
    ['tahoma', 'Tahoma', 'Tahoma,Verdana,Geneva,sans-serif'],
    ['segoe', 'Segoe UI', '"Segoe UI",system-ui,-apple-system,Roboto,sans-serif'],
    ['arial', 'Arial / Helvetica', 'Arial,"Helvetica Neue",Helvetica,sans-serif'],
    ['georgia', 'Georgia (Serif)', 'Georgia,"Times New Roman",Times,serif'],
    ['palatino', 'Palatino (Serif)', '"Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif'],
    ['mono', 'Monospace', 'ui-monospace,Consolas,"SF Mono",Menlo,"Courier New",monospace'],
    ['custom', 'Other Font…', '']];
  function fontStack(st) {
    var k = st && st.font;
    if (k === 'custom') { var n = String(st.fontCustom || '').replace(/[^\w \-]/g, '').trim(); return n ? '"' + n + '",system-ui,sans-serif' : ''; }
    for (var i = 0; i < FONTS.length; i++) if (FONTS[i][0] === k) return FONTS[i][2];
    return '';
  }
  function applyFont(st) {
    st = st || S;
    var el = document.getElementById('ix-fontcss'), f = fontStack(st);
    if (!f) { if (el) el.textContent = ''; H.removeAttribute('data-ix-font'); return; }
    if (!el) { el = document.createElement('style'); el.id = 'ix-fontcss'; document.head.appendChild(el); }
    H.setAttribute('data-ix-font', '');
    el.textContent = 'html[data-ix-font] body,html[data-ix-font] body *:not(code):not(pre):not(kbd):not(samp):not(#jsonText):not(svg):not(svg *){font-family:' + f + '!important}';
  }
  /* Text sizes per page (Info, Cards): the page's own CSS reads --ix-s-<key>; Links keeps its own sizes inside its data. */
  var SIZE_SPEC = {
    info: [['tab', 'Tabs', 14, 34, 20], ['head', 'Box Titles', 14, 36, 20], ['text', 'Box Text', 12, 30, 16]],
    cards: [['title', 'Page Title', 22, 60, 40], ['box', 'Summary Boxes', 16, 44, 24], ['text', 'Table Text', 12, 26, 16]]
  };
  function applySizes(st, only) {
    var spec = SIZE_SPEC[APP]; if (!spec) return;
    var z = ((st || S).sizes || {})[APP] || {};
    if (only) z = only;
    spec.forEach(function (k) { var v = +z[k[0]]; if (v >= k[2] && v <= k[3]) H.style.setProperty('--ix-s-' + k[0], v + 'px'); else H.style.removeProperty('--ix-s-' + k[0]); });
  }
  syncThemeKeys(themeNow());
  H.setAttribute('data-theme', themeNow());
  applyAttrs();
  applyColors();
  applyFont();
  applySizes();

