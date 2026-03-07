/**
 * NotificationManager — date-aware calendar reminders
 *
 * Key behaviours:
 *  - Reminders fire 15 min before the event (and again at event time if ≤15 min away)
 *  - Works for both global and project-calendar events
 *  - All Day events are skipped (no meaningful time to schedule against)
 *  - Timers survive in-session navigation but must be re-registered after a page reload;
 *    the store's checkNotifications() handles that on every app start
 */
export class NotificationManager {
    private static pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

    /** Request browser notification permission. Returns true if granted. */
    static async requestPermission(): Promise<boolean> {
        if (!('Notification' in window)) return false;
        if (Notification.permission === 'granted') return true;
        if (Notification.permission !== 'denied') {
            const result = await Notification.requestPermission();
            return result === 'granted';
        }
        return false;
    }

    static get hasPermission(): boolean {
        return 'Notification' in window && Notification.permission === 'granted';
    }

    /**
     * Schedule a browser notification for the given event.
     * @param task    Event title
     * @param timeStr HH:MM string (24-hour). "All Day" and unparseable values are ignored.
     * @param dateKey YYYY-MM-DD string for the event date
     */
    static scheduleNotification(task: string, timeStr: string, dateKey: string) {
        if (!timeStr || timeStr === 'All Day') return;

        const [hStr, mStr] = timeStr.split(':');
        const hours = parseInt(hStr, 10);
        const minutes = parseInt(mStr, 10);
        if (isNaN(hours) || isNaN(minutes)) return;

        const [yStr, moStr, dStr] = dateKey.split('-');
        const year = parseInt(yStr, 10);
        const month = parseInt(moStr, 10) - 1; // JS months are 0-based
        const day = parseInt(dStr, 10);

        const now = Date.now();
        const eventMs = new Date(year, month, day, hours, minutes, 0, 0).getTime();
        const reminderMs = eventMs - 15 * 60 * 1000; // 15 minutes before

        // Schedule the 15-min-before reminder
        if (reminderMs > now) {
            this._set(
                `reminder-${dateKey}-${timeStr}-${task}`,
                reminderMs - now,
                () => this._fire(`⏰ In 15 min: ${task}`, `${timeStr} — ${this._dateLabel(dateKey)}`)
            );
        }

        // Schedule the on-time notification
        if (eventMs > now) {
            this._set(
                `event-${dateKey}-${timeStr}-${task}`,
                eventMs - now,
                () => this._fire(`🔔 Starting now: ${task}`, `${this._dateLabel(dateKey)}`)
            );
        }
    }

    /** Cancel all timers associated with a specific event */
    static cancelNotification(task: string, timeStr: string, dateKey: string) {
        this._cancel(`reminder-${dateKey}-${timeStr}-${task}`);
        this._cancel(`event-${dateKey}-${timeStr}-${task}`);
    }

    /** Cancel every pending timer (e.g. on sign-out) */
    static cancelAllNotifications() {
        this.pendingTimers.forEach(id => clearTimeout(id));
        this.pendingTimers.clear();
    }

    // ── private helpers ────────────────────────────────────────────────────────

    private static _set(key: string, delayMs: number, fn: () => void) {
        this._cancel(key);
        const id = setTimeout(() => {
            fn();
            this.pendingTimers.delete(key);
        }, delayMs);
        this.pendingTimers.set(key, id);
    }

    private static _cancel(key: string) {
        const existing = this.pendingTimers.get(key);
        if (existing !== undefined) {
            clearTimeout(existing);
            this.pendingTimers.delete(key);
        }
    }

    private static _fire(title: string, body: string) {
        if (Notification.permission !== 'granted') return;
        new Notification(title, {
            body,
            icon: '/favicon.png',
            badge: '/favicon.png',
            tag: `stratabin-${title}`,
            requireInteraction: true,
        });
    }

    private static _dateLabel(dateKey: string): string {
        const [y, m, d] = dateKey.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        const todayStr = new Date().toDateString();
        if (date.toDateString() === todayStr) return 'Today';
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
        return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    }
}
