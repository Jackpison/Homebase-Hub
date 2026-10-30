/*! Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
"use strict";
/* ---------- helpers ---------- */
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const HF=(u,o)=>window.HUB?HUB.fetch(u,o):fetch(u,o);
const toast=m=>window.HUB?HUB.toast(m):alert(m);
const uid=()=>{const a=new Uint8Array(5);crypto.getRandomValues(a);return [...a].map(b=>b.toString(16).padStart(2,"0")).join("")};
const pad=n=>String(n).padStart(2,"0");
const ymd=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const parse=s=>{const[y,m,d]=String(s).split("-").map(Number);return new Date(y,(m||1)-1,d||1,12)};
const days=(a,b)=>Math.round((a-b)/864e5);
const dim=(y,m)=>new Date(y,m+1,0).getDate();
const addDays=(s,n)=>{const d=parse(s);d.setDate(d.getDate()+n);return ymd(d)};
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const SVG=(p,c)=>'<svg class="'+(c||"i")+'" viewBox="0 0 24 24" aria-hidden="true"><path d="'+p+'"/></svg>';
const IC={check:"M5 12.5l4.5 4.5L19 7.5",edit:"M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",dots:"M5 12h.01M12 12h.01M19 12h.01",x:"M6 6l12 12M18 6L6 18",
  copy:"M9 9h11v11H9zM5 15H4V4h11v1",skip:"M5 5l9 7-9 7zM17 5v14",pause:"M8 5v14M16 5v14",play:"M7 5l12 7-12 7z",prev:"M15 6l-6 6 6 6",next:"M9 6l6 6-6 6",
  trash:"M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",undo:"M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3",open:"M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  link:"M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",note:"M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
  rep:"M17 2l4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3",clock:"M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
  globe:"M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z",shop:"M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6"};

