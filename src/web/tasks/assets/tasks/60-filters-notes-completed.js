/* ---------- range tabs, filter chips, filters ---------- */
const RANGES=[["all","Tasks"],["week","This Week"],["month","This Month"],["year","This Year"]];
function drawRanges(){
  $("range").innerHTML=RANGES.map(r=>'<button type="button" data-r="'+r[0]+'" aria-pressed="'+(V.range===r[0]&&!V.day)+'">'+r[1]+'<small class="num">'+rowsFor(r[0]).length+'</small></button>').join("");
}
function drawChips(){
  const c=[];
  if(V.day)c.push(["day",fmtD(V.day,{weekday:"short",day:"numeric",month:"short"})]);
  if(V.st)c.push(["st",{late:"Only Overdue",soon:"Only Due Soon",paused:"Only Paused"}[V.st]]);
  if(V.year)c.push(["year","Year "+V.year]);
  if(V.month)c.push(["month",MONTHS[+V.month-1]]);
  if(V.cat)c.push(["cat",V.cat==="-"?"No Category":V.cat]);
  if(V.rep)c.push(["rep",$("frep").selectedOptions[0]?.textContent||V.rep]);
  if(V.cur)c.push(["cur",V.cur]);
  if(V.price)c.push(["price",V.price==="paid"?"Has a Price":"No Price"]);
  if(V.where)c.push(["where",V.where==="online"?"Online":"Offline"]);
  if(V.q.trim())c.push(["q","“"+V.q.trim()+"”"]);
  $("chips").innerHTML=c.map(x=>'<button type="button" class="chip" data-rm="'+x[0]+'" aria-label="Remove filter: '+esc(x[1])+'">'+esc(x[1])+SVG(IC.x,"")+'</button>').join("")+
    (c.length>1?'<button type="button" class="clear" data-rm="*">Clear All</button>':"");
  const n=["st","year","month","cat","rep","cur","price"].filter(k=>V[k]).length+Number(V.group!=="smart");
  $("fdot").textContent=n?" ("+n+")":"";
}
function drawFilters(){
  const years=new Set(),y0=today().getFullYear();
  for(const t of T){years.add(t.due.slice(0,4));if(t.repeat.unit!=="none"&&t.status==="active"){years.add(String(y0));years.add(String(y0+1))}}
  if(V.year)years.add(V.year);
  $("fyear").innerHTML='<option value="">Any Year</option>'+[...years].sort().map(y=>'<option'+(V.year===y?" selected":"")+'>'+y+'</option>').join("");
  $("fmonth").innerHTML='<option value="">Any Month</option>'+MONTHS.map((m,i)=>'<option value="'+pad(i+1)+'"'+(V.month===pad(i+1)?" selected":"")+'>'+m+'</option>').join("");
  const cats=[...new Set(T.map(t=>t.cat).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  if(V.cat&&V.cat!=="-"&&!cats.includes(V.cat))V.cat="";
  $("fcat").innerHTML='<option value="">Any Category</option>'+cats.map(c=>'<option value="'+esc(c)+'"'+(V.cat===c?" selected":"")+'>'+esc(c)+'</option>').join("")+'<option value="-"'+(V.cat==="-"?" selected":"")+'>No Category</option>';
  const curs=[...new Set(T.map(curOf).filter(Boolean))].sort();
  $("fcur").innerHTML='<option value="">Any Currency</option>'+curs.map(c=>'<option'+(V.cur===c?" selected":"")+'>'+c+'</option>').join("");
  const SUGG=["Subscription","Insurance","Bill","Domain","Hosting","Card Fee","Tax","Loan","Rent","Health","Vehicle","Membership","Warranty","Document"];
  $("cats").innerHTML=[...new Set([...cats,...SUGG])].map(c=>'<option value="'+esc(c)+'">').join("");
  $("fst").value=V.st;$("frep").value=V.rep;$("fprice").value=V.price;$("fsort").value=V.sort;$("fgroup").value=V.group;$("q").value=V.q;$("qx").hidden=!V.q;
  document.querySelectorAll("#where button").forEach((/** @type {HTMLElement} */ b)=>b.setAttribute("aria-pressed",String(b.dataset.w===V.where)));
}
function setView(k,v){V[k]=v;keepView();drawFilters();render()}
$("views").onclick=e=>{const b=/** @type {any} */ (e.target).closest("[data-view]");if(b){V.anFocus="";setView("view",b.dataset.view)}};
$("range").onclick=e=>{const b=/** @type {any} */ (e.target).closest("[data-r]");if(b){V.day="";setView("range",b.dataset.r)}};
$("where").onclick=e=>{const b=/** @type {any} */ (e.target).closest("[data-w]");if(b)setView("where",b.dataset.w)};
$("q").oninput=e=>{V.q=e.target.value;$("qx").hidden=!V.q;render()};
$("qx").onclick=()=>{V.q="";$("q").value="";$("qx").hidden=true;render();$("q").focus()};
[["fst","st"],["fyear","year"],["fmonth","month"],["fcat","cat"],["frep","rep"],["fcur","cur"],["fprice","price"],["fsort","sort"],["fgroup","group"]].forEach(([id,k])=>$(id).onchange=e=>setView(k,e.target.value));
$("fbtn").onclick=()=>{const f=$("filters"),open=f.hidden;f.hidden=!open;$("fbtn").setAttribute("aria-expanded",String(open))};
const clearFilters=()=>Object.assign(V,{range:"all",st:"",year:"",month:"",cat:"",rep:"",cur:"",price:"",where:"",q:"",day:""});
$("chips").onclick=e=>{
  const b=/** @type {any} */ (e.target).closest("[data-rm]");if(!b)return;
  if(b.dataset.rm==="*")clearFilters();else V[b.dataset.rm]="";
  keepView();drawFilters();render();
};

/* ---------- notes on hover ---------- */
let tipEl=null;
function showTip(el){
  const t=find(el.dataset.tip);if(!t||!t.notes)return;
  hideTip();tipEl=document.createElement("div");tipEl.className="tip";tipEl.setAttribute("role","tooltip");
  tipEl.innerHTML='<b>Notes</b>'+esc(t.notes.length>700?t.notes.slice(0,700)+"…":t.notes);
  document.body.appendChild(tipEl);
  const r=el.getBoundingClientRect(),w=tipEl.offsetWidth,h=tipEl.offsetHeight;
  tipEl.style.left=Math.max(10,Math.min(innerWidth-w-10,r.left))+"px";
  tipEl.style.top=(r.bottom+h+10>innerHeight?r.top-h-8:r.bottom+8)+"px";
}
function hideTip(){if(tipEl){tipEl.remove();tipEl=null}}
document.addEventListener("mouseover",e=>{const n=/** @type {any} */ (e.target).closest("[data-tip]");if(n)showTip(n)});
document.addEventListener("mouseout",e=>{const n=/** @type {any} */ (e.target).closest("[data-tip]");if(n&&!n.contains(e.relatedTarget))hideTip()});
document.addEventListener("focusin",e=>{const n=/** @type {any} */ (e.target).closest("[data-tip]");if(n)showTip(n);else hideTip()});
addEventListener("scroll",hideTip,{passive:true});

/* ---------- completed: the last 500 things you marked done or skipped ---------- */
function drawDone(){
  const q=V.dq.trim().toLowerCase(),years=[...new Set(LOG.map(e=>tsDay(e.t).slice(0,4)))].sort().reverse();
  if(V.dyear&&!years.includes(V.dyear))V.dyear="";
  $("dyear").innerHTML='<option value="">Any Year</option>'+years.map(y=>'<option'+(V.dyear===y?" selected":"")+'>'+y+'</option>').join("");
  document.querySelectorAll("#dkind button").forEach((/** @type {HTMLElement} */ b)=>b.setAttribute("aria-pressed",String(b.dataset.k===V.dk)));
  const rows=LOG.filter(e=>(!V.dk||e.k===V.dk)&&(!V.dyear||tsDay(e.t).startsWith(V.dyear))&&(!q||(e.name+" "+e.cat).toLowerCase().includes(q))).slice().sort((a,b)=>b.t-a.t);
  if(!LOG.length){$("dcount").textContent="";$("dlist").innerHTML='<div class="empty"><h2>Nothing Completed Yet</h2><p>When you mark a task done (or skip a date), it shows up here with the date and price. The last 500 are kept.</p></div>';return}
  const paid={};rows.forEach(e=>{if(e.k==="paid"&&e.p!=null){const c=e.cur||SET.currency;paid[c]=(paid[c]||0)+e.p}});
  $("dcount").textContent=rows.length+(rows.length===1?" Entry":" Entries")+(sums(paid)?", "+sums(paid)+" Paid":"")+(LOG.length>=LOG_MAX?". Only the last "+LOG_MAX+" are kept.":"");
  if(!rows.length){$("dlist").innerHTML='<div class="empty"><h2>Nothing Matches</h2><p>No completed entry fits these filters.</p></div>';return}
  const groups=new Map();
  for(const e of rows){const k=tsDay(e.t).slice(0,7);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(e)}
  $("dlist").innerHTML=[...groups].map(([k,g])=>{
    const m={};g.forEach(e=>{if(e.k==="paid"&&e.p!=null){const c=e.cur||SET.currency;m[c]=(m[c]||0)+e.p}});
    return '<h2 class="gh">'+MONTHS[+k.slice(5)-1]+' '+k.slice(0,4)+'<small class="num">'+g.length+(g.length===1?" Entry":" Entries")+(sums(m)?", "+esc(sums(m))+" Paid":"")+'</small></h2>'+g.map(e=>{
      const d=parse(tsDay(e.t)),live=find(e.task);
      return '<div class="crow'+(e.k==="skip"?" skip":"")+'" data-log="'+esc(e.id)+'"'+(live?' role="button" tabindex="0" style="cursor:pointer" aria-label="Open '+esc(e.name)+'"':'')+'>'+
        '<div class="dt num"><b>'+d.getDate()+'</b><small>'+d.toLocaleDateString(LOC(),{month:"short"})+'</small></div>'+
        '<div class="nm"><b>'+esc(e.name)+'</b><span class="tags"><span class="badge'+(e.k==="skip"?" skip":"")+'">'+(e.k==="skip"?"Skipped":"Done")+'</span>'+
          (e.cat?'<span class="tag cat" style="--cc:'+catColor(e.cat)+'">'+esc(e.cat)+'</span>':"")+
          (e.mode==="online"?'<span class="tag on">'+SVG(IC.globe,"")+'Online</span>':e.mode==="offline"?'<span class="tag off">'+SVG(IC.shop,"")+'Offline</span>':"")+'</span></div>'+
        '<div class="cov">Due '+esc(fmtD(e.d))+'</div>'+
        '<div class="amt num'+(e.p==null?" none":"")+'">'+(e.p==null?"—":esc(money(e.p,e.cur||SET.currency)))+'</div>'+
        '<div class="act"><button type="button" class="ib" data-a="lmore" aria-label="More for '+esc(e.name)+'" title="More">'+SVG(IC.dots,"")+'</button></div></div>';
    }).join("");
  }).join("");
}
$("dq").oninput=e=>{V.dq=e.target.value;drawDone()};
$("dkind").onclick=e=>{const b=/** @type {any} */ (e.target).closest("[data-k]");if(b)setView("dk",b.dataset.k)};
$("dyear").onchange=e=>setView("dyear",e.target.value);
$("dlist").onclick=e=>{
  const row=/** @type {any} */ (e.target).closest("[data-log]");if(!row)return;
  const en=LOG.find(x=>x.id===row.dataset.log);if(!en)return;
  const b=/** @type {any} */ (e.target).closest("[data-a]");
  if(!b){const t=find(en.task);if(t)openCard(t);return}
  const t=find(en.task);
  menu(b,[t?["open","Open Task",IC.open]:null,"-",["del","Delete This Entry",IC.trash,"danger"]],k=>{
    if(k==="open")openCard(t);
    if(k==="del")withUndo("Entry Deleted.",()=>{LOG=LOG.filter(x=>x!==en)});
  });
};
$("dlist").onkeydown=e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches("[data-log]")){e.preventDefault();e.target.click()}};

