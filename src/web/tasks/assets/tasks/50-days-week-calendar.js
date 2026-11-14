/* ---------- what falls on each day (for the week strip and Calendar) ---------- */
const weekStart=s=>addDays(s,-((parse(s).getDay()-WS()+7)%7));
const WDN=()=>WS()?["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
/** {day: [{t, d, st, occ} for tasks, {log, d, st:"done"} for what was marked done that day]} */
function dayItems(from,to){
  const on={},tm=x=>(x.t&&x.t.time)||"99";
  for(const t of T){
    if(t.status!=="active"||!matches(t))continue;
    dates(t,from,to).forEach(d=>(on[d]=on[d]||[]).push({t,d,st:d===t.due?stateOf(t,d):"up",occ:d!==t.due}));
  }
  const q=V.q.trim().toLowerCase();
  for(const e of LOG)if(e.k==="paid"&&e.d>=from&&e.d<=to&&(!q||(e.name+" "+e.cat).toLowerCase().includes(q))&&(!V.cat||(V.cat==="-"?!e.cat:e.cat===V.cat)))(on[e.d]=on[e.d]||[]).push({log:e,d:e.d,st:"done"});
  for(const d in on)on[d].sort((a,b)=>ST_ORDER[a.st]-ST_ORDER[b.st]||tm(a).localeCompare(tm(b))||itName(a).localeCompare(itName(b)));
  return on;
}
const itName=x=>x.t?x.t.name:x.log.name,itPrice=x=>x.t?x.t.price:x.log.p,itCur=x=>x.t?curOf(x.t):(x.log.cur||SET.currency),itCat=x=>x.t?x.t.cat:x.log.cat,itId=x=>x.t?x.t.id:(x.log.task||"");
/** what is still to pay on these items, by currency (done ones count as paid, not due) */
function dueMap(list){const m={};list.forEach(x=>{if(x.st!=="done"&&itPrice(x)!=null){const c=itCur(x);m[c]=(m[c]||0)+itPrice(x)}});return m}
function paidMap(list){const m={};list.forEach(x=>{if(x.st==="done"&&itPrice(x)!=null){const c=itCur(x);m[c]=(m[c]||0)+itPrice(x)}});return m}
function compactMap(m){const ks=Object.keys(m).filter(c=>m[c]).sort((a,b)=>a===SET.currency?-1:b===SET.currency?1:a.localeCompare(b));return ks.length?compact(m[ks[0]],ks[0])+(ks.length>1?" +":""):""}
const tShort=hm=>{if(!hm)return"";const[h,m]=hm.split(":").map(Number);return(h%12||12)+(m?":"+pad(m):"")+(h<12?"am":"pm")};
const itTip=x=>itName(x)+(itPrice(x)!=null?", "+money(itPrice(x),itCur(x)):"")+(x.t&&x.t.time?", "+t12(x.t.time):"")+(x.st==="done"?" (Done)":x.st==="late"?" (Overdue)":x.occ?" (Later Date)":"");
const ccOf=x=>itCat(x)?catColor(itCat(x)):"var(--mute)";

/* ---------- week strip above the list: one week, a click shows that day's tasks ---------- */
function drawStrip(){
  const box=$("cal");box.hidden=!V.cal;$("calbtn").setAttribute("aria-pressed",String(V.cal));
  if(!V.cal)return;
  const t0=todayS(),off=V.wk|0,from=addDays(t0,7*off),to=addDays(from,6),on=dayItems(from,to),all=[];
  for(let i=0;i<7;i++)all.push(...(on[addDays(from,i)]||[]));
  const open=all.filter(x=>x.st!=="done"),tot=sums(dueMap(all));
  const label=off===0?"This Week":off===1?"Next Week":off===-1?"Last Week":fmtD(from,{day:"numeric",month:"short"})+" – "+fmtD(to,{day:"numeric",month:"short"});
  box.innerHTML='<div class="wkh"><b>'+label+'</b><small class="num">'+(open.length?open.length+(open.length===1?" Task":" Tasks")+(tot?" · "+esc(tot):""):"Nothing due")+'</small>'+
    (off?'<button type="button" class="btn" data-wk="0">Today</button>':'')+
    '<button type="button" class="ib" data-wk="-1" aria-label="Previous Week">'+SVG(IC.prev,"")+'</button><button type="button" class="ib" data-wk="1" aria-label="Next Week">'+SVG(IC.next,"")+'</button>'+
    '</div>'+
    '<div class="wkg">'+[0,1,2,3,4,5,6].map(i=>{
      const d=addDays(from,i),it=on[d]||[],m=compactMap(dueMap(it));
      return '<button type="button" class="wkd'+(d===t0?" today":"")+(d<t0?" past":"")+'" data-day="'+d+'" aria-pressed="'+(V.day===d)+'" title="'+esc(fmtD(d,{weekday:"long",day:"numeric",month:"long"}))+(it.length?", "+it.length+(it.length===1?" task":" tasks"):"")+'">'+
        '<span class="w">'+(d===t0?"Today":parse(d).toLocaleDateString("en-US",{weekday:"short"}))+'</span><span class="n"><span class="num">'+(+d.slice(8))+'</span>'+(m?'<small class="num">'+esc(m)+'</small>':'')+'</span>'+
        it.slice(0,2).map(x=>'<span class="nl s-'+x.st+'" style="--cc:'+ccOf(x)+(x.st==="up"?";--pc:"+ccOf(x):"")+'" title="'+esc(itTip(x))+'">'+esc(itName(x))+'</span>').join("")+
        (it.length>2?'<span class="mr">+'+(it.length-2)+' More</span>':'')+
        (it.length?'<span class="dots">'+it.slice(0,4).map(x=>'<i class="s-'+x.st+'"'+(x.st==="up"?' style="--pc:'+ccOf(x)+'"':'')+'></i>').join("")+'</span>':'')+'</button>';
    }).join("")+'</div>';
}
$("cal").onclick=e=>{
  const w=/** @type {any} */ (e.target).closest("[data-wk]");
  if(w){V.wk=w.dataset.wk==="0"?0:(V.wk|0)+(+w.dataset.wk);drawStrip();return}
  const d=/** @type {any} */ (e.target).closest("[data-day]");if(!d)return;
  V.day=V.day===d.dataset.day?"":d.dataset.day;render();
  if(V.day)$("range").scrollIntoView({block:"nearest",behavior:"smooth"});
};
$("calbtn").onclick=()=>{V.cal=!V.cal;keepView();render()};
$("vsw").onclick=e=>{const b=/** @type {any} */ (e.target).closest("[data-v]");if(b&&b.dataset.v!==V.view)setView("view",b.dataset.v)};

/* ---------- Calendar: a month, a week or the whole year; the chosen day on the right ---------- */
const calBase=()=>/^\d{4}-\d{2}$/.test(V.calM)?V.calM:todayS().slice(0,7);
