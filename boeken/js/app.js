/* =========================
   APP STATE
   ========================= */
const sheetState = {
  el: null,
  startY: 0,
  startT: 0,
  curT: 0,
  dragging: false,
  pointerId: null,
  snap: 'mid'
};

/* =========================
   PROFILE - SUPABASE
   ========================= */
async function refreshProfileUI(){
  const localProfile = getProfile();

  try{
    const { data:{ user } } = await db.auth.getUser();

    if(user){
      const { data: profile, error } = await db
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if(!error && profile){
        const p = {
          name: profile.name || "ymaanyGO klant",
          phone: profile.phone || "",
          email: profile.email || user.email || ""
        };

        saveProfileToLS(p);

        document.getElementById('accName').textContent = p.name;
        document.getElementById('accEmail').textContent = p.email;
        document.getElementById('pName').value = p.name;
        document.getElementById('pPhone').value = p.phone;
        document.getElementById('pEmail').value = p.email;

        return;
      }
    }
  }catch(e){
    console.warn("Profile load error:", e);
  }

  document.getElementById('accName').textContent = localProfile.name || "—";
  document.getElementById('accEmail').textContent = localProfile.email || "—";
  document.getElementById('pName').value = localProfile.name || "";
  document.getElementById('pPhone').value = localProfile.phone || "";
  document.getElementById('pEmail').value = localProfile.email || "";
}

async function saveProfile(){
  try{
    const { data:{ user } } = await db.auth.getUser();

    if(!user){
      alert("Niet ingelogd.");
      window.location.href = "/klant-login.html";
      return;
    }

    const p = {
      name: (document.getElementById('pName').value || "").trim(),
      phone: (document.getElementById('pPhone').value || "").trim(),
      email: (document.getElementById('pEmail').value || "").trim()
    };

    if(!p.name){
      alert("Vul uw naam in.");
      return;
    }

    if(!p.email){
      p.email = user.email || "";
    }

    const { error } = await db
      .from("profiles")
      .upsert({
        id: user.id,
        email: p.email,
        name: p.name,
        phone: p.phone,
        role: "klant"
      }, { onConflict: "id" });

    if(error){
      console.error(error);
      alert(error.message);
      return;
    }

    saveProfileToLS(p);
    await refreshProfileUI();
    closeSheet('profileSheet');

    alert("Profiel opgeslagen.");
  }catch(e){
    console.error(e);
    alert("Profiel kon niet worden opgeslagen.");
  }
}

/* =========================
   CHANGE PASSWORD - SUPABASE
   ========================= */
async function changePassword(){
  const lang = getLang();
  const T = i18n[lang] || i18n.nl;
  const a = (document.getElementById('newPw').value || "").trim();
  const b = (document.getElementById('newPw2').value || "").trim();

  if(!isStrongPw(a)){
    alert(T.pwNote);
    return;
  }

  if(a !== b){
    alert(
      lang === 'ar'
        ? "كلمتا المرور غير متطابقتين."
        : (lang === 'en' ? "Passwords do not match." : "Wachtwoorden komen niet overeen.")
    );
    return;
  }

  try{
    const { error } = await db.auth.updateUser({ password: a });

    if(error){
      alert(error.message);
      return;
    }

    document.getElementById('newPw').value = "";
    document.getElementById('newPw2').value = "";
    closeSheet('securitySheet');

    alert(
      lang === 'ar'
        ? "تم تغيير كلمة المرور."
        : (lang === 'en' ? "Password updated." : "Wachtwoord gewijzigd.")
    );

  }catch(e){
    console.error(e);
    alert("Er is een fout opgetreden.");
  }
}

/* =========================
   PAYMENT
   ========================= */
function setPayment(v){
  localStorage.setItem(LS.payment, v);
  refreshPaymentUI();
}

function refreshPaymentUI(){
  const v = getPayment();
  setActiveRadio('payCash', v === 'cash');
  setActiveRadio('payCard', v === 'card');
}

function openWhatsAppSupport(){
  const whatsappNummer = "31633337184";
  const lang = getLang();
  const msg = (
    lang === 'ar'
      ? "مرحبا، أحتاج مساعدة في ymaanyGO."
      : (lang === 'en'
        ? "Hi, I need help with ymaanyGO."
        : "Hallo, ik heb hulp nodig met ymaanyGO.")
  );

  window.open(
    "https://wa.me/" + whatsappNummer + "?text=" + encodeURIComponent(msg),
    "_blank"
  );
}

