/* ── account.js ── */
function renderAccount(){
  const name=P?.name||U?.email||"-";const avatar=P?.avatar_url||"";
  $("av").innerHTML=avatar?`<img src="${avatar}" alt="">`:ini(name);
  $("acname").textContent=name;$("acemail").textContent=U?.email||"-";
  const now=new Date(),dow=now.getDay()===0?6:now.getDay()-1;
  const ws=new Date(now);ws.setDate(now.getDate()-dow);ws.setHours(0,0,0,0);
  const wr=rides.filter(r=>r.driver_id===U?.id&&r.status==="completed"&&r.pickup_time&&new Date(r.pickup_time)>=ws);
  $("awritten").textContent=wr.length;
  $("awearn").textContent="€"+wr.reduce((s,r)=>s+pN(r.price),0).toFixed(2);
  updRadios();
}

function triggerAv(){$("avinput").click();}
async function onAv(e){
  const f=e.target.files[0];if(!f||!U)return;
  const ext=f.name.split(".").pop().toLowerCase();const filePath=`${U.id}/profile.${ext}`;
  const{error:upErr}=await SB.storage.from("driver-avatars").upload(filePath,f,{upsert:true});
  if(upErr){tErr("❌ Fout bij uploaden foto");return;}
  const{data}=SB.storage.from("driver-avatars").getPublicUrl(filePath);
  const avatarUrl=data.publicUrl+"?v="+Date.now();
  const{error}=await SB.from("profiles").update({avatar_url:avatarUrl}).eq("id",U.id);
  if(error){tErr("❌ Foto niet opgeslagen");return;}
  P.avatar_url=avatarUrl;$("av").innerHTML=`<img src="${avatarUrl}" alt="">`;tOk("✓ Profielfoto opgeslagen");
}

function openAccDetail(){
  const parts=(P?.name||"").trim().split(/\s+/);
  const firstName=parts[0]||"";
  const lastName=parts.slice(1).join(" ")||"";
  $("ff").value=firstName;$("fl").value=lastName;
  $("fp").value=P?.phone||"";$("fe").value=U?.email||"";
  openSP("spAccDet");
}

async function saveProfile(){
  const fn=$("ff").value.trim(),ln=$("fl").value.trim(),ph=$("fp").value.trim();
  const nm=[fn,ln].filter(Boolean).join(" ");
  const{error}=await SB.from("profiles").update({name:nm,phone:ph}).eq("id",U.id);
  if(error){tErr("❌ "+error.message);return;}
  P.name=nm;P.phone=ph;$("dname").textContent=nm||U.email;$("acname").textContent=nm;
  closeSP("spAccDet");tOk("✓ Profiel opgeslagen!");
}

function setNav(a){navApp=a;localStorage.setItem("nav",a);updRadios();}
function updRadios(){["waze","google","apple"].forEach(a=>{const e=$("nr-"+a);if(e)e.classList.toggle("on",navApp===a);});}
