/*! Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
const MAXTAB=20;
let TABS=[],REV=0,PAGE={title:"",icon:""},TIMER={every:7*86400,last:0},active="",locked=false,server=false,
    authed=false,EDIT=false,CLOSED=false,WAIT=false; // WAIT: logged in, waiting for the server to send private content // logged in? editing mode? whole page private and not logged in?
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const str=v=>typeof v==="string"?v:"";
const status=t=>$("sync").textContent=t;
const LS="info3",ATAB="info3-tab",ICONK="info3-icon",DRAFT=b=>"info3-draft-"+b.key;
// Unsaved text of private tabs (or of a private page) is kept only for this browser session, never in permanent storage.
const isPrivBox=b=>PAGE.private||!!(TABS.find(t=>t.id===b.tabId)||{}).private;
function dGet(b){try{return sessionStorage.getItem(DRAFT(b))||localStorage.getItem(DRAFT(b))}catch(e){return null}}
function dSet(b,v){
  if(v!=null&&tabOfBox(b).enc)v=null; // never store unencrypted drafts of encrypted tabs
  try{
    if(v==null){sessionStorage.removeItem(DRAFT(b));localStorage.removeItem(DRAFT(b));return}
    if(isPrivBox(b)){sessionStorage.setItem(DRAFT(b),v);localStorage.removeItem(DRAFT(b))}else localStorage.setItem(DRAFT(b),v);
  }catch(e){}
}
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const lsSet=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}};
const HF=(u,o)=>window.HUB?HUB.fetch(u,o):fetch(u,o);   // the site's fetch: longer timeout and a quiet retry on slow hosts
const api=body=>HF("api.php",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
const when=t=>t?new Date(t*1000).toLocaleString(undefined,{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}):"";
const savedMsg=()=>"Saved to your server"+(locked&&authed?". You're logged in.":".");
const rid=()=>Array.from(crypto.getRandomValues(new Uint8Array(4)),x=>x.toString(16).padStart(2,"0")).join("");

/* encrypted tabs. The box titles and text of an encrypted tab are encrypted here in the browser with AES-256-GCM
   before they are sent, and stored as "enc1:" + base64(iv + ciphertext). The key is random; the server only keeps it
   wrapped (encrypted) with a key derived from your passphrase (PBKDF2-SHA256, 600,000 rounds), so neither the
   server, its earlier versions nor backup files can be read without the passphrase. The unwrapped key lives only
   in this page's memory (KEY) until reload, log out or Lock. */
const V=window.HubVault,CAN_ENC=V.ok(); // the shared encryption (shell.js, section 14)
let KEY=null;const DEC=new Map(); // ciphertext -> text, memory only
const isEnc=V.isEnc;
const unwrapKey=V.unwrap; // the raw key from the passphrase (or the recovery key), otherwise null
const useKey=raw=>V.useKey(raw); // not extractable
/* "Keep unlocked on this device": the tab key is kept in this browser's IndexedDB, encrypted with a device key that
   can't be read out of the browser (non-extractable). It only opens text the server sends to a logged-in browser, and it
   is deleted when you log out (on any page of this site) or press Lock. */
const KEEPK="info-keep",keepOn=()=>lsGet(KEEPK)!=="0",setKeep=on=>lsSet(KEEPK,on?null:"0");
const VAULT_LOGIN=()=>!!(PAGE.vault&&PAGE.vault.login);
const devSave=raw=>V.devSave("dev",raw),devLoad=()=>V.devLoad("dev"),devClear=V.devDropAll;
// Opens the encrypted tabs without asking when this device kept them unlocked. A kept key that no longer fits is dropped.
let autoTried=false;
async function autoUnlock(){
  if(autoTried||KEY||!authed||!PAGE.vault||!CAN_ENC||!TABS.some(t=>t.enc))return;
  autoTried=true;
  const raw=await devLoad();if(!raw||KEY)return;
  KEY=await useKey(raw);raw.fill(0);
  await queueDecrypt();
  if(TABS.some(t=>t.enc&&t.boxes.some(b=>b.bad))){devClear();lockEnc();return}
  renderGates();if(HL)setHighlight(HL);
}
// Just logged in with the website password: encrypted tabs that use it open right away (and stay open on this device
// when "keep unlocked" is on). Runs before the page reloads.
async function unlockAfterLogin(pw){
  if(!pw||!CAN_ENC||!keepOn())return;
  try{
    const j=await fetchData(),v=j.page&&j.page.vault;
    if(!v||!v.login)return;
    const raw=await unwrapKey(v,pw);if(raw){await devSave(raw);raw.fill(0)}
  }catch(e){}
}
async function seal(text){
  // Already-encrypted text is never encrypted again: open it first (or keep it as it is if it can't be opened).
  if(isEnc(text)){try{text=(await unsealDeep(text)).text}catch(e){return text}}
  const out=await V.seal(KEY,text);DEC.set(out,text);return out;
}
async function unseal(s){
  if(!isEnc(s))return s;if(DEC.has(s))return DEC.get(s);
  const text=await V.unseal(KEY,s);
  DEC.set(s,text);return text;
}
// Opens text that may have been encrypted more than once (it happened when a tab lost its encrypted mark).
async function unsealDeep(s){
  let n=0;while(isEnc(s)&&n<5){s=await unseal(s);n++}
  if(isEnc(s))throw new Error("too many layers");
  return{text:s,layers:n};
}
function decGet(s){let n=0;while(isEnc(s)&&DEC.has(s)&&n<5){s=DEC.get(s);n++}return isEnc(s)?undefined:s}
const tabOfBox=b=>TABS.find(t=>t.id===b.tabId)||{};
// Takes a box's stored values in. For encrypted tabs it keeps the ciphertext (ct, cn) and shows the text once decrypted.
function intake(b,src,enc){
  b.rev=src.rev|0;b.saved=src.saved|0;b.bad=false;
  if(!enc){b.title=str(src.title)||"Box "+(b.k+1);b.notes=str(src.notes);b.ct=b.cn=null;b.sealed=false;return}
  b.ct=str(src.title);b.cn=str(src.notes);
  const t=isEnc(b.ct)?decGet(b.ct):b.ct,n=isEnc(b.cn)?decGet(b.cn):b.cn;
  if(t!=null&&n!=null){b.title=t||"Box "+(b.k+1);b.notes=n;b.sealed=false}
  else{b.title="Box "+(b.k+1);b.notes="";b.sealed=true;if(KEY)queueDecrypt()}
}
let decJob=null;
function queueDecrypt(){
  if(decJob)return decJob;
  decJob=(async()=>{
    await null;
    const fix=[];
    for(const t of TABS)if(t.enc)for(const b of t.boxes)if(b.sealed&&KEY){
      try{const ti=await unsealDeep(b.ct),n=await unsealDeep(b.cn);b.title=ti.text||"Box "+(b.k+1);b.notes=n.text;b.sealed=false;
        if(ti.layers>1||n.layers>1)fix.push(b)}
      catch(e){b.bad=true;b.sealed=false;b.title="Box "+(b.k+1);b.notes=""}
      if(b.el)renderBox(b);
    }
    decJob=null;renderGates();
    if(fix.length)repairLayers(fix);
  })();
  return decJob;
}
// Boxes found encrypted twice are saved again with a single layer, so the stored data is clean.
async function repairLayers(list){
  if(!server||!KEY||(locked&&!authed))return;
  let done=0;
  for(const b of list){
    if(b.editing||busy.has(b.key))continue;
    try{
      busy.add(b.key);
      const r=await api({action:"save",tab:b.tabId,box:b.id,title:await seal(b.title),notes:await seal(b.notes),rev:b.rev});
      if(r.ok){intake(b,(await r.json()).box,true);done++}
    }catch(e){}finally{busy.delete(b.key)}
  }
  if(done)status(`Repaired ${done} ${done===1?"box":"boxes"} that had been encrypted twice.`);
}
// Locked encrypted tabs show an Unlock card instead of their boxes; unlocked ones show a Lock now bar.
function renderGates(){
  for(const t of TABS){const m=$("panel-"+t.id);if(!m)continue;
    m.classList.toggle("lockd",!!t.enc&&!KEY);m.classList.toggle("unl",!!t.enc&&!!KEY)}
}
function lockEnc(){
  if(TABS.some(t=>t.enc&&t.boxes.some(b=>b.editing||busy.has(b.key)))){status("Save or cancel the encrypted box you're editing first.");return false}
  KEY=null;DEC.clear();devClear();
  for(const t of TABS)if(t.enc)for(const b of t.boxes){b.title="Box "+(b.k+1);b.notes="";b.sealed=true;if(b.el)renderBox(b)}
  renderGates();if(HL)setHighlight(HL);return true;
}

