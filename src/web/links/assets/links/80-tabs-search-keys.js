/* ---------- tabs via URL hash, search, keys ---------- */
window.addEventListener('hashchange', () => {
  const id = decodeURIComponent(location.hash.slice(1));
  if (S.data.tabs.some(t => t.id === id)) {
    S.tab = id; render();
    const g = $('#grid'); g.classList.remove('swap'); requestAnimationFrame(() => requestAnimationFrame(() => g.classList.add('swap')));   // the new tab eases in (only on a real switch); (1.64.10) restarted on the next frame instead of forcing the whole page to be measured now
  }
});
const qi = $('#q');
qi.addEventListener('input', () => { S.q = qi.value.trim(); render(); });
qi.addEventListener('keydown', e => {
  if (e.key === 'Escape') { qi.value = ''; S.q = ''; render(); qi.blur(); }
  if (e.key === 'Enter') { const first = $('#grid a.main'); if (first) window.open(first.href, '_blank', 'noopener'); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && drag) { cancelDrag(); return; }
  if (document.querySelector('dialog[open]') || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  if (e.key === '/') { e.preventDefault(); qi.focus(); }
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= S.data.tabs.length && !e.ctrlKey && !e.metaKey && !e.altKey) location.hash = S.data.tabs[n - 1].id;
});

document.addEventListener('hub:theme', () => applyLook());   // the bar's theme switch
setThemeBtn();
paintFromCache();
load();
})();
