/* editor */
/* Fits the box to its text. Measuring means setting the height to "auto" and reading it back, which lays out the whole page twice; doing that on
   every key made typing in a big box lag. So while typing (soft) nothing is measured as long as the text still fits and has not got shorter; the
   rest waits for the next frame, once. */
function grow(ta,soft){
  const full=()=>{ta._raf=0;const y=window.scrollY;ta.style.height="auto";ta.style.height=ta.scrollHeight+2+"px";ta._len=ta.value.length;window.scrollTo(0,y)};
  if(!soft){cancelAnimationFrame(ta._raf||0);full();return}
  if(ta.value.length>=(ta._len||0)&&ta.scrollHeight<=ta.clientHeight){ta._len=ta.value.length;return}
  if(!ta._raf)ta._raf=requestAnimationFrame(full);
}
function saveDraft(b){clearTimeout(b.dt);if(b.editing)dSet(b,JSON.stringify({text:b.el.ta.value,title:b.el.tin.value,rev:b.rev}))}
function saveDraftSoon(b){clearTimeout(b.dt);b.dt=setTimeout(()=>saveDraft(b),400)} // typing doesn't write to storage on every key
function openEditor(b,text,title){
  const e=b.el,y=window.scrollY;
  b.editing=true;b.theirs=null;e.conflict.hidden=true;e.msg.textContent="";syncBoxEdit();
  // always open in writing mode (not preview), with the help closed
  e.prev.hidden=true;e.prev.innerHTML="";e.ta.hidden=false;e.help.hidden=true;
  e.tools.querySelectorAll("[data-f]").forEach(x=>{x.disabled=false;x.classList.remove("on")});
  e.ta.value=text??b.notes;e.tin.value=title||b.title;
  e.form.hidden=false;e.info.hidden=true;e.copy.hidden=true;e.edit.hidden=true;e.cfg.hidden=true;
  // Grow the box to fit the text and put the cursor at the start, so the page doesn't jump to the end.
  grow(e.ta);e.ta.focus({preventScroll:true});e.ta.setSelectionRange(0,0);e.ta.scrollTop=0;window.scrollTo(0,y);
}
// The floating editing bar steps aside while a box is open, so it never covers Cancel and save.
const syncBoxEdit=()=>document.body.classList.toggle("boxedit",TABS.some(t=>t.boxes.some(x=>x.editing)));
function hideEditor(b){const e=b.el;b.editing=false;setTimeout(syncBoxEdit,0);e.form.hidden=true;e.info.hidden=false;e.copy.hidden=false;e.edit.hidden=false;e.cfg.hidden=false}
function closeEditor(b){clearTimeout(b.dt);hideEditor(b);dSet(b,null)}
window.addEventListener("beforeunload",ev=>{
  if(busy.size||TABS.some(t=>t.boxes.some(b=>b.editing&&(b.el.ta.value!==b.notes||b.el.tin.value.trim()!==b.title)))){ev.preventDefault();ev.returnValue=""}
});

const busy=new Set(); // boxes with a save on its way to the server
async function save(b,force){
  const e=b.el,text=e.ta.value,title=e.tin.value.trim().slice(0,80)||b.title;
  if(busy.has(b.key))return; // a second Ctrl+S while saving would look like a conflict
  if(!server){Object.assign(b,{notes:text,title,saved:Math.floor(Date.now()/1000)});keepLocal();renderBox(b);closeEditor(b);setStatus("Saved in this browser only.");return}
  // Show the new text straight away; the server catches up in the background.
  // The draft stays in this browser until the server confirms, so nothing is lost if it fails.
  const prev={title:b.title,notes:b.notes};
  busy.add(b.key);
  Object.assign(b,{notes:text,title});hideEditor(b);renderBox(b);setStatus("Saving…");
  const back=msg=>{busy.delete(b.key);Object.assign(b,prev);renderBox(b);openEditor(b,text,title);e.msg.textContent=msg};
  try{
    const enc=tabOfBox(b).enc;
    if(enc&&!KEY){back("This tab is locked. Unlock it, then save again.");setStatus("Not saved yet.");return}
    const r=await api({action:"save",tab:b.tabId,box:b.id,title:enc?await seal(title):title,notes:enc?await seal(text):text,rev:b.rev,force});
    if(r.status===403){dropAuth();back("");setStatus(savedMsg());guard(()=>save(b,force));return}
    if(r.status===429){back("Too many wrong password tries. Wait a few minutes, then save again.");setStatus(savedMsg());return}
    if(r.status===409){const j=await r.json();back("");b.theirs=await openTheirs(b,j.box);e.conflict.hidden=false;setStatus("Not saved yet. Choose which version to keep.");return}
    if(r.status===404){back("This tab was removed on another device, so this text can't be saved here. Copy it before you leave the page.");setStatus("Not saved");return}
    if(!r.ok)throw 0;
    const j=await r.json();
    busy.delete(b.key);
    intake(b,j.box,tabOfBox(b).enc);
    dSet(b,null);keepLocal();renderBox(b);setStatus(savedMsg());
  }catch(err){
    back("Couldn't reach the server. Your text is kept in this browser; try Save again.");
    setStatus("Not saved to the server.");
  }finally{busy.delete(b.key)}
}
// The other device's version of a box, decrypted if needed, for "Load the newer version".
async function openTheirs(b,box){
  const enc=tabOfBox(b).enc;
  if(enc&&KEY){try{await unseal(box.title);await unseal(box.notes)}catch(e){}}
  return box;
}
function loadTheirs(b){
  const e=b.el,t=b.theirs;if(!t)return;
  intake(b,t,tabOfBox(b).enc);b.theirs=null;
  keepLocal();renderBox(b);e.ta.value=b.notes;e.tin.value=b.title;grow(e.ta);dSet(b,null);e.conflict.hidden=true;setStatus(savedMsg());
}

/* copy: copies the box text without formatting marks (code stays exactly as typed) */
async function copyText(t){
  try{await navigator.clipboard.writeText(t);return true}
  catch(e){ // older browsers, or pages not served over https
    const x=document.createElement("textarea");x.value=t;x.setAttribute("readonly","");x.style.cssText="position:fixed;opacity:0;top:0";
    document.body.appendChild(x);x.select();let ok=false;try{ok=document.execCommand("copy")}catch(_){}x.remove();return ok;
  }
}
async function copyBox(b,btn){
  const t=plain(b.notes);
  const say=(txt,good)=>{btn.textContent=txt;btn.classList.toggle("ok",!!good);clearTimeout(btn._t);btn._t=setTimeout(()=>{btn.textContent="Copy";btn.classList.remove("ok")},1600)};
  if(!t.trim()){say("Nothing to copy");return}
  const ok=await copyText(t);say(ok?"Copied":"Copy failed",ok);
}

