/* encrypted tabs. The box titles and text of an encrypted tab are encrypted here in the browser with AES-256-GCM
   before they are sent, and stored as "enc1:" + base64(iv + ciphertext). The key is random; the server only keeps it
   wrapped (encrypted) with a key derived from your passphrase (PBKDF2-SHA256, 600,000 rounds), so neither the
   server, its earlier versions nor backup files can be read without the passphrase. The unwrapped key lives only
   in this page's memory (KEY) until reload, log out or Lock. */
const V=window.HubVault,CAN_ENC=V.ok(); // the shared encryption (shell.js, section 14)
let KEY=null;const DEC=new Map(); // ciphertext -> text, memory only
const isEnc=V.isEnc;
const unwrapKey=V.unwrap; // the raw key from the passphrase (or the recovery key), otherwise null
const useKey=raw=>V.useKey(raw); // not extractable
/* "Keep unlocked on this device": the tab key is kept in this browser's IndexedDB, encrypted with a device key that
   can't be read out of the browser (non-extractable). It only opens text the server sends to a logged-in browser, and it
   is deleted when you log out (on any page of this site) or press Lock. */
const keeper=V.keeper("dev","info-keep",true),keepOn=keeper.on,setKeep=keeper.set;
const VAULT_LOGIN=()=>!!(PAGE.vault&&PAGE.vault.login);
const devSave=keeper.save,devLoad=keeper.load,devClear=keeper.clear;
// Opens the encrypted tabs without asking when this device kept them unlocked. A kept key that no longer fits is dropped.
let autoTried=false;
async function autoUnlock(){
  if(autoTried||KEY||!authed||!PAGE.vault||!CAN_ENC||!TABS.some(t=>t.enc))return;
  autoTried=true;
  const raw=await devLoad();if(!raw||KEY)return;
  KEY=await useKey(raw);raw.fill(0);
  await queueDecrypt();
  if(TABS.some(t=>t.enc&&t.boxes.some(b=>b.bad))){devClear();lockEnc();return}
  renderGates();if(HL)setHighlight(HL);
}
// Just logged in with the website password: encrypted tabs that use it open right away (and stay open on this device
// when "keep unlocked" is on). Runs before the page reloads.
const unlockAfterLogin=pw=>keeper.afterLogin(pw,async()=>{const j=await fetchData();return j.page&&j.page.vault});
async function seal(text){
  // Already-encrypted text is never encrypted again: open it first (or keep it as it is if it can't be opened).
  if(isEnc(text)){try{text=(await unsealDeep(text)).text}catch(e){return text}}
  const out=await V.seal(KEY,text);DEC.set(out,text);return out;
}
async function unseal(s){
  if(!isEnc(s))return s;if(DEC.has(s))return DEC.get(s);
  const text=await V.unseal(KEY,s);
  DEC.set(s,text);return text;
}
// Opens text that may have been encrypted more than once (it happened when a tab lost its encrypted mark).
async function unsealDeep(s){
  let n=0;while(isEnc(s)&&n<5){s=await unseal(s);n++}
  if(isEnc(s))throw new Error("too many layers");
  return{text:s,layers:n};
}
function decGet(s){let n=0;while(isEnc(s)&&DEC.has(s)&&n<5){s=DEC.get(s);n++}return isEnc(s)?undefined:s}
const tabOfBox=b=>TABS.find(t=>t.id===b.tabId)||{};
// Takes a box's stored values in. For encrypted tabs it keeps the ciphertext (ct, cn) and shows the text once decrypted.
function intake(b,src,enc){
  b.rev=src.rev|0;b.saved=src.saved|0;b.bad=false;
  if(!enc){b.title=str(src.title)||"Box "+(b.k+1);b.notes=str(src.notes);b.ct=b.cn=null;b.sealed=false;return}
  b.ct=str(src.title);b.cn=str(src.notes);
  const t=isEnc(b.ct)?decGet(b.ct):b.ct,n=isEnc(b.cn)?decGet(b.cn):b.cn;
  if(t!=null&&n!=null){b.title=t||"Box "+(b.k+1);b.notes=n;b.sealed=false}
  else{b.title="Box "+(b.k+1);b.notes="";b.sealed=true;if(KEY)queueDecrypt()}
}
let decJob=null;
function queueDecrypt(){
  if(decJob)return decJob;
  decJob=(async()=>{
    await null;
    const fix=[];
    for(const t of TABS)if(t.enc)for(const b of t.boxes)if(b.sealed&&KEY){
      try{const ti=await unsealDeep(b.ct),n=await unsealDeep(b.cn);b.title=ti.text||"Box "+(b.k+1);b.notes=n.text;b.sealed=false;
        if(ti.layers>1||n.layers>1)fix.push(b)}
      catch(e){b.bad=true;b.sealed=false;b.title="Box "+(b.k+1);b.notes=""}
      if(b.el)renderBox(b);
    }
    decJob=null;renderGates();
    if(fix.length)repairLayers(fix);
  })();
  return decJob;
}
// Boxes found encrypted twice are saved again with a single layer, so the stored data is clean.
async function repairLayers(list){
  if(!server||!KEY||(locked&&!authed))return;
  let done=0;
  for(const b of list){
    if(b.editing||busy.has(b.key))continue;
    try{
      busy.add(b.key);
      const r=await api({action:"save",tab:b.tabId,box:b.id,title:await seal(b.title),notes:await seal(b.notes),rev:b.rev});
      if(r.ok){intake(b,(await r.json()).box,true);done++}
    }catch(e){}finally{busy.delete(b.key)}
  }
  if(done)setStatus(`Repaired ${done} ${done===1?"box":"boxes"} that had been encrypted twice.`);
}
// Locked encrypted tabs show an Unlock card instead of their boxes; unlocked ones show a Lock now bar.
function renderGates(){
  for(const t of TABS){const m=$("panel-"+t.id);if(!m)continue;
    m.classList.toggle("lockd",!!t.enc&&!KEY);m.classList.toggle("unl",!!t.enc&&!!KEY)}
}
function lockEnc(){
  if(TABS.some(t=>t.enc&&t.boxes.some(b=>b.editing||busy.has(b.key)))){setStatus("Save or cancel the encrypted box you're editing first.");return false}
  KEY=null;DEC.clear();devClear();
  for(const t of TABS)if(t.enc)for(const b of t.boxes){b.title="Box "+(b.k+1);b.notes="";b.sealed=true;if(b.el)renderBox(b)}
  renderGates();if(HL)setHighlight(HL);return true;
}

