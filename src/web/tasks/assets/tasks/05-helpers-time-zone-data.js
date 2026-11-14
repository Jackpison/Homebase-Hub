/* ---------- helpers ---------- */
/** @type {(id: string) => any} */   // (any: the page knows which element each id is)
const $=id=>document.getElementById(id);
const esc=HUB.esc;   // the shell's HTML escaper (shell.js, loaded first)
const HF=HUB.fetch;
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
/** @type {any} */
let V={...VDEF};
try{Object.assign(V,JSON.parse(localStorage.getItem(VKEY)||"{}")||{})}catch(e){}
if(!["list","cal","an","done"].includes(V.view))V.view="list";
if(!["month","week","year"].includes(V.calV))V.calV="month";
V.q="";V.day="";V.dq="";V.calSel="";V.calM="";V.wk=0;
const keepView=()=>{try{localStorage.setItem(VKEY,JSON.stringify({...V,q:"",day:"",dq:"",calSel:"",calM:"",wk:0}))}catch(e){}};

