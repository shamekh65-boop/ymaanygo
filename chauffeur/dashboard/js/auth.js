/* ── auth.js ── */
async function init(){
  const{data:{session}}=await SB.auth.getSession();
  if(!session){location.href="/chauffeur/login.html";return;}
  U=session.user;
  const{data:p}=await SB.from("profiles").select("*").eq("id",U.id).maybeSingle();
  P=p||{};

  let{data:driverRecord}=await SB.from("drivers").select("status").eq("id",U.id).maybeSingle();
  if(!driverRecord&&U.email){
    const{data:byEmail}=await SB.from("drivers").select("status").eq("email",U.email).maybeSingle();
    driverRecord=byEmail;
  }
  if(!driverRecord){
    const{data:profileRecord}=await SB.from("profiles").select("role,name").eq("id",U.id).maybeSingle();
    if(profileRecord?.role==="driver"){driverRecord={status:"pending"};}
  }

  if(driverRecord&&driverRecord.status==="pending"){
    document.body.innerHTML=`
      <div style="min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px;background:linear-gradient(135deg,#e8f5e9,#f0f7f3);font-family:'Outfit',sans-serif;text-align:center">
        <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#2e7d32,#43a047);display:flex;align-items:center;justify-content:center;margin-bottom:24px;box-shadow:0 8px 28px rgba(46,125,50,.3)">
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <h1 style="font-size:24px;font-weight:900;color:#0b2e1f;margin:0 0 12px">Aanvraag in behandeling</h1>
        <p style="font-size:15px;color:#4f7f68;max-width:320px;line-height:1.6;margin:0 0 28px">Uw aanvraag wordt beoordeeld door de beheerder.<br>U ontvangt een melding zodra u bent goedgekeurd.</p>
        <div style="background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:16px;padding:16px 20px;margin-bottom:24px;max-width:320px;width:100%">
          <div style="font-size:12px;color:#4f7f68;margin-bottom:4px">Ingelogd als</div>
          <div style="font-size:15px;font-weight:700;color:#0b2e1f">${esc(P.name||U.email)}</div>
        </div>
        <button onclick="SB.auth.signOut().then(()=>location.href='/chauffeur/login.html')"
          style="background:transparent;border:1px solid rgba(0,0,0,.15);border-radius:12px;padding:12px 24px;font-family:'Outfit',sans-serif;font-size:14px;font-weight:700;color:#4f7f68;cursor:pointer">Uitloggen</button>
      </div>`;
    return;
  }

  if(driverRecord&&driverRecord.status==="rejected"){
    document.body.innerHTML=`
      <div style="min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px;background:linear-gradient(135deg,#ffeaea,#fff5f5);font-family:'Outfit',sans-serif;text-align:center">
        <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#c62828,#e53935);display:flex;align-items:center;justify-content:center;margin-bottom:24px">
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </div>
        <h1 style="font-size:24px;font-weight:900;color:#0b2e1f;margin:0 0 12px">Aanvraag afgewezen</h1>
        <p style="font-size:15px;color:#4f7f68;max-width:320px;line-height:1.6;margin:0 0 28px">Uw aanvraag is helaas niet goedgekeurd.<br>Neem contact op met de beheerder voor meer informatie.</p>
        <a href="https://ymaanygo.nl/contact.html" style="background:#c62828;color:#fff;border-radius:12px;padding:12px 24px;font-family:'Outfit',sans-serif;font-size:14px;font-weight:700;text-decoration:none;margin-bottom:12px">Contact opnemen</a>
        <button onclick="SB.auth.signOut().then(()=>location.href='/chauffeur/login.html')"
          style="background:transparent;border:1px solid rgba(0,0,0,.15);border-radius:12px;padding:12px 24px;font-family:'Outfit',sans-serif;font-size:14px;font-weight:700;color:#4f7f68;cursor:pointer;margin-top:8px">Uitloggen</button>
      </div>`;
    return;
  }

  $("dname").textContent=P.name||U.email||"Chauffeur";
  document.addEventListener("click",function askOnce(){askNotifPermission();document.removeEventListener("click",askOnce);},{once:true});
  await loadRides();
  subscribeRealtime();
  startLoc();
  drawCal();showDay(selDate);
}

async function logout(){
  stopLoc();
  await SB.auth.signOut();
  location.href="/chauffeur/login.html";
}
