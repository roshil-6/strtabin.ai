import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { createClerkClient } from '@clerk/backend';

dotenv.config();

// ─── Startup Validation ────────────────────────────────────────────────────
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CLERK_SECRET_KEY  = process.env.CLERK_SECRET_KEY;
const PORT = process.env.PORT || 3001;

if (!ANTHROPIC_API_KEY) {
    console.error('⛔ CRITICAL: ANTHROPIC_API_KEY is not set. AI features will fail.');
}
if (!CLERK_SECRET_KEY) {
    console.warn('⚠️  WARNING: CLERK_SECRET_KEY is not set. Token verification is disabled.');
}

// ─── Clerk Client (for token verification) ────────────────────────────────
const clerk = CLERK_SECRET_KEY
    ? createClerkClient({ secretKey: CLERK_SECRET_KEY })
    : null;

// ─── Allowed Origins ──────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGIN
    ? process.env.ALLOWED_ORIGIN.split(',').map(s => s.trim())
    : ['http://localhost:5173', 'http://localhost:5174'];

const app = express();

// ─── Security Headers (helmet) ────────────────────────────────────────────
app.use(helmet({
    crossOriginEmbedderPolicy: false, // needed for some browsers with embedded content
    // This is a cross-origin API server — CORP must be cross-origin so that
    // the frontend can fetch() the health endpoint (including with no-cors mode).
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc:  ["'self'"],
            styleSrc:   ["'self'", "'unsafe-inline'"],
            imgSrc:     ["'self'", 'data:'],
        }
    }
}));

// ─── CORS ─────────────────────────────────────────────────────────────────
app.use(cors({
    origin: (origin, callback) => {
        // Allow server-to-server requests and health checks (no Origin header)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            return callback(null, true);
        }
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

// ─── Body Parser — 50 KB max to prevent payload bombs ─────────────────────
app.use(express.json({ limit: '50kb' }));

// ─── Global Rate Limiter — 120 requests / 15 min per IP ───────────────────
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please wait before trying again.' },
});
app.use(globalLimiter);

// ─── AI Rate Limiter — 20 AI requests / 10 min per IP (cost protection) ──
const aiLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'AI request limit reached. Please wait a few minutes.' },
    skipSuccessfulRequests: false,
});

// ─── Token Validator ──────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: no token provided.' });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: empty token.' });
    }

    // If Clerk is configured, verify the token cryptographically
    if (clerk) {
        try {
            await clerk.verifyToken(token);
        } catch {
            return res.status(401).json({ error: 'Unauthorized: invalid token.' });
        }
    }
    // If CLERK_SECRET_KEY is not set (local dev), accept any non-empty Bearer token

    next();
}

// ─── Input Sanitiser ──────────────────────────────────────────────────────
function sanitiseMessages(messages) {
    if (!Array.isArray(messages)) return null;
    if (messages.length > 50) return null; // max 50 messages in history

    return messages
        .filter(m => m && typeof m.role === 'string' && typeof m.content === 'string')
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({
            role:    m.role === 'user' ? 'user' : 'assistant',
            content: String(m.content).slice(0, 4000), // max 4k chars per message
        }))
        .slice(-20); // only last 20 messages sent to API
}

