/* ---------- Boxes: add, resize, move and delete ---------- */
// Saves the box list of one tab: [{id or null for a new box, w, h}] in the order wanted. done(before) gets the ids that existed before.
async function saveBoxList(t,list,say,done){
  const before=new Set(t.boxes.map(b=>b.id));
  if(!server){
    const pt=plainTabs(),x=pt.find(y=>y.id===t.id);
    x.boxes=list.map(e=>{const o=x.boxes.find(b=>b.id===e.id);return o?{...o,w:e.w,h:e.h,hc:e.hc!=null?e.hc:o.hc}:{id:e.restore&&e.id?e.id:rid(),title:e.restore?e.restore.title:"",notes:e.restore?e.restore.notes:"",rev:0,saved:0,w:e.w,h:e.h,hc:e.hc||""}});
    mergeTabs({rev:REV+1,tabs:pt});if(done)done(before);return;
  }
  try{
    const r=await api({action:"save_boxes",tab:t.id,boxes:list,rev:REV});
    if(r.status===403){dropAuth();setStatus(savedMsg());renderTabs();guard(()=>saveBoxList(t,list,say,done));return}
    if(r.status===409){const j=await r.json();if(j.data)mergeTabs(j.data);say("This tab was changed on another device. The latest version is shown now, so please make your change again.");return}
    if(r.status===422){say("This box can't be put back here any more.");return}
    if(!r.ok)throw 0;
    const j=await r.json(),keep=new Set(j.data.tabs.flatMap(x=>x.boxes.map(b=>x.id+"-"+b.id)));
    t.boxes.forEach(b=>{if(!keep.has(b.key))dSet(b,null)});   // the text of a removed box is gone, so its unsaved draft goes too
    mergeTabs(j.data);setStatus(savedMsg());if(done)done(before);
  }catch(e){say("Couldn't reach the server, so nothing was changed.")}
}
function addBox(t){
  if(!t||t.boxes.length>=MAXBOX)return;
  guard(()=>{
    const list=t.boxes.map(b=>({id:b.id,w:b.w,h:b.h,hc:b.hc||""}));list.push({id:null,w:"",h:"",hc:""});
    saveBoxList(t,list,setStatus,before=>{
      const nb=t.boxes.find(b=>!before.has(b.id));if(!nb)return;
      const n=boxNode(nb);if(n)n.scrollIntoView({behavior:"smooth",block:"center"});
      if(!(t.enc&&!KEY))openEditor(nb);   // a new box opens ready to type in
    });
  });
}
const bxdlg=$("bxdlg");let BX=null;
function openBoxDlg(b){
  const t=TABS.find(x=>x.id===b.tabId);if(!t)return;
  if(b.editing){setStatus("Save or cancel this box first.");return}
  BX={t,b,w:b.w,h:b.h,hc:b.hc||"",pos:t.boxes.indexOf(b),armed:false};
  $("bxname").textContent=b.sealed?"Locked box":b.title;
  $("bxmsg").textContent="";$("bxdel").textContent="Delete Box";$("bxdel").hidden=t.boxes.length<2;bxUI();bxdlg.showModal();
}
function bxUI(){
  for(const [id,key] of [["bxw","w"],["bxh","h"]])document.querySelectorAll("#"+id+" .opt").forEach((/** @type {HTMLElement} */ x)=>{const on=x.dataset.v===BX[key];x.classList.toggle("on",on);x.setAttribute("aria-checked",String(on))});
  const n=BX.t.boxes.length;$("bxpos").textContent="Position "+(BX.pos+1)+" of "+n;$("bxleft").disabled=BX.pos<1;$("bxright").disabled=BX.pos>=n-1;
  $("bxhc").value=BX.hc||"#ffffff";$("bxhcdef").disabled=!BX.hc;
  document.querySelectorAll("#bxsw .swc").forEach((/** @type {HTMLElement} */ x)=>x.setAttribute("aria-pressed",String(!!BX.hc&&x.dataset.c===BX.hc)));
  $("bxwhint").textContent=BX.w?"":"Auto means "+(BX.t.layout==="doc"?"the full width of the page.":"half the width.");
}
$("bxw").addEventListener("click",e=>{const x=/** @type {any} */ (e.target).closest(".opt");if(x){BX.w=okW(x.dataset.v);bxUI()}});
$("bxh").addEventListener("click",e=>{const x=/** @type {any} */ (e.target).closest(".opt");if(x){BX.h=okH(x.dataset.v);bxUI()}});
// (1.79.3) The headline color of this box: a few usual colors, any color, or the normal text color
$("bxsw").innerHTML=["#e5484d","#f5a524","#d4a72c","#3ecf8e","#2dd4bf","#3b82f6","#8b5cf6","#ec4899"].map(c=>'<button type="button" class="swc" data-c="'+c+'" style="background:'+c+'" aria-label="'+c+'" aria-pressed="false"></button>').join("");
$("bxsw").addEventListener("click",e=>{const x=/** @type {any} */ (e.target).closest(".swc");if(x){BX.hc=x.dataset.c;bxUI()}});
$("bxhc").addEventListener("input",()=>{BX.hc=okColor($("bxhc").value);bxUI()});
$("bxhcdef").onclick=()=>{BX.hc="";bxUI()};
$("bxleft").onclick=()=>{BX.pos=Math.max(0,BX.pos-1);bxUI()};
$("bxright").onclick=()=>{BX.pos=Math.min(BX.t.boxes.length-1,BX.pos+1);bxUI()};
$("bxcancel").onclick=()=>bxdlg.close();
function bxList(remove){
  const list=BX.t.boxes.filter(x=>x!==BX.b).map(x=>({id:x.id,w:x.w,h:x.h,hc:x.hc||""}));
  if(!remove)list.splice(BX.pos,0,{id:BX.b.id,w:BX.w,h:BX.h,hc:BX.hc});
  return list;
}
$("bxdel").onclick=()=>{
  const t=BX.t,gone=rawBox(BX.b,t.enc),at=t.boxes.indexOf(BX.b),what=t.enc?"":": "+(BX.b.title||"Box");
  saveBoxList(t,bxList(true),x=>$("bxmsg").textContent=x,()=>{bxdlg.close();if(window.HUB&&HUB.undo)HUB.undo("Box deleted"+what+" (in "+(t.name||"Tab")+").",()=>undoBox(t.id,gone,at))});
};
// (1.62.0) Undo after a delete: what the server sent is kept for 7 seconds (a locked tab's text stays locked) and sent back as "restore"
const rawBox=(b,enc)=>({id:b.id,w:b.w,h:b.h,hc:b.hc||"",title:enc?b.ct:b.title,notes:enc?b.cn:b.notes});
function undoBox(tabId,gone,at){
  const t=TABS.find(x=>x.id===tabId);
  if(!t){setStatus("That tab is gone, so the box can't come back.");return}
  if(t.boxes.length>=MAXBOX){setStatus("This tab is full, so the box can't come back.");return}
  const list=t.boxes.map(b=>({id:b.id,w:b.w,h:b.h,hc:b.hc||""}));
  list.splice(Math.min(at,list.length),0,{id:gone.id,w:gone.w,h:gone.h,hc:gone.hc||"",restore:{title:gone.title,notes:gone.notes,hc:gone.hc||""}});
  guard(()=>saveBoxList(t,list,setStatus,()=>setStatus("Box is back.")));
}
$("bxform").addEventListener("submit",e=>{e.preventDefault();saveBoxList(BX.t,bxList(false),x=>$("bxmsg").textContent=x,()=>bxdlg.close())});

