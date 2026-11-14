/* data: TABS = [{id, name, boxes: [box, box]}]; each box keeps its own text, revision and page elements */
function mkBox(tabId,k,src,enc){
  src=src||{};
  // the two boxes of older pages are 0 and 1 (their drafts keep their names); every other box gets a random id
  const id=/^([0-9]|[a-f0-9]{8})$/.test(String(src.id))?String(src.id):(k<2?String(k):rid());
  const b={key:tabId+"-"+id,id,tabId,k,w:okW(src.w),h:okH(src.h),hc:okColor(src.hc),title:"",notes:"",rev:0,saved:0,editing:false,theirs:null,el:null};
  intake(b,src,enc);return b;
}
const LAYS=["cards","doc"],okLay=v=>v==="doc"?"doc":"cards";   // how a tab is laid out: notebook cards (the default; "classic" from earlier versions is cards too) or one document
// Boxes: a tab has 1 to MAXBOX of them, each with a stable id, and optionally a width and a height ("" = what the layout gives it)
const MAXBOX=12,BW=["","third","half","twothirds","full"],BH=["","short","tall","xtall"],okW=v=>BW.includes(v)?v:"",okH=v=>BH.includes(v)?v:"";
const okIcon=v=>HubTabs.isIcon(v)?v:"";   // which icon a tab wears (tabs.js); empty = the document icon
const okColor=c=>typeof c==="string"&&HUB.isHex(c)?c.toLowerCase():"";
function mkTab(src){
  src=src||{};const id=/^[a-f0-9]{8}$/.test(src.id)?src.id:rid(),bx=Array.isArray(src.boxes)?src.boxes:[];
  const enc=!!src.enc||bx.some(b=>b&&(isEnc(b.title)||isEnc(b.notes))); // encrypted text always means an encrypted tab
  return{id,name:str(src.name)||"Tab",color:okColor(src.color),hc:okColor(src.hc),layout:okLay(src.layout),icon:okIcon(src.icon),private:!!src.private||enc,enc,boxes:(bx.length?bx:[{},{}]).slice(0,MAXBOX).map((x,k)=>mkBox(id,k,x,enc))};
}
/* tab colors: the first tab is gold, the rest get distinct colors; each can be changed in Edit tabs */
const PALETTE=["#d4a72c","#e5484d","#0090ff","#46a758","#8e4ec6","#f76b15","#12a594","#e93d82","#3e63dd","#99d52a",
               "#a18072","#00a2c7","#6e56cf","#ff7f6e","#7ce2fe","#8b8d4a","#ffe629","#ab4aba","#8b8d98","#f5a3c7"];
