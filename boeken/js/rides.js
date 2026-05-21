/* =========================
   RIDES - SUPABASE
========================= */
let ridesTab = 'upcoming';
let lastSavedRideHash = null;
let cachedRides = [];

function setRidesTab(t){
  ridesTab = t;
  document.getElementById('segUpcoming').classList.toggle('active', t === 'upcoming');
  document.getElementById('segPast').classList.toggle('active', t === 'past');
  refreshRidesUI();
}

async function loadRidesFromBackend(){
  const { data:{ user } } = await db.auth.getUser();
  if(!user){ cachedRides = []; return []; }

  const { data, error } = await db
    .from("rides")
    .select("*")
    .eq("customer_id", user.id)
    .order("pickup_time", { ascending:true });

  if(error){ console.error(error); cachedRides = []; return []; }
  cachedRides = data || [];
  return cachedRides;
}

async function refreshRidesUI(){
  const lang = getLang();
  const T = i18n[lang] || i18n.nl;
  const rides = await loadRidesFromBackend();
  const now = Date.now();

  const filtered = rides
    .filter(r => {
      const ts = new Date(r.pickup_time).getTime();
      if(isNaN(ts)) return ridesTab === 'upcoming';
      return ridesTab === 'upcoming'
        ? ts >= now && r.status !== "completed" && r.status !== "cancelled"
        : ts < now || r.status === "completed" || r.status === "cancelled";
    })
    .sort((a,b) => new Date(a.pickup_time).getTime() - new Date(b.pickup_time).getTime());

  const empty = document.getElementById('ridesEmpty');
  const list = document.getElementById('ridesList');
  if(!empty || !list) return;

  if(!filtered.length){
    list.classList.add('hidden');
    empty.classList.remove('hidden');
    document.getElementById('ridesEmptyTitle').textContent = T.ridesEmptyTitle;
    document.getElementById('ridesEmptyText').textContent = T.ridesEmptyText;
    document.getElementById('ridesEmptyBtn').textContent = T.ridesEmptyBtn;
    return;
  }

  empty.classList.add('hidden');
  list.classList.remove('hidden');

  list.innerHTML = `
    <div class="list">
      ${filtered.map(r => {
        const statusColor = {
          pending: '#e67e22', accepted: '#2980b9', on_the_way: '#8e44ad',
          arrived: '#27ae60', completed: '#27ae60', cancelled: '#e74c3c',
          awaiting_payment: '#95a5a6'
        }[r.status] || '#95a5a6';

        const statusLabel = {
          pending: 'In behandeling', accepted: 'Geaccepteerd',
          on_the_way: 'Onderweg', arrived: 'Aangekomen',
          completed: 'Voltooid', cancelled: 'Geannuleerd',
          awaiting_payment: 'Betaling afwachten'
        }[r.status] || r.status;

        return `
        <div class="row" style="cursor:pointer" onclick="openRideDetail('${r.id}')">
          <div class="left" style="background:rgba(47,125,50,.10);border-color:rgba(47,125,50,.20)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2f7d32" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 4v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          <div class="mid">
            <div class="t">${escapeHtml(r.from_address || "-")} → ${escapeHtml(r.to_address || "-")}</div>
            <div class="d" style="display:flex;align-items:center;gap:6px;margin-top:3px">
              <span>${formatWhen(r.pickup_time, getLang())}</span>
              <span>•</span>
              <span>${escapeHtml(r.vehicle || "Standaard")}</span>
              <span>•</span>
              <span style="font-weight:900">${escapeHtml(r.price || "€0")}</span>
            </div>
            <div style="margin-top:4px">
              <span style="font-size:10px;font-weight:900;padding:2px 8px;border-radius:999px;background:${statusColor}20;color:${statusColor};border:1px solid ${statusColor}40">${statusLabel}</span>
            </div>
          </div>
          <div class="chev">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        </div>
      `}).join("")}
    </div>
  `;
}

