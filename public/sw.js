/* sw.js - Passthrough Service Worker */
const CACHE_NAME = 'panace-cache-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Ignore .ts and .tsx files (they're for bundling, not HTTP requests)
    if (event.request.url.endsWith('.ts') || event.request.url.endsWith('.tsx')) {
        return;
    }

    // Bypass caching for API requests - let them pass through
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                // If API fetch fails, return offline response
                return new Response(
                    JSON.stringify({ error: 'API unavailable (offline)' }),
                    { headers: { 'Content-Type': 'application/json' }, status: 503 }
                );
            })
        );
        return;
    }

    // For other requests (assets, pages), try network first, fall back to cache
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cache successful responses
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(event.request)
                    .then((cachedResponse) => {
                        return cachedResponse || new Response('Offline', { status: 503 });
                    });
            })
    );
});
