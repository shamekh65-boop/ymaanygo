/* =========================
   MAP + GEO + PICKER + ROUTE
   ========================= */

const API = {
  NOMINATIM: "https://nominatim.openstreetmap.org",
  OSRM: "https://router.project-osrm.org"
};

let map = null;
let myMarker = null;
let pickMap = null;
let activeField = 'from';
let pickerUpdating = false;

/* route layers */
let routeLine = null;
let routeMarkers = [];
let routeEtaMarker = null;

/* =========================
   GEO HELPERS
   ========================= */
async function geocode(q){
  const url =
    API.NOMINATIM +
    "/search?format=json&limit=1&countrycodes=nl&addressdetails=1&q=" +
    encodeURIComponent(q);

  const res = await fetch(url, {
    headers: { "Accept":"application/json" }
  });

  const data = await res.json();

  if(!data?.[0]) return null;

  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon)
  };
}

async function reverse(lat, lon){
  const url =
    API.NOMINATIM +
    `/reverse?format=json&zoom=18&lat=${lat}&lon=${lon}&addressdetails=1`;

  const res = await fetch(url, {
    headers: { "Accept":"application/json" }
  });

  const data = await res.json();
  const a = data?.address || {};

  const road = a.road || a.pedestrian || "";
  const house = a.house_number || "";
  const city = a.city || a.town || a.village || "";
  const postcode = a.postcode || "";

  if(!road || !city) return data?.display_name || null;

  const line = `${road} ${house}`.trim();
  return `${line}, ${postcode ? postcode + " " : ""}${city}, Nederland`
    .replace(/\s+/g, " ")
    .trim();
}

async function suggest(q){
  const url =
    API.NOMINATIM +
    "/search?format=json&limit=6&countrycodes=nl&addressdetails=1&q=" +
    encodeURIComponent(q);

  const res = await fetch(url, {
    headers: { "Accept":"application/json" }
  });

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function formatSug(it){
  const a = it.address || {};
  const road = a.road || a.pedestrian || a.footway || "";
  const house = a.house_number || "";
  const city = a.city || a.town || a.village || "";
  const postcode = a.postcode || "";

  const line1 =
    `${road} ${house}`.trim() ||
    (it.display_name || "").split(",")[0];

  const line2 = `${postcode ? postcode + " " : ""}${city}`.trim();

  return { line1, line2 };
}

function setInputValue(fieldId, it){
  const a = it.address || {};
  const road = a.road || a.pedestrian || a.footway || "";
  const house = a.house_number || "";
  const city = a.city || a.town || a.village || "";
  const postcode = a.postcode || "";

  const line =
    `${(road + " " + house).trim()}, ${postcode ? postcode + " " : ""}${city}, Nederland`
      .replace(/\s+/g, " ")
      .trim();

  document.getElementById(fieldId).value = line || it.display_name || "";
}

/* =========================
   SUGGESTIONS
   ========================= */
function getSuggestBox(fieldId){
  if(fieldId === 'from') return document.getElementById('fromSuggest');
  if(fieldId === 'to') return document.getElementById('toSuggest');
  return document.getElementById(fieldId + 'Suggest');
}

function hideSuggest(fieldId){
  const box = getSuggestBox(fieldId);
  if(!box) return;
  box.classList.add('hidden');
  box.innerHTML = "";
}

function showSuggest(fieldId, favItems, nomItems){
  const box = getSuggestBox(fieldId);
  if(!box) return;

  const parts = [];

  if(favItems.length){
    favItems.forEach(f => {
      parts.push(`
        <div class="s-item" data-kind="fav" data-addr="${escapeHtmlAttr(f.addr)}">
          <div class="s-top"><span class="badge">★</span> <span>${escapeHtml(f.name)}</span></div>
          <div class="s-sub">${escapeHtml(f.addr)}</div>
        </div>
      `);
    });
  }

  nomItems.forEach((it, i) => {
    const t = formatSug(it);
    parts.push(`
      <div class="s-item" data-kind="nom" data-i="${i}">
        <div class="s-top">${escapeHtml(t.line1)}</div>
        ${t.line2 ? `<div class="s-sub">${escapeHtml(t.line2)}</div>` : ""}
      </div>
    `);
  });

  if(!parts.length){
    hideSuggest(fieldId);
    return;
  }

  box.innerHTML = parts.join("");
  box.classList.remove('hidden');

  box.querySelectorAll('.s-item').forEach(el => {
    el.addEventListener('mousedown', (e) => e.preventDefault());

    el.addEventListener('click', () => {
      const kind = el.dataset.kind;

      if(kind === 'fav'){
        const addr = el.dataset.addr || "";

        if(fieldId === 'from'){
          document.getElementById('from').value = addr;
          hideSuggest('from');
        }else{
          document.getElementById('to').value = addr;
          hideSuggest('to');
        }

        updateFooterButtons();
        autoCalc(true);
        return;
      }

      if(kind === 'nom'){
        const idx = Number(el.dataset.i);
        const it = nomItems[idx];
        setInputValue(fieldId, it);
        hideSuggest(fieldId);
        updateFooterButtons();
        autoCalc(true);
      }
    });
  });
}

function bindSuggestInput(fieldId){
  const input = document.getElementById(fieldId);
  if(!input) return;

  const run = debounce(async () => {
    const q = input.value.trim();

    if(q.length < 3){
      hideSuggest(fieldId);
      return;
    }

    const favs = getFavs()
      .filter(f => {
        const s = (f.name + " " + f.addr).toLowerCase();
        return s.includes(q.toLowerCase());
      })
      .slice(0, 3);

    const items = await suggest(q);
    showSuggest(fieldId, favs, items);
  }, 250);

  input.addEventListener('input', () => {
    run();
    updateFooterButtons();
    autoCalc(false);
  });

  input.addEventListener('focus', () => {
    const q = input.value.trim();
    if(q.length >= 3) run();
  });

  input.addEventListener('blur', () => {
    setTimeout(() => hideSuggest(fieldId), 160);
  });

  input.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') hideSuggest(fieldId);
  });
}

