/* =========================
   MAP + GEO + PICKER - FAST VERSION
========================= */
const API = {
  NOMINATIM: "https://nominatim.openstreetmap.org",
  OSRM: "https://router.project-osrm.org"
};

let map = null;
let myMarker = null;
let pickMap = null;
let activeField = "from";
let pickerUpdating = false;

let mapStarted = false;
let reverseTimer = null;
let lastReverseKey = "";
const reverseCache = new Map();

async function geocode(q){
  const url =
    API.NOMINATIM +
    "/search?format=json&limit=1&countrycodes=nl&addressdetails=1&accept-language=nl&q=" +
    encodeURIComponent(q);

  try{
    const res = await fetch(url, { headers:{ "Accept":"application/json" }});
    const data = await res.json();

    if(!data?.[0]) return null;

    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon)
    };
  }catch(e){
    console.warn("geocode error", e);
    return null;
  }
}

async function reverseFast(lat, lon){
  const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;

  if(reverseCache.has(key)){
    return reverseCache.get(key);
  }

  const url =
    API.NOMINATIM +
    `/reverse?format=json&zoom=18&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=nl`;

  try{
    const res = await fetch(url, { headers:{ "Accept":"application/json" }});
    const data = await res.json();
    const a = data?.address || {};

    const road = a.road || a.pedestrian || a.footway || "";
    const house = a.house_number || "";
    const city = a.city || a.town || a.village || a.municipality || "";
    const postcode = a.postcode || "";

    let result = null;

    if(road && city){
      const line = `${road} ${house}`.trim();
      result = `${line}, ${postcode ? postcode + " " : ""}${city}, Nederland`
        .replace(/\s+/g, " ")
        .trim();
    }else{
      result = data?.display_name || null;
    }

    reverseCache.set(key, result);
    return result;
  }catch(e){
    console.warn("reverse error", e);
    return null;
  }
}

async function reverse(lat, lon){
  return reverseFast(lat, lon);
}

async function suggest(q){
  let searchText = q.trim();

  if(searchText.length <= 4 && !searchText.includes(" ")){
    searchText = searchText + " Nederland";
  }

  const url =
    API.NOMINATIM +
    "/search?format=json" +
    "&limit=8" +
    "&countrycodes=nl" +
    "&addressdetails=1" +
    "&dedupe=1" +
    "&accept-language=nl" +
    "&q=" + encodeURIComponent(searchText);

  try{
    const res = await fetch(url, { headers:{ "Accept":"application/json" }});
    const data = await res.json();

    if(!Array.isArray(data)) return [];

    return data.filter(x => {
      const cls = x.class || "";
      const type = x.type || "";

      return (
        cls === "highway" ||
        cls === "place" ||
        cls === "amenity" ||
        type === "residential" ||
        type === "tertiary" ||
        type === "secondary" ||
        type === "primary" ||
        type === "house" ||
        type === "yes" ||
        x.address?.road ||
        x.address?.house_number ||
        x.address?.city ||
        x.address?.town ||
        x.address?.village
      );
    });
  }catch(e){
    console.warn("suggest error", e);
    return [];
  }
}

function formatSug(it){
  const a = it.address || {};
  const road = a.road || a.pedestrian || a.footway || "";
  const house = a.house_number || "";
  const city = a.city || a.town || a.village || a.municipality || "";
  const postcode = a.postcode || "";

  const line1 = `${road} ${house}`.trim() || (it.display_name || "").split(",")[0];
  const line2 = `${postcode ? postcode + " " : ""}${city}`.trim();

  return { line1, line2 };
}

function setInputValue(fieldId, it){
  const a = it.address || {};
  const road = a.road || a.pedestrian || a.footway || "";
  const house = a.house_number || "";
  const city = a.city || a.town || a.village || a.municipality || "";
  const postcode = a.postcode || "";

  let line = "";

  if(road || city){
    line = `${(road + " " + house).trim()}, ${postcode ? postcode + " " : ""}${city}, Nederland`;
  }else{
    line = it.display_name || "";
  }

  document.getElementById(fieldId).value = line
    .replace(/\s+/g, " ")
    .replace(/^,\s*/, "")
    .trim();
}

