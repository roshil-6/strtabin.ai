import { qGet, qAll } from '../db/driver.js';
export const SASHA_TEXT_MODEL = 'gemini-3.5-flash-lite';
export const SASHA_VOICE_MODEL = 'gemini-3.8-live';
export const SASHA_LIMITS = { chat: 10, voice: 10 };
export async function sashaAccess(req) {
    // Clerk publicMetadata is writable by the server/dashboard, never by a user.
    const grant = req.clerkUser?.publicMetadata?.sashaPro === true;
    const paid = await qGet("SELECT paid_until FROM billing_subscriptions WHERE user_id = ? AND mode = 'live'", [req.userId]);
    return { pro: grant || Number(paid?.paid_until || 0) * 1000 > Date.now(), configured: Boolean(process.env.GEMINI_API_KEY?.trim()) };
}
const today = () => new Date().toISOString().slice(0, 10);
/** Remaining daily allowance per kind, so the UI can show what is left. */
export async function sashaRemaining(userId) {
    const rows = await qAll('SELECT kind, used FROM assistant_usage WHERE user_id = ? AND day_key = ?', [userId, today()]);
    const used = Object.fromEntries(rows.map(row => [row.kind, Number(row.used) || 0]));
    return { chat: Math.max(0, SASHA_LIMITS.chat - (used.chat || 0)), voice: Math.max(0, SASHA_LIMITS.voice - (used.voice || 0)) };
}
/** Returns the new used count, or 0 when the daily allowance is spent. */
export async function reserveSashaUsage(userId, kind) {
    const day = today();
    const row = await qGet(`INSERT INTO assistant_usage (user_id, day_key, kind, used) VALUES (?, ?, ?, 1)
        ON CONFLICT (user_id, day_key, kind) DO UPDATE SET used = assistant_usage.used + 1
        WHERE assistant_usage.used < ? RETURNING used`, [userId, day, kind, SASHA_LIMITS[kind]]);
    return row ? Number(row.used) : 0;
}
