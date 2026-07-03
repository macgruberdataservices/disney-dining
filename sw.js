const CACHE_VERSION = 'wienie-v3';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './restaurant_data_normalized.json',
  './menu_data_normalized.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for the data JSON (so you get fresh menus when online),
// cache-first for everything else (so the shell still loads offline).
self.addEventListener('fetch', event => {
  const url = event.request.url;
  if (url.includes('_normalized.json')) {
    event.respondWith(
      fetch(event.request)
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, copy));
          return resp;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
