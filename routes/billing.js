import express from 'express';
import rateLimit from 'express-rate-limit';
import { qGet, qRun } from '../db/driver.js';
import { requireClerkAuth } from '../middleware/requireClerkAuth.js';
import { billingConfig, razorpayRequest, validPlan, validSignature, subscriptionUpdate, publicBilling } from '../lib/billing.js';

const rowFor = (userId, config) => qGet('SELECT * FROM billing_subscriptions WHERE user_id = ? AND mode = ?', [userId, config.mode]);
const publicStatus = (row, config) => ({ ...publicBilling(row, config.enabled, Date.now(), config.mode), configured: config.configured });
async function refresh(row, config) {
    if (!row?.provider_id) return row;
    for (let attempt = 0; attempt < 3; attempt++) {
        const sub = await razorpayRequest(`subscriptions/${encodeURIComponent(row.provider_id)}`, undefined, config);
        const next = subscriptionUpdate(row, sub, config.planId);
        const update = await qRun('UPDATE billing_subscriptions SET status = ?, paid_until = ?, paid_count = ?, revision = revision + 1 WHERE user_id = ? AND mode = ? AND revision = ? AND provider_id = ?',
            [next.status, next.paidUntil, next.paidCount, row.user_id, config.mode, row.revision, row.provider_id]);
        const latest = await rowFor(row.user_id, config);
        if (update.changes) return latest;
        if (!latest || latest.provider_id !== row.provider_id) throw new Error('Subscription changed during refresh');
        row = latest;
    }
    // A webhook must retry rather than acknowledge a paid update that lost a race.
    throw new Error('Subscription refresh is busy');
}

// Register before express.json: signature verification needs the exact original bytes.
export function registerBillingWebhook(app) {
    app.post('/api/billing/webhook', express.raw({ type: 'application/json', limit: '256kb' }), async (req, res) => {
        const config = billingConfig();
        if (!config.configured || !config.webhookSecret) return res.status(503).json({ error: 'Billing webhook is not configured.' });
        if (!Buffer.isBuffer(req.body) || !validSignature(req.body, req.get('x-razorpay-signature'), config.webhookSecret)) return res.status(400).json({ error: 'Invalid webhook signature.' });
        try {
            const event = JSON.parse(req.body.toString('utf8'));
            const id = event?.payload?.subscription?.entity?.id;
            if (typeof id !== 'string' || !String(event.event).startsWith('subscription.')) return res.json({ received: true });
            const row = await qGet("SELECT * FROM billing_subscriptions WHERE provider_id = ? AND mode = ?", [id, config.mode]);
            if (row) await refresh(row, config);
            // Repeated events are safe: refresh uses canonical provider state and never adds days.
            return res.json({ received: true });
        } catch { return res.status(503).json({ error: 'Webhook could not be processed. Retry later.' }); }
    });
}

