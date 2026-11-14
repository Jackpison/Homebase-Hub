/* ---------- actions on a task ---------- */
const find=id=>T.find(t=>t.id===id);
let snackT=null;
function snack(msg,undo){
  document.querySelector(".snack")?.remove();clearTimeout(snackT);
  const s=document.createElement("div");s.className="snack";s.setAttribute("role","status");
  s.innerHTML='<span></span>'+(undo?'<button type="button">Undo</button>':"");s.firstChild.textContent=msg;
  if(undo)s.querySelector("button").onclick=()=>{undo();s.remove()};
  document.body.appendChild(s);snackT=setTimeout(()=>s.remove(),7000);
}
function withUndo(msg,fn){const before=JSON.stringify([T,LOG]);fn();touch();snack(msg,()=>{[T,LOG]=JSON.parse(before);touch();snack("Undone.")})}
function touch(){drawFilters();render();save()}
const now=()=>Math.floor(Date.now()/1000);
function logIt(t,kind){
  LOG.push({id:uid(),task:t.id,name:t.name,d:t.due,p:kind==="skip"?null:t.price,cur:t.cur||"",cat:t.cat,mode:t.mode||"",k:kind,t:now()});
  if(LOG.length>LOG_MAX)LOG=LOG.slice(-LOG_MAX);
  t.history=[...(t.history||[]),{d:t.due,p:kind==="skip"?null:t.price,k:kind,t:now()}].slice(-60);
}
function done(t,kind){
  if(t.repeat.unit==="none"){withUndo('"'+t.name+'" Is Done.',()=>{logIt(t,"paid");t.status="done";t.doneAt=now();t.updated=now()});return}
  const next=nextDate(t.due,t.repeat,t.day);
  withUndo((kind==="skip"?"Skipped. ":"Done. ")+"Next Date: "+fmtD(next)+".",()=>{logIt(t,kind);t.due=next;t.updated=now()});
}
const act={
  done:t=>done(t,"paid"),skip:t=>done(t,"skip"),edit:t=>openEditor(t),
  dup:t=>openEditor({...JSON.parse(JSON.stringify(t)),id:"",name:t.name+" (Copy)",history:[],status:"active"},true),
  pause:t=>withUndo('"'+t.name+'" Is Paused.',()=>{t.status="paused";t.updated=now()}),
  resume:t=>withUndo('"'+t.name+'" Is Active Again.',()=>{t.status="active";t.updated=now()}),
  reopen:t=>withUndo('"'+t.name+'" Is Back on the List.',()=>{t.status="active";t.doneAt=0;t.updated=now()}),
  open:t=>window.open(t.url,"_blank","noopener"),
  del:t=>withUndo('"'+t.name+'" Deleted.',()=>{T=T.filter(x=>x!==t)})
};
/* (1.65.0) On a touch screen a task can be swiped: to the left for Done, to the right for Skip (a repeating task; a one-off task only goes
   left). Past about a third of the row it happens, with the usual Undo; less, the row springs back. Up and down still scrolls the page
   (rows let the browser pan vertically), and a swipe never opens the task. */
