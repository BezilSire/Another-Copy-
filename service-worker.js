// Define cache names for static assets and dynamic API responses.
const STATIC_CACHE_NAME = 'ubuntium-static-cache-v2';
const DYNAMIC_CACHE_NAME = 'ubuntium-dynamic-cache-v2';

// List all critical static assets that form the application shell.
const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/index.tsx',
  '/App.tsx',
  '/types.ts',
  // Key components needed for the app to load
  '/components/Header.tsx',
  '/components/AuthPage.tsx',
  '/components/LoginPage.tsx',
  '/contexts/AuthContext.tsx',
  '/contexts/ToastContext.tsx',
  // Main CSS and font files
  'https://rsms.me/inter/inter.css',
  // Key icons that are part of the main UI
  '/components/icons/LogoIcon.tsx',
  '/components/icons/UserCircleIcon.tsx',
  // The manifest for PWA functionality
  '/manifest.json'
];

// On 'install', pre-cache the application shell.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then(cache => {
      console.log('Service Worker: Pre-caching App Shell...');
      return cache.addAll(APP_SHELL_ASSETS);
    })
  );
});

// On 'activate', clean up old caches.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// On 'fetch', apply caching strategies.
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Strategy 1: Network-first for Firestore API calls.
  if (url.hostname === 'firestore.googleapis.com') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // If the request is successful, clone it and cache it.
          const clonedResponse = response.clone();
          caches.open(DYNAMIC_CACHE_NAME).then(cache => {
            cache.put(request.url, clonedResponse);
          });
          return response;
        })
        .catch(() => {
          // If the network fails, try to serve from the cache.
          return caches.match(request);
        })
    );
  } 
  // Strategy 2: Cache-first for all other requests (app shell, static assets).
  else {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        // If a cached response is found, return it.
        if (cachedResponse) {
          return cachedResponse;
        }

        // If not in cache, fetch from the network.
        return fetch(request)
          .then(networkResponse => {
            // Cache the new response for future use.
            const clonedResponse = networkResponse.clone();
            caches.open(DYNAMIC_CACHE_NAME).then(cache => {
              cache.put(request.url, clonedResponse);
            });
            return networkResponse;
          })
          .catch(() => {
            // If the network request fails and the asset is not in any cache,
            // and it's a navigation request, show the offline fallback page.
            if (request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
          });
      })
    );
  }
});
