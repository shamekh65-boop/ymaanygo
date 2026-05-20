/* =========================
   BOOKING
   ========================= */
let step = 1;
let rideFor = 'me';
const stops = { ids: [], max: 3 };

const pricing = {
  START: 5.00,
  PER_KM_STD: 2.00,
  PER_KM_VAN: 2.50,
  COMFORT: 7.00
};

let calcTimer = null;

/* =========================
   STEP FLOW
   ========================= */
function setStep(n){
  step = n;

  document.getElementById('step1').classList.toggle('hidden', n !== 1);
  document.getElementById('step2').classList.toggle('hidden', n !== 2);
  document.getElementById('step3').classList.toggle('hidden', n !== 3);

  document.getElementById('stepChip1').classList.toggle('active', n === 1);
  document.getElementById('stepChip2').classList.toggle('active', n === 2);
  document.getElementById('stepChip3').classList.toggle('active', n === 3);

  updateFooterButtons();

  if(n === 2 || n === 3){
    setMinTime();
    autoCalc(true);
  }
}

function updateFooterButtons(){
  const lang = getLang();
  const T = i18n[lang] || i18n.nl;

  const backBtn = document.getElementById('backBtn');
  const mainBtn = document.getElementById('mainActionBtn');

  backBtn.innerHTML = `‹ ${T.back}`;

  if(step === 1){
    mainBtn.innerHTML = `${T.next} ›`;
    mainBtn.disabled = !isAddrOk();
  }else if(step === 2){
    mainBtn.innerHTML = `${T.next} ›`;
    mainBtn.disabled = !(document.getElementById('car').value || "").trim();
  }else{
    mainBtn.innerHTML = `Boeken & betalen ›`;
    const when = document.getElementById('when').value;
    mainBtn.disabled = !(when && !isPastPickup(when, 15));
  }
}

function goBack(){
  if(step === 1){
    closeHomeSheet();
    return;
  }
  setStep(step - 1);
}

function handleMainAction(){
  if(step === 1 || step === 2){
    setStep(step + 1);
  }else{
    submitBooking();
  }
}

function isAddrOk(){
  const f = (document.getElementById('from').value || "").trim();
  const t = (document.getElementById('to').value || "").trim();
  return f.length >= 4 && t.length >= 4;
}

/* =========================
   RIDE FOR
   ========================= */
function setRideFor(v){
  rideFor = v;

  document.getElementById('forMeBtn').classList.toggle('active', v === 'me');
  document.getElementById('forOtherBtn').classList.toggle('active', v === 'other');
  document.getElementById('otherPersonBlock').classList.toggle('hidden', v !== 'other');
}

function bindPaxRule(){
  const pax = document.getElementById('pax');
  const car = document.getElementById('car');

  pax.addEventListener('change', ()=>{
    const n = parseInt(pax.value, 10);

    if(n > 4){
      car.value = "Busje";
      car.disabled = true;
    }else{
      car.disabled = false;
    }

    autoCalc(true);
    updateFooterButtons();
  });
}

/* =========================
   TIME
   ========================= */
function pad2(n){
  return String(n).padStart(2, '0');
}

function toLocalValue(d){
  return d.getFullYear() + "-" +
    pad2(d.getMonth() + 1) + "-" +
    pad2(d.getDate()) + "T" +
    pad2(d.getHours()) + ":" +
    pad2(d.getMinutes());
}

function setMinTime(){
  const now = new Date();
  now.setMinutes(now.getMinutes() + 20);

  document.getElementById('when').min = toLocalValue(now);

  if(!document.getElementById('when').value){
    document.getElementById('when').value = toLocalValue(now);
  }
}

/* =========================
   STOPS
   ========================= */
function addStop(){
  if(stops.ids.length >= stops.max){
    alert(
      getLang() === 'ar'
        ? `الحد الأقصى ${stops.max} توقفات.`
        : (getLang() === 'en'
          ? `Max ${stops.max} stops.`
          : `Maximaal ${stops.max} tussenstops.`)
    );
    return;
  }

  const idx = stops.ids.length + 1;
  const id = "stop" + idx;

  stops.ids.push(id);

  const wrap = document.getElementById('stopsWrap');
  const row = document.createElement('div');

  row.className = 'stop-row';
  row.id = id + 'Row';

  row.innerHTML = `
    <div class="dot stop"></div>
    <div class="field" style="flex:1;">
      <span class="glass"></span>
      <input id="${id}" type="text" autocomplete="off" placeholder="Stop ${idx}">
      <button class="icon" type="button" onclick="openPicker('${id}')">📍</button>
      <div id="${id}Suggest" class="suggest hidden"></div>
    </div>
    <button class="remove" type="button" onclick="removeStop('${id}')" title="Remove">✕</button>
  `;

  wrap.appendChild(row);
  bindSuggestInput(id);
  autoCalc(true);
}