let swipe=null,swiped=0;
$("list").addEventListener("pointerdown",e=>{
  if(e.pointerType!=="touch")return;
  const row=/** @type {any} */ (e.target).closest('.row[data-id]');if(!row||row.classList.contains("s-done"))return;
  const t=T.find(x=>x.id===row.dataset.id);if(!t||t.status!=="active")return;
  swipe={row,t,x:e.clientX,y:e.clientY,dx:0,on:false,id:e.pointerId,bg:null};
},{passive:true});
$("list").addEventListener("pointermove",e=>{
  const w=swipe;if(!w||e.pointerId!==w.id)return;
  const dx=e.clientX-w.x,dy=e.clientY-w.y;
  if(!w.on){
    if(Math.abs(dx)<10&&Math.abs(dy)<10)return;
    if(Math.abs(dy)>=Math.abs(dx)){swipe=null;return}   // a scroll, not a swipe
    w.on=true;const list=$("list"),r=w.row.getBoundingClientRect(),lr=list.getBoundingClientRect();
    if(getComputedStyle(list).position==="static")list.style.position="relative";
    w.bg=document.createElement("div");w.bg.className="swbg";w.bg.setAttribute("aria-hidden","true");
    w.bg.style.cssText="top:"+(r.top-lr.top+list.scrollTop)+"px;left:"+(r.left-lr.left)+"px;width:"+r.width+"px;height:"+r.height+"px";
    w.bg.innerHTML='<span class="d">'+SVG(IC.check,"")+'Done</span><span class="s">'+SVG(IC.skip,"")+'Skip</span>';
    list.appendChild(w.bg);w.row.classList.add("swiping");
  }
  let d=dx;if(d>0&&w.t.repeat.unit==="none")d=Math.min(d,28);   // nothing to skip on a one-off task
  w.dx=d;w.row.style.transform="translateX("+d+"px)";
  w.bg.dataset.side=d<0?"done":"skip";w.bg.classList.toggle("go",Math.abs(d)>w.row.offsetWidth*.35&&!(d>0&&w.t.repeat.unit==="none"));
});
const swipeEnd=()=>{
  const w=swipe;swipe=null;if(!w||!w.on)return;
  swiped=Date.now();const go=w.bg.classList.contains("go"),left=w.dx<0;
  w.row.style.transition="transform .22s ease";w.row.style.transform=go?"translateX("+(left?-1:1)*w.row.offsetWidth+"px)":"";
  setTimeout(()=>{w.bg.remove();w.row.classList.remove("swiping");w.row.style.transition="";if(!go)w.row.style.transform="";if(go)(left?act.done:act.skip)(w.t)},go?220:230);
};
$("list").addEventListener("pointerup",swipeEnd);$("list").addEventListener("pointercancel",swipeEnd);
$("list").onclick=e=>{
  if(Date.now()-swiped<400)return;   // the end of a swipe is not a tap
  const gh=/** @type {any} */ (e.target).closest(".gh");if(gh){const k=gh.dataset.g;COLL.has(k)?COLL.delete(k):COLL.add(k);render();return}
  const b=/** @type {any} */ (e.target).closest("[data-a]");
  if(b&&b.dataset.a==="new")return openEditor();
  if(b&&b.dataset.a==="clear"){clearFilters();keepView();drawFilters();render();return}
  const row=/** @type {any} */ (e.target).closest(".row"),t=row&&find(row.dataset.id);if(!t)return;
  if(!b)return openCard(t);
  if(b.dataset.a==="more")return moreMenu(b,t);
  act[b.dataset.a]&&act[b.dataset.a](t);
};
$("list").onkeydown=e=>{if((e.key==="Enter"||e.key===" ")&&e.target.classList.contains("gh")){e.preventDefault();e.target.click();return}if((e.key==="Enter"||e.key===" ")&&e.target.classList.contains("row")){e.preventDefault();const t=find(e.target.dataset.id);if(t)openCard(t)}};

/* small menu (⋯) */
let popEl=null;
function closePop(){if(popEl){popEl.remove();popEl=null;document.removeEventListener("click",outside,true)}}
function outside(e){if(popEl&&!popEl.contains(e.target))closePop()}
function menu(anchor,items,run){
  closePop();items=items.filter(Boolean);
  popEl=document.createElement("div");popEl.className="pop";popEl.setAttribute("role","menu");
  popEl.innerHTML=items.map(i=>i==="-"?"<hr>":'<button type="button" role="menuitem" data-k="'+i[0]+'"'+(i[3]?' class="'+i[3]+'"':"")+(i[3]==="danger"?' data-hold title="Hold to delete"':"")+'>'+SVG(i[2])+'<span>'+esc(i[1])+'</span></button>').join("");
  (anchor.closest("dialog")||document.body).appendChild(popEl);
  const r=anchor.getBoundingClientRect(),w=popEl.offsetWidth,h=popEl.offsetHeight;
  popEl.style.left=Math.max(8,Math.min(innerWidth-w-8,r.right-w))+"px";
  popEl.style.top=(r.bottom+h+8>innerHeight?Math.max(8,r.top-h-6):r.bottom+6)+"px";
  popEl.querySelector("button").focus();
  setTimeout(()=>document.addEventListener("click",outside,true));
  popEl.onkeydown=e=>{
    const bs=[...popEl.querySelectorAll("button")],i=bs.indexOf(document.activeElement);
    if(e.key==="Escape"){e.stopPropagation();e.preventDefault();closePop();anchor.focus()}
    if(e.key==="ArrowDown"){e.preventDefault();bs[(i+1)%bs.length].focus()}
    if(e.key==="ArrowUp"){e.preventDefault();bs[(i-1+bs.length)%bs.length].focus()}
  };
  popEl.onclick=e=>{
    const b=/** @type {any} */ (e.target).closest("[data-k]");if(!b)return;
    closePop();run(b.dataset.k);
  };
}
function moreMenu(anchor,t){
  const rep=t.repeat.unit!=="none";
  menu(anchor,[["edit","Edit",IC.edit],["dup","Duplicate",IC.copy],
    rep&&t.status==="active"?["skip","Skip This Date",IC.skip]:null,
    t.status==="paused"?["resume","Resume",IC.play]:t.status==="active"?["pause","Pause",IC.pause]:null,
    t.url?["open","Open Website",IC.link]:null,"-",["del","Delete",IC.trash,"danger"]],k=>act[k](t));
}

