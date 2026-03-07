const CACHE_NAME = 'stratabin-v2';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/favicon.png'];

// URLs/origins that should never be cached (live API, auth services)
const NO_CACHE_PATTERNS = [
    'onrender.com',
    'clerk.com',
    'clerk.accounts.dev',
    'clerk-telemetry',
    'api.anthropic.com',
    'cloudflare.com',
];

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

// Fetch: network first, fallback to cache (skip external API/auth origins)
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = event.request.url;
    if (NO_CACHE_PATTERNS.some((pattern) => url.includes(pattern))) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});

// Push notifications
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : { body: 'New reminder from Stratabin.' };
    self.registration.showNotification('Stratabin AI', {
        body: data.body,
        icon: '/favicon.png',
        badge: '/favicon.png',
    });
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow('/'));
});
