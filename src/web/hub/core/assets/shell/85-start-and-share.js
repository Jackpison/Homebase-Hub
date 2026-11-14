  /* ---------- 13. start ---------- */
  /* One request at a time: a second caller gets the answer already on its way. */
  var refreshing = null;
  function refresh() {
    if (refreshing) return refreshing;
    refreshing = refreshNow().then(function () { refreshing = null; });
    return refreshing;
  }
  /* Runs fn once the server has said whether you are logged in. Right after a page opens (above all one the browser prepared
     in the background) that answer may still be on its way; deciding before it came showed the login box to someone already
     logged in (1.53.6). */
  function whenKnown(fn) { if (S.admin !== undefined) fn(); else refresh().then(fn); }
  /* (1.79.0) A page turned off in Settings > Features says so instead of showing itself (its api.php already refuses). */
  function offPage() {
    var off = (S.off || []).indexOf(APP) >= 0, old = document.getElementById('ix-offp');
    if (!off) { if (old) old.remove(); return; }
    if (old) return;
    var d = document.createElement('div'), h = document.createElement('h1'), p = document.createElement('p'), a = document.createElement('a'), c = document.createElement('div');
    d.id = 'ix-offp'; d.setAttribute('role', 'status'); c.className = 'ix-offc';
    h.textContent = (NOTE_SRC[APP] || 'This page') + ' is turned off';
    p.textContent = S.admin ? 'Your data is still here. Turn it on again in Settings, Features.' : 'The owner turned this page off.';
    c.append(h, p);
    if (S.admin) { a.className = 'ix-btn pri'; a.href = ROOT + 'web/settings/#features'; a.textContent = 'Open Features'; c.appendChild(a); }
    d.appendChild(c); document.body.appendChild(d);
  }
  function refreshNow() {
    return api('state').then(function (st) {
      if (!st || !('admin' in st)) return;
      var changed = st.nav !== S.nav || st.look !== S.look || st.accent !== S.accent || st.homeBar !== S.homeBar || st.glass !== S.glass || st.barHide !== S.barHide || JSON.stringify(st.glassFx) !== JSON.stringify(S.glassFx) || st.font !== S.font || st.fontCustom !== S.fontCustom || JSON.stringify(st.colors) !== JSON.stringify(S.colors);
      // the site theme was changed in Settings (on any device) since this browser last looked: follow it
      var seen = ls.get('hub-theme-site');
      if (st.theme && seen !== st.theme) { if (seen) applyTheme(resolveTheme(st.theme)); ls.set('hub-theme-site', st.theme); }
      Object.keys(S).forEach(function (k) { delete S[k]; }); Object.assign(S, st); remember(st);
      if (changed) applyAttrs();
      applyColors(); applyFont(); applySizes();
      drawBar(); applyFavicon(); ebarKey = ''; drawEditBar(); editBarPick(); offPage();
    }).catch(function () {});
  }
  /* (1.61.0) Share from your phone: one small service worker (web/hub/share-sw.js) takes what the phone's Share button sends to this
     site (when it is added to the home screen). It is set up for you only, once you are logged in, and only on a secure address. */
  function shareWorker() {
    if (!S.admin || !('serviceWorker' in navigator) || !window.isSecureContext) return;
    navigator.serviceWorker.register(ROOT + 'web/hub/share-sw.js', { scope: ROOT + 'web/hub/' }).catch(function () {});
  }
  function start() {
    drawBar(); watchFavicon(); watchEditBarPick();
    var go = function () { refresh().then(function () { afterLoad(); openFromHash(); backupReminder(); shareWorker(); offlineStart(); }, function () { offlineStart(); }); };
    if (document.prerendering) document.addEventListener('prerenderingchange', go, { once: true }); else go();   // a page prepared in the background waits until you open it
    window.addEventListener('hashchange', openFromHash);
    // the Edit icon lights up while the page is in edit mode
    new MutationObserver(markEditing).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    if (document.prerendering) document.addEventListener('prerenderingchange', function () { drawBar(); }, { once: true });
    else if (window.requestIdleCallback) requestIdleCallback(prefetchPages, { timeout: 1500 }); else setTimeout(prefetchPages, 600);
  }
  /* Next page ready before you click: the other pages are prepared in the background (prerendered), so a click is an instant swap.
     The start page is only prefetched, because it counts background views. Chrome and Edge do this; other browsers just load normally. */
  function prefetchPages() {
    var cn = navigator.connection, thin = !!(cn && (cn.saveData || /(^|-)2g$/.test(cn.effectiveType || '')));   // not on data saver or a slow connection
    if ((S.admin || S.adm) && !thin && !document.querySelector('link[data-ix-admin]')) {
      var ver = ((me && /\?v=[^&#]+/.exec(me.src)) || [''])[0];
      [['script', 'shell-admin.js'], ['style', 'shell-settings.css']].forEach(function (f) {
        // (1.67.1) not what this page already has (the Settings page links its styles and loads the script itself): it was fetched twice
        if (f[0] === 'style' ? document.querySelector('link[data-ix-settings-css]') : (APP === 'settings' || window.__ixShell.impl || document.querySelector('script[src*="shell-admin.js"]'))) return;
        var pl = document.createElement('link'); pl.rel = 'prefetch'; pl.as = f[0]; pl.setAttribute('data-ix-admin', ''); pl.href = ASSETS + f[1] + ver; document.head.appendChild(pl);
      });
    }
    // Pre-loading the other pages is done by the browser from web/hub/core/assets/speculation-rules.json, which every page names in a
    // Speculation-Rules response header (an inline rule set would be refused by the pages' security policy).
  }
