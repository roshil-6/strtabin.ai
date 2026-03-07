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
        const MAX_ATTEMPTS = 12; // ~90s with backoff below
        const RETRY_MS = Math.min(3000 + attempts * 1000, 10000);

        const isReachable = await this.checkReachable();
        if (isReachable) {
            this.markReady();
            return;
        }

        if (attempts < MAX_ATTEMPTS) {
            setTimeout(() => this.ping(attempts + 1), RETRY_MS);
            return;
        }

        // Never block the app forever on warmup failures.
        this.markReady();
    }

    /**
     * Consider backend "reachable" if:
     * - /health returns 2xx (ideal path), OR
     * - / returns any non-5xx status (older backends may not expose /health)
     */
    private async checkReachable() {
        try {
            const healthRes = await fetch(`${API_BASE_URL}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000),
            });
            if (healthRes.ok) return true;
            // 401/403/404 means server responded; only route/auth is different
            if (healthRes.status > 0 && healthRes.status < 500) return true;
        } catch {
            // Continue to root fallback
        }

        try {
            const rootRes = await fetch(`${API_BASE_URL}/`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000),
            });
            if (rootRes.status > 0 && rootRes.status < 500) return true;
        } catch {
            // unreachable
        }

        return false;
    }

    private markReady() {
        if (this.ready) return;
        this.ready = true;
        this.listeners.forEach(cb => cb());
        this.listeners = [];
        // Keep the server warm with a ping every 10 min
        this.keepAliveTimer = setInterval(() => {
            this.checkReachable().catch(() => {});
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
