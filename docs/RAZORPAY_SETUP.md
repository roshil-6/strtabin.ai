# Razorpay setup for Stratabin Pro

The backend supports test and live keys, with separate billing records for each mode. Live checkout requires the webhook secret. A test payment never unlocks paid Sasha AI. The server checks the price and ignores client-supplied amounts.

## Railway variables (backend only)

Set these on the Railway **strtabin.ai** service, not the Postgres service or Vercel:

```dotenv
RAZORPAY_KEY_ID=rzp_live_your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_PRO_PLAN_ID=plan_your_plan_id
RAZORPAY_WEBHOOK_SECRET=your_independent_random_secret
```

Use the API keys and plan from the same Razorpay account and mode. The plan must be monthly, interval 1, quantity 1, INR 109 (10900 paise). Checkout creates subscriptions for up to **12 monthly cycles**, not an annual upfront payment. Never prefix secrets with VITE_. Redeploy the backend after changing variables.

## Razorpay webhook

In Razorpay Live Mode, open Account & Settings → Webhooks → Add New Webhook:

- URL: `https://strtabinai-production.up.railway.app/api/billing/webhook`
- Secret: the identical value stored in Railway as `RAZORPAY_WEBHOOK_SECRET`. Choose a long random value separate from the API secret.
- Events: subscription.authenticated, subscription.activated, subscription.charged, subscription.pending, subscription.halted, subscription.paused, subscription.resumed, subscription.cancelled, subscription.completed (where offered).

The endpoint verifies the exact raw request bytes, then fetches authoritative subscription state from Razorpay. Duplicate and out-of-order deliveries cannot add paid time twice. A concurrent update is retried; unresolved conflicts return an error so Razorpay can retry delivery.

## Deploy and verify

1. Deploy backend changes to Railway and frontend changes to Vercel (the frontend includes the checkout security-policy update).
2. Sign in and open `/billing`. It should show Subscribe for ₹109/month with live keys; test keys explicitly show Test mode.
3. Authentication alone does not unlock Pro. A confirmed paid cycle sets the paid-through date; Sasha uses the same live entitlement.
4. After an actual user-authorised payment, verify Pro status, a successful webhook delivery and Sasha access. If confirmation is pending, use Refresh status instead of paying again.
5. Cancel renewal from billing. Confirmed paid access remains until its end date. Cancellation/refresh remain available if the webhook secret later goes missing, provided API credentials still work.

No real subscription or charge is created by the automated tests. Local tests use a simulated provider. A successful read-only plan lookup proves credentials and plan access, not the end-to-end payment flow.

## Scope and recovery

- Existing project/team/timetable free-plan limits are not enforced by this change. Paid Sasha access is enforced server-side. Test access is labelled separately.
- Refund/dispute events are not automated here; review them in Razorpay and reconcile access manually. This integration does not implement tax invoicing or refund policy decisions.
- A `creating` row after an ambiguous network failure blocks a second subscription. Locate the existing subscription using its `stratabin_user_id` and `environment` notes and reconcile its provider ID; never clear the lock blindly.
- Keep production database backups. Both SQLite and PostgreSQL schemas already support separate test/live records.

References: https://razorpay.com/docs/payments/subscriptions/integration-guide/ and https://razorpay.com/docs/webhooks/validate-test/