function getSuggestBox(fieldId){
  if(fieldId === "from") return document.getElementById("fromSuggest");
  if(fieldId === "to") return document.getElementById("toSuggest");
  return document.getElementById(fieldId + "Suggest");
}

function hideSuggest(fieldId){
  const box = getSuggestBox(fieldId);
  if(!box) return;
  box.classList.add("hidden");
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
  box.classList.remove("hidden");

  box.querySelectorAll(".s-item").forEach(el => {
    el.onmousedown = e => e.preventDefault();

    el.onclick = () => {
      const kind = el.dataset.kind;

      if(kind === "fav"){
        const addr = el.dataset.addr || "";
        document.getElementById(fieldId).value = addr;
        hideSuggest(fieldId);
        updateFooterButtons();
        autoCalc(true);
        return;
      }

      if(kind === "nom"){
        const idx = Number(el.dataset.i);
        const it = nomItems[idx];
        setInputValue(fieldId, it);
        hideSuggest(fieldId);
        updateFooterButtons();
        autoCalc(true);
      }
    };
  });
}

function bindSuggestInput(fieldId){
  const input = document.getElementById(fieldId);
  if(!input) return;

  const run = debounce(async () => {
    const q = input.value.trim();

    if(q.length < 2){
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
  }, 450);

  input.oninput = () => {
    run();
    updateFooterButtons();
    autoCalc(false);
  };

  input.onfocus = () => {
    const q = input.value.trim();
    if(q.length >= 2) run();
  };

  input.onblur = () => setTimeout(() => hideSuggest(fieldId), 160);

  input.onkeydown = e => {
    if(e.key === "Escape") hideSuggest(fieldId);
  };
}

function swapFT(){
  const a = document.getElementById("from");
  const b = document.getElementById("to");

  const t = a.value;
  a.value = b.value;
  b.value = t;

  updateFooterButtons();
  autoCalc(true);
}

function initMap(){
  if(mapStarted || map) return;
  mapStarted = true;

  map = L.map("map", {
    zoomControl:false,
    preferCanvas:true
  });

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution:"",
    maxZoom:18,
    updateWhenIdle:true,
    keepBuffer:1
  }).addTo(map);

  map.setView([52.3702, 4.8952], 12);

  map.on("click", () => {
    if(document.getElementById("homeSheet")?.getAttribute("aria-hidden") === "true"){
      openHomeSheet();
    }
  });

  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(async pos => {
      if(!map) return;

      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      map.setView([lat, lon], 15);

      if(!myMarker){
        myMarker = L.circleMarker([lat, lon], {
          radius:8,
          weight:2,
          color:"#007bff",
          fillColor:"#007bff",
          fillOpacity:0.8,
          renderer:L.canvas()
        }).addTo(map);
      }else{
        myMarker.setLatLng([lat, lon]);
      }

      const from = document.getElementById("from");
      if(from && !from.value.trim()){
        const addr = await reverseFast(lat, lon);
        if(addr){
          from.value = addr;
          updateFooterButtons();
          autoCalc(true);
        }
      }
    }, () => {}, {
      enableHighAccuracy:false,
      timeout:6000,
      maximumAge:60000
    });
  }
}

async function useMyLocationAsFrom(){
  if(!navigator.geolocation){
    alert(
      getLang() === "ar"
        ? "المتصفح لا يدعم الموقع."
        : (getLang() === "en" ? "Geolocation not supported." : "Locatie niet ondersteund.")
    );
    return;
  }

  navigator.geolocation.getCurrentPosition(async pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    if(map) map.setView([lat, lon], 16);

    const addr = await reverseFast(lat, lon);

    if(addr){
      document.getElementById("from").value = addr;
      updateFooterButtons();
      autoCalc(true);
    }
  }, () => {
    alert(
      getLang() === "ar"
        ? "تم رفض إذن الموقع."
        : (getLang() === "en" ? "Location permission denied." : "Locatietoegang geweigerd.")
    );
  }, {
    enableHighAccuracy:false,
    timeout:6000,
    maximumAge:60000
  });
}

