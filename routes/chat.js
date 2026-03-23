/**
 * Chat API: user search, chats, messages, file upload
 */

import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '../uploads/chat');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = (path.extname(file.originalname) || '.bin').toLowerCase().slice(0, 8);
        const safe = `${Date.now()}_${(req.userId || 'anon')}_${Math.random().toString(36).slice(2, 10)}${ext}`;
        cb(null, safe);
    },
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|gif|webp|pdf|doc|docx|xls|xlsx|txt|md)$/i.test(file.originalname) ||
            /^image\//.test(file.mimetype) || /^(application\/pdf|text\/)/.test(file.mimetype);
        cb(null, !!allowed);
    },
});

import {
    getOrCreateUser,
    getUserById,
    getUsersWhoShareWorkspaceWith,
    searchUsersForChat,
    doUsersShareWorkspace,
    getOrCreateDirectChat,
    getChatsForUser,
    getChatWithParticipants,
    getMessages,
    createMessage,
    getMessage,
    markChatRead,
    getUnreadCount,
} from '../db/models.js';

async function requireAuthMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }
    const token = authHeader.slice(7).trim();
    const clerk = req.app.locals?.clerk;
    if (!clerk) return res.status(503).json({ error: 'Auth not configured.' });

    try {
        const payloadB64 = token.split('.')[1];
        if (!payloadB64) throw new Error('Malformed token.');
        const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
        const clerkId = decoded.sub;
        if (!clerkId) throw new Error('No sub claim.');
        const clerkUser = await clerk.users.getUser(clerkId);
        req.userId = getOrCreateUser(clerkUser);
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token.' });
    }
}

function sanitize(str, max = 10000) {
    return str == null ? '' : String(str).trim().slice(0, max);
}

