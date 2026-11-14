/* tabs */
const PEN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>';
/* Tab marks (1.79.3): a blue shield with a check marks a private tab, the same shield in green marks an encrypted one. */
const IMG_LOCK='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M12 2.4c2.3 2 5 3 8.1 3v6.2c0 4.8-3.2 8.5-8.1 10.4-4.9-1.9-8.1-5.6-8.1-10.4V5.4c3.1 0 5.8-1 8.1-3z" fill="#4a9bff"/><path d="M12 2.4c2.3 2 5 3 8.1 3v6.2c0 4.8-3.2 8.5-8.1 10.4z" fill="#1c6fe8" opacity=".35"/><path d="M8.3 12.2l2.6 2.7 4.9-5.4" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',IMG_SAFE='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M12 2.4c2.3 2 5 3 8.1 3v6.2c0 4.8-3.2 8.5-8.1 10.4-4.9-1.9-8.1-5.6-8.1-10.4V5.4c3.1 0 5.8-1 8.1-3z" fill="#2fc983"/><path d="M12 2.4c2.3 2 5 3 8.1 3v6.2c0 4.8-3.2 8.5-8.1 10.4z" fill="#13935a" opacity=".35"/><path d="M8.3 12.2l2.6 2.7 4.9-5.4" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
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
      `<button class="tab" role="tab" data-t="${id}" aria-selected="${on}">${HubTabs.iconSvg(t.icon||"doc","ti")}${nm}`+
      (t.enc?`<span class="lk enc" title="Encrypted: locked with your passphrase">${IMG_SAFE}</span>`
       :t.private?`<span class="lk" title="Private: visible only when logged in">${IMG_LOCK}</span>`:"")+`</button>`+
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
// Drag a tab to move it (tabs.js, shared with Links); Alt + Left/Right does the same from the keyboard. Colors that come from a tab's position are fixed first, so tabs keep their colors when they move.
const tabDrag=HubTabs.drag($("tabs"),{enabled:()=>EDIT,onDrop(order,focusId){
  const list=order.map(id=>{const i=TABS.findIndex(t=>t.id===id);return tabItem(TABS[i],i)});
  saveTabsList(list,setStatus,()=>{setStatus("Tab order saved.");if(focusId){const b=/** @type {HTMLElement|null} */ (document.querySelector(`#tabs .tab[data-t="${CSS.escape(focusId)}"]`));if(b)b.focus()}});
}});
$("tabs").onclick=e=>{
  if(tabDrag.justDragged())return;
  const pen=/** @type {any} */ (e.target).closest(".pen");if(pen){guard(()=>openTabEditor(pen.parentElement.dataset.t));return}
  const b=/** @type {any} */ (e.target).closest(".tab");if(!b)return;
  if(b.dataset.add)guard(()=>openTabEditor(null));else if(EDIT&&b.dataset.t===active)guard(()=>openTabEditor(b.dataset.t));else showTab(b.dataset.t);
};
$("tabs").addEventListener("contextmenu",e=>{if(EDIT&&/** @type {any} */ (e.target).closest(".tabi"))e.preventDefault()}); // no long-press menu while editing
const openEdits=()=>TABS.some(t=>t.boxes.some(b=>b.editing||busy.has(b.key)));

// Keeps the boxes of tabs that still exist (and any open editors), adds new tabs, drops removed ones.
function mergeTabs(d){
  const old=new Map(TABS.map(t=>[t.id,t]));
  TABS=d.tabs.map(src=>{
    const t=old.get(src.id);if(!t)return mkTab(src);
    t.name=src.name;t.color=okColor(src.color);t.hc=okColor(src.hc);t.layout=okLay(src.layout);t.icon=okIcon(src.icon);setHead(t);
    t.enc=!!src.enc||(src.boxes||[]).some(b=>b&&(isEnc(b.title)||isEnc(b.notes)));t.private=!!src.private||t.enc;
    // boxes are matched by id, so adding, removing and reordering on another device lands on the right box
    const had=new Map(t.boxes.map(b=>[b.id,b]));
    t.boxes=(Array.isArray(src.boxes)?src.boxes:[]).map((x,k)=>{
      const b=had.get(String(x&&x.id!=null?x.id:(k<2?k:"")));
      if(!b)return mkBox(t.id,k,x,t.enc);
      b.k=k;b.w=okW(x.w);b.h=okH(x.h);b.hc=okColor(x.hc);if(!b.editing&&!busy.has(b.key))intake(b,x,t.enc);return b;
    });
    return t;
  });
  REV=d.rev|0;keepLocal();syncDom();renderGates();
}
// Saves the whole tab list: [{id or null for new, name, color, private}]. Calls done() once saved.
/* (1.72.0) the Import Center hands over notes (Google Keep, Notion, text files): one new private tab, its boxes already filled; a box that is
   already in Info (same title and text) is left out. Saved like a new tab, with Undo. */