function swapFT(){
  const a = document.getElementById('from');
  const b = document.getElementById('to');
  const t = a.value;
  a.value = b.value;
  b.value = t;
  updateFooterButtons();
  autoCalc(true);
}

/* =========================
   MAIN MAP
   ========================= */
function initMap(){
  map = L.map('map', { zoomControl:false });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; CartoDB'
  }).addTo(map);

  map.setView([52.3702, 4.8952], 12);

  map.on('click', () => {
    if(document.getElementById('homeSheet').getAttribute('aria-hidden') === 'true'){
      openHomeSheet();
    }
  });

  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      map.setView([lat, lon], 15);

      if(!myMarker){
        myMarker = L.circleMarker([lat, lon], {
          radius:8,
          weight:2,
          color:'#007bff',
          fillColor:'#007bff',
          fillOpacity:0.8
        }).addTo(map);
      }else{
        myMarker.setLatLng([lat, lon]);
      }

      const addr = await reverse(lat, lon);
      if(addr){
        const from = document.getElementById('from');
        if(from && !from.value.trim()){
          from.value = addr;
          updateFooterButtons();
          autoCalc(true);
        }
      }
    }, () => {});
  }
}

async function useMyLocationAsFrom(){
  if(!navigator.geolocation){
    alert(
      getLang() === 'ar'
        ? "المتصفح لا يدعم الموقع."
        : (getLang() === 'en' ? "Geolocation not supported." : "Locatie niet ondersteund.")
    );
    return;
  }

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    map.setView([lat, lon], 16);

    const addr = await reverse(lat, lon);
    if(addr){
      document.getElementById('from').value = addr;
      updateFooterButtons();
      autoCalc(true);
    }
  }, () => {
    alert(
      getLang() === 'ar'
        ? "تم رفض إذن الموقع."
        : (getLang() === 'en' ? "Location permission denied." : "Locatietoegang geweigerd.")
    );
  });
}

/* =========================
   ROUTE DRAWING
   ========================= */
function clearRoute(){
  if(routeLine){
    map.removeLayer(routeLine);
    routeLine = null;
  }

  routeMarkers.forEach(m => {
    if(map.hasLayer(m)) map.removeLayer(m);
  });
  routeMarkers = [];

  if(routeEtaMarker && map.hasLayer(routeEtaMarker)){
    map.removeLayer(routeEtaMarker);
    routeEtaMarker = null;
  }
}

