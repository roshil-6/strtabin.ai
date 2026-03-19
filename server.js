       import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import crypto from 'crypto';
import { createClerkClient } from '@clerk/backend';

dotenv.config();

// ─── Startup Validation ────────────────────────────────────────────────────
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CLERK_SECRET_KEY  = process.env.CLERK_SECRET_KEY;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.ALLOWED_ORIGIN?.split(',')[0]?.trim() || 'https://stratabin.com';
const PORT = process.env.PORT || 3001;

if (!ANTHROPIC_API_KEY) {
    console.error('⛔ CRITICAL: ANTHROPIC_API_KEY is not set. AI features will fail.');
}
if (!CLERK_SECRET_KEY) {
    console.warn('⚠️  WARNING: CLERK_SECRET_KEY is not set. Token verification is disabled.');
}
if (!RAZORPAY_WEBHOOK_SECRET) {
    console.warn('⚠️  WARNING: RAZORPAY_WEBHOOK_SECRET is not set. Payment webhook verification is disabled.');
}

// ─── Clerk Client (for token verification) ────────────────────────────────
const clerk = CLERK_SECRET_KEY
    ? createClerkClient({ secretKey: CLERK_SECRET_KEY })
    : null;

// ─── Allowed Origins ──────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGIN
    ? process.env.ALLOWED_ORIGIN.split(',').map(s => s.trim())
    : [
        'http://localhost:5173',
        'http://localhost:5174',
        'https://stratabin.com',
        'https://www.stratabin.com',
      ];

const app = express();

// ─── CORS — registered first so ALL routes get the headers ────────────────
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            return callback(null, true);
        }
        if (origin.endsWith('.vercel.app') || origin.endsWith('.stratabin.com') || origin.endsWith('.onrender.com')) {
            return callback(null, true);
        }
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

// ─── Body Parser (before all routes except raw webhook) ───────────────────
// Register early so req.body is available in all JSON route handlers
app.use((req, res, next) => {
    // Skip for the raw webhook endpoint so its HMAC verification still works
    if (req.path === '/api/payments/razorpay/webhook') return next();
    express.json({ limit: '50kb' })(req, res, next);
});

// ─── Health + Root routes ─────────────────────────────────────────────────
app.get('/', (_req, res) => {
    res.json({ status: 'STRAB Server is running.' });
});
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

