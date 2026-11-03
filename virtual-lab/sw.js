// Offline support: cache every file on first load, then serve from cache.
const VERSION = 'biolab-v1';
const FILES = [
  './',
  './index.html',
  './css/app.css',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  "./js/audio.js",
  "./js/data.js",
  "./js/engine.js",
  "./js/input.js",
  "./js/lab.js",
  "./js/main.js",
  "./js/models.js",
  "./js/molecular.js",
  "./js/protocol.js",
  "./js/scene.js",
  "./js/sim.js",
  "./js/textures.js",
  "./js/ui.js",
  "./vendor/addons/environments/RoomEnvironment.js",
  "./vendor/addons/geometries/RoundedBoxGeometry.js",
  "./vendor/three.core.min.js",
  "./vendor/three.module.min.js",
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first (so updates arrive when online), cache fallback (works offline).
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});