/* data: TABS = [{id, name, boxes: [box, box]}]; each box keeps its own text, revision and page elements */
function mkBox(tabId,k,src,enc){
  src=src||{};
  // the two boxes of older pages are 0 and 1 (their drafts keep their names); every other box gets a random id
  const id=/^([0-9]|[a-f0-9]{8})$/.test(String(src.id))?String(src.id):(k<2?String(k):rid());
  const b={key:tabId+"-"+id,id,tabId,k,w:okW(src.w),h:okH(src.h),title:"",notes:"",rev:0,saved:0,editing:false,theirs:null,el:null};
  intake(b,src,enc);return b;
}
const LAYS=["cards","doc"],okLay=v=>v==="doc"?"doc":"cards";   // how a tab is laid out: notebook cards (the default; "classic" from earlier versions is cards too) or one document
// Boxes: a tab has 1 to MAXBOX of them, each with a stable id, and optionally a width and a height ("" = what the layout gives it)
const MAXBOX=12,BW=["","third","half","twothirds","full"],BH=["","short","tall","xtall"],okW=v=>BW.includes(v)?v:"",okH=v=>BH.includes(v)?v:"";
const okColor=c=>typeof c==="string"&&/^#[0-9a-f]{6}$/i.test(c)?c.toLowerCase():"";
function mkTab(src){
  src=src||{};const id=/^[a-f0-9]{8}$/.test(src.id)?src.id:rid(),bx=Array.isArray(src.boxes)?src.boxes:[];
  const enc=!!src.enc||bx.some(b=>b&&(isEnc(b.title)||isEnc(b.notes))); // encrypted text always means an encrypted tab
  return{id,name:str(src.name)||"Tab",color:okColor(src.color),hc:okColor(src.hc),layout:okLay(src.layout),private:!!src.private||enc,enc,boxes:(bx.length?bx:[{},{}]).slice(0,MAXBOX).map((x,k)=>mkBox(id,k,x,enc))};
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
const plainTabs=()=>TABS.map(t=>({id:t.id,name:t.name,color:t.color,hc:t.hc,layout:t.layout,private:t.private,enc:t.enc,boxes:t.boxes.map(b=>({...stored(t,b),id:b.id,w:b.w,h:b.h,rev:b.rev,saved:b.saved}))}));
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
  b.el.ta.addEventListener("input",()=>{grow(b.el.ta);saveDraftSoon(b)});
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
  q(".tools").addEventListener("mousedown",e=>{if(e.target.closest("button"))e.preventDefault()}); // keep the text selected
  q(".tools").addEventListener("click",e=>{const x=e.target.closest("[data-f]");if(x)fmt(b,x.dataset.f,x)});
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
    const n=boxNode(b);n.dataset.w=b.w||"";n.dataset.h=b.h||"";
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
  m.querySelectorAll(".outline button").forEach(x=>x.classList.toggle("on",+x.dataset.k===cur));
}
addEventListener("scroll",()=>spyOutline(),{passive:true});
$("panels").addEventListener("click",e=>{
  const x=e.target.closest(".outline button");if(!x)return;
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
  const idle=window.requestIdleCallback||(f=>setTimeout(()=>f({timeRemaining:()=>8}),30));
  if(idleJob&&window.cancelIdleCallback)cancelIdleCallback(idleJob);
  const step=d=>{while(rest.length&&d.timeRemaining()>2){const b=rest.shift();if(b.el)renderBox(b)}if(rest.length)idleJob=idle(step);else idleJob=0};
  if(rest.length)idleJob=idle(step);
}
$("panels").addEventListener("click",e=>{
  if(e.target.closest("[data-unlock]")){guard(()=>ensureKey(status));return}
  if(e.target.closest("[data-lockenc]")){if(lockEnc())status("Encrypted tabs locked.");return}
  const ck=e.target.closest(".ck>.mk");
  if(ck&&!ck.closest(".prev")){const b=findBox(ck.closest(".box").dataset.key);if(b&&canTick())tick(b,+ck.parentElement.dataset.ln);return}
  const cc=e.target.closest(".cbc");
  if(cc){copyText(cc.previousElementSibling.textContent).then(ok=>{cc.textContent=ok?"Copied":"Copy failed";cc.classList.toggle("ok",ok);
    setTimeout(()=>{cc.textContent="Copy";cc.classList.remove("ok")},1500)});return}
  const ab=e.target.closest("[data-addbox]");if(ab){addBox(TABS.find(t=>t.id===ab.closest(".boxes").dataset.tab));return}
  const btn=e.target.closest("[data-r]");if(!btn)return;
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
  let out=hex;for(let i=0;i<60&&!ok(out);i++){l=Math.min(1,Math.max(0,l+(lighter?.02:-.02)));out=toHex(l)}
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

/* ticking a to-do in a saved box (logged in, or while no password is set) */
const canTick=()=>loaded&&(!server||!locked||authed);
async function tick(b,ln){
  if(b.editing||busy.has(b.key))return;
  const lines=b.notes.split("\n"),L=lines[ln];if(L==null||!LINE.check.test(L))return;
  lines[ln]=L.replace(/\[( |x|X)\]/,m=>m==="[ ]"?"[x]":"[ ]");
  const prev=b.notes,notes=lines.join("\n");
  b.notes=notes;
  if(!server){b.saved=nowS();keepLocal();renderBox(b);return}
  busy.add(b.key);renderBox(b);
  try{
    const enc=tabOfBox(b).enc;if(enc&&!KEY)throw 0;
    const r=await api({action:"save",tab:b.tabId,box:b.id,title:enc?(b.ct||await seal(b.title)):b.title,notes:enc?await seal(notes):notes,rev:b.rev});
    if(r.status===409){const j=await r.json();intake(b,j.box,enc);status("This box was changed elsewhere, so the newer version is shown. Check the item off again if needed.")}
    else if(r.status===403){b.notes=prev;dropAuth();status("Log in to check off items.")}
    else if(!r.ok)throw 0;
    else{const j=await r.json();intake(b,j.box,enc);status(savedMsg())}
  }catch(e){b.notes=prev;status("Couldn't reach the server, so the change wasn't saved.")}
  finally{busy.delete(b.key);keepLocal();renderBox(b)}
}
function renderBox(b){
  const e=b.el;if(!e)return;
  e.title.textContent=b.title;
  e.info.innerHTML=b.bad?'<span class="bad">This box couldn\'t be decrypted. Lock and unlock again, or check the passphrase.</span>'
    :b.notes.trim()?rich(b.notes):'<span class="empty">Nothing here yet.</span>';
  e.info.classList.toggle("can-tick",canTick());
  if(HL&&b.notes.trim())markText(e.info,HL);
  e.meta.textContent=busy.has(b.key)?"Saving…":b.saved?"Updated "+when(b.saved):"";
  const tb=TABS.find(x=>x.id===b.tabId);if(tb)renderOutline(tb);
}

/* load */
let loaded=false,lastFetch=0;
// Coming back to the page after a while quietly fetches changes made on other devices.
document.addEventListener("visibilitychange",async()=>{
  if(document.hidden||!loaded||!server)return;
  if(Date.now()-lastFetch<60000||openEdits()||document.querySelector("dialog[open]")||drag)return;
  lastFetch=Date.now();
  try{const had=authed;takeData(await fetchData());if(had&&!authed){setEdit(false);status("You were logged out on this device.")}}catch(e){}
}); // true once the server has answered (or is known to be unreachable)
const sig=d=>JSON.stringify([d.rev|0,!!d.closed,d.tabs.map(t=>[t.id,t.name,t.color||"",t.hc||"",t.layout||"",!!t.private,t.boxes.map(b=>[b.id||"",b.w||"",b.h||"",b.title,b.notes,b.rev|0,b.saved|0])]),
  d.page&&[d.page.title,d.page.icon,d.page.colors,!!d.page.private],d.timer]);
// Replaces everything shown with the given data (tabs, title, icon, colors, timer).
function applyData(d){
  CLOSED=!!d.closed;
  TABS=d.tabs.map(mkTab);REV=d.rev|0;PAGE=normPage(d.page);TIMER=normTimer(d.timer);
  $("panels").innerHTML="";active=lsGet(ATAB)||active;
  renderPage();applyColors(PAGE.colors);syncDom();
}
// Gets the page data. Logged in, it's a POST with the token so private tabs come too;
// otherwise a plain GET. The icon is only sent if it changed (ih).
async function fetchData(){
  const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),20000),ih=PAGE.iconHash||"";
  try{
    const r=await HF("api.php"+(ih?"?ih="+encodeURIComponent(ih):""),{cache:"no-store",signal:ctl.signal});
    if(!r.ok)throw 0;
    const j=await r.json();
    if(!j||!Array.isArray(j.tabs))throw 0;
    if(j.page&&j.page.iconSame)j.page.icon=PAGE.icon;
    return j;
  }finally{clearTimeout(to)}
}
// Takes server data in: replaces the page if nothing is being edited, otherwise merges it in around open editors.
function takeData(j){
  server=true;locked=!!j.locked;authed=!!j.auth;
  const ih=(j.page&&j.page.iconHash)||"";
  if(sig(j)!==sig({tabs:plainTabs(),rev:REV,page:PAGE,timer:TIMER,closed:CLOSED})){
    if(openEdits()&&!j.closed&&!CLOSED){mergeTabs(j);PAGE=normPage(j.page);TIMER=normTimer(j.timer);renderPage();applyColors(PAGE.colors);}
    else applyData(j);
  }
  PAGE.iconHash=ih;keepLocal();renderAuth();
  autoUnlock();
}
async function load(){
  renderPage(); // default title and icon right away, even on a first visit
  lsSet("info3-tok",null);   // an old per-page login token (before the one site login): no longer used (1.59)
  let local=null;
  try{
    const l=JSON.parse(lsGet(LS)||"null");
    if(l&&Array.isArray(l.tabs)){local=l;if(local.page&&!local.page.icon)local.page.icon=savedIcon=lsGet(ICONK)||""}
  }catch(e){}
  // 1. Show the copy saved in this browser straight away, so the page appears instantly.
  if(local&&(local.tabs.length||local.closed)){applyData(local);status("Checking for updates…")}
  else if(local&&local.page){PAGE=normPage(local.page);renderPage();applyColors(PAGE.colors);status("Loading…")}
  // 2. Ask the server for the latest version.
  try{
    const j=await fetchData();
    WAIT=false;takeData(j);renderTabs();lastFetch=Date.now();
    status(savedMsg());
  }catch(e){
    server=false;WAIT=false;
    if(!local||!local.tabs.length)applyData({tabs:[{name:"Information & Notes",boxes:[{title:"Information"},{title:"Notes"}]}],rev:0});
    keepLocal();status("Saved in this browser only.");
  }
  loaded=true;
  // Edits that never reached the server are reopened so they aren't lost.
  // Drafts from the previous page version (numbered boxes) map onto the tabs in the same order.
  for(let i=0;i<10;i++){const d=lsGet("info2-draft-"+i);if(d){const b=TABS[i>>1]&&TABS[i>>1].boxes[i&1];if(b&&!dGet(b))dSet(b,d);lsSet("info2-draft-"+i,null)}}
  const lost=[];
  for(const t of TABS)for(const b of t.boxes){
    try{const d=JSON.parse(dGet(b)||"null");
      if(d&&typeof d.text==="string"&&(d.text!==b.notes||(d.title&&d.title!==b.title)))lost.push([b,d]);else dSet(b,null);
    }catch(e){dSet(b,null)}
  }
  if(lost.length)guard(()=>lost.forEach(([b,d],n)=>{
    if(!n){showTab(b.tabId);setEdit(true)}
    openEditor(b,d.text,d.title);if(typeof d.rev==="number")b.rev=d.rev;
    b.el.msg.textContent="Your last edit wasn't saved, so it's back in the editor. Save it now to keep it.";
  }));
}

/* editor */
function grow(ta){const y=window.scrollY;ta.style.height="auto";ta.style.height=ta.scrollHeight+2+"px";window.scrollTo(0,y)}
function saveDraft(b){clearTimeout(b.dt);if(b.editing)dSet(b,JSON.stringify({text:b.el.ta.value,title:b.el.tin.value,rev:b.rev}))}
function saveDraftSoon(b){clearTimeout(b.dt);b.dt=setTimeout(()=>saveDraft(b),400)} // typing doesn't write to storage on every key
function openEditor(b,text,title){
  const e=b.el,y=window.scrollY;
  b.editing=true;b.theirs=null;e.conflict.hidden=true;e.msg.textContent="";syncBoxEdit();
  // always open in writing mode (not preview), with the help closed
  e.prev.hidden=true;e.prev.innerHTML="";e.ta.hidden=false;e.help.hidden=true;
  e.tools.querySelectorAll("[data-f]").forEach(x=>{x.disabled=false;x.classList.remove("on")});
  e.ta.value=text??b.notes;e.tin.value=title||b.title;
  e.form.hidden=false;e.info.hidden=true;e.copy.hidden=true;e.edit.hidden=true;e.cfg.hidden=true;
  // Grow the box to fit the text and put the cursor at the start, so the page doesn't jump to the end.
  grow(e.ta);e.ta.focus({preventScroll:true});e.ta.setSelectionRange(0,0);e.ta.scrollTop=0;window.scrollTo(0,y);
}
// The floating editing bar steps aside while a box is open, so it never covers Cancel and save.
const syncBoxEdit=()=>document.body.classList.toggle("boxedit",TABS.some(t=>t.boxes.some(x=>x.editing)));
function hideEditor(b){const e=b.el;b.editing=false;setTimeout(syncBoxEdit,0);e.form.hidden=true;e.info.hidden=false;e.copy.hidden=false;e.edit.hidden=false;e.cfg.hidden=false}
function closeEditor(b){clearTimeout(b.dt);hideEditor(b);dSet(b,null)}
window.addEventListener("beforeunload",ev=>{
  if(busy.size||TABS.some(t=>t.boxes.some(b=>b.editing&&(b.el.ta.value!==b.notes||b.el.tin.value.trim()!==b.title)))){ev.preventDefault();ev.returnValue=""}
});

const busy=new Set(); // boxes with a save on its way to the server
async function save(b,force){
  const e=b.el,text=e.ta.value,title=e.tin.value.trim().slice(0,80)||b.title;
  if(busy.has(b.key))return; // a second Ctrl+S while saving would look like a conflict
  if(!server){Object.assign(b,{notes:text,title,saved:Math.floor(Date.now()/1000)});keepLocal();renderBox(b);closeEditor(b);status("Saved in this browser only.");return}
  // Show the new text straight away; the server catches up in the background.
  // The draft stays in this browser until the server confirms, so nothing is lost if it fails.
  const prev={title:b.title,notes:b.notes};
  busy.add(b.key);
  Object.assign(b,{notes:text,title});hideEditor(b);renderBox(b);status("Saving…");
  const back=msg=>{busy.delete(b.key);Object.assign(b,prev);renderBox(b);openEditor(b,text,title);e.msg.textContent=msg};
  try{
    const enc=tabOfBox(b).enc;
    if(enc&&!KEY){back("This tab is locked. Unlock it, then save again.");status("Not saved yet.");return}
    const r=await api({action:"save",tab:b.tabId,box:b.id,title:enc?await seal(title):title,notes:enc?await seal(text):text,rev:b.rev,force});
    if(r.status===403){dropAuth();back("");status(savedMsg());guard(()=>save(b,force));return}
    if(r.status===429){back("Too many wrong password tries. Wait a few minutes, then save again.");status(savedMsg());return}
    if(r.status===409){const j=await r.json();back("");b.theirs=await openTheirs(b,j.box);e.conflict.hidden=false;status("Not saved yet. Choose which version to keep.");return}
    if(r.status===404){back("This tab was removed on another device, so this text can't be saved here. Copy it before you leave the page.");status("Not saved");return}
    if(!r.ok)throw 0;
    const j=await r.json();
    busy.delete(b.key);
    intake(b,j.box,tabOfBox(b).enc);
    dSet(b,null);keepLocal();renderBox(b);status(savedMsg());
  }catch(err){
    back("Couldn't reach the server. Your text is kept in this browser; try Save again.");
    status("Not saved to the server.");
  }finally{busy.delete(b.key)}
}
// The other device's version of a box, decrypted if needed, for "Load the newer version".
async function openTheirs(b,box){
  const enc=tabOfBox(b).enc;
  if(enc&&KEY){try{await unseal(box.title);await unseal(box.notes)}catch(e){}}
  return box;
}
function loadTheirs(b){
  const e=b.el,t=b.theirs;if(!t)return;
  intake(b,t,tabOfBox(b).enc);b.theirs=null;
  keepLocal();renderBox(b);e.ta.value=b.notes;e.tin.value=b.title;grow(e.ta);dSet(b,null);e.conflict.hidden=true;status(savedMsg());
}

/* copy: copies the box text without formatting marks (code stays exactly as typed) */
async function copyText(t){
  try{await navigator.clipboard.writeText(t);return true}
  catch(e){ // older browsers, or pages not served over https
    const x=document.createElement("textarea");x.value=t;x.setAttribute("readonly","");x.style.cssText="position:fixed;opacity:0;top:0";
    document.body.appendChild(x);x.select();let ok=false;try{ok=document.execCommand("copy")}catch(_){}x.remove();return ok;
  }
}
async function copyBox(b,btn){
  const t=plain(b.notes);
  const say=(txt,good)=>{btn.textContent=txt;btn.classList.toggle("ok",!!good);clearTimeout(btn._t);btn._t=setTimeout(()=>{btn.textContent="Copy";btn.classList.remove("ok")},1600)};
  if(!t.trim()){say("Nothing to copy");return}
  const ok=await copyText(t);say(ok?"Copied":"Copy failed",ok);
}

/* tabs */
const PEN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>';
/* Padlock pictures: a gold padlock marks a private tab, a green safe padlock marks an encrypted one (web/hub/core/assets/brand). */
const IMG_LOCK='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="#C98F00" stroke-width="2.4" stroke-linecap="round"/><rect x="4.5" y="10.5" width="15" height="10.5" rx="3" fill="#F7B500"/><rect x="4.5" y="10.5" width="15" height="3.2" rx="1.6" fill="#FFD25A" opacity=".55"/><circle cx="12" cy="15.2" r="1.7" fill="#5A3B00"/><rect x="11.2" y="15.9" width="1.6" height="3" rx=".8" fill="#5A3B00"/></svg>',IMG_SAFE='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="#13935A" stroke-width="2.4" stroke-linecap="round"/><rect x="4.5" y="10.5" width="15" height="10.5" rx="3" fill="#25C07D"/><rect x="4.5" y="10.5" width="15" height="3.2" rx="1.6" fill="#6EE0AC" opacity=".5"/><path d="M8.9 15.9l2.3 2.3 4-4.4" fill="none" stroke="#073D26" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function renderTabs(){
  const empty=!TABS.length;
  $("closed").hidden=WAIT||!(CLOSED||(empty&&!authed));
  $("closedT").textContent=CLOSED?"This page is private":"No public tabs yet";
  $("closedP").textContent=CLOSED?"Log in to view this page.":"Log in to view the private tabs.";
  $("tabs").hidden=CLOSED;
  if(empty){$("tabs").innerHTML="";return}
  if(!TABS.some(t=>t.id===active))active=TABS[0].id;
  // Each tab is a wrapper holding the tab button and its pencil button (shown while editing).
  $("tabs").innerHTML=TABS.map((t,i)=>{const c=tabColor(t,i),on=t.id===active,id=esc(t.id),nm=esc(t.name);
    return`<div class="tabi${on?" on":""}" role="none" data-t="${id}" style="--tc:${c};--tf:${textOn(c)}">`+
      `<button class="tab" role="tab" data-t="${id}" aria-selected="${on}">${nm}`+
      (t.enc?`<span class="lk enc" title="Encrypted tab: encrypted with your passphrase">${IMG_SAFE}</span>`
       :t.private?`<span class="lk" title="Private tab: only visible when you're logged in">${IMG_LOCK}</span>`:"")+`</button>`+
      `<button class="pen" type="button" title="Edit Tab" aria-label="Edit tab ${nm}">${PEN}</button></div>`}).join("")+
    (TABS.length<MAXTAB?'<button class="tab add" data-add="1" title="Add Tab" aria-label="Add Tab">+</button>':"");
  for(const t of TABS){const m=$("panel-"+t.id);if(m){m.hidden=t.id!==active;m.style.setProperty("--tc",tabColor(t,TABS.indexOf(t)))}}
  spyOutline();
}
// Switching tabs only flips classes; the tab row isn't rebuilt.
function showTab(id){
  active=id;lsSet(ATAB,id);
  const ws=$("tabs").querySelectorAll(".tabi");
  if(!ws.length){renderTabs();return}
  ws.forEach(w=>{const on=w.dataset.t===id;w.classList.toggle("on",on);w.firstElementChild.setAttribute("aria-selected",on)});
  for(const t of TABS){const m=$("panel-"+t.id);if(m)m.hidden=t.id!==id}
  spyOutline();
  const t=TABS.find(x=>x.id===id);if(t)t.boxes.forEach(b=>{if(b.el&&!b.el.info.childNodes.length)renderBox(b)});
}
let noClick=false; // set right after a drag so the drop doesn't also count as a click
$("tabs").onclick=e=>{
  if(noClick)return;
  const pen=e.target.closest(".pen");if(pen){guard(()=>openTabEditor(pen.parentElement.dataset.t));return}
  const b=e.target.closest(".tab");if(!b)return;
  if(b.dataset.add)guard(()=>openTabEditor(null));else showTab(b.dataset.t);
};
$("tabs").addEventListener("contextmenu",e=>{if(EDIT&&e.target.closest(".tabi"))e.preventDefault()}); // no long-press menu while editing
const openEdits=()=>TABS.some(t=>t.boxes.some(b=>b.editing||busy.has(b.key)));

