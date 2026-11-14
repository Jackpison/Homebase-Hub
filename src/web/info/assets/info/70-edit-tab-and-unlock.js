/* Edit Tab / New Tab: the window itself is shared with Links (tabs.js); what saving does is Info's own. */
function nextTabName(){let n=TABS.length+1;const names=new Set(TABS.map(t=>t.name.trim().toLowerCase()));while(names.has("tab "+n))n++;return"Tab "+n}
// A tab as the server takes it. The colors that come from a tab's position are fixed first, so tabs keep their colors when positions change.
const tabItem=(t,i)=>({id:t.id,name:t.name,color:tabColor(t,i),hc:t.hc,layout:t.layout,icon:t.icon,private:t.private,enc:t.enc});
function openTabEditor(id){
  const i=id?TABS.findIndex(t=>t.id===id):-1,t=i>=0?TABS[i]:null;
  if(!t&&TABS.length>=MAXTAB)return;
  const pos=t?i:TABS.length,noPw=server&&!locked;
  // Encrypt needs a password, a secure (https) page and the server; an encrypted tab is always private.
  const encWhy=!CAN_ENC?"Encryption needs the page to be opened over a secure (https) connection."
    :!server?"Encryption needs the server, which can't be reached right now."
    :!locked?"Create a password first (in Settings), then you can encrypt tabs."
    :!PAGE.vault&&!(t&&t.enc)?"Set an encryption passphrase first: Settings › Security › Encryption.":"";
  // The list to save: the other tabs as they are, and this one in its place (left out when it is deleted).
  const etList=(remove,v)=>{
    const list=TABS.map(tabItem).filter(x=>x.id!==id);
    if(!remove)list.splice(pos,0,{id:id||null,name:v.name,color:v.color,hc:v.hc,layout:v.layout,icon:v.icon,private:v.priv||v.enc,enc:v.enc});
    return list;
  };
  HubTabs.edit({
    isNew:!t,title:t?"Edit Tab":"New Tab",saveLabel:t?"Save Tab":"Add Tab",name:t?t.name:nextTabName(),defaultName:nextTabName(),
    color:t?t.color:freeColor(TABS.map((x,j)=>tabColor(x,j))),colorShown:tabColor({color:""},pos),colorLabel:"Tab Color",
    hc:null,layouts:LAYS,layout:t?t.layout:"cards",icon:t&&t.icon,iconDefault:"doc",
    priv:!!(t&&t.private),enc:!!(t&&t.enc),
    privWhy:noPw?"Create a password first (in Settings) so private tabs can be hidden from visitors.":"",encWhy,
    encOnNote:"The box titles and text are encrypted in your browser with your encryption passphrase, so the server, earlier versions and backups only hold scrambled data. The tab name isn't encrypted.",
    encOffNote:"For extra protection, encrypt the box titles and text with your encryption passphrase.",
    canDelete:!!t&&TABS.length>1,
    async onSave(v,ctl){
      const say=ctl.say,want=v.enc,was=!!(t&&t.enc);
      if(want&&!KEY&&!(await ensureKey(say)))return;   // encrypting needs the key: set or unlock the passphrase first
      if(!want&&was&&!KEY&&!(await ensureKey(say)))return;
      if(t&&want!==was){
        if(t.boxes.some(b=>b.editing||busy.has(b.key))){say("Save or cancel the open box in this tab first.");return}
        ctl.busy(true,want?"Encrypting…":"Decrypting…");
        const ok=await convertTab(t,want,say);ctl.busy(false);if(!ok)return;
      }
      saveTabsList(etList(false,v),say,async()=>{
        ctl.close();renderGates();
        if(want&&!was&&t){ // remove earlier versions that still hold this tab's unencrypted text
          try{await api({action:"clear_versions"})}catch(err){}
          setStatus("Tab encrypted. Earlier versions were deleted so no unencrypted copy stays on the server.");
        }else if(!want&&was)setStatus("Tab decrypted. It's still a private tab.");
      });
    },
    onDelete(ctl){
      const at=TABS.indexOf(t),gone={...tabItem(t,at),boxes:t.boxes.map(b=>rawBox(b,t.enc))};
      saveTabsList(etList(true,null),ctl.say,()=>{ctl.close();if(window.HUB&&HUB.undo)HUB.undo("Tab deleted: "+(gone.name||"Tab")+".",()=>undoTab(gone,at))});
    }
  });
}
function undoTab(gone,at){
  if(TABS.length>=MAXTAB){setStatus("There are too many tabs, so the tab can't come back.");return}
  const {boxes,...head}=gone,list=TABS.map(tabItem);
  list.splice(Math.min(at,list.length),0,{...head,restore:{boxes}});
  guard(()=>saveTabsList(list,setStatus,()=>setStatus("Tab is back.")));
}
// Rewrites a tab's two boxes encrypted (or back to plain text) on the server.
async function convertTab(t,encrypt,say){
  if(t.enc)await queueDecrypt();
  for(const b of t.boxes){
    if(b.bad){say("A box in this tab couldn't be decrypted, so it can't be converted.");return false}
    try{
      const title=encrypt?await seal(b.title):b.title,notes=encrypt?await seal(b.notes):b.notes;
      const r=await api({action:"save",tab:t.id,box:b.id,title,notes,rev:b.rev});
      if(r.status===409){say("This tab was changed on another device. Close this dialog and try again.");return false}
      if(r.status===403){dropAuth();say("Log in again, then try again.");return false}
      if(!r.ok)throw 0;
      intake(b,(await r.json()).box,encrypt);
    }catch(err){say("Couldn't reach the server. The tab wasn't changed.");return false}
  }
  return true;
}


