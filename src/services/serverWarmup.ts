import { API_BASE_URL } from '../constants';

/**
 * Singleton that keeps the Render backend warm.
 *
 * - Fires immediately when `start()` is called (on user sign-in).
 * - Retries every 4 s until the server responds, up to 90 s total.
 * - Exposes `isReady` and an `onReady` callback list so UI can react.
 * - Runs a keep-alive ping every 10 min to prevent the server sleeping again.
 */
class ServerWarmup {
    private ready = false;
    private started = false;
    private listeners: Array<() => void> = [];
    private keepAliveTimer: ReturnType<typeof setInterval> | null = null;

    get isReady() {
        return this.ready;
    }

    /** Subscribe to the "server is ready" event. Fires immediately if already ready. */
    onReady(cb: () => void) {
        if (this.ready) {
            cb();
        } else {
            this.listeners.push(cb);
        }
        return () => {
            this.listeners = this.listeners.filter(l => l !== cb);
        };
    }

    /** Call once when the user is authenticated. Idempotent. */
    start() {
        if (this.started) return;
        this.started = true;
        this.ping();
    }

    private async ping(attempts = 0) {
        const MAX_ATTEMPTS = 22; // ~90 s at 4 s intervals
        const RETRY_MS = 4000;

        try {
            const res = await fetch(`${API_BASE_URL}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000),
            });
            if (res.ok) {
                this.markReady();
                return;
            }
        } catch {
            // server still sleeping — retry
        }

        if (attempts < MAX_ATTEMPTS) {
            setTimeout(() => this.ping(attempts + 1), RETRY_MS);
        }
        // If we exhausted attempts, we mark ready anyway so the UI isn't stuck forever
        if (attempts >= MAX_ATTEMPTS) {
            this.markReady();
        }
    }

    private markReady() {
        if (this.ready) return;
        this.ready = true;
        this.listeners.forEach(cb => cb());
        this.listeners = [];
        // Keep the server warm with a ping every 10 min
        this.keepAliveTimer = setInterval(() => {
            fetch(`${API_BASE_URL}/health`, { method: 'GET' }).catch(() => {});
        }, 10 * 60 * 1000);
    }

    /** Reset (e.g. on sign-out) */
    reset() {
        this.ready = false;
        this.started = false;
        if (this.keepAliveTimer) {
            clearInterval(this.keepAliveTimer);
            this.keepAliveTimer = null;
        }
    }
}

export const serverWarmup = new ServerWarmup();