function createDotIcon(color){
  return L.divIcon({
    className: 'custom-route-dot',
    html: `
      <div style="
        width:16px;
        height:16px;
        border-radius:50%;
        background:${color};
        border:3px solid white;
        box-shadow:0 4px 10px rgba(0,0,0,.25);
      "></div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
}

function createEtaIcon(text){
  return L.divIcon({
    className: 'custom-eta-badge',
    html: `
      <div style="
        background:#5a5ce6;
        color:#fff;
        padding:8px 12px;
        border-radius:999px;
        font-size:12px;
        font-weight:900;
        white-space:nowrap;
        box-shadow:0 10px 20px rgba(0,0,0,.18);
      ">
        ${text}
      </div>
    `,
    iconSize: [120, 34],
    iconAnchor: [60, 42]
  });
}

function formatEtaArrival(durationMin){
  const lang = getLang();
  const now = new Date();
  now.setMinutes(now.getMinutes() + Math.max(1, Math.round(durationMin)));

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');

  if(lang === 'ar') return `الوصول ${hh}:${mm}`;
  if(lang === 'en') return `Arrival ${hh}:${mm}`;
  return `Aankomst ${hh}:${mm}`;
}

async function drawRouteOnMap(points){
  if(!map || !points || points.length < 2){
    clearRoute();
    return null;
  }

  const coords = points.map(p => `${p.lon},${p.lat}`).join(';');
  const url =
    `${API.OSRM}/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  const res = await fetch(url, {
    headers: { "Accept":"application/json" }
  });

  const data = await res.json();

  if(data?.code !== "Ok" || !data?.routes?.[0]){
    clearRoute();
    return null;
  }

  const route = data.routes[0];

  clearRoute();

  routeLine = L.geoJSON(route.geometry, {
    style: {
      color: "#4e77ff",
      weight: 6,
      opacity: 0.95,
      lineCap: "round",
      lineJoin: "round"
    }
  }).addTo(map);

  const first = points[0];
  const last = points[points.length - 1];

  const startMarker = L.marker([first.lat, first.lon], {
    icon: createDotIcon("#2f7d32")
  }).addTo(map);

  const endMarker = L.marker([last.lat, last.lon], {
    icon: createDotIcon("#111")
  }).addTo(map);

  routeMarkers.push(startMarker, endMarker);

  const etaText = formatEtaArrival(route.duration / 60);
  routeEtaMarker = L.marker([last.lat, last.lon], {
    icon: createEtaIcon(etaText)
  }).addTo(map);

  map.fitBounds(routeLine.getBounds(), {
    padding: [60, 60]
  });

  return {
    km: route.distance / 1000,
    min: route.duration / 60
  };
}

/* =========================
   FULLSCREEN PICKER
   ========================= */
function openPicker(fieldId){
  activeField = fieldId;
  document.getElementById('picked').textContent = "—";
  document.getElementById('pickSearch').value = "";

  const T = i18n[getLang()] || i18n.nl;
  const confirmText =
    (fieldId === 'from') ? T.pickFrom :
    (fieldId === 'to') ? T.pickTo :
    T.pickStop;

  document.getElementById('pickConfirm').textContent = confirmText;

  document.getElementById('overlay').classList.add('show');
  document.getElementById('pickModal').classList.add('open');

  setTimeout(async () => {
    if(pickMap){
      pickMap.remove();
      pickMap = null;
    }

    pickMap = L.map('pickMap', { zoomControl:false });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; CartoDB'
    }).addTo(pickMap);

    pickMap.on('moveend', pickerOnMoveEnd);

    pickMap.invalidateSize();
    setTimeout(() => pickMap.invalidateSize(), 250);

    const val = (document.getElementById(activeField)?.value || "").trim();

    if(val){
      const p = await geocode(val);
      if(p){
        pickMap.setView([p.lat, p.lon], 17);
        await pickerOnMoveEnd();
        return;
      }
    }

    if(map){
      const c = map.getCenter();
      pickMap.setView([c.lat, c.lng], Math.max(13, map.getZoom()));
      await pickerOnMoveEnd();
      return;
    }

    pickMap.setView([52.3702, 4.8952], 14);
    await pickerOnMoveEnd();
  }, 60);
}

function closePicker(){
  document.getElementById('pickModal').classList.remove('open');

  if(pickMap){
    pickMap.remove();
    pickMap = null;
  }

  setTimeout(() => {
    const anyOpen = document.querySelector('.sheet.open');
    const favOpen = (document.getElementById('favModal')?.style.display === 'flex');
    const homeOpen = document.getElementById('homeSheet').getAttribute('aria-hidden') === 'false';

    if(!anyOpen && !favOpen && !homeOpen){
      document.getElementById('overlay').classList.remove('show');
    }
  }, 30);
}

function getPinLatLng(){
  const mapEl = document.getElementById('pickMap');
  const pinEl = document.querySelector('#pickModal .pin');

  const mr = mapEl.getBoundingClientRect();
  const pr = pinEl.getBoundingClientRect();

  const x = (pr.left + pr.width / 2) - mr.left;
  const y = (pr.top + pr.height) - mr.top;

  return pickMap.containerPointToLatLng([x, y]);
}

async function pickerOnMoveEnd(){
  if(!pickMap || pickerUpdating) return;

  pickerUpdating = true;

  const p = getPinLatLng();
  const addr = await reverse(p.lat, p.lng);

  document.getElementById('picked').textContent =
    addr ||
    (
      getLang() === 'ar'
        ? "حرّك الخريطة للحصول على عنوان دقيق."
        : (getLang() === 'en'
          ? "Move map for an exact address."
          : "Verplaats de kaart voor een exact adres.")
    );

  pickerUpdating = false;
}

async function pickerSearch(){
  const q = (document.getElementById('pickSearch').value || "").trim();
  if(!q) return;

  const p = await geocode(q);

  if(!p){
    alert(
      getLang() === 'ar'
        ? "لم يتم العثور على العنوان."
        : (getLang() === 'en' ? "Address not found." : "Adres niet gevonden.")
    );
    return;
  }

  pickMap.setView([p.lat, p.lon], 17);
  await pickerOnMoveEnd();
}

async function pickerConfirm(){
  const p = getPinLatLng();
  const addr = await reverse(p.lat, p.lng);

  if(!addr){
    alert(
      getLang() === 'ar'
        ? "العنوان غير واضح. حرّك الخريطة وحاول."
        : (getLang() === 'en'
          ? "Address not accurate. Move map and try again."
          : "Adres niet nauwkeurig. Verplaats en probeer opnieuw.")
    );
    return;
  }

  const field = document.getElementById(activeField);
  if(field) field.value = addr;

  closePicker();
  updateFooterButtons();
  autoCalc(true);
}
