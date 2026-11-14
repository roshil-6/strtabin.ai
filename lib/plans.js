import { qGet } from '../db/driver.js';
import { getClerkUserCached } from './clerkUserCache.js';

/**
 * Free accounts can try every Pro feature with a small allowance:
 * - Sasha: a few lifetime chat and voice credits (see SASHA_TRIAL in sashaAccess.js).
 * - Teams: one team with one shared project, fully editable for 24 hours after the team is created.
 * Teams owned by a Pro account have no trial limits, for every member.
 */
export const TEAM_TRIAL = { hours: 24, projects: 1, teams: 1 };

/** Pro = an active paid subscription, or a grant in Clerk publicMetadata (server/dashboard only, never user-writable). */
export async function isUserPro(userId, { clerkUser, clerk } = {}) {
    const paid = await qGet("SELECT paid_until FROM billing_subscriptions WHERE user_id = ? AND mode = 'live'", [userId]);
    if (Number(paid?.paid_until || 0) * 1000 > Date.now()) return true;
    let user = clerkUser;
    if (!user && clerk?.users?.getUser) {
        const row = await qGet('SELECT clerk_user_id FROM users WHERE id = ?', [userId]);
        if (row?.clerk_user_id) user = await getClerkUserCached(clerk, row.clerk_user_id).catch(() => null);
    }
    return user?.publicMetadata?.sashaPro === true;
}

/** SQLite returns "YYYY-MM-DD HH:MM:SS" in UTC; Postgres returns a Date. */
export function dbTimeMs(value) {
    if (value instanceof Date) return value.getTime();
    if (typeof value !== 'string' || !value) return Date.now();
    const iso = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value.replace(' ', 'T')}Z`;
    const ms = Date.parse(iso);
    return Number.isFinite(ms) ? ms : Date.now();
}

/** The plan a team runs on. Only team workspaces have trial limits. */
export async function teamPlan(ws, req = {}) {
    if (!ws || ws.type !== 'team') return { pro: true, trial: false };
    const ownerIsViewer = ws.owner_id === req.userId;
    const pro = await isUserPro(ws.owner_id, { clerkUser: ownerIsViewer ? req.clerkUser : undefined, clerk: req.app?.locals?.clerk });
    if (pro) return { pro: true, trial: false };
    const endsAt = dbTimeMs(ws.created_at) + TEAM_TRIAL.hours * 3600_000;
    return { pro: false, trial: true, trialEndsAt: new Date(endsAt).toISOString(), expired: Date.now() >= endsAt, projectLimit: TEAM_TRIAL.projects, ownerIsViewer };
}

export const TEAM_TRIAL_ENDED = {
    error: "This team's free 24-hour trial has ended. Everything stays visible. The team owner can upgrade to Pro to keep working together.",
    code: 'TEAM_TRIAL_ENDED',
};
