# Account-isolated workspace storage

## Deployment

Deploy the backend first. Startup applies the additive `personal_workspaces` table in the existing PostgreSQL or SQLite database. Then deploy the frontend. The frontend requires authenticated GET/PUT `/api/personal-workspace`; it shows a retry/sign-out screen if the backend is unavailable instead of showing another account's data.

Personal projects (including UUID projects), writing pages, flows, folders, calendars, logs and timetables are saved as an account-owned snapshot. Browser storage remains an account-specific working cache. Team project content continues using the existing membership-checked project APIs. The snapshot is not a replacement for team project permissions or a project search/index endpoint.

Account changes unmount the workspace and reload the document to terminate old editors, requests and voice sessions. Hydration waits for Clerk identity. Guest work uses its own scope and is not automatically imported on sign-in. Chat mirrors and AI capsule drafts are also account-scoped. Browser storage is not encryption against someone with developer tools access to the same browser profile.

Cloud saves debounce for one second and preserve dirty local copies on failure. A revision check rejects stale writes from another device. On conflict, export the local copy or keep a backup and load the cloud copy; data is never silently merged or overwritten. Snapshots currently have an 8 MB limit; the UI reports oversized saves instead of claiming success. Team saves and personal snapshot saves have separate status indicators.

## Existing browser work

Old global storage keys are retained unchanged and excluded from automatic hydration. The account-storage panel can export the unassigned backup. Users may explicitly confirm that the work is theirs and recover it into an empty workspace. Existing server/team project IDs are excluded from this import and must be loaded through their permission-checked routes. The source backup is not deleted.

## Verification

Automated tests cover account A/B/guest local isolation, locked-storage writes, legacy preservation, authenticated database ownership, spoofed owner IDs, timetable/project persistence and revision conflict rejection. Run a real two-account browser check after deployment: create work under A, wait for Saved to your account, sign into B (A's projects must not appear), then return to A and verify the work. Repeat on another device. These real Clerk/browser checks are still required; local unit tests do not substitute for them.
