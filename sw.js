const CACHE_NAME = 'worksbox-pwa-v2';

// Detect base directory dynamically for GitHub Pages subpath deployment
const getBasePath = () => {
  const path = self.location.pathname;
  return path.substring(0, path.lastIndexOf('/'));
};

const BASE_PATH = getBasePath();

const ASSETS_TO_CACHE = [
  BASE_PATH + '/',
  BASE_PATH + '/index.html',
  BASE_PATH + '/admin.html',
  BASE_PATH + '/panne.html',
  BASE_PATH + '/manifest.json',
  BASE_PATH + '/favicon.svg',
  BASE_PATH + '/tailwind.js',
  BASE_PATH + '/babel.min.js',
  BASE_PATH + '/react.production.min.js',
  BASE_PATH + '/react-dom.production.min.js',
  BASE_PATH + '/constants.js',
  BASE_PATH + '/note-editor.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Cache addAll warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return; // Never cache API calls

  const isHtmlRequest = event.request.headers.get('accept')?.includes('text/html') ||
                        event.request.url.endsWith('/') ||
                        event.request.url.endsWith('.html');

  if (isHtmlRequest) {
    // Network First strategy for HTML pages to ensure outage mode state is always fresh
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && event.request.url.startsWith(self.location.origin)) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || caches.match(BASE_PATH + '/index.html') || caches.match('index.html');
          });
        })
    );
    return;
  }

  // Stale-While-Revalidate strategy for static assets (JS, CSS, images)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.url.startsWith(self.location.origin)) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      });
    })
  );
});
