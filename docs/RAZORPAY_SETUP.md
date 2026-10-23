# Razorpay setup for Stratabin Pro

This integration is TEST MODE ONLY. It does not collect real money or enforce Free/Pro project limits. Test Pro status is stored server-side and expires when its confirmed paid period ends. Live keys are deliberately rejected until launch checks and entitlement enforcement are implemented.

## 1. Create your test credentials and plan

1. Open your Razorpay dashboard and switch to Test Mode.
2. Generate API keys under Account & Settings / API Keys. Copy the Key ID and Key Secret into the local `.env` fields below. Do not put them in chat, source control, or frontend variables.
3. Open Subscriptions / Plans and create a plan:
   - Name: Stratabin Pro
   - Period: Monthly
   - Interval: 1
   - Price: INR 109 (10900 paise)
4. Copy the `plan_...` ID into `.env`. Do not enter a payment link or subscription ID.

```dotenv
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_PRO_PLAN_ID=plan_...
RAZORPAY_WEBHOOK_SECRET=...
```

The webhook secret is a separate random secret you choose, not the API Key Secret. Never use a `VITE_` prefix for these settings. Restart the backend after changing them.

## 2. Configure webhooks

In Razorpay Test Mode, add a webhook pointing to:

```text
https://YOUR-BACKEND-HOST/api/billing/webhook
```

Use the same independent secret as `RAZORPAY_WEBHOOK_SECRET`. Select subscription events including `subscription.authenticated`, `subscription.activated`, `subscription.charged`, `subscription.pending`, `subscription.halted`, `subscription.paused`, `subscription.resumed`, `subscription.cancelled`, and `subscription.completed` (where offered).

Razorpay cannot reach a plain localhost address. Use a public HTTPS test backend, or a deliberately configured HTTPS development tunnel. The local checkout's Verify and Refresh status actions work without a webhook; unattended renewal updates require it.

## 3. Try checkout

1. Sign in locally with Clerk.
2. Open Dashboard → Plans & billing, or `http://127.0.0.1:5174/billing`.
3. Choose Test Pro checkout and use Razorpay's current documented test payment methods. Do not enter real card details.
4. Pro activates only after a verified subscription has a paid billing cycle. Authentication alone can leave it pending.
5. Test Refresh status, failed checkout, closing checkout, and Cancel renewal. Existing confirmed access remains until its end date.
6. Verify webhook delivery and renewals from the dashboard. Local unit tests cannot prove a real Razorpay checkout works.

The subscription is quantity 1, INR 109 monthly, for up to 12 cycles (1 year). The server verifies the configured plan and ignores browser-supplied prices.

## Recovery and production readiness

- A `creating` record after a network interruption deliberately blocks another subscription. An administrator must look up the Razorpay subscription using its `stratabin_user_id` note and reconcile the stored provider ID before retrying. Never clear this state blindly: the remote subscription may already exist.
- SQLite and PostgreSQL schemas both include `billing_subscriptions`; use persistent storage and backups.
- Do not switch to real charging yet. Remaining launch work: enforce plan entitlements, approve tax/invoice and refund policies, handle refunds/disputes, verify production merchant activation, and test live webhook delivery and cancellation. The current test integration ignores refund/dispute events.
- Test status is not a production entitlement. Preserve the mode separation when adding live billing.

Official references:
- https://razorpay.com/docs/payments/subscriptions/
- https://github.com/razorpay/markdown-docs/blob/master/payments/payment-gateway/s2s-integration/subscriptions.md
- https://razorpay.com/docs/webhooks/validate-test/
