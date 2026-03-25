/**
 * Clerk session JWT verification (signature + expiry).
 * Replaces decode-only Bearer handling which allowed forged `sub` claims.
 */

import { verifyToken } from '@clerk/backend';
import { getClerkUserCached } from './clerkUserCache.js';

function getSecretKey() {
    return process.env.CLERK_SECRET_KEY || '';
}

/**
 * @param {string} token
 * @param {{ users: { getUser: (id: string) => Promise<unknown> } } | null | undefined} clerk
 * @returns {Promise<{ clerkId: string, clerkUser: unknown, payload: Record<string, unknown> }>}
 */
export async function resolveBearerToClerkUser(token, clerk) {
    const secretKey = getSecretKey();
    if (!clerk || !secretKey) {
        const e = new Error('Auth not configured');
        e.code = 'AUTH_NOT_CONFIGURED';
        throw e;
    }
    const t = String(token || '').trim();
    if (!t) {
        const e = new Error('Missing token');
        e.code = 'MISSING_TOKEN';
        throw e;
    }
    const payload = await verifyToken(t, { secretKey });
    const clerkId = payload?.sub;
    if (!clerkId || typeof clerkId !== 'string') {
        const e = new Error('Invalid token');
        e.code = 'INVALID_TOKEN';
        throw e;
    }
    const clerkUser = await getClerkUserCached(clerk, clerkId);
    return { clerkId, clerkUser, payload };
}

/**
 * Verify Bearer JWT only; returns Clerk `sub` or null.
 * Used for optional auth blocks (e.g. profile viewer) and rate-limit keys.
 */
export async function verifyBearerSub(token) {
    const secretKey = getSecretKey();
    if (!secretKey) return null;
    try {
        const payload = await verifyToken(String(token || '').trim(), { secretKey });
        return typeof payload?.sub === 'string' ? payload.sub : null;
    } catch {
        return null;
    }
}
