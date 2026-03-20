/**
 * Database models and helpers for Social + Team Workspace System
 */

import crypto from 'crypto';
import { getDb } from './index.js';

// ─── User sync from Clerk ─────────────────────────────────────────────────
export function getOrCreateUser(clerkUser) {
    const db = getDb();
    const clerkId = clerkUser.id;
    const email = clerkUser.emailAddresses?.[0]?.emailAddress || null;
    const username = clerkUser.username || clerkUser.firstName || null;

    let row = db.prepare('SELECT * FROM users WHERE clerk_user_id = ?').get(clerkId);
    if (row) {
        db.prepare(`
            UPDATE users SET username = COALESCE(?, username), email = COALESCE(?, email), updated_at = datetime('now')
            WHERE id = ?
        `).run(username || null, email || null, row.id);
        return row.id;
    }

    const result = db.prepare(`
        INSERT INTO users (clerk_user_id, username, email) VALUES (?, ?, ?)
    `).run(clerkId, username || null, email || null);
    const userId = result.lastInsertRowid;

    db.prepare('INSERT INTO profiles (user_id) VALUES (?)').run(userId);
    return userId;
}

export function getUserByClerkId(clerkId) {
    const db = getDb();
    return db.prepare('SELECT * FROM users WHERE clerk_user_id = ?').get(clerkId);
}

export function getUserById(id) {
    const db = getDb();
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function getUserByUsername(username) {
    const db = getDb();
    if (!username) return null;
    return db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(username);
}

export function getUserByIdOrUsername(idOrUsername) {
    const db = getDb();
    const byId = db.prepare('SELECT * FROM users WHERE id = ?').get(parseInt(idOrUsername, 10));
    if (byId) return byId;
    return db.prepare('SELECT * FROM users WHERE username = ?').get(idOrUsername);
}

// ─── Profile ───────────────────────────────────────────────────────────────
export function getProfile(userId) {
    const db = getDb();
    return db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId);
}

export function updateProfile(userId, { bio }) {
    const db = getDb();
    db.prepare(`
        INSERT INTO profiles (user_id, bio, updated_at) VALUES (?, ?, datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET bio = excluded.bio, updated_at = datetime('now')
    `).run(userId, bio || null);
}

// ─── Workspaces ────────────────────────────────────────────────────────────
export function createWorkspace({ name, type, ownerId, visibility = 'private' }) {
    const db = getDb();
    const result = db.prepare(`
        INSERT INTO workspaces (name, type, owner_id, visibility) VALUES (?, ?, ?, ?)
    `).run(name, type, ownerId, visibility);
    const id = result.lastInsertRowid;
    db.prepare('INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)')
        .run(id, ownerId, 'admin');
    return id;
}

export function getWorkspace(id) {
    const db = getDb();
    return db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id);
}

export function updateWorkspace(id, { name, visibility }) {
    const db = getDb();
    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (visibility !== undefined) { updates.push('visibility = ?'); params.push(visibility); }
    if (updates.length === 0) return;
    updates.push("updated_at = datetime('now')");
    params.push(id);
    db.prepare(`UPDATE workspaces SET ${updates.join(', ')} WHERE id = ?`).run(...params);
}

export function getWorkspacesForUser(userId) {
    const db = getDb();
    return db.prepare(`
        SELECT w.*, wm.role
        FROM workspaces w
        JOIN workspace_members wm ON wm.workspace_id = w.id
        WHERE wm.user_id = ?
        ORDER BY w.updated_at DESC
    `).all(userId);
}

