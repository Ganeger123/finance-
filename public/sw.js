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

// PWA Notification Handling
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const { title, body, icon, data } = event.data.payload;
        self.registration.showNotification(title, {
            body,
            icon: icon || '/pwa_icon_512.png',
            badge: '/pwa_icon_512.png',
            data: data || {}
        });
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            if (clientList.length > 0) {
                let client = clientList[0];
                for (let i = 0; i < clientList.length; i++) {
                    if (clientList[i].focused) {
                        client = clientList[i];
                        break;
                    }
                }
                return client.focus();
            }
            return clients.openWindow('/');
        })
    );
});

self.addEventListener('push', (event) => {
    let data = { title: 'Panacée Notification', body: 'New update available.' };
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }
    const options = {
        body: data.body,
        icon: '/pwa_icon_512.png',
        badge: '/pwa_icon_512.png',
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
});