/* =========================
   RIDE DETAIL
========================= */
function openRideDetail(rideId){
  const r = cachedRides.find(x => x.id === rideId);
  if(!r) return;

  const lang = getLang();

  const statusLabel = {
    pending: 'In behandeling', accepted: 'Geaccepteerd',
    on_the_way: 'Chauffeur is onderweg', arrived: 'Chauffeur is aangekomen',
    completed: 'Voltooid', cancelled: 'Geannuleerd',
    awaiting_payment: 'Betaling afwachten'
  }[r.status] || r.status;

  const statusColor = {
    pending: '#e67e22', accepted: '#2980b9', on_the_way: '#8e44ad',
    arrived: '#27ae60', completed: '#27ae60', cancelled: '#e74c3c',
    awaiting_payment: '#95a5a6'
  }[r.status] || '#95a5a6';

  const hasDriver = r.driver_name && (r.status === 'accepted' || r.status === 'on_the_way' || r.status === 'arrived');
  const ph = (r.driver_phone || "").replace(/\D/g,"");

  const driverCard = hasDriver ? `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:12px">
      <div style="padding:12px 14px;border-bottom:1px solid var(--border);background:rgba(47,125,50,.05)">
        <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:8px">Uw chauffeur</div>
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:52px;height:52px;border-radius:50%;background:rgba(47,125,50,.12);border:2px solid rgba(47,125,50,.25);display:grid;place-items:center;flex-shrink:0;overflow:hidden">
            ${r.driver_avatar_url
              ? `<img src="${escapeHtml(r.driver_avatar_url)}" style="width:100%;height:100%;object-fit:cover" alt="Chauffeur">`
              : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2f7d32" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="8" r="4"/></svg>`
            }
          </div>
          <div>
            <div style="font-weight:900;font-size:15px">${escapeHtml(r.driver_name || "")}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">${escapeHtml(r.vehicle || "Standaard")}</div>
          </div>
          <div style="margin-left:auto">
            <span style="font-size:10px;font-weight:900;padding:3px 9px;border-radius:999px;background:${statusColor}18;color:${statusColor};border:1px solid ${statusColor}35">${statusLabel}</span>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:8px;padding:10px 14px">
        ${ph ? `
          <a href="tel:${escapeHtml(r.driver_phone || "")}" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border-radius:10px;border:1px solid var(--border);background:var(--card);color:var(--text);text-decoration:none;font-weight:900;font-size:13px">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.83a16 16 0 0 0 6 6l.83-1.83a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            Bellen
          </a>
          <a href="https://wa.me/${ph}" target="_blank" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border-radius:10px;border:1px solid rgba(37,211,102,.3);background:rgba(37,211,102,.08);color:#128c7e;text-decoration:none;font-weight:900;font-size:13px">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            WhatsApp
          </a>
        ` : ''}
      </div>
    </div>
  ` : `
    <div style="background:rgba(47,125,50,.06);border:1px solid rgba(47,125,50,.15);border-radius:var(--radius);padding:14px;margin-bottom:12px;text-align:center">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2f7d32" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:6px;opacity:.6"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
      <div style="font-size:12px;font-weight:900;color:#2f7d32;margin-bottom:3px">Chauffeur wordt toegewezen</div>
      <div style="font-size:11px;color:var(--muted);line-height:1.5">Uw rit is bevestigd bij ymaanyGO. De gegevens van de chauffeur verschijnen hier zodra deze definitief is toegewezen.</div>
    </div>
  `;

  const stopsHtml = (r.stops && r.stops.length) ? r.stops.map((s,i) => `
    <div style="display:flex;align-items:flex-start;gap:9px;margin-top:2px">
      <div style="display:flex;flex-direction:column;align-items:center;width:14px;flex-shrink:0;padding-top:3px">
        <div style="width:8px;height:8px;border-radius:2px;background:#ffb020;flex-shrink:0"></div>
        <div style="width:2px;flex:1;min-height:18px;background:repeating-linear-gradient(to bottom,rgba(0,0,0,.2) 0,rgba(0,0,0,.2) 4px,transparent 4px,transparent 8px);margin:3px 0"></div>
      </div>
      <div style="flex:1;padding-bottom:7px">
        <div style="font-size:10px;font-weight:900;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">Stop ${i+1}</div>
        <div style="font-size:13px;font-weight:700">${escapeHtml(s)}</div>
      </div>
    </div>
  `).join('') : '';

  const detailBody = `
    <div style="padding:14px 14px 80px">

      <!-- KAART -->
      <div id="customerMap" style="width:100%;height:190px;border-radius:14px;overflow:hidden;margin-bottom:12px;background:rgba(47,125,50,.06);position:relative">
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:12px">Route laden…</div>
      </div>

      <!-- ROUTE TEKST -->
      <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:12px">
        <div style="height:4px;background:linear-gradient(90deg,#2f7d32,#3bbf6b)"></div>
        <div style="padding:12px">
          <div style="display:flex;align-items:flex-start;gap:9px">
            <div style="display:flex;flex-direction:column;align-items:center;width:14px;flex-shrink:0;padding-top:3px">
              <div style="width:10px;height:10px;border-radius:50%;background:#2f7d32;flex-shrink:0"></div>
              <div style="width:2px;flex:1;min-height:22px;background:repeating-linear-gradient(to bottom,#3bbf6b 0,#3bbf6b 4px,transparent 4px,transparent 8px);opacity:.5;margin:3px 0"></div>
            </div>
            <div style="flex:1;padding-bottom:8px">
              <div style="font-size:10px;font-weight:900;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">Ophaallocatie</div>
              <div style="font-size:13px;font-weight:700;line-height:1.3">${escapeHtml(r.from_address || "-")}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:1px">${formatWhen(r.pickup_time, lang)}</div>
            </div>
          </div>
          ${stopsHtml}
          <div style="display:flex;align-items:flex-start;gap:9px">
            <div style="display:flex;flex-direction:column;align-items:center;width:14px;flex-shrink:0;padding-top:3px">
              <div style="width:10px;height:10px;border-radius:3px;border:2.5px solid #1565c0;background:var(--card);flex-shrink:0"></div>
            </div>
            <div style="flex:1">
              <div style="font-size:10px;font-weight:900;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">Bestemming</div>
              <div style="font-size:13px;font-weight:700;line-height:1.3">${escapeHtml(r.to_address || "-")}</div>
            </div>
          </div>
        </div>
      </div>

      ${driverCard}

      <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:10px;padding:11px 12px;border-bottom:1px solid var(--border)">
          <div style="width:32px;height:32px;border-radius:9px;background:rgba(47,125,50,.10);display:grid;place-items:center;flex-shrink:0">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2f7d32" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
          </div>
          <div>
            <div style="font-size:11px;color:var(--muted);font-weight:600">Voertuig · Passagiers</div>
            <div style="font-size:13px;font-weight:700">${escapeHtml(r.vehicle || "Standaard")} · ${r.passengers || 1} pax</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;padding:11px 12px">
          <div style="width:32px;height:32px;border-radius:9px;background:rgba(47,125,50,.10);display:grid;place-items:center;flex-shrink:0">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2f7d32" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div>
            <div style="font-size:11px;color:var(--muted);font-weight:600">Betaling</div>
            <div style="font-size:13px;font-weight:700">${escapeHtml(r.price || "€0")} · ${r.payment_status === 'paid' ? 'Betaald' : 'Niet betaald'}</div>
          </div>
        </div>
      </div>

    </div>
  `;

  const sp = document.getElementById('spRideDetail');
  if(!sp){ createRideDetailSubpage(); }

  document.getElementById('spRideDetailBody').innerHTML = detailBody;
  document.getElementById('spRideDetail').classList.add('open');

  // Laad kaart na animatie
  setTimeout(() => loadCustomerMap(r.from_address, r.to_address), 350);
}

/* =========================
   KAART ZIJDE KLANT
========================= */
let customerMapObj = null;

async function loadCustomerMap(fromAddr, toAddr){
  const mapEl = document.getElementById('customerMap');
  if(!mapEl) return;

  if(!window.L){
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    await new Promise((res,rej)=>{
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  if(customerMapObj){ customerMapObj.remove(); customerMapObj = null; }

  async function geocode(addr){
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&countrycodes=nl,be,de&limit=1`;
    const res = await fetch(url, {headers:{'Accept-Language':'nl'}});
    const data = await res.json();
    if(!data.length) return null;
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  }

  const [fromCoord, toCoord] = await Promise.all([geocode(fromAddr), geocode(toAddr)]);

  if(!fromCoord || !toCoord){
    mapEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted);font-size:12px">Route niet beschikbaar</div>`;
    return;
  }

  mapEl.innerHTML = '';
  const map = L.map(mapEl, {
    zoomControl:false, attributionControl:false,
    dragging:false, scrollWheelZoom:false,
    doubleClickZoom:false, touchZoom:false
  });
  customerMapObj = map;

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{maxZoom:19}).addTo(map);

  const dotSize = 14, labelH = 26, gap = 4;

  const iconFrom = L.divIcon({
    html:`<div style="display:flex;flex-direction:column;align-items:center;gap:${gap}px">
      <div style="background:#1b5e20;color:#fff;font-size:10px;font-weight:800;padding:4px 10px;border-radius:50px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.35);font-family:sans-serif;line-height:1">Vertrek</div>
      <div style="width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:#1b5e20;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>
    </div>`,
    className:'', iconAnchor:[dotSize/2 + 10, labelH + gap + dotSize]
  });

  const iconTo = L.divIcon({
    html:`<div style="display:flex;flex-direction:column;align-items:center;gap:${gap}px">
      <div style="background:#1565c0;color:#fff;font-size:10px;font-weight:800;padding:4px 10px;border-radius:50px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.35);font-family:sans-serif;line-height:1">Aankomst</div>
      <div style="width:${dotSize}px;height:${dotSize}px;border-radius:3px;background:#fff;border:3px solid #1565c0;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>
    </div>`,
    className:'', iconAnchor:[dotSize/2 + 14, labelH + gap + dotSize]
  });

  L.marker(fromCoord, {icon:iconFrom}).addTo(map);
  L.marker(toCoord, {icon:iconTo}).addTo(map);

  try{
    const osrm = `https://router.project-osrm.org/route/v1/driving/${fromCoord[1]},${fromCoord[0]};${toCoord[1]},${toCoord[0]}?overview=full&geometries=geojson`;
    const rr = await fetch(osrm);
    const rd = await rr.json();
    if(rd.routes && rd.routes[0]){
      const coords = rd.routes[0].geometry.coordinates.map(c=>[c[1],c[0]]);
      L.polyline(coords,{color:'#2e7d32',weight:4,opacity:.9}).addTo(map);
      map.fitBounds(L.latLngBounds([fromCoord, toCoord, ...coords.filter((_,i)=>i%10===0)]),{padding:[44,44]});
    } else throw new Error();
  }catch{
    L.polyline([fromCoord, toCoord],{color:'#2e7d32',weight:3,dashArray:'8,6',opacity:.7}).addTo(map);
    map.fitBounds(L.latLngBounds([fromCoord, toCoord]),{padding:[50,50]});
  }
}

