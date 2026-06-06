/* ── helpers.js ── */
const $=id=>document.getElementById(id);

const pN=v=>{
  if(!v)return 0;
  let s=String(v).replace(/€/g,"").trim();
  if(s.includes(",")&&s.includes(".")){s=s.replace(/\./g,"");}
  s=s.replace(",",".");
  return Number(s)||0;
};

const tT=v=>{if(!v)return"--:--";const d=new Date(v);return isNaN(d)?"--:--":d.toLocaleTimeString("nl-NL",{hour:"2-digit",minute:"2-digit"})};
const tD=v=>{if(!v)return"-";const d=new Date(v);return isNaN(d)?"-":d.toLocaleDateString("nl-NL",{weekday:"short",day:"2-digit",month:"short"})};
const ini=n=>n?n.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase():"?";

const esc=v=>{
  if(v==null)return"";
  return String(v)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
};

const sLbl=s=>({pending:"Beschikbaar",accepted:"Geaccepteerd",on_the_way:"Onderweg",arrived:"Aangekomen",completed:"Voltooid",cancelled:"Geannuleerd"}[s]||s||"?");
const sCls=s=>({pending:"bp",accepted:"ba",on_the_way:"bo",arrived:"bar",completed:"bc",cancelled:"bx"}[s]||"bp");

function tOk(m){const e=$("tok");e.textContent=m;e.classList.add("s");setTimeout(()=>e.classList.remove("s"),2800);}
function tErr(m){const e=$("terr");e.textContent=m;e.classList.add("s");setTimeout(()=>e.classList.remove("s"),3500);}