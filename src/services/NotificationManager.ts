import toast from 'react-hot-toast';

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

    private static sessionEnabled: boolean | null = null;
    private static preferenceKey = 'stratabin-reminders-enabled';

    static get hasPermission(): boolean {
        return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
    }

    static get enabled(): boolean {
        if (this.sessionEnabled !== null) return this.sessionEnabled;
        try { const value = localStorage.getItem(this.preferenceKey); if (value !== null) return value === 'true'; } catch { /* Session-only preference when storage is blocked. */ }
        return this.sessionEnabled ?? this.hasPermission;
    }

    static get mode(): 'off' | 'browser' | 'in-app' {
        return !this.enabled ? 'off' : this.hasPermission ? 'browser' : 'in-app';
    }

    /** Only call from an explicit user action; blocked APIs must never reject the action. */
    static async requestPermission(): Promise<boolean> {
        if (typeof window === 'undefined' || !('Notification' in window) || !window.isSecureContext) return false;
        if (Notification.permission === 'granted') return true;
        if (Notification.permission === 'denied') return false;
        try { return await Notification.requestPermission() === 'granted'; } catch { return false; }
    }

    static async enableReminders(): Promise<'browser' | 'in-app'> {
        this.sessionEnabled = true;
        try { localStorage.setItem(this.preferenceKey, 'true'); } catch { /* Keep reminders enabled for this session. */ }
        await this.requestPermission();
        return this.hasPermission ? 'browser' : 'in-app';
    }

    static disableReminders() {
        this.sessionEnabled = false;
        try { localStorage.setItem(this.preferenceKey, 'false'); } catch { /* The session setting still applies. */ }
        this.cancelAllNotifications();
    }

    /**
     * Schedule a browser notification for the given event.
     * @param task    Event title
     * @param timeStr HH:MM string (24-hour). "All Day" and unparseable values are ignored.
     * @param dateKey YYYY-MM-DD string for the event date
     */
    static scheduleNotification(task: string, timeStr: string, dateKey: string, eventKey?: string) {
        // Replace both timers even if the new date is past, invalid, or all-day.
        this.cancelNotification(task, timeStr, dateKey, eventKey);
        if (!this.enabled || !timeStr || timeStr === 'All Day' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;

        const [hStr, mStr] = timeStr.split(':');
        const hours = parseInt(hStr, 10);
        const minutes = parseInt(mStr, 10);
        if (!/^\d{2}:\d{2}$/.test(timeStr) || isNaN(hours) || isNaN(minutes) || hours > 23 || minutes > 59) return;

        const [yStr, moStr, dStr] = dateKey.split('-');
        const year = parseInt(yStr, 10);
        const month = parseInt(moStr, 10) - 1; // JS months are 0-based
        const day = parseInt(dStr, 10);

        const key = eventKey || JSON.stringify([dateKey, timeStr, task]);
        const now = Date.now();
        const eventMs = new Date(year, month, day, hours, minutes, 0, 0).getTime();
        const date = new Date(eventMs);
        if (!Number.isFinite(eventMs) || date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return;
        const reminderMs = eventMs - 15 * 60 * 1000; // 15 minutes before

        // Schedule the 15-min-before reminder
        if (reminderMs > now) {
            this._set(
                `reminder-${key}`,
                reminderMs - now,
                () => this._fire(`⏰ In 15 min: ${task}`, `${timeStr} — ${this._dateLabel(dateKey)}`, `reminder-${key}`)
            );
        }

        // Schedule the on-time notification
        if (eventMs > now) {
            this._set(
                `event-${key}`,
                eventMs - now,
                () => this._fire(`🔔 Starting now: ${task}`, `${this._dateLabel(dateKey)}`, `event-${key}`)
            );
        }
    }

    /** Cancel all timers associated with a specific event */
    static cancelNotification(task: string, timeStr: string, dateKey: string, eventKey?: string) {
        const key = eventKey || JSON.stringify([dateKey, timeStr, task]);
        this._cancel(`reminder-${key}`);
        this._cancel(`event-${key}`);
    }

    /** Cancel every pending timer (e.g. on sign-out) */
    static cancelAllNotifications() {
        this.pendingTimers.forEach(id => clearTimeout(id));
        this.pendingTimers.clear();
    }

    // ── private helpers ────────────────────────────────────────────────────────

    private static _set(key: string, delayMs: number, fn: () => void) {
        this._cancel(key);
        const due = Date.now() + delayMs;
        const arm = () => {
            const remaining = due - Date.now();
            if (remaining <= 0) { this.pendingTimers.delete(key); fn(); return; }
            const id = setTimeout(arm, Math.min(remaining, 2_147_000_000));
            this.pendingTimers.set(key, id);
        };
        arm();
    }

    private static _cancel(key: string) {
        const existing = this.pendingTimers.get(key);
        if (existing !== undefined) {
            clearTimeout(existing);
            this.pendingTimers.delete(key);
        }
    }

    private static _fire(title: string, body: string, eventKey: string) {
        if (!this.enabled) return;
        if (this.hasPermission) {
            try { new Notification(title, { body, icon: '/stratabin-icon.svg', tag: `stratabin-${eventKey}` }); return; }
            catch { /* Some mobile/embedded browsers expose permission but cannot construct notifications. */ }
        }
        toast(`${title}\n${body}`, { duration: 12000, icon: '🔔', id: eventKey });
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
