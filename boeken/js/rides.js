/* =========================
   RIDES - SUPABASE
========================= */
let ridesTab = 'upcoming';
let lastSavedRideHash = null;
let cachedBookings = [];

function setRidesTab(t){
  ridesTab = t;

  document.getElementById('segUpcoming').classList.toggle('active', t === 'upcoming');
  document.getElementById('segPast').classList.toggle('active', t === 'past');

  refreshRidesUI();
}

async function loadBookingsFromBackend(){
  const profile = getProfile();

  let query = db
    .from("bookings")
    .select("*")
    .order("created_at", { ascending:false });

  if(profile.email){
    query = query.eq("customer_email", profile.email);
  }else if(profile.phone){
    query = query.eq("customer_phone", profile.phone);
  }

  const { data, error } = await query;

  if(error){
    console.error(error);
    cachedBookings = [];
    return [];
  }

  cachedBookings = data || [];
  return cachedBookings;
}

async function refreshRidesUI(){
  const lang = getLang();
  const T = i18n[lang] || i18n.nl;

  const bookings = await loadBookingsFromBackend();
  const now = Date.now();

  const filtered = bookings
    .filter(r => {
      const when = `${r.ride_date || ""}T${r.ride_time || "00:00"}`;
      const ts = new Date(when).getTime();

      if(isNaN(ts)) return ridesTab === 'upcoming';

      return ridesTab === 'upcoming'
        ? ts >= now && r.status !== "completed" && r.status !== "cancelled"
        : ts < now || r.status === "completed" || r.status === "cancelled";
    })
    .sort((a,b)=>{
      const aTime = new Date(`${a.ride_date || ""}T${a.ride_time || "00:00"}`).getTime();
      const bTime = new Date(`${b.ride_date || ""}T${b.ride_time || "00:00"}`).getTime();
      return aTime - bTime;
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
      ${filtered.map(r => {
        const when = `${r.ride_date || ""}T${r.ride_time || "00:00"}`;

        return `
          <div class="row" style="cursor:default">
            <div class="left">
              🚕
            </div>

            <div class="mid">
              <div class="t">
                ${escapeHtml(r.pickup_address || "-")} → ${escapeHtml(r.destination_address || "-")}
              </div>

              <div class="d">
                ${formatWhen(when, lang)}
                • ${escapeHtml(r.vehicle_type || "")}
                • €${Number(r.price || 0).toFixed(2)}
                • ${escapeHtml(r.status || "pending")}
              </div>
            </div>
          </div>
        `;
      }).join("")}
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

/* blijft lokaal backup, maar echte rit staat nu in Supabase */
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