async function logout(){
  try{
    await db.auth.signOut();
  }catch(e){
    console.warn("Logout error:", e);
  }

  localStorage.removeItem(LS.profile);
  localStorage.removeItem(LS.pw);

  window.location.href = "/klant-login.html";
}

/* =========================
   PAGES
   ========================= */
function showPage(which){
  document.getElementById('pageHome').classList.toggle('hidden', which !== 'home');
  document.getElementById('pageRides').classList.toggle('hidden', which !== 'rides');
  document.getElementById('pageAccount').classList.toggle('hidden', which !== 'account');

  document.getElementById('tabHome').classList.toggle('active', which === 'home');
  document.getElementById('tabRides').classList.toggle('active', which === 'rides');
  document.getElementById('tabAccount').classList.toggle('active', which === 'account');

  if(which === 'home'){
    document.body.classList.add('home-visible');
    openHomeSheet();
  }else{
    document.body.classList.remove('home-visible');
    closeHomeSheet();
  }

  if(which === 'rides') refreshRidesUI().catch(console.error);
  if(which === 'account') refreshProfileUI();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* =========================
   SHEETS
   ========================= */
function openSheet(id){
  document.getElementById('overlay').classList.add('show');
  const s = document.getElementById(id);
  if(!s) return;
  s.classList.add('open');
  s.setAttribute('aria-hidden', 'false');
}

function closeSheet(id){
  const s = document.getElementById(id);
  if(!s) return;

  s.classList.remove('open');
  s.setAttribute('aria-hidden', 'true');

  setTimeout(() => {
    const anyOpen = document.querySelector('.sheet.open');
    if(!anyOpen) document.getElementById('overlay').classList.remove('show');
  }, 30);
}

function closeAllSheets(){
  document.querySelectorAll('.sheet.open').forEach(s => s.classList.remove('open'));
  document.querySelectorAll('.sheet').forEach(s => s.setAttribute('aria-hidden', 'true'));
  closeFavManager();
  closePicker();
  document.getElementById('overlay').classList.remove('show');
}

/* =========================
   HOME SHEET DRAG
   ========================= */
function getTranslateY(el){
  const tr = getComputedStyle(el).transform;
  if(!tr || tr === 'none') return 0;
  const m = new DOMMatrixReadOnly(tr);
  return m.m42;
}

function setTranslateY(el, px){
  el.style.transform = `translateY(${px}px)`;
}

function snapPositions(){
  const h = window.innerHeight;
  return {
    expanded: Math.round(h * 0.05),
    mid: Math.round(h * 0.07),
    collapsed: Math.round(h * 0.55),
    close: Math.round(h * 1.05)
  };
}

function sheetPointerDown(e){
  const sheet = document.getElementById('homeSheet');
  sheetState.el = sheet;
  sheetState.dragging = true;
  sheetState.pointerId = e.pointerId;
  sheet.classList.add('dragging');
  sheetState.startY = e.clientY;
  sheetState.startT = getTranslateY(sheet);
  sheetState.curT = sheetState.startT;
  sheet.setPointerCapture(e.pointerId);
  e.preventDefault();
}

function sheetPointerMove(e){
  if(!sheetState.dragging || !sheetState.el) return;
  if(e.pointerId !== sheetState.pointerId) return;

  const dy = e.clientY - sheetState.startY;
  let next = sheetState.startT + dy;
  const sp = snapPositions();

  next = Math.max(-30, Math.min(sp.close, next));
  sheetState.curT = next;
  setTranslateY(sheetState.el, next);
  e.preventDefault();
}

function sheetPointerUp(e){
  if(!sheetState.dragging || !sheetState.el) return;
  if(e.pointerId !== sheetState.pointerId) return;

  const sheet = sheetState.el;
  sheet.classList.remove('dragging');

  const sp = snapPositions();
  const closeThreshold = sp.collapsed + Math.round(window.innerHeight * 0.03);

  if(sheetState.curT >= closeThreshold){
    closeHomeSheet();
  }else{
    const candidates = [
      { k:'expanded', v:sp.expanded },
      { k:'mid', v:sp.mid },
      { k:'collapsed', v:sp.collapsed }
    ];

    candidates.sort((a, b) => Math.abs(a.v - sheetState.curT) - Math.abs(b.v - sheetState.curT));
    const best = candidates[0];
    sheetState.snap = best.k;
    requestAnimationFrame(() => setTranslateY(sheet, best.v));
  }

  sheetState.dragging = false;
  sheetState.el = null;
  sheetState.pointerId = null;
}

function openHomeSheet(){
  const sheet = document.getElementById('homeSheet');
  const sp = snapPositions();

  document.getElementById('overlay').classList.add('show');

  sheet.style.display = 'block';
  sheet.style.pointerEvents = 'auto';
  sheet.setAttribute('aria-hidden', 'false');

  setTranslateY(sheet, sp.mid);
}

function closeHomeSheet(forceNoAnim){
  const sheet = document.getElementById('homeSheet');
  const sp = snapPositions();

  if(forceNoAnim){
    sheet.style.transition = 'none';
    setTranslateY(sheet, sp.close);
  }else{
    sheet.style.transition = '';
    setTranslateY(sheet, sp.close);
  }

  sheet.setAttribute('aria-hidden', 'true');

  setTimeout(() => {
    sheet.style.display = 'none';
    sheet.style.pointerEvents = 'none';

    const anyOpen = document.querySelector('.sheet.open');
    const favOpen = (document.getElementById('favModal')?.style.display === 'flex');
    const pickerOpen = document.getElementById('pickModal')?.classList.contains('open');

    if(!anyOpen && !favOpen && !pickerOpen){
      document.getElementById('overlay').classList.remove('show');
    }
  }, forceNoAnim ? 0 : 240);
}

/* =========================
   BINDINGS
   ========================= */
function bindSheetDrag(){
  const sheet = document.getElementById('homeSheet');
  const grip = sheet.querySelector('.sheet-grip');
  const head = sheet.querySelector('.sheet-head');

  [grip, head].forEach(h => {
    h.addEventListener('pointerdown', sheetPointerDown, { passive:false });
  });

  window.addEventListener('pointermove', sheetPointerMove, { passive:false });
  window.addEventListener('pointerup', sheetPointerUp, { passive:true });
  window.addEventListener('pointercancel', sheetPointerUp, { passive:true });
}

function bindInputs(){
  ['from', 'to'].forEach(bindSuggestInput);

  document.getElementById('from').addEventListener('input', updateFooterButtons);
  document.getElementById('to').addEventListener('input', updateFooterButtons);

  document.getElementById('when').addEventListener('change', () => {
    autoCalc(true);
    updateFooterButtons();
  });

  document.getElementById('car').addEventListener('change', () => {
    autoCalc(true);
    updateFooterButtons();
  });

  document.getElementById('pax').addEventListener('change', () => {
    autoCalc(true);
    updateFooterButtons();
  });
}

/* =========================
   STARTUP
   ========================= */
document.getElementById('overlay').addEventListener('click', closeAllSheets);

document.addEventListener('keydown', (e) => {
  if(e.key === 'Enter' && document.getElementById('pickModal').classList.contains('open')){
    e.preventDefault();
    pickerSearch();
  }
});

ensureDefaults();
initMap();
bindSheetDrag();
bindInputs();
bindPaxRule();
applyTheme();
applyLang();

setRideFor('me');
setStep(1);
showPage('home');

/* =========================
   GLOBAL EXPORTS
   ========================= */
window.showPage = showPage;
window.openSheet = openSheet;
window.closeSheet = closeSheet;
window.closeAllSheets = closeAllSheets;
window.setLang = setLang;
window.cycleLang = cycleLang;
window.setTheme = setTheme;
window.saveProfile = saveProfile;
window.changePassword = changePassword;
window.setPayment = setPayment;
window.openFavManager = openFavManager;
window.closeFavManager = closeFavManager;
window.addFav = addFav;
window.removeFav = removeFav;
window.openWhatsAppSupport = openWhatsAppSupport;
window.logout = logout;
window.setRidesTab = setRidesTab;
window.goTaxi = () => { showPage('home'); };

window.openPicker = openPicker;
window.closePicker = closePicker;
window.pickerSearch = pickerSearch;
window.pickerConfirm = pickerConfirm;
window.swapFT = swapFT;
window.useMyLocationAsFrom = useMyLocationAsFrom;
window.addStop = addStop;
window.removeStop = removeStop;
window.setRideFor = setRideFor;
window.quickFavTo = quickFavTo;
window.submitBooking = submitBooking;
window.closeHomeSheet = closeHomeSheet;
window.openHomeSheet = openHomeSheet;
window.goBack = goBack;
window.handleMainAction = handleMainAction;
window.setStep = setStep;
/* ══ Time & Pax Modals ══ */
function tpNow(plusMin) {
  const d = new Date();
  d.setMinutes(d.getMinutes() + plusMin);
  d.setSeconds(0,0); return d;
}
function tpToVal(d) {
  const p = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function tpFormat(d) {
  return d.toLocaleString('nl-NL', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
}
function tpBgClose(e, id, fn) {
  if(e.target === document.getElementById(id)) fn();
}

/* TIME */
function openTimeModal() {
  document.getElementById('tpDtInput').value = tpToVal(tpNow(15));
  document.getElementById('timeOverlay').classList.add('open');
}
function closeTimeModal() {
  document.getElementById('timeOverlay').classList.remove('open');
}
function tpClearChips() {
  document.querySelectorAll('.tp-chip:not([id^="pc_"]):not([id^="fx_"])').forEach(c => c.classList.remove('selected'));
}
function tpQuickPick(min, el) {
  tpClearChips(); el.classList.add('selected');
  document.getElementById('tpDtInput').value = tpToVal(tpNow(min));
}
function tpFocusCustom() {
  tpClearChips();
  document.getElementById('chip_custom').classList.add('selected');
  document.getElementById('tpDtInput').focus();
}
function tpOnCustom() {
  tpClearChips();
  document.getElementById('chip_custom').classList.add('selected');
}
let tpFlexMin = 0;
function tpToggleFlex(on) {
  document.getElementById('tpFlexRow').classList.toggle('active', on);
  document.getElementById('tpFlexChips').classList.toggle('show', on);
  if(!on) {
    tpFlexMin = 0;
    document.querySelectorAll('[id^="fx_"]').forEach(c => c.classList.remove('selected'));
    document.getElementById('tpFlexSub').textContent = 'Ik mag later opgehaald worden';
  }
}
function tpPickFlex(min, el) {
  document.querySelectorAll('[id^="fx_"]').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  tpFlexMin = min;
  document.getElementById('tpFlexSub').textContent = `Tot ${min} min later`;
}
function confirmTimeModal() {
  const val = document.getElementById('tpDtInput').value;
  if(!val) return;
  const d = new Date(val);
  document.getElementById('timeCardVal').textContent = tpFormat(d);
  document.getElementById('when').value = val;
  document.getElementById('timeCard').classList.add('active-card');
  closeTimeModal();
}

/* PAX */
let tpSelectedPax = 1;
function openPaxModal() {
  document.getElementById('paxOverlay').classList.add('open');
}
function closePaxModal() {
  document.getElementById('paxOverlay').classList.remove('open');
}
function tpQuickPax(n, el) {
  document.querySelectorAll('[id^="pc_"]').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  tpSelectedPax = n;
}
function confirmPaxModal() {
  document.getElementById('paxCardVal').textContent = tpSelectedPax;
  document.getElementById('pax').value = tpSelectedPax;
  document.getElementById('paxCard').classList.add('active-card');
  closePaxModal();
}

window.openTimeModal  = openTimeModal;
window.closeTimeModal = closeTimeModal;
window.openPaxModal   = openPaxModal;
window.closePaxModal  = closePaxModal;
window.tpBgClose      = tpBgClose;
window.tpQuickPick    = tpQuickPick;
window.tpFocusCustom  = tpFocusCustom;
window.tpOnCustom     = tpOnCustom;
window.tpToggleFlex   = tpToggleFlex;
window.tpPickFlex     = tpPickFlex;
window.confirmTimeModal = confirmTimeModal;
window.tpQuickPax     = tpQuickPax;
window.confirmPaxModal  = confirmPaxModal;

// init
document.addEventListener('DOMContentLoaded', () => {
  const inp = document.getElementById('tpDtInput');
  if(inp) inp.value = tpToVal(tpNow(15));
});

