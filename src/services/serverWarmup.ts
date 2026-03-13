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
        // Mark ready immediately so the UI is never blocked.
        // Then silently warm the server in the background.
        this.markReady();
        this.warmInBackground();
    }

    /**
     * Silent background warm-up — pings the server up to 12 times with
     * shorter intervals to wake cold-started Render faster.
     */
    private async warmInBackground(attempts = 0) {
        const MAX_ATTEMPTS = 12;
        const RETRY_MS = Math.min(2000 + attempts * 1500, 12000);

        const ok = await this.checkReachable();
        if (ok || attempts >= MAX_ATTEMPTS) return;

        setTimeout(() => this.warmInBackground(attempts + 1), RETRY_MS);
    }

    /**
     * Ping the health endpoint.  With the CORP header fixed on the server
     * (crossOriginResourcePolicy: cross-origin via Helmet), this plain fetch
     * now resolves normally.  Fallback: treat any non-connection error as alive.
     */
    private async checkReachable() {
        try {
            const res = await fetch(`${API_BASE_URL}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(8000),
            });
            // Any non-5xx response means the server is up
            return res.status < 500;
        } catch {
            return false;
        }
    }

    private markReady() {
        if (this.ready) return;
        this.ready = true;
        this.listeners.forEach(cb => cb());
        this.listeners = [];
        // Keep the server warm with a ping every 5 min (reduces cold starts)
        this.keepAliveTimer = setInterval(() => {
            this.checkReachable().catch(() => {});
        }, 5 * 60 * 1000);
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
