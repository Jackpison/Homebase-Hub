  /* ---------- (1.82.5) Hover hints: a short plain sentence on a setting, a field or a button, drawn in the tooltip bubble with a pointer to the thing.
     Added by id after the page and its dialogs are built (a row gets the hint, so pointing anywhere on it works). Off, or slower or faster, in
     Settings, Features, Hover Hints (kept on this device). Touch screens have no hover, so they get none. ---------- */
  var HINTS = {
    /* Home: Settings */
    sTitle: 'The name in the browser tab and in the bookmark list.',
    sPrivate: 'When on, only you can see this page. Visitors get a login screen first.',
    sHomeBar: 'Shows the menu bar on Home. Turn it off for a plain page: a small corner button still opens the same menu.',
    sEditBar: 'Icons Only is smaller, and each name shows when you point at it. Icons and Text writes the name under every tool.',
    /* Home: Widgets */
    wShow: 'Shows or hides the cards and the dock. Nothing is deleted: your cards and notes come back when you turn it on.',
    wStyle: 'Glass Dock keeps a few small chips under the clock, and the dock opens each card. Glance and Expand puts small cards along the bottom; click one to open it.',
    wClock: 'The big time, date and greeting. Visitors see it even when the cards are hidden.',
    wClockPos: 'Where the clock sits. On a computer you can also drag it, or press M and move it with the arrow keys.',
    wCardsPos: 'Where the dock of cards sits. Drag a card on a computer to put it anywhere.',
    wResetLayout: 'Puts the clock and the cards back where they started. Undo is offered.',
    wLayName: 'Type a name, like Work, then press Save. Choose it later to switch the whole layout back.',
    wLaySave: 'Keeps the clock, the card places, the sizes and the look under this name. You can keep six.',
    wTint: 'How see-through the cards are, from clear glass to solid.',
    wCorner: 'How round the corners of the cards are.',
    wAccent: 'The colour of highlights, buttons and the lines on the cards.',
    wCardSel: 'Pick one card, then give only that card its own colour.',
    wCardAcc: 'The colour for the card you picked. Reset takes it back to the accent colour.',
    wCdName: 'What you are counting down to, like Holiday.',
    wCdDate: 'The day it happens. The card shows the days left.',
    wNote: 'A note on the page. It is saved on the server like the rest of Home.',
    wZones: 'Cities for the World Clock card, one per line, like Europe/London.',
    /* Links: Settings */
    sWebIcons: 'Off by default. If you turn it on, link icons come from Google, so Google learns which sites you save.',
    sVisits: 'Counts clicks on each link. Visitors are counted too, but only you see the numbers.',
    sStyle: 'The look of the link rows. Refined is calm, the others are bolder.',
    sHost: 'Shows the address next to a link when you point at it, so you can tell similar links apart.',
    sMost: 'A strip of your most opened links above the page. It does not need the counts to be shown.',
    sTextBtn: 'Adds a button in the edit bar for the text sizes.',
    versionsBtn: 'Earlier saved copies of this page. Pick one to go back.',
    exportBtn: 'Downloads your links as a file you can keep or open in another browser.',
    importBtn: 'Adds links from a file you exported before. Nothing is lost: it is added to what you have.',
    importBmBtn: 'Brings in bookmarks from your browser (a bookmarks file).',
    iconsBtn: 'Looks up icons for links that have none. It contacts the icon service, and only when you press this.',
    colorsBtn: 'Choose the colours of the page, in dark and light.',
    textBtn: 'Choose the text sizes of the page.',
    /* Info */
    gin: 'The name in the browser tab and in the bookmark list.',
    spriv: 'Visitors get a login screen instead of this page.',
    setsizes: 'Choose the text sizes for this page.',
    /* Cards */
    tcols: 'Which columns the Excel and PDF exports have, and in what order.',
    tonlyme: 'Visitors must log in first. They see nothing of this page.',
    fq: 'Type part of a name, a bank or a number. Press Esc to clear it.',
    sortSel: 'Changes the order of the cards. It does not change the cards.',
    lockBtn: 'Locks the cards with their own password. The password never leaves your browser.',
    /* Tasks */
    's-soon': 'How many days ahead a task counts as Due Soon. A task’s own Remind Me comes first.',
    's-start': 'The page that opens first when you open Tasks.',
    's-week': 'The day the calendar week starts on.',
    's-calon': 'Makes a private link so your due dates show in Google or Apple Calendar. Keep the link to yourself.',
    's-calcopy': 'Copy the link and paste it into your calendar app. Anyone with the link can see your due dates.',
    's-calnew': 'Makes a new link and stops the old one from working.',
    's-onlyme': 'Visitors must log in first. They see nothing of this page.',
    qadd: 'Type a task and press Enter. Words like tomorrow or friday set the date for you.',
    xcsv: 'Downloads your tasks as a spreadsheet file.',
    xics: 'Downloads your due dates as a calendar file.',
    /* Files */
    newb: 'Starts a new folder, a note or an upload, depending on the page.',
    stbtn: 'How much space your files use on the server.',
    sort: 'Changes the order of the list. It does not move files.',
    up: 'Pick files from this device. You can also drag them onto the page.',
    mk: 'Makes a new folder here.',
    /* (1.82.9) More hints, for first-time visitors: each says what the setting does in plain words */
    bgMotion: 'Slowly zooms the photo so the page feels alive. Turn it off if it distracts you.',
    bgDim: 'Darkens the picture so the clock and cards are easy to read. Raise it for bright photos.',
    bgRotate: 'How often the background changes. On Refresh picks a new one each time you open Home.',
    bgQuery: 'Words that decide which photos you get, like mountains or ocean. Separate them with commas.',
    bgChance: 'How often one of your own uploaded pictures is chosen instead of an online photo.',
    bgVideo: 'How often a video is shown instead of a still photo.',
    addCustom: 'Adds another photo website. Most people never need this.',
    lTitleFetch: 'Reads the page name from the web address for you. It contacts that website, and only when you press this.',
    lIconFetch: 'Finds the small icon of this website. It asks the icon service, and only when you press this.',
    bxpin: 'Keeps this box at the top of the page, above the others.',
    bxrem: 'Pick a day to be reminded. Today on Home shows the box when that day comes.',
    bxhc: 'The color of this box. Use Default goes back to the color of the page.',
    sortBtn: 'Switch between your own order and the boxes you changed most recently.',
    fmore: 'More ways to narrow the list, like bank, network and type.',
    fclear: 'Removes every filter so all the cards show again.',
    's-range': 'Which tasks show when you open the page. Where I Left Off remembers your last choice.',
    's-sort': 'The order tasks are listed in when the page opens. Where I Left Off remembers your last choice.',
    's-dates': 'How dates are written, like 16 Oct 2026 or Oct 16, 2026.',
    's-cur': 'The currency shown for a task that has a price but no currency of its own.',
    fgroup: 'Puts the tasks under headings, like Today and This Week, or by month, year or category.',
    'e-remind': 'When to remind you before the due date. Page Default uses the choice in Tasks settings.',
    'e-rep': 'How often the task comes back. Doesn\u2019t Repeat keeps it a one-time task.',
    'e-on': 'For monthly or yearly tasks: the same date each time, the last day of the month, or a weekday like the 2nd Tuesday.',
    q: 'Type to search this page. Press / to jump here from anywhere.',
    /* Everywhere */
    themeBtn: 'Switches between Light and Dark.',
    editBtn: 'Opens the tools to change this page. Press Done when you finish.',
    settingsBtn: 'Settings for this page, like its title and its look.',
    logoutBtn: 'Logs you out on this device. Your other devices stay logged in.',
    doneBtn: 'Saves your changes and closes the edit tools.'
  };
  /* hints whose card also shows what the setting is now (On now, Off now, Now: the choice): the ones where the answer changes what the person sees */
  var HINT_STATE = ['sPrivate', 'sHomeBar', 'wShow', 'wClock', 'sWebIcons', 'sVisits', 'sHost', 'sMost', 'tonlyme', 's-onlyme', 'spriv', 'sStyle', 'sortSel', 'wStyle'];
  /* how a hint card looks: warn = a caution (outside services, links that expose things), tip = a way to try it; keys = the key to press */
  var HINT_KIND = { sWebIcons: 'warn', iconsBtn: 'warn', lTitleFetch: 'warn', lIconFetch: 'warn', 's-calon': 'warn', 's-calcopy': 'warn', qadd: 'tip', fq: 'tip', bgQuery: 'tip', wLayName: 'tip' };
  var HINT_KEY = { qadd: 'Enter', fq: 'Esc', wClockPos: 'M', q: '/' };
  var HINT_SLOW = { fast: 120, normal: 450, slow: 900 };
  function hintPref() { try { return JSON.parse(localStorage.getItem('ix-hints') || '{}') || {}; } catch (e) { return {}; } }
  function hintSave(o) { try { localStorage.setItem('ix-hints', JSON.stringify(o)); } catch (e) { /* private window */ } }
  function hintsOn() { return !hintPref().off && !(window.matchMedia && matchMedia('(hover:none)').matches); }
  function hintDelay() { return HINT_SLOW[hintPref().delay] || HINT_SLOW.normal; }
  function hintApply() {
    Object.keys(HINTS).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var row = el.closest('.ix-srow, .g-row') || el;
      if (row.hasAttribute('data-hint') || (row.hasAttribute('data-tip') && row === el)) return;
      row.setAttribute('data-hint', HINTS[id]);
      if (HINT_STATE.indexOf(id) >= 0) row.setAttribute('data-hint-state', '1');
      if (HINT_KIND[id]) row.setAttribute('data-hint-kind', HINT_KIND[id]);
      if (HINT_KEY[id]) row.setAttribute('data-hint-key', HINT_KEY[id]);
    });
  }
  var hintsApi = {
    isOn: function () { return !hintPref().off; },
    setOn: function (v) { var o = hintPref(); o.off = v ? 0 : 1; hintSave(o); tipShow(null); },
    delay: function () { return hintPref().delay || 'normal'; },
    setDelay: function (d) { var o = hintPref(); o.delay = HINT_SLOW[d] ? d : 'normal'; hintSave(o); }
  };
  var hintT = 0;
  function hintLater() { clearTimeout(hintT); hintT = setTimeout(function () { hintApply(); }, 250); }
  document.addEventListener('DOMContentLoaded', function () { hintApply(); try { new MutationObserver(hintLater).observe(document.body, { childList: true, subtree: true }); } catch (e) { /* no observer: hints stay as first applied */ } });
  if (document.readyState !== 'loading') { hintApply(); hintLater(); }
