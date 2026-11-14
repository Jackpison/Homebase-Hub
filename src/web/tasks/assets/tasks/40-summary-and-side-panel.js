/* ---------- summary strip ---------- */
/* ---------- side panel: smart lists and spending ---------- */
const TI={today:"M4 6h16v15H4zM4 10h16M8 3v4M16 3v4M12 14v3",late:"M12 8v5M12 17h.01M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  week:"M4 6h16v15H4zM4 10h16M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01",month:"M4 6h16v15H4zM4 10h16M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01",
  all:"M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",paused:"M8 5v14M16 5v14"};
function drawStats(){
  const t0=todayS(),we=weekEnd(t0),me=monthEnd(t0),ye=addDays(t0,364);
  /** @type {any} */
  const s={late:[0,{}],today:[0,{}],week:[0,{}],month:[0,{}],year:[0,{}],paused:[0,{}]},mon={};let all=0;
  for(const t of T){
    if(t.status==="done")continue;all++;const p=t.price||0;
    if(t.status==="paused"){s.paused[0]++;addTo(s.paused[1],t,p);continue}
    const st=stateOf(t);
    if(st==="late"){s.late[0]++;addTo(s.late[1],t,p);s.year[0]++;addTo(s.year[1],t,p)}
    for(const d of dates(t,t0,ye)){
      if(d===t.due&&st==="late")continue;
      s.year[0]++;addTo(s.year[1],t,p);
      if(d===t0){s.today[0]++;addTo(s.today[1],t,p)}
      if(d<=me){s.month[0]++;addTo(s.month[1],t,p)}
      if(d<=we){s.week[0]++;addTo(s.week[1],t,p)}
    }
    if(t.repeat.unit!=="none")addTo(mon,t,p*perYear(t.repeat)/12);
  }
  for(const c in mon)mon[c]=Math.round(mon[c]);
  const lv=V.view==="list",plain=lv&&!V.st&&!V.day&&!V.cat;
  const row=(k,label,n,map,on)=>{const l=sumList(map);
    return '<button type="button" class="srow k-'+k+(n?"":" zero")+'" data-s="'+k+'" aria-pressed="'+on+'" title="'+esc(label+": "+n+(l.length?", "+l.join(" + "):""))+'"><i class="ico">'+SVG(TI[k],"")+'</i>'+
      '<span class="sl">'+label+'</span>'+(k!=="all"&&n&&l[0]?'<em class="tmoney num">'+esc(l[0])+(l.length>1?" +":"")+'</em>':'')+'<b class="n num">'+n+'</b></button>'};
  const lm=sumList(mon),ly=sumList(s.year[1]);
  const money2=(k,label,icon,val,on,tip)=>'<button type="button" class="srow spend2 k-'+k+(val?"":" zero")+'" data-s="'+k+'" aria-pressed="'+on+'" title="'+esc(tip)+'"><i class="ico">'+SVG(icon,"")+'</i><span class="sl">'+label+'</span><b class="v num">'+esc(val||"None")+'</b></button>';
  $("stats").innerHTML='<h3 class="slh"><span>Smart Lists</span></h3>'+
    row("all","Tasks",all,{},plain&&V.range==="all"&&!V.year&&!V.month)+
    row("today","Today",s.today[0],s.today[1],lv&&V.day===t0)+
    row("late","Overdue",s.late[0],s.late[1],lv&&V.st==="late")+
    row("week","This Week",s.week[0],s.week[1],plain&&V.range==="week")+
    row("month","This Month",s.month[0],s.month[1],plain&&V.range==="month")+
    row("paused","Paused",s.paused[0],s.paused[1],lv&&V.st==="paused")+
    (SET.stats!==false?'<h3 class="slh spend2"><span>Spending</span></h3>'+
      money2("year","Next 12 Months","M4 20V10M10 20V4M16 20v-7M22 20H2",ly.length?ly[0]+(ly.length>1?" +":""):"",V.view==="an"&&V.ap==="n365"&&V.anFocus!=="rep","Everything due in the next 12 months. Opens Analytics.")+
      money2("rep","Repeating","M17 2l4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3",lm.length?lm[0]+" / Mo":"",V.view==="an"&&V.anFocus==="rep","Repeating tasks, averaged per month. Opens their list in Analytics."):"");
  // counts beside Tasks and Completed (done this month)
  const ms=t0.slice(0,7),dm=LOG.filter(e=>tsDay(e.t).startsWith(ms)).length;
  $("nv-list").textContent=all||"";$("nv-done").textContent=dm||"";
  $("nv-done").title=dm?dm+" this month":"";
}
$("stats").onclick=e=>{
  const b=/** @type {any} */ (e.target).closest("[data-s]");if(!b)return;const k=b.dataset.s,t0=todayS();
  if(k==="year")Object.assign(V,{view:"an",ap:"n365",anFocus:""});
  else if(k==="rep"){Object.assign(V,{view:"an",anFocus:"rep"});keepView();drawFilters();render();return}
  else{
    Object.assign(V,{view:"list",cat:""});
    if(k==="today")Object.assign(V,{range:"all",st:"",day:V.day===t0?"":t0});
    else if(k==="late")Object.assign(V,{range:"all",day:"",st:V.st==="late"?"":"late"});
    else if(k==="paused")Object.assign(V,{range:"all",day:"",st:V.st==="paused"?"":"paused"});
    else if(k==="week"||k==="month")Object.assign(V,{st:"",day:"",range:V.range===k?"all":k});
    else if(k==="all")clearFilters();
  }
  keepView();drawFilters();render();
};
/* the big title above the list follows what is selected */
function drawHead(rows){
  let k="all",title="Tasks";
  if(V.view==="an"){k="an";title="Analytics"}
  else if(V.view==="cal"){k="cal";title="Calendar"}
  else if(V.view==="done"){k="done";title="Completed"}
  else if(V.day){k=V.day===todayS()?"today":"day";title=V.day===todayS()?"Today":fmtD(V.day,{weekday:"long",day:"numeric",month:"long"})}
  else if(V.st==="late"){k="late";title="Overdue"}
  else if(V.st==="paused"){k="paused";title="Paused"}
  else if(V.st==="soon"){k="week";title="Due Soon"}
  else if(V.cat){k="cat";title=V.cat==="-"?"No Category":V.cat}
  else if(V.range!=="all"){k=V.range;title={week:"This Week",month:"This Month",year:"This Year"}[V.range]}
  const h=$("ttl");h.textContent=title;h.dataset.k=k;
  if(V.view==="cal")return;   // drawCalView writes the line under the title
  if(V.view!=="list"){$("tsub").textContent="";return}
  const m={};rows.forEach(r=>addTo(m,r.t,r.t.price||0));
  $("tsub").textContent=rows.length+(rows.length===1?" Task":" Tasks")+(sums(m)&&SET.stats!==false?" · "+sums(m):"");
}
/* quick add: "Netflix 649 monthly 5 Nov 9pm" -> name, price, repeat, date and time */
function parseQuick(src,base){
  let s=" "+String(src).trim().replace(/\s+/g," ")+" ";
  const t={repeat:{n:1,unit:"none"},cur:"",price:null,time:"",due:""};
  const take=re=>{const m=s.match(re);if(m)s=s.replace(m[0]," ");return m};
  const t0=todayS(),mon="jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december";
  const MI=x=>"jan feb mar apr may jun jul aug sep oct nov dec".split(" ").indexOf(x.slice(0,3).toLowerCase());
  let m,due="";
  if(m=take(/\s(?:every\s+)?weekdays?\s/i))t.repeat={n:1,unit:"week",wd:[1,2,3,4,5]};   // (1.72.0) "weekdays" or "every weekday"
  else if(m=take(/\severy\s+(\d{1,2})\s+(day|week|month|year)s?\s/i))t.repeat={n:Math.max(1,+m[1]),unit:m[2].toLowerCase()};
  else if(m=take(/\s(daily|weekly|monthly|quarterly|yearly|annually|annual|every\s+(?:day|week|month|year))\s/i)){
    const w=m[1].toLowerCase().replace(/\s+/g," ");
    t.repeat={n:w==="quarterly"?3:1,unit:{daily:"day",weekly:"week",monthly:"month",quarterly:"month",yearly:"year",annually:"year",annual:"year"}[w]||w.slice(6)};
  }
  if(m=take(/\s(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s/i))t.time=pad((+m[1])%12+(m[3].toLowerCase()==="pm"?12:0))+":"+pad(+(m[2]||0));
  else if(m=take(/\s(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\s/))t.time=pad(+m[1])+":"+m[2];
  if(m=take(/\s(today|tomorrow)\s/i))due=m[1].toLowerCase()==="today"?t0:addDays(t0,1);
  else if(m=take(/\sin\s+(\d{1,3})\s+(day|week|month)s?\s/i)){const n=+m[1],u=m[2].toLowerCase();due=u==="day"?addDays(t0,n):u==="week"?addDays(t0,7*n):nextDate(t0,{n,unit:"month"},+t0.slice(8))}
  else if(m=take(/\s(\d{4})-(\d{2})-(\d{2})\s/)){const d=m[1]+"-"+m[2]+"-"+m[3];due=ymd(parse(d))===d?d:""}
  else if(m=take(new RegExp("\\s(\\d{1,2})(?:st|nd|rd|th)?\\s+("+mon+")\\.?(?:\\s+(\\d{4}))?\\s","i"))||take(new RegExp("\\s("+mon+")\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\s","i"))){
    const a=/^\d/.test(m[1]),dd=+(a?m[1]:m[2]),mm=MI(a?m[2]:m[1]),y=+(m[3]||t0.slice(0,4));
    let d=y+"-"+pad(mm+1)+"-"+pad(dd);
    if(!m[3]&&d<t0)d=(y+1)+"-"+pad(mm+1)+"-"+pad(dd);
    due=ymd(parse(d))===d?d:"";
  }
  else if(m=take(/\s(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s/)){   // 5/11 = 5 November (day first)
    const y=m[3]?(m[3].length===2?"20"+m[3]:m[3]):t0.slice(0,4);let d=y+"-"+pad(+m[2])+"-"+pad(+m[1]);
    if(!m[3]&&d<t0)d=(+y+1)+"-"+pad(+m[2])+"-"+pad(+m[1]);
    due=ymd(parse(d))===d?d:"";
  }
  else if(m=take(/\s(?:next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s/i)){
    const want=["sunday","monday","tuesday","wednesday","thursday","friday","saturday"].indexOf(m[1].toLowerCase());
    due=addDays(t0,((want-parse(t0).getDay()+7)%7)||7);
  }
  if(m=take(/\s(₹|rs\.?\s?|inr\s?|\$|usd\s?|€|eur\s?|£|gbp\s?)?(\d[\d,]*(?:\.\d{1,2})?)(?:\s?(rs|inr|usd|eur|gbp|rupees|dollars))?\s/i)){
    const c=((m[1]||"")+(m[3]||"")).trim().toLowerCase();
    t.cur=/\$|usd|dollar/.test(c)?"USD":/€|eur/.test(c)?"EUR":/£|gbp/.test(c)?"GBP":"";
    t.price=Math.round(parseFloat(m[2].replace(/,/g,""))*100)/100;
  }
  const name=s.trim().replace(/\s+/g," ");
  t.name=name?name.charAt(0).toUpperCase()+name.slice(1):"";
  t.due=due||base||V.day||t0;
  return t;
}
function quickAdd(inp,base){
  const p=parseQuick(inp.value,base);
  if(!p.name){inp.focus();return}
  const n=now(),t={id:uid(),name:p.name.slice(0,120),due:p.due,time:p.time,repeat:p.repeat,price:p.price,cur:p.cur,mode:"",cat:V.cat&&V.cat!=="-"?V.cat:"",remind:-1,url:"",notes:"",updated:n,
    day:+p.due.slice(8,10),pay:"",auto:false,status:"active",created:n,doneAt:0,history:[]};
  T.push(t);inp.value="";touch();
  snack('"'+t.name+'" Added for '+fmtD(t.due)+".",()=>{T=T.filter(x=>x!==t);touch()});
}
$("qaf").onsubmit=e=>{e.preventDefault();quickAdd($("qadd"),V.view==="cal"?V.calSel||todayS():"")};

