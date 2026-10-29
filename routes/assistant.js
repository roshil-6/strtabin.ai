import { getProfileProjects } from '../db/models.js';
import rateLimit from 'express-rate-limit';
import { requireClerkAuth } from '../middleware/requireClerkAuth.js';
import { askProvider } from '../lib/assistant.js';
import { createLiveSession } from '../lib/liveVoice.js';
import { sashaAccess, reserveSashaUsage, SASHA_TEXT_MODEL, SASHA_VOICE_MODEL, SASHA_LIMITS } from '../lib/sashaAccess.js';

export function registerAssistantRoutes(app, { auth = requireClerkAuth, ask = askProvider, live = createLiveSession, access = sashaAccess, reserve = reserveSashaUsage, key = () => process.env.GEMINI_API_KEY?.trim() } = {}) {
    app.get('/api/assistant/projects', auth, async (req,res) => {
        res.set('Cache-Control','no-store');
        try {res.json({projects:await getProfileProjects(req.userId,500)});} catch {res.status(503).json({error:'Could not load your projects.'});}
    });
    app.get('/api/assistant/status', auth, async (req, res) => {
        res.set('Cache-Control', 'no-store');
        try { res.json({ ...await access(req), limits: SASHA_LIMITS, textModel: SASHA_TEXT_MODEL, voiceModel: SASHA_VOICE_MODEL }); }
        catch { res.status(503).json({ error: 'Could not check Sasha access. Please retry.' }); }
    });
    for (const kind of ['chat', 'voice']) {
        app.post(kind === 'chat' ? '/api/assistant/chat' : '/api/assistant/voice/session', auth,
            rateLimit({windowMs:60000, limit:kind === 'chat' ? 15 : 3, standardHeaders:true, legacyHeaders:false}), async (req, res) => {
            res.set('Cache-Control', 'no-store');
            const { message, context, history = [], name = '' } = req.body || {};
            const model = kind === 'chat' ? SASHA_TEXT_MODEL : SASHA_VOICE_MODEL;
            if ((req.body?.model && req.body.model !== model) || (req.body?.provider && req.body.provider !== 'gemini') || req.body?.apiKey) return res.status(400).json({error:'Sasha uses the managed Gemini connection. Custom keys and models are not accepted.'});
            if (typeof context !== 'string' || context.length > 24000 || typeof name !== 'string' || name.length > 40 ||
                (kind === 'chat' && (typeof message !== 'string' || !message.trim() || message.length > 3000 || !Array.isArray(history) || history.length > 8 || history.some(item => !item || !['user','assistant'].includes(item.role) || typeof item.text !== 'string' || item.text.length > 3000)))) return res.status(400).json({error:'Shorten your request or project context and try again.'});
            try {
                const status = await access(req);
                if (!status.pro) return res.status(403).json({error:'Sasha is included with Pro. Your own AI capsule workspace is still available.', code:'PRO_REQUIRED'});
                const apiKey = key();
                if (!status.configured || !apiKey) return res.status(503).json({error:'Sasha is not configured on the server yet.'});
                if (!await reserve(req.userId, kind)) return res.status(429).json({error:`Your daily Sasha ${kind === 'chat' ? 'request' : 'voice session'} allowance is used. It resets at midnight UTC. You can still use project capsules.`});
                const input = {provider:'gemini', apiKey, model, message, context, history, name};
                const result = kind === 'chat' ? await ask(input) : await live(input);
                res.json(kind === 'voice' ? {...result,maxSeconds:180} : result);
            } catch (error) {
                if (error.name === 'TimeoutError' || [429,503,504].includes(error.status)) return res.status(503).json({error:'Gemini is temporarily busy or took too long. Please try later. No project actions were applied.'});
                if (error.status === 404) return res.status(503).json({error:'The configured Sasha model is unavailable. Please contact support. No alternate model was used.'});
                res.status(502).json({error:'Sasha could not connect. Please retry later. No project actions were applied.'});
            }
        });
    }
}
