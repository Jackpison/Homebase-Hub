  /* ---------- (1.82.5) Hover hints: a short plain sentence on a setting, a field or a button, drawn in the tooltip bubble with a pointer to the thing.
     Added by id after the page and its dialogs are built (a row gets the hint, so pointing anywhere on it works). Off, or slower or faster, in
     Settings, Features, Hover Hints (kept on this device). Touch screens have no hover, so they get none. ---------- */
  var HINTS = {
    /* Home: Settings */
    sTitle: 'The name in the browser tab and in the bookmark list.',
    sPrivate: 'Visitors get a login screen instead of this page. You still see it after you log in.',
    sHomeBar: 'Off keeps Home plain. A small corner button opens the same menu.',
    sEditBar: 'Text shows the name of each tool. Icons Only is smaller and shows the name when you point at it.',
    /* Home: Widgets */
    wShow: 'Turns the cards and the dock on or off. Your cards and notes are kept.',
    wStyle: 'How the cards look: a dock at the side, cards on the page, or both.',
    wClock: 'The big clock with the greeting.',
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
    sWebIcons: 'Off by default. Turn it on only if you accept that Google learns which sites you save.',
    sVisits: 'Counts clicks on each link. Visitors are counted too, but only you see the numbers.',
    sStyle: 'The look of the link rows. Refined is calm, the others are bolder.',
    sHost: 'Shows the address next to a link when you point at it, so you can tell similar links apart.',
    sMost: 'A strip of your most opened links above the page. It does not need the counts to be shown.',
    sTextBtn: 'Adds a button in the edit bar for the text sizes.',
    versionsBtn: 'Earlier saved copies of this page. Pick one to go back.',
    exportBtn: 'Downloads your links as a file you can keep or open in another browser.',
    importBtn: 'Adds links from a file you exported before. Nothing is lost: it is added to what you have.',
    importBmBtn: 'Brings in bookmarks from your browser (a bookmarks file).',
    iconsBtn: 'Fetches the missing icons. This asks the icon service only when you press it.',
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
    's-calon': 'Makes a private link that shows your due dates in Google or Apple Calendar.',
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
    /* Everywhere */
    themeBtn: 'Switches between Light and Dark.',
    editBtn: 'Opens the tools to change this page. Press Done when you finish.',
    settingsBtn: 'Settings for this page.',
    logoutBtn: 'Logs you out on this device only.',
    doneBtn: 'Saves your changes and closes the edit tools.'
  };
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
