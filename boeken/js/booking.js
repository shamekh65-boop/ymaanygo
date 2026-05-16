/* =========================
   BOOKING
   ========================= */
let step = 1; // 1: address, 2: vehicle, 3: details
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

    const ok = isAddrOk();
    mainBtn.disabled = !ok;

  }else if(step === 2){

    mainBtn.innerHTML = `${T.next} ›`;

    const car = (document.getElementById('car').value || "").trim();
    mainBtn.disabled = !car;

  }else{

    mainBtn.innerHTML = `Boeken ›`;

    const when = document.getElementById('when').value;
    const ok = when && !isPastPickup(when, 15);

    mainBtn.disabled = !ok;
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

  const res = await fetch(url, {
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

  return {
    km: totalKm,
    min: totalMin
  };
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

  let perKm;

  if(car === "Busje"){
    perKm = pricing.PER_KM_VAN;
  }else{
    perKm = getPricePerKm(r.km);
  }

  let price = pricing.START + (r.km * perKm);

  if(car === "Comfort"){
    price += pricing.COMFORT;
  }

  document.getElementById('price').textContent =
    "€ " + price.toFixed(2);

  document.getElementById('meta').textContent =
    `Afstand: ${r.km.toFixed(1)} km • Duur: ${Math.round(r.min)} min`;
}

/* =========================
   BACKEND BOOKING
   ========================= */
async function submitBooking(){

  const lang = getLang();

  const from = (document.getElementById('from').value || "").trim();
  const to = (document.getElementById('to').value || "").trim();

  const when = document.getElementById('when').value;

  if(!when || isPastPickup(when, 15)){

    alert(
      lang === 'ar'
        ? "اختر وقتًا صحيحًا."
        : "Kies een geldig tijdstip."
    );

    return;
  }

  const pax = document.getElementById('pax').value;
  const car = document.getElementById('car').value;

  const priceText =
    document.getElementById('price').textContent || "0";

  const price = Number(
    priceText.replace("€", "").replace(",", ".").trim()
  ) || 0;

  const stopVals = stops.ids
    .map(id => (document.getElementById(id)?.value || "").trim())
    .filter(Boolean);

  const profile = getProfile();

  let customerName = profile.name || "ymaanyGO klant";
  let customerPhone = profile.phone || "";
  let customerEmail = profile.email || "";

  if(rideFor === 'other'){

    const otherName =
      (document.getElementById('otherName').value || "").trim();

    const otherPhone =
      (document.getElementById('otherPhone').value || "").trim();

    if(!otherName || !otherPhone){

      alert("Vul naam en telefoon van passagier in.");

      return;
    }

    customerName = otherName;
    customerPhone = otherPhone;
  }

  const rideDate = when.split("T")[0];
  const rideTime = when.split("T")[1];

  const bookingData = {
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_email: customerEmail,
    pickup_address: from,
    destination_address: to,
    ride_date: rideDate,
    ride_time: rideTime,
    passengers: Number(pax),
    vehicle_type: car,
    price: price,
    status: "pending",
    notes: stopVals.length
      ? "Tussenstops: " + stopVals.join(" -> ")
      : "",
    driver_id: null,
    driver_name: "",
    accepted_at: null
  };

  const mainBtn = document.getElementById('mainActionBtn');

  mainBtn.disabled = true;
  mainBtn.innerHTML = "Bezig met versturen...";

  const { error } = await db
    .from("bookings")
    .insert([bookingData]);

  mainBtn.disabled = false;
  mainBtn.innerHTML = "Boeking verstuurd";

  if(error){

    alert("Fout: " + error.message);

    return;
  }

  saveRideToHistory();

  alert(
    lang === 'ar'
      ? "تم إرسال طلب الرحلة بنجاح."
      : "Uw rit aanvraag is succesvol verzonden."
  );

  closeHomeSheet();
}