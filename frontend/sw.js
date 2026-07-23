/* EngiBuddy Service Worker v1.0.0 */

const CACHE_NAME = 'engibuddy-v1';

// Resources to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/css/style.css',
  '/css/component_properties.css',
  '/css/typing_indicator.css',
  '/css/onboarding.css',
  '/js/app.js',
  '/js/viewer.js',
  '/js/mini_viewer.js',
  '/js/circuit_builder.js',
  '/js/circuit_library.js',
  '/js/model_gallery.js',
  '/js/oscilloscope.js',
  '/manifest.json',
  '/icons/apple-icon-180.png',
  '/icons/favicon-196.png',
  '/icons/manifest-icon-192.maskable.png',
  '/icons/manifest-icon-512.maskable.png',
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS).catch(() => {});
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

/* ---------------- Push Notifications ---------------- */

self.addEventListener('push', event => {
  let data = { title: 'EngiBuddy', body: 'You have a new message!' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'You have a new message!',
    icon: '/icons/manifest-icon-192.maskable.png',
    badge: '/icons/favicon-196.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
    },
    requireInteraction: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'EngiBuddy', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Focus existing tab if already open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(client => client.navigate(urlToOpen));
        }
      }
      // Otherwise open new tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('notificationclose', event => {
  // Notification dismissed without clicking — can track analytics here
});

// Network-first for API calls, cache-first for static assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API calls — network first, fall back to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // CDN resources — network first
  if (url.hostname.includes('cdn.jsdelivr.net')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Static assets — cache first, then network
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => {});
      return cached || fetchPromise;
    })
  );
});
