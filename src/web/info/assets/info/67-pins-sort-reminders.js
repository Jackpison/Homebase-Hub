/* ---------- (1.82.6) Pinned boxes, Recently Edited First, and reminders ----------
   A pinned box sits at the top of its tab. "Recently Edited First" orders the boxes of every tab by when they were saved (a view on this
   device only: the saved order does not change). Both only change how the boxes are shown (CSS order), so the box order on the server stays as it is.
   A box with a reminder date shows a chip: Due Today, Overdue, or the date. Home's Today widget lists the ones that are due. */
let SORTR=false;try{SORTR=localStorage.getItem("ix-info-sort")==="recent"}catch(e){}
function applyOrder(t){
  const cards=t.layout!=="doc",list=t.boxes.map((b,i)=>({b,i})).filter(x=>boxNode(x.b));
  if(!cards){list.forEach(x=>{boxNode(x.b).style.order=""});return}
  list.sort((a,c)=>(+!!c.b.pin-+!!a.b.pin)||(SORTR?(c.b.saved|0)-(a.b.saved|0):0)||a.i-c.i);
  list.forEach((x,k)=>{boxNode(x.b).style.order=String(k)});
}
const todayStr=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
function drawChips(b){
  const e=b.el&&b.el.chips;if(!e)return;
  const out=[];
  if(b.pin)out.push('<span class="chip pin" title="Pinned to the top">Pinned</span>');
  if(b.rem){
    const t=todayStr(),late=b.rem<t,now=b.rem===t,d=new Date(b.rem+"T12:00:00");
    out.push('<span class="chip rem'+(late||now?" due":"")+'" title="Reminder">'+(now?"Due Today":late?"Overdue · ":"")+(now?"":esc(d.toLocaleDateString(undefined,{day:"numeric",month:"short"})))+"</span>");
  }
  e.innerHTML=out.join("");
}
const sortBtn=$("sortBtn");
function sortUI(){sortBtn.setAttribute("aria-pressed",String(SORTR));sortBtn.textContent=SORTR?"Recently Edited First":"Sort: Tab Order"}
sortBtn.addEventListener("click",()=>{SORTR=!SORTR;try{localStorage.setItem("ix-info-sort",SORTR?"recent":"")}catch(e){}sortUI();TABS.forEach(applyOrder)});
sortUI();
