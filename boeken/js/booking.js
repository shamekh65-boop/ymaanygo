/* =========================
  BOOKING
  ========================= */
let step = 1;
let rideFor = 'me';
const stops = { ids: [], max: 3 };

/* =========================
  PRICING CACHE (van Supabase)
  ========================= */
let _pricing    = null;
let _surcharges = null;

async function loadPricingFromDB(){
  if(_pricing) return;

  try{
    const [priceRes, surchargeRes] = await Promise.all([
      db.from('pricing_settings').select('*').single(),
      db.from('postcode_surcharges').select('*')
    ]);

    _pricing    = priceRes.data    || null;
    _surcharges = surchargeRes.data || [];
  }catch(e){
    console.warn('Pricing laden mislukt, fallback gebruikt.', e);
  }

  if(!_pricing){
    _pricing = {
      base_start:    5.00,
      per_km_van:    2.50,
      comfort_fee:   7.00,
      tier_0_10:     2.30,
      tier_10_20:    1.80,
      tier_20_30:    1.60,
      tier_30_40:    1.40,
      tier_40_50:    1.30,
      tier_50_60:    1.20,
      tier_60_70:    1.15,
      tier_70_80:    1.10,
      tier_80_90:    1.05,
      tier_90_100:   1.00,
      tier_100_plus: 1.00,
      surge_active:  false
    };
  }
}

function resetPricingCache(){
  _pricing    = null;
  _surcharges = null;
}

function getBaseStart()  { return parseFloat(_pricing?.base_start)  || 5.00; }
function getVanPerKm()   { return parseFloat(_pricing?.per_km_van)  || 2.50; }
function getComfortFee() { return parseFloat(_pricing?.comfort_fee) || 7.00; }
function isSurgeActive() { return _pricing?.surge_active === true; }

function getPricePerKm(km){
  if(!_pricing) return 2.30;
  if(km <= 10)  return parseFloat(_pricing.tier_0_10)     || 2.30;
  if(km <= 20)  return parseFloat(_pricing.tier_10_20)    || 1.80;
  if(km <= 30)  return parseFloat(_pricing.tier_20_30)    || 1.60;
  if(km <= 40)  return parseFloat(_pricing.tier_30_40)    || 1.40;
  if(km <= 50)  return parseFloat(_pricing.tier_40_50)    || 1.30;
  if(km <= 60)  return parseFloat(_pricing.tier_50_60)    || 1.20;
  if(km <= 70)  return parseFloat(_pricing.tier_60_70)    || 1.15;
  if(km <= 80)  return parseFloat(_pricing.tier_70_80)    || 1.10;
  if(km <= 90)  return parseFloat(_pricing.tier_80_90)    || 1.05;
  if(km <= 100) return parseFloat(_pricing.tier_90_100)   || 1.00;
  return parseFloat(_pricing.tier_100_plus) || 1.00;
}

function getSurge(fromAddress, toAddress){
  if(!isSurgeActive() || !_surcharges || _surcharges.length === 0){
    return { pct: 0, flat: 0 };
  }

  const text = (fromAddress + ' ' + toAddress).toUpperCase().replace(/\s/g, '');

  let maxPct  = 0;
  let maxFlat = 0;

  for(const s of _surcharges){
    const pc = (s.postcode || '').toUpperCase().replace(/\s/g, '');
    if(pc && text.includes(pc)){
      if((s.surge_pct  || 0) > maxPct)  maxPct  = parseFloat(s.surge_pct)  || 0;
      if((s.surge_flat || 0) > maxFlat) maxFlat = parseFloat(s.surge_flat) || 0;
    }
  }

  return { pct: maxPct, flat: maxFlat };
}

function applySurge(price, surge){
  if(!surge || (surge.pct === 0 && surge.flat === 0)) return price;
  return price + (price * surge.pct / 100) + surge.flat;
}

let calcTimer = null;

/* =========================
  STEP FLOW
  ========================= */
