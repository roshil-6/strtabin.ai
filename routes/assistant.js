import { getProfileProjects } from '../db/models.js';
import rateLimit from 'express-rate-limit';
import { requireClerkAuth } from '../middleware/requireClerkAuth.js';
import { askProvider, generateReport, extractReportFromImages, REPORT_CONTEXT_LIMIT, EXTRACT_MAX_IMAGES, EXTRACT_IMAGE_LIMIT } from '../lib/assistant.js';
import { createLiveSession } from '../lib/liveVoice.js';
import { sashaAccess, reserveSashaUsage, sashaRemaining, SASHA_TEXT_MODEL, SASHA_VOICE_MODEL, SASHA_LIMITS } from '../lib/sashaAccess.js';

/**
 * Per-account burst limits (the daily Sasha allowance is the real cap). Keyed by the signed-in user, not the IP:
 * behind a proxy every user can share one IP, which made one person's retries block everyone else's Sasha.
 */
export const SASHA_BURST = { chat: 12, voice: 5, reports: 5 };
const perUser = (limit, message) => rateLimit({ windowMs: 60000, limit, standardHeaders: true, legacyHeaders: false, keyGenerator: req => `sasha:${req.userId}`, message: { error: message } });

export function registerAssistantRoutes(app, { auth = requireClerkAuth, ask = askProvider, report = generateReport, extract = extractReportFromImages, reportsPerMinute = SASHA_BURST.reports, live = createLiveSession, access = sashaAccess, reserve = reserveSashaUsage, remaining = sashaRemaining, key = () => process.env.GEMINI_API_KEY?.trim() } = {}) {
    app.get('/api/assistant/projects', auth, async (req,res) => {
        res.set('Cache-Control','no-store');
        try {res.json({projects:await getProfileProjects(req.userId,500)});} catch {res.status(503).json({error:'Could not load your projects.'});}
    });
    app.get('/api/assistant/status', auth, async (req, res) => {
        res.set('Cache-Control', 'no-store');
        try {
            const left = await remaining(req.userId).catch(() => null);
            res.json({ ...await access(req), limits: SASHA_LIMITS, ...(left ? { remaining: left } : {}), textModel: SASHA_TEXT_MODEL, voiceModel: SASHA_VOICE_MODEL });
        }
        catch { res.status(503).json({ error: 'Could not check Sasha access. Please retry.' }); }
    });
    for (const kind of ['chat', 'voice']) {
        app.post(kind === 'chat' ? '/api/assistant/chat' : '/api/assistant/voice/session', auth,
            perUser(SASHA_BURST[kind], kind === 'chat' ? 'You are sending messages quickly. Wait a few seconds and try again.' : 'Too many voice starts in a minute. Wait a moment, then tap Sasha again.'), async (req, res) => {
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
                const used = await reserve(req.userId, kind);
                if (!used) return res.status(429).json({error:`Your daily Sasha ${kind === 'chat' ? 'request' : 'voice session'} allowance is used. It resets at midnight UTC. You can still use project capsules.`});
                const input = {provider:'gemini', apiKey, model, message, context, history, name};
                const result = kind === 'chat' ? await ask(input) : await live(input);
                const left = typeof used === 'number' ? { remaining: Math.max(0, SASHA_LIMITS[kind] - used) } : {};
                res.json(kind === 'voice' ? {...result,maxSeconds:180,...left} : {...result,...left});
            } catch (error) {
                if (error.name === 'TimeoutError' || [429,503,504].includes(error.status)) return res.status(503).json({error:'Gemini is temporarily busy or took too long. Please try later. No project actions were applied.'});
                if (error.status === 404) return res.status(503).json({error:'The configured Sasha model is unavailable. Please contact support. No alternate model was used.'});
                res.status(502).json({error:'Sasha could not connect. Please retry later. No project actions were applied.'});
            }
        });
    }
    // In-app project reports share the daily Sasha chat allowance: one report uses one request.
    app.post('/api/assistant/report', auth, perUser(reportsPerMinute, 'Too many reports in a minute. Wait a moment and try again.'), async (req, res) => {
        res.set('Cache-Control', 'no-store');
        const { instruction, context, name = '' } = req.body || {};
        if (req.body?.model || req.body?.apiKey || req.body?.provider) return res.status(400).json({error:'Reports use the managed Gemini connection. Custom keys and models are not accepted.'});
        if (typeof instruction !== 'string' || !instruction.trim() || instruction.length > 5000) return res.status(400).json({error:'Describe the report you want in up to 5,000 characters.'});
        if (typeof context !== 'string' || !context.trim() || context.length > REPORT_CONTEXT_LIMIT || typeof name !== 'string' || name.length > 40) return res.status(400).json({error:'This project is too large for one report. Turn off some sections (such as code files) and try again.', code:'CONTEXT_TOO_LARGE'});
        try {
            const status = await access(req);
            if (!status.pro) return res.status(403).json({error:'In-app reports are included with Pro. You can still copy your project to your own AI.', code:'PRO_REQUIRED'});
            const apiKey = key();
            if (!status.configured || !apiKey) return res.status(503).json({error:'In-app reports are not configured on the server yet.'});
            const used = await reserve(req.userId, 'chat');
            if (!used) return res.status(429).json({error:'Your daily Sasha allowance is used. It resets at midnight UTC. You can still copy your project to your own AI.', code:'LIMIT_REACHED'});
            const result = await report({ apiKey, model: SASHA_TEXT_MODEL, instruction: instruction.trim(), context, name });
            res.json({ ...result, ...(typeof used === 'number' ? { remaining: Math.max(0, SASHA_LIMITS.chat - used) } : {}) });
        } catch (error) {
            if (error.name === 'TimeoutError' || [429,503,504].includes(error.status)) return res.status(503).json({error:'Gemini is busy or took too long. Please try again shortly.'});
            res.status(502).json({error:'The report could not be generated. Please try again later.'});
        }
    });
    // Reading report screenshots with the managed model also uses one Sasha chat request.
    app.post('/api/assistant/report/extract', auth, perUser(reportsPerMinute, 'Too many reports in a minute. Wait a moment and try again.'), async (req, res) => {
        res.set('Cache-Control', 'no-store');
        const { images } = req.body || {};
        if (req.body?.model || req.body?.apiKey || req.body?.provider) return res.status(400).json({error:'Screenshot reading uses the managed Gemini connection. Custom keys and models are not accepted.'});
        if (!Array.isArray(images) || !images.length || images.length > EXTRACT_MAX_IMAGES || images.some(image => !image || !['image/jpeg', 'image/png', 'image/webp'].includes(image.mimeType) || typeof image.data !== 'string' || !image.data || image.data.length > EXTRACT_IMAGE_LIMIT || !/^[A-Za-z0-9+/=]+$/.test(image.data)))
            return res.status(400).json({error:`Add 1 to ${EXTRACT_MAX_IMAGES} PNG, JPEG or WebP screenshots.`});
        try {
            const status = await access(req);
            if (!status.pro) return res.status(403).json({error:'Reading screenshots with Stratabin AI is included with Pro. You can still extract text without AI.', code:'PRO_REQUIRED'});
            const apiKey = key();
            if (!status.configured || !apiKey) return res.status(503).json({error:'Screenshot reading is not configured on the server yet. You can still extract text without AI.'});
            const used = await reserve(req.userId, 'chat');
            if (!used) return res.status(429).json({error:'Your daily Sasha allowance is used. It resets at midnight UTC. You can still extract text without AI.', code:'LIMIT_REACHED'});
            const result = await extract({ apiKey, model: SASHA_TEXT_MODEL, images: images.map(image => ({ mimeType: image.mimeType, data: image.data })) });
            const left = typeof used === 'number' ? { remaining: Math.max(0, SASHA_LIMITS.chat - used) } : {};
            if (!result.content) return res.status(422).json({error:'No readable report was found in these screenshots. Try clearer screenshots or extract without AI.', ...left});
            res.json({ ...result, ...left });
        } catch (error) {
            if (error.name === 'TimeoutError' || [429,503,504].includes(error.status)) return res.status(503).json({error:'Gemini is busy or took too long. Please try again shortly.'});
            res.status(502).json({error:'The screenshots could not be read. Please try again, or extract without AI.'});
        }
    });
}
