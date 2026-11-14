/* formatting, stored as plain text (Markdown-like):
   inline: **bold** *italic* ~~strike~~ ==highlight== `code` [text](https://...) and bare links;
   lines: # heading, - bullet, 1. numbered, - [ ] to-do, > quote, --- divider, ``` code block ```;
   "Label: text" lines get a bold colored label; [red]text[/red] from older versions still shows. */
const COLORS=["red","orange","yellow","green","blue","purple","grey"];
const CRE=new RegExp("\\[("+COLORS.join("|")+")\\]([\\s\\S]*?)\\[\\/\\1\\]","g");
/* Label colors: 104 of the named web colors (CSS color names such as crimson, teal, coral, orchid), without the
   near-whites, pale pastels, near-blacks and greys. A label's own text picks its color, so the same label always gets the same one. */
const LABEL_COLORS=["00ffff","7fffd4","0000ff","8a2be2","a52a2a","deb887","5f9ea0","7fff00","d2691e","ff7f50","6495ed","dc143c","00008b","008b8b","b8860b","006400","bdb76b","8b008b","556b2f","ff8c00","9932cc","8b0000","e9967a","8fbc8f","483d8b","2f4f4f","00ced1","9400d3","ff1493","00bfff","1e90ff","b22222","228b22","ff00ff","ffd700","daa520","008000","adff2f","ff69b4","cd5c5c","4b0082","f0e68c","7cfc00","add8e6","f08080","90ee90","ffb6c1","ffa07a","20b2aa","87cefa","778899","b0c4de","00ff00","32cd32","800000","66cdaa","0000cd","ba55d3","9370db","3cb371","7b68ee","00fa9a","48d1cc","c71585","191970","ffe4b5","ffdead","000080","808000","6b8e23","ffa500","ff4500","da70d6","eee8aa","98fb98","afeeee","db7093","cd853f","dda0dd","b0e0e6","800080","663399","ff0000","bc8f8f","4169e1","8b4513","fa8072","f4a460","2e8b57","a0522d","87ceeb","6a5acd","708090","00ff7f","4682b4","d2b48c","008080","d8bfd8","ff6347","40e0d0","ee82ee","f5deb3","ffff00","9acd32"];
// in order: aqua, aquamarine, blue, blueviolet, brown, burlywood, cadetblue, chartreuse, chocolate, coral, cornflowerblue, crimson, darkblue, darkcyan, darkgoldenrod, darkgreen, darkkhaki, darkmagenta, darkolivegreen, darkorange, darkorchid, darkred, darksalmon, darkseagreen, darkslateblue, darkslategray, darkturquoise, darkviolet, deeppink, deepskyblue, dodgerblue, firebrick, forestgreen, fuchsia, gold, goldenrod, green, greenyellow, hotpink, indianred, indigo, khaki, lawngreen, lightblue, lightcoral, lightgreen, lightpink, lightsalmon, lightseagreen, lightskyblue, lightslategray, lightsteelblue, lime, limegreen, maroon, mediumaquamarine, mediumblue, mediumorchid, mediumpurple, mediumseagreen, mediumslateblue, mediumspringgreen, mediumturquoise, mediumvioletred, midnightblue, moccasin, navajowhite, navy, olive, olivedrab, orange, orangered, orchid, palegoldenrod, palegreen, paleturquoise, palevioletred, peru, plum, powderblue, purple, rebeccapurple, red, rosybrown, royalblue, saddlebrown, salmon, sandybrown, seagreen, sienna, skyblue, slateblue, slategray, springgreen, steelblue, tan, teal, thistle, tomato, turquoise, violet, wheat, yellow, yellowgreen
const LC={}; // per color: [dark-mode shade, light-mode shade]
// Lightens (dark mode) or darkens (light mode) a color just enough to be easy to read on the boxes (contrast 4.5:1).
function readable(hex,bg,lighter){
  const lum=h=>{const n=parseInt(h,16),f=c=>{c/=255;return c<=.03928?c/12.92:((c+.055)/1.055)**2.4};return .2126*f(n>>16&255)+.7152*f(n>>8&255)+.0722*f(n&255)};
  const rgb=[0,2,4].map(i=>parseInt(hex.substr(i,2),16)/255),mx=Math.max(...rgb),mn=Math.min(...rgb);
  let h=0,sat=0,l=(mx+mn)/2;
  if(mx!==mn){const d=mx-mn;sat=l>.5?d/(2-mx-mn):d/(mx+mn);
    h=mx===rgb[0]?(rgb[1]-rgb[2])/d+(rgb[1]<rgb[2]?6:0):mx===rgb[1]?(rgb[2]-rgb[0])/d+2:(rgb[0]-rgb[1])/d+4;h/=6}
  const toHex=L=>{const q=L<.5?L*(1+sat):L+sat-L*sat,p=2*L-q,k=t=>{t=(t+1)%1;return t<1/6?p+(q-p)*6*t:t<.5?q:t<2/3?p+(q-p)*(2/3-t)*6:p};
    return[k(h+1/3),k(h),k(h-1/3)].map(v=>Math.round(v*255).toString(16).padStart(2,"0")).join("")};
  const Lb=lum(bg),ok=x=>{const a=lum(x);return(Math.max(a,Lb)+.05)/(Math.min(a,Lb)+.05)>=4.5};
  let out=hex;for(let i=0;i<60&&!ok(out);i++){l=Math.min(1,Math.max(0,l+(lighter ? 0.02 : -0.02)));out=toHex(l)}
  return"#"+out;
}
function labelColor(t){
  let x=2166136261;for(const ch of t.trim().toLowerCase()){x^=ch.codePointAt(0);x=Math.imul(x,16777619)>>>0} // FNV-1a hash
  const c=LABEL_COLORS[x%LABEL_COLORS.length];
  return LC[c]||(LC[c]=[readable(c,"1a1a1a",true),readable(c,"ffffff",false)]);
}
function autoLabels(h){
  // Runs on escaped text, so the label can't contain markup. A colon inside a link (https:) or a time (10:30) isn't a label.
  return h.replace(/^([ \t]*)([^:\n<>\u0000\u0001]{1,60}?):(?=[ \t]|$)/,(m,sp,lab)=>{
    if(!lab.trim()||lab.includes("[")||(lab.split("**").length-1)%2)return m;
    const [d,l]=labelColor(lab.replace(/\*\*/g,""));
    return `${sp}<b class="lb" style="--d:${d};--l:${l}">${lab}:</b>`;
  });
}
// Paired markers only count when the text inside doesn't start or end with a space, so "a == b" or "5 * 3" stay as they are.
/** @type {[RegExp, string][]} */
const PAIRS=[[/\*\*\*(?=\S)([^\n]*?\S)\*\*\*/g,"bi"],[/\*\*(?=\S)([^\n]*?\S)\*\*/g,"b"],[/~~(?=\S)([^\n]*?\S)~~/g,"s"],[/==(?=\S)([^\n]*?\S)==/g,"mark class=\"hl\""],
             [/(^|[^*\w])\*(?=[^\s*])([^*\n]*?[^\s*])\*(?![*\w])/g,"i"]];
