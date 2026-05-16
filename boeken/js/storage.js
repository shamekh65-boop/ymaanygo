/* =========================
   SUPABASE
   ========================= */
const SUPABASE_URL = "https://lxbfobdczjgqnotwsnki.supabase.co";

const SUPABASE_ANON_KEY = "sb_publishable_H5HKGlHBe9z3ejn0B-NKsw_9Mo-MIhp";

const db = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

/* =========================
   STORAGE KEYS
   ========================= */
const LS = {
  profile: 'ymaanygo_profile_v1',
  lang: 'ymaanygo_lang_v1',
  theme: 'ymaanygo_theme_v1',
  payment: 'ymaanygo_payment_v1',
  favs: 'ymaanygo_favs_v2',
  rides: 'ymaanygo_rides_v1',
  pw: 'ymaanygo_pw_v1'
};

/* =========================
   HELPERS
   ========================= */
function cryptoId(){
  return 'id_' + Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function escapeHtml(s){
  return String(s || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function escapeHtmlAttr(s){
  return escapeHtml(s).replaceAll("\n"," ").replaceAll("\r"," ");
}

function parseLocal(v){
  if(!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function isPastPickup(v, buffer = 15){
  const d = parseLocal(v);
  if(!d) return true;

  const now = new Date();
  now.setMinutes(now.getMinutes() + buffer);

  return d.getTime() < now.getTime();
}

function formatWhen(iso, lang){
  const d = new Date(iso);

  if(isNaN(d.getTime())) return iso;

  const opts = {
    weekday:'short',
    year:'numeric',
    month:'short',
    day:'2-digit',
    hour:'2-digit',
    minute:'2-digit'
  };

  try{
    return d.toLocaleString(
      lang === 'ar' ? 'ar' : (lang === 'en' ? 'en-US' : 'nl-NL'),
      opts
    );
  }catch(e){
    return d.toLocaleString();
  }
}

function debounce(fn, ms){
  let t;

  return (...args)=>{
    clearTimeout(t);
    t = setTimeout(()=>fn(...args), ms);
  };
}

/* =========================
   PROFILE
   ========================= */
function getProfile(){
  const fallback = {
    name: "ymaanyGO klant",
    phone: "",
    email: ""
  };

  try{
    return Object.assign(
      fallback,
      JSON.parse(localStorage.getItem(LS.profile) || "{}")
    );
  }catch(e){
    return fallback;
  }
}

function saveProfileToLS(p){
  localStorage.setItem(
    LS.profile,
    JSON.stringify(p)
  );
}

/* =========================
   SETTINGS
   ========================= */
function getLang(){
  return localStorage.getItem(LS.lang) || 'nl';
}

function getTheme(){
  return localStorage.getItem(LS.theme) || 'auto';
}

function getPayment(){
  return localStorage.getItem(LS.payment) || 'card';
}

/* =========================
   FAVORITES
   ========================= */
function getFavs(){
  try{
    const arr = JSON.parse(
      localStorage.getItem(LS.favs) || "[]"
    );

    return Array.isArray(arr) ? arr : [];
  }catch(e){
    return [];
  }
}

function setFavs(a){
  localStorage.setItem(
    LS.favs,
    JSON.stringify(a)
  );
}

/* =========================
   RIDES
   ========================= */
function getRides(){
  try{
    const arr = JSON.parse(
      localStorage.getItem(LS.rides) || "[]"
    );

    return Array.isArray(arr) ? arr : [];
  }catch(e){
    return [];
  }
}

/* =========================
   PASSWORD
   ========================= */
function isStrongPw(p){
  return (p || "").length >= 8 &&
    /[A-Z]/.test(p) &&
    /[a-z]/.test(p) &&
    /\d/.test(p);
}

function isValidNLPhone(v){
  const s = (v || "")
    .replace(/\s+/g,'')
    .trim();

  return /^(0\d{9}|\+31\d{9})$/.test(s);
}

/* =========================
   DEFAULTS
   ========================= */
function ensureDefaults(){
  const p = getProfile();

  if(!localStorage.getItem(LS.profile)){
    saveProfileToLS(p);
  }

  if(!localStorage.getItem(LS.payment)){
    localStorage.setItem(LS.payment, 'card');
  }

  if(!localStorage.getItem(LS.lang)){
    localStorage.setItem(LS.lang, 'nl');
  }

  if(!localStorage.getItem(LS.theme)){
    localStorage.setItem(LS.theme, 'auto');
  }

  if(!localStorage.getItem(LS.favs)){
    localStorage.setItem(LS.favs, '[]');
  }

  if(!localStorage.getItem(LS.rides)){
    localStorage.setItem(LS.rides, '[]');
  }
}