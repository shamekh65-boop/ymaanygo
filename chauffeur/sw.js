// ymaanyGO Chauffeur - Service Worker v2
self.addEventListener("install", e => { self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(self.clients.claim()); });

// Ontvang push bericht van server
self.addEventListener("push", e => {
 if(!e.data) return;
 let data={};
 try{ data=e.data.json(); }catch(err){ data={title:"Nieuwe rit!",body:e.data.text()}; }

 const title=data.title||"🚖 Nieuwe rit! — ymaanyGO";
 const options={
   body:data.body||"",
   icon:"/favicon.ico",
   badge:"/favicon.ico",
   tag:data.tag||"rit-"+Date.now(),
   requireInteraction:true,
   silent:false,
   vibrate:[300,100,300,100,500],
   data:{ rideId:data.rideId, url:"/chauffeur/dashboard/index.html" }
 };

 e.waitUntil(self.registration.showNotification(title, options));
});

// Klik op notificatie
self.addEventListener("notificationclick", e => {
 e.notification.close();
 const rideId=e.notification.data?.rideId;
 const url=e.notification.data?.url||"/chauffeur/dashboard/index.html";

 e.waitUntil(
   self.clients.matchAll({type:"window",includeUncontrolled:true}).then(clients=>{
     for(const c of clients){
       if(c.url.includes("/chauffeur/")&&"focus" in c){
         c.focus();
         if(rideId) c.postMessage({type:"OPEN_RIDE",rideId});
         return;
       }
     }
     if(self.clients.openWindow) return self.clients.openWindow(url);
   })
 );
});

// Berichten van de app ontvangen
self.addEventListener("message", e => {
 if(e.data?.type==="SHOW_NOTIFICATION"){
   self.registration.showNotification(e.data.title, {
     body:e.data.body||"",
     icon:"/favicon.ico",
     tag:"rit-"+Date.now(),
     requireInteraction:true,
     vibrate:[300,100,300,100,500],
     data:{ rideId:e.data.rideId, url:"/chauffeur/dashboard/index
   .html" }
   });
 }
});
