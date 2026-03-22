/**
 * Workspace, Project, Feed, Profile API routes
 * Social + Team Workspace System
 */

import crypto from 'crypto';
import {
    getOrCreateUser,
    getUserById,
    getUserByUsername,
    getUserByEmail,
    updateWorkspace,
    getProfile,
    updateProfile,
    createWorkspace,
    getWorkspace,
    getWorkspacesForUser,
    hasWorkspaceAccess,
    canManageMembers,
    createInvitation,
    getInvitationsForUser,
    acceptInvitation,
    rejectInvitation,
    createProject,
    getProject,
    getProjectWithAssignee,
    getProjectsForWorkspace,
    updateProject,
    logActivity,
    logExecution,
    getExecutionStreak,
    getProgressScore,
    getWorkspaceMembers,
    getWorkspaceActivity,
    getProfileActivity,
    getProfileProjects,
    getPublicFeed,
    createNotification,
    getNotifications,
    markNotificationRead,
    updateMemberRole,
    getMemberDailyTasks,
    createMemberDailyTask,
    updateMemberDailyTask,
    deleteMemberDailyTask,
    getMemberDailyTaskById,
    doUsersShareWorkspace,
    createSharedCanvas,
    getSharedCanvas,
    saveProjectCanvas,
    getProjectCanvas,
    joinWorkspaceById,
} from '../db/models.js';
import { initDb } from '../db/index.js';

// ─── Auth middleware: requires valid Clerk token, sets req.userId (our internal id) ─
async function requireAuthMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: no token provided.' });
    }
    const token = authHeader.slice(7).trim();
    if (!token) return res.status(401).json({ error: 'Unauthorized: empty token.' });

    const clerk = req.app.locals?.clerk;
    if (!clerk) return res.status(503).json({ error: 'Auth service not configured.' });

    try {
        const payloadB64 = token.split('.')[1];
        if (!payloadB64) throw new Error('Malformed token.');
        const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
        const clerkId = decoded.sub;
        if (!clerkId) throw new Error('No sub claim.');
        const clerkUser = await clerk.users.getUser(clerkId);
        const userId = getOrCreateUser(clerkUser);
        req.clerkUser = clerkUser;
        req.userId = userId;
        req.clerkUserId = clerkId;
        next();
    } catch (err) {
        console.error('Auth failed:', err?.message || err);
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
}

// ─── Input validation helpers ───────────────────────────────────────────────
function sanitizeStr(val, maxLen = 200) {
    if (val == null) return null;
    return String(val).trim().slice(0, maxLen) || null;
}

function validateWorkspaceType(type) {
    return type === 'individual' || type === 'team' ? type : null;
}

function validateVisibility(v) {
    return v === 'private' || v === 'public' ? v : 'private';
}

function validateProjectStatus(s) {
    const valid = ['idea', 'planning', 'executing', 'completed'];
    return valid.includes(s) ? s : 'idea';
}

// ─── Routes ────────────────────────────────────────────────────────────────