function setStep(n){
  step = n;

  document.getElementById('step1').classList.toggle('hidden', n !== 1);
  document.getElementById('step2').classList.toggle('hidden', n !== 2);
  document.getElementById('step3').classList.toggle('hidden', n !== 3);
  document.getElementById('step3b').classList.toggle('hidden', n !== '3b');
  document.getElementById('step3c').classList.toggle('hidden', n !== '3c');

  document.getElementById('stepChip1').classList.toggle('active', n === 1);
  document.getElementById('stepChip2').classList.toggle('active', n === 2);
  document.getElementById('stepChip3').classList.toggle('active', n === 3 || n === '3b' || n === '3c');

  updateFooterButtons();

  if(n === 2 || n === 3 || n === '3b' || n === '3c'){
    setMinTime();
    autoCalc(true);
  }

  if(n === 2){
    setTimeout(() => initRouteMap(), 150);
  }

  if(n === '3b'){
    const inp = document.getElementById('s3bDtInput');
    if(inp) inp.value = tpToVal(tpNow(15));
    const sheet = document.getElementById('homeSheet');
    if(sheet) setTranslateY(sheet, snapPositions().expanded);
  }

  if(n === '3c'){
    const sheet = document.getElementById('homeSheet');
    if(sheet) setTranslateY(sheet, snapPositions().expanded);
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
  }else if(step === '3b'){
    mainBtn.innerHTML = `Bevestigen ›`;
    mainBtn.disabled = false;
  }else if(step === '3c'){
    mainBtn.innerHTML = `‹ Terug`;
    mainBtn.disabled = false;
  }else{
    mainBtn.innerHTML = `Boeken & betalen ›`;
    const when = document.getElementById('when').value;
    mainBtn.disabled = !(when && !isPastPickup(when, 15));
  }
}

function goBack(){
  if(step === '3b' || step === '3c'){
    setStep(3);
    return;
  }
  if(step === 1){
    closeHomeSheet();
    return;
  }
  setStep(step - 1);
}