function openPicker(fieldId){
  activeField = fieldId;

  document.getElementById("picked").textContent = "—";
  document.getElementById("pickSearch").value = "";

  const T = i18n[getLang()] || i18n.nl;

  const confirmText =
    fieldId === "from" ? T.pickFrom :
    fieldId === "to" ? T.pickTo :
    T.pickStop;

  document.getElementById("pickConfirm").textContent = confirmText;

  document.getElementById("overlay").classList.add("show");
  document.getElementById("pickModal").classList.add("open");

  setTimeout(async () => {
    if(pickMap){
      pickMap.remove();
      pickMap = null;
    }

    pickMap = L.map("pickMap", {
      zoomControl:false,
      preferCanvas:true
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution:"",
      maxZoom:18,
      updateWhenIdle:true,
      keepBuffer:1
    }).addTo(pickMap);

    pickMap.on("moveend zoomend", pickerOnMoveEnd);

    pickMap.invalidateSize();
    setTimeout(() => {
      if(pickMap) pickMap.invalidateSize();
    }, 250);

    const val = (document.getElementById(activeField)?.value || "").trim();

    if(val){
      const p = await geocode(val);
      if(p && pickMap){
        pickMap.setView([p.lat, p.lon], 17);
        await pickerOnMoveEnd();
        return;
      }
    }

    if(map && pickMap){
      const c = map.getCenter();
      pickMap.setView([c.lat, c.lng], Math.max(13, map.getZoom()));
      await pickerOnMoveEnd();
      return;
    }

    if(pickMap){
      pickMap.setView([52.3702, 4.8952], 14);
      await pickerOnMoveEnd();
    }
  }, 80);
}

function closePicker(){
  document.getElementById("pickModal").classList.remove("open");

  clearTimeout(reverseTimer);
  lastReverseKey = "";

  if(pickMap){
    pickMap.off();
    pickMap.remove();
    pickMap = null;
  }

  setTimeout(() => {
    const anyOpen = document.querySelector(".sheet.open");
    const favOpen = document.getElementById("favModal")?.style.display === "flex";
    const homeOpen = document.getElementById("homeSheet")?.getAttribute("aria-hidden") === "false";

    if(!anyOpen && !favOpen && !homeOpen){
      document.getElementById("overlay").classList.remove("show");
    }
  }, 30);
}

function getPinLatLng(){
  const mapEl = document.getElementById("pickMap");
  const pinEl = document.querySelector("#pickModal .pin");

  const mr = mapEl.getBoundingClientRect();
  const pr = pinEl.getBoundingClientRect();

  const x = (pr.left + pr.width / 2) - mr.left;
  const y = (pr.top + pr.height) - mr.top;

  return pickMap.containerPointToLatLng([x, y]);
}

async function pickerOnMoveEnd(){
  if(!pickMap) return;

  clearTimeout(reverseTimer);

  reverseTimer = setTimeout(async () => {
    if(!pickMap || pickerUpdating) return;

    pickerUpdating = true;

    const p = getPinLatLng();
    const key = `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;

    if(key === lastReverseKey){
      pickerUpdating = false;
      return;
    }

    lastReverseKey = key;

    const addr = await reverseFast(p.lat, p.lng);

    const picked = document.getElementById("picked");
    if(picked){
      picked.textContent =
        addr ||
        (
          getLang() === "ar"
            ? "حرّك الخريطة للحصول على عنوان دقيق."
            : (getLang() === "en"
              ? "Move map for an exact address."
              : "Verplaats de kaart voor een exact adres.")
        );
    }

    pickerUpdating = false;
  }, 450);
}

async function pickerSearch(){
  const q = (document.getElementById("pickSearch").value || "").trim();
  if(!q) return;

  const p = await geocode(q);

  if(!p){
    alert(
      getLang() === "ar"
        ? "لم يتم العثور على العنوان."
        : (getLang() === "en" ? "Address not found." : "Adres niet gevonden.")
    );
    return;
  }

  if(pickMap){
    pickMap.setView([p.lat, p.lon], 17);
    await pickerOnMoveEnd();
  }
}

async function pickerConfirm(){
  if(!pickMap) return;

  const p = getPinLatLng();
  const addr = await reverseFast(p.lat, p.lng);

  if(!addr){
    alert(
      getLang() === "ar"
        ? "العنوان غير واضح. حرّك الخريطة وحاول."
        : (getLang() === "en"
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