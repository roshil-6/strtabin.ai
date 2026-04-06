// Time constants
export const ONE_DAY = 24 * 60 * 60 * 1000;
export const ONE_WEEK = 7 * ONE_DAY;

// Storage
export const STORAGE_KEY = 'strategy-box-storage';
export const LEGACY_STORAGE_KEY = 'startergy-box-storage';
/** Backup of local projects before sign-up; restored when main storage is empty after auth */
export const GUEST_DATA_BACKUP_KEY = 'strategy-box-guest-backup';

// Pro AI limit — prompts per day (resets at midnight UTC) for signed-in users
export const PRO_AI_DAILY_LIMIT = 12;
const PRO_AI_DAILY_KEY_PREFIX = 'pro-ai-daily-';

function getTodayKey(): string {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function getProAiRemaining(userId: string): number {
    const key = PRO_AI_DAILY_KEY_PREFIX + userId;
    const raw = localStorage.getItem(key);
    if (!raw) return PRO_AI_DAILY_LIMIT;
    try {
        const { date, count } = JSON.parse(raw) as { date: string; count: number };
        if (date !== getTodayKey()) return PRO_AI_DAILY_LIMIT;
        return Math.max(0, PRO_AI_DAILY_LIMIT - count);
    } catch {
        return PRO_AI_DAILY_LIMIT;
    }
}

export function consumeProAiMessage(userId: string): boolean {
    const remaining = getProAiRemaining(userId);
    if (remaining <= 0) return false;
    const key = PRO_AI_DAILY_KEY_PREFIX + userId;
    const today = getTodayKey();
    const raw = localStorage.getItem(key);
    let count = 0;
    if (raw) {
        try {
            const parsed = JSON.parse(raw) as { date: string; count: number };
            if (parsed.date === today) count = parsed.count;
        } catch { /* ignore */ }
    }
    localStorage.setItem(key, JSON.stringify({ date: today, count: count + 1 }));
    return true;
}

export function refundProAiMessage(userId: string): void {
    const key = PRO_AI_DAILY_KEY_PREFIX + userId;
    const today = getTodayKey();
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
        const parsed = JSON.parse(raw) as { date: string; count: number };
        if (parsed.date === today && parsed.count > 0) {
            localStorage.setItem(key, JSON.stringify({ date: today, count: parsed.count - 1 }));
        }
    } catch { /* ignore */ }
}

// API — build-time URL. For mobile (Capacitor): set VITE_API_URL to your deployed backend when building.
const _apiUrl = import.meta.env.VITE_API_URL;
if (!_apiUrl && import.meta.env.PROD) {
  console.warn('⚠️  VITE_API_URL not set. AI may not work. Set it when building for production/mobile.');
}
export const API_BASE_URL = _apiUrl || 'http://localhost:3001';
