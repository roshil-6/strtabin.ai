const CACHE_NAME = 'stratabin-assistant-v3';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/stratabin-icon.svg'];

// Install: cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
        )
    );
    self.clients.claim();
});

// Fetch: only cache same-origin GET requests — never touch external/cross-origin
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || event.request.headers.has('Authorization')) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cache API rejects 206 (Partial Content) and other non-200 responses
                if (response.status === 200 && response.type === 'basic') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() =>
                caches.match(event.request).then((cached) => cached || new Response('Offline', { status: 503 }))
            )
    );
});

// Background delivery must keep the worker alive until the notification is shown.
self.addEventListener('push', event => {
    let data = {};
    try { data = event.data ? event.data.json() : {}; } catch { /* generic fallback */ }
    const tag = typeof data.tag === 'string' ? data.tag.slice(0, 160) : 'stratabin-reminder';
    event.waitUntil(self.registration.showNotification('Stratabin reminder', {
        body: 'A reminder is ready. Open Stratabin to see your schedule.',
        icon: '/stratabin-icon.svg', badge: '/stratabin-icon.svg', tag,
        data: { url: '/dashboard?assistant=reminders' },
    }));
});
self.addEventListener('notificationclick', event => {
    event.notification.close();
    const target = new URL('/dashboard?assistant=reminders', self.location.origin).href;
    event.waitUntil((async () => {
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of windows) {
            if (new URL(client.url).origin === self.location.origin) {
                await client.navigate(target);
                return client.focus();
            }
        }
        return self.clients.openWindow(target);
    })());
});
