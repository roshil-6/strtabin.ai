import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import helmet from 'helmet';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import crypto from 'crypto';
import { createClerkClient } from '@clerk/backend';
import { registerWorkspaceRoutes } from './routes/workspaces.js';
import { registerChatRoutes } from './routes/chat.js';
import { getOrCreateUser } from './db/models.js';
import { initDb, isDbReady } from './db/index.js';
import { summarizePgUrl } from './db/driver.js';
import { getClerkUserCached, invalidateClerkUserCache } from './lib/clerkUserCache.js';
import { resolveBearerToClerkUser, verifyBearerSub } from './lib/clerkAuth.js';
import { initRedisInfrastructure } from './lib/redisInfra.js';

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
const envOrigins = process.env.ALLOWED_ORIGIN
    ? process.env.ALLOWED_ORIGIN.split(',').map(s => s.trim())
    : [];
const allowedOrigins = envOrigins.length > 0
    ? [...new Set([...envOrigins, 'https://stratabin.com', 'https://www.stratabin.com'])]
    : [
        'http://localhost:5173',
        'http://localhost:5174',
        'https://stratabin.com',
        'https://www.stratabin.com',
      ];

const app = express();

// Behind Railway/Render/Vercel proxy, req.ip must reflect the client for rate limits
const trustProxyEnv = process.env.TRUST_PROXY;
if (trustProxyEnv === '1' || trustProxyEnv === 'true') {
    app.set('trust proxy', 1);
}

function isAllowedOrigin(origin) {
    if (!origin) return false;
    if (allowedOrigins.includes(origin)) return true;
    try {
        const host = new URL(origin).hostname;
        return host === 'stratabin.com' || host.endsWith('.stratabin.com') || host.endsWith('.vercel.app') || host.endsWith('.onrender.com');
    } catch { return false; }
}

// ─── CORS first — required for browser fetch() from www.stratabin.com to /health & APIs ─
// (Render health checks send no Origin; cors allows that via !origin below.)
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            return callback(null, true);
        }
        if (isAllowedOrigin(origin)) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
    optionsSuccessStatus: 204,
}));

