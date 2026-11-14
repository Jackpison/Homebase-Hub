/* ---------- analytics ---------- */
const PERIODS=[["m0","This Month"],["n30","Next 30 Days"],["n90","Next 3 Months"],["n365","Next 12 Months"],["y0","This Year"],["y1","Next Year"],["p365","Last 12 Months (Paid)"]];
function periodRange(p){
  const t0=todayS(),y=+t0.slice(0,4);
  if(p==="m0")return[t0.slice(0,8)+"01",monthEnd(t0),false];
  if(p==="n30")return[t0,addDays(t0,29),false];
  if(p==="n90")return[t0,addDays(t0,89),false];
  if(p==="y0")return[y+"-01-01",y+"-12-31",false];
  if(p==="y1")return[(y+1)+"-01-01",(y+1)+"-12-31",false];
  if(p==="p365")return[addDays(t0,-364),t0,true];
  return[t0,addDays(t0,364),false];
}
/** every payment in the period in one currency: done ones (Completed) before today, planned ones from today */
function payments(p,cur){
  const[from,to,past]=periodRange(p),t0=todayS(),out=[],paidTo=past?to:addDays(t0,-1);
  for(const e of LOG)if(e.k==="paid"&&e.p!=null&&(e.cur||SET.currency)===cur&&e.d>=from&&e.d<=paidTo)out.push({id:e.task,n:e.name,cat:e.cat,mode:e.mode,rep:null,d:e.d,v:e.p,paid:true});
  if(!past)for(const t of T){
    if(t.status!=="active"||t.price==null||curOf(t)!==cur)continue;
    const x={id:t.id,n:t.name,cat:t.cat,mode:t.mode,rep:t.repeat};
    if(t.due<t0&&from<=t0&&to>=t0)out.push({...x,d:t0,v:t.price});
    dates(t,from>t0?from:t0,to).forEach(d=>out.push({...x,d,v:t.price}));
  }
  return out;
}
function compact(v,cur){
  const sym=(money(0,cur)||"").replace(/[\d.,\s]/g,""),r=(n,d)=>String(Math.round(n/d*10)/10);
  if(cur==="INR")return sym+(v>=1e7?r(v,1e7)+"Cr":v>=1e5?r(v,1e5)+"L":v>=1e3?r(v,1e3)+"K":Math.round(v));
  return sym+(v>=1e6?r(v,1e6)+"M":v>=1e3?r(v,1e3)+"K":Math.round(v));
}
/** paid (marked done) in one currency between two dates */
function paidBetween(from,to,cur){let v=0;for(const e of LOG)if(e.k==="paid"&&e.p!=null&&(e.cur||SET.currency)===cur&&e.d>=from&&e.d<=to)v+=e.p;return v}
function drawAnalytics(){
  const box=$("van"),curs=[...new Set([...T.map(curOf),...LOG.map(e=>e.cur||SET.currency)].filter(Boolean))].sort((a,b)=>a===SET.currency?-1:b===SET.currency?1:a.localeCompare(b));
  const cur=curs.includes(V.acur)?V.acur:(curs[0]||SET.currency);
  if(!T.length&&!LOG.length){box.innerHTML='<div class="empty"><h2>Nothing to Show Yet</h2><p>Add tasks with prices and your budget appears here, by category and by month.</p><button type="button" class="btn pri" id="anadd">Add Task</button></div>';$("anadd").onclick=()=>openEditor();return}
  const pays=payments(V.ap,cur),[from,to,past]=/** @type {[string, string, boolean]} */ (periodRange(V.ap)),t0=todayS(),f=v=>money(Math.round(v),cur),pct=v=>total?Math.round(v/total*100)+"%":"0%";
  const total=pays.reduce((s,x)=>s+x.v,0),months=Math.max(1,Math.round(days(parse(to),parse(from))/30.44));
  const byCat={},byMonth={},split={online:0,offline:0,"":0},often={};
  const oftenKey=r=>!r?"Done Earlier":r.unit==="none"?"One-Time":repLabel(r);
  for(const x of pays){
    const c=x.cat||"No Category";byCat[c]=(byCat[c]||0)+x.v;
    const mk=x.d.slice(0,7);byMonth[mk]=(byMonth[mk]||0)+x.v;
    split[x.mode||""]+=x.v;const o=oftenKey(x.rep);often[o]=(often[o]||0)+x.v;
  }
  const cats=Object.entries(byCat).sort((a,b)=>b[1]-a[1]),maxC=cats.length?cats[0][1]:1;
  const mlist=[];{let d=parse(from.slice(0,7)+"-01");const end=to.slice(0,7);while(ymd(d).slice(0,7)<=end&&mlist.length<24){mlist.push(ymd(d).slice(0,7));d=new Date(d.getFullYear(),d.getMonth()+1,1,12)}}
  const mvals=mlist.map(k=>byMonth[k]||0),maxM=Math.max(1,...mvals),avgM=total/months;
  const bigM=mlist[mvals.indexOf(Math.max(...mvals))];
  // the same length of time just before this period, from what was marked done (only for periods that start today or later)
  const len=days(parse(to),parse(from)),prevFrom=addDays(from,-len-1),prevTo=addDays(from,-1),prev=paidBetween(prevFrom,prevTo,cur);
  const prevN=LOG.filter(e=>e.k==="paid"&&e.p!=null&&(e.cur||SET.currency)===cur&&e.d>=prevFrom&&e.d<=prevTo).length;
  const delta=prev>0&&prevN>=3&&prev>=total*0.25?Math.round((total-prev)/prev*100):null;   // only with real history to compare
  // repeating costs: every active repeating task with a price, per month and per year
  const reps=T.filter(t=>t.status==="active"&&t.repeat.unit!=="none"&&t.price!=null&&curOf(t)===cur).map(t=>({t,y:t.price*perYear(t.repeat)})).sort((a,b)=>b.y-a.y);
  const repY=reps.reduce((s,x)=>s+x.y,0);
  // the next 30 days, in date order, with a running total
  const soon=payments("n30",cur).filter(x=>!x.paid).sort((a,b)=>a.d.localeCompare(b.d)||b.v-a.v);
  const soonT=soon.reduce((s,x)=>s+x.v,0);
  // price changes: what was paid last time against the price now
  const changes=[];
  for(const t of T){if(t.status==="done"||t.price==null||curOf(t)!==cur)continue;
    const h=(t.history||[]).filter(x=>x.k==="paid"&&x.p!=null);if(!h.length)continue;
    const last=h[h.length-1].p;if(last&&last!==t.price)changes.push({t,a:last,b:t.price,p:Math.round((t.price-last)/last*100)})}
  changes.sort((a,b)=>Math.abs(b.p)-Math.abs(a.p));
  // a few plain-language findings
  const ins=[];
  if(bigM&&total)ins.push(["↑","The biggest month is <b>"+MONTHS[+bigM.slice(5)-1]+" "+bigM.slice(0,4)+"</b> with <b>"+esc(f(byMonth[bigM]))+"</b>, "+(byMonth[bigM]>avgM*1.5?"well above":"close to")+" the average of "+esc(f(avgM))+" a month."]);
  if(cats[0]&&total)ins.push(["◔","<b>"+esc(cats[0][0])+"</b> is "+pct(cats[0][1])+" of the spending"+(cats[1]?", then "+esc(cats[1][0])+" ("+pct(cats[1][1])+")":"")+"."]);
  if(repY)ins.push(["⟳","Repeating tasks cost <b>"+esc(f(repY/12))+" a month</b>, "+esc(f(repY))+" a year, across "+reps.length+(reps.length===1?" task":" tasks")+"."]);
  if(soon.length)ins.push(["◷","<b>"+soon.length+" payment"+(soon.length>1?"s":"")+"</b> in the next 30 days, "+esc(f(soonT))+" in total"+(soon[0]?"; the next is "+esc(soon[0].n)+" on "+esc(fmtD(soon[0].d,{day:"numeric",month:"short"})):"")+"."]);
  if(changes.some(c=>c.p>0)){const c=changes.find(x=>x.p>0);ins.push(["▲","<b>"+esc(c.t.name)+"</b> costs "+c.p+"% more than you paid last time ("+esc(f(c.a))+" → "+esc(f(c.b))+")."])}
  const ofEntries=Object.entries(often).sort((a,b)=>b[1]-a[1]),ofCol=i=>"var(--c"+((i*3+4)%8)+")";
  const tile=(label,val,sub,extra)=>'<div class="tile">'+'<small>'+label+'</small><b class="num">'+val+'</b><span>'+sub+'</span>'+(extra||"")+'</div>';
  box.innerHTML='<div class="an-top"><select class="sel" id="ap" aria-label="Period">'+PERIODS.map(p=>'<option value="'+p[0]+'"'+(V.ap===p[0]?" selected":"")+'>'+p[1]+'</option>').join("")+'</select>'+
      (curs.length>1?'<div class="seg" id="acur" role="group" aria-label="Currency">'+curs.map(c=>'<button type="button" data-c="'+c+'" aria-pressed="'+(c===cur)+'">'+c+'</button>').join("")+'</div>':'')+
      '<span class="count" style="margin:0">'+esc(fmtD(from))+' to '+esc(fmtD(to))+'</span><span style="flex:1"></span><button type="button" class="btn" id="yrbtn">'+SVG("M4 4h16v16H4zM8 15v-3M12 15V8M16 15v-5")+'Year in Review (PDF)</button></div>'+
    '<div class="tiles">'+
      tile(past?"Paid":from<t0?"Paid and To Pay":"To Pay",esc(f(total)),pays.length+(pays.length===1?" Payment":" Payments"),
        delta!==null?'<em class="delta '+(delta>0?"up":"down")+'" title="Compared with what you paid in the same length of time before">'+(delta>0?"▲ ":"▼ ")+Math.abs(delta)+'% vs before</em>':"")+
      tile("Per Month, Average",esc(f(avgM)),"Over "+months+(months===1?" Month":" Months"))+
      tile("Repeating, per Month",esc(f(repY/12)),esc(f(repY))+" a year")+
      tile("Next 30 Days",esc(f(soonT)),soon.length+(soon.length===1?" payment":" payments"))+'</div>'+
    (ins.length?'<div class="card an-ins"><h3>At a Glance</h3><ul>'+ins.map(x=>'<li><i aria-hidden="true">'+x[0]+'</i><span>'+x[1]+'</span></li>').join("")+'</ul></div>':'')+
    '<div class="card an-month"><div class="an-h"><h3>By Month</h3><span class="legend"><span><i style="background:var(--acc)"></i>To Pay</span>'+(mlist.some(k=>past||k<t0.slice(0,7))?'<span><i style="background:color-mix(in srgb,var(--acc) 45%,transparent)"></i>Paid</span>':'')+'<span><i class="avg"></i>Average '+esc(f(avgM))+'</span></span></div>'+
      '<div class="cols ac">'+(avgM?'<span class="avgl" style="bottom:calc(18px + (100% - 34px) * '+(avgM/maxM).toFixed(4)+')" aria-hidden="true"></span>':'')+mlist.map((k,i)=>{const v=mvals[i],[yy,mm]=k.split("-"),span=mlist[0].slice(0,4)!==mlist[mlist.length-1].slice(0,4),lab=k===bigM||k===t0.slice(0,7);
        return '<div class="col'+(k===t0.slice(0,7)?" now":"")+'" tabindex="0" data-tt="'+esc(MONTHS[+mm-1]+" "+yy+": "+f(v))+'" data-month="'+k+'"><em class="num">'+(v&&lab?esc(compact(v,cur)):"")+'</em><span class="b"><i class="'+(past||k<t0.slice(0,7)?"past":"")+'" style="height:'+(v/maxM*100)+'%"></i></span><small>'+MONTHS[+mm-1].slice(0,3)+(span&&(i===0||mm==="01")?" ’"+yy.slice(2):"")+'</small></div>'}).join("")+'</div></div>'+
    '<div class="cards2">'+
      '<div class="card"><h3>By Category</h3>'+(cats.length?cats.map(([c,v])=>'<button type="button" class="hb" style="--cc:'+(c==="No Category"?"var(--mute)":catColor(c))+'" data-cat="'+esc(c==="No Category"?"-":c)+'" data-tt="'+esc(c+": "+f(v)+", "+pct(v))+'"><span class="nm2"><i></i>'+esc(c)+'</span><span class="track"><i style="width:'+Math.max(2,v/maxC*100)+'%"></i></span><span class="v num">'+esc(f(v))+'<small>'+pct(v)+'</small></span></button>').join("")+'<p class="note">Click a category to see its tasks.</p>':'<p class="note">No payments in this period.</p>')+'</div>'+
      '<div class="card"><h3>Coming Up, Next 30 Days</h3>'+(soon.length?'<ol class="an-soon">'+(()=>{let run=0;return soon.slice(0,12).map(x=>{run+=x.v;const dd=days(parse(x.d),today());
          return '<li data-id="'+esc(x.id)+'" tabindex="0"><span class="d num"><b>'+parse(x.d).getDate()+'</b><small>'+MONTHS[parse(x.d).getMonth()].slice(0,3)+'</small></span><span class="n"><b>'+esc(x.n)+'</b><small>'+(dd<=0?"Today or overdue":dd===1?"Tomorrow":"In "+dd+" days")+(x.cat?" · "+esc(x.cat):"")+'</small></span><span class="v num"><b>'+esc(f(x.v))+'</b><small>'+esc(f(run))+' so far</small></span></li>'}).join("")})()+'</ol>'+(soon.length>12?'<p class="note">And '+(soon.length-12)+' more.</p>':''):'<p class="note">Nothing with a price is due in the next 30 days.</p>')+'</div>'+
    '</div>'+
    '<div class="card an-rep" id="an-rep"><div class="an-h"><h3>Repeating Costs</h3><span class="count" style="margin:0">'+esc(f(repY/12))+' a month · '+esc(f(repY))+' a year</span></div>'+
      (reps.length?'<div class="an-tbl" role="table"><div class="r h" role="row"><span role="columnheader">Task</span><span role="columnheader">Repeats</span><span role="columnheader">Price</span><span role="columnheader">Per Month</span><span role="columnheader">Per Year</span><span role="columnheader">Share</span></div>'+
        reps.map(x=>'<div class="r" role="row" data-id="'+esc(x.t.id)+'" tabindex="0"><span role="cell" class="nm2"><i style="background:'+(x.t.cat?catColor(x.t.cat):"var(--mute)")+'"></i>'+esc(x.t.name)+'</span><span role="cell">'+esc(repLabel(x.t.repeat))+'</span><span role="cell" class="num">'+esc(money(x.t.price,cur))+'</span><span role="cell" class="num">'+esc(f(x.y/12))+'</span><span role="cell" class="num"><b>'+esc(f(x.y))+'</b></span><span role="cell"><span class="track" data-tt="'+esc(Math.round(x.y/repY*100)+"% of repeating costs")+'"><i style="width:'+Math.max(2,x.y/reps[0].y*100)+'%"></i></span></span></div>').join("")+'</div>'
        :'<p class="note">No active repeating tasks with a price in '+esc(cur)+'.</p>')+'</div>'+
    '<div class="cards2">'+
      '<div class="card"><h3>Online or Offline</h3><div class="split"><i style="width:'+(total?split.online/total*100:0)+'%;background:var(--on)"></i><i style="width:'+(total?split.offline/total*100:0)+'%;background:var(--off)"></i></div>'+
        '<div class="legend"><span><i style="background:var(--on)"></i>Online <b class="num">'+esc(f(split.online))+'</b> '+pct(split.online)+'</span><span><i style="background:var(--off)"></i>Offline <b class="num">'+esc(f(split.offline))+'</b> '+pct(split.offline)+'</span><span><i style="background:color-mix(in srgb,var(--fg) 20%,transparent)"></i>Not Set <b class="num">'+esc(f(split[""]))+'</b></span></div>'+
        '<h3 style="margin-top:20px">How Often</h3><div class="split">'+ofEntries.map(([k,v],i)=>'<i style="width:'+(total?v/total*100:0)+'%;background:'+ofCol(i)+'" data-tt="'+esc(k+": "+f(v))+'"></i>').join("")+'</div>'+
        '<div class="legend">'+ofEntries.map(([k,v],i)=>'<span><i style="background:'+ofCol(i)+'"></i>'+esc(k)+' <b class="num">'+esc(f(v))+'</b> '+pct(v)+'</span>').join("")+'</div></div>'+
      '<div class="card"><h3>Price Changes</h3>'+(changes.length?'<ul class="top5">'+changes.slice(0,8).map(c=>'<li data-id="'+esc(c.t.id)+'" tabindex="0"><span>'+esc(c.t.name)+' <small>'+esc(f(c.a))+' → '+esc(f(c.b))+'</small></span><b class="num chg '+(c.p>0?"up":"down")+'">'+(c.p>0?"▲ +":"▼ ")+c.p+'%</b></li>').join("")+'</ul>'
        :'<p class="note">No price has changed since you last marked a task done. When a renewal costs more than last time, it shows here.</p>')+'</div>'+
    '</div><p class="note">'+(past?"Last 12 Months counts what you marked Done, at the price recorded then.":"Repeating tasks count every date in the period; overdue tasks count once, as still to pay. Days before today count what you marked Done. Paused tasks are left out.")+'</p>';
  $("ap").onchange=e=>{V.anFocus="";setView("ap",e.target.value)};
  $("yrbtn").onclick=openYear;
  const ac=$("acur");if(ac)ac.onclick=e=>{const b=/** @type {any} */ (e.target).closest("[data-c]");if(b)setView("acur",b.dataset.c)};
  box.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{clearFilters();Object.assign(V,{view:"list",cat:b.dataset.cat,cur:cur===SET.currency?"":cur});keepView();drawFilters();render()});
  box.querySelectorAll(".an-tbl .r[data-id],.an-soon li[data-id],.top5 li[data-id]").forEach(r=>{const go=()=>{const t=find(r.dataset.id);if(t)openCard(t)};r.onclick=go;r.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();go()}}});
  box.querySelectorAll(".col[data-month]").forEach(c=>c.onclick=()=>{V.calV="month";V.calM=c.dataset.month;V.calSel="";setView("view","cal")});
  if(V.anFocus==="rep"){const r=$("an-rep");r.scrollIntoView({block:"start",behavior:"smooth"});r.classList.add("flash");setTimeout(()=>r.classList.remove("flash"),2200)}
}
/* a small tooltip for chart marks (data-tt) */
let ttEl=null;
function anTip(el,ev){
  if(!ttEl){ttEl=document.createElement("div");ttEl.className="antt";ttEl.setAttribute("role","tooltip");document.body.appendChild(ttEl)}
  ttEl.textContent=el.dataset.tt;ttEl.hidden=false;
  const r=el.getBoundingClientRect(),x=ev&&ev.clientX?ev.clientX:r.left+r.width/2,y=ev&&ev.clientY?ev.clientY:r.top;
  ttEl.style.left=Math.max(8,Math.min(innerWidth-ttEl.offsetWidth-8,x-ttEl.offsetWidth/2))+"px";ttEl.style.top=Math.max(8,y-ttEl.offsetHeight-12)+"px";
}
$("van").addEventListener("mousemove",e=>{const el=e.target.closest&&/** @type {any} */ (e.target).closest("[data-tt]");if(el)anTip(el,e);else if(ttEl)ttEl.hidden=true});
$("van").addEventListener("mouseleave",()=>{if(ttEl)ttEl.hidden=true});
$("van").addEventListener("focusin",e=>{const el=e.target.closest&&/** @type {any} */ (e.target).closest("[data-tt]");if(el)anTip(el);else if(ttEl)ttEl.hidden=true});

