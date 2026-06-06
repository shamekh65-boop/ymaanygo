/* ── ui.js ── */
function goPage(i,anim=true){
  i=Math.max(0,Math.min(2,i));
  curPg=i;
  document.querySelectorAll(".pg").forEach((pg,n)=>pg.classList.toggle("active",n===i));
  [0,1,2].forEach(n=>$(`tab${n}`).classList.toggle("a",n===i));
  if(i===1)renderAgenda();
  if(i===2)renderAccount();
}

function openSP(id){$(id).classList.add("open");}
function closeSP(id){
  $(id).classList.remove("open");
  if(id==="spDetail"&&detailMapObj){
    try{detailMapObj.remove();}catch(e){}
    detailMapObj=null;
  }
}

function toggleOnline(){
  online=!online;
  const b=$("onbtn");b.className="onbtn "+(online?"on":"off");
  $("ontxt").textContent=online?"Online":"Offline";
  renderHome();
  if(online){startLoc();tOk("✓ Je bent nu online");}
  else{stopLoc();tOk("Je bent nu offline");}
}

function doNav(e,enc){
  if(e)e.stopPropagation();
  const a=decodeURIComponent(enc);
  const url=navApp==="waze"?`https://waze.com/ul?q=${encodeURIComponent(a)}&navigate=yes`:navApp==="apple"?`maps://maps.apple.com/?q=${encodeURIComponent(a)}`:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;
  window.open(url,"_blank");
}

window.addEventListener("online",()=>{
  isNetworkOnline=true;
  $("offlineBanner").classList.remove("show");
  flushOfflineQueue();
});
window.addEventListener("offline",()=>{
  isNetworkOnline=false;
  $("offlineBanner").classList.add("show");
});

document.querySelectorAll(".sp").forEach(sp=>{
  let sx=0;
  sp.addEventListener("touchstart",e=>{sx=e.touches[0].clientX;},{passive:true});
  sp.addEventListener("touchend",e=>{if(e.changedTouches[0].clientX-sx>55)closeSP(sp.id);},{passive:true});
});