/* ---------- the task card (clicking a task) ---------- */
let cardT=null;
function openCard(t){
  cardT=t;hideTip();
  const st=stateOf(t),d=t.due,dlg=$("vdlg");
  dlg.className="s-"+st;
  $("vtags").innerHTML='<span class="tag" style="color:var(--st);background:color-mix(in srgb,var(--st) 14%,transparent);font-weight:700">'+esc(ST_NAME[st])+'</span>'+tagsHtml({...t,notes:"",time:""});
  $("vname").textContent=t.name;
  $("vprice").textContent=t.price==null?"No Price":money(t.price,curOf(t));
  $("vwhen").textContent=st==="done"?"Done "+(t.doneAt?fmtD(tsDay(t.doneAt)):""):st==="paused"?"Paused":whenText(st,d,t);
  const nexts=[];if(t.repeat.unit!=="none"){let s=nextDate(d,t.repeat,t.day);for(let i=0;i<3;i++){nexts.push(fmtD(s,{day:"numeric",month:"short",year:"numeric"}));s=nextDate(s,t.repeat,t.day)}}
  const mine=LOG.filter(e=>e.task===t.id).sort((a,b)=>b.t-a.t),pm={};mine.forEach(e=>{if(e.k==="paid"&&e.p!=null){const c=e.cur||SET.currency;pm[c]=(pm[c]||0)+e.p}});
  const host=u=>{try{return new URL(u).hostname.replace(/^www\./,"")}catch(e){return u}};
  $("vbody").innerHTML='<dl class="vdl">'+
    '<dt>Due</dt><dd>'+esc(fmtLong(d))+(t.time?", "+t12(t.time):"")+'</dd>'+
    '<dt>Repeats</dt><dd>'+esc(repLabel(t.repeat))+(nexts.length?'<br><small>After That: '+esc(nexts.join(", "))+'</small>':"")+'</dd>'+
    '<dt>Remind Me</dt><dd>'+esc(t.remind>=0?REMIND[String(t.remind)]||t.remind+" Days Before":REMIND[String(SET.soon)]||SET.soon+" Days Before")+(t.remind<0?' <small>(Page Default)</small>':"")+'</dd>'+
    (t.mode?'<dt>Online or Offline</dt><dd>'+(t.mode==="online"?"Online":"Offline")+'</dd>':"")+
    (t.url?'<dt>Website</dt><dd><a href="'+esc(t.url)+'" target="_blank" rel="noopener noreferrer">'+esc(host(t.url))+'</a></dd>':"")+
    '<dt>Added</dt><dd>'+esc(fmtD(tsDay(t.created)))+(t.updated>t.created+60?' <small>(Changed '+esc(fmtD(tsDay(t.updated)))+')</small>':"")+'</dd></dl>'+
    (t.notes?'<p class="vh3">Notes</p><p class="vnotes">'+esc(t.notes)+'</p>':"")+
    (mine.length?'<p class="vh3">Completed ('+mine.length+')'+(sums(pm)?", "+esc(sums(pm))+" Paid":"")+'</p><table class="hist num">'+mine.slice(0,6).map(e=>'<tr><td>'+esc(fmtD(e.d))+'</td><td>'+(e.k==="skip"?"Skipped":"Done "+esc(fmtD(tsDay(e.t),{day:"numeric",month:"short"})))+'</td><td>'+esc(money(e.p,e.cur||SET.currency))+'</td></tr>').join("")+'</table>'+(mine.length>6?'<p class="hint" style="margin:6px 0 12px">The rest are in Completed.</p>':""):"");
  const B=(k,label,icon,cls)=>'<button type="button" class="btn '+(cls||"")+'" data-c="'+k+'">'+SVG(icon)+label+'</button>';
  $("vfoot").innerHTML='<button type="button" class="btn left danger" data-c="del" data-hold title="Hold to delete">'+SVG(IC.trash)+'Delete</button>'+
    (t.status==="active"&&t.repeat.unit!=="none"?B("skip","Skip Date",IC.skip):"")+
    (t.status==="active"?B("pause","Pause",IC.pause):t.status==="paused"?B("resume","Resume",IC.play):"")+
    B("dup","Duplicate",IC.copy)+B("edit","Edit",IC.edit)+
    (t.status==="active"?B("done","Mark Done",IC.check,"pri"):t.status==="done"?B("reopen","Put Back on the List",IC.undo,"pri"):"");
  if(!dlg.open)dlg.showModal();
  $("vfoot").querySelector(".pri,[data-c=edit]").focus();
}
$("vfoot").onclick=e=>{
  const b=/** @type {any} */ (e.target).closest("[data-c]");if(!b||!cardT)return;const k=b.dataset.c,t=cardT;
  $("vdlg").close();act[k](t);
};
$("vdlg").addEventListener("click",e=>{if(e.target===$("vdlg"))$("vdlg").close()});

