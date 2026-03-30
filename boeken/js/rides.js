/* =========================
   RIDES
   ========================= */
let ridesTab = 'upcoming';
let lastSavedRideHash = null;

function setRidesTab(t){
  ridesTab = t;

  document.getElementById('segUpcoming').classList.toggle('active', t === 'upcoming');
  document.getElementById('segPast').classList.toggle('active', t === 'past');

  refreshRidesUI();
}

function refreshRidesUI(){
  const lang = getLang();
  const T = i18n[lang] || i18n.nl;
  const rides = getRides();
  const now = Date.now();

  const filtered = rides
    .filter(r => {
      const ts = new Date(r.when).getTime();
      return ridesTab === 'upcoming' ? (ts >= now) : (ts < now);
    })
    .sort((a, b) => new Date(a.when) - new Date(b.when));

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
          <div class="left">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 9a2 2 0 0 1 2-2h14v4a2 2 0 0 0 0 4v4H6a2 2 0 0 1-2-2V9Z"></path>
              <path d="M13 7v10"></path>
            </svg>
          </div>
          <div class="mid">
            <div class="t">${escapeHtml(r.from)} → ${escapeHtml(r.to)}</div>
            <div class="d">${formatWhen(r.when, lang)} • ${escapeHtml(r.vehicle || "")}</div>
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
    console.log("Duplicate ride not saved.");
    return false;
  }

  const rides = getRides();
  rides.push(ride);
  localStorage.setItem(LS.rides, JSON.stringify(rides));

  refreshRidesUI();

  lastSavedRideHash = currentHash;
  return true;
}
