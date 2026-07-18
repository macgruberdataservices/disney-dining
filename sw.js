// App-shell-only service worker. Caches index.html, manifest.json, and the
// icons — NOT the data/*.json files. Data freshness is owned entirely by
// checkAndLoadData()'s manifest-polling logic in index.html; this SW staying
// out of that path means it can never serve stale restaurant/menu data.
//
// Cache name is tied to APP_VERSION (index.html) so bumping that version and
// redeploying rolls the shell forward: activate deletes any cache whose name
// doesn't match the current version.
const CACHE_VERSION = 'v24';
const CACHE_NAME = `wienie-shell-${CACHE_VERSION}`;
const SHELL_FILES = [
  './',
  'index.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Never touch data files or the manifest — those must always hit the
  // network so checkAndLoadData() can see updates.
  if (url.pathname.includes('/data/')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(resp => {
        if (resp.ok && event.request.method === 'GET') {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return resp;
      });
    }).catch(() => caches.match(event.request))
  );
});