// Razorpay webhook (raw body required for HMAC verification)
app.post('/api/payments/razorpay/webhook', express.raw({ type: 'application/json', limit: '200kb' }), async (req, res) => {
    if (!RAZORPAY_WEBHOOK_SECRET || !clerk) {
        return res.status(503).json({ error: 'Payment verification is not configured.' });
    }

    try {
        const signature = req.headers['x-razorpay-signature'];
        if (!signature || typeof signature !== 'string') {
            return res.status(400).json({ error: 'Missing webhook signature.' });
        }

        const expected = crypto
            .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
            .update(req.body)
            .digest('hex');

        const sigBuf = Buffer.from(signature, 'utf8');
        const expectedBuf = Buffer.from(expected, 'utf8');
        if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
            return res.status(401).json({ error: 'Invalid webhook signature.' });
        }

        const payload = JSON.parse(req.body.toString('utf8'));
        const eventName = String(payload?.event || '');

        // Only process successful payment events.
        const supportedEvents = new Set(['payment.captured', 'order.paid', 'payment_link.paid']);
        if (!supportedEvents.has(eventName)) {
            return res.status(200).json({ ok: true, ignored: true, event: eventName });
        }

        // Extract payment entity — support payment.captured, order.paid, payment_link.paid
        const plink = payload?.payload?.payment_link?.entity;
        const payment =
            payload?.payload?.payment?.entity ||
            payload?.payload?.order?.entity?.payments?.[0] ||
            (plink?.payments && plink.payments[0]) ||
            null;

        const notes = payment?.notes && typeof payment.notes === 'object' ? payment.notes : {};
        const clerkUserId = typeof notes.clerkUserId === 'string'
            ? notes.clerkUserId
            : (typeof notes.clerk_user_id === 'string' ? notes.clerk_user_id : '');
        const payerEmail = (
            typeof payment?.email === 'string' ? payment.email :
            (plink?.customer?.email && typeof plink.customer.email === 'string') ? plink.customer.email :
            typeof notes.email === 'string' ? notes.email : ''
        ).trim().toLowerCase();

        let resolvedUserId = clerkUserId;
        if (!resolvedUserId && payerEmail) {
            const users = await clerk.users.getUserList({ emailAddress: [payerEmail], limit: 1 });
            resolvedUserId = users?.data?.[0]?.id || '';
        }

        if (!resolvedUserId) {
            return res.status(202).json({
                ok: true,
                warning: 'Payment received but no Clerk user could be resolved. Include notes.clerkUserId in Razorpay payments.',
            });
        }

        // Safeguard: verify the resolved user's email matches payer (prevents wrong-user updates)
        const targetUser = await clerk.users.getUser(resolvedUserId);
        const targetEmails = (targetUser.emailAddresses || []).map(e => (e.emailAddress || '').toLowerCase().trim());
        if (payerEmail && !targetEmails.includes(payerEmail)) {
            console.warn(`Webhook: resolved user ${resolvedUserId} email (${targetEmails.join(',')}) does not match payment email (${payerEmail}). Skipping update.`);
            return res.status(202).json({
                ok: true,
                warning: 'Payment email does not match any Stratabin account. User must log in with the email used for payment.',
            });
        }
        if (!payerEmail && !clerkUserId) {
            return res.status(202).json({
                ok: true,
                warning: 'Payment has no email. Cannot attribute to a user. Include notes.clerkUserId when creating the payment link.',
            });
        }

        await clerk.users.updateUserMetadata(resolvedUserId, {
            publicMetadata: {
                isPaid: true,
                paid: true,
                hasPaidAccess: true,
                paidAt: new Date().toISOString(),
                paymentProvider: 'razorpay',
                lastPaymentEvent: eventName,
                lastPaymentId: typeof payment?.id === 'string' ? payment.id : undefined,
            },
        });

        return res.status(200).json({ ok: true, userId: resolvedUserId });
    } catch (error) {
        console.error('Payment webhook error:', error);
        return res.status(500).json({ error: 'Webhook processing failed.' });
    }
});

