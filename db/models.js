/**
 * Database models and helpers for Social + Team Workspace System
 */

import crypto from 'crypto';
import { qAll, qGet, qRun, isPostgres, nowSql, ifNull, dayKey } from './driver.js';

// ─── User sync from Clerk ─────────────────────────────────────────────────
export async function getOrCreateUser(clerkUser) {
    const clerkId = clerkUser.id;
    const email = clerkUser.emailAddresses?.[0]?.emailAddress || null;
    const username = clerkUser.username || clerkUser.firstName || null;

    let row = await qGet('SELECT * FROM users WHERE clerk_user_id = ?', [clerkId]);
    if (row) {
        const n = nowSql();
        await qRun(
            `UPDATE users SET username = COALESCE(?, username), email = COALESCE(?, email), updated_at = ${n} WHERE id = ?`,
            [username || null, email || null, row.id]
        );
        return row.id;
    }

    const result = await qRun(
        'INSERT INTO users (clerk_user_id, username, email) VALUES (?, ?, ?) RETURNING id',
        [clerkId, username || null, email || null]
    );
    const userId = result.lastInsertRowid;

    await qRun('INSERT INTO profiles (user_id) VALUES (?)', [userId]);
    return userId;
}

export async function getUserByClerkId(clerkId) {
    return qGet('SELECT * FROM users WHERE clerk_user_id = ?', [clerkId]);
}

export async function getUserById(id) {
    return qGet('SELECT * FROM users WHERE id = ?', [id]);
}

export async function getUserByUsername(username) {
    if (!username) return null;
    return qGet('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', [username]);
}

export async function getUserByEmail(email) {
    if (!email) return null;
    const norm = String(email).trim().toLowerCase();
    return qGet('SELECT * FROM users WHERE LOWER(email) = ?', [norm]);
}

export async function getUserByIdOrUsername(idOrUsername) {
    const byId = await qGet('SELECT * FROM users WHERE id = ?', [parseInt(idOrUsername, 10)]);
    if (byId) return byId;
    return qGet('SELECT * FROM users WHERE username = ?', [idOrUsername]);
}

// ─── Profile ───────────────────────────────────────────────────────────────
export async function getProfile(userId) {
    return qGet('SELECT * FROM profiles WHERE user_id = ?', [userId]);
}

export async function updateProfile(userId, { bio }) {
    const n = nowSql();
    if (isPostgres()) {
        await qRun(
            `INSERT INTO profiles (user_id, bio, updated_at) VALUES (?, ?, ${n})
             ON CONFLICT (user_id) DO UPDATE SET bio = EXCLUDED.bio, updated_at = EXCLUDED.updated_at`,
            [userId, bio || null]
        );
    } else {
        await qRun(
            `INSERT INTO profiles (user_id, bio, updated_at) VALUES (?, ?, ${n})
             ON CONFLICT(user_id) DO UPDATE SET bio = excluded.bio, updated_at = excluded.updated_at`,
            [userId, bio || null]
        );
    }
}

// ─── Workspaces ────────────────────────────────────────────────────────────
export async function createWorkspace({ name, type, ownerId, visibility = 'private' }) {
    const result = await qRun(
        'INSERT INTO workspaces (name, type, owner_id, visibility) VALUES (?, ?, ?, ?) RETURNING id',
        [name, type, ownerId, visibility]
    );
    const id = result.lastInsertRowid;
    await qRun('INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)', [id, ownerId, 'admin']);
    return id;
}

export async function getWorkspace(id) {
    return qGet('SELECT * FROM workspaces WHERE id = ?', [id]);
}