export function registerBillingRoutes(app, authenticate = requireClerkAuth) {
    const limiter = rateLimit({ windowMs: 60000, max: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Please wait a minute before trying billing again.' } });
    app.use('/api/billing', limiter, authenticate);
    app.get('/api/billing/status', async (req, res) => {
        try { const config = billingConfig(); return res.json(publicStatus(await rowFor(req.userId, config), config)); }
        catch { return res.status(503).json({ error: 'Billing status is unavailable. Please retry.' }); }
    });
    app.post('/api/billing/checkout', async (req, res) => {
        const config = billingConfig();
        if (!config.enabled) return res.status(503).json({ error: 'Checkout needs matching Razorpay keys and a monthly ₹109 plan; live checkout also requires the webhook secret.' });
        let claimed = false;
        try {
            const plan = await razorpayRequest(`plans/${encodeURIComponent(config.planId)}`, undefined, config);
            if (!validPlan(plan)) return res.status(503).json({ error: 'The configured plan must be ₹109 INR every month.' });
            await qRun("INSERT INTO billing_subscriptions (user_id, mode) VALUES (?, ?) ON CONFLICT (user_id, mode) DO NOTHING", [req.userId, config.mode]);
            let row = await refresh(await rowFor(req.userId, config), config);
            if (row.status === 'creating') return res.status(409).json({ error: 'An earlier checkout is being reconciled. Contact the workspace owner before retrying.' });
            if (row.provider_id && !['created', 'cancelled', 'completed', 'expired'].includes(row.status)) return res.status(409).json({ error: 'You already have a subscription. Refresh its status or manage it below.' });
            if (Number(row.paid_until) * 1000 > Date.now()) return res.status(409).json({ error: 'Your Pro access is already active.' });
            if (!row.provider_id || row.status !== 'created') {
                const lock = await qRun("UPDATE billing_subscriptions SET status = 'creating', provider_id = NULL, revision = revision + 1 WHERE user_id = ? AND mode = ? AND revision = ? AND status <> 'creating'", [req.userId, config.mode, row.revision]);
                if (!lock.changes) return res.status(409).json({ error: 'Another checkout is starting. Please refresh.' });
                claimed = true;
                const sub = await razorpayRequest('subscriptions', { plan_id: config.planId, quantity: 1, total_count: 12, customer_notify: true, notes: { stratabin_user_id: String(req.userId), environment: config.mode } }, config);
                if (!/^sub_[a-zA-Z0-9]+$/.test(sub.id || '')) throw new Error('Invalid provider response');
                await qRun("UPDATE billing_subscriptions SET provider_id = ?, status = 'created', paid_count = 0, cancel_scheduled = 0, revision = revision + 1 WHERE user_id = ? AND mode = ?", [sub.id, req.userId, config.mode]);
                row = await rowFor(req.userId, config);
            }
            return res.json({ keyId: config.keyId, subscriptionId: row.provider_id, mode: config.mode });
        } catch (error) {
            if (claimed && error.status >= 400 && error.status < 500 && error.status !== 429) await qRun("UPDATE billing_subscriptions SET status = 'none', revision = revision + 1 WHERE user_id = ? AND mode = ? AND status = 'creating'", [req.userId, config.mode]);
            return res.status(502).json({ error: claimed ? 'Checkout could not be confirmed. Refresh status; do not start a second payment if you already authorised one.' : 'Could not connect to Razorpay. Check the configured keys and plan, then retry.' });
        }
    });
    app.post('/api/billing/verify', async (req, res) => {
        const config = billingConfig();
        if (!config.configured) return res.status(503).json({ error: 'Billing is not configured.' });
        try {
            const row = await rowFor(req.userId, config);
            const { razorpay_payment_id: paymentId, razorpay_signature: signature, razorpay_subscription_id: subscriptionId } = req.body || {};
            if (!row?.provider_id || subscriptionId !== row.provider_id || typeof paymentId !== 'string' || !/^pay_[a-zA-Z0-9]+$/.test(paymentId) || !validSignature(`${paymentId}|${row.provider_id}`, signature, config.keySecret)) return res.status(400).json({ error: 'Payment verification failed. Refresh status before trying another payment.' });
            return res.json(publicStatus(await refresh(row, config), config));
        } catch { return res.status(503).json({ error: 'Payment confirmation is pending. Refresh status shortly; do not pay again.' }); }
    });
    app.post('/api/billing/refresh', async (req, res) => {
        const config = billingConfig();
        if (!config.configured) return res.status(503).json({ error: 'Billing is not configured.' });
        try { return res.json(publicStatus(await refresh(await rowFor(req.userId, config), config), config)); }
        catch { return res.status(503).json({ error: 'Unable to refresh payment status. Please try again shortly.' }); }
    });
    app.post('/api/billing/cancel', async (req, res) => {
        const config = billingConfig();
        if (!config.configured) return res.status(503).json({ error: 'Billing is not configured.' });
        try {
            let row = await refresh(await rowFor(req.userId, config), config);
            if (!row?.provider_id || ['cancelled', 'completed', 'expired'].includes(row.status)) return res.json(publicStatus(row, config));
            if (!row.cancel_scheduled) {
                await razorpayRequest(`subscriptions/${encodeURIComponent(row.provider_id)}/cancel`, { cancel_at_cycle_end: row.status === 'active' }, config);
                await qRun("UPDATE billing_subscriptions SET cancel_scheduled = 1, revision = revision + 1 WHERE user_id = ? AND mode = ?", [req.userId, config.mode]);
                row = await refresh(await rowFor(req.userId, config), config);
            }
            return res.json(publicStatus(row, config));
        } catch { return res.status(503).json({ error: 'Cancellation could not be confirmed. Refresh status and try again.' }); }
    });
}
