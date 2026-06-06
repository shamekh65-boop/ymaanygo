/* ── gps.js ── */
function startLoc(){
  if(!navigator.geolocation||!U)return;
  const getStatus=()=>{
    if(!online)return"offline";
    return rides.some(r=>r.driver_id===U.id&&["accepted","on_the_way","arrived"].includes(r.status))?"in-ride":"available";
  };
  navigator.geolocation.getCurrentPosition(
    async({coords:{latitude:lat,longitude:lng}})=>{
      await SB.from("driver_locations").upsert({driver_id:U.id,driver_name:P?.name||U.email||"Chauffeur",lat,lng,status:getStatus(),updated_at:new Date().toISOString()},{onConflict:"driver_id"});
    },
    err=>console.warn("GPS init:",err.message),
    {enableHighAccuracy:true,timeout:10000}
  );
  locW=navigator.geolocation.watchPosition(
    async({coords:{latitude:lat,longitude:lng,accuracy,speed}})=>{
      if(!navigator.onLine)return;
      const locData={driver_id:U.id,driver_name:P?.name||U.email||"Chauffeur",lat,lng,accuracy:accuracy||null,speed:speed||null,status:getStatus(),updated_at:new Date().toISOString()};
      await SB.from("driver_locations").upsert(locData,{onConflict:"driver_id"});
      const now=Date.now();
      if(now-lastIDBWrite>IDB_THROTTLE_MS){lastIDBWrite=now;triggerBackgroundSync(locData);}
    },
    err=>console.warn("GPS:",err.message),
    {enableHighAccuracy:true,maximumAge:5000,timeout:15000}
  );
}

function stopLoc(){
  if(locW!=null){navigator.geolocation.clearWatch(locW);locW=null;}
  if(U)SB.from("driver_locations").delete().eq("driver_id",U.id).then(()=>{});
}

let wakeLock=null;
async function requestWakeLock(){
  try{
    if("wakeLock" in navigator){
      wakeLock=await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release",()=>{if(!document.hidden)requestWakeLock();});
    }
  }catch(e){console.warn("Wake Lock:",e.message);}
}

document.addEventListener("visibilitychange",()=>{
  if(!document.hidden&&online){requestWakeLock();if(locW===null&&U)startLoc();}
});
window.addEventListener("pageshow",()=>{if(online&&U&&locW===null)setTimeout(startLoc,500);});
document.addEventListener("click",function wakeOnce(){if(online)requestWakeLock();document.removeEventListener("click",wakeOnce);},{once:true});

function saveToIDB(key,value){
  return new Promise(resolve=>{
    const req=indexedDB.open("ymaanygo",1);
    req.onupgradeneeded=e=>e.target.result.createObjectStore("kv");
    req.onsuccess=e=>{
      const tx=e.target.result.transaction("kv","readwrite");
      tx.objectStore("kv").put(value,key);
      tx.oncomplete=()=>resolve();tx.onerror=()=>resolve();
    };
    req.onerror=()=>resolve();
  });
}
async function triggerBackgroundSync(locationData){
  if(!("serviceWorker" in navigator))return;
  try{
    await saveToIDB("pending_location",locationData);
    const reg=await navigator.serviceWorker.ready;
    if("sync" in reg)await reg.sync.register("gps-sync");
  }catch(e){console.warn("Background sync:",e);}
}