/* ---------- the site's time zone (Settings > General; India Standard Time by default) ---------- */
const TZ=()=>(window.HUB&&HUB.tz&&HUB.tz())||"Asia/Kolkata";
function partsTz(date){
  try{
    const p=new Intl.DateTimeFormat("en-CA",{timeZone:TZ(),year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(date);
    const g=t=>(p.find(x=>x.type===t)||{}).value;
    return{d:g("year")+"-"+g("month")+"-"+g("day"),t:g("hour")+":"+g("minute")};
  }catch(e){return{d:ymd(date),t:pad(date.getHours())+":"+pad(date.getMinutes())}}
}
const nowTz=()=>partsTz(new Date());
const tsDay=ts=>partsTz(new Date(ts*1000)).d;   // the site's date of a moment
const todayS=()=>nowTz().d;
const today=()=>parse(todayS());
const t12=hm=>{if(!hm)return"";const[h,m]=hm.split(":").map(Number);return(h%12||12)+":"+pad(m)+" "+(h<12?"AM":"PM")};
const LOC=()=>SET.dates==="us"?"en-US":"en-IN";   // Tasks Settings > Dates
const WS=()=>SET.week==="mon"?1:0;                  // Tasks Settings > Week Starts On
const fmtD=(s,o)=>parse(s).toLocaleDateString(LOC(),o||{day:"numeric",month:"short",year:"numeric"});
const fmtLong=s=>{const d=parse(s);return d.toLocaleDateString(LOC(),{weekday:"long"})+", "+d.getDate()+" "+MONTHS[d.getMonth()]+" "+d.getFullYear()};
const weekEnd=s=>addDays(s,6);   // "This Week" = today and the next 6 days (rolling, so it never ends on a Saturday with nothing in it)
const monthEnd=s=>s.slice(0,8)+pad(dim(+s.slice(0,4),+s.slice(5,7)-1));

/* ---------- data ---------- */
const SET_DEF={currency:"INR",soon:7,start:"",range:"",cal:"",sort:"",stats:true,week:"sun",dates:"in"};
let T=[],LOG=[],SET={...SET_DEF},REV=0,loaded=false;
const LOG_MAX=500;
const VKEY="tasks-view4";
const VDEF={view:"list",cal:true,range:"all",st:"",year:"",month:"",cat:"",rep:"",cur:"",price:"",where:"",sort:"due",group:"smart",q:"",day:"",calM:"",calV:"month",calSel:"",wk:0,ap:"n365",acur:"",dk:"",dyear:"",dq:""};
let V={...VDEF};
try{Object.assign(V,JSON.parse(localStorage.getItem(VKEY)||"{}")||{})}catch(e){}
if(!["list","cal","an","done"].includes(V.view))V.view="list";
if(!["month","week","year"].includes(V.calV))V.calV="month";
V.q="";V.day="";V.dq="";V.calSel="";V.calM="";V.wk=0;
const keepView=()=>{try{localStorage.setItem(VKEY,JSON.stringify({...V,q:"",day:"",dq:"",calSel:"",calM:"",wk:0}))}catch(e){}};

/* ---------- dates and repeats ---------- */
function nextDate(s,rep,day){
  const d=parse(s),n=Math.max(1,rep.n|0);
  if(rep.unit==="day"){d.setDate(d.getDate()+n);return ymd(d)}
  if(rep.unit==="week"){d.setDate(d.getDate()+7*n);return ymd(d)}
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
const perYear=r=>({day:365,week:52.18,month:12,year:1}[r.unit]||0)/(r.n||1);
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

/* ---------- loading and saving ---------- */
function privateScreen(){
  document.body.innerHTML='<div id="ix-private"><div class="ix-ico"><svg viewBox="0 0 24 24"><path d="M5 11h14v10H5zM8 11V8a4 4 0 0 1 8 0v3"/></svg></div>'+
    '<h1>Tasks</h1><p>This page is private. Log in to see your tasks.</p><button type="button">Log In</button></div>';
  document.querySelector("#ix-private button").onclick=()=>window.HUB?HUB.login("Log in to see your tasks.").then(()=>location.reload(),()=>{}):location.reload();
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
  try{
    const r=await HF("api.php",{cache:"no-store"});
    const j=await r.json();
    if(j.private&&!j.auth){privateScreen();return}
    take(j);openWith();status("Saved on the server.");
  }catch(e){$("list").innerHTML='<div class="empty"><h2>Tasks Couldn\'t Load</h2><p>The server didn\'t answer. Check your connection, then reload the page.</p><button type="button" class="btn">Reload</button></div>';$("list").querySelector("button").onclick=()=>location.reload();return}
  drawFilters();render();fromHash();
}
/* Saving: the whole list goes to the server. `ver` counts changes made here, so an answer for an older list never
   replaces changes made while it was on its way. */
let saveT=null,saving=false,again=false,ver=0;
function status(m){$("status").textContent=m}
function save(){ver++;clearTimeout(saveT);status("Saving…");saveT=setTimeout(push,350)}
async function push(){
  if(saving){again=true;return}
  saving=true;
  const sent=ver;
  try{
    const r=await HF("api.php",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save",rev:REV,tasks:T,log:LOG,settings:SET})});
    const j=await r.json().catch(()=>({}));
    if(r.status===401){status("You were logged out. Your change is not saved yet.");if(window.HUB)HUB.login("Log in to save your change.").then(()=>push(),()=>{});return}
    if(r.status===409&&j.data){take(j.data);render();toast("Tasks were changed in another window. Showing the latest version; make your change again.");status("Saved on the server.");return}
    if(!r.ok||!j.ok)throw new Error(j.error||"Save failed.");
    REV=j.rev;
    if(ver!==sent){again=true;return}   // changed meanwhile: send the newer list (finally below)
    if(Array.isArray(j.tasks)){T=j.tasks;if(Array.isArray(j.log))LOG=j.log;render()}
    status("Saved on the server.");
  }catch(e){status((e&&e.message)||"Save failed. Your change is kept on this page and will be saved with the next change.")}
  finally{saving=false;if(again){again=false;push()}}
}

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
  document.querySelectorAll("#views button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.view===V.view)));
  document.querySelectorAll("#vsw button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.v===V.view)));
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

/* ---------- summary strip ---------- */
/* ---------- side panel: smart lists and spending ---------- */
const TI={today:"M4 6h16v15H4zM4 10h16M8 3v4M16 3v4M12 14v3",late:"M12 8v5M12 17h.01M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  week:"M4 6h16v15H4zM4 10h16M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01",month:"M4 6h16v15H4zM4 10h16M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01",
  all:"M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",paused:"M8 5v14M16 5v14"};
function drawStats(){
  const t0=todayS(),we=weekEnd(t0),me=monthEnd(t0),ye=addDays(t0,364);
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
  const b=e.target.closest("[data-s]");if(!b)return;const k=b.dataset.s,t0=todayS();
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
  if(m=take(/\severy\s+(\d{1,2})\s+(day|week|month|year)s?\s/i))t.repeat={n:Math.max(1,+m[1]),unit:m[2].toLowerCase()};
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
  const w=e.target.closest("[data-wk]");
  if(w){V.wk=w.dataset.wk==="0"?0:(V.wk|0)+(+w.dataset.wk);drawStrip();return}
  const d=e.target.closest("[data-day]");if(!d)return;
  V.day=V.day===d.dataset.day?"":d.dataset.day;render();
  if(V.day)$("range").scrollIntoView({block:"nearest",behavior:"smooth"});
};
$("calbtn").onclick=()=>{V.cal=!V.cal;keepView();render()};
$("vsw").onclick=e=>{const b=e.target.closest("[data-v]");if(b&&b.dataset.v!==V.view)setView("view",b.dataset.v)};

/* ---------- Calendar: a month, a week or the whole year; the chosen day on the right ---------- */
const calBase=()=>/^\d{4}-\d{2}$/.test(V.calM)?V.calM:todayS().slice(0,7);
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
  let title="",body="",from,to,on,scope="";
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
        '<div class="wcl">'+(it.map(wcardHtml).join("")||'<p class="wce">Free</p>')+'</div>'+
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
        it.slice(0,3).map(pillHtml).join("")+(it.length>3?'<span class="more">+'+(it.length-3)+' More</span>':'')+
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
      (late.length?'<p class="sub">Still Overdue</p>'+late.map(t=>rowHtml({t,d:t.due,st:"late",occ:false})).join(""):"")+'</div></div>';
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
  const cv=e.target.closest("[data-cv]");if(cv){calMove(+cv.dataset.cv);drawCalView();return}
  const md=e.target.closest("[data-mode]");
  if(md){const k=md.dataset.mode;if(k===V.calV)return;
    if(k==="week"&&!V.calSel&&calBase()!==todayS().slice(0,7))V.calSel=calBase()+"-01";
    if(k!=="week"&&V.calSel)V.calM=V.calSel.slice(0,7);
    V.calV=k;keepView();drawCalView();return}
  const mh=e.target.closest("[data-month]");if(mh){V.calV="month";V.calM=mh.dataset.month;V.calSel=mh.dataset.month===todayS().slice(0,7)?"":mh.dataset.month+"-01";keepView();drawCalView();return}
  const ad=e.target.closest("[data-addday]");if(ad){openEditor(null,false,ad.dataset.addday);return}
  if(e.target.closest("#agenda"))return agendaClick(e);
  const it=e.target.closest(".pl[data-id],.wc[data-id]");
  if(it){const t=find(it.dataset.id);if(t){openCard(t);return}}
  const d=e.target.closest("[data-day]");if(!d)return;
  const ds=d.dataset.day;
  if(V.calV==="year"){V.calV="month";V.calM=ds.slice(0,7);V.calSel=ds;keepView();drawCalView()}
  else{   // only the highlight and the day on the right change, so a double-click still finds its day
    V.calSel=ds===todayS()?"":ds;
    $("vcal").querySelectorAll(".cd.sel,.wcol.sel").forEach(x=>x.classList.remove("sel"));d.classList.add("sel");
    const a=$("agenda").querySelector(".agc");if(a)a.outerHTML=agendaHtml(ds);
  }
  if(innerWidth<=980)$("agenda").scrollIntoView({block:"start",behavior:"smooth"});
};
$("vcal").ondblclick=e=>{if(e.target.closest("#agenda,.pl,.wc,[data-cv],[data-mode]"))return;const d=e.target.closest(".cd[data-day],.wcol[data-day]");if(d)openEditor(null,false,d.dataset.day)};
$("vcal").onkeydown=e=>{
  if((e.key==="Enter"||e.key===" ")&&e.target.matches(".cd,.row")){e.preventDefault();e.target.click()}
};
$("vcal").onsubmit=e=>{if(e.target.id!=="agf")return;e.preventDefault();quickAdd($("agq"),V.calSel||todayS());setTimeout(()=>{const q=$("agq");if(q)q.focus()},30)};
function agendaClick(e){
  const b=e.target.closest("[data-a]"),row=e.target.closest(".row"),t=row&&find(row.dataset.id);if(!t)return;
  if(!b)return openCard(t);
  if(b.dataset.a==="more")return moreMenu(b,t);
  act[b.dataset.a]&&act[b.dataset.a](t);
}
/* drag a task to another day: its due date moves there (repeats keep going from the new date) */
let dragId="";
$("vcal").addEventListener("dragstart",e=>{const p=e.target.closest&&e.target.closest("[draggable][data-id]");if(!p)return;dragId=p.dataset.id;e.dataTransfer.effectAllowed="move";try{e.dataTransfer.setData("text/plain",dragId)}catch(x){}hideTip()});
$("vcal").addEventListener("dragend",()=>{dragId="";document.querySelectorAll("#vcal .drop").forEach(x=>x.classList.remove("drop"))});
$("vcal").addEventListener("dragover",e=>{if(!dragId)return;const d=e.target.closest(".cd[data-day],.wcol[data-day]");if(!d)return;e.preventDefault();e.dataTransfer.dropEffect="move";
  document.querySelectorAll("#vcal .drop").forEach(x=>{if(x!==d)x.classList.remove("drop")});d.classList.add("drop")});
$("vcal").addEventListener("drop",e=>{
  const d=e.target.closest(".cd[data-day],.wcol[data-day]"),t=find(dragId);dragId="";
  document.querySelectorAll("#vcal .drop").forEach(x=>x.classList.remove("drop"));
  if(!d||!t)return;e.preventDefault();const to=d.dataset.day;if(to===t.due)return;
  withUndo('"'+t.name+'" Moved to '+fmtD(to)+".",()=>{t.due=to;t.day=+to.slice(8,10);t.updated=now()});
});

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
  const n=["st","year","month","cat","rep","cur","price"].filter(k=>V[k]).length+(V.group!=="smart");
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
  document.querySelectorAll("#where button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.w===V.where)));
}
function setView(k,v){V[k]=v;keepView();drawFilters();render()}
$("views").onclick=e=>{const b=e.target.closest("[data-view]");if(b){V.anFocus="";setView("view",b.dataset.view)}};
$("range").onclick=e=>{const b=e.target.closest("[data-r]");if(b){V.day="";setView("range",b.dataset.r)}};
$("where").onclick=e=>{const b=e.target.closest("[data-w]");if(b)setView("where",b.dataset.w)};
$("q").oninput=e=>{V.q=e.target.value;$("qx").hidden=!V.q;render()};
$("qx").onclick=()=>{V.q="";$("q").value="";$("qx").hidden=true;render();$("q").focus()};
[["fst","st"],["fyear","year"],["fmonth","month"],["fcat","cat"],["frep","rep"],["fcur","cur"],["fprice","price"],["fsort","sort"],["fgroup","group"]].forEach(([id,k])=>$(id).onchange=e=>setView(k,e.target.value));
$("fbtn").onclick=()=>{const f=$("filters"),open=f.hidden;f.hidden=!open;$("fbtn").setAttribute("aria-expanded",String(open))};
const clearFilters=()=>Object.assign(V,{range:"all",st:"",year:"",month:"",cat:"",rep:"",cur:"",price:"",where:"",q:"",day:""});
$("chips").onclick=e=>{
  const b=e.target.closest("[data-rm]");if(!b)return;
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
document.addEventListener("mouseover",e=>{const n=e.target.closest&&e.target.closest("[data-tip]");if(n)showTip(n)});
document.addEventListener("mouseout",e=>{const n=e.target.closest&&e.target.closest("[data-tip]");if(n&&!n.contains(e.relatedTarget))hideTip()});
document.addEventListener("focusin",e=>{const n=e.target.closest&&e.target.closest("[data-tip]");if(n)showTip(n);else hideTip()});
addEventListener("scroll",hideTip,{passive:true});

/* ---------- completed: the last 500 things you marked done or skipped ---------- */
function drawDone(){
  const q=V.dq.trim().toLowerCase(),years=[...new Set(LOG.map(e=>tsDay(e.t).slice(0,4)))].sort().reverse();
  if(V.dyear&&!years.includes(V.dyear))V.dyear="";
  $("dyear").innerHTML='<option value="">Any Year</option>'+years.map(y=>'<option'+(V.dyear===y?" selected":"")+'>'+y+'</option>').join("");
  document.querySelectorAll("#dkind button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.k===V.dk)));
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
$("dkind").onclick=e=>{const b=e.target.closest("[data-k]");if(b)setView("dk",b.dataset.k)};
$("dyear").onchange=e=>setView("dyear",e.target.value);
$("dlist").onclick=e=>{
  const row=e.target.closest("[data-log]");if(!row)return;
  const en=LOG.find(x=>x.id===row.dataset.log);if(!en)return;
  const b=e.target.closest("[data-a]");
  if(!b){const t=find(en.task);if(t)openCard(t);return}
  const t=find(en.task);
  menu(b,[t?["open","Open Task",IC.open]:null,"-",["del","Delete This Entry",IC.trash,"danger"]],k=>{
    if(k==="open")openCard(t);
    if(k==="del")withUndo("Entry Deleted.",()=>{LOG=LOG.filter(x=>x!==en)});
  });
};
$("dlist").onkeydown=e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches("[data-log]")){e.preventDefault();e.target.click()}};

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
  const pays=payments(V.ap,cur),[from,to,past]=periodRange(V.ap),t0=todayS(),f=v=>money(Math.round(v),cur),pct=v=>total?Math.round(v/total*100)+"%":"0%";
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
  const ac=$("acur");if(ac)ac.onclick=e=>{const b=e.target.closest("[data-c]");if(b)setView("acur",b.dataset.c)};
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
$("van").addEventListener("mousemove",e=>{const el=e.target.closest&&e.target.closest("[data-tt]");if(el)anTip(el,e);else if(ttEl)ttEl.hidden=true});
$("van").addEventListener("mouseleave",()=>{if(ttEl)ttEl.hidden=true});
$("van").addEventListener("focusin",e=>{const el=e.target.closest&&e.target.closest("[data-tt]");if(el)anTip(el);else if(ttEl)ttEl.hidden=true});

/* ---------- Year in Review: a PDF report of one year (what you marked Done), made in this browser ---------- */
function yearData(y){
  const ent=LOG.filter(e=>e.d.slice(0,4)===String(y));
  const paid=ent.filter(e=>e.k==="paid"&&e.p!=null),cur=e=>e.cur||SET.currency;
  const curs={};paid.forEach(e=>{curs[cur(e)]=(curs[cur(e)]||0)+e.p});
  const main=Object.keys(curs).sort((a,b)=>a===SET.currency?-1:b===SET.currency?1:curs[b]-curs[a])[0]||SET.currency;
  const inMain=paid.filter(e=>cur(e)===main),months=Array(12).fill(0),cats={},modes={online:0,offline:0,"":0};
  inMain.forEach(e=>{months[+e.d.slice(5,7)-1]+=e.p;const c=e.cat||"No Category";cats[c]=(cats[c]||0)+e.p;modes[e.mode||""]+=e.p});
  const total=inMain.reduce((s,e)=>s+e.p,0);
  // price changes: the same task paid at different prices during the year
  const byTask={};inMain.slice().sort((a,b)=>a.d.localeCompare(b.d)).forEach(e=>{(byTask[e.task||e.name]=byTask[e.task||e.name]||[]).push(e)});
  const changes=Object.values(byTask).map(l=>({n:l[l.length-1].name,a:l[0].p,b:l[l.length-1].p})).filter(x=>x.a!==x.b&&x.a>0).sort((x,y)=>Math.abs(y.b/y.a)-Math.abs(x.b/x.a));
  const nextYear=T.filter(t=>t.status==="active"&&t.repeat.unit!=="none"&&t.price!=null&&curOf(t)===main).map(t=>({n:t.name,r:repLabel(t.repeat),v:t.price*perYear(t.repeat)})).sort((a,b)=>b.v-a.v);
  return{y,main,curs,total,count:inMain.length,done:ent.filter(e=>e.k==="paid").length,skipped:ent.filter(e=>e.k==="skip").length,months,
    cats:Object.entries(cats).sort((a,b)=>b[1]-a[1]),modes,top:inMain.slice().sort((a,b)=>b.p-a.p).slice(0,12),changes,nextYear};
}
function openYear(){
  const years=[...new Set(LOG.map(e=>e.d.slice(0,4)))].sort().reverse(),y0=todayS().slice(0,4);
  if(!years.includes(y0))years.unshift(y0);
  const draw=y=>{
    const D=yearData(y),other=Object.keys(D.curs).filter(c=>c!==D.main);
    $("ybody").innerHTML='<label class="fl">Year<select id="yyear">'+years.map(v=>'<option'+(v===y?" selected":"")+'>'+v+'</option>').join("")+'</select></label>'+
      (D.done+D.skipped?'<div class="tiles"><div class="tile"><small>Paid</small><b class="num">'+esc(money(Math.round(D.total),D.main))+'</b><span>'+D.count+' Payments</span></div>'+
        '<div class="tile"><small>Completed</small><b class="num">'+D.done+'</b><span>'+D.skipped+' Skipped</span></div>'+
        '<div class="tile"><small>Biggest Category</small><b>'+esc(D.cats[0]?D.cats[0][0]:"None")+'</b><span class="num">'+(D.cats[0]?esc(money(Math.round(D.cats[0][1]),D.main)):"")+'</span></div></div>'+
        (other.length?'<p class="hint">Also paid in '+other.map(c=>esc(money(Math.round(D.curs[c]),c))).join(", ")+' (listed in the PDF).</p>':'')+
        '<p class="hint">A PDF with monthly totals, categories, top payments and next year\'s costs.</p>'
       :'<div class="empty" style="padding:20px"><h2>Nothing in '+esc(y)+' Yet</h2><p>The review counts what you mark Done in Tasks. Completed entries from '+esc(y)+' will show up here.</p></div>');
    $("yyear").onchange=e=>draw(e.target.value);
    $("ygo").disabled=!(D.done+D.skipped);$("ygo").onclick=()=>makePdf(y);
  };
  draw(years[0]);$("ydlg").showModal();
}
let pdfLib=null;
function loadPdf(){
  if(window.jspdf)return Promise.resolve(window.jspdf.jsPDF);
  return pdfLib||(pdfLib=new Promise((ok,no)=>{const s=document.createElement("script");s.src="../hub/core/assets/vendor/jspdf.umd.min.js?v=4.2.1";
    s.onload=()=>window.jspdf?ok(window.jspdf.jsPDF):no();s.onerror=()=>{pdfLib=null;no()};document.head.appendChild(s)}));
}
async function makePdf(y){
  const b=$("ygo");b.disabled=true;b.lastChild.textContent="Making PDF…";
  try{
    const jsPDF=await loadPdf(),D=yearData(y),doc=new jsPDF({unit:"mm",format:"a4"}),W=210,M=16;
    // PDF's built-in fonts have no ₹ sign, and only Western letters: amounts in rupees read "Rs 1,200"
    const pm=(v,c)=>{c=c||D.main;const n=Math.round(v*100)/100;if(c==="INR")return"Rs "+new Intl.NumberFormat("en-IN",{maximumFractionDigits:n%1?2:0}).format(n);
      try{return new Intl.NumberFormat("en-US",{style:"currency",currency:c,maximumFractionDigits:n%1?2:0}).format(n)}catch(e){return c+" "+n}};
    const tx=s=>String(s??"").normalize("NFKD").replace(/[^\x20-\x7E\u00A0-\u00FF€]/g,"").trim()||"?";
    const acc=getComputedStyle(document.documentElement).getPropertyValue("--ix-accent").trim()||"#ffc21a";
    const hex=h=>{h=h.replace("#","");if(h.length===3)h=h.split("").map(c=>c+c).join("");return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]};
    const A=hex(acc),ink=[24,24,27],mute=[110,110,118],line=[226,226,230];
    let yy=0;
    const head=t=>{doc.setFont("helvetica","bold");doc.setFontSize(13);doc.setTextColor(...ink);doc.text(t,M,yy);yy+=3;doc.setDrawColor(...A);doc.setLineWidth(0.8);doc.line(M,yy,M+18,yy);yy+=7};
    const foot=n=>{doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(...mute);doc.text(tx((document.querySelector(".ix-bname")||{}).textContent||"My Site")+" - Year in Review "+y,M,289);doc.text("Page "+n+" of 2",W-M,289,{align:"right"})};
    // page 1: title, totals, months, categories
    doc.setFillColor(...A);doc.rect(0,0,W,38,"F");
    doc.setTextColor(0,0,0);doc.setFont("helvetica","bold");doc.setFontSize(24);doc.text("Year in Review "+y,M,20);
    doc.setFont("helvetica","normal");doc.setFontSize(10);doc.text("1 January to 31 December "+y+"   |   made "+fmtD(todayS()),M,29);
    yy=50;
    const tiles=[["Paid",pm(D.total)],["Payments",String(D.count)],["Completed",String(D.done)],["Skipped",String(D.skipped)]],tw=(W-2*M-9)/4;
    tiles.forEach((t,i)=>{const x=M+i*(tw+3);doc.setDrawColor(...line);doc.setLineWidth(0.3);doc.roundedRect(x,yy,tw,22,2,2);
      doc.setFontSize(8.5);doc.setTextColor(...mute);doc.text(t[0].toUpperCase(),x+4,yy+7);doc.setFont("helvetica","bold");doc.setFontSize(t[1].length>12?11:14);doc.setTextColor(...ink);doc.text(t[1],x+4,yy+16);doc.setFont("helvetica","normal")});
    yy+=30;
    const other=Object.keys(D.curs).filter(c=>c!==D.main);
    if(other.length){doc.setFontSize(9);doc.setTextColor(...mute);doc.text("Also paid: "+other.map(c=>pm(D.curs[c],c)).join(", ")+". The report below is in "+D.main+".",M,yy);yy+=8}
    head("Paid by Month");
    const ch=48,cw=(W-2*M)/12,mx=Math.max(1,...D.months),base=yy+ch;
    D.months.forEach((v,i)=>{const h=v/mx*(ch-8),x=M+i*cw+2;doc.setFillColor(...(v?A:line));doc.rect(x,base-Math.max(h,0.6),cw-4,Math.max(h,0.6),"F");
      doc.setFontSize(7.5);doc.setTextColor(...mute);doc.text(MONTHS[i].slice(0,3),x+(cw-4)/2,base+4.5,{align:"center"});
      if(v){doc.setTextColor(...ink);const s=v>=1e5&&D.main==="INR"?(Math.round(v/1e4)/10)+"L":v>=1e3?(Math.round(v/100)/10)+"K":String(Math.round(v));doc.text(s,x+(cw-4)/2,base-h-1.6,{align:"center"})}});
    yy=base+14;
    head("By Category");
    const cats=D.cats.slice(0,12),cmax=cats.length?cats[0][1]:1;
    cats.forEach(([c,v])=>{doc.setFontSize(9.5);doc.setTextColor(...ink);doc.text(tx(c).slice(0,28),M,yy+3.2);
      doc.setFillColor(...line);doc.rect(M+52,yy,82,4,"F");doc.setFillColor(...A);doc.rect(M+52,yy,Math.max(0.8,v/cmax*82),4,"F");
      doc.setFont("helvetica","bold");doc.text(pm(v),W-M-16,yy+3.2,{align:"right"});doc.setFont("helvetica","normal");doc.setTextColor(...mute);doc.text(Math.round(v/(D.total||1)*100)+"%",W-M,yy+3.2,{align:"right"});yy+=7.2});
    if(!cats.length){doc.setFontSize(9.5);doc.setTextColor(...mute);doc.text("No payments with a price.",M,yy);yy+=7}
    foot(1);
    // page 2: biggest payments, price changes, online/offline, next year
    doc.addPage();yy=20;
    head("Biggest Payments");
    const row=(cols,bold)=>{doc.setFont("helvetica",bold?"bold":"normal");doc.setFontSize(9);doc.setTextColor(...(bold?mute:ink));
      doc.text(cols[0],M,yy);doc.text(cols[1],M+28,yy);doc.text(cols[2],M+110,yy);doc.text(cols[3],W-M,yy,{align:"right"});yy+=1.8;doc.setDrawColor(...line);doc.setLineWidth(0.2);doc.line(M,yy,W-M,yy);yy+=4.6};
    row(["DATE","TASK","CATEGORY","AMOUNT"],true);
    D.top.forEach(e=>row([fmtD(e.d,{day:"numeric",month:"short"}),tx(e.name).slice(0,42),tx(e.cat||"-").slice(0,24),pm(e.p)]));
    yy+=6;head("Price Changes");
    if(D.changes.length){D.changes.slice(0,8).forEach(c=>{const p=Math.round((c.b-c.a)/c.a*100);doc.setFontSize(9.5);doc.setTextColor(...ink);doc.text(tx(c.n).slice(0,44),M,yy);
      doc.text(pm(c.a)+"  to  "+pm(c.b),M+100,yy);doc.setTextColor(...(p>0?[198,40,40]:[31,122,77]));doc.setFont("helvetica","bold");doc.text((p>0?"+":"")+p+"%",W-M,yy,{align:"right"});doc.setFont("helvetica","normal");yy+=6.5})}
    else{doc.setFontSize(9.5);doc.setTextColor(...mute);doc.text("No task was paid at two different prices this year.",M,yy);yy+=7}
    yy+=6;head("Online or Offline");
    const mt=D.total||1;[["Online",D.modes.online],["Offline",D.modes.offline],["Not Set",D.modes[""]]].forEach(([n,v])=>{doc.setFontSize(9.5);doc.setTextColor(...ink);doc.text(n,M,yy+3.2);
      doc.setFillColor(...line);doc.rect(M+30,yy,104,4,"F");doc.setFillColor(...A);doc.rect(M+30,yy,Math.max(0.6,v/mt*104),4,"F");doc.text(pm(v)+"  ("+Math.round(v/mt*100)+"%)",W-M,yy+3.2,{align:"right"});yy+=7.5});
    yy+=6;head("Repeating Costs for the Next Year");
    const ny=D.nextYear.slice(0,14);
    if(ny.length){ny.forEach(t=>{doc.setFontSize(9.5);doc.setTextColor(...ink);doc.text(tx(t.n).slice(0,50),M,yy);doc.setTextColor(...mute);doc.text(t.r,M+110,yy);doc.setTextColor(...ink);doc.text(pm(t.v)+" / year",W-M,yy,{align:"right"});yy+=6});
      const s=D.nextYear.reduce((a,t)=>a+t.v,0);doc.setDrawColor(...line);doc.line(M,yy-2,W-M,yy-2);yy+=3;doc.setFont("helvetica","bold");doc.text("Total: "+pm(Math.round(s))+" a year, about "+pm(Math.round(s/12))+" a month",W-M,yy,{align:"right"});doc.setFont("helvetica","normal");yy+=6}
    else{doc.setFontSize(9.5);doc.setTextColor(...mute);doc.text("No active repeating tasks with a price.",M,yy);yy+=7}
    doc.setFontSize(8);doc.setTextColor(...mute);doc.text(doc.splitTextToSize("Counts what you marked Done in Tasks during "+y+", at the price recorded then (by the date each payment was due). Skipped dates are counted but not paid. Names in other alphabets are left out by the PDF's built-in fonts.",W-2*M),M,276);
    foot(2);
    doc.save("year-in-review-"+y+".pdf");
    snack("Year in Review "+y+" downloaded.");
  }catch(e){snack("The PDF could not be made"+(e&&e.message?": "+e.message:"")+".")}
  finally{b.disabled=false;b.lastChild.textContent="Download PDF"}
}

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
$("list").onclick=e=>{
  const gh=e.target.closest(".gh");if(gh){const k=gh.dataset.g;COLL.has(k)?COLL.delete(k):COLL.add(k);render();return}
  const b=e.target.closest("[data-a]");
  if(b&&b.dataset.a==="new")return openEditor();
  if(b&&b.dataset.a==="clear"){clearFilters();keepView();drawFilters();render();return}
  const row=e.target.closest(".row"),t=row&&find(row.dataset.id);if(!t)return;
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
  popEl.innerHTML=items.map(i=>i==="-"?"<hr>":'<button type="button" role="menuitem" data-k="'+i[0]+'"'+(i[3]?' class="'+i[3]+'"':"")+'>'+SVG(i[2])+'<span>'+esc(i[1])+'</span></button>').join("");
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
    const b=e.target.closest("[data-k]");if(!b)return;
    if(b.classList.contains("danger")&&b.dataset.armed!=="1"){b.dataset.armed="1";b.querySelector("span").textContent="Click Again to Delete";return}
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
  $("vfoot").innerHTML='<button type="button" class="btn left danger" data-c="del">'+SVG(IC.trash)+'Delete</button>'+
    (t.status==="active"&&t.repeat.unit!=="none"?B("skip","Skip Date",IC.skip):"")+
    (t.status==="active"?B("pause","Pause",IC.pause):t.status==="paused"?B("resume","Resume",IC.play):"")+
    B("dup","Duplicate",IC.copy)+B("edit","Edit",IC.edit)+
    (t.status==="active"?B("done","Mark Done",IC.check,"pri"):t.status==="done"?B("reopen","Put Back on the List",IC.undo,"pri"):"");
  if(!dlg.open)dlg.showModal();
  $("vfoot").querySelector(".pri,[data-c=edit]").focus();
}
$("vfoot").onclick=e=>{
  const b=e.target.closest("[data-c]");if(!b||!cardT)return;const k=b.dataset.c,t=cardT;
  if(k==="del"&&b.dataset.armed!=="1"){b.dataset.armed="1";b.lastChild.textContent="Click Again to Delete";return}
  $("vdlg").close();act[k](t);
};
$("vdlg").addEventListener("click",e=>{if(e.target===$("vdlg"))$("vdlg").close()});

/* ---------- add and edit ---------- */
let editing=null,eMode="";
const REP_PRESETS=[...document.querySelectorAll("#e-rep option")].map(o=>o.value);
function repFromForm(){
  const v=$("e-rep").value;
  if(v==="none")return{n:1,unit:"none"};
  if(v==="custom")return{n:Math.max(1,Math.min(99,parseInt($("e-n").value,10)||1)),unit:$("e-unit").value};
  const[u,n]=v.split(":");return{n:+n,unit:u};
}
function previewNext(){
  const due=$("e-due").value,rep=repFromForm();
  $("e-custom").hidden=$("e-rep").value!=="custom";
  if(!due||rep.unit==="none"){$("e-next").textContent="";return}
  const day=+due.slice(8,10),out=[];let s=due;
  for(let i=0;i<4;i++){out.push(fmtD(s));s=nextDate(s,rep,day)}
  $("e-next").textContent="Dates: "+out.join(", ")+"…";
}
["e-due","e-rep","e-n","e-unit"].forEach(id=>$(id).addEventListener("input",previewNext));
$("e-mode").onclick=e=>{const b=e.target.closest("[data-m]");if(!b)return;eMode=b.dataset.m;document.querySelectorAll("#e-mode button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)))};
function openEditor(t,copy,day){
  editing=t&&!copy?t:null;
  const x=t||{name:"",due:day||(V.view==="cal"&&V.calSel)||V.day||todayS(),time:"",repeat:{n:1,unit:"none"},price:null,cur:"",mode:"",cat:"",remind:-1,url:"",notes:""};
  $("dlgt").textContent=editing?"Edit Task":copy?"Copy of Task":"Add Task";
  $("e-name").value=x.name;$("e-due").value=x.due;$("e-time").value=x.time||"";
  const key=x.repeat.unit==="none"?"none":x.repeat.unit+":"+x.repeat.n;
  $("e-rep").value=REP_PRESETS.includes(key)?key:"custom";$("e-n").value=x.repeat.n||1;$("e-unit").value=x.repeat.unit==="none"?"month":x.repeat.unit;
  $("e-price").value=x.price??"";
  $("e-cur").innerHTML='<option value="">Default ('+esc(SET.currency||"None")+')</option>'+CURS.map(c=>'<option value="'+c[0]+'">'+c[0]+'</option>').join("");
  $("e-cur").value=x.cur&&CURS.some(c=>c[0]===x.cur)?x.cur:"";
  eMode=x.mode||"";document.querySelectorAll("#e-mode button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.m===eMode)));
  $("e-cat").value=x.cat;
  $("e-remind").value=String([-1,0,1,3,7,14,30,60].includes(x.remind)?x.remind:-1);
  $("e-url").value=x.url;$("e-notes").value=x.notes;$("e-err").textContent="";
  $("e-del").hidden=!editing;$("e-del").dataset.armed="";$("e-del").textContent="Delete";
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
  const b=$("e-del");
  if(b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent="Click Again to Delete";return}
  const t=editing;$("dlg").close();act.del(t);
};
document.querySelectorAll("#dlg,#sdlg,#ydlg").forEach(d=>d.addEventListener("click",e=>{if(e.target.closest("[data-close]")||e.target===d)d.close()}));

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

/* ---------- page settings ---------- */
$("psets").onclick=()=>{
  $("s-cur").innerHTML=CURS.map(c=>'<option value="'+c[0]+'"'+(SET.currency===c[0]?" selected":"")+'>'+c[1]+'</option>').join("")+'<option value=""'+(SET.currency===""?" selected":"")+'>No Currency Sign</option>';
  $("s-soon").value=String([0,1,3,7,14,30].includes(SET.soon)?SET.soon:7);
  ["start","range","sort","cal","week","dates"].forEach(k=>$("s-"+k).value=SET[k]||SET_DEF[k]);
  $("s-stats").checked=SET.stats!==false;
  calDraw({on:false,link:""});calLoad();
  $("sdlg").showModal();
};
/* the calendar link: kept on the server on its own, so it takes effect at once (not with Save Settings) */
let CAL={on:false,link:""};
function calDraw(c){CAL=c;$("s-calon").checked=!!c.on;$("s-calbox").hidden=!c.on||!c.link;$("s-calurl").value=c.link?new URL(c.link,location.href).href:""}
async function calLoad(){try{const r=await HF("api.php?action=cal",{cache:"no-store"}),j=await r.json();if(j&&j.ok)calDraw(j)}catch{}}
async function calSet(body){
  try{const r=await HF("api.php",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"cal_set",...body})}),j=await r.json();
    if(!j.ok){snack(j.error||"The calendar link could not be changed.");calDraw(CAL);return}
    calDraw(j)}catch{snack("The calendar link could not be changed.");calDraw(CAL)}
}
$("s-calon").onchange=()=>calSet({on:$("s-calon").checked});
$("s-calnew").onclick=()=>{if(confirm("Make a new link? The old link stops working, so calendars using it need the new one."))calSet({renew:true})};
$("s-calcopy").onclick=async()=>{try{await navigator.clipboard.writeText($("s-calurl").value);snack("Link copied.")}catch{$("s-calurl").select();snack("Press Ctrl+C to copy the link.")}};
$("sform").onsubmit=e=>{e.preventDefault();SET={...SET,currency:$("s-cur").value,soon:+$("s-soon").value,start:$("s-start").value,range:$("s-range").value,sort:$("s-sort").value,cal:$("s-cal").value,
  week:$("s-week").value,dates:$("s-dates").value,stats:$("s-stats").checked};applyLook();render();for(const k in NF)delete NF[k];$("sdlg").close();touch();snack("Settings Saved.")};

/* ---------- exports ---------- */
function download(name,type,text){
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),3000);
}
$("xcsv").onclick=()=>{
  const q=v=>{v=String(v??"");return /[",\n;]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
  const head=["Name","Due Date","Time","Repeats","Price","Currency","Category","Online or Offline","Status","Website","Notes"];
  const lines=(V.view==="done"?[]:rowsNow()).map(r=>{const t=r.t;return[t.name,r.d,t.time,repLabel(t.repeat),t.price??"",curOf(t),t.cat,t.mode==="online"?"Online":t.mode==="offline"?"Offline":"",ST_NAME[r.st],t.url,t.notes]});
  if(V.view==="done"){head.splice(0,head.length,"Completed On","Name","Due Date","Done or Skipped","Price","Currency","Category","Online or Offline");
    LOG.slice().sort((a,b)=>b.t-a.t).forEach(e=>lines.push([tsDay(e.t),e.name,e.d,e.k==="skip"?"Skipped":"Done",e.p??"",e.cur||SET.currency,e.cat,e.mode==="online"?"Online":e.mode==="offline"?"Offline":""]))}
  download("tasks-"+(V.view==="done"?"completed-":"")+todayS()+".csv","text/csv;charset=utf-8","\uFEFF"+[head,...lines].map(l=>l.map(q).join(",")).join("\r\n"));
  snack("Exported "+lines.length+(lines.length===1?" Row.":" Rows."));
};
$("xics").onclick=()=>{
  const e=s=>String(s??"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\r?\n/g,"\\n");
  const fold=l=>{const out=[];let s=l;while(s.length>73){out.push(s.slice(0,73));s=" "+s.slice(73)}out.push(s);return out.join("\r\n")};
  const host=location.hostname||"site",st=new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d+/,"");
  const L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Tasks//EN","CALSCALE:GREGORIAN","X-WR-CALNAME:Tasks","X-WR-TIMEZONE:"+TZ()];
  let n=0;
  for(const t of T){
    if(t.status!=="active")continue;n++;
    const d=t.due.replace(/-/g,"");
    L.push("BEGIN:VEVENT","UID:"+t.id+"@"+host,"DTSTAMP:"+st);
    if(t.time)L.push("DTSTART;TZID="+TZ()+":"+d+"T"+t.time.replace(":","")+"00","DURATION:PT30M");
    else L.push("DTSTART;VALUE=DATE:"+d,"DTEND;VALUE=DATE:"+addDays(t.due,1).replace(/-/g,""));
    if(t.repeat.unit!=="none"){
      const f={day:"DAILY",week:"WEEKLY",month:"MONTHLY",year:"YEARLY"}[t.repeat.unit];
      L.push("RRULE:FREQ="+f+";INTERVAL="+t.repeat.n+(t.repeat.unit==="month"&&t.day>28?";BYMONTHDAY="+(t.day===31?-1:t.day):""));
    }
    L.push(fold("SUMMARY:"+e(t.name+(t.price!=null?" ("+money(t.price,curOf(t))+")":""))));
    const desc=[t.cat,t.mode&&(t.mode==="online"?"Online":"Offline"),t.notes].filter(Boolean).join("\n");
    if(desc)L.push(fold("DESCRIPTION:"+e(desc)));
    if(t.url)L.push(fold("URL:"+t.url));
    L.push("BEGIN:VALARM","ACTION:DISPLAY",fold("DESCRIPTION:"+e(t.name)),"TRIGGER:-P"+Math.max(0,lead(t))+"D","END:VALARM","END:VEVENT");
  }
  L.push("END:VCALENDAR");
  download("tasks-"+todayS()+".ics","text/calendar;charset=utf-8",L.join("\r\n")+"\r\n");
  snack(n?"Calendar File With "+n+(n===1?" Task. ":" Tasks. ")+"Open it on your phone or computer to add the reminders.":"No Active Tasks to Export.");
};
$("xprint").onclick=()=>{if(V.view==="an")setView("view","list");setTimeout(()=>window.print(),100)};
$("add").onclick=$("addh").onclick=()=>openEditor();

/* keyboard: N adds a task, F searches the tasks, C switches between List and Calendar */
document.addEventListener("keydown",e=>{
  const k=e.key.toLowerCase();
  if(!["n","f","c"].includes(k)||e.ctrlKey||e.metaKey||e.altKey||document.querySelector("dialog[open]"))return;
  const t=e.target;if(t.closest&&t.closest("input,textarea,select,[contenteditable]"))return;
  e.preventDefault();
  if(k==="n")openEditor();
  else if(k==="f"){$("q").focus();$("q").select()}
  else if(V.view==="list"||V.view==="cal")setView("view",V.view==="cal"?"list":"cal");
});
/* minute by minute: when a task's status changes (a time passes, a new day starts), the page redraws */
const stateSig=()=>todayS()+"|"+T.map(t=>stateOf(t)).join("");
let lastSig="";
setInterval(()=>{if(!loaded)return;const s=stateSig();if(s!==lastSig){const first=!lastSig;lastSig=s;if(!first&&!document.querySelector("dialog[open]")&&!popEl)render()}},30000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&!document.querySelector("dialog[open]"))render()});

load();
