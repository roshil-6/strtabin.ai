# Security review — 20 October 2026

## Fixed

- Removed unauthenticated execution of submitted JavaScript, TypeScript and Python on the application host. `/api/execute` now returns 503. Restoring Run requires a separately isolated execution service with resource and network restrictions.
- AI routes reject tokens when authentication is unconfigured, instead of accepting any nonempty Bearer token.
- Chat socket joins and typing events check conversation membership and safely ignore malformed payloads.
- Chat attachments require authentication and uploader or conversation membership. Removed public static upload serving. Downloads use attachment disposition, no-store, nosniff and a restrictive CSP. The UI downloads with the session token; attachments no longer use public image URLs.
- File messages may only attach existing uploads owned by the sender. Upload filtering no longer trusts arbitrary image/text MIME declarations to admit HTML or SVG extensions.
- Replies cannot reference messages from other chats.
- Chat history pagination orders by the same unique message ID used by its cursor, avoiding skipped messages with matching timestamps.
- Removed blanket CORS trust for arbitrary Vercel, Render and Stratabin subdomains. Explicit configured origins remain supported.
- The development server denies serving runtime databases and uploads.
- Applied compatible dependency security updates, including a patched DOMPurify override for Monaco.

## Validation

42 automated tests pass, including socket membership/malformed-event checks, attachment membership, reply isolation and pagination. Lint, production build, server syntax checks and the tracked-source secret scan pass.

Local HTTP checks confirm `/api/execute` returns 503, unauthenticated attachment access returns 401, and an unverified token on `/api/chat` returns 503 with auth unconfigured.

Authenticated browser collaboration remains unverified locally because the server's Clerk secret is missing. Configure that secret only on the server.

## Remaining dependency advisories

The final npm audit is in `dependency-audit.json`: 10 entries (5 high, 5 moderate), down from 46 (including 4 critical). Counts include affected dependency chains, not ten independent exploitable application bugs.

- Tailwind 3's build-tool dependencies: braces, chokidar, micromatch, fast-glob, postcss-selector-parser and postcss-nested. The audit proposes migration to Tailwind 4; forcing that change would require a separate CSS/build migration and visual verification. These tools process the project's build inputs.
- Mammoth's argparse/sprintf-js dependency chain. The audit proposes a drastic downgrade to Mammoth 0.3.29; that is not a safe automatic fix for the existing document-import functionality. Update or replace this dependency after compatibility and document-import testing.

This review does not certify the application as vulnerability-free. Uploaded documents are not malware-scanned, and full authenticated end-to-end verification remains outstanding.