/** Cheap fingerprint for polling: any change to workspace, members, projects, activity, tasks, or team canvases bumps `revision`. */
export async function getWorkspaceRevision(workspaceId) {
    const row = await qGet(
        `
        SELECT
            w.updated_at AS w_u,
            (SELECT COUNT(*) FROM workspace_members wm WHERE wm.workspace_id = w.id) AS member_count,
            (SELECT ${ifNull('MAX(p.updated_at)', "''")} FROM projects p WHERE p.workspace_id = w.id) AS p_max,
            (SELECT ${ifNull('MAX(al.created_at)', "''")} FROM activity_logs al WHERE al.workspace_id = w.id) AS a_max,
            (SELECT ${ifNull('MAX(wm.joined_at)', "''")} FROM workspace_members wm WHERE wm.workspace_id = w.id) AS m_max,
            (SELECT ${ifNull('MAX(mdt.updated_at)', "''")} FROM member_daily_tasks mdt WHERE mdt.workspace_id = w.id) AS t_max,
            (SELECT ${ifNull('MAX(pc.updated_at)', "''")} FROM project_canvases pc
                INNER JOIN projects pj ON pj.id = pc.project_id WHERE pj.workspace_id = w.id) AS c_max
        FROM workspaces w WHERE w.id = ?
    `,
        [workspaceId]
    );
    if (!row) return null;
    const revision = `${row.w_u}|${row.member_count}|${row.p_max}|${row.a_max}|${row.m_max}|${row.t_max}|${row.c_max}`;
    return { revision };
}

export async function updateWorkspace(id, { name, visibility }) {
    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (visibility !== undefined) { updates.push('visibility = ?'); params.push(visibility); }
    if (updates.length === 0) return;
    updates.push(`updated_at = ${nowSql()}`);
    params.push(id);
    await qRun(`UPDATE workspaces SET ${updates.join(', ')} WHERE id = ?`, params);
}

export async function getWorkspacesForUser(userId) {
    return qAll(
        `
        SELECT w.*, wm.role
        FROM workspaces w
        JOIN workspace_members wm ON wm.workspace_id = w.id
        WHERE wm.user_id = ?
        ORDER BY w.updated_at DESC
    `,
        [userId]
    );
}

export async function hasWorkspaceAccess(userId, workspaceId, minRole = 'member') {
    const ws = await getWorkspace(workspaceId);
    if (!ws) return false;
    if (ws.owner_id === userId) return true;
    const member = await qGet('SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?', [workspaceId, userId]);
    if (!member) return false;
    return minRole === 'member' || member.role === 'admin';
}

export async function canManageMembers(userId, workspaceId) {
    return hasWorkspaceAccess(userId, workspaceId, 'admin');
}

// ─── Invitations ───────────────────────────────────────────────────────────
export async function createInvitation({ workspaceId, inviterId, inviteeEmail, inviteeUserId }) {
    const token = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
    const emailNorm = inviteeEmail ? inviteeEmail.trim().toLowerCase() : null;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const result = await qRun(
        `
        INSERT INTO invitations (workspace_id, inviter_id, invitee_email, invitee_email_normalized, invitee_user_id, token, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id
    `,
        [workspaceId, inviterId, inviteeEmail || null, emailNorm, inviteeUserId || null, token, expiresAt]
    );
    return result.lastInsertRowid;
}

export async function getInvitationsForUser(userId) {
    const user = await getUserById(userId);
    if (!user) return [];
    const emailNorm = user.email ? user.email.trim().toLowerCase() : null;
    const expOk = isPostgres()
        ? '(i.expires_at IS NULL OR i.expires_at > NOW())'
        : "(i.expires_at IS NULL OR i.expires_at > datetime('now'))";

    if (emailNorm) {
        return qAll(
            `
            SELECT i.*, w.name as workspace_name, u.username as inviter_username
            FROM invitations i
            JOIN workspaces w ON w.id = i.workspace_id
            JOIN users u ON u.id = i.inviter_id
            WHERE (i.invitee_user_id = ? OR i.invitee_email_normalized = ?) AND i.status = 'pending'
            AND ${expOk}
            ORDER BY i.created_at DESC
        `,
            [userId, emailNorm]
        );
    }
    return qAll(
        `
        SELECT i.*, w.name as workspace_name, u.username as inviter_username
        FROM invitations i
        JOIN workspaces w ON w.id = i.workspace_id
        JOIN users u ON u.id = i.inviter_id
        WHERE i.invitee_user_id = ? AND i.status = 'pending'
        AND ${expOk}
        ORDER BY i.created_at DESC
    `,
        [userId]
    );
}

