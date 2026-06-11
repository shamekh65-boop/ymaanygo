/* ── rides.js ── */
async function loadRides(){
  const{data,error}=await SB.from("rides").select("*").or(`status.eq.pending,driver_id.eq.${U.id}`).order("pickup_time",{ascending:true});
  if(error||!data)return;
  rides=data;rides.filter(r=>r.status==="pending").forEach(r=>knownIds.add(r.id));
  renderHome();updateBadge();
  if(curPg===1){drawCal();showDay(selDate);}
  if(curPg===2)renderAccount();
}

function updateBadge(){$("badge0").textContent=rides.filter(r=>r.status==="pending").length;}

function renderHome(){
  const feed=$("homeFeed");
  if(!online){feed.innerHTML=`<div class="empty"><svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg><div class="et">Je bent offline</div><div class="es">Zet jezelf online om ritten te zien</div></div>`;return;}
  const list=rides.filter(r=>r.status==="pending");
  if(!list.length){feed.innerHTML=`<div class="empty"><svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M14 10l6-6m0 0h-5m5 0v5"/><path d="M3 21l9-9"/></svg><div class="et">Geen ritten</div><div class="es">Geen beschikbare ritten op dit moment</div></div>`;return;}
  feed.innerHTML=list.map((r,i)=>rCard(r,i)).join("");
}

function rCard(r,i=0){
  const mine=r.driver_id===U?.id,pend=r.status==="pending";
  const fA=(r.from_address||"-").split(","),tA=(r.to_address||"-").split(",");
  const fM=esc(fA[0].trim()),fC=esc(fA.slice(1).join(",").trim()),tM=esc(tA[0].trim()),tC=esc(tA.slice(1).join(",").trim());
  const rid=esc(r.id);
  return `<div class="rc" style="animation-delay:${i*.06}s">
    <div class="rc-h"><div><div class="rc-date">${tD(r.pickup_time)} · ${tT(r.pickup_time)}</div><div class="rc-id">${esc(r.id?.slice(0,12))||"—"}</div></div><span class="badge ${sCls(r.status)}">${sLbl(r.status)}</span></div>
    <div class="route">
      <div class="rrow"><div class="ric"><div class="da"></div><div class="vl"></div></div><div class="rt"><div class="rn">${fM}</div>${fC?`<div class="rc2">${fC}</div>`:""}</div><button class="nb" onclick="doNav(event,'${encodeURIComponent(r.from_address||'')}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg></button></div>
      <div class="rrow"><div class="ric"><div class="db"></div></div><div class="rt"><div class="rn">${tM}</div>${tC?`<div class="rc2">${tC}</div>`:""}</div><button class="nb" onclick="doNav(event,'${encodeURIComponent(r.to_address||'')}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg></button></div>
    </div>
    <div class="meta">
      <div class="chip"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>${esc(r.passengers)||1} pax</div>
      <div class="chip">${esc(r.vehicle)||"Standaard"}</div>
      ${r.payment_status?`<div class="chip">${esc(r.payment_status)}</div>`:""}
    </div>
    <div class="foot">
      <div><div class="price-l">Prijs</div><div class="price-v">${esc(r.price)||"€0"}</div><div class="price-n">✓ Geen commissie</div></div>
      <div class="fbtns">
        <button class="btn bout" onclick="openDetail('${rid}')">Details</button>
        ${pend&&!mine?`<button class="btn bg" onclick="acceptRide('${rid}')">Accepteren</button>`:""}
        ${mine&&r.status==="accepted"?`<button class="btn bamb" onclick="qStatus('${rid}','on_the_way')">Onderweg →</button>`:""}
        ${mine&&r.status==="on_the_way"?`<button class="btn bblu" onclick="qStatus('${rid}','arrived')">Aangekomen</button>`:""}
        ${mine&&r.status==="arrived"?`<button class="btn bok" onclick="qStatus('${rid}','completed')">✓ Voltooien</button>`:""}
      </div>
    </div>
  </div>`;
}

