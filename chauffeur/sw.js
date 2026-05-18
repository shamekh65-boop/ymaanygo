self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const rideId = e.notification.data?.rideId;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const c of clients) {
        if (c.url.includes('/chauffeur/') && 'focus' in c) {
          c.focus();
          if (rideId) c.postMessage({ type: 'OPEN_RIDE', rideId });
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow('/chauffeur/dashboard.html');
    })
  );
});
