/* page title and icon */
const DEFAULT_ICON=$("favIcon").getAttribute("href");
const pageName=()=>PAGE.title.trim()||"Information";
function renderPage(){
  /** @type {HTMLElement} */ (document.querySelector(".search")).hidden=CLOSED;
  $("ptitle").textContent=pageName();document.title=pageName();
  $("favIcon").href=DEFAULT_ICON;$("touchIcon").href=DEFAULT_ICON;   // the shell puts the site logo here when one is set
}

/* Settings: site title, icon, privacy and password */
const setdlg=$("setdlg");
function openSettings(){
  $("gin").value=PAGE.title;
  fillSettings();$("setmsg").textContent="";if(!setdlg.open)setdlg.showModal();
}
// The privacy and password parts, which change when a password is created or removed.
function fillSettings(){
  const noPw=!server||!locked;
  $("spriv").checked=PAGE.private;$("spriv").disabled=noPw;
  $("sprivnote").textContent=noPw?"Set a website password first."
    :"";
}
$("setcancel").onclick=()=>setdlg.close();
$("setsizes").onclick=()=>setdlg.close();   // the shell then opens Text Sizes (data-hub-action="sizes")
async function saveSettings(){
  const p={title:$("gin").value.trim().slice(0,60),icon:"",private:$("spriv").checked},m=$("setmsg");   // icon "": the page icon is gone, the site logo is used
  m.textContent="";
  if(!server){Object.assign(PAGE,p);keepLocal();renderPage();setdlg.close();return}
  $("setsave").disabled=true;
  // The window closes and the title changes at once; the server catches up. If it refuses, the old settings come back and the window opens again with the reason.
  const prev={title:PAGE.title,private:PAGE.private};
  Object.assign(PAGE,{title:p.title,private:p.private});renderPage();setStatus("Saving…");setdlg.close();
  const back=msg=>{Object.assign(PAGE,prev);renderPage();openSettings();$("gin").value=p.title;$("spriv").checked=p.private;$("setmsg").textContent=msg};
  try{
    const r=await api({action:"save_page",...p});
    if(r.status===403){dropAuth();back("");setStatus(savedMsg());guard(saveSettings);return}
    if(r.status===429){back("Too many wrong password tries. Wait a few minutes, then try again.");setStatus("Not saved");return}
    if(r.status===400){back("That icon couldn't be saved. Try a different image.");setStatus("Not saved");return}
    if(!r.ok)throw 0;
    const j=await r.json();PAGE=normPage(j.page);PAGE.iconHash="";keepLocal();renderPage();setStatus(savedMsg());
  }catch(e){back("Couldn't reach the server, so nothing was changed.");setStatus("Not saved to the server.")}
  finally{$("setsave").disabled=false}
}
$("setform").addEventListener("submit",e=>{e.preventDefault();saveSettings()});