export function hasWorkspaceAccess(userId, workspaceId, minRole = 'member') {
    const db = getDb();
    const ws = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(workspaceId);
    if (!ws) return false;
    if (ws.owner_id === userId) return true;
    const member = db.prepare('SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(workspaceId, userId);
    if (!member) return false;
    return minRole === 'member' || member.role === 'admin';
}

export function canManageMembers(userId, workspaceId) {
    return hasWorkspaceAccess(userId, workspaceId, 'admin');
}

// ─── Invitations ───────────────────────────────────────────────────────────
export function createInvitation({ workspaceId, inviterId, inviteeEmail, inviteeUserId }) {
    const db = getDb();
    const token = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
    const emailNorm = inviteeEmail ? inviteeEmail.trim().toLowerCase() : null;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const result = db.prepare(`
        INSERT INTO invitations (workspace_id, inviter_id, invitee_email, invitee_email_normalized, invitee_user_id, token, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(workspaceId, inviterId, inviteeEmail || null, emailNorm, inviteeUserId || null, token, expiresAt);
    return result.lastInsertRowid;
}

export function getInvitationsForUser(userId) {
    const db = getDb();
    const user = getUserById(userId);
    if (!user) return [];
    const emailNorm = user.email ? user.email.trim().toLowerCase() : null;

    // Match by user ID or by email (when email is set)
    if (emailNorm) {
        return db.prepare(`
            SELECT i.*, w.name as workspace_name, u.username as inviter_username
            FROM invitations i
            JOIN workspaces w ON w.id = i.workspace_id
            JOIN users u ON u.id = i.inviter_id
            WHERE (i.invitee_user_id = ? OR i.invitee_email_normalized = ?) AND i.status = 'pending'
            AND (i.expires_at IS NULL OR i.expires_at > datetime('now'))
            ORDER BY i.created_at DESC
        `).all(userId, emailNorm);
    }
    return db.prepare(`
        SELECT i.*, w.name as workspace_name, u.username as inviter_username
        FROM invitations i
        JOIN workspaces w ON w.id = i.workspace_id
        JOIN users u ON u.id = i.inviter_id
        WHERE i.invitee_user_id = ? AND i.status = 'pending'
        AND (i.expires_at IS NULL OR i.expires_at > datetime('now'))
        ORDER BY i.created_at DESC
    `).all(userId);
}

export function acceptInvitation(userId, invitationId) {
    const db = getDb();
    const inv = db.prepare('SELECT * FROM invitations WHERE id = ? AND status = ?').get(invitationId, 'pending');
    if (!inv) return false;
    const user = getUserById(userId);
    const emailNorm = user?.email?.trim().toLowerCase();
    const canAccept = inv.invitee_user_id === userId || inv.invitee_email_normalized === emailNorm;
    if (!canAccept) return false;

    db.prepare('UPDATE invitations SET status = ? WHERE id = ?').run('accepted', invitationId);
    db.prepare('INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)')
        .run(inv.workspace_id, userId, 'member');
    return true;
}

export function rejectInvitation(userId, invitationId) {
    const db = getDb();
    const inv = db.prepare('SELECT * FROM invitations WHERE id = ? AND status = ?').get(invitationId, 'pending');
    if (!inv) return false;
    const user = getUserById(userId);
    const emailNorm = user?.email?.trim().toLowerCase();
    const canReject = inv.invitee_user_id === userId || inv.invitee_email_normalized === emailNorm;
    if (!canReject) return false;
    db.prepare('UPDATE invitations SET status = ? WHERE id = ?').run('rejected', invitationId);
    return true;
}

// ─── Projects ──────────────────────────────────────────────────────────────
export function createProject({ workspaceId, title, description, status = 'idea', canvasId }) {
    const db = getDb();
    const result = db.prepare(`
        INSERT INTO projects (workspace_id, title, description, status, canvas_id) VALUES (?, ?, ?, ?, ?)
    `).run(workspaceId, title, description || null, status, canvasId || null);
    return result.lastInsertRowid;
}

export function getProject(id) {
    const db = getDb();
    return db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
}

export function getProjectsForWorkspace(workspaceId) {
    const db = getDb();
    return db.prepare('SELECT * FROM projects WHERE workspace_id = ? ORDER BY updated_at DESC').all(workspaceId);
}

export function updateProjectStatus(projectId, status) {
    const db = getDb();
    db.prepare('UPDATE projects SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(status, projectId);
}

export function updateProject(projectId, { title, description, status }) {
    const db = getDb();
    const updates = [];
    const params = [];
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (updates.length === 0) return;
    updates.push("updated_at = datetime('now')");
    params.push(projectId);
    db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...params);
}

// ─── Activity logs ─────────────────────────────────────────────────────────
export function getWorkspaceActivity(workspaceId, limit = 30) {
    const db = getDb();
    return db.prepare(`
        SELECT al.*, u.username FROM activity_logs al
        JOIN users u ON u.id = al.user_id
        WHERE al.workspace_id = ? ORDER BY al.created_at DESC LIMIT ?
    `).all(workspaceId, limit);
}

export function getProfileActivity(userId, limit = 20) {
    const db = getDb();
    return db.prepare(`
        SELECT al.*, w.name as workspace_name, p.title as project_title
        FROM activity_logs al
        LEFT JOIN workspaces w ON w.id = al.workspace_id
        LEFT JOIN projects p ON p.id = al.project_id
        WHERE al.user_id = ? ORDER BY al.created_at DESC LIMIT ?
    `).all(userId, limit);
}

export function getProfileProjects(userId, limit = 20) {
    const db = getDb();
    return db.prepare(`
        SELECT p.*, w.name as workspace_name
        FROM projects p
        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = ?
        JOIN workspaces w ON w.id = p.workspace_id
        ORDER BY p.updated_at DESC LIMIT ?
    `).all(userId, limit);
}

export function logActivity({ userId, workspaceId, projectId, action, entityType, entityId, metadata }) {
    const db = getDb();
    const meta = metadata ? JSON.stringify(metadata) : null;
    db.prepare(`
        INSERT INTO activity_logs (user_id, workspace_id, project_id, action, entity_type, entity_id, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, workspaceId || null, projectId || null, action, entityType || null, entityId || null, meta);
}

// ─── Execution logs (streaks, progress) ─────────────────────────────────────
export function logExecution({ userId, projectId, workspaceId, action, score = 0, metadata }) {
    const db = getDb();
    const meta = metadata ? JSON.stringify(metadata) : null;
    db.prepare(`
        INSERT INTO execution_logs (user_id, project_id, workspace_id, action, score, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, projectId || null, workspaceId || null, action, score, meta);
}

export function getExecutionStreak(userId, projectId = null) {
    const db = getDb();
    const logs = projectId
        ? db.prepare(`
            SELECT date(created_at) as d FROM execution_logs
            WHERE user_id = ? AND project_id = ? AND score > 0
            ORDER BY created_at DESC LIMIT 90
          `).all(userId, projectId)
        : db.prepare(`
            SELECT date(created_at) as d FROM execution_logs
            WHERE user_id = ? AND score > 0
            ORDER BY created_at DESC LIMIT 90
          `).all(userId);

    const dates = [...new Set(logs.map(r => r.d))].sort().reverse();
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

export function getProgressScore(userId, projectId = null, days = 30) {
    const db = getDb();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const row = projectId
        ? db.prepare(`
            SELECT COALESCE(SUM(score), 0) as total, COUNT(*) as count
            FROM execution_logs WHERE user_id = ? AND project_id = ? AND created_at >= ?
          `).get(userId, projectId, since)
        : db.prepare(`
            SELECT COALESCE(SUM(score), 0) as total, COUNT(*) as count
            FROM execution_logs WHERE user_id = ? AND created_at >= ?
          `).get(userId, since);
    return { total: row?.total || 0, count: row?.count || 0 };
}

// ─── Workspace members ─────────────────────────────────────────────────────
export function getWorkspaceMembers(workspaceId) {
    const db = getDb();
    return db.prepare(`
        SELECT u.id, u.username, u.email, wm.role, wm.joined_at
        FROM workspace_members wm
        JOIN users u ON u.id = wm.user_id
        WHERE wm.workspace_id = ?
        ORDER BY (wm.role = 'admin') DESC, wm.joined_at ASC
    `).all(workspaceId);
}

// ─── Feed (public projects + activity) ─────────────────────────────────────
export function getPublicFeed(limit = 50) {
    const db = getDb();
    const workspaces = db.prepare(`
        SELECT w.*, u.username as owner_username
        FROM workspaces w
        JOIN users u ON u.id = w.owner_id
        WHERE w.visibility = 'public'
        ORDER BY w.updated_at DESC
        LIMIT ?
    `).all(limit);

    const activities = db.prepare(`
        SELECT al.*, u.username, w.name as workspace_name, p.title as project_title
        FROM activity_logs al
        JOIN users u ON u.id = al.user_id
        LEFT JOIN workspaces w ON w.id = al.workspace_id AND w.visibility = 'public'
        LEFT JOIN projects p ON p.id = al.project_id
        WHERE w.id IS NOT NULL
        ORDER BY al.created_at DESC
        LIMIT ?
    `).all(limit);

    const projects = db.prepare(`
        SELECT p.*, w.name as workspace_name, u.username as owner_username
        FROM projects p
        JOIN workspaces w ON w.id = p.workspace_id AND w.visibility = 'public'
        JOIN users u ON u.id = w.owner_id
        ORDER BY p.updated_at DESC
        LIMIT ?
    `).all(limit);

    return { workspaces, activities, projects };
}

// ─── Notifications ─────────────────────────────────────────────────────────
export function createNotification({ userId, type, title, body, link, metadata }) {
    const db = getDb();
    const meta = metadata ? JSON.stringify(metadata) : null;
    db.prepare(`
        INSERT INTO notifications (user_id, type, title, body, link, metadata) VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, type, title || null, body || null, link || null, meta);
}

export function getNotifications(userId, unreadOnly = false) {
    const db = getDb();
    if (unreadOnly) {
        return db.prepare(`
            SELECT * FROM notifications WHERE user_id = ? AND read_at IS NULL ORDER BY created_at DESC LIMIT 50
        `).all(userId);
    }
    return db.prepare(`
        SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
    `).all(userId);
}

export function markNotificationRead(notificationId, userId) {
    const db = getDb();
    db.prepare('UPDATE notifications SET read_at = datetime(\'now\') WHERE id = ? AND user_id = ?')
        .run(notificationId, userId);
}

// ─── User Search ───────────────────────────────────────────────────────────
export function searchUsers(query, excludeUserId = null, limit = 20) {
    const db = getDb();
    const q = `%${String(query).trim()}%`;
    if (excludeUserId) {
        return db.prepare(`
            SELECT id, username, email FROM users
            WHERE id != ? AND (LOWER(username) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?))
            ORDER BY username ASC LIMIT ?
        `).all(excludeUserId, q, q, limit);
    }
    return db.prepare(`
        SELECT id, username, email FROM users
        WHERE LOWER(COALESCE(username,'')) LIKE LOWER(?) OR LOWER(COALESCE(email,'')) LIKE LOWER(?)
        ORDER BY username ASC LIMIT ?
    `).all(q, q, limit);
}

// ─── Chats ────────────────────────────────────────────────────────────────
export function getOrCreateDirectChat(userId1, userId2) {
    const db = getDb();
    const [u1, u2] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
    const existing = db.prepare(`
        SELECT c.id FROM chats c
        JOIN chat_participants cp1 ON cp1.chat_id = c.id AND cp1.user_id = ?
        JOIN chat_participants cp2 ON cp2.chat_id = c.id AND cp2.user_id = ?
        WHERE c.type = 'direct'
    `).get(u1, u2);
    if (existing) return existing.id;

    const result = db.prepare('INSERT INTO chats (type) VALUES (?)').run('direct');
    const chatId = result.lastInsertRowid;
    db.prepare('INSERT INTO chat_participants (chat_id, user_id) VALUES (?, ?), (?, ?)').run(chatId, userId1, chatId, userId2);
    return chatId;
}

export function getChatsForUser(userId) {
    const db = getDb();
    return db.prepare(`
        SELECT c.id, c.type, c.name, c.updated_at,
               (SELECT content FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
               (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at
        FROM chats c
        JOIN chat_participants cp ON cp.chat_id = c.id AND cp.user_id = ?
        ORDER BY c.updated_at DESC
    `).all(userId);
}

export function getChatWithParticipants(chatId, userId) {
    const db = getDb();
    const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId);
    if (!chat) return null;
    const isMember = db.prepare('SELECT 1 FROM chat_participants WHERE chat_id = ? AND user_id = ?').get(chatId, userId);
    if (!isMember) return null;

    const participants = db.prepare(`
        SELECT u.id, u.username, u.email FROM chat_participants cp
        JOIN users u ON u.id = cp.user_id
        WHERE cp.chat_id = ?
    `).all(chatId);

    const otherUser = participants.find(p => p.id !== userId);
    return { ...chat, participants, otherUser: otherUser || null };
}

export function getMessages(chatId, userId, beforeId = null, limit = 50) {
    const db = getDb();
    const isMember = db.prepare('SELECT 1 FROM chat_participants WHERE chat_id = ? AND user_id = ?').get(chatId, userId);
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

    return db.prepare(sql).all(...params).reverse();
}

export function createMessage(chatId, senderId, content, type = 'text', replyToId = null) {
    const db = getDb();
    const isMember = db.prepare('SELECT 1 FROM chat_participants WHERE chat_id = ? AND user_id = ?').get(chatId, senderId);
    if (!isMember) return null;

    const meta = replyToId ? JSON.stringify({ replyToId }) : null;
    const result = db.prepare(`
        INSERT INTO messages (chat_id, sender_id, content, type, reply_to_id, metadata) VALUES (?, ?, ?, ?, ?, ?)
    `).run(chatId, senderId, content, type, replyToId || null, meta);
    db.prepare("UPDATE chats SET updated_at = datetime('now') WHERE id = ?").run(chatId);
    return result.lastInsertRowid;
}

export function getMessage(id) {
    const db = getDb();
    return db.prepare('SELECT m.*, u.username as sender_username FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.id = ?').get(id);
}

export function markChatRead(chatId, userId) {
    const db = getDb();
    db.prepare("UPDATE chat_participants SET last_read_at = datetime('now') WHERE chat_id = ? AND user_id = ?").run(chatId, userId);
}

export function getUnreadCount(chatId, userId) {
    const db = getDb();
    const cp = db.prepare('SELECT last_read_at FROM chat_participants WHERE chat_id = ? AND user_id = ?').get(chatId, userId);
    if (!cp || !cp.last_read_at) {
        const count = db.prepare('SELECT COUNT(*) as c FROM messages WHERE chat_id = ? AND sender_id != ?').get(chatId, userId);
        return count?.c || 0;
    }
    return db.prepare('SELECT COUNT(*) as c FROM messages WHERE chat_id = ? AND sender_id != ? AND created_at > ?').get(chatId, userId, cp.last_read_at)?.c || 0;
}
