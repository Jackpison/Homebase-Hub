const mk=(owner,bank,name,network,variant,type,limit,fee)=>({owner,bank,name,network,variant,type,limit,fee,remark:""});
const SEED=[]; // no built-in cards: data only comes from the server after login

let sort={k:null,d:1},B={},locked=false,pw="",lastAuth=0,pendingFn=null,D=[],P=[],NOTES="",active="All",editing=null,armed=false,server=false,pt,pending=null,hmode="add",hArmed=false;
const $=id=>document.getElementById(id),dlg=$("dlg"),hdlg=$("hdlg"),idlg=$("idlg");
const inr=n=>"₹"+Number(n).toLocaleString("en-IN");
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const cls=t=>t==="LTF"?"ltf":t==="Paid"?"paid":t==="NA"?"na":"fd";
const normExp=v=>{v=String(v||"").trim();if(!v)return"";const m=/^(\d{1,2})\s*[\/\-.]\s*(\d{4})$/.exec(v)||/^(\d{2})(\d{4})$/.exec(v);if(!m||+m[1]<1||+m[1]>12)return null;return String(+m[1]).padStart(2,"0")+"/"+m[2]};
const expKey=e=>{const m=/^(\d{2})\/(\d{4})$/.exec(e||"");return m?+m[2]*100+ +m[1]:null};
const feeTxt=c=>c.fee===0?"Free":c.fee?inr(c.fee)+"/yr":"—";
const num=v=>{const n=parseInt(String(v).replace(/[^0-9]/g,""),10);return isNaN(n)?null:n};
const snap=()=>({cards:D,people:P,notes:NOTES,banks:B,settings:ST});
const status=t=>$("sync").textContent=t;

function apply(s){
  D=s.cards.map((c,i)=>({remark:"",kind:"Credit",expiry:"",id:i,...c,type:c.type==="FD-Backed"?"FD":c.type}));
  P=Array.isArray(s.people)?[...s.people]:[...new Set(D.map(c=>c.owner))];
  NOTES=typeof s.notes==="string"?s.notes:"";
  B=s.banks&&typeof s.banks==="object"&&!Array.isArray(s.banks)?{...s.banks}:{};
  ST=s.settings&&typeof s.settings==="object"&&!Array.isArray(s.settings)?{...s.settings}:{};
  applySettings();
  renderInfo();
}
const HF=(u,o)=>window.HUB?HUB.fetch(u,o):fetch(u,o);   // the site's fetch: longer timeout and a quiet retry on slow hosts
const api=body=>HF("api.php",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
const savedMsg=()=>"Saved to your server";
function persist(){
  try{localStorage.setItem("family4",JSON.stringify(snap()))}catch(e){}
  if(!server){status("Saved in this browser only");return}
  status("Saving…");clearTimeout(pt);
  pt=setTimeout(async()=>{
    try{
      const r=await api({...snap(),pw});
      if(r.status===403){status("You were logged out. Log in again; this change is kept on this device.");if(window.HUB)HUB.login("You were logged out. Log in to save your change.").then(()=>persist(),()=>{});return}
      if(!r.ok)throw 0;
      lastAuth=Date.now();status(savedMsg());
    }catch(e){status("Server save failed. Kept in this browser.")}
  },300);
}
// Visitors (and logged-out browsers) see only this. The server sends no card data until you log in.
function privateScreen(j){
  try{localStorage.removeItem("family4");localStorage.removeItem("cards3");localStorage.removeItem("notes4")}catch(e){}
  const t=(j&&j.settings&&j.settings.title)||document.title||"Cards";
  document.body.innerHTML='<div id="ix-private"><div class="ix-ico"><svg viewBox="0 0 24 24"><path d="M5 11h14v10H5zM8 11V8a4 4 0 0 1 8 0v3"/></svg></div>'+
    '<h1></h1><p>This page is private. Log in to see it.</p><button type="button">Log In</button></div>';
  document.querySelector("#ix-private h1").textContent=t;
  document.querySelector("#ix-private button").onclick=()=>window.HUB?HUB.login("Log in to see your cards.").then(()=>location.reload(),()=>{}):location.reload();
  if(window.HUB&&HUB.ready)HUB.ready();
}
async function load(){
  let local={cards:SEED,people:[...new Set(SEED.map(c=>c.owner))],notes:""};
  try{
    const s=JSON.parse(localStorage.getItem("family4")||"null");
    if(s&&Array.isArray(s.cards))local=s;
    else{const o=JSON.parse(localStorage.getItem("cards3")||"null");
      if(Array.isArray(o)&&o.length)local={cards:o,people:[...new Set(o.map(c=>c.owner))],notes:""}}
    if(!local.notes){local.notes=localStorage.getItem("notes4")||""}
  }catch(e){}
  try{
    const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),15000);
    const r=await HF("api.php",{cache:"no-store",signal:ctl.signal});clearTimeout(to);
    if(!r.ok)throw 0;
    const j=await r.json();
    if(!j||typeof j!=="object")throw 0;
    server=true;locked=!!j.locked;
    if(j.private&&!j.auth){privateScreen(j);return}     // visitors: no card data is ever sent
    if(Array.isArray(j.cards)&&Array.isArray(j.people)){apply(j);status(savedMsg())}
    else{apply({cards:[],people:[],notes:""});status(savedMsg())}
  }catch(e){
    // offline: only this device's own copy, which exists only while you're logged in here
    server=false;
    if(local.cards.length){apply(local);status("Offline: showing this device's copy")}else{privateScreen({});return}
  }
  render();
}

