/* ============================================================
   MonPlein — Service Worker (Cache-first + Network fallback)
   By WEYNII
   ============================================================ */

const CACHE_NAME = 'monplein-v3';

// Fichiers à mettre en cache lors de l'installation
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js',
  'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500;600&display=swap'
];

// Installation — pré-cache les assets essentiels
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Pré-cache des assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(function() {
      // Activer immédiatement sans attendre la fermeture des anciens onglets
      return self.skipWaiting();
    })
  );
});

// Activation — supprimer les anciens caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) { return name !== CACHE_NAME; })
          .map(function(name) {
            console.log('[SW] Suppression ancien cache :', name);
            return caches.delete(name);
          })
      );
    }).then(function() {
      // Prendre le contrôle de tous les onglets ouverts
      return self.clients.claim();
    })
  );
});

// Fetch — stratégie Cache-first, fallback réseau
self.addEventListener('fetch', function(event) {
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function(cachedResponse) {
      if (cachedResponse) {
        // Mettre à jour le cache en arrière-plan (stale-while-revalidate)
        var fetchPromise = fetch(event.request).then(function(networkResponse) {
          if (networkResponse && networkResponse.ok) {
            var responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch(function() {
          // Réseau indisponible, on a déjà le cache
        });

        return cachedResponse;
      }

      // Pas en cache → réseau, puis mettre en cache
      return fetch(event.request).then(function(networkResponse) {
        if (networkResponse && networkResponse.ok) {
          var responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(function() {
        // Totalement offline et pas en cache
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
