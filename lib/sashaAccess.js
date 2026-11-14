import { qGet, qAll } from '../db/driver.js';
import { isUserPro } from './plans.js';
export const SASHA_TEXT_MODEL = 'gemini-3.5-flash-lite';
export const SASHA_VOICE_MODEL = 'gemini-3.8-live';
/** Pro: daily allowance that resets at midnight UTC. */
export const SASHA_LIMITS = { chat: 10, voice: 10 };
/** Free: a one-time trial so anyone can try Sasha before upgrading. Reports and screenshot reading use chat credits. */
export const SASHA_TRIAL = { chat: 2, voice: 2 };
const TRIAL_KEY = 'trial';

export async function sashaAccess(req) {
    // Clerk publicMetadata is writable by the server/dashboard, never by a user.
    const pro = await isUserPro(req.userId, { clerkUser: req.clerkUser });
    return { pro, trial: !pro, configured: Boolean(process.env.GEMINI_API_KEY?.trim()) };
}
const today = () => new Date().toISOString().slice(0, 10);
export const sashaLimits = pro => pro ? SASHA_LIMITS : SASHA_TRIAL;

/** Remaining allowance per kind (today's for Pro, the one-time trial for Free), so the UI can show what is left. */
export async function sashaRemaining(userId, pro = true) {
    const limits = sashaLimits(pro);
    const rows = await qAll('SELECT kind, used FROM assistant_usage WHERE user_id = ? AND day_key = ?', [userId, pro ? today() : TRIAL_KEY]);
    const used = Object.fromEntries(rows.map(row => [row.kind, Number(row.used) || 0]));
    return { chat: Math.max(0, limits.chat - (used.chat || 0)), voice: Math.max(0, limits.voice - (used.voice || 0)) };
}
/** Returns the new used count, or 0 when the allowance is spent. */
export async function reserveSashaUsage(userId, kind, pro = true) {
    const row = await qGet(`INSERT INTO assistant_usage (user_id, day_key, kind, used) VALUES (?, ?, ?, 1)
        ON CONFLICT (user_id, day_key, kind) DO UPDATE SET used = assistant_usage.used + 1
        WHERE assistant_usage.used < ? RETURNING used`, [userId, pro ? today() : TRIAL_KEY, kind, sashaLimits(pro)[kind]]);
    return row ? Number(row.used) : 0;
}
