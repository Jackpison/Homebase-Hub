  /* (1.72.0) the site-wide search finds Settings too: [name, where it opens, more words, the section's name] */
  function searchIndex() { return SEARCH.map(function (x) { var s = sectionOf(SUB_OF[x[1].split('/')[0]] || ''); return [x[0], x[1], x[2], s ? 'Settings › ' + s[1] : 'Settings']; }); }
  K.impl = { settings: go, mount: mount, openBackup: openBackup, textSizes: textSizes, health: health, searchIndex: searchIndex };
})(window.__ixShell);
