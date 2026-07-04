// KILL SWITCH — this worker replaces the old caching SW, nukes every
// cache it created, unregisters itself, and reloads any open tabs so
// they're controlled by nothing. Leave this deployed for as long as any
// device might still have the old worker installed (i.e., a while).
// When you're ready to ship a real SW again, replace this file — do NOT
// just delete it, or old installs will keep the last worker they fetched.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', async () => {
  const keys = await caches.keys();
  await Promise.all(keys.map(k => caches.delete(k)));
  await self.registration.unregister();
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client => client.navigate(client.url));
});
