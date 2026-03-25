/**
 * Short-lived in-memory cache for Clerk users.getUser() to cut API churn on every request.
 * Invalidate after metadata/profile updates so paid flags and usernames stay fresh.
 *
 * CLERK_USER_CACHE_TTL_MS — default 120000 (2 min)
 * CLERK_USER_CACHE_MAX — default 5000 entries (LRU-style trim on set)
 */

const TTL_MS = Math.max(10_000, Number(process.env.CLERK_USER_CACHE_TTL_MS || 120_000));
const MAX_ENTRIES = Math.max(100, Number(process.env.CLERK_USER_CACHE_MAX || 5000));

/** @type {Map<string, { user: unknown, expires: number }>} */
const cache = new Map();

function trimIfNeeded() {
    if (cache.size <= MAX_ENTRIES) return;
    const now = Date.now();
    for (const [k, v] of cache) {
        if (v.expires <= now) cache.delete(k);
        if (cache.size <= MAX_ENTRIES * 0.8) break;
    }
    if (cache.size > MAX_ENTRIES) {
        const keys = [...cache.keys()].slice(0, cache.size - MAX_ENTRIES);
        for (const k of keys) cache.delete(k);
    }
}

/**
 * @param {{ users: { getUser: (id: string) => Promise<unknown> } } | null | undefined} clerk
 * @param {string} clerkId
 */
export async function getClerkUserCached(clerk, clerkId) {
    if (!clerk || !clerkId) {
        throw new Error('Missing Clerk client or user id.');
    }
    const now = Date.now();
    const hit = cache.get(clerkId);
    if (hit && hit.expires > now) {
        return hit.user;
    }
    const user = await clerk.users.getUser(clerkId);
    trimIfNeeded();
    cache.set(clerkId, { user, expires: now + TTL_MS });
    return user;
}

/** Call after updateUser, updateUserMetadata, etc. */
export function invalidateClerkUserCache(clerkId) {
    if (clerkId) cache.delete(clerkId);
}

export function clearClerkUserCache() {
    cache.clear();
}