/* official links: bank website and the card's own page on the bank site */
const nk=t=>String(t||"").toLowerCase().replace(/[^a-z0-9]/g,"");
const BANK_URL={
  icici:"https://www.icici.bank.in/",idfcfirst:"https://www.idfcfirst.bank.in/",kotak:"https://www.kotak.bank.in/",
  sbm:"https://www.sbm.bank.in/",supermoney:"https://super.money/",axis:"https://www.axis.bank.in/",
  hdfc:"https://www.hdfc.bank.in/",bob:"https://www.bankofbaroda.in/",bankofbaroda:"https://www.bankofbaroda.in/",
  hsbc:"https://www.hsbc.co.in/",indusind:"https://www.indusind.bank.in/"
};
const CARD_URL={
  "icici|platinum":"https://www.icici.bank.in/personal-banking/cards/credit-card/credit-card-against-fixed-deposit",
  "icici|amazonpay":"https://www.icici.bank.in/personal-banking/cards/amazon-pay",
  "icici|sapphiro":"https://www.icici.bank.in/personal-banking/cards/credit-card/sapphiro-card",
  "icici|rubyx":"https://www.icici.bank.in/personal-banking/cards/credit-card/rubyx-card",
  "idfcfirst|earn":"https://www.idfcfirst.bank.in/credit-card/secured-rupay-credit-card",
  "idfcfirst|wealth":"https://www.idfcfirst.bank.in/credit-card/wealth",
  "kotak|dreamdifferent":"https://www.kotak.bank.in/en/personal-banking/cards/credit-cards/811-dream-different-credit-card.html",
  "sbm|zet":"https://www.sbm.bank.in/personal-banking/cards/secured-credit-card",
  "supermoney|supermoney":"https://super.money/",
  "axis|myzone":"https://www.axis.bank.in/cards/credit-card/axis-bank-my-zone-credit-card",
  "axis|neo":"https://www.axis.bank.in/cards/credit-card/axis-bank-neo-credit-card",
  "axis|flipkart":"https://www.axis.bank.in/cards/credit-card/flipkart-axisbank-credit-card",
  "axis|select":"https://www.axis.bank.in/cards/credit-card/axis-bank-select-credit-card",
  "hdfc|dinersclubprivilege":"https://www.hdfc.bank.in/credit-cards/diners-privilege-credit-card",
  "bob|eterna":"https://www.bankofbaroda.in/personal-banking/digital-products/cards/eterna",
  "hsbc|platinum":"https://www.hsbc.co.in/credit-cards/products/visa-platinum",
  "hsbc|live":"https://www.hsbc.co.in/credit-cards/products/live-plus",
  "indusind|tiger":"https://www.indusind.bank.in/in/en/personal/cards/credit-card/tiger-credit-card.html"
};
const safeUrl=u=>{try{const x=new URL(String(u).trim());return(x.protocol==="https:"||x.protocol==="http:")?x.href:""}catch(e){return""}};
const bankUrl=c=>safeUrl(B[nk(c.bank)]||"")||BANK_URL[nk(c.bank)]||"";
const cardUrl=c=>safeUrl(c.url||"")||CARD_URL[nk(c.bank)+"|"+nk(c.name)]||"";
const linkTo=(u,t)=>u?`<a class="lk" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(t)}</a>`:esc(t);
let F={q:"",bank:"",net:"",kind:""};
const hasF=()=>!!(F.q.trim()||F.bank||F.net||F.kind||active!=="All");
function fillSel(id,key,any,vals){
  if(F[key]&&!vals.includes(F[key]))F[key]="";
  const el=$(id);
  el.innerHTML=`<option value="">${any}</option>`+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
  el.value=F[key];
}
function view(){
  const q=F.q.trim().toLowerCase();
  const l=(active==="All"?D:D.filter(c=>c.owner===active)).filter(c=>
    (!F.bank||c.bank===F.bank)&&(!F.net||c.network===F.net)&&(!F.kind||(c.kind||"Credit")===F.kind)&&
    (!q||[c.bank,c.name,c.owner,c.network,c.variant,c.type,c.kind,c.remark].join(" ").toLowerCase().includes(q)));
  return sorted(l);
}
const COLDEF=[
 {k:"bank",l:"Bank",w:"1fr"},{k:"name",l:"Card",w:"1.3fr"},{k:"network",l:"Network",w:".8fr"},{k:"variant",l:"Variant",w:".8fr"},
 {k:"limit",l:"Limit",w:".8fr"},{k:"owner",l:"Holder",w:".8fr"},{k:"kind",l:"Type",w:".7fr"},{k:"type",l:"Base",w:".7fr"},
 {k:"fee",l:"Charges",w:".8fr"},{k:"expiry",l:"Expiry",w:".8fr"},{k:"remark",l:"Remark",w:"1fr",ns:true}];
