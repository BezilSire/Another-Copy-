
// Service Worker for Global Commons Network
// Caches app shell and critical CDN dependencies for offline access.

const STATIC_CACHE_NAME = 'gcn-static-v7';
const DYNAMIC_CACHE_NAME = 'gcn-dynamic-v7';

// 1. Files from our own project structure
const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/logo.svg',
  '/manifest.json',
  '/index.js' 
];

// 2. External Libraries (Must match index.html import map)
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
  'https://www.gstatic.com/firebasejs/10.12.5/',
  'https://cdn.jsdelivr.net/npm/tweetnacl@1.0.3/+esm',
  'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/+esm',
  'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/+esm'
];

// Hosts to never cache (API endpoints, real-time data)
const IGNORED_HOSTS = [
  'googleapis.com', 
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then(cache => {
      console.log('[Service Worker] Pre-caching App Shell & External Libs');
      // We combine both lists. 
      // Note: If any single URL fails to fetch, the entire install fails.
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
            console.log('[Service Worker] Removing old cache:', key);
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

  // 1. Ignore API calls / Firestore real-time streams
  if (IGNORED_HOSTS.some(host => url.hostname.includes(host))) {
    return;
  }

  // 2. Cache-First Strategy for Static Assets (Shell + Ext Libs)
  if (APP_SHELL.includes(url.pathname) || EXTERNAL_LIBS.includes(event.request.url)) {
    event.respondWith(
      caches.match(event.request).