/* ---------- dates and repeats ---------- */
// (1.72.0) more repeats: weekly on chosen weekdays (wd: 0 Sunday .. 6 Saturday), monthly on the last day (on "last") or the nth weekday
// (on "nth", nth 1..4 or -1 = the last, dow). The server works the next date out the same way (tasks/lib.php tasks_next_date).
const DOW=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],ORD={"-1":"Last",1:"1st",2:"2nd",3:"3rd",4:"4th"};
function nthWeekday(y,m,nth,dow){const dm=dim(y,m);if(nth<0){const last=new Date(y,m,dm,12).getDay();return dm-((last-dow+7)%7)}const first=new Date(y,m,1,12).getDay();return Math.min(dm,1+((dow-first+7)%7)+7*(nth-1))}
function nextDate(s,rep,day){
  const d=parse(s),n=Math.max(1,rep.n|0);
  if(rep.unit==="day"){d.setDate(d.getDate()+n);return ymd(d)}
  if(rep.unit==="week"&&Array.isArray(rep.wd)&&rep.wd.length){
    const mon=new Date(d);mon.setDate(d.getDate()-((d.getDay()+6)%7));
    for(let i=1;i<=7*n+7;i++){const c=new Date(d);c.setDate(d.getDate()+i);const cm=new Date(c);cm.setDate(c.getDate()-((c.getDay()+6)%7));
      if(rep.wd.includes(c.getDay())&&Math.round((+cm-+mon)/604800000)%n===0)return ymd(c)}
  }
  if(rep.unit==="week"){d.setDate(d.getDate()+7*n);return ymd(d)}
  if(rep.unit==="month"&&(rep.on==="last"||rep.on==="nth")){
    let y=d.getFullYear(),m=d.getMonth()+n;y+=Math.floor(m/12);m=((m%12)+12)%12;
    return ymd(new Date(y,m,rep.on==="last"?dim(y,m):nthWeekday(y,m,rep.nth,rep.dow),12));
  }
  if(rep.unit==="month"||rep.unit==="year"){
    let y=d.getFullYear(),m=d.getMonth()+(rep.unit==="month"?n:0);
    if(rep.unit==="year")y+=n;
    y+=Math.floor(m/12);m=((m%12)+12)%12;
    return ymd(new Date(y,m,Math.min(day||d.getDate(),dim(y,m)),12));
  }
  return s;
}
function dates(t,from,to){
  const out=[];let s=t.due,guard=0;
  if(t.repeat.unit==="none")return s>=from&&s<=to?[s]:[];
  while(s<=to&&guard++<3000){if(s>=from)out.push(s);if(out.length>=400)break;s=nextDate(s,t.repeat,t.day)}
  return out;
}
function repLabel(r){
  const n=r.n|0||1,u=r.unit;
  if(u==="none")return"One-Time";
  if(u==="week"&&Array.isArray(r.wd)&&r.wd.length){
    if(n===1&&r.wd.join()==="1,2,3,4,5")return"Every Weekday";
    const nm=r.wd.map(x=>DOW[x].slice(0,3)),list=nm.length>1?nm.slice(0,-1).join(", ")+" and "+nm[nm.length-1]:nm[0];
    return(n===1?"Every ":"Every "+n+" Weeks on ")+list;
  }
  if(u==="month"&&(r.on==="last"||r.on==="nth"))return(n===1?"Monthly":n===3?"Quarterly":"Every "+n+" Months")+" on the "+(r.on==="last"?"Last Day":ORD[r.nth]+" "+DOW[r.dow]);
  if(n===1)return{day:"Daily",week:"Weekly",month:"Monthly",year:"Yearly"}[u];
  if(u==="month"&&n===3)return"Quarterly";
  return"Every "+n+" "+u[0].toUpperCase()+u.slice(1)+"s";
}
function repKind(r){
  if(r.unit==="none")return"none";
  if(r.unit==="month"&&[1,3,6].includes(r.n))return"m"+r.n;
  if((r.unit==="day"||r.unit==="week"||r.unit==="year")&&r.n===1)return r.unit;
  return"other";
}
const perYear=r=>({day:365,week:52.18,month:12,year:1}[r.unit]||0)*(r.unit==="week"&&Array.isArray(r.wd)&&r.wd.length?r.wd.length:1)/(r.n||1);
const lead=t=>t.remind>=0?t.remind:SET.soon;
const REMIND={"-1":"Page Default","0":"On the Day","1":"1 Day Before","3":"3 Days Before","7":"1 Week Before","14":"2 Weeks Before","30":"1 Month Before","60":"2 Months Before"};
/** late | today | soon | up | paused | done. A task due today whose time has passed is overdue. */
function stateOf(t,date){
  if(t.status==="done")return"done";
  if(t.status==="paused")return"paused";
  const n=nowTz(),d=days(parse(date||t.due),parse(n.d));
  if(d<0)return"late";
  if(d===0)return(t.time&&t.time<=n.t&&(!date||date===t.due))?"late":"today";
  return d<=lead(t)?"soon":"up";
}
function whenText(st,date,t){
  const d=days(parse(date),today());
  if(st==="done")return"Done";
  if(st==="paused")return"Paused";
  if(d===0)return st==="late"?"Overdue Since "+t12(t.time):"Due Today";
  if(d===1)return"Tomorrow";
  if(d===-1)return"1 Day Overdue";
  if(d<0)return(-d)+" Days Overdue";
  if(d<45)return"In "+d+" Days";
  const m=Math.round(d/30.4);return m<18?"In "+m+" Months":"In "+Math.round(d/365)+" Years";
}
/** each category keeps one of eight colors */
function catColor(c){let h=0;for(const ch of String(c).toLowerCase())h=(h*31+ch.codePointAt(0))>>>0;return"var(--c"+(h%8)+")"}

