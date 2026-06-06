/* ── config.js ── */
const VAPID_PUBLIC_KEY="BFhJg8DjU38nFw4JWUxnteIRKjZIUBaJry_9IyyLz5E0Mooy0uZDFZk1D0J_N7qqVAD0Qo13IWc-UPO8LyTDBvU";

const SB=supabase.createClient(
  "https://lxbfobdczjgqnotwsnki.supabase.co",
  "sb_publishable_H5HKGlHBe9z3ejn0B-NKsw_9Mo-MIhp"
);

function urlBase64ToUint8Array(b){
  const p="=".repeat((4-b.length%4)%4);
  const b64=(b+p).replace(/-/g,"+").replace(/_/g,"/");
  const raw=window.atob(b64);
  const out=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;++i)out[i]=raw.charCodeAt(i);
  return out;
}
