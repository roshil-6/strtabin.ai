/**
 * Express middleware: verified Clerk JWT → req.userId (internal), req.clerkUser, req.clerkUserId
 */

import { resolveBearerToClerkUser } from '../lib/clerkAuth.js';
import { getOrCreateUser } from '../db/models.js';

export async function requireClerkAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: no token provided.' });
    }
    const token = authHeader.slice(7).trim();
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: empty token.' });
    }

    const clerk = req.app.locals?.clerk;
    if (!clerk) {
        return res.status(503).json({ error: 'Auth service not configured.' });
    }

    try {
        const { clerkUser, clerkId } = await resolveBearerToClerkUser(token, clerk);
        req.clerkUser = clerkUser;
        req.clerkUserId = clerkId;
        req.userId = getOrCreateUser(clerkUser);
        next();
    } catch (err) {
        if (err?.code === 'AUTH_NOT_CONFIGURED') {
            return res.status(503).json({ error: 'Auth service not configured.' });
        }
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
}