const COLS=COLDEF.filter(c=>!c.ns).map(c=>[c.k,c.l]);
const DEFAULT_ORDER=COLDEF.map(c=>c.k);
let ST={};
const colOrder=()=>{const o=(Array.isArray(ST.order)?ST.order:[]).filter(k=>DEFAULT_ORDER.includes(k));DEFAULT_ORDER.forEach(k=>{if(!o.includes(k))o.push(k)});return[...new Set(o)]};
const defOf=k=>COLDEF.find(c=>c.k===k);
const NETH={visa:215,rupay:28,mastercard:2,amex:165,dinersclub:270};
const PALH=[45,150,195,85,265,30];
const HOLDERH={eti:330};
const hh=t=>{let h=0;for(const ch of String(t))h=(h*31+ch.charCodeAt(0))>>>0;return PALH[h%PALH.length]};
const hsl=h=>`hsl(${h} 82% var(--tl))`;
const netColor=n=>hsl(NETH[nk(n)]??hh(n||""));
const holderColor=o=>hsl(HOLDERH[nk(o)]??hh(o));
const CELLS={
 bank:c=>`<div data-l="Bank">${linkTo(bankUrl(c),c.bank)}</div>`,
 name:c=>`<div class="name" data-l="Card">${linkTo(cardUrl(c),c.name)}</div>`,
 network:c=>`<div data-l="Network"${c.network?` style="color:${netColor(c.network)};font-weight:700"`:""}>${esc(c.network)||"—"}</div>`,
 variant:c=>`<div data-l="Variant">${esc(c.variant)||"—"}</div>`,
 limit:c=>`<div data-l="Limit"${c.limit?' class="c-lim"':""}>${c.limit?inr(c.limit):"Not Set"}</div>`,
 owner:c=>`<div data-l="Holder" style="color:${holderColor(c.owner)};font-weight:700">${esc(c.owner)}</div>`,
 kind:c=>`<div data-l="Type" class="k-${esc((c.kind||"Credit").toLowerCase())}">${esc(c.kind||"Credit")}</div>`,
 type:c=>`<div data-l="Base"><span class="badge ${cls(c.type)}">${esc(c.type)}</span></div>`,
 fee:c=>`<div data-l="Charges">${feeTxt(c)}</div>`,
 expiry:c=>`<div data-l="Expiry"${c.expiry?' class="c-exp"':""}>${esc(c.expiry)||"—"}</div>`,
 remark:c=>`<div class="rem w" data-l="Remark">${esc(c.remark)||"—"}</div>`
};
const favEl=$("fav"),touchEl=$("touch"),DEF_FAV=favEl.href,DEF_TOUCH=touchEl.href,DEF_TITLE="Cards";
const pageTitle=()=>ST.title||DEF_TITLE;
function applySettings(){const t=pageTitle();document.title=t;$("ptitle").textContent=t;favEl.href=DEF_FAV;touchEl.href=DEF_TOUCH}
function sorted(list){
  if(!sort.k)return list;
  const k=sort.k,d=sort.d;
  return [...list].sort((a,b)=>{
    const gv=c=>k==="expiry"?expKey(c.expiry):c[k];const x=gv(a),y=gv(b),nx=x==null||x==="",ny=y==null||y==="";
    if(nx&&ny)return 0;if(nx)return 1;if(ny)return -1;
    const r=typeof x==="number"&&typeof y==="number"?x-y:String(x).localeCompare(String(y),undefined,{sensitivity:"base",numeric:true});
    return r*d;
  });
}
try{const t=JSON.parse(localStorage.getItem("sort4")||"null");if(t&&COLS.some(c=>c[0]===t.k)&&(t.d===1||t.d===-1))sort={k:t.k,d:t.d}}catch(e){}
const saveSort=()=>{try{localStorage.setItem("sort4",JSON.stringify(sort))}catch(e){}};
(function(){
  let o='<option value="">Default Order</option>';
  COLS.forEach(([k,l])=>{o+=`<option value="${k}:1">${l}, A to Z / low to high</option><option value="${k}:-1">${l}, Z to A / high to low</option>`});
  $("sortSel").innerHTML=o;
  $("sortSel").onchange=e=>{const v=e.target.value;if(!v)sort={k:null,d:1};else{const[a,b]=v.split(":");sort={k:a,d:+b}}saveSort();render()};
})();
function render(){
  if(active!=="All"&&!P.includes(active))active="All";
  const list=view();
  const uniq=a=>[...new Set(a.filter(Boolean))].sort((x,y)=>x.localeCompare(y));
  fillSel("fbank","bank","Any bank",uniq(D.map(c=>c.bank)));
  fillSel("fnet","net","Any network",uniq(D.map(c=>c.network)));
  $("fkind").value=F.kind;
  $("fholder").innerHTML='<option value="All">All Holders</option>'+P.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join("");
  $("fholder").value=active;
  $("sortSel").value=sort.k?sort.k+":"+sort.d:"";
  const count=t=>list.filter(c=>c.type===t).length;
  const total=list.reduce((s,c)=>s+(c.limit||0),0);
  const yearly=list.reduce((s,c)=>s+(c.fee||0),0);
  const nDebit=list.filter(c=>c.kind==="Debit").length;
  $("stats").innerHTML=
    `<div class="stat" style="--sc:var(--s-cards)"><b>${list.length}</b><span>Cards (${list.length-nDebit} credit, ${nDebit} debit)</span></div>
     <div class="stat" style="--sc:var(--ltf)"><b>${count("LTF")}</b><span>Lifetime Free</span></div>
     <div class="stat" style="--sc:var(--fd)"><b>${count("FD")}</b><span>FD</span></div>
     <div class="stat" style="--sc:var(--paid)"><b>${count("Paid")}</b><span>Paid</span></div>
     <div class="stat" style="--sc:var(--s-teal)"><b>${inr(yearly)}</b><span>Charges per Year</span></div>`;
  const order=colOrder();
  $("list").style.setProperty("--cols",order.map(k=>defOf(k).w).join(" ")+" 56px");
  $("list").innerHTML=
    `<div class="row head">`+order.map(k=>{const d=defOf(k);return d.ns?`<span>${d.l}</span>`:`<span><button class="sh" data-k="${k}" data-on="${sort.k===k?1:0}" aria-label="Sort by ${d.l}">${d.l}${sort.k===k?(sort.d===1?" ▲":" ▼"):""}</button></span>`}).join("")+`<span></span></div>`+
    (list.map(c=>`<div class="row item" data-id="${c.id}">${order.map(k=>CELLS[k](c)).join("")}<div class="w"><button class="edit rowedit" data-id="${c.id}">Edit</button></div></div>`).join("")||`<div class="empty">${hasF()?"No cards match these filters. Press Clear to show them all.":"No cards here yet. Use the pencil icon in the bar, then Add card."}</div>`);
}