// ─── Health + root (after CORS so dashboard fetch() gets Access-Control-Allow-Origin) ─
function sendHealth(req, res) {
    const origin = req.get('Origin');
    if (origin && isAllowedOrigin(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.status(200).json({ status: 'ok', database: isDbReady() });
}
app.get('/health', sendHealth);
app.get('/health/', sendHealth);
app.get('/api/health', sendHealth);
// Preflight for health (some browsers send OPTIONS)
app.options('/health', (req, res) => {
    const origin = req.get('Origin');
    if (origin && isAllowedOrigin(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.status(204).end();
});
app.get('/', (_req, res) => {
    res.status(200).json({ status: 'STRAB Server is running.' });
});

// ─── Body Parser (before all routes except raw webhook) ───────────────────
// Register early so req.body is available in all JSON route handlers
app.use((req, res, next) => {
    if (req.path === '/api/payments/razorpay/webhook') return next();
    // Canvas share needs larger limit for nodes/edges payload
    if (req.path === '/api/canvas/share' || req.path.match(/^\/api\/projects\/\d+\/canvas$/)) return express.json({ limit: '2mb' })(req, res, next);
    express.json({ limit: '50kb' })(req, res, next);
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
        const targetUser = await getClerkUserCached(clerk, resolvedUserId);
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
        invalidateClerkUserCache(resolvedUserId);

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
            const sub = await verifyBearerSub(token);
            if (sub) clerkUserId = sub;
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

    let userId;
    try {
        const { clerkId } = await resolveBearerToClerkUser(token, clerk);
        userId = clerkId;
    } catch (err) {
        const errMsg = err?.message || String(err);
        console.error('❌ Token verification failed:', errMsg);
        return res.status(401).json({ error: 'Invalid or expired token.', detail: errMsg });
    }

    try {
        // ── 2. Check if already paid in Clerk (handles stale browser cache) ──
        const clerkUser = await getClerkUserCached(clerk, userId);
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
            invalidateClerkUserCache(userId);

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

// ─── Set Username & Password (for paid users — easier login) ─────────────────
app.post('/api/user/set-credentials', async (req, res) => {
    if (!clerk) return res.status(503).json({ error: 'Auth service not configured.' });
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Missing authorization token.' });
    let userId;
    try {
        const { clerkId } = await resolveBearerToClerkUser(token, clerk);
        userId = clerkId;
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
    const { username, password } = req.body || {};
    if (!password || typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    try {
        const updates = { password };
        if (username && typeof username === 'string' && /^[a-zA-Z0-9_-]{3,30}$/.test(username)) {
            updates.username = username;
        }
        await clerk.users.updateUser(userId, updates);
        invalidateClerkUserCache(userId);
        return res.status(200).json({ ok: true });
    } catch (error) {
        const msg = error?.errors?.[0]?.message || error?.message || String(error);
        if (msg.includes('username') && msg.toLowerCase().includes('taken')) {
            return res.status(400).json({ error: 'Username is already taken.' });
        }
        if (msg.includes('password') && msg.toLowerCase().includes('strategy')) {
            return res.status(400).json({ error: 'Password sign-in is not enabled. Enable it in Clerk Dashboard → User & Authentication → Authentication strategies.' });
        }
        console.error('Set credentials error:', error);
        return res.status(400).json({ error: msg || 'Could not update credentials.' });
    }
});

// ─── Verified Clerk `sub` for /api (rate-limit keys; no forged JWT payload) ─
app.use(async (req, res, next) => {
    req.clerkVerifiedSub = null;
    if (!clerk || !CLERK_SECRET_KEY) return next();
    if (!req.path.startsWith('/api')) return next();
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return next();
    const sub = await verifyBearerSub(auth.slice(7).trim());
    if (sub) req.clerkVerifiedSub = sub;
    next();
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

const redisInfra = await initRedisInfrastructure();
const redisSendCommand = redisInfra.sendCommand;
const applySocketRedisAdapter = redisInfra.applySocketAdapter;
const mkRedisStore = (prefix) =>
    redisSendCommand ? new RedisStore({ sendCommand: redisSendCommand, prefix }) : undefined;

// ─── Global rate limit: relaxed defaults; per-user when Bearer JWT has `sub` ─
// Env: RATE_LIMIT_GLOBAL_WINDOW_MS, RATE_LIMIT_GLOBAL_MAX, RATE_LIMIT_GLOBAL_SKIP_CANVAS_POST=1
// With REDIS_URL: counts are shared across all server instances.
const GLOBAL_RL_WINDOW_MS = Number(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS || 15 * 60 * 1000);
const GLOBAL_RL_MAX = Number(process.env.RATE_LIMIT_GLOBAL_MAX || 500);

function clerkSubFromBearer(req) {
    const sub = req.clerkVerifiedSub;
    return typeof sub === 'string' && sub.length > 0 ? sub : null;
}

const globalLimiter = rateLimit({
    windowMs: GLOBAL_RL_WINDOW_MS,
    max: GLOBAL_RL_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    store: mkRedisStore('rl:sbx:global'),
    message: { error: 'Too many requests. Please wait before trying again.' },
    keyGenerator: (req) => {
        const sub = clerkSubFromBearer(req);
        if (sub) return `user:${sub}`;
        const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
        return ipKeyGenerator(ip);
    },
    skip: (req) => {
        if (req.path === '/' || req.path === '/health' || req.path === '/api/health') return true;
        if (req.method === 'GET' && /^\/api\/projects\/\d+\/canvas$/.test(req.path)) return true;
        if (process.env.RATE_LIMIT_GLOBAL_SKIP_CANVAS_POST === '1' && req.method === 'POST' && /^\/api\/projects\/\d+\/canvas$/.test(req.path)) {
            return true;
        }
        return false;
    },
});
app.use(globalLimiter);

// ─── AI rate limit (cost protection) — env: RATE_LIMIT_AI_WINDOW_MS, RATE_LIMIT_AI_MAX ─
const AI_RL_WINDOW_MS = Number(process.env.RATE_LIMIT_AI_WINDOW_MS || 10 * 60 * 1000);
const AI_RL_MAX = Number(process.env.RATE_LIMIT_AI_MAX || 50);
const aiLimiter = rateLimit({
    windowMs: AI_RL_WINDOW_MS,
    max: AI_RL_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    store: mkRedisStore('rl:sbx:ai'),
    message: { error: 'AI request limit reached. Please wait a few minutes.' },
    skipSuccessfulRequests: false,
    keyGenerator: (req) => {
        const sub = clerkSubFromBearer(req);
        if (sub) return `ai:user:${sub}`;
        const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
        return `ai:ip:${ipKeyGenerator(ip)}`;
    },
});

// ─── Guest AI — env: RATE_LIMIT_GUEST_AI_WINDOW_MS, RATE_LIMIT_GUEST_AI_MAX ─
const GUEST_AI_WINDOW_MS = Number(process.env.RATE_LIMIT_GUEST_AI_WINDOW_MS || 24 * 60 * 60 * 1000);
const GUEST_AI_MAX = Number(process.env.RATE_LIMIT_GUEST_AI_MAX || 5);
const guestAiLimiter = rateLimit({
    windowMs: GUEST_AI_WINDOW_MS,
    max: GUEST_AI_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    store: mkRedisStore('rl:sbx:guest'),
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

    if (clerk) {
        try {
            await resolveBearerToClerkUser(token, clerk);
        } catch (clerkErr) {
            console.error('❌ requireAuth verification failed:', clerkErr?.message || clerkErr);
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
        workspaceId:     typeof ctx.workspaceId === 'number' ? ctx.workspaceId : undefined,
        /** personal_single_canvas = project STRAB on Dashboard; team_workspace = team folder STRAB */
        projectScope:    typeof ctx.workspaceId === 'number' ? 'team_workspace' : 'personal_single_canvas',
        canvasIsBlank:   typeof ctx.canvasIsBlank === 'boolean'
            ? ctx.canvasIsBlank
            : ((typeof ctx.nodeCount === 'number' ? ctx.nodeCount : 0) === 0),
    };
}

// ─── System Prompt ────────────────────────────────────────────────────────
const SYSTEM_PROMPT_BASE = `
You are STRAB, an embedded AI intelligence layer for Stratabin — a strategy workspace app. You are scoped entirely to the active project the user is working on. You have deep access to the project's data: ideas on the canvas and their connections, tasks, writing, timeline, and metadata.

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
- **connections** — which ideas link to which. This shows the logic flow and dependencies. Disconnected ideas suggest incomplete thinking.
- **nodeTypes** — breakdown of idea types on the canvas (text, idea, question, decision, subproject). Many "question" ideas with no answers suggests unresolved decisions.
- **tasks.pending** — the actual text of incomplete to-dos. These are real open work items. Reference them by name.
- **tasks.completed** — what's been done. Use this to gauge momentum.
- **writing** — the actual writing content (truncated if long). Analyse it for clarity, gaps, and alignment with the canvas strategy.
- **timeline** — the user's stated milestones. If present, assess whether the task and canvas progress align with it.
- **writingWordCount** — a signal of how developed the writing section is.
- **daysSinceUpdate** — if high (>7), flag potential stagnation.
- **nodeCount / edgeCount** — canvas density (ideas and connections). Very few ideas or connections = early/planning stage.
- **canvasIsBlank** — true when there are no ideas on the canvas yet. If the user asks to *build* something on the canvas, you must populate it via [ACTIONS] (see BLANK CANVAS — POPULATE ON REQUEST).
- **projectScope** — \`personal_single_canvas\` = **Project STRAB**: the user opened STRAB **from a project card** for **chat, Reports, and follow-up** on that canvas — **not** the main **strategy hub**. \`team_workspace\` = team folder; **create_canvas** for extra team projects only when appropriate. The **strategy-creation hub** is **Dashboard header STRAB** (“New strategy”) or **/strab**, not Project STRAB.
- **todayExecution** — what the user says they executed today (from daily check-in). Use this to acknowledge progress and challenge if empty.
- **blockers** — what the user says is blocking them. Address these directly.
- **tomorrowAction** — user's stated top action for tomorrow. Use to hold them accountable.
- **goals** — outcome/metric goals (label, current, target, unit). Reference these when discussing progress and impact.

---

EXECUTION & ACCOUNTABILITY

- When asked "What did I execute today?" or similar: use todayExecution if present. If empty, say directly: "You haven't logged execution today. Add it in the Calendar or Timeline view." Never use clarification JSON.
- When asked "What's blocking me?" or "What's blocking my progress?": use blockers if present. If empty, say: "No blockers logged. Add them in the Calendar view if something is holding you back." Never use clarification JSON.
- When asked "What's my top action for tomorrow?": use tomorrowAction if present. If empty, suggest the top pending task from tasks.pending. Never use clarification JSON.
- Act as a strategic mentor when asked to "Challenge my plan" or "Hold me accountable": be direct, critical where needed, and push for concrete next steps. Always respond with direct text, never JSON.
- If goals exist and current/target are set: reference progress toward outcomes, not just activity.

FIXED QUESTIONS (NEVER USE CLARIFICATION JSON):
For these prompts, ALWAYS respond with direct markdown text. NEVER output the clarification JSON format:
- "What should I do next?" — use tasks.pending, namedNodes, and context to give 3–5 ranked next actions.
- "What are my biggest risks?" — analyse canvas gaps, disconnected ideas, task backlog, daysSinceUpdate.
- "Summarise this project" — 3–5 sentences from namedNodes, writing, tasks.
- "Review my writing" — analyse the writing field; if empty, say so directly.
- "Analyse my strategy flow" — use connections and nodeTypes.
- "What am I missing?" — bullet points of gaps from the data.
- "Challenge my plan — what's weak?" / "Hold me accountable" — direct critique and next actions.

---

RESPONSE MODES

1. CONVERSATIONAL — Default mode. 2-4 sentences max. Answer the question, add one sharp observation if relevant, stop.

2. INSIGHT — When asked for insights, risks, or "what am I missing": bullet-point format, 3-6 specific points, each referencing actual project data. Never generic.

3. FULL REPORT — Only when explicitly requested. Use clear section headers (## header). Cover: snapshot, canvas analysis, task status, writing review, timeline, risks, and ranked next actions. Be specific and reference real data.

4. SUMMARISATION — When asked to summarise: 3-5 sentences covering what the project is, where it stands, and the most urgent thing to address.

---

BLANK CANVAS — POPULATE ON REQUEST (CRITICAL)

When **nodeCount** is 0 (or **canvasIsBlank** is true) AND the user asks you to **create, build, generate, plan, map, design**, or deliver a **strategy, roadmap, launch plan, GTM plan, workflow**, or similar **on this project / canvas**:

- You MUST **not** only tell them to place ideas manually. Give a **short** reply (2–4 sentences), then append an **[ACTIONS]** block with **canvasRef "current"** (this is the open project — not a new tab).
- The block MUST include:
  - **6–10** \`add_node\` (mix **nodeType**: default, question, decision, text as fits the topic)
  - **4–8** \`connect_nodes\` with valid **fromIndex** / **toIndex** referring to the **order add_node actions appear** (0-based)
  - **set_writing** with structured markdown (e.g. overview, phases, audience, risks, next steps — use \`\\n\` for newlines in JSON)
  - **3–5** \`add_todo\` with concrete next tasks
- Layout: x = 100, 340, 580, 820… (~240px apart); use y = 200 and y = 400 (or 440) for a second row so ideas do not overlap.

When **nodeCount** is 0 and the user only asks for **analysis** (risks, summary, "what am I missing") **without** asking to populate the canvas: say the canvas is empty, you cannot analyse structure yet, and **offer** to generate a starter map if they describe their goal.

Do **not** use **create_canvas** unless **workspaceId** is in context **and** they explicitly want a **separate new project** in the team workspace. For a blank personal / single-project canvas, always use **canvasRef "current"**.

---

NEW PROJECT REQUESTS — PERSONAL SCOPE (CRITICAL)

When **projectScope** is **personal_single_canvas** (no team **workspaceId**): you are **only** allowed to change **this** open project’s canvas (ideas, writing, tasks on **current**).

If the user asks to **create a new project**, **start another project**, **a second / separate project**, **new workspace**, **spin up a different canvas as its own project**, **brand-new project**, or similar — meaning a **new** top-level project, **not** “fill **this** empty canvas with a strategy”:

- Reply with **normal markdown only**. **Do NOT** output an **[ACTIONS]** block. **Do NOT** use **create_canvas**.
- Tell them clearly: use the **Dashboard** header **STRAB** (**New strategy** hub) or **Create new project → AI generated** to spin up **new** strategy workspaces. **Project STRAB** (this chat) is only for the **current** project — chat, reports, follow-up, and editing **this** canvas.
- 2–4 sentences, direct tone.

**Not** a redirect: they want a strategy / roadmap / launch plan **on this same canvas** (including when it’s empty) — use **BLANK CANVAS — POPULATE ON REQUEST** with **canvasRef "current"**.

---

ANALYSIS RULES

- If namedNodes is empty: follow **BLANK CANVAS — POPULATE ON REQUEST** when they want a built strategy; otherwise explain the canvas is empty and offer to generate one.
- If tasks.pending is long but tasks.completed is zero: flag this as a risk — no execution momentum.
- If writingWordCount is 0 and nodeCount > 5: the strategy exists on the canvas but hasn't been written up. Point this out.
- If connections array is short relative to nodeCount: disconnected thinking — ideas exist but aren't logically linked yet.
- If daysSinceUpdate > 7: mention the project hasn't been touched recently. Ask if it's still active.
- If timeline exists but tasks show 0% completion: misalignment between plan and execution.
- Always end reports and insight responses with a ranked list of 3-5 specific next actions.

---

WHEN TO USE [ACTIONS] BLOCK (append AFTER your natural language response)

Use an [ACTIONS] block when the user explicitly asks you to:
- Add ideas to the flow / update the flow / fill the canvas
- **Canvas is blank (nodeCount 0 or canvasIsBlank) and they want a strategy, plan, roadmap, launch plan, or similar built on the canvas** — REQUIRED; use canvasRef "current".
- Create a new project **only when projectScope is team_workspace and workspaceId is present** — never use [ACTIONS] / create_canvas for “new project” when **projectScope** is **personal_single_canvas** (redirect with text only; see NEW PROJECT REQUESTS — PERSONAL SCOPE).
- Connect ideas / add connections between them
- Update the writing section / add writing content
- Add tasks / add to-dos

Format (use canvasRef "current" for the active project, or create_canvas with ref for new project in team workspace):
[ACTIONS]
{"actions":[
  {"type":"add_node","canvasRef":"current","nodeType":"default","label":"Idea","x":100,"y":200},
  {"type":"add_node","canvasRef":"current","nodeType":"question","label":"Key question?","x":340,"y":200},
  {"type":"connect_nodes","canvasRef":"current","fromIndex":0,"toIndex":1},
  {"type":"set_writing","canvasRef":"current","content":"## Overview\\n\\nContent..."},
  {"type":"add_todo","canvasRef":"current","text":"Task item"}
]}
[/ACTIONS]

For create_canvas in team workspace (when workspaceId exists): use ref "c1", then add_node, connect_nodes, set_writing, add_todo with canvasRef "c1". Same layout rules as STRAB General: x=100, space 240px apart; 6-10 ideas; 4-5 connections; set_writing with markdown; 3-5 add_todo.
Keep your natural language response BRIEF (2-4 sentences) before the [ACTIONS] block.
The app shows users only your prose — the [ACTIONS] block is hidden — so never duplicate JSON, idea lists, or action payloads in the conversational part.

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

INTERACTIVE QUESTIONS (use JSON ONLY when truly ambiguous):
NEVER use the JSON clarification format for: execution questions, accountability prompts, insights, summaries, reviews, or any question listed in FIXED QUESTIONS above. Those ALWAYS get direct text answers.

ONLY use the JSON format when the user gives a vague, open-ended request with NO clear direction (e.g. "I need help" with no context). In that case, output a \`\`\`json block with type "clarification", "question", and "options" array.

For 99% of requests — including all quick-action chips — respond with normal markdown. Never JSON.

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
- Create complete project canvases with ideas, connections, writing, and tasks

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
- "ref" is a local label (c1, c2…) linking ideas to their canvas — use it consistently
- nodeType: "default" (Idea), "question", "decision", "text"
- Layout: start x=100, space ideas 240px apart horizontally; new rows at y=400
- fromIndex / toIndex: 0-based index into add_node actions for that canvas
- Always create 6–10 ideas with at least 4–5 connect_nodes entries
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

// ─── Static uploads (chat photos/files) ─────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Social + Team Workspace System (Phase 2) ───────────────────────────────
registerWorkspaceRoutes(app, clerk);
registerChatRoutes(app, clerk);

// ─── 404 handler ──────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: 'Not found.' });
});

// ─── HTTP + Socket.io ──────────────────────────────────────────────────────
const httpServer = createServer(app);
const allowedOriginsSocket = process.env.ALLOWED_ORIGIN
    ? process.env.ALLOWED_ORIGIN.split(',').map(s => s.trim())
    : ['http://localhost:5173', 'http://localhost:5174', 'https://stratabin.com', 'https://www.stratabin.com'];

const io = new Server(httpServer, {
    cors: { origin: allowedOriginsSocket, credentials: true },
    path: '/socket.io',
});
app.locals.io = io;

if (applySocketRedisAdapter) {
    applySocketRedisAdapter(io);
    console.log('📦 Socket.io using Redis adapter (multi-instance safe)');
}

io.on('connection', async (socket) => {
    const token = socket.handshake.auth?.token;
    let userId = null;
    if (token && clerk) {
        try {
            const { clerkUser } = await resolveBearerToClerkUser(String(token), clerk);
            userId = await getOrCreateUser(clerkUser);
        } catch { /* ignore */ }
    }
    if (!userId) {
        socket.disconnect(true);
        return;
    }
    socket.join(`user:${userId}`);
    socket.userId = userId;

    socket.on('chat:typing', ({ chatId }) => {
        socket.to(`chat:${chatId}`).emit('chat:typing', { chatId, userId });
    });
    socket.on('chat:join', ({ chatId }) => {
        socket.join(`chat:${chatId}`);
    });
    socket.on('chat:leave', ({ chatId }) => {
        socket.leave(`chat:${chatId}`);
    });
});

// Broadcast new messages to chat room (called from API)
io.emitToChat = (chatId, event, data) => {
    io.to(`chat:${chatId}`).emit(event, data);
};

// Bind 0.0.0.0 so Render/load balancers can reach the service (required on many hosts)
(async () => {
    try {
        await initDb();
        console.log('Database ready.');
    } catch (err) {
        const pgUrl = process.env.DATABASE_URL?.trim()?.replace(/^['"]|['"]$/g, '')?.trim() || '';
        const usingPg = !!pgUrl;
        console.error('❌ Database initialization failed — service stays up.');
        if (usingPg) {
            const u = summarizePgUrl(pgUrl);
            console.error('  Mode: PostgreSQL (DATABASE_URL is set)');
            console.error('  Host:', u.host, 'port:', u.port, 'database:', u.database);
            console.error('  Fix: use the exact "External" / connection URL from your host, include ?sslmode=require if asked, check password and that the DB allows this region\'s IPs.');
        } else {
            console.error('  Mode: SQLite (DATABASE_URL empty)');
            console.error('  Path:', process.env.DATABASE_PATH || '(default: ./data/strategybox.db under app folder)');
            console.error('  Fix: add a Render disk mounted at /data and set DATABASE_PATH=/data/strategybox.db, or set DATABASE_URL to Postgres instead.');
        }
        console.error('  Error:', err?.message || err);
        if (err?.code) console.error('  Code:', err.code);
    }
    httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`STRAB AI Server running on 0.0.0.0:${PORT} (PORT=${process.env.PORT || 'default'})`);
    });
})();
