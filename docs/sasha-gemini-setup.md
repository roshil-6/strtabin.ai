# Hosted Sasha deployment

## Railway backend

Set `GEMINI_API_KEY` on the Node backend service. Never use a `VITE_` variable or put this secret in Vercel/frontend code. Deploy the code as well as the variable. Database initialization creates `assistant_usage` on PostgreSQL and SQLite.

Sasha uses server-selected `gemini-3.8-flash` for chat and `gemini-3.8-live` for live audio. Custom keys, providers and model overrides from the browser are rejected. There is no automatic fallback. The owner explicitly approved moving to currently available Flash models after Google rejected generation with 2.5 for this new key.

## Pro access

Sasha access requires either:
- an unexpired **live** subscription in `billing_subscriptions`, or
- `sashaPro: true` in the user's **Clerk public metadata**, set only by an administrator through Clerk or a trusted backend.

For the owner's initial verification, open Clerk → Users → your user → Public metadata, and merge `"sashaPro": true` into existing metadata. Preserve other fields. This is an explicit complimentary Pro grant for Sasha, not proof of payment. Remove it to revoke the grant. Never use unsafe metadata or a frontend toggle for entitlement.

Current Razorpay integration is still test-only. Test subscriptions do not unlock paid AI calls. A live billing/webhook implementation is required before automatic paid upgrades can grant access; this change does not enable charges.

## Limits and privacy

The backend reserves at most 10 chat requests and 10 voice sessions per account per UTC day, atomically in the database. Failed provider attempts count as reservations. Live tokens are single-use and constrained to the server's full model/instruction/tool setup; new sessions must start within one minute. Client sessions end after three minutes; token expiry is four minutes. Google receives selected project context and microphone audio. Permanent keys never reach the browser. Conversation history is currently in page memory and clears on refresh; the custom assistant name is stored per signed-in account in this browser.

Projects shown in Sasha come from the signed-in user's server memberships. Attachments are not read. Users review action cards before mutations. New projects are private server-backed projects; flow proposals append a root and connected sub-ideas without replacing existing work. Ambiguous network failures during project creation disable that proposal to avoid duplicate submissions; inspect Projects before requesting another.

## Deployment verification

1. Deploy backend and frontend, with the key present and a valid Pro grant.
2. Confirm `/api/assistant/status` with a signed-in session reports `pro: true` and `configured: true`; no secret is returned.
3. In `/sasha`, brainstorm without a project, create one through an approved action, select it, request a map and approve it. Reopen it and verify saved nodes and connections. Test undo before making other edits.
4. Ask for a briefing on the selected project; facts must come from its context, estimates must be labeled.
5. Start microphone voice, test interruption/mute/stop, and review a proposed command.
6. Test another signed-in free account: both chat and voice endpoints must return 403, while `/ai` capsules remain available.

## Verification notes

Google's model metadata accepted the earlier 2.5 identifiers, but an actual generation request returned 404: the model was unavailable to new users. Metadata alone is not a generation test. Gemini 3.8 Live's real constrained WebSocket setup passed. The first 3.8 Flash generation attempt returned temporary high demand (503); a second generation attempt timed out. Text generation is therefore not yet verified successfully against the provider. Full microphone testing in the deployed signed-in app is still required. Localhost browser testing is blocked by the current Clerk production domain restriction.


## Optional wake phrase

Open Sasha, choose **Enable “Hey Sasha”**, and allow microphone access. Once the indicator says it is listening, say “Hey Sasha” (or “Hey <custom name>”), optionally followed by a request. Wait for the live Listening indicator before continuing. Wake recognition releases the microphone before live audio starts; words spoken during connection are not buffered.

This opt-in uses the browser speech recognition service, which may process audio online. It is not an offline wake-word engine. It only runs in the visible tab, stops on navigation away/hidden tab, and is not restored automatically. Each activation starts at most one live session; enable it again after the conversation ends. Stop wake listening cancels it immediately. Unsupported browsers retain tap-to-talk. Live voice uses the server's short-lived Gemini credential and existing Pro/daily limits. Workspace changes still need review and Apply.

Live replies are prompted to be short, warm and conversational. Automatic activity detection allows interruptions, with a 650 ms end-of-speech pause and a small playback buffer. Naturalness and latency still depend on the voice provider, browser, microphone and network. A real microphone/browser test remains required before treating this as production-verified.