const tabColor=(t,i)=>t.color||PALETTE[i%PALETTE.length];
const freeColor=used=>PALETTE.find(c=>!used.includes(c))||"#"+Math.floor(Math.random()*0xffffff).toString(16).padStart(6,"0");
// Black or white text, whichever reads better on the tab color.
function textOn(hex){
  const n=parseInt(hex.slice(1),16),lin=c=>{c/=255;return c<=.03928?c/12.92:((c+.055)/1.055)**2.4};
  const y=.2126*lin(n>>16&255)+.7152*lin(n>>8&255)+.0722*lin(n&255);
  return (y+.05)/.05>1.05/(y+.05)?"#111":"#fff";
}
const findBox=key=>{for(const t of TABS)for(const b of t.boxes)if(b.key===key)return b};
// The tabs as stored: encrypted tabs keep their ciphertext, never the decrypted text.
const stored=(t,b)=>t.enc?{title:b.ct??b.title,notes:b.cn??b.notes}:{title:b.title,notes:b.notes};
const plainTabs=()=>TABS.map(t=>({id:t.id,name:t.name,color:t.color,hc:t.hc,layout:t.layout,icon:t.icon,private:t.private,enc:t.enc,boxes:t.boxes.map(b=>({...stored(t,b),id:b.id,w:b.w,h:b.h,hc:b.hc,rev:b.rev,saved:b.saved}))}));
// The copy kept in this browser for instant loading. Private tabs (and everything, when the page is private)
// are left out, so private text is never stored on the device. The icon is stored separately and only when it changes.
let savedIcon=null;
function keepLocal(){
  const {icon,vault,...page}=PAGE;
  lsSet(LS,JSON.stringify({tabs:PAGE.private?[]:plainTabs().filter(t=>!t.private),rev:REV,page,timer:TIMER,closed:CLOSED}));
  if(icon!==savedIcon){lsSet(ICONK,icon||null);savedIcon=icon}
}
const normTimer=t=>({every:t&&Number.isFinite(+t.every)?Math.max(0,Math.min(Math.round(+t.every),365*86400)):7*86400,last:t&&+t.last>0?Math.round(+t.last):0});
const DEF_COLORS={dark:{bg:"#000000",box:"#1a1a1a",panel:"#1a1a1a"},light:{bg:"#f4f4f2",box:"#ffffff",panel:"#ffffff"}};
const normColors=c=>{const o={};for(const m of["dark","light"]){o[m]={};for(const k of["bg","box","panel"])o[m][k]=okColor(c&&c[m]&&c[m][k])}return o};
const normPage=p=>({title:p&&typeof p.title==="string"?p.title:"",
  icon:p&&typeof p.icon==="string"&&/^data:image\/(png|jpeg);base64,/.test(p.icon)?p.icon:"",
  iconHash:p&&typeof p.iconHash==="string"?p.iconHash:"",colors:normColors(p&&p.colors),private:!!(p&&p.private),
  vault:p&&p.vault&&typeof p.vault==="object"&&p.vault.wrap?p.vault:null});