const LINK_MD=/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;
function inline(raw){
  const keep=[]; // code spans and Markdown links are set aside first so nothing inside them gets formatted
  let t=raw.replace(/`([^`\n]+)`/g,(m,c)=>{keep.push("<code>"+esc(c)+"</code>");return"\u0000"+(keep.length-1)+"\u0000"})
           .replace(LINK_MD,(m,x,u)=>{keep.push(`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(x)}</a>`);return"\u0000"+(keep.length-1)+"\u0000"});
  let h=esc(t).replace(/(https?:\/\/[^\s*\[\]\u0000]+?)([.,;:!?)]*)(?=[\s*\[\u0000]|$)/g,
    (m,u,x)=>`<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>${x}`);
  h=autoLabels(h);
  for(let n=0;n<5&&CRE.test(h);n++){CRE.lastIndex=0;h=h.replace(CRE,(m,c,x)=>`<span class="c-${c}">${x}</span>`)}
  for(const [re,tag] of PAIRS)h=h.replace(re,tag==="i"?`$1<i>$2</i>`:tag==="bi"?"<b><i>$1</i></b>":(m,x)=>`<${tag}>${x}</${tag.split(" ")[0]}>`);
  return h.replace(/\u0000(\d+)\u0000/g,(m,k)=>keep[k]);
}
const TICK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const LINE={
  fence:/^\s*```/,heading:/^(#{1,3})\s+(.*)$/,hr:/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/,
  check:/^(\s*)[-*]\s+\[( |x|X)\]\s?(.*)$/,bullet:/^(\s*)[-*•]\s+(.*)$/,num:/^(\s*)(\d{1,3})[.)]\s+(.*)$/,quote:/^>\s?(.*)$/
};
function rich(t){
  // Older color tags that span several lines are closed and reopened on every line.
  t=t.replace(CRE,(m,c,x)=>"["+c+"]"+x.replace(/\n/g,"[/"+c+"]\n["+c+"]")+"[/"+c+"]");CRE.lastIndex=0;
  const lines=t.split("\n"),out=[];
  for(let i=0;i<lines.length;i++){
    const L=lines[i];let m;const ind=s=>Math.min(6,Math.floor(s.replace(/\t/g,"  ").length/2));
    if(LINE.fence.test(L)){
      const buf=[];while(++i<lines.length&&!LINE.fence.test(lines[i]))buf.push(lines[i]);
      out.push(`<div class="cbw"><pre>${esc(buf.join("\n"))}</pre><button type="button" class="cbc">Copy</button></div>`);
    }
    else if(m=L.match(LINE.heading))out.push(`<div class="h h${m[1].length}">${inline(m[2])}</div>`);
    else if(LINE.hr.test(L))out.push("<hr>");
    else if(m=L.match(LINE.check))out.push(`<div class="li ck${m[2]===" "?"":" done"}" data-ln="${i}" style="--ind:${ind(m[1])}"><span class="mk" role="checkbox" aria-checked="${m[2]!==" "}">${TICK}</span><span>${inline(m[3])}</span></div>`);
    else if(m=L.match(LINE.bullet))out.push(`<div class="li" style="--ind:${ind(m[1])}"><span class="mk dot">•</span><span>${inline(m[2])}</span></div>`);
    else if(m=L.match(LINE.num))out.push(`<div class="li" style="--ind:${ind(m[1])}"><span class="mk">${m[2]}.</span><span>${inline(m[3])}</span></div>`);
    else if(m=L.match(LINE.quote))out.push(`<div class="qt">${inline(m[1])||"<br>"}</div>`);
    else out.push(`<div class="ln">${L?inline(L):"<br>"}</div>`);
  }
  return out.join("");
}
// The same text without formatting marks (used by Copy, search and text export). Code is kept exactly as typed.
function plain(t){
  const lines=t.replace(new RegExp("\\[\\/?("+COLORS.join("|")+")\\]","g"),"").split("\n"),out=[];let inCode=false;
  for(const L of lines){
    if(LINE.fence.test(L)){inCode=!inCode;continue}
    if(inCode){out.push(L);continue}
    const keep=[];
    let x=L.replace(/`([^`\n]+)`/g,(m,c)=>{keep.push(c);return"\u0000"+(keep.length-1)+"\u0000"})
           .replace(LINK_MD,"$1 ($2)").replace(LINE.heading,"$2");
    for(const [re,tag] of PAIRS)x=x.replace(re,tag==="i"?"$1$2":"$1");
    out.push(x.replace(/\u0000(\d+)\u0000/g,(m,k)=>keep[k]));
  }
  return out.join("\n");
}

/* editor toolbar */
function insertText(ta,text,a,b){
  ta.focus();ta.setSelectionRange(a,b);
  // execCommand keeps Ctrl+Z working; setRangeText is the fallback
  const ok=document.execCommand&&(text===""?(a===b||document.execCommand("delete")):document.execCommand("insertText",false,text));
  if(!ok)ta.setRangeText(text,a,b,"end");
  const c=a+text.length;if(ta.selectionStart!==c||ta.selectionEnd!==c)ta.setSelectionRange(c,c); // browsers differ here, so place the cursor exactly
  grow(ta);
}
const WRAP={bold:"**",italic:"*",strike:"~~",hl:"==",code:"`"};
// Wraps the selection in a marker, or removes it if it's already there.
function wrap(bx,o){
  const ta=bx.el.ta,a=ta.selectionStart,b=ta.selectionEnd,v=ta.value,sel=v.slice(a,b),n=o.length;
  if(sel.length>=2*n&&sel.startsWith(o)&&sel.endsWith(o)){const x=sel.slice(n,-n);insertText(ta,x,a,b);ta.setSelectionRange(a,a+x.length)}
  else if(v.slice(a-n,a)===o&&v.slice(b,b+n)===o&&!(o==="*"&&(v[a-n-1]==="*"||v[b+n]==="*"))){insertText(ta,sel,a-n,b+n);ta.setSelectionRange(a-n,a-n+sel.length)}
  else{
    // keep spaces at the edges of the selection outside the markers, or the formatting wouldn't apply
    const lead=sel.match(/^\s*/)[0],trail=sel.slice(lead.length).match(/\s*$/)[0],core=sel.slice(lead.length,sel.length-trail.length);
    insertText(ta,lead+o+core+o+trail,a,b);ta.setSelectionRange(a+lead.length+n,a+lead.length+n+core.length);
  }
}
// The full lines touched by the selection.
function lineRange(ta){
  const v=ta.value,a=ta.selectionStart;let b=ta.selectionEnd;if(b>a&&v[b-1]==="\n")b--;
  const s=v.lastIndexOf("\n",a-1)+1,e=(i=>i<0?v.length:i)(v.indexOf("\n",b));
  return{s,e,lines:v.slice(s,e).split("\n")};
}
const PREFIX={h:/^#{1,3}\s+/,ul:/^\s*[-*•]\s+(?!\[[ xX]\])/,ol:/^\s*\d{1,3}[.)]\s+/,check:/^\s*[-*]\s+\[[ xX]\]\s?/,quote:/^>\s?/};
const ANYPREFIX=/^(?:#{1,3}\s+|\s*[-*]\s+\[[ xX]\]\s?|\s*[-*•]\s+|\s*\d{1,3}[.)]\s+|>\s?)/;
// Turns the selected lines into headings, list items, to-dos or quotes, or back into plain lines.
function prefixLines(bx,kind){
  const ta=bx.el.ta,{s,e,lines}=lineRange(ta),re=PREFIX[kind];
  const used=lines.filter(l=>l.trim());
  const all=used.length&&used.every(l=>re.test(l));
  let n=0;
  const out=lines.map(l=>{
    if(!l.trim()&&lines.length>1)return l;
    const body=l.replace(ANYPREFIX,"");
    if(all)return body;
    n++;return({h:"# ",ul:"- ",ol:n+". ",check:"- [ ] ",quote:"> "})[kind]+body;
  }).join("\n");
  insertText(ta,out,s,e);ta.setSelectionRange(s,s+out.length);
}
function fmt(bx,f,btn){
  const ta=bx.el.ta;
  if(WRAP[f])wrap(bx,WRAP[f]);
  else if(PREFIX[f])prefixLines(bx,f);
  else if(f==="link"){
    const a=ta.selectionStart,b=ta.selectionEnd,sel=ta.value.slice(a,b);
    if(/^https?:\/\/\S+$/.test(sel)){insertText(ta,`[link](${sel})`,a,b);ta.setSelectionRange(a+1,a+5)}
    else{const x=sel||"text";insertText(ta,`[${x}](https://)`,a,b);ta.setSelectionRange(a+x.length+3,a+x.length+11)}
  }
  else if(f==="codeblock"){
    const {s,e}=lineRange(ta),body=ta.value.slice(s,e);
    const out="```\n"+body+(body?"\n":"")+"```";insertText(ta,out,s,e);ta.setSelectionRange(s+4,s+4+body.length);
  }
  else if(f==="hr"){const {e}=lineRange(ta);insertText(ta,"\n---\n",e,e)}
  else if(f==="clear"){
    const {s,e}=lineRange(ta),a=ta.selectionStart,b=ta.selectionEnd,whole=a===b;
    const from=whole?s:a,to=whole?e:b,src=ta.value.slice(from,to);
    let x=src.split("\n").map(l=>l.replace(ANYPREFIX,"")).join("\n");
    x=x.replace(/\*\*|~~|==|`/g,"").replace(/(^|[^*])\*(?!\*)/g,"$1").replace(LINK_MD,"$1 $2").replace(new RegExp("\\[\\/?("+COLORS.join("|")+")\\]","g"),"");
    if(x!==src){insertText(ta,x,from,to);ta.setSelectionRange(from,from+x.length)}
  }
  else if(f==="help"){bx.el.help.hidden=!bx.el.help.hidden;btn&&btn.classList.toggle("on",!bx.el.help.hidden);return}
  else if(f==="preview"){
    const on=bx.el.prev.hidden;
    bx.el.prev.innerHTML=on?(ta.value.trim()?rich(ta.value):'<span class="empty">Nothing to preview.</span>'):"";
    bx.el.prev.hidden=!on;ta.hidden=on;btn&&btn.classList.toggle("on",on);
    bx.el.tools.querySelectorAll("[data-f]").forEach(x=>{if(!/^(help|preview)$/.test(x.dataset.f))x.disabled=on});
    if(!on){ta.focus();grow(ta)}
    return;
  }
  saveDraftSoon(bx);
}
// Enter inside a list starts the next item; Enter on an empty item ends the list.
function continueList(bx){
  const ta=bx.el.ta,a=ta.selectionStart;if(a!==ta.selectionEnd)return false;
  const v=ta.value,s=v.lastIndexOf("\n",a-1)+1,line=v.slice(s,a);
  if(v.slice(a,(i=>i<0?v.length:i)(v.indexOf("\n",a))).trim())return false; // only at the end of a line
  const m=line.match(/^(\s*)([-*]\s+\[[ xX]\]\s?|[-*•]\s+|(\d{1,3})([.)])\s+|>\s?)(.*)$/);if(!m)return false;
  if(!m[5].trim()){insertText(ta,"",s,a);return true}
  const next=m[3]?`${+m[3]+1}${m[4]} `:/\[[ xX]\]/.test(m[2])?m[2].replace(/\[[xX]\]/,"[ ]"):m[2];
  insertText(ta,"\n"+m[1]+next,a,a);return true;
}

