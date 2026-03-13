// Time constants
export const ONE_DAY = 24 * 60 * 60 * 1000;
export const ONE_WEEK = 7 * ONE_DAY;

// Storage
export const STORAGE_KEY = 'strategy-box-storage';
export const LEGACY_STORAGE_KEY = 'startergy-box-storage';

// External links
export const RAZORPAY_LINK = 'https://rzp.io/rzp/vxWpvWM';

// Guest AI limit — 2 messages total before upgrade
export const GUEST_AI_LIMIT = 2;
export const GUEST_AI_COUNT_KEY = 'guest-ai-count';

export function getGuestAiRemaining(): number {
    const raw = localStorage.getItem(GUEST_AI_COUNT_KEY);
    const used = raw ? parseInt(raw, 10) : 0;
    return Math.max(0, GUEST_AI_LIMIT - used);
}

export function consumeGuestAiMessage(): boolean {
    const raw = localStorage.getItem(GUEST_AI_COUNT_KEY);
    const used = raw ? parseInt(raw, 10) : 0;
    if (used >= GUEST_AI_LIMIT) return false;
    localStorage.setItem(GUEST_AI_COUNT_KEY, String(used + 1));
    return true;
}

export function refundGuestAiMessage(): void {
    const raw = localStorage.getItem(GUEST_AI_COUNT_KEY);
    const used = raw ? parseInt(raw, 10) : 0;
    if (used > 0) localStorage.setItem(GUEST_AI_COUNT_KEY, String(used - 1));
}

// API
const _apiUrl = import.meta.env.VITE_API_URL;
if (!_apiUrl && import.meta.env.PROD) {
  console.error(
    '⚠️  VITE_API_URL is not set. AI features will not work. Add it to your Vercel environment variables.'
  );
}
export const API_BASE_URL = _apiUrl || 'http://localhost:3001';