/* drag tabs to reorder them (editing mode). The tab follows the pointer; the others glide aside.
   Mouse: start moving. Touch: press and hold briefly, then drag (a quick swipe still scrolls the row). */
let drag=null,dragRaf=0;
$("tabs").addEventListener("pointerdown",e=>{
  if(!EDIT||e.button>0||e.target.closest(".pen"))return;
  const w=e.target.closest(".tabi");if(!w)return;
  drag={w,pid:e.pointerId,x0:e.clientX,y0:e.clientY,x:e.clientX,touch:e.pointerType!=="mouse",on:false,timer:0};
  if(drag.touch)drag.timer=setTimeout(()=>{if(drag&&!drag.on)startDrag()},220);
});
function startDrag(){
  const w=drag.w;drag.on=true;
  drag.grab=drag.x0-w.getBoundingClientRect().left;
  w.classList.add("dragging");document.body.classList.add("dragtabs");
  if(drag.touch&&navigator.vibrate)try{navigator.vibrate(8)}catch(_){}
  dragFrame();
}
document.addEventListener("pointermove",e=>{
  if(!drag||e.pointerId!==drag.pid)return;
  drag.x=e.clientX;
  if(!drag.on){
    const d=Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0);
    if(drag.touch){if(d>10){clearTimeout(drag.timer);drag=null}return} // moved before the hold: it's a scroll
    if(d<5)return;startDrag();
  }
  e.preventDefault();
  if(!dragRaf)dragRaf=requestAnimationFrame(dragFrame);
},{passive:false});
$("tabs").addEventListener("touchmove",e=>{if(drag&&drag.on)e.preventDefault()},{passive:false});
// Slides a tab from where it was to where it now is.
function glide(el,dx){
  if(!dx)return;
  el.style.transition="none";el.style.transform=`translateX(${dx}px)`;void el.offsetWidth;
  el.style.transition="transform .22s cubic-bezier(.2,.8,.2,1)";el.style.transform="";
}
function dragFrame(){
  dragRaf=0;if(!drag||!drag.on)return;
  const w=drag.w,row=$("tabs"),rr=row.getBoundingClientRect();
  // scroll the row when the pointer is near its edges
  const edge=48,sp=drag.x<rr.left+edge?-(rr.left+edge-drag.x):drag.x>rr.right-edge?drag.x-(rr.right-edge):0;
  if(sp)row.scrollLeft+=sp/3;
  const slot=()=>rr.left+w.offsetLeft-row.scrollLeft; // where the tab sits without the drag offset
  let tx=drag.x-drag.grab-slot();
  const mid=w.offsetLeft+tx+w.offsetWidth/2;
  const prev=w.previousElementSibling,next=w.nextElementSibling&&w.nextElementSibling.classList.contains("tabi")?w.nextElementSibling:null;
  // swap with a neighbour once the dragged tab's middle passes the neighbour's middle
  const swap=prev&&mid<prev.offsetLeft+prev.offsetWidth/2?prev:next&&mid>next.offsetLeft+next.offsetWidth/2?next:null;
  if(swap){
    const was=swap.getBoundingClientRect().left; // where it is on screen now (including any glide in progress)
    if(swap===prev)row.insertBefore(w,prev);else row.insertBefore(next,w);
    glide(swap,was-(rr.left+swap.offsetLeft-row.scrollLeft));
    tx=drag.x-drag.grab-slot();
  }
  w.style.transition="none";w.style.transform=`translateX(${tx}px)`;
  if(sp)dragRaf=requestAnimationFrame(dragFrame); // keep scrolling while held at an edge
}
function endDrag(e){
  if(!drag||e.pointerId!==drag.pid)return;
  clearTimeout(drag.timer);const d=drag;drag=null;
  if(!d.on)return;
  cancelAnimationFrame(dragRaf);dragRaf=0;
  noClick=true;setTimeout(()=>noClick=false,0);
  document.body.classList.remove("dragtabs");
  // glide the tab into its new place, then save the order
  const w=d.w;w.style.transition="transform .2s cubic-bezier(.2,.8,.2,1)";w.style.transform="";
  setTimeout(()=>{w.style.transition="";w.classList.remove("dragging")},210);
  const order=[...$("tabs").querySelectorAll(".tabi")].map(x=>x.dataset.t);
  if(order.join()===TABS.map(t=>t.id).join())return;
  // Colors that come from the tab's position are fixed first, so tabs keep their colors when they move.
  const list=order.map(id=>{const i=TABS.findIndex(t=>t.id===id),t=TABS[i];return{id,name:t.name,color:tabColor(t,i),hc:t.hc,private:t.private}});
  setTimeout(()=>saveTabsList(list,status,()=>status("Tab order saved.")),220);
}
document.addEventListener("pointerup",endDrag);document.addEventListener("pointercancel",endDrag);

