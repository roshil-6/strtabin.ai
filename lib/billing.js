import { createHmac, timingSafeEqual } from 'node:crypto';

export const PRO_PRICE = 10900;
export function validSignature(value, signature, secret) {
    if (!secret || typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false;
    const expected = createHmac('sha256', secret).update(value).digest();
    return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}
export function validPlan(plan) {
    return plan?.period === 'monthly' && plan.interval === 1 && plan.item?.amount === PRO_PRICE && plan.item?.currency === 'INR';
}
export function subscriptionUpdate(previous, subscription, planId) {
    if (subscription.id !== previous.provider_id || subscription.plan_id !== planId || subscription.quantity !== 1) throw new Error('Unexpected subscription');
    let paidUntil = Number(previous.paid_until || 0);
    let paidCount = Number(previous.paid_count || 0);
    // Authentication alone never grants Pro. Failed renewals must not extend an old paid period.
    if (['active', 'cancelled', 'completed'].includes(subscription.status) && Number(subscription.paid_count) > paidCount && Number.isSafeInteger(subscription.current_end)) {
        paidUntil = Math.max(paidUntil, subscription.current_end);
        paidCount = subscription.paid_count;
    }
    return { status: subscription.status, paidUntil, paidCount };
}
export function publicBilling(row, enabled, now = Date.now(), mode = 'test') {
    return { enabled, mode, plan: Number(row?.paid_until || 0) * 1000 > now ? 'pro' : 'free',
        status: row?.status || 'none', paidUntil: Number(row?.paid_until || 0),
        cancelScheduled: Boolean(row?.cancel_scheduled), amount: PRO_PRICE, currency: 'INR' };
}

export function billingConfig() {
    const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
    const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
    const planId = (process.env.RAZORPAY_PRO_PLAN_ID || '').trim();
    const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
    const mode = /^rzp_live_[a-zA-Z0-9]+$/.test(keyId) ? 'live' : 'test';
    const configured = /^rzp_(test|live)_[a-zA-Z0-9]+$/.test(keyId) && Boolean(keySecret) && /^plan_[a-zA-Z0-9]+$/.test(planId);
    return { keyId, keySecret, planId, webhookSecret, mode, configured,
        enabled: configured && (mode === 'test' || Boolean(webhookSecret)) };
}

export async function razorpayRequest(path, body, config = billingConfig()) {
    const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
        method: body === undefined ? 'GET' : 'POST', signal: AbortSignal.timeout(15000), redirect: 'error',
        headers: { Authorization: `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64')}`, 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) { const error = new Error('Razorpay could not complete this request. Please try again later.'); error.status = response.status; throw error; }
    return response.json();
}
