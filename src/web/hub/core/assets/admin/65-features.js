  /* ---------- Features (1.76.0): a showcase of what the site offers, page by page (the same words as the website's feature pages).
     It holds no settings: each page keeps its own (Files Settings in Files, Home Settings in Home, and so on). ---------- */
  var FEATS = [
    { id: "home", name: "Home", c: "#3b82f6", ic: ICON.home, url: "web/home/",
      lead: "Your own start page: a clock, your day in frosted-glass widgets, and background photos that change. Show it with the bar, or without it.",
      hl: [["Widgets, just for you", "Today's tasks with Quick Add, a countdown, a note from Info, recent tools, a calendar, a scratch pad, a quote, world clocks and the weather. Visitors see only the clock."],
        ["Photos with credit", "Each photo keeps its credit in the corner."],
        ["Phone-sized copies", "Large photos get a smaller copy for phones, so the page opens quickly."],
        ["With or without the bar", "Show the start page full screen, or keep the bar. It is a setting in Settings, Appearance, Look."],
        ["Search from anywhere", "Press / or Ctrl+K on any page to search Links, Info, Tasks and Tools at once."],
        ["Animated designs", "Sixteen backgrounds drawn live, from React Bits: light, galaxies, waves and more. Choose which take turns and change their colours. The heaviest are for computers only."],
        ["Glass your way", "Home Settings sets the glass: Light, Dark or Solid, how see-through, and how much it blurs."],
        ["Pull for a new photo", "On a phone, pull down from the top for the next background."]] },
    { id: "links", name: "Links", c: "#22c55e", ic: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7', url: "web/links/",
      lead: "Bookmarks in tabs and categories, with icons saved on your server. Bring yours from any browser in a minute.",
      hl: [["Import with a preview", "Pick the file, see how many links and which folders become which categories, then choose a new tab or an existing one. Links you already have are not added twice."],
        ["Easy to undo", "A copy of Links is kept just before an import, in Settings, Backup and Restore, Earlier Versions."],
        ["Colours and sizes", "Each tab can have its own column colours and text sizes."],
        ["Encrypted tabs", "Tabs can be encrypted with your passphrase. The keys are made in your browser."],
        ["See which links you open most", "Each link shows how often it was opened, at the end of its row. Only you see the numbers; links in encrypted tabs are never counted."],
        ["One bar while you edit", "Press the pencil, choose Edit This Page, and Colors, Fetch Icons, Import Bookmarks and Links Settings sit in one bar at the bottom."]] },
    { id: "info", name: "Info", c: "#a855f7", ic: ICON.log, url: "web/info/",
      lead: "Notes in tabs. Each tab holds 1 to 12 boxes, or is written as one document with an outline.",
      hl: [["Boxes you can size and arrange", "Each tab holds 1 to 12 boxes. Resize them and put them where you want."],
        ["Cards or a document", "Arrange boxes as cards, or write the tab as one document with an outline."],
        ["Export as PDF or text", "Export one tab, or all of them."],
        ["Found by search", "Search covers the text of your notes, not only their titles."],
        ["Undo after a delete", "Delete a box or a tab by mistake and a message offers Undo for 7 seconds. It comes back with its text, also in a locked tab."],
        ["Settings in one window", "Info Settings holds privacy, text sizes and how the edit bar looks."]] },
    { id: "cards", name: "Cards", c: "#ec4899", ic: 'M3 6h18v12H3zM3 10h18', url: "web/cards/",
      lead: "Your cards in a table you can search and filter, with the yearly charges added up.",
      hl: [["One searchable table", "Search your cards, and filter by bank, network, type and holder."],
        ["Yearly charges added up", "See what your cards cost you in a year."],
        ["Export to Excel", "Take a copy whenever you need one."],
        ["Sent only after login", "Card data is not sent to a browser until you are logged in."],
        ["Holders and Banks", "One window to rename or add the people your cards belong to, and one for every bank: its name, the link it opens, and how many cards."]] },
    { id: "tasks", name: "Tasks", c: "#f59e0b", ic: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9', url: "web/tasks/",
      lead: "Add a task in plain words, set it to repeat, and let Telegram nudge you with Done, Skip and Snooze.",
      hl: [["Add in plain words", "Type a name, a price and how often, like Netflix 649 monthly 5 Nov, and the task fills itself in."],
        ["Calendar and analytics", "See your tasks on a calendar, and how they add up in Analytics."],
        ["Done, Skip or Snooze on Telegram", "Handle a reminder from the message itself: snooze for 1 hour, 3 hours or until tomorrow."],
        ["Year in Review", "A PDF that looks back over your year of bills, renewals and chores."],
        ["Calendar Link", "Turn it on in Tasks Settings for a secret link, and your tasks show up in Google Calendar, Apple Calendar or Outlook. A new link ends the old one."],
        ["Tasks Settings", "Your currency, when a task counts as due soon, what the page opens on, and how dates look."]] },
    { id: "files", name: "Files", c: "#0ea5e9", ic: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', url: "web/files/",
      lead: "Keep documents, photos and anything else on your own server, in folders you name. Each file is locked in your browser before it is sent, so the server only ever holds scrambled data.",
      hl: [["Suggested for You", "Your newest files sit above the list as cards, so what you were just working on is one click away.", 1], ["Point and act", "Share, Download and Star appear when you point at a row, and the list says who can see each file.", 1], ["Folders, search and preview", "Make folders, search by name, and open a picture, a PDF or a text file without downloading it. A folder downloads as one zip."],
        ["Locked before it leaves your browser", "Every file has its own key, and the name is locked too. Your passphrase unlocks them; the server never gets it."],
        ["Share links you control", "Make a link for one file and choose when it ends. The key sits after the # in the address, so it is never sent to your server. Switch share links off to end them all."],
        ["Starred and Recent", "Star the files you reach for, and see the newest ones under Recent."],
        ["Share from your phone", "In the installed app on Android, share a photo or a file to Homebase Hub and save it to Files, or open it in Tools."],
        ["Files Settings", "The storage limit, share links on or off, and how long the Trash keeps things."]] },
    { id: "tools", name: "Tools", c: "#14b8a6", ic: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.6-.6-.6-2.6z', url: "web/tools/",
      lead: "Resize and convert images, merge and sign PDFs, work out loans and savings, make invoices, scan QR codes and more. Search, star your favourites and get on with your day.",
      hl: [["Heavy engines load on demand", "OCR, background removal and PDF encryption load only when a tool needs them."],
        ["Favourites and your own order", "Star favourites, drag tools to reorder them or move them between sections, and hide the ones you never use."],
        ["Side menu or tabs", "Show the sections as a side menu, or as tabs on top. Phones always get tabs."],
        ["Search them all", "Find a tool by name or by what it does."],
        ["Calculators and documents", "Loans, savings, deposits, percentages, dates, units and amounts in words; invoices as PDF, text compare, Markdown and spreadsheets."],
        ["Saved presets", "Keep a signature, a watermark, a QR style, image sizes or your business details on your server, while logged in. They are in your backups too."]] }
  ];
  FEATS.forEach(function (f) { PANES['ft-' + f.id] = function (p) { pFeature(p, f); }; PANE_FN.set('ft-' + f.id, PANES['ft-' + f.id]); });   // (the tabs themselves are listed in SECTIONS)
  function pFeatures(p) {
    p.innerHTML = '<div class="ix-fban"><div class="ix-fban-t"><div class="ix-fban-h">Seven Pages. One Home.</div><p>Everything below runs on your own server, with your data kept in one folder you can copy, back up and take with you.</p></div>' +
      '<div class="ix-fban-s"><span><b>7</b>pages</span><span><b>100+</b>tools</span><span><b>0</b>trackers</span></div></div>' +
      '<div class="ix-fgrid">' + FEATS.map(function (f) {
      return '<button type="button" class="ix-fcard" style="--fc:' + f.c + '" data-ft="' + f.id + '"><span class="ix-fcard-h"><span class="ix-fhero-i" style="background:' + f.c + '">' + svg(f.ic) + '</span><b>' + esc(f.name) + '</b>' +
        (f.hl.some(function (h) { return h[2]; }) ? '<span class="ix-cl-tag">New</span>' : '') + '</span>' +
        '<span class="ix-fcard-p">' + esc(f.lead) + '</span><span class="ix-fcard-m">' + f.hl.slice(0, 3).map(function (h) { return '<i>' + esc(h[0]) + '</i>'; }).join('') + '</span></button>';
    }).join('') + '</div>';
    p.querySelectorAll('[data-ft]').forEach(function (b) { b.onclick = function () { subPane('ft-' + b.dataset.ft); }; });
    // (1.77.1) the notes that used to be a tab of What's New: how updating works and a few things worth knowing
    var nb = document.createElement('div'); p.appendChild(nb);
    clLoad().then(function (cl) {
      if (!cl.notes.length) return;
      nb.innerHTML = '<h3 class="ix-fnotes">Good to Know</h3>' + cl.notes.map(function (x) { return '<section class="ix-ec"><div class="ix-ec-h"><span class="ix-ec-i">' + svg(ICON.info) + '</span><div><div class="ix-ec-t">' + esc(x.title) + '</div></div></div><div class="ix-ec-b ix-md">' + mdBlocks(x.body) + '</div></section>'; }).join('');
    }).catch(function () {});
  }
  function pFeature(p, f) {
    p.innerHTML = '<div class="ix-fhero" style="--fc:' + f.c + '"><span class="ix-fhero-i" style="background:' + f.c + '">' + svg(f.ic) + '</span><div class="ix-fhero-t"><div class="ix-fhero-h">' + esc(f.name) + '</div><p>' + esc(f.lead) + '</p></div>' +
      '<a class="ix-btn pri" href="' + K.ROOT + f.url + '">Open ' + esc(f.name) + '</a></div>' +
      '<div class="ix-fhl">' + f.hl.map(function (h, i) { return '<div class="ix-fhl-c" style="--fc:' + f.c + '"><span class="ix-fhl-n">' + (i + 1) + '</span><div><b>' + esc(h[0]) + (h[2] ? ' <span class="ix-cl-tag">New</span>' : '') + '</b><p>' + esc(h[1]) + '</p></div></div>'; }).join('') + '</div>';
  }
