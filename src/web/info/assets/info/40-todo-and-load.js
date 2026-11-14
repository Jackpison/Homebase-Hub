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
    if(r.status===409){const j=await r.json();intake(b,j.box,enc);setStatus("This box was changed elsewhere, so the newer version is shown. Check the item off again if needed.")}
    else if(r.status===403){b.notes=prev;dropAuth();setStatus("Log in to check off items.")}
    else if(!r.ok)throw 0;
    else{const j=await r.json();intake(b,j.box,enc);setStatus(savedMsg())}
  }catch(e){b.notes=prev;setStatus("Couldn't reach the server, so the change wasn't saved.")}
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
  if(Date.now()-lastFetch<60000||openEdits()||document.querySelector("dialog[open]")||document.body.classList.contains("dragtabs"))return;
  lastFetch=Date.now();
  try{const had=authed;takeData(await fetchData());if(had&&!authed){setEdit(false);setStatus("You were logged out on this device.")}}catch(e){}
}); // true once the server has answered (or is known to be unreachable)
const sig=d=>JSON.stringify([d.rev|0,!!d.closed,d.tabs.map(t=>[t.id,t.name,t.color||"",t.hc||"",t.layout||"",!!t.private,t.boxes.map(b=>[b.id||"",b.w||"",b.h||"",b.hc||"",b.title,b.notes,b.rev|0,b.saved|0])]),
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
// (1.72.0) the site search finds boxes in locked tabs too, while they are unlocked on this page (read from memory, never stored)
if(window.HUB&&HUB.findHook)HUB.findHook(()=>{const out=[];if(!KEY)return out;
  for(const t of TABS)if(t.enc)for(const b of t.boxes)if(!b.sealed)out.push({title:String(b.title||t.name||"Box"),text:String(b.notes||"").replace(/\s+/g," "),where:t.name||"Tab",href:"#hub-info="+encodeURIComponent(t.id)});
  return out});
async function load(){
  renderPage(); // default title and icon right away, even on a first visit
  lsSet("info3-tok",null);   // an old per-page login token (before the one site login): no longer used (1.59)
  let local=null;
  try{
    const l=JSON.parse(lsGet(LS)||"null");
    if(l&&Array.isArray(l.tabs)){local=l;if(local.page&&!local.page.icon)local.page.icon=savedIcon=lsGet(ICONK)||""}
  }catch(e){}
  // 1. Show the copy saved in this browser straight away, so the page appears instantly. (1.72.0) Logged in, this tab's own last copy
  //    comes first: it also has your private tabs (locked ones stay locked in it).
  const HB=window.HUB,sn=HB&&HB.snap?HB.snap.get("info"):null;
  if(sn&&Array.isArray(sn.tabs)){applyData(sn);HB.snap.stale(true);setStatus("Checking for updates…")}
  else if(local&&(local.tabs.length||local.closed)){applyData(local);setStatus("Checking for updates…")}
  else if(local&&local.page){PAGE=normPage(local.page);renderPage();applyColors(PAGE.colors);setStatus("Loading…")}
  // 2. Ask the server for the latest version.
  try{
    const j=await fetchData();
    if(HB&&HB.snap){HB.snap.put("info",j.auth?j:null);HB.snap.stale(false)}
    WAIT=false;takeData(j);renderTabs();lastFetch=Date.now();
    setStatus(savedMsg());
  }catch(e){
    server=false;WAIT=false;if(HB&&HB.snap)HB.snap.stale(false);
    if(!local||!local.tabs.length)applyData({tabs:[{name:"Information & Notes",boxes:[{title:"Information"},{title:"Notes"}]}],rev:0});
    keepLocal();setStatus("Saved in this browser only.");
  }
  loaded=true;takeImport();
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

