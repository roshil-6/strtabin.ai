import rateLimit from 'express-rate-limit';
import { qAll, qGet, qRun } from '../db/driver.js';
import { requireClerkAuth } from '../middleware/requireClerkAuth.js';
import { reminderInput, pushConfig, validateSubscription, endpointHash } from '../lib/reminders.js';

export function registerReminderRoutes(app, { auth = requireClerkAuth } = {}) {
    app.use('/api/assistant/reminders', auth, rateLimit({ windowMs: 60000, limit: 60, standardHeaders: true, legacyHeaders: false }), (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
    app.get('/api/assistant/reminders', async (req, res) => {
        try {
            const reminders = await qAll('SELECT id, title, project_id, start_date, local_time, timezone, repeat_kind, due_at, enabled, last_delivery, last_error FROM assistant_reminders WHERE user_id = ? ORDER BY due_at LIMIT 200', [req.userId]);
            const config = pushConfig();
            const count = await qGet('SELECT COUNT(*) AS count FROM assistant_push_subscriptions WHERE user_id = ?', [req.userId]);
            res.json({ reminders, pushReady: config.ready, publicKey: config.publicKey, devices: count.count });
        } catch { res.status(503).json({ error: 'Reminders could not load. Check the backend connection.' }); }
    });
    app.post('/api/assistant/reminders/batch', async (req, res) => {
        let items;
        try {
            if (!Array.isArray(req.body?.items) || req.body.items.length < 1 || req.body.items.length > 5) throw new Error('Invalid reminder batch.');
            items = req.body.items.map(item => reminderInput(item));
            if (new Set(items.map(item => item.id)).size !== items.length) throw new Error('Duplicate reminder identifier.');
        } catch (error) { return res.status(400).json({ error: error.message }); }
        try {
            for (const item of items) {
                const existing = await qGet('SELECT * FROM assistant_reminders WHERE id = ?', [item.id]);
                if (existing && (existing.user_id !== req.userId || existing.title !== item.title || existing.start_date !== item.date || existing.local_time !== item.time || existing.timezone !== item.timezone || existing.repeat_kind !== item.repeat || existing.project_id !== item.projectId)) return res.status(409).json({ error: 'A reminder identifier conflicts with an earlier request.' });
            }
            const count = await qGet('SELECT COUNT(*) AS count FROM assistant_reminders WHERE user_id = ?', [req.userId]);
            if (count.count + items.length > 200) return res.status(409).json({ error: 'Remove old reminders before adding more.' });
            const values = items.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
            await qRun(`INSERT INTO assistant_reminders (id, user_id, title, project_id, start_date, local_time, timezone, repeat_kind, due_at) VALUES ${values} ON CONFLICT(id) DO NOTHING`, items.flatMap(item => [item.id, req.userId, item.title, item.projectId, item.date, item.time, item.timezone, item.repeat, item.dueAt]));
            res.json({ ok: true, ids: items.map(item => item.id) });
        } catch { res.status(503).json({ error: 'Could not confirm reminder save. Retry the same action; it will not create duplicates.' }); }
    });
    app.delete('/api/assistant/reminders/batch/remove', async (req, res) => {
        const ids = req.body?.ids;
        if (!Array.isArray(ids) || ids.length < 1 || ids.length > 5 || ids.some(id => typeof id !== 'string' || id.length > 100)) return res.status(400).json({ error: 'Invalid reminder identifiers.' });
        try { await qRun(`DELETE FROM assistant_reminders WHERE user_id = ? AND id IN (${ids.map(() => '?').join(',')})`, [req.userId, ...ids]); res.json({ ok: true }); }
        catch { res.status(503).json({ error: 'Could not cancel reminders. Retry before undoing local tasks.' }); }
    });
    app.post('/api/assistant/reminders', async (req, res) => {
        let input;
        try { input = reminderInput(req.body); } catch (error) { return res.status(400).json({ error: error.message }); }
        try {
            const existing = await qGet('SELECT * FROM assistant_reminders WHERE id = ?', [input.id]);
            if (existing) {
                if (existing.user_id !== req.userId) return res.status(409).json({ error: 'Reminder identifier is already in use.' });
                if (existing.title !== input.title || existing.start_date !== input.date || existing.local_time !== input.time || existing.timezone !== input.timezone || existing.repeat_kind !== input.repeat || existing.project_id !== input.projectId) return res.status(409).json({ error: 'Reminder request changed. Create a new reminder.' });
                return res.json({ ok: true, id: existing.id });
            }
            const count = await qGet('SELECT COUNT(*) AS count FROM assistant_reminders WHERE user_id = ?', [req.userId]);
            if (count.count >= 200) return res.status(409).json({ error: 'You have 200 reminders. Remove old reminders before adding another.' });
            await qRun('INSERT INTO assistant_reminders (id, user_id, title, project_id, start_date, local_time, timezone, repeat_kind, due_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING', [input.id, req.userId, input.title, input.projectId, input.date, input.time, input.timezone, input.repeat, input.dueAt]);
            const saved = await qGet('SELECT user_id FROM assistant_reminders WHERE id = ?', [input.id]);
            if (saved?.user_id !== req.userId) return res.status(409).json({ error: 'Reminder identifier is already in use.' });
            res.status(201).json({ ok: true, id: input.id });
        } catch { res.status(503).json({ error: 'Could not save reminder. Retry with the same request.' }); }
    });
    app.delete('/api/assistant/reminders/:id', async (req, res) => {
        try { await qRun('DELETE FROM assistant_reminders WHERE id = ? AND user_id = ?', [req.params.id, req.userId]); res.json({ ok: true }); }
        catch { res.status(503).json({ error: 'Could not cancel reminder.' }); }
    });
    app.post('/api/assistant/reminders/push', async (req, res) => {
        if (!pushConfig().ready) return res.status(503).json({ error: 'Background notifications need server setup first.' });
        let subscription;
        try { subscription = validateSubscription(req.body); } catch { return res.status(400).json({ error: 'Invalid or unsupported browser push subscription.' }); }
        try {
            const hash = endpointHash(subscription.endpoint);
            const existing = await qGet('SELECT user_id FROM assistant_push_subscriptions WHERE endpoint_hash = ?', [hash]);
            if (existing && existing.user_id !== req.userId) return res.status(409).json({ error: 'This browser is linked to a different account. Disable its notifications and enable them again.' });
            const count = await qGet('SELECT COUNT(*) AS count FROM assistant_push_subscriptions WHERE user_id = ?', [req.userId]);
            if (!existing && count.count >= 8) return res.status(409).json({ error: 'Eight devices are already subscribed. Disable notifications on an old device first.' });
            await qRun('INSERT INTO assistant_push_subscriptions (endpoint_hash, user_id, subscription_json) VALUES (?, ?, ?) ON CONFLICT(endpoint_hash) DO UPDATE SET subscription_json = excluded.subscription_json WHERE assistant_push_subscriptions.user_id = excluded.user_id', [hash, req.userId, JSON.stringify(subscription)]);
            res.json({ ok: true });
        } catch { res.status(503).json({ error: 'Could not register this device.' }); }
    });
    app.delete('/api/assistant/reminders/push/device', async (req, res) => {
        if (typeof req.body?.endpoint !== 'string') return res.status(400).json({ error: 'Device endpoint is required.' });
        try { await qRun('DELETE FROM assistant_push_subscriptions WHERE endpoint_hash = ? AND user_id = ?', [endpointHash(req.body.endpoint), req.userId]); res.json({ ok: true }); }
        catch { res.status(503).json({ error: 'Could not remove this device.' }); }
    });
}
