/* ---------- page settings ---------- */
$("psets").onclick=()=>{
  $("s-cur").innerHTML=CURS.map(c=>'<option value="'+c[0]+'"'+(SET.currency===c[0]?" selected":"")+'>'+c[1]+'</option>').join("")+'<option value=""'+(SET.currency===""?" selected":"")+'>No Currency Sign</option>';
  $("s-soon").value=String([0,1,3,7,14,30].includes(SET.soon)?SET.soon:7);
  ["start","range","sort","cal","week","dates"].forEach(k=>$("s-"+k).value=SET[k]||SET_DEF[k]);
  $("s-stats").checked=SET.stats!==false;
  calDraw({on:false,link:""});calLoad();subsDraw();
  $("sdlg").showModal();
};
/* the calendar link: kept on the server on its own, so it takes effect at once (not with Save Settings) */
let CAL={on:false,link:""};
function calDraw(c){CAL=c;$("s-calon").checked=!!c.on;$("s-calbox").hidden=!c.on||!c.link;const u=c.link?new URL(c.link,location.href).href:"";$("s-calurl").value=u;const w=u.replace(/^https?:/,"webcal:");$("s-calapple").href=u?w:"#";$("s-calgoogle").href=u?"https://calendar.google.com/calendar/r?cid="+encodeURIComponent(w):"#"}
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
  const t=/** @type {any} */ (e.target);if(t.closest&&t.closest("input,textarea,select,[contenteditable]"))return;
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

load();subsLoad();   // (1.72.0) the calendars you follow