export function registerChatRoutes(app, clerkClient) {
    app.locals.clerk = clerkClient;

    // GET /api/users/chatable — list all users you can chat with (share a workspace)
    app.get('/api/users/chatable', requireAuthMiddleware, (req, res) => {
        try {
            const users = getUsersWhoShareWorkspaceWith(req.userId, 100);
            return res.json({ users });
        } catch (err) {
            console.error('Chatable users error:', err);
            return res.status(500).json({ error: 'Failed to load users.' });
        }
    });

    // GET /api/users/discover?q=username — search users (only workspace members + feed people)
    app.get('/api/users/discover', requireAuthMiddleware, (req, res) => {
        try {
            const q = sanitize(req.query.q, 50);
            if (!q || q.length < 2) {
                return res.json({ users: [] });
            }
            const users = searchUsersForChat(q, req.userId, 30);
            return res.json({ users });
        } catch (err) {
            console.error('Discover error:', err);
            return res.status(500).json({ error: 'Discover failed.' });
        }
    });

    // GET /api/users/search?q=username — only returns users who share a workspace (request-accepted)
    app.get('/api/users/search', requireAuthMiddleware, (req, res) => {
        try {
            const q = sanitize(req.query.q, 50);
            if (!q || q.length < 2) {
                return res.json({ users: [] });
            }
            const users = searchUsersForChat(q, req.userId, 20);
            return res.json({ users });
        } catch (err) {
            console.error('Search error:', err);
            return res.status(500).json({ error: 'Search failed.' });
        }
    });

    // GET /api/chats - list user's chats (only with users who share a workspace)
    app.get('/api/chats', requireAuthMiddleware, (req, res) => {
        try {
            const chats = getChatsForUser(req.userId);
            const enriched = chats
                .map(c => {
                    const detail = getChatWithParticipants(c.id, req.userId);
                    const unread = getUnreadCount(c.id, req.userId);
                    return { ...c, ...detail, unread };
                })
                .filter(c => {
                    const otherId = c.otherUser?.id;
                    return !otherId || doUsersShareWorkspace(req.userId, otherId);
                });
            return res.json({ chats: enriched });
        } catch (err) {
            console.error('Chats error:', err);
            return res.status(500).json({ error: 'Failed to load chats.' });
        }
    });

    // POST /api/chats/direct - create or get direct chat (only with users who share a workspace)
    app.post('/api/chats/direct', requireAuthMiddleware, (req, res) => {
        try {
            const { userId } = req.body || {};
            const otherId = parseInt(userId, 10);
            if (isNaN(otherId) || otherId === req.userId) {
                return res.status(400).json({ error: 'Invalid user.' });
            }
            const other = getUserById(otherId);
            if (!other) return res.status(404).json({ error: 'User not found.' });
            if (!doUsersShareWorkspace(req.userId, otherId)) {
                return res.status(403).json({ error: 'You can only chat with workspace members. Invite them to a workspace first.' });
            }

            const chatId = getOrCreateDirectChat(req.userId, otherId);
            const chat = getChatWithParticipants(chatId, req.userId);
            return res.json({ chat, chatId });
        } catch (err) {
            console.error('Create chat error:', err);
            return res.status(500).json({ error: 'Failed to create chat.' });
        }
    });

    // GET /api/chats/:id - get chat
    app.get('/api/chats/:id', requireAuthMiddleware, (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) return res.status(400).json({ error: 'Invalid chat.' });
            const chat = getChatWithParticipants(id, req.userId);
            if (!chat) return res.status(404).json({ error: 'Chat not found.' });
            const unread = getUnreadCount(id, req.userId);
            return res.json({ chat, unread });
        } catch (err) {
            console.error('Get chat error:', err);
            return res.status(500).json({ error: 'Failed to load chat.' });
        }
    });

    // GET /api/chats/:id/messages - get messages
    app.get('/api/chats/:id/messages', requireAuthMiddleware, (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) return res.status(400).json({ error: 'Invalid chat.' });
            const beforeId = req.query.before ? parseInt(req.query.before, 10) : null;
            const messages = getMessages(id, req.userId, beforeId || undefined, 50);
            return res.json({ messages });
        } catch (err) {
            console.error('Messages error:', err);
            return res.status(500).json({ error: 'Failed to load messages.' });
        }
    });

    // POST /api/chat/upload - upload photo or file for chat
    app.post('/api/chat/upload', requireAuthMiddleware, upload.single('file'), (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ error: 'No file provided.' });
            const url = `/uploads/chat/${req.file.filename}`;
            return res.json({ url, filename: req.file.originalname });
        } catch (err) {
            console.error('Upload error:', err);
            return res.status(500).json({ error: 'Upload failed.' });
        }
    });

    // POST /api/chats/:id/messages - send message
    app.post('/api/chats/:id/messages', requireAuthMiddleware, (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) return res.status(400).json({ error: 'Invalid chat.' });
            const { content, replyToId, canvasId, canvasName, highlightText, type, fileUrl, fileName, projectId, projectTitle, workspaceId, workspaceName, shareId } = req.body || {};
            const text = sanitize(content, 10000);
            const msgType = type === 'image' || type === 'file' ? type : 'text';
            const contentOrUrl = msgType === 'text' ? text : sanitize(fileUrl, 500);
            if (msgType === 'text' && !contentOrUrl) return res.status(400).json({ error: 'Message content required.' });
            if ((msgType === 'image' || msgType === 'file') && !contentOrUrl) return res.status(400).json({ error: 'File URL required for image/file message.' });

            const metadata = {};
            if (canvasId) metadata.canvasId = String(canvasId).slice(0, 100);
            if (canvasName) metadata.canvasName = sanitize(canvasName, 200);
            if (highlightText) metadata.highlightText = sanitize(highlightText, 500);
            if (projectId) metadata.projectId = parseInt(projectId, 10);
            if (projectTitle) metadata.projectTitle = sanitize(projectTitle, 200);
            if (workspaceId) metadata.workspaceId = parseInt(workspaceId, 10);
            if (workspaceName) metadata.workspaceName = sanitize(workspaceName, 200);
            if (req.body?.canvasId) metadata.canvasId = sanitize(req.body.canvasId, 100);
            if (shareId) metadata.shareId = sanitize(shareId, 50);
            if (fileName) metadata.fileName = sanitize(fileName, 200);

            const msgId = createMessage(id, req.userId, contentOrUrl || '[file]', msgType, replyToId || null, Object.keys(metadata).length ? metadata : null);
            if (!msgId) return res.status(403).json({ error: 'Not found or access denied.' });

            const msg = getMessage(msgId);
            const io = req.app.locals?.io;
            if (io) {
                const chat = getChatWithParticipants(id, req.userId);
                const recipientIds = (chat?.participants || []).filter(p => p.id !== req.userId).map(p => p.id);
                recipientIds.forEach(uid => io.to(`user:${uid}`).emit('chat:message', { chatId: id, message: msg }));
                io.to(`chat:${id}`).emit('chat:message', { chatId: id, message: msg });
            }
            return res.status(201).json({ message: msg, id: msgId });
        } catch (err) {
            console.error('Send error:', err);
            return res.status(500).json({ error: 'Failed to send message.' });
        }
    });

    // POST /api/chats/:id/read - mark as read
    app.post('/api/chats/:id/read', requireAuthMiddleware, (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) return res.status(400).json({ error: 'Invalid chat.' });
            markChatRead(id, req.userId);
            return res.json({ ok: true });
        } catch (err) {
            return res.status(500).json({ error: 'Failed to mark read.' });
        }
    });
}