// Keeps the boxes of tabs that still exist (and any open editors), adds new tabs, drops removed ones.
function mergeTabs(d){
  const old=new Map(TABS.map(t=>[t.id,t]));
  TABS=d.tabs.map(src=>{
    const t=old.get(src.id);if(!t)return mkTab(src);
    t.name=src.name;t.color=okColor(src.color);t.hc=okColor(src.hc);t.layout=okLay(src.layout);setHead(t);
    t.enc=!!src.enc||(src.boxes||[]).some(b=>b&&(isEnc(b.title)||isEnc(b.notes)));t.private=!!src.private||t.enc;
    // boxes are matched by id, so adding, removing and reordering on another device lands on the right box
    const had=new Map(t.boxes.map(b=>[b.id,b]));
    t.boxes=(Array.isArray(src.boxes)?src.boxes:[]).map((x,k)=>{
      const b=had.get(String(x&&x.id!=null?x.id:(k<2?k:"")));
      if(!b)return mkBox(t.id,k,x,t.enc);
      b.k=k;b.w=okW(x.w);b.h=okH(x.h);if(!b.editing&&!busy.has(b.key))intake(b,x,t.enc);return b;
    });
    return t;
  });
  REV=d.rev|0;keepLocal();syncDom();renderGates();
}
// Saves the whole tab list: [{id or null for new, name, color, private}]. Calls done() once saved.
async function saveTabsList(list,say,done){
  const before=new Set(TABS.map(t=>t.id));
  const showNew=()=>{const t=TABS.find(x=>!before.has(x.id));if(t)showTab(t.id)};
  if(!server){
    mergeTabs({rev:REV+1,tabs:list.map(x=>{const t=plainTabs().find(y=>y.id===x.id);return t?{...t,name:x.name,color:x.color,hc:x.hc,private:x.private}:{id:rid(),name:x.name,color:x.color,hc:x.hc,private:x.private}})});
    showNew();if(done)done();return;
  }
  try{
    const r=await api({action:"save_tabs",tabs:list,rev:REV});
    if(r.status===403){dropAuth();status(savedMsg());renderTabs();guard(()=>saveTabsList(list,say,done));return}
    if(r.status===429){say("Too many wrong password tries. Wait a few minutes, then try again.");return}
    if(r.status===409){const j=await r.json();mergeTabs(j.data);say("The tabs were changed on another device. The latest tabs are shown now, so please make your change again.");return}
    if(!r.ok)throw 0;
    const j=await r.json();
    // Text of removed tabs is gone, so their unsaved drafts go too.
    const keep=new Set(j.data.tabs.map(t=>t.id));
    TABS.filter(t=>!keep.has(t.id)).forEach(t=>t.boxes.forEach(b=>dSet(b,null)));
    mergeTabs(j.data);showNew();status(savedMsg());if(done)done();
  }catch(e){say("Couldn't reach the server, so the tabs weren't changed.");renderTabs()}
}

