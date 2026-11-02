// SimpleCommunicate Service Worker (PWA + Web Push)
const CACHE_NAME = 'simple-com-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/audio.js',
  './manifest.json',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/photos/cowo.svg',
  './assets/photos/cewe.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : undefined))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

  const url = event.request.url;
  if (url.includes('broker.') || url.includes('mqtt') || url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request).then((cached) => {
        if (cached) return cached;
        if (event.request.mode === 'navigate') return caches.match('./index.html');
      }))
  );
});

// PUSH: muncul di notifikasi HP walau app ditutup
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }

  const title = data.title || 'Pasanganmu lagi kangen ♥';
  const options = {
    body: data.body || 'Tombol kangen baru saja dipencet. Buka untuk membalas ♡',
    icon: './assets/icons/icon-192.png',
    badge: './assets/icons/icon-192.png',
    tag: 'kangen-alert',
    renotify: true,
    requireInteraction: true,
    vibrate: [400, 150, 400, 150, 400, 150, 800, 300, 400, 150, 400, 150, 800],
    data: { url: './index.html' }
  };

  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (wins.some((c) => c.visibilityState === 'visible')) return;
    await self.registration.showNotification(title, options);
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || './index.html';

  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of wins) {
      if ('focus' in c) return c.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow(target);
  })());
});