/* ── agenda.js ── */
function renderAgenda(){drawCal();showDay(selDate);}

function drawCal(){
  $("calmth").textContent=MONTHS[calM]+" "+calY;
  const today=new Date().toISOString().slice(0,10);
  const rd=new Set(rides.filter(r=>r.driver_id===U?.id).map(r=>r.pickup_time?r.pickup_time.slice(0,10):null).filter(Boolean));
  if(calExp){
    $("calFull").classList.remove("hidden");$("calStrip").classList.add("hidden");
    const first=new Date(calY,calM,1),sc=(first.getDay()+6)%7,dim=new Date(calY,calM+1,0).getDate(),prev=new Date(calY,calM,0).getDate();
    let c="";
    for(let i=0;i<sc;i++)c+=`<div class="cc dim"><div class="cnum">${prev-sc+1+i}</div></div>`;
    for(let d=1;d<=dim;d++){const ds=`${calY}-${String(calM+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;const iT=ds===today,iS=ds===selDate&&!iT;c+=`<div class="cc${iT?" today":""}${iS?" sel":""}" onclick="selDay('${ds}')"><div class="cnum">${d}</div>${rd.has(ds)?'<div class="cdot"></div>':""}</div>`;}
    const tr=(sc+dim)%7;if(tr)for(let d=1;d<=7-tr;d++)c+=`<div class="cc dim"><div class="cnum">${d}</div></div>`;
    $("calgrid").innerHTML=c;
  }else{
    $("calFull").classList.add("hidden");$("calStrip").classList.remove("hidden");
    const now=new Date(),dn=["Zo","Ma","Di","Wo","Do","Vr","Za"],days=[];
    for(let i=-3;i<=14;i++){const d=new Date(now);d.setDate(now.getDate()+i);days.push(d);}
    $("calStrip").innerHTML=days.map(d=>{const ds=d.toISOString().slice(0,10),iT=ds===today,iS=ds===selDate&&!iT;return`<div class="sday${iT?" today":""}${iS?" sel":""}" onclick="selDay('${ds}')"><div class="sdn">${dn[d.getDay()]}</div><div class="sdd">${d.getDate()}</div>${rd.has(ds)?'<div class="sdot"></div>':""}</div>`;}).join("");
    setTimeout(()=>{const el=$("calStrip").querySelector(".today,.sel");if(el)el.scrollIntoView({inline:"center",behavior:"smooth"});},60);
  }
}

function toggleCal(){calExp=!calExp;$("caltb").classList.toggle("exp",calExp);drawCal();}
function calNav(d){calM+=d;if(calM>11){calM=0;calY++;}if(calM<0){calM=11;calY--;}drawCal();}
function selDay(ds){selDate=ds;const d=new Date(ds+"T00:00:00");calY=d.getFullYear();calM=d.getMonth();drawCal();showDay(ds);}

(()=>{
  let sx=0,sy=0;const w=$("calwrap");
  w.addEventListener("touchstart",e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY;},{passive:true});
  w.addEventListener("touchend",e=>{
    const dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;
    if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>36){if(dy<0&&calExp){calExp=false;$("caltb").classList.remove("exp");drawCal();}else if(dy>0&&!calExp){calExp=true;$("caltb").classList.add("exp");drawCal();}}
    else if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>42){calNav(dx<0?1:-1);}
  },{passive:true});
})();

function showDay(ds){
  const lbl=$("adlbl"),feed=$("agendaFeed");lbl.style.display="block";
  lbl.textContent=new Date(ds+"T00:00:00").toLocaleDateString("nl-NL",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).replace(/^\w/,c=>c.toUpperCase());
  const list=rides.filter(r=>r.driver_id===U?.id&&r.pickup_time&&r.pickup_time.slice(0,10)===ds).sort((a,b)=>new Date(a.pickup_time)-new Date(b.pickup_time));
  if(!list.length){feed.innerHTML=`<div class="empty" style="padding:28px"><svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="12" cy="12" r="10"/></svg><div class="et">Geen ritten</div><div class="es">Geen ritten gepland</div></div>`;return;}
  feed.innerHTML=list.map((r,i)=>`<div class="arow" style="animation-delay:${i*.05}s" onclick="openDetail('${esc(r.id)}')"><div class="arl"><div class="arst">${sLbl(r.status)}</div><div class="arrte">${esc((r.from_address||"-").split(",")[0].trim())}</div><div class="ardir">Richting ${esc((r.to_address||"-").split(",")[0].trim())}</div><div class="artm">${tT(r.pickup_time)}</div></div><div class="apr">${esc(r.price)||"€0"}</div></div>`).join("");
}