/* ---------- Boxes: add, resize, move and delete ---------- */
// Saves the box list of one tab: [{id or null for a new box, w, h}] in the order wanted. done(before) gets the ids that existed before.
async function saveBoxList(t,list,say,done){
  const before=new Set(t.boxes.map(b=>b.id));
  if(!server){
    const pt=plainTabs(),x=pt.find(y=>y.id===t.id);
    x.boxes=list.map(e=>{const o=x.boxes.find(b=>b.id===e.id);return o?{...o,w:e.w,h:e.h}:{id:rid(),title:"",notes:"",rev:0,saved:0,w:e.w,h:e.h}});
    mergeTabs({rev:REV+1,tabs:pt});if(done)done(before);return;
  }
  try{
    const r=await api({action:"save_boxes",tab:t.id,boxes:list,rev:REV});
    if(r.status===403){dropAuth();status(savedMsg());renderTabs();guard(()=>saveBoxList(t,list,say,done));return}
    if(r.status===409){const j=await r.json();if(j.data)mergeTabs(j.data);say("This tab was changed on another device. The latest version is shown now, so please make your change again.");return}
    if(!r.ok)throw 0;
    const j=await r.json(),keep=new Set(j.data.tabs.flatMap(x=>x.boxes.map(b=>x.id+"-"+b.id)));
    t.boxes.forEach(b=>{if(!keep.has(b.key))dSet(b,null)});   // the text of a removed box is gone, so its unsaved draft goes too
    mergeTabs(j.data);status(savedMsg());if(done)done(before);
  }catch(e){say("Couldn't reach the server, so nothing was changed.")}
}
function addBox(t){
  if(!t||t.boxes.length>=MAXBOX)return;
  guard(()=>{
    const list=t.boxes.map(b=>({id:b.id,w:b.w,h:b.h}));list.push({id:null,w:"",h:""});
    saveBoxList(t,list,status,before=>{
      const nb=t.boxes.find(b=>!before.has(b.id));if(!nb)return;
      const n=boxNode(nb);if(n)n.scrollIntoView({behavior:"smooth",block:"center"});
      if(!(t.enc&&!KEY))openEditor(nb);   // a new box opens ready to type in
    });
  });
}
const bxdlg=$("bxdlg");let BX=null;
function openBoxDlg(b){
  const t=TABS.find(x=>x.id===b.tabId);if(!t)return;
  if(b.editing){status("Save or cancel this box first.");return}
  BX={t,b,w:b.w,h:b.h,pos:t.boxes.indexOf(b),armed:false};
  $("bxname").textContent=b.sealed?"Locked box":b.title;
  $("bxmsg").textContent="";$("bxdel").textContent="Delete Box";$("bxdel").hidden=t.boxes.length<2;bxUI();bxdlg.showModal();
}
function bxUI(){
  for(const [id,key] of [["bxw","w"],["bxh","h"]])document.querySelectorAll("#"+id+" .opt").forEach(x=>{const on=x.dataset.v===BX[key];x.classList.toggle("on",on);x.setAttribute("aria-checked",on)});
  const n=BX.t.boxes.length;$("bxpos").textContent="Position "+(BX.pos+1)+" of "+n;$("bxleft").disabled=BX.pos<1;$("bxright").disabled=BX.pos>=n-1;
  $("bxwhint").textContent=BX.w?"":"Auto means "+(BX.t.layout==="doc"?"the full width of the page.":"half the width.");
}
$("bxw").addEventListener("click",e=>{const x=e.target.closest(".opt");if(x){BX.w=okW(x.dataset.v);bxUI()}});
$("bxh").addEventListener("click",e=>{const x=e.target.closest(".opt");if(x){BX.h=okH(x.dataset.v);bxUI()}});
$("bxleft").onclick=()=>{BX.pos=Math.max(0,BX.pos-1);bxUI()};
$("bxright").onclick=()=>{BX.pos=Math.min(BX.t.boxes.length-1,BX.pos+1);bxUI()};
$("bxcancel").onclick=()=>bxdlg.close();
function bxList(remove){
  const list=BX.t.boxes.filter(x=>x!==BX.b).map(x=>({id:x.id,w:x.w,h:x.h}));
  if(!remove)list.splice(BX.pos,0,{id:BX.b.id,w:BX.w,h:BX.h});
  return list;
}
$("bxdel").onclick=()=>{
  if((BX.b.sealed||BX.b.notes.trim())&&!BX.armed){BX.armed=true;$("bxdel").textContent="Delete Box and Its Text?";return}   // a box with text needs a second click
  saveBoxList(BX.t,bxList(true),x=>$("bxmsg").textContent=x,()=>bxdlg.close());
};
$("bxform").addEventListener("submit",e=>{e.preventDefault();saveBoxList(BX.t,bxList(false),x=>$("bxmsg").textContent=x,()=>bxdlg.close())});

