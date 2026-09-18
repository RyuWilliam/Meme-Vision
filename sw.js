const CACHE_NAME = 'meme-vision-v1';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/meme-vision-icon-192.png',
  '/assets/meme-vision-icon-512.png',
  '/assets/meme-vision-icon-maskable.png',
  '/assets/meme-vision-screenshot-wide.png',
  '/assets/meme-vision-screenshot-mobile.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(encontrado => encontrado || fetch(event.request))
  );
});