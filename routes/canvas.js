/**
 * Canvas share API: store and retrieve shared canvas data for chat
 */

import crypto from 'crypto';
import { createSharedCanvas, getSharedCanvas } from '../db/models.js';
import { requireClerkAuth as requireAuthMiddleware } from '../middleware/requireClerkAuth.js';

export function registerCanvasRoutes(app, clerkClient) {
    app.locals.clerk = clerkClient;

    // POST /api/canvas/share — store canvas data, return shareId (auth required)
    app.post('/api/canvas/share', requireAuthMiddleware, async (req, res) => {
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
            await createSharedCanvas({ shareId, name: nameStr, data });
            return res.json({ shareId, name: nameStr });
        } catch (err) {
            console.error('Canvas share error:', err);
            return res.status(500).json({ error: 'Failed to share canvas.' });
        }
    });

    // GET /api/canvas/shared/:shareId — fetch shared canvas (no auth, public)
    app.get('/api/canvas/shared/:shareId', async (req, res) => {
        try {
            const shareId = String(req.params.shareId || '').trim();
            if (!shareId) return res.status(400).json({ error: 'Share ID required.' });
            const row = await getSharedCanvas(shareId);
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
}
