export class NotificationManager {
    static async requestPermission() {
        if (!('Notification' in window)) {
            console.error('This browser does not support desktop notification');
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }

        return false;
    }

    static scheduleNotification(task: string, timeStr: string) {
        // timeStr is in HH:mm format
        const [hours, minutes] = timeStr.split(':').map(Number);
        const now = new Date();
        const scheduledTime = new Date();
        scheduledTime.setHours(hours, minutes, 0, 0);

        // If time is in the past for today, don't schedule (or schedule for tomorrow?)
        // For now, only schedule if it's in the future today.
        if (scheduledTime.getTime() <= now.getTime()) {
            console.log(`Notification for "${task}" at ${timeStr} is in the past.`);
            return;
        }

        const delay = scheduledTime.getTime() - now.getTime();

        console.log(`Scheduling notification for "${task}" in ${Math.round(delay / 1000 / 60)} minutes.`);

        setTimeout(() => {
            this.showNotification(task);
        }, delay);
    }

    static showNotification(task: string) {
        if (Notification.permission === 'granted') {
            new Notification('Stratabin Reminder', {
                body: `Time for: ${task}`,
                icon: '/favicon.png',
                tag: 'stratabin-event',
                requireInteraction: true
            });
        }
    }
}

