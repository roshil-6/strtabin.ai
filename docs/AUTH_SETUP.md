# Local sign-in setup

1. In https://dashboard.clerk.com, select the application matching the existing `VITE_CLERK_PUBLISHABLE_KEY`. Use the same development or production instance for both keys.
2. Under API keys, copy the Secret key into the root `.env` as `CLERK_SECRET_KEY=...`. Never prefix this server secret with `VITE_` or commit it.
3. In User & authentication, configure the desired identifiers, password/email verification methods and social providers. The hosted Clerk components follow these settings and handle recovery and additional verification steps.
4. Restart the backend with `npm run start:server`. Restart Vite if the publishable key changes. Open `http://127.0.0.1:5174/auth` and complete sign-in yourself.
5. Confirm a signed-in team page loads. Without the server key, browser sign-in can work but workspace API calls correctly refuse authentication.

The sign-in UI uses Clerk's supported components with a black/violet appearance. `/auth/sign-up` handles new accounts; hash routes preserve verification and recovery steps. No passwords are stored by the app.

## Database

`db/index.js` loads `.env` before selecting storage. `DATABASE_URL` selects PostgreSQL. Otherwise `DATABASE_PATH` selects a SQLite file, defaulting to `data/strategybox.db` under the repository. Local guest project content also lives in browser storage. Clerk manages credentials separately from this database.
