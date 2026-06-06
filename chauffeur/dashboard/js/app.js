/* ── app.js ── */
if("serviceWorker" in navigator){
  navigator.serviceWorker.register("/chauffeur/sw.js")
    .then(reg=>{console.log("SW:",reg.scope);})
    .catch(e=>console.warn("SW:",e));
  navigator.serviceWorker.addEventListener("message",e=>{
    if(e.data?.type==="OPEN_RIDE"&&e.data.rideId){
      goPage(0);setTimeout(()=>openDetail(e.data.rideId),400);
    }
  });
}

init();
updRadios();