/* passphrase: unlock. The passphrase is set (and removed) in Settings › Security › Encryption; this page only opens the tabs with it. */
const uldlg=$("uldlg");let ulDone=null;
// Makes sure the key is available: unlocks it. Resolves true when ready.
function ensureKey(say){
  if(KEY)return Promise.resolve(true);
  if(!CAN_ENC){say("Encryption needs a secure (https) connection.");return Promise.resolve(false)}
  if(!PAGE.vault){say("Set an encryption passphrase first: Settings › Security › Encryption.");return Promise.resolve(false)}
  return openUnlock();
}
function openUnlock(){
  return new Promise(res=>{ulDone=res;$("ulin").value="";$("ulmsg").textContent="";
    const lg=VAULT_LOGIN();
    $("ullbl").textContent=lg?"Website Password":"Passphrase or Recovery Key";
    $("ulin").autocomplete=lg?"current-password":"off";
    $("ulintro").textContent=lg?"These tabs are still locked with your website password. Set an encryption passphrase in Settings › Security › Encryption to move them onto it."
      :"Enter your encryption passphrase.";
    $("ulkeep").checked=keepOn();
    uldlg.showModal();$("ulin").focus()});
}
$("ulcancel").onclick=()=>uldlg.close();
uldlg.addEventListener("close",()=>{if(ulDone){const f=ulDone;ulDone=null;f(!!KEY)}});
$("ulform").addEventListener("submit",async e=>{
  e.preventDefault();
  $("ulsave").disabled=true;$("ulmsg").textContent="Unlocking…";
  const raw=await unwrapKey(PAGE.vault,$("ulin").value);
  $("ulsave").disabled=false;
  if(!raw){$("ulmsg").textContent=VAULT_LOGIN()?"That password doesn't open them. If you changed your password while Info wasn't open, use the previous one, or set an encryption passphrase in Settings › Security › Encryption.":"That passphrase isn't right.";return}
  setKeep($("ulkeep").checked);
  if($("ulkeep").checked)await devSave(raw);else devClear();
  KEY=await useKey(raw);raw.fill(0);$("ulin").value="";
  await queueDecrypt();renderGates();if(HL)setHighlight(HL);
  setStatus("Encrypted tabs unlocked.");uldlg.close();
});