function sanitiseContext(ctx) {
    if (!ctx || typeof ctx !== 'object') return {};
    // Whitelist only expected fields — prevents prompt injection via extra fields
    return {
        name:            typeof ctx.name === 'string'   ? ctx.name.slice(0, 200) : 'Untitled',
        projectStage:    typeof ctx.projectStage === 'string' ? ctx.projectStage.slice(0, 50) : undefined,
        nodeCount:       typeof ctx.nodeCount === 'number'    ? ctx.nodeCount : 0,
        edgeCount:       typeof ctx.edgeCount === 'number'    ? ctx.edgeCount : 0,
        namedNodes:      Array.isArray(ctx.namedNodes)
                            ? ctx.namedNodes.slice(0, 50).map(n => String(n).slice(0, 100))
                            : [],
        connections:     Array.isArray(ctx.connections)
                            ? ctx.connections.slice(0, 100).map(c => ({
                                from: String(c?.from || '').slice(0, 100),
                                to:   String(c?.to   || '').slice(0, 100),
                              }))
                            : [],
        nodeTypes:       ctx.nodeTypes && typeof ctx.nodeTypes === 'object'
                            ? Object.fromEntries(
                                Object.entries(ctx.nodeTypes)
                                    .filter(([k]) => typeof k === 'string' && k.length < 30)
                                    .map(([k, v]) => [k, typeof v === 'number' ? v : 0])
                              )
                            : {},
        tasks:           ctx.tasks && typeof ctx.tasks === 'object'
                            ? {
                                pending:   Array.isArray(ctx.tasks.pending)
                                    ? ctx.tasks.pending.slice(0, 30).map(t => String(t).slice(0, 200))
                                    : [],
                                completed: Array.isArray(ctx.tasks.completed)
                                    ? ctx.tasks.completed.slice(0, 30).map(t => String(t).slice(0, 200))
                                    : [],
                              }
                            : { pending: [], completed: [] },
        writing:         typeof ctx.writing === 'string'         ? ctx.writing.slice(0, 2000) : '',
        writingWordCount: typeof ctx.writingWordCount === 'number' ? ctx.writingWordCount : 0,
        timeline:        typeof ctx.timeline === 'string'         ? ctx.timeline.slice(0, 1000) : '',
        hasTimeline:     typeof ctx.hasTimeline === 'boolean'     ? ctx.hasTimeline : false,
        daysSinceUpdate: typeof ctx.daysSinceUpdate === 'number'  ? ctx.daysSinceUpdate : 0,
        lastUpdated:     typeof ctx.lastUpdated === 'string'      ? ctx.lastUpdated.slice(0, 30) : '',
    };
}

// ─── System Prompt ────────────────────────────────────────────────────────
const SYSTEM_PROMPT_BASE = `
You are STRAB, an embedded AI intelligence layer for Stratabin — a strategy workspace app. You are scoped entirely to the active project the user is working on. You have deep access to the project's data: canvas nodes and their connections, tasks, writing, timeline, and metadata.

Your single objective: help the user achieve their project goal faster and with more clarity.

---

IDENTITY & BEHAVIOR

- Name: STRAB. Professional, sharp, and direct. No filler, no motivational fluff.
- You are project-aware at all times. NEVER give advice that could apply to any project — always ground it in the actual data you have.
- You are proactive. If you see a risk, gap, or opportunity in the project data, surface it without being asked.
- You are honest. If something is off track, say it plainly. Your loyalty is to the user's goal, not to making things sound good.

---

HOW TO USE THE PROJECT CONTEXT

You receive a structured JSON object called "ACTIVE PROJECT CONTEXT" with every message. Use it deeply:

- **namedNodes** — the actual ideas, steps, or concepts the user has mapped on their canvas. These reveal the project's thinking structure.
- **connections** — which nodes link to which. This shows the logic flow and dependencies. Disconnected nodes suggest incomplete thinking.
- **nodeTypes** — breakdown of node types (text, idea, question, decision, subproject). Many "question" nodes with no answers suggests unresolved decisions.
- **tasks.pending** — the actual text of incomplete to-dos. These are real open work items. Reference them by name.
- **tasks.completed** — what's been done. Use this to gauge momentum.
- **writing** — the actual writing content (truncated if long). Analyse it for clarity, gaps, and alignment with the canvas strategy.
- **timeline** — the user's stated milestones. If present, assess whether the task/node progress aligns with it.
- **writingWordCount** — a signal of how developed the writing section is.
- **daysSinceUpdate** — if high (>7), flag potential stagnation.
- **nodeCount / edgeCount** — canvas density. Very few nodes or edges = early/planning stage.

---

RESPONSE MODES

1. CONVERSATIONAL — Default mode. 2-4 sentences max. Answer the question, add one sharp observation if relevant, stop.

2. INSIGHT — When asked for insights, risks, or "what am I missing": bullet-point format, 3-6 specific points, each referencing actual project data. Never generic.

3. FULL REPORT — Only when explicitly requested. Use clear section headers (## header). Cover: snapshot, canvas analysis, task status, writing review, timeline, risks, and ranked next actions. Be specific and reference real data.

4. SUMMARISATION — When asked to summarise: 3-5 sentences covering what the project is, where it stands, and the most urgent thing to address.

---

ANALYSIS RULES

- If namedNodes is empty: the canvas is blank. Tell the user to start mapping their key ideas before STRAB can analyse the structure.
- If tasks.pending is long but tasks.completed is zero: flag this as a risk — no execution momentum.
- If writingWordCount is 0 and nodeCount > 5: the strategy exists on the canvas but hasn't been written up. Point this out.
- If connections array is short relative to nodeCount: disconnected thinking — nodes exist but aren't logically linked yet.
- If daysSinceUpdate > 7: mention the project hasn't been touched recently. Ask if it's still active.
- If timeline exists but tasks show 0% completion: misalignment between plan and execution.
- Always end reports and insight responses with a ranked list of 3-5 specific next actions.

---

BREVITY RULES (CRITICAL)

- Conversational replies: 2-4 sentences. Stop there.
- Simple questions ("hi", "what can you do", etc.): 1-2 sentences.
- Do NOT generate a full report unless explicitly asked.
- Do NOT start any response with "Great question!", "Of course!", "Certainly!", or any filler opener.
- If you have nothing meaningful to add, say less, not more.
`;

