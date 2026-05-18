self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(clients.claim());
});

self.addEventListener("push", event => {

  let data = {};

  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: "Nieuwe rit",
      body: "Er is een nieuwe rit beschikbaar"
    };
  }

  const title = data.title || "ymaanyGO";
  const options = {
    body: data.body || "Nieuwe rit beschikbaar",
    icon: "/chauffeur/icons/icon-192.png",
    badge: "/chauffeur/icons/icon-192.png",
    vibrate: [200, 100, 200],
    data: {
      url: "/chauffeur/dashboard.html"
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", event => {

  event.notification.close();

  event.waitUntil(
    clients.openWindow("/chauffeur/dashboard.html")
  );
});