function openCard(c){
  editing=c;
  $("owner").innerHTML=P.map(p=>`<option>${esc(p)}</option>`).join("");
  const d=c||{bank:"",name:"",network:"",variant:"",kind:"Credit",type:"LTF",limit:null,fee:0,expiry:"",remark:"",owner:active!=="All"?active:P[0]};
  $("dt").textContent=c?`Edit ${c.bank} ${c.name}`:"Add card";
  $("saveBtn").textContent=c?"Save changes":"Add card";
  $("bank").value=d.bank;$("name").value=d.name;$("network").value=d.network;$("variant").value=d.variant;
  $("kind").value=d.kind||"Credit";$("expiry").value=d.expiry||"";$("expiry").setCustomValidity("");$("type").value=d.type;$("limit").value=d.limit??"";$("fee").value=d.fee??"";
  $("owner").value=d.owner;$("remark").value=d.remark||"";$("url").value=d.url||"";
  armed=false;$("del").textContent="Delete";$("del").hidden=!c;
  dlg.showModal();
}
function openHolder(mode){
  if(mode==="edit"&&!P.length)return;
  hmode=mode;hArmed=false;
  $("ht").textContent=mode==="add"?"Add holder":"Edit holder";
  $("hselw").hidden=mode==="add";$("hdel").hidden=mode==="add";
  $("hlabel").textContent=mode==="add"?"Name":"New name";
  $("hok").textContent=mode==="add"?"Add holder":"Save name";
  $("hdel").textContent="Delete holder";$("hmsg").textContent="";
  if(mode==="edit"){
    $("hsel").innerHTML=P.map(p=>`<option>${esc(p)}</option>`).join("");
    $("hsel").value=active!=="All"?active:P[0];$("hname").value=$("hsel").value;
  }else $("hname").value="";
  hdlg.showModal();
}