export async function acceptInvitation(userId, invitationId) {
    const inv = await qGet('SELECT * FROM invitations WHERE id = ? AND status = ?', [invitationId, 'pending']);
    if (!inv) return false;
    const user = await getUserById(userId);
    const emailNorm = user?.email?.trim().toLowerCase();
    const canAccept = inv.invitee_user_id === userId || inv.invitee_email_normalized === emailNorm;
    if (!canAccept) return false;

    await qRun('UPDATE invitations SET status = ? WHERE id = ?', ['accepted', invitationId]);
    if (isPostgres()) {
        await qRun(
            `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?) ON CONFLICT (workspace_id, user_id) DO NOTHING`,
            [inv.workspace_id, userId, 'member']
        );
    } else {
        await qRun('INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)', [
            inv.workspace_id,
            userId,
            'member',
        ]);
    }
    return true;
}

export async function rejectInvitation(userId, invitationId) {
    const inv = await qGet('SELECT * FROM invitations WHERE id = ? AND status = ?', [invitationId, 'pending']);
    if (!inv) return false;
    const user = await getUserById(userId);
    const emailNorm = user?.email?.trim().toLowerCase();
    const canReject = inv.invitee_user_id === userId || inv.invitee_email_normalized === emailNorm;
    if (!canReject) return false;
    await qRun('UPDATE invitations SET status = ? WHERE id = ?', ['rejected', invitationId]);
    return true;
}

/** Join workspace by ID (team workspaces only). Returns true if joined, false if already member or invalid. */
export async function joinWorkspaceById(workspaceId, userId) {
    const ws = await qGet('SELECT * FROM workspaces WHERE id = ?', [workspaceId]);
    if (!ws || ws.type !== 'team') return false;
    const existing = await qGet('SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?', [workspaceId, userId]);
    if (existing) return false;
    await qRun('INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)', [workspaceId, userId, 'member']);
    await qRun(`UPDATE workspaces SET updated_at = ${nowSql()} WHERE id = ?`, [workspaceId]);
    return true;
}

// ─── Projects ──────────────────────────────────────────────────────────────
export async function createProject({ workspaceId, title, description, status = 'idea', canvasId, assignedTo }) {
    const result = await qRun(
        `
        INSERT INTO projects (workspace_id, title, description, status, canvas_id, assigned_to) VALUES (?, ?, ?, ?, ?, ?) RETURNING id
    `,
        [workspaceId, title, description || null, status, canvasId || null, assignedTo || null]
    );
    return result.lastInsertRowid;
}

export async function getProject(id) {
    return qGet('SELECT * FROM projects WHERE id = ?', [id]);
}

export async function getProjectWithAssignee(id) {
    return qGet(
        `
        SELECT p.*, u.username as assigned_to_username
        FROM projects p
        LEFT JOIN users u ON u.id = p.assigned_to
        WHERE p.id = ?
    `,
        [id]
    );
}

export async function getProjectsForWorkspace(workspaceId) {
    return qAll(
        `
        SELECT p.*, u.username as assigned_to_username
        FROM projects p
        LEFT JOIN users u ON u.id = p.assigned_to
        WHERE p.workspace_id = ?
        ORDER BY p.updated_at DESC
    `,
        [workspaceId]
    );
}

export async function updateProjectStatus(projectId, status) {
    const n = nowSql();
    await qRun(`UPDATE projects SET status = ?, updated_at = ${n} WHERE id = ?`, [status, projectId]);
}

export async function updateProject(projectId, { title, description, status, assignedTo, canvasId }) {
    const updates = [];
    const params = [];
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (assignedTo !== undefined) { updates.push('assigned_to = ?'); params.push(assignedTo === null || assignedTo === '' ? null : assignedTo); }
    if (canvasId !== undefined) { updates.push('canvas_id = ?'); params.push(canvasId === null || canvasId === '' ? null : canvasId); }
    if (updates.length === 0) return;
    updates.push(`updated_at = ${nowSql()}`);
    params.push(projectId);
    await qRun(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, params);
}

