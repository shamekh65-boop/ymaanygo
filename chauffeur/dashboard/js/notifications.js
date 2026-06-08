/* ── notifications.js ── */

function getCity(address) {
  if (!address) return "-";
  const parts = address.split(",").map(p => p.trim());
  if (parts.length >= 2) {
    const cityPart = parts[parts.length - 2];
    return cityPart.replace(/^\d{4}\s?[A-Z]{2}\s+/, "").trim();
  }
  return parts[0];
}

async function registerPush(){
  if(!("serviceWorker" in navigator)||!("PushManager" in window))return;
  if(Notification.permission!=="granted")return;
  try{
    const reg=await navigator.serviceWorker.ready;
    let sub=await reg.pushManager.getSubscription();
    if(!sub){sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(VAPID_PUBLIC_KEY)});}
    const j=sub.toJSON();
    await SB.from("push_subscriptions").upsert({driver_id:U.id,endpoint:j.endpoint,p256dh:j.keys.p256dh,auth:j.keys.auth,user_agent:navigator.userAgent},{onConflict:"endpoint"});
  }catch(e){console.warn(e);}
}

function askNotifPermission(){
  if(!("Notification" in window))return;
  const btn=$("notifBtn");
  if(Notification.permission==="granted"){if(btn)btn.style.display="none";registerPush();return;}
  if(Notification.permission==="denied"){if(btn)btn.style.display="none";return;}
  if(btn)btn.style.display="flex";
  Notification.requestPermission().then(p=>{if(p==="granted"){tOk("✅ Notificaties ingeschakeld!");if(btn)btn.style.display="none";registerPush();}});
}

function stuurNotificatie(r){
  const van=getCity(r.from_address);
  const naar=getCity(r.to_address);
  const dt=r.pickup_time?new Date(r.pickup_time):null;
  const delen=[
    dt?dt.toLocaleDateString("nl-NL",{weekday:"long",day:"numeric",month:"long"}):"",
    tT(r.pickup_time),
    r.distance?`${r.distance}km`:"",
    r.price?`Rit prijs € ${r.price}`:"",
    r.passengers?`${r.passengers} Passagier${r.passengers>1?"s":""}`:""
  ].filter(Boolean);
  const titel=`${van} → ${naar}`;
  const tekst=delen.join(". ")+".";
  notifRid=r.id;
  speelGeluid();
  if("vibrate" in navigator)navigator.vibrate([300,100,300,100,500]);
  $("ntitle").textContent=titel;$("nbody").textContent=tekst;
  const banner=$("notif");banner.classList.add("show");
  clearTimeout(notifTimer);notifTimer=setTimeout(()=>banner.classList.remove("show"),9000);
  if("Notification" in window&&Notification.permission==="granted"){
    try{
      if(navigator.serviceWorker&&navigator.serviceWorker.controller){
        navigator.serviceWorker.ready.then(reg=>{
          if(reg.active){
            reg.active.postMessage({type:"SHOW_NOTIFICATION",title:`🚖 ${titel}`,body:tekst,rideId:r.id});
          }
        });
      }else{
        const n=new Notification(`🚖 ${titel}`,{body:tekst,icon:"/favicon.ico",tag:"rit-"+r.id,requireInteraction:true});
        n.onclick=()=>{window.focus();n.close();notifRid=r.id;goPage(0);setTimeout(()=>openDetail(r.id),300);};
      }
    }catch(e){console.warn(e);}
  }
}

function notifTap(){$("notif").classList.remove("show");if(notifRid){goPage(0);setTimeout(()=>openDetail(notifRid),300);}}

function speelGeluid(){
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    [[440,0,.15],[550,.18,.15],[660,.36,.15],[880,.54,.2],[660,.78,.15],[880,.96,.25]].forEach(([freq,start,dur])=>{
      const osc=ctx.createOscillator(),gain=ctx.createGain();
      osc.connect(gain);gain.connect(ctx.destination);osc.frequency.value=freq;osc.type="sine";
      const t=ctx.currentTime+start;
      gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.35,t+.04);gain.gain.exponentialRampToValueAtTime(.001,t+dur);
      osc.start(t);osc.stop(t+dur);
    });
  }catch(e){}
}
