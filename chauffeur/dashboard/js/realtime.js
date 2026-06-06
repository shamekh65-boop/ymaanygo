/* ── realtime.js ── */
function subscribeRealtime(){
  SB.channel("rides-rt-v3")
    .on("postgres_changes",{event:"*",schema:"public",table:"rides"},({eventType,new:nr,old:or})=>{handleChange(eventType,nr,or);})
    .subscribe(status=>{
      if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"){
        console.warn("Realtime verbinding mislukt, overschakelen naar polling…");
        startPolling();
      }
      if(status==="SUBSCRIBED"&&pollingInterval){
        clearInterval(pollingInterval);pollingInterval=null;
        console.log("Realtime hersteld, polling gestopt");
      }
    });
}

function startPolling(){
  if(pollingInterval)return;
  pollingInterval=setInterval(async()=>{
    const{data,error}=await SB.from("rides").select("*").or(`status.eq.pending,driver_id.eq.${U.id}`).order("pickup_time",{ascending:true});
    if(error||!data)return;
    data.filter(r=>r.status==="pending"&&!knownIds.has(r.id)).forEach(r=>{knownIds.add(r.id);stuurNotificatie(r);});
    rides=data;renderHome();updateBadge();
    if(curPg===1){drawCal();showDay(selDate);}
    if(curPg===2)renderAccount();
  },5000);
}

function handleChange(type,nr,or){
  if(type==="INSERT"){if(nr.status==="pending"){if(!knownIds.has(nr.id)){knownIds.add(nr.id);stuurNotificatie(nr);}if(!rides.find(r=>r.id===nr.id))rides.push(nr);}}
  else if(type==="UPDATE"){const i=rides.findIndex(r=>r.id===nr.id);if(i>-1)rides[i]=nr;else if(nr.status==="pending"||nr.driver_id===U.id)rides.push(nr);if(nr.status!=="pending")knownIds.delete(nr.id);}
  else if(type==="DELETE"){rides=rides.filter(r=>r.id!==or.id);knownIds.delete(or.id);}
  rides=rides.filter(r=>r.status==="pending"||r.driver_id===U.id);
  renderHome();updateBadge();
  if(curPg===1){drawCal();showDay(selDate);}
  if(curPg===2)renderAccount();
}