export async function saveProjectCanvas(projectId, data) {
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
    const n = nowSql();
    if (isPostgres()) {
        await qRun(
            `INSERT INTO project_canvases (project_id, data, updated_at) VALUES (?, ?, ${n})
             ON CONFLICT (project_id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
            [projectId, dataStr]
        );
    } else {
        await qRun(`INSERT OR REPLACE INTO project_canvases (project_id, data, updated_at) VALUES (?, ?, ${n})`, [projectId, dataStr]);
    }
}

export async function getProjectCanvas(projectId) {
    return qGet('SELECT data, updated_at FROM project_canvases WHERE project_id = ?', [projectId]);
}

// ─── Activity logs ─────────────────────────────────────────────────────────
export async function getWorkspaceActivity(workspaceId, limit = 30) {
    return qAll(
        `
        SELECT al.*, u.username FROM activity_logs al
        JOIN users u ON u.id = al.user_id
        WHERE al.workspace_id = ? ORDER BY al.created_at DESC LIMIT ?
    `,
        [workspaceId, limit]
    );
}

export async function getProfileActivity(userId, limit = 20) {
    return qAll(
        `
        SELECT al.*, w.name as workspace_name, p.title as project_title
        FROM activity_logs al
        LEFT JOIN workspaces w ON w.id = al.workspace_id
        LEFT JOIN projects p ON p.id = al.project_id
        WHERE al.user_id = ? ORDER BY al.created_at DESC LIMIT ?
    `,
        [userId, limit]
    );
}

export async function getProfileProjects(userId, limit = 20) {
    return qAll(
        `
        SELECT p.*, w.name as workspace_name
        FROM projects p
        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = ?
        JOIN workspaces w ON w.id = p.workspace_id
        ORDER BY p.updated_at DESC LIMIT ?
    `,
        [userId, limit]
    );
}

export async function logActivity({ userId, workspaceId, projectId, action, entityType, entityId, metadata }) {
    const meta = metadata ? JSON.stringify(metadata) : null;
    await qRun(
        `
        INSERT INTO activity_logs (user_id, workspace_id, project_id, action, entity_type, entity_id, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
        [userId, workspaceId || null, projectId || null, action, entityType || null, entityId || null, meta]
    );
}

// ─── Execution logs (streaks, progress) ─────────────────────────────────────
export async function logExecution({ userId, projectId, workspaceId, action, score = 0, metadata }) {
    const meta = metadata ? JSON.stringify(metadata) : null;
    await qRun(
        `
        INSERT INTO execution_logs (user_id, project_id, workspace_id, action, score, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
    `,
        [userId, projectId || null, workspaceId || null, action, score, meta]
    );
}

export async function getExecutionStreak(userId, projectId = null) {
    const dk = dayKey('created_at');
    const logs = projectId
        ? await qAll(
            `
            SELECT ${dk} as d FROM execution_logs
            WHERE user_id = ? AND project_id = ? AND score > 0
            ORDER BY created_at DESC LIMIT 90
          `,
            [userId, projectId]
        )
        : await qAll(
            `
            SELECT ${dk} as d FROM execution_logs
            WHERE user_id = ? AND score > 0
            ORDER BY created_at DESC LIMIT 90
          `,
            [userId]
        );

    const dates = [...new Set(logs.map((r) => r.d))].sort().reverse();
    let streak = 0;
    const today = new Date().toISOString().slice(0, 10);
    let check = today;
    for (let i = 0; i < 90; i++) {
        if (dates.includes(check)) {
            streak++;
            const d = new Date(check);
            d.setDate(d.getDate() - 1);
            check = d.toISOString().slice(0, 10);
        } else break;
    }
    return streak;
}

export async function getProgressScore(userId, projectId = null, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const row = projectId
        ? await qGet(
            `
            SELECT COALESCE(SUM(score), 0) as total, COUNT(*) as count
            FROM execution_logs WHERE user_id = ? AND project_id = ? AND created_at >= ?
          `,
            [userId, projectId, since]
        )
        : await qGet(
            `
            SELECT COALESCE(SUM(score), 0) as total, COUNT(*) as count
            FROM execution_logs WHERE user_id = ? AND created_at >= ?
          `,
            [userId, since]
        );
    return { total: Number(row?.total || 0), count: Number(row?.count || 0) };
}

// ─── Workspace members ─────────────────────────────────────────────────────
export async function getWorkspaceMembers(workspaceId) {
    return qAll(
        `
        SELECT u.id, u.username, u.email, wm.role, wm.joined_at
        FROM workspace_members wm
        JOIN users u ON u.id = wm.user_id
        WHERE wm.workspace_id = ?
        ORDER BY (wm.role = 'admin') DESC, wm.joined_at ASC
    `,
        [workspaceId]
    );
}

export async function updateMemberRole(workspaceId, userId, newRole) {
    const ws = await getWorkspace(workspaceId);
    if (!ws) return false;
    if (ws.owner_id === userId) return false;
    const member = await qGet('SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?', [workspaceId, userId]);
    if (!member) return false;
    if (newRole !== 'admin' && newRole !== 'member') return false;
    await qRun('UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?', [newRole, workspaceId, userId]);
    await qRun(`UPDATE workspaces SET updated_at = ${nowSql()} WHERE id = ?`, [workspaceId]);
    return true;
}

// ─── Member daily tasks ────────────────────────────────────────────────────
export async function getMemberDailyTasks(workspaceId, userId = null, taskDate = null) {
    let sql = `
        SELECT t.*, u.username as assignee_username, a.username as assigned_by_username
        FROM member_daily_tasks t
        JOIN users u ON u.id = t.user_id
        LEFT JOIN users a ON a.id = t.assigned_by
        WHERE t.workspace_id = ?
    `;
    const params = [workspaceId];
    if (userId) { sql += ' AND t.user_id = ?'; params.push(userId); }
    if (taskDate) { sql += ' AND t.task_date = ?'; params.push(taskDate); }
    sql += ' ORDER BY t.task_date DESC, t.created_at DESC';
    return qAll(sql, params);
}

export async function createMemberDailyTask({ workspaceId, userId, taskText, taskDate, assignedBy }) {
    const result = await qRun(
        `
        INSERT INTO member_daily_tasks (workspace_id, user_id, task_text, task_date, assigned_by)
        VALUES (?, ?, ?, ?, ?) RETURNING id
    `,
        [workspaceId, userId, taskText, taskDate, assignedBy || null]
    );
    return result.lastInsertRowid;
}

export async function updateMemberDailyTask(taskId, userId, { taskText, status }) {
    const task = await qGet('SELECT * FROM member_daily_tasks WHERE id = ?', [taskId]);
    if (!task) return false;
    const updates = [];
    const params = [];
    if (taskText !== undefined) { updates.push('task_text = ?'); params.push(String(taskText).trim().slice(0, 2000)); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status === 'done' ? 'done' : 'pending'); }
    if (updates.length === 0) return true;
    updates.push(`updated_at = ${nowSql()}`);
    params.push(taskId);
    await qRun(`UPDATE member_daily_tasks SET ${updates.join(', ')} WHERE id = ?`, params);
    return true;
}

export async function getMemberDailyTaskById(taskId) {
    return qGet(
        `
        SELECT t.*, u.username as assignee_username, a.username as assigned_by_username
        FROM member_daily_tasks t
        JOIN users u ON u.id = t.user_id
        LEFT JOIN users a ON a.id = t.assigned_by
        WHERE t.id = ?
    `,
        [taskId]
    );
}

export async function deleteMemberDailyTask(taskId, userId) {
    const task = await qGet('SELECT * FROM member_daily_tasks WHERE id = ?', [taskId]);
    if (!task) return false;
    await qRun('DELETE FROM member_daily_tasks WHERE id = ?', [taskId]);
    return true;
}

// ─── Feed (public projects + activity) ─────────────────────────────────────
export async function getPublicFeed(limit = 50) {
    const workspaces = await qAll(
        `
        SELECT w.*, u.username as owner_username
        FROM workspaces w
        JOIN users u ON u.id = w.owner_id
        WHERE w.visibility = 'public'
        ORDER BY w.updated_at DESC
        LIMIT ?
    `,
        [limit]
    );

    const activities = await qAll(
        `
        SELECT al.*, u.username, w.name as workspace_name, p.title as project_title
        FROM activity_logs al
        JOIN users u ON u.id = al.user_id
        LEFT JOIN workspaces w ON w.id = al.workspace_id AND w.visibility = 'public'
        LEFT JOIN projects p ON p.id = al.project_id
        WHERE w.id IS NOT NULL
        ORDER BY al.created_at DESC
        LIMIT ?
    `,
        [limit]
    );

    const projects = await qAll(
        `
        SELECT p.*, w.name as workspace_name, w.owner_id, u.username as owner_username, a.username as assigned_to_username
        FROM projects p
        JOIN workspaces w ON w.id = p.workspace_id AND w.visibility = 'public'
        JOIN users u ON u.id = w.owner_id
        LEFT JOIN users a ON a.id = p.assigned_to
        ORDER BY p.updated_at DESC
        LIMIT ?
    `,
        [limit]
    );

    return { workspaces, activities, projects };
}

// ─── Notifications ─────────────────────────────────────────────────────────
export async function createNotification({ userId, type, title, body, link, metadata }) {
    const meta = metadata ? JSON.stringify(metadata) : null;
    await qRun(
        `
        INSERT INTO notifications (user_id, type, title, body, link, metadata) VALUES (?, ?, ?, ?, ?, ?)
    `,
        [userId, type, title || null, body || null, link || null, meta]
    );
}

export async function getNotifications(userId, unreadOnly = false) {
    if (unreadOnly) {
        return qAll(
            `
            SELECT * FROM notifications WHERE user_id = ? AND read_at IS NULL ORDER BY created_at DESC LIMIT 50
        `,
            [userId]
        );
    }
    return qAll(
        `
        SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
    `,
        [userId]
    );
}

export async function markNotificationRead(notificationId, userId) {
    const n = nowSql();
    await qRun(`UPDATE notifications SET read_at = ${n} WHERE id = ? AND user_id = ?`, [notificationId, userId]);
}

// ─── User Search ───────────────────────────────────────────────────────────
/** Returns true if both users share at least one workspace (request-accepted members) */
export async function doUsersShareWorkspace(userId1, userId2) {
    const row = await qGet(
        `
        SELECT 1 FROM workspace_members wm1
        JOIN workspace_members wm2 ON wm2.workspace_id = wm1.workspace_id AND wm2.user_id = ?
        WHERE wm1.user_id = ?
        LIMIT 1
    `,
        [userId2, userId1]
    );
    return !!row;
}

/** Get all users who share a workspace with currentUserId (for chat list - no search) */
export async function getUsersWhoShareWorkspaceWith(currentUserId, limit = 100) {
    return qAll(
        `
        SELECT DISTINCT u.id, u.username, u.email FROM users u
        JOIN workspace_members wm1 ON wm1.user_id = u.id
        JOIN workspace_members wm2 ON wm2.workspace_id = wm1.workspace_id AND wm2.user_id = ?
        WHERE u.id != ?
        ORDER BY u.username ASC, u.id ASC
        LIMIT ?
    `,
        [currentUserId, currentUserId, limit]
    );
}

/** Search users for chat: only returns users who share a workspace with currentUserId */
export async function searchUsersForChat(query, currentUserId, limit = 20) {
    const qv = `%${String(query).trim()}%`;
    return qAll(
        `
        SELECT DISTINCT u.id, u.username, u.email FROM users u
        JOIN workspace_members wm1 ON wm1.user_id = u.id
        JOIN workspace_members wm2 ON wm2.workspace_id = wm1.workspace_id AND wm2.user_id = ?
        WHERE u.id != ? AND (LOWER(COALESCE(u.username,'')) LIKE LOWER(?) OR LOWER(COALESCE(u.email,'')) LIKE LOWER(?))
        ORDER BY u.username ASC LIMIT ?
    `,
        [currentUserId, currentUserId, qv, qv, limit]
    );
}

export async function searchUsers(query, excludeUserId = null, limit = 20) {
    const qv = `%${String(query).trim()}%`;
    if (excludeUserId) {
        return qAll(
            `
            SELECT id, username, email FROM users
            WHERE id != ? AND (LOWER(COALESCE(username,'')) LIKE LOWER(?) OR LOWER(COALESCE(email,'')) LIKE LOWER(?))
            ORDER BY COALESCE(username, email) ASC LIMIT ?
        `,
            [excludeUserId, qv, qv, limit]
        );
    }
    return qAll(
        `
        SELECT id, username, email FROM users
        WHERE LOWER(COALESCE(username,'')) LIKE LOWER(?) OR LOWER(COALESCE(email,'')) LIKE LOWER(?)
        ORDER BY COALESCE(username, email) ASC LIMIT ?
    `,
        [qv, qv, limit]
    );
}

// ─── Chats ────────────────────────────────────────────────────────────────
export async function getOrCreateDirectChat(userId1, userId2) {
    const [u1, u2] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
    const existing = await qGet(
        `
        SELECT c.id FROM chats c
        JOIN chat_participants cp1 ON cp1.chat_id = c.id AND cp1.user_id = ?
        JOIN chat_participants cp2 ON cp2.chat_id = c.id AND cp2.user_id = ?
        WHERE c.type = 'direct'
    `,
        [u1, u2]
    );
    if (existing) return existing.id;

    const result = await qRun(`INSERT INTO chats (type) VALUES (?) RETURNING id`, ['direct']);
    const chatId = result.lastInsertRowid;
    await qRun('INSERT INTO chat_participants (chat_id, user_id) VALUES (?, ?), (?, ?)', [chatId, userId1, chatId, userId2]);
    return chatId;
}

export async function getChatsForUser(userId) {
    return qAll(
        `
        SELECT c.id, c.type, c.name, c.updated_at,
               (SELECT content FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
               (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at
        FROM chats c
        JOIN chat_participants cp ON cp.chat_id = c.id AND cp.user_id = ?
        ORDER BY c.updated_at DESC
    `,
        [userId]
    );
}

/** @param {number[]} chatIds */
export async function getBatchChatParticipants(chatIds) {
    if (!chatIds.length) return new Map();
    const ph = chatIds.map(() => '?').join(',');
    const rows = await qAll(
        `
        SELECT cp.chat_id, u.id, u.username, u.email
        FROM chat_participants cp
        JOIN users u ON u.id = cp.user_id
        WHERE cp.chat_id IN (${ph})
        ORDER BY cp.chat_id, u.id
    `,
        chatIds
    );
    /** @type {Map<number, { id: number, username: string | null, email: string | null }[]>} */
    const map = new Map();
    for (const r of rows) {
        const list = map.get(r.chat_id) || [];
        list.push({ id: r.id, username: r.username, email: r.email });
        map.set(r.chat_id, list);
    }
    return map;
}

/** @param {number} userId @param {number[]} chatIds */
export async function getBatchUnreadCounts(userId, chatIds) {
    if (!chatIds.length) return new Map();
    const ph = chatIds.map(() => '?').join(',');
    const rows = await qAll(
        `
        SELECT
            cp.chat_id,
            CASE
                WHEN cp.last_read_at IS NULL THEN
                    (SELECT COUNT(*) FROM messages m WHERE m.chat_id = cp.chat_id AND m.sender_id != ?)
                ELSE
                    (SELECT COUNT(*) FROM messages m WHERE m.chat_id = cp.chat_id AND m.sender_id != ? AND m.created_at > cp.last_read_at)
            END AS unread
        FROM chat_participants cp
        WHERE cp.user_id = ? AND cp.chat_id IN (${ph})
    `,
        [userId, userId, userId, ...chatIds]
    );
    return new Map(rows.map((r) => [r.chat_id, Number(r.unread) || 0]));
}

/** @param {number} userId @param {number[]} candidateOtherIds */
export async function getUserIdsSharingWorkspaceWith(userId, candidateOtherIds) {
    if (!candidateOtherIds.length) return new Set();
    const ph = candidateOtherIds.map(() => '?').join(',');
    const rows = await qAll(
        `
        SELECT DISTINCT wm2.user_id AS other_id
        FROM workspace_members wm1
        JOIN workspace_members wm2 ON wm2.workspace_id = wm1.workspace_id AND wm2.user_id IN (${ph})
        WHERE wm1.user_id = ?
    `,
        [...candidateOtherIds, userId]
    );
    return new Set(rows.map((r) => r.other_id));
}

/**
 * Chat list for sidebar: same shape as previous N+1 route, fewer DB round-trips.
 */
export async function getChatsListEnriched(userId) {
    const chats = await getChatsForUser(userId);
    if (!chats.length) return [];
    const chatIds = chats.map((c) => c.id);
    const participantsMap = await getBatchChatParticipants(chatIds);
    const unreadMap = await getBatchUnreadCounts(userId, chatIds);
    const otherIds = [];
    for (const cid of chatIds) {
        const parts = participantsMap.get(cid) || [];
        const other = parts.find((p) => p.id !== userId);
        if (other) otherIds.push(other.id);
    }
    const uniqueOthers = [...new Set(otherIds)];
    const shareSet = await getUserIdsSharingWorkspaceWith(userId, uniqueOthers);

    return chats
        .map((c) => {
            const participants = participantsMap.get(c.id) || [];
            const otherUser = participants.find((p) => p.id !== userId) || null;
            if (otherUser && !shareSet.has(otherUser.id)) return null;
            const chat = {
                id: c.id,
                type: c.type,
                name: c.name,
                updated_at: c.updated_at,
                last_message: c.last_message,
                last_message_at: c.last_message_at,
            };
            return {
                ...chat,
                participants,
                otherUser,
                unread: unreadMap.get(c.id) ?? 0,
            };
        })
        .filter(Boolean);
}

export async function getChatWithParticipants(chatId, userId) {
    const chat = await qGet('SELECT * FROM chats WHERE id = ?', [chatId]);
    if (!chat) return null;
    const isMember = await qGet('SELECT 1 FROM chat_participants WHERE chat_id = ? AND user_id = ?', [chatId, userId]);
    if (!isMember) return null;

    const participants = await qAll(
        `
        SELECT u.id, u.username, u.email FROM chat_participants cp
        JOIN users u ON u.id = cp.user_id
        WHERE cp.chat_id = ?
    `,
        [chatId]
    );

    const otherUser = participants.find((p) => p.id !== userId);
    return { ...chat, participants, otherUser: otherUser || null };
}

export async function getMessages(chatId, userId, beforeId = null, limit = 50) {
    const isMember = await qGet('SELECT 1 FROM chat_participants WHERE chat_id = ? AND user_id = ?', [chatId, userId]);
    if (!isMember) return [];

    let sql = `
        SELECT m.*, u.username as sender_username FROM messages m
        JOIN users u ON u.id = m.sender_id
        WHERE m.chat_id = ?
    `;
    const params = [chatId];
    if (beforeId) {
        sql += ' AND m.id < ?';
        params.push(beforeId);
    }
    sql += ' ORDER BY m.created_at DESC LIMIT ?';
    params.push(limit);

    const rows = await qAll(sql, params);
    return rows.reverse();
}

export async function createMessage(chatId, senderId, content, type = 'text', replyToId = null, metadata = null) {
    const isMember = await qGet('SELECT 1 FROM chat_participants WHERE chat_id = ? AND user_id = ?', [chatId, senderId]);
    if (!isMember) return null;

    const metaObj = { ...(replyToId ? { replyToId } : {}), ...(metadata || {}) };
    const meta = Object.keys(metaObj).length > 0 ? JSON.stringify(metaObj) : null;
    const result = await qRun(
        `
        INSERT INTO messages (chat_id, sender_id, content, type, reply_to_id, metadata) VALUES (?, ?, ?, ?, ?, ?) RETURNING id
    `,
        [chatId, senderId, content, type, replyToId || null, meta]
    );
    await qRun(`UPDATE chats SET updated_at = ${nowSql()} WHERE id = ?`, [chatId]);
    return result.lastInsertRowid;
}

export async function getMessage(id) {
    return qGet(
        'SELECT m.*, u.username as sender_username FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.id = ?',
        [id]
    );
}

export async function markChatRead(chatId, userId) {
    const n = nowSql();
    await qRun(`UPDATE chat_participants SET last_read_at = ${n} WHERE chat_id = ? AND user_id = ?`, [chatId, userId]);
}

export async function getUnreadCount(chatId, userId) {
    const cp = await qGet('SELECT last_read_at FROM chat_participants WHERE chat_id = ? AND user_id = ?', [chatId, userId]);
    if (!cp || !cp.last_read_at) {
        const count = await qGet('SELECT COUNT(*) as c FROM messages WHERE chat_id = ? AND sender_id != ?', [chatId, userId]);
        return Number(count?.c) || 0;
    }
    const row = await qGet(
        'SELECT COUNT(*) as c FROM messages WHERE chat_id = ? AND sender_id != ? AND created_at > ?',
        [chatId, userId, cp.last_read_at]
    );
    return Number(row?.c) || 0;
}

// ─── Shared Canvases (for chat sharing) ─────────────────────────────────────
export async function createSharedCanvas({ shareId, name, data }) {
    await qRun('INSERT INTO shared_canvases (share_id, name, data) VALUES (?, ?, ?)', [shareId, name || null, data]);
    return shareId;
}

export async function getSharedCanvas(shareId) {
    return qGet('SELECT share_id, name, data FROM shared_canvases WHERE share_id = ?', [shareId]);
}
