import { qGet } from '../db/driver.js';
export const SASHA_TEXT_MODEL = 'gemini-3.8-flash';
export const SASHA_VOICE_MODEL = 'gemini-3.8-live';
export const SASHA_LIMITS = { chat: 30, voice: 3 };
export async function sashaAccess(req) {
    // Clerk publicMetadata is writable by the server/dashboard, never by a user.
    const grant = req.clerkUser?.publicMetadata?.sashaPro === true;
    const paid = await qGet("SELECT paid_until FROM billing_subscriptions WHERE user_id = ? AND mode = 'live'", [req.userId]);
    return { pro: grant || Number(paid?.paid_until || 0) * 1000 > Date.now(), configured: Boolean(process.env.GEMINI_API_KEY?.trim()) };
}
export async function reserveSashaUsage(userId, kind) {
    const day = new Date().toISOString().slice(0, 10);
    const row = await qGet(`INSERT INTO assistant_usage (user_id, day_key, kind, used) VALUES (?, ?, ?, 1)
        ON CONFLICT (user_id, day_key, kind) DO UPDATE SET used = assistant_usage.used + 1
        WHERE assistant_usage.used < ? RETURNING used`, [userId, day, kind, SASHA_LIMITS[kind]]);
    return Boolean(row);
}