function removeStop(id){
  const i = stops.ids.indexOf(id);
  if(i >= 0) stops.ids.splice(i, 1);

  const row = document.getElementById(id + 'Row');
  if(row) row.remove();

  autoCalc(true);
}

/* =========================
   PRICING
   ========================= */
function getPricePerKm(km){
  if(km <= 10) return 2.30;
  if(km <= 20) return 1.80;
  if(km <= 30) return 1.60;
  if(km <= 50) return 1.30;
  return 1.30;
}

function autoCalc(force){
  clearTimeout(calcTimer);
  calcTimer = setTimeout(()=>calc(force), force ? 80 : 520);
}

async function routeKm(A, B){
  const url = `${API.OSRM}/route/v1/driving/${A.lon},${A.lat};${B.lon},${B.lat}?overview=false`;

  const res = await fetch(url,{
    headers:{ "Accept":"application/json" }
  });

  const data = await res.json();

  if(data?.code !== "Ok" || !data?.routes?.[0]) return null;

  return {
    km: data.routes[0].distance / 1000,
    min: data.routes[0].duration / 60
  };
}

async function routeMulti(points){
  let totalKm = 0;
  let totalMin = 0;

  for(let i = 0; i < points.length - 1; i++){
    const r = await routeKm(points[i], points[i + 1]);
    if(!r) return null;

    totalKm += r.km;
    totalMin += r.min;
  }

  return { km: totalKm, min: totalMin };
}

async function calc(force){
  const from = (document.getElementById('from').value || "").trim();
  const to = (document.getElementById('to').value || "").trim();

  if(!from || !to){
    document.getElementById('price').textContent = "—";
    document.getElementById('meta').textContent = "—";
    return;
  }

  const when = document.getElementById('when').value;

  if(step === 3 && (!when || isPastPickup(when, 15))){
    document.getElementById('price').textContent = "—";
    document.getElementById('meta').textContent = "—";
    return;
  }

  document.getElementById('price').textContent = "Calculating...";
  document.getElementById('meta').textContent = "—";

  const stopVals = stops.ids
    .map(id => (document.getElementById(id)?.value || "").trim())
    .filter(Boolean);

  const addresses = [from, ...stopVals, to];
  const points = [];

  for(const addr of addresses){
    const p = await geocode(addr);

    if(!p){
      document.getElementById('price').textContent = "—";
      document.getElementById('meta').textContent = "—";
      return;
    }

    points.push(p);
  }

  const r = await routeMulti(points);

  if(!r){
    document.getElementById('price').textContent = "—";
    document.getElementById('meta').textContent = "—";
    return;
  }

  const car = document.getElementById('car').value;
  let perKm = car === "Busje" ? pricing.PER_KM_VAN : getPricePerKm(r.km);

  let price = pricing.START + (r.km * perKm);

  if(car === "Comfort"){
    price += pricing.COMFORT;
  }

  document.getElementById('price').textContent = "€ " + price.toFixed(2);
  document.getElementById('meta').textContent =
    `Afstand: ${r.km.toFixed(1)} km • Duur: ${Math.round(r.min)} min`;
}

/* =========================
   SUBMIT BOOKING + PAYMENT
   ========================= */
