/* editing mode: the Edit button logs in (or offers to create a password) and shows the editing bar */
function setEdit(on){
  EDIT=on;document.body.classList.toggle("editing",on);
  $("ebar").hidden=!on;$("editBtn").hidden=on;renderAuth();renderTabs();
}
function renderAuth(){$("eLogout").hidden=!(server&&locked&&authed)}
$("editBtn").onclick=()=>{
  if(EDIT){if(openEdits()){setStatus("Save or cancel the box you're editing first.");return}setEdit(false);return}   // the E key turns editing off again
  if(!loaded){setStatus("Still loading. Try again in a moment.");return}
  if(server&&!locked){HUB.login().then(()=>location.reload(),()=>{});return}   // a new site: the login box sets the password
  guard(()=>setEdit(true));
};
$("closedLogin").onclick=()=>guard(()=>{});
$("ebar").addEventListener("click",e=>{
  const b=/** @type {any} */ (e.target).closest("[data-e]");if(!b)return;const k=b.dataset.e;
  if(k==="colors")guard(openColors);
  else if(k==="settings")guard(openSettings);
  else if(k==="backup")guard(openBackup);
  else if(k==="logout")logout();
  else if(k==="done"){if(openEdits()){setStatus("Save or cancel the box you're editing first.");return}setEdit(false)}
});
async function logout(){
  if(openEdits()){setStatus("Save or cancel the box you're editing first.");return}
  // Private tabs, their unsaved drafts, search results and export leftovers leave this device.
  TABS.filter(t=>t.private||PAGE.private).forEach(t=>t.boxes.forEach(b=>dSet(b,null)));
  try{sessionStorage.clear()}catch(e){}
  q.value="";HL="";drawResults();sres.innerHTML="";$("printArea").innerHTML="";
  KEY=null;DEC.clear();devClear();dropAuth();setEdit(false);
  try{const j=await fetchData();applyData(j);PAGE.iconHash=(j.page&&j.page.iconHash)||"";authed=!!j.auth;keepLocal()}
  catch(e){applyData({tabs:plainTabs().filter(t=>!t.private),rev:REV,page:PAGE,timer:TIMER});keepLocal()}
  setStatus("Logged out.");
}

/* dark / light mode, remembered in this browser */
const SUN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>';
const MOON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/></svg>';
function renderTheme(){
  const light=document.documentElement.dataset.theme==="light",b=$("themeBtn");
  b.innerHTML=light?MOON:SUN; // the icon shows the mode you'll switch to
  b.title=light?"Switch to Dark Mode":"Switch to Light Mode";b.setAttribute("aria-label",b.title);
}
$("themeBtn").onclick=()=>{
  const light=document.documentElement.dataset.theme!=="light";
  if(light)document.documentElement.dataset.theme="light";else delete document.documentElement.dataset.theme;
  lsSet("info3-theme",light?"light":"dark");renderTheme();
};
renderTheme();
document.addEventListener("hub:theme",renderTheme);

const nowS=()=>Math.floor(Date.now()/1000);

/* custom background colors (Main > Edit color) */
const CVAR={bg:"--bg",box:"--box",panel:"--panel"};
function applyColors(c){
  const block=(sel,x)=>{let r="";for(const k in CVAR)if(x&&okColor(x[k]))r+=CVAR[k]+":"+x[k]+";";return r?sel+"{"+r+"}":""};
  let el=$("userColors");if(!el){el=document.createElement("style");el.id="userColors";document.head.appendChild(el)}
  el.textContent=block(":root",c.dark)+block(':root[data-theme="light"]',c.light);
}
const kdlg=$("kdlg"),kInputs=()=>[...kdlg.querySelectorAll("input[type=color]")];
/** @type {any} */
let KDRAFT=null;
let kSaved=false;
function openColors(){
  KDRAFT={};for(const m in DEF_COLORS){KDRAFT[m]={};for(const k in CVAR)KDRAFT[m][k]=/** @type {any} */ (PAGE.colors)[m][k]||DEF_COLORS[m][k]}
  kInputs().forEach(x=>x.value=KDRAFT[x.dataset.m][x.dataset.k]);
  kSaved=false;$("kmsg").textContent="";kdlg.showModal();
}
// Only colors that differ from the defaults are stored; the rest stay automatic.
const kDiff=()=>{const o={};for(const m in KDRAFT){o[m]={};for(const k in CVAR)o[m][k]=KDRAFT[m][k]===DEF_COLORS[m][k]?"":KDRAFT[m][k]}return o};
kdlg.addEventListener("input",e=>{const x=e.target;if(x.type!=="color")return;KDRAFT[x.dataset.m][x.dataset.k]=x.value.toLowerCase();applyColors(KDRAFT)});
kdlg.addEventListener("close",()=>{if(!kSaved)applyColors(PAGE.colors)}); // Cancel or esc puts the page back
$("kcancel").onclick=()=>{applyColors(PAGE.colors);kdlg.close()};
$("kdef").onclick=()=>{KDRAFT=JSON.parse(JSON.stringify(DEF_COLORS));kInputs().forEach(x=>x.value=KDRAFT[x.dataset.m][x.dataset.k]);applyColors(KDRAFT);
  $("kmsg").textContent="Default colors restored. Click Save colors to keep them."};
async function saveColors(){
  const colors=kDiff();$("kmsg").textContent="";
  if(!server){PAGE.colors=normColors(colors);keepLocal();kSaved=true;kdlg.close();return}
  $("ksave").disabled=true;
  try{
    const r=await api({action:"save_colors",colors});
    if(r.status===403){dropAuth();setStatus(savedMsg());guard(saveColors);return}
    if(r.status===429){$("kmsg").textContent="Too many wrong password tries. Wait a few minutes, then try again.";return}
    if(!r.ok)throw 0;
    const j=await r.json();PAGE.colors=normColors(j.page.colors);keepLocal();
    kSaved=true;applyColors(PAGE.colors);kdlg.close();setStatus(savedMsg());
  }catch(e){$("kmsg").textContent="Couldn't reach the server, so the colors weren't saved."}
  finally{$("ksave").disabled=false}
}
$("kform").addEventListener("submit",e=>{e.preventDefault();saveColors()});