/* ---------- money: every task can have its own currency ---------- */
const CURS=[["INR","Indian Rupee (₹)"],["USD","US Dollar ($)"],["EUR","Euro (€)"],["GBP","British Pound (£)"],["AED","UAE Dirham"],["SGD","Singapore Dollar"],["AUD","Australian Dollar"],["CAD","Canadian Dollar"],["JPY","Japanese Yen (¥)"],["CHF","Swiss Franc"],["CNY","Chinese Yuan"],["THB","Thai Baht"],["MYR","Malaysian Ringgit"],["SAR","Saudi Riyal"],["NZD","New Zealand Dollar"]];
const curOf=t=>t.cur||SET.currency||"";
const NF={};
function money(v,cur){
  if(v==null||v==="")return"";
  cur=cur??SET.currency;
  const frac=Math.abs(v%1)>0.004?2:0,k=cur+"|"+frac;   // 1,200 but 12.50
  if(!NF[k]){try{NF[k]=cur?new Intl.NumberFormat(cur==="INR"?"en-IN":"en-US",{style:"currency",currency:cur,maximumFractionDigits:frac,minimumFractionDigits:frac}):new Intl.NumberFormat("en-IN",{maximumFractionDigits:frac,minimumFractionDigits:frac})}catch(e){NF[k]=new Intl.NumberFormat("en-IN",{maximumFractionDigits:2})}}
  return NF[k].format(v);
}
/** {INR: 1200, USD: 30} -> ["₹1,200", "$30"] (the page currency first) */
function sumList(map){
  return Object.keys(map).filter(c=>map[c]).sort((a,b)=>(a===SET.currency?-1:b===SET.currency?1:a.localeCompare(b))).map(c=>money(Math.round(map[c]*100)/100,c));
}
const sums=map=>sumList(map).join(" + ");
const addTo=(map,t,v)=>{if(v){const c=curOf(t);map[c]=(map[c]||0)+v}};

