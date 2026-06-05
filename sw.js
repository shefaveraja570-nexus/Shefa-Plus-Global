const CACHE_NAME = 'shefa-plus-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/estilos.css'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});
