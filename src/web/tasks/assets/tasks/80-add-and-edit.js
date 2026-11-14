/* ---------- add and edit ---------- */
let editing=null,eMode="";
const REP_PRESETS=[.../** @type {NodeListOf<HTMLOptionElement>} */ (document.querySelectorAll("#e-rep option"))].map(o=>o.value);
function nthOf(due){const d=+due.slice(8,10),y=+due.slice(0,4),m=+due.slice(5,7)-1;return{nth:Math.min(4,Math.ceil(d/7)),last:d+7>dim(y,m),dow:parse(due).getDay()}}
function repFromForm(){
  const v=$("e-rep").value,due=$("e-due").value;
  if(v==="none")return{n:1,unit:"none"};
  if(v==="wkday")return{n:1,unit:"week",wd:[1,2,3,4,5]};
  if(v==="mlast")return{n:1,unit:"month",on:"last"};
  if(v==="custom"){
    /** @type {any} */
    const r={n:Math.max(1,Math.min(99,parseInt($("e-n").value,10)||1)),unit:$("e-unit").value};
    if(r.unit==="week"){const wd=[...document.querySelectorAll("#e-wd input:checked")].map(x=>+(/** @type {HTMLInputElement} */ (x)).value).sort((a,b)=>a-b);if(wd.length)r.wd=wd}
    if(r.unit==="month"){const on=$("e-on").value;if(on==="last")r.on="last";else if((on==="nth"||on==="nthl")&&due){const x=nthOf(due);r.on="nth";r.nth=on==="nthl"?-1:x.nth;r.dow=x.dow}}
    return r;
  }
  const[u,n]=v.split(":");return{n:+n,unit:u};
}
function previewNext(){
  const due=$("e-due").value,rep=repFromForm(),cu=$("e-rep").value==="custom",un=$("e-unit").value;
  $("e-custom").hidden=!cu;$("e-wdrow").hidden=!(cu&&un==="week");$("e-onrow").hidden=!(cu&&un==="month");
  if(due){const x=nthOf(due),o=/** @type {HTMLSelectElement} */ ($("e-on"));o.options[2].textContent="The "+ORD[x.nth]+" "+DOW[x.dow];o.options[3].textContent="The Last "+DOW[x.dow];o.options[3].hidden=!x.last;if(!x.last&&o.value==="nthl")o.value="nth"}
  if(!due||rep.unit==="none"){$("e-next").textContent="";return}
  const day=+due.slice(8,10),out=[];let s=due;
  for(let i=0;i<4;i++){out.push(fmtD(s));s=nextDate(s,rep,day)}
  $("e-next").textContent="Dates: "+out.join(", ")+"…";
}
["e-due","e-rep","e-n","e-unit","e-on"].forEach(id=>$(id).addEventListener("input",previewNext));$("e-wd").addEventListener("change",previewNext);
$("e-mode").onclick=e=>{const b=/** @type {any} */ (e.target).closest("[data-m]");if(!b)return;eMode=b.dataset.m;document.querySelectorAll("#e-mode button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)))};
function openEditor(t,copy,day){
  editing=t&&!copy?t:null;
  const x=t||{name:"",due:day||(V.view==="cal"&&V.calSel)||V.day||todayS(),time:"",repeat:{n:1,unit:"none"},price:null,cur:"",mode:"",cat:"",remind:-1,url:"",notes:""};
  $("dlgt").textContent=editing?"Edit Task":copy?"Copy of Task":"Add Task";
  $("e-name").value=x.name;$("e-due").value=x.due;$("e-time").value=x.time||"";
  const xr=/** @type {any} */ (x.repeat),plain=!xr.wd&&!xr.on;
  const key=xr.unit==="none"?"none":xr.unit==="week"&&xr.n===1&&(xr.wd||[]).join()==="1,2,3,4,5"&&!xr.on?"wkday":xr.unit==="month"&&xr.n===1&&xr.on==="last"?"mlast":plain?xr.unit+":"+xr.n:"custom";
  $("e-rep").value=REP_PRESETS.includes(key)?key:"custom";$("e-n").value=xr.n||1;$("e-unit").value=xr.unit==="none"?"month":xr.unit;
  document.querySelectorAll("#e-wd input").forEach(i=>{/** @type {HTMLInputElement} */ (i).checked=Array.isArray(xr.wd)&&xr.wd.includes(+(/** @type {HTMLInputElement} */ (i)).value)});
  $("e-on").value=xr.on==="last"?"last":xr.on==="nth"?(xr.nth===-1?"nthl":"nth"):"day";
  $("e-price").value=x.price??"";
  $("e-cur").innerHTML='<option value="">Default ('+esc(SET.currency||"None")+')</option>'+CURS.map(c=>'<option value="'+c[0]+'">'+c[0]+'</option>').join("");
  $("e-cur").value=x.cur&&CURS.some(c=>c[0]===x.cur)?x.cur:"";
  eMode=x.mode||"";document.querySelectorAll("#e-mode button").forEach((/** @type {HTMLElement} */ b)=>b.setAttribute("aria-pressed",String(b.dataset.m===eMode)));
  $("e-cat").value=x.cat;
  $("e-remind").value=String([-1,0,1,3,7,14,30,60].includes(x.remind)?x.remind:-1);
  $("e-url").value=x.url;$("e-notes").value=x.notes;$("e-err").textContent="";
  $("e-del").hidden=!editing;
  previewNext();$("dlg").showModal();$("e-name").focus();
}
$("form").onsubmit=e=>{
  e.preventDefault();
  const name=$("e-name").value.trim(),due=$("e-due").value,url=$("e-url").value.trim();
  if(!name){$("e-err").textContent="Give the task a name.";$("e-name").focus();return}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(due)){$("e-err").textContent="Pick a due date.";$("e-due").focus();return}
  if(url&&!/^https?:\/\/\S+$/i.test(url)){$("e-err").textContent="The website must start with https:// or http://";$("e-url").focus();return}
  const pr=$("e-price").value.trim();
  if(pr!==""&&!(+pr>=0)){$("e-err").textContent="The price must be a number, 0 or more.";$("e-price").focus();return}
  const data={name,due,time:$("e-time").value,repeat:repFromForm(),price:pr===""?null:Math.round(+pr*100)/100,cur:$("e-cur").value,mode:eMode,cat:$("e-cat").value.trim(),
    remind:+$("e-remind").value,url,notes:$("e-notes").value.trim(),updated:now()};
  if(editing){
    if(data.due!==editing.due)data.day=+due.slice(8,10);
    Object.assign(editing,data);$("dlg").close();snack('"'+name+'" Saved.');
  }else{
    const t={id:uid(),...data,day:+due.slice(8,10),pay:"",auto:false,status:"active",created:now(),doneAt:0,history:[]};
    T.push(t);$("dlg").close();
    snack('"'+name+'" Added'+(rowsNow().some(r=>r.t===t)?".":", but Hidden by Your Filters."));
  }
  touch();
};
$("e-del").onclick=()=>{
  const t=editing;$("dlg").close();act.del(t);
};
document.querySelectorAll("#dlg,#sdlg,#ydlg").forEach((/** @type {HTMLDialogElement} */ d)=>d.addEventListener("click",e=>{if(/** @type {any} */ (e.target).closest("[data-close]")||e.target===d)d.close()}));

/* a link from the site search or Telegram: #task=<id> opens that task */
function fromHash(){
  const m=/#task=([a-z0-9]+)/.exec(location.hash);if(!m||!loaded)return;
  const t=find(m[1]);history.replaceState(null,"",location.pathname+location.search);
  if(!t){snack("That task no longer exists.");return}
  clearFilters();V.view="list";drawFilters();render();
  const row=document.querySelector('.row[data-id="'+t.id+'"]');
  if(row){row.scrollIntoView({block:"center",behavior:"smooth"});row.classList.add("flash");setTimeout(()=>row.classList.remove("flash"),3400)}
  openCard(t);
}
window.addEventListener("hashchange",fromHash);
if(location.hash==="#new")setTimeout(()=>loaded&&openEditor(),400);

