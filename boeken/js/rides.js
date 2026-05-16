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

  if(!user){
    cachedRides = [];
    return [];
  }

  const { data, error } = await db
    .from("rides")
    .select("*")
    .eq("customer_id", user.id)
    .order("pickup_time", { ascending:true });

  if(error){
    console.error(error);
    cachedRides = [];
    return [];
  }

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
    .sort((a,b)=>{
      return new Date(a.pickup_time).getTime() - new Date(b.pickup_time).getTime();
    });

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
      ${filtered.map(r => `
        <div class="row" style="cursor:default">
          <div class="left">🚕</div>

          <div class="mid">
            <div class="t">
              ${escapeHtml(r.from_address || "-")} → ${escapeHtml(r.to_address || "-")}
            </div>

            <div class="d">
              ${formatWhen(r.pickup_time, lang)}
              • ${escapeHtml(r.vehicle || "")}
              • ${escapeHtml(r.price || "€0")}
              • ${escapeHtml(r.status || "pending")}
            </div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function computeRideHash(ride){
  const relevant = {
    from: ride.from,
    to: ride.to,
    stops: ride.stops,
    when: ride.when,
    vehicle: ride.vehicle,
    passengers: ride.passengers,
    price: ride.price
  };

  return JSON.stringify(relevant);
}

/* lokale backup فقط */
function saveRideToHistory(){
  const from = (document.getElementById('from').value || "").trim();
  const to = (document.getElementById('to').value || "").trim();

  const stopVals = stops.ids
    .map(id => (document.getElementById(id)?.value || "").trim())
    .filter(Boolean);

  const when = document.getElementById('when').value;
  const pax = document.getElementById('pax').value;
  const car = document.getElementById('car').value;
  const price = document.getElementById('price').textContent || "—";

  if(!from || !to || !when) return false;

  const ride = {
    id: cryptoId(),
    from,
    to,
    stops: stopVals,
    when,
    vehicle: car,
    passengers: pax,
    price,
    createdAt: new Date().toISOString()
  };

  const currentHash = computeRideHash(ride);

  if(lastSavedRideHash === currentHash){
    return false;
  }

  const rides = getRides();
  rides.push(ride);

  localStorage.setItem(LS.rides, JSON.stringify(rides));

  lastSavedRideHash = currentHash;
  return true;
}