/* menu */
const pop=$("pop"),mb=$("menuBtn"),pop2=$("pop2"),mb2=$("menuBtn2");
const closeMenu=()=>{[[pop,mb],[pop2,mb2]].forEach(([p,b])=>{p.hidden=true;b.setAttribute("aria-expanded","false")})};
const toggleMenu=(p,b)=>{const was=p.hidden;closeMenu();p.hidden=!was;b.setAttribute("aria-expanded",String(was))};
mb.onclick=e=>{e.stopPropagation();$("mLock").hidden=!server;toggleMenu(pop,mb)};
mb2.onclick=e=>{e.stopPropagation();toggleMenu(pop2,mb2)};
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeMenu()});
const onPop=e=>{
  const a=e.target.closest("button");if(!a)return;
  closeMenu();
  const k=a.dataset.a;
  if(k==="card")guard(()=>{P.length?openCard(null):openHolder("add")});
  else if(k==="holder")guard(()=>openHolder("add"));
  else if(k==="editholder")guard(()=>openHolder("edit"));
  else if(k==="editbank")guard(()=>openBank());
  else if(k==="reorder")guard(openOrder);
  else if(k==="title")guard(openTitle);
  else if(k==="import")$("file").click();
  else if(k==="password")HUB.settings("security");
  else if(k==="lock"){if(window.HUB)HUB.logout()}
  else if(k==="xlsx")guard(exportXlsx);
  else if(k==="pdf")guard(exportPdf);
  else if(k==="export")guard(()=>{
    const blob=new Blob([JSON.stringify({version:1,exported:new Date().toISOString(),...snap()},null,2)],{type:"application/json"});
    const l=document.createElement("a");l.href=URL.createObjectURL(blob);
    l.download="cards-backup-"+new Date().toISOString().slice(0,10)+".json";
    document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(l.href),1000);
  });
};
pop.addEventListener("click",onPop);pop2.addEventListener("click",onPop);