/* Edit tab dialog: name, color, private, position, delete. Also used for new tabs (id null). */
const etdlg=$("etdlg");let ET=null;
const hasText=id=>{const t=TABS.find(x=>x.id===id);return!!t&&t.boxes.some(b=>b.notes.trim())};
function nextTabName(){let n=TABS.length+1;const names=new Set(TABS.map(t=>t.name.trim().toLowerCase()));while(names.has("tab "+n))n++;return"Tab "+n}
function etPos(){
  const n=TABS.length+(ET.id?0:1);
  $("etpos").textContent=`Position ${ET.pos+1} of ${n}`;$("etleft").disabled=ET.pos<=0;$("etright").disabled=ET.pos>=n-1;
}
function openTabEditor(id){
  const i=id?TABS.findIndex(t=>t.id===id):-1,t=i>=0?TABS[i]:null;
  if(!t&&TABS.length>=MAXTAB)return;
  ET={id:t?t.id:null,pos:t?i:TABS.length,armed:false};
  ET.color=t?t.color:freeColor(TABS.map((x,j)=>tabColor(x,j)));ET.hc=t?t.hc||"":"";ET.layout=t?t.layout:"cards";layUI();
  $("ett").textContent=t?"Edit Tab":"New Tab";$("etsave").textContent=t?"Save Tab":"Add Tab";
  $("etname").value=t?t.name:nextTabName();
  $("etcolor").value=ET.color||tabColor({color:""},ET.pos);
  $("ethc").value=ET.hc||"#ffffff";$("ethcdef").textContent=ET.hc?"Use default":"Default";
  const noPw=server&&!locked;
  $("etpriv").checked=!!(t&&t.private);$("etpriv").disabled=noPw;
  $("etenc").checked=!!(t&&t.enc);ET.wasEnc=!!(t&&t.enc);etEncUI();
  $("etprivnote").textContent=noPw?"Create a password first (in Settings) so private tabs can be hidden from visitors."
    :"Only visible when you're logged in. Visitors never receive this tab.";
  $("etdel").hidden=!t||TABS.length<2;$("etdel").textContent="Delete Tab";
  $("etmsg").textContent="";etPos();hxSync();etdlg.showModal();$("etname").focus();$("etname").select();
}
// Layout of this tab: the three designs, chosen with buttons that show a little picture of each.
function layUI(){document.querySelectorAll("#etlays .lay").forEach(b=>{const on=b.dataset.lay===ET.layout;b.setAttribute("aria-checked",on);b.classList.toggle("on",on)})}
$("etlays").addEventListener("click",e=>{const b=e.target.closest(".lay");if(!b)return;ET.layout=okLay(b.dataset.lay);layUI()});
$("etlays").addEventListener("keydown",e=>{
  if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key))return;e.preventDefault();
  const i=LAYS.indexOf(ET.layout),n=(i+(e.key==="ArrowLeft"||e.key==="ArrowUp"?-1:1)+LAYS.length)%LAYS.length;
  ET.layout=LAYS[n];layUI();document.querySelector(`#etlays .lay[data-lay="${ET.layout}"]`).focus();
});
$("etcolor").addEventListener("input",e=>{ET.color=e.target.value.toLowerCase();hxSync()});
$("ethc").addEventListener("input",e=>{ET.hc=e.target.value.toLowerCase();$("ethcdef").textContent="Use default";hxSync()});
// Colors can also be typed: #1a1a1a, 1a1a1a or #fff. An empty box means the default.
const hexOf=v=>{v=String(v||"").trim().replace(/^#/,"");if(/^[0-9a-f]{3}$/i.test(v))v=v.replace(/./g,"$&$&");return/^[0-9a-f]{6}$/i.test(v)?"#"+v.toLowerCase():""};
function hxSync(){$("etcolortx").value=ET.color||"";$("ethctx").value=ET.hc||"";$("etcolortx").classList.remove("bad");$("ethctx").classList.remove("bad")}
$("etcolortx").addEventListener("input",e=>{const h=hexOf(e.target.value);e.target.classList.toggle("bad",!h&&!!e.target.value.trim());if(h){ET.color=h;$("etcolor").value=h}else if(!e.target.value.trim())ET.color=""});
$("ethctx").addEventListener("input",e=>{const h=hexOf(e.target.value);e.target.classList.toggle("bad",!h&&!!e.target.value.trim());if(h){ET.hc=h;$("ethc").value=h;$("ethcdef").textContent="Use default"}else if(!e.target.value.trim()){ET.hc="";$("ethcdef").textContent="Default"}});
$("ethcdef").onclick=()=>{ET.hc="";$("ethc").value="#ffffff";$("ethcdef").textContent="Default";hxSync()};
// Encrypt needs a password, a secure (https) page and the server; an encrypted tab is always private.
function etEncUI(){
  const why=!CAN_ENC?"Encryption needs the page to be opened over a secure (https) connection."
    :!server?"Encryption needs the server, which can't be reached right now."
    :!locked?"Create a password first (in Settings), then you can encrypt tabs."
    :!PAGE.vault&&!(ET.id&&TABS.some(x=>x.id===ET.id&&x.enc))?"Set an encryption passphrase first: Settings › Security › Encryption.":"";
  $("etenc").disabled=!!why;
  if($("etenc").checked){$("etpriv").checked=true;$("etpriv").disabled=true}else $("etpriv").disabled=server&&!locked;
  $("etencnote").textContent=why||($("etenc").checked
    ?"The box titles and text are encrypted in your browser with your encryption passphrase, so the server, earlier versions and backups only hold scrambled data. The tab name isn't encrypted."
    :"For extra protection, encrypt the box titles and text with your encryption passphrase.");
}
$("etenc").addEventListener("change",etEncUI);
// With a passphrase set, a new private tab is encrypted from the start (untick Encrypt to keep it private only)
$("etpriv").addEventListener("change",()=>{if(!$("etpriv").checked)$("etenc").checked=false;else if(!ET.id&&!$("etenc").disabled)$("etenc").checked=true;etEncUI()});
$("etdef").onclick=()=>{ET.color="";$("etcolor").value=tabColor({color:""},ET.pos);hxSync()};
$("etleft").onclick=()=>{ET.pos--;etPos();if(!ET.color)$("etcolor").value=tabColor({color:""},ET.pos)};
$("etright").onclick=()=>{ET.pos++;etPos();if(!ET.color)$("etcolor").value=tabColor({color:""},ET.pos)};
$("etcancel").onclick=()=>etdlg.close();
function etList(remove){
  // Fix the position-based colors of the other tabs, so they keep their colors when positions change.
  const list=TABS.map((t,i)=>({id:t.id,name:t.name,color:tabColor(t,i),hc:t.hc,layout:t.layout,private:t.private,enc:t.enc})).filter(x=>x.id!==ET.id);
  if(!remove)list.splice(ET.pos,0,{id:ET.id,name:$("etname").value.trim().slice(0,40)||nextTabName(),color:ET.color,hc:ET.hc,layout:ET.layout,
    private:$("etpriv").checked||$("etenc").checked,enc:$("etenc").checked});
  return list;
}
$("etdel").onclick=()=>{
  if(hasText(ET.id)&&!ET.armed){ET.armed=true;$("etdel").textContent="Delete Tab and Its Text?";return} // tabs with text need a second click
  saveTabsList(etList(true),t=>$("etmsg").textContent=t,()=>etdlg.close());
};
$("etform").addEventListener("submit",async e=>{
  e.preventDefault();
  const say=x=>$("etmsg").textContent=x,want=$("etenc").checked,t=ET.id?TABS.find(x=>x.id===ET.id):null,was=!!(t&&t.enc);
  if(want&&!KEY&&!(await ensureKey(say)))return;   // encrypting needs the key: set or unlock the passphrase first
  if(!want&&was&&!KEY&&!(await ensureKey(say)))return;
  if(t&&want!==was){
    if(t.boxes.some(b=>b.editing||busy.has(b.key))){say("Save or cancel the open box in this tab first.");return}
    $("etsave").disabled=true;say(want?"Encrypting…":"Decrypting…");
    const ok=await convertTab(t,want,say);$("etsave").disabled=false;if(!ok)return;
  }
  saveTabsList(etList(false),say,async()=>{
    etdlg.close();renderGates();
    if(want&&!was&&t){ // remove earlier versions that still hold this tab's unencrypted text
      try{await api({action:"clear_versions"})}catch(err){}
      status("Tab encrypted. Earlier versions were deleted so no unencrypted copy stays on the server.");
    }else if(!want&&was)status("Tab decrypted. It's still a private tab.");
  });
});
// Rewrites a tab's two boxes encrypted (or back to plain text) on the server.
async function convertTab(t,encrypt,say){
  if(t.enc)await queueDecrypt();
  for(const b of t.boxes){
    if(b.bad){say("A box in this tab couldn't be decrypted, so it can't be converted.");return false}
    try{
      const title=encrypt?await seal(b.title):b.title,notes=encrypt?await seal(b.notes):b.notes;
      const r=await api({action:"save",tab:t.id,box:b.id,title,notes,rev:b.rev});
      if(r.status===409){say("This tab was changed on another device. Close this dialog and try again.");return false}
      if(r.status===403){dropAuth();say("Log in again, then try again.");return false}
      if(!r.ok)throw 0;
      intake(b,(await r.json()).box,encrypt);
    }catch(err){say("Couldn't reach the server. The tab wasn't changed.");return false}
  }
  return true;
}

// Locks every private tab that is still readable, in one go (the key is asked for once); earlier readable versions are then deleted
const plainPrivate=()=>TABS.filter(t=>t.private&&!t.enc);
function encRowUI(){const n=plainPrivate().length;$("sencrow").hidden=!(CAN_ENC&&server&&locked&&PAGE.vault&&n);$("sencall").textContent=n===1?"Encrypt 1 Tab":"Encrypt "+n+" Tabs"}
$("sencall").onclick=async()=>{
  const say=x=>$("setmsg").textContent=x,todo=plainPrivate();if(!todo.length)return;
  if(!KEY&&!(await ensureKey(say)))return;
  if(todo.some(t=>t.boxes.some(b=>b.editing||busy.has(b.key)))){say("Save or cancel the box you are editing first.");return}
  $("sencall").disabled=true;
  for(const t of todo){say("Encrypting "+t.name+"…");if(!(await convertTab(t,true,say))){$("sencall").disabled=false;return}}
  const ids=new Set(todo.map(t=>t.id));
  const list=TABS.map((t,i)=>({id:t.id,name:t.name,color:tabColor(t,i),hc:t.hc,layout:t.layout,private:t.private||ids.has(t.id),enc:t.enc||ids.has(t.id)}));
  saveTabsList(list,say,async()=>{
    try{await api({action:"clear_versions"})}catch(err){}
    $("sencall").disabled=false;encRowUI();renderGates();
    say(todo.length===1?"1 tab encrypted. Earlier versions were deleted so no readable copy stays on the server.":todo.length+" tabs encrypted. Earlier versions were deleted so no readable copy stays on the server.");
  });
};

/* passphrase: unlock. The passphrase is set (and removed) in Settings › Security › Encryption; this page only opens the tabs with it. */
const uldlg=$("uldlg");let ulDone=null;
// Makes sure the key is available: unlocks it. Resolves true when ready.
function ensureKey(say){
  if(KEY)return Promise.resolve(true);
  if(!CAN_ENC){say("Encryption needs a secure (https) connection.");return Promise.resolve(false)}
  if(!PAGE.vault){say("Set an encryption passphrase first: Settings › Security › Encryption.");return Promise.resolve(false)}
  return openUnlock();
}
function openUnlock(){
  return new Promise(res=>{ulDone=res;$("ulin").value="";$("ulmsg").textContent="";
    const lg=VAULT_LOGIN();
    $("ullbl").textContent=lg?"Website Password":"Passphrase or Recovery Key";
    $("ulin").autocomplete=lg?"current-password":"off";
    $("ulintro").textContent=lg?"These tabs are still locked with your website password. Set an encryption passphrase in Settings › Security › Encryption to move them onto it."
      :"Enter your encryption passphrase.";
    $("ulkeep").checked=keepOn();
    uldlg.showModal();$("ulin").focus()});
}
$("ulcancel").onclick=()=>uldlg.close();
uldlg.addEventListener("close",()=>{if(ulDone){const f=ulDone;ulDone=null;f(!!KEY)}});
$("ulform").addEventListener("submit",async e=>{
  e.preventDefault();
  $("ulsave").disabled=true;$("ulmsg").textContent="Unlocking…";
  const raw=await unwrapKey(PAGE.vault,$("ulin").value);
  $("ulsave").disabled=false;
  if(!raw){$("ulmsg").textContent=VAULT_LOGIN()?"That password doesn't open them. If you changed your password while Info wasn't open, use the previous one, or set an encryption passphrase in Settings › Security › Encryption.":"That passphrase isn't right.";return}
  setKeep($("ulkeep").checked);
  if($("ulkeep").checked)await devSave(raw);else devClear();
  KEY=await useKey(raw);raw.fill(0);$("ulin").value="";
  await queueDecrypt();renderGates();if(HL)setHighlight(HL);
  status("Encrypted tabs unlocked.");uldlg.close();
});

/* editing mode: the Edit button logs in (or offers to create a password) and shows the editing bar */
function setEdit(on){
  EDIT=on;document.body.classList.toggle("editing",on);
  $("ebar").hidden=!on;$("editBtn").hidden=on;renderAuth();renderTabs();
}
function renderAuth(){$("eLogout").hidden=!(server&&locked&&authed)}
$("editBtn").onclick=()=>{
  if(!loaded){status("Still loading. Try again in a moment.");return}
  if(server&&!locked){HUB.login().then(()=>location.reload(),()=>{});return}   // a new site: the login box sets the password
  guard(()=>setEdit(true));
};
$("closedLogin").onclick=()=>guard(()=>{});
$("ebar").addEventListener("click",e=>{
  const b=e.target.closest("[data-e]");if(!b)return;const k=b.dataset.e;
  if(k==="colors")guard(openColors);
  else if(k==="settings")guard(openSettings);
  else if(k==="backup")guard(openBackup);
  else if(k==="logout")logout();
  else if(k==="done"){if(openEdits()){status("Save or cancel the box you're editing first.");return}setEdit(false)}
});
async function logout(){
  if(openEdits()){status("Save or cancel the box you're editing first.");return}
  // Private tabs, their unsaved drafts, search results and export leftovers leave this device.
  TABS.filter(t=>t.private||PAGE.private).forEach(t=>t.boxes.forEach(b=>dSet(b,null)));
  try{sessionStorage.clear()}catch(e){}
  q.value="";HL="";drawResults();sres.innerHTML="";$("printArea").innerHTML="";
  KEY=null;DEC.clear();devClear();dropAuth();setEdit(false);
  try{const j=await fetchData();applyData(j);PAGE.iconHash=(j.page&&j.page.iconHash)||"";authed=!!j.auth;keepLocal()}
  catch(e){applyData({tabs:plainTabs().filter(t=>!t.private),rev:REV,page:PAGE,timer:TIMER});keepLocal()}
  status("Logged out.");
}

/* dark / light mode, remembered in this browser */
const SUN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>';
const MOON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/></svg>';
function renderTheme(){
  const light=document.documentElement.dataset.theme==="light",b=$("themeBtn");
  b.innerHTML=light?MOON:SUN; // the icon shows the mode you'll switch to
  b.title=light?"Switch to Dark Mode":"Switch to Light Mode";b.setAttribute("aria-label",b.title);
}
$("themeBtn").onclick=()=>{
  const light=document.documentElement.dataset.theme!=="light";
  if(light)document.documentElement.dataset.theme="light";else delete document.documentElement.dataset.theme;
  lsSet("info3-theme",light?"light":"dark");renderTheme();
};
renderTheme();
document.addEventListener("hub:theme",renderTheme);

const nowS=()=>Math.floor(Date.now()/1000);

/* custom background colors (Main > Edit color) */
const CVAR={bg:"--bg",box:"--box",panel:"--panel"};
function applyColors(c){
  const block=(sel,x)=>{let r="";for(const k in CVAR)if(x&&okColor(x[k]))r+=CVAR[k]+":"+x[k]+";";return r?sel+"{"+r+"}":""};
  let el=$("userColors");if(!el){el=document.createElement("style");el.id="userColors";document.head.appendChild(el)}
  el.textContent=block(":root",c.dark)+block(':root[data-theme="light"]',c.light);
}
const kdlg=$("kdlg"),kInputs=()=>[...kdlg.querySelectorAll("input[type=color]")];
let KDRAFT=null,kSaved=false;
function openColors(){
  KDRAFT={};for(const m in DEF_COLORS){KDRAFT[m]={};for(const k in CVAR)KDRAFT[m][k]=PAGE.colors[m][k]||DEF_COLORS[m][k]}
  kInputs().forEach(x=>x.value=KDRAFT[x.dataset.m][x.dataset.k]);
  kSaved=false;$("kmsg").textContent="";kdlg.showModal();
}
// Only colors that differ from the defaults are stored; the rest stay automatic.
const kDiff=()=>{const o={};for(const m in KDRAFT){o[m]={};for(const k in CVAR)o[m][k]=KDRAFT[m][k]===DEF_COLORS[m][k]?"":KDRAFT[m][k]}return o};
kdlg.addEventListener("input",e=>{const x=e.target;if(x.type!=="color")return;KDRAFT[x.dataset.m][x.dataset.k]=x.value.toLowerCase();applyColors(KDRAFT)});
kdlg.addEventListener("close",()=>{if(!kSaved)applyColors(PAGE.colors)}); // Cancel or esc puts the page back
$("kcancel").onclick=()=>{applyColors(PAGE.colors);kdlg.close()};
$("kdef").onclick=()=>{KDRAFT=JSON.parse(JSON.stringify(DEF_COLORS));kInputs().forEach(x=>x.value=KDRAFT[x.dataset.m][x.dataset.k]);applyColors(KDRAFT);
  $("kmsg").textContent="Default colors restored. Click Save colors to keep them."};
async function saveColors(){
  const colors=kDiff();$("kmsg").textContent="";
  if(!server){PAGE.colors=normColors(colors);keepLocal();kSaved=true;kdlg.close();return}
  $("ksave").disabled=true;
  try{
    const r=await api({action:"save_colors",colors});
    if(r.status===403){dropAuth();status(savedMsg());guard(saveColors);return}
    if(r.status===429){$("kmsg").textContent="Too many wrong password tries. Wait a few minutes, then try again.";return}
    if(!r.ok)throw 0;
    const j=await r.json();PAGE.colors=normColors(j.page.colors);keepLocal();
    kSaved=true;applyColors(PAGE.colors);kdlg.close();status(savedMsg());
  }catch(e){$("kmsg").textContent="Couldn't reach the server, so the colors weren't saved."}
  finally{$("ksave").disabled=false}
}
$("kform").addEventListener("submit",e=>{e.preventDefault();saveColors()});

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
  return out.sort((a,b)=>(b.nameAt>=0)-(a.nameAt>=0)||a.ti-b.ti); // tabs whose name matches come first
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
    f.append(v.slice(i));node.replaceWith(f);
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
sres.addEventListener("click",e=>{const b=e.target.closest(".sr");if(b)pick(+b.dataset.i)});
$("qclear").onclick=()=>{q.value="";drawResults();setHighlight("");q.focus()};
document.addEventListener("click",e=>{if(!e.target.closest(".search")){sres.hidden=true;q.setAttribute("aria-expanded","false")}});
// "/" or Ctrl+K jumps to search, unless you're typing somewhere
document.addEventListener("keydown",e=>{
  const typing=/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)||document.querySelector("dialog[open]");
  if(!typing&&(e.key==="/"||((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"))){e.preventDefault();q.focus();q.select()}
});

/* page title and icon */
const DEFAULT_ICON=$("favIcon").getAttribute("href");
const pageName=()=>PAGE.title.trim()||"Information";
function renderPage(){
  document.querySelector(".search").hidden=CLOSED;
  $("ptitle").textContent=pageName();document.title=pageName();
  $("favIcon").href=DEFAULT_ICON;$("touchIcon").href=DEFAULT_ICON;   // the shell puts the site logo here when one is set
}

/* Settings: site title, icon, privacy and password */
const setdlg=$("setdlg");
function openSettings(){
  $("gin").value=PAGE.title;
  fillSettings();$("setmsg").textContent="";encRowUI();if(!setdlg.open)setdlg.showModal();
}
// The privacy and password parts, which change when a password is created or removed.
function fillSettings(){
  const noPw=!server||!locked;
  $("spriv").checked=PAGE.private;$("spriv").disabled=noPw;
  $("sprivnote").textContent=noPw?"Create a password first to make the page private."
    :"Visitors see only a login screen. To hide single tabs instead, use the pencil on a tab and choose Private tab.";
}
$("setcancel").onclick=()=>setdlg.close();
$("setsizes").onclick=()=>setdlg.close();   // the shell then opens Text Sizes (data-hub-action="sizes")
async function saveSettings(){
  const p={title:$("gin").value.trim().slice(0,60),icon:"",private:$("spriv").checked},m=$("setmsg");   // icon "": the page icon is gone, the site logo is used
  m.textContent="";
  if(!server){Object.assign(PAGE,p);keepLocal();renderPage();setdlg.close();return}
  $("setsave").disabled=true;
  try{
    const r=await api({action:"save_page",...p});
    if(r.status===403){dropAuth();status(savedMsg());guard(saveSettings);return}
    if(r.status===429){m.textContent="Too many wrong password tries. Wait a few minutes, then try again.";return}
    if(r.status===400){m.textContent="That icon couldn't be saved. Try a different image.";return}
    if(!r.ok)throw 0;
    const j=await r.json();PAGE=normPage(j.page);PAGE.iconHash="";keepLocal();renderPage();status(savedMsg());setdlg.close();
  }catch(e){m.textContent="Couldn't reach the server, so nothing was changed."}
  finally{$("setsave").disabled=false}
}
$("setform").addEventListener("submit",e=>{e.preventDefault();saveSettings()});

/* Export (the Export button): every tab or the current one, as plain text or a PDF. Boxes of an encrypted tab that is still
   locked are left out, with a note: unlock the tab first to include them. */
const exportTabs=all=>all?TABS:TABS.filter(t=>t.id===active);
const dayStamp=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
function exportName(all,ext){
  const t=TABS.find(x=>x.id===active),base=(all?(PAGE.title||"info"):(t?t.name:"tab")).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"info";
  return base+"-"+dayStamp()+"."+ext;
}
function saveFile(name,blob){
  const a=document.createElement("a"),u=URL.createObjectURL(blob);a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(u),4000);
}
function exportParts(all){   // [{tab, boxes:[{title, notes}]}], plus how many locked boxes were skipped
  let locked=0;const tabs=exportTabs(all).map(t=>({name:t.name,boxes:t.boxes.filter(b=>{if(b.sealed||b.bad){locked++;return false}return true}).map(b=>({title:b.title,notes:String(b.notes||"").replace(/\r/g,"").trim()}))}));
  return{tabs,locked};
}
const lockedNote=n=>n?n+(n===1?" locked box was":" locked boxes were")+" left out. Unlock the encrypted tab first to include "+(n===1?"it.":"them."):"";
function exportText(all){
  const {tabs,locked}=exportParts(all),out=[];
  if(!tabs.length){status("There is nothing to export.");return}
  for(const t of tabs){
    out.push(t.name,"=".repeat(Math.min(60,Math.max(3,t.name.length))),"");
    for(const b of t.boxes){out.push(b.title,"-".repeat(Math.min(60,Math.max(3,b.title.length))),b.notes||"(empty)","")}
  }
  if(locked)out.push("("+lockedNote(locked)+")");
  const name=exportName(all,"txt");saveFile(name,new Blob([out.join("\n")],{type:"text/plain;charset=utf-8"}));
  bkdlg.close();status("Saved "+name+". "+lockedNote(locked));
}
let pdfLoad=null;
function loadPdfLib(){
  return pdfLoad||(pdfLoad=new Promise((ok,no)=>{const sc=document.createElement("script");sc.src="../hub/core/assets/vendor/jspdf.umd.min.js?v=4.2.1";
    sc.onload=()=>window.jspdf&&window.jspdf.jsPDF?ok(window.jspdf.jsPDF):no(new Error("PDF library missing"));sc.onerror=()=>{pdfLoad=null;no(new Error("PDF library could not load"))};document.head.appendChild(sc)}));
}
// The PDF uses a built-in font that only knows Western European letters: common symbols are spelled out, the rest becomes "?".
const pdfSafe=s=>String(s).replace(/₹/g,"Rs ").replace(/[“”„]/g,'"').replace(/[‘’‚]/g,"'").replace(/[–—]/g,"-").replace(/…/g,"...").replace(/[•·▪●]/g,"-").replace(/→/g,"->").replace(/←/g,"<-").replace(/✓|✔/g,"v")
  .replace(/\*\*(.+?)\*\*/g,"$1").replace(/__(.+?)__/g,"$1").replace(/`([^`]+)`/g,"$1").replace(/~~(.+?)~~/g,"$1").replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,"$1 ($2)").replace(/[^\n\x20-\x7e\xa0-\xff]/g,"?");
async function exportPdf(all){
  const {tabs,locked}=exportParts(all);
  if(!tabs.length){status("There is nothing to export.");return}
  status("Making the PDF…");
  let jsPDF;try{jsPDF=await loadPdfLib()}catch(e){status("Couldn't load the PDF maker. Try Text instead.");return}
  const doc=new jsPDF({unit:"mm",format:"a4"}),W=210,M=16,maxY=281;let y=M;
  const room=h=>{if(y+h>maxY){doc.addPage();y=M}};
  const para=(txt,size,style,gap,color)=>{doc.setFont("helvetica",style);doc.setFontSize(size);doc.setTextColor(color||20);
    const lines=doc.splitTextToSize(pdfSafe(txt),W-2*M),lh=size*0.42;
    for(const ln of lines){room(lh);doc.text(ln,M,y+lh*0.8);y+=lh}y+=gap};
  para(PAGE.title||"Info",20,"bold",1);
  para((all?"All tabs":"One tab")+" · exported "+new Date().toLocaleString(),9,"normal",6,110);
  tabs.forEach((t,i)=>{
    if(i){room(16);doc.setDrawColor(200);doc.setLineWidth(0.3);doc.line(M,y,W-M,y);y+=6}
    para(t.name,16,"bold",3);
    for(const b of t.boxes){room(12);para(b.title,12,"bold",1.5);para(b.notes||"(empty)",10.5,"normal",5,40)}
  });
  if(locked)para("("+lockedNote(locked)+")",9,"italic",0,110);
  const name=exportName(all,"pdf");saveFile(name,doc.output("blob"));
  status("Saved "+name+". "+lockedNote(locked));
}

/* Backup panel: exports, full backup, reminder and earlier versions */
const bkdlg=$("bkdlg");
function openBackup(){bkdlg.showModal()}
bkdlg.addEventListener("click",e=>{
  const b=e.target.closest("[data-b]");if(!b)return;const k=b.dataset.b;
  if(k==="close")bkdlg.close();
  else if(k==="pdf-all"||k==="pdf-cur"){bkdlg.close();exportPdf(k==="pdf-all")}
  else if(k==="txt-all"||k==="txt-cur")exportText(k==="txt-all");
});
/* login: the site's one login box (same password and two-step code everywhere); the page then reloads */
function dropAuth(){authed=false;if(typeof renderAuth==="function")renderAuth()}
// Runs fn now if editing is allowed; otherwise asks to log in first, then runs it.
function guard(fn){
  if(!loaded){status("Still loading. Try again in a moment.");return}
  if(!server||!locked||authed){fn();return}
  // the site's one Welcome box logs in (same password and two-step code everywhere); the page then reloads with your private data
  HUB.login().then(pw=>unlockAfterLogin(pw)).then(()=>location.reload(),()=>{});
}

load();
