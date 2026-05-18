self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

self.addEventListener("push", event => {

  let data = {};

  if (event.data) {
    data = event.data.json();
  }

  self.registration.showNotification(
    data.title || "Nieuwe rit",
    {
      body: data.body || "Er is een nieuwe rit beschikbaar",
      icon: "/ymaanygo/chauffeur/icons/icon-192.png",
      badge: "/ymaanygo/chauffeur/icons/icon-192.png"
    }
  );

});

self.addEventListener("notificationclick", event => {

  event.notification.close();

  event.waitUntil(
    clients.openWindow("/ymaanygo/chauffeur/")
  );

});