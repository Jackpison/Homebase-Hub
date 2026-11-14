/* ---------- theme & look ---------- */
const mode = () => root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
function lum(hex) {
  const n = parseInt(hex.slice(1), 16), ch = [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
  return .2126 * ch[0] + .7152 * ch[1] + .0722 * ch[2];
}
// The accent a page really shows: with the shared look on, it is the site accent from Settings.
function siteAccent(m) {
  if (!root.hasAttribute('data-ix-look')) return DEFAULT_COLORS[m].accent;
  if (m === 'light') return '#a5701c';
  const v = getComputedStyle(root).getPropertyValue('--ix-accent').trim();
  return isHex(v) ? v : DEFAULT_COLORS[m].accent;
}
const COL_KEYS = ['ribbon', 'c0', 'c1', 'c2', 'c3'];
function colorsFor(m, s = S.data.settings) {
  const c = { ...DEFAULT_COLORS[m] }, o = (s && s[m]) || {};
  if (isHex(o.bg)) c.bg = o.bg;
  c.accent = isHex(o.accent) ? o.accent : siteAccent(m);
  for (const k of COL_KEYS) c[k] = isHex(o[k]) ? o[k] : k === 'ribbon' && m === 'light' && root.hasAttribute('data-ix-look') ? '#c99400' : c.accent;
  return c;
}
// Only what the owner set (plus background and accent) is written as a variable; the rest follows the accent through the style sheet.
function lookVars(m, s) {
  const c = colorsFor(m, s), o = (s && s[m]) || {}, v = { bg: c.bg, accent: c.accent };
  for (const k of COL_KEYS) if (isHex(o[k])) v[k] = o[k];
  return v;
}
function setThemeBtn() {
  const tb = $('#themeBtn'), m = mode();
  tb.innerHTML = m === 'dark' ? ICONS.sun : ICONS.moon;
  tb.title = m === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  tb.setAttribute('aria-label', tb.title);
}
function applyLook(s = S.data.settings) {
  const m = mode(), c = colorsFor(m, s);
  const lv = lookVars(m, s);
  for (const [k] of COLOR_KEYS) { if (k in lv) root.style.setProperty('--' + k, lv[k]); else root.style.removeProperty('--' + k); }
  const z = sizesFor(s); for (const k in z) root.style.setProperty('--fs-' + k, z[k] + 'px');
  root.style.setProperty('--on-accent', lum(c.accent) > .4 ? '#1a1a1a' : '#ffffff');
  document.title = (s && s.title) || 'Bookmarks';
  // the tab icon is the site logo (set by the bar); Links does not change it
  setThemeBtn();
  try {
    localStorage.setItem('bm-look', JSON.stringify({ dark: lookVars('dark', s), light: lookVars('light', s),
      title: (s && s.title) || '', sizes: sizesFor(s) }));
  } catch {}
}
$('#themeBtn').onclick = () => {
  const next = mode() === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  try { localStorage.setItem('bm-theme', next); } catch {}
  applyLook();
};

/* ---------- API ---------- */
const HF = HUB.fetch;   // the site's fetch: longer timeout and a quiet retry on slow hosts
