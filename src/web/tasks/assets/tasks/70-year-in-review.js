/* ---------- Year in Review: a PDF report of one year (what you marked Done), made in this browser ---------- */
function yearData(y){
  const ent=LOG.filter(e=>e.d.slice(0,4)===String(y));
  const paid=ent.filter(e=>e.k==="paid"&&e.p!=null),cur=e=>e.cur||SET.currency;
  const curs={};paid.forEach(e=>{curs[cur(e)]=(curs[cur(e)]||0)+e.p});
  const main=Object.keys(curs).sort((a,b)=>a===SET.currency?-1:b===SET.currency?1:curs[b]-curs[a])[0]||SET.currency;
  const inMain=paid.filter(e=>cur(e)===main),months=Array(12).fill(0),cats={},modes={online:0,offline:0,"":0};
  inMain.forEach(e=>{months[+e.d.slice(5,7)-1]+=e.p;const c=e.cat||"No Category";cats[c]=(cats[c]||0)+e.p;modes[e.mode||""]+=e.p});
  const total=inMain.reduce((s,e)=>s+e.p,0);
  // price changes: the same task paid at different prices during the year
  const byTask={};inMain.slice().sort((a,b)=>a.d.localeCompare(b.d)).forEach(e=>{(byTask[e.task||e.name]=byTask[e.task||e.name]||[]).push(e)});
  const changes=Object.values(byTask).map(l=>({n:l[l.length-1].name,a:l[0].p,b:l[l.length-1].p})).filter(x=>x.a!==x.b&&x.a>0).sort((x,y)=>Math.abs(y.b/y.a)-Math.abs(x.b/x.a));
  const nextYear=T.filter(t=>t.status==="active"&&t.repeat.unit!=="none"&&t.price!=null&&curOf(t)===main).map(t=>({n:t.name,r:repLabel(t.repeat),v:t.price*perYear(t.repeat)})).sort((a,b)=>b.v-a.v);
  return{y,main,curs,total,count:inMain.length,done:ent.filter(e=>e.k==="paid").length,skipped:ent.filter(e=>e.k==="skip").length,months,
    cats:Object.entries(cats).sort((a,b)=>b[1]-a[1]),modes,top:inMain.slice().sort((a,b)=>b.p-a.p).slice(0,12),changes,nextYear};
}
function openYear(){
  const years=[...new Set(LOG.map(e=>e.d.slice(0,4)))].sort().reverse(),y0=todayS().slice(0,4);
  if(!years.includes(y0))years.unshift(y0);
  const draw=y=>{
    const D=yearData(y),other=Object.keys(D.curs).filter(c=>c!==D.main);
    $("ybody").innerHTML='<label class="fl">Year<select id="yyear">'+years.map(v=>'<option'+(v===y?" selected":"")+'>'+v+'</option>').join("")+'</select></label>'+
      (D.done+D.skipped?'<div class="tiles"><div class="tile"><small>Paid</small><b class="num">'+esc(money(Math.round(D.total),D.main))+'</b><span>'+D.count+' Payments</span></div>'+
        '<div class="tile"><small>Completed</small><b class="num">'+D.done+'</b><span>'+D.skipped+' Skipped</span></div>'+
        '<div class="tile"><small>Biggest Category</small><b>'+esc(D.cats[0]?D.cats[0][0]:"None")+'</b><span class="num">'+(D.cats[0]?esc(money(Math.round(D.cats[0][1]),D.main)):"")+'</span></div></div>'+
        (other.length?'<p class="hint">Also paid in '+other.map(c=>esc(money(Math.round(D.curs[c]),c))).join(", ")+' (listed in the PDF).</p>':'')+
        '<p class="hint">A PDF with monthly totals, categories, top payments and next year\'s costs.</p>'
       :'<div class="empty" style="padding:20px"><h2>Nothing in '+esc(y)+' Yet</h2><p>The review counts what you mark Done in Tasks. Completed entries from '+esc(y)+' will show up here.</p></div>');
    $("yyear").onchange=e=>draw(e.target.value);
    $("ygo").disabled=!(D.done+D.skipped);$("ygo").onclick=()=>makePdf(y);
  };
  draw(years[0]);$("ydlg").showModal();
}
let pdfLib=null;
function loadPdf(){
  if(/** @type {any} */ (window).jspdf)return Promise.resolve(/** @type {any} */ (window).jspdf.jsPDF);
  return pdfLib||(pdfLib=new Promise((ok,no)=>{const s=document.createElement("script");s.src="../hub/core/assets/vendor/jspdf.umd.min.js?v=4.2.1";
    s.onload=()=>/** @type {any} */ (window).jspdf?ok(/** @type {any} */ (window).jspdf.jsPDF):no();s.onerror=()=>{pdfLib=null;no()};document.head.appendChild(s)}));
}
async function makePdf(y){
  const b=$("ygo");b.disabled=true;b.lastChild.textContent="Making PDF…";
  try{
    const jsPDF=await loadPdf(),D=yearData(y),doc=new jsPDF({unit:"mm",format:"a4"}),W=210,M=16;
    // PDF's built-in fonts have no ₹ sign, and only Western letters: amounts in rupees read "Rs 1,200"
    const pm=(v,c)=>{c=c||D.main;const n=Math.round(v*100)/100;if(c==="INR")return"Rs "+new Intl.NumberFormat("en-IN",{maximumFractionDigits:n%1?2:0}).format(n);
      try{return new Intl.NumberFormat("en-US",{style:"currency",currency:c,maximumFractionDigits:n%1?2:0}).format(n)}catch(e){return c+" "+n}};
    const tx=s=>String(s??"").normalize("NFKD").replace(/[^\x20-\x7E\u00A0-\u00FF€]/g,"").trim()||"?";
    const acc=getComputedStyle(document.documentElement).getPropertyValue("--ix-accent").trim()||"#ffc21a";
    const hex=h=>{h=h.replace("#","");if(h.length===3)h=h.split("").map(c=>c+c).join("");return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]};
    const A=hex(acc),ink=[24,24,27],mute=[110,110,118],line=[226,226,230];
    let yy=0;
    const head=t=>{doc.setFont("helvetica","bold");doc.setFontSize(13);doc.setTextColor(...ink);doc.text(t,M,yy);yy+=3;doc.setDrawColor(...A);doc.setLineWidth(0.8);doc.line(M,yy,M+18,yy);yy+=7};
    const foot=n=>{doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(...mute);doc.text(tx((document.querySelector(".ix-bname")||{}).textContent||"My Site")+" - Year in Review "+y,M,289);doc.text("Page "+n+" of 2",W-M,289,{align:"right"})};
    // page 1: title, totals, months, categories
    doc.setFillColor(...A);doc.rect(0,0,W,38,"F");
    doc.setTextColor(0,0,0);doc.setFont("helvetica","bold");doc.setFontSize(24);doc.text("Year in Review "+y,M,20);
    doc.setFont("helvetica","normal");doc.setFontSize(10);doc.text("1 January to 31 December "+y+"   |   made "+fmtD(todayS()),M,29);
    yy=50;
    const tiles=[["Paid",pm(D.total)],["Payments",String(D.count)],["Completed",String(D.done)],["Skipped",String(D.skipped)]],tw=(W-2*M-9)/4;
    tiles.forEach((t,i)=>{const x=M+i*(tw+3);doc.setDrawColor(...line);doc.setLineWidth(0.3);doc.roundedRect(x,yy,tw,22,2,2);
      doc.setFontSize(8.5);doc.setTextColor(...mute);doc.text(t[0].toUpperCase(),x+4,yy+7);doc.setFont("helvetica","bold");doc.setFontSize(t[1].length>12?11:14);doc.setTextColor(...ink);doc.text(t[1],x+4,yy+16);doc.setFont("helvetica","normal")});
    yy+=30;
    const other=Object.keys(D.curs).filter(c=>c!==D.main);
    if(other.length){doc.setFontSize(9);doc.setTextColor(...mute);doc.text("Also paid: "+other.map(c=>pm(D.curs[c],c)).join(", ")+". The report below is in "+D.main+".",M,yy);yy+=8}
    head("Paid by Month");
    const ch=48,cw=(W-2*M)/12,mx=Math.max(1,...D.months),base=yy+ch;
    D.months.forEach((v,i)=>{const h=v/mx*(ch-8),x=M+i*cw+2;doc.setFillColor(...(v?A:line));doc.rect(x,base-Math.max(h,0.6),cw-4,Math.max(h,0.6),"F");
      doc.setFontSize(7.5);doc.setTextColor(...mute);doc.text(MONTHS[i].slice(0,3),x+(cw-4)/2,base+4.5,{align:"center"});
      if(v){doc.setTextColor(...ink);const s=v>=1e5&&D.main==="INR"?(Math.round(v/1e4)/10)+"L":v>=1e3?(Math.round(v/100)/10)+"K":String(Math.round(v));doc.text(s,x+(cw-4)/2,base-h-1.6,{align:"center"})}});
    yy=base+14;
    head("By Category");
    const cats=D.cats.slice(0,12),cmax=cats.length?cats[0][1]:1;
    cats.forEach(([c,v])=>{doc.setFontSize(9.5);doc.setTextColor(...ink);doc.text(tx(c).slice(0,28),M,yy+3.2);
      doc.setFillColor(...line);doc.rect(M+52,yy,82,4,"F");doc.setFillColor(...A);doc.rect(M+52,yy,Math.max(0.8,v/cmax*82),4,"F");
      doc.setFont("helvetica","bold");doc.text(pm(v),W-M-16,yy+3.2,{align:"right"});doc.setFont("helvetica","normal");doc.setTextColor(...mute);doc.text(Math.round(v/(D.total||1)*100)+"%",W-M,yy+3.2,{align:"right"});yy+=7.2});
    if(!cats.length){doc.setFontSize(9.5);doc.setTextColor(...mute);doc.text("No payments with a price.",M,yy);yy+=7}
    foot(1);
    // page 2: biggest payments, price changes, online/offline, next year
    doc.addPage();yy=20;
    head("Biggest Payments");
    const row=(cols,bold)=>{doc.setFont("helvetica",bold?"bold":"normal");doc.setFontSize(9);doc.setTextColor(...(bold?mute:ink));
      doc.text(cols[0],M,yy);doc.text(cols[1],M+28,yy);doc.text(cols[2],M+110,yy);doc.text(cols[3],W-M,yy,{align:"right"});yy+=1.8;doc.setDrawColor(...line);doc.setLineWidth(0.2);doc.line(M,yy,W-M,yy);yy+=4.6};
    row(["DATE","TASK","CATEGORY","AMOUNT"],true);
    D.top.forEach(e=>row([fmtD(e.d,{day:"numeric",month:"short"}),tx(e.name).slice(0,42),tx(e.cat||"-").slice(0,24),pm(e.p)]));
    yy+=6;head("Price Changes");
    if(D.changes.length){D.changes.slice(0,8).forEach(c=>{const p=Math.round((c.b-c.a)/c.a*100);doc.setFontSize(9.5);doc.setTextColor(...ink);doc.text(tx(c.n).slice(0,44),M,yy);
      doc.text(pm(c.a)+"  to  "+pm(c.b),M+100,yy);doc.setTextColor(...(p>0?[198,40,40]:[31,122,77]));doc.setFont("helvetica","bold");doc.text((p>0?"+":"")+p+"%",W-M,yy,{align:"right"});doc.setFont("helvetica","normal");yy+=6.5})}
    else{doc.setFontSize(9.5);doc.setTextColor(...mute);doc.text("No task was paid at two different prices this year.",M,yy);yy+=7}
    yy+=6;head("Online or Offline");
    const mt=D.total||1;/** @type {[string, number][]} */ ([["Online",D.modes.online],["Offline",D.modes.offline],["Not Set",D.modes[""]]]).forEach(([n,v])=>{doc.setFontSize(9.5);doc.setTextColor(...ink);doc.text(n,M,yy+3.2);
      doc.setFillColor(...line);doc.rect(M+30,yy,104,4,"F");doc.setFillColor(...A);doc.rect(M+30,yy,Math.max(0.6,v/mt*104),4,"F");doc.text(pm(v)+"  ("+Math.round(v/mt*100)+"%)",W-M,yy+3.2,{align:"right"});yy+=7.5});
    yy+=6;head("Repeating Costs for the Next Year");
    const ny=D.nextYear.slice(0,14);
    if(ny.length){ny.forEach(t=>{doc.setFontSize(9.5);doc.setTextColor(...ink);doc.text(tx(t.n).slice(0,50),M,yy);doc.setTextColor(...mute);doc.text(t.r,M+110,yy);doc.setTextColor(...ink);doc.text(pm(t.v)+" / year",W-M,yy,{align:"right"});yy+=6});
      const s=D.nextYear.reduce((a,t)=>a+t.v,0);doc.setDrawColor(...line);doc.line(M,yy-2,W-M,yy-2);yy+=3;doc.setFont("helvetica","bold");doc.text("Total: "+pm(Math.round(s))+" a year, about "+pm(Math.round(s/12))+" a month",W-M,yy,{align:"right"});doc.setFont("helvetica","normal");yy+=6}
    else{doc.setFontSize(9.5);doc.setTextColor(...mute);doc.text("No active repeating tasks with a price.",M,yy);yy+=7}
    doc.setFontSize(8);doc.setTextColor(...mute);doc.text(doc.splitTextToSize("Counts what you marked Done in Tasks during "+y+", at the price recorded then (by the date each payment was due). Skipped dates are counted but not paid. Names in other alphabets are left out by the PDF's built-in fonts.",W-2*M),M,276);
    foot(2);
    doc.save("year-in-review-"+y+".pdf");
    snack("Year in Review "+y+" downloaded.");
  }catch(e){snack("The PDF could not be made"+(e&&e.message?": "+e.message:"")+".")}
  finally{b.disabled=false;b.lastChild.textContent="Download PDF"}
}

