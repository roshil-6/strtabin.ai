# Personal assistant

Signed-in users open Assistant from the floating workspace button. Chat, Live voice and Reminders share a black and violet panel. Live voice includes a mouse-responsive 3D particle wave, pause-animation control and reduced-motion support. The separate capsule/export workspace still works without API keys.

## Provider connections and privacy

Users choose Gemini or OpenAI and supply their own API key. Provider API charges are separate from Stratabin Pro. Keys and conversations stay in React memory and clear on refresh, sign-out or Disconnect. The authenticated backend forwards requests to fixed provider endpoints; never log these request bodies. HTTPS is required.

Live voice uses OpenAI Realtime WebRTC or Gemini Live WebSocket audio. The backend exchanges the permanent key for a short-lived session credential. Start, Mute and End are explicit controls; closing the panel or switching away from Voice stops the microphone and connection. Sessions stop after nine minutes and never reconnect automatically. Model IDs are editable because provider access varies. Browser dictation and read-aloud remain available for text chat. Speech is AI-generated.

Only the selected, loaded project's capsule and relevant saved reminders are shared. Context over 24,000 characters is rejected, not silently truncated. Binary attachments are excluded. Cloud project access is checked before sharing or applying changes. Shared-link projects are excluded.

The assistant can propose opening a project, adding tasks, completing known tasks and scheduling reminders. Users review and click Apply before anything changes. Arbitrary code, deletion, payments, messages to teammates and writing edits are not available tools. Task changes follow the existing project save queue. Undo preserves newer work and cancels the associated server reminders.

## Server reminders

The Reminders tab works without an AI key. Create once-only, daily, weekday or weekly reminders with a date, time and IANA timezone, optionally linked to the selected project. Recurrences preserve the chosen timezone's wall-clock time. Ambiguous initial daylight-saving times are rejected; later spring-forward gaps shift forward. Missed repeats after downtime are skipped to the next future occurrence after processing the overdue reminder.

Reminders and push subscriptions are stored per account in SQLite or PostgreSQL. A server worker checks every 30 seconds, claims due records with a lease, retries transient failures and removes expired subscriptions. The current limits are 200 saved reminders and eight subscribed devices per account. Cancel removes a schedule. These are separate from the older browser-only calendar notification timers.

Push messages contain a generic notification, not project content. Clicking one opens Assistant's Reminders tab. The page can be closed, but delivery still depends on browser/OS permission, network access and the backend being awake. Force-quitting a browser or OS restrictions can prevent delivery. On supported iPhones/iPads, install the site on the Home Screen before enabling notifications. Delivery accepted by a push service is not proof the user saw it. Crash recovery can resend an occurrence; notification tags deduplicate it where supported.

## Deployment setup

1. Restore the backend and persistent database. Use an always-running service: a sleeping or suspended service cannot send reminders on time. Deploy both frontend and backend changes; startup creates the new tables without deleting existing data.
2. Run `npm run push:keys` locally once. It writes a VAPID key pair into the local `.env` without printing secrets and refuses to replace an existing pair. Copy `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY` and `WEB_PUSH_SUBJECT` into the backend host's environment settings. Keep the private key server-only. Use the same stable pair across instances and deployments; rotating it requires browsers to subscribe again.
3. Use the deployed HTTPS domain with working Clerk authentication and the correct allowed frontend origin. Serve `/sw.js` and `/assistant-capture.js` from the frontend origin. The development app deliberately unregisters service workers on reload, so background push acceptance testing belongs on the deployed site.
4. In Assistant > Reminders, click Enable on this device and allow notifications. A missing or invalid VAPID configuration displays setup required; it does not pretend notifications are enabled.
5. In Live voice, supply a user-authorized Gemini/OpenAI key with access to the chosen live model. No shared provider key needs to be added to the server.

## Release acceptance checks

Automated tests mock provider calls and push delivery; they do not spend API credit. Run `npm test`, `npm run lint`, and `npm run build`. Coverage includes timezone/DST recurrence, invalid dates, account isolation, duplicate requests, worker claims/retries, expired push subscriptions, ephemeral credentials, PCM audio and microphone cleanup after cancellation.

Before announcing availability, verify on the deployed domain:

- Both providers: allow microphone, exchange multiple spoken turns, interrupt speech, mute/unmute, approve a task, then End and confirm the microphone indicator disappears. Test denied permission and loss of network. Check actual model access and provider billing.
- Create a reminder a few minutes ahead, close the page and verify the notification. Click it and check the correct signed-in account's Reminders tab opens.
- Verify a repeat, cancel before delivery, test a second device and sign out/switch accounts. No other account's reminder details should appear.
- Check desktop and mobile layout, keyboard navigation, reduced motion, iOS Home Screen delivery and the production database. Local SQLite and mocked providers cannot establish production PostgreSQL/provider/device delivery success.

References:
- https://developers.openai.com/api/docs/guides/voice-webrtc
- https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens
- https://ai.google.dev/gemini-api/docs/live-api/get-started-websocket