export function registerWorkspaceRoutes(app, clerkClient) {
    app.locals.clerk = clerkClient;
    initDb();

    // POST /api/workspaces/join — join team workspace by ID (auth required)
    app.post('/api/workspaces/join', requireAuthMiddleware, (req, res) => {
        try {
            const workspaceId = parseInt(req.body?.workspaceId ?? req.body?.id ?? 0, 10);
            if (isNaN(workspaceId) || workspaceId <= 0) return res.status(400).json({ error: 'Valid workspace ID required.' });

            const ws = getWorkspace(workspaceId);
            if (!ws) return res.status(404).json({ error: 'Workspace not found.' });
            if (ws.type !== 'team') return res.status(400).json({ error: 'Only team workspaces can be joined by ID.' });

            const joined = joinWorkspaceById(workspaceId, req.userId);
            if (!joined) return res.status(400).json({ error: 'You are already a member of this workspace.' });

            logActivity({
                userId: req.userId,
                workspaceId,
                action: 'joined_workspace',
                entityType: 'workspace',
                entityId: String(workspaceId),
                metadata: { name: ws.name },
            });

            return res.json({ ok: true, workspace: getWorkspace(workspaceId), message: `Joined "${ws.name}".` });
        } catch (err) {
            console.error('Join workspace error:', err);
            return res.status(500).json({ error: 'Failed to join workspace.' });
        }
    });

    // POST /api/workspaces — create workspace
    app.post('/api/workspaces', requireAuthMiddleware, (req, res) => {
        try {
            const { name, type, visibility } = req.body || {};
            const nameStr = sanitizeStr(name, 100);
            const workspaceType = validateWorkspaceType(type) || 'individual';
            const vis = validateVisibility(visibility);

            if (!nameStr) {
                return res.status(400).json({ error: 'Workspace name is required.' });
            }

            const id = createWorkspace({
                name: nameStr,
                type: workspaceType,
                ownerId: req.userId,
                visibility: vis,
            });

            logActivity({
                userId: req.userId,
                workspaceId: id,
                action: 'created_workspace',
                entityType: 'workspace',
                entityId: String(id),
                metadata: { name: nameStr, type: workspaceType },
            });

            const ws = getWorkspace(id);
            return res.status(201).json({ workspace: ws, id });
        } catch (err) {
            console.error('Create workspace error:', err);
            return res.status(500).json({ error: 'Failed to create workspace.' });
        }
    });

    // GET /api/workspaces — list user's workspaces
    app.get('/api/workspaces', requireAuthMiddleware, (req, res) => {
        try {
            const workspaces = getWorkspacesForUser(req.userId);
            return res.json({ workspaces });
        } catch (err) {
            console.error('List workspaces error:', err);
            return res.status(500).json({ error: 'Failed to list workspaces.' });
        }
    });

    // GET /api/workspaces/:id — get workspace details
    app.get('/api/workspaces/:id', requireAuthMiddleware, (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) return res.status(400).json({ error: 'Invalid workspace ID.' });

            const ws = getWorkspace(id);
            if (!ws) return res.status(404).json({ error: 'Workspace not found.' });

            if (!hasWorkspaceAccess(req.userId, id)) {
                return res.status(403).json({ error: 'Access denied.' });
            }

            const members = getWorkspaceMembers(id);
            const projects = getProjectsForWorkspace(id);
            const activities = getWorkspaceActivity(id, 30);
            const myMember = members.find(m => m.id === req.userId);
            const currentUserRole = ws.owner_id === req.userId ? 'admin' : (myMember?.role || null);

            return res.json({
                workspace: ws,
                members,
                projects,
                currentUserRole,
                currentUserId: req.userId,
                activities: activities.map(a => ({
                    ...a,
                    metadata: a.metadata ? JSON.parse(a.metadata) : null,
                })),
            });
        } catch (err) {
            console.error('Get workspace error:', err);
            return res.status(500).json({ error: 'Failed to load workspace.' });
        }
    });

    // PATCH /api/workspaces/:id — update workspace (admin only)
    app.patch('/api/workspaces/:id', requireAuthMiddleware, (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) return res.status(400).json({ error: 'Invalid workspace ID.' });

            if (!canManageMembers(req.userId, id)) {
                return res.status(403).json({ error: 'Only admins can update workspace.' });
            }

            const ws = getWorkspace(id);
            if (!ws) return res.status(404).json({ error: 'Workspace not found.' });

            const { name, visibility } = req.body || {};
            const updates = {};
            if (name !== undefined) updates.name = sanitizeStr(name, 100);
            if (visibility !== undefined) updates.visibility = validateVisibility(visibility);

            updateWorkspace(id, updates);
            return res.json({ workspace: getWorkspace(id) });
        } catch (err) {
            console.error('Update workspace error:', err);
            return res.status(500).json({ error: 'Failed to update workspace.' });
        }
    });

    // POST /api/workspaces/:id/invite — invite member (admin only)
    app.post('/api/workspaces/:id/invite', requireAuthMiddleware, (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) return res.status(400).json({ error: 'Invalid workspace ID.' });

            if (!canManageMembers(req.userId, id)) {
                return res.status(403).json({ error: 'Only admins can invite members.' });
            }

            const ws = getWorkspace(id);
            if (!ws) return res.status(404).json({ error: 'Workspace not found.' });
            if (ws.type !== 'team') {
                return res.status(400).json({ error: 'Only team workspaces support invitations.' });
            }

            const { email, username, userId } = req.body || {};
            const inviteeEmail = sanitizeStr(email, 255);
            let inviteeUserId = null;
            if (userId != null) {
                const uid = parseInt(userId, 10);
                if (!isNaN(uid) && getUserById(uid)) inviteeUserId = uid;
            }
            if (!inviteeUserId && username) {
                const u = getUserByUsername(sanitizeStr(username, 50));
                if (u) inviteeUserId = u.id;
            }
            if (!inviteeEmail && !inviteeUserId) {
                return res.status(400).json({ error: 'Provide email, username, or userId to invite.' });
            }

            createInvitation({
                workspaceId: id,
                inviterId: req.userId,
                inviteeEmail: inviteeEmail || undefined,
                inviteeUserId: inviteeUserId || undefined,
            });

            const invUser = inviteeUserId ? getUserById(inviteeUserId) : null;
            if (inviteeUserId) {
                createNotification({
                    userId: inviteeUserId,
                    type: 'invite',
                    title: `Invited to ${ws.name}`,
                    body: `You were invited to join the workspace "${ws.name}".`,
                    link: `/workspace/${id}`,
                });
            }

            logActivity({
                userId: req.userId,
                workspaceId: id,
                action: 'invited_member',
                entityType: 'invitation',
                metadata: { email: inviteeEmail, username: invUser?.username },
            });

            return res.status(201).json({ ok: true, message: 'Invitation sent.' });
        } catch (err) {
            console.error('Invite error:', err);
            return res.status(500).json({ error: 'Failed to send invitation.' });
        }
    });

    // PATCH /api/workspaces/:id/members/:userId/role — update member role (admin only)
    app.patch('/api/workspaces/:id/members/:userId/role', requireAuthMiddleware, (req, res) => {
        try {
            const workspaceId = parseInt(req.params.id, 10);
            const targetUserId = parseInt(req.params.userId, 10);
            if (isNaN(workspaceId) || isNaN(targetUserId)) return res.status(400).json({ error: 'Invalid ID.' });
            if (!canManageMembers(req.userId, workspaceId)) return res.status(403).json({ error: 'Only admins can change roles.' });
            const { role } = req.body || {};
            const newRole = role === 'admin' || role === 'member' ? role : null;
            if (!newRole) return res.status(400).json({ error: 'Role must be admin or member.' });
            const ok = updateMemberRole(workspaceId, targetUserId, newRole);
            if (!ok) return res.status(400).json({ error: 'Could not update role.' });
            logActivity({ userId: req.userId, workspaceId, action: 'updated_member_role', entityType: 'member', entityId: String(targetUserId), metadata: { role: newRole } });
            return res.json({ ok: true, members: getWorkspaceMembers(workspaceId) });
        } catch (err) {
            console.error('Update role error:', err);
            return res.status(500).json({ error: 'Failed to update role.' });
        }
    });

    // GET /api/workspaces/:id/daily-tasks — list daily tasks (?userId= & ?date= optional)
    app.get('/api/workspaces/:id/daily-tasks', requireAuthMiddleware, (req, res) => {
        try {
            const workspaceId = parseInt(req.params.id, 10);
            if (isNaN(workspaceId)) return res.status(400).json({ error: 'Invalid workspace ID.' });
            if (!hasWorkspaceAccess(req.userId, workspaceId)) return res.status(403).json({ error: 'Access denied.' });
            const userId = req.query.userId ? parseInt(req.query.userId, 10) : null;
            const taskDate = sanitizeStr(req.query.date, 20) || null;
            const tasks = getMemberDailyTasks(workspaceId, isNaN(userId) ? null : userId, taskDate);
            return res.json({ tasks });
        } catch (err) {
            console.error('Daily tasks error:', err);
            return res.status(500).json({ error: 'Failed to load daily tasks.' });
        }
    });

    // POST /api/workspaces/:id/daily-tasks — create daily task (admin only, or member for self)
    app.post('/api/workspaces/:id/daily-tasks', requireAuthMiddleware, (req, res) => {
        try {
            const workspaceId = parseInt(req.params.id, 10);
            if (isNaN(workspaceId)) return res.status(400).json({ error: 'Invalid workspace ID.' });
            if (!hasWorkspaceAccess(req.userId, workspaceId)) return res.status(403).json({ error: 'Access denied.' });
            const { userId: targetUserId, taskText, taskDate } = req.body || {};
            const text = sanitizeStr(taskText, 2000);
            if (!text) return res.status(400).json({ error: 'Task text required.' });
            const date = sanitizeStr(taskDate, 20) || new Date().toISOString().slice(0, 10);
            const userId = targetUserId ? parseInt(targetUserId, 10) : req.userId;
            if (userId !== req.userId && !canManageMembers(req.userId, workspaceId)) return res.status(403).json({ error: 'Only admins can assign tasks to others.' });
            const member = getWorkspaceMembers(workspaceId).find(m => m.id === userId);
            if (!member) return res.status(400).json({ error: 'User is not a workspace member.' });
            const taskId = createMemberDailyTask({ workspaceId, userId, taskText: text, taskDate: date, assignedBy: req.userId });
            const task = getMemberDailyTaskById(taskId);
            return res.status(201).json({ task, taskId });
        } catch (err) {
            console.error('Create daily task error:', err);
            return res.status(500).json({ error: 'Failed to create task.' });
        }
    });

    // PATCH /api/workspaces/:id/daily-tasks/:taskId — update task (assignee can update status)
    app.patch('/api/workspaces/:id/daily-tasks/:taskId', requireAuthMiddleware, (req, res) => {
        try {
            const workspaceId = parseInt(req.params.id, 10);
            const taskId = parseInt(req.params.taskId, 10);
            if (isNaN(workspaceId) || isNaN(taskId)) return res.status(400).json({ error: 'Invalid ID.' });
            if (!hasWorkspaceAccess(req.userId, workspaceId)) return res.status(403).json({ error: 'Access denied.' });
            const task = getMemberDailyTaskById(taskId);
            if (!task || task.workspace_id !== workspaceId) return res.status(404).json({ error: 'Task not found.' });
            const isAdmin = canManageMembers(req.userId, workspaceId);
            const isAssignee = task.user_id === req.userId;
            if (!isAdmin && !isAssignee) return res.status(403).json({ error: 'Access denied.' });
            const { taskText, status } = req.body || {};
            const updates = {};
            if (taskText !== undefined && isAdmin) updates.taskText = taskText;
            if (status !== undefined && (isAdmin || isAssignee)) updates.status = status;
            if (Object.keys(updates).length === 0) return res.json({ task });
            updateMemberDailyTask(taskId, req.userId, updates);
            const updated = getMemberDailyTaskById(taskId);
            return res.json({ task: updated });
        } catch (err) {
            console.error('Update daily task error:', err);
            return res.status(500).json({ error: 'Failed to update task.' });
        }
    });

    // DELETE /api/workspaces/:id/daily-tasks/:taskId — delete task (admin only)
    app.delete('/api/workspaces/:id/daily-tasks/:taskId', requireAuthMiddleware, (req, res) => {
        try {
            const workspaceId = parseInt(req.params.id, 10);
            const taskId = parseInt(req.params.taskId, 10);
            if (isNaN(workspaceId) || isNaN(taskId)) return res.status(400).json({ error: 'Invalid ID.' });
            if (!canManageMembers(req.userId, workspaceId)) return res.status(403).json({ error: 'Only admins can delete tasks.' });
            const task = getMemberDailyTaskById(taskId);
            if (!task) return res.status(404).json({ error: 'Task not found.' });
            deleteMemberDailyTask(taskId, req.userId);
            return res.json({ ok: true });
        } catch (err) {
            console.error('Delete daily task error:', err);
            return res.status(500).json({ error: 'Failed to delete task.' });
        }
    });

    // POST /api/invitations/:id/accept
    app.post('/api/invitations/:id/accept', requireAuthMiddleware, (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) return res.status(400).json({ error: 'Invalid invitation ID.' });

            const ok = acceptInvitation(req.userId, id);
            if (!ok) return res.status(400).json({ error: 'Could not accept invitation.' });

            return res.json({ ok: true });
        } catch (err) {
            console.error('Accept invite error:', err);
            return res.status(500).json({ error: 'Failed to accept invitation.' });
        }
    });

    // POST /api/invitations/:id/reject
    app.post('/api/invitations/:id/reject', requireAuthMiddleware, (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) return res.status(400).json({ error: 'Invalid invitation ID.' });

            rejectInvitation(req.userId, id);
            return res.json({ ok: true });
        } catch (err) {
            console.error('Reject invite error:', err);
            return res.status(500).json({ error: 'Failed to reject invitation.' });
        }
    });

    // GET /api/invitations — list pending invites for current user
    app.get('/api/invitations', requireAuthMiddleware, (req, res) => {
        try {
            const invitations = getInvitationsForUser(req.userId);
            return res.json({ invitations });
        } catch (err) {
            console.error('List invitations error:', err);
            return res.status(500).json({ error: 'Failed to list invitations.' });
        }
    });

    // POST /api/workspaces/:id/projects — create project
    app.post('/api/workspaces/:id/projects', requireAuthMiddleware, (req, res) => {
        try {
            const workspaceId = parseInt(req.params.id, 10);
            if (isNaN(workspaceId)) return res.status(400).json({ error: 'Invalid workspace ID.' });

            if (!hasWorkspaceAccess(req.userId, workspaceId)) {
                console.warn('[projects] Access denied for user', req.userId, 'workspace', workspaceId);
                return res.status(403).json({ error: 'Access denied.' });
            }

            const { title, description, status, canvasId, assignedTo } = req.body || {};
            const titleStr = sanitizeStr(title, 200);
            if (!titleStr) return res.status(400).json({ error: 'Project title is required.' });
            let assignId = assignedTo != null && assignedTo !== '' ? parseInt(assignedTo, 10) : null;
            if (assignId && !getWorkspaceMembers(workspaceId).some(m => m.id === assignId)) assignId = null;

            const projectId = createProject({
                workspaceId,
                title: titleStr,
                description: sanitizeStr(description, 2000),
                status: validateProjectStatus(status),
                canvasId: sanitizeStr(canvasId, 100),
                assignedTo: assignId,
            });

            logActivity({
                userId: req.userId,
                workspaceId,
                projectId,
                action: 'created_project',
                entityType: 'project',
                entityId: String(projectId),
                metadata: { title: titleStr },
            });

            logExecution({ userId: req.userId, projectId, workspaceId, action: 'create_project', score: 5 });

            const project = getProjectWithAssignee(projectId);
            if (!project) {
                console.error('[projects] Created project', projectId, 'but getProjectWithAssignee returned null');
                return res.status(500).json({ error: 'Project created but failed to retrieve.' });
            }
            console.log('[projects] Created project', projectId, 'in workspace', workspaceId);
            return res.status(201).json({ project, id: projectId });
        } catch (err) {
            console.error('Create project error:', err);
            return res.status(500).json({ error: 'Failed to create project.' });
        }
    });

    // PATCH /api/projects/:id — update project
    app.patch('/api/projects/:id', requireAuthMiddleware, (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) return res.status(400).json({ error: 'Invalid project ID.' });

            const project = getProject(id);
            if (!project) return res.status(404).json({ error: 'Project not found.' });

            if (!hasWorkspaceAccess(req.userId, project.workspace_id)) {
                return res.status(403).json({ error: 'Access denied.' });
            }

            const { title, description, status, assignedTo, canvasId } = req.body || {};
            const updates = {};
            if (title !== undefined) updates.title = sanitizeStr(title, 200);
            if (description !== undefined) updates.description = sanitizeStr(description, 2000);
            if (status !== undefined) updates.status = validateProjectStatus(status);
            if (assignedTo !== undefined) {
                const assignId = assignedTo === null || assignedTo === '' ? null : parseInt(assignedTo, 10);
                if (assignId === null || getWorkspaceMembers(project.workspace_id).some(m => m.id === assignId)) {
                    updates.assignedTo = assignId;
                }
            }
            if (canvasId !== undefined) updates.canvasId = sanitizeStr(canvasId, 100) || null;

            updateProject(id, updates);

            const action = updates.assignedTo !== undefined ? 'assigned_project' : (status ? 'updated_project_status' : 'updated_project');
            logActivity({
                userId: req.userId,
                workspaceId: project.workspace_id,
                projectId: id,
                action,
                entityType: 'project',
                entityId: String(id),
                metadata: updates,
            });

            if (status) {
                const scoreMap = { idea: 0, planning: 2, executing: 5, completed: 10 };
                logExecution({ userId: req.userId, projectId: id, workspaceId: project.workspace_id, action: 'status_update', score: scoreMap[status] || 0 });
            }

            return res.json({ project: getProjectWithAssignee(id) });
        } catch (err) {
            console.error('Update project error:', err);
            return res.status(500).json({ error: 'Failed to update project.' });
        }
    });

    // POST /api/canvas/share — store canvas data for chat sharing (auth required)
    app.post('/api/canvas/share', requireAuthMiddleware, (req, res) => {
        try {
            const { name, nodes, edges, writingContent } = req.body || {};
            const data = JSON.stringify({
                nodes: Array.isArray(nodes) ? nodes : [],
                edges: Array.isArray(edges) ? edges : [],
                writingContent: typeof writingContent === 'string' ? writingContent.slice(0, 500000) : '',
            });
            if (data.length > 600000) return res.status(400).json({ error: 'Canvas too large.' });

            const shareId = (crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex')).replace(/-/g, '').slice(0, 24);
            const nameStr = typeof name === 'string' ? name.trim().slice(0, 200) : null;
            createSharedCanvas({ shareId, name: nameStr, data });
            return res.json({ shareId, name: nameStr });
        } catch (err) {
            console.error('Canvas share error:', err);
            return res.status(500).json({ error: 'Failed to share canvas.' });
        }
    });

    // GET /api/canvas/shared/:shareId — fetch shared canvas (no auth, public)
    app.get('/api/canvas/shared/:shareId', (req, res) => {
        const shareId = String(req.params.shareId || '').trim();
        console.log('[canvas] GET /api/canvas/shared/' + shareId);
        try {
            if (!shareId) return res.status(400).json({ error: 'Share ID required.' });
            const row = getSharedCanvas(shareId);
            if (!row) return res.status(404).json({ error: 'Shared canvas not found.' });
            let data;
            try {
                data = JSON.parse(row.data);
            } catch {
                return res.status(500).json({ error: 'Invalid canvas data.' });
            }
            return res.json({ shareId: row.share_id, name: row.name, ...data });
        } catch (err) {
            console.error('Get shared canvas error:', err);
            return res.status(500).json({ error: 'Failed to load canvas.' });
        }
    });

    // GET /api/projects/:id/canvas — load team project canvas (auth, workspace member)
    app.get('/api/projects/:id/canvas', requireAuthMiddleware, (req, res) => {
        try {
            const projectId = parseInt(req.params.id, 10);
            if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid project ID.' });
            const project = getProject(projectId);
            if (!project) return res.status(404).json({ error: 'Project not found.' });
            if (!hasWorkspaceAccess(req.userId, project.workspace_id)) return res.status(403).json({ error: 'Access denied.' });
            const row = getProjectCanvas(projectId);
            if (!row) {
                return res.json({ nodes: [], edges: [], writingContent: '', name: project.title || null });
            }
            let data;
            try {
                data = JSON.parse(row.data);
            } catch {
                return res.status(500).json({ error: 'Invalid canvas data.' });
            }
            return res.json(data);
        } catch (err) {
            console.error('Get project canvas error:', err);
            return res.status(500).json({ error: 'Failed to load canvas.' });
        }
    });

    // POST /api/projects/:id/canvas — save team project canvas (auth, workspace member)
    app.post('/api/projects/:id/canvas', requireAuthMiddleware, (req, res) => {
        try {
            const projectId = parseInt(req.params.id, 10);
            if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid project ID.' });
            const project = getProject(projectId);
            if (!project) return res.status(404).json({ error: 'Project not found.' });
            if (!hasWorkspaceAccess(req.userId, project.workspace_id)) return res.status(403).json({ error: 'Access denied.' });
            const { nodes, edges, writingContent, name } = req.body || {};
            const data = {
                nodes: Array.isArray(nodes) ? nodes : [],
                edges: Array.isArray(edges) ? edges : [],
                writingContent: typeof writingContent === 'string' ? writingContent.slice(0, 500000) : '',
                name: typeof name === 'string' ? name.trim().slice(0, 200) : project.title,
            };
            const dataStr = JSON.stringify(data);
            if (dataStr.length > 600000) return res.status(400).json({ error: 'Canvas too large.' });
            saveProjectCanvas(projectId, dataStr);
            return res.json({ ok: true });
        } catch (err) {
            console.error('Save project canvas error:', err);
            return res.status(500).json({ error: 'Failed to save canvas.' });
        }
    });

    // GET /api/feed — public feed (no auth required for public content)
    app.get('/api/feed', (req, res) => {
        try {
            const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
            const feed = getPublicFeed(limit);
            return res.json(feed);
        } catch (err) {
            console.error('Feed error:', err);
            return res.status(500).json({ error: 'Failed to load feed.' });
        }
    });

    // GET /api/profile/:usernameOrEmail — public profile (looks up by username or email)
    app.get('/api/profile/:username', async (req, res) => {
        try {
            const param = sanitizeStr(req.params.username, 255);
            if (!param) return res.status(400).json({ error: 'Username or email required.' });

            let user = getUserByUsername(param);
            if (!user && param.includes('@')) user = getUserByEmail(param);
            if (!user) return res.status(404).json({ error: 'User not found.' });

            const profile = getProfile(user.id);
            const streak = getExecutionStreak(user.id);
            const progress = getProgressScore(user.id, null, 30);
            const activities = getProfileActivity(user.id, 20);
            const projects = getProfileProjects(user.id, 20);

            let canChat = false;
            const authHeader = req.headers.authorization;
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.slice(7).trim();
                const clerk = req.app.locals?.clerk;
                if (clerk && token) {
                    try {
                        const payloadB64 = token.split('.')[1];
                        if (payloadB64) {
                            const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
                            const clerkId = decoded.sub;
                            if (clerkId) {
                                const clerkUser = await clerk.users.getUser(clerkId);
                                const viewerId = getOrCreateUser(clerkUser);
                                canChat = viewerId !== user.id && doUsersShareWorkspace(viewerId, user.id);
                            }
                        }
                    } catch { /* ignore */ }
                }
            }

            return res.json({
                user: { id: user.id, username: user.username, email: user.email ? undefined : null, created_at: user.created_at },
                profile: profile || { bio: null, avatar_url: null },
                streak,
                progress,
                activities,
                projects,
                canChat,
            });
        } catch (err) {
            console.error('Profile error:', err);
            return res.status(500).json({ error: 'Failed to load profile.' });
        }
    });

    // GET /api/me — current user profile + streak + progress
    app.get('/api/me', requireAuthMiddleware, (req, res) => {
        try {
            const user = getUserById(req.userId);
            const profile = getProfile(req.userId);
            const streak = getExecutionStreak(req.userId);
            const progress = getProgressScore(req.userId, null, 30);
            const invitations = getInvitationsForUser(req.userId);
            const activities = getProfileActivity(req.userId, 20);
            const projects = getProfileProjects(req.userId, 20);

            return res.json({
                user: { id: user.id, username: user.username, email: user.email, created_at: user.created_at },
                profile: profile || { bio: null },
                streak,
                progress,
                invitations,
                activities,
                projects,
            });
        } catch (err) {
            console.error('Me error:', err);
            return res.status(500).json({ error: 'Failed to load profile.' });
        }
    });

    // PATCH /api/me/profile — update own profile
    app.patch('/api/me/profile', requireAuthMiddleware, (req, res) => {
        try {
            const { bio } = req.body || {};
            updateProfile(req.userId, { bio: sanitizeStr(bio, 500) });
            return res.json({ ok: true, profile: getProfile(req.userId) });
        } catch (err) {
            console.error('Update profile error:', err);
            return res.status(500).json({ error: 'Failed to update profile.' });
        }
    });

    // POST /api/execution — log execution (for streaks)
    app.post('/api/execution', requireAuthMiddleware, (req, res) => {
        try {
            const { projectId, workspaceId, action, score } = req.body || {};
            logExecution({
                userId: req.userId,
                projectId: projectId ? parseInt(projectId, 10) : null,
                workspaceId: workspaceId ? parseInt(workspaceId, 10) : null,
                action: sanitizeStr(action, 50) || 'manual',
                score: typeof score === 'number' ? Math.min(100, Math.max(0, score)) : 5,
            });
            const streak = getExecutionStreak(req.userId, projectId ? parseInt(projectId, 10) : null);
            return res.json({ ok: true, streak });
        } catch (err) {
            console.error('Log execution error:', err);
            return res.status(500).json({ error: 'Failed to log execution.' });
        }
    });

    // GET /api/notifications
    app.get('/api/notifications', requireAuthMiddleware, (req, res) => {
        try {
            const unreadOnly = req.query.unread === 'true';
            const notifications = getNotifications(req.userId, unreadOnly);
            return res.json({ notifications });
        } catch (err) {
            console.error('Notifications error:', err);
            return res.status(500).json({ error: 'Failed to load notifications.' });
        }
    });

    // POST /api/notifications/:id/read
    app.post('/api/notifications/:id/read', requireAuthMiddleware, (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) return res.status(400).json({ error: 'Invalid notification ID.' });
            markNotificationRead(id, req.userId);
            return res.json({ ok: true });
        } catch (err) {
            console.error('Mark read error:', err);
            return res.status(500).json({ error: 'Failed to mark as read.' });
        }
    });
}
