const CACHE_NAME = 'promptnota-v4';
const ASSETS = [
  '/PWANota/',
  '/PWANota/index.html',
  '/PWANota/style.css',
  '/PWANota/app.js',
  '/PWANota/db.js',
  '/PWANota/icons/icon-192.png',
  '/PWANota/icons/icon-512.png'
];

// Install: cache all assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first strategy
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).catch(() => caches.match('/PWANota/index.html'));
    })
  );
});
