/* ======================================================================
   HOME TOUR (1.69.0): four cards in the Stepper (shell.js), each lighting up a part of the page. It opens once, on the first visit
   after the site is set up (New Site Setup leaves "hl-tour-due"), and any time from Home Settings > Take the Tour.
   ====================================================================== */
function tour(){
  if (!window.HUB || !HUB.stepper || $('#hlTour')) return;
  const box = document.createElement('div'); box.id = 'hlTour'; box.className = 'hl-tour'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Home Tour');
  document.body.append(box);
  let lit = null;
  const spot = sel => { if (lit) lit.classList.remove('hl-spot'); lit = sel ? $$(sel).find(e => e.offsetParent || e.getClientRects().length) || null : null; if (lit) lit.classList.add('hl-spot'); };
  const close = () => { spot(null); box.remove(); try { localStorage.setItem('hl-tour', '1'); localStorage.removeItem('hl-tour-due'); } catch (x) { /* nothing kept */ } };
  const card = (h, p) => '<h3 class="hl-tour-h">' + h + '</h3><p class="hl-tour-p">' + p + '</p>';
  HUB.stepper(box, { kind: 'dots', frame: true, complete: 'Start', skip: close,
    steps: [
      { title: 'Your Start Page', html: card('Your start page', 'The clock, a greeting and your photo. A new photo comes with the arrow, or set your own in Edit.'), enter: () => spot('.clock') },
      { title: 'The Bar', html: card('The bar', 'Every page is one click away: Links, Info, Cards, Tasks, Files and Tools. On Home it can stay hidden behind the corner button.'), enter: () => spot('#ix-bar, [data-ix="corner"]') },
      { title: 'Widgets', html: card('Widgets', 'Today, Countdown, Note, Calendar and more. Choose them under Edit › Widgets.'), enter: () => spot('#wChips:not([hidden]), #wDock:not([hidden]), .wcards, #editBtn') },
      { title: 'Make It Yours', html: card('Make it yours', 'Settings › Appearance changes the theme, the colours and the glass. Edit changes this page.'), enter: () => spot('#editBtn, [data-ix="account"]') }],
    done: '', onDone: close });
  box.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}
$('#sTour')?.addEventListener('click', () => { closeSheet('settingsSheet'); setTimeout(tour, 250); });
try { if (localStorage.getItem('hl-tour-due') === '1') setTimeout(tour, 1800); } catch (x) { /* no storage: no tour */ }

