/* Export (the Export button): every tab or the current one, as plain text or a PDF. Boxes of an encrypted tab that is still
   locked are left out, with a note: unlock the tab first to include them. */
const exportTabs=all=>all?TABS:TABS.filter(t=>t.id===active);
const dayStamp=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
function exportName(all,ext){
  const t=TABS.find(x=>x.id===active),base=(all?(PAGE.title||"info"):(t?t.name:"tab")).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"info";
  return base+"-"+dayStamp()+"."+ext;
}
function saveFile(name,blob){
  const a=document.createElement("a"),u=URL.createObjectURL(blob);a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(u),4000);
}
function exportParts(all){   // [{tab, boxes:[{title, notes}]}], plus how many locked boxes were skipped
  let locked=0;const tabs=exportTabs(all).map(t=>({name:t.name,boxes:t.boxes.filter(b=>{if(b.sealed||b.bad){locked++;return false}return true}).map(b=>({title:b.title,notes:String(b.notes||"").replace(/\r/g,"").trim()}))}));
  return{tabs,locked};
}
const lockedNote=n=>n?n+(n===1?" locked box was":" locked boxes were")+" left out. Unlock the encrypted tab first to include "+(n===1?"it.":"them."):"";
function exportText(all){
  const {tabs,locked}=exportParts(all),out=[];
  if(!tabs.length){setStatus("There is nothing to export.");return}
  for(const t of tabs){
    out.push(t.name,"=".repeat(Math.min(60,Math.max(3,t.name.length))),"");
    for(const b of t.boxes){out.push(b.title,"-".repeat(Math.min(60,Math.max(3,b.title.length))),b.notes||"(empty)","")}
  }
  if(locked)out.push("("+lockedNote(locked)+")");
  const name=exportName(all,"txt");saveFile(name,new Blob([out.join("\n")],{type:"text/plain;charset=utf-8"}));
  bkdlg.close();setStatus("Saved "+name+". "+lockedNote(locked));
}
let pdfLoad=null;
function loadPdfLib(){
  return pdfLoad||(pdfLoad=new Promise((ok,no)=>{const sc=document.createElement("script");sc.src="../hub/core/assets/vendor/jspdf.umd.min.js?v=4.2.1";
    sc.onload=()=>/** @type {any} */ (window).jspdf&&/** @type {any} */ (window).jspdf.jsPDF?ok(/** @type {any} */ (window).jspdf.jsPDF):no(new Error("PDF library missing"));sc.onerror=()=>{pdfLoad=null;no(new Error("PDF library could not load"))};document.head.appendChild(sc)}));
}
// The PDF uses a built-in font that only knows Western European letters: common symbols are spelled out, the rest becomes "?".
const pdfSafe=s=>String(s).replace(/₹/g,"Rs ").replace(/[“”„]/g,'"').replace(/[‘’‚]/g,"'").replace(/[–—]/g,"-").replace(/…/g,"...").replace(/[•·▪●]/g,"-").replace(/→/g,"->").replace(/←/g,"<-").replace(/✓|✔/g,"v")
  .replace(/\*\*(.+?)\*\*/g,"$1").replace(/__(.+?)__/g,"$1").replace(/`([^`]+)`/g,"$1").replace(/~~(.+?)~~/g,"$1").replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,"$1 ($2)").replace(/[^\n\x20-\x7e\xa0-\xff]/g,"?");
async function exportPdf(all){
  const {tabs,locked}=exportParts(all);
  if(!tabs.length){setStatus("There is nothing to export.");return}
  setStatus("Making the PDF…");
  let jsPDF;try{jsPDF=await loadPdfLib()}catch(e){setStatus("Couldn't load the PDF maker. Try Text instead.");return}
  const doc=new jsPDF({unit:"mm",format:"a4"}),W=210,M=16,maxY=281;let y=M;
  const room=h=>{if(y+h>maxY){doc.addPage();y=M}};
  const para=(txt,size,style,gap,color)=>{doc.setFont("helvetica",style);doc.setFontSize(size);doc.setTextColor(color||20);
    const lines=doc.splitTextToSize(pdfSafe(txt),W-2*M),lh=size*0.42;
    for(const ln of lines){room(lh);doc.text(ln,M,y+lh*0.8);y+=lh}y+=gap};
  para(PAGE.title||"Info",20,"bold",1);
  para((all?"All tabs":"One tab")+" · exported "+new Date().toLocaleString(),9,"normal",6,110);
  tabs.forEach((t,i)=>{
    if(i){room(16);doc.setDrawColor(200);doc.setLineWidth(0.3);doc.line(M,y,W-M,y);y+=6}
    para(t.name,16,"bold",3);
    for(const b of t.boxes){room(12);para(b.title,12,"bold",1.5);para(b.notes||"(empty)",10.5,"normal",5,40)}
  });
  if(locked)para("("+lockedNote(locked)+")",9,"italic",0,110);
  const name=exportName(all,"pdf");saveFile(name,doc.output("blob"));
  setStatus("Saved "+name+". "+lockedNote(locked));
}

/* Backup panel: exports, full backup, reminder and earlier versions */
const bkdlg=$("bkdlg");
function openBackup(){const t=TABS.find(x=>x.id===active);$("bkcur").textContent=t?t.name:"";bkdlg.showModal()}
bkdlg.addEventListener("click",e=>{
  const b=/** @type {any} */ (e.target).closest("[data-b]");if(!b)return;const k=b.dataset.b;
  if(k==="close")bkdlg.close();
  else if(k==="pdf-all"||k==="pdf-cur"){bkdlg.close();exportPdf(k==="pdf-all")}
  else if(k==="txt-all"||k==="txt-cur")exportText(k==="txt-all");
});
/* login: the site's one login box (same password and two-step code everywhere); the page then reloads */
function dropAuth(){authed=false;if(typeof renderAuth==="function")renderAuth()}
// Runs fn now if editing is allowed; otherwise asks to log in first, then runs it.
function guard(fn){
  if(!loaded){setStatus("Still loading. Try again in a moment.");return}
  if(!server||!locked||authed){fn();return}
  // the site's one Welcome box logs in (same password and two-step code everywhere); the page then reloads with your private data
  HUB.login().then(pw=>unlockAfterLogin(pw)).then(()=>location.reload(),()=>{});
}

load();