// Older page versions stored a flat list of boxes, two per tab.
/* page elements */
function buildBox(b){
  const n=$("boxTpl").content.firstElementChild.cloneNode(true);n.dataset.key=b.key;
  const q=s=>n.querySelector(s);
  b.el={title:q(".title"),copy:q('[data-r="copy"]'),edit:q('[data-r="edit"]'),cfg:q('[data-r="cfg"]'),meta:q(".meta"),info:q(".info"),form:q(".form"),tin:q(".tin"),
        ta:q("textarea"),conflict:q(".conflict"),msg:q(".msg"),save:q('[data-r="save"]'),help:q(".mdhelp"),prev:q(".prev"),tools:q(".tools")};
  b.el.ta.addEventListener("input",()=>{grow(b.el.ta,true);saveDraftSoon(b)});
  b.el.tin.addEventListener("input",()=>saveDraftSoon(b));
  n.addEventListener("keydown",e=>{
    if(!b.editing)return;
    if(e.key==="Enter"&&e.target===b.el.ta&&!e.shiftKey&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.isComposing){if(continueList(b))e.preventDefault();return}
    if(!(e.ctrlKey||e.metaKey))return;
    const k=e.key.toLowerCase(),inTa=e.target===b.el.ta;
    const keys={b:"bold",i:"italic",e:"code",k:"link"},shift={x:"strike",h:"hl"};
    if(k==="s"&&!e.shiftKey){e.preventDefault();save(b,false)}
    else if(inTa&&!e.shiftKey&&keys[k]){e.preventDefault();fmt(b,keys[k])}
    else if(inTa&&e.shiftKey&&shift[k]){e.preventDefault();fmt(b,shift[k])}
  });
  q(".tools").addEventListener("mousedown",e=>{if(/** @type {any} */ (e.target).closest("button"))e.preventDefault()}); // keep the text selected
  q(".tools").addEventListener("click",e=>{const x=/** @type {any} */ (e.target).closest("[data-f]");if(x)fmt(b,x.dataset.f,x)});
  return n;
}
// Makes the page's tab panels match TABS (adds new ones, removes deleted ones, keeps the rest untouched).
/* Makes a tab's boxes on the page match t.boxes: builds new ones, removes deleted ones, puts them in order, sets their size. */
const boxNode=b=>b.el&&b.el.title.closest(".box");
function syncBoxes(t){
  const m=$("panel-"+t.id),bx=m&&m.querySelector(".bxs");if(!bx)return;
  const want=new Set(t.boxes.map(b=>b.key)),add=bx.querySelector(".addbox"),fresh=[];
  [...bx.children].forEach(n=>{if(n.classList&&n.classList.contains("box")&&!want.has(n.dataset.key))n.remove()});
  t.boxes.forEach(b=>{
    if(!b.el||!boxNode(b)||!bx.contains(boxNode(b))){const n=buildBox(b);bx.insertBefore(n,add);fresh.push(b)}
    const n=boxNode(b);n.dataset.w=b.w||"";n.dataset.h=b.h||"";if(b.hc)n.style.setProperty("--hc",b.hc);else n.style.removeProperty("--hc");   // (1.79.3) each box has its own headline color
  });
  // order: each box right before the Add Box tile, in list order (only boxes that are out of place are moved)
  let prev=null;
  t.boxes.forEach(b=>{const n=boxNode(b),nextWanted=prev?prev.nextElementSibling:bx.firstElementChild;if(n!==nextWanted)bx.insertBefore(n,nextWanted);prev=n});
  add.hidden=t.boxes.length>=MAXBOX;
  fresh.forEach(b=>renderBox(b));renderOutline(t);
}
/* Box headline color of a tab: set on its panel, so both headlines follow it. */
function setHead(t){
  const m=$("panel-"+t.id);if(!m)return;
  if(t.hc)m.style.setProperty("--hc",t.hc);else m.style.removeProperty("--hc");
  m.dataset.lay=t.layout||"classic";m.style.setProperty("--tc",tabColor(t,Math.max(0,TABS.indexOf(t))));   // the colored edge of notebook cards follows the tab color
  renderOutline(t);
}
/* The outline of the document layout: one entry per box, taken from the box titles shown on the page. */
function renderOutline(t){
  const m=$("panel-"+t.id),o=m&&m.querySelector(".outline");if(!o)return;
  const titles=[...m.querySelectorAll(".box .title")].map((e,k)=>e.textContent.trim()||"Box "+(k+1));
  const sig=titles.join("\u0001");if(o.dataset.sig===sig)return;o.dataset.sig=sig;
  o.innerHTML='<div class="oh">Outline</div>'+titles.map((x,k)=>`<button type="button" data-k="${k}">${esc(x)}</button>`).join("");
  spyOutline();
}
// the outline entry of the box you are reading lights up
let spyOff=0;   // right after a click on the outline, the highlight stays where you clicked while the page scrolls there
function spyOutline(){
  if(Date.now()<spyOff)return;
  const m=document.querySelector(".boxes:not([hidden])[data-lay=\"doc\"]");if(!m)return;
  const bx=[...m.querySelectorAll(".box")],y=window.innerHeight*0.3;let cur=0;
  bx.forEach((b,k)=>{if(b.getBoundingClientRect().top<=y)cur=k});
  if(bx.length&&window.scrollY+window.innerHeight>=document.documentElement.scrollHeight-4)cur=bx.length-1;   // at the very bottom: the last section, even a short one
  m.querySelectorAll(".outline button").forEach((/** @type {HTMLElement} */ x)=>x.classList.toggle("on",+x.dataset.k===cur));
}
addEventListener("scroll",()=>spyOutline(),{passive:true});
$("panels").addEventListener("click",e=>{
  const x=/** @type {any} */ (e.target).closest(".outline button");if(!x)return;
  const m=x.closest(".boxes"),b=m.querySelectorAll(".box")[+x.dataset.k];
  m.querySelectorAll(".outline button").forEach(y=>y.classList.toggle("on",y===x));spyOff=Date.now()+1000;
  if(b)b.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
});
function syncDom(){
  const want=new Set(TABS.map(t=>t.id));
  [...$("panels").children].forEach(m=>{if(!want.has(m.dataset.tab))m.remove()});
  for(const t of TABS){
    if($("panel-"+t.id)){syncBoxes(t);continue}
    const m=document.createElement("main");m.className="boxes";m.id="panel-"+t.id;m.dataset.tab=t.id;m.setAttribute("role","tabpanel");m.hidden=true;
    m.insertAdjacentHTML("beforeend",`<div class="gate">${IMG_SAFE}<h3>Encrypted Tab</h3><p>This tab is encrypted. Unlock it with your ${VAULT_LOGIN()?"website password":"encryption passphrase"} to view and edit it.</p>`+
      `<button type="button" class="mbtn" data-unlock="1">Unlock</button></div>`+
      `<div class="encbar">${IMG_SAFE}<span>Encrypted tab, unlocked on this device until you ${keepOn()?"":"reload, "}log out or lock it.</span><button type="button" data-lockenc="1">Lock Now</button></div><nav class="outline" aria-label="Outline"></nav><div class="bxs"><button type="button" class="addbox" data-addbox="1">+ Add Box</button></div>`);
    $("panels").appendChild(m);syncBoxes(t);setHead(t);
  }
  renderTabs();renderGates();
  renderSoon();
}
// Renders the open tab's boxes right away and the other tabs' boxes when the browser is idle.
let idleJob=0;
function renderSoon(){
  const now=TABS.find(t=>t.id===active);if(now)now.boxes.forEach(renderBox);
  const rest=TABS.filter(t=>t!==now).flatMap(t=>t.boxes);
  /** @type {any} */
  const idle=window.requestIdleCallback||(f=>setTimeout(()=>f({timeRemaining:()=>8}),30));
  if(idleJob&&window.cancelIdleCallback)cancelIdleCallback(idleJob);
  const step=d=>{while(rest.length&&d.timeRemaining()>2){const b=rest.shift();if(b.el)renderBox(b)}if(rest.length)idleJob=idle(step);else idleJob=0};
  if(rest.length)idleJob=idle(step);
}
$("panels").addEventListener("click",e=>{
  if(/** @type {any} */ (e.target).closest("[data-unlock]")){guard(()=>ensureKey(setStatus));return}
  if(/** @type {any} */ (e.target).closest("[data-lockenc]")){if(lockEnc())setStatus("Encrypted tabs locked.");return}
  const ck=/** @type {any} */ (e.target).closest(".ck>.mk");
  if(ck&&!ck.closest(".prev")){const b=findBox(ck.closest(".box").dataset.key);if(b&&canTick())tick(b,+ck.parentElement.dataset.ln);return}
  const cc=/** @type {any} */ (e.target).closest(".cbc");
  if(cc){copyText(cc.previousElementSibling.textContent).then(ok=>{cc.textContent=ok?"Copied":"Copy failed";cc.classList.toggle("ok",ok);
    setTimeout(()=>{cc.textContent="Copy";cc.classList.remove("ok")},1500)});return}
  const ab=/** @type {any} */ (e.target).closest("[data-addbox]");if(ab){addBox(TABS.find(t=>t.id===ab.closest(".boxes").dataset.tab));return}
  const btn=/** @type {any} */ (e.target).closest("[data-r]");if(!btn)return;
  const b=findBox(btn.closest(".box").dataset.key);if(!b)return;
  const r=btn.dataset.r;
  if(r==="cfg"){if(!busy.has(b.key))guard(()=>openBoxDlg(b))}
  else if(r==="edit"){if(!busy.has(b.key))guard(()=>openEditor(b))}
  else if(r==="copy")copyBox(b,btn);
  else if(r==="cancel")closeEditor(b);
  else if(r==="save")save(b,false);
  else if(r==="mine"){b.el.conflict.hidden=true;save(b,true)}
  else if(r==="theirs")loadTheirs(b);
});