function createRideDetailSubpage(){
  const sp = document.createElement('div');
  sp.id = 'spRideDetail';
  sp.style.cssText = `
    position:fixed;inset:0;background:var(--bg);z-index:300;
    overflow-y:auto;transform:translateX(100%);
    transition:transform .3s cubic-bezier(.32,.72,0,1);
    -webkit-overflow-scrolling:touch;
  `;
  sp.innerHTML = `
    <div style="position:sticky;top:0;z-index:5;background:var(--card);border-bottom:1px solid var(--border);padding:calc(env(safe-area-inset-top) + 10px) 14px 10px;display:flex;align-items:center;gap:11px">
      <button onclick="closeRideDetail()" style="width:34px;height:34px;border-radius:50%;border:1px solid var(--border);background:var(--card);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div style="font-size:16px;font-weight:900">Ritdetails</div>
    </div>
    <div id="spRideDetailBody"></div>
  `;
  document.body.appendChild(sp);

  let sx = 0;
  sp.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, {passive:true});
  sp.addEventListener('touchend', e => {
    if(e.changedTouches[0].clientX - sx > 55) closeRideDetail();
  }, {passive:true});

  requestAnimationFrame(() => requestAnimationFrame(() => {
    sp.style.transform = 'translateX(0)';
  }));
}

