/* ---------- what's on screen ---------- */
function matches(t){
  const q=V.q.trim().toLowerCase();
  if(q&&!(t.name+" "+t.cat+" "+t.notes+" "+repLabel(t.repeat)+" "+(t.mode||"")+" "+curOf(t)).toLowerCase().includes(q))return false;
  if(V.cat&&(V.cat==="-"?t.cat!=="":t.cat!==V.cat))return false;
  if(V.rep&&repKind(t.repeat)!==V.rep)return false;
  if(V.cur&&curOf(t)!==V.cur)return false;
  if(V.where&&t.mode!==V.where)return false;
  if(V.price==="paid"&&t.price==null||V.price==="free"&&t.price!=null)return false;
  return true;
}
function rangeEnd(r){const t0=todayS();return r==="week"?weekEnd(t0):r==="month"?monthEnd(t0):r==="year"?t0.slice(0,4)+"-12-31":""}
/** the rows for a range: All Tasks = each task once at its next date; This Week / Month / Year = every date until then, overdue ones first */
function rowsFor(range){
  const t0=todayS(),end=rangeEnd(range),stOk=st=>!V.st||(V.st==="soon"?st==="soon"||st==="today":st===V.st);
  const dateOk=d=>(!V.year||d.slice(0,4)===V.year)&&(!V.month||d.slice(5,7)===V.month);
  const rows=[];
  for(const t of T){
    if(t.status==="done"||!matches(t))continue;
    if(V.day){if(t.status==="active")dates(t,V.day,V.day).forEach(d=>rows.push({t,d,st:d===t.due?stateOf(t,d):"up",occ:d!==t.due}));continue}
    if(range==="all"){const st=stateOf(t);if(stOk(st)&&dateOk(t.due))rows.push({t,d:t.due,st,occ:false});continue}
    if(t.status!=="active")continue;
    if(t.due<t0){if(stOk("late")&&dateOk(t.due))rows.push({t,d:t.due,st:"late",occ:false})}
    dates(t,t.due<t0?t0:t.due,end).forEach(d=>{if(d<t0)return;const st=d===t.due?stateOf(t,d):"up";if(stOk(st)&&dateOk(d))rows.push({t,d,st,occ:d!==t.due})});
  }
  return rows;
}
function rowsNow(){
  const rows=rowsFor(V.range),last=x=>x.st==="paused"?1:0;
  const by={
    due:(a,b)=>last(a)-last(b)||a.d.localeCompare(b.d)||(a.t.time||"99").localeCompare(b.t.time||"99")||a.t.name.localeCompare(b.t.name),
    "due-":(a,b)=>last(a)-last(b)||b.d.localeCompare(a.d)||a.t.name.localeCompare(b.t.name),
    price:(a,b)=>(a.t.price??Infinity)-(b.t.price??Infinity)||by.due(a,b),
    "price-":(a,b)=>(b.t.price??-1)-(a.t.price??-1)||by.due(a,b),
    name:(a,b)=>a.t.name.localeCompare(b.t.name,undefined,{sensitivity:"base"})||by.due(a,b),
    cat:(a,b)=>(a.t.cat||"\uffff").localeCompare(b.t.cat||"\uffff")||by.due(a,b),
    on:(a,b)=>({online:0,offline:1,"":2}[a.t.mode||""]-{online:0,offline:1,"":2}[b.t.mode||""])||by.due(a,b),
    off:(a,b)=>({offline:0,online:1,"":2}[a.t.mode||""]-{offline:0,online:1,"":2}[b.t.mode||""])||by.due(a,b),
    new:(a,b)=>b.t.created-a.t.created||by.due(a,b),
    upd:(a,b)=>b.t.updated-a.t.updated||by.due(a,b)
  };
  rows.sort(by[V.sort]||by.due);
  return rows;
}
const ST_ORDER={late:0,today:1,soon:2,up:3,paused:4,done:5};
const ST_NAME={late:"Overdue",today:"Due Today",soon:"Due Soon",up:"Coming Up",paused:"Paused",done:"Done"};
function groupKey(r){
  if(V.group==="smart"){
    if(r.st==="paused")return"9";
    const d=days(parse(r.d),today());
    if(d<0||(d===0&&r.st==="late"))return"0";
    if(d===0)return"1";if(d===1)return"2";if(d<=6)return"3";if(d<=13)return"4";
    if(r.d<=monthEnd(todayS()))return"5";
    return"6-"+r.d.slice(0,7);
  }
  if(r.st==="paused"&&(V.group==="month"||V.group==="year"))return"~";
  if(V.group==="month")return r.d.slice(0,7);
  if(V.group==="year")return r.d.slice(0,4);
  if(V.group==="cat")return r.t.cat||"";
  if(V.group==="where")return{online:"1",offline:"2"}[r.t.mode]||"3";
  if(V.group==="state")return String(ST_ORDER[r.st]);
  return"";
}
function groupName(k){
  if(V.group==="smart"){
    if(k[0]==="6"){const p=k.split("-");return MONTHS[+p[2]-1]+" "+p[1]}
    return{0:"Overdue",1:"Today",2:"Tomorrow",3:"This Week",4:"Next Week",5:"Later This Month",9:"Paused"}[k]||"";
  }
  if(k==="~")return"Paused";
  if(V.group==="month"){const[y,m]=k.split("-");return MONTHS[+m-1]+" "+y}
  if(V.group==="year")return k;
  if(V.group==="cat")return k||"No Category";
  if(V.group==="where")return{1:"Online",2:"Offline",3:"Online or Offline Not Set"}[k];
  if(V.group==="state")return ST_NAME[Object.keys(ST_ORDER).find(s=>String(ST_ORDER[s])===k)];
  return"";
}
function tagsHtml(t,extra){
  return [t.cat?'<span class="tag cat" style="--cc:'+catColor(t.cat)+'">'+esc(t.cat)+'</span>':"",
    '<span class="tag">'+SVG(IC.rep,"")+esc(repLabel(t.repeat))+'</span>',
    t.mode==="online"?'<span class="tag on">'+SVG(IC.globe,"")+'Online</span>':t.mode==="offline"?'<span class="tag off">'+SVG(IC.shop,"")+'Offline</span>':"",
    t.time?'<span class="tag">'+SVG(IC.clock,"")+t12(t.time)+'</span>':"",
    t.notes?'<span class="tag notes" data-tip="'+esc(t.id)+'" tabindex="0" aria-label="Notes: '+esc(t.notes.slice(0,200))+'">'+SVG(IC.note,"")+'Notes</span>':"",
    extra||""].join("");
}
const COLL=new Set();
function rowHtml(r){
  const t=r.t,st=r.st,d=parse(r.d),ds=days(d,today());
  let dl=st==="late"?whenText(st,r.d,t):ds===0?"Today":ds===1?"Tomorrow":fmtD(r.d,d.getFullYear()===today().getFullYear()?{weekday:"short",day:"numeric",month:"short"}:{weekday:"short",day:"numeric",month:"short",year:"numeric"});
  if(t.time&&st!=="late"&&st!=="paused")dl+=", "+t12(t.time);
  if(st==="paused")dl="Paused";
  const cb=t.status==="paused"?'<button type="button" class="cb pz" data-a="resume" aria-label="Resume '+esc(t.name)+'" title="Resume">'+SVG(IC.play,"")+'</button>'
    :r.occ?'<span class="cb occ" aria-hidden="true"></span>'
    :'<button type="button" class="cb" data-a="done" aria-label="Mark '+esc(t.name)+' done" title="'+(t.repeat.unit==="none"?"Mark Done":"Mark Done and Move to the Next Date")+'">'+SVG(IC.check,"")+'</button>';
  return '<div class="row s-'+st+(r.occ?' occ':'')+'" data-id="'+esc(t.id)+'" role="button" tabindex="0" aria-label="'+esc(t.name)+', '+esc(whenText(st,r.d,t))+'">'+cb+
    '<div class="nm"><b>'+esc(t.name)+'</b><span class="meta"><span class="dl">'+esc(dl)+'</span>'+
    (t.repeat.unit!=="none"?'<span class="mt">'+SVG(IC.rep,"")+esc(repLabel(t.repeat))+'</span>':"")+
    (t.cat?'<span class="mt mc" style="--cc:'+catColor(t.cat)+'"><i></i>'+esc(t.cat)+'</span>':"")+
    (t.mode==="online"?'<span class="mt">'+SVG(IC.globe,"")+'Online</span>':t.mode==="offline"?'<span class="mt">'+SVG(IC.shop,"")+'Offline</span>':"")+
    (r.occ?'<span class="mt"><em>Later Date</em></span>':"")+
    (t.notes?'<span class="mt notes" data-tip="'+esc(t.id)+'" tabindex="0" aria-label="Notes: '+esc(t.notes.slice(0,200))+'">'+SVG(IC.note,"")+'Notes</span>':"")+
    '</span></div>'+
    '<div class="amt num'+(t.price==null?" none":"")+'">'+(t.price==null?"":esc(money(t.price,curOf(t))))+'</div>'+
    '<div class="act"><button type="button" class="ib" data-a="more" aria-label="More for '+esc(t.name)+'" title="More" aria-haspopup="menu">'+SVG(IC.dots,"")+'</button></div></div>';
}
function render(){
  if(!loaded)return;
  $("vlist").hidden=V.view!=="list";$("vcal").hidden=V.view!=="cal";$("van").hidden=V.view!=="an";$("vdone").hidden=V.view!=="done";
  $("vsw").hidden=V.view!=="list"&&V.view!=="cal";
  $("qaf").style.visibility=V.view==="list"||V.view==="cal"?"":"hidden";   // Analytics and Completed add nothing
  document.querySelectorAll("#views button").forEach((/** @type {HTMLElement} */ b)=>b.setAttribute("aria-pressed",String(b.dataset.view===V.view)));
  document.querySelectorAll("#vsw button").forEach((/** @type {HTMLElement} */ b)=>b.setAttribute("aria-pressed",String(b.dataset.v===V.view)));
  drawStats();hideTip();
  if(V.view!=="list")drawHead([]);
  if(V.view==="cal")return drawCalView();
  if(V.view==="an")return drawAnalytics();
  if(V.view==="done")return drawDone();
  drawStrip();drawRanges();drawChips();
  const rows=rowsNow(),list=$("list");drawHead(rows);
  if(!T.some(t=>t.status!=="done")){
    list.innerHTML='<div class="empty"><h2>No Tasks Yet</h2><p>Add renewals, bills, subscriptions and anything else with a date. The one due next is always at the top.</p><button type="button" class="btn pri" data-a="new">'+SVG("M12 5v14M5 12h14")+'Add Your First Task</button></div>';
    $("count").textContent="";return;
  }
  if(!rows.length){
    list.innerHTML='<div class="empty"><h2>Nothing Here</h2><p>'+(V.day?"No tasks on "+esc(fmtD(V.day))+".":V.range!=="all"?"Nothing is due "+{week:"this week",month:"this month",year:"this year"}[V.range]+" with these filters.":"No task fits these filters.")+'</p><button type="button" class="btn" data-a="clear">Show All</button></div>';
    $("count").textContent="";return;
  }
  const groups=new Map();
  for(const r of rows){const k=groupKey(r);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r)}
  let keys=[...groups.keys()];
  if(V.group==="cat")keys.sort((a,b)=>(a||"\uffff").localeCompare(b||"\uffff"));
  else if(V.group!=="none")keys.sort((a,b)=>a==="~"?1:b==="~"?-1:V.sort==="due-"&&(V.group==="month"||V.group==="year")?b.localeCompare(a):a.localeCompare(b,undefined,{numeric:true}));
  list.innerHTML=keys.map(k=>{
    const g=groups.get(k),m={};g.forEach(r=>addTo(m,r.t,r.t.price||0));const sm=sums(m),shut=COLL.has(k);
    return (V.group==="none"?"":'<h2 class="gh gk-'+(V.group==="smart"?k[0]:"x")+(shut?" closed":"")+'" data-g="'+esc(k)+'" role="button" tabindex="0" aria-expanded="'+!shut+'">'+SVG("M6 9l6 6 6-6","")+'<span>'+esc(groupName(k))+'</span><small class="num">'+g.length+(sm&&SET.stats!==false?" · "+esc(sm):"")+'</small></h2>')+(shut?"":g.map(rowHtml).join(""));
  }).join("");
  const m={};rows.forEach(r=>addTo(m,r.t,r.t.price||0));
  $("count").textContent=rows.length+(rows.length===1?" Task":" Tasks")+(sums(m)?", "+sums(m)+" in Total":"");
}

