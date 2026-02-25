self.addEventListener('push', (event) => {
    const data = event.data.json();
    self.registration.showNotification('Stratabin Reminder', {
        body: data.body,
        icon: '/favicon.png',
    });
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});