function closeRideDetail(){
  const sp = document.getElementById('spRideDetail');
  if(!sp) return;
  sp.style.transform = 'translateX(100%)';
  setTimeout(() => sp.remove(), 320);
}

window.openRideDetail = openRideDetail;
window.closeRideDetail = closeRideDetail;

/* =========================
   COMPUTE HASH + SAVE
========================= */
function computeRideHash(ride){
  return JSON.stringify({
    from:ride.from, to:ride.to, stops:ride.stops,
    when:ride.when, vehicle:ride.vehicle,
    passengers:ride.passengers, price:ride.price
  });
}

function saveRideToHistory(){
  const from = (document.getElementById('from').value || "").trim();
  const to = (document.getElementById('to').value || "").trim();
  const stopVals = stops.ids.map(id => (document.getElementById(id)?.value || "").trim()).filter(Boolean);
  const when = document.getElementById('when').value;
  const pax = document.getElementById('pax').value;
  const car = document.getElementById('car').value;
  const price = document.getElementById('price').textContent || "—";

  if(!from || !to || !when) return false;

  const ride = { id:cryptoId(), from, to, stops:stopVals, when, vehicle:car, passengers:pax, price, createdAt:new Date().toISOString() };
  const currentHash = computeRideHash(ride);
  if(lastSavedRideHash === currentHash) return false;

  const rides = getRides();
  rides.push(ride);
  localStorage.setItem(LS.rides, JSON.stringify(rides));
  lastSavedRideHash = currentHash;
  return true;
}
