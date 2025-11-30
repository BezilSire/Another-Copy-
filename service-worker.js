
// A list of host suffixes that the service worker should completely ignore.
// This is a safeguard to ensure that Firebase's real-time features are never intercepted.
const IGNORED_HOST_SUFFIXES = [
  'googleapis.com', // Covers Firestore, Identity Toolkit, etc.
  'gstatic.com',    // Firebase JS SDK is served from here
];

const STATIC_CACHE_NAME = 'gcn-static-cache-v6'; // BUMPED VERSION TO FORCE UPDATE
const DYNAMIC_CACHE_NAME = 'gcn-dynamic-cache-v6'; // BUMPED VERSION TO FORCE UPDATE

// List all critical static assets that form the application shell.
const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/logo.svg',
  '/manifest.json',
  'https://rsms.me/inter/inter.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then(cache => {
      console.log('Service Worker: Pre-caching App Shell...');
      return cache.addAll(APP_SHELL_ASSETS);
    })
  );
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
});

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
  // Tell the active service worker to take control of the page immediately.
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Safeguard: If the request is for any Google/Firebase API, let the browser handle it.
  if (IGNORED_HOST_SUFFIXES.some(suffix => url.hostname.endsWith(suffix))) {
    return; // Do not intercept.
  }
  
  // For app shell assets, use a cache-first strategy for instant loading.
  if (APP_SHELL_ASSETS.some(assetPath => url.pathname === assetPath || url.href === assetPath)) {
      event.respondWith(caches.match(request));
      return;
  }

  // "Network First, then Cache" strategy for dynamic content
  event.respondWith(
    fetch(request)
      .then(networkResponse => {
        // If the fetch is successful, update the dynamic cache.
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(DYNAMIC_CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // If the network request fails (i.e., the user is offline),
        // try to serve the response from the cache.
        return caches.match(request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If the request is for a page and it's not in the cache, show the offline page.
          if (request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
          // For other failed requests (like API calls not in cache), just fail.
          return new Response(JSON.stringify({ error: 'offline' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});