function openDetail(id){
  const r=rides.find(x=>x.id===id);if(!r)return;
  const mine=r.driver_id===U?.id;
  const ph=(r.customer_phone||"").replace(/\D/g,"");
  const fr=r.from_address||"-",to=r.to_address||"-";
  const rid=esc(r.id);
  $("detailBody").innerHTML=`
    <div id="dtMap" style="width:100%;height:200px;border-radius:14px;overflow:hidden;margin-bottom:12px;background:#e8f5e9;position:relative"><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--INK3);font-size:12px">Route laden…</div></div>
    <div class="dtrc"><div class="dtri">
           <div class="dts"><div class="dtsic"><div class="da"></div><div class="dtsl"></div></div><div class="dtsinfo"><div class="dtslbl">Ophaallocatie</div><div class="dtsaddr">${esc(fr)}</div><div style="font-size:11px;color:var(--INK3);margin-top:1px">${tT(r.pickup_time)}</div></div><button class="dtsnb" onclick="doNav(event,'${encodeURIComponent(fr)}')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg></button></div>
      ${(Array.isArray(r.stops)&&r.stops.length?r.stops:[]).map((s,i)=>`<div class="dts"><div class="dtsic"><div class="da" style="background:#f59e0b"></div><div class="dtsl"></div></div><div class="dtsinfo"><div class="dtslbl">Stop ${i+1}</div><div class="dtsaddr">${esc(s)}</div></div><button class="dtsnb" onclick="doNav(event,'${encodeURIComponent(s)}')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg></button></div>`).join("")}
      <div class="dts"><div class="dtsic"><div class="db"></div></div><div class="dtsinfo"><div class="dtslbl">Bestemming</div><div class="dtsaddr">${esc(to)}</div></div><button class="dtsnb" onclick="doNav(event,'${encodeURIComponent(to)}')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg></button></div>
  </div></div>
    <div class="dtinfo">
      <div class="dtir"><div class="dtiic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div><div><div class="dtilbl">Klant</div><div class="dtival">${esc(r.customer_name)||"—"}${r.customer_phone?`<span style="display:block;font-size:11px;color:var(--INK3)">${esc(r.customer_phone)}</span>`:""}</div></div></div>
          <div class="dtir"><div class="dtiic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg></div><div><div class="dtilbl">Voertuig · Passagiers</div><div class="dtival">${esc(r.vehicle)||"Standaard"} · ${esc(r.passengers)||1} pax</div></div></div>
      ${(r.flexible_minutes&&r.flexible_minutes>0)?`<div class="dtir"><div class="dtiic" style="color:#3bbf6b"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3bbf6b" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div><div><div class="dtilbl">Flexibel ophalen</div><div class="dtival" style="color:#3bbf6b">Tot ${r.flexible_minutes} min later</div></div></div>`:""}
    </div>
    <div class="dtprice"><div><div class="dtpl">Jouw uitbetaling</div><div class="dtpn">✓ Geen commissie meer af</div></div><div class="dtpv">${esc(r.price)||"€0"}</div></div>
    <div class="dtcont">
      ${ph?`<a class="btn bok" href="https://wa.me/${ph}" target="_blank"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>WhatsApp</a>`:""}
      ${ph?`<a class="btn bout" href="tel:${esc(r.customer_phone)}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.83a16 16 0 0 0 6 6l.83-1.83a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>Bellen</a>`:""}
    </div>
    <div class="dtacts">
      ${r.status==="pending"&&!mine?`<button class="btn bg bw" onclick="acceptRide('${rid}')">✓ Accepteren</button>`:""}
      ${mine&&r.status==="accepted"?`<button class="btn bamb bw" onclick="qStatus('${rid}','on_the_way')">Onderweg →</button>`:""}
      ${mine&&r.status==="on_the_way"?`<button class="btn bblu bw" onclick="qStatus('${rid}','arrived')">Aangekomen ✓</button>`:""}
      ${mine&&r.status==="arrived"?`<button class="btn bok bw" onclick="qStatus('${rid}','completed')">✓ Rit voltooien</button>`:""}
      ${mine&&!["completed","cancelled"].includes(r.status)?`<button class="btn bred bw" onclick="qStatus('${rid}','cancelled')">Annuleren</button>`:""}
    </div>`;
  openSP("spDetail");
setTimeout(()=>loadDetailMap(fr,to,Array.isArray(r.stops)?r.stops:[]),350);
}

async function acceptRide(id){
  const btns=document.querySelectorAll(`[onclick*="acceptRide('${id}')"]`);
  btns.forEach(b=>{b.disabled=true;b.innerHTML=`<span class="spin"></span> Bezig…`;});
  const{data:upd,error}=await SB.from("rides").update({
    driver_id:U.id,driver_name:P.name||U.email,
    driver_phone:P.phone||"",driver_avatar_url:P.avatar_url||"",
    status:"accepted",accepted_at:new Date().toISOString()
  }).eq("id",id).eq("status","pending").select().maybeSingle();
  if(error||!upd){
    btns.forEach(b=>{b.disabled=false;b.innerHTML="Accepteren";});
    tErr("⚠️ Deze rit is al geaccepteerd door een andere chauffeur.");
    rides=rides.filter(r=>r.id!==id);renderHome();updateBadge();closeSP("spDetail");return;
  }
  const i=rides.findIndex(r=>r.id===id);if(i>-1)rides[i]=upd;
  closeSP("spDetail");tOk("✓ Rit geaccepteerd!");renderHome();updateBadge();
}

async function qStatus(id,s){
  const p={status:s};
  if(s==="completed")p.completed_at=new Date().toISOString();
  if(!isNetworkOnline){
    offlineQueue.push({id,payload:p});
    const i=rides.findIndex(r=>r.id===id);
    if(i>-1)rides[i]={...rides[i],...p};
    closeSP("spDetail");
    tOk("📶 Offline — wijziging bewaard, wordt gesynchroniseerd zodra verbinding hersteld");
    renderHome();updateBadge();
    if(curPg===1){drawCal();showDay(selDate);}
    return;
  }
  const{error}=await SB.from("rides").update(p).eq("id",id).eq("driver_id",U.id);
  if(error){tErr("❌ "+error.message);return;}
  if(s==="completed"||s==="cancelled")startLoc();
  closeSP("spDetail");
  tOk(s==="completed"?"✓ Rit voltooid!":s==="cancelled"?"Rit geannuleerd":"Status bijgewerkt");
}

async function flushOfflineQueue(){
  if(!offlineQueue.length)return;
  tOk(`⏳ ${offlineQueue.length} wijziging(en) worden gesynchroniseerd…`);
  const queue=[...offlineQueue];
  offlineQueue=[];
  for(const item of queue){
    try{
      const{error}=await SB.from("rides").update(item.payload).eq("id",item.id).eq("driver_id",U.id);
      if(error){offlineQueue.push(item);}
    }catch(e){offlineQueue.push(item);}
  }
  if(!offlineQueue.length)tOk("✅ Alle wijzigingen gesynchroniseerd!");
  else tErr(`⚠️ ${offlineQueue.length} wijziging(en) konden niet worden gesynchroniseerd`);
}
