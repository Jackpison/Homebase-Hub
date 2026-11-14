/* ---------- (1.72.0) calendars you follow: their events, read-only, beside the tasks (api.php?action=subs) ---------- */
/** @type {{cals:any[],events:any[],stale?:boolean}} */
let SUBS={cals:[],events:[]};
const subCal=id=>SUBS.cals.find(c=>c.id===id)||{name:"Calendar",color:"#4cc9f0"};
const evOn=d=>SUBS.events.filter(e=>e.d===d).sort((a,b)=>(a.t||"").localeCompare(b.t||""));
function evHtml(e,cls){const c=subCal(e.c);return '<span class="'+cls+'" style="--ec:'+esc(c.color)+'" title="'+esc(c.name+": "+e.s+(e.t?" at "+tShort(e.t):""))+'">'+(e.t?'<em>'+tShort(e.t)+'</em>':'')+'<span>'+esc(e.s)+'</span></span>'}
let subsAgain=false;
async function subsLoad(){
  try{const r=await HF("api.php?action=subs",{cache:"no-store"}),j=await r.json();if(!j||!j.ok)return;SUBS=j;if(V.view==="cal")render();if($("sdlg").open)subsDraw();
    if(j.stale&&!subsAgain){subsAgain=true;subsPost({action:"sub_refresh"},true)}}catch{}
}
async function subsPost(body,quiet){
  try{const r=await HF("api.php",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}),j=await r.json();
    if(!j.ok){if(!quiet)snack(j.error||"That did not work.");return false}
    SUBS=j;if(V.view==="cal")render();subsDraw();return true}catch{if(!quiet)snack("Can't reach the server.");return false}
}
function subsDraw(){
  const box=$("s-subs");if(!box)return;
  box.innerHTML=SUBS.cals.length?SUBS.cals.map(c=>'<div class="subr"><i style="background:'+esc(c.color)+'"></i><div><b>'+esc(c.name)+'</b><small>'+esc(c.show)+' · '+
    (c.error?'<span class="bad">'+esc(c.error)+'</span>':c.n+(c.n===1?" event":" events"))+(c.at?' · '+esc(new Date(c.at*1000).toLocaleString(LOC(),{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})):"")+'</small></div>'+
    '<button type="button" class="ib" data-subre="'+esc(c.id)+'" aria-label="Fetch '+esc(c.name)+' again" title="Fetch Again">'+SVG("M21 12a9 9 0 1 1-3-6.7M21 4v5h-5","")+'</button>'+
    '<button type="button" class="ib" data-subdel="'+esc(c.id)+'" aria-label="Stop following '+esc(c.name)+'" title="Stop Following">'+SVG("M6 6l12 12M18 6L6 18","")+'</button></div>').join(""):'<p class="hint">None yet.</p>';
}
$("s-subs").addEventListener("click",async e=>{
  const t=/** @type {any} */ (e.target).closest("[data-subre],[data-subdel]");if(!t)return;t.disabled=true;
  if(t.dataset.subre){if(await subsPost({action:"sub_refresh",id:t.dataset.subre}))snack("Fetched again.")}
  else if(confirm("Stop following this calendar? Its events leave Tasks.")){if(await subsPost({action:"sub_del",id:t.dataset.subdel}))snack("You no longer follow it.")}
  t.disabled=false;
});
$("s-subadd").onclick=async()=>{
  const u=/** @type {HTMLInputElement} */ ($("s-suburl")),b=/** @type {HTMLButtonElement} */ ($("s-subadd"));
  if(!u.value.trim()){u.focus();return}
  b.disabled=true;b.textContent="Fetching…";
  const ok=await subsPost({action:"sub_add",url:u.value.trim(),name:/** @type {HTMLInputElement} */ ($("s-subname")).value.trim(),color:/** @type {HTMLInputElement} */ ($("s-subcol")).value});
  b.disabled=false;b.textContent="Follow";if(ok){u.value="";/** @type {HTMLInputElement} */ ($("s-subname")).value="";snack("Following it. Its events are in the Calendar.")}
};
function pillHtml(x){
  const id=itId(x),drag=x.t&&!x.occ;
  return '<span class="pl s-'+x.st+(x.occ?" occ":"")+'"'+(id?' data-id="'+esc(id)+'"':'')+(drag?' draggable="true"':'')+' style="--cc:'+ccOf(x)+'" title="'+esc(itTip(x))+'">'+
    (x.t&&x.t.time&&x.st!=="done"?'<em>'+tShort(x.t.time)+'</em>':'')+'<span>'+esc(itName(x))+'</span></span>';
}
function wcardHtml(x){
  const id=itId(x),drag=x.t&&!x.occ,p=itPrice(x);
  const bits=[p!=null?money(p,itCur(x)):"",x.t&&x.t.time?tShort(x.t.time):"",itCat(x)||"",x.st==="late"?"Overdue":x.st==="done"?"Done":x.occ?"Later Date":""].filter(Boolean);
  return '<div class="wc s-'+x.st+(x.occ?" occ":"")+'"'+(id?' data-id="'+esc(id)+'"':'')+(drag?' draggable="true"':'')+' style="--cc:'+ccOf(x)+'" title="'+esc(itTip(x))+'"><b>'+esc(itName(x))+'</b>'+(bits.length?'<span class="num">'+esc(bits.join(" · "))+'</span>':'')+'</div>';
}
function doneRowHtml(e){
  return '<div class="row s-done" data-id="'+esc(e.task||"")+'" role="button" tabindex="0" aria-label="'+esc(e.name)+', done"><span class="cb dn" aria-hidden="true">'+SVG(IC.check,"")+'</span>'+
    '<div class="nm"><b>'+esc(e.name)+'</b><span class="meta"><span class="dl">Done</span>'+(e.cat?'<span class="mt mc" style="--cc:'+catColor(e.cat)+'"><i></i>'+esc(e.cat)+'</span>':"")+'</span></div>'+
    '<div class="amt num">'+(e.p==null?"":esc(money(e.p,e.cur||SET.currency)))+'</div><div class="act"></div></div>';
}
function drawCalView(){
  const box=$("vcal"),t0=todayS(),mode=V.calV,sel=V.calSel||t0,base=calBase();
  /** @type {any} */
  let from,to,on;
  let title="",body="",scope="";
  if(mode==="year"){
    const y=+base.slice(0,4);from=y+"-01-01";to=y+"-12-31";on=dayItems(from,to);title=String(y);scope=y+" at a Glance";
    // how much is due each day, in the page currency (or how many tasks, when nothing has a price)
    const cur=SET.currency,val={};let byMoney=false;
    for(const d in on){const m=dueMap(on[d]);if(m[cur]){val[d]=m[cur];byMoney=true}}
    if(!byMoney)for(const d in on){const n=on[d].filter(x=>x.st!=="done").length;if(n)val[d]=n}
    const mx=Math.max(1,...Object.values(val)),lvl=v=>{if(!v)return"";const r=Math.sqrt(v/mx);return r>.75?" h4":r>.5?" h3":r>.28?" h2":" h1"};
    body='<div class="yg">'+MONTHS.map((mn,mi)=>{
      const mk=y+"-"+pad(mi+1),first=mk+"-01",n=dim(y,mi),lead=(parse(first).getDay()-WS()+7)%7,its=[];
      for(let d=1;d<=n;d++)its.push(...(on[mk+"-"+pad(d)]||[]));
      const open=its.filter(x=>x.st!=="done"),mt=compactMap(dueMap(its));
      let cells="";for(let i=0;i<lead;i++)cells+='<span></span>';
      for(let d=1;d<=n;d++){const ds=mk+"-"+pad(d),it=on[ds]||[];
        cells+='<button type="button" class="yd'+lvl(val[ds])+(ds===t0?" today":"")+(it.some(x=>x.st==="late")?" lt":"")+'" data-day="'+ds+'" title="'+esc(fmtD(ds,{weekday:"short",day:"numeric",month:"short"})+(it.length?": "+it.map(itName).slice(0,4).join(", ")+(it.length>4?"…":""):""))+'">'+d+'</button>'}
      return '<div class="ym'+(mk===t0.slice(0,7)?" now":"")+'"><button type="button" class="ymh" data-month="'+mk+'"><b>'+mn+'</b><small class="num">'+(open.length?open.length+(mt?" · "+esc(mt):""):"Free")+'</small></button>'+
        '<div class="ymg">'+WDN().map(w=>'<i>'+w[0]+'</i>').join("")+cells+'</div></div>';
    }).join("")+'</div><div class="ylg">Less<i style="background:color-mix(in srgb,var(--acc) 20%,transparent)"></i><i style="background:color-mix(in srgb,var(--acc) 40%,transparent)"></i><i style="background:color-mix(in srgb,var(--acc) 65%,transparent)"></i><i style="background:var(--acc)"></i>More '+(byMoney?"to Pay":"Tasks")+'</div>';
  }else if(mode==="week"){
    const s0=weekStart(sel),ds=[0,1,2,3,4,5,6].map(i=>addDays(s0,i));from=ds[0];to=ds[6];on=dayItems(from,to);scope="Week at a Glance";
    title=fmtD(from,{day:"numeric",month:"short"})+" – "+fmtD(to,{day:"numeric",month:"short",year:"numeric"});
    body='<div class="wg">'+ds.map((d,i)=>{const it=on[d]||[],m=sums(dueMap(it));
      return '<div class="wcol'+(d===t0?" today":"")+(d===sel?" sel":"")+'" data-day="'+d+'"><div class="wch"><small>'+WDN()[i]+'</small><b class="num">'+(+d.slice(8))+'</b><span class="num">'+esc(m)+'</span></div>'+
        '<div class="wcl">'+(evOn(d).map(e=>evHtml(e,"evc")).join("")+it.map(wcardHtml).join("")||'<p class="wce">Free</p>')+'</div>'+
        '<button type="button" class="wadd" data-addday="'+d+'" aria-label="Add a task on '+esc(fmtD(d,{weekday:"long",day:"numeric",month:"long"}))+'" title="Add a Task">'+SVG("M12 5v14M5 12h14","")+'</button></div>'}).join("")+'</div>';
  }else{
    const y=+base.slice(0,4),m=+base.slice(5,7)-1,start=weekStart(base+"-01"),cells=[];
    for(let i=0;i<42;i++)cells.push(addDays(start,i));
    if(cells[35].slice(0,7)!==base)cells.length=35;
    from=cells[0];to=cells[cells.length-1];on=dayItems(from,to);title=MONTHS[m]+" "+y;scope=MONTHS[m]+" at a Glance";
    body='<div class="mg r'+(cells.length/7)+'">'+WDN().map(w=>'<div class="wdh">'+w+'</div>').join("")+cells.map(d=>{
      const it=on[d]||[],wd=parse(d).getDay(),mt=compactMap(dueMap(it));
      return '<div class="cd'+(d.slice(0,7)!==base?" out":"")+(d===t0?" today":"")+(d===sel?" sel":"")+(wd===0||wd===6?" we":"")+'" data-day="'+d+'" role="button" tabindex="0" title="'+esc(fmtD(d,{weekday:"long",day:"numeric",month:"long"}))+(it.length?", "+it.length+(it.length===1?" task":" tasks"):"")+'">'+
        '<div class="cdh"><span class="n num">'+(+d.slice(8))+'</span>'+(mt?'<small class="num">'+esc(mt)+'</small>':'')+'</div>'+
        it.slice(0,3).map(pillHtml).join("")+(it.length>3?'<span class="more">+'+(it.length-3)+' More</span>':'')+evOn(d).slice(0,it.length>2?1:2).map(e=>evHtml(e,"evp")).join("")+
        (it.length?'<span class="dots">'+it.slice(0,4).map(x=>'<i class="s-'+x.st+'"'+(x.st==="up"?' style="--pc:'+ccOf(x)+'"':'')+'></i>').join("")+'</span>':'')+'</div>';
    }).join("")+'</div>';
  }
  // the range on screen, for the line under the title and the summary
  const inRange=[];for(const d in on)if(mode!=="month"||d.slice(0,7)===base)inRange.push(...on[d]);
  const open=inRange.filter(x=>x.st!=="done"),dueS=sums(dueMap(inRange));
  $("tsub").textContent=title+" · "+(open.length?open.length+(open.length===1?" Task":" Tasks")+(dueS&&SET.stats!==false?" · "+dueS:""):"Nothing Due");
  const here=mode==="year"?base.slice(0,4)===t0.slice(0,4):mode==="week"?weekStart(sel)===weekStart(t0):base===t0.slice(0,7);
  box.innerHTML='<div class="cvh"><button type="button" class="ib navb" data-cv="-1" aria-label="Previous">'+SVG(IC.prev,"")+'</button><button type="button" class="ib navb" data-cv="1" aria-label="Next">'+SVG(IC.next,"")+'</button>'+
      '<h2>'+esc(title)+'</h2>'+(here&&sel===t0?'':'<button type="button" class="btn" data-cv="0" style="height:34px">Today</button>')+'<span class="sp"></span>'+
      '<div class="seg" id="cvmode" role="group" aria-label="Calendar Range">'+[["month","Month"],["week","Week"],["year","Year"]].map(o=>'<button type="button" data-mode="'+o[0]+'" aria-pressed="'+(mode===o[0])+'">'+o[1]+'</button>').join("")+'</div></div>'+
    '<div class="cvb"><div class="cvmain">'+body+(mode!=="year"?'<p class="cvtip">Click a day to see it on the right, double-click to add a task there. Drag a task to another day to move its date.</p>':'<p class="cvtip">Click a month to open it, or a day to see what is due.</p>')+'</div>'+
    '<aside class="ag" id="agenda" aria-label="The Chosen Day">'+agendaHtml(sel)+summaryHtml(scope,inRange)+'</aside></div>';
}
function agendaHtml(d){
  const t0=todayS(),it=(dayItems(d,d)[d]||[]),open=it.filter(x=>x.st!=="done"),m=sums(dueMap(it)),rel=days(parse(d),today());
  const late=d===t0?T.filter(t=>t.status==="active"&&t.due<t0&&matches(t)).sort((a,b)=>a.due.localeCompare(b.due)):[];
  const rows=it.map(x=>x.t?rowHtml({t:x.t,d:x.d,st:x.st,occ:x.occ}):doneRowHtml(x.log)).join("");
  return '<div class="agc"><div class="agh'+(d===t0?" today":"")+'"><small>'+(rel===0?"Today":rel===1?"Tomorrow":rel===-1?"Yesterday":esc(parse(d).toLocaleDateString(LOC(),{weekday:"long"})))+'</small>'+
      '<h3>'+esc(fmtD(d,{weekday:rel>=-1&&rel<=1?"long":undefined,day:"numeric",month:"long"}))+'</h3><p class="num">'+(open.length?open.length+(open.length===1?" Task":" Tasks")+(m&&SET.stats!==false?" · "+esc(m):""):it.length?"All Done":"Nothing Due")+'</p></div>'+
    '<form class="aga" id="agf" autocomplete="off">'+SVG("M12 5v14M5 12h14")+'<input type="text" id="agq" maxlength="200" placeholder="Add to '+esc(fmtD(d,{weekday:"short",day:"numeric",month:"short"}))+'…" aria-label="Quick Add a Task on This Day"></form>'+
    '<div class="agl">'+(rows||(late.length?"":'<p class="none">'+(d<t0?"Nothing was due this day.":"Nothing due. Type above to add a task here.")+'</p>'))+
      (late.length?'<p class="sub">Still Overdue</p>'+late.map(t=>rowHtml({t,d:t.due,st:"late",occ:false})).join(""):"")+
      (evOn(d).length?'<p class="sub">From Your Calendars</p>'+evOn(d).map(e=>evHtml(e,"evr")).join(""):"")+'</div></div>';
}
function summaryHtml(scope,list){
  const open=list.filter(x=>x.st!=="done"),done=list.filter(x=>x.st==="done"),late=open.filter(x=>x.st==="late");
  const byDay={};open.forEach(x=>{if(itPrice(x)!=null&&itCur(x)===SET.currency)byDay[x.d]=(byDay[x.d]||0)+itPrice(x)});
  const busy=Object.entries(byDay).sort((a,b)=>b[1]-a[1])[0],dm=sums(dueMap(list)),pm=sums(paidMap(list)),show=SET.stats!==false;
  return '<div class="agc ags"><h4>'+esc(scope)+'</h4><div class="agsg">'+
    '<div title="'+esc(dm)+'"><span>To Pay</span><b class="num">'+(show&&dm?esc(sumList(dueMap(list))[0]):open.length)+'</b><small class="num">'+open.length+(open.length===1?" task":" tasks")+(show&&sumList(dueMap(list)).length>1?" · + "+esc(sumList(dueMap(list)).slice(1).join(" + ")):"")+'</small></div>'+
    '<div class="ok" title="'+esc(pm)+'"><span>Done</span><b class="num">'+(show&&pm?esc(sumList(paidMap(list))[0]):done.length)+'</b><small>'+done.length+' marked done</small></div>'+
    '<div class="'+(late.length?"bad":"")+'"><span>Overdue</span><b class="num">'+late.length+'</b><small>'+(late.length?"needs attention":"all on time")+'</small></div>'+
    '<div><span>Biggest Day</span><b>'+(busy?esc(fmtD(busy[0],{day:"numeric",month:"short"})):"—")+'</b><small class="num">'+(busy&&show?esc(money(busy[1],SET.currency)):"no priced tasks")+'</small></div>'+
  '</div></div>';
}
function calMove(step){
  const t0=todayS();
  if(step===0){V.calM="";V.calSel="";return}
  if(V.calV==="week"){V.calSel=addDays(V.calSel||t0,7*step);V.calM=V.calSel.slice(0,7);return}
  const b=calBase();let y=+b.slice(0,4),m=+b.slice(5,7)-1;
  if(V.calV==="year")y+=step;else{m+=step;y+=Math.floor(m/12);m=((m%12)+12)%12}
  V.calM=y+"-"+pad(m+1);
  // the chosen day follows into the month on screen
  if(V.calV==="month"){const ds=V.calM===t0.slice(0,7)?t0:V.calM+"-01";V.calSel=ds===t0?"":ds}
}
$("vcal").onclick=e=>{
  const cv=/** @type {any} */ (e.target).closest("[data-cv]");if(cv){calMove(+cv.dataset.cv);drawCalView();return}
  const md=/** @type {any} */ (e.target).closest("[data-mode]");
  if(md){const k=md.dataset.mode;if(k===V.calV)return;
    if(k==="week"&&!V.calSel&&calBase()!==todayS().slice(0,7))V.calSel=calBase()+"-01";
    if(k!=="week"&&V.calSel)V.calM=V.calSel.slice(0,7);
    V.calV=k;keepView();drawCalView();return}
  const mh=/** @type {any} */ (e.target).closest("[data-month]");if(mh){V.calV="month";V.calM=mh.dataset.month;V.calSel=mh.dataset.month===todayS().slice(0,7)?"":mh.dataset.month+"-01";keepView();drawCalView();return}
  const ad=/** @type {any} */ (e.target).closest("[data-addday]");if(ad){openEditor(null,false,ad.dataset.addday);return}
  if(/** @type {any} */ (e.target).closest("#agenda"))return agendaClick(e);
  const it=/** @type {any} */ (e.target).closest(".pl[data-id],.wc[data-id]");
  if(it){const t=find(it.dataset.id);if(t){openCard(t);return}}
  const d=/** @type {any} */ (e.target).closest("[data-day]");if(!d)return;
  const ds=d.dataset.day;
  if(V.calV==="year"){V.calV="month";V.calM=ds.slice(0,7);V.calSel=ds;keepView();drawCalView()}
  else{   // only the highlight and the day on the right change, so a double-click still finds its day
    V.calSel=ds===todayS()?"":ds;
    $("vcal").querySelectorAll(".cd.sel,.wcol.sel").forEach(x=>x.classList.remove("sel"));d.classList.add("sel");
    const a=$("agenda").querySelector(".agc");if(a)a.outerHTML=agendaHtml(ds);
  }
  if(innerWidth<=980)$("agenda").scrollIntoView({block:"start",behavior:"smooth"});
};
$("vcal").ondblclick=e=>{if(/** @type {any} */ (e.target).closest("#agenda,.pl,.wc,[data-cv],[data-mode]"))return;const d=/** @type {any} */ (e.target).closest(".cd[data-day],.wcol[data-day]");if(d)openEditor(null,false,d.dataset.day)};
$("vcal").onkeydown=e=>{
  if((e.key==="Enter"||e.key===" ")&&e.target.matches(".cd,.row")){e.preventDefault();e.target.click()}
};
$("vcal").onsubmit=e=>{if(e.target.id!=="agf")return;e.preventDefault();quickAdd($("agq"),V.calSel||todayS());setTimeout(()=>{const q=$("agq");if(q)q.focus()},30)};
function agendaClick(e){
  const b=/** @type {any} */ (e.target).closest("[data-a]"),row=/** @type {any} */ (e.target).closest(".row"),t=row&&find(row.dataset.id);if(!t)return;
  if(!b)return openCard(t);
  if(b.dataset.a==="more")return moreMenu(b,t);
  act[b.dataset.a]&&act[b.dataset.a](t);
}
/* drag a task to another day: its due date moves there (repeats keep going from the new date) */
let dragId="";
$("vcal").addEventListener("dragstart",e=>{const p=e.target.closest&&/** @type {any} */ (e.target).closest("[draggable][data-id]");if(!p)return;dragId=p.dataset.id;e.dataTransfer.effectAllowed="move";try{e.dataTransfer.setData("text/plain",dragId)}catch(x){}hideTip()});
$("vcal").addEventListener("dragend",()=>{dragId="";document.querySelectorAll("#vcal .drop").forEach(x=>x.classList.remove("drop"))});
$("vcal").addEventListener("dragover",e=>{if(!dragId)return;const d=/** @type {any} */ (e.target).closest(".cd[data-day],.wcol[data-day]");if(!d)return;e.preventDefault();e.dataTransfer.dropEffect="move";
  document.querySelectorAll("#vcal .drop").forEach(x=>{if(x!==d)x.classList.remove("drop")});d.classList.add("drop")});
$("vcal").addEventListener("drop",e=>{
  const d=/** @type {any} */ (e.target).closest(".cd[data-day],.wcol[data-day]"),t=find(dragId);dragId="";
  document.querySelectorAll("#vcal .drop").forEach(x=>x.classList.remove("drop"));
  if(!d||!t)return;e.preventDefault();const to=d.dataset.day;if(to===t.due)return;
  withUndo('"'+t.name+'" Moved to '+fmtD(to)+".",()=>{t.due=to;t.day=+to.slice(8,10);t.updated=now()});
});

