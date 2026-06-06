/* ── map.js ── */
let detailMapObj=null;

async function geocodeAddr(addr){
  if(geocodeCache.has(addr))return geocodeCache.get(addr);
  try{
    const url=`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&countrycodes=nl,be,de&limit=1`;
    const res=await fetch(url,{headers:{"Accept-Language":"nl"}});
    const data=await res.json();
    const result=data.length?[parseFloat(data[0].lat),parseFloat(data[0].lon)]:null;
    if(result)geocodeCache.set(addr,result);
    return result;
  }catch(e){return null;}
}

async function loadDetailMap(fromAddr,toAddr){
  const mapEl=document.getElementById("dtMap");if(!mapEl)return;
  if(!window.L){
    const link=document.createElement("link");link.rel="stylesheet";link.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";document.head.appendChild(link);
    await new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";s.onload=res;s.onerror=rej;document.head.appendChild(s);});
  }
  if(detailMapObj){try{detailMapObj.remove();}catch(e){}detailMapObj=null;}
  let[fromCoord,toCoord]=await Promise.all([geocodeAddr(fromAddr),geocodeAddr(toAddr)]);
  if(!fromCoord||!toCoord){mapEl.innerHTML=`<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--INK3);font-size:12px">Route niet beschikbaar</div>`;return;}
  mapEl.innerHTML="";
  const map=L.map(mapEl,{zoomControl:false,attributionControl:false,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,touchZoom:false});
  detailMapObj=map;
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",{maxZoom:19}).addTo(map);
  const dotSize=14,labelH=26,gap=4;
  const iconFrom=L.divIcon({html:`<div style="display:flex;flex-direction:column;align-items:center;gap:${gap}px"><div style="background:#1b5e20;color:#fff;font-size:10px;font-weight:800;padding:4px 10px;border-radius:50px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.35);font-family:sans-serif;line-height:1">Vertrek</div><div style="width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:#1b5e20;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div></div>`,className:"",iconAnchor:[dotSize/2+10,labelH+gap+dotSize]});
  const iconTo=L.divIcon({html:`<div style="display:flex;flex-direction:column;align-items:center;gap:${gap}px"><div style="background:#1565c0;color:#fff;font-size:10px;font-weight:800;padding:4px 10px;border-radius:50px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.35);font-family:sans-serif;line-height:1">Aankomst</div><div style="width:${dotSize}px;height:${dotSize}px;border-radius:3px;background:#fff;border:3px solid #1565c0;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div></div>`,className:"",iconAnchor:[dotSize/2+14,labelH+gap+dotSize]});
  L.marker(fromCoord,{icon:iconFrom}).addTo(map);L.marker(toCoord,{icon:iconTo}).addTo(map);
  try{
    const osrm=`https://router.project-osrm.org/route/v1/driving/${fromCoord[1]},${fromCoord[0]};${toCoord[1]},${toCoord[0]}?overview=full&geometries=geojson`;
    const rr=await fetch(osrm);const rd=await rr.json();
    if(rd.routes&&rd.routes[0]){const coords=rd.routes[0].geometry.coordinates.map(c=>[c[1],c[0]]);L.polyline(coords,{color:"#2e7d32",weight:4,opacity:.9}).addTo(map);map.fitBounds(L.latLngBounds([fromCoord,toCoord,...coords.filter((_,i)=>i%10===0)]),{padding:[44,44]});}
    else throw new Error();
  }catch{L.polyline([fromCoord,toCoord],{color:"#2e7d32",weight:3,dashArray:"8,6",opacity:.7}).addTo(map);map.fitBounds(L.latLngBounds([fromCoord,toCoord]),{padding:[50,50]});}
}
