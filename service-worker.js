
// Service Worker for Global Commons Network
// Caches app shell and critical CDN dependencies for offline access.

const STATIC_CACHE_NAME = 'gcn-static-v8';
const DYNAMIC_CACHE_NAME = 'gcn-dynamic-v8';

const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/logo.svg',
  '/manifest.json',
  '/index.js' 
];

const EXTERNAL_LIBS = [
  'https://rsms.me/inter/inter.css',
  'https://cdn.tailwindcss.com',
  'https://aistudiocdn.com/react@19.2.0',
  'https://aistudiocdn.com/react@19.2.0/',
  'https://aistudiocdn.com/react-dom@19.2.0/client.js',
  'https://aistudiocdn.com/react-dom@19.2.0/',
  'https://aistudiocdn.com/@google/genai@1.24.0',
  'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js',
  'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js',
  'https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging.js',
  'https://www.gstatic.com/firebasejs/10.12.5/firebase-functions.js',
  'https://esm.sh/tweetnacl@1.0.3',
  'https://esm.sh/qrcode@1.5.3',
  'https://esm.sh/html5-qrcode@2.3.8'
];

const IGNORED_HOSTS = [
  'googleapis.com', 
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then(cache => {
      console.log('[Service Worker] Pre-caching Static Assets');
      return cache.addAll([...APP_SHELL, ...EXTERNAL_LIBS]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (IGNORED_HOSTS.some(host => url.hostname.includes(host)) || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(DYNAMIC_CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
      });
    })
  );
});