function takeImport(){
  const p=window.HUB&&HUB.importTake?HUB.importTake("info"):null;if(!p||!Array.isArray(p.boxes)||!p.boxes.length)return;
  if(!authed||!server){HUB.toast("Log in (and be online) to add what you imported.",true);return}
  if(TABS.length>=20){HUB.toast("Info has 20 tabs already. Remove one, then import again.",true);return}
  const have=new Set(TABS.flatMap(t=>t.boxes.map(b=>(b.title+"|"+b.notes).toLowerCase())));
  const boxes=p.boxes.map(b=>({title:String(b.title||"").slice(0,80),notes:String(b.notes||"")})).filter(b=>!have.has((b.title+"|"+b.notes).toLowerCase())).slice(0,12);
  if(!boxes.length){HUB.toast("Everything in it is already in Info.");return}
  /** @type {any[]} */
  const now=TABS.map(t=>({id:t.id,name:t.name,color:t.color,hc:t.hc,layout:t.layout,icon:t.icon,private:t.private}));
  saveTabsList(now.concat([{name:String(p.tab||"Imported").slice(0,40),color:freeColor(TABS.map(t=>t.color)),private:true,restore:{boxes}}]),m=>HUB.toast(m,true),()=>{
    const nt=TABS[TABS.length-1],msg="Added a tab with "+boxes.length+(boxes.length===1?" box":" boxes")+" from "+(p.src||"the import")+".";
    if(nt&&HUB.undo)HUB.undo(msg,()=>saveTabsList(TABS.filter(t=>t.id!==nt.id).map(t=>({id:t.id,name:t.name,color:t.color,hc:t.hc,layout:t.layout,icon:t.icon,private:t.private})),m=>HUB.toast(m,true)));else HUB.toast(msg);
  });
}
async function saveTabsList(list,say,done){
  const before=new Set(TABS.map(t=>t.id));
  const showNew=()=>{const t=TABS.find(x=>!before.has(x.id));if(t)showTab(t.id)};
  if(!server){
    mergeTabs({rev:REV+1,tabs:list.map(x=>{const t=plainTabs().find(y=>y.id===x.id);return t?{...t,name:x.name,color:x.color,hc:x.hc,layout:x.layout||t.layout,icon:x.icon!=null?x.icon:t.icon,private:x.private}:{id:rid(),name:x.name,color:x.color,hc:x.hc,layout:x.layout,icon:x.icon,private:x.private,boxes:x.restore?x.restore.boxes:undefined}})});
    showNew();if(done)done();return;
  }
  try{
    const r=await api({action:"save_tabs",tabs:list,rev:REV});
    if(r.status===403){dropAuth();setStatus(savedMsg());renderTabs();guard(()=>saveTabsList(list,say,done));return}
    if(r.status===429){say("Too many wrong password tries. Wait a few minutes, then try again.");return}
    if(r.status===409){const j=await r.json();mergeTabs(j.data);say("The tabs were changed on another device. The latest tabs are shown now, so please make your change again.");return}
    if(r.status===422){say("This tab can't be put back any more.");return}
    if(!r.ok)throw 0;
    const j=await r.json();
    // Text of removed tabs is gone, so their unsaved drafts go too.
    const keep=new Set(j.data.tabs.map(t=>t.id));
    TABS.filter(t=>!keep.has(t.id)).forEach(t=>t.boxes.forEach(b=>dSet(b,null)));
    mergeTabs(j.data);showNew();setStatus(savedMsg());if(done)done();
  }catch(e){say("Couldn't reach the server, so the tabs weren't changed.");renderTabs()}
}

