// SimpleCommunicate Service Worker (PWA + Web Push)
const CACHE_NAME = 'simple-com-v5';
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

// PUSH: muncul di notifikasi HP walau app ditutup.
// Judul, isi, dan tag datang dari backend (KANGEN / BATTERY / MOOD).
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }

  const type = data.type || 'KANGEN_ALERT';
  const isKangen = type === 'KANGEN_ALERT';
  const title = data.title || 'SimpleCom';
  const tag = data.tag || (isKangen ? 'kangen-alert' : String(type).toLowerCase());

  const options = {
    body: data.body || 'Ada kabar dari pasanganmu ♥',
    icon: './assets/icons/icon-192.png',
    badge: './assets/icons/icon-192.png',
    tag: tag,
    renotify: true,
    requireInteraction: isKangen,
    silent: false,
    timestamp: Date.now(),
    data: {
      url: data.url || './index.html',
      type: type,
      tone: data.tone || 'kalimba'
    }
  };

  event.waitUntil((async () => {
    // Notifikasi SELALU ditampilkan (iOS bisa mencabut izin kalau push tidak menampilkan notif)
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
