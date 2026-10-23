import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import express from 'express';
import Database from 'better-sqlite3';
import { attachSqlite } from '../db/driver.js';
import { validSignature, validPlan, subscriptionUpdate, publicBilling, billingConfig } from '../lib/billing.js';
import { registerBillingRoutes, registerBillingWebhook } from '../routes/billing.js';

test('both database schemas contain billing and no mixed-encoding NUL bytes', () => {
    for (const name of ['schema.sql', 'schema.postgres.sql']) {
        const schema = readFileSync(new URL(`../db/${name}`, import.meta.url), 'utf8');
        assert.equal(schema.includes('\0'), false);
        assert.match(schema, /CREATE TABLE IF NOT EXISTS billing_subscriptions/);
    }
});

test('billing signatures reject missing, malformed, modified and wrong-secret requests', () => {
    const body = '{"event":"subscription.charged"}';
    const signature = createHmac('sha256', 'secret').update(body).digest('hex');
    assert.equal(validSignature(body, signature, 'secret'), true);
    for (const invalid of ['', 'abc', 'z'.repeat(64), signature.slice(1)]) assert.equal(validSignature(body, invalid, 'secret'), false);
    assert.equal(validSignature(body + ' ', signature, 'secret'), false);
    assert.equal(validSignature(body, signature, 'another'), false);
    assert.equal(validSignature(body, signature, ''), false);
});
test('billing enforces price, monthly interval and paid periods rather than browser success', () => {
    const plan = { period: 'monthly', interval: 1, item: { amount: 10900, currency: 'INR' } };
    assert.equal(validPlan(plan), true);
    assert.equal(validPlan({ ...plan, interval: 12 }), false);
    assert.equal(validPlan({ ...plan, item: { amount: 109, currency: 'INR' } }), false);
    const row = { provider_id: 'sub_test', paid_until: 500, paid_count: 1 };
    const sub = { id: 'sub_test', plan_id: 'plan_test', quantity: 1, status: 'active', current_end: 1000, paid_count: 2 };
    assert.equal(subscriptionUpdate(row, sub, 'plan_test').paidUntil, 1000);
    assert.equal(subscriptionUpdate(row, { ...sub, status: 'authenticated' }, 'plan_test').paidUntil, 500);
    assert.equal(subscriptionUpdate(row, { ...sub, status: 'pending' }, 'plan_test').paidUntil, 500);
    assert.equal(subscriptionUpdate(row, { ...sub, paid_count: 1 }, 'plan_test').paidUntil, 500);
    assert.throws(() => subscriptionUpdate(row, { ...sub, id: 'sub_other' }, 'plan_test'));
    assert.throws(() => subscriptionUpdate(row, { ...sub, plan_id: 'plan_wrong' }, 'plan_test'));
    assert.equal(publicBilling(row, true, 501000).plan, 'free');
});

test('billing routes isolate users, reuse checkouts, verify signatures and handle duplicate webhooks', async () => {
    const envNames = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_PRO_PLAN_ID', 'RAZORPAY_WEBHOOK_SECRET'];
    const savedEnv = Object.fromEntries(envNames.map(k => [k, process.env[k]]));
    Object.assign(process.env, { RAZORPAY_KEY_ID: 'rzp_test_fixture', RAZORPAY_KEY_SECRET: 'fixture-secret', RAZORPAY_PRO_PLAN_ID: 'plan_fixture', RAZORPAY_WEBHOOK_SECRET: 'fixture-webhook' });
    const db = new Database(':memory:');
    db.exec(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
    db.exec("INSERT INTO users (id, clerk_user_id) VALUES (1, 'user_one'), (2, 'user_two')");
    attachSqlite(db);
    const originalFetch = globalThis.fetch;
    let created = 0;
    let cancelled = 0;
    let amount = 10900;
    let remote = { id: 'sub_fixture', plan_id: 'plan_fixture', status: 'created', quantity: 1, paid_count: 0, current_end: null };
    globalThis.fetch = async (url, options) => {
        assert.ok(String(url).startsWith('https://api.razorpay.com/v1/'));
        if (String(url).includes('/plans/')) return Response.json({ period: 'monthly', interval: 1, item: { amount, currency: 'INR' } });
        if (String(url).endsWith('/cancel')) { cancelled++; return Response.json(remote); }
        if (options.method === 'POST') { created++; const body = JSON.parse(options.body); assert.equal(body.plan_id, 'plan_fixture'); assert.equal(body.quantity, 1); assert.equal(body.total_count, 12); return Response.json(remote); }
        return Response.json(remote);
    };
    const app = express();
    registerBillingWebhook(app); app.use(express.json());
    registerBillingRoutes(app, (req, res, next) => { if (!req.get('x-test-user')) return res.sendStatus(401); req.userId = Number(req.get('x-test-user')); next(); });
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/billing/`;
    const request = (path, body, user = '1', extra = {}) => originalFetch(base + path, {
        method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(user ? { 'x-test-user': user } : {}), ...extra },
        ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
    });
    try {
        assert.equal((await request('status', undefined, '')).status, 401);
        assert.equal((await request('checkout', { amount: 1, plan_id: 'plan_attacker' })).status, 200);
        assert.equal((await request('checkout', {})).status, 200);
        assert.equal(created, 1);
        const verification = { razorpay_payment_id: 'pay_fixture', razorpay_subscription_id: 'sub_fixture', razorpay_signature: createHmac('sha256', 'fixture-secret').update('pay_fixture|sub_fixture').digest('hex') };
        assert.equal((await request('verify', verification, '2')).status, 400);
        assert.equal((await request('verify', { ...verification, razorpay_signature: 'bad' })).status, 400);
        assert.equal((await (await request('verify', verification)).json()).plan, 'free');
        remote = { ...remote, status: 'active', paid_count: 1, current_end: Math.floor(Date.now() / 1000) + 86400 };
        const event = JSON.stringify({ event: 'subscription.charged', payload: { subscription: { entity: { id: 'sub_fixture' } } } });
        const signature = createHmac('sha256', 'fixture-webhook').update(event).digest('hex');
        assert.equal((await request('webhook', event, '', { 'x-razorpay-signature': 'bad' })).status, 400);
        for (let i = 0; i < 2; i++) assert.equal((await request('webhook', event, '', { 'x-razorpay-signature': signature })).status, 200);
        const status = await (await request('status')).json();
        assert.equal(status.plan, 'pro'); assert.equal(status.paidUntil, remote.current_end);
        assert.equal((await (await request('status', undefined, '2')).json()).plan, 'free');
        assert.equal((await request('checkout', {})).status, 409);
        assert.equal((await request('cancel', {})).status, 200);
        assert.equal((await request('cancel', {})).status, 200);
        assert.equal(cancelled, 1);
        assert.equal((await (await request('status')).json()).plan, 'pro');
        amount = 999;
        assert.equal((await request('checkout', {}, '2')).status, 503);
        process.env.RAZORPAY_KEY_ID = 'rzp_live_fixture';
        assert.equal(billingConfig().enabled, false);
    } finally {
        globalThis.fetch = originalFetch;
        server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); db.close();
        for (const key of envNames) { if (savedEnv[key] === undefined) delete process.env[key]; else process.env[key] = savedEnv[key]; }
    }
});
