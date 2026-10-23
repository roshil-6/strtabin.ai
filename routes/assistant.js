import rateLimit from 'express-rate-limit';
import { requireClerkAuth } from '../middleware/requireClerkAuth.js';
import { askProvider } from '../lib/assistant.js';
import { createLiveSession } from '../lib/liveVoice.js';

export function registerAssistantRoutes(app, { auth = requireClerkAuth, ask = askProvider, live = createLiveSession } = {}) {
    app.post('/api/assistant/voice/session', auth, rateLimit({ windowMs: 60000, limit: 5, standardHeaders: true, legacyHeaders: false }), async (req, res) => {
        res.set('Cache-Control', 'no-store');
        const { provider, apiKey, model, name = '', context } = req.body || {};
        if (!['openai', 'gemini'].includes(provider) || typeof apiKey !== 'string' || apiKey.length < 10 || apiKey.length > 512 || /\s/.test(apiKey) || typeof model !== 'string' || !/^[a-zA-Z0-9._-]{1,100}$/.test(model) || typeof name !== 'string' || name.length > 40 || typeof context !== 'string' || context.length > 24000) return res.status(400).json({ error: 'Check voice connection details and project size.' });
        try { res.json(await live({ provider, apiKey, model, name, context })); }
        catch { res.status(502).json({ error: 'Live voice could not connect. Check the key, selected voice model and API billing. No changes were made.' }); }
    });
    app.post('/api/assistant/chat', auth, rateLimit({ windowMs: 60000, limit: 15, standardHeaders: true, legacyHeaders: false }), async (req, res) => {
        res.set('Cache-Control', 'no-store');
        const { provider, apiKey, model, message, context, history = [], name = '' } = req.body || {};
        if (!['gemini', 'openai'].includes(provider) || typeof apiKey !== 'string' || apiKey.length < 10 || apiKey.length > 512 || /\s/.test(apiKey)
            || typeof model !== 'string' || !/^[a-zA-Z0-9._-]{1,100}$/.test(model)
            || typeof message !== 'string' || !message.trim() || message.length > 3000
            || typeof context !== 'string' || context.length > 24000
            || typeof name !== 'string' || name.length > 40
            || !Array.isArray(history) || history.length > 8 || history.some(item => !item || !['user', 'assistant'].includes(item.role) || typeof item.text !== 'string' || item.text.length > 3000)) {
            return res.status(400).json({ error: 'Check your connection details and shorten the request or project context.' });
        }
        try {
            return res.json(await ask({ provider, apiKey, model, message, context, history, name }));
        } catch (error) {
            // Never log request bodies, credentials or raw provider responses.
            return res.status(502).json({ error: error.name === 'TimeoutError' ? 'The provider took too long. Please retry.' : error.message?.startsWith('The ') || error.message?.startsWith('This ') || error.message?.startsWith('Model ') || error.message?.startsWith('Provider ') ? error.message : 'Could not reach the AI provider. Check your connection and retry.' });
        }
    });
}