// ─── Routes ───────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
    res.json({ status: 'STRAB Server is running.' });
});

// Health endpoint — publicly accessible, no CORS restriction (used for warm-up pings)
app.get('/health', (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({ status: 'ok' });
});

app.post('/api/chat', aiLimiter, requireAuth, async (req, res) => {
    try {
        const { messages, projectContext } = req.body;

        // Validate and sanitise inputs
        const cleanMessages = sanitiseMessages(messages);
        if (!cleanMessages || cleanMessages.length === 0) {
            return res.status(400).json({ error: 'Invalid or empty messages.' });
        }

        const cleanContext = sanitiseContext(projectContext);

        if (!ANTHROPIC_API_KEY) {
            return res.status(503).json({ error: 'AI service is not configured.' });
        }

        const systemPrompt = `
${SYSTEM_PROMPT_BASE}

---

INTERACTIVE QUESTIONS (CRITICAL INSTRUCTION):
If the user provides an ambiguous request, a vague idea, or a problem without enough context, you MUST NOT just ask a plain text question. Instead, you MUST provide an array of selectable, structural answers for them to click on to clarify their intent, along with a text box for custom input. 

To do this, you MUST format your exact response as a valid JSON block enclosed in \`\`\`json tags. 
DO NOT output normal text if you are asking a clarifying question.

The JSON format MUST be exactly:
\`\`\`json
{
  "type": "clarification",
  "question": "Your clearly stated clarifying question here?",
  "options": [
    "Selectable Option 1",
    "Selectable Option 2",
    "Selectable Option 3"
  ],
  "allowCustomText": true
}
\`\`\`

If you have enough information to answer the user directly, just respond with normal markdown text. ONLY use the JSON format when you need the user to make a choice or clarify their direction.

ACTIVE PROJECT CONTEXT:
${JSON.stringify(cleanContext, null, 2)}
`;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 2048,
                system: systemPrompt,
                messages: cleanMessages,
            }),
        });

        if (!response.ok) {
            // Log full error server-side, but send only a generic message to client
            const errorText = await response.text();
            console.error(`Anthropic API Error [${response.status}]:`, errorText);
            return res.status(502).json({ error: 'AI service temporarily unavailable.' });
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        // Never expose internal error details to the client
        console.error('Server Error in /api/chat:', error);
        res.status(500).json({ error: 'Internal Server Error.' });
    }
});

// ─── 404 handler ──────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: 'Not found.' });
});

// ─── Start ────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`STRAB AI Server running on port ${PORT}`);
});
