const CACHE_NAME = 'CreaWebFotos-v1';

const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './jspdf.umd.min.js',
  './favicon.png',
  './manifest.json',
  './marca-creapr-horizontal-normal-transparente.png'
];

/**
 * INSTALL — precache completo
 */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

/**
 * ACTIVATE — limpa caches antigos
 */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/**
 * FETCH — cache-first (offline-first)
 */
self.addEventListener('fetch', event => {
  // Apenas GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // Se não houver cache e não houver internet
      return fetch(event.request)
        .then(response => {
          // Salva no cache dinamicamente
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => {
          // Offline e recurso não cacheado
          return new Response(
            'Aplicativo indisponível offline.',
            { status: 503, headers: { 'Content-Type': 'text/plain' } }
          );
        });
    })
  );
});