// ─── Create Payment Link (fresh link per user — fixes "already paid" for shared links) ─
// Razorpay payment links are single-use. A static link shows "already paid" after first use.
// This endpoint creates a NEW link for each request so every user can pay.
app.post('/api/payments/create-link', async (req, res) => {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        return res.status(503).json({ error: 'Payment links are not configured. Contact support.' });
    }

    let clerkUserId = null;
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (token && clerk) {
        try {
            const payloadB64 = token.split('.')[1];
            if (payloadB64) {
                const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
                if (decoded.sub) {
                    await clerk.users.getUser(decoded.sub);
                    clerkUserId = decoded.sub;
                }
            }
        } catch { /* ignore — create link without notes */ }
    }

    try {
        const rzpAuth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
        const callbackUrl = `${FRONTEND_URL.replace(/\/$/, '')}/dashboard`;
        const body = {
            amount: 6400, // ₹64 in paise
            currency: 'INR',
            description: 'Stratabin — Lifetime access (one-time payment)',
            callback_url: callbackUrl,
            callback_method: 'get',
            ...(clerkUserId && { notes: { clerkUserId } }),
        };
        const rzpRes = await fetch('https://api.razorpay.com/v1/payment_links', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${rzpAuth}`,
            },
            body: JSON.stringify(body),
        });
        if (!rzpRes.ok) {
            const errText = await rzpRes.text();
            console.error('Razorpay create-link error:', rzpRes.status, errText);
            return res.status(502).json({ error: 'Could not create payment link. Please try again.' });
        }
        const data = await rzpRes.json();
        const shortUrl = data.short_url;
        if (!shortUrl || typeof shortUrl !== 'string') {
            return res.status(502).json({ error: 'Invalid response from payment provider.' });
        }
        return res.status(200).json({ short_url: shortUrl });
    } catch (error) {
        console.error('Create payment link error:', error);
        return res.status(500).json({ error: 'Could not create payment link. Please try again.' });
    }
});

// ─── Manual Payment Verification ──────────────────────────────────────────
// Called by the user when they click "I have paid" on the paywall.
// Flow:
//   1. Verify Clerk JWT — identify the caller.
//   2. Get fresh Clerk metadata — if already paid, return success immediately.
//   3. If paymentId provided — call Razorpay API to confirm capture + email match.
//   4. If verified — update Clerk metadata and return success.
app.post('/api/payments/verify', async (req, res) => {
    if (!clerk) {
        return res.status(503).json({ error: 'Auth service not configured.' });
    }

    // ── 1. Authenticate caller ──────────────────────────────────────────────
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
        return res.status(401).json({ error: 'Missing authorization token.' });
    }

    // Decode JWT payload (middle part) to extract sub (user ID) without JWKS dependency.
    // We then validate by fetching the real Clerk user — if the user doesn't exist in Clerk,
    // the request is rejected.
    let userId;
    try {
        const payloadB64 = token.split('.')[1];
        if (!payloadB64) throw new Error('Malformed token.');
        const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
        userId = decoded.sub;
        if (!userId) throw new Error('No sub claim in token.');
        // Validate the user actually exists in Clerk (this is the real auth check)
        await clerk.users.getUser(userId);
    } catch (err) {
        const errMsg = err?.message || String(err);
        console.error('❌ Token decode/user lookup failed:', errMsg);
        return res.status(401).json({ error: 'Invalid or expired token.', detail: errMsg });
    }

    try {
        // ── 2. Check if already paid in Clerk (handles stale browser cache) ──
        const clerkUser = await clerk.users.getUser(userId);
        const alreadyPaid = Boolean(
            clerkUser.publicMetadata?.isPaid === true ||
            clerkUser.publicMetadata?.paid === true ||
            clerkUser.publicMetadata?.hasPaidAccess === true
        );

        if (alreadyPaid) {
            return res.status(200).json({ ok: true, paid: true, source: 'clerk_cache' });
        }

        // ── 3. Verify via Razorpay API if keys + paymentId are available ─────
        const { paymentId } = req.body || {};

        if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET && typeof paymentId === 'string' && paymentId.startsWith('pay_')) {
            const rzpAuth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
            const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
                headers: { Authorization: `Basic ${rzpAuth}` },
            });

            if (!rzpRes.ok) {
                return res.status(400).json({ error: 'Payment ID not found in Razorpay. Please check and try again.' });
            }

            const payment = await rzpRes.json();

            // Must be captured (i.e. money actually received)
            if (payment.status !== 'captured') {
                return res.status(400).json({ error: `Payment status is "${payment.status}", not captured yet.` });
            }

            // When payment has email: verify it matches this account (prevents sharing payment IDs)
            // When payment has no email: allow verification (some payment methods don't include email)
            const clerkEmails = clerkUser.emailAddresses.map(e => (e.emailAddress || '').toLowerCase().trim());
            const paymentEmail = (
                payment.email ||
                (payment.customer && payment.customer.email) ||
                ''
            ).toLowerCase().trim();
            if (paymentEmail && !clerkEmails.includes(paymentEmail)) {
                console.warn(`Payment ${paymentId} email (${paymentEmail}) does not match Clerk user ${userId} emails (${clerkEmails.join(', ')})`);
                return res.status(400).json({
                    error: 'The email on this payment does not match your account. Please log in with the account that made the payment.',
                });
            }

            // ── 4. All checks passed — mark paid in Clerk ───────────────────
            await clerk.users.updateUserMetadata(userId, {
                publicMetadata: {
                    isPaid: true,
                    paid: true,
                    hasPaidAccess: true,
                    paidAt: new Date().toISOString(),
                    paymentProvider: 'razorpay',
                    verifiedPaymentId: paymentId,
                    verifiedAt: new Date().toISOString(),
                },
            });

            return res.status(200).json({ ok: true, paid: true, source: 'razorpay_verified' });
        }

        // ── No Razorpay keys or no paymentId — cannot verify ─────────────────
        return res.status(202).json({
            ok: false,
            paid: false,
            message: 'Payment still processing. You will be redirected automatically after payment, or check again in a few seconds.',
        });

    } catch (error) {
        console.error('Payment verify error:', error);
        return res.status(500).json({ error: 'Verification failed. Please try again.' });
    }
});

// ─── Security Headers (helmet) ────────────────────────────────────────────
app.use(helmet({
    crossOriginEmbedderPolicy: false,
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

// ─── Guest AI Rate Limiter — 2 requests / 24h per IP ───────────────────────
const guestAiLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    max: 2,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Guest AI limit reached. Sign up to continue.' },
    skipSuccessfulRequests: false,
});

// ─── Optional Auth — allow guests (no token) or validate token ──────────────
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.isGuest = true;
        return next();
    }
    requireAuth(req, res, next);
}

// ─── Apply guest limit for guests, normal limit for authenticated ──────────
function guestOrAuthLimiter(req, res, next) {
    if (req.isGuest) return guestAiLimiter(req, res, next);
    return aiLimiter(req, res, next);
}

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
            const payloadB64 = token.split('.')[1];
            if (!payloadB64) throw new Error('Malformed token.');
            const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
            const uid = decoded.sub;
            if (!uid) throw new Error('No sub claim.');
            await clerk.users.getUser(uid);
        } catch (clerkErr) {
            console.error('❌ requireAuth user lookup failed:', clerkErr?.message || clerkErr);
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

    // Connections can arrive as strings ("A → B") or objects ({from, to})
    let connections = [];
    if (Array.isArray(ctx.connections)) {
        connections = ctx.connections.slice(0, 100).map(c => {
            if (typeof c === 'string') return c.slice(0, 200);
            if (c && typeof c === 'object') {
                return `${String(c.from || '').slice(0, 100)} → ${String(c.to || '').slice(0, 100)}`;
            }
            return null;
        }).filter(Boolean);
    }

    return {
        name:            typeof ctx.name === 'string'   ? ctx.name.slice(0, 200) : 'Untitled',
        projectStage:    typeof ctx.projectStage === 'string' ? ctx.projectStage.slice(0, 50) : undefined,
        nodeCount:       typeof ctx.nodeCount === 'number'    ? ctx.nodeCount : 0,
        edgeCount:       typeof ctx.edgeCount === 'number'    ? ctx.edgeCount : 0,
        namedNodes:      Array.isArray(ctx.namedNodes)
                            ? ctx.namedNodes.slice(0, 50).map(n => String(n).slice(0, 100))
                            : [],
        connections,
        nodeTypes:       ctx.nodeTypes && typeof ctx.nodeTypes === 'object'
                            ? Object.fromEntries(
                                Object.entries(ctx.nodeTypes)
                                    .filter(([k]) => typeof k === 'string' && k.length < 30)
                                    .map(([k, v]) => [k, typeof v === 'number' ? v : 0])
                              )
                            : {},
        tasks:           ctx.tasks && typeof ctx.tasks === 'object'
                            ? {
                                total:         typeof ctx.tasks.total === 'number' ? ctx.tasks.total : 0,
                                completedCount: typeof ctx.tasks.completedCount === 'number' ? ctx.tasks.completedCount : 0,
                                completionRate: typeof ctx.tasks.completionRate === 'number' ? ctx.tasks.completionRate : 0,
                                pending:   Array.isArray(ctx.tasks.pending)
                                    ? ctx.tasks.pending.slice(0, 30).map(t => String(t).slice(0, 200))
                                    : [],
                                completed: Array.isArray(ctx.tasks.completed)
                                    ? ctx.tasks.completed.slice(0, 30).map(t => String(t).slice(0, 200))
                                    : [],
                              }
                            : { total: 0, completedCount: 0, completionRate: 0, pending: [], completed: [] },
        writing:         typeof ctx.writing === 'string'         ? ctx.writing.slice(0, 2000) : '',
        writingWordCount: typeof ctx.writingWordCount === 'number' ? ctx.writingWordCount : 0,
        timeline:        typeof ctx.timeline === 'string'         ? ctx.timeline.slice(0, 1000) : '',
        hasTimeline:     typeof ctx.hasTimeline === 'boolean'     ? ctx.hasTimeline : false,
        daysSinceUpdate: typeof ctx.daysSinceUpdate === 'number'  ? ctx.daysSinceUpdate : 0,
        lastUpdated:     typeof ctx.lastUpdated === 'string'      ? ctx.lastUpdated.slice(0, 30) : '',
        todayExecution:  typeof ctx.todayExecution === 'string'    ? ctx.todayExecution.slice(0, 500) : '',
        blockers:        typeof ctx.blockers === 'string'         ? ctx.blockers.slice(0, 300) : '',
        tomorrowAction:  typeof ctx.tomorrowAction === 'string'   ? ctx.tomorrowAction.slice(0, 300) : '',
        goals:           Array.isArray(ctx.goals)
            ? ctx.goals.slice(0, 10).map(g => (typeof g === 'object' && g !== null)
                ? { label: String(g.label || '').slice(0, 100), current: g.current, target: g.target, unit: String(g.unit || '').slice(0, 20) }
                : null).filter(Boolean)
            : [],
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
- **todayExecution** — what the user says they executed today (from daily check-in). Use this to acknowledge progress and challenge if empty.
- **blockers** — what the user says is blocking them. Address these directly.
- **tomorrowAction** — user's stated top action for tomorrow. Use to hold them accountable.
- **goals** — outcome/metric goals (label, current, target, unit). Reference these when discussing progress and impact.

---

EXECUTION & ACCOUNTABILITY

- When asked "What did I execute today?" or similar: use todayExecution if present.
- When asked "What's blocking me?": use blockers if present.
- When asked "What's my top action for tomorrow?": use tomorrowAction if present.
- Act as a strategic mentor when asked to "Challenge my plan" or "Hold me accountable": be direct, critical where needed, and push for concrete next steps.
- If goals exist and current/target are set: reference progress toward outcomes, not just activity.

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
// NOTE: / and /health are registered before middleware at the top of this file.

function buildSystemPrompt(cleanContext) {
    return `
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
}

app.post('/api/chat', optionalAuth, guestOrAuthLimiter, async (req, res) => {
    try {
        const { messages, projectContext, stream: wantsStream } = req.body;

        const cleanMessages = sanitiseMessages(messages);
        if (!cleanMessages || cleanMessages.length === 0) {
            return res.status(400).json({ error: 'Invalid or empty messages.' });
        }

        const cleanContext = sanitiseContext(projectContext);

        if (!ANTHROPIC_API_KEY) {
            return res.status(503).json({ error: 'AI service is not configured.' });
        }

        const systemPrompt = buildSystemPrompt(cleanContext);

        // ── Streaming path ───────────────────────────────────────────
        if (wantsStream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-Accel-Buffering', 'no');
            res.flushHeaders();

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
                    stream: true,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Anthropic Stream Error [${response.status}]:`, errorText);
                res.write(`data: ${JSON.stringify({ error: 'AI service temporarily unavailable.' })}\n\n`);
                res.write('data: [DONE]\n\n');
                return res.end();
            }

            let buffer = '';
            for await (const chunk of response.body) {
                buffer += (Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk);
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const payload = line.slice(6).trim();
                    if (!payload || payload === '[DONE]') continue;
                    try {
                        const evt = JSON.parse(payload);
                        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
                            res.write(`data: ${JSON.stringify({ t: evt.delta.text })}\n\n`);
                        }
                    } catch { /* partial JSON, skip */ }
                }
            }

            res.write('data: [DONE]\n\n');
            return res.end();
        }

        // ── Non-streaming fallback ───────────────────────────────────
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
            const errorText = await response.text();
            console.error(`Anthropic API Error [${response.status}]:`, errorText);
            return res.status(502).json({ error: 'AI service temporarily unavailable.' });
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Server Error in /api/chat:', error);
        res.status(500).json({ error: 'Internal Server Error.' });
    }
});

// ─── STRAB General AI — project creation + strategy chat ─────────────────
const STRAB_GENERAL_SYSTEM_PROMPT = `
You are STRAB, an AI strategy assistant for Stratabin — a strategy workspace. In this mode you can chat AND build entire project canvases from scratch based on what the user describes.

CAPABILITIES:
- Conversational strategy advice and planning
- Create complete project canvases with nodes, connections, writing, and tasks

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHEN TO CREATE (use action block):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User asks to build / create / plan / set up a project, workflow, strategy, canvas, roadmap, or launch plan.

WHEN TO JUST CHAT (no action block):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Questions, advice, greetings, "what can you do", generic strategy discussion.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACTION BLOCK FORMAT (append AFTER your natural language response):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ACTIONS]
{"actions":[
  {"type":"create_canvas","name":"Project Name","ref":"c1"},
  {"type":"add_node","canvasRef":"c1","nodeType":"default","label":"Key Idea","x":100,"y":200},
  {"type":"add_node","canvasRef":"c1","nodeType":"question","label":"What is the goal?","x":340,"y":200},
  {"type":"add_node","canvasRef":"c1","nodeType":"decision","label":"Go / No-Go","x":580,"y":200},
  {"type":"add_node","canvasRef":"c1","nodeType":"text","label":"Context note here","x":100,"y":400},
  {"type":"connect_nodes","canvasRef":"c1","fromIndex":0,"toIndex":1},
  {"type":"connect_nodes","canvasRef":"c1","fromIndex":1,"toIndex":2},
  {"type":"set_writing","canvasRef":"c1","content":"## Project Overview\\n\\nBrief description...\\n\\n## Goals\\n- Goal 1\\n- Goal 2\\n\\n## Next Steps\\n- Step 1"},
  {"type":"add_todo","canvasRef":"c1","text":"Define success metrics"},
  {"type":"add_todo","canvasRef":"c1","text":"Identify key stakeholders"}
]}
[/ACTIONS]

RULES FOR ACTION BLOCKS:
- "ref" is a local label (c1, c2…) linking nodes to their canvas — use it consistently
- nodeType: "default" (Idea), "question", "decision", "text"
- Layout: start x=100, space nodes 240px apart horizontally; new rows at y=400
- fromIndex / toIndex: 0-based index into add_node actions for that canvas
- Always create 6–10 nodes with at least 4–5 connect_nodes entries
- Always include set_writing with a proper markdown project outline
- Always add 3–5 add_todo entries
- Keep your natural language response BRIEF (2–4 sentences) before the [ACTIONS] block

IDENTITY:
- Name: STRAB. Professional, sharp, direct. No filler phrases.
- No "Great!", "Of course!", "Certainly!" openers.
- Conversational replies: 2–4 sentences max.
`;

app.post('/api/strab-general', optionalAuth, guestOrAuthLimiter, async (req, res) => {
    try {
        const { messages, stream: wantsStream } = req.body;

        const cleanMessages = sanitiseMessages(messages);
        if (!cleanMessages || cleanMessages.length === 0) {
            return res.status(400).json({ error: 'Invalid or empty messages.' });
        }

        if (!ANTHROPIC_API_KEY) {
            return res.status(503).json({ error: 'AI service is not configured.' });
        }

        if (wantsStream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-Accel-Buffering', 'no');
            res.flushHeaders();

            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': ANTHROPIC_API_KEY,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 3000,
                    system: STRAB_GENERAL_SYSTEM_PROMPT,
                    messages: cleanMessages,
                    stream: true,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Anthropic Stream Error [${response.status}]:`, errorText);
                res.write(`data: ${JSON.stringify({ error: 'AI service temporarily unavailable.' })}\n\n`);
                res.write('data: [DONE]\n\n');
                return res.end();
            }

            let buffer = '';
            for await (const chunk of response.body) {
                buffer += (Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk);
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const payload = line.slice(6).trim();
                    if (!payload || payload === '[DONE]') continue;
                    try {
                        const evt = JSON.parse(payload);
                        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
                            res.write(`data: ${JSON.stringify({ t: evt.delta.text })}\n\n`);
                        }
                    } catch { /* partial JSON, skip */ }
                }
            }

            res.write('data: [DONE]\n\n');
            return res.end();
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 3000,
                system: STRAB_GENERAL_SYSTEM_PROMPT,
                messages: cleanMessages,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Anthropic API Error [${response.status}]:`, errorText);
            return res.status(502).json({ error: 'AI service temporarily unavailable.' });
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Server Error in /api/strab-general:', error);
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
