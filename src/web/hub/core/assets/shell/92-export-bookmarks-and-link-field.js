  /* (1.61.0) Export Bookmarks: the standard bookmark file every browser imports (Chrome, Edge, Firefox, Safari). Made here in the
     browser from tabs [{title, categories: [{title, links: [{title, url}]}]}], so nothing extra leaves the server. Only web addresses
     (http, https, ftp) and mail links are written. Each tab becomes a folder, each category a folder inside it. */
  function bookmarksHtml(tabs, title) {
    var e = function (v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
    var ok = function (u) { return /^(https?|ftp):\/\/|^mailto:/i.test(String(u || '').trim()); };
    var now = Math.floor(Date.now() / 1000), o = ['<!DOCTYPE NETSCAPE-Bookmark-file-1>', '<!-- This is an automatically generated file. It will be read and overwritten. DO NOT EDIT! -->',
      '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">', '<TITLE>' + e(title || 'Bookmarks') + '</TITLE>', '<H1>' + e(title || 'Bookmarks') + '</H1>', '<DL><p>'];
    (tabs || []).forEach(function (t) {
      o.push('    <DT><H3 ADD_DATE="' + now + '">' + e(t.title || t.name || 'Tab') + '</H3>', '    <DL><p>');
      (t.categories || []).forEach(function (c) {
        o.push('        <DT><H3 ADD_DATE="' + now + '">' + e(c.title || c.name || 'Links') + '</H3>', '        <DL><p>');
        (c.links || []).forEach(function (l) { if (l && !l.divider && ok(l.url)) o.push('            <DT><A HREF="' + e(String(l.url).trim()) + '" ADD_DATE="' + now + '">' + e(l.title || l.url) + '</A>'); });
        o.push('        </DL><p>');
      });
      o.push('    </DL><p>');
    });
    o.push('</DL><p>');
    return o.join('\n') + '\n';
  }

  /* ---------- (1.69.1) Link field: a label in front (https://, Link, Key, curl), the field, and a copy icon whose tip says COPY, then COPIED.
     Idea from Uiverse "itchy-dodo-49" by Bodyhc (MIT; credited in THIRD-PARTY.md), redone in plain HTML and CSS on the site's colours.
     o = { id, value, prefix, scheme (the prefix is https:// or http://: a tap switches it, a typed or pasted https:// moves into it),
           strip (a typed or pasted https:// or http:// is dropped: the field wants only the host),
           readonly, mono, open (an arrow that opens the link), copy (default on), copyText (what Copy puts on the clipboard, if not the field),
           show (what a read-only field shows, if not the value), copyId, placeholder, label (for screen readers), required, cls }.
     Returns HTML. HUB.linkValue(input) gives the whole address back, HUB.linkSet(input, url) fills it. */
  var UF_COPY = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>';
  function linkField(o) {
    var a = function (k, v) { return v == null || v === false ? '' : ' ' + k + (v === true ? '' : '="' + esc(v) + '"'); };
    var px = o.prefix || '', sch = !!o.scheme, ro = !!o.readonly;
    return '<div class="ix-uf' + (o.mono || ro ? ' ix-uf-mono' : '') + (o.cls ? ' ' + esc(o.cls) : '') + '"' + a('data-scheme', sch) + a('data-strip', !!o.strip) + '>' +
      (px ? (sch ? '<button type="button" class="ix-uf-px" data-uf-px title="Tap for http:// or https://" aria-label="Address starts with ' + esc(px) + '. Tap to switch">' + esc(px) + '</button>'
                 : '<span class="ix-uf-px" aria-hidden="true">' + esc(px) + '</span>') : '') +
      // (1.72.0) o.wrap: a read-only key that may wrap onto a second line on a narrow phone (a textarea), so no part of it is ever cut off
      (o.wrap && ro ? '<textarea rows="1" readonly' + a('id', o.id) + a('aria-label', o.label) + ' autocomplete="off" spellcheck="false">' + esc(o.show != null ? o.show : o.value) + '</textarea>'
        : '<input type="text"' + a('id', o.id) + a('value', o.show != null ? o.show : o.value) + a('readonly', ro) + a('required', o.required) + a('placeholder', o.placeholder) +
        a('aria-label', o.label) + ' autocomplete="off" spellcheck="false"' + (sch ? ' inputmode="url"' : '') + '>') +
      (o.open ? '<button type="button" class="ix-uf-open" aria-label="Open the link in a new tab" title="Open"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg></button>' : '') +
      (o.copy === false ? '' : '<button type="button" class="ix-uf-cp"' + a('id', o.copyId) + a('data-copy', o.copyText) + ' aria-label="Copy">' + UF_COPY + '<span class="ix-uf-tip" aria-hidden="true">COPY</span></button>') +
      '</div>';
  }
  var ufOf = function (inp) { return inp && inp.closest ? inp.closest('.ix-uf') : null; };
  /* The whole address: the prefix plus what is typed (nothing typed: empty). An address with its own scheme (mailto:, ftp://) is kept as typed. */
  function linkValue(inp) {
    if (!inp) return '';
    var v = inp.value.trim(), f = ufOf(inp), px = f && f.hasAttribute('data-scheme') ? f.querySelector('.ix-uf-px') : null;
    if (!v || !px || /^[a-z][a-z0-9+.-]*:/i.test(v) && !/^[^:/]+:\d+(\/|$)/.test(v)) return v;
    return px.textContent + v;
  }
  function ufSplit(inp) {   // https:// or http:// at the start moves into the prefix; another scheme hides the prefix
    var f = ufOf(inp); if (!f) return;
    if (f.hasAttribute('data-strip')) { var w = inp.value.replace(/^\s*https?:\/\//i, ''); if (w !== inp.value) inp.value = w; return; }
    if (!f.hasAttribute('data-scheme')) return;
    var px = f.querySelector('.ix-uf-px'), m = /^\s*(https?):\/\/(.*)$/i.exec(inp.value);
    if (m) { if (px) px.textContent = m[1].toLowerCase() + '://'; inp.value = m[2]; }
    f.classList.toggle('ix-uf-raw', /^[a-z][a-z0-9+.-]*:/i.test(inp.value.trim()) && !/^[^:/]+:\d+(\/|$)/.test(inp.value.trim()));
  }
  function linkSet(inp, url) {
    if (!inp) return;
    var f = ufOf(inp), px = f && f.querySelector('.ix-uf-px');
    if (px && f.hasAttribute('data-scheme')) px.textContent = 'https://';
    inp.value = url || ''; ufSplit(inp);
  }
  function ufCopied(b, ok) {
    var tip = b.querySelector('.ix-uf-tip');
    clearTimeout(b.__t); b.classList.toggle('done', ok); if (tip) tip.textContent = ok ? 'COPIED' : 'COPY';
    b.setAttribute('aria-label', ok ? 'Copied' : 'Copy'); if (ok) announce('Copied');
    if (ok) b.__t = setTimeout(function () { ufCopied(b, false); }, 1600);
  }
  /* the older copy command, for pages without the clipboard API: a hidden box holds the exact text (the field may show it spaced) */
  function legacyCopy(text) {
    var a = document.createElement('textarea'), ok = false, was = document.activeElement;
    a.value = text; a.setAttribute('readonly', ''); a.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
    document.body.appendChild(a); a.select(); try { a.setSelectionRange(0, text.length); } catch (e) {}
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    a.remove(); if (was && was.focus) try { was.focus({ preventScroll: true }); } catch (e) {}
    return ok;
  }
  document.addEventListener('input', function (e) { var t = e.target; if (t && t.tagName === 'INPUT' && ufOf(t)) ufSplit(t); });
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('.ix-uf-px[data-uf-px], .ix-uf-cp, .ix-uf-open') : null;
    if (!b) return;
    var f = ufOf(b), inp = f && f.querySelector('input, textarea');
    if (b.classList.contains('ix-uf-px')) { b.textContent = b.textContent === 'https://' ? 'http://' : 'https://'; if (inp) inp.dispatchEvent(new Event('change', { bubbles: true })); return; }
    if (b.classList.contains('ix-uf-open')) { var u = linkValue(inp); if (/^https?:\/\//i.test(u)) window.open(u, '_blank', 'noopener'); else toast('Type the address first.'); return; }
    var text = b.hasAttribute('data-copy') ? b.getAttribute('data-copy') : linkValue(inp);
    if (!text) return;
    // (1.72.0) where the browser has no clipboard here (a page opened over plain http), the older copy command usually still works;
    // only when that fails too is the text selected, with a note that fits the device
    var fail = function () {
      if (legacyCopy(text)) { ufCopied(b, true); return; }
      if (inp) { inp.focus(); inp.select(); }
      toast(matchMedia('(pointer: coarse)').matches ? 'Selected: tap and hold, then Copy.' : 'Selected: press Ctrl+C (Cmd+C on a Mac) to copy.');
    };
    try { (navigator.clipboard && window.isSecureContext ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { ufCopied(b, true); }, fail); } catch (x) { fail(); }
  });