async function submitBooking(){
  const lang = getLang();
  const mainBtn = document.getElementById('mainActionBtn');

  // تأكد من تسجيل الدخول
  let user = null;
  try{
    const { data, error } = await db.auth.getUser();
    if(error || !data?.user){
      alert(lang === 'ar' ? "يجب تسجيل الدخول أولاً." : "Log eerst in.");
      window.location.href = "/klant-login.html";
      return;
    }
    user = data.user;
  }catch(e){
    console.error("Auth error:", e);
    alert(lang === 'ar' ? "خطأ في التحقق. حاول مجدداً." : "Authenticatie fout. Probeer opnieuw.");
    return;
  }

  // تحقق من البيانات
  const from = (document.getElementById('from').value || "").trim();
  const to = (document.getElementById('to').value || "").trim();
  const when = document.getElementById('when').value;

  if(!when || isPastPickup(when, 15)){
    alert(lang === 'ar' ? "اختر وقتًا صحيحًا." : "Kies een geldig tijdstip.");
    return;
  }

  const pax = document.getElementById('pax').value;
  const car = document.getElementById('car').value;
  const priceText = document.getElementById('price').textContent || "€0";

  const priceNumber = Number(
    priceText.replace("€", "").replace(",", ".").trim()
  ) || 0;

  if(priceNumber <= 0){
    alert(lang === 'ar' ? "السعر غير صحيح." : "Prijs is ongeldig.");
    return;
  }

  const stopVals = stops.ids
    .map(id => (document.getElementById(id)?.value || "").trim())
    .filter(Boolean);

  const profile = getProfile();
  let customerName = profile.name || "ymaanyGO klant";
  let customerPhone = profile.phone || "";
  let customerEmail = profile.email || user.email || "";

  if(rideFor === 'other'){
    const otherName = (document.getElementById('otherName').value || "").trim();
    const otherPhone = (document.getElementById('otherPhone').value || "").trim();

    if(!otherName || !otherPhone){
      alert(lang === 'ar'
        ? "أدخل اسم ورقم الراكب."
        : "Vul naam en telefoon van passagier in."
      );
      return;
    }

    customerName = otherName;
    customerPhone = otherPhone;
  }

  const rideData = {
    customer_id: user.id,
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_email: customerEmail,
    from_address: from,
    to_address: to,
    stops: stopVals,
    vehicle: car,
    passengers: Number(pax),
    pickup_time: new Date(when).toISOString(),
    price: priceText,
    status: "pending",
    payment_status: "unpaid"
  };

  // أرسل الحجز
  mainBtn.disabled = true;
  mainBtn.innerHTML = "Bezig met versturen...";

  let rideInsert = null;

  try{
    const { data, error: rideError } = await db
      .from("rides")
      .insert([rideData])
      .select()
      .single();

    if(rideError){
      console.error("Ride insert error:", rideError);
      alert("Fout bij opslaan: " + rideError.message);
      mainBtn.disabled = false;
      mainBtn.innerHTML = "Boeken & betalen ›";
      return;
    }

    rideInsert = data;
  }catch(e){
    console.error("Ride insert exception:", e);
    alert(lang === 'ar' ? "خطأ في الحجز. تحقق من الاتصال." : "Netwerkfout bij opslaan. Probeer opnieuw.");
    mainBtn.disabled = false;
    mainBtn.innerHTML = "Boeken & betalen ›";
    return;
  }

  // أرسل إشعار Push
  try{
    await fetch("https://lxbfobdczjgqnotwsnki.supabase.co/functions/v1/send-push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Nieuwe rit beschikbaar",
        body: `${from} → ${to} • ${priceText}`
      })
    });
  }catch(e){
    console.warn("Push notification fout:", e);
    // لا نوقف العملية لو Push فشل
  }

  // احفظ محلياً
  saveRideToHistory();

  // افتح صفحة الدفع
  mainBtn.innerHTML = "Betaling openen...";

  try{
    const paymentResponse = await fetch(
      "https://lxbfobdczjgqnotwsnki.supabase.co/functions/v1/create-payment",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: priceNumber,
          description: `Taxi rit ${from} → ${to}`,
          ride_id: rideInsert.id
        })
      }
    );

    const paymentData = await paymentResponse.json();

    if(paymentData.checkoutUrl){
      window.location.href = paymentData.checkoutUrl;
      return;
    }

    console.error("Payment response:", paymentData);
    alert(lang === 'ar' ? "خطأ في الدفع. حاول مجدداً." : "Betaling fout. Probeer opnieuw.");

  }catch(e){
    console.error("Payment exception:", e);
    alert(lang === 'ar' ? "خطأ في الاتصال بالدفع." : "Netwerkfout bij betaling. Probeer opnieuw.");
  }

  mainBtn.disabled = false;
  mainBtn.innerHTML = "Boeken & betalen ›";
}
