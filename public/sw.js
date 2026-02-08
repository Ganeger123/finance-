/* sw.js - Passthrough Service Worker */
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Bypass caching for API requests
    if (event.request.url.includes('/api/')) {
        return;
    }

    // Default fetch behavior
    event.respondWith(fetch(event.request));
});
