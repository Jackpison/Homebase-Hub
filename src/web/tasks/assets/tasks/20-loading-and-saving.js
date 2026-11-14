/* ---------- loading and saving ---------- */
function privateScreen(){
  document.body.innerHTML='<div id="ix-private"><div class="ix-ico"><svg viewBox="0 0 24 24"><path d="M5 11h14v10H5zM8 11V8a4 4 0 0 1 8 0v3"/></svg></div>'+
    '<h1>Tasks</h1><p>This page is private. Log in to see your tasks.</p><button type="button">Log In</button></div>';
  /** @type {HTMLElement} */ (document.querySelector("#ix-private button")).onclick=()=>window.HUB?HUB.login("Log in to see your tasks.").then(()=>location.reload(),()=>{}):location.reload();
  if(window.HUB&&HUB.ready)HUB.ready();
}
function take(j){T=Array.isArray(j.tasks)?j.tasks:[];LOG=Array.isArray(j.log)?j.log:[];SET={...SET_DEF,...(j.settings||{})};REV=j.rev|0;for(const k in NF)delete NF[k];loaded=true}
// Tasks Settings > When the Page Opens: applied once per page load, on top of what this browser remembers
function openWith(){
  if(SET.start)V.view=SET.start;
  if(SET.range){V.range=SET.range;V.st="";V.day=""}
  if(SET.sort)V.sort=SET.sort;
  if(SET.cal)V.cal=SET.cal==="on";
  applyLook();
}
function applyLook(){$("app").classList.toggle("nostats",SET.stats===false)}
async function load(){
  // (1.72.0) instant: this tab's last copy shows at once while the fresh list loads
  const HB=window.HUB,sn=HB&&HB.snap?HB.snap.get("tasks"):null;
  if(sn&&Array.isArray(sn.tasks)){take(sn);HB.snap.stale(true);drawFilters();render()}
  try{
    const r=await HF("api.php",{cache:"no-store"});
    const j=await r.json();
    if(HB&&HB.snap){HB.snap.put("tasks",j.auth?j:null);HB.snap.stale(false)}
    if(j.private&&!j.auth){privateScreen();return}
    take(j);openWith();setStatus("Saved on the server.");
  }catch(e){if(HB&&HB.snap)HB.snap.stale(false);$("list").innerHTML='<div class="empty"><h2>Tasks Couldn\'t Load</h2><p>The server didn\'t answer. Check your connection, then reload the page.</p><button type="button" class="btn">Reload</button></div>';$("list").querySelector("button").onclick=()=>location.reload();return}
  drawFilters();render();fromHash();takeImport();
}
/* (1.72.0) the Import Center (Settings > Backup & Restore > Import) hands over tasks from a calendar or Todoist: added unless the same
   name is already due that day, saved as usual, with Undo */
function takeImport(){
  const p=window.HUB&&HUB.importTake?HUB.importTake("tasks"):null;if(!p||!Array.isArray(p.items))return;
  const have=new Set(T.map(t=>t.name.toLowerCase()+"|"+t.due)),n=now(),ids=new Set();let dup=0;
  for(const x of p.items){
    const name=String(x&&x.name||"").trim().slice(0,120),due=/^\d{4}-\d{2}-\d{2}$/.test(x&&x.due)?x.due:todayS();if(!name)continue;
    const key=name.toLowerCase()+"|"+due;if(have.has(key)){dup++;continue}have.add(key);
    const rep=x.repeat&&["day","week","month","year"].includes(x.repeat.unit)?x.repeat:{n:1,unit:"none"};
    const t={id:uid(),name,due,time:/^\d{2}:\d{2}$/.test(x.time||"")?x.time:"",repeat:rep,price:null,cur:"",mode:"",cat:String(x.cat||"").slice(0,40),remind:-1,url:"",notes:String(x.notes||"").slice(0,4000),
      updated:n,day:+due.slice(8,10),pay:"",auto:false,status:"active",created:n,doneAt:0,history:[]};
    T.push(t);ids.add(t.id);
  }
  if(ids.size){save();drawFilters();render()}
  const msg=(ids.size?"Added "+ids.size+(ids.size===1?" task":" tasks")+" from "+(p.src||"the import")+".":"Nothing new to add.")+(dup?" "+dup+(dup===1?" was":" were")+" already here.":"");
  snack(msg,ids.size?()=>{T=T.filter(t=>!ids.has(t.id));save();drawFilters();render()}:undefined);
}
/* Saving: the whole list goes to the server. `ver` counts changes made here, so an answer for an older list never
   replaces changes made while it was on its way. */
let saveT=null,saving=false,again=false,ver=0;
function setStatus(m){$("status").textContent=m}
function save(){ver++;clearTimeout(saveT);setStatus("Saving…");saveT=setTimeout(push,350)}
async function push(){
  if(saving){again=true;return}
  saving=true;
  const sent=ver;
  try{
    const r=await HF("api.php",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save",rev:REV,tasks:T,log:LOG,settings:SET})});
    const j=await r.json().catch(()=>({}));
    if(r.status===401){setStatus("You were logged out. Your change is not saved yet.");if(window.HUB)HUB.login("Log in to save your change.").then(()=>push(),()=>{});return}
    if(r.status===409&&j.data){take(j.data);render();toast("Tasks were changed in another window. Showing the latest version; make your change again.");setStatus("Saved on the server.");return}
    if(!r.ok||!j.ok)throw new Error(j.error||"Save failed.");
    REV=j.rev;
    if(ver!==sent){again=true;return}   // changed meanwhile: send the newer list (finally below)
    if(Array.isArray(j.tasks)){T=j.tasks;if(Array.isArray(j.log))LOG=j.log;render()}
    setStatus("Saved on the server.");
  }catch(e){setStatus((e&&e.message)||"Save failed. Your change is kept on this page and will be saved with the next change.")}
  finally{saving=false;if(again){again=false;push()}}
}