function handleMainAction(){
  if(step === '3b'){
    const val = document.getElementById('s3bDtInput').value;
    if(val){
      const d = new Date(val);
      document.getElementById('timeCardVal').textContent = tpFormat(d);
      document.getElementById('when').value = val;
      document.getElementById('timeCard').classList.add('active-card');
    }
    setStep(3);
    return;
  }
  if(step === '3c'){
    setStep(3);
    return;
  }
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
  VEHICLE CARDS
  ========================= */
function selectVehicle(val){
  document.getElementById('car').value = val;
  document.querySelectorAll('.vcard').forEach(c => {
    c.classList.toggle('selected', c.dataset.val === val);
  });

  const pax = parseInt(document.getElementById('pax')?.value || 1, 10);
  if(val !== 'Busje' && pax > 4){
    document.getElementById('car').value = 'Busje';
    document.querySelectorAll('.vcard').forEach(c => {
      c.classList.toggle('selected', c.dataset.val === 'Busje');
    });
  }
  autoCalc(true);
  updateFooterButtons();
}

function updateVehiclePrices(km, surge){
  const priceGO      = applySurge(getBaseStart() + km * getPricePerKm(km), surge);
  const priceComfort = applySurge(getBaseStart() + km * getPricePerKm(km) + getComfortFee(), surge);
  const priceXL      = applySurge(getBaseStart() + km * getVanPerKm(), surge);

  const fmt = v => '€ ' + v.toFixed(2);
  const el  = id => document.getElementById(id);

  if(el('priceGO'))      el('priceGO').textContent      = fmt(priceGO);
  if(el('priceComfort')) el('priceComfort').textContent = fmt(priceComfort);
  if(el('priceXL'))      el('priceXL').textContent      = fmt(priceXL);
}

/* =========================
  ROUTE MAP (step 2)
  ========================= */
let routeMapInst = null;

async function initRouteMap(){
  const from = (document.getElementById('from').value || '').trim();
  const to   = (document.getElementById('to').value   || '').trim();
  if(!from || !to) return;

  const wrap = document.getElementById('routeMap');
  if(!wrap) return;

  if(!routeMapInst){
    routeMapInst = L.map('routeMap', {
      zoomControl:       false,
      attributionControl:false,
      dragging:          false,
      scrollWheelZoom:   false,
      doubleClickZoom:   false,
      touchZoom:         false
    });
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      { maxZoom: 18 }
    ).addTo(routeMapInst);
  }

  const [pA, pB] = await Promise.all([geocode(from), geocode(to)]);
  if(!pA || !pB) return;

  const A = [pA.lat, pA.lon];
  const B = [pB.lat, pB.lon];

  routeMapInst.eachLayer(l => {
    if(l instanceof L.Marker || l instanceof L.Polyline)
      routeMapInst.removeLayer(l);
  });

  const mkA = L.divIcon({
    className: '',
    html: `<div style="width:12px;height:12px;border-radius:50%;background:#2f7d32;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)"></div>`,
    iconSize: [12,12], iconAnchor: [6,6]
  });
  const mkB = L.divIcon({
    className: '',
    html: `<div style="width:12px;height:12px;border-radius:3px;background:#fff;border:2.5px solid #2f7d32;box-shadow:0 2px 8px rgba(0,0,0,.3)"></div>`,
    iconSize: [12,12], iconAnchor: [6,6]
  });

  L.marker(A, { icon: mkA }).addTo(routeMapInst);
  L.marker(B, { icon: mkB }).addTo(routeMapInst);

  try{
    const url  = `${API.OSRM}/route/v1/driving/${pA.lon},${pA.lat};${pB.lon},${pB.lat}?overview=full&geometries=geojson`;
    const data = await (await fetch(url)).json();
    if(data?.routes?.[0]?.geometry){
      const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
      L.polyline(coords, { color: '#2f7d32', weight: 4, opacity: .9 }).addTo(routeMapInst);
    }
  }catch(e){}

  routeMapInst.fitBounds([A, B], { padding: [20, 20] });
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
      document.querySelectorAll('.vcard').forEach(c => {
        c.classList.toggle('selected', c.dataset.val === 'Busje');
      });
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
  CALC
  ========================= */
function autoCalc(force){
  clearTimeout(calcTimer);
  calcTimer = setTimeout(()=>calc(force), force ? 80 : 520);
}

async function routeKm(A, B){
  const url = `${API.OSRM}/route/v1/driving/${A.lon},${A.lat};${B.lon},${B.lat}?overview=false`;

  const res  = await fetch(url, { headers:{ "Accept":"application/json" } });
  const data = await res.json();

  if(data?.code !== "Ok" || !data?.routes?.[0]) return null;

  return {
    km:  data.routes[0].distance / 1000,
    min: data.routes[0].duration / 60
  };
}

async function routeMulti(points){
  let totalKm = 0, totalMin = 0;

  for(let i = 0; i < points.length - 1; i++){
    const r = await routeKm(points[i], points[i + 1]);
    if(!r) return null;
    totalKm  += r.km;
    totalMin += r.min;
  }

  return { km: totalKm, min: totalMin };
}

async function calc(force){
  const from = (document.getElementById('from').value || "").trim();
  const to   = (document.getElementById('to').value   || "").trim();

  if(!from || !to){
    document.getElementById('price').textContent = "—";
    document.getElementById('meta').textContent  = "—";
    return;
  }

  const when = document.getElementById('when').value;
  if(step === 3 && (!when || isPastPickup(when, 15))){
    document.getElementById('price').textContent = "—";
    document.getElementById('meta').textContent  = "—";
    return;
  }

  document.getElementById('meta').textContent = "Berekenen...";

  await loadPricingFromDB();

  const stopVals = stops.ids
    .map(id => (document.getElementById(id)?.value || "").trim())
    .filter(Boolean);

  const addresses = [from, ...stopVals, to];
  const points    = [];

  for(const addr of addresses){
    const p = await geocode(addr);
    if(!p){
      document.getElementById('price').textContent = "—";
      document.getElementById('meta').textContent  = "—";
      return;
    }
    points.push(p);
  }

  const r = await routeMulti(points);
  if(!r){
    document.getElementById('price').textContent = "—";
    document.getElementById('meta').textContent  = "—";
    return;
  }

  const car   = document.getElementById('car').value;
  const surge = getSurge(from, to);

  let perKm = car === "Busje" ? getVanPerKm() : getPricePerKm(r.km);
  let price  = getBaseStart() + (r.km * perKm);

  if(car === "Comfort") price += getComfortFee();

  price = applySurge(price, surge);

  document.getElementById('price').textContent = "€ " + price.toFixed(2);

  let meta = `Afstand: ${r.km.toFixed(1)} km • Duur: ${Math.round(r.min)} min`;
  if(isSurgeActive() && (surge.pct > 0 || surge.flat > 0)){
    meta += ` ⚡ +${surge.pct}%${surge.flat > 0 ? ' +€' + surge.flat.toFixed(2) : ''}`;
  }
  document.getElementById('meta').textContent = meta;

  updateVehiclePrices(r.km, surge);
}

/* =========================
  SUBMIT BOOKING + PAYMENT
  ========================= */
async function submitBooking(){
  const lang    = getLang();
  const mainBtn = document.getElementById('mainActionBtn');

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

  const from = (document.getElementById('from').value || "").trim();
  const to   = (document.getElementById('to').value   || "").trim();
  const when = document.getElementById('when').value;

  if(!when || isPastPickup(when, 15)){
    alert(lang === 'ar' ? "اختر وقتًا صحيحًا." : "Kies een geldig tijdstip.");
    return;
  }

  const pax       = document.getElementById('pax').value;
  const car       = document.getElementById('car').value;
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
  let customerName  = profile.name  || "ymaanyGO klant";
  let customerPhone = profile.phone || "";
  let customerEmail = profile.email || user.email || "";

  if(rideFor === 'other'){
    const otherName  = (document.getElementById('otherName').value  || "").trim();
    const otherPhone = (document.getElementById('otherPhone').value || "").trim();

    if(!otherName || !otherPhone){
      alert(lang === 'ar'
        ? "أدخل اسم ورقم الراكب."
        : "Vul naam en telefoon van passagier in."
      );
      return;
    }

    customerName  = otherName;
    customerPhone = otherPhone;
  }

  const surge = getSurge(from, to);

  const rideData = {
    customer_id:    user.id,
    customer_name:  customerName,
    customer_phone: customerPhone,
    customer_email: customerEmail,
    from_address:   from,
    to_address:     to,
    stops:          stopVals,
    vehicle:        car,
    passengers:     Number(pax),
    pickup_time:    new Date(when).toISOString(),
    price:          priceText,
    surge_active:   isSurgeActive(),
    surge_pct:      surge.pct,
    surge_flat:     surge.flat,
    status:         "awaiting_payment",
    payment_status: "unpaid"
  };

  mainBtn.disabled  = true;
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
      mainBtn.disabled  = false;
      mainBtn.innerHTML = "Boeken & betalen ›";
      return;
    }

    rideInsert = data;
  }catch(e){
    console.error("Ride insert exception:", e);
    alert(lang === 'ar' ? "خطأ في الحجز. تحقق من الاتصال." : "Netwerkfout bij opslaan. Probeer opnieuw.");
    mainBtn.disabled  = false;
    mainBtn.innerHTML = "Boeken & betalen ›";
    return;
  }

  saveRideToHistory();

  mainBtn.innerHTML = "Betaling openen...";

  try{
    const paymentResponse = await fetch(
      "https://lxbfobdczjgqnotwsnki.supabase.co/functions/v1/create-payment",
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          amount:      priceNumber,
          description: `Taxi rit ${from} → ${to}`,
          ride_id:     rideInsert.id
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

  mainBtn.disabled  = false;
  mainBtn.innerHTML = "Boeken & betalen ›";
}

/* =========================
  COMPUTE HASH + SAVE
  ========================= */
function computeRideHash(ride){
  return JSON.stringify({
    from:       ride.from,
    to:         ride.to,
    stops:      ride.stops,
    when:       ride.when,
    vehicle:    ride.vehicle,
    passengers: ride.passengers,
    price:      ride.price
  });
}

function saveRideToHistory(){
  const from     = (document.getElementById('from').value || "").trim();
  const to       = (document.getElementById('to').value   || "").trim();
  const stopVals = stops.ids.map(id => (document.getElementById(id)?.value || "").trim()).filter(Boolean);
  const when     = document.getElementById('when').value;
  const pax      = document.getElementById('pax').value;
  const car      = document.getElementById('car').value;
  const price    = document.getElementById('price').textContent || "—";

  if(!from || !to || !when) return false;

  const ride = {
    id:         cryptoId(),
    from, to,
    stops:      stopVals,
    when,
    vehicle:    car,
    passengers: pax,
    price,
    createdAt:  new Date().toISOString()
  };

  const currentHash = computeRideHash(ride);
  if(lastSavedRideHash === currentHash) return false;

  const rides = getRides();
  rides.push(ride);
  localStorage.setItem(LS.rides, JSON.stringify(rides));
  lastSavedRideHash = currentHash;
  return true;
}