document.addEventListener("click",e=>{
  if(!e.target.closest(".menu"))closeMenu();
  const h=e.target.closest(".sh");
  if(h){
    const k=h.dataset.k;
    if(sort.k!==k)sort={k,d:1};else if(sort.d===1)sort.d=-1;else sort={k:null,d:1};
    saveSort();render();return;
  }
  const r=e.target.closest(".rowedit");
  if(r){const c=D.find(x=>x.id===+r.dataset.id);guard(()=>openCard(c))}
});
$("cancel").onclick=()=>dlg.close();
$("hcancel").onclick=()=>hdlg.close();
$("icancel").onclick=()=>idlg.close();

$("form").addEventListener("submit",()=>{
  const v={owner:$("owner").value,bank:$("bank").value.trim(),name:$("name").value.trim(),
    network:$("network").value.trim(),variant:$("variant").value.trim(),type:$("type").value,kind:$("kind").value,expiry:normExp($("expiry").value)||"",
    limit:num($("limit").value),fee:num($("fee").value),remark:$("remark").value.trim(),url:safeUrl($("url").value)};
  if(editing)Object.assign(editing,v);
  else D.push({id:Math.max(-1,...D.map(c=>c.id))+1,...v});
  persist();render();
});
$("expiry").addEventListener("input",()=>{const v=$("expiry").value;$("expiry").setCustomValidity(v.trim()===""||normExp(v)!==null?"":"Use MM/YYYY, for example 03/2033")});
$("del").onclick=()=>{
  if(!armed){armed=true;$("del").textContent="Tap again to confirm";return}
  D=D.filter(c=>c!==editing);armed=false;persist();dlg.close();render();
};

$("hsel").onchange=()=>{$("hname").value=$("hsel").value;hArmed=false;$("hdel").textContent="Delete holder";$("hmsg").textContent=""};
$("hform").addEventListener("submit",()=>{
  const n=$("hname").value.trim();if(!n)return;
  const same=p=>p.toLowerCase()===n.toLowerCase();
  if(hmode==="add"){const f=P.find(same);if(!f)P.push(n);active=f||n}
  else{
    const old=$("hsel").value;
    if(n!==old&&!P.some(p=>same(p)&&p!==old)){
      P=P.map(p=>p===old?n:p);D.forEach(c=>{if(c.owner===old)c.owner=n});if(active===old)active=n;
    }
  }
  persist();render();
});
$("hdel").onclick=()=>{
  const p=$("hsel").value;
  if(D.some(c=>c.owner===p)){$("hmsg").textContent=`${p} still has cards. Delete or move them first.`;return}
  if(!hArmed){hArmed=true;$("hdel").textContent="Tap again to confirm";return}
  P=P.filter(x=>x!==p);if(active===p)active="All";persist();hdlg.close();render();
};

