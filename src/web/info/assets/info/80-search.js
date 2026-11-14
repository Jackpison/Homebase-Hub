/* search: finds text in tab names, box titles and box text. One result per tab,
   with the first match shown; choosing it opens the tab and highlights every match there. */
let HL="",SR=[],SI=0;
const q=$("q"),sres=$("sres");
function snippet(text,at,len){
  const lineStart=text.lastIndexOf("\n",at-1)+1,lineEnd=(i=>i<0?text.length:i)(text.indexOf("\n",at+len));
  const a=Math.max(lineStart,at-40),z=Math.min(lineEnd,at+len+60);
  return (a>lineStart?"…":"")+esc(text.slice(a,at))+"<mark>"+esc(text.slice(at,at+len))+"</mark>"+esc(text.slice(at+len,z))+(z<lineEnd?"…":"");
}
function findAll(query){
  const n=query.toLowerCase(),out=[];
  TABS.forEach((t,ti)=>{
    let count=0,first=null;const nameAt=t.name.toLowerCase().indexOf(n);
    t.boxes.forEach(b=>{
      for(const [where,text] of [["title",b.title],["text",plain(b.notes)]]){
        const low=text.toLowerCase();let i=low.indexOf(n);
        if(i>=0&&!first)first={b,where,text,at:i};
        while(i>=0){count++;i=low.indexOf(n,i+n.length)}
      }
    });
    if(nameAt>=0||count)out.push({t,ti,nameAt,first,count});
  });
  return out.sort((a,b)=>+(b.nameAt>=0)-+(a.nameAt>=0)||a.ti-b.ti); // tabs whose name matches come first
}
function drawResults(){
  const query=q.value.trim();
  $("qclear").hidden=!q.value;
  if(!query){sres.hidden=true;q.setAttribute("aria-expanded","false");return}
  SR=findAll(query);SI=Math.min(SI,Math.max(0,SR.length-1));
  sres.innerHTML=SR.length?SR.map((r,i)=>{
    const c=tabColor(r.t,r.ti);
    const name=r.nameAt>=0?snippet(r.t.name,r.nameAt,query.length):esc(r.t.name);
    const sub=r.first?esc(r.first.b.title)+": "+(r.first.where==="title"?"(box title)":snippet(r.first.text,r.first.at,query.length)):"Tab name";
    return`<button type="button" class="sr" role="option" id="sr${i}" data-i="${i}" aria-selected="${i===SI}"><i class="dot" style="background:${c}"></i>`+
      `<span class="sn"><b>${name}</b><span class="sx">${sub}</span></span><span class="sc">${r.count?r.count+(r.count===1?" match":" matches"):""}</span></button>`;
  }).join(""):'<div class="snone">No Matches</div>';
  sres.hidden=false;q.setAttribute("aria-expanded","true");
  if(SR.length)q.setAttribute("aria-activedescendant","sr"+SI);else q.removeAttribute("aria-activedescendant");
}
// Wraps every match inside an element's text in <mark>, leaving links and formatting intact.
function markText(root,query){
  const n=query.toLowerCase(),nodes=[],w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,
    {acceptNode:x=>x.parentElement.closest("button")?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
  while(w.nextNode())if(w.currentNode.nodeValue.toLowerCase().includes(n))nodes.push(w.currentNode);
  for(const node of nodes){
    const v=node.nodeValue,low=v.toLowerCase(),f=document.createDocumentFragment();let i=0,j;
    while((j=low.indexOf(n,i))>=0){f.append(v.slice(i,j));const m=document.createElement("mark");m.textContent=v.slice(j,j+n.length);f.append(m);i=j+n.length}
    f.append(v.slice(i));/** @type {Text} */ (node).replaceWith(f);
  }
}
function setHighlight(query){HL=query;TABS.forEach(t=>t.boxes.forEach(b=>{if(!b.editing)renderBox(b)}))}
function pick(i){
  const r=SR[i];if(!r)return;
  sres.hidden=true;q.setAttribute("aria-expanded","false");
  setHighlight(q.value.trim());showTab(r.t.id);
  const box=(r.first?r.first.b:r.t.boxes[0]).el.title.closest(".box");
  const mk=box.querySelector("mark");(mk||box).scrollIntoView({block:"center",behavior:"smooth"});
  box.classList.remove("flash");void box.offsetWidth;box.classList.add("flash");
}
let qTimer=0;
q.addEventListener("input",()=>{clearTimeout(qTimer);qTimer=setTimeout(()=>{SI=0;drawResults();if(!q.value.trim()&&HL)setHighlight("")},60)});
q.addEventListener("focus",()=>{if(q.value.trim())drawResults()});
q.addEventListener("keydown",e=>{
  if(e.key==="ArrowDown"||e.key==="ArrowUp"){
    if(sres.hidden){drawResults();return}
    e.preventDefault();if(!SR.length)return;
    SI=(SI+(e.key==="ArrowDown"?1:-1)+SR.length)%SR.length;drawResults();$("sr"+SI).scrollIntoView({block:"nearest"});
  }else if(e.key==="Enter"){e.preventDefault();if(sres.hidden)drawResults();if(SR.length)pick(SI)}
  else if(e.key==="Escape"){if(!sres.hidden){sres.hidden=true;q.setAttribute("aria-expanded","false")}else{q.value="";drawResults();setHighlight("");q.blur()}}
});
sres.addEventListener("mousedown",e=>e.preventDefault()); // keep focus in the box while clicking a result
sres.addEventListener("click",e=>{const b=/** @type {any} */ (e.target).closest(".sr");if(b)pick(+b.dataset.i)});
$("qclear").onclick=()=>{q.value="";drawResults();setHighlight("");q.focus()};
document.addEventListener("click",e=>{if(!/** @type {any} */ (e.target).closest(".search")){sres.hidden=true;q.setAttribute("aria-expanded","false")}});
// "/" or Ctrl+K jumps to search, unless you're typing somewhere
document.addEventListener("keydown",e=>{
  const typing=/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)||document.querySelector("dialog[open]");
  if(!typing&&(e.key==="/"||((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"))){e.preventDefault();q.focus();q.select()}
});

