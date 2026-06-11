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

async function loadDetailMap(fromAddr,toAddr,stops=[]){
  const mapEl=document.getElementById("dtMap");if(!mapEl)return;
  if(!window.L){
    const link=document.createElement("link");link.rel="stylesheet";link.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";document.head.appendChild(link);
    await new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";s.onload=res;s.onerror=rej;document.head.appendChild(s);});
  }
  if(detailMapObj){try{detailMapObj.remove();}catch(e){}detailMapObj=null;}

  const allAddrs=[fromAddr,...stops,toAddr];
  const allCoords=await Promise.all(allAddrs.map(a=>geocodeAddr(a)));
  if(!allCoords[0]||!allCoords[allCoords.length-1]){
    mapEl.innerHTML=`<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--INK3);font-size:12px">Route niet beschikbaar</div>`;return;
  }

  mapEl.innerHTML="";
  const map=L.map(mapEl,{zoomControl:false,attributionControl:false,dragging:true,scrollWheelZoom:false,doubleClickZoom:false,touchZoom:true});
  detailMapObj=map;
  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",{maxZoom:19}).addTo(map);

  const dotSize=14,labelH=26,gap=4;
  const iconFrom=L.divIcon({html:`<div style="display:flex;flex-direction:column;align-items:center;gap:${gap}px"><div style="background:#1b5e20;color:#fff;font-size:10px;font-weight:800;padding:4px 10px;border-radius:50px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.35);font-family:sans-serif;line-height:1">Vertrek</div><div style="width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:#1b5e20;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div></div>`,className:"",iconAnchor:[dotSize/2+10,labelH+gap+dotSize]});
  const iconTo=L.divIcon({html:`<div style="display:flex;flex-direction:column;align-items:center;gap:${gap}px"><div style="background:#1565c0;color:#fff;font-size:10px;font-weight:800;padding:4px 10px;border-radius:50px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.35);font-family:sans-serif;line-height:1">Aankomst</div><div style="width:${dotSize}px;height:${dotSize}px;border-radius:3px;background:#fff;border:3px solid #1565c0;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div></div>`,className:"",iconAnchor:[dotSize/2+14,labelH+gap+dotSize]});

  L.marker(allCoords[0],{icon:iconFrom}).addTo(map);
  L.marker(allCoords[allCoords.length-1],{icon:iconTo}).addTo(map);

  // Stop markers
  stops.forEach((s,i)=>{
    const coord=allCoords[i+1];if(!coord)return;
    const iconStop=L.divIcon({html:`<div style="display:flex;flex-direction:column;align-items:center;gap:3px"><div style="background:#f59e0b;color:#fff;font-size:9px;font-weight:800;padding:3px 8px;border-radius:50px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.3);font-family:sans-serif;line-height:1">Stop ${i+1}</div><div style="width:11px;height:11px;border-radius:50%;background:#f59e0b;border:2.5px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.35)"></div></div>`,className:"",iconAnchor:[5+16,22+3+11]});
    L.marker(coord,{icon:iconStop}).addTo(map);
  });

  // Route via OSRM met alle waypoints
  try{
    const validCoords=allCoords.filter(Boolean);
    const waypoints=validCoords.map(c=>`${c[1]},${c[0]}`).join(";");
    const osrm=`https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`;
    const rr=await fetch(osrm);const rd=await rr.json();
    if(rd.routes&&rd.routes[0]){
      const coords=rd.routes[0].geometry.coordinates.map(c=>[c[1],c[0]]);
      L.polyline(coords,{color:"#2e7d32",weight:5,opacity:.9}).addTo(map);
      map.fitBounds(L.latLngBounds(validCoords),{padding:[44,44]});
    }else throw new Error();
  }catch{
    const validCoords=allCoords.filter(Boolean);
    L.polyline(validCoords,{color:"#2e7d32",weight:3,dashArray:"8,6",opacity:.7}).addTo(map);
    map.fitBounds(L.latLngBounds(validCoords),{padding:[50,50]});
  }
}