/* readable exports */
const curList=()=>view();
const stamp=()=>new Date().toISOString().slice(0,10);
const slug=()=>(active==="All"?"all":active).toLowerCase().replace(/[^a-z0-9]+/g,"-");
const EXV={bank:c=>c.bank,name:c=>c.name,network:c=>c.network,variant:c=>c.variant,limit:c=>c.limit??"",owner:c=>c.owner,kind:c=>c.kind||"Credit",type:c=>c.type,fee:c=>c.fee===0?"Free":(c.fee??""),expiry:c=>c.expiry||"",remark:c=>c.remark};
const PV={bank:c=>esc(c.bank),name:c=>esc(c.name),network:c=>esc(c.network),variant:c=>esc(c.variant),limit:c=>c.limit?inr(c.limit):"—",owner:c=>esc(c.owner),kind:c=>esc(c.kind||"Credit"),type:c=>esc(c.type),fee:c=>feeTxt(c),expiry:c=>esc(c.expiry)||"—",remark:c=>esc(c.remark)};
const XW={bank:14,name:24,network:13,variant:12,limit:12,owner:12,kind:9,type:9,fee:11,expiry:10,remark:32};
function saveBlob(blob,name){
  const l=document.createElement("a");l.href=URL.createObjectURL(blob);l.download=name;
  document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(l.href),1000);
}
/* The Excel library (880 KB) is only loaded when you export, from this site (no outside server ever sees the page). */
let xlsxLoad=null;
function loadXlsx(){
  if(window.XLSX)return Promise.resolve(true);
  return xlsxLoad||(xlsxLoad=new Promise(ok=>{const s=document.createElement("script");s.src="../core-data/assets/vendor/xlsx.full.min.js?v=0.18.5";
    s.onload=()=>ok(!!window.XLSX);s.onerror=()=>{xlsxLoad=null;ok(false)};document.head.appendChild(s)}));
}
async function exportXlsx(){
  await loadXlsx();   // falls back to a CSV file if it can't load
  const l=curList(),order=colOrder(),total=l.reduce((s,c)=>s+(c.limit||0),0),yearly=l.reduce((s,c)=>s+(c.fee||0),0);
  const tot=order.map((k,i)=>k==="limit"?(total||""):k==="fee"?(yearly||""):(i===0?"Totals":""));
  const aoa=[order.map(k=>defOf(k).l),...l.map(c=>order.map(k=>EXV[k](c))),[],tot];
  const name=`cards-${slug()}-${stamp()}.xlsx`;
  if(!window.XLSX){
    const q=v=>{v=String(v??"");return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
    saveBlob(new Blob(["\uFEFF"+aoa.map(r=>r.map(q).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"}),name.replace(".xlsx",".csv"));
    return;
  }
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"]=order.map(k=>({wch:XW[k]}));
  for(let r=1;r<aoa.length;r++)order.forEach((k,c)=>{if(k==="limit"||k==="fee"){const x=ws[XLSX.utils.encode_cell({r,c})];if(x&&x.t==="n")x.z='"₹"#,##0'}});
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,"Cards");
  if(NOTES.trim()){
    const wi=XLSX.utils.aoa_to_sheet([["Information"],...NOTES.split(/\r?\n/).map(x=>[x])]);
    wi["!cols"]=[{wch:110}];XLSX.utils.book_append_sheet(wb,wi,"Information");
  }
  XLSX.writeFile(wb,name);
}
function exportPdf(){
  const l=curList(),order=colOrder(),total=l.reduce((s,c)=>s+(c.limit||0),0),yearly=l.reduce((s,c)=>s+(c.fee||0),0);
  const who=active==="All"?"All holders":active;
  const tr=l.map(c=>`<tr>${order.map(k=>`<td>${PV[k](c)}</td>`).join("")}</tr>`).join("");
  const tot=order.map((k,i)=>`<td>${k==="limit"?(total?inr(total):"—"):k==="fee"?inr(yearly):(i===0?"Totals":"")}</td>`).join("");
  $("printArea").innerHTML=`<h1>${esc(pageTitle())}</h1><p>${esc(who)}, ${l.length} cards, ${stamp()}</p>
    <table><thead><tr>${order.map(k=>`<th>${defOf(k).l}</th>`).join("")}</tr></thead><tbody>${tr}<tr class="tot">${tot}</tr></tbody></table>
    ${NOTES.trim()?`<h2>Information</h2><div class="pinfo">${esc(NOTES)}</div>`:""}`;
  window.print();
}

/* edit bank */
const bdlg=$("bdlg");
function fillBank(){
  const n=$("bsel").value,k=nk(n);
  $("bname").value=n;$("burl").value=B[k]||"";$("burl").placeholder=BANK_URL[k]||"https://…";
  $("bmsg").textContent="Leave the link blank to use the default one.";
}
function openBank(){
  const banks=[...new Set(D.map(c=>c.bank))].sort((a,b)=>a.localeCompare(b));
  if(!banks.length)return;
  $("bsel").innerHTML=banks.map(b=>`<option>${esc(b)}</option>`).join("");
  fillBank();bdlg.showModal();
}
$("bsel").onchange=fillBank;
$("bcancel").onclick=()=>bdlg.close();
$("bsave").onclick=()=>{
  const old=$("bsel").value,nn=$("bname").value.trim(),raw=$("burl").value.trim();
  if(!nn){$("bmsg").textContent="Enter a bank name.";return}
  const u=raw?safeUrl(raw):"";
  if(raw&&!u){$("bmsg").textContent="Enter a full link starting with https://";return}
  if(nn!==old)D.forEach(c=>{if(c.bank===old)c.bank=nn});
  delete B[nk(old)];
  if(u)B[nk(nn)]=u;
  persist();render();bdlg.close();
};

/* reorder columns */
const odlg=$("odlg");let wo=[];
function drawOrder(){
  $("olist").innerHTML=wo.map((k,i)=>`<div class="orow"><span>${i+1}. ${defOf(k).l}</span><span><button type="button" data-m="${i}:-1" aria-label="Move up"${i===0?" disabled":""}>▲</button><button type="button" data-m="${i}:1" aria-label="Move Down"${i===wo.length-1?" disabled":""}>▼</button></span></div>`).join("");
}
function openOrder(){wo=colOrder();drawOrder();odlg.showModal()}
$("olist").addEventListener("click",e=>{
  const b=e.target.closest("button[data-m]");if(!b)return;
  const[i,d]=b.dataset.m.split(":").map(Number),j=i+d;
  if(j<0||j>=wo.length)return;
  [wo[i],wo[j]]=[wo[j],wo[i]];drawOrder();
});
$("oreset").onclick=()=>{wo=[...DEFAULT_ORDER];drawOrder()};
$("ocancel").onclick=()=>odlg.close();
$("osave").onclick=()=>{ST.order=[...wo];persist();render();odlg.close()};

/* page title (the icon is the site logo, set in the main Settings) */
const tdlg=$("tdlg");
function openTitle(){$("ttl").value=pageTitle();tdlg.showModal()}
$("tcancel").onclick=()=>tdlg.close();
$("tsave").onclick=()=>{
  const t=$("ttl").value.trim();
  ST.title=(t&&t!==DEF_TITLE)?t:"";
  delete ST.icon;   // page icons are gone: one logo for the whole site
  persist();applySettings();render();tdlg.close();
};

/* login: the site's one login box */
function guard(fn){
  if(!server||HUB.isAdmin()){fn();return}
  HUB.login("Log in to make changes.").then(fn,()=>{});
}
/* import */
$("file").onchange=async e=>{
  const f=e.target.files[0];e.target.value="";if(!f)return;
  try{
    const j=JSON.parse(await f.text());
    if(!Array.isArray(j.cards)||!Array.isArray(j.people))throw 0;
    pending=j;$("iok").hidden=false;
    $("imsg").textContent=`This backup has ${j.cards.length} cards and ${j.people.length} holders. It will replace everything currently on the page.`;
  }catch(err){pending=null;$("iok").hidden=true;$("imsg").textContent="That file isn't a valid backup."}
  idlg.showModal();
};
$("iform").addEventListener("submit",()=>{
  if(!pending)return;
  const j=pending;pending=null;
  guard(()=>{apply(j);active="All";persist();render()});
});

/* information */
function linkify(t){
  return esc(t).replace(/(https?:\/\/[^\s]+?)([.,;:!?)\]]*)(?=\s|$)/g,
    (m,u,x)=>`<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>${x}`);
}
function renderInfo(){
  $("info").innerHTML=NOTES.trim()?linkify(NOTES):'<span class="rem">Nothing here yet. Click Edit to add links and info.</span>';
}
const infoMode=on=>{$("infoForm").hidden=!on;$("info").hidden=on;$("infoEdit").hidden=on};
$("infoEdit").onclick=()=>guard(()=>{$("notes").value=NOTES;infoMode(true);$("notes").focus()});
$("infoCancel").onclick=()=>infoMode(false);
$("infoSave").onclick=()=>{NOTES=$("notes").value;persist();renderInfo();infoMode(false)};

$("fq").addEventListener("input",e=>{F.q=e.target.value;render()});
[["fbank","bank"],["fnet","net"],["fkind","kind"]].forEach(([id,k])=>$(id).addEventListener("change",e=>{F[k]=e.target.value;render()}));
$("fholder").addEventListener("change",e=>{active=e.target.value;render()});
$("fclear").onclick=()=>{F={q:"",bank:"",net:"",kind:""};active="All";$("fq").value="";render()};

const SUN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const isLight=()=>document.documentElement.getAttribute("data-theme")==="light";
function syncTheme(){
  const t=isLight()?"Switch to Dark Mode":"Switch to Light Mode";
  $("themeBtn").innerHTML=isLight()?MOON:SUN;$("themeBtn").title=t;$("themeBtn").setAttribute("aria-label",t);
}
$("themeBtn").onclick=()=>{
  const wasLight=isLight();
  if(wasLight)document.documentElement.removeAttribute("data-theme");else document.documentElement.setAttribute("data-theme","light");
  try{localStorage.setItem("theme4",wasLight?"dark":"light")}catch(e){}
  syncTheme();
};
syncTheme();